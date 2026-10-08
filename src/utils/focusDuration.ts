export const FOCUS_DURATION_MIN_MINUTES = 1;
export const FOCUS_DURATION_MAX_MINUTES = 720;
export const DEFAULT_FOCUS_DURATION_MINUTES = 25;
export const DEFAULT_CUSTOM_FOCUS_DURATION_MINUTES = 40;

export const FOCUS_DURATION_MARKS = [5, 15, 25, 45, 60] as const;

export type FocusDurationOption = number | 'custom' | 'unlimited';

export const FOCUS_DURATION_OPTIONS: readonly FocusDurationOption[] = [
  ...FOCUS_DURATION_MARKS,
  'custom',
  'unlimited'
];

export const CUSTOM_FOCUS_DURATION_INDEX = FOCUS_DURATION_OPTIONS.indexOf('custom');
export const UNLIMITED_FOCUS_DURATION_INDEX = FOCUS_DURATION_OPTIONS.indexOf('unlimited');
export const DEFAULT_FOCUS_DURATION_INDEX = FOCUS_DURATION_OPTIONS.indexOf(DEFAULT_FOCUS_DURATION_MINUTES);

export function normalizeFocusDuration(
  input: unknown,
  fallback: number = DEFAULT_FOCUS_DURATION_MINUTES
): number {
  const numericValue = typeof input === 'number' ? input : Number(input);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.max(
    FOCUS_DURATION_MIN_MINUTES,
    Math.min(Math.round(numericValue), FOCUS_DURATION_MAX_MINUTES)
  );
}

export function getFocusDurationOptionIndex(minutes: unknown): number {
  const normalized = normalizeFocusDuration(minutes);
  const presetIndex = FOCUS_DURATION_MARKS.indexOf(
    normalized as (typeof FOCUS_DURATION_MARKS)[number]
  );
  return presetIndex >= 0 ? presetIndex : CUSTOM_FOCUS_DURATION_INDEX;
}
