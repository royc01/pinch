import { TaskRepository, type Task } from '@/api';
import type { CalendarComponent, CalendarSyncConfig, CalendarSyncEvent, CalendarSyncStatus } from '@/calendarSyncTypes';
import {
  deleteCalendarEvent,
  listManagedCalendarEvents,
  putCalendarEvent,
  testCalendarDavConnection
} from '@/calendarDavClient';
import { formatDate } from '@/composables/useDateUtils';
import { eventBus, Events } from '@/utils/eventBus';
import { buildCalendarFeed } from '@/utils/calendarFeed';
import { taskToCalendarSyncEvent } from '@/utils/calendarEventMapper';
import {
  CALENDAR_SYNC_SETTINGS_CHANGED_EVENT,
  loadCalendarSyncConfig,
  loadCalendarSyncStatus,
  saveResolvedCalendarUrl,
  saveCalendarSyncStatus
} from '@/utils/calendarSyncSettings';
import { publishCalendarCloud } from '@/calendarCloudSync';
import { normalizeCalendarCloudConfig, sameCalendarCloudTarget } from '@/utils/calendarSyncSettings';
import { hasCalendarSyncChannel, isCalendarSyncDue } from '@/utils/calendarSyncSchedule';
import { ensureProviderAccessToken, syncProviderCalendar } from '@/calendarProviderSync';

const CHANGE_DEBOUNCE_MS = 1400;
const PERIODIC_SYNC_MS = 30 * 1000;
const PAST_SYNC_DAYS = 7;
const CALENDAR_EXPORT_FILENAME = 'pinch-tasks.ics';

let started = false;
let debounceTimer: number | null = null;
let periodicTimer: number | null = null;
let syncInFlight: Promise<CalendarSyncStatus> | null = null;
let cloudRetryInFlight = false;
let rerunRequested = false;
let unsubscribeHandlers: Array<() => void> = [];

function shiftDate(date: Date, days: number): string {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return formatDate(next);
}

function validateConfig(config: CalendarSyncConfig): void {
  if ((config.provider || 'caldav') === 'caldav') {
    if (!config.calendarUrl || !config.username || !config.password) throw new Error('CalDAV settings are incomplete');
  } else if (!config.oauthClientId || !config.oauthAccessToken) throw new Error('请先填写 OAuth Client ID 并完成授权');
}

async function loadCalendarTasks(config: CalendarSyncConfig): Promise<Task[]> {
  const today = new Date();
  return TaskRepository.getAllTasks(false, undefined, {
    useLiveDom: false,
    detailLevel: 'light',
    materializeRepeats: true,
    includeRepeatTemplateDate: true,
    constrainBaseTasksToRepeatWindow: true,
    repeatWindow: {
      startDate: shiftDate(today, -PAST_SYNC_DAYS),
      endDate: shiftDate(today, config.futureDays)
    }
  });
}

function mapTasks(tasks: Task[], config: CalendarSyncConfig, component: CalendarComponent = 'VEVENT'): Map<string, CalendarSyncEvent> {
  const events = new Map<string, CalendarSyncEvent>();
  for (const task of tasks) {
    const event = taskToCalendarSyncEvent(task, {
      defaultDurationMinutes: config.defaultDurationMinutes,
      component
    });
    if (event) events.set(event.uid, event);
  }
  return events;
}

type SyncCounts = Pick<CalendarSyncStatus, 'created' | 'updated' | 'deleted' | 'unchanged'>;

const EMPTY_SYNC_COUNTS: SyncCounts = Object.freeze({
  created: 0,
  updated: 0,
  deleted: 0,
  unchanged: 0
});

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getCloudRetryAt(error: unknown): string | undefined {
  const retryAt = (error as { retryAt?: unknown } | null)?.retryAt;
  return typeof retryAt === 'string' && Number.isFinite(Date.parse(retryAt)) ? retryAt : undefined;
}

