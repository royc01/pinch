import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import type { CalendarCloudConfig } from './calendarSyncTypes';
const mocks = vi.hoisted(() => ({ http: vi.fn(), putFile: vi.fn(), ensureDataDir: vi.fn() }));
vi.mock('@/calendarHttpTransport', async importOriginal => ({
  ...await importOriginal<typeof import('@/calendarHttpTransport')>(), calendarHttpRequest: mocks.http
}));
vi.mock('@/api', () => ({ putFile: mocks.putFile }));
vi.mock('@/utils', () => ({ ensureDataDir: mocks.ensureDataDir }));
import { DEFAULT_CALENDAR_CLOUD_CONFIG } from './utils/calendarSyncSettings';
import { publishCalendarCloud, testCalendarCloudConnection } from './calendarCloudSync';

const ics = 'BEGIN:VCALENDAR\r\nSUMMARY:测试 📅\r\nEND:VCALENDAR\r\n';
const webdav: CalendarCloudConfig = { ...DEFAULT_CALENDAR_CLOUD_CONFIG, enabled: true, method: 'webdav',
  fileName: 'pinch-test.ics', webdavUrl: 'dav.example.test/tasks/pinch', webdavUsername: 'synthetic-user', webdavPassword: 'synthetic-pass' };
const s3: CalendarCloudConfig = { ...webdav, method: 's3', s3Bucket: 'calendar-bucket', s3Endpoint: 'https://s3.example.test',
  s3AccessKeyId: 'synthetic-access', s3AccessKeySecret: 'synthetic-secret', s3ForcePathStyle: true, s3StoragePath: 'calendars/测试' };

