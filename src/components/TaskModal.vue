<template>
  <Transition name="fade">
    <div
      v-show="show"
      class="modal-overlay"
      :class="{ 'is-centered': isCenteredPresentation }"
      :style="overlayStyle"
      @click.self="emit('close')"
    >
      <Transition :name="contentTransitionName">
        <div
          class="modal-content"
          :class="{ 'is-centered': isCenteredPresentation }"
          @click.stop
          v-show="show"
        >
          <div class="modal-header">
            <h3>{{ tt('taskManager.newTask') }}</h3>
            <button @click="emit('close')" class="icon-button ariaLabel" :aria-label="tt('common.close')">
              <Icon name="close" width="16" height="16" class="icon" />
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group task-title-group">
              <textarea
                v-model="localTask.title"
                class="task-title-input b3-text-field fn__flex-center"
                rows="3"
                :placeholder="tt('taskManager.taskTitlePlaceholder')"
              ></textarea>
            </div>
            <div class="filters-row">
              <div class="form-group filter-group">
                <label>{{ tt('taskManager.notebook') }}</label>
                <SySelect v-model="selectedNotebook" :options="notebookOptions" @update:modelValue="handleNotebookChange" />
              </div>
              <div class="form-group filter-group" v-if="selectedNotebook">
                <label>{{ tt('taskManager.document') }}</label>
                <SySelect v-model="selectedDocument" :options="documentOptions" />
              </div>
            </div>
            <div v-if="taskModalQuickPanel === 'group'" class="task-modal-group-panel">
              <div class="task-modal-group-header">
                <span class="task-modal-group-title">{{ tt('taskManager.selectTag') }}</span>
                <button type="button" class="task-modal-group-manage" @click.stop="emit('manage-groups')">
                  {{ tt('taskManager.manage') }}
                </button>
              </div>
              <div class="task-modal-group-chip-list">
                <button
                  v-for="option in taskModalGroupOptions"
                  :key="option.value"
                  type="button"
                  class="task-modal-group-chip"
                  :class="{ active: isTaskModalGroupSelected(option.value), primary: isTaskModalPrimaryGroup(option.value), special: option.special }"
                  :style="{
                    '--group-chip-bg': option.colorCss || 'var(--b3-list-hover)',
                    '--group-chip-color': option.textColor || 'var(--b3-theme-on-surface)'
                  }"
                  @click="selectTaskModalGroup(option.value)"
                >
                  <span class="task-modal-group-chip-label">{{ option.label }}</span>
                  <span v-if="isTaskModalPrimaryGroup(option.value)" class="task-modal-group-chip-primary">
                    {{ tt('taskManager.primaryTagShort') }}
                  </span>
                </button>
              </div>
              <div v-if="taskModalGoalOptions.length > 0" class="task-modal-goal-section">
                <div class="task-modal-goal-title">{{ tt('taskScopeDialog.goals') }}</div>
                <div class="task-modal-group-chip-list">
                  <button
                    v-for="option in taskModalGoalOptions"
                    :key="option.value"
                    type="button"
                    class="task-modal-group-chip task-modal-goal-chip"
                    :class="{ active: isTaskModalGoalSelected(option.value) }"
                    @click="selectTaskModalGoal(option.value)"
                  >
                    <EmojiIcon
                      v-if="option.emoji"
                      class="task-modal-goal-chip-emoji"
                      :value="option.emoji"
                    />
                    <span class="task-modal-group-chip-label">{{ option.label }}</span>
                  </button>
                </div>
              </div>
            </div>
            <div v-if="showTaskModalDescriptionPanel" class="task-modal-quick-panel">
              <textarea
                ref="taskModalDescriptionRef"
                v-model="localTask.description"
                class="task-description-input b3-text-field"
                rows="3"
                :placeholder="tt('taskManager.taskDescriptionPlaceholder')"
                @blur="handleTaskModalDescriptionCommit"
                @keydown.ctrl.enter.prevent="handleTaskModalDescriptionCommit"
              ></textarea>
            </div>
            <div class="task-modal-action-bar">
              <button
                type="button"
                class="task-modal-action-btn task-modal-group-btn ariaLabel"
                :class="{ 'is-active': taskModalQuickPanel === 'group' }"
                :style="taskModalGroupButtonStyle"
               
                :aria-label="tt('taskManager.tags')"
                @click.stop="toggleTaskModalQuickPanel('group')"
              >
                <Icon name="group" width="14" height="14" />
                <span v-if="taskModalHasGroupButtonLabel" class="task-modal-group-button-label">{{ taskModalGroupLabel }}</span>
              </button>
                <button
                  type="button"
                  class="task-modal-action-btn task-modal-priority-btn ariaLabel"
                 
                  :aria-label="tt('taskManager.priority')"
                  @click.stop="toggleTaskModalPriorityPopover($event)"
                >
                  <span
                    class="task-modal-priority-indicator"
                    :style="{ color: taskModalPriorityStyle.color }"
                  >
                    <Icon name="flag" width="14" height="14" />
                  </span>
                </button>
                <button
                  type="button"
                  class="task-modal-action-btn ariaLabel"
                  :class="{ 'is-active': taskModalQuickPanel === 'due' }"
                  ref="taskModalDueButtonRef"
                 
                  :aria-label="tt('taskManager.dueDate')"
                  @click.stop="toggleTaskModalQuickPanel('due')"
                >
                <Icon name="calendar" width="14" height="14" />
                <span v-if="taskModalHasDueDate" class="task-modal-action-value">{{ taskModalDueText }}</span>
              </button>
              <button
                type="button"
                class="task-modal-action-btn ariaLabel"
                :class="{ 'is-active': taskModalQuickPanel === 'reminder' }"
                ref="taskModalReminderButtonRef"
               
                :aria-label="tt('taskManager.reminder')"
                @click.stop="toggleTaskModalQuickPanel('reminder')"
              >
                <Icon name="bell" width="14" height="14" />
                <span v-if="taskModalHasReminder" class="task-modal-action-value">{{ taskModalReminderText }}</span>
              </button>
              <button
                type="button"
                class="task-modal-action-btn ariaLabel"
                :class="{ 'is-active': taskModalQuickPanel === 'description' }"
               
                :aria-label="tt('taskManager.description')"
                @click.stop="toggleTaskModalQuickPanel('description')"
              >
                <Icon name="descriptionBubble" width="14" height="14" />
              </button>
            </div>
          </div>
          <div class="modal-footer">
            <SyButton @click="handleSubmit" class="confirm-button">{{ tt('taskManager.save') }}</SyButton>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
    <PriorityPopover
      v-if="taskModalPriorityPopover"
      :show="true"
      :position="taskModalPriorityPopover.position"
      :placement="taskModalPriorityPopover.placement"
      @select="handleTaskModalPrioritySelect"
      @close="taskModalPriorityPopover = null"
    />
    <TaskDatePopover
      v-if="taskModalQuickPanel === 'due'"
      :visible="true"
      :anchor-el="taskModalDueButtonRef"
      :model-value="localTask.dueDate || ''"
      @update:modelValue="handleTaskModalDateSelect"
      @close="taskModalQuickPanel = null"
    />
    <TaskReminderPopover
      v-if="taskModalQuickPanel === 'reminder'"
      :visible="true"
      :anchor-el="taskModalReminderButtonRef"
      :model-value="localTask.reminderType"
      :custom-time="localTask.reminderCustomTime || ''"
      :due-date="localTask.dueDate || ''"
      @select="handleTaskModalReminderSelect"
      @close="taskModalQuickPanel = null"
    />
