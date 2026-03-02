<template>
  <div
    class="table-view"
    ref="tableContainerRef"
    @scroll.passive="handleTableScroll"
  >
    <table class="tasks-table">
      <thead>
        <tr>
          <th class="col-status"></th>
          <th class="col-title">任务</th>
          <th class="col-description">描述</th>
          <th class="col-priority sortable" :class="{ active: sortColumn === 'priority' }" @click="toggleSort('priority')">
            <div class="th-content">
              <span class="sort-indicator">
                <svg viewBox="0 0 24 24" width="14" height="14">
                  <path fill="currentColor" :d="getSortIcon('priority')" />
                </svg>
              </span>
              <span>优先级</span>
            </div>
          </th>
          <th class="col-status-text sortable" :class="{ active: sortColumn === 'status' }" @click="toggleSort('status')">
            <div class="th-content">
              <span class="sort-indicator">
                <svg viewBox="0 0 24 24" width="14" height="14">
                  <path fill="currentColor" :d="getSortIcon('status')" />
                </svg>
              </span>
              <span>状态</span>
            </div>
          </th>
          <th class="col-start-date sortable" :class="{ active: sortColumn === 'startDate' }" @click="toggleSort('startDate')">
            <div class="th-content">
              <span class="sort-indicator">
                <svg viewBox="0 0 24 24" width="14" height="14">
                  <path fill="currentColor" :d="getSortIcon('startDate')" />
                </svg>
              </span>
              <span>开始日期</span>
            </div>
          </th>
          <th class="col-due-date sortable" :class="{ active: sortColumn === 'dueDate' }" @click="toggleSort('dueDate')">
            <div class="th-content">
              <span class="sort-indicator">
                <svg viewBox="0 0 24 24" width="14" height="14">
                  <path fill="currentColor" :d="getSortIcon('dueDate')" />
                </svg>
              </span>
              <span>截止日期</span>
            </div>
          </th>
          <th class="col-location">位置</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="task in visibleTasks" :key="task.id">
          <tr 
              class="task-row" 
              :class="[
                `status-${task.status}`,
                `priority-${task.priority}`,
                { 'task-completed': task.status === 'completed' }
              ]">
            <td class="col-status">
              <div class="task-checkbox-wrapper" @click.stop="toggleTaskStatus(task)">
                <TaskCheckbox :checked="task.status === 'completed'" :size="16" />
              </div>
            </td>
            <td class="col-title">
              <div class="title-wrapper" @click="handleTaskClick(task)">
                <span 
                  v-if="task.subtasks && task.subtasks.length > 0" 
                  class="expand-arrow"
                  :class="{ expanded: expandedTasks.has(task.id) }"
                  @click.stop="toggleExpand(task.id)"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14">
                    <path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                  </svg>
                </span>
                <span v-else class="expand-arrow-placeholder"></span>
                <div class="task-title" v-html="task.title"></div>
              </div>
            </td>
            <td class="col-description" @click.stop="toggleDescriptionEdit(task)">
              <div 
                v-if="!editingDescriptions.has(task.id)"
                class="task-description"
                :class="{ editable: true, empty: !task.description }"
                v-html="task.description || '&nbsp;'"
              ></div>
              <textarea
                v-if="editingDescriptions.has(task.id)"
                class="task-description-edit"
                :data-task-id="task.id"
                :value="task.description"
                @input.stop="handleDescriptionUpdate(task, $event)"
                @blur.stop="toggleDescriptionEdit(task)"
                @keydown.enter.prevent.stop="toggleDescriptionEdit(task)"
                @click.stop
                rows="2"
                placeholder="输入描述..."
              />
            </td>
            <td class="col-priority" @click.stop="togglePriorityEdit(task, $event)">
              <div class="priority-content">
                <span v-if="task.priority !== 'none'" class="task-priority-badge" :class="`priority-${task.priority}`">
                  <Icon name="flag" width="12" height="12" />
                </span>
              </div>
            </td>
            <td class="col-status-text" @click.stop="toggleStatusEdit(task, $event)">
              <span class="status-badge" :class="`status-${task.status}`">
                {{ getStatusLabel(task.status) }}
              </span>
            </td>
            <td class="col-start-date" @click.stop="triggerDatePicker($event)">
              <input
                type="date"
                class="date-input-hidden"
                :value="task.startDate"
                @input.stop="handleStartDateInput(task, $event)"
                @click.stop
                ref="startDateInput"
              />
              <span class="date-display">{{ task.startDate ? formatDate(task.startDate) : '-' }}</span>
            </td>
            <td class="col-due-date" @click.stop="triggerDatePicker($event)">
              <input
                type="date"
                class="date-input-hidden"
                :value="task.dueDate"
                @input.stop="handleDueDateInput(task, $event)"
                @click.stop
                ref="dueDateInput"
              />
              <span class="date-display">{{ task.dueDate ? formatDate(task.dueDate) : '-' }}</span>
            </td>
            <td class="col-location">
              <div class="location-cell">
                <span class="location-text">{{ task.hPath }}</span>
              </div>
            </td>
          </tr>
          <tr 
            v-if="task.subtasks && task.subtasks.length > 0 && expandedTasks.has(task.id)" 
            class="subtasks-row"
          >
            <td class="col-status"></td>
            <td :colspan="7" class="subtasks-cell">
              <div class="subtasks-list">
                <div 
                  v-for="subtask in task.subtasks" 
                  :key="subtask.id" 
                  class="subtask-item"
                  :class="{ 'subtask-completed': subtask.completed }"
                >
                  <div class="subtask-checkbox-wrapper" @click.stop="toggleSubtaskStatus(task, subtask)">
                    <TaskCheckbox :checked="subtask.completed" :size="14" />
                  </div>
                  <span class="subtask-title" v-html="subtask.title"></span>
                  <SubtaskProgress 
                    v-if="subtask.subtasks && subtask.subtasks.length > 0" 
                    :subtasks="subtask.subtasks" 
                  />
                </div>
              </div>
            </td>
          </tr>
        </template>
        <tr v-if="hasMoreTasks" class="load-more-row">
          <td colspan="8" class="load-more-cell">
            <button type="button" class="load-more-btn" @click="loadMoreTasks">
              加载更多（剩余 {{ sortedTasks.length - visibleTasks.length }} 项）
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    
    <PriorityPopover
      v-if="priorityPopover"
      :show="true"
      :position="priorityPopover.position"
      @select="selectPriority(tasks.find(t => t.id === priorityPopover.taskId)!, $event)"
      @close="priorityPopover = null"
    />
    
    <StatusPopover
      v-if="statusPopover"
      :show="true"
      :position="statusPopover.position"
      @select="selectStatus(tasks.find(t => t.id === statusPopover.taskId)!, $event)"
      @close="statusPopover = null"
    />
    
    <div v-if="tasks.length === 0" class="empty-state">
      暂无任务
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted } from 'vue';
import { Task } from '@/api';
import TaskCheckbox from '@/components/TaskCheckbox.vue';
import SubtaskProgress from '@/components/SubtaskProgress.vue';
import Icon from '@/components/Icon.vue';
import PriorityPopover from '@/components/PriorityPopover.vue';
import StatusPopover from '@/components/StatusPopover.vue';
import { getStatusLabel, formatDate } from '@/composables/useTaskCommon';

