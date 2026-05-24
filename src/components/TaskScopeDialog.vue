<template>
  <div v-if="show" class="task-scope-overlay" @click.self="handleClose">
    <div class="task-scope-dialog" :class="{ 'with-document-groups': hasWideLayout }" @click.stop>
      <div class="task-scope-header">
        <div class="task-scope-title">{{ dialogTitle }}</div>
        <button v-if="!lockClose" type="button" class="icon-button" :title="t('common.close')" :aria-label="t('common.close')" @click="handleClose">
          <Icon name="close" width="14" height="14" class="icon" />
        </button>
      </div>

      <div class="task-scope-hint">
        {{ activeHint }}
      </div>

      <div v-if="showTabs" class="task-scope-tabs">
        <button
          v-if="hasDisplayTab"
          type="button"
          class="task-scope-tab"
          :class="{ active: activeTab === 'display' }"
          @click="activeTab = 'display'"
        >
          {{ t('taskScopeDialog.displaySettings') }}
        </button>
        <button
          type="button"
          class="task-scope-tab"
          :class="{ active: activeTab === 'task-settings' }"
          @click="activeTab = 'task-settings'"
        >
          {{ t('taskScopeDialog.taskSettings') }}
        </button>
        <button
          v-if="hasGoalTab"
          type="button"
          class="task-scope-tab"
          :class="{ active: activeTab === 'goals' }"
          @click="activeTab = 'goals'"
        >
          {{ t('taskScopeDialog.goals') }}
        </button>
        <button
          v-if="hasDocumentGroupTab"
          type="button"
          class="task-scope-tab"
          :class="{ active: activeTab === 'document-groups' }"
          @click="activeTab = 'document-groups'"
        >
          {{ t('taskScopeDialog.documentGroups') }}
        </button>
        <button
          v-if="showScopeTab"
          type="button"
          class="task-scope-tab"
          :class="{ active: activeTab === 'scope' }"
          @click="activeTab = 'scope'"
        >
          {{ t('taskScopeDialog.scopeSettings') }}
        </button>
      </div>

      <div v-if="activeTab === 'scope'" class="task-scope-content scope-tab-content">
        <div class="task-scope-summary">
          {{ t('taskScopeDialog.enabledPrefix') }} {{ notebooks.length - localExcludedNotebookIds.length }} / {{ notebooks.length }}
        </div>
        <div v-if="showExtra" class="task-scope-extra">
          <span class="task-scope-extra-label">{{ t('taskScopeDialog.showCompletedTasks') }}</span>
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
            {{ t('taskScopeDialog.noNotebooks') }}
          </div>
        </div>

      </div>

      <div v-else-if="activeTab === 'task-settings'" class="task-scope-content task-settings-tab-content">
        <div class="task-scope-auto-setting">
          <div class="task-scope-auto-item">
            <div class="task-scope-auto-main">
              <div class="task-scope-auto-title-row">
                <span class="task-scope-extra-label">{{ t('taskScopeDialog.autoRecognizeDate') }}</span>
                <SyButton
                  class="task-scope-inline-btn"
                  :disabled="globalDateRecognizing"
                  @click="handleGlobalRecognizeDate"
                >
                  {{ globalDateRecognizing ? t('taskScopeDialog.recognizing') : t('taskScopeDialog.recognizeGlobally') }}
                </SyButton>
              </div>
              <div class="task-scope-auto-desc">
                {{ t('taskScopeDialog.autoRecognizeDateDesc') }}
              </div>
            </div>
            <SyCheckbox
              class="task-scope-toggle"
              :model-value="localAutoRecognizeTaskDate"
              @update:model-value="localAutoRecognizeTaskDate = $event"
            />
          </div>
          <div class="task-scope-auto-item">
            <span class="task-scope-extra-label">{{ t('taskScopeDialog.taskCompletionSound') }}</span>
            <SyCheckbox
              class="task-scope-toggle"
              :model-value="localTaskCompletionSoundEnabled"
              @update:model-value="localTaskCompletionSoundEnabled = $event"
            />
          </div>
          <details class="task-scope-keyword-settings">
            <summary class="task-scope-keyword-summary">
              {{ t('taskScopeDialog.dateRecognitionKeywords') }}
            </summary>
            <div class="task-scope-keyword-desc">
              {{ t('taskScopeDialog.dateRecognitionKeywordsDesc') }}
            </div>
            <label class="task-scope-keyword-field">
              <span>{{ t('taskScopeDialog.startKeywords') }}</span>
              <textarea
                v-model="localStartKeywordsText"
                class="task-scope-keyword-textarea"
                :placeholder="t('taskScopeDialog.startKeywordsPlaceholder')"
                rows="2"
              />
            </label>
            <label class="task-scope-keyword-field">
              <span>{{ t('taskScopeDialog.dueKeywords') }}</span>
              <textarea
                v-model="localDueKeywordsText"
                class="task-scope-keyword-textarea"
                :placeholder="t('taskScopeDialog.dueKeywordsPlaceholder')"
                rows="2"
              />
            </label>
            <label class="task-scope-keyword-field">
              <span>{{ t('taskScopeDialog.rangeKeywords') }}</span>
              <textarea
                v-model="localRangeKeywordsText"
                class="task-scope-keyword-textarea"
                :placeholder="t('taskScopeDialog.rangeKeywordsPlaceholder')"
                rows="2"
              />
            </label>
            <label class="task-scope-keyword-field">
              <span>{{ t('taskScopeDialog.afternoonKeywords') }}</span>
              <textarea
                v-model="localAfternoonKeywordsText"
                class="task-scope-keyword-textarea"
                :placeholder="t('taskScopeDialog.afternoonKeywordsPlaceholder')"
                rows="2"
              />
            </label>
          </details>
        </div>

        <div class="task-scope-display-section">
          <div class="task-scope-display-title">{{ t('taskScopeDialog.taskCreateSettings') }}</div>
          <div class="task-scope-display-item">
            <span class="task-scope-name">{{ t('taskScopeDialog.defaultTaskCreateTarget') }}</span>
            <SySelect
              v-model="localDefaultTaskCreateTarget"
              class="task-scope-setting-select"
              :options="defaultTaskCreateTargetOptions"
            />
          </div>
          <div class="task-scope-display-item">
            <span class="task-scope-name">{{ t('taskScopeDialog.defaultTaskCreateNotebook') }}</span>
            <SySelect
              v-model="localDefaultTaskCreateNotebook"
              class="task-scope-setting-select"
              :options="defaultTaskCreateNotebookOptions"
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
      <div v-else-if="activeTab === 'display'" class="task-scope-content display-tab-content">
        <div class="task-scope-display-section view-switcher-section">
          <div class="task-scope-display-title">{{ t('taskScopeDialog.viewSwitcherOptions') }}</div>
          <div class="task-scope-display-grid">
            <label
              v-for="option in taskViewOptions"
              :key="option.id"
              class="task-scope-display-item"
            >
              <span class="task-scope-name">{{ option.label }}</span>
              <SyCheckbox
                class="task-scope-toggle"
                :model-value="isTaskViewVisible(option.id)"
                @update:model-value="toggleTaskViewVisible(option.id, $event)"
              />
            </label>
          </div>
        </div>
        <div class="task-scope-display-section">
          <div class="task-scope-display-title">{{ t('taskScopeDialog.sidebarSections') }}</div>
          <div
            v-for="(section, index) in orderedSidebarSections"
            :key="section.id"
            class="task-scope-display-item sortable"
          >
            <span class="task-scope-name">{{ section.label }}</span>
            <div class="task-scope-display-controls">
              <button
                type="button"
                class="task-scope-order-btn up"
                :title="t('taskScopeDialog.moveUp')"
                :aria-label="t('taskScopeDialog.moveUp')"
                :disabled="index === 0"
                @click="moveSidebarSection(section.id, -1)"
              >
                <Icon name="arrowDown" width="14" height="14" class="icon" />
              </button>
              <button
                type="button"
                class="task-scope-order-btn"
                :title="t('taskScopeDialog.moveDown')"
                :aria-label="t('taskScopeDialog.moveDown')"
                :disabled="index === orderedSidebarSections.length - 1"
                @click="moveSidebarSection(section.id, 1)"
              >
                <Icon name="arrowDown" width="14" height="14" class="icon" />
              </button>
              <SyCheckbox
                class="task-scope-toggle"
                :model-value="isSidebarSectionVisible(section.id)"
                @update:model-value="toggleSidebarSectionVisible(section.id, $event)"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="task-scope-actions">
        <SyButton
          v-if="activeTab === 'scope' && showScopeTab"
          class="task-scope-btn plain"
          @click="clearExcluded"
        >
          {{ t('taskScopeDialog.enableAll') }}
        </SyButton>
        <div
          v-else-if="activeTab === 'document-groups' && showDocumentGroupNotebookPathToggle"
          class="task-scope-action-setting"
        >
          <span class="task-scope-extra-label">{{ t('taskScopeDialog.showDocumentNotebookPath') }}</span>
          <SyCheckbox
            class="task-scope-toggle"
            :model-value="localShowDocumentGroupNotebookPath"
            @update:model-value="localShowDocumentGroupNotebookPath = $event"
          />
        </div>
        <SyButton class="task-scope-btn confirm" @click="save">{{ confirmText || t('common.save') }}</SyButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Icon from '@/components/Icon.vue';
