<template>
  <div class="sy-popover" ref="popoverRef">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  show: boolean;
}>();

const popoverRef = ref<HTMLElement>();

defineExpose({ popoverRef });
</script>

<style scoped>
.sy-popover {
  position: absolute;
  background: var(--b3-theme-background);
  border: 1px solid var(--b3-border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 8px;
  z-index: 1000;
  min-width: 120px;
}
</style>
