import type { CalendarSyncConfig, CalendarSyncEvent } from '@/calendarSyncTypes';
import { calendarHttpRequest } from '@/calendarHttpTransport';
import { refreshCalendarProviderToken } from '@/calendarOAuth';
import { loadCalendarSyncConfig, saveCalendarSyncConfig } from '@/utils/calendarSyncSettings';

export interface ProviderSyncCounts {
  created: number;
  updated: number;
  deleted: number;
  unchanged: number;
}

interface ParsedEvent {
  uid: string;
  summary: string;
  description: string;
  start: string;
  end: string;
  allDay: boolean;
  reminderMinutes?: number;
}

interface ProviderEvent {
  uid: string;
  id: string;
  fingerprint?: string;
}

function unescapeIcs(value: string): string {
  return value.replace(/\\n/gi, '\n').replace(/\\([\\;,])/g, '$1');
}

function parseIcsDate(value: string, allDay: boolean): string {
  if (allDay) return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/.exec(value);
  if (!match) throw new Error(`Invalid ICS date: ${value}`);
  return new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}Z`).toISOString();
}

function parseCalendarEvent(event: CalendarSyncEvent): ParsedEvent {
  const lines = event.eventIcs.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  const find = (name: string) => lines.find(line => line.toUpperCase().startsWith(`${name.toUpperCase()}:`))?.slice(name.length + 1) || '';
  const findProperty = (name: string) => lines.find(line => line.toUpperCase().startsWith(`${name.toUpperCase()};`) || line.toUpperCase().startsWith(`${name.toUpperCase()}:`)) || '';
  const startLine = findProperty('DTSTART');
  const endLine = findProperty('DTEND');
  const startValue = startLine.split(':').slice(1).join(':');
  const endValue = endLine.split(':').slice(1).join(':') || startValue;
  const allDay = /VALUE=DATE/i.test(startLine);
  const start = parseIcsDate(startValue, allDay);
  const end = parseIcsDate(endValue, allDay);
  const trigger = findProperty('TRIGGER').split(':').slice(1).join(':');
  let reminderMinutes: number | undefined;
  if (trigger && /^\d{8}T\d{6}Z$/.test(trigger) && !allDay) {
    const triggerDate = parseIcsDate(trigger, false);
    reminderMinutes = Math.max(0, Math.round((Date.parse(start) - Date.parse(triggerDate)) / 60000));
  }
  return {
    uid: event.uid,
    summary: unescapeIcs(find('SUMMARY')) || 'Pinch task',
    description: unescapeIcs(find('DESCRIPTION')),
    start, end, allDay, reminderMinutes
  };
}

function eventId(uid: string): string {
  let hash = 2166136261;
  for (const character of uid) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return `pinch${(hash >>> 0).toString(16)}${Array.from(uid).slice(0, 12).map(character => character.charCodeAt(0).toString(16)).join('')}`.replace(/[^a-z0-9]/gi, '').slice(0, 100);
}

function assertToken(config: CalendarSyncConfig): string {
  if (!config.oauthAccessToken) throw new Error('请先完成 OAuth 授权');
  return config.oauthAccessToken;
}

async function request(config: CalendarSyncConfig, url: string, method: string, body?: unknown): Promise<any> {
  const response = await calendarHttpRequest({
    url, method, transport: config.transport,
    headers: { Authorization: `Bearer ${assertToken(config)}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (response.status === 401) throw Object.assign(new Error('日历 OAuth 令牌已过期，请重新授权'), { status: 401 });
  if (response.status < 200 || response.status >= 300) throw new Error(`Calendar API request failed: HTTP ${response.status}${response.body ? ` ${response.body.slice(0, 240)}` : ''}`);
  return response.body ? JSON.parse(response.body) : {};
}

function googleBody(parsed: ParsedEvent): Record<string, unknown> {
  const body: Record<string, unknown> = {
    id: eventId(parsed.uid), summary: parsed.summary, description: parsed.description,
    extendedProperties: { private: { pinchManaged: 'true', pinchUid: parsed.uid } },
    reminders: parsed.reminderMinutes === undefined ? { useDefault: false, overrides: [] } : { useDefault: false, overrides: [{ method: 'popup', minutes: parsed.reminderMinutes }] }
  };
  if (parsed.allDay) {
    body.start = { date: parsed.start };
    body.end = { date: parsed.end };
  } else {
    body.start = { dateTime: parsed.start, timeZone: 'UTC' };
    body.end = { dateTime: parsed.end, timeZone: 'UTC' };
  }
  return body;
}

function microsoftBody(parsed: ParsedEvent): Record<string, unknown> {
  const body: Record<string, unknown> = {
    subject: parsed.summary, body: { contentType: 'text', content: parsed.description },
    categories: ['Pinch'], isReminderOn: parsed.reminderMinutes !== undefined,
    reminderMinutesBeforeStart: parsed.reminderMinutes || 0,
    extensions: [{ '@odata.type': 'microsoft.graph.openTypeExtension', extensionName: 'com.pinch.calendar', pinchManaged: 'true', pinchUid: parsed.uid }]
  };
  body.start = parsed.allDay ? { dateTime: `${parsed.start}T00:00:00`, timeZone: 'UTC' } : { dateTime: parsed.start.slice(0, 19), timeZone: 'UTC' };
  body.end = parsed.allDay ? { dateTime: `${parsed.end}T00:00:00`, timeZone: 'UTC' } : { dateTime: parsed.end.slice(0, 19), timeZone: 'UTC' };
  body.isAllDay = parsed.allDay;
  return body;
}

