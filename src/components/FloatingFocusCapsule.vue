<template>
  <Teleport v-if="shouldRenderInlineCapsule" :to="teleportTarget">
    <div class="floating-focus" :style="wrapperStyle">
      <div
        ref="capsuleRef"
        class="floating-focus__capsule"
        :class="{
          'is-paused': isPaused,
          'is-dragging': isDragging,
          'is-compact': !linkedTarget && !isActive,
          'is-progress-only': !linkedTarget && isActive,
          'has-linked-target': !!linkedTarget
        }"
        :style="progressStyle"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        <button
          type="button"
          class="floating-focus__close ariaLabel"
          data-no-drag
         
          :aria-label="t('focusTimer.closeMiniFocus')"
          @click.stop="closeInlineMiniFocus"
        >
          <Icon name="close" width="8" height="8" class="icon" />
        </button>
        <button
          v-if="!isActive"
          type="button"
          class="floating-focus__dot ariaLabel"
          data-no-drag
         
          :aria-label="t('focusTimer.settings')"
          @click.stop="toggleSettings"
        >
          <Icon name="timer" width="16" height="16" class="icon" />
        </button>
        <button
          v-if="linkedTarget && canOpenLinkedTarget"
          type="button"
          class="floating-focus__target ariaLabel"
          data-no-drag
         
          :aria-label="linkedTargetLabel"
          @click.stop="emit('open-linked-target', linkedTarget)"
        >
          {{ linkedTargetLabel }}
        </button>
        <span
          v-else-if="linkedTarget"
          class="floating-focus__target-label ariaLabel"
          :aria-label="linkedTargetLabel"
        >
          {{ linkedTargetLabel }}
        </span>
        <button
          v-if="!isActive"
          type="button"
          class="floating-focus__duration ariaLabel"
          data-no-drag
          :disabled="isTimerActive"
          :aria-label="t('focusTimer.cycleDuration')"
          @click="cycleDuration"
        >
          {{ focusDurationButtonText }}
        </button>
        <span v-else class="floating-focus__time">{{ displayTime }}</span>
        <div v-if="linkedTarget || isActive" class="floating-focus__progress-track" aria-hidden="true">
          <span class="floating-focus__progress-fill"></span>
        </div>
        <div class="floating-focus__actions">
          <button
            v-if="isActive"
            type="button"
            class="floating-focus__action is-stop ariaLabel"
            data-no-drag
            :aria-label="t('focusTimer.stop')"
            @click.stop="stopTimer(true)"
          >
            <Icon name="stop" width="12" height="12" class="icon" />
          </button>
          <button
            type="button"
            class="floating-focus__action ariaLabel"
            data-no-drag
           
            :aria-label="isStartBlockedByOther && !isActive ? t('focusTimer.panelFocusRunning') : actionTitle"
            :disabled="isStartBlockedByOther && !isActive"
            @click.stop="toggleStartPause"
          >
            <Icon :name="actionIcon" width="12" height="12" class="icon" />
          </button>
        </div>
        <div
          v-if="showSettings"
          ref="settingsRef"
          class="floating-focus__popover"
          data-no-drag
          @click.stop
        >
          <div class="timer-settings">
            <div class="setting-section linked-target-setting">
              <div class="setting-label">
                <span>{{ t('focusTimer.linkedTarget') }}</span>
              </div>
              <div v-if="linkedTarget" class="linked-habit-banner__chip-row">
                <button
                  type="button"
                  class="linked-habit-banner__chip ariaLabel"
                  :disabled="!canOpenLinkedTarget"
                 
                  :aria-label="linkedTargetLabel"
                  @click="openLinkedTarget"
                >
                  <FocusTargetIcon class="linked-habit-banner__emoji" :icon="linkedTargetDisplayEmoji" />
                  <span class="linked-habit-banner__name">{{ linkedTargetLabel }}</span>
                  <Icon v-if="canOpenLinkedTarget" name="open" width="12" height="12" class="icon" />
                </button>
                <button
                  type="button"
                  class="linked-habit-banner__clear ariaLabel"
                  :disabled="isLinkedTargetLocked"
                 
                  :aria-label="t('focusTimer.clearLinkedTarget')"
                  @click="clearLinkedTarget"
                >
                  <Icon name="close" width="12" height="12" class="icon" />
                </button>
              </div>
              <div v-else class="linked-habit-banner__actions">
                <button
                  type="button"
                  class="linked-habit-banner__action"
                  :disabled="isLinkedTargetLocked"
                  @click="openTargetPicker('habit')"
                >
                  {{ t('focusTimer.linkHabit') }}
                </button>
                <button
                  type="button"
                  class="linked-habit-banner__action"
                  :disabled="isLinkedTargetLocked"
                  @click="openTargetPicker('task')"
                >
                  {{ t('focusTimer.linkTask') }}
                </button>
              </div>
              <div v-if="targetPickerMode" class="linked-habit-banner__picker">
                <div class="linked-habit-banner__picker-header">
                  <span>{{ targetPickerTitle }}</span>
                  <button
                    type="button"
                    class="linked-habit-banner__picker-close ariaLabel"
                   
                    :aria-label="t('common.close')"
                    @click="closeTargetPicker"
                  >
                    <Icon name="close" width="12" height="12" class="icon" />
                  </button>
                </div>
                <input
                  v-model.trim="targetSearch"
                  class="linked-habit-banner__search"
                  type="text"
                  :placeholder="targetPickerPlaceholder"
                />
                <div v-if="isLoadingTargetOptions" class="linked-habit-banner__picker-state">
                  {{ t('taskManager.loading') }}
                </div>
                <div v-else-if="targetOptionsError" class="linked-habit-banner__picker-state is-error">
                  {{ targetOptionsError }}
                </div>
                <div v-else-if="filteredTargetOptions.length === 0" class="linked-habit-banner__picker-state">
                  {{ targetPickerEmptyText }}
                </div>
                <div v-else class="linked-habit-banner__picker-list">
                  <button
                    v-for="target in filteredTargetOptions"
                    :key="`${target.type}-${target.id}`"
                    type="button"
                    class="linked-habit-banner__picker-item"
                    @click="selectLinkedTarget(target)"
                  >
                    <span class="linked-habit-banner__picker-item-main">
                      <FocusTargetIcon class="linked-habit-banner__emoji" :icon="getTargetEmoji(target)" />
                      <span class="linked-habit-banner__picker-item-name">{{ target.name }}</span>
                    </span>
                    <span
                      v-if="target.type === 'habit' && target.preferredDuration"
                      class="linked-habit-banner__picker-item-meta"
                    >
                      {{ target.preferredDuration }}m
                    </span>
                  </button>
                </div>
              </div>
            </div>
            <div class="setting-section">
              <div class="setting-label">
                <span>{{ t('focusTimer.focusDuration') }}</span>
                <span class="duration-value">{{ focusDurationValueText }}</span>
              </div>
              <div class="duration-slider-container">
                <input
                  type="range"
                  v-model.number="durationIndex"
                  @input="updateDurationByIndex"
                  min="0"
                  :max="durationOptions.length - 1"
                  step="1"
                  class="duration-slider"
                  :disabled="isTimerActive"
                  style="accent-color: var(--b3-theme-on-background)"
                />
                <div class="duration-marks">
                  <span
                    v-for="(mark, index) in durationOptions"
                    :key="`${mark}-${index}`"
                    class="duration-mark"
                    :style="{ left: `${(index / (durationOptions.length - 1)) * 100}%` }"
                  >
                    {{ mark === 'unlimited' ? t('focusTimer.infinity') : mark }}
                  </span>
                </div>
              </div>
            </div>

            <div class="setting-section">
              <div class="setting-label">
                <span>{{ t('focusTimer.shortBreakDuration') }}</span>
                <span class="duration-value">{{ shortBreakDuration }}{{ t('focusTimer.minuteSuffix') }}</span>
              </div>
              <div class="duration-slider-container">
                <input
                  type="range"
                  v-model.number="shortBreakDurationIndex"
                  @input="updateShortBreakDuration"
                  min="0"
                  :max="shortBreakMarks.length - 1"
                  step="1"
                  class="duration-slider"
                  :disabled="isPomodoroSettingsLocked"
                  style="accent-color: var(--b3-theme-on-background)"
                />
                <div class="duration-marks">
                  <span
                    v-for="(mark, index) in shortBreakMarks"
                    :key="mark"
                    class="duration-mark"
                    :style="{ left: `${(index / (shortBreakMarks.length - 1)) * 100}%` }"
                  >
                    {{ mark }}
                  </span>
                </div>
              </div>
            </div>

            <div class="setting-section">
              <div class="setting-label">
                <span>{{ t('focusTimer.focusSets') }}</span>
                <span class="duration-value">{{ pomodoroSets }}{{ t('focusTimer.setSuffix') }}</span>
              </div>
              <div class="duration-slider-container">
                <input
                  type="range"
                  v-model.number="pomodoroSets"
                  @input="updatePomodoroSets"
                  min="1"
                  :max="pomodoroSetMarks[pomodoroSetMarks.length - 1]"
                  step="1"
                  class="duration-slider"
                  :disabled="isPomodoroSettingsLocked"
                  style="accent-color: var(--b3-theme-on-background)"
                />
                <div class="duration-marks">
                  <span
                    v-for="(mark, index) in pomodoroSetMarks"
                    :key="mark"
                    class="duration-mark"
                    :style="{ left: `${(index / (pomodoroSetMarks.length - 1)) * 100}%` }"
                  >
                    {{ mark }}
                  </span>
                </div>
              </div>
            </div>

            <div class="setting-section white-noise-setting">
              <div class="setting-label">
                <span>{{ t('focusTimer.whiteNoise') }}</span>
                <label class="switch">
                  <input v-model="whiteNoiseEnabled" type="checkbox" @change="toggleWhiteNoise" />
                  <span class="slider round"></span>
                </label>
              </div>
              <div class="floating-focus__sound-selector" :class="{ disabled: !whiteNoiseEnabled }">
                <button
                  v-for="sound in whiteNoiseOptions"
                  :key="sound.id"
                  type="button"
                  class="floating-focus__sound-button ariaLabel"
                  :class="{ active: selectedWhiteNoiseId === sound.id }"
                  :disabled="!whiteNoiseEnabled"
                  :aria-label="`${t('focusTimer.pickSoundPrefix')}${sound.name}`"
                  @click="selectWhiteNoise(sound.id)"
                >
                  <Icon :name="sound.icon" width="16" height="16" class="icon" />
                </button>
                <button
                  v-if="userSettings.focus.customWhiteNoiseFile"
                  type="button"
                  class="floating-focus__sound-button ariaLabel"
                  :class="{ active: selectedWhiteNoiseId === 'custom' }"
                  :disabled="!whiteNoiseEnabled"
                  :aria-label="t('taskScopeDialog.customWhiteNoise')"
                  @click="selectWhiteNoise('custom')"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M21.65 2.24a1 1 0 0 0-.8-.23l-13 2A1 1 0 0 0 7 5v10.35A3.45 3.45 0 0 0 5.5 15a3.5 3.5 0 1 0 3.5 3.5v-7.64L20 9.17v4.18A3.45 3.45 0 0 0 18.5 13a3.5 3.5 0 1 0 3.5 3.5V3a1 1 0 0 0-.35-.76ZM5.5 20A1.5 1.5 0 1 1 7 18.5 1.5 1.5 0 0 1 5.5 20Zm13-2A1.5 1.5 0 1 1 20 16.5 1.5 1.5 0 0 1 18.5 18ZM20 7.14 9 8.83v-3l11-1.66Z" />
                  </svg>
                </button>
              </div>
              <div v-if="whiteNoiseEnabled" class="floating-focus__volume-control">
                <span aria-hidden="true">🔊</span>
                <input
                  v-model.number="whiteNoiseVolume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  :aria-label="t('focusTimer.whiteNoise')"
                  @input="updateWhiteNoiseVolume"
                />
                <span>{{ Math.round(whiteNoiseVolume * 100) }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
  <Teleport v-if="showCloseConfirm" to="body">
    <div class="mini-focus-exit-overlay" @click.self="cancelCloseMiniFocus">
      <div
        class="mini-focus-exit-dialog ariaLabel"
        role="dialog"
        aria-modal="true"
        :aria-label="t('focusTimer.closeMiniFocus')"
      >
        <div class="mini-focus-exit-dialog__title">{{ t('focusTimer.closeMiniFocus') }}</div>
        <div class="mini-focus-exit-dialog__message">{{ t('focusTimer.miniExitConfirm') }}</div>
        <div class="mini-focus-exit-dialog__actions">
          <button type="button" class="mini-focus-exit-dialog__btn" @click="cancelCloseMiniFocus">
            {{ t('common.cancel') }}
          </button>
          <button type="button" class="mini-focus-exit-dialog__btn is-danger" @click="confirmCloseMiniFocus">
            {{ t('focusTimer.stopAndExit') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, toRefs, watch } from 'vue';
import Icon from '@/components/Icon.vue';
import FocusTargetIcon from '@/components/FocusTargetIcon.vue';
import { addFocusSession, upsertFocusSessionRecord } from '@/api';
import { useFocusSessionLock } from '@/composables/useFocusSessionLock';
import { useI18n } from '@/composables/useI18n';
import { useMicroBreakReminder } from '@/composables/useMicroBreakReminder';
import { useUserSettings } from '@/composables/useUserSettings';
import { getStoredFocusAudioUrl, playCustomFocusAudio, playTaskCompletionSound, prepareCustomFocusAudio, prepareTaskCompletionSound } from '@/utils/completionSound';
import { awardFocusSession } from '@/rewardRepository';
import {
  closeDetachedFocusWindow,
  handoffDetachedFocusSession,
  isDetachedFocusWindowSupported,
  openDetachedFocusWindowSettings,
  showDetachedMicroBreakWindow,
  subscribeDetachedFocusHostWindowState,
  syncDetachedFocusWindow,
  takeDetachedFocusSessionHandoff
} from '@/utils/detachedFocusWindow';
import type { FocusTimerLinkedTarget } from '@/utils/focusTimerTarget';
import type { FocusTimerHandoffState } from '@/utils/focusTimerHandoff';
import {
  filterFocusTargetOptions,
  getFocusTargetDisplayLabel,
  getFocusTargetEmoji,
  loadHabitFocusTargetOptions,
  loadTaskFocusTargetOptions,
  type FocusTargetPickerMode
} from '@/utils/focusTimerTargetPicker';

type TimerMode = 'countdown' | 'countup';
type DurationOption = number | 'unlimited';

const props = withDefaults(defineProps<{
  enabled: boolean;
  linkedTarget?: FocusTimerLinkedTarget | null;
}>(), {
  enabled: false,
  linkedTarget: null
});
const { linkedTarget } = toRefs(props);
const emit = defineEmits<{
  'open-linked-target': [target: FocusTimerLinkedTarget];
  'update-linked-target': [target: FocusTimerLinkedTarget | null];
  'clear-linked-target': [];
  'complete-linked-target': [target: FocusTimerLinkedTarget];
  'disable-floating-focus': [];
  'micro-break-change': [visible: boolean, remainingSeconds: number];
}>();
const { t } = useI18n();
const { data: userSettings, loadSettings, updateSettings } = useUserSettings();

const STORAGE_KEY = 'pinch-floating-focus-position';
const EDGE_PADDING = 12;
const DRAG_THRESHOLD = 5;

const containerEl = ref<HTMLElement | null>(null);
const capsuleRef = ref<HTMLElement | null>(null);
const position = ref({ x: 0, y: 0 });
const storedPosition = ref<{ x: number; y: number } | null>(null);
const storedRatio = ref<{ x: number; y: number } | null>(null);
const containerResizeObserver = ref<ResizeObserver | null>(null);
const isDragging = ref(false);
const dragMoved = ref(false);
const dragStart = ref({ x: 0, y: 0 });
const dragOrigin = ref({ x: 0, y: 0 });
const isHostWindowDetached = ref(false);
const detachedFocusOwnsState = ref(false);
let unsubscribeHostWindowState: (() => void) | null = null;
let restoreDetachedFocusPromise: Promise<void> | null = null;
let hostWindowSyncTimer: number | null = null;
let hasLoadedPosition = false;

const durationMarks = [5, 10, 15, 25, 30, 45, 60];
const durationOptions: DurationOption[] = [...durationMarks, 'unlimited'];
const shortBreakMarks = [1, 3, 5, 10, 15];
const pomodoroSetMarks = [1, 2, 3, 4, 5, 6, 7, 8];
const FOCUS_SESSION_EVENT = 'pinch-focus-session';
const FOCUS_COUNTUP_AUTOSAVE_INTERVAL_MS = 60_000;

const durationIndex = ref(3);
const shortBreakDurationIndex = ref(2);
const selectedDuration = ref(durationMarks[durationIndex.value]);
const shortBreakDuration = ref(shortBreakMarks[shortBreakDurationIndex.value]);
const pomodoroSets = ref(1);
const timerMode = ref<TimerMode>('countdown');
const {
  isLockedByOther: isStartBlockedByOther,
  claimFocusSession,
  releaseFocusSession
} = useFocusSessionLock('capsule');
const supportsDetachedFocusWindow = isDetachedFocusWindowSupported();

const phaseElapsedSeconds = ref(0);
const isRunning = ref(false);
const isPaused = ref(false);
const showCloseConfirm = ref(false);
const isBreakMode = ref(false);
const currentSet = ref(1);
const timerInterval = ref<number | null>(null);
const timerDeadline = ref<number>(0);
const timerStartedAt = ref(0);
const countupSessionId = ref('');
const savedCountupMinutes = ref(0);
const isSavingCountupCheckpoint = ref(false);
const hasPendingCountupCheckpoint = ref(false);
const showSettings = ref(false);
const settingsRef = ref<HTMLElement | null>(null);
const whiteNoiseEnabled = ref(false);
const selectedWhiteNoiseId = ref('rain');
const whiteNoiseVolume = ref(0.3);
const whiteNoiseAudio = ref<HTMLAudioElement | null>(null);
const targetPickerMode = ref<FocusTargetPickerMode | null>(null);
const targetSearch = ref('');
const isLoadingTargetOptions = ref(false);
const targetOptionsError = ref('');
const habitTargetOptions = ref<FocusTimerLinkedTarget[]>([]);
const taskTargetOptions = ref<FocusTimerLinkedTarget[]>([]);

const showMicroBreakNotification = (title: string, body: string) => {
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '☕' });
  }
};

