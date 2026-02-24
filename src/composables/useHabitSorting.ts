import { computed, type Ref, type ShallowRef } from 'vue';
import type { Habit } from '@/api';

interface HabitCacheData {
  weeklyCompleted: boolean;
}

interface UseHabitSortingOptions {
  habits: ShallowRef<Habit[]>;
  getHabitCache: (habitId: string) => HabitCacheData;
  animationOriginalStatus: Ref<Record<string, boolean>>;
}

export const useHabitSorting = ({
  habits,
  getHabitCache,
  animationOriginalStatus
}: UseHabitSortingOptions) => {
  const sortedHabits = computed(() => {
    const habitStatusArray: Array<{
      habit: Habit;
      isPaused: boolean;
      isCompleted: boolean;
      createdAt: number;
    }> = [];

    const animationStatusMap = animationOriginalStatus.value;

    for (const habit of habits.value) {
      const cache = getHabitCache(habit.id);
      const isWeekly = habit.frequency && habit.frequency.startsWith('weekly');
      const animationStatus = animationStatusMap[habit.id];

      habitStatusArray.push({
        habit,
        isPaused: habit.isPaused || false,
        isCompleted: isWeekly
          ? animationStatus !== undefined
            ? animationStatus
            : habit.completedToday || cache.weeklyCompleted
          : animationStatus !== undefined
            ? animationStatus
            : habit.completedToday,
        createdAt: new Date(habit.createdAt).getTime()
      });
    }

    return habitStatusArray
      .sort((a, b) => {
        if (a.isPaused && !b.isPaused) {
          return 1;
        }
        if (!a.isPaused && b.isPaused) {
          return -1;
        }
        if (!a.isCompleted && b.isCompleted) {
          return -1;
        }
        if (a.isCompleted && !b.isCompleted) {
          return 1;
        }
        return b.createdAt - a.createdAt;
      })
      .map(item => item.habit);
  });

  return { sortedHabits };
};
