import { afterEach, describe, expect, it, vi } from 'vitest';
import * as siyuan from 'siyuan';
import { getBlockDOMBatch, invalidateBlockDOMCache } from './api';

describe('getBlockDOMBatch', () => {
  afterEach(() => {
    invalidateBlockDOMCache();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('loads multiple block DOM responses through one kernel RPC request', async () => {
    const directFetch = vi.spyOn(siyuan, 'fetchPost');
    const rpcFetch = vi.fn(async (_url: string, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body || '{}'));
      return {
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: request.id,
          result: {
            blocks: [
              { id: 'block-1', data: { dom: '<div>one</div>' } },
              { id: 'block-2', data: { dom: '<div>two</div>' } }
            ],
            failedIds: [],
            elapsedMs: 1,
            source: 'kernel'
          }
        })
      } as Response;
    });
    vi.stubGlobal('fetch', rpcFetch);

    const result = await getBlockDOMBatch(['block-1', 'block-1', 'block-2']);

    expect(rpcFetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(rpcFetch.mock.calls[0]?.[1]?.body))).toMatchObject({
      method: 'getBlockDOMBatch',
      params: { ids: ['block-1', 'block-2'] }
    });
    expect(directFetch).not.toHaveBeenCalled();
    expect(result.get('block-1')?.dom).toBe('<div>one</div>');
    expect(result.get('block-2')?.dom).toBe('<div>two</div>');
  });

  it('retries only entries missing from a partial kernel response', async () => {
    const directFetch = vi.spyOn(siyuan, 'fetchPost').mockImplementation((url: string, data: any, callback?: (response: any) => void) => {
      expect(url).toBe('/api/block/getBlockDOM');
      callback?.({ code: 0, data: { dom: `<div>${data.id}</div>` } });
    });
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body || '{}'));
      return {
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: request.id,
          result: {
            blocks: [{ id: 'block-1', data: { dom: '<div>one</div>' } }],
            failedIds: ['block-2'],
            elapsedMs: 1,
            source: 'kernel'
          }
        })
      } as Response;
    }));

    const result = await getBlockDOMBatch(['block-1', 'block-2']);

    expect(directFetch).toHaveBeenCalledTimes(1);
    expect(directFetch).toHaveBeenCalledWith('/api/block/getBlockDOM', { id: 'block-2' }, expect.any(Function), undefined, expect.any(Function));
    expect(result.get('block-1')?.dom).toBe('<div>one</div>');
    expect(result.get('block-2')?.dom).toBe('<div>block-2</div>');
  });

  it('reuses a recent DOM batch result and invalidates it on demand', async () => {
    const rpcFetch = vi.fn(async (_url: string, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body || '{}'));
      return {
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: request.id,
          result: {
            blocks: [{ id: 'block-1', data: { dom: '<div>one</div>' } }],
            failedIds: [],
            elapsedMs: 1,
            source: 'kernel'
          }
        })
      } as Response;
    });
    vi.stubGlobal('fetch', rpcFetch);

    await getBlockDOMBatch(['block-1']);
    await getBlockDOMBatch(['block-1']);
    expect(rpcFetch).toHaveBeenCalledTimes(1);

    invalidateBlockDOMCache();
    await getBlockDOMBatch(['block-1']);
    expect(rpcFetch).toHaveBeenCalledTimes(2);
  });

  it('coalesces concurrent calls for the same DOM entry', async () => {
    let resolveResponse: ((response: Response) => void) | undefined;
    const response = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    const rpcFetch = vi.fn(() => response);
    vi.stubGlobal('fetch', rpcFetch);

    const first = getBlockDOMBatch(['block-1']);
    const second = getBlockDOMBatch(['block-1']);
    await Promise.resolve();
    expect(rpcFetch).toHaveBeenCalledTimes(1);

    resolveResponse?.({
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        id: 1,
        result: {
          blocks: [{ id: 'block-1', data: { dom: '<div>one</div>' } }],
          failedIds: [],
          elapsedMs: 1,
          source: 'kernel'
        }
      })
    } as Response);

    await expect(Promise.all([first, second])).resolves.toEqual([
      new Map([['block-1', { dom: '<div>one</div>' }]]),
      new Map([['block-1', { dom: '<div>one</div>' }]])
    ]);
  });
});