import SyButton from '@/components/SiyuanTheme/SyButton.vue';
import SyCheckbox from '@/components/SiyuanTheme/SyCheckbox.vue';
import SySelect from '@/components/SiyuanTheme/SySelect.vue';
import DocumentGroupManagerPanel from '@/components/DocumentGroupManagerPanel.vue';
import GoalManagerPanel from '@/components/GoalManagerPanel.vue';
import type { DocumentGroup } from '@/documentGroupRepository';
import type { Goal } from '@/goalRepository';
import type { GoalScopeDocument } from '@/utils/goalScopeDocuments';
import { normalizeNotebookIds } from '@/utils/taskViewShared';
import { useI18n } from '@/composables/useI18n';
import type { TaskDateKeywordConfig } from '@/utils/taskDateParser';

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
  dateRecognitionKeywords: TaskDateKeywordConfig;
  showDocumentGroupNotebookPath: boolean;
  documentGroups: DocumentGroup[];
  goals: Goal[];
  hiddenTaskViewIds: string[];
  hiddenSidebarSectionIds: string[];
  sidebarSectionOrder: string[];
  defaultTaskCreateTarget: string;
  defaultTaskCreateNotebook: string;
}

export interface TaskScopeDisplayOption {
  id: string;
  label: string;
}

interface Props {
  show: boolean;
  notebooks: NotebookItem[];
  excludedNotebookIds: string[];
  showCompletedTasks?: boolean;
  autoRecognizeTaskDate?: boolean;
  dateRecognitionKeywords?: TaskDateKeywordConfig;
  globalDateRecognizing?: boolean;
  taskCompletionSoundEnabled?: boolean;
  lockClose?: boolean;
  showExtra?: boolean;
  title?: string;
  hint?: string;
  confirmText?: string;
  initialTab?: TaskScopeDialogTab;
  documentGroups?: DocumentGroup[];
  documentGroupDocuments?: DocumentGroupScopeDocument[];
  showDocumentGroupNotebookPath?: boolean;
  showDocumentGroupNotebookPathToggle?: boolean;
  showScopeTab?: boolean;
  goals?: Goal[];
  goalDocuments?: GoalScopeDocument[];
  taskViewOptions?: TaskScopeDisplayOption[];
  hiddenTaskViewIds?: string[];
  sidebarSectionOptions?: TaskScopeDisplayOption[];
  hiddenSidebarSectionIds?: string[];
  sidebarSectionOrder?: string[];
  defaultTaskCreateTarget?: string;
  defaultTaskCreateNotebook?: string;
}

