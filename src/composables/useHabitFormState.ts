import { ref } from 'vue';
import type { HabitCompletionMode, HabitCustomSchedule, HabitDifficulty } from '@/api';
import { interpolateTemplate } from '@/composables/useI18n';

export interface NewHabitFormState {
  name: string;
  emoji: string;
  difficulty: HabitDifficulty;
  frequency: 'daily' | 'custom' | 'weekly6' | 'weekly5' | 'weekly4' | 'weekly3' | 'weekly2' | 'weekly1';
  customSchedule: HabitCustomSchedule;
  completionMode: HabitCompletionMode;
  timesPerDay: string;
  usePomodoro: boolean;
  pomodoroDuration: string;
  tagIds: string[];
  primaryTagId?: string;
}

export const createDefaultNewHabit = (): NewHabitFormState => ({
  name: '',
  emoji: '',
  difficulty: 'medium',
  frequency: 'daily',
  customSchedule: {
    type: 'week',
    calendar: 'solar',
    weekDays: [1],
    monthDays: [1],
    yearDays: ['01-01']
  },
  completionMode: 'fixed',
  timesPerDay: '1',
  usePomodoro: false,
  pomodoroDuration: '25',
  tagIds: []
});

export const useHabitFormState = (t: (key: string) => string) => {
  const formatTemplate = (key: string, values: Record<string, string | number>): string => {
    return interpolateTemplate(t(key), values);
  };

  const newHabit = ref<NewHabitFormState>(createDefaultNewHabit());

  const frequencyOptions = ref([
    { value: 'daily', text: t('habitTracker.daily') },
    ...Array.from({ length: 6 }, (_, i) => ({
      value: `weekly${6 - i}`,
      text: formatTemplate('habitTracker.frequencyWeeklyOptionTemplate', { days: 6 - i })
    })),
    { value: 'custom', text: t('habitTracker.custom') }
  ]);

  const timesPerDayOptions = ref(
    Array.from({ length: 20 }, (_, index) => ({
      value: String(index + 1),
      text: formatTemplate('habitTracker.numberTimesTemplate', { count: index + 1 })
    }))
  );
  const completionModeOptions = ref([
    { value: 'fixed', text: t('habitTracker.completionModeFixed') },
    { value: 'atLeast', text: t('habitTracker.completionModeAtLeast') }
  ]);
  const difficultyOptions = ref([
    { value: 'easy', text: t('habitTracker.difficultyEasy') },
    { value: 'medium', text: t('habitTracker.difficultyMedium') },
    { value: 'hard', text: t('habitTracker.difficultyHard') }
  ]);

  const pomodoroDurationOptions = ref(
    [5, 10, 15, 25, 30, 45, 60].map(value => ({
      value: String(value),
      text: formatTemplate('habitTracker.numberMinutesTemplate', { count: value })
    }))
  );

  return {
    newHabit,
    difficultyOptions,
    frequencyOptions,
    completionModeOptions,
    timesPerDayOptions,
    pomodoroDurationOptions
  };
};
