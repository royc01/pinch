<template>
  <div v-if="show" class="task-scope-overlay" @click.self="handleClose">
    <div class="task-scope-dialog" @click.stop>
      <div class="task-scope-header">
        <div class="task-scope-title">{{ dialogTitle }}</div>
        <button v-if="!lockClose" type="button" class="icon-button" @click="handleClose">
          <Icon name="close" width="14" height="14" class="icon" />
        </button>
      </div>

      <div class="task-scope-hint">
        {{ dialogHint }}
      </div>
      <div class="task-scope-summary">
        已启用 {{ notebooks.length - localExcludedNotebookIds.length }} / {{ notebooks.length }}
      </div>
      <div v-if="showExtra" class="task-scope-extra">
        <span class="task-scope-extra-label">显示已完成任务</span>
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
          暂无可管理笔记本
        </div>
      </div>

      <div class="task-scope-actions">
        <SyButton class="task-scope-btn plain" @click="clearExcluded">全部启用</SyButton>
        <SyButton class="task-scope-btn confirm" @click="save">{{ confirmText || '保存' }}</SyButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Icon from '@/components/Icon.vue';
import SyButton from '@/components/SiyuanTheme/SyButton.vue';
import SyCheckbox from '@/components/SiyuanTheme/SyCheckbox.vue';
import { normalizeNotebookIds } from '@/utils/taskViewShared';

interface NotebookItem {
  id: string;
  name: string;
}

interface Props {
  show: boolean;
  notebooks: NotebookItem[];
  excludedNotebookIds: string[];
  showCompletedTasks?: boolean;
  lockClose?: boolean;
  showExtra?: boolean;
  title?: string;
  hint?: string;
  confirmText?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  save: [excludedNotebookIds: string[], showCompletedTasks: boolean];
}>();

const localExcludedNotebookIds = ref<string[]>([]);
const localShowCompletedTasks = ref(true);
const lockClose = computed(() => props.lockClose === true);
const showExtra = computed(() => props.showExtra !== false);
const dialogTitle = computed(() => props.title || '任务范围');
const dialogHint = computed(() => props.hint || '开关关闭后将排除该笔记本，任务列表和看板不再抓取它的任务。');
const confirmText = computed(() => props.confirmText || '保存');

function syncLocalSelection(): void {
  const visibleNotebookIds = new Set(props.notebooks.map(notebook => notebook.id));
  localExcludedNotebookIds.value = normalizeNotebookIds(props.excludedNotebookIds).filter(id => visibleNotebookIds.has(id));
  localShowCompletedTasks.value = props.showCompletedTasks !== false;
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

function handleClose(): void {
  if (lockClose.value) {
    return;
  }
  emit('close');
}

function save(): void {
  emit('save', normalizeNotebookIds(localExcludedNotebookIds.value), localShowCompletedTasks.value);
}

watch(
  [() => props.show, () => props.excludedNotebookIds, () => props.notebooks, () => props.showCompletedTasks],
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
  z-index: 1200;
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

.task-scope-extra-label {
  font-size: 13px;
  color: var(--b3-theme-on-background);
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
  border-top: 1px solid var(--b3-border-color);
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
</style>
