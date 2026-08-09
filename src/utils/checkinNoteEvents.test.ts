import { describe, expect, it } from 'vitest';
import {
  getCheckinNoteEventKey,
  isCheckinNoteLifelogEvent
} from './checkinNoteEvents';
import type {
  FocusLifelogEvent,
  HabitCheckinLifelogEvent,
  TaskCompletedLifelogEvent
} from './lifelogEvents';

describe('checkin note event keys', () => {
  it('uses the focus session id', () => {
    const event: FocusLifelogEvent = {
      id: 'focus-session-1',
      type: 'focus',
      date: '2026-08-09',
      title: 'Focus',
      startTime: '09:00',
      endTime: '09:25',
      minutes: 25,
      targetType: 'unlinked',
      sourceId: 'focus-session-1'
    };

    expect(getCheckinNoteEventKey(event)).toBe('focus:focus-session-1');
  });

  it('uses each habit check-in timestamp instead of the day', () => {
    const event: HabitCheckinLifelogEvent = {
      id: 'habit-checkin-water-2026-08-09-2-1234',
      type: 'habit-checkin',
      date: '2026-08-09',
      title: 'Drink water',
      completed: false,
      completedCount: 2,
      targetCount: 8,
      habitId: 'water',
      checkinIndex: 2,
      checkinTimestamp: 1234
    };

    expect(getCheckinNoteEventKey(event)).toBe('habit:water:1234');
  });

  it('falls back to a dated habit occurrence for old records', () => {
    const event: HabitCheckinLifelogEvent = {
      id: 'habit-checkin-water-2026-08-09',
      type: 'habit-checkin',
      date: '2026-08-09',
      title: 'Drink water',
      completed: true,
      completedCount: 1,
      targetCount: 1,
      habitId: 'water'
    };

    expect(getCheckinNoteEventKey(event)).toBe('habit:water:2026-08-09:1');
  });

  it('uses the completion timestamp for a task occurrence', () => {
    const event: TaskCompletedLifelogEvent = {
      id: 'task-completed-task-1-2026-08-09T09:00:00.000Z',
      type: 'task-completed',
      date: '2026-08-09',
      title: 'Ship first version',
      completedAt: '2026-08-09T09:00:00.000Z',
      taskId: 'task-1',
      priority: 'none',
      tags: []
    };

    expect(getCheckinNoteEventKey(event)).toBe('task:task-1:2026-08-09T09:00:00.000Z');
    expect(isCheckinNoteLifelogEvent(event)).toBe(true);
  });
});
