<template>
  <Transition name="fade">
    <div
      v-show="show"
      class="modal-overlay"
      :class="{ 'is-centered': isCenteredPresentation }"
      :style="overlayStyle"
      @click.self="handleClose"
    >
      <Transition :name="contentTransitionName">
        <div
          class="modal-content"
          :class="{ 'is-centered': isCenteredPresentation, 'is-quick-create': true }"
          @click.stop
          v-show="show"
        >
          <div class="modal-header">
            <h3>{{ createHeading ? tt('kanbanView.newHeadingAndTask') : tt('taskManager.newTask') }}</h3>
            <button
              type="button"
              class="icon-button ariaLabel"
              :aria-label="tt('common.close')"
              @click.stop="handleClose"
            >
              <Icon name="close" width="16" height="16" />
            </button>
          </div>
          <div class="modal-body quick-create-modal-body">
                <div
                  class="quick-create-target-row"
                  :class="{ 'is-special': quickCreateLocation !== 'last' }"
                >
                  <div class="quick-create-field">
                    <label>{{ tt('taskScopeDialog.defaultTaskCreateTarget') }}</label>
                    <SySelect
                      v-model="quickCreateLocation"
                      :options="quickCreateLocationOptions"
                      @update:model-value="handleQuickCreateLocationChange"
                    />
                  </div>
                  <div class="quick-create-field">
                    <label>{{ tt('taskManager.notebook') }}</label>
                    <SySelect
                      v-model="selectedNotebook"
                      :options="notebookOptions"
                      @update:model-value="handleNotebookChange"
                    />
                  </div>
                  <div v-if="quickCreateLocation === 'last'" class="quick-create-field">
                    <label>{{ tt('taskManager.document') }}</label>
                    <SySelect v-model="selectedDocument" :options="documentOptions" />
                  </div>
                </div>
                <div v-if="createHeading" class="quick-create-heading-field">
                  <label>{{ tt('kanbanView.newHeading') }}</label>
                  <input
                    ref="quickCreateHeadingRef"
                    v-model="headingTitle"
                    class="quick-create-heading-input b3-text-field"
                    type="text"
                    :placeholder="tt('kanbanView.enterHeadingName')"
                  />
                </div>
                <div ref="quickCreateProtyleMountRef" class="quick-create-protyle"></div>
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
          </div>
          <div class="modal-footer task-modal-footer">
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
            <div class="quick-create-submit-group">
                  <button type="button" class="quick-create-btn confirm" :disabled="isSubmittingQuickCreate" @click="handleSubmit">
                    {{ tt('kanbanView.create', tt('taskManager.save')) }}
                  </button>
                  <button
                    type="button"
                    class="quick-create-submit-arrow quick-create-btn confirm ariaLabel"
                    :disabled="isSubmittingQuickCreate"
                    :aria-label="tt('kanbanView.create', tt('taskManager.save'))"
                    @click.stop="quickCreateShortcutMenuOpen = !quickCreateShortcutMenuOpen"
                  >
                    <Icon name="chevronDown" width="16" height="16" />
                  </button>
                  <div v-if="quickCreateShortcutMenuOpen" class="quick-create-shortcut-menu">
                    <button
                      type="button"
                      :class="{ active: quickCreateSubmitShortcut === 'enter' }"
                      @click="selectQuickCreateShortcut('enter')"
                    >
                      <span class="quick-create-shortcut-menu-check" aria-hidden="true">
                        <Icon v-if="quickCreateSubmitShortcut === 'enter'" name="taskCheckboxChecked" width="12" height="12" />
                      </span>
                      <span>{{ tt('taskManager.createWithEnter', '按 Enter 键创建') }}</span>
                    </button>
                    <button
                      type="button"
                      :class="{ active: quickCreateSubmitShortcut === 'ctrl-enter' }"
                      @click="selectQuickCreateShortcut('ctrl-enter')"
                    >
                      <span class="quick-create-shortcut-menu-check" aria-hidden="true">
                        <Icon v-if="quickCreateSubmitShortcut === 'ctrl-enter'" name="taskCheckboxChecked" width="12" height="12" />
                      </span>
                      <span>{{ tt('taskManager.createWithCtrlEnter', '按 Ctrl + Enter 键创建') }}</span>
                    </button>
                  </div>
            </div>
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
import { Protyle } from 'siyuan';
import SySelect from '@/components/SiyuanTheme/SySelect.vue';
import Icon from '@/components/Icon.vue';
import EmojiIcon from '@/components/EmojiIcon.vue';
import PriorityPopover from '@/components/PriorityPopover.vue';
import TaskDatePopover from '@/components/TaskDatePopover.vue';
import TaskReminderPopover from '@/components/TaskReminderPopover.vue';
import { useI18n } from '@/composables/useI18n';
import {
  TaskRepository,
  createDailyNote,
  createDocWithMd,
  deleteBlock,
  getBlockDOM,
  getBlockKramdown,
  getHPathByID,
  getIDsByHPath,
  pushMsg,
  setBlockAttrs,
  updateBlock,
  type TaskPriority,
  type TaskStatus,
  type TaskGroup
} from '@/api';
import { formatMonthDay } from '@/utils/dateHelpers';
import { resolveGroupColorCss, resolveGroupColorLayerCss, resolveGroupTextColor } from '@/utils/groupColor';
import {
  TASK_GROUP_NONE_ID,
  buildTaskGroupOptions
} from '@/utils/taskGroupShared';
import { TASK_PRIORITY_STYLES } from '@/utils/taskPriority';
import { buildTaskTagState, toggleTaskTagSelection } from '@/utils/taskTags';
import {
  getTaskReminderLabel,
  type TaskReminderSelection,
  type TaskReminderType
} from '@/utils/taskReminder';
import { PINCH_DAILY_NOTE_OPTION_ID, PINCH_INBOX_OPTION_ID, isPinchInboxValue } from '@/utils/pinchInbox';
import { PINCH_INBOX_PATH } from '@/utils/pinchInbox';
import { buildTaskTagAttrs } from '@/utils/taskTags';
import { extractQuickCreateDraftTitle } from '@/utils/quickCreateDraftTitle';
import type { Goal } from '@/goalRepository';
import { usePlugin } from '@/main';
import { eventBus, Events } from '@/utils/eventBus';

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

