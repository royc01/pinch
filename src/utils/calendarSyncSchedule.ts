import type { CalendarSyncConfig, CalendarSyncStatus } from '@/calendarSyncTypes';

const INTERVALS: Record<string, number> = {
  '15min': 15 * 60 * 1000, hourly: 60 * 60 * 1000, '4hour': 4 * 60 * 60 * 1000,
  '12hour': 12 * 60 * 60 * 1000, daily: 24 * 60 * 60 * 1000
};

export function hasCalendarSyncChannel(config: CalendarSyncConfig): boolean {
  return config.enabled || config.cloud?.enabled === true;
}

export function isCalendarSyncDue(config: CalendarSyncConfig, status: CalendarSyncStatus, now = new Date()): boolean {
  if (!hasCalendarSyncChannel(config) || config.syncInterval === 'manual') return false;
  const last = status.lastAttemptAt ? Date.parse(status.lastAttemptAt) : 0;
  const lastAttempt = Number.isFinite(last) ? last : 0;
  if (config.syncInterval === 'dailyAt') {
    const [hours, minutes] = (config.dailySyncTime || '08:00').split(':').map(Number);
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
    return now.getTime() >= target.getTime() && lastAttempt < target.getTime();
  }
  return now.getTime() - lastAttempt >= (INTERVALS[config.syncInterval || '15min'] || INTERVALS['15min']);
}
