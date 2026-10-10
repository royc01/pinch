import type { CalendarCloudConfig, CalendarProvider, CalendarSyncConfig, CalendarSyncStatus, CalendarTransport } from '@/calendarSyncTypes';
import { generateCalendarFileToken, normalizeCalendarFileToken } from '@/utils/calendarFeed';
import { isMissingPluginStorageValue, isPluginLifecycleEndedError } from '@/utils/pluginStorage';

const CONFIG_STORAGE_KEY = 'pinch:calendar-sync-config-v1';
const STATUS_STORAGE_KEY = 'pinch:calendar-sync-status-v1';
const PLUGIN_CONFIG_STORAGE_KEY = 'calendar-sync-config';

interface CalendarSettingsStorage {
  loadData(key: string): Promise<unknown>;
  saveData(key: string, value: unknown): Promise<unknown>;
}

interface ConfigSnapshot {
  config: CalendarSyncConfig;
  updatedAt: number;
}

let settingsStorage: CalendarSettingsStorage | null = null;
let memorySnapshot: ConfigSnapshot | null = null;
let saveQueue: Promise<void> = Promise.resolve();
let configRevision = 0;
let storageGeneration = 0;

function parseConfigSnapshot(value: unknown): ConfigSnapshot | null {
  if (isMissingPluginStorageValue(value)) return null;
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const raw = parsed as { config?: unknown; updatedAt?: unknown };
  // Accept the original localStorage format during migration.
  const config = raw.config === undefined ? parsed : raw.config;
  if (!config || typeof config !== 'object' || Array.isArray(config)) return null;
  return {
    config: normalizeCalendarSyncConfig(config),
    updatedAt: typeof raw.updatedAt === 'number' && Number.isFinite(raw.updatedAt) ? raw.updatedAt : 0
  };
}

function readLocalConfigSnapshot(): ConfigSnapshot | null {
  try {
    return parseConfigSnapshot(window.localStorage.getItem(CONFIG_STORAGE_KEY));
  } catch {
    return memorySnapshot;
  }
}

function cacheConfigSnapshot(snapshot: ConfigSnapshot): void {
  memorySnapshot = snapshot;
  try {
    window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    console.warn('[CalendarSync] Could not cache settings locally');
  }
}

function persistConfigSnapshot(snapshot: ConfigSnapshot): Promise<void> {
  const storage = settingsStorage;
  if (!storage) return Promise.resolve();
  const generation = storageGeneration;
  // Capture an immutable value and serialize writes so an older request cannot
  // finish after the latest edit and overwrite it.
  const value = JSON.parse(JSON.stringify(snapshot)) as ConfigSnapshot;
  saveQueue = saveQueue.then(async () => {
    if (generation !== storageGeneration || settingsStorage !== storage) return;
    await storage.saveData(PLUGIN_CONFIG_STORAGE_KEY, value);
  }).catch((error) => {
    if (generation !== storageGeneration) return;
    if (isPluginLifecycleEndedError(error)) {
      disposeCalendarSyncSettings(storage);
      return;
    }
    console.warn('[CalendarSync] Could not back up settings to plugin storage');
  });
  return saveQueue;
}

/** Hydrate before mounting the UI or starting the sync scheduler. */
export async function initializeCalendarSyncSettings(storage: CalendarSettingsStorage): Promise<boolean> {
  settingsStorage = storage;
  const generation = ++storageGeneration;
  const revision = configRevision;
  let stored: ConfigSnapshot | null = null;
  try {
    stored = parseConfigSnapshot(await storage.loadData(PLUGIN_CONFIG_STORAGE_KEY));
  } catch (error) {
    if (generation !== storageGeneration) return false;
    if (isPluginLifecycleEndedError(error)) {
      disposeCalendarSyncSettings(storage);
      return false;
    }
    console.warn('[CalendarSync] Could not read settings backup; using the local snapshot');
  }
  if (generation !== storageGeneration) return false;
  const local = readLocalConfigSnapshot();
  // A reload can interrupt a plugin write. Keep the newer synchronous snapshot,
  // including edits made while the asynchronous backup was loading.
  const snapshot = configRevision !== revision ? local
    : local && (!stored || local.updatedAt >= stored.updatedAt) ? local : stored;
  if (!snapshot) return true;
  cacheConfigSnapshot(snapshot);
  if (snapshot !== stored) await persistConfigSnapshot(snapshot);
  return generation === storageGeneration;
}

