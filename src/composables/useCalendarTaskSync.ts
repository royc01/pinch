import { onScopeDispose, watch, type Ref, type WatchStopHandle } from 'vue';
import type { Task } from '@/api';
import type { useTaskSyncGuard } from './useTaskSyncGuard';

/** Observe each task separately so editing one task does not hash every title. */
export function useCalendarTaskSync(
  source: () => Task[],
  dragging: Ref<boolean>,
  guard: ReturnType<typeof useTaskSyncGuard>
): void {
  const subscriptions = new Map<Task, WatchStopHandle>();
  const changed = new Set<Task>();
  let collectionChanged = false;
  let queued = false;
  let disposed = false;
  let revision = 0;
  let previousTasks: Task[] | null = null;

  function flush(): void {
    queued = false;
    if (disposed || dragging.value) return;
    if (collectionChanged) {
      collectionChanged = false;
      const version = String(++revision);
      guard.syncTasks(source(), false, () => version);
    } else if (changed.size) {
      guard.syncTaskChanges([...changed]);
    }
    changed.clear();
  }
  function schedule(): void {
    if (queued) return;
    queued = true;
    queueMicrotask(flush);
  }
  watch(() => source().slice(), tasks => {
    const membershipChanged = !previousTasks || tasks.length !== previousTasks.length
      || tasks.some((task, index) => task !== previousTasks![index]);
    previousTasks = tasks;
    const retained = new Set(tasks);
    for (const [task, stop] of subscriptions) {
      if (!retained.has(task)) { stop(); subscriptions.delete(task); changed.delete(task); }
    }
    for (const task of tasks) {
      if (subscriptions.has(task)) continue;
      subscriptions.set(task, watch(() => [
        task.title, task.status, task.priority, task.startDate, task.dueDate,
        task.startTime, task.dueTime, task.repeatSeriesId, task.repeatFrequency,
        task.repeatInstanceDate, task.isVirtual, task.isRepeatWindow, task.backgroundColor,
        task.groupId, task.description, task.updatedAt, task.completedAt, task.tags,
        task.reminderType, task.reminderCustomTime, task.pinned
      ], () => { changed.add(task); schedule(); }));
    }
    if (membershipChanged) {
      collectionChanged = true;
      schedule();
    }
  }, { immediate: true });
  watch(dragging, active => { if (!active) schedule(); });
  onScopeDispose(() => {
    disposed = true;
    for (const stop of subscriptions.values()) stop();
    subscriptions.clear();
    changed.clear();
  });
}
