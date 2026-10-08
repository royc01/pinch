import { Buffer } from 'node:buffer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { calendarBasicAuth, calendarHttpRequest } from './calendarHttpTransport';

describe('calendar renderer transport', () => {
  const network = vi.fn();
  const request = { url: 'https://calendar.example.test/tasks/', method: 'PUT', body: '测试 📅' };
  beforeEach(() => { network.mockReset(); vi.stubGlobal('fetch', network); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('encodes non-ASCII Basic credentials as UTF-8', () => {
    expect(calendarBasicAuth('用户', '🔑')).toBe(`Basic ${Buffer.from('用户:🔑').toString('base64')}`);
  });

  it('does not resend a rejected write through the proxy', async () => {
    network.mockResolvedValue({ status: 400, statusText: 'Bad Request', headers: new Headers(), text: async () => 'rejected' });
    await expect(calendarHttpRequest(request)).resolves.toMatchObject({ status: 400, body: 'rejected' });
    expect(network).toHaveBeenCalledTimes(1);
    expect(network.mock.calls[0][0]).toBe(request.url);
  });

  it('falls back on browser network failure using the SiYuan proxy envelope and UTF-8 body', async () => {
    network.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce({ ok: true, json: async () => ({
      code: 0, data: { status: 201, headers: { ETag: ['"v1"'] }, body: { content: '' } }
    }) });
    await expect(calendarHttpRequest({ ...request, headers: { Authorization: 'Basic synthetic', 'Content-Type': 'text/calendar' } }))
      .resolves.toMatchObject({ status: 201, headers: { etag: '"v1"' } });
    const [path, options] = network.mock.calls[1];
    expect(path).toBe('/api/network/forwardProxy');
    const payload = JSON.parse(options.body);
    expect(payload).toMatchObject({ url: request.url, method: 'PUT', contentType: 'text/calendar', payloadEncoding: 'base64' });
    expect(payload.headers).toEqual([{ Authorization: 'Basic synthetic' }]);
    expect(Buffer.from(payload.payload, 'base64').toString('utf8')).toBe(request.body);
  });

  it('keeps direct mode direct and avoids proxying a failed LAN connection in auto mode', async () => {
    network.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(calendarHttpRequest({ ...request, transport: 'direct' })).rejects.toThrow('Failed to fetch');
    await expect(calendarHttpRequest({ ...request, url: 'http://192.168.1.2/calendar/' })).rejects.toThrow('CORS');
    expect(network).toHaveBeenCalledTimes(2);
  });

  it('rejects embedded credentials before making a request', async () => {
    await expect(calendarHttpRequest({ ...request, url: 'https://user:secret@example.test/' })).rejects.toThrow('embedded credentials');
    expect(network).not.toHaveBeenCalled();
  });
});