const {
  isMicroBreakVisible,
  remainingMicroBreakSeconds,
  startMicroBreakReminder,
  stopMicroBreakReminder
} = useMicroBreakReminder({
  settings: computed(() => userSettings.focus),
  notify: showMicroBreakNotification,
  playSound: () => {
    void playCustomFocusAudio(userSettings.focus.customMicroBreakSoundFile, 0.3)
      .then(played => { if (!played) playTaskCompletionSound(0.3); });
  },
  getText: (key) => ({
    startTitle: t('focusTimer.microBreakStartTitle'),
    startBody: t('focusTimer.microBreakStartBody'),
    endTitle: t('focusTimer.microBreakEndTitle'),
    endBody: t('focusTimer.microBreakEndBody')
  })[key]
});

watch([isMicroBreakVisible, remainingMicroBreakSeconds], ([visible, remainingSeconds]) => {
  emit('micro-break-change', visible, remainingSeconds);
}, { immediate: true });

const teleportTarget = computed(() => containerEl.value || 'body');
const shouldUseDetachedFocusWindow = computed(() =>
  props.enabled && supportsDetachedFocusWindow
);
const shouldRenderInlineCapsule = computed(() => props.enabled && !shouldUseDetachedFocusWindow.value);

const durationMinutes = computed(() => selectedDuration.value);
const isActive = computed(() => isRunning.value || isPaused.value);
const isTimerActive = computed(() => isRunning.value || isPaused.value);
const isPomodoroSettingsLocked = computed(() =>
  isTimerActive.value || timerMode.value === 'countup'
);
const focusDurationValueText = computed(() =>
  timerMode.value === 'countup' ? t('focusTimer.countup') : `${selectedDuration.value}${t('focusTimer.minuteSuffix')}`
);
const focusDurationButtonText = computed(() =>
  timerMode.value === 'countup' ? '00:00' : `${String(durationMinutes.value).padStart(2, '0')}:00`
);
const isLinkedTargetLocked = computed(() => isRunning.value || isPaused.value);
const linkedTargetLabel = computed(() => {
  return getFocusTargetDisplayLabel(linkedTarget.value);
});
const linkedTargetDisplayEmoji = computed(() => getFocusTargetEmoji(linkedTarget.value));
const canOpenLinkedTarget = computed(() =>
  !!linkedTarget.value && (linkedTarget.value.type === 'habit' || !!linkedTarget.value.blockId)
);
const filteredTargetOptions = computed(() => {
  const source = targetPickerMode.value === 'habit'
    ? habitTargetOptions.value
    : taskTargetOptions.value;
  return filterFocusTargetOptions(source, targetSearch.value);
});
const targetPickerTitle = computed(() =>
  targetPickerMode.value === 'habit' ? t('focusTimer.selectHabit') : t('focusTimer.selectTask')
);
const targetPickerPlaceholder = computed(() =>
  targetPickerMode.value === 'habit' ? t('focusTimer.searchHabit') : t('focusTimer.searchTask')
);
const targetPickerEmptyText = computed(() =>
  `${t('focusTimer.noLinkablePrefix')}${targetPickerMode.value === 'habit' ? t('focusTimer.habit') : t('focusTimer.task')}`
);
const phaseDurationSeconds = computed(() =>
  (isBreakMode.value ? shortBreakDuration.value : durationMinutes.value) * 60
);

