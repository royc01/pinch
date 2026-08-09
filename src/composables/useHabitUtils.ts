import type { Habit } from '@/api';
import { formatTemplate, translate } from '@/composables/useI18n';
import solarLunar from '@/utils/solarLunar.js';

export function formatTimelineDate(date: Date | null): string {
  if (!date) return '';
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
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

function getLocalDateParts(date: Date): { dayOfWeek: number; dayOfMonth: number; monthDay: string } {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return {
    dayOfWeek: date.getDay(),
    dayOfMonth: date.getDate(),
    monthDay: `${month}-${day}`
  };
}

function getLunarDateParts(date: Date): { dayOfMonth: number; monthDay: string; isLeap: boolean } | null {
  const lunarData = solarLunar.solar2lunar(date.getFullYear(), date.getMonth() + 1, date.getDate());
  if (lunarData === -1) {
    return null;
  }

  const month = String(lunarData.lMonth).padStart(2, '0');
  const day = String(lunarData.lDay).padStart(2, '0');
  return {
    dayOfMonth: lunarData.lDay,
    monthDay: `${month}-${day}`,
    isLeap: !!lunarData.isLeap
  };
}

export function isHabitScheduledOnDate(habit: Habit, date: Date): boolean {
  if (habit.frequency !== 'custom') {
    return true;
  }

  const schedule = habit.customSchedule;
  if (!schedule) {
    return true;
  }

  const { dayOfWeek, dayOfMonth, monthDay } = getLocalDateParts(date);
  const useLunar = schedule.calendar === 'lunar' && (schedule.type === 'month' || schedule.type === 'year');

  if (schedule.type === 'month') {
    const dateParts = useLunar ? getLunarDateParts(date) : { dayOfMonth };
    return !!dateParts && Array.isArray(schedule.monthDays) && schedule.monthDays.includes(dateParts.dayOfMonth);
  }

  if (schedule.type === 'year') {
    const dateParts = useLunar ? getLunarDateParts(date) : { monthDay, isLeap: false };
    return !!dateParts
      && !dateParts.isLeap
      && Array.isArray(schedule.yearDays)
      && schedule.yearDays.includes(dateParts.monthDay);
  }

  return Array.isArray(schedule.weekDays) && schedule.weekDays.includes(dayOfWeek);
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
  const dailyTemplateKey = habit.completionMode === 'atLeast'
    ? 'habitTracker.frequencyDailyAtLeastTemplate'
    : 'habitTracker.frequencyDailyTemplate';
  const weeklyTemplateKey = habit.completionMode === 'atLeast'
    ? 'habitTracker.frequencyWeeklyAtLeastTemplate'
    : 'habitTracker.frequencyWeeklyTemplate';

  if (!habit.frequency || habit.frequency === 'daily') {
    return formatTemplate(dailyTemplateKey, { count: timesPerDay });
  }

  const match = habit.frequency.match(/weekly(\d)/);
  if (match) {
    return formatTemplate(weeklyTemplateKey, {
      days: match[1],
      count: timesPerDay
    });
  }

  if (habit.frequency === 'custom' && (habit as any).customFrequency) {
    return formatTemplate(weeklyTemplateKey, {
      days: (habit as any).customFrequency,
      count: timesPerDay
    });
  }

  if (habit.frequency === 'custom' && habit.customSchedule) {
    const typeKey = `habitTracker.customScheduleType${habit.customSchedule.type[0].toUpperCase()}${habit.customSchedule.type.slice(1)}`;
    const calendarText = habit.customSchedule.calendar === 'lunar'
      ? `${translate('habitTracker.customScheduleCalendarLunar')} · `
      : '';
    return `${calendarText}${translate(typeKey)} | ${formatTemplate(dailyTemplateKey, { count: timesPerDay })}`;
  }

  return formatTemplate(dailyTemplateKey, { count: timesPerDay });
}

export function getCreatedDateText(habit: Habit): string {
  if (!habit.createdAt) return '';
  const date = new Date(habit.createdAt);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return formatTemplate('habitTracker.createdOnTemplate', {
    date: `${year}-${month}-${day}`
  });
}