</template>

<script setup lang="ts">
import { ref, watch, computed, nextTick, onMounted, onBeforeUnmount } from 'vue';
import SyButton from '@/components/SiyuanTheme/SyButton.vue';
import SySelect from '@/components/SiyuanTheme/SySelect.vue';
import Icon from '@/components/Icon.vue';
import EmojiIcon from '@/components/EmojiIcon.vue';
import PriorityPopover from '@/components/PriorityPopover.vue';
import TaskDatePopover from '@/components/TaskDatePopover.vue';
import TaskReminderPopover from '@/components/TaskReminderPopover.vue';
import { useI18n } from '@/composables/useI18n';
import type { TaskPriority, TaskStatus, TaskGroup } from '@/api';
import { formatMonthDay } from '@/utils/dateHelpers';
import { resolveGroupColorCss, resolveGroupColorLayerCss, resolveGroupTextColor } from '@/utils/groupColor';
import { buildTaskTagState, toggleTaskTagSelection } from '@/utils/taskTags';
import {
  getTaskReminderLabel,
  type TaskReminderSelection,
  type TaskReminderType
} from '@/utils/taskReminder';
import { PINCH_DAILY_NOTE_OPTION_ID, PINCH_INBOX_OPTION_ID, isPinchInboxValue } from '@/utils/pinchInbox';
import type { Goal } from '@/goalRepository';

