<template>
  <div
    v-if="show"
    :class="['context-menu', 'task-quick-date-menu', { 'context-menu-mobile-sheet': isMobileSheet }]"
    :style="menuStyle"
    @click.stop
  >
    <div class="context-menu-section">
      <div class="context-menu-date-grid">
        <div class="date-edit-field">
          <label>{{ t('taskManager.startDate') }}</label>
          <div class="context-menu-date-input-group">
            <input
              :value="startDate"
              type="date"
              @input="$emit('update:startDate', ($event.target as HTMLInputElement).value)"
            />
            <button
              ref="startDateTriggerRef"
              type="button"
              class="context-menu-date-trigger ariaLabel"
              :class="{ active: activeDatePopoverField === 'startDate' }"
             
              :aria-label="t('taskManager.pickStartDate')"
              @click="toggleDatePopover('startDate')"
            >
              <Icon name="calendar" width="14" height="14" />
            </button>
          </div>
        </div>
        <div class="date-edit-field">
          <label>{{ t('taskManager.dueDate') }}</label>
          <div class="context-menu-date-input-group">
            <input
              :value="dueDate"
              type="date"
              @input="$emit('update:dueDate', ($event.target as HTMLInputElement).value)"
            />
            <button
              ref="dueDateTriggerRef"
              type="button"
              class="context-menu-date-trigger ariaLabel"
              :class="{ active: activeDatePopoverField === 'dueDate' }"
             
              :aria-label="t('taskManager.pickDueDate')"
              @click="toggleDatePopover('dueDate')"
            >
              <Icon name="calendar" width="14" height="14" />
            </button>
          </div>
        </div>
        <div class="date-edit-field">
          <label>{{ t('taskManager.startTime') }}</label>
          <div class="context-menu-date-input-group">
            <input
              :value="startTime"
              type="time"
              @input="$emit('update:startTime', ($event.target as HTMLInputElement).value)"
            />
            <button
              ref="startTimeTriggerRef"
              type="button"
              class="context-menu-date-trigger ariaLabel"
              :class="{ active: activeTimePopoverField === 'startTime' }"
             
              :aria-label="t('taskManager.pickStartTime')"
              @click="toggleTimePopover('startTime')"
            >
              <Icon name="clock" width="14" height="14" />
            </button>
          </div>
        </div>
        <div class="date-edit-field">
          <label>{{ t('taskManager.dueTime') }}</label>
          <div class="context-menu-date-input-group">
            <input
              :value="dueTime"
              type="time"
              @input="$emit('update:dueTime', ($event.target as HTMLInputElement).value)"
            />
            <button
              ref="dueTimeTriggerRef"
              type="button"
              class="context-menu-date-trigger ariaLabel"
              :class="{ active: activeTimePopoverField === 'dueTime' }"
             
              :aria-label="t('taskManager.pickDueTime')"
              @click="toggleTimePopover('dueTime')"
            >
              <Icon name="clock" width="14" height="14" />
            </button>
          </div>
        </div>
      </div>
      <div class="context-menu-date-actions">
        <div class="task-quick-toolbar" role="toolbar">
          <button type="button" class="task-quick-toolbar-btn ariaLabel" :aria-label="t('taskManager.priority')" @mouseenter="$emit('show-meta', 'priority', ($event.currentTarget as HTMLElement).getBoundingClientRect())" @focus="$emit('show-meta', 'priority', ($event.currentTarget as HTMLElement).getBoundingClientRect())">
            <Icon name="flag" width="17" height="17" />
          </button>
          <button type="button" class="task-quick-toolbar-btn ariaLabel" :aria-label="t('taskManager.tags')" @mouseenter="$emit('show-meta', 'tags', ($event.currentTarget as HTMLElement).getBoundingClientRect())" @focus="$emit('show-meta', 'tags', ($event.currentTarget as HTMLElement).getBoundingClientRect())">
            <Icon name="group" width="17" height="17" />
          </button>
          <button type="button" class="task-quick-toolbar-btn ariaLabel" :aria-label="t('taskScopeDialog.goals')" @mouseenter="$emit('show-meta', 'goals', ($event.currentTarget as HTMLElement).getBoundingClientRect())" @focus="$emit('show-meta', 'goals', ($event.currentTarget as HTMLElement).getBoundingClientRect())">
            <Icon name="target" width="17" height="17" />
          </button>
          <button type="button" class="task-quick-toolbar-btn ariaLabel" :aria-label="t('taskManager.reminder')" @mouseenter="$emit('show-meta', 'reminder', ($event.currentTarget as HTMLElement).getBoundingClientRect())" @focus="$emit('show-meta', 'reminder', ($event.currentTarget as HTMLElement).getBoundingClientRect())">
            <Icon name="bell" width="17" height="17" />
          </button>
        </div>
        <button class="context-menu-date-save" @click="$emit('save')">{{ resolvedSaveLabel }}</button>
      </div>
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
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import Icon from '@/components/Icon.vue';
import TaskDatePopover from '@/components/TaskDatePopover.vue';
import TaskTimePopover from '@/components/TaskTimePopover.vue';
import { useI18n } from '@/composables/useI18n';

