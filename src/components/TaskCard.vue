<template>
  <div
    :class="rootClasses"
    :draggable="draggable"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @contextmenu="handleContextMenu"
  >
    <div class="task-card-content">
      <div class="task-card-header">
        <div
          class="task-checkbox-wrapper"
          data-disable-description-contextmenu
          @click.stop="handleToggleStatus"
          @mousedown.stop
        >
          <TaskCheckbox :checked="isCompleted" :size="18" />
        </div>
        <div class="task-title-wrap" @click="handleCardClick">
          <span v-if="isPinned" class="task-pinned-indicator ariaLabel" :aria-label="t('taskManager.pinned')">
            <Icon name="pinTaskActive" />
          </span>
          <div
            class="task-title ariaLabel"
            :aria-label="titleAriaLabel"
            v-html="titleHtml"
          ></div>
        </div>
        <div class="task-card-actions">
          <button
            v-if="showOpenContent"
            type="button"
            class="task-card-action-btn task-card-open-content-btn ariaLabel"
            data-disable-description-contextmenu
            :aria-label="t('taskCard.openContent')"
            @mousedown.stop
            @click.stop="handleOpenContent"
          >
            <Icon name="moreHorizontal" width="14" height="14" />
          </button>
          <span
            v-if="task.priority !== 'none'"
            class="task-priority-badge ariaLabel"
            :class="`priority-${task.priority}`"
            :aria-label="priorityTitle"
          >
            <Icon name="flag" width="10" height="10" />
          </span>
          <span
            v-if="isRepeatBadgeVisible"
            class="task-repeat-badge ariaLabel"
            :aria-label="repeatBadgeTitle"
          >
            <Icon name="repeat" class="task-repeat-icon" width="12" height="12" />
          </span>
          <span v-if="showStatusBadge" class="status-badge" :class="`status-${task.status}`">
            {{ statusBadgeText }}
          </span>
          <span v-if="showProgressText" class="task-progress-text">{{ progressText }}</span>
          <button
            v-if="canExpand"
            type="button"
            class="task-card-action-btn task-card-expand-btn ariaLabel"
            data-disable-description-contextmenu
            :class="{ expanded: isExpanded }"
            :aria-label="t('taskCard.toggleDetails')"
            @mousedown.stop
            @click.stop="handleToggleExpand"
          >
            <Icon name="chevronRight" width="14" height="14" />
          </button>
        </div>
      </div>

      <div
        v-if="showDescription"
        ref="descriptionBodyRef"
        class="task-description"
        :class="{
          collapsed: isCollapsed,
          'is-editing': descriptionEditing
        }"
        @click.stop="handleDescriptionStart"
      >
        <textarea
          v-if="descriptionEditing"
          ref="descriptionTextareaRef"
          class="task-description-inline-edit"
          data-disable-description-contextmenu
          rows="3"
          :value="descriptionDraftValue"
          :placeholder="t('taskManager.addTaskDescription')"
          @click.stop
          @contextmenu.stop
          @input="handleDescriptionInput"
          @blur="handleDescriptionSave"
          @keydown.ctrl.enter.prevent="handleDescriptionSave"
          @keydown.esc.prevent="handleDescriptionCancel"
        />
        <template v-else>
          <span v-html="descriptionHtml"></span>
        </template>
      </div>

      <div v-show="showBadges" class="task-badges" @click="handleCardClick">
        <span
          v-for="group in visibleTaskTagBadges"
          :key="group.id"
          class="task-group-badge ariaLabel"
          :style="group.style"
          :aria-label="group.label"
        >
          <Icon name="group" width="12" height="12" />
          {{ group.label }}
        </span>
        <span
          v-if="overflowTaskTagCount > 0"
          class="task-group-badge task-group-badge-more ariaLabel"
          :aria-label="`+${overflowTaskTagCount}`"
        >
          +{{ overflowTaskTagCount }}
        </span>
        <span
          v-for="goal in visibleTaskGoalBadges"
          :key="`goal:${goal.id}`"
          class="task-editor-property-pill is-goal task-group-badge task-goal-badge ariaLabel"
          :aria-label="goal.label"
        >
          <EmojiIcon
            v-if="goal.emoji"
            class="task-goal-badge-emoji"
            :value="goal.emoji"
          />
          {{ goal.label }}
        </span>
        <span
          v-if="overflowTaskGoalCount > 0"
          class="task-group-badge task-group-badge-more task-goal-badge-more ariaLabel"
          :aria-label="`+${overflowTaskGoalCount}`"
        >
          +{{ overflowTaskGoalCount }}
        </span>
        <span
          v-if="task.dueDate"
          class="task-due-badge ariaLabel"
          :class="{ 'is-overdue': isOverdue, 'is-due-soon': isDueSoon }"
          :aria-label="dueBadgeTitle"
        >
          <Icon name="calendar" width="12" height="12" />
          {{ dueBadgeText }}
        </span>
        <span
          v-if="reminderText"
          class="task-reminder-badge ariaLabel"
          :aria-label="reminderText"
        >
          <Icon name="bell" width="12" height="12" />
          {{ reminderText }}
        </span>
      </div>
      <div
        v-if="showFocusProgress"
        class="task-focus-progress ariaLabel"
        :aria-label="focusProgressAriaLabel"
        @click="handleCardClick"
      >
        <button
          type="button"
          class="task-focus-progress-icon ariaLabel"
          :aria-label="t('taskManager.startFocus')"
          @click.stop="handleStartFocus"
        >
          <Icon name="timer" width="14" height="14" />
        </button>
        <div
          class="task-focus-progress-track"
          role="progressbar"
          :aria-valuemin="0"
          :aria-valuemax="100"
          :aria-valuenow="focusProgressPercent"
        >
          <span class="task-focus-progress-fill" :style="{ width: `${focusProgressFillPercent}%` }"></span>
        </div>
        <span class="task-focus-progress-value">{{ focusProgressPercent }}%</span>
      </div>
      <div
        v-if="isDocumentTitleVisible"
        class="task-document-title ariaLabel"
        :aria-label="documentTitleText"
        @click="handleCardClick"
      >
        <span class="task-document-icon" aria-hidden="true">
          <span
            v-if="documentIconSvg"
            class="task-document-icon-svg"
            v-html="documentIconSvg"
          ></span>
          <EmojiIcon
            v-else
            class="task-document-emoji-icon"
            :value="documentIconRaw"
            fallback="📄"
          />
        </span>
        <span class="task-document-title-text">{{ documentTitleText }}</span>
      </div>

      <div
        v-if="showSubtasks"
        class="task-subtasks"
        data-disable-description-contextmenu
        :class="{ collapsed: isCollapsed }"
      >
        <SubtaskItem
          v-for="subtask in task.subtasks || []"
          :key="subtask.id"
          :subtask="subtask"
          :level="1"
          :parent-task-id="task.id"
          @toggle="(_taskId, child) => handleSubtaskToggle(child)"
        />
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import type { Task, SubTask, TaskGroup } from '@/api';
import Icon from '@/components/Icon.vue';
import EmojiIcon from '@/components/EmojiIcon.vue';
import TaskCheckbox from '@/components/TaskCheckbox.vue';
import SubtaskItem from '@/components/SubtaskItem.vue';
import { useI18n } from '@/composables/useI18n';
import { formatMonthDay } from '@/utils/dateHelpers';
import { sanitizeTaskHtml, sanitizeTaskTitleHtml } from '@/utils/taskHtml';
import { getTaskPriorityLabel } from '@/utils/taskPriority';
import { getTaskStatusLabel } from '@/utils/taskStatus';
import { resolveGroupColorCss, resolveGroupColorLayerCss, resolveGroupTextColor } from '@/utils/groupColor';
import { getTaskReminderLabel } from '@/utils/taskReminder';
import { resolveTaskTagIds } from '@/utils/taskTags';
import { stripHtml } from '@/composables/useTaskCommon';
import type { Goal } from '@/goalRepository';
import { getEffectiveGoalIdsForTask } from '@/utils/goalTaskMembership';
import { useTaskFocusProgress } from '@/composables/useTaskFocusProgress';

