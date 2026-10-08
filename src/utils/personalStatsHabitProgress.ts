import type { Habit } from '@/api';
import { getWeekStart, getWeeklyTarget, isHabitScheduledOnDate } from '@/composables/useHabitUtils';
import { addSummaryDays, formatSummaryDateKey, startOfSummaryDay, summaryDateKey } from '@/utils/personalStatsSummary';

export function getHabitDayProgress(habit: Habit, date: string) {
  const record = habit.calendar.find(entry => entry.date === date);
  const configuredTarget = Number(record?.targetCount || habit.timesPerDay || 1);
  const target = Number.isFinite(configuredTarget) ? Math.max(1, Math.min(20, Math.round(configuredTarget))) : 1;
  const completed = Math.max(0, Number.isFinite(record?.completedCount)
    ? record!.completedCount! : record?.completed ? target : 0);
  return { completed, target, fulfilled: completed >= target };
}

export function isWorkbenchHabitScheduled(habit: Habit, date: Date): boolean {
  let created = summaryDateKey(habit.createdAt);
  // A saved backfill is evidence that the habit was already active on that date.
  for (const entry of habit.calendar) {
    if (entry.completed || (Number.isFinite(entry.completedCount) && entry.completedCount! > 0)) {
      if (!created || entry.date < created) created = entry.date;
    }
  }
  return !habit.isPaused && (!created || formatSummaryDateKey(date) >= created)
    && isHabitScheduledOnDate(habit, date);
}

export function getWorkbenchWeekProgress(habit: Habit, date: Date) {
  const start = getWeekStart(date);
  const end = addSummaryDays(start, 7);
  const startKey = formatSummaryDateKey(start);
  const endKey = formatSummaryDateKey(end);
  const eligibleDates: string[] = [];
  for (let day = new Date(start); day < end; day = addSummaryDays(day, 1)) {
    if (isWorkbenchHabitScheduled(habit, day)) eligibleDates.push(formatSummaryDateKey(day));
  }
  const completed = habit.calendar.filter(entry => entry.date >= startKey && entry.date < endKey
    && eligibleDates.includes(entry.date) && entry.date <= formatSummaryDateKey(date)
    && getHabitDayProgress(habit, entry.date).fulfilled).length;
  const target = Math.min(getWeeklyTarget(habit.frequency), eligibleDates.length);
  return { completed, target, fulfilled: completed >= target };
}

/** Raw check-ins and fulfilled schedule targets are distinct, especially for multi-check-in and weekly habits. */
export function summarizeWorkbenchHabit(habit: Habit, start: Date, endExclusive: Date, today: Date) {
  const startKey = formatSummaryDateKey(start);
  const endKey = formatSummaryDateKey(endExclusive);
  const todayKey = formatSummaryDateKey(today);
  const completions = habit.calendar.filter(entry => entry.date >= startKey && entry.date < endKey && entry.date <= todayKey)
    .reduce((sum, entry) => sum + getHabitDayProgress(habit, entry.date).completed, 0);
  let target = 0;
  let fulfilled = 0;
  let streak = 0;
  let longest = 0;
  const missedDates: string[] = [];
  const cutoff = Math.min(endExclusive.getTime(), addSummaryDays(startOfSummaryDay(today), 1).getTime());
  if (habit.frequency.startsWith('weekly')) {
    // Evaluate whole weekly goals for every covered week; a partial current week is never a missed week.
    for (let week = getWeekStart(start); week.getTime() < cutoff; week = addSummaryDays(week, 7)) {
      const weekEnd = addSummaryDays(week, 7);
      const eligibleDates: string[] = [];
      for (let date = new Date(week); date < weekEnd; date = addSummaryDays(date, 1)) {
        if (isWorkbenchHabitScheduled(habit, date)) eligibleDates.push(formatSummaryDateKey(date));
      }
      const weekTarget = Math.min(getWeeklyTarget(habit.frequency), eligibleDates.length);
      if (!weekTarget) continue;
      const completedDays = eligibleDates.filter(key => key <= todayKey && key < endKey && getHabitDayProgress(habit, key).fulfilled).length;
      target += weekTarget;
      fulfilled += Math.min(weekTarget, completedDays);
      if (completedDays >= weekTarget) {
        streak += weekTarget;
        longest = Math.max(longest, streak);
      } else {
        streak = 0;
        if (weekEnd <= startOfSummaryDay(today) && weekEnd <= endExclusive) missedDates.push(formatSummaryDateKey(week));
      }
    }
  } else {
    for (let date = startOfSummaryDay(start); date.getTime() < cutoff; date = addSummaryDays(date, 1)) {
      if (!isWorkbenchHabitScheduled(habit, date)) continue;
      const key = formatSummaryDateKey(date);
      const progress = getHabitDayProgress(habit, key);
      target += 1;
      fulfilled += Math.min(1, progress.completed / progress.target);
      if (progress.fulfilled) {
        streak += 1;
        longest = Math.max(longest, streak);
      } else {
        streak = 0;
        if (key < todayKey) missedDates.push(key);
      }
    }
  }
  return { completions, target, fulfilled, rate: target ? Math.round(fulfilled / target * 100) : 0, streak: longest, missedDates };
}
