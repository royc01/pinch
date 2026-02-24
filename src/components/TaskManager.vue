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
        <SyButton size="small" class="task-refresh" @click="refreshTasks(true)">
          <Icon name="refresh" width="24" height="24" class="icon" />
        </SyButton>
        <SyButton size="small" class="new-task-button" @click="showTaskModal = true">
          <Icon name="add" width="26" height="26" class="icon" />
        </SyButton>
        <SyButton size="small" class="view-all-button" @click="openKanbanView">
          查看所有
        </SyButton>
    </div>
    </div>
    
    <div class="filters-bar" v-show="!isTaskListCollapsed">
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
    
    <div v-if="loading" class="loading" v-show="!isTaskListCollapsed">{{ t('taskManager.loading') }}</div>
    <div v-else class="tasks-list" v-show="!isTaskListCollapsed">
      <div v-if="filteredTasks.length === 0" class="empty-state">
        {{ t('taskManager.noTasks') }}
      </div>
      <div 
        v-for="task in filteredTasks" 
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
    </div>
    
    <TaskModal 
      :show="showTaskModal" 
      :t="t"
      :notebooks="notebooks"
      :documents="allDocuments"
      :lastSelectedNotebook="taskModalDefaultNotebook"
      :lastSelectedDocument="taskModalDefaultDocument"
      @close="showTaskModal = false"
      @submit="handleCreateTask"
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
import Icon from '@/components/Icon.vue';
import { TaskRepository, Task, lsNotebooks, createDocWithMd, getIDsByHPath, setBlockAttrs, getBlockKramdown } from '@/api';
import { updateTaskMarkdown, skipTaskTemporarily, cleanTaskTitle } from '@/utils/taskHelpers';
import { openKanbanView } from '@/main';
import { useUserSettings } from '@/composables/useUserSettings';
import { useTaskFilters } from '@/composables/useTaskFilters';
import { eventBus, Events } from '@/utils/eventBus';
import { getCrdtRepository, useCrdtTasks } from '@/crdtStore';
import { formatDate } from '@/utils/dateHelpers';

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

const crdtRepo = getCrdtRepository();
const { tasks } = useCrdtTasks();
let isMobileFrontend = false;
try {
  const frontend = getFrontend();
  isMobileFrontend = frontend === 'mobile' || frontend === 'browser-mobile';
} catch {
  isMobileFrontend = false;
}
const loading = ref(false);
const showTaskModal = ref(false);
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

const notebookOptions = computed(() => {
  return [
    { value: 'all', text: t('taskManager.all') },
    ...notebooks.value.map(nb => ({ value: nb.id, text: nb.name }))
  ];
});

const toggleTaskListCollapsed = () => {
  isTaskListCollapsed.value = !isTaskListCollapsed.value;
};

let lastRefreshTime = 0;

let eventUnsubscribers: Array<() => void> = [];
const processingBlockIds = new Set<string>();
let fallbackRefreshTimer: number | null = null;
const FALLBACK_FAILURE_THRESHOLD = 2;
let consecutiveFallbackFailures = 0;

// 鬯ｮ・ｫ繝ｻ・ｶ郢晢ｽｻ繝ｻ・ｰ鬮ｯ貊・束隴ｯ竏壹・繝ｻ・ｿ郢晢ｽｻ繝ｻ・ｽE鬮ｯ蜈ｷ・ｽ・ｻ髯橸ｽ｢繝ｻ・ｼ髯ｷ螢ｼ・､諛ｶ・ｽ・ｫ繝ｻ・ｯ郢晢ｽｻ繝ｻ・､鬮ｫ・ｴ鬲・ｼ夲ｽｽ・ｽ繝ｻ・･鬮ｫ・ｴ陝ｶ・ｶ繝ｻ・ｺ繝ｻ・ｽ髯懆ｶ｣・ｽ・ｪ鬮｣豈費ｽｼ螟ｲ・ｽ・ｽ繝ｻ・ｻ鬮ｯ・ｷ闔ｨ螟ｲ・ｽ・ｽ繝ｻ・｡驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｽE驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｽ鬯ｯ・ｮ繝ｻ・ｦ郢晢ｽｻ繝ｻ・ｲ鬮ｮ蠑ｱ繝ｻ繝ｻ・ｽ繝ｻ・｢鬯ｮ・ｯ繝ｻ・ｲ郢晢ｽｻ繝ｻ・ｫ鬮ｯ・ｷ繝ｻ・ｷ髯橸ｽｳ髣鯉ｽｨ繝ｻ・ｽ繝ｻ・ｻ郢晢ｽｻ繝ｻ・ｭ鬯ｨ・ｾ繝ｻ・ｧ驛｢譎｢・ｽ・ｻ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｽ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｽ鬯ｯ・ｩ繝ｻ・･髣包ｽｵ隲､諛ｶ・ｽ・ｳ繝ｻ・ｩ鬮ｫ・ｴ郢晢ｽｻ繝ｻ・ｽ繝ｻ・ｰ鬯ｮ・ｫ髴域鱒繝ｻ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｽ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｽ
const recentlyDeletedDates = ref(new Map<string, { startDate: null; dueDate: null; timestamp: number }>());

