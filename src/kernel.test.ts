import { afterEach, describe, expect, it, vi } from 'vitest';

type KernelHandler = (params?: Record<string, unknown>) => Promise<any>;

describe('kernel task index incremental refresh', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('removes ghost rows and marks a 5000-row index as truncated', async () => {
    const handlers = new Map<string, KernelHandler>();
    let taskRowsQueryCount = 0;
    let queryMode: 'ghosts' | 'limit' = 'ghosts';
    let cappedRowsOffset = 0;
    const cappedRows = Array.from({ length: 5001 }, (_, index) => ({
      id: `capped-block-${String(index).padStart(4, '0')}`,
      content: `Task ${index}`,
      markdown: `* [ ] Task ${index}`,
      box: 'cap-notebook',
      hpath: '/Cap',
      root_id: 'cap-doc',
      parent_id: '',
      updated: String(90000000000000 - index),
      created: String(80000000000000 - index)
    }));
    const fetchSql = vi.fn(async (url: string, init: { body?: string }) => {
      if (url === '/api/block/getBlockDOM') {
        const { id } = JSON.parse(init.body || '{}') as { id?: string };
        return {
          json: async () => ({ code: 0, data: { dom: `<div data-node-id="${id}"></div>` } })
        };
      }

      const stmt = JSON.parse(init.body || '{}').stmt as string;
      let data: any[] = [];

      if (stmt.includes('SELECT b.id, b.content')) {
        if (queryMode === 'limit') {
          const pageLimit = Number(stmt.match(/LIMIT\s+(\d+)/i)?.[1] || 0);
          data = cappedRows.slice(cappedRowsOffset, cappedRowsOffset + pageLimit);
          cappedRowsOffset += pageLimit;
        } else {
          taskRowsQueryCount += 1;
        }
        if (queryMode === 'ghosts' && taskRowsQueryCount === 1) {
          data = [
            {
              id: 'block-1',
              content: 'Task changed to an ordinary block',
              markdown: '* [ ] Task changed to an ordinary block',
              box: 'notebook-1',
              hpath: '/Doc',
              root_id: 'doc-1',
              parent_id: '',
              updated: '20260810090000',
              created: '20260810080000'
            },
            {
              id: 'block-2',
              content: 'Task that will be deleted',
              markdown: '* [ ] Task that will be deleted',
              box: 'notebook-1',
              hpath: '/Doc',
              root_id: 'doc-1',
              parent_id: '',
              updated: '20260810085000',
              created: '20260810075000'
            }
          ];
        }
      } else if (stmt.includes('SELECT b.id, b.updated')) {
        data = [{ id: 'block-1', updated: '20260810100000' }];
      } else if (stmt.includes('SELECT id') && stmt.includes('WHERE id IN')) {
        data = [{ id: 'block-1' }];
      }

      return {
        json: async () => ({ code: 0, data })
      };
    });
    const siyuanMock = {
      client: { fetch: fetchSql },
      plugin: { lifecycle: {} as Record<string, any> },
      rpc: {
        bind: vi.fn(async (name: string, handler: KernelHandler) => {
          handlers.set(name, handler);
        }),
        unbind: vi.fn(async () => undefined)
      }
    };
    vi.stubGlobal('siyuan', siyuanMock);

    await import('./kernel');
    await siyuanMock.plugin.lifecycle.onload();

    const refreshIndex = handlers.get('refreshTaskIndex');
    const refreshIncremental = handlers.get('refreshTaskIndexIncremental');
    const getTaskRowsByBlockIds = handlers.get('getTaskRowsByBlockIds');
    const getBlockDOMBatch = handlers.get('getBlockDOMBatch');
    expect(refreshIndex).toBeTypeOf('function');
    expect(refreshIncremental).toBeTypeOf('function');
    expect(getTaskRowsByBlockIds).toBeTypeOf('function');
    expect(getBlockDOMBatch).toBeTypeOf('function');

    const domBatch = await getBlockDOMBatch!({ ids: ['block-1', 'block-1', 'block-2'] });
    expect(domBatch.blocks).toEqual(expect.arrayContaining([
      { id: 'block-1', data: { dom: '<div data-node-id="block-1"></div>' } },
      { id: 'block-2', data: { dom: '<div data-node-id="block-2"></div>' } }
    ]));
    expect(domBatch.failedIds).toEqual([]);
    expect(fetchSql.mock.calls.filter(([url]) => url === '/api/block/getBlockDOM')).toHaveLength(2);

    const initial = await refreshIndex!({ limit: 10 });
    expect(initial.rows.map((row: any) => row.id)).toEqual(['block-1', 'block-2']);

    const taskSqlStatements = fetchSql.mock.calls
      .filter(([url]) => url === '/api/query/sql')
      .map(([, init]) => JSON.parse(init.body || '{}').stmt as string)
      .filter(stmt => stmt.includes('SELECT b.id, b.content'));
    expect(taskSqlStatements[0]).toContain('AND a.name IN (');
    expect(taskSqlStatements[0]).toContain("'custom-task-due-date'");

    const taskQueryCountBeforeMissingIds = taskRowsQueryCount;
    const missingIds = await getTaskRowsByBlockIds!({
      blockIds: ['missing-block-1', 'missing-block-2', 'missing-block-3']
    });
    expect(missingIds.rows).toEqual([]);
    expect(taskRowsQueryCount - taskQueryCountBeforeMissingIds).toBe(1);

    const incremental = await refreshIncremental!({ limit: 10 });
    expect(incremental.rows).toEqual([]);
    expect(incremental.changedRows).toBe(2);

    const dirtyIdSql = fetchSql.mock.calls
      .filter(([url]) => url === '/api/query/sql')
      .map(([, init]) => JSON.parse(init.body || '{}').stmt as string)
      .find(stmt => stmt.includes('SELECT b.id, b.updated'));
    expect(dirtyIdSql).not.toContain("b.root_id = 'doc-1'");
    expect(dirtyIdSql).not.toContain("b.box = 'notebook-1'");

    queryMode = 'limit';
    const capped = await refreshIndex!({
      limit: 5000,
      notebookId: 'cap-notebook'
    });
    expect(capped.rows).toHaveLength(5000);
    expect(capped.totalScanned).toBe(5001);
    expect(capped.partial).toBe(true);
  });
});
