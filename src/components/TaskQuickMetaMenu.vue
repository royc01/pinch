<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="context-menu task-quick-meta-menu"
      :class="{ 'context-menu-mobile-sheet': isMobileSheet, 'task-quick-meta-menu-panel-only': panelOnly }"
      :style="menuStyle"
      role="menu"
      @keydown.esc.stop.prevent="emit('close')"
    >
      <div class="task-quick-toolbar" role="toolbar">
        <button
          type="button"
          class="task-quick-toolbar-btn"
          :class="{ active: activePanel === 'priority', 'has-value': hasPriority }"
          :aria-label="t('taskManager.priority')"
          @mouseenter="openPanel('priority')"
          @focus="openPanel('priority')"
          @click="openPanel('priority')"
        >
          <Icon name="flag" width="17" height="17" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="task-quick-toolbar-btn"
          :class="{ active: activePanel === 'tags', 'has-value': hasTags }"
          :aria-label="t('taskManager.tags')"
          @mouseenter="openPanel('tags')"
          @focus="openPanel('tags')"
          @click="openPanel('tags')"
        >
          <Icon name="group" width="17" height="17" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="task-quick-toolbar-btn"
          :class="{ active: activePanel === 'goals', 'has-value': hasGoals }"
          :aria-label="t('taskScopeDialog.goals')"
          @mouseenter="openPanel('goals')"
          @focus="openPanel('goals')"
          @click="openPanel('goals')"
        >
          <Icon name="target" width="17" height="17" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="task-quick-toolbar-btn"
          :class="{ active: activePanel === 'due', 'has-value': hasDueDate }"
          :aria-label="t('taskManager.dueDate')"
          @mouseenter="openPanel('due')"
          @focus="openPanel('due')"
          @click="openPanel('due')"
        >
          <Icon name="calendar" width="17" height="17" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="task-quick-toolbar-btn"
          :class="{ active: activePanel === 'reminder', 'has-value': hasReminder }"
          :aria-label="t('taskManager.reminder')"
          @mouseenter="openPanel('reminder')"
          @focus="openPanel('reminder')"
          @click="openPanel('reminder')"
        >
          <Icon name="bell" width="17" height="17" aria-hidden="true" />
        </button>
      </div>

      <div
        v-if="activePanel"
        class="task-quick-toolbar-popover"
        role="menu"
      >
        <div v-if="activePanel === 'priority'" class="task-quick-popover-section">
          <div class="task-quick-popover-title">{{ t('taskManager.priority') }}</div>
          <div class="task-quick-priority-list">
            <button
              v-for="option in priorityOptions"
              :key="option.value"
              type="button"
              class="task-quick-priority-option"
              :class="[`is-${option.value}`, { active: priority === option.value }]"
              @click="emitPrioritySelect(option.value)"
            >
              <Icon name="flag" width="15" height="15" aria-hidden="true" />
              <span>{{ option.label }}</span>
            </button>
            <button
              type="button"
              class="task-quick-clear-btn"
              :disabled="priority === 'none'"
              @click="emitPrioritySelect('none')"
            >
              {{ t('taskManager.clear') }}
            </button>
          </div>
        </div>

        <div v-else-if="activePanel === 'tags'" class="task-quick-popover-section">
          <div class="task-quick-popover-title">{{ t('taskManager.tags') }}</div>
          <div v-if="groupOptions.length" class="task-quick-pill-list">
            <button
              v-for="group in groupOptions"
              :key="group.value"
              type="button"
              class="task-quick-tag-option"
              :class="{ active: isTagOptionSelected(group), special: group.special }"
              @click="emitTagToggle(group.value)"
            >
              <span
                class="task-group-badge ariaLabel"
                :aria-label="group.label"
                :style="getTagBadgeStyle(group)"
              >
                <EmojiIcon v-if="group.icon" class="task-group-badge-icon" :value="group.icon" aria-hidden="true" />
                <Icon v-else name="group" width="12" height="12" aria-hidden="true" />
                <span class="task-quick-pill-label">{{ group.label }}</span>
              </span>
            </button>
          </div>
          <p v-else class="task-quick-empty">{{ t('taskManager.noTags') }}</p>
        </div>

        <div v-else-if="activePanel === 'goals'" class="task-quick-popover-section">
          <div class="task-quick-popover-title">{{ t('taskScopeDialog.goals') }}</div>
          <div v-if="goalOptions.length" class="task-quick-pill-list">
            <button
              v-for="goal in goalOptions"
              :key="goal.value"
              type="button"
              class="task-editor-property-pill task-quick-select-pill is-goal"
              :class="{ active: selectedGoalIds.includes(goal.value) }"
              @click="emitGoalToggle(goal.value)"
            >
              <EmojiIcon
                v-if="goal.emoji"
                class="task-quick-pill-emoji"
                :value="goal.emoji"
              />
              <span class="task-quick-pill-label">{{ goal.label }}</span>
            </button>
          </div>
          <p v-else class="task-quick-empty">{{ t('goalManager.emptyGoals') }}</p>
        </div>

        <div v-else-if="activePanel === 'due'" class="task-quick-popover-section">
          <TaskDatePopover
            :visible="true"
            :floating="false"
            :model-value="dueDate"
            :auto-close="false"
            :show-task-editor-details="true"
            :start-date="startDate"
            :start-time="startTime"
            :due-time="dueTime"
            @update:dateFields="emitDateFields"
            @update:modelValue="emitDueDate"
            @update:startDate="emitStartDate"
            @update:startTime="emitStartTime"
            @update:dueTime="emitDueTime"
            @close="closePanel"
          />
        </div>

        <div v-else-if="activePanel === 'reminder'" class="task-quick-popover-section">
          <TaskReminderPopover
            :visible="true"
            :floating="false"
            :model-value="reminderType"
            :custom-time="reminderCustomTime"
            :due-date="dueDate"
            :due-time="dueTime"
            @select="handleReminderSelect"
            @close="closePanel"
          />
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import Icon from './Icon.vue';
import EmojiIcon from './EmojiIcon.vue';
import TaskDatePopover from './TaskDatePopover.vue';
import TaskReminderPopover from './TaskReminderPopover.vue';
import { useI18n } from '@/composables/useI18n';
import {
  type TaskReminderSelection,
  type TaskReminderType,
} from '@/utils/taskReminder';

