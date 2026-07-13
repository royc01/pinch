<template>
  <span class="focus-target-icon">
    <img
      v-if="isImageIcon"
      class="focus-target-icon__image"
      :src="iconSrc"
      alt=""
    />
    <template v-else>{{ icon }}</template>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { isFocusTargetImageIcon } from '@/utils/focusTargetIcon';

const props = defineProps<{
  icon: string;
}>();

const isImageIcon = computed(() => isFocusTargetImageIcon(props.icon));
const iconSrc = computed(() => {
  if (/^(?:https?:)?\/\//i.test(props.icon) || /^data:/i.test(props.icon)) {
    return props.icon;
  }

  return new URL(props.icon, window.location.origin).toString();
});
</script>

<style scoped>
.focus-target-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.focus-target-icon__image {
  display: block;
  width: 1em;
  height: 1em;
  object-fit: contain;
}
</style>
