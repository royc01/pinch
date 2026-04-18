<template>
  <div
    class="table-view"
    ref="tableContainerRef"
    @scroll.passive="handleTableScroll"
  >
    <table class="tasks-table">
      <thead>
        <tr>
          <th class="col-expand"></th>
          <th class="col-status"></th>
          <th class="col-title">任务</th>
          <th class="col-description">描述</th>
          <th class="col-priority sortable" :class="{ active: sortColumn === 'priority' }" @click="toggleSort('priority')">
            <div class="th-content">
              <span>优先级</span>
              <span class="sort-indicator" :class="getSortIndicatorClass('priority')">
                <Icon name="sortIndicator" width="14" height="14" />
              </span>
            </div>
          </th>
          <th class="col-status-text sortable" :class="{ active: sortColumn === 'status' }" @click="toggleSort('status')">
            <div class="th-content">
              <span>状态</span>
              <span class="sort-indicator" :class="getSortIndicatorClass('status')">
                <Icon name="sortIndicator" width="14" height="14" />
              </span>
            </div>
          </th>
          <th class="col-group">标签</th>
          <th class="col-start-date sortable" :class="{ active: sortColumn === 'startDate' }" @click="toggleSort('startDate')">
            <div class="th-content">
              <span>开始日期</span>
              <span class="sort-indicator" :class="getSortIndicatorClass('startDate')">
                <Icon name="sortIndicator" width="14" height="14" />
              </span>
            </div>
          </th>
          <th class="col-start-time">
            <div class="th-content">
              <span>开始时间</span>
            </div>
          </th>
          <th class="col-due-date sortable" :class="{ active: sortColumn === 'dueDate' }" @click="toggleSort('dueDate')">
            <div class="th-content">
              <span>截止日期</span>
              <span class="sort-indicator" :class="getSortIndicatorClass('dueDate')">
                <Icon name="sortIndicator" width="14" height="14" />
              </span>
            </div>
          </th>
          <th class="col-due-time">
            <div class="th-content">
              <span>截止时间</span>
            </div>
          </th>
          <th class="col-created-date sortable" :class="{ active: sortColumn === 'createdAt' }" @click="toggleSort('createdAt')">
            <div class="th-content">
              <span>创建时间</span>
              <span class="sort-indicator" :class="getSortIndicatorClass('createdAt')">
                <Icon name="sortIndicator" width="14" height="14" />
              </span>
            </div>
          </th>
          <th class="col-updated-date sortable" :class="{ active: sortColumn === 'updatedAt' }" @click="toggleSort('updatedAt')">
            <div class="th-content">
              <span>更新时间</span>
              <span class="sort-indicator" :class="getSortIndicatorClass('updatedAt')">
                <Icon name="sortIndicator" width="14" height="14" />
              </span>
            </div>
          </th>
          <th class="col-location">位置</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="tableVirtualSpacerTop > 0" class="table-virtual-spacer-row" aria-hidden="true">
          <td
            :colspan="TABLE_COLUMN_COUNT"
            class="table-virtual-spacer-cell"
            :style="{ height: `${tableVirtualSpacerTop}px` }"
          ></td>
        </tr>
        <template v-for="row in visibleTableRows" :key="row.key">
          <tr
            v-if="row.kind === 'group'"
            class="group-row"
            :ref="(el) => setTableRowRef(row, el as HTMLTableRowElement | null)"
          >
            <td :colspan="TABLE_COLUMN_COUNT">
              <button
                type="button"
                class="group-row-content"
                :style="row.group.style"
                :aria-expanded="!isGroupCollapsed(row.group.id)"
                @click="toggleGroupCollapse(row.group.id)"
              >
                <span class="group-row-arrow" :class="{ collapsed: isGroupCollapsed(row.group.id) }" aria-hidden="true">
                  <Icon name="chevronDown" width="16" height="16" />
                </span>
                <span class="group-row-label">{{ row.group.label }}</span>
                <span class="group-row-right">
                  <span class="group-row-count">{{ row.group.tasks.length }} 项</span>
                  <button
                    v-if="supportsGroupActions && canCreateTaskForGroup(row.group)"
                    type="button"
                    class="column-add-task-btn"
                    :title="getGroupCreateTaskLabel(row.group)"
                    :aria-label="getGroupCreateTaskLabel(row.group)"
                    @click.stop="emitGroupCreateTask(row.group)"
                  >
                    <Icon name="addPlain" width="16" height="16" />
                  </button>
                  <button
                    v-if="supportsGroupActions"
                    type="button"
                    class="column-archive-tasks-btn"
                    :title="getGroupArchiveTasksLabel(row.group)"
                    :aria-label="getGroupArchiveTasksLabel(row.group)"
                    :disabled="getGroupArchivableTaskCount(row.group) === 0"
                    @click.stop="emitGroupArchiveTasks(row.group)"
                  >
                    <Icon name="archive" width="16" height="16" />
                  </button>
                </span>
              </button>
            </td>
          </tr>
          <tr
            v-else-if="row.kind === 'task'"
            class="task-row"
            :class="[
              `status-${row.task.status}`,
              `priority-${row.task.priority}`,
              {
                'task-completed': row.task.status === 'completed',
                'is-terminal-row': terminalTableRowKeys.has(row.key)
              }
            ]"
            :ref="(el) => setTableRowRef(row, el as HTMLTableRowElement | null)"
          >
            <td class="col-expand">
              <span
                v-if="row.task.subtasks && row.task.subtasks.length > 0"
                class="expand-arrow"
                :class="{ expanded: expandedTasks.has(row.task.id) }"
                @click.stop="toggleExpand(row.task.id)"
              >
                <Icon name="chevronRight" width="16" height="16" />
              </span>
              <span v-else class="expand-arrow-placeholder"></span>
            </td>
            <td class="col-status">
              <div class="task-checkbox-wrapper" @click.stop="toggleTaskStatus(row.task)">
                <TaskCheckbox :checked="row.task.status === 'completed'" :size="16" />
              </div>
            </td>
            <td class="col-title">
              <div class="title-wrapper">
                <div class="title-main" @click="handleTaskClick(row.task, $event)">
                  <span v-if="row.task.pinned === true" class="title-pinned-badge" title="已置顶" aria-label="已置顶">
                    <Icon name="pinBadge" width="18" height="18" />
                  </span>
                  <div class="task-title" v-html="getTitleHtml(row.task.title)"></div>
                </div>
                <button
                  type="button"
                  class="title-open-btn"
                  title="跳转到任务"
                  aria-label="跳转到任务"
                  @click.stop="handleOpenClick(row.task)"
                >
                  <Icon name="moreHorizontal" width="14" height="14" />
                </button>
              </div>
            </td>
            <td
              class="col-description"
              :class="{ 'is-editing': editingDescriptions.has(row.task.id) }"
              @click.stop="startDescriptionEdit(row.task)"
            >
              <div
                v-if="!editingDescriptions.has(row.task.id)"
                class="task-description"
                :class="{ editable: true, empty: !row.task.description }"
                v-html="row.task.description || '&nbsp;'"
              ></div>
              <textarea
                v-if="editingDescriptions.has(row.task.id)"
                class="task-description-edit"
                :data-task-id="row.task.id"
                :value="getDescriptionDraft(row.task)"
                @input.stop="handleDescriptionInput(row.task, $event)"
                @blur.stop="commitDescriptionEdit(row.task)"
                @keydown.ctrl.enter.prevent="commitDescriptionEdit(row.task)"
                @keydown.meta.enter.prevent="commitDescriptionEdit(row.task)"
                @keydown.esc.prevent="cancelDescriptionEdit(row.task.id)"
                @click.stop
                rows="2"
                placeholder="输入描述..."
              />
            </td>
            <td class="col-priority" @click.stop="togglePriorityEdit(row.task, $event)">
              <div class="priority-content">
                <span
                  v-if="row.task.priority !== 'none'"
                  class="task-priority-badge"
                  :class="`priority-${row.task.priority}`"
                  :title="row.task.priority === 'high' ? '高优先级' : row.task.priority === 'medium' ? '中优先级' : '低优先级'"
                >
                  <Icon name="flag" width="12" height="12" />
                </span>
              </div>
            </td>
            <td class="col-status-text" @click.stop="toggleStatusEdit(row.task, $event)">
              <span class="status-badge" :class="`status-${row.task.status}`">
                {{ getStatusLabel(row.task.status) }}
              </span>
            </td>
            <td class="col-group" @click.stop="toggleGroupPopover(row.task, $event)">
              <span
                v-if="getTaskGroupLabel(row.task)"
                class="group-badge"
                :style="getTaskGroupStyle(row.task)"
              >
                {{ getTaskGroupLabel(row.task) }}
              </span>
            </td>
            <td class="col-start-date" @click.stop="openDatePopover(row.task, 'startDate', $event)">
              <span class="date-display">{{ row.task.startDate ? formatLocaleDate(row.task.startDate) : '-' }}</span>
            </td>
            <td class="col-start-time" @click.stop="openTimePopover(row.task, 'startTime', $event)">
              <span class="time-display">{{ formatTaskTime(row.task.startTime) }}</span>
            </td>
            <td class="col-due-date" @click.stop="openDatePopover(row.task, 'dueDate', $event)">
              <span class="date-display">{{ row.task.dueDate ? formatLocaleDate(row.task.dueDate) : '-' }}</span>
            </td>
            <td class="col-due-time" @click.stop="openTimePopover(row.task, 'dueTime', $event)">
              <span class="time-display">{{ formatTaskTime(row.task.dueTime) }}</span>
            </td>
            <td class="col-created-date">
              <span class="date-display">{{ row.task.createdAt ? formatLocaleDate(row.task.createdAt, { includeTime: true }) : '-' }}</span>
            </td>
            <td class="col-updated-date">
              <span class="date-display">{{ row.task.updatedAt ? formatLocaleDate(row.task.updatedAt, { includeTime: true }) : '-' }}</span>
            </td>
            <td class="col-location">
              <div class="location-cell task-document-title" :title="row.task.hPath || ''">
                <span class="task-document-icon" aria-hidden="true">
                  <img
                    v-if="getTaskDocumentIconImageSrc(row.task)"
                    class="task-document-icon-image"
                    :src="getTaskDocumentIconImageSrc(row.task)"
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                  <span v-else>{{ getTaskDocumentIconText(row.task) }}</span>
                </span>
                <span class="task-document-title-text">{{ getTaskDocumentTitleText(row.task) }}</span>
              </div>
            </td>
          </tr>
          <tr
            v-else
            class="subtask-row"
            :class="{
              'subtask-completed': row.subtask.completed,
              'is-terminal-row': terminalTableRowKeys.has(row.key)
            }"
            :ref="(el) => setTableRowRef(row, el as HTMLTableRowElement | null)"
          >
            <td class="col-expand"></td>
            <td class="col-status"></td>
            <td class="col-title">
              <div class="subtask-title-cell">
                <div class="subtask-checkbox-wrapper" @click.stop="toggleSubtaskStatus(row.task, row.subtask)">
                  <TaskCheckbox :checked="row.subtask.completed" :size="14" />
                </div>
                <span class="subtask-title" v-html="getTitleHtml(row.subtask.title)"></span>
                <SubtaskProgress
                  v-if="row.subtask.subtasks && row.subtask.subtasks.length > 0"
                  :subtasks="row.subtask.subtasks"
                />
              </div>
            </td>
            <td
              class="col-description"
              :class="{ 'is-editing': isSubtaskDescriptionEditing(row.task, row.subtask) }"
            >
              <div
                v-if="!isSubtaskDescriptionEditing(row.task, row.subtask)"
                class="task-description"
                :class="{ editable: true, empty: !getSubtaskDescription(row.subtask) }"
                v-html="getSubtaskDescription(row.subtask) || '&nbsp;'"
                @click.stop="startSubtaskDescriptionEdit(row.task, row.subtask)"
              ></div>
              <textarea
                v-else
                class="task-description-edit subtask-description-edit"
                :data-subtask-key="getSubtaskEditKey(row.task.id, row.subtask.id)"
                :value="getSubtaskDescriptionDraft(row.task, row.subtask)"
                @input.stop="handleSubtaskDescriptionInput(row.task, row.subtask, $event)"
                @blur.stop="commitSubtaskDescriptionEdit(row.task, row.subtask)"
                @keydown.ctrl.enter.prevent="commitSubtaskDescriptionEdit(row.task, row.subtask)"
                @keydown.meta.enter.prevent="commitSubtaskDescriptionEdit(row.task, row.subtask)"
                @keydown.esc.prevent="cancelSubtaskDescriptionEdit(row.task, row.subtask)"
                @click.stop
                rows="2"
                placeholder="输入描述..."
              />
            </td>
            <td class="col-priority" @click.stop="toggleSubtaskPriorityEdit(row.task, row.subtask, $event)">
              <div class="priority-content">
                <span
                  v-if="getSubtaskPriority(row.subtask) !== 'none'"
                  class="task-priority-badge"
                  :class="`priority-${getSubtaskPriority(row.subtask)}`"
                  :title="getSubtaskPriority(row.subtask) === 'high' ? '高优先级' : getSubtaskPriority(row.subtask) === 'medium' ? '中优先级' : '低优先级'"
                >
                  <Icon name="flag" width="12" height="12" />
                </span>
              </div>
            </td>
            <td class="col-status-text" @click.stop="toggleSubtaskStatusEdit(row.task, row.subtask, $event)">
              <span class="status-badge" :class="`status-${getSubtaskStatus(row.subtask)}`">
                {{ getStatusLabel(getSubtaskStatus(row.subtask)) }}
              </span>
            </td>
            <td class="col-group" @click.stop="toggleSubtaskGroupPopover(row.task, row.subtask, $event)">
              <span
                v-if="getSubtaskGroupLabel(row.subtask)"
                class="group-badge"
                :style="getSubtaskGroupStyle(row.subtask)"
              >
                {{ getSubtaskGroupLabel(row.subtask) }}
              </span>
            </td>
            <td class="col-start-date" @click.stop="openSubtaskDatePopover(row.task, row.subtask, 'startDate', $event)">
              <span class="date-display">{{ row.subtask.startDate ? formatLocaleDate(row.subtask.startDate) : '-' }}</span>
            </td>
            <td class="col-start-time" @click.stop="openSubtaskTimePopover(row.task, row.subtask, 'startTime', $event)">
              <span class="time-display">{{ formatTaskTime(row.subtask.startTime) }}</span>
            </td>
            <td class="col-due-date" @click.stop="openSubtaskDatePopover(row.task, row.subtask, 'dueDate', $event)">
              <span class="date-display">{{ row.subtask.dueDate ? formatLocaleDate(row.subtask.dueDate) : '-' }}</span>
            </td>
            <td class="col-due-time" @click.stop="openSubtaskTimePopover(row.task, row.subtask, 'dueTime', $event)">
              <span class="time-display">{{ formatTaskTime(row.subtask.dueTime) }}</span>
            </td>
            <td class="col-created-date">
              <span class="date-display">{{ row.subtask.createdAt ? formatLocaleDate(row.subtask.createdAt, { includeTime: true }) : '-' }}</span>
            </td>
            <td class="col-updated-date">
              <span class="date-display">{{ row.subtask.updatedAt ? formatLocaleDate(row.subtask.updatedAt, { includeTime: true }) : '-' }}</span>
            </td>
            <td class="col-location">
              <div class="location-cell task-document-title" :title="row.task.hPath || ''">
                <span class="task-document-icon" aria-hidden="true">
                  <img
                    v-if="getTaskDocumentIconImageSrc(row.task)"
                    class="task-document-icon-image"
                    :src="getTaskDocumentIconImageSrc(row.task)"
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                  <span v-else>{{ getTaskDocumentIconText(row.task) }}</span>
                </span>
                <span class="task-document-title-text">{{ getTaskDocumentTitleText(row.task) }}</span>
              </div>
            </td>
          </tr>
        </template>
        <tr v-if="tableVirtualSpacerBottom > 0" class="table-virtual-spacer-row" aria-hidden="true">
          <td
            :colspan="TABLE_COLUMN_COUNT"
            class="table-virtual-spacer-cell"
            :style="{ height: `${tableVirtualSpacerBottom}px` }"
          ></td>
        </tr>
      </tbody>
    </table>
    
    <PriorityPopover
      v-if="priorityPopover"
      :show="true"
      :position="priorityPopover.position"
      @select="handlePrioritySelect"
      @close="priorityPopover = null"
    />
    
    <StatusPopover
      v-if="statusPopover"
      :show="true"
      :position="statusPopover.position"
      @select="handleStatusSelect"
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

    <TaskTimePopover
      :visible="timePopoverVisible"
      :anchor-el="timePopoverAnchorRef"
      :model-value="timePopoverValue"
      @update:modelValue="handleTimePopoverSelect"
      @close="closeTimePopover"
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
import TaskTimePopover from '@/components/TaskTimePopover.vue';
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
  documentIconByRootId?: Map<string, string>;
}

