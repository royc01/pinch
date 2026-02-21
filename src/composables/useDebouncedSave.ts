import { ref, onUnmounted } from 'vue';
import { setBlockAttrs } from '@/api';

export function useDebouncedSave(delay: number = 500) {
  const pendingUpdates = ref<Map<string, Record<string, string>>>(new Map());
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;

  function scheduleSave(blockId: string, attrs: Record<string, string>) {
    pendingUpdates.value.set(blockId, attrs);

    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    saveTimeout = setTimeout(() => {
      flushSave();
    }, delay);
  }

  async function flushSave() {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      saveTimeout = null;
    }

    if (pendingUpdates.value.size === 0) return;

    const updates = Array.from(pendingUpdates.value.entries());
    pendingUpdates.value.clear();

    for (const [blockId, attrs] of updates) {
      try {
        await setBlockAttrs(blockId, attrs);
      } catch (error) {
        console.error('Failed to save task attributes:', error);
      }
    }
  }

  async function saveTaskAttrs(
    task: { type: string; blockId?: string },
    attrs: Record<string, string>,
    onRollback?: () => void
  ): Promise<boolean> {
    if (task.type !== 'block' || !task.blockId) return false;

    try {
      await setBlockAttrs(task.blockId, attrs);
      return true;
    } catch (error) {
      onRollback?.();
      return false;
    }
  }

  onUnmounted(() => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    flushSave();
  });

  return {
    pendingUpdates,
    scheduleSave,
    flushSave,
    saveTaskAttrs
  };
}
