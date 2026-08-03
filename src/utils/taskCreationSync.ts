import type { Task } from '@/api';
import { eventBus, Events } from '@/utils/eventBus';

type CreatedBlockTask = {
  taskId: string;
  blockId: string;
};

type OptimisticTaskFields = Pick<Task, 'title' | 'status' | 'priority' | 'dueDate' | 'tags' | 'groupId' | 'description'>;

export function emitOptimisticBlockTaskAdded(
  created: CreatedBlockTask,
  context: {
    notebookId: string;
    rootId?: string;
    docPath: string;
    task: OptimisticTaskFields;
  }
): void {
  const now = new Date().toISOString();
  eventBus.emit(Events.TASK_ADDED, {
    blockId: created.blockId,
    task: {
      ...context.task,
      id: created.taskId,
      type: 'block',
      blockId: created.blockId,
      rootId: context.rootId || undefined,
      hPath: context.docPath,
      notebookId: context.notebookId,
      createdAt: now,
      updatedAt: now
    } as Task
  });
}
