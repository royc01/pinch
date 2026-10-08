import { GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { putFile } from '@/api';
import { ensureDataDir } from '@/utils';
import type { CalendarCloudConfig } from '@/calendarSyncTypes';
import { calendarBasicAuth, calendarHttpRequest } from '@/calendarHttpTransport';

export interface CalendarCloudPublishResult { url: string; expiresAt?: string; publishedAt?: string }

const SIYUAN_UPLOAD_INTERVAL_MS = 65_000;
interface SiyuanUploadState {
  nextAllowedAt: number;
  files: Record<string, { digest: string; publishedAt: string }>;
}
const siyuanUploadStates = new Map<string, SiyuanUploadState>();

class CalendarCloudCooldownError extends Error {
  readonly retryAt: string;
  constructor(timestamp: number) {
    const seconds = Math.max(1, Math.ceil((timestamp - Date.now()) / 1000));
    super(`思源云端上传需冷却，约 ${seconds} 秒后可重试；已保留上次成功的订阅地址`);
    this.retryAt = new Date(timestamp).toISOString();
  }
}

function readSiyuanUploadState(id: string): SiyuanUploadState {
  try {
    const raw = window.localStorage.getItem(`pinch:calendar-cloud-siyuan:${id}`);
    const value = raw ? JSON.parse(raw) : null;
    if (value && Number.isFinite(value.nextAllowedAt) && value.files && typeof value.files === 'object') return value;
    return { nextAllowedAt: 0, files: {} };
  } catch { return siyuanUploadStates.get(id) || { nextAllowedAt: 0, files: {} }; }
}

function writeSiyuanUploadState(id: string, state: SiyuanUploadState): void {
  siyuanUploadStates.set(id, state);
  try { window.localStorage.setItem(`pinch:calendar-cloud-siyuan:${id}`, JSON.stringify(state)); } catch { /* Memory fallback for unavailable storage. */ }
}

async function calendarContentDigest(ics: string): Promise<string | null> {
  if (!globalThis.crypto?.subtle) return null;
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(ics));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function httpUrl(value: string): URL {
  const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('同步服务地址必须是无账号凭据、查询参数或片段的 HTTP(S) 地址');
  }
  return url;
}

export function calendarCloudFileName(value: string): string {
  const fileName = `${value.trim().replace(/\.ics$/i, '')}.ics`;
  if (!/^[a-z\d][a-z\d._-]*\.ics$/i.test(fileName) || fileName.length > 240) {
    throw new Error('ICS 文件名只能包含字母、数字、点、下划线和连字符');
  }
  return fileName;
}

function assertRemoteSuccess(status: number, operation: string): void {
  if (status >= 200 && status < 300) return;
  throw new Error(`${operation}: HTTP ${status}${status === 401 ? '，请检查账号和应用密码' : status === 403 ? '，请检查读写权限' : ''}`);
}

function webdavDirectory(config: CalendarCloudConfig): URL {
  if (!config.webdavUrl) throw new Error('请填写 WebDAV 目录地址');
  const url = httpUrl(config.webdavUrl);
  if (/\.ics\/?$/i.test(url.pathname)) {
    throw new Error('WebDAV 地址应填写目录，不是 .ics 文件地址；文件名请填写在 ICS 文件名中');
  }
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url;
}

function webdavHeaders(config: CalendarCloudConfig): Record<string, string> {
  return config.webdavUsername || config.webdavPassword
    ? { Authorization: calendarBasicAuth(config.webdavUsername, config.webdavPassword) } : {};
}

async function webdavCollectionExists(config: CalendarCloudConfig, url: URL): Promise<boolean> {
  const response = await calendarHttpRequest({
    url: url.toString(), method: 'PROPFIND', transport: config.transport,
    headers: { ...webdavHeaders(config), Depth: '0', 'Content-Type': 'application/xml; charset=utf-8' },
    body: '<d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>'
  });
  if (response.status === 404) return false;
  assertRemoteSuccess(response.status, 'WebDAV 目录检查失败');
  if (!response.body?.trim()) return true;
  const documentValue = new DOMParser().parseFromString(response.body || '', 'application/xml');
  const collection = !documentValue.querySelector('parsererror')
    && Array.from(documentValue.getElementsByTagNameNS('DAV:', 'propstat')).some(property => {
      const status = property.getElementsByTagNameNS('DAV:', 'status')[0]?.textContent || '';
      return /^HTTP\/\S+\s+2\d\d(?:\s|$)/i.test(status.trim())
        && property.getElementsByTagNameNS('DAV:', 'resourcetype')[0]?.getElementsByTagNameNS('DAV:', 'collection').length;
    });
  if (!collection) throw new Error('WebDAV 地址未返回有效目录，请填写服务商提供的 WebDAV 入口，不要填写网页或分享链接');
  return true;
}

