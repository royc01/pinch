<template>
  <div v-if="show" class="task-scope-overlay" @click.self="handleClose">
    <div class="task-scope-dialog" :class="{ 'with-document-groups': hasWideLayout }" @click.stop>
      <div class="task-scope-header">
        <div class="task-scope-title">{{ dialogTitle }}</div>
        <button v-if="!lockClose" type="button" class="icon-button" :title="t('close')" :aria-label="t('close')" @click="handleClose">
          <Icon name="close" width="14" height="14" class="icon" />
        </button>
      </div>

      <div class="task-scope-hint">
        {{ activeHint }}
      </div>

      <div v-if="showTabs" class="task-scope-tabs">
        <button
          v-if="showScopeTab"
          type="button"
          class="task-scope-tab"
          :class="{ active: activeTab === 'scope' }"
          @click="activeTab = 'scope'"
        >
          {{ t('scopeSettings') }}
        </button>
        <button
          v-if="hasDocumentGroupTab"
          type="button"
          class="task-scope-tab"
          :class="{ active: activeTab === 'document-groups' }"
          @click="activeTab = 'document-groups'"
        >
          {{ t('docGroups') }}
        </button>
        <button
          v-if="hasGoalTab"
          type="button"
          class="task-scope-tab"
          :class="{ active: activeTab === 'goals' }"
          @click="activeTab = 'goals'"
        >
          {{ t('goals') }}
        </button>
      </div>

      <div v-if="activeTab === 'scope'" class="task-scope-content scope-tab-content">
        <div class="task-scope-summary">
          {{ t('enabledNotebooksCount', { enabled: notebooks.length - localExcludedNotebookIds.length, total: notebooks.length }) }}
        </div>
        <div v-if="showExtra" class="task-scope-extra">
          <span class="task-scope-extra-label">{{ t('showCompletedTasks') }}</span>
          <SyCheckbox
            class="task-scope-toggle"
            :model-value="localShowCompletedTasks"
            @update:model-value="localShowCompletedTasks = $event"
          />
        </div>
        <div class="task-scope-list">
          <label
            v-for="notebook in notebooks"
            :key="notebook.id"
            class="task-scope-item"
          >
            <SyCheckbox
              class="task-scope-toggle"
              :model-value="isNotebookEnabled(notebook.id)"
              @update:model-value="toggleNotebookEnabled(notebook.id, $event)"
            />
            <span class="task-scope-name">{{ notebook.name }}</span>
          </label>

          <div v-if="notebooks.length === 0" class="task-scope-empty">
            {{ t('noNotebooksToManage') }}
          </div>
        </div>

        <div class="task-scope-auto-setting">
          <div class="task-scope-auto-item">
            <div class="task-scope-auto-main">
              <div class="task-scope-auto-title-row">
                <span class="task-scope-extra-label">{{ t('enableDateRecognition') }}</span>
                <SyButton
                  class="task-scope-inline-btn"
                  :disabled="globalDateRecognizing"
                  @click="handleGlobalRecognizeDate"
                >
                  {{ globalDateRecognizing ? t('recognizing') : t('globalRecognize') }}
                </SyButton>
              </div>
              <div class="task-scope-auto-desc">
                {{ t('autoRecognizeHint') }}
              </div>
            </div>
            <SyCheckbox
              class="task-scope-toggle"
              :model-value="localAutoRecognizeTaskDate"
              @update:model-value="localAutoRecognizeTaskDate = $event"
            />
          </div>
          <div class="task-scope-auto-item">
            <span class="task-scope-extra-label">{{ t('taskCompletionSound') }}</span>
            <SyCheckbox
              class="task-scope-toggle"
              :model-value="localTaskCompletionSoundEnabled"
              @update:model-value="localTaskCompletionSoundEnabled = $event"
            />
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'document-groups'" class="task-scope-content document-groups-tab-content">
        <DocumentGroupManagerPanel
          :groups="localDocumentGroups"
          :documents="documentGroupDocuments"
          @update:groups="localDocumentGroups = $event"
        />
      </div>
      <div v-else-if="activeTab === 'goals'" class="task-scope-content goals-tab-content">
        <GoalManagerPanel
          :goals="localGoals"
          :documents="goalDocuments"
          @update:goals="localGoals = $event"
        />
      </div>

      <div class="task-scope-actions">
        <SyButton
          v-if="activeTab === 'scope' && showScopeTab"
          class="task-scope-btn plain"
          @click="clearExcluded"
        >
          {{ t('enableAll') }}
        </SyButton>
        <div
          v-else-if="activeTab === 'document-groups' && showDocumentGroupNotebookPathToggle"
          class="task-scope-action-setting"
        >
          <span class="task-scope-extra-label">{{ t('showDocNotebookPath') }}</span>
          <SyCheckbox
            class="task-scope-toggle"
            :model-value="localShowDocumentGroupNotebookPath"
            @update:model-value="localShowDocumentGroupNotebookPath = $event"
          />
        </div>
        <SyButton class="task-scope-btn confirm" @click="save">{{ confirmText || t('save') }}</SyButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { t } from '@/utils/i18n';
