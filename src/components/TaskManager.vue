<template>
  <div ref="taskManagerContainerRef" class="task-manager-container">
    <div class="task-manager-header">
      <div class="header-left">
        <div class="collapse-arrow" @click="toggleTaskListCollapsed" :class="{ collapsed: isTaskListCollapsed }">
          <Icon name="arrowDown" width="16" height="16" class="icon" />
        </div>
        <div class="title">{{ t('taskManager.title') }}</div>
      </div>
      <div class="header-actions">
        <SyButton
          size="small"
          class="task-scope-button"
          title="任务范围"
          aria-label="任务范围"
          @click="openTaskScopeDialog"
        >
          <Icon name="taskScope" width="24" height="24" class="icon refresh-icon" />
        </SyButton>
        <SyButton
          size="small"
          class="task-refresh"
          :class="{ 'is-refreshing': isRefreshButtonSpinning }"
          @click="handleRefreshClick"
        >
          <Icon name="refresh" width="22" height="22" class="icon refresh-icon" />
        </SyButton>
        <SyButton size="small" class="new-task-button" @click="openTaskModal">
          <Icon name="add" width="24" height="24" class="icon" />
        </SyButton>
        <SyButton size="small" class="view-all-button" @click="openKanbanView">
          更多
        </SyButton>
    </div>
    </div>
    
    <div class="filters-row" v-show="!isTaskListCollapsed">
      <div class="filters-bar">
        <div class="filter-group">
          <label
            class="task-manager-notebook-label"
            :title="t('taskManager.notebook')"
            :aria-label="t('taskManager.notebook')"
          >
            <svg
              t="1774574520545"
              class="task-manager-notebook-icon"
              viewBox="0 0 1026 1024"
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              p-id="11770"
              width="16"
              height="16"
              aria-hidden="true"
            >
              <path d="M950.857143 394.971429l-124.342857 438.857142c-7.314286 21.942857-36.571429 43.885714-58.514286 43.885715h-658.285714c-7.314286 0-14.628571 0-21.942857-7.314286 0-7.314286-7.314286-14.628571 0-21.942857l124.342857-438.857143c7.314286-21.942857 36.571429-43.885714 58.514285-43.885714h658.285715c7.314286 0 14.628571 0 14.628571 7.314285 7.314286 0 7.314286 7.314286 7.314286 21.942858zM73.142857 109.714286c0-21.942857 14.628571-36.571429 36.571429-36.571429h234.057143l65.828571 124.342857c0 14.628571 14.628571 21.942857 29.257143 21.942857h402.285714c21.942857 0 36.571429 14.628571 36.571429 36.571429V292.571429H270.628571C219.428571 292.571429 160.914286 336.457143 146.285714 394.971429L73.142857 643.657143V109.714286z m936.228572 219.428571c-14.628571-21.942857-36.571429-29.257143-58.514286-36.571428v-36.571429c0-58.514286-51.2-109.714286-109.714286-109.714286H460.8L394.971429 21.942857C394.971429 7.314286 380.342857 0 365.714286 0H109.714286C51.2 0 0 51.2 0 109.714286v731.428571c0 36.571429 21.942857 73.142857 43.885714 87.771429h7.314286c14.628571 14.628571 36.571429 21.942857 58.514286 21.942857h658.285714c58.514286 0 109.714286-43.885714 131.657143-102.4l124.342857-438.857143c7.314286-29.257143 0-58.514286-14.628571-80.457143z" p-id="11771"></path>
            </svg>
          </label>
          <div class="filter-select-wrap">
            <SySelect
              :model-value="filterNotebook"
              @update:model-value="filterNotebook = $event"
              :options="notebookOptions"
            />
          </div>
        </div>
        <div v-if="filterNotebook !== 'all'" class="filter-group">
          <label>/</label>
          <div class="filter-select-wrap">
            <SySelect
              :model-value="filterDocument"
              @update:model-value="filterDocument = $event"
              :options="documentOptions"
            />
          </div>
        </div>
      </div>
      <div class="filters-actions">
        <div ref="taskFilterControlRef" class="task-filter-control">
          <button
            type="button"
            class="task-filter-btn"
            :class="{
              active: taskFilterPopoverVisible || hasActiveTaskFilters
            }"
            title="筛选任务"
            aria-label="筛选任务"
            @click.stop="toggleTaskFilterPopover"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h16" />
              <path d="M7 12h10" />
              <path d="M10 17h4" />
            </svg>
            <span v-if="activeTaskFilterCount > 0" class="task-filter-count">
              {{ activeTaskFilterCount }}
            </span>
          </button>
        </div>

        <button
          v-if="hasVisibleExpandableTasks"
          type="button"
          class="subtasks-toggle-btn"
          :class="{ expanded: areAllVisibleSubtasksExpanded }"
          :title="areAllVisibleSubtasksExpanded ? '一键折叠详情' : '一键展开详情'"
          :aria-label="areAllVisibleSubtasksExpanded ? '一键折叠详情' : '一键展开详情'"
          @click="toggleAllVisibleSubtasks"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 8l5 5 5-5" />
            <path d="M7 12l5 5 5-5" />
          </svg>
        </button>
      </div>
    </div>

    <TaskFilterPopover
      ref="taskFilterPopoverRef"
      :visible="taskFilterPopoverVisible"
      :popover-style="taskFilterPopoverStyle"
      :has-active="hasActiveTaskFilters"
      :sections="taskFilterSections"
      @clear="clearTaskFilters"
      @toggle="handleTaskFilterToggle"
    />
    

    <Teleport :to="taskModalTeleportTo" :disabled="!taskModalTeleportTarget">
      <Transition name="task-editor-overlay">
        <div
          v-show="!isTaskListCollapsed && taskEditorSidebarVisible"
          class="task-editor-sidebar-overlay"
          @click.self="closeTaskEditorSidebar"
        >
            <div class="task-editor-sidebar-panel" @mousedown.capture="handleTaskEditorSidebarPanelMouseDown" @click.stop>
              <div class="task-editor-sidebar-header">
                <span class="task-editor-sidebar-title">{{ taskEditorSidebarTitle }}</span>
                <div class="task-editor-sidebar-actions">
                  <button
                    v-if="activeTaskEditTask"
                    type="button"
                    class="task-editor-sidebar-move"
                    title="移动任务"
                    aria-label="移动任务"
                    @click.stop="openTaskMoveDialog"
                  >
                    <svg viewBox="0 0 1024 1024" width="16" height="16" aria-hidden="true">
                      <path d="M904.448 625.728 119.616 625.728c-23.68 0-44.736 14.656-52.48 36.48C65.024 668.032 64 674.048 64 680c0 16.32 7.616 32.192 21.184 42.688l293.248 225.728c24.128 18.56 59.008 14.464 78.016-9.088 18.944-23.552 14.848-57.664-9.28-76.224L288 739.456l616 0c30.72 0 56-29.44 56-59.456C960 649.984 935.168 625.728 904.448 625.728zM119.552 398.272l784.832 0c23.68 0 44.736-14.656 52.48-36.48C958.976 355.968 960 349.952 960 344c0-16.32-7.616-32.192-21.184-42.688l-293.248-225.728c-24.128-18.56-59.008-14.464-78.016 9.088C548.608 108.224 552.64 142.4 576.832 160.96L736 284.544 120 284.544C89.28 284.544 64 313.984 64 344 64 374.016 88.832 398.272 119.552 398.272z"></path>
                    </svg>
                  </button>
                  <button
                    v-if="activeTaskEditTask"
                    type="button"
                    class="task-editor-sidebar-delete"
                    title="删除任务"
                    aria-label="删除任务"
                    @click.stop="handleTaskEditorDelete"
                  >
                    <svg viewBox="0 0 1225 1024" width="16" height="16" aria-hidden="true">
                      <path d="M1034.570239 270.996844V841.152359a182.847641 182.847641 0 0 1-182.847641 182.847641H391.641363a182.847641 182.847641 0 0 1-182.847641-182.847641V270.996844a45.090228 45.090228 0 0 1 0-90.162172v-0.091424h196.561214a219.837719 219.837719 0 0 1 432.672374 0h196.542929v0.109708a45.090228 45.090228 0 0 1 0 90.143888zM621.68198 90.398228a132.546255 132.546255 0 0 0-124.610667 90.34502h249.221335A132.546255 132.546255 0 0 0 621.68198 90.398228z m324.408286 180.690039H297.273695v552.858129a109.708585 109.708585 0 0 0 109.708585 109.708584h429.399401a109.708585 109.708585 0 0 0 109.708585-109.708584V271.106552z m-221.245646 481.85839a44.230844 44.230844 0 0 1-44.230845-44.230845V496.027436a44.230844 44.230844 0 0 1 88.479974 0v212.688376a44.230844 44.230844 0 0 1-44.194275 44.249129z m-206.434987 0a44.230844 44.230844 0 0 1-44.230845-44.230845V496.027436a44.230844 44.230844 0 0 1 88.479974 0v212.688376a44.230844 44.230844 0 0 1-44.194275 44.249129z" fill="#333333"></path>
                    </svg>
                  </button>
                  <button
                    v-if="activeTaskEditTask && activeTaskEditDraft"
                    type="button"
                    class="task-editor-priority-btn"
                    title="优先级"
                    aria-label="优先级"
                    @click.stop="toggleTaskEditorPriorityPopover($event)"
                  >
                    <span
                      class="task-editor-priority-indicator"
                      :style="{ background: taskEditorPriorityOption.background, color: taskEditorPriorityOption.color }"
                    >
                      <Icon name="flag" width="14" height="14" />
                    </span>
                  </button>
                  <button
                    type="button"
                    class="task-editor-sidebar-close"
                    title="关闭编辑器"
                    aria-label="关闭编辑器"
                    @click.stop="closeTaskEditorSidebar"
                  >
                    <Icon name="close" width="16" height="16" />
                  </button>
                </div>
              </div>
              <div
                ref="taskEditorSidebarMountRef"
                class="task-editor-sidebar-body"
              ></div>
            <div
              v-if="activeTaskEditTask && activeTaskEditDraft"
              class="task-editor-sidebar-meta"
            >
              <TaskEditorMetaPanel
                :panel="taskEditorQuickPanel"
                :due-date="activeTaskEditDraft.dueDate || ''"
                :due-text="taskEditorDueText"
                :has-due-date="taskEditorHasDueDate"
                :description="activeTaskEditDraft.description || ''"
                :has-description="taskEditorHasDescription"
                :group-options="taskGroupPickerOptions"
                :selected-group-id="taskEditorSelectedGroupId"
                :group-label="taskEditorGroupLabel"
                :reminder-type="activeTaskEditDraft.reminderType"
                :reminder-custom-time="activeTaskEditDraft.reminderCustomTime || ''"
                :reminder-text="taskEditorReminderText"
                :has-reminder="taskEditorHasReminder"
                :group-button-style="taskEditorGroupButtonStyle"
                :default-group-chip-color="defaultGroupChipColor"
                description-placeholder="添加任务描述..."
                @update:panel="taskEditorQuickPanel = $event"
                @update:description="handleTaskEditorDescriptionInput"
                @select-due="handleTaskEditorDateSelect"
                @select-group="selectTaskEditorGroup"
                @select-reminder="handleTaskEditorReminderSelect"
                @commit-description="handleTaskEditorDescriptionCommit"
                @manage-groups="openTaskGroupDialog"
              />
            </div>
            <div
              v-if="showTaskMoveDialog"
              class="task-move-dialog-overlay"
              @click.self="closeTaskMoveDialog"
            >
              <div class="task-move-dialog" @click.stop>
                <div class="task-move-dialog-header">
                  <span class="task-move-dialog-title">移动任务</span>
                  <button
                    type="button"
                    class="task-move-dialog-close"
                    title="关闭"
                    aria-label="关闭"
                    @click.stop="closeTaskMoveDialog"
                  >
                    <Icon name="close" width="16" height="16" />
                  </button>
                </div>
                <div class="task-move-dialog-body">
                  <div class="task-move-dialog-field">
                    <label>笔记本</label>
                    <SySelect
                      :model-value="taskMoveSelectedNotebook"
                      :options="taskMoveNotebookOptions"
                      @update:model-value="handleTaskMoveNotebookChange"
                    />
                  </div>
                  <div class="task-move-dialog-field">
                    <label>文档</label>
                    <SySelect
                      :model-value="taskMoveSelectedDocument"
                      :options="taskMoveDocumentOptions"
                      @update:model-value="taskMoveSelectedDocument = String($event || '')"
                    />
                  </div>
                  <div v-if="taskMoveTargetUnchanged" class="task-move-dialog-hint">
                    当前已经在这个文档中
                  </div>
                  <div v-else-if="taskMoveDocumentOptions.length === 0" class="task-move-dialog-hint">
                    当前笔记本下暂无可选文档
                  </div>
                </div>
                <div class="task-move-dialog-actions">
                  <button
                    type="button"
                    class="task-move-dialog-btn"
                    @click.stop="closeTaskMoveDialog"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    class="task-move-dialog-btn primary"
                    :disabled="!canSubmitTaskMove"
                    @click.stop="handleTaskEditorMove"
                  >
                    {{ isTaskMoveSubmitting ? '移动中...' : '移动' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <PriorityPopover
      v-if="taskEditorPriorityPopover"
      :show="true"
      :position="taskEditorPriorityPopover.position"
      @select="handleTaskEditorPrioritySelect"
      @close="taskEditorPriorityPopover = null"
    />
    
    <div v-if="loading" class="loading" v-show="!isTaskListCollapsed">{{ t('taskManager.loading') }}</div>
    <div v-else ref="tasksListRef" class="tasks-list b3-typography" v-show="!isTaskListCollapsed">
      <div v-if="displayedTasks.length === 0" class="empty-state">
        {{ t('taskManager.noTasks') }}
      </div>
      <div
        v-else
        class="task-virtual-spacer"
        :style="taskVirtualSpacerStyle"
      >
        <TaskCard
          v-for="task in virtualDisplayedTasks"
          :key="task.id"
          :data-task-id="task.id"
          :task="task"
          :completed="task.status === 'completed'"
          variant="sidebar"
          :task-groups="taskGroups"
          :draggable="!isMobileFrontend"
          :expanded="expandedSubtasks.has(task.id) || expandedDescriptions.has(task.id)"
          :description-editing="inlineEditingDescriptionTaskId === task.id"
          :description-draft="getInlineDescriptionDraft(task)"
          :show-description="true"
          :show-subtasks="expandedSubtasks.has(task.id)"
          title-tooltip="点击编辑任务"
          :ref="(el) => setTaskRowRef(task.id, el)"
          @card-click="openTaskEditorFromMenu"
          @open-click="handleTaskClick"
          @toggle-status="toggleTaskStatus"
          @toggle-expand="handleCardToggleExpand"
          @description-start-edit="startInlineDescriptionEdit"
          @description-input="handleInlineDescriptionInput"
          @description-save="saveInlineDescriptionEdit"
          @description-cancel="cancelInlineDescriptionEdit"
          @subtask-toggle="handleCardSubtaskToggle"
          @dragstart="handleDragStart"
        />
      </div>
      <button
        v-if="hasHiddenCompletedTasks"
        class="more-completed-button"
        type="button"
        @click="showMoreCompletedTasks"
      >
        更多已完成
      </button>
    </div>
    
    <Teleport :to="taskModalTeleportTo" :disabled="!taskModalTeleportTarget">
      <TaskModal 
        :show="showTaskModal" 
        :t="t"
        :notebooks="enabledNotebooks"
        :documents="allDocuments"
        :groups="taskGroups"
        :default-group-id="taskModalDefaultGroupId"
        :lastSelectedNotebook="taskModalDefaultNotebook"
        :lastSelectedDocument="taskModalDefaultDocument"
        @close="showTaskModal = false"
        @manage-groups="openTaskGroupDialog"
        @submit="handleCreateTask"
      />
    </Teleport>
    <TaskScopeDialog
      :show="showTaskScopeDialog"
      :notebooks="notebooks"
      :excluded-notebook-ids="excludedNotebookIds"
      :show-completed-tasks="showCompletedTasks"
      :show-extra="true"
      :lock-close="requiresScopeInitialization"
      :title="requiresScopeInitialization ? '初始化任务范围' : '任务范围'"
      :hint="requiresScopeInitialization
        ? '首次使用请先设置任务抓取范围。开关关闭表示排除该笔记本，开关开启表示参与任务抓取。'
        : '开关关闭后将排除该笔记本，任务列表和看板不再抓取它的任务。'"
      :confirm-text="requiresScopeInitialization ? '开始使用' : '保存'"
      @close="showTaskScopeDialog = false"
      @save="handleTaskScopeSave"
    />
    <TaskGroupDialog
      :show="showTaskGroupDialog"
      :groups="taskGroups"
      @close="showTaskGroupDialog = false"
      @save="handleTaskGroupSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { Protyle, getFrontend } from 'siyuan';
import SyButton from '@/components/SiyuanTheme/SyButton.vue';
import SySelect from '@/components/SiyuanTheme/SySelect.vue';
import TaskCard from '@/components/TaskCard.vue';
import TaskModal, { Notebook, Document } from '@/components/TaskModal.vue';
import TaskScopeDialog from '@/components/TaskScopeDialog.vue';
import TaskGroupDialog from '@/components/TaskGroupDialog.vue';
import TaskFilterPopover from '@/components/TaskFilterPopover.vue';
import Icon from '@/components/Icon.vue';
import TaskEditorMetaPanel from '@/components/TaskEditorMetaPanel.vue';
import PriorityPopover from '@/components/PriorityPopover.vue';
import { TaskRepository, Task, TaskGroup, lsNotebooks, createDocWithMd, getIDsByHPath, setBlockAttrs, getBlockKramdown, sql, openBlockById, loadTaskGroups, saveTaskGroups, type TaskQueryScope } from '@/api';
import { updateTaskMarkdown, skipTaskTemporarily } from '@/utils/taskHelpers';
import { formatTaskTitleHtml } from '@/utils/taskTitleFormat';
import { openKanbanView, usePlugin } from '@/main';
import { useUserSettings } from '@/composables/useUserSettings';
import { useTaskFilters } from '@/composables/useTaskFilters';
import { useTaskFilterState } from '@/composables/useTaskFilterState';
import { resolveGroupColorCss, resolveGroupTextColor } from '@/utils/groupColor';
import { eventBus, Events } from '@/utils/eventBus';
import { getCrdtRepository, useCrdtTasks } from '@/crdtStore';
import { formatMonthDay } from '@/utils/dateHelpers';
import { createBlockIdBatchQueue } from '@/utils/blockIdBatchQueue';
import {
  buildTaskReminderAttrs,
  getTaskReminderLabel,
  isSameTaskReminderSelection,
  normalizeTaskReminderSelection,
  type TaskReminderSelection,
  type TaskReminderType
} from '@/utils/taskReminder';
import {
  applyRepeatRuleOptimisticToTasks,
  getDocumentCreationSortKey,
  normalizeNotebookIds,
  type RepeatRulePayload
} from '@/utils/taskViewShared';
import { repeatDragDebug } from '@/utils/repeatDragDebug';
import { rebuildAffectedRepeatTasks } from '@/repeatRepository';

const { data: userSettings, loadSettings, updateSettings } = useUserSettings();
const REPEAT_DEBUG_WINDOW_MS = 5000;
let lastRepeatDebugPayload: {
  blockId?: string;
  seriesId?: string;
  frequency?: string;
  ts: number;
} | null = null;
let repeatReconcileRequestId = 0;

function summarizeTaskForRepeatDebug(task: Task | null | undefined) {
  if (!task) return null;
  return {
    id: task.id,
    blockId: task.blockId,
    repeatSeriesId: task.repeatSeriesId,
    repeatFrequency: task.repeatFrequency,
    repeatInstanceDate: task.repeatInstanceDate,
    isVirtual: task.isVirtual,
    startDate: task.startDate,
    dueDate: task.dueDate,
    startTime: task.startTime,
    dueTime: task.dueTime
  };
}

function getActiveRepeatDebugContext() {
  if (!lastRepeatDebugPayload) return null;
  if (Date.now() - lastRepeatDebugPayload.ts > REPEAT_DEBUG_WINDOW_MS) return null;
  return lastRepeatDebugPayload;
}

function collectRepeatDebugTasks(taskList: Task[], context?: { blockId?: string; seriesId?: string } | null) {
  if (!context) return [];
  return taskList
    .filter((task) =>
      (!!context.blockId && task.blockId === context.blockId)
      || (!!context.seriesId && task.repeatSeriesId === context.seriesId)
    )
    .map((task) => summarizeTaskForRepeatDebug(task));
}

const t = (key: string) => {
  const lang = window.siyuan?.languages || {};
  const defaultLang: Record<string, string> = {
    'taskManager.title': '任务管理',
    'taskManager.status': '状态',
    'taskManager.statusAll': '全部',
    'taskManager.statusPending': '待处理',
    'taskManager.statusInProgress': '进行中',
    'taskManager.statusCompleted': '已完成',
    'taskManager.statusCancelled': '已取消',
    'taskManager.priority': '优先级',
    'taskManager.priorityAll': '全部',
    'taskManager.priorityHigh': '高',
    'taskManager.priorityMedium': '中',
    'taskManager.priorityLow': '低',
    'taskManager.priorityNone': '无',
    'taskManager.notebook': '笔记本',
    'taskManager.all': '全部',
    'taskManager.document': '文档',
    'taskManager.filter': '筛选',
    'taskManager.refresh': '刷新',
    'taskManager.addTask': '新建任务',
    'taskManager.expandAll': '展开全部',
    'taskManager.collapseAll': '收起全部',
    'taskManager.taskList': '任务列表',
    'taskManager.noTasks': '暂无任务',
    'taskManager.taskName': '任务名称',
    'taskManager.dueDate': '截止日期',
    'taskManager.save': '保存'
  };
  return (lang as Record<string, string>)[key] || defaultLang[key] || key;
};

const TASK_MANAGER_CRDT_STORE_ID = 'task-manager';
const crdtRepo = getCrdtRepository(TASK_MANAGER_CRDT_STORE_ID);
const { tasks } = useCrdtTasks(TASK_MANAGER_CRDT_STORE_ID);
let isMobileFrontend = false;
try {
  const frontend = getFrontend();
  isMobileFrontend = frontend === 'mobile' || frontend === 'browser-mobile';
} catch {
  isMobileFrontend = false;
}
const loading = ref(false);
const isRefreshButtonSpinning = ref(false);
const showTaskModal = ref(false);
const showTaskScopeDialog = ref(false);
const showTaskGroupDialog = ref(false);
const requiresScopeInitialization = ref(false);
const excludedNotebookIds = ref<string[]>([]);
const showCompletedTasks = ref(true);
const lastTaskNotebook = ref<string>('');
const lastTaskDocument = ref<string>('');
const expandedSubtasks = ref(new Set<string>());
const expandedDescriptions = ref(new Set<string>());
interface TaskEditDraft {
  taskId: string;
  priority: Task['priority'];
  dueDate: string;
  description: string;
  reminderType?: TaskReminderType;
  reminderCustomTime: string;
  groupId: string;
}
type TaskDueFilterKey = 'overdue' | 'today' | 'next7Days' | 'noDueDate';
type TaskUpdateFilterKey = 'today' | 'thisWeek' | 'thisMonth';
type TaskExtraFilterKey = 'hasDescription' | 'hasSubtasks';
const taskEditDraft = ref<TaskEditDraft | null>(null);
const inlineEditingDescriptionTaskId = ref<string | null>(null);
const inlineDescriptionDraftByTaskId = ref(new Map<string, string>());
const inlineDescriptionSavingTaskIds = new Set<string>();
const isTaskListCollapsed = ref(false);
const notebooks = ref<Notebook[]>([]);
const skipSet = new Set<string>();
const taskManagerContainerRef = ref<HTMLElement | null>(null);
const taskModalTeleportTarget = ref<HTMLElement | null>(null);
const taskEditMenuTaskId = ref<string | null>(null);
const taskFilterControlRef = ref<HTMLElement | null>(null);
const taskFilterPopoverRef = ref<InstanceType<typeof TaskFilterPopover> | null>(null);
const taskFilterPopoverStyle = ref<Record<string, string>>({});
let taskEditorProtyle: Protyle | null = null;
const openingTaskPopoverBlockIds = new Set<string>();
const taskEditorSidebarVisible = ref(false);
const taskEditorSidebarTitle = ref('编辑任务');
const taskEditorSidebarMountRef = ref<HTMLElement | null>(null);
const taskEditorPriorityPopover = ref<{ position: { x: number; y: number } } | null>(null);
const taskEditorQuickPanel = ref<'due' | 'description' | 'group' | 'reminder' | null>(null);
const showTaskMoveDialog = ref(false);
const isTaskMoveSubmitting = ref(false);
const taskMoveSelectedNotebook = ref('');
const taskMoveSelectedDocument = ref('');
const taskFilterPopoverVisible = ref(false);
const taskGroups = ref<TaskGroup[]>([]);
const lastSelectedTaskGroupId = ref<string>('');
const tasksListRef = ref<HTMLElement | null>(null);
const taskScrollContainerRef = ref<HTMLElement | null>(null);

const TASK_VIRTUAL_ROW_HEIGHT = 86;
const TASK_VIRTUAL_OVERSCAN = 8;
const TASK_VIRTUAL_THRESHOLD = 200;
const TASK_TITLE_HYDRATE_LIMIT = 120;
const taskVirtualRange = ref({ start: 0, end: 0, top: 0, bottom: 0 });
let taskVirtualRaf: number | null = null;
const taskHeightCache = new Map<string, number>();
const taskRowElements = new Map<string, HTMLElement>();
const taskHeightVersion = ref(0);
let taskRowMeasureRaf: number | null = null;
let taskTitleHydrateTimer: number | null = null;
let isTaskTitleHydrating = false;

const TASK_GROUP_NONE_ID = '__none__';
const defaultGroupChipColor = '#9aa0a6';
let skipCleanupTimer: number | null = null;

const taskModalTeleportTo = computed(() => taskModalTeleportTarget.value || 'body');
const activeTaskEditTask = computed(() =>
  taskEditMenuTaskId.value
    ? (tasks.value.find(task => task.id === taskEditMenuTaskId.value) || null)
    : null
);
const activeTaskEditDraft = computed(() =>
  taskEditMenuTaskId.value && taskEditDraft.value?.taskId === taskEditMenuTaskId.value
    ? taskEditDraft.value
    : null
);

function resolveTaskModalTeleportTarget(): void {
  const localHost = taskManagerContainerRef.value;
  if (!localHost || typeof localHost.closest !== 'function') {
    taskModalTeleportTarget.value = null;
    return;
  }
  taskModalTeleportTarget.value = localHost.closest('.Pinch-habit-container') as HTMLElement | null;
}

function resolveTaskScrollContainer(): HTMLElement | null {
  const localHost = taskManagerContainerRef.value;
  if (!localHost || typeof localHost.closest !== 'function') {
    return document.documentElement;
  }
  return (localHost.closest('.Pinch-habit-container') as HTMLElement | null) || document.documentElement;
}

function findTaskIndexForOffset(offsets: number[], offset: number): number {
  let low = 0;
  let high = offsets.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (offsets[mid] <= offset) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return Math.max(0, low - 1);
}

function updateTaskVirtualRange(): void {
  if (!shouldUseTaskVirtualList.value) {
    taskVirtualRange.value = {
      start: 0,
      end: displayedTasks.value.length,
      top: 0,
      bottom: 0
    };
    return;
  }

  const scrollHost = taskScrollContainerRef.value;
  const listEl = tasksListRef.value;
  if (!scrollHost || !listEl) {
    return;
  }

  const scrollTop = scrollHost.scrollTop || 0;
  const viewportHeight = scrollHost.clientHeight || window.innerHeight || 0;
  const containerRect = scrollHost.getBoundingClientRect();
  const listRect = listEl.getBoundingClientRect();
  const listTop = listRect.top - containerRect.top + scrollTop;
  const listOffset = Math.max(0, scrollTop - listTop);
  const offsets = taskHeightOffsets.value;
  const totalHeight = offsets[offsets.length - 1] || 0;
  const startIndex = Math.max(
    0,
    findTaskIndexForOffset(offsets, listOffset) - TASK_VIRTUAL_OVERSCAN
  );
  const endIndex = Math.min(
    displayedTasks.value.length,
    findTaskIndexForOffset(offsets, listOffset + viewportHeight) + TASK_VIRTUAL_OVERSCAN + 1
  );
  const topPadding = offsets[startIndex] || 0;
  const bottomPadding = Math.max(0, totalHeight - (offsets[endIndex] || 0));

  taskVirtualRange.value = {
    start: startIndex,
    end: endIndex,
    top: topPadding,
    bottom: bottomPadding
  };
}

function scheduleTaskVirtualUpdate(): void {
  if (taskVirtualRaf !== null) {
    cancelAnimationFrame(taskVirtualRaf);
  }
  taskVirtualRaf = requestAnimationFrame(() => {
    taskVirtualRaf = null;
    updateTaskVirtualRange();
  });
}

function handleTaskListScroll(): void {
  scheduleTaskVirtualUpdate();
  scheduleTaskTitleHydration(160);
}

function scheduleTaskRowMeasure(): void {
  if (!shouldUseTaskVirtualList.value) {
    return;
  }
  if (taskRowMeasureRaf !== null) {
    cancelAnimationFrame(taskRowMeasureRaf);
  }
  taskRowMeasureRaf = requestAnimationFrame(() => {
    taskRowMeasureRaf = null;
    let changed = false;
    for (const [taskId, el] of taskRowElements.entries()) {
      const height = Math.max(1, Math.round(el.getBoundingClientRect().height));
      const prev = taskHeightCache.get(taskId);
      if (prev !== height) {
        taskHeightCache.set(taskId, height);
        changed = true;
      }
    }
    if (changed) {
      taskHeightVersion.value += 1;
      scheduleTaskVirtualUpdate();
    }
  });
}

function resolveTaskRowElement(el: unknown): HTMLElement | null {
  if (el instanceof HTMLElement) {
    return el;
  }
  if (el && typeof el === 'object' && '$el' in el) {
    const candidate = (el as { $el?: unknown }).$el;
    if (candidate instanceof HTMLElement) {
      return candidate;
    }
  }
  return null;
}

function setTaskRowRef(taskId: string, el: unknown): void {
  const resolved = resolveTaskRowElement(el);
  if (!resolved) {
    taskRowElements.delete(taskId);
    return;
  }
  const current = taskRowElements.get(taskId);
  if (current === resolved) return;
  taskRowElements.set(taskId, resolved);
  scheduleTaskRowMeasure();
}

function openTaskModal(): void {
  resolveTaskModalTeleportTarget();
  showTaskModal.value = true;
}

function openTaskGroupDialog(): void {
  showTaskGroupDialog.value = true;
}

function collectRemovedGroupIds(previous: TaskGroup[], next: TaskGroup[]): string[] {
  const previousIds = new Set(
    (previous || [])
      .map(group => (typeof group?.id === 'string' ? group.id.trim() : ''))
      .filter(id => id.length > 0)
  );
  const nextIds = new Set(
    (next || [])
      .map(group => (typeof group?.id === 'string' ? group.id.trim() : ''))
      .filter(id => id.length > 0)
  );
  const removed: string[] = [];
  previousIds.forEach((id) => {
    if (!nextIds.has(id)) {
      removed.push(id);
    }
  });
  return removed;
}

async function clearRemovedGroupAssignments(removedGroupIds: string[]): Promise<void> {
  const normalizedIds = removedGroupIds
    .map(id => (typeof id === 'string' ? id.trim() : ''))
    .filter(id => id.length > 0);
  if (normalizedIds.length === 0) {
    return;
  }

  const removedSet = new Set(normalizedIds);
  const localAffectedTasks = tasks.value.filter(task => {
    const groupId = typeof task.groupId === 'string' ? task.groupId.trim() : '';
    return groupId.length > 0 && removedSet.has(groupId);
  });

  const localBlockIds = localAffectedTasks
    .map(task => (task.type === 'block' ? task.blockId : null))
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  let blockIdsToClear: string[] = [];
  try {
    const idsClause = normalizedIds.map(id => `'${escapeSqlLiteral(id)}'`).join(',');
    const rows = await sql(`
      SELECT DISTINCT a.block_id as id
      FROM attributes a
      JOIN blocks b ON b.id = a.block_id
      WHERE a.name = 'custom-task-group'
        AND a.value IN (${idsClause})
        AND (b.type = 'i' OR b.type = 'p')
        AND b.subtype = 't'
    `) as Array<{ id?: string }>;
    const sqlBlockIds = (rows || [])
      .map(row => (typeof row?.id === 'string' ? row.id : ''))
      .filter(id => id.length > 0);
    blockIdsToClear = Array.from(new Set([...sqlBlockIds, ...localBlockIds]));
  } catch (error) {
    console.error('[TaskManager] 查询标签任务失败:', error);
    blockIdsToClear = Array.from(new Set(localBlockIds));
  }

  const successBlockIds: string[] = [];
  for (const blockId of blockIdsToClear) {
    try {
      await setBlockAttrs(blockId, { 'custom-task-group': '' });
      successBlockIds.push(blockId);
    } catch (error) {
      console.error('[TaskManager] 清理任务标签属性失败:', error);
    }
  }

  const successBlockIdSet = new Set(successBlockIds);
  const tasksToUpdate = localAffectedTasks.filter(task => {
    if (task.type !== 'block') return true;
    if (!task.blockId) return true;
    return successBlockIdSet.has(task.blockId);
  });

  if (tasksToUpdate.length > 0) {
    const now = new Date().toISOString();
    const idsToUpdate = new Set(tasksToUpdate.map(task => task.id));
    tasks.value = tasks.value.map(task => {
      if (!idsToUpdate.has(task.id)) {
        return task;
      }
      return {
        ...task,
        groupId: undefined,
        updatedAt: now
      };
    });
    idsToUpdate.forEach(taskId => {
      crdtRepo.updateTaskField(taskId, 'groupId', undefined);
    });
    await refreshInternalState();
  }

  if (successBlockIds.length > 0) {
    eventBus.emit(Events.TASK_CHANGED, { blockIds: successBlockIds });
  }
}

async function handleTaskGroupSave(groups: TaskGroup[]): Promise<void> {
  const removedGroupIds = collectRemovedGroupIds(taskGroups.value, groups);
  let saved = false;
  const nextGroups = (groups || []).map(group => ({ ...group }));
  taskGroups.value = nextGroups;
  eventBus.emit(Events.TASK_GROUPS_UPDATED, { groups: nextGroups });
  try {
    await saveTaskGroups(nextGroups);
    saved = true;
  } catch {
  } finally {
    showTaskGroupDialog.value = false;
  }
  if (saved && removedGroupIds.length > 0) {
    await clearRemovedGroupAssignments(removedGroupIds);
    const removedSet = new Set(removedGroupIds);
    activeTaskGroupFilters.value = activeTaskGroupFilters.value.filter(id => !removedSet.has(id));
  }
  if (lastSelectedTaskGroupId.value) {
    const exists = taskGroups.value.some(group => group.id === lastSelectedTaskGroupId.value);
    if (!exists) {
      lastSelectedTaskGroupId.value = '';
      void updateSettings('taskManager', { selectedGroupId: '' });
    }
  }
}

function applyExternalTaskGroups(groups: TaskGroup[]): void {
  const nextGroups = (groups || []).map(group => ({ ...group }));
  taskGroups.value = nextGroups;
  if (activeTaskGroupFilters.value.length > 0) {
    const groupIdSet = new Set(nextGroups.map(group => group.id));
    activeTaskGroupFilters.value = activeTaskGroupFilters.value.filter(
      id => id === TASK_GROUP_NONE_ID || groupIdSet.has(id)
    );
  }
  if (lastSelectedTaskGroupId.value) {
    const exists = nextGroups.some(group => group.id === lastSelectedTaskGroupId.value);
    if (!exists) {
      lastSelectedTaskGroupId.value = '';
      void updateSettings('taskManager', { selectedGroupId: '' });
    }
  }
}

function closeTaskEditMenu(): void {
  taskEditDraft.value = null;
  taskEditMenuTaskId.value = null;
}

function closeSiyuanCommonMenu(): void {
  const menu = window.siyuan?.menus?.menu as {
    close?: () => void;
  } | null | undefined;

  try {
    menu?.close?.();
  } catch {
  }

  const commonMenu = document.querySelector<HTMLElement>('#commonMenu[data-name="inline-context"]')
    || document.querySelector<HTMLElement>('#commonMenu.b3-menu');
  if (!commonMenu) {
    return;
  }

  commonMenu.classList.add('fn__none');
  commonMenu.style.display = 'none';
}

function handleTaskEditorSidebarPanelMouseDown(): void {
  closeSiyuanCommonMenu();
}

function closeTaskFilterPopover(): void {
  taskFilterPopoverVisible.value = false;
}

function toggleTaskFilterPopover(): void {
  taskFilterPopoverVisible.value = !taskFilterPopoverVisible.value;
  if (taskFilterPopoverVisible.value) {
    void nextTick(updateTaskFilterPopoverPosition);
  }
}

function selectTaskEditorGroup(value: string): void {
  if (!activeTaskEditTask.value || !activeTaskEditDraft.value) {
    return;
  }
  const groupId = value === TASK_GROUP_NONE_ID ? '' : value;
  void quickSaveTaskGroup(activeTaskEditTask.value, groupId);
}

function startSkipSetCleanup() {
  if (skipCleanupTimer !== null) {
    clearInterval(skipCleanupTimer);
  }
  
  skipCleanupTimer = window.setInterval(() => {
    if (skipSet.size > 0) {
      skipSet.clear();
    }
  }, 60000);
}

function stopSkipSetCleanup() {
  if (skipCleanupTimer !== null) {
    clearInterval(skipCleanupTimer);
    skipCleanupTimer = null;
  }
}

const filterNotebook = ref<string>('all');
const filterDocument = ref<string>('all');

const taskModalDefaultNotebook = computed(() => {
  if (filterNotebook.value !== 'all') {
    return filterNotebook.value;
  }
  return lastTaskNotebook.value || '';
});

const taskModalDefaultDocument = computed(() => {
  if (filterNotebook.value !== 'all' && filterDocument.value !== 'all') {
    return filterDocument.value;
  }
  return lastTaskDocument.value || '';
});
let filterSettingsUpdateTimer: number | null = null;

const enabledNotebooks = computed(() => {
  const excludedIdSet = new Set(excludedNotebookIds.value);
  return notebooks.value.filter(notebook => !excludedIdSet.has(notebook.id));
});

const notebookOptions = computed(() => {
  return [
    { value: 'all', text: t('taskManager.all') },
    ...enabledNotebooks.value.map(nb => ({ value: nb.id, text: nb.name }))
  ];
});

const taskMoveNotebookOptions = computed(() => {
  return notebooks.value.map(nb => ({ value: nb.id, text: nb.name }));
});

const taskMoveDocuments = computed(() => {
  const notebookId = taskMoveSelectedNotebook.value;
  if (!notebookId) {
    return [] as Document[];
  }

  const docs = [...(taskDocumentsByNotebook.value.get(notebookId) || [])];
  const activeTask = activeTaskEditTask.value;
  const activeRootId = typeof activeTask?.rootId === 'string' ? activeTask.rootId.trim() : '';
  if (
    activeTask
    && activeTask.notebookId === notebookId
    && activeRootId
    && !docs.some(doc => doc.id === activeRootId)
  ) {
    const fallbackPath = typeof activeTask.hPath === 'string' ? activeTask.hPath : '';
    docs.unshift({
      id: activeRootId,
      name: fallbackPath.split('/').pop() || fallbackPath || activeRootId,
      notebookId,
      path: fallbackPath || undefined
    });
  }

  return docs;
});

const taskMoveDocumentOptions = computed(() => {
  return taskMoveDocuments.value.map(doc => ({ value: doc.id, text: doc.name }));
});

const taskMoveTargetUnchanged = computed(() => {
  const activeTask = activeTaskEditTask.value;
  if (!activeTask) {
    return false;
  }
  return taskMoveSelectedNotebook.value === (activeTask.notebookId || '')
    && taskMoveSelectedDocument.value === (activeTask.rootId || '');
});

const canSubmitTaskMove = computed(() => {
  const activeTask = activeTaskEditTask.value;
  return !!activeTask?.blockId
    && !!taskMoveSelectedNotebook.value
    && !!taskMoveSelectedDocument.value
    && !taskMoveTargetUnchanged.value
    && !isTaskMoveSubmitting.value;
});

const taskGroupPickerOptions = computed(() => {
  const options = [
    { value: TASK_GROUP_NONE_ID, label: '无标签', special: true, color: '', colorCss: '', textColor: '' }
  ];
  taskGroups.value.forEach(group => {
    const rawColor = group.color || '';
    options.push({
      value: group.id,
      label: group.name,
      special: false,
      color: rawColor,
      colorCss: resolveGroupColorCss(rawColor),
      textColor: resolveGroupTextColor(rawColor)
    });
  });
  return options;
});

const taskEditorSelectedGroupId = computed(() => {
  const groupId = (activeTaskEditDraft.value?.groupId || '').trim();
  return groupId || TASK_GROUP_NONE_ID;
});

const taskEditorGroupLabel = computed(() => {
  const groupId = (activeTaskEditDraft.value?.groupId || '').trim();
  if (!groupId) {
    return '无标签';
  }
  const group = taskGroups.value.find(item => item.id === groupId);
  return group?.name || '标签';
});

const taskEditorGroupColorValue = computed(() => {
  const groupId = (activeTaskEditDraft.value?.groupId || '').trim();
  if (!groupId) {
    return '';
  }
  return taskGroups.value.find(item => item.id === groupId)?.color || '';
});

const taskEditorGroupButtonStyle = computed(() => {
  const rawColor = taskEditorGroupColorValue.value;
  if (!rawColor) {
    return {};
  }
  return {
    backgroundColor: resolveGroupColorCss(rawColor),
    borderColor: resolveGroupColorCss(rawColor),
    color: resolveGroupTextColor(rawColor)
  };
});

const taskModalDefaultGroupId = computed(() => {
  const candidate = (lastSelectedTaskGroupId.value || '').trim();
  if (!candidate) {
    return '';
  }
  const exists = taskGroups.value.some(group => group.id === candidate);
  return exists ? candidate : '';
});

const toggleTaskListCollapsed = () => {
  isTaskListCollapsed.value = !isTaskListCollapsed.value;
};

let lastRefreshTime = 0;

let eventUnsubscribers: Array<() => void> = [];
const processingBlockIds = new Set<string>();
let fallbackRefreshTimer: number | null = null;
const MAX_INCREMENTAL_BLOCKS_PER_FLUSH = 80;
const FALLBACK_FAILURE_THRESHOLD = 2;
let consecutiveFallbackFailures = 0;
let lastMismatchForceRefreshAt = 0;
const MISMATCH_FORCE_REFRESH_COOLDOWN = 500;
let taskScopeRefreshTimer: number | null = null;
let isHydratingFilters = true;
let lastTaskDocumentOptionsRefreshAt = 0;
const TASK_DOCUMENT_OPTIONS_CACHE_TTL = 60000;
const FILTER_SWITCH_BROAD_LOAD_THRESHOLD = 5000;
const PINCH_INBOX_OPTION_ID = '__pinch_inbox__';

// Tracks tasks whose dates were just cleared, to prevent stale values from being written back by delayed events.
const recentlyDeletedDates = ref(new Map<string, { startDate: null; dueDate: null; timestamp: number }>());

// Short-lived guard map for date deletion reconciliation.

interface TaskIndex {
  task: Task;
  isSubtask: boolean;
  parentTaskId?: string;
}

const blockIdToTaskIndex = new Map<string, TaskIndex>();
const subtaskToParentMap = new Map<string, string>();
const taskDocumentsByNotebook = ref<Map<string, Document[]>>(new Map());

// === Notebook/document option derivation and persisted filter selection ===
const allDocuments = computed(() => {
  return Array.from(taskDocumentsByNotebook.value.values()).flat();
});

const documentOptions = computed(() => {
  if (filterNotebook.value === 'all') return [];
  
  const docs = taskDocumentsByNotebook.value.get(filterNotebook.value) || [];
  return [
    { value: 'all', text: t('taskManager.all') },
    ...docs.map(doc => ({ value: doc.id, text: doc.name }))
  ];
});

function normalizeDocumentSelection(notebookId: string): void {
  if (notebookId === 'all') {
    if (filterDocument.value !== 'all') {
      filterDocument.value = 'all';
    }
    return;
  }

  if (filterDocument.value !== 'all') {
    const availableDocs = documentOptions.value.map(d => d.value);
    if (!availableDocs.includes(filterDocument.value)) {
      filterDocument.value = 'all';
    }
  }
}

function buildTaskDocumentScopeSql(alias: string = 'b'): string {
  const excluded = normalizeNotebookIds(excludedNotebookIds.value);
  if (excluded.length === 0) {
    return '';
  }
  const idsClause = excluded.map(id => `'${escapeSqlLiteral(id)}'`).join(',');
  return ` AND ${alias}.box NOT IN (${idsClause})`;
}

function buildTaskDocumentCompletionSql(alias: string = 'b'): string {
  if (showCompletedTasks.value) {
    return ` AND (${alias}.markdown LIKE '%[ ]%' OR ${alias}.markdown LIKE '%[x]%' OR ${alias}.markdown LIKE '%[X]%')`;
  }
  return ` AND ${alias}.markdown LIKE '%[ ]%'`;
}

async function refreshTaskDocumentOptions(force = false): Promise<void> {
  if (
    !force &&
    taskDocumentsByNotebook.value.size > 0 &&
    Date.now() - lastTaskDocumentOptionsRefreshAt < TASK_DOCUMENT_OPTIONS_CACHE_TTL
  ) {
    return;
  }

  try {
    const rows = await sql(`
      SELECT b.box, b.root_id, MIN(b.hpath) as hpath
      FROM blocks b
      WHERE (b.type = 'i' OR b.type = 'p')
        ${buildTaskDocumentScopeSql('b')}
        AND b.subtype = 't'
        ${buildTaskDocumentCompletionSql('b')}
      GROUP BY b.box, b.root_id
      ORDER BY b.box, b.root_id
    `) as Array<{ box?: string; root_id?: string; hpath?: string }>;

    const nextMap = new Map<string, Document[]>();
    for (const row of rows || []) {
      const notebookId = typeof row?.box === 'string' ? row.box : '';
      const rootId = typeof row?.root_id === 'string' ? row.root_id : '';
      if (!notebookId || !rootId) {
        continue;
      }

      const rawPath = typeof row?.hpath === 'string' && row.hpath.trim().length > 0
        ? row.hpath
        : rootId;
      const name = rawPath.split('/').pop() || rawPath;
      const docs = nextMap.get(notebookId) || [];
      docs.push({
        id: rootId,
        name,
        notebookId,
        path: rawPath
      });
      nextMap.set(notebookId, docs);
    }

    nextMap.forEach((docs, notebookId) => {
      const dedupById = new Map<string, Document>();
      for (const doc of docs) {
        if (!dedupById.has(doc.id)) {
          dedupById.set(doc.id, doc);
        }
      }
      nextMap.set(
        notebookId,
        Array.from(dedupById.values()).sort((a, b) => {
          const timeDiff = getDocumentCreationSortKey(b.id) - getDocumentCreationSortKey(a.id);
          if (timeDiff !== 0) return timeDiff;
          return a.name.localeCompare(b.name, 'zh-CN');
        })
      );
    });

    taskDocumentsByNotebook.value = nextMap;
    lastTaskDocumentOptionsRefreshAt = Date.now();
  } catch {
    taskDocumentsByNotebook.value = new Map();
    lastTaskDocumentOptionsRefreshAt = 0;
  }
}

function scheduleFilterSettingsUpdate() {
  if (filterSettingsUpdateTimer !== null) {
    clearTimeout(filterSettingsUpdateTimer);
  }

  filterSettingsUpdateTimer = window.setTimeout(async () => {
    await updateSettings('taskManager', {
      filterNotebook: filterNotebook.value,
      filterDocument: filterDocument.value
    });
  }, 200);
}

watch([filterNotebook, filterDocument], ([newNotebook]) => {
  const previousDocument = filterDocument.value;
  normalizeDocumentSelection(newNotebook);
  if (isHydratingFilters) {
    return;
  }
  if (requiresScopeInitialization.value) {
    return;
  }

  scheduleTaskScopeRefresh(100);

  if (filterDocument.value !== previousDocument) {
    return;
  }

  scheduleFilterSettingsUpdate();
});

watch(showTaskModal, (show) => {
  if (show && !taskModalTeleportTarget.value) {
    resolveTaskModalTeleportTarget();
  }
});

watch(taskEditMenuTaskId, () => {
  taskEditorQuickPanel.value = null;
});

watch(taskFilterPopoverVisible, (visible) => {
  if (visible) {
    void nextTick(updateTaskFilterPopoverPosition);
  }
});

watch(isTaskListCollapsed, (collapsed) => {
  if (collapsed) {
    closeTaskFilterPopover();
  }
});

const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2, 'none': 3 };
const taskStatusFilterOptions: Array<{ value: Task['status']; label: string }> = [
  { value: 'pending', label: '待处理' },
  { value: 'in-progress', label: '进行中' },
  { value: 'delayed', label: '延迟' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' }
];
const taskPriorityFilterOptions: Array<{ value: Task['priority']; label: string }> = [
  { value: 'high', label: '高优先级' },
  { value: 'medium', label: '中优先级' },
  { value: 'low', label: '低优先级' },
  { value: 'none', label: '无优先级' }
];
const taskDueFilterOptions: Array<{ value: TaskDueFilterKey; label: string }> = [
  { value: 'overdue', label: '已逾期' },
  { value: 'today', label: '今天到期' },
  { value: 'next7Days', label: '未来 7 天' },
  { value: 'noDueDate', label: '无截止日期' }
];
const taskUpdatedFilterOptions: Array<{ value: TaskUpdateFilterKey; label: string }> = [
  { value: 'today', label: '今日' },
  { value: 'thisWeek', label: '本周' },
  { value: 'thisMonth', label: '本月' }
];
const taskExtraFilterOptions: Array<{ value: TaskExtraFilterKey; label: string }> = [
  { value: 'hasDescription', label: '有描述' },
  { value: 'hasSubtasks', label: '有子任务' }
];
const taskGroupFilterOptions = computed(() => {
  const options: Array<{ value: string; label: string; style: Record<string, string> }> = [
    { value: TASK_GROUP_NONE_ID, label: '无标签', style: {} }
  ];
  taskGroups.value.forEach(group => {
    const rawColor = group.color || '';
    const backgroundColor = resolveGroupColorCss(rawColor);
    const textColor = resolveGroupTextColor(rawColor);
    const style = backgroundColor ? {
      '--task-filter-chip-bg': backgroundColor,
      '--task-filter-chip-color': textColor,
      '--task-filter-chip-hover-color': textColor,
      '--task-filter-chip-active-bg': backgroundColor,
      '--task-filter-chip-active-color': textColor,
      '--task-filter-chip-active-border': textColor
    } : {};
    options.push({
      value: group.id,
      label: group.name,
      style
    });
  });
  return options;
});

function buildActiveGroupChipStyle(groupId: string): Record<string, string> | undefined {
  if (!groupId || groupId === TASK_GROUP_NONE_ID) {
    return undefined;
  }
  const group = taskGroups.value.find(item => item.id === groupId);
  if (!group) return undefined;
  const rawColor = group.color || '';
  const backgroundColor = resolveGroupColorCss(rawColor);
  if (!backgroundColor) return undefined;
  const textColor = resolveGroupTextColor(rawColor);
  return {
    '--active-task-filter-chip-bg': backgroundColor,
    '--active-task-filter-chip-color': textColor,
    '--active-task-filter-chip-hover-color': textColor,
    '--active-task-filter-chip-shadow': `inset 0 0 0 1px ${textColor}`
  };
}

const {
  activeStatusFilters: activeTaskStatusFilters,
  activePriorityFilters: activeTaskPriorityFilters,
  activeDueFilters: activeTaskDueFilters,
  activeUpdatedFilters: activeTaskUpdatedFilters,
  activeGroupFilters: activeTaskGroupFilters,
  activeExtraFilters: activeTaskExtraFilters,
  hasActive: hasActiveTaskFilters,
  count: activeTaskFilterCount,
  sections: taskFilterSections,
  clear: clearTaskFilters,
  handleToggle: handleTaskFilterToggle
} = useTaskFilterState({
  statusOptions: taskStatusFilterOptions,
  priorityOptions: taskPriorityFilterOptions,
  dueOptions: taskDueFilterOptions,
  updatedOptions: taskUpdatedFilterOptions,
  extraOptions: taskExtraFilterOptions,
  groupOptions: taskGroupFilterOptions,
  buildActiveGroupStyle: buildActiveGroupChipStyle,
  updatedSingle: true
});

const taskEditPriorityOptions: Array<{
  value: Task['priority'];
  label: string;
  background: string;
  color: string;
}> = [
  { value: 'high', label: '高优先级', background: 'var(--pinch-background10)', color: 'var(--pinch-font-color10)' },
  { value: 'medium', label: '中优先级', background: 'var(--pinch-background3)', color: 'var(--pinch-font-color3)' },
  { value: 'low', label: '低优先级', background: 'var(--pinch-background7)', color: 'var(--pinch-font-color7)' },
  { value: 'none', label: '无优先级', background: 'var(--b3-list-hover)', color: 'var(--b3-theme-on-surface)' }
];
const taskEditorPriorityOption = computed(() => {
  const current = activeTaskEditDraft.value?.priority || 'none';
  return taskEditPriorityOptions.find(option => option.value === current) || taskEditPriorityOptions[3];
});
const taskEditorDueText = computed(() => {
  const dueDate = activeTaskEditDraft.value?.dueDate || '';
  if (!dueDate) return '未设置';
  return formatMonthDay(dueDate);
});
const taskEditorHasDueDate = computed(() => {
  return !!(activeTaskEditDraft.value?.dueDate || '').trim();
});
const taskEditorHasDescription = computed(() => {
  const description = activeTaskEditDraft.value?.description || '';
  return description.trim().length > 0;
});
const taskEditorReminderText = computed(() => {
  return getTaskReminderLabel(
    activeTaskEditDraft.value?.reminderType,
    activeTaskEditDraft.value?.reminderCustomTime
  );
});
const taskEditorHasReminder = computed(() => {
  return !!(activeTaskEditDraft.value?.reminderType || '').trim();
});

const taskFilters = {
  notebook: filterNotebook,
  document: filterDocument
};

let lastLoadedScope: TaskQueryScope | null = null;

function normalizeScope(scope?: TaskQueryScope) {
  return {
    includeCompleted: scope?.includeCompleted !== false,
    notebookId: scope?.notebookId || undefined,
    documentId: scope?.documentId || undefined
  };
}

function isScopeCoveredByDataset(target?: TaskQueryScope): boolean {
  if (!lastLoadedScope) {
    return false;
  }
  const targetScope = normalizeScope(target);
  const datasetScope = normalizeScope(lastLoadedScope);

  if (!datasetScope.includeCompleted && targetScope.includeCompleted) {
    return false;
  }

  if (datasetScope.notebookId) {
    if (!targetScope.notebookId) {
      return false;
    }
    if (targetScope.notebookId !== datasetScope.notebookId) {
      return false;
    }
  }

  if (datasetScope.documentId) {
    if (targetScope.documentId !== datasetScope.documentId) {
      return false;
    }
  }

  return true;
}

function getCurrentTaskQueryScope(): TaskQueryScope | undefined {
  const includeCompleted = showCompletedTasks.value;
  if (filterNotebook.value === 'all' && includeCompleted) {
    return undefined;
  }

  const scope: TaskQueryScope = {
    includeCompleted
  };
  if (filterNotebook.value !== 'all') {
    scope.notebookId = filterNotebook.value;
  }
  if (filterNotebook.value !== 'all' && filterDocument.value !== 'all') {
    scope.documentId = filterDocument.value;
  }
  return scope;
}

function scheduleTaskScopeRefresh(delay = 100): void {
  const nextScope = getCurrentTaskQueryScope();
  if (isScopeCoveredByDataset(nextScope)) {
    return;
  }

  if (taskScopeRefreshTimer !== null) {
    clearTimeout(taskScopeRefreshTimer);
  }
  taskScopeRefreshTimer = window.setTimeout(async () => {
    taskScopeRefreshTimer = null;
    await refreshTasks(false, {
      showLoading: false,
      compareExisting: false,
      ignoreThrottle: true,
      source: 'filter-switch'
    });
  }, delay);
}

function normalizeDateInputValue(value: string): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) {
    return '';
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}

function updateTaskFilterPopoverPosition(): void {
  if (!taskFilterPopoverVisible.value) {
    return;
  }

  const trigger = taskFilterControlRef.value;
  if (!trigger) {
    return;
  }

  const triggerRect = trigger.getBoundingClientRect();
  const containerRect = taskManagerContainerRef.value?.getBoundingClientRect() || triggerRect;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const horizontalMargin = 12;
  const verticalMargin = 12;
  const verticalGap = 8;

  const width = Math.max(
    0,
    Math.min(320, viewportWidth - horizontalMargin * 2, containerRect.width - 8)
  );
  if (width <= 0) {
    return;
  }

  let left = triggerRect.right - width;
  left = Math.max(horizontalMargin, Math.min(left, viewportWidth - horizontalMargin - width));
  left = Math.max(containerRect.left + 4, Math.min(left, containerRect.right - width - 4));

  const maxHeight = Math.max(160, Math.min(420, viewportHeight - verticalMargin * 2));
  let top = triggerRect.bottom + verticalGap;
  if (top + maxHeight > viewportHeight - verticalMargin) {
    const aboveTop = triggerRect.top - verticalGap - maxHeight;
    if (aboveTop >= verticalMargin) {
      top = aboveTop;
    } else {
      top = Math.max(verticalMargin, viewportHeight - verticalMargin - maxHeight);
    }
  }

  taskFilterPopoverStyle.value = {
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    width: `${Math.round(width)}px`,
    maxHeight: `${Math.round(maxHeight)}px`
  };
}

function getTaskDateTimestamp(value: unknown): number | null {
  const rawValue = typeof value === 'string' ? value.trim() : '';
  if (!rawValue) {
    return null;
  }

  const normalizedDate = normalizeDateInputValue(rawValue);
  if (normalizedDate) {
    const [year, month, day] = normalizedDate.split('-').map(part => Number(part));
    const parsedDate = new Date(year, month - 1, day);
    parsedDate.setHours(0, 0, 0, 0);
    return parsedDate.getTime();
  }

  const parsedTimestamp = Date.parse(rawValue);
  if (!Number.isFinite(parsedTimestamp)) {
    return null;
  }

  const parsedDate = new Date(parsedTimestamp);
  parsedDate.setHours(0, 0, 0, 0);
  return parsedDate.getTime();
}

function getTaskDueDateTimestamp(task: Task): number | null {
  return getTaskDateTimestamp(task.dueDate);
}

function getTaskStartDateTimestamp(task: Task): number | null {
  return getTaskDateTimestamp(task.startDate);
}

function matchesTaskDueFilter(task: Task, filter: TaskDueFilterKey): boolean {
  const dueTimestamp = getTaskDueDateTimestamp(task);
  if (filter === 'noDueDate') {
    return dueTimestamp === null;
  }
  if (dueTimestamp === null) {
    return false;
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();
  const tomorrowStart = todayStart + dayMs;

  switch (filter) {
    case 'overdue':
      return dueTimestamp < todayStart;
    case 'today':
      return dueTimestamp >= todayStart && dueTimestamp < tomorrowStart;
    case 'next7Days':
      return dueTimestamp >= tomorrowStart && dueTimestamp < todayStart + dayMs * 8;
  }
}

function getTaskUpdatedFilterRange(filter: TaskUpdateFilterKey): { start: number; end: number } {
  const dayMs = 24 * 60 * 60 * 1000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();

  switch (filter) {
    case 'today':
      return { start: todayStart, end: todayStart + dayMs };
    case 'thisWeek': {
      const weekStart = new Date(todayStart);
      const weekday = weekStart.getDay();
      const diff = weekday === 0 ? -6 : 1 - weekday;
      weekStart.setDate(weekStart.getDate() + diff);
      weekStart.setHours(0, 0, 0, 0);
      const start = weekStart.getTime();
      return { start, end: start + dayMs * 7 };
    }
    case 'thisMonth': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      return { start: start.getTime(), end: end.getTime() };
    }
  }
}

function matchesTaskUpdatedFilter(task: Task, filter: TaskUpdateFilterKey): boolean {
  const { start, end } = getTaskUpdatedFilterRange(filter);
  const startTimestamp = getTaskStartDateTimestamp(task);
  const dueTimestamp = getTaskDueDateTimestamp(task);

  if (startTimestamp !== null || dueTimestamp !== null) {
    let rangeStart = startTimestamp ?? dueTimestamp ?? 0;
    let rangeEnd = dueTimestamp ?? startTimestamp ?? 0;
    if (rangeStart > rangeEnd) {
      [rangeStart, rangeEnd] = [rangeEnd, rangeStart];
    }
    const dayMs = 24 * 60 * 60 * 1000;
    const taskRangeEnd = rangeEnd + dayMs;
    return rangeStart < end && taskRangeEnd > start;
  }

  const updatedTimestamp = getTaskDateTimestamp(task.updatedAt);
  if (updatedTimestamp === null) {
    return false;
  }
  return updatedTimestamp >= start && updatedTimestamp < end;
}

function matchesTaskFilterChips(task: Task): boolean {
  if (activeTaskStatusFilters.value.length > 0 && !activeTaskStatusFilters.value.includes(task.status)) {
    return false;
  }

  if (activeTaskPriorityFilters.value.length > 0 && !activeTaskPriorityFilters.value.includes(task.priority)) {
    return false;
  }

  if (activeTaskGroupFilters.value.length > 0) {
    const groupId = typeof task.groupId === 'string' ? task.groupId.trim() : '';
    const resolvedGroupId = groupId || TASK_GROUP_NONE_ID;
    if (!activeTaskGroupFilters.value.includes(resolvedGroupId)) {
      return false;
    }
  }

  if (activeTaskDueFilters.value.length > 0 && !activeTaskDueFilters.value.some(filter => matchesTaskDueFilter(task, filter))) {
    return false;
  }

  if (activeTaskUpdatedFilters.value.length > 0 && !activeTaskUpdatedFilters.value.some(filter => matchesTaskUpdatedFilter(task, filter))) {
    return false;
  }

  if (activeTaskExtraFilters.value.length > 0) {
    const wantsDescription = activeTaskExtraFilters.value.includes('hasDescription');
    const wantsSubtasks = activeTaskExtraFilters.value.includes('hasSubtasks');
    const hasDescription = typeof task.description === 'string' && task.description.trim().length > 0;
    const hasSubtasks = Array.isArray(task.subtasks) && task.subtasks.length > 0;

    if (wantsDescription && wantsSubtasks) {
      if (!hasDescription && !hasSubtasks) {
        return false;
      }
    } else if (wantsDescription && !hasDescription) {
      return false;
    } else if (wantsSubtasks && !hasSubtasks) {
      return false;
    }
  }

  return true;
}

// === Task patch helpers and filtered/sorted list derivation ===
function patchTask(
  taskList: any[],
  targetId: string,
  patch: (t: any) => void,
  matchBy: 'id' | 'blockId' | 'nodeId' = 'id'
): boolean {
  for (const t of taskList) {
    if (t[matchBy] === targetId) {
      patch(t);
      return true;
    }
    if (t.subtasks && patchTask(t.subtasks, targetId, patch, matchBy)) {
      return true;
    }
  }
  return false;
}

async function refreshInternalState() {
  invalidateCache();
  lastSortedHash = '';
  cachedSortedTasks = [];
  updateTaskIndex();
}

function invalidateSortCache() {
  lastSortedHash = '';
  cachedSortedTasks = [];
}

const { filtered: baseFilteredTasks, invalidateCache } = useTaskFilters(tasks, taskFilters);

let lastSortedHash = '';
let cachedSortedTasks: Task[] = [];
const MAX_VISIBLE_COMPLETED_TASKS = 3;
const showAllCompletedTasks = ref(false);

const filteredTasks = computed(() => {
  const includeCompleted = showCompletedTasks.value;
  const baseFiltered = baseFilteredTasks.value.filter(task => {
    if (task.isVirtual) {
      return false;
    }
    if (!includeCompleted && task.status === 'completed') {
      return false;
    }
    const title = task.title?.trim();
    if (!title || title === '-' || title === '') {
      return false;
    }
    return matchesTaskFilterChips(task);
  });
  
  const hash = `${includeCompleted ? '1' : '0'}:` +
               baseFiltered.map(t => t.id).join(':') +
               baseFiltered.map(t => `${t.status}-${t.priority}-${t.updatedAt}-${t.blockId}`).join('|');

  const isSortedCacheHit = hash === lastSortedHash && cachedSortedTasks.length > 0;

  if (isSortedCacheHit) {
    return cachedSortedTasks;
  }
  
  const result = [...baseFiltered].sort((a, b) => {
    const isACompleted = a.status === 'completed';
    const isBCompleted = b.status === 'completed';

    if (isACompleted && !isBCompleted) {
      return 1;
    }
    if (!isACompleted && isBCompleted) {
      return -1;
    }

    if (isACompleted && isBCompleted) {
      const updatedA = Date.parse(a.updatedAt || '');
      const updatedB = Date.parse(b.updatedAt || '');
      const hasUpdatedA = Number.isFinite(updatedA);
      const hasUpdatedB = Number.isFinite(updatedB);

      if (hasUpdatedA && hasUpdatedB && updatedA !== updatedB) {
        return updatedB - updatedA;
      }
      if (hasUpdatedA && !hasUpdatedB) {
        return -1;
      }
      if (!hasUpdatedA && hasUpdatedB) {
        return 1;
      }
    } else {
      const priorityA = priorityOrder[a.priority] ?? 3;
      const priorityB = priorityOrder[b.priority] ?? 3;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      const createdKeyA = a.createdAt || a.blockId || a.id || '';
      const createdKeyB = b.createdAt || b.blockId || b.id || '';
      if (createdKeyA !== createdKeyB) {
        return createdKeyB.localeCompare(createdKeyA);
      }
    }

    // Stable fallback ordering: prefer blockId, then id/createdAt (blockId is time-sortable: YYYYMMDDHHmmss-xxx).
    const aSortKey = a.blockId || a.id || a.createdAt || '';
    const bSortKey = b.blockId || b.id || b.createdAt || '';
    return bSortKey.localeCompare(aSortKey);
  });
  
  lastSortedHash = hash;
  cachedSortedTasks = result;
  
  return result;
});

const hasHiddenCompletedTasks = computed(() => {
  if (!showCompletedTasks.value) {
    return false;
  }
  if (showAllCompletedTasks.value) {
    return false;
  }

  let completedCount = 0;
  for (const task of filteredTasks.value) {
    if (task.status === 'completed') {
      completedCount += 1;
      if (completedCount > MAX_VISIBLE_COMPLETED_TASKS) {
        return true;
      }
    }
  }

  return false;
});

const displayedTasks = computed(() => {
  if (showAllCompletedTasks.value) {
    return filteredTasks.value;
  }

  let visibleCompletedCount = 0;
  return filteredTasks.value.filter((task) => {
    if (task.status !== 'completed') {
      return true;
    }

    visibleCompletedCount += 1;
    return visibleCompletedCount <= MAX_VISIBLE_COMPLETED_TASKS;
  });
});

const hasExpandedTaskDetails = computed(() =>
  expandedSubtasks.value.size > 0
  || expandedDescriptions.value.size > 0
  || inlineEditingDescriptionTaskId.value !== null
);

const shouldUseTaskVirtualList = computed(() =>
  displayedTasks.value.length > TASK_VIRTUAL_THRESHOLD
  && !hasExpandedTaskDetails.value
);

const taskHeightOffsets = computed(() => {
  taskHeightVersion.value;
  const tasks = displayedTasks.value;
  const offsets = new Array(tasks.length + 1);
  offsets[0] = 0;
  for (let i = 0; i < tasks.length; i += 1) {
    const taskId = tasks[i].id;
    const height = taskHeightCache.get(taskId) ?? TASK_VIRTUAL_ROW_HEIGHT;
    offsets[i + 1] = offsets[i] + height;
  }
  return offsets;
});

const taskVirtualSpacerStyle = computed(() => {
  if (!shouldUseTaskVirtualList.value) return {};
  return {
    paddingTop: `${taskVirtualRange.value.top}px`,
    paddingBottom: `${taskVirtualRange.value.bottom}px`
  };
});

const virtualDisplayedTasks = computed(() => {
  if (!shouldUseTaskVirtualList.value) return displayedTasks.value;
  return displayedTasks.value.slice(taskVirtualRange.value.start, taskVirtualRange.value.end);
});

function scheduleTaskTitleHydration(delay = 120): void {
  if (taskTitleHydrateTimer !== null) {
    clearTimeout(taskTitleHydrateTimer);
  }
  taskTitleHydrateTimer = window.setTimeout(() => {
    taskTitleHydrateTimer = null;
    void hydrateVisibleTaskTitles();
  }, delay);
}

async function hydrateVisibleTaskTitles(): Promise<void> {
  if (isTaskTitleHydrating) {
    return;
  }
  const allTasks = displayedTasks.value;
  if (allTasks.length === 0) return;

  let candidates: Task[] = [];
  if (shouldUseTaskVirtualList.value) {
    candidates = virtualDisplayedTasks.value;
  } else {
    const container = taskScrollContainerRef.value;
    const containerRect = container?.getBoundingClientRect();
    const top = containerRect ? containerRect.top : 0;
    const bottom = containerRect ? containerRect.bottom : window.innerHeight;
    const taskById = new Map(allTasks.map(task => [task.id, task]));
    for (const [taskId, el] of taskRowElements.entries()) {
      const rect = el.getBoundingClientRect();
      if (rect.bottom <= top || rect.top >= bottom) {
        continue;
      }
      const task = taskById.get(taskId);
      if (task) {
        candidates.push(task);
      }
      if (candidates.length >= TASK_TITLE_HYDRATE_LIMIT) {
        break;
      }
    }
    if (candidates.length === 0) {
      candidates = allTasks.slice(0, TASK_TITLE_HYDRATE_LIMIT);
    }
  }
  if (candidates.length === 0) return;

  const blockIds: string[] = [];
  const seen = new Set<string>();
  for (const task of candidates) {
    if (task.type !== 'block' || !task.blockId) continue;
    if (seen.has(task.blockId)) continue;
    const titleHtml = typeof task.title === 'string' ? task.title : '';
    if (!titleHtml.includes('<sup')) {
      continue;
    }
    seen.add(task.blockId);
    blockIds.push(task.blockId);
    if (blockIds.length >= TASK_TITLE_HYDRATE_LIMIT) {
      break;
    }
  }

  if (blockIds.length === 0) {
    return;
  }

  isTaskTitleHydrating = true;
  try {
    const updatedTasksMap = await TaskRepository.getTasksByBlockIds(
      blockIds,
      false,
      getCurrentTaskQueryScope(),
      { useLiveDom: true }
    );
    if (updatedTasksMap.size === 0) {
      return;
    }

    const taskIndexByBlockId = new Map<string, number>();
    tasks.value.forEach((task, index) => {
      if (task.type === 'block' && task.blockId) {
        taskIndexByBlockId.set(task.blockId, index);
      }
    });

    updatedTasksMap.forEach((updatedTask, blockId) => {
      const index = taskIndexByBlockId.get(blockId);
      if (index === undefined) return;
      const currentTask = tasks.value[index];
      if (!currentTask) return;
      if (currentTask.title !== updatedTask.title) {
        currentTask.title = updatedTask.title;
        crdtRepo.updateTaskField(currentTask.id, 'title', updatedTask.title);
      }
    });
  } catch (error) {
    console.error('[TaskManager] 标题同步失败:', error);
  } finally {
    isTaskTitleHydrating = false;
  }
}

const visibleExpandableTasks = computed(() =>
  displayedTasks.value
    .map(task => {
      const hasSubtasks = Array.isArray(task.subtasks) && task.subtasks.length > 0;
      const hasDescription = typeof task.description === 'string' && task.description.trim().length > 0;
      return {
        id: task.id,
        hasSubtasks,
        hasDescription
      };
    })
    .filter(task => task.hasSubtasks || task.hasDescription)
);

const hasVisibleExpandableTasks = computed(() => visibleExpandableTasks.value.length > 0);

const areAllVisibleSubtasksExpanded = computed(() => {
  const taskMetaList = visibleExpandableTasks.value;
  return taskMetaList.length > 0 && taskMetaList.every(({ id, hasSubtasks, hasDescription }) => {
    const subtasksExpanded = !hasSubtasks || expandedSubtasks.value.has(id);
    const descriptionExpanded = !hasDescription || expandedDescriptions.value.has(id);
    return subtasksExpanded && descriptionExpanded;
  });
});

watch(
  [displayedTasks, shouldUseTaskVirtualList, isTaskListCollapsed],
  () => {
    if (isTaskListCollapsed.value) return;
    nextTick(() => {
      scheduleTaskVirtualUpdate();
    });
  },
  { deep: false }
);

watch(displayedTasks, (nextTasks) => {
  const ids = new Set(nextTasks.map(task => task.id));
  for (const key of taskHeightCache.keys()) {
    if (!ids.has(key)) {
      taskHeightCache.delete(key);
    }
  }
  for (const key of taskRowElements.keys()) {
    if (!ids.has(key)) {
      taskRowElements.delete(key);
    }
  }
  taskHeightVersion.value += 1;
});

watch(virtualDisplayedTasks, () => {
  nextTick(() => {
    scheduleTaskRowMeasure();
    scheduleTaskTitleHydration(120);
  });
});

watch(tasksListRef, (el) => {
  if (el && !isTaskListCollapsed.value) {
    nextTick(() => {
      scheduleTaskVirtualUpdate();
    });
  }
});

function showMoreCompletedTasks() {
  showAllCompletedTasks.value = true;
}

function toggleAllVisibleSubtasks() {
  const taskMetaList = visibleExpandableTasks.value;
  if (taskMetaList.length === 0) return;

  const shouldCollapse = areAllVisibleSubtasksExpanded.value;
  for (const { id, hasSubtasks, hasDescription } of taskMetaList) {
    if (shouldCollapse) {
      if (hasSubtasks) {
        expandedSubtasks.value.delete(id);
      }
      if (hasDescription) {
        expandedDescriptions.value.delete(id);
      }
      continue;
    }
    if (hasSubtasks) {
      expandedSubtasks.value.add(id);
    }
    if (hasDescription) {
      expandedDescriptions.value.add(id);
    }
  }
  scheduleTaskTitleHydration(160);
}

function applyRepeatRuleOptimistic(payload: RepeatRulePayload): boolean {
  const { nextTasks, touched } = applyRepeatRuleOptimisticToTasks(tasks.value, payload);
  if (nextTasks !== tasks.value) {
    tasks.value = nextTasks;
  }
  if (touched) {
    invalidateCache();
    invalidateSortCache();
    updateTaskIndex();
  }
  return touched;
}

async function applyRepeatRuleIncremental(payload: RepeatRulePayload, requestId: number): Promise<boolean> {
  applyRepeatRuleOptimistic(payload);
  try {
    const { nextTasks, touched, handled } = await rebuildAffectedRepeatTasks(
      tasks.value,
      payload,
      { pastDays: 60, futureDays: 120 }
    );
    if (requestId !== repeatReconcileRequestId) {
      return true;
    }
    if (!handled) {
      return false;
    }
    if (!touched) {
      return true;
    }

    crdtRepo.syncFromSQLTasks(nextTasks);
    tasks.value = crdtRepo.getTasks();
    invalidateCache();
    invalidateSortCache();
    updateTaskIndex();
    return true;
  } catch {
    return false;
  }
}

function toggleTaskExpand(taskId: string) {
  const task = tasks.value.find(t => t.id === taskId);
  const hasSubtasks = task?.subtasks && task.subtasks.length > 0;
  
  if (hasSubtasks) {
    if (expandedSubtasks.value.has(taskId)) {
      expandedSubtasks.value.delete(taskId);
      expandedDescriptions.value.delete(taskId);
    } else {
      expandedSubtasks.value.add(taskId);
      expandedDescriptions.value.add(taskId);
    }
  } else {
    if (expandedDescriptions.value.has(taskId)) {
      expandedDescriptions.value.delete(taskId);
    } else {
      expandedDescriptions.value.add(taskId);
    }
  }
  scheduleTaskTitleHydration(120);
}

function handleCardToggleExpand(task: Task): void {
  toggleTaskExpand(task.id);
}

function handleCardSubtaskToggle(task: Task, subtask: any): void {
  handleSubtaskToggle(task.id, subtask);
}

function updateTaskIndex() {
  blockIdToTaskIndex.clear();
  subtaskToParentMap.clear();
  
  tasks.value.forEach((task) => {
    if (task.blockId) {
      blockIdToTaskIndex.set(task.blockId, {
        task,
        isSubtask: false
      });
    }
    
    if (task.subtasks) {
      indexSubtasks(task.subtasks, task.id, task.blockId!);
    }
  });
}

function indexSubtasks(subtasks: Task['subtasks'] | undefined, parentTaskId: string, parentBlockId: string) {
  if (!subtasks) return;
  
  for (const subtask of subtasks) {
    if (subtask.nodeId) {
      blockIdToTaskIndex.set(subtask.nodeId, {
        task: subtask as any,
        isSubtask: true,
        parentTaskId
      });
      subtaskToParentMap.set(subtask.nodeId, parentBlockId);
    }
    
    if (subtask.subtasks) {
      indexSubtasks(subtask.subtasks, parentTaskId, parentBlockId);
    }
  }
}

async function loadNotebooks() {
  try {
    const result = await lsNotebooks();
    if (result && result.notebooks) {
      notebooks.value = result.notebooks
        .filter((nb) => !nb.closed)
        .map((nb) => ({
          id: nb.id,
          name: nb.name
        }));
    }
  } catch (error) {
    // Ignore notebook load errors; later refresh attempts will retry.
  }
}

function applyExcludedNotebookScope(ids: string[]): void {
  const normalized = normalizeNotebookIds(ids);
  excludedNotebookIds.value = normalized;
  TaskRepository.setExcludedNotebookIds(normalized);
}

function ensureActiveNotebookFilterInScope(): void {
  if (filterNotebook.value !== 'all' && excludedNotebookIds.value.includes(filterNotebook.value)) {
    filterNotebook.value = 'all';
    filterDocument.value = 'all';
  }
}

async function openTaskScopeDialog() {
  if (notebooks.value.length === 0) {
    await loadNotebooks();
  }
  showTaskScopeDialog.value = true;
}

async function handleTaskScopeSave(
  selectedVisibleExcludedNotebookIds: string[],
  nextShowCompletedTasks: boolean
) {
  const visibleNotebookIds = new Set(notebooks.value.map(notebook => notebook.id));
  const hiddenExcludedNotebookIds = excludedNotebookIds.value.filter(id => !visibleNotebookIds.has(id));
  const mergedExcludedNotebookIds = normalizeNotebookIds([
    ...hiddenExcludedNotebookIds,
    ...selectedVisibleExcludedNotebookIds
  ]);

  applyExcludedNotebookScope(mergedExcludedNotebookIds);
  showCompletedTasks.value = nextShowCompletedTasks;
  const shouldFinalizeInit = requiresScopeInitialization.value;
  await updateSettings('taskManager', {
    excludedNotebookIds: mergedExcludedNotebookIds,
    showCompletedTasks: nextShowCompletedTasks,
    ...(shouldFinalizeInit ? { scopeInitialized: true } : {})
  });
  if (shouldFinalizeInit) {
    requiresScopeInitialization.value = false;
  }
  showTaskScopeDialog.value = false;
  await refreshTaskDocumentOptions(true);
  ensureActiveNotebookFilterInScope();
  await refreshTasks(true, { showLoading: false, compareExisting: false, source: 'scope-save' });
}
async function handleRefreshClick() {
  if (requiresScopeInitialization.value) {
    showTaskScopeDialog.value = true;
    return;
  }

  if (isRefreshButtonSpinning.value) {
    return;
  }

  isRefreshButtonSpinning.value = true;
  try {
    await refreshTasks(true, { source: 'manual-refresh' });
  } finally {
    isRefreshButtonSpinning.value = false;
  }
}

async function refreshTasks(
  force = false,
  options: {
    showLoading?: boolean;
    compareExisting?: boolean;
    ignoreThrottle?: boolean;
    source?: string;
  } = {}
) {
  let useLiveDom = false;
  if (requiresScopeInitialization.value) {
    return;
  }

  const {
    showLoading = false,
    compareExisting = true,
    ignoreThrottle = false,
    source = 'general'
  } = options;
  const requestedScope = getCurrentTaskQueryScope();
  const shouldBroadenScope =
    !useLiveDom
    && (source === 'filter-switch' || source === 'mounted-reconcile')
    && requestedScope
    && (requestedScope.notebookId || requestedScope.documentId)
    && tasks.value.length > 0
    && tasks.value.length <= FILTER_SWITCH_BROAD_LOAD_THRESHOLD;
  const loadScope = shouldBroadenScope
    ? { includeCompleted: requestedScope.includeCompleted }
    : requestedScope;
  const now = Date.now();
  const SKIP_DELAY = 500;
  const repeatDebugContext = getActiveRepeatDebugContext();
  if (!force && !ignoreThrottle && now - lastRefreshTime < SKIP_DELAY) {
    if (repeatDebugContext) {
      repeatDragDebug('TaskManager', 'refreshTasks skipped by throttle', {
        source,
        force,
        ignoreThrottle,
        repeatDebugContext
      });
    }
    return;
  }
  lastRefreshTime = now;

   try {
    if (repeatDebugContext || source === 'fallback-refresh') {
      repeatDragDebug('TaskManager', 'refreshTasks start', {
        source,
        force,
        compareExisting,
        requestedScope,
        loadScope,
        repeatDebugContext,
        currentMatches: collectRepeatDebugTasks(tasks.value, repeatDebugContext)
      });
    }
    if (showLoading) {
      loading.value = true;
    }
    if (notebooks.value.length === 0) {
      await loadNotebooks();
    }
    const shouldRefreshDocumentOptions = source !== 'filter-switch'
      || taskDocumentsByNotebook.value.size === 0;
    if (shouldRefreshDocumentOptions) {
      await refreshTaskDocumentOptions(force);
    }

    useLiveDom = source === 'manual-refresh';
    const sqlTasks = await TaskRepository.getAllTasks(
      !force,
      loadScope,
      { useLiveDom }
    );
    if (!useLiveDom) {
      preserveInlineMemoTitles(sqlTasks, tasks.value);
      hydrateMemoTitlesFromLiveDom(sqlTasks, TASK_TITLE_HYDRATE_LIMIT);
    }

    crdtRepo.syncFromSQLTasks(sqlTasks);
    const newTasks = crdtRepo.getTasks();
    if (repeatDebugContext || source === 'fallback-refresh') {
      repeatDragDebug('TaskManager', 'refreshTasks fetched tasks', {
        source,
        sqlCount: sqlTasks.length,
        newCount: newTasks.length,
        repeatDebugContext,
        newMatches: collectRepeatDebugTasks(newTasks, repeatDebugContext)
      });
    }

    if (!compareExisting || force || hasTasksChanged(tasks.value, newTasks)) {
      invalidateCache();
      tasks.value = newTasks;
      invalidateSortCache();
      if (repeatDebugContext || source === 'fallback-refresh') {
        repeatDragDebug('TaskManager', 'refreshTasks applied new tasks', {
          source,
          repeatDebugContext,
          appliedMatches: collectRepeatDebugTasks(tasks.value, repeatDebugContext)
        });
      }

      await nextTick();
      updateTaskIndex();
    }
    lastLoadedScope = loadScope || null;
    consecutiveFallbackFailures = 0;
  } catch {
    // Keep current UI state on refresh failure; the next cycle will reconcile.
  } finally {
    if (showLoading) {
      loading.value = false;
    }
  }
}

function scheduleFallbackRefresh(
  force = true,
  delay = 180,
  strategy: 'threshold' | 'immediate' = 'threshold'
) {
  if (strategy === 'threshold') {
    consecutiveFallbackFailures = Math.min(
      consecutiveFallbackFailures + 1,
      FALLBACK_FAILURE_THRESHOLD
    );
    if (consecutiveFallbackFailures < FALLBACK_FAILURE_THRESHOLD) {
      return;
    }
  }

  if (fallbackRefreshTimer !== null) {
    clearTimeout(fallbackRefreshTimer);
  }

  const repeatDebugContext = getActiveRepeatDebugContext();
  if (repeatDebugContext) {
    repeatDragDebug('TaskManager', 'scheduleFallbackRefresh', {
      force,
      delay,
      strategy,
      repeatDebugContext
    });
  }

  fallbackRefreshTimer = window.setTimeout(async () => {
    fallbackRefreshTimer = null;
    await refreshTasks(force, { showLoading: false, compareExisting: true, source: 'fallback-refresh' });
  }, delay);
}

function isDeepEqual(oldItem: any, newItem: any, options: { checkUpdatedAt?: boolean } = {}): boolean {
  if (options.checkUpdatedAt && oldItem.updatedAt && newItem.updatedAt && oldItem.updatedAt !== newItem.updatedAt) {
    return false;
  }
  
  const parentFields = ['title', 'status', 'priority', 'description', 'type', 'completedAt'];
  if (parentFields.some(f => oldItem[f] !== newItem[f])) {
    return false;
  }
  
  if (oldItem.startDate !== newItem.startDate || oldItem.dueDate !== newItem.dueDate) {
    return false;
  }
  
  if ('completed' in oldItem && 'completed' in newItem) {
    if (oldItem.completed !== newItem.completed) {
      return false;
    }
  }
  
  const oldSubs = oldItem.subtasks || [];
  const newSubs = newItem.subtasks || [];
  if (oldSubs.length !== newSubs.length) {
    return false;
  }
  
  return oldSubs.every((sub, i) => isDeepEqual(sub, newSubs[i], options));
}

function hasTasksChanged(oldTasks: Task[], newTasks: Task[]): boolean {
  if (oldTasks.length !== newTasks.length) return true;
  
  const oldTaskMap = new Map(oldTasks.map(t => [t.id, t]));
  const newTaskMap = new Map(newTasks.map(t => [t.id, t]));
  
  for (const [id, newTask] of newTaskMap) {
    const oldTask = oldTaskMap.get(id);
    
    if (!oldTask) return true;
    
    // Also compare updatedAt so in-place edits are detected even when ids are unchanged.
    if (!isDeepEqual(oldTask, newTask, { checkUpdatedAt: true })) {
      return true;
    }
  }
  
  return false;
}

const incrementalUpdateQueue = createBlockIdBatchQueue({
  maxBatchSize: MAX_INCREMENTAL_BLOCKS_PER_FLUSH,
  onFlushBatch: async (blockIds) => {
    await incrementalUpdateTasks(blockIds);
  }
});

function queueIncrementalUpdates(blockIds: string[], delay = 24): void {
  incrementalUpdateQueue.enqueue(blockIds, delay);
}



function setupEventListeners() {
  const unsubscribe = eventBus.on(Events.TASK_CHANGED, (data?: { blockIds?: string[] }) => {
    if (data?.blockIds && data.blockIds.length > 0) {
      queueIncrementalUpdates(data.blockIds);
    } else {
      scheduleFallbackRefresh(true, 180, 'immediate');
    }
  });

  const unsubscribeDeleted = eventBus.on(Events.TASK_DELETED, ({ blockId }: { blockId: string }) => {
    const taskIndex = blockIdToTaskIndex.get(blockId);
    if (taskIndex && !taskIndex.isSubtask) {
      tasks.value = tasks.value.filter(t => t.blockId !== blockId);
      invalidateCache();
      invalidateSortCache();
      updateTaskIndex();
    }
  });

  const unsubscribeUpdated = eventBus.on(Events.TASK_UPDATED, ({ blockId }: { blockId: string }) => {
    queueIncrementalUpdates([blockId]);
  });

  const unsubscribeAdded = eventBus.on(Events.TASK_ADDED, async (payload?: { blockId?: string; reason?: string; seriesId?: string; frequency?: string }) => {
    if (payload?.reason === 'repeat-changed' && payload.frequency) {
      lastRepeatDebugPayload = {
        blockId: payload.blockId,
        seriesId: payload.seriesId,
        frequency: payload.frequency,
        ts: Date.now()
      };
      repeatDragDebug('TaskManager', 'received repeat-changed event', {
        payload,
        currentMatches: collectRepeatDebugTasks(tasks.value, lastRepeatDebugPayload)
      });
      const requestId = ++repeatReconcileRequestId;
      const fastPathApplied = await applyRepeatRuleIncremental(payload, requestId);
      if (requestId !== repeatReconcileRequestId) {
        return;
      }
      repeatDragDebug('TaskManager', 'after repeat-changed local reconcile', {
        payload,
        fastPathApplied,
        nextMatches: collectRepeatDebugTasks(tasks.value, lastRepeatDebugPayload)
      });
      if (!fastPathApplied) {
        scheduleFallbackRefresh(true, 100, 'immediate');
      }
      return;
    }
    if (payload?.blockId) {
      const addedBlockId = payload.blockId;
      const scopedBlockIds = await TaskRepository.filterIncludedBlockIds([payload.blockId]);
      if (scopedBlockIds.length === 0) {
        return;
      }

      queueIncrementalUpdates(scopedBlockIds);
      window.setTimeout(() => {
        if (!blockIdToTaskIndex.has(addedBlockId)) {
          scheduleFallbackRefresh(true, 180, 'immediate');
        }
      }, 220);
      return;
    }
    scheduleFallbackRefresh(true, 180, 'immediate');
  });
  
  

  const unsubscribeDateChanged = eventBus.on('task-date-changed', (updatedTask: Task) => {
    if (updatedTask.repeatSeriesId || (updatedTask.repeatFrequency && updatedTask.repeatFrequency !== 'none')) {
      repeatDragDebug('TaskManager', 'received task-date-changed', summarizeTaskForRepeatDebug(updatedTask));
    }
    const now = Date.now();
    
    if (updatedTask.startDate === null && updatedTask.dueDate === null) {
      recentlyDeletedDates.value.set(updatedTask.id, {
        startDate: null,
        dueDate: null,
        timestamp: now
      });
      
      setTimeout(() => {
        recentlyDeletedDates.value.delete(updatedTask.id);
      }, 5000);
    } else if (updatedTask.startDate !== null || updatedTask.dueDate !== null) {
      if (recentlyDeletedDates.value.has(updatedTask.id)) {
        recentlyDeletedDates.value.delete(updatedTask.id);
      }
    }
    
    patchTask(tasks.value, updatedTask.id, (task) => {
      task.startDate = updatedTask.startDate;
      task.dueDate = updatedTask.dueDate;
      if (updatedTask.backgroundColor !== undefined) {
        task.backgroundColor = updatedTask.backgroundColor;
      }
    }, 'id');
    invalidateSortCache();
  });
  
  watch(
    () => tasks.value.map(t => `${t.id}:${t.startDate ?? ''}:${t.dueDate ?? ''}`),
    () => {
      for (const task of tasks.value) {
        const deletedRecord = recentlyDeletedDates.value.get(task.id);
        if (deletedRecord && (task.startDate !== null || task.dueDate !== null)) {
          task.startDate = null;
          task.dueDate = null;
        }
      }
    },
    { flush: 'post' }
  );

  const unsubscribeGroupsUpdated = eventBus.on(Events.TASK_GROUPS_UPDATED, (payload?: { groups?: TaskGroup[] }) => {
    if (payload?.groups) {
      applyExternalTaskGroups(payload.groups);
      return;
    }
    void (async () => {
      const nextGroups = await loadTaskGroups();
      applyExternalTaskGroups(nextGroups);
    })();
  });

  eventUnsubscribers.push(
    unsubscribe,
    unsubscribeDeleted,
    unsubscribeUpdated,
    unsubscribeAdded,
    unsubscribeDateChanged,
    unsubscribeGroupsUpdated
  );
}

async function incrementalUpdateTasks(blockIds: string[]) { 
  if (requiresScopeInitialization.value) {
    return;
  }

  const scopedBlockIds = await TaskRepository.filterIncludedBlockIds(blockIds);
  if (scopedBlockIds.length === 0) {
    return;
  }

  const ancestorContextRows = await queryAncestorContextRows(scopedBlockIds);
  await pruneInvalidParentsFromEvents(scopedBlockIds, ancestorContextRows);

  const { unresolvedBlockIds, patchedParentStatuses } = await fastSyncTaskFromMarkdown(scopedBlockIds);
  if (unresolvedBlockIds.length === 0) {
    consecutiveFallbackFailures = 0;
    return;
  }

  const parentBlockIds = await resolveParentTaskBlockIds(unresolvedBlockIds, ancestorContextRows);

  if (parentBlockIds.size === 0) {
    scheduleFallbackRefresh(true, 120, 'immediate');
    return;
  }
  
  const uniqueBlockIds = [...parentBlockIds].filter(id => !processingBlockIds.has(id)); 
  if (uniqueBlockIds.length === 0) { 
    return; 
  } 
  
  uniqueBlockIds.forEach(id => processingBlockIds.add(id)); 
  
  try { 
    invalidateCache(); 
    const taskMapBatch = await TaskRepository.getTasksByBlockIds(
      uniqueBlockIds,
      false,
      getCurrentTaskQueryScope(),
      { useLiveDom: true }
    );
    
    const updatedTasks: Task[] = [];
    let removedTasks = 0;
    const missingRequestedIds: string[] = [];
  
    for (const [blockId, newTask] of taskMapBatch) {
      const forcedStatus = patchedParentStatuses.get(blockId);
      if (forcedStatus) {
        newTask.status = forcedStatus;
        if (forcedStatus === 'completed') {
          newTask.completedAt = newTask.completedAt || new Date().toISOString();
        } else {
          delete newTask.completedAt;
        }
      }
      crdtRepo.syncIncrementalTasks([newTask]);
      updatedTasks.push(newTask);
    }

    for (const blockId of uniqueBlockIds) {
      if (taskMapBatch.has(blockId)) {
        continue;
      }
      missingRequestedIds.push(blockId);

      const taskIndex = blockIdToTaskIndex.get(blockId);
      if (!taskIndex || taskIndex.isSubtask) {
        continue;
      }

      crdtRepo.deleteTask(taskIndex.task.id, Date.now());
      removedTasks += 1;
    }
    
    if (updatedTasks.length > 0 || removedTasks > 0) {
      tasks.value = crdtRepo.getTasks();
      await updateTaskIndex(); 
      consecutiveFallbackFailures = 0;

      if (missingRequestedIds.length > 0) {
        // When requested blockIds cannot be fully resolved, force an immediate full reconcile.
        // Keep a small cooldown to avoid flooding during burst transactions.
        const now = Date.now();
        if (now - lastMismatchForceRefreshAt >= MISMATCH_FORCE_REFRESH_COOLDOWN) {
          lastMismatchForceRefreshAt = now;
          await refreshTasks(true, { showLoading: false, compareExisting: true, source: 'mismatch-reconcile' });
        }
      }
    } else {
      scheduleFallbackRefresh(true, 120, 'immediate');
    }
  } catch {
    scheduleFallbackRefresh(true, 120, 'immediate');
  } finally {
    uniqueBlockIds.forEach(id => processingBlockIds.delete(id));
  }
}

interface AncestorContextRow {
  source_id: string;
  id: string;
  depth: number;
  subtype: string;
}

function normalizeBlockIds(blockIds: string[]): string[] {
  return [...new Set(blockIds.filter((id): id is string => typeof id === 'string' && id.length > 0))];
}

async function queryAncestorContextRows(blockIds: string[]): Promise<AncestorContextRow[]> {
  const normalizedBlockIds = normalizeBlockIds(blockIds);
  if (normalizedBlockIds.length === 0) {
    return [];
  }

  try {
    const idsClause = normalizedBlockIds.map(id => `'${escapeSqlLiteral(id)}'`).join(',');
    const rows = await sql(`
      WITH RECURSIVE ancestors(source_id, id, parent_id, depth) AS (
        SELECT id AS source_id, id, parent_id, 0
        FROM blocks
        WHERE id IN (${idsClause})
        UNION ALL
        SELECT ancestors.source_id, b.id, b.parent_id, ancestors.depth + 1
        FROM blocks b
        JOIN ancestors ON ancestors.parent_id = b.id
        WHERE ancestors.parent_id != ''
          AND ancestors.depth < 10
      )
      SELECT ancestors.source_id, ancestors.id, ancestors.depth, b.subtype
      FROM ancestors
      JOIN blocks b ON b.id = ancestors.id
    `) as any[];

    if (!Array.isArray(rows)) {
      return [];
    }

    return rows
      .map((row) => ({
        source_id: typeof row?.source_id === 'string' ? row.source_id : '',
        id: typeof row?.id === 'string' ? row.id : '',
        depth: Number(row?.depth),
        subtype: typeof row?.subtype === 'string' ? row.subtype : ''
      }))
      .filter((row) => row.source_id.length > 0 && row.id.length > 0 && Number.isFinite(row.depth));
  } catch {
    return [];
  }
}

async function pruneInvalidParentsFromEvents(
  blockIds: string[],
  ancestorContextRows?: AncestorContextRow[]
): Promise<number> {
  const normalizedBlockIds = normalizeBlockIds(blockIds);
  if (normalizedBlockIds.length === 0) {
    return 0;
  }

  try {
    const rows = ancestorContextRows ?? await queryAncestorContextRows(normalizedBlockIds);
    const blockSubtypeMap = new Map<string, string>();
    rows.forEach((row) => {
      if (row?.id && row.subtype) {
        blockSubtypeMap.set(row.id, row.subtype);
      }
    });

    let removed = false;
    const removedBlockIds: string[] = [];
    for (const [blockId, taskIndex] of blockIdToTaskIndex.entries()) {
      if (taskIndex.isSubtask) {
        continue;
      }

      const subtype = blockSubtypeMap.get(blockId);
      if (!subtype || subtype === 't') {
        continue;
      }

      crdtRepo.deleteTask(taskIndex.task.id, Date.now());
      removed = true;
      removedBlockIds.push(blockId);
    }

    if (removed) {
      invalidateCache();
      invalidateSortCache();
      tasks.value = crdtRepo.getTasks();
      await updateTaskIndex();
    }
    return removedBlockIds.length;
  } catch {
    // Silent fallback: next refresh cycle will reconcile if SQL check fails.
    return 0;
  }
}

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

async function resolveParentTaskBlockIds(
  blockIds: string[],
  ancestorContextRows?: AncestorContextRow[]
): Promise<Set<string>> {
  const resolvedParentBlockIds = new Set<string>();
  const unknownBlockIds: string[] = [];
  const normalizedBlockIds = normalizeBlockIds(blockIds);

  for (const blockId of normalizedBlockIds) {
    const taskIndex = blockIdToTaskIndex.get(blockId);
    if (taskIndex) {
      if (taskIndex.isSubtask) {
        const parentBlockId = subtaskToParentMap.get(blockId);
        if (parentBlockId) {
          resolvedParentBlockIds.add(parentBlockId);
        } else {
          unknownBlockIds.push(blockId);
        }
      } else {
        resolvedParentBlockIds.add(blockId);
      }
      continue;
    }

    const parentBlockId = subtaskToParentMap.get(blockId);
    if (parentBlockId) {
      resolvedParentBlockIds.add(parentBlockId);
      continue;
    }

    unknownBlockIds.push(blockId);
  }

  if (unknownBlockIds.length === 0) {
    return resolvedParentBlockIds;
  }

  try {
    const rows = ancestorContextRows ?? await queryAncestorContextRows(unknownBlockIds);
    const unknownIdSet = new Set(unknownBlockIds);
    const candidatesBySource = new Map<string, Array<{ id: string; depth: number }>>();
    rows.forEach((row) => {
      const sourceId = row?.source_id;
      const candidateId = row?.id;
      const depth = Number(row?.depth);
      if (!sourceId || !candidateId || !Number.isFinite(depth)) return;
      if (!unknownIdSet.has(sourceId)) return;
      if (row.subtype !== 't') return;
      const list = candidatesBySource.get(sourceId) || [];
      list.push({ id: candidateId, depth });
      candidatesBySource.set(sourceId, list);
    });

    for (const sourceId of unknownBlockIds) {
      const candidates = (candidatesBySource.get(sourceId) || []).sort((a, b) => a.depth - b.depth);
      let mappedParentId = '';

      for (const candidate of candidates) {
        if (candidate.depth <= 0) continue;
        const taskIndex = blockIdToTaskIndex.get(candidate.id);
        if (taskIndex && !taskIndex.isSubtask) {
          mappedParentId = candidate.id;
          break;
        }
      }

      if (!mappedParentId) {
        const selfCandidate = candidates.find((candidate) => candidate.id === sourceId);
        if (selfCandidate) {
          mappedParentId = sourceId;
        }
      }

      if (!mappedParentId) {
        const fallbackAncestor = candidates.find((candidate) => candidate.depth > 0);
        if (fallbackAncestor) {
          mappedParentId = fallbackAncestor.id;
        }
      }

      if (mappedParentId) {
        resolvedParentBlockIds.add(mappedParentId);
      }
    }
  } catch {
    // Fallback refresh will handle transient SQL failures.
  }

  return resolvedParentBlockIds;
}

function parseTaskCompleted(markdown: string, blockId: string): boolean | null {
  const firstLine = markdown
    .split('\n')
    .map(line => line.trim())
    .find(line => line.length > 0);
  if (firstLine) {
    const match = firstLine.match(/\[(x|X| )\]/);
    if (match) {
      return match[1].toLowerCase() === 'x';
    }
  }

  const getTaskActionElement = (root: Element | null, ownerId?: string): Element | null => {
    if (!root) return null;
    const matchesOwner = (action: Element): boolean => {
      if (!ownerId) return true;
      const owner = action.closest('[data-node-id]');
      return owner?.getAttribute('data-node-id') === ownerId;
    };

    if (root.classList.contains('protyle-action--task') && matchesOwner(root)) {
      return root;
    }

    const actions = root.querySelectorAll('.protyle-action--task');
    for (const action of actions) {
      if (matchesOwner(action)) {
        return action;
      }
    }

    const fallbackRoot = root.closest('.protyle-task');
    const fallback = fallbackRoot?.querySelector('.protyle-action--task');
    if (fallback && matchesOwner(fallback)) {
      return fallback;
    }

    return null;
  };

  const selectors = [
    `.protyle [data-node-id="${blockId}"][data-type="NodeListItem"]`,
    `.protyle [data-node-id="${blockId}"]`,
    `[data-node-id="${blockId}"][data-type="NodeListItem"]`,
    `[data-node-id="${blockId}"]`
  ];
  let currentElement: Element | null = null;
  for (const selector of selectors) {
    currentElement = document.querySelector(selector);
    if (currentElement) {
      break;
    }
  }
  if (currentElement) {
    const currentAction = getTaskActionElement(currentElement, blockId);
    if (!currentAction) {
      return null;
    }
    const currentSvg = currentAction.querySelector('use');
    const currentHref = currentSvg?.getAttribute('xlink:href') || currentSvg?.getAttribute('href') || '';
    if (currentHref) {
      return currentHref === '#iconCheck';
    }
    return null;
  }
  return null;
}

function stripTaskPrefix(text: string): string {
  return text
    .replace(/^\s*[-*]\s*(?:\{:[^}]*\})?\s*\[(x|X| )\]\s*/i, '')
    .replace(/\s*\{:\s*style="[^"]*"\}\s*/g, ' ')
    .trim();
}

function cleanTaskTitleHtml(html: string): string {
  return html.replace(/\{:\s*style="[^"]*"\}/g, '').trim();
}

function getLiveTaskTitle(blockId: string): string | null {
  if (!blockId) return null;
  const selectors = [
    `.protyle [data-node-id="${blockId}"][data-type="NodeListItem"]`,
    `.protyle [data-node-id="${blockId}"]`,
    `[data-node-id="${blockId}"][data-type="NodeListItem"]`,
    `[data-node-id="${blockId}"]`
  ];
  for (const selector of selectors) {
    const currentElement = document.querySelector(selector);
    if (!currentElement) continue;
    const currentParagraph = currentElement.querySelector('[data-type="NodeParagraph"] [contenteditable="true"]');
    const liveTitle = cleanTaskTitleHtml(currentParagraph?.innerHTML || '');
    if (liveTitle.length > 0) {
      return liveTitle;
    }
  }
  return null;
}

function hasInlineMemoTitle(title: string): boolean {
  return title.includes('data-type="inline-memo"') || title.includes('data-inline-memo-content');
}

function shouldSkipMemoTitleDowngrade(currentTitle: string, nextTitle: string): boolean {
  return hasInlineMemoTitle(currentTitle) && !hasInlineMemoTitle(nextTitle) && nextTitle.includes('<sup');
}

function preserveInlineMemoTitles(nextTasks: Task[], currentTasks: Task[]): void {
  const stableTitlesByBlockId = new Map<string, string>();
  for (const task of currentTasks) {
    if (task.type !== 'block' || !task.blockId) continue;
    const title = typeof task.title === 'string' ? task.title : '';
    if (!hasInlineMemoTitle(title)) continue;
    stableTitlesByBlockId.set(task.blockId, title);
  }

  if (stableTitlesByBlockId.size === 0) {
    return;
  }

  for (const task of nextTasks) {
    if (task.type !== 'block' || !task.blockId) continue;
    const stableTitle = stableTitlesByBlockId.get(task.blockId);
    if (!stableTitle) continue;
    const nextTitle = typeof task.title === 'string' ? task.title : '';
    if (shouldSkipMemoTitleDowngrade(stableTitle, nextTitle)) {
      task.title = stableTitle;
    }
  }
}

function hydrateMemoTitlesFromLiveDom(taskList: Task[], limit = TASK_TITLE_HYDRATE_LIMIT): void {
  let handled = 0;
  for (const task of taskList) {
    if (handled >= limit) {
      break;
    }
    if (task.type !== 'block' || !task.blockId) {
      continue;
    }
    const currentTitle = typeof task.title === 'string' ? task.title : '';
    if (!currentTitle.includes('<sup')) {
      continue;
    }
    const liveTitle = getLiveTaskTitle(task.blockId);
    if (!liveTitle || liveTitle === currentTitle) {
      continue;
    }
    task.title = liveTitle;
    handled += 1;
  }
}

function parseTaskTitle(markdown: string, blockId: string): string | null {
  const liveTitle = getLiveTaskTitle(blockId);
  if (liveTitle !== null) {
    return liveTitle;
  }

  const firstLine = markdown
    .split('\n')
    .map(line => line.trim())
    .find(line => line.length > 0);
  if (!firstLine) return null;
  if (!/\[(x|X| )\]/.test(firstLine)) return null;

  const rawTitle = stripTaskPrefix(firstLine);
  return formatTaskTitleHtml(rawTitle);
}

async function fastSyncTaskFromMarkdown(blockIds: string[]): Promise<{
  unresolvedBlockIds: string[];
  patchedParentStatuses: Map<string, Task['status']>;
}> {
  const unresolved: string[] = [];
  const patchedParentStatuses = new Map<string, Task['status']>();
  let hasPatched = false;
  const validBlockIds: string[] = [];
  const taskIndexMap = new Map<string, TaskIndex>();

  for (const blockId of blockIds) {
    const taskIndex = blockIdToTaskIndex.get(blockId);
    if (!taskIndex) {
      unresolved.push(blockId);
      continue;
    }
    validBlockIds.push(blockId);
    taskIndexMap.set(blockId, taskIndex);
  }

  const blockSnapshots = await Promise.all(validBlockIds.map(async (blockId) => {
    try {
      const blockData = await getBlockKramdown(blockId);
      const markdown = typeof blockData === 'string' ? blockData : blockData?.kramdown || '';
      return { blockId, markdown, error: null as unknown };
    } catch (error) {
      return { blockId, markdown: '', error };
    }
  }));
  for (const snapshot of blockSnapshots) {
    const { blockId, markdown, error } = snapshot;
    if (error) {
      unresolved.push(blockId);
      continue;
    }

    const taskIndex = taskIndexMap.get(blockId);
    if (!taskIndex) {
      unresolved.push(blockId);
      continue;
    }

    try {
      const completed = parseTaskCompleted(markdown, blockId);
      const title = parseTaskTitle(markdown, blockId);
      if (completed === null) {
        unresolved.push(blockId);
        continue;
      }

      if (taskIndex.isSubtask) {
        let changed = false;
        const patched = patchTask(tasks.value, blockId, (subtask) => {
          if (subtask.completed !== completed) {
            subtask.completed = completed;
            changed = true;
          }
          if (title !== null && subtask.title !== title) {
            const currentTitle = typeof subtask.title === 'string' ? subtask.title : '';
            if (!shouldSkipMemoTitleDowngrade(currentTitle, title)) {
              subtask.title = title;
              changed = true;
            }
          }
        }, 'nodeId');
        if (!patched) {
          unresolved.push(blockId);
          continue;
        }
        if (changed) {
          hasPatched = true;
        }
      } else {
        let changed = false;
        let nextStatusForTask: Task['status'] | null = null;
        const patched = patchTask(tasks.value, blockId, (task) => {
          const nextStatus: Task['status'] = completed
            ? 'completed'
            : (task.status === 'completed' ? 'pending' : (task.status || 'pending'));
          nextStatusForTask = nextStatus;
          if (task.status !== nextStatus) {
            task.status = nextStatus;
            changed = true;
          }
          if (completed && !task.completedAt) {
            task.completedAt = new Date().toISOString();
            changed = true;
          }
          if (!completed && task.completedAt) {
            delete task.completedAt;
            changed = true;
          }
          if (title !== null && task.title !== title) {
            const currentTitle = typeof task.title === 'string' ? task.title : '';
            if (!shouldSkipMemoTitleDowngrade(currentTitle, title)) {
              task.title = title;
              changed = true;
            }
          }
        }, 'blockId');
        if (!patched) {
          unresolved.push(blockId);
          continue;
        }
        if (changed) {
          hasPatched = true;
          if (nextStatusForTask) {
            patchedParentStatuses.set(blockId, nextStatusForTask);
          }
        }
      }
    } catch (_error) {
      unresolved.push(blockId);
    }
  }
  if (hasPatched) {
    invalidateCache();
    invalidateSortCache();
    updateTaskIndex();
  }

  return {
    unresolvedBlockIds: unresolved,
    patchedParentStatuses
  };
}

function createTaskEditDraft(task: Task): TaskEditDraft {
  const normalizedReminder = normalizeTaskReminderSelection(task);
  return {
    taskId: task.id,
    priority: task.priority,
    dueDate: normalizeDateInputValue((task.dueDate || '').toString()),
    description: task.description || '',
    reminderType: normalizedReminder.reminderType,
    reminderCustomTime: normalizedReminder.reminderCustomTime,
    groupId: task.groupId || ''
  };
}

function ensureTaskEditDraft(task: Task): TaskEditDraft | null {
  const taskId = typeof task.id === 'string' ? task.id : '';
  if (!taskId) {
    return null;
  }
  if (!taskEditDraft.value || taskEditDraft.value.taskId !== taskId) {
    taskEditDraft.value = createTaskEditDraft(task);
  }
  return taskEditDraft.value;
}

function cleanupEventListeners() {
  eventUnsubscribers.forEach(unsubscribe => unsubscribe());
  eventUnsubscribers = [];
  if (fallbackRefreshTimer !== null) {
    clearTimeout(fallbackRefreshTimer);
    fallbackRefreshTimer = null;
  }
  incrementalUpdateQueue.clear();
}

async function toggleTaskStatus(task: Task) {
  if (skipSet.has(task.id)) {
    return;
  }
  
  const newStatus = task.status === 'completed' ? 'pending' : 'completed';
  const isVirtualRepeatTask = !!task.isVirtual && !!task.repeatSeriesId && !!task.repeatInstanceDate;
  
  skipTaskTemporarily(skipSet, task.id);
  
  try {
    if (isVirtualRepeatTask) {
      await TaskRepository.updateRepeatInstanceStatus(task, newStatus);
    } else if (task.type === 'block' && task.blockId) {
      await updateTaskMarkdown(task.blockId, newStatus === 'completed', true);
    }
    
    if (!isVirtualRepeatTask) {
      crdtRepo.updateTaskField(task.id, 'status', newStatus);
    }
    
    patchTask(tasks.value, task.id, (t) => {
      t.status = newStatus;
      if (newStatus === 'completed') {
        t.completedAt = new Date().toISOString();
      } else {
        delete t.completedAt;
      }
    }, 'id');
    
    await refreshInternalState();
    
    if (!isVirtualRepeatTask) {
      eventBus.emit(Events.TASK_CHANGED, { blockIds: task.blockId ? [task.blockId] : [] });
    }
  } catch (error) {
    // Swallow toggle errors to avoid breaking interaction flow.
  }
}

async function handleSubtaskToggle(parentTaskId: string, subtask: any) {
  if (skipSet.has(subtask.id)) {
    return;
  }
  
  const newCompleted = !subtask.completed;
  
  skipTaskTemporarily(skipSet, subtask.id);
  
  patchTask(tasks.value, subtask.id, (st) => {
    st.completed = newCompleted;
  });
  
  await refreshInternalState();
  
  if (subtask.nodeId) {
    updateTaskMarkdown(subtask.nodeId, newCompleted).catch(() => {});
  }
  
  TaskRepository.updateSubtaskInCache(parentTaskId, subtask.id, newCompleted).catch(() => {});
}

function handleTaskClick(task: Task) {
  if (task.type === 'block' && task.blockId) {
    void openBlockById(task.blockId);
  }
}

async function resolveTaskEditorRootId(blockId: string, preferredRootId?: string): Promise<string> {
  const normalizedPreferredRootId = typeof preferredRootId === 'string' ? preferredRootId.trim() : '';
  if (normalizedPreferredRootId) {
    return normalizedPreferredRootId;
  }

  const normalizedBlockId = typeof blockId === 'string' ? blockId.trim() : '';
  if (!normalizedBlockId) {
    return '';
  }

  try {
    const rows = await sql(`
      SELECT root_id
      FROM blocks
      WHERE id = '${escapeSqlLiteral(normalizedBlockId)}'
      LIMIT 1
    `) as Array<{ root_id?: string }>;
    const rootId = typeof rows?.[0]?.root_id === 'string' ? rows[0].root_id.trim() : '';
    return rootId;
  } catch {
    return '';
  }
}

async function focusTaskEditorSidebarBlock(
  blockId: string,
  retries = 24,
  intervalMs = 80
): Promise<boolean> {
  const normalizedBlockId = typeof blockId === 'string' ? blockId.trim() : '';
  if (!normalizedBlockId || !taskEditorProtyle || !taskEditorSidebarMountRef.value) {
    return false;
  }

  const tryFocus = (): boolean => {
    const mountElement = taskEditorSidebarMountRef.value;
    const target = mountElement?.querySelector(`[data-node-id="${normalizedBlockId}"]`) as Element | null;
    if (target) {
      try {
        const targetElement = target as HTMLElement;
        const protyleContent = mountElement?.querySelector('.protyle-content') as HTMLElement | null;
        if (protyleContent) {
          const targetRect = targetElement.getBoundingClientRect();
          const containerRect = protyleContent.getBoundingClientRect();
          const delta = targetRect.top - containerRect.top - (containerRect.height - targetRect.height) / 2;
          if (Number.isFinite(delta)) {
            protyleContent.scrollTop += delta;
          }
        }
      } catch {
      }
      try {
        taskEditorProtyle?.focusBlock(target, true);
      } catch {
      }
      return true;
    }
    return false;
  };

  if (tryFocus()) {
    return true;
  }

  for (let i = 0; i < retries; i++) {
    await new Promise(resolve => window.setTimeout(resolve, intervalMs));
    if (tryFocus()) {
      return true;
    }
  }
  return false;
}

function closeTaskEditorSidebar(): void {
  taskEditorSidebarVisible.value = false;
  taskEditorPriorityPopover.value = null;
  taskEditorQuickPanel.value = null;
  showTaskMoveDialog.value = false;
  isTaskMoveSubmitting.value = false;
  if (taskEditorProtyle) {
    try {
      taskEditorProtyle.destroy();
    } catch {
    }
    taskEditorProtyle = null;
  }
  if (taskEditorSidebarMountRef.value) {
    taskEditorSidebarMountRef.value.innerHTML = '';
  }
  closeTaskEditMenu();
}

function syncTaskMoveSelectedDocument(preferredDocumentId?: string): void {
  const preferredId = typeof preferredDocumentId === 'string' ? preferredDocumentId.trim() : '';
  if (preferredId && taskMoveDocuments.value.some(doc => doc.id === preferredId)) {
    taskMoveSelectedDocument.value = preferredId;
    return;
  }
  taskMoveSelectedDocument.value = taskMoveDocuments.value[0]?.id || '';
}

async function openTaskMoveDialog(): Promise<void> {
  const task = activeTaskEditTask.value;
  if (!task) {
    return;
  }

  if (notebooks.value.length === 0) {
    await loadNotebooks();
  }
  await refreshTaskDocumentOptions(true);

  taskEditorPriorityPopover.value = null;
  taskEditorQuickPanel.value = null;

  const currentNotebookId = typeof task.notebookId === 'string' ? task.notebookId.trim() : '';
  taskMoveSelectedNotebook.value = notebooks.value.some(notebook => notebook.id === currentNotebookId)
    ? currentNotebookId
    : (notebooks.value[0]?.id || '');
  syncTaskMoveSelectedDocument(task.rootId);
  showTaskMoveDialog.value = true;
}

function closeTaskMoveDialog(): void {
  showTaskMoveDialog.value = false;
  isTaskMoveSubmitting.value = false;
}

function handleTaskMoveNotebookChange(value: string): void {
  taskMoveSelectedNotebook.value = typeof value === 'string' ? value : '';
  syncTaskMoveSelectedDocument();
}

function toggleTaskEditorPriorityPopover(event: MouseEvent): void {
  if (!activeTaskEditTask.value || !activeTaskEditDraft.value) {
    taskEditorPriorityPopover.value = null;
    return;
  }
  if (taskEditorPriorityPopover.value) {
    taskEditorPriorityPopover.value = null;
    return;
  }
  const target = event.currentTarget as HTMLElement | null;
  if (!target) return;
  const rect = target.getBoundingClientRect();
  taskEditorPriorityPopover.value = {
    position: {
      x: rect.left + rect.width / 2,
      y: rect.bottom + 8
    }
  };
}

function handleTaskEditorPrioritySelect(value: string): void {
  if (!activeTaskEditTask.value) return;
  void quickSaveTaskPriority(activeTaskEditTask.value, value as Task['priority']);
}

function handleTaskEditorDescriptionInput(value: string): void {
  if (!activeTaskEditDraft.value) return;
  activeTaskEditDraft.value.description = value;
}

function handleTaskEditorDateSelect(value: string): void {
  if (!activeTaskEditTask.value || !activeTaskEditDraft.value) return;
  activeTaskEditDraft.value.dueDate = value;
  void quickSaveTaskDueDate(activeTaskEditTask.value, value || '');
}

function handleTaskEditorReminderSelect(value: TaskReminderSelection): void {
  if (!activeTaskEditTask.value || !activeTaskEditDraft.value) return;
  activeTaskEditDraft.value.reminderType = value.reminderType;
  activeTaskEditDraft.value.reminderCustomTime = value.reminderCustomTime || '';
  void quickSaveTaskReminder(activeTaskEditTask.value, value);
}

function handleTaskEditorDescriptionCommit(): void {
  if (!activeTaskEditTask.value || !activeTaskEditDraft.value) return;
  void quickSaveTaskDescription(activeTaskEditTask.value, activeTaskEditDraft.value.description || '');
  taskEditorQuickPanel.value = null;
}

async function handleTaskEditorDelete(): Promise<void> {
  const task = activeTaskEditTask.value;
  if (!task) {
    return;
  }

  if (!confirm('确认删除该任务？')) {
    return;
  }

  const blockId = typeof task.blockId === 'string' ? task.blockId.trim() : '';

  try {
    await TaskRepository.deleteTask(task.id);
    if (task.id) {
      crdtRepo.deleteTask(task.id, Date.now());
      tasks.value = crdtRepo.getTasks();
      await updateTaskIndex();
    }
    closeTaskEditorSidebar();
    if (blockId) {
      eventBus.emit(Events.TASK_DELETED, { blockId });
    } else {
      await refreshInternalState();
    }
  } catch {
  }
}

async function handleTaskEditorMove(): Promise<void> {
  const task = activeTaskEditTask.value;
  if (!task || !canSubmitTaskMove.value) {
    return;
  }

  isTaskMoveSubmitting.value = true;
  try {
    await TaskRepository.moveTask(task.id, taskMoveSelectedDocument.value);
    closeTaskMoveDialog();
    closeTaskEditorSidebar();
    await refreshTasks(true, { showLoading: false, compareExisting: false, source: 'task-move' });
  } catch {
    isTaskMoveSubmitting.value = false;
  }
}

function handleTaskFilterPopoverViewportChange(): void {
  updateTaskFilterPopoverPosition();
}

function handleTaskFilterOutsideClick(event: MouseEvent): void {
  const target = event.target as Node | null;
  if (!target) {
    return;
  }

  const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
  const isInsidePriorityPopover = path.some(node =>
    node instanceof HTMLElement && node.classList.contains('priority-popover')
  );
  const isInsidePriorityControl = path.some(node =>
    node instanceof HTMLElement && node.classList.contains('task-editor-priority-btn')
  );
  if (taskEditorPriorityPopover.value && !isInsidePriorityPopover && !isInsidePriorityControl) {
    taskEditorPriorityPopover.value = null;
  }

  const resolvePopoverElement = (refValue: InstanceType<typeof TaskFilterPopover> | null): HTMLElement | null => {
    const exposed = refValue as { popoverEl?: HTMLElement | { value?: HTMLElement | null } } | null;
    const popoverEl = exposed?.popoverEl;
    if (!popoverEl) return null;
    if (popoverEl instanceof HTMLElement) return popoverEl;
    if (typeof popoverEl === 'object' && 'value' in popoverEl) {
      return (popoverEl as { value?: HTMLElement | null }).value || null;
    }
    return null;
  };

  if (taskFilterPopoverVisible.value) {
    const isInsidePopover = path.some(node =>
      node instanceof HTMLElement && node.classList.contains('task-filter-popover')
    );
    const isInsideControl = path.some(node =>
      node instanceof HTMLElement && node.classList.contains('task-filter-control')
    );
    if (isInsidePopover || isInsideControl) {
      return;
    }
    const popoverEl = resolvePopoverElement(taskFilterPopoverRef.value);
    if (!taskFilterControlRef.value?.contains(target) && !popoverEl?.contains(target)) {
      closeTaskFilterPopover();
    }
  }

}

async function openTaskEditorInSidebar(blockId: string, preferredRootId?: string): Promise<boolean> {
  const normalizedBlockId = typeof blockId === 'string' ? blockId.trim() : '';
  if (!normalizedBlockId) {
    return false;
  }

  const plugin = usePlugin();
  if (!plugin?.app) {
    return false;
  }

  const normalizedRootId = await resolveTaskEditorRootId(normalizedBlockId, preferredRootId);

  taskEditorSidebarVisible.value = true;
  await nextTick();

  const mountElement = taskEditorSidebarMountRef.value;
  if (!mountElement) {
    return false;
  }

  if (taskEditorProtyle) {
    try {
      taskEditorProtyle.destroy();
    } catch {
    }
    taskEditorProtyle = null;
  }
  mountElement.innerHTML = '';

  try {
    const options: Record<string, any> = {
      blockId: normalizedBlockId,
      action: ['cb-get-focus'],
      mode: 'wysiwyg',
      render: {
        title: false,
        breadcrumb: false,
        gutter: false,
        scroll: false
      }
    };
    if (normalizedRootId) {
      options.rootId = normalizedRootId;
    }
    taskEditorProtyle = new Protyle(plugin.app, mountElement, options);
    await focusTaskEditorSidebarBlock(normalizedBlockId);
    return true;
  } catch {
    taskEditorProtyle = null;
    return false;
  }
}

async function openTaskEditorPopover(task: Task): Promise<void> {
  const blockId = typeof task.blockId === 'string' ? task.blockId.trim() : '';
  const rootId = typeof task.rootId === 'string' ? task.rootId.trim() : '';

  if (task.type !== 'block' || !blockId) {
    return;
  }

  if (openingTaskPopoverBlockIds.has(blockId)) {
    return;
  }

  openingTaskPopoverBlockIds.add(blockId);
  taskEditorSidebarTitle.value = '编辑任务';
  try {
    const opened = await openTaskEditorInSidebar(blockId, rootId);
    if (!opened) {
      closeTaskEditorSidebar();
    }
  } finally {
    openingTaskPopoverBlockIds.delete(blockId);
  }
}

function openTaskEditorFromMenu(task: Task): void {
  const taskId = typeof task.id === 'string' ? task.id : '';
  if (!taskId) {
    return;
  }
  if (!ensureTaskEditDraft(task)) {
    return;
  }
  taskEditMenuTaskId.value = taskId;
  void openTaskEditorPopover(task);
}

function getInlineDescriptionDraft(task: Task): string {
  if (inlineDescriptionDraftByTaskId.value.has(task.id)) {
    return inlineDescriptionDraftByTaskId.value.get(task.id) || '';
  }
  return task.description || '';
}

function handleInlineDescriptionInput(taskId: string, event: Event): void {
  const target = event.target as HTMLTextAreaElement | null;
  inlineDescriptionDraftByTaskId.value.set(taskId, target?.value || '');
}

function startInlineDescriptionEdit(task: Task): void {
  if (inlineDescriptionSavingTaskIds.has(task.id)) {
    return;
  }
  inlineEditingDescriptionTaskId.value = task.id;
  inlineDescriptionDraftByTaskId.value.set(task.id, task.description || '');
}

function clearInlineDescriptionEdit(taskId: string): void {
  if (inlineEditingDescriptionTaskId.value === taskId) {
    inlineEditingDescriptionTaskId.value = null;
  }
  inlineDescriptionDraftByTaskId.value.delete(taskId);
}

function cancelInlineDescriptionEdit(taskId: string): void {
  clearInlineDescriptionEdit(taskId);
}

async function saveInlineDescriptionEdit(task: Task): Promise<void> {
  const taskId = task.id;
  if (inlineEditingDescriptionTaskId.value !== taskId) {
    return;
  }
  if (inlineDescriptionSavingTaskIds.has(taskId)) {
    return;
  }

  const description = inlineDescriptionDraftByTaskId.value.get(taskId) || '';
  if (description === (task.description || '')) {
    clearInlineDescriptionEdit(taskId);
    return;
  }

  inlineDescriptionSavingTaskIds.add(taskId);
  try {
    if (task.type === 'block' && task.blockId) {
      await setBlockAttrs(task.blockId, {
        'custom-task-description': description || ''
      });
    }

    crdtRepo.updateTaskField(taskId, 'description', description);
    patchTask(tasks.value, taskId, (targetTask) => {
      targetTask.description = description;
      targetTask.updatedAt = new Date().toISOString();
    }, 'id');
    await refreshInternalState();
  } catch {
  } finally {
    inlineDescriptionSavingTaskIds.delete(taskId);
    clearInlineDescriptionEdit(taskId);
  }
}

interface TaskEditorFieldUpdateOptions {
  attrs: Record<string, string>;
  isUnchanged: (draft: TaskEditDraft) => boolean;
  syncDraft: (draft: TaskEditDraft) => void;
  syncTask: (task: Task) => void;
  syncCrdt: () => void;
  emitTaskChanged?: boolean;
}

async function applyTaskEditorFieldUpdate(
  task: Task,
  options: TaskEditorFieldUpdateOptions
): Promise<void> {
  const editedTask = activeTaskEditDraft.value;
  if (!editedTask || editedTask.taskId !== task.id || options.isUnchanged(editedTask)) {
    return;
  }

  options.syncDraft(editedTask);

  try {
    if (task.type === 'block' && task.blockId) {
      await setBlockAttrs(task.blockId, options.attrs);
    }

    options.syncCrdt();
    patchTask(tasks.value, task.id, (targetTask) => {
      options.syncTask(targetTask);
      targetTask.updatedAt = new Date().toISOString();
    }, 'id');
    await refreshInternalState();
    if (options.emitTaskChanged && task.blockId) {
      eventBus.emit(Events.TASK_CHANGED, { blockIds: [task.blockId] });
    }
  } catch {
  }
}

async function quickSaveTaskPriority(task: Task, priority: Task['priority']): Promise<void> {
  await applyTaskEditorFieldUpdate(task, {
    attrs: {
      'custom-task-priority': priority
    },
    isUnchanged: draft => draft.priority === priority && task.priority === priority,
    syncDraft: draft => {
      draft.priority = priority;
    },
    syncTask: targetTask => {
      targetTask.priority = priority;
    },
    syncCrdt: () => {
      crdtRepo.updateTaskField(task.id, 'priority', priority);
    }
  });
}

async function quickSaveTaskDueDate(task: Task, dueDate: string): Promise<void> {
  const normalizedDueDate = normalizeDateInputValue(dueDate || '');
  const currentDueDate = normalizeDateInputValue((task.dueDate || '').toString());
  await applyTaskEditorFieldUpdate(task, {
    attrs: {
      'custom-task-due-date': normalizedDueDate
    },
    isUnchanged: draft => draft.dueDate === normalizedDueDate && currentDueDate === normalizedDueDate,
    syncDraft: draft => {
      draft.dueDate = normalizedDueDate;
    },
    syncTask: targetTask => {
      targetTask.dueDate = normalizedDueDate;
    },
    syncCrdt: () => {
      crdtRepo.updateTaskField(task.id, 'dueDate', normalizedDueDate);
    },
    emitTaskChanged: true
  });
}

async function quickSaveTaskDescription(task: Task, description: string): Promise<void> {
  const normalizedDescription = typeof description === 'string' ? description : '';
  const currentDescription = typeof task.description === 'string' ? task.description : '';
  await applyTaskEditorFieldUpdate(task, {
    attrs: {
      'custom-task-description': normalizedDescription || ''
    },
    isUnchanged: draft => draft.description === normalizedDescription && currentDescription === normalizedDescription,
    syncDraft: draft => {
      draft.description = normalizedDescription;
    },
    syncTask: targetTask => {
      targetTask.description = normalizedDescription;
    },
    syncCrdt: () => {
      crdtRepo.updateTaskField(task.id, 'description', normalizedDescription);
    }
  });
}

async function quickSaveTaskReminder(task: Task, value: TaskReminderSelection): Promise<void> {
  const normalizedReminder = normalizeTaskReminderSelection(value);
  await applyTaskEditorFieldUpdate(task, {
    attrs: buildTaskReminderAttrs(normalizedReminder),
    isUnchanged: draft => (
      isSameTaskReminderSelection(draft, normalizedReminder)
      && isSameTaskReminderSelection(task, normalizedReminder)
    ),
    syncDraft: draft => {
      draft.reminderType = normalizedReminder.reminderType;
      draft.reminderCustomTime = normalizedReminder.reminderCustomTime;
    },
    syncTask: targetTask => {
      targetTask.reminderType = normalizedReminder.reminderType;
      targetTask.reminderCustomTime = normalizedReminder.reminderCustomTimeValue;
    },
    syncCrdt: () => {
      crdtRepo.updateTaskField(task.id, 'reminderType', normalizedReminder.reminderType);
      crdtRepo.updateTaskField(task.id, 'reminderCustomTime', normalizedReminder.reminderCustomTimeValue);
    },
    emitTaskChanged: true
  });
}

async function quickSaveTaskGroup(task: Task, groupId: string): Promise<void> {
  const normalizedGroupId = typeof groupId === 'string' ? groupId.trim() : '';
  const currentGroupId = typeof task.groupId === 'string' ? task.groupId.trim() : '';
  await applyTaskEditorFieldUpdate(task, {
    attrs: {
      'custom-task-group': normalizedGroupId || ''
    },
    isUnchanged: draft => draft.groupId === normalizedGroupId && currentGroupId === normalizedGroupId,
    syncDraft: draft => {
      draft.groupId = normalizedGroupId;
    },
    syncTask: targetTask => {
      targetTask.groupId = normalizedGroupId || undefined;
    },
    syncCrdt: () => {
      crdtRepo.updateTaskField(task.id, 'groupId', normalizedGroupId || undefined);
    }
  });
}

function handleDragStart(event: DragEvent, task: Task) {
  if (isMobileFrontend) return;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/json', JSON.stringify(task));
    event.dataTransfer.setData('text/plain', task.id);
  }
}

async function ensureInboxDocument(notebookId: string): Promise<string> {
  const inboxPath = '/pinch收集箱';
  
  try {
    const existingIds = await getIDsByHPath(notebookId, inboxPath);
    if (existingIds && existingIds.length > 0) {
      return inboxPath;
    }
  } catch (error) {
    
  }
  
  try {
    await createDocWithMd(notebookId, inboxPath, '');
    return inboxPath;
  } catch (error) {
    throw error;
  }
}

async function handleCreateTask(taskData: any, notebookId: string, documentId: string) {
  try {
    let docPath = '';
    
    if (documentId && documentId !== PINCH_INBOX_OPTION_ID) {
      const selectedDoc = allDocuments.value.find(d => d.id === documentId && d.notebookId === notebookId);
      if (selectedDoc) {
        const notebook = notebooks.value.find(nb => nb.id === notebookId);
        if (notebook) {
          const task = tasks.value.find(t => t.rootId === documentId && t.notebookId === notebookId);
          if (task && task.hPath) {
            docPath = task.hPath.replace(`${notebook.name}/`, '');
          }
        }
      }
    }
    
    if (!docPath) {
      docPath = await ensureInboxDocument(notebookId);
    }
    
    await TaskRepository.createBlockTask({
      title: taskData.title,
      description: taskData.description,
      priority: taskData.priority,
      status: taskData.status,
      dueDate: taskData.dueDate || undefined,
      reminderType: taskData.reminderType,
      reminderCustomTime: taskData.reminderCustomTime || undefined,
      tags: taskData.tags || [],
      groupId: taskData.groupId || undefined
    }, notebookId, docPath);
    
    lastTaskNotebook.value = notebookId;
    lastTaskDocument.value = documentId;
    const normalizedGroupId = typeof taskData.groupId === 'string' ? taskData.groupId.trim() : '';
    lastSelectedTaskGroupId.value = normalizedGroupId;
    await updateSettings('taskManager', {
      lastTaskNotebook: notebookId,
      lastTaskDocument: documentId,
      selectedGroupId: normalizedGroupId
    });
    
    showTaskModal.value = false;
  } catch (error) {
    // Swallow create-task errors here; later refresh/retry will reconcile state.
  }
}

onMounted(async () => {
  resolveTaskModalTeleportTarget();
  taskScrollContainerRef.value = resolveTaskScrollContainer();
  taskScrollContainerRef.value?.addEventListener('scroll', handleTaskListScroll, { passive: true });
  window.addEventListener('resize', scheduleTaskVirtualUpdate, true);
  document.addEventListener('mousedown', handleTaskFilterOutsideClick, true);
  window.addEventListener('resize', handleTaskFilterPopoverViewportChange, true);
  window.addEventListener('scroll', handleTaskFilterPopoverViewportChange, true);
  taskModalTeleportTarget.value?.addEventListener('scroll', handleTaskFilterPopoverViewportChange, true);
  await loadSettings();
  taskGroups.value = await loadTaskGroups();
  const storedGroupId = typeof userSettings.taskManager.selectedGroupId === 'string'
    ? userSettings.taskManager.selectedGroupId
    : '';
  if (storedGroupId && taskGroups.value.some(group => group.id === storedGroupId)) {
    lastSelectedTaskGroupId.value = storedGroupId;
  } else {
    lastSelectedTaskGroupId.value = '';
  }
  applyExcludedNotebookScope(normalizeNotebookIds(userSettings.taskManager.excludedNotebookIds));

  await loadNotebooks();
  await refreshTaskDocumentOptions(true);
  
  filterNotebook.value = userSettings.taskManager.filterNotebook || 'all';
  filterDocument.value = userSettings.taskManager.filterDocument || 'all';
  showCompletedTasks.value = userSettings.taskManager.showCompletedTasks !== false;
  ensureActiveNotebookFilterInScope();
  
  normalizeDocumentSelection(filterNotebook.value);
  setupEventListeners();
  startSkipSetCleanup();

  const scopeInitialized = userSettings.taskManager.scopeInitialized === true;
  if (!scopeInitialized) {
    requiresScopeInitialization.value = true;
    showTaskScopeDialog.value = true;
    isHydratingFilters = false;
    return;
  }

  loading.value = true;
  try {
    const cachedTasks = await TaskRepository.getCachedTasksOnly();
    hydrateMemoTitlesFromLiveDom(cachedTasks, TASK_TITLE_HYDRATE_LIMIT);
    crdtRepo.syncFromSQLTasks(cachedTasks);
    tasks.value = crdtRepo.getTasks();
    hydrateMemoTitlesFromLiveDom(tasks.value, TASK_TITLE_HYDRATE_LIMIT);
    await refreshInternalState();
    if (tasks.value.length > 0 && tasks.value.length <= FILTER_SWITCH_BROAD_LOAD_THRESHOLD) {
      lastLoadedScope = { includeCompleted: showCompletedTasks.value };
    }
  } finally {
    loading.value = false;
  }

  isHydratingFilters = false;
  // First paint from cache, then silently reconcile with source of truth once.
  void refreshTasks(true, { showLoading: false, compareExisting: true, source: 'mounted-reconcile' });
});

onUnmounted(() => {
  closeTaskEditMenu();
  closeTaskFilterPopover();
  cleanupEventListeners();
  stopSkipSetCleanup();
  closeTaskEditorSidebar();
  taskScrollContainerRef.value?.removeEventListener('scroll', handleTaskListScroll);
  window.removeEventListener('resize', scheduleTaskVirtualUpdate, true);
  if (taskVirtualRaf !== null) {
    cancelAnimationFrame(taskVirtualRaf);
    taskVirtualRaf = null;
  }
  if (taskRowMeasureRaf !== null) {
    cancelAnimationFrame(taskRowMeasureRaf);
    taskRowMeasureRaf = null;
  }
  if (taskTitleHydrateTimer !== null) {
    clearTimeout(taskTitleHydrateTimer);
    taskTitleHydrateTimer = null;
  }
  taskRowElements.clear();
  taskHeightCache.clear();
  document.removeEventListener('mousedown', handleTaskFilterOutsideClick, true);
  window.removeEventListener('resize', handleTaskFilterPopoverViewportChange, true);
  window.removeEventListener('scroll', handleTaskFilterPopoverViewportChange, true);
  taskModalTeleportTarget.value?.removeEventListener('scroll', handleTaskFilterPopoverViewportChange, true);
  if (filterSettingsUpdateTimer !== null) {
    clearTimeout(filterSettingsUpdateTimer);
    filterSettingsUpdateTimer = null;
  }
  if (fallbackRefreshTimer !== null) {
    clearTimeout(fallbackRefreshTimer);
    fallbackRefreshTimer = null;
  }
  if (taskScopeRefreshTimer !== null) {
    clearTimeout(taskScopeRefreshTimer);
    taskScopeRefreshTimer = null;
  }
});
</script>

<style scoped>
.task-manager-container {
  position: relative;
  border-radius: 12px;
  margin-top: 16px;
}

.task-manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.task-manager-header .header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-manager-header .collapse-arrow {
  cursor: pointer;
  transition: transform 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 4px;
  
  &:hover {
    background-color: var(--b3-list-hover);
  }
  
  &.collapsed {
    transform: rotate(-90deg);
  }
  
  .icon {
    color: var(--b3-theme-on-background);
  }
}

.task-manager-header .title {
  font-size: 16px;
  font-weight: 700;
  color: var(--b3-theme-on-background);
}

.header-actions {
  display: flex;
}

.new-task-button,
.task-refresh,
.task-scope-button {
  background: none;
  border: none;
  padding: 0;
  margin: 0 6px 0 0;
  cursor: pointer;
  width: 24px;
  height: 24px;
  
  svg {
    color: var(--b3-theme-on-background);
  }
}


.task-group-chip-label {
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}


.task-refresh.is-refreshing .refresh-icon {
  animation: task-refresh-spin 0.8s linear infinite;
}

@keyframes task-refresh-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.view-all-button {
  background: none;
  border: none;
  padding: 0;
  margin: 0 6px 0 0;
  cursor: pointer;
  height: 24px;
  border-radius: 13px;
  background-color: var(--b3-theme-on-background);
  color: var(--b3-theme-background);
  padding: 2px 10px;
}

.filters-row {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-bottom: 12px;
}

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
  position: relative;
  min-width: 100%;
  width: 100%;
  border-radius: 24px 24px 0 0;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15);
  max-height: 85vh;
  overflow: hidden;
  background: var(--b3-theme-background);
  display: flex;
  flex-direction: column;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.task-editor-sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 16px 20px;
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
  gap: 8px;
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
  color: var(--b3-theme-primary);
}

