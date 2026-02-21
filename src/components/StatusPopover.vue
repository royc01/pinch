<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="status-popover"
      :style="popoverStyle"
    >
      <div class="popover-content">
        <div
          v-for="option in statusOptions"
          :key="option.value"
          class="status-option"
          @click="handleSelect(option.value)"
        >
          <div class="status-indicator" :style="{ background: option.background, color: option.color }">
            <span class="status-dot"></span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  show: boolean;
  position: { x: number; y: number };
}>();

const emit = defineEmits<{
  select: [value: string];
  close: [];
}>();

const statusOptions = [
  { value: 'pending', background: '#fef3c7', color: '#f59e0b' },
  { value: 'in-progress', background: '#dbeafe', color: '#3b82f6' },
  { value: 'completed', background: '#d1fae5', color: '#10b981' },
  { value: 'cancelled', background: '#f3f4f6', color: '#9ca3af' }
];

const popoverStyle = computed(() => ({
  left: `${props.position.x}px`,
  top: `${props.position.y}px`,
  transform: 'translateX(-50%)'
}));

function handleSelect(value: string) {
  emit('select', value);
  emit('close');
}
</script>

<style scoped>
.status-popover {
  position: fixed;
  background: var(--b3-theme-background);
  border: 1px solid var(--b3-border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 6px;
  z-index: 1000;
}

.popover-content {
  display: flex;
  gap: 4px;
}

.status-option {
  cursor: pointer;
  border-radius: 6px;
  transition: transform 0.15s;
}

.status-option:hover {
  transform: scale(1.1);
}

.status-indicator {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
}
</style>
