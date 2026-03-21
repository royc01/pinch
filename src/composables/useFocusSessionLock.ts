import { computed, ref } from 'vue';

export type FocusSessionOwner = 'panel' | 'capsule';

const activeFocusSessionOwner = ref<FocusSessionOwner | null>(null);

export function useFocusSessionLock(owner: FocusSessionOwner) {
  const isLockedByOther = computed(() =>
    activeFocusSessionOwner.value !== null && activeFocusSessionOwner.value !== owner
  );

  function claimFocusSession(): boolean {
    if (isLockedByOther.value) {
      return false;
    }
    activeFocusSessionOwner.value = owner;
    return true;
  }

  function releaseFocusSession(): void {
    if (activeFocusSessionOwner.value === owner) {
      activeFocusSessionOwner.value = null;
    }
  }

  return {
    isLockedByOther,
    claimFocusSession,
    releaseFocusSession
  };
}
