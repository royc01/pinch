import type { Task } from '@/api';
import { eventBus, Events } from './eventBus';

let snapshot: Task[] = [];

function cloneTasks(tasks: Task[]): Task[] {
  return tasks.map(task => ({ ...task }));
}

export function getLifelogTaskSnapshot(): Task[] {
  return cloneTasks(snapshot);
}

export function publishLifelogTaskSnapshot(tasks: Task[]): void {
  snapshot = cloneTasks(tasks);
  eventBus.emit(Events.LIFELOG_TASKS_UPDATED, { tasks: getLifelogTaskSnapshot() });
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