const whiteNoiseOptions = [
  { id: 'rain', name: t('focusTimer.soundRain'), icon: 'rain' },
  { id: 'jungle', name: t('focusTimer.soundForest'), icon: 'jungle' },
  { id: 'waves', name: t('focusTimer.soundWaves'), icon: 'waves' },
  { id: 'campfire', name: t('focusTimer.soundCampfire'), icon: 'campfire' },
  { id: 'river', name: t('focusTimer.soundRiver'), icon: 'river' }
];

const whiteNoiseFiles: Record<string, string> = {
  rain: 'rain.ogg',
  jungle: 'jungle.ogg',
  waves: 'waves.ogg',
  campfire: 'campfire.ogg',
  river: 'river.ogg'
};

const displayTime = computed(() => {
  const seconds = timerMode.value === 'countdown'
    ? Math.max(phaseDurationSeconds.value - phaseElapsedSeconds.value, 0)
    : Math.max(phaseElapsedSeconds.value, 0);
  return formatSeconds(seconds);
});

const actionIcon = computed(() => (isRunning.value ? 'pause' : 'play'));
const actionTitle = computed(() => {
  if (isRunning.value) return t('focusTimer.pause');
  if (isPaused.value) return t('focusTimer.continue');
  return t('focusTimer.start');
});

const progress = computed(() => {
  if (!isActive.value) return 0;
  const total = phaseDurationSeconds.value;
  if (!total) return 0;
  return Math.min(Math.max(phaseElapsedSeconds.value, 0), total) / total;
});

const progressStyle = computed(() => ({
  '--progress': progress.value.toString(),
  '--progress-color': isBreakMode.value ? '#4dab9a' : '#f98f7a'
}));

const wrapperStyle = computed(() => ({
  transform: `translate3d(${position.value.x}px, ${position.value.y}px, 0)`
}));

const getContainerRect = () => {
  const rect = containerEl.value?.getBoundingClientRect();
  if (!rect) {
    return { width: window.innerWidth, height: window.innerHeight };
  }
  return { width: rect.width, height: rect.height };
};

const measureCapsule = () => {
  const rect = capsuleRef.value?.getBoundingClientRect();
  return {
    width: rect?.width || 0,
    height: rect?.height || 0
  };
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getBounds = () => {
  const { width, height } = getContainerRect();
  const { width: capsuleWidth, height: capsuleHeight } = measureCapsule();
  const maxX = Math.max(EDGE_PADDING, width - capsuleWidth - EDGE_PADDING);
  const maxY = Math.max(EDGE_PADDING, height - capsuleHeight - EDGE_PADDING);
  const minX = EDGE_PADDING;
  const minY = EDGE_PADDING;
  const rangeX = Math.max(1, maxX - minX);
  const rangeY = Math.max(1, maxY - minY);
  return { minX, minY, maxX, maxY, rangeX, rangeY };
};

const clampPosition = () => {
  const { minX, minY, maxX, maxY } = getBounds();
  position.value = {
    x: clamp(position.value.x, minX, maxX),
    y: clamp(position.value.y, minY, maxY)
  };
};

const updateStoredRatio = () => {
  const { minX, minY, rangeX, rangeY } = getBounds();
  const ratioX = clamp((position.value.x - minX) / rangeX, 0, 1);
  const ratioY = clamp((position.value.y - minY) / rangeY, 0, 1);
  storedRatio.value = { x: ratioX, y: ratioY };
};

const applyStoredRatio = () => {
  if (!storedRatio.value) return false;
  const { minX, minY, rangeX, rangeY } = getBounds();
  position.value = {
    x: minX + storedRatio.value.x * rangeX,
    y: minY + storedRatio.value.y * rangeY
  };
  clampPosition();
  return true;
};

const setDefaultPosition = () => {
  const { width, height } = getContainerRect();
  const { width: capsuleWidth, height: capsuleHeight } = measureCapsule();
  position.value = {
    x: Math.max(EDGE_PADDING, width - capsuleWidth - EDGE_PADDING),
    y: Math.max(EDGE_PADDING, height - capsuleHeight - EDGE_PADDING)
  };
  updateStoredRatio();
};

const loadPosition = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.rx === 'number' && typeof parsed?.ry === 'number') {
      storedRatio.value = { x: parsed.rx, y: parsed.ry };
      return;
    }
    if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
      storedPosition.value = { x: parsed.x, y: parsed.y };
    }
  } catch {
    storedPosition.value = null;
    storedRatio.value = null;
  }
};