defineOptions({
  name: 'TaskCard'
});

const { t } = useI18n();
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const DUE_SOON_DAY_LIMIT = 7;

const props = defineProps<{
  task: Task;
  taskGroups?: TaskGroup[];
  goals?: Goal[];
  selectedGoalIds?: string[];
  variant?: 'sidebar' | 'kanban';
  showStatusBadge?: boolean;
  draggable?: boolean;
  dragging?: boolean;
  completed?: boolean;
  expanded?: boolean;
  descriptionEditing?: boolean;
  descriptionDraft?: string;
  showDescription?: boolean;
  showBadges?: boolean;
  showSubtasks?: boolean;
  titleTooltip?: string;
  showDocumentTitle?: boolean;
  showOpenContent?: boolean;
  documentTitleOverride?: string;
  documentIconOverride?: string;
  documentIconSvg?: string;
  disableContextMenu?: boolean;
  disableDescriptionContextMenu?: boolean;
}>();

const emit = defineEmits<{
  cardClick: [task: Task, event?: MouseEvent];
  openContent: [task: Task];
  startFocus: [task: Task];
  toggleExpand: [task: Task];
  toggleStatus: [task: Task];
  descriptionStartEdit: [task: Task];
  descriptionInput: [taskId: string, event: Event];
  descriptionSave: [task: Task];
  descriptionCancel: [taskId: string];
  subtaskToggle: [task: Task, subtask: SubTask];
  dragstart: [event: DragEvent, task: Task];
  dragend: [event: DragEvent, task: Task];
}>();

