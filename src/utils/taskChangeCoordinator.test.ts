import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eventBus, Events } from './eventBus';
import {
  publishTaskAttributeChange,
  publishTaskChange,
  resetTaskChangeCoordinator,
  type TaskChangePayload
} from './taskChangeCoordinator';

describe('task change coordinator', () => {
  let changes: TaskChangePayload[] = [];
  let unsubscribe: (() => void) | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    resetTaskChangeCoordinator();
    eventBus.clear();
    changes = [];
    unsubscribe = eventBus.on(Events.TASK_CHANGED, (payload: TaskChangePayload) => {
      changes.push(payload);
    });
  });

  afterEach(() => {
    unsubscribe?.();
    unsubscribe = null;
    resetTaskChangeCoordinator();
    eventBus.clear();
    vi.useRealTimers();
  });

  it('coalesces block IDs from nearby changes into one event', () => {
    publishTaskChange(['task-a', ' task-b ']);
    publishTaskChange(['task-b', 'task-c'], 'system');

    vi.advanceTimersByTime(8);

    expect(changes).toEqual([{
      blockIds: ['task-a', 'task-b', 'task-c'],
      revision: 1
    }]);
  });

  it('reconciles the matching websocket echo after a local change', () => {
    publishTaskChange(['task-a']);
    vi.advanceTimersByTime(8);

    publishTaskChange(['task-a'], 'ws');
    vi.advanceTimersByTime(80);

    expect(changes).toHaveLength(1);

    vi.advanceTimersByTime(8);

    expect(changes).toHaveLength(2);
    expect(changes[1]).toMatchObject({
      blockIds: ['task-a'],
      revision: 2,
      forceRefresh: true
    });
  });

  it('keeps non-echo block IDs from the same websocket batch', () => {
    publishTaskChange(['task-a']);
    vi.advanceTimersByTime(8);

    publishTaskChange(['task-a', 'task-b'], 'ws');
    vi.advanceTimersByTime(8);

    expect(changes).toHaveLength(2);
    expect(changes[1]).toMatchObject({
      blockIds: ['task-b'],
      revision: 2
    });

    vi.advanceTimersByTime(80);

    expect(changes[2]).toMatchObject({
      blockIds: ['task-a'],
      revision: 3,
      forceRefresh: true
    });
  });

  it('preserves an empty change as a fallback refresh signal', () => {
    publishTaskChange([], 'system');

    vi.advanceTimersByTime(8);

    expect(changes).toEqual([{
      blockIds: [],
      revision: 1
    }]);
  });

  it('publishes only task attribute writes', () => {
    publishTaskAttributeChange('block-a', {
      'custom-checkin-focus-session-id': 'session-a'
    });
    vi.advanceTimersByTime(8);

    expect(changes).toEqual([]);

    publishTaskAttributeChange('block-a', {
      'custom-task-priority': 'high'
    });
    vi.advanceTimersByTime(8);

    expect(changes).toEqual([{
      blockIds: ['block-a'],
      revision: 1,
      attributeChanges: {
        'block-a': {
          'custom-task-priority': 'high'
        }
      }
    }]);
  });

  it('keeps only the latest pending value for each task attribute', () => {
    publishTaskAttributeChange('block-a', {
      'custom-task-priority': 'high'
    });
    publishTaskAttributeChange('block-a', {
      'custom-task-priority': 'medium',
      'custom-task-tags': '["tag-a"]'
    });

    vi.advanceTimersByTime(8);

    expect(changes).toEqual([{
      blockIds: ['block-a'],
      revision: 1,
      attributeChanges: {
        'block-a': {
          'custom-task-priority': 'medium',
          'custom-task-tags': '["tag-a"]'
        }
      }
    }]);
  });
});
