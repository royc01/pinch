<template>
  <div v-if="sortedHabits.length === 0" class="empty-state" v-show="!isHabitListCollapsed">
    {{ t('habitTracker.noHabits') }}
  </div>
  <div v-else class="habits-grid" v-show="!isHabitListCollapsed">
    <transition-group name="habit-list" tag="div" class="habits-container">
      <div
        v-for="habit in sortedHabits"
        :key="habit.id"
        :class="['habit-card', { completed: isHabitCompleted(habit), paused: habit.isPaused, 'drag-over': dragOverHabitId === habit.id }]"
        :style="getHabitColorStyle(habit)"
        @dragover.prevent="handleHabitDragOver($event, habit)"
        @dragleave="handleHabitDragLeave"
        @drop.prevent="handleHabitDrop($event, habit)"
      >
        <div class="habit-week-view">
          <div class="week-habit-item">
            <div class="emoji-section" @click="emit('show-stats', habit)">
              <span class="habit-emoji">{{ habit.emoji || fallbackHabitEmoji }}</span>
            </div>
            <div class="habit-info" @click="emit('show-stats', habit)">
              <div class="habit-title">
                <span class="habit-name ariaLabel" :aria-label="t('habitTracker.viewHabitDetails')">{{ habit.name }}</span>
                <button
                  type="button"
                  class="habit-doc-btn toolbar__item ariaLabel"
                  :aria-label="habit.noteDocId ? t('habitTracker.openNoteDoc') : t('habitTracker.bindNoteDoc')"
                  @click.stop="emit('doc-button', habit)"
                  @contextmenu.prevent.stop="emit('open-bind-doc', habit)"
                >
                  <Icon :name="habit.noteDocId ? 'open' : 'bindDoc'" width="12" height="12" class="icon" />
                </button>
                <button class="ariaLabel"
                  type="button"
                  :class="[
                    'pomodoro-indicator',
                    'pomodoro-indicator--button',
                    'ariaLabel',
                    { 'pomodoro-indicator--hover-reveal': !habit.usePomodoro }
                  ]"
                  :disabled="habit.isPaused"
                  :aria-label="t('habitTracker.startFocusTimer')"
                  @click.stop="emit('start-focus', habit)"
                >
                  <template v-if="habit.usePomodoro">
                    {{ pomodoroIcon }} {{ habit.pomodoroDuration ? `${habit.pomodoroDuration}min` : '25min' }}
                  </template>
                  <template v-else>{{ pomodoroIcon }}</template>
                </button>
              </div>
              <div v-if="manageMode" class="habit-status-text">
                <span :class="['habit-status-badge', habit.isPaused ? 'paused' : 'active']">
                  {{ habit.isPaused ? t('habitTracker.pausedStatus') : t('habitTracker.activeStatus') }}
                </span>
              </div>
              <div v-else class="week-checkboxes ariaLabel" :aria-label="t('habitTracker.viewHabitDetails')">
                <div class="ariaLabel"
                  v-for="day in getCalendarViewData(habit)"
                  :key="day.date"
                  :class="[
                    'day-checkbox',
                    {
                      completed: day.completed,
                      today: day.isToday,
                      past: day.isPast,
                      future: day.isFuture,
                      'not-scheduled': !day.isScheduled,
                      'completed-by-weekly-rule': day.isCompletedByWeeklyRule
                    }
                  ]"
                  :aria-label="day.date"
                >
                  <Icon
                    :name="day.completed ? 'squareCheck' : 'square'"
                    :completed="day.completed"
                    class="day-checkbox-icon"
                  />
                </div>
              </div>
            </div>
            <div class="habit-actions">
              <SyCheckbox
                v-if="manageMode"
                class="habit-pause-switch"
                :model-value="!habit.isPaused"
                @update:model-value="emit('toggle-pause', habit)"
              />
              <SyButton
                v-else
                @click="emit('toggle-habit', habit.id)"
                @contextmenu.prevent="emit('toggle-habit-with-note', habit)"
                :type="isHabitCompleted(habit) ? 'success' : 'default'"
                size="small"
                :class="['check-in-btn', 'ariaLabel', { 'success-animation': showAnimation && animationHabitId === habit.id }]"
                :disabled="habit.isPaused || !isHabitScheduledToday(habit)"
                :aria-label="getCheckInButtonAriaLabel(habit)"
              >
                <div v-if="showAnimation && animationHabitId === habit.id" class="rays-container">
                  <div class="ray"></div>
                  <div class="ray"></div>
                  <div class="ray"></div>
                  <div class="ray"></div>
                  <div class="ray"></div>
                  <div class="ray"></div>
                  <div class="ray"></div>
                  <div class="ray"></div>
                  <div class="ray"></div>
                  <div class="ray"></div>
                  <div class="ray"></div>
                  <div class="ray"></div>
                </div>
                <svg
                  v-if="shouldShowProgressPie(habit)"
                  class="progress-pie"
                  width="26"
                  height="26"
                  viewBox="0 0 26 26"
                >
                  <clipPath :id="getRectClipId(habit.id)">
                    <rect x="0" y="0" width="26" height="26" rx="8" ry="8" />
                  </clipPath>
                  <rect
                    class="progress-pie__background"
                    x="0"
                    y="0"
                    width="26"
                    height="26"
                    rx="8"
                    ry="8"
                    fill="var(--b3-list-hover)"
                  />
                  <g :clip-path="`url(#${getRectClipId(habit.id)})`">
                    <path class="progress-pie__progress" :d="getHabitCache(habit.id).piePath" fill="#f98f7a" />
                  </g>
                  <text x="13" y="16" text-anchor="middle" class="progress-pie__text">
                    {{ getHabitCache(habit.id).todayCompletionCount }}
                  </text>
                </svg>
                <Icon
                  v-else
                  name="check"
                  :completed="habit.completedToday"
                  class="icon"
                />
              </SyButton>
            </div>
          </div>

          <div v-if="habit.usePomodoro && habit.id === activePomodoroHabitId" class="pomodoro-inline-display">
            <div class="pomodoro-timer-inline">
              <div class="timer-container">
                <div class="timer" :class="pomodoroStateClass(habit.pomodoroState)">
                  {{ formatPomodoroTime(habit.pomodoroRemaining || 25 * 60) }}
                </div>
                <svg class="progress-ring" width="100" height="100">
                  <circle class="progress-ring__bg" r="45" cx="50" cy="50" />
                  <circle
                    class="progress-ring__progress"
                    r="45"
                    cx="50"
                    cy="50"
                    :stroke-dasharray="inlineCircumference"
                    :stroke-dashoffset="inlineStrokeDashoffset"
                  />
                </svg>
              </div>
            </div>
            <div class="pomodoro-controls-inline">
              <button
                v-if="!habit.isPomodoroPaused"
                class="pause-btn ariaLabel"
                :aria-label="t('habitTracker.pausePomodoro')"
                @click="emit('pomodoro-pause')"
              >
                <Icon name="pause" width="16" height="16" class="icon" />
              </button>
              <button
                v-if="habit.isPomodoroPaused"
                class="resume-btn ariaLabel"
                :aria-label="t('habitTracker.resumePomodoro')"
                @click="emit('pomodoro-resume')"
              >
                <Icon name="play" width="16" height="16" class="icon" />
              </button>
              <button
                class="stop-btn ariaLabel"
                :aria-label="t('habitTracker.stopPomodoro')"
                @click="emit('pomodoro-stop')"
              >
                <Icon name="stop" width="16" height="16" class="icon" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { ref, toRefs } from 'vue';
