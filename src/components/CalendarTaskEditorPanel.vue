<template>
  <TaskEditorPanelShell
    ref="shellRef"
    :mode="mode"
    :panel-style="resolvedPanelStyle"
    :title="title"
    :show-pin="showPin"
    :pin-active="pinActive"
    :show-move="showMove"
    :show-archive="showArchive"
    :is-archived="isArchived"
    :show-delete="showDelete"
    :show-priority="showPriority && mode !== 'dock'"
    :show-focus="showFocus"
    :show-open-content="showOpenContent"
    :priority-style="priorityStyle"
    @panel-mousedown="$emit('panelMousedown')"
    @pin="$emit('pin')"
    @move="$emit('move')"
    @archive="$emit('archive')"
    @delete="$emit('delete')"
    @priority="$emit('priority', $event)"
    @focus="$emit('focus')"
    @open-content="$emit('openContent')"
    @close="$emit('close')"
  >
    <TaskEditorProtyleBody
      ref="bodyRef"
      class="calendar-task-editor-body"
      :variant="mode === 'floating' ? 'floating' : 'sidebar'"
      :show-description-control="!!task"
      :description="description"
      :has-description="hasDescription"
      :description-active="panel === 'description'"
      :description-placeholder="descriptionPlaceholder"
      :add-description-label="t('taskManager.addDescription', 'Add description')"
      @open-description="$emit('update:panel', 'description')"
      @update:description="$emit('update:description', $event)"
      @commit-description="$emit('commitDescription')"
      @close-description="$emit('update:panel', null)"
    />

    <TaskEditorMetaPanel
      v-if="task"
      variant="floating"
      :panel="panel"
      :start-date="startDate"
      :start-time="startTime"
      :due-date="dueDate"
      :due-time="dueTime"
      :due-text="dueText"
      :has-due-date="hasDueDate"
      :description="description"
      :has-description="hasDescription"
      :group-options="groupOptions"
      :goal-options="goalOptions"
      :selected-group-id="selectedGroupId"
      :selected-tag-ids="selectedTagIds"
      :selected-goal-ids="selectedGoalIds"
      :group-label="groupLabel"
      :reminder-type="reminderType"
      :reminder-custom-time="reminderCustomTime"
      :reminder-text="reminderText"
      :has-reminder="hasReminder"
      :status="status"
      :priority="task.priority || 'none'"
      :priority-style="priorityStyle"
       :repeat-frequency="repeatFrequency"
       :repeat-rule="repeatRule"
       :repeat-termination="resolvedRepeatTermination"
      :group-button-style="groupButtonStyle"
      :default-group-chip-color="defaultGroupChipColor"
      :description-placeholder="descriptionPlaceholder"
      :show-description-control="false"
      :show-due-date-action="false"
      :show-priority-action="showPriority"
      :show-reminder-control="mode !== 'dock'"
      :layout="mode === 'dock' ? 'properties' : 'actions'"
      @update:panel="$emit('update:panel', $event)"
      @update:description="$emit('update:description', $event)"
      @update-dates="$emit('quickUpdateDates', $event)"
      @select-group="$emit('selectGroup', $event)"
      @select-goal="$emit('selectGoal', $event)"
      @select-reminder="$emit('selectReminder', $event)"
      @select-status="$emit('selectStatus', $event)"
      @select-priority="$emit('selectPriority', $event)"
      @priority="$emit('priority', $event)"
      @save-repeat-rule="$emit('saveRepeatRule', $event)"
      @commit-description="$emit('commitDescription')"
      @manage-groups="$emit('manageGroups')"
      @manage-goals="$emit('manageGoals')"
    />

    <div
      v-if="task"
      class="calendar-task-editor-tools"
      @mousedown.stop
      @click.stop
    >
      <div class="calendar-editor-section">
        <div class="calendar-editor-section-title">{{ t('taskManager.backgroundColor', 'Background color') }}</div>
        <div class="calendar-editor-color-picker">
          <button
            v-for="color in backgroundColors"
            :key="color.value"
            type="button"
            class="calendar-editor-color-option ariaLabel"
            :class="{ selected: task.backgroundColor === color.value }"
            :style="getColorOptionStyle(color)"
            :aria-label="color.value"
            @click="$emit('setColor', color.value)"
          ></button>
        </div>
      </div>

      <CalendarTaskDateSection
        :start-date="startDate"
        :start-time="startTime"
        :due-date="dueDate"
        :due-time="dueTime"
        @update-dates="emit('quickUpdateDates', $event)"
        @clear-dates="emit('clearDates')"
      />

      <TaskRepeatEditor
        v-if="mode !== 'dock'"
        class="calendar-editor-section calendar-editor-repeat"
        :repeat-frequency="repeatFrequency"
        :repeat-rule="repeatRule"
        :repeat-termination="resolvedRepeatTermination"
        :base-date="startDate || dueDate"
        @saveRepeatRule="$emit('saveRepeatRule', $event)"
      />

      <div v-if="mode === 'dock'" class="calendar-editor-reminder-section">
        <button
          ref="reminderButtonRef"
          type="button"
          class="calendar-editor-reminder-row ariaLabel"
          :class="{ 'is-active': panel === 'reminder' }"
          :aria-label="t('taskManager.reminder')"
          @click.stop="toggleReminderPanel"
        >
          <span class="calendar-editor-reminder-label">{{ t('taskManager.reminder') }}</span>
          <span class="calendar-editor-reminder-value">
            <span v-if="hasReminder" class="calendar-editor-reminder-pill">{{ reminderDisplayText }}</span>
            <span v-else class="calendar-editor-reminder-placeholder">{{ t('taskManager.notSet') }}</span>
          </span>
        </button>
      </div>
    </div>

    <slot name="move-dialog" />

    <TaskReminderPopover
      v-if="task && mode === 'dock' && panel === 'reminder'"
      :visible="true"
      :anchor-el="reminderButtonRef"
      :model-value="reminderType"
      :custom-time="reminderCustomTime"
      :due-date="dueDate"
      :due-time="dueTime"
      @select="$emit('selectReminder', $event)"
      @close="$emit('update:panel', null)"
    />
  </TaskEditorPanelShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Task } from '@/api';
