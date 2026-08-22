import { ref, type Ref } from 'vue';
import { CRDTTaskRepository } from './crdtAdapter';
import type { Task } from './api';
import { buildTaskTagState, parseTaskTagIdsAttribute } from './utils/taskTags';
import { normalizeTaskReminderType } from './utils/taskReminder';

interface StoreState {
  repo: CRDTTaskRepository;
  tasks: Ref<Task[]>;
}

const stores = new Map<string, StoreState>();

function hasTaskAttribute(attrs: Record<string, string>, name: string): boolean {
  return Object.prototype.hasOwnProperty.call(attrs, name);
}

function normalizeTaskPriorityAttribute(value: string): Task['priority'] {
  if (value === 'high' || value === 'medium' || value === 'low' || value === 'none') {
    return value;
  }
  return 'none';
}

function normalizeTaskStatusAttribute(value: string): Task['status'] {
  if (value === 'pending' || value === 'in-progress' || value === 'delayed' || value === 'completed' || value === 'cancelled') {
    return value;
  }
  return 'pending';
}

function parseTaskBooleanAttribute(value: string): boolean {
  return value
    .split(',')
    .map(token => token.trim().toLowerCase())
    .some(token => token === '1' || token === 'true' || token === 'yes');
}

function parseTaskFocusEstimateAttribute(value: string): Task['focusEstimate'] {
  if (!value.trim()) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(value);
    const amount = Number(parsed?.value);
    if ((parsed?.unit === 'minutes' || parsed?.unit === 'pomodoros') && Number.isFinite(amount) && amount > 0) {
      return { unit: parsed.unit, value: Math.min(9999, Math.round(amount)) };
    }
  } catch {
    // Ignore malformed focus-estimate attributes.
  }
  return undefined;
}

function getDefaultNodeId(storeId: string): string {
  return storeId === 'global' ? 'local' : storeId;
}

function ensureStore(storeId: string, nodeId?: string): StoreState {
  const existing = stores.get(storeId);
  if (existing) {
    return existing;
  }

  const created: StoreState = {
    repo: new CRDTTaskRepository(nodeId || getDefaultNodeId(storeId)),
    tasks: ref<Task[]>([])
  };
  stores.set(storeId, created);
  return created;
}

export function getCrdtRepository(storeId: string = 'global'): CRDTTaskRepository {
  return ensureStore(storeId).repo;
}

