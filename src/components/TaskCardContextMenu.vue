<template>
  <Teleport to="body">
    <div
      v-if="state"
      ref="menuRef"
      class="task-card-context-menu"
      :style="menuStyle"
      role="menu"
      @contextmenu.prevent
      @click.stop
      @mouseleave="activeSubmenu = null"
    >
      <button type="button" class="task-card-context-menu-item" @click="emit('togglePin')">
        {{ state.task.pinned === true ? t('taskManager.unpinTask') : t('taskManager.pinTask') }}
      </button>
      <button v-if="showEnterBatchEdit" type="button" class="task-card-context-menu-item" @click="emit('enterBatchEdit')">
        {{ t('taskManager.enterBatchEdit') }}
      </button>
      <div class="task-card-context-divider"></div>
      <div
        v-for="item in submenuItems"
        :key="item.id"
        class="task-card-context-submenu-host"
        @mouseenter="openSubmenu(item.id)"
      >
        <button type="button" class="task-card-context-menu-item task-card-context-submenu-trigger">
          <span>{{ item.label }}</span><span class="task-card-context-arrow">›</span>
        </button>
        <div
          v-if="activeSubmenu === item.id"
          class="task-card-context-submenu"
          :class="{ 'opens-left': submenuOpensLeft }"
        >
          <button
            v-for="option in item.options"
            :key="option.value"
            type="button"
            class="task-card-context-menu-item"
            :class="{ active: item.selected?.includes(option.value) }"
            @click="item.select(option.value)"
          >
            <span>{{ option.label }}</span><span v-if="item.selected?.includes(option.value)" class="task-card-context-check">✓</span>
          </button>
          <p v-if="item.options.length === 0" class="task-card-context-empty">{{ t('taskManager.noTags') }}</p>
        </div>
      </div>
      <div ref="tagPickerTriggerRef" class="task-card-context-submenu-host" @mouseenter="openTagPicker">
        <button type="button" class="task-card-context-menu-item task-card-context-submenu-trigger" @click="openTagPicker">
          <span>{{ t('taskManager.setTags') }}</span><span class="task-card-context-arrow">›</span>
        </button>
      </div>

      <button
        type="button"
        class="task-card-context-menu-item"
        @pointerdown.stop.prevent="activateDescriptionFromPointer"
        @pointercancel="descriptionActivatedByPointer = false"
        @click="activateDescriptionFromClick"
      >
        {{ t('taskManager.addDescription') }}
      </button>
      <button type="button" class="task-card-context-menu-item" @click="emit('move')">
        {{ t('taskManager.moveTask') }}
      </button>
      <button type="button" class="task-card-context-menu-item" @click="emit('archive')">
        {{ t('taskManager.archiveTask') }}
      </button>
      <button type="button" class="task-card-context-menu-item danger" @click="emit('delete')">
        {{ t('taskManager.deleteTask') }}
      </button>
    </div>
    <TagPickerPopover
      :show="tagPickerOpen"
      :style="tagPickerStyle"
      :options="tagOptions"
      :selected-ids="selectedTags"
      @select="emit('toggleTag', $event)"
      @remove="emit('removeTag', $event)"
      @clear="emit('clearTags')"
      @manage="emit('manageTags')"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import type { Task } from '@/api';
import TagPickerPopover from '@/components/TagPickerPopover.vue';
import { useI18n } from '@/composables/useI18n';
import type { TaskGroupOption } from '@/utils/taskGroupShared';

type ContextMenuState = { task: Task; x: number; y: number; source?: 'view' | 'sidebar'; sourceView?: string } | null;
type MenuOption = { value: string; label: string };

const props = defineProps<{
  state: ContextMenuState;
  statusOptions: MenuOption[];
  priorityOptions: MenuOption[];
  tagOptions: TaskGroupOption[];
  showEnterBatchEdit?: boolean;
}>();

const emit = defineEmits<{
  selectStatus: [status: Task['status']];
  selectPriority: [priority: Task['priority']];
  toggleTag: [tagId: string];
  removeTag: [tagId: string];
  clearTags: [];
  manageTags: [];
  togglePin: [];
  enterBatchEdit: [];
  editDescription: [];
  move: [];
  archive: [];
  delete: [];
}>();

const { t } = useI18n();
const showEnterBatchEdit = computed(() => props.showEnterBatchEdit === true);
const menuRef = ref<HTMLElement | null>(null);
const activeSubmenu = ref<string | null>(null);
const submenuOpensLeft = ref(false);
const menuPosition = ref({ x: 0, y: 0 });
const tagPickerOpen = ref(false);
const tagPickerStyle = ref<Record<string, string>>({});
const tagPickerTriggerRef = ref<HTMLElement | null>(null);
let descriptionActivatedByPointer = false;
let tagPickerHideTimer: number | null = null;

const menuStyle = computed(() => ({
  left: `${menuPosition.value.x}px`,
  top: `${menuPosition.value.y}px`
}));

const selectedTags = computed(() => props.state?.task.tags || []);
const submenuItems = computed(() => [
  {
    id: 'status',
    label: t('taskManager.status'),
    options: props.statusOptions,
    selected: props.state ? [props.state.task.status] : [],
    select: (value: string) => emit('selectStatus', value as Task['status'])
  },
  {
    id: 'priority',
    label: t('taskManager.priority'),
    options: props.priorityOptions,
    selected: props.state ? [props.state.task.priority] : [],
    select: (value: string) => emit('selectPriority', value as Task['priority'])
  },
]);

