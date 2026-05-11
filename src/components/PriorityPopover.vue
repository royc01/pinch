<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="priority-popover"
      :style="popoverStyle"
      @mousedown.stop
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
          <span class="priority-label">{{ option.label }}</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { t } from '@/utils/i18n';
import Icon from './Icon.vue';

const props = withDefaults(defineProps<{
  show: boolean;
  position: { x: number; y: number };
  placement?: 'bottom' | 'top';
}>(), {
  placement: 'bottom'
});

const emit = defineEmits<{
  select: [value: string];
  close: [];
}>();

const priorityOptions = computed(() => [
  { value: 'high', label: t('priorityHigh'), background: 'var(--pinch-background10)', color: 'var(--pinch-font-color10)' },
  { value: 'medium', label: t('priorityMedium'), background: 'var(--pinch-background3)', color: 'var(--pinch-font-color3)' },
  { value: 'low', label: t('priorityLow'), background: 'var(--pinch-background7)', color: 'var(--pinch-font-color7)' },
  { value: 'none', label: t('priorityNone'), background: 'var(--b3-list-hover)', color: 'var(--b3-theme-on-surface)' }
]);

const popoverStyle = computed(() => ({
  left: `${props.position.x}px`,
  top: `${props.position.y}px`,
  transform: props.placement === 'top'
    ? 'translate(-50%, -100%)'
    : 'translateX(-50%)'
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
  flex-direction: column;
  gap: 4px;
}

.priority-option {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  border-radius: 6px;
  padding: 4px 6px;
}

.priority-option:hover {
  background: var(--b3-list-hover);
}

.priority-indicator {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.priority-label {
  font-size: 12px;
  color: var(--b3-theme-on-background);
}
</style>