const props = defineProps<Props>();
const { t } = useI18n();
type TaskScopeDialogTab = 'scope' | 'task-settings' | 'document-groups' | 'goals' | 'display';

const emit = defineEmits<{
  close: [];
  save: [payload: TaskScopeDialogSavePayload];
  'global-recognize-date': [];
}>();

const localExcludedNotebookIds = ref<string[]>([]);
const localShowCompletedTasks = ref(true);
const localAutoRecognizeTaskDate = ref(false);
const localTaskCompletionSoundEnabled = ref(true);
const localStartKeywordsText = ref('');
const localDueKeywordsText = ref('');
const localRangeKeywordsText = ref('');
const localAfternoonKeywordsText = ref('');
const localShowDocumentGroupNotebookPath = ref(true);
const localDocumentGroups = ref<DocumentGroup[]>([]);
const localGoals = ref<Goal[]>([]);
const localHiddenTaskViewIds = ref<string[]>([]);
const localHiddenSidebarSectionIds = ref<string[]>([]);
const localSidebarSectionOrder = ref<string[]>([]);
const localDefaultTaskCreateTarget = ref('last');
const localDefaultTaskCreateNotebook = ref('');
const activeTab = ref<TaskScopeDialogTab>('scope');
const lockClose = computed(() => props.lockClose === true);
const showExtra = computed(() => props.showExtra !== false);
const globalDateRecognizing = computed(() => props.globalDateRecognizing === true);
const showScopeTab = computed(() => props.showScopeTab !== false);
const showDocumentGroupNotebookPathToggle = computed(() => props.showDocumentGroupNotebookPathToggle !== false);
const dialogTitle = computed(() => props.title || t('taskScopeDialog.settings'));
const dialogHint = computed(() => props.hint || t('taskManager.scopeHint'));
const confirmText = computed(() => props.confirmText || t('common.save'));
const hasDocumentGroupTab = computed(() =>
  Array.isArray(props.documentGroups) && Array.isArray(props.documentGroupDocuments)
);
const hasGoalTab = computed(() =>
  Array.isArray(props.goals) && Array.isArray(props.goalDocuments)
);
const taskViewOptions = computed(() => props.taskViewOptions || []);
const sidebarSectionOptions = computed(() => props.sidebarSectionOptions || []);
const hasDisplayTab = computed(() =>
  taskViewOptions.value.length > 0 || sidebarSectionOptions.value.length > 0
);
const hasWideLayout = computed(() => hasDocumentGroupTab.value || hasGoalTab.value || hasDisplayTab.value);
const availableTabs = computed<TaskScopeDialogTab[]>(() => {
  const tabs: TaskScopeDialogTab[] = [];
  if (hasDisplayTab.value) {
    tabs.push('display');
  }
  tabs.push('task-settings');
  if (hasGoalTab.value) {
    tabs.push('goals');
  }
  if (hasDocumentGroupTab.value) {
    tabs.push('document-groups');
  }
  if (showScopeTab.value) {
    tabs.push('scope');
  }
  return tabs;
});
const showTabs = computed(() => availableTabs.value.length > 1);
const documentGroupDocuments = computed(() => props.documentGroupDocuments || []);
const goalDocuments = computed(() => props.goalDocuments || []);
const activeHint = computed(() =>
  activeTab.value === 'scope'
    ? dialogHint.value
    : activeTab.value === 'task-settings'
      ? t('taskScopeDialog.taskSettingsHint')
      : activeTab.value === 'document-groups'
        ? t('taskScopeDialog.documentGroupsHint')
        : activeTab.value === 'goals'
          ? t('taskScopeDialog.goalsHint')
          : t('taskScopeDialog.displaySettingsHint')
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

const orderedSidebarSections = computed(() => {
  const optionsById = new Map(sidebarSectionOptions.value.map(option => [option.id, option]));
  const orderedIds = normalizeOptionIds(localSidebarSectionOrder.value, sidebarSectionOptions.value);
  return orderedIds.map(id => optionsById.get(id)).filter((item): item is TaskScopeDisplayOption => Boolean(item));
});
const defaultTaskCreateTargetOptions = computed(() => [
  { value: 'last', text: t('taskScopeDialog.defaultTaskCreateTargetLast') },
  { value: 'inbox', text: t('taskScopeDialog.defaultTaskCreateTargetInbox') },
  { value: 'daily-note', text: t('taskScopeDialog.defaultTaskCreateTargetDailyNote') }
]);
const defaultTaskCreateNotebookOptions = computed(() => [
  { value: '', text: t('taskScopeDialog.defaultTaskCreateNotebookFollow') },
  ...props.notebooks
    .filter(notebook => !localExcludedNotebookIds.value.includes(notebook.id))
    .map(notebook => ({ value: notebook.id, text: notebook.name }))
]);

function resolveInitialTab(): TaskScopeDialogTab {
  const requestedTab = props.initialTab;
  if (requestedTab && availableTabs.value.includes(requestedTab)) {
    return requestedTab;
  }
  return availableTabs.value[0] || 'scope';
}

function normalizeOptionIds(ids: string[] | undefined, options: TaskScopeDisplayOption[]): string[] {
  const optionIds = options.map(option => option.id);
  const optionIdSet = new Set(optionIds);
  const normalized = Array.from(new Set((ids || []).filter(id => optionIdSet.has(id))));
  return [
    ...normalized,
    ...optionIds.filter(id => !normalized.includes(id))
  ];
}

function formatKeywordText(values: readonly string[] | undefined): string {
  return Array.isArray(values) ? values.join(', ') : '';
}

function parseKeywordText(value: string, minLength: number): string[] {
  const seen = new Set<string>();
  return (value || '')
    .split(/[,，\n]/)
    .map(item => item.trim())
    .filter(item => item.length >= minLength)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

function buildDateRecognitionKeywords(): TaskDateKeywordConfig {
  return {
    start: parseKeywordText(localStartKeywordsText.value, 2),
    due: parseKeywordText(localDueKeywordsText.value, 2),
    range: parseKeywordText(localRangeKeywordsText.value, 1),
    afternoon: parseKeywordText(localAfternoonKeywordsText.value, 2)
  };
}

function syncLocalSelection(): void {
  const visibleNotebookIds = new Set(props.notebooks.map(notebook => notebook.id));
  localExcludedNotebookIds.value = normalizeNotebookIds(props.excludedNotebookIds).filter(id => visibleNotebookIds.has(id));
  localShowCompletedTasks.value = props.showCompletedTasks !== false;
  localAutoRecognizeTaskDate.value = props.autoRecognizeTaskDate === true;
  localTaskCompletionSoundEnabled.value = props.taskCompletionSoundEnabled !== false;
  localStartKeywordsText.value = formatKeywordText(props.dateRecognitionKeywords?.start);
  localDueKeywordsText.value = formatKeywordText(props.dateRecognitionKeywords?.due);
  localRangeKeywordsText.value = formatKeywordText(props.dateRecognitionKeywords?.range);
  localAfternoonKeywordsText.value = formatKeywordText(props.dateRecognitionKeywords?.afternoon);
  localShowDocumentGroupNotebookPath.value = props.showDocumentGroupNotebookPath !== false;
  localDocumentGroups.value = cloneDocumentGroups(props.documentGroups || []);
  localGoals.value = cloneGoals(props.goals || []);
  localHiddenTaskViewIds.value = normalizeOptionIds(props.hiddenTaskViewIds || [], taskViewOptions.value)
    .filter(id => (props.hiddenTaskViewIds || []).includes(id));
  localHiddenSidebarSectionIds.value = normalizeOptionIds(props.hiddenSidebarSectionIds || [], sidebarSectionOptions.value)
    .filter(id => (props.hiddenSidebarSectionIds || []).includes(id));
  localSidebarSectionOrder.value = normalizeOptionIds(props.sidebarSectionOrder || [], sidebarSectionOptions.value);
  localDefaultTaskCreateTarget.value = normalizeDefaultTaskCreateTarget(props.defaultTaskCreateTarget);
  localDefaultTaskCreateNotebook.value = normalizeDefaultTaskCreateNotebook(props.defaultTaskCreateNotebook);
  activeTab.value = resolveInitialTab();
}

function normalizeDefaultTaskCreateTarget(value: string | undefined): string {
  return value === 'inbox' || value === 'daily-note' ? value : 'last';
}

function normalizeDefaultTaskCreateNotebook(value: string | undefined): string {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return defaultTaskCreateNotebookOptions.value.some(option => option.value === normalized) ? normalized : '';
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

function isTaskViewVisible(id: string): boolean {
  return !localHiddenTaskViewIds.value.includes(id);
}

function toggleTaskViewVisible(id: string, visible: boolean): void {
  const current = new Set(localHiddenTaskViewIds.value);
  if (visible) {
    current.delete(id);
  } else {
    const visibleCount = taskViewOptions.value.filter(option => !current.has(option.id)).length;
    if (visibleCount <= 1) {
      return;
    }
    current.add(id);
  }
  localHiddenTaskViewIds.value = Array.from(current);
}

function isSidebarSectionVisible(id: string): boolean {
  return !localHiddenSidebarSectionIds.value.includes(id);
}

function toggleSidebarSectionVisible(id: string, visible: boolean): void {
  const current = new Set(localHiddenSidebarSectionIds.value);
  if (visible) {
    current.delete(id);
  } else {
    current.add(id);
  }
  localHiddenSidebarSectionIds.value = Array.from(current);
}

function moveSidebarSection(id: string, direction: -1 | 1): void {
  const order = normalizeOptionIds(localSidebarSectionOrder.value, sidebarSectionOptions.value);
  const index = order.indexOf(id);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= order.length) {
    return;
  }
  const next = [...order];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  localSidebarSectionOrder.value = next;
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
    dateRecognitionKeywords: buildDateRecognitionKeywords(),
    showDocumentGroupNotebookPath: localShowDocumentGroupNotebookPath.value,
    documentGroups: cloneDocumentGroups(localDocumentGroups.value),
    goals: cloneGoals(localGoals.value),
    hiddenTaskViewIds: normalizeOptionIds(localHiddenTaskViewIds.value, taskViewOptions.value)
      .filter(id => localHiddenTaskViewIds.value.includes(id)),
    hiddenSidebarSectionIds: normalizeOptionIds(localHiddenSidebarSectionIds.value, sidebarSectionOptions.value)
      .filter(id => localHiddenSidebarSectionIds.value.includes(id)),
    sidebarSectionOrder: normalizeOptionIds(localSidebarSectionOrder.value, sidebarSectionOptions.value),
    defaultTaskCreateTarget: normalizeDefaultTaskCreateTarget(localDefaultTaskCreateTarget.value),
    defaultTaskCreateNotebook: normalizeDefaultTaskCreateNotebook(localDefaultTaskCreateNotebook.value)
  });
}

