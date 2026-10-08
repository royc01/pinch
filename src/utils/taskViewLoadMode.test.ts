import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskRepository, type Task } from '@/api';
import { buildTaskFetchOptionsForLoadMode, isTaskLoadModeSatisfied, resolveTaskLoadModeForView } from './taskViewLoadMode';

const task: Task = {
  id: 'task-1', blockId: 'block-1', rootId: 'doc-1', notebookId: 'notebook-1',
  type: 'block', title: 'First task', status: 'pending', priority: 'none', tags: [],
  createdAt: '2026-10-01T00:00:00', updatedAt: '2026-10-01T00:00:00'
};
const completeTasks: Task[] = [task, {
  ...task, id: 'task-2', blockId: 'block-2', rootId: 'doc-2',
  title: 'Task from another document', status: 'completed', completedAt: '2026-10-02T00:00:00'
}];

describe('task view load modes', () => {
  beforeEach(async () => {
    vi.spyOn(TaskRepository as any, 'clearLocalBlockTasksCache').mockImplementation(() => undefined);
    await TaskRepository.clearCache();
    vi.spyOn(TaskRepository as any, 'getCachedBlockTasks').mockResolvedValue(null);
    vi.spyOn(TaskRepository as any, 'getTasksFromAllArchiveSnapshot').mockResolvedValue(null);
    vi.spyOn(TaskRepository, 'saveBlockTasksCache').mockResolvedValue();
  });

  afterEach(async () => {
    await TaskRepository.clearCache();
    vi.restoreAllMocks();
  });

  it('reconciles a reduced initial stats snapshot with the same complete fetch as the board', async () => {
    const scope = { includeArchived: true };
    const normalizedScope = (TaskRepository as any).normalizeTaskQueryScope(scope);
    const cacheKey = (TaskRepository as any).buildScopeCacheKey(normalizedScope, false, 'light');
    (TaskRepository as any).scopedMemoryCache.set(cacheKey, { tasks: [task], detailLevel: 'light', timestamp: Date.now() });
    const kernelFetch = vi.spyOn(TaskRepository, 'getKernelLightTasks').mockResolvedValue({ tasks: [task], elapsedMs: 1 });
    const fullFetch = vi.spyOn(TaskRepository as any, 'fetchBlockTasks').mockResolvedValue(completeTasks);
    const statsMode = resolveTaskLoadModeForView('stats');
    expect(isTaskLoadModeSatisfied('light-base', statsMode)).toBe(false);
    const statsTasks = await TaskRepository.getBlockTasks(true, scope, buildTaskFetchOptionsForLoadMode(statsMode));
    expect(statsTasks).toEqual(completeTasks);
    expect(new Set(statsTasks.map(item => item.rootId)).size).toBe(2);
    expect(fullFetch).toHaveBeenCalledWith(expect.objectContaining(scope), false, 'full');
    expect(kernelFetch).not.toHaveBeenCalled();
    const boardTasks = await TaskRepository.getBlockTasks(true, scope,
      buildTaskFetchOptionsForLoadMode(resolveTaskLoadModeForView('kanban')));
    expect(statsTasks.map(item => item.id)).toEqual(boardTasks.map(item => item.id));
  });

  it('does not consider calendar or missing snapshots sufficient for statistics', () => {
    const mode = resolveTaskLoadModeForView('stats');
    expect(isTaskLoadModeSatisfied(null, mode)).toBe(false);
    expect(isTaskLoadModeSatisfied('full-with-repeats', mode)).toBe(false);
    expect(isTaskLoadModeSatisfied('full', mode)).toBe(true);
  });

  it('reuses a complete board cache when opening statistics in the same source scope', async () => {
    const fetch = vi.spyOn(TaskRepository as any, 'fetchBlockTasks').mockResolvedValue(completeTasks);
    await TaskRepository.getBlockTasks(true, { includeArchived: true },
      buildTaskFetchOptionsForLoadMode(resolveTaskLoadModeForView('kanban')));
    fetch.mockClear();
    const result = await TaskRepository.getBlockTasks(true, { includeArchived: true },
      buildTaskFetchOptionsForLoadMode(resolveTaskLoadModeForView('stats')));
    expect(result).toEqual(completeTasks);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('loads the full selected notebook while retaining completed and archived tasks for stats', async () => {
    const scope = { notebookId: 'notebook-1', includeArchived: true };
    const archivedTask = { ...task, id: 'archived-task', blockId: 'archived-block', archived: true };
    const fetch = vi.spyOn(TaskRepository as any, 'fetchBlockTasks').mockResolvedValue([...completeTasks, archivedTask]);
    const result = await TaskRepository.getBlockTasks(false, scope,
      buildTaskFetchOptionsForLoadMode(resolveTaskLoadModeForView('stats')));
    expect(result).toContainEqual(archivedTask);
    expect(result.some(item => item.status === 'completed')).toBe(true);
    expect(fetch).toHaveBeenCalledWith(expect.objectContaining(scope), false, 'full');
  });

  it('loads complete calendar base tasks and limits repeat occurrences to the requested window', () => {
    const window = { startDate: '2026-10-01', endDate: '2026-10-31' };
    for (const view of ['month', 'week', 'day', 'three-day'] as const) {
      const mode = resolveTaskLoadModeForView(view);
      expect(mode).toBe('full-with-repeats');
      expect(buildTaskFetchOptionsForLoadMode(mode, window)).toMatchObject({
        detailLevel: 'full', repeatWindow: window, includeRepeatTemplateDate: true
      });
      expect(buildTaskFetchOptionsForLoadMode(mode, window).constrainBaseTasksToRepeatWindow).not.toBe(true);
    }
  });
});