async function webdavDirectoryProbe(config: CalendarCloudConfig, url: URL): Promise<boolean> {
  const response = await calendarHttpRequest({
    url: url.toString(), method: 'PROPFIND', transport: config.transport,
    headers: { ...webdavHeaders(config), Depth: '0', 'Content-Type': 'application/xml; charset=utf-8' },
    body: '<d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>'
  });
  if (response.status === 404) return false;
  if (response.status === 403) throw new Error('WebDAV 目录无权限（HTTP 403），请检查账户是否具有读写权限');
  assertRemoteSuccess(response.status, 'WebDAV 目录检查失败');
  return true;
}

async function ensureWebdavDirectory(config: CalendarCloudConfig, directory: URL): Promise<void> {
  let path = '';
  for (const segment of directory.pathname.split('/').filter(Boolean)) {
    path += `/${segment}`;
    const url = new URL(directory.toString());
    url.pathname = `${path}/`;
    const response = await calendarHttpRequest({ url: url.toString(), method: 'MKCOL',
      headers: webdavHeaders(config), transport: config.transport });
    if ([201, 200, 204, 405].includes(response.status)) continue;
    if (response.status === 403 && await webdavDirectoryProbe(config, url)) continue;
    if (response.status === 404 || response.status === 409) {
      const parent = new URL('../', url);
      if (parent.pathname === url.pathname || !(await webdavCollectionExists(config, parent))) {
        throw new Error('WebDAV 目录不存在（HTTP 404），未找到可用的父目录；请检查 WebDAV 入口地址和账户权限');
      }
      const retry = await calendarHttpRequest({ url: url.toString(), method: 'MKCOL',
        headers: webdavHeaders(config), transport: config.transport });
      if ([201, 200, 204, 405].includes(retry.status)) continue;
    }
    assertRemoteSuccess(response.status, 'WebDAV 创建目录失败');
  }
}

async function publishWebdav(config: CalendarCloudConfig, ics: string): Promise<CalendarCloudPublishResult> {
  const directory = webdavDirectory(config);
  const auth = webdavHeaders(config);
  // Nutstore commonly rejects files directly below /dav/; its documented
  // WebDAV examples use a child collection such as /dav/ics/. Start there so
  // the browser does not emit a misleading failed PUT for the root collection.
  const directories = directory.hostname.toLowerCase() === 'dav.jianguoyun.com' && directory.pathname === '/dav/'
    ? [new URL('ics/', directory)] : [directory];
  let lastStatus = 0;
  for (const targetDirectory of directories) {
    const url = new URL(calendarCloudFileName(config.fileName), targetDirectory).toString();
    const options = { url, method: 'PUT', headers: { ...auth, 'Content-Type': 'text/calendar; charset=utf-8' }, body: ics, transport: config.transport };
    let response = await calendarHttpRequest(options);
    if (response.status === 404 || response.status === 409) {
      await ensureWebdavDirectory(config, targetDirectory);
      response = await calendarHttpRequest(options);
    }
    if (response.status >= 200 && response.status < 300) return { url };
    lastStatus = response.status;
    if (response.status !== 404) assertRemoteSuccess(response.status, 'WebDAV 上传失败');
  }
  throw new Error(`WebDAV 上传失败: HTTP ${lastStatus || 404}；坚果云请先在 WebDAV 根目录创建 ics 文件夹，或将地址填写为 https://dav.jianguoyun.com/dav/ics/`);
}

export function resolveCalendarS3Config(config: CalendarCloudConfig): CalendarCloudConfig {
  if (!config.s3UseSiyuanConfig) return config;
  const s3 = (window as any).siyuan?.config?.sync?.s3;
  if (!s3) throw new Error('未找到思源 S3 配置，请先在思源设置中配置 S3');
  return {
    ...config, s3Bucket: config.s3Bucket || s3.bucket || '', s3Endpoint: s3.endpoint || '',
    s3Region: s3.region || 'auto', s3AccessKeyId: s3.accessKey || '', s3AccessKeySecret: s3.secretKey || '',
    s3ForcePathStyle: s3.pathStyle !== false
  };
}

