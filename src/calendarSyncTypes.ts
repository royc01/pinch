export type CalendarTransport = 'auto' | 'direct' | 'proxy';
export type CalendarSyncInterval = 'manual' | '15min' | 'hourly' | '4hour' | '12hour' | 'daily' | 'dailyAt';
export type CalendarProvider = 'caldav' | 'google' | 'microsoft';
export type CalendarComponent = 'VEVENT' | 'VTODO';

export interface CalendarCloudConfig {
  enabled: boolean;
  method: 'siyuan' | 's3' | 'webdav';
  fileName: string;
  transport: CalendarTransport;
  webdavUrl: string;
  webdavUsername: string;
  webdavPassword: string;
  s3UseSiyuanConfig: boolean;
  s3Bucket: string;
  s3Endpoint: string;
  s3Region: string;
  s3AccessKeyId: string;
  s3AccessKeySecret: string;
  s3StoragePath: string;
  s3ForcePathStyle: boolean;
  s3CustomDomain: string;
  s3UrlMode: 'public' | 'signed';
}

export interface CalendarSyncConfig {
  enabled: boolean;
  provider?: CalendarProvider;
  caldavComponent?: CalendarComponent;
  calendarUrl: string;
  username: string;
  password: string;
  futureDays: number;
  defaultDurationMinutes: number;
  transport?: CalendarTransport;
  syncInterval?: CalendarSyncInterval;
  dailySyncTime?: string;
  syncOnChange?: boolean;
  oauthClientId?: string;
  oauthAccessToken?: string;
  oauthRefreshToken?: string;
  oauthTokenExpiresAt?: string;
  providerCalendarId?: string;
  providerEventIds?: Record<string, string>;
  cloud?: CalendarCloudConfig;
}

export interface CalendarSyncStatus {
  state: 'idle' | 'syncing' | 'success' | 'error';
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  created: number;
  updated: number;
  deleted: number;
  unchanged: number;
  cloudPublishedAt?: string;
  cloudEventCount?: number;
  cloudUrl?: string;
  cloudUrlExpiresAt?: string;
  cloudError?: string;
  cloudRetryAt?: string;
  message?: string;
}

export interface CalendarSyncEvent {
  uid: string;
  resourceName: string;
  blockId?: string;
  fingerprint: string;
  eventIcs: string;
  ics: string;
}

export interface CalDavRequestParams {
  url: string;
  username: string;
  password: string;
  method: 'PROPFIND' | 'REPORT' | 'GET' | 'PUT' | 'DELETE';
  transport?: 'proxy' | 'direct';
  headers?: Record<string, string>;
  body?: string;
}

export interface CalDavResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}
