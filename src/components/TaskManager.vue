<template>
  <div class="task-manager-container">
    <div class="task-manager-header">
      <div class="header-left">
        <div class="collapse-arrow" @click="toggleTaskListCollapsed" :class="{ collapsed: isTaskListCollapsed }">
          <Icon name="arrowDown" width="16" height="16" class="icon" />
        </div>
        <div class="title">{{ t('taskManager.title') }}</div>
      </div>
      <div class="header-actions">
        <SyButton
          size="small"
          class="task-scope-button"
          title="任务范围"
          aria-label="任务范围"
          @click="openTaskScopeDialog"
        >
          <Icon name="taskScope" width="24" height="24" class="icon refresh-icon" />
        </SyButton>
        <SyButton
          size="small"
          class="task-refresh"
          :class="{ 'is-refreshing': isRefreshButtonSpinning }"
          @click="handleRefreshClick"
        >
          <Icon name="refresh" width="22" height="22" class="icon refresh-icon" />
        </SyButton>
        <SyButton size="small" class="new-task-button" @click="showTaskModal = true">
          <Icon name="add" width="24" height="24" class="icon" />
        </SyButton>
        <SyButton size="small" class="view-all-button" @click="openKanbanView">
          查看所有
        </SyButton>
    </div>
    </div>
    
    <div class="filters-row" v-show="!isTaskListCollapsed">
      <div class="filters-bar">
        <div class="filter-group">
          <label>{{ t('taskManager.notebook') }}:</label>
          <SySelect
            :model-value="filterNotebook"
            @update:model-value="filterNotebook = $event"
            :options="notebookOptions"
          />
        </div>
        <div v-if="filterNotebook !== 'all'" class="filter-group">
          <label>{{ t('taskManager.document') }}:</label>
          <SySelect
            :model-value="filterDocument"
            @update:model-value="filterDocument = $event"
            :options="documentOptions"
          />
        </div>
      </div>
      <div v-if="hasVisibleExpandableTasks" class="filters-actions">
        <button
          type="button"
          class="subtasks-toggle-btn"
          :class="{ expanded: areAllVisibleSubtasksExpanded }"
          :title="areAllVisibleSubtasksExpanded ? '一键折叠详情' : '一键展开详情'"
          :aria-label="areAllVisibleSubtasksExpanded ? '一键折叠详情' : '一键展开详情'"
          @click="toggleAllVisibleSubtasks"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 8l5 5 5-5" />
            <path d="M7 12l5 5 5-5" />
          </svg>
        </button>
      </div>
    </div>
    
    <div v-if="loading" class="loading" v-show="!isTaskListCollapsed">{{ t('taskManager.loading') }}</div>
    <div v-else class="tasks-list" v-show="!isTaskListCollapsed">
      <div v-if="displayedTasks.length === 0" class="empty-state">
        {{ t('taskManager.noTasks') }}
      </div>
      <div 
        v-for="task in displayedTasks" 
        :key="task.id" 
        class="task-item" 
        :class="[
          `status-${task.status}`,
          `priority-${task.priority}`,
          { 'task-completed': task.status === 'completed' }
        ]"
        :draggable="!isMobileFrontend"
        @dragstart="handleDragStart($event, task)"
        @contextmenu.prevent="handleTaskContextMenu($event, task)"
      >
        <div class="task-content" @click="handleTaskClick(task)">
          <div class="task-header">
            <div class="task-checkbox-wrapper" @click.stop="toggleTaskStatus(task)">
              <TaskCheckbox :checked="task.status === 'completed'" :size="18" />
            </div>
            <div class="task-title" v-html="sanitizeTaskTitleHtml(task.title)"></div>
            <div class="task-badges">
              <span v-if="task.priority !== 'none'" class="task-priority-badge" :class="`priority-${task.priority}`">
                <Icon name="flag" width="12" height="12" />
              </span>
              <span v-if="task.dueDate" class="task-due-badge">
                <Icon name="calendar" width="12" height="12" />
                {{ formatDate(task.dueDate) }}
              </span>
              <span 
                v-if="task.description || (task.subtasks && task.subtasks.length > 0)"
                class="task-expand-btn"
                :class="{ expanded: expandedSubtasks.has(task.id) || expandedDescriptions.has(task.id) }"
                @click.stop="toggleTaskExpand(task.id)"
              >
                <Icon name="chevronRight" width="14" height="14" />
              </span>
            </div>
          </div>
          
          <div v-if="!editingTasks.has(task.id) && task.description && (expandedDescriptions.has(task.id) || expandedSubtasks.has(task.id))" class="task-description" v-html="sanitizeTaskHtml(task.description)">
          </div>
          
          <div v-if="editingTasks.has(task.id)" class="task-edit-panel" @click.stop>
            <div class="edit-field">
              <label>描述</label>
              <textarea 
                v-model="editingTasks.get(task.id).description" 
                placeholder="添加任务描述..." 
                rows="2"
              />
            </div>
            <div class="edit-field">
              <label>优先级</label>
              <select v-model="editingTasks.get(task.id).priority">
                <option value="high">高优先级</option>
                <option value="medium">中优先级</option>
                <option value="low">低优先级</option>
                <option value="none">无优先级</option>
              </select>
            </div>
            <div class="edit-field">
              <label>截止日期</label>
              <input 
                type="date" 
                v-model="editingTasks.get(task.id).dueDate"
              />
            </div>
            <div class="edit-actions">
              <button class="save-btn" @click="saveTaskEdit(task)">保存</button>
              <button class="cancel-btn" @click="cancelTaskEdit(task.id)">取消</button>
            </div>
          </div>
          <div v-if="task.subtasks && task.subtasks.length > 0 && expandedSubtasks.has(task.id)" class="subtasks-list">
            <SubTaskItem
              v-for="subtask in task.subtasks"
              :key="subtask.id"
              :subtask="subtask"
              :level="1"
              :parent-task-id="task.id"
              @toggle="handleSubtaskToggle"
            />
          </div>
        </div>
      </div>
      <button
        v-if="hasHiddenCompletedTasks"
        class="more-completed-button"
        type="button"
        @click="showMoreCompletedTasks"
      >
        更多已完成
      </button>
    </div>
    
    <TaskModal 
      :show="showTaskModal" 
      :t="t"
      :notebooks="enabledNotebooks"
      :documents="allDocuments"
      :lastSelectedNotebook="taskModalDefaultNotebook"
      :lastSelectedDocument="taskModalDefaultDocument"
      @close="showTaskModal = false"
      @submit="handleCreateTask"
    />
    <TaskScopeDialog
      :show="showTaskScopeDialog"
      :notebooks="notebooks"
      :excluded-notebook-ids="excludedNotebookIds"
      :show-completed-tasks="showCompletedTasks"
      :lock-close="requiresScopeInitialization"
      :title="requiresScopeInitialization ? '初始化任务范围' : '任务范围'"
      :hint="requiresScopeInitialization
        ? '首次使用请先设置任务抓取范围。开关关闭表示排除该笔记本，开关开启表示参与任务抓取。'
        : '开关关闭后将排除该笔记本，任务列表和看板不再抓取它的任务。'"
      :confirm-text="requiresScopeInitialization ? '开始使用' : '保存'"
      @close="showTaskScopeDialog = false"
      @save="handleTaskScopeSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { getFrontend } from 'siyuan';
import SyButton from '@/components/SiyuanTheme/SyButton.vue';
import SySelect from '@/components/SiyuanTheme/SySelect.vue';
import TaskCheckbox from '@/components/TaskCheckbox.vue';
import SubTaskItem from '@/components/SubtaskItem.vue';
import TaskModal, { Notebook, Document } from '@/components/TaskModal.vue';
import TaskScopeDialog from '@/components/TaskScopeDialog.vue';
import Icon from '@/components/Icon.vue';
import { TaskRepository, Task, lsNotebooks, createDocWithMd, getIDsByHPath, setBlockAttrs, getBlockKramdown, sql, openBlockById, type TaskQueryScope } from '@/api';
import { updateTaskMarkdown, skipTaskTemporarily, cleanTaskTitle } from '@/utils/taskHelpers';
import { openKanbanView } from '@/main';
import { useUserSettings } from '@/composables/useUserSettings';
import { useTaskFilters } from '@/composables/useTaskFilters';
import { eventBus, Events } from '@/utils/eventBus';
import { getCrdtRepository, useCrdtTasks } from '@/crdtStore';
import { formatDate } from '@/utils/dateHelpers';
import { createBlockIdBatchQueue } from '@/utils/blockIdBatchQueue';
import {
  applyRepeatRuleOptimisticToTasks,
  getDocumentCreationSortKey,
  normalizeNotebookIds,
  type RepeatRulePayload
} from '@/utils/taskViewShared';

