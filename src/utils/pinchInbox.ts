import enUS from '@/i18n/en_US.json';
import zhCN from '@/i18n/zh_CN.json';

export const PINCH_INBOX_OPTION_ID = '__pinch_inbox__';
export const PINCH_DAILY_NOTE_OPTION_ID = '__pinch_daily_note__';

function normalizeInboxToken(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.replace(/^\/+/, '').trim();
}

const PINCH_INBOX_NAME_SET = new Set(
  [
    normalizeInboxToken(zhCN['taskManager.pinchInbox']),
    normalizeInboxToken(enUS['taskManager.pinchInbox']),
  ].filter(Boolean)
);

export const PINCH_INBOX_PATH = `/${normalizeInboxToken(zhCN['taskManager.pinchInbox']) || 'pinch-inbox'}`;

export function isPinchInboxValue(value: unknown): boolean {
  const normalized = normalizeInboxToken(value);
  return normalized.length > 0 && PINCH_INBOX_NAME_SET.has(normalized);
}
