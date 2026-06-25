<template>
  <div
    class="task-editor-protyle-section"
    :class="`is-${variant}`"
  >
    <div
      ref="bodyRef"
      class="task-editor-protyle-body"
      :class="`is-${variant}`"
    ></div>
    <div
      v-if="showDescriptionControl"
      class="task-editor-description-control"
    >
      <textarea
        v-if="showDescriptionInput"
        ref="descriptionRef"
        class="task-editor-description-input b3-text-field"
        rows="3"
        :value="description"
        :placeholder="descriptionPlaceholder"
        @focus="handleDescriptionFocus"
        @input="handleDescriptionInput"
        @blur="handleDescriptionCommit"
        @keydown.ctrl.enter.prevent="handleDescriptionCommit"
      />
      <button
        v-else
        type="button"
        class="task-editor-add-description-btn"
        @click.stop="openDescription"
      >
        <Icon name="descriptionBubble" width="14" height="14" />
        <span>{{ addDescriptionLabel }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import Icon from '@/components/Icon.vue';
import { useI18n } from '@/composables/useI18n';

const props = withDefaults(defineProps<{
  variant?: 'sidebar' | 'floating';
  showDescriptionControl?: boolean;
  description?: string;
  hasDescription?: boolean;
  descriptionActive?: boolean;
  descriptionPlaceholder?: string;
  addDescriptionLabel?: string;
}>(), {
  variant: 'sidebar',
  showDescriptionControl: false,
  description: '',
  hasDescription: false,
  descriptionActive: false,
  descriptionPlaceholder: '',
  addDescriptionLabel: ''
});

const emit = defineEmits<{
  'open-description': [];
  'update:description': [value: string];
  'commit-description': [];
  'close-description': [];
}>();

const bodyRef = ref<HTMLElement | null>(null);
const descriptionRef = ref<HTMLTextAreaElement | null>(null);
const localDescriptionOpen = ref(false);
const { t } = useI18n();

const showDescriptionInput = computed(() =>
  props.showDescriptionControl
  && (props.descriptionActive || props.hasDescription || localDescriptionOpen.value)
);
const addDescriptionLabel = computed(() =>
  props.addDescriptionLabel || t('taskManager.addDescription', 'Add description')
);

function focusDescriptionInput(): void {
  void nextTick(() => {
    descriptionRef.value?.focus();
  });
}

function openDescription(): void {
  localDescriptionOpen.value = true;
  emit('open-description');
  focusDescriptionInput();
}

function handleDescriptionFocus(): void {
  localDescriptionOpen.value = true;
}

function handleDescriptionInput(event: Event): void {
  const target = event.target as HTMLTextAreaElement | null;
  emit('update:description', target?.value ?? '');
}

function handleDescriptionCommit(): void {
  localDescriptionOpen.value = false;
  emit('commit-description');
  emit('close-description');
}

watch(
  () => [props.descriptionActive, props.hasDescription] as const,
  ([descriptionActive, hasDescription]) => {
    if (!descriptionActive && !hasDescription) {
      localDescriptionOpen.value = false;
    }
  }
);

watch(showDescriptionInput, (visible) => {
  if (visible && (props.descriptionActive || localDescriptionOpen.value)) {
    focusDescriptionInput();
  }
});

defineExpose({
  bodyEl: bodyRef
});
</script>

<style scoped>
.task-editor-protyle-section {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.task-editor-protyle-body {
  position: relative;
  min-height: 100px;
  overflow: hidden;
  margin: 3px 6px;
  border-radius: 10px;
}

.task-editor-description-control {
  flex: 0 0 auto;
  margin: 0 8px 6px;
}

.task-editor-add-description-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-height: 24px;
  padding: 4px 8px;
  border: none;
  border-radius: 8px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
}

.task-editor-add-description-btn:hover {
  border-color: #f98f7a;
  color: #f98f7a;
}

.task-editor-description-input {
  width: 100%;
  min-height: 58px;
  box-sizing: border-box;
  resize: vertical;
  padding: 7px 9px;
  border: 1px solid var(--b3-theme-border);
  border-radius: 8px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  font-size: 12px;
  font-family: inherit;
  line-height: 1.45;
}

.task-editor-description-input:focus {
  outline: none;
  border-color: #f98f7a;
}

.task-editor-protyle-body :deep(.protyle-content) {
  overflow: auto;
}

.task-editor-protyle-body:deep(.protyle-wysiwyg) {
  padding: 3px !important;
}

.task-editor-protyle-body :deep(.protyle-toolbar),
.task-editor-protyle-body :deep(.protyle-hint) {
  z-index: 6;
}
</style>
