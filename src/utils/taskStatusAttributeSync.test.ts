import { beforeEach, describe, expect, it, vi } from 'vitest';
import { syncTaskStatusAttrsIfNeeded } from './taskHelpers';
import { createTaskStatusAttributeSync } from './taskStatusAttributeSync';

vi.mock('./taskHelpers', () => ({
  syncTaskStatusAttrsIfNeeded: vi.fn()
}));

describe('task status attribute sync', () => {
  beforeEach(() => {
    vi.mocked(syncTaskStatusAttrsIfNeeded).mockReset();
  });

  it('coalesces a task status and clears cache after persistence', async () => {
    vi.mocked(syncTaskStatusAttrsIfNeeded).mockResolvedValue(true);
    const onApplied = vi.fn().mockResolvedValue(undefined);
    const synchronizer = createTaskStatusAttributeSync({ onApplied });

    synchronizer.queue('block-a', 'pending');
    synchronizer.queue('block-a', 'completed', ' 2026-07-10T00:00:00.000Z ');
    synchronizer.queue('', 'pending');
    await synchronizer.flush(['block-a', 'block-a', 'block-b']);

    expect(syncTaskStatusAttrsIfNeeded).toHaveBeenCalledTimes(1);
    expect(syncTaskStatusAttrsIfNeeded).toHaveBeenCalledWith(
      'block-a',
      'completed',
      '2026-07-10T00:00:00.000Z'
    );
    expect(onApplied).toHaveBeenCalledTimes(1);

    await synchronizer.flush(['block-a']);
    expect(syncTaskStatusAttrsIfNeeded).toHaveBeenCalledTimes(1);
  });

  it('reports failed writes without clearing cache', async () => {
    const error = new Error('write failed');
    vi.mocked(syncTaskStatusAttrsIfNeeded).mockRejectedValue(error);
    const onApplied = vi.fn();
    const onError = vi.fn();
    const synchronizer = createTaskStatusAttributeSync({ onApplied, onError });

    synchronizer.queue('block-a', 'completed');
    await synchronizer.flush(['block-a']);

    expect(onError).toHaveBeenCalledWith('block-a', error);
    expect(onApplied).not.toHaveBeenCalled();
  });
});
