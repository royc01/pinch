<template>
  <div class="document-group-panel-root">
    <div class="document-group-body">
      <div class="document-group-panel group-list-panel">
        <div class="document-group-panel-header">
          <span>{{ t('documentGroup.title') }}</span>
          <SyButton size="small" @click="addGroup">{{ t('documentGroup.newGroup') }}</SyButton>
        </div>

        <div v-if="localGroups.length === 0" class="document-group-empty">
          {{ t('documentGroup.emptyGroups') }}
        </div>
        <div v-else class="document-group-list">
          <button
            v-for="group in localGroups"
            :key="group.id"
            type="button"
            class="document-group-item"
            :class="{ active: group.id === selectedGroupId }"
            @click="selectedGroupId = group.id"
          >
            <div class="document-group-item-main">
              <button
                type="button"
                class="goal-emoji-btn ariaLabel"
                :aria-label="t('documentGroup.switchGroupIcon')"
                @click.stop="openGroupEmojiPicker(group.id, $event)"
              >
                <EmojiIcon class="goal-emoji-display" :value="group.emoji" fallback="📁" />
              </button>
              <SyInput
                class="document-group-name-input"
                :model-value="group.name"
                :placeholder="t('documentGroup.groupNamePlaceholder')"
                @update:model-value="updateGroupName(group.id, $event)"
              />
              <span class="document-group-count">{{ group.members.length }}</span>
              <button
                type="button"
                class="document-group-delete ariaLabel"
                :aria-label="t('documentGroup.deleteGroup')"
               
                @click.stop="removeGroup(group.id)"
              >
                <Icon name="trash" width="16" height="16" />
              </button>
            </div>
          </button>
        </div>
      </div>

      <div class="document-group-panel document-list-panel">
        <div class="document-group-panel-header">
          <div class="document-group-panel-header-main">
            <span>{{ t('documentGroup.documents') }}</span>
            <span v-if="selectedGroup" class="document-group-current">{{ selectedGroup.name || t('documentGroup.untitledGroup') }}</span>
          </div>
          <button
            type="button"
            class="document-panel-refresh ariaLabel"
            :class="{ 'is-refreshing': documentsRefreshing }"
           
            :aria-label="t('taskScopeDialog.refreshDocuments')"
            :disabled="documentsRefreshing"
            @click.stop="refreshDocuments"
          >
            <Icon name="refresh" width="14" height="14" class="refresh-icon" />
          </button>
        </div>

        <div v-if="!selectedGroup" class="document-group-empty">
          {{ t('documentGroup.selectGroupFirst') }}
        </div>
        <template v-else>
          <SyInput
            class="document-group-search-input"
            :model-value="documentSearch"
            :placeholder="t('documentGroup.searchDocuments')"
            @update:model-value="documentSearch = $event"
          />
          <div v-if="documentTreeLoading" class="document-group-empty">
            {{ t('taskManager.loading') }}
          </div>
          <div v-else-if="visibleDocuments.length === 0" class="document-group-empty">
            {{ t('documentGroup.noDocuments') }}
          </div>
          <div v-else class="document-checkbox-list">
            <div
              v-for="notebook in documentTreeGroups"
              :key="notebook.key"
              class="document-notebook-card"
            >
              <div
                v-for="row in notebook.rows"
                :key="row.key"
                class="document-tree-row"
                :class="[`document-tree-row--${row.type}`, { selected: row.type === 'document' && isDocumentSelected(row.document) }]"
                :style="{ '--document-tree-depth': row.depth }"
              >
                <template v-if="row.type === 'notebook'">
                  <button
                    type="button"
                    class="document-tree-expand"
                    :class="{ expanded: isNotebookExpanded(row.notebookId) }"
                    @click.stop="toggleNotebookExpanded(row.notebookId)"
                  >
                    <Icon name="chevronRight" width="14" height="14" />
                  </button>
                  <label class="document-tree-notebook-item">
                    <span :class="['day-checkbox', { completed: isNotebookFullyChecked(row.notebookId), partial: hasNotebookPartialSelection(row.notebookId) }]">
                      <span v-if="hasNotebookPartialSelection(row.notebookId)" class="day-checkbox-count">
                        {{ getNotebookCheckedDocumentCount(row.notebookId) }}
                      </span>
                      <Icon
                        v-else
                        :name="isNotebookFullyChecked(row.notebookId) ? 'squareCheck' : 'square'"
                        :completed="isNotebookFullyChecked(row.notebookId)"
                        class="day-checkbox-icon"
                      />
                    </span>
                    <span class="document-tree-notebook-name">{{ row.name }}</span>
                    <input
                      class="document-checkbox-input"
                      type="checkbox"
                      :checked="isNotebookFullyChecked(row.notebookId)"
                      @change="toggleNotebookMembership(row.notebookId, ($event.target as HTMLInputElement).checked)"
                    >
                  </label>
                </template>
                <template v-else>
                  <button
                    v-if="row.hasChildren"
                    type="button"
                    class="document-tree-expand"
                    :class="{ expanded: isDocumentExpanded(row.document) }"
                    @click.stop="toggleDocumentExpanded(row.document)"
                  >
                    <Icon name="chevronRight" width="14" height="14" />
                  </button>
                  <span v-else class="document-tree-expand-placeholder"></span>
                  <label class="document-checkbox-item document-tree-document-item">
                    <span :class="['day-checkbox', { completed: isDocumentFullyChecked(row.document), partial: hasDocumentPartialSelection(row.document) }]">
                      <span v-if="hasDocumentPartialSelection(row.document)" class="day-checkbox-count">
                        {{ getDocumentCheckedDescendantCount(row.document) }}
                      </span>
                      <Icon
                        v-else
                        :name="isDocumentFullyChecked(row.document) ? 'squareCheck' : 'square'"
                        :completed="isDocumentFullyChecked(row.document)"
                        class="day-checkbox-icon"
                      />
                    </span>
                    <span class="document-checkbox-text">
                      <span class="document-item-title-row">
                        <span class="document-checkbox-name">{{ row.document.name }}</span>
                        <span v-if="getDocumentGroupBadges(row.document).length > 0" class="document-membership-badges">
                          <span
                            v-for="group in getDocumentGroupBadges(row.document)"
                            :key="`document-group:${group.id}`"
                            class="document-membership-badge ariaLabel"
                            :aria-label="group.name || t('documentGroup.untitledGroup')"
                          >
                            <EmojiIcon v-if="group.emoji" class="document-membership-badge-emoji" :value="group.emoji" />
                            {{ group.name || t('documentGroup.untitledGroup') }}
                          </span>
                        </span>
                      </span>
                    </span>
                    <input
                      class="document-checkbox-input"
                      type="checkbox"
                      :checked="isDocumentFullyChecked(row.document)"
                      @change="toggleDocumentMembership(row.document, ($event.target as HTMLInputElement).checked)"
                    >
                  </label>
                </template>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { openEmoji } from 'siyuan';
