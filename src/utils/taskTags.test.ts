import { describe, expect, it } from 'vitest';
import {
  applyTaskTagBatchAction,
  buildTaskTagAttrs,
  buildTaskTagState,
  filterKnownTaskTagIds,
  matchesTaskTagFilter,
  moveTaskTagBetweenGroups,
  parseTaskTagIdsAttribute,
  resolveTaskTagGroupIds
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
      'custom-task-group': ''
    });
  });

  it('keeps all selected tags equal and only uses the legacy group as a fallback', () => {
    expect(buildTaskTagState(['tag-b', 'tag-a'], 'tag-a').tagIds).toEqual(['tag-b', 'tag-a']);
    expect(buildTaskTagState(['tag-b'], 'tag-a').tagIds).toEqual(['tag-b', 'tag-a']);
    expect(buildTaskTagState([], 'tag-a').tagIds).toEqual(['tag-a']);
  });

  it('moves only the source tag between groups and preserves other tags', () => {
    expect(moveTaskTagBetweenGroups(['tag-a', 'tag-c'], 'tag-a', 'tag-b')).toEqual(['tag-c', 'tag-b']);
    expect(moveTaskTagBetweenGroups(['tag-a', 'tag-c'], 'tag-a', '')).toEqual([]);
  });

  it('returns every valid grouping tag and only uses the untagged group as a fallback', () => {
    const known = new Set(['tag-a', 'tag-b']);
    expect(resolveTaskTagGroupIds(['tag-a', 'unknown', 'tag-b'], '', known, '__none__'))
      .toEqual(['tag-a', 'tag-b']);
    expect(resolveTaskTagGroupIds(['unknown'], '', known, '__none__')).toEqual(['__none__']);
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
