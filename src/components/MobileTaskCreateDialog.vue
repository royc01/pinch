<template>
  <div class="mobile-task-create-root">
    <div v-if="loading" class="mobile-task-create-loading">Loading...</div>
    <TaskModal
      :show="showTaskModal"
      :t="translate"
      :notebooks="enabledNotebooks"
      :documents="allDocuments"
      :groups="taskGroups"
      :default-group-id="defaultGroupId"
      :last-selected-notebook="lastSelectedNotebook"
      :last-selected-document="lastSelectedDocument"
      @close="emit('close')"
      @manage-groups="showTaskGroupDialog = true"
      @submit="handleCreateTask"
    />
    <TaskGroupDialog
      :show="showTaskGroupDialog"
      :groups="taskGroups"
      @close="showTaskGroupDialog = false"
      @save="handleTaskGroupSave"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  TaskRepository,
  createDocWithMd,
  getIDsByHPath,
  loadTaskGroups,
  lsNotebooks,
  pushMsg,
  saveTaskGroups,
  sql,
  type TaskGroup,
  type TaskPriority,
  type TaskStatus,
} from '@/api';
import TaskGroupDialog from '@/components/TaskGroupDialog.vue';
import TaskModal, { type Document, type Notebook } from '@/components/TaskModal.vue';
import { useUserSettings } from '@/composables/useUserSettings';
import { getDocumentCreationSortKey, normalizeNotebookIds } from '@/utils/taskViewShared';

interface NewTaskPayload {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  tags: string[];
  groupId: string;
}

const PINCH_INBOX_OPTION_ID = '__pinch_inbox__';

const emit = defineEmits<{
  close: [];
}>();

const { data: userSettings, loadSettings, updateSettings } = useUserSettings();

const loading = ref(true);
const showTaskModal = ref(false);
const showTaskGroupDialog = ref(false);
const notebooks = ref<Notebook[]>([]);
const taskGroups = ref<TaskGroup[]>([]);
const taskDocumentsByNotebook = ref<Map<string, Document[]>>(new Map());

const excludedNotebookIds = computed(() => normalizeNotebookIds(userSettings.taskManager.excludedNotebookIds));
const showCompletedTasks = computed(() => userSettings.taskManager.showCompletedTasks !== false);

const enabledNotebooks = computed(() => {
  const excludedIdSet = new Set(excludedNotebookIds.value);
  return notebooks.value.filter(notebook => !excludedIdSet.has(notebook.id));
});

const allDocuments = computed(() => {
  return Array.from(taskDocumentsByNotebook.value.values()).flat();
});

const lastSelectedNotebook = computed(() => {
  const storedNotebookId = typeof userSettings.taskManager.lastTaskNotebook === 'string'
    ? userSettings.taskManager.lastTaskNotebook
    : '';
  if (enabledNotebooks.value.some(notebook => notebook.id === storedNotebookId)) {
    return storedNotebookId;
  }
  return enabledNotebooks.value[0]?.id || '';
});

const lastSelectedDocument = computed(() => {
  return typeof userSettings.taskManager.lastTaskDocument === 'string'
    ? userSettings.taskManager.lastTaskDocument
    : '';
});

const defaultGroupId = computed(() => {
  return typeof userSettings.taskManager.selectedGroupId === 'string'
    ? userSettings.taskManager.selectedGroupId
    : '';
});

function translate(key: string): string {
  return key;
}

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

function buildTaskDocumentScopeSql(alias: string = 'b'): string {
  if (excludedNotebookIds.value.length === 0) {
    return '';
  }
  const idsClause = excludedNotebookIds.value.map(id => `'${escapeSqlLiteral(id)}'`).join(',');
  return ` AND ${alias}.box NOT IN (${idsClause})`;
}

function buildTaskDocumentCompletionSql(alias: string = 'b'): string {
  if (showCompletedTasks.value) {
    return ` AND (${alias}.markdown LIKE '%[ ]%' OR ${alias}.markdown LIKE '%[x]%' OR ${alias}.markdown LIKE '%[X]%')`;
  }
  return ` AND ${alias}.markdown LIKE '%[ ]%'`;
}

