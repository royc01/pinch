<template>
  <span class="emoji-icon" :title="titleText">
    <img
      v-if="imageSrc"
      class="emoji-icon-image"
      :src="imageSrc"
      :alt="displayText"
      loading="lazy"
      decoding="async"
    />
    <span v-else>{{ displayText }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  value?: string;
  fallback?: string;
}>(), {
  value: '',
  fallback: ''
});

const displayText = computed(() => {
  const value = normalizeIconValue(props.value);
  return value || props.fallback;
});

const titleText = computed(() => displayText.value || undefined);
const imageSrc = computed(() => resolveEmojiImageSrc(displayText.value));

function normalizeIconValue(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

function resolveEmojiImageSrc(value: string): string {
  const raw = normalizeIconValue(value);
  if (!raw) {
    return '';
  }

  const urlMatch = raw.match(/^(?:background-image\s*:\s*)?url\((.+)\)\s*;?$/i);
  const candidate = (urlMatch ? urlMatch[1] : raw).trim().replace(/^['"]+|['"]+$/g, '');
  if (!candidate) {
    return '';
  }

  if (/^(?:https?:\/\/|\/|data:image\/|assets\/|\.{1,2}\/)/i.test(candidate)) {
    return candidate;
  }

  if (/^api\//i.test(candidate)) {
    return `/${candidate}`;
  }

  if (/^emojis\//i.test(candidate)) {
    return `/${candidate}`;
  }

  if (/\.(?:png|svg|jpe?g|gif|webp)(?:[?#].*)?$/i.test(candidate)) {
    return `/emojis/${candidate}`;
  }

  return '';
}
</script>

<style scoped>
.emoji-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1em;
  height: 1em;
  line-height: 1;
  vertical-align: -0.1em;
}

.emoji-icon-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
}
</style>
