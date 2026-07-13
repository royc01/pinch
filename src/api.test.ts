import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as siyuan from 'siyuan';
import { setBlockAttrs, type Task, TaskRepository, updateTaskListItemMarker } from './api';
import { resetCrdtRepository, useCrdtTasks } from './crdtStore';
import { eventBus, Events } from './utils/eventBus';
import {
  resetTaskChangeCoordinator,
  type TaskChangePayload
} from './utils/taskChangeCoordinator';

const task: Task = {
  id: 'task-1',
  type: 'block',
  blockId: 'block-1',
  title: 'Shared task',
  status: 'pending',
  priority: 'none',
  tags: ['tag-a'],
  subtasks: [{
    id: 'subtask-1',
    title: 'Shared subtask',
    completed: false
  }],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

describe('TaskRepository incremental task fetches', () => {
  let taskChanges: TaskChangePayload[] = [];
  let unsubscribeTaskChanges: (() => void) | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    resetCrdtRepository();
    (TaskRepository as any).incrementalTaskFetchPromises.clear();
    vi.spyOn(TaskRepository, 'filterIncludedBlockIds').mockResolvedValue(['block-1']);
    resetTaskChangeCoordinator();
    eventBus.clear();
    taskChanges = [];
    unsubscribeTaskChanges = eventBus.on(Events.TASK_CHANGED, (payload: TaskChangePayload) => {
      taskChanges.push(payload);
    });
  });

  afterEach(() => {
    unsubscribeTaskChanges?.();
    unsubscribeTaskChanges = null;
    resetTaskChangeCoordinator();
    eventBus.clear();
    vi.restoreAllMocks();
    resetCrdtRepository();
    (TaskRepository as any).incrementalTaskFetchPromises.clear();
    vi.useRealTimers();
  });

  it('deduplicates concurrent block fetches and clones the result per caller', async () => {
    const fetchSpy = vi.spyOn(TaskRepository as any, 'fetchIncrementalTasksByBlockIds')
      .mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return new Map([['block-1', task]]);
      });

    const firstRequest = TaskRepository.getTasksByBlockIds(['block-1'], false, undefined, { useLiveDom: true });
    const secondRequest = TaskRepository.getTasksByBlockIds(['block-1'], false, undefined, { useLiveDom: true });

    await vi.runAllTimersAsync();
    const [firstResult, secondResult] = await Promise.all([firstRequest, secondRequest]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(firstResult).not.toBe(secondResult);

    const firstTask = firstResult.get('block-1')!;
    const secondTask = secondResult.get('block-1')!;
    expect(firstTask).not.toBe(secondTask);

    firstTask.tags.push('local-tag');
    firstTask.subtasks![0]!.title = 'Changed locally';

    expect(secondTask.tags).toEqual(['tag-a']);
    expect(secondTask.subtasks![0]!.title).toBe('Shared subtask');
  });

  it('bypasses an older in-flight fetch when a fresh result is required', async () => {
    let resolveStaleFetch: (result: Map<string, Task>) => void = () => undefined;
    const staleFetch = new Promise<Map<string, Task>>((resolve) => {
      resolveStaleFetch = resolve;
    });
    let notifyStaleFetchStarted: () => void = () => undefined;
    const staleFetchStarted = new Promise<void>((resolve) => {
      notifyStaleFetchStarted = resolve;
    });
    const freshTask: Task = { ...task, priority: 'high' };
    const fetchSpy = vi.spyOn(TaskRepository as any, 'fetchIncrementalTasksByBlockIds')
      .mockImplementationOnce(() => {
        notifyStaleFetchStarted();
        return staleFetch;
      })
      .mockResolvedValueOnce(new Map([['block-1', freshTask]]));

    const staleRequest = TaskRepository.getTasksByBlockIds(
      ['block-1'],
      false,
      undefined,
      { useLiveDom: true }
    );
    await staleFetchStarted;

    const freshResult = await TaskRepository.getTasksByBlockIds(
      ['block-1'],
      false,
      undefined,
      { useLiveDom: true, forceFresh: true }
    );

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(freshResult.get('block-1')?.priority).toBe('high');

    resolveStaleFetch(new Map([['block-1', task]]));
    await staleRequest;
  });

  it('publishes task attribute writes for other views', async () => {
    await setBlockAttrs('block-1', {
      'custom-task-priority': 'high'
    });
    vi.advanceTimersByTime(8);

    expect(taskChanges).toEqual([{
      blockIds: ['block-1'],
      revision: 1,
      attributeChanges: {
        'block-1': {
          'custom-task-priority': 'high'
        }
      }
    }]);
  });

  it('publishes task marker writes without a component-level fallback', async () => {
    vi.spyOn(siyuan, 'fetchSyncPost').mockResolvedValue({ code: 0, data: [] } as never);
    await updateTaskListItemMarker('block-1', 'x');
    vi.advanceTimersByTime(100);

    expect(taskChanges).toEqual([{
      blockIds: ['block-1'],
      revision: 1
    }]);
  });

  it('publishes archived task writes through the shared attribute path', async () => {
    vi.spyOn(TaskRepository as any, 'resolveBlockIdByTaskId').mockResolvedValue('block-1');
    vi.spyOn(TaskRepository, 'clearCache').mockResolvedValue();

    await TaskRepository.archiveTask('task-1', 'manual');
    vi.advanceTimersByTime(8);

    expect(taskChanges).toHaveLength(1);
    expect(taskChanges[0]).toMatchObject({
      blockIds: ['block-1'],
      attributeChanges: {
        'block-1': {
          'custom-task-archived': '1',
          'custom-task-archive-reason': 'manual'
        }
      }
    });
  });

  it('updates the shared task state before views reconcile from storage', async () => {
    const { syncFromSQL: syncGlobalTasks, tasks: globalTasks } = useCrdtTasks();
    const { syncFromSQL: syncSidebarTasks, tasks: sidebarTasks } = useCrdtTasks('task-manager');
    const initialTask = {
      ...task,
      tags: []
    };
    syncGlobalTasks([initialTask]);
    syncSidebarTasks([initialTask]);

    await setBlockAttrs('block-1', {
      'custom-task-priority': 'medium',
      'custom-task-tags': '["tag-a"]',
      'custom-task-group': 'tag-a'
    });

    expect(globalTasks.value[0]).toMatchObject({
      priority: 'medium',
      tags: ['tag-a'],
      groupId: 'tag-a'
    });
    expect(sidebarTasks.value[0]).toMatchObject({
      priority: 'medium',
      tags: ['tag-a'],
      groupId: 'tag-a'
    });
  });
});
