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
        <button
          v-for="color in backgroundColors"
          :key="color.value"
          type="button"
          class="color-option"
          :class="{ selected: task?.backgroundColor === color.value }"
          :style="getColorOptionStyle(color)"
          :aria-label="color.value"
          @click="$emit('setColor', color.value)"
        ></button>
      </div>
    </div>

    <CalendarTaskDateSection
      class="context-menu-date-section"
      :start-date="startDate"
      :start-time="startTime"
      :due-date="dueDate"
      :due-time="dueTime"
      @update-dates="emitDateUpdate"
      @clear-dates="$emit('clearTaskDates')"
    />

    <div class="context-menu-section context-menu-repeat-section">
      <button
        type="button"
        ref="repeatButtonRef"
        class="task-editor-property-row ariaLabel"
        :aria-label="t('taskRepeat.repeat')"
        @click="openRepeatSettings"
      >
        <span class="task-editor-property-label">
          <Icon name="repeat" width="15" height="15" />
          <span>{{ t('taskRepeat.repeat') }}</span>
        </span>
        <span class="task-editor-property-value">
          <span v-if="normalizedRepeatFrequency !== 'none'" class="task-editor-property-pill">{{ repeatSummary }}</span>
          <span v-else class="task-editor-property-placeholder">{{ t('taskRepeat.none') }}</span>
        </span>
      </button>
    </div>

    <TaskEditorMetaPanel
      v-if="show || repeatSettingsOpen"
      repeat-only
      variant="floating"
      layout="properties"
      :panel="null"
      :start-date="startDate"
      :start-time="startTime"
      :due-date="dueDate"
      :due-time="dueTime"
      due-text=""
      :has-due-date="Boolean(startDate || dueDate)"
      description=""
      :has-description="false"
      :group-options="[]"
      selected-group-id=""
      group-label=""
      :repeat-frequency="repeatFrequency"
      :repeat-rule="repeatRule"
      :repeat-termination="resolvedRepeatTermination"
      :repeat-dialog-visible="repeatSettingsOpen"
      :repeat-popover-position="repeatPopoverPosition"
      :show-description-control="false"
      :show-due-date-action="false"
      :show-reminder-control="false"
      @update:repeat-dialog-visible="repeatSettingsOpen = $event"
      @save-repeat-rule="handleRepeatRuleSave"
    />

    <div class="context-menu-divider"></div>
    <div class="context-menu-item" @click="$emit('startFocus')">
      <Icon name="timer" width="16" height="16" />
      <span>{{ t('taskManager.startFocus') }}</span>
    </div>
    <div class="context-menu-item edit-item" @click="$emit('editTask')">
      <Icon name="edit" width="16" height="16" />
      <span>{{ t('taskManager.editTask') }}</span>
    </div>

  </div>
  </Teleport>

</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import type { Task } from '@/api';
import type { RepeatFrequency, RepeatRule, RepeatRuleInput, RepeatTermination } from '@/repeatRepository';
import CalendarTaskDateSection, { type CalendarTaskDateFields } from '@/components/CalendarTaskDateSection.vue';
import Icon from '@/components/Icon.vue';
import TaskEditorMetaPanel from '@/components/TaskEditorMetaPanel.vue';
import { useI18n } from '@/composables/useI18n';
import { resolveTaskAccentColor } from '@/utils/taskColor';
import { formatRepeatRuleLabel } from '@/utils/repeatRuleLabel';

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
  repeatRule?: RepeatRule | null;
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
  (event: 'saveRepeatRule', value: RepeatFrequency | RepeatRuleInput): void;
}>();

const isMobileSheet = ref(false);
const menuRef = ref<HTMLElement | null>(null);
const menuPosition = ref<{ x: number; y: number }>({ x: 0, y: 0 });
const repeatButtonRef = ref<HTMLElement | null>(null);
const repeatSettingsOpen = ref(false);
const repeatPopoverPosition = ref<{ left: number; top: number } | undefined>(undefined);
const { t } = useI18n();

const normalizedRepeatFrequency = computed<RepeatFrequency>(() => props.repeatFrequency || 'none');
// Keep the context menu consistent with the sidebar editor: when a task
// already has a due date, selecting a repeat preset should use it as the
// recurrence cutoff instead of silently changing the rule to "never ends".
const resolvedRepeatTermination = computed<RepeatTermination>(() => {
  const dueDate = props.dueDate.trim();
  return dueDate ? { type: 'date', date: dueDate } : { type: 'never' };
});
const repeatSummary = computed(() => normalizedRepeatFrequency.value === 'custom'
  ? formatRepeatRuleLabel(props.repeatRule, t)
  : t(`taskRepeat.${normalizedRepeatFrequency.value}`));

function openRepeatSettings(): void {
  const rect = repeatButtonRef.value?.getBoundingClientRect();
  if (rect) {
    repeatPopoverPosition.value = {
      left: Math.max(8, Math.min(rect.right - 360, window.innerWidth - 368)),
      top: Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - 520))
    };
  }
  repeatSettingsOpen.value = true;
}

function handleRepeatRuleSave(value: RepeatFrequency | RepeatRuleInput): void {
  repeatSettingsOpen.value = false;
  emit('saveRepeatRule', value);
}

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
      return;
    }
    syncMenuPosition();
  }
);

function emitDateUpdate(value: CalendarTaskDateFields): void {
  emit('update:startDate', value.startDate);
  emit('update:startTime', value.startTime);
  emit('update:dueDate', value.dueDate);
  emit('update:dueTime', value.dueTime);
  emit('saveDates');
}

function getColorOptionStyle(color: BackgroundColorOption): Record<string, string> {
  return {
    background: color.css,
    '--calendar-editor-color-accent': resolveTaskAccentColor(color.value)
  };
}

</script>

<style scoped>
.context-menu {
  position: fixed;
  background: var(--b3-theme-background);
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

.context-menu-repeat-section {
  padding: 0;
}

.task-editor-property-row {
  display: grid;
  grid-template-columns: minmax(80px, 24%) minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 3px 6px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--b3-theme-on-background);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.task-editor-property-row:hover {
  background: var(--b3-list-hover);
}

.task-editor-property-label,
.task-editor-property-value {
  display: inline-flex;
  align-items: center;
  min-width: 0;
}

.task-editor-property-label {
  gap: 8px;
  padding-left: 2px;
  color: var(--b3-theme-on-surface);
  font-size: 13px;
  line-height: 1.25;
}

.task-editor-property-label svg {
  flex: 0 0 auto;
  color: var(--b3-theme-on-surface);
  opacity: 0.72;
}

.task-editor-property-value {
  justify-content: flex-start;
  gap: 6px;
  color: var(--b3-theme-on-background);
  font-size: 13px;
  line-height: 1.3;
}

.task-editor-property-pill {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  font-size: 12px;
  line-height: 1.25;
  white-space: nowrap;
}

.task-editor-property-placeholder {
  color: var(--b3-theme-on-surface);
  font-size: 12px;
  opacity: 0.62;
}

.task-color-picker {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: 6px;
  padding: 4px;
}

.color-option {
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  justify-self: center;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06);
}

.color-option:hover,
.color-option.selected {
  border-color: var(--calendar-editor-color-accent, var(--pinch-color6));
  box-shadow: 0 0 0 1px var(--calendar-editor-color-accent, var(--pinch-color6));
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

.date-edit-field input[type="date"],
.date-edit-field input[type="time"] {
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

.context-menu-date-clear {
  width: 100%;
  border: 1px solid var(--pinch-color10);
  background: var(--pinch-background10);
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
