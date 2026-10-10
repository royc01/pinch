import type { Task } from '@/api';
import { eventBus, Events } from './eventBus';

let snapshot: Task[] = [];
let indexById = new Map<string, number>();

function cloneTasks(tasks: Task[]): Task[] {
  return tasks.map(task => ({ ...task }));
}

export function getLifelogTaskSnapshot(): Task[] {
  return cloneTasks(snapshot);
}

export function publishLifelogTaskSnapshot(tasks: Task[]): void {
  snapshot = cloneTasks(tasks);
  indexById = new Map(snapshot.map((task, index) => [task.id, index]));
  eventBus.emit(Events.LIFELOG_TASKS_UPDATED, { tasks: getLifelogTaskSnapshot() });
}

export function publishLifelogTaskChanges(tasks: Task[]): void {
  let changed = false;
  for (const task of tasks) {
    const index = indexById.get(task.id);
    if (index === undefined) continue;
    snapshot[index] = { ...task };
    changed = true;
  }
  if (changed) eventBus.emit(Events.LIFELOG_TASKS_UPDATED, { tasks: getLifelogTaskSnapshot() });
}

export function patchLifelogTaskSnapshotByBlockId(
  blockId: string,
  completed: boolean,
  completedAt?: string
): boolean {
  let changed = false;
  snapshot = snapshot.map((task) => {
    if (task.blockId !== blockId) {
      return task;
    }
    changed = true;
    return {
      ...task,
      status: completed ? 'completed' : 'pending',
      completedAt: completed ? completedAt : undefined
    };
  });

  if (changed) {
    eventBus.emit(Events.LIFELOG_TASKS_UPDATED, { tasks: getLifelogTaskSnapshot() });
  }
  return changed;
}
