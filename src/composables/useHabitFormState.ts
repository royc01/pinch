import { ref } from 'vue';
import { createNumberOptions } from '@/composables/useHabitUtils';
import type { HabitDifficulty } from '@/api';

export interface NewHabitFormState {
  name: string;
  emoji: string;
  difficulty: HabitDifficulty;
  frequency: 'daily' | 'weekly6' | 'weekly5' | 'weekly4' | 'weekly3' | 'weekly2' | 'weekly1';
  noteDocId: string;
  timesPerDay: string;
  usePomodoro: boolean;
  pomodoroDuration: string;
}

export const createDefaultNewHabit = (): NewHabitFormState => ({
  name: '',
  emoji: '',
  difficulty: 'medium',
  frequency: 'daily',
  noteDocId: '',
  timesPerDay: '1',
  usePomodoro: false,
  pomodoroDuration: '25'
});

export const useHabitFormState = (t: (key: string, vars?: Record<string, any>) => string) => {
  const newHabit = ref<NewHabitFormState>(createDefaultNewHabit());

  const frequencyOptions = ref([
    { value: 'daily', text: t('habitTracker.daily') },
    ...Array.from({ length: 6 }, (_, i) => ({
      value: `weekly${6 - i}`,
      text: t('XDaysPerWeek', { count: 6 - i })
    }))
  ]);

  const timesPerDayOptions = ref(createNumberOptions(20, 'XTimesPerDay'));
  const difficultyOptions = ref([
    { value: 'easy', text: t('difficultyEasy') },
    { value: 'medium', text: t('difficultyMedium') },
    { value: 'hard', text: t('difficultyHard') }
  ]);

  const pomodoroDurationOptions = ref([
    { value: '5', text: t('XMinutes', { count: 5 }) },
    { value: '10', text: t('XMinutes', { count: 10 }) },
    { value: '15', text: t('XMinutes', { count: 15 }) },
    { value: '25', text: t('XMinutes', { count: 25 }) },
    { value: '30', text: t('XMinutes', { count: 30 }) },
    { value: '45', text: t('XMinutes', { count: 45 }) },
    { value: '60', text: t('XMinutes', { count: 60 }) }
  ]);

  return {
    newHabit,
    difficultyOptions,
    frequencyOptions,
    timesPerDayOptions,
    pomodoroDurationOptions
  };
};
