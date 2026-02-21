import { describe, it, expect } from 'vitest';
import { ref } from 'vue';
import { useTaskFilters } from './useTaskFilters';
import type { Task } from '@/api';

describe('KanbanView Filters', () => {
  it('应该正确按笔记本和文档过滤任务', () => {
    const mockTasks = ref<Task[]>([
      {
        id: '1',
        type: 'block',
        title: 'Task 1',
        status: 'pending',
        priority: 'high',
        notebookId: 'notebook-1',
        rootId: 'doc-1',
        hPath: '/notebook-1/doc-1',
        blockId: 'block-1',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        tags: []
      },
      {
        id: '2',
        type: 'block',
        title: 'Task 2',
        status: 'pending',
        priority: 'high',
        notebookId: 'notebook-1',
        rootId: 'doc-2',
        hPath: '/notebook-1/doc-2',
        blockId: 'block-2',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        tags: []
      },
      {
        id: '3',
        type: 'block',
        title: 'Task 3',
        status: 'pending',
        priority: 'high',
        notebookId: 'notebook-2',
        rootId: 'doc-3',
        hPath: '/notebook-2/doc-3',
        blockId: 'block-3',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        tags: []
      }
    ]);

    const filters = {
      priority: ref('all'),
      notebook: ref('notebook-1'),
      document: ref('doc-1')
    };

    const { filteredByStatus } = useTaskFilters(mockTasks, filters);

    const pendingTasks = filteredByStatus.value['pending'];
    expect(pendingTasks.length).toBe(1);
    expect(pendingTasks[0].id).toBe('1');
  });

  it('应该在 notebook 选择 all 时显示所有任务', () => {
    const mockTasks = ref<Task[]>([
      {
        id: '1',
        type: 'block',
        title: 'Task 1',
        status: 'pending',
        priority: 'high',
        notebookId: 'notebook-1',
        rootId: 'doc-1',
        hPath: '/notebook-1/doc-1',
        blockId: 'block-1',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        tags: []
      }
    ]);

    const filters = {
      priority: ref('all'),
      notebook: ref('all'),
      document: ref('all')
    };

    const { filteredByStatus } = useTaskFilters(mockTasks, filters);

    const pendingTasks = filteredByStatus.value['pending'];
    expect(pendingTasks.length).toBe(1);
  });
});
