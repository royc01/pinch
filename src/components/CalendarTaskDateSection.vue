<template>
  <div class="calendar-editor-section">
    <div class="calendar-editor-section-heading">
      <div class="calendar-editor-section-title">{{ t('taskManager.date') }}</div>
      <div class="calendar-editor-date-actions">
        <button
          type="button"
          class="calendar-editor-date-btn"
          @click="emit('clearDates')"
        >
          {{ t('taskManager.clearTaskDates') }}
        </button>
      </div>
    </div>
    <div class="calendar-editor-date-grid">
      <div class="calendar-editor-date-field">
        <label>{{ t('taskManager.startDate') }}</label>
        <div class="calendar-editor-date-input-group">
          <input
            :value="startDate"
            type="date"
            @input="emitDateUpdate({ startDate: ($event.target as HTMLInputElement).value })"
          />
          <button
            ref="startDateTriggerRef"
            type="button"
            class="calendar-editor-date-trigger ariaLabel"
            :class="{ active: activeDatePopoverField === 'startDate' }"
            :aria-label="t('taskManager.pickStartDate')"
            @click="toggleDatePopover('startDate')"
          >
            <Icon name="calendar" width="14" height="14" />
          </button>
        </div>
      </div>
      <div class="calendar-editor-date-field">
        <label>{{ t('taskManager.dueDate') }}</label>
        <div class="calendar-editor-date-input-group">
          <input
            :value="dueDate"
            type="date"
            @input="emitDateUpdate({ dueDate: ($event.target as HTMLInputElement).value })"
          />
          <button
            ref="dueDateTriggerRef"
            type="button"
            class="calendar-editor-date-trigger ariaLabel"
            :class="{ active: activeDatePopoverField === 'dueDate' }"
            :aria-label="t('taskManager.pickDueDate')"
            @click="toggleDatePopover('dueDate')"
          >
            <Icon name="calendar" width="14" height="14" />
          </button>
        </div>
      </div>
      <div class="calendar-editor-date-field">
        <label>{{ t('taskManager.startTime') }}</label>
        <div class="calendar-editor-date-input-group">
          <input
            :value="startTime"
            type="time"
            @input="emitDateUpdate({ startTime: ($event.target as HTMLInputElement).value })"
          />
          <button
            ref="startTimeTriggerRef"
            type="button"
            class="calendar-editor-date-trigger ariaLabel"
            :class="{ active: activeTimePopoverField === 'startTime' }"
            :aria-label="t('taskManager.pickStartTime')"
            @click="toggleTimePopover('startTime')"
          >
            <Icon name="clock" width="14" height="14" />
          </button>
        </div>
      </div>
      <div class="calendar-editor-date-field">
        <label>{{ t('taskManager.dueTime') }}</label>
        <div class="calendar-editor-date-input-group">
          <input
            :value="dueTime"
            type="time"
            @input="emitDateUpdate({ dueTime: ($event.target as HTMLInputElement).value })"
          />
          <button
            ref="dueTimeTriggerRef"
            type="button"
            class="calendar-editor-date-trigger ariaLabel"
            :class="{ active: activeTimePopoverField === 'dueTime' }"
            :aria-label="t('taskManager.pickDueTime')"
            @click="toggleTimePopover('dueTime')"
          >
            <Icon name="clock" width="14" height="14" />
          </button>
        </div>
      </div>
    </div>

    <TaskDatePopover
      v-if="activeDatePopoverField === 'startDate'"
      :visible="true"
      :model-value="startDate"
      :anchor-el="startDateTriggerRef"
      @update:modelValue="emitDateUpdate({ startDate: $event })"
      @close="activeDatePopoverField = null"
    />
    <TaskDatePopover
      v-if="activeDatePopoverField === 'dueDate'"
      :visible="true"
      :model-value="dueDate"
      :anchor-el="dueDateTriggerRef"
      @update:modelValue="emitDateUpdate({ dueDate: $event })"
      @close="activeDatePopoverField = null"
    />
    <TaskTimePopover
      v-if="activeTimePopoverField === 'startTime'"
      :visible="true"
      :model-value="startTime"
      :anchor-el="startTimeTriggerRef"
      @update:modelValue="emitDateUpdate({ startTime: $event })"
      @close="activeTimePopoverField = null"
    />
    <TaskTimePopover
      v-if="activeTimePopoverField === 'dueTime'"
      :visible="true"
      :model-value="dueTime"
      :anchor-el="dueTimeTriggerRef"
      @update:modelValue="emitDateUpdate({ dueTime: $event })"
      @close="activeTimePopoverField = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Icon from '@/components/Icon.vue';
