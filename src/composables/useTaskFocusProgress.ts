import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue';
import { getFocusTimerData, type FocusSessionRecord, type Task } from '@/api';

const focusSessionRecords = ref<FocusSessionRecord[]>([]);
let activeConsumers = 0;
let refreshPromise: Promise<void> | null = null;

async function refreshFocusSessionRecords(): Promise<void> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = getFocusTimerData()
    .then((data) => {
      focusSessionRecords.value = data.sessionRecords;
    })
    .catch(() => {
      focusSessionRecords.value = [];
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

function handleFocusSessionUpdate(): void {
  void refreshFocusSessionRecords();
}

export function useTaskFocusProgress(task: Ref<Task>) {
  const actualFocus = computed(() => {
    const taskId = task.value.id.trim();
    const linkedTaskId = task.value.taskId?.trim() || '';
    const blockId = task.value.blockId?.trim() || '';
    const sourceBlockId = task.value.sourceBlockId?.trim() || '';
    const repeatSeriesId = task.value.isVirtual ? task.value.repeatSeriesId?.trim() || '' : '';
    const taskIds = new Set([taskId, linkedTaskId].filter(Boolean));
    const blockIds = new Set([blockId, sourceBlockId].filter(Boolean));
    const virtualInstancePrefix = repeatSeriesId
      ? `repeat_${repeatSeriesId}_`.replace(/[^a-zA-Z0-9_-]/g, '_')
      : '';
    const records = focusSessionRecords.value.filter(record => (
      record.targetType === 'task'
      && (
        (!!record.targetId && (
          taskIds.has(record.targetId)
          || (!!virtualInstancePrefix && record.targetId.startsWith(virtualInstancePrefix))
        ))
        || (!!record.targetBlockId && blockIds.has(record.targetBlockId))
      )
    ));

    return {
      minutes: records.reduce((total, record) => total + Math.max(0, record.minutes || 0), 0),
      sessions: records.length
    };
  });

  onMounted(() => {
    activeConsumers++;
    if (activeConsumers === 1) {
      window.addEventListener('pinch-focus-session', handleFocusSessionUpdate);
      void refreshFocusSessionRecords();
    }
  });

  onUnmounted(() => {
    activeConsumers = Math.max(0, activeConsumers - 1);
    if (activeConsumers === 0) {
      window.removeEventListener('pinch-focus-session', handleFocusSessionUpdate);
    }
  });

  return { actualFocus };
}
