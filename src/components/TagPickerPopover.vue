<template>
  <Teleport to="body">
    <div v-if="show" class="tag-picker-popover" :style="style" @click.stop @mousedown.stop>
      <div class="tag-picker-popover-header">
        <span>{{ t('taskManager.tags') }}</span>
        <div class="tag-picker-popover-actions">
          <button type="button" @click="emit('clear')">{{ t('taskManager.clearTags') }}</button>
          <button type="button" @click="emit('manage')">{{ t('taskManager.manage') }}</button>
        </div>
      </div>
      <label class="tag-picker-search">
        <Icon name="searchCompact" class="tag-picker-search-icon" width="14" height="14" aria-hidden="true" />
        <input v-model="query" type="search" :placeholder="t('taskManager.searchTags')" :aria-label="t('taskManager.searchTags')">
      </label>
      <section class="tag-picker-section">
        <div class="tag-picker-section-title tag-picker-selected-title">
          <span>{{ formatTemplate('taskManager.selectedTags', { count: selectedOptions.length }) }}</span>
          <span class="tag-picker-selected-hint">{{ t('taskManager.selectedTagsHint') }}</span>
        </div>
        <div v-if="selectedOptions.length" class="tag-picker-grid">
          <div v-for="option in selectedOptions" :key="option.value" class="tag-picker-selected-chip">
            <TagChip :option="option" :label="getLabel(option)" :primary="isPrimary(option.value)" @click="emit('select', option.value)" />
            <button type="button" class="tag-picker-chip-remove" :title="t('common.delete')" :aria-label="t('common.delete')" @pointerdown.stop @mousedown.stop @click="removeSelectedTag($event, option.value)">
              <Icon name="close" width="12" height="12" />
            </button>
          </div>
        </div>
        <span v-else class="tag-picker-placeholder">{{ t('taskManager.notSet') }}</span>
      </section>
      <section class="tag-picker-section">
        <div class="tag-picker-section-title">{{ t('taskManager.tagList') }}</div>
        <div v-if="filteredOptions.length" class="tag-picker-grid">
          <TagChip v-for="option in filteredOptions" :key="option.value" :option="option" :label="getLabel(option)" @click="emit('select', option.value)" />
        </div>
        <span v-else class="tag-picker-placeholder">{{ t('taskManager.notSet') }}</span>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref } from 'vue';
import EmojiIcon from '@/components/EmojiIcon.vue';
import Icon from '@/components/Icon.vue';
import { formatTemplate, useI18n } from '@/composables/useI18n';
import type { TaskGroupOption } from '@/utils/taskGroupShared';

const props = withDefaults(defineProps<{ show: boolean; style?: Record<string, string>; options: TaskGroupOption[]; selectedIds: string[] }>(), { style: () => ({}) });
const emit = defineEmits<{ select: [value: string]; remove: [value: string]; clear: []; manage: [] }>();
const { t } = useI18n();
const query = ref('');
const optionsByValue = computed(() => new Map(props.options.filter(option => !option.special).map(option => [option.value, option])));
const depths = computed(() => {
  const result = new Map<string, number>();
  const getDepth = (option: TaskGroupOption, visited = new Set<string>()): number => {
    if (result.has(option.value)) return result.get(option.value)!;
    if (!option.parentId || visited.has(option.value)) return 0;
    visited.add(option.value);
    const parent = optionsByValue.value.get(option.parentId);
    const depth = parent ? getDepth(parent, visited) + 1 : 0;
    result.set(option.value, depth);
    return depth;
  };
  optionsByValue.value.forEach(option => getDepth(option));
  return result;
});
const orderedOptions = computed(() => [...optionsByValue.value.values()].sort((a, b) => (depths.value.get(a.value) || 0) - (depths.value.get(b.value) || 0)));
const selectedOptions = computed(() => props.selectedIds
  .map(id => optionsByValue.value.get(id))
  .filter((option): option is TaskGroupOption => !!option));
