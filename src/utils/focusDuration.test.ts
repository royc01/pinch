import { describe, expect, it } from 'vitest';
import {
  CUSTOM_FOCUS_DURATION_INDEX,
  DEFAULT_FOCUS_DURATION_INDEX,
  DEFAULT_FOCUS_DURATION_MINUTES,
  FOCUS_DURATION_OPTIONS,
  getFocusDurationOptionIndex,
  normalizeFocusDuration
} from './focusDuration';

describe('focus duration helpers', () => {
  it('normalizes custom durations to whole minutes within the supported range', () => {
    expect(normalizeFocusDuration(0)).toBe(1);
    expect(normalizeFocusDuration(40.6)).toBe(41);
    expect(normalizeFocusDuration(900)).toBe(720);
    expect(normalizeFocusDuration('90')).toBe(90);
    expect(normalizeFocusDuration('invalid')).toBe(DEFAULT_FOCUS_DURATION_MINUTES);
  });

  it('uses preset indices for presets and the custom index for other durations', () => {
    expect(getFocusDurationOptionIndex(25)).toBe(DEFAULT_FOCUS_DURATION_INDEX);
    expect(getFocusDurationOptionIndex(40)).toBe(CUSTOM_FOCUS_DURATION_INDEX);
  });

  it('omits the removed 10 and 30 minute presets', () => {
    expect(FOCUS_DURATION_OPTIONS).toEqual([5, 15, 25, 45, 60, 'custom', 'unlimited']);
  });
});
