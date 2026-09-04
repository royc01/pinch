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

  it('prefers the official plugin kernel RPC client', async () => {
    const officialCall = vi.fn(async (params: unknown) => ({ params, source: 'official' }));
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    configurePinchKernelRpc({
      call: {
        getTaskIndex: officialCall,
      },
    });

    await expect(callPinchKernel('getTaskIndex', { limit: 25 })).resolves.toEqual({
      params: { limit: 25 },
      source: 'official',
    });
    expect(officialCall).toHaveBeenCalledOnce();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('keeps the HTTP RPC fallback when the official client is unavailable', async () => {
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
});
