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

  it('maps every task attribute from a SQL row through one shared mapper', () => {
    const row = {
      custom_task_id: 'task-1',
      custom_task_priority: 'high',
      custom_task_status: 'pending',
      custom_task_due_date: '2026-08-09',
      custom_task_due_time: '09:30',
      custom_task_start_date: '2026-08-08',
      custom_task_start_time: '09:00',
      custom_task_tags: '["tag-a"]',
      custom_task_description: 'description',
      custom_task_reminder_type: 'before',
      custom_task_reminder_custom_time: '10',
      custom_task_focus_estimate: '{"unit":"minutes","value":25}',
      custom_task_group: 'tag-a',
      custom_task_pinned: '1',
      custom_task_background_color: '#fff',
      custom_task_urgent: 'true',
      custom_task_archived: '0',
      custom_task_completed_at: '2026-08-09T09:30:00.000Z',
      custom_task_archived_at: '',
      custom_task_archive_reason: ''
    };

    expect((TaskRepository as any).buildTaskAttrsFromSqlRow(row)).toEqual({
      'custom-task-id': 'task-1',
      'custom-task-priority': 'high',
      'custom-task-status': 'pending',
      'custom-task-due-date': '2026-08-09',
      'custom-task-due-time': '09:30',
      'custom-task-start-date': '2026-08-08',
      'custom-task-start-time': '09:00',
      'custom-task-tags': '["tag-a"]',
      'custom-task-description': 'description',
      'custom-task-reminder-type': 'before',
      'custom-task-reminder-custom-time': '10',
      'custom-task-focus-estimate': '{"unit":"minutes","value":25}',
      'custom-task-group': 'tag-a',
      'custom-task-pinned': '1',
      'custom-task-background-color': '#fff',
      'custom-task-urgent': 'true',
      'custom-task-archived': '0',
      'custom-task-completed-at': '2026-08-09T09:30:00.000Z',
      'custom-task-archived-at': '',
      'custom-task-archive-reason': ''
    });
  });

  it('builds shared task fields while preserving attribute normalization rules', () => {
    const attrs = {
      'custom-task-priority': 'high',
      'custom-task-pinned': '1',
      'custom-task-due-time': '09:45',
      'custom-task-start-time': '',
      'custom-task-tags': '["tag-later", "tag-primary", "tag-later"]',
      'custom-task-group': 'tag-primary',
      'custom-task-description': 'description',
      'custom-task-reminder-type': 'custom',
      'custom-task-reminder-custom-time': '2026-08-10 10:30:52',
      'custom-task-focus-estimate': '{"unit":"pomodoros","value":4}',
      'custom-task-background-color': '#123456',
      'custom-task-urgent': 'true'
    };

    expect((TaskRepository as any).buildTaskFieldsFromAttrs(attrs, {
      dueDate: '2026-08-10',
      dueTime: '08:00',
      startDate: '2026-08-09',
      startTime: '07:00'
    })).toEqual({
      priority: 'high',
      pinned: true,
      dueDate: '2026-08-10',
      dueTime: '09:45',
      startDate: '2026-08-09',
      startTime: '07:00',
      tags: ['tag-primary', 'tag-later'],
      groupId: 'tag-primary',
      description: 'description',
      reminderType: 'custom',
      reminderCustomTime: '2026-08-10T10:30',
      focusEstimate: { unit: 'pomodoros', value: 4 },
      backgroundColor: '#123456',
      urgent: true
    });
  });

  it('parses task status consistently across markdown and attributes', () => {
    const parseStatus = (attrs: Record<string, string>, markdown: string) =>
      (TaskRepository as any).parseTaskStatus(attrs, markdown, null);

    expect(parseStatus({ 'custom-task-status': 'delayed' }, '- [x] finished')).toBe('completed');
    expect(parseStatus({ 'custom-task-status': 'delayed' }, '- [ ] waiting')).toBe('delayed');
    expect(parseStatus({ 'custom-task-status': 'in-progress' }, 'plain task text')).toBe('in-progress');
    expect(parseStatus({ 'custom-task-status': 'unknown' }, 'plain task text')).toBe('pending');
  });
});
