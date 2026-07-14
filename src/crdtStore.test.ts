import { afterEach, describe, expect, it } from 'vitest';
import type { Task } from './api';
import {
  applyTaskAttributeChanges,
  resetCrdtRepository,
  useCrdtTasks
} from './crdtStore';

const task: Task = {
  id: 'task-1',
  type: 'block',
  blockId: 'block-1',
  title: 'Shared task',
  status: 'pending',
  priority: 'none',
  tags: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

describe('shared task attribute changes', () => {
  afterEach(() => {
    resetCrdtRepository();
  });

  it('updates every active task store with the latest priority and tags', () => {
    const { syncFromSQL: syncGlobalTasks, tasks: globalTasks } = useCrdtTasks();
    const { syncFromSQL: syncSidebarTasks, tasks: sidebarTasks } = useCrdtTasks('task-manager');
    syncGlobalTasks([{ ...task }]);
    syncSidebarTasks([{ ...task }]);

    expect(applyTaskAttributeChanges('block-1', {
      'custom-task-priority': 'high',
      'custom-task-tags': '["tag-a","tag-b"]',
      'custom-task-group': 'tag-b'
    })).toBe(true);

    expect(globalTasks.value[0]).toMatchObject({
      priority: 'high',
      tags: ['tag-b', 'tag-a'],
      groupId: 'tag-b'
    });
    expect(sidebarTasks.value[0]).toMatchObject({
      priority: 'high',
      tags: ['tag-b', 'tag-a'],
      groupId: 'tag-b'
    });

    applyTaskAttributeChanges('block-1', {
      'custom-task-priority': 'medium',
      'custom-task-tags': '["tag-c"]',
      'custom-task-group': 'tag-c'
    });

    expect(globalTasks.value[0]).toMatchObject({
      priority: 'medium',
      tags: ['tag-c'],
      groupId: 'tag-c'
    });
    expect(sidebarTasks.value[0]).toMatchObject({
      priority: 'medium',
      tags: ['tag-c'],
      groupId: 'tag-c'
    });
  });

  it('updates focus estimates in every active task store', () => {
    const { syncFromSQL: syncGlobalTasks, tasks: globalTasks } = useCrdtTasks();
    const { syncFromSQL: syncSidebarTasks, tasks: sidebarTasks } = useCrdtTasks('task-manager');
    syncGlobalTasks([{ ...task }]);
    syncSidebarTasks([{ ...task }]);

    expect(applyTaskAttributeChanges('block-1', {
      'custom-task-focus-estimate': '{"unit":"minutes","value":30}'
    })).toBe(true);

    expect(globalTasks.value[0].focusEstimate).toEqual({ unit: 'minutes', value: 30 });
    expect(sidebarTasks.value[0].focusEstimate).toEqual({ unit: 'minutes', value: 30 });
  });
});
