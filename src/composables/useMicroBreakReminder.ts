import { onBeforeUnmount, ref, type Ref } from 'vue';

export interface MicroBreakSettings {
  microBreakEnabled?: boolean;
  microBreakSystemNotification?: boolean;
  microBreakPopup?: boolean;
  microBreakSound?: boolean;
  microBreakMinIntervalMinutes?: number;
  microBreakMaxIntervalMinutes?: number;
  microBreakDurationSeconds?: number;
}

interface UseMicroBreakReminderOptions {
  settings: Ref<MicroBreakSettings>;
  notify: (title: string, body: string) => void;
  playSound?: () => void;
  getText: (key: 'startTitle' | 'startBody' | 'endTitle' | 'endBody') => string;
}

function normalizePositiveInteger(value: unknown, fallback: number): number {
  const normalized = typeof value === 'number' ? Math.floor(value) : Number(value);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : fallback;
}

export function useMicroBreakReminder(options: UseMicroBreakReminderOptions) {
  const isMicroBreakVisible = ref(false);
  const remainingMicroBreakSeconds = ref(0);
  let reminderTimer: number | null = null;
  let countdownTimer: number | null = null;

  const clearTimers = () => {
    if (reminderTimer !== null) {
      window.clearTimeout(reminderTimer);
      reminderTimer = null;
    }
    if (countdownTimer !== null) {
      window.clearInterval(countdownTimer);
      countdownTimer = null;
    }
  };

  const hideMicroBreak = () => {
    isMicroBreakVisible.value = false;
    remainingMicroBreakSeconds.value = 0;
  };

  const getSettings = () => {
    const min = normalizePositiveInteger(options.settings.value.microBreakMinIntervalMinutes, 3);
    const max = Math.max(min, normalizePositiveInteger(options.settings.value.microBreakMaxIntervalMinutes, 5));
    return {
      enabled: options.settings.value.microBreakEnabled === true,
      popup: options.settings.value.microBreakPopup !== false,
      notification: options.settings.value.microBreakSystemNotification === true,
      sound: options.settings.value.microBreakSound !== false,
      min,
      max,
      duration: normalizePositiveInteger(options.settings.value.microBreakDurationSeconds, 10)
    };
  };

  const scheduleNext = () => {
    const settings = getSettings();
    if (!settings.enabled) {
      return;
    }

    const delayMinutes = settings.min + Math.random() * (settings.max - settings.min);
    reminderTimer = window.setTimeout(() => {
      reminderTimer = null;
      const current = getSettings();
      if (!current.enabled) {
        return;
      }

      if (current.sound) {
        options.playSound?.();
      }
      if (current.notification) {
        options.notify(options.getText('startTitle'), options.getText('startBody'));
      }
      if (!current.popup) {
        scheduleNext();
        return;
      }

      isMicroBreakVisible.value = true;
      remainingMicroBreakSeconds.value = current.duration;
      countdownTimer = window.setInterval(() => {
        remainingMicroBreakSeconds.value -= 1;
        if (remainingMicroBreakSeconds.value > 0) {
          return;
        }
        if (countdownTimer !== null) {
          window.clearInterval(countdownTimer);
          countdownTimer = null;
        }
        hideMicroBreak();
        if (current.notification) {
          options.notify(options.getText('endTitle'), options.getText('endBody'));
        }
        scheduleNext();
      }, 1000);
    }, delayMinutes * 60 * 1000);
  };

  const startMicroBreakReminder = () => {
    clearTimers();
    hideMicroBreak();
    scheduleNext();
  };

  const stopMicroBreakReminder = () => {
    clearTimers();
    hideMicroBreak();
  };

  onBeforeUnmount(stopMicroBreakReminder);

  return {
    isMicroBreakVisible,
    remainingMicroBreakSeconds,
    startMicroBreakReminder,
    stopMicroBreakReminder
  };
}