const { data: userSettings, loadSettings, updateSettings } = useUserSettings();

const t = (key: string) => {
  const lang = window.siyuan?.languages || {};
  const defaultLang: Record<string, string> = {
    'taskManager.title': '任务管理',
    'taskManager.status': '状态',
    'taskManager.statusAll': '全部',
    'taskManager.statusPending': '待处理',
    'taskManager.statusInProgress': '进行中',
    'taskManager.statusCompleted': '已完成',
    'taskManager.statusCancelled': '已取消',
    'taskManager.priority': '优先级',
    'taskManager.priorityAll': '全部',
    'taskManager.priorityHigh': '高',
    'taskManager.priorityMedium': '中',
    'taskManager.priorityLow': '低',
    'taskManager.priorityNone': '无',
    'taskManager.notebook': '笔记本',
    'taskManager.all': '全部',
    'taskManager.document': '文档',
    'taskManager.filter': '筛选',
    'taskManager.refresh': '刷新',
    'taskManager.addTask': '新建任务',
    'taskManager.expandAll': '展开全部',
    'taskManager.collapseAll': '收起全部',
    'taskManager.taskList': '任务列表',
    'taskManager.noTasks': '暂无任务',
    'taskManager.taskName': '任务名称',
    'taskManager.dueDate': '截止日期',
    'taskManager.save': '保存'
  };
  return (lang as Record<string, string>)[key] || defaultLang[key] || key;
};

const TASK_MANAGER_CRDT_STORE_ID = 'task-manager';
const crdtRepo = getCrdtRepository(TASK_MANAGER_CRDT_STORE_ID);
const { tasks } = useCrdtTasks(TASK_MANAGER_CRDT_STORE_ID);
let isMobileFrontend = false;
try {
  const frontend = getFrontend();
  isMobileFrontend = frontend === 'mobile' || frontend === 'browser-mobile';
} catch {
  isMobileFrontend = false;
}
const loading = ref(false);
const isRefreshButtonSpinning = ref(false);
const showTaskModal = ref(false);
const showTaskScopeDialog = ref(false);
const requiresScopeInitialization = ref(false);
const excludedNotebookIds = ref<string[]>([]);
const showCompletedTasks = ref(true);
const lastTaskNotebook = ref<string>('');
const lastTaskDocument = ref<string>('');
const expandedSubtasks = ref(new Set<string>());
const expandedDescriptions = ref(new Set<string>());
const editingTasks = ref(new Map<string, Task>());
const isTaskListCollapsed = ref(false);
const notebooks = ref<Notebook[]>([]);
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

const filterNotebook = ref<string>('all');
const filterDocument = ref<string>('all');

const taskModalDefaultNotebook = computed(() => {
  if (filterNotebook.value !== 'all') {
    return filterNotebook.value;
  }
  return lastTaskNotebook.value || '';
});

const taskModalDefaultDocument = computed(() => {
  if (filterNotebook.value !== 'all' && filterDocument.value !== 'all') {
    return filterDocument.value;
  }
  return lastTaskDocument.value || '';
});
let filterSettingsUpdateTimer: number | null = null;

const enabledNotebooks = computed(() => {
  const excludedIdSet = new Set(excludedNotebookIds.value);
  return notebooks.value.filter(notebook => !excludedIdSet.has(notebook.id));
});

const notebookOptions = computed(() => {
  return [
    { value: 'all', text: t('taskManager.all') },
    ...enabledNotebooks.value.map(nb => ({ value: nb.id, text: nb.name }))
  ];
});

const toggleTaskListCollapsed = () => {
  isTaskListCollapsed.value = !isTaskListCollapsed.value;
};

let lastRefreshTime = 0;

let eventUnsubscribers: Array<() => void> = [];
const processingBlockIds = new Set<string>();
let fallbackRefreshTimer: number | null = null;
const MAX_INCREMENTAL_BLOCKS_PER_FLUSH = 80;
const FALLBACK_FAILURE_THRESHOLD = 2;
let consecutiveFallbackFailures = 0;
let lastMismatchForceRefreshAt = 0;
const MISMATCH_FORCE_REFRESH_COOLDOWN = 500;
let taskScopeRefreshTimer: number | null = null;
let isHydratingFilters = true;
let lastTaskDocumentOptionsRefreshAt = 0;
const TASK_DOCUMENT_OPTIONS_CACHE_TTL = 60000;
const PINCH_INBOX_OPTION_ID = '__pinch_inbox__';

// Tracks tasks whose dates were just cleared, to prevent stale values from being written back by delayed events.
const recentlyDeletedDates = ref(new Map<string, { startDate: null; dueDate: null; timestamp: number }>());

// Short-lived guard map for date deletion reconciliation.

interface TaskIndex {
  task: Task;
  isSubtask: boolean;
  parentTaskId?: string;
}

const blockIdToTaskIndex = new Map<string, TaskIndex>();
const subtaskToParentMap = new Map<string, string>();
const sanitizedHtmlCache = new Map<string, string>();
const taskDocumentsByNotebook = ref<Map<string, Document[]>>(new Map());

// === Notebook/document option derivation and persisted filter selection ===
const allDocuments = computed(() => {
  return Array.from(taskDocumentsByNotebook.value.values()).flat();
});

const documentOptions = computed(() => {
  if (filterNotebook.value === 'all') return [];
  
  const docs = taskDocumentsByNotebook.value.get(filterNotebook.value) || [];
  return [
    { value: 'all', text: t('taskManager.all') },
    ...docs.map(doc => ({ value: doc.id, text: doc.name }))
  ];
});

function normalizeDocumentSelection(notebookId: string): void {
  if (notebookId === 'all') {
    if (filterDocument.value !== 'all') {
      filterDocument.value = 'all';
    }
    return;
  }

  if (filterDocument.value !== 'all') {
    const availableDocs = documentOptions.value.map(d => d.value);
    if (!availableDocs.includes(filterDocument.value)) {
      filterDocument.value = 'all';
    }
  }
}

function buildTaskDocumentScopeSql(alias: string = 'b'): string {
  const excluded = normalizeNotebookIds(excludedNotebookIds.value);
  if (excluded.length === 0) {
    return '';
  }
  const idsClause = excluded.map(id => `'${escapeSqlLiteral(id)}'`).join(',');
  return ` AND ${alias}.box NOT IN (${idsClause})`;
}

function buildTaskDocumentCompletionSql(alias: string = 'b'): string {
  if (showCompletedTasks.value) {
    return ` AND (${alias}.markdown LIKE '%[ ]%' OR ${alias}.markdown LIKE '%[x]%' OR ${alias}.markdown LIKE '%[X]%')`;
  }
  return ` AND ${alias}.markdown LIKE '%[ ]%'`;
}

async function refreshTaskDocumentOptions(force = false): Promise<void> {
  if (
    !force &&
    taskDocumentsByNotebook.value.size > 0 &&
    Date.now() - lastTaskDocumentOptionsRefreshAt < TASK_DOCUMENT_OPTIONS_CACHE_TTL
  ) {
    return;
  }

  try {
    const rows = await sql(`
      SELECT b.box, b.root_id, MIN(b.hpath) as hpath
      FROM blocks b
      WHERE (b.type = 'i' OR b.type = 'p')
        ${buildTaskDocumentScopeSql('b')}
        AND b.subtype = 't'
        ${buildTaskDocumentCompletionSql('b')}
      GROUP BY b.box, b.root_id
      ORDER BY b.box, b.root_id
    `) as Array<{ box?: string; root_id?: string; hpath?: string }>;

    const nextMap = new Map<string, Document[]>();
    for (const row of rows || []) {
      const notebookId = typeof row?.box === 'string' ? row.box : '';
      const rootId = typeof row?.root_id === 'string' ? row.root_id : '';
      if (!notebookId || !rootId) {
        continue;
      }

      const rawPath = typeof row?.hpath === 'string' && row.hpath.trim().length > 0
        ? row.hpath
        : rootId;
      const name = rawPath.split('/').pop() || rawPath;
      const docs = nextMap.get(notebookId) || [];
      docs.push({
        id: rootId,
        name,
        notebookId,
        path: rawPath
      });
      nextMap.set(notebookId, docs);
    }

    nextMap.forEach((docs, notebookId) => {
      const dedupById = new Map<string, Document>();
      for (const doc of docs) {
        if (!dedupById.has(doc.id)) {
          dedupById.set(doc.id, doc);
        }
      }
      nextMap.set(
        notebookId,
        Array.from(dedupById.values()).sort((a, b) => {
          const timeDiff = getDocumentCreationSortKey(b.id) - getDocumentCreationSortKey(a.id);
          if (timeDiff !== 0) return timeDiff;
          return a.name.localeCompare(b.name, 'zh-CN');
        })
      );
    });

    taskDocumentsByNotebook.value = nextMap;
    lastTaskDocumentOptionsRefreshAt = Date.now();
  } catch {
    taskDocumentsByNotebook.value = new Map();
    lastTaskDocumentOptionsRefreshAt = 0;
  }
}

