import { computed, type Ref } from 'vue';
import type { Task } from '@/api';

export interface TaskFilters {
  priority: Ref<string>;
  notebook: Ref<string>;
  document: Ref<string>;
}

const filterCache = new Map<string, Task[] | Record<string, Task[]>>();
let cacheVersion = 0;

function getCacheKey(prefix: string, priority: string, notebook: string, document: string, tasksLength: number): string {
  return `${prefix}:${priority}:${notebook}:${document}:${tasksLength}:${cacheVersion}`;
}

export function useTaskFilters(tasks: Ref<Task[]>, filters: TaskFilters) {
  const filtered = computed(() => {
    const key = getCacheKey('table', filters.priority.value, filters.notebook.value, filters.document.value, tasks.value.length);
    
    const cached = filterCache.get(key);
    if (cached && Array.isArray(cached)) {
      return cached;
    }

    const result = tasks.value.filter(task => {
      if (task.type !== 'block') return false;
      if (filters.notebook.value !== 'all') {
        if (task.notebookId !== filters.notebook.value) return false;
        if (filters.document.value !== 'all' && task.rootId !== filters.document.value) {
          return false;
        }
      }
      return true;
    });
    
    filterCache.set(key, result);
    
    if (filterCache.size > 50) {
      const keys = Array.from(filterCache.keys());
      keys.slice(0, 25).forEach(k => filterCache.delete(k));
    }

    return result;
  });

  const filteredByStatus = computed(() => {
    const key = getCacheKey('kanban', filters.priority.value, filters.notebook.value, filters.document.value, tasks.value.length);
    
    const cached = filterCache.get(key);
    if (cached && !Array.isArray(cached)) {
      return cached as Record<string, Task[]>;
    }

    const result: Record<string, Task[]> = {
      'pending': [],
      'in-progress': [],
      'completed': [],
      'cancelled': []
    };
    
    for (const task of tasks.value) {
      if (!task.title || task.title.trim() === '') continue;
      if (task.type !== 'block') continue;
      if (filters.priority.value !== 'all' && task.priority !== filters.priority.value) continue;
      if (filters.notebook.value !== 'all') {
        if (task.notebookId !== filters.notebook.value) continue;
        if (filters.document.value !== 'all' && task.rootId !== filters.document.value) continue;
      }
      
      if (result[task.status]) {
        result[task.status].push(task);
      }
    }
    
    filterCache.set(key, result);
    
    if (filterCache.size > 50) {
      const keys = Array.from(filterCache.keys());
      keys.slice(0, 25).forEach(k => filterCache.delete(k));
    }

    return result;
  });

  const invalidateCache = () => {
    cacheVersion++;
    filterCache.clear();
  };

  return {
    filtered,
    filteredByStatus,
    invalidateCache
  };
}
