<template>
  <Teleport to="body">
  <div
    v-if="show"
    ref="menuRef"
    :class="['context-menu', { 'context-menu-mobile-sheet': isMobileSheet }]"
    :style="menuStyle"
    @click.stop
  >
    <div class="context-menu-section">
      <div class="task-color-picker">
        <div
          v-for="color in backgroundColors"
          :key="color.value"
          class="color-option"
          :class="{ selected: task?.backgroundColor === color.value }"
          :style="{ backgroundColor: color.css }"
          @click="$emit('setColor', color.value)"
        ></div>
      </div>
    </div>

    <div class="context-menu-section">
      <div class="context-menu-date-grid">
        <div class="date-edit-field">
          <label>{{ t('startDate') }}</label>
          <div class="context-menu-date-input-group">
            <input
              :value="startDate"
              type="date"
              @input="$emit('update:startDate', ($event.target as HTMLInputElement).value)"
            />
            <button
              ref="startDateTriggerRef"
              type="button"
              class="context-menu-date-trigger"
              :class="{ active: activeDatePopoverField === 'startDate' }"
              :title="t('selectStartDate')"
              :aria-label="t('selectStartDate')"
              @click="toggleDatePopover('startDate')"
            >
              <Icon name="calendar" width="14" height="14" />
            </button>
          </div>
        </div>
        <div class="date-edit-field">
          <label>{{ t('dueDate') }}</label>
          <div class="context-menu-date-input-group">
            <input
              :value="dueDate"
              type="date"
              @input="$emit('update:dueDate', ($event.target as HTMLInputElement).value)"
            />
            <button
              ref="dueDateTriggerRef"
              type="button"
              class="context-menu-date-trigger"
              :class="{ active: activeDatePopoverField === 'dueDate' }"
              :title="t('selectDueDate')"
              :aria-label="t('selectDueDate')"
              @click="toggleDatePopover('dueDate')"
            >
              <Icon name="calendar" width="14" height="14" />
            </button>
          </div>
        </div>
        <div class="date-edit-field">
          <label>{{ t('startTime') }}</label>
          <div class="context-menu-date-input-group">
            <input
              :value="startTime"
              type="time"
              @input="$emit('update:startTime', ($event.target as HTMLInputElement).value)"
            />
            <button
              ref="startTimeTriggerRef"
              type="button"
              class="context-menu-date-trigger"
              :class="{ active: activeTimePopoverField === 'startTime' }"
              :title="t('selectStartTime')"
              :aria-label="t('selectStartTime')"
              @click="toggleTimePopover('startTime')"
            >
              <Icon name="clock" width="14" height="14" />
            </button>
          </div>
        </div>
        <div class="date-edit-field">
          <label>{{ t('dueTime') }}</label>
          <div class="context-menu-date-input-group">
            <input
              :value="dueTime"
              type="time"
              @input="$emit('update:dueTime', ($event.target as HTMLInputElement).value)"
            />
            <button
              ref="dueTimeTriggerRef"
              type="button"
              class="context-menu-date-trigger"
              :class="{ active: activeTimePopoverField === 'dueTime' }"
              :title="t('selectDueTime')"
              :aria-label="t('selectDueTime')"
              @click="toggleTimePopover('dueTime')"
            >
              <Icon name="clock" width="14" height="14" />
            </button>
          </div>
        </div>
      </div>
      <button class="context-menu-date-save" @click="$emit('saveDates')">{{ t('saveDates') }}</button>
      <button class="context-menu-date-clear" @click="$emit('clearTaskDates')">{{ t('clearTask') }}</button>
    </div>

    <div class="context-menu-section">
      <div class="repeat-edit-row">
        <label>{{ t('frequency') }}</label>
        <select :value="repeatFrequency" @change="onRepeatChange">
          <option value="none">{{ t('none') }}</option>
          <option value="daily">{{ t('everyday') }}</option>
          <option value="weekdays">{{ t('workdays') }}</option>
          <option value="weekend">{{ t('weekend') }}</option>
          <option value="weekly">{{ t('weeklyBasedOnFirstDay') }}</option>
        </select>
      </div>
    </div>

    <div class="context-menu-divider"></div>
    <div class="context-menu-item" @click="$emit('startFocus')">
      <Icon name="timer" width="16" height="16" />
      <span>{{ t('startFocus') }}</span>
    </div>
    <div class="context-menu-item edit-item" @click="$emit('editTask')">
      <Icon name="edit" width="16" height="16" />
      <span>{{ t('editTask') }}</span>
    </div>

    <TaskDatePopover
      v-if="activeDatePopoverField === 'startDate'"
      :visible="true"
      :model-value="startDate"
      :anchor-el="startDateTriggerRef"
      @update:modelValue="$emit('update:startDate', $event)"
      @close="activeDatePopoverField = null"
    />

    <TaskDatePopover
      v-if="activeDatePopoverField === 'dueDate'"
      :visible="true"
      :model-value="dueDate"
      :anchor-el="dueDateTriggerRef"
      @update:modelValue="$emit('update:dueDate', $event)"
      @close="activeDatePopoverField = null"
    />

    <TaskTimePopover
      v-if="activeTimePopoverField === 'startTime'"
      :visible="true"
      :model-value="startTime"
      :anchor-el="startTimeTriggerRef"
      @update:modelValue="$emit('update:startTime', $event)"
      @close="activeTimePopoverField = null"
    />

    <TaskTimePopover
      v-if="activeTimePopoverField === 'dueTime'"
      :visible="true"
      :model-value="dueTime"
      :anchor-el="dueTimeTriggerRef"
      @update:modelValue="$emit('update:dueTime', $event)"
      @close="activeTimePopoverField = null"
    />
  </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { t } from '@/utils/i18n';
