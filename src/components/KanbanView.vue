<template>
  <div class="kanban-view">
    <div class="kanban-header">
      <div class="header-left">
        <div class="view-switcher">
          <button :class="['view-btn', { active: currentView === 'kanban' }]" @click="currentView = 'kanban'">
            <Icon name="kanban" width="16" height="16" />
            <span>看板</span>
          </button>
          <button :class="['view-btn', { active: currentView === 'table' }]" @click="currentView = 'table'">
            <Icon name="table" width="16" height="16" />
            <span>表格</span>
          </button>
          <button :class="['view-btn', { active: currentView === 'month' }]" @click="currentView = 'month'">
            <Icon name="month" width="16" height="16" />
            <span>月视图</span>
          </button>
          <button :class="['view-btn', { active: currentView === 'week' }]" @click="currentView = 'week'">
            <Icon name="week" width="16" height="16" />
            <span>周视图</span>
          </button>
        </div>
        
        <div v-if="currentView === 'kanban'" class="filter-bar-inline">
          <div class="filter-group">
            <label>优先级:</label>
            <SySelect
              :model-value="kanbanFilterPriority"
              @update:model-value="kanbanFilterPriority = $event"
              :options="priorityOptions"
            />
          </div>
          <div class="filter-group">
            <label>分类:</label>
            <SySelect
              :model-value="kanbanFilterType"
              @update:model-value="kanbanFilterType = $event"
              :options="notebookOptions"
            />
          </div>
          <div v-if="kanbanFilterType !== 'all'" class="filter-group">
            <label>文档:</label>
            <SySelect
              :model-value="kanbanFilterDocument"
              @update:model-value="kanbanFilterDocument = $event"
              :options="documentOptions"
            />
          </div>
        </div>
        
        <div v-if="currentView === 'table'" class="filter-bar-inline">
          <div class="filter-group">
            <label>分类:</label>
            <SySelect
              :model-value="tableFilterType"
              @update:model-value="tableFilterType = $event"
              :options="notebookOptions"
            />
          </div>
          <div v-if="tableFilterType !== 'all'" class="filter-group">
            <label>文档:</label>
            <SySelect
              :model-value="tableFilterDocument"
              @update:model-value="tableFilterDocument = $event"
              :options="documentOptions"
            />
          </div>
        </div>

        <div v-if="currentView === 'month'" class="filter-bar-inline">
          <div class="filter-group">
            <label>分类:</label>
            <SySelect
              :model-value="monthFilterType"
              @update:model-value="monthFilterType = $event"
              :options="notebookOptions"
            />
          </div>
          <div v-if="monthFilterType !== 'all'" class="filter-group">
            <label>文档:</label>
            <SySelect
              :model-value="monthFilterDocument"
              @update:model-value="monthFilterDocument = $event"
              :options="documentOptions"
            />
          </div>
        </div>
        
        <div v-if="currentView === 'week'" class="filter-bar-inline">
          <div class="filter-group">
            <label>分类:</label>
            <SySelect
              :model-value="weekFilterType"
              @update:model-value="weekFilterType = $event"
              :options="notebookOptions"
            />
          </div>
          <div v-if="weekFilterType !== 'all'" class="filter-group">
            <label>文档:</label>
            <SySelect
              :model-value="weekFilterDocument"
              @update:model-value="weekFilterDocument = $event"
              :options="documentOptions"
            />
          </div>
        </div>
      </div>
      
      <div class="header-actions">
        <button @click="refreshTasks" class="refresh-btn">
          <Icon name="refresh" width="24" height="24" />
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="currentView === 'kanban' && isSettingsLoaded" class="kanban-board">
      <div 
        v-for="column in columns" 
        :key="column.status" 
        class="kanban-column"
        :class="`status-${column.status}`"
      >
        <div class="column-header">
          <div class="column-title">{{ column.title }}</div>
          <div class="column-count">{{ getColumnTaskCount(column.status) }}</div>
        </div>
        <div 
          class="column-tasks"
          :class="{ 'drag-over': dragOverStatus === column.status }"
          @dragover.prevent="handleDragOver($event, column.status)"
          @dragleave="handleDragLeave"
          @drop="handleDrop($event, column.status)"
        >
          <div
            v-for="task in getFilteredTasksForStatus(column.status)"
            :key="task.id"
            class="kanban-task-card protyle-wysiwyg"
              :class="[
                `priority-${task.priority}`,
                { 
                  'task-completed': isTaskCompletedVisual(task),
                  'dragging': draggedTask && draggedTask.id === task.id
                }
              ]"
            :draggable="!isMobileFrontend"
            @dragstart="handleDragStart($event, task)"
            @dragend="handleDragEnd"
            @click="handleTaskClick(task)"
          >
            <div class="task-title" v-html="task.title"></div>
            <div v-if="task.description" class="task-description" v-html="task.description"></div>
            <div class="task-meta">
              <span v-if="task.priority !== 'none'" class="task-priority-badge" :class="`priority-${task.priority}`">
                <Icon name="flag" width="12" height="12" />
              </span>
              <span v-if="task.dueDate" class="task-due-badge">
                <Icon name="calendar" width="12" height="12" />
                {{ formatDate(task.dueDate) }}
              </span>
            </div>
            <div v-if="task.subtasks && task.subtasks.length > 0" class="task-progress">
              <div class="task-progress-bar">
                <div class="task-progress-fill" :style="{ width: getSubtaskProgress(task.subtasks) + '%' }"></div>
              </div>
              <div class="task-progress-text">{{ getSubtaskStats(task.subtasks) }}</div>
            </div>
          </div>
          <div v-if="getFilteredTasksForStatus(column.status).length === 0" class="empty-column">
            暂无任务
          </div>
        </div>
      </div>
    </div>
    
    <TableView 
      v-if="currentView === 'table'"
      :tasks="filteredTasks"
      @task-click="handleTaskClick"
      @status-toggle="toggleTaskStatus"
      @subtask-toggle="handleSubtaskToggle"
      @description-update="handleDescriptionUpdate"
      @priority-update="handlePriorityUpdate"
      @status-update="handleStatusUpdate"
      @start-date-update="handleStartDateUpdate"
      @due-date-update="handleDueDateUpdate"
    />
    <MonthView 
      v-if="currentView === 'month'" 
      :tasks="monthViewTasks"
      @task-click="handleTaskClick"
      @task-date-changed="handleTaskDateChanged"
      @task-create-requested="handleTaskCreateRequested"
    />
    <WeekView
      v-if="currentView === 'week'"
      :tasks="weekViewTasks"
      @task-date-changed="handleTaskDateChanged"
      @task-click="handleTaskClick"
      @task-create-requested="handleTaskCreateRequested"
    />

    <div v-if="quickCreateDialog.show" class="quick-create-mask" @click="closeQuickCreateDialog">
      <div class="quick-create-dialog" @click.stop>
        <div class="quick-create-title">新建任务</div>
        <div class="quick-create-row">
          <label>笔记本</label>
          <SySelect
            :model-value="quickCreateNotebookId"
            @update:model-value="quickCreateNotebookId = $event"
            :options="notebookOptions"
          />
        </div>
        <div class="quick-create-row">
          <label>文档</label>
          <SySelect
            :model-value="quickCreateDocumentId"
            @update:model-value="quickCreateDocumentId = $event"
            :options="quickCreateDocumentOptions"
          />
        </div>
        <input
          ref="quickCreateInputRef"
          v-model="quickCreateDialog.title"
          class="quick-create-input"
          type="text"
          placeholder="请输入任务标题"
          @keydown.enter.prevent="submitQuickCreateTask"
          @keydown.esc.prevent="closeQuickCreateDialog"
        />
        <div class="quick-create-actions">
          <button class="quick-create-btn cancel" @click="closeQuickCreateDialog">取消</button>
          <button class="quick-create-btn confirm" @click="submitQuickCreateTask">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick, type Ref } from 'vue';