async function performCalDavSync(
  config: CalendarSyncConfig,
  desiredEvents: Map<string, CalendarSyncEvent>
): Promise<SyncCounts> {
  validateConfig(config);
  const { calendarUrl, events: remoteEvents } = await listManagedCalendarEvents(config);
  if (!saveResolvedCalendarUrl(config, calendarUrl)) {
    throw new Error('CalDAV settings changed during discovery; sync again with the current settings');
  }
  const resolvedConfig = { ...config, calendarUrl };
  const remoteByUid = new Map(remoteEvents.map(event => [event.uid, event]));
  const counts = { created: 0, updated: 0, deleted: 0, unchanged: 0 };

  for (const event of desiredEvents.values()) {
    const remote = remoteByUid.get(event.uid);
    if (remote?.fingerprint === event.fingerprint) {
      counts.unchanged += 1;
    } else {
      await putCalendarEvent(resolvedConfig, event, remote);
      if (remote) counts.updated += 1;
      else counts.created += 1;
    }
    remoteByUid.delete(event.uid);
  }

  for (const remote of remoteByUid.values()) {
    await deleteCalendarEvent(resolvedConfig, remote);
    counts.deleted += 1;
  }

  return counts;
}

async function performProviderSync(config: CalendarSyncConfig, desiredEvents: Map<string, CalendarSyncEvent>): Promise<SyncCounts> {
  validateConfig(config);
  const refreshed = await ensureProviderAccessToken(config);
  return syncProviderCalendar(refreshed, desiredEvents);
}

async function loadMappedCalendarEvents(config: CalendarSyncConfig): Promise<Map<string, CalendarSyncEvent>> {
  return mapTasks(await loadCalendarTasks(config), config);
}

async function performSync(config: CalendarSyncConfig): Promise<CalendarSyncStatus> {
  const attemptAt = new Date().toISOString();
  const previousStatus = loadCalendarSyncStatus();
  saveCalendarSyncStatus({
    ...previousStatus,
    state: 'syncing',
    lastAttemptAt: attemptAt,
    message: undefined
  });

  const tasks = await loadCalendarTasks(config);
  const useTodos = config.enabled && (config.provider || 'caldav') === 'caldav' && config.caldavComponent === 'VTODO';
  const desiredEvents = mapTasks(tasks, config, useTodos ? 'VTODO' : 'VEVENT');
  const cloudEvents = useTodos && config.cloud?.enabled ? mapTasks(tasks, config) : desiredEvents;
  const [calendarResult, cloudResult] = await Promise.all([
    config.enabled
      ? Promise.allSettled([(config.provider || 'caldav') === 'caldav' ? performCalDavSync(config, desiredEvents) : performProviderSync(config, desiredEvents)]).then(results => results[0])
      : Promise.resolve(null),
    config.cloud?.enabled
      ? Promise.allSettled([publishCalendarCloud(config.cloud, buildCalendarFeed(cloudEvents.values()))]).then(results => results[0])
      : Promise.resolve(null)
  ]);

  const errors: string[] = [];
  const currentStatus = loadCalendarSyncStatus();
  const cloudTargetUnchanged = sameCalendarCloudTarget(config.cloud, loadCalendarSyncConfig().cloud);
  if (cloudResult && !cloudTargetUnchanged) errors.push('ICS cloud: settings changed during upload; publish again with the current settings');
  if (calendarResult?.status === 'rejected') errors.push(`${config.provider === 'google' ? 'Google Calendar' : config.provider === 'microsoft' ? 'Microsoft 365' : 'CalDAV'}: ${getErrorMessage(calendarResult.reason)}`);
  if (cloudResult?.status === 'rejected') errors.push(`ICS cloud: ${getErrorMessage(cloudResult.reason)}`);
  const counts = calendarResult?.status === 'fulfilled' ? calendarResult.value : EMPTY_SYNC_COUNTS;
  const completedAt = new Date().toISOString();

  return saveCalendarSyncStatus({
    state: errors.length ? 'error' : 'success',
    lastAttemptAt: attemptAt,
    lastSuccessAt: errors.length ? previousStatus.lastSuccessAt : completedAt,
    ...counts,
    cloudPublishedAt: cloudTargetUnchanged && cloudResult?.status === 'fulfilled' ? cloudResult.value.publishedAt || completedAt : currentStatus.cloudPublishedAt,
    cloudEventCount: cloudTargetUnchanged && cloudResult?.status === 'fulfilled' ? cloudEvents.size : currentStatus.cloudEventCount,
    cloudUrl: cloudTargetUnchanged && cloudResult?.status === 'fulfilled' ? cloudResult.value.url : currentStatus.cloudUrl,
    cloudUrlExpiresAt: cloudTargetUnchanged && cloudResult?.status === 'fulfilled' ? cloudResult.value.expiresAt : currentStatus.cloudUrlExpiresAt,
    cloudError: cloudTargetUnchanged && cloudResult?.status === 'rejected' ? getErrorMessage(cloudResult.reason) : undefined,
    cloudRetryAt: cloudTargetUnchanged && cloudResult?.status === 'rejected' ? getCloudRetryAt(cloudResult.reason) : undefined,
    message: errors.length ? errors.join('; ') : undefined
  });
}

