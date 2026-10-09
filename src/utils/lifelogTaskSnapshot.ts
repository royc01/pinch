import type { Task } from '@/api';
import { eventBus, Events } from './eventBus';

let snapshot: Task[] = [];

/** Track fields consumed by task logs without traversing the subtask tree. */
export function getLifelogTaskSnapshotSignature(tasks: Task[]): string {
  return JSON.stringify(tasks.map(task => [
    task.id, task.blockId, task.title, task.description, task.status,
    task.priority, task.tags, task.completedAt, task.updatedAt,
    task.startDate, task.dueDate, task.groupId, task.notebookId, task.rootId,
    task.archived, task.isVirtual, task.repeatSeriesId, task.repeatFrequency,
    task.repeatInstanceDate
  ]));
}

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