export function applyTaskAttributeChanges(
  blockId: string,
  attrs: Record<string, string>,
  storeId?: string
): boolean {
  const normalizedBlockId = typeof blockId === 'string' ? blockId.trim() : '';
  if (!normalizedBlockId) {
    return false;
  }

  const hasPriority = hasTaskAttribute(attrs, 'custom-task-priority');
  const hasStatus = hasTaskAttribute(attrs, 'custom-task-status');
  const hasCompletedAt = hasTaskAttribute(attrs, 'custom-task-completed-at');
  const hasTags = hasTaskAttribute(attrs, 'custom-task-tags');
  const hasGroup = hasTaskAttribute(attrs, 'custom-task-group');
  const hasPinned = hasTaskAttribute(attrs, 'custom-task-pinned');
  const hasDescription = hasTaskAttribute(attrs, 'custom-task-description');
  const hasStartDate = hasTaskAttribute(attrs, 'custom-task-start-date');
  const hasStartTime = hasTaskAttribute(attrs, 'custom-task-start-time');
  const hasDueDate = hasTaskAttribute(attrs, 'custom-task-due-date');
  const hasDueTime = hasTaskAttribute(attrs, 'custom-task-due-time');
  const hasReminderType = hasTaskAttribute(attrs, 'custom-task-reminder-type');
  const hasReminderCustomTime = hasTaskAttribute(attrs, 'custom-task-reminder-custom-time');
  const hasBackgroundColor = hasTaskAttribute(attrs, 'custom-task-background-color');
  const hasUrgent = hasTaskAttribute(attrs, 'custom-task-urgent');
  const hasFocusEstimate = hasTaskAttribute(attrs, 'custom-task-focus-estimate');
  if (!(
    hasPriority || hasStatus || hasCompletedAt || hasTags || hasGroup || hasPinned || hasDescription
    || hasStartDate || hasStartTime || hasDueDate || hasDueTime
    || hasReminderType || hasReminderCustomTime || hasBackgroundColor || hasUrgent || hasFocusEstimate
  )) {
    return false;
  }

  const now = Date.now();
  const targetStates = typeof storeId === 'string' && storeId.length > 0
    ? [ensureStore(storeId)]
    : Array.from(stores.values());
  let applied = false;

  targetStates.forEach((state) => {
    const targetTasks = state.repo.getTasks().filter(task => task.blockId === normalizedBlockId);
    if (targetTasks.length === 0) {
      return;
    }

    const updateField = (taskId: string, field: string, value: unknown): void => {
      state.repo.updateTaskField(taskId, field as any, value, now);
    };

    targetTasks.forEach((task) => {
      if (hasPriority) {
        updateField(task.id, 'priority', normalizeTaskPriorityAttribute(attrs['custom-task-priority'] || ''));
      }
      if (hasStatus) {
        updateField(task.id, 'status', normalizeTaskStatusAttribute(attrs['custom-task-status'] || ''));
      }
      if (hasCompletedAt) {
        updateField(task.id, 'completedAt', attrs['custom-task-completed-at'] || undefined);
      }
      if (hasTags || hasGroup) {
        const tagIds = hasTags
          ? parseTaskTagIdsAttribute(attrs['custom-task-tags'] || '')
          : task.tags;
        const groupId = hasGroup ? attrs['custom-task-group'] : task.groupId;
        const tagState = buildTaskTagState(tagIds, groupId);
        updateField(task.id, 'tags', [...tagState.tagIds]);
        updateField(task.id, 'groupId', tagState.primaryTagId || undefined);
      }
      if (hasPinned) {
        updateField(task.id, 'pinned', parseTaskBooleanAttribute(attrs['custom-task-pinned'] || ''));
      }
      if (hasDescription) {
        updateField(task.id, 'description', attrs['custom-task-description'] || '');
      }
      if (hasStartDate) {
        updateField(task.id, 'startDate', attrs['custom-task-start-date'] || '');
      }
      if (hasStartTime) {
        updateField(task.id, 'startTime', attrs['custom-task-start-time'] || undefined);
      }
      if (hasDueDate) {
        updateField(task.id, 'dueDate', attrs['custom-task-due-date'] || '');
      }
      if (hasDueTime) {
        updateField(task.id, 'dueTime', attrs['custom-task-due-time'] || undefined);
      }
      if (hasReminderType) {
        updateField(task.id, 'reminderType', attrs['custom-task-reminder-type'] || undefined);
      }
      if (hasReminderCustomTime) {
        updateField(task.id, 'reminderCustomTime', attrs['custom-task-reminder-custom-time'] || undefined);
      }
      if (hasBackgroundColor) {
        updateField(task.id, 'backgroundColor', attrs['custom-task-background-color'] || undefined);
      }
      if (hasUrgent) {
        updateField(task.id, 'urgent', parseTaskBooleanAttribute(attrs['custom-task-urgent'] || ''));
      }
      if (hasFocusEstimate) {
        updateField(task.id, 'focusEstimate', parseTaskFocusEstimateAttribute(attrs['custom-task-focus-estimate'] || ''));
      }
    });

    // Subtasks are stored as part of their top-level task's tree rather than
    // independent CRDT records. Apply the same optimistic attribute patch to
    // that tree so views do not briefly render a stale (or metadata-less)
    // child while the parent incremental query is settling.
    const patchNestedSubtasks = (subtasks: Task['subtasks'] | undefined): boolean => {
      if (!Array.isArray(subtasks)) return false;
      let changed = false;
      for (const subtask of subtasks) {
        if (subtask.blockId === normalizedBlockId || subtask.nodeId === normalizedBlockId) {
          if (hasPriority) subtask.priority = normalizeTaskPriorityAttribute(attrs['custom-task-priority'] || '');
          if (hasStatus) subtask.status = normalizeTaskStatusAttribute(attrs['custom-task-status'] || '');
          if (hasCompletedAt) subtask.completedAt = attrs['custom-task-completed-at'] || undefined;
          if (hasTags || hasGroup) {
            const tagIds = hasTags ? parseTaskTagIdsAttribute(attrs['custom-task-tags'] || '') : (subtask.tags || []);
            const tagState = buildTaskTagState(tagIds, hasGroup ? attrs['custom-task-group'] : subtask.groupId);
            subtask.tags = [...tagState.tagIds];
            subtask.groupId = tagState.primaryTagId || undefined;
          }
          if (hasPinned) subtask.pinned = parseTaskBooleanAttribute(attrs['custom-task-pinned'] || '');
          if (hasDescription) subtask.description = attrs['custom-task-description'] || '';
          if (hasStartDate) subtask.startDate = attrs['custom-task-start-date'] || '';
          if (hasStartTime) subtask.startTime = attrs['custom-task-start-time'] || undefined;
          if (hasDueDate) subtask.dueDate = attrs['custom-task-due-date'] || '';
          if (hasDueTime) subtask.dueTime = attrs['custom-task-due-time'] || undefined;
          if (hasReminderType) subtask.reminderType = normalizeTaskReminderType(attrs['custom-task-reminder-type']);
          if (hasReminderCustomTime) subtask.reminderCustomTime = attrs['custom-task-reminder-custom-time'] || undefined;
          if (hasBackgroundColor) subtask.backgroundColor = attrs['custom-task-background-color'] || undefined;
          if (hasUrgent) subtask.urgent = parseTaskBooleanAttribute(attrs['custom-task-urgent'] || '');
          if (hasFocusEstimate) subtask.focusEstimate = parseTaskFocusEstimateAttribute(attrs['custom-task-focus-estimate'] || '');
          changed = true;
        }
        if (patchNestedSubtasks(subtask.subtasks)) changed = true;
      }
      return changed;
    };
    const parentTasksWithPatchedSubtasks = state.repo.getTasks().filter(task => patchNestedSubtasks(task.subtasks));
    if (parentTasksWithPatchedSubtasks.length > 0) {
      state.repo.syncIncrementalTasks(parentTasksWithPatchedSubtasks);
      applied = true;
    }

    state.tasks.value = state.repo.getTasks();
    applied = true;
  });

  return applied;
}