async function googleEvents(config: CalendarSyncConfig, calendarId: string): Promise<ProviderEvent[]> {
  const params = new URLSearchParams({ maxResults: '2500', showDeleted: 'false', privateExtendedProperty: 'pinchManaged=true' });
  const data = await request(config, `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`, 'GET');
  return (data.items || []).map((item: any) => ({ uid: item.extendedProperties?.private?.pinchUid || '', id: item.id, fingerprint: item.extendedProperties?.private?.pinchFingerprint })).filter((item: ProviderEvent) => item.uid);
}

async function microsoftEvents(config: CalendarSyncConfig, calendarId: string): Promise<ProviderEvent[]> {
  const path = calendarId ? `/me/calendars/${encodeURIComponent(calendarId)}/events` : '/me/calendar/events';
  const params = new URLSearchParams({ '$top': '250', '$expand': "extensions($filter=id eq 'com.pinch.calendar')" });
  const data = await request(config, `https://graph.microsoft.com/v1.0${path}?${params}`, 'GET');
  return (data.value || []).map((item: any) => {
    const extension = (item.extensions || []).find((entry: any) => entry.id === 'com.pinch.calendar');
    return { uid: extension?.pinchUid || '', id: item.id };
  }).filter((item: ProviderEvent) => item.uid);
}

async function syncGoogle(config: CalendarSyncConfig, events: Map<string, CalendarSyncEvent>): Promise<ProviderSyncCounts> {
  const calendarId = config.providerCalendarId || 'primary';
  const remote = await googleEvents(config, calendarId);
  const byUid = new Map(remote.map(item => [item.uid, item]));
  const ids = { ...(config.providerEventIds || {}) };
  const counts: ProviderSyncCounts = { created: 0, updated: 0, deleted: 0, unchanged: 0 };
  for (const event of events.values()) {
    const parsed = parseCalendarEvent(event); const old = byUid.get(event.uid); const id = old?.id || ids[event.uid] || eventId(event.uid);
    if (old?.fingerprint === event.fingerprint) { counts.unchanged += 1; continue; }
    const body = googleBody(parsed); (body.extendedProperties as any).private.pinchFingerprint = event.fingerprint;
    await request(config, `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(id)}`, old ? 'PUT' : 'POST', old ? body : { ...body, id });
    ids[event.uid] = id; counts[old ? 'updated' : 'created'] += 1; byUid.delete(event.uid);
  }
  for (const old of byUid.values()) { await request(config, `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(old.id)}`, 'DELETE'); counts.deleted += 1; }
  saveCalendarSyncConfig({ ...loadCalendarSyncConfig(), providerEventIds: ids });
  return counts;
}

async function syncMicrosoft(config: CalendarSyncConfig, events: Map<string, CalendarSyncEvent>): Promise<ProviderSyncCounts> {
  const calendarId = config.providerCalendarId || ''; const remote = await microsoftEvents(config, calendarId); const byUid = new Map(remote.map(item => [item.uid, item]));
  const ids = { ...(config.providerEventIds || {}) }; const counts: ProviderSyncCounts = { created: 0, updated: 0, deleted: 0, unchanged: 0 };
  const base = calendarId ? `/me/calendars/${encodeURIComponent(calendarId)}/events` : '/me/calendar/events';
  for (const event of events.values()) {
    const parsed = parseCalendarEvent(event); const old = byUid.get(event.uid); const id = old?.id || ids[event.uid];
    const body = microsoftBody(parsed); const endpoint = id ? `${base}/${encodeURIComponent(id)}` : base;
    const result = await request(config, `https://graph.microsoft.com/v1.0${endpoint}`, id ? 'PATCH' : 'POST', body);
    ids[event.uid] = id || result.id || eventId(event.uid); counts[id ? 'updated' : 'created'] += 1; byUid.delete(event.uid);
  }
  for (const old of byUid.values()) { await request(config, `https://graph.microsoft.com/v1.0${base}/${encodeURIComponent(old.id)}`, 'DELETE'); counts.deleted += 1; }
  saveCalendarSyncConfig({ ...loadCalendarSyncConfig(), providerEventIds: ids });
  return counts;
}

export async function syncProviderCalendar(config: CalendarSyncConfig, events: Map<string, CalendarSyncEvent>): Promise<ProviderSyncCounts> {
  const provider = config.provider || 'caldav';
  if (provider === 'google') return syncGoogle(config, events);
  if (provider === 'microsoft') return syncMicrosoft(config, events);
  throw new Error('Unsupported calendar provider');
}

export async function ensureProviderAccessToken(config: CalendarSyncConfig): Promise<CalendarSyncConfig> {
  if (!config.oauthAccessToken) throw new Error('请先完成 OAuth 授权');
  if (config.oauthTokenExpiresAt && Date.parse(config.oauthTokenExpiresAt) > Date.now() + 60_000) return config;
  const tokens = await refreshCalendarProviderToken(config);
  const next = { ...loadCalendarSyncConfig(), oauthAccessToken: tokens.accessToken, oauthRefreshToken: tokens.refreshToken || config.oauthRefreshToken, oauthTokenExpiresAt: tokens.expiresAt };
  saveCalendarSyncConfig(next);
  return next;
}