const variant = computed(() => props.variant ?? 'sidebar');
const isKanban = computed(() => variant.value === 'kanban');
const task = computed(() => props.task);
const showOpenContent = computed(() => props.showOpenContent === true);
const { actualFocus } = useTaskFocusProgress(task);
const isCompleted = computed(() => props.completed ?? task.value.status === 'completed');
const isExpanded = computed(() => !!props.expanded);
const isDragging = computed(() => !!props.dragging);
const hasSubtasks = computed(() => (task.value.subtasks?.length ?? 0) > 0);
const descriptionCanExpand = ref(false);
const canExpand = computed(() => {
  if (isKanban.value) {
    return hasSubtasks.value;
  }
  return hasSubtasks.value || descriptionCanExpand.value;
});
const showDescription = computed(() => {
  const hasDescription = typeof task.value.description === 'string' && task.value.description.trim().length > 0;
  if (props.showDescription === false) return false;
  if (props.descriptionEditing) return true;
  if (props.showDescription !== undefined) {
    return props.showDescription && hasDescription;
  }
  return hasDescription;
});
const showSubtasks = computed(() => {
  if (props.showSubtasks !== undefined) {
    return props.showSubtasks;
  }
  if (!hasSubtasks.value) return false;
  if (variant.value === 'kanban') return true;
  return !!props.expanded;
});
const isCollapsed = computed(() => {
  if (props.descriptionEditing) {
    return false;
  }
  if (isKanban.value) {
    return hasSubtasks.value && !isExpanded.value;
  }
  return !isExpanded.value;
});

