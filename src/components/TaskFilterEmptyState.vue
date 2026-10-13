<template>
  <div class="task-filter-empty-state" role="status">
    <p>{{ t(filtered ? 'taskManager.noMatchingTasks' : 'taskManager.noTasks') }}</p>
    <template v-if="filtered">
      <span>{{ t('taskManager.noMatchingTasksHint') }}</span>
      <button type="button" @click="emit('clear')">{{ t('taskManager.clearFilters') }}</button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
defineProps<{ filtered: boolean }>();
const emit = defineEmits<{ clear: [] }>();
const { t } = useI18n();
</script>

<style scoped>
.task-filter-empty-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 28px 12px; color: var(--b3-theme-on-surface-light); text-align: center; font-size: 13px; }
p { margin: 0; color: var(--b3-theme-on-surface); }
span { font-size: 12px; }
button { min-height: 32px; padding: 5px 12px; border: 1px solid var(--b3-theme-border); border-radius: 6px; background: var(--b3-theme-background); color: var(--b3-theme-primary); font: inherit; cursor: pointer; }
button:hover { background: var(--b3-list-hover); }
button:focus-visible { outline: 2px solid var(--b3-theme-primary); outline-offset: 2px; }
</style>
