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

  it('excludes check-ins before creation and after today from total completion rate', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-06T12:00:00.000+08:00'));
    const { calculateTotalCompletionRate } = useHabitStatistics({
      habits: shallowRef([]),
      parseDate: date => new Date(`${date}T00:00:00`),
      formatDate,
      getToday: () => '2026-08-06'
    });

    expect(calculateTotalCompletionRate(createHabit())).toBe(100);
  });
});