export interface QuickCreateTarget {
  notebookId: string;
  documentId: string;
  docPath: string;
}

export interface QuickCreateTaskContext {
  status?: TaskStatus;
  groupId?: string;
  startDate?: string;
  dueDate?: string;
  startTime?: string;
  dueTime?: string;
}

export interface QuickCreateCreatedPayload {
  blockId: string;
  taskId: string;
  notebookId: string;
  documentId: string;
  docPath: string;
  headingTitle?: string;
  task: NewTask;
}

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
  resolveTarget?: (notebookId: string, documentId: string) => Promise<QuickCreateTarget | null>;
  taskContext?: QuickCreateTaskContext;
  createHeading?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  'manage-groups': [];
  created: [payload: QuickCreateCreatedPayload];
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
watch(localTask, () => {
  if (quickCreateDraft) {
    void persistQuickCreateDraftMetadata();
  }
}, { deep: true });
const selectedNotebook = ref<string>('');
const selectedDocument = ref<string>('');
const quickCreateLocation = ref<'last' | 'inbox' | 'daily-note'>('last');
const headingTitle = ref('');
const quickCreateHeadingRef = ref<HTMLInputElement | null>(null);
const quickCreateProtyleMountRef = ref<HTMLElement | null>(null);
const quickCreateSubmitShortcut = ref<'enter' | 'ctrl-enter'>('ctrl-enter');
const quickCreateShortcutMenuOpen = ref(false);
let quickCreateProtyle: Protyle | null = null;
let quickCreateDraft: (QuickCreateTarget & { blockId: string; taskId: string }) | null = null;
let isInitializingQuickCreateDraft = false;
let isRelocatingQuickCreateDraft = false;
const isSubmittingQuickCreate = ref(false);
let pendingRelocationTitle = '';
let shouldReinitializeQuickCreateDraft = false;
const taskModalQuickPanel = ref<'due' | 'description' | 'group' | 'reminder' | null>(null);
const taskModalPriorityPopover = ref<{
  position: { x: number; y: number };
  placement: 'bottom' | 'top';
} | null>(null);
const taskModalDescriptionRef = ref<HTMLTextAreaElement | null>(null);
const taskModalDueButtonRef = ref<HTMLButtonElement | null>(null);
const taskModalReminderButtonRef = ref<HTMLButtonElement | null>(null);

