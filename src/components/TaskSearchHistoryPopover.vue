<template>
  <div v-if="visible && history.length" class="task-search-history" role="listbox" :aria-label="t('taskManager.searchTasks')">
    <div class="task-search-history-title">{{ t('taskManager.recentSearches') }}</div>
    <div
      v-for="query in history"
      :key="query"
      class="task-search-history-item"
      role="option"
      tabindex="0"
      @mousedown.prevent
      @click="emit('reuse', query)"
      @keydown.enter.prevent="emit('reuse', query)"
    >
      <Icon name="clock" width="16" height="16" />
      <span>{{ query }}</span>
      <button type="button" class="task-search-history-delete ariaLabel" :aria-label="t('common.delete')" @mousedown.prevent.stop @click.stop="remove(query)">
        <Icon name="trash" width="14" height="14" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import Icon from '@/components/Icon.vue';
import { useI18n } from '@/composables/useI18n';
import { loadTaskSearchHistory, removeTaskSearchHistory } from '@/utils/taskSearchHistory';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ reuse: [query: string] }>();
const { t } = useI18n();
const history = ref<string[]>([]);

function refresh(): void {
  history.value = loadTaskSearchHistory();
}

function remove(query: string): void {
  history.value = removeTaskSearchHistory(query);
}

watch(() => props.visible, visible => {
  if (visible) refresh();
}, { immediate: true });
</script>

<style scoped>
.task-search-history { position: absolute; z-index: 12; top: calc(100% + 4px); right: 0; left: 0; overflow: hidden; border: 1px solid var(--b3-theme-border); border-radius: 10px; background: var(--b3-theme-background); box-shadow: 0 6px 18px rgba(0, 0, 0, .14); }
.task-search-history-title { padding: 9px 12px 5px; color: var(--b3-theme-on-surface); font-size: 11px; font-weight: 600; }
.task-search-history-item { display: flex; align-items: center; gap: 8px; min-width: 0; padding: 7px 8px 7px 12px; color: var(--b3-theme-on-background); cursor: pointer; outline: none; }
.task-search-history-item:hover, .task-search-history-item:focus-visible { background: var(--b3-list-hover); }
.task-search-history-item > svg { flex: 0 0 auto; color: var(--b3-theme-on-surface); }
.task-search-history-item > span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
.task-search-history-delete { display: inline-flex; visibility: hidden; align-items: center; justify-content: center; width: 24px; height: 24px; flex: 0 0 auto; padding: 0; border: 0; border-radius: 6px; color: var(--b3-theme-on-surface); background: transparent; cursor: pointer; }
.task-search-history-item:hover .task-search-history-delete, .task-search-history-item:focus-within .task-search-history-delete { visibility: visible; }
.task-search-history-delete:hover { color: var(--b3-theme-error); background: var(--b3-list-hover); }
</style>
