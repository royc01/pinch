export function isMissingPluginStorageValue(value: unknown): boolean {
  return value === null
    || value === undefined
    || (typeof value === 'string' && value.trim().length === 0);
}

/** Returns true for the expected storage rejection during plugin unload/reload. */
export function isPluginLifecycleEndedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const detail = error as { code?: unknown; msg?: unknown; message?: unknown };
  return detail.code === 410
    && /plugin lifecycle has ended/i.test(String(detail.msg ?? detail.message ?? ''));
}