import { computed, ref, watch } from 'vue';
import Icon from '@/components/Icon.vue';
import SyButton from '@/components/SiyuanTheme/SyButton.vue';
import SyCheckbox from '@/components/SiyuanTheme/SyCheckbox.vue';
import DocumentGroupManagerPanel from '@/components/DocumentGroupManagerPanel.vue';
import GoalManagerPanel from '@/components/GoalManagerPanel.vue';
import type { DocumentGroup } from '@/documentGroupRepository';
import type { Goal } from '@/goalRepository';
import type { GoalScopeDocument } from '@/utils/goalScopeDocuments';
import { normalizeNotebookIds } from '@/utils/taskViewShared';

interface NotebookItem {
  id: string;
  name: string;
}

interface DocumentGroupScopeDocument {
  id: string;
  name: string;
  notebookId: string;
  notebookName: string;
  path?: string;
}

export interface TaskScopeDialogSavePayload {
  excludedNotebookIds: string[];
  showCompletedTasks: boolean;
  autoRecognizeTaskDate: boolean;
  taskCompletionSoundEnabled: boolean;
  showDocumentGroupNotebookPath: boolean;
  documentGroups: DocumentGroup[];
  goals: Goal[];
}

interface Props {
  show: boolean;
  notebooks: NotebookItem[];
  excludedNotebookIds: string[];
  showCompletedTasks?: boolean;
  autoRecognizeTaskDate?: boolean;
  globalDateRecognizing?: boolean;
  taskCompletionSoundEnabled?: boolean;
  lockClose?: boolean;
  showExtra?: boolean;
  title?: string;
  hint?: string;
  confirmText?: string;
  initialTab?: 'scope' | 'document-groups' | 'goals';
  documentGroups?: DocumentGroup[];
  documentGroupDocuments?: DocumentGroupScopeDocument[];
  showDocumentGroupNotebookPath?: boolean;
  showDocumentGroupNotebookPathToggle?: boolean;
  showScopeTab?: boolean;
  goals?: Goal[];
  goalDocuments?: GoalScopeDocument[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  save: [payload: TaskScopeDialogSavePayload];
  'global-recognize-date': [];
}>();

const localExcludedNotebookIds = ref<string[]>([]);
const localShowCompletedTasks = ref(true);
const localAutoRecognizeTaskDate = ref(false);
const localTaskCompletionSoundEnabled = ref(true);
const localShowDocumentGroupNotebookPath = ref(true);
const localDocumentGroups = ref<DocumentGroup[]>([]);
const localGoals = ref<Goal[]>([]);
const activeTab = ref<'scope' | 'document-groups' | 'goals'>('scope');
const lockClose = computed(() => props.lockClose === true);
const showExtra = computed(() => props.showExtra !== false);
const globalDateRecognizing = computed(() => props.globalDateRecognizing === true);
const showScopeTab = computed(() => props.showScopeTab !== false);
const showDocumentGroupNotebookPathToggle = computed(() => props.showDocumentGroupNotebookPathToggle !== false);
const dialogTitle = computed(() => props.title || t('defaultScopeDialogTitle'));
const dialogHint = computed(() => props.hint || t('defaultScopeDialogHint'));
const confirmText = computed(() => props.confirmText || t('save'));
const hasDocumentGroupTab = computed(() =>
  Array.isArray(props.documentGroups) && Array.isArray(props.documentGroupDocuments)
);
const hasGoalTab = computed(() =>
  Array.isArray(props.goals) && Array.isArray(props.goalDocuments)
);
const hasWideLayout = computed(() => hasDocumentGroupTab.value || hasGoalTab.value);
const availableTabs = computed<Array<'scope' | 'document-groups' | 'goals'>>(() => {
  const tabs: Array<'scope' | 'document-groups' | 'goals'> = [];
  if (showScopeTab.value) {
    tabs.push('scope');
  }
  if (hasDocumentGroupTab.value) {
    tabs.push('document-groups');
  }
  if (hasGoalTab.value) {
    tabs.push('goals');
  }
  return tabs;
});
const showTabs = computed(() => availableTabs.value.length > 1);
const documentGroupDocuments = computed(() => props.documentGroupDocuments || []);
const goalDocuments = computed(() => props.goalDocuments || []);
const activeHint = computed(() =>
  activeTab.value === 'scope'
    ? dialogHint.value
    : activeTab.value === 'document-groups'
      ? t('docGroupHint')
      : t('goalHint')
);

function cloneDocumentGroups(groups: DocumentGroup[]): DocumentGroup[] {
  return (groups || []).map(group => ({
    ...group,
    members: Array.isArray(group.members) ? group.members.map(member => ({ ...member })) : []
  }));
}

function cloneGoals(goals: Goal[]): Goal[] {
  return (goals || []).map(goal => ({
    ...goal,
    members: Array.isArray(goal.members) ? goal.members.map(member => ({ ...member })) : []
  }));
}

function resolveInitialTab(): 'scope' | 'document-groups' | 'goals' {
  const requestedTab = props.initialTab;
  if (requestedTab && availableTabs.value.includes(requestedTab)) {
    return requestedTab;
  }
  return availableTabs.value[0] || 'scope';
}

function syncLocalSelection(): void {
  const visibleNotebookIds = new Set(props.notebooks.map(notebook => notebook.id));
  localExcludedNotebookIds.value = normalizeNotebookIds(props.excludedNotebookIds).filter(id => visibleNotebookIds.has(id));
  localShowCompletedTasks.value = props.showCompletedTasks !== false;
  localAutoRecognizeTaskDate.value = props.autoRecognizeTaskDate === true;
  localTaskCompletionSoundEnabled.value = props.taskCompletionSoundEnabled !== false;
  localShowDocumentGroupNotebookPath.value = props.showDocumentGroupNotebookPath !== false;
  localDocumentGroups.value = cloneDocumentGroups(props.documentGroups || []);
  localGoals.value = cloneGoals(props.goals || []);
  activeTab.value = resolveInitialTab();
}

function isNotebookEnabled(notebookId: string): boolean {
  return !localExcludedNotebookIds.value.includes(notebookId);
}

function toggleNotebookEnabled(notebookId: string, enabled: boolean): void {
  const current = new Set(localExcludedNotebookIds.value);
  if (enabled) {
    current.delete(notebookId);
  } else {
    current.add(notebookId);
  }
  localExcludedNotebookIds.value = Array.from(current);
}

function clearExcluded(): void {
  localExcludedNotebookIds.value = [];
}

function handleGlobalRecognizeDate(): void {
  if (globalDateRecognizing.value) {
    return;
  }
  emit('global-recognize-date');
}

function handleClose(): void {
  if (lockClose.value) {
    return;
  }
  emit('close');
}

function save(): void {
  emit('save', {
    excludedNotebookIds: normalizeNotebookIds(localExcludedNotebookIds.value),
    showCompletedTasks: localShowCompletedTasks.value,
    autoRecognizeTaskDate: localAutoRecognizeTaskDate.value,
    taskCompletionSoundEnabled: localTaskCompletionSoundEnabled.value,
    showDocumentGroupNotebookPath: localShowDocumentGroupNotebookPath.value,
    documentGroups: cloneDocumentGroups(localDocumentGroups.value),
    goals: cloneGoals(localGoals.value)
  });
}

watch(
  [
    () => props.show,
    () => props.excludedNotebookIds,
    () => props.notebooks,
    () => props.showCompletedTasks,
    () => props.autoRecognizeTaskDate,
    () => props.taskCompletionSoundEnabled,
    () => props.showDocumentGroupNotebookPath,
    () => props.showScopeTab,
    () => props.initialTab,
    () => props.documentGroups,
    () => props.goals
  ],
  ([show]) => {
    if (show) {
      syncLocalSelection();
    }
  },
  { immediate: true, deep: true }
);
</script>

<style scoped>
.task-scope-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.task-scope-dialog {
  width: min(460px, calc(100% - 24px));
  max-height: min(70vh, 520px);
  display: flex;
  flex-direction: column;
  background: var(--b3-theme-background);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  border: 1px solid var(--b3-border-color);
}

.task-scope-dialog.with-document-groups {
  width: min(640px, calc(100% - 24px));
  height: min(80vh, 600px);
  max-height: min(80vh, 600px);
  overflow: hidden;
}

.task-scope-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
}