interface Props {
  tasks: Task[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  taskClick: [task: Task];
  statusToggle: [task: Task];
  subtaskToggle: [task: Task, subtask: any];
  descriptionUpdate: [task: Task, description: string];
  priorityUpdate: [task: Task, priority: Task['priority']];
  statusUpdate: [task: Task, status: Task['status']];
  startDateUpdate: [task: Task, startDate: string];
  dueDateUpdate: [task: Task, dueDate: string];
}>();

const expandedTasks = ref<Set<string>>(new Set());
const editingDescriptions = ref<Set<string>>(new Set());
const priorityPopover = ref<{ taskId: string; position: { x: number; y: number } } | null>(null);
const statusPopover = ref<{ taskId: string; position: { x: number; y: number } } | null>(null);
const sortColumn = ref<'priority' | 'status' | 'startDate' | 'dueDate' | null>(null);
const sortDirection = ref<'asc' | 'desc' >('asc');
const tableContainerRef = ref<HTMLElement | null>(null);
const INITIAL_VISIBLE_TASKS = 120;
const TASKS_CHUNK_SIZE = 120;
const visibleTaskCount = ref(INITIAL_VISIBLE_TASKS);

const priorityOrder = { high: 0, medium: 1, low: 2, none: 3 };
const statusOrder = { 'in-progress': 0, pending: 1, completed: 2, cancelled: 3 };

const sortedTasks = computed(() => {
  if (!sortColumn.value) {
    return props.tasks;
  }

  const tasks = [...props.tasks];
  tasks.sort((a, b) => {
    let comparison = 0;

    if (sortColumn.value === 'priority') {
      comparison = (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99);
    } else if (sortColumn.value === 'status') {
      comparison = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
    } else if (sortColumn.value === 'startDate') {
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      comparison = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    } else if (sortColumn.value === 'dueDate') {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }

    return sortDirection.value === 'asc' ? comparison : -comparison;
  });

  return tasks;
});

const visibleTasks = computed(() => sortedTasks.value.slice(0, visibleTaskCount.value));
const hasMoreTasks = computed(() => visibleTaskCount.value < sortedTasks.value.length);

function resetVisibleTasks(): void {
  visibleTaskCount.value = Math.min(INITIAL_VISIBLE_TASKS, sortedTasks.value.length);
}

function loadMoreTasks(): void {
  if (!hasMoreTasks.value) {
    return;
  }
  visibleTaskCount.value = Math.min(
    visibleTaskCount.value + TASKS_CHUNK_SIZE,
    sortedTasks.value.length
  );
}

function handleTableScroll(): void {
  const container = tableContainerRef.value;
  if (!container || !hasMoreTasks.value) {
    return;
  }
  if (container.scrollTop + container.clientHeight >= container.scrollHeight - 240) {
    loadMoreTasks();
  }
}

watch(
  () => [props.tasks, sortColumn.value, sortDirection.value],
  () => {
    resetVisibleTasks();
    if (tableContainerRef.value) {
      tableContainerRef.value.scrollTop = 0;
    }
  },
  { immediate: true }
);

onMounted(() => {
  nextTick(() => {
    handleTableScroll();
  });
});

function toggleSort(column: 'priority' | 'status' | 'startDate' | 'dueDate') {
  if (sortColumn.value === column) {
    if (sortDirection.value === 'asc') {
      sortDirection.value = 'desc';
    } else if (sortDirection.value === 'desc') {
      sortColumn.value = null;
      sortDirection.value = 'asc';
    }
  } else {
    sortColumn.value = column;
    sortDirection.value = 'asc';
  }
}

function getSortIcon(column: 'priority' | 'status' | 'startDate' | 'dueDate'): string {
  if (sortColumn.value !== column) {
    return 'M10 17l5-5-5-5v10z';
  }
  if (sortDirection.value === 'asc') {
    return 'M7 14l5-5 5 5z';
  }
  return 'M7 10l5 5 5-5z';
}

function handleTaskClick(task: Task) {
  emit('taskClick', task);
}

function toggleTaskStatus(task: Task) {
  emit('statusToggle', task);
}

function toggleSubtaskStatus(task: Task, subtask: Task['subtasks'][0]) {
  emit('subtaskToggle', task, subtask);
}

function toggleDescriptionEdit(task: Task) {
  const isEditing = editingDescriptions.value.has(task.id);
  
  editingDescriptions.value.clear();
  
  if (!isEditing) {
    editingDescriptions.value.add(task.id);
    nextTick(() => {
      const textarea = document.querySelector(`.task-description-edit[data-task-id="${task.id}"]`) as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
        textarea.select();
      }
    });
  }
}

