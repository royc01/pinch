import type {
  CalDavRequestParams,
  CalDavResponse,
  CalendarComponent,
  CalendarSyncConfig,
  CalendarSyncEvent
} from '@/calendarSyncTypes';
import { calendarBasicAuth, calendarHttpRequest } from '@/calendarHttpTransport';
 

export interface RemoteCalendarEvent {
  uid: string;
  href: string;
  etag?: string;
  fingerprint?: string;
}

export interface DiscoveredCalendar {
  url: string;
  displayName?: string;
}

export class CalendarSelectionRequiredError extends Error {
  constructor(public readonly calendars: DiscoveredCalendar[]) {
    super('Multiple CalDAV calendars were discovered; choose one calendar to sync');
    this.name = 'CalendarSelectionRequiredError';
  }
}

function selectCalendar(calendars: DiscoveredCalendar[], currentUrl: string): string {
  const current = calendars.find(calendar => normalizeCalendarUrl(calendar.url) === currentUrl);
  if (current) return normalizeCalendarUrl(current.url);
  if (calendars.length !== 1) throw new CalendarSelectionRequiredError(calendars);
  return normalizeCalendarUrl(calendars[0].url);
}

function normalizeCalendarUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error('CalDAV address is required');
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error('CalDAV address must be a valid HTTP(S) URL, for example https://calendar.example.com');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Calendar URL must use HTTP or HTTPS');
  }
  url.pathname = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
  url.hash = '';
  return url.toString();
}

export function normalizeCalendarDavUrl(value: string): string {
  return normalizeCalendarUrl(value);
}

async function request(
  config: CalendarSyncConfig,
  method: CalDavRequestParams['method'],
  url: string,
  options: { headers?: Record<string, string>; body?: string; transport?: CalDavRequestParams['transport'] } = {}
): Promise<CalDavResponse> {
  return calendarHttpRequest({
    url, method,
    headers: { Authorization: calendarBasicAuth(config.username, config.password), ...options.headers },
    body: options.body,
    transport: options.transport || config.transport || 'auto'
  });
}

function sanitizeServerMessage(value: string, config: CalendarSyncConfig): string {
  let message = value;
  for (const secret of [config.username, config.password]) {
    if (secret) message = message.split(secret).join('[redacted]');
  }
  message = message.replace(/\b(?:Basic|Bearer)\s+[a-z\d+/=._-]+/gi, '[redacted authorization]');
  // Error pages sometimes echo the submitted calendar. Keep the explanation,
  // rather than copying task content into the diagnostic message.
  message = message.split('BEGIN:VCALENDAR')[0];
  return message.replace(/\s+/g, ' ').trim().slice(0, 350);
}

function getServerErrorDetail(response: CalDavResponse, config: CalendarSyncConfig): string {
  const body = response.body?.trim() || '';
  if (!body || body.length > 64 * 1024) return '';
  let detail = '';
  if (body.startsWith('{')) {
    try {
      const data = JSON.parse(body) as Record<string, unknown>;
      detail = [data.message, data.msg, data.error].find(value => typeof value === 'string' && value.trim()) as string || '';
    } catch { /* Invalid JSON provides no structured error detail. */ }
  } else if (body.startsWith('<')) {
    const documentValue = new DOMParser().parseFromString(body, 'application/xml');
    if (!documentValue.querySelector('parsererror') && documentValue.documentElement.localName === 'error') {
      const conditions = Array.from(documentValue.documentElement.children)
        .filter(element => element.namespaceURI === 'DAV:' || element.namespaceURI === 'urn:ietf:params:xml:ns:caldav')
        .map(element => element.localName);
      const description = getElementText(documentValue.documentElement, 'responsedescription');
      detail = [...conditions, description].filter(Boolean).join('; ');
    } else {
      const html = new DOMParser().parseFromString(body, 'text/html');
      html.querySelectorAll('script, style').forEach(element => element.remove());
      detail = html.body.textContent || '';
    }
  } else {
    detail = body;
  }
  return sanitizeServerMessage(detail, config);
}

