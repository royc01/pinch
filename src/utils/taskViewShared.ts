import type { Task } from '@/api';

export interface RepeatRulePayload {
  blockId?: string;
  seriesId?: string;
  frequency?: string;
}

export function normalizeNotebookIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  return Array.from(
    new Set(
      ids
        .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
        .map(id => id.trim())
    )
  );
}

export function getDocumentCreationSortKey(documentId: string): number {
  if (typeof documentId !== 'string' || documentId.length === 0) return 0;
  const match = documentId.match(/^(\d{14})/);
  return match ? Number(match[1]) : 0;
}

export function applyRepeatRuleOptimisticToTasks(
  taskList: Task[],
  payload: RepeatRulePayload
): { nextTasks: Task[]; touched: boolean } {
  const { blockId, seriesId, frequency } = payload;
  if (!frequency) {
    return { nextTasks: taskList, touched: false };
  }

  let touched = false;
  let nextTasks = taskList;

  if (blockId) {
    const templateTask = taskList.find(
      task => task.type === 'block' && !task.isVirtual && task.blockId === blockId
    );
    if (templateTask) {
      templateTask.repeatFrequency = frequency as any;
      if (frequency === 'none') {
        templateTask.repeatSeriesId = undefined;
        templateTask.repeatInstanceDate = undefined;
        templateTask.isVirtual = false;
      } else if (seriesId) {
        templateTask.repeatSeriesId = seriesId;
        templateTask.repeatInstanceDate = undefined;
        templateTask.isVirtual = false;
      }
      touched = true;
    }
  }

  if (frequency === 'none' && seriesId) {
    const filtered = taskList.filter(
      task => !(task.isVirtual && task.repeatSeriesId === seriesId)
    );
    if (filtered.length !== taskList.length) {
      nextTasks = filtered;
      touched = true;
    }
  }

  return { nextTasks, touched };
}
