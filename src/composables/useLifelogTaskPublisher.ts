import { onScopeDispose, watch, type WatchStopHandle } from 'vue';
import type { Task } from '@/api';
import { publishLifelogTaskChanges, publishLifelogTaskSnapshot } from '@/utils/lifelogTaskSnapshot';

/** One calendar owner publishes changes, without serializing the whole task list. */
export function useLifelogTaskPublisher(source: () => Task[], active: () => boolean): void {
  const subscriptions = new Map<Task, WatchStopHandle>();
  const changed = new Set<Task>();
  let collectionChanged = false;
  let queued = false;
  let disposed = false;
  let previousTasks: Task[] = [];
  let wasActive = false;
  function schedule(): void {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      if (disposed || !active()) return;
      if (collectionChanged) publishLifelogTaskSnapshot(source());
      else if (changed.size) publishLifelogTaskChanges([...changed]);
      collectionChanged = false;
      changed.clear();
    });
  }
  watch(() => active() ? source().slice() : [], tasks => {
    const enabled = active();
    const membershipChanged = enabled && (!wasActive || tasks.length !== previousTasks.length || tasks.some((task, index) => task !== previousTasks[index]));
    wasActive = enabled;
    previousTasks = tasks;
    const retained = new Set(tasks);
    for (const [task, stop] of subscriptions) {
      if (!retained.has(task)) { stop(); subscriptions.delete(task); changed.delete(task); }
    }
    for (const task of tasks) {
      if (subscriptions.has(task)) continue;
      subscriptions.set(task, watch(() => [
        task.id, task.blockId, task.title, task.description, task.status, task.priority,
        ...(task.tags || []), task.completedAt, task.updatedAt, task.startDate, task.dueDate,
        task.groupId, task.notebookId, task.rootId, task.archived, task.isVirtual,
        task.repeatSeriesId, task.repeatFrequency, task.repeatInstanceDate
      ], (values, previous) => {
        if (values[0] !== previous[0]) collectionChanged = true;
        changed.add(task);
        schedule();
      }));
    }
    if (membershipChanged) {
      collectionChanged = true;
      schedule();
    }
  }, { immediate: true });
  onScopeDispose(() => {
    disposed = true;
    for (const stop of subscriptions.values()) stop();
    subscriptions.clear();
    changed.clear();
  });
}