type TaskPriority = 'none' | 'high' | 'medium' | 'low';
type ToolbarPanel = 'priority' | 'tags' | 'goals' | 'due' | 'reminder';

interface TaskGroupOption {
  value: string;
  label: string;
  special?: boolean;
  color?: string;
  colorCss?: string;
  borderColor?: string;
  textColor?: string;
  icon?: string;
}

interface TaskGoalOption {
  value: string;
  label: string;
  emoji?: string;
}

const props = defineProps<{
  show: boolean;
  x: number;
  y: number;
  priority: TaskPriority;
  tagIds: string[];
  groupOptions: TaskGroupOption[];
  goalOptions: TaskGoalOption[];
  selectedGoalIds: string[];
  startDate?: string;
  startTime?: string;
  dueDate?: string;
  dueTime?: string;
  reminderType?: TaskReminderType;
  reminderCustomTime?: string;
  initialPanel?: ToolbarPanel | null;
  panelOnly?: boolean;
}>();

const emit = defineEmits<{
  'update:priority': [value: TaskPriority];
  'update:startDate': [value: string];
  'update:startTime': [value: string];
  'update:dueDate': [value: string];
  'update:dueTime': [value: string];
  'update:reminder': [value: TaskReminderSelection];
  'toggle-tag': [groupId: string];
  'toggle-goal': [goalId: string];
  save: [closeAfterSave?: boolean];
  close: [];
}>();

const { t } = useI18n();
const isMobileSheet = ref(false);
const activePanel = ref<ToolbarPanel | null>(null);
let saveTimer: number | null = null;

const priorityOptions = computed(() => [
  { value: 'low' as const, label: t('taskManager.priorityLow') },
  { value: 'medium' as const, label: t('taskManager.priorityMedium') },
  { value: 'high' as const, label: t('taskManager.priorityHigh') },
]);

const menuStyle = computed(() => {
  if (isMobileSheet.value) {
    return {};
  }
  return {
    left: `${props.x}px`,
    top: `${props.y}px`,
  };
});

const dueDate = computed(() => props.dueDate || '');
const dueTime = computed(() => props.dueTime || '');
const startDate = computed(() => props.startDate || '');
const startTime = computed(() => props.startTime || '');
const reminderType = computed(() => props.reminderType);
const reminderCustomTime = computed(() => props.reminderCustomTime || '');
const hasPriority = computed(() => props.priority !== 'none');
const hasTags = computed(() => props.tagIds.length > 0);
const hasGoals = computed(() => props.selectedGoalIds.length > 0);
const hasDueDate = computed(() => Boolean(dueDate.value || dueTime.value));
const hasReminder = computed(() => Boolean(props.reminderType));

function updateViewportMode(): void {
  isMobileSheet.value = window.innerWidth <= 640;
}

function openPanel(panel: ToolbarPanel): void {
  activePanel.value = panel;
}

function closePanel(): void {
  flushPendingSave();
  activePanel.value = null;
}

