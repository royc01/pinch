import { ref, type Ref } from 'vue';
import { CRDTTaskRepository } from './crdtAdapter';
import type { Task } from './api';

interface StoreState {
  repo: CRDTTaskRepository;
  tasks: Ref<Task[]>;
}

const stores = new Map<string, StoreState>();

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
