import type { CalDavResponse, CalendarTransport } from '@/calendarSyncTypes';

export interface CalendarHttpRequest {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
  transport?: CalendarTransport;
}

export function calendarBasicAuth(username: string, password: string): string {
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `Basic ${btoa(binary)}`;
}

function encodeBody(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function isPrivateCalendarEndpoint(value: string): boolean {
  const host = new URL(value).hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')
    || /^(?:127\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(host)
    || host === '::1' || /^(?:fc|fd|fe[89ab])/i.test(host) && host.includes(':');
}

async function directRequest(options: CalendarHttpRequest): Promise<CalDavResponse> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(options.url, {
      method: options.method, headers: options.headers,
      ...(options.body === undefined ? {} : { body: options.body }), signal: controller.signal
    });
    const headers: Record<string, string> = {};
    response.headers.forEach((value, name) => { headers[name.toLowerCase()] = value; });
    return { status: response.status, statusText: response.statusText, headers, body: await response.text() };
  } finally {
    window.clearTimeout(timer);
  }
}

async function proxyRequest(options: CalendarHttpRequest): Promise<CalDavResponse> {
  const headers = { ...options.headers };
  let contentType = 'application/octet-stream';
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === 'content-type') { contentType = headers[key]; delete headers[key]; }
  }
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 35000);
  try {
    const response = await fetch('/api/network/forwardProxy', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
      body: JSON.stringify({
        url: options.url, method: options.method, timeout: 30000, contentType,
        headers: Object.entries(headers).map(([name, value]) => ({ [name]: value })),
        payload: encodeBody(options.body || ''), payloadEncoding: 'base64', responseEncoding: 'text'
      })
    });
    if (!response.ok) throw new Error(`SiYuan proxy failed: HTTP ${response.status}`);
    const result = await response.json();
    if (result.code !== 0 || !result.data || !Number.isFinite(result.data.status)) {
      throw new Error(`SiYuan proxy failed${typeof result.msg === 'string' && result.msg ? `: ${result.msg}` : ''}`);
    }
    const responseHeaders: Record<string, string> = {};
    for (const [name, value] of Object.entries(result.data.headers || {})) {
      responseHeaders[name.toLowerCase()] = Array.isArray(value) ? value.join(', ') : String(value);
    }
    const body = typeof result.data.body === 'string' ? result.data.body : result.data.body?.content || '';
    return { status: result.data.status, statusText: result.data.statusText || '', headers: responseHeaders, body };
  } finally {
    window.clearTimeout(timer);
  }
}

/** Rendering-process fetch is the direct channel; kernel.client.fetch accepts
 * only SiYuan API paths. Like task-note-management, proxy external requests
 * through /api/network/forwardProxy when browser networking is unavailable. */
export async function calendarHttpRequest(options: CalendarHttpRequest): Promise<CalDavResponse> {
  const parsed = new URL(options.url);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error('Calendar request requires an HTTP(S) URL without embedded credentials');
  }
  if (options.transport === 'proxy') return proxyRequest(options);
  if (options.transport === 'direct') return directRequest(options);
  try {
    return await directRequest(options);
  } catch {
    if (isPrivateCalendarEndpoint(options.url)) {
      throw new Error('局域网服务直连失败；请检查服务的 CORS 配置并在桌面端重试');
    }
    return proxyRequest(options);
  }
}