const titleHtml = computed(() => sanitizeTaskTitleHtml(task.value.title));
const titleAriaLabel = computed(() => {
  if (variant.value === 'sidebar') {
    const parts = [props.titleTooltip || ''];
    if (!props.disableDescriptionContextMenu) {
      parts.push(t('taskCard.rightClickFillDescription'));
    }
    parts.push(t('taskCard.dragToCalendar'));
    return parts.filter(Boolean).join('<br>');
  }
  return stripHtml(titleHtml.value).replace(/\s+/g, ' ').trim();
});
const descriptionHtml = computed(() => sanitizeTaskHtml(task.value.description || ''));
const descriptionDraftValue = computed(() => props.descriptionDraft ?? task.value.description ?? '');
const priorityTitle = computed(() => getTaskPriorityLabel(task.value.priority, t));
const dueTimeText = computed(() => {
  const rawDueTime = typeof task.value.dueTime === 'string' ? task.value.dueTime.trim() : '';
  return /^\d{2}:\d{2}$/.test(rawDueTime) ? rawDueTime : '';
});
const dueDateText = computed(() => {
  if (!task.value.dueDate) {
    return '';
  }
  const dateText = formatMonthDay(task.value.dueDate);
  if (!dateText) {
    return '';
  }
  return dateText;
});
const dueText = computed(() => {
  if (!dueDateText.value) {
    return '';
  }
  return dueTimeText.value ? `${dueDateText.value} ${dueTimeText.value}` : dueDateText.value;
});
const formatTemplate = (key: string, values: Record<string, string | number>): string => {
  return Object.entries(values).reduce(
    (result, [name, value]) => result.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value)),
    t(key)
  );
};
const dueDateTimestamp = computed(() => getTaskDateTimestamp(task.value.dueDate));
const todayTimestamp = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
});
const overdueDays = computed(() => {
  if (isCompleted.value) return 0;
  const dueTimestamp = dueDateTimestamp.value;
  if (dueTimestamp === null) return 0;
  return Math.max(0, Math.floor((todayTimestamp.value - dueTimestamp) / MILLISECONDS_PER_DAY));
});
const overdueDaysText = computed(() => {
  if (overdueDays.value <= 0) {
    return '';
  }
  return formatTemplate('personalStats.overdueDaysTemplate', { days: overdueDays.value });
});
const remainingDays = computed(() => {
  if (isCompleted.value) return null;
  const dueTimestamp = dueDateTimestamp.value;
  if (dueTimestamp === null) return null;
  const days = Math.floor((dueTimestamp - todayTimestamp.value) / MILLISECONDS_PER_DAY);
  return days >= 0 && days <= DUE_SOON_DAY_LIMIT ? days : null;
});
const remainingDaysText = computed(() => {
  if (remainingDays.value === null) {
    return '';
  }
  if (remainingDays.value === 0) {
    return t('taskManager.dueToday');
  }
  if (remainingDays.value === 1) {
    return t('taskCard.dueTomorrow');
  }
  return formatTemplate('taskCard.remainingDaysTemplate', { days: remainingDays.value });
});
const reminderText = computed(() => getTaskReminderLabel(task.value.reminderType, task.value.reminderCustomTime));
const isPinned = computed(() => task.value.pinned === true);
const dueBadgeText = computed(() => {
  if (!dueDateText.value) {
    return '';
  }
  if (overdueDaysText.value) {
    return overdueDaysText.value;
  }
  if (remainingDays.value === 0 && dueTimeText.value) {
    return formatTemplate('taskCard.dueTodayWithTime', { time: dueTimeText.value });
  }
  if (remainingDaysText.value) {
    return remainingDaysText.value;
  }
  return dueText.value;
});
const dueBadgeTitle = computed(() => {
  if (!dueDateText.value) {
    return '';
  }
  const titleDateText = overdueDaysText.value ? dueDateText.value : dueText.value;
  const dueBadgeSuffix = overdueDaysText.value || remainingDaysText.value;
  return t('taskCard.dueDateTitleTemplate')
    .replace('{dueText}', titleDateText)
    .replace('{overdueSuffix}', dueBadgeSuffix ? ` ${dueBadgeSuffix}` : '');
});
const documentTitleText = computed(() => {
  const overrideTitle = typeof props.documentTitleOverride === 'string' ? props.documentTitleOverride.trim() : '';
  if (overrideTitle) {
    return overrideTitle;
  }
  const rawPath = typeof task.value.hPath === 'string' ? task.value.hPath.trim() : '';
  if (!rawPath) {
    return '';
  }
  const normalizedPath = rawPath.replace(/\/+$/, '');
  if (!normalizedPath) {
    return '';
  }
  const parts = normalizedPath.split('/').filter(part => part.length > 0);
  return parts[parts.length - 1] || normalizedPath;
});
const documentIconRaw = computed(() => {
  const overrideIcon = typeof props.documentIconOverride === 'string' ? props.documentIconOverride.trim() : '';
  if (overrideIcon) {
    return overrideIcon;
  }
  const rawIcon = typeof task.value.icon === 'string' ? task.value.icon.trim() : '';
  return rawIcon;
});
const documentIconSvg = computed(() => {
  const rawSvg = typeof props.documentIconSvg === 'string' ? props.documentIconSvg.trim() : '';
  return rawSvg.startsWith('<svg') ? rawSvg : '';
});
const isDocumentTitleVisible = computed(() => (
  props.showDocumentTitle === true
  && documentTitleText.value.length > 0
));
const isRepeatBadgeVisible = computed(() => (
  !!task.value.repeatSeriesId
  || (!!task.value.repeatFrequency && task.value.repeatFrequency !== 'none')
  || !!task.value.isVirtual
));
const repeatBadgeTitle = computed(() => t('taskCard.repeatTask'));
const isOverdue = computed(() => overdueDays.value > 0);
const isDueSoon = computed(() => remainingDays.value !== null && remainingDays.value <= DUE_SOON_DAY_LIMIT);