const savePosition = () => {
  try {
    if (!storedRatio.value) {
      updateStoredRatio();
    }
    if (storedRatio.value) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ rx: storedRatio.value.x, ry: storedRatio.value.y })
      );
    }
  } catch {
    // ignore storage errors
  }
};

const initPosition = () => {
  nextTick(() => {
    if (applyStoredRatio()) return;
    if (storedPosition.value) {
      position.value = { ...storedPosition.value };
    } else {
      setDefaultPosition();
    }
    clampPosition();
    updateStoredRatio();
  });
};

const ensureContainer = () => {
  containerEl.value = document.querySelector('.layout__center') as HTMLElement | null;
  if (containerEl.value) {
    const style = window.getComputedStyle(containerEl.value);
    if (style.position === 'static') {
      containerEl.value.style.position = 'relative';
    }
    return;
  }
  containerEl.value = document.body;
};

const observeInlineContainer = () => {
  if (!containerEl.value || typeof ResizeObserver === 'undefined' || containerResizeObserver.value) {
    return;
  }

  containerResizeObserver.value = new ResizeObserver(handleContainerResize);
  containerResizeObserver.value.observe(containerEl.value);
};

const ensureInlineCapsuleHost = () => {
  ensureContainer();
  if (!hasLoadedPosition) {
    loadPosition();
    hasLoadedPosition = true;
  }
  observeInlineContainer();
  initPosition();
};

const clearTimer = () => {
  if (timerInterval.value !== null) {
    clearInterval(timerInterval.value);
    timerInterval.value = null;
  }
  timerDeadline.value = 0;
  timerStartedAt.value = 0;
};

const resetPhaseProgress = () => {
  phaseElapsedSeconds.value = 0;
  timerStartedAt.value = 0;
};

const getElapsedFocusMinutes = () => {
  if (isBreakMode.value || timerMode.value !== 'countup') {
    return 0;
  }

  return Math.floor(phaseElapsedSeconds.value / 60);
};

const recordFocusSession = async (sessionMinutes: number) => {
  const sessionId = `focus-capsule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await addFocusSession(
    sessionMinutes,
    linkedTarget.value ? {
      type: linkedTarget.value.type,
      id: linkedTarget.value.id,
      name: linkedTarget.value.name,
      emoji: linkedTarget.value.emoji,
      blockId: linkedTarget.value.blockId
    } : null
  );
  await awardFocusSession({
    minutes: sessionMinutes,
    sessionId,
    source: 'capsule'
  }).catch(() => {});
  window.dispatchEvent(new CustomEvent(FOCUS_SESSION_EVENT, { detail: { minutes: sessionMinutes, sessionId } }));
};

function getFocusSessionTargetInput() {
  return linkedTarget.value ? {
    type: linkedTarget.value.type,
    id: linkedTarget.value.id,
    name: linkedTarget.value.name,
    emoji: linkedTarget.value.emoji,
    blockId: linkedTarget.value.blockId
  } : null;
}

function ensureCountupSessionId(): string {
  if (!countupSessionId.value) {
    countupSessionId.value = `focus-capsule-countup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
  return countupSessionId.value;
}

function resetCountupCheckpointState(): void {
  countupSessionId.value = '';
  savedCountupMinutes.value = 0;
  isSavingCountupCheckpoint.value = false;
  hasPendingCountupCheckpoint.value = false;
}

const saveCountupCheckpoint = async (final = false, minutesOverride?: number): Promise<void> => {
  if (isBreakMode.value || timerMode.value !== 'countup') {
    return;
  }

  const minutes = typeof minutesOverride === 'number'
    ? Math.max(0, Math.floor(minutesOverride))
    : getElapsedFocusMinutes();
  if (minutes <= savedCountupMinutes.value) {
    return;
  }

  if (isSavingCountupCheckpoint.value) {
    hasPendingCountupCheckpoint.value = true;
    return;
  }

  isSavingCountupCheckpoint.value = true;
  try {
    const sessionId = ensureCountupSessionId();
    await upsertFocusSessionRecord(sessionId, minutes, getFocusSessionTargetInput());
    const savedDelta = Math.max(0, minutes - savedCountupMinutes.value);
    savedCountupMinutes.value = Math.max(savedCountupMinutes.value, minutes);
    if (savedDelta > 0) {
      window.dispatchEvent(new CustomEvent(FOCUS_SESSION_EVENT, {
        detail: { minutes: savedDelta, sessionId, checkpoint: !final }
      }));
    }
  } finally {
    isSavingCountupCheckpoint.value = false;
    if (hasPendingCountupCheckpoint.value) {
      hasPendingCountupCheckpoint.value = false;
      void saveCountupCheckpoint(final);
    }
  }
};

const startPhaseTimer = () => {
  if (timerMode.value === 'countup' && !isBreakMode.value) {
    const startedAt = Date.now() - phaseElapsedSeconds.value * 1000;
    timerStartedAt.value = startedAt;
    let lastAutosavedMinute = savedCountupMinutes.value;
    let lastAutosaveCheckAt = Date.now();

    timerInterval.value = window.setInterval(() => {
      if (!isRunning.value || timerStartedAt.value !== startedAt) {
        return;
      }
      phaseElapsedSeconds.value = Math.max(
        0,
        Math.floor((Date.now() - startedAt) / 1000)
      );
      const elapsedMinutes = getElapsedFocusMinutes();
      const now = Date.now();
      if (
        now - lastAutosaveCheckAt >= FOCUS_COUNTUP_AUTOSAVE_INTERVAL_MS
        && elapsedMinutes > lastAutosavedMinute
        && elapsedMinutes > savedCountupMinutes.value
      ) {
        lastAutosaveCheckAt = now;
        lastAutosavedMinute = elapsedMinutes;
        void saveCountupCheckpoint(false);
      }
    }, 200);
    return;
  }

  const totalSeconds = phaseDurationSeconds.value;
  const remainingSeconds = Math.max(totalSeconds - phaseElapsedSeconds.value, 0);

  if (remainingSeconds <= 0) {
    phaseElapsedSeconds.value = totalSeconds;
    void completeTimer();
    return;
  }

  const deadline = Date.now() + remainingSeconds * 1000;
  timerDeadline.value = deadline;
  timerInterval.value = window.setInterval(async () => {
    if (!isRunning.value || timerDeadline.value !== deadline) {
      return;
    }
    const timeLeft = Math.ceil((deadline - Date.now()) / 1000);
    if (timeLeft <= 0) {
      phaseElapsedSeconds.value = totalSeconds;
      clearTimer();
      await completeTimer();
    } else {
      phaseElapsedSeconds.value = Math.min(totalSeconds - timeLeft, totalSeconds);
    }
  }, 200);
};

let completeSoundAudioContext: AudioContext | null = null;

async function prepareCompleteSound(): Promise<void> {
  if (!completeSoundAudioContext) {
    completeSoundAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (completeSoundAudioContext.state === 'suspended') {
    await completeSoundAudioContext.resume();
  }
}

async function playCompleteSound(): Promise<void> {
  try {
    if (await playCustomFocusAudio(userSettings.focus.customCompletionSoundFile, 0.3)) return;
    await prepareCompleteSound();
    const context = completeSoundAudioContext;
    if (!context) return;
    const playTone = (frequency: number, startTime: number, duration: number) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };
    const now = context.currentTime;
    playTone(523.25, now, 0.2);
    playTone(659.25, now + 0.15, 0.2);
    playTone(783.99, now + 0.3, 0.3);
  } catch {
    // Ignore unavailable Web Audio environments.
  }
}

const stopWhiteNoise = () => {
  if (!whiteNoiseAudio.value) return;
  whiteNoiseAudio.value.pause();
  whiteNoiseAudio.value.currentTime = 0;
  whiteNoiseAudio.value = null;
};

const playWhiteNoise = async () => {
  if (!whiteNoiseEnabled.value) return;
  stopWhiteNoise();
  const fileName = selectedWhiteNoiseId.value === 'custom'
    ? userSettings.focus.customWhiteNoiseFile
    : whiteNoiseFiles[selectedWhiteNoiseId.value];
  const source = await getStoredFocusAudioUrl(fileName);
  if (!source) return;

  const audio = new Audio(source);
  audio.loop = true;
  audio.volume = whiteNoiseVolume.value;
  whiteNoiseAudio.value = audio;
  void audio.play().catch(() => {});
};

