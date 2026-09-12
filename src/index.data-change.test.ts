import { afterEach, describe, expect, it, vi } from 'vitest';
import HabitTrackerPlugin from './index';
import {
  invalidatePluginStorageReadCache,
  readPluginStorageData
} from './utils/pluginStorage';

describe('plugin data-change lifecycle', () => {
  afterEach(() => {
    invalidatePluginStorageReadCache();
    vi.restoreAllMocks();
  });

  it('overrides SiYuan’s default full-plugin reload on data changes', () => {
    const plugin = new HabitTrackerPlugin({} as any);

    expect(plugin.onDataChanged('sync')).toBeUndefined();
    expect(plugin.onDataChanged('overwrite')).toBeUndefined();
  });

  it('drops startup storage snapshots when another frontend changes plugin data', async () => {
    const read = vi.fn()
      .mockResolvedValueOnce({ value: 'before' })
      .mockResolvedValueOnce({ value: 'after' });
    const plugin = new HabitTrackerPlugin({} as any);

    await readPluginStorageData('Pinch-settings.json', read);
    await readPluginStorageData('Pinch-settings.json', read);
    expect(read).toHaveBeenCalledTimes(1);

    plugin.onDataChanged('sync');
    await expect(readPluginStorageData('Pinch-settings.json', read)).resolves.toEqual({ value: 'after' });
    expect(read).toHaveBeenCalledTimes(2);
  });
});
