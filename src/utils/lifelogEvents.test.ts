import { describe, expect, it } from 'vitest';
import type { Task } from '../api';
import {
  moodManualEntriesToLifelogEvents,
  summarizeTaskCompletedLifelogEventsByDay,
  taskCompletedToLifelogEvent,
  tasksToCompletedLifelogEvents
} from './lifelogEvents';

function createTask(overrides: Partial<Task>): Task {
  return {
    id: 'task-1',
    type: 'block',
    title: 'Task',
    status: 'completed',
    priority: 'none',
    tags: [],
    createdAt: '2026-06-01T09:00:00.000Z',
    updatedAt: '2026-06-02T10:30:00.000Z',
    ...overrides
  };
}

describe('lifelog task completion events', () => {
  it('uses completedAt when available', () => {
    const event = taskCompletedToLifelogEvent(createTask({
      completedAt: '2026-06-03T08:15:00.000Z',
      updatedAt: '2026-06-02T10:30:00.000Z'
    }));

    expect(event?.date).toBe('2026-06-03');
    expect(event?.completedAt).toBe('2026-06-03T08:15:00.000Z');
  });

  it('falls back to updatedAt for completed tasks without completedAt', () => {
    const event = taskCompletedToLifelogEvent(createTask({
      completedAt: undefined,
      updatedAt: '2026-06-02T10:30:00.000Z'
    }));

    expect(event?.date).toBe('2026-06-02');
    expect(event?.completedAt).toBe('2026-06-02T10:30:00.000Z');
  });

  it('summarizes completed tasks that only have updatedAt', () => {
    const events = tasksToCompletedLifelogEvents([
      createTask({ id: 'task-1', updatedAt: '2026-06-02T10:30:00.000Z' }),
      createTask({ id: 'task-2', updatedAt: '2026-06-02T11:00:00.000Z' }),
      createTask({ id: 'task-3', status: 'pending', updatedAt: '2026-06-02T12:00:00.000Z' })
    ]);

    const summary = summarizeTaskCompletedLifelogEventsByDay(events);

    expect(summary.get('2026-06-02')?.tasks).toBe(2);
  });

  it('uses the stats-view completion record even when status is not completed', () => {
    const event = taskCompletedToLifelogEvent(createTask({
      status: 'pending',
      completedAt: '2026-06-03T09:20:00.000Z'
    }));

    expect(event?.date).toBe('2026-06-03');
    expect(event?.completedAt).toBe('2026-06-03T09:20:00.000Z');
  });

  it('parses compact Siyuan datetime completion records', () => {
    const event = taskCompletedToLifelogEvent(createTask({
      completedAt: '20260603112530'
    }));

    expect(event?.date).toBe('2026-06-03');
  });

  it('uses task description as the completed task note', () => {
    const event = taskCompletedToLifelogEvent(createTask({
      description: '  Finish write-up before sync  ',
      tags: ['group_1773380818930_6mxhdj']
    }));

    expect(event?.note).toBe('Finish write-up before sync');
    expect(event?.note).not.toContain('group_1773380818930_6mxhdj');
  });

  it('shows completed task titles as plain text in lifelog events', () => {
    const event = taskCompletedToLifelogEvent(createTask({
      title: '&lt;span data-type="text" style="background-color: var(--pinch-background7);"&gt;sad11&lt;/span&gt;'
    }));

    expect(event?.title).toBe('sad11');
  });

  it('removes a trailing SiYuan style marker from completed task titles', () => {
    const event = taskCompletedToLifelogEvent(createTask({
      title: 'sad11 {: style="background-color: var(--b3-font-background10);"}'
    }));

    expect(event?.title).toBe('sad11');
  });
});

describe('lifelog mood manual note events', () => {
  it('carries the day mood emoji for manual note timeline icons', () => {
    const events = moodManualEntriesToLifelogEvents({
      '2026-06-03': {
        emoji: '😄',
        note: '',
        timestamp: '2026-06-03T08:00:00.000Z',
        entries: [{
          id: 'entry-1',
          text: 'A good note',
          createdAt: '2026-06-03T09:00:00.000Z',
          updatedAt: '2026-06-03T09:00:00.000Z'
        }]
      }
    });

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('manual-note');
    expect(events[0].emoji).toBe('😄');
  });
});
