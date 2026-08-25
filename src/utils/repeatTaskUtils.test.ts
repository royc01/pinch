import { describe, expect, it } from 'vitest';
import type { Task } from '@/api';
import { selectVisibleRepeatInstanceIds } from './repeatTaskUtils';

const day = (date: string): number => new Date(`${date}T00:00:00`).getTime();
const today = day('2026-08-10');

function instance(id: string, date: string, status: Task['status'] = 'pending'): Task {
  return {
    id,
    type: 'block',
    title: id,
    status,
    priority: 'none',
    tags: [],
    createdAt: '',
    updatedAt: '',
    isVirtual: true,
    repeatSeriesId: 'series',
    repeatInstanceDate: date,
    startDate: date,
    dueDate: date
  } as Task;
}

function select(tasks: Task[]): Set<string> {
  return selectVisibleRepeatInstanceIds(
    tasks,
    today,
    task => task.startDate === '2026-08-10',
    task => task.startDate ? day(task.startDate) : null,
    task => task.dueDate ? day(task.dueDate) : null
  );
}

describe('selectVisibleRepeatInstanceIds', () => {
  it('shows the current, including the first, instance immediately', () => {
    expect(select([instance('first', '2026-08-10')])).toEqual(new Set(['first']));
  });

  it('advances from a completed instance when the next one is within seven days', () => {
    expect(select([
      instance('completed', '2026-08-09', 'completed'),
      instance('next', '2026-08-17')
    ])).toEqual(new Set(['next']));
  });

  it('keeps a completed instance visible when the next one is more than seven days away', () => {
    expect(select([
      instance('completed', '2026-08-09', 'completed'),
      instance('next', '2026-08-18')
    ])).toEqual(new Set(['completed']));
  });

  it('keeps an unfinished overdue instance visible until the next instance starts', () => {
    expect(select([
      instance('overdue', '2026-08-09', 'delayed'),
      instance('next', '2026-08-12')
    ])).toEqual(new Set(['overdue']));
  });
});
