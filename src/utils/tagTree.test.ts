import { describe, expect, it } from 'vitest';
import { MAX_TAG_LEVELS, type Tag } from '@/api';
import { getTagDepth, getTagDescendantIds, getTagPath } from './tagTree';

const tags: Tag[] = [
  { id: 'work', name: 'Work' },
  { id: 'writing', name: 'Writing', parentId: 'work' },
  { id: 'draft', name: 'Draft', parentId: 'writing' }
];

describe('tag tree helpers', () => {
  it('resolves descendants and display paths', () => {
    expect([...getTagDescendantIds(tags, 'work')].sort()).toEqual(['draft', 'work', 'writing']);
    expect(getTagPath(tags, 'draft')).toEqual(['Work', 'Writing', 'Draft']);
    expect(getTagDepth(tags, 'draft')).toBe(2);
  });

  it('defines three levels as the maximum hierarchy depth', () => {
    expect(MAX_TAG_LEVELS).toBe(3);
  });
});
