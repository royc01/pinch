<template>
  <Teleport :to="teleportTarget">
    <div v-if="enabled" class="floating-focus" :style="wrapperStyle">
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
          v-if="!isActive"
          type="button"
          class="floating-focus__duration"
          data-no-drag
          title="点击切换专注时长"
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
            @click.stop="stopTimer"
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
                  :disabled="isRunning || isPaused"
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
                  :disabled="isRunning || isPaused"
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
                  :disabled="isRunning || isPaused"
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Icon from '@/components/Icon.vue';
import { addFocusSession } from '@/api';
import { useFocusSessionLock } from '@/composables/useFocusSessionLock';

const props = withDefaults(defineProps<{
  enabled: boolean;
}>(), {
  enabled: false
});

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
const {
  isLockedByOther: isStartBlockedByOther,
  claimFocusSession,
  releaseFocusSession
} = useFocusSessionLock('capsule');

const remainingSeconds = ref(selectedDuration.value * 60);
const isRunning = ref(false);
const isPaused = ref(false);
const isBreakMode = ref(false);
const currentSet = ref(1);
const timerInterval = ref<number | null>(null);
const timerDeadline = ref<number>(0);
const showSettings = ref(false);
const settingsRef = ref<HTMLElement | null>(null);

const teleportTarget = computed(() => containerEl.value || 'body');

const durationMinutes = computed(() => selectedDuration.value);
const isActive = computed(() => isRunning.value || isPaused.value);

const displayTime = computed(() => formatSeconds(remainingSeconds.value));

const actionIcon = computed(() => (isRunning.value ? 'pause' : 'play'));
const actionTitle = computed(() => {
  if (isRunning.value) return '暂停';
  if (isPaused.value) return '继续';
  return '开始';
});

const progress = computed(() => {
  if (!isActive.value) return 0;
  const total = (isBreakMode.value ? shortBreakDuration.value : durationMinutes.value) * 60;
  if (!total) return 0;
  const remaining = Math.min(Math.max(remainingSeconds.value, 0), total);
  return 1 - remaining / total;
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
  if (timerInterval.value) {
    clearInterval(timerInterval.value);
    timerInterval.value = null;
  }
};

const resetRemaining = () => {
  remainingSeconds.value = durationMinutes.value * 60;
};

const recordFocusSession = async () => {
  const sessionMinutes = selectedDuration.value;
  await addFocusSession(sessionMinutes);
  window.dispatchEvent(new CustomEvent(FOCUS_SESSION_EVENT, { detail: { minutes: sessionMinutes } }));
};

const startCountdown = () => {
  timerDeadline.value = Date.now() + remainingSeconds.value * 1000;
  timerInterval.value = window.setInterval(async () => {
    const timeLeft = Math.ceil((timerDeadline.value - Date.now()) / 1000);
    if (timeLeft <= 0) {
      clearTimer();
      if (!isBreakMode.value) {
        try {
          await recordFocusSession();
        } catch {
          // ignore recording errors
        }

        if (currentSet.value < pomodoroSets.value && pomodoroSets.value >= 2) {
          isBreakMode.value = true;
          remainingSeconds.value = shortBreakDuration.value * 60;
          currentSet.value += 1;
          startCountdown();
          return;
        }
        stopTimer();
        return;
      }

      isBreakMode.value = false;
      remainingSeconds.value = durationMinutes.value * 60;
      startCountdown();
    } else {
      remainingSeconds.value = timeLeft;
    }
  }, 200);
};

const startTimer = () => {
  if (!claimFocusSession()) {
    return;
  }

  currentSet.value = 1;
  isBreakMode.value = false;
  if (remainingSeconds.value <= 0) {
    resetRemaining();
  }
  clearTimer();
  isRunning.value = true;
  isPaused.value = false;
  startCountdown();
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
  startCountdown();
};

const stopTimer = () => {
  clearTimer();
  isRunning.value = false;
  isPaused.value = false;
  isBreakMode.value = false;
  currentSet.value = 1;
  resetRemaining();
  releaseFocusSession();
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
  if (isActive.value) return;
  durationIndex.value = (durationIndex.value + 1) % durationMarks.length;
  selectedDuration.value = durationMarks[durationIndex.value];
  resetRemaining();
};

const updateDurationByIndex = () => {
  if (isRunning.value || isPaused.value) return;
  selectedDuration.value = durationMarks[durationIndex.value];
  resetRemaining();
};

const updateShortBreakDuration = () => {
  if (isRunning.value || isPaused.value) return;
  shortBreakDuration.value = shortBreakMarks[shortBreakDurationIndex.value];
};

const updatePomodoroSets = () => {
  if (isRunning.value || isPaused.value) return;
  pomodoroSets.value = Math.max(
    1,
    Math.min(Math.round(pomodoroSets.value), pomodoroSetMarks[pomodoroSetMarks.length - 1])
  );
};

const formatSeconds = (seconds: number) => {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const toggleSettings = () => {
  showSettings.value = !showSettings.value;
};

const handleDocumentClick = (event: MouseEvent) => {
  if (!showSettings.value) return;
  const target = event.target as Node | null;
  if (!target) return;
  if (capsuleRef.value?.contains(target)) return;
  if (settingsRef.value?.contains(target)) return;
  showSettings.value = false;
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

watch(() => props.enabled, (value) => {
  if (!value) {
    stopTimer();
    showSettings.value = false;
  } else {
    ensureContainer();
    initPosition();
  }
});

onMounted(() => {
  ensureContainer();
  loadPosition();
  initPosition();
  window.addEventListener('resize', handleResize);
  if (containerEl.value && typeof ResizeObserver !== 'undefined') {
    containerResizeObserver.value = new ResizeObserver(handleContainerResize);
    containerResizeObserver.value.observe(containerEl.value);
  }
  document.addEventListener('mousedown', handleDocumentClick);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  if (containerResizeObserver.value) {
    containerResizeObserver.value.disconnect();
    containerResizeObserver.value = null;
  }
  document.removeEventListener('mousedown', handleDocumentClick);
  clearTimer();
  releaseFocusSession();
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
  height: 24px;
  padding: 6px 10px;
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

.floating-focus__time {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.4px;
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
  width: 260px;
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
</style>
