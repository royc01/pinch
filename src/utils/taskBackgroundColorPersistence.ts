import { TaskRepository, setBlockAttrs, type Task } from '@/api';
import { getRepeatSeriesForTask, updateRepeatSeriesBackgroundColor } from '@/repeatRepository';
import { isRepeatTask } from './repeatTaskUtils';

export interface PersistTaskBackgroundColorResult {
  color: string;
  isRepeatTask: boolean;
  persistenceTarget: Task;
  updatedTask: Task;
  updatedTasks: Task[];
}

function normalizeTaskColor(color: string): string {
  return typeof color === 'string' ? color.trim() : '';
}

function getRepeatSeriesId(task: Task): string {
  return typeof task.repeatSeriesId === 'string' ? task.repeatSeriesId.trim() : '';
}

async function resolveRepeatTemplateTask(task: Task, allTasks: Task[]): Promise<Task | null> {
  if (!isRepeatTask(task)) {
    return null;
  }
  if (task.isVirtual !== true) {
    return task;
  }

  const seriesId = getRepeatSeriesId(task);
  if (seriesId) {
    const localTemplateTask = allTasks.find(item =>
      item.isVirtual !== true
      && item.repeatSeriesId === seriesId
      && item.type === 'block'
      && typeof item.blockId === 'string'
      && item.blockId.trim().length > 0
    );
    if (localTemplateTask) {
      return localTemplateTask;
    }
  }

  const repeatSeries = await getRepeatSeriesForTask(task).catch(() => null);
  const templateBlockId = typeof repeatSeries?.templateBlockId === 'string'
    ? repeatSeries.templateBlockId.trim()
    : '';
  if (!templateBlockId) {
    return null;
  }

  const cachedTemplateTask = allTasks.find(item =>
    item.isVirtual !== true
    && item.type === 'block'
    && item.blockId === templateBlockId
  );
  if (cachedTemplateTask) {
    return cachedTemplateTask;
  }

  const fetchedTemplateTask = await TaskRepository.getTaskByBlockId(templateBlockId, true).catch(() => null);
  return fetchedTemplateTask?.type === 'block' ? fetchedTemplateTask : null;
}

export async function persistTaskBackgroundColor(
  task: Task,
  color: string,
  allTasks: Task[]
): Promise<PersistTaskBackgroundColorResult | null> {
  const normalizedColor = normalizeTaskColor(color);
  if (!task || !normalizedColor) {
    return null;
  }

  const repeatTask = isRepeatTask(task);
  const seriesId = getRepeatSeriesId(task);
  const templateTask = await resolveRepeatTemplateTask(task, allTasks);
  const persistenceTarget = templateTask || task;
  const updatedTasks = repeatTask && seriesId
    ? allTasks
      .filter(item => item.repeatSeriesId === seriesId)
      .map(item => ({ ...item, backgroundColor: normalizedColor }))
    : [{ ...task, backgroundColor: normalizedColor }];
  const updatedTask = updatedTasks.find(item => item.id === task.id)
    || updatedTasks.find(item => item.id === persistenceTarget.id)
    || { ...task, backgroundColor: normalizedColor };

  if (persistenceTarget.type === 'block' && persistenceTarget.blockId) {
    await setBlockAttrs(persistenceTarget.blockId, {
      'custom-task-background-color': normalizedColor
    });
  } else {
    await TaskRepository.updateTask(persistenceTarget.id, { backgroundColor: normalizedColor });
  }

  if (repeatTask) {
    await updateRepeatSeriesBackgroundColor(persistenceTarget, normalizedColor);
  }

  return {
    color: normalizedColor,
    isRepeatTask: repeatTask,
    persistenceTarget,
    updatedTask,
    updatedTasks
  };
}
