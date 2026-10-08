import type { Habit, Task } from '@/api';
import { getWeekStart, getWeeklyTarget, isHabitScheduledOnDate } from '@/composables/useHabitUtils';

export type SummaryPeriodKind = 'week' | 'month';

export interface SummaryPeriod {
  kind: SummaryPeriodKind;
  offset: number;
  start: Date;
  end: Date;
  effectiveEnd: Date;
  previousStart: Date;
  previousEnd: Date;
}

export interface SummaryTaskData {
  completedTasks: Task[];
  createdTaskCount: number;
  unfinishedCreatedTasks: Task[];
  previousCompletedCount: number;
}

export interface SummaryHabitStats {
  completed: number;
  target: number;
}

export interface SummaryPeriodEntry {
  key: string;
  start: Date;
  end: Date;
  number: number;
  offset: number;
  future: boolean;
}

export function getSummaryPeriodYear(kind: SummaryPeriodKind, start: Date): number {
  return (kind === 'week' ? addSummaryDays(start, 3) : start).getFullYear();
}

export function buildSummaryPeriodList(kind: SummaryPeriodKind, year: number, now = new Date()): SummaryPeriodEntry[] {
  const currentStart = buildSummaryPeriod(kind, 0, now).start;
  // ISO week years start with the Monday of the week containing January 4.
  const start = kind === 'month' ? new Date(year, 0, 1) : buildSummaryPeriod('week', 0, new Date(year, 0, 4)).start;
  const limit = kind === 'month' ? new Date(year + 1, 0, 1) : buildSummaryPeriod('week', 0, new Date(year + 1, 0, 4)).start;
  const entries: SummaryPeriodEntry[] = [];
  let cursor = start;
  while (cursor < limit) {
    const end = kind === 'month' ? new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1) : addSummaryDays(cursor, 7);
    const offset = kind === 'month'
      ? (cursor.getFullYear() - currentStart.getFullYear()) * 12 + cursor.getMonth() - currentStart.getMonth()
      : Math.round((Date.UTC(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()) - Date.UTC(currentStart.getFullYear(), currentStart.getMonth(), currentStart.getDate())) / (7 * 86400000));
    entries.push({ key: `${kind}:${formatSummaryDateKey(cursor)}`, start: cursor, end, number: entries.length + 1, offset, future: offset > 0 });
    cursor = end;
  }
  return entries;
}

export function getSummaryPeriodKeyFromPath(path: string): string | null {
  const match = /^\/Pinch\/(?:summaries\/)?(周|week|月|month)-(\d{4}-\d{2}-\d{2})$/.exec(path);
  if (!match) return null;
  const dateKey = summaryDateKey(match[2]);
  if (dateKey !== match[2]) return null;
  const kind: SummaryPeriodKind = match[1] === '周' || match[1] === 'week' ? 'week' : 'month';
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (kind === 'month' ? day !== 1 : date.getDay() !== 1) return null;
  return `${kind}:${dateKey}`;
}

export function startOfSummaryDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function addSummaryDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function formatSummaryDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function summaryDateKey(value: string | undefined): string {
  if (!value?.trim()) return '';
  const trimmed = value.trim();
  const plainDate = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const parsed = plainDate
    ? new Date(Number(plainDate[1]), Number(plainDate[2]) - 1, Number(plainDate[3]))
    : new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? '' : formatSummaryDateKey(startOfSummaryDay(parsed));
}

export function isSummaryDateInPeriod(value: string | undefined, start: Date, end: Date): boolean {
  const key = summaryDateKey(value);
  return !!key && key >= formatSummaryDateKey(start) && key < formatSummaryDateKey(end);
}

