import { describe, expect, it } from 'vitest';
import type { Habit, Task } from '@/api';
import {
  buildSummaryHabitStats,
  buildSummaryPeriod,
  buildSummaryPeriodList,
  buildSummaryTaskData,
  formatSummaryDateKey,
  getSummaryPeriodKeyFromPath,
  getSummaryPeriodYear
} from './personalStatsSummary';

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    blockId: 'block-1',
    type: 'block',
    title: 'Task',
    status: 'pending',
    priority: 'none',
    tags: [],
    createdAt: '2026-10-01T00:00:00',
    updatedAt: '2026-10-01T00:00:00',
    ...overrides
  };
}

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'habit-1',
    name: 'Habit',
    difficulty: 'easy',
    frequency: 'daily',
    completedToday: false,
    currentStreak: 0,
    totalCompletions: 0,
    calendar: [],
    createdAt: '2026-10-01T00:00:00',
    ...overrides
  };
}

describe('personalStatsSummary', () => {
  const now = new Date('2026-10-07T12:00:00');

  it('lists all months and maps each selection back to its period', () => {
    const entries = buildSummaryPeriodList('month', 2026, now);
    expect(entries).toHaveLength(12);
    expect(entries[9]).toMatchObject({ key: 'month:2026-10-01', offset: 0, future: false });
    expect(entries[10].future).toBe(true);
    for (const entry of entries) {
      expect(formatSummaryDateKey(buildSummaryPeriod('month', entry.offset, now).start)).toBe(formatSummaryDateKey(entry.start));
    }
  });

  it('uses ISO week years across December and January without duplicate weeks', () => {
    const entries = buildSummaryPeriodList('week', 2020, now);
    expect(entries).toHaveLength(53);
    expect(entries[0].key).toBe('week:2019-12-30');
    expect(entries[52].key).toBe('week:2020-12-28');
    expect(getSummaryPeriodYear('week', entries[0].start)).toBe(2020);
    const nextYear = buildSummaryPeriodList('week', 2021, now);
    expect(nextYear).toHaveLength(52);
    expect(nextYear[0].key).toBe('week:2021-01-04');
    for (const entry of [...entries, ...nextYear]) {
      expect(formatSummaryDateKey(buildSummaryPeriod('week', entry.offset, now).start)).toBe(formatSummaryDateKey(entry.start));
    }
  });

  it('recognizes localized and legacy document paths and ignores other documents', () => {
    expect(getSummaryPeriodKeyFromPath('/Pinch/周-2026-10-05')).toBe('week:2026-10-05');
    expect(getSummaryPeriodKeyFromPath('/Pinch/summaries/week-2026-10-05')).toBe('week:2026-10-05');
    expect(getSummaryPeriodKeyFromPath('/Pinch/月-2026-09-01')).toBe('month:2026-09-01');
    expect(getSummaryPeriodKeyFromPath('/Pinch/summaries/month-2026-09-01')).toBe('month:2026-09-01');
    for (const path of ['/Other/周-2026-10-05', '/Pinch/week-2026-10-06', '/Pinch/month-2026-09-02', '/Pinch/month-2026-02-30', '/Pinch/周-2026-10-05/child']) {
      expect(getSummaryPeriodKeyFromPath(path)).toBeNull();
    }
  });

  it('builds Monday based week and compares with the previous week', () => {
    const period = buildSummaryPeriod('week', 0, now);
    expect(formatSummaryDateKey(period.start)).toBe('2026-10-05');
    expect(formatSummaryDateKey(period.end)).toBe('2026-10-12');
    expect(formatSummaryDateKey(period.previousStart)).toBe('2026-09-28');
  });

  it('counts newly created unfinished tasks separately from completed tasks', () => {
    const period = buildSummaryPeriod('week', 0, now);
    const data = buildSummaryTaskData([
      task({ id: 'done', status: 'completed', createdAt: '2026-10-06T00:00:00', completedAt: '2026-10-06T12:00:00' }),
      task({ id: 'unfinished', createdAt: '2026-10-06T00:00:00' }),
      task({ id: 'old', createdAt: '2026-09-20T00:00:00' })
    ], period);
    expect(data.completedTasks.map(item => item.id)).toEqual(['done']);
    expect(data.createdTaskCount).toBe(2);
    expect(data.unfinishedCreatedTasks.map(item => item.id)).toEqual(['unfinished']);
  });

  it('uses all scheduled daily occurrences as the habit denominator', () => {
    const period = buildSummaryPeriod('week', 0, now);
    const stats = buildSummaryHabitStats([habit({
      calendar: [{ date: '2026-10-07', completed: true, completedCount: 1, targetCount: 1 }]
    })], period);
    expect(stats).toEqual({ completed: 1, target: 3 });
  });

  it('uses weekly target counts for weekly habits', () => {
    const period = buildSummaryPeriod('week', 0, now);
    const stats = buildSummaryHabitStats([habit({
      frequency: 'weekly2',
      calendar: [{ date: '2026-10-06', completed: true, completedCount: 1 }]
    })], period);
    expect(stats).toEqual({ completed: 1, target: 2 });
  });
});
