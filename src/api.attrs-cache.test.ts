import { afterEach, describe, expect, it, vi } from 'vitest';
import * as siyuan from 'siyuan';
import { getBlockAttrs, invalidateBlockDOMCache } from './api';

describe('getBlockAttrs cache', () => {
  afterEach(() => {
    invalidateBlockDOMCache();
    vi.restoreAllMocks();
  });

  it('coalesces concurrent reads, returns isolated objects, and invalidates on demand', async () => {
    const fetchPost = vi.spyOn(siyuan, 'fetchPost').mockImplementation((url: string, data: any, callback?: (response: any) => void) => {
      expect(url).toBe('/api/attr/getBlockAttrs');
      expect(data).toEqual({ id: 'block-1' });
      callback?.({
        code: 0,
        data: { 'custom-task-status': 'pending' }
      });
    });

    const [first, second] = await Promise.all([
      getBlockAttrs('block-1'),
      getBlockAttrs('block-1')
    ]);

    expect(fetchPost).toHaveBeenCalledTimes(1);
    first['custom-task-status'] = 'mutated-locally';
    expect(second['custom-task-status']).toBe('pending');

    await expect(getBlockAttrs('block-1')).resolves.toEqual({
      'custom-task-status': 'pending'
    });
    expect(fetchPost).toHaveBeenCalledTimes(1);

    invalidateBlockDOMCache();
    await getBlockAttrs('block-1');
    expect(fetchPost).toHaveBeenCalledTimes(2);
  });
});