const toggleWhiteNoise = () => {
  if (!whiteNoiseEnabled.value) {
    stopWhiteNoise();
  } else if (isRunning.value) {
    playWhiteNoise();
  }
  void persistWhiteNoiseSettings();
};

const selectWhiteNoise = (soundId: string) => {
  selectedWhiteNoiseId.value = soundId;
  void persistWhiteNoiseSettings();
  if (isRunning.value) playWhiteNoise();
};

const updateWhiteNoiseVolume = () => {
  if (whiteNoiseAudio.value) whiteNoiseAudio.value.volume = whiteNoiseVolume.value;
  void persistWhiteNoiseSettings();
};

const persistWhiteNoiseSettings = async () => {
  const settings = {
    whiteNoiseEnabled: whiteNoiseEnabled.value,
    selectedWhiteNoiseId: selectedWhiteNoiseId.value,
    whiteNoiseVolume: whiteNoiseVolume.value
  };
  await updateSettings('focus', settings);
  window.dispatchEvent(new CustomEvent('pinch-focus-settings-updated', { detail: settings }));
};

const showShortBreakPopup = () => {
  if (userSettings.focus.shortBreakPopup !== true) {
    return;
  }

  void nextTick(() => {
    void showDetachedMicroBreakWindow(Math.max(1, Math.round(shortBreakDuration.value * 60)), {
      title: t('focusTimer.shortBreakActiveTitle'),
      body: t('focusTimer.shortBreakActiveBody'),
      variant: 'short-break'
    });
  });
};

const showFocusCompletePopup = () => {
  if (userSettings.focus.focusCompletePopup !== true) {
    return;
  }

  void nextTick(() => {
    void showDetachedMicroBreakWindow(10, {
      title: t('focusTimer.focusCompletePopupTitle'),
      body: t('focusTimer.focusCompletePopupBody'),
      variant: 'focus-complete'
    });
  });
};

const completeTimer = async () => {
  stopMicroBreakReminder();
  void playCompleteSound();
  if (!isBreakMode.value) {
    try {
      await recordFocusSession(selectedDuration.value);
    } catch {
      // ignore recording errors
    }
    if (linkedTarget.value) {
      emit('complete-linked-target', linkedTarget.value);
    }

    if (currentSet.value < pomodoroSets.value && pomodoroSets.value >= 2) {
      isBreakMode.value = true;
      resetPhaseProgress();
      currentSet.value += 1;
      showShortBreakPopup();
      startPhaseTimer();
      return;
    }

    await stopTimer();
    showFocusCompletePopup();
    return;
  }

  isBreakMode.value = false;
  resetPhaseProgress();
  startMicroBreakReminder();
  startPhaseTimer();
};

const startTimer = () => {
  if (!claimFocusSession()) {
    return;
  }

  currentSet.value = 1;
  isBreakMode.value = false;
  resetPhaseProgress();
  resetCountupCheckpointState();
  clearTimer();
  isRunning.value = true;
  isPaused.value = false;
  void prepareCompleteSound();
  prepareTaskCompletionSound();
  void prepareCustomFocusAudio(userSettings.focus.customCompletionSoundFile);
  void prepareCustomFocusAudio(userSettings.focus.customMicroBreakSoundFile);
  playWhiteNoise();
  startMicroBreakReminder();
  startPhaseTimer();
};

const pauseTimer = () => {
  if (!isRunning.value) return;
  void saveCountupCheckpoint(false);
  clearTimer();
  stopMicroBreakReminder();
  stopWhiteNoise();
  isRunning.value = false;
  isPaused.value = true;
};

const resumeTimer = () => {
  if (!isPaused.value) return;
  isRunning.value = true;
  isPaused.value = false;
  void prepareCompleteSound();
  prepareTaskCompletionSound();
  void prepareCustomFocusAudio(userSettings.focus.customCompletionSoundFile);
  void prepareCustomFocusAudio(userSettings.focus.customMicroBreakSoundFile);
  playWhiteNoise();
  startMicroBreakReminder();
  startPhaseTimer();
};

const stopTimer = async (recordCurrentSession: boolean = false) => {
  const elapsedMinutes = recordCurrentSession ? getElapsedFocusMinutes() : 0;
  const countupSessionIdToAward = countupSessionId.value;

  if (recordCurrentSession) {
    clearTimer();
  }

  clearTimer();
  stopMicroBreakReminder();
  stopWhiteNoise();
  isRunning.value = false;
  isPaused.value = false;
  isBreakMode.value = false;
  currentSet.value = 1;
  resetPhaseProgress();
  releaseFocusSession();

  if (elapsedMinutes > 0) {
    try {
      if (timerMode.value === 'countup') {
        await saveCountupCheckpoint(true, elapsedMinutes);
        if (countupSessionIdToAward || countupSessionId.value) {
          await awardFocusSession({
            minutes: elapsedMinutes,
            sessionId: countupSessionIdToAward || countupSessionId.value,
            source: 'capsule'
          }).catch(() => {});
        }
        resetCountupCheckpointState();
      } else {
        await recordFocusSession(elapsedMinutes);
      }
    } catch {
      // ignore recording errors
    }
  } else {
    resetCountupCheckpointState();
  }
};

const toggleStartPause = () => {
  showSettings.value = false;
  if (isRunning.value) {
    pauseTimer();
    return;
  }
  if (isPaused.value) {
    resumeTimer();
    return;
  }
  startTimer();
};

const closeInlineMiniFocus = () => {
  if (isTimerActive.value) {
    showCloseConfirm.value = true;
    return;
  }
  void confirmCloseMiniFocus();
};

const cancelCloseMiniFocus = () => {
  showCloseConfirm.value = false;
};

const confirmCloseMiniFocus = async () => {
  showCloseConfirm.value = false;
  showSettings.value = false;
  closeTargetPicker();
  await stopTimer(true);
  detachedFocusOwnsState.value = false;
  closeDetachedFocusWindow();
  emit('disable-floating-focus');
};

const buildHandoffState = (): FocusTimerHandoffState => ({
  timerMode: timerMode.value,
  selectedDuration: selectedDuration.value,
  durationIndex: durationIndex.value,
  shortBreakDuration: shortBreakDuration.value,
  shortBreakDurationIndex: shortBreakDurationIndex.value,
  pomodoroSets: pomodoroSets.value,
  phaseElapsedSeconds: phaseElapsedSeconds.value,
  isRunning: isRunning.value,
  isPaused: isPaused.value,
  isBreakMode: isBreakMode.value,
  currentSet: currentSet.value,
  countupSessionId: countupSessionId.value,
  savedCountupMinutes: savedCountupMinutes.value,
  whiteNoiseEnabled: whiteNoiseEnabled.value,
  selectedWhiteNoiseId: selectedWhiteNoiseId.value,
  whiteNoiseVolume: whiteNoiseVolume.value,
  microBreakSettings: { ...userSettings.focus },
  linkedTarget: linkedTarget.value ?? null
});

const applyHandoffState = (state: FocusTimerHandoffState) => {
  emit('update-linked-target', state.linkedTarget ?? null);
  clearTimer();
  releaseFocusSession();

  timerMode.value = state.timerMode === 'countup' ? 'countup' : 'countdown';
  selectedDuration.value = Number.isFinite(state.selectedDuration) ? state.selectedDuration : 25;
  durationIndex.value = Number.isFinite(state.durationIndex) ? state.durationIndex : 3;
  shortBreakDuration.value = Number.isFinite(state.shortBreakDuration) ? state.shortBreakDuration : 5;
  shortBreakDurationIndex.value = Number.isFinite(state.shortBreakDurationIndex) ? state.shortBreakDurationIndex : 2;
  pomodoroSets.value = Math.max(
    1,
    Math.min(
      Number.isFinite(state.pomodoroSets) ? Math.round(state.pomodoroSets) : 1,
      pomodoroSetMarks[pomodoroSetMarks.length - 1]
    )
  );
  phaseElapsedSeconds.value = Math.max(0, Math.floor(state.phaseElapsedSeconds || 0));
  isRunning.value = state.isRunning === true;
  isPaused.value = state.isPaused === true;
  isBreakMode.value = state.isBreakMode === true;
  currentSet.value = Number.isFinite(state.currentSet) ? state.currentSet : 1;
  countupSessionId.value = state.countupSessionId || '';
  savedCountupMinutes.value = Number.isFinite(state.savedCountupMinutes) ? state.savedCountupMinutes : 0;
  whiteNoiseEnabled.value = state.whiteNoiseEnabled === true;
  selectedWhiteNoiseId.value = typeof state.selectedWhiteNoiseId === 'string'
    ? state.selectedWhiteNoiseId
    : 'rain';
  whiteNoiseVolume.value = Number.isFinite(state.whiteNoiseVolume)
    ? Math.max(0, Math.min(state.whiteNoiseVolume, 1))
    : 0.3;
  showSettings.value = false;
  closeTargetPicker();
};

