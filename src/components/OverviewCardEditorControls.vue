<template>
  <div class="overview-card-editor-controls" role="group" :aria-label="label">
    <span class="overview-card-drag-handle" :title="dragLabel" aria-hidden="true">⠿</span>
    <button type="button" class="overview-card-hide" :aria-label="hideLabel" @click.stop="emit('hide')" @dragstart.stop.prevent>{{ t('personalStats.hideCard') }}</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { formatTemplate, useI18n } from '@/composables/useI18n';

const props = defineProps<{ label: string }>();
const emit = defineEmits<{
  (event: 'hide'): void;
}>();
const { t } = useI18n();
const dragLabel = computed(() => formatTemplate('personalStats.dragCardTemplate', { label: props.label }));
const hideLabel = computed(() => formatTemplate('personalStats.hideCardTemplate', { label: props.label }));
</script>

<style scoped>
.overview-card-editor-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-bottom: 8px;
  border-bottom: 1px dashed var(--b3-border-color);
}
button {
  min-width: 32px;
  min-height: 32px;
  padding: 4px 8px;
  border: 1px solid var(--b3-border-color);
  border-radius: 6px;
  color: var(--b3-theme-on-background);
  background: var(--b3-theme-background);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
button:hover:not(:disabled) { color: var(--b3-theme-primary); border-color: var(--b3-theme-primary); }
button:focus-visible { outline: 2px solid var(--b3-theme-primary); outline-offset: 2px; }
button:disabled { opacity: 0.35; cursor: default; }
.overview-card-drag-handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  min-height: 32px;
  border: 0;
  background: transparent;
  font-size: 18px;
  cursor: inherit;
  user-select: none;
}
.overview-card-hide {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: 0 0 auto;
  min-width: 0;
  min-height: 0;
  margin-left: auto;
  padding: 6px 10px;
  border: 1px solid transparent;
  border-radius: 999px;
  color: var(--b3-theme-on-background);
  background: var(--b3-list-hover);
  white-space: nowrap;
  transition: all 0.15s ease;
}
.overview-card-hide:hover:not(:disabled) {
  color: var(--b3-theme-on-background);
  border-color: var(--b3-border-color);
  background: var(--b3-theme-background);
}
</style>