import EmojiIcon from '@/components/EmojiIcon.vue';
import Icon from '@/components/Icon.vue';
import SyButton from '@/components/SiyuanTheme/SyButton.vue';
import SyInput from '@/components/SiyuanTheme/SyInput.vue';
import type { DocumentGroup } from '@/documentGroupRepository';
import { useI18n } from '@/composables/useI18n';
import { listDocsByPath } from '@/api';

interface DocumentGroupManagerDocument {
  id: string;
  name: string;
  notebookId: string;
  notebookName: string;
  path?: string;
  parentId?: string;
  storagePath?: string;
}

type DocumentTreeRow =
  | { type: 'notebook'; key: string; depth: number; notebookId: string; name: string }
  | {
    type: 'document';
    key: string;
    depth: number;
    document: DocumentGroupManagerDocument;
    hasChildren: boolean;
  };

interface DocumentNotebookTreeGroup {
  key: string;
  rows: DocumentTreeRow[];
}

interface Props {
  groups: DocumentGroup[];
  documents: DocumentGroupManagerDocument[];
  allDocuments?: DocumentGroupManagerDocument[];
  documentsRefreshing?: boolean;
}

const props = defineProps<Props>();
const { t } = useI18n();
const documentsRefreshing = computed(() => props.documentsRefreshing === true);

