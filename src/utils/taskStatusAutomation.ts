import type { Task } from '@/api';

type TaskDateFields = Pick<Task, 'startDate' | 'startTime' | 'dueDate' | 'dueTime'>;

function hasTaskDate(fields: Partial<TaskDateFields>): boolean {
  return !!(fields.startDate?.trim() || fields.dueDate?.trim());
}

export function shouldStartPendingTaskOnInitialDate(
  task: Pick<Task, 'status' | 'startDate' | 'dueDate'>,
  nextFields: Partial<TaskDateFields>
): boolean {
  return task.status === 'pending'
    && !hasTaskDate(task)
    && hasTaskDate(nextFields);
}

export function getInitialAutomaticTaskStatus(
  task: Pick<Task, 'status' | 'startDate' | 'dueDate'>,
  nextFields: Partial<TaskDateFields>,
  now: Date = new Date()
): Task['status'] | null {
  return shouldStartPendingTaskOnInitialDate(task, nextFields)
    ? getAutomaticScheduledTaskStatus(nextFields, now)
    : null;
}

export function getAutomaticScheduledTaskStatus(
  fields: Partial<TaskDateFields>,
  now: Date = new Date()
): Task['status'] {
  const startDate = fields.startDate?.trim() || fields.dueDate?.trim();
  if (!startDate) return 'pending';

  const dueDate = fields.dueDate?.trim() || startDate;
  const startTime = fields.startTime?.trim() || '00:00:00';
  const dueTime = fields.dueTime?.trim() || '23:59:59.999';
  const start = new Date(`${startDate}T${startTime}`);
  const due = new Date(`${dueDate}T${dueTime}`);
  const timestamp = now.getTime();

  if (!Number.isFinite(start.getTime()) || !Number.isFinite(due.getTime())) {
    return 'pending';
  }
  if (timestamp > due.getTime()) return 'delayed';
  if (timestamp >= start.getTime()) return 'in-progress';
  return 'pending';
}
