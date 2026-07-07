import { getHabits, TaskRepository } from '@/api';
import {
  createHabitFocusTarget,
  createTaskFocusTarget,
  type FocusTimerLinkedTarget
} from '@/utils/focusTimerTarget';
import { translate } from '@/composables/useI18n';

export type FocusTargetPickerMode = 'habit' | 'task';

export async function loadHabitFocusTargetOptions(): Promise<FocusTimerLinkedTarget[]> {
  const habits = await getHabits();
  return habits
    .filter(habit => !habit.isPaused)
    .map(habit => createHabitFocusTarget(habit));
}

export async function loadTaskFocusTargetOptions(): Promise<FocusTimerLinkedTarget[]> {
  let tasks = await TaskRepository.getCachedTasksOnly();

  if (tasks.length === 0) {
    tasks = await TaskRepository.getAllTasks(false, undefined, { useLiveDom: false });
  }

  return tasks
    .filter(task => task.archived !== true && task.status !== 'completed' && task.status !== 'cancelled' && !!task.blockId)
    .sort((left, right) => {
      const leftPinned = left.pinned === true ? 1 : 0;
      const rightPinned = right.pinned === true ? 1 : 0;
      if (leftPinned !== rightPinned) {
        return rightPinned - leftPinned;
      }
      return String(right.updatedAt || '').localeCompare(String(left.updatedAt || ''));
    })
    .map(task => createTaskFocusTarget(task));
}

export function filterFocusTargetOptions(
  options: FocusTimerLinkedTarget[],
  keyword: string
): FocusTimerLinkedTarget[] {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) {
    return options;
  }

  return options.filter(target => {
    const searchText = target.searchText || target.name;
    return searchText.toLowerCase().includes(normalizedKeyword);
  });
}

export function getFocusTargetDisplayLabel(
  target: FocusTimerLinkedTarget | null | undefined
): string {
  if (!target) {
    return '';
  }

  return `${target.type === 'task' ? translate('focusTimer.task') : translate('focusTimer.habit')}：${target.name}`;
}

export function getFocusTargetEmoji(target: FocusTimerLinkedTarget | null | undefined): string {
  if (!target) {
    return '';
  }

  if (target.emoji) {
    return target.emoji;
  }

  return target.type === 'task' ? '✅' : '📝';
}
