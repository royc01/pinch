<template>
  <div
    v-if="mode === 'sidebar'"
    class="task-editor-sidebar-overlay"
    @click.self="$emit('backdropClick')"
  >
    <div
      ref="panelRef"
      class="task-editor-sidebar-panel is-sidebar"
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
            class="task-editor-sidebar-pin"
            :class="{ 'is-active': pinActive }"
            :title="pinActive ? '取消置顶' : '置顶任务'"
            :aria-label="pinActive ? '取消置顶' : '置顶任务'"
            @click.stop="$emit('pin')"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12.71,6.29a1,1,0,0,0-.33-.21,1,1,0,0,0-.76,0,1,1,0,0,0-.33.21l-4,4a1,1,0,1,0,1.42,1.42L11,9.41V21a1,1,0,0,0,2,0V9.41l2.29,2.3a1,1,0,0,0,1.42,0,1,1,0,0,0,0-1.42ZM19,2H5A1,1,0,0,0,5,4H19a1,1,0,0,0,0-2Z"
              />
            </svg>
          </button>
          <button
            v-if="showMove"
            type="button"
            class="task-editor-sidebar-move"
            title="移动任务"
            aria-label="移动任务"
            @click.stop="$emit('move')"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path
                fill="currentColor"
                d="M11,12H3a1,1,0,0,0-1,1v8a1,1,0,0,0,1,1h8a1,1,0,0,0,1-1V13A1,1,0,0,0,11,12Zm-1,8H4V14h6ZM21.92,2.62a1,1,0,0,0-.54-.54A1,1,0,0,0,21,2H15a1,1,0,0,0,0,2h3.59l-5.3,5.29a1,1,0,0,0,0,1.42,1,1,0,0,0,1.42,0L20,5.41V9a1,1,0,0,0,2,0V3A1,1,0,0,0,21.92,2.62Z"
              />
            </svg>
          </button>
          <button
            v-if="showArchive"
            type="button"
            class="task-editor-sidebar-archive"
            :title="isArchived ? '取消归档' : '归档任务'"
            :aria-label="isArchived ? '取消归档' : '归档任务'"
            @click.stop="$emit('archive')"
          >
            <Icon name="archive" width="16" height="16" />
          </button>
          <button
            v-if="showDelete"
            type="button"
            class="task-editor-sidebar-delete"
            title="删除任务"
            aria-label="删除任务"
            @click.stop="$emit('delete')"
          >
            <svg viewBox="0 0 1225 1024" width="16" height="16" aria-hidden="true">
              <path
                fill="currentColor"
                d="M1034.570239 270.996844V841.152359a182.847641 182.847641 0 0 1-182.847641 182.847641H391.641363a182.847641 182.847641 0 0 1-182.847641-182.847641V270.996844a45.090228 45.090228 0 0 1 0-90.162172v-0.091424h196.561214a219.837719 219.837719 0 0 1 432.672374 0h196.542929v0.109708a45.090228 45.090228 0 0 1 0 90.143888zM621.68198 90.398228a132.546255 132.546255 0 0 0-124.610667 90.34502h249.221335A132.546255 132.546255 0 0 0 621.68198 90.398228z m324.408286 180.690039H297.273695v552.858129a109.708585 109.708585 0 0 0 109.708585 109.708584h429.399401a109.708585 109.708585 0 0 0 109.708585-109.708584V271.106552z m-221.245646 481.85839a44.230844 44.230844 0 0 1-44.230845-44.230845V496.027436a44.230844 44.230844 0 0 1 88.479974 0v212.688376a44.230844 44.230844 0 0 1-44.194275 44.249129z m-206.434987 0a44.230844 44.230844 0 0 1-44.230845-44.230845V496.027436a44.230844 44.230844 0 0 1 88.479974 0v212.688376a44.230844 44.230844 0 0 1-44.194275 44.249129z"
              />
            </svg>
          </button>
          <button
            v-if="showPriority"
            type="button"
            class="task-editor-priority-btn"
            title="优先级"
            aria-label="优先级"
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
            type="button"
            class="task-editor-sidebar-close"
            title="关闭编辑器"
            aria-label="关闭编辑器"
            @click.stop="$emit('close')"
          >
            <Icon name="close" width="16" height="16" />
          </button>
        </div>
      </div>
      <slot />
    </div>
  </div>

  <div
    v-else
    ref="panelRef"
    class="task-editor-sidebar-panel is-floating"
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
          class="task-editor-sidebar-pin"
          :class="{ 'is-active': pinActive }"
          :title="pinActive ? '取消置顶' : '置顶任务'"
          :aria-label="pinActive ? '取消置顶' : '置顶任务'"
          @click.stop="$emit('pin')"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12.71,6.29a1,1,0,0,0-.33-.21,1,1,0,0,0-.76,0,1,1,0,0,0-.33.21l-4,4a1,1,0,1,0,1.42,1.42L11,9.41V21a1,1,0,0,0,2,0V9.41l2.29,2.3a1,1,0,0,0,1.42,0,1,1,0,0,0,0-1.42ZM19,2H5A1,1,0,0,0,5,4H19a1,1,0,0,0,0-2Z"
            />
          </svg>
        </button>
        <button
          v-if="showMove"
          type="button"
          class="task-editor-sidebar-move"
          title="移动任务"
          aria-label="移动任务"
          @click.stop="$emit('move')"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path
              fill="currentColor"
              d="M11,12H3a1,1,0,0,0-1,1v8a1,1,0,0,0,1,1h8a1,1,0,0,0,1-1V13A1,1,0,0,0,11,12Zm-1,8H4V14h6ZM21.92,2.62a1,1,0,0,0-.54-.54A1,1,0,0,0,21,2H15a1,1,0,0,0,0,2h3.59l-5.3,5.29a1,1,0,0,0,0,1.42,1,1,0,0,0,1.42,0L20,5.41V9a1,1,0,0,0,2,0V3A1,1,0,0,0,21.92,2.62Z"
            />
          </svg>
        </button>
        <button
          v-if="showArchive"
          type="button"
          class="task-editor-sidebar-archive"
          :title="isArchived ? '取消归档' : '归档任务'"
          :aria-label="isArchived ? '取消归档' : '归档任务'"
          @click.stop="$emit('archive')"
        >
          <Icon name="archive" width="16" height="16" />
        </button>
        <button
          v-if="showDelete"
          type="button"
          class="task-editor-sidebar-delete"
          title="删除任务"
          aria-label="删除任务"
          @click.stop="$emit('delete')"
        >
          <svg viewBox="0 0 1225 1024" width="16" height="16" aria-hidden="true">
            <path
              fill="currentColor"
              d="M1034.570239 270.996844V841.152359a182.847641 182.847641 0 0 1-182.847641 182.847641H391.641363a182.847641 182.847641 0 0 1-182.847641-182.847641V270.996844a45.090228 45.090228 0 0 1 0-90.162172v-0.091424h196.561214a219.837719 219.837719 0 0 1 432.672374 0h196.542929v0.109708a45.090228 45.090228 0 0 1 0 90.143888zM621.68198 90.398228a132.546255 132.546255 0 0 0-124.610667 90.34502h249.221335A132.546255 132.546255 0 0 0 621.68198 90.398228z m324.408286 180.690039H297.273695v552.858129a109.708585 109.708585 0 0 0 109.708585 109.708584h429.399401a109.708585 109.708585 0 0 0 109.708585-109.708584V271.106552z m-221.245646 481.85839a44.230844 44.230844 0 0 1-44.230845-44.230845V496.027436a44.230844 44.230844 0 0 1 88.479974 0v212.688376a44.230844 44.230844 0 0 1-44.194275 44.249129z m-206.434987 0a44.230844 44.230844 0 0 1-44.230845-44.230845V496.027436a44.230844 44.230844 0 0 1 88.479974 0v212.688376a44.230844 44.230844 0 0 1-44.194275 44.249129z"
            />
          </svg>
        </button>
        <button
          v-if="showPriority"
          type="button"
          class="task-editor-priority-btn"
          title="优先级"
          aria-label="优先级"
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
          type="button"
          class="task-editor-sidebar-close"
          title="关闭编辑器"
          aria-label="关闭编辑器"
          @click.stop="$emit('close')"
        >
          <Icon name="close" width="16" height="16" />
        </button>
      </div>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Icon from '@/components/Icon.vue';

