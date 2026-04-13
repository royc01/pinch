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
              <span class="sort-indicator" :class="getSortIndicatorClass('priority')">
                <svg viewBox="0 0 1024 1024" width="14" height="14" aria-hidden="true">
                  <path class="sort-indicator-top" :d="SORT_INDICATOR_TOP_PATH" />
                  <path class="sort-indicator-bottom" :d="SORT_INDICATOR_BOTTOM_PATH" />
                </svg>
              </span>
              <span>优先级</span>
            </div>
          </th>
          <th class="col-status-text sortable" :class="{ active: sortColumn === 'status' }" @click="toggleSort('status')">
            <div class="th-content">
              <span class="sort-indicator" :class="getSortIndicatorClass('status')">
                <svg viewBox="0 0 1024 1024" width="14" height="14" aria-hidden="true">
                  <path class="sort-indicator-top" :d="SORT_INDICATOR_TOP_PATH" />
                  <path class="sort-indicator-bottom" :d="SORT_INDICATOR_BOTTOM_PATH" />
                </svg>
              </span>
              <span>状态</span>
            </div>
          </th>
          <th class="col-group">标签</th>
          <th class="col-start-date sortable" :class="{ active: sortColumn === 'startDate' }" @click="toggleSort('startDate')">
            <div class="th-content">
              <span class="sort-indicator" :class="getSortIndicatorClass('startDate')">
                <svg viewBox="0 0 1024 1024" width="14" height="14" aria-hidden="true">
                  <path class="sort-indicator-top" :d="SORT_INDICATOR_TOP_PATH" />
                  <path class="sort-indicator-bottom" :d="SORT_INDICATOR_BOTTOM_PATH" />
                </svg>
              </span>
              <span>开始日期</span>
            </div>
          </th>
          <th class="col-due-date sortable" :class="{ active: sortColumn === 'dueDate' }" @click="toggleSort('dueDate')">
            <div class="th-content">
              <span class="sort-indicator" :class="getSortIndicatorClass('dueDate')">
                <svg viewBox="0 0 1024 1024" width="14" height="14" aria-hidden="true">
                  <path class="sort-indicator-top" :d="SORT_INDICATOR_TOP_PATH" />
                  <path class="sort-indicator-bottom" :d="SORT_INDICATOR_BOTTOM_PATH" />
                </svg>
              </span>
              <span>截止日期</span>
            </div>
          </th>
          <th class="col-created-date sortable" :class="{ active: sortColumn === 'createdAt' }" @click="toggleSort('createdAt')">
            <div class="th-content">
              <span class="sort-indicator" :class="getSortIndicatorClass('createdAt')">
                <svg viewBox="0 0 1024 1024" width="14" height="14" aria-hidden="true">
                  <path class="sort-indicator-top" :d="SORT_INDICATOR_TOP_PATH" />
                  <path class="sort-indicator-bottom" :d="SORT_INDICATOR_BOTTOM_PATH" />
                </svg>
              </span>
              <span>创建时间</span>
            </div>
          </th>
          <th class="col-updated-date sortable" :class="{ active: sortColumn === 'updatedAt' }" @click="toggleSort('updatedAt')">
            <div class="th-content">
              <span class="sort-indicator" :class="getSortIndicatorClass('updatedAt')">
                <svg viewBox="0 0 1024 1024" width="14" height="14" aria-hidden="true">
                  <path class="sort-indicator-top" :d="SORT_INDICATOR_TOP_PATH" />
                  <path class="sort-indicator-bottom" :d="SORT_INDICATOR_BOTTOM_PATH" />
                </svg>
              </span>
              <span>更新时间</span>
            </div>
          </th>
          <th class="col-location">位置</th>
        </tr>
      </thead>
      <tbody>
        <template v-if="isGroupedDisplayMode">
          <template v-for="group in groupedVisibleTasks" :key="group.key">
            <tr class="group-row">
              <td colspan="11">
                <button
                  type="button"
                  class="group-row-content"
                  :style="group.style"
                  :aria-expanded="!isGroupCollapsed(group.id)"
                  @click="toggleGroupCollapse(group.id)"
                >
                  <span class="group-row-arrow" :class="{ collapsed: isGroupCollapsed(group.id) }" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M7 10l5 5 5-5" />
                    </svg>
                  </span>
                  <span class="group-row-label">{{ group.label }}</span>
                  <span class="group-row-right">
                    <span class="group-row-count">{{ group.tasks.length }} 项</span>
                    <button
                      v-if="supportsGroupActions && canCreateTaskForGroup(group)"
                      type="button"
                      class="column-add-task-btn"
                      :title="getGroupCreateTaskLabel(group)"
                      :aria-label="getGroupCreateTaskLabel(group)"
                      @click.stop="emitGroupCreateTask(group)"
                    >
                      <svg viewBox="0 0 1024 1024" width="16" height="16" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M836 476H548V188c0-19.8-16.2-36-36-36s-36 16.2-36 36v288H188c-19.8 0-36 16.2-36 36s16.2 36 36 36h288v288c0 19.8 16.2 36 36 36s36-16.2 36-36V548h288c19.8 0 36-16.2 36-36s-16.2-36-36-36z"
                        />
                      </svg>
                    </button>
                    <button
                      v-if="supportsGroupActions"
                      type="button"
                      class="column-archive-tasks-btn"
                      :title="getGroupArchiveTasksLabel(group)"
                      :aria-label="getGroupArchiveTasksLabel(group)"
                      :disabled="getGroupArchivableTaskCount(group) === 0"
                      @click.stop="emitGroupArchiveTasks(group)"
                    >
                      <svg viewBox="0 0 1024 1024" width="16" height="16" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M273.066667 68.266667a102.4 102.4 0 0 0-102.4 102.4v74.069333A102.434133 102.434133 0 0 0 102.4 341.333333v74.069334A102.434133 102.434133 0 0 0 34.133333 512v273.066667a170.666667 170.666667 0 0 0 170.666667 170.666666h614.4a170.666667 170.666667 0 0 0 170.666667-170.666666v-273.066667a102.434133 102.434133 0 0 0-68.266667-96.597333V341.333333a102.434133 102.434133 0 0 0-68.266667-96.597333V170.666667a102.4 102.4 0 0 0-102.4-102.4H273.066667z m580.266666 341.333333h-204.8a34.133333 34.133333 0 0 0-34.133333 34.133333 102.4 102.4 0 1 1-204.8 0 34.133333 34.133333 0 0 0-34.133333-34.133333H170.666667v-68.266667a34.133333 34.133333 0 0 1 34.133333-34.133333h614.4a34.133333 34.133333 0 0 1 34.133333 34.133333v68.266667zM136.533333 477.866667h208.213334a170.734933 170.734933 0 0 0 334.506666 0H887.466667a34.133333 34.133333 0 0 1 34.133333 34.133333v273.066667a102.4 102.4 0 0 1-102.4 102.4H204.8a102.4 102.4 0 0 1-102.4-102.4v-273.066667a34.133333 34.133333 0 0 1 34.133333-34.133333z m648.533334-238.933334H238.933333V170.666667a34.133333 34.133333 0 0 1 34.133334-34.133334h477.866666a34.133333 34.133333 0 0 1 34.133334 34.133334v68.266666zM375.466667 750.933333a34.133333 34.133333 0 0 1 34.133333-34.133333h204.8a34.133333 34.133333 0 1 1 0 68.266667h-204.8a34.133333 34.133333 0 0 1-34.133333-34.133334z"
                        />
                      </svg>
                    </button>
                  </span>
                </button>
              </td>
            </tr>
            <template v-if="!isGroupCollapsed(group.id)">
              <template v-for="task in group.tasks" :key="task.id">
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
                  <div class="title-wrapper">
                    <div class="title-main" @click="handleTaskClick(task, $event)">
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
                      <div class="task-title" v-html="getTitleHtml(task.title)"></div>
                    </div>
                    <button
                      type="button"
                      class="title-open-btn"
                      title="跳转到任务"
                      aria-label="跳转到任务"
                      @click.stop="handleOpenClick(task)"
                    >
                      <Icon name="open" width="14" height="14" />
                    </button>
                  </div>
                </td>
                <td class="col-description" @click.stop="startDescriptionEdit(task)">
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
                    :value="getDescriptionDraft(task)"
                    @input.stop="handleDescriptionInput(task, $event)"
                    @blur.stop="commitDescriptionEdit(task)"
                    @keydown.ctrl.enter.prevent="commitDescriptionEdit(task)"
                    @keydown.meta.enter.prevent="commitDescriptionEdit(task)"
                    @keydown.esc.prevent="cancelDescriptionEdit(task.id)"
                    @click.stop
                    rows="2"
                    placeholder="输入描述..."
                  />
                </td>
                <td class="col-priority" @click.stop="togglePriorityEdit(task, $event)">
                  <div class="priority-content">
                    <span
                      v-if="task.priority !== 'none'"
                      class="task-priority-badge"
                      :class="`priority-${task.priority}`"
                      :title="task.priority === 'high' ? '高优先级' : task.priority === 'medium' ? '中优先级' : '低优先级'"
                    >
                      <Icon name="flag" width="12" height="12" />
                    </span>
                  </div>
                </td>
                <td class="col-status-text" @click.stop="toggleStatusEdit(task, $event)">
                  <span class="status-badge" :class="`status-${task.status}`">
                    {{ getStatusLabel(task.status) }}
                  </span>
                </td>
                <td class="col-group" @click.stop="toggleGroupPopover(task, $event)">
                  <span
                    v-if="getTaskGroupLabel(task)"
                    class="group-badge"
                    :style="getTaskGroupStyle(task)"
                  >
                    {{ getTaskGroupLabel(task) }}
                  </span>
                </td>
                <td class="col-start-date" @click.stop="openDatePopover(task, 'startDate', $event)">
                  <span class="date-display">{{ task.startDate ? formatLocaleDate(task.startDate) : '-' }}</span>
                </td>
                <td class="col-due-date" @click.stop="openDatePopover(task, 'dueDate', $event)">
                  <span class="date-display">{{ task.dueDate ? formatLocaleDate(task.dueDate) : '-' }}</span>
                </td>
                <td class="col-created-date">
                  <span class="date-display">{{ task.createdAt ? formatLocaleDate(task.createdAt) : '-' }}</span>
                </td>
                <td class="col-updated-date">
                  <span class="date-display">{{ task.updatedAt ? formatLocaleDate(task.updatedAt) : '-' }}</span>
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
                <td :colspan="10" class="subtasks-cell">
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
                      <span class="subtask-title" v-html="getTitleHtml(subtask.title)"></span>
                      <SubtaskProgress 
                        v-if="subtask.subtasks && subtask.subtasks.length > 0" 
                        :subtasks="subtask.subtasks" 
                      />
                    </div>
                  </div>
                </td>
              </tr>
              </template>
            </template>
          </template>
        </template>
        <template v-else>
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
                <div class="title-wrapper">
                  <div class="title-main" @click="handleTaskClick(task, $event)">
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
                    <div class="task-title" v-html="getTitleHtml(task.title)"></div>
                  </div>
                  <button
                    type="button"
                    class="title-open-btn"
                    title="跳转到任务"
                    aria-label="跳转到任务"
                    @click.stop="handleOpenClick(task)"
                  >
                    <Icon name="open" width="14" height="14" />
                  </button>
                </div>
              </td>
              <td class="col-description" @click.stop="startDescriptionEdit(task)">
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
                  :value="getDescriptionDraft(task)"
                  @input.stop="handleDescriptionInput(task, $event)"
                  @blur.stop="commitDescriptionEdit(task)"
                  @keydown.ctrl.enter.prevent="commitDescriptionEdit(task)"
                  @keydown.meta.enter.prevent="commitDescriptionEdit(task)"
                  @keydown.esc.prevent="cancelDescriptionEdit(task.id)"
                  @click.stop
                  rows="2"
                  placeholder="输入描述..."
                />
              </td>
              <td class="col-priority" @click.stop="togglePriorityEdit(task, $event)">
                <div class="priority-content">
                  <span
                    v-if="task.priority !== 'none'"
                    class="task-priority-badge"
                    :class="`priority-${task.priority}`"
                    :title="task.priority === 'high' ? '高优先级' : task.priority === 'medium' ? '中优先级' : '低优先级'"
                  >
                    <Icon name="flag" width="12" height="12" />
                  </span>
                </div>
              </td>
              <td class="col-status-text" @click.stop="toggleStatusEdit(task, $event)">
                <span class="status-badge" :class="`status-${task.status}`">
                  {{ getStatusLabel(task.status) }}
                </span>
              </td>
              <td class="col-group" @click.stop="toggleGroupPopover(task, $event)">
                <span
                  v-if="getTaskGroupLabel(task)"
                  class="group-badge"
                  :style="getTaskGroupStyle(task)"
                >
                  {{ getTaskGroupLabel(task) }}
                </span>
              </td>
              <td class="col-start-date" @click.stop="openDatePopover(task, 'startDate', $event)">
                <span class="date-display">{{ task.startDate ? formatLocaleDate(task.startDate) : '-' }}</span>
              </td>
              <td class="col-due-date" @click.stop="openDatePopover(task, 'dueDate', $event)">
                <span class="date-display">{{ task.dueDate ? formatLocaleDate(task.dueDate) : '-' }}</span>
              </td>
              <td class="col-created-date">
                <span class="date-display">{{ task.createdAt ? formatLocaleDate(task.createdAt) : '-' }}</span>
              </td>
              <td class="col-updated-date">
                <span class="date-display">{{ task.updatedAt ? formatLocaleDate(task.updatedAt) : '-' }}</span>
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
              <td :colspan="10" class="subtasks-cell">
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
                    <span class="subtask-title" v-html="getTitleHtml(subtask.title)"></span>
                    <SubtaskProgress 
                      v-if="subtask.subtasks && subtask.subtasks.length > 0" 
                      :subtasks="subtask.subtasks" 
                    />
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </template>
        <tr v-if="hasMoreTasks" class="load-more-row">
          <td colspan="11" class="load-more-cell">
            <button type="button" class="load-more-btn" @click="loadMoreTasks">
              显示更多（剩余 {{ sortedTasks.length - visibleTasks.length }} 项）
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

    <Teleport to="body">
      <div
        v-if="groupPopover"
        class="group-popover"
        :style="groupPopoverStyle"
        @click.stop
        @mousedown.stop
      >
        <div class="group-popover-header">
          <span class="group-popover-title">选择标签</span>
          <button type="button" class="group-popover-manage" @click.stop="handleGroupManage">
            管理
          </button>
        </div>
        <div class="group-popover-chip-list">
          <button
            v-for="option in groupPopoverOptions"
            :key="option.value"
            type="button"
            class="group-popover-chip"
            :class="{ active: groupPopoverSelectedId === option.value, special: option.special }"
            :style="{
              '--group-chip-bg': option.colorCss || 'var(--b3-list-hover)',
              '--group-chip-color': option.textColor || 'var(--b3-theme-on-surface)'
            }"
            @click="selectGroupFromPopover(option.value)"
          >
            <span class="group-popover-chip-label">{{ option.label }}</span>
          </button>
        </div>
      </div>
    </Teleport>

    <TaskDatePopover
      :visible="datePopoverVisible"
      :anchor-el="datePopoverAnchorRef"
      :model-value="datePopoverValue"
      @update:modelValue="handleDatePopoverSelect"
      @close="closeDatePopover"
    />
    
    <div v-if="tasks.length === 0" class="empty-state">
      暂无任务
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue';
import { Task, TaskGroup } from '@/api';
import TaskCheckbox from '@/components/TaskCheckbox.vue';
import SubtaskProgress from '@/components/SubtaskProgress.vue';
import Icon from '@/components/Icon.vue';
import PriorityPopover from '@/components/PriorityPopover.vue';
import StatusPopover from '@/components/StatusPopover.vue';
import TaskDatePopover from '@/components/TaskDatePopover.vue';
import { getStatusLabel, formatLocaleDate } from '@/composables/useTaskCommon';
import {
  getTaskHeadingGroupMeta,
  normalizeTaskViewGroupMode,
  type TaskHeadingGroupMeta,
  type TaskViewGroupMode
} from '@/utils/taskGrouping';
import {
  buildLiveTaskDomOrderMap,
  compareTaskCreatedAtDesc,
  compareTaskDocumentSortKey
} from '@/utils/taskSortShared';
import { resolveGroupColorCss, resolveGroupTextColor } from '@/utils/groupColor';
import { sanitizeTaskTitleHtml } from '@/utils/taskHtml';

