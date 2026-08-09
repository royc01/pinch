import type { Ref } from 'vue';
import type { Task } from '@/api';

export interface CalendarTaskDateFields {
  startDate: string;
  startTime: string;
  dueDate: string;
  dueTime: string;
}

export interface CalendarTaskDateSavePayload {
  task: Task;
  fields: CalendarTaskDateFields;
  repeatPersistenceTarget?: Task;
  optimisticApplied: boolean;
}

export function normalizeOptionalDateValue(value: string | null | undefined): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

export function getEffectiveDueDate(startDate: string, dueDate: string | null | undefined): string {
  return normalizeOptionalDateValue(dueDate) || startDate;
}

interface SaveCalendarTaskDatesOptions {
  task: Task;
  fields: Partial<CalendarTaskDateFields>;
  localTasks: Ref<Task[]>;
  patchLocalTask: (taskId: string, patch: Partial<Task>) => Task | null;
  suppressRepeatSeriesSync: (seriesId: string, taskId?: string) => void;
  emitTaskDateChanged: (task: Task) => void;
}

export function createCalendarTaskDateFields(
  fields: Partial<CalendarTaskDateFields> = {}
): CalendarTaskDateFields {
  const normalizedFields = {
    startDate: fields.startDate || '',
    startTime: fields.startTime || '',
    dueDate: fields.dueDate || '',
    dueTime: fields.dueTime || ''
  };

  if (normalizedFields.startDate && normalizedFields.dueDate && normalizedFields.dueDate < normalizedFields.startDate) {
    normalizedFields.dueDate = normalizedFields.startDate;
  }

  return normalizedFields;
}

export function saveCalendarTaskDates({
  task,
  fields: dateFields,
  localTasks,
  patchLocalTask,
  suppressRepeatSeriesSync,
  emitTaskDateChanged
}: SaveCalendarTaskDatesOptions): CalendarTaskDateSavePayload {
  const fields = createCalendarTaskDateFields(dateFields);
  let updatedTask: Task | null = null;
  let repeatPersistenceTarget: Task | undefined;
  const requestIsRepeatTask = !!task.repeatSeriesId || (!!task.repeatFrequency && task.repeatFrequency !== 'none');

  if (requestIsRepeatTask) {
    const seriesId = task.repeatSeriesId;
    const templateTask = !task.isVirtual
      ? task
      : localTasks.value.find(item => !item.isVirtual && !!seriesId && item.repeatSeriesId === seriesId);
    const targetTask = templateTask || task;
    repeatPersistenceTarget = { ...targetTask };

    if (!fields.startDate && !fields.dueDate && !fields.startTime && !fields.dueTime) {
      suppressRepeatSeriesSync(seriesId || '', targetTask.id);
      updatedTask = {
        ...targetTask,
        repeatFrequency: 'none',
        repeatSeriesId: undefined,
        repeatInstanceDate: undefined,
        isVirtual: false,
        startDate: '',
        dueDate: '',
        startTime: undefined,
        dueTime: undefined
      };
      localTasks.value = localTasks.value.flatMap((item) => {
        if (item.id === targetTask.id) {
          return [updatedTask as Task];
        }
        if (item.isVirtual && item.repeatSeriesId === seriesId) {
          return [];
        }
        return [item];
      });
    } else {
      updatedTask = patchLocalTask(targetTask.id, {
        startDate: fields.startDate,
        dueDate: fields.dueDate,
        startTime: fields.startTime || undefined,
        dueTime: fields.dueTime || undefined
      });
    }
  }

  if (updatedTask) {
    emitTaskDateChanged(updatedTask);
  }

  return {
    task,
    fields,
    repeatPersistenceTarget,
    optimisticApplied: !!updatedTask
  };
}
