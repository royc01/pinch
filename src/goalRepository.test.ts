import { describe, expect, it } from 'vitest';
import type { DocumentGroup } from './documentGroupRepository';
import { normalizeGoals } from './goalRepository';

describe('goal repository normalization', () => {
  it('migrates legacy document-group goals into explicit document members', () => {
    const legacyGroups: DocumentGroup[] = [
      {
        id: 'group-1',
        name: 'Alpha Docs',
        members: [
          {
            notebookId: 'nb-1',
            documentId: 'doc-1',
            name: 'Doc 1'
          },
          {
            notebookId: 'nb-1',
            documentId: 'doc-2',
            name: 'Doc 2'
          }
        ]
      }
    ];

    const [goal] = normalizeGoals([
      {
        id: 'goal-1',
        name: 'Legacy Goal',
        documentGroupId: 'group-1'
      }
    ], legacyGroups);

    expect(goal.members).toEqual([
      {
        notebookId: 'nb-1',
        documentId: 'doc-1',
        name: 'Doc 1'
      },
      {
        notebookId: 'nb-1',
        documentId: 'doc-2',
        name: 'Doc 2'
      }
    ]);
  });

  it('normalizes direct task members on goals', () => {
    const [goal] = normalizeGoals([
      {
        id: 'goal-2',
        name: 'Task Goal',
        members: [],
        taskMembers: [
          {
            taskId: ' task-1 ',
            blockId: ' block-1 ',
            notebookId: ' nb-1 ',
            rootId: ' doc-1 ',
            title: ' Task title ',
            addedAt: ' 2026-04-20T00:00:00.000Z '
          },
          {
            taskId: 'task-1',
            blockId: 'duplicate'
          },
          {
            taskId: ''
          },
          {
            blockId: 'block-only'
          }
        ]
      }
    ]);

    expect(goal.taskMembers).toEqual([
      {
        taskId: 'task-1',
        blockId: 'block-1',
        notebookId: 'nb-1',
        rootId: 'doc-1',
        title: 'Task title',
        addedAt: '2026-04-20T00:00:00.000Z'
      }
    ]);
  });

});