import TaskDatePopover from '@/components/TaskDatePopover.vue';
import TaskTimePopover from '@/components/TaskTimePopover.vue';
import { useI18n } from '@/composables/useI18n';

export type CalendarTaskDateFields = {
  startDate: string;
  startTime: string;
  dueDate: string;
  dueTime: string;
};

const props = defineProps<CalendarTaskDateFields>();

const emit = defineEmits<{
  updateDates: [value: CalendarTaskDateFields];
  clearDates: [];
}>();

const { t } = useI18n();
const activeDatePopoverField = ref<'startDate' | 'dueDate' | null>(null);
const activeTimePopoverField = ref<'startTime' | 'dueTime' | null>(null);
const startDateTriggerRef = ref<HTMLElement | null>(null);
const dueDateTriggerRef = ref<HTMLElement | null>(null);
const startTimeTriggerRef = ref<HTMLElement | null>(null);
const dueTimeTriggerRef = ref<HTMLElement | null>(null);

function emitDateUpdate(partialValue: Partial<CalendarTaskDateFields>): void {
  emit('updateDates', {
    startDate: props.startDate,
    startTime: props.startTime,
    dueDate: props.dueDate,
    dueTime: props.dueTime,
    ...partialValue
  });
}

function toggleDatePopover(field: 'startDate' | 'dueDate'): void {
  activeTimePopoverField.value = null;
  activeDatePopoverField.value = activeDatePopoverField.value === field ? null : field;
}

function toggleTimePopover(field: 'startTime' | 'dueTime'): void {
  activeDatePopoverField.value = null;
  activeTimePopoverField.value = activeTimePopoverField.value === field ? null : field;
}

defineExpose({
  closePopovers: () => {
    activeDatePopoverField.value = null;
    activeTimePopoverField.value = null;
  }
});
</script>

<style scoped>
.calendar-editor-section {
  padding: 10px 0;
  border-top: 1px solid color-mix(in srgb, var(--b3-border-color) 68%, transparent);
}

.calendar-editor-section-title {
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--b3-theme-on-surface);
  line-height: 1.2;
}

.calendar-editor-section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.calendar-editor-section-heading .calendar-editor-section-title {
  min-width: 0;
  margin-bottom: 0;
}

.calendar-editor-date-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 12px;
}

.calendar-editor-date-field {
  min-width: 0;
}

.calendar-editor-date-field label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  opacity: 0.82;
  line-height: 1.2;
}

.calendar-editor-date-input-group {
  position: relative;
  min-width: 0;
}

.calendar-editor-date-input-group input[type="date"],
.calendar-editor-date-input-group input[type="time"] {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 6px 32px 6px 10px;
  border: none;
  border-radius: 6px;
  background: var(--b3-list-hover);
  color: inherit;
  font-size: 12px;
  outline: none;
  appearance: none;
  -webkit-appearance: none;
}

.calendar-editor-date-input-group input[type="date"]::-webkit-calendar-picker-indicator,
.calendar-editor-date-input-group input[type="time"]::-webkit-calendar-picker-indicator,
.calendar-editor-date-input-group input[type="date"]::-webkit-clear-button,
.calendar-editor-date-input-group input[type="date"]::-webkit-inner-spin-button,
.calendar-editor-date-input-group input[type="time"]::-webkit-clear-button,
.calendar-editor-date-input-group input[type="time"]::-webkit-inner-spin-button {
  display: none;
  width: 0;
  margin: 0;
  opacity: 0;
  pointer-events: none;
}

.calendar-editor-date-trigger {
  position: absolute;
  top: 50%;
  right: 4px;
  transform: translateY(-50%);
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
  line-height: 1;
  cursor: pointer;
}

.calendar-editor-date-trigger:hover,
.calendar-editor-date-trigger.active {
  background: var(--b3-theme-background);
}

.calendar-editor-date-actions {
  display: flex;
  flex: 0 0 auto;
  justify-content: flex-end;
  gap: 6px;
}

.calendar-editor-date-btn {
  border: none;
  border-radius: 5px;
  min-height: 22px;
  padding: 3px 7px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  font-size: 11px;
  line-height: 1.2;
  cursor: pointer;
}

.calendar-editor-date-btn.primary {
  background: var(--b3-theme-primary);
  color: var(--b3-theme-on-primary);
}

@media (max-width: 768px) {
  .calendar-editor-date-grid {
    grid-template-columns: 1fr;
  }
}
</style>