function saveWithoutClosing(delay = 0): void {
  if (delay > 0) {
    if (saveTimer !== null) {
      window.clearTimeout(saveTimer);
    }
    saveTimer = window.setTimeout(() => {
      emit('save', false);
      saveTimer = null;
    }, delay);
    return;
  }
  emit('save', false);
}

function flushPendingSave(): void {
  if (saveTimer === null) {
    return;
  }
  window.clearTimeout(saveTimer);
  saveTimer = null;
  emit('save', false);
}

function emitPrioritySelect(value: TaskPriority): void {
  const nextValue = props.priority === value ? 'none' : value;
  emit('update:priority', nextValue);
  saveWithoutClosing();
}

function emitTagToggle(groupId: string): void {
  emit('toggle-tag', groupId);
  saveWithoutClosing();
}

function emitGoalToggle(goalId: string): void {
  emit('toggle-goal', goalId);
  saveWithoutClosing();
}

function emitStartDate(value: string): void {
  emit('update:startDate', value);
  saveWithoutClosing(160);
}

function emitDateFields(value: {
  startDate: string;
  startTime: string;
  dueDate: string;
  dueTime: string;
}): void {
  emit('update:startDate', value.startDate);
  emit('update:startTime', value.startTime);
  emit('update:dueDate', value.dueDate);
  emit('update:dueTime', value.dueTime);
  saveWithoutClosing(160);
}

function emitStartTime(value: string): void {
  emit('update:startTime', value);
  saveWithoutClosing(160);
}

function emitDueDate(value: string): void {
  emit('update:dueDate', value);
  saveWithoutClosing(160);
}

function emitDueTime(value: string): void {
  emit('update:dueTime', value);
  saveWithoutClosing(160);
}

function handleReminderSelect(value: TaskReminderSelection): void {
  emit('update:reminder', value);
  saveWithoutClosing();
}

function isTagOptionSelected(option: TaskGroupOption): boolean {
  if (option.special) {
    return props.tagIds.length === 0;
  }
  return props.tagIds.includes(option.value);
}

function getTagBadgeStyle(option: TaskGroupOption): Record<string, string> {
  if (option.special) {
    return {};
  }
  return {
    background: option.colorCss || 'var(--b3-list-hover)',
    borderColor: option.borderColor || option.colorCss || 'var(--b3-list-hover)',
    color: option.textColor || 'var(--b3-theme-on-background)',
  };
}

onMounted(() => {
  updateViewportMode();
  window.addEventListener('resize', updateViewportMode);
});

onUnmounted(() => {
  flushPendingSave();
  window.removeEventListener('resize', updateViewportMode);
});

watch(
  () => props.show,
  (visible) => {
    if (!visible) {
      activePanel.value = null;
      return;
    }
    activePanel.value = props.initialPanel || null;
  },
);

watch(
  () => props.initialPanel,
  (panel) => {
    if (props.show && panel) {
      activePanel.value = panel;
    }
  },
);
</script>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 1000;
  padding: 3px;
  border: 1px solid var(--b3-theme-surface-lighter);
  border-radius: 10px;
  background: var(--b3-theme-background);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.16);
  color: var(--b3-theme-on-background);
  animation: quickMenuAppear 0.14s ease-out;
  overflow: visible;
}

.task-quick-meta-menu {
  min-width: 0;
}

.task-quick-meta-menu-panel-only {
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
}

.task-quick-meta-menu-panel-only .task-quick-toolbar {
  display: none;
}

.task-quick-meta-menu-panel-only .task-quick-toolbar-popover {
  position: static;
  transform: none;
}

.task-quick-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
}

.task-quick-toolbar-btn {
  position: relative;
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--b3-theme-on-surface);
  cursor: pointer;
  transition:
    background 0.16s ease,
    color 0.16s ease;
}

.task-quick-toolbar-btn:hover,
.task-quick-toolbar-btn:focus-visible,
.task-quick-toolbar-btn.active {
  background: var(--b3-list-hover);
  outline: none;
}

.task-quick-toolbar-btn.has-value::after {
  content: '';
  position: absolute;
  right: 6px;
  bottom: 6px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--b3-theme-primary);
}

.task-quick-toolbar-popover {
  position: absolute;
  left: 50%;
  top: calc(100% + 8px);
  width: 300px;
  max-width: min(300px, calc(100vw - 24px));
  padding: 10px;
  border: 1px solid var(--b3-theme-surface-lighter);
  border-radius: 16px;
  background: var(--b3-theme-background);
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.18);
  transform: translateX(-50%);
}

.task-quick-toolbar-popover::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: -8px;
  height: 8px;
}