interface Props {
  tasks: Task[];
  taskGroups?: TaskGroup[];
  groupMode?: TaskViewGroupMode;
  headingGroups?: Map<string, TaskHeadingGroupMeta>;
}

type TableTaskGroupSection = {
  key: string;
  id: string;
  mode: 'group' | 'heading' | 'date';
  label: string;
  tasks: Task[];
  style?: Record<string, string>;
};

const props = defineProps<Props>();

const TASK_GROUP_NONE_ID = '__none__';

const emit = defineEmits<{
  taskClick: [task: Task, event?: MouseEvent];
  openClick: [task: Task];
  statusToggle: [task: Task];
  subtaskToggle: [task: Task, subtask: any];
  descriptionUpdate: [task: Task, description: string];
  priorityUpdate: [task: Task, priority: Task['priority']];
  statusUpdate: [task: Task, status: Task['status']];
  groupUpdate: [task: Task, groupId: string];
  'manage-groups': [];
  groupCreateTask: [payload: { mode: 'group' | 'heading'; groupId: string; groupLabel: string; sampleTaskId?: string }];
  groupArchiveTasks: [payload: { mode: 'group' | 'heading'; groupId: string; groupLabel: string; taskIds: string[] }];
  startDateUpdate: [task: Task, startDate: string];
  dueDateUpdate: [task: Task, dueDate: string];
}>();

