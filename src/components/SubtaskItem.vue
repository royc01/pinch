<template>
  <div class="subtask-item" :class="[subtask.completed ? 'completed' : '', `level-${level}`]">
    <div class="subtask-row">
      <div class="task-checkbox-wrapper" @click="handleClick">
        <TaskCheckbox :checked="subtask.completed" :size="18" />
      </div>
      <button type="button" class="subtask-title" @click.stop="handleOpen" v-html="subtask.title"></button>
      <div class="subtask-badges">
        <span
          v-if="priority !== 'none'"
          class="subtask-priority-badge ariaLabel"
          :class="`priority-${priority}`"
          :aria-label="priorityLabel"
        >
          <Icon name="flag" width="10" height="10" />
        </span>
        <span
          v-if="status !== 'pending' && status !== 'completed'"
          class="subtask-status-badge"
          :class="`status-${status}`"
        >
          {{ statusLabel }}
        </span>
      </div>
    </div>
    <div v-if="dueBadgeText" class="subtask-property-badges">
      <span
        class="subtask-due-badge ariaLabel"
        :class="{ 'is-overdue': isOverdue, 'is-due-soon': isDueSoon }"
        :aria-label="dueBadgeTitle"
      >
        <Icon name="calendar" width="12" height="12" />
        {{ dueBadgeText }}
      </span>
    </div>
    
    <div v-if="subtask.subtasks && subtask.subtasks.length > 0" class="subtasks-children">
      <SubTaskItem
        v-for="child in subtask.subtasks"
        :key="child.id"
        :subtask="child"
        :level="level + 1"
        :parent-task-id="parentTaskId"
        @toggle="handleChildToggle"
        @open="handleChildOpen"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import TaskCheckbox from './TaskCheckbox.vue';
import Icon from './Icon.vue';
import type { SubTask } from '../api';
import { formatTemplate, useI18n } from '@/composables/useI18n';
import { formatMonthDay } from '@/utils/dateHelpers';
import { getTaskPriorityLabel } from '@/utils/taskPriority';
import { getTaskStatusLabel } from '@/utils/taskStatus';

defineOptions({
  name: 'SubTaskItem'
});

const props = defineProps<{
  subtask: SubTask;
  level: number;
  parentTaskId: string;
}>();

const { t } = useI18n();
const priority = computed(() => props.subtask.priority || 'none');
const status = computed(() => props.subtask.status || (props.subtask.completed ? 'completed' : 'pending'));
const priorityLabel = computed(() => getTaskPriorityLabel(priority.value, t));
const statusLabel = computed(() => getTaskStatusLabel(status.value, t));
const dueTimeText = computed(() => {
  const value = typeof props.subtask.dueTime === 'string' ? props.subtask.dueTime.trim() : '';
  return /^\d{2}:\d{2}$/.test(value) ? value : '';
});
const dueDateText = computed(() => formatMonthDay(props.subtask.dueDate || ''));
const todayTimestamp = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
});
const dueDateTimestamp = computed(() => getTaskDateTimestamp(props.subtask.dueDate));
const overdueDays = computed(() => {
  if (props.subtask.completed || dueDateTimestamp.value === null) return 0;
  return Math.max(0, Math.floor((todayTimestamp.value - dueDateTimestamp.value) / (24 * 60 * 60 * 1000)));
});
const remainingDays = computed(() => {
  if (props.subtask.completed || dueDateTimestamp.value === null) return null;
  const days = Math.floor((dueDateTimestamp.value - todayTimestamp.value) / (24 * 60 * 60 * 1000));
  return days >= 0 && days <= 7 ? days : null;
});
const dueBadgeText = computed(() => {
  if (!dueDateText.value) return '';
  if (overdueDays.value > 0) return formatTemplate('personalStats.overdueDaysTemplate', { days: overdueDays.value });
  if (remainingDays.value === 0 && dueTimeText.value) return formatTemplate('taskCard.dueTodayWithTime', { time: dueTimeText.value });
  if (remainingDays.value === 0) return t('taskManager.dueToday');
  if (remainingDays.value === 1) return t('taskCard.dueTomorrow');
  if (remainingDays.value && remainingDays.value > 1) return formatTemplate('taskCard.remainingDaysTemplate', { days: remainingDays.value });
  return dueTimeText.value ? `${dueDateText.value} ${dueTimeText.value}` : dueDateText.value;
});
const dueBadgeTitle = computed(() => {
  if (!dueDateText.value) return '';
  const dueText = dueTimeText.value ? `${dueDateText.value} ${dueTimeText.value}` : dueDateText.value;
  return t('taskCard.dueDateTitleTemplate').replace('{dueText}', dueText).replace('{overdueSuffix}', '');
});
const isOverdue = computed(() => overdueDays.value > 0);
const isDueSoon = computed(() => remainingDays.value !== null);