// 鬯ｮ・ｫ繝ｻ・ｶ郢晢ｽｻ繝ｻ・ｰ鬮ｯ貊・束隴ｯ竏壹・繝ｻ・ｿ郢晢ｽｻ繝ｻ・ｽE鬮ｯ蜈ｷ・ｽ・ｻ髯橸ｽ｢繝ｻ・ｽ髯晢ｽｲ繝ｻ・ｩ鬮ｫ・ｴ郢晢ｽｻ繝ｻ・ｽ繝ｻ・ｰ鬮ｫ・ｴ鬲・ｼ夲ｽｽ・ｽ繝ｻ・･鬮ｫ・ｴ陝ｶ・ｶ繝ｻ・ｺ繝ｻ・ｽ髯懆ｶ｣・ｽ・ｪ鬮｣豈費ｽｼ螟ｲ・ｽ・ｽ繝ｻ・ｻ鬮ｯ・ｷ闔ｨ螟ｲ・ｽ・ｽ繝ｻ・｡驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｽE驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｽ鬯ｯ・ｮ繝ｻ・ｦ郢晢ｽｻ繝ｻ・ｲ鬮ｮ蠑ｱ繝ｻ繝ｻ・ｽ繝ｻ・｢鬯ｮ・ｯ繝ｻ・ｲ郢晢ｽｻ繝ｻ・ｫ鬮ｯ・ｷ繝ｻ・ｷ髯橸ｽｳ髣鯉ｽｨ繝ｻ・ｽ繝ｻ・ｻ郢晢ｽｻ繝ｻ・ｭ鬯ｨ・ｾ繝ｻ・ｧ驛｢譎｢・ｽ・ｻ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｽ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｽ鬯ｯ・ｩ繝ｻ・･髣包ｽｵ隲､諛ｶ・ｽ・ｳ繝ｻ・ｩ鬮ｫ・ｴ郢晢ｽｻ繝ｻ・ｽ繝ｻ・ｰ鬯ｮ・ｫ髴域鱒繝ｻ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｽ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｽ

interface TaskIndex {
  task: Task;
  isSubtask: boolean;
  parentTaskId?: string;
}

const blockIdToTaskIndex = new Map<string, TaskIndex>();
const subtaskToParentMap = new Map<string, string>();
const sanitizedHtmlCache = new Map<string, string>();

// === 鬮｣雋ｻ・ｽ・ｨ髣費ｽｨ隲幢ｽｷ陝・・・ｨ・ｾ繝ｻ・ｧ驛｢譎｢・ｽ・ｻ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｽ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｽ鬮ｫ・ｴ繝ｻ・ｯ郢晢ｽｻ繝ｻ・｣鬯ｮ・ｴ闔会ｽ｣郢晢ｽｻ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｽ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｽ鬯ｯ・ｨ繝ｻ・ｾ郢晢ｽｻ繝ｻ・ｻ鬯ｮ・ｴ陷ｿ蛹・ｽｱ螢ｹ繝ｻ繝ｻ・ｼ髯橸ｽ｢繝ｻ・ｽ髮句ｮ茨ｽｧ莨懈・鬩募争豎壹・・ｽ繝ｻ・ｮ郢晢ｽｻ繝ｻ・ｰ鬮ｫ・ｴ陝ｷ・｢繝ｻ・ｽ繝ｻ・ｬ鬮ｯ蜈ｷ・ｽ・ｻ驛｢譎｢・ｽ・ｻ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｽ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｽE驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｽ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｽ鬮｣蛹・ｽｽ・ｳ繝ｻ縺､ﾂ鬮ｫ・ｹ繝ｻ・ｺ郢晢ｽｻ繝ｻ・｡鬯ｮ・ｫ繝ｻ・ｶ郢晢ｽｻ繝ｻ・｡鬯ｩ髦ｪ・・ｹ晢ｽｻ===
const docsMapByNotebook = computed(() => {
  const map = new Map<string, Document[]>();
  
  for (const task of tasks.value) {
    if (task.type === 'block' && task.notebookId && task.rootId) {
      const hPath = task.hPath || task.rootId;
      const notebookKey = task.notebookId;
      
      if (!map.has(notebookKey)) {
        map.set(notebookKey, []);
      }
      
      const docs = map.get(notebookKey)!;
      const existingDoc = docs.find(d => d.id === task.rootId);
      if (!existingDoc) {
        docs.push({
          id: task.rootId,
          name: hPath.split('/').pop() || hPath,
          notebookId: task.notebookId,
          path: hPath
        });
      }
    }
  }
  
  return map;
});