.task-scope-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--b3-theme-on-background);
}

.task-scope-hint {
  padding: 12px 14px 2px 14px;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
}

.task-scope-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 10px 14px 4px 14px;
  scrollbar-width: none;
  -ms-overflow-style: none;
  min-width: 0;
}

.task-scope-tabs::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.task-scope-tab {
  flex: 0 0 auto;
  border: 1px solid transparent;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.task-scope-tab:hover {
  background: var(--b3-theme-background);
  border-color: var(--b3-border-color);
}

.task-scope-tab.active {
  background: var(--b3-theme-on-background);
  color: var(--b3-theme-background);
}

.task-scope-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.scope-tab-content {
  padding-top: 6px;
}

.document-groups-tab-content {
  padding-top: 8px;
  min-width: 0;
  overflow: hidden;
}

.goals-tab-content {
  padding-top: 8px;
  min-width: 0;
  overflow: hidden;
}

.task-scope-summary {
  padding: 0 14px 8px 14px;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  opacity: 0.75;
}

.task-scope-extra {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px 10px 14px;
  border-bottom: 1px solid var(--b3-border-color);
}

.task-scope-auto-setting {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--b3-border-color);
}

.task-scope-auto-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 14px;
}

.task-scope-auto-item + .task-scope-auto-item {
  border-top: 1px solid var(--b3-border-color);
}

