<template>
  <Teleport to="body">
    <div v-if="visible" class="task-reminder-popover-overlay" @mousedown="handleOverlayMouseDown">
      <div
        ref="popoverRef"
        class="task-reminder-popover"
        :style="popoverStyle"
        @mousedown.stop
      >
        <div class="task-reminder-popover-header">
          <span class="task-reminder-popover-title">{{ t('taskManager.reminder') }}</span>
          <button type="button" class="task-reminder-clear-btn" @click="clearSelection">{{ t('taskManager.clear') }}</button>
        </div>

        <div class="task-reminder-option-list">
          <button
            v-for="option in presetOptions"
            :key="option.value"
            type="button"
            class="task-reminder-option-btn"
            :class="{ active: !presetDisabled && modelValue === option.value }"
            :disabled="presetDisabled"
            :title="presetDisabled ? t('taskManager.setDueDateFirst') : option.label"
            @click="selectPreset(option.value)"
          >
            {{ option.label }}
          </button>
        </div>

        <div v-if="!hasDueDate" class="task-reminder-hint">
          {{ t('taskManager.reminderNeedsDueDate') }}
        </div>
        <div v-else-if="showDefaultDueTimeHint" class="task-reminder-hint">
          {{ t('taskManager.reminderDefaultDueTimePrefix') }} {{ DEFAULT_TASK_REMINDER_DUE_TIME }} {{ t('taskManager.reminderDefaultDueTimeSuffix') }}
        </div>

        <div class="task-reminder-custom">
          <label class="task-reminder-custom-label" for="task-reminder-custom-input">{{ t('taskManager.custom') }}</label>
          <input
            id="task-reminder-custom-input"
            v-model="customDraft"
            class="task-reminder-custom-input"
            type="datetime-local"
          />
          <button
            type="button"
            class="task-reminder-save-btn"
            :class="{ active: modelValue === 'custom' }"
            @click="saveCustomReminder"
          >
            {{ t('taskManager.saveCustomReminder') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import {
  DEFAULT_TASK_REMINDER_DUE_TIME,
  TASK_REMINDER_PRESET_OPTIONS,
  getTaskReminderDefaultCustomTime,
  normalizeTaskReminderCustomTime,
  type TaskReminderSelection,
  type TaskReminderType
} from '@/utils/taskReminder';
import { useI18n } from '@/composables/useI18n';

const props = defineProps<{
  visible: boolean;
  modelValue?: TaskReminderType;
  customTime?: string;
  dueDate?: string;
  dueTime?: string;
  anchorEl?: HTMLElement | null;
}>();

const emit = defineEmits<{
  select: [value: TaskReminderSelection];
  close: [];
}>();

const popoverRef = ref<HTMLElement | null>(null);
const popoverStyle = ref<Record<string, string>>({});
const customDraft = ref('');
const { t } = useI18n();

const presetOptions = TASK_REMINDER_PRESET_OPTIONS;

const hasDueDate = computed(() => {
  return !!(props.dueDate || '').trim();
});

const hasDueTime = computed(() => {
  return !!(props.dueTime || '').trim();
});

const presetDisabled = computed(() => !hasDueDate.value);
const showDefaultDueTimeHint = computed(() => hasDueDate.value && !hasDueTime.value);

function updateCustomDraft(): void {
  customDraft.value = normalizeTaskReminderCustomTime(props.customTime)
    || getTaskReminderDefaultCustomTime(props.dueDate, props.dueTime);
}

function updatePopoverPosition(): void {
  const anchor = props.anchorEl;
  const popover = popoverRef.value;
  if (!anchor || !popover) {
    return;
  }

  const anchorRect = anchor.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();
  const margin = 12;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;

  let left = anchorRect.left;
  let top = anchorRect.bottom + 8;

  if (left + popoverRect.width > viewportWidth - margin) {
    left = viewportWidth - margin - popoverRect.width;
  }
  if (left < margin) {
    left = margin;
  }

  if (top + popoverRect.height > viewportHeight - margin) {
    top = anchorRect.top - popoverRect.height - 8;
  }
  if (top < margin) {
    top = margin;
  }

  popoverStyle.value = {
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`
  };
}

function selectPreset(reminderType: TaskReminderType): void {
  if (presetDisabled.value) {
    return;
  }
  emit('select', { reminderType });
  emit('close');
}

function saveCustomReminder(): void {
  const normalized = normalizeTaskReminderCustomTime(customDraft.value);
  if (!normalized) {
    return;
  }
  emit('select', {
    reminderType: 'custom',
    reminderCustomTime: normalized
  });
  emit('close');
}

function clearSelection(): void {
  emit('select', {});
  emit('close');
}

function handleOverlayMouseDown(): void {
  emit('close');
}

function handleKeydown(event: KeyboardEvent): void {
  if (!props.visible) {
    return;
  }

  if (event.key === 'Escape') {
    emit('close');
  }
}

function handleResize(): void {
  if (props.visible) {
    updatePopoverPosition();
  }
}

watch(
  () => [props.visible, props.customTime, props.dueDate, props.dueTime, props.anchorEl],
  ([visible]) => {
    if (!visible) {
      return;
    }
    updateCustomDraft();
    void nextTick(updatePopoverPosition);
  },
  { immediate: true }
);

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped>
.task-reminder-popover-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: transparent;
}

.task-reminder-popover {
  position: fixed;
  width: min(320px, calc(100vw - 24px));
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--b3-theme-border);
  background: var(--b3-theme-background);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-sizing: border-box;
}

.task-reminder-popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.task-reminder-popover-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--b3-theme-on-background);
}

.task-reminder-clear-btn {
  border: none;
  background: none;
  color: var(--b3-theme-on-surface);
  cursor: pointer;
  font-size: 12px;
  padding: 0;
}

.task-reminder-option-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.task-reminder-option-btn,
.task-reminder-save-btn {
  border: 1px solid var(--b3-theme-border);
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  border-radius: 999px;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  padding: 8px 12px;
}

.task-reminder-option-btn.active,
.task-reminder-save-btn.active {
  border-color: #f98f7a;
  box-shadow: 0 0 0 1px #f98f7a inset;
}

.task-reminder-option-btn:disabled {
  cursor: not-allowed;
  opacity: 0.52;
  box-shadow: none;
}

.task-reminder-hint {
  font-size: 12px;
  line-height: 1.5;
  color: var(--b3-theme-on-surface);
}

.task-reminder-custom {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-reminder-custom-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--b3-theme-on-background);
}

.task-reminder-custom-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--b3-theme-border);
  border-radius: 8px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  font-size: 12px;
  padding: 8px 10px;
}

.task-reminder-custom-input:focus {
  outline: none;
  border-color: #f98f7a;
}
</style>
