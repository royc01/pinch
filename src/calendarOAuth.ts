import type { CalendarProvider, CalendarSyncConfig } from '@/calendarSyncTypes';

interface OAuthTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
}

export interface CalendarOAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
}

const CALLBACK_MESSAGE = 'pinch-calendar-oauth-callback';
const PENDING_KEY = 'pinch:calendar-oauth-pending-v1';

function randomString(size = 32): string {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
}

function base64Url(bytes: ArrayBuffer): string {
  let value = '';
  for (const byte of new Uint8Array(bytes)) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function redirectUri(): string {
  return `${window.location.origin}${window.location.pathname}`;
}

function providerDetails(provider: CalendarProvider): { authorization: string; token: string; scopes: string[] } {
  if (provider === 'google') return {
    authorization: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/calendar']
  };
  if (provider === 'microsoft') return {
    authorization: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    token: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes: ['openid', 'profile', 'offline_access', 'Calendars.ReadWrite']
  };
  throw new Error('OAuth is available for Google Calendar and Microsoft 365 only');
}

function finishCallback(): void {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('code') && !params.has('error')) return;
  const state = params.get('state') || '';
  if (!window.opener || !state) return;
  window.opener.postMessage({
    type: CALLBACK_MESSAGE,
    state,
    code: params.get('code'),
    error: params.get('error'),
    errorDescription: params.get('error_description')
  }, window.location.origin);
  window.setTimeout(() => window.close(), 100);
}

finishCallback();

async function exchangeCode(provider: CalendarProvider, clientId: string, code: string, verifier: string): Promise<CalendarOAuthTokens> {
  const details = providerDetails(provider);
  const body = new URLSearchParams({
    client_id: clientId,
    code,
    code_verifier: verifier,
    redirect_uri: redirectUri(),
    grant_type: 'authorization_code'
  });
  const response = await fetch(details.token, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const data = await response.json() as OAuthTokenResponse;
  if (!response.ok || !data.access_token) throw new Error(data.error_description || data.error || `OAuth token exchange failed (HTTP ${response.status})`);
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + Math.max(60, data.expires_in || 3600) * 1000).toISOString()
  };
}

export async function authorizeCalendarProvider(provider: CalendarProvider, clientId: string): Promise<CalendarOAuthTokens> {
  if (!clientId.trim()) throw new Error('请先填写 OAuth Client ID');
  const details = providerDetails(provider);
  const state = randomString();
  const verifier = randomString(48);
  const challenge = base64Url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  sessionStorage.setItem(PENDING_KEY, JSON.stringify({ state, verifier, provider, clientId }));
  const url = new URL(details.authorization);
  url.search = new URLSearchParams({
    client_id: clientId.trim(),
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: details.scopes.join(' '),
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    ...(provider === 'google' ? { access_type: 'offline', prompt: 'consent' } : {})
  }).toString();
  const popup = window.open(url.toString(), 'pinch-calendar-oauth', 'popup,width=560,height=720');
  if (!popup) throw new Error('OAuth 窗口被浏览器拦截，请允许弹出窗口后重试');
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener('message', onMessage);
      reject(new Error('OAuth 授权超时'));
    }, 5 * 60 * 1000);
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== CALLBACK_MESSAGE || event.data.state !== state) return;
      window.clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      sessionStorage.removeItem(PENDING_KEY);
      if (event.data.error) reject(new Error(event.data.errorDescription || event.data.error));
      else if (!event.data.code) reject(new Error('OAuth 未返回授权码'));
      else exchangeCode(provider, clientId.trim(), event.data.code, verifier).then(resolve, reject);
    };
    window.addEventListener('message', onMessage);
  });
}

export async function refreshCalendarProviderToken(config: CalendarSyncConfig): Promise<CalendarOAuthTokens> {
  const provider = config.provider || 'caldav';
  const details = providerDetails(provider);
  if (!config.oauthClientId || !config.oauthRefreshToken) throw new Error('OAuth 登录已失效，请重新授权');
  const body = new URLSearchParams({ client_id: config.oauthClientId, refresh_token: config.oauthRefreshToken, grant_type: 'refresh_token' });
  const response = await fetch(details.token, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const data = await response.json() as OAuthTokenResponse;
  if (!response.ok || !data.access_token) throw new Error(data.error_description || data.error || `OAuth token refresh failed (HTTP ${response.status})`);
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || config.oauthRefreshToken,
    expiresAt: new Date(Date.now() + Math.max(60, data.expires_in || 3600) * 1000).toISOString()
  };
}