const props = withDefaults(defineProps<{
  show: boolean;
  x: number;
  y: number;
  startDate: string;
  startTime: string;
  dueDate: string;
  dueTime: string;
  title?: string;
  saveLabel?: string;
}>(), {});

const { t } = useI18n();
const resolvedSaveLabel = computed(() => props.saveLabel || t('taskManager.saveDate'));

defineEmits<{
  (event: 'save'): void;
  (event: 'update:startDate', value: string): void;
  (event: 'update:startTime', value: string): void;
  (event: 'update:dueDate', value: string): void;
  (event: 'update:dueTime', value: string): void;
  (event: 'show-meta', panel: 'priority' | 'tags' | 'goals' | 'reminder', anchor: DOMRect): void;
}>();

const isMobileSheet = ref(false);
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
    left: `${props.x}px`,
    top: `${props.y}px`
  };
});

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
}

onMounted(() => {
  updateMobileSheetState();
  window.addEventListener('resize', updateMobileSheetState);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateMobileSheetState);
});

watch(() => props.show, (show) => {
  if (!show) {
    activeDatePopoverField.value = null;
    activeTimePopoverField.value = null;
  }
});

function toggleDatePopover(field: 'startDate' | 'dueDate'): void {
  activeTimePopoverField.value = null;
  activeDatePopoverField.value = activeDatePopoverField.value === field ? null : field;
}

function toggleTimePopover(field: 'startTime' | 'dueTime'): void {
  activeDatePopoverField.value = null;
  activeTimePopoverField.value = activeTimePopoverField.value === field ? null : field;
}
</script>

<style scoped>
.context-menu {
  position: fixed;
  width: min(300px, calc(100vw - 24px));
  box-sizing: border-box;
  background: var(--b3-theme-background);
  border: 1px solid var(--b3-theme-surface-lighter);
  border-radius: 12px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.16);
  z-index: 10;
  min-width: 0;
  padding: 12px;
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
  padding: 0;
}

.context-menu-date-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 12px;
}

.date-edit-field {
  min-width: 0;
}

.date-edit-field label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  opacity: 0.85;
  line-height: 1.2;
}

.date-edit-field input[type="date"],
.date-edit-field input[type="time"]{
  flex: 1;
  min-width: 0;
  height: auto;
  padding: 6px 34px 6px 10px;
  border: none;
  border-radius: 8px;
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
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 6px;
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
  min-width: 92px;
  border: none;
  background-color: #f98f7a;
  color: var(--b3-theme-background);
  border-radius: 6px;
  font-size: 12px;
  padding: 6px 8px;
  cursor: pointer;
  margin-top: 4px;
}

.context-menu-date-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 8px;
}

.task-quick-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--b3-theme-surface-lighter);
  border-radius: 10px;
}

.task-quick-toolbar-btn {
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--b3-theme-on-surface);
  cursor: pointer;
}

.task-quick-toolbar-btn:hover,
.task-quick-toolbar-btn:focus-visible {
  background: var(--b3-list-hover);
  color: var(--b3-theme-primary);
  outline: none;
}

.context-menu-date-save:hover {
  background-color: #f98f7a;
  color: var(--b3-theme-background);
}
</style>
