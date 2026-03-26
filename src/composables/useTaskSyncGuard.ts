import { type Ref } from 'vue';
import type { Task } from '@/api';
import { repeatDragDebug } from '@/utils/repeatDragDebug';

interface TaskSyncGuardOptions {
  lockMs?: number;
}

export function useTaskSyncGuard(localTasks: Ref<Task[]>, options: TaskSyncGuardOptions = {}) {
  const lockMs = options.lockMs ?? 1500;
  const taskSyncLocks = new Map<string, string>();
  const taskSyncLockTimers = new Map<string, ReturnType<typeof setTimeout>>();
  let tasksSyncRequestId = 0;
  let tasksSyncAppliedId = 0;
  let lastTasksHash = '';

  function getTaskSyncFingerprint(task: Task): string {
    return [
      task.startDate || '',
      task.dueDate || '',
      task.startTime || '',
      task.dueTime || '',
      task.reminderType || '',
      task.reminderCustomTime || '',
      task.backgroundColor || '',
      task.status || '',
      task.priority || '',
      task.title || ''
    ].join('|');
  }

  function summarizeTask(task: Task | null | undefined) {
    if (!task) return null;
    return {
      id: task.id,
      blockId: task.blockId,
      repeatSeriesId: task.repeatSeriesId,
      repeatFrequency: task.repeatFrequency,
      repeatInstanceDate: task.repeatInstanceDate,
      isVirtual: task.isVirtual,
      startDate: task.startDate,
      dueDate: task.dueDate,
      startTime: task.startTime,
      dueTime: task.dueTime
    };
  }

  function isRepeatTask(task: Task | null | undefined): boolean {
    return !!task && (!!task.repeatSeriesId || (!!task.repeatFrequency && task.repeatFrequency !== 'none'));
  }

  function getRepeatSyncSlotKey(task: Task | null | undefined): string | null {
    if (!isRepeatTask(task) || !task?.repeatSeriesId) return null;

    const startDate = task.startDate || task.repeatInstanceDate || task.dueDate || '';
    const dueDate = task.dueDate || task.startDate || startDate;
    if (!startDate || !dueDate) return null;

    return [
      task.repeatSeriesId,
      startDate,
      dueDate,
      task.startTime || '',
      task.dueTime || ''
    ].join('|');
  }

  function clearTaskSyncLock(taskId: string): void {
    const timer = taskSyncLockTimers.get(taskId);
    if (timer) {
      clearTimeout(timer);
      taskSyncLockTimers.delete(taskId);
    }
    taskSyncLocks.delete(taskId);
  }

  function clearAllTaskSyncLocks(): void {
    for (const taskId of Array.from(taskSyncLockTimers.keys())) {
      clearTaskSyncLock(taskId);
    }
  }

  function lockTaskSync(task: Task): void {
    clearTaskSyncLock(task.id);
    taskSyncLocks.set(task.id, getTaskSyncFingerprint(task));
    if (isRepeatTask(task)) {
      repeatDragDebug('useTaskSyncGuard', 'lockTaskSync', summarizeTask(task));
    }
    taskSyncLockTimers.set(task.id, setTimeout(() => {
      clearTaskSyncLock(task.id);
    }, lockMs));
  }

  function emitTaskDateChanged(task: Task, emitTaskChanged: (nextTask: Task) => void): void {
    lockTaskSync(task);
    emitTaskChanged(task);
  }

  function mergeIncomingTasks(newTasks: Task[]): Task[] {
    const merged: Task[] = [];
    const localTaskMap = new Map(localTasks.value.map(task => [task.id, task]));
    const incomingTaskIds = new Set<string>();
    const incomingRepeatSlotKeys = new Set<string>();

    for (const incomingTask of newTasks) {
      const slotKey = getRepeatSyncSlotKey(incomingTask);
      if (slotKey) {
        incomingRepeatSlotKeys.add(slotKey);
      }
    }

    for (const incomingTask of newTasks) {
      incomingTaskIds.add(incomingTask.id);
      const expectedFingerprint = taskSyncLocks.get(incomingTask.id);
      if (!expectedFingerprint) {
        merged.push({ ...incomingTask });
        continue;
      }

      const incomingFingerprint = getTaskSyncFingerprint(incomingTask);
      if (incomingFingerprint === expectedFingerprint) {
        clearTaskSyncLock(incomingTask.id);
        merged.push({ ...incomingTask });
        continue;
      }

      const localTask = localTaskMap.get(incomingTask.id);
      if (isRepeatTask(incomingTask) || isRepeatTask(localTask)) {
        repeatDragDebug('useTaskSyncGuard', 'mergeIncomingTasks kept local task over incoming', {
          expectedFingerprint,
          incomingFingerprint,
          incomingTask: summarizeTask(incomingTask),
          localTask: summarizeTask(localTask)
        });
      }
      merged.push(localTask ? { ...localTask } : { ...incomingTask });
    }

    for (const localTask of localTasks.value) {
      if (!incomingTaskIds.has(localTask.id) && taskSyncLocks.has(localTask.id)) {
        const localSlotKey = getRepeatSyncSlotKey(localTask);
        if (localTask.isVirtual && localSlotKey && incomingRepeatSlotKeys.has(localSlotKey)) {
          repeatDragDebug('useTaskSyncGuard', 'mergeIncomingTasks dropped stale local repeat task replaced by incoming slot', {
            localTask: summarizeTask(localTask),
            slotKey: localSlotKey
          });
          clearTaskSyncLock(localTask.id);
          continue;
        }
        merged.push({ ...localTask });
      }
    }

    return merged;
  }

  function syncTasks(
    incomingTasks: Task[],
    isDragging: boolean,
    getTasksHash: (tasks: Task[]) => string
  ): void {
    if (isDragging) {
      const repeatCount = incomingTasks.filter(task => isRepeatTask(task)).length;
      if (repeatCount > 0) {
        repeatDragDebug('useTaskSyncGuard', 'syncTasks skipped while dragging', {
          repeatCount,
          total: incomingTasks.length
        });
      }
      return;
    }

    const requestId = ++tasksSyncRequestId;
    const taskSnapshot = [...incomingTasks];

    queueMicrotask(() => {
      if (requestId < tasksSyncRequestId || requestId <= tasksSyncAppliedId) {
        return;
      }

      const newHash = getTasksHash(taskSnapshot);
      if (newHash === lastTasksHash) {
        tasksSyncAppliedId = requestId;
        return;
      }

      lastTasksHash = newHash;
      const repeatTasks = taskSnapshot.filter(task => isRepeatTask(task));
      if (repeatTasks.length > 0) {
        repeatDragDebug('useTaskSyncGuard', 'syncTasks applying incoming snapshot', {
          requestId,
          repeatTasks: repeatTasks.map(task => summarizeTask(task))
        });
      }
      localTasks.value = mergeIncomingTasks(taskSnapshot);
      tasksSyncAppliedId = requestId;
    });
  }

  return {
    emitTaskDateChanged,
    syncTasks,
    clearAllTaskSyncLocks
  };
}
