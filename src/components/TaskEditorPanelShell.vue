<template>
  <div
    class="task-editor-sidebar-overlay"
    :class="`is-${mode}`"
    :style="overlayStyle"
    @click.self="handleBackdropClick"
  >
    <div
      ref="panelRef"
      class="task-editor-sidebar-panel"
      :class="`is-${mode}`"
      :style="panelStyle"
      @mousedown.capture="$emit('panelMousedown')"
      @click.stop
    >
      <div class="task-editor-sidebar-header">
        <span class="task-editor-sidebar-title">{{ title }}</span>
        <div class="task-editor-sidebar-actions">
          <button
            v-if="showPin"
            type="button"
            class="task-editor-sidebar-pin ariaLabel"
            :class="{ 'is-active': pinActive }"
            :aria-label="pinActive ? t('taskManager.unpinTask') : t('taskManager.pinTask')"
            @click.stop="$emit('pin')"
          >
            <Icon :name="pinActive ? 'pinTaskActive' : 'pinTask'" width="16" height="16" />
          </button>
          <button
            v-if="showPriority"
            type="button"
            class="task-editor-priority-btn ariaLabel"
            :aria-label="t('taskManager.priority')"
            @click.stop="handlePriorityClick"
          >
            <span
              class="task-editor-priority-indicator"
              :style="priorityStyle"
            >
              <Icon name="flag" width="14" height="14" />
            </span>
          </button>
          <button
            v-if="showFocus"
            type="button"
            class="task-editor-action-btn task-editor-focus-btn ariaLabel"
            :aria-label="t('taskManager.startFocus')"
            @click.stop="$emit('focus')"
          >
            <Icon name="timer" width="14" height="14" />
          </button>
          <button
            v-if="showOpenContent"
            type="button"
            class="task-editor-action-btn task-editor-open-btn ariaLabel"
            :aria-label="t('taskCard.openContent')"
            @click.stop="$emit('openContent')"
          >
            <svg
              viewBox="0 0 1024 1024"
              width="14"
              height="14"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M762.16587005 783.91942371c0 16.31516594-10.87677684 27.19194278-27.1919428 27.1919428H240.08057629c-16.31516594 0-27.19194278-10.87677684-27.1919428-27.1919428V289.02607275c0-16.31516594 10.87677684-27.19194278 27.1919428-27.1919428h179.4668199V180.25830298H240.08057629c-59.8222733 0-108.76776977 48.94549646-108.76776977 108.76776977V783.91942371c0 59.8222733 48.94549646 108.76776977 108.76776977 108.76776977h494.89335096c59.8222733 0 108.76776977-48.94549646 108.76776977-108.76776977v-179.4668199h-81.57582697V783.91942371z"
                fill="currentColor"
              />
              <path
                d="M832.86492018 142.18958335h-239.2890932c-21.75355367 0-43.50710736 16.31516594-43.50710735 43.50710875s16.31516594 43.50710736 43.50710735 43.50710733h141.39810027l-244.72748092 244.72748094c-16.31516594 16.31516594-16.31516594 43.50710736 0 59.8222733s43.50710736 16.31516594 59.8222733 0l244.72748094-244.72748092v141.39810027c0 21.75355367 16.31516594 43.50710736 43.50710733 43.50710735s43.50710736-16.31516594 43.50710875-43.50710735V185.6966921c-10.87677684-21.75355367-27.19194278-43.50710736-48.94549647-43.50710875z"
                fill="currentColor"
              />
            </svg>
          </button>
          <div
            v-if="showMoreActions"
            ref="moreMenuControlRef"
            class="task-editor-sidebar-more-control"
          >
            <button
              type="button"
              class="task-editor-sidebar-more task-group-menu-btn ariaLabel"
              :class="{ active: moreMenuVisible }"
              :aria-label="t('taskManager.more')"
              aria-haspopup="menu"
              :aria-expanded="moreMenuVisible ? 'true' : 'false'"
              @click.stop="toggleMoreMenu"
              @keydown.esc.stop="closeMoreMenu"
            >
              <Icon name="moreVertical" width="16" height="16" />
            </button>
            <div
              v-if="moreMenuVisible"
              class="task-editor-sidebar-more-popover"
              role="menu"
              @click.stop
            >
              <button
                v-if="showMove"
                type="button"
                class="task-editor-sidebar-more-item"
                role="menuitem"
                @click.stop="handleMoreAction('move')"
              >
                <Icon name="moveTask" width="15" height="15" />
                <span>{{ t('taskManager.moveTask') }}</span>
              </button>
              <button
                v-if="showArchive"
                type="button"
                class="task-editor-sidebar-more-item"
                role="menuitem"
                @click.stop="handleMoreAction('archive')"
              >
                <Icon name="archive" width="15" height="15" />
                <span>{{ isArchived ? t('taskManager.unarchiveTask') : t('taskManager.archiveTask') }}</span>
              </button>
              <button
                v-if="showDelete"
                type="button"
                class="task-editor-sidebar-more-item is-danger"
                role="menuitem"
                @click.stop="handleMoreAction('delete')"
              >
                <Icon name="trash" width="15" height="15" />
                <span>{{ t('taskManager.deleteTask') }}</span>
              </button>
            </div>
          </div>
          <button
            type="button"
            class="task-editor-sidebar-close ariaLabel"
            :aria-label="t('taskManager.closeEditor')"
            @click.stop="$emit('close')"
          >
            <Icon name="close" width="16" height="16" />
          </button>
        </div>
      </div>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Icon from '@/components/Icon.vue';