const emit = defineEmits<{
  'update:groups': [groups: DocumentGroup[]];
  'refresh-documents': [];
}>();

const localGroups = ref<DocumentGroup[]>([]);
const selectedGroupId = ref('');
const documentSearch = ref('');
const expandedDocumentKeys = ref(new Set<string>());
const collapsedNotebookIds = ref(new Set<string>());
const documentTreeDocuments = ref<DocumentGroupManagerDocument[]>([]);
const documentTreeLoading = ref(true);
let documentTreeRequestId = 0;

function cloneGroups(groups: DocumentGroup[]): DocumentGroup[] {
  return (groups || []).map(group => ({
    ...group,
    members: Array.isArray(group.members) ? group.members.map(member => ({ ...member })) : [],
    excludedDocumentKeys: Array.isArray(group.excludedDocumentKeys) ? [...group.excludedDocumentKeys] : undefined
  }));
}

function generateGroupId(): string {
  return `document_group_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function syncLocalGroups(): void {
  const nextGroups = cloneGroups(props.groups || []);
  const hasSelected = nextGroups.some(group => group.id === selectedGroupId.value);
  localGroups.value = nextGroups;
  selectedGroupId.value = hasSelected ? selectedGroupId.value : nextGroups[0]?.id || '';
}

function emitGroups(nextGroups: DocumentGroup[]): void {
  const cloned = cloneGroups(nextGroups);
  localGroups.value = cloned;
  emit('update:groups', cloned);
}

const selectedGroup = computed(() =>
  localGroups.value.find(group => group.id === selectedGroupId.value) || null
);

const allDocuments = computed(() => {
  const documentsByKey = new Map<string, DocumentGroupManagerDocument>();
  const treeSource = documentTreeDocuments.value.length > 0
    ? documentTreeDocuments.value
    : (props.allDocuments || []);
  for (const document of [
    ...treeSource,
    ...(props.documents || [])
  ]) {
    const key = `${document.notebookId}:${document.id}`;
    const existing = documentsByKey.get(key);
    documentsByKey.set(key, {
      ...existing,
      ...document,
      path: document.path || existing?.path,
      parentId: document.parentId || existing?.parentId,
      storagePath: document.storagePath || existing?.storagePath
    });
  }

  return Array.from(documentsByKey.values());
});

interface ListedDocument {
  id?: string;
  name?: string;
  path?: string;
  subFileCount?: number;
}

async function loadDocumentTreeFromFiletreeApi(): Promise<boolean> {
  const requestId = ++documentTreeRequestId;
  const notebookNameById = new Map<string, string>();
  for (const document of [...(props.allDocuments || []), ...(props.documents || [])]) {
    if (document.notebookId && document.notebookName) notebookNameById.set(document.notebookId, document.notebookName);
  }
  const notebookIds = Array.from(new Set((props.documents || [])
    .map(document => document.notebookId?.trim())
    .filter((id): id is string => Boolean(id))));
  if (notebookIds.length === 0) {
    documentTreeDocuments.value = [];
    documentTreeLoading.value = false;
    return true;
  }

  documentTreeLoading.value = true;
  try {
    const documentsByKey = new Map<string, DocumentGroupManagerDocument>();
    const loadBranch = async (notebookId: string, path: string, parentId?: string): Promise<void> => {
      const response = await listDocsByPath(notebookId, path);
      const files = response && typeof response === 'object' && Array.isArray((response as { files?: unknown }).files)
        ? (response as { files: ListedDocument[] }).files
        : null;
      if (!files) throw new Error('Unexpected listDocsByPath response');
      await Promise.all(files.map(async file => {
        const id = typeof file.id === 'string' ? file.id.trim() : '';
        const documentPath = typeof file.path === 'string' ? file.path.trim() : '';
        if (!id || !documentPath) return;
        documentsByKey.set(`${notebookId}:${id}`, {
          id,
          name: typeof file.name === 'string' && file.name.trim() ? file.name.trim() : id,
          notebookId,
          notebookName: notebookNameById.get(notebookId) || notebookId,
          parentId,
          storagePath: documentPath
        });
        if (Number(file.subFileCount) > 0) await loadBranch(notebookId, documentPath, id);
      }));
    };
    await Promise.all(notebookIds.map(notebookId => loadBranch(notebookId, '/')));
    if (requestId !== documentTreeRequestId) return false;
    documentTreeDocuments.value = Array.from(documentsByKey.values());
    synchronizeDescendantMemberships();
    return true;
  } catch (error) {
    if (requestId === documentTreeRequestId) {
      console.warn('[DocumentGroups] listDocsByPath is unavailable; using supplied document data', error);
      documentTreeDocuments.value = [];
    }
    return false;
  } finally {
    if (requestId === documentTreeRequestId) documentTreeLoading.value = false;
  }
}

async function refreshDocumentTree(): Promise<void> {
  await loadDocumentTreeFromFiletreeApi();
}

// A task in the notebook root uses the notebook-level document as its root.
// It is not a separate document entry in the selection tree.
const notebookLevelDocumentKeys = computed(() => new Set(
  (props.documents || [])
    .filter(document => document.name === document.notebookName)
    .map(getDocumentKey)
));

function refreshDocuments(): void {
  emit('refresh-documents');
}

const visibleDocuments = computed(() => {
  const keyword = documentSearch.value.trim().toLocaleLowerCase();
  const matchesSearch = (document: DocumentGroupManagerDocument): boolean => !keyword
    || `${document.name} ${document.notebookName} ${document.path || ''}`.toLocaleLowerCase().includes(keyword);

  const documentsByPath = new Map<string, DocumentGroupManagerDocument>();
  const documentsByKey = new Map<string, DocumentGroupManagerDocument>();
  for (const document of allDocuments.value) {
    const path = normalizeDocumentPath(document.path);
    if (path) documentsByPath.set(`${document.notebookId}:${path}`, document);
    documentsByKey.set(getDocumentKey(document), document);
  }

  const visibleKeys = new Set<string>();
  const addWithAncestors = (document: DocumentGroupManagerDocument): void => {
    let current: DocumentGroupManagerDocument | undefined = document;
    while (current) {
      const key = getDocumentKey(current);
      if (notebookLevelDocumentKeys.value.has(key)) break;
      if (visibleKeys.has(key)) break;
      visibleKeys.add(key);
      const parentKey = getDocumentParentKey(current, documentsByPath, documentsByKey);
      current = parentKey ? documentsByKey.get(parentKey) : undefined;
    }
  };

  const taskDocumentKeys = new Set((props.documents || []).map(getDocumentKey));
  // Retain task documents and their ancestors. Branches with no task at any
  // level are intentionally excluded from both display and group membership.
  for (const document of allDocuments.value) {
    if (notebookLevelDocumentKeys.value.has(getDocumentKey(document))) continue;
    if (taskDocumentKeys.has(getDocumentKey(document)) && matchesSearch(document)) {
      addWithAncestors(document);
    }
  }
  return allDocuments.value.filter(document => visibleKeys.has(getDocumentKey(document)));
});

function getDocumentKey(document: DocumentGroupManagerDocument): string {
  return `${document.notebookId}:${document.id}`;
}

function normalizeDocumentPath(path: string | undefined): string {
  return (path || '').trim().replace(/\\/g, '/').replace(/\/+$/, '');
}

function getDocumentParentKey(
  document: DocumentGroupManagerDocument,
  documentsByPath: Map<string, DocumentGroupManagerDocument>,
  documentsByKey?: Map<string, DocumentGroupManagerDocument>
): string | null {
  const parentId = document.parentId?.trim();
  if (parentId && parentId !== document.id) {
    const parentKey = `${document.notebookId}:${parentId}`;
    if (documentsByKey?.has(parentKey)) {
      return parentKey;
    }
  }
  const storagePathParts = (document.storagePath || '')
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
  const path = normalizeDocumentPath(document.path);
  const lastSeparator = path.lastIndexOf('/');
  if (lastSeparator <= 0) {
    return null;
  }
  const parent = documentsByPath.get(`${document.notebookId}:${path.slice(0, lastSeparator)}`);
  return parent ? getDocumentKey(parent) : null;
}

function synchronizeDescendantMemberships(): void {
  if (localGroups.value.length === 0) return;

  const documentsByPath = new Map<string, DocumentGroupManagerDocument>();
  const documentsByKey = new Map<string, DocumentGroupManagerDocument>();
  for (const document of allDocuments.value) {
    const path = normalizeDocumentPath(document.path);
    if (path) documentsByPath.set(`${document.notebookId}:${path}`, document);
    documentsByKey.set(getDocumentKey(document), document);
  }
  const selectableDocuments = visibleDocuments.value;
  const nextGroups = localGroups.value.map(group => {
    const memberKeys = new Set(group.members.map(member => `${member.notebookId}:${member.documentId}`));
    const excludedKeys = new Set(group.excludedDocumentKeys || []);
    const additions: DocumentGroup['members'] = [];
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
    return additions.length > 0 ? { ...group, members: [...group.members, ...additions] } : group;
  });
  if (nextGroups.some((group, index) => group.members.length !== localGroups.value[index]?.members.length)) {
    emitGroups(nextGroups);
  }
}

const documentTreeRows = computed<DocumentTreeRow[]>(() => {
  const byNotebook = new Map<string, DocumentGroupManagerDocument[]>();
  for (const document of visibleDocuments.value) {
    const documents = byNotebook.get(document.notebookId) || [];
    documents.push(document);
    byNotebook.set(document.notebookId, documents);
  }

  const rows: DocumentTreeRow[] = [];
  for (const [notebookId, documents] of [...byNotebook.entries()].sort(([, left], [, right]) =>
    (left[0]?.notebookName || '').localeCompare(right[0]?.notebookName || '', 'zh-CN')
  )) {
    rows.push({
      type: 'notebook',
      key: `notebook:${notebookId}`,
      depth: 0,
      notebookId,
      name: documents[0]?.notebookName || notebookId
    });
    if (!isNotebookExpanded(notebookId)) {
      continue;
    }

    const documentsByPath = new Map<string, DocumentGroupManagerDocument>();
    const documentsByKey = new Map<string, DocumentGroupManagerDocument>();
    const childrenByParentKey = new Map<string | null, DocumentGroupManagerDocument[]>();
    for (const document of documents) {
      const path = normalizeDocumentPath(document.path);
      if (path) {
        documentsByPath.set(`${document.notebookId}:${path}`, document);
      }
      documentsByKey.set(getDocumentKey(document), document);
    }
    for (const document of documents) {
      const parentKey = getDocumentParentKey(document, documentsByPath, documentsByKey);
      const children = childrenByParentKey.get(parentKey) || [];
      children.push(document);
      childrenByParentKey.set(parentKey, children);
    }

    const appendDocuments = (parentKey: string | null, depth: number): void => {
      for (const document of (childrenByParentKey.get(parentKey) || []).sort((left, right) =>
        left.name.localeCompare(right.name, 'zh-CN')
      )) {
        const documentKey = getDocumentKey(document);
        const hasChildren = (childrenByParentKey.get(documentKey) || []).length > 0;
        rows.push({ type: 'document', key: documentKey, depth, document, hasChildren });
        if (isDocumentExpanded(document)) {
          appendDocuments(documentKey, depth + 1);
        }
      }
    };
    appendDocuments(null, 1);
  }
  return rows;
});

const documentTreeGroups = computed<DocumentNotebookTreeGroup[]>(() => {
  const groups: DocumentNotebookTreeGroup[] = [];
  for (const row of documentTreeRows.value) {
    if (row.type === 'notebook') {
      groups.push({ key: row.key, rows: [row] });
    } else if (groups.length > 0) {
      groups[groups.length - 1].rows.push(row);
    }
  }
  return groups;
});

function isDocumentExpanded(document: DocumentGroupManagerDocument): boolean {
  return expandedDocumentKeys.value.has(getDocumentKey(document));
}

function toggleDocumentExpanded(document: DocumentGroupManagerDocument): void {
  const key = getDocumentKey(document);
  const next = new Set(expandedDocumentKeys.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  expandedDocumentKeys.value = next;
}

function isNotebookExpanded(notebookId: string): boolean {
  return !collapsedNotebookIds.value.has(notebookId);
}

function toggleNotebookExpanded(notebookId: string): void {
  const next = new Set(collapsedNotebookIds.value);
  if (next.has(notebookId)) next.delete(notebookId);
  else next.add(notebookId);
  collapsedNotebookIds.value = next;
}

function updateGroupName(groupId: string, value: string): void {
  emitGroups(localGroups.value.map(group => (
    group.id === groupId
      ? { ...group, name: value }
      : group
  )));
}

function normalizeEmojiValue(value: string): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw || raw.includes('.') || raw.includes('/')) {
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

function updateGroupEmoji(groupId: string, value: string): void {
  const emoji = normalizeEmojiValue(value) || '📁';
  emitGroups(localGroups.value.map(group => (
    group.id === groupId ? { ...group, emoji } : group
  )));
}

function openGroupEmojiPicker(groupId: string, event: MouseEvent): void {
  selectedGroupId.value = groupId;
  const target = event.currentTarget as HTMLElement | null;
  const rect = target?.getBoundingClientRect();
  openEmoji({
    position: rect
      ? { x: Math.round(rect.left), y: Math.round(rect.bottom) }
      : { x: event.clientX, y: event.clientY },
    selectedCB: (emoji: string) => updateGroupEmoji(groupId, emoji),
    hideDynamicIcon: false,
    hideCustomIcon: false
  });
}

function addGroup(): void {
  const now = new Date().toISOString();
  const nextGroup: DocumentGroup = {
    id: generateGroupId(),
    name: t('documentGroup.newGroupDefaultName'),
    emoji: '📁',
    members: [],
    order: localGroups.value.length,
    createdAt: now,
    updatedAt: now
  };
  const nextGroups = [...localGroups.value, nextGroup];
  selectedGroupId.value = nextGroup.id;
  emitGroups(nextGroups);
}

function removeGroup(groupId: string): void {
  const group = localGroups.value.find(item => item.id === groupId) || null;
  if (!group) {
    return;
  }
  if (!confirm(`${t('documentGroup.confirmDeletePrefix')}“${group.name || t('documentGroup.untitledGroup')}”？`)) {
    return;
  }
  const nextGroups = localGroups.value.filter(item => item.id !== group.id);
  if (selectedGroupId.value === group.id) {
    selectedGroupId.value = nextGroups[0]?.id || '';
  }
  emitGroups(nextGroups);
}

function isDocumentSelected(document: DocumentGroupManagerDocument): boolean {
  const taskDocuments = getDocumentAndDescendants(document);
  return taskDocuments.length > 0 && taskDocuments.every(taskDocument =>
    selectedGroup.value?.members.some(member =>
      member.documentId === taskDocument.id && member.notebookId === taskDocument.notebookId
    ) === true
  );
}

function getDocumentGroupBadges(document: DocumentGroupManagerDocument): DocumentGroup[] {
  const selectedId = selectedGroupId.value;
  return localGroups.value.filter(group =>
    group.id !== selectedId
    && group.members.some(member =>
      member.documentId === document.id && member.notebookId === document.notebookId
    )
  );
}

function getNotebookDocuments(notebookId: string): DocumentGroupManagerDocument[] {
  return visibleDocuments.value.filter(document => document.notebookId === notebookId);
}

function isNotebookFullyChecked(notebookId: string): boolean {
  const documents = getNotebookDocuments(notebookId);
  return documents.length > 0 && documents.every(document => isDocumentSelected(document));
}

function getNotebookCheckedDocumentCount(notebookId: string): number {
  return getNotebookDocuments(notebookId).filter(document => isDocumentSelected(document)).length;
}

function hasNotebookPartialSelection(notebookId: string): boolean {
  const documents = getNotebookDocuments(notebookId);
  const selectedCount = getNotebookCheckedDocumentCount(notebookId);
  return selectedCount > 0 && selectedCount < documents.length;
}

function getDocumentAndDescendants(document: DocumentGroupManagerDocument): DocumentGroupManagerDocument[] {
  const documents = visibleDocuments.value.filter(candidate => candidate.notebookId === document.notebookId);
  const documentsByPath = new Map<string, DocumentGroupManagerDocument>();
  const documentsByKey = new Map<string, DocumentGroupManagerDocument>();
  const childrenByParentKey = new Map<string, DocumentGroupManagerDocument[]>();
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

  const descendants: DocumentGroupManagerDocument[] = [];
  const pending = [document];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) continue;
    const key = getDocumentKey(current);
    if (visited.has(key)) continue;
    visited.add(key);
    descendants.push(current);
    pending.push(...(childrenByParentKey.get(key) || []));
  }
  return descendants;
}

function getDocumentCheckedDescendantCount(document: DocumentGroupManagerDocument): number {
  return getDocumentAndDescendants(document)
    .filter(candidate => candidate.id !== document.id)
    .filter(candidate => isDocumentSelected(candidate)).length;
}

function isDocumentFullyChecked(document: DocumentGroupManagerDocument): boolean {
  const documents = getDocumentAndDescendants(document);
  return documents.length > 0 && documents.every(candidate => isDocumentSelected(candidate));
}

function hasDocumentPartialSelection(document: DocumentGroupManagerDocument): boolean {
  const descendants = getDocumentAndDescendants(document)
    .filter(candidate => candidate.id !== document.id);
  const selectedCount = descendants.filter(candidate => isDocumentSelected(candidate)).length;
  return selectedCount > 0 && selectedCount < descendants.length;
}

function toggleDocumentMembership(document: DocumentGroupManagerDocument, checked: boolean): void {
  const activeGroup = selectedGroup.value;
  if (!activeGroup) {
    return;
  }

  const documents = getDocumentAndDescendants(document);
  const memberKeys = new Set(documents.map(getDocumentKey));
  emitGroups(localGroups.value.map(group => {
    if (group.id !== activeGroup.id) {
      return group;
    }

    const members = group.members.filter(member =>
      !memberKeys.has(`${member.notebookId}:${member.documentId}`)
    );
    const excludedKeys = new Set(group.excludedDocumentKeys || []);
    for (const key of memberKeys) {
      if (checked) excludedKeys.delete(key);
      else excludedKeys.add(key);
    }
    if (checked) {
      members.push(...documents.map(item => ({
        documentId: item.id,
        notebookId: item.notebookId,
        name: item.name,
        path: item.path
      })));
    }
    return { ...group, members, excludedDocumentKeys: excludedKeys.size > 0 ? Array.from(excludedKeys) : undefined };
  }));
}

function toggleNotebookMembership(notebookId: string, checked: boolean): void {
  const activeGroup = selectedGroup.value;
  if (!activeGroup) {
    return;
  }
  const documents = getNotebookDocuments(notebookId);
  const documentKeys = new Set(documents.map(getDocumentKey));
  emitGroups(localGroups.value.map(group => {
    if (group.id !== activeGroup.id) {
      return group;
    }
    const members = group.members.filter(member =>
      !documentKeys.has(`${member.notebookId}:${member.documentId}`)
    );
    const excludedKeys = new Set(group.excludedDocumentKeys || []);
    for (const key of documentKeys) {
      if (checked) excludedKeys.delete(key);
      else excludedKeys.add(key);
    }
    if (checked) {
      members.push(...documents.map(document => ({
        documentId: document.id,
        notebookId: document.notebookId,
        name: document.name,
        path: document.path
      })));
    }
    return { ...group, members, excludedDocumentKeys: excludedKeys.size > 0 ? Array.from(excludedKeys) : undefined };
  }));
}

watch(
  () => props.groups,
  () => {
    syncLocalGroups();
  },
  { immediate: true, deep: true }
);

watch(
  [() => props.documents, () => props.allDocuments],
  () => {
    void refreshDocumentTree();
  },
  { immediate: true, deep: true }
);

</script>

<style scoped>
.document-group-panel-root {
  display: flex;
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

.document-group-body {
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(220px, 240px) minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  overflow: hidden;
  gap: 12px;
  margin: 0 12px;
}

.document-group-panel {
  height: calc(100% - 16px);
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 8px;
  border-radius: 10px;
  background-color: var(--Sv-theme-surface, var(--b3-theme-surface));
  overflow: hidden;
}

.document-group-panel-header {
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

.document-group-panel-header-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.group-list-panel .document-group-panel-header > button {
  background: #f98f7a;
  color: #fff;
  border: none;
  border-radius: 20px;
  padding: 4px 10px;
}

.document-group-current {
  min-width: 0;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 500;
  color: var(--b3-theme-on-surface);
}

.document-panel-refresh {
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

.document-panel-refresh:hover {
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
}

.document-panel-refresh:disabled {
  cursor: default;
  opacity: 0.75;
}

.document-panel-refresh .refresh-icon {
  width: 14px;
  height: 14px;
  fill: currentColor;
}

.document-panel-refresh.is-refreshing .refresh-icon {
  animation: document-panel-refresh-spin 0.8s linear infinite;
}

@keyframes document-panel-refresh-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.document-group-list,
.document-checkbox-list {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
}

.document-group-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.document-group-item {
  width: 100%;
  padding: 8px;
  border: none;
  border-radius: 10px;
  background: var(--b3-list-hover);
  cursor: pointer;
  text-align: left;
  box-sizing: border-box;
}

.document-group-item.active,.document-group-item:hover {
  background: var(--b3-theme-background);
  box-shadow: var(--pinch-shadow);
}

.document-group-item:focus-visible {
  outline: 2px solid var(--b3-theme-primary);
  outline-offset: 2px;
}

.document-group-item-main {
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

.document-group-name-input {
  flex: 1;
  min-width: 0;
}

.document-group-search-input {
  margin-bottom: 10px;
}

.document-group-count {
  min-width: 22px;
  text-align: center;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
}

.document-group-delete {
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

.document-group-delete:hover {
  background: var(--b3-list-hover);
}

.document-group-delete svg {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.document-checkbox-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 2px;
}

.document-notebook-card {
  padding: 6px;
  border-radius: 10px;
  background: var(--b3-theme-background);
  box-shadow: #0000000f 0 1px 5px;
}

.document-tree-row {
  --document-tree-indent: calc(var(--document-tree-depth) * 20px);
  display: flex;
  align-items: center;
  min-width: 0;
  padding-left: var(--document-tree-indent);
}

.document-tree-row--notebook {
  min-height: 26px;
  font-size: 13px;
  font-weight: 600;
  color: var(--b3-theme-on-background);
}

.document-tree-expand {
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

.document-tree-expand-placeholder {
  width: 24px;
  height: 24px;
  flex: 0 0 auto;
}

.document-tree-expand:hover,
.document-tree-notebook-item:hover {
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
}

.document-tree-expand svg {
  fill: currentColor;
  transition: transform 0.16s ease;
}

.document-tree-expand.expanded svg {
  transform: rotate(90deg);
}

.document-tree-notebook-item {
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

.document-tree-notebook-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.document-checkbox-item {
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

.document-tree-document-item {
  flex: 1;
  padding: 4px 6px;
}

.document-tree-document-item:hover {
  background: var(--b3-list-hover);
}

.document-checkbox-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  margin: 0;
  cursor: pointer;
}

.document-checkbox-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.document-item-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  width: 100%;
}

.document-checkbox-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--b3-theme-on-background);
}

.document-membership-badges {
  display: flex;
  flex: 0 1 55%;
  justify-content: flex-end;
  gap: 4px;
  min-width: 0;
  margin-left: auto;
  overflow: hidden;
  white-space: nowrap;
}

.document-membership-badge {
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

.document-membership-badge-emoji {
  flex: 0 0 auto;
  font-size: 10px;
  line-height: 1;
}

.document-checkbox-meta {
  font-size: 12px;
  color: var(--b3-theme-on-surface);
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
  box-sizing: border-box;
  background: #f98f7a;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  line-height: 14px;
  text-align: center;
}

.document-group-empty {
  flex: 1;
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

@media (max-width: 720px) {
  .document-group-body {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, auto) minmax(0, 1fr);
  }

  .group-list-panel {
    border-right: none;
    border-bottom: 1px solid var(--b3-border-color);
  }

  .group-list-panel,
  .document-list-panel {
    min-height: 0;
  }
}
</style>