import { getFrontend } from 'siyuan';
import { TaskRepository, Task, SubTask, setBlockAttrs, pushMsg } from '../api';
import { updateTaskMarkdown, skipTaskTemporarily } from '../utils/taskHelpers';
import { useTaskFilters } from '../composables/useTaskFilters';
import { useUserSettings } from '@/composables/useUserSettings';
import { useNotebooks } from '@/composables/useTaskCommon';
import { eventBus, Events } from '../utils/eventBus';
import { getCrdtRepository, useCrdtTasks } from '@/crdtStore';
import { formatDate } from '@/utils/dateHelpers';
import Icon from '@/components/Icon.vue';
import SySelect from '@/components/SiyuanTheme/SySelect.vue';
import TableView from '@/components/TableView.vue';
import MonthView from '@/components/MonthView.vue';
import WeekView from '@/components/WeekView.vue';

const { data: userSettings, loadSettings, updateSettings } = useUserSettings();

const crdtRepo = getCrdtRepository();
const { tasks, updateTasks, syncFromSQL } = useCrdtTasks();
let isMobileFrontend = false;
try {
  const frontend = getFrontend();
  isMobileFrontend = frontend === 'mobile' || frontend === 'browser-mobile';
} catch {
  isMobileFrontend = false;
}
const loading = ref(false);
const skipSet = new Set<string>();

let skipCleanupTimer: number | null = null;

function startSkipSetCleanup() {
  if (skipCleanupTimer !== null) {
    clearInterval(skipCleanupTimer);
  }
  
  skipCleanupTimer = window.setInterval(() => {
    if (skipSet.size > 0) {
      skipSet.clear();
    }
  }, 60000);
}

function stopSkipSetCleanup() {
  if (skipCleanupTimer !== null) {
    clearInterval(skipCleanupTimer);
    skipCleanupTimer = null;
  }
}

const kanbanFilterPriority = ref('all');
const kanbanFilterType = ref('all');
const kanbanFilterDocument = ref('all');

const tableFilterType = ref('all');
const tableFilterDocument = ref('all');

const monthFilterType = ref('all');
const monthFilterDocument = ref('all');

const weekFilterType = ref('all');
const weekFilterDocument = ref('all');

const isSettingsLoaded = ref(false);
const isHydratingSettings = ref(false);

const { notebooks, loadNotebooks } = useNotebooks();
const draggedTask = ref<Task | null>(null);
const dragOverStatus = ref<string | null>(null);
const isDropping = ref(false);
const currentView = ref<'kanban' | 'table' | 'month' | 'week'>((userSettings.kanban?.currentView as 'kanban' | 'table' | 'month' | 'week') || 'table');

const columns = [
  { status: 'pending', title: '待处理' },
  { status: 'in-progress', title: '进行中' },
  { status: 'completed', title: '已完成' },
  { status: 'cancelled', title: '已取消' }
];

interface CreateTaskPayload {
  startDate: string;
  dueDate: string;
  startTime?: string;
  dueTime?: string;
  allDay: boolean;
}

const quickCreateInputRef = ref<HTMLInputElement | null>(null);
const quickCreateNotebookId = ref<string>('all');
const quickCreateDocumentId = ref<string>('all');
const quickCreateDialog = ref<{
  show: boolean;
  title: string;
  payload: CreateTaskPayload | null;
}>({
  show: false,
  title: '',
  payload: null
});

const priorityOptions = [
  { value: 'all', text: '全部' },
  { value: 'high', text: '高' },
  { value: 'medium', text: '中' },
  { value: 'low', text: '低' }
];

const notebookOptions = computed(() => [
  { value: 'all', text: '全部' },
  ...notebooks.value.map(nb => ({ value: nb.id, text: nb.name }))
]);

let eventUnsubscribers: Array<() => void> = [];
let saveSettingsTimer: number | null = null;
let fallbackRefreshTimer: number | null = null;
const dragStatusLocks = new Map<string, Task['status']>();
const dragSyncSuppressUntil = new Map<string, number>();
function getCurrentFilterNotebookId(): string {
  switch (currentView.value) {
    case 'kanban':
      return kanbanFilterType.value;
    case 'table':
      return tableFilterType.value;
    case 'month':
      return monthFilterType.value;
    case 'week':
      return weekFilterType.value;
    default:
      return 'all';
  }
}

function getDocumentEntriesByNotebook(notebookId: string): Array<{ id: string; name: string }> {
  if (notebookId === 'all') return [];

  const docs = new Map<string, string>();
  for (const task of tasks.value) {
    if (task.type !== 'block' || task.notebookId !== notebookId || !task.rootId) {
      continue;
    }
    if (!docs.has(task.rootId)) {
      const hPath = task.hPath || task.rootId;
      docs.set(task.rootId, hPath);
    }
  }

  return Array.from(docs.entries()).map(([id, path]) => ({
    id,
    name: path.split('/').pop() || path
  }));
}

function getDocumentIdsByNotebook(notebookId: string): string[] {
  return getDocumentEntriesByNotebook(notebookId).map(doc => doc.id);
}

