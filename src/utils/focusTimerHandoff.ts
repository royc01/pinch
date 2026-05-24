import type { FocusTimerLinkedTarget } from '@/utils/focusTimerTarget';

export type FocusTimerHandoffState = {
  timerMode: 'countdown' | 'countup';
  selectedDuration: number;
  durationIndex: number;
  shortBreakDuration: number;
  shortBreakDurationIndex: number;
  pomodoroSets: number;
  phaseElapsedSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  isBreakMode: boolean;
  currentSet: number;
  countupSessionId: string;
  savedCountupMinutes: number;
  linkedTarget: FocusTimerLinkedTarget | null;
};
