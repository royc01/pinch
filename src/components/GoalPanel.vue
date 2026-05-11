<template>
  <div v-if="show" ref="goalPagePanelRef" class="goal-page-panel">
    <div class="goal-page-header">
      <div class="goal-page-header-content">
        <div class="goal-page-title">{{ t('goalProgress') }}</div>
        <button type="button" class="icon-button" :title="t('close')" :aria-label="t('close')" @click="emit('close')">
          <Icon name="close" width="16" height="16" class="icon" />
        </button>
      </div>
    </div>

    <div class="goal-section">
      <div class="goal-header">
        <div>
          <h3 class="goal-title">{{ t('goalProgress') }}</h3>
          <div class="goal-subtitle">{{ t('goalProgressHint') }}</div>
        </div>
        <button type="button" class="goal-manage-btn" @click="void openGoalManager()">
          {{ t('manageGoals') }}
        </button>
      </div>

      <div v-if="goalsError" class="goal-feedback is-error">{{ goalsError }}</div>
      <div v-else-if="goalsLoading && goalItems.length === 0" class="goal-empty">
        {{ t('loadingGoals') }}
      </div>
      <div v-else-if="goalItems.length === 0" class="goal-empty">
        {{ t('noGoalsFound') }}
      </div>
      <div v-else class="goal-list">
        <div
          v-for="goal in goalItems"
          :key="goal.id"
          class="goal-card"
          :class="{
            'is-completed': goal.status === 'completed',
            'is-empty': goal.status === 'empty',
            'is-highlighted': goal.id === highlightGoalId
          }"
          :data-goal-id="goal.id"
          role="button"
          tabindex="0"
          @click="void openGoalSourceInKanban(goal)"
          @keydown.enter.prevent="void openGoalSourceInKanban(goal)"
          @keydown.space.prevent="void openGoalSourceInKanban(goal)"
        >
          <div class="goal-card-head">
            <div class="goal-card-main">
              <div class="goal-card-title-row">
                <span class="goal-card-flag" aria-hidden="true">{{ goal.emoji || '🎯' }}</span>
                <span class="goal-card-title">{{ goal.name }}</span>
                <span v-if="goal.status === 'completed'" class="goal-state-chip success">{{ t('completed') }}</span>
                <span v-else-if="goal.documentCount === 0" class="goal-state-chip muted">{{ t('noDocSelectedChip') }}</span>
                <span v-else-if="goal.status === 'empty'" class="goal-state-chip muted">{{ t('noTasksChip') }}</span>
                <span v-else-if="isGoalOverdue(goal)" class="goal-state-chip danger">{{ t('overdueChip') }}</span>
              </div>
              <div class="goal-card-meta">
                <span>{{ goal.documentSummary }}</span>
                <span v-if="goal.dueDate" class="goal-due-date-info" :class="{ 'is-overdue': isGoalOverdue(goal) }">
                  {{ t('dueDatePrefix') }}{{ formatDueDate(goal.dueDate) }}
                </span>
              </div>
            </div>
            <div class="goal-card-count">{{ goal.completedTasks }}/{{ goal.totalTasks }}</div>
          </div>

          <div class="goal-progress">
            <div class="goal-progress-bar">
              <span :style="{ width: `${goal.progressPercent}%` }"></span>
            </div>
            <div class="goal-progress-text">{{ describeGoalProgress(goal) }}</div>
          </div>
        </div>
      </div>
    </div>

    <TaskScopeDialog
      :show="showGoalManager"
      :notebooks="scopeNotebooks"
      :excluded-notebook-ids="scopeExcludedNotebookIds"
      :show-scope-tab="true"
      :show-completed-tasks="scopeShowCompletedTasks"
      :auto-recognize-task-date="scopeAutoRecognizeTaskDate"
      :global-date-recognizing="isGlobalDateRecognitionRunning"
      :task-completion-sound-enabled="scopeTaskCompletionSoundEnabled"
      :show-document-group-notebook-path="scopeShowDocumentGroupNotebookPath"
      :title="t('taskScopeDialogTitle')"
      :initial-tab="goalManagerInitialTab"
      :document-groups="documentGroups"
      :document-group-documents="goalDocuments"
      :goals="goalDefinitions"
      :goal-documents="goalDocuments"
      @close="showGoalManager = false"
      @global-recognize-date="handleGlobalRecognizeTaskDates"
      @save="handleGoalSave"
    />
  </div>