watch(
  [
    () => props.show,
    () => props.excludedNotebookIds,
    () => props.notebooks,
    () => props.showCompletedTasks,
    () => props.autoRecognizeTaskDate,
    () => props.dateRecognitionKeywords,
    () => props.taskCompletionSoundEnabled,
    () => props.showDocumentGroupNotebookPath,
    () => props.showScopeTab,
    () => props.initialTab,
    () => props.documentGroups,
    () => props.goals,
    () => props.taskViewOptions,
    () => props.hiddenTaskViewIds,
    () => props.sidebarSectionOptions,
    () => props.hiddenSidebarSectionIds,
    () => props.sidebarSectionOrder,
    () => props.defaultTaskCreateTarget,
    () => props.defaultTaskCreateNotebook
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

.display-tab-content {
  gap: 12px;
  padding: 8px 14px 12px;
  overflow-y: auto;
}

.task-settings-tab-content {
  gap: 12px;
  padding: 8px 14px 12px;
  overflow-y: auto;
}

.task-settings-tab-content .task-scope-auto-setting {
  border: 1px solid var(--b3-border-color);
  border-radius: 8px;
}

.task-scope-display-section {
  border: 1px solid var(--b3-border-color);
  border-radius: 8px;
}

.task-scope-display-title {
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--b3-theme-on-surface);
  background: var(--b3-list-hover);
}

.task-scope-display-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.task-scope-display-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  font-size: 13px;
  color: var(--b3-theme-on-background);
}