const activateInlineHandoffState = () => {
  if (supportsDetachedFocusWindow) {
    closeDetachedFocusWindow();
  }

  if (isRunning.value || isPaused.value) {
    if (!claimFocusSession()) {
      isRunning.value = false;
      isPaused.value = false;
      return;
    }
  }

  if (isRunning.value) {
    playWhiteNoise();
    startPhaseTimer();
  }
};

const handoffInlineStateToDetached = (state: FocusTimerHandoffState = buildHandoffState()) => {
  if (!supportsDetachedFocusWindow || !props.enabled) {
    return;
  }

  syncDetachedFocusWindow(true, state.linkedTarget ?? null);
  handoffDetachedFocusSession(state);
  detachedFocusOwnsState.value = true;
  clearTimer();
  stopWhiteNoise();
  releaseFocusSession();
  isRunning.value = false;
  isPaused.value = false;
  showSettings.value = false;
  closeTargetPicker();
};

const acceptPanelHandoff = (state: FocusTimerHandoffState) => {
  applyHandoffState(state);

  if (shouldUseDetachedFocusWindow.value) {
    handoffInlineStateToDetached(state);
    return;
  }

  detachedFocusOwnsState.value = false;
  activateInlineHandoffState();
};

const cycleDuration = () => {
  if (isTimerActive.value) return;
  durationIndex.value = (durationIndex.value + 1) % durationOptions.length;
  const option = durationOptions[durationIndex.value];
  if (option === 'unlimited') {
    timerMode.value = 'countup';
  } else {
    timerMode.value = 'countdown';
    selectedDuration.value = option;
  }
  resetPhaseProgress();
};

const updateDurationByIndex = () => {
  if (isTimerActive.value) return;
  const option = durationOptions[durationIndex.value];
  if (option === 'unlimited') {
    timerMode.value = 'countup';
  } else {
    timerMode.value = 'countdown';
    selectedDuration.value = option;
  }
  resetPhaseProgress();
};

const updateShortBreakDuration = () => {
  if (isPomodoroSettingsLocked.value) return;
  shortBreakDuration.value = shortBreakMarks[shortBreakDurationIndex.value];
};

const updatePomodoroSets = () => {
  if (isPomodoroSettingsLocked.value) return;
  pomodoroSets.value = Math.max(
    1,
    Math.min(Math.round(pomodoroSets.value), pomodoroSetMarks[pomodoroSetMarks.length - 1])
  );
};

const closeTargetPicker = () => {
  targetPickerMode.value = null;
  targetSearch.value = '';
  targetOptionsError.value = '';
};

const openTargetPicker = async (mode: FocusTargetPickerMode) => {
  if (isLinkedTargetLocked.value) {
    return;
  }

  targetPickerMode.value = mode;
  targetSearch.value = '';
  targetOptionsError.value = '';
  isLoadingTargetOptions.value = true;

  try {
    if (mode === 'habit') {
      habitTargetOptions.value = await loadHabitFocusTargetOptions();
    } else {
      taskTargetOptions.value = await loadTaskFocusTargetOptions();
    }
  } catch {
    targetOptionsError.value = `${t('focusTimer.loadTargetFailedPrefix')}${mode === 'habit' ? t('focusTimer.habit') : t('focusTimer.task')}${t('focusTimer.loadTargetFailedSuffix')}`;
  } finally {
    isLoadingTargetOptions.value = false;
  }
};

const selectLinkedTarget = (target: FocusTimerLinkedTarget) => {
  if (isLinkedTargetLocked.value) {
    return;
  }

  emit('update-linked-target', target);
  closeTargetPicker();
};

const clearLinkedTarget = () => {
  if (isLinkedTargetLocked.value) {
    return;
  }

  emit('update-linked-target', null);
  emit('clear-linked-target');
  closeTargetPicker();
};

const openLinkedTarget = () => {
  if (!linkedTarget.value || !canOpenLinkedTarget.value) {
    return;
  }

  emit('open-linked-target', linkedTarget.value);
};

const getTargetEmoji = (target: FocusTimerLinkedTarget) => getFocusTargetEmoji(target);