</template>

<script setup lang="ts">
import { t } from '@/utils/i18n';
import { nextTick, ref, watch } from 'vue';
import { showMessage } from 'siyuan';
import { TaskRepository, lsNotebooks } from '@/api';
import TaskScopeDialog, { type TaskScopeDialogSavePayload } from '@/components/TaskScopeDialog.vue';
import { useGoals, type GoalListItem } from '@/composables/useGoals';
import { useUserSettings } from '@/composables/useUserSettings';
import { loadDocumentGroups, saveDocumentGroups, type DocumentGroup } from '@/documentGroupRepository';
import { openTaskViewByRequest } from '@/main';
import { buildGoalDocumentSource } from '@/utils/documentGroupSource';
import { eventBus, Events } from '@/utils/eventBus';
import { normalizeNotebookIds } from '@/utils/taskViewShared';
import Icon from './Icon.vue';

interface Props {
  show: boolean;
  highlightGoalId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  highlightGoalId: ''
});
const emit = defineEmits<{
  close: [];
}>();

const { data: userSettings, loadSettings, updateSettings } = useUserSettings();
const {
  goalDefinitions,
  goalDocuments,
  goalItems,
  goalsLoading,
  goalsError,
  saveGoalDefinitions
} = useGoals();

const showGoalManager = ref(false);
const goalManagerInitialTab = ref<'scope' | 'document-groups' | 'goals'>('goals');
const documentGroups = ref<DocumentGroup[]>([]);
const goalPagePanelRef = ref<HTMLElement | null>(null);
const scopeNotebooks = ref<Array<{ id: string; name: string }>>([]);
const scopeExcludedNotebookIds = ref<string[]>([]);
const scopeShowCompletedTasks = ref(true);
const scopeAutoRecognizeTaskDate = ref(false);
const scopeTaskCompletionSoundEnabled = ref(true);
const scopeShowDocumentGroupNotebookPath = ref(true);
const isGlobalDateRecognitionRunning = ref(false);

function sortDocumentGroups(groups: DocumentGroup[]): DocumentGroup[] {
  return [...groups].sort((a, b) => {
    const orderA = typeof a.order === 'number' ? a.order : Number.MAX_SAFE_INTEGER;
    const orderB = typeof b.order === 'number' ? b.order : Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.name.localeCompare(b.name, 'zh-CN');
  });
}

async function loadTaskScopeState(): Promise<void> {
  await loadSettings();
  const notebookResult = await lsNotebooks();
  scopeNotebooks.value = (notebookResult?.notebooks || [])
    .filter(notebook => !notebook.closed)
    .map(notebook => ({
      id: notebook.id,
      name: notebook.name
    }));
  scopeExcludedNotebookIds.value = normalizeNotebookIds(userSettings.taskManager.excludedNotebookIds);
  scopeShowCompletedTasks.value = userSettings.taskManager.showCompletedTasks !== false;
  scopeAutoRecognizeTaskDate.value = userSettings.taskManager.autoRecognizeTaskDate === true;
  scopeTaskCompletionSoundEnabled.value = userSettings.taskManager.taskCompletionSoundEnabled !== false;
  scopeShowDocumentGroupNotebookPath.value = userSettings.taskManager.showDocumentGroupNotebookPath !== false;
  TaskRepository.setExcludedNotebookIds(scopeExcludedNotebookIds.value);
  TaskRepository.setAutoRecognizeTaskDateEnabled(scopeAutoRecognizeTaskDate.value);
}

async function openGoalManager(initialTab: 'scope' | 'document-groups' | 'goals' = 'goals'): Promise<void> {
  goalManagerInitialTab.value = initialTab;
  const [nextGroups] = await Promise.all([
    loadDocumentGroups(),
    loadTaskScopeState()
  ]);
  documentGroups.value = sortDocumentGroups(nextGroups);
  showGoalManager.value = true;
}

