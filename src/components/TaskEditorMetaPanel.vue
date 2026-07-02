<template>
  <div
    class="task-editor-meta-panel"
    :class="`is-${variant}`"
  >
    <TaskDatePopover
      v-if="showDueDateAction && panel === 'due'"
      :visible="true"
      :anchor-el="dueButtonRef"
      :model-value="dueDate"
      :auto-close="false"
      :show-task-editor-details="true"
      :start-date="startDate"
      :start-time="startTime"
      :due-time="dueTime"
      :show-repeat-editor="true"
      :repeat-frequency="repeatFrequency"
      :repeat-rule="repeatRule"
      @update:dateFields="handleDateFieldsUpdate"
      @update:modelValue="handleDueSelect"
      @update:startDate="handleStartDateUpdate"
      @update:startTime="handleStartTimeUpdate"
      @update:dueTime="handleDueTimeUpdate"
      @saveRepeatRule="emitSaveRepeatRule"
      @close="emitPanelUpdate(null)"
    />
    <TaskReminderPopover
      v-if="showReminderControl && panel === 'reminder'"
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
    <Teleport to="body">
      <div
        v-if="layout === 'properties' && propertyPicker"
        class="task-editor-property-popover"
        :style="propertyPopoverStyle"
        @mousedown.stop
        @click.stop
      >
        <div class="task-editor-property-popover-header">
          <span>{{ propertyPicker === 'tags' ? t('taskManager.tags') : t('taskScopeDialog.goals') }}</span>
          <button
            v-if="showGroupManage"
            type="button"
            class="task-group-manage-btn"
            @click.stop="emitManageCurrentProperty"
          >
            {{ t('taskManager.manage') }}
          </button>
        </div>
        <div v-if="propertyPicker === 'tags'" class="task-group-chip-list">
          <button
            v-for="option in groupOptions"
            :key="option.value"
            type="button"
            class="task-group-chip"
            :class="{ active: isGroupOptionSelected(option.value), primary: isPrimaryGroupOption(option.value), special: option.special }"
            :style="{
              '--group-chip-bg': option.colorCss || 'var(--b3-list-hover)',
              '--group-chip-color': option.textColor || 'var(--b3-theme-on-surface)'
            }"
            @click="emitSelectGroup(option.value)"
          >
            <span class="task-group-chip-label">{{ option.label }}</span>
            <span v-if="isPrimaryGroupOption(option.value)" class="task-group-chip-primary">
              {{ t('taskManager.primaryTagShort') }}
            </span>
          </button>
        </div>
        <div v-else class="task-group-chip-list">
          <button
            v-for="option in goalOptions"
            :key="option.value"
            type="button"
            class="task-group-chip task-goal-chip"
            :class="{ active: isGoalOptionSelected(option.value) }"
            @click="emitSelectGoal(option.value)"
          >
            <span v-if="option.emoji" class="task-goal-chip-emoji">{{ option.emoji }}</span>
            <span class="task-group-chip-label">{{ option.label }}</span>
          </button>
          <span v-if="goalOptions.length === 0" class="task-editor-property-placeholder">
            {{ t('taskManager.notSet') }}
          </span>
        </div>
      </div>
    </Teleport>
    <div v-if="layout !== 'properties' && panel === 'group'" class="task-editor-group-panel">
      <div class="task-editor-group-header">
        <span class="task-editor-group-title">{{ t('taskManager.tags') }}</span>
        <button
          v-if="showGroupManage"
          type="button"
          class="task-group-manage-btn"
          @click.stop="emitManageGroups"
        >
          {{ t('taskManager.manage') }}
        </button>
      </div>
      <div class="task-group-chip-list">
        <button
          v-for="option in groupOptions"
          :key="option.value"
          type="button"
          class="task-group-chip"
          :class="{ active: isGroupOptionSelected(option.value), primary: isPrimaryGroupOption(option.value), special: option.special }"
          :style="{
            '--group-chip-bg': option.colorCss || 'var(--b3-list-hover)',
            '--group-chip-color': option.textColor || 'var(--b3-theme-on-surface)'
          }"
          @click="emitSelectGroup(option.value)"
        >
          <span class="task-group-chip-label">{{ option.label }}</span>
          <span v-if="isPrimaryGroupOption(option.value)" class="task-group-chip-primary">
            {{ t('taskManager.primaryTagShort') }}
          </span>
        </button>
      </div>
      <div v-if="goalOptions.length > 0" class="task-editor-goal-section">
        <div class="task-editor-goal-title">{{ t('taskScopeDialog.goals') }}</div>
        <div class="task-group-chip-list">
          <button
            v-for="option in goalOptions"
            :key="option.value"
            type="button"
            class="task-group-chip task-goal-chip"
            :class="{ active: isGoalOptionSelected(option.value) }"
            @click="emitSelectGoal(option.value)"
          >
            <span v-if="option.emoji" class="task-goal-chip-emoji">{{ option.emoji }}</span>
            <span class="task-group-chip-label">{{ option.label }}</span>
          </button>
        </div>
      </div>
    </div>
    <div v-if="showDescriptionControl && showDescriptionPanel" class="task-editor-quick-panel">
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
    <div v-if="layout === 'properties'" class="task-editor-property-list">
      <button
        ref="statusButtonRef"
        type="button"
        class="task-editor-property-row ariaLabel"
        :class="{ 'is-active': panel === 'status' }"
        :aria-label="t('taskManager.status')"
        @click.stop="toggleStatusPanel"
      >
        <span class="task-editor-property-label">
          <Icon name="taskProperty" width="15" height="15" />
          <span>{{ t('taskManager.status') }}</span>
        </span>
        <span class="task-editor-property-value">
          <span class="task-editor-status-badge" :class="`status-${normalizedStatus}`">
            {{ statusBadgeText }}
          </span>
        </span>
      </button>

      <div
        v-if="showPriorityAction"
        class="task-editor-property-row"
      >
        <span class="task-editor-property-label">
          <Icon name="flag" width="15" height="15" />
          <span>{{ t('taskManager.priority') }}</span>
        </span>
        <span class="task-editor-property-value is-priority-list">
          <button
            v-for="option in priorityOptions"
            :key="option.value"
            type="button"
            class="task-editor-priority-option ariaLabel"
            :class="{ active: priority === option.value }"
            :style="{ '--priority-bg': option.background, '--priority-color': option.color }"
            :aria-label="option.label"
            @click.stop="emitSelectPriority(option.value)"
          >
            {{ option.shortLabel }}
          </button>
        </span>
      </div>

      <button
        ref="tagPropertyRowRef"
        type="button"
        class="task-editor-property-row ariaLabel"
        :class="{ 'is-active': propertyPicker === 'tags' }"
        :aria-label="t('taskManager.tags')"
        @click.stop="togglePropertyPicker('tags')"
      >
        <span class="task-editor-property-label">
          <Icon name="group" width="15" height="15" />
          <span>{{ t('taskManager.tags') }}</span>
        </span>
        <span class="task-editor-property-value is-chip-list">
          <template v-if="selectedTagButtonItems.length > 0">
            <span
              v-for="item in selectedTagButtonItems"
              :key="item.key"
              class="task-editor-property-pill"
              :style="item.style"
            >
              {{ item.label }}
            </span>
          </template>
          <span v-else class="task-editor-property-placeholder">{{ t('taskManager.noTag') }}</span>
        </span>
      </button>

      <button
        ref="goalPropertyRowRef"
        type="button"
        class="task-editor-property-row ariaLabel"
        :class="{ 'is-active': propertyPicker === 'goals' }"
        :aria-label="t('taskScopeDialog.goals')"
        @click.stop="togglePropertyPicker('goals')"
      >
        <span class="task-editor-property-label">
          <Icon name="target" width="15" height="15" />
          <span>{{ t('taskScopeDialog.goals') }}</span>
        </span>
        <span class="task-editor-property-value is-chip-list">
          <template v-if="selectedGoalButtonItems.length > 0">
            <span
              v-for="item in selectedGoalButtonItems"
              :key="item.key"
              class="task-editor-property-pill is-goal"
            >
              <span v-if="item.emoji" class="task-editor-group-button-emoji">{{ item.emoji }}</span>
              <span>{{ item.label }}</span>
            </span>
          </template>
          <span v-else class="task-editor-property-placeholder">{{ t('taskManager.notSet') }}</span>
        </span>
      </button>

      <button
        v-if="showDueDateAction"
        ref="dueButtonRef"
        type="button"
        class="task-editor-property-row ariaLabel"
        :class="{ 'is-active': panel === 'due' }"
        :aria-label="t('taskManager.dueDate')"
        @click.stop="togglePanel('due')"
      >
        <span class="task-editor-property-label">
          <Icon name="calendar" width="15" height="15" />
          <span>{{ t('taskManager.dueDate') }}</span>
        </span>
        <span class="task-editor-property-value">
          <span v-if="hasDueDate" class="task-editor-property-pill">{{ dueText }}</span>
          <span v-else class="task-editor-property-placeholder">{{ t('taskManager.notSet') }}</span>
        </span>
      </button>

      <button
        v-if="showReminderControl"
        ref="reminderButtonRef"
        type="button"
        class="task-editor-property-row ariaLabel"
        :class="{ 'is-active': panel === 'reminder' }"
        :aria-label="t('taskManager.reminder')"
        @click.stop="togglePanel('reminder')"
      >
        <span class="task-editor-property-label">
          <Icon name="bell" width="15" height="15" />
          <span>{{ t('taskManager.reminder') }}</span>
        </span>
        <span class="task-editor-property-value">
          <span v-if="hasReminder" class="task-editor-property-pill">{{ reminderText }}</span>
          <span v-else class="task-editor-property-placeholder">{{ t('taskManager.notSet') }}</span>
        </span>
      </button>
    </div>

    <div v-else class="task-editor-action-bar">
      <button
        ref="statusButtonRef"
        type="button"
        class="task-editor-action-btn task-editor-status-btn ariaLabel"
        :class="{ 'is-active': panel === 'status' }"
       
        :aria-label="t('taskManager.status')"
        @click.stop="toggleStatusPanel"
      >
        <span class="task-editor-status-badge" :class="`status-${normalizedStatus}`">
          {{ statusBadgeText }}
        </span>
      </button>
      <template v-if="groupButtonItems.length > 0">
        <button
          v-for="item in groupButtonItems"
          :key="item.key"
          type="button"
          class="task-editor-action-btn task-editor-group-btn ariaLabel"
          :class="[`is-${item.kind}`, { 'is-active': panel === 'group' }]"
          :style="item.style"
          :aria-label="groupButtonAriaLabel"
          @click.stop="togglePanel('group')"
        >
          <span v-if="item.kind === 'goal' && item.emoji" class="task-editor-group-button-emoji">{{ item.emoji }}</span>
          <Icon v-else name="group" width="14" height="14" />
          <span class="task-editor-group-button-label">{{ item.label }}</span>
        </button>
      </template>
      <button
        v-else
        type="button"
        class="task-editor-action-btn task-editor-group-btn ariaLabel"
        :class="{ 'is-active': panel === 'group' }"
        :style="groupButtonStyle"
        :aria-label="groupButtonAriaLabel"
        @click.stop="togglePanel('group')"
      >
        <Icon name="group" width="14" height="14" />
      </button>
      <button
        v-if="showDueDateAction"
        ref="dueButtonRef"
        type="button"
        class="task-editor-action-btn ariaLabel"
        :class="{ 'is-active': panel === 'due' }"
       
        :aria-label="t('taskManager.dueDate')"
        @click.stop="togglePanel('due')"
      >
        <Icon name="calendar" width="14" height="14" />
        <span v-if="hasDueDate" class="task-editor-action-value">{{ dueText }}</span>
      </button>
      <button
        v-if="showReminderControl"
        ref="reminderButtonRef"
        type="button"
        class="task-editor-action-btn ariaLabel"
        :class="{ 'is-active': panel === 'reminder' }"
       
        :aria-label="t('taskManager.reminder')"
        @click.stop="togglePanel('reminder')"
      >
        <Icon name="bell" width="14" height="14" />
        <span v-if="hasReminder" class="task-editor-action-value">{{ reminderText }}</span>
      </button>
      <button
        v-if="showDescriptionControl"
        type="button"
        class="task-editor-action-btn ariaLabel"
        :class="{ 'is-active': panel === 'description' }"
       
        :aria-label="t('taskManager.description')"
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
import { useI18n } from '@/composables/useI18n';
import type { RepeatFrequency, RepeatRule, RepeatRuleInput } from '@/repeatRepository';
import type { TaskReminderSelection, TaskReminderType } from '@/utils/taskReminder';