const taskModalPriorityStyle = computed(() =>
  TASK_PRIORITY_STYLES[localTask.value.priority] || TASK_PRIORITY_STYLES.none
);

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

const taskModalGroupOptions = computed(() => buildTaskGroupOptions(
  props.groups || [],
  {
    none: tt('taskManager.noTag'),
    fallback: tt('taskManager.untitledTag')
  },
  { includeColor: true }
));

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

const quickCreateLocationOptions = computed(() => [
  { value: 'last', text: tt('taskScopeDialog.defaultTaskCreateTargetLast') },
  { value: 'inbox', text: tt('taskScopeDialog.defaultTaskCreateTargetInbox') },
  { value: 'daily-note', text: tt('taskScopeDialog.defaultTaskCreateTargetDailyNote') }
]);

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

function handleQuickCreateLocationChange(value: string): void {
  const location = value === 'inbox' || value === 'daily-note' ? value : 'last';
  quickCreateLocation.value = location;
  if (location === 'inbox') {
    selectedDocument.value = PINCH_INBOX_OPTION_ID;
  } else if (location === 'daily-note') {
    selectedDocument.value = PINCH_DAILY_NOTE_OPTION_ID;
  } else {
    const preferredDocument = props.lastSelectedDocument || '';
    const hasPreferredDocument = props.documents.some(item =>
      item.id === preferredDocument && item.notebookId === selectedNotebook.value
    );
    selectedDocument.value = hasPreferredDocument
      ? preferredDocument
      : getInboxDocumentValue(selectedNotebook.value);
  }
}

function selectQuickCreateShortcut(shortcut: 'enter' | 'ctrl-enter'): void {
  quickCreateSubmitShortcut.value = shortcut;
  quickCreateShortcutMenuOpen.value = false;
}

function handleQuickCreateProtyleKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Enter' || event.isComposing || !quickCreateDraft) {
    return;
  }
  const shouldSubmit = quickCreateSubmitShortcut.value === 'enter'
    ? !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey
    : (event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey;
  if (!shouldSubmit) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  void handleSubmit();
}

function normalizeNotebookDocPath(notebookId: string, hPath: string): string {
  const notebook = props.notebooks.find(item => item.id === notebookId);
  const normalizedPath = hPath.startsWith('/') ? hPath : `/${hPath}`;
  const notebookPrefix = notebook?.name ? `/${notebook.name}/` : '';
  return notebookPrefix && normalizedPath.startsWith(notebookPrefix)
    ? `/${normalizedPath.slice(notebookPrefix.length)}`
    : normalizedPath;
}

async function ensureInboxDocument(notebookId: string): Promise<string> {
  try {
    const existingIds = await getIDsByHPath(notebookId, PINCH_INBOX_PATH);
    if (existingIds.length > 0) {
      return PINCH_INBOX_PATH;
    }
  } catch {
  }
  await createDocWithMd(notebookId, PINCH_INBOX_PATH, '');
  return PINCH_INBOX_PATH;
}

