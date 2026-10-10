import { reactive } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import type { Task } from '@/api';
import { createCalendarTaskDateCache, createCalendarTaskLayoutCache, createCalendarTaskProjection } from './calendarTaskCache';

const task = (id: string): Task => ({ id, blockId: id, type: 'block', title: id, status: 'pending', priority: 'none', tags: [],
  startDate: '2026-10-07', dueDate: '2026-10-08', createdAt: '', updatedAt: '' });

describe('shared calendar computation', () => {
  it('shares parsed dates between task clones and invalidates only scheduling fields', () => {
    const read = createCalendarTaskDateCache();
    const first = reactive(task('a')), clone = reactive({ ...first });
    const initial = read(first);
    expect(read(clone)).toBe(initial);
    first.title = 'new title';
    first.status = 'completed';
    expect(read(first)).toBe(initial);
    first.startDate = '2026-10-06';
    expect(read(first)).not.toBe(initial);
    expect(read(clone)).toBe(initial);
  });

  it('updates repeat dates and switches correctly between single-day and window occurrences', () => {
    const read = createCalendarTaskDateCache();
    const repeated = reactive({ ...task('repeat'), repeatSeriesId: 'series', repeatInstanceDate: '2026-10-09' });
    expect(read(repeated)!.end.getDate()).toBe(9);
    repeated.repeatInstanceDate = '2026-10-10';
    expect(read(repeated)!.start.getDate()).toBe(10);
    Object.assign(repeated, { isRepeatWindow: true });
    expect(read(repeated)!.start.getDate()).toBe(7);
    expect(read(repeated)!.end.getDate()).toBe(8);
  });

  it('reprojects only the moved task in a 6501-task collection', () => {
    const data = reactive(Array.from({ length: 6501 }, (_, index) => task(String(index))));
    const project = vi.fn((item: Task) => ({ startDate: item.startDate }));
    const read = createCalendarTaskProjection(project);
    const initial = data.map(read);
    project.mockClear();
    data[3000].startDate = '2026-10-09';
    data[5000].title = 'renamed';
    const result = data.map(read);
    expect(project).toHaveBeenCalledOnce();
    expect(result[3000]).not.toBe(initial[3000]);
    expect(result[5000]).toBe(initial[5000]);
  });

  it('retains unchanged layout records with live task fields, including optional added fields', () => {
    const read = createCalendarTaskLayoutCache<{ row: number; date: Date }>();
    const live = reactive(task('a'));
    const fields = { row: 1, date: new Date(2026, 9, 7) };
    const record = read(live, 'week', fields);
    expect(read(live, 'week', { ...fields, date: new Date(fields.date) })).toBe(record);
    live.title = 'renamed';
    live.startTime = '10:00';
    expect(record.title).toBe('renamed');
    expect(record.startTime).toBe('10:00');
    expect({ ...record }.startTime).toBe('10:00');
    expect(read(live, 'week', { ...fields, row: 2 })).not.toBe(record);
    expect(read(reactive({ ...live }), 'week', fields)).not.toBe(record);
  });
});