export interface Notebook {
  id: string;
  name: string;
}

export interface Document {
  id: string;
  name: string;
  notebookId: string;
  path?: string;
}

const TASK_GROUP_NONE_ID = '__none__';
const { t: translate } = useI18n();
interface NewTask {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  reminderType?: TaskReminderType;
  reminderCustomTime?: string;
  tags: string[];
  groupId: string;
  goalIds: string[];
}

interface Props {
  show: boolean;
  t: (key: string) => string;
  notebooks: Notebook[];
  documents: Document[];
  lastSelectedNotebook?: string;
  lastSelectedDocument?: string;
  groups?: TaskGroup[];
  goals?: Goal[];
  defaultGroupId?: string;
  presentation?: 'sheet' | 'center';
  overlayStyle?: Record<string, string>;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  submit: [task: NewTask, notebookId: string, documentId: string];
  'manage-groups': [];
}>();

const defaultTask: NewTask = {
  title: '',
  description: '',
  priority: 'none',
  status: 'pending',
  dueDate: '',
  reminderType: undefined,
  reminderCustomTime: '',
  tags: [],
  groupId: '',
  goalIds: []
};

const localTask = ref<NewTask>({ ...defaultTask });
const selectedNotebook = ref<string>('');
const selectedDocument = ref<string>('');
const taskModalQuickPanel = ref<'due' | 'description' | 'group' | 'reminder' | null>(null);
const taskModalPriorityPopover = ref<{
  position: { x: number; y: number };
  placement: 'bottom' | 'top';
} | null>(null);
const taskModalDescriptionRef = ref<HTMLTextAreaElement | null>(null);
const taskModalDueButtonRef = ref<HTMLButtonElement | null>(null);
const taskModalReminderButtonRef = ref<HTMLButtonElement | null>(null);

const taskModalPriorityStyle = computed(() => {
  switch (localTask.value.priority) {
    case 'high':
      return { background: 'var(--pinch-background10)', color: 'var(--pinch-font-color10)' };
    case 'medium':
      return { background: 'var(--pinch-background3)', color: 'var(--pinch-font-color3)' };
    case 'low':
      return { background: 'var(--pinch-background7)', color: 'var(--pinch-font-color7)' };
    case 'none':
    default:
      return { background: 'var(--b3-list-hover)', color: 'var(--b3-theme-on-surface)' };
  }
});

const taskModalHasDueDate = computed(() => {
  return !!(localTask.value.dueDate || '').trim();
});

const taskModalDueText = computed(() => {
  if (!taskModalHasDueDate.value) return '';
  return formatMonthDay(localTask.value.dueDate);
});

const taskModalHasDescription = computed(() => {
  return (localTask.value.description || '').trim().length > 0;
});

const taskModalHasReminder = computed(() => {
  return !!(localTask.value.reminderType || '').trim();
});

const taskModalReminderText = computed(() => {
  return getTaskReminderLabel(localTask.value.reminderType, localTask.value.reminderCustomTime);
});

const showTaskModalDescriptionPanel = computed(() => {
  return taskModalQuickPanel.value === 'description' || taskModalHasDescription.value;
});

const taskModalSelectedTagIds = computed(() => (
  buildTaskTagState(localTask.value.tags, localTask.value.groupId).tagIds
));