function scheduleFilterSettingsUpdate() {
  if (filterSettingsUpdateTimer !== null) {
    clearTimeout(filterSettingsUpdateTimer);
  }

  filterSettingsUpdateTimer = window.setTimeout(async () => {
    await updateSettings('taskManager', {
      filterNotebook: filterNotebook.value,
      filterDocument: filterDocument.value
    });
  }, 200);
}

watch([filterNotebook, filterDocument], ([newNotebook]) => {
  const previousDocument = filterDocument.value;
  normalizeDocumentSelection(newNotebook);
  if (isHydratingFilters) {
    return;
  }
  if (requiresScopeInitialization.value) {
    return;
  }

  scheduleTaskScopeRefresh(100);

  if (filterDocument.value !== previousDocument) {
    return;
  }

  scheduleFilterSettingsUpdate();
});

const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2, 'none': 3 };

const taskFilters = {
  notebook: filterNotebook,
  document: filterDocument
};

function getCurrentTaskQueryScope(): TaskQueryScope | undefined {
  const includeCompleted = showCompletedTasks.value;
  if (filterNotebook.value === 'all' && includeCompleted) {
    return undefined;
  }

  const scope: TaskQueryScope = {
    includeCompleted
  };
  if (filterNotebook.value !== 'all') {
    scope.notebookId = filterNotebook.value;
  }
  if (filterNotebook.value !== 'all' && filterDocument.value !== 'all') {
    scope.documentId = filterDocument.value;
  }
  return scope;
}

function scheduleTaskScopeRefresh(delay = 100): void {
  if (taskScopeRefreshTimer !== null) {
    clearTimeout(taskScopeRefreshTimer);
  }
  taskScopeRefreshTimer = window.setTimeout(async () => {
    taskScopeRefreshTimer = null;
    await refreshTasks(false, {
      showLoading: false,
      compareExisting: false,
      ignoreThrottle: true,
      source: 'filter-switch'
    });
  }, delay);
}

// === Task patch helpers and filtered/sorted list derivation ===
function patchTask(
  taskList: any[],
  targetId: string,
  patch: (t: any) => void,
  matchBy: 'id' | 'blockId' | 'nodeId' = 'id'
): boolean {
  for (const t of taskList) {
    if (t[matchBy] === targetId) {
      patch(t);
      return true;
    }
    if (t.subtasks && patchTask(t.subtasks, targetId, patch, matchBy)) {
      return true;
    }
  }
  return false;
}

async function refreshInternalState() {
  invalidateCache();
  lastSortedHash = '';
  cachedSortedTasks = [];
  updateTaskIndex();
}

function invalidateSortCache() {
  lastSortedHash = '';
  cachedSortedTasks = [];
}

const { filtered: baseFilteredTasks, invalidateCache } = useTaskFilters(tasks, taskFilters);

let lastSortedHash = '';
let cachedSortedTasks: Task[] = [];
const MAX_VISIBLE_COMPLETED_TASKS = 3;
const showAllCompletedTasks = ref(false);

const filteredTasks = computed(() => {
  const includeCompleted = showCompletedTasks.value;
  const baseFiltered = baseFilteredTasks.value.filter(task => {
    if (task.isVirtual) {
      return false;
    }
    if (!includeCompleted && task.status === 'completed') {
      return false;
    }
    const title = task.title?.trim();
    return title && title !== '' && title !== '-';
  });
  
  const hash = `${includeCompleted ? '1' : '0'}:` +
               baseFiltered.map(t => t.id).join(':') +
               baseFiltered.map(t => `${t.status}-${t.priority}-${t.updatedAt}-${t.blockId}`).join('|');

  const isSortedCacheHit = hash === lastSortedHash && cachedSortedTasks.length > 0;

  if (isSortedCacheHit) {
    return cachedSortedTasks;
  }
  
  const result = [...baseFiltered].sort((a, b) => {
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
      const priorityA = priorityOrder[a.priority] ?? 3;
      const priorityB = priorityOrder[b.priority] ?? 3;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
    }

    // Stable fallback ordering: prefer blockId, then id/createdAt (blockId is time-sortable: YYYYMMDDHHmmss-xxx).
    const aSortKey = a.blockId || a.id || a.createdAt || '';
    const bSortKey = b.blockId || b.id || b.createdAt || '';
    return bSortKey.localeCompare(aSortKey);
  });
  
  lastSortedHash = hash;
  cachedSortedTasks = result;
  
  return result;
});

const hasHiddenCompletedTasks = computed(() => {
  if (!showCompletedTasks.value) {
    return false;
  }
  if (showAllCompletedTasks.value) {
    return false;
  }

  let completedCount = 0;
  for (const task of filteredTasks.value) {
    if (task.status === 'completed') {
      completedCount += 1;
      if (completedCount > MAX_VISIBLE_COMPLETED_TASKS) {
        return true;
      }
    }
  }

  return false;
});

const displayedTasks = computed(() => {
  if (showAllCompletedTasks.value) {
    return filteredTasks.value;
  }

  let visibleCompletedCount = 0;
  return filteredTasks.value.filter((task) => {
    if (task.status !== 'completed') {
      return true;
    }

    visibleCompletedCount += 1;
    return visibleCompletedCount <= MAX_VISIBLE_COMPLETED_TASKS;
  });
});

const visibleExpandableTasks = computed(() =>
  displayedTasks.value
    .map(task => {
      const hasSubtasks = Array.isArray(task.subtasks) && task.subtasks.length > 0;
      const hasDescription = typeof task.description === 'string' && task.description.trim().length > 0;
      return {
        id: task.id,
        hasSubtasks,
        hasDescription
      };
    })
    .filter(task => task.hasSubtasks || task.hasDescription)
);

const hasVisibleExpandableTasks = computed(() => visibleExpandableTasks.value.length > 0);

const areAllVisibleSubtasksExpanded = computed(() => {
  const taskMetaList = visibleExpandableTasks.value;
  return taskMetaList.length > 0 && taskMetaList.every(({ id, hasSubtasks, hasDescription }) => {
    const subtasksExpanded = !hasSubtasks || expandedSubtasks.value.has(id);
    const descriptionExpanded = !hasDescription || expandedDescriptions.value.has(id);
    return subtasksExpanded && descriptionExpanded;
  });
});

function showMoreCompletedTasks() {
  showAllCompletedTasks.value = true;
}

function toggleAllVisibleSubtasks() {
  const taskMetaList = visibleExpandableTasks.value;
  if (taskMetaList.length === 0) return;

  const shouldCollapse = areAllVisibleSubtasksExpanded.value;
  for (const { id, hasSubtasks, hasDescription } of taskMetaList) {
    if (shouldCollapse) {
      if (hasSubtasks) {
        expandedSubtasks.value.delete(id);
      }
      if (hasDescription) {
        expandedDescriptions.value.delete(id);
      }
      continue;
    }
    if (hasSubtasks) {
      expandedSubtasks.value.add(id);
    }
    if (hasDescription) {
      expandedDescriptions.value.add(id);
    }
  }
}

function applyRepeatRuleOptimistic(payload: RepeatRulePayload) {
  const { nextTasks, touched } = applyRepeatRuleOptimisticToTasks(tasks.value, payload);
  if (nextTasks !== tasks.value) {
    tasks.value = nextTasks;
  }
  if (touched) {
    invalidateCache();
    invalidateSortCache();
    updateTaskIndex();
  }
}

function toggleTaskExpand(taskId: string) {
  const task = tasks.value.find(t => t.id === taskId);
  const hasSubtasks = task?.subtasks && task.subtasks.length > 0;
  
  if (hasSubtasks) {
    if (expandedSubtasks.value.has(taskId)) {
      expandedSubtasks.value.delete(taskId);
      expandedDescriptions.value.delete(taskId);
    } else {
      expandedSubtasks.value.add(taskId);
      expandedDescriptions.value.add(taskId);
    }
  } else {
    if (expandedDescriptions.value.has(taskId)) {
      expandedDescriptions.value.delete(taskId);
    } else {
      expandedDescriptions.value.add(taskId);
    }
  }
}