const expandedTasks = ref<Set<string>>(new Set());
const editingDescriptions = ref<Set<string>>(new Set());
const descriptionDraftByTaskId = ref(new Map<string, string>());
const priorityPopover = ref<{ taskId: string; position: { x: number; y: number } } | null>(null);
const statusPopover = ref<{ taskId: string; position: { x: number; y: number } } | null>(null);
const groupPopover = ref<{ taskId: string; position: { x: number; y: number } } | null>(null);
type SortableColumn = 'priority' | 'status' | 'startDate' | 'dueDate' | 'createdAt' | 'updatedAt';

const SORT_INDICATOR_TOP_PATH = 'M547.072 103.68a42.666667 42.666667 0 0 0-70.144 0l-192 277.333333A42.666667 42.666667 0 0 0 320 448h384a42.666667 42.666667 0 0 0 35.072-66.986667l-192-277.333333z';
const SORT_INDICATOR_BOTTOM_PATH = 'M320 576a42.666667 42.666667 0 0 0-35.072 66.986667l192 277.333333a42.666667 42.666667 0 0 0 70.144 0l192-277.333333a42.666667 42.666667 0 0 0-35.072-66.986667h-384z';

const sortColumn = ref<SortableColumn | null>(null);
const sortDirection = ref<'asc' | 'desc'>('asc');
const tableContainerRef = ref<HTMLElement | null>(null);
const INITIAL_VISIBLE_TASKS = 120;
const TASKS_CHUNK_SIZE = 120;
const visibleTaskCount = ref(INITIAL_VISIBLE_TASKS);
type DateField = 'startDate' | 'dueDate';
const datePopoverVisible = ref(false);
const datePopoverTaskId = ref('');
const datePopoverField = ref<DateField>('dueDate');
const datePopoverAnchorRef = ref<HTMLElement | null>(null);

