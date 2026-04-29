<template>
  <Teleport v-if="shouldRenderInlineCapsule" :to="teleportTarget">
    <div class="floating-focus" :style="wrapperStyle">
      <div
        ref="capsuleRef"
        class="floating-focus__capsule"
        :class="{ 'is-paused': isPaused, 'is-dragging': isDragging }"
        :style="progressStyle"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        <button
          type="button"
          class="floating-focus__dot"
          data-no-drag
          title="专注设置"
          aria-label="专注设置"
          @click.stop="toggleSettings"
        >
          <Icon name="timer" width="16" height="16" class="icon" />
        </button>
        <button
          v-if="linkedTarget && canOpenLinkedTarget"
          type="button"
          class="floating-focus__target"
          data-no-drag
          :title="linkedTargetLabel"
          :aria-label="linkedTargetLabel"
          @click.stop="emit('open-linked-target', linkedTarget)"
        >
          {{ linkedTargetLabel }}
        </button>
        <span
          v-else-if="linkedTarget"
          class="floating-focus__target-label"
          :title="linkedTargetLabel"
        >
          {{ linkedTargetLabel }}
        </span>
        <button
          v-if="!isActive"
          type="button"
          class="floating-focus__duration"
          data-no-drag
          :disabled="isPomodoroSettingsLocked"
          :title="isPomodoroSettingsLocked ? '正计时时不可调整专注时长' : '点击切换专注时长'"
          @click="cycleDuration"
        >
          专注 {{ durationMinutes }}m
        </button>
        <span v-else class="floating-focus__time">{{ displayTime }}</span>
        <div class="floating-focus__actions">
          <button
            type="button"
            class="floating-focus__action"
            data-no-drag
            :title="isStartBlockedByOther && !isActive ? '面板专注进行中' : actionTitle"
            :aria-label="isStartBlockedByOther && !isActive ? '面板专注进行中' : actionTitle"
            :disabled="isStartBlockedByOther && !isActive"
            @click.stop="toggleStartPause"
          >
            <Icon :name="actionIcon" width="12" height="12" class="icon" />
          </button>
          <button
            v-if="isActive"
            type="button"
            class="floating-focus__action is-stop"
            data-no-drag
            title="停止"
            aria-label="停止"
            @click.stop="stopTimer(true)"
          >
            <Icon name="stop" width="12" height="12" class="icon" />
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
                <span>计时关联</span>
              </div>
              <div v-if="linkedTarget" class="linked-habit-banner__chip-row">
                <button
                  type="button"
                  class="linked-habit-banner__chip"
                  :disabled="!canOpenLinkedTarget"
                  :title="canOpenLinkedTarget ? `打开${linkedTargetLabel}` : linkedTargetLabel"
                  :aria-label="linkedTargetLabel"
                  @click="openLinkedTarget"
                >
                  <span class="linked-habit-banner__emoji">{{ linkedTargetDisplayEmoji }}</span>
                  <span class="linked-habit-banner__name">{{ linkedTargetLabel }}</span>
                  <Icon v-if="canOpenLinkedTarget" name="open" width="12" height="12" class="icon" />
                </button>
                <button
                  type="button"
                  class="linked-habit-banner__clear"
                  :disabled="isLinkedTargetLocked"
                  title="清除关联"
                  aria-label="清除关联"
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
                  关联习惯
                </button>
                <button
                  type="button"
                  class="linked-habit-banner__action"
                  :disabled="isLinkedTargetLocked"
                  @click="openTargetPicker('task')"
                >
                  关联任务
                </button>
              </div>
              <div v-if="targetPickerMode" class="linked-habit-banner__picker">
                <div class="linked-habit-banner__picker-header">
                  <span>{{ targetPickerMode === 'habit' ? '选择习惯' : '选择任务' }}</span>
                  <button
                    type="button"
                    class="linked-habit-banner__picker-close"
                    title="关闭"
                    aria-label="关闭"
                    @click="closeTargetPicker"
                  >
                    <Icon name="close" width="12" height="12" class="icon" />
                  </button>
                </div>
                <input
                  v-model.trim="targetSearch"
                  class="linked-habit-banner__search"
                  type="text"
                  :placeholder="targetPickerMode === 'habit' ? '搜索习惯' : '搜索任务'"
                />
                <div v-if="isLoadingTargetOptions" class="linked-habit-banner__picker-state">
                  加载中...
                </div>
                <div v-else-if="targetOptionsError" class="linked-habit-banner__picker-state is-error">
                  {{ targetOptionsError }}
                </div>
                <div v-else-if="filteredTargetOptions.length === 0" class="linked-habit-banner__picker-state">
                  未找到可关联的{{ targetPickerMode === 'habit' ? '习惯' : '任务' }}
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
                      <span class="linked-habit-banner__emoji">{{ getTargetEmoji(target) }}</span>
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
                <span>计时模式</span>
                <div class="timer-mode-toggle timer-mode-toggle--inline" role="radiogroup" aria-label="计时模式">
                  <button
                    type="button"
                    class="timer-mode-option"
                    :class="{ active: timerMode === 'countdown' }"
                    :disabled="isRunning || isPaused"
                    @click="setTimerMode('countdown')"
                  >
                    倒计时
                  </button>
                  <button
                    type="button"
                    class="timer-mode-option"
                    :class="{ active: timerMode === 'countup' }"
                    :disabled="isRunning || isPaused"
                    @click="setTimerMode('countup')"
                  >
                    正计时
                  </button>
                </div>
              </div>
              <div class="setting-hint">正计时不封顶，手动停止后按累计时长计入统计。</div>
            </div>

            <div class="setting-section">
              <div class="setting-label">
                <span>专注时长</span>
                <span class="duration-value">{{ selectedDuration }}分钟</span>
              </div>
              <div class="duration-slider-container">
                <input
                  type="range"
                  v-model.number="durationIndex"
                  @input="updateDurationByIndex"
                  min="0"
                  :max="durationMarks.length - 1"
                  step="1"
                  class="duration-slider"
                  :disabled="isPomodoroSettingsLocked"
                  style="accent-color: var(--b3-theme-on-background)"
                />
                <div class="duration-marks">
                  <span
                    v-for="(mark, index) in durationMarks"
                    :key="mark"
                    class="duration-mark"
                    :style="{ left: `${(index / (durationMarks.length - 1)) * 100}%` }"
                  >
                    {{ mark }}
                  </span>
                </div>
              </div>
            </div>

            <div class="setting-section">
              <div class="setting-label">
                <span>短休时长</span>
                <span class="duration-value">{{ shortBreakDuration }}分钟</span>
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
                <span>专注组数</span>
                <span class="duration-value">{{ pomodoroSets }}组</span>
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
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, toRefs, watch } from 'vue';
import Icon from '@/components/Icon.vue';
import { addFocusSession } from '@/api';
import { useFocusSessionLock } from '@/composables/useFocusSessionLock';
import { awardFocusSession } from '@/rewardRepository';
import {
  closeDetachedFocusWindow,
  isDetachedFocusWindowSupported,
  openDetachedFocusWindowSettings,
  syncDetachedFocusWindow
} from '@/utils/detachedFocusWindow';
import type { FocusTimerLinkedTarget } from '@/utils/focusTimerTarget';
import {
  filterFocusTargetOptions,
  getFocusTargetDisplayLabel,
  getFocusTargetEmoji,
  loadHabitFocusTargetOptions,
  loadTaskFocusTargetOptions,
  type FocusTargetPickerMode
} from '@/utils/focusTimerTargetPicker';