export function buildSummaryPeriod(kind: SummaryPeriodKind, offset = 0, now = new Date()): SummaryPeriod {
  const today = startOfSummaryDay(now);
  const start = kind === 'month'
    ? new Date(today.getFullYear(), today.getMonth() + offset, 1)
    : addSummaryDays(addSummaryDays(today, today.getDay() === 0 ? -6 : 1 - today.getDay()), offset * 7);
  const end = kind === 'month'
    ? new Date(start.getFullYear(), start.getMonth() + 1, 1)
    : addSummaryDays(start, 7);
  const previousStart = kind === 'month'
    ? new Date(start.getFullYear(), start.getMonth() - 1, 1)
    : addSummaryDays(start, -7);
  const todayEnd = addSummaryDays(today, 1);
  const effectiveEnd = offset === 0 && todayEnd < end ? todayEnd : end;
  return { kind, offset, start, end, effectiveEnd, previousStart, previousEnd: start };
}

function isSummaryTask(task: Task): boolean {
  return task.type === 'block' && task.isVirtual !== true;
}

export function buildSummaryTaskData(tasks: Task[], period: SummaryPeriod): SummaryTaskData {
  const completedTasks = tasks
    .filter(task => isSummaryTask(task) && task.status === 'completed' && isSummaryDateInPeriod(task.completedAt, period.start, period.end))
    .sort((left, right) => summaryDateKey(right.completedAt).localeCompare(summaryDateKey(left.completedAt)));
  const createdTaskCount = tasks.filter(task => isSummaryTask(task) && isSummaryDateInPeriod(task.createdAt, period.start, period.end)).length;
  const unfinishedCreatedTasks = tasks
    .filter(task => isSummaryTask(task)
      && task.archived !== true
      && task.status !== 'cancelled'
      && isSummaryDateInPeriod(task.createdAt, period.start, period.end)
      && (!task.completedAt || summaryDateKey(task.completedAt) >= formatSummaryDateKey(period.end)))
    .sort((left, right) => summaryDateKey(left.dueDate).localeCompare(summaryDateKey(right.dueDate)));
  const previousCompletedCount = tasks.filter(task => isSummaryTask(task)
    && task.status === 'completed'
    && isSummaryDateInPeriod(task.completedAt, period.previousStart, period.previousEnd)).length;
  return { completedTasks, createdTaskCount, unfinishedCreatedTasks, previousCompletedCount };
}

function getHabitDefaultTarget(habit: Habit): number {
  return typeof habit.timesPerDay === 'number' && Number.isFinite(habit.timesPerDay) && habit.timesPerDay > 0
    ? habit.timesPerDay
    : 1;
}

export function buildSummaryHabitStats(habits: Habit[], period: SummaryPeriod): SummaryHabitStats {
  const days: Date[] = [];
  const cursor = new Date(period.start);
  while (cursor < period.effectiveEnd) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  let completed = 0;
  let target = 0;
  habits.filter(habit => habit.isPaused !== true).forEach((habit) => {
    const createdAt = summaryDateKey(habit.createdAt);
    const activeDays = days.filter(day => (!createdAt || formatSummaryDateKey(day) >= createdAt) && isHabitScheduledOnDate(habit, day));
    const completionByDate = new Map(habit.calendar.map(entry => [
      entry.date,
      Math.max(0, entry.completedCount ?? (entry.completed ? 1 : 0))
    ]));
    activeDays.forEach(day => {
      completed += completionByDate.get(formatSummaryDateKey(day)) || 0;
    });

    if (habit.frequency.startsWith('weekly')) {
      const coveredWeeks = new Set(activeDays.map(day => formatSummaryDateKey(getWeekStart(day))));
      target += coveredWeeks.size * getWeeklyTarget(habit.frequency);
      return;
    }

    activeDays.forEach(day => {
      const entry = habit.calendar.find(item => item.date === formatSummaryDateKey(day));
      const entryTarget = entry?.targetCount;
      target += typeof entryTarget === 'number' && Number.isFinite(entryTarget) && entryTarget > 0
        ? entryTarget
        : getHabitDefaultTarget(habit);
    });
  });
  return { completed, target };
}
