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
                'task-completed': task.status === 'completed',
                'dragging': draggedTask && draggedTask.id === task.id
              }
            ]"
            draggable="true"
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
    />
    <WeekView
      v-if="currentView === 'week'"
      :tasks="weekViewTasks"
      @task-date-changed="handleTaskDateChanged"
      @task-click="handleTaskClick"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import { TaskRepository, Task, SubTask, setBlockAttrs, getBlockAttrs } from '../api';
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

const availableDocuments = computed(() => {
  const currentFilterType = currentView.value === 'kanban' ? kanbanFilterType.value : 
                           currentView.value === 'table' ? tableFilterType.value :
                           currentView.value === 'month' ? monthFilterType.value :
                           currentView.value === 'week' ? weekFilterType.value : 'all';
  if (currentFilterType === 'all') return [];
  
  const docs = new Map<string, string>();
  
  for (const task of tasks.value) {
    if (task.type === 'block' &&
        task.notebookId === currentFilterType &&
        task.rootId) {
      const hPath = task.hPath || task.rootId;
      if (!docs.has(task.rootId)) {
        docs.set(task.rootId, hPath);
      }
    }
  }

  return Array.from(docs.entries()).map(([id, path]) => ({
    id,
    name: path.split('/').pop() || path
  }));
});

const documentOptions = computed(() => [
  { value: 'all', text: '全部' },
  ...availableDocuments.value.map(doc => ({ value: doc.id, text: doc.name }))
]);

watch(kanbanFilterType, async (newType, oldType) => {
  if (newType === 'all') {
    kanbanFilterDocument.value = 'all';
  } else if (oldType !== 'all' && kanbanFilterDocument.value !== 'all') {
    kanbanFilterDocument.value = 'all';
  }
  await saveUserSettings();
});

watch(kanbanFilterDocument, async () => {
  await saveUserSettings();
});

watch(kanbanFilterPriority, async () => {
  await saveUserSettings();
});

watch(tableFilterType, async () => {
  await saveUserSettings();
});

watch(tableFilterDocument, async () => {
  await saveUserSettings();
});

watch(monthFilterType, async (newType, oldType) => {
  if (newType === 'all') {
    monthFilterDocument.value = 'all';
  } else if (oldType !== 'all' && monthFilterDocument.value !== 'all') {
    monthFilterDocument.value = 'all';
  }
  await saveUserSettings();
});

watch(monthFilterDocument, async () => {
  await saveUserSettings();
});

watch(weekFilterType, async (newType, oldType) => {
  if (newType === 'all') {
    weekFilterDocument.value = 'all';
  } else if (oldType !== 'all' && weekFilterDocument.value !== 'all') {
    weekFilterDocument.value = 'all';
  }
  await saveUserSettings();
});

watch(weekFilterDocument, async () => {
  await saveUserSettings();
});

watch(currentView, async () => {
  await saveUserSettings();
});

const kanbanFilters = {
  priority: kanbanFilterPriority,
  notebook: kanbanFilterType,
  document: kanbanFilterDocument
};

const tableFilters = {
  priority: ref('all'),
  notebook: tableFilterType,
  document: tableFilterDocument
};

const { filteredByStatus, invalidateCache: invalidateKanbanFilters } = useTaskFilters(tasks, kanbanFilters);
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
  invalidateKanbanFilters();
  invalidateTableFilters();
}, { immediate: true });