const taskModalSelectedGroupId = computed(() => {
  return taskModalSelectedTagIds.value[0] || TASK_GROUP_NONE_ID;
});

const taskModalGroupLabel = computed(() => {
  const tagIds = taskModalSelectedTagIds.value;
  if (tagIds.length === 0) {
    const goalLabels = taskModalSelectedGoalLabels.value;
    if (goalLabels.length > 0) {
      return goalLabels.length > 1 ? `${goalLabels[0]} +${goalLabels.length - 1}` : goalLabels[0];
    }
    return tt('taskManager.noTag');
  }
  const primaryTagId = tagIds[0] || '';
  const group = (props.groups || []).find(item => item.id === primaryTagId);
  const primaryLabel = group?.name || tt('taskManager.tags');
  const extraCount = Math.max(0, tagIds.length - 1) + taskModalSelectedGoalLabels.value.length;
  return extraCount > 0 ? `${primaryLabel} +${extraCount}` : primaryLabel;
});

const taskModalHasGroupButtonLabel = computed(() => (
  taskModalSelectedGroupId.value !== TASK_GROUP_NONE_ID || localTask.value.goalIds.length > 0
));

const taskModalGroupColorValue = computed(() => {
  const groupId = taskModalSelectedTagIds.value[0] || '';
  if (!groupId) {
    return '';
  }
  return (props.groups || []).find(item => item.id === groupId)?.color || '';
});

const taskModalGroupButtonStyle = computed(() => {
  const rawColor = taskModalGroupColorValue.value;
  if (!rawColor) {
    return {};
  }
  return {
    background: resolveGroupColorCss(rawColor),
    borderColor: resolveGroupColorLayerCss(rawColor),
    color: resolveGroupTextColor(rawColor)
  };
});

const taskModalGroupOptions = computed(() => {
  const options = [
    { value: TASK_GROUP_NONE_ID, label: tt('taskManager.noTag'), special: true, color: '', colorCss: '', textColor: '' }
  ];
  (props.groups || []).forEach(group => {
    if (group.hidden === true) {
      return;
    }
    const rawColor = group.color || '';
    options.push({
      value: group.id,
      label: group.name,
      special: false,
      color: rawColor,
      colorCss: resolveGroupColorCss(rawColor),
      textColor: resolveGroupTextColor(rawColor)
    });
  });
  return options;
});

const taskModalGoalOptions = computed(() => (
  (props.goals || []).map(goal => ({
    value: goal.id,
    label: goal.name || tt('taskManager.untitledGoal'),
    emoji: goal.emoji || ''
  }))
));

const taskModalSelectedGoalLabels = computed(() => (
  taskModalGoalOptions.value
    .filter(option => localTask.value.goalIds.includes(option.value))
    .map(option => `${option.emoji ? `${option.emoji} ` : ''}${option.label}`)
));

const isCenteredPresentation = computed(() => props.presentation === 'center');
const contentTransitionName = computed(() => isCenteredPresentation.value ? 'pop' : 'slide');

const notebookOptions = computed(() => {
  return props.notebooks.map(nb => ({ value: nb.id, text: nb.name }));
});

function isInboxDocument(doc: Document): boolean {
  const normalizedName = (doc.name || '').trim();
  const normalizedPath = (doc.path || '').replace(/^\/+/, '').trim();
  return isPinchInboxValue(normalizedName) || isPinchInboxValue(normalizedPath);
}

function getInboxDocumentValue(notebookId: string): string {
  const docsForNotebook = props.documents.filter(d => d.notebookId === notebookId);
  const inboxDoc = docsForNotebook.find(isInboxDocument);
  return inboxDoc?.id || PINCH_INBOX_OPTION_ID;
}

const documentOptions = computed(() => {
  if (!selectedNotebook.value) return [];
  const docs = props.documents.filter(d => d.notebookId === selectedNotebook.value);
  const hasInboxDoc = docs.some(isInboxDocument);
  const docOptions = docs.map(d => ({ value: d.id, text: d.name }));
  const specialOptions = [
    { value: PINCH_DAILY_NOTE_OPTION_ID, text: tt('taskManager.todayDailyNote') }
  ];
  if (hasInboxDoc) {
    return [...specialOptions, ...docOptions];
  }
  return [...specialOptions, { value: PINCH_INBOX_OPTION_ID, text: tt('taskManager.pinchInbox') }, ...docOptions];
});

