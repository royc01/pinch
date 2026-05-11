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
          <span v-if="isPinned" class="task-pinned-indicator" :title="t('pinned')" :aria-label="t('pinned')">
            <Icon name="pinBadge" />
          </span>
          <div
            class="task-title"
            :title="titleTooltip"
            v-html="titleHtml"
          ></div>
        </div>
        <div class="task-card-actions">
          <span
            v-if="task.priority !== 'none'"
            class="task-priority-badge"
            :class="`priority-${task.priority}`"
            :title="task.priority === 'high' ? t('priorityHigh') : task.priority === 'medium' ? t('priorityMedium') : t('priorityLow')"
          >
            <Icon name="flag" width="10" height="10" />
          </span>
          <span v-if="showStatusBadge" class="status-badge" :class="`status-${task.status}`">
            {{ statusBadgeText }}
          </span>
          <button
            type="button"
            class="task-card-action-btn task-card-open-btn"
            data-disable-description-contextmenu
            :title="t('jumpToContent')"
            :aria-label="t('jumpToContent')"
            @mousedown.stop
            @click.stop.prevent="handleOpenClick"
          >
            <Icon name="moreHorizontal" width="14" height="14" />
          </button>
          <span v-if="showProgressText" class="task-progress-text">{{ progressText }}</span>
          <button
            v-if="canExpand"
            type="button"
            class="task-card-action-btn task-card-expand-btn"
            data-disable-description-contextmenu
            :class="{ expanded: isExpanded }"
            :title="t('foldUnfoldDetails')"
            :aria-label="t('foldUnfoldDetails')"
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
          :placeholder="t('addDescription')"
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
          v-if="groupLabel"
          class="task-group-badge"
          :style="groupStyle"
          :title="groupLabel"
        >
          <Icon name="group" width="12" height="12" />
          {{ groupLabel }}
        </span>
        <span
          v-if="task.dueDate"
          class="task-due-badge"
          :class="{ 'is-overdue': isOverdue }"
          :title="t('dueDateWithStatus', { date: dueText, status: isOverdue ? t('statusOverdue') : '' })"
        >
          <Icon name="calendar" width="12" height="12" />
          {{ dueText }}<span v-if="isOverdue"> {{ t('statusOverdue') }}</span>
        </span>
        <span
          v-if="reminderText"
          class="task-reminder-badge"
          :title="reminderText"
        >
          <Icon name="bell" width="12" height="12" />
          {{ reminderText }}
        </span>
        <span
          v-if="isRepeatBadgeVisible"
          class="task-repeat-badge"
          :title="repeatBadgeTitle"
        >
          <Icon name="repeat" class="task-repeat-icon" width="12" height="12" />
        </span>
      </div>
      <div
        v-if="isDocumentTitleVisible"
        class="task-document-title"
        :title="documentTitleText"
        @click="handleCardClick"
      >
        <span class="task-document-icon" aria-hidden="true">
          <img
            v-if="documentIconImageSrc"
            class="task-document-icon-image"
            :src="documentIconImageSrc"
            alt=""
            loading="lazy"
            decoding="async"
          />
          <span v-else>{{ documentIconText }}</span>
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
import { t } from '@/utils/i18n';
import type { Task, SubTask, TaskGroup } from '@/api';
import Icon from '@/components/Icon.vue';
import TaskCheckbox from '@/components/TaskCheckbox.vue';
import SubtaskItem from '@/components/SubtaskItem.vue';
import { formatMonthDay } from '@/utils/dateHelpers';
import { sanitizeTaskHtml, sanitizeTaskTitleHtml } from '@/utils/taskHtml';
import { resolveGroupColorCss, resolveGroupTextColor } from '@/utils/groupColor';
import { getTaskReminderLabel } from '@/utils/taskReminder';

defineOptions({
  name: 'TaskCard'
});

const props = defineProps<{
  task: Task;
  taskGroups?: TaskGroup[];
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
  documentIconOverride?: string;
  disableContextMenu?: boolean;
}>();

