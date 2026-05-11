<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="status-popover"
      :style="popoverStyle"
      @mousedown.stop
    >
      <div class="popover-content">
        <div
          v-for="option in statusOptions"
          :key="option.value"
          class="status-option"
          @click="handleSelect(option.value)"
        >
          <div class="status-indicator" :style="{ color: option.color }">
            <span class="status-dot"></span>
          </div>
          <span class="status-label">{{ option.label }}</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { t } from '@/utils/i18n';

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

const statusOptions = computed(() => [
  { value: 'pending', label: t('statusPending'), background: '#fef3c7', color: '#f59e0b' },
  { value: 'in-progress', label: t('statusInProgress'), background: '#dbeafe', color: '#3b82f6' },
  { value: 'delayed', label: t('statusDelayed'), background: '#ffedd5', color: '#f97316' },
  { value: 'completed', label: t('statusCompleted'), background: '#d1fae5', color: '#10b981' },
  { value: 'cancelled', label: t('statusCancelled'), background: '#f3f4f6', color: '#9ca3af' }
]);

const popoverStyle = computed(() => {
  const isTopPlacement = props.placement === 'top';
  return {
    left: `${props.position.x}px`,
    top: `${props.position.y}px`,
    transform: isTopPlacement ? 'translate(-50%, -100%)' : 'translateX(-50%)'
  };
});

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
  flex-direction: column;
  gap: 4px;
}

.status-option {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  border-radius: 6px;
  padding: 4px 6px;
}

.status-option:hover {
  background: var(--b3-list-hover);
}

.status-indicator {
  width: 10px;
  height: 20px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
}

.status-label {
  font-size: 12px;
  color: var(--b3-theme-on-background);
}
</style>
