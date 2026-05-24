import { TaskRepository, openBlockById, pushMsg, type Task } from '@/api';
import { translate } from '@/composables/useI18n';
import { usePlugin } from '@/main';
import { stripHtml } from '@/composables/useTaskCommon';
import { eventBus, Events } from '@/utils/eventBus';
import { getFrontend } from 'siyuan';
import * as Siyuan from 'siyuan';
import {
  computeTaskReminderTimestamp,
  getTaskReminderLongLabel,
  normalizeTaskReminderType
} from '@/utils/taskReminder';

type FiredReminderMap = Record<string, number>;
type MobileNotificationId = number | string;
type MobileNotificationRecordMap = Record<string, MobileNotificationRecord>;

type ScheduledReminder = {
  identity: string;
  occurrenceKey: string;
  fireAt: number;
  blockId?: string;
  title: string;
  dueDate?: string;
  dueTime?: string;
  reminderType?: string;
  reminderCustomTime?: string;
};

type MobileNotificationRecord = {
  occurrenceKey: string;
  fireAt: number;
  notificationIds: MobileNotificationId[];
};

type PlatformUtilsLike = {
  sendNotification?: (options: {
    channel: string;
    title: string;
    body: string;
    delayInSeconds?: number;
    timeoutType?: string;
  }) => Promise<MobileNotificationId> | MobileNotificationId;
  cancelNotification?: (notificationId: MobileNotificationId) => void;
};

const FIRED_REMINDER_STORAGE_FILE = 'pinch-task-reminders-fired.json';
const MOBILE_NOTIFICATION_STORAGE_FILE = 'pinch-mobile-task-notification-ids.json';
const FIRED_REMINDER_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MISSED_REMINDER_GRACE_MS = 15 * 60 * 1000;
const MAX_TIMEOUT_MS = 2_147_483_647;
const MOBILE_NOTIFICATION_CHANNEL_NAME = 'Pinch Habit';
const REMINDER_RETRY_MS = 60 * 1000;
const DESKTOP_NOTIFICATION_AUTO_CLOSE_MS = 12 * 1000;

const reminderTimers = new Map<string, number>();
const scheduledReminders = new Map<string, ScheduledReminder>();
const activeNotifications = new Map<string, Notification>();
const pendingBlockIds = new Set<string>();

let firedReminderMap: FiredReminderMap = {};
let firedReminderLoaded = false;
let started = false;
let persistTimer: number | null = null;
let blockRefreshTimer: number | null = null;
let fullRefreshTimer: number | null = null;
let unsubscribeHandlers: Array<() => void> = [];

function formatTemplate(key: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [name, value]) => result.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value)),
    translate(key)
  );
}

function getReminderNotificationTitle(): string {
  return translate('taskReminder.notificationTitle', 'Task reminder');
}

function isAppVisible(): boolean {
  if (typeof document === 'undefined') {
    return true;
  }
  return document.visibilityState === 'visible' && document.hidden !== true;
}

function isMobileFrontend(): boolean {
  try {
    const frontend = getFrontend();
    return frontend === 'mobile' || frontend === 'browser-mobile';
  } catch {
    return false;
  }
}

