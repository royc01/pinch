import type { Task } from '@/api';
import type { TaskAttributeChanges } from './taskChangeCoordinator';

export interface TaskEditorDraftSyncTarget {
  taskId: string;
  status: Task['status'];
  priority: Task['priority'];
  startDate: string;
  startTime: string;
  dueDate: string;
  dueTime: string;
  description: string;
  reminderType?: Task['reminderType'];
  reminderCustomTime: string;
  tags: string[];
  groupId: string;
  pinned?: boolean;
}

export function syncTaskEditorDraftFromAttributeChanges(
  task: Task | null | undefined,
  draft: TaskEditorDraftSyncTarget | null | undefined,
  attributeChanges?: TaskAttributeChanges
): boolean {
  const blockId = typeof task?.blockId === 'string' ? task.blockId.trim() : '';
  if (!task || !draft || !blockId || draft.taskId !== task.id) {
    return false;
  }

  const attrs = attributeChanges?.[blockId];
  if (!attrs) {
    return false;
  }
  const hasAttribute = (name: string): boolean => Object.prototype.hasOwnProperty.call(attrs, name);
  let applied = false;

  if (hasAttribute('custom-task-status')) {
    draft.status = task.status;
    applied = true;
  }
  if (hasAttribute('custom-task-priority')) {
    draft.priority = task.priority;
    applied = true;
  }
  if (hasAttribute('custom-task-pinned') && typeof draft.pinned === 'boolean') {
    draft.pinned = task.pinned === true;
    applied = true;
  }
  if (hasAttribute('custom-task-tags') || hasAttribute('custom-task-group')) {
    draft.tags = [...task.tags];
    draft.groupId = task.groupId || '';
    applied = true;
  }
  if (
    hasAttribute('custom-task-start-date')
    || hasAttribute('custom-task-start-time')
    || hasAttribute('custom-task-due-date')
    || hasAttribute('custom-task-due-time')
  ) {
    draft.startDate = task.startDate || '';
    draft.startTime = task.startTime || '';
    draft.dueDate = task.dueDate || '';
    draft.dueTime = task.dueTime || '';
    applied = true;
  }
  if (hasAttribute('custom-task-description')) {
    draft.description = task.description || '';
    applied = true;
  }
  if (hasAttribute('custom-task-reminder-type') || hasAttribute('custom-task-reminder-custom-time')) {
    draft.reminderType = task.reminderType;
    draft.reminderCustomTime = task.reminderCustomTime || '';
    applied = true;
  }

  return applied;
}
