import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import type { Task } from '@/api';
import type { Goal } from '@/goalRepository';
import { buildGoalWeeklyProgress } from '@/utils/personalStatsGoalActions';

const mocks = vi.hoisted(() => ({ getBlockTasks: vi.fn(), loadGoals: vi.fn(), loadGoalScopeDocuments: vi.fn() }));
vi.mock('@/api', () => ({ TaskRepository: { getBlockTasks: mocks.getBlockTasks } }));
vi.mock('@/goalRepository', () => ({ loadGoals: mocks.loadGoals, saveGoals: vi.fn(), updateGoalTaskMembership: vi.fn(), upsertGoal: vi.fn() }));
vi.mock('@/utils/goalScopeDocuments', () => ({ loadGoalScopeDocuments: mocks.loadGoalScopeDocuments }));

import { useGoals } from './useGoals';

describe('useGoals workbench history', () => {
  let wrapper: ReturnType<typeof mount> | undefined;
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadGoalScopeDocuments.mockResolvedValue([]);
  });
  afterEach(() => { wrapper?.unmount(); wrapper = undefined; });

  it('retains archived completions for weekly history while excluding them from active goal progress', async () => {
    const goal: Goal = { id: 'g', name: 'Goal', members: [{ notebookId: 'nb', documentId: 'doc' }] };
    const now = new Date(2026, 9, 8, 12);
    const base: Task = { id: 'open', blockId: 'open', type: 'block', title: 'Task', status: 'pending', priority: 'none', tags: [], notebookId: 'nb', rootId: 'doc', createdAt: '2026-10-01', updatedAt: '2026-10-08' };
    const tasks: Task[] = [base,
      { ...base, id: 'done', blockId: 'done', status: 'completed', completedAt: new Date(2026, 9, 7, 12).toISOString() },
      { ...base, id: 'archived', blockId: 'archived', status: 'completed', archived: true, completedAt: new Date(2026, 9, 8, 10).toISOString() }
    ];
    mocks.loadGoals.mockResolvedValue([goal]);
    mocks.getBlockTasks.mockImplementation(async (_useCache, scope) => scope?.includeArchived ? tasks : tasks.filter(task => !task.archived));
    let model!: ReturnType<typeof useGoals>;
    wrapper = mount(defineComponent({ setup() { model = useGoals(); return () => null; } }));
    await flushPromises();
    expect(model.goalTasks.value).toHaveLength(3);
    expect(model.goalItems.value[0]).toMatchObject({ totalTasks: 2, completedTasks: 1, remainingTasks: 1, progressPercent: 50, status: 'in-progress' });
    const history = buildGoalWeeklyProgress(model.goalItems.value, model.goalTasks.value, '2026-10-08', now);
    expect(history.taskCount).toBe(2);
    expect(history.entries[0].tasks[0].archived).toBe(true);
    await model.refreshGoalDocuments();
    expect(model.goalTasks.value).toHaveLength(3);
    expect(buildGoalWeeklyProgress(model.goalItems.value, model.goalTasks.value, '2026-10-08', now).taskCount).toBe(2);
  });
});
