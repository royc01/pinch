<template>
  <SySwitch v-bind="$attrs" :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)" />
</template>

<script setup lang="ts">
import SySwitch from './SySwitch.vue';

defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();
</script>
