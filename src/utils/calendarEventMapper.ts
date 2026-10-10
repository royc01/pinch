import type { Task } from '@/api';
import type { CalendarComponent, CalendarSyncEvent } from '@/calendarSyncTypes';
import { getCalendarTaskRenderDateValues } from '@/utils/calendarTaskDates';
import { computeTaskReminderTimestamp } from '@/utils/taskReminder';
import { isClosedTaskStatus } from '@/utils/taskStatus';

export interface CalendarEventMappingOptions {
  defaultDurationMinutes: number;
  timezone?: string;
  component?: CalendarComponent;
}

function escapeIcsText(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function stripHtml(value: string): string {
  if (!value) return '';
  if (typeof document !== 'undefined') {
    const element = document.createElement('div');
    element.innerHTML = value;
    return (element.textContent || '').trim();
  }
  return value.replace(/<[^>]*>/g, '').trim();
}

function getUtf8Length(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function foldIcsLine(line: string): string {
  if (getUtf8Length(line) <= 75) return line;
  const parts: string[] = [];
  let current = '';
  let limit = 75;
  for (const character of line) {
    if (current && getUtf8Length(current + character) > limit) {
      parts.push(current);
      current = character;
      limit = 74;
    } else {
      current += character;
    }
  }
  if (current) parts.push(current);
  return parts.map((part, index) => index === 0 ? part : ` ${part}`).join('\r\n');
}

function formatIcsDate(date: string): string {
  return date.replace(/-/g, '');
}

function formatUtcDateTime(timestamp: number): string {
  return new Date(timestamp).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function normalizeEventDate(value: string): string {
  const date = value.trim();
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime())
    || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error(`Invalid calendar task date: ${date}`);
  }
  return date;
}

function addDays(dateValue: string, days: number): string {
  const date = new Date(`${dateValue}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const timezoneFormatters = new Map<string, Intl.DateTimeFormat>();

function zonedDateTimeTimestamp(date: string, timeValue: string, timezone: string): number {
  const time = timeValue.trim();
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(time)) {
    throw new Error(`Invalid calendar task time: ${time}`);
  }
  const wallTimestamp = Date.parse(`${date}T${time.length === 5 ? `${time}:00` : time}Z`);
  let formatter = timezoneFormatters.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone, calendar: 'gregory', numberingSystem: 'latn',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    });
    timezoneFormatters.set(timezone, formatter);
  }
  const wallTimeAt = (timestamp: number): number => {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(timestamp)).map(part => [part.type, part.value]));
    return Date.parse(`${parts.year.padStart(4, '0')}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`);
  };
  const dayMs = 24 * 60 * 60 * 1000;
  const offsets = [-dayMs, 0, dayMs].map(delta => {
    const timestamp = wallTimestamp + delta;
    return wallTimeAt(timestamp) - timestamp;
  });
  const matches = [...new Set(offsets)].map(offset => wallTimestamp - offset)
    .filter(timestamp => wallTimeAt(timestamp) === wallTimestamp);
  // RFC 5545: use the first occurrence during a fall-back overlap; interpret
  // a nonexistent spring-forward time with the offset before the transition.
  return matches.length ? Math.min(...matches) : wallTimestamp - offsets[0];
}

function hashString(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function normalizeUidPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 180);
}

function getTaskEventIdentity(task: Task): string {
  if (task.repeatSeriesId && task.repeatInstanceDate) {
    return `${task.repeatSeriesId}-${task.repeatInstanceDate.replace(/-/g, '')}`;
  }
  return task.blockId || task.sourceBlockId || task.id;
}

function buildDescription(task: Task): string {
  const parts: string[] = [];
  const description = stripHtml(task.description || '');
  if (description) parts.push(description);
  if (task.tags?.length) parts.push(task.tags.map(tag => `#${tag}`).join(' '));
  const blockId = task.blockId || task.sourceBlockId;
  if (blockId) parts.push(`siyuan://blocks/${blockId}`);
  return parts.join('\n\n');
}

function appendTodoDates(task: Task, lines: string[], startDate: string, dueDate: string, timezone: string): void {
  const isOccurrence = !!(task.repeatSeriesId && task.repeatInstanceDate);
  const hasStart = !!task.startDate || isOccurrence;
  const hasDue = !!task.dueDate || isOccurrence;
  const hasTime = !!(task.startTime || task.dueTime);
  const start = hasTime
    ? formatUtcDateTime(zonedDateTimeTimestamp(startDate, task.startTime || '00:00', timezone))
    : formatIcsDate(startDate);
  const due = hasTime
    ? formatUtcDateTime(zonedDateTimeTimestamp(dueDate, task.dueTime || '23:59:59', timezone))
    : formatIcsDate(dueDate);
  const parameter = hasTime ? '' : ';VALUE=DATE';
  // DUE is the actual deadline, not VEVENT's exclusive end. RFC 5545 requires
  // DUE > DTSTART, so same-day all-day tasks carry only their deadline.
  if (hasStart && (!hasDue || start < due)) lines.push(`DTSTART${parameter}:${start}`);
  if (hasDue) lines.push(`DUE${parameter}:${due}`);
}

function appendTodoStatus(task: Task, lines: string[]): void {
  const status = task.status === 'completed' ? 'COMPLETED'
    : task.status === 'cancelled' ? 'CANCELLED'
    : task.status === 'in-progress' ? 'IN-PROCESS' : 'NEEDS-ACTION';
  lines.push(`STATUS:${status}`);
  lines.push(`PERCENT-COMPLETE:${status === 'COMPLETED' ? 100 : 0}`);
  lines.push(`PRIORITY:${({ high: 1, medium: 5, low: 9, none: 0 })[task.priority] || 0}`);
  if (status === 'COMPLETED') {
    const timestamp = Date.parse(task.completedAt || '') || Date.parse(task.updatedAt) || Date.now();
    lines.push(`COMPLETED:${formatUtcDateTime(timestamp)}`);
  }
}

export function taskToCalendarSyncEvent(
  task: Task,
  options: CalendarEventMappingOptions
): CalendarSyncEvent | null {
  const component = options.component || 'VEVENT';
  if (task.archived || component === 'VEVENT' && isClosedTaskStatus(task.status)) return null;
  if (task.repeatSeriesId && !task.isVirtual) return null;
  const dates = getCalendarTaskRenderDateValues(task);
  if (!dates) return null;
  const startDate = normalizeEventDate(dates.startDate);
  const dueDate = normalizeEventDate(dates.dueDate);
  const endDate = dueDate < startDate ? startDate : dueDate;

  const identity = normalizeUidPart(getTaskEventIdentity(task));
  if (!identity) return null;
  const uid = `pinch-${identity}@pinch.siyuan`;
  const timezone = options.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const defaultDuration = Math.max(5, Math.min(480, Math.round(options.defaultDurationMinutes || 30)));
  const title = stripHtml(task.title || '') || 'Untitled task';
  const description = buildDescription(task);
  const lines = [
    `BEGIN:${component}`,
    `UID:${uid}`,
    `DTSTAMP:${formatUtcDateTime(Date.parse(task.updatedAt) || Date.now())}`,
    `SUMMARY:${escapeIcsText(title)}`,
    'X-PINCH-MANAGED:TRUE',
    `X-PINCH-TASK-ID:${escapeIcsText(identity)}`
  ];

  const hasTime = !!(task.startTime || task.dueTime);
  if (component === 'VTODO') {
    appendTodoDates(task, lines, startDate, endDate, timezone);
    appendTodoStatus(task, lines);
  } else if (!hasTime) {
    lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(startDate)}`);
    lines.push(`DTEND;VALUE=DATE:${formatIcsDate(addDays(endDate, 1))}`);
  } else {
    const startTime = task.startTime || task.dueTime || '09:00';
    const startTimestamp = zonedDateTimeTimestamp(startDate, startTime, timezone);
    const endTime = task.dueTime || (endDate > startDate ? startTime : '');
    let endTimestamp = endTime ? zonedDateTimeTimestamp(endDate, endTime, timezone) : startTimestamp;
    if (endTimestamp <= startTimestamp) {
      endTimestamp = startTimestamp + defaultDuration * 60 * 1000;
    }
    // Standalone CalDAV resources and aggregate feeds must not reference a TZID
    // without a matching VTIMEZONE. UTC is self-contained on all providers.
    lines.push(`DTSTART:${formatUtcDateTime(startTimestamp)}`);
    lines.push(`DTEND:${formatUtcDateTime(endTimestamp)}`);
  }

  if (description) lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
  if (task.tags?.length) lines.push(`CATEGORIES:${task.tags.map(escapeIcsText).join(',')}`);

  const reminderTimestamp = isClosedTaskStatus(task.status) ? null : computeTaskReminderTimestamp(task);
  if (reminderTimestamp !== null) {
    lines.push('BEGIN:VALARM');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:${escapeIcsText(title)}`);
    lines.push(`TRIGGER;VALUE=DATE-TIME:${formatUtcDateTime(reminderTimestamp)}`);
    lines.push('END:VALARM');
  }

  const fingerprint = hashString([...lines, `END:${component}`].join('\r\n'));
  lines.push(`X-PINCH-FINGERPRINT:${fingerprint}`);
  lines.push(`END:${component}`);
  const eventIcs = `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pinch Habit//Calendar Sync 1.0//EN',
    'CALSCALE:GREGORIAN',
    eventIcs.trimEnd(),
    'END:VCALENDAR',
    ''
  ].join('\r\n');
  return {
    uid,
    // Resource filenames need not equal UIDs. Avoid percent-encoded '@' paths
    // on stricter providers, while keeping the event's existing stable UID.
    resourceName: `pinch-${identity}.ics`,
    blockId: task.blockId || task.sourceBlockId,
    fingerprint,
    eventIcs,
    ics
  };
}