function toDocumentOptions(notebookId: string): Array<{ value: string; text: string }> {
  if (notebookId === 'all') {
    return [{ value: 'all', text: '全部' }];
  }

  return [
    { value: 'all', text: '全部' },
    ...getDocumentEntriesByNotebook(notebookId).map(doc => ({
      value: doc.id,
      text: doc.name
    }))
  ];
}

const documentOptions = computed(() => toDocumentOptions(getCurrentFilterNotebookId()));
const quickCreateDocumentOptions = computed(() => toDocumentOptions(quickCreateNotebookId.value));

function setupFilterTypeWatcher(typeRef: Ref<string>, documentRef: Ref<string>): void {
  watch(typeRef, (newType, oldType) => {
    if (newType === 'all') {
      documentRef.value = 'all';
    } else if (oldType !== 'all' && documentRef.value !== 'all') {
      documentRef.value = 'all';
    }
  });
}

setupFilterTypeWatcher(kanbanFilterType, kanbanFilterDocument);
setupFilterTypeWatcher(monthFilterType, monthFilterDocument);
setupFilterTypeWatcher(weekFilterType, weekFilterDocument);

watch(quickCreateNotebookId, (newType, oldType) => {
  if (newType !== oldType && quickCreateDialog.value.show) {
    const exists = quickCreateDocumentOptions.value.some(opt => opt.value === quickCreateDocumentId.value);
    if (!exists) {
      quickCreateDocumentId.value = 'all';
    }
  } else if (newType !== oldType) {
    quickCreateDocumentId.value = 'all';
  }
});

function scheduleSaveUserSettings() {
  if (saveSettingsTimer !== null) {
    clearTimeout(saveSettingsTimer);
  }

  saveSettingsTimer = window.setTimeout(async () => {
    await saveUserSettings();
  }, 200);
}

watch([
  currentView,
  kanbanFilterPriority,
  kanbanFilterType,
  kanbanFilterDocument,
  tableFilterType,
  tableFilterDocument,
  monthFilterType,
  monthFilterDocument,
  weekFilterType,
  weekFilterDocument
], () => {
  if (isHydratingSettings.value) {
    return;
  }
  scheduleSaveUserSettings();
});

const tableFilters = {
  priority: ref('all'),
  notebook: tableFilterType,
  document: tableFilterDocument
};

const { filtered: filteredTasks, invalidateCache: invalidateTableFilters } = useTaskFilters(tasks, tableFilters);

const monthViewTasks = computed(() => {
  return tasks.value.filter(task => {
    if (task.type !== 'block') return false;
    if (!task.startDate && !task.dueDate) return false;
    
    if (monthFilterType.value !== 'all') {
      if (task.notebookId !== monthFilterType.value) return false;
      if (monthFilterDocument.value !== 'all' && task.rootId !== monthFilterDocument.value) {
        return false;
      }
    }
    
    return true;
  });
});

const weekViewTasks = computed(() => {
  return tasks.value.filter(task => {
    if (task.type !== 'block') return false;
    if (!task.startDate && !task.dueDate) return false;
    
    if (weekFilterType.value !== 'all') {
      if (task.notebookId !== weekFilterType.value) return false;
      if (weekFilterDocument.value !== 'all' && task.rootId !== weekFilterDocument.value) {
        return false;
      }
    }
    
    return true;
  });
});

watch(tasks, () => {
  invalidateTableFilters();
}, { immediate: true });

function getTaskVisualStatus(task: Task): Task['status'] {
  if (task.type === 'block' && task.blockId) {
    const locked = getLockedDraggedTaskStatus(task.blockId);
    if (locked) {
      return locked;
    }
  }
  return task.status;
}

function isTaskCompletedVisual(task: Task): boolean {
  return getTaskVisualStatus(task) === 'completed';
}

function matchesKanbanFilters(task: Task): boolean {
  if (!task.title || task.title.trim() === '') return false;
  if (task.type !== 'block') return false;
  if (kanbanFilterPriority.value !== 'all' && task.priority !== kanbanFilterPriority.value) return false;
  if (kanbanFilterType.value !== 'all') {
    if (task.notebookId !== kanbanFilterType.value) return false;
    if (kanbanFilterDocument.value !== 'all' && task.rootId !== kanbanFilterDocument.value) return false;
  }
  return true;
}

const kanbanTasksByVisualStatus = computed<Record<string, Task[]>>(() => {
  const grouped: Record<string, Task[]> = {
    'pending': [],
    'in-progress': [],
    'completed': [],
    'cancelled': []
  };

  for (const task of tasks.value) {
    if (!matchesKanbanFilters(task)) continue;
    const status = getTaskVisualStatus(task);
    if (grouped[status]) {
      grouped[status].push(task);
    }
  }

  return grouped;
});

