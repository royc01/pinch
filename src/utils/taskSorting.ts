import type { Task } from '@/api';

export type TaskSortField = 'default' | 'dueDate' | 'startDate' | 'priority' | 'createdAt' | 'updatedAt' | 'title';
export type TaskSortDirection = 'asc' | 'desc';

export type TaskDropPosition = 'before' | 'after';

const priorityRank: Record<Task['priority'], number> = {
  high: 0,
  medium: 1,
  low: 2,
  none: 3
};

function compareOptional(left: number | null, right: number | null, direction: TaskSortDirection): number {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return direction === 'asc' ? left - right : right - left;
}

function getDateTimestamp(value?: string): number | null {
  const timestamp = Date.parse(value || '');
  return Number.isFinite(timestamp) ? timestamp : null;
}

function getTaskDateTimestamp(date?: string, time?: string): number | null {
  const normalizedDate = typeof date === 'string' ? date.trim() : '';
  if (!normalizedDate) return null;
  const normalizedTime = typeof time === 'string' && /^\d{1,2}:\d{2}$/.test(time.trim()) ? time.trim() : '00:00';
  const timestamp = Date.parse(`${normalizedDate}T${normalizedTime}`);
  return Number.isFinite(timestamp) ? timestamp : null;
}

/** Sorts a task collection without mutating its source. Empty values always stay last. */
export function sortTasks(tasks: Task[], field: TaskSortField, direction: TaskSortDirection): Task[] {
  if (field === 'default') return tasks;

  return [...tasks].sort((left, right) => {
    let comparison = 0;
    if (field === 'priority') {
      comparison = direction === 'asc'
        ? priorityRank[left.priority] - priorityRank[right.priority]
        : priorityRank[right.priority] - priorityRank[left.priority];
    } else if (field === 'title') {
      comparison = left.title.localeCompare(right.title, 'zh-CN');
      if (direction === 'desc') comparison *= -1;
    } else if (field === 'dueDate') {
      comparison = compareOptional(
        getTaskDateTimestamp(left.dueDate, left.dueTime),
        getTaskDateTimestamp(right.dueDate, right.dueTime),
        direction
      );
    } else if (field === 'startDate') {
      comparison = compareOptional(
        getTaskDateTimestamp(left.startDate, left.startTime),
        getTaskDateTimestamp(right.startDate, right.startTime),
        direction
      );
    } else {
      comparison = compareOptional(getDateTimestamp(left[field]), getDateTimestamp(right[field]), direction);
    }

    if (comparison !== 0) return comparison;
    return left.id.localeCompare(right.id);
  });
}

/**
 * Keeps pinned tasks at the front in their saved manual order, then applies
 * the selected automatic sort only to unpinned tasks.
 */
export function sortTasksKeepingPinnedManualOrder(
  tasks: Task[],
  field: TaskSortField,
  direction: TaskSortDirection,
  orderedTaskIds: readonly string[]
): Task[] {
  const pinnedTasks = applyManualTaskOrder(
    tasks.filter(task => task.pinned === true),
    orderedTaskIds
  );
  const unpinnedTasks = sortTasks(
    tasks.filter(task => task.pinned !== true),
    field,
    direction
  );

  return [...pinnedTasks, ...unpinnedTasks];
}

/** Reorders known tasks in place while preserving the automatic slots of new/hidden tasks. */
export function applyManualTaskOrder(tasks: Task[], orderedTaskIds: readonly string[]): Task[] {
  if (orderedTaskIds.length === 0 || tasks.length < 2) return tasks;

  const taskById = new Map(tasks.map(task => [task.id, task]));
  const manuallyOrderedTasks = orderedTaskIds
    .map(id => taskById.get(id))
    .filter((task): task is Task => task !== undefined);
  if (manuallyOrderedTasks.length < 2) return tasks;

  const manuallyOrderedIdSet = new Set(manuallyOrderedTasks.map(task => task.id));
  let manualIndex = 0;
  return tasks.map(task => (
    manuallyOrderedIdSet.has(task.id)
      ? manuallyOrderedTasks[manualIndex++]
      : task
  ));
}

/** Keeps automatic priority groups fixed and applies manual order only within each group. */
export function applyManualTaskOrderWithinGroups(
  tasks: Task[],
  orderedTaskIds: readonly string[],
  getGroupKey: (task: Task) => string
): Task[] {
  if (orderedTaskIds.length === 0 || tasks.length < 2) return tasks;

  const groupedTasks = new Map<string, Task[]>();
  for (const task of tasks) {
    const key = getGroupKey(task);
    const group = groupedTasks.get(key);
    if (group) group.push(task);
    else groupedTasks.set(key, [task]);
  }

  const orderedGroups = new Map<string, Task[]>();
  groupedTasks.forEach((group, key) => {
    orderedGroups.set(key, applyManualTaskOrder(group, orderedTaskIds));
  });
  const groupIndexes = new Map<string, number>();
  return tasks.map((task) => {
    const key = getGroupKey(task);
    const index = groupIndexes.get(key) || 0;
    groupIndexes.set(key, index + 1);
    return orderedGroups.get(key)?.[index] || task;
  });
}

export function getDefaultTaskManualOrderGroupKey(
  task: Task,
  status: Task['status'] = task.status,
  todayStart = new Date().setHours(0, 0, 0, 0)
): string {
  const completionGroup = status === 'completed' ? 'completed' : 'active';
  if (task.pinned === true) return `${completionGroup}:pinned`;

  if (status === 'completed') return completionGroup;

  const dueTimestamp = getTaskDateTimestamp(task.dueDate, task.dueTime);
  const overdueGroup = dueTimestamp !== null && dueTimestamp < todayStart ? 'overdue' : 'current';
  return `${completionGroup}:${overdueGroup}:${priorityRank[task.priority]}`;
}

/** Adds currently loaded tasks to the persisted order without discarding IDs from other scopes. */
export function reconcileManualTaskOrder(
  orderedTaskIds: readonly string[],
  currentTaskIds: readonly string[]
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of [...orderedTaskIds, ...currentTaskIds]) {
    const normalizedId = typeof id === 'string' ? id.trim() : '';
    if (!normalizedId || seen.has(normalizedId)) continue;
    seen.add(normalizedId);
    result.push(normalizedId);
  }
  return result;
}

export function moveTaskInManualOrder(
  orderedTaskIds: readonly string[],
  sourceId: string,
  targetId: string,
  position: TaskDropPosition
): string[] {
  if (!sourceId || !targetId || sourceId === targetId) return [...orderedTaskIds];

  const result = orderedTaskIds.filter(id => id !== sourceId);
  const targetIndex = result.indexOf(targetId);
  if (targetIndex < 0) return [...orderedTaskIds];
  result.splice(targetIndex + (position === 'after' ? 1 : 0), 0, sourceId);
  return result;
}
