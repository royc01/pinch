<template>
  <span class="task-title-plain">{{ plainText }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { getTaskTitlePlainText } from '@/utils/taskHtml';

defineOptions({
  name: 'TaskTitlePlain'
});

const props = withDefaults(defineProps<{
  title?: string;
  fallback?: string;
}>(), {
  title: '',
  fallback: ''
});

const plainText = computed(() => (
  getTaskTitlePlainText(props.title) || getTaskTitlePlainText(props.fallback)
));
</script>
