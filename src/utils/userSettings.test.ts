import { beforeEach, describe, expect, it, vi } from 'vitest';

const pluginMock = vi.hoisted(() => ({
  loadData: vi.fn(),
  saveData: vi.fn(),
}));

vi.mock('../main', () => ({
  usePlugin: () => pluginMock,
}));

import { UserSettingsManager } from './userSettings';

describe('UserSettingsManager', () => {
  beforeEach(() => {
    pluginMock.loadData.mockReset();
    pluginMock.saveData.mockReset();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: vi.fn().mockReturnValue(null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
    });
  });

  it('shares an in-flight settings load between callers', async () => {
    let resolveLoad!: (value: unknown) => void;
    pluginMock.loadData.mockReturnValue(new Promise(resolve => {
      resolveLoad = resolve;
    }));
    const manager = new UserSettingsManager();

    const firstLoad = manager.load();
    const secondLoad = manager.load();

    expect(pluginMock.loadData).toHaveBeenCalledTimes(1);
    resolveLoad({ kanban: { kanbanFilterSource: 'notebook:notebook-a' } });

    await expect(firstLoad).resolves.toMatchObject({
      kanban: { kanbanFilterSource: 'notebook:notebook-a' },
    });
    await expect(secondLoad).resolves.toMatchObject({
      kanban: { kanbanFilterSource: 'notebook:notebook-a' },
    });
  });

  it('hydrates a local snapshot without waiting for plugin storage', () => {
    const storage = {
      getItem: vi.fn().mockReturnValue(JSON.stringify({ kanban: { currentView: 'list' } })),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
    const manager = new UserSettingsManager();

    expect(manager.loadLocalSnapshot()).toMatchObject({ kanban: { currentView: 'list' } });
    expect(pluginMock.loadData).not.toHaveBeenCalled();
  });

  it('uses the local snapshot for direct loads too', async () => {
    const storage = {
      getItem: vi.fn().mockReturnValue(JSON.stringify({ taskManager: { filterSource: 'notebook:notebook-a' } })),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
    const manager = new UserSettingsManager();

    await expect(manager.load()).resolves.toMatchObject({
      taskManager: { filterSource: 'notebook:notebook-a' }
    });
    expect(pluginMock.loadData).not.toHaveBeenCalled();
  });

  it('normalizes the persisted manual task order', () => {
    const storage = {
      getItem: vi.fn().mockReturnValue(JSON.stringify({
        taskManager: { taskManualOrder: [' task-a ', 'task-a', '', 42, 'task-b'] }
      })),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
    const manager = new UserSettingsManager();

    expect(manager.loadLocalSnapshot()?.taskManager.taskManualOrder).toEqual(['task-a', 'task-b']);
  });

  it('restores the independent task view sort settings', () => {
    const storage = {
      getItem: vi.fn().mockReturnValue(JSON.stringify({
        kanban: {
          kanbanSortBy: 'priority',
          kanbanSortDirection: 'desc',
          listSortBy: 'dueDate',
          listSortDirection: 'asc',
          tableSortBy: 'title',
          tableSortDirection: 'desc',
          archiveTableSortBy: 'updatedAt',
          archiveTableSortDirection: 'asc'
        }
      })),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
    const manager = new UserSettingsManager();

    expect(manager.loadLocalSnapshot()?.kanban).toMatchObject({
      kanbanSortBy: 'priority',
      kanbanSortDirection: 'desc',
      listSortBy: 'dueDate',
      listSortDirection: 'asc',
      tableSortBy: 'title',
      tableSortDirection: 'desc',
      archiveTableSortBy: 'updatedAt',
      archiveTableSortDirection: 'asc'
    });
  });

  it('falls back for invalid task view sort settings', () => {
    const storage = {
      getItem: vi.fn().mockReturnValue(JSON.stringify({
        kanban: {
          kanbanSortBy: 'invalid',
          kanbanSortDirection: 'invalid',
          listSortBy: null,
          listSortDirection: null,
          tableSortBy: 42,
          tableSortDirection: 42,
          archiveTableSortBy: {},
          archiveTableSortDirection: []
        }
      })),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
    const manager = new UserSettingsManager();

    expect(manager.loadLocalSnapshot()?.kanban).toMatchObject({
      kanbanSortBy: 'default',
      kanbanSortDirection: 'asc',
      listSortBy: 'default',
      listSortDirection: 'asc',
      tableSortBy: 'default',
      tableSortDirection: 'asc',
      archiveTableSortBy: 'default',
      archiveTableSortDirection: 'asc'
    });
  });

  it('does not let stale plugin storage overwrite the local snapshot', async () => {
    const storage = {
      getItem: vi.fn().mockReturnValue(JSON.stringify({ kanban: { kanbanFilterSource: 'notebook:local' } })),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
    pluginMock.loadData.mockResolvedValue({ kanban: { kanbanFilterSource: 'all' } });
    const manager = new UserSettingsManager();

    manager.loadLocalSnapshot();
    await expect(manager.load({ refresh: true })).resolves.toMatchObject({
      kanban: { kanbanFilterSource: 'notebook:local' }
    });
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('writes concurrent updates in their call order', async () => {
    pluginMock.loadData.mockResolvedValue(null);
    let releaseFirstWrite!: () => void;
    const firstWrite = new Promise<void>(resolve => {
      releaseFirstWrite = resolve;
    });
    const snapshots: Array<{ kanban?: { kanbanFilterSource?: string } }> = [];
    pluginMock.saveData.mockImplementation(async (_key: string, data: typeof snapshots[number]) => {
      snapshots.push(data);
      if (snapshots.length === 1) {
        await firstWrite;
      }
    });
    const manager = new UserSettingsManager();
    await manager.load();

    const firstUpdate = manager.update('kanban', { kanbanFilterSource: 'all' });
    const secondUpdate = manager.update('kanban', { kanbanFilterSource: 'notebook:notebook-a' });

    await Promise.resolve();
    expect(pluginMock.saveData).toHaveBeenCalledTimes(1);
    releaseFirstWrite();
    await Promise.all([firstUpdate, secondUpdate]);

    expect(snapshots.map(snapshot => snapshot.kanban?.kanbanFilterSource)).toEqual([
      'all',
      'notebook:notebook-a',
    ]);
  });

  it('updates the local snapshot before an asynchronous plugin save completes', async () => {
    pluginMock.loadData.mockResolvedValue(null);
    let releaseSave!: () => void;
    pluginMock.saveData.mockReturnValue(new Promise<void>(resolve => {
      releaseSave = resolve;
    }));
    const manager = new UserSettingsManager();
    await manager.load();

    const update = manager.update('taskManager', { filterSource: 'notebook:notebook-a' });

    expect(globalThis.localStorage.setItem).toHaveBeenLastCalledWith(
      'siyuan-stand-settings',
      expect.stringContaining('notebook:notebook-a')
    );
    releaseSave();
    await update;
  });

  it('keeps the local update and suppresses an expected unload-time storage error', async () => {
    pluginMock.loadData.mockResolvedValue(null);
    pluginMock.saveData.mockRejectedValue({ code: 410, msg: 'Plugin lifecycle has ended' });
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const manager = new UserSettingsManager();
    await manager.load();

    await expect(manager.update('kanban', { kanbanFilterSource: 'notebook:notebook-a' })).resolves.toBeUndefined();
    expect(globalThis.localStorage.setItem).toHaveBeenLastCalledWith(
      'siyuan-stand-settings',
      expect.stringContaining('notebook:notebook-a')
    );
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });
});
