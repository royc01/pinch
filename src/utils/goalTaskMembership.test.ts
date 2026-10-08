import { describe, expect, it } from 'vitest';
import type { Goal } from '../goalRepository';
import {
  getGoalIdsForTask,
  isTaskInGoalScope,
  moveTaskGoalBetweenGroups,
  setTaskGoalMembership
} from './goalTaskMembership';

describe('goal task membership', () => {
  it('maps virtual repeat instances back to the template task member', () => {
    const goals: Goal[] = [
      {
        id: 'goal-repeat',
        name: 'Repeat Goal',
        members: [],
        taskMembers: []
      }
    ];

    const virtualTask = {
      id: 'repeat-series-1:2026-07-05',
      taskId: 'template-task-1',
      sourceBlockId: 'template-block-1',
      repeatSeriesId: 'repeat-series-1',
      notebookId: 'nb-1',
      rootId: 'doc-1',
      title: 'Daily review',
      isVirtual: true
    };

    const [updatedGoal] = setTaskGoalMembership(goals, virtualTask, ['goal-repeat']);

    expect(updatedGoal.taskMembers).toEqual([
      expect.objectContaining({
        taskId: 'template-task-1',
        blockId: 'template-block-1',
        repeatSeriesId: 'repeat-series-1',
        notebookId: 'nb-1',
        rootId: 'doc-1',
        title: 'Daily review'
      })
    ]);
    expect(getGoalIdsForTask([updatedGoal], {
      id: 'repeat-series-1:2026-07-06',
      taskId: 'template-task-1',
      sourceBlockId: 'template-block-1',
      repeatSeriesId: 'repeat-series-1',
      isVirtual: true
    })).toEqual(['goal-repeat']);
  });

  it('matches repeat instances by series id when template ids are stale', () => {
    const goals: Goal[] = [
      {
        id: 'goal-repeat',
        name: 'Repeat Goal',
        members: [],
        taskMembers: [
          {
            taskId: 'old-template-task-id',
            repeatSeriesId: 'repeat-series-1'
          }
        ]
      }
    ];

    expect(getGoalIdsForTask(goals, {
      id: 'repeat-series-1:2026-07-06',
      taskId: 'new-template-task-id',
      sourceBlockId: 'new-template-block-id',
      repeatSeriesId: 'repeat-series-1',
      isVirtual: true
    })).toEqual(['goal-repeat']);
  });

  it('matches direct repeat goals when old data stores the template block id as taskId', () => {
    const goals: Goal[] = [
      {
        id: 'goal-repeat',
        name: 'Repeat Goal',
        members: [],
        taskMembers: [
          {
            taskId: 'template-block-1'
          }
        ]
      }
    ];

    expect(getGoalIdsForTask(goals, {
      id: 'repeat_repeat-series-1_2026-07-05',
      taskId: 'template-task-1',
      sourceBlockId: 'template-block-1',
      repeatSeriesId: 'repeat-series-1',
      isVirtual: true
    })).toEqual(['goal-repeat']);
  });

  it('matches direct repeat goals when old data stores the virtual instance id as taskId', () => {
    const goals: Goal[] = [
      {
        id: 'goal-repeat',
        name: 'Repeat Goal',
        members: [],
        taskMembers: [
          {
            taskId: 'repeat_repeat-series-1_2026-07-05'
          }
        ]
      }
    ];

    expect(getGoalIdsForTask(goals, {
      id: 'repeat_repeat-series-1_2026-07-05',
      taskId: 'template-task-1',
      sourceBlockId: 'template-block-1',
      repeatSeriesId: 'repeat-series-1',
      isVirtual: true
    })).toEqual(['goal-repeat']);
  });

  it('keeps a direct goal badge for virtual repeat instances when only document and title still match', () => {
    const goals: Goal[] = [
      {
        id: 'goal-repeat',
        name: 'Repeat Goal',
        members: [],
        taskMembers: [
          {
            taskId: 'template-task-before-repeat',
            blockId: 'template-block-before-repeat',
            notebookId: 'nb-1',
            rootId: 'doc-1',
            title: 'Daily review'
          }
        ]
      }
    ];

    expect(getGoalIdsForTask(goals, {
      id: 'repeat_series_new_2026-07-05',
      taskId: 'template-task-after-repeat',
      sourceBlockId: 'template-block-after-repeat',
      repeatSeriesId: 'repeat-series-new',
      notebookId: 'nb-1',
      rootId: 'doc-1',
      title: 'Daily review',
      isVirtual: true
    })).toEqual(['goal-repeat']);
  });

  it('includes tasks from descendant documents when a goal member stores the parent path', () => {
    const goal: Goal = {
      id: 'goal-parent-doc',
      name: 'Parent Document Goal',
      members: [
        {
          notebookId: 'nb-1',
          documentId: 'doc-parent',
          path: '/Projects/Alpha'
        }
      ]
    };

    expect(isTaskInGoalScope(goal, {
      id: 'task-child',
      type: 'block',
      title: 'Child document task',
      status: 'pending',
      priority: 'none',
      tags: [],
      notebookId: 'nb-1',
      rootId: 'doc-child',
      hPath: '/Projects/Alpha/Child',
      createdAt: '2026-07-06T00:00:00.000Z',
      updatedAt: '2026-07-06T00:00:00.000Z'
    })).toBe(true);
  });

  it('lets excluded task members override descendant document scope', () => {
    const goal: Goal = {
      id: 'goal-parent-doc',
      name: 'Parent Document Goal',
      members: [
        {
          notebookId: 'nb-1',
          documentId: 'doc-parent',
          path: '/Projects/Alpha'
        }
      ],
      excludedTaskMembers: [
        {
          taskId: 'task-child'
        }
      ]
    };

    expect(isTaskInGoalScope(goal, {
      id: 'task-child',
      type: 'block',
      title: 'Child document task',
      status: 'pending',
      priority: 'none',
      tags: [],
      notebookId: 'nb-1',
      rootId: 'doc-child',
      hPath: '/Projects/Alpha/Child',
      createdAt: '2026-07-06T00:00:00.000Z',
      updatedAt: '2026-07-06T00:00:00.000Z'
    })).toBe(false);
  });

  it('moves only the displayed goal while preserving other goal memberships', () => {
    const task = { id: 'task-1', blockId: 'block-1' };
    const goals: Goal[] = ['goal-a', 'goal-b', 'goal-c'].map(id => ({
      id,
      name: id,
      members: [],
      taskMembers: id === 'goal-c' ? [] : [{ taskId: task.id, blockId: task.blockId }]
    }));

    const moved = moveTaskGoalBetweenGroups(goals, task, ['goal-a', 'goal-b'], 'goal-a', 'goal-c');

    expect(getGoalIdsForTask(moved, task)).toEqual(['goal-b', 'goal-c']);
    expect(moved.find(goal => goal.id === 'goal-a')?.excludedTaskMembers).toEqual([
      expect.objectContaining({ taskId: 'task-1' })
    ]);
  });

  it('clears every effective goal when moved to the unassigned group', () => {
    const task = { id: 'task-1' };
    const goals: Goal[] = ['goal-a', 'goal-b'].map(id => ({
      id,
      name: id,
      members: [],
      taskMembers: [{ taskId: task.id }]
    }));

    const moved = moveTaskGoalBetweenGroups(goals, task, ['goal-a', 'goal-b'], 'goal-a', '');

    expect(getGoalIdsForTask(moved, task)).toEqual([]);
    expect(moved.every(goal => goal.excludedTaskMembers?.some(member => member.taskId === task.id))).toBe(true);
  });
});
