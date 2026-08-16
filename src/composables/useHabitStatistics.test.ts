import { shallowRef } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Habit } from '@/api';
import { useHabitStatistics } from '@/composables/useHabitStatistics';

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const createHabit = (): Habit => ({
  id: 'habit-1',
  name: '早晚刷牙',
  frequency: 'daily',
  createdAt: '2026-08-05T09:00:00.000+08:00',
  calendar: [
    { date: '2026-07-01', completed: true },
    { date: '2026-08-04', completed: true },
    { date: '2026-08-05', completed: true },
    { date: '2026-08-06', completed: true },
    { date: '2026-08-07', completed: true }
  ]
} as Habit);

describe('habit completion rates', () => {
  afterEach(() => vi.useRealTimers());

  it('uses a completed backfill before creation as the total completion-rate start date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-06T12:00:00.000+08:00'));
    const { calculateTotalCompletionRate } = useHabitStatistics({
      habits: shallowRef([]),
      parseDate: date => new Date(`${date}T00:00:00`),
      formatDate,
      getToday: () => '2026-08-06'
    });

    expect(calculateTotalCompletionRate(createHabit())).toBe(11);
  });

  it('uses the earliest completed backfill as the completion-rate start date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-12T12:00:00.000+08:00'));
    const { calculateCompletionRate, calculateTotalMonthCompletions } = useHabitStatistics({
      habits: shallowRef([]),
      parseDate: date => new Date(`${date}T00:00:00`),
      formatDate,
      getToday: () => '2026-08-12'
    });
    const habit = {
      ...createHabit(),
      createdAt: '2026-08-12T09:00:00.000+08:00',
      calendar: [
        { date: '2026-08-10', completed: true },
        { date: '2026-08-12', completed: true }
      ]
    } as Habit;

    expect(calculateTotalMonthCompletions(habit)).toBe(2);
    expect(calculateCompletionRate(habit)).toBe(67);
  });

  it('applies the configured weekly target to completion rates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-06T12:00:00.000+08:00'));
    const { calculateCompletionRate, calculateTotalCompletionRate } = useHabitStatistics({
      habits: shallowRef([]),
      parseDate: date => new Date(`${date}T00:00:00`),
      formatDate,
      getToday: () => '2026-08-06'
    });

    const habit = {
      ...createHabit(),
      id: 'weekly-3',
      frequency: 'weekly3',
      createdAt: '2026-08-03T09:00:00.000+08:00',
      calendar: [
        { date: '2026-08-03', completed: true },
        { date: '2026-08-04', completed: true }
      ]
    } as Habit;

    expect(calculateCompletionRate(habit)).toBe(0);
    expect(calculateTotalCompletionRate(habit)).toBe(0);
  });

  it('counts only scheduled dates for custom weekly completion rates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-12T12:00:00.000+08:00'));
    const { calculateCompletionRate, calculateTotalCompletionRate } = useHabitStatistics({
      habits: shallowRef([]),
      parseDate: date => new Date(`${date}T00:00:00`),
      formatDate,
      getToday: () => '2026-08-12'
    });
    const habit = {
      ...createHabit(),
      frequency: 'custom',
      createdAt: '2026-08-01T09:00:00.000+08:00',
      customSchedule: { type: 'week', weekDays: [1, 3, 5] },
      calendar: [
        { date: '2026-08-03', completed: true },
        { date: '2026-08-05', completed: true },
        { date: '2026-08-07', completed: true },
        { date: '2026-08-10', completed: true },
        { date: '2026-08-12', completed: true }
      ]
    } as Habit;

    expect(calculateCompletionRate(habit)).toBe(100);
    expect(calculateTotalCompletionRate(habit)).toBe(100);
  });

  it('counts custom streaks by scheduled days rather than calendar days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-12T12:00:00.000+08:00'));
    const { calculateCurrentStreak, calculateCurrentMonthStreak, calculateLongestStreak, calculateTotalMonthCompletions } = useHabitStatistics({
      habits: shallowRef([]),
      parseDate: date => new Date(`${date}T00:00:00`),
      formatDate,
      getToday: () => '2026-08-12'
    });
    const habit = {
      ...createHabit(),
      frequency: 'custom',
      createdAt: '2026-08-01T09:00:00.000+08:00',
      customSchedule: { type: 'week', weekDays: [2, 3, 5] },
      calendar: [
        { date: '2026-08-03', completed: true },
        { date: '2026-08-04', completed: true },
        { date: '2026-08-05', completed: true },
        { date: '2026-08-07', completed: true },
        { date: '2026-08-10', completed: true },
        { date: '2026-08-11', completed: true }
      ]
    } as Habit;

    expect(calculateCurrentStreak(habit)).toBe(0);
    expect(calculateCurrentMonthStreak(habit)).toBe(0);
    expect(calculateLongestStreak(habit).streak).toBe(4);
    expect(calculateTotalMonthCompletions(habit)).toBe(4);
  });
});
