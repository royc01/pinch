import { describe, expect, it } from 'vitest';
import {
  applyTaskTagBatchAction,
  buildTaskTagAttrs,
  buildTaskTagState,
  filterKnownTaskTagIds,
  parseTaskTagIdsAttribute
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

  it('parses and normalizes a persisted tag attribute', () => {
    expect(parseTaskTagIdsAttribute('["tag-a", " tag-b ", "tag-a", 1]')).toEqual([
      'tag-a',
      'tag-b'
    ]);
  });

  it('returns an empty list for malformed or non-array attributes', () => {
    expect(parseTaskTagIdsAttribute('{"id":"tag-a"}')).toEqual([]);
    expect(parseTaskTagIdsAttribute('not-json')).toEqual([]);
  });
});
