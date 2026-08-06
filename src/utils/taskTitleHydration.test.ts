import { describe, expect, it } from 'vitest';
import {
  collectTaskTitleHydrationBlockIds,
  hasMarkdownInlineMemo,
  shouldHydrateTaskTitle
} from './taskTitleHydration';

describe('task title hydration candidates', () => {
  it('keeps unique block tasks whose titles need DOM hydration up to the limit', () => {
    const ids = collectTaskTitleHydrationBlockIds([
      { type: 'block', blockId: 'skip', title: 'Plain title' },
      { type: 'block', blockId: 'first', title: '<sup>memo</sup>' },
      { type: 'block', blockId: 'first', title: '<sup>duplicate</sup>' },
      { type: 'block', blockId: 'second', title: '((memo content))' },
      { type: 'custom', blockId: 'third', title: '<sup>ignored</sup>' }
    ], 2);

    expect(ids).toEqual(['first', 'second']);
  });

  it('does not hydrate ordinary block references', () => {
    const blockReference = '((20260101010101-abcdefg))';

    expect(hasMarkdownInlineMemo(blockReference)).toBe(false);
    expect(shouldHydrateTaskTitle(blockReference)).toBe(false);
    expect(shouldHydrateTaskTitle('((a real memo))')).toBe(true);
  });
});