function getFilteredTasksForStatus(status: string): Task[] {
  return kanbanTasksByVisualStatus.value[status] || [];
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

function getSubtaskProgress(subtasks: Task['subtasks']): number {
  const stats = countSubtasks(subtasks);
  if (stats.total === 0) return 0;
  return Math.round((stats.completed / stats.total) * 100);
}

function getSubtaskStats(subtasks: Task['subtasks']): string {
  const stats = countSubtasks(subtasks);
  return `${stats.completed}/${stats.total}`;
}

async function loadTasks(forceRefresh: boolean = false, options: { silent?: boolean } = {}) {
  const { silent = false } = options;
  if (!silent) {
    loading.value = true;
  }
  try {
    if (forceRefresh) {
      await TaskRepository.clearCache();
    }
    const sqlTasks = await TaskRepository.getAllTasks(!forceRefresh);
    syncFromSQL(sqlTasks);
    tasks.value = applyDraggedStatusLocks(tasks.value);
    await nextTick();
    validateDocumentSelection();
  } catch (error) {
    console.error('[KanbanView] 加载任务失败:', error);
  } finally {
    if (!silent) {
      loading.value = false;
    }
  }
}

async function refreshTasks() {
  await TaskRepository.clearCache();
  await loadTasks(true);
}

function scheduleRefreshTasks(delay = 180, mode: 'full' | 'light' = 'full') {
  if (fallbackRefreshTimer !== null) {
    clearTimeout(fallbackRefreshTimer);
  }
  fallbackRefreshTimer = window.setTimeout(async () => {
    fallbackRefreshTimer = null;
    if (mode === 'light') {
      await loadTasks(false, { silent: true });
      return;
    }
    await refreshTasks();
  }, delay);
}

function applyRepeatRuleOptimistic(payload: {
  blockId?: string;
  seriesId?: string;
  frequency?: string;
}) {
  const { blockId, seriesId, frequency } = payload;
  if (!frequency) return;

  let touched = false;

  if (blockId) {
    const templateTask = tasks.value.find(
      (task) => task.type === 'block' && !task.isVirtual && task.blockId === blockId
    );
    if (templateTask) {
      templateTask.repeatFrequency = frequency as any;
      if (frequency === 'none') {
        templateTask.repeatSeriesId = undefined;
        templateTask.repeatInstanceDate = undefined;
        templateTask.isVirtual = false;
      } else if (seriesId) {
        templateTask.repeatSeriesId = seriesId;
        templateTask.repeatInstanceDate = undefined;
        templateTask.isVirtual = false;
      }
      touched = true;
    }
  }

  if (frequency === 'none' && seriesId) {
    const nextTasks = tasks.value.filter(
      (task) => !(task.isVirtual && task.repeatSeriesId === seriesId)
    );
    if (nextTasks.length !== tasks.value.length) {
      tasks.value = nextTasks;
      touched = true;
    }
  }

  if (touched) {
    invalidateTableFilters();
  }
}

function unlockDraggedTaskStatus(blockId: string): void {
  dragStatusLocks.delete(blockId);
}

function lockDraggedTaskStatus(blockId: string, status: Task['status']): void {
  dragStatusLocks.set(blockId, status);
}

function getLockedDraggedTaskStatus(blockId: string): Task['status'] | null {
  return dragStatusLocks.get(blockId) || null;
}

function suppressDragTaskSync(blockId: string, ttlMs = 1400): void {
  dragSyncSuppressUntil.set(blockId, Date.now() + ttlMs);
}

function isDragTaskSyncSuppressed(blockId: string): boolean {
  const expiresAt = dragSyncSuppressUntil.get(blockId);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    dragSyncSuppressUntil.delete(blockId);
    return false;
  }
  return true;
}

function filterSuppressedBlockIds(blockIds: string[]): string[] {
  if (!blockIds.length) return [];
  return blockIds.filter(id => typeof id === 'string' && id.length > 0 && !isDragTaskSyncSuppressed(id));
}

function hasSuppressedBlockId(blockIds: string[]): boolean {
  if (!blockIds.length) return false;
  return blockIds.some(id => typeof id === 'string' && id.length > 0 && isDragTaskSyncSuppressed(id));
}

function applyDraggedStatusLocks(taskList: Task[]): Task[] {
  if (dragStatusLocks.size === 0 || taskList.length === 0) {
    return taskList;
  }

  for (const task of taskList) {
    if (task.type !== 'block' || !task.blockId) {
      continue;
    }
    const lockedStatus = getLockedDraggedTaskStatus(task.blockId);
    if (!lockedStatus) {
      continue;
    }
    if (task.status === lockedStatus) {
      unlockDraggedTaskStatus(task.blockId);
      continue;
    }
    task.status = lockedStatus;
  }

  return taskList;
}

async function loadUserSettings() {
  isHydratingSettings.value = true;
  try {
    const settings = userSettings.kanban;
    kanbanFilterPriority.value = settings.kanbanFilterPriority || 'all';
    kanbanFilterType.value = settings.kanbanFilterType || 'all';
    kanbanFilterDocument.value = settings.kanbanFilterDocument || 'all';
    tableFilterType.value = settings.tableFilterType || 'all';
    tableFilterDocument.value = settings.tableFilterDocument || 'all';
    monthFilterType.value = settings.monthFilterType || 'all';
    monthFilterDocument.value = settings.monthFilterDocument || 'all';
    weekFilterType.value = settings.weekFilterType || 'all';
    weekFilterDocument.value = settings.weekFilterDocument || 'all';
    
    isSettingsLoaded.value = true;
    
    if (kanbanFilterType.value !== 'all' && notebooks.value.length > 0) {
      const notebookExists = notebooks.value.some(nb => nb.id === kanbanFilterType.value);
      if (!notebookExists) {
        kanbanFilterType.value = 'all';
        kanbanFilterDocument.value = 'all';
        await updateSettings('kanban', {
          kanbanFilterPriority: kanbanFilterPriority.value,
          kanbanFilterType: 'all',
          kanbanFilterDocument: 'all',
          tableFilterType: tableFilterType.value,
          tableFilterDocument: tableFilterDocument.value,
          monthFilterType: monthFilterType.value,
          monthFilterDocument: monthFilterDocument.value,
          weekFilterType: weekFilterType.value,
          weekFilterDocument: weekFilterDocument.value
        });
      }
    }
    
    if (weekFilterType.value !== 'all' && notebooks.value.length > 0) {
      const notebookExists = notebooks.value.some(nb => nb.id === weekFilterType.value);
      if (!notebookExists) {
        weekFilterType.value = 'all';
        weekFilterDocument.value = 'all';
        await updateSettings('kanban', {
          kanbanFilterPriority: kanbanFilterPriority.value,
          kanbanFilterType: kanbanFilterType.value,
          kanbanFilterDocument: kanbanFilterDocument.value,
          tableFilterType: tableFilterType.value,
          tableFilterDocument: tableFilterDocument.value,
          monthFilterType: monthFilterType.value,
          monthFilterDocument: monthFilterDocument.value,
          weekFilterType: 'all',
          weekFilterDocument: 'all'
        });
      }
    }
  } catch (error) {
    console.error('[KanbanView] 加载用户设置失败:', error);
  }
  isHydratingSettings.value = false;
}

async function saveUserSettings() {
  try {
    await updateSettings('kanban', {
      currentView: currentView.value,
      kanbanFilterPriority: kanbanFilterPriority.value,
      kanbanFilterType: kanbanFilterType.value,
      kanbanFilterDocument: kanbanFilterDocument.value,
      tableFilterType: tableFilterType.value,
      tableFilterDocument: tableFilterDocument.value,
      monthFilterType: monthFilterType.value,
      monthFilterDocument: monthFilterDocument.value,
      weekFilterType: weekFilterType.value,
      weekFilterDocument: weekFilterDocument.value
    });
  } catch (error) {
    console.error('[KanbanView] 保存用户设置失败:', error);
  }
}