const formatSeconds = (seconds: number) => {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const toggleSettings = () => {
  showSettings.value = !showSettings.value;
  if (!showSettings.value) {
    closeTargetPicker();
  }
};

const openSettingsPanel = () => {
  if (!props.enabled) {
    return;
  }

  closeTargetPicker();

  if (shouldUseDetachedFocusWindow.value) {
    syncDetachedFocusWindow(true, linkedTarget.value ?? null);
    openDetachedFocusWindowSettings();
    return;
  }

  ensureInlineCapsuleHost();
  showSettings.value = true;
};

const handleDocumentClick = (event: MouseEvent) => {
  if (!showSettings.value) return;
  const target = event.target as Node | null;
  if (!target) return;
  if (capsuleRef.value?.contains(target)) return;
  if (settingsRef.value?.contains(target)) return;
  showSettings.value = false;
  closeTargetPicker();
};

const onPointerDown = (event: PointerEvent) => {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  const target = event.target as HTMLElement | null;
  if (target?.closest('[data-no-drag]')) return;

  isDragging.value = true;
  dragMoved.value = false;
  dragStart.value = { x: event.clientX, y: event.clientY };
  dragOrigin.value = { ...position.value };
  capsuleRef.value?.setPointerCapture(event.pointerId);
  event.preventDefault();
};

const onPointerMove = (event: PointerEvent) => {
  if (!isDragging.value) return;
  const dx = event.clientX - dragStart.value.x;
  const dy = event.clientY - dragStart.value.y;

  if (!dragMoved.value && Math.hypot(dx, dy) < DRAG_THRESHOLD) {
    return;
  }

  dragMoved.value = true;
  position.value = {
    x: dragOrigin.value.x + dx,
    y: dragOrigin.value.y + dy
  };
  clampPosition();
};

const onPointerUp = (event: PointerEvent) => {
  if (!isDragging.value) return;
  isDragging.value = false;
  capsuleRef.value?.releasePointerCapture(event.pointerId);
  if (dragMoved.value) {
    updateStoredRatio();
    savePosition();
  }
};

const handleResize = () => {
  if (!applyStoredRatio()) {
    clampPosition();
    updateStoredRatio();
  }
};

const handleContainerResize = () => {
  handleResize();
};

const handleDocumentVisibilityChange = () => {
  if (!supportsDetachedFocusWindow) return;
  const detached = document.hidden;
  if (detached === isHostWindowDetached.value) return;
  isHostWindowDetached.value = detached;
  syncDetachedFocusWindowVisibility();
};

const restoreDetachedStateToInline = () => {
  if (restoreDetachedFocusPromise) {
    return restoreDetachedFocusPromise;
  }

  restoreDetachedFocusPromise = (async () => {
    const handoffState = await takeDetachedFocusSessionHandoff();
    detachedFocusOwnsState.value = false;

    if (!props.enabled) {
      return;
    }

    if (handoffState) {
      applyHandoffState(handoffState);
      activateInlineHandoffState();
    }

    ensureInlineCapsuleHost();
  })().finally(() => {
    restoreDetachedFocusPromise = null;
    syncDetachedFocusWindowVisibility();
  });

  return restoreDetachedFocusPromise;
};

const syncDetachedFocusWindowVisibility = () => {
  if (!supportsDetachedFocusWindow) {
    closeDetachedFocusWindow();
    if (props.enabled) {
      ensureInlineCapsuleHost();
    }
    return;
  }

  if (!props.enabled) {
    detachedFocusOwnsState.value = false;
    closeDetachedFocusWindow();
    return;
  }

  if (shouldUseDetachedFocusWindow.value) {
    if (!detachedFocusOwnsState.value) {
      handoffInlineStateToDetached();
      return;
    }

    syncDetachedFocusWindow(true, linkedTarget.value ?? null);
    return;
  }

  if (detachedFocusOwnsState.value) {
    void restoreDetachedStateToInline();
    return;
  }

  closeDetachedFocusWindow();
  ensureInlineCapsuleHost();
};

watch(linkedTarget, (nextTarget) => {
  if (shouldUseDetachedFocusWindow.value) {
    syncDetachedFocusWindow(true, nextTarget ?? null);
  }

  if (!nextTarget || isRunning.value || isPaused.value) {
    return;
  }

  isBreakMode.value = false;
  currentSet.value = 1;
  resetPhaseProgress();

  if (typeof nextTarget.preferredDuration === 'number' && Number.isFinite(nextTarget.preferredDuration)) {
    const duration = nextTarget.preferredDuration;
    const nextIndex = durationMarks.indexOf(duration);
    timerMode.value = 'countdown';
    selectedDuration.value = duration;
    durationIndex.value = nextIndex >= 0 ? nextIndex : 3;
  }
}, { immediate: true });

watch(
  () => [
    userSettings.focus.whiteNoiseEnabled,
    userSettings.focus.selectedWhiteNoiseId,
    userSettings.focus.whiteNoiseVolume
  ] as const,
  ([enabled, soundId, savedVolume]) => {
    const shouldRestartAudio = isRunning.value && (
      whiteNoiseEnabled.value !== (enabled === true)
      || selectedWhiteNoiseId.value !== soundId
    );
    whiteNoiseEnabled.value = enabled === true;
    if (typeof soundId === 'string') selectedWhiteNoiseId.value = soundId;
    if (Number.isFinite(savedVolume)) {
      whiteNoiseVolume.value = Math.max(0, Math.min(savedVolume!, 1));
      if (whiteNoiseAudio.value) whiteNoiseAudio.value.volume = whiteNoiseVolume.value;
    }
    if (shouldRestartAudio) {
      if (whiteNoiseEnabled.value) void playWhiteNoise();
      else stopWhiteNoise();
    }
  }
);

watch(() => props.enabled, (value) => {
  syncDetachedFocusWindowVisibility();

  if (!value) {
    void stopTimer();
    stopWhiteNoise();
    showSettings.value = false;
  }
});

watch(shouldUseDetachedFocusWindow, () => {
  syncDetachedFocusWindowVisibility();
});

watch(showSettings, (visible) => {
  if (!visible) {
    closeTargetPicker();
  }
});

watch(isLinkedTargetLocked, (locked) => {
  if (locked) {
    closeTargetPicker();
  }
});

onMounted(async () => {
  await loadSettings();
  whiteNoiseEnabled.value = userSettings.focus.whiteNoiseEnabled === true;
  const storedSound = userSettings.focus.selectedWhiteNoiseId;
  if (typeof storedSound === 'string') {
    selectedWhiteNoiseId.value = storedSound;
  }
  if (Number.isFinite(userSettings.focus.whiteNoiseVolume)) {
    whiteNoiseVolume.value = Math.max(0, Math.min(userSettings.focus.whiteNoiseVolume!, 1));
  }
  if (supportsDetachedFocusWindow) {
    unsubscribeHostWindowState = subscribeDetachedFocusHostWindowState((detached) => {
      isHostWindowDetached.value = detached;
      syncDetachedFocusWindowVisibility();

      if (hostWindowSyncTimer !== null) {
        window.clearTimeout(hostWindowSyncTimer);
      }
      hostWindowSyncTimer = window.setTimeout(() => {
        hostWindowSyncTimer = null;
        if (isHostWindowDetached.value && props.enabled) {
          syncDetachedFocusWindowVisibility();
        }
      }, 250);
    });
  }

  window.addEventListener('resize', handleResize);
  document.addEventListener('visibilitychange', handleDocumentVisibilityChange);
  document.addEventListener('mousedown', handleDocumentClick);

  syncDetachedFocusWindowVisibility();
});

onBeforeUnmount(() => {
  stopWhiteNoise();
  unsubscribeHostWindowState?.();
  unsubscribeHostWindowState = null;
  if (hostWindowSyncTimer !== null) {
    window.clearTimeout(hostWindowSyncTimer);
    hostWindowSyncTimer = null;
  }
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('visibilitychange', handleDocumentVisibilityChange);
  if (containerResizeObserver.value) {
    containerResizeObserver.value.disconnect();
    containerResizeObserver.value = null;
  }
  document.removeEventListener('mousedown', handleDocumentClick);
  closeDetachedFocusWindow();

  clearTimer();
  releaseFocusSession();
  void saveCountupCheckpoint(false);
});

defineExpose({
  openSettingsPanel,
  acceptPanelHandoff
});
</script>

<style scoped>
.floating-focus {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 2000;
  pointer-events: none;
}

.floating-focus__capsule {
  position: relative;
  display: grid;
  grid-template-columns: 17px minmax(44px, 1fr) 22px auto;
  grid-template-rows: minmax(53px, 1fr) 17px;
  align-items: center;
  gap: 0 4px;
  width: 165px;
  height: 83px;
  padding: 5px;
  box-sizing: border-box;
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--b3-border-color) 65%, transparent);
  background: var(--b3-theme-background);
  box-shadow: var(--pinch-shadow);
  color: var(--b3-theme-on-background);
  font-size: 12px;
  font-weight: 600;
  user-select: none;
  cursor: grab;
  touch-action: none;
  pointer-events: auto;
}

.floating-focus__capsule.is-dragging {
  cursor: grabbing;
}

.floating-focus__close {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 16px;
  height: 16px;
  border: none;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  color: var(--b3-theme-on-surface);
  background: var(--b3-theme-background);
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-2px) scale(0.92);
  transition: opacity 0.16s ease, transform 0.16s ease, color 0.16s ease, background 0.16s ease;
  box-shadow: var(--b3-point-shadow);
  z-index: 2;
}

.floating-focus__capsule:hover .floating-focus__close,
.floating-focus__close:focus-visible {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0) scale(1);
}

.floating-focus__close:hover {
  color: var(--b3-theme-background);
  background: var(--b3-theme-on-background);
  opacity: 0.92;
}

.floating-focus__dot {
  grid-column: 1;
  grid-row: 2;
  width: 17px;
  height: 17px;
  border: none;
  border-radius: 999px;
  background: #f98f7a;
  color: var(--b3-theme-on-background);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
}

.floating-focus__duration,
.floating-focus__time {
  grid-column: 1 / -1;
  grid-row: 1;
  justify-self: center;
  border: none;
  background: transparent;
  padding: 0;
  color: inherit;
  font-family: inherit;
  font-size: 38px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0px;
  line-height: .95;
  cursor: pointer;
}

.floating-focus__duration:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.floating-focus__time {
  cursor: default;
}

.floating-focus__content {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 2px;
}

.floating-focus__target,
.floating-focus__target-label {
  grid-column: 2 / 4;
  grid-row: 2;
  min-width: 0;
  max-width: 100%;
  height: 16px;
  padding: 0 6px;
  box-sizing: border-box;
  border-radius: 6px;
  background: transparent;
  justify-self: start;
  z-index: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 6px;
  line-height: 16px;
  color: #38201d;
}

.floating-focus__target {
  border: none;
  text-align: left;
  cursor: pointer;
}

.floating-focus__target:hover {
  color: var(--b3-theme-on-background);
}

.floating-focus__actions {
  grid-column: 4;
  grid-row: 2;
  display: flex;
  gap: 4px;
}

.floating-focus__action {
  width: 17px;
  height: 17px;
  border: none;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  cursor: pointer;
  padding: 0;
}

.floating-focus__action.is-stop {
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
}

.floating-focus__action:hover {
  filter: brightness(0.98);
}

.floating-focus__action:disabled {
  cursor: not-allowed;
  opacity: 0.45;
  filter: none;
}

.floating-focus__popover {
  position: absolute;
  right: 0;
  bottom: 44px;
  width: 280px;
  background: var(--b3-theme-background);
  border-radius: 16px;
  box-shadow: var(--b3-point-shadow);
  border: 1px solid var(--b3-border-color);
  pointer-events: auto;
  z-index: 1;
}

.timer-settings {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-radius: 14px;
  padding: 12px;
  box-sizing: border-box;
}

.setting-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.white-noise-setting {
  padding-top: 10px;
  border-top: 1px solid var(--b3-border-color);
}

.floating-focus__sound-selector {
  display: flex;
  gap: 6px;
}

.floating-focus__sound-selector.disabled {
  opacity: 0.45;
}

.floating-focus__sound-button {
  display: grid;
  width: 30px;
  height: 30px;
  padding: 0;
  place-items: center;
  color: var(--b3-theme-on-surface-light);
  background: var(--b3-theme-surface-light);
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
}

