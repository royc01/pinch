import { describe, expect, it } from 'vitest';
import type { Task } from '@/api';
import { foldIcsLine, taskToCalendarSyncEvent } from '@/utils/calendarEventMapper';

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    blockId: '20261004-task-block',
    type: 'task',
    title: 'Prepare release',
    status: 'pending',
    priority: 'none',
    tags: [],
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-02T08:00:00.000Z',
    ...overrides
  } as Task;
}

describe('taskToCalendarSyncEvent', () => {
  it('maps an inclusive date range to an all-day VEVENT with an exclusive DTEND', () => {
    const event = taskToCalendarSyncEvent(task({
      startDate: '2026-10-04',
      dueDate: '2026-10-06',
      description: 'Release notes',
      tags: ['work', 'release']
    }), { defaultDurationMinutes: 30, timezone: 'Asia/Shanghai' });

    expect(event?.uid).toBe('pinch-20261004-task-block@pinch.siyuan');
    expect(event?.resourceName).toBe('pinch-20261004-task-block.ics');
    expect(event?.ics).toContain('DTSTART;VALUE=DATE:20261004\r\n');
    expect(event?.ics).toContain('DTEND;VALUE=DATE:20261007\r\n');
    expect(event?.ics).toContain('X-PINCH-MANAGED:TRUE');
    expect(event?.ics).toContain('CATEGORIES:work,release');
    expect(event?.ics.replace(/\r\n[ \t]/g, '')).toContain('siyuan://blocks/20261004-task-block');
    expect(event?.ics).toContain(`X-PINCH-FINGERPRINT:${event?.fingerprint}`);
  });

  it('uses the configured duration for a task with only one time', () => {
    const event = taskToCalendarSyncEvent(task({
      dueDate: '2026-10-04',
      dueTime: '09:30'
    }), { defaultDurationMinutes: 45, timezone: 'Asia/Shanghai' });

    expect(event?.ics).toContain('DTSTART:20261004T013000Z');
    expect(event?.ics).toContain('DTEND:20261004T021500Z');
    expect(event?.ics).not.toContain('TZID');
  });

  it('keeps a multi-day timed range when only the start time is present', () => {
    const event = taskToCalendarSyncEvent(task({
      startDate: '2026-10-04',
      startTime: '09:30',
      dueDate: '2026-10-06'
    }), { defaultDurationMinutes: 45, timezone: 'Asia/Shanghai' });

    expect(event?.ics).toContain('DTSTART:20261004T013000Z');
    expect(event?.ics).toContain('DTEND:20261006T013000Z');
  });

  it('exports the existing reminder as an absolute display alarm', () => {
    const event = taskToCalendarSyncEvent(task({
      dueDate: '2026-10-04',
      dueTime: '09:30',
      reminderType: '30m'
    }), { defaultDurationMinutes: 30, timezone: 'Asia/Shanghai' });

    expect(event?.ics).toContain('BEGIN:VALARM');
    expect(event?.ics).toMatch(/TRIGGER;VALUE=DATE-TIME:\d{8}T\d{6}Z/);
  });

  it('uses the repeat series and occurrence date as the stable instance identity', () => {
    const virtual = taskToCalendarSyncEvent(task({
      blockId: undefined,
      sourceBlockId: 'template-block',
      repeatSeriesId: 'series-1',
      repeatInstanceDate: '2026-10-08',
      isVirtual: true,
      startDate: '2026-10-08',
      dueDate: '2026-10-08'
    }), { defaultDurationMinutes: 30 });
    const template = taskToCalendarSyncEvent(task({
      repeatSeriesId: 'series-1',
      repeatFrequency: 'weekly',
      startDate: '2026-10-01'
    }), { defaultDurationMinutes: 30 });

    expect(virtual?.uid).toBe('pinch-series-1-20261008@pinch.siyuan');
    expect(template).toBeNull();
  });

  it('does not export closed, archived, or undated tasks', () => {
    expect(taskToCalendarSyncEvent(task({ status: 'completed', dueDate: '2026-10-04' }), { defaultDurationMinutes: 30 })).toBeNull();
    expect(taskToCalendarSyncEvent(task({ archived: true, dueDate: '2026-10-04' }), { defaultDurationMinutes: 30 })).toBeNull();
    expect(taskToCalendarSyncEvent(task(), { defaultDurationMinutes: 30 })).toBeNull();
  });

  it.each([
    ['Asia/Shanghai', '2026-10-04', '00:15', '20261003T161500Z', '20261003T170000Z'],
    ['Asia/Shanghai', '2026-10-04', '23:50:30', '20261004T155030Z', '20261004T163530Z'],
    ['America/New_York', '2026-01-04', '09:30', '20260104T143000Z', '20260104T151500Z'],
    ['America/New_York', '2026-07-04', '09:30', '20260704T133000Z', '20260704T141500Z'],
    ['America/New_York', '2026-03-08', '01:45', '20260308T064500Z', '20260308T073000Z'],
    ['America/New_York', '2026-03-08', '02:30', '20260308T073000Z', '20260308T081500Z'],
    ['America/New_York', '2026-11-01', '01:30', '20261101T053000Z', '20261101T061500Z'],
    ['Asia/Kathmandu', '2026-10-04', '09:30', '20261004T034500Z', '20261004T043000Z']
  ])('preserves the instant and duration in %s on %s at %s', (timezone, dueDate, dueTime, start, end) => {
    const event = taskToCalendarSyncEvent(task({ dueDate, dueTime }), { timezone, defaultDurationMinutes: 45 });
    expect(event?.ics).toContain(`DTSTART:${start}\r\n`);
    expect(event?.ics).toContain(`DTEND:${end}\r\n`);
    expect(event?.ics).not.toContain('TZID');
  });

  it('makes a reversed all-day range valid without creating a negative duration', () => {
    const event = taskToCalendarSyncEvent(task({ startDate: '2026-10-04', dueDate: '2026-10-03' }), { defaultDurationMinutes: 30 });
    expect(event?.ics).toContain('DTSTART;VALUE=DATE:20261004\r\n');
    expect(event?.ics).toContain('DTEND;VALUE=DATE:20261005\r\n');
  });

  it('fails locally on invalid dates or times instead of uploading malformed ICS', () => {
    expect(() => taskToCalendarSyncEvent(task({ dueDate: '2026-02-30' }), { defaultDurationMinutes: 30 })).toThrow('Invalid calendar task date');
    expect(() => taskToCalendarSyncEvent(task({ dueDate: '2026-10-04', dueTime: '25:00' }), { defaultDurationMinutes: 30 })).toThrow('Invalid calendar task time');
  });

  it('escapes lone carriage returns and removes forbidden control characters from text', () => {
    const event = taskToCalendarSyncEvent(task({ dueDate: '2026-10-04', tags: ['first\rsecond\u0001'] }), { defaultDurationMinutes: 30 });
    expect(event?.ics).toContain('CATEGORIES:first\\nsecond\r\n');
    expect(event?.ics).not.toContain('\u0001');
    expect(event?.ics.replace(/\r\n/g, '')).not.toContain('\r');
  });
});

describe('foldIcsLine', () => {
  it('folds UTF-8 content into physical lines of at most 75 octets', () => {
    const folded = foldIcsLine(`SUMMARY:${'日历同步'.repeat(20)}`);
    const lengths = folded.split('\r\n').map(line => new TextEncoder().encode(line).length);

    expect(lengths.length).toBeGreaterThan(1);
    expect(Math.max(...lengths)).toBeLessThanOrEqual(75);
    expect(folded.split('\r\n').slice(1).every(line => line.startsWith(' '))).toBe(true);
  });
});
