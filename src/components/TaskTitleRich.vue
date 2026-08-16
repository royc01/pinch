<template>
  <span class="task-title-rich b3-typography" v-html="titleHtml"></span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { sanitizeTaskTitleHtml } from '@/utils/taskHtml';

defineOptions({
  name: 'TaskTitleRich'
});

const props = withDefaults(defineProps<{
  title?: string;
  fallback?: string;
}>(), {
  title: '',
  fallback: ''
});

const titleHtml = computed(() => (
  sanitizeTaskTitleHtml(props.title) || sanitizeTaskTitleHtml(props.fallback)
));
</script>