function getFilteredTasksForStatus(status: string): Task[] {
  return filteredByStatus.value[status] || [];
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

async function loadTasks(forceRefresh: boolean = false) {
  loading.value = true;
  try {
    if (forceRefresh) {
      await TaskRepository.clearCache();
    }
    const sqlTasks = await TaskRepository.getAllTasks(forceRefresh);
    syncFromSQL(sqlTasks);
    await nextTick();
    validateDocumentSelection();
  } catch (error) {
    console.error('[KanbanView] 加载任务失败:', error);
  } finally {
    loading.value = false;
  }
}

async function refreshTasks() {
  await TaskRepository.clearCache();
  await loadTasks(true);
}

async function loadUserSettings() {
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
  if (kanbanFilterType.value !== 'all' && kanbanFilterDocument.value !== 'all') {
    const availableDocs = availableDocuments.value.map(d => d.id);
    if (!availableDocs.includes(kanbanFilterDocument.value)) {
      kanbanFilterDocument.value = 'all';
      await saveUserSettings();
    }
  }
  
  if (tableFilterType.value !== 'all' && tableFilterDocument.value !== 'all') {
    const availableDocs = availableDocuments.value.map(d => d.id);
    if (!availableDocs.includes(tableFilterDocument.value)) {
      tableFilterDocument.value = 'all';
      await saveUserSettings();
    }
  }
}

function setupEventListeners() {
  const unsubscribeChanged = eventBus.on(Events.TASK_CHANGED, async (data?: { blockIds?: string[] }) => {
    if (data?.blockIds && data.blockIds.length > 0) {
      await incrementalUpdateTasks(data.blockIds);
    }
  });

  const unsubscribeDeleted = eventBus.on(Events.TASK_DELETED, ({ blockId }: { blockId: string }) => {
    const taskIndex = tasks.value.findIndex(t => t.blockId === blockId);
    if (taskIndex !== -1) {
      tasks.value = tasks.value.filter(t => t.blockId !== blockId);
      invalidateKanbanFilters();
      invalidateTableFilters();
    }
  });

  const unsubscribeUpdated = eventBus.on(Events.TASK_UPDATED, async ({ blockId }: { blockId: string }) => {
    await incrementalUpdateTasks([blockId]);
  });

  const unsubscribeAdded = eventBus.on(Events.TASK_ADDED, async () => {
    await refreshTasks();
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

async function incrementalUpdateTasks(blockIds: string[]) {
  if (isDropping.value) {
    return;
  }
  
  try {
    const taskIndexMap = new Map(tasks.value.map((t, i) => [t.blockId, i]));
    const parentBlockIds = new Set<string>();
    
    for (const blockId of blockIds) {
      if (taskIndexMap.has(blockId)) {
        parentBlockIds.add(blockId);
      } else {
        for (const task of tasks.value) {
          if (task.subtasks && hasSubtaskWithId(task.subtasks, blockId)) {
            parentBlockIds.add(task.blockId!);
            break;
          }
        }
      }
    }
    
    if (parentBlockIds.size === 0) {
      return;
    }
    
    await TaskRepository.clearCache();
    
    const updatedTasks = await Promise.all(
      Array.from(parentBlockIds).map(blockId => 
        TaskRepository.getTaskByBlockId(blockId, false)
      )
    );
    
    const updatedTasksMap = new Map(updatedTasks.filter(t => t !== undefined).map(t => [t.blockId!, t]));
    
    const newTasks = [...tasks.value];
    
    for (const blockId of parentBlockIds) {
      const updatedTask = updatedTasksMap.get(blockId);
      const oldIndex = taskIndexMap.get(blockId);
      
      if (updatedTask) {
        if (oldIndex !== undefined) {
          newTasks[oldIndex] = updatedTask;
        } else {
          newTasks.push(updatedTask);
        }
      } else if (oldIndex !== undefined) {
        newTasks.splice(oldIndex, 1);
      }
    }
    
    tasks.value = newTasks;
    
    invalidateKanbanFilters();
    invalidateTableFilters();
    
    await nextTick();
  } catch (error) {
    console.error('[KanbanView] 增量更新失败:', error);
    await refreshTasks();
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

async function toggleTaskStatus(task: Task) {
  if (task.type === 'block' && task.blockId) {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    
    try {
      await setBlockAttrs(task.blockId, {
        'custom-task-status': newStatus
      });
      
      await getBlockAttrs(task.blockId);
      
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
    } catch (error) {
      console.error('[KanbanView] 切换任务状态失败:', error);
    }
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
  if (task.type === 'block' && task.blockId) {
    try {
      await setBlockAttrs(task.blockId, {
        'custom-task-description': description || ''
      });
      
      const taskIndex = tasks.value.findIndex(t => t.id === task.id);
      if (taskIndex !== -1) {
        tasks.value[taskIndex].description = description;
        tasks.value[taskIndex].updatedAt = new Date().toISOString();
      }
      
      eventBus.emit(Events.TASK_CHANGED, { blockIds: [task.blockId] });
    } catch (error) {
      console.error('[KanbanView] 更新任务描述失败:', error);
    }
  }
}

async function handlePriorityUpdate(task: Task, priority: Task['priority']) {
  if (task.type === 'block' && task.blockId) {
    try {
      await setBlockAttrs(task.blockId, {
        'custom-task-priority': priority
      });
      
      const taskIndex = tasks.value.findIndex(t => t.id === task.id);
      if (taskIndex !== -1) {
        tasks.value[taskIndex].priority = priority;
        tasks.value[taskIndex].updatedAt = new Date().toISOString();
      }
      
      eventBus.emit(Events.TASK_CHANGED, { blockIds: [task.blockId] });
    } catch (error) {
      console.error('[KanbanView] 更新任务优先级失败:', error);
    }
  }
}

async function handleStatusUpdate(task: Task, status: Task['status']) {
  if (task.type === 'block' && task.blockId) {
    try {
      await setBlockAttrs(task.blockId, {
        'custom-task-status': status
      });
      
      const taskIndex = tasks.value.findIndex(t => t.id === task.id);
      if (taskIndex !== -1) {
        tasks.value[taskIndex].status = status;
        tasks.value[taskIndex].updatedAt = new Date().toISOString();
      }
      
      if (status === 'completed') {
        await updateTaskMarkdown(task.blockId, true);
      } else {
        await updateTaskMarkdown(task.blockId, false);
      }
      
      eventBus.emit(Events.TASK_CHANGED, { blockIds: [task.blockId] });
    } catch (error) {
      console.error('[KanbanView] 更新任务状态失败:', error);
    }
  }
}

async function handleStartDateUpdate(task: Task, startDate: string) {
  if (task.type === 'block' && task.blockId) {
    try {
      await setBlockAttrs(task.blockId, {
        'custom-task-start-date': startDate || ''
      });
      
      const taskIndex = tasks.value.findIndex(t => t.id === task.id);
      if (taskIndex !== -1) {
        tasks.value[taskIndex].startDate = startDate;
        tasks.value[taskIndex].updatedAt = new Date().toISOString();
      }
      
      eventBus.emit(Events.TASK_CHANGED, { blockIds: [task.blockId] });
    } catch (error) {
      console.error('[KanbanView] 更新开始日期失败:', error);
    }
  }
}

async function handleDueDateUpdate(task: Task, dueDate: string) {
  if (task.type === 'block' && task.blockId) {
    try {
      await setBlockAttrs(task.blockId, {
        'custom-task-due-date': dueDate || ''
      });
      
      const taskIndex = tasks.value.findIndex(t => t.id === task.id);
      if (taskIndex !== -1) {
        tasks.value[taskIndex].dueDate = dueDate;
        tasks.value[taskIndex].updatedAt = new Date().toISOString();
      }
      
      eventBus.emit(Events.TASK_CHANGED, { blockIds: [task.blockId] });
    } catch (error) {
      console.error('[KanbanView] 更新截止日期失败:', error);
    }
  }
}

function handleDragStart(event: DragEvent, task: Task) {
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
  event.preventDefault();
  if (draggedTask.value && draggedTask.value.status !== status) {
    dragOverStatus.value = status;
  }
}

function handleDragLeave() {
  dragOverStatus.value = null;
}

async function handleDrop(event: DragEvent, targetStatus: string) {
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
  tasks.value = [
    ...tasks.value.slice(0, taskIndex),
    updatedTask,
    ...tasks.value.slice(taskIndex + 1)
  ];
  
  try {
    if (task.type === 'block' && task.blockId) {
      await setBlockAttrs(task.blockId, {
        'custom-task-status': targetStatus
      });
      
      await TaskRepository.clearCache();
      
      if (targetStatus === 'completed') {
        await updateTaskMarkdown(task.blockId, true);
      } else if (oldStatus === 'completed' && targetStatus !== 'completed') {
        await updateTaskMarkdown(task.blockId, false);
      }
    }
  } catch (error) {
    console.error('[KanbanView] 更新任务状态失败:', error);
    const revertTaskIndex = tasks.value.findIndex(t => t.id === taskId);
    if (revertTaskIndex !== -1) {
      const revertedTask = { ...tasks.value[revertTaskIndex], status: oldStatus };
      tasks.value = [
        ...tasks.value.slice(0, revertTaskIndex),
        revertedTask,
        ...tasks.value.slice(revertTaskIndex + 1)
      ];
    }
  } finally {
    isDropping.value = false;
  }
  
  draggedTask.value = null;
  dragOverStatus.value = null;
}

onMounted(async () => {
  setupEventListeners();
  await loadSettings();
  await Promise.all([
    loadNotebooks(),
    loadTasks()
  ]);
  loadUserSettings();
  validateDocumentSelection();
  startSkipSetCleanup();
});

onUnmounted(() => {
  cleanupEventListeners();
  stopSkipSetCleanup();
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
  margin-bottom: 16px;
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
  transition: all 0.2s;
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
  opacity: 0.5;
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