async function validateDocumentSelection() {
  let hasChanges = false;

  if (kanbanFilterType.value !== 'all' && kanbanFilterDocument.value !== 'all') {
    const availableDocIds = getDocumentIdsByNotebook(kanbanFilterType.value);
    if (!availableDocIds.includes(kanbanFilterDocument.value)) {
      kanbanFilterDocument.value = 'all';
      hasChanges = true;
    }
  }

  if (tableFilterType.value !== 'all' && tableFilterDocument.value !== 'all') {
    const availableDocIds = getDocumentIdsByNotebook(tableFilterType.value);
    if (!availableDocIds.includes(tableFilterDocument.value)) {
      tableFilterDocument.value = 'all';
      hasChanges = true;
    }
  }

  if (monthFilterType.value !== 'all' && monthFilterDocument.value !== 'all') {
    const availableDocIds = getDocumentIdsByNotebook(monthFilterType.value);
    if (!availableDocIds.includes(monthFilterDocument.value)) {
      monthFilterDocument.value = 'all';
      hasChanges = true;
    }
  }

  if (weekFilterType.value !== 'all' && weekFilterDocument.value !== 'all') {
    const availableDocIds = getDocumentIdsByNotebook(weekFilterType.value);
    if (!availableDocIds.includes(weekFilterDocument.value)) {
      weekFilterDocument.value = 'all';
      hasChanges = true;
    }
  }

  if (hasChanges) {
    await saveUserSettings();
  }
}

function setupEventListeners() {
  const unsubscribeChanged = eventBus.on(Events.TASK_CHANGED, async (data?: { blockIds?: string[] }) => {
    if (data?.blockIds && data.blockIds.length > 0) {
      if (hasSuppressedBlockId(data.blockIds)) {
        return;
      }
      const blockIds = filterSuppressedBlockIds(data.blockIds);
      if (blockIds.length > 0) {
        await incrementalUpdateTasks(blockIds);
      }
    }
  });

  const unsubscribeDeleted = eventBus.on(Events.TASK_DELETED, ({ blockId }: { blockId: string }) => {
    const taskIndex = tasks.value.findIndex(t => t.blockId === blockId);
    if (taskIndex !== -1) {
      tasks.value = tasks.value.filter(t => t.blockId !== blockId);
      invalidateTableFilters();
    }
  });

  const unsubscribeUpdated = eventBus.on(Events.TASK_UPDATED, async ({ blockId }: { blockId: string }) => {
    if (isDragTaskSyncSuppressed(blockId)) {
      return;
    }
    await incrementalUpdateTasks([blockId]);
  });

  const unsubscribeAdded = eventBus.on(Events.TASK_ADDED, async (payload?: { blockId?: string; reason?: string; seriesId?: string; frequency?: string }) => {
    if (payload?.reason === 'repeat-changed' && payload.frequency) {
      applyRepeatRuleOptimistic(payload);
      scheduleRefreshTasks(100, 'light');
      return;
    }
    if (payload?.blockId) {
      await incrementalUpdateTasks([payload.blockId], { allowUnknown: true });
      if (!tasks.value.some(t => t.blockId === payload.blockId)) {
        scheduleRefreshTasks();
      }
      return;
    }
    scheduleRefreshTasks();
  });

  eventUnsubscribers.push(
    unsubscribeChanged,
    unsubscribeDeleted,
    unsubscribeUpdated,
    unsubscribeAdded
  );
}

function cleanupEventListeners() {
  eventUnsubscribers.forEach(unsubscribe => unsubscribe());
  eventUnsubscribers = [];
}

async function incrementalUpdateTasks(
  blockIds: string[],
  options: { allowUnknown?: boolean } = {}
) {
  const { allowUnknown = false } = options;
  if (isDropping.value) {
    return;
  }
  
  try {
    const normalizedBlockIds = blockIds.filter((id): id is string => typeof id === 'string' && id.length > 0);
    if (normalizedBlockIds.length === 0) {
      return;
    }

    const taskIndexMap = new Map<string, number>();
    tasks.value.forEach((task, index) => {
      if (task && task.blockId) {
        taskIndexMap.set(task.blockId, index);
      }
    });
    const parentBlockIds = new Set<string>();
    
    for (const blockId of normalizedBlockIds) {
      if (taskIndexMap.has(blockId)) {
        parentBlockIds.add(blockId);
      } else {
        let matchedSubtask = false;
        for (const task of tasks.value) {
          if (!task || !task.blockId || !task.subtasks) {
            continue;
          }
          if (hasSubtaskWithId(task.subtasks, blockId)) {
            parentBlockIds.add(task.blockId);
            matchedSubtask = true;
            break;
          }
        }
        if (!matchedSubtask && allowUnknown) {
          parentBlockIds.add(blockId);
        }
      }
    }
    
    if (parentBlockIds.size === 0) {
      return;
    }
    
    const updatedTasksMap = await TaskRepository.getTasksByBlockIds(
      Array.from(parentBlockIds),
      false
    );
    updatedTasksMap.forEach(task => {
      const lockedStatus = task.blockId ? getLockedDraggedTaskStatus(task.blockId) : null;
      if (lockedStatus) {
        task.status = lockedStatus;
      }
    });
    
    let touched = false;

    for (const blockId of parentBlockIds) {
      const updatedTask = updatedTasksMap.get(blockId);
      const oldIndex = taskIndexMap.get(blockId);
      
      if (updatedTask) {
        if (oldIndex !== undefined) {
          const currentTask = tasks.value[oldIndex];
          if (currentTask) {
            Object.assign(currentTask, updatedTask);
          } else {
            tasks.value[oldIndex] = updatedTask;
          }
        } else {
          tasks.value.push(updatedTask);
        }
        touched = true;
      }
    }

    if (touched) {
      applyDraggedStatusLocks(tasks.value);
      invalidateTableFilters();
      
      await nextTick();
    }
  } catch (error) {
    console.error('[KanbanView] 增量更新任务失败:', error);
    scheduleRefreshTasks();
  }
}

function hasSubtaskWithId(subtasks: any[], nodeId: string): boolean {
  for (const subtask of subtasks) {
    if (subtask.nodeId === nodeId) {
      return true;
    }
    if (subtask.subtasks && hasSubtaskWithId(subtask.subtasks, nodeId)) {
      return true;
    }
  }
  return false;
}

function getColumnTaskCount(status: string): number {
  return getFilteredTasksForStatus(status).length;
}

function handleTaskClick(task: Task) {
  if (task.type === 'block' && task.blockId) {
    window.location.href = `siyuan://blocks/${task.blockId}`;
  }
}