.task-editor-sidebar-delete:hover {
  background: var(--b3-list-hover);
  color: var(--b3-theme-error);
}

.task-editor-sidebar-close:hover {
  background: var(--b3-list-hover);
}

.task-editor-sidebar-body {
  position: relative;
  flex: 1 1 auto;
  min-height: 220px;
  overflow: hidden;
  padding: 4px;
}

.task-editor-sidebar-meta {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 20px 16px;
  border-top: 1px solid var(--b3-theme-border);
}

.task-move-dialog-overlay {
  position: absolute;
  inset: 0;
  z-index: 8;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.32);
}

.task-move-dialog {
  width: min(100%, 360px);
  border-radius: 16px;
  background: var(--b3-theme-background);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.task-move-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px 12px;
}

.task-move-dialog-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--b3-theme-on-background);
}

.task-move-dialog-close {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--b3-theme-on-background);
  cursor: pointer;
}

.task-move-dialog-close:hover {
  background: var(--b3-list-hover);
}

.task-move-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 18px 18px;
}

.task-move-dialog-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.task-move-dialog-field label {
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  opacity: 0.82;
  font-weight: 500;
}

.task-move-dialog-hint {
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  opacity: 0.72;
}

.task-move-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 0 18px 18px;
}

.task-move-dialog-btn {
  min-width: 72px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.task-move-dialog-btn.primary {
  background: var(--b3-theme-primary);
  color: var(--b3-theme-background);
}

.task-move-dialog-btn:disabled {
  opacity: 0.52;
  cursor: not-allowed;
}


.task-editor-sidebar-description {
  min-height: 72px;
}

.task-editor-sidebar-body :deep(.protyle-content) {
  overflow: auto;
  border-radius: 4px;
}

.task-editor-sidebar-body :deep(.protyle-wysiwyg) {
  padding: 10px !important;
}

.task-editor-sidebar-body :deep(.protyle-toolbar),
.task-editor-sidebar-body :deep(.protyle-hint) {
  z-index: 6;
}

.task-editor-overlay-enter-active,
.task-editor-overlay-leave-active {
  transition: opacity 0.3s ease;
}

.task-editor-overlay-enter-from,
.task-editor-overlay-leave-to {
  opacity: 0;
}

.task-editor-overlay-enter-from .task-editor-sidebar-panel,
.task-editor-overlay-leave-to .task-editor-sidebar-panel {
  transform: translateY(35%);
}

.filters-bar {
  display: flex;
  gap: 8px;
  flex-wrap: nowrap;
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
  margin-left: 6px;
}

.filters-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  position: relative;
}

