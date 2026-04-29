<template>
  <div class="goal-panel-root">
    <div class="goal-panel-body">
      <div class="goal-panel goal-list-panel">
        <div class="goal-panel-header">
          <span>目标列表</span>
          <SyButton class="goal-add-button" size="small" @click="addGoal">新增目标</SyButton>
        </div>

        <div v-if="localGoals.length === 0" class="goal-empty">
          还没有目标，先创建一个吧。
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
                class="goal-emoji-btn"
                aria-label="切换目标图标"
                title="切换目标图标"
                @click.stop="openGoalEmojiPicker(goal.id, $event)"
              >
                <span class="goal-emoji-display">{{ goal.emoji || '🎯' }}</span>
              </button>
              <SyInput
                class="goal-name-input"
                :model-value="goal.name"
                placeholder="输入目标名称"
                @update:model-value="updateGoalName(goal.id, $event)"
              />
              <span class="goal-count">{{ goal.members.length }}</span>
              <button
                type="button"
                class="goal-delete"
                aria-label="删除目标"
                title="删除目标"
                @click.stop="removeGoal(goal.id)"
              >
                <Icon name="trash" width="16" height="16" />
              </button>
            </div>
          </button>
        </div>
      </div>

      <div class="goal-panel goal-document-panel">
        <div class="goal-panel-header">
          <div class="goal-panel-header-main">
            <span>目标文档</span>
            <span v-if="selectedGoal" class="goal-current">{{ selectedGoal.name || '未命名目标' }}</span>
          </div>
          <span class="goal-panel-note">这里只显示当前已有任务的文档</span>
        </div>

        <div v-if="!selectedGoal" class="goal-empty">
          先在左侧选中一个目标，再把文档加入它。
        </div>
        <template v-else>
          <SyInput
            class="goal-search-input"
            :model-value="documentSearch"
            placeholder="搜索文档"
            @update:model-value="documentSearch = $event"
          />
          <div v-if="filteredDocuments.length === 0" class="goal-empty">
            当前没有可选文档。
          </div>
          <div v-else class="goal-checkbox-list">
            <label
              v-for="document in filteredDocuments"
              :key="document.key"
              class="goal-checkbox-item"
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
              <span class="goal-checkbox-text">
                <span class="goal-checkbox-name">{{ document.name }}</span>
                <span class="goal-checkbox-meta">{{ document.notebookName }}</span>
              </span>
              <input
                class="goal-checkbox-input"
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
import { openEmoji } from 'siyuan';
import Icon from '@/components/Icon.vue';
import SyButton from '@/components/SiyuanTheme/SyButton.vue';
import SyInput from '@/components/SiyuanTheme/SyInput.vue';
import type { GoalScopeDocument } from '@/utils/goalScopeDocuments';
import type { Goal } from '@/goalRepository';

interface Props {
  goals: Goal[];
  documents: GoalScopeDocument[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:goals': [goals: Goal[]];
}>();

const localGoals = ref<Goal[]>([]);
const selectedGoalId = ref('');
const documentSearch = ref('');

function cloneGoals(goals: Goal[]): Goal[] {
  return (goals || []).map(goal => ({
    ...goal,
    members: Array.isArray(goal.members) ? goal.members.map(member => ({ ...member })) : []
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

function updateGoalName(goalId: string, value: string): void {
  emitGoals(localGoals.value.map(goal => (
    goal.id === goalId
      ? { ...goal, name: value }
      : goal
  )));
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
    hideDynamicIcon: true,
    hideCustomIcon: true
  });
}

function addGoal(): void {
  const nowIso = new Date().toISOString();
  const nextGoal: Goal = {
    id: generateGoalId(),
    emoji: '🎯',
    name: '新目标',
    members: [],
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

  if (!confirm(`删除目标“${currentGoal.name || '未命名目标'}”？`)) {
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
  font-size: 11px;
  color: var(--b3-theme-on-surface-light);
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

.goal-item {
  width: 100%;
  padding: 4px;
  border: 1px solid var(--b3-border-color);
  border-radius: 10px;
  background: var(--b3-theme-background);
  cursor: pointer;
  text-align: left;
}

.goal-item.active {
  border-color: #f98f7a;
}

.goal-item-main {
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
}
</style>