function s3Client(config: CalendarCloudConfig): S3Client {
  if (!config.s3Bucket || !config.s3Endpoint || !config.s3AccessKeyId || !config.s3AccessKeySecret) {
    throw new Error('S3 配置不完整，请填写 Bucket、Endpoint、Access Key 和 Secret Key');
  }
  return new S3Client({
    endpoint: httpUrl(config.s3Endpoint).toString(), region: config.s3Region || 'auto',
    forcePathStyle: config.s3ForcePathStyle,
    requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED',
    credentials: { accessKeyId: config.s3AccessKeyId, secretAccessKey: config.s3AccessKeySecret }
  });
}

export function calendarS3ObjectKey(config: CalendarCloudConfig): string {
  const prefix = config.s3StoragePath.replace(/^\/+|\/+$/g, '');
  if (prefix.split('/').some(segment => segment === '.' || segment === '..')) throw new Error('S3 存储目录不能包含 . 或 ..');
  return `${prefix ? `${prefix}/` : ''}${calendarCloudFileName(config.fileName)}`;
}

export function calendarS3PublicUrl(config: CalendarCloudConfig, key: string): string {
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');
  const url = httpUrl(config.s3CustomDomain || config.s3Endpoint);
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  if (!config.s3CustomDomain) {
    if (config.s3ForcePathStyle) url.pathname += `${encodeURIComponent(config.s3Bucket)}/`;
    else url.hostname = `${config.s3Bucket}.${url.hostname}`;
  }
  url.pathname += encodedKey;
  return url.toString();
}

async function publishS3(input: CalendarCloudConfig, ics: string): Promise<CalendarCloudPublishResult> {
  const config = resolveCalendarS3Config(input);
  const client = s3Client(config);
  try {
    const key = calendarS3ObjectKey(config);
    const signedPut = await getSignedUrl(client, new PutObjectCommand({ Bucket: config.s3Bucket, Key: key, ContentType: 'text/calendar' }), { expiresIn: 900 });
    const response = await calendarHttpRequest({ url: signedPut, method: 'PUT', headers: { 'Content-Type': 'text/calendar' }, body: ics, transport: config.transport });
    assertRemoteSuccess(response.status, 'S3 上传失败');
    if (config.s3UrlMode === 'signed') {
      const url = await getSignedUrl(client, new GetObjectCommand({ Bucket: config.s3Bucket, Key: key }), { expiresIn: 7 * 24 * 60 * 60 });
      return { url, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() };
    }
    return { url: calendarS3PublicUrl(config, key) };
  } finally { client.destroy(); }
}

async function siyuanRequest(path: string, body: unknown): Promise<any> {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(response.status === 429 ? 'Too many asset uploads. Please retry in one minute.' : `思源云端请求失败：HTTP ${response.status}`);
  const result = await response.json();
  if (result.code !== 0) throw new Error(typeof result.msg === 'string' ? result.msg : '思源云端请求失败');
  return result.data;
}

function siyuanUserId(): string {
  const id = (window as any).siyuan?.user?.userId;
  if (typeof id !== 'string' || !id) throw new Error('请先登录可使用资源云端上传的思源账号');
  return id;
}

async function publishSiyuan(config: CalendarCloudConfig, ics: string): Promise<CalendarCloudPublishResult> {
  const id = siyuanUserId();
  const filename = calendarCloudFileName(config.fileName);
  const url = `https://assets.b3logfile.com/siyuan/${encodeURIComponent(id)}/assets/${filename}`;
  const digest = await calendarContentDigest(ics);
  const state = readSiyuanUploadState(id);
  const previous = state.files[filename];
  if (digest && previous?.digest === digest) return { url, publishedAt: previous.publishedAt };
  if (state.nextAllowedAt > Date.now()) throw new CalendarCloudCooldownError(state.nextAllowedAt);
  await ensureDataDir('/data/assets');
  await putFile(`/data/assets/${filename}`, false, new Blob([ics], { type: 'text/calendar' }));
  // Persist before requesting the cloud API, so another window or a plugin
  // reload observes the same account-wide limit, including different filenames.
  state.nextAllowedAt = Date.now() + SIYUAN_UPLOAD_INTERVAL_MS;
  writeSiyuanUploadState(id, state);
  try {
    await siyuanRequest('/api/asset/uploadCloudByAssetsPaths', { paths: [`assets/${filename}`], ignorePushMsg: true });
  } catch (error) {
    if (/too many asset uploads|retry in one minute/i.test(error instanceof Error ? error.message : String(error))) {
      state.nextAllowedAt = Date.now() + SIYUAN_UPLOAD_INTERVAL_MS;
      writeSiyuanUploadState(id, state);
      throw new CalendarCloudCooldownError(state.nextAllowedAt);
    }
    throw error;
  }
  const publishedAt = new Date().toISOString();
  if (digest) {
    state.files[filename] = { digest, publishedAt };
    const oldest = Object.keys(state.files).sort((left, right) => Date.parse(state.files[left].publishedAt) - Date.parse(state.files[right].publishedAt));
    for (const name of oldest.slice(0, Math.max(0, oldest.length - 20))) delete state.files[name];
  }
  writeSiyuanUploadState(id, state);
  return { url, publishedAt };
}

