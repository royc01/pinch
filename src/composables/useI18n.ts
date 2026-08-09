import enUS from '@/i18n/en_US.json';
import zhCN from '@/i18n/zh_CN.json';

type LocaleMessages = Record<string, unknown>;
export type TemplateValues = Record<string, string | number>;

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
  const candidates = [
    getMessageValue(bundledMessages[currentLocale], key),
    getMessageValue(siyuanMessages, key),
    getMessageValue(bundledMessages.zh_CN, key),
    getMessageValue(bundledMessages.en_US, key),
    fallback
  ];

  return candidates.find(candidate => candidate !== undefined) ?? key;
}

export function interpolateTemplate(template: string, values: TemplateValues): string {
  return Object.entries(values).reduce(
    (result, [name, value]) => result.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value)),
    template
  );
}

export function formatTemplate(key: string, values: TemplateValues, fallback?: string): string {
  return interpolateTemplate(translate(key, fallback), values);
}

export function useI18n() {
  return { t: translate };
}