import type { RepeatFrequency, RepeatRule, RepeatRuleInput, RepeatTermination } from '@/repeatRepository';
import CalendarTaskDateSection from '@/components/CalendarTaskDateSection.vue';
import Icon from '@/components/Icon.vue';
import TaskEditorMetaPanel from '@/components/TaskEditorMetaPanel.vue';
import TaskEditorPanelShell from '@/components/TaskEditorPanelShell.vue';
import TaskEditorProtyleBody from '@/components/TaskEditorProtyleBody.vue';
import TaskReminderPopover from '@/components/TaskReminderPopover.vue';
import TaskRepeatEditor from '@/components/TaskRepeatEditor.vue';
import { useI18n } from '@/composables/useI18n';
import { resolveTaskAccentColor } from '@/utils/taskColor';
import {
  computeTaskReminderTimestamp,
  formatDateTimeLocal,
  formatReminderDateTime,
  type TaskReminderSelection,
  type TaskReminderType
} from '@/utils/taskReminder';

type CalendarTaskEditorPanel = 'due' | 'description' | 'group' | 'reminder' | 'status' | null;
type CalendarTaskEditorDateFields = {
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

export type CalendarTaskEditorColorOption = {
  value: string;
  css: string;
};

const props = withDefaults(defineProps<{
  title: string;
  task: Task | null;
  panel: CalendarTaskEditorPanel;
  mode?: 'floating' | 'dock';
  panelStyle?: Record<string, string>;
  showPin?: boolean;
  pinActive?: boolean;
  showMove?: boolean;
  showArchive?: boolean;
  isArchived?: boolean;
  showDelete?: boolean;
  showPriority?: boolean;
  showFocus?: boolean;
  showOpenContent?: boolean;
  priorityStyle?: Record<string, string>;
  backgroundColors: CalendarTaskEditorColorOption[];
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
  status?: Task['status'];
  repeatFrequency?: RepeatFrequency;
  repeatRule?: RepeatRule | null;
  repeatTermination?: RepeatTermination;
  groupButtonStyle?: Record<string, string>;
  defaultGroupChipColor?: string;
  descriptionPlaceholder?: string;
}>(), {
  mode: 'floating',
  panelStyle: () => ({}),
  showPin: false,
  pinActive: false,
  showMove: false,
  showArchive: false,
  isArchived: false,
  showDelete: false,
  showPriority: false,
  showFocus: false,
  showOpenContent: false,
  priorityStyle: () => ({}),
  goalOptions: () => [],
  selectedTagIds: () => [],
  selectedGoalIds: () => [],
  reminderType: undefined,
  reminderCustomTime: '',
  reminderText: '',
  hasReminder: false,
  status: 'pending',
  repeatFrequency: 'none',
  repeatRule: null,
  groupButtonStyle: () => ({}),
  defaultGroupChipColor: '#9aa0a6',
  descriptionPlaceholder: 'Add task description...'
});

const emit = defineEmits<{
  panelMousedown: [];
  pin: [];
  move: [];
  archive: [];
  delete: [];
  priority: [event: MouseEvent];
  focus: [];
  openContent: [];
  close: [];
  setColor: [color: string];
  clearDates: [];
  quickUpdateDates: [value: CalendarTaskEditorDateFields];
  'update:panel': [value: CalendarTaskEditorPanel];
  'update:description': [value: string];
  selectGroup: [value: string];
  selectGoal: [value: string];
  selectReminder: [value: TaskReminderSelection];
  selectStatus: [value: Task['status']];
  selectPriority: [value: Task['priority']];
  saveRepeatRule: [value: RepeatFrequency | RepeatRuleInput];
  commitDescription: [];
  manageGroups: [];
  manageGoals: [];
}>();

const { t } = useI18n();
const shellRef = ref<InstanceType<typeof TaskEditorPanelShell> | null>(null);
const bodyRef = ref<InstanceType<typeof TaskEditorProtyleBody> | null>(null);
const reminderButtonRef = ref<HTMLElement | null>(null);

const defaultPanelStyle = computed<Record<string, string>>(() => {
  if (props.mode === 'dock') {
    return {
      width: '100%',
      height: '100%',
      minHeight: '0',
      maxHeight: '100%'
    };
  }

  return {
    top: '12px',
    right: '52px',
    bottom: '12px',
    width: 'min(440px, calc(100vw - 76px))',
    maxHeight: 'calc(100vh - 24px)'
  };
});

const resolvedPanelStyle = computed<Record<string, string>>(() => ({
  ...defaultPanelStyle.value,
  ...props.panelStyle
}));

const reminderDisplayText = computed(() => {
  if (!props.hasReminder) {
    return '';
  }
  const timestamp = computeTaskReminderTimestamp({
    dueDate: props.dueDate,
    dueTime: props.dueTime,
    reminderType: props.reminderType,
    reminderCustomTime: props.reminderCustomTime
  });
  if (timestamp !== null) {
    return formatReminderDateTime(formatDateTimeLocal(new Date(timestamp)));
  }
  return props.reminderText || '';
});

// Calendar editors do not otherwise keep a local recurrence-termination
// state. A task's due date is the natural initial cutoff for a new repeat.
const resolvedRepeatTermination = computed<RepeatTermination>(() => {
  if (props.repeatTermination) {
    return props.repeatTermination;
  }
  return props.dueDate
    ? { type: 'date', date: props.dueDate }
    : { type: 'never' };
});

function getColorOptionStyle(color: CalendarTaskEditorColorOption): Record<string, string> {
  return {
    background: color.css,
    '--calendar-editor-color-accent': resolveTaskAccentColor(color.value)
  };
}

const exposedPanelEl = computed<HTMLElement | null>(() => {
  const exposed = shellRef.value as { panelEl?: HTMLElement | { value?: HTMLElement | null } } | null;
  const panelEl = exposed?.panelEl;
  if (!panelEl) {
    return null;
  }
  if (panelEl instanceof HTMLElement) {
    return panelEl;
  }
  if (typeof panelEl === 'object' && 'value' in panelEl) {
    return panelEl.value || null;
  }
  return null;
});

const exposedBodyEl = computed<HTMLElement | null>(() => {
  const exposed = bodyRef.value as { bodyEl?: HTMLElement | { value?: HTMLElement | null } } | null;
  const bodyEl = exposed?.bodyEl;
  if (!bodyEl) {
    return null;
  }
  if (bodyEl instanceof HTMLElement) {
    return bodyEl;
  }
  if (typeof bodyEl === 'object' && 'value' in bodyEl) {
    return bodyEl.value || null;
  }
  return null;
});

function toggleReminderPanel(): void {
  emit('update:panel', props.panel === 'reminder' ? null : 'reminder');
}

defineExpose({
  panelEl: exposedPanelEl,
  bodyEl: exposedBodyEl
});
</script>

<style scoped>
.calendar-task-editor-tools {
  flex: 0 0 auto;
  padding: 0 6px;
}

.calendar-task-editor-body {
  flex: 0 0 auto;
}

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

.calendar-editor-color-picker {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: 6px;
}

.calendar-editor-color-option {
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 999px;
  cursor: pointer;
  justify-self: center;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06);
}