function handleDescriptionUpdate(task: Task, event: Event) {
  const target = event.target as HTMLTextAreaElement;
  emit('descriptionUpdate', task, target.value);
}

function togglePriorityEdit(task: Task, event: MouseEvent) {
  if (priorityPopover.value && priorityPopover.value.taskId === task.id) {
    priorityPopover.value = null;
  } else {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    
    priorityPopover.value = {
      taskId: task.id,
      position: {
        x: rect.left + rect.width / 2,
        y: rect.bottom + 4
      }
    };
  }
}

function selectPriority(task: Task, priority: string) {
  emit('priorityUpdate', task, priority as Task['priority']);
  
  priorityPopover.value = null;
}

function toggleStatusEdit(task: Task, event: MouseEvent) {
  if (statusPopover.value && statusPopover.value.taskId === task.id) {
    statusPopover.value = null;
  } else {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    
    statusPopover.value = {
      taskId: task.id,
      position: {
        x: rect.left + rect.width / 2,
        y: rect.bottom + 4
      }
    };
  }
}

function selectStatus(task: Task, status: string) {
  emit('statusUpdate', task, status as Task['status']);
  
  statusPopover.value = null;
}

function handleStartDateInput(task: Task, event: Event) {
  const target = event.target as HTMLInputElement;
  emit('startDateUpdate', task, target.value);
}