import { useI18n } from '@/composables/useI18n';

const props = withDefaults(defineProps<{
  mode?: 'sidebar' | 'floating' | 'dock';
  title: string;
  panelStyle?: Record<string, string>;
  overlayStyle?: Record<string, string>;
  showPin?: boolean;
  pinActive?: boolean;
  showMove?: boolean;
  showArchive?: boolean;
  isArchived?: boolean;
  showDelete?: boolean;
  showPriority?: boolean;
  showFocus?: boolean;
  showOpenContent?: boolean;
  priorityStyle?: Record<string, string>;
}>(), {
  mode: 'sidebar',
  panelStyle: () => ({}),
  overlayStyle: () => ({}),
  showPin: false,
  pinActive: false,
  showMove: false,
  showArchive: false,
  isArchived: false,
  showDelete: false,
  showPriority: false,
  showFocus: false,
  showOpenContent: false,
  priorityStyle: () => ({})
});

const emit = defineEmits<{
  backdropClick: [];
  panelMousedown: [];
  pin: [];
  move: [];
  archive: [];
  delete: [];
  priority: [event: MouseEvent];
  focus: [];
  openContent: [];
  close: [];
}>();

const panelRef = ref<HTMLElement | null>(null);
const moreMenuControlRef = ref<HTMLElement | null>(null);
const moreMenuVisible = ref(false);
const { t } = useI18n();
defineExpose({ panelEl: panelRef });

const showMoreActions = computed(() => props.showMove || props.showArchive || props.showDelete);

watch(showMoreActions, (visible) => {
  if (!visible) {
    closeMoreMenu();
  }
});

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown, true);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown, true);
});

function handlePriorityClick(event: MouseEvent): void {
  emit('priority', event);
}

function handleBackdropClick(): void {
  if (props.mode === 'sidebar') {
    emit('backdropClick');
  }
}

function toggleMoreMenu(): void {
  moreMenuVisible.value = !moreMenuVisible.value;
}

function closeMoreMenu(): void {
  moreMenuVisible.value = false;
}

function handleMoreAction(action: 'move' | 'archive' | 'delete'): void {
  closeMoreMenu();
  if (action === 'move') {
    emit('move');
    return;
  }
  if (action === 'archive') {
    emit('archive');
    return;
  }
  emit('delete');
}

