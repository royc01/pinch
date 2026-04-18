<template>
  <div class="task-editor-meta-panel">
    <TaskDatePopover
      v-if="panel === 'due'"
      :visible="true"
      :anchor-el="dueButtonRef"
      :model-value="dueDate"
      :auto-close="false"
      :show-task-editor-details="true"
      :start-date="startDate"
      :start-time="startTime"
      :due-time="dueTime"
      @update:modelValue="handleDueSelect"
      @update:startDate="handleStartDateUpdate"
      @update:startTime="handleStartTimeUpdate"
      @update:dueTime="handleDueTimeUpdate"
      @close="emitPanelUpdate(null)"
    />
    <TaskReminderPopover
      v-if="panel === 'reminder'"
      :visible="true"
      :anchor-el="reminderButtonRef"
      :model-value="reminderType"
      :custom-time="reminderCustomTime"
      :due-date="dueDate"
      :due-time="dueTime"
      @select="handleReminderSelect"
      @close="emitPanelUpdate(null)"
    />
    <StatusPopover
      v-if="panel === 'status'"
      :show="true"
      :position="statusPopoverPosition"
      placement="top"
      @select="handleStatusSelect"
      @close="emitPanelUpdate(null)"
    />
    <div v-if="panel === 'group'" class="task-editor-group-panel">
      <div class="task-editor-group-header">
        <span class="task-editor-group-title">标签</span>
        <button
          v-if="showGroupManage"
          type="button"
          class="task-group-manage-btn"
          @click.stop="emitManageGroups"
        >
          管理
        </button>
      </div>
      <div class="task-group-chip-list">
        <button
          v-for="option in groupOptions"
          :key="option.value"
          type="button"
          class="task-group-chip"
          :class="{ active: selectedGroupId === option.value, special: option.special }"
          :style="{
            '--group-chip-bg': option.colorCss || 'var(--b3-list-hover)',
            '--group-chip-color': option.textColor || 'var(--b3-theme-on-surface)'
          }"
          @click="emitSelectGroup(option.value)"
        >
          <span class="task-group-chip-label">{{ option.label }}</span>
        </button>
      </div>
    </div>
    <div v-if="showDescriptionPanel" class="task-editor-quick-panel">
      <textarea
        ref="descriptionRef"
        class="task-description-input b3-text-field"
        rows="3"
        :value="description"
        :placeholder="descriptionPlaceholder"
        @input="handleDescriptionInput"
        @blur="handleDescriptionCommit"
        @keydown.ctrl.enter.prevent="handleDescriptionCommit"
      />
    </div>
    <div class="task-editor-action-bar">
      <button
        ref="statusButtonRef"
        type="button"
        class="task-editor-action-btn task-editor-status-btn"
        :class="{ 'is-active': panel === 'status' }"
        title="状态"
        aria-label="状态"
        @click.stop="toggleStatusPanel"
      >
        <span class="task-editor-status-badge" :class="`status-${normalizedStatus}`">
          {{ statusBadgeText }}
        </span>
      </button>
      <button
        type="button"
        class="task-editor-action-btn task-editor-group-btn"
        :class="{ 'is-active': panel === 'group' }"
        :style="groupButtonStyle"
        title="标签"
        aria-label="标签"
        @click.stop="togglePanel('group')"
      >
        <Icon name="group" width="14" height="14" />
        <span v-if="selectedGroupId !== TASK_GROUP_NONE_ID" class="task-editor-group-button-label">{{ groupLabel }}</span>
      </button>
      <button
        ref="dueButtonRef"
        type="button"
        class="task-editor-action-btn"
        :class="{ 'is-active': panel === 'due' }"
        title="截止日期"
        aria-label="截止日期"
        @click.stop="togglePanel('due')"
      >
        <Icon name="calendar" width="14" height="14" />
        <span v-if="hasDueDate" class="task-editor-action-value">{{ dueText }}</span>
      </button>
      <button
        ref="reminderButtonRef"
        type="button"
        class="task-editor-action-btn"
        :class="{ 'is-active': panel === 'reminder' }"
        title="提醒"
        aria-label="提醒"
        @click.stop="togglePanel('reminder')"
      >
        <Icon name="bell" width="14" height="14" />
        <span v-if="hasReminder" class="task-editor-action-value">{{ reminderText }}</span>
      </button>
      <button
        type="button"
        class="task-editor-action-btn"
        :class="{ 'is-active': panel === 'description' }"
        title="描述"
        aria-label="描述"
        @click.stop="togglePanel('description')"
      >
        <Icon name="descriptionBubble" width="14" height="14" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import type { Task } from '@/api';
