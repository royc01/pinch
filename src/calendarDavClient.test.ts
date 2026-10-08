import { describe, expect, it } from 'vitest';
import { normalizeCalendarDavUrl } from '@/calendarDavClient';

describe('CalDAV client', () => {
  it('normalizes a bare HTTPS host and preserves calendar paths', () => {
    expect(normalizeCalendarDavUrl('calendar.example.test/tasks')).toBe('https://calendar.example.test/tasks/');
    expect(normalizeCalendarDavUrl('https://calendar.example.test/tasks/')).toBe('https://calendar.example.test/tasks/');
  });

  it('rejects non HTTP(S) calendar addresses', () => {
    expect(() => normalizeCalendarDavUrl('file:///tmp/calendar')).toThrow('HTTP or HTTPS');
  });
});