const allDocuments = computed(() => {
  return Array.from(docsMapByNotebook.value.values()).flat();
});

const documentOptions = computed(() => {
  if (filterNotebook.value === 'all') return [];
  
  const docs = docsMapByNotebook.value.get(filterNotebook.value) || [];
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
  if (filterDocument.value !== previousDocument) {
    return;
  }

  scheduleFilterSettingsUpdate();
});

const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2, 'none': 3 };

const taskFilters = {
  priority: ref('all'),
  type: ref('all'),
  notebook: filterNotebook,
  document: filterDocument
};

// === 鬯ｯ・ｨ繝ｻ・ｾ髯樊ｺ假ｽ蛾頼讓｣・ｬ・ｨ繝ｻ・ｾ鬮ｮ蛹ｺ・ｩ・ｸ繝ｻ・ｽ繝ｻ・ｽ髯ｷ・ｻ闔・･繝ｻ・ｳ繝ｻ・ｩ鬮ｫ・ｴ郢晢ｽｻ繝ｻ・ｽ繝ｻ・ｰ鬮ｯ・ｷ郢晢ｽｻ繝ｻ・ｽ繝ｻ・ｽ鬮ｫ・ｰ繝ｻ・ｨ郢晢ｽｻ繝ｻ・ｰ ===
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

const filteredTasks = computed(() => {
  const baseFiltered = baseFilteredTasks.value.filter(task => {
    if (task.isVirtual) {
      return false;
    }
    const title = task.title?.trim();
    return title && title !== '' && title !== '-';
  });
  
  const hash = baseFiltered.map(t => t.id).join(':') + 
               baseFiltered.map(t => `${t.status}-${t.priority}-${t.blockId}`).join('|');
  
  if (hash === lastSortedHash && cachedSortedTasks.length > 0) {
    return cachedSortedTasks;
  }
  
  const result = [...baseFiltered].sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') {
      return 1;
    }
    if (a.status !== 'completed' && b.status === 'completed') {
      return -1;
    }
    
    const priorityA = priorityOrder[a.priority] ?? 3;
    const priorityB = priorityOrder[b.priority] ?? 3;
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // 鬮｣蜴・ｽｽ・ｴ郢晢ｽｻ繝ｻ・ｿ鬯ｨ・ｾ陋ｹ繝ｻ・ｽ・ｽ繝ｻ・ｨ blockId 鬯ｮ・｢繝ｻ・ｰ髯溷桁・ｽ・｡郢晢ｽｻ繝ｻ・ｸ鬮｢・ｧ繝ｻ・ｴ髯滉ｻ｣繝ｻcreatedAt 鬮ｫ・ｰ髣埼屮・ｽ・ｲ隶厄ｽｸ繝ｻ・ｽ繝ｻ・ｺ髫ｰ・ｫ繝ｻ・ｾ郢晢ｽｻ繝ｻ・ｼ髫ｰ逍ｲ・ｺ・ｷ繝ｻ・ｱ陷托ｽｰ陷ｿ蟲ｨ繝ｻ繝ｻ・ｺ blockId 鬮ｯ蜈ｷ・ｽ・ｹ驛｢譎｢・ｽ・ｻ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｽ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｽ鬮ｫ・ｴ鬲・ｼ夲ｽｽ・ｽ繝ｻ・ｶ鬯ｯ・ｮ繝ｻ・｣郢晢ｽｻ繝ｻ・ｴ鬮ｫ・ｰ鬲・ｼ夲ｽｽ・ｽ繝ｻ・ｳ鬮｣蛹・ｽｽ・ｳ鬨ｾ謳ｾ・ｽ・ｲ髯晢ｽｲ繝ｻ・ｩ鬯ｩ蠅難ｽｩ・ｸ繝ｻ・ｽ繝ｻ・ｳ鬮ｯ讖ｸ・ｽ・ｳ驛｢譎｢・ｽ・ｻ    // blockId 鬮ｫ・ｴ繝ｻ・ｬ郢晢ｽｻ繝ｻ・ｼ鬮ｯ貊会ｽｻ・｣郢晢ｽｻ "YYYYMMDDHHmmss-xxx"
    const aSortKey = a.blockId || a.id || a.createdAt || '';
    const bSortKey = b.blockId || b.id || b.createdAt || '';
    return bSortKey.localeCompare(aSortKey);
  });
  
  lastSortedHash = hash;
  cachedSortedTasks = result;
  
  return result;
});

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
      task => task.type === 'block' && !task.isVirtual && task.blockId === blockId
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
      task => !(task.isVirtual && task.repeatSeriesId === seriesId)
    );
    if (nextTasks.length !== tasks.value.length) {
      tasks.value = nextTasks;
      touched = true;
    }
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
    // 鬮ｯ・ｷ闔ｨ螟ｲ・ｽ・｣繝ｻ・ｰ鬯ｮ・ｴ鬮ｮ・｣繝ｻ・ｽ繝ｻ・ｽ鬯ｮ・ｫ繝ｻ・ｨ鬩募争豎壹・・ｽ繝ｻ・ｮ郢晢ｽｻ繝ｻ・ｰ鬮ｫ・ｴ陝ｷ・｢繝ｻ・ｽ繝ｻ・ｬ鬮ｯ讓奇ｽｻ繧托ｽｽ・ｽ繝ｻ・ｱ鬯ｮ・ｮ隰ｳ・ｾ繝ｻ・ｽ繝ｻ・･
  }
}





