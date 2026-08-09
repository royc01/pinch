import { type Ref, type ShallowRef } from 'vue';
import type { Habit } from '@/api';
import { createDefaultNewHabit, type NewHabitFormState } from '@/composables/useHabitFormState';
import { resolveHabitEmojiColorIndex } from '@/utils/habitEmojiColor';

interface UseHabitCrudOptions {
  habits: ShallowRef<Habit[]>;
  selectedHabit: Ref<Habit | null>;
  showAddHabitModal: Ref<boolean>;
  newHabit: Ref<NewHabitFormState>;
  showEditHabitModal: Ref<boolean>;
  editedHabit: Ref<Habit | null>;
  t: (key: string) => string;
  saveHabitsNow: (habitsToSave: Habit[]) => Promise<void>;
  immediateSaveHabits: (habitsToSave: Habit[]) => Promise<void>;
  triggerHabitsRef: () => void;
}

const createCalendarData = (): any[] => [];

const hasCustomScheduleSelection = (habit: Pick<Habit, 'frequency' | 'customSchedule'>): boolean => {
  if (habit.frequency !== 'custom') return true;
  const schedule = habit.customSchedule;
  return (
    (schedule?.type === 'month' && !!schedule.monthDays?.length)
    || (schedule?.type === 'year' && !!schedule.yearDays?.length)
    || ((schedule?.type === 'week' || !schedule?.type) && !!schedule?.weekDays?.length)
  );
};

export const useHabitCrud = ({
  habits,
  selectedHabit,
  showAddHabitModal,
  newHabit,
  showEditHabitModal,
  editedHabit,
  t,
  saveHabitsNow,
  immediateSaveHabits,
  triggerHabitsRef
}: UseHabitCrudOptions) => {
  const handleAddHabit = async (habitData: NewHabitFormState) => {
    if (!habitData.name.trim()) {
      alert(t('habitTracker.enterHabitName'));
      return;
    }

    const inputTimesPerDay = parseInt(String(habitData.timesPerDay), 10) || 1;
    if (inputTimesPerDay > 20) {
      alert(t('habitTracker.timesPerDayMax'));
      return;
    }

    const timesPerDay = Math.min(inputTimesPerDay, 20);
    const customSchedule = habitData.frequency === 'custom' ? habitData.customSchedule : undefined;

    if (!hasCustomScheduleSelection({ frequency: habitData.frequency as Habit['frequency'], customSchedule })) {
      alert(t('habitTracker.customScheduleRequired'));
      return;
    }

    const habit: Habit = {
      id: Date.now().toString(),
      name: habitData.name,
      emoji: habitData.emoji,
      emojiColorIndex: resolveHabitEmojiColorIndex(habitData.emoji),
      difficulty: habitData.difficulty || 'medium',
      frequency: habitData.frequency as any,
      customSchedule,
      completionMode: habitData.completionMode || 'fixed',
      timesPerDay,
      completedToday: false,
      currentStreak: 0,
      totalCompletions: 0,
      calendar: createCalendarData(),
      createdAt: new Date().toISOString(),
      usePomodoro: habitData.usePomodoro || false,
      pomodoroDuration: parseInt(String(habitData.pomodoroDuration), 10) || 25
    };

    habits.value = [...habits.value, habit];
    await saveHabitsNow(habits.value);
    showAddHabitModal.value = false;
    newHabit.value = createDefaultNewHabit();
  };

  const deleteHabit = async (habitId: string) => {
    if (!confirm(t('habitTracker.confirmDelete'))) {
      return;
    }

    selectedHabit.value = null;
    habits.value = habits.value.filter(h => h.id !== habitId);
    triggerHabitsRef();
    await saveHabitsNow(habits.value);
  };

  const openEditHabitModal = () => {
    if (!selectedHabit.value) {
      return;
    }

    editedHabit.value = JSON.parse(JSON.stringify(selectedHabit.value));
    showEditHabitModal.value = true;
  };

  const closeEditHabitModal = () => {
    showEditHabitModal.value = false;
    editedHabit.value = null;
  };

  const saveEditedHabit = async (habit: Habit) => {
    if (!selectedHabit.value) {
      return;
    }

    if (!hasCustomScheduleSelection(habit)) {
      alert(t('habitTracker.customScheduleRequired'));
      return;
    }

    if (habit.frequency !== 'custom') {
      habit.customSchedule = undefined;
    }

    const previousEmoji = typeof selectedHabit.value.emoji === 'string' ? selectedHabit.value.emoji.trim() : '';
    const nextEmoji = typeof habit.emoji === 'string' ? habit.emoji.trim() : '';
    if (previousEmoji !== nextEmoji || !habit.emojiColorIndex) {
      habit.emojiColorIndex = resolveHabitEmojiColorIndex(nextEmoji);
    }

    Object.assign(selectedHabit.value, habit);
    triggerHabitsRef();
    await immediateSaveHabits(habits.value);
    closeEditHabitModal();
  };

  const togglePauseHabit = async (habit: Habit) => {
    habit.isPaused = !habit.isPaused;
    triggerHabitsRef();
    await immediateSaveHabits(habits.value);
  };

  return {
    handleAddHabit,
    deleteHabit,
    openEditHabitModal,
    closeEditHabitModal,
    saveEditedHabit,
    togglePauseHabit
  };
};
