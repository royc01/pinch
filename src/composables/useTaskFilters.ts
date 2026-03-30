import { computed, type Ref } from 'vue';
import type { Task } from '@/api';

export interface TaskFilters {
  priority?: Ref<string>;
  notebook: Ref<string>;
  document: Ref<string>;
  archiveMode?: Ref<'active' | 'archived' | 'all'>;
}

const filterCache = new Map<string, Task[] | Record<string, Task[]>>();
let cacheVersion = 0;

function getTableCacheKey(
  notebook: string,
  document: string,
  archiveMode: 'active' | 'archived' | 'all',
  tasksLength: number
): string {
  return `table:${notebook}:${document}:${archiveMode}:${tasksLength}:${cacheVersion}`;
}

function getKanbanCacheKey(
  priority: string,
  notebook: string,
  document: string,
  archiveMode: 'active' | 'archived' | 'all',
  tasksLength: number
): string {
  return `kanban:${priority}:${notebook}:${document}:${archiveMode}:${tasksLength}:${cacheVersion}`;
}

export function useTaskFilters(tasks: Ref<Task[]>, filters: TaskFilters) {
  const filtered = computed(() => {
    const archiveMode = filters.archiveMode?.value || 'active';
    const key = getTableCacheKey(filters.notebook.value, filters.document.value, archiveMode, tasks.value.length);
    
    const cached = filterCache.get(key);
    if (cached && Array.isArray(cached)) {
      return cached;
    }

    const result = tasks.value.filter(task => {
      if (task.type !== 'block') return false;
      if (archiveMode === 'active' && task.archived) return false;
      if (archiveMode === 'archived' && !task.archived) return false;
      if (filters.notebook.value !== 'all' && task.notebookId !== filters.notebook.value) {
        return false;
      }
      if (filters.document.value !== 'all' && task.rootId !== filters.document.value) {
        return false;
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
    const priorityValue = filters.priority?.value ?? 'all';
    const archiveMode = filters.archiveMode?.value || 'active';
    const key = getKanbanCacheKey(
      priorityValue,
      filters.notebook.value,
      filters.document.value,
      archiveMode,
      tasks.value.length
    );
    
    const cached = filterCache.get(key);
    if (cached && !Array.isArray(cached)) {
      return cached as Record<string, Task[]>;
    }

    const result: Record<string, Task[]> = {
      'pending': [],
      'in-progress': [],
      'delayed': [],
      'completed': [],
      'cancelled': []
    };
    
    for (const task of tasks.value) {
      if (!task.title || task.title.trim() === '') continue;
      if (task.type !== 'block') continue;
      if (archiveMode === 'active' && task.archived) continue;
      if (archiveMode === 'archived' && !task.archived) continue;
      if (priorityValue !== 'all' && task.priority !== priorityValue) continue;
      if (filters.notebook.value !== 'all' && task.notebookId !== filters.notebook.value) continue;
      if (filters.document.value !== 'all' && task.rootId !== filters.document.value) continue;
      
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
