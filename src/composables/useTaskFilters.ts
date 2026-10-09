import { computed, ref, type ComputedRef, type Ref } from 'vue';
import type { Task } from '@/api';
import { createTaskDocumentScopeMatcher, type TaskDocumentScopeMatcher } from '@/utils/taskDocumentScope';
import { hasVisibleTaskTitle } from '@/utils/taskVisibility';

export interface TaskFilters {
  priority?: Ref<string>;
  notebook: Ref<string>;
  document: Ref<string>;
  archiveMode?: Ref<'active' | 'archived' | 'all'>;
}

type ArchiveMode = 'active' | 'archived' | 'all';

function remember<K, V>(cache: Map<K, V>, key: K, value: V): V {
  cache.delete(key);
  cache.set(key, value);
  if (cache.size > 50) {
    cache.delete(cache.keys().next().value!);
  }
  return value;
}

export function useTaskFilters(tasks: Ref<Task[]>, filters: TaskFilters) {
  // Cache reactive computations per collection. A cache hit must not build a
  // fingerprint of every task, and equal-sized collections must never share
  // results. Vue invalidates each entry when its actual task fields change.
  const revision = ref(0);
  const visibleTasks = computed(() => {
    revision.value;
    return tasks.value.filter(task => task.type === 'block' && hasVisibleTaskTitle(task.title));
  });
  const scopes = new Map<string, ComputedRef<TaskDocumentScopeMatcher>>();
  const taskCache = new Map<string, ComputedRef<Task[]>>();
  const statusCache = new Map<string, ComputedRef<Record<string, Task[]>>>();

  function getScope(documentId: string): TaskDocumentScopeMatcher {
    const scope = scopes.get(documentId) || computed(() => {
      revision.value;
      return createTaskDocumentScopeMatcher(documentId, tasks.value);
    });
    return remember(scopes, documentId, scope).value;
  }

  function getFiltered(notebook: string, documentId: string, archiveMode: ArchiveMode): ComputedRef<Task[]> {
    const key = JSON.stringify([notebook, documentId, archiveMode]);
    const entry = taskCache.get(key) || computed(() => {
      const scope = getScope(documentId);
      return visibleTasks.value.filter(task => {
        if (archiveMode === 'active' && task.archived) return false;
        if (archiveMode === 'archived' && !task.archived) return false;
        if (notebook !== 'all' && task.notebookId !== notebook) return false;
        return scope.matches(task);
      });
    });
    return remember(taskCache, key, entry);
  }

  const filtered = computed(() => getFiltered(
    filters.notebook.value,
    filters.document.value,
    filters.archiveMode?.value || 'active'
  ).value);

  const filteredByStatus = computed(() => {
    const notebook = filters.notebook.value;
    const documentId = filters.document.value;
    const archiveMode = filters.archiveMode?.value || 'active';
    const priority = filters.priority?.value || 'all';
    const key = JSON.stringify([notebook, documentId, archiveMode, priority]);
    const entry = statusCache.get(key) || computed(() => {
      const result: Record<string, Task[]> = {
        pending: [], 'in-progress': [], delayed: [], completed: [], cancelled: []
      };
      for (const task of getFiltered(notebook, documentId, archiveMode).value) {
        if (priority !== 'all' && task.priority !== priority) continue;
        result[task.status]?.push(task);
      }
      return result;
    });
    return remember(statusCache, key, entry).value;
  });

  const invalidateCache = () => { revision.value += 1; };

  return { filtered, filteredByStatus, invalidateCache };
}
