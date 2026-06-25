import { describe, expect, it } from 'vitest';
import type { Task } from '@/api';
import { buildGoalScopeDocumentsFromTasks } from './goalScopeDocuments';

describe('goal scope documents', () => {
  it('builds selectable goal documents from freshly loaded tasks', () => {
    const tasks = [
      {
        id: 'task-1',
        type: 'block',
        title: 'Task in new document',
        status: 'pending',
        priority: 'none',
        tags: [],
        rootId: '20260526120000-newdoc',
        hPath: '/Projects/New Document',
        notebookId: 'nb-1',
        createdAt: '2026-05-26T04:00:00.000Z',
        updatedAt: '2026-05-26T04:00:00.000Z'
      },
      {
        id: 'task-2',
        type: 'block',
        title: 'Another task in same document',
        status: 'completed',
        priority: 'none',
        tags: [],
        rootId: '20260526120000-newdoc',
        hPath: '/Projects/New Document',
        notebookId: 'nb-1',
        createdAt: '2026-05-26T04:01:00.000Z',
        updatedAt: '2026-05-26T04:01:00.000Z'
      },
      {
        id: 'task-3',
        type: 'block',
        title: 'Task in another notebook',
        status: 'in-progress',
        priority: 'none',
        tags: [],
        rootId: '20260525120000-otherdoc',
        hPath: '/Area/Other Document',
        notebookId: 'nb-2',
        createdAt: '2026-05-25T04:00:00.000Z',
        updatedAt: '2026-05-25T04:00:00.000Z'
      }
    ] as Task[];

    const documents = buildGoalScopeDocumentsFromTasks(tasks, new Map([
      ['nb-1', 'Work'],
      ['nb-2', 'Personal']
    ]));

    expect(documents).toEqual([
      {
        id: '20260526120000-newdoc',
        name: 'New Document',
        notebookId: 'nb-1',
        notebookName: 'Work',
        path: '/Projects/New Document'
      },
      {
        id: '20260525120000-otherdoc',
        name: 'Other Document',
        notebookId: 'nb-2',
        notebookName: 'Personal',
        path: '/Area/Other Document'
      }
    ]);
  });
});
