import { ref, computed } from 'vue';
import { CRDTTaskRepository } from './crdtAdapter';
import type { Task } from './api';

let globalCrdtRepo: CRDTTaskRepository | null = null;
const tasks = ref<Task[]>([]);

export function getCrdtRepository(): CRDTTaskRepository {
  if (!globalCrdtRepo) {
    globalCrdtRepo = new CRDTTaskRepository('local');
  }
  return globalCrdtRepo;
}

export function resetCrdtRepository(): void {
  globalCrdtRepo = null;
  tasks.value = [];
}

export function initCrdtRepository(nodeId: string = 'local'): CRDTTaskRepository {
  globalCrdtRepo = new CRDTTaskRepository(nodeId);
  return globalCrdtRepo;
}

export function useCrdtTasks() {
  const crdtRepo = getCrdtRepository();

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
