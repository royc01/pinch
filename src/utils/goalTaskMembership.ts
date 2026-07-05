import type { Task } from '@/api';
import type { Goal, GoalTaskMember } from '@/goalRepository';

export interface GoalTaskSource {
  id?: string;
  taskId?: string;
  blockId?: string;
  sourceBlockId?: string;
  notebookId?: string;
  rootId?: string;
  title?: string;
  repeatSeriesId?: string;
  isVirtual?: boolean;
}

function normalizeId(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function pushNormalizedId(target: string[], value: unknown): void {
  const id = normalizeId(value);
  if (id && !target.includes(id)) {
    target.push(id);
  }
}

function resolveGoalTaskSource(task: GoalTaskSource): GoalTaskSource {
  if (!task?.isVirtual) {
    return task;
  }

  const templateTaskId = normalizeId(task.taskId);
  const templateBlockId = normalizeId(task.sourceBlockId) || normalizeId(task.blockId);

  return {
    ...task,
    id: templateTaskId || normalizeId(task.id),
    taskId: templateTaskId || undefined,
    blockId: templateBlockId || undefined,
    sourceBlockId: templateBlockId || undefined
  };
}

function getTaskSourceId(task: GoalTaskSource): string {
  task = resolveGoalTaskSource(task);
  return normalizeId(task.taskId) || normalizeId(task.id);
}

function getTaskIdentityIds(task: GoalTaskSource): string[] {
  const rawTask = task;
  task = resolveGoalTaskSource(task);
  const ids: string[] = [];
  pushNormalizedId(ids, rawTask.id);
  pushNormalizedId(ids, rawTask.taskId);
  pushNormalizedId(ids, rawTask.blockId);
  pushNormalizedId(ids, rawTask.sourceBlockId);
  pushNormalizedId(ids, task.id);
  pushNormalizedId(ids, task.taskId);
  pushNormalizedId(ids, task.blockId);
  pushNormalizedId(ids, task.sourceBlockId);
  return ids;
}

function getGoalTaskMemberIdentityIds(member: GoalTaskMember): string[] {
  const ids: string[] = [];
  pushNormalizedId(ids, member.taskId);
  pushNormalizedId(ids, member.blockId);
  return ids;
}

function isSameGoalTaskMember(member: GoalTaskMember, task: GoalTaskSource): boolean {
  const memberIdentityIds = getGoalTaskMemberIdentityIds(member);
  const taskIdentityIds = getTaskIdentityIds(task);
  if (memberIdentityIds.some(id => taskIdentityIds.includes(id))) {
    return true;
  }

  const repeatSeriesId = normalizeId(task.repeatSeriesId);
  if (repeatSeriesId && normalizeId(member.repeatSeriesId) === repeatSeriesId) {
    return true;
  }
  if (task.isVirtual) {
    const memberNotebookId = normalizeId(member.notebookId);
    const memberRootId = normalizeId(member.rootId);
    const memberTitle = normalizeId(member.title);
    const taskNotebookId = normalizeId(task.notebookId);
    const taskRootId = normalizeId(task.rootId);
    const taskTitle = normalizeId(task.title);
    if (
      memberNotebookId
      && memberRootId
      && memberTitle
      && memberNotebookId === taskNotebookId
      && memberRootId === taskRootId
      && memberTitle === taskTitle
    ) {
      return true;
    }
  }
  return false;
}

export function buildGoalTaskMember(task: GoalTaskSource, addedAt: string = new Date().toISOString()): GoalTaskMember | null {
  task = resolveGoalTaskSource(task);
  const taskId = getTaskSourceId(task);
  if (!taskId) {
    return null;
  }

  const blockId = normalizeId(task.blockId);
  const repeatSeriesId = normalizeId(task.repeatSeriesId);
  const notebookId = normalizeId(task.notebookId);
  const rootId = normalizeId(task.rootId);
  const title = normalizeId(task.title);

  return {
    taskId,
    blockId: blockId || undefined,
    repeatSeriesId: repeatSeriesId || undefined,
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

export function isTaskExcludedFromGoal(goal: Goal | undefined | null, task: GoalTaskSource): boolean {
  return !!goal && (goal.excludedTaskMembers || []).some(member => isSameGoalTaskMember(member, task));
}

export function isTaskInGoalScope(goal: Goal | undefined | null, task: Task): boolean {
  if (!goal) {
    return false;
  }

  if (isTaskDirectGoalMember(goal, task)) {
    return true;
  }

  if (isTaskExcludedFromGoal(goal, task)) {
    return false;
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

export function getEffectiveGoalIdsForTask(goals: Goal[], task: Task): string[] {
  return (goals || [])
    .filter(goal => isTaskInGoalScope(goal, task))
    .map(goal => goal.id);
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
      taskMembers: [...membersWithoutTask, taskMember],
      excludedTaskMembers: (goal.excludedTaskMembers || []).filter(member => !isSameGoalTaskMember(member, taskMember))
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
