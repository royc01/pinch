<template>
  <svg 
    class="task-checkbox" 
    :class="{ checked, disabled }"
    viewBox="0 0 1024 1024"
    :width="size"
    :height="size"
    xmlns="http://www.w3.org/2000/svg"
    @click="$emit('click', $event)"
  >
    <path 
      v-if="!checked"
      d="M698.8,1024H325.2C145.6,1024,0,878.4,0,698.8V325.2C0,145.6,145.6,0,325.2,0h373.7
        C878.4,0,1024,145.6,1024,325.2v373.7C1024,878.4,878.4,1024,698.8,1024z"
    ></path>
    <path 
      v-else
      d="M938.5 320.1L431.8 809.5c-6.5 6.5-14.1 11.9-22.4 15.9-32.5 22.9-76.7 19.2-104.9-8.8L87.1 598.5c-31.4-32.2-30.7-83.7 1.5-115.1 31.6-30.8 82-30.8 113.6 0l162.9 163.2L823 205.5c32.8-30.7 84.3-29 115 3.8 29.1 31.1 29.4 79.4 0.5 110.8z"
      transform="matrix(0.86 0 0 0.86 71.68 71.68)"
    ></path>
  </svg>
</template>

<script setup lang="ts">
defineProps<{
  checked: boolean;
  size?: number;
  disabled?: boolean;
}>();

defineEmits<{
  click: [event: Event];
}>();
</script>

<style scoped>
.task-checkbox {
  fill: var(--task-checkbox-fill, var(--b3-list-hover));
  stroke: var(--task-checkbox-border, transparent);
  stroke-width: 24px;
  paint-order: fill stroke;
  transition: fill 0.2s, stroke 0.2s, filter 0.2s;
  cursor: pointer;
}

.task-checkbox:hover {
  filter: brightness(0.95);
}

.task-checkbox.checked {
  fill: #f98f7a;
  stroke: none;
}

.task-checkbox.disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.task-checkbox.disabled:hover {
  filter: none;
}
</style>
