<template>
  <div ref="rootRef" class="source-filter-select">
    <button
      type="button"
      class="b3-select fn__flex-center source-filter-select__button"
      :aria-expanded="isOpen"
      @click="toggleOpen"
      @keydown.down.prevent="openAndMove(1)"
      @keydown.up.prevent="openAndMove(-1)"
      @keydown.enter.prevent="toggleOpen"
      @keydown.space.prevent="toggleOpen"
    >
      <EmojiIcon
        v-if="selectedOption?.icon"
        class="source-filter-select__icon"
        :value="normalizeIcon(selectedOption.icon)"
      />
      <span class="source-filter-select__text">{{ selectedOption?.text || fallbackText }}</span>
    </button>

    <div v-if="isOpen" class="source-filter-select__menu" role="listbox">
      <button
        v-for="(option, index) in options"
        :key="option.value"
        type="button"
        class="source-filter-select__option"
        :class="{ 'is-selected': option.value === modelValue, 'is-active': index === activeIndex }"
        role="option"
        :aria-selected="option.value === modelValue"
        @click="selectOption(option.value)"
        @mouseenter="activeIndex = index"
      >
        <EmojiIcon
          v-if="option.icon"
          class="source-filter-select__icon"
          :class="option.kind && `source-filter-select__icon--${option.kind}`"
          :value="normalizeIcon(option.icon)"
        />
        <span class="source-filter-select__text">{{ option.text }}</span>
        <span
          v-if="option.kind"
          class="source-filter-select__badge"
          :class="`source-filter-select__badge--${option.kind}`"
        >
          {{ option.kind === 'group' ? '文档组' : '目标' }}
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import EmojiIcon from '@/components/EmojiIcon.vue';
import { normalizeDocumentIconValue } from '@/utils/documentIcon';

export interface SourceFilterOption {
  value: string;
  text: string;
  icon?: string;
  kind?: 'group' | 'goal';
}

const props = defineProps<{
  options: ReadonlyArray<SourceFilterOption>;
  modelValue: string;
}>();

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
}>();

const rootRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);
const activeIndex = ref(-1);

const selectedOption = computed(() =>
  props.options.find(option => option.value === props.modelValue)
);
const fallbackText = computed(() => props.options[0]?.text || '');

function normalizeIcon(value: unknown): string {
  return normalizeDocumentIconValue(value) || '';
}

function closeMenu(): void {
  isOpen.value = false;
}

function toggleOpen(): void {
  isOpen.value = !isOpen.value;
  activeIndex.value = Math.max(0, props.options.findIndex(option => option.value === props.modelValue));
}

function openAndMove(delta: number): void {
  if (!isOpen.value) {
    isOpen.value = true;
  }
  const optionCount = props.options.length;
  if (optionCount === 0) return;
  const currentIndex = activeIndex.value >= 0 ? activeIndex.value : props.options.findIndex(option => option.value === props.modelValue);
  activeIndex.value = (Math.max(0, currentIndex) + delta + optionCount) % optionCount;
}

function selectOption(value: string): void {
  emit('update:modelValue', value);
  closeMenu();
}

function handleDocumentClick(event: MouseEvent): void {
  if (!rootRef.value || rootRef.value.contains(event.target as Node)) {
    return;
  }
  closeMenu();
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick);
});
</script>

<style scoped>
.source-filter-select {
  position: relative;
  width: 100%;
  min-width: 0;
}

.source-filter-select__button {
  width: 100%;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  cursor: pointer;
  position: relative;
  text-align: left;
}
.kanban-header-tools-module .filter-group .b3-select.source-filter-select__button {
  border-radius: 99px;
  font-size: 16px;
  padding: 0 35px 0 15px;
  height: 32px;
  min-width: 100px;
  font-weight: 700;
  background-color: var(--b3-theme-background);
  box-shadow: var(--pinch-shadow);
}

.source-filter-select__option:hover,
.source-filter-select__option.is-active {
  background: var(--b3-list-hover);
}

.source-filter-select__icon {
  flex: 0 0 auto;
}

.source-filter-select__text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-filter-select__badge {
  flex: 0 0 auto;
  margin-left: auto;
  padding: 2px 6px;
  border-radius: 999px;
  color: var(--b3-theme-on-background);
  font-size: 10px;
  line-height: 18px;
}

.source-filter-select__badge--group {
  background: var(--pinch-background7);
}

.source-filter-select__badge--goal {
  background: var(--pinch-background6);
}

.source-filter-select__menu {
  position: absolute;
  left: 0;
  top: calc(100% + 4px);
  z-index: 80;
  min-width: 200px;
  max-width: min(360px, calc(100vw - 24px));
  max-height: 280px;
  overflow: auto;
  padding: 4px;
  border: 1px solid var(--b3-border-color);
  border-radius: 12px;
  background: var(--b3-menu-background, var(--b3-theme-background));
  box-shadow: var(--b3-dialog-shadow);
}

.source-filter-select__option {
  width: 100%;
  min-width: 0;
  padding: 4px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--b3-theme-on-background);
  display: flex;
  align-items: center;
  gap: 8px;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.source-filter-select__option.is-selected {
  font-weight: 700;
  background: var(--b3-list-hover);
}

</style>
