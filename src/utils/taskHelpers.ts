import { setBlockAttrs, updateTaskListItemMarker } from '../api';

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
      await setBlockAttrs(blockId, {
        'custom-task-status': status
      });
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

export function cleanTaskTitle(title: string): string {
  return title.replace(/\{:\s*[^}]*\}/g, '').trim();
}
