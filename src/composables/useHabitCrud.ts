import { type Ref, type ShallowRef } from 'vue';
import type { Habit } from '@/api';
import { createDefaultNewHabit, type NewHabitFormState } from '@/composables/useHabitFormState';

interface UseHabitCrudOptions {
  habits: ShallowRef<Habit[]>;
  selectedHabit: Ref<Habit | null>;
  showAddHabitModal: Ref<boolean>;
  newHabit: Ref<NewHabitFormState>;
  showEditHabitModal: Ref<boolean>;
  editedHabit: Ref<Habit | null>;
  t: (key: string, vars?: Record<string, any>) => string;
  saveHabitsNow: (habitsToSave: Habit[]) => Promise<void>;
  immediateSaveHabits: (habitsToSave: Habit[]) => Promise<void>;
  triggerHabitsRef: () => void;
  normalizeDocId: (raw: string) => string;
}

const createCalendarData = (): any[] => [];

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
  triggerHabitsRef,
  normalizeDocId
}: UseHabitCrudOptions) => {
  const handleAddHabit = async (habitData: NewHabitFormState) => {
    if (!habitData.name.trim()) {
      alert('请输入习惯名称');
      return;
    }

    const inputTimesPerDay = parseInt(String(habitData.timesPerDay), 10) || 1;
    if (inputTimesPerDay > 20) {
      alert('每日打卡次数不能超过20次');
      return;
    }

    const timesPerDay = Math.min(inputTimesPerDay, 20);

    const habit: Habit = {
      id: Date.now().toString(),
      name: habitData.name,
      emoji: habitData.emoji,
      difficulty: habitData.difficulty || 'medium',
      frequency: habitData.frequency as any,
      timesPerDay,
      noteDocId: normalizeDocId(habitData.noteDocId || ''),
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