function getPlatformUtils(): PlatformUtilsLike | null {
  const moduleUtils = (Siyuan as unknown as { platformUtils?: PlatformUtilsLike }).platformUtils;
  if (moduleUtils?.sendNotification && moduleUtils?.cancelNotification) {
    return moduleUtils;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  const windowUtils = (window as typeof window & {
    siyuan?: {
      platformUtils?: PlatformUtilsLike;
    };
  }).siyuan?.platformUtils;

  return windowUtils?.sendNotification && windowUtils?.cancelNotification
    ? windowUtils
    : null;
}

function shouldUseMobileNativeNotifications(): boolean {
  return isMobileFrontend() && !!getPlatformUtils()?.sendNotification;
}

function getTaskIdentity(task: Pick<Task, 'id' | 'blockId'> | null | undefined): string {
  return typeof task?.blockId === 'string' && task.blockId.trim().length > 0
    ? task.blockId.trim()
    : (typeof task?.id === 'string' ? task.id.trim() : '');
}

function buildOccurrenceKey(identity: string, fireAt: number): string {
  return `${identity}:${fireAt}`;
}

function clearReminder(identity: string): void {
  const timer = reminderTimers.get(identity);
  if (timer !== undefined) {
    window.clearTimeout(timer);
    reminderTimers.delete(identity);
  }
  scheduledReminders.delete(identity);
}

function clearAllReminders(): void {
  const identities = new Set<string>([
    ...Array.from(reminderTimers.keys()),
    ...Array.from(scheduledReminders.keys())
  ]);
  identities.forEach(clearReminder);
}

function closeTrackedNotification(tag: string): void {
  const notification = activeNotifications.get(tag);
  if (!notification) {
    return;
  }

  activeNotifications.delete(tag);
  notification.close();
}

function clearAllTrackedNotifications(): void {
  Array.from(activeNotifications.keys()).forEach(closeTrackedNotification);
}

function normalizeMobileNotificationRecord(value: unknown): MobileNotificationRecord | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const occurrenceKey = typeof record.occurrenceKey === 'string' ? record.occurrenceKey : '';
  const fireAt = typeof record.fireAt === 'number' && Number.isFinite(record.fireAt)
    ? record.fireAt
    : 0;
  const notificationIds = Array.isArray(record.notificationIds)
    ? record.notificationIds.filter((id): id is MobileNotificationId => typeof id === 'number' || typeof id === 'string')
    : [];

  if (!occurrenceKey || fireAt <= 0 || notificationIds.length === 0) {
    return null;
  }

  return {
    occurrenceKey,
    fireAt,
    notificationIds
  };
}

async function loadMobileNotificationRecordMap(): Promise<MobileNotificationRecordMap> {
  const plugin = usePlugin();
  if (!plugin) {
    return {};
  }

  try {
    const raw = await plugin.loadData(MOBILE_NOTIFICATION_STORAGE_FILE);
    if (!raw || typeof raw !== 'object') {
      return {};
    }

    const nextMap: MobileNotificationRecordMap = {};
    Object.entries(raw as Record<string, unknown>).forEach(([identity, value]) => {
      if (typeof identity !== 'string' || identity.length === 0) {
        return;
      }

      const record = normalizeMobileNotificationRecord(value);
      if (record) {
        nextMap[identity] = record;
      }
    });

    return nextMap;
  } catch {
    return {};
  }
}

async function saveMobileNotificationRecordMap(recordMap: MobileNotificationRecordMap): Promise<void> {
  const plugin = usePlugin();
  if (!plugin) {
    return;
  }

  await plugin.saveData(MOBILE_NOTIFICATION_STORAGE_FILE, recordMap);
}

function cancelMobileSystemNotification(notificationId: MobileNotificationId): void {
  const platformUtils = getPlatformUtils();
  if (!platformUtils?.cancelNotification) {
    return;
  }

  try {
    platformUtils.cancelNotification(notificationId);
  } catch {
  }
}

function cancelMobileNotificationRecord(record: MobileNotificationRecord | undefined): void {
  if (!record) {
    return;
  }

  record.notificationIds.forEach(cancelMobileSystemNotification);
}

async function loadFiredReminderMap(): Promise<void> {
  if (firedReminderLoaded) {
    return;
  }

  firedReminderLoaded = true;
  const plugin = usePlugin();
  if (!plugin) {
    return;
  }

  try {
    const raw = await plugin.loadData(FIRED_REMINDER_STORAGE_FILE);
    if (raw && typeof raw === 'object') {
      const nextMap: FiredReminderMap = {};
      Object.entries(raw as Record<string, unknown>).forEach(([key, value]) => {
        if (typeof value === 'number' && Number.isFinite(value)) {
          nextMap[key] = value;
        }
      });
      firedReminderMap = nextMap;
    }
  } catch {
    firedReminderMap = {};
  }

  pruneFiredReminderMap();
}

function pruneFiredReminderMap(): void {
  const cutoff = Date.now() - FIRED_REMINDER_TTL_MS;
  let changed = false;

  Object.entries(firedReminderMap).forEach(([key, value]) => {
    if (!Number.isFinite(value) || value < cutoff) {
      delete firedReminderMap[key];
      changed = true;
    }
  });

  if (changed) {
    schedulePersistFiredReminderMap();
  }
}

