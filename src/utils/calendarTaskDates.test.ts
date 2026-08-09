import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import type { Task } from '@/api';
import {
  createCalendarTaskDateFields,
  getEffectiveDueDate,
  normalizeOptionalDateValue,
  saveCalendarTaskDates
} from '@/utils/calendarTaskDates';

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    type: 'task',
    title: 'Task',
    status: 'pending',
    priority: 'none',
    tags: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  } as Task;
}

describe('calendar task date fields', () => {
  it('normalizes optional dates without changing non-empty values', () => {
    expect(normalizeOptionalDateValue(null)).toBeNull();
    expect(normalizeOptionalDateValue('   ')).toBeNull();
    expect(normalizeOptionalDateValue(' 2026-04-10 ')).toBe(' 2026-04-10 ');
    expect(getEffectiveDueDate('2026-04-10', '')).toBe('2026-04-10');
    expect(getEffectiveDueDate('2026-04-10', '2026-04-12')).toBe('2026-04-12');
  });

  it('normalizes empty values and keeps a due date no earlier than the start date', () => {
    expect(createCalendarTaskDateFields({
      startDate: '2026-04-10',
      dueDate: '2026-04-08'
    })).toEqual({
      startDate: '2026-04-10',
      startTime: '',
      dueDate: '2026-04-10',
      dueTime: ''
    });
  });
});

describe('saveCalendarTaskDates', () => {
  it('emits a normalized save request without optimistic mutation for a normal task', () => {
    const localTasks = ref([task()]);
    const patchLocalTask = vi.fn();
    const suppressRepeatSeriesSync = vi.fn();
    const emitTaskDateChanged = vi.fn();

    const payload = saveCalendarTaskDates({
      task: localTasks.value[0],
      fields: { startDate: '2026-04-10', dueDate: '2026-04-08' },
      localTasks,
      patchLocalTask,
      suppressRepeatSeriesSync,
      emitTaskDateChanged
    });

    expect(payload.fields).toMatchObject({ startDate: '2026-04-10', dueDate: '2026-04-10' });
    expect(payload.optimisticApplied).toBe(false);
    expect(patchLocalTask).not.toHaveBeenCalled();
    expect(suppressRepeatSeriesSync).not.toHaveBeenCalled();
    expect(emitTaskDateChanged).not.toHaveBeenCalled();
  });

  it('updates the series template when editing a virtual repeat task', () => {
    const templateTask = task({ id: 'template', repeatSeriesId: 'series-1', repeatFrequency: 'weekly' as Task['repeatFrequency'] });
    const virtualTask = task({
      id: 'virtual',
      repeatSeriesId: 'series-1',
      repeatFrequency: 'weekly' as Task['repeatFrequency'],
      isVirtual: true
    });
    const localTasks = ref([templateTask, virtualTask]);
    const updatedTask = { ...templateTask, startDate: '2026-04-10', dueDate: '2026-04-11' };
    const patchLocalTask = vi.fn(() => updatedTask);
    const suppressRepeatSeriesSync = vi.fn();
    const emitTaskDateChanged = vi.fn();

    const payload = saveCalendarTaskDates({
      task: virtualTask,
      fields: { startDate: '2026-04-10', dueDate: '2026-04-11' },
      localTasks,
      patchLocalTask,
      suppressRepeatSeriesSync,
      emitTaskDateChanged
    });

    expect(patchLocalTask).toHaveBeenCalledWith('template', {
      startDate: '2026-04-10',
      dueDate: '2026-04-11',
      startTime: undefined,
      dueTime: undefined
    });
    expect(payload.repeatPersistenceTarget).toEqual(templateTask);
    expect(payload.optimisticApplied).toBe(true);
    expect(emitTaskDateChanged).toHaveBeenCalledWith(updatedTask);
    expect(suppressRepeatSeriesSync).not.toHaveBeenCalled();
  });

  it('turns a cleared repeat task into a normal task and removes virtual instances', () => {
    const templateTask = task({ id: 'template', repeatSeriesId: 'series-1', repeatFrequency: 'weekly' as Task['repeatFrequency'] });
    const virtualTask = task({
      id: 'virtual',
      repeatSeriesId: 'series-1',
      repeatFrequency: 'weekly' as Task['repeatFrequency'],
      isVirtual: true
    });
    const otherTask = task({ id: 'other' });
    const localTasks = ref([templateTask, virtualTask, otherTask]);
    const patchLocalTask = vi.fn();
    const suppressRepeatSeriesSync = vi.fn();
    const emitTaskDateChanged = vi.fn();

    const payload = saveCalendarTaskDates({
      task: templateTask,
      fields: {},
      localTasks,
      patchLocalTask,
      suppressRepeatSeriesSync,
      emitTaskDateChanged
    });

    expect(suppressRepeatSeriesSync).toHaveBeenCalledWith('series-1', 'template');
    expect(localTasks.value).toEqual([
      expect.objectContaining({
        id: 'template',
        repeatFrequency: 'none',
        repeatSeriesId: undefined,
        isVirtual: false,
        startDate: '',
        dueDate: '',
        startTime: undefined,
        dueTime: undefined
      }),
      otherTask
    ]);
    expect(patchLocalTask).not.toHaveBeenCalled();
    expect(payload.optimisticApplied).toBe(true);
    expect(emitTaskDateChanged).toHaveBeenCalledWith(localTasks.value[0]);
  });
});
