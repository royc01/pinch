import { ref } from 'vue';

export interface FocusCountupCheckpointSnapshot {
  sessionId: string;
  savedMinutes: number;
}

interface FocusCountupCheckpointOptions<TTarget> {
  isEnabled: () => boolean;
  getElapsedSeconds: () => number;
  createSessionId: () => string;
  getTarget: () => TTarget | null;
  upsertSession: (sessionId: string, minutes: number, target: TTarget | null) => Promise<void>;
  onSaved?: (detail: { minutes: number; sessionId: string; checkpoint: boolean }) => void;
}

export function useFocusCountupCheckpoint<TTarget>(options: FocusCountupCheckpointOptions<TTarget>) {
  const sessionId = ref('');
  const savedMinutes = ref(0);
  let isSaving = false;
  let hasPendingSave = false;

  function ensureSessionId(): string {
    if (!sessionId.value) {
      sessionId.value = options.createSessionId();
    }
    return sessionId.value;
  }

  function reset(): void {
    sessionId.value = '';
    savedMinutes.value = 0;
    isSaving = false;
    hasPendingSave = false;
  }

  function restore(snapshot: FocusCountupCheckpointSnapshot): void {
    sessionId.value = snapshot.sessionId || '';
    savedMinutes.value = Number.isFinite(snapshot.savedMinutes) ? snapshot.savedMinutes : 0;
  }

  function getElapsedFocusMinutes(): number {
    if (!options.isEnabled()) {
      return 0;
    }
    return Math.floor(options.getElapsedSeconds() / 60);
  }

  async function save(final = false, minutesOverride?: number): Promise<void> {
    if (!options.isEnabled()) {
      return;
    }

    const minutes = typeof minutesOverride === 'number'
      ? Math.max(0, Math.floor(minutesOverride))
      : getElapsedFocusMinutes();
    if (minutes <= savedMinutes.value) {
      return;
    }

    if (isSaving) {
      hasPendingSave = true;
      return;
    }

    isSaving = true;
    try {
      const nextSessionId = ensureSessionId();
      await options.upsertSession(nextSessionId, minutes, options.getTarget());
      const savedDelta = Math.max(0, minutes - savedMinutes.value);
      savedMinutes.value = Math.max(savedMinutes.value, minutes);
      if (savedDelta > 0) {
        options.onSaved?.({
          minutes: savedDelta,
          sessionId: nextSessionId,
          checkpoint: !final
        });
      }
    } finally {
      isSaving = false;
      if (hasPendingSave) {
        hasPendingSave = false;
        void save(final);
      }
    }
  }

  return {
    sessionId,
    savedMinutes,
    getElapsedFocusMinutes,
    reset,
    restore,
    save
  };
}
