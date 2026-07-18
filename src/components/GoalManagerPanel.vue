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
          <button
            v-for="goal in localGoals"
            :key="goal.id"
            type="button"
            class="goal-item"
            :class="{ active: goal.id === selectedGoalId }"
            @click="selectedGoalId = goal.id"
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
          </button>
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
              @click.stop="emit('refresh-documents')"
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
          <div v-if="filteredDocuments.length === 0" class="goal-empty">
            {{ t('goalManager.noDocuments') }}
          </div>
          <div v-else class="goal-checkbox-list">
            <div
              v-for="document in filteredDocuments"
              :key="document.key"
              class="goal-document-card"
              :class="{ selected: isDocumentSelected(document) }"
            >
              <label class="goal-checkbox-item goal-document-row">
                <span
                  :class="[
                    'day-checkbox',
                    {
                      completed: isDocumentFullyChecked(document),
                      partial: hasDocumentPartialTaskSelection(document)
                    }
                  ]"
                >
                  <span
                    v-if="hasDocumentPartialTaskSelection(document)"
                    class="day-checkbox-count"
                  >
                    {{ getDocumentCheckedTaskCount(document) }}
                  </span>
                  <Icon
                    v-else
                    :name="isDocumentFullyChecked(document) ? 'squareCheck' : 'square'"
                    :completed="isDocumentFullyChecked(document)"
                    class="day-checkbox-icon"
                  />
                </span>
                <span class="goal-checkbox-text">
                  <span class="goal-checkbox-name">{{ document.name }}</span>
                  <span class="goal-checkbox-meta">
                    {{ document.notebookName }}
                    <span class="goal-document-task-count">{{ getDocumentTasks(document).length }}</span>
                  </span>
                </span>
                <input
                  class="goal-checkbox-input"
                  type="checkbox"
                  :checked="isDocumentSelected(document)"
                  @change="toggleDocumentMembership(document, ($event.target as HTMLInputElement).checked)"
                >
              </label>
              <button
                type="button"
                class="goal-document-expand"
                :class="{ expanded: isDocumentExpanded(document) }"
                @click.stop="toggleDocumentExpanded(document)"
              >
                <Icon name="chevronRight" width="14" height="14" />
              </button>
              <div v-if="isDocumentExpanded(document)" class="goal-document-task-list">
                <div v-if="getDocumentTasks(document).length === 0" class="goal-document-task-empty">
                  {{ t('goalManager.noDocumentTasks') }}
                </div>
                <label
                  v-for="task in getDocumentTasks(document)"
                  :key="task.id"
                  class="goal-document-task-item"
                >
                  <span
                    :class="[
                      'day-checkbox',
                      { completed: isTaskChecked(task) }
                    ]"
                  >
                    <Icon
                      :name="isTaskChecked(task) ? 'squareCheck' : 'square'"
                      :completed="isTaskChecked(task)"
                      class="day-checkbox-icon"
                    />
                  </span>
                  <span class="goal-document-task-text">
                    <span class="goal-document-task-title" v-html="getTaskTitleHtml(task)"></span>
                  </span>
                  <input
                    class="goal-checkbox-input"
                    type="checkbox"
                    :checked="isTaskChecked(task)"
                    @change="toggleTaskMembership(task, ($event.target as HTMLInputElement).checked)"
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
import type { Task } from '@/api';
import type { GoalScopeDocument } from '@/utils/goalScopeDocuments';
import type { Goal } from '@/goalRepository';
import {
  buildGoalTaskMember,
  isTaskDirectGoalMember,
  isTaskExcludedFromGoal
} from '@/utils/goalTaskMembership';
import { isDocumentPathInScope } from '@/utils/taskDocumentScope';
import { sanitizeTaskTitleHtml } from '@/utils/taskHtml';
import { hasVisibleTaskTitle } from '@/utils/taskVisibility';
import { useI18n } from '@/composables/useI18n';

interface Props {
  goals: Goal[];
  documents: GoalScopeDocument[];
  tasks?: Task[];
  documentsRefreshing?: boolean;
}

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

