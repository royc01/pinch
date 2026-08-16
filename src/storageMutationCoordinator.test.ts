import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  enqueueStorageMutation,
  enqueueStorageMutations
} from './storageMutationCoordinator';

describe('storage mutation coordinator', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(navigator, 'locks');
  });

  it('waits for the matching cross-window Web Lock before running a mutation', async () => {
    let releaseLock: (() => Promise<string>) | null = null;
    const request = vi.fn((_name: string, callback: () => Promise<string>) => (
      new Promise<string>((resolve, reject) => {
        releaseLock = async () => {
          try {
            const result = await callback();
            resolve(result);
            return result;
          } catch (error) {
            reject(error);
            throw error;
          }
        };
      })
    ));
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: { request }
    });
    const operation = vi.fn().mockResolvedValue('saved');

    const pending = enqueueStorageMutation('Pinch-habit.json', operation);
    await Promise.resolve();
    await Promise.resolve();

    expect(request).toHaveBeenCalledWith('pinch-storage:Pinch-habit.json', expect.any(Function));
    expect(operation).not.toHaveBeenCalled();
    await releaseLock?.();
    await expect(pending).resolves.toBe('saved');
  });

  it('acquires multi-file locks once in stable key order', async () => {
    const lockNames: string[] = [];
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: {
        request: async (name: string, callback: () => Promise<string>) => {
          lockNames.push(name);
          return callback();
        }
      }
    });

    await expect(enqueueStorageMutations(
      ['Pinch-repeat-series.json', 'Pinch-repeat-records.json', 'Pinch-repeat-series.json'],
      async () => 'saved'
    )).resolves.toBe('saved');

    expect(lockNames).toEqual([
      'pinch-storage:Pinch-repeat-records.json',
      'pinch-storage:Pinch-repeat-series.json'
    ]);
  });

  it('falls back to the local queue when Web Locks are unavailable', async () => {
    Reflect.deleteProperty(navigator, 'locks');
    const calls: string[] = [];

    await Promise.all([
      enqueueStorageMutation('fallback.json', async () => {
        calls.push('first-start');
        await Promise.resolve();
        calls.push('first-end');
      }),
      enqueueStorageMutation('fallback.json', async () => {
        calls.push('second');
      })
    ]);

    expect(calls).toEqual(['first-start', 'first-end', 'second']);
  });
});