async function ensureDailyNoteDocument(notebookId: string): Promise<string> {
  const result = await createDailyNote(notebookId);
  if (result && typeof result === 'object') {
    const directPath = typeof result.path === 'string' && result.path.trim()
      ? result.path.trim()
      : typeof result.hPath === 'string' && result.hPath.trim()
        ? result.hPath.trim()
        : '';
    if (directPath) {
      return normalizeNotebookDocPath(notebookId, directPath);
    }
  }
  const dailyNoteId = typeof result === 'string'
    ? result
    : result && typeof result === 'object'
      ? result.id || result.rootId || ''
      : '';
  if (!dailyNoteId) {
    throw new Error('Failed to create daily note');
  }
  const hPath = await getHPathByID(dailyNoteId);
  if (!hPath) {
    throw new Error('Failed to resolve daily note path');
  }
  return normalizeNotebookDocPath(notebookId, hPath);
}

async function resolveQuickCreateTarget(): Promise<QuickCreateTarget | null> {
  const notebookId = selectedNotebook.value;
  const documentId = selectedDocument.value;
  if (!notebookId) {
    return null;
  }
  if (props.resolveTarget) {
    return props.resolveTarget(notebookId, documentId);
  }
  if (documentId === PINCH_INBOX_OPTION_ID) {
    return { notebookId, documentId, docPath: await ensureInboxDocument(notebookId) };
  }
  if (documentId === PINCH_DAILY_NOTE_OPTION_ID) {
    return { notebookId, documentId, docPath: await ensureDailyNoteDocument(notebookId) };
  }
  const document = props.documents.find(item => item.id === documentId && item.notebookId === notebookId);
  const documentPath = document?.path || await getHPathByID(documentId).catch(() => '');
  if (!documentPath) {
    return null;
  }
  return { notebookId, documentId, docPath: normalizeNotebookDocPath(notebookId, documentPath) };
}

async function resolveQuickCreateParagraphBlockId(taskBlockId: string): Promise<string> {
  try {
    const response = await getBlockDOM(taskBlockId) as { dom?: string } | null;
    const paragraph = response?.dom
      ? new DOMParser().parseFromString(response.dom, 'text/html').querySelector<HTMLElement>('[data-type="NodeParagraph"][data-node-id]')
      : null;
    return paragraph?.dataset.nodeId || taskBlockId;
  } catch {
    return taskBlockId;
  }
}

function destroyQuickCreateProtyle(): void {
  if (quickCreateProtyle) {
    try {
      quickCreateProtyle.destroy();
    } catch {
    }
  }
  quickCreateProtyle = null;
  quickCreateProtyleMountRef.value?.removeEventListener('keydown', handleQuickCreateProtyleKeydown, true);
  quickCreateProtyleMountRef.value?.replaceChildren();
}

function focusQuickCreateProtyle(): void {
  let attempts = 0;
  const focus = () => {
    const editable = quickCreateProtyleMountRef.value?.querySelector<HTMLElement>('[contenteditable="true"]');
    if (!editable && attempts++ < 12) {
      window.requestAnimationFrame(focus);
      return;
    }
    editable?.focus();
  };
  window.requestAnimationFrame(focus);
}

function normalizeHeadingTitle(value: string): string {
  return value
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^#+\s*/, '')
    .trim();
}

async function persistQuickCreateDraftMetadata(): Promise<void> {
  if (!quickCreateDraft) {
    return;
  }
  const tagState = buildTaskTagState(localTask.value.tags, localTask.value.groupId);
  const tagAttrs = buildTaskTagAttrs(tagState.tagIds, tagState.primaryTagId);
  await setBlockAttrs(quickCreateDraft.blockId, {
    'custom-task-priority': localTask.value.priority || 'none',
    'custom-task-description': localTask.value.description || '',
    'custom-task-due-date': localTask.value.dueDate || '',
    'custom-task-reminder-type': localTask.value.reminderType || '',
    'custom-task-reminder-custom-time': localTask.value.reminderCustomTime || '',
    'custom-task-group': tagAttrs.attrs['custom-task-group'] || '',
    'custom-task-tags': tagAttrs.attrs['custom-task-tags'] || ''
  });
}

