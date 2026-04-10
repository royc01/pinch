import type { Ref } from 'vue';
import type { Task } from '@/api';

interface TaskMutationOptions {
  emit?: boolean;
}

interface UseTaskLocalMutationsOptions {
  onTaskUpdated?: (task: Task) => void;
  onCollectionMutated?: () => void;
}

function shouldEmit(options?: TaskMutationOptions): boolean {
  return options?.emit !== false;
}

function hasTaskPatchChanges(task: Task, patch: Partial<Task>): boolean {
  const patchKeys = Object.keys(patch) as Array<keyof Task>;
  for (const key of patchKeys) {
    if (!Object.is(task[key], patch[key])) {
      return true;
    }
  }
  return false;
}

export function useTaskLocalMutations(
  localTasks: Ref<Task[]>,
  options: UseTaskLocalMutationsOptions = {}
) {
  function notifyCollectionMutated(): void {
    options.onCollectionMutated?.();
  }

  function notifyTaskUpdated(task: Task, mutationOptions?: TaskMutationOptions): void {
    if (!shouldEmit(mutationOptions)) return;
    options.onTaskUpdated?.(task);
  }

  function patchTask(taskId: string, patch: Partial<Task>, mutationOptions?: TaskMutationOptions): Task | null {
    const index = localTasks.value.findIndex(task => task.id === taskId);
    if (index === -1) return null;
    const currentTask = localTasks.value[index];
    if (!hasTaskPatchChanges(currentTask, patch)) {
      return null;
    }

    const updatedTask = {
      ...currentTask,
      ...patch
    };
    localTasks.value[index] = updatedTask;

    notifyCollectionMutated();
    notifyTaskUpdated(updatedTask, mutationOptions);
    return updatedTask;
  }

  function patchTasksBatch(
    updates: Array<{ id: string; patch: Partial<Task> }>,
    mutationOptions?: TaskMutationOptions
  ): Task[] {
    if (!Array.isArray(updates) || updates.length === 0) return [];

    const mergedPatchById = new Map<string, Partial<Task>>();
    for (const update of updates) {
      if (!update?.id) continue;
      const prev = mergedPatchById.get(update.id) || {};
      mergedPatchById.set(update.id, { ...prev, ...update.patch });
    }
    if (mergedPatchById.size === 0) return [];

    const indexById = new Map<string, number>();
    for (let i = 0; i < localTasks.value.length; i++) {
      indexById.set(localTasks.value[i].id, i);
    }

    const changedTasks: Task[] = [];
    mergedPatchById.forEach((patch, id) => {
      const index = indexById.get(id);
      if (index === undefined) return;
      const currentTask = localTasks.value[index];
      if (!hasTaskPatchChanges(currentTask, patch)) {
        return;
      }
      const updatedTask = {
        ...currentTask,
        ...patch
      };
      localTasks.value[index] = updatedTask;
      changedTasks.push(updatedTask);
    });

    if (changedTasks.length === 0) return [];

    notifyCollectionMutated();
    if (shouldEmit(mutationOptions)) {
      changedTasks.forEach(task => notifyTaskUpdated(task, mutationOptions));
    }
    return changedTasks;
  }

  function upsertTask(task: Task, patch: Partial<Task>, mutationOptions?: TaskMutationOptions): Task {
    const index = localTasks.value.findIndex(existing => existing.id === task.id);

    if (index !== -1) {
      const currentTask = localTasks.value[index];
      if (!hasTaskPatchChanges(currentTask, patch)) {
        return currentTask;
      }
      const updatedTask = {
        ...currentTask,
        ...patch
      };
      localTasks.value[index] = updatedTask;

      notifyCollectionMutated();
      notifyTaskUpdated(updatedTask, mutationOptions);
      return updatedTask;
    }

    const createdTask = {
      ...task,
      ...patch
    };
    localTasks.value = [...localTasks.value, createdTask];

    notifyCollectionMutated();
    notifyTaskUpdated(createdTask, mutationOptions);
    return createdTask;
  }

  function removeTask(taskId: string): Task | null {
    const index = localTasks.value.findIndex(task => task.id === taskId);
    if (index === -1) return null;

    const [removedTask] = localTasks.value.splice(index, 1);
    notifyCollectionMutated();
    return removedTask ?? null;
  }

  return {
    patchTask,
    patchTasksBatch,
    upsertTask,
    removeTask
  };
}
