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
  return title.replace(/{: style="[^"]*"}/g, '').trim();
}

export function queryElementByNodeId(
  nodeId: string,
  nodeType: string
): Element | null {
  return document.querySelector(
    `[data-node-id="${nodeId}"][data-type="${nodeType}"]`
  );
}

export function findParentNodeInfo(
  element: Element | null
): { nodeId: string; nodeType: string } | null {
  if (!element) return null;
  
  let current = element;
  
  while (current && current !== document.body) {
    const nodeId = current.getAttribute?.('data-node-id');
    const nodeType = current.getAttribute?.('data-type');
    
    if (nodeId && nodeType) return { nodeId, nodeType };
    current = current.parentElement;
  }
  
  return null;
}

export function getEditableContent(element: Element): string {
  const editableElement = element.querySelector('[contenteditable="true"]');
  const content = editableElement?.innerHTML || '';
  return cleanTaskTitle(content);
}
