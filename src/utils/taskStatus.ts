import { ref } from 'vue';

export const TASK_STATUS_VALUES = [
  'pending',
  'in-progress',
  'delayed',
  'completed',
  'cancelled'
] as const;

/** Built-in IDs remain stable so existing task attributes need no migration. */
export type DefaultTaskStatusValue = (typeof TASK_STATUS_VALUES)[number];
export type TaskStatusValue = DefaultTaskStatusValue | (string & {});

export interface TaskStatusDefinition {
  id: string;
  name?: string;
  color: string;
  /** Hides the status column in views grouped by status. */
  hidden?: boolean;
  /** Built-in definitions cannot be removed from the configuration UI. */
  builtIn?: boolean;
}

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

const TASK_STATUS_LABEL_KEYS: Record<DefaultTaskStatusValue, string> = {
  pending: 'taskManager.statusPending',
  'in-progress': 'taskManager.statusInProgress',
  delayed: 'taskManager.statusDelayed',
  completed: 'taskManager.statusCompleted',
  cancelled: 'taskManager.statusCancelled'
};

const DEFAULT_TASK_STATUSES: readonly TaskStatusDefinition[] = [
  { id: 'pending', color: '#f59e0b', builtIn: true },
  { id: 'in-progress', color: '#3b82f6', builtIn: true },
  { id: 'delayed', color: '#f97316', builtIn: true },
  { id: 'completed', color: '#10b981', builtIn: true },
  { id: 'cancelled', color: '#9ca3af', builtIn: true }
];

const configuredStatuses = ref<TaskStatusDefinition[]>([...DEFAULT_TASK_STATUSES]);

function normalizeColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && (/^#[0-9a-fA-F]{6}$/.test(value.trim()) || /^pinch-background(?:[1-9]|10)$/.test(value.trim()))
    ? value.trim()
    : fallback;
}

export function resolveTaskStatusColor(value: string | undefined): string {
  const color = typeof value === 'string' ? value.trim() : '';
  return /^pinch-background(?:[1-9]|10)$/.test(color) ? `var(--${color})` : (color || '#6366f1');
}

/** Validates persisted settings and restores missing built-ins. */
export function normalizeTaskStatusDefinitions(input: unknown): TaskStatusDefinition[] {
  const rawItems = Array.isArray(input) ? input : [];
  const normalized: TaskStatusDefinition[] = [];
  const seen = new Set<string>();
  for (const item of rawItems) {
    if (!item || typeof item !== 'object') continue;
    const raw = item as Record<string, unknown>;
    const id = typeof raw.id === 'string' ? raw.id.trim() : '';
    if (!/^[a-z][a-z0-9-]{0,39}$/.test(id) || seen.has(id)) continue;
    const builtIn = DEFAULT_TASK_STATUSES.find(status => status.id === id);
    // Built-in definitions are immutable, but their location in the array is
    // intentionally retained so users can sort every status together.
    normalized.push(builtIn ? { ...builtIn, hidden: raw.hidden === true } : {
      id,
      name: typeof raw.name === 'string' ? raw.name.trim().slice(0, 40) || undefined : undefined,
      color: normalizeColor(raw.color, 'pinch-background1'),
      hidden: raw.hidden === true,
      builtIn: false
    });
    seen.add(id);
  }

  for (const defaultStatus of DEFAULT_TASK_STATUSES) {
    if (!seen.has(defaultStatus.id)) {
      normalized.push({ ...defaultStatus });
    }
  }
  return normalized;
}

export function getDefaultTaskStatusDefinitions(): TaskStatusDefinition[] {
  return DEFAULT_TASK_STATUSES.map(status => ({ ...status }));
}

/** Updates the shared registry after user settings load or save. */
export function configureTaskStatuses(definitions: unknown): void {
  configuredStatuses.value = normalizeTaskStatusDefinitions(definitions);
}

export function getTaskStatusDefinitions(): TaskStatusDefinition[] {
  return configuredStatuses.value;
}

export function isClosedTaskStatus(status: string | undefined): boolean {
  // Custom states are always active/to-do states. Only the built-in terminal
  // markers may complete a task and turn its list-item checkbox on.
  return status === 'completed' || status === 'cancelled';
}

export function isKnownTaskStatus(status: string | undefined): boolean {
  return configuredStatuses.value.some(item => item.id === status);
}

export function getTaskStatusLabel(
  status: TaskStatusValue | string | undefined,
  t: (key: string) => string
): string {
  if (typeof status !== 'string') return '';
  const definition = configuredStatuses.value.find(item => item.id === status);
  if (definition?.name) return definition.name;
  if (status in TASK_STATUS_LABEL_KEYS) return t(TASK_STATUS_LABEL_KEYS[status as DefaultTaskStatusValue]);
  return status;
}

export function buildTaskStatusFilterOptions(t: (key: string) => string): TaskStatusOption[] {
  return configuredStatuses.value.map(value => ({ value: value.id, label: getTaskStatusLabel(value.id, t) }));
}

export function buildTaskStatusSelectOptions(t: (key: string) => string): TaskStatusSelectOption[] {
  return [
    { value: '', text: t('taskManager.statusNoChange') },
    ...buildTaskStatusFilterOptions(t).map(value => ({ value: value.value, text: value.label }))
  ];
}

export function buildTaskStatusPopoverOptions(t: (key: string) => string): TaskStatusPopoverOption[] {
  return configuredStatuses.value.map(value => ({
    value: value.id,
    label: getTaskStatusLabel(value.id, t),
    color: resolveTaskStatusColor(value.color),
    background: `color-mix(in srgb, ${resolveTaskStatusColor(value.color)} 14%, transparent)`
  }));
}