type TableTaskGroupSection = {
  key: string;
  id: string;
  mode: 'group' | 'heading' | 'date';
  label: string;
  tasks: Task[];
  style?: Record<string, string>;
};

type TableVirtualGroupRow = {
  kind: 'group';
  key: string;
  heightKey: string;
  group: TableTaskGroupSection;
};

type TableVirtualTaskRow = {
  kind: 'task';
  key: string;
  heightKey: string;
  task: Task;
};

type TableVirtualSubtaskRow = {
  kind: 'subtask';
  key: string;
  heightKey: string;
  task: Task;
  subtask: TableSubtask;
};

type TableVirtualRow = TableVirtualGroupRow | TableVirtualTaskRow | TableVirtualSubtaskRow;

const props = defineProps<Props>();

const TABLE_COLUMN_COUNT = 14;
const TABLE_VIRTUAL_THRESHOLD = 120;
const TABLE_VIRTUAL_OVERSCAN = 10;
const TABLE_GROUP_ROW_HEIGHT = 38;
const TABLE_TASK_ROW_HEIGHT = 52;
const TABLE_SUBTASK_ROW_HEIGHT = 44;

const TASK_GROUP_NONE_ID = '__none__';
type TableSubtask = NonNullable<Task['subtasks']>[number];
type TablePopoverTarget = {
  taskId: string;
  subtaskId?: string;
  position: { x: number; y: number };
};

