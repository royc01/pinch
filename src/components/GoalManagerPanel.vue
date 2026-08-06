<template>
  <div class="goal-panel-root">
    <TaskDatePopover
      :visible="dueDatePopover.visible"
      :anchor-el="dueDatePopover.anchorEl"
      :model-value="dueDatePopover.value"
      quick-mode="goal"
      @update:model-value="handleDueDateSelect"
      @close="closeDueDatePopover"
    />
    <div class="goal-panel-body">
      <div class="goal-panel goal-list-panel">
        <div class="goal-panel-header">
          <span>{{ t('goalManager.goalList') }}</span>
          <SyButton class="goal-add-button" size="small" @click="addGoal">{{ t('goalManager.addGoal') }}</SyButton>
        </div>

        <div v-if="localGoals.length === 0" class="goal-empty">
          {{ t('goalManager.emptyGoals') }}
        </div>
        <div v-else class="goal-list">
          <div
            v-for="goal in localGoals"
            :key="goal.id"
            class="goal-item"
            :class="{ active: goal.id === selectedGoalId }"
            role="button"
            tabindex="0"
            @click="selectedGoalId = goal.id"
            @keydown.enter.prevent="selectedGoalId = goal.id"
            @keydown.space.prevent="selectedGoalId = goal.id"
          >
            <div class="goal-item-main">
              <button
                type="button"
                class="goal-emoji-btn ariaLabel"
                :aria-label="t('goalManager.switchGoalIcon')"
               
                @click.stop="openGoalEmojiPicker(goal.id, $event)"
              >
                <EmojiIcon class="goal-emoji-display" :value="goal.emoji" fallback="🎯" />
              </button>
              <SyInput
                class="goal-name-input"
                :model-value="goal.name"
                :placeholder="t('goalManager.goalNamePlaceholder')"
                @update:model-value="updateGoalName(goal.id, $event)"
              />
              <span class="goal-count">
                {{ goal.members.length }}/{{ goal.taskMembers?.length || 0 }}
              </span>
              <button
                type="button"
                class="goal-delete ariaLabel"
                :aria-label="t('goalManager.deleteGoal')"
               
                @click.stop="removeGoal(goal.id)"
              >
                <Icon name="trash" width="16" height="16" />
              </button>
            </div>
            <div class="goal-item-footer">
              <div class="goal-due-date">
                <label class="goal-due-date-label">{{ t('taskManager.dueDate') }}</label>
                <div class="goal-due-date-input-group">
                  <input
                    type="date"
                    :value="goal.dueDate || ''"
                    @input="updateGoalDueDate(goal.id, ($event.target as HTMLInputElement).value)"
                    @click.stop
                    @mousedown.stop
                  />
                  <button
                    :ref="el => setDueDateButtonRef(goal.id, el as HTMLElement)"
                    type="button"
                    class="goal-due-date-trigger ariaLabel"
                    :aria-label="t('taskManager.pickDueDate')"
                    @click.stop="openDueDatePopover(goal.id, goal.dueDate || '', $event)"
                  >
                    <Icon name="calendar" width="14" height="14" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="goal-panel goal-document-panel">
        <div class="goal-panel-header">
          <div class="goal-panel-header-main">
            <span>{{ t('goalManager.goalDocuments') }}</span>
            <span v-if="selectedGoal" class="goal-current">{{ selectedGoal.name || t('taskManager.untitledGoal') }}</span>
          </div>
          <div class="goal-panel-header-actions">
            <span class="goal-panel-note">{{ t('goalManager.currentTaskDocumentsOnly') }}</span>
            <button
              type="button"
              class="goal-document-refresh ariaLabel"
              :class="{ 'is-refreshing': documentsRefreshing }"
             
              :aria-label="t('taskScopeDialog.refreshDocuments')"
              :disabled="documentsRefreshing"
              @click.stop="refreshDocuments"
            >
              <Icon name="refresh" width="14" height="14" class="refresh-icon" />
            </button>
          </div>
        </div>

        <div v-if="!selectedGoal" class="goal-empty">
          {{ t('goalManager.selectGoalFirst') }}
        </div>
        <template v-else>
          <SyInput
            class="goal-search-input"
            :model-value="documentSearch"
            :placeholder="t('documentGroup.searchDocuments')"
            @update:model-value="documentSearch = $event"
          />
          <div v-if="(documentTreeLoading || documentsRefreshing) && allGoalDocuments.length === 0" class="goal-empty">
            {{ t('taskManager.loading') }}
          </div>
          <div v-else-if="filteredDocuments.length === 0" class="goal-empty">
            {{ t('goalManager.noDocuments') }}
          </div>
          <div v-else class="goal-checkbox-list">
            <div
              v-for="notebook in documentTreeGroups"
              :key="notebook.key"
              class="goal-notebook-card"
            >
              <div
                v-for="row in notebook.rows"
                :key="row.key"
                class="goal-tree-row"
                :class="[`goal-tree-row--${row.type}`, { selected: row.type === 'document' && isDocumentSelected(row.document) }]"
                :style="{ '--goal-tree-depth': row.depth }"
              >
                <template v-if="row.type === 'notebook'">
                <button
                  type="button"
                  class="goal-tree-expand"
                  :class="{ expanded: isNotebookExpanded(row.notebookId) }"
                  @click.stop="toggleNotebookExpanded(row.notebookId)"
                >
                  <Icon name="chevronRight" width="14" height="14" />
                </button>
                <label class="goal-tree-notebook-item">
                  <span
                    :class="[
                      'day-checkbox',
                      {
                        completed: isNotebookFullyChecked(row.notebookId),
                        partial: hasNotebookPartialTaskSelection(row.notebookId)
                      }
                    ]"
                  >
                    <span v-if="hasNotebookPartialTaskSelection(row.notebookId)" class="day-checkbox-count">
                      {{ getNotebookCheckedTaskCount(row.notebookId) }}
                    </span>
                    <Icon
                      v-else
                      :name="isNotebookFullyChecked(row.notebookId) ? 'squareCheck' : 'square'"
                      :completed="isNotebookFullyChecked(row.notebookId)"
                      class="day-checkbox-icon"
                    />
                  </span>
                  <span class="goal-tree-notebook-name">{{ row.name }}</span>
                  <input
                    class="goal-checkbox-input"
                    type="checkbox"
                    :checked="isNotebookFullyChecked(row.notebookId)"
                    @change="toggleNotebookMembership(row.notebookId, ($event.target as HTMLInputElement).checked)"
                  >
                </label>
                </template>
                <template v-else-if="row.type === 'document'">
                <button
                  type="button"
                  class="goal-tree-expand"
                  :class="{ expanded: isDocumentExpanded(row.document) }"
                  @click.stop="toggleDocumentExpanded(row.document)"
                >
                  <Icon name="chevronRight" width="14" height="14" />
                </button>
                <label class="goal-checkbox-item goal-tree-document-item">
                  <span
                    :class="[
                      'day-checkbox',
                      {
                        completed: isDocumentFullyChecked(row.document),
                        partial: hasDocumentPartialTaskSelection(row.document)
                      }
                    ]"
                  >
                    <span v-if="hasDocumentPartialTaskSelection(row.document)" class="day-checkbox-count">
                      {{ getDocumentCheckedTaskCount(row.document) }}
                    </span>
                    <Icon
                      v-else
                      :name="isDocumentFullyChecked(row.document) ? 'squareCheck' : 'square'"
                      :completed="isDocumentFullyChecked(row.document)"
                      class="day-checkbox-icon"
                    />
                  </span>
                  <span class="goal-checkbox-text">
                    <span class="goal-item-title-row">
                      <span class="goal-checkbox-name">{{ row.document.name }}</span>
                      <span v-if="getDocumentGoalBadges(row.document).length > 0" class="goal-membership-badges">
                      <span
                        v-for="goal in getDocumentGoalBadges(row.document)"
                        :key="`document-goal:${goal.id}`"
                        class="goal-membership-badge ariaLabel"
                        :aria-label="goal.name || t('taskManager.untitledGoal')"
                      >
                        <EmojiIcon v-if="goal.emoji" class="goal-membership-badge-emoji" :value="goal.emoji" />
                        {{ goal.name || t('taskManager.untitledGoal') }}
                      </span>
                      </span>
                    </span>
                  </span>
                  <input
                    class="goal-checkbox-input"
                    type="checkbox"
                    :checked="isDocumentSelected(row.document)"
                    @change="toggleDocumentMembership(row.document, ($event.target as HTMLInputElement).checked)"
                  >
                </label>
                </template>
                <label v-else class="goal-document-task-item goal-tree-task-item">
                <span :class="['day-checkbox', { completed: isTaskChecked(row.task) }]">
                  <Icon
                    :name="isTaskChecked(row.task) ? 'squareCheck' : 'square'"
                    :completed="isTaskChecked(row.task)"
                    class="day-checkbox-icon"
                  />
                </span>
                <span class="goal-document-task-text">
                  <span class="goal-item-title-row">
                    <span class="goal-document-task-title" v-html="getTaskTitleHtml(row.task)"></span>
                    <span v-if="getTaskGoalBadges(row.task).length > 0" class="goal-membership-badges">
                    <span
                      v-for="goal in getTaskGoalBadges(row.task)"
                      :key="`task-goal:${goal.id}`"
                      class="goal-membership-badge ariaLabel"
                      :aria-label="goal.name || t('taskManager.untitledGoal')"
                    >
                      <EmojiIcon v-if="goal.emoji" class="goal-membership-badge-emoji" :value="goal.emoji" />
                      {{ goal.name || t('taskManager.untitledGoal') }}
                    </span>
                    </span>
                  </span>
                </span>
                <input
                  class="goal-checkbox-input"
                  type="checkbox"
                  :checked="isTaskChecked(row.task)"
                  @change="toggleTaskMembership(row.task, ($event.target as HTMLInputElement).checked)"
                >
                </label>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { openEmoji } from 'siyuan';
