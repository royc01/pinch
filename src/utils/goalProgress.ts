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

function addGoalIndexEntry(index: Map<string, Set<number>>, key: string, goalIndex: number): void {
  if (!key) return;
  const goalIndexes = index.get(key) || new Set<number>();
  goalIndexes.add(goalIndex);
  index.set(key, goalIndexes);
}

function addCandidateGoalIndexes(
  target: Set<number>,
  source: ReadonlySet<number> | undefined
): void {
  source?.forEach(goalIndex => target.add(goalIndex));
}

export function buildGoalProgressSummaries(
  goals: Goal[],
  tasks: Task[]
): GoalProgressSummary[] {
  const countableTasksById = buildCountableTasksById(tasks);

  // Index the scopes once. The previous implementation scanned every task for
  // every goal, which becomes expensive in workspaces with many goals. Path
  // scopes still use the canonical matcher below; the index only narrows the
  // set of goals that could possibly contain a task.
  const directTaskGoalIndexes = new Map<string, Set<number>>();
  const documentGoalIndexes = new Map<string, Set<number>>();
  const pathScopeGoalIndexesByNotebook = new Map<string, Set<number>>();
  const totals = goals.map(() => ({ totalTasks: 0, completedTasks: 0 }));

  goals.forEach((goal, goalIndex) => {
    goal.members.forEach((member) => {
      const notebookId = typeof member.notebookId === 'string' ? member.notebookId.trim() : '';
      const documentId = typeof member.documentId === 'string' ? member.documentId.trim() : '';
      if (!notebookId || !documentId) return;
      addGoalIndexEntry(documentGoalIndexes, buildDocumentKey(notebookId, documentId), goalIndex);
      if (typeof member.path === 'string' && member.path.trim()) {
        addGoalIndexEntry(pathScopeGoalIndexesByNotebook, notebookId, goalIndex);
      }
    });
    (goal.taskMembers || []).forEach((member) => {
      addGoalIndexEntry(directTaskGoalIndexes, typeof member.taskId === 'string' ? member.taskId.trim() : '', goalIndex);
      addGoalIndexEntry(directTaskGoalIndexes, typeof member.blockId === 'string' ? member.blockId.trim() : '', goalIndex);
      addGoalIndexEntry(directTaskGoalIndexes, typeof member.repeatSeriesId === 'string' ? member.repeatSeriesId.trim() : '', goalIndex);
    });
  });

  countableTasksById.forEach((task) => {
    const candidateGoalIndexes = new Set<number>();
    const notebookId = typeof task.notebookId === 'string' ? task.notebookId.trim() : '';
    const rootId = typeof task.rootId === 'string' ? task.rootId.trim() : '';
    if (notebookId && rootId) {
      addCandidateGoalIndexes(candidateGoalIndexes, documentGoalIndexes.get(buildDocumentKey(notebookId, rootId)));
      addCandidateGoalIndexes(candidateGoalIndexes, pathScopeGoalIndexesByNotebook.get(notebookId));
    }
    [task.id, task.taskId, task.blockId, task.sourceBlockId, task.repeatSeriesId].forEach((id) => {
      addCandidateGoalIndexes(candidateGoalIndexes, directTaskGoalIndexes.get(typeof id === 'string' ? id.trim() : ''));
    });

    candidateGoalIndexes.forEach((goalIndex) => {
      if (!isTaskInGoalScope(goals[goalIndex], task)) return;
      totals[goalIndex].totalTasks += 1;
      if (task.status === 'completed') {
        totals[goalIndex].completedTasks += 1;
      }
    });
  });

  return goals.map((goal, goalIndex) => {
    const documentKeys = buildGoalDocumentKeys(goal);
    const taskMemberIds = buildGoalTaskMemberIds(goal);
    const { totalTasks, completedTasks } = totals[goalIndex];

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
