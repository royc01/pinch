import { computed, ref, type ShallowRef } from 'vue';
import type { Habit } from '@/api';
import { useFocusSessionLock } from '@/composables/useFocusSessionLock';
import { awardHabitRewards, type HabitRewardPayload } from '@/rewardRepository';

type PomodoroAction = 'pause' | 'resume' | 'start' | 'stop';

interface UseHabitPomodoroOptions {
  habits: ShallowRef<Habit[]>;
  getToday: () => string;
  saveHabits: (habitsToSave: Habit[]) => Promise<void>;
  toggleHabitCompletion: (habit: Habit, date: string, options?: { source?: 'manual' | 'calendar' | 'pomodoro' }) => HabitRewardPayload | null;
  playBubbleSound?: () => void;
}

interface ClearPomodoroOptions {
  clearActive?: boolean;
}

export const useHabitPomodoro = ({
  habits,
  getToday,
  saveHabits,
  toggleHabitCompletion,
  playBubbleSound
}: UseHabitPomodoroOptions) => {
  const activePomodoroHabit = ref<Habit | null>(null);
  const activePomodoroRemaining = ref<number | undefined>(undefined);
  const activePomodoroPaused = ref(false);
  const inlineRadius = ref(45);
  const inlineCircumference = computed(() => 2 * Math.PI * inlineRadius.value);
  const { claimFocusSession, releaseFocusSession } = useFocusSessionLock('habit');

  const pomodoroTimers: Record<string, number> = {};
  const pomodoroDeadlines: Record<string, number> = {};

  const refreshHabits = () => {
    habits.value = [...habits.value];
  };

  const clearPomodoroTimer = (habitId: string) => {
    if (pomodoroTimers[habitId]) {
      clearInterval(pomodoroTimers[habitId]);
      delete pomodoroTimers[habitId];
    }
    delete pomodoroDeadlines[habitId];
  };

  const clearPomodoroForHabit = (habit: Habit, options: ClearPomodoroOptions = {}) => {
    clearPomodoroTimer(habit.id);
    delete habit.pomodoroRemaining;
    delete habit.pomodoroState;
    delete habit.isPomodoroPaused;

    if (options.clearActive && activePomodoroHabit.value?.id === habit.id) {
      activePomodoroHabit.value = null;
      activePomodoroRemaining.value = undefined;
      activePomodoroPaused.value = false;
      releaseFocusSession();
    }

    refreshHabits();
  };

  const completeHabitAfterPomodoro = async (habit: Habit) => {
    playBubbleSound?.();
    const today = getToday();
    const rewardPayload = toggleHabitCompletion(habit, today, { source: 'pomodoro' });
    clearPomodoroForHabit(habit);
    await saveHabits(habits.value);
    if (rewardPayload) {
      // 延迟奖励计算，避免与保存 I/O 竞争主线程
      setTimeout(() => {
        awardHabitRewards(rewardPayload).catch(err => {
          console.error('[Rewards] Failed to award habit rewards:', err);
        });
      }, 50);
    }
  };

  const startPomodoroTimer = (habit: Habit): boolean => {
    if (!claimFocusSession()) {
      return false;
    }

    clearPomodoroTimer(habit.id);

    const durationInMinutes = habit.pomodoroDuration || 25;
    let remainingTime = durationInMinutes * 60;

    habit.pomodoroRemaining = remainingTime;
    habit.pomodoroState = 'work';
    habit.isPomodoroPaused = false;

    activePomodoroRemaining.value = remainingTime;
    activePomodoroPaused.value = false;
    refreshHabits();

    pomodoroDeadlines[habit.id] = Date.now() + remainingTime * 1000;

    pomodoroTimers[habit.id] = window.setInterval(() => {
      const now = Date.now();
      const timeLeft = Math.ceil((pomodoroDeadlines[habit.id] - now) / 1000);

      if (timeLeft <= 0) {
        remainingTime = 0;
        habit.pomodoroRemaining = 0;
        activePomodoroRemaining.value = 0;
        refreshHabits();

        clearPomodoroTimer(habit.id);
        void completeHabitAfterPomodoro(habit);

        if (activePomodoroHabit.value?.id === habit.id) {
          activePomodoroHabit.value = null;
          activePomodoroRemaining.value = undefined;
          activePomodoroPaused.value = false;
          releaseFocusSession();
        }
      } else {
        remainingTime = timeLeft;
        habit.pomodoroRemaining = timeLeft;
        activePomodoroRemaining.value = timeLeft;
        refreshHabits();
      }
    }, 100);
    return true;
  };

  const startPomodoroTimerWithRemainingTime = (habit: Habit, remainingTime: number): boolean => {
    if (!claimFocusSession()) {
      return false;
    }

    clearPomodoroTimer(habit.id);

    habit.pomodoroRemaining = remainingTime;
    activePomodoroRemaining.value = remainingTime;
    activePomodoroPaused.value = false;
    refreshHabits();

    pomodoroDeadlines[habit.id] = Date.now() + remainingTime * 1000;

    pomodoroTimers[habit.id] = window.setInterval(() => {
      const now = Date.now();
      const timeLeft = Math.ceil((pomodoroDeadlines[habit.id] - now) / 1000);

      if (timeLeft <= 0) {
        habit.pomodoroRemaining = 0;
        activePomodoroRemaining.value = 0;
        refreshHabits();

        clearPomodoroTimer(habit.id);
        void completeHabitAfterPomodoro(habit);

        if (activePomodoroHabit.value?.id === habit.id) {
          activePomodoroHabit.value = null;
          activePomodoroRemaining.value = undefined;
          activePomodoroPaused.value = false;
          releaseFocusSession();
        }
      } else {
        habit.pomodoroRemaining = timeLeft;
        activePomodoroRemaining.value = timeLeft;
        refreshHabits();
      }
    }, 100);
    return true;
  };

  const controlPomodoro = async (action: PomodoroAction, habit?: Habit | null) => {
    const targetHabit = habit || activePomodoroHabit.value;
    if (!targetHabit) return;

    switch (action) {
      case 'pause':
        clearPomodoroTimer(targetHabit.id);
        targetHabit.isPomodoroPaused = true;
        activePomodoroPaused.value = true;
        refreshHabits();
        break;
      case 'resume':
        targetHabit.isPomodoroPaused = false;
        activePomodoroPaused.value = false;
        if (targetHabit.pomodoroRemaining !== undefined) {
          if (!startPomodoroTimerWithRemainingTime(targetHabit, targetHabit.pomodoroRemaining)) {
            targetHabit.isPomodoroPaused = true;
            activePomodoroPaused.value = true;
          }
        } else {
          if (!startPomodoroTimer(targetHabit)) {
            targetHabit.isPomodoroPaused = true;
            activePomodoroPaused.value = true;
          }
        }
        refreshHabits();
        break;
      case 'start':
        startPomodoroTimer(targetHabit);
        break;
      case 'stop':
        clearPomodoroForHabit(targetHabit);
        activePomodoroRemaining.value = undefined;
        activePomodoroPaused.value = false;
        if (activePomodoroHabit.value?.id === targetHabit.id) {
          activePomodoroHabit.value = null;
        }
        releaseFocusSession();
        break;
      default:
        break;
    }

    await saveHabits(habits.value);
  };

  const stopCurrentPomodoro = async () => {
    if (!activePomodoroHabit.value) return;

    await controlPomodoro('stop', activePomodoroHabit.value);
    activePomodoroHabit.value = null;
    activePomodoroRemaining.value = undefined;
    activePomodoroPaused.value = false;
    releaseFocusSession();
  };

  const togglePomodoroPause = async () => {
    await controlPomodoro('pause', activePomodoroHabit.value);
  };

  const togglePomodoroResume = async () => {
    await controlPomodoro('resume', activePomodoroHabit.value);
  };

  const inlineStrokeDashoffset = computed(() => {
    if (activePomodoroRemaining.value === undefined) {
      return inlineCircumference.value;
    }

    const remainingTime = activePomodoroRemaining.value;
    const totalTime = (activePomodoroHabit.value?.pomodoroDuration || 25) * 60;
    const progressRatio = 1 - (remainingTime / totalTime);

    let offset = inlineCircumference.value * (1 - progressRatio);

    if (progressRatio >= 1) {
      offset = 0;
    } else if (progressRatio <= 0) {
      offset = inlineCircumference.value;
    }

    return offset;
  });

  const pomodoroStateClass = (state?: 'work' | 'shortBreak' | 'longBreak') => {
    if (!state) return 'pomodoro-running';

    switch (state) {
      case 'work':
        return 'pomodoro-running';
      case 'shortBreak':
        return 'pomodoro-short-break';
      case 'longBreak':
        return 'pomodoro-long-break';
      default:
        return 'pomodoro-running';
    }
  };

  const cleanupPomodoroTimers = () => {
    for (const habitId in pomodoroTimers) {
      clearInterval(pomodoroTimers[habitId]);
      delete pomodoroTimers[habitId];
      delete pomodoroDeadlines[habitId];
    }
    activePomodoroHabit.value = null;
    activePomodoroRemaining.value = undefined;
    activePomodoroPaused.value = false;
    releaseFocusSession();
  };

  return {
    activePomodoroHabit,
    activePomodoroRemaining,
    activePomodoroPaused,
    inlineCircumference,
    inlineStrokeDashoffset,
    startPomodoroTimer,
    stopCurrentPomodoro,
    togglePomodoroPause,
    togglePomodoroResume,
    pomodoroStateClass,
    clearPomodoroForHabit,
    cleanupPomodoroTimers
  };
};
