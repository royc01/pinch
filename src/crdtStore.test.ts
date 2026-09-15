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

  it('updates archive state in every active task store', () => {
    const { syncFromSQL: syncGlobalTasks, tasks: globalTasks } = useCrdtTasks();
    const { syncFromSQL: syncSidebarTasks, tasks: sidebarTasks } = useCrdtTasks('task-manager');
    syncGlobalTasks([{ ...task }]);
    syncSidebarTasks([{ ...task }]);

    expect(applyTaskAttributeChanges('block-1', {
      'custom-task-archived': '1',
      'custom-task-archived-at': '2026-09-15T08:00:00.000Z',
      'custom-task-archive-reason': 'manual'
    })).toBe(true);

    expect(globalTasks.value[0]).toMatchObject({
      archived: true,
      archivedAt: '2026-09-15T08:00:00.000Z',
      archiveReason: 'manual'
    });
    expect(sidebarTasks.value[0]).toMatchObject({
      archived: true,
      archivedAt: '2026-09-15T08:00:00.000Z',
      archiveReason: 'manual'
    });

    applyTaskAttributeChanges('block-1', {
      'custom-task-archived': '',
      'custom-task-archived-at': '',
      'custom-task-archive-reason': ''
    });

    expect(globalTasks.value[0]).toMatchObject({ archived: false });
    expect(globalTasks.value[0].archivedAt).toBeUndefined();
    expect(globalTasks.value[0].archiveReason).toBeUndefined();
  });

  it('updates archive state for nested subtasks', () => {
    const nested = {
      ...task,
      id: 'parent-task',
      blockId: 'parent-block',
      subtasks: [{ ...task, id: 'child-task', blockId: 'child-block', title: 'Child', completed: false }]
    };
    const { syncFromSQL, tasks } = useCrdtTasks();
    syncFromSQL([nested]);

    applyTaskAttributeChanges('child-block', {
      'custom-task-archived': 'true',
      'custom-task-archive-reason': 'auto'
    });

    expect(tasks.value[0].subtasks?.[0]).toMatchObject({ archived: true, archiveReason: 'auto' });
  });

  it('mirrors template archive changes to virtual repeat instances', () => {
    const template = { ...task, repeatSeriesId: 'series-1' };
    const virtual = {
      ...task,
      id: 'series-1:2026-09-16',
      blockId: undefined,
      isVirtual: true,
      repeatSeriesId: 'series-1',
      repeatInstanceDate: '2026-09-16'
    };
    const { syncFromSQL, tasks } = useCrdtTasks();
    syncFromSQL([template, virtual]);

    applyTaskAttributeChanges('block-1', {
      'custom-task-archived': '1',
      'custom-task-archive-reason': 'manual'
    });

    expect(tasks.value.find(item => item.id === template.id)).toMatchObject({ archived: true });
    expect(tasks.value.find(item => item.id === virtual.id)).toMatchObject({ archived: true });
  });
});