function tt(key: string, fallback?: string): string {
  const translated = props.t?.(key);
  if (!translated || translated === key) {
    return translate(key, fallback);
  }
  return translated;
}

function isTaskModalGroupSelected(value: string): boolean {
  if (value === TASK_GROUP_NONE_ID) {
    return taskModalSelectedTagIds.value.length === 0;
  }
  return taskModalSelectedTagIds.value.includes(value);
}

function isTaskModalPrimaryGroup(value: string): boolean {
  return value !== TASK_GROUP_NONE_ID && taskModalSelectedTagIds.value[0] === value;
}

function selectTaskModalGroup(value: string): void {
  if (value === TASK_GROUP_NONE_ID) {
    localTask.value.tags = [];
    localTask.value.groupId = '';
    return;
  }
  const nextTagIds = toggleTaskTagSelection(taskModalSelectedTagIds.value, value);
  localTask.value.tags = nextTagIds;
  localTask.value.groupId = nextTagIds[0] || '';
}

function isTaskModalGoalSelected(value: string): boolean {
  return localTask.value.goalIds.includes(value);
}

function selectTaskModalGoal(value: string): void {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) {
    return;
  }
  const current = new Set(localTask.value.goalIds);
  if (current.has(normalized)) {
    current.delete(normalized);
  } else {
    current.add(normalized);
  }
  localTask.value.goalIds = Array.from(current);
}

function handleNotebookChange() {
  selectedDocument.value = selectedDocument.value === PINCH_DAILY_NOTE_OPTION_ID
    ? PINCH_DAILY_NOTE_OPTION_ID
    : getInboxDocumentValue(selectedNotebook.value);
}

function toggleTaskModalPriorityPopover(event: MouseEvent) {
  if (taskModalPriorityPopover.value) {
    taskModalPriorityPopover.value = null;
    return;
  }
  taskModalQuickPanel.value = null;
  const target = event.currentTarget as HTMLElement | null;
  if (!target) return;
  const rect = target.getBoundingClientRect();
  const estimatedHeight = 152;
  const gap = 8;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const spaceBelow = viewportHeight - rect.bottom;
  const placement = spaceBelow < estimatedHeight ? 'top' : 'bottom';
  taskModalPriorityPopover.value = {
    position: {
      x: rect.left + rect.width / 2,
      y: placement === 'top' ? rect.top - gap : rect.bottom + gap
    },
    placement
  };
}

function handleTaskModalPrioritySelect(value: string) {
  localTask.value.priority = value as TaskPriority;
  taskModalPriorityPopover.value = null;
}

function toggleTaskModalQuickPanel(panel: 'due' | 'description' | 'group' | 'reminder') {
  if (taskModalQuickPanel.value === panel) {
    taskModalQuickPanel.value = null;
    return;
  }
  taskModalPriorityPopover.value = null;
  taskModalQuickPanel.value = panel;
  void nextTick(() => {
    if (panel === 'description') {
      taskModalDescriptionRef.value?.focus();
    }
  });
}

function handleTaskModalDateSelect(value: string) {
  localTask.value.dueDate = value;
}

function handleTaskModalReminderSelect(value: TaskReminderSelection) {
  localTask.value.reminderType = value.reminderType;
  localTask.value.reminderCustomTime = value.reminderCustomTime || '';
}

function handleTaskModalDescriptionCommit() {
  taskModalQuickPanel.value = null;
}

function handleTaskModalOutsideClick(event: MouseEvent): void {
  if (!props.show || !taskModalPriorityPopover.value) return;
  const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
  const isInsidePopover = path.some(node =>
    node instanceof HTMLElement && node.classList.contains('priority-popover')
  );
  const isInsideControl = path.some(node =>
    node instanceof HTMLElement && node.classList.contains('task-modal-priority-btn')
  );
  if (!isInsidePopover && !isInsideControl) {
    taskModalPriorityPopover.value = null;
  }
}