const filteredOptions = computed(() => {
  const normalizedQuery = query.value.trim().toLocaleLowerCase();
  return normalizedQuery ? orderedOptions.value.filter(option => getLabel(option).toLocaleLowerCase().includes(normalizedQuery)) : orderedOptions.value;
});
function getLabel(option: TaskGroupOption): string {
  const path: string[] = [];
  const visited = new Set<string>();
  let current: TaskGroupOption | undefined = option;
  while (current && !visited.has(current.value)) {
    visited.add(current.value);
    path.unshift(current.label);
    current = current.parentId ? optionsByValue.value.get(current.parentId) : undefined;
  }
  return path.join('/');
}
function isPrimary(value: string): boolean { return props.selectedIds[0] === value; }
function removeSelectedTag(event: MouseEvent, value: string): void {
  event.preventDefault();
  event.stopPropagation();
  emit('remove', value);
}
const TagChip = defineComponent({
  props: { option: { type: Object as () => TaskGroupOption, required: true }, label: { type: String, required: true }, primary: Boolean },
  emits: ['click'],
  setup(chipProps, { emit: chipEmit }) {
    return () => h('button', {
      type: 'button', class: 'tag-picker-chip',
      disabled: chipProps.primary,
      style: { '--tag-chip-bg': chipProps.option.colorCss || 'var(--b3-list-hover)', '--tag-chip-color': chipProps.option.textColor || 'var(--b3-theme-on-surface)', justifyContent: 'flex-start' },
      onClick: () => chipEmit('click')
    }, [chipProps.option.icon ? h(EmojiIcon, { class: 'tag-picker-chip-icon', value: chipProps.option.icon }) : null, h('span', {
      class: 'tag-picker-chip-label',
      style: { minWidth: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
    }, chipProps.label), chipProps.primary ? h('span', {
      class: 'tag-picker-chip-primary',
      style: {
        position: 'absolute',
        zIndex: '2',
        top: '-5px',
        right: '-5px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '16px',
        height: '16px',
        padding: '0',
        borderRadius: '50%',
        background: '#f98f7a',
        color: 'var(--b3-theme-background)',
        fontSize: '9px',
        fontWeight: '600',
        lineHeight: '1'
      },
      title: t('taskManager.primaryTagShort'),
      'aria-label': t('taskManager.primaryTagShort')
    }, h('svg', {
      viewBox: '0 0 24 24',
      width: '10',
      height: '10',
      xmlns: 'http://www.w3.org/2000/svg',
      'aria-hidden': 'true'
    }, h('path', {
      d: 'M22,9.7C21.9,9.3,21.5,9,21.1,9l-5.7-0.8L12.9,3c-0.2-0.5-0.8-0.7-1.3-0.5c-0.2,0.1-0.4,0.3-0.5,0.5L8.6,8.2L2.9,9C2.5,9.1,2.2,9.3,2,9.7c-0.1,0.4,0,0.7,0.2,1l4.1,4l-1,5.7c-0.1,0.5,0.2,1.1,0.8,1.2c0.2,0.1,0.5,0,0.7-0.1l5.1-2.7l5.1,2.7c0.1,0.1,0.3,0.1,0.5,0.1c0.2,0,0.4-0.1,0.6-0.2c0.3-0.2,0.5-0.6,0.4-1l-1-5.7l4.1-4C22,10.4,22.1,10,22,9.7z',
      fill: 'currentColor'
    }))) : null]);
  }
});
</script>

<style scoped>
.tag-picker-popover{position:fixed;z-index:1000;display:flex;flex-direction:column;gap:8px;width:min(360px,calc(100vw - 16px));max-height:min(420px,calc(100vh - 16px));padding:10px;border:1px solid var(--b3-border-color);border-radius:16px;background:var(--b3-theme-background);box-shadow:var(--pinch-menu-shadow);box-sizing:border-box;overflow:auto}.tag-picker-popover-header,.tag-picker-popover-actions{display:flex;align-items:center;gap:8px}.tag-picker-popover-header{justify-content:space-between;color:var(--b3-theme-on-background);font-size:12px;font-weight:600}.tag-picker-popover-actions button{padding:0;border:0;background:none;color:var(--b3-theme-on-surface);font:inherit;cursor:pointer}.tag-picker-popover-actions button:hover{color:var(--b3-theme-on-background)}.tag-picker-search{display:flex;align-items:center;gap:6px;min-height:30px;padding:0 9px;border:1px solid var(--b3-border-color);border-radius:7px;background:var(--b3-list-hover);color:var(--b3-theme-on-surface)}.tag-picker-search:focus-within{border-color:var(--b3-theme-primary)}.tag-picker-search span{font-size:16px;line-height:1}.tag-picker-search input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:var(--b3-theme-on-background);font:inherit}.tag-picker-section{display:flex;flex-direction:column;gap:6px}.tag-picker-section-title{font-size:12px;font-weight:600;color:var(--b3-theme-on-background)}.tag-picker-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.tag-picker-chip{display:inline-flex;align-items:center;gap:6px;width:100%;min-width:0;padding:6px 10px;border:0;border-radius:999px;background:var(--tag-chip-bg);color:var(--tag-chip-color);font-size:12px;line-height:1;cursor:pointer}.tag-picker-chip-label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap!important}.tag-picker-chip-icon{flex:0 0 auto;line-height:1}.tag-picker-chip-primary{display:inline-flex;flex:0 0 auto;align-items:center;height:16px;padding:0 4px;border-radius:999px;background:#f98f7a;color:var(--b3-theme-background);font-size:10px}.tag-picker-selected-chip{position:relative;min-width:0}.tag-picker-selected-chip .tag-picker-chip{padding-right:34px}.tag-picker-chip-remove{position:absolute;z-index:1;top:50%;right:6px;display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;padding:0;border:0;border-radius:50%;background:rgba(255,255,255,.72);color:inherit;transform:translateY(-50%);cursor:pointer}.tag-picker-chip-remove:hover,.tag-picker-chip-remove:focus-visible{background:rgba(255,255,255,.95);outline:0}.tag-picker-placeholder{font-size:12px;color:var(--b3-theme-on-surface)}

.tag-picker-chip { position: relative; }
.tag-picker-chip-primary { position: absolute; z-index: 2; top: -8px; right: -5px; display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; padding: 0; border-radius: 50%; font-size: 9px; font-weight: 600; line-height: 1; }
.tag-picker-selected-title { display: flex; align-items: baseline; gap: 6px; }
.tag-picker-selected-hint { color: var(--b3-theme-on-surface); font-size: 11px; font-weight: 400; opacity: 0.5; }
.tag-picker-chip:disabled { cursor: default; }

/* Keep the tag picker search visually aligned with the task-view search control. */
.tag-picker-search {
  min-height: 28px;
  padding: 4px 10px;
  border: 1px solid var(--b3-border-color);
  border-radius: 999px;
  background: var(--b3-theme-background);
  box-sizing: border-box;
}

.tag-picker-search:focus-within {
  border-color: var(--b3-theme-primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.18);
}

.tag-picker-search-icon {
  flex: 0 0 auto;
  fill: currentColor;
  opacity: 0.6;
}

.tag-picker-search input {
  color: inherit;
  font-size: 12px;
}

.tag-picker-search input::placeholder {
  color: var(--b3-theme-on-surface);
  opacity: 0.5;
}
</style>