async function initializeQuickCreateDraft(): Promise<void> {
  if (
    !props.show
    || quickCreateDraft
    || quickCreateProtyle
    || isInitializingQuickCreateDraft
  ) {
    return;
  }
  isInitializingQuickCreateDraft = true;
  const requestedTargetKey = `${selectedNotebook.value}:${selectedDocument.value}`;
  try {
    const plugin = usePlugin();
    const target = await resolveQuickCreateTarget();
    if (!plugin?.app || !target) {
      return;
    }
    const context = props.taskContext || {};
    const groupId = context.groupId || localTask.value.groupId || undefined;
    const created = await TaskRepository.createBlockTask({
      // The temporary marker satisfies Siyuan's non-empty task constraint.
      title: '\u200B',
      description: '',
      priority: localTask.value.priority || 'none',
      status: context.status || 'pending',
      startDate: context.startDate,
      dueDate: context.dueDate || localTask.value.dueDate || undefined,
      startTime: context.startTime,
      dueTime: context.dueTime,
      tags: localTask.value.tags,
      groupId
    }, target.notebookId, target.docPath, { emitTaskAdded: false });
    const currentTargetKey = `${selectedNotebook.value}:${selectedDocument.value}`;
    if (!props.show || currentTargetKey !== requestedTargetKey) {
      await deleteQuickCreateDraftBlock(created.blockId);
      shouldReinitializeQuickCreateDraft = props.show;
      return;
    }
    quickCreateDraft = { ...target, blockId: created.blockId, taskId: created.taskId };
    if (pendingRelocationTitle) {
      await updateBlock('markdown', `* [ ] ${pendingRelocationTitle}`, created.blockId);
      pendingRelocationTitle = '';
    }
    await persistQuickCreateDraftMetadata();
    const paragraphId = await resolveQuickCreateParagraphBlockId(created.blockId);
    await nextTick();
    const mount = quickCreateProtyleMountRef.value;
    if (!mount || !props.show) {
      return;
    }
    quickCreateProtyle = new Protyle(plugin.app, mount, {
      blockId: paragraphId,
      mode: 'wysiwyg',
      render: { breadcrumb: false }
    });
    mount.addEventListener('keydown', handleQuickCreateProtyleKeydown, true);
    if (props.createHeading) {
      quickCreateHeadingRef.value?.focus();
    } else {
      focusQuickCreateProtyle();
    }
  } catch (error) {
    console.error('[QuickCreateTaskModal] Failed to initialize draft:', error);
    await pushMsg(tt('kanbanView.createTaskFailedRetry'), 3000);
  } finally {
    isInitializingQuickCreateDraft = false;
    if (shouldReinitializeQuickCreateDraft && props.show) {
      shouldReinitializeQuickCreateDraft = false;
      void nextTick(initializeQuickCreateDraft);
    }
  }
}

async function discardQuickCreateDraft(): Promise<void> {
  const draft = quickCreateDraft;
  quickCreateDraft = null;
  destroyQuickCreateProtyle();
  if (draft) {
    await deleteQuickCreateDraftBlock(draft.blockId);
  }
}

async function deleteQuickCreateDraftBlock(blockId: string): Promise<void> {
  try {
    await deleteBlock(blockId);
    await TaskRepository.clearCache();
    eventBus.emit(Events.TASK_DELETED, { blockId });
  } catch (error) {
    console.error('[QuickCreateTaskModal] Failed to delete draft:', error);
  }
}

