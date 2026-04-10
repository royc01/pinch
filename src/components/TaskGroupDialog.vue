<template>
  <div v-if="show" class="task-group-overlay" @click.self="emit('close')">
    <div class="task-group-dialog" @click.stop>
      <div class="task-group-header">
        <div class="task-group-title">标签管理</div>
        <button type="button" class="icon-button" @click="emit('close')">
          <Icon name="close" width="14" height="14" class="icon" />
        </button>
      </div>
      <div class="task-group-hint">选择标签名称与颜色，颜色会应用在标签徽标与表格标签标题上。</div>
      <div class="task-group-list">
        <div v-if="localGroups.length === 0" class="task-group-empty">暂无标签</div>
        <div v-else class="task-group-grid">
          <div
            v-for="(group, index) in localGroups"
            :key="group.id"
            class="task-group-card"
            :class="{
              'is-dragging': isGroupCardDragging(group),
              'is-drag-over': isGroupCardDragOver(group),
              'is-drag-over-before': isGroupCardDragOverBefore(group),
              'is-drag-over-after': isGroupCardDragOverAfter(group),
              'is-hidden': group.hidden === true
            }"
            @dragover.prevent="handleGroupCardDragOver($event, group)"
            @dragleave="handleGroupCardDragLeave($event, group)"
            @drop.prevent="handleGroupCardDrop($event, group)"
          >
            <div class="task-group-card-body">
              <div class="task-group-card-row">
                <button
                  type="button"
                  class="task-group-drag-handle"
                  draggable="true"
                  title="拖动排序"
                  aria-label="Drag to reorder tags"
                  @dragstart="handleGroupCardDragStart($event, group)"
                  @dragend="handleGroupCardDragEnd"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M8.5,10a2,2,0,1,0,2,2A2,2,0,0,0,8.5,10Zm0,7a2,2,0,1,0,2,2A2,2,0,0,0,8.5,17Zm7-10a2,2,0,1,0-2-2A2,2,0,0,0,15.5,7Zm-7-4a2,2,0,1,0,2,2A2,2,0,0,0,8.5,3Zm7,14a2,2,0,1,0,2,2A2,2,0,0,0,15.5,17Zm0-7a2,2,0,1,0,2,2A2,2,0,0,0,15.5,10Z"
                    />
                  </svg>
                </button>
                <SyInput
                  v-model="group.name"
                  class="task-group-name"
                  :style="getGroupInputStyle(group)"
                  placeholder="标签名称"
                />
                <svg
                  class="task-group-color-button"
                  :style="getGroupSwatchStyle(group)"
                  role="button"
                  tabindex="0"
                  aria-label="Pick tag color"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  @click="openColorPicker(index)"
                  @keydown.enter.prevent="openColorPicker(index)"
                  @keydown.space.prevent="openColorPicker(index)"
                >
                  <path d="M7.42,15.54a1,1,0,0,0,0,1.41,1,1,0,0,0,1.42,0,1,1,0,0,0,0-1.41A1,1,0,0,0,7.42,15.54Zm0-8.49a1,1,0,0,0,0,1.41,1,1,0,0,0,1.42,0,1,1,0,0,0,0-1.41A1,1,0,0,0,7.42,7.05Zm4.95,10a1,1,0,1,0,1,1A1,1,0,0,0,12.37,17Zm-6-6a1,1,0,1,0,1,1A1,1,0,0,0,6.37,11Zm6-6a1,1,0,1,0,1,1A1,1,0,0,0,12.37,5Zm3.54,2.05a1,1,0,1,0,1.41,0A1,1,0,0,0,15.91,7.05Zm6.3,0a11,11,0,1,0-7.85,15.74,3.87,3.87,0,0,0,2.5-1.65A4.2,4.2,0,0,0,17.47,18a5.65,5.65,0,0,1-.1-1,5,5,0,0,1,3-4.56,3.84,3.84,0,0,0,2.06-2.25A4,4,0,0,0,22.21,7.08Zm-1.7,2.44a1.9,1.9,0,0,1-1,1.09A7,7,0,0,0,15.37,17a7.3,7.3,0,0,0,.14,1.4,2.16,2.16,0,0,1-.31,1.65,1.79,1.79,0,0,1-1.21.8,8.72,8.72,0,0,1-1.62.15,9,9,0,0,1-9-9.28A9.05,9.05,0,0,1,11.85,3h.51a9,9,0,0,1,8.06,5A2,2,0,0,1,20.51,9.52ZM12.37,11a1,1,0,1,0,1,1A1,1,0,0,0,12.37,11Z"/>
                </svg>
                <button
                  type="button"
                  class="task-group-visibility"
                  :class="{ active: group.hidden === true }"
                  :title="group.hidden ? '显示标签' : '隐藏标签'"
                  :aria-label="group.hidden ? '显示标签' : '隐藏标签'"
                  @click="toggleGroupHidden(index)"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      v-if="group.hidden"
                      fill="currentColor"
                      d="M10.94,6.08A6.93,6.93,0,0,1,12,6c3.18,0,6.17,2.29,7.91,6a15.23,15.23,0,0,1-.9,1.64,1,1,0,0,0-.16.55,1,1,0,0,0,1.86.5,15.77,15.77,0,0,0,1.21-2.3,1,1,0,0,0,0-.79C19.9,6.91,16.1,4,12,4a7.77,7.77,0,0,0-1.4.12,1,1,0,1,0,.34,2ZM3.71,2.29A1,1,0,0,0,2.29,3.71L5.39,6.8a14.62,14.62,0,0,0-3.31,4.8,1,1,0,0,0,0,.8C4.1,17.09,7.9,20,12,20a9.26,9.26,0,0,0,5.05-1.54l3.24,3.25a1,1,0,0,0,1.42,0,1,1,0,0,0,0-1.42Zm6.36,9.19,2.45,2.45A1.81,1.81,0,0,1,12,14a2,2,0,0,1-2-2A1.81,1.81,0,0,1,10.07,11.48ZM12,18c-3.18,0-6.17-2.29-7.9-6A12.09,12.09,0,0,1,6.8,8.21L8.57,10A4,4,0,0,0,14,15.43L15.59,17A7.24,7.24,0,0,1,12,18Z"
                    />
                    <path
                      v-else
                      fill="currentColor"
                      d="M21.92,11.6C19.9,6.91,16.1,4,12,4S4.1,6.91,2.08,11.6a1,1,0,0,0,0,.8C4.1,17.09,7.9,20,12,20s7.9-2.91,9.92-7.6A1,1,0,0,0,21.92,11.6ZM12,18c-3.17,0-6.17-2.29-7.9-6C5.83,8.29,8.83,6,12,6s6.17,2.29,7.9,6C18.17,15.71,15.17,18,12,18ZM12,8a4,4,0,1,0,4,4A4,4,0,0,0,12,8Zm0,6a2,2,0,1,1,2-2A2,2,0,0,1,12,14Z"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  class="task-group-delete"
                  aria-label="Delete tag"
                  @click="removeGroup(index)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M10,18a1,1,0,0,0,1-1V11a1,1,0,0,0-2,0v6A1,1,0,0,0,10,18ZM20,6H16V5a3,3,0,0,0-3-3H11A3,3,0,0,0,8,5V6H4A1,1,0,0,0,4,8H5V19a3,3,0,0,0,3,3h8a3,3,0,0,0,3-3V8h1a1,1,0,0,0,0-2ZM10,5a1,1,0,0,1,1-1h2a1,1,0,0,1,1,1V6H10Zm7,14a1,1,0,0,1-1,1H8a1,1,0,0,1-1-1V8H17Zm-3-1a1,1,0,0,0,1-1V11a1,1,0,0,0-2,0v6A1,1,0,0,0,14,18Z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="task-group-actions">
        <SyButton class="task-group-btn plain" @click="addGroup">新增标签</SyButton>
        <SyButton class="task-group-btn confirm" @click="save">保存</SyButton>
      </div>
    </div>
  </div>
  <Teleport to="body">
    <div
      v-if="colorPickerIndex !== null"
      class="task-group-color-modal-mask"
      @click.self="closeColorPicker"
    >
      <div class="task-group-color-modal">
        <div class="task-group-color-modal-header">
          <span>选择颜色</span>
          <button type="button" class="icon-button" @click="closeColorPicker">
            <Icon name="close" width="12" height="12" class="icon" />
          </button>
        </div>
        <div class="task-group-color-modal-grid">
          <button
            v-for="option in groupColorOptions"
            :key="option.value"
            type="button"
            class="task-group-color-swatch"
            :class="{ active: option.value === activePickerColor }"
            :style="{ background: option.css }"
            :title="option.value"
            @click="selectPickerColor(option.value)"
          ></button>
        </div>
        <div class="task-group-color-modal-actions">
          <button
            v-if="activePickerColor"
            type="button"
            class="task-group-color-clear"
            @click="clearPickerColor"
          >
            清除颜色
          </button>
          <button type="button" class="task-group-color-cancel" @click="closeColorPicker">
            取消
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import SyButton from '@/components/SiyuanTheme/SyButton.vue';
import SyInput from '@/components/SiyuanTheme/SyInput.vue';
import Icon from '@/components/Icon.vue';
import type { TaskGroup } from '@/api';
import { resolveGroupColorCss, resolveGroupTextColor } from '@/utils/groupColor';

