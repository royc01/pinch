export type TaskPriorityValue = 'high' | 'medium' | 'low' | 'none';
export type TaskPriorityLevel = Exclude<TaskPriorityValue, 'none'>;

export interface TaskPriorityStyle {
  background: string;
  color: string;
}

export interface TaskPriorityOption extends TaskPriorityStyle {
  value: TaskPriorityValue;
  label: string;
}

export interface TaskPriorityShortOption extends TaskPriorityOption {
  value: TaskPriorityLevel;
  shortLabel: string;
}

export const TASK_PRIORITY_STYLES: Record<TaskPriorityValue, TaskPriorityStyle> = {
  high: {
    background: 'var(--pinch-background10)',
    color: 'var(--pinch-font-color10)'
  },
  medium: {
    background: 'var(--pinch-background3)',
    color: 'var(--pinch-font-color3)'
  },
  low: {
    background: 'var(--pinch-background7)',
    color: 'var(--pinch-font-color7)'
  },
  none: {
    background: 'var(--b3-list-hover)',
    color: 'var(--b3-theme-on-surface)'
  }
};

export function getTaskPriorityLabel(
  priority: TaskPriorityValue | string | undefined,
  t: (key: string) => string
): string {
  if (priority === 'high') {
    return t('taskManager.priorityHighLabel');
  }
  if (priority === 'medium') {
    return t('taskManager.priorityMediumLabel');
  }
  if (priority === 'none') {
    return t('taskManager.priorityNoneLabel');
  }
  return t('taskManager.priorityLowLabel');
}

export function getTaskPriorityShortLabel(priority: TaskPriorityLevel, t: (key: string) => string): string {
  if (priority === 'high') {
    return t('taskManager.priorityHigh');
  }
  if (priority === 'medium') {
    return t('taskManager.priorityMedium');
  }
  return t('taskManager.priorityLow');
}

export function buildTaskPriorityOptions(t: (key: string) => string): TaskPriorityOption[] {
  return (['high', 'medium', 'low', 'none'] as TaskPriorityValue[]).map(priority => ({
    value: priority,
    label: getTaskPriorityLabel(priority, t),
    ...TASK_PRIORITY_STYLES[priority]
  }));
}

export function buildTaskPriorityShortOptions(t: (key: string) => string): TaskPriorityShortOption[] {
  return (['low', 'medium', 'high'] as TaskPriorityLevel[]).map(priority => ({
    value: priority,
    shortLabel: getTaskPriorityShortLabel(priority, t),
    label: getTaskPriorityLabel(priority, t),
    ...TASK_PRIORITY_STYLES[priority]
  }));
}