const emit = defineEmits<{
  cardClick: [task: Task, event?: MouseEvent];
  openClick: [task: Task, event?: MouseEvent];
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

const titleTooltip = computed(() => props.titleTooltip || '');
const titleHtml = computed(() => sanitizeTaskTitleHtml(task.value.title));
const descriptionHtml = computed(() => sanitizeTaskHtml(task.value.description || ''));
const descriptionDraftValue = computed(() => props.descriptionDraft ?? task.value.description ?? '');
const dueTimeText = computed(() => {
  const rawDueTime = typeof task.value.dueTime === 'string' ? task.value.dueTime.trim() : '';
  return /^\d{2}:\d{2}$/.test(rawDueTime) ? rawDueTime : '';
});
const dueText = computed(() => {
  if (!task.value.dueDate) {
    return '';
  }
  const dateText = formatMonthDay(task.value.dueDate);
  if (!dateText) {
    return '';
  }
  return dueTimeText.value ? `${dateText} ${dueTimeText.value}` : dateText;
});
const reminderText = computed(() => getTaskReminderLabel(task.value.reminderType, task.value.reminderCustomTime));
const isPinned = computed(() => task.value.pinned === true);
const documentTitleText = computed(() => {
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
const documentIconImageSrc = computed(() => resolveTaskDocumentIconImageSrc(documentIconRaw.value));
const documentIconText = computed(() => {
  if (documentIconImageSrc.value) {
    return '';
  }
  return documentIconRaw.value || '\uD83D\uDCC4';
});
const isDocumentTitleVisible = computed(() => (
  props.showDocumentTitle === true
  && isKanban.value
  && documentTitleText.value.length > 0
));
const isRepeatBadgeVisible = computed(() => (
  !!task.value.repeatSeriesId
  || (!!task.value.repeatFrequency && task.value.repeatFrequency !== 'none')
  || !!task.value.isVirtual
));
const repeatBadgeTitle = computed(() => t('recurringTask'));
const isOverdue = computed(() => {
  if (isCompleted.value) return false;
  const dueTimestamp = getTaskDateTimestamp(task.value.dueDate);
  if (dueTimestamp === null) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueTimestamp < today.getTime();
});

const resolvedTaskGroup = computed(() => {
  const groupId = typeof task.value.groupId === 'string' ? task.value.groupId.trim() : '';
  if (!groupId) {
    return null;
  }
  return (props.taskGroups || []).find(item => item.id === groupId) || null;
});
const groupLabel = computed(() => {
  if (!resolvedTaskGroup.value) {
    return '';
  }
  return resolvedTaskGroup.value.name || t('label');
});
const groupStyle = computed<Record<string, string>>(() => {
  if (!groupLabel.value) {
    return {};
  }
  const rawColor = resolvedTaskGroup.value?.color || '';
  if (!rawColor) {
    return {};
  }
  const cssColor = resolveGroupColorCss(rawColor);
  return {
    backgroundColor: cssColor,
    borderColor: cssColor,
    color: resolveGroupTextColor(rawColor)
  };
});

const statusBadgeText = computed(() => {
  if (props.showStatusBadge !== true) {
    return '';
  }
  if (task.value.status === 'in-progress') {
    return t('statusInProgress');
  }
  if (task.value.status === 'delayed') {
    return t('statusDelayed');
  }
  if (task.value.status === 'cancelled') {
    return t('statusCancelled');
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
  return due || !!reminderText.value || !!groupLabel.value;
});

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

function handleOpenClick(event: MouseEvent) {
  emit('openClick', task.value, event);
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
  if (variant.value !== 'sidebar') {
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

function resolveTaskDocumentIconImageSrc(rawIcon: string): string {
  if (!rawIcon) {
    return '';
  }

  const decoded = rawIcon.replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim();
  const urlMatch = decoded.match(/^(?:background-image\s*:\s*)?url\((.+)\)\s*;?$/i);
  const candidate = (urlMatch ? urlMatch[1] : decoded).trim().replace(/^['"]+|['"]+$/g, '');
  if (!candidate) {
    return '';
  }

  if (
    /^(?:https?:\/\/|\/|data:image\/|assets\/|\.{1,2}\/)/i.test(candidate)
    || /\.(?:png|svg|jpe?g|gif|webp)(?:[?#].*)?$/i.test(candidate)
  ) {
    return candidate;
  }

  return '';
}

</script>

<style scoped>
.task-card {
  background: var(--b3-theme-background);
  box-shadow: #0000000f 0 1px 5px;
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

.task-priority-badge.priority-high {
  background: var(--pinch-background10);
  color: var(--pinch-font-color10);
}

.task-priority-badge.priority-medium {
  background: var(--pinch-background3);
  color: var(--pinch-font-color3);
}

.task-priority-badge.priority-low {
  background: var(--pinch-background7);
  color: var(--pinch-font-color7);
}

.task-pinned-indicator {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #f98f7a;
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

.task-card-open-btn svg {
  width: 14px;
  height: 14px;
  fill: currentColor;
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
  line-height: 1.4;
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

.task-document-icon-image {
  width: 12px;
  height: 12px;
  display: block;
  object-fit: cover;
  border-radius: 2px;
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
  border-radius: 4px;
  font-weight: 500;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-surface);
  gap: 2px;
  padding: 2px 4px;
  font-size: 10px;
}

.status-badge {
  display: flex;
  align-items: center;
  border-radius: 4px;
  font-weight: 500;
  gap: 2px;
  padding: 2px 4px;
  font-size: 10px;
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

.task-repeat-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-weight: 500;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-surface);
  padding: 2px;
  line-height: 0;
}

.task-repeat-icon {
  display: block;
}

.task-group-badge {
  display: flex;
  align-items: center;
  border-radius: 4px;
  font-weight: 500;
  background: var(--b3-list-hover);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  gap: 2px;
  padding: 2px 4px;
  font-size: 10px;
  max-width: 120px;
}

.task-progress-text {
  font-size: 10px;
  color: var(--b3-theme-on-surface);
  margin-right: 2px;
  white-space: nowrap;
}
</style>