interface Props {
  show: boolean;
  groups: TaskGroup[];
  autoAdd?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  save: [groups: TaskGroup[]];
}>();

const groupColorOptions = [
  { value: 'pinch-background1', css: 'var(--pinch-background1)' },
  { value: 'pinch-background2', css: 'var(--pinch-background2)' },
  { value: 'pinch-background3', css: 'var(--pinch-background3)' },
  { value: 'pinch-background4', css: 'var(--pinch-background4)' },
  { value: 'pinch-background5', css: 'var(--pinch-background5)' },
  { value: 'pinch-background6', css: 'var(--pinch-background6)' },
  { value: 'pinch-background7', css: 'var(--pinch-background7)' },
  { value: 'pinch-background8', css: 'var(--pinch-background8)' },
  { value: 'pinch-background9', css: 'var(--pinch-background9)' },
  { value: 'pinch-background10', css: 'var(--pinch-background10)' }
];
const localGroups = ref<TaskGroup[]>([]);
const colorPickerIndex = ref<number | null>(null);
const draggedGroupId = ref<string | null>(null);
const dragOverGroupId = ref<string | null>(null);
const dragOverGroupPosition = ref<'before' | 'after' | null>(null);

function generateGroupId(): string {
  return `group_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeGroup(group: TaskGroup, index: number, now: string): TaskGroup | null {
  const name = (group.name || '').trim();
  if (!name) return null;

  const id = typeof group.id === 'string' && group.id.trim().length > 0
    ? group.id.trim()
    : generateGroupId();

  const color = typeof group.color === 'string' && group.color.trim()
    ? group.color.trim()
    : undefined;
  const hidden = group.hidden === true;

  return {
    id,
    name,
    color,
    hidden,
    order: index,
    createdAt: group.createdAt || now,
    updatedAt: now
  };
}

function resolveGroupId(group: TaskGroup): string {
  return typeof group.id === 'string' ? group.id.trim() : '';
}

function clearGroupDragState(): void {
  draggedGroupId.value = null;
  dragOverGroupId.value = null;
  dragOverGroupPosition.value = null;
}

function syncLocalGroups(): void {
  localGroups.value = (props.groups || []).map(group => ({ ...group }));
  clearGroupDragState();
}

function moveLocalGroupOrder(sourceId: string, targetId: string, position: 'before' | 'after'): void {
  if (!sourceId || !targetId || sourceId === targetId) {
    return;
  }

  const nextGroups = localGroups.value.map(group => ({ ...group }));
  const sourceIndex = nextGroups.findIndex(group => resolveGroupId(group) === sourceId);
  const targetIndex = nextGroups.findIndex(group => resolveGroupId(group) === targetId);
  if (sourceIndex < 0 || targetIndex < 0) {
    return;
  }

  const [moved] = nextGroups.splice(sourceIndex, 1);
  const targetIndexAfterRemoval = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
  const insertionIndex = position === 'before'
    ? targetIndexAfterRemoval
    : targetIndexAfterRemoval + 1;
  nextGroups.splice(Math.max(0, Math.min(insertionIndex, nextGroups.length)), 0, moved);

  const currentOrder = localGroups.value.map(group => resolveGroupId(group)).join('|');
  const nextOrder = nextGroups.map(group => resolveGroupId(group)).join('|');
  if (currentOrder === nextOrder) {
    return;
  }

  localGroups.value = nextGroups;
}

function isGroupCardDragging(group: TaskGroup): boolean {
  const groupId = resolveGroupId(group);
  return !!groupId && draggedGroupId.value === groupId;
}

function isGroupCardDragOver(group: TaskGroup): boolean {
  const groupId = resolveGroupId(group);
  return !!groupId && dragOverGroupId.value === groupId && draggedGroupId.value !== groupId;
}

function isGroupCardDragOverBefore(group: TaskGroup): boolean {
  return isGroupCardDragOver(group) && dragOverGroupPosition.value === 'before';
}

function isGroupCardDragOverAfter(group: TaskGroup): boolean {
  return isGroupCardDragOver(group) && dragOverGroupPosition.value === 'after';
}

function resolveGroupCardDropPosition(event: DragEvent): 'before' | 'after' {
  const currentTarget = event.currentTarget;
  if (!(currentTarget instanceof HTMLElement)) {
    return 'after';
  }
  const rect = currentTarget.getBoundingClientRect();
  const midpoint = rect.top + rect.height / 2;
  return event.clientY < midpoint ? 'before' : 'after';
}

function handleGroupCardDragStart(event: DragEvent, group: TaskGroup): void {
  const groupId = resolveGroupId(group);
  if (!groupId) {
    return;
  }

  draggedGroupId.value = groupId;
  dragOverGroupId.value = null;
  dragOverGroupPosition.value = null;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', groupId);
  }
}

function handleGroupCardDragOver(event: DragEvent, group: TaskGroup): void {
  const sourceId = draggedGroupId.value;
  if (!sourceId) {
    return;
  }
  const targetId = resolveGroupId(group);
  if (!targetId || targetId === sourceId) {
    dragOverGroupId.value = null;
    dragOverGroupPosition.value = null;
    return;
  }

  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
  dragOverGroupId.value = targetId;
  dragOverGroupPosition.value = resolveGroupCardDropPosition(event);
}

function handleGroupCardDragLeave(event: DragEvent, group: TaskGroup): void {
  const targetId = resolveGroupId(group);
  if (!targetId || dragOverGroupId.value !== targetId) {
    return;
  }
  const currentTarget = event.currentTarget;
  const relatedTarget = event.relatedTarget;
  if (
    currentTarget instanceof Node
    && relatedTarget instanceof Node
    && currentTarget.contains(relatedTarget)
  ) {
    return;
  }
  dragOverGroupId.value = null;
  dragOverGroupPosition.value = null;
}

function handleGroupCardDrop(event: DragEvent, group: TaskGroup): void {
  event.preventDefault();
  const sourceId = draggedGroupId.value;
  const targetId = resolveGroupId(group);
  const dropPosition = resolveGroupCardDropPosition(event);
  clearGroupDragState();
  if (!sourceId || !targetId || sourceId === targetId) {
    return;
  }
  moveLocalGroupOrder(sourceId, targetId, dropPosition);
}

function handleGroupCardDragEnd(): void {
  clearGroupDragState();
}

function addGroup(): void {
  const now = new Date().toISOString();
  localGroups.value = [
    ...localGroups.value,
    {
      id: generateGroupId(),
      name: '',
      color: '',
      hidden: false,
      order: localGroups.value.length,
      createdAt: now,
      updatedAt: now
    }
  ];
}

function removeGroup(index: number): void {
  if (!confirm('确认删除该标签？')) return;
  const removedGroup = localGroups.value[index];
  localGroups.value.splice(index, 1);
  const removedId = removedGroup ? resolveGroupId(removedGroup) : '';
  if (!removedId) {
    return;
  }
  if (draggedGroupId.value === removedId || dragOverGroupId.value === removedId) {
    clearGroupDragState();
  }
}

function toggleGroupHidden(index: number): void {
  const group = localGroups.value[index];
  if (!group) {
    return;
  }
  group.hidden = group.hidden !== true;
}

function setGroupColor(index: number, value: string): void {
  const group = localGroups.value[index];
  if (!group) return;
  group.color = value;
}

function clearGroupColor(index: number): void {
  const group = localGroups.value[index];
  if (!group) return;
  group.color = '';
}

function getGroupSwatchStyle(group: TaskGroup): Record<string, string> {
  void group;
  return { color: 'var(--b3-theme-on-surface)' };
}

function getGroupInputStyle(group: TaskGroup): Record<string, string> {
  const rawColor = typeof group.color === 'string' ? group.color.trim() : '';
  if (!rawColor) return {};
  const background = resolveGroupColorCss(rawColor);
  const color = resolveGroupTextColor(rawColor);
  return {
    '--group-input-bg': background,
    '--group-input-color': color,
    '--group-input-border': background
  };
}

const activePickerGroup = computed(() => {
  if (colorPickerIndex.value === null) return null;
  return localGroups.value[colorPickerIndex.value] || null;
});

const activePickerColor = computed(() => {
  const group = activePickerGroup.value;
  return typeof group?.color === 'string' ? group.color : '';
});

function openColorPicker(index: number): void {
  colorPickerIndex.value = index;
}

function closeColorPicker(): void {
  colorPickerIndex.value = null;
}

function selectPickerColor(value: string): void {
  if (colorPickerIndex.value === null) return;
  setGroupColor(colorPickerIndex.value, value);
  closeColorPicker();
}

function clearPickerColor(): void {
  if (colorPickerIndex.value === null) return;
  clearGroupColor(colorPickerIndex.value);
  closeColorPicker();
}

function save(): void {
  const now = new Date().toISOString();
  const seen = new Set<string>();
  const normalized: TaskGroup[] = [];

  localGroups.value.forEach((group, index) => {
    const normalizedGroup = normalizeGroup(group, index, now);
    if (!normalizedGroup) return;
    if (seen.has(normalizedGroup.id)) {
      normalizedGroup.id = generateGroupId();
    }
    seen.add(normalizedGroup.id);
    normalized.push(normalizedGroup);
  });

  emit('save', normalized);
}

watch(
  () => props.show,
  (show) => {
    if (show) {
      syncLocalGroups();
      if (props.autoAdd) {
        addGroup();
      }
    } else {
      closeColorPicker();
      clearGroupDragState();
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.task-group-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
}

.task-group-dialog {
  max-height: min(80vh, 640px);
  display: flex;
  flex-direction: column;
  background: var(--b3-theme-background);
  border-radius: 14px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
  border: 1px solid var(--b3-border-color);
}

.task-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--b3-border-color);
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
  border-radius: 6px;
}

.icon-button:hover {
  background: var(--b3-list-hover);
}

.task-group-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--b3-theme-on-background);
}

.task-group-hint {
  padding: 10px 16px 12px 16px;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
}

.task-group-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 12px 16px;
}

.task-group-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.task-group-card {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: 10px;
  transition: border-color 0.12s ease, background-color 0.12s ease, opacity 0.12s ease;
}

.task-group-card.is-drag-over {
  border-color: var(--b3-theme-primary);
  background: rgba(59, 130, 246, 0.08);
}

.task-group-card.is-drag-over-before::before,
.task-group-card.is-drag-over-after::after {
  content: '';
  position: absolute;
  left: 4px;
  right: 4px;
  height: 3px;
  border-radius: 999px;
  background: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
  pointer-events: none;
}

.task-group-card.is-drag-over-before::before {
  top: 2px;
}

.task-group-card.is-drag-over-after::after {
  bottom: 2px;
}

.task-group-card.is-dragging {
  opacity: 0.56;
}

.task-group-card.is-hidden {
  opacity: 0.76;
}

.task-group-card-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-group-card-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-group-drag-handle {
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--b3-theme-on-surface);
  cursor: grab;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0;
}

.task-group-drag-handle:active {
  cursor: grabbing;
}

.task-group-drag-handle:hover {
  background: var(--b3-list-hover);
}

.task-group-drag-handle svg {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.task-group-name {
  flex: 1;
  min-width: 0;
  background: var(--group-input-bg, var(--b3-list-hover))!important;
  color: var(--group-input-color, var(--b3-theme-on-background));
  border-color: var(--group-input-border, var(--b3-border-color));
}

.task-group-name::placeholder {
  color: var(--group-input-color, var(--b3-theme-on-background));
  opacity: 0.7;
}

.task-group-delete {
  border: none;
  background: none;
  cursor: pointer;
  color: var(--b3-theme-on-surface);
  width: 22px;
  height: 22px;
  padding: 0;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.task-group-delete:hover {
  background: var(--b3-list-hover);
}

.task-group-delete svg {
  fill: currentColor;
}

.task-group-visibility {
  border: none;
  background: none;
  cursor: pointer;
  color: var(--b3-theme-on-surface);
  width: 22px;
  height: 22px;
  padding: 0;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.task-group-visibility:hover,
.task-group-visibility.active {
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
}

.task-group-visibility svg {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.task-group-color-button {
  width: 18px;
  height: 18px;
  border-radius: 6px;
  border: none;
  background: none;
  color: var(--b3-theme-on-surface);
  fill: currentColor;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}

.task-group-color-button:hover {
  background: var(--b3-list-hover);
}


.task-group-color-button:focus-visible {
  outline: 2px solid var(--b3-theme-primary);
  outline-offset: 2px;
}


.task-group-color-modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1400;
}

.task-group-color-modal {
  width: min(360px, calc(100% - 32px));
  background: var(--b3-theme-background);
  border-radius: 12px;
  border: 1px solid var(--b3-border-color);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
  padding: 12px;
}

.task-group-color-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--b3-theme-on-background);
}

.task-group-color-modal-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.task-group-color-swatch {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8px;
  border: 1px solid var(--b3-border-color);
  padding: 0;
  cursor: pointer;
  background: transparent;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}

.task-group-color-swatch:hover {
  transform: translateY(-1px);
}

.task-group-color-swatch.active {
  box-shadow: 0 0 0 2px var(--b3-theme-primary);
  border-color: var(--b3-theme-primary);
}

.task-group-color-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.task-group-color-clear,
.task-group-color-cancel {
  border: none;
  background: var(--b3-list-hover);
  cursor: pointer;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  padding: 6px 10px;
  border-radius: 8px;
}

.task-group-color-clear:hover,
.task-group-color-cancel:hover {
  background: var(--b3-list-background);
}

.task-group-empty {
  padding: 12px 0;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  opacity: 0.7;
}

.task-group-actions {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
}

.task-group-btn {
  min-width: 96px;
}
.task-group-btn.confirm{
  background: #f98f7a;
  color: #fff;
  border: none;
  border-radius: 20px;
  padding: 4px 10px;
}
.task-group-btn.plain {
  background: var(--b3-list-hover);
  border: none;
  border-radius: 20px;
  padding: 4px 10px;
}
</style>