.task-scope-auto-main {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.task-scope-auto-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
}

.task-scope-extra-label {
  font-size: 13px;
  color: var(--b3-theme-on-background);
}

.task-scope-auto-desc {
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  opacity: 0.78;
  line-height: 1.45;
}

.task-scope-inline-btn {
  font-size: 12px;
  line-height: 1;
  border: 1px solid var(--b3-border-color);
  border-radius: 999px;
  padding: 4px 10px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  cursor: pointer;
  white-space: nowrap;
}

.task-scope-inline-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.task-scope-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 14px 12px 14px;
}

.task-scope-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--b3-theme-on-background);
  padding: 6px 0;
  cursor: pointer;
}

.task-scope-toggle {
  flex: 0 0 auto;
}

.task-scope-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-scope-empty {
  font-size: 13px;
  color: var(--b3-theme-on-surface);
  opacity: 0.8;
  padding: 8px 0;
}

.task-scope-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 12px 14px;
}

.task-scope-action-setting {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  min-width: 0;
}

.task-scope-btn.plain {
  background: var(--b3-list-hover);
  border: none;
  border-radius: 20px;
  padding: 4px 10px;
}

.task-scope-btn.confirm {
  background: #f98f7a;
  color: #fff;
  border: none;
  border-radius: 20px;
  padding: 4px 10px;
}

.icon-button {
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-button .icon {
  width: 16px;
  height: 16px;
  color: var(--b3-theme-on-background);
  fill: var(--b3-theme-on-background);
}

.icon-button:hover {
  background-color: var(--b3-list-hover);
  border-radius: 4px;
}

@media (max-width: 900px) {
  .task-scope-dialog.with-document-groups {
    width: calc(100% - 20px);
    height: calc(100vh - 24px);
    max-height: calc(100vh - 24px);
  }
}
</style>
