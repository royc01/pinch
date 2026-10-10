import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CalDavRequestParams, CalendarSyncEvent } from '@/calendarSyncTypes';
import type { Task } from '@/api';

const { calendarHttpRequest, getAllTasks, taskToCalendarSyncEvent, publishCloud, putFile } = vi.hoisted(() => ({
  calendarHttpRequest: vi.fn(), getAllTasks: vi.fn(), taskToCalendarSyncEvent: vi.fn(), publishCloud: vi.fn(), putFile: vi.fn()
}));
vi.mock('@/calendarHttpTransport', async importOriginal => ({ ...await importOriginal<typeof import('@/calendarHttpTransport')>(), calendarHttpRequest }));
vi.mock('@/api', () => ({ TaskRepository: { getAllTasks }, putFile, removeFile: vi.fn() }));
vi.mock('@/calendarCloudSync', () => ({ publishCalendarCloud: publishCloud }));
vi.mock('@/utils/calendarEventMapper', async importOriginal => ({
  ...await importOriginal<typeof import('@/utils/calendarEventMapper')>(), taskToCalendarSyncEvent
}));

import { createCalendarFeedIcs, exportCalendarIcs, publishCalendarCloudNow, startCalendarSync, stopCalendarSync, syncCalendarNow } from '@/calendarSync';
import { loadCalendarSyncConfig, loadCalendarSyncStatus, saveCalendarSyncConfig, saveCalendarSyncStatus } from '@/utils/calendarSyncSettings';

const root = 'https://calendar.example.test/';
const target = `${root}calendars/user/work/`;
const event: CalendarSyncEvent = {
  uid: 'pinch-test@pinch.siyuan', resourceName: 'pinch-test.ics', fingerprint: 'test-fingerprint',
  eventIcs: 'BEGIN:VEVENT\r\nUID:pinch-test@pinch.siyuan\r\nEND:VEVENT\r\n', ics: 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:pinch-test@pinch.siyuan\r\nX-PINCH-MANAGED:TRUE\r\nX-PINCH-FINGERPRINT:test-fingerprint\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n'
};

function xml(body: string) {
  return { status: 207, statusText: 'Multi-Status', headers: {}, body: `<d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">${body}</d:multistatus>` };
}

