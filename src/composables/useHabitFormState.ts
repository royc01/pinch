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

const createDefaultNewHabit = (): NewHabitFormState => ({
  name: '',
  emoji: '',
  difficulty: 'medium',
  frequency: 'daily',
  noteDocId: '',
  timesPerDay: '1',
  usePomodoro: false,
  pomodoroDuration: '25'
});

export const useHabitFormState = (t: (key: string) => string) => {
  const newHabit = ref<NewHabitFormState>(createDefaultNewHabit());

  const frequencyOptions = ref([
    { value: 'daily', text: t('habitTracker.daily') },
    ...Array.from({ length: 6 }, (_, i) => ({
      value: `weekly${6 - i}`,
      text: `每周${6 - i}天`
    }))
  ]);

  const timesPerDayOptions = ref(createNumberOptions(20, '次'));
  const difficultyOptions = ref([
    { value: 'easy', text: '简单' },
    { value: 'medium', text: '普通' },
    { value: 'hard', text: '困难' }
  ]);

  const pomodoroDurationOptions = ref([
    { value: '5', text: '5分钟' },
    { value: '10', text: '10分钟' },
    { value: '15', text: '15分钟' },
    { value: '25', text: '25分钟' },
    { value: '30', text: '30分钟' },
    { value: '45', text: '45分钟' },
    { value: '60', text: '60分钟' }
  ]);

  return {
    newHabit,
    difficultyOptions,
    frequencyOptions,
    timesPerDayOptions,
    pomodoroDurationOptions
  };
};
