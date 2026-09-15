import { describe, expect, it } from 'vitest';
import { detachTaskInHierarchy, reparentTaskInHierarchy, type TaskHierarchyNode } from './taskHierarchyOptimistic';

describe('reparentTaskInHierarchy', () => {
  it('moves a top-level task under a nested target without mutating the input', () => {
    const input: TaskHierarchyNode[] = [
      { id: 'source', title: 'Source' },
      { id: 'root', subtasks: [{ id: 'target', title: 'Target' }] }
    ];

    const result = reparentTaskInHierarchy(input, 'source', 'target');

    expect(result.movedTask?.id).toBe('source');
    expect(result.tasks).toEqual([{
      id: 'root',
      subtasks: [
        { id: 'target', title: 'Target', subtasks: [{ id: 'source', title: 'Source' }] }
      ]
    }]);
    expect(input[0].id).toBe('source');
    expect(input[1].subtasks).toHaveLength(1);
  });

  it('matches source and target through block or node ids', () => {
    const result = reparentTaskInHierarchy([
      { id: 'root', subtasks: [{ id: 'child', nodeId: 'node-target' }] },
      { id: 'source', blockId: 'block-source' }
    ], 'block-source', 'node-target');

    expect((result.tasks[0].subtasks?.[0] as TaskHierarchyNode).subtasks?.[0].id).toBe('source');
  });

  it('returns the original tree for invalid or missing ids', () => {
    const input: TaskHierarchyNode[] = [{ id: 'one' }];
    expect(reparentTaskInHierarchy(input, 'missing', 'one')).toEqual({ tasks: input, movedTask: null });
    expect(reparentTaskInHierarchy(input, 'one', 'one')).toEqual({ tasks: input, movedTask: null });
  });

  it('promotes a nested task to the top level immediately', () => {
    const input: TaskHierarchyNode[] = [
      { id: 'root', subtasks: [{ id: 'source', title: 'Source' }] },
      { id: 'target', title: 'Target' }
    ];

    const result = detachTaskInHierarchy(input, 'source', {
      targetId: 'target',
      position: 'before'
    });

    expect(result.tasks.map(task => task.id)).toEqual(['root', 'source', 'target']);
    expect(result.tasks[1]).toMatchObject({ id: 'source', title: 'Source' });
    expect(input[0].subtasks).toHaveLength(1);
  });
});