import type { Habit } from '@/api';
import Icon from '@/components/Icon.vue';
import SyButton from '@/components/SiyuanTheme/SyButton.vue';
import SyCheckbox from '@/components/SiyuanTheme/SyCheckbox.vue';
import { buildHabitColorStyle, normalizeHabitEmojiColorIndex, resolveHabitEmojiColorIndex } from '@/utils/habitEmojiColor';

interface HabitCacheData {
  weeklyCompleted: boolean;
  todayCompletionCount: number;
  piePath: string;
}

interface CalendarDayData {
  date: string;
  completed: boolean;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  isCompletedByWeeklyRule: boolean;
  isScheduled: boolean;
}

const props = withDefaults(defineProps<{
  sortedHabits: Habit[];
  isHabitListCollapsed: boolean;
  showAnimation: boolean;
  animationHabitId: string | null;
  activePomodoroHabitId: string | null;
  inlineCircumference: number;
  inlineStrokeDashoffset: number;
  t: (key: string) => string;
  getHabitCache: (habitId: string) => HabitCacheData;
  getCalendarViewData: (habit: Habit) => CalendarDayData[];
  isHabitScheduledToday: (habit: Habit) => boolean;
  pomodoroStateClass: (state: string | undefined) => string;
  formatPomodoroTime: (seconds: number) => string;
  manageMode?: boolean;
}>(), {
  manageMode: false
});

