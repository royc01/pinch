import { buildTaskStatusAttrs, getBlockAttrs, setBlockAttrs, type TaskStatus, updateTaskListItemMarker } from '../api';
import { getLocalCheckinNoteDate, requestCheckinNote, type CheckinNotePromptAnchor } from './checkinNotePrompt';

export function skipTaskTemporarily(
  skipSet: Set<string>,
  taskId: string,
  delay: number = 800
): void {
  skipSet.add(taskId);
  setTimeout(() => skipSet.delete(taskId), delay);
}

export function requestTaskCompletionNote(
  taskId: string,
  completedAt: string,
  promptAnchor?: CheckinNotePromptAnchor,
  taskTitle = '',
  sourceBlockId = taskId
): void {
  if (!taskId || !completedAt) return;
  const completedDate = new Date(completedAt);
  requestCheckinNote({
    date: getLocalCheckinNoteDate(Number.isNaN(completedDate.getTime()) ? new Date() : completedDate),
    eventKey: `task:${taskId}:${completedAt}`,
    anchor: promptAnchor,
    context: taskTitle.trim() ? {
      type: 'task',
      sourceId: sourceBlockId,
      occurredAt: completedAt,
      title: taskTitle.trim(),
      meta: 'completed'
    } : undefined
  });
}

export async function updateTaskMarkdown(
  blockId: string,
  completed: boolean,
  updateCustomStatus: boolean = false,
  promptAnchor?: CheckinNotePromptAnchor
): Promise<void> {
  try {
    const marker = completed ? 'x' : ' ';
    const completedAt = completed && updateCustomStatus ? new Date().toISOString() : '';
    await updateTaskListItemMarker(blockId, marker);

    if (updateCustomStatus) {
      const status = completed ? 'completed' : 'pending';
      await setBlockAttrs(blockId, buildTaskStatusAttrs(status, completedAt));
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('siyuan-block-update', {
        detail: { id: blockId, completed }
      }));
      if (completed && updateCustomStatus) {
        requestTaskCompletionNote(blockId, completedAt, promptAnchor);
      }
    }
  } catch (error) {
    console.error('[TaskHelpers] updateTaskMarkdown failed:', { blockId, completed, error });
    throw error;
  }
}

export async function syncTaskStatusAttrsIfNeeded(
  blockId: string,
  status: TaskStatus,
  completedAt?: string
): Promise<boolean> {
  const desiredAttrs = buildTaskStatusAttrs(status, completedAt);
  const currentAttrs = await getBlockAttrs(blockId);
  const currentStatus = typeof currentAttrs?.['custom-task-status'] === 'string'
    ? currentAttrs['custom-task-status'].trim()
    : '';
  const currentCompletedAt = typeof currentAttrs?.['custom-task-completed-at'] === 'string'
    ? currentAttrs['custom-task-completed-at'].trim()
    : '';
  const nextStatus = desiredAttrs['custom-task-status'] || '';
  const nextCompletedAt = desiredAttrs['custom-task-completed-at'] || '';

  if (currentStatus === nextStatus && currentCompletedAt === nextCompletedAt) {
    return false;
  }

  await setBlockAttrs(blockId, desiredAttrs);
  return true;
}

export function cleanTaskTitle(title: string): string {
  return title.replace(/\{:\s*[^}]*\}/g, '').trim();
}