const resolvedTaskTagBadges = computed(() => (
  resolveTaskTagIds(task.value.tags, task.value.groupId)
    .flatMap((tagId) => {
      const group = (props.taskGroups || []).find(item => item.id === tagId);
      // A removed or otherwise unknown tag ID can remain in historical task
      // attributes. It is not a usable tag, so do not render a generic badge.
      if (!group) {
        return [];
      }
      const rawColor = group.color || '';
      return [{
        id: tagId,
        label: group.name || t('taskManager.tags'),
        style: rawColor ? {
          background: resolveGroupColorCss(rawColor),
          borderColor: resolveGroupColorLayerCss(rawColor),
          color: resolveGroupTextColor(rawColor)
        } : {}
      }];
    })
));
const visibleTaskTagBadges = computed(() => resolvedTaskTagBadges.value.slice(0, 2));
const overflowTaskTagCount = computed(() => Math.max(0, resolvedTaskTagBadges.value.length - visibleTaskTagBadges.value.length));
const resolvedTaskGoalBadges = computed(() => {
  const externalGoalIds = Array.isArray(props.selectedGoalIds)
    ? props.selectedGoalIds.filter(goalId => typeof goalId === 'string' && goalId.trim().length > 0)
    : [];
  const selectedGoalIds = new Set(
    externalGoalIds.length > 0
      ? externalGoalIds
      : getEffectiveGoalIdsForTask(props.goals || [], task.value)
  );
  return (props.goals || [])
    .filter(goal => selectedGoalIds.has(goal.id))
    .map(goal => ({
      id: goal.id,
      label: goal.name || t('taskManager.untitledGoal'),
      emoji: goal.emoji?.trim() || '\uD83C\uDFAF'
    }));
});
const visibleTaskGoalBadges = computed(() => resolvedTaskGoalBadges.value.slice(0, 2));
const overflowTaskGoalCount = computed(() => Math.max(0, resolvedTaskGoalBadges.value.length - visibleTaskGoalBadges.value.length));

const statusBadgeText = computed(() => {
  if (props.showStatusBadge !== true) {
    return '';
  }
  if (['in-progress', 'delayed', 'cancelled'].includes(task.value.status)) {
    return getTaskStatusLabel(task.value.status, t);
  }
  return '';
});
const showStatusBadge = computed(() => statusBadgeText.value.length > 0);

const showProgressText = computed(() => hasSubtasks.value);
const showBadges = computed(() => {
  if (props.showBadges === false) {
    return false;
  }
  const due = !!task.value.dueDate;
  return due
    || !!reminderText.value
    || resolvedTaskTagBadges.value.length > 0
    || resolvedTaskGoalBadges.value.length > 0
    || isRepeatBadgeVisible.value;
});
const focusEstimate = computed(() => task.value.focusEstimate);
const focusProgressActual = computed(() => (
  focusEstimate.value?.unit === 'pomodoros'
    ? actualFocus.value.sessions
    : actualFocus.value.minutes
));
const focusProgressPercent = computed(() => {
  const estimate = focusEstimate.value?.value || 0;
  if (estimate <= 0) return 0;
  return Math.round((focusProgressActual.value / estimate) * 100);
});
const focusProgressFillPercent = computed(() => Math.min(100, Math.max(0, focusProgressPercent.value)));
const focusProgressActualText = computed(() => {
  const unit = focusEstimate.value?.unit;
  return unit === 'pomodoros'
    ? `${focusProgressActual.value} ${t('taskManager.focusPomodoroUnit')}`
    : `${Math.round(focusProgressActual.value)} ${t('focusTimer.minuteSuffix')}`;
});
const focusProgressEstimateText = computed(() => {
  const estimate = focusEstimate.value;
  if (!estimate) return '';
  return estimate.unit === 'pomodoros'
    ? `${estimate.value} ${t('taskManager.focusPomodoroUnit')}`
    : `${estimate.value} ${t('focusTimer.minuteSuffix')}`;
});
const focusProgressAriaLabel = computed(() => formatTemplate('taskManager.focusProgressTemplate', {
  actual: focusProgressActualText.value,
  estimate: focusProgressEstimateText.value,
  progress: focusProgressPercent.value
}));
const showFocusProgress = computed(() => props.showBadges !== false && !!focusEstimate.value);