async function handleGlobalRecognizeTaskDates(): Promise<void> {
  if (isGlobalDateRecognitionRunning.value) {
    return;
  }

  isGlobalDateRecognitionRunning.value = true;
  try {
    const result = await TaskRepository.recognizeDatesForUndatedTasks();
    if (result.scanned === 0) {
      showMessage(t('noTaskDateFound'), 2200, 'info');
      return;
    }

    if (result.updated > 0) {
      if (result.failed > 0) {
        showMessage(t('recognizedTasksSummary', { updated: result.updated, failed: result.failed }), 3200, 'error');
      } else {
        showMessage(t('recognizedTasksSuccess', { count: result.updated }), 2200, 'info');
      }
      return;
    }

    if (result.recognized === 0) {
      showMessage(t('scanTasksNoResult', { scanned: result.scanned }), 2800, 'info');
      return;
    }

    showMessage(t('recognizedTasksSummary', { updated: result.recognized, failed: result.failed }), 3200, 'error');
  } catch (error) {
    console.error('[GoalPanel] Global recognition of task dates failed:', error);
    showMessage(t('recognizeTasksError'), 3200, 'error');
  } finally {
    isGlobalDateRecognitionRunning.value = false;
  }
}

function describeGoalProgress(goal: GoalListItem): string {
  if (goal.documentCount === 0) {
    return t('noDocSelectedDesc');
  }
  if (goal.totalTasks === 0) {
    return t('noTasksDesc');
  }
  if (goal.status === 'completed') {
    return t('allTasksCompletedDesc', { total: goal.totalTasks });
  }
  return t('remainingTasksDesc', { count: goal.remainingTasks });
}

function formatDueDate(dueDate: string): string {
  if (!dueDate) return '';
  const [year, month, day] = dueDate.split('-');
  return t('dateFormatShort', { month, day });
}

function isGoalOverdue(goal: GoalListItem): boolean {
  if (!goal.dueDate || goal.status === 'completed') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(goal.dueDate);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

async function handleGoalSave(payload: TaskScopeDialogSavePayload): Promise<void> {
  const visibleNotebookIds = new Set(scopeNotebooks.value.map(notebook => notebook.id));
  const hiddenExcludedNotebookIds = scopeExcludedNotebookIds.value.filter(id => !visibleNotebookIds.has(id));
  const mergedExcludedNotebookIds = normalizeNotebookIds([
    ...hiddenExcludedNotebookIds,
    ...payload.excludedNotebookIds
  ]);
  const nextDocumentGroups = sortDocumentGroups((payload.documentGroups || []).map(group => ({
    ...group,
    members: Array.isArray(group.members) ? group.members.map(member => ({ ...member })) : []
  })));

  scopeExcludedNotebookIds.value = mergedExcludedNotebookIds;
  scopeShowCompletedTasks.value = payload.showCompletedTasks;
  scopeAutoRecognizeTaskDate.value = payload.autoRecognizeTaskDate;
  scopeTaskCompletionSoundEnabled.value = payload.taskCompletionSoundEnabled;
  scopeShowDocumentGroupNotebookPath.value = payload.showDocumentGroupNotebookPath;

  TaskRepository.setExcludedNotebookIds(mergedExcludedNotebookIds);
  TaskRepository.setAutoRecognizeTaskDateEnabled(payload.autoRecognizeTaskDate);

  await updateSettings('taskManager', {
    excludedNotebookIds: mergedExcludedNotebookIds,
    showCompletedTasks: payload.showCompletedTasks,
    autoRecognizeTaskDate: payload.autoRecognizeTaskDate,
    taskCompletionSoundEnabled: payload.taskCompletionSoundEnabled,
    showDocumentGroupNotebookPath: payload.showDocumentGroupNotebookPath
  });

  documentGroups.value = nextDocumentGroups;
  await saveDocumentGroups(nextDocumentGroups);
  eventBus.emit(Events.DOCUMENT_GROUPS_UPDATED, { groups: nextDocumentGroups });
  await saveGoalDefinitions(payload.goals);
  showGoalManager.value = false;
}

async function openGoalSourceInKanban(goal: GoalListItem): Promise<void> {
  await openTaskViewByRequest({
    view: 'kanban',
    source: buildGoalDocumentSource(goal.id),
    documentId: 'all'
  });
}

function scrollToHighlightedGoal(): void {
  if (!props.show || !props.highlightGoalId) {
    return;
  }

  void nextTick(() => {
    const cards = goalPagePanelRef.value?.querySelectorAll<HTMLElement>('[data-goal-id]');
    if (!cards || cards.length === 0) {
      return;
    }
    const target = Array.from(cards).find(card => card.dataset.goalId === props.highlightGoalId);
    target?.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  });
}

watch([() => props.show, () => props.highlightGoalId, () => goalItems.value.length], ([visible]) => {
  if (!visible) {
    showGoalManager.value = false;
    return;
  }
  scrollToHighlightedGoal();
});
</script>

<style scoped>
.goal-page-panel {
  position: absolute;
  inset: 0;
  z-index: 10;
  box-sizing: border-box;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 10px;
  --s: 20px;
  --c1: #2a936a;
  --c2: #32a176;
  --_g: radial-gradient(calc(var(--s) / 2), var(--c1) 97%, #0000);
  background:
    var(--_g), var(--_g) calc(2 * var(--s)) calc(2 * var(--s)),
    repeating-conic-gradient(from 45deg, #0000 0 25%, var(--c2) 0 50%) calc(-0.707 * var(--s)) calc(-0.707 * var(--s)),
    repeating-linear-gradient(135deg, var(--c1) calc(var(--s) / -2) calc(var(--s) / 2), var(--c2) 0 calc(2.328 * var(--s)));
  background-size: calc(4 * var(--s)) calc(4 * var(--s));
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.goal-page-panel::-webkit-scrollbar {
  display: none;
}

.goal-page-header {
  display: flex;
  flex-direction: column;
  padding-bottom: 10px;
}

.goal-page-header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.goal-page-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--b3-theme-background);
}

.goal-section {
  padding: 16px;
  border-radius: 18px;
  background: rgb(255 255 255 / 0.92);
  box-shadow: 0 10px 24px rgb(27 92 67 / 0.08);
}

.goal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.goal-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--b3-theme-on-background);
}

