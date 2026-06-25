import type { Habit, Task } from '@/api';
import { isHabitScheduledOnDate } from '@/composables/useHabitUtils';
import { getHabitBackgroundColorValue, normalizeHabitEmojiColorIndex, resolveHabitEmojiColorIndex } from '@/utils/habitEmojiColor';

const HABIT_TASK_CHIP_PREFIX = 'habit-chip:';

export function isHabitTaskChip(task: Pick<Task, 'id'>): boolean {
  return typeof task.id === 'string' && task.id.startsWith(HABIT_TASK_CHIP_PREFIX);
}

export function parseHabitTaskChipId(taskId: string): { habitId: string; date: string } | null {
  if (!taskId.startsWith(HABIT_TASK_CHIP_PREFIX)) {
    return null;
  }
  const rest = taskId.slice(HABIT_TASK_CHIP_PREFIX.length);
  const separatorIndex = rest.lastIndexOf(':');
  if (separatorIndex <= 0) {
    return null;
  }
  const habitId = rest.slice(0, separatorIndex);
  const date = rest.slice(separatorIndex + 1);
  if (!habitId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }
  return { habitId, date };
}

function getHabitTargetCount(habit: Habit, date: string): number {
  const record = habit.calendar.find(day => day.date === date);
  return Math.max(1, Math.round(Number(record?.targetCount ?? habit.timesPerDay ?? 1) || 1));
}

function getHabitCompletedCount(habit: Habit, date: string): number {
  const record = habit.calendar.find(day => day.date === date);
  if (!record) {
    return 0;
  }
  if (typeof record.completedCount === 'number' && Number.isFinite(record.completedCount)) {
    return Math.max(0, Math.round(record.completedCount));
  }
  return record.completed ? getHabitTargetCount(habit, date) : 0;
}

function hasHabitRecordOnDate(habit: Habit, date: string): boolean {
  const record = habit.calendar.find(day => day.date === date);
  return Boolean(record && (record.completed || Number(record.completedCount || 0) > 0));
}

function formatHabitChipTitle(habit: Habit, date: string): string {
  const name = typeof habit.name === 'string' ? habit.name.trim() : '';
  const targetCount = getHabitTargetCount(habit, date);
  const completedCount = getHabitCompletedCount(habit, date);
  const progress = targetCount > 1 ? ` ${completedCount}/${targetCount}` : '';
  return `${name || 'Habit'}${progress}`;
}

function shouldBuildHabitChipForFrequency(habit: Habit): boolean {
  return !habit.frequency || habit.frequency === 'daily' || habit.frequency === 'custom';
}

function getHabitTaskChipColor(habit: Habit): string {
  const colorIndex = normalizeHabitEmojiColorIndex(habit.emojiColorIndex) ?? resolveHabitEmojiColorIndex(habit.emoji);
  return getHabitBackgroundColorValue(colorIndex);
}

export function buildHabitTaskChips(habits: Habit[], dates: Array<{ key: string; date: Date }>): Task[] {
  const chips: Task[] = [];

  for (const habit of habits) {
    if (!shouldBuildHabitChipForFrequency(habit) || habit.isPaused) {
      continue;
    }

    const createdDate = new Date(habit.createdAt);
    createdDate.setHours(0, 0, 0, 0);

    for (const day of dates) {
      const date = day.key;
      const dayDate = new Date(day.date);
      dayDate.setHours(0, 0, 0, 0);
      const shouldShow = hasHabitRecordOnDate(habit, date) || (
        (!Number.isFinite(createdDate.getTime()) || dayDate >= createdDate)
        && isHabitScheduledOnDate(habit, dayDate)
      );

      if (!shouldShow) {
        continue;
      }

      const completedCount = getHabitCompletedCount(habit, date);
      const targetCount = getHabitTargetCount(habit, date);

      chips.push({
        id: `${HABIT_TASK_CHIP_PREFIX}${habit.id}:${date}`,
        type: 'standalone',
        title: formatHabitChipTitle(habit, date),
        status: completedCount >= targetCount ? 'completed' : 'pending',
        priority: 'none',
        startDate: date,
        dueDate: date,
        tags: [],
        description: '',
        icon: habit.emoji || '📝',
        backgroundColor: getHabitTaskChipColor(habit),
        createdAt: habit.createdAt || new Date().toISOString(),
        updatedAt: habit.createdAt || new Date().toISOString()
      });
    }
  }

  return chips;
}