/** Detach the outgoing instance and cancel its queued hydration/backups. */
export function disposeCalendarSyncSettings(storage: CalendarSettingsStorage): void {
  if (settingsStorage !== storage) return;
  settingsStorage = null;
  storageGeneration += 1;
}

export async function flushCalendarSyncSettings(): Promise<void> {
  await saveQueue;
}

export const CALENDAR_SYNC_SETTINGS_CHANGED_EVENT = 'pinch-calendar-sync-settings-changed';
export const CALENDAR_SYNC_STATUS_CHANGED_EVENT = 'pinch-calendar-sync-status-changed';

export const DEFAULT_CALENDAR_CLOUD_CONFIG: CalendarCloudConfig = Object.freeze({
  enabled: false, method: 's3', fileName: '', transport: 'auto',
  webdavUrl: '', webdavUsername: '', webdavPassword: '',
  s3UseSiyuanConfig: false, s3Bucket: '', s3Endpoint: '', s3Region: 'auto',
  s3AccessKeyId: '', s3AccessKeySecret: '', s3StoragePath: 'calendar/',
  s3ForcePathStyle: false, s3CustomDomain: '', s3UrlMode: 'public'
});

function normalizeTransport(value: unknown): CalendarTransport {
  return value === 'direct' || value === 'proxy' ? value : 'auto';
}

export function normalizeCalendarCloudConfig(value: unknown, token = ''): CalendarCloudConfig {
  const raw = value && typeof value === 'object' ? value as Partial<CalendarCloudConfig> : {};
  const text = (value: unknown, fallback = '') => typeof value === 'string' ? value.trim() : fallback;
  return {
    enabled: raw.enabled === true,
    method: raw.method === 'webdav' || raw.method === 'siyuan' ? raw.method : 's3',
    fileName: text(raw.fileName) || `pinch-${token || generateCalendarFileToken()}.ics`,
    transport: normalizeTransport(raw.transport),
    webdavUrl: text(raw.webdavUrl), webdavUsername: text(raw.webdavUsername),
    webdavPassword: typeof raw.webdavPassword === 'string' ? raw.webdavPassword : '',
    s3UseSiyuanConfig: raw.s3UseSiyuanConfig === true,
    s3Bucket: text(raw.s3Bucket), s3Endpoint: text(raw.s3Endpoint), s3Region: text(raw.s3Region) || 'auto',
    s3AccessKeyId: text(raw.s3AccessKeyId), s3AccessKeySecret: typeof raw.s3AccessKeySecret === 'string' ? raw.s3AccessKeySecret : '',
    s3StoragePath: text(raw.s3StoragePath, 'calendar/'),
    s3ForcePathStyle: raw.s3ForcePathStyle === true, s3CustomDomain: text(raw.s3CustomDomain),
    s3UrlMode: raw.s3UrlMode === 'signed' ? 'signed' : 'public'
  };
}

export const DEFAULT_CALENDAR_SYNC_CONFIG: CalendarSyncConfig = Object.freeze({
  enabled: false,
  provider: 'caldav',
  caldavComponent: 'VEVENT',
  calendarUrl: '',
  username: '',
  password: '',
  futureDays: 180,
  defaultDurationMinutes: 30,
  transport: 'auto', syncInterval: '15min', dailySyncTime: '08:00', syncOnChange: true
});