function updateTaskIndex() {
  blockIdToTaskIndex.clear();
  subtaskToParentMap.clear();
  
  tasks.value.forEach((task) => {
    if (task.blockId) {
      blockIdToTaskIndex.set(task.blockId, {
        task,
        isSubtask: false
      });
    }
    
    if (task.subtasks) {
      indexSubtasks(task.subtasks, task.id, task.blockId!);
    }
  });
}

function indexSubtasks(subtasks: Task['subtasks'] | undefined, parentTaskId: string, parentBlockId: string) {
  if (!subtasks) return;
  
  for (const subtask of subtasks) {
    if (subtask.nodeId) {
      blockIdToTaskIndex.set(subtask.nodeId, {
        task: subtask as any,
        isSubtask: true,
        parentTaskId
      });
      subtaskToParentMap.set(subtask.nodeId, parentBlockId);
    }
    
    if (subtask.subtasks) {
      indexSubtasks(subtask.subtasks, parentTaskId, parentBlockId);
    }
  }
}

async function loadNotebooks() {
  try {
    const result = await lsNotebooks();
    if (result && result.notebooks) {
      notebooks.value = result.notebooks
        .filter((nb) => !nb.closed)
        .map((nb) => ({
          id: nb.id,
          name: nb.name
        }));
    }
  } catch (error) {
    // Ignore notebook load errors; later refresh attempts will retry.
  }
}

function applyExcludedNotebookScope(ids: string[]): void {
  const normalized = normalizeNotebookIds(ids);
  excludedNotebookIds.value = normalized;
  TaskRepository.setExcludedNotebookIds(normalized);
}

function ensureActiveNotebookFilterInScope(): void {
  if (filterNotebook.value !== 'all' && excludedNotebookIds.value.includes(filterNotebook.value)) {
    filterNotebook.value = 'all';
    filterDocument.value = 'all';
  }
}

async function openTaskScopeDialog() {
  if (notebooks.value.length === 0) {
    await loadNotebooks();
  }
  showTaskScopeDialog.value = true;
}

async function handleTaskScopeSave(
  selectedVisibleExcludedNotebookIds: string[],
  nextShowCompletedTasks: boolean
) {
  const visibleNotebookIds = new Set(notebooks.value.map(notebook => notebook.id));
  const hiddenExcludedNotebookIds = excludedNotebookIds.value.filter(id => !visibleNotebookIds.has(id));
  const mergedExcludedNotebookIds = normalizeNotebookIds([
    ...hiddenExcludedNotebookIds,
    ...selectedVisibleExcludedNotebookIds
  ]);

  applyExcludedNotebookScope(mergedExcludedNotebookIds);
  showCompletedTasks.value = nextShowCompletedTasks;
  const shouldFinalizeInit = requiresScopeInitialization.value;
  await updateSettings('taskManager', {
    excludedNotebookIds: mergedExcludedNotebookIds,
    showCompletedTasks: nextShowCompletedTasks,
    ...(shouldFinalizeInit ? { scopeInitialized: true } : {})
  });
  if (shouldFinalizeInit) {
    requiresScopeInitialization.value = false;
  }
  showTaskScopeDialog.value = false;
  await refreshTaskDocumentOptions(true);
  ensureActiveNotebookFilterInScope();
  await refreshTasks(true, { showLoading: false, compareExisting: false, source: 'scope-save' });
}
async function handleRefreshClick() {
  if (requiresScopeInitialization.value) {
    showTaskScopeDialog.value = true;
    return;
  }

  if (isRefreshButtonSpinning.value) {
    return;
  }

  isRefreshButtonSpinning.value = true;
  try {
    await refreshTasks(true, { source: 'manual-refresh' });
  } finally {
    isRefreshButtonSpinning.value = false;
  }
}

async function refreshTasks(
  force = false,
  options: {
    showLoading?: boolean;
    compareExisting?: boolean;
    ignoreThrottle?: boolean;
    source?: string;
  } = {}
) {
  if (requiresScopeInitialization.value) {
    return;
  }

  const {
    showLoading = false,
    compareExisting = true,
    ignoreThrottle = false,
    source = 'general'
  } = options;
  const now = Date.now();
  const SKIP_DELAY = 500;
  if (!force && !ignoreThrottle && now - lastRefreshTime < SKIP_DELAY) {
    return;
  }
  lastRefreshTime = now;

  try {
    if (showLoading) {
      loading.value = true;
    }
    if (notebooks.value.length === 0) {
      await loadNotebooks();
    }
    await refreshTaskDocumentOptions(force);

    const useLiveDom = source === 'manual-refresh' || source === 'create-task';
    const sqlTasks = await TaskRepository.getAllTasks(
      !force,
      getCurrentTaskQueryScope(),
      { useLiveDom }
    );

    crdtRepo.syncFromSQLTasks(sqlTasks);
    const newTasks = crdtRepo.getTasks();

    if (!compareExisting || force || hasTasksChanged(tasks.value, newTasks)) {
      invalidateCache();
      tasks.value = newTasks;
      invalidateSortCache();

      await nextTick();
      updateTaskIndex();
    }
    consecutiveFallbackFailures = 0;
  } catch {
    // Keep current UI state on refresh failure; the next cycle will reconcile.
  } finally {
    if (showLoading) {
      loading.value = false;
    }
  }
}

function scheduleFallbackRefresh(
  force = true,
  delay = 180,
  strategy: 'threshold' | 'immediate' = 'threshold'
) {
  if (strategy === 'threshold') {
    consecutiveFallbackFailures = Math.min(
      consecutiveFallbackFailures + 1,
      FALLBACK_FAILURE_THRESHOLD
    );
    if (consecutiveFallbackFailures < FALLBACK_FAILURE_THRESHOLD) {
      return;
    }
  }

  if (fallbackRefreshTimer !== null) {
    clearTimeout(fallbackRefreshTimer);
  }

  fallbackRefreshTimer = window.setTimeout(async () => {
    fallbackRefreshTimer = null;
    await refreshTasks(force, { showLoading: false, compareExisting: true, source: 'fallback-refresh' });
  }, delay);
}

function isDeepEqual(oldItem: any, newItem: any, options: { checkUpdatedAt?: boolean } = {}): boolean {
  if (options.checkUpdatedAt && oldItem.updatedAt && newItem.updatedAt && oldItem.updatedAt !== newItem.updatedAt) {
    return false;
  }
  
  const parentFields = ['title', 'status', 'priority', 'description', 'type', 'completedAt'];
  if (parentFields.some(f => oldItem[f] !== newItem[f])) {
    return false;
  }
  
  if (oldItem.startDate !== newItem.startDate || oldItem.dueDate !== newItem.dueDate) {
    return false;
  }
  
  if ('completed' in oldItem && 'completed' in newItem) {
    if (oldItem.completed !== newItem.completed) {
      return false;
    }
  }
  
  const oldSubs = oldItem.subtasks || [];
  const newSubs = newItem.subtasks || [];
  if (oldSubs.length !== newSubs.length) {
    return false;
  }
  
  return oldSubs.every((sub, i) => isDeepEqual(sub, newSubs[i], options));
}

function hasTasksChanged(oldTasks: Task[], newTasks: Task[]): boolean {
  if (oldTasks.length !== newTasks.length) return true;
  
  const oldTaskMap = new Map(oldTasks.map(t => [t.id, t]));
  const newTaskMap = new Map(newTasks.map(t => [t.id, t]));
  
  for (const [id, newTask] of newTaskMap) {
    const oldTask = oldTaskMap.get(id);
    
    if (!oldTask) return true;
    
    // Also compare updatedAt so in-place edits are detected even when ids are unchanged.
    if (!isDeepEqual(oldTask, newTask, { checkUpdatedAt: true })) {
      return true;
    }
  }
  
  return false;
}

const incrementalUpdateQueue = createBlockIdBatchQueue({
  maxBatchSize: MAX_INCREMENTAL_BLOCKS_PER_FLUSH,
  onFlushBatch: async (blockIds) => {
    await incrementalUpdateTasks(blockIds);
  }
});

function queueIncrementalUpdates(blockIds: string[], delay = 24): void {
  incrementalUpdateQueue.enqueue(blockIds, delay);
}