const emit = defineEmits<{
  (event: 'show-stats', habit: Habit): void;
  (event: 'doc-button', habit: Habit): void;
  (event: 'open-bind-doc', habit: Habit): void;
  (event: 'start-focus', habit: Habit): void;
  (event: 'toggle-habit', habitId: string): void;
  (event: 'toggle-habit-with-note', habit: Habit): void;
  (event: 'toggle-pause', habit: Habit): void;
  (event: 'pomodoro-pause'): void;
  (event: 'pomodoro-resume'): void;
  (event: 'pomodoro-stop'): void;
  (event: 'bind-doc', habit: Habit, docId: string): void;
}>();

const dragOverHabitId = ref<string | null>(null);

const extractDocIdFromDragEvent = (event: DragEvent): string | null => {
  const dataTransfer = event.dataTransfer;
  if (!dataTransfer) return null;

  // SiYuan uses the application/siyuan-file format.
  const formats = ['application/siyuan-file', 'text/plain', 'text/uri-list', 'text/html', 'application/x-siyuan-id'];
  let textData: string | null = null;
  
  for (const format of formats) {
    const data = dataTransfer.getData(format);
    if (data) {
      textData = data;
      break;
    }
  }

  if (!textData) return null;

  // Match the SiYuan document ID format: YYYYMMDDHHMMSS-xxxxxxx.
  const match = textData.match(/\d{14}-[a-z0-9]{7}/i);
  
  return match ? match[0] : null;
};

const handleHabitDragOver = (event: DragEvent, habit: Habit): void => {
  event.preventDefault();
  const dataTransfer = event.dataTransfer;
  if (!dataTransfer) return;

  // Allow all supported drag payload types.
  dragOverHabitId.value = habit.id;
  dataTransfer.dropEffect = 'link';
};

const handleHabitDragLeave = (): void => {
  dragOverHabitId.value = null;
};

const handleHabitDrop = (event: DragEvent, habit: Habit): void => {
  dragOverHabitId.value = null;
  
  const docId = extractDocIdFromDragEvent(event);
  if (docId) {
    emit('bind-doc', habit, docId);
  }
};

const getRectClipId = (habitId: string) => `rect-clip-${habitId}`;
const fallbackHabitEmoji = '\u{1F4DD}';
const pomodoroIcon = '\u{1F345}';

const getHabitColorStyle = (habit: Habit): Record<string, string> => {
  const colorIndex = normalizeHabitEmojiColorIndex(habit.emojiColorIndex) ?? resolveHabitEmojiColorIndex(habit.emoji);
  return buildHabitColorStyle(colorIndex);
};

const isHabitCompleted = (habit: Habit) => {
  const cache = props.getHabitCache(habit.id);
  return !!habit.completedToday || cache.weeklyCompleted;
};

const shouldShowProgressPie = (habit: Habit) => {
  const timesPerDay = Number(habit.timesPerDay || 1);
  const count = props.getHabitCache(habit.id).todayCompletionCount;
  if (habit.completionMode === 'atLeast') {
    return count > 0;
  }
  return timesPerDay > 1 && count > 0 && count < timesPerDay;
};

const getCheckInButtonAriaLabel = (habit: Habit) => {
  if (!props.isHabitScheduledToday(habit)) {
    return props.t('habitTracker.notScheduledToday');
  }
  return (habit.usePomodoro && !isHabitCompleted(habit) ? props.t('habitTracker.startFocusTimer') : props.t('habitTracker.checkIn'))
    + '<br>'
    + props.t('habitTracker.rightClickFillNote');
};

const {
  sortedHabits,
  isHabitListCollapsed,
  showAnimation,
  animationHabitId,
  activePomodoroHabitId,
  inlineCircumference,
  inlineStrokeDashoffset,
  t,
  getHabitCache,
  getCalendarViewData,
  isHabitScheduledToday,
  pomodoroStateClass,
  formatPomodoroTime,
  manageMode
} = toRefs(props);
</script>

