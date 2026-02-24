import { type Ref } from 'vue';
import type { Task } from '@/api';

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
      task.backgroundColor || '',
      task.status || '',
      task.priority || '',
      task.title || ''
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
      merged.push(localTask ? { ...localTask } : { ...incomingTask });
    }

    for (const localTask of localTasks.value) {
      if (!incomingTaskIds.has(localTask.id) && taskSyncLocks.has(localTask.id)) {
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
    if (isDragging) return;

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
