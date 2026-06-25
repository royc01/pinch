const DEFAULT_INTL_LOCALE = 'zh-CN';

export function normalizeIntlLocaleTag(locale: unknown, fallback = DEFAULT_INTL_LOCALE): string {
  if (typeof locale !== 'string') {
    return fallback;
  }

  const normalized = locale.trim().replace(/_/g, '-');
  if (!normalized) {
    return fallback;
  }

  try {
    return Intl.getCanonicalLocales(normalized)[0] || fallback;
  } catch {
    return fallback;
  }
}

export function getSiyuanIntlLocaleTag(fallback = DEFAULT_INTL_LOCALE): string {
  const siyuan = window.siyuan as any;
  return normalizeIntlLocaleTag(
    siyuan?.config?.appearance?.lang
      || siyuan?.config?.lang
      || (typeof navigator !== 'undefined' ? navigator.language : fallback),
    fallback
  );
}
