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
  let pendingSave: { final: boolean; minutesOverride?: number } | null = null;
  let saveLoopPromise: Promise<void> | null = null;

  function ensureSessionId(): string {
    if (!sessionId.value) {
      sessionId.value = options.createSessionId();
    }
    return sessionId.value;
  }

  function reset(): void {
    sessionId.value = '';
    savedMinutes.value = 0;
    pendingSave = null;
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

    const normalizedOverride = typeof minutesOverride === 'number'
      ? Math.max(0, Math.floor(minutesOverride))
      : undefined;
    if (pendingSave) {
      pendingSave.final ||= final;
      pendingSave.minutesOverride = pendingSave.minutesOverride === undefined || normalizedOverride === undefined
        ? undefined
        : Math.max(pendingSave.minutesOverride, normalizedOverride);
    } else {
      pendingSave = { final, minutesOverride: normalizedOverride };
    }

    if (!saveLoopPromise) {
      saveLoopPromise = (async () => {
        while (pendingSave) {
          const request = pendingSave;
          pendingSave = null;
          const minutes = request.minutesOverride ?? getElapsedFocusMinutes();
          if (minutes <= savedMinutes.value) continue;
          const nextSessionId = ensureSessionId();
          await options.upsertSession(nextSessionId, minutes, options.getTarget());
          const savedDelta = Math.max(0, minutes - savedMinutes.value);
          savedMinutes.value = Math.max(savedMinutes.value, minutes);
          if (savedDelta > 0) {
            options.onSaved?.({
              minutes: savedDelta,
              sessionId: nextSessionId,
              checkpoint: !request.final
            });
          }
        }
      })().finally(() => {
        saveLoopPromise = null;
      });
    }
    return saveLoopPromise;
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