.task-filter-control {
  position: relative;
}

.task-filter-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--b3-theme-on-surface);
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
  position: relative;
}

.task-filter-btn:hover,
.task-filter-btn.active {
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
}

.task-filter-btn svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.task-filter-count {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: #f98f7a;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.active-task-filters-row {
  margin-top: -4px;
  margin-bottom: 12px;
}

.active-task-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.active-task-filter-chip,
.active-task-filters-clear {
  border: none;
  border-radius: 999px;
  padding: 6px 10px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-surface);
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
}

.active-task-filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--active-task-filter-chip-bg, var(--b3-list-hover));
  color: var(--active-task-filter-chip-color, var(--b3-theme-on-surface));
  box-shadow: var(--active-task-filter-chip-shadow, none);
}

.active-task-filter-chip-remove {
  font-size: 12px;
  opacity: 0.7;
}

.active-task-filter-chip:hover,
.active-task-filters-clear:hover {
  color: var(--active-task-filter-chip-hover-color, var(--b3-theme-on-background));
}

.active-task-filters-clear {
  background: transparent;
  box-shadow: inset 0 0 0 1px var(--b3-theme-border);
}

.subtasks-toggle-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--b3-theme-on-surface);
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.subtasks-toggle-btn:hover {
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
}

.subtasks-toggle-btn svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform 0.2s ease;
}

