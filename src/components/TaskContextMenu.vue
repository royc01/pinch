<template>
  <div
    v-if="show"
    class="context-menu"
    :style="{ left: x + 'px', top: y + 'px' }"
    @click.stop
  >
    <div class="context-menu-section">
      <div class="context-menu-title">颜色</div>
      <div class="task-color-picker">
        <div
          v-for="color in backgroundColors"
          :key="color.value"
          class="color-option"
          :class="{ selected: task?.backgroundColor === color.value }"
          :style="{ backgroundColor: color.css }"
          @click="$emit('setColor', color.value)"
        ></div>
      </div>
    </div>

    <div class="context-menu-section">
      <div class="context-menu-title">日期</div>
      <div class="date-edit-row">
        <label>开始</label>
        <input :value="startDate" type="date" @input="$emit('update:startDate', ($event.target as HTMLInputElement).value)" />
      </div>
      <div class="date-edit-row">
        <label>截止</label>
        <input :value="dueDate" type="date" @input="$emit('update:dueDate', ($event.target as HTMLInputElement).value)" />
      </div>
      <button class="context-menu-date-save" @click="$emit('saveDates')">保存日期</button>
    </div>

    <div class="context-menu-section">
      <div class="context-menu-title">重复</div>
      <div class="repeat-edit-row">
        <label>频率</label>
        <select :value="repeatFrequency" @change="onRepeatChange">
          <option value="none">不重复</option>
          <option value="daily">每一天</option>
          <option value="weekdays">工作日（周一到周五）</option>
          <option value="weekend">周末</option>
          <option value="weekly">每周一天（按第一天任务的星期几）</option>
        </select>
      </div>
    </div>

    <div class="context-menu-divider"></div>
    <div class="context-menu-item delete-item" @click="$emit('deleteTask')">
      <svg viewBox="0 0 24 24" width="16" height="16">
        <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
      </svg>
      <span>删除任务</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Task } from '@/api';
import type { RepeatFrequency } from '@/repeatRepository';

interface BackgroundColorOption {
  value: string;
  css: string;
}

const props = defineProps<{
  show: boolean;
  x: number;
  y: number;
  task: Task | null;
  backgroundColors: BackgroundColorOption[];
  startDate: string;
  dueDate: string;
  repeatFrequency: RepeatFrequency;
}>();

const emit = defineEmits<{
  (event: 'setColor', color: string): void;
  (event: 'saveDates'): void;
  (event: 'deleteTask'): void;
  (event: 'update:startDate', value: string): void;
  (event: 'update:dueDate', value: string): void;
  (event: 'saveRepeatRule', value: RepeatFrequency): void;
}>();

function onRepeatChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value as RepeatFrequency;
  if (
    value === 'none'
    || value === 'daily'
    || value === 'weekdays'
    || value === 'weekend'
    || value === 'weekly'
  ) {
    emit('saveRepeatRule', value);
    return;
  }
  emit('saveRepeatRule', props.repeatFrequency || 'none');
}
</script>

<style scoped>
.context-menu {
  position: fixed;
  background: var(--b3-theme-surface);
  border: 1px solid var(--b3-border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 240px;
  padding: 8px;
  animation: contextMenuFadeIn 0.15s ease-out;
}

@keyframes contextMenuFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.context-menu-section {
  padding: 4px;
  margin-bottom: 8px;
}

.context-menu-title {
  font-size: 11px;
  font-weight: 500;
  color: var(--b3-theme-on-surface);
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  padding: 0 4px;
}

.task-color-picker {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  padding: 4px;
}

.color-option {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
  position: relative;
}

.color-option:hover,
.color-option.selected {
  border-color: var(--b3-border-color);
}

.date-edit-row,
.repeat-edit-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.date-edit-row label,
.repeat-edit-row label {
  width: 36px;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  opacity: 0.8;
  flex-shrink: 0;
}

.date-edit-row input[type="date"],
.repeat-edit-row select {
  flex: 1;
  min-width: 0;
  padding: 4px 6px;
  border: 1px solid var(--b3-border-color);
  border-radius: 4px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  font-size: 12px;
}

.context-menu-date-save {
  width: 100%;
  border: 1px solid var(--b3-theme-primary);
  background: transparent;
  color: var(--b3-theme-primary);
  border-radius: 6px;
  font-size: 12px;
  padding: 6px 8px;
  cursor: pointer;
}

.context-menu-date-save:hover {
  background: var(--b3-theme-primary);
  color: #fff;
}

.context-menu-divider {
  height: 1px;
  background: var(--b3-border-color);
  margin: 8px 4px;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  color: var(--b3-theme-on-background);
  font-size: 13px;
  border-radius: 6px;
  transition: all 0.15s ease;
  font-weight: 400;
}

.context-menu-item:hover {
  background: var(--b3-list-hover);
}

.context-menu-item.delete-item {
  color: #ef4444;
}

.context-menu-item.delete-item:hover {
  background: #fef2f2;
  color: #dc2626;
}

.context-menu-item svg {
  flex-shrink: 0;
  opacity: 0.8;
  transition: opacity 0.15s;
}

.context-menu-item:hover svg {
  opacity: 1;
}
</style>