type TimerMode = 'countdown' | 'countup';

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
}>();

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

const durationMarks = [5, 10, 15, 25, 30, 45, 60];
const shortBreakMarks = [1, 3, 5, 10, 15];
const pomodoroSetMarks = [1, 2, 3, 4, 5, 6, 7, 8];
const FOCUS_SESSION_EVENT = 'pinch-focus-session';

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
const isBreakMode = ref(false);
const currentSet = ref(1);
const timerInterval = ref<number | null>(null);
const timerDeadline = ref<number>(0);
const timerStartedAt = ref(0);
const showSettings = ref(false);
const settingsRef = ref<HTMLElement | null>(null);
const targetPickerMode = ref<FocusTargetPickerMode | null>(null);
const targetSearch = ref('');
const isLoadingTargetOptions = ref(false);
const targetOptionsError = ref('');
const habitTargetOptions = ref<FocusTimerLinkedTarget[]>([]);
const taskTargetOptions = ref<FocusTimerLinkedTarget[]>([]);

const teleportTarget = computed(() => containerEl.value || 'body');
const shouldRenderInlineCapsule = computed(() => props.enabled && !supportsDetachedFocusWindow);

const durationMinutes = computed(() => selectedDuration.value);
const isActive = computed(() => isRunning.value || isPaused.value);
const isPomodoroSettingsLocked = computed(() =>
  isRunning.value || isPaused.value || timerMode.value === 'countup'
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
const phaseDurationSeconds = computed(() =>
  (isBreakMode.value ? shortBreakDuration.value : durationMinutes.value) * 60
);

const displayTime = computed(() => {
  const seconds = timerMode.value === 'countdown'
    ? Math.max(phaseDurationSeconds.value - phaseElapsedSeconds.value, 0)
    : Math.max(phaseElapsedSeconds.value, 0);
  return formatSeconds(seconds);
});

const actionIcon = computed(() => (isRunning.value ? 'pause' : 'play'));
const actionTitle = computed(() => {
  if (isRunning.value) return '暂停';
  if (isPaused.value) return '继续';
  return '开始';
});

const progress = computed(() => {
  if (!isActive.value) return 0;
  const total = phaseDurationSeconds.value;
  if (!total) return 0;
  const elapsed = Math.min(Math.max(phaseElapsedSeconds.value, 0), total);
  return elapsed / total;
});

const progressColor = computed(() => (isBreakMode.value ? '#4dab9a' : '#f98f7a'));

const progressStyle = computed(() => ({
  '--progress': progress.value.toString(),
  '--progress-color': progressColor.value
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

const setTimerMode = (mode: TimerMode) => {
  if (isRunning.value || isPaused.value) return;
  timerMode.value = mode;
  resetPhaseProgress();
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

const startPhaseTimer = () => {
  if (timerMode.value === 'countup' && !isBreakMode.value) {
    const startedAt = Date.now() - phaseElapsedSeconds.value * 1000;
    timerStartedAt.value = startedAt;

    timerInterval.value = window.setInterval(() => {
      if (!isRunning.value || timerStartedAt.value !== startedAt) {
        return;
      }
      phaseElapsedSeconds.value = Math.max(
        0,
        Math.floor((Date.now() - startedAt) / 1000)
      );
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

const completeTimer = async () => {
  if (!isBreakMode.value) {
    try {
      await recordFocusSession(selectedDuration.value);
    } catch {
      // ignore recording errors
    }

    if (currentSet.value < pomodoroSets.value && pomodoroSets.value >= 2) {
      isBreakMode.value = true;
      resetPhaseProgress();
      currentSet.value += 1;
      startPhaseTimer();
      return;
    }

    await stopTimer();
    return;
  }

  isBreakMode.value = false;
  resetPhaseProgress();
  startPhaseTimer();
};

const startTimer = () => {
  if (!claimFocusSession()) {
    return;
  }

  currentSet.value = 1;
  isBreakMode.value = false;
  resetPhaseProgress();
  clearTimer();
  isRunning.value = true;
  isPaused.value = false;
  startPhaseTimer();
};

const pauseTimer = () => {
  if (!isRunning.value) return;
  clearTimer();
  isRunning.value = false;
  isPaused.value = true;
};

const resumeTimer = () => {
  if (!isPaused.value) return;
  isRunning.value = true;
  isPaused.value = false;
  startPhaseTimer();
};

const stopTimer = async (recordCurrentSession: boolean = false) => {
  const elapsedMinutes = recordCurrentSession ? getElapsedFocusMinutes() : 0;

  if (recordCurrentSession) {
    clearTimer();
  }

  clearTimer();
  isRunning.value = false;
  isPaused.value = false;
  isBreakMode.value = false;
  currentSet.value = 1;
  resetPhaseProgress();
  releaseFocusSession();

  if (elapsedMinutes > 0) {
    try {
      await recordFocusSession(elapsedMinutes);
    } catch {
      // ignore recording errors
    }
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

const cycleDuration = () => {
  if (isActive.value || isPomodoroSettingsLocked.value) return;
  durationIndex.value = (durationIndex.value + 1) % durationMarks.length;
  selectedDuration.value = durationMarks[durationIndex.value];
  resetPhaseProgress();
};

const updateDurationByIndex = () => {
  if (isPomodoroSettingsLocked.value) return;
  selectedDuration.value = durationMarks[durationIndex.value];
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
    targetOptionsError.value = `加载${mode === 'habit' ? '习惯' : '任务'}失败，请稍后重试`;
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

  if (supportsDetachedFocusWindow) {
    syncDetachedFocusWindow(true, linkedTarget.value ?? null);
    openDetachedFocusWindowSettings();
    return;
  }

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

const syncDetachedFocusWindowVisibility = () => {
  if (!supportsDetachedFocusWindow) {
    closeDetachedFocusWindow();
    return;
  }

  if (props.enabled) {
    syncDetachedFocusWindow(true, linkedTarget.value ?? null);
    return;
  }

  closeDetachedFocusWindow();
};

watch(linkedTarget, (nextTarget) => {
  if (supportsDetachedFocusWindow && props.enabled) {
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

watch(() => props.enabled, (value) => {
  syncDetachedFocusWindowVisibility();

  if (!value) {
    void stopTimer();
    showSettings.value = false;
  } else if (!supportsDetachedFocusWindow) {
    ensureContainer();
    initPosition();
  }
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

onMounted(() => {
  syncDetachedFocusWindowVisibility();

  if (!supportsDetachedFocusWindow) {
    ensureContainer();
    loadPosition();
    initPosition();
    window.addEventListener('resize', handleResize);
    if (containerEl.value && typeof ResizeObserver !== 'undefined') {
      containerResizeObserver.value = new ResizeObserver(handleContainerResize);
      containerResizeObserver.value.observe(containerEl.value);
    }
    document.addEventListener('mousedown', handleDocumentClick);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  if (containerResizeObserver.value) {
    containerResizeObserver.value.disconnect();
    containerResizeObserver.value = null;
  }
  document.removeEventListener('mousedown', handleDocumentClick);
  closeDetachedFocusWindow();

  clearTimer();
  releaseFocusSession();
});

defineExpose({
  openSettingsPanel
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
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 120px;
  min-height: 24px;
  padding: 7px 10px 9px;
  border-radius: 999px;
  border: 1px solid var(--b3-border-color);
  background: var(--b3-theme-background);
  box-shadow: var(--b3-point-shadow);
  color: var(--b3-theme-on-background);
  font-size: 12px;
  font-weight: 600;
  user-select: none;
  cursor: grab;
  touch-action: none;
  pointer-events: auto;
  --progress: 0;
  --progress-color: #f98f7a;
}

.floating-focus__capsule.is-dragging {
  cursor: grabbing;
}

.floating-focus__capsule::after {
  content: '';
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 4px;
  height: 2px;
  border-radius: 999px;
  background: var(--progress-color);
  transform: scaleX(var(--progress));
  transform-origin: left;
  opacity: 0.6;
}

.floating-focus__capsule.is-paused {
  opacity: 0.7;
}

.floating-focus__dot {
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--b3-theme-on-background);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
}

.floating-focus__duration {
  border: none;
  background: transparent;
  padding: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
}

.floating-focus__duration:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.floating-focus__time {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.4px;
  line-height: 1.1;
}

.floating-focus__content {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 2px;
}

.floating-focus__target,
.floating-focus__target-label {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 10px;
  line-height: 1.1;
  color: var(--b3-theme-on-surface);
}

.floating-focus__target {
  border: none;
  padding: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.floating-focus__target:hover {
  color: var(--b3-theme-on-background);
}

.floating-focus__actions {
  margin-left: auto;
  display: flex;
  gap: 4px;
}

.floating-focus__action {
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  cursor: pointer;
  padding: 0;
}

.floating-focus__action.is-stop {
  background: rgba(231, 76, 60, 0.16);
  color: #e74c3c;
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

.linked-target-setting {
  gap: 10px;
}

.timer-mode-toggle {
  display: inline-flex;
  gap: 6px;
  padding: 4px;
  border-radius: 999px;
  background: var(--b3-list-hover);
}

.timer-mode-toggle--inline {
  flex-shrink: 0;
}

.timer-mode-option {
  border: none;
  background: transparent;
  color: var(--b3-theme-on-surface);
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease, opacity 0.2s ease;
}

.timer-mode-option.active {
  background: var(--b3-theme-on-background-background);
  color: var(--b3-theme-background);
}

.timer-mode-option:disabled {
  cursor: not-allowed;
  opacity: 0.5;
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

.linked-habit-banner__picker-item-meta {
  flex: 0 0 auto;
  font-size: 11px;
  color: var(--b3-theme-on-surface);
}
</style>