const subtaskStats = computed(() => countSubtasks(task.value.subtasks));
const progressText = computed(() => {
  if (!hasSubtasks.value) return '';
  return `${subtaskStats.value.completed}/${subtaskStats.value.total}`;
});

const rootClasses = computed(() => [
  'task-card',
  `variant-${variant.value}`,
  isKanban.value ? 'kanban-task-card' : 'task-item',
  `status-${task.value.status}`,
  `priority-${task.value.priority}`,
  {
    'task-completed': isCompleted.value,
    'is-pinned': isPinned.value,
    dragging: isDragging.value,
    'protyle-wysiwyg': isKanban.value
  }
]);

const descriptionTextareaRef = ref<HTMLTextAreaElement | null>(null);
const descriptionBodyRef = ref<HTMLElement | null>(null);
let descriptionResizeObserver: ResizeObserver | null = null;

watch(
  () => props.descriptionEditing,
  (isEditing) => {
    if (!isEditing) return;
    void nextTick(() => {
      const textarea = descriptionTextareaRef.value;
      if (!textarea) return;
      textarea.focus();
      const length = textarea.value.length;
      textarea.setSelectionRange(length, length);
    });
  }
);

watch(
  [variant, showDescription, () => props.descriptionEditing, () => task.value.description, () => props.expanded],
  () => {
    scheduleDescriptionExpandabilityMeasure();
  },
  { immediate: true }
);

watch(descriptionBodyRef, (el) => {
  disconnectDescriptionResizeObserver();
  if (typeof ResizeObserver !== 'undefined' && el) {
    descriptionResizeObserver = new ResizeObserver(() => {
      updateDescriptionExpandability();
    });
    descriptionResizeObserver.observe(el);
  }
  scheduleDescriptionExpandabilityMeasure();
});

onUnmounted(() => {
  disconnectDescriptionResizeObserver();
});

function disconnectDescriptionResizeObserver(): void {
  descriptionResizeObserver?.disconnect();
  descriptionResizeObserver = null;
}

function scheduleDescriptionExpandabilityMeasure(): void {
  void nextTick(() => {
    updateDescriptionExpandability();
  });
}

function updateDescriptionExpandability(): void {
  if (variant.value !== 'sidebar' || !showDescription.value) {
    descriptionCanExpand.value = false;
    return;
  }
  if (props.descriptionEditing) {
    return;
  }
  const descriptionEl = descriptionBodyRef.value;
  if (!descriptionEl) {
    descriptionCanExpand.value = false;
    return;
  }

  const computedStyle = window.getComputedStyle(descriptionEl);
  const parsedLineHeight = Number.parseFloat(computedStyle.lineHeight);
  const parsedFontSize = Number.parseFloat(computedStyle.fontSize);
  const lineHeight = Number.isFinite(parsedLineHeight)
    ? parsedLineHeight
    : (Number.isFinite(parsedFontSize) ? parsedFontSize * 1.5 : 19.5);
  const collapsedHeight = lineHeight + 1;
  descriptionCanExpand.value = descriptionEl.scrollHeight > collapsedHeight;
}

function handleCardClick(event: MouseEvent) {
  emit('cardClick', task.value, event);
}

function handleOpenContent() {
  emit('openContent', task.value);
}

function handleStartFocus() {
  emit('startFocus', task.value);
}

function handleToggleExpand() {
  emit('toggleExpand', task.value);
}

function handleToggleStatus() {
  emit('toggleStatus', task.value);
}

function handleDescriptionStart() {
  emit('descriptionStartEdit', task.value);
}

function handleDescriptionInput(event: Event) {
  emit('descriptionInput', task.value.id, event);
}

function handleDescriptionSave() {
  emit('descriptionSave', task.value);
}

function handleDescriptionCancel() {
  emit('descriptionCancel', task.value.id);
}

