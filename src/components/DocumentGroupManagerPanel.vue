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
            <label
              v-for="document in filteredDocuments"
              :key="document.key"
              class="document-checkbox-item"
            >
              <span
                :class="[
                  'day-checkbox',
                  { completed: isDocumentSelected(document) }
                ]"
              >
                <Icon
                  :name="isDocumentSelected(document) ? 'squareCheck' : 'square'"
                  :completed="isDocumentSelected(document)"
                  class="day-checkbox-icon"
                />
              </span>
              <span class="document-checkbox-text">
                <span class="document-checkbox-name">{{ document.name }}</span>
                <span class="document-checkbox-meta">{{ document.notebookName }}</span>
              </span>
              <input
                class="document-checkbox-input"
                type="checkbox"
                :checked="isDocumentSelected(document)"
                @change="toggleDocumentMembership(document, ($event.target as HTMLInputElement).checked)"
              >
            </label>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
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

function updateGroupName(groupId: string, value: string): void {
  emitGroups(localGroups.value.map(group => (
    group.id === groupId
      ? { ...group, name: value }
      : group
  )));
}

function addGroup(): void {
  const now = new Date().toISOString();
  const nextGroup: DocumentGroup = {
    id: generateGroupId(),
    name: t('documentGroup.newGroupDefaultName'),
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

function toggleDocumentMembership(document: DocumentGroupManagerDocument, checked: boolean): void {
  const activeGroup = selectedGroup.value;
  if (!activeGroup) {
    return;
  }

  const memberKey = `${document.notebookId}:${document.id}`;
  const nextGroups = localGroups.value.map(group => {
    const nextMembers = group.members.filter(member => `${member.notebookId}:${member.documentId}` !== memberKey);
    if (checked && group.id === activeGroup.id) {
      nextMembers.push({
        documentId: document.id,
        notebookId: document.notebookId,
        name: document.name,
        path: document.path
      });
    }
    return {
      ...group,
      members: nextMembers
    };
  });
  emitGroups(nextGroups);
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
  border: 1px solid var(--b3-border-color);
  border-radius: 10px;
  background: var(--b3-theme-background);
  cursor: pointer;
  text-align: left;
}

.document-group-item.active {
  border-color: #f98f7a;
}

.document-group-item-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
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
  gap: 6px;
  padding-right: 2px;
}

.document-checkbox-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--b3-theme-background);
  box-shadow: #0000000f 0 1px 5px;
  cursor: pointer;
  position: relative;
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
