<template>
  <Transition name="fade">
    <div v-show="show" class="modal-overlay" @click.self="emit('close')">
      <Transition name="slide">
        <div class="modal-content" @click.stop v-show="show">
          <div class="modal-header">
            <h3>{{ tt('taskManager.newTask', '新建任务') }}</h3>
            <button @click="emit('close')" class="icon-button">
              <svg viewBox="0 0 1026 1024" width="16" height="16" class="icon" xmlns="http://www.w3.org/2000/svg">
                <path d="M39.156558 39.219619a133.725281 133.725281 0 0 1 189.221272 0L984.594293 795.703532a133.725281 133.725281 0 0 1-189.221272 189.087547L39.156558 228.307166a133.725281 133.725281 0 0 1 0-189.087547z m0 756.483913L795.373021 39.219619a133.725281 133.725281 0 0 1 189.221272 189.087547L228.37783 984.791079a133.792143 133.792143 0 1 1-189.221272-189.288135z"></path>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="filters-row">
              <div class="form-group filter-group">
                <label>{{ tt('taskManager.notebook', '笔记本') }}</label>
                <SySelect v-model="selectedNotebook" :options="notebookOptions" @update:modelValue="handleNotebookChange" />
              </div>
              <div class="form-group filter-group" v-if="selectedNotebook">
                <label>{{ tt('taskManager.document', '文档') }}</label>
                <SySelect v-model="selectedDocument" :options="documentOptions" />
              </div>
            </div>
            <div class="form-group">
              <label>{{ tt('taskManager.taskTitle', '任务标题') }}</label>
              <SyInput v-model="localTask.title" :placeholder="tt('taskManager.taskTitlePlaceholder', '请输入任务标题')" />
            </div>
            <div class="form-group">
              <label>{{ tt('taskManager.taskDescription', '任务描述') }}</label>
              <textarea
                v-model="localTask.description"
                class="task-description-input b3-text-field"
                rows="2"
                :placeholder="tt('taskManager.taskDescriptionPlaceholder', '请输入任务描述（可选）')"
              ></textarea>
            </div>
            <div class="meta-row">
              <div class="form-group">
                <label>{{ tt('taskManager.priority', '优先级') }}</label>
                <SySelect v-model="localTask.priority" :options="priorityOptions" />
              </div>
              <div class="form-group">
                <label>{{ tt('taskManager.status', '状态') }}</label>
                <SySelect v-model="localTask.status" :options="statusOptions" />
              </div>
            </div>
            <div class="form-group due-date-row">
              <label>{{ tt('taskManager.dueDate', '截止日期') }}</label>
              <input type="date" v-model="localTask.dueDate" class="date-input" />
            </div>
          </div>
          <div class="modal-footer">
            <SyButton @click="handleSubmit" class="confirm-button">{{ tt('taskManager.save', '保存') }}</SyButton>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import SyButton from '@/components/SiyuanTheme/SyButton.vue';
import SyInput from '@/components/SiyuanTheme/SyInput.vue';
import SySelect from '@/components/SiyuanTheme/SySelect.vue';
import type { TaskPriority, TaskStatus } from '@/api';

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

const PINCH_INBOX_OPTION_ID = '__pinch_inbox__';
const PINCH_INBOX_OPTION_NAME = 'pinch收集箱';

interface NewTask {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  tags: string[];
}

interface Props {
  show: boolean;
  t: (key: string) => string;
  notebooks: Notebook[];
  documents: Document[];
  lastSelectedNotebook?: string;
  lastSelectedDocument?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  submit: [task: NewTask, notebookId: string, documentId: string];
}>();

const priorityOptions = [
  { value: 'none', text: '' },
  { value: 'high', text: '' },
  { value: 'medium', text: '' },
  { value: 'low', text: '' }
];

const statusOptions = [
  { value: 'pending', text: '' },
  { value: 'in-progress', text: '' },
  { value: 'completed', text: '' },
  { value: 'cancelled', text: '' }
];

const defaultTask: NewTask = {
  title: '',
  description: '',
  priority: 'none',
  status: 'pending',
  dueDate: '',
  tags: []
};

const localTask = ref<NewTask>({ ...defaultTask });
const selectedNotebook = ref<string>('');
const selectedDocument = ref<string>('');

const notebookOptions = computed(() => {
  return props.notebooks.map(nb => ({ value: nb.id, text: nb.name }));
});

function isInboxDocument(doc: Document): boolean {
  const normalizedName = (doc.name || '').trim();
  const normalizedPath = (doc.path || '').replace(/^\/+/, '').trim();
  return normalizedName === PINCH_INBOX_OPTION_NAME || normalizedPath === PINCH_INBOX_OPTION_NAME;
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
  if (hasInboxDoc) {
    return docOptions;
  }
  return [{ value: PINCH_INBOX_OPTION_ID, text: PINCH_INBOX_OPTION_NAME }, ...docOptions];
});

function tt(key: string, fallback: string): string {
  const translated = props.t?.(key);
  if (!translated || translated === key) {
    return fallback;
  }
  return translated;
}

function handleNotebookChange() {
  selectedDocument.value = getInboxDocumentValue(selectedNotebook.value);
}

watch(() => props.show, (show) => {
  if (show) {
    localTask.value = { ...defaultTask };
    updateOptionTexts();

    const hasPreferredNotebook = !!props.lastSelectedNotebook &&
      props.notebooks.some(nb => nb.id === props.lastSelectedNotebook);
    selectedNotebook.value = hasPreferredNotebook
      ? props.lastSelectedNotebook!
      : (props.notebooks[0]?.id || '');

    const docsForNotebook = props.documents.filter(d => d.notebookId === selectedNotebook.value);
    const fallbackDocumentValue = getInboxDocumentValue(selectedNotebook.value);
    const hasPreferredDocument = !!props.lastSelectedDocument
      && props.lastSelectedDocument !== PINCH_INBOX_OPTION_ID
      && docsForNotebook.some(doc => doc.id === props.lastSelectedDocument);
    selectedDocument.value = hasPreferredDocument
      ? props.lastSelectedDocument!
      : fallbackDocumentValue;
  }
});

watch(() => props.t, () => {
  updateOptionTexts();
});

function updateOptionTexts() {
  priorityOptions[0].text = tt('taskManager.priorityAll', '全部');
  priorityOptions[1].text = tt('taskManager.priorityHigh', '高');
  priorityOptions[2].text = tt('taskManager.priorityMedium', '中');
  priorityOptions[3].text = tt('taskManager.priorityLow', '低');

  statusOptions[0].text = tt('taskManager.statusPending', '待处理');
  statusOptions[1].text = tt('taskManager.statusInProgress', '进行中');
  statusOptions[2].text = tt('taskManager.statusCompleted', '已完成');
  statusOptions[3].text = tt('taskManager.statusCancelled', '已取消');
}

updateOptionTexts();

const handleSubmit = () => {
  const trimmedTitle = localTask.value.title.trim();
  if (trimmedTitle && selectedNotebook.value) {
    emit('submit', { ...localTask.value, title: trimmedTitle }, selectedNotebook.value, selectedDocument.value);
  }
};
</script>

<style scoped>
.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: flex-end;
  z-index: 1000;
}

.modal-content {
  background: var(--b3-theme-background);
  border-radius: 24px 24px 0 0;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15);
  max-height: 85vh;
  overflow-y: auto;
  min-width: 100%;
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