type TaskStatus = Task['status'];
type TaskEditorPanel = 'due' | 'description' | 'group' | 'reminder' | 'status' | null;
type TaskEditorMetaLayout = 'actions' | 'properties';
type TaskEditorPropertyPicker = 'tags' | 'goals' | null;
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

type TaskGoalOption = {
  value: string;
  label: string;
  emoji?: string;
};

type TaskEditorGroupButtonItem = {
  key: string;
  kind: 'tag' | 'goal';
  label: string;
  emoji?: string;
  style: Record<string, string>;
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
  goalOptions?: TaskGoalOption[];
  selectedGroupId: string;
  selectedTagIds?: string[];
  selectedGoalIds?: string[];
  groupLabel: string;
  reminderType?: TaskReminderType;
  reminderCustomTime?: string;
  reminderText?: string;
  hasReminder?: boolean;
  status?: TaskStatus;
  priority?: Task['priority'];
  priorityStyle?: Record<string, string>;
  repeatFrequency?: RepeatFrequency;
  repeatRule?: RepeatRule | null;
  groupButtonStyle?: Record<string, string>;
  defaultGroupChipColor?: string;
  descriptionPlaceholder?: string;
  showDescriptionControl?: boolean;
  showDueDateAction?: boolean;
  showPriorityAction?: boolean;
  showReminderControl?: boolean;
  showGroupManage?: boolean;
  layout?: TaskEditorMetaLayout;
  variant?: 'sidebar' | 'floating';
}>(), {
  reminderType: undefined,
  reminderCustomTime: '',
  reminderText: '',
  hasReminder: false,
  status: 'pending',
  priority: 'none',
  priorityStyle: () => ({}),
  repeatFrequency: 'none',
  repeatRule: null,
  groupButtonStyle: () => ({}),
  defaultGroupChipColor: '#9aa0a6',
  descriptionPlaceholder: 'Add task description...',
  showDescriptionControl: true,
  showDueDateAction: true,
  showPriorityAction: false,
  showReminderControl: true,
  showGroupManage: true,
  layout: 'actions',
  selectedTagIds: () => [],
  selectedGoalIds: () => [],
  goalOptions: () => [],
  variant: 'sidebar'
});

