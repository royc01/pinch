<template>
  <div class="subtask-item" :class="[subtask.completed ? 'completed' : '', `level-${level}`]">
    <div class="subtask-row">
      <div class="task-checkbox-wrapper" @click="handleClick">
        <TaskCheckbox :checked="subtask.completed" :size="18" />
      </div>
      <span class="subtask-title" v-html="subtask.title"></span>
    </div>
    
    <div v-if="subtask.subtasks && subtask.subtasks.length > 0" class="subtasks-children">
      <SubTaskItem
        v-for="child in subtask.subtasks"
        :key="child.id"
        :subtask="child"
        :level="level + 1"
        :parent-task-id="parentTaskId"
        @toggle="handleChildToggle"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import TaskCheckbox from './TaskCheckbox.vue';
import type { SubTask } from '../api';

defineOptions({
  name: 'SubTaskItem'
});

const props = defineProps<{
  subtask: SubTask;
  level: number;
  parentTaskId: string;
}>();

const emit = defineEmits<{
  toggle: [taskId: string, subtask: SubTask];
}>();

function handleClick(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
  emit('toggle', props.parentTaskId, props.subtask);
}

function handleChildToggle(taskId: string, subtask: SubTask) {
  emit('toggle', taskId, subtask);
}
</script>

<style scoped>
.subtask-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 0;
}

.subtask-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.subtask-item.level-1,
.subtask-item.level-2,
.subtask-item.level-3,
.subtask-item.level-4 {
  padding-left: 24px;
}



.subtask-title {
  flex: 1;
  font-size: 14px;
  line-height: 18px;
}

.subtasks-children {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
}

.subtask-item .task-checkbox-wrapper {
  position: relative;
  padding-top: 0;
  cursor: pointer;
  user-select: none;
}
</style>