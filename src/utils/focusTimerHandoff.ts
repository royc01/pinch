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
  whiteNoiseEnabled: boolean;
  selectedWhiteNoiseId: string;
  whiteNoiseVolume: number;
  microBreakSettings?: {
    microBreakEnabled?: boolean;
    microBreakPopup?: boolean;
    microBreakSound?: boolean;
    microBreakMinIntervalMinutes?: number;
    microBreakMaxIntervalMinutes?: number;
    microBreakDurationSeconds?: number;
    shortBreakPopup?: boolean;
    focusCompletePopup?: boolean;
    customWhiteNoiseFile?: string;
    customMicroBreakSoundFile?: string;
  };
  linkedTarget: FocusTimerLinkedTarget | null;
};
