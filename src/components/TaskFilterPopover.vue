<template>
  <Teleport to="body">
    <div
      v-if="visible"
      ref="popoverRef"
      class="task-filter-popover task-filter-popover-floating"
      :style="normalizedStyle"
      @click.stop
    >
      <div class="task-filter-popover-header">
        <span class="task-filter-popover-title">{{ title }}</span>
        <button
          type="button"
          class="task-filter-clear-btn"
          :disabled="!hasActive"
          @click="emitClear"
        >
          {{ t('taskManager.clear') }}
        </button>
      </div>

      <div
        v-for="section in sections"
        :key="section.key"
        class="task-filter-section"
      >
        <span class="task-filter-section-title">{{ section.title }}</span>
        <div class="task-filter-chip-list">
          <button
            v-for="option in section.options"
            :key="option.value"
            type="button"
            class="task-filter-chip-option"
            :class="{ active: option.active }"
            :style="option.style"
            @click="emitToggle(section.key, option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '@/composables/useI18n';

interface TaskFilterOption {
  value: string;
  label: string;
  active: boolean;
  style?: Record<string, string>;
}

interface TaskFilterSection {
  key: string;
  title: string;
  options: TaskFilterOption[];
}

const props = defineProps<{
  visible: boolean;
  popoverStyle?: Record<string, string>;
  title?: string;
  hasActive: boolean;
  sections: TaskFilterSection[];
}>();

const emit = defineEmits<{
  clear: [];
  toggle: [sectionKey: string, value: string];
}>();

const popoverRef = ref<HTMLElement | null>(null);
const { t } = useI18n();
defineExpose({ popoverEl: popoverRef });

const normalizedStyle = computed(() => props.popoverStyle || {});
const title = computed(() => props.title || t('taskManager.filterTasks'));

function emitClear(): void {
  emit('clear');
}

function emitToggle(sectionKey: string, value: string): void {
  emit('toggle', sectionKey, value);
}
</script>

<style scoped>
.task-filter-popover {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--b3-theme-border);
  background: var(--b3-theme-background);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.16);
  z-index: 80;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: auto;
  box-sizing: border-box;
}

.task-filter-popover-floating {
  position: fixed;
}

.task-filter-popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.task-filter-popover-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--b3-theme-on-background);
}

.task-filter-clear-btn {
  border: none;
  background: transparent;
  color: var(--b3-theme-on-surface);
  font-size: 12px;
  cursor: pointer;
  padding: 0;
}

.task-filter-clear-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.task-filter-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-filter-section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--b3-theme-on-surface);
}

.task-filter-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.task-filter-chip-option {
  border: none;
  border-radius: 999px;
  padding: 6px 10px;
  background: var(--task-filter-chip-bg, var(--b3-list-hover));
  color: var(--task-filter-chip-color, var(--b3-theme-on-surface));
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
}

.task-filter-chip-option:hover {
  color: var(--task-filter-chip-hover-color, var(--b3-theme-on-background));
}

.task-filter-chip-option.active {
  background: #f98f7a;
  color: var(--b3-theme-background);
  box-shadow: none;
}
</style>
