import { shallowRef } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Habit } from '@/api';

const focusSessionPersistence = vi.hoisted(() => ({
  addFocusSession: vi.fn()
}));

const focusSessionLock = vi.hoisted(() => ({
  claimFocusSession: vi.fn(() => true),
  releaseFocusSession: vi.fn()
}));

const rewards = vi.hoisted(() => ({
  awardFocusSession: vi.fn(),
  awardHabitRewards: vi.fn()
}));

vi.mock('@/api', () => ({
  addFocusSession: focusSessionPersistence.addFocusSession
}));

vi.mock('@/composables/useFocusSessionLock', () => ({
  useFocusSessionLock: () => focusSessionLock
}));

vi.mock('@/rewardRepository', () => ({
  awardFocusSession: rewards.awardFocusSession,
  awardHabitRewards: rewards.awardHabitRewards
}));

import { useHabitPomodoro } from './useHabitPomodoro';

describe('useHabitPomodoro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    focusSessionLock.claimFocusSession.mockReturnValue(true);
    focusSessionPersistence.addFocusSession.mockResolvedValue(undefined);
    rewards.awardFocusSession.mockResolvedValue(undefined);
    rewards.awardHabitRewards.mockResolvedValue(undefined);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-09T08:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('cleans active state and releases the focus lock once when stopped', async () => {
    const habit = {
      id: 'habit-1',
      name: 'Read',
      pomodoroRemaining: 20 * 60,
      pomodoroState: 'work',
      isPomodoroPaused: true
    } as Habit;
    const habits = shallowRef([habit]);
    const saveHabits = vi.fn().mockResolvedValue(undefined);
    const pomodoro = useHabitPomodoro({
      habits,
      getToday: () => '2026-08-09',
      saveHabits,
      toggleHabitCompletion: () => null
    });

    pomodoro.activePomodoroHabit.value = habit;
    pomodoro.activePomodoroRemaining.value = 20 * 60;
    pomodoro.activePomodoroPaused.value = true;

    await pomodoro.stopCurrentPomodoro();

    expect(pomodoro.activePomodoroHabit.value).toBeNull();
    expect(pomodoro.activePomodoroRemaining.value).toBeUndefined();
    expect(pomodoro.activePomodoroPaused.value).toBe(false);
    expect(habit.pomodoroRemaining).toBeUndefined();
    expect(habit.pomodoroState).toBeUndefined();
    expect(habit.isPomodoroPaused).toBeUndefined();
    expect(saveHabits).toHaveBeenCalledOnce();
    expect(focusSessionLock.releaseFocusSession).toHaveBeenCalledOnce();
  });

  it('completes a fresh timer and records its configured duration', async () => {
    const habit = {
      id: 'habit-1',
      name: 'Read',
      emoji: 'book',
      pomodoroDuration: 1
    } as Habit;
    const habits = shallowRef([habit]);
    const saveHabits = vi.fn().mockResolvedValue(undefined);
    const toggleHabitCompletion = vi.fn(() => null);
    const pomodoro = useHabitPomodoro({
      habits,
      getToday: () => '2026-08-09',
      saveHabits,
      toggleHabitCompletion
    });
    pomodoro.activePomodoroHabit.value = habit;

    expect(pomodoro.startPomodoroTimer(habit)).toBe(true);
    expect(habit.pomodoroRemaining).toBe(60);
    expect(habit.pomodoroState).toBe('work');
    expect(habit.isPomodoroPaused).toBe(false);
    habit.pomodoroDuration = 20;

    await vi.advanceTimersByTimeAsync(60_000);

    expect(focusSessionPersistence.addFocusSession).toHaveBeenCalledWith(
      1,
      { type: 'habit', id: 'habit-1', name: 'Read', emoji: 'book' },
      { sessionId: expect.stringMatching(/^habit-pomodoro-/) }
    );
    expect(toggleHabitCompletion).toHaveBeenCalledWith(habit, '2026-08-09', { source: 'pomodoro' });
    expect(pomodoro.activePomodoroHabit.value).toBeNull();
    expect(pomodoro.activePomodoroRemaining.value).toBeUndefined();
    expect(focusSessionLock.releaseFocusSession).toHaveBeenCalledOnce();
  });

  it('resumes from the saved remaining seconds without resetting the duration', async () => {
    const habit = {
      id: 'habit-1',
      name: 'Read',
      pomodoroDuration: 25,
      pomodoroRemaining: 125,
      pomodoroState: 'shortBreak',
      isPomodoroPaused: true
    } as Habit;
    const habits = shallowRef([habit]);
    const pomodoro = useHabitPomodoro({
      habits,
      getToday: () => '2026-08-09',
      saveHabits: vi.fn().mockResolvedValue(undefined),
      toggleHabitCompletion: () => null
    });
    pomodoro.activePomodoroHabit.value = habit;
    pomodoro.activePomodoroRemaining.value = 125;
    pomodoro.activePomodoroPaused.value = true;

    await pomodoro.togglePomodoroResume();
    await vi.advanceTimersByTimeAsync(1_000);

    expect(habit.pomodoroRemaining).toBe(124);
    expect(habit.pomodoroState).toBe('shortBreak');
    expect(habit.isPomodoroPaused).toBe(false);
    expect(pomodoro.activePomodoroRemaining.value).toBe(124);
    expect(pomodoro.activePomodoroPaused.value).toBe(false);
    expect(focusSessionPersistence.addFocusSession).not.toHaveBeenCalled();

    await pomodoro.stopCurrentPomodoro();
  });

  it('uses the current duration when a resumed timer completes', async () => {
    const habit = {
      id: 'habit-1',
      name: 'Read',
      pomodoroDuration: 25,
      pomodoroRemaining: 1,
      pomodoroState: 'longBreak',
      isPomodoroPaused: true
    } as Habit;
    const habits = shallowRef([habit]);
    const pomodoro = useHabitPomodoro({
      habits,
      getToday: () => '2026-08-09',
      saveHabits: vi.fn().mockResolvedValue(undefined),
      toggleHabitCompletion: () => null
    });
    pomodoro.activePomodoroHabit.value = habit;

    await pomodoro.togglePomodoroResume();
    expect(habit.pomodoroState).toBe('longBreak');
    habit.pomodoroDuration = 2;
    await vi.advanceTimersByTimeAsync(1_000);

    expect(focusSessionPersistence.addFocusSession).toHaveBeenCalledWith(
      2,
      expect.objectContaining({ type: 'habit', id: 'habit-1', name: 'Read' }),
      { sessionId: expect.stringMatching(/^habit-pomodoro-/) }
    );
  });

  it('leaves a habit untouched when the focus lock cannot be claimed', () => {
    focusSessionLock.claimFocusSession.mockReturnValue(false);
    const habit = { id: 'habit-1', name: 'Read', pomodoroDuration: 25 } as Habit;
    const pomodoro = useHabitPomodoro({
      habits: shallowRef([habit]),
      getToday: () => '2026-08-09',
      saveHabits: vi.fn().mockResolvedValue(undefined),
      toggleHabitCompletion: () => null
    });

    expect(pomodoro.startPomodoroTimer(habit)).toBe(false);
    expect(habit.pomodoroRemaining).toBeUndefined();
    expect(habit.pomodoroState).toBeUndefined();
    expect(habit.isPomodoroPaused).toBeUndefined();
  });
});
