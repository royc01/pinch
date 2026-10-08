import type { TaskFetchOptions, TaskRepeatWindow } from '@/api';
import type { TaskViewSwitcherId } from './userSettings';

export type TaskLoadMode = 'full' | 'full-with-repeats' | 'light-base';

export function resolveTaskLoadModeForView(view: TaskViewSwitcherId): TaskLoadMode {
  if (view === 'month' || view === 'week' || view === 'day' || view === 'three-day') {
    return 'full-with-repeats';
  }
  // Statistics need the same authoritative task set as the board after reload.
  // A lightweight index is only a first-paint preview, not a completed stats load.
  return 'full';
}

export function isTaskLoadModeSatisfied(available: TaskLoadMode | null, requested: TaskLoadMode): boolean {
  if (!available) return false;
  const ranks: Record<TaskLoadMode, number> = { 'full': 2, 'full-with-repeats': 1, 'light-base': 0 };
  return ranks[available] >= ranks[requested];
}

export function buildTaskFetchOptionsForLoadMode(
  mode: TaskLoadMode,
  repeatWindow: TaskRepeatWindow | null = null
): TaskFetchOptions {
  if (mode === 'light-base') {
    return { useLiveDom: false, detailLevel: 'light', materializeRepeats: false };
  }
  return {
    useLiveDom: false,
    detailLevel: 'full',
    repeatWindow: repeatWindow ?? undefined,
    includeRepeatTemplateDate: true
  };
}

export function buildCalendarLifelogFetchOptions(repeatWindow: TaskRepeatWindow): TaskFetchOptions {
  return {
    useLiveDom: false,
    detailLevel: 'full',
    repeatWindow,
    includeRepeatTemplateDate: true,
    includeCompletedRepeatInstancesByCompletionDate: true
  };
}