.floating-focus__sound-button:hover:not(:disabled),
.floating-focus__sound-button.active {
  color: #f98f7a;
  background: color-mix(in srgb, #f98f7a 13%, var(--b3-theme-surface));
  border-color: color-mix(in srgb, #f98f7a 40%, transparent);
}

.floating-focus__sound-button:disabled {
  cursor: not-allowed;
}

.floating-focus__sound-button svg {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.floating-focus__volume-control {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--b3-theme-on-surface-light);
  font-size: 12px;
}

.floating-focus__volume-control input {
  flex: 1;
  min-width: 0;
  accent-color: #f98f7a;
}

.setting-description {
  color: var(--b3-theme-on-surface-light);
  font-size: 12px;
  line-height: 1.5;
}

.switch-container {
  display: flex;
  align-items: center;
}

.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.switch input {
  width: 0;
  height: 0;
  opacity: 0;
}

.slider {
  position: absolute;
  inset: 0;
  cursor: pointer;
  background-color: var(--b3-border-color);
  transition: .4s;
}

.slider::before {
  position: absolute;
  bottom: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  background-color: white;
  content: '';
  transition: .4s;
}

.switch input:checked + .slider {
  background-color: #f98f7a;
}

.switch input:checked + .slider::before {
  transform: translateX(20px);
}

.slider.round {
  border-radius: 24px;
}

.slider.round::before {
  border-radius: 50%;
}

.micro-break-overlay {
  position: fixed;
  z-index: 10001;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.micro-break-dialog {
  width: min(280px, calc(100vw - 32px));
  padding: 20px;
  border: 1px solid var(--b3-border-color);
  border-radius: 12px;
  background: var(--b3-theme-surface);
  box-shadow: var(--b3-dialog-shadow);
  text-align: center;
}

.micro-break-dialog__title {
  color: var(--b3-theme-primary);
  font-size: 17px;
  font-weight: 600;
}

.micro-break-dialog__message {
  margin-top: 8px;
  color: var(--b3-theme-on-surface);
  font-size: 13px;
}

.micro-break-dialog__countdown {
  margin-top: 12px;
  color: var(--b3-theme-primary);
  font-size: 24px;
  font-variant-numeric: tabular-nums;
}

.linked-target-setting {
  gap: 10px;
}

.setting-hint {
  font-size: 11px;
  line-height: 1.5;
  color: var(--b3-theme-on-surface);
}

.setting-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--b3-theme-on-surface);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.duration-value {
  font-weight: 700;
  color: var(--b3-theme-on-background);
}

.duration-slider-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
}

.duration-slider {
  width: 100%;
  height: 3px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--b3-list-hover);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}

.duration-slider:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.duration-marks {
  position: relative;
  width: calc(100% - 16px);
  height: 18px;
  margin: 0 auto;
}

.duration-mark {
  position: absolute;
  font-size: 11px;
  color: var(--b3-theme-on-surface);
  opacity: 0.6;
  transform: translateX(-50%);
}

.linked-habit-banner__chip-row,
.linked-habit-banner__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.linked-habit-banner__chip {
  flex: 1 1 auto;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid var(--b3-border-color);
  border-radius: 12px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  cursor: pointer;
}

.linked-habit-banner__chip:hover:not(:disabled) {
  border-color: rgba(249, 143, 122, 0.45);
}

.linked-habit-banner__chip:disabled {
  cursor: default;
  opacity: 0.72;
}

.linked-habit-banner__emoji {
  flex: 0 0 auto;
  font-size: 14px;
  line-height: 1;
}

.linked-habit-banner__name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  text-align: left;
}

.linked-habit-banner__action,
.linked-habit-banner__picker-item,
.linked-habit-banner__picker-close,
.linked-habit-banner__clear {
  border: 1px solid var(--b3-border-color);
  background: transparent;
  color: var(--b3-theme-on-background);
  font: inherit;
}

.linked-habit-banner__action {
  flex: 1 1 0;
  min-height: 32px;
  border-radius: 10px;
  cursor: pointer;
}

.linked-habit-banner__action:hover:not(:disabled) {
  background: var(--b3-list-hover);
}

.linked-habit-banner__action:disabled,
.linked-habit-banner__clear:disabled,
.linked-habit-banner__picker-close:disabled,
.linked-habit-banner__picker-item:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.linked-habit-banner__clear {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.linked-habit-banner__clear:hover:not(:disabled) {
  background: var(--b3-list-hover);
}

.linked-habit-banner__picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--b3-border-color);
  border-radius: 12px;
  background: var(--b3-theme-background);
}

.linked-habit-banner__picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
}

.linked-habit-banner__picker-close {
  width: 24px;
  height: 24px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.linked-habit-banner__picker-close:hover:not(:disabled) {
  background: var(--b3-list-hover);
}

.linked-habit-banner__search {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--b3-border-color);
  border-radius: 10px;
  padding: 8px 10px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  font: inherit;
  outline: none;
}

.linked-habit-banner__search:focus {
  border-color: rgba(249, 143, 122, 0.55);
}

.linked-habit-banner__picker-state {
  padding: 8px 0;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
}

.linked-habit-banner__picker-state.is-error {
  color: #d96b5f;
}

.linked-habit-banner__picker-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 220px;
  overflow-y: auto;
}

.linked-habit-banner__picker-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  cursor: pointer;
}

.linked-habit-banner__picker-item:hover:not(:disabled) {
  background: var(--b3-list-hover);
}

.linked-habit-banner__picker-item-main {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.linked-habit-banner__picker-item-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

.mini-focus-exit-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
  background: rgba(0, 0, 0, 0.28);
}

.mini-focus-exit-dialog {
  width: min(340px, 100%);
  padding: 16px;
  border: 1px solid var(--b3-border-color);
  border-radius: 10px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  box-shadow: var(--b3-dialog-shadow, 0 12px 36px rgba(0, 0, 0, 0.2));
}

.mini-focus-exit-dialog__title {
  font-size: 15px;
  font-weight: 600;
}

.mini-focus-exit-dialog__message {
  margin-top: 8px;
  line-height: 1.5;
  font-size: 13px;
  color: var(--b3-theme-on-surface);
}

.mini-focus-exit-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.mini-focus-exit-dialog__btn {
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--b3-border-color);
  border-radius: 6px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  cursor: pointer;
}

.mini-focus-exit-dialog__btn:hover {
  background: var(--b3-list-hover);
}

.mini-focus-exit-dialog__btn.is-danger {
  border-color: color-mix(in srgb, var(--b3-theme-error) 35%, var(--b3-border-color));
  color: var(--b3-theme-error);
}

.linked-habit-banner__picker-item-meta {
  flex: 0 0 auto;
  font-size: 11px;
  color: var(--b3-theme-on-surface);
}

.floating-focus__capsule { display: block; width: 180px; height: 60px; padding: 0; border-radius: 35px; --progress: 0; --progress-color: #f98f7a; }
.floating-focus__capsule.is-compact { height: 42px; border-radius: 24px; }
.floating-focus__capsule.is-progress-only { height: 50px; border-radius: 29px; }
.floating-focus__capsule::before, .floating-focus__capsule::after { display: none; }
.floating-focus__progress-track { position: absolute; left: 18px; right: 18px; bottom: 5px; height: 6px; overflow: hidden; border-radius: 3px; background: var(--b3-list-hover); }
.floating-focus__progress-fill { position: absolute; inset: 0 auto 0 0; width: calc(var(--progress) * 100%); border-radius: inherit; background: var(--progress-color); }
.floating-focus__dot, .floating-focus__action { position: absolute; z-index: 2; top: 8px; width: 23px; height: 23px; pointer-events: auto; }
.floating-focus__dot { left: 17.5px; background: transparent; }
.floating-focus__duration, .floating-focus__time { position: absolute; top: 4px; left: 50%; width: auto; transform: translateX(-50%); font-family: inherit; font-size: 31px; letter-spacing: 0; text-align: center; }
.floating-focus__capsule.has-linked-target .floating-focus__duration, .floating-focus__capsule.has-linked-target .floating-focus__time { top: 14px; }
.floating-focus__capsule.has-linked-target .floating-focus__dot, .floating-focus__capsule.has-linked-target .floating-focus__action { top: 18px; }
.floating-focus__target, .floating-focus__target-label { position: absolute; z-index: 1; top: 2px; left: 0; width: 100%; max-width: none; height: 11px; padding: 0; border-radius: 0; background: transparent; font-size: 8px; line-height: 11px; text-align: center; }
.floating-focus__actions { position: absolute; inset: 0; pointer-events: none; }
.floating-focus__action { right: 17.5px; }
.floating-focus__action.is-stop { left: 17.5px; right: auto; }
.floating-focus__dot .icon { width: 14px; height: 14px; }
.floating-focus__action .icon { width: 14px; height: 14px; }
</style>
