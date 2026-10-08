import { describe, expect, it } from 'vitest';
import type { Habit } from '@/api';
import { getHabitDayProgress, getWorkbenchWeekProgress, isWorkbenchHabitScheduled, summarizeWorkbenchHabit } from './personalStatsHabitProgress';

const date = (key: string) => new Date(`${key}T00:00:00`);
const day = (key: string, completedCount = 1, targetCount = 1) => ({ date: key, completedCount, targetCount, completed: completedCount >= targetCount });
const habit = (overrides: Partial<Habit> = {}): Habit => ({
  id: 'h', name: 'Habit', frequency: 'daily', difficulty: 'easy', calendar: [],
  createdAt: '2026-09-01T00:00:00', completedToday: false, currentStreak: 0, totalCompletions: 0, ...overrides
});
const summary = (item: Habit, start = '2026-10-05', end = '2026-10-09', today = '2026-10-08') => summarizeWorkbenchHabit(item, date(start), date(end), date(today));

describe('personalStatsHabitProgress', () => {
  it('excludes rest days from targets and keeps scheduled-day streaks continuous', () => {
    const item = habit({ frequency: 'custom', customSchedule: { type: 'week', weekDays: [1, 3] }, calendar: [day('2026-10-05'), day('2026-10-07')] });
    expect(summary(item)).toMatchObject({ completions: 2, target: 2, fulfilled: 2, rate: 100, streak: 2, missedDates: [] });
    expect(isWorkbenchHabitScheduled(item, date('2026-10-08'))).toBe(false);
  });
  it('counts partial daily progress without calling it a completed day or exceeding 100 percent', () => {
    const item = habit({ timesPerDay: 3, calendar: [day('2026-10-07', 1, 3), day('2026-10-08', 6, 3)] });
    expect(summary(item, '2026-10-07')).toMatchObject({ completions: 7, target: 2, rate: 67, streak: 1, missedDates: ['2026-10-07'] });
    expect(summary(item, '2026-10-08').rate).toBe(100);
  });
  it('uses completed days for weekly goals even when a habit needs multiple check-ins per day', () => {
    const item = habit({ frequency: 'weekly2', timesPerDay: 3, calendar: [day('2026-10-05', 3, 3), day('2026-10-06', 6, 3), day('2026-10-08', 1, 3)] });
    expect(summary(item)).toMatchObject({ completions: 10, target: 2, fulfilled: 2, rate: 100, streak: 2 });
    expect(getWorkbenchWeekProgress(item, date('2026-10-08'))).toEqual({ completed: 2, target: 2, fulfilled: true });
    expect(summary(item, '2026-10-08').rate).toBe(100);
  });
  it('does not count unfinished weeks or today as missed', () => {
    expect(summary(habit({ frequency: 'weekly2' }), '2026-09-28')).toMatchObject({ target: 4, missedDates: ['2026-09-28'] });
    expect(summary(habit(), '2026-10-08').missedDates).toEqual([]);
  });
  it('keeps raw historical check-ins but excludes currently paused habits from targets', () => {
    expect(summary(habit({ isPaused: true, calendar: [day('2026-10-05')] }))).toMatchObject({ completions: 1, target: 0, fulfilled: 0, rate: 0, missedDates: [] });
  });
  it('does not add future dates or dates before creation to daily targets', () => {
    expect(summary(habit({ createdAt: '2026-10-08T08:00:00', calendar: [day('2026-10-20')] }), '2026-10-01', '2026-11-01')).toMatchObject({ target: 1, completions: 0, missedDates: [] });
    expect(isWorkbenchHabitScheduled(habit({ createdAt: '2026-10-09T00:00:00' }), date('2026-10-08'))).toBe(false);
  });
  it('limits a newly created weekly target to the available days in that week', () => {
    const item = habit({ frequency: 'weekly6', createdAt: '2026-10-08T08:00:00', calendar: [day('2026-10-08')] });
    expect(summary(item)).toMatchObject({ target: 4, fulfilled: 1, rate: 25 });
    expect(getWorkbenchWeekProgress(item, date('2026-10-08'))).toEqual({ completed: 1, target: 4, fulfilled: false });
  });
  it('honors recorded backfills when a habit was created after its saved check-ins', () => {
    const item = habit({ frequency: 'weekly2', createdAt: '2026-10-08T08:00:00', calendar: [day('2026-10-05'), day('2026-10-06')] });
    expect(getWorkbenchWeekProgress(item, date('2026-10-08')).fulfilled).toBe(true);
    expect(summary(item).rate).toBe(100);
  });
  it('recognizes legacy completed-only records and validates daily targets', () => {
    expect(getHabitDayProgress(habit({ timesPerDay: 3, calendar: [{ date: '2026-10-08', completed: true }] }), '2026-10-08')).toEqual({ completed: 3, target: 3, fulfilled: true });
    expect(getHabitDayProgress(habit({ timesPerDay: NaN }), '2026-10-08').target).toBe(1);
  });
});
