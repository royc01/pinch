import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import type { Task } from '@/api';
import * as visibility from '@/utils/taskVisibility';
import { useTaskFilters } from './useTaskFilters';

function task(id: string, updates: Partial<Task> = {}): Task {
  return {
    id, type: 'block', title: id, status: 'pending', priority: 'none', tags: [],
    notebookId: 'nb', rootId: 'parent', hPath: '/Projects',
    createdAt: '2026-10-01', updatedAt: '2026-10-01', ...updates
  };
}

function filters() {
  return { notebook: ref('all'), document: ref('all'), priority: ref('all'),
    archiveMode: ref<'active' | 'archived' | 'all'>('active') };
}

describe('useTaskFilters', () => {
  it('reuses a 6501-task result without scanning titles when switching back', () => {
    const titleCheck = vi.spyOn(visibility, 'hasVisibleTaskTitle');
    try {
      const tasks = ref(Array.from({ length: 6501 }, (_, index) => task(`task-${index}`)));
      const options = filters();
      const { filtered } = useTaskFilters(tasks, options);
      const active = filtered.value;
      expect(active).toHaveLength(6501);
      expect(titleCheck).toHaveBeenCalledTimes(6501);
      for (let index = 0; index < 20; index += 1) {
        options.archiveMode.value = 'archived';
        expect(filtered.value).toHaveLength(0);
        options.archiveMode.value = 'active';
        expect(filtered.value).toBe(active);
      }
      expect(titleCheck).toHaveBeenCalledTimes(6501);
    } finally {
      titleCheck.mockRestore();
    }
  });

  it('updates cached results after in-place status, priority, title and archive changes', () => {
    const tasks = ref([task('one'), task('two', { archived: true })]);
    const options = filters();
    const { filtered, filteredByStatus } = useTaskFilters(tasks, options);
    expect(filtered.value.map(item => item.id)).toEqual(['one']);
    expect(filteredByStatus.value.pending).toHaveLength(1);
    tasks.value[0].status = 'completed';
    expect(filteredByStatus.value.pending).toHaveLength(0);
    expect(filteredByStatus.value.completed).toHaveLength(1);
    options.priority.value = 'high';
    expect(filteredByStatus.value.completed).toHaveLength(0);
    tasks.value[0].priority = 'high';
    expect(filteredByStatus.value.completed).toHaveLength(1);
    tasks.value[0].archived = true;
    expect(filtered.value).toHaveLength(0);
    options.archiveMode.value = 'archived';
    expect(filtered.value).toHaveLength(2);
    tasks.value[0].title = '<span>&nbsp;</span>';
    expect(filtered.value.map(item => item.id)).toEqual(['two']);
  });

  it('isolates collections and invalidates entries when an equal-sized snapshot replaces tasks', () => {
    const first = ref([task('same-id', { title: 'First' })]);
    const second = ref([task('same-id', { title: 'Second', notebookId: 'other' })]);
    const firstResult = useTaskFilters(first, filters());
    const secondResult = useTaskFilters(second, filters());
    expect(firstResult.filtered.value[0].title).toBe('First');
    expect(secondResult.filtered.value[0].title).toBe('Second');
    first.value = [task('replacement')];
    expect(firstResult.filtered.value[0].id).toBe('replacement');
    expect(secondResult.filtered.value[0].title).toBe('Second');
  });

  it('keeps descendant document filtering current when document paths change', () => {
    const tasks = ref([task('parent'), task('child', { rootId: 'child', hPath: '/Projects/Child' }),
      task('elsewhere', { rootId: 'elsewhere', hPath: '/Elsewhere' })]);
    const options = filters();
    options.document.value = 'parent';
    const { filtered } = useTaskFilters(tasks, options);
    expect(filtered.value.map(item => item.id)).toEqual(['parent', 'child']);
    options.document.value = 'all';
    expect(filtered.value).toHaveLength(3);
    tasks.value[1].hPath = '/Elsewhere/Child';
    options.document.value = 'parent';
    expect(filtered.value.map(item => item.id)).toEqual(['parent']);
    options.notebook.value = 'other';
    expect(filtered.value).toHaveLength(0);
    tasks.value[0].notebookId = 'other';
    expect(filtered.value.map(item => item.id)).toEqual(['parent']);
  });
});