const priorityOrder = { high: 0, medium: 1, low: 2, none: 3 };
const statusOrder = { 'in-progress': 0, delayed: 1, pending: 2, completed: 3, cancelled: 4 };

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

function getTodayStartTimestamp(): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

function getTaskDueDateTimestamp(task: Task): number | null {
  return getTaskDateTimestamp(task.dueDate);
}

function getTaskStartDateTimestamp(task: Task): number | null {
  return getTaskDateTimestamp(task.startDate);
}

function isVirtualTaskForToday(task: Task): boolean {
  if (!task.isVirtual) return false;
  const dayMs = 24 * 60 * 60 * 1000;
  const todayStart = getTodayStartTimestamp();
  const todayEnd = todayStart + dayMs;
  const startTimestamp = getTaskStartDateTimestamp(task);
  const dueTimestamp = getTaskDueDateTimestamp(task);
  if (startTimestamp !== null || dueTimestamp !== null) {
    let rangeStart = startTimestamp ?? dueTimestamp ?? 0;
    let rangeEnd = dueTimestamp ?? startTimestamp ?? 0;
    if (rangeStart > rangeEnd) {
      [rangeStart, rangeEnd] = [rangeEnd, rangeStart];
    }
    const taskRangeEnd = rangeEnd + dayMs;
    return rangeStart < todayEnd && taskRangeEnd > todayStart;
  }
  return false;
}

function compareTasksDefault(a: Task, b: Task, domOrderMap?: Map<string, number>): number {
  const todayStart = getTodayStartTimestamp();
  const isAPinned = a.pinned === true;
  const isBPinned = b.pinned === true;
  if (isAPinned && !isBPinned) {
    return -1;
  }
  if (!isAPinned && isBPinned) {
    return 1;
  }

  const isACompleted = a.status === 'completed';
  const isBCompleted = b.status === 'completed';

  if (isACompleted && !isBCompleted) {
    return 1;
  }
  if (!isACompleted && isBCompleted) {
    return -1;
  }

  if (isACompleted && isBCompleted) {
    const updatedA = Date.parse(a.updatedAt || '');
    const updatedB = Date.parse(b.updatedAt || '');
    const hasUpdatedA = Number.isFinite(updatedA);
    const hasUpdatedB = Number.isFinite(updatedB);

    if (hasUpdatedA && hasUpdatedB && updatedA !== updatedB) {
      return updatedB - updatedA;
    }
    if (hasUpdatedA && !hasUpdatedB) {
      return -1;
    }
    if (!hasUpdatedA && hasUpdatedB) {
      return 1;
    }
  } else {
    const dueA = getTaskDateTimestamp(a.dueDate);
    const dueB = getTaskDateTimestamp(b.dueDate);
    const isAOverdue = dueA !== null && dueA < todayStart;
    const isBOverdue = dueB !== null && dueB < todayStart;
    if (isAOverdue && !isBOverdue) {
      return -1;
    }
    if (!isAOverdue && isBOverdue) {
      return 1;
    }
    if (isAOverdue && isBOverdue && dueA !== null && dueB !== null && dueA !== dueB) {
      return dueA - dueB;
    }

    const priorityA = priorityOrder[a.priority] ?? 3;
    const priorityB = priorityOrder[b.priority] ?? 3;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    const createdSortResult = compareTaskCreatedAtDesc(a, b);
    if (createdSortResult !== 0) {
      return createdSortResult;
    }

    const documentSortResult = compareTaskDocumentSortKey(a, b, domOrderMap);
    if (documentSortResult !== 0) {
      return documentSortResult;
    }
  }

  const aSortKey = a.blockId || a.id || a.createdAt || '';
  const bSortKey = b.blockId || b.id || b.createdAt || '';
  return bSortKey.localeCompare(aSortKey);
}

const groupLookup = computed(() => {
  const map = new Map<string, { name: string; background: string; color: string }>();
  for (const group of props.taskGroups || []) {
    if (!group || !group.id) continue;
    const name = group.name?.trim() || '标签';
    const background = resolveGroupColorCss(group.color || '');
    const color = resolveGroupTextColor(group.color || '');
    map.set(group.id, { name, background, color });
  }
  return map;
});