import EmojiIcon from '@/components/EmojiIcon.vue';
import Icon from '@/components/Icon.vue';
import SyButton from '@/components/SiyuanTheme/SyButton.vue';
import SyInput from '@/components/SiyuanTheme/SyInput.vue';
import TaskDatePopover from '@/components/TaskDatePopover.vue';
import { type Task } from '@/api';
import {
  buildGoalScopeDocumentsFromTasks,
  type GoalScopeDocument
} from '@/utils/goalScopeDocuments';
import type { Goal, GoalTaskMember } from '@/goalRepository';
import {
  buildGoalTaskMember,
  isTaskDirectGoalMember,
  isTaskExcludedFromGoal,
  isTaskInGoalScope
} from '@/utils/goalTaskMembership';
import {
  invalidateFiletreeDocumentTree,
  loadFiletreeDocumentTree
} from '@/utils/filetreeDocumentTree';
import { isDocumentPathInScope } from '@/utils/taskDocumentScope';
import { sanitizeTaskTitleHtml } from '@/utils/taskHtml';
import { hasVisibleTaskTitle } from '@/utils/taskVisibility';
import { useI18n } from '@/composables/useI18n';

interface Props {
  goals: Goal[];
  documents: GoalScopeDocument[];
  allDocuments?: GoalScopeDocument[];
  tasks?: Task[];
  documentsRefreshing?: boolean;
}

type GoalDocumentTreeRow =
  | {
    type: 'notebook';
    key: string;
    depth: number;
    notebookId: string;
    name: string;
  }
  | {
    type: 'document';
    key: string;
    depth: number;
    document: GoalScopeDocument;
  }
  | {
    type: 'task';
    key: string;
    depth: number;
    task: Task;
  };

interface GoalNotebookTreeGroup {
  key: string;
  rows: GoalDocumentTreeRow[];
}

interface GoalDocumentSelectionState {
  documentCount: number;
  selectedDocumentCount: number;
  taskCount: number;
  checkedTaskCount: number;
}

type GoalTreeDocument = GoalScopeDocument & {
  parentId?: string;
  storagePath?: string;
};

const props = defineProps<Props>();
const { t } = useI18n();
const documentsRefreshing = computed(() => props.documentsRefreshing === true);

const emit = defineEmits<{
  'update:goals': [goals: Goal[]];
  'refresh-documents': [];
}>();

const localGoals = ref<Goal[]>([]);
const selectedGoalId = ref('');
const documentSearch = ref('');
const expandedDocumentKeys = ref(new Set<string>());
const collapsedNotebookIds = ref(new Set<string>());
const documentTreeDocuments = ref<GoalTreeDocument[]>([]);
const documentTreeLoading = ref(false);
let documentTreeRequestId = 0;
const dueDateButtonRefs = new Map<string, HTMLElement>();
const dueDatePopover = reactive({
  visible: false,
  anchorEl: null as HTMLElement | null,
  goalId: '',
  value: ''
});

function cloneGoals(goals: Goal[]): Goal[] {
  return (goals || []).map(goal => ({
    ...goal,
    members: Array.isArray(goal.members) ? goal.members.map(member => ({ ...member })) : [],
    excludedDocumentKeys: Array.isArray(goal.excludedDocumentKeys) ? [...goal.excludedDocumentKeys] : undefined,
    taskMembers: Array.isArray(goal.taskMembers) ? goal.taskMembers.map(member => ({ ...member })) : [],
    excludedTaskMembers: Array.isArray(goal.excludedTaskMembers) ? goal.excludedTaskMembers.map(member => ({ ...member })) : []
  }));
}

