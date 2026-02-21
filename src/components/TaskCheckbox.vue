<template>
  <svg 
    class="task-checkbox" 
    :class="{ checked }"
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
      d="M698.8,0H325.2C145.6,0,0,145.6,0,325.2v373.7C0,878.4,145.6,1024,325.2,1024h373.7
        c179.6,0,325.2-145.6,325.2-325.2V325.2C1024,145.6,878.4,0,698.8,0z M749.4,364.5L526.7,720.7c-8.9,14.3-23.8,23.8-40.6,25.8
        c-2,0.2-3.9,0.3-5.9,0.3c-14.6,0-28.6-5.9-39-16.6l-136.4-140c-21.6-22.4-21.5-57.8,0-80.2c20.8-21.6,55.1-22.2,76.7-1.4
        c0.5,0.5,0.9,0.9,1.4,1.4l87.9,90.3l185.7-296.9c16.5-26.3,50.6-34,76.3-17.1C758.4,303.1,765.8,338.2,749.4,364.5z"
    ></path>
  </svg>
</template>

<script setup lang="ts">
defineProps<{
  checked: boolean;
  size?: number;
}>();

defineEmits<{
  click: [event: Event];
}>();
</script>

<style scoped>
.task-checkbox {
  fill: var(--b3-list-hover);
  transition: all 0.2s;
  cursor: pointer;
}

.task-checkbox:hover {
  fill: var(--b3-theme-on-surface);
}

.task-checkbox.checked {
  fill: #f98f7a;
}
</style>