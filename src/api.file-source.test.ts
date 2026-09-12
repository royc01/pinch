import { afterEach, describe, expect, it, vi } from 'vitest';
import * as siyuan from 'siyuan';
import * as main from './main';
import { putFile, removeFile } from './api';

describe('plugin file writes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('identifies the active plugin app on file writes', async () => {
    vi.spyOn(main, 'usePlugin').mockReturnValue({ app: { appId: 'pinch-window' } } as any);
    const requests: Array<{ url: string; data: any }> = [];
    vi.spyOn(siyuan, 'fetchPost').mockImplementation((url, data, callback) => {
      requests.push({ url, data });
      callback?.({ code: 0, msg: '', data: null });
    });

    await putFile('/data/pinch.json', false, new Blob(['{}']));
    await removeFile('/data/pinch.json');

    expect(requests[0]?.url).toBe('/api/file/putFile');
    expect(requests[0]?.data.get('app')).toBe('pinch-window');
    expect(requests[1]).toEqual({
      url: '/api/file/removeFile',
      data: { path: '/data/pinch.json', app: 'pinch-window' }
    });
  });
});
