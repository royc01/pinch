<template>
  <span
    v-if="batchMode"
    class="column-batch-checkbox-btn ariaLabel"
    :class="{ partial: batchPartial, 'is-disabled': batchDisabled }"
    :aria-label="batchLabel"
    :aria-disabled="batchDisabled"
    @click.stop="emit('toggleBatch')"
  >
    <TaskCheckbox :checked="batchChecked" :size="18" />
  </span>
  <span
    v-else
    class="column-title-dot"
    :class="{
      'is-heading-icon-dot': heading,
      'is-group-icon-dot': group,
      'is-document-icon-dot': document
    }"
    :style="dotStyle"
  >
    <svg v-if="heading" class="column-title-dot-icon" aria-hidden="true">
      <use :xlink:href="`#${headingIconName}`"></use>
    </svg>
    <Icon v-else-if="group" name="group" width="12" height="12" class="column-title-dot-icon" />
    <EmojiIcon
      v-else-if="document"
      class="column-title-document-icon"
      :value="documentIcon"
      fallback="📄"
    />
  </span>
</template>

<script setup lang="ts">
import Icon from '@/components/Icon.vue';
import EmojiIcon from '@/components/EmojiIcon.vue';
import TaskCheckbox from '@/components/TaskCheckbox.vue';

withDefaults(defineProps<{
  batchMode?: boolean;
  batchChecked?: boolean;
  batchPartial?: boolean;
  batchDisabled?: boolean;
  batchLabel?: string;
  heading?: boolean;
  group?: boolean;
  document?: boolean;
  documentIcon?: string;
  dotStyle?: Record<string, string>;
  headingIconName?: string;
}>(), {
  batchMode: false,
  batchChecked: false,
  batchPartial: false,
  batchDisabled: false,
  batchLabel: '',
  heading: false,
  group: false,
  document: false,
  documentIcon: '',
  dotStyle: () => ({}),
  headingIconName: ''
});

const emit = defineEmits<{
  toggleBatch: [];
}>();
</script>

<style scoped>
.column-title-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.column-title-dot.is-heading-icon-dot,
.column-title-dot.is-group-icon-dot,
.column-title-dot.is-document-icon-dot {
  width: 22px;
  height: 22px;
  border-radius: 6px;
}

.column-title-dot.is-heading-icon-dot {
  background: var(--pinch-background7);
  color: var(--pinch-group-color7);
}

.column-title-dot-icon {
  width: 12px;
  height: 12px;
  display: block;
  fill: currentColor;
}

.column-title-document-icon {
  width: 16px;
  height: 16px;
  font-size: 15px;
}

.column-batch-checkbox-btn {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.15s ease, opacity 0.15s ease;
}

.column-batch-checkbox-btn:hover {
  background: var(--b3-list-hover);
}

.column-batch-checkbox-btn :deep(.task-checkbox) {
  --task-checkbox-fill: var(--b3-list-hover);
  --task-checkbox-border: var(--b3-border-color);
}

.column-batch-checkbox-btn.partial :deep(.task-checkbox) {
  fill: #f98f7a;
  stroke: none;
  opacity: 0.45;
}

.column-batch-checkbox-btn.is-disabled {
  opacity: 0.42;
  cursor: not-allowed;
  pointer-events: none;
}
</style>
