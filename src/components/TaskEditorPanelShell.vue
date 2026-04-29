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
            <Icon name="pinTask" width="16" height="16" />
          </button>
          <button
            v-if="showMove"
            type="button"
            class="task-editor-sidebar-move"
            title="移动任务"
            aria-label="移动任务"
            @click.stop="$emit('move')"
          >
            <Icon name="moveTask" width="16" height="16" />
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
            <Icon name="trash" width="16" height="16" />
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
            v-if="showFocus"
            type="button"
            class="task-editor-action-btn task-editor-focus-btn"
            title="开始专注"
            aria-label="开始专注"
            @click.stop="$emit('focus')"
          >
            <Icon name="timer" width="14" height="14" />
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
          <Icon name="pinTask" width="16" height="16" />
        </button>
        <button
          v-if="showMove"
          type="button"
          class="task-editor-sidebar-move"
          title="移动任务"
          aria-label="移动任务"
          @click.stop="$emit('move')"
        >
          <Icon name="moveTask" width="16" height="16" />
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
          <Icon name="trash" width="16" height="16" />
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
          v-if="showFocus"
          type="button"
          class="task-editor-action-btn task-editor-focus-btn"
          title="开始专注"
          aria-label="开始专注"
          @click.stop="$emit('focus')"
        >
          <Icon name="timer" width="14" height="14" />
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
  showFocus?: boolean;
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
  showFocus: false,
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
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.5);
  box-sizing: border-box;
}

.task-editor-sidebar-panel {
  background: var(--b3-theme-background);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.task-editor-sidebar-panel.is-sidebar {
  position: relative;
  width: min(560px, 100%);
  min-width: 0;
  border-radius: 16px;
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.22);
  max-height: calc(100% - 40px);
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .task-editor-sidebar-overlay {
    position: fixed;
    inset: 0;
    padding: calc(16px + env(safe-area-inset-top, 0px)) 16px calc(16px + env(safe-area-inset-bottom, 0px));
    z-index: 80;
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

.task-editor-focus-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #f98f7a;
  background: rgb(249 143 122 / 0.12);
  padding: 0;
}

.task-editor-focus-btn:hover {
  background: rgb(249 143 122 / 0.2);
}

.task-editor-sidebar-move,
.task-editor-sidebar-pin,
.task-editor-sidebar-archive,
.task-editor-sidebar-delete,
.task-editor-sidebar-close {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--b3-theme-on-background);
  background: transparent;
  padding: 0;
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
