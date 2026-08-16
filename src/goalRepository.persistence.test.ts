import { beforeEach, describe, expect, it, vi } from 'vitest';

const plugin = vi.hoisted(() => ({
  loadData: vi.fn(),
  saveData: vi.fn()
}));

vi.mock('./main', () => ({
  usePlugin: () => plugin
}));
vi.mock('@/main', () => ({
  usePlugin: () => plugin
}));

function storedGoals() {
  return {
    version: 3,
    goals: [{
      id: 'goal-1',
      name: 'Ship release',
      members: [],
      taskMembers: []
    }],
    updatedAt: '2026-08-10T00:00:00.000Z'
  };
}

describe('goal persistence safety', () => {
  beforeEach(() => {
    vi.resetModules();
    plugin.loadData.mockReset().mockResolvedValue(null);
    plugin.saveData.mockReset().mockResolvedValue(undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('rejects a first read failure instead of presenting missing storage', async () => {
    plugin.loadData.mockRejectedValue(new Error('read failed'));
    const { loadGoals } = await import('./goalRepository');

    await expect(loadGoals()).rejects.toThrow('read failed');
  });

  it('returns the last good snapshot but blocks mutation after a read failure', async () => {
    const repository = await import('./goalRepository');
    plugin.loadData.mockResolvedValueOnce(storedGoals());
    await expect(repository.loadGoals()).resolves.toHaveLength(1);

    plugin.loadData.mockRejectedValueOnce(new Error('temporarily unavailable'));
    await expect(repository.loadGoals()).resolves.toEqual([
      expect.objectContaining({ id: 'goal-1', name: 'Ship release' })
    ]);

    plugin.loadData.mockResolvedValue(storedGoals());
    await expect(repository.saveGoals([])).rejects.toThrow('until a successful reload');
    expect(plugin.saveData).not.toHaveBeenCalled();
  });

  it('fails closed when persisted nested entries are invalid', async () => {
    plugin.loadData.mockResolvedValue({
      ...storedGoals(),
      goals: [{
        id: 'goal-1',
        name: 'Ship release',
        members: [],
        taskMembers: [{ blockId: 'missing-task-id' }]
      }]
    });
    const { saveGoals } = await import('./goalRepository');

    await expect(saveGoals([])).rejects.toThrow('Invalid taskMembers member');
    expect(plugin.saveData).not.toHaveBeenCalled();
  });

  it('propagates write failures without emitting a success event', async () => {
    plugin.loadData.mockResolvedValue(storedGoals());
    plugin.saveData.mockRejectedValue(new Error('write failed'));
    const [{ saveGoals }, { eventBus, Events }] = await Promise.all([
      import('./goalRepository'),
      import('./utils/eventBus')
    ]);
    const updated = vi.fn();
    const unsubscribe = eventBus.on(Events.GOALS_UPDATED, updated);

    await expect(saveGoals(storedGoals().goals)).rejects.toThrow('write failed');
    expect(updated).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('propagates failed migration writes', async () => {
    plugin.loadData.mockImplementation(async (key: string) => {
      if (key === 'Pinch-goals.json') {
        return [{ id: 'goal-legacy', name: 'Legacy goal', members: [] }];
      }
      return null;
    });
    plugin.saveData.mockRejectedValue(new Error('migration write failed'));
    const { loadGoals } = await import('./goalRepository');

    await expect(loadGoals()).rejects.toThrow('migration write failed');
  });

  it('uses a strict document-group read before migrating legacy goals', async () => {
    let documentGroupReads = 0;
    plugin.loadData.mockImplementation(async (key: string) => {
      if (key === 'Pinch-goals.json') {
        return [{ id: 'goal-legacy', name: 'Legacy goal', documentGroupId: 'group-1' }];
      }
      if (key === 'Pinch-document-groups.json' && documentGroupReads++ === 0) {
        return [{
          id: 'group-1',
          name: 'Legacy documents',
          members: [{ documentId: 'doc-1', notebookId: 'notebook-1' }]
        }];
      }
      throw new Error('document groups unavailable');
    });
    const { loadGoals } = await import('./goalRepository');

    await expect(loadGoals()).rejects.toThrow('document groups unavailable');
    expect(plugin.saveData).not.toHaveBeenCalled();
  });

  it('preserves unrelated goal updates across concurrent upserts', async () => {
    let stored = storedGoals();
    plugin.loadData.mockImplementation(async () => JSON.parse(JSON.stringify(stored)));
    plugin.saveData.mockImplementation(async (_key: string, value: ReturnType<typeof storedGoals>) => {
      stored = JSON.parse(JSON.stringify(value));
    });
    const { upsertGoal } = await import('./goalRepository');

    await Promise.all([
      upsertGoal({ id: 'goal-2', name: 'Second', members: [] }),
      upsertGoal({ id: 'goal-3', name: 'Third', members: [] })
    ]);

    expect(stored.goals.map(goal => goal.id)).toEqual(['goal-1', 'goal-2', 'goal-3']);
  });

  it('preserves concurrent task memberships for different tasks', async () => {
    let stored = {
      ...storedGoals(),
      goals: [
        ...storedGoals().goals,
        { id: 'goal-2', name: 'Second', members: [], taskMembers: [] }
      ]
    };
    plugin.loadData.mockImplementation(async () => JSON.parse(JSON.stringify(stored)));
    plugin.saveData.mockImplementation(async (_key: string, value: typeof stored) => {
      stored = JSON.parse(JSON.stringify(value));
    });
    const { updateGoalTaskMembership } = await import('./goalRepository');

    await Promise.all([
      updateGoalTaskMembership({ taskId: 'task-a' }, ['goal-1']),
      updateGoalTaskMembership({ taskId: 'task-b' }, ['goal-2'])
    ]);

    expect(stored.goals[0].taskMembers).toEqual([
      expect.objectContaining({ taskId: 'task-a' })
    ]);
    expect(stored.goals[1].taskMembers).toEqual([
      expect.objectContaining({ taskId: 'task-b' })
    ]);
  });
});
