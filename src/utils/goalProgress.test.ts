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
    expect(summary.totalTasks).toBe(2);
    expect(summary.completedTasks).toBe(1);
    expect(summary.progressPercent).toBe(50);
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
    expect(summary.totalTasks).toBe(0);
    expect(summary.completedTasks).toBe(0);
    expect(summary.progressPercent).toBe(0);
    expect(summary.status).toBe('empty');
  });
});
