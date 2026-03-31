import { updateBlock, setBlockAttrs, getBlockKramdown } from '../api';

export function skipTaskTemporarily(
  skipSet: Set<string>,
  taskId: string,
  delay: number = 800
): void {
  skipSet.add(taskId);
  setTimeout(() => skipSet.delete(taskId), delay);
}

export async function getBlockMarkdown(blockId: string): Promise<string> {
  const blockData = await getBlockKramdown(blockId);
  
  if (typeof blockData === 'string') return blockData;
  return blockData?.kramdown || '';
}

export async function updateTaskMarkdown(
  blockId: string,
  completed: boolean,
  updateCustomStatus: boolean = false
): Promise<void> {
  try {
    const markdown = await getBlockMarkdown(blockId);
    const taskRegex = /\[(x|X| )\]/;
    const updated = markdown.replace(taskRegex, completed ? '[x]' : '[ ]');
    
    await updateBlock('markdown', updated, blockId);
    
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
    console.error('[TaskHelpers] updateTaskMarkdown 失败:', { blockId, completed, error });
    throw error;
  }
}

export function cleanTaskTitle(title: string): string {
  return title.replace(/\{:\s*[^}]*\}/g, '').trim();
}
