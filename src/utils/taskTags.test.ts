import { describe, expect, it } from 'vitest';
import {
  applyTaskTagBatchAction,
  buildTaskTagAttrs,
  buildTaskTagState,
  filterKnownTaskTagIds
} from './taskTags';

describe('task tags', () => {
  it('removes unknown tag IDs before a batch action persists the tag state', () => {
    const currentState = buildTaskTagState(
      ['group_orphan', 'group_writing'],
      'group_orphan'
    );
    const knownTagIds = new Set(['group_writing', 'group_reading']);

    const nextTagIds = applyTaskTagBatchAction(
      filterKnownTaskTagIds(currentState.tagIds, knownTagIds),
      'add',
      'group_reading'
    );

    expect(buildTaskTagAttrs(nextTagIds).attrs).toEqual({
      'custom-task-tags': '["group_writing","group_reading"]',
      'custom-task-group': 'group_writing'
    });
  });
});