describe('CalDAV sync discovery and persistence', () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value); }
    });
    calendarHttpRequest.mockReset();
    publishCloud.mockReset();
    putFile.mockReset();
    getAllTasks.mockResolvedValue([{ id: 'test-task' }]);
    taskToCalendarSyncEvent.mockReturnValue(event);
    saveCalendarSyncConfig({
      enabled: true, calendarUrl: root, username: 'synthetic-user', password: 'synthetic-password',
      futureDays: 180, defaultDurationMinutes: 30
    });
  });
  afterEach(() => { stopCalendarSync(); vi.useRealTimers(); vi.unstubAllGlobals(); });

  function enableCloud() {
    const config = loadCalendarSyncConfig();
    return saveCalendarSyncConfig({ ...config, enabled: false, cloud: { ...config.cloud!, enabled: true } });
  }

  it('downloads an ICS file with every sync channel disabled and makes no publication requests', async () => {
    saveCalendarSyncConfig({ ...loadCalendarSyncConfig(), enabled: false });
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:calendar-export');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = revokeObjectURL;
    });
    let downloadedLink!: HTMLAnchorElement;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloadedLink = this;
    });
    try {
      await expect(exportCalendarIcs()).resolves.toBe(1);
      expect(downloadedLink.download).toBe('pinch-tasks.ics');
      expect(downloadedLink.href).toBe('blob:calendar-export');
      const blob = createObjectURL.mock.calls[0][0] as Blob;
      expect(blob.type).toBe('text/calendar;charset=utf-8');
      const contents = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsText(blob);
      });
      expect(contents).toContain('BEGIN:VCALENDAR\r\n');
      expect(contents).toContain('UID:pinch-test@pinch.siyuan');
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:calendar-export');
      expect(calendarHttpRequest).not.toHaveBeenCalled();
      expect(publishCloud).not.toHaveBeenCalled();
      expect(putFile).not.toHaveBeenCalled();
    } finally {
      click.mockRestore();
    }
  });

  it('syncs a cloud-only configuration and retains the previous URL after an upload failure', async () => {
    enableCloud();
    publishCloud.mockResolvedValueOnce({ url: 'https://cloud.example.test/tasks.ics' }).mockRejectedValueOnce(new Error('upload failed'));
    await expect(syncCalendarNow()).resolves.toMatchObject({ state: 'success', cloudEventCount: 1, cloudUrl: 'https://cloud.example.test/tasks.ics' });
    expect(publishCloud.mock.calls[0][1]).toContain('UID:pinch-test@pinch.siyuan');
    await expect(syncCalendarNow()).resolves.toMatchObject({ state: 'error', cloudUrl: 'https://cloud.example.test/tasks.ics', cloudError: 'upload failed' });
    expect(calendarHttpRequest).not.toHaveBeenCalled();
  });

  it('allows cloud publication when CalDAV fails', async () => {
    const config = enableCloud();
    saveCalendarSyncConfig({ ...config, enabled: true });
    calendarHttpRequest.mockResolvedValue({ status: 401, body: '' });
    publishCloud.mockResolvedValue({ url: 'https://cloud.example.test/tasks.ics' });
    await expect(syncCalendarNow()).resolves.toMatchObject({ state: 'error', cloudEventCount: 1,
      cloudUrl: 'https://cloud.example.test/tasks.ics', message: expect.stringContaining('CalDAV') });
    expect(putFile).not.toHaveBeenCalled();
  });

  it('retries only the deferred cloud channel after cooling down, using the latest task contents', async () => {
    vi.useFakeTimers();
    const config = enableCloud();
    saveCalendarSyncConfig({ ...config, enabled: true });
    calendarHttpRequest.mockResolvedValue({ status: 401, body: '' });
    const retryAt = new Date(Date.now() + 65_000).toISOString();
    publishCloud.mockRejectedValueOnce(Object.assign(new Error('cloud cooldown'), { retryAt }))
      .mockResolvedValue({ url: 'https://cloud.example.test/tasks.ics' });
    await expect(syncCalendarNow()).resolves.toMatchObject({ state: 'error', cloudRetryAt: retryAt });
    startCalendarSync();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(publishCloud).toHaveBeenCalledTimes(1);
    taskToCalendarSyncEvent.mockReturnValue({ ...event, eventIcs: event.eventIcs.replace('END:VEVENT', 'SUMMARY:Latest task version\r\nEND:VEVENT') });
    await vi.advanceTimersByTimeAsync(30_000);
    expect(publishCloud).toHaveBeenCalledTimes(2);
    expect(publishCloud.mock.calls[1][1]).toContain('SUMMARY:Latest task version');
    expect(calendarHttpRequest).toHaveBeenCalledTimes(1);
    expect(putFile).not.toHaveBeenCalled();
    expect(loadCalendarSyncStatus()).toMatchObject({ state: 'error', cloudUrl: 'https://cloud.example.test/tasks.ics', message: expect.stringContaining('CalDAV') });
    expect(loadCalendarSyncStatus().cloudError).toBeUndefined();
    expect(loadCalendarSyncStatus().cloudRetryAt).toBeUndefined();
    expect(loadCalendarSyncStatus().message).not.toContain('ICS cloud');
  });

  it('does not restore an old cloud URL if the destination changes while uploading', async () => {
    enableCloud();
    publishCloud.mockImplementation(async () => {
      const config = loadCalendarSyncConfig();
      saveCalendarSyncConfig({ ...config, cloud: { ...config.cloud!, fileName: 'changed.ics' } });
      return { url: 'https://cloud.example.test/old.ics' };
    });
    await expect(publishCalendarCloudNow()).rejects.toThrow('settings changed');
    expect(loadCalendarSyncStatus().cloudUrl).toBeUndefined();
  });

  it('records manual cloud errors without inventing a successful URL', async () => {
    enableCloud();
    publishCloud.mockRejectedValue(new Error('permission denied'));
    await expect(publishCalendarCloudNow()).rejects.toThrow('permission denied');
    expect(loadCalendarSyncStatus()).toMatchObject({ cloudError: 'permission denied' });
    expect(loadCalendarSyncStatus().cloudUrl).toBeUndefined();
  });

  it('does not start automatic uploads in manual mode', async () => {
    vi.useFakeTimers();
    const config = enableCloud();
    saveCalendarSyncConfig({ ...config, syncInterval: 'manual' });
    saveCalendarSyncStatus({ ...loadCalendarSyncStatus(), cloudRetryAt: new Date(Date.now() + 60_000).toISOString() });
    startCalendarSync();
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(publishCloud).not.toHaveBeenCalled();
  });

  it('waits for the configured interval rather than uploading every poll', async () => {
    vi.useFakeTimers();
    enableCloud();
    publishCloud.mockResolvedValue({ url: 'https://cloud.example.test/tasks.ics' });
    startCalendarSync();
    await vi.advanceTimersByTimeAsync(0);
    expect(publishCloud).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(14 * 60 * 1000);
    expect(publishCloud).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60 * 1000);
    expect(publishCloud).toHaveBeenCalledTimes(2);
  });

  it('acquires the shared window lock before syncing and rechecks scheduled attempts', async () => {
    vi.useFakeTimers();
    enableCloud();
    publishCloud.mockResolvedValue({ url: 'https://cloud.example.test/tasks.ics' });
    const lockRequest = vi.fn(async (_name, _options, callback) => callback({ name: 'pinch-calendar-sync' }));
    vi.stubGlobal('navigator', { locks: { request: lockRequest } });
    await syncCalendarNow();
    expect(lockRequest).toHaveBeenCalledWith('pinch-calendar-sync', { ifAvailable: false }, expect.any(Function));
    startCalendarSync();
    await vi.advanceTimersByTimeAsync(30 * 1000);
    expect(publishCloud).toHaveBeenCalledTimes(1);
  });

  function mockServer(calendars = ['work'], omitDiscoveryProperties = false) {
    let written = false;
    calendarHttpRequest.mockImplementation(async (params: CalDavRequestParams) => {
      if (params.method === 'REPORT' && params.url === root) return { status: 405, statusText: 'Method Not Allowed', body: '' };
      if (params.method === 'PROPFIND' && params.url === root) return xml(omitDiscoveryProperties
        ? '<d:response><d:href>/calendars/user/</d:href><d:propstat><d:prop><d:current-user-principal/></d:prop><d:status>HTTP/1.1 404 Not Found</d:status></d:propstat></d:response>'
        : '<d:response><d:propstat><d:prop><d:current-user-principal><d:href>/principals/user/</d:href></d:current-user-principal></d:prop></d:propstat></d:response>');
      if (params.method === 'PROPFIND' && params.url === `${root}principals/user/`) return xml('<d:response><d:propstat><d:prop><c:calendar-home-set><d:href>/calendars/user/</d:href></c:calendar-home-set></d:prop></d:propstat></d:response>');
      if (params.method === 'PROPFIND' && params.url === `${root}calendars/user/`) {
        if (omitDiscoveryProperties && params.headers?.Depth === '0') return xml('<d:response><d:href>/calendars/user/</d:href><d:propstat><d:prop><c:calendar-home-set/></d:prop><d:status>HTTP/1.1 404 Not Found</d:status></d:propstat></d:response>');
        return xml(calendars.map(name => `<d:response><d:href>/calendars/user/${name}/</d:href><d:propstat><d:prop><d:resourcetype><c:calendar/></d:resourcetype><d:displayname>${name}</d:displayname></d:prop></d:propstat></d:response>`).join(''));
      }
      if (params.method === 'REPORT' && params.url === target) return xml(written ? `<d:response><d:href>/calendars/user/work/pinch-test.ics</d:href><d:propstat><d:prop><d:getetag>"test"</d:getetag><c:calendar-data>${event.ics}</c:calendar-data></d:prop></d:propstat></d:response>` : '');
      if (params.method === 'PUT' && params.url === `${target}${event.resourceName}`) {
        written = true;
        return { status: 201, headers: {}, body: '' };
      }
      throw new Error(`Unexpected mock request: ${params.method} ${params.url}`);
    });
  }

  it('discovers after 405, writes to the collection and reuses it on the next sync', async () => {
    mockServer();
    await expect(syncCalendarNow()).resolves.toMatchObject({ state: 'success', created: 1 });
    expect(loadCalendarSyncConfig().calendarUrl).toBe(target);
    expect(calendarHttpRequest).toHaveBeenCalledWith(expect.objectContaining({ method: 'PUT', url: `${target}${event.resourceName}`, body: event.ics }));
    calendarHttpRequest.mockClear();
    await expect(syncCalendarNow()).resolves.toMatchObject({ state: 'success', unchanged: 1, created: 0 });
    expect(calendarHttpRequest).toHaveBeenCalledTimes(1);
    expect(calendarHttpRequest).toHaveBeenCalledWith(expect.objectContaining({ method: 'REPORT', url: target }));
  });

  it('requires a choice when a server root exposes multiple calendars', async () => {
    mockServer(['work', 'personal']);
    await expect(syncCalendarNow()).resolves.toMatchObject({ state: 'error', message: expect.stringContaining('Multiple CalDAV calendars') });
    expect(loadCalendarSyncConfig().calendarUrl).toBe(root);
    expect(calendarHttpRequest.mock.calls.some(([params]) => params.method === 'PUT')).toBe(false);
  });

  it('writes and persists the calendar even when neither discovery property is supported', async () => {
    mockServer(['work'], true);
    await expect(syncCalendarNow()).resolves.toMatchObject({ state: 'success', created: 1 });
    expect(loadCalendarSyncConfig().calendarUrl).toBe(target);
    expect(calendarHttpRequest).toHaveBeenCalledWith(expect.objectContaining({
      method: 'PUT', url: `${target}${event.resourceName}`
    }));
  });

  it('does not overwrite an account changed during discovery or write to its old calendar', async () => {
    mockServer();
    const server = calendarHttpRequest.getMockImplementation()!;
    calendarHttpRequest.mockImplementation(async (...args) => {
      const result = await server(...args);
      if (args[0].method === 'REPORT' && args[0].url === target) {
        saveCalendarSyncConfig({ ...loadCalendarSyncConfig(), calendarUrl: `${root}other/`, username: 'other-user' });
      }
      return result;
    });
    await expect(syncCalendarNow()).resolves.toMatchObject({ state: 'error', message: expect.stringContaining('settings changed') });
    expect(loadCalendarSyncConfig().calendarUrl).toBe(`${root}other/`);
    expect(calendarHttpRequest.mock.calls.some(([params]) => params.method === 'PUT')).toBe(false);
  });

  it('converts an existing resource in both directions without creating a duplicate and then skips unchanged tasks', async () => {
    const mapper = await vi.importActual<typeof import('@/utils/calendarEventMapper')>('@/utils/calendarEventMapper');
    taskToCalendarSyncEvent.mockImplementation(mapper.taskToCalendarSyncEvent);
    getAllTasks.mockResolvedValue([{ id: 'test', type: 'standalone', title: 'Task', status: 'pending', priority: 'medium', tags: [],
      dueDate: '2026-10-04', createdAt: '2026-10-01T08:00:00Z', updatedAt: '2026-10-02T08:00:00Z' } satisfies Task]);
    saveCalendarSyncConfig({ ...loadCalendarSyncConfig(), calendarUrl: target, caldavComponent: 'VTODO' });
    let remoteIcs = event.ics;
    calendarHttpRequest.mockImplementation(async (params: CalDavRequestParams) => {
      if (params.method === 'REPORT') return xml(`<d:response><d:href>/calendars/user/work/pinch-test.ics</d:href><d:propstat><d:prop><d:getetag>"test"</d:getetag><c:calendar-data>${remoteIcs}</c:calendar-data></d:prop></d:propstat></d:response>`);
      if (params.method === 'PUT') { remoteIcs = params.body!; return { status: 204, headers: {}, body: '' }; }
      throw new Error(`Unexpected request: ${params.method}`);
    });
    await expect(syncCalendarNow()).resolves.toMatchObject({ state: 'success', updated: 1, created: 0 });
    expect(remoteIcs).toContain('BEGIN:VTODO\r\n');
    expect(remoteIcs).toContain('DUE;VALUE=DATE:20261004\r\n');
    expect(calendarHttpRequest).toHaveBeenCalledWith(expect.objectContaining({ method: 'PUT', url: `${target}pinch-test.ics`, headers: expect.objectContaining({ 'If-Match': '"test"' }) }));
    calendarHttpRequest.mockClear();
    await expect(syncCalendarNow()).resolves.toMatchObject({ state: 'success', unchanged: 1, updated: 0, created: 0 });
    expect(calendarHttpRequest).toHaveBeenCalledTimes(1);
    saveCalendarSyncConfig({ ...loadCalendarSyncConfig(), caldavComponent: 'VEVENT' });
    await expect(syncCalendarNow()).resolves.toMatchObject({ state: 'success', updated: 1, created: 0 });
    expect(remoteIcs).toContain('BEGIN:VEVENT\r\n');
  });

  it('syncs completion state as VTODO while publishing and exporting only unfinished calendar events', async () => {
    const mapper = await vi.importActual<typeof import('@/utils/calendarEventMapper')>('@/utils/calendarEventMapper');
    taskToCalendarSyncEvent.mockImplementation(mapper.taskToCalendarSyncEvent);
    const pending: Task = { id: 'pending', type: 'standalone', title: 'Pending task', status: 'pending', priority: 'high', tags: [],
      dueDate: '2026-10-04', createdAt: '2026-10-01T08:00:00Z', updatedAt: '2026-10-02T08:00:00Z' };
    getAllTasks.mockResolvedValue([pending, { ...pending, id: 'completed', status: 'completed', completedAt: '2026-10-04T08:00:00Z' }]);
    const config = enableCloud();
    saveCalendarSyncConfig({ ...config, enabled: true, calendarUrl: target, caldavComponent: 'VTODO' });
    calendarHttpRequest.mockImplementation(async (params: CalDavRequestParams) => params.method === 'REPORT'
      ? xml('') : { status: 201, headers: {}, body: '' });
    publishCloud.mockResolvedValue({ url: 'https://cloud.example.test/tasks.ics' });
    await expect(syncCalendarNow()).resolves.toMatchObject({ state: 'success', created: 2, cloudEventCount: 1 });
    const writes = calendarHttpRequest.mock.calls.map(([params]) => params).filter(params => params.method === 'PUT');
    expect(writes).toHaveLength(2);
    expect(writes.every(params => params.body.includes('BEGIN:VTODO'))).toBe(true);
    expect(writes.find(params => params.body.includes('STATUS:COMPLETED'))?.body).toContain('PERCENT-COMPLETE:100');
    const feed = publishCloud.mock.calls[0][1];
    expect(feed).toContain('BEGIN:VEVENT');
    expect(feed).not.toContain('BEGIN:VTODO');
    expect(feed).not.toContain('pinch-completed@');
    const exported = await createCalendarFeedIcs();
    expect(exported.eventCount).toBe(1);
    expect(exported.ics).toBe(feed);
  });

  it('stops before writing if the component format changes while querying the calendar', async () => {
    saveCalendarSyncConfig({ ...loadCalendarSyncConfig(), calendarUrl: target });
    calendarHttpRequest.mockImplementation(async () => {
      saveCalendarSyncConfig({ ...loadCalendarSyncConfig(), caldavComponent: 'VTODO' });
      return xml('');
    });
    await expect(syncCalendarNow()).resolves.toMatchObject({ state: 'error', message: expect.stringContaining('settings changed') });
    expect(calendarHttpRequest).toHaveBeenCalledTimes(1);
    expect(loadCalendarSyncConfig().caldavComponent).toBe('VTODO');
  });
});
