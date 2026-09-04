import type { FocusTimerLinkedTarget } from '@/utils/focusTimerTarget';

const STORAGE_KEY = 'pinch.focus-timer.target-presets.v1';
const MAX_PRESETS = 12;

function isValidTarget(value: unknown): value is FocusTimerLinkedTarget {
  if (!value || typeof value !== 'object') return false;
  const target = value as Partial<FocusTimerLinkedTarget>;
  return (target.type === 'habit' || target.type === 'task' || target.type === 'tag')
    && typeof target.id === 'string'
    && typeof target.name === 'string';
}

export function getFocusTimerTargetPresetKey(target: Pick<FocusTimerLinkedTarget, 'type' | 'id'>): string {
  return `${target.type}:${target.id}`;
}

export function loadFocusTimerTargetPresets(): FocusTimerLinkedTarget[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    const seen = new Set<string>();
    return raw.filter(isValidTarget).filter(target => {
      const key = getFocusTimerTargetPresetKey(target);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, MAX_PRESETS);
  } catch {
    return [];
  }
}

export function saveFocusTimerTargetPreset(target: FocusTimerLinkedTarget, enabled: boolean): FocusTimerLinkedTarget[] {
  const key = getFocusTimerTargetPresetKey(target);
  const existing = loadFocusTimerTargetPresets().filter(item => getFocusTimerTargetPresetKey(item) !== key);
  const next = enabled ? [target, ...existing].slice(0, MAX_PRESETS) : existing;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}
