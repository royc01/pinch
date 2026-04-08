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
        <div
          class="task-title"
          :title="titleTooltip"
          v-html="titleHtml"
          @click="handleCardClick"
        ></div>
        <div class="task-card-actions">
          <span v-if="isPinned" class="task-pinned-indicator" title="已置顶" aria-label="已置顶">
            <svg viewBox="0 0 1024 1024" aria-hidden="true">
              <path d="M896.149659 67.771523 126.54051 67.771523c-34.758642 0-62.935378 28.176736-62.935378 62.935378 0 34.757618 28.176736 62.934355 62.935378 62.934355l769.610172 0c34.758642 0 62.935378-28.176736 62.935378-62.934355C959.085036 95.948259 930.9083 67.771523 896.149659 67.771523zM557.654294 258.83814c-1.471514-1.470491-3.016707-2.862187-4.625344-4.181229-0.713244-0.586354-1.469468-1.095961-2.202155-1.6465-0.906649-0.681522-1.797949-1.384533-2.743484-2.01796-0.884137-0.591471-1.805112-1.105171-2.713808-1.648546-0.853437-0.509606-1.689479-1.044796-2.568499-1.515516-0.928139-0.496304-1.883907-0.917906-2.832512-1.364067-0.913812-0.431835-1.811252-0.886183-2.746554-1.27504-0.924045-0.382717-1.864464-0.689708-2.800789-1.02433-1.000793-0.36225-1.989307-0.744967-3.012613-1.054005-0.938372-0.283456-1.892093-0.491187-2.837628-0.729617-1.043772-0.264013-2.071172-0.554632-3.133364-0.766456-1.094938-0.215918-2.201132-0.344854-3.305279-0.503467-0.927115-0.13303-1.840928-0.309038-2.78237-0.402159-2.059915-0.201591-4.124947-0.311085-6.192026-0.312108-0.005117 0-0.011256 0-0.016373 0l0 0c-0.299829 0-0.599657 0.037862-0.898463 0.041956-16.406668-0.231267-32.884968 5.874801-45.402049 18.391882L148.569222 577.09967c-24.576745 24.578792-24.576745 64.425312 0 89.005127 12.288884 12.289907 28.396747 18.434861 44.502563 18.434861 16.105816 0 32.213679-6.144954 44.502563-18.434861l212.633818-212.634842L450.208167 893.124254c0 34.757618 28.176736 62.934355 62.934355 62.934355 34.758642 0 62.935378-28.176736 62.935378-62.934355L576.077899 455.269951l210.836893 210.834846c12.288884 12.289907 28.395724 18.434861 44.500517 18.434861 16.10684 0 32.212656-6.144954 44.500517-18.434861 24.580838-24.579815 24.580838-64.426335 0-89.005127L557.654294 258.83814z"></path>
            </svg>
          </span>
          <span v-if="isOverdue" class="task-overdue-indicator" title="已逾期" aria-label="已逾期">已逾期</span>
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
        <span v-if="task.dueDate" class="task-due-badge">
          <Icon name="calendar" width="12" height="12" />
          {{ dueText }}
        </span>
        <span
          v-if="reminderText"
          class="task-reminder-badge"
          :title="reminderText"
        >
          <Icon name="bell" width="12" height="12" />
          {{ reminderText }}
        </span>
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
import { computed, nextTick, ref, watch } from 'vue';
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
const canExpand = computed(() => {
  if (isKanban.value) {
    return hasSubtasks.value;
  }
  return !!task.value.description || hasSubtasks.value;
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
const dueText = computed(() => (task.value.dueDate ? formatMonthDay(task.value.dueDate) : ''));
const reminderText = computed(() => getTaskReminderLabel(task.value.reminderType, task.value.reminderCustomTime));
const isPinned = computed(() => task.value.pinned === true);
const isOverdue = computed(() => {
  if (isCompleted.value) return false;
  const dueTimestamp = getTaskDateTimestamp(task.value.dueDate);
  if (dueTimestamp === null) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueTimestamp < today.getTime();
});

const groupLabel = computed(() => {
  const groupId = typeof task.value.groupId === 'string' ? task.value.groupId.trim() : '';
  if (!groupId) {
    return '';
  }
  const group = (props.taskGroups || []).find(item => item.id === groupId);
  return group?.name || '标签';
});
const groupStyle = computed<Record<string, string>>(() => {
  if (!groupLabel.value) {
    return {};
  }
  const groupId = typeof task.value.groupId === 'string' ? task.value.groupId.trim() : '';
  const group = (props.taskGroups || []).find(item => item.id === groupId);
  const rawColor = group?.color || '';
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
    dragging: isDragging.value,
    'protyle-wysiwyg': isKanban.value
  }
]);

const descriptionTextareaRef = ref<HTMLTextAreaElement | null>(null);

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

</script>

<style scoped>
.task-card {
  background: var(--b3-theme-background);
  box-shadow: #0000000f 0 1px 5px;
  transition: box-shadow 0.2s, transform 0.2s;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px;
  border-radius: 10px;
  cursor: grab;
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

.task-checkbox-wrapper {
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.task-card.priority-high .task-card-header .task-checkbox-wrapper {
  --task-checkbox-fill: var(--pinch-background10);
  --task-checkbox-border: var(--pinch-color10);
}

.task-card.priority-medium .task-card-header .task-checkbox-wrapper {
  --task-checkbox-fill: var(--pinch-background3);
  --task-checkbox-border: var(--pinch-color3);
}

.task-card.priority-low .task-card-header .task-checkbox-wrapper {
  --task-checkbox-fill: var(--pinch-background7);
  --task-checkbox-border: var(--pinch-color7);
}

.task-card.priority-none .task-card-header .task-checkbox-wrapper {
  --task-checkbox-fill: var(--b3-list-hover);
}

.task-card-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.task-overdue-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 16px;
  padding: 0 6px;
  border-radius: 999px;
  background: #f98f7a;
  color: var(--b3-theme-background);
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
  flex-shrink: 0;
}

.task-pinned-indicator {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #f98f7a;
  background: var(--b3-list-hover);
  flex-shrink: 0;
}

.task-pinned-indicator svg {
  width: 14px;
  height: 14px;
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
  flex: 1;
  min-width: 0;
  font-size: 14px;
  color: var(--b3-theme-on-background);
  line-height: 1.4;
  display: block;
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