function handleContextMenu(event: MouseEvent) {
  if (props.disableContextMenu) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  if (props.disableDescriptionContextMenu || variant.value !== 'sidebar') {
    return;
  }
  const target = event.target instanceof Element
    ? event.target
    : (event.target instanceof Node ? event.target.parentElement : null);
  if (target?.closest('[data-disable-description-contextmenu]')) {
    return;
  }
  event.preventDefault();
  emit('descriptionStartEdit', task.value);
}

function handleSubtaskToggle(subtask: SubTask) {
  emit('subtaskToggle', task.value, subtask);
}

function handleDragStart(event: DragEvent) {
  if (!props.draggable) return;
  emit('dragstart', event, task.value);
}

function handleDragEnd(event: DragEvent) {
  emit('dragend', event, task.value);
}

function countSubtasks(subtasks: Task['subtasks']): { total: number; completed: number } {
  if (!subtasks || subtasks.length === 0) return { total: 0, completed: 0 };

  let total = 0;
  let completed = 0;
  const stack: SubTask[][] = [subtasks];

  while (stack.length > 0) {
    const currentSubtasks = stack.pop()!;

    for (const subtask of currentSubtasks) {
      total++;
      if (subtask.completed) completed++;

      if (subtask.subtasks && subtask.subtasks.length > 0) {
        stack.push(subtask.subtasks);
      }
    }
  }

  return { total, completed };
}

function getTaskDateTimestamp(value: unknown): number | null {
  const rawValue = typeof value === 'string' ? value.trim() : '';
  if (!rawValue) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    const [year, month, day] = rawValue.split('-').map(part => Number(part));
    const parsedDate = new Date(year, month - 1, day);
    parsedDate.setHours(0, 0, 0, 0);
    return parsedDate.getTime();
  }

  const parsedTimestamp = Date.parse(rawValue);
  if (!Number.isFinite(parsedTimestamp)) {
    return null;
  }
  const parsedDate = new Date(parsedTimestamp);
  parsedDate.setHours(0, 0, 0, 0);
  return parsedDate.getTime();
}

</script>

<style scoped>
.task-card {
  background: var(--b3-theme-background);
  box-shadow: var(--pinch-shadow);
  transition: box-shadow 0.2s, transform 0.2s;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 7px 8px;
  border-radius: 10px;
  cursor: grab;
  position: relative;
}

.task-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.task-card.variant-kanban {
  width: 100%;
}

.task-card[draggable="true"]:active {
  cursor: grabbing;
}

.task-card.dragging {
  opacity: 0.85;
  transform: rotate(2deg);
}

.task-card-content {
  flex: 1;
  min-width: 0;
  cursor: pointer;
  width: 100%;
}

.task-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.task-title-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 2px;
}

.task-checkbox-wrapper {
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.task-card-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.task-priority-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 6px;
  flex-shrink: 0;
}

.task-pinned-indicator {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #ffcc4d;
}

.task-pinned-indicator svg {
  width: 100%;
  height: 100%;
  display: block;
  fill: currentColor;
}

.task-card-action-btn {
  border: none;
  background: transparent;
  padding: 0;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--b3-theme-on-background);
  cursor: pointer;
  opacity: 0.35;
  transition: opacity 0.2s, background-color 0.2s, transform 0.2s;
}

.task-card:hover .task-card-action-btn {
  opacity: 1;
}

.task-card-action-btn:hover {
  background: var(--b3-list-hover);
}

.task-card-expand-btn svg {
  transition: transform 0.2s;
}

.task-card-expand-btn.expanded svg {
  transform: rotate(90deg);
}

.task-title {
  font-size: 14px;
  color: var(--b3-theme-on-background);
  line-height: 1.6;
  display: block;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-title :deep(*) {
  display: inline;
  white-space: nowrap;
}

.task-title :deep([data-type~="a"]) {
  border-bottom: 1px solid var(--b3-theme-on-background);
}

.task-title :deep(br) {
  display: none;
}

.task-badges {
  display: flex;
  gap: 3px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 6px;
  margin-left: 26px;
}

.task-focus-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 7px 0 0 26px;
  color: var(--b3-theme-on-surface);
}

.task-focus-progress-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  flex: 0 0 auto;
  color: var(--b3-theme-on-background);
}