const emit = defineEmits<{
  toggle: [taskId: string, subtask: SubTask];
  open: [taskId: string, subtask: SubTask];
}>();

function handleClick(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
  emit('toggle', props.parentTaskId, props.subtask);
}

function handleChildToggle(taskId: string, subtask: SubTask) {
  emit('toggle', taskId, subtask);
}

function handleOpen(event: MouseEvent) {
  event.preventDefault();
  emit('open', props.parentTaskId, props.subtask);
}

function handleChildOpen(taskId: string, subtask: SubTask) {
  emit('open', taskId, subtask);
}

function getTaskDateTimestamp(value: unknown): number | null {
  const rawValue = typeof value === 'string' ? value.trim() : '';
  if (!rawValue) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    const [year, month, day] = rawValue.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }
  const timestamp = Date.parse(rawValue);
  if (!Number.isFinite(timestamp)) return null;
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}
</script>

<style scoped>
.subtask-item {
  display: flex;
  flex-direction: column;
  border-radius: 6px;
  transition: background-color 0.2s;
  min-height: 24px;
  padding-top: 4px;
}

.subtask-item:hover {
  background: var(--b3-list-hover);
}

/* Let the deepest hovered subtask own the highlight. */
.subtask-item:hover:has(.subtask-item:hover) {
  background: transparent;
}

.subtask-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.subtask-badges {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.subtask-property-badges {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 26px;
}

.subtask-due-badge {
  display: flex;
  align-items: center;
  border-radius: 6px;
  font-weight: 500;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-surface);
  gap: 2px;
  padding: 1px 4px;
  font-size: 10px;
  min-height: 16px;
}

.subtask-due-badge.is-overdue {
  background: #f98f7a;
  color: var(--b3-theme-background);
}

.subtask-due-badge.is-due-soon svg {
  color: #f98f7a;
}

.subtask-priority-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 6px;
}

.subtask-priority-badge.priority-high {
  background: var(--pinch-background10);
  color: var(--pinch-font-color10);
}

.subtask-priority-badge.priority-medium {
  background: var(--pinch-background3);
  color: var(--pinch-font-color3);
}

.subtask-priority-badge.priority-low {
  background: var(--pinch-background7);
  color: var(--pinch-font-color7);
}

.subtask-status-badge {
  display: flex;
  align-items: center;
  border-radius: 6px;
  font-weight: 500;
  padding: 1px 4px;
  font-size: 10px;
  min-height: 16px;
}

.subtask-status-badge.status-in-progress {
  background: var(--pinch-background7);
  color: var(--pinch-group-color7);
}

.subtask-status-badge.status-delayed {
  background: var(--pinch-background8);
  color: var(--pinch-group-color8);
}

.subtask-status-badge.status-completed {
  background: var(--pinch-background5);
  color: var(--pinch-group-color5);
}

.subtask-status-badge.status-cancelled {
  background: var(--pinch-background1);
  color: var(--pinch-group-color1);
}

.subtask-item.level-1,
.subtask-item.level-2,
.subtask-item.level-3,
.subtask-item.level-4 {
  padding-left: 24px;
}



.subtask-title {
  flex: 1;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  font-size: 14px;
  line-height: 18px;
}

.subtasks-children {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
}

.subtask-item .task-checkbox-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  padding-top: 0;
  cursor: pointer;
  user-select: none;
}

.subtask-item .task-checkbox-wrapper :deep(.task-checkbox) {
  display: block;
}
</style>