function handleDueDateInput(task: Task, event: Event) {
  const target = event.target as HTMLInputElement;
  emit('dueDateUpdate', task, target.value);
}

function triggerDatePicker(event: MouseEvent) {
  const td = event.currentTarget as HTMLElement;
  const input = td.querySelector('input[type="date"]') as HTMLInputElement;
  if (input) {
    input.showPicker();
  }
}

function toggleExpand(taskId: string) {
  if (expandedTasks.value.has(taskId)) {
    expandedTasks.value.delete(taskId);
  } else {
    expandedTasks.value.add(taskId);
  }
  expandedTasks.value = new Set(expandedTasks.value);
}
</script>

<style scoped>
.table-view {
  width: 100%;
  height: 100%;
  overflow: auto;
}

.tasks-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.tasks-table thead {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--b3-theme-background);
}

.tasks-table th {
  padding: 10px 12px;
  text-align: left;
  font-weight: 500;
  color: var(--b3-theme-on-surface);
  border-bottom: 1px solid var(--b3-border-color);
  border-right: 1px solid var(--b3-border-color);
  white-space: nowrap;
}

.tasks-table th:last-child {
  border-right: none;
}

.tasks-table th.sortable {
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
}

.tasks-table th.sortable:hover {
  background-color: var(--b3-list-hover);
}

.th-content {
  display: flex;
  align-items: center;
  gap: 4px;
}

.sort-indicator {
  display: flex;
  align-items: center;
  color: var(--b3-theme-on-surface);
  opacity: 0.3;
  transition: all 0.15s;
}

.sortable:hover .sort-indicator {
  opacity: 0.6;
}

.sortable.active .sort-indicator {
  opacity: 1;
  color: var(--b3-theme-primary);
}

.tasks-table td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--b3-border-color);
  border-right: 1px solid var(--b3-border-color);
}

.tasks-table td:last-child {
  border-right: none;
}

.task-row {
  cursor: pointer;
  transition: background-color 0.15s;
}

.task-row:hover {
  background-color: var(--b3-list-hover);
}

.col-status {
  width: 40px;
  text-align: center;
}