function resolveDefaultGroupId(): string {
  const candidate = (props.defaultGroupId || '').trim();
  if (!candidate) return '';
  const exists = (props.groups || []).some(group => group.id === candidate && group.hidden !== true);
  return exists ? candidate : '';
}

watch(() => props.show, (show) => {
  if (show) {
    localTask.value = { ...defaultTask };
    localTask.value.groupId = resolveDefaultGroupId();
    localTask.value.tags = localTask.value.groupId ? [localTask.value.groupId] : [];
    taskModalQuickPanel.value = null;
    taskModalPriorityPopover.value = null;

    const hasPreferredNotebook = !!props.lastSelectedNotebook &&
      props.notebooks.some(nb => nb.id === props.lastSelectedNotebook);
    selectedNotebook.value = hasPreferredNotebook
      ? props.lastSelectedNotebook!
      : (props.notebooks[0]?.id || '');

    const docsForNotebook = props.documents.filter(d => d.notebookId === selectedNotebook.value);
    const fallbackDocumentValue = getInboxDocumentValue(selectedNotebook.value);
    const preferredDocument = props.lastSelectedDocument === PINCH_INBOX_OPTION_ID
      ? fallbackDocumentValue
      : props.lastSelectedDocument;
    const isSpecialDocument = preferredDocument === PINCH_DAILY_NOTE_OPTION_ID;
    const hasPreferredDocument = !!props.lastSelectedDocument
      && (isSpecialDocument || docsForNotebook.some(doc => doc.id === preferredDocument));
    selectedDocument.value = hasPreferredDocument
      ? preferredDocument!
      : fallbackDocumentValue;
  }
});

onMounted(() => {
  document.addEventListener('mousedown', handleTaskModalOutsideClick, true);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleTaskModalOutsideClick, true);
});

const handleSubmit = () => {
  const trimmedTitle = localTask.value.title.trim();
  if (trimmedTitle && selectedNotebook.value) {
    const tagState = buildTaskTagState(localTask.value.tags, localTask.value.groupId);
    emit('submit', {
      ...localTask.value,
      title: trimmedTitle,
      tags: tagState.tagIds,
      groupId: tagState.primaryTagId,
      goalIds: [...localTask.value.goalIds]
    }, selectedNotebook.value, selectedDocument.value);
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  left: var(--modal-overlay-left, 0px);
  top: var(--modal-overlay-top, 0px);
  width: var(--modal-overlay-width, 100vw);
  height: var(--modal-overlay-height, 100dvh);
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: flex-end;
  z-index: 2;
}

.modal-overlay.is-centered {
  align-items: center;
  box-sizing: border-box;
}

.modal-content {
  background: var(--b3-theme-background);
  border-radius: 24px 24px 0 0;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15);
  overflow-y: auto;
  min-width: 100%;
}

.modal-content.is-centered {
  border-radius: 14px;
  width: min(560px, 100%);
  min-width: 0;
  max-height: calc(100% - 40px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .modal-overlay.is-centered {
    padding: calc(16px + env(safe-area-inset-top, 0px)) 16px calc(16px + env(safe-area-inset-bottom, 0px));
    z-index: 80;
  }

  .modal-content.is-centered {
    max-height: calc(100dvh - 32px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-enter-from,
.slide-leave-to {
  transform: translateY(35%);
}

.slide-enter-to,
.slide-leave-from {
  transform: translateY(0);
}

.pop-enter-active,
.pop-leave-active {
  transition: opacity 0.24s ease, transform 0.24s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateY(18px) scale(0.96);
}

.pop-enter-to,
.pop-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--b3-theme-on-background);
}

.icon-button {
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--b3-theme-on-background);
}

.icon-button:hover {
  background-color: var(--b3-list-hover);
  border-radius: 4px;
}

.modal-body {
  padding: 20px;
}

.filters-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.filters-row .filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
  margin-bottom: 0;
}

