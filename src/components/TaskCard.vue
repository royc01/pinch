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
          <span v-if="isPinned" class="task-pinned-indicator" title="已置顶" aria-label="已置顶">
            <svg viewBox="0 0 1024 1024" aria-hidden="true">
              <path
                d="M287.008 62.016h450.016a224.992 224.992 0 0 1 224.992 224.992v450.016a224.992 224.992 0 0 1-224.992 224.992H287.008a224.992 224.992 0 0 1-224.992-224.992V287.008a224.992 224.992 0 0 1 224.992-224.992z m14.048 432.544a50.144 50.144 0 0 0 70.336 0l90.56-91.68v340.32a50.048 50.048 0 1 0 100.096 0V402.88l90.56 91.68a50.144 50.144 0 0 0 70.336 0 51.52 51.52 0 0 0-0.032-71.456l0.032 0.032-174.368-176.64a49.28 49.28 0 0 0-36.544-16.32h-0.288c-14.24 0-27.008 6.304-35.68 16.256l-0.064 0.064-174.944 176.64a51.52 51.52 0 0 0 0.032 71.456l-0.032-0.032z"
                fill="currentColor"
              />
            </svg>
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
            :title="task.priority === 'high' ? '高优先级' : task.priority === 'medium' ? '中优先级' : '低优先级'"
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
            title="跳转正文"
            aria-label="跳转正文"
            @mousedown.stop
            @click.stop.prevent="handleOpenClick"
          >
            <svg viewBox="0 0 1024 1024" aria-hidden="true">
              <path
                d="M512 426.666667a85.333333 85.333333 0 1 1 0 170.666666 85.333333 85.333333 0 0 1 0-170.666666z m341.333333 0a85.333333 85.333333 0 1 1 0 170.666666 85.333333 85.333333 0 0 1 0-170.666666zM170.666667 426.666667a85.333333 85.333333 0 1 1 0 170.666666 85.333333 85.333333 0 0 1 0-170.666666z"
                fill="#000000"
                fill-opacity=".45"
              />
            </svg>
          </button>
          <span v-if="showProgressText" class="task-progress-text">{{ progressText }}</span>
          <button
            v-if="canExpand"
            type="button"
            class="task-card-action-btn task-card-expand-btn"
            data-disable-description-contextmenu
            :class="{ expanded: isExpanded }"
            title="折叠/展开详情"
            aria-label="折叠/展开详情"
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
          placeholder="添加任务描述..."
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

      <div v-if="showBadges" class="task-badges" @click="handleCardClick">
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
          :title="`截止日期：${dueText}${isOverdue ? ' \u903E\u671F' : ''}`"
        >
          <Icon name="calendar" width="12" height="12" />
          {{ dueText }}{{ isOverdue ? ' \u903E\u671F' : '' }}
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
          <svg
            class="task-repeat-icon"
            viewBox="0 0 1024 1024"
            width="12"
            height="12"
            aria-hidden="true"
          >
            <path
              d="M867.340007 319.228555c-51.538817-51.534723-120.027677-79.890538-192.814423-79.890538H388.423497v-54.715159c0-17.449417-11.967566-23.99653-26.734898-14.519692l-131.680065 85.000929c-14.705933 9.533121-14.583137 24.802896 0.314155 34.022885l131.114177 81.201393c14.772448 9.225105 26.986631 2.430352 26.986631-15.018041v-54.524825H674.588005c116.408243 0 211.132628 94.785783 211.132628 211.133652 0 19.317974-2.552126 38.388309-7.66354 56.705489-4.550643 16.389272 5.048993 33.282011 21.438265 37.766139 2.743484 0.874927 5.481851 1.245364 8.225335 1.245364 13.459546 0 25.802666-8.971325 29.601179-22.493294 6.541997-23.743774 9.784854-48.363498 9.784854-73.163323 0-72.7847-28.355815-141.335982-79.766719-192.750979zM816.547181 734.829018l-131.052778-81.202417c-14.896268-9.218966-27.110451-2.490727-27.110451 15.020089v54.40612H349.535815c-116.41029 0-211.133651-94.723362-211.133652-211.132628 0-40.756239 11.653411-80.32749 33.653471-114.417913 9.224082-14.273075 5.106298-33.339316-9.100262-42.562374-14.273075-9.16166-33.339316-5.048993-42.500976 9.156544-28.478612 44.060495-43.561122 95.223758-43.561122 147.884118 0 72.849168 28.355815 141.27663 79.828117 192.748932 51.477418 51.538817 119.965256 79.893608 192.814424 79.893609h308.910558v54.716182c0 17.509792 12.028964 24.051789 26.734898 14.519692l131.680065-85.063351c14.705933-9.475815 14.583137-24.742521-0.314155-33.966603z"
              fill="currentColor"
            />
          </svg>
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
const repeatBadgeTitle = computed(() => '重复任务');
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
  return resolvedTaskGroup.value.name || '标签';
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
    return '\u8FDB\u884C\u4E2D';
  }
  if (task.value.status === 'delayed') {
    return '\u5EF6\u8FDF';
  }
  if (task.value.status === 'cancelled') {
    return '\u5DF2\u53D6\u6D88';
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
  if (variant.value !== 'sidebar') {
    return;
  }
  const target = event.target as HTMLElement | null;
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
