import type { Habit } from '@/api';
import { t } from '@/utils/i18n';

export function formatTimelineDate(date: Date | null): string {
  if (!date) return '';
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

export function createNumberOptions(count: number, key: string): Array<{ value: string; text: string }> {
  return Array.from({ length: count }, (_, index) => ({
    value: String(index + 1),
    text: t(key, { count: index + 1 })
  }));
}

export function getWeeklyTarget(frequency: string): number {
  if (!frequency.startsWith('weekly')) return 1;

  switch (frequency) {
    case 'weekly2':
      return 2;
    case 'weekly3':
      return 3;
    case 'weekly4':
      return 4;
    case 'weekly5':
      return 5;
    case 'weekly6':
      return 6;
    default:
      return 1;
  }
}

export function getWeekStart(date: Date): Date {
  const dayOfWeek = date.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() + daysToMonday);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

export function isSameWeek(date1: Date, date2: Date): boolean {
  return getWeekStart(date1).getTime() === getWeekStart(date2).getTime();
}

export function getWeekCompletionData(habit: Habit, startOfWeek: Date): {
  hasCompletedRequiredThisWeek: boolean;
  requiredWeekCompletions: number;
  completedThisWeek: number;
} {
  const completedThisWeek = habit.frequency.startsWith('weekly')
    ? habit.calendar.filter(day => day.completed && isSameWeek(new Date(day.date), startOfWeek)).length
    : 0;

  const requiredWeekCompletions = getWeeklyTarget(habit.frequency);
  const hasCompletedRequiredThisWeek = completedThisWeek >= requiredWeekCompletions;

  return {
    hasCompletedRequiredThisWeek,
    requiredWeekCompletions,
    completedThisWeek
  };
}

export function getCompletionCount(habit: Habit, date: string): number {
  const dayRecord = habit.calendar.find(day => day.date === date);
  return dayRecord ? (dayRecord.completedCount || 0) : 0;
}

export function getTodayCompletionCount(habit: Habit, getToday: () => string): number {
  return getCompletionCount(habit, getToday());
}

export function getFrequencyText(habit: Habit): string {
  const timesPerDay = habit.timesPerDay || 1;
  if (!habit.frequency || habit.frequency === 'daily') {
    return t('dailyXTimes', { count: timesPerDay });
  }

  const match = habit.frequency.match(/weekly(\d)/);
  if (match) {
    return t('weeklyXDaysYTimes', { days: match[1], times: timesPerDay });
  }

  if (habit.frequency === 'custom' && (habit as any).customFrequency) {
    return t('weeklyXDaysYTimes', { days: (habit as any).customFrequency, times: timesPerDay });
  }

  return t('dailyXTimes', { count: timesPerDay });
}

export function getCreatedDateText(habit: Habit): string {
  if (!habit.createdAt) return '';
  const date = new Date(habit.createdAt);
  return t('createdAtDate', {
    date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  });
}
