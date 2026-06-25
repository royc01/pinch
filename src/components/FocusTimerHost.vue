<template>
  <FocusTimer
    :show="showFocusTimer"
    :mini-enabled="floatingFocusEnabled"
    :linked-target="linkedTarget"
    @update:miniEnabled="floatingFocusEnabled = $event"
    @complete-linked-target="handleCompleteLinkedTarget"
    @update-linked-target="linkedTarget = $event"
    @clear-linked-target="linkedTarget = null"
    @open-linked-target="handleOpenLinkedTarget"
    @handoff-to-mini="handleHandoffToMini"
    @close="showFocusTimer = false"
  />

  <FloatingFocusCapsule
    ref="floatingFocusCapsuleRef"
    :enabled="floatingFocusEnabled"
    :linked-target="linkedTarget"
    @update-linked-target="linkedTarget = $event"
    @clear-linked-target="linkedTarget = null"
    @complete-linked-target="handleCompleteLinkedTarget"
    @open-linked-target="handleOpenLinkedTarget"
    @disable-floating-focus="floatingFocusEnabled = false"
  />
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import FocusTimer from '@/components/FocusTimer.vue';
import FloatingFocusCapsule from '@/components/FloatingFocusCapsule.vue';
import { hasActiveFocusSession } from '@/composables/useFocusSessionLock';
import {
  subscribeDetachedFocusCompleteLinkedTarget,
  subscribeDetachedFocusDisableRequest,
  subscribeDetachedFocusLinkedTargetChange
} from '@/utils/detachedFocusWindow';
import {
  openFocusTimerLinkedTarget,
  type FocusTimerLinkedTarget
} from '@/utils/focusTimerTarget';
import type { FocusTimerHandoffState } from '@/utils/focusTimerHandoff';

const FLOATING_FOCUS_STORAGE_KEY = 'pinch-floating-focus-enabled';

const showFocusTimer = ref(false);
const floatingFocusEnabled = ref(false);
const linkedTarget = ref<FocusTimerLinkedTarget | null>(null);
const floatingFocusCapsuleRef = ref<{
  openSettingsPanel: () => void;
  acceptPanelHandoff: (state: FocusTimerHandoffState) => void;
} | null>(null);
let unsubscribeDetachedFocusDisableRequest: (() => void) | null = null;
let unsubscribeDetachedFocusLinkedTargetChange: (() => void) | null = null;
let unsubscribeDetachedFocusCompleteLinkedTarget: (() => void) | null = null;

const emit = defineEmits<{
  completeLinkedHabit: [habitId: string];
  completeLinkedTarget: [target: FocusTimerLinkedTarget];
  visibilityChange: [visible: boolean];
}>();

function open(
  target: FocusTimerLinkedTarget | null = null,
  options: { showPanel?: boolean } = {}
): void {
  const shouldShowPanel = options.showPanel !== false;
  if (shouldShowPanel) {
    showFocusTimer.value = true;
  }
  if (hasActiveFocusSession.value) {
    return;
  }
  linkedTarget.value = target;
}

function syncTarget(
  target: FocusTimerLinkedTarget | null = null,
  options: { openMiniSettings?: boolean } = {}
): void {
  open(target, { showPanel: false });
  if (options.openMiniSettings) {
    void nextTick(() => {
      floatingFocusCapsuleRef.value?.openSettingsPanel();
    });
  }
}

function close(): void {
  showFocusTimer.value = false;
}

function handleCompleteLinkedTarget(target: FocusTimerLinkedTarget): void {
  emit('completeLinkedTarget', target);

  if (target.type === 'habit') {
    emit('completeLinkedHabit', target.id);
  }
}

function handleOpenLinkedTarget(target: FocusTimerLinkedTarget): void {
  void openFocusTimerLinkedTarget(target);
}

function handleHandoffToMini(state: FocusTimerHandoffState): void {
  linkedTarget.value = state.linkedTarget;
  floatingFocusEnabled.value = true;
  showFocusTimer.value = false;
  void nextTick(() => {
    floatingFocusCapsuleRef.value?.acceptPanelHandoff(state);
  });
}

watch(floatingFocusEnabled, (value) => {
  try {
    localStorage.setItem(FLOATING_FOCUS_STORAGE_KEY, value ? 'true' : 'false');
  } catch (error) {
  }
});

watch(showFocusTimer, (visible) => {
  emit('visibilityChange', visible);
});

onMounted(() => {
  unsubscribeDetachedFocusDisableRequest = subscribeDetachedFocusDisableRequest(() => {
    floatingFocusEnabled.value = false;
  });
  unsubscribeDetachedFocusLinkedTargetChange = subscribeDetachedFocusLinkedTargetChange((target) => {
    linkedTarget.value = target;
  });
  unsubscribeDetachedFocusCompleteLinkedTarget = subscribeDetachedFocusCompleteLinkedTarget((target) => {
    handleCompleteLinkedTarget(target);
  });

  try {
    const savedState = localStorage.getItem(FLOATING_FOCUS_STORAGE_KEY);
    if (savedState !== null) {
      floatingFocusEnabled.value = savedState === 'true';
    }
  } catch (error) {
  }
});

onBeforeUnmount(() => {
  unsubscribeDetachedFocusDisableRequest?.();
  unsubscribeDetachedFocusDisableRequest = null;
  unsubscribeDetachedFocusLinkedTargetChange?.();
  unsubscribeDetachedFocusLinkedTargetChange = null;
  unsubscribeDetachedFocusCompleteLinkedTarget?.();
  unsubscribeDetachedFocusCompleteLinkedTarget = null;
});

defineExpose({
  open,
  close,
  syncTarget
});
</script>