const emit = defineEmits<{
  taskClick: [task: Task, event?: MouseEvent];
  openClick: [task: Task];
  statusToggle: [task: Task];
  subtaskToggle: [task: Task, subtask: TableSubtask];
  descriptionUpdate: [task: Task, description: string];
  priorityUpdate: [task: Task, priority: Task['priority']];
  statusUpdate: [task: Task, status: Task['status']];
  groupUpdate: [task: Task, groupId: string];
  subtaskDescriptionUpdate: [task: Task, subtask: TableSubtask, description: string];
  subtaskPriorityUpdate: [task: Task, subtask: TableSubtask, priority: Task['priority']];
  subtaskStatusUpdate: [task: Task, subtask: TableSubtask, status: Task['status']];
  subtaskGroupUpdate: [task: Task, subtask: TableSubtask, groupId: string];
  subtaskStartDateUpdate: [task: Task, subtask: TableSubtask, startDate: string];
  subtaskDueDateUpdate: [task: Task, subtask: TableSubtask, dueDate: string];
  subtaskStartTimeUpdate: [task: Task, subtask: TableSubtask, startTime: string];
  subtaskDueTimeUpdate: [task: Task, subtask: TableSubtask, dueTime: string];
  'manage-groups': [];
  groupCreateTask: [payload: { mode: 'group' | 'heading'; groupId: string; groupLabel: string; sampleTaskId?: string }];
  groupArchiveTasks: [payload: { mode: 'group' | 'heading'; groupId: string; groupLabel: string; taskIds: string[] }];
  startDateUpdate: [task: Task, startDate: string];
  dueDateUpdate: [task: Task, dueDate: string];
  startTimeUpdate: [task: Task, startTime: string];
  dueTimeUpdate: [task: Task, dueTime: string];
}>();

const expandedTasks = ref<Set<string>>(new Set());
const editingDescriptions = ref<Set<string>>(new Set());
const descriptionDraftByTaskId = ref(new Map<string, string>());
const editingSubtaskDescriptions = ref<Set<string>>(new Set());
const subtaskDescriptionDraftByKey = ref(new Map<string, string>());
const priorityPopover = ref<TablePopoverTarget | null>(null);
const statusPopover = ref<TablePopoverTarget | null>(null);
const groupPopover = ref<TablePopoverTarget | null>(null);
type SortableColumn = 'priority' | 'status' | 'startDate' | 'dueDate' | 'createdAt' | 'updatedAt';