async function performCloudPublish(config: CalendarCloudConfig, ics: string): Promise<CalendarCloudPublishResult> {
  calendarCloudFileName(config.fileName);
  try {
    if (config.method === 'webdav') return await publishWebdav(config, ics);
    if (config.method === 's3') return await publishS3(config, ics);
    return await publishSiyuan(config, ics);
  } catch (error) {
    throw sanitizedCloudError(config, error);
  }
}

function sanitizedCloudError(config: CalendarCloudConfig, error: unknown): Error {
  let message = error instanceof Error ? error.message : String(error);
  let resolved = config;
  try { if (config.method === 's3') resolved = resolveCalendarS3Config(config); } catch { /* Retain the original configuration error. */ }
  for (const secret of [resolved.s3AccessKeyId, resolved.s3AccessKeySecret, config.webdavUsername, config.webdavPassword]) {
    if (secret) message = message.split(secret).join('[redacted]');
  }
  message = message.replace(/https?:\/\/[^\s]+/gi, '[service URL]')
    .replace(/\b(?:Basic|Bearer)\s+[a-z\d+/=._-]+/gi, '[redacted authorization]');
  const sanitized = new Error(message.slice(0, 400));
  return error instanceof CalendarCloudCooldownError ? Object.assign(sanitized, { retryAt: error.retryAt }) : sanitized;
}

const cloudUploads = new Map<string, { ics: string; promise: Promise<CalendarCloudPublishResult> }>();

export function publishCalendarCloud(config: CalendarCloudConfig, ics: string): Promise<CalendarCloudPublishResult> {
  const key = JSON.stringify(config);
  const pending = cloudUploads.get(key);
  if (pending?.ics === ics) return pending.promise;
  const upload = async () => navigator.locks?.request
    ? await navigator.locks.request('pinch-calendar-cloud-publish', async () => performCloudPublish(config, ics))
    : performCloudPublish(config, ics);
  const promise = pending
    ? pending.promise.catch(() => undefined).then(upload)
    : upload();
  cloudUploads.set(key, { ics, promise });
  const release = () => { if (cloudUploads.get(key)?.promise === promise) cloudUploads.delete(key); };
  void promise.then(release, release);
  return promise;
}

/** Read-only connection checks; no probe objects or calendar events are created. */
async function checkCalendarCloudConnection(input: CalendarCloudConfig): Promise<void> {
  if (input.method === 'siyuan') { siyuanUserId(); return; }
  if (input.method === 'webdav') {
    if (!await webdavCollectionExists(input, webdavDirectory(input))) {
      throw new Error('WebDAV 目录不存在（HTTP 404）；请核对 WebDAV 入口地址，上传时会尝试在已有 WebDAV 父目录下创建缺失目录');
    }
    return;
  }
  const config = resolveCalendarS3Config(input);
  const client = s3Client(config);
  try {
    const url = await getSignedUrl(client, new HeadBucketCommand({ Bucket: config.s3Bucket }), { expiresIn: 900 });
    const response = await calendarHttpRequest({ url, method: 'HEAD', transport: config.transport });
    assertRemoteSuccess(response.status, 'S3 连接失败（检查 Bucket 访问权限）');
  } finally { client.destroy(); }
}

export async function testCalendarCloudConnection(config: CalendarCloudConfig): Promise<void> {
  try { await checkCalendarCloudConnection(config); } catch (error) { throw sanitizedCloudError(config, error); }
}
