<template>
  <div class="sy-select" ref="selectRef">
    <div class="sy-select-trigger" @click="toggleDropdown">
      <span class="sy-select-value">{{ selectedText }}</span>
      <span class="sy-select-arrow" :class="{ 'open': isOpen }">▼</span>
    </div>
    <Transition name="dropdown">
      <div v-show="isOpen" class="sy-select-dropdown">
        <div
          v-for="option in options"
          :key="option.value"
          :class="['sy-select-option', { 'selected': option.value === modelValue }]"
          @click="selectOption(option.value)"
        >
          {{ option.text }}
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps<{
  options: Array<{
    value: string
    text: string
  }>
  modelValue: string
}>()

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const selectRef = ref<HTMLElement | null>(null)

const selectedText = computed(() => {
  const selected = props.options.find(opt => opt.value === props.modelValue)
  return selected?.text || props.options[0]?.text || ''
})

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

const selectOption = (value: string) => {
  emit('update:modelValue', value)
  isOpen.value = false
}

const handleClickOutside = (event: MouseEvent) => {
  if (selectRef.value && !selectRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.sy-select {
  position: relative;
  width: 100%;
}

.sy-select-trigger {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background-color: var(--b3-theme-background);
  border: 1px solid var(--b3-border-color);
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
}

.sy-select-trigger:hover {
  border-color: var(--b3-theme-secondary);
}

.sy-select-value {
  flex: 1;
  color: var(--b3-theme-on-background);
}

.sy-select-arrow {
  margin-left: 8px;
  color: var(--b3-theme-on-surface);
  font-size: 10px;
  transition: transform 0.2s;
}

.sy-select-arrow.open {
  transform: rotate(180deg);
}

.sy-select-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 200px;
  overflow-y: auto;
  background-color: var(--b3-theme-background);
  border: 1px solid var(--b3-border-color);
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

.sy-select-option {
  padding: 8px 12px;
  cursor: pointer;
  color: var(--b3-theme-on-background);
}

.sy-select-option:hover {
  background-color: var(--b3-list-hover);
}

.sy-select-option.selected {
  background-color: var(--b3-list-hover);
  font-weight: bold;
  color: var(--b3-theme-secondary);
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.dropdown-enter-to,
.dropdown-leave-from {
  opacity: 1;
  transform: translateY(0);
}
</style>
