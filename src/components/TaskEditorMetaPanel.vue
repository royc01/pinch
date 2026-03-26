<template>
  <div class="task-editor-meta-panel">
    <TaskDatePopover
      v-if="panel === 'due'"
      :visible="true"
      :anchor-el="dueButtonRef"
      :model-value="dueDate"
      @update:modelValue="handleDueSelect"
      @close="emitPanelUpdate(null)"
    />
    <TaskReminderPopover
      v-if="panel === 'reminder'"
      :visible="true"
      :anchor-el="reminderButtonRef"
      :model-value="reminderType"
      :custom-time="reminderCustomTime"
      :due-date="dueDate"
      @select="handleReminderSelect"
      @close="emitPanelUpdate(null)"
    />
    <div v-if="panel === 'group'" class="task-editor-group-panel">
      <div class="task-editor-group-header">
        <span class="task-editor-group-title">选择标签</span>
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
        <Icon name="edit" width="14" height="14" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import Icon from '@/components/Icon.vue';
import TaskDatePopover from '@/components/TaskDatePopover.vue';
import TaskReminderPopover from '@/components/TaskReminderPopover.vue';
import type { TaskReminderSelection, TaskReminderType } from '@/utils/taskReminder';

type TaskEditorPanel = 'due' | 'description' | 'group' | 'reminder' | null;

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
  dueDate: string;
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
  groupButtonStyle?: Record<string, string>;
  defaultGroupChipColor?: string;
  descriptionPlaceholder?: string;
  showGroupManage?: boolean;
}>(), {
  reminderType: undefined,
  reminderCustomTime: '',
  reminderText: '',
  hasReminder: false,
  groupButtonStyle: () => ({}),
  defaultGroupChipColor: '#9aa0a6',
  descriptionPlaceholder: '添加任务描述...',
  showGroupManage: true
});

const emit = defineEmits<{
  'update:panel': [value: TaskEditorPanel];
  'update:description': [value: string];
  'select-due': [value: string];
  'select-group': [value: string];
  'select-reminder': [value: TaskReminderSelection];
  'commit-description': [];
  'manage-groups': [];
}>();

const dueButtonRef = ref<HTMLElement | null>(null);
const reminderButtonRef = ref<HTMLElement | null>(null);
const descriptionRef = ref<HTMLTextAreaElement | null>(null);

const showDescriptionPanel = computed(() => props.panel === 'description' || props.hasDescription);

function emitPanelUpdate(value: TaskEditorPanel): void {
  emit('update:panel', value);
}

function togglePanel(panel: Exclude<TaskEditorPanel, null>): void {
  emitPanelUpdate(props.panel === panel ? null : panel);
}

function handleDueSelect(value: string): void {
  emit('select-due', value);
}

function handleReminderSelect(value: TaskReminderSelection): void {
  emit('select-reminder', value);
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

watch(
  () => props.panel,
  (value) => {
    if (value === 'description') {
      void nextTick(() => {
        descriptionRef.value?.focus();
      });
    }
  }
);
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
  gap: 8px;
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