function setupEventListeners() {
  const unsubscribe = eventBus.on(Events.TASK_CHANGED, (data?: { blockIds?: string[] }) => {
    if (data?.blockIds && data.blockIds.length > 0) {
      queueIncrementalUpdates(data.blockIds);
    } else {
      scheduleFallbackRefresh(true, 180, 'immediate');
    }
  });

  const unsubscribeDeleted = eventBus.on(Events.TASK_DELETED, ({ blockId }: { blockId: string }) => {
    const taskIndex = blockIdToTaskIndex.get(blockId);
    if (taskIndex && !taskIndex.isSubtask) {
      tasks.value = tasks.value.filter(t => t.blockId !== blockId);
      invalidateCache();
      invalidateSortCache();
      updateTaskIndex();
    }
  });

  const unsubscribeUpdated = eventBus.on(Events.TASK_UPDATED, ({ blockId }: { blockId: string }) => {
    queueIncrementalUpdates([blockId]);
  });

  const unsubscribeAdded = eventBus.on(Events.TASK_ADDED, async (payload?: { blockId?: string; reason?: string; seriesId?: string; frequency?: string }) => {
    if (payload?.reason === 'repeat-changed' && payload.frequency) {
      applyRepeatRuleOptimistic(payload);
      scheduleFallbackRefresh(false, 100, 'immediate');
      return;
    }
    if (payload?.blockId) {
      const addedBlockId = payload.blockId;
      const scopedBlockIds = await TaskRepository.filterIncludedBlockIds([payload.blockId]);
      if (scopedBlockIds.length === 0) {
        return;
      }

      queueIncrementalUpdates(scopedBlockIds);
      window.setTimeout(() => {
        if (!blockIdToTaskIndex.has(addedBlockId)) {
          scheduleFallbackRefresh(true, 180, 'immediate');
        }
      }, 220);
      return;
    }
    scheduleFallbackRefresh(true, 180, 'immediate');
  });
  
  

  const unsubscribeDateChanged = eventBus.on('task-date-changed', (updatedTask: Task) => {
    const now = Date.now();
    
    if (updatedTask.startDate === null && updatedTask.dueDate === null) {
      recentlyDeletedDates.value.set(updatedTask.id, {
        startDate: null,
        dueDate: null,
        timestamp: now
      });
      
      setTimeout(() => {
        recentlyDeletedDates.value.delete(updatedTask.id);
      }, 5000);
    } else if (updatedTask.startDate !== null || updatedTask.dueDate !== null) {
      if (recentlyDeletedDates.value.has(updatedTask.id)) {
        recentlyDeletedDates.value.delete(updatedTask.id);
      }
    }
    
    patchTask(tasks.value, updatedTask.id, (task) => {
      task.startDate = updatedTask.startDate;
      task.dueDate = updatedTask.dueDate;
      if (updatedTask.backgroundColor !== undefined) {
        task.backgroundColor = updatedTask.backgroundColor;
      }
    }, 'id');
    invalidateSortCache();
  });
  
  watch(
    () => tasks.value.map(t => `${t.id}:${t.startDate ?? ''}:${t.dueDate ?? ''}`),
    () => {
      for (const task of tasks.value) {
        const deletedRecord = recentlyDeletedDates.value.get(task.id);
        if (deletedRecord && (task.startDate !== null || task.dueDate !== null)) {
          task.startDate = null;
          task.dueDate = null;
        }
      }
    },
    { flush: 'post' }
  );

  eventUnsubscribers.push(
    unsubscribe,
    unsubscribeDeleted,
    unsubscribeUpdated,
    unsubscribeAdded,
    unsubscribeDateChanged
  );
}

async function incrementalUpdateTasks(blockIds: string[]) { 
  if (requiresScopeInitialization.value) {
    return;
  }

  const scopedBlockIds = await TaskRepository.filterIncludedBlockIds(blockIds);
  if (scopedBlockIds.length === 0) {
    return;
  }

  const ancestorContextRows = await queryAncestorContextRows(scopedBlockIds);
  await pruneInvalidParentsFromEvents(scopedBlockIds, ancestorContextRows);

  const { unresolvedBlockIds, patchedParentStatuses } = await fastSyncTaskFromMarkdown(scopedBlockIds);
  if (unresolvedBlockIds.length === 0) {
    consecutiveFallbackFailures = 0;
    return;
  }

  const parentBlockIds = await resolveParentTaskBlockIds(unresolvedBlockIds, ancestorContextRows);

  if (parentBlockIds.size === 0) {
    scheduleFallbackRefresh(true, 120, 'immediate');
    return;
  }
  
  const uniqueBlockIds = [...parentBlockIds].filter(id => !processingBlockIds.has(id)); 
  if (uniqueBlockIds.length === 0) { 
    return; 
  } 
  
  uniqueBlockIds.forEach(id => processingBlockIds.add(id)); 
  
  try { 
    invalidateCache(); 
    const taskMapBatch = await TaskRepository.getTasksByBlockIds(
      uniqueBlockIds,
      false,
      getCurrentTaskQueryScope(),
      { useLiveDom: false }
    );
    
    const updatedTasks: Task[] = [];
    let removedTasks = 0;
    const missingRequestedIds: string[] = [];
  
    for (const [blockId, newTask] of taskMapBatch) {
      const forcedStatus = patchedParentStatuses.get(blockId);
      if (forcedStatus) {
        newTask.status = forcedStatus;
        if (forcedStatus === 'completed') {
          newTask.completedAt = newTask.completedAt || new Date().toISOString();
        } else {
          delete newTask.completedAt;
        }
      }
      crdtRepo.syncIncrementalTasks([newTask]);
      updatedTasks.push(newTask);
    }

    for (const blockId of uniqueBlockIds) {
      if (taskMapBatch.has(blockId)) {
        continue;
      }
      missingRequestedIds.push(blockId);

      const taskIndex = blockIdToTaskIndex.get(blockId);
      if (!taskIndex || taskIndex.isSubtask) {
        continue;
      }

      crdtRepo.deleteTask(taskIndex.task.id, Date.now());
      removedTasks += 1;
    }
    
    if (updatedTasks.length > 0 || removedTasks > 0) {
      tasks.value = crdtRepo.getTasks();
      await updateTaskIndex(); 
      consecutiveFallbackFailures = 0;

      if (missingRequestedIds.length > 0) {
        // When requested blockIds cannot be fully resolved, force an immediate full reconcile.
        // Keep a small cooldown to avoid flooding during burst transactions.
        const now = Date.now();
        if (now - lastMismatchForceRefreshAt >= MISMATCH_FORCE_REFRESH_COOLDOWN) {
          lastMismatchForceRefreshAt = now;
          await refreshTasks(true, { showLoading: false, compareExisting: true, source: 'mismatch-reconcile' });
        }
      }
    } else {
      scheduleFallbackRefresh(true, 120, 'immediate');
    }
  } catch {
    scheduleFallbackRefresh(true, 120, 'immediate');
  } finally {
    uniqueBlockIds.forEach(id => processingBlockIds.delete(id));
  }
}

interface AncestorContextRow {
  source_id: string;
  id: string;
  depth: number;
  subtype: string;
}

function normalizeBlockIds(blockIds: string[]): string[] {
  return [...new Set(blockIds.filter((id): id is string => typeof id === 'string' && id.length > 0))];
}

async function queryAncestorContextRows(blockIds: string[]): Promise<AncestorContextRow[]> {
  const normalizedBlockIds = normalizeBlockIds(blockIds);
  if (normalizedBlockIds.length === 0) {
    return [];
  }

  try {
    const idsClause = normalizedBlockIds.map(id => `'${escapeSqlLiteral(id)}'`).join(',');
    const rows = await sql(`
      WITH RECURSIVE ancestors(source_id, id, parent_id, depth) AS (
        SELECT id AS source_id, id, parent_id, 0
        FROM blocks
        WHERE id IN (${idsClause})
        UNION ALL
        SELECT ancestors.source_id, b.id, b.parent_id, ancestors.depth + 1
        FROM blocks b
        JOIN ancestors ON ancestors.parent_id = b.id
        WHERE ancestors.parent_id != ''
          AND ancestors.depth < 10
      )
      SELECT ancestors.source_id, ancestors.id, ancestors.depth, b.subtype
      FROM ancestors
      JOIN blocks b ON b.id = ancestors.id
    `) as any[];

    if (!Array.isArray(rows)) {
      return [];
    }

    return rows
      .map((row) => ({
        source_id: typeof row?.source_id === 'string' ? row.source_id : '',
        id: typeof row?.id === 'string' ? row.id : '',
        depth: Number(row?.depth),
        subtype: typeof row?.subtype === 'string' ? row.subtype : ''
      }))
      .filter((row) => row.source_id.length > 0 && row.id.length > 0 && Number.isFinite(row.depth));
  } catch {
    return [];
  }
}

