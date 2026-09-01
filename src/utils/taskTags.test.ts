import { describe, expect, it } from 'vitest';
import {
  applyTaskTagBatchAction,
  buildTaskTagAttrs,
  buildTaskTagState,
  filterKnownTaskTagIds,
  matchesTaskTagFilter,
  parseTaskTagIdsAttribute
} from './taskTags';

describe('task tags', () => {
  it('matches a parent filter against its descendant tags', () => {
    const descendants = new Map([['work', new Set(['work', 'writing'])]]);
    expect(matchesTaskTagFilter(['writing'], '', ['work'], '__none__', descendants)).toBe(true);
  });

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
