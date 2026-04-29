import type { Task } from '@/api';
import type { Goal } from '@/goalRepository';

export type GoalProgressStatus = 'empty' | 'in-progress' | 'completed';

export interface GoalProgressSummary {
  goal: Goal;
  totalTasks: number;
  completedTasks: number;
  progressPercent: number;
  status: GoalProgressStatus;
  documentCount: number;
}

interface GoalTaskCount {
  total: number;
  completed: number;
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
  return true;
}

function buildTaskCountByDocument(tasks: Task[]): Map<string, GoalTaskCount> {
  const countByDocument = new Map<string, GoalTaskCount>();

  tasks.forEach((task) => {
    if (!isTaskCountable(task)) {
      return;
    }

    const notebookId = task.notebookId!.trim();
    const rootId = task.rootId!.trim();
    const key = buildDocumentKey(notebookId, rootId);
    const current = countByDocument.get(key) || { total: 0, completed: 0 };

    current.total += 1;
    if (task.status === 'completed') {
      current.completed += 1;
    }

    countByDocument.set(key, current);
  });

  return countByDocument;
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

export function buildGoalProgressSummaries(
  goals: Goal[],
  tasks: Task[]
): GoalProgressSummary[] {
  const taskCountByDocument = buildTaskCountByDocument(tasks);

  return goals.map((goal) => {
    const documentKeys = buildGoalDocumentKeys(goal);
    let totalTasks = 0;
    let completedTasks = 0;

    documentKeys.forEach((key) => {
      const counts = taskCountByDocument.get(key);
      if (!counts) {
        return;
      }

      totalTasks += counts.total;
      completedTasks += counts.completed;
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
      documentCount: documentKeys.length
    };
  });
}
