import type { Task } from '@/api';
import type { Goal } from '@/goalRepository';
import { isTaskInGoalScope } from '@/utils/goalTaskMembership';

export type GoalProgressStatus = 'empty' | 'in-progress' | 'completed';

export interface GoalProgressSummary {
  goal: Goal;
  totalTasks: number;
  completedTasks: number;
  progressPercent: number;
  status: GoalProgressStatus;
  documentCount: number;
  taskMemberCount: number;
}

function buildDocumentKey(notebookId: string, documentId: string): string {
  return `${notebookId}:${documentId}`;
}

function isTaskCountable(task: Task): boolean {
  const notebookId = typeof task.notebookId === 'string' ? task.notebookId.trim() : '';
  const rootId = typeof task.rootId === 'string' ? task.rootId.trim() : '';
  if (!notebookId || !rootId) {
    return false;
  }
  if (task.archived) {
    return false;
  }
  if (task.status === 'cancelled') {
    return false;
  }
  if (task.isVirtual) {
    return false;
  }
  return true;
}

function buildCountableTasksById(tasks: Task[]): Map<string, Task> {
  const countableTasks = new Map<string, Task>();
  tasks.forEach((task) => {
    if (!isTaskCountable(task)) {
      return;
    }
    countableTasks.set(task.id, task);
  });
  return countableTasks;
}

function buildGoalDocumentKeys(goal: Goal): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();

  goal.members.forEach((member) => {
    const notebookId = typeof member.notebookId === 'string' ? member.notebookId.trim() : '';
    const documentId = typeof member.documentId === 'string' ? member.documentId.trim() : '';
    if (!notebookId || !documentId) {
      return;
    }

    const key = buildDocumentKey(notebookId, documentId);
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    keys.push(key);
  });

  return keys;
}

function buildGoalTaskMemberIds(goal: Goal): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();

  (goal.taskMembers || []).forEach((member) => {
    const taskId = typeof member.taskId === 'string' ? member.taskId.trim() : '';
    if (!taskId || seen.has(taskId)) {
      return;
    }
    seen.add(taskId);
    ids.push(taskId);
  });

  return ids;
}

export function buildGoalProgressSummaries(
  goals: Goal[],
  tasks: Task[]
): GoalProgressSummary[] {
  const countableTasksById = buildCountableTasksById(tasks);

  return goals.map((goal) => {
    const documentKeys = buildGoalDocumentKeys(goal);
    const taskMemberIds = buildGoalTaskMemberIds(goal);
    const matchedTaskIds = new Set<string>();
    let totalTasks = 0;
    let completedTasks = 0;

    countableTasksById.forEach((task) => {
      if (isTaskInGoalScope(goal, task)) {
        matchedTaskIds.add(task.id);
      }
    });

    matchedTaskIds.forEach((taskId) => {
      const task = countableTasksById.get(taskId);
      if (!task) {
        return;
      }
      totalTasks += 1;
      if (task.status === 'completed') {
        completedTasks += 1;
      }
    });

    const progressPercent = totalTasks > 0
      ? Math.max(0, Math.min(100, Math.round((completedTasks / totalTasks) * 100)))
      : 0;
    const status: GoalProgressStatus = totalTasks === 0
      ? 'empty'
      : (completedTasks >= totalTasks ? 'completed' : 'in-progress');

    return {
      goal,
      totalTasks,
      completedTasks,
      progressPercent,
      status,
      documentCount: documentKeys.length,
      taskMemberCount: taskMemberIds.length
    };
  });
}