.goal-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: #7b706b;
  line-height: 1.5;
}

.goal-manage-btn {
  padding: 8px 12px;
  border: none;
  border-radius: 12px;
  background: #2a936a;
  color: white;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.goal-feedback {
  margin-bottom: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 12px;
}

.goal-feedback.is-error {
  background: rgb(215 80 73 / 0.1);
  color: #9d443b;
}

.goal-empty {
  font-size: 12px;
  color: #7b706b;
}

.goal-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.goal-card {
  padding: 14px;
  border-radius: 16px;
  background: var(--b3-theme-background);
  border: 1px solid rgb(42 147 106 / 0.12);
  cursor: pointer;
}

.goal-card.is-highlighted {
  box-shadow: 0 0 0 2px rgb(255 255 255 / 0.9), 0 16px 30px rgb(42 147 106 / 0.18);
  border-color: color-mix(in srgb, var(--b3-theme-primary) 44%, transparent);
}

.goal-card.is-completed {
  background: linear-gradient(135deg, rgb(238 249 243), rgb(231 246 238));
}

.goal-card:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--b3-theme-primary) 55%, white);
  outline-offset: 2px;
}

.goal-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.goal-card-main {
  min-width: 0;
  flex: 1;
}

.goal-card-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
}

.goal-card-flag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  font-size: 16px;
  line-height: 1;
}

.goal-card-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 700;
  color: var(--b3-theme-on-background);
}

.goal-card-count {
  flex-shrink: 0;
  font-size: 18px;
  font-weight: 700;
  color: #8f533e;
}

.goal-state-chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.goal-state-chip.success {
  background: rgb(42 147 106 / 0.12);
  color: #256e53;
}

.goal-state-chip.muted {
  background: rgb(95 102 100 / 0.1);
  color: #5d6966;
}

.goal-state-chip.danger {
  background: rgb(237 97 84 / 0.12);
  color: #c24d3f;
}

.goal-card-meta {
  margin-top: 6px;
  font-size: 12px;
  color: #7b706b;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.goal-due-date-info {
  padding: 2px 6px;
  border-radius: 4px;
  background: rgb(42 147 106 / 0.08);
  color: #256e53;
}

.goal-due-date-info.is-overdue {
  background: rgb(237 97 84 / 0.1);
  color: #c24d3f;
}

.goal-progress {
  margin-top: 12px;
}

.goal-progress-bar {
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: rgb(111 126 122 / 0.12);
}

.goal-progress-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2a936a, #7cc6a5);
}

.goal-progress-text {
  margin-top: 8px;
  font-size: 12px;
  color: #6e5d57;
}

.icon-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-button .icon {
  color: var(--b3-theme-background);
}

@media (max-width: 720px) {
  .goal-page-panel .goal-header,
  .goal-page-panel .goal-card-head {
    flex-direction: column;
    align-items: stretch;
  }

  .goal-page-panel .goal-card-count {
    align-self: flex-start;
  }
}
</style>
