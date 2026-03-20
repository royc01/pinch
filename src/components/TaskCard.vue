<template>
  <div
    :class="rootClasses"
    :draggable="draggable"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @click="handleCardClick"
  >
    <div class="task-card-content">
      <div class="task-card-header">
        <div
          class="task-checkbox-wrapper"
          @click.stop="handleToggleStatus"
          @mousedown.stop
        >
          <TaskCheckbox :checked="isCompleted" :size="18" />
        </div>
        <div class="task-title" :title="titleTooltip" v-html="titleHtml"></div>
        <div class="task-card-actions">
          <button
            type="button"
            class="task-card-action-btn task-card-open-btn"
            title="跳转正文"
            aria-label="跳转正文"
            @mousedown.stop
            @click.stop.prevent="handleOpenClick"
          >
            <Icon name="open" width="14" height="14" />
          </button>
          <button
            v-if="canExpand"
            type="button"
            class="task-card-action-btn task-card-expand-btn"
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

      <div v-if="showBadges" class="task-badges">
        <span v-if="task.dueDate" class="task-due-badge">
          <Icon name="calendar" width="12" height="12" />
          {{ dueText }}
        </span>
        <span
          v-if="groupLabel"
          class="task-group-badge"
          :style="groupStyle"
          :title="groupLabel"
        >
          <Icon name="group" width="12" height="12" />
          {{ groupLabel }}
        </span>
        <span v-if="showProgressText" class="task-progress-text">{{ progressText }}</span>
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
          rows="3"
          :value="descriptionDraftValue"
          placeholder="添加任务描述..."
          @click.stop
          @input="handleDescriptionInput"
          @blur="handleDescriptionSave"
          @keydown.ctrl.enter.prevent="handleDescriptionSave"
          @keydown.esc.prevent="handleDescriptionCancel"
        />
        <template v-else>
          <span v-html="descriptionHtml"></span>
        </template>
      </div>

      <div
        v-if="showSubtasks"
        class="task-subtasks"
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
const canExpand = computed(() => !!task.value.description || hasSubtasks.value);
const showDescription = computed(() => {
  const hasDescription = typeof task.value.description === 'string' && task.value.description.trim().length > 0;
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
const isCollapsed = computed(() => isKanban.value && !isExpanded.value && !props.descriptionEditing);

const titleTooltip = computed(() => props.titleTooltip || '');
const titleHtml = computed(() => sanitizeTaskTitleHtml(task.value.title));
const descriptionHtml = computed(() => sanitizeTaskHtml(task.value.description || ''));
const descriptionDraftValue = computed(() => props.descriptionDraft ?? task.value.description ?? '');
const dueText = computed(() => (task.value.dueDate ? formatMonthDay(task.value.dueDate) : ''));

const groupLabel = computed(() => {
  const groupId = typeof task.value.groupId === 'string' ? task.value.groupId.trim() : '';
  if (!groupId) {
    return '';
  }
  const group = (props.taskGroups || []).find(item => item.id === groupId);
  return group?.name || '分组';
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
  const due = !!task.value.dueDate;
  return due || !!groupLabel.value || showProgressText.value;
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
}

.task-description {
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
  margin-top: 8px;
  padding: 6px 10px;
  background: var(--b3-list-hover);
  border-radius: 6px;
  border-left: 3px solid var(--b3-theme-border);
  cursor: text;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.task-description:hover {
  border-left-color: var(--b3-theme-primary);
}

.task-description.is-editing {
  opacity: 1;
  padding: 0;
  border-left-color: var(--b3-theme-primary);
}

.task-description-inline-edit {
  width: 100%;
  min-height: 72px;
  margin: 0;
  padding: 8px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--b3-theme-on-surface);
  font-size: 13px;
  line-height: 1.5;
  resize: vertical;
  box-sizing: border-box;
  outline: none;
}

.task-description-inline-edit:focus {
  background: var(--b3-theme-background);
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

.task-subtasks {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 6px 0;
}

.task-subtasks.collapsed {
  display: none;
}


.task-due-badge {
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
  margin-left: auto;
  margin-right: 2px;
  white-space: nowrap;
}
</style>
