import type { Task } from '@/api';

export type TaskQuadrantId = 'important-urgent' | 'important-not-urgent' | 'not-important-urgent' | 'not-important-not-urgent';

export interface TaskQuadrant {
  id: TaskQuadrantId;
  important: boolean;
  urgent: boolean;
}

const QUADRANTS: Record<TaskQuadrantId, TaskQuadrant> = {
  'important-urgent': { id: 'important-urgent', important: true, urgent: true },
  'important-not-urgent': { id: 'important-not-urgent', important: true, urgent: false },
  'not-important-urgent': { id: 'not-important-urgent', important: false, urgent: true },
  'not-important-not-urgent': { id: 'not-important-not-urgent', important: false, urgent: false }
};

export const TASK_QUADRANT_ORDER: TaskQuadrantId[] = [
  'important-urgent',
  'important-not-urgent',
  'not-important-urgent',
  'not-important-not-urgent'
];

export function isTaskImportantForQuadrant(task: Pick<Task, 'priority'>): boolean {
  return task.priority === 'high' || task.priority === 'medium';
}

export function isTaskUrgentForQuadrant(
  task: Pick<Task, 'dueDate' | 'urgent'>,
  now = new Date(),
  dueWithinDays = 0
): boolean {
  if (task.urgent === true) return true;
  const dueDate = parseLocalDate(task.dueDate);
  if (!dueDate) return false;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const threshold = new Date(today);
  threshold.setDate(threshold.getDate() + Math.max(0, Math.floor(dueWithinDays)));
  return dueDate.getTime() <= threshold.getTime();
}

export function getTaskQuadrant(
  task: Pick<Task, 'priority' | 'dueDate' | 'urgent'>,
  now = new Date(),
  dueWithinDays = 0
): TaskQuadrant {
  const important = isTaskImportantForQuadrant(task);
  const urgent = isTaskUrgentForQuadrant(task, now, dueWithinDays);
  if (important && urgent) return QUADRANTS['important-urgent'];
  if (important) return QUADRANTS['important-not-urgent'];
  if (urgent) return QUADRANTS['not-important-urgent'];
  return QUADRANTS['not-important-not-urgent'];
}

function parseLocalDate(value: string | undefined): Date | null {
  const match = typeof value === 'string' ? value.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/) : null;
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}