async function recreateQuickCreateDraft(): Promise<void> {
  if (!props.show || isRelocatingQuickCreateDraft) {
    return;
  }
  isRelocatingQuickCreateDraft = true;
  try {
    pendingRelocationTitle = quickCreateDraft
      ? await readQuickCreateDraftTitle(quickCreateDraft.blockId)
      : '';
    await discardQuickCreateDraft();
    await nextTick();
    await initializeQuickCreateDraft();
  } finally {
    isRelocatingQuickCreateDraft = false;
  }
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
    headingTitle.value = '';
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
    const rawPreferredDocument = props.lastSelectedDocument || '';
    const preferredDocument = rawPreferredDocument === PINCH_INBOX_OPTION_ID
      ? fallbackDocumentValue
      : rawPreferredDocument;
    const isSpecialDocument = preferredDocument === PINCH_DAILY_NOTE_OPTION_ID;
    const hasPreferredDocument = !!props.lastSelectedDocument
      && (isSpecialDocument || docsForNotebook.some(doc => doc.id === preferredDocument));
    selectedDocument.value = hasPreferredDocument
      ? preferredDocument!
      : fallbackDocumentValue;
    quickCreateLocation.value = rawPreferredDocument === PINCH_INBOX_OPTION_ID
      ? 'inbox'
      : selectedDocument.value === PINCH_INBOX_OPTION_ID
      ? 'inbox'
      : selectedDocument.value === PINCH_DAILY_NOTE_OPTION_ID
        ? 'daily-note'
        : 'last';
    void nextTick(initializeQuickCreateDraft);
  } else if (quickCreateDraft) {
    void discardQuickCreateDraft();
  }
});

watch([selectedNotebook, selectedDocument], () => {
  if (!props.show) return;
  if (quickCreateDraft) {
    void recreateQuickCreateDraft();
  } else if (isInitializingQuickCreateDraft) {
    shouldReinitializeQuickCreateDraft = true;
  } else {
    void initializeQuickCreateDraft();
  }
});

onMounted(() => {
  document.addEventListener('mousedown', handleTaskModalOutsideClick, true);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleTaskModalOutsideClick, true);
  void discardQuickCreateDraft();
});

async function readQuickCreateDraftTitle(blockId: string): Promise<string> {
  try {
    const response = await getBlockKramdown(blockId) as { kramdown?: string } | string | null;
    const markdown = typeof response === 'string'
      ? response
      : typeof response?.kramdown === 'string'
        ? response.kramdown
        : '';
    return extractQuickCreateDraftTitle(markdown);
  } catch {
    return '';
  }
}

async function handleClose(): Promise<void> {
  quickCreateShortcutMenuOpen.value = false;
  await discardQuickCreateDraft();
  emit('close');
}

async function handleSubmit(): Promise<void> {
  if (isSubmittingQuickCreate.value) return;
  isSubmittingQuickCreate.value = true;
  try {
    const draft = quickCreateDraft;
    if (!draft) {
      await initializeQuickCreateDraft();
      return;
    }
    await persistQuickCreateDraftMetadata();
    const title = await readQuickCreateDraftTitle(draft.blockId);
    if (!title) {
      await pushMsg(tt('kanbanView.enterTaskTitle'), 2000);
      return;
    }
    const normalizedHeadingTitle = props.createHeading
      ? normalizeHeadingTitle(headingTitle.value)
      : '';
    if (props.createHeading && !normalizedHeadingTitle) {
      await pushMsg(tt('kanbanView.enterHeadingName'), 2000);
      return;
    }
    const tagState = buildTaskTagState(localTask.value.tags, localTask.value.groupId);
    const createdTask: NewTask = {
      ...localTask.value,
      title,
      status: props.taskContext?.status || localTask.value.status || 'pending',
      tags: tagState.tagIds,
      groupId: tagState.primaryTagId,
      goalIds: [...localTask.value.goalIds]
    };
    quickCreateDraft = null;
    destroyQuickCreateProtyle();
    emit('created', {
      ...draft,
      headingTitle: normalizedHeadingTitle || undefined,
      task: createdTask
    });
  } finally {
    isSubmittingQuickCreate.value = false;
  }
}
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
  z-index: 8;
}

.modal-overlay.is-centered {
  align-items: center;
  box-sizing: border-box;
}