function handleTaskDateChanged(updatedTask: Task) {
  const task = tasks.value.find(t => t.id === updatedTask.id);
  if (!task) return;
  
  if (updatedTask.startDate !== task.startDate) {
    crdtRepo.updateTaskField(task.id, 'startDate', updatedTask.startDate);
  }
  
  if (updatedTask.dueDate !== task.dueDate) {
    crdtRepo.updateTaskField(task.id, 'dueDate', updatedTask.dueDate);
  }
  
  if (updatedTask.startTime !== task.startTime) {
    crdtRepo.updateTaskField(task.id, 'startTime', updatedTask.startTime);
  }
  
  if (updatedTask.dueTime !== task.dueTime) {
    crdtRepo.updateTaskField(task.id, 'dueTime', updatedTask.dueTime);
  }
  
  updateTasks();
  eventBus.emit('task-date-changed', updatedTask);
}

function normalizeDocPath(notebookName: string, hPath: string): string {
  const prefix = `${notebookName}/`;
  if (hPath.startsWith(prefix)) {
    return hPath.slice(prefix.length);
  }
  return hPath;
}

function getCurrentSidebarFilterSelection(): { notebookId: string; documentId: string } {
  switch (currentView.value) {
    case 'kanban':
      return {
        notebookId: kanbanFilterType.value,
        documentId: kanbanFilterDocument.value
      };
    case 'table':
      return {
        notebookId: tableFilterType.value,
        documentId: tableFilterDocument.value
      };
    case 'month':
      return {
        notebookId: monthFilterType.value,
        documentId: monthFilterDocument.value
      };
    case 'week':
    default:
      return {
        notebookId: weekFilterType.value,
        documentId: weekFilterDocument.value
      };
  }
}

function resolveCreateTarget(notebookId: string, documentId: string): { notebookId: string; documentId: string; docPath: string } | null {
  if (notebookId === 'all' || documentId === 'all') {
    return null;
  }

  const notebook = notebooks.value.find(nb => nb.id === notebookId);
  if (!notebook) return null;

  const taskInDoc = tasks.value.find(
    t => t.type === 'block' && t.notebookId === notebookId && t.rootId === documentId && !!t.hPath
  );
  if (!taskInDoc?.hPath) return null;

  return {
    notebookId,
    documentId,
    docPath: normalizeDocPath(notebook.name, taskInDoc.hPath)
  };
}

async function handleTaskCreateRequested(payload: CreateTaskPayload) {
  const sidebarSelection = getCurrentSidebarFilterSelection();
  quickCreateNotebookId.value = sidebarSelection.notebookId;
  quickCreateDocumentId.value = sidebarSelection.documentId;
  if (!quickCreateDocumentOptions.value.some(opt => opt.value === quickCreateDocumentId.value)) {
    quickCreateDocumentId.value = 'all';
  }

  quickCreateDialog.value = {
    show: true,
    title: '新建任务',
    payload
  };
  await nextTick();
  quickCreateInputRef.value?.focus();
  quickCreateInputRef.value?.select();
}

function closeQuickCreateDialog() {
  quickCreateNotebookId.value = 'all';
  quickCreateDocumentId.value = 'all';
  quickCreateDialog.value = {
    show: false,
    title: '',
    payload: null
  };
}

async function submitQuickCreateTask() {
  const payload = quickCreateDialog.value.payload;
  const trimmedTitle = quickCreateDialog.value.title.trim();
  if (!payload) return;
  if (!trimmedTitle) {
    await pushMsg('请输入任务标题', 2000);
    return;
  }

  const target = resolveCreateTarget(quickCreateNotebookId.value, quickCreateDocumentId.value);
  if (!target) {
    await pushMsg('请先选择笔记本和文档', 3000);
    return;
  }

  try {
    const created = await TaskRepository.createBlockTask({
      title: trimmedTitle,
      description: '',
      priority: 'none',
      status: 'pending',
      dueDate: payload.dueDate,
      tags: []
    }, target.notebookId, target.docPath);

    if (created?.blockId) {
      await setBlockAttrs(created.blockId, {
        'custom-task-start-date': payload.startDate || '',
        'custom-task-due-date': payload.dueDate || '',
        'custom-task-start-time': payload.startTime || '',
        'custom-task-due-time': payload.dueTime || ''
      });
    }

    closeQuickCreateDialog();
    if (created?.blockId) {
      await incrementalUpdateTasks([created.blockId], { allowUnknown: true });
      if (!tasks.value.some(t => t.blockId === created.blockId)) {
        scheduleRefreshTasks();
      }
    } else {
      scheduleRefreshTasks();
    }
  } catch (error) {
    console.error('[KanbanView] 创建任务失败:', error);
    await pushMsg('创建任务失败，请稍后重试', 3000);
  }
}

async function toggleTaskStatus(task: Task) {
  const newStatus = task.status === 'completed' ? 'pending' : 'completed';

  try {
    if (task.isVirtual && task.repeatSeriesId && task.repeatInstanceDate) {
      await TaskRepository.updateRepeatInstanceStatus(task, newStatus);
      updateTaskLocalField(task.id, 'status', newStatus);
      return;
    }

    if (task.type === 'block' && task.blockId) {
      await setBlockAttrs(task.blockId, {
        'custom-task-status': newStatus
      });
      
      await TaskRepository.clearCache();
      
      if (newStatus === 'completed') {
        await updateTaskMarkdown(task.blockId, true);
      } else {
        await updateTaskMarkdown(task.blockId, false);
      }
      
      crdtRepo.updateTaskField(task.id, 'status', newStatus);
      
      const taskIndex = tasks.value.findIndex(t => t.id === task.id);
      if (taskIndex !== -1) {
        tasks.value[taskIndex].status = newStatus;
      }
    }
  } catch (error) {
    console.error('[KanbanView] 切换任务状态失败:', error);
  }
}

async function handleSubtaskToggle(parentTask: Task, subtask: Task['subtasks'][0]) {
  if (skipSet.has(subtask.id)) {
    return;
  }
  
  const newCompleted = !subtask.completed;
  
  skipTaskTemporarily(skipSet, subtask.id);
  
  const taskIndex = tasks.value.findIndex(t => t.id === parentTask.id);
  if (taskIndex !== -1) {
    const task = tasks.value[taskIndex];
    const updateSubtask = (subtasks: Task['subtasks']) => {
      for (const st of subtasks) {
        if (st.id === subtask.id) {
          st.completed = newCompleted;
          return true;
        }
        if (st.subtasks && updateSubtask(st.subtasks)) {
          return true;
        }
      }
      return false;
    };
    
    if (task.subtasks) {
      updateSubtask(task.subtasks);
    }
  }
  
  if (subtask.nodeId) {
    updateTaskMarkdown(subtask.nodeId, newCompleted).catch(() => {});
  }
  
  TaskRepository.updateSubtaskInCache(parentTask.id, subtask.id, newCompleted).catch(() => {});
}