.task-quick-popover-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-quick-popover-title {
  padding: 2px 2px 4px;
  color: var(--b3-theme-on-surface);
  font-size: 12px;
  font-weight: 600;
}

.task-quick-priority-list,
.task-quick-chip-list,
.task-quick-field-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.task-quick-priority-list {
  flex-direction: row;
  flex-wrap: wrap;
}

.task-quick-pill-list {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 6px;
}

.task-editor-property-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  min-height: 24px;
  padding: 2px 8px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  font-size: 12px;
  line-height: 1.25;
  white-space: nowrap;
}

.task-editor-property-pill.is-goal {
  background: var(--pinch-background6);
  color: var(--b3-theme-on-background);
}

.task-quick-select-pill {
  cursor: pointer;
}

.task-quick-select-pill:hover,
.task-quick-select-pill.active {
  border-color: currentColor;
  box-shadow: 0 0 0 1px color-mix(in srgb, currentColor 18%, transparent);
}

.task-quick-select-pill.special {
  color: var(--b3-theme-on-surface);
}

.task-quick-tag-option {
  display: inline-flex;
  max-width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.task-group-badge {
  display: flex;
  align-items: center;
  max-width: 160px;
  gap: 2px;
  padding: 2px 4px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-surface);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 10px;
  font-weight: 500;
  line-height: 1.25;
}

.task-group-badge svg {
  flex: 0 0 auto;
}

.task-group-badge-icon {
  flex: 0 0 auto;
  width: 12px;
  height: 12px;
}

.task-quick-tag-option:hover .task-group-badge,
.task-quick-tag-option.active .task-group-badge {
  box-shadow: 0 0 0 1px currentColor;
}

.task-quick-tag-option.special .task-group-badge {
  color: var(--b3-theme-on-surface);
}

.task-quick-pill-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-quick-pill-emoji {
  flex: 0 0 auto;
  font-size: 12px;
  line-height: 1;
}

.task-quick-priority-option,
.task-quick-chip,
.task-quick-clear-btn {
  display: flex;
  min-height: 32px;
  align-items: center;
  gap: 8px;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: var(--b3-theme-on-background);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.task-quick-priority-option,
.task-quick-chip {
  padding: 6px 8px;
}

.task-quick-priority-option {
  flex: 1 1 0;
  justify-content: center;
  min-width: 0;
}

.task-quick-priority-option:hover,
.task-quick-priority-option.active,
.task-quick-chip:hover,
.task-quick-chip.active {
  border-color: var(--b3-theme-primary-light);
  background: var(--b3-theme-primary-lightest);
  color: var(--b3-theme-primary);
}

.task-quick-priority-option.is-high {
  color: #dc2626;
}

.task-quick-priority-option.is-medium {
  color: #d97706;
}

.task-quick-priority-option.is-low {
  color: #2563eb;
}

.task-quick-chip-dot {
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.task-quick-empty {
  margin: 0;
  padding: 8px 2px;
  color: var(--b3-theme-on-surface-light);
  font-size: 13px;
}

.task-quick-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  color: var(--b3-theme-on-surface);
  font-size: 12px;
  font-weight: 600;
}

.task-quick-field input {
  width: 100%;
  height: 32px;
  box-sizing: border-box;
  border: 1px solid var(--b3-theme-surface-lighter);
  border-radius: 7px;
  background: var(--b3-theme-surface);
  color: var(--b3-theme-on-background);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  padding: 0 8px;
}

.task-quick-field input:focus {
  border-color: var(--b3-theme-primary);
  outline: none;
  box-shadow: 0 0 0 2px var(--b3-theme-primary-lightest);
}

.task-quick-custom-reminder {
  margin-top: 2px;
}

.task-quick-clear-btn {
  justify-content: center;
  padding: 6px 10px;
  color: var(--b3-theme-on-surface);
}

.task-quick-clear-btn:hover:not(:disabled) {
  background: var(--b3-list-hover);
  color: var(--b3-theme-primary);
}

.task-quick-clear-btn:disabled {
  cursor: default;
  opacity: 0.45;
}

.context-menu-mobile-sheet {
  left: 12px !important;
  right: 12px !important;
  bottom: max(12px, env(safe-area-inset-bottom)) !important;
  top: auto !important;
}

.context-menu-mobile-sheet .task-quick-toolbar {
  justify-content: space-between;
}

.context-menu-mobile-sheet .task-quick-toolbar-btn {
  width: 40px;
}

.context-menu-mobile-sheet .task-quick-toolbar-popover {
  position: static;
  width: auto;
  max-width: none;
  margin-top: 8px;
  box-shadow: none;
  transform: none;
}

@keyframes quickMenuAppear {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
