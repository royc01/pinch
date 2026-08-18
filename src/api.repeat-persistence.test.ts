import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from './api';

const repeatMocks = vi.hoisted(() => ({
  setTaskRepeatSeries: vi.fn()
}));

vi.mock('@/repeatRepository', () => ({
  attachRepeatMetadataToTasks: vi.fn(async <T>(tasks: T[]) => tasks),
  getTaskRepeatFrequency: vi.fn(async () => 'none'),
  loadRepeatSeries: vi.fn(async () => []),
  materializeRepeatTasks: vi.fn(async <T>(tasks: T[]) => tasks),
  setRepeatInstanceStatus: vi.fn(async () => undefined),
  setTaskRepeatSeries: repeatMocks.setTaskRepeatSeries
}));

import { TaskRepository } from './api';

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

describe('repeat rule persistence', () => {
  beforeEach(() => {
    repeatMocks.setTaskRepeatSeries.mockReset().mockResolvedValue({
      id: 'series-persistence',
      frequency: 'daily'
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not change a pending task status merely because recurrence is enabled', async () => {
    await expect(TaskRepository.setTaskRepeatRule(task, 'daily')).resolves.toEqual({
      id: 'series-persistence',
      frequency: 'daily'
    });
    expect(repeatMocks.setTaskRepeatSeries).toHaveBeenCalledWith(task, 'daily');
  });
});