<style scoped>
.empty-state {
  text-align: center;
  padding: 20px;
  color: var(--b3-theme-on-surface);
  font-size: 14px;
}

.habits-grid {
  display: grid;
  gap: 6px;
}

.habits-container {
  display: contents;
}

.habit-card {
  background: var(--b3-theme-background);
  border-radius: 10px;
  box-shadow: var(--pinch-shadow);
  transition: all 0.3s ease;
  transition-property: transform, opacity, height;
  will-change: transform;
}

.habit-card.completed {
  box-shadow: inset 0 0 0 100px rgba(0, 0, 0, 0.03), var(--pinch-shadow);
}

.habit-card.drag-over {
  box-shadow: 0 0 0 2px #f98f7a, rgba(0, 0, 0, 0.12) 0 4px 12px 0;
  background: rgba(249, 143, 122, 0.05);
  transform: scale(1.02);
}

.week-habit-item {
  display: flex;
  align-items: center;
  padding: 4px;
}

.emoji-section {
  text-align: center;
  font-size: 30px;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.habit-info {
  flex: 1;
  margin: 0 6px;
}

.habit-title {
  font-weight: bold;
  margin-left: 2px;
  display: flex;
  align-items: center;
  min-height: 20px;
}

.habit-name {
  color: var(--b3-theme-on-background);
  margin-right: 6px;
}

.habit-doc-btn {
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  border-radius: 4px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin-right: 6px;
}

.habit-doc-btn:hover {
  background-color: var(--b3-list-hover);
}

.habit-doc-btn .icon {
  color: var(--b3-theme-on-surface);
}

.pomodoro-indicator {
  font-weight: 500;
  font-size: 11px;
  color: var(--b3-theme-on-surface);
  background-color: var(--b3-list-hover);
  padding: 2px 6px;
  border-radius: 6px;
}

.pomodoro-indicator--button {
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease, opacity 0.2s ease;
}

.pomodoro-indicator--hover-reveal {
  opacity: 0;
  pointer-events: none;
}

.habit-card:hover .pomodoro-indicator--hover-reveal,
.habit-card:focus-within .pomodoro-indicator--hover-reveal {
  opacity: 1;
  pointer-events: auto;
}

.pomodoro-indicator--button:hover:not(:disabled) {
  background-color: rgba(249, 143, 122, 0.16);
  color: #cf5c4b;
}

.pomodoro-indicator--button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.week-checkboxes {
  display: flex;
}

.habit-status-text {
  display: flex;
  align-items: center;
  min-height: 18px;
}

.habit-status-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 999px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-surface);
}

.habit-status-badge.active {
  background: rgba(67, 160, 71, 0.12);
  color: #2e7d32;
}

.habit-status-badge.paused {
  background: rgba(249, 143, 122, 0.16);
  color: #cf5c4b;
}

.day-checkbox {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2px;
}

.day-checkbox-icon {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  transition: all 0.2s;
}

.day-checkbox.today:not(.completed) .day-checkbox-icon,
.day-checkbox.today.completed-by-weekly-rule .day-checkbox-icon,
.day-checkbox.past.completed-by-weekly-rule .day-checkbox-icon,
.day-checkbox.future.completed-by-weekly-rule .day-checkbox-icon {
  color: oklch(68.98% 0.161 30.76 / 0.2);
}

.day-checkbox.past:not(.completed) .day-checkbox-icon {
  color: var(--b3-list-hover);
}

.day-checkbox.completed .day-checkbox-icon {
  color: #f98f7a;
}

.day-checkbox.future .day-checkbox-icon {
  color: var(--b3-list-hover);
}

.day-checkbox.not-scheduled .day-checkbox-icon {
  color: var(--b3-border-color);
  opacity: 0.35;
}

.day-checkbox.not-scheduled.completed .day-checkbox-icon {
  opacity: 1;
}

.habit-actions {
  display: flex;
  align-items: center;
}

.habit-pause-switch {
  margin-right: 8px;
}

