import { TaskRepository, type Task } from '@/api';
import { updateTaskMarkdown } from '@/utils/taskHelpers';
import { getInitialAutomaticTaskStatus } from '@/utils/taskStatusAutomation';

export async function resolvePersonalStatsActionTask(task: Task, localTasks: readonly Task[]): Promise<Task> {
  if (task.type !== 'block' || !task.blockId || task.isVirtual) throw new Error('Invalid workbench task');
  const local = localTasks.find(item => item.id === task.id && item.blockId === task.blockId);
  // Global goal tasks can be outside the main view's notebook scope. Read their
  // current source before saving, rather than trusting the older goal snapshot.
  const current = local || await TaskRepository.getTaskByBlockId(task.blockId, false);
  if (!current || current.id !== task.id || current.blockId !== task.blockId || current.isVirtual) {
    throw new Error('Task no longer exists');
  }
  if (current.status !== task.status || (current.statusAutomatic === true) !== (task.statusAutomatic === true)) {
    throw new Error('Task changed since the recommendation');
  }
  return current;
}

function requireOpenBlockTask(task: Task): string {
  if (task.type !== 'block' || !task.blockId || task.isVirtual || task.archived
    || task.status === 'completed' || task.status === 'cancelled') {
    throw new Error('Task is no longer editable from the workbench');
  }
  return task.blockId;
}

export async function completePersonalStatsTask(task: Task): Promise<string> {
  const blockId = requireOpenBlockTask(task);
  return updateTaskMarkdown(blockId, true, true, undefined, 'completed');
}

export async function undoPersonalStatsTaskCompletion(
  current: Task,
  completed: Task,
  previous: Task
): Promise<void> {
  requireOpenBlockTask(previous);
  if (current.id !== previous.id || current.blockId !== previous.blockId
    || completed.id !== current.id || current.status !== 'completed' || current.archived
    || !completed.completedAt || current.completedAt !== completed.completedAt) {
    throw new Error('Task changed after completion');
  }
  await TaskRepository.updateTask(current.id, {
    status: previous.status,
    statusAutomatic: previous.statusAutomatic === true
  });
}

export async function reschedulePersonalStatsTask(task: Task, dueDate: string): Promise<Partial<Task>> {
  requireOpenBlockTask(task);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueDate);
  if (!match) throw new Error('Invalid deadline');
  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year
    || date.getMonth() + 1 !== month || date.getDate() !== day
    || (task.startDate && dueDate < task.startDate)) {
    throw new Error('Invalid deadline');
  }
  if (dueDate === task.dueDate) return {};

  const status = getInitialAutomaticTaskStatus(task, { ...task, dueDate });
  const updates: Partial<Task> = {
    dueDate,
    ...(status ? { status, statusAutomatic: true } : {})
  };
  await TaskRepository.updateTask(task.id, updates);
  return { ...updates, updatedAt: new Date().toISOString() };
}