function assertSuccess(response: CalDavResponse, operation: string, config: CalendarSyncConfig): void {
  if (response.status >= 200 && response.status < 300) return;
  if (response.status === 599) {
    let message: string | undefined;
    try {
      const detail = JSON.parse(response.body) as { error?: unknown };
      if (typeof detail?.error === 'string' && detail.error) message = detail.error;
    } catch { /* A malformed bridge response must not hide the operation. */ }
    if (message) throw new Error(sanitizeServerMessage(message, config));
    throw new Error(`${operation} failed inside the SiYuan CalDAV bridge`);
  }
  if (response.status === 401 || response.status === 403) {
    const error = new Error('CalDAV authentication failed') as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  const detail = getServerErrorDetail(response, config);
  const error = new Error(`${operation} failed: HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}${detail ? ` 遯ｶ繝ｻ${detail}` : ''}`) as Error & { status?: number };
  error.status = response.status;
  throw error;
}

function getElementText(element: Element, localName: string): string {
  const child = Array.from(element.getElementsByTagNameNS('*', localName))[0];
  return child?.textContent?.trim() || '';
}

function getIcsProperty(calendarData: string, name: string): string {
  const unfolded = calendarData.replace(/\r?\n[ \t]/g, '');
  const prefix = `${name.toUpperCase()}:`;
  const line = unfolded.split(/\r?\n/).find(value => value.toUpperCase().startsWith(prefix));
  return line ? line.slice(prefix.length).trim() : '';
}

function getHrefFromElement(element: Element | null): string {
  if (!element) return '';
  return Array.from(element.getElementsByTagNameNS('*', 'href'))[0]?.textContent?.trim() || '';
}

function getPropertyHref(documentValue: XMLDocument, localName: string): string {
  return getHrefFromElement(documentValue.getElementsByTagNameNS('*', localName)[0]);
}

function getResponseHref(documentValue: XMLDocument): string {
  // A response href identifies the resource queried. It is a fallback starting
  // point, not proof that the resource is a principal or a calendar.
  for (const response of Array.from(documentValue.getElementsByTagNameNS('*', 'response'))) {
    const href = Array.from(response.children).find(child => child.localName === 'href');
    if (href?.textContent?.trim()) return href.textContent.trim();
  }
  return '';
}

function parseCalendarCollections(documentValue: XMLDocument, baseUrl: string, component: CalendarComponent): DiscoveredCalendar[] {
  const calendars: DiscoveredCalendar[] = [];
  for (const response of Array.from(documentValue.getElementsByTagNameNS('*', 'response'))) {
    const resourceType = response.getElementsByTagNameNS('*', 'resourcetype')[0];
    if (!resourceType || !Array.from(resourceType.children).some(child => child.localName === 'calendar')) continue;
    const href = Array.from(response.children).find(child => child.localName === 'href')?.textContent?.trim();
    if (!href) continue;
    const displayName = getElementText(response, 'displayname') || undefined;
    const url = normalizeCalendarUrl(new URL(href, baseUrl).toString());
    if (!supportsCalendarComponent(response, component)) continue;
    if (!calendars.some(calendar => calendar.url === url)) calendars.push({ url, displayName });
  }
  return calendars;
}

function supportsCalendarComponent(element: Element | XMLDocument, component: CalendarComponent): boolean {
  const supported = element.getElementsByTagNameNS('*', 'supported-calendar-component-set')[0];
  // Older servers omit this optional property. An explicit component set is
  // authoritative, including an empty set.
  return !supported || Array.from(supported.getElementsByTagNameNS('*', 'comp'))
    .some(item => item.getAttribute('name')?.toUpperCase() === component);
}

function parseXmlResponse(body: string, operation: string, requireComplete = false, allowMissingCalendarData = false): XMLDocument {
  const documentValue = new DOMParser().parseFromString(body, 'application/xml');
  if (documentValue.querySelector('parsererror')) throw new Error(`${operation} returned invalid XML`);
  for (const propstat of Array.from(documentValue.getElementsByTagNameNS('*', 'propstat'))) {
    const status = getElementText(propstat, 'status');
    if (status && !/^HTTP\/\S+\s+2\d\d(?:\s|$)/i.test(status)) {
      const properties = propstat.getElementsByTagNameNS('*', 'prop')[0];
      const missingCalendarData = allowMissingCalendarData && /^HTTP\/\S+\s+404(?:\s|$)/i.test(status)
        && properties?.children.length === 1 && properties.children[0].localName === 'calendar-data';
      if (missingCalendarData) { propstat.remove(); continue; }
      if (requireComplete) throw new Error(`${operation} returned an incomplete result: ${status}`);
      propstat.remove();
    }
  }
  return documentValue;
}

/** Discover calendar collections from a server/principal URL. */
async function discoverCalendarCollectionsAt(
  config: CalendarSyncConfig
): Promise<DiscoveredCalendar[]> {
  const serverUrl = normalizeCalendarUrl(config.calendarUrl);
  const principalResponse = await request(config, 'PROPFIND', serverUrl, {
    headers: { Depth: '0', 'Content-Type': 'application/xml; charset=utf-8' },
    body: '<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><d:current-user-principal/><d:principal-URL/><c:calendar-home-set/><d:resourcetype/><d:displayname/><c:supported-calendar-component-set/></d:prop></d:propfind>'
  });
  assertSuccess(principalResponse, 'CalDAV principal discovery', config);
  const principalDocument = parseXmlResponse(principalResponse.body, 'CalDAV principal discovery');
  const directCalendars = parseCalendarCollections(principalDocument, serverUrl, config.caldavComponent || 'VEVENT');
  if (directCalendars.length) return directCalendars;

  const currentPrincipal = principalDocument.getElementsByTagNameNS('*', 'current-user-principal')[0];
  if (currentPrincipal?.getElementsByTagNameNS('*', 'unauthenticated').length) {
    throw Object.assign(new Error('CalDAV server reports an unauthenticated user; check the account and app password'), { status: 401 });
  }
  const principal = getPropertyHref(principalDocument, 'current-user-principal')
    || getPropertyHref(principalDocument, 'principal-URL');
  const directHome = getPropertyHref(principalDocument, 'calendar-home-set');
  let homeUrl = directHome ? normalizeCalendarUrl(new URL(directHome, serverUrl).toString()) : '';

  if (!homeUrl) {
    const startingHref = principal || getResponseHref(principalDocument) || serverUrl;
    const startingUrl = normalizeCalendarUrl(new URL(startingHref, serverUrl).toString());
    const homeResponse = await request(config, 'PROPFIND', startingUrl, {
      headers: { Depth: '0', 'Content-Type': 'application/xml; charset=utf-8' },
      body: '<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><c:calendar-home-set/><d:resourcetype/><d:displayname/><c:supported-calendar-component-set/></d:prop></d:propfind>'
    });
    // Only tolerate an unsupported home lookup on an unconfirmed starting
    // resource. Authentication, transport and explicit principal errors remain
    // visible instead of becoming a misleading "no calendars" error.
    if (principal || ![404, 405].includes(homeResponse.status)) {
      assertSuccess(homeResponse, 'CalDAV calendar home discovery', config);
    }
    if (homeResponse.status >= 200 && homeResponse.status < 300) {
      const homeDocument = parseXmlResponse(homeResponse.body, 'CalDAV calendar home discovery');
      const calendars = parseCalendarCollections(homeDocument, startingUrl, config.caldavComponent || 'VEVENT');
      if (calendars.length) return calendars;
      const home = getPropertyHref(homeDocument, 'calendar-home-set');
      homeUrl = home ? normalizeCalendarUrl(new URL(home, startingUrl).toString()) : startingUrl;
    } else {
      homeUrl = startingUrl;
    }
  }

  return listCalendarCollections(config, homeUrl);
}

async function listCalendarCollections(config: CalendarSyncConfig, homeUrl: string): Promise<DiscoveredCalendar[]> {
  const listResponse = await request(config, 'PROPFIND', homeUrl, {
    headers: { Depth: '1', 'Content-Type': 'application/xml; charset=utf-8' },
    body: '<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><d:resourcetype/><d:displayname/><c:supported-calendar-component-set/></d:prop></d:propfind>'
  });
  assertSuccess(listResponse, 'CalDAV calendar discovery', config);
  const listDocument = parseXmlResponse(listResponse.body, 'CalDAV calendar discovery');
  const calendars = parseCalendarCollections(listDocument, homeUrl, config.caldavComponent || 'VEVENT');
  if (!calendars.length) {
    throw new Error(`No CalDAV calendar supporting ${config.caldavComponent || 'VEVENT'} was found`);
  }
  return calendars;
}

/** Follow the same standard and common discovery entrances used by
 * task-note-management, retaining user selection when multiple calendars exist. */
export async function discoverCalendarCollections(config: CalendarSyncConfig): Promise<DiscoveredCalendar[]> {
  const root = new URL(normalizeCalendarUrl(config.calendarUrl));
  let originalError: unknown;
  try { return await discoverCalendarCollectionsAt(config); } catch (error) {
    if (root.pathname !== '/' || [401, 403, 599].includes((error as { status?: number }).status || 0)) throw error;
    originalError = error;
  }
  const providerPaths = root.hostname === 'caldav.feishu.cn' ? ['/calendars/']
    : root.hostname === 'calendar.dingtalk.com' ? ['/dav/principals/']
    : root.hostname === 'caldav.wecom.work' ? ['/calendar/'] : [];
  const paths = [...new Set([...providerPaths, '/.well-known/caldav', '/dav/principals/', '/caldav/', '/calendars/'])];
  for (const path of paths) {
    try {
      return await discoverCalendarCollectionsAt({ ...config, calendarUrl: new URL(path, root).toString() });
    } catch (error) {
      if ([401, 403, 599].includes((error as { status?: number }).status || 0)) throw error;
    }
  }
  throw originalError;
}

export async function testCalendarDavConnection(config: CalendarSyncConfig): Promise<string> {
  const calendarUrl = normalizeCalendarUrl(config.calendarUrl);
  const response = await request(config, 'PROPFIND', calendarUrl, {
    headers: { Depth: '0', 'Content-Type': 'application/xml; charset=utf-8' },
    body: '<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><d:resourcetype/><c:supported-calendar-component-set/></d:prop></d:propfind>'
  });
  assertSuccess(response, 'CalDAV connection', config);
  const documentValue = parseXmlResponse(response.body, 'CalDAV connection');
  const isCalendarCollection = Array.from(documentValue.getElementsByTagNameNS('*', 'calendar')).length > 0;
  if (isCalendarCollection && supportsCalendarComponent(documentValue, config.caldavComponent || 'VEVENT')) return calendarUrl;
  return selectCalendar(await discoverCalendarCollections(config), calendarUrl);
}

export async function listManagedCalendarEvents(config: CalendarSyncConfig): Promise<{
  calendarUrl: string;
  events: RemoteCalendarEvent[];
}> {
  let calendarUrl = normalizeCalendarUrl(config.calendarUrl);
  const queryOptions = {
    headers: { Depth: '1', 'Content-Type': 'application/xml; charset=utf-8' },
    body: [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">',
      '<d:prop><d:getetag/><c:calendar-data/></d:prop>',
      // Read both managed component types so changing the format updates the
      // existing resource by UID instead of creating duplicates or conflicts.
      '<c:filter><c:comp-filter name="VCALENDAR"/></c:filter>',
      '</c:calendar-query>'
    ].join('')
  };
  let response = await request(config, 'REPORT', calendarUrl, queryOptions);
  if (response.status === 405) {
    const discovered = await discoverCalendarCollections(config);
    const nextCalendarUrl = selectCalendar(discovered, calendarUrl);
    if (nextCalendarUrl && nextCalendarUrl !== calendarUrl) {
      calendarUrl = nextCalendarUrl;
      response = await request(config, 'REPORT', calendarUrl, queryOptions);
    }
  }
  assertSuccess(response, 'CalDAV calendar query', config);

  const documentValue = parseXmlResponse(response.body, 'CalDAV calendar query', true, true);

  const entries: RemoteCalendarEvent[] = [];
  const missingData: Array<{ href: string; etag?: string }> = [];
  const responses = Array.from(documentValue.getElementsByTagNameNS('*', 'response'));
  for (const item of responses) {
    const calendarData = getElementText(item, 'calendar-data');
    const resourceHref = getElementText(item, 'href');
    if (!calendarData && resourceHref && new URL(resourceHref, calendarUrl).pathname.toLowerCase().endsWith('.ics')) {
      missingData.push({ href: resourceHref, etag: getElementText(item, 'getetag') || undefined });
      continue;
    }
    if (!/(?:^|\r?\n)BEGIN:(?:VEVENT|VTODO)(?:\r?\n|$)/i.test(calendarData)
      || getIcsProperty(calendarData, 'X-PINCH-MANAGED').toUpperCase() !== 'TRUE') continue;
    const uid = getIcsProperty(calendarData, 'UID');
    const href = getElementText(item, 'href');
    if (!uid || !href) continue;
    entries.push({
      uid,
      href: new URL(href, calendarUrl).toString(),
      etag: getElementText(item, 'getetag') || undefined,
      fingerprint: getIcsProperty(calendarData, 'X-PINCH-FINGERPRINT') || undefined
    });
  }
  for (let offset = 0; offset < missingData.length; offset += 50) {
    const batch = missingData.slice(offset, offset + 50);
    const escapeXml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const result = await request(config, 'REPORT', calendarUrl, {
      headers: { 'Content-Type': 'application/xml; charset=utf-8', Accept: 'application/xml,text/xml' },
      body: `<?xml version="1.0"?><c:calendar-multiget xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><d:getetag/><c:calendar-data/></d:prop>${batch.map(item => `<d:href>${escapeXml(item.href)}</d:href>`).join('')}</c:calendar-multiget>`
    });
    assertSuccess(result, 'CalDAV calendar multiget', config);
    const documentValue = parseXmlResponse(result.body, 'CalDAV calendar multiget', true);
    const retrieved = new Set<string>();
    for (const item of Array.from(documentValue.getElementsByTagNameNS('*', 'response'))) {
      const href = getElementText(item, 'href');
      const calendarData = getElementText(item, 'calendar-data');
      if (!href || !calendarData) continue;
      const absoluteHref = new URL(href, calendarUrl).toString();
      retrieved.add(absoluteHref);
      if (!/(?:^|\r?\n)BEGIN:(?:VEVENT|VTODO)(?:\r?\n|$)/i.test(calendarData)
        || getIcsProperty(calendarData, 'X-PINCH-MANAGED').toUpperCase() !== 'TRUE') continue;
      const uid = getIcsProperty(calendarData, 'UID');
      if (uid) entries.push({ uid, href: absoluteHref, etag: getElementText(item, 'getetag') || undefined, fingerprint: getIcsProperty(calendarData, 'X-PINCH-FINGERPRINT') || undefined });
    }
    if (batch.some(item => !retrieved.has(new URL(item.href, calendarUrl).toString()))) {
      throw new Error('CalDAV calendar multiget returned incomplete event data; sync stopped');
    }
  }
  return { calendarUrl, events: entries };
}

function describeWriteFailure(response: CalDavResponse, config: CalendarSyncConfig): string {
  const detail = getServerErrorDetail(response, config);
  if (detail) return `HTTP ${response.status}: ${detail}`;
  const body = response.body || '';
  return `HTTP ${response.status}${body.length ? ` (${body.length} response characters)` : ''}`;
}

async function writeCalendarResource(
  config: CalendarSyncConfig,
  event: CalendarSyncEvent,
  url: string,
  headers: Record<string, string>,
  isUpdate: boolean
): Promise<CalDavResponse> {
  const response = await request(config, 'PUT', url, { headers, body: event.ics });
  if (response.status >= 200 && response.status < 300) return response;
  const kind = /(?:^|\r?\n)DTSTART;VALUE=DATE:/.test(event.ics) ? 'all-day' : 'timed';
  const file = new URL(url).pathname.split('/').pop() || '';
  throw new Error(`CalDAV event write failed: HTTP ${response.status} (${isUpdate ? 'update' : 'create'}, ${kind}, ${sanitizeServerMessage(file, config)}): ${describeWriteFailure(response, config)}`);
}

export async function putCalendarEvent(
  config: CalendarSyncConfig,
  event: CalendarSyncEvent,
  remote?: RemoteCalendarEvent
): Promise<void> {
  const calendarUrl = normalizeCalendarUrl(config.calendarUrl);
  const url = remote?.href || new URL(event.resourceName, calendarUrl).toString();
  const headers: Record<string, string> = { 'Content-Type': 'text/calendar; charset=utf-8' };
  if (remote?.etag) headers['If-Match'] = remote.etag;
  else headers['If-None-Match'] = '*';
  const response = await writeCalendarResource(config, event, url, headers, !!remote);
  if (response.status === 412 && remote?.etag) {
    // Pinch is the source of truth. Retry once without the stale conditional ETag.
    const retryResponse = await writeCalendarResource(config, event, url, { 'Content-Type': 'text/calendar; charset=utf-8' }, true);
    assertSuccess(retryResponse, 'CalDAV event write', config);
    return;
  }
  assertSuccess(response, 'CalDAV event write', config);
}

export async function deleteCalendarEvent(
  config: CalendarSyncConfig,
  event: RemoteCalendarEvent
): Promise<void> {
  const headers = event.etag ? { 'If-Match': event.etag } : undefined;
  const response = await request(config, 'DELETE', event.href, { headers });
  if (response.status === 404) return;
  assertSuccess(response, 'CalDAV event delete', config);
}




