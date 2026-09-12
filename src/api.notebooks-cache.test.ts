import { afterEach, describe, expect, it, vi } from 'vitest';
import * as siyuan from 'siyuan';
import {
  invalidateNotebookListCache,
  lsNotebooks,
  renameNotebook
} from './api';

describe('lsNotebooks cache', () => {
  afterEach(() => {
    invalidateNotebookListCache();
    vi.restoreAllMocks();
  });

  it('coalesces startup reads, returns isolated data, and invalidates after a mutation', async () => {
    const fetchPost = vi.spyOn(siyuan, 'fetchPost').mockImplementation((url: string, data: any, callback?: (response: any) => void) => {
      if (url === '/api/notebook/lsNotebooks') {
        expect(data).toBe('');
        callback?.({
          code: 0,
          data: {
            notebooks: [{ id: 'notebook-1', name: 'First', closed: false }]
          }
        });
        return;
      }

      expect(url).toBe('/api/notebook/renameNotebook');
      expect(data).toEqual({ notebook: 'notebook-1', name: 'Renamed' });
      callback?.({ code: 0, data: null });
    });

    const [first, second] = await Promise.all([lsNotebooks(), lsNotebooks()]);
    expect(fetchPost).toHaveBeenCalledTimes(1);
    first.notebooks[0]!.name = 'Changed locally';
    expect(second.notebooks[0]!.name).toBe('First');

    await lsNotebooks();
    expect(fetchPost).toHaveBeenCalledTimes(1);

    await renameNotebook('notebook-1', 'Renamed');
    await lsNotebooks();
    expect(fetchPost).toHaveBeenCalledTimes(3);
  });
});
