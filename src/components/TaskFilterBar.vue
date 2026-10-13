<template>
  <div v-if="expression.length" class="task-filter-summary" :aria-label="t('taskManager.activeFilters')">
    <div class="task-filter-summary-chips">
      <template v-for="(item, index) in expression" :key="item.key">
        <span v-if="index > 0" class="task-filter-summary-join">{{ joinLabel(item.join) }}</span>
        <button
          type="button"
          class="task-filter-summary-chip"
          :style="item.style"
          :title="conditionLabel(item)"
          :aria-label="removeLabel(conditionLabel(item))"
          @click="emit('removeCondition', item.group, item.value)"
        >
          <span>{{ conditionLabel(item) }}</span><span aria-hidden="true">×</span>
        </button>
      </template>
    </div>
    <button type="button" class="task-filter-summary-clear" @click="emit('clear')">{{ t('taskManager.clearFilters') }}</button>
  </div>
</template>

<script setup lang="ts">
import { formatTemplate, useI18n } from '@/composables/useI18n';
import type { TaskFilterExpressionItem, TaskFilterJoin, TaskFilterSection } from '@/composables/useTaskFilterState';

const props = withDefaults(defineProps<{
  expression?: TaskFilterExpressionItem[];
  sections?: TaskFilterSection[];
}>(), { expression: () => [], sections: () => [] });

const emit = defineEmits<{
  removeCondition: [group: string, value: string];
  clear: [];
}>();
const { t } = useI18n();
const removeLabel = (label: string) => formatTemplate('taskManager.removeFilterTemplate', { label });
const joinLabel = (join: TaskFilterJoin) => t({ and: 'taskManager.filterAnd', or: 'taskManager.filterOr', not: 'taskManager.filterNot' }[join]);
function conditionLabel(item: TaskFilterExpressionItem): string {
  const title = props.sections.find(section => section.key === item.group)?.title;
  return title ? `${title}: ${item.label}` : item.label;
}
</script>

<style scoped>
.task-filter-summary {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
  padding: 6px 10px;
  font-size: 12px;
}
.task-filter-summary-chips { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; min-width: 0; flex: 1; }
.task-filter-summary-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  min-height: 28px;
  padding: 3px 8px;
  border: 1px solid var(--b3-theme-border);
  border-radius: 6px;
  background: var(--active-task-filter-chip-bg, var(--b3-list-hover));
  color: var(--active-task-filter-chip-color, var(--b3-theme-on-surface));
  font: inherit;
  cursor: pointer;
}
.task-filter-summary-chip > span:first-child { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.task-filter-summary-chip:hover { box-shadow: var(--active-task-filter-chip-shadow, inset 0 0 0 1px var(--b3-theme-primary)); }
.task-filter-summary-join { color: var(--b3-theme-on-surface-light); }
.task-filter-summary-clear { flex-shrink: 0; min-height: 28px; padding: 3px 4px; border: 0; background: transparent; color: var(--b3-theme-primary); font: inherit; cursor: pointer; }
button:focus-visible { outline: 2px solid var(--b3-theme-primary); outline-offset: 2px; }
@media (max-width: 480px) {
  .task-filter-summary { flex-wrap: wrap; }
  .task-filter-summary-chip { min-height: 32px; }
}
</style>