async function pruneInvalidParentsFromEvents(
  blockIds: string[],
  ancestorContextRows?: AncestorContextRow[]
): Promise<number> {
  const normalizedBlockIds = normalizeBlockIds(blockIds);
  if (normalizedBlockIds.length === 0) {
    return 0;
  }

  try {
    const rows = ancestorContextRows ?? await queryAncestorContextRows(normalizedBlockIds);
    const blockSubtypeMap = new Map<string, string>();
    rows.forEach((row) => {
      if (row?.id && row.subtype) {
        blockSubtypeMap.set(row.id, row.subtype);
      }
    });

    let removed = false;
    const removedBlockIds: string[] = [];
    for (const [blockId, taskIndex] of blockIdToTaskIndex.entries()) {
      if (taskIndex.isSubtask) {
        continue;
      }

      const subtype = blockSubtypeMap.get(blockId);
      if (!subtype || subtype === 't') {
        continue;
      }

      crdtRepo.deleteTask(taskIndex.task.id, Date.now());
      removed = true;
      removedBlockIds.push(blockId);
    }

    if (removed) {
      invalidateCache();
      invalidateSortCache();
      tasks.value = crdtRepo.getTasks();
      await updateTaskIndex();
    }
    return removedBlockIds.length;
  } catch {
    // Silent fallback: next refresh cycle will reconcile if SQL check fails.
    return 0;
  }
}

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

async function resolveParentTaskBlockIds(
  blockIds: string[],
  ancestorContextRows?: AncestorContextRow[]
): Promise<Set<string>> {
  const resolvedParentBlockIds = new Set<string>();
  const unknownBlockIds: string[] = [];
  const normalizedBlockIds = normalizeBlockIds(blockIds);

  for (const blockId of normalizedBlockIds) {
    const taskIndex = blockIdToTaskIndex.get(blockId);
    if (taskIndex) {
      if (taskIndex.isSubtask) {
        const parentBlockId = subtaskToParentMap.get(blockId);
        if (parentBlockId) {
          resolvedParentBlockIds.add(parentBlockId);
        } else {
          unknownBlockIds.push(blockId);
        }
      } else {
        resolvedParentBlockIds.add(blockId);
      }
      continue;
    }

    const parentBlockId = subtaskToParentMap.get(blockId);
    if (parentBlockId) {
      resolvedParentBlockIds.add(parentBlockId);
      continue;
    }

    unknownBlockIds.push(blockId);
  }

  if (unknownBlockIds.length === 0) {
    return resolvedParentBlockIds;
  }

  try {
    const rows = ancestorContextRows ?? await queryAncestorContextRows(unknownBlockIds);
    const unknownIdSet = new Set(unknownBlockIds);
    const candidatesBySource = new Map<string, Array<{ id: string; depth: number }>>();
    rows.forEach((row) => {
      const sourceId = row?.source_id;
      const candidateId = row?.id;
      const depth = Number(row?.depth);
      if (!sourceId || !candidateId || !Number.isFinite(depth)) return;
      if (!unknownIdSet.has(sourceId)) return;
      if (row.subtype !== 't') return;
      const list = candidatesBySource.get(sourceId) || [];
      list.push({ id: candidateId, depth });
      candidatesBySource.set(sourceId, list);
    });

    for (const sourceId of unknownBlockIds) {
      const candidates = (candidatesBySource.get(sourceId) || []).sort((a, b) => a.depth - b.depth);
      let mappedParentId = '';

      for (const candidate of candidates) {
        if (candidate.depth <= 0) continue;
        const taskIndex = blockIdToTaskIndex.get(candidate.id);
        if (taskIndex && !taskIndex.isSubtask) {
          mappedParentId = candidate.id;
          break;
        }
      }

      if (!mappedParentId) {
        const selfCandidate = candidates.find((candidate) => candidate.id === sourceId);
        if (selfCandidate) {
          mappedParentId = sourceId;
        }
      }

      if (!mappedParentId) {
        const fallbackAncestor = candidates.find((candidate) => candidate.depth > 0);
        if (fallbackAncestor) {
          mappedParentId = fallbackAncestor.id;
        }
      }

      if (mappedParentId) {
        resolvedParentBlockIds.add(mappedParentId);
      }
    }
  } catch {
    // Fallback refresh will handle transient SQL failures.
  }

  return resolvedParentBlockIds;
}

function parseTaskCompleted(markdown: string, blockId: string): boolean | null {
  const firstLine = markdown
    .split('\n')
    .map(line => line.trim())
    .find(line => line.length > 0);
  if (firstLine) {
    const match = firstLine.match(/\[(x|X| )\]/);
    if (match) {
      return match[1].toLowerCase() === 'x';
    }
  }

  const getTaskActionElement = (root: Element | null, ownerId?: string): Element | null => {
    if (!root) return null;
    const matchesOwner = (action: Element): boolean => {
      if (!ownerId) return true;
      const owner = action.closest('[data-node-id]');
      return owner?.getAttribute('data-node-id') === ownerId;
    };

    if (root.classList.contains('protyle-action--task') && matchesOwner(root)) {
      return root;
    }

    const actions = root.querySelectorAll('.protyle-action--task');
    for (const action of actions) {
      if (matchesOwner(action)) {
        return action;
      }
    }

    const fallbackRoot = root.closest('.protyle-task');
    const fallback = fallbackRoot?.querySelector('.protyle-action--task');
    if (fallback && matchesOwner(fallback)) {
      return fallback;
    }

    return null;
  };

  const selectors = [
    `.protyle [data-node-id="${blockId}"][data-type="NodeListItem"]`,
    `.protyle [data-node-id="${blockId}"]`,
    `[data-node-id="${blockId}"][data-type="NodeListItem"]`,
    `[data-node-id="${blockId}"]`
  ];
  let currentElement: Element | null = null;
  for (const selector of selectors) {
    currentElement = document.querySelector(selector);
    if (currentElement) {
      break;
    }
  }
  if (currentElement) {
    const currentAction = getTaskActionElement(currentElement, blockId);
    if (!currentAction) {
      return null;
    }
    const currentSvg = currentAction.querySelector('use');
    const currentHref = currentSvg?.getAttribute('xlink:href') || currentSvg?.getAttribute('href') || '';
    if (currentHref) {
      return currentHref === '#iconCheck';
    }
    return null;
  }
  return null;
}

function parseTaskTitle(markdown: string): string | null {
  const convertMarkdownStrong = (text: string): string => {
    return text
      .replace(/\*\*\*([^*]+)\*\*\*/g, '<span data-type="strong em">$1</span>')
      .replace(/___([^_]+)___/g, '<span data-type="strong em">$1</span>')
      .replace(/\*\*([^*]+)\*\*/g, '<span data-type="strong">$1</span>')
      .replace(/__([^_]+)__/g, '<span data-type="strong">$1</span>');
  };

  const firstLine = markdown
    .split('\n')
    .map(line => line.trim())
    .find(line => line.length > 0);
  if (!firstLine) return null;
  if (!/\[(x|X| )\]/.test(firstLine)) return null;

  const rawTitle = stripTaskPrefix(firstLine);
  return convertMarkdownStrong(cleanTaskTitle(rawTitle).trim());
}