export const DEFAULT_CALENDAR_SYNC_STATUS: CalendarSyncStatus = Object.freeze({
  state: 'idle',
  created: 0,
  updated: 0,
  deleted: 0,
  unchanged: 0
});

function normalizeBoundedInteger(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? Math.max(min, Math.min(max, Math.round(numeric)))
    : fallback;
}

export function normalizeCalendarSyncConfig(value: unknown): CalendarSyncConfig {
  const raw = value && typeof value === 'object'
    ? value as Partial<CalendarSyncConfig> & { feedToken?: unknown } : {};
  // Preserve the cloud filename derived from older LAN subscription settings.
  const legacyFileToken = normalizeCalendarFileToken(raw.feedToken);
  return {
    enabled: raw.enabled === true,
    provider: (['caldav', 'google', 'microsoft'] as CalendarProvider[]).includes(raw.provider as CalendarProvider)
      ? raw.provider as CalendarProvider : 'caldav',
    caldavComponent: raw.caldavComponent === 'VTODO' ? 'VTODO' : 'VEVENT',
    calendarUrl: typeof raw.calendarUrl === 'string' ? raw.calendarUrl.trim() : '',
    username: typeof raw.username === 'string' ? raw.username.trim() : '',
    password: typeof raw.password === 'string' ? raw.password : '',
    transport: normalizeTransport(raw.transport),
    syncInterval: ['manual', '15min', 'hourly', '4hour', '12hour', 'daily', 'dailyAt'].includes(raw.syncInterval || '')
      ? raw.syncInterval : '15min',
    dailySyncTime: typeof raw.dailySyncTime === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(raw.dailySyncTime)
      ? raw.dailySyncTime : '08:00',
    syncOnChange: raw.syncOnChange !== false,
    oauthClientId: typeof raw.oauthClientId === 'string' ? raw.oauthClientId.trim() : '',
    oauthAccessToken: typeof raw.oauthAccessToken === 'string' ? raw.oauthAccessToken : '',
    oauthRefreshToken: typeof raw.oauthRefreshToken === 'string' ? raw.oauthRefreshToken : '',
    oauthTokenExpiresAt: typeof raw.oauthTokenExpiresAt === 'string' ? raw.oauthTokenExpiresAt : '',
    providerCalendarId: typeof raw.providerCalendarId === 'string' ? raw.providerCalendarId.trim() : '',
    providerEventIds: raw.providerEventIds && typeof raw.providerEventIds === 'object'
      ? Object.fromEntries(Object.entries(raw.providerEventIds).filter(([, id]) => typeof id === 'string' && id))
      : {},
    cloud: normalizeCalendarCloudConfig(raw.cloud, legacyFileToken),
    futureDays: normalizeBoundedInteger(raw.futureDays, DEFAULT_CALENDAR_SYNC_CONFIG.futureDays, 7, 730),
    defaultDurationMinutes: normalizeBoundedInteger(
      raw.defaultDurationMinutes,
      DEFAULT_CALENDAR_SYNC_CONFIG.defaultDurationMinutes,
      5,
      480
    )
  };
}

export function loadCalendarSyncConfig(): CalendarSyncConfig {
  return normalizeCalendarSyncConfig(readLocalConfigSnapshot()?.config);
}

export function saveCalendarSyncConfig(value: CalendarSyncConfig): CalendarSyncConfig {
  const config = normalizeCalendarSyncConfig(value);
  const previous = loadCalendarSyncConfig();
  const snapshot = { config, updatedAt: Math.max(Date.now(), (readLocalConfigSnapshot()?.updatedAt || 0) + 1) };
  configRevision += 1;
  cacheConfigSnapshot(snapshot);
  void persistConfigSnapshot(snapshot);
  if (!sameCalendarCloudTarget(previous.cloud, config.cloud)) {
    saveCalendarSyncStatus({ ...loadCalendarSyncStatus(), cloudUrl: undefined, cloudUrlExpiresAt: undefined,
      cloudPublishedAt: undefined, cloudEventCount: undefined, cloudError: undefined, cloudRetryAt: undefined });
  }
  window.dispatchEvent(new CustomEvent(CALENDAR_SYNC_SETTINGS_CHANGED_EVENT, { detail: config }));
  return config;
}