.filters-row .filter-group label {
  margin-bottom: 0;
  white-space: nowrap;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
}

.filters-row .filter-group .b3-select {
  flex: 1;
  min-width: 0;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-size: 14px;
  color: var(--b3-theme-on-background);
}

.task-title-group {
  margin-bottom: 12px;
}

.task-title-input {
  width: 100%;
  min-height: 72px;
  line-height: 1.45;
  font-size: 15px;
  padding: 8px 10px;
  resize: vertical;
}

.due-date-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.due-date-row label {
  margin-bottom: 0;
  white-space: nowrap;
  flex-shrink: 0;
}

.due-date-row .date-input {
  flex: 1;
  min-width: 0;
}

.meta-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  margin-bottom: 16px;
}

.meta-row .form-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  margin-bottom: 0;
}

.meta-row .form-group label {
  margin-bottom: 0;
  white-space: nowrap;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
}

.meta-row .form-group .b3-select {
  flex: 1;
  min-width: 0;
}

.date-input {
  display: block;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  padding: 4px 8px;
  background: var(--b3-list-hover);
  border: none;
  border-radius: 6px;
  color: var(--b3-theme-on-background);
  font-size: 14px;
}

.task-description-input {
  width: 100%;
  min-height: 56px;
  line-height: 1.45;
  resize: vertical;
}

.task-modal-quick-panel {
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 8px;
  border: 1px solid var(--b3-theme-border);
  margin-bottom: 12px;
}

.task-modal-quick-panel.is-date {
  padding: 0;
  border: none;
  background: transparent;
}

.task-modal-group-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid var(--b3-theme-border);
  background: var(--b3-list-hover);
  margin-bottom: 12px;
}

.task-modal-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.task-modal-group-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--b3-theme-on-background);
}

.task-modal-goal-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid var(--b3-border-color);
}

.task-modal-goal-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--b3-theme-on-surface);
}

.task-modal-group-manage {
  border: none;
  background: none;
  cursor: pointer;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
}

.task-modal-group-manage:hover {
  color: var(--b3-theme-on-background);
}

.task-modal-group-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.task-modal-group-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  border: none;
  background: var(--group-chip-bg, var(--b3-list-hover));
  color: var(--group-chip-color, var(--b3-theme-on-surface));
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
}

.task-modal-group-chip.active {
  background: #f98f7a;
  color: var(--b3-theme-background);
  box-shadow: none;
}

.task-modal-goal-chip {
  background: var(--b3-theme-background);
}

.task-modal-goal-chip-emoji {
  line-height: 1;
}

.task-modal-group-chip-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.28);
  color: inherit;
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
}

.task-modal-group-chip:hover {
  color: var(--group-chip-color, var(--b3-theme-on-background));
}

.task-modal-group-chip-label {
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}


.task-modal-quick-panel textarea,
.task-modal-quick-panel input[type="date"] {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid var(--b3-theme-border);
  border-radius: 6px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  font-size: 12px;
  font-family: inherit;
}

.task-modal-quick-panel textarea:focus,
.task-modal-quick-panel input[type="date"]:focus {
  outline: none;
  border-color: #f98f7a;
}

.task-modal-action-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-start;
}

.task-modal-action-btn {
  flex: 0 0 auto;
  width: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  border-radius: 8px;
  border: 1px solid var(--b3-theme-border);
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  cursor: pointer;
  font-size: 12px;
}

.task-modal-group-btn {
  min-width: 0;
}

.task-modal-group-button-label {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-modal-action-btn.is-active {
  border-color: #f98f7a;
  box-shadow: 0 0 0 1px #f98f7a inset;
}

.task-modal-action-value {
  margin-left: auto;
  font-size: 11px;
  opacity: 0.7;
}

.task-modal-priority-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-footer {
  padding: 16px 20px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.confirm-button {
  background-color: #f98f7a;
  color: var(--b3-theme-background);
  font-weight: bold;
  border: none;
  border-radius: 24px;
  padding: 6px 12px;
}

.confirm-button:hover {
  background-color: #e55a47;
}

.confirm-button:active {
  background-color: #dc4a33;
}
</style>