.subtasks-toggle-btn.expanded svg {
  transform: rotate(180deg);
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.task-virtual-spacer {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.filter-group label {
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  white-space: nowrap;
  flex-shrink: 0;
}

.filter-group .task-manager-notebook-label {
  display: inline-flex;
  align-items: center;
  line-height: 0;
}

.filter-group .task-manager-notebook-icon {
  width: 16px;
  height: 16px;
}

.filter-group .filter-select-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
}

.filter-group :deep(.b3-select) {
  font-size: 12px;
  padding: 4px 24px 4px 8px;
  border-radius: 6px;
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.filter-group :deep(.b3-select:hover) {
  background-color: var(--b3-list-hover) !important;
}

.loading {
  text-align: center;
  padding: 20px;
  color: var(--b3-theme-on-surface);
  font-size: 14px;
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: var(--b3-theme-on-surface);
  opacity: 0.6;
  font-size: 14px;
}

.more-completed-button {
  align-self: center;
  margin-top: 4px;
  padding: 6px 12px;
  border: 1px solid var(--b3-theme-border);
  border-radius: 999px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-surface);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.more-completed-button:hover {
  background: var(--b3-list-hover);
}

.edit-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.edit-field label {
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  opacity: 0.8;
  font-weight: 500;
}

.task-edit-priority-picker {
  display: flex;
  gap: 6px;
}

.task-edit-priority-option {
  border: none;
  padding: 0;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
}

.task-edit-priority-option.is-active {
  box-shadow: 0 0 0 2px #f98f7a;
}

.task-edit-priority-indicator {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.edit-field textarea,
.edit-field select,
.edit-field input[type="date"] {
  padding: 6px 8px;
  border: 1px solid var(--b3-theme-border);
  border-radius: 4px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  font-size: 12px;
  font-family: inherit;
}

.edit-field textarea {
  resize: vertical;
  min-height: 40px;
  line-height: 1.5;
}

.edit-field textarea:focus,
.edit-field select:focus,
.edit-field input:focus {
  outline: none;
  border-color: #f98f7a;
}

.edit-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.edit-actions button {
  flex: 1;
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.save-btn {
  background: #f98f7a;
  color: white;
}

.save-btn:hover {
  background: #e55a47;
}

.cancel-btn {
  background: var(--b3-theme-border);
  color: var(--b3-theme-on-surface);
}

.cancel-btn:hover {
  background: var(--b3-list-hover);
}

</style>
