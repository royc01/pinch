import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CalendarComponent, CalendarSyncConfig } from '@/calendarSyncTypes';

const { calendarHttpRequest } = vi.hoisted(() => ({ calendarHttpRequest: vi.fn() }));
vi.mock('@/calendarHttpTransport', async importOriginal => ({
  ...await importOriginal<typeof import('@/calendarHttpTransport')>(), calendarHttpRequest
}));
import { discoverCalendarCollections, listManagedCalendarEvents, normalizeCalendarDavUrl, testCalendarDavConnection } from '@/calendarDavClient';

const target = 'https://calendar.example.test/tasks/';
const config: CalendarSyncConfig = { enabled: true, calendarUrl: target, username: 'user', password: 'password', futureDays: 180, defaultDurationMinutes: 30 };

function xml(body: string) {
  return { status: 207, statusText: 'Multi-Status', headers: {}, body: `<d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">${body}</d:multistatus>` };
}

function collection(name: string, components?: CalendarComponent[]) {
  return `<d:response><d:href>/${name}/</d:href><d:propstat><d:prop><d:resourcetype><c:calendar/></d:resourcetype><d:displayname>${name}</d:displayname>${components === undefined ? '' : `<c:supported-calendar-component-set>${components.map(component => `<c:comp name="${component}"/>`).join('')}</c:supported-calendar-component-set>`}</d:prop></d:propstat></d:response>`;
}

describe('CalDAV client', () => {
  beforeEach(() => { calendarHttpRequest.mockReset(); });
  it('normalizes a bare HTTPS host and preserves calendar paths', () => {
    expect(normalizeCalendarDavUrl('calendar.example.test/tasks')).toBe('https://calendar.example.test/tasks/');
    expect(normalizeCalendarDavUrl('https://calendar.example.test/tasks/')).toBe('https://calendar.example.test/tasks/');
  });

  it('rejects non HTTP(S) calendar addresses', () => {
    expect(() => normalizeCalendarDavUrl('file:///tmp/calendar')).toThrow('HTTP or HTTPS');
  });

  it.each(['VEVENT', 'VTODO'] as const)('discovers only collections supporting %s, accepting servers without capabilities', async component => {
    calendarHttpRequest.mockResolvedValueOnce(xml('<d:response><d:propstat><d:prop><c:calendar-home-set><d:href>/home/</d:href></c:calendar-home-set></d:prop></d:propstat></d:response>'))
      .mockResolvedValueOnce(xml([
        collection('events', ['VEVENT']), collection('tasks', ['VTODO']), collection('both', ['VEVENT', 'VTODO']),
        collection('legacy'), collection('empty', [])
      ].join('')));
    const calendars = await discoverCalendarCollections({ ...config, caldavComponent: component });
    expect(calendars.map(calendar => calendar.displayName)).toEqual([component === 'VTODO' ? 'tasks' : 'events', 'both', 'legacy']);
  });

  it('tests a VTODO-only collection directly', async () => {
    calendarHttpRequest.mockResolvedValueOnce(xml(collection('tasks', ['VTODO'])));
    await expect(testCalendarDavConnection({ ...config, caldavComponent: 'VTODO' })).resolves.toBe(target);
    expect(calendarHttpRequest).toHaveBeenCalledTimes(1);
  });

  it('reports the selected format when no compatible collection exists', async () => {
    calendarHttpRequest.mockResolvedValueOnce(xml('<d:response><d:propstat><d:prop><c:calendar-home-set><d:href>/home/</d:href></c:calendar-home-set></d:prop></d:propstat></d:response>'))
      .mockResolvedValueOnce(xml(collection('events', ['VEVENT'])));
    await expect(discoverCalendarCollections({ ...config, caldavComponent: 'VTODO' })).rejects.toThrow('supporting VTODO');
  });

  it('reads both managed formats for conversion and leaves other components and user tasks alone', async () => {
    const resource = (component: string, uid: string, managed: boolean) => `<d:response><d:href>/tasks/${uid}.ics</d:href><d:propstat><d:prop><d:getetag>"${uid}"</d:getetag><c:calendar-data>BEGIN:VCALENDAR\r\nBEGIN:${component}\r\nUID:${uid}\r\n${managed ? 'X-PINCH-MANAGED:TRUE\r\nX-PINCH-FINGERPRINT:original\r\n' : ''}END:${component}\r\nEND:VCALENDAR\r\n</c:calendar-data></d:prop></d:propstat></d:response>`;
    calendarHttpRequest.mockResolvedValueOnce(xml([
      resource('VEVENT', 'event', true), resource('VTODO', 'todo', true),
      resource('VTODO', 'personal', false), resource('VJOURNAL', 'journal', true)
    ].join('')));
    const result = await listManagedCalendarEvents({ ...config, caldavComponent: 'VTODO' });
    expect(result.events.map(event => event.uid)).toEqual(['event', 'todo']);
    expect(result.events[1]).toMatchObject({ href: `${target}todo.ics`, etag: '"todo"', fingerprint: 'original' });
    expect(calendarHttpRequest.mock.calls[0][0].body).toContain('<c:comp-filter name="VCALENDAR"/>');
  });

  it('retrieves missing VTODO data with multiget before deciding which resources are managed', async () => {
    calendarHttpRequest.mockResolvedValueOnce(xml('<d:response><d:href>/tasks/todo.ics</d:href><d:propstat><d:prop><d:getetag>"todo"</d:getetag></d:prop></d:propstat></d:response>'))
      .mockResolvedValueOnce(xml('<d:response><d:href>/tasks/todo.ics</d:href><d:propstat><d:prop><d:getetag>"todo"</d:getetag><c:calendar-data>BEGIN:VCALENDAR\r\nBEGIN:VTODO\r\nUID:todo\r\nX-PINCH-MANAGED:TRUE\r\nEND:VTODO\r\nEND:VCALENDAR\r\n</c:calendar-data></d:prop></d:propstat></d:response>'));
    const result = await listManagedCalendarEvents({ ...config, caldavComponent: 'VTODO' });
    expect(result.events).toEqual([{ uid: 'todo', href: `${target}todo.ics`, etag: '"todo"', fingerprint: undefined }]);
    expect(calendarHttpRequest.mock.calls[1][0].body).toContain('calendar-multiget');
  });
});
