import { Buffer } from 'node:buffer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('kernel CalDAV bridge', () => {
  const fetchRequest = vi.fn();
  const handlers = new Map<string, (params: Record<string, unknown>) => Promise<any>>();

  beforeEach(async () => {
    vi.resetModules();
    fetchRequest.mockReset();
    handlers.clear();
    const host = {
      client: { fetch: fetchRequest },
      plugin: { lifecycle: {} as Record<string, () => Promise<void>> },
      rpc: {
        bind: vi.fn(async (name, handler) => { handlers.set(name, handler); }),
        unbind: vi.fn()
      }
    };
    vi.stubGlobal('siyuan', host);
    vi.stubGlobal('TextEncoder', undefined);
    vi.stubGlobal('btoa', undefined);
    await import('./kernel');
    await host.plugin.lifecycle.onload();
  });

  afterEach(() => { vi.unstubAllGlobals(); });

  it('sends UTF-8 credentials and ICS through the proxy without browser encoding globals', async () => {
    fetchRequest.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ code: 0, data: {
        status: 207, headers: { ETag: ['"test"'], 'Content-Type': 'application/xml' }, body: { content: '<d:multistatus/>' }
      } })
    });
    const credentials = { username: '测试用户', password: 'synthetic-🔑-\ud800' };
    const body = 'BEGIN:VCALENDAR\r\nSUMMARY:测试 📅\r\nEND:VCALENDAR\r\n';
    const result = await handlers.get('calendarDavRequest')!({
      ...credentials, url: 'https://calendar.example.test/tasks/', method: 'PUT',
      headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'If-None-Match': '*' }, body
    });
    expect(result).toMatchObject({ status: 207, headers: { etag: '"test"' }, body: '<d:multistatus/>' });
    const [url, init] = fetchRequest.mock.calls[0];
    const payload = JSON.parse(init.body);
    expect(url).toBe('/api/network/forwardProxy');
    expect(payload).toMatchObject({ method: 'PUT', contentType: 'text/calendar; charset=utf-8', payloadEncoding: 'base64' });
    expect(payload.headers).toContainEqual({ Authorization: `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')}` });
    expect(Buffer.from(payload.payload, 'base64').toString('utf8')).toBe(body);
  });

  it('returns the upstream 405 without retrying it through another transport', async () => {
    fetchRequest.mockResolvedValueOnce({ ok: true, json: async () => ({ code: 0, data: { status: 405, body: '' } }) });
    await expect(handlers.get('calendarDavRequest')!({ url: 'https://calendar.example.test/', method: 'REPORT' }))
      .resolves.toMatchObject({ status: 405 });
    expect(fetchRequest).toHaveBeenCalledTimes(1);
  });

  it('returns diagnostic failures as data instead of throwing through RPC', async () => {
    fetchRequest.mockRejectedValueOnce(new Error('proxy unavailable'));
    const result = await handlers.get('calendarDavRequest')!({ url: 'https://calendar.example.test/', method: 'REPORT' });
    expect(result.status).toBe(599);
    expect(JSON.parse(result.body).error).toBe('proxy unavailable');
    expect(fetchRequest).toHaveBeenCalledTimes(1);
  });

  it('rejects kernel direct transport without calling a path-only API with an external URL', async () => {
    const result = await handlers.get('calendarDavRequest')!({
      url: 'https://calendar.example.test/test.ics', method: 'PUT', transport: 'direct',
      username: 'synthetic-user', password: 'synthetic-password'
    });
    expect(result.status).toBe(599);
    expect(JSON.parse(result.body).error).toContain('rendering process');
    expect(fetchRequest).not.toHaveBeenCalled();
  });
});