.task-scope-display-item + .task-scope-display-item {
  border-top: 1px solid var(--b3-border-color);
}

.task-scope-display-grid .task-scope-display-item {
  min-width: 0;
}

.task-scope-display-grid .task-scope-display-item + .task-scope-display-item {
  border-top: none;
}

.task-scope-display-grid .task-scope-display-item:nth-child(n + 3) {
  border-top: 1px solid var(--b3-border-color);
}

.task-scope-display-grid .task-scope-display-item:nth-child(even) {
  border-left: 1px solid var(--b3-border-color);
}

.task-scope-setting-select {
  min-width: 160px;
  max-width: 220px;
}

.task-scope-display-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
}

.task-scope-order-btn {
  width: 24px;
  height: 24px;
  border: 1px solid var(--b3-border-color);
  border-radius: 6px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
}

.task-scope-order-btn.up .icon {
  transform: rotate(180deg);
}

.task-scope-order-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
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

.task-scope-keyword-settings {
  border-top: 1px solid var(--b3-border-color);
  padding: 10px 14px 12px;
}

.task-scope-keyword-summary {
  cursor: pointer;
  font-size: 13px;
  color: var(--b3-theme-on-background);
  user-select: none;
}

.task-scope-keyword-desc {
  margin: 8px 0 10px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--b3-theme-on-surface);
  opacity: 0.78;
}

.task-scope-keyword-field {
  display: grid;
  gap: 5px;
  margin-top: 9px;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
}

.task-scope-keyword-textarea {
  width: 100%;
  min-height: 44px;
  box-sizing: border-box;
  resize: vertical;
  border: 1px solid var(--b3-border-color);
  border-radius: 6px;
  padding: 6px 8px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  font: inherit;
  line-height: 1.45;
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