.calendar-editor-color-option:hover,
.calendar-editor-color-option.selected {
  border-color: var(--calendar-editor-color-accent, var(--pinch-color6));
  box-shadow: 0 0 0 1px var(--calendar-editor-color-accent, var(--pinch-color6));
}

.calendar-editor-repeat {
  padding-bottom: 4px;
}

.calendar-editor-repeat :deep(.repeat-frequency-select.b3-select.fn__flex-center) {
  display: block;
  height: 28px;
  min-height: 28px;
  padding: 0 30px 0 10px;
  line-height: 28px;
}

.calendar-editor-reminder-section {
  padding-bottom: 4px;
  margin-top: 10px;
}

.calendar-editor-reminder-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--b3-theme-on-background);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.calendar-editor-reminder-row:hover,
.calendar-editor-reminder-row.is-active {
  background: transparent;
}

.calendar-editor-reminder-label {
  flex-shrink: 0;
  min-width: 0;
  color: var(--b3-theme-on-surface);
  font-size: 12px;
  line-height: 1.2;
  opacity: 0.8;
}

.calendar-editor-reminder-value {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  font-size: 12px;
  line-height: 28px;
}

.calendar-editor-reminder-row:hover .calendar-editor-reminder-value,
.calendar-editor-reminder-row.is-active .calendar-editor-reminder-value {
  color: var(--b3-theme-primary);
}

.calendar-editor-reminder-pill {
  display: block;
  max-width: 100%;
  color: inherit;
  font-size: 12px;
  line-height: 28px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.calendar-editor-reminder-placeholder {
  color: inherit;
  font-size: 12px;
  line-height: 28px;
  opacity: 0.62;
}

@media (max-width: 768px) {
  .calendar-editor-color-picker {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}
</style>