async function handleDescriptionUpdate(task: Task, description: string) {
  await applyBlockTaskFieldUpdate(
    task,
    { 'custom-task-description': description || '' },
    'description',
    description,
    '更新任务描述失败'
  );
}

async function handlePriorityUpdate(task: Task, priority: Task['priority']) {
  await applyBlockTaskFieldUpdate(
    task,
    { 'custom-task-priority': priority },
    'priority',
    priority,
    '更新任务优先级失败'
  );
}

async function handleStatusUpdate(task: Task, status: Task['status']) {
  await applyBlockTaskFieldUpdate(
    task,
    { 'custom-task-status': status },
    'status',
    status,
    '更新任务状态失败',
    async (blockId) => {
      await updateTaskMarkdown(blockId, status === 'completed');
    }
  );
}

async function handleStartDateUpdate(task: Task, startDate: string) {
  await applyBlockTaskFieldUpdate(
    task,
    { 'custom-task-start-date': startDate || '' },
    'startDate',
    startDate,
    '更新开始日期失败'
  );
}

async function handleDueDateUpdate(task: Task, dueDate: string) {
  await applyBlockTaskFieldUpdate(
    task,
    { 'custom-task-due-date': dueDate || '' },
    'dueDate',
    dueDate,
    '更新截止日期失败'
  );
}

function updateTaskLocalField<K extends keyof Task>(taskId: string, field: K, value: Task[K]): void {
  const taskIndex = tasks.value.findIndex(t => t.id === taskId);
  if (taskIndex === -1) {
    return;
  }
  tasks.value[taskIndex][field] = value;
  tasks.value[taskIndex].updatedAt = new Date().toISOString();
}

async function applyBlockTaskFieldUpdate<K extends keyof Task>(
  task: Task,
  attrs: Record<string, string>,
  field: K,
  value: Task[K],
  errorMessage: string,
  afterUpdate?: (blockId: string) => Promise<void> | void
): Promise<void> {
  if (task.isVirtual && task.repeatSeriesId && task.repeatInstanceDate && field === 'status') {
    try {
      await TaskRepository.updateRepeatInstanceStatus(task, value as Task['status']);
      updateTaskLocalField(task.id, field, value);
    } catch (error) {
      console.error(`[KanbanView] ${errorMessage}:`, error);
    }
    return;
  }

  if (task.type === 'block' && task.blockId) {
    try {
      await setBlockAttrs(task.blockId, attrs);
      updateTaskLocalField(task.id, field, value);
      if (afterUpdate) {
        await afterUpdate(task.blockId);
      }
      eventBus.emit(Events.TASK_CHANGED, { blockIds: [task.blockId] });
    } catch (error) {
      console.error(`[KanbanView] ${errorMessage}:`, error);
    }
  }
}

function handleDragStart(event: DragEvent, task: Task) {
  if (isMobileFrontend) return;

  draggedTask.value = task;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/json', JSON.stringify(task));
    event.dataTransfer.setData('text/plain', task.id);
  }
}

function handleDragEnd() {
  draggedTask.value = null;
  dragOverStatus.value = null;
}

function handleDragOver(event: DragEvent, status: string) {
  if (isMobileFrontend) return;

  event.preventDefault();
  if (draggedTask.value && draggedTask.value.status !== status) {
    dragOverStatus.value = status;
  }
}

function handleDragLeave() {
  dragOverStatus.value = null;
}

async function handleDrop(event: DragEvent, targetStatus: string) {
  if (isMobileFrontend) return;

  event.preventDefault();
  
  if (!draggedTask.value) return;
  
  isDropping.value = true;
  
  const task = draggedTask.value;
  const taskId = task.id;
  
  const taskIndex = tasks.value.findIndex(t => t.id === taskId);
  if (taskIndex === -1) {
    isDropping.value = false;
    return;
  }
  
  const currentTask = tasks.value[taskIndex];
  const oldStatus = currentTask.status;
  
  if (oldStatus === targetStatus) {
    isDropping.value = false;
    return;
  }
  
  const updatedTask = { ...currentTask, status: targetStatus as Task['status'] };
  const droppedBlockId = task.type === 'block' && task.blockId ? task.blockId : null;
  if (droppedBlockId) {
    lockDraggedTaskStatus(droppedBlockId, targetStatus as Task['status']);
    suppressDragTaskSync(droppedBlockId, 1600);
  }
  tasks.value = [
    ...tasks.value.slice(0, taskIndex),
    updatedTask,
    ...tasks.value.slice(taskIndex + 1)
  ];
  invalidateTableFilters();

  // End drag visual state immediately to avoid long "dragging" flicker while async sync is running.
  draggedTask.value = null;
  dragOverStatus.value = null;
  
  try {
    if (task.isVirtual && task.repeatSeriesId && task.repeatInstanceDate) {
      await TaskRepository.updateRepeatInstanceStatus(task, targetStatus as Task['status']);
    } else if (task.type === 'block' && task.blockId) {
      await setBlockAttrs(task.blockId, {
        'custom-task-status': targetStatus
      });
      
      if (targetStatus === 'completed') {
        await updateTaskMarkdown(task.blockId, true);
      } else if (oldStatus === 'completed' && targetStatus !== 'completed') {
        await updateTaskMarkdown(task.blockId, false);
      }
    }
  } catch (error) {
    console.error('[KanbanView] 拖拽更新任务状态失败:', error);
    if (droppedBlockId) {
      unlockDraggedTaskStatus(droppedBlockId);
      dragSyncSuppressUntil.delete(droppedBlockId);
    }
    const revertTaskIndex = tasks.value.findIndex(t => t.id === taskId);
    if (revertTaskIndex !== -1) {
      const revertedTask = { ...tasks.value[revertTaskIndex], status: oldStatus };
      tasks.value = [
        ...tasks.value.slice(0, revertTaskIndex),
        revertedTask,
        ...tasks.value.slice(revertTaskIndex + 1)
      ];
      invalidateTableFilters();
    }
  } finally {
    isDropping.value = false;
  }
  if (droppedBlockId) {
    // Keep optimistic result to avoid post-drop visual flicker; backend events have been suppressed.
    window.setTimeout(() => {
      dragSyncSuppressUntil.delete(droppedBlockId);
    }, 500);
  }
}