const groupPopoverOptions = computed(() => {
  const options: Array<{ value: string; label: string; special?: boolean; colorCss?: string; textColor?: string }> = [
    { value: TASK_GROUP_NONE_ID, label: '无标签', special: true, colorCss: '', textColor: '' }
  ];
  for (const group of props.taskGroups || []) {
    if (!group || !group.id) continue;
    if (group.hidden === true) continue;
    const rawColor = group.color || '';
    options.push({
      value: group.id,
      label: group.name?.trim() || '标签',
      special: false,
      colorCss: resolveGroupColorCss(rawColor),
      textColor: resolveGroupTextColor(rawColor)
    });
  }
  return options;
});
const resolvedGroupMode = computed(() => normalizeTaskViewGroupMode(props.groupMode, 'status'));
const isGroupedDisplayMode = computed(() => ['group', 'heading', 'date'].includes(resolvedGroupMode.value));
const supportsGroupActions = computed(() => ['group', 'heading'].includes(resolvedGroupMode.value));
const customGroupOrder = computed(() => {
  const order: Array<{ id: string; label: string; style?: Record<string, string> }> = [
    { id: '', label: '无标签' }
  ];
  for (const group of props.taskGroups || []) {
    if (!group || !group.id) continue;
    const background = resolveGroupColorCss(group.color || '');
    const color = resolveGroupTextColor(group.color || '');
    const style = background ? {
      '--group-badge-bg': background,
      '--group-badge-color': color
    } : undefined;
    order.push({
      id: group.id,
      label: group.name?.trim() || '标签',
      style
    });
  }
  return order;
});
type TableDateGroupKey = 'overdue' | 'today' | 'thisWeek' | 'thisMonth' | 'other';
const dateGroupOrder: Array<{ id: TableDateGroupKey; label: string; style: Record<string, string> }> = [
  {
    id: 'overdue',
    label: '逾期',
    style: { '--group-badge-bg': 'rgba(239, 68, 68, 0.14)', '--group-badge-color': '#b91c1c' }
  },
  {
    id: 'today',
    label: '今日',
    style: { '--group-badge-bg': 'rgba(245, 158, 11, 0.14)', '--group-badge-color': '#b45309' }
  },
  {
    id: 'thisWeek',
    label: '本周',
    style: { '--group-badge-bg': 'rgba(59, 130, 246, 0.14)', '--group-badge-color': '#1d4ed8' }
  },
  {
    id: 'thisMonth',
    label: '本月',
    style: { '--group-badge-bg': 'rgba(16, 185, 129, 0.14)', '--group-badge-color': '#047857' }
  },
  {
    id: 'other',
    label: '其他',
    style: { '--group-badge-bg': 'rgba(156, 163, 175, 0.16)', '--group-badge-color': '#4b5563' }
  }
];

const sortedTasks = computed(() => {
  const domOrderMap = buildLiveTaskDomOrderMap();
  if (!sortColumn.value) {
    return [...props.tasks].sort((a, b) => compareTasksDefault(a, b, domOrderMap));
  }

  const tasks = [...props.tasks];
  tasks.sort((a, b) => {
    const isAPinned = a.pinned === true;
    const isBPinned = b.pinned === true;
    if (isAPinned && !isBPinned) return -1;
    if (!isAPinned && isBPinned) return 1;

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
    } else if (sortColumn.value === 'createdAt') {
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else if (sortColumn.value === 'updatedAt') {
      if (!a.updatedAt) return 1;
      if (!b.updatedAt) return -1;
      comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    }

    if (comparison === 0) {
      const documentSortResult = compareTaskDocumentSortKey(a, b, domOrderMap);
      if (documentSortResult !== 0) {
        return documentSortResult;
      }
    }

    return sortDirection.value === 'asc' ? comparison : -comparison;
  });

  return tasks;
});

