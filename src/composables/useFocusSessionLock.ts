import { computed, ref } from 'vue';

export type FocusSessionOwner = 'panel' | 'capsule';
type FocusSessionListener = (owner: FocusSessionOwner | null) => void;

const activeFocusSessionOwner = ref<FocusSessionOwner | null>(null);
const focusSessionListeners = new Set<FocusSessionListener>();
export const hasActiveFocusSession = computed(() => activeFocusSessionOwner.value !== null);

function notifyFocusSessionListeners(): void {
  const owner = activeFocusSessionOwner.value;
  focusSessionListeners.forEach((listener) => {
    try {
      listener(owner);
    } catch {
      // Ignore subscriber errors to keep lock state usable.
    }
  });
}

export function getActiveFocusSessionOwner(): FocusSessionOwner | null {
  return activeFocusSessionOwner.value;
}

export function setActiveFocusSessionOwner(owner: FocusSessionOwner | null): void {
  if (activeFocusSessionOwner.value === owner) {
    return;
  }
  activeFocusSessionOwner.value = owner;
  notifyFocusSessionListeners();
}

export function subscribeFocusSessionOwner(listener: FocusSessionListener): () => void {
  focusSessionListeners.add(listener);
  return () => {
    focusSessionListeners.delete(listener);
  };
}

export function useFocusSessionLock(owner: FocusSessionOwner) {
  const isLockedByOther = computed(() =>
    activeFocusSessionOwner.value !== null && activeFocusSessionOwner.value !== owner
  );

  function claimFocusSession(): boolean {
    if (isLockedByOther.value) {
      return false;
    }
    setActiveFocusSessionOwner(owner);
    return true;
  }

  function releaseFocusSession(): void {
    if (activeFocusSessionOwner.value === owner) {
      setActiveFocusSessionOwner(null);
    }
  }

  return {
    isLockedByOther,
    claimFocusSession,
    releaseFocusSession
  };
}
