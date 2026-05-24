import type { InferredTaskDateRange } from '@/utils/taskDateParser';

export interface TaskQuickDateDraft {
  startDate: string;
  startTime: string;
  dueDate: string;
  dueTime: string;
}

export interface TaskQuickDateDraftSource {
  startDate?: unknown;
  startTime?: unknown;
  dueDate?: unknown;
  dueTime?: unknown;
}

export function normalizeQuickDateInputValue(value: unknown): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) {
    return '';
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}

export function normalizeQuickTimeInputValue(value: unknown): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) {
    return '';
  }
  return /^\d{2}:\d{2}$/.test(text) ? text : '';
}

export function buildTaskQuickDateDraft(
  source: TaskQuickDateDraftSource,
  inferredRange?: InferredTaskDateRange | null,
): TaskQuickDateDraft {
  let startDate = normalizeQuickDateInputValue(source.startDate);
  let dueDate = normalizeQuickDateInputValue(source.dueDate);
  let startTime = normalizeQuickTimeInputValue(source.startTime);
  let dueTime = normalizeQuickTimeInputValue(source.dueTime);

  const inferredStartDate = normalizeQuickDateInputValue(inferredRange?.startDate);
  const inferredDueDate = normalizeQuickDateInputValue(inferredRange?.dueDate);
  const inferredStartTime = normalizeQuickTimeInputValue(inferredRange?.startTime);
  const inferredDueTime = normalizeQuickTimeInputValue(inferredRange?.dueTime);

  if (inferredStartDate || inferredDueDate || inferredStartTime || inferredDueTime) {
    startDate = inferredStartDate || startDate;
    dueDate = inferredDueDate || dueDate;
    startTime = inferredStartTime || startTime;
    dueTime = inferredDueTime || dueTime;
  }

  if (startDate && dueDate && dueDate < startDate) {
    dueDate = startDate;
  }

  return {
    startDate,
    startTime: startDate ? startTime : '',
    dueDate,
    dueTime: dueDate ? dueTime : ''
  };
}
