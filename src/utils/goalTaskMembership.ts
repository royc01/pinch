import type { Task } from '@/api';
import type { Goal, GoalTaskMember } from '@/goalRepository';

export interface GoalTaskSource {
  id?: string;
  taskId?: string;
  blockId?: string;
  notebookId?: string;
  rootId?: string;
  title?: string;
}

function normalizeId(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function getTaskSourceId(task: GoalTaskSource): string {
  return normalizeId(task.taskId) || normalizeId(task.id);
}

function isSameGoalTaskMember(member: GoalTaskMember, task: GoalTaskSource): boolean {
  const taskId = getTaskSourceId(task);
  if (taskId && normalizeId(member.taskId) === taskId) {
    return true;
  }

  const blockId = normalizeId(task.blockId);
  return !!blockId && normalizeId(member.blockId) === blockId;
}

export function buildGoalTaskMember(task: GoalTaskSource, addedAt: string = new Date().toISOString()): GoalTaskMember | null {
  const taskId = getTaskSourceId(task);
  if (!taskId) {
    return null;
  }

  const blockId = normalizeId(task.blockId);
  const notebookId = normalizeId(task.notebookId);
  const rootId = normalizeId(task.rootId);
  const title = normalizeId(task.title);

  return {
    taskId,
    blockId: blockId || undefined,
    notebookId: notebookId || undefined,
    rootId: rootId || undefined,
    title: title || undefined,
    addedAt
  };
}

export function getGoalIdsForTask(goals: Goal[], task: GoalTaskSource): string[] {
  return (goals || [])
    .filter(goal => (goal.taskMembers || []).some(member => isSameGoalTaskMember(member, task)))
    .map(goal => goal.id);
}

export function isTaskDirectGoalMember(goal: Goal | undefined | null, task: GoalTaskSource): boolean {
  return !!goal && (goal.taskMembers || []).some(member => isSameGoalTaskMember(member, task));
}

export function isTaskInGoalScope(goal: Goal | undefined | null, task: Task): boolean {
  if (!goal) {
    return false;
  }

  if (isTaskDirectGoalMember(goal, task)) {
    return true;
  }

  const notebookId = normalizeId(task.notebookId);
  const rootId = normalizeId(task.rootId);
  if (!notebookId || !rootId) {
    return false;
  }

  return goal.members.some(member =>
    normalizeId(member.documentId) === rootId && normalizeId(member.notebookId) === notebookId
  );
}

export function setTaskGoalMembership(goals: Goal[], task: GoalTaskSource, goalIds: readonly string[]): Goal[] {
  const taskMember = buildGoalTaskMember(task);
  if (!taskMember) {
    return goals || [];
  }

  const targetGoalIds = new Set((goalIds || []).map(goalId => normalizeId(goalId)).filter(Boolean));

  return (goals || []).map((goal) => {
    const membersWithoutTask = (goal.taskMembers || []).filter(member => !isSameGoalTaskMember(member, taskMember));
    if (!targetGoalIds.has(goal.id)) {
      return {
        ...goal,
        taskMembers: membersWithoutTask
      };
    }

    return {
      ...goal,
      taskMembers: [...membersWithoutTask, taskMember]
    };
  });
}

export function toggleTaskGoalMembership(goals: Goal[], task: GoalTaskSource, goalId: string): Goal[] {
  const normalizedGoalId = normalizeId(goalId);
  if (!normalizedGoalId) {
    return goals || [];
  }

  const currentGoalIds = new Set(getGoalIdsForTask(goals, task));
  if (currentGoalIds.has(normalizedGoalId)) {
    currentGoalIds.delete(normalizedGoalId);
  } else {
    currentGoalIds.add(normalizedGoalId);
  }

  return setTaskGoalMembership(goals, task, Array.from(currentGoalIds));
}