function emitGoals(nextGoals: Goal[]): void {
  const clonedGoals = cloneGoals(nextGoals);
  localGoals.value = clonedGoals;
  emit('update:goals', clonedGoals);
}

function generateGoalId(): string {
  return `goal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function syncLocalGoals(): void {
  const nextGoals = cloneGoals(props.goals || []);
  const hasSelected = nextGoals.some(goal => goal.id === selectedGoalId.value);
  localGoals.value = nextGoals;
  selectedGoalId.value = hasSelected ? selectedGoalId.value : nextGoals[0]?.id || '';
  documentSearch.value = '';
}

const selectedGoal = computed(() =>
  localGoals.value.find(goal => goal.id === selectedGoalId.value) || null
);

const taskDerivedDocuments = computed(() => {
  const notebookNameById = new Map(
    (props.documents || []).map(document => [document.notebookId, document.notebookName])
  );
  return buildGoalScopeDocumentsFromTasks(props.tasks || [], notebookNameById);
});

const notebookLevelDocumentKeys = computed(() => new Set(
  taskDerivedDocuments.value
    .filter(document => document.name === document.notebookName)
    .map(document => getDocumentKey(document))
));

// Only a changed notebook set needs a new recursive file-tree walk. Normal
// task/document updates are already represented by the SQL snapshot below.
const documentTreeNotebookIds = computed(() => Array.from(new Set([
  ...(props.documents || []),
  ...taskDerivedDocuments.value
].map(document => document.notebookId?.trim()).filter((id): id is string => Boolean(id))))
  .sort());
const documentTreeNotebookSignature = computed(() => documentTreeNotebookIds.value.join('\u0000'));

async function loadDocumentTreeFromFiletreeApi(force = false): Promise<void> {
  const requestId = ++documentTreeRequestId;
  const notebookNameById = new Map<string, string>();
  for (const document of [...(props.allDocuments || []), ...(props.documents || []), ...taskDerivedDocuments.value]) {
    if (document.notebookId && document.notebookName) notebookNameById.set(document.notebookId, document.notebookName);
  }
  const notebookIds = documentTreeNotebookIds.value;
  if (notebookIds.length === 0) {
    documentTreeDocuments.value = [];
    documentTreeLoading.value = false;
    return;
  }

  // Prefer the existing SQL snapshot for first paint. This recursive request
  // enriches missing branches without hiding usable cards behind a spinner.
  documentTreeLoading.value = allGoalDocuments.value.length === 0;
  try {
    const trees = await Promise.all(notebookIds.map(notebookId =>
      loadFiletreeDocumentTree(notebookId, { force })
    ));
    if (requestId === documentTreeRequestId) {
      documentTreeDocuments.value = trees.flatMap(tree => tree.map(document => ({
        ...document,
        notebookName: notebookNameById.get(document.notebookId) || document.notebookId
      })));
      synchronizeDescendantMemberships();
    }
  } catch (error) {
    if (requestId === documentTreeRequestId) {
      console.warn('[GoalManager] listDocsByPath is unavailable; using supplied document data', error);
      documentTreeDocuments.value = [];
    }
  } finally {
    if (requestId === documentTreeRequestId) documentTreeLoading.value = false;
  }
}

const allGoalDocuments = computed(() => {
  const documentsByKey = new Map<string, GoalTreeDocument>();
  for (const document of [
    // Treat the up-to-date SQL snapshot as authoritative, keeping the
    // file-tree result only for metadata or branches missing from it.
    ...documentTreeDocuments.value,
    ...(props.allDocuments || []),
    ...(props.documents || [])
  ]) {
    const key = getDocumentKey(document);
    const existing = documentsByKey.get(key);
    const documentWithTreeMetadata = document as GoalTreeDocument;
    documentsByKey.set(key, {
      ...existing,
      ...document,
      path: document.path || existing?.path,
      parentId: documentWithTreeMetadata.parentId || existing?.parentId,
      storagePath: documentWithTreeMetadata.storagePath || existing?.storagePath
    });
  }

  for (const document of taskDerivedDocuments.value) {
    const key = getDocumentKey(document);
    if (!documentsByKey.has(key) && !notebookLevelDocumentKeys.value.has(key)) {
      documentsByKey.set(key, document);
    }
  }

  return Array.from(documentsByKey.values());
});

function refreshDocuments(): void {
  invalidateFiletreeDocumentTree(documentTreeNotebookIds.value);
  void loadDocumentTreeFromFiletreeApi(true);
  emit('refresh-documents');
}

function isVisibleGoalTask(task: Task): boolean {
  return task.type === 'block'
    && !task.archived
    && !task.isVirtual
    && hasVisibleTaskTitle(task.title);
}

const visibleGoalTasks = computed(() => (props.tasks || []).filter(isVisibleGoalTask));

const notebookLevelTasksByNotebookId = computed(() => {
  const tasksByNotebookId = new Map<string, Task[]>();
  for (const task of visibleGoalTasks.value) {
    if (!notebookLevelDocumentKeys.value.has(`${task.notebookId}:${task.rootId}`)) {
      continue;
    }
    const tasks = tasksByNotebookId.get(task.notebookId) || [];
    tasks.push(task);
    tasksByNotebookId.set(task.notebookId, tasks);
  }
  return tasksByNotebookId;
});

function getNotebookLevelTasks(notebookId: string): Task[] {
  return notebookLevelTasksByNotebookId.value.get(notebookId) || [];
}

const filteredDocuments = computed(() => {
  const keyword = documentSearch.value.trim().toLocaleLowerCase();
  const documentsByPath = new Map<string, GoalScopeDocument>();
  const documentsByKey = new Map<string, GoalScopeDocument>();
  for (const document of allGoalDocuments.value) {
    const path = normalizeDocumentPath(document.path);
    if (path) documentsByPath.set(`${document.notebookId}:${path}`, document);
    documentsByKey.set(getDocumentKey(document), document);
  }

  const taskDocumentKeys = new Set((props.tasks || [])
    .filter(isVisibleGoalTask)
    .map(task => `${task.notebookId}:${task.rootId}`));
  const visibleKeys = new Set<string>();
  const addWithAncestors = (document: GoalScopeDocument): void => {
    let current: GoalScopeDocument | undefined = document;
    while (current) {
      const key = getDocumentKey(current);
      if (notebookLevelDocumentKeys.value.has(key)) break;
      if (visibleKeys.has(key)) break;
      visibleKeys.add(key);
      const parentKey = getDocumentParentKey(current, documentsByPath, documentsByKey);
      current = parentKey ? documentsByKey.get(parentKey) : undefined;
    }
  };

  for (const document of allGoalDocuments.value) {
    if (notebookLevelDocumentKeys.value.has(getDocumentKey(document))) {
      continue;
    }
    const haystack = `${document.name} ${document.notebookName} ${document.path || ''}`.toLocaleLowerCase();
    if (taskDocumentKeys.has(getDocumentKey(document)) && (!keyword || haystack.includes(keyword))) {
      addWithAncestors(document);
    }
  }
  return allGoalDocuments.value.filter(document => visibleKeys.has(getDocumentKey(document)));
});

function normalizeDocumentPath(path: string | undefined): string {
  return (path || '').trim().replace(/\\/g, '/').replace(/\/+$/, '');
}

function getDocumentParentKey(
  document: GoalScopeDocument,
  documentsByPath: Map<string, GoalScopeDocument>,
  documentsByKey?: Map<string, GoalScopeDocument>
): string | null {
  const treeDocument = document as GoalScopeDocument & {
    parentId?: string;
    storagePath?: string;
  };
  const parentId = treeDocument.parentId?.trim();
  if (parentId && parentId !== document.id) {
    const parentKey = `${document.notebookId}:${parentId}`;
    if (documentsByKey?.has(parentKey)) {
      return parentKey;
    }
  }
  const storagePathParts = (treeDocument.storagePath || '')
    .trim()
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean);
  const storageParentId = storagePathParts.length >= 2
    ? storagePathParts[storagePathParts.length - 2]
    : '';
  if (storageParentId) {
    const parentKey = `${document.notebookId}:${storageParentId}`;
    if (documentsByKey?.has(parentKey)) {
      return parentKey;
    }
  }
  let parentPath = normalizeDocumentPath(document.path);
  const lastSeparator = parentPath.lastIndexOf('/');
  if (lastSeparator <= 0) {
    return null;
  }
  parentPath = parentPath.slice(0, lastSeparator);
  const parent = documentsByPath.get(`${document.notebookId}:${parentPath}`);
  return parent ? getDocumentKey(parent) : null;
}

function synchronizeDescendantMemberships(): void {
  if (localGoals.value.length === 0) return;

  const documentsByPath = new Map<string, GoalScopeDocument>();
  const documentsByKey = new Map<string, GoalScopeDocument>();
  for (const document of allGoalDocuments.value) {
    const path = normalizeDocumentPath(document.path);
    if (path) documentsByPath.set(`${document.notebookId}:${path}`, document);
    documentsByKey.set(getDocumentKey(document), document);
  }
  const selectableDocuments = filteredDocuments.value;
  const nextGoals = localGoals.value.map(goal => {
    const memberKeys = new Set(goal.members.map(member => `${member.notebookId}:${member.documentId}`));
    const excludedKeys = new Set(goal.excludedDocumentKeys || []);
    const additions: Goal['members'] = [];
    for (const document of selectableDocuments) {
      const documentKey = getDocumentKey(document);
      if (memberKeys.has(documentKey) || excludedKeys.has(documentKey)) continue;
      let current = document;
      let isDescendantOfMember = false;
      const visited = new Set<string>();
      while (true) {
        const parentKey = getDocumentParentKey(current, documentsByPath, documentsByKey);
        if (!parentKey || visited.has(parentKey)) break;
        visited.add(parentKey);
        if (memberKeys.has(parentKey)) {
          isDescendantOfMember = true;
          break;
        }
        const parent = documentsByKey.get(parentKey);
        if (!parent) break;
        current = parent;
      }
      if (isDescendantOfMember) {
        memberKeys.add(documentKey);
        additions.push({
          documentId: document.id,
          notebookId: document.notebookId,
          name: document.name,
          path: document.path
        });
      }
    }
    return additions.length > 0 ? { ...goal, members: [...goal.members, ...additions] } : goal;
  });
  if (nextGoals.some((goal, index) => goal.members.length !== localGoals.value[index]?.members.length)) {
    emitGoals(nextGoals);
  }
}

const documentTreeRows = computed<GoalDocumentTreeRow[]>(() => {
  const documentsByNotebook = new Map<string, GoalScopeDocument[]>();
  for (const document of filteredDocuments.value) {
    const documents = documentsByNotebook.get(document.notebookId) || [];
    documents.push(document);
    documentsByNotebook.set(document.notebookId, documents);
  }

  const rows: GoalDocumentTreeRow[] = [];
  const notebookEntries = [...documentsByNotebook.entries()].sort(([, left], [, right]) =>
    (left[0]?.notebookName || '').localeCompare(right[0]?.notebookName || '', 'zh-CN')
  );

  for (const [notebookId, documents] of notebookEntries) {
    const notebookName = documents[0]?.notebookName || notebookId;
    rows.push({
      type: 'notebook',
      key: `notebook:${notebookId}`,
      depth: 0,
      notebookId,
      name: notebookName
    });
    if (!isNotebookExpanded(notebookId)) {
      continue;
    }

    for (const task of getNotebookLevelTasks(notebookId)) {
      rows.push({ type: 'task', key: `task:${task.id}`, depth: 1, task });
    }

    const documentsByPath = new Map<string, GoalScopeDocument>();
    const documentsByKey = new Map<string, GoalScopeDocument>();
    const childDocuments = new Map<string | null, GoalScopeDocument[]>();
    for (const document of documents) {
      const path = normalizeDocumentPath(document.path);
      if (path) {
        documentsByPath.set(`${document.notebookId}:${path}`, document);
      }
      documentsByKey.set(getDocumentKey(document), document);
    }
    for (const document of documents) {
      const parentKey = getDocumentParentKey(document, documentsByPath, documentsByKey);
      const children = childDocuments.get(parentKey) || [];
      children.push(document);
      childDocuments.set(parentKey, children);
    }

    const appendDocuments = (parentKey: string | null, depth: number): void => {
      const children = (childDocuments.get(parentKey) || []).sort((left, right) =>
        left.name.localeCompare(right.name, 'zh-CN')
      );
      for (const document of children) {
        rows.push({ type: 'document', key: getDocumentKey(document), depth, document });
        if (!isDocumentExpanded(document)) {
          continue;
        }
        for (const task of getDocumentTasks(document)) {
          rows.push({ type: 'task', key: `task:${task.id}`, depth: depth + 1, task });
        }
        appendDocuments(getDocumentKey(document), depth + 1);
      }
    };

    appendDocuments(null, 1);
  }

  return rows;
});

const documentTreeGroups = computed<GoalNotebookTreeGroup[]>(() => {
  const groups: GoalNotebookTreeGroup[] = [];
  for (const row of documentTreeRows.value) {
    if (row.type === 'notebook') {
      groups.push({ key: row.key, rows: [row] });
    } else if (groups.length > 0) {
      groups[groups.length - 1].rows.push(row);
    }
  }
  return groups;
});

function getDocumentKey(document: GoalScopeDocument): string {
  return `${document.notebookId}:${document.id}`;
}

function getDocumentGoalBadges(document: GoalScopeDocument): Goal[] {
  const selectedId = selectedGoalId.value;
  return localGoals.value.filter(goal =>
    goal.id !== selectedId
    && goal.members.some(member =>
      member.notebookId === document.notebookId
      && (member.documentId === document.id || isDocumentPathInScope(document.path || '', member.path || ''))
    )
  );
}

function getTaskGoalBadges(task: Task): Goal[] {
  const selectedId = selectedGoalId.value;
  return localGoals.value.filter(goal =>
    goal.id !== selectedId && isTaskInGoalScope(goal, task)
  );
}

function isTaskInSelectedDocumentScope(task: Task): boolean {
  const activeGoal = selectedGoal.value;
  if (!activeGoal) {
    return false;
  }
  return activeGoal.members.some((member) => {
    if (member.notebookId !== task.notebookId) {
      return false;
    }
    if (member.documentId === task.rootId) {
      return true;
    }
    return isDocumentPathInScope(task.hPath || '', member.path || '');
  });
}

const documentTasksByKey = computed(() => {
  const tasksByKey = new Map<string, Task[]>();

  // Index tasks once. Filtering the full task list for every document made
  // the first render of the Goals tab scale with documents × tasks.
  for (const task of visibleGoalTasks.value) {
    const key = `${task.notebookId}:${task.rootId}`;
    const tasks = tasksByKey.get(key) || [];
    tasks.push(task);
    tasksByKey.set(key, tasks);
  }

  for (const tasks of tasksByKey.values()) {
    tasks.sort((left, right) => {
      const leftCompleted = left.status === 'completed' ? 1 : 0;
      const rightCompleted = right.status === 'completed' ? 1 : 0;
      if (leftCompleted !== rightCompleted) {
        return leftCompleted - rightCompleted;
      }
      return (left.title || '').localeCompare(right.title || '', 'zh-CN');
    });
  }

  return tasksByKey;
});

const documentSelectionStates = computed(() => {
  const documents = filteredDocuments.value;
  const documentsByKey = new Map(documents.map(document => [getDocumentKey(document), document]));
  const documentsByPath = new Map<string, GoalScopeDocument>();
  const childrenByParentKey = new Map<string, string[]>();
  const selectedDocumentKeys = new Set(
    (selectedGoal.value?.members || []).map(member => `${member.notebookId}:${member.documentId}`)
  );

  for (const document of documents) {
    const path = normalizeDocumentPath(document.path);
    if (path) documentsByPath.set(`${document.notebookId}:${path}`, document);
  }
  for (const document of documents) {
    const parentKey = getDocumentParentKey(document, documentsByPath, documentsByKey);
    if (!parentKey || !documentsByKey.has(parentKey)) continue;
    const children = childrenByParentKey.get(parentKey) || [];
    children.push(getDocumentKey(document));
    childrenByParentKey.set(parentKey, children);
  }

  const states = new Map<string, GoalDocumentSelectionState>();
  const calculateState = (key: string): GoalDocumentSelectionState => {
    const existing = states.get(key);
    if (existing) return existing;
    const document = documentsByKey.get(key);
    if (!document) {
      return { documentCount: 0, selectedDocumentCount: 0, taskCount: 0, checkedTaskCount: 0 };
    }
    const ownTasks = getDocumentTasks(document);
    const state: GoalDocumentSelectionState = {
      documentCount: 1,
      selectedDocumentCount: selectedDocumentKeys.has(key) ? 1 : 0,
      taskCount: ownTasks.length,
      checkedTaskCount: ownTasks.filter(task => isTaskChecked(task)).length
    };
    // Store first so malformed circular document paths cannot recurse forever.
    states.set(key, state);
    for (const childKey of childrenByParentKey.get(key) || []) {
      const child = calculateState(childKey);
      state.documentCount += child.documentCount;
      state.selectedDocumentCount += child.selectedDocumentCount;
      state.taskCount += child.taskCount;
      state.checkedTaskCount += child.checkedTaskCount;
    }
    return state;
  };

  for (const document of documents) {
    calculateState(getDocumentKey(document));
  }
  return states;
});

function getDocumentTasks(document: GoalScopeDocument): Task[] {
  return documentTasksByKey.value.get(getDocumentKey(document)) || [];
}

function isDocumentExpanded(document: GoalScopeDocument): boolean {
  return expandedDocumentKeys.value.has(getDocumentKey(document));
}

function toggleDocumentExpanded(document: GoalScopeDocument): void {
  const key = getDocumentKey(document);
  const nextExpanded = new Set(expandedDocumentKeys.value);
  if (isDocumentExpanded(document)) {
    nextExpanded.delete(key);
  } else {
    nextExpanded.add(key);
  }
  expandedDocumentKeys.value = nextExpanded;
}

function isNotebookExpanded(notebookId: string): boolean {
  return !collapsedNotebookIds.value.has(notebookId);
}

function toggleNotebookExpanded(notebookId: string): void {
  const next = new Set(collapsedNotebookIds.value);
  if (next.has(notebookId)) {
    next.delete(notebookId);
  } else {
    next.add(notebookId);
  }
  collapsedNotebookIds.value = next;
}

function isTaskChecked(task: Task): boolean {
  const activeGoal = selectedGoal.value;
  if (!activeGoal) {
    return false;
  }
  if (isTaskDirectGoalMember(activeGoal, task)) {
    return true;
  }
  if (isTaskExcludedFromGoal(activeGoal, task)) {
    return false;
  }
  return isTaskInSelectedDocumentScope(task);
}

function getDocumentCheckedTaskCount(document: GoalScopeDocument): number {
  return documentSelectionStates.value.get(getDocumentKey(document))?.checkedTaskCount || 0;
}

function isDocumentFullyChecked(document: GoalScopeDocument): boolean {
  const state = documentSelectionStates.value.get(getDocumentKey(document));
  return Boolean(state
    && state.documentCount > 0
    && state.documentCount === state.selectedDocumentCount
    && state.taskCount === state.checkedTaskCount);
}

function hasDocumentPartialTaskSelection(document: GoalScopeDocument): boolean {
  const state = documentSelectionStates.value.get(getDocumentKey(document));
  return Boolean(state && state.checkedTaskCount > 0 && state.checkedTaskCount < state.taskCount);
}

function getNotebookDocuments(notebookId: string): GoalScopeDocument[] {
  return filteredDocuments.value.filter(document => document.notebookId === notebookId);
}

function getNotebookTasks(notebookId: string): Task[] {
  return [
    ...getNotebookLevelTasks(notebookId),
    ...getNotebookDocuments(notebookId).flatMap(document => getDocumentTasks(document))
  ];
}

function getNotebookCheckedTaskCount(notebookId: string): number {
  return getNotebookTasks(notebookId).filter(task => isTaskChecked(task)).length;
}

function isNotebookFullyChecked(notebookId: string): boolean {
  const documents = getNotebookDocuments(notebookId);
  const tasks = getNotebookTasks(notebookId);
  if (documents.length === 0 && tasks.length === 0) {
    return false;
  }
  return documents.every(document => isDocumentFullyChecked(document))
    && tasks.every(task => isTaskChecked(task));
}

function hasNotebookPartialTaskSelection(notebookId: string): boolean {
  const tasks = getNotebookTasks(notebookId);
  if (tasks.length === 0) {
    const documents = getNotebookDocuments(notebookId);
    return documents.some(document => isDocumentSelected(document)) && !isNotebookFullyChecked(notebookId);
  }
  const checkedCount = tasks.filter(task => isTaskChecked(task)).length;
  return checkedCount > 0 && checkedCount < tasks.length;
}

function getTaskTitleHtml(task: Task): string {
  return sanitizeTaskTitleHtml(task.title || '');
}

function updateGoalName(goalId: string, value: string): void {
  emitGoals(localGoals.value.map(goal => (
    goal.id === goalId
      ? { ...goal, name: value }
      : goal
  )));
}

function updateGoalDueDate(goalId: string, value: string): void {
  emitGoals(localGoals.value.map(goal => (
    goal.id === goalId
      ? { ...goal, dueDate: value || undefined }
      : goal
  )));
}

function setDueDateButtonRef(goalId: string, el: HTMLElement | null): void {
  if (el) {
    dueDateButtonRefs.set(goalId, el);
  } else {
    dueDateButtonRefs.delete(goalId);
  }
}

function openDueDatePopover(goalId: string, currentValue: string, event: MouseEvent): void {
  const target = event.currentTarget as HTMLElement;
  dueDatePopover.visible = true;
  dueDatePopover.anchorEl = target;
  dueDatePopover.goalId = goalId;
  dueDatePopover.value = currentValue;
}

function closeDueDatePopover(): void {
  dueDatePopover.visible = false;
  dueDatePopover.anchorEl = null;
  dueDatePopover.goalId = '';
  dueDatePopover.value = '';
}

function handleDueDateSelect(value: string): void {
  if (dueDatePopover.goalId) {
    updateGoalDueDate(dueDatePopover.goalId, value);
  }
  closeDueDatePopover();
}

function updateGoalEmoji(goalId: string, value: string): void {
  const nextEmoji = normalizeEmojiValue(value);
  emitGoals(localGoals.value.map(goal => (
    goal.id === goalId
      ? { ...goal, emoji: nextEmoji || undefined }
      : goal
  )));
}

function normalizeEmojiValue(value: string): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) {
    return '';
  }
  if (raw.includes('.') || raw.includes('/')) {
    return raw;
  }
  const hexPattern = /^[0-9a-fA-F]+(-[0-9a-fA-F]+)*$/;
  if (hexPattern.test(raw)) {
    const codePoints = raw.split('-').map(part => parseInt(part, 16));
    if (codePoints.every(point => Number.isFinite(point))) {
      try {
        return String.fromCodePoint(...codePoints);
      } catch {
        return raw;
      }
    }
  }
  return raw;
}

function openGoalEmojiPicker(goalId: string, event: MouseEvent): void {
  selectedGoalId.value = goalId;
  const target = event.currentTarget as HTMLElement | null;
  const rect = target ? target.getBoundingClientRect() : null;
  const position = rect
    ? { x: Math.round(rect.left), y: Math.round(rect.bottom) }
    : { x: event.clientX, y: event.clientY };
  openEmoji({
    position,
    selectedCB: (emoji: string) => {
      updateGoalEmoji(goalId, emoji);
    },
    hideDynamicIcon: false,
    hideCustomIcon: false
  });
}

function addGoal(): void {
  const nowIso = new Date().toISOString();
  const nextGoal: Goal = {
    id: generateGoalId(),
    emoji: '🎯',
    name: t('goalManager.newGoal'),
    members: [],
    taskMembers: [],
    order: localGoals.value.length,
    createdAt: nowIso,
    updatedAt: nowIso
  };

  selectedGoalId.value = nextGoal.id;
  documentSearch.value = '';
  emitGoals([...localGoals.value, nextGoal]);
}

function removeGoal(goalId: string): void {
  const currentGoal = localGoals.value.find(goal => goal.id === goalId);
  if (!currentGoal) {
    return;
  }

  if (!confirm(`${t('goalManager.confirmDeletePrefix')}“${currentGoal.name || t('taskManager.untitledGoal')}”？`)) {
    return;
  }

  const nextGoals = localGoals.value.filter(goal => goal.id !== goalId);
  if (selectedGoalId.value === goalId) {
    selectedGoalId.value = nextGoals[0]?.id || '';
    documentSearch.value = '';
  }
  emitGoals(nextGoals);
}

function isDocumentSelected(document: GoalScopeDocument): boolean {
  return selectedGoal.value?.members.some(member =>
    member.documentId === document.id && member.notebookId === document.notebookId
  ) === true;
}

function getDocumentScopeDocuments(document: GoalScopeDocument): GoalScopeDocument[] {
  const documents = filteredDocuments.value.filter(candidate => candidate.notebookId === document.notebookId);
  const documentsByPath = new Map<string, GoalScopeDocument>();
  const documentsByKey = new Map<string, GoalScopeDocument>();
  const childrenByParentKey = new Map<string, GoalScopeDocument[]>();
  for (const candidate of documents) {
    const path = normalizeDocumentPath(candidate.path);
    if (path) documentsByPath.set(`${candidate.notebookId}:${path}`, candidate);
    documentsByKey.set(getDocumentKey(candidate), candidate);
  }
  for (const candidate of documents) {
    const parentKey = getDocumentParentKey(candidate, documentsByPath, documentsByKey);
    if (!parentKey) continue;
    const children = childrenByParentKey.get(parentKey) || [];
    children.push(candidate);
    childrenByParentKey.set(parentKey, children);
  }
  const scoped: GoalScopeDocument[] = [];
  const pending = [document];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) continue;
    const key = getDocumentKey(current);
    if (visited.has(key)) continue;
    visited.add(key);
    scoped.push(current);
    pending.push(...(childrenByParentKey.get(key) || []));
  }
  return scoped;
}

function toggleDocumentMembership(document: GoalScopeDocument, checked: boolean): void {
  const activeGoal = selectedGoal.value;
  if (!activeGoal) {
    return;
  }

  const scopedDocuments = getDocumentScopeDocuments(document);
  const scopedDocumentKeys = new Set(scopedDocuments.map(getDocumentKey));
  const scopedDocumentIds = new Set(scopedDocuments.map(candidate => candidate.id));
  const scopedTaskIds = new Set((props.tasks || [])
    .filter(task => task.notebookId === document.notebookId
      && (scopedDocumentIds.has(task.rootId) || isDocumentPathInScope(task.hPath || '', document.path || '')))
    .map(task => task.id));

  emitGoals(localGoals.value.map(goal => {
    if (goal.id !== activeGoal.id) {
      return goal;
    }

    const nextMembers = goal.members.filter(member =>
      !scopedDocumentKeys.has(`${member.notebookId}:${member.documentId}`)
    );
    const excludedKeys = new Set(goal.excludedDocumentKeys || []);
    for (const key of scopedDocumentKeys) {
      if (checked) excludedKeys.delete(key);
      else excludedKeys.add(key);
    }
    if (checked) {
      nextMembers.push(...scopedDocuments.map(candidate => ({
        documentId: candidate.id,
        notebookId: candidate.notebookId,
        name: candidate.name,
        path: candidate.path
      })));
    }

    if (checked) {
      return {
        ...goal,
        members: nextMembers,
        excludedDocumentKeys: excludedKeys.size > 0 ? Array.from(excludedKeys) : undefined
      };
    }

    const isTaskInDocumentScope = (member: GoalTaskMember): boolean =>
      scopedTaskIds.has(member.taskId)
      || (member.notebookId === document.notebookId && scopedDocumentIds.has(member.rootId || ''));

    return {
      ...goal,
      members: nextMembers,
      excludedDocumentKeys: excludedKeys.size > 0 ? Array.from(excludedKeys) : undefined,
      taskMembers: (goal.taskMembers || []).filter(member => !isTaskInDocumentScope(member)),
      excludedTaskMembers: (goal.excludedTaskMembers || []).filter(member => !isTaskInDocumentScope(member))
    };
  }));
}

function toggleNotebookMembership(notebookId: string, checked: boolean): void {
  const activeGoal = selectedGoal.value;
  if (!activeGoal) {
    return;
  }

  const documents = getNotebookDocuments(notebookId);
  const documentKeys = new Set(documents.map(getDocumentKey));
  const notebookTasks = getNotebookLevelTasks(notebookId);
  const notebookTaskIds = new Set(notebookTasks.map(task => task.id));
  emitGoals(localGoals.value.map(goal => {
    if (goal.id !== activeGoal.id) {
      return goal;
    }

    const nextMembers = goal.members.filter(member =>
      !documentKeys.has(`${member.notebookId}:${member.documentId}`)
    );
    const excludedKeys = new Set(goal.excludedDocumentKeys || []);
    for (const key of documentKeys) {
      if (checked) excludedKeys.delete(key);
      else excludedKeys.add(key);
    }
    if (checked) {
      nextMembers.push(...documents.map(document => ({
        documentId: document.id,
        notebookId: document.notebookId,
        name: document.name,
        path: document.path
      })));
    }

    const nextTaskMembers = (goal.taskMembers || []).filter(member => !notebookTaskIds.has(member.taskId));
    const nextExcludedTaskMembers = (goal.excludedTaskMembers || [])
      .filter(member => !notebookTaskIds.has(member.taskId));
    if (checked) {
      nextTaskMembers.push(
        ...notebookTasks
          .map(task => buildGoalTaskMember(task))
          .filter((member): member is NonNullable<typeof member> => member !== null)
      );
    }

    return {
      ...goal,
      members: nextMembers,
      excludedDocumentKeys: excludedKeys.size > 0 ? Array.from(excludedKeys) : undefined,
      taskMembers: nextTaskMembers,
      excludedTaskMembers: nextExcludedTaskMembers
    };
  }));
}

function toggleTaskMembership(task: Task, checked: boolean): void {
  const activeGoal = selectedGoal.value;
  const taskMember = buildGoalTaskMember(task);
  if (!activeGoal || !taskMember) {
    return;
  }

  const inherited = isTaskInSelectedDocumentScope(task);
  emitGoals(localGoals.value.map(goal => {
    if (goal.id !== activeGoal.id) {
      return goal;
    }

    const directMembers = (goal.taskMembers || [])
      .filter(member => member.taskId !== taskMember.taskId);
    const excludedMembers = (goal.excludedTaskMembers || [])
      .filter(member => member.taskId !== taskMember.taskId);

    if (checked) {
      return {
        ...goal,
        taskMembers: inherited ? directMembers : [...directMembers, taskMember],
        excludedTaskMembers: excludedMembers
      };
    }

    return {
      ...goal,
      taskMembers: directMembers,
      excludedTaskMembers: inherited ? [...excludedMembers, taskMember] : excludedMembers
    };
  }));
}

watch(
  () => props.goals,
  () => {
    syncLocalGoals();
  },
  { immediate: true, deep: true }
);

watch(
  documentTreeNotebookSignature,
  () => {
    void loadDocumentTreeFromFiletreeApi();
  },
  { immediate: true }
);

watch(
  [() => props.documents, () => props.tasks, () => props.allDocuments],
  () => {
    // Keep inherited memberships correct when a fresh task/document snapshot
    // arrives, without repeating an expensive whole-notebook traversal.
    synchronizeDescendantMemberships();
  },
  { deep: true, flush: 'post' }
);

</script>

<style scoped>
.goal-panel-root {
  display: flex;
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

.goal-panel-body {
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(220px, 240px) minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  gap: 12px;
  margin: 0 12px;
  overflow: hidden;
}

.goal-panel {
  height: calc( 100% - 16px );
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 8px;
  border-radius: 10px;
  background-color: var(--Sv-theme-surface, var(--b3-theme-surface));
  overflow: hidden;
}

.goal-panel-header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 32px;
  min-width: 0;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--b3-theme-on-background);
}

.goal-panel-header-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.goal-panel-header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  min-width: 0;
}

.goal-current {
  min-width: 0;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 500;
  color: var(--b3-theme-on-surface);
}

.goal-panel-note {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  color: var(--b3-theme-on-surface-light);
}

.goal-document-refresh {
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--b3-theme-on-surface);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.goal-document-refresh:hover {
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
}

.goal-document-refresh:disabled {
  cursor: default;
  opacity: 0.75;
}

.goal-document-refresh .refresh-icon {
  width: 14px;
  height: 14px;
  fill: currentColor;
}

.goal-document-refresh.is-refreshing .refresh-icon {
  animation: goal-document-refresh-spin 0.8s linear infinite;
}

@keyframes goal-document-refresh-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.goal-add-button {
  border: none;
  border-radius: 20px;
  background: #f98f7a;
  color: #fff;
  padding: 4px 10px;
}

.goal-empty {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  border-radius: 12px;
  background: rgba(249, 143, 122, 0.08);
  font-size: 13px;
  text-align: center;
  color: var(--b3-theme-on-surface);
}

.goal-list,
.goal-checkbox-list {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
}

.goal-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.goal-checkbox-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 2px;
}

.goal-notebook-card {
  padding: 6px;
  border-radius: 10px;
  background: var(--b3-theme-background);
  box-shadow: #0000000f 0 1px 5px;
}

.goal-tree-row {
  --goal-tree-indent: calc(var(--goal-tree-depth) * 20px);
  display: flex;
  align-items: center;
  min-width: 0;
  padding-left: var(--goal-tree-indent);
}

.goal-tree-row--notebook {
  min-height: 26;
  font-size: 13px;
  font-weight: 600;
  color: var(--b3-theme-on-background);
}

.goal-tree-row--task {
  padding-left: calc(var(--goal-tree-indent) + 24px);
}

.goal-tree-expand {
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--b3-theme-on-surface);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.goal-tree-expand:hover {
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
}

.goal-tree-expand svg {
  fill: currentColor;
  transition: transform 0.16s ease;
}

.goal-tree-expand.expanded svg {
  transform: rotate(90deg);
}

.goal-tree-notebook-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.goal-tree-notebook-item {
  position: relative;
  display: flex;
  flex: 1;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 28px;
  padding: 0 2px;
  border-radius: 6px;
  cursor: pointer;
}

.goal-tree-notebook-item:hover {
  background: var(--b3-list-hover);
}

.goal-tree-document-item {
  flex: 1;
  padding: 7px 10px;
}

.goal-document-task-item {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
  padding: 7px 10px;
  border-radius: 8px;
  background: var(--b3-theme-background);
  cursor: pointer;
}

.goal-tree-task-item {
  width: 100%;
  padding: 4px 6px;
  background: transparent;
}

.goal-tree-task-item:hover {
  background: var(--b3-list-hover);
}

.goal-document-task-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.goal-item-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  width: 100%;
}

.goal-document-task-title {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--b3-theme-on-background);
  font-size: 12px;
}

.goal-membership-badges {
  display: flex;
  flex: 0 1 55%;
  justify-content: flex-end;
  gap: 4px;
  min-width: 0;
  margin-left: auto;
  overflow: hidden;
  white-space: nowrap;
}

.goal-membership-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  max-width: 140px;
  min-height: 16px;
  padding: 1px 5px;
  overflow: hidden;
  border-radius: 5px;
  background: var(--pinch-background6);
  color: var(--b3-theme-on-background);
  font-size: 10px;
  font-weight: 500;
  line-height: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.goal-membership-badge-emoji {
  flex: 0 0 auto;
  font-size: 10px;
  line-height: 1;
}

.goal-item{
  width: 100%;
  padding: 8px;
  border: none;
  border-radius: 10px;
  background: var(--b3-list-hover);
  cursor: pointer;
  text-align: left;
  box-sizing: border-box;
}

.goal-item.active,.goal-item:hover {
  background: var(--b3-theme-background);
  box-shadow: var(--pinch-shadow);
}

.goal-item:focus-visible {
  outline: 2px solid var(--b3-theme-primary);
  outline-offset: 2px;
}

.goal-item-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  box-sizing: border-box;
}

.goal-emoji-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: var(--b3-list-hover);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.goal-emoji-btn:hover {
  background: color-mix(in srgb, var(--b3-list-hover) 70%, var(--b3-theme-primary) 30%);
}

.goal-emoji-display {
  font-size: 18px;
  line-height: 1;
}

.goal-name-input {
  flex: 1;
  min-width: 0;
}

.goal-count {
  min-width: 22px;
  text-align: center;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
}

.goal-delete {
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: none;
  color: var(--b3-theme-on-surface);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.goal-delete:hover {
  background: var(--b3-list-hover);
}

.goal-delete svg {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.goal-item-footer {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
  box-sizing: border-box;
  max-width: 100%;
}

.goal-due-date {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
}

.goal-due-date-label {
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  white-space: nowrap;
}

.goal-due-date-input-group {
  flex: 1;
  min-width: 0;
  position: relative;
  display: block;
  max-width: 150px;
}

.goal-due-date-input-group input[type="date"] {
  width: 100%;
  box-sizing: border-box;
  appearance: none;
  -webkit-appearance: none;
  padding: 6px 34px 6px 10px;
  border: none;
  border-radius: 8px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  font-size: 12px;
  outline: none;
}

.goal-due-date-input-group input[type="date"]:focus {
  box-shadow: inset 0 0 0 1px rgba(249, 143, 122, 0.45);
}

.goal-due-date-input-group input[type="date"]::-webkit-calendar-picker-indicator,
.goal-due-date-input-group input[type="date"]::-webkit-clear-button,
.goal-due-date-input-group input[type="date"]::-webkit-inner-spin-button {
  opacity: 0;
  pointer-events: none;
  width: 0;
  margin: 0;
  display: none;
}

.goal-due-date-trigger {
  position: absolute;
  top: 50%;
  right: 4px;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--b3-theme-on-background);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.goal-due-date-trigger:hover {
  color: var(--b3-theme-primary);
  background: var(--b3-theme-background);
}

.goal-search-input {
  margin-bottom: 10px;
}

.goal-checkbox-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
  padding: 4px 6px;
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
  position: relative;
}

.goal-checkbox-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.goal-checkbox-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--b3-theme-on-background);
}

.goal-checkbox-meta {
  font-size: 12px;
  color: var(--b3-theme-on-surface);
}

.goal-checkbox-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  margin: 0;
  cursor: pointer;
}

.day-checkbox {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2px;
  flex: 0 0 auto;
}

.day-checkbox-icon {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  color: var(--b3-list-hover);
  transition: all 0.2s;
}

.day-checkbox.completed .day-checkbox-icon {
  color: #f98f7a;
}

.day-checkbox-count {
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  border-radius: 4px;
  background: #f98f7a;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  line-height: 14px;
  text-align: center;
  box-sizing: border-box;
}

@media (max-width: 720px) {
  .goal-panel-body {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(180px, 220px) minmax(0, 1fr);
  }

  .goal-panel-header {
    flex-direction: column;
    align-items: stretch;
  }

  .goal-panel-header-main {
    flex-direction: column;
    align-items: flex-start;
  }

  .goal-panel-header-actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
