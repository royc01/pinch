import { TaskCRDTEngine, CRDTTask, CRDTField, TaskEvent } from './crdt';
import { Task } from './api';

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
    dueDate: baseField(task.dueDate, updatedAt),
    startDate: baseField(task.startDate, updatedAt),
    startTime: baseField(task.startTime, updatedAt),
    dueTime: baseField(task.dueTime, updatedAt),
    description: baseField(task.description, updatedAt),
    tags: baseField(task.tags || [], updatedAt),
    backgroundColor: baseField(task.backgroundColor, updatedAt),
    deleted: baseField(false, 0),
    updatedAt,
    metadata: {
      blockId: task.blockId,
      rootId: task.rootId,
      notebookId: task.notebookId,
      hPath: task.hPath,
      type: task.type,
      repeatSeriesId: task.repeatSeriesId,
      repeatFrequency: task.repeatFrequency,
      repeatInstanceDate: task.repeatInstanceDate,
      isVirtual: task.isVirtual
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
    dueDate: crdtTask.dueDate.value,
    startDate: crdtTask.startDate.value,
    startTime: crdtTask.startTime?.value,
    dueTime: crdtTask.dueTime?.value,
    description: crdtTask.description.value,
    tags: crdtTask.tags.value,
    backgroundColor: crdtTask.backgroundColor?.value,
    blockId: crdtTask.metadata.blockId,
    rootId: crdtTask.metadata.rootId,
    notebookId: crdtTask.metadata.notebookId,
    hPath: crdtTask.metadata.hPath,
    repeatSeriesId: crdtTask.metadata.repeatSeriesId,
    repeatFrequency: crdtTask.metadata.repeatFrequency as Task['repeatFrequency'],
    repeatInstanceDate: crdtTask.metadata.repeatInstanceDate,
    isVirtual: crdtTask.metadata.isVirtual,
    createdAt: new Date(crdtTask.updatedAt).toISOString(),
    updatedAt: new Date(crdtTask.updatedAt).toISOString()
  };
}

export class CRDTTaskRepository {
  private engine: TaskCRDTEngine;
  private nodeId: string;
  private subtasksMap: Map<string, Task['subtasks']> = new Map();

  constructor(nodeId: string = 'local') {
    this.nodeId = nodeId;
    this.engine = new TaskCRDTEngine(nodeId);
  }

  getEngine(): TaskCRDTEngine {
    return this.engine;
  }

  syncFromSQLTasks(tasks: Task[]): void {
    const incomingIds = new Set(tasks.map(task => task.id));
    const staleVirtualIds = this.engine
      .getAll()
      .filter(crdtTask => crdtTask.metadata.isVirtual && !incomingIds.has(crdtTask.id))
      .map(crdtTask => crdtTask.id);

    staleVirtualIds.forEach((taskId) => {
      this.engine.removeTask(taskId);
      this.subtasksMap.delete(taskId);
    });

    tasks.forEach(task => {
      if (task.subtasks && task.subtasks.length > 0) {
        this.subtasksMap.set(task.id, task.subtasks);
      }
      const crdtTask = taskToCRDT(task, 'db');
      this.engine.mergeRemote(crdtTask);
    });
  }

  syncIncrementalTasks(tasks: Task[]): void {
    tasks.forEach(task => {
      if (task.subtasks && task.subtasks.length > 0) {
        this.subtasksMap.set(task.id, task.subtasks);
      }
      const crdtTask = taskToCRDT(task, 'db');
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
    return this.engine.applyLocalUpdate(taskId, field, value, ts);
  }

  deleteTask(taskId: string, ts?: number): TaskEvent {
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
