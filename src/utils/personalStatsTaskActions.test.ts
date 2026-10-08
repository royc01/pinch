import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '@/api';

const mocks = vi.hoisted(() => ({ updateTask: vi.fn(), updateTaskMarkdown: vi.fn(), getTaskByBlockId: vi.fn() }));
vi.mock('@/api', () => ({ TaskRepository: { updateTask: mocks.updateTask, getTaskByBlockId: mocks.getTaskByBlockId } }));
vi.mock('@/utils/taskHelpers', () => ({ updateTaskMarkdown: mocks.updateTaskMarkdown }));

import { completePersonalStatsTask, reschedulePersonalStatsTask, resolvePersonalStatsActionTask, undoPersonalStatsTaskCompletion } from './personalStatsTaskActions';

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1', blockId: 'block-1', type: 'block', title: 'Task', status: 'pending',
    priority: 'none', tags: [], createdAt: '2026-10-01T12:00:00', updatedAt: '2026-10-01T12:00:00',
    ...overrides
  };
}

describe('personalStatsTaskActions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 8, 12));
    mocks.updateTask.mockResolvedValue(undefined);
    mocks.updateTaskMarkdown.mockResolvedValue(new Date().toISOString());
  });
  afterEach(() => vi.useRealTimers());

  it('uses a local current task or fetches a goal task outside the local view scope before editing', async () => {
    const previous = task();
    const local = task({ dueDate: '2026-10-12' });
    expect(await resolvePersonalStatsActionTask(previous, [local])).toBe(local);
    expect(mocks.getTaskByBlockId).not.toHaveBeenCalled();
    const current = task({ dueDate: '2026-10-12' });
    mocks.getTaskByBlockId.mockResolvedValue(current);
    expect(await resolvePersonalStatsActionTask(previous, [])).toBe(current);
    expect(mocks.getTaskByBlockId).toHaveBeenCalledWith('block-1', false);
    mocks.getTaskByBlockId.mockResolvedValue({ ...current, status: 'completed' });
    await expect(resolvePersonalStatsActionTask(previous, [])).rejects.toThrow('changed since the recommendation');
    mocks.getTaskByBlockId.mockResolvedValue({ ...previous, statusAutomatic: true });
    await expect(resolvePersonalStatsActionTask(previous, [])).rejects.toThrow('changed since the recommendation');
    expect(mocks.updateTaskMarkdown).not.toHaveBeenCalled();
  });

  it('rejects a missing or replaced goal task and a virtual recommendation before saving', async () => {
    for (const current of [null, task({ id: 'replacement' }), task({ blockId: 'replacement' }), task({ isVirtual: true })]) {
      mocks.getTaskByBlockId.mockResolvedValue(current);
      await expect(resolvePersonalStatsActionTask(task(), [])).rejects.toThrow('no longer exists');
    }
    mocks.getTaskByBlockId.mockClear();
    await expect(resolvePersonalStatsActionTask(task({ isVirtual: true }), [])).rejects.toThrow('Invalid workbench task');
    expect(mocks.getTaskByBlockId).not.toHaveBeenCalled();
    expect(mocks.updateTask).not.toHaveBeenCalled();
  });

  it('completes the source task marker and status through the shared completion flow', async () => {
    expect(await completePersonalStatsTask(task())).toBe(new Date().toISOString());
    expect(mocks.updateTaskMarkdown).toHaveBeenCalledOnce();
    expect(mocks.updateTaskMarkdown).toHaveBeenCalledWith('block-1', true, true, undefined, 'completed');
    expect(mocks.updateTask).not.toHaveBeenCalled();
    mocks.updateTaskMarkdown.mockRejectedValueOnce(new Error('write failed'));
    await expect(completePersonalStatsTask(task())).rejects.toThrow('write failed');
  });

  it('undoes completion using the original status and automatic status flag', async () => {
    const previous = task({ status: 'in-progress', statusAutomatic: true });
    const completed = { ...previous, status: 'completed', completedAt: new Date().toISOString() };
    await undoPersonalStatsTaskCompletion(completed, completed, previous);
    expect(mocks.updateTask).toHaveBeenCalledWith('task-1', { status: 'in-progress', statusAutomatic: true });
    mocks.updateTask.mockRejectedValueOnce(new Error('write failed'));
    await expect(undoPersonalStatsTaskCompletion(completed, completed, previous)).rejects.toThrow('write failed');
  });

  it('does not overwrite a task that changed or was completed again before undo', async () => {
    const previous = task({ status: 'delayed' });
    const completed = { ...previous, status: 'completed', completedAt: '2026-10-08T12:00:00' };
    for (const current of [
      { ...completed, completedAt: '2026-10-08T12:01:00' },
      { ...completed, status: 'pending' },
      { ...completed, archived: true },
      { ...completed, blockId: 'other-block' }
    ]) {
      await expect(undoPersonalStatsTaskCompletion(current, completed, previous)).rejects.toThrow('changed after completion');
    }
    expect(mocks.updateTask).not.toHaveBeenCalled();
  });

  it('reschedules only the deadline while preserving the start date, due time, and manual status', async () => {
    const current = task({ startDate: '2026-10-01', startTime: '09:00', dueDate: '2026-10-07', dueTime: '18:00', status: 'delayed' });
    const patch = await reschedulePersonalStatsTask(current, '2026-10-12');
    expect(mocks.updateTask).toHaveBeenCalledOnce();
    expect(mocks.updateTask).toHaveBeenCalledWith('task-1', { dueDate: '2026-10-12' });
    expect(patch).toEqual({ dueDate: '2026-10-12', updatedAt: new Date().toISOString() });
    expect(current.dueDate).toBe('2026-10-07');
    expect(current.status).toBe('delayed');
  });

  it('uses the existing automatic status rule when scheduling a task for the first time', async () => {
    const patch = await reschedulePersonalStatsTask(task(), '2026-10-08');
    expect(mocks.updateTask).toHaveBeenCalledWith('task-1', { dueDate: '2026-10-08', status: 'in-progress', statusAutomatic: true });
    expect(patch.status).toBe('in-progress');
  });

  it('does not report a fresh update for an unchanged deadline or a failed write', async () => {
    expect(await reschedulePersonalStatsTask(task({ dueDate: '2026-10-12' }), '2026-10-12')).toEqual({});
    expect(mocks.updateTask).not.toHaveBeenCalled();
    const current = task({ dueDate: '2026-10-07' });
    mocks.updateTask.mockRejectedValueOnce(new Error('write failed'));
    await expect(reschedulePersonalStatsTask(current, '2026-10-12')).rejects.toThrow('write failed');
    expect(current.dueDate).toBe('2026-10-07');
    expect(current.updatedAt).toBe('2026-10-01T12:00:00');
  });

  it.each(['', '2026-02-30', '2026-13-01', '2026-1-01', '2026-10-09'])(
    'rejects an invalid deadline or a deadline before the start date: %s', async (date) => {
      await expect(reschedulePersonalStatsTask(task({ startDate: '2026-10-10' }), date)).rejects.toThrow('Invalid deadline');
      expect(mocks.updateTask).not.toHaveBeenCalled();
    }
  );

  it.each<Partial<Task>>([
    { archived: true }, { isVirtual: true }, { status: 'completed' }, { status: 'cancelled' }, { blockId: undefined }
  ])('does not edit a task that is no longer eligible: %j', async (overrides) => {
    await expect(completePersonalStatsTask(task(overrides))).rejects.toThrow('no longer editable');
    await expect(reschedulePersonalStatsTask(task(overrides), '2026-10-12')).rejects.toThrow('no longer editable');
    expect(mocks.updateTask).not.toHaveBeenCalled();
    expect(mocks.updateTaskMarkdown).not.toHaveBeenCalled();
  });
});