.modal-content {
  background-color: color-mix(in srgb, var(--b3-body-background) 50%, var(--b3-theme-background));
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

.modal-content.is-quick-create {
  width: min(540px, calc(100vw - 32px));
  min-width: 0;
  max-height: calc(100dvh - 24px);
  border-radius: 16px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
}

.quick-create-modal-body {
  padding-top: 12px;
}

.quick-create-target-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 14px;
}

.quick-create-target-row.is-special {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.quick-create-field {
  min-width: 0;
}

.quick-create-field label {
  display: block;
  margin: 0 0 6px 2px;
  color: var(--b3-theme-on-surface);
  font-size: 14px;
}

.quick-create-field :deep(.sy-select),
.quick-create-field :deep(.b3-select),
.quick-create-field :deep(select) {
  width: 100%;
  min-width: 0;
}

.quick-create-heading-field {
  margin-bottom: 14px;
}

.quick-create-heading-field label {
  display: block;
  margin: 0 0 6px 2px;
  color: var(--b3-theme-on-surface);
  font-size: 14px;
}

.quick-create-heading-input {
  display: block;
  width: 100%;
  box-sizing: border-box;
}

.quick-create-protyle {
  display: block;
  width: 100%;
  height: 80px !important;
  min-height: 80px !important;
  max-height: 80px !important;
  flex: 0 0 80px;
  box-sizing: border-box;
  border: 0;
  border-radius: 14px;
  overflow: auto;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
}

.quick-create-protyle :deep(.protyle),
.quick-create-protyle :deep(.protyle-content) {
  height: 80px !important;
  min-height: 80px !important;
  max-height: 80px !important;
  overflow: hidden !important;
}

.quick-create-protyle :deep(.protyle-wysiwyg) {
  height: 80px !important;
  min-height: 80px !important;
  max-height: 80px !important;
  box-sizing: border-box;
  overflow-y: auto !important;
  padding: 14px !important;
}

.quick-create-submit-group {
  position: relative;
  display: inline-flex;
  margin-left: auto;
}

.quick-create-btn {
  border: 0;
  cursor: pointer;
  padding: 8px 18px;
  font-size: 15px;
  color: #fff;
  background: #f98f7a;
}

.quick-create-submit-group .quick-create-btn:first-child {
  border-radius: 12px 0 0 12px;
}

.quick-create-submit-arrow {
  min-width: 34px;
  padding-inline: 8px;
  border-left: 1px solid rgba(255, 255, 255, 0.45);
  border-radius: 0 12px 12px 0;
}

.quick-create-shortcut-menu {
  position: absolute;
  right: 0;
  bottom: calc(100% + 8px);
  z-index: 15;
  min-width: 218px;
  padding: 6px;
  border: 1px solid var(--b3-theme-border);
  border-radius: 10px;
  background: var(--b3-theme-background);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.16);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.quick-create-shortcut-menu button {
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--b3-theme-on-surface);
  font-size: 12px;
  line-height: 1;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.quick-create-shortcut-menu-check {
  display: inline-flex;
  width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
  color: #f98f7a;
  line-height: 0;
}

.quick-create-shortcut-menu button:hover {
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
}

.quick-create-shortcut-menu button.active {
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  font-weight: 600;
}

@media (max-width: 768px) {
  .modal-overlay.is-centered {
    padding: calc(16px + env(safe-area-inset-top, 0px)) 16px calc(16px + env(safe-area-inset-bottom, 0px));
    z-index: 80;
  }

  .modal-content.is-centered {
    max-height: calc(100dvh - 32px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
  }

  .modal-content.is-quick-create {
    width: 100%;
    max-height: calc(100dvh - 16px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
  }

  .quick-create-target-row,
  .quick-create-target-row.is-special {
    grid-template-columns: 1fr;
    gap: 8px;
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
  border-radius: 10px;
  border: 1px solid var(--b3-theme-border);
  margin-top: 12px;
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
  margin-right: auto;
}

.modal-footer.task-modal-footer {
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 20px 16px;
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
