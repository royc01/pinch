import { describe, expect, it } from 'vitest';
import type { Task } from '@/api';
import {
  applyManualTaskOrder,
  applyManualTaskOrderWithinGroups,
  getDefaultTaskManualOrderGroupKey,
  moveTaskInManualOrder,
  reconcileManualTaskOrder,
  sortTasks,
  sortTasksKeepingPinnedManualOrder
} from './taskSorting';

function task(id: string, values: Partial<Task> = {}): Task {
  return {
    id,
    type: 'block',
    title: id,
    status: 'pending',
    priority: 'none',
    tags: [],
    createdAt: '',
    updatedAt: '',
    ...values
  };
}

describe('sortTasks', () => {
  it('sorts due dates while keeping undated tasks at the end in either direction', () => {
    const tasks = [task('none'), task('later', { dueDate: '2026-09-10' }), task('soon', { dueDate: '2026-09-08' })];

    expect(sortTasks(tasks, 'dueDate', 'asc').map(item => item.id)).toEqual(['soon', 'later', 'none']);
    expect(sortTasks(tasks, 'dueDate', 'desc').map(item => item.id)).toEqual(['later', 'soon', 'none']);
  });

  it('uses priority and title sort rules without changing the source', () => {
    const tasks = [task('zeta', { priority: 'low' }), task('alpha', { priority: 'high' })];

    expect(sortTasks(tasks, 'priority', 'asc').map(item => item.id)).toEqual(['alpha', 'zeta']);
    expect(sortTasks(tasks, 'title', 'desc').map(item => item.id)).toEqual(['zeta', 'alpha']);
    expect(tasks.map(item => item.id)).toEqual(['zeta', 'alpha']);
  });

  it('keeps pinned tasks in manual order and sorts only unpinned tasks', () => {
    const tasks = [
      task('normal-later', { dueDate: '2026-09-10' }),
      task('pinned-soon', { pinned: true, dueDate: '2026-09-08' }),
      task('normal-soon', { dueDate: '2026-09-08' }),
      task('pinned-later', { pinned: true, dueDate: '2026-09-10' })
    ];

    expect(sortTasksKeepingPinnedManualOrder(
      tasks,
      'dueDate',
      'asc',
      ['pinned-later', 'pinned-soon']
    ).map(item => item.id)).toEqual([
      'pinned-later',
      'pinned-soon',
      'normal-soon',
      'normal-later'
    ]);
  });
});

describe('manual task ordering', () => {
  it('applies stored IDs without moving the automatic slots occupied by new tasks', () => {
    const tasks = [task('new'), task('second'), task('first')];
    expect(applyManualTaskOrder(tasks, ['first', 'second']).map(task => task.id)).toEqual([
      'new',
      'first',
      'second'
    ]);
    expect(tasks.map(task => task.id)).toEqual(['new', 'second', 'first']);
  });

  it('reconciles loaded IDs without dropping IDs saved from another scope', () => {
    expect(reconcileManualTaskOrder(['outside', 'two'], ['one', 'two'])).toEqual([
      'outside',
      'two',
      'one'
    ]);
  });

  it('moves a task before or after its drop target', () => {
    expect(moveTaskInManualOrder(['one', 'two', 'three'], 'three', 'one', 'before')).toEqual([
      'three',
      'one',
      'two'
    ]);
    expect(moveTaskInManualOrder(['one', 'two', 'three'], 'one', 'two', 'after')).toEqual([
      'two',
      'one',
      'three'
    ]);
  });

  it('keeps pinned, overdue, and priority groups separate while honoring manual order', () => {
    const tasks = [
      task('pinned-high', { pinned: true, priority: 'high' }),
      task('pinned-low', { pinned: true, priority: 'low' }),
      task('overdue', { dueDate: '2026-09-01', priority: 'low' }),
      task('high', { priority: 'high' }),
      task('low-b', { priority: 'low' }),
      task('low-a', { priority: 'low' })
    ];
    const manuallyOrdered = applyManualTaskOrderWithinGroups(
      tasks,
      ['low-a', 'low-b', 'high', 'overdue', 'pinned-low', 'pinned-high'],
      item => getDefaultTaskManualOrderGroupKey(item, item.status, Date.parse('2026-09-06'))
    );

    expect(manuallyOrdered.map(item => item.id)).toEqual([
      'pinned-low',
      'pinned-high',
      'overdue',
      'high',
      'low-a',
      'low-b'
    ]);
  });
});