async function fastSyncTaskFromMarkdown(blockIds: string[]): Promise<{
  unresolvedBlockIds: string[];
  patchedParentStatuses: Map<string, Task['status']>;
}> {
  const unresolved: string[] = [];
  const patchedParentStatuses = new Map<string, Task['status']>();
  let hasPatched = false;
  const validBlockIds: string[] = [];
  const taskIndexMap = new Map<string, TaskIndex>();

  for (const blockId of blockIds) {
    const taskIndex = blockIdToTaskIndex.get(blockId);
    if (!taskIndex) {
      unresolved.push(blockId);
      continue;
    }
    validBlockIds.push(blockId);
    taskIndexMap.set(blockId, taskIndex);
  }

  const blockSnapshots = await Promise.all(validBlockIds.map(async (blockId) => {
    try {
      const blockData = await getBlockKramdown(blockId);
      const markdown = typeof blockData === 'string' ? blockData : blockData?.kramdown || '';
      return { blockId, markdown, error: null as unknown };
    } catch (error) {
      return { blockId, markdown: '', error };
    }
  }));
  for (const snapshot of blockSnapshots) {
    const { blockId, markdown, error } = snapshot;
    if (error) {
      unresolved.push(blockId);
      continue;
    }

    const taskIndex = taskIndexMap.get(blockId);
    if (!taskIndex) {
      unresolved.push(blockId);
      continue;
    }

    try {
      const completed = parseTaskCompleted(markdown, blockId);
      const title = parseTaskTitle(markdown);
      if (completed === null) {
        unresolved.push(blockId);
        continue;
      }

      if (taskIndex.isSubtask) {
        let changed = false;
        const patched = patchTask(tasks.value, blockId, (subtask) => {
          if (subtask.completed !== completed) {
            subtask.completed = completed;
            changed = true;
          }
          if (title !== null && subtask.title !== title) {
            subtask.title = title;
            changed = true;
          }
        }, 'nodeId');
        if (!patched) {
          unresolved.push(blockId);
          continue;
        }
        if (changed) {
          hasPatched = true;
        }
      } else {
        let changed = false;
        let nextStatusForTask: Task['status'] | null = null;
        const patched = patchTask(tasks.value, blockId, (task) => {
          const nextStatus: Task['status'] = completed
            ? 'completed'
            : (task.status === 'completed' ? 'pending' : (task.status || 'pending'));
          nextStatusForTask = nextStatus;
          if (task.status !== nextStatus) {
            task.status = nextStatus;
            changed = true;
          }
          if (completed && !task.completedAt) {
            task.completedAt = new Date().toISOString();
            changed = true;
          }
          if (!completed && task.completedAt) {
            delete task.completedAt;
            changed = true;
          }
          if (title !== null && task.title !== title) {
            task.title = title;
            changed = true;
          }
        }, 'blockId');
        if (!patched) {
          unresolved.push(blockId);
          continue;
        }
        if (changed) {
          hasPatched = true;
          if (nextStatusForTask) {
            patchedParentStatuses.set(blockId, nextStatusForTask);
          }
        }
      }
    } catch (_error) {
      unresolved.push(blockId);
    }
  }
  if (hasPatched) {
    invalidateCache();
    invalidateSortCache();
    updateTaskIndex();
  }

  return {
    unresolvedBlockIds: unresolved,
    patchedParentStatuses
  };
}

function sanitizeTaskHtml(rawHtml?: string): string {
  if (!rawHtml) return '';

  const cached = sanitizedHtmlCache.get(rawHtml);
  if (cached !== undefined) {
    return cached;
  }

  const container = document.createElement('div');
  container.innerHTML = rawHtml;

  const dangerousNodes = container.querySelectorAll('script, iframe, object, embed, link, meta');
  dangerousNodes.forEach((el) => el.remove());

  const allElements = container.querySelectorAll('*');
  allElements.forEach((el) => {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();

      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
        continue;
      }

      if ((name === 'href' || name === 'src') && (value.startsWith('javascript:') || value.startsWith('data:text/html'))) {
        el.removeAttribute(attr.name);
      }
    }
  });

  const sanitized = container.innerHTML;
  if (sanitizedHtmlCache.size > 500) {
    sanitizedHtmlCache.clear();
  }
  sanitizedHtmlCache.set(rawHtml, sanitized);
  return sanitized;
}

function sanitizeTaskTitleHtml(rawHtml?: string): string {
  const sanitized = sanitizeTaskHtml(rawHtml);
  return stripTaskPrefix(sanitized);
}

function stripTaskPrefix(text: string): string {
  return text
    .replace(/^\s*[-*]\s*(?:\{:[^}]*\})?\s*\[(x|X| )\]\s*/i, '')
    .replace(/\s*\{:\s*style="[^"]*"\}\s*/g, ' ')
    .trim();
}

function cleanupEventListeners() {
  eventUnsubscribers.forEach(unsubscribe => unsubscribe());
  eventUnsubscribers = [];
  if (fallbackRefreshTimer !== null) {
    clearTimeout(fallbackRefreshTimer);
    fallbackRefreshTimer = null;
  }
  incrementalUpdateQueue.clear();
}

async function toggleTaskStatus(task: Task) {
  if (skipSet.has(task.id)) {
    return;
  }
  
  const newStatus = task.status === 'completed' ? 'pending' : 'completed';
  const isVirtualRepeatTask = !!task.isVirtual && !!task.repeatSeriesId && !!task.repeatInstanceDate;
  
  skipTaskTemporarily(skipSet, task.id);
  
  try {
    if (isVirtualRepeatTask) {
      await TaskRepository.updateRepeatInstanceStatus(task, newStatus);
    } else if (task.type === 'block' && task.blockId) {
      await updateTaskMarkdown(task.blockId, newStatus === 'completed', true);
    }
    
    if (!isVirtualRepeatTask) {
      crdtRepo.updateTaskField(task.id, 'status', newStatus);
    }
    
    patchTask(tasks.value, task.id, (t) => {
      t.status = newStatus;
      if (newStatus === 'completed') {
        t.completedAt = new Date().toISOString();
      } else {
        delete t.completedAt;
      }
    }, 'id');
    
    await refreshInternalState();
    
    if (!isVirtualRepeatTask) {
      eventBus.emit(Events.TASK_CHANGED, { blockIds: task.blockId ? [task.blockId] : [] });
    }
  } catch (error) {
    // Swallow toggle errors to avoid breaking interaction flow.
  }
}

async function handleSubtaskToggle(parentTaskId: string, subtask: any) {
  if (skipSet.has(subtask.id)) {
    return;
  }
  
  const newCompleted = !subtask.completed;
  
  skipTaskTemporarily(skipSet, subtask.id);
  
  patchTask(tasks.value, subtask.id, (st) => {
    st.completed = newCompleted;
  });
  
  await refreshInternalState();
  
  if (subtask.nodeId) {
    updateTaskMarkdown(subtask.nodeId, newCompleted).catch(() => {});
  }
  
  TaskRepository.updateSubtaskInCache(parentTaskId, subtask.id, newCompleted).catch(() => {});
}

function handleTaskClick(task: Task) {
  if (task.type === 'block' && task.blockId) {
    void openBlockById(task.blockId);
  }
}

function toggleTaskEdit(taskId: string) {
  const task = tasks.value.find(t => t.id === taskId);
  if (!task) return;
  
  if (editingTasks.value.has(taskId)) {
    editingTasks.value.delete(taskId);
  } else {
    editingTasks.value.set(taskId, { ...task });
  }
}

function handleTaskContextMenu(event: MouseEvent, task: Task) {
  event.preventDefault();
  event.stopPropagation();
  toggleTaskEdit(task.id);
}

async function saveTaskEdit(task: Task) {
  const editedTask = editingTasks.value.get(task.id);
  if (!editedTask) return;
  
  try {
    if (task.type === 'block' && task.blockId) {
      await setBlockAttrs(task.blockId, {
        'custom-task-priority': editedTask.priority,
        'custom-task-due-date': editedTask.dueDate || '',
        'custom-task-description': editedTask.description || ''
      });
    }
    
    crdtRepo.updateTaskField(task.id, 'description', editedTask.description);
    crdtRepo.updateTaskField(task.id, 'priority', editedTask.priority);
    crdtRepo.updateTaskField(task.id, 'dueDate', editedTask.dueDate);
    
    patchTask(tasks.value, task.id, (t) => {
      t.description = editedTask.description;
      t.priority = editedTask.priority;
      t.dueDate = editedTask.dueDate;
      t.updatedAt = new Date().toISOString();
    }, 'id');
    
    editingTasks.value.delete(task.id);
    await refreshInternalState();
  } catch (error) {
    // Swallow edit-save errors here; user can retry from the panel.
  }
}

function cancelTaskEdit(taskId: string) {
  editingTasks.value.delete(taskId);
}

function handleDragStart(event: DragEvent, task: Task) {
  if (isMobileFrontend) return;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/json', JSON.stringify(task));
    event.dataTransfer.setData('text/plain', task.id);
  }
}

async function ensureInboxDocument(notebookId: string): Promise<string> {
  const inboxPath = '/pinch收集箱';
  
  try {
    const existingIds = await getIDsByHPath(notebookId, inboxPath);
    if (existingIds && existingIds.length > 0) {
      return inboxPath;
    }
  } catch (error) {
    
  }
  
  try {
    await createDocWithMd(notebookId, inboxPath, '');
    return inboxPath;
  } catch (error) {
    throw error;
  }
}

