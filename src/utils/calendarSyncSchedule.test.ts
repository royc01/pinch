import { describe, expect, it } from 'vitest';
import { isCalendarSyncDue } from './calendarSyncSchedule';
import { DEFAULT_CALENDAR_SYNC_CONFIG, DEFAULT_CALENDAR_SYNC_STATUS, normalizeCalendarSyncConfig } from './calendarSyncSettings';
const config = normalizeCalendarSyncConfig({ ...DEFAULT_CALENDAR_SYNC_CONFIG, cloud: { enabled: true } });
const status = DEFAULT_CALENDAR_SYNC_STATUS;
describe('calendar sync schedule and settings migration', () => {
  it('disables automatic sync for manual mode or no enabled channel', () => {
    expect(isCalendarSyncDue({ ...config, syncInterval: 'manual' }, status)).toBe(false);
    expect(isCalendarSyncDue({ ...config, cloud: { ...config.cloud!, enabled: false } }, status)).toBe(false);
  });
  it.each(['15min', 'hourly', '4hour', '12hour', 'daily'] as const)('uses last attempt to rate-limit %s even after failure', interval => {
    const now = new Date('2026-10-05T08:00:00Z');
    expect(isCalendarSyncDue({ ...config, syncInterval: interval }, { ...status, state: 'error', lastAttemptAt: now.toISOString() }, now)).toBe(false);
    expect(isCalendarSyncDue({ ...config, syncInterval: interval }, status, now)).toBe(true);
  });
  it('runs daily at the configured local time once, and catches up after reopening', () => {
    const daily = { ...config, syncInterval: 'dailyAt' as const, dailySyncTime: '08:30' };
    const before = new Date(2026, 9, 5, 8, 29);
    const due = new Date(2026, 9, 5, 8, 30);
    const later = new Date(2026, 9, 5, 12, 0);
    expect(isCalendarSyncDue(daily, status, before)).toBe(false);
    expect(isCalendarSyncDue(daily, status, due)).toBe(true);
    expect(isCalendarSyncDue(daily, status, later)).toBe(true);
    expect(isCalendarSyncDue(daily, { ...status, lastAttemptAt: due.toISOString() }, later)).toBe(false);
  });
  it('preserves existing CalDAV credentials and gives old settings safe cloud/schedule defaults', () => {
    const migrated = normalizeCalendarSyncConfig({ username: 'user', password: ' secret ', calendarUrl: 'https://dav.example.test', enabled: true });
    expect(migrated).toMatchObject({ password: ' secret ', syncInterval: '15min', transport: 'auto', syncOnChange: true, cloud: { enabled: false } });
    expect(migrated.cloud!.fileName).toMatch(/^pinch-[a-f0-9]{48}\.ics$/);
    const normalized = normalizeCalendarSyncConfig({ ...migrated, dailySyncTime: '25:00', cloud: { ...migrated.cloud!, s3AccessKeySecret: ' secret ' } });
    expect(normalized.dailySyncTime).toBe('08:00');
    expect(normalized.cloud!.s3AccessKeySecret).toBe(' secret ');
  });
  it('drops old LAN subscription settings without changing the derived cloud filename or enabling sync', () => {
    const token = '00112233445566778899aabbccddeeff0011223344556677';
    const migrated = normalizeCalendarSyncConfig({
      feedEnabled: true, feedToken: token, feedBaseUrl: 'http://192.168.0.105:3944'
    });
    expect(migrated).not.toHaveProperty('feedEnabled');
    expect(migrated).not.toHaveProperty('feedToken');
    expect(migrated).not.toHaveProperty('feedBaseUrl');
    expect(migrated.cloud!.fileName).toBe(`pinch-${token}.ics`);
    expect(isCalendarSyncDue(migrated, status)).toBe(false);
    expect(normalizeCalendarSyncConfig(migrated).cloud!.fileName).toBe(migrated.cloud!.fileName);
    const existing = normalizeCalendarSyncConfig({ ...migrated, cloud: { ...migrated.cloud!, fileName: 'existing.ics' } });
    expect(existing.cloud!.fileName).toBe('existing.ics');
  });
});
