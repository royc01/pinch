<template>
  <div v-show="active" class="calendar-view-layout calendar-shared-layout">
    <CalendarTaskSidebar
      v-if="hasShownSidebar"
      v-show="active && !sidebarCollapsed"
      :active="active && !sidebarCollapsed"
      :tasks="sidebarTasks"
      :notebooks="notebooks"
      :document-title-by-root-id="documentTitleByRootId"
      :display-options="displayOptions"
      :week-starts-on-sunday="weekStartsOnSunday"
      :selected-start-date="selectedStartDate"
      :selected-days-count="selectedDaysCount"
      @task-toggle="emit('task-toggle', $event)"
      @task-edit="(task, anchor) => emit('task-edit', task, anchor)"
      @date-select="emit('date-select', $event)"
      @calendar-display-toggle="emit('calendar-display-toggle', $event)"
      @week-start-change="emit('week-start-change', $event)"
      @calendar-task-drag-start="emit('calendar-task-drag-start', $event)"
      @calendar-task-drag-move="emit('calendar-task-drag-move', $event)"
      @calendar-task-drag-end="emit('calendar-task-drag-end', $event)"
      @calendar-task-drag-cancel="emit('calendar-task-drag-cancel')"
    />
    <div class="calendar-shared-content"><slot /></div>
  </div>
</template>

<script setup lang="ts">
import { provide, ref, shallowRef, watch } from 'vue';
import type { Task } from '@/api';
import CalendarTaskSidebar from './CalendarTaskSidebar.vue';
import { calendarTaskDateCacheKey, createCalendarTaskDateCache } from '@/utils/calendarTaskCache';
provide(calendarTaskDateCacheKey, createCalendarTaskDateCache());
const props = defineProps<{
  active: boolean;
  sidebarCollapsed: boolean;
  tasks: Task[];
  notebooks?: Array<{ id: string; name: string; icon?: string }>;
  documentTitleByRootId?: Map<string, string>;
  displayOptions?: Array<{ key: string; label: string; enabled: boolean }>;
  weekStartsOnSunday?: boolean;
  selectedStartDate?: Date;
  selectedDaysCount?: number;
}>();
type DragPayload = { task: Task; clientX: number; clientY: number };
const emit = defineEmits<{
  'task-toggle': [task: Task];
  'task-edit': [task: Task, anchor: { x: number; y: number }];
  'date-select': [date: Date];
  'calendar-display-toggle': [key: string];
  'week-start-change': [value: boolean];
  'calendar-task-drag-start': [payload: DragPayload];
  'calendar-task-drag-move': [payload: DragPayload];
  'calendar-task-drag-end': [payload: DragPayload];
  'calendar-task-drag-cancel': [];
}>();
const hasShownSidebar = ref(false);
const sidebarTasks = shallowRef<Task[]>([]);
watch([() => props.active, () => props.sidebarCollapsed, () => props.tasks], ([active, collapsed, tasks]) => {
  if (!active) return;
  if (!collapsed) hasShownSidebar.value = true;
  sidebarTasks.value = tasks;
}, { immediate: true });
</script>

<style scoped>
.calendar-shared-layout {
  min-width: 0;
}
.calendar-shared-content {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}
</style>
