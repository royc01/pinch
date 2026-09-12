import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  invalidatePluginStorageReadCache,
  readPluginStorageData,
  updatePluginStorageReadCache
} from './pluginStorage';

describe('plugin storage read cache', () => {
  afterEach(() => {
    invalidatePluginStorageReadCache();
    vi.restoreAllMocks();
  });

  it('coalesces concurrent reads, returns isolated snapshots, and invalidates', async () => {
    let resolveRead: ((value: { nested: { value: number } }) => void) | undefined;
    const pendingRead = new Promise<{ nested: { value: number } }>((resolve) => {
      resolveRead = resolve;
    });
    const read = vi.fn(() => pendingRead);

    const first = readPluginStorageData('settings.json', read);
    const second = readPluginStorageData('settings.json', read);
    expect(read).toHaveBeenCalledTimes(1);

    resolveRead?.({ nested: { value: 1 } });
    const [firstValue, secondValue] = await Promise.all([first, second]);
    firstValue.nested.value = 99;
    expect(secondValue).toEqual({ nested: { value: 1 } });

    await expect(readPluginStorageData('settings.json', read)).resolves.toEqual({
      nested: { value: 1 }
    });
    expect(read).toHaveBeenCalledTimes(1);

    invalidatePluginStorageReadCache(['settings.json']);
    read.mockResolvedValueOnce({ nested: { value: 2 } });
    await expect(readPluginStorageData('settings.json', read)).resolves.toEqual({
      nested: { value: 2 }
    });
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('bypasses the snapshot for strict reads and replaces it after a write', async () => {
    const read = vi.fn()
      .mockResolvedValueOnce({ value: 'cached' })
      .mockResolvedValueOnce({ value: 'fresh' });

    await expect(readPluginStorageData('settings.json', read)).resolves.toEqual({ value: 'cached' });
    await expect(readPluginStorageData('settings.json', read, { force: true })).resolves.toEqual({ value: 'fresh' });
    expect(read).toHaveBeenCalledTimes(2);

    updatePluginStorageReadCache('settings.json', { value: 'written' });
    await expect(readPluginStorageData('settings.json', read)).resolves.toEqual({ value: 'written' });
    expect(read).toHaveBeenCalledTimes(2);
  });
});
