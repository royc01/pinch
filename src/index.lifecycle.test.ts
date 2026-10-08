import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hooks = vi.hoisted(() => ({
  init: vi.fn(),
  destroy: vi.fn(),
  onLayoutReady: vi.fn(),
  initializeCalendarSyncSettings: vi.fn(),
  disposeCalendarSyncSettings: vi.fn()
}));

vi.mock('@/main', () => ({ init: hooks.init, destroy: hooks.destroy, onLayoutReady: hooks.onLayoutReady }));
vi.mock('@/utils/calendarSyncSettings', () => ({
  initializeCalendarSyncSettings: hooks.initializeCalendarSyncSettings,
  disposeCalendarSyncSettings: hooks.disposeCalendarSyncSettings
}));
vi.mock('@/kernelRpc', () => ({ configurePinchKernelRpc: vi.fn() }));
vi.mock('@/api', () => ({ invalidateBlockDOMCache: vi.fn() }));
vi.mock('@/utils/taskChangeCoordinator', () => ({ publishTaskChange: vi.fn(), resetTaskChangeCoordinator: vi.fn() }));

import HabitTrackerPlugin from './index';

describe('plugin startup cancellation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hooks.initializeCalendarSyncSettings.mockReset().mockResolvedValue(true);
  });
  afterEach(() => vi.restoreAllMocks());

  it('mounts only after settings finish loading', async () => {
    let finish!: (ready: boolean) => void;
    hooks.initializeCalendarSyncSettings.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const plugin = new HabitTrackerPlugin({} as any);
    const loading = plugin.onload();
    plugin.onLayoutReady();
    expect(hooks.init).not.toHaveBeenCalled();
    expect(hooks.onLayoutReady).not.toHaveBeenCalled();
    finish(true);
    await loading;
    expect(hooks.init).toHaveBeenCalledWith(plugin);
    plugin.onLayoutReady();
    expect(hooks.onLayoutReady).toHaveBeenCalledWith(plugin);
  });

  it('does not resume mounting when a delayed load finishes after unload', async () => {
    let finish!: (ready: boolean) => void;
    hooks.initializeCalendarSyncSettings.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const plugin = new HabitTrackerPlugin({} as any);
    const loading = plugin.onload();
    plugin.onunload();
    finish(true);
    await loading;
    plugin.onLayoutReady();
    expect(hooks.disposeCalendarSyncSettings).toHaveBeenCalledWith(plugin);
    expect(hooks.destroy).toHaveBeenCalledOnce();
    expect(hooks.init).not.toHaveBeenCalled();
    expect(hooks.onLayoutReady).not.toHaveBeenCalled();
  });

  it('does not mount when settings report a disposed host instance', async () => {
    hooks.initializeCalendarSyncSettings.mockResolvedValueOnce(false);
    const plugin = new HabitTrackerPlugin({} as any);
    await plugin.onload();
    plugin.onLayoutReady();
    expect(hooks.init).not.toHaveBeenCalled();
    expect(hooks.onLayoutReady).not.toHaveBeenCalled();
  });

  it('ignores an older load completing after a subsequent load', async () => {
    let finishOld!: (ready: boolean) => void;
    hooks.initializeCalendarSyncSettings.mockReturnValueOnce(new Promise(resolve => { finishOld = resolve; }));
    const plugin = new HabitTrackerPlugin({} as any);
    const older = plugin.onload();
    plugin.onunload();
    await plugin.onload();
    finishOld(true);
    await older;
    expect(hooks.init).toHaveBeenCalledOnce();
  });
});
