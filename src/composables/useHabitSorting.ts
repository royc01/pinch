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
      sortOrder?: number;
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
        createdAt: new Date(habit.createdAt).getTime(),
        sortOrder: typeof habit.sortOrder === 'number' && Number.isFinite(habit.sortOrder)
           ? habit.sortOrder
           : undefined
      });
    }

    return habitStatusArray
      .sort((a, b) => {
        // 一旦用户调整过任一卡片，全部列表按保存的手动顺序展示。
        // 未拥有顺序的旧数据仍按原有规则排在最后，兼容升级前的数据。
        if (a.sortOrder !== undefined || b.sortOrder !== undefined) {
          if (a.sortOrder === undefined) return 1;
          if (b.sortOrder === undefined) return -1;
          return a.sortOrder - b.sortOrder;
        }
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