function validateDocumentSelection() {
  normalizeDocumentSelection(filterNotebook.value);
}

async function refreshTasks(
  force = false,
  options: { showLoading?: boolean; compareExisting?: boolean } = {}
) {
  const { showLoading = false, compareExisting = true } = options;
  const now = Date.now();
  const SKIP_DELAY = 500;
  if (!force && now - lastRefreshTime < SKIP_DELAY) {
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
    
    const sqlTasks = await TaskRepository.getAllTasks(!force);
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
  } catch (error) {
    // 鬮ｯ蜈ｷ・ｽ・ｻ郢晢ｽｻ繝ｻ・ｷ鬮ｫ・ｴ郢晢ｽｻ繝ｻ・ｽ繝ｻ・ｰ鬮｣豈費ｽｼ螟ｲ・ｽ・ｽ繝ｻ・ｻ鬮ｯ・ｷ闔ｨ螟ｲ・ｽ・ｽ繝ｻ・｡鬮ｯ讓奇ｽｻ繧托ｽｽ・ｽ繝ｻ・ｱ鬯ｮ・ｮ隰ｳ・ｾ繝ｻ・ｽ繝ｻ・･
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
    await refreshTasks(force, { showLoading: false, compareExisting: true });
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
    
    // 鬮｣蜴・ｽｽ・ｴ郢晢ｽｻ繝ｻ・ｿ鬯ｨ・ｾ陋ｹ繝ｻ・ｽ・ｽ繝ｻ・ｨ髫ｰ繝ｻ豐ｺ繝ｻ・ｻ闔ｨ螟ｲ・ｽ・ｽ繝ｻ・ｸ繝ｻ縺､ﾂ鬯ｨ・ｾ繝ｻ・ｧ驛｢譎｢・ｽ・ｻ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｽ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｽ鬮ｯ貅ｯ・ｶ・｣繝ｻ・ｽ繝ｻ・ｦ鬮ｮ荳ｻ豐ｺ繝ｻ・ｳ鬲・ｼ夲ｽｽ・ｽ繝ｻ・ｯ郢晢ｽｻ繝ｻ・ｹ
    if (!isDeepEqual(oldTask, newTask, { checkUpdatedAt: true })) {
      return true;
    }
  }
  
  return false;
}