async function handleCreateTask(taskData: any, notebookId: string, documentId: string) {
  try {
    let docPath = '';
    
    if (documentId && documentId !== PINCH_INBOX_OPTION_ID) {
      const selectedDoc = allDocuments.value.find(d => d.id === documentId && d.notebookId === notebookId);
      if (selectedDoc) {
        const notebook = notebooks.value.find(nb => nb.id === notebookId);
        if (notebook) {
          const task = tasks.value.find(t => t.rootId === documentId && t.notebookId === notebookId);
          if (task && task.hPath) {
            docPath = task.hPath.replace(`${notebook.name}/`, '');
          }
        }
      }
    }
    
    if (!docPath) {
      docPath = await ensureInboxDocument(notebookId);
    }
    
    await TaskRepository.createBlockTask({
      title: taskData.title,
      description: taskData.description,
      priority: taskData.priority,
      status: taskData.status,
      dueDate: taskData.dueDate || undefined,
      tags: taskData.tags || []
    }, notebookId, docPath);
    
    lastTaskNotebook.value = notebookId;
    lastTaskDocument.value = documentId;
    await updateSettings('taskManager', {
      lastTaskNotebook: notebookId,
      lastTaskDocument: documentId
    });
    
    await refreshTasks(true, { showLoading: true, compareExisting: false, source: 'create-task' });
    showTaskModal.value = false;
  } catch (error) {
    // Swallow create-task errors here; later refresh/retry will reconcile state.
  }
}

onMounted(async () => {
  await loadSettings();
  applyExcludedNotebookScope(normalizeNotebookIds(userSettings.taskManager.excludedNotebookIds));

  await loadNotebooks();
  await refreshTaskDocumentOptions(true);
  
  filterNotebook.value = userSettings.taskManager.filterNotebook || 'all';
  filterDocument.value = userSettings.taskManager.filterDocument || 'all';
  showCompletedTasks.value = userSettings.taskManager.showCompletedTasks !== false;
  ensureActiveNotebookFilterInScope();
  
  normalizeDocumentSelection(filterNotebook.value);
  setupEventListeners();
  startSkipSetCleanup();

  const scopeInitialized = userSettings.taskManager.scopeInitialized === true;
  if (!scopeInitialized) {
    requiresScopeInitialization.value = true;
    showTaskScopeDialog.value = true;
    isHydratingFilters = false;
    return;
  }

  loading.value = true;
  try {
    const cachedTasks = await TaskRepository.getCachedTasksOnly();
    crdtRepo.syncFromSQLTasks(cachedTasks);
    tasks.value = crdtRepo.getTasks();
    await refreshInternalState();
  } finally {
    loading.value = false;
  }

  isHydratingFilters = false;
  // First paint from cache, then silently reconcile with source of truth once.
  void refreshTasks(true, { showLoading: false, compareExisting: true, source: 'mounted-reconcile' });
});

onUnmounted(() => {
  cleanupEventListeners();
  stopSkipSetCleanup();
  if (filterSettingsUpdateTimer !== null) {
    clearTimeout(filterSettingsUpdateTimer);
    filterSettingsUpdateTimer = null;
  }
  if (fallbackRefreshTimer !== null) {
    clearTimeout(fallbackRefreshTimer);
    fallbackRefreshTimer = null;
  }
  if (taskScopeRefreshTimer !== null) {
    clearTimeout(taskScopeRefreshTimer);
    taskScopeRefreshTimer = null;
  }
});
</script>

<style scoped>
.task-manager-container {
  border-radius: 12px;
  margin-top: 16px;
}

.task-manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.task-manager-header .header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-manager-header .collapse-arrow {
  cursor: pointer;
  transition: transform 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 4px;
  
  &:hover {
    background-color: var(--b3-list-hover);
  }
  
  &.collapsed {
    transform: rotate(-90deg);
  }
  
  .icon {
    color: var(--b3-theme-on-background);
  }
}

.task-manager-header .title {
  font-size: 16px;
  font-weight: 700;
  color: var(--b3-theme-on-background);
}

.header-actions {
  display: flex;
}

.new-task-button,
.task-refresh,
.task-scope-button {
  background: none;
  border: none;
  padding: 0;
  margin: 0 6px 0 0;
  cursor: pointer;
  width: 24px;
  height: 24px;
  
  svg {
    color: var(--b3-theme-on-background);
  }
}

.task-refresh.is-refreshing .refresh-icon {
  animation: task-refresh-spin 0.8s linear infinite;
}

@keyframes task-refresh-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.view-all-button {
  background: none;
  border: none;
  padding: 0;
  margin: 0 6px 0 0;
  cursor: pointer;
  height: 24px;
  border-radius: 13px;
  background-color: var(--b3-theme-on-background);
  color: var(--b3-theme-background);
  padding: 2px 10px;
}

.filters-row {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-bottom: 12px;
}

.filters-bar {
  display: flex;
  gap: 12px;
  flex-wrap: nowrap;
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
}

.filters-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.subtasks-toggle-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--b3-theme-on-surface);
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.subtasks-toggle-btn:hover {
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
}

.subtasks-toggle-btn svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform 0.2s ease;
}

.subtasks-toggle-btn.expanded svg {
  transform: rotate(180deg);
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.filter-group label {
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  white-space: nowrap;
  flex-shrink: 0;
}

.filter-group select {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 6px;
  flex: 1;
  min-width: 0;
  max-width: 100%;
  &:hover {
    background-color: var(--b3-list-hover) !important;
  }
}

.loading {
  text-align: center;
  padding: 20px;
  color: var(--b3-theme-on-surface);
  font-size: 14px;
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: var(--b3-theme-on-surface);
  opacity: 0.6;
  font-size: 14px;
}

.more-completed-button {
  align-self: center;
  margin-top: 4px;
  padding: 6px 12px;
  border: 1px solid var(--b3-theme-border);
  border-radius: 999px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-surface);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.more-completed-button:hover {
  background: var(--b3-list-hover);
}

.task-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  background: var(--b3-theme-background);
  border-radius: 15px;
  transition: all 0.2s;
  box-shadow: #0000000f 0 1px 5px;
  cursor: grab;
}

.task-item:active {
  cursor: grabbing;
}

.task-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.task-content {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.task-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-header .task-checkbox-wrapper {
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.task-title {
  flex: 1;
  font-size: 14px;
  color: var(--b3-theme-on-background);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-description {
  margin-top: 6px;
  font-size: 13px;
  color: var(--b3-theme-on-surface);
  line-height: 1.4;
  padding: 6px 10px;
  background: var(--b3-list-hover);
  border-radius: 6px;
  border-left: 3px solid var(--b3-theme-border);
}

.task-badges {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  align-items: center;
}

.task-expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  margin: -6px;
  border-radius: 6px;
  position: relative;
  cursor: pointer;
  transition: transform 0.2s;
}

.task-expand-btn::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 18px;
  height: 18px;
  transform: translate(-50%, -50%);
  border-radius: 4px;
  background: transparent;
  pointer-events: none;
  transition: background-color 0.2s;
}

.task-expand-btn:hover::before {
  background: var(--b3-list-hover);
}

.task-expand-btn svg {
  position: relative;
  z-index: 1;
  transition: transform 0.2s;
}

.task-expand-btn.expanded svg {
  transform: rotate(90deg);
}

.task-priority-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
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

.task-due-badge {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-surface);
}

.subtasks-list {
  margin-top: 8px;
}

.task-edit-panel {
  margin-top: 8px;
  padding: 12px;
  background: var(--b3-list-hover);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.edit-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.edit-field label {
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  opacity: 0.8;
  font-weight: 500;
}

.edit-field textarea,
.edit-field select,
.edit-field input[type="date"] {
  padding: 6px 8px;
  border: 1px solid var(--b3-theme-border);
  border-radius: 4px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  font-size: 12px;
  font-family: inherit;
}

.edit-field textarea {
  resize: vertical;
  min-height: 40px;
  line-height: 1.5;
}

.edit-field textarea:focus,
.edit-field select:focus,
.edit-field input:focus {
  outline: none;
  border-color: #f98f7a;
}

.edit-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.edit-actions button {
  flex: 1;
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.save-btn {
  background: #f98f7a;
  color: white;
}

.save-btn:hover {
  background: #e55a47;
}

.cancel-btn {
  background: var(--b3-theme-border);
  color: var(--b3-theme-on-surface);
}

.cancel-btn:hover {
  background: var(--b3-list-hover);
}

</style>