const sortColumn = ref<SortableColumn | null>(null);
const sortDirection = ref<'asc' | 'desc'>('asc');
const tableContainerRef = ref<HTMLElement | null>(null);
const tableScrollTop = ref(0);
const tableViewportHeight = ref(0);
const tableRowHeights = ref<Record<string, number>>({});
const tableVisibleRowElements = new Map<string, HTMLTableRowElement>();
let tableMetricsRaf: number | null = null;
let tableMeasureRaf: number | null = null;
let tableScrollSettleTimer: number | null = null;
let isTableScrollActive = false;
type DateField = 'startDate' | 'dueDate';
type TimeField = 'startTime' | 'dueTime';
const datePopoverVisible = ref(false);
const datePopoverTaskId = ref('');
const datePopoverSubtaskId = ref('');
const datePopoverField = ref<DateField>('dueDate');
const datePopoverAnchorRef = ref<HTMLElement | null>(null);
const timePopoverVisible = ref(false);
const timePopoverTaskId = ref('');
const timePopoverSubtaskId = ref('');
const timePopoverField = ref<TimeField>('dueTime');
const timePopoverAnchorRef = ref<HTMLElement | null>(null);

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

function normalizeTaskTimeValue(value: unknown): string {
  const rawValue = typeof value === 'string' ? value.trim() : '';
  if (!rawValue) {
    return '';
  }
  const match = rawValue.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match) {
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return `${String(hour).padStart(2, '0')}:${match[2]}`;
    }
  }
  return '';
}

