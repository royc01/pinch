<template>
  <div
    v-if="show"
    :class="['context-menu', 'task-quick-date-menu', { 'context-menu-mobile-sheet': isMobileSheet }]"
    :style="menuStyle"
    @click.stop
  >
    <div class="context-menu-section">
      <div class="context-menu-title">{{ title }}</div>
      <div class="date-edit-row">
        <label>开始</label>
        <input
          :value="startDate"
          type="date"
          @input="$emit('update:startDate', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <div class="date-edit-row">
        <label>开始时间</label>
        <input
          :value="startTime"
          type="time"
          @input="$emit('update:startTime', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <div class="date-edit-row">
        <label>截止</label>
        <input
          :value="dueDate"
          type="date"
          @input="$emit('update:dueDate', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <div class="date-edit-row">
        <label>截止时间</label>
        <input
          :value="dueTime"
          type="time"
          @input="$emit('update:dueTime', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <button class="context-menu-date-save" @click="$emit('save')">{{ saveLabel }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

const props = withDefaults(defineProps<{
  show: boolean;
  x: number;
  y: number;
  startDate: string;
  startTime: string;
  dueDate: string;
  dueTime: string;
  title?: string;
  saveLabel?: string;
}>(), {
  title: '日期',
  saveLabel: '保存日期'
});

defineEmits<{
  (event: 'save'): void;
  (event: 'update:startDate', value: string): void;
  (event: 'update:startTime', value: string): void;
  (event: 'update:dueDate', value: string): void;
  (event: 'update:dueTime', value: string): void;
}>();

const isMobileSheet = ref(false);

const menuStyle = computed<Record<string, string>>(() => {
  if (isMobileSheet.value) {
    return {};
  }
  return {
    left: `${props.x}px`,
    top: `${props.y}px`
  };
});

function updateMobileSheetState(): void {
  if (typeof window === 'undefined') {
    isMobileSheet.value = false;
    return;
  }
  const isNarrowScreen = window.innerWidth <= 768;
  const isCoarsePointer = typeof window.matchMedia === 'function'
    ? window.matchMedia('(pointer: coarse)').matches
    : false;
  isMobileSheet.value = isNarrowScreen || (isCoarsePointer && window.innerWidth <= 1024);
}

onMounted(() => {
  updateMobileSheetState();
  window.addEventListener('resize', updateMobileSheetState);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateMobileSheetState);
});
</script>

<style scoped>
.context-menu {
  position: fixed;
  background: var(--b3-theme-surface);
  border: 1px solid var(--b3-border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 260px;
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

@keyframes contextMenuSlideUp {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.context-menu-mobile-sheet {
  left: 8px !important;
  right: 8px;
  top: auto !important;
  bottom: calc(env(safe-area-inset-bottom) + 8px);
  width: auto;
  min-width: 0;
  max-height: min(75vh, 560px);
  overflow-y: auto;
  border-radius: 14px;
  padding-bottom: calc(8px + env(safe-area-inset-bottom));
  animation: contextMenuSlideUp 0.2s ease-out;
}

.context-menu-section {
  padding: 4px;
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

.date-edit-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.date-edit-row label {
  width: 52px;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  opacity: 0.85;
  flex-shrink: 0;
}

.date-edit-row input[type="date"],
.date-edit-row input[type="time"] {
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
  border: none;
  background-color: #f98f7a;
  color: var(--b3-theme-background);
  border-radius: 6px;
  font-size: 12px;
  padding: 6px 8px;
  cursor: pointer;
  margin-top: 4px;
}

.context-menu-date-save:hover {
  background-color: #f98f7a;
  color: var(--b3-theme-background);
}
</style>
