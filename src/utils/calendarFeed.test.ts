import { describe, expect, it } from 'vitest';
import type { CalendarSyncEvent } from '@/calendarSyncTypes';
import {
  buildCalendarFeed,
  generateCalendarFileToken,
  normalizeCalendarFileToken
} from '@/utils/calendarFeed';

function event(uid: string, summary: string): CalendarSyncEvent {
  return {
    uid,
    resourceName: `${uid}.ics`,
    fingerprint: uid,
    eventIcs: `BEGIN:VEVENT\r\nUID:${uid}\r\nSUMMARY:${summary}\r\nEND:VEVENT\r\n`,
    ics: ''
  };
}

describe('calendar feed helpers', () => {
  it('generates and validates a filename-safe high-entropy token', () => {
    const token = generateCalendarFileToken();
    expect(token).toMatch(/^[a-f0-9]{48}$/);
    expect(normalizeCalendarFileToken(token.toUpperCase())).toBe(token);
    expect(normalizeCalendarFileToken('short')).toBe('');
  });

  it('builds one aggregate VCALENDAR with sorted VEVENTs', () => {
    const feed = buildCalendarFeed([event('b', 'Second'), event('a', 'First')], '我的任务');
    expect(feed.match(/BEGIN:VCALENDAR/g)).toHaveLength(1);
    expect(feed.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(feed.indexOf('UID:a')).toBeLessThan(feed.indexOf('UID:b'));
    expect(feed).toContain('X-WR-CALNAME:我的任务');
    expect(feed.endsWith('\r\n')).toBe(true);
  });

});
