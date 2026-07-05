import { describe, expect, it } from 'vitest';
import type { Task } from '../api';
import type { Goal } from '../goalRepository';
import { buildGoalProgressSummaries } from './goalProgress';

describe('goal progress', () => {
  it('counts active top-level tasks by goal member documents', () => {
    const goals: Goal[] = [
      {
        id: 'goal-1',
        name: 'Project Alpha',
        members: [
          {
            notebookId: 'nb-1',
            documentId: 'doc-1'
          },
          {
            notebookId: 'nb-1',
            documentId: 'doc-2'
          }
        ]
      }
    ];

    const tasks = [
      {
        id: 'task-1',
        type: 'block',
        title: 'Done',
        status: 'completed',
        priority: 'none',
        tags: [],
        rootId: 'doc-1',
        notebookId: 'nb-1',
        createdAt: '2026-04-20T00:00:00.000Z',
        updatedAt: '2026-04-20T00:00:00.000Z'
      },
      {
        id: 'task-2',
        type: 'block',
        title: 'Doing',
        status: 'in-progress',
        priority: 'none',
        tags: [],
        rootId: 'doc-1',
        notebookId: 'nb-1',
        createdAt: '2026-04-20T00:00:00.000Z',
        updatedAt: '2026-04-20T00:00:00.000Z'
      },
      {
        id: 'task-3',
        type: 'block',
        title: 'Cancelled',
        status: 'cancelled',
        priority: 'none',
        tags: [],
        rootId: 'doc-2',
        notebookId: 'nb-1',
        createdAt: '2026-04-20T00:00:00.000Z',
        updatedAt: '2026-04-20T00:00:00.000Z'
      },
      {
        id: 'task-4',
        type: 'block',
        title: 'Archived',
        status: 'completed',
        priority: 'none',
        tags: [],
        rootId: 'doc-2',
        notebookId: 'nb-1',
        archived: true,
        createdAt: '2026-04-20T00:00:00.000Z',
        updatedAt: '2026-04-20T00:00:00.000Z'
      },
      {
        id: 'task-5',
        type: 'block',
        title: 'Outside Goal',
        status: 'completed',
        priority: 'none',
        tags: [],
        rootId: 'doc-3',
        notebookId: 'nb-1',
        createdAt: '2026-04-20T00:00:00.000Z',
        updatedAt: '2026-04-20T00:00:00.000Z'
      }
    ] as Task[];

    const [summary] = buildGoalProgressSummaries(goals, tasks);

    expect(summary.documentCount).toBe(2);
    expect(summary.taskMemberCount).toBe(0);
    expect(summary.totalTasks).toBe(2);
    expect(summary.completedTasks).toBe(1);
    expect(summary.progressPercent).toBe(50);
    expect(summary.status).toBe('in-progress');
  });

  it('counts direct task members without double-counting document tasks', () => {
    const goals: Goal[] = [
      {
        id: 'goal-direct',
        name: 'Direct Goal',
        members: [
          {
            notebookId: 'nb-1',
            documentId: 'doc-1'
          }
        ],
        taskMembers: [
          {
            taskId: 'task-1'
          },
          {
            taskId: 'task-3'
          }
        ]
      }
    ];

    const tasks = [
      {
        id: 'task-1',
        type: 'block',
        title: 'Document and direct',
        status: 'completed',
        priority: 'none',
        tags: [],
        rootId: 'doc-1',
        notebookId: 'nb-1',
        createdAt: '2026-04-20T00:00:00.000Z',
        updatedAt: '2026-04-20T00:00:00.000Z'
      },
      {
        id: 'task-2',
        type: 'block',
        title: 'Document only',
        status: 'pending',
        priority: 'none',
        tags: [],
        rootId: 'doc-1',
        notebookId: 'nb-1',
        createdAt: '2026-04-20T00:00:00.000Z',
        updatedAt: '2026-04-20T00:00:00.000Z'
      },
      {
        id: 'task-3',
        type: 'block',
        title: 'Direct only',
        status: 'completed',
        priority: 'none',
        tags: [],
        rootId: 'doc-2',
        notebookId: 'nb-1',
        createdAt: '2026-04-20T00:00:00.000Z',
        updatedAt: '2026-04-20T00:00:00.000Z'
      }
    ] as Task[];

    const [summary] = buildGoalProgressSummaries(goals, tasks);

    expect(summary.documentCount).toBe(1);
    expect(summary.taskMemberCount).toBe(2);
    expect(summary.totalTasks).toBe(3);
    expect(summary.completedTasks).toBe(2);
    expect(summary.progressPercent).toBe(67);
    expect(summary.status).toBe('in-progress');
  });

  it('keeps empty goals empty when no documents are selected', () => {
    const goals: Goal[] = [
      {
        id: 'goal-2',
        name: 'Empty Goal',
        members: []
      }
    ];

    const [summary] = buildGoalProgressSummaries(goals, []);

    expect(summary.documentCount).toBe(0);
    expect(summary.taskMemberCount).toBe(0);
    expect(summary.totalTasks).toBe(0);
    expect(summary.completedTasks).toBe(0);
    expect(summary.progressPercent).toBe(0);
    expect(summary.status).toBe('empty');
  });

  it('counts recurring task templates without counting virtual instances', () => {
    const goals: Goal[] = [
      {
        id: 'goal-repeat',
        name: 'Repeat Goal',
        members: [
          {
            notebookId: 'nb-1',
            documentId: 'doc-1'
          }
        ],
        taskMembers: [
          {
            taskId: 'template-task-1',
            blockId: 'template-block-1'
          }
        ]
      }
    ];

    const tasks = [
      {
        id: 'template-task-1',
        type: 'block',
        title: 'Daily review',
        status: 'completed',
        priority: 'none',
        tags: [],
        blockId: 'template-block-1',
        rootId: 'doc-1',
        notebookId: 'nb-1',
        repeatSeriesId: 'series-1',
        repeatFrequency: 'daily',
        isVirtual: false,
        createdAt: '2026-07-05T00:00:00.000Z',
        updatedAt: '2026-07-05T00:00:00.000Z'
      },
      {
        id: 'series-1:2026-07-06',
        taskId: 'template-task-1',
        sourceBlockId: 'template-block-1',
        type: 'block',
        title: 'Daily review',
        status: 'in-progress',
        priority: 'none',
        tags: [],
        rootId: 'doc-1',
        notebookId: 'nb-1',
        repeatSeriesId: 'series-1',
        repeatFrequency: 'daily',
        repeatInstanceDate: '2026-07-06',
        isVirtual: true,
        createdAt: '2026-07-05T00:00:00.000Z',
        updatedAt: '2026-07-05T00:00:00.000Z'
      }
    ] as Task[];

    const [summary] = buildGoalProgressSummaries(goals, tasks);

    expect(summary.totalTasks).toBe(1);
    expect(summary.completedTasks).toBe(1);
    expect(summary.progressPercent).toBe(100);
    expect(summary.status).toBe('completed');
  });
});