import Icon from '@/components/Icon.vue';
import TaskDatePopover from '@/components/TaskDatePopover.vue';
import TaskReminderPopover from '@/components/TaskReminderPopover.vue';
import StatusPopover from '@/components/StatusPopover.vue';
import type { TaskReminderSelection, TaskReminderType } from '@/utils/taskReminder';

type TaskStatus = Task['status'];
type TaskEditorPanel = 'due' | 'description' | 'group' | 'reminder' | 'status' | null;
type TaskEditorDateFields = {
  startDate: string;
  startTime: string;
  dueDate: string;
  dueTime: string;
};

type TaskGroupOption = {
  value: string;
  label: string;
  special?: boolean;
  colorCss?: string;
  textColor?: string;
};

const TASK_GROUP_NONE_ID = '__none__';

const props = withDefaults(defineProps<{
  panel: TaskEditorPanel;
  startDate: string;
  startTime: string;
  dueDate: string;
  dueTime: string;
  dueText: string;
  hasDueDate: boolean;
  description: string;
  hasDescription: boolean;
  groupOptions: TaskGroupOption[];
  selectedGroupId: string;
  groupLabel: string;
  reminderType?: TaskReminderType;
  reminderCustomTime?: string;
  reminderText?: string;
  hasReminder?: boolean;
  status?: TaskStatus;
  groupButtonStyle?: Record<string, string>;
  defaultGroupChipColor?: string;
  descriptionPlaceholder?: string;
  showGroupManage?: boolean;
}>(), {
  reminderType: undefined,
  reminderCustomTime: '',
  reminderText: '',
  hasReminder: false,
  status: 'pending',
  groupButtonStyle: () => ({}),
  defaultGroupChipColor: '#9aa0a6',
  descriptionPlaceholder: 'Add task description...',
  showGroupManage: true
});

const emit = defineEmits<{
  'update:panel': [value: TaskEditorPanel];
  'update:description': [value: string];
  'update-dates': [value: TaskEditorDateFields];
  'select-group': [value: string];
  'select-reminder': [value: TaskReminderSelection];
  'select-status': [value: TaskStatus];
  'commit-description': [];
  'manage-groups': [];
}>();

const dueButtonRef = ref<HTMLElement | null>(null);
const reminderButtonRef = ref<HTMLElement | null>(null);
const statusButtonRef = ref<HTMLElement | null>(null);
const descriptionRef = ref<HTMLTextAreaElement | null>(null);
const statusPopoverPosition = ref({ x: 0, y: 0 });

const showDescriptionPanel = computed(() => props.panel === 'description' || props.hasDescription);
const statusLabelMap: Record<TaskStatus, string> = {
  pending: '\u5f85\u5904\u7406',
  'in-progress': '\u8fdb\u884c\u4e2d',
  delayed: '\u5ef6\u8fdf',
  completed: '\u5df2\u5b8c\u6210',
  cancelled: '\u5df2\u53d6\u6d88'
};
const normalizedStatus = computed<TaskStatus>(() => normalizeStatusValue(props.status));
const statusBadgeText = computed(() => statusLabelMap[normalizedStatus.value]);

function emitPanelUpdate(value: TaskEditorPanel): void {
  emit('update:panel', value);
}

function togglePanel(panel: Exclude<TaskEditorPanel, null>): void {
  emitPanelUpdate(props.panel === panel ? null : panel);
}

function toggleStatusPanel(): void {
  if (props.panel === 'status') {
    emitPanelUpdate(null);
    return;
  }
  updateStatusPopoverPosition();
  emitPanelUpdate('status');
}

function handleDueSelect(value: string): void {
  emitDateFields({ dueDate: value });
}

function handleStartDateUpdate(value: string): void {
  emitDateFields({ startDate: value });
}

function handleStartTimeUpdate(value: string): void {
  emitDateFields({ startTime: value });
}

function handleDueTimeUpdate(value: string): void {
  emitDateFields({ dueTime: value });
}

function handleReminderSelect(value: TaskReminderSelection): void {
  emit('select-reminder', value);
}

function handleStatusSelect(value: string): void {
  emit('select-status', normalizeStatusValue(value));
}

function handleDescriptionInput(event: Event): void {
  const target = event.target as HTMLTextAreaElement | null;
  emit('update:description', target?.value ?? '');
}

function handleDescriptionCommit(): void {
  emit('commit-description');
  emitPanelUpdate(null);
}

function emitSelectGroup(value: string): void {
  emit('select-group', value);
}

function emitManageGroups(): void {
  emit('manage-groups');
}

function emitDateFields(partialValue: Partial<TaskEditorDateFields>): void {
  emit('update-dates', {
    startDate: props.startDate,
    startTime: props.startTime,
    dueDate: props.dueDate,
    dueTime: props.dueTime,
    ...partialValue
  });
}