const visibleTasks = computed(() => sortedTasks.value.slice(0, visibleTaskCount.value));
const hasMoreTasks = computed(() => visibleTaskCount.value < sortedTasks.value.length);
const groupedVisibleTasks = computed<TableTaskGroupSection[]>(() => {
  if (!isGroupedDisplayMode.value) return [];
  if (resolvedGroupMode.value === 'group') {
    const buckets = new Map<string, Task[]>();
    for (const task of visibleTasks.value) {
      const rawGroupId = getTaskGroupId(task);
      const resolvedGroupId = rawGroupId && groupLookup.value.has(rawGroupId) ? rawGroupId : '';
      if (!buckets.has(resolvedGroupId)) {
        buckets.set(resolvedGroupId, []);
      }
      buckets.get(resolvedGroupId)!.push(task);
    }

    return customGroupOrder.value
      .map(group => ({
        key: group.id || '__none__',
        id: group.id,
        mode: 'group' as const,
        label: group.label,
        style: group.style,
        tasks: buckets.get(group.id) || []
      }))
      .filter(group => group.tasks.length > 0);
  }

  if (resolvedGroupMode.value === 'heading') {
    const buckets = new Map<string, { label: string; tasks: Task[] }>();
    for (const task of visibleTasks.value) {
      const meta = getTaskHeadingGroupMeta(task, props.headingGroups);
      if (!buckets.has(meta.key)) {
        buckets.set(meta.key, {
          label: meta.label,
          tasks: []
        });
      }
      buckets.get(meta.key)!.tasks.push(task);
    }

    return Array.from(buckets.entries())
      .map(([key, group]) => ({
        key,
        id: key,
        mode: 'heading' as const,
        label: group.label,
        tasks: group.tasks
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));
  }

  if (resolvedGroupMode.value === 'date') {
    const dayMs = 24 * 60 * 60 * 1000;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    const tomorrowStart = todayStart + dayMs;
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1).getTime();
    const weekStart = new Date(todayStart);
    const weekday = weekStart.getDay();
    const diff = weekday === 0 ? -6 : 1 - weekday;
    weekStart.setDate(weekStart.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartTimestamp = weekStart.getTime();
    const weekEnd = weekStartTimestamp + dayMs * 7;
    const buckets = new Map<TableDateGroupKey, Task[]>();
    dateGroupOrder.forEach(group => buckets.set(group.id, []));
    const todayVirtualSeriesIds = new Set<string>();

    for (const task of visibleTasks.value) {
      if (task.isVirtual && task.repeatSeriesId && isVirtualTaskForToday(task)) {
        todayVirtualSeriesIds.add(task.repeatSeriesId);
      }
    }

    for (const task of visibleTasks.value) {
      const dueTimestamp = getTaskDueDateTimestamp(task);
      const groupingTimestamp = dueTimestamp ?? getTaskDateTimestamp(task.createdAt);
      const repeatSeriesId = typeof task.repeatSeriesId === 'string' ? task.repeatSeriesId.trim() : '';
      const hasTodayVirtualInstance = !!repeatSeriesId && todayVirtualSeriesIds.has(repeatSeriesId);
      let dateKey: TableDateGroupKey = 'other';
      if (hasTodayVirtualInstance) {
        dateKey = 'today';
      } else if (dueTimestamp !== null && dueTimestamp < todayStart) {
        dateKey = 'overdue';
      } else if (groupingTimestamp !== null) {
        if (groupingTimestamp >= todayStart && groupingTimestamp < tomorrowStart) {
          dateKey = 'today';
        } else if (groupingTimestamp >= weekStartTimestamp && groupingTimestamp < weekEnd) {
          dateKey = 'thisWeek';
        } else if (groupingTimestamp >= monthStart && groupingTimestamp < monthEnd) {
          dateKey = 'thisMonth';
        }
      }
      const list = buckets.get(dateKey);
      if (list) {
        list.push(task);
      }
    }

    return dateGroupOrder
      .map(group => ({
        key: `date:${group.id}`,
        id: `date:${group.id}`,
        mode: 'date' as const,
        label: group.label,
        style: group.style,
        tasks: buckets.get(group.id) || []
      }))
      .filter(group => group.tasks.length > 0);
  }

  return [];
});
const collapsedGroups = ref<Set<string>>(new Set());
const datePopoverValue = computed(() => {
  if (!datePopoverTaskId.value) return '';
  const task = props.tasks.find(t => t.id === datePopoverTaskId.value);
  if (!task) return '';
  return datePopoverField.value === 'startDate'
    ? (task.startDate || '')
    : (task.dueDate || '');
});

const groupPopoverSelectedId = computed(() => {
  const popover = groupPopover.value;
  if (!popover) return TASK_GROUP_NONE_ID;
  const task = props.tasks.find(t => t.id === popover.taskId);
  const groupId = typeof task?.groupId === 'string' ? task.groupId.trim() : '';
  return groupId || TASK_GROUP_NONE_ID;
});

const groupPopoverStyle = computed(() => {
  if (!groupPopover.value) return {};
  return {
    left: `${groupPopover.value.position.x}px`,
    top: `${groupPopover.value.position.y}px`,
    transform: 'translateX(-50%)'
  };
});

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

function openDatePopover(task: Task, field: DateField, event: MouseEvent): void {
  groupPopover.value = null;
  datePopoverTaskId.value = task.id;
  datePopoverField.value = field;
  datePopoverAnchorRef.value = event.currentTarget as HTMLElement | null;
  datePopoverVisible.value = true;
}

function closeDatePopover(): void {
  datePopoverVisible.value = false;
  datePopoverAnchorRef.value = null;
  datePopoverTaskId.value = '';
}

function handleDatePopoverSelect(value: string): void {
  if (!datePopoverTaskId.value) {
    closeDatePopover();
    return;
  }
  const task = props.tasks.find(t => t.id === datePopoverTaskId.value);
  if (!task) {
    closeDatePopover();
    return;
  }
  if (datePopoverField.value === 'startDate') {
    emit('startDateUpdate', task, value);
  } else {
    emit('dueDateUpdate', task, value);
  }
}

function handleTableScroll(): void {
  const container = tableContainerRef.value;
  if (datePopoverVisible.value) {
    closeDatePopover();
  }
  if (groupPopover.value) {
    groupPopover.value = null;
  }
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
  document.addEventListener('mousedown', handleDocumentMouseDown);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleDocumentMouseDown);
});

function toggleSort(column: SortableColumn) {
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

function getSortIndicatorClass(column: SortableColumn): Record<string, boolean> {
  const isActive = sortColumn.value === column;
  return {
    'is-active': isActive,
    'is-asc': isActive && sortDirection.value === 'asc',
    'is-desc': isActive && sortDirection.value === 'desc'
  };
}

function getTaskGroupId(task: Task): string {
  return typeof task.groupId === 'string' ? task.groupId.trim() : '';
}

function getTaskGroupLabel(task: Task): string {
  const groupId = getTaskGroupId(task);
  if (!groupId) return '';
  return groupLookup.value.get(groupId)?.name || '';
}

function getTaskGroupStyle(task: Task): Record<string, string> | undefined {
  const groupId = getTaskGroupId(task);
  if (!groupId) return undefined;
  const meta = groupLookup.value.get(groupId);
  if (!meta || !meta.background) return undefined;
  return {
    '--group-badge-bg': meta.background,
    '--group-badge-color': meta.color
  };
}

function getGroupKey(groupId: string): string {
  return groupId || '__none__';
}

function isGroupCollapsed(groupId: string): boolean {
  return collapsedGroups.value.has(getGroupKey(groupId));
}

function toggleGroupCollapse(groupId: string): void {
  const key = getGroupKey(groupId);
  const next = new Set(collapsedGroups.value);
  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }
  collapsedGroups.value = next;
}

function getGroupSampleBlockTask(group: TableTaskGroupSection): Task | null {
  return group.tasks.find(task => task.type === 'block' && task.isVirtual !== true) || null;
}

function isActionableGroupMode(mode: TableTaskGroupSection['mode']): mode is 'group' | 'heading' {
  return mode === 'group' || mode === 'heading';
}

