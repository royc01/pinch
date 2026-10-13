<template>
  <svg 
    class="task-checkbox" 
    :class="[{ checked, disabled }, statusClass]"
    viewBox="0 0 1024 1024"
    :width="size"
    :height="size"
    xmlns="http://www.w3.org/2000/svg"
    @click="$emit('click', $event)"
  >
    <g v-if="statusClass === 'status-in-progress'">
      <circle class="status-outline" cx="512" cy="512" r="464" />
      <path class="status-mark" d="M512 264v248l168 96" />
    </g>
    <g v-else-if="statusClass === 'status-delayed'">
      <rect class="status-outline" x="48" y="48" width="928" height="928" rx="192" />
      <path class="status-mark" d="M512 264v288" />
      <circle class="status-dot" cx="512" cy="744" r="56" />
    </g>
    <g v-else-if="statusClass === 'status-cancelled'">
      <rect class="status-background" x="48" y="48" width="928" height="928" rx="256" />
      <rect class="status-outline" x="48" y="48" width="928" height="928" rx="256" />
      <path class="status-mark" d="m352 352 320 320m0-320L352 672" />
    </g>
    <path 
      v-else-if="!checked"
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
import { computed } from 'vue';
import type { TaskStatusValue } from '@/utils/taskStatus';

const props = defineProps<{
  checked: boolean;
  status?: TaskStatusValue;
  size?: number;
  disabled?: boolean;
}>();

const statusClass = computed(() => {
  if (props.checked) return '';
  switch (props.status) {
    case 'in-progress':
    case 'delayed':
    case 'cancelled':
      return `status-${props.status}`;
    default:
      return '';
  }
});

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

.task-checkbox.status-in-progress {
  background: var(--pinch-background7);
  color: var(--pinch-group-color7);
  border-radius: 50%;
}

.task-checkbox.status-in-progress .status-outline,
.task-checkbox.status-delayed .status-outline,
.task-checkbox.status-cancelled .status-outline {
  stroke-width: 48px;
}

.task-checkbox.status-in-progress .status-outline,
.task-checkbox.status-delayed .status-outline {
  stroke-opacity: 0.1;
}

.task-checkbox.status-in-progress .status-mark,
.task-checkbox.status-delayed .status-mark,
.task-checkbox.status-delayed .status-dot {
  opacity: 0.6;
}

.task-checkbox.status-cancelled .status-outline {
  stroke-opacity: 0.3;
}

.task-checkbox.status-delayed {
  background: var(--pinch-background8);
  color: var(--pinch-group-color8);
  border-radius: 18.75%;
}

.task-checkbox.status-cancelled {
  color: #9ca3af;
}

.status-background {
  fill: color-mix(in srgb, currentColor 12%, transparent);
  stroke: none;
}

.status-dot {
  fill: currentColor;
  stroke: none;
}

.status-outline,
.status-mark {
  fill: none;
  stroke: currentColor;
  stroke-width: 80px;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.task-checkbox.disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.task-checkbox.disabled:hover {
  filter: none;
}
</style>
