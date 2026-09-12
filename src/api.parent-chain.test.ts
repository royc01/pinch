import { afterEach, describe, expect, it, vi } from 'vitest';
import * as siyuan from 'siyuan';
import { invalidateBlockDOMCache, TaskRepository } from './api';

describe('TaskRepository ancestor parent lookup', () => {
  afterEach(() => {
    invalidateBlockDOMCache();
    vi.restoreAllMocks();
  });

  it('batches and caches sparse parent lookups instead of recursively retrying them', async () => {
    invalidateBlockDOMCache();
    const taskRows = Array.from({ length: 513 }, (_, index) => ({
      id: `task-${String(index).padStart(4, '0')}`,
      content: `Task ${index}`,
      box: 'notebook-1',
      hpath: '/Document',
      sort: index,
      updated: '20260912000000',
      created: '20260912000000',
      markdown: `- [ ] Task ${index}`,
      parent_id: `container-${String(index).padStart(4, '0')}`,
      root_id: 'document-1',
      type: 'i',
      subtype: 't',
      memo: ''
    }));
    const parentLookupStatements: string[] = [];

    vi.spyOn(siyuan, 'fetchPost').mockImplementation((url: string, data: any, callback?: (response: any) => void) => {
      expect(url).toBe('/api/query/sql');
      const statement = String(data?.stmt || '');

      if (statement.includes('SELECT b.id, b.content')) {
        callback?.({
          code: 0,
          data: statement.includes('AND b.id >') ? [] : taskRows
        });
        return;
      }

      if (statement.includes('SELECT id, parent_id')) {
        parentLookupStatements.push(statement);
        // These IDs deliberately have no rows. The old split-and-retry logic
        // expanded this into many requests even though the result cannot change.
        callback?.({ code: 0, data: [] });
        return;
      }

      callback?.({ code: 0, data: [] });
    });

    const fetchTasks = () => (TaskRepository as any).fetchBlockTasks(null, false, 'light') as Promise<unknown[]>;

    await expect(fetchTasks()).resolves.toHaveLength(513);
    expect(parentLookupStatements).toHaveLength(2);
    expect(parentLookupStatements.map(statement => statement.match(/'[^']+'/g)?.length)).toEqual([512, 1]);

    // A nearby task surface should reuse the resolved (including missing)
    // ancestor links instead of beginning the same hierarchy walk again.
    await expect(fetchTasks()).resolves.toHaveLength(513);
    expect(parentLookupStatements).toHaveLength(2);

    invalidateBlockDOMCache();
    await expect(fetchTasks()).resolves.toHaveLength(513);
    expect(parentLookupStatements).toHaveLength(4);
  });
});