function setupEventListeners() {
  const unsubscribe = eventBus.on(Events.TASK_CHANGED, async (data?: { blockIds?: string[] }) => {
    if (data?.blockIds && data.blockIds.length > 0) {
      await incrementalUpdateTasks(data.blockIds);
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

  const unsubscribeUpdated = eventBus.on(Events.TASK_UPDATED, async ({ blockId }: { blockId: string }) => {
    await incrementalUpdateTasks([blockId]);
  });

  const unsubscribeAdded = eventBus.on(Events.TASK_ADDED, async (payload?: { blockId?: string; reason?: string; seriesId?: string; frequency?: string }) => {
    if (payload?.reason === 'repeat-changed' && payload.frequency) {
      applyRepeatRuleOptimistic(payload);
      scheduleFallbackRefresh(false, 100, 'immediate');
      return;
    }
    if (payload?.blockId) {
      await incrementalUpdateTasks([payload.blockId]);
      if (!blockIdToTaskIndex.has(payload.blockId)) {
        scheduleFallbackRefresh(true, 180, 'immediate');
      }
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
    }, 'id');
    invalidateSortCache();
  });
  
  watch(() => tasks.value.map(t => ({ id: t.id, startDate: t.startDate, dueDate: t.dueDate })), (newMappings) => {
    for (const mapping of newMappings) {
      const deletedRecord = recentlyDeletedDates.value.get(mapping.id);
      if (deletedRecord && (mapping.startDate !== null || mapping.dueDate !== null)) {
        const task = tasks.value.find(t => t.id === mapping.id);
        if (task) {
          task.startDate = null;
          task.dueDate = null;
        }
      }
    }
  }, { flush: 'post' });

  eventUnsubscribers.push(
    unsubscribe,
    unsubscribeDeleted,
    unsubscribeUpdated,
    unsubscribeAdded,
    unsubscribeDateChanged
  );
}

async function incrementalUpdateTasks(blockIds: string[]) { 
  const unresolvedBlockIds = await fastSyncTaskFromMarkdown(blockIds);
  if (unresolvedBlockIds.length === 0) {
    consecutiveFallbackFailures = 0;
    return;
  }

  const parentBlockIds = unresolvedBlockIds.map(id => {
    const parentTaskId = subtaskToParentMap.get(id);
    return parentTaskId || id;
  });
  
  const uniqueBlockIds = [...new Set(parentBlockIds)].filter(id => !processingBlockIds.has(id)); 
  if (uniqueBlockIds.length === 0) { 
    return; 
  } 
  
  uniqueBlockIds.forEach(id => processingBlockIds.add(id)); 
  
  try { 
    invalidateCache(); 
    const taskMapBatch = await TaskRepository.getTasksByBlockIds(uniqueBlockIds, false);
    
    const updatedTasks: Task[] = [];
  
    for (const [_blockId, newTask] of taskMapBatch) {
      crdtRepo.syncIncrementalTasks([newTask]);
      updatedTasks.push(newTask);
    }
    
    if (updatedTasks.length > 0) {
      tasks.value = crdtRepo.getTasks();
      await updateTaskIndex(); 
      consecutiveFallbackFailures = 0;
    } else {
      scheduleFallbackRefresh(true);
    }
  } catch (error) {
    scheduleFallbackRefresh(true);
  } finally {
    uniqueBlockIds.forEach(id => processingBlockIds.delete(id));
  }
}

function parseTaskCompleted(markdown: string): boolean | null {
  const match = markdown.match(/\[(x|X| )\]/);
  if (!match) return null;
  return match[1].toLowerCase() === 'x';
}

function parseTaskTitle(markdown: string): string | null {
  const firstTaskLine = markdown.split('\n').find(line => /\[(x|X| )\]/.test(line));
  if (!firstTaskLine) return null;

  const rawTitle = stripTaskPrefix(firstTaskLine);
  return cleanTaskTitle(rawTitle).trim();
}

async function fastSyncTaskFromMarkdown(blockIds: string[]): Promise<string[]> {
  const unresolved: string[] = [];
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
      const completed = parseTaskCompleted(markdown);
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
        const patched = patchTask(tasks.value, blockId, (task) => {
          const nextStatus: Task['status'] = completed
            ? 'completed'
            : (task.status === 'completed' ? 'pending' : (task.status || 'pending'));
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

  return unresolved;
}

function sanitizeTaskHtml(rawHtml?: string): string {
  if (!rawHtml) return '';

  const cached = sanitizedHtmlCache.get(rawHtml);
  if (cached !== undefined) {
    return cached;
  }

  const container = document.createElement('div');
  container.innerHTML = rawHtml;

  container.querySelectorAll('script, iframe, object, embed, link, meta').forEach((el) => el.remove());

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
  return text.replace(/^\s*[-*]\s*(?:\{:[^}]*\})?\s*\[(x|X| )\]\s*/i, '');
}

function cleanupEventListeners() {
  eventUnsubscribers.forEach(unsubscribe => unsubscribe());
  eventUnsubscribers = [];
  if (fallbackRefreshTimer !== null) {
    clearTimeout(fallbackRefreshTimer);
    fallbackRefreshTimer = null;
  }
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
    // 鬮ｯ蜈ｷ・ｽ・ｻ驛｢譎｢・ｽ・ｻ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｽ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｽ鬮｣豈費ｽｼ螟ｲ・ｽ・ｽ繝ｻ・ｻ鬮ｯ・ｷ闔ｨ螟ｲ・ｽ・ｽ繝ｻ・｡鬮ｴ謇假ｽｽ・･郢晢ｽｻ繝ｻ・ｶ鬮ｫ・ｲ繝ｻ・､驕ｶ荵怜款繝ｻ・ｽ繝ｻ・､郢晢ｽｻ繝ｻ・ｱ鬯ｮ・ｮ隰ｳ・ｾ繝ｻ・ｽ繝ｻ・･
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
    window.location.href = `siyuan://blocks/${task.blockId}`;
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
    // 鬮｣蜴・ｽｽ・ｫ髫ｴ蜿門ｾ励・・ｽ繝ｻ・ｭ髯区ｺ倥・繝ｻ・ｽ繝ｻ・ｻ郢晢ｽｻ繝ｻ・ｻ鬮ｯ・ｷ闔ｨ螟ｲ・ｽ・ｽ繝ｻ・｡鬮ｯ讓奇ｽｻ繧托ｽｽ・ｽ繝ｻ・ｱ鬯ｮ・ｮ隰ｳ・ｾ繝ｻ・ｽ繝ｻ・･
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
  const inboxPath = '/pinch\\u6536\\u96c6\\u7bb1';
  
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
    
    if (documentId) {
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
    
    await refreshTasks(true, { showLoading: true, compareExisting: false });
    showTaskModal.value = false;
  } catch (error) {
    // 鬮ｯ蜈ｷ・ｽ・ｻ髯晢ｽｶ陝ｷ・｢繝ｻ・ｽ繝ｻ・ｻ郢晢ｽｻ繝ｻ・ｺ鬮｣豈費ｽｼ螟ｲ・ｽ・ｽ繝ｻ・ｻ鬮ｯ・ｷ闔ｨ螟ｲ・ｽ・ｽ繝ｻ・｡鬮ｯ讓奇ｽｻ繧托ｽｽ・ｽ繝ｻ・ｱ鬯ｮ・ｮ隰ｳ・ｾ繝ｻ・ｽ繝ｻ・･
  }
}

onMounted(async () => {
  await loadSettings();
  await loadNotebooks();
  await refreshTasks(false, { showLoading: true, compareExisting: false });
  scheduleFallbackRefresh(true, 120, 'immediate');
  
  filterNotebook.value = userSettings.taskManager.filterNotebook || 'all';
  filterDocument.value = userSettings.taskManager.filterDocument || 'all';
  
  validateDocumentSelection();
  setupEventListeners();
  startSkipSetCleanup();
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
.task-refresh {
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

.view-all-button {
  background: none;
  border: none;
  padding: 0;
  margin: 0 6px 0 0;
  cursor: pointer;
  height: 26px;
  border-radius: 13px;
  background-color: var(--b3-theme-on-background);
  color: var(--b3-theme-background);
  padding: 4px 8px;
}

.filters-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: nowrap;
  width: 100%;
  box-sizing: border-box;
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

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
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
  width: 18px;
  height: 18px;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.2s, background-color 0.2s;
}

.task-expand-btn:hover {
  background: var(--b3-list-hover);
}

.task-expand-btn svg {
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
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  background: #f3f4f6;
  color: #6b7280;
}

.task-type-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-surface);
}

.subtasks-list {
  margin-top: 8px;
}

.task-due-date {
  margin-top: 4px;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  opacity: 0.7;
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

.stand-container {
  margin-top: 16px;
}
</style>

