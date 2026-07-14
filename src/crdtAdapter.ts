import { TaskCRDTEngine, CRDTTask, CRDTField, TaskEvent } from './crdt';
import type { Task } from './api';

export function taskToCRDT(task: Task, nodeId: string = 'db'): CRDTTask {
  const parseTimestamp = (dateStr?: string): number => {
    if (!dateStr) return 0;
    return new Date(dateStr).getTime();
  };

  const baseField = <T>(value: T, ts: number): CRDTField<T> => ({
    value,
    ts,
    node: nodeId
  });

  const updatedAt = parseTimestamp(task.updatedAt);

  return {
    id: task.id,
    title: baseField(task.title || '', updatedAt),
    status: baseField(task.status || 'pending', updatedAt),
    priority: baseField(task.priority || 'none', updatedAt),
    pinned: baseField(task.pinned === true, updatedAt),
    dueDate: baseField(task.dueDate, updatedAt),
    startDate: baseField(task.startDate, updatedAt),
    startTime: baseField(task.startTime, updatedAt),
    dueTime: baseField(task.dueTime, updatedAt),
    description: baseField(task.description, updatedAt),
    reminderType: baseField(task.reminderType, updatedAt),
    reminderCustomTime: baseField(task.reminderCustomTime, updatedAt),
    tags: baseField(task.tags || [], updatedAt),
    groupId: baseField(task.groupId, updatedAt),
    backgroundColor: baseField(task.backgroundColor, updatedAt),
    focusEstimate: baseField(task.focusEstimate, updatedAt),
    archived: baseField(task.archived === true, updatedAt),
    completedAt: baseField(task.completedAt, updatedAt),
    archivedAt: baseField(task.archivedAt, updatedAt),
    archiveReason: baseField(task.archiveReason, updatedAt),
    deleted: baseField(false, 0),
    updatedAt,
    metadata: {
      blockId: task.blockId,
      blockSort: task.blockSort,
      documentOrder: task.documentOrder,
      rootId: task.rootId,
      notebookId: task.notebookId,
      hPath: task.hPath,
      type: task.type,
      repeatSeriesId: task.repeatSeriesId,
      repeatFrequency: task.repeatFrequency,
      repeatInstanceDate: task.repeatInstanceDate,
      isVirtual: task.isVirtual,
      focusEstimate: task.focusEstimate,
      createdAt: task.createdAt
    }
  };
}

export function crdtToTask(crdtTask: CRDTTask): Task {
  return {
    id: crdtTask.id,
    type: crdtTask.metadata.type,
    title: crdtTask.title.value,
    status: crdtTask.status.value as any,
    priority: crdtTask.priority.value as any,
    pinned: crdtTask.pinned?.value === true,
    dueDate: crdtTask.dueDate.value,
    startDate: crdtTask.startDate.value,
    startTime: crdtTask.startTime?.value,
    dueTime: crdtTask.dueTime?.value,
    description: crdtTask.description.value,
    reminderType: crdtTask.reminderType?.value as Task['reminderType'],
    reminderCustomTime: crdtTask.reminderCustomTime?.value,
    tags: crdtTask.tags.value,
    groupId: crdtTask.groupId?.value,
    backgroundColor: crdtTask.backgroundColor?.value,
    archived: crdtTask.archived?.value === true,
    completedAt: crdtTask.completedAt?.value,
    archivedAt: crdtTask.archivedAt?.value,
    archiveReason: crdtTask.archiveReason?.value as Task['archiveReason'],
    blockId: crdtTask.metadata.blockId,
    blockSort: crdtTask.metadata.blockSort,
    documentOrder: crdtTask.metadata.documentOrder,
    rootId: crdtTask.metadata.rootId,
    notebookId: crdtTask.metadata.notebookId,
    hPath: crdtTask.metadata.hPath,
    repeatSeriesId: crdtTask.metadata.repeatSeriesId,
    repeatFrequency: crdtTask.metadata.repeatFrequency as Task['repeatFrequency'],
    repeatInstanceDate: crdtTask.metadata.repeatInstanceDate,
    isVirtual: crdtTask.metadata.isVirtual,
    focusEstimate: crdtTask.focusEstimate?.value,
    createdAt: crdtTask.metadata.createdAt || new Date(crdtTask.updatedAt).toISOString(),
    updatedAt: new Date(crdtTask.updatedAt).toISOString()
  };
}

export class CRDTTaskRepository {
  private engine: TaskCRDTEngine;
  private nodeId: string;
  private subtasksMap: Map<string, Task['subtasks']> = new Map();
  private pendingLocalFields: Map<string, Map<string, { value: any; expiresAt: number }>> = new Map();

  constructor(nodeId: string = 'local') {
    this.nodeId = nodeId;
    this.engine = new TaskCRDTEngine(nodeId);
  }

  getEngine(): TaskCRDTEngine {
    return this.engine;
  }

  private ensureRemoteTaskTs(crdtTask: CRDTTask): CRDTTask {
    const existing = this.engine.getTask(crdtTask.id);
    const guardedTask = this.applyPendingLocalFields(crdtTask, existing);
    if (!existing || crdtTask.updatedAt > existing.updatedAt) {
      return guardedTask;
    }

    const nextTs = existing.updatedAt + 1;
    const withTs = <T>(field: CRDTField<T>): CRDTField<T> => ({
      ...field,
      ts: nextTs
    });

    return {
      ...guardedTask,
      title: withTs(guardedTask.title),
      status: withTs(guardedTask.status),
      priority: withTs(guardedTask.priority),
      pinned: withTs(guardedTask.pinned),
      dueDate: withTs(guardedTask.dueDate),
      startDate: withTs(guardedTask.startDate),
      startTime: withTs(guardedTask.startTime),
      dueTime: withTs(guardedTask.dueTime),
      description: withTs(guardedTask.description),
      reminderType: withTs(guardedTask.reminderType),
      reminderCustomTime: withTs(guardedTask.reminderCustomTime),
      tags: withTs(guardedTask.tags),
      groupId: withTs(guardedTask.groupId),
      backgroundColor: withTs(guardedTask.backgroundColor),
      focusEstimate: withTs(guardedTask.focusEstimate),
      archived: withTs(guardedTask.archived),
      completedAt: withTs(guardedTask.completedAt),
      archivedAt: withTs(guardedTask.archivedAt),
      archiveReason: withTs(guardedTask.archiveReason),
      updatedAt: nextTs
    };
  }

