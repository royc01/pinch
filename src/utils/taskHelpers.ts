import { buildTaskStatusAttrs, getBlockAttrs, setBlockAttrs, type TaskStatus, updateTaskListItemMarker } from '../api';

export function skipTaskTemporarily(
  skipSet: Set<string>,
  taskId: string,
  delay: number = 800
): void {
  skipSet.add(taskId);
  setTimeout(() => skipSet.delete(taskId), delay);
}

export async function updateTaskMarkdown(
  blockId: string,
  completed: boolean,
  updateCustomStatus: boolean = false
): Promise<void> {
  try {
    const marker = completed ? 'x' : ' ';
    await updateTaskListItemMarker(blockId, marker);

    if (updateCustomStatus) {
      const status = completed ? 'completed' : 'pending';
      await setBlockAttrs(blockId, buildTaskStatusAttrs(status));
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('siyuan-block-update', {
        detail: { id: blockId, completed }
      }));
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