const emit = defineEmits<{
  'update:panel': [value: TaskEditorPanel];
  'update:description': [value: string];
  'update-dates': [value: TaskEditorDateFields];
  'select-group': [value: string];
  'select-goal': [value: string];
  'select-reminder': [value: TaskReminderSelection];
  'select-status': [value: TaskStatus];
  priority: [event: MouseEvent];
  'select-priority': [value: Task['priority']];
  'save-repeat-rule': [value: RepeatFrequency | RepeatRuleInput];
  'commit-description': [];
  'manage-groups': [];
  'manage-goals': [];
}>();

const dueButtonRef = ref<HTMLElement | null>(null);
const { t } = useI18n();
const reminderButtonRef = ref<HTMLElement | null>(null);
const statusButtonRef = ref<HTMLElement | null>(null);
const tagPropertyRowRef = ref<HTMLElement | null>(null);
const goalPropertyRowRef = ref<HTMLElement | null>(null);
const descriptionRef = ref<HTMLTextAreaElement | null>(null);
const statusPopoverPosition = ref({ x: 0, y: 0 });
const propertyPicker = ref<TaskEditorPropertyPicker>(null);
const propertyPopoverStyle = ref<Record<string, string>>({});

const showDescriptionPanel = computed(() => props.panel === 'description' || props.hasDescription);
const statusLabelMap: Record<TaskStatus, string> = {
  pending: t('taskManager.statusPending'),
  'in-progress': t('taskManager.statusInProgress'),
  delayed: t('taskManager.statusDelayed'),
  completed: t('taskManager.statusCompleted'),
  cancelled: t('taskManager.statusCancelled')
};
const normalizedStatus = computed<TaskStatus>(() => normalizeStatusValue(props.status));
const statusBadgeText = computed(() => statusLabelMap[normalizedStatus.value]);
const priorityOptions = computed<Array<{
  value: Task['priority'];
  shortLabel: string;
  label: string;
  background: string;
  color: string;
}>>(() => [
  { value: 'low', shortLabel: t('taskManager.priorityLow'), label: t('taskManager.priorityLowLabel'), background: 'var(--pinch-background7)', color: 'var(--pinch-font-color7)' },
  { value: 'medium', shortLabel: t('taskManager.priorityMedium'), label: t('taskManager.priorityMediumLabel'), background: 'var(--pinch-background3)', color: 'var(--pinch-font-color3)' },
  { value: 'high', shortLabel: t('taskManager.priorityHigh'), label: t('taskManager.priorityHighLabel'), background: 'var(--pinch-background10)', color: 'var(--pinch-font-color10)' }
]);
const selectedTagButtonItems = computed<TaskEditorGroupButtonItem[]>(() => {
  const optionByValue = new Map(props.groupOptions.map(option => [option.value, option]));
  return props.selectedTagIds
    .map(tagId => {
      const option = optionByValue.get(tagId);
      const label = option?.label || tagId;
      return label
        ? {
          key: `tag:${tagId}`,
          kind: 'tag' as const,
          label,
          style: resolveGroupButtonItemStyle(option)
        }
        : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
});
const selectedGoalButtonItems = computed<TaskEditorGroupButtonItem[]>(() => {
  const optionByValue = new Map(props.goalOptions.map(option => [option.value, option]));
  return props.selectedGoalIds
    .map(goalId => {
      const option = optionByValue.get(goalId);
      const label = option?.label?.trim() || goalId;
      return label
        ? {
          key: `goal:${goalId}`,
          kind: 'goal' as const,
          label,
          emoji: option?.emoji?.trim() || '\uD83C\uDFAF',
          style: {}
        }
        : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
});
const groupButtonItems = computed(() => [
  ...selectedTagButtonItems.value,
  ...selectedGoalButtonItems.value
]);
const selectedTagLabels = computed(() => selectedTagButtonItems.value.map(item => item.label));
const selectedGoalLabels = computed(() => selectedGoalButtonItems.value.map(item => item.label));
const groupButtonAriaLabel = computed(() => {
  const sections: string[] = [];
  if (selectedTagLabels.value.length > 0) {
    sections.push(`${t('taskManager.tags')}: ${selectedTagLabels.value.join(', ')}`);
  }
  if (selectedGoalLabels.value.length > 0) {
    sections.push(`${t('taskScopeDialog.goals')}: ${selectedGoalLabels.value.join(', ')}`);
  }
  return sections.length > 0 ? sections.join('; ') : t('taskManager.noTag');
});

function emitPanelUpdate(value: TaskEditorPanel): void {
  emit('update:panel', value);
}

function togglePanel(panel: Exclude<TaskEditorPanel, null>): void {
  closePropertyPicker();
  emitPanelUpdate(props.panel === panel ? null : panel);
}

function toggleStatusPanel(): void {
  closePropertyPicker();
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

function handleDateFieldsUpdate(value: TaskEditorDateFields): void {
  emit('update-dates', value);
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

function emitSaveRepeatRule(value: RepeatFrequency | RepeatRuleInput): void {
  emit('save-repeat-rule', value);
}

function handleReminderSelect(value: TaskReminderSelection): void {
  emit('select-reminder', value);
}

function handleStatusSelect(value: string): void {
  emit('select-status', normalizeStatusValue(value));
}

function emitSelectPriority(value: Task['priority']): void {
  emit('select-priority', props.priority === value ? 'none' : value);
}

function togglePropertyPicker(kind: Exclude<TaskEditorPropertyPicker, null>): void {
  if (propertyPicker.value === kind) {
    closePropertyPicker();
    return;
  }
  emitPanelUpdate(null);
  propertyPicker.value = kind;
  void nextTick(updatePropertyPopoverPosition);
}

function closePropertyPicker(): void {
  propertyPicker.value = null;
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

function emitSelectGoal(value: string): void {
  emit('select-goal', value);
}

function resolveGroupButtonItemStyle(option?: TaskGroupOption): Record<string, string> {
  if (!option) {
    return {};
  }
  return {
    ...(option.colorCss ? { background: option.colorCss, borderColor: option.colorCss } : {}),
    ...(option.textColor ? { color: option.textColor } : {})
  };
}

function isGroupOptionSelected(value: string): boolean {
  if (value === TASK_GROUP_NONE_ID) {
    return props.selectedTagIds.length === 0;
  }
  return props.selectedTagIds.includes(value);
}

function isPrimaryGroupOption(value: string): boolean {
  return value !== TASK_GROUP_NONE_ID && props.selectedTagIds[0] === value;
}

function isGoalOptionSelected(value: string): boolean {
  return props.selectedGoalIds.includes(value);
}

function emitManageCurrentProperty(): void {
  const activePicker = propertyPicker.value;
  closePropertyPicker();
  if (activePicker === 'goals') {
    emit('manage-goals');
    return;
  }
  emit('manage-groups');
}

function emitManageGroups(): void {
  closePropertyPicker();
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

function getPropertyPickerAnchor(kind: TaskEditorPropertyPicker): HTMLElement | null {
  if (kind === 'tags') {
    return tagPropertyRowRef.value;
  }
  if (kind === 'goals') {
    return goalPropertyRowRef.value;
  }
  return null;
}

function updatePropertyPopoverPosition(): void {
  const anchor = getPropertyPickerAnchor(propertyPicker.value);
  if (!anchor) {
    return;
  }
  const rect = anchor.getBoundingClientRect();
  const verticalGap = 6;
  const viewportPadding = 8;
  const popoverWidth = Math.min(320, Math.max(240, rect.width));
  const availableAbove = Math.max(
    0,
    rect.top - verticalGap - viewportPadding
  );
  const popoverMaxHeight = Math.min(320, window.innerHeight - viewportPadding * 2, availableAbove);
  const left = Math.min(
    window.innerWidth - popoverWidth - 8,
    Math.max(8, rect.right - popoverWidth)
  );
  propertyPopoverStyle.value = {
    position: 'fixed',
    left: `${Math.round(left)}px`,
    bottom: `${Math.round(window.innerHeight - rect.top + verticalGap)}px`,
    width: `${Math.round(popoverWidth)}px`,
    maxHeight: `${Math.round(Math.max(80, popoverMaxHeight))}px`
  };
}

function handleOutsideMouseDown(event: MouseEvent): void {
  const target = event.target as HTMLElement | null;
  if (!target) {
    closePropertyPicker();
    if (props.panel === 'status') {
      emitPanelUpdate(null);
    }
    return;
  }
  if (propertyPicker.value) {
    const anchor = getPropertyPickerAnchor(propertyPicker.value);
    if (target.closest('.task-editor-property-popover') || anchor?.contains(target)) {
      return;
    }
    closePropertyPicker();
  }
  if (props.panel !== 'status') {
    return;
  }
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
  if (propertyPicker.value) {
    updatePropertyPopoverPosition();
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
      closePropertyPicker();
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
.task-editor-meta-panel {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--b3-theme-border);
  gap: 4px;
  padding: 0 8px 8px;
}


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

.task-editor-property-list {
  display: grid;
  gap: 2px;
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

.task-editor-property-row:hover,
.task-editor-property-row.is-active {
  background: var(--b3-list-hover);
}

.task-editor-property-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
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
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-width: 0;
  gap: 6px;
  color: var(--b3-theme-on-background);
  font-size: 13px;
  line-height: 1.3;
}

.task-editor-property-value.is-chip-list {
  flex-wrap: wrap;
}

.task-editor-property-value.is-priority-list {
  flex-wrap: wrap;
  gap: 6px;
}

.task-editor-priority-option {
  min-width: 34px;
  padding: 2px 8px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: color-mix(in srgb, var(--priority-bg) 72%, transparent);
  color: var(--priority-color);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
}

.task-editor-priority-option:hover,
.task-editor-priority-option.active {
  background: var(--priority-bg);
  border-color: var(--priority-color);
}

.task-editor-property-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  padding: 2px 8px;
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

.task-editor-property-pill.is-priority {
  font-weight: 600;
}

.task-editor-property-placeholder {
  color: var(--b3-theme-on-surface);
  font-size: 12px;
  opacity: 0.62;
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
  border-radius: 12px;
  font-weight: 500;
  gap: 2px;
  padding: 2px 8px;
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

.task-editor-property-popover {
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: min(320px, calc(100vh - 24px));
  padding: 10px;
  border: 1px solid var(--b3-theme-border);
  border-radius: 8px;
  background: var(--b3-theme-background);
  box-shadow: var(--pinch-menu-shadow);
  box-sizing: border-box;
  overflow: auto;
}

.task-editor-property-popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--b3-theme-on-background);
  font-size: 12px;
  font-weight: 600;
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

.task-editor-goal-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid var(--b3-border-color);
}

.task-editor-goal-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--b3-theme-on-surface);
}

.task-editor-group-btn {
  min-width: 0;
  max-width: 100%;
  flex: 0 1 auto;
}

.task-editor-group-btn.is-goal {
  background: var(--pinch-background6);
  border-color: var(--pinch-color6);
}

.task-editor-group-button-label {
  min-width: 0;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
}

.task-editor-group-button-emoji {
  flex: 0 0 auto;
  line-height: 1;
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

.task-goal-chip {
  background: var(--b3-theme-background);
}

.task-goal-chip-emoji {
  line-height: 1;
}

.task-group-chip-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.28);
  color: inherit;
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
}

.task-group-chip:hover {
  color: var(--group-chip-color, var(--b3-theme-on-background));
}
</style>