function schedulePersistFiredReminderMap(): void {
  if (persistTimer !== null) {
    window.clearTimeout(persistTimer);
  }

  persistTimer = window.setTimeout(() => {
    persistTimer = null;
    const plugin = usePlugin();
    if (!plugin) {
      return;
    }
    void plugin.saveData(FIRED_REMINDER_STORAGE_FILE, firedReminderMap);
  }, 160);
}

function persistFiredReminderMapNow(): void {
  if (persistTimer !== null) {
    window.clearTimeout(persistTimer);
    persistTimer = null;
  }

  const plugin = usePlugin();
  if (!plugin) {
    return;
  }

  void plugin.saveData(FIRED_REMINDER_STORAGE_FILE, firedReminderMap);
}

function markReminderHandled(occurrenceKey: string, options?: { immediate?: boolean }): void {
  firedReminderMap[occurrenceKey] = Date.now();
  if (options?.immediate) {
    persistFiredReminderMapNow();
    return;
  }
  schedulePersistFiredReminderMap();
}

function hasReminderHandled(occurrenceKey: string): boolean {
  return typeof firedReminderMap[occurrenceKey] === 'number';
}

function buildScheduledReminder(task: Task): ScheduledReminder | null {
  if (task.status === 'completed' || task.status === 'cancelled' || task.isVirtual) {
    return null;
  }

  const identity = getTaskIdentity(task);
  if (!identity) {
    return null;
  }

  const reminderType = normalizeTaskReminderType(task.reminderType);
  if (!reminderType) {
    return null;
  }

  const fireAt = computeTaskReminderTimestamp(task);
  if (fireAt === null) {
    return null;
  }

  const title = stripHtml(task.title || '').trim() || translate('focusTimer.untitledTask', 'Untitled task');

  return {
    identity,
    occurrenceKey: buildOccurrenceKey(identity, fireAt),
    fireAt,
    blockId: task.blockId,
    title,
    dueDate: task.dueDate,
    dueTime: task.dueTime,
    reminderType,
    reminderCustomTime: task.reminderCustomTime
  };
}

function buildReminderBody(reminder: ScheduledReminder): string {
  const reminderLabel = getTaskReminderLongLabel(reminder.reminderType, reminder.reminderCustomTime);
  const dueText = reminder.dueDate
    ? `${reminder.dueDate}${reminder.dueTime ? ` ${reminder.dueTime}` : ''}`
    : '';

  if (reminderLabel && dueText) {
    return formatTemplate('taskReminder.bodyWithDueTemplate', {
      title: reminder.title,
      reminderLabel,
      dueText
    });
  }
  if (reminderLabel) {
    return formatTemplate('taskReminder.bodyWithLabelTemplate', {
      title: reminder.title,
      reminderLabel
    });
  }
  return reminder.title;
}