.task-focus-progress-icon:hover {
  background: var(--b3-list-hover);
}

.task-focus-progress-track {
  height: 7px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  border-radius: 999px;
  background: var(--b3-list-hover);
}

.task-focus-progress-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #f98f7a;
  transition: width 0.2s ease;
}

.task-focus-progress-value {
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: var(--b3-theme-on-background);
}

.task-document-title {
  margin-top: 4px;
  margin-left: 26px;
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  font-size: 11px;
  line-height: 1.3;
  color: var(--b3-theme-on-surface);
  opacity: 0.72;
}

.task-document-icon {
  flex: 0 0 auto;
  font-size: 12px;
  line-height: 1;
}

.task-document-emoji-icon {
  width: 12px;
  height: 12px;
  font-size: 12px;
}

.task-document-icon-svg {
  width: 12px;
  height: 12px;
  display: block;
  color: currentColor;
}

.task-document-icon-svg :deep(svg) {
  width: 12px;
  height: 12px;
  display: block;
  fill: currentColor;
}

.task-document-icon-svg :deep(path) {
  fill: currentColor;
}

.task-document-title-text {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-description {
  font-size: 13px;
  line-height: 1.5;
  color: var(--b3-theme-on-surface);
  opacity: 0.6;
  word-break: break-word;
  margin-left: 26px;
  padding: 0;
  background: transparent;
  border-radius: 0;
  border-left: none;
  cursor: text;
  transition: box-shadow 0.2s;
}

.task-description:hover {
  box-shadow: none;
}

.task-description.is-editing {
  opacity: 1;
  padding: 0;
  box-shadow: none;
}

.task-description-inline-edit {
  width: 100%;
  min-height: 72px;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--b3-theme-on-surface);
  font-size: 13px;
  line-height: 1.5;
  resize: vertical;
  box-sizing: border-box;
  outline: none;
}

.task-description-inline-edit:focus {
  background: transparent;
  box-shadow: inset 0 0 0 1px var(--b3-theme-primary);
}

.task-description.collapsed {
  max-height: 4.5em;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.task-card.variant-sidebar .task-description.collapsed {
  max-height: 1.5em;
  -webkit-line-clamp: 1;
}

.task-subtasks {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 6px 0;
}

.task-subtasks.collapsed {
  display: none;
}


.task-due-badge,
.task-reminder-badge {
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

.status-badge {
  display: flex;
  align-items: center;
  border-radius: 6px;
  font-weight: 500;
  gap: 2px;
  padding: 1px 4px;
  font-size: 10px;
  min-height: 16px;
}

.status-badge.status-in-progress {
  background: var(--pinch-background7);
  color: var(--pinch-group-color7);
}

.status-badge.status-delayed {
  background: var(--pinch-background8);
  color: var(--pinch-group-color8);
}

.status-badge.status-completed {
  background: var(--pinch-background5);
  color: var(--pinch-group-color5);
}

.status-badge.status-cancelled {
  background: var(--pinch-background1);
  color: var(--pinch-group-color1);
}

.task-due-badge.is-overdue {
  background: #f98f7a;
  color: var(--b3-theme-background);
}

.task-due-badge.is-due-soon svg{
  color: #f98f7a;
}

.task-repeat-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-weight: 500;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-surface);
  padding: 2px;
  line-height: 0;
  height: 14px;
  width: 14px;
}

.task-repeat-icon {
  display: block;
}

.task-group-badge {
  display: flex;
  align-items: center;
  border-radius: 6px;
  font-weight: 500;
  background: var(--b3-list-hover);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  gap: 2px;
  padding: 1px 4px;
  font-size: 10px;
  max-width: 120px;
  min-height: 16px;
}

.task-group-badge-more {
  justify-content: center;
}

.task-goal-badge {
  background: var(--pinch-background6);
  color: var(--b3-theme-on-background);
}

.task-editor-property-pill.is-goal.task-goal-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.task-goal-badge-emoji {
  flex: 0 0 auto;
  font-size: 11px;
  line-height: 1;
}

.task-goal-badge-more {
  color: var(--b3-theme-primary);
}

.task-progress-text {
  font-size: 10px;
  color: var(--b3-theme-on-surface);
  margin-right: 2px;
  white-space: nowrap;
}
</style>
