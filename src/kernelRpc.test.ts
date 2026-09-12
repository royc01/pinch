import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  callPinchKernel,
  configurePinchKernelRpc,
} from './kernelRpc';

describe('kernel RPC transport', () => {
  afterEach(() => {
    configurePinchKernelRpc(null);
    vi.restoreAllMocks();
  });

  it('uses the abortable HTTP transport even when the official client is available', async () => {
    const officialCall = vi.fn(async (params: unknown) => ({ params, source: 'official' }));
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        id: 1,
        result: { source: 'http' },
      }),
    } as Response);
    configurePinchKernelRpc({
      call: {
        getTaskIndex: officialCall,
      },
    });

    await expect(callPinchKernel('getTaskIndex', { limit: 25 })).resolves.toEqual({ source: 'http' });
    expect(officialCall).not.toHaveBeenCalled();
    expect(fetchSpy).toHaveBeenCalledWith('/api/plugin/rpc/pinch', expect.objectContaining({
      method: 'POST',
    }));
  });

  it('uses the HTTP RPC transport without a host client', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        id: 1,
        result: { source: 'http' },
      }),
    } as Response);

    await expect(callPinchKernel('ping')).resolves.toEqual({ source: 'http' });
    expect(fetchSpy).toHaveBeenCalledWith('/api/plugin/rpc/pinch', expect.objectContaining({
      method: 'POST',
    }));
  });

  it('coalesces matching concurrent RPC calls', async () => {
    let resolveResponse: ((response: Response) => void) | undefined;
    const response = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockReturnValue(response);

    const first = callPinchKernel('getTaskIndex', { limit: 25 });
    const second = callPinchKernel('getTaskIndex', { limit: 25 });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    resolveResponse?.({
      ok: true,
      json: async () => ({ jsonrpc: '2.0', id: 1, result: { source: 'http' } }),
    } as Response);

    await expect(Promise.all([first, second])).resolves.toEqual([
      { source: 'http' },
      { source: 'http' },
    ]);
  });
});