.check-in-btn {
  background-color: var(--b3-list-hover);
  border-radius: 8px;
  border: none;
  padding: 0;
  min-width: auto;
  width: 26px;
  height: 26px;
  margin-right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.check-in-btn .icon {
  width: 12px;
  height: 12px;
  color: var(--b3-theme-background);
  transition: color 0.3s, fill 0.3s;
}

.check-in-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.check-in-btn[type='success'] {
  background-color: #f98f7a;
}

.rays-container {
  position: absolute;
  top: 50%;
  left: 10px;
  width: 24px;
  height: 24px;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.ray {
  position: absolute;
  top: 0;
  left: 50%;
  width: 4px;
  height: 12px;
  background: var(--pinch-habit-color);
  border-radius: 4px;
  transform-origin: bottom center;
  opacity: 0;
  animation: rayAnimation 0.4s ease-out forwards;
}

.ray:nth-child(1) {
  --rotation: 0deg;
  transform: rotate(0deg) translateY(-10px);
}

.ray:nth-child(2) {
  --rotation: 30deg;
  transform: rotate(30deg) translateY(-10px);
}

.ray:nth-child(3) {
  --rotation: 60deg;
  transform: rotate(60deg) translateY(-10px);
}

.ray:nth-child(4) {
  --rotation: 90deg;
  transform: rotate(90deg) translateY(-10px);
}

.ray:nth-child(5) {
  --rotation: 120deg;
  transform: rotate(120deg) translateY(-10px);
}

.ray:nth-child(6) {
  --rotation: 150deg;
  transform: rotate(150deg) translateY(-10px);
}

.ray:nth-child(7) {
  --rotation: 180deg;
  transform: rotate(180deg) translateY(-10px);
}

.ray:nth-child(8) {
  --rotation: 210deg;
  transform: rotate(210deg) translateY(-10px);
}

.ray:nth-child(9) {
  --rotation: 240deg;
  transform: rotate(240deg) translateY(-10px);
}

.ray:nth-child(10) {
  --rotation: 270deg;
  transform: rotate(270deg) translateY(-10px);
}

.ray:nth-child(11) {
  --rotation: 300deg;
  transform: rotate(300deg) translateY(-10px);
}

.ray:nth-child(12) {
  --rotation: 330deg;
  transform: rotate(330deg) translateY(-10px);
}

@keyframes rayAnimation {
  0% {
    opacity: 1;
    transform: rotate(var(--rotation)) translateY(-10px) scale(0.2);
  }

  50% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform: rotate(var(--rotation)) translateY(-20px) scale(1);
  }
}

.progress-pie__progress {
  transition: d 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.progress-pie__text {
  font-weight: bold;
  fill: var(--b3-theme-background);
  text-anchor: middle;
  dominant-baseline: middle;
  font-size: 16px;
}

.habit-list-enter-active,
.habit-list-leave-active {
  transition: all 0.3s ease;
}

.habit-list-enter-from,
.habit-list-leave-to {
  opacity: 0;
  transform: translateY(30px);
}

.pomodoro-inline-display {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-around;
  padding: 8px;
  background-color: var(--b3-list-hover);
  border-radius: 8px;
  margin: 0 8px 8px;
}

.pomodoro-timer-inline {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.timer-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.pomodoro-timer-inline .timer {
  position: absolute;
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 70%;
  height: 70%;
  border-radius: 50%;
  background-color: var(--b3-theme-background);
  z-index: 1;
}

.pomodoro-timer-inline .progress-ring {
  width: 100px;
  height: 100px;
  transform: rotate(-90deg);
  position: relative;
  z-index: 0;
}

.pomodoro-timer-inline .progress-ring circle {
  fill: none;
  stroke-width: 8;
}

.pomodoro-timer-inline .progress-ring .progress-ring__bg {
  stroke: var(--b3-list-hover);
}

.pomodoro-timer-inline .progress-ring .progress-ring__progress {
  stroke: #f98f7a;
  stroke-linecap: round;
  transition: stroke-dashoffset 1s ease-in-out;
  transform-origin: 50% 50%;
}

.pomodoro-controls-inline {
  display: flex;
  gap: 12px;
}

.pomodoro-controls-inline .stop-btn {
  background-color: #e74c3c;
  color: var(--b3-theme-background);
  border: none;
  border-radius: 8px;
  padding: 10px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pomodoro-controls-inline .pause-btn {
  background-color: #f39c12;
  color: var(--b3-theme-background);
  border: none;
  border-radius: 8px;
  padding: 10px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pomodoro-controls-inline .resume-btn {
  background-color: #27ae60;
  color: var(--b3-theme-background);
  border: none;
  border-radius: 8px;
  padding: 10px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