withDefaults(defineProps<{
  mode?: 'sidebar' | 'floating';
  title: string;
  panelStyle?: Record<string, string>;
  showPin?: boolean;
  pinActive?: boolean;
  showMove?: boolean;
  showArchive?: boolean;
  isArchived?: boolean;
  showDelete?: boolean;
  showPriority?: boolean;
  priorityStyle?: Record<string, string>;
}>(), {
  mode: 'sidebar',
  panelStyle: () => ({}),
  showPin: false,
  pinActive: false,
  showMove: false,
  showArchive: false,
  isArchived: false,
  showDelete: false,
  showPriority: false,
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
  close: [];
}>();

const panelRef = ref<HTMLElement | null>(null);
defineExpose({ panelEl: panelRef });

function handlePriorityClick(event: MouseEvent): void {
  emit('priority', event);
}
</script>

<style scoped>
.task-editor-sidebar-overlay {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 3;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.5);
}

.task-editor-sidebar-panel {
  background: var(--b3-theme-background);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.task-editor-sidebar-panel.is-sidebar {
  position: relative;
  min-width: 100%;
  width: 100%;
  border-radius: 24px 24px 0 0;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15);
  max-height: 85vh;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.task-editor-sidebar-panel.is-floating {
  position: fixed;
  z-index: 50;
  width: 360px;
  max-width: calc(100vw - 24px);
  max-height: min(70vh, 520px);
  border: 1px solid var(--b3-border-color);
  border-radius: 10px;
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.2);
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
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.task-editor-priority-btn:hover .task-editor-priority-indicator {
  background-color: var(--b3-list-hover);
}

.task-editor-sidebar-move,
.task-editor-sidebar-pin,
.task-editor-sidebar-archive,
.task-editor-sidebar-delete,
.task-editor-sidebar-close {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--b3-theme-on-background);
  background: transparent;
}

.task-editor-sidebar-move:hover {
  background: var(--b3-list-hover);
  color: #f98f7a;
}

.task-editor-sidebar-pin:hover,
.task-editor-sidebar-pin.is-active {
  background: var(--b3-list-hover);
  color: #f98f7a;
}

.task-editor-sidebar-archive:hover {
  background: var(--b3-list-hover);
  color: #f98f7a;
}

.task-editor-sidebar-delete:hover {
  background: var(--b3-list-hover);
  color: var(--b3-theme-error);
}

.task-editor-sidebar-close:hover {
  background: var(--b3-list-hover);
}
</style>
