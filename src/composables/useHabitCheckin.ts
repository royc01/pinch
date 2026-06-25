import { nextTick, type Ref, type ShallowRef } from 'vue';
import type { Habit } from '@/api';
import { awardHabitRewards, type HabitRewardPayload } from '@/rewardRepository';
import { translate } from '@/composables/useI18n';
import { isHabitScheduledOnDate } from '@/composables/useHabitUtils';

interface UseHabitCheckinOptions {
  habits: ShallowRef<Habit[]>;
  formatDate: (date: Date) => string;
  parseDate: (dateStr: string) => Date;
  getWeeklyCompletionStatus: (habit: Habit) => boolean;
  getToday: () => string;
  calculateCurrentStreak: (habit: Habit) => number;
  calculateCurrentMonthStreak: (habit: Habit) => number;
  calculateTotalMonthCompletions: (habit: Habit) => number;
  clearWeeklyCompletionCacheForHabit: (habitId: string) => void;
  clearCurrentStreakCacheForHabit: (habitId: string) => void;
  clearCompletionRateCacheForHabit: (habitId: string) => void;
  debouncedSaveHabits: (habitsToSave: Habit[]) => Promise<void>;
  immediateSaveHabits: (habitsToSave: Habit[]) => Promise<void>;
  triggerHabitsRef: () => void;
  notifyHabitsChanged?: (habits: Habit[]) => void;
  animationOriginalStatus: Ref<Record<string, boolean>>;
  showAnimation: Ref<boolean>;
  animationHabitId: Ref<string | null>;
  playBubbleSound: () => void;
  confirmUncheckMessage?: string;
}

interface HabitPomodoroControls {
  activePomodoroHabit: Ref<Habit | null>;
  startPomodoroTimer: (habit: Habit) => boolean;
  clearPomodoroForHabit: (habit: Habit, options?: { clearActive?: boolean }) => void;
  startFocusTimerForHabit?: (habit: Habit) => void;
}

