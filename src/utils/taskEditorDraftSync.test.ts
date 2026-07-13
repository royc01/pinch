import { describe, expect, it } from 'vitest';
import type { Task } from '@/api';
import { syncTaskEditorDraftFromAttributeChanges } from './taskEditorDraftSync';

const task: Task = {
  id: 'task-1',
  type: 'block',
  blockId: 'block-1',
  title: 'Shared task',
  status: 'in-progress',
  priority: 'medium',
  pinned: true,
  startDate: '2026-07-10',
  startTime: '09:00',
  dueDate: '2026-07-12',
  dueTime: '18:00',
  description: 'Updated description',
  reminderType: 'custom',
  reminderCustomTime: '2026-07-12T17:30',
  tags: ['tag-a', 'tag-b'],
  groupId: 'tag-a',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-07-10T00:00:00.000Z'
};

describe('task editor draft sync', () => {
  it('syncs changed task attributes into drafts with or without a pin field', () => {
    const sidebarDraft = {
      taskId: 'task-1',
      status: 'pending' as Task['status'],
      priority: 'none' as Task['priority'],
      pinned: false,
      startDate: '',
      startTime: '',
      dueDate: '',
      dueTime: '',
      description: '',
      reminderType: undefined,
      reminderCustomTime: '',
      tags: [],
      groupId: ''
    };
    const kanbanDraft = { ...sidebarDraft };
    delete (kanbanDraft as { pinned?: boolean }).pinned;
    const changes = {
      'block-1': {
        'custom-task-status': 'in-progress',
        'custom-task-priority': 'medium',
        'custom-task-pinned': '1',
        'custom-task-tags': '["tag-a","tag-b"]',
        'custom-task-group': 'tag-a',
        'custom-task-start-date': '2026-07-10',
        'custom-task-due-date': '2026-07-12',
        'custom-task-description': 'Updated description',
        'custom-task-reminder-type': 'custom'
      }
    };

    expect(syncTaskEditorDraftFromAttributeChanges(task, sidebarDraft, changes)).toBe(true);
    expect(syncTaskEditorDraftFromAttributeChanges(task, kanbanDraft, changes)).toBe(true);
    expect(sidebarDraft).toMatchObject({
      status: 'in-progress',
      priority: 'medium',
      pinned: true,
      tags: ['tag-a', 'tag-b'],
      groupId: 'tag-a',
      startDate: '2026-07-10',
      dueDate: '2026-07-12',
      description: 'Updated description',
      reminderType: 'custom'
    });
    expect(kanbanDraft).toMatchObject({
      status: 'in-progress',
      priority: 'medium',
      tags: ['tag-a', 'tag-b'],
      groupId: 'tag-a'
    });
    expect('pinned' in kanbanDraft).toBe(false);
  });
});