export async function syncCalendarNow(): Promise<CalendarSyncStatus> {
  return runCalendarSync(false);
}

async function runCalendarSync(onlyIfDue: boolean): Promise<CalendarSyncStatus> {
  if (debounceTimer !== null) {
    window.clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (syncInFlight) {
    rerunRequested = true;
    return syncInFlight;
  }
  const config = loadCalendarSyncConfig();
  if (!hasCalendarSyncChannel(config)) return loadCalendarSyncStatus();

  const sync = async () => {
    const currentConfig = loadCalendarSyncConfig();
    if (!hasCalendarSyncChannel(currentConfig) || onlyIfDue && !isCalendarSyncDue(currentConfig, loadCalendarSyncStatus())) return loadCalendarSyncStatus();
    return performSync(currentConfig);
  };
  // Serialize across SiYuan windows where Web Locks is available. A scheduled
  // check re-reads the shared attempt time after acquiring the lock.
  const operation = Promise.resolve(navigator.locks?.request
    ? navigator.locks.request('pinch-calendar-sync', { ifAvailable: onlyIfDue }, async lock => lock ? await sync() : loadCalendarSyncStatus())
    : sync());
  const request = operation.catch((error) => saveCalendarSyncStatus({
    ...loadCalendarSyncStatus(),
    state: 'error',
    lastAttemptAt: new Date().toISOString(),
    message: getErrorMessage(error)
  }));
  syncInFlight = request;
  try {
    return await request;
  } finally {
    syncInFlight = null;
    if (rerunRequested) {
      rerunRequested = false;
      queueCalendarSync();
    }
  }
}

export async function testCalendarSyncConnection(config = loadCalendarSyncConfig()): Promise<string> {
  validateConfig(config);
  if (config.provider === 'google' || config.provider === 'microsoft') {
    await ensureProviderAccessToken(config);
    return config.provider === 'google' ? 'Google Calendar connection succeeded' : 'Microsoft 365 connection succeeded';
  }
  return testCalendarDavConnection(config);
}

export async function createCalendarFeedIcs(
  config = loadCalendarSyncConfig()
): Promise<{ ics: string; eventCount: number }> {
  const events = await loadMappedCalendarEvents(config);
  return { ics: buildCalendarFeed(events.values()), eventCount: events.size };
}

export async function exportCalendarIcs(config = loadCalendarSyncConfig()): Promise<number> {
  const { ics, eventCount } = await createCalendarFeedIcs(config);
  const objectUrl = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = CALENDAR_EXPORT_FILENAME;
  link.click();
  URL.revokeObjectURL(objectUrl);
  return eventCount;
}

export async function publishCalendarCloudNow(config = loadCalendarSyncConfig()): Promise<number> {
  const cloud = normalizeCalendarCloudConfig(config.cloud);
  const events = await loadMappedCalendarEvents(config);
  try {
    const result = await publishCalendarCloud(cloud, buildCalendarFeed(events.values()));
    if (!sameCalendarCloudTarget(cloud, loadCalendarSyncConfig().cloud)) throw new Error('Cloud settings changed during upload; publish again');
    const previous = loadCalendarSyncStatus();
    const message = previous.message?.replace(/(?:^|; )ICS cloud:.*$/, '') || undefined;
    saveCalendarSyncStatus({
      ...previous, state: previous.state === 'error' && !message ? 'success' : previous.state, message,
      cloudPublishedAt: result.publishedAt || new Date().toISOString(), cloudEventCount: events.size,
      cloudUrl: result.url, cloudUrlExpiresAt: result.expiresAt, cloudError: undefined, cloudRetryAt: undefined
    });
    return events.size;
  } catch (error) {
    if (sameCalendarCloudTarget(cloud, loadCalendarSyncConfig().cloud)) {
      const previous = loadCalendarSyncStatus();
      const otherErrors = previous.message?.replace(/(?:^|; )ICS cloud:.*$/, '');
      const cloudError = getErrorMessage(error);
      saveCalendarSyncStatus({ ...previous, state: 'error', cloudError, cloudRetryAt: getCloudRetryAt(error),
        message: [otherErrors, `ICS cloud: ${cloudError}`].filter(Boolean).join('; ') });
    }
    throw error;
  }
}

export function queueCalendarSync(): void {
  const config = loadCalendarSyncConfig();
  if (!started || !hasCalendarSyncChannel(config) || config.syncInterval === 'manual' || config.syncOnChange === false) return;
  if (debounceTimer !== null) window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    debounceTimer = null;
    void syncCalendarNow();
  }, CHANGE_DEBOUNCE_MS);
}

