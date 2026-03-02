<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="priority-popover"
      :style="popoverStyle"
    >
      <div class="popover-content">
        <div
          v-for="option in priorityOptions"
          :key="option.value"
          class="priority-option"
          @click="handleSelect(option.value)"
        >
          <div class="priority-indicator" :style="{ background: option.background, color: option.color }">
            <Icon name="flag" width="14" height="14" />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Icon from './Icon.vue';

const props = defineProps<{
  show: boolean;
  position: { x: number; y: number };
}>();

const emit = defineEmits<{
  select: [value: string];
  close: [];
}>();

const priorityOptions = [
  { value: 'high', background: 'var(--pinch-background10)', color: 'var(--pinch-font-color10)' },
  { value: 'medium', background: 'var(--pinch-background3)', color: 'var(--pinch-font-color3)' },
  { value: 'low', background: 'var(--pinch-background7)', color: 'var(--pinch-font-color7)' },
  { value: 'none', background: 'var(--b3-list-hover)', color: 'var(--b3-theme-on-surface)' }
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
.priority-popover {
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

.priority-option {
  cursor: pointer;
  border-radius: 6px;
  transition: transform 0.15s;
}

.priority-option:hover {
  transform: scale(1.1);
}

.priority-indicator {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
</style>
