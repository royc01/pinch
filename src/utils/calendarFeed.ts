import type { CalendarSyncEvent } from '@/calendarSyncTypes';
import { foldIcsLine } from '@/utils/calendarEventMapper';

const FILE_TOKEN_PATTERN = /^[a-f0-9]{48}$/;

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

export function normalizeCalendarFileToken(value: unknown): string {
  const token = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return FILE_TOKEN_PATTERN.test(token) ? token : '';
}

export function generateCalendarFileToken(): string {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('Secure random number generation is unavailable');
  }
  const bytes = new Uint8Array(24);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function buildCalendarFeed(
  events: Iterable<CalendarSyncEvent>,
  calendarName = 'Pinch Tasks'
): string {
  const sortedEvents = Array.from(events).sort((left, right) => left.uid.localeCompare(right.uid));
  const header = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pinch Habit//Calendar Feed 1.0//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
    'X-PUBLISHED-TTL:PT15M',
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`
  ].map(foldIcsLine);
  return [
    ...header,
    ...sortedEvents.map(event => event.eventIcs.trimEnd()),
    'END:VCALENDAR',
    ''
  ].join('\r\n');
}