export function sameCalendarCloudTarget(left?: CalendarCloudConfig, right?: CalendarCloudConfig): boolean {
  const target = (config?: CalendarCloudConfig) => {
    if (!config) return null;
    const { enabled: _enabled, transport: _transport, ...destination } = config;
    return destination;
  };
  return JSON.stringify(target(left)) === JSON.stringify(target(right));
}

// Only update the resolved address if this is still the same account/target.
// Keep any other preferences edited while discovery was in flight.
export function saveResolvedCalendarUrl(original: CalendarSyncConfig, calendarUrl: string): boolean {
  const current = loadCalendarSyncConfig();
  if (current.calendarUrl !== original.calendarUrl || current.username !== original.username
    || current.password !== original.password || current.enabled !== original.enabled
    || (current.provider || 'caldav') !== (original.provider || 'caldav')
    || (current.caldavComponent || 'VEVENT') !== (original.caldavComponent || 'VEVENT')) return false;
  if (current.calendarUrl !== calendarUrl) saveCalendarSyncConfig({ ...current, calendarUrl });
  return true;
}

export function loadCalendarSyncStatus(): CalendarSyncStatus {
  try {
    const raw = window.localStorage.getItem(STATUS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CALENDAR_SYNC_STATUS };
    const parsed = JSON.parse(raw) as Partial<CalendarSyncStatus>;
    const state = ['idle', 'syncing', 'success', 'error'].includes(parsed.state || '')
      ? parsed.state as CalendarSyncStatus['state']
      : 'idle';
    return {
      state,
      lastAttemptAt: typeof parsed.lastAttemptAt === 'string' ? parsed.lastAttemptAt : undefined,
      lastSuccessAt: typeof parsed.lastSuccessAt === 'string' ? parsed.lastSuccessAt : undefined,
      created: normalizeBoundedInteger(parsed.created, 0, 0, Number.MAX_SAFE_INTEGER),
      updated: normalizeBoundedInteger(parsed.updated, 0, 0, Number.MAX_SAFE_INTEGER),
      deleted: normalizeBoundedInteger(parsed.deleted, 0, 0, Number.MAX_SAFE_INTEGER),
      unchanged: normalizeBoundedInteger(parsed.unchanged, 0, 0, Number.MAX_SAFE_INTEGER),
      cloudPublishedAt: typeof parsed.cloudPublishedAt === 'string' ? parsed.cloudPublishedAt : undefined,
      cloudEventCount: parsed.cloudEventCount === undefined ? undefined : normalizeBoundedInteger(parsed.cloudEventCount, 0, 0, Number.MAX_SAFE_INTEGER),
      cloudUrl: typeof parsed.cloudUrl === 'string' ? parsed.cloudUrl : undefined,
      cloudUrlExpiresAt: typeof parsed.cloudUrlExpiresAt === 'string' ? parsed.cloudUrlExpiresAt : undefined,
      cloudError: typeof parsed.cloudError === 'string' ? parsed.cloudError : undefined,
      cloudRetryAt: typeof parsed.cloudRetryAt === 'string' ? parsed.cloudRetryAt : undefined,
      message: typeof parsed.message === 'string' ? parsed.message : undefined
    };
  } catch {
    return { ...DEFAULT_CALENDAR_SYNC_STATUS };
  }
}

export function saveCalendarSyncStatus(value: CalendarSyncStatus): CalendarSyncStatus {
  const status = { ...value };
  try {
    window.localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(status));
  } catch {
    console.warn('[CalendarSync] Could not cache sync status locally');
  }
  window.dispatchEvent(new CustomEvent(CALENDAR_SYNC_STATUS_CHANGED_EVENT, { detail: status }));
  return status;
}
