export type Timestamp = number;
export type NodeId = string;

export interface CRDTField<T> {
  value: T;
  ts: Timestamp;
  node: NodeId;
}

export interface CRDTTask {
  id: string;
  title: CRDTField<string>;
  status: CRDTField<string>;
  priority: CRDTField<string>;
  dueDate: CRDTField<string | undefined>;
  startDate: CRDTField<string | undefined>;
  startTime: CRDTField<string | undefined>;
  dueTime: CRDTField<string | undefined>;
  description: CRDTField<string | undefined>;
  tags: CRDTField<string[]>;
  backgroundColor: CRDTField<string | undefined>;
  deleted: CRDTField<boolean>;
  updatedAt: Timestamp;
  metadata: {
    blockId?: string;
    rootId?: string;
    notebookId?: string;
    hPath?: string;
    type: 'block' | 'standalone';
    repeatSeriesId?: string;
    repeatFrequency?: string;
    repeatInstanceDate?: string;
    isVirtual?: boolean;
  };
}

export type TaskEvent =
  | {
      type: 'update_field';
      taskId: string;
      field: keyof Omit<CRDTTask, 'id' | 'updatedAt'>;
      value: any;
      ts: Timestamp;
      node: NodeId;
    }
  | {
      type: 'delete';
      taskId: string;
      ts: Timestamp;
      node: NodeId;
    }
  | {
      type: 'restore';
      taskId: string;
      ts: Timestamp;
      node: NodeId;
    };

function mergeField<T>(a: CRDTField<T>, b: CRDTField<T>): CRDTField<T> {
  if (a.ts > b.ts) return a;
  if (b.ts > a.ts) return b;
  return a.node >= b.node ? a : b;
}

export function mergeTask(a: CRDTTask, b: CRDTTask): CRDTTask {
  const metadata = {
    blockId: b.metadata.blockId || a.metadata.blockId,
    rootId: b.metadata.rootId || a.metadata.rootId,
    notebookId: b.metadata.notebookId || a.metadata.notebookId,
    hPath: b.metadata.hPath || a.metadata.hPath,
    type: b.metadata.blockId ? b.metadata.type : a.metadata.type,
    // repeat metadata must follow latest remote snapshot, including explicit clear (undefined)
    repeatSeriesId: b.metadata.repeatSeriesId,
    repeatFrequency: b.metadata.repeatFrequency,
    repeatInstanceDate: b.metadata.repeatInstanceDate,
    isVirtual: b.metadata.isVirtual
  };

  return {
    id: a.id,
    title: mergeField(a.title, b.title),
    status: mergeField(a.status, b.status),
    priority: mergeField(a.priority, b.priority),
    dueDate: mergeField(a.dueDate, b.dueDate),
    startDate: mergeField(a.startDate, b.startDate),
    startTime: mergeField(a.startTime || b.startTime, b.startTime || a.startTime),
    dueTime: mergeField(a.dueTime || b.dueTime, b.dueTime || a.dueTime),
    description: mergeField(a.description, b.description),
    tags: mergeField(a.tags, b.tags),
    backgroundColor: mergeField(a.backgroundColor || b.backgroundColor, b.backgroundColor || a.backgroundColor),
    deleted: mergeField(a.deleted, b.deleted),
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
    metadata
  };
}

export class TaskCRDTEngine {
  private store = new Map<string, CRDTTask>();
  private nodeId: NodeId;

  constructor(nodeId: NodeId) {
    this.nodeId = nodeId;
  }

  private createEmptyTask(id: string): CRDTTask {
    const base = this.baseField(undefined);

    return {
      id,
      title: this.baseField(''),
      status: this.baseField('pending'),
      priority: this.baseField('none'),
      dueDate: base,
      startDate: base,
      startTime: base,
      dueTime: base,
      description: base,
      tags: this.baseField([]),
      backgroundColor: base,
      deleted: this.baseField(false),
      updatedAt: Date.now(),
      metadata: {
        type: 'block'
      }
    };
  }

  private baseField<T>(value: T): CRDTField<T> {
    return {
      value,
      ts: 0,
      node: this.nodeId
    };
  }

  applyEvent(event: TaskEvent) {
    let task = this.store.get(event.taskId);

    if (!task) {
      task = this.createEmptyTask(event.taskId);
      this.store.set(event.taskId, task);
    }

    switch (event.type) {
      case 'update_field': {
        const currentField = task[event.field] as CRDTField<any>;

        const incoming: CRDTField<any> = {
          value: event.value,
          ts: event.ts,
          node: event.node
        };

        task[event.field] = mergeField(currentField, incoming);
        break;
      }

      case 'delete': {
        const incoming: CRDTField<boolean> = {
          value: true,
          ts: event.ts,
          node: event.node
        };

        task.deleted = mergeField(task.deleted, incoming);
        task.updatedAt = event.ts;
        return;
      }

      case 'restore': {
        const incoming: CRDTField<boolean> = {
          value: false,
          ts: event.ts,
          node: event.node
        };

        task.deleted = mergeField(task.deleted, incoming);
        task.updatedAt = event.ts;
        return;
      }
    }

    task.updatedAt = event.ts;
  }

  mergeRemote(remote: CRDTTask) {
    const local = this.store.get(remote.id);

    if (!local) {
      this.store.set(remote.id, remote);
      return;
    }

    const merged = mergeTask(local, remote);
    this.store.set(remote.id, merged);
  }

  getVisibleTasks(): CRDTTask[] {
    return [...this.store.values()].filter(
      t => t.deleted.value === false
    );
  }

  getAll(): CRDTTask[] {
    return [...this.store.values()];
  }

  getTask(id: string): CRDTTask | undefined {
    return this.store.get(id);
  }

  removeTask(id: string): void {
    this.store.delete(id);
  }

  createUpdateEvent(
    taskId: string,
    field: keyof Omit<CRDTTask, 'id' | 'updatedAt'>,
    value: any,
    ts: Timestamp = Date.now()
  ): TaskEvent {
    return {
      type: 'update_field',
      taskId,
      field,
      value,
      ts,
      node: this.nodeId
    };
  }

  createDeleteEvent(taskId: string, ts: Timestamp = Date.now()): TaskEvent {
    return {
      type: 'delete',
      taskId,
      ts,
      node: this.nodeId
    };
  }

  createRestoreEvent(taskId: string, ts: Timestamp = Date.now()): TaskEvent {
    return {
      type: 'restore',
      taskId,
      ts,
      node: this.nodeId
    };
  }

  applyLocalUpdate(taskId: string, field: keyof Omit<CRDTTask, 'id' | 'updatedAt'>, value: any, ts?: Timestamp) {
    const event = this.createUpdateEvent(taskId, field, value, ts);
    this.applyEvent(event);
    return event;
  }

  applyLocalDelete(taskId: string, ts?: Timestamp) {
    const event = this.createDeleteEvent(taskId, ts);
    this.applyEvent(event);
    return event;
  }

  applyLocalRestore(taskId: string, ts?: Timestamp) {
    const event = this.createRestoreEvent(taskId, ts);
    this.applyEvent(event);
    return event;
  }
}
