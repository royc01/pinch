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