import type { Task } from '@/api';
import type { RepeatFrequency } from '@/repeatRepository';
import Icon from '@/components/Icon.vue';
import TaskDatePopover from '@/components/TaskDatePopover.vue';
import TaskTimePopover from '@/components/TaskTimePopover.vue';

interface BackgroundColorOption {
  value: string;
  css: string;
}

const props = defineProps<{
  show: boolean;
  x: number;
  y: number;
  task: Task | null;
  backgroundColors: BackgroundColorOption[];
  startDate: string;
  startTime: string;
  dueDate: string;
  dueTime: string;
  repeatFrequency: RepeatFrequency;
}>();

const emit = defineEmits<{
  (event: 'setColor', color: string): void;
  (event: 'saveDates'): void;
  (event: 'clearTaskDates'): void;
  (event: 'editTask'): void;
  (event: 'startFocus'): void;
  (event: 'update:startDate', value: string): void;
  (event: 'update:startTime', value: string): void;
  (event: 'update:dueDate', value: string): void;
  (event: 'update:dueTime', value: string): void;
  (event: 'saveRepeatRule', value: RepeatFrequency): void;
}>();

const isMobileSheet = ref(false);
const menuRef = ref<HTMLElement | null>(null);
const menuPosition = ref<{ x: number; y: number }>({ x: 0, y: 0 });
const activeDatePopoverField = ref<'startDate' | 'dueDate' | null>(null);
const activeTimePopoverField = ref<'startTime' | 'dueTime' | null>(null);
const startDateTriggerRef = ref<HTMLElement | null>(null);
const dueDateTriggerRef = ref<HTMLElement | null>(null);
const startTimeTriggerRef = ref<HTMLElement | null>(null);
const dueTimeTriggerRef = ref<HTMLElement | null>(null);

const menuStyle = computed<Record<string, string>>(() => {
  if (isMobileSheet.value) {
    return {};
  }
  return {
    left: `${Math.round(menuPosition.value.x)}px`,
    top: `${Math.round(menuPosition.value.y)}px`
  };
});

function clampMenuPosition(): void {
  if (isMobileSheet.value || !props.show) {
    return;
  }
  const menu = menuRef.value;
  if (!menu) {
    return;
  }
  const padding = 12;
  const rect = menu.getBoundingClientRect();
  const maxX = window.innerWidth - rect.width - padding;
  const maxY = window.innerHeight - rect.height - padding;
  const nextX = Math.min(Math.max(padding, menuPosition.value.x), Math.max(padding, maxX));
  const nextY = Math.min(Math.max(padding, menuPosition.value.y), Math.max(padding, maxY));
  if (nextX !== menuPosition.value.x || nextY !== menuPosition.value.y) {
    menuPosition.value = { x: nextX, y: nextY };
  }
}

function syncMenuPosition(): void {
  if (isMobileSheet.value || !props.show) {
    return;
  }
  menuPosition.value = {
    x: Number.isFinite(props.x) ? props.x : 0,
    y: Number.isFinite(props.y) ? props.y : 0
  };
  void nextTick(() => {
    clampMenuPosition();
    window.requestAnimationFrame(() => {
      clampMenuPosition();
    });
  });
}

function updateMobileSheetState(): void {
  if (typeof window === 'undefined') {
    isMobileSheet.value = false;
    return;
  }
  const isNarrowScreen = window.innerWidth <= 768;
  const isCoarsePointer = typeof window.matchMedia === 'function'
    ? window.matchMedia('(pointer: coarse)').matches
    : false;
  isMobileSheet.value = isNarrowScreen || (isCoarsePointer && window.innerWidth <= 1024);
  if (!isMobileSheet.value) {
    syncMenuPosition();
  }
}

onMounted(() => {
  updateMobileSheetState();
  window.addEventListener('resize', updateMobileSheetState);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateMobileSheetState);
});

watch(
  () => [props.show, props.x, props.y, isMobileSheet.value] as const,
  ([show]) => {
    if (!show) {
      activeDatePopoverField.value = null;
      activeTimePopoverField.value = null;
      return;
    }
    syncMenuPosition();
  }
);

function toggleDatePopover(field: 'startDate' | 'dueDate'): void {
  activeTimePopoverField.value = null;
  activeDatePopoverField.value = activeDatePopoverField.value === field ? null : field;
}

function toggleTimePopover(field: 'startTime' | 'dueTime'): void {
  activeDatePopoverField.value = null;
  activeTimePopoverField.value = activeTimePopoverField.value === field ? null : field;
}

function onRepeatChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value as RepeatFrequency;
  if (
    value === 'none'
    || value === 'daily'
    || value === 'weekdays'
    || value === 'weekend'
    || value === 'weekly'
  ) {
    emit('saveRepeatRule', value);
    return;
  }
  emit('saveRepeatRule', props.repeatFrequency || 'none');
}
</script>

<style scoped>
.context-menu {
  position: fixed;
  background: var(--b3-theme-surface);
  border: 1px solid var(--b3-border-color);
  border-radius: 8px;
  box-shadow: 0 12px 28px #0000002e;
  z-index: 50;
  min-width: 240px;
  padding: 8px;
  animation: contextMenuFadeIn 0.15s ease-out;
}

@keyframes contextMenuFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes contextMenuSlideUp {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.context-menu-mobile-sheet {
  left: 8px !important;
  right: 8px;
  top: auto !important;
  bottom: calc(env(safe-area-inset-bottom) + 8px);
  width: auto;
  min-width: 0;
  max-height: min(75vh, 560px);
  overflow-y: auto;
  border-radius: 14px;
  padding-bottom: calc(8px + env(safe-area-inset-bottom));
  animation: contextMenuSlideUp 0.2s ease-out;
}

.context-menu-section {
  padding: 4px;
  margin-bottom: 8px;
}

.task-color-picker {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: 6px;
  padding: 4px;
}

.color-option {
  width: 100%;
  max-width: 22px;
  aspect-ratio: 1 / 1;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  justify-self: center;
}

.color-option:hover,
.color-option.selected {
  border-color: var(--b3-border-color);
}

.context-menu-date-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 12px;
  margin-bottom: 8px;
}

.date-edit-field {
  min-width: 0;
}

.date-edit-field label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  opacity: 0.8;
  line-height: 1.2;
}

.repeat-edit-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.repeat-edit-row label {
  width: 36px;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  opacity: 0.8;
  flex-shrink: 0;
}

.date-edit-field input[type="date"],
.date-edit-field input[type="time"],
.repeat-edit-row select {
  flex: 1;
  min-width: 0;
  padding: 6px 34px 6px 10px;
  border: none;
  border-radius: 6px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  font-size: 12px;
  outline: none;
}

.context-menu-date-input-group {
  flex: 1;
  min-width: 0;
  position: relative;
  display: block;
}

.context-menu-date-input-group input[type="date"],
.context-menu-date-input-group input[type="time"] {
  width: 100%;
  box-sizing: border-box;
  appearance: none;
  -webkit-appearance: none;
}

.context-menu-date-input-group input[type="date"]::-webkit-calendar-picker-indicator,
.context-menu-date-input-group input[type="time"]::-webkit-calendar-picker-indicator,
.context-menu-date-input-group input[type="date"]::-webkit-clear-button,
.context-menu-date-input-group input[type="date"]::-webkit-inner-spin-button,
.context-menu-date-input-group input[type="time"]::-webkit-clear-button,
.context-menu-date-input-group input[type="time"]::-webkit-inner-spin-button {
  opacity: 0;
  pointer-events: none;
  width: 0;
  margin: 0;
  display: none;
}

.context-menu-date-trigger {
  position: absolute;
  top: 50%;
  right: 4px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--b3-theme-on-background);
  cursor: pointer;
  transform: translateY(-50%);
  transition: color 0.15s ease, background-color 0.15s ease;
  z-index: 1;
}

.context-menu-date-trigger svg {
  flex: 0 0 auto;
  fill: currentColor;
}

.context-menu-date-trigger:hover,
.context-menu-date-trigger.active {
  color: var(--b3-theme-primary);
  background: var(--b3-list-hover);
}

.context-menu-date-save {
  width: 100%;
  border: none;
  background-color: #f98f7a;
  color: var(--b3-theme-background);
  border-radius: 6px;
  font-size: 12px;
  padding: 6px 8px;
  cursor: pointer;
}

.context-menu-date-save:hover {
  background-color: #f98f7a;
  color: var(--b3-theme-background);
}

.context-menu-date-clear {
  width: 100%;
  border: 1px solid var(--pinch-color10);
  background-color:  var(--pinch-background10);
  color: var(--b3-theme-on-background);
  border-radius: 6px;
  font-size: 12px;
  padding: 6px 8px;
  cursor: pointer;
  margin-top: 6px;
  opacity: 0.7;
}

.context-menu-date-clear:hover {
  opacity: 1;
}

.context-menu-divider {
  height: 1px;
  background: var(--b3-border-color);
  margin: 8px 4px;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  color: var(--b3-theme-on-background);
  font-size: 13px;
  border-radius: 6px;
  transition: all 0.15s ease;
  font-weight: 400;
}

.context-menu-item:hover {
  background: var(--b3-list-hover);
}

.context-menu-item.edit-item:hover {
  color: #f98f7a;
}

.context-menu-item svg {
  flex-shrink: 0;
  opacity: 0.8;
  transition: opacity 0.15s;
}

.context-menu-item:hover svg {
  opacity: 1;
}
</style>
