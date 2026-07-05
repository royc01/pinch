import { describe, expect, it } from 'vitest';
import type { Goal } from '../goalRepository';
import { getGoalIdsForTask, setTaskGoalMembership } from './goalTaskMembership';

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
});