onMounted(async () => {
  setupEventListeners();
  await loadSettings();
  await Promise.all([
    loadNotebooks(),
    loadTasks()
  ]);
  await loadUserSettings();
  await validateDocumentSelection();
  startSkipSetCleanup();
});

onUnmounted(() => {
  cleanupEventListeners();
  stopSkipSetCleanup();
  if (saveSettingsTimer !== null) {
    clearTimeout(saveSettingsTimer);
    saveSettingsTimer = null;
  }
  if (fallbackRefreshTimer !== null) {
    clearTimeout(fallbackRefreshTimer);
    fallbackRefreshTimer = null;
  }
  dragStatusLocks.clear();
  dragSyncSuppressUntil.clear();
});
</script>

<style scoped>
.kanban-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--b3-theme-background);
  box-sizing: border-box;
  overflow: hidden;
}

.kanban-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  margin: 10px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  min-width: 0;
}

.kanban-header h1 {
  margin: 0;
  font-size: 24px;
  color: var(--b3-theme-on-background);
}

.view-switcher {
  display: flex;
  gap: 4px;
  background: var(--b3-list-hover);
  padding: 4px;
  border-radius: 6px;
}

.view-btn {
  padding: 6px 12px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--b3-theme-on-surface);
  transition: all 0.2s;
  font-size: 13px;
}

.view-btn:hover {
  background: var(--b3-list-hover);
}

.view-btn.active {
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.refresh-btn {
  background: none;
  border: none;
  padding: 0;
  margin: 0 6px 0 0;
  cursor: pointer;
  width: 26px;
  height: 26px;
  
  svg {
    color: var(--b3-theme-on-background);
  }
}

.filter-bar {
  display: flex;
  gap: 16px;
  padding: 0 12px 12px;
  border-radius: 8px;
}

.filter-bar-inline {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-group label {
  font-size: 14px;
  color: var(--b3-theme-on-surface);
  white-space: nowrap;
  flex-shrink: 0;
}

.filter-group select {
  border-radius: 6px;
  color: var(--b3-theme-on-background);
  font-size: 14px;
}

.filter-info {
  font-size: 14px;
  color: var(--b3-theme-on-surface);
  opacity: 0.7;
}

.loading {
  text-align: center;
  padding: 40px;
  color: var(--b3-theme-on-background);
  font-size: 14px;
}

.quick-create-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
}

.quick-create-dialog {
  width: min(420px, calc(100vw - 32px));
  max-width: calc(100vw - 32px);
  background: var(--b3-theme-surface);
  border: 1px solid var(--b3-border-color);
  border-radius: 10px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
  padding: 14px;
  overflow: hidden;
  box-sizing: border-box;
}

.quick-create-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--b3-theme-on-background);
  margin-bottom: 10px;
}

.quick-create-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.quick-create-row label {
  width: 48px;
  flex-shrink: 0;
  color: var(--b3-theme-on-surface);
  font-size: 13px;
}

.quick-create-input {
  display: block;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  margin-top: 4px;
  border: 1px solid var(--b3-border-color);
  border-radius: 8px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  font-size: 14px;
  padding: 8px 10px;
  outline: none;
  box-sizing: border-box;
}

.quick-create-input:focus {
  border-color: var(--b3-theme-primary);
}

.quick-create-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.quick-create-btn {
  border: 1px solid var(--b3-border-color);
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
}

.quick-create-btn.confirm {
  border-color: var(--b3-theme-primary);
  color: var(--b3-theme-primary);
}

.kanban-board {
  display: flex;
  gap: 10px;
  flex: 1;
  overflow-x: auto;
  align-items: flex-start;
  min-height: 0;
  margin: 0 10px;
}

.kanban-column {
  flex: 1;
  min-width: 280px;
  max-width: 350px;
  display: flex;
  flex-direction: column;
  background: var(--b3-list-hover);
  border-radius: 15px;
  overflow: hidden;
  height: fit-content;
  max-height: 100%;
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
}

.column-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
  color: var(--b3-theme-on-background);
}

.column-title::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.kanban-column.status-pending .column-title::before {
  background: #f59e0b;
}

.kanban-column.status-in-progress .column-title::before {
  background: #3b82f6;
}

.kanban-column.status-completed .column-title::before {
  background: #10b981;
}

.kanban-column.status-cancelled .column-title::before {
  background: #9ca3af;
}

.column-tasks {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.kanban-task-card {
  background: var(--b3-theme-background);
  border-radius: 8px;
  padding: 12px;
  cursor: move;
  transition: box-shadow 0.2s, transform 0.2s;
  box-shadow: #0000000f 0 1px 5px;
}

.kanban-task-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.kanban-task-card[draggable="true"]:active {
  cursor: grabbing;
}

.kanban-task-card.dragging {
  opacity: 0.85;
  transform: rotate(2deg);
}

.column-tasks.drag-over {
  background: rgba(59, 130, 246, 0.15);
  border: 2px dashed #3b82f6;
  border-radius: 8px;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
  transition: all 0.2s ease;
}


.task-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.task-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.task-path {
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  opacity: 0.7;
}

.task-title {
  font-size: 14px;
  color: var(--b3-theme-on-background);
  line-height: 1.4;
}

.task-description {
  font-size: 13px;
  color: var(--b3-theme-on-surface);
  opacity: 0.8;
  margin: 8px 0;
  line-height: 1.5;
  max-height: 4.5em;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  word-break: break-word;
}

.task-meta {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  align-items: center;
}

.task-priority-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
}

.task-priority-badge.priority-high {
  background: #fee2e2;
  color: #dc2626;
}

.task-priority-badge.priority-medium {
  background: #fef3c7;
  color: #d97706;
}

.task-priority-badge.priority-low {
  background: #dbeafe;
  color: #2563eb;
}

.task-due-badge {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  background: #f3f4f6;
  color: #6b7280;
}

.task-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-progress:empty {
  display: none;
}

.task-progress-bar {
  flex: 1;
  height: 4px;
  background: var(--b3-border-color);
  border-radius: 2px;
  overflow: hidden;
}

.task-progress-fill {
  height: 100%;
  background: var(--b3-theme-primary);
  transition: width 0.3s;
}

.task-progress-text {
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  min-width: 40px;
  text-align: right;
}

.empty-column {
  text-align: center;
  padding: 20px;
  color: var(--b3-theme-on-surface);
  opacity: 0.5;
  font-size: 14px;
}
</style>

