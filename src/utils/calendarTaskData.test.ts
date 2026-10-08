import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskRepository, type Task } from '@/api';
import { setRepeatInstanceStatus, setTaskRepeatSeries } from '@/repeatRepository';
import { invalidatePluginStorageReadCache } from './pluginStorage';
import { tasksToCompletedLifelogEvents } from './lifelogEvents';
import { buildCalendarLifelogFetchOptions, buildTaskFetchOptionsForLoadMode, resolveTaskLoadModeForView } from './taskViewLoadMode';

const plugin = vi.hoisted(() => ({ loadData: vi.fn(), saveData: vi.fn() }));
vi.mock('@/main', () => ({ usePlugin: () => plugin }));

const task: Task = {
  id: 'template', blockId: 'block-template', rootId: 'doc-1', notebookId: 'notebook-1',
  type: 'block', title: 'Repeat task', status: 'pending', priority: 'none', tags: [],
  startDate: '2026-09-01', dueDate: '2026-09-01',
  createdAt: '2026-09-01T00:00:00', updatedAt: '2026-09-01T00:00:00'
};

describe('complete calendar task data', () => {
  beforeEach(async () => {
    const storage = new Map<string, unknown>();
    plugin.loadData.mockImplementation(async (key: string) => structuredClone(storage.get(key) ?? null));
    plugin.saveData.mockImplementation(async (key: string, value: unknown) => {
      storage.set(key, structuredClone(value));
    });
    invalidatePluginStorageReadCache();
    vi.spyOn(TaskRepository as any, 'clearLocalBlockTasksCache').mockImplementation(() => undefined);
    vi.spyOn(TaskRepository as any, 'getCachedBlockTasks').mockResolvedValue(null);
    vi.spyOn(TaskRepository as any, 'getTasksFromAllArchiveSnapshot').mockResolvedValue(null);
    vi.spyOn(TaskRepository, 'saveBlockTasksCache').mockResolvedValue();
    await TaskRepository.clearCache();
  });

  afterEach(async () => {
    await TaskRepository.clearCache();
    invalidatePluginStorageReadCache();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it.each(['month', 'week', 'day', 'three-day'] as const)(
    'reconciles %s with the board even when the lightweight index omits a document', async (view) => {
      const undated = { ...task, id: 'undated', blockId: 'block-2', rootId: 'doc-2',
        startDate: undefined, dueDate: undefined };
      const source = [task, undated];
      const kernel = vi.spyOn(TaskRepository, 'getKernelLightTasks').mockResolvedValue({ tasks: [task], elapsedMs: 1 });
      const scan = vi.spyOn(TaskRepository as any, 'fetchBlockTasks').mockResolvedValue(source);
      const window = { startDate: '2026-10-04', endDate: '2026-10-10' };
      const calendar = await TaskRepository.getAllTasks(false, undefined,
        buildTaskFetchOptionsForLoadMode(resolveTaskLoadModeForView(view), window));
      const board = await TaskRepository.getAllTasks(false, undefined,
        buildTaskFetchOptionsForLoadMode(resolveTaskLoadModeForView('kanban')));
      expect(calendar.map(item => item.id)).toEqual(board.map(item => item.id));
      expect(calendar).toContainEqual(undated);
      expect(scan).toHaveBeenCalledWith(null, false, 'full');
      expect(kernel).not.toHaveBeenCalled();
    }
  );

  it('includes archived completions and repeat instances completed after their scheduled date', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 7, 10));
    const series = await setTaskRepeatSeries(task, 'daily');
    await setRepeatInstanceStatus(series!.id, '2026-09-30', 'completed');
    const archived = { ...task, id: 'archived', blockId: 'archived-block', archived: true,
      status: 'completed' as const, completedAt: new Date(2026, 9, 7, 9).toISOString() };
    const scan = vi.spyOn(TaskRepository as any, 'fetchBlockTasks').mockResolvedValue([task, archived]);
    const tasks = await TaskRepository.getAllTasks(false, { includeArchived: true },
      buildCalendarLifelogFetchOptions({ startDate: '2026-10-04', endDate: '2026-10-10' }));
    const completedInstance = tasks.find(item => item.isVirtual && item.repeatInstanceDate === '2026-09-30');
    expect(completedInstance?.status).toBe('completed');
    const events = tasksToCompletedLifelogEvents(tasks);
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceId: 'archived', date: '2026-10-07' }),
      expect.objectContaining({ date: '2026-10-07', sourceId: completedInstance!.id })
    ]));
    expect(scan).toHaveBeenCalledWith(expect.objectContaining({ includeArchived: true }), false, 'full');
  });
});
