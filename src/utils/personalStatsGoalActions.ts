import type { Task } from '@/api';
import type { GoalListItem } from '@/composables/useGoals';
import { isTaskInGoalScope } from '@/utils/goalTaskMembership';
import { isClosedTaskStatus } from '@/utils/taskStatus';
import { addSummaryDays, formatSummaryDateKey } from '@/utils/personalStatsSummary';

export type GoalActionReason = 'overdue' | 'in-progress' | 'upcoming' | 'pending';
export interface GoalNextAction {
  goal: GoalListItem;
  task: Task | null;
  reason: GoalActionReason | null;
}

function reasonForTask(task: Task, todayKey: string, upcomingEnd: string): GoalActionReason {
  if (task.dueDate && task.dueDate < todayKey) return 'overdue';
  if (task.status === 'in-progress') return 'in-progress';
  if (task.dueDate && task.dueDate <= upcomingEnd) return 'upcoming';
  return 'pending';
}
const reasonOrder: Record<GoalActionReason, number> = { overdue: 0, 'in-progress': 1, upcoming: 2, pending: 3 };
const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2, none: 3 };

export function buildGoalNextActions(goals: GoalListItem[], tasks: Task[], todayKey: string): GoalNextAction[] {
  const [year, month, day] = todayKey.split('-').map(Number);
  const upcomingEnd = formatSummaryDateKey(addSummaryDays(new Date(year, month - 1, day), 7));
  const candidates = [...new Map(tasks.map(task => [task.id, task])).values()].filter(task => task.type === 'block' && !!task.blockId
    && !!task.notebookId && !!task.rootId && !task.isVirtual && !task.archived
    && !isClosedTaskStatus(task.status));
  function compareTasks(left: Task, right: Task): number {
    const leftReason = reasonForTask(left, todayKey, upcomingEnd);
    const rightReason = reasonForTask(right, todayKey, upcomingEnd);
    const rank = reasonOrder[leftReason] - reasonOrder[rightReason];
    if (rank) return rank;
    const due = (left.dueDate || '9999-12-31').localeCompare(right.dueDate || '9999-12-31')
      || (left.dueTime || '23:59').localeCompare(right.dueTime || '23:59');
    const priority = (priorityOrder[left.priority] ?? 3) - (priorityOrder[right.priority] ?? 3);
    return ((leftReason === 'overdue' || leftReason === 'upcoming') ? due || priority : priority || due)
      || left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id);
  }
  // Use the same explicit/inherited membership matcher as goal progress.
  // The input is the global task snapshot, independent of workbench filters.
  const sortedCandidates = candidates.sort(compareTasks);
  return goals.filter(goal => goal.status !== 'completed').map(goal => {
    const task = sortedCandidates.find(task => isTaskInGoalScope(goal, task)) || null;
    return { goal, task, reason: task ? reasonForTask(task, todayKey, upcomingEnd) : null };
  }).sort((left, right) => {
    if (left.task && right.task) {
      const rank = compareTasks(left.task, right.task);
      if (rank) return rank;
    } else if (!!left.task !== !!right.task) {
      return left.task ? -1 : 1;
    }
    return (left.goal.dueDate || '9999-12-31').localeCompare(right.goal.dueDate || '9999-12-31')
      || (left.goal.order ?? 0) - (right.goal.order ?? 0) || left.goal.id.localeCompare(right.goal.id);
  });
}

export interface GoalWeeklyProgressEntry {
  goal: GoalListItem;
  tasks: Task[];
  latestTimestamp: number;
}
export interface GoalWeeklyProgress {
  startKey: string;
  endKey: string;
  taskCount: number;
  entries: GoalWeeklyProgressEntry[];
}

export function buildGoalWeeklyProgress(goals: GoalListItem[], tasks: Task[], todayKey: string, now = new Date()): GoalWeeklyProgress {
  const [year, month, day] = todayKey.split('-').map(Number);
  const today = new Date(year, month - 1, day);
  const start = addSummaryDays(today, today.getDay() === 0 ? -6 : 1 - today.getDay());
  const endExclusive = addSummaryDays(today, 1);
  const cutoff = Math.min(now.getTime(), endExclusive.getTime() - 1);
  const candidates = [...new Map(tasks.map(task => [task.id, task])).values()]
    .filter(task => task.type === 'block' && !task.isVirtual && task.status === 'completed'
      && !!task.notebookId && !!task.rootId && !!task.completedAt)
    .map(task => {
      const key = task.completedAt!;
      const plain = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
      const date = plain ? new Date(Number(plain[1]), Number(plain[2]) - 1, Number(plain[3])) : new Date(key);
      const timestamp = plain && formatSummaryDateKey(date) !== key ? NaN : date.getTime();
      return { task, timestamp };
    })
    .filter(entry => Number.isFinite(entry.timestamp) && entry.timestamp >= start.getTime() && entry.timestamp <= cutoff)
    .sort((left, right) => right.timestamp - left.timestamp || left.task.id.localeCompare(right.task.id));
  const countedTaskIds = new Set<string>();
  const entries = goals.map(goal => {
    // Historical completions are grouped by current membership, including
    // archived tasks. Never infer completion time from createdAt/updatedAt.
    const matching = candidates.filter(entry => isTaskInGoalScope(goal, entry.task));
    matching.forEach(entry => countedTaskIds.add(entry.task.id));
    return { goal, tasks: matching.map(entry => entry.task), latestTimestamp: matching[0]?.timestamp ?? 0 };
  }).filter(entry => entry.tasks.length > 0)
    .sort((left, right) => right.latestTimestamp - left.latestTimestamp || left.goal.id.localeCompare(right.goal.id));
  return { startKey: formatSummaryDateKey(start), endKey: todayKey, taskCount: countedTaskIds.size, entries };
}
