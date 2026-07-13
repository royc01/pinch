export const TASK_STATUS_VALUES = [
  'pending',
  'in-progress',
  'delayed',
  'completed',
  'cancelled'
] as const;

export type TaskStatusValue = (typeof TASK_STATUS_VALUES)[number];

export interface TaskStatusOption {
  value: TaskStatusValue;
  label: string;
}

export interface TaskStatusSelectOption {
  value: TaskStatusValue | '';
  text: string;
}

export interface TaskStatusPopoverOption extends TaskStatusOption {
  background: string;
  color: string;
}

const TASK_STATUS_LABEL_KEYS: Record<TaskStatusValue, string> = {
  pending: 'taskManager.statusPending',
  'in-progress': 'taskManager.statusInProgress',
  delayed: 'taskManager.statusDelayed',
  completed: 'taskManager.statusCompleted',
  cancelled: 'taskManager.statusCancelled'
};

const TASK_STATUS_POPOVER_STYLES: Record<TaskStatusValue, Pick<TaskStatusPopoverOption, 'background' | 'color'>> = {
  pending: { background: '#fef3c7', color: '#f59e0b' },
  'in-progress': { background: '#dbeafe', color: '#3b82f6' },
  delayed: { background: '#ffedd5', color: '#f97316' },
  completed: { background: '#d1fae5', color: '#10b981' },
  cancelled: { background: '#f3f4f6', color: '#9ca3af' }
};

export function getTaskStatusLabel(
  status: TaskStatusValue | string | undefined,
  t: (key: string) => string
): string {
  if (typeof status !== 'string' || !(status in TASK_STATUS_LABEL_KEYS)) {
    return status || '';
  }
  return t(TASK_STATUS_LABEL_KEYS[status as TaskStatusValue]);
}

export function buildTaskStatusFilterOptions(t: (key: string) => string): TaskStatusOption[] {
  return TASK_STATUS_VALUES.map(value => ({
    value,
    label: getTaskStatusLabel(value, t)
  }));
}

export function buildTaskStatusSelectOptions(t: (key: string) => string): TaskStatusSelectOption[] {
  return [
    { value: '', text: t('taskManager.statusNoChange') },
    ...TASK_STATUS_VALUES.map(value => ({
      value,
      text: getTaskStatusLabel(value, t)
    }))
  ];
}

export function buildTaskStatusPopoverOptions(t: (key: string) => string): TaskStatusPopoverOption[] {
  return TASK_STATUS_VALUES.map(value => ({
    value,
    label: getTaskStatusLabel(value, t),
    ...TASK_STATUS_POPOVER_STYLES[value]
  }));
}