  private arePendingValuesEqual(left: any, right: any): boolean {
    if (Object.is(left, right)) {
      return true;
    }
    if (Array.isArray(left) && Array.isArray(right)) {
      return left.length === right.length && left.every((item, index) => Object.is(item, right[index]));
    }
    return false;
  }

  private rememberPendingLocalField(
    taskId: string,
    field: keyof Omit<CRDTTask, 'id' | 'updatedAt'>,
    value: any
  ): void {
    if (field === 'metadata' || field === 'deleted') {
      return;
    }
    const fields = this.pendingLocalFields.get(taskId) || new Map<string, { value: any; expiresAt: number }>();
    fields.set(String(field), {
      value,
      expiresAt: Date.now() + 5000
    });
    this.pendingLocalFields.set(taskId, fields);
  }

  private applyPendingLocalFields(crdtTask: CRDTTask, existing?: CRDTTask): CRDTTask {
    const fields = this.pendingLocalFields.get(crdtTask.id);
    if (!fields || fields.size === 0) {
      return crdtTask;
    }

    let guardedTask = crdtTask;
    const now = Date.now();
    fields.forEach((pending, field) => {
      const remoteField = (guardedTask as any)[field] as CRDTField<any> | undefined;
      if (!remoteField || pending.expiresAt <= now) {
        fields.delete(field);
        return;
      }
      if (this.arePendingValuesEqual(remoteField.value, pending.value)) {
        fields.delete(field);
        return;
      }

      const existingField = existing ? ((existing as any)[field] as CRDTField<any> | undefined) : undefined;
      guardedTask = {
        ...guardedTask,
        [field]: existingField || {
          value: pending.value,
          ts: guardedTask.updatedAt,
          node: this.nodeId
        }
      };
    });

    if (fields.size === 0) {
      this.pendingLocalFields.delete(crdtTask.id);
    }
    return guardedTask;
  }

  syncFromSQLTasks(tasks: Task[]): void {
    const incomingIds = new Set(tasks.map(task => task.id));
    const staleTaskIds = this.engine
      .getAll()
      .filter(crdtTask => !incomingIds.has(crdtTask.id))
      .map(crdtTask => crdtTask.id);

    staleTaskIds.forEach((taskId) => {
      this.engine.removeTask(taskId);
      this.subtasksMap.delete(taskId);
    });

    tasks.forEach(task => {
      if (task.subtasks && task.subtasks.length > 0) {
        this.subtasksMap.set(task.id, task.subtasks);
      } else {
        this.subtasksMap.delete(task.id);
      }
      const existing = this.engine.getTask(task.id);
      if (existing?.deleted.value === true) {
        // SQL still returns this task, so local tombstone should not hide it.
        this.engine.removeTask(task.id);
      }
      const crdtTask = this.ensureRemoteTaskTs(taskToCRDT(task, 'db'));
      this.engine.mergeRemote(crdtTask);
    });
  }

  syncIncrementalTasks(tasks: Task[]): void {
    tasks.forEach(task => {
      if (task.subtasks && task.subtasks.length > 0) {
        this.subtasksMap.set(task.id, task.subtasks);
      } else {
        this.subtasksMap.delete(task.id);
      }
      const existing = this.engine.getTask(task.id);
      if (existing?.deleted.value === true) {
        this.engine.removeTask(task.id);
      }
      const crdtTask = this.ensureRemoteTaskTs(taskToCRDT(task, 'db'));
      this.engine.mergeRemote(crdtTask);
    });
  }

  getTasks(): Task[] {
    const crdtTasks = this.engine.getVisibleTasks();
    return crdtTasks.map(crdtTask => {
      const task = crdtToTask(crdtTask);
      const subtasks = this.subtasksMap.get(task.id);
      if (subtasks) {
        task.subtasks = subtasks;
      }
      return task;
    });
  }

  updateTaskField(
    taskId: string,
    field: keyof Omit<CRDTTask, 'id' | 'updatedAt'>,
    value: any,
    ts?: number
  ): TaskEvent {
    this.rememberPendingLocalField(taskId, field, value);
    return this.engine.applyLocalUpdate(taskId, field, value, ts);
  }

  deleteTask(taskId: string, ts?: number): TaskEvent {
    this.subtasksMap.delete(taskId);
    return this.engine.applyLocalDelete(taskId, ts);
  }

  restoreTask(taskId: string, ts?: number): TaskEvent {
    return this.engine.applyLocalRestore(taskId, ts);
  }

  applyRemoteEvent(event: TaskEvent): void {
    this.engine.applyEvent(event);
  }

  getTask(id: string): Task | undefined {
    const crdtTask = this.engine.getTask(id);
    return crdtTask ? crdtToTask(crdtTask) : undefined;
  }

  getCRDTTask(id: string): CRDTTask | undefined {
    return this.engine.getTask(id);
  }

  getAllCRDTTasks(): CRDTTask[] {
    return this.engine.getAll();
  }

  mergeRemoteCRDTTask(crdtTask: CRDTTask): void {
    this.engine.mergeRemote(crdtTask);
  }
}
