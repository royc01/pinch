import { describe, expect, it } from 'vitest';
import type { Habit } from '@/api';
import { buildHabitTaskChips } from './habitTaskChips';

const habit: Habit = {
  id: 'habit-1', name: 'Read', emoji: '📖', emojiColorIndex: 1, frequency: 'weekly3',
  createdAt: '2026-10-01T12:00:00', difficulty: 'medium', calendar: [],
  completedToday: false, currentStreak: 0, totalCompletions: 0
};
const dates = [{ key: '2026-10-07', date: new Date(2026, 9, 7) }];

describe('calendar habit chips', () => {
  it.each(['weekly', 'weekly1', 'weekly2', 'weekly3', 'weekly4', 'weekly5', 'weekly6'] as const)(
    'shows a %s habit on eligible dates', (frequency) => {
      expect(buildHabitTaskChips([{ ...habit, frequency }], dates)).toMatchObject([
        { title: 'Read', startDate: '2026-10-07', status: 'pending' }
      ]);
    }
  );

  it('still respects paused habits, creation dates and custom schedules', () => {
    expect(buildHabitTaskChips([{ ...habit, isPaused: true }], dates)).toEqual([]);
    expect(buildHabitTaskChips([{ ...habit, createdAt: '2026-10-08T12:00:00' }], dates)).toEqual([]);
    expect(buildHabitTaskChips([{ ...habit, frequency: 'custom',
      customSchedule: { type: 'week', calendar: 'solar', weekDays: [1] } }], dates)).toEqual([]);
  });

  it('retains a recorded checkin outside the custom schedule', () => {
    expect(buildHabitTaskChips([{ ...habit, frequency: 'custom',
      customSchedule: { type: 'week', calendar: 'solar', weekDays: [1] },
      calendar: [{ date: dates[0].key, completed: true, completedCount: 1 }]
    }], dates)).toMatchObject([{ status: 'completed', startDate: dates[0].key }]);
  });
});