function normalizeStatusValue(value: unknown): TaskStatus {
  if (value === 'pending' || value === 'in-progress' || value === 'delayed' || value === 'completed' || value === 'cancelled') {
    return value;
  }
  return 'pending';
}

function updateStatusPopoverPosition(): void {
  const button = statusButtonRef.value;
  if (!button) {
    return;
  }
  const rect = button.getBoundingClientRect();
  statusPopoverPosition.value = {
    x: Math.round(rect.left + rect.width / 2),
    y: Math.round(rect.top - 8)
  };
}

function handleOutsideMouseDown(event: MouseEvent): void {
  if (props.panel !== 'status') {
    return;
  }
  const target = event.target as HTMLElement | null;
  if (!target) {
    emitPanelUpdate(null);
    return;
  }
  if (target.closest('.status-popover')) {
    return;
  }
  if (statusButtonRef.value?.contains(target)) {
    return;
  }
  emitPanelUpdate(null);
}

function handleViewportChange(): void {
  if (props.panel === 'status') {
    updateStatusPopoverPosition();
  }
}

watch(
  () => props.panel,
  (value) => {
    if (value === 'description') {
      void nextTick(() => {
        descriptionRef.value?.focus();
      });
    }
    if (value === 'status') {
      void nextTick(() => {
        updateStatusPopoverPosition();
      });
    }
  }
);

onMounted(() => {
  document.addEventListener('mousedown', handleOutsideMouseDown);
  window.addEventListener('resize', handleViewportChange);
  window.addEventListener('scroll', handleViewportChange, true);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleOutsideMouseDown);
  window.removeEventListener('resize', handleViewportChange);
  window.removeEventListener('scroll', handleViewportChange, true);
});
</script>

<style scoped>
.task-editor-quick-panel {
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 8px;
  border: 1px solid var(--b3-theme-border);
  margin-bottom: 12px;
}

.task-editor-quick-panel textarea,
.task-editor-quick-panel input[type="date"] {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid var(--b3-theme-border);
  border-radius: 6px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  font-size: 12px;
  font-family: inherit;
}

.task-description-input {
  width: 100%;
  min-height: 56px;
  resize: vertical;
  line-height: 1.45;
}

.task-editor-quick-panel textarea:focus,
.task-editor-quick-panel input[type="date"]:focus {
  outline: none;
  border-color: #f98f7a;
}

.task-editor-action-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: flex-start;
}

.task-editor-action-btn {
  flex: 0 0 auto;
  width: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  border-radius: 8px;
  border: 1px solid var(--b3-theme-border);
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  cursor: pointer;
  font-size: 12px;
}

.task-editor-status-btn {
  padding: 0px;
  background: transparent;
}

.task-editor-status-badge {
  display: flex;
  align-items: center;
  border-radius: 8px;
  font-weight: 500;
  gap: 2px;
  padding: 5px 6px;
  font-size: 12px;
  white-space: nowrap;
}

.task-editor-status-badge.status-pending {
  background: var(--pinch-background4);
  color: var(--pinch-group-color4);
}

.task-editor-status-badge.status-in-progress {
  background: var(--pinch-background7);
  color: var(--pinch-group-color7);
}

.task-editor-status-badge.status-delayed {
  background: var(--pinch-background8);
  color: var(--pinch-group-color8);
}

.task-editor-status-badge.status-completed {
  background: var(--pinch-background5);
  color: var(--pinch-group-color5);
}

.task-editor-status-badge.status-cancelled {
  background: var(--pinch-background1);
  color: var(--pinch-group-color1);
}

.task-editor-action-btn.is-active {
  border-color: #f98f7a;
  box-shadow: 0 0 0 1px #f98f7a inset;
}

.task-editor-action-value {
  margin-left: auto;
  font-size: 11px;
  opacity: 0.7;
}

.task-editor-group-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid var(--b3-theme-border);
  background: var(--b3-list-hover);
  margin-bottom: 8px;
}

.task-editor-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.task-editor-group-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--b3-theme-on-background);
}

.task-editor-group-btn {
  min-width: 0;
}

.task-editor-group-button-label {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-group-manage-btn {
  border: none;
  background: none;
  cursor: pointer;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
}

.task-group-manage-btn:hover {
  color: var(--b3-theme-on-background);
}

.task-group-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.task-group-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  border: none;
  background: var(--group-chip-bg, var(--b3-list-hover));
  color: var(--group-chip-color, var(--b3-theme-on-surface));
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
}

.task-group-chip.active {
  background: #f98f7a;
  color: var(--b3-theme-background);
  box-shadow: none;
}

.task-group-chip:hover {
  color: var(--group-chip-color, var(--b3-theme-on-background));
}
</style>
