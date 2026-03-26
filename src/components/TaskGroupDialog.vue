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
          <div v-for="(group, index) in localGroups" :key="group.id" class="task-group-card">
            <div class="task-group-card-body">
              <div class="task-group-card-row">
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

  return {
    id,
    name,
    color,
    order: index,
    createdAt: group.createdAt || now,
    updatedAt: now
  };
}

function syncLocalGroups(): void {
  localGroups.value = (props.groups || []).map(group => ({ ...group }));
}

function addGroup(): void {
  const now = new Date().toISOString();
  localGroups.value = [
    ...localGroups.value,
    {
      id: generateGroupId(),
      name: '',
      color: '',
      order: localGroups.value.length,
      createdAt: now,
      updatedAt: now
    }
  ];
}

function removeGroup(index: number): void {
  if (!confirm('确认删除该标签？')) return;
  localGroups.value.splice(index, 1);
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
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
