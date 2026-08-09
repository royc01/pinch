import { describe, expect, it } from 'vitest';
import { toFocusSessionTargetInput } from './focusTimerTarget';

describe('toFocusSessionTargetInput', () => {
  it('returns null for an unlinked focus session', () => {
    expect(toFocusSessionTargetInput(null)).toBeNull();
  });

  it('maps a habit target without picker-only fields', () => {
    expect(toFocusSessionTargetInput({
      type: 'habit',
      id: 'habit-1',
      name: 'Read',
      emoji: 'book',
      searchText: 'read daily',
      preferredDuration: 25
    })).toEqual({
      type: 'habit',
      id: 'habit-1',
      name: 'Read',
      emoji: 'book',
      blockId: undefined
    });
  });

  it('preserves the task block ID used to open the target later', () => {
    expect(toFocusSessionTargetInput({
      type: 'task',
      id: 'task-1',
      name: 'Draft',
      blockId: 'block-1'
    })).toEqual({
      type: 'task',
      id: 'task-1',
      name: 'Draft',
      emoji: undefined,
      blockId: 'block-1'
    });
  });
});