function canCreateTaskForGroup(group: TableTaskGroupSection): boolean {
  if (!isActionableGroupMode(group.mode)) {
    return false;
  }
  if (group.mode === 'group') {
    return true;
  }
  const sampleTask = getGroupSampleBlockTask(group);
  const rootId = typeof sampleTask?.rootId === 'string' ? sampleTask.rootId.trim() : '';
  return !!rootId;
}

function getGroupArchivableTaskIds(group: TableTaskGroupSection): string[] {
  return group.tasks
    .filter(task =>
      task.type === 'block'
      && task.isVirtual !== true
      && task.archived !== true
      && typeof task.id === 'string'
      && task.id.length > 0
    )
    .map(task => task.id);
}

function getGroupArchivableTaskCount(group: TableTaskGroupSection): number {
  return getGroupArchivableTaskIds(group).length;
}

function getGroupCreateTaskLabel(group: TableTaskGroupSection): string {
  const title = (group.label || '当前分组').trim() || '当前分组';
  return `在“${title}”分组新建任务`;
}

function getGroupArchiveTasksLabel(group: TableTaskGroupSection): string {
  const title = (group.label || '当前分组').trim() || '当前分组';
  const count = getGroupArchivableTaskCount(group);
  if (count > 0) {
    return `归档“${title}”分组全部 ${count} 个任务`;
  }
  return `归档“${title}”分组全部任务`;
}

function emitGroupCreateTask(group: TableTaskGroupSection): void {
  if (!isActionableGroupMode(group.mode)) {
    return;
  }
  const sampleTask = getGroupSampleBlockTask(group);
  emit('groupCreateTask', {
    mode: group.mode,
    groupId: group.id,
    groupLabel: group.label,
    sampleTaskId: sampleTask?.id
  });
}

function emitGroupArchiveTasks(group: TableTaskGroupSection): void {
  if (!isActionableGroupMode(group.mode)) {
    return;
  }
  emit('groupArchiveTasks', {
    mode: group.mode,
    groupId: group.id,
    groupLabel: group.label,
    taskIds: getGroupArchivableTaskIds(group)
  });
}

function handleTaskClick(task: Task, event?: MouseEvent) {
  emit('taskClick', task, event);
}

function getTitleHtml(title?: string): string {
  return sanitizeTaskTitleHtml(title || '');
}

function handleOpenClick(task: Task) {
  emit('openClick', task);
}

function toggleTaskStatus(task: Task) {
  emit('statusToggle', task);
}

function toggleSubtaskStatus(task: Task, subtask: Task['subtasks'][0]) {
  emit('subtaskToggle', task, subtask);
}

function getDescriptionDraft(task: Task): string {
  if (descriptionDraftByTaskId.value.has(task.id)) {
    return descriptionDraftByTaskId.value.get(task.id) || '';
  }
  return task.description || '';
}

function startDescriptionEdit(task: Task) {
  if (editingDescriptions.value.has(task.id)) {
    return;
  }

  const activeEditingId = editingDescriptions.value.values().next().value as string | undefined;
  if (activeEditingId && activeEditingId !== task.id) {
    const activeTask = props.tasks.find(item => item.id === activeEditingId);
    if (activeTask) {
      commitDescriptionEdit(activeTask);
    } else {
      editingDescriptions.value.delete(activeEditingId);
      descriptionDraftByTaskId.value.delete(activeEditingId);
    }
  }

  editingDescriptions.value.clear();
  editingDescriptions.value.add(task.id);
  descriptionDraftByTaskId.value.set(task.id, task.description || '');

  nextTick(() => {
    const textarea = document.querySelector(`.task-description-edit[data-task-id="${task.id}"]`) as HTMLTextAreaElement | null;
    if (textarea) {
      textarea.focus();
      const length = textarea.value.length;
      textarea.setSelectionRange(length, length);
    }
  });
}

function handleDescriptionInput(task: Task, event: Event) {
  const target = event.target as HTMLTextAreaElement | null;
  descriptionDraftByTaskId.value.set(task.id, target?.value ?? '');
}

function commitDescriptionEdit(task: Task) {
  if (!editingDescriptions.value.has(task.id)) {
    return;
  }

  const draft = descriptionDraftByTaskId.value.get(task.id) || '';
  editingDescriptions.value.delete(task.id);
  descriptionDraftByTaskId.value.delete(task.id);

  if (draft === (task.description || '')) {
    return;
  }

  emit('descriptionUpdate', task, draft);
}

function cancelDescriptionEdit(taskId: string) {
  if (!editingDescriptions.value.has(taskId)) {
    return;
  }
  editingDescriptions.value.delete(taskId);
  descriptionDraftByTaskId.value.delete(taskId);
}