export const useHabitCheckin = ({
  habits,
  formatDate,
  parseDate,
  getWeeklyCompletionStatus,
  getToday,
  calculateCurrentStreak,
  calculateCurrentMonthStreak,
  calculateTotalMonthCompletions,
  clearWeeklyCompletionCacheForHabit,
  clearCurrentStreakCacheForHabit,
  clearCompletionRateCacheForHabit,
  debouncedSaveHabits,
  immediateSaveHabits,
  triggerHabitsRef,
  notifyHabitsChanged,
  animationOriginalStatus,
  showAnimation,
  animationHabitId,
  playBubbleSound,
  confirmUncheckMessage = translate('habitTracker.confirmUncheck')
}: UseHabitCheckinOptions) => {
  const isAtLeastCompletionMode = (habit: Habit): boolean => habit.completionMode === 'atLeast';

  const toggleHabitCompletion = (
    habit: Habit,
    date: string,
    options: { source?: 'manual' | 'calendar' | 'pomodoro' } = {}
  ): HabitRewardPayload | null => {
    let dayRecord = habit.calendar.find(day => day.date === date);
    if (!dayRecord && !isHabitScheduledOnDate(habit, parseDate(date))) {
      return null;
    }
    const previousCompletedCount = dayRecord?.completedCount || 0;
    const previousDayCompleted = dayRecord?.completed === true;
    const previousStreak = habit.currentStreak || 0;
    const previousWeeklyCompleted = habit.frequency?.startsWith('weekly')
      ? getWeeklyCompletionStatus(habit)
      : false;

    if (!dayRecord) {
      const timesPerDay = Math.min(
        typeof habit.timesPerDay === 'string' ? parseInt(habit.timesPerDay, 10) || 1 : habit.timesPerDay || 1,
        20
      );
      dayRecord = {
        date,
        completed: false,
        completedCount: 0,
        targetCount: timesPerDay
      };
      habit.calendar.push(dayRecord);
    }

    const targetCount =
      typeof dayRecord.targetCount === 'string'
        ? parseInt(dayRecord.targetCount, 10) || 1
        : dayRecord.targetCount || 1;

    if (dayRecord.completed && !isAtLeastCompletionMode(habit)) {
      if (confirm(confirmUncheckMessage)) {
        dayRecord.completedCount = 0;
        dayRecord.completed = false;
        delete dayRecord.timestamp;
        delete dayRecord.checkinTimestamps;

        if (dayRecord.completedCount === 0) {
          habit.calendar = habit.calendar.filter(day => day.date !== date);
        }

        delete animationOriginalStatus.value[habit.id];
      }
    } else {
      if (isAtLeastCompletionMode(habit) || dayRecord.completedCount < targetCount) {
        const previousTimestamps = Array.isArray(dayRecord.checkinTimestamps)
          ? dayRecord.checkinTimestamps
          : ((dayRecord.completedCount || 0) > 0 && dayRecord.timestamp ? [dayRecord.timestamp] : []);
        dayRecord.completedCount = (dayRecord.completedCount || 0) + 1;
        const now = Date.now();
        dayRecord.checkinTimestamps = [...previousTimestamps, now];
        if (!dayRecord.timestamp) {
          dayRecord.timestamp = now;
        }
      }
      dayRecord.completed = dayRecord.completedCount >= targetCount;

      if ((dayRecord.completedCount || 0) > 0 && !dayRecord.timestamp) {
        dayRecord.timestamp = dayRecord.checkinTimestamps?.[0] || Date.now();
      }
    }

    const now = new Date();
    const todayStr = formatDate(now);
    habit.completedToday = date === todayStr && dayRecord.completed;

    habit.totalCompletions = habit.calendar.filter(day => day.completed).length;
    clearCurrentStreakCacheForHabit(habit.id);
    habit.currentStreak = calculateCurrentStreak(habit);
    const nextWeeklyCompleted = habit.frequency?.startsWith('weekly')
      ? (() => {
          clearWeeklyCompletionCacheForHabit(habit.id);
          return getWeeklyCompletionStatus(habit);
        })()
      : false;
    clearCompletionRateCacheForHabit(habit.id);
    triggerHabitsRef();
    notifyHabitsChanged?.(habits.value);

    const nextCompletedCount = dayRecord.completedCount || 0;
    const becameCompleted = !previousDayCompleted && dayRecord.completed;

    if (nextCompletedCount > previousCompletedCount || becameCompleted || nextWeeklyCompleted !== previousWeeklyCompleted) {
      return {
        habit: {
          id: habit.id,
          name: habit.name,
          difficulty: habit.difficulty,
          frequency: habit.frequency,
          completionMode: habit.completionMode,
          timesPerDay: habit.timesPerDay
        },
        date,
        previousCompletedCount,
        nextCompletedCount,
        targetCount,
        becameCompleted,
        previousStreak,
        nextStreak: habit.currentStreak,
        weeklyCompletedBefore: previousWeeklyCompleted,
        weeklyCompletedAfter: nextWeeklyCompleted,
        source: options.source || 'manual'
      };
    }
    return null;
  };

  const processRewardPayload = (payload: HabitRewardPayload | null): void => {
    if (!payload) return;
    // Delay reward calculation slightly so the browser can finish processing UI updates.
    setTimeout(() => {
      awardHabitRewards(payload).catch(err => {
        console.error('[Rewards] Failed to award habit rewards:', err);
      });
    }, 50);
  };

  const toggleDayCompletion = async (habit: Habit, date: string) => {
    const rewardPayload = toggleHabitCompletion(habit, date, { source: 'calendar' });
    await debouncedSaveHabits(habits.value);
    triggerHabitsRef();

    if (habit.frequency?.startsWith('weekly')) {
      clearWeeklyCompletionCacheForHabit(habit.id);
    }

    clearCurrentStreakCacheForHabit(habit.id);
    clearCompletionRateCacheForHabit(habit.id);

    processRewardPayload(rewardPayload);
  };

  const buildToggleHabit = ({
    activePomodoroHabit,
    startPomodoroTimer,
    clearPomodoroForHabit,
    startFocusTimerForHabit
  }: HabitPomodoroControls) => {
    return async (habitId: string) => {
      const habit = habits.value.find(h => h.id === habitId);
      if (!habit) {
        return;
      }

      const today = getToday();
      if (!isHabitScheduledOnDate(habit, parseDate(today))) {
        return;
      }

      if (habit.usePomodoro) {
        if (habit.completedToday && !isAtLeastCompletionMode(habit)) {
          if (confirm(confirmUncheckMessage)) {
            const todayRecord = habit.calendar.find(day => day.date === today);

            if (todayRecord) {
              todayRecord.completed = false;
              todayRecord.completedCount = 0;
              delete todayRecord.timestamp;
              delete todayRecord.checkinTimestamps;
            }

            habit.completedToday = false;

            if (activePomodoroHabit.value && activePomodoroHabit.value.id === habit.id) {
              clearPomodoroForHabit(habit, { clearActive: true });
            }

            delete animationOriginalStatus.value[habit.id];

            habits.value = [...habits.value];
            await immediateSaveHabits(habits.value);

            nextTick(() => {
              habit.currentStreak = calculateCurrentMonthStreak(habit);
              habit.totalCompletions = calculateTotalMonthCompletions(habit);
            });
          }
          return;
        }

        if (startFocusTimerForHabit) {
          if (activePomodoroHabit.value) {
            clearPomodoroForHabit(activePomodoroHabit.value, { clearActive: true });
            await immediateSaveHabits(habits.value);
          }

          startFocusTimerForHabit(habit);
          return;
        }

        if (activePomodoroHabit.value && activePomodoroHabit.value.id !== habit.id) {
          clearPomodoroForHabit(activePomodoroHabit.value, { clearActive: true });
        }

        if (startPomodoroTimer(habit)) {
          activePomodoroHabit.value = habit;
        }
        return;
      }

      if (habit.frequency?.startsWith('weekly') && getWeeklyCompletionStatus(habit) && !isAtLeastCompletionMode(habit)) {
        if (confirm(confirmUncheckMessage)) {
          const today = new Date();
          const todayWeekday = today.getDay();
          const daysToMonday = todayWeekday === 0 ? -6 : 1 - todayWeekday;
          const thisWeekMonday = new Date(today);
          thisWeekMonday.setDate(today.getDate() + daysToMonday);

          const weeklyCompletedDays = habit.calendar
            .filter(day => {
              const dayDate = parseDate(day.date);
              const dayDayOfWeek = dayDate.getDay();
              const dayDaysToMonday = dayDayOfWeek === 0 ? -6 : 1 - dayDayOfWeek;
              const dayStartOfWeek = new Date(dayDate);
              dayStartOfWeek.setDate(dayDate.getDate() + dayDaysToMonday);

              const normalizedStartOfWeek = new Date(
                thisWeekMonday.getFullYear(),
                thisWeekMonday.getMonth(),
                thisWeekMonday.getDate()
              );
              const normalizedDayStartOfWeek = new Date(
                dayStartOfWeek.getFullYear(),
                dayStartOfWeek.getMonth(),
                dayStartOfWeek.getDate()
              );

              return day.completed && normalizedStartOfWeek.getTime() === normalizedDayStartOfWeek.getTime();
            })
            .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());

          if (weeklyCompletedDays.length > 0) {
            const lastCompletedDay = weeklyCompletedDays[0];
            lastCompletedDay.completed = false;
            lastCompletedDay.completedCount = 0;
            if (lastCompletedDay.date === getToday()) {
              habit.completedToday = false;
            }
            delete lastCompletedDay.timestamp;
            delete lastCompletedDay.checkinTimestamps;
            delete animationOriginalStatus.value[habit.id];
            triggerHabitsRef();
          }

          await immediateSaveHabits(habits.value);

          nextTick(() => {
            habit.currentStreak = calculateCurrentMonthStreak(habit);
            habit.totalCompletions = calculateTotalMonthCompletions(habit);
            clearWeeklyCompletionCacheForHabit(habit.id);
            clearCompletionRateCacheForHabit(habit.id);
            triggerHabitsRef();
          });
        }
        return;
      }

      const rewardPayload = toggleHabitCompletion(habit, today, { source: 'manual' });

      const completedToday = habit.completedToday;
      if (completedToday && !habit.usePomodoro) {
        playBubbleSound();

        animationOriginalStatus.value[habit.id] = false;

        showAnimation.value = true;
        animationHabitId.value = habit.id;

        setTimeout(async () => {
          await immediateSaveHabits(habits.value);
          processRewardPayload(rewardPayload);
          showAnimation.value = false;
          animationHabitId.value = null;
          delete animationOriginalStatus.value[habit.id];
        }, 600);
      } else {
        await immediateSaveHabits(habits.value);
        processRewardPayload(rewardPayload);
      }
    };
  };

  return {
    toggleHabitCompletion,
    toggleDayCompletion,
    buildToggleHabit,
    processRewardPayload
  };
};