describe('calendar cloud publication', () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.http.mockReset(); mocks.putFile.mockResolvedValue(undefined);
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => { storage.set(key, value); } });
    vi.stubGlobal('crypto', webcrypto);
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); delete (window as any).siyuan; });

  it('creates missing WebDAV directories on 409 and retries the same authenticated ICS PUT', async () => {
    mocks.http.mockResolvedValueOnce({ status: 409 }).mockResolvedValueOnce({ status: 405 })
      .mockResolvedValueOnce({ status: 201 }).mockResolvedValueOnce({ status: 204 });
    await expect(publishCalendarCloud(webdav, ics)).resolves.toEqual({ url: 'https://dav.example.test/tasks/pinch/pinch-test.ics' });
    expect(mocks.http.mock.calls.map(([request]) => [request.method, request.url])).toEqual([
      ['PUT', 'https://dav.example.test/tasks/pinch/pinch-test.ics'], ['MKCOL', 'https://dav.example.test/tasks/'],
      ['MKCOL', 'https://dav.example.test/tasks/pinch/'], ['PUT', 'https://dav.example.test/tasks/pinch/pinch-test.ics']
    ]);
    expect(mocks.http.mock.calls[3][0]).toMatchObject({ body: ics, headers: { Authorization: expect.stringMatching(/^Basic /) } });
  });

  it('recovers a 404 PUT by creating the missing WebDAV collection', async () => {
    mocks.http.mockResolvedValueOnce({ status: 404 })
      .mockResolvedValueOnce({ status: 405 })
      .mockResolvedValueOnce({ status: 201 })
      .mockResolvedValueOnce({ status: 201 });
    await expect(publishCalendarCloud(webdav, ics)).resolves.toEqual({ url: 'https://dav.example.test/tasks/pinch/pinch-test.ics' });
    expect(mocks.http.mock.calls.map(([request]) => request.method)).toEqual(['PUT', 'MKCOL', 'MKCOL', 'PUT']);
  });

  it('treats a Nutstore-style 403 MKCOL on an existing collection as success', async () => {
    const nutstore = { ...webdav, webdavUrl: 'https://dav.jianguoyun.com/dav/' };
    mocks.http.mockResolvedValueOnce({ status: 404 })
      .mockResolvedValueOnce({ status: 403 })
      .mockResolvedValueOnce({ status: 207, body: '' })
      .mockResolvedValueOnce({ status: 201 })
      .mockResolvedValueOnce({ status: 201 });
    await expect(publishCalendarCloud(nutstore, ics)).resolves.toEqual({ url: 'https://dav.jianguoyun.com/dav/ics/pinch-test.ics' });
    expect(mocks.http.mock.calls.map(([request]) => request.method)).toEqual(['PUT', 'MKCOL', 'PROPFIND', 'MKCOL', 'PUT']);
  });

  it('signs an S3 PUT without an empty-body checksum and returns the public URL', async () => {
    mocks.http.mockResolvedValue({ status: 200 });
    await expect(publishCalendarCloud(s3, ics)).resolves.toEqual({ url: 'https://s3.example.test/calendar-bucket/calendars/%E6%B5%8B%E8%AF%95/pinch-test.ics' });
    const request = mocks.http.mock.calls[0][0];
    const url = new URL(request.url);
    expect(url.pathname).toBe('/calendar-bucket/calendars/%E6%B5%8B%E8%AF%95/pinch-test.ics');
    expect(url.searchParams.get('X-Amz-Expires')).toBe('900');
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[a-f0-9]{64}$/);
    expect(url.searchParams.has('x-amz-checksum-crc32')).toBe(false);
    expect(request).toMatchObject({ method: 'PUT', body: ics, headers: { 'Content-Type': 'text/calendar' } });
  });

  it('reuses SiYuan S3 credentials and preserves the custom domain/prefix', async () => {
    (window as any).siyuan = { config: { sync: { s3: { bucket: 'host-bucket', endpoint: 'https://host-s3.example.test',
      region: 'test-region', accessKey: 'host-access', secretKey: 'host-secret', pathStyle: true } } } };
    mocks.http.mockResolvedValue({ status: 200 });
    const result = await publishCalendarCloud({ ...s3, s3UseSiyuanConfig: true, s3Bucket: '', s3CustomDomain: 'https://cdn.example.test/files/' }, ics);
    expect(result.url).toBe('https://cdn.example.test/files/calendars/%E6%B5%8B%E8%AF%95/pinch-test.ics');
    const url = new URL(mocks.http.mock.calls[0][0].url);
    expect(url.pathname).toContain('/host-bucket/');
    expect(url.searchParams.get('X-Amz-Credential')).toContain('host-access/');
  });

  it('returns an explicitly expiring seven-day signed subscription URL', async () => {
    mocks.http.mockResolvedValue({ status: 200 });
    const result = await publishCalendarCloud({ ...s3, s3UrlMode: 'signed' }, ics);
    expect(new URL(result.url).searchParams.get('X-Amz-Expires')).toBe('604800');
    expect(Date.parse(result.expiresAt!) - Date.now()).toBeGreaterThan(604790000);
  });

  it('uploads a SiYuan asset with the actual cloud API and does not report rejected uploads as success', async () => {
    vi.useFakeTimers();
    (window as any).siyuan = { user: { userId: 'synthetic-user-id' } };
    const network = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ code: 0, data: null }) });
    vi.stubGlobal('fetch', network);
    const config = { ...webdav, method: 'siyuan' as const };
    await expect(publishCalendarCloud(config, ics)).resolves.toMatchObject({ url: 'https://assets.b3logfile.com/siyuan/synthetic-user-id/assets/pinch-test.ics' });
    expect(mocks.putFile).toHaveBeenCalledWith('/data/assets/pinch-test.ics', false, expect.any(Blob));
    expect(network.mock.calls[0][0]).toBe('/api/asset/uploadCloudByAssetsPaths');
    expect(JSON.parse(network.mock.calls[0][1].body)).toEqual({ paths: ['assets/pinch-test.ics'], ignorePushMsg: true });
    network.mockResolvedValue({ ok: true, json: async () => ({ code: -1, msg: 'upload rejected' }) });
    await vi.advanceTimersByTimeAsync(65_000);
    await expect(publishCalendarCloud(config, `${ics}changed`)).rejects.toThrow('upload rejected');
  });

  it('reuses the last successful SiYuan upload for unchanged contents and preserves its publication time', async () => {
    vi.useFakeTimers();
    (window as any).siyuan = { user: { userId: 'synthetic-user-id' } };
    const network = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ code: 0, data: null }) });
    vi.stubGlobal('fetch', network);
    const config = { ...webdav, method: 'siyuan' as const };
    const first = await publishCalendarCloud(config, ics);
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(publishCalendarCloud(config, ics)).resolves.toEqual(first);
    expect(network).toHaveBeenCalledTimes(1);
    expect(mocks.putFile).toHaveBeenCalledTimes(1);
    // Read the shared cache in a fresh module, as another window/reload would.
    vi.resetModules();
    const fresh = await import('./calendarCloudSync');
    await expect(fresh.publishCalendarCloud(config, ics)).resolves.toEqual(first);
    expect(network).toHaveBeenCalledTimes(1);
  });

  it('throttles changed SiYuan calendars across filenames and publishes the latest content after cooling down', async () => {
    vi.useFakeTimers();
    (window as any).siyuan = { user: { userId: 'synthetic-user-id' } };
    const network = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ code: 0, data: null }) });
    vi.stubGlobal('fetch', network);
    const config = { ...webdav, method: 'siyuan' as const };
    await publishCalendarCloud(config, ics);
    await expect(publishCalendarCloud(config, `${ics}changed`)).rejects.toMatchObject({ retryAt: expect.any(String) });
    await expect(publishCalendarCloud({ ...config, fileName: 'second.ics' }, ics)).rejects.toThrow('冷却');
    expect(network).toHaveBeenCalledTimes(1);
    expect(mocks.putFile).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(65_000);
    await expect(publishCalendarCloud(config, `${ics}latest`)).resolves.toMatchObject({ url: expect.any(String) });
    expect(network).toHaveBeenCalledTimes(2);
    expect((mocks.putFile.mock.calls[1][2] as Blob).size).toBe(new Blob([`${ics}latest`]).size);
  });

  it('backs off on the actual asset-upload quota message without treating failure as a successful cache entry', async () => {
    vi.useFakeTimers();
    (window as any).siyuan = { user: { userId: 'synthetic-user-id' } };
    const network = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ code: -1, msg: '上传失败：Too many asset uploads. Please retry in one minute.' }) });
    vi.stubGlobal('fetch', network);
    const config = { ...webdav, method: 'siyuan' as const };
    await expect(publishCalendarCloud(config, ics)).rejects.toMatchObject({ retryAt: expect.any(String) });
    await expect(publishCalendarCloud(config, ics)).rejects.toThrow('冷却');
    expect(network).toHaveBeenCalledTimes(1);
    network.mockResolvedValue({ ok: true, json: async () => ({ code: 0, data: null }) });
    await vi.advanceTimersByTimeAsync(65_000);
    await expect(publishCalendarCloud(config, ics)).resolves.toMatchObject({ url: expect.any(String) });
    expect(network).toHaveBeenCalledTimes(2);
  });

  it('coalesces identical writes and serializes changed calendar contents', async () => {
    let complete!: (result: { status: number }) => void;
    mocks.http.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; })).mockResolvedValue({ status: 201 });
    const first = publishCalendarCloud(webdav, ics);
    expect(publishCalendarCloud(webdav, ics)).toBe(first);
    const second = publishCalendarCloud(webdav, `${ics}latest`);
    expect(mocks.http).toHaveBeenCalledTimes(1);
    complete({ status: 201 });
    await Promise.all([first, second]);
    expect(mocks.http).toHaveBeenCalledTimes(2);
    expect(mocks.http.mock.calls[1][0].body).toBe(`${ics}latest`);
  });

  it('keeps connection checks read-only and redacts credentials and signed URLs', async () => {
    mocks.http.mockRejectedValue(new Error('synthetic-secret https://s3.example.test/?X-Amz-Signature=sensitive'));
    await expect(testCalendarCloudConnection(s3)).rejects.toThrow('[redacted] [service URL]');
    expect(mocks.http.mock.calls[0][0].method).toBe('HEAD');
    mocks.http.mockResolvedValue({ status: 207 });
    await testCalendarCloudConnection(webdav);
    expect(mocks.http.mock.calls[1][0].method).toBe('PROPFIND');
    expect(mocks.putFile).not.toHaveBeenCalled();
  });

  it('rejects path traversal before writing', async () => {
    await expect(publishCalendarCloud({ ...webdav, fileName: '../private.ics' }, ics)).rejects.toThrow('ICS');
    await expect(publishCalendarCloud({ ...s3, s3StoragePath: '../private' }, ics)).rejects.toThrow('S3');
    expect(mocks.http).not.toHaveBeenCalled();
  });
});