function handleVisibilityOrFocus(): void {
  if (document.visibilityState === 'visible') checkScheduledSync();
}

function checkScheduledSync(): void {
  if (!started || syncInFlight || cloudRetryInFlight) return;
  const config = loadCalendarSyncConfig();
  const status = loadCalendarSyncStatus();
  if (isCalendarSyncDue(config, status)) { void runCalendarSync(true); return; }
  if (config.syncInterval !== 'manual' && config.cloud?.enabled && status.cloudRetryAt && Date.parse(status.cloudRetryAt) <= Date.now()) {
    cloudRetryInFlight = true;
    // Retry only this channel; a deferred asset upload must not repeatedly
    // query/write CalDAV.
    void publishCalendarCloudNow(config).catch(() => undefined).finally(() => { cloudRetryInFlight = false; });
  }
}

export function startCalendarSync(): void {
  if (started) return;
  started = true;
  unsubscribeHandlers = [
    eventBus.on(Events.TASK_CHANGED, queueCalendarSync),
    eventBus.on(Events.TASK_ADDED, queueCalendarSync),
    eventBus.on(Events.TASK_UPDATED, queueCalendarSync),
    eventBus.on(Events.TASK_DELETED, queueCalendarSync),
    eventBus.on(Events.TASK_DATE_CHANGED, queueCalendarSync)
  ];
  window.addEventListener('focus', handleVisibilityOrFocus);
  document.addEventListener('visibilitychange', handleVisibilityOrFocus, true);
  window.addEventListener(CALENDAR_SYNC_SETTINGS_CHANGED_EVENT, queueCalendarSync);
  periodicTimer = window.setInterval(checkScheduledSync, PERIODIC_SYNC_MS);
  checkScheduledSync();
}

export function stopCalendarSync(): void {
  if (!started) return;
  started = false;
  unsubscribeHandlers.forEach(unsubscribe => unsubscribe());
  unsubscribeHandlers = [];
  window.removeEventListener('focus', handleVisibilityOrFocus);
  document.removeEventListener('visibilitychange', handleVisibilityOrFocus, true);
  window.removeEventListener(CALENDAR_SYNC_SETTINGS_CHANGED_EVENT, queueCalendarSync);
  if (debounceTimer !== null) window.clearTimeout(debounceTimer);
  if (periodicTimer !== null) window.clearInterval(periodicTimer);
  debounceTimer = null;
  periodicTimer = null;
  rerunRequested = false;
}