function formatTaskTime(value: unknown): string {
  return normalizeTaskTimeValue(value) || '-';
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

const groupedTasks = computed<TableTaskGroupSection[]>(() => {
  if (!isGroupedDisplayMode.value) return [];
  if (resolvedGroupMode.value === 'group') {
    const buckets = new Map<string, Task[]>();
    for (const task of sortedTasks.value) {
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
    for (const task of sortedTasks.value) {
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

    for (const task of sortedTasks.value) {
      if (task.isVirtual && task.repeatSeriesId && isVirtualTaskForToday(task)) {
        todayVirtualSeriesIds.add(task.repeatSeriesId);
      }
    }

    for (const task of sortedTasks.value) {
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

function buildTaskVirtualRows(task: Task): TableVirtualRow[] {
  const rows: TableVirtualRow[] = [
    {
      kind: 'task',
      key: `task:${task.id}`,
      heightKey: `task:${task.id}`,
      task
    }
  ];
  if (task.subtasks && task.subtasks.length > 0 && expandedTasks.value.has(task.id)) {
    for (const subtask of task.subtasks) {
      rows.push({
        kind: 'subtask',
        key: `subtask:${task.id}:${subtask.id}`,
        heightKey: `subtask:${task.id}:${subtask.id}`,
        task,
        subtask
      });
    }
  }
  return rows;
}

const tableRows = computed<TableVirtualRow[]>(() => {
  if (!isGroupedDisplayMode.value) {
    return sortedTasks.value.flatMap(task => buildTaskVirtualRows(task));
  }

  const rows: TableVirtualRow[] = [];
  for (const group of groupedTasks.value) {
    rows.push({
      kind: 'group',
      key: `group:${group.key}`,
      heightKey: `group:${group.key}`,
      group
    });
    if (isGroupCollapsed(group.id)) {
      continue;
    }
    for (const task of group.tasks) {
      rows.push(...buildTaskVirtualRows(task));
    }
  }
  return rows;
});

const terminalTableRowKeys = computed(() => {
  const terminalKeys = new Set<string>();
  const rows = tableRows.value;
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (row.kind === 'group') {
      continue;
    }
    const nextRow = rows[index + 1];
    if (!nextRow || nextRow.kind === 'group') {
      terminalKeys.add(row.key);
    }
  }
  return terminalKeys;
});

function getEstimatedTableRowHeight(row: TableVirtualRow): number {
  if (row.kind === 'group') {
    return TABLE_GROUP_ROW_HEIGHT;
  }
  if (row.kind === 'subtask') {
    return TABLE_SUBTASK_ROW_HEIGHT;
  }
  return TABLE_TASK_ROW_HEIGHT;
}

function getMeasuredTableRowHeight(row: TableVirtualRow): number {
  return tableRowHeights.value[row.heightKey] || getEstimatedTableRowHeight(row);
}

const shouldUseTableVirtualList = computed(() => tableRows.value.length > TABLE_VIRTUAL_THRESHOLD);

const tableRowMetrics = computed(() => {
  const tops: number[] = [];
  const bottoms: number[] = [];
  let total = 0;
  for (const row of tableRows.value) {
    tops.push(total);
    total += getMeasuredTableRowHeight(row);
    bottoms.push(total);
  }
  return {
    tops,
    bottoms,
    total
  };
});

function findTableRowStartIndex(bottoms: number[], offset: number): number {
  let low = 0;
  let high = bottoms.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (bottoms[mid] <= offset) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
}

function findTableRowEndIndex(tops: number[], offset: number): number {
  let low = 0;
  let high = tops.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (tops[mid] < offset) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
}

const tableVirtualRange = computed(() => {
  const rows = tableRows.value;
  if (rows.length === 0) {
    return { start: 0, end: 0, top: 0, bottom: 0 };
  }
  if (!shouldUseTableVirtualList.value) {
    return { start: 0, end: rows.length, top: 0, bottom: 0 };
  }
  const viewportHeight = tableViewportHeight.value || tableContainerRef.value?.clientHeight || 600;
  const scrollTop = tableScrollTop.value;
  const { tops, bottoms, total } = tableRowMetrics.value;
  const firstVisibleIndex = findTableRowStartIndex(bottoms, scrollTop);
  const lastVisibleIndex = findTableRowEndIndex(tops, scrollTop + viewportHeight);
  const start = Math.max(0, firstVisibleIndex - TABLE_VIRTUAL_OVERSCAN);
  const end = Math.min(rows.length, Math.max(lastVisibleIndex + TABLE_VIRTUAL_OVERSCAN, start + 1));
  const top = tops[start] || 0;
  const bottom = Math.max(0, total - (tops[end] ?? total));
  return { start, end, top, bottom };
});

const visibleTableRows = computed(() =>
  tableRows.value.slice(tableVirtualRange.value.start, tableVirtualRange.value.end)
);
const tableVirtualSpacerTop = computed(() => tableVirtualRange.value.top);
const tableVirtualSpacerBottom = computed(() => tableVirtualRange.value.bottom);

function setTableRowRef(row: TableVirtualRow, el: HTMLTableRowElement | null): void {
  if (!el) {
    tableVisibleRowElements.delete(row.heightKey);
    return;
  }
  tableVisibleRowElements.set(row.heightKey, el);
  if (!isTableScrollActive) {
    scheduleTableRowMeasurement();
  }
}
const collapsedGroups = ref<Set<string>>(new Set());

function findSubtaskById(subtasks: Task['subtasks'], subtaskId: string): TableSubtask | null {
  if (!subtasks || subtasks.length === 0) {
    return null;
  }
  for (const subtask of subtasks) {
    if (subtask.id === subtaskId) {
      return subtask;
    }
    const nested = findSubtaskById(subtask.subtasks, subtaskId);
    if (nested) {
      return nested;
    }
  }
  return null;
}

const datePopoverValue = computed(() => {
  if (!datePopoverTaskId.value) return '';
  const task = props.tasks.find(t => t.id === datePopoverTaskId.value);
  if (!task) return '';
  const subtaskId = datePopoverSubtaskId.value.trim();
  if (subtaskId) {
    const subtask = findSubtaskById(task.subtasks, subtaskId);
    if (!subtask) return '';
    return datePopoverField.value === 'startDate'
      ? (subtask.startDate || '')
      : (subtask.dueDate || '');
  }
  return datePopoverField.value === 'startDate'
    ? (task.startDate || '')
    : (task.dueDate || '');
});

const timePopoverValue = computed(() => {
  if (!timePopoverTaskId.value) return '';
  const task = props.tasks.find(t => t.id === timePopoverTaskId.value);
  if (!task) return '';
  const subtaskId = timePopoverSubtaskId.value.trim();
  if (subtaskId) {
    const subtask = findSubtaskById(task.subtasks, subtaskId);
    if (!subtask) return '';
    return timePopoverField.value === 'startTime'
      ? normalizeTaskTimeValue(subtask.startTime)
      : normalizeTaskTimeValue(subtask.dueTime);
  }
  return timePopoverField.value === 'startTime'
    ? normalizeTaskTimeValue(task.startTime)
    : normalizeTaskTimeValue(task.dueTime);
});

const groupPopoverSelectedId = computed(() => {
  const popover = groupPopover.value;
  if (!popover) return TASK_GROUP_NONE_ID;
  const task = props.tasks.find(t => t.id === popover.taskId);
  if (!task) return TASK_GROUP_NONE_ID;
  if (popover.subtaskId) {
    const subtask = findSubtaskById(task.subtasks, popover.subtaskId);
    const subtaskGroupId = typeof subtask?.groupId === 'string' ? subtask.groupId.trim() : '';
    return subtaskGroupId || TASK_GROUP_NONE_ID;
  }
  const groupId = typeof task.groupId === 'string' ? task.groupId.trim() : '';
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

function syncTableViewportMetrics(): void {
  const container = tableContainerRef.value;
  if (!container) {
    return;
  }
  tableScrollTop.value = container.scrollTop;
  tableViewportHeight.value = container.clientHeight;
}

function measureVisibleTableRowHeights(): void {
  if (tableVisibleRowElements.size === 0) {
    return;
  }
  let nextHeights: Record<string, number> | null = null;
  for (const [heightKey, element] of tableVisibleRowElements.entries()) {
    if (!element.isConnected) {
      tableVisibleRowElements.delete(heightKey);
      continue;
    }
    const nextHeight = Math.ceil(element.getBoundingClientRect().height);
    if (!Number.isFinite(nextHeight) || nextHeight <= 0) {
      continue;
    }
    const currentHeight = tableRowHeights.value[heightKey];
    if (typeof currentHeight === 'number' && Math.abs(currentHeight - nextHeight) <= 1) {
      continue;
    }
    if (!nextHeights) {
      nextHeights = { ...tableRowHeights.value };
    }
    nextHeights[heightKey] = nextHeight;
  }
  if (nextHeights) {
    tableRowHeights.value = nextHeights;
  }
}

function scheduleTableRowMeasurement(): void {
  if (tableMeasureRaf !== null) {
    cancelAnimationFrame(tableMeasureRaf);
  }
  tableMeasureRaf = window.requestAnimationFrame(() => {
    tableMeasureRaf = null;
    measureVisibleTableRowHeights();
  });
}

function scheduleTableScrollSettle(): void {
  if (tableScrollSettleTimer !== null) {
    clearTimeout(tableScrollSettleTimer);
  }
  tableScrollSettleTimer = window.setTimeout(() => {
    tableScrollSettleTimer = null;
    isTableScrollActive = false;
    scheduleTableRowMeasurement();
  }, 140);
}

function scheduleTableViewportMetrics(): void {
  if (tableMetricsRaf !== null) {
    cancelAnimationFrame(tableMetricsRaf);
  }
  tableMetricsRaf = window.requestAnimationFrame(() => {
    tableMetricsRaf = null;
    syncTableViewportMetrics();
  });
}

function handleTableViewportResize(): void {
  isTableScrollActive = false;
  scheduleTableViewportMetrics();
  scheduleTableRowMeasurement();
}

function openDatePopover(task: Task, field: DateField, event: MouseEvent): void {
  groupPopover.value = null;
  priorityPopover.value = null;
  statusPopover.value = null;
  closeTimePopover();
  datePopoverTaskId.value = task.id;
  datePopoverSubtaskId.value = '';
  datePopoverField.value = field;
  datePopoverAnchorRef.value = event.currentTarget as HTMLElement | null;
  datePopoverVisible.value = true;
}

function openSubtaskDatePopover(task: Task, subtask: TableSubtask, field: DateField, event: MouseEvent): void {
  groupPopover.value = null;
  priorityPopover.value = null;
  statusPopover.value = null;
  closeTimePopover();
  datePopoverTaskId.value = task.id;
  datePopoverSubtaskId.value = subtask.id;
  datePopoverField.value = field;
  datePopoverAnchorRef.value = event.currentTarget as HTMLElement | null;
  datePopoverVisible.value = true;
}

function closeDatePopover(): void {
  datePopoverVisible.value = false;
  datePopoverAnchorRef.value = null;
  datePopoverTaskId.value = '';
  datePopoverSubtaskId.value = '';
}

function openTimePopover(task: Task, field: TimeField, event: MouseEvent): void {
  groupPopover.value = null;
  priorityPopover.value = null;
  statusPopover.value = null;
  closeDatePopover();
  timePopoverTaskId.value = task.id;
  timePopoverSubtaskId.value = '';
  timePopoverField.value = field;
  timePopoverAnchorRef.value = event.currentTarget as HTMLElement | null;
  timePopoverVisible.value = true;
}

function openSubtaskTimePopover(task: Task, subtask: TableSubtask, field: TimeField, event: MouseEvent): void {
  groupPopover.value = null;
  priorityPopover.value = null;
  statusPopover.value = null;
  closeDatePopover();
  timePopoverTaskId.value = task.id;
  timePopoverSubtaskId.value = subtask.id;
  timePopoverField.value = field;
  timePopoverAnchorRef.value = event.currentTarget as HTMLElement | null;
  timePopoverVisible.value = true;
}

function closeTimePopover(): void {
  timePopoverVisible.value = false;
  timePopoverAnchorRef.value = null;
  timePopoverTaskId.value = '';
  timePopoverSubtaskId.value = '';
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
  const subtaskId = datePopoverSubtaskId.value.trim();
  if (subtaskId) {
    const subtask = findSubtaskById(task.subtasks, subtaskId);
    if (!subtask) {
      closeDatePopover();
      return;
    }
    if (datePopoverField.value === 'startDate') {
      emit('subtaskStartDateUpdate', task, subtask, value);
    } else {
      emit('subtaskDueDateUpdate', task, subtask, value);
    }
    return;
  }
  if (datePopoverField.value === 'startDate') {
    emit('startDateUpdate', task, value);
  } else {
    emit('dueDateUpdate', task, value);
  }
}

function handleTimePopoverSelect(value: string): void {
  if (!timePopoverTaskId.value) {
    closeTimePopover();
    return;
  }
  const task = props.tasks.find(t => t.id === timePopoverTaskId.value);
  if (!task) {
    closeTimePopover();
    return;
  }
  const normalizedValue = normalizeTaskTimeValue(value);
  const subtaskId = timePopoverSubtaskId.value.trim();
  if (subtaskId) {
    const subtask = findSubtaskById(task.subtasks, subtaskId);
    if (!subtask) {
      closeTimePopover();
      return;
    }
    if (timePopoverField.value === 'startTime') {
      emit('subtaskStartTimeUpdate', task, subtask, normalizedValue);
    } else {
      emit('subtaskDueTimeUpdate', task, subtask, normalizedValue);
    }
    return;
  }
  if (timePopoverField.value === 'startTime') {
    emit('startTimeUpdate', task, normalizedValue);
  } else {
    emit('dueTimeUpdate', task, normalizedValue);
  }
}

function handleTableScroll(): void {
  if (datePopoverVisible.value) {
    closeDatePopover();
  }
  if (timePopoverVisible.value) {
    closeTimePopover();
  }
  if (groupPopover.value) {
    groupPopover.value = null;
  }
  isTableScrollActive = true;
  syncTableViewportMetrics();
  scheduleTableScrollSettle();
}

watch(
  () => [props.tasks, sortColumn.value, sortDirection.value, resolvedGroupMode.value],
  () => {
    if (tableContainerRef.value) {
      tableContainerRef.value.scrollTop = 0;
    }
    tableScrollTop.value = 0;
    nextTick(() => {
      syncTableViewportMetrics();
      isTableScrollActive = false;
      scheduleTableRowMeasurement();
    });
  },
  { immediate: true }
);

watch(
  () => [expandedTasks.value, collapsedGroups.value, tableRows.value.length],
  () => {
    nextTick(() => {
      scheduleTableViewportMetrics();
      isTableScrollActive = false;
      scheduleTableRowMeasurement();
    });
  },
  { immediate: true }
);

onMounted(() => {
  nextTick(() => {
    syncTableViewportMetrics();
    isTableScrollActive = false;
    scheduleTableRowMeasurement();
  });
  window.addEventListener('resize', handleTableViewportResize);
  document.addEventListener('mousedown', handleDocumentMouseDown);
});

onUnmounted(() => {
  if (tableMetricsRaf !== null) {
    cancelAnimationFrame(tableMetricsRaf);
    tableMetricsRaf = null;
  }
  if (tableMeasureRaf !== null) {
    cancelAnimationFrame(tableMeasureRaf);
    tableMeasureRaf = null;
  }
  if (tableScrollSettleTimer !== null) {
    clearTimeout(tableScrollSettleTimer);
    tableScrollSettleTimer = null;
  }
  window.removeEventListener('resize', handleTableViewportResize);
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

function getTaskDocumentIconRaw(task: Task): string {
  const rootId = typeof task.rootId === 'string' ? task.rootId.trim() : '';
  if (rootId) {
    const mapped = props.documentIconByRootId?.get(rootId);
    if (typeof mapped === 'string' && mapped.trim().length > 0) {
      return mapped.trim();
    }
  }
  return typeof task.icon === 'string' ? task.icon.trim() : '';
}

function getTaskDocumentIconImageSrc(task: Task): string {
  return resolveTaskDocumentIconImageSrc(getTaskDocumentIconRaw(task));
}

function getTaskDocumentTitleText(task: Task): string {
  const rawPath = typeof task.hPath === 'string' ? task.hPath.trim() : '';
  if (!rawPath) {
    return '';
  }
  const normalizedPath = rawPath.replace(/\/+$/, '');
  if (!normalizedPath) {
    return '';
  }
  const parts = normalizedPath.split('/').filter(part => part.length > 0);
  return parts[parts.length - 1] || normalizedPath;
}

function getTaskDocumentIconText(task: Task): string {
  const rawIcon = getTaskDocumentIconRaw(task);
  if (getTaskDocumentIconImageSrc(task)) {
    return '';
  }
  return rawIcon || '\uD83D\uDCC4';
}

function handleOpenClick(task: Task) {
  emit('openClick', task);
}

function toggleTaskStatus(task: Task) {
  emit('statusToggle', task);
}

function toggleSubtaskStatus(task: Task, subtask: TableSubtask) {
  emit('subtaskToggle', task, subtask);
}

function getSubtaskDescription(subtask: TableSubtask): string {
  return typeof subtask?.description === 'string' ? subtask.description : '';
}

function getSubtaskPriority(subtask: TableSubtask): Task['priority'] {
  const raw = typeof subtask?.priority === 'string' ? subtask.priority : '';
  if (raw === 'high' || raw === 'medium' || raw === 'low' || raw === 'none') {
    return raw;
  }
  return 'none';
}

function getSubtaskStatus(subtask: TableSubtask): Task['status'] {
  const raw = typeof subtask?.status === 'string' ? subtask.status : '';
  if (raw === 'pending' || raw === 'in-progress' || raw === 'delayed' || raw === 'completed' || raw === 'cancelled') {
    if (subtask.completed && raw !== 'completed') {
      return 'completed';
    }
    if (!subtask.completed && raw === 'completed') {
      return 'pending';
    }
    return raw;
  }
  return subtask.completed ? 'completed' : 'pending';
}

function getSubtaskGroupId(subtask: TableSubtask): string {
  const normalized = typeof subtask?.groupId === 'string' ? subtask.groupId.trim() : '';
  return normalized;
}

function getSubtaskGroupLabel(subtask: TableSubtask): string {
  const groupId = getSubtaskGroupId(subtask);
  if (!groupId) return '';
  return groupLookup.value.get(groupId)?.name || '';
}

function getSubtaskGroupStyle(subtask: TableSubtask): Record<string, string> | undefined {
  const groupId = getSubtaskGroupId(subtask);
  if (!groupId) return undefined;
  const meta = groupLookup.value.get(groupId);
  if (!meta || !meta.background) return undefined;
  return {
    '--group-badge-bg': meta.background,
    '--group-badge-color': meta.color
  };
}

function getSubtaskEditKey(taskId: string, subtaskId: string): string {
  return `${taskId}::${subtaskId}`;
}

function isSubtaskDescriptionEditing(task: Task, subtask: TableSubtask): boolean {
  return editingSubtaskDescriptions.value.has(getSubtaskEditKey(task.id, subtask.id));
}

function getSubtaskDescriptionDraft(task: Task, subtask: TableSubtask): string {
  const key = getSubtaskEditKey(task.id, subtask.id);
  if (subtaskDescriptionDraftByKey.value.has(key)) {
    return subtaskDescriptionDraftByKey.value.get(key) || '';
  }
  return getSubtaskDescription(subtask);
}

function startSubtaskDescriptionEdit(task: Task, subtask: TableSubtask): void {
  const key = getSubtaskEditKey(task.id, subtask.id);
  if (editingSubtaskDescriptions.value.has(key)) {
    return;
  }

  const activeEditingKey = editingSubtaskDescriptions.value.values().next().value as string | undefined;
  if (activeEditingKey && activeEditingKey !== key) {
    editingSubtaskDescriptions.value.delete(activeEditingKey);
    subtaskDescriptionDraftByKey.value.delete(activeEditingKey);
  }

  editingSubtaskDescriptions.value.clear();
  editingSubtaskDescriptions.value.add(key);
  subtaskDescriptionDraftByKey.value.set(key, getSubtaskDescription(subtask));

  nextTick(() => {
    const textarea = document.querySelector(`.subtask-description-edit[data-subtask-key="${key}"]`) as HTMLTextAreaElement | null;
    if (textarea) {
      textarea.focus();
      const length = textarea.value.length;
      textarea.setSelectionRange(length, length);
    }
  });
}

function handleSubtaskDescriptionInput(task: Task, subtask: TableSubtask, event: Event): void {
  const key = getSubtaskEditKey(task.id, subtask.id);
  const target = event.target as HTMLTextAreaElement | null;
  subtaskDescriptionDraftByKey.value.set(key, target?.value ?? '');
}

function commitSubtaskDescriptionEdit(task: Task, subtask: TableSubtask): void {
  const key = getSubtaskEditKey(task.id, subtask.id);
  if (!editingSubtaskDescriptions.value.has(key)) {
    return;
  }

  const draft = subtaskDescriptionDraftByKey.value.get(key) || '';
  editingSubtaskDescriptions.value.delete(key);
  subtaskDescriptionDraftByKey.value.delete(key);

  if (draft === getSubtaskDescription(subtask)) {
    return;
  }

  emit('subtaskDescriptionUpdate', task, subtask, draft);
}

function cancelSubtaskDescriptionEdit(task: Task, subtask: TableSubtask): void {
  const key = getSubtaskEditKey(task.id, subtask.id);
  if (!editingSubtaskDescriptions.value.has(key)) {
    return;
  }
  editingSubtaskDescriptions.value.delete(key);
  subtaskDescriptionDraftByKey.value.delete(key);
}

function toggleSubtaskPriorityEdit(task: Task, subtask: TableSubtask, event: MouseEvent): void {
  groupPopover.value = null;
  closeDatePopover();
  closeTimePopover();
  const existing = priorityPopover.value;
  const isSame = !!existing
    && existing.taskId === task.id
    && (existing.subtaskId || '') === subtask.id;
  if (isSame) {
    priorityPopover.value = null;
    return;
  }
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  priorityPopover.value = {
    taskId: task.id,
    subtaskId: subtask.id,
    position: {
      x: rect.left + rect.width / 2,
      y: rect.bottom + 4
    }
  };
}

function toggleSubtaskStatusEdit(task: Task, subtask: TableSubtask, event: MouseEvent): void {
  groupPopover.value = null;
  closeDatePopover();
  closeTimePopover();
  const existing = statusPopover.value;
  const isSame = !!existing
    && existing.taskId === task.id
    && (existing.subtaskId || '') === subtask.id;
  if (isSame) {
    statusPopover.value = null;
    return;
  }
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  statusPopover.value = {
    taskId: task.id,
    subtaskId: subtask.id,
    position: {
      x: rect.left + rect.width / 2,
      y: rect.bottom + 4
    }
  };
}

function toggleSubtaskGroupPopover(task: Task, subtask: TableSubtask, event: MouseEvent): void {
  const existing = groupPopover.value;
  const isSame = !!existing
    && existing.taskId === task.id
    && (existing.subtaskId || '') === subtask.id;
  if (isSame) {
    groupPopover.value = null;
    return;
  }
  priorityPopover.value = null;
  statusPopover.value = null;
  closeDatePopover();
  closeTimePopover();
  const target = event.currentTarget as HTMLElement | null;
  if (!target) return;
  const rect = target.getBoundingClientRect();
  groupPopover.value = {
    taskId: task.id,
    subtaskId: subtask.id,
    position: {
      x: rect.left + rect.width / 2,
      y: rect.bottom + 6
    }
  };
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
  closeDatePopover();
  closeTimePopover();
  const existing = priorityPopover.value;
  const isSame = !!existing
    && existing.taskId === task.id
    && !existing.subtaskId;
  if (isSame) {
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

function handlePrioritySelect(priority: string): void {
  const popover = priorityPopover.value;
  priorityPopover.value = null;
  if (!popover) return;
  if (priority !== 'none' && priority !== 'high' && priority !== 'medium' && priority !== 'low') {
    return;
  }
  const task = props.tasks.find(item => item.id === popover.taskId);
  if (!task) return;
  if (popover.subtaskId) {
    const subtask = findSubtaskById(task.subtasks, popover.subtaskId);
    if (!subtask) return;
    emit('subtaskPriorityUpdate', task, subtask, priority);
    return;
  }
  emit('priorityUpdate', task, priority);
}

function toggleStatusEdit(task: Task, event: MouseEvent) {
  groupPopover.value = null;
  closeDatePopover();
  closeTimePopover();
  const existing = statusPopover.value;
  const isSame = !!existing
    && existing.taskId === task.id
    && !existing.subtaskId;
  if (isSame) {
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

function handleStatusSelect(status: string): void {
  const popover = statusPopover.value;
  statusPopover.value = null;
  if (!popover) return;
  if (
    status !== 'pending'
    && status !== 'in-progress'
    && status !== 'delayed'
    && status !== 'completed'
    && status !== 'cancelled'
  ) {
    return;
  }
  const task = props.tasks.find(item => item.id === popover.taskId);
  if (!task) return;
  if (popover.subtaskId) {
    const subtask = findSubtaskById(task.subtasks, popover.subtaskId);
    if (!subtask) return;
    emit('subtaskStatusUpdate', task, subtask, status);
    return;
  }
  emit('statusUpdate', task, status);
}

function toggleGroupPopover(task: Task, event: MouseEvent): void {
  const existing = groupPopover.value;
  const isSame = !!existing
    && existing.taskId === task.id
    && !existing.subtaskId;
  if (isSame) {
    groupPopover.value = null;
    return;
  }
  priorityPopover.value = null;
  statusPopover.value = null;
  closeDatePopover();
  closeTimePopover();
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
  if (popover.subtaskId) {
    const subtask = findSubtaskById(task.subtasks, popover.subtaskId);
    if (!subtask) return;
    const nextGroupId = value === TASK_GROUP_NONE_ID ? '' : value;
    const normalized = typeof nextGroupId === 'string' ? nextGroupId.trim() : '';
    const currentGroupId = typeof subtask.groupId === 'string' ? subtask.groupId.trim() : '';
    if (normalized === currentGroupId) return;
    emit('subtaskGroupUpdate', task, subtask, normalized);
    return;
  }
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
  if (!groupPopover.value && !priorityPopover.value && !statusPopover.value && !datePopoverVisible.value && !timePopoverVisible.value) {
    return;
  }
  const target = event.target as HTMLElement | null;
  if (!target) return;
  if (
    target.closest('.group-popover') ||
    target.closest('.priority-popover') ||
    target.closest('.status-popover') ||
    target.closest('.date-popover') ||
    target.closest('.time-popover')
  ) {
    return;
  }
  if (
    target.closest('.col-group') ||
    target.closest('.col-priority') ||
    target.closest('.col-status-text') ||
    target.closest('.col-start-date') ||
    target.closest('.col-due-date') ||
    target.closest('.col-start-time') ||
    target.closest('.col-due-time')
  ) {
    return;
  }
  groupPopover.value = null;
  priorityPopover.value = null;
  statusPopover.value = null;
  if (datePopoverVisible.value) {
    closeDatePopover();
  }
  if (timePopoverVisible.value) {
    closeTimePopover();
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
  width: calc(100% - 20px);
  height: 100%;
  overflow: auto;
  margin: 0 10px;
}

.tasks-table {
  width: 100%;
  max-width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
}

.tasks-table thead {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: var(--Sv-theme-surface, var(--b3-theme-surface));
}

.tasks-table th {
  padding: 10px 12px;
  text-align: left;
  font-weight: 500;
  color: var(--b3-theme-on-surface);
  background-color: var(--Sv-theme-surface, var(--b3-theme-surface));
  white-space: nowrap;
  position: relative;
}

.tasks-table thead th:first-child {
  border-top-left-radius: 10px;
  border-bottom-left-radius: 10px;
}

.tasks-table thead th:last-child {
  border-top-right-radius: 10px;
  border-bottom-right-radius: 10px;
}

.tasks-table th:not(:last-child):not(.col-expand):not(.col-status)::after {
  content: '';
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 2px;
  height: 40%;
  border-radius: 999px;
  background: var(--b3-border-color);
  opacity: 0.85;
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

.sort-indicator :deep(.sort-indicator-top),
.sort-indicator :deep(.sort-indicator-bottom) {
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

.sort-indicator.is-active :deep(.sort-indicator-top),
.sort-indicator.is-active :deep(.sort-indicator-bottom) {
  opacity: 0.45;
}

.sort-indicator.is-asc :deep(.sort-indicator-top),
.sort-indicator.is-desc :deep(.sort-indicator-bottom) {
  fill: var(--sort-indicator-active);
  opacity: 1;
}

.tasks-table td {
  padding: 6px 12px;
  border-bottom: 1px solid var(--b3-border-color);
}

.task-row.is-terminal-row > td,
.subtask-row.is-terminal-row > td {
  border-bottom: none;
}


.task-row {
  cursor: pointer;
  transition: background-color 0.15s;
}

.task-row > td,
.subtask-row > td {
  position: relative;
  transition: background-color 0.15s;
}

.task-row > td::before,
.subtask-row > td::before {
  content: '';
  position: absolute;
  inset: 3px 4px;
  border-radius: 8px;
  background: transparent;
  pointer-events: none;
  transition: background-color 0.15s ease;
}

.task-row > td:hover::before,
.subtask-row > td:hover::before {
  background-color: var(--b3-list-hover);
}

.task-row > td > *,
.subtask-row > td > * {
  position: relative;
  z-index: 1;
}

.group-row td {
  padding: 0;
  background: transparent;
  border-bottom: none;
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
  border-radius: 10px;
  margin-top: 6px;
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

.col-expand {
  text-align: center;
}

.col-status {
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
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
  cursor: pointer;
}

.subtask-checkbox-wrapper:hover {
  opacity: 0.8;
}

.col-title {
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
  gap: 2px;
  flex: 1 1 auto;
  min-width: 0;
  cursor: pointer;
}

.title-pinned-badge {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  color: #f98f7a;
}

.title-pinned-badge svg {
  width: 100%;
  height: 100%;
  display: block;
  fill: currentColor;
}

.expand-arrow {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  cursor: pointer;
  color: var(--b3-theme-on-surface);
  transition: transform 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 0;
}

.expand-arrow svg {
  width: 16px;
  height: 16px;
}

.expand-arrow:hover {
  color: var(--b3-theme-on-background);
}

.expand-arrow.expanded {
  transform: rotate(90deg);
}

.expand-arrow-placeholder {
  display: inline-block;
  width: 16px;
  height: 16px;
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

.col-description.is-editing {
  padding: 2px 4px;
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
  display: block;
  width: 100%;
  min-width: 100%;
  max-width: none;
  box-sizing: border-box;
  font-size: 12px;
  color: var(--b3-theme-on-background);
  line-height: 1.4;
  padding: 6px 10px;
  background: var(--b3-theme-background);
  border: 1px solid var(--b3-theme-primary);
  border-radius: 6px;
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
.col-start-time,
.col-due-date,
.col-due-time,
.col-created-date,
.col-updated-date {
  width: 80px;
  text-align: center;
  white-space: nowrap;
  color: var(--b3-theme-on-surface);
  cursor: pointer;
  position: relative;
}

.col-start-time,
.col-due-time {
  cursor: default;
}

.tasks-table td.col-start-time,
.tasks-table td.col-due-time {
  cursor: pointer;
}

.col-status-text .th-content,
.col-start-date .th-content,
.col-start-time .th-content,
.col-due-date .th-content,
.col-due-time .th-content,
.col-created-date .th-content,
.col-updated-date .th-content {
  justify-content: center;
}

.date-display {
  display: block;
  padding: 4px 8px;
  text-align: center;
}

.time-display {
  display: block;
  padding: 4px 8px;
  text-align: center;
}

.col-location {
  width: calc(18% - 20px);
  min-width: 100px;
}

.location-cell {
  display: flex;
  align-items: center;
  min-width: 0;
}

.location-cell.task-document-title {
  gap: 4px;
  font-size: 12px;
  line-height: 1.3;
  color: var(--b3-theme-on-surface);
  opacity: 0.72;
}

.location-cell .task-document-icon {
  flex: 0 0 auto;
  font-size: 12px;
  line-height: 1;
}

.location-cell .task-document-icon-image {
  width: 12px;
  height: 12px;
  display: block;
  object-fit: cover;
  border-radius: 2px;
}

.location-cell .task-document-title-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-completed .task-title {
  text-decoration: line-through;
  opacity: 0.6;
}

.subtask-row {
  cursor: pointer;
}

.subtask-title-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 24px;
}

.subtask-title {
  font-size: 13px;
  color: var(--b3-theme-on-background);
  line-height: 1.4;
  flex: 1 1 auto;
  min-width: 0;
}

.subtask-completed .subtask-title {
  text-decoration: line-through;
  opacity: 0.6;
}

.subtask-description-edit {
  z-index: 2;
}

.table-virtual-spacer-row td {
  padding: 0;
  border: none;
  background: transparent;
}

.table-virtual-spacer-cell {
  padding: 0;
  border: none;
  background: transparent;
  pointer-events: none;
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
