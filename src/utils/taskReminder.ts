import { translate } from '@/composables/useI18n';

export type TaskReminderType = 'due' | '5m' | '30m' | '60m' | '1d' | 'custom';

export interface TaskReminderSelection {
  reminderType?: TaskReminderType;
  reminderCustomTime?: string;
}

export interface NormalizedTaskReminderSelection {
  reminderType?: TaskReminderType;
  reminderCustomTime: string;
  reminderCustomTimeValue?: string;
}

export interface TaskReminderPresetOption {
  value: TaskReminderType;
  label: string;
  shortLabel: string;
}

export interface TaskReminderAware {
  dueDate?: string;
  dueTime?: string;
  reminderType?: string;
  reminderCustomTime?: string;
}

type TaskReminderSelectionLike = {
  reminderType?: string | null;
  reminderCustomTime?: string | null;
};

const TASK_REMINDER_TYPE_SET = new Set<TaskReminderType>(['due', '5m', '30m', '60m', '1d', 'custom']);
export const DEFAULT_TASK_REMINDER_DUE_TIME = '09:00';

export const TASK_REMINDER_PRESET_OPTIONS: TaskReminderPresetOption[] = [
  { value: 'due', label: translate('taskReminder.due'), shortLabel: translate('taskReminder.dueShort') },
  { value: '5m', label: translate('taskReminder.before5m'), shortLabel: translate('taskReminder.before5mShort') },
  { value: '30m', label: translate('taskReminder.before30m'), shortLabel: translate('taskReminder.before30mShort') },
  { value: '60m', label: translate('taskReminder.before60m'), shortLabel: translate('taskReminder.before60mShort') },
  { value: '1d', label: translate('taskReminder.before1d'), shortLabel: translate('taskReminder.before1dShort') },
];

export function normalizeTaskReminderType(value?: string | null): TaskReminderType | undefined {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized || !TASK_REMINDER_TYPE_SET.has(normalized as TaskReminderType)) {
    return undefined;
  }
  return normalized as TaskReminderType;
}

export function normalizeTaskReminderCustomTime(value?: string | null): string | undefined {
  const normalized = typeof value === 'string'
    ? value.trim().replace(' ', 'T')
    : '';

  if (!normalized) {
    return undefined;
  }

  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/);
  if (!match) {
    return undefined;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}`;
}

export function normalizeTaskReminderSelection(
  value?: TaskReminderSelectionLike | null
): NormalizedTaskReminderSelection {
  const reminderType = normalizeTaskReminderType(value?.reminderType);
  const reminderCustomTime = reminderType === 'custom'
    ? (normalizeTaskReminderCustomTime(value?.reminderCustomTime) || '')
    : '';

  return {
    reminderType,
    reminderCustomTime,
    reminderCustomTimeValue: reminderCustomTime || undefined
  };
}

export function buildTaskReminderAttrs(value: NormalizedTaskReminderSelection): Record<string, string> {
  return {
    'custom-task-reminder-type': value.reminderType || '',
    'custom-task-reminder-custom-time': value.reminderCustomTime || ''
  };
}

export function isSameTaskReminderSelection(
  a?: TaskReminderSelectionLike | null,
  b?: TaskReminderSelectionLike | null
): boolean {
  const normalizedA = normalizeTaskReminderSelection(a);
  const normalizedB = normalizeTaskReminderSelection(b);

  return normalizedA.reminderType === normalizedB.reminderType
    && normalizedA.reminderCustomTime === normalizedB.reminderCustomTime;
}

export function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function formatReminderDateTime(value?: string): string {
  const normalized = normalizeTaskReminderCustomTime(value);
  if (!normalized) {
    return '';
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
}

export function getTaskReminderDefaultCustomTime(dueDate?: string, dueTime?: string): string {
  const baseTimestamp = getTaskReminderBaseTimestamp(dueDate, dueTime);
  if (baseTimestamp !== null) {
    return formatDateTimeLocal(new Date(baseTimestamp));
  }

  return formatDateTimeLocal(new Date(Date.now() + 30 * 60 * 1000));
}

export function getTaskReminderBaseTimestamp(dueDate?: string, dueTime?: string): number | null {
  const normalizedDate = typeof dueDate === 'string' ? dueDate.trim() : '';
  if (!normalizedDate) {
    return null;
  }

  const normalizedTime = normalizeClockTime(dueTime) || DEFAULT_TASK_REMINDER_DUE_TIME;
  return parseLocalDateTime(`${normalizedDate}T${normalizedTime}`);
}

export function parseLocalDateTime(value?: string): number | null {
  const normalized = normalizeTaskReminderCustomTime(value);
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.getTime();
}

export function computeTaskReminderTimestamp(task: TaskReminderAware): number | null {
  const reminderType = normalizeTaskReminderType(task.reminderType);
  if (!reminderType) {
    return null;
  }

  if (reminderType === 'custom') {
    return parseLocalDateTime(task.reminderCustomTime);
  }

  const baseTimestamp = getTaskReminderBaseTimestamp(task.dueDate, task.dueTime);
  if (baseTimestamp === null) {
    return null;
  }

  switch (reminderType) {
    case 'due':
      return baseTimestamp;
    case '5m':
      return baseTimestamp - 5 * 60 * 1000;
    case '30m':
      return baseTimestamp - 30 * 60 * 1000;
    case '60m':
      return baseTimestamp - 60 * 60 * 1000;
    case '1d':
      return baseTimestamp - 24 * 60 * 60 * 1000;
    default:
      return null;
  }
}

export function getTaskReminderLabel(reminderType?: string, reminderCustomTime?: string): string {
  const normalizedType = normalizeTaskReminderType(reminderType);
  if (!normalizedType) {
    return '';
  }

  if (normalizedType === 'custom') {
    return formatReminderDateTime(reminderCustomTime) || translate('taskManager.custom');
  }

  return TASK_REMINDER_PRESET_OPTIONS.find(option => option.value === normalizedType)?.shortLabel || '';
}

export function getTaskReminderLongLabel(reminderType?: string, reminderCustomTime?: string): string {
  const normalizedType = normalizeTaskReminderType(reminderType);
  if (!normalizedType) {
    return '';
  }

  if (normalizedType === 'custom') {
    return formatReminderDateTime(reminderCustomTime) || translate('taskManager.customReminder');
  }

  return TASK_REMINDER_PRESET_OPTIONS.find(option => option.value === normalizedType)?.label || '';
}

function normalizeClockTime(value?: string): string | undefined {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) {
    return undefined;
  }

  const match = normalized.match(/^(\d{2}):(\d{2})/);
  if (!match) {
    return undefined;
  }

  return `${match[1]}:${match[2]}`;
}