function togglePriorityEdit(task: Task, event: MouseEvent) {
  groupPopover.value = null;
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
  groupPopover.value = null;
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

function toggleGroupPopover(task: Task, event: MouseEvent): void {
  if (groupPopover.value && groupPopover.value.taskId === task.id) {
    groupPopover.value = null;
    return;
  }
  priorityPopover.value = null;
  statusPopover.value = null;
  closeDatePopover();
  const target = event.currentTarget as HTMLElement | null;
  if (!target) return;
  const rect = target.getBoundingClientRect();
  groupPopover.value = {
    taskId: task.id,
    position: {
      x: rect.left + rect.width / 2,
      y: rect.bottom + 6
    }
  };
}

function selectGroupFromPopover(value: string): void {
  const popover = groupPopover.value;
  if (!popover) return;
  const task = props.tasks.find(t => t.id === popover.taskId);
  groupPopover.value = null;
  if (!task) return;
  const nextGroupId = value === TASK_GROUP_NONE_ID ? '' : value;
  const normalized = typeof nextGroupId === 'string' ? nextGroupId.trim() : '';
  const currentGroupId = typeof task.groupId === 'string' ? task.groupId.trim() : '';
  if (normalized === currentGroupId) return;
  emit('groupUpdate', task, normalized);
}

function handleGroupManage(): void {
  groupPopover.value = null;
  emit('manage-groups');
}

function handleDocumentMouseDown(event: MouseEvent): void {
  if (!groupPopover.value && !priorityPopover.value && !statusPopover.value && !datePopoverVisible.value) {
    return;
  }
  const target = event.target as HTMLElement | null;
  if (!target) return;
  if (
    target.closest('.group-popover') ||
    target.closest('.priority-popover') ||
    target.closest('.status-popover') ||
    target.closest('.date-popover')
  ) {
    return;
  }
  if (
    target.closest('.col-group') ||
    target.closest('.col-priority') ||
    target.closest('.col-status-text') ||
    target.closest('.col-start-date') ||
    target.closest('.col-due-date')
  ) {
    return;
  }
  groupPopover.value = null;
  priorityPopover.value = null;
  statusPopover.value = null;
  if (datePopoverVisible.value) {
    closeDatePopover();
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
  --sort-indicator-active: #f98f7a;
  display: flex;
  align-items: center;
  color: var(--b3-theme-on-surface);
  opacity: 0.38;
  transition: opacity 0.15s ease;
}

.sort-indicator svg {
  display: block;
}

.sort-indicator-top,
.sort-indicator-bottom {
  fill: currentColor;
  opacity: 0.4;
  transition: fill 0.15s ease, opacity 0.15s ease;
}

.sortable:hover .sort-indicator {
  opacity: 0.6;
}

.sortable.active .sort-indicator {
  opacity: 1;
}

.sort-indicator.is-active .sort-indicator-top,
.sort-indicator.is-active .sort-indicator-bottom {
  opacity: 0.45;
}

.sort-indicator.is-asc .sort-indicator-top,
.sort-indicator.is-desc .sort-indicator-bottom {
  fill: var(--sort-indicator-active);
  opacity: 1;
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

.group-row td {
  padding: 0;
  background: transparent;
  border-bottom: 1px solid var(--b3-border-color);
}

.group-row-content {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--group-badge-color, var(--b3-theme-on-surface));
  width: 100%;
  padding: 6px 12px;
  background: var(--group-badge-bg, var(--b3-list-hover));
  border: none;
  text-align: left;
  cursor: pointer;
}

.group-row-content:focus-visible {
  outline: 2px solid var(--b3-theme-primary);
  outline-offset: -2px;
}

.group-row-right {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.group-row-arrow {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transform: rotate(0deg);
  transform-origin: center;
  transition: transform 0.15s ease;
  flex-shrink: 0;
}

.group-row-arrow.collapsed {
  transform: rotate(-90deg);
}

.group-row-arrow svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.group-row-label {
  font-size: 13px;
}

.group-row-count {
  font-size: 11px;
  color: currentColor;
  opacity: 0.7;
}

.column-add-task-btn,
.column-archive-tasks-btn {
  border: none;
  background: transparent;
  color: var(--b3-theme-on-surface);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: background-color 0.2s ease, color 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.column-add-task-btn:hover,
.column-archive-tasks-btn:hover:not(:disabled) {
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
}

.column-add-task-btn:focus-visible,
.column-archive-tasks-btn:focus-visible {
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  outline: none;
}

.column-archive-tasks-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
  justify-content: space-between;
}

.title-main {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  flex: 1 1 auto;
  min-width: 0;
  cursor: pointer;
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
  flex: 1 1 auto;
  min-width: 0;
}

.title-open-btn {
  border: none;
  background: transparent;
  color: var(--b3-theme-on-surface);
  width: 22px;
  height: 22px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex: 0 0 auto;
  margin-top: 1px;
  opacity: 0.7;
  transition: background-color 0.15s ease, opacity 0.15s ease;
}

.title-open-btn:hover {
  background: var(--b3-list-hover);
  opacity: 1;
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
  border-radius: 6px;
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
  white-space: nowrap;
}

.col-group {
  width: 110px;
  text-align: center;
  cursor: pointer;
}

.group-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  line-height: 1.2;
  color: var(--group-badge-color, var(--b3-theme-on-surface));
  background: var(--group-badge-bg, var(--b3-list-hover));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tasks-table td.col-group:hover .group-badge.is-empty {
  background: var(--b3-list-hover);
}

.group-badge.is-empty {
  background: transparent;
  color: var(--b3-theme-on-surface);
  border: 1px dashed var(--b3-border-color);
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
  color: var(--pinch-group-color4);
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

.col-start-date,
.col-due-date,
.col-created-date,
.col-updated-date {
  width: 80px;
  text-align: center;
  white-space: nowrap;
  color: var(--b3-theme-on-surface);
  cursor: pointer;
  position: relative;
}

.col-status-text .th-content,
.col-start-date .th-content,
.col-due-date .th-content,
.col-created-date .th-content,
.col-updated-date .th-content {
  justify-content: center;
}

.date-display {
  display: block;
  padding: 4px 8px;
  text-align: center;
  transition: background-color 0.15s;
}

.col-start-date:hover .date-display,
.col-due-date:hover .date-display,
.col-created-date:hover .date-display,
.col-updated-date:hover .date-display {
  background: var(--b3-list-hover);
  border-radius: 4px;
}

.col-location {
  width: 18%;
  min-width: 120px;
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

.group-popover {
  position: fixed;
  background: var(--b3-theme-background);
  border: 1px solid var(--b3-border-color);
  border-radius: 10px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.16);
  padding: 10px;
  z-index: 1000;
  min-width: 200px;
  max-width: 280px;
}

.group-popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.group-popover-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--b3-theme-on-background);
}

.group-popover-manage {
  border: none;
  background: none;
  cursor: pointer;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
}

.group-popover-manage:hover {
  color: var(--b3-theme-on-background);
}

.group-popover-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.group-popover-chip {
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

.group-popover-chip.active {
  background: #f98f7a;
  color: var(--b3-theme-background);
  box-shadow: none;
}

.group-popover-chip:hover {
  color: var(--group-chip-color, var(--b3-theme-on-background));
}

.group-popover-chip-label {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: var(--b3-theme-on-surface);
  font-size: 14px;
}
</style>
