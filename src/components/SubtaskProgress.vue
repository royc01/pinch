<template>
  <span class="subtask-progress">
    {{ progressText }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { SubTask } from '@/api';

interface Props {
  subtasks: SubTask[];
}

const props = defineProps<Props>();

const progressText = computed(() => {
  const total = countSubtasks(props.subtasks);
  const completed = countCompletedSubtasks(props.subtasks);
  return `${completed}/${total}`;
});

function countSubtasks(subtasks: SubTask[]): number {
  let count = 0;
  for (const subtask of subtasks) {
    count += 1;
    if (subtask.subtasks) {
      count += countSubtasks(subtask.subtasks);
    }
  }
  return count;
}

function countCompletedSubtasks(subtasks: SubTask[]): number {
  let count = 0;
  for (const subtask of subtasks) {
    if (subtask.completed) {
      count += 1;
    }
    if (subtask.subtasks) {
      count += countCompletedSubtasks(subtask.subtasks);
    }
  }
  return count;
}
</script>

<style scoped>
.subtask-progress {
  font-size: 11px;
  color: var(--b3-theme-on-surface);
  opacity: 0.7;
  margin-left: auto;
}
</style>
