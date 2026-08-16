import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as siyuan from 'siyuan';
import type { Task } from './api';

const repeatMocks = vi.hoisted(() => ({
  notifyRepeatChanged: vi.fn(),
  setTaskRepeatSeries: vi.fn()
}));

vi.mock('@/repeatRepository', () => ({
  attachRepeatMetadataToTasks: vi.fn(async <T>(tasks: T[]) => tasks),
  getTaskRepeatFrequency: vi.fn(async () => 'none'),
  loadRepeatSeries: vi.fn(async () => []),
  materializeRepeatTasks: vi.fn(async <T>(tasks: T[]) => tasks),
  notifyRepeatChanged: repeatMocks.notifyRepeatChanged,
  setRepeatInstanceStatus: vi.fn(async () => undefined),
  setTaskRepeatSeries: repeatMocks.setTaskRepeatSeries
}));

import { SiyuanApiError, TaskRepository } from './api';

const task: Task = {
  id: 'task-repeat-persistence',
  type: 'block',
  blockId: 'block-repeat-persistence',
  title: 'Recurring task',
  status: 'pending',
  priority: 'none',
  tags: [],
  createdAt: '2026-08-10T00:00:00.000Z',
  updatedAt: '2026-08-10T00:00:00.000Z'
};

describe('repeat rule persistence ordering', () => {
  beforeEach(() => {
    repeatMocks.notifyRepeatChanged.mockReset();
    repeatMocks.setTaskRepeatSeries.mockReset().mockResolvedValue({
      id: 'series-persistence',
      frequency: 'daily'
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not publish a repeat change when the pending-task attribute write fails', async () => {
    vi.spyOn(siyuan, 'fetchSyncPost').mockResolvedValue({
      code: -1,
      msg: 'attribute write denied',
      data: null
    } as never);

    await expect(TaskRepository.setTaskRepeatRule(task, 'daily'))
      .rejects.toBeInstanceOf(SiyuanApiError);

    expect(repeatMocks.setTaskRepeatSeries).toHaveBeenCalledWith(task, 'daily', {
      emitChange: false
    });
    expect(repeatMocks.notifyRepeatChanged).not.toHaveBeenCalled();
  });

  it('publishes the deferred repeat change after the attribute write succeeds', async () => {
    vi.spyOn(siyuan, 'fetchSyncPost').mockResolvedValue({
      code: 0,
      msg: '',
      data: null
    } as never);

    await expect(TaskRepository.setTaskRepeatRule(task, 'daily')).resolves.toEqual({
      id: 'series-persistence',
      frequency: 'daily'
    });

    expect(repeatMocks.notifyRepeatChanged).toHaveBeenCalledWith({
      blockId: 'block-repeat-persistence',
      seriesId: 'series-persistence',
      frequency: 'daily'
    });
  });
});