async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  try {
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

async function scheduleMobileSystemNotification(reminder: ScheduledReminder): Promise<MobileNotificationId | null> {
  const platformUtils = getPlatformUtils();
  if (!platformUtils?.sendNotification) {
    return null;
  }

  const delayInSeconds = Math.max(0, Math.ceil((reminder.fireAt - Date.now()) / 1000));

  try {
    const notificationId = await platformUtils.sendNotification({
      channel: MOBILE_NOTIFICATION_CHANNEL_NAME,
      title: getReminderNotificationTitle(),
      body: buildReminderBody(reminder),
      delayInSeconds,
      timeoutType: 'default'
    });

    return typeof notificationId === 'number' || typeof notificationId === 'string'
      ? notificationId
      : null;
  } catch {
    return null;
  }
}

async function withMobileNotificationRecordMap(
  update: (recordMap: MobileNotificationRecordMap) => Promise<boolean>
): Promise<void> {
  await loadFiredReminderMap();
  const recordMap = await loadMobileNotificationRecordMap();
  const changed = await update(recordMap);
  if (changed) {
    await saveMobileNotificationRecordMap(recordMap);
  }
  pruneFiredReminderMap();
}

function pruneMissingMobileReminderRecords(
  recordMap: MobileNotificationRecordMap,
  nextIdentities: Set<string>
): boolean {
  let changed = false;

  Object.entries(recordMap).forEach(([identity, record]) => {
    if (nextIdentities.has(identity)) {
      return;
    }

    cancelMobileNotificationRecord(record);
    delete recordMap[identity];
    changed = true;
  });

  return changed;
}

async function syncMobileReminderRecordMap(
  recordMap: MobileNotificationRecordMap,
  task: Task | null,
  identityHint?: string
): Promise<boolean> {
  const identity = identityHint || getTaskIdentity(task);
  if (!identity) {
    return false;
  }

  const existingRecord = recordMap[identity];
  const reminder = task ? buildScheduledReminder(task) : null;

  if (!reminder || hasReminderHandled(reminder.occurrenceKey)) {
    if (!existingRecord) {
      return false;
    }

    cancelMobileNotificationRecord(existingRecord);
    delete recordMap[identity];
    return true;
  }

  if (
    existingRecord
    && existingRecord.occurrenceKey === reminder.occurrenceKey
    && existingRecord.notificationIds.length > 0
  ) {
    return false;
  }

  let changed = false;
  if (existingRecord) {
    cancelMobileNotificationRecord(existingRecord);
    delete recordMap[identity];
    changed = true;
  }

  if (reminder.fireAt <= Date.now()) {
    return changed;
  }

  const notificationId = await scheduleMobileSystemNotification(reminder);
  if (notificationId === null) {
    return changed;
  }

  recordMap[identity] = {
    occurrenceKey: reminder.occurrenceKey,
    fireAt: reminder.fireAt,
    notificationIds: [notificationId]
  };
  return true;
}

async function syncSingleMobileReminder(task: Task | null, identityHint?: string): Promise<void> {
  await withMobileNotificationRecordMap((recordMap) => (
    syncMobileReminderRecordMap(recordMap, task, identityHint)
  ));
}

async function syncMobileRemindersByBlockIds(
  taskMap: Map<string, Task>,
  blockIds: string[]
): Promise<void> {
  await withMobileNotificationRecordMap(async (recordMap) => {
    let changed = false;

    for (const blockId of blockIds) {
      if (await syncMobileReminderRecordMap(recordMap, taskMap.get(blockId) || null, blockId)) {
        changed = true;
      }
    }

    return changed;
  });
}

async function syncAllMobileReminders(tasks: Task[]): Promise<void> {
  await withMobileNotificationRecordMap(async (recordMap) => {
    const nextIdentities = new Set<string>();
    let changed = false;

    for (const task of tasks) {
      const identity = getTaskIdentity(task);
      if (!identity) {
        continue;
      }

      nextIdentities.add(identity);
      if (await syncMobileReminderRecordMap(recordMap, task, identity)) {
        changed = true;
      }
    }

    return pruneMissingMobileReminderRecords(recordMap, nextIdentities) || changed;
  });
}

async function handleReminderNotificationClick(
  reminder: ScheduledReminder,
  notification: Notification
): Promise<void> {
  try {
    if (typeof window !== 'undefined' && typeof window.focus === 'function') {
      window.focus();
    }
  } catch {
  }

  notification.close();

  if (!reminder.blockId) {
    return;
  }

  try {
    await openBlockById(reminder.blockId, { focus: true });
  } catch {
  }
}

async function showTaskSystemNotification(reminder: ScheduledReminder): Promise<boolean> {
  if (!await ensureNotificationPermission()) {
    return false;
  }

  const tag = reminder.occurrenceKey;
  const title = getReminderNotificationTitle();
  const body = buildReminderBody(reminder);

  closeTrackedNotification(tag);

  try {
    const notification = new Notification(title, {
      body,
      tag,
      silent: false
    });
    const autoCloseTimer = window.setTimeout(() => {
      notification.close();
    }, DESKTOP_NOTIFICATION_AUTO_CLOSE_MS);

    const cleanup = () => {
      window.clearTimeout(autoCloseTimer);
      if (activeNotifications.get(tag) === notification) {
        activeNotifications.delete(tag);
      }
    };

    notification.addEventListener('click', () => {
      void handleReminderNotificationClick(reminder, notification);
    });
    notification.addEventListener('close', cleanup);
    notification.addEventListener('error', cleanup);

    activeNotifications.set(tag, notification);
    return true;
  } catch {
    return false;
  }
}

async function emitReminder(reminder: ScheduledReminder): Promise<void> {
  if (hasReminderHandled(reminder.occurrenceKey)) {
    return;
  }

  const title = getReminderNotificationTitle();
  const body = buildReminderBody(reminder);
  const overdueMs = Math.max(0, Date.now() - reminder.fireAt);
  let notified = false;

  try {
    notified = await showTaskSystemNotification(reminder);
  } catch {
    notified = false;
  }

  if (notified) {
    markReminderHandled(reminder.occurrenceKey, { immediate: true });
    return;
  }

  if (!isAppVisible()) {
    return;
  }

  if (overdueMs > MISSED_REMINDER_GRACE_MS) {
    markReminderHandled(reminder.occurrenceKey, { immediate: true });
    return;
  }

  try {
    await pushMsg(`${title}：${body}`, 7000);
    markReminderHandled(reminder.occurrenceKey, { immediate: true });
  } catch {
  }
}

function setReminderTimer(identity: string, callback: () => void, timeoutMs: number): void {
  const previousTimer = reminderTimers.get(identity);
  if (previousTimer !== undefined) {
    window.clearTimeout(previousTimer);
  }
  reminderTimers.set(identity, window.setTimeout(callback, timeoutMs));
}

async function processScheduledReminder(identity: string, occurrenceKey: string): Promise<void> {
  const current = scheduledReminders.get(identity);
  if (!current || current.occurrenceKey !== occurrenceKey) {
    clearReminder(identity);
    return;
  }

  if (hasReminderHandled(occurrenceKey)) {
    clearReminder(identity);
    return;
  }

  const delay = current.fireAt - Date.now();
  if (delay > 0) {
    setReminderTimer(identity, () => {
      void processScheduledReminder(identity, occurrenceKey);
    }, Math.min(delay, MAX_TIMEOUT_MS));
    return;
  }

  const overdueMs = Math.max(0, -delay);
  if (overdueMs > MISSED_REMINDER_GRACE_MS) {
    markReminderHandled(occurrenceKey, { immediate: true });
    clearReminder(identity);
    return;
  }

  await emitReminder(current);
  if (hasReminderHandled(occurrenceKey)) {
    clearReminder(identity);
    return;
  }

  setReminderTimer(identity, () => {
    void processScheduledReminder(identity, occurrenceKey);
  }, REMINDER_RETRY_MS);
}

function scheduleReminder(reminder: ScheduledReminder): void {
  clearReminder(reminder.identity);
  scheduledReminders.set(reminder.identity, reminder);
  void processScheduledReminder(reminder.identity, reminder.occurrenceKey);
}

function applyTaskReminder(task: Task | null, identityHint?: string): void {
  if (shouldUseMobileNativeNotifications()) {
    return;
  }

  const identity = identityHint || getTaskIdentity(task);
  if (!identity) {
    return;
  }

  clearReminder(identity);
  if (!task) {
    return;
  }

  const scheduled = buildScheduledReminder(task);
  if (!scheduled) {
    return;
  }

  if (hasReminderHandled(scheduled.occurrenceKey)) {
    return;
  }

  scheduleReminder(scheduled);
}

async function refreshReminderByBlockIds(blockIds: string[]): Promise<void> {
  const normalizedIds = Array.from(new Set(blockIds.filter((id): id is string => typeof id === 'string' && id.length > 0)));
  if (normalizedIds.length === 0) {
    return;
  }

  const taskMap = await TaskRepository.getTasksByBlockIds(normalizedIds, false, undefined, { useLiveDom: false });
  if (shouldUseMobileNativeNotifications()) {
    await syncMobileRemindersByBlockIds(taskMap, normalizedIds);
    return;
  }

  await loadFiredReminderMap();
  normalizedIds.forEach((blockId) => {
    applyTaskReminder(taskMap.get(blockId) || null, blockId);
  });
  pruneFiredReminderMap();
}

async function refreshAllReminders(): Promise<void> {
  const tasks = await TaskRepository.getAllTasks(false, undefined, { useLiveDom: false });
  if (shouldUseMobileNativeNotifications()) {
    await syncAllMobileReminders(tasks);
    return;
  }

  await loadFiredReminderMap();
  const nextIdentities = new Set<string>();

  tasks.forEach((task) => {
    const identity = getTaskIdentity(task);
    if (!identity) {
      return;
    }
    nextIdentities.add(identity);
    applyTaskReminder(task, identity);
  });

  Array.from(scheduledReminders.keys()).forEach((identity) => {
    if (!nextIdentities.has(identity)) {
      clearReminder(identity);
    }
  });

  pruneFiredReminderMap();
}

function queueBlockRefresh(blockIds: string[]): void {
  blockIds.forEach((blockId) => {
    if (typeof blockId === 'string' && blockId.length > 0) {
      pendingBlockIds.add(blockId);
    }
  });

  if (blockRefreshTimer !== null) {
    return;
  }

  blockRefreshTimer = window.setTimeout(() => {
    blockRefreshTimer = null;
    const blockIdsToRefresh = Array.from(pendingBlockIds);
    pendingBlockIds.clear();
    void refreshReminderByBlockIds(blockIdsToRefresh);
  }, 180);
}

function queueFullRefresh(): void {
  if (fullRefreshTimer !== null) {
    window.clearTimeout(fullRefreshTimer);
  }

  fullRefreshTimer = window.setTimeout(() => {
    fullRefreshTimer = null;
    void refreshAllReminders();
  }, 240);
}

export function startTaskReminderScheduler(): void {
  if (started) {
    return;
  }

  started = true;
  queueFullRefresh();
  document.addEventListener('visibilitychange', queueFullRefresh, true);
  window.addEventListener('focus', queueFullRefresh, true);

  unsubscribeHandlers = [
    eventBus.on(Events.TASK_CHANGED, (payload?: { blockIds?: string[] }) => {
      if (payload?.blockIds?.length) {
        queueBlockRefresh(payload.blockIds);
      }
    }),
    eventBus.on(Events.TASK_ADDED, (payload?: { blockId?: string }) => {
      if (payload?.blockId) {
        queueBlockRefresh([payload.blockId]);
      } else {
        queueFullRefresh();
      }
    }),
    eventBus.on(Events.TASK_UPDATED, (payload?: { blockId?: string }) => {
      if (payload?.blockId) {
        queueBlockRefresh([payload.blockId]);
      } else {
        queueFullRefresh();
      }
    }),
    eventBus.on(Events.TASK_DELETED, (payload?: { blockId?: string }) => {
      if (payload?.blockId) {
        if (shouldUseMobileNativeNotifications()) {
          void syncSingleMobileReminder(null, payload.blockId);
        } else {
          applyTaskReminder(null, payload.blockId);
        }
      } else {
        queueFullRefresh();
      }
    }),
    eventBus.on('task-date-changed', (task?: Task) => {
      if (!task) {
        return;
      }
      if (shouldUseMobileNativeNotifications()) {
        void syncSingleMobileReminder(task, getTaskIdentity(task));
      } else {
        applyTaskReminder(task, getTaskIdentity(task));
      }
    })
  ];
}

export function stopTaskReminderScheduler(): void {
  if (!started) {
    return;
  }

  started = false;
  document.removeEventListener('visibilitychange', queueFullRefresh, true);
  window.removeEventListener('focus', queueFullRefresh, true);
  unsubscribeHandlers.forEach((unsubscribe) => unsubscribe());
  unsubscribeHandlers = [];

  if (blockRefreshTimer !== null) {
    window.clearTimeout(blockRefreshTimer);
    blockRefreshTimer = null;
  }
  if (fullRefreshTimer !== null) {
    window.clearTimeout(fullRefreshTimer);
    fullRefreshTimer = null;
  }
  if (persistTimer !== null) {
    window.clearTimeout(persistTimer);
    persistTimer = null;
    const plugin = usePlugin();
    if (plugin) {
      void plugin.saveData(FIRED_REMINDER_STORAGE_FILE, firedReminderMap);
    }
  }

  pendingBlockIds.clear();
  clearAllReminders();
  clearAllTrackedNotifications();
}
