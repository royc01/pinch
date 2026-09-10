<template>
  <label
    v-bind="$attrs"
    class="sy-switch"
    :class="{ 'sy-switch--disabled': disabled }"
  >
    <input
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      :aria-label="ariaLabel"
      @change="emitValue"
    />
    <span class="sy-switch__slider" aria-hidden="true"></span>
  </label>
</template>

<script setup lang="ts">
import { defineOptions } from 'vue';

defineOptions({ inheritAttrs: false });

withDefaults(defineProps<{
  modelValue: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}>(), {
  disabled: false
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

function emitValue(event: Event): void {
  emit('update:modelValue', (event.target as HTMLInputElement).checked);
}
</script>

<style scoped>
.sy-switch {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
}

.sy-switch input {
  width: 0;
  height: 0;
  opacity: 0;
}

.sy-switch__slider {
  position: absolute;
  inset: 0;
  cursor: pointer;
  background-color: var(--b3-border-color);
  border-radius: 24px;
  transition: 0.4s;
}

.sy-switch__slider::before {
  position: absolute;
  bottom: 3px;
  left: 3px;
  width: 14px;
  height: 14px;
  content: '';
  background-color: white;
  border-radius: 50%;
  transition: 0.4s;
}

.sy-switch input:checked + .sy-switch__slider {
  background-color: #f98f7a;
}

.sy-switch input:checked + .sy-switch__slider::before {
  transform: translateX(16px);
}

.sy-switch input:focus-visible + .sy-switch__slider {
  outline: 2px solid var(--b3-theme-primary);
  outline-offset: 2px;
}

.sy-switch--disabled {
  opacity: 0.6;
}

.sy-switch--disabled .sy-switch__slider {
  cursor: not-allowed;
}
</style>
