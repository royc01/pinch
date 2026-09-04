import { openBlockById, type FocusSessionTargetInput, type Habit, type Tag, type Task } from '@/api';
import { eventBus, Events } from '@/utils/eventBus';
import { translate } from '@/composables/useI18n';

export interface FocusTimerLinkedTarget {
  type: 'habit' | 'task' | 'tag';
  id: string;
  name: string;
  searchText?: string;
  emoji?: string;
  preferredDuration?: number;
  blockId?: string;
}

export function toFocusSessionTargetInput(
  target: FocusTimerLinkedTarget | null | undefined
): FocusSessionTargetInput | null {
  if (!target) {
    return null;
  }

  return {
    type: target.type,
    id: target.id,
    name: target.name,
    emoji: target.emoji,
    blockId: target.blockId
  };
}

export function stripFocusTargetText(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\{:\s*[^{}]*\}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function createHabitFocusTarget(
  habit: Pick<Habit, 'id' | 'name' | 'emoji' | 'pomodoroDuration'>
): FocusTimerLinkedTarget {
  return {
    type: 'habit',
    id: habit.id,
    name: habit.name || translate('focusTimer.untitledHabit'),
    emoji: habit.emoji,
    preferredDuration: habit.pomodoroDuration
  };
}

export function createTaskFocusTarget(
  task: Pick<Task, 'id' | 'taskId' | 'title' | 'blockId' | 'sourceBlockId' | 'description' | 'isVirtual'>
): FocusTimerLinkedTarget {
  const name = stripFocusTargetText(task.title || '') || translate('focusTimer.untitledTask');
  const description = stripFocusTargetText(task.description || '');
  return {
    type: 'task',
    // Virtual repeat instances must share one focus target with their template.
    // This keeps focus time continuous across every occurrence in the series.
    id: task.isVirtual ? (task.taskId || task.id) : task.id,
    name,
    searchText: [name, description].filter(Boolean).join(' '),
    blockId: task.isVirtual ? (task.sourceBlockId || task.blockId) : task.blockId
  };
}

export function createTagFocusTarget(tag: Pick<Tag, 'id' | 'name' | 'icon' | 'color'>): FocusTimerLinkedTarget {
  return { type: 'tag', id: tag.id, name: tag.name || translate('focusTimer.untitledTag'), emoji: tag.icon || '🏷️' };
}

export async function openFocusTimerLinkedTarget(target: FocusTimerLinkedTarget): Promise<boolean> {
  if (target.type === 'habit') {
    eventBus.emit(Events.HABIT_TRACKER_PANEL_OPEN_REQUEST, {
      target: 'habit-detail',
      habitId: target.id
    });
    return true;
  }

  return target.type === 'task' && target.blockId ? openBlockById(target.blockId) : false;
}
