import enUS from '@/i18n/en_US.json';
import zhCN from '@/i18n/zh_CN.json';

type LocaleMessages = Record<string, unknown>;

const bundledMessages: Record<string, LocaleMessages> = {
  en_US: enUS,
  zh_CN: zhCN,
};

function getMessageValue(messages: LocaleMessages | undefined, key: string): string | undefined {
  if (!messages) {
    return undefined;
  }

  const directValue = messages[key];
  if (typeof directValue === 'string') {
    return directValue;
  }

  const nestedValue = key
    .split('.')
    .reduce<unknown>((current, segment) => {
      if (!current || typeof current !== 'object') {
        return undefined;
      }
      return (current as Record<string, unknown>)[segment];
    }, messages);

  return typeof nestedValue === 'string' ? nestedValue : undefined;
}

function normalizeLocale(locale: unknown): string {
  if (typeof locale !== 'string' || locale.trim().length === 0) {
    return 'zh_CN';
  }

  const normalized = locale.replace('-', '_');
  const lowerLocale = normalized.toLowerCase();
  if (lowerLocale.startsWith('zh')) {
    return 'zh_CN';
  }
  if (lowerLocale.startsWith('en')) {
    return 'en_US';
  }
  return normalized;
}

function getCurrentLocale(): string {
  const siyuan = window.siyuan as any;
  return normalizeLocale(
    siyuan?.config?.appearance?.lang
      || siyuan?.config?.lang
      || navigator.language
  );
}

export function translate(key: string, fallback?: string): string {
  const siyuanMessages = window.siyuan?.languages as LocaleMessages | undefined;
  const currentLocale = getCurrentLocale();

  return getMessageValue(siyuanMessages, key)
    || getMessageValue(bundledMessages[currentLocale], key)
    || getMessageValue(bundledMessages.zh_CN, key)
    || getMessageValue(bundledMessages.en_US, key)
    || fallback
    || key;
}

export function useI18n() {
  return { t: translate };
}
