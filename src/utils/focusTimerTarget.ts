import { openBlockById, type Habit, type Task } from '@/api';
import { eventBus, Events } from '@/utils/eventBus';

export interface FocusTimerLinkedTarget {
  type: 'habit' | 'task';
  id: string;
  name: string;
  emoji?: string;
  preferredDuration?: number;
  blockId?: string;
}

export function stripFocusTargetText(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function createHabitFocusTarget(
  habit: Pick<Habit, 'id' | 'name' | 'emoji' | 'pomodoroDuration'>
): FocusTimerLinkedTarget {
  return {
    type: 'habit',
    id: habit.id,
    name: habit.name || '未命名习惯',
    emoji: habit.emoji,
    preferredDuration: habit.pomodoroDuration
  };
}

export function createTaskFocusTarget(
  task: Pick<Task, 'id' | 'title' | 'blockId'>
): FocusTimerLinkedTarget {
  return {
    type: 'task',
    id: task.id,
    name: stripFocusTargetText(task.title || '') || '未命名任务',
    blockId: task.blockId
  };
}

export async function openFocusTimerLinkedTarget(target: FocusTimerLinkedTarget): Promise<boolean> {
  if (target.type === 'habit') {
    eventBus.emit(Events.HABIT_TRACKER_PANEL_OPEN_REQUEST, {
      target: 'habit-detail',
      habitId: target.id
    });
    return true;
  }

  if (!target.blockId) {
    return false;
  }

  return openBlockById(target.blockId);
}
