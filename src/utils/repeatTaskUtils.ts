import type { Task } from '@/api';
import { formatDate } from '@/composables/useDateUtils';

export function isRepeatTask(task: Task | null | undefined): boolean {
  const seriesId = typeof task?.repeatSeriesId === 'string' ? task.repeatSeriesId.trim() : '';
  return !!task && (!!seriesId || (!!task.repeatFrequency && task.repeatFrequency !== 'none'));
}

export function getDayDiff(fromDate: string, toDate: string): number {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  from.setHours(0, 0, 0, 0);
  to.setHours(0, 0, 0, 0);
  return Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

export function shiftDate(dateStr: string, deltaDays: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + deltaDays);
  return formatDate(date);
}

export function belongsToRepeatSeries(task: Task, seriesId: string, templateBlockId?: string): boolean {
  return task.repeatSeriesId === seriesId
    || (
      !task.isVirtual
      && !!templateBlockId
      && task.blockId === templateBlockId
    );
}

/** Chooses the one recurrence instance a list view should surface per series. */
export function selectVisibleRepeatInstanceIds(
  tasks: Task[],
  todayStart: number,
  isCurrent: (task: Task) => boolean,
  getStartTimestamp: (task: Task) => number | null,
  getDueTimestamp: (task: Task) => number | null
): Set<string> {
  type Instance = { task: Task; start: number; due: number };
  const currentSeriesIds = new Set<string>();
  const currentIds = new Set<string>();
  const latestPastBySeries = new Map<string, Instance>();
  const nextBySeries = new Map<string, Instance>();

  for (const task of tasks) {
    const seriesId = typeof task.repeatSeriesId === 'string' ? task.repeatSeriesId.trim() : '';
    if (!task.isVirtual || !seriesId) continue;
    if (isCurrent(task)) {
      currentSeriesIds.add(seriesId);
      currentIds.add(task.id);
      continue;
    }

    const start = getStartTimestamp(task);
    const due = getDueTimestamp(task) ?? start;
    if (start === null || due === null) continue;
    const instance = { task, start, due };
    if (due < todayStart) {
      const previous = latestPastBySeries.get(seriesId);
      if (!previous || instance.start > previous.start) latestPastBySeries.set(seriesId, instance);
    } else if (start > todayStart) {
      const previous = nextBySeries.get(seriesId);
      if (!previous || instance.start < previous.start) nextBySeries.set(seriesId, instance);
    }
  }

  const visibleIds = new Set(currentIds);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const seriesIds = new Set([...latestPastBySeries.keys(), ...nextBySeries.keys()]);
  for (const seriesId of seriesIds) {
    if (currentSeriesIds.has(seriesId)) continue;
    const previous = latestPastBySeries.get(seriesId);
    const next = nextBySeries.get(seriesId);

    // An unfinished past instance stays visible until the next instance starts.
    if (previous && previous.task.status !== 'completed' && previous.task.status !== 'cancelled') {
      visibleIds.add(previous.task.id);
    } else if (!previous && next) {
      // The first occurrence is visible even before its scheduled date.
      visibleIds.add(next.task.id);
    } else if (previous && next && next.start - todayStart <= 7 * millisecondsPerDay) {
      visibleIds.add(next.task.id);
    } else if (previous) {
      visibleIds.add(previous.task.id);
    }
  }
  return visibleIds;
}