function clampMenuPosition(): void {
  const menu = menuRef.value;
  if (!menu) return;
  const padding = 8;
  const rect = menu.getBoundingClientRect();
  menuPosition.value = {
    x: Math.max(padding, Math.min(menuPosition.value.x, window.innerWidth - rect.width - padding)),
    y: Math.max(padding, Math.min(menuPosition.value.y, window.innerHeight - rect.height - padding))
  };
}

function updateSubmenuSide(): void {
  const menu = menuRef.value;
  if (!menu) return;
  const submenuWidth = 220;
  submenuOpensLeft.value = menu.getBoundingClientRect().right + submenuWidth > window.innerWidth - 8;
}

function openSubmenu(id: string): void {
  tagPickerOpen.value = false;
  updateSubmenuSide();
  activeSubmenu.value = id;
}

function openTagPicker(): void {
  cancelTagPickerHide();
  activeSubmenu.value = null;
  tagPickerOpen.value = true;
  void nextTick(() => {
    const menu = menuRef.value;
    if (!menu) return;
    const menuRect = menu.getBoundingClientRect();
    const triggerRect = tagPickerTriggerRef.value?.getBoundingClientRect() || menuRect;
    const width = Math.min(360, window.innerWidth - 16);
    const opensLeft = menuRect.right + width - 2 > window.innerWidth;
    const left = opensLeft ? menuRect.left - width + 2 : menuRect.right - 2;
    tagPickerStyle.value = {
      left: `${Math.round(Math.max(8, Math.min(left, window.innerWidth - width - 8)))}px`,
      top: `${Math.round(Math.max(8, Math.min(triggerRect.top - 6, window.innerHeight - 428)))}px`,
      zIndex: '1003'
    };
  });
}

function cancelTagPickerHide(): void {
  if (tagPickerHideTimer === null) return;
  window.clearTimeout(tagPickerHideTimer);
  tagPickerHideTimer = null;
}

function scheduleTagPickerHide(): void {
  cancelTagPickerHide();
  tagPickerHideTimer = window.setTimeout(() => {
    tagPickerHideTimer = null;
    tagPickerOpen.value = false;
  }, 120);
}

function handleDocumentPointerMove(event: PointerEvent): void {
  if (!tagPickerOpen.value) return;
  const target = event.target instanceof Element ? event.target : null;
  if (tagPickerTriggerRef.value?.contains(target) || target?.closest('.tag-picker-popover')) {
    cancelTagPickerHide();
    return;
  }
  scheduleTagPickerHide();
}

function activateDescriptionFromPointer(): void {
  descriptionActivatedByPointer = true;
  emit('editDescription');
}

function activateDescriptionFromClick(): void {
  if (descriptionActivatedByPointer) {
    descriptionActivatedByPointer = false;
    return;
  }
  emit('editDescription');
}

watch(
  () => props.state,
  state => {
    activeSubmenu.value = null;
    tagPickerOpen.value = false;
    cancelTagPickerHide();
    if (!state) return;
    menuPosition.value = { x: state.x, y: state.y };
    void nextTick(() => {
      clampMenuPosition();
      updateSubmenuSide();
    });
  }
);

onMounted(() => {
  document.addEventListener('pointermove', handleDocumentPointerMove, true);
});

onUnmounted(() => {
  cancelTagPickerHide();
  document.removeEventListener('pointermove', handleDocumentPointerMove, true);
});
</script>

<style scoped>
.task-card-context-menu,
.task-card-context-submenu {
  box-sizing: border-box;
  width: 220px;
  padding: 6px;
  border: 1px solid var(--b3-theme-border);
  border-radius: 10px;
  background: var(--b3-theme-background);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.16);
}
.task-card-context-menu { position: fixed; z-index: 1002; }
.task-card-context-submenu-host { position: relative; }
.task-card-context-submenu { position: absolute; top: -6px; left: calc(100% - 2px); max-height: min(360px, calc(100vh - 16px)); overflow-y: auto; }
.task-card-context-submenu.opens-left { right: calc(100% - 2px); left: auto; }
.task-card-context-menu-item { display: flex; align-items: center; justify-content: space-between; width: 100%; min-height: 32px; padding: 6px 10px; border: 0; border-radius: 7px; background: transparent; color: var(--b3-theme-on-surface); font-size: 13px; text-align: left; cursor: pointer; }
.task-card-context-menu-item:hover, .task-card-context-menu-item.active { background: var(--b3-list-hover); color: var(--b3-theme-on-background); }
.task-card-context-menu-item.danger { color: var(--b3-theme-error); }
.task-card-context-arrow { color: var(--b3-theme-on-surface-light); font-size: 18px; line-height: 1; }
.task-card-context-check { color: #f98f7a; }
.task-card-context-empty { margin: 6px 10px; color: var(--b3-theme-on-surface-light); font-size: 12px; }
.task-card-context-divider { height: 1px; margin: 4px; background: var(--b3-border-color); opacity: 0.7; }
</style>
