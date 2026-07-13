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
import { useI18n } from '@/composables/useI18n';
import { buildTaskStatusPopoverOptions } from '@/utils/taskStatus';

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

const { t } = useI18n();

const statusOptions = computed(() => buildTaskStatusPopoverOptions(t));

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
