import { describe, expect, it } from 'vitest';
import type {
  FocusLifelogEvent,
  HabitCheckinLifelogEvent,
  ManualNoteLifelogEvent,
  TaskCompletedLifelogEvent
} from './lifelogEvents';
import {
  getRecordCheckinContext,
  lifelogEventToRecordViewItem,
  lifelogEventsToRecordViewItems
} from './recordViewItems';

describe('record view items', () => {
  it('normalizes annotatable events into one shared shape', () => {
    const events = [
      {
        id: 'focus-1', type: 'focus', date: '2026-08-12', title: 'Deep work',
        startTime: '09:00', endTime: '09:30', minutes: 30, targetType: 'task', sourceId: 'focus-1',
        metadata: { timestamp: 1_755_000_000_000 }
      } satisfies FocusLifelogEvent,
      {
        id: 'habit-1', type: 'habit-checkin', date: '2026-08-12', title: 'Read',
        completed: true, completedCount: 1, targetCount: 1, habitId: 'habit-a', checkinTimestamp: 1_755_000_100_000
      } satisfies HabitCheckinLifelogEvent,
      {
        id: 'task-1', type: 'task-completed', date: '2026-08-12', title: 'Ship',
        completedAt: '2026-08-12T10:00:00.000Z', taskId: 'task-a', blockId: 'block-a', priority: 'none', tags: []
      } satisfies TaskCompletedLifelogEvent
    ];

    const items = lifelogEventsToRecordViewItems(events, {
      focus: event => `${event.minutes}m`,
      habit: event => `${event.completedCount}/${event.targetCount}`,
      task: () => 'completed'
    });

    expect(items.map(item => item.type)).toEqual(['focus', 'habit', 'task']);
    expect(items.map(item => item.meta)).toEqual(['30m', '1/1', 'completed']);
    expect(items[1].eventKeys).toEqual([
      'habit:habit-a:1755000100000',
      'habit:habit-a:2026-08-12:1'
    ]);
    expect(items[2]).toMatchObject({ sourceId: 'block-a', capabilities: { editAnnotation: true, openSource: true, favorite: true } });
  });

  it('keeps manual notes as editable records without annotation capabilities', () => {
    const event: ManualNoteLifelogEvent = {
      id: 'manual-1', type: 'manual-note', date: '2026-08-12', title: 'Manual note',
      text: 'Remember this', createdAt: '2026-08-12T11:00:00.000Z', updatedAt: '2026-08-12T11:00:00.000Z'
    };
    const item = lifelogEventToRecordViewItem(event, { manualNote: () => 'note' });

    expect(item).toMatchObject({
      type: 'manual-note', content: 'Remember this', eventKeys: [], meta: 'note',
      capabilities: { editEvent: true, deleteEvent: true, editAnnotation: false, favorite: false }
    });
    expect(getRecordCheckinContext(item)).toBeUndefined();
  });

  it('builds a stable check-in context from a normalized record', () => {
    const event: TaskCompletedLifelogEvent = {
      id: 'task-1', type: 'task-completed', date: '2026-08-12', title: 'Original task',
      completedAt: '2026-08-12T10:00:00.000Z', taskId: 'task-a', blockId: 'block-a', priority: 'none', tags: []
    };
    const item = lifelogEventToRecordViewItem(event, { task: () => 'completed' });

    expect(getRecordCheckinContext(item)).toEqual({
      type: 'task', sourceId: 'block-a', occurredAt: '2026-08-12T10:00:00.000Z',
      title: 'Original task', meta: 'completed'
    });
  });
});