.task-checkbox-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}

.subtask-checkbox-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.subtask-checkbox-wrapper:hover {
  opacity: 0.8;
}

.col-title {
  width: 25%;
  min-width: 150px;
}

.title-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.expand-arrow {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  cursor: pointer;
  color: var(--b3-theme-on-surface);
  transition: transform 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
}

.expand-arrow:hover {
  color: var(--b3-theme-on-background);
}

.expand-arrow.expanded {
  transform: rotate(90deg);
}

.expand-arrow-placeholder {
  width: 14px;
  flex-shrink: 0;
}

.task-title {
  font-size: 14px;
  color: var(--b3-theme-on-background);
  line-height: 1.4;
  word-break: break-word;
}

.col-description {
  min-width: 200px;
  position: relative;
}

.task-description {
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  line-height: 1.4;

  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.task-description.editable {
  cursor: pointer;
  transition: all 0.2s;
}

.task-description-edit {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  font-size: 12px;
  color: var(--b3-theme-on-background);
  line-height: 1.4;
  padding: 4px 8px;
  background: var(--b3-theme-background);
  border: 1px solid var(--b3-theme-primary);
  border-radius: 4px;
  resize: none;
  font-family: inherit;
  z-index: 1;
}

.task-description-edit:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}


.col-priority {
  width: 60px;
  text-align: center;
}

.task-priority-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
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
.priority-select {
  width: 100%;
  font-size: 12px;
  padding: 2px 4px;
  border: 1px solid var(--b3-theme-primary);
  border-radius: 4px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  cursor: pointer;
}

.priority-select:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.col-status-text {
  width: 60px;
  text-align: center;
  cursor: pointer;
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.status-badge.status-pending {
  background: var(--pinch-background4);
  color: var(--pinch-font-color4);
}

.status-badge.status-in-progress {
  background: var(--pinch-background7);
  color: var(--pinch-font-color7);
}

.status-badge.status-completed {
  background: var(--pinch-background5);
  color: var(--pinch-font-color5);
}

.status-badge.status-cancelled {
  background: var(--pinch-background1);
  color: var(--pinch-font-color1);
}

.col-start-date,
.col-due-date {
  width: 80px;
  text-align: center;
  white-space: nowrap;
  color: var(--b3-theme-on-surface);
  cursor: pointer;
  position: relative;
}

.col-status-text .th-content,
.col-start-date .th-content,
.col-due-date .th-content {
  justify-content: center;
}

.date-input-hidden {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  pointer-events: none;
}

.date-display {
  display: block;
  padding: 4px 8px;
  text-align: center;
  transition: background-color 0.15s;
}

.col-start-date:hover .date-display,
.col-due-date:hover .date-display {
  background: var(--b3-list-hover);
  border-radius: 4px;
}

.col-location {
  width: 25%;
  min-width: 150px;
}

.location-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.task-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.location-text {
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-completed .task-title {
  text-decoration: line-through;
  opacity: 0.6;
}

.subtasks-row {
  background-color: var(--b3-theme-surface);
}

.subtasks-row:hover {
  background-color: var(--b3-list-hover);
}

.subtasks-cell {
  padding: 10px 4px !important;
}

.subtasks-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.subtask-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
}

.subtask-title {
  font-size: 13px;
  color: var(--b3-theme-on-background);
  line-height: 1.4;
}

.subtask-completed .subtask-title {
  text-decoration: line-through;
  opacity: 0.6;
}

.load-more-row td {
  border-right: none;
}

.load-more-cell {
  padding: 10px 12px;
  text-align: center;
}

.load-more-btn {
  border: 1px solid var(--b3-border-color);
  border-radius: 6px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-surface);
  padding: 4px 10px;
  cursor: pointer;
}

.load-more-btn:hover {
  background: var(--b3-list-hover);
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: var(--b3-theme-on-surface);
  font-size: 14px;
}
</style>