function handleDocumentPointerDown(event: PointerEvent): void {
  if (!moreMenuVisible.value) {
    return;
  }
  const target = event.target;
  if (!(target instanceof Node) || !moreMenuControlRef.value?.contains(target)) {
    closeMoreMenu();
  }
}
</script>

<style scoped>
.task-editor-sidebar-overlay {
  display: contents;
}

.task-editor-sidebar-overlay.is-sidebar {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: block;
  background-color: rgba(0, 0, 0, 0.5);
  box-sizing: border-box;
  overflow: hidden;
  border-radius: inherit;
}

.task-editor-sidebar-panel {
  background: var(--b3-theme-background);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 16px;
  box-shadow: var(--pinch-menu-shadow);
  box-sizing: border-box;
  background: var(--b3-theme-background);
}

.task-editor-sidebar-panel.is-sidebar {
  position: fixed;
  width: min(560px, 100%);
  min-width: 0;
}

@media (max-width: 768px) {
  .task-editor-sidebar-overlay.is-sidebar {
    padding: calc(16px + env(safe-area-inset-top, 0px)) 16px calc(16px + env(safe-area-inset-bottom, 0px));
  }

  .task-editor-sidebar-panel.is-sidebar {
    max-height: calc(100dvh - 32px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
  }
}

.task-editor-sidebar-panel.is-floating {
  position: fixed;
  z-index: 50;
  width: 360px;
  max-width: calc(100vw - 24px);
  max-height: min(70vh, 520px);
}

.task-editor-sidebar-panel.is-dock {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  max-width: none;
  max-height: none;
  border-radius: 0;
  box-shadow: none;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.task-editor-sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  padding: 12px;
}

.task-editor-sidebar-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--b3-theme-on-background);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-editor-sidebar-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.task-editor-priority-btn {
  border: none;
  padding: 0;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.task-editor-priority-indicator {
  width: 24px;
  height: 24px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.task-editor-priority-btn:hover .task-editor-priority-indicator {
  background-color: var(--b3-list-hover);
}

.task-editor-focus-btn,
.task-editor-open-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: transparent;
}

.task-editor-focus-btn:hover,
.task-editor-open-btn:hover {
  background: var(--b3-list-hover);
}

.task-editor-sidebar-move,
.task-editor-sidebar-pin,
.task-editor-sidebar-archive,
.task-editor-sidebar-delete,
.task-editor-sidebar-more,
.task-editor-sidebar-close {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--b3-theme-on-surface);
  background: transparent;
  padding: 0;
}

.task-editor-sidebar-more-control {
  position: relative;
}

.task-editor-sidebar-more:hover,
.task-editor-sidebar-more.active {
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
}

.task-editor-sidebar-more svg {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.task-editor-sidebar-more-popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 152px;
  border-radius: 10px;
  border: 1px solid var(--b3-theme-border);
  background: var(--b3-theme-background);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.16);
  padding: 6px;
  z-index: 6;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.task-editor-sidebar-more-item {
  width: 100%;
  border: none;
  background: transparent;
  border-radius: 7px;
  color: var(--b3-theme-on-surface);
  font-size: 12px;
  line-height: 1;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.task-editor-sidebar-more-item:hover {
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
}

.task-editor-sidebar-more-item.is-danger:hover {
  color: var(--b3-theme-error);
}

.task-editor-sidebar-more-item svg {
  width: 15px;
  height: 15px;
  flex: 0 0 auto;
  fill: currentColor;
}

.task-editor-sidebar-pin:hover{
  background: var(--b3-list-hover);
}
.task-editor-sidebar-pin.is-active {
  color: #ffcc4d;
}

.task-editor-sidebar-close:hover {
  background: var(--b3-list-hover);
  color: var(--b3-theme-error);
}
</style>
