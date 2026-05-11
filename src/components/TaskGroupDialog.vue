<template>
  <div v-if="show" class="task-group-overlay" @click.self="emit('close')">
    <div class="task-group-dialog" @click.stop>
      <div class="task-group-header">
        <div class="task-group-title">{{ t('tagManagement') }}</div>
        <button type="button" class="icon-button" :title="t('close')" :aria-label="t('close')" @click="emit('close')">
          <Icon name="close" width="14" height="14" class="icon" />
        </button>
      </div>
      <div class="task-group-hint">{{ t('tagManagementHint') }}</div>
      <div class="task-group-list">
        <div v-if="localGroups.length === 0" class="task-group-empty">{{ t('noTags') }}</div>
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
              'is-hidden': group.hidden === true && !isNoneOption(group),
              'is-special': isNoneOption(group)
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
                  :title="t('dragToReorder')"
                  :aria-label="t('dragToReorder')"
                  @dragstart="handleGroupCardDragStart($event, group)"
                  @dragend="handleGroupCardDragEnd"
                >
                  <Icon name="dragHandle" width="16" height="16" />
                </button>
                <div v-if="isNoneOption(group)" class="task-group-special-field">
                  <span class="task-group-name-static">{{ t('noLabel') }}</span>
                  <span class="task-group-special-badge">{{ t('sortOnly') }}</span>
                </div>
                <SyInput
                  v-if="!isNoneOption(group)"
                  v-model="group.name"
                  class="task-group-name"
                  :style="getGroupInputStyle(group)"
                  :placeholder="t('tagName')"
                />
                <Icon
                  v-if="!isNoneOption(group)"
                  name="palette"
                  class="task-group-color-button"
                  width="18"
                  height="18"
                  :style="getGroupSwatchStyle(group)"
                  role="button"
                  tabindex="0"
                  aria-label="Pick tag color"
                  @click="openColorPicker(index)"
                  @keydown.enter.prevent="openColorPicker(index)"
                  @keydown.space.prevent="openColorPicker(index)"
                />
                <button
                  v-if="!isNoneOption(group)"
                  type="button"
                  class="task-group-visibility"
                  :class="{ active: group.hidden === true }"
                  :title="group.hidden ? t('showTag') : t('hideTag')"
                  :aria-label="group.hidden ? t('showTag') : t('hideTag')"
                  @click="toggleGroupHidden(index)"
                >
                  <Icon :name="group.hidden ? 'eyeOff' : 'eye'" width="16" height="16" />
                </button>
                <button
                  v-if="!isNoneOption(group)"
                  type="button"
                  class="task-group-delete"
                  aria-label="Delete tag"
                  @click="removeGroup(index)"
                >
                  <Icon name="trash" width="16" height="16" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="task-group-actions">
        <SyButton class="task-group-btn plain" @click="addGroup">{{ t('addTag') }}</SyButton>
        <SyButton class="task-group-btn confirm" @click="save">{{ t('save') }}</SyButton>
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
          <span>{{ t('selectColor') }}</span>
          <button type="button" class="icon-button" :title="t('close')" :aria-label="t('close')" @click="closeColorPicker">
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
            {{ t('clearColor') }}
          </button>
          <button type="button" class="task-group-color-cancel" @click="closeColorPicker">
            {{ t('cancel') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { t } from '@/utils/i18n';
import SyButton from '@/components/SiyuanTheme/SyButton.vue';
import SyInput from '@/components/SiyuanTheme/SyInput.vue';
import Icon from '@/components/Icon.vue';
import type { TaskGroup } from '@/api';
import { resolveGroupColorCss, resolveGroupTextColor } from '@/utils/groupColor';

interface Props {
  show: boolean;
  groups: TaskGroup[];
  autoAdd?: boolean;
  includeNoneOption?: boolean;
  orderIds?: string[];
}

const props = defineProps<Props>();

interface TaskGroupDialogSavePayload {
  groups: TaskGroup[];
  orderIds: string[];
}

const emit = defineEmits<{
  close: [];
  save: [payload: TaskGroupDialogSavePayload];
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
const TASK_GROUP_NONE_ID = '__none__';

type TaskGroupDialogItem = TaskGroup & {
  special?: 'none';
};

const localGroups = ref<TaskGroupDialogItem[]>([]);
const colorPickerIndex = ref<number | null>(null);
const draggedGroupId = ref<string | null>(null);
const dragOverGroupId = ref<string | null>(null);
const dragOverGroupPosition = ref<'before' | 'after' | null>(null);

function generateGroupId(): string {
  return `group_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function isNoneOption(group: TaskGroupDialogItem): boolean {
  return group.special === 'none' || resolveGroupId(group) === TASK_GROUP_NONE_ID;
}

function normalizeOrderIds(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }
  const seen = new Set<string>();
  const normalized: string[] = [];
  input.forEach((item) => {
    if (typeof item !== 'string') {
      return;
    }
    const value = item.trim();
    if (!value || seen.has(value)) {
      return;
    }
    seen.add(value);
    normalized.push(value);
  });
  return normalized;
}

function buildNoneOptionItem(): TaskGroupDialogItem {
  return {
    id: TASK_GROUP_NONE_ID,
    name: t('noLabel'),
    color: '',
    hidden: false,
    order: -1,
    special: 'none'
  };
}

function resolveDialogOrderIds(groups: TaskGroupDialogItem[], orderIds: string[], includeNoneOption: boolean): string[] {
  const groupIds = groups
    .map(group => resolveGroupId(group))
    .filter(id => id.length > 0 && id !== TASK_GROUP_NONE_ID);

  if (!includeNoneOption) {
    return groupIds;
  }

  const normalizedOrderIds = normalizeOrderIds(orderIds);
  const groupIdSet = new Set(groupIds);
  const noneIndex = normalizedOrderIds.indexOf(TASK_GROUP_NONE_ID);
  const noneSlot = noneIndex >= 0
    ? normalizedOrderIds
      .slice(0, noneIndex)
      .filter(id => groupIdSet.has(id))
      .length
    : 0;
  const resolved = [...groupIds];
  resolved.splice(Math.max(0, Math.min(noneSlot, resolved.length)), 0, TASK_GROUP_NONE_ID);
  return resolved;
}

function normalizeGroup(group: TaskGroupDialogItem, index: number, now: string): TaskGroup | null {
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

function resolveGroupId(group: TaskGroupDialogItem): string {
  return typeof group.id === 'string' ? group.id.trim() : '';
}

function clearGroupDragState(): void {
  draggedGroupId.value = null;
  dragOverGroupId.value = null;
  dragOverGroupPosition.value = null;
}

function syncLocalGroups(): void {
  const nextGroups = (props.groups || []).map(group => ({ ...group })) as TaskGroupDialogItem[];
  if (props.includeNoneOption !== true) {
    localGroups.value = nextGroups;
    clearGroupDragState();
    return;
  }

  const itemsById = new Map(nextGroups.map(group => [resolveGroupId(group), group]));
  localGroups.value = resolveDialogOrderIds(nextGroups, props.orderIds || [], true)
    .map((id) => {
      if (id === TASK_GROUP_NONE_ID) {
        return buildNoneOptionItem();
      }
      return itemsById.get(id) || null;
    })
    .filter((group): group is TaskGroupDialogItem => !!group);
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

function isGroupCardDragging(group: TaskGroupDialogItem): boolean {
  const groupId = resolveGroupId(group);
  return !!groupId && draggedGroupId.value === groupId;
}

function isGroupCardDragOver(group: TaskGroupDialogItem): boolean {
  const groupId = resolveGroupId(group);
  return !!groupId && dragOverGroupId.value === groupId && draggedGroupId.value !== groupId;
}

function isGroupCardDragOverBefore(group: TaskGroupDialogItem): boolean {
  return isGroupCardDragOver(group) && dragOverGroupPosition.value === 'before';
}

function isGroupCardDragOverAfter(group: TaskGroupDialogItem): boolean {
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

function handleGroupCardDragStart(event: DragEvent, group: TaskGroupDialogItem): void {
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

function handleGroupCardDragOver(event: DragEvent, group: TaskGroupDialogItem): void {
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

function handleGroupCardDragLeave(event: DragEvent, group: TaskGroupDialogItem): void {
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

function handleGroupCardDrop(event: DragEvent, group: TaskGroupDialogItem): void {
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
  if (!confirm(t('confirmDeleteTag'))) return;
  const removedGroup = localGroups.value[index];
  if (!removedGroup || isNoneOption(removedGroup)) {
    return;
  }
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
  if (!group || isNoneOption(group)) {
    return;
  }
  group.hidden = group.hidden !== true;
}

function setGroupColor(index: number, value: string): void {
  const group = localGroups.value[index];
  if (!group || isNoneOption(group)) return;
  group.color = value;
}

function clearGroupColor(index: number): void {
  const group = localGroups.value[index];
  if (!group || isNoneOption(group)) return;
  group.color = '';
}

function getGroupSwatchStyle(group: TaskGroupDialogItem): Record<string, string> {
  void group;
  return { color: 'var(--b3-theme-on-surface)' };
}

function getGroupInputStyle(group: TaskGroupDialogItem): Record<string, string> {
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
  const orderIds: string[] = [];
  let groupOrderIndex = 0;

  localGroups.value.forEach((group) => {
    const groupId = resolveGroupId(group);
    if (groupId) {
      orderIds.push(groupId);
    }
    if (isNoneOption(group)) {
      return;
    }
    const normalizedGroup = normalizeGroup(group, groupOrderIndex, now);
    if (!normalizedGroup) return;
    if (seen.has(normalizedGroup.id)) {
      normalizedGroup.id = generateGroupId();
    }
    seen.add(normalizedGroup.id);
    normalized.push(normalizedGroup);
    groupOrderIndex += 1;
  });

  emit('save', { groups: normalized, orderIds });
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

.task-group-special-field {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
}

.task-group-name-static {
  min-width: 0;
  font-size: 13px;
  font-weight: 500;
}

.task-group-special-badge {
  flex-shrink: 0;
  font-size: 11px;
  line-height: 1;
  padding: 4px 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--b3-theme-primary) 14%, transparent);
  color: var(--b3-theme-primary);
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