export function resetCrdtRepository(storeId?: string): void {
  if (typeof storeId === 'string' && storeId.length > 0) {
    stores.delete(storeId);
    return;
  }
  stores.clear();
}

export function initCrdtRepository(nodeId: string = 'local', storeId: string = 'global'): CRDTTaskRepository {
  const created: StoreState = {
    repo: new CRDTTaskRepository(nodeId),
    tasks: ref<Task[]>([])
  };
  stores.set(storeId, created);
  return created.repo;
}

export function useCrdtTasks(storeId: string = 'global') {
  const state = ensureStore(storeId);
  const crdtRepo = state.repo;
  const tasks = state.tasks;

  const updateTasks = () => {
    tasks.value = crdtRepo.getTasks();
  };

  const syncFromSQL = (sqlTasks: Task[]) => {
    crdtRepo.syncFromSQLTasks(sqlTasks);
    updateTasks();
  };

  const updateTask = (
    taskId: string,
    field: string,
    value: any,
    ts?: number
  ) => {
    crdtRepo.updateTaskField(taskId, field as any, value, ts);
    updateTasks();
  };

  const deleteTask = (taskId: string, ts?: number) => {
    crdtRepo.deleteTask(taskId, ts);
    updateTasks();
  };

  const restoreTask = (taskId: string, ts?: number) => {
    crdtRepo.restoreTask(taskId, ts);
    updateTasks();
  };

  return {
    tasks,
    crdtRepo,
    updateTasks,
    syncFromSQL,
    updateTask,
    deleteTask,
    restoreTask
  };
}
