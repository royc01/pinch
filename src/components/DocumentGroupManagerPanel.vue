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
            @click.stop="emit('refresh-documents')"
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
          <div v-if="filteredDocuments.length === 0" class="document-group-empty">
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
                    <span :class="['day-checkbox', { completed: isNotebookFullyChecked(row.notebookId) }]">
                      <Icon
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
                    <span :class="['day-checkbox', { completed: isDocumentSelected(row.document) }]">
                      <Icon
                        :name="isDocumentSelected(row.document) ? 'squareCheck' : 'square'"
                        :completed="isDocumentSelected(row.document)"
                        class="day-checkbox-icon"
                      />
                    </span>
                    <span class="document-checkbox-text">
                      <span class="document-checkbox-name">{{ row.document.name }}</span>
                    </span>
                    <input
                      class="document-checkbox-input"
                      type="checkbox"
                      :checked="isDocumentSelected(row.document)"
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

interface DocumentGroupManagerDocument {
  id: string;
  name: string;
  notebookId: string;
  notebookName: string;
  path?: string;
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

function cloneGroups(groups: DocumentGroup[]): DocumentGroup[] {
  return (groups || []).map(group => ({
    ...group,
    members: Array.isArray(group.members) ? group.members.map(member => ({ ...member })) : []
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

const filteredDocuments = computed(() => {
  const keyword = documentSearch.value.trim().toLocaleLowerCase();
  return (props.documents || []).map(document => ({
    ...document,
    key: `${document.notebookId}:${document.id}`
  })).filter(document => {
    if (!keyword) {
      return true;
    }
    const haystack = `${document.name} ${document.notebookName} ${document.path || ''}`.toLocaleLowerCase();
    return haystack.includes(keyword);
  });
});

function getDocumentKey(document: DocumentGroupManagerDocument): string {
  return `${document.notebookId}:${document.id}`;
}

function normalizeDocumentPath(path: string | undefined): string {
  return (path || '').trim().replace(/\\/g, '/').replace(/\/+$/, '');
}

function getDocumentParentKey(
  document: DocumentGroupManagerDocument,
  documentsByPath: Map<string, DocumentGroupManagerDocument>
): string | null {
  const path = normalizeDocumentPath(document.path);
  const lastSeparator = path.lastIndexOf('/');
  if (lastSeparator <= 0) {
    return null;
  }
  const parent = documentsByPath.get(`${document.notebookId}:${path.slice(0, lastSeparator)}`);
  return parent ? getDocumentKey(parent) : null;
}

const documentTreeRows = computed<DocumentTreeRow[]>(() => {
  const byNotebook = new Map<string, DocumentGroupManagerDocument[]>();
  for (const document of filteredDocuments.value) {
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
    const childrenByParentKey = new Map<string | null, DocumentGroupManagerDocument[]>();
    for (const document of documents) {
      const path = normalizeDocumentPath(document.path);
      if (path) {
        documentsByPath.set(`${document.notebookId}:${path}`, document);
      }
    }
    for (const document of documents) {
      const parentKey = getDocumentParentKey(document, documentsByPath);
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
  return selectedGroup.value?.members.some(member =>
    member.documentId === document.id && member.notebookId === document.notebookId
  ) === true;
}

function getNotebookDocuments(notebookId: string): DocumentGroupManagerDocument[] {
  return (props.documents || []).filter(document => document.notebookId === notebookId);
}

function isNotebookFullyChecked(notebookId: string): boolean {
  const documents = getNotebookDocuments(notebookId);
  return documents.length > 0 && documents.every(document => isDocumentSelected(document));
}

function getDocumentAndDescendants(document: DocumentGroupManagerDocument): DocumentGroupManagerDocument[] {
  const documentPath = normalizeDocumentPath(document.path);
  return (props.documents || []).filter(candidate =>
    candidate.notebookId === document.notebookId
    && (
      candidate.id === document.id
      || (documentPath.length > 0 && normalizeDocumentPath(candidate.path).startsWith(`${documentPath}/`))
    )
  );
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
    if (checked) {
      members.push(...documents.map(item => ({
        documentId: item.id,
        notebookId: item.notebookId,
        name: item.name,
        path: item.path
      })));
    }
    return { ...group, members };
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
    if (checked) {
      members.push(...documents.map(document => ({
        documentId: document.id,
        notebookId: document.notebookId,
        name: document.name,
        path: document.path
      })));
    }
    return { ...group, members };
  }));
}

watch(
  () => props.groups,
  () => {
    syncLocalGroups();
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
  grid-template-columns: minmax(200px, 220px) minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  overflow: hidden;
  gap: 12px;
  margin: 0 12px;
}

.document-group-panel {
  height: 100%;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 8px;
}


.group-list-panel,
.document-list-panel {
  overflow: hidden;
  background-color: var(--Sv-theme-surface, var(--b3-theme-surface));
  border-radius: 10px;
}

.document-group-panel-header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 32px;
  min-width: 0;
  margin-bottom: 6px;
  box-sizing: border-box;
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
  padding: 4px;
  border: none;
  border-radius: 10px;
  background: var(--b3-list-hover);
  cursor: pointer;
  text-align: left;
}

.document-group-item.active,.document-group-item:hover {
  background: var(--b3-theme-background);
  box-shadow: var(--pinch-shadow);
}

.document-group-item-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
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
  display: block;
  flex: 0 0 auto;
  min-width: 0;
  margin-bottom: 12px;
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
  min-height: 34px;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
}

.document-tree-row--document {
  gap: 4px;
}

.document-tree-expand {
  width: 24px;
  height: 30px;
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
  height: 30px;
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
  min-height: 30px;
  padding: 0 6px;
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
  padding: 10px 12px;
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
  position: relative;
}

.document-tree-document-item {
  flex: 1;
  padding: 7px 10px;
}

.document-tree-document-item:hover {
  background: var(--b3-list-hover);
}

.document-tree-row--document.selected .document-tree-document-item {
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

.document-checkbox-name {
  color: var(--b3-theme-on-background);
  word-break: break-word;
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

.document-group-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--b3-theme-on-surface);
  font-size: 13px;
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