async function loadNotebookOptions(): Promise<void> {
  try {
    const result = await lsNotebooks();
    if (!result?.notebooks) {
      notebooks.value = [];
      return;
    }
    notebooks.value = result.notebooks
      .filter(notebook => !notebook.closed)
      .map(notebook => ({
        id: notebook.id,
        name: notebook.name,
      }));
  } catch (error) {
    console.error('[MobileTaskCreateDialog] Failed to load notebooks:', error);
    notebooks.value = [];
  }
}

async function loadDocumentOptions(): Promise<void> {
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
        path: rawPath,
      });
      nextMap.set(notebookId, docs);
    }

    nextMap.forEach((docs, notebookId) => {
      const deduped = new Map<string, Document>();
      docs.forEach((doc) => {
        if (!deduped.has(doc.id)) {
          deduped.set(doc.id, doc);
        }
      });
      nextMap.set(
        notebookId,
        Array.from(deduped.values()).sort((a, b) => {
          const timeDiff = getDocumentCreationSortKey(b.id) - getDocumentCreationSortKey(a.id);
          if (timeDiff !== 0) return timeDiff;
          return a.name.localeCompare(b.name, 'zh-Hans-CN');
        }),
      );
    });

    taskDocumentsByNotebook.value = nextMap;
  } catch (error) {
    console.error('[MobileTaskCreateDialog] Failed to load documents:', error);
    taskDocumentsByNotebook.value = new Map();
  }
}

async function ensureInboxDocument(notebookId: string): Promise<string> {
  const inboxPath = '/pinch收集箱';

  try {
    const existingIds = await getIDsByHPath(notebookId, inboxPath);
    if (existingIds && existingIds.length > 0) {
      return inboxPath;
    }
  } catch {
  }

  await createDocWithMd(notebookId, inboxPath, '');
  return inboxPath;
}

async function handleCreateTask(taskData: NewTaskPayload, notebookId: string, documentId: string): Promise<void> {
  try {
    let docPath = '';

    if (documentId && documentId !== PINCH_INBOX_OPTION_ID) {
      const selectedDoc = allDocuments.value.find(doc => doc.id === documentId && doc.notebookId === notebookId);
      if (selectedDoc?.path) {
        docPath = selectedDoc.path.startsWith('/') ? selectedDoc.path : `/${selectedDoc.path}`;
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
      tags: taskData.tags || [],
      groupId: taskData.groupId || undefined,
    }, notebookId, docPath);

    const normalizedGroupId = typeof taskData.groupId === 'string' ? taskData.groupId.trim() : '';
    await updateSettings('taskManager', {
      lastTaskNotebook: notebookId,
      lastTaskDocument: documentId,
      selectedGroupId: normalizedGroupId,
    });

    emit('close');
  } catch (error) {
    console.error('[MobileTaskCreateDialog] Failed to create task:', error);
    await pushMsg('创建任务失败', 3000);
  }
}

async function handleTaskGroupSave(groups: TaskGroup[]): Promise<void> {
  await saveTaskGroups(groups);
  taskGroups.value = groups;
  showTaskGroupDialog.value = false;
}

onMounted(async () => {
  try {
    await loadSettings();
    await Promise.all([
      loadNotebookOptions(),
      loadDocumentOptions(),
      loadTaskGroups().then(groups => {
        taskGroups.value = groups;
      }),
    ]);
  } finally {
    loading.value = false;
    showTaskModal.value = true;
  }
});
</script>

<style scoped>
.mobile-task-create-root {
  position: relative;
  width: 100%;
  height: 100%;
}

.mobile-task-create-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--b3-theme-on-background);
}

.mobile-task-create-root :deep(.modal-overlay) {
  align-items: center;
  padding: 16px;
  box-sizing: border-box;
  background-color: transparent;
}

.mobile-task-create-root :deep(.modal-content) {
  width: min(680px, calc(100vw - 32px));
  min-width: min(680px, calc(100vw - 32px));
  max-height: calc(100vh - 32px);
  border-radius: 20px;
  border: 1px solid var(--b3-theme-border);
  box-shadow: var(--b3-dialog-shadow);
}

.mobile-task-create-root :deep(.slide-enter-from),
.mobile-task-create-root :deep(.slide-leave-to) {
  transform: translateY(12px) scale(0.98);
}

.mobile-task-create-root :deep(.slide-enter-to),
.mobile-task-create-root :deep(.slide-leave-from) {
  transform: translateY(0) scale(1);
}
</style>