function getDocumentKey(document: GoalScopeDocument): string {
  return `${document.notebookId}:${document.id}`;
}

function isTaskInDocument(task: Task, document: GoalScopeDocument): boolean {
  if (task.notebookId !== document.notebookId) {
    return false;
  }
  if (task.rootId === document.id) {
    return true;
  }
  return isDocumentPathInScope(task.hPath || '', document.path || '');
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
  const visibleTasks = (props.tasks || []).filter(task =>
    task.type === 'block'
    && !task.archived
    && !task.isVirtual
    && hasVisibleTaskTitle(task.title)
  );
  const tasksByKey = new Map<string, Task[]>();

  for (const document of props.documents || []) {
    const tasks = visibleTasks
      .filter(task => isTaskInDocument(task, document))
      .sort((left, right) => {
        const leftCompleted = left.status === 'completed' ? 1 : 0;
        const rightCompleted = right.status === 'completed' ? 1 : 0;
        if (leftCompleted !== rightCompleted) {
          return leftCompleted - rightCompleted;
        }
        return (left.title || '').localeCompare(right.title || '', 'zh-CN');
      });
    tasksByKey.set(getDocumentKey(document), tasks);
  }

  return tasksByKey;
});

function getDocumentTasks(document: GoalScopeDocument): Task[] {
  return documentTasksByKey.value.get(getDocumentKey(document)) || [];
}

function isDocumentExpanded(document: GoalScopeDocument): boolean {
  return expandedDocumentKeys.value.has(getDocumentKey(document));
}

function toggleDocumentExpanded(document: GoalScopeDocument): void {
  const key = getDocumentKey(document);
  const next = new Set(expandedDocumentKeys.value);
  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }
  expandedDocumentKeys.value = next;
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
  return getDocumentTasks(document).filter(task => isTaskChecked(task)).length;
}

function isDocumentFullyChecked(document: GoalScopeDocument): boolean {
  const tasks = getDocumentTasks(document);
  if (tasks.length === 0) {
    return isDocumentSelected(document);
  }
  return tasks.every(task => isTaskChecked(task));
}

function hasDocumentPartialTaskSelection(document: GoalScopeDocument): boolean {
  const tasks = getDocumentTasks(document);
  if (tasks.length === 0) {
    return false;
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

function toggleDocumentMembership(document: GoalScopeDocument, checked: boolean): void {
  const activeGoal = selectedGoal.value;
  if (!activeGoal) {
    return;
  }

  const memberKey = `${document.notebookId}:${document.id}`;
  emitGoals(localGoals.value.map(goal => {
    if (goal.id !== activeGoal.id) {
      return goal;
    }

    const nextMembers = goal.members.filter(member => `${member.notebookId}:${member.documentId}` !== memberKey);
    if (checked) {
      nextMembers.push({
        documentId: document.id,
        notebookId: document.notebookId,
        name: document.name,
        path: document.path
      });
    }

    return {
      ...goal,
      members: nextMembers
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
  height: 100%;
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
  gap: 6px;
  padding-right: 2px;
}

.goal-document-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 28px;
  align-items: stretch;
  gap: 6px;
  min-width: 0;
}

.goal-document-row {
  grid-column: 1;
  min-width: 0;
}

.goal-document-expand {
  grid-column: 2;
  width: 28px;
  min-height: 38px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-surface);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.goal-document-expand:hover {
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
}

.goal-document-expand svg {
  fill: currentColor;
  transition: transform 0.16s ease;
}

.goal-document-expand.expanded svg {
  transform: rotate(90deg);
}

.goal-document-task-list {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 2px 0 2px 24px;
}

.goal-document-task-empty {
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-surface);
  font-size: 12px;
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

.goal-document-task-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.goal-document-task-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--b3-theme-on-background);
  font-size: 12px;
}

.goal-document-task-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  margin-left: 6px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-surface);
  font-size: 11px;
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
  align-items: center;
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
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--b3-theme-background);
  box-shadow: #0000000f 0 1px 5px;
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
  color: var(--b3-theme-on-background);
  word-break: break-word;
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
