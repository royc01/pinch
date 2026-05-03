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
          title="刷新任务"
          aria-label="刷新任务"
          @click="handleRefreshClick"
        >
          <Icon name="refresh" width="22" height="22" class="icon refresh-icon" />
        </SyButton>
        <SyButton size="small" class="new-task-button" title="新建任务" aria-label="新建任务" @click="openTaskModal">
          <Icon name="add" width="24" height="24" class="icon" />
        </SyButton>
        <SyButton size="small" class="view-all-button" title="查看全部任务" aria-label="查看全部任务" @click="openKanbanView">
          更多
        </SyButton>
    </div>
    </div>
    
    <div class="filters-row" v-show="!isTaskListCollapsed">
      <div class="filters-bar">
        <div class="filter-group">
          <label
            class="task-manager-notebook-label"
            title="来源"
            aria-label="来源"
          >
            <Icon name="source" width="16" height="16" class="task-manager-notebook-icon" />
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
        <div class="task-search-control">
          <button
            type="button"
            class="task-search-btn"
            :class="{ active: taskSearchVisible }"
            title="搜索任务"
            aria-label="搜索任务"
            @click.stop="toggleTaskSearch"
          >
            <Icon name="search" width="16" height="16" />
          </button>
        </div>
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
            <Icon name="filter" width="16" height="16" />
            <span v-if="activeTaskFilterCount > 0" class="task-filter-count">
              {{ activeTaskFilterCount }}
            </span>
          </button>
        </div>
        <div ref="taskGroupMenuControlRef" class="task-group-menu-control">
          <button
            type="button"
            class="task-group-menu-btn"
            :class="{
              active: taskGroupMenuVisible || taskListGroupBy !== 'none' || taskListViewMode !== 'kanban',
              'is-batch-active': isBatchEditMode
            }"
            title="任务分组"
            aria-label="任务分组"
            @click.stop="toggleTaskGroupMenu"
          >
            <Icon name="moreVertical" width="16" height="16" />
          </button>
          <div
            v-if="taskGroupMenuVisible"
            class="task-group-menu-popover"
            @click.stop
          >
            <button
              v-for="option in taskListViewOptions"
              :key="`view:${option.value}`"
              type="button"
              class="task-group-menu-item"
              :class="{ active: taskListViewMode === option.value }"
              @click.stop="selectTaskListViewMode(option.value)"
            >
              <span>{{ option.label }}</span>
              <span v-if="taskListViewMode === option.value" class="task-group-menu-check">
                <Icon name="taskCheckboxChecked" width="12" height="12" />
              </span>
            </button>
            <div class="task-group-menu-divider"></div>
            <button
              v-for="option in taskListGroupOptions"
              :key="option.value"
              type="button"
              class="task-group-menu-item"
              :class="{ active: taskListGroupBy === option.value }"
              @click.stop="selectTaskListGroup(option.value)"
            >
              <span>{{ option.label }}</span>
              <span v-if="taskListGroupBy === option.value" class="task-group-menu-check">
                <Icon name="taskCheckboxChecked" width="12" height="12" />
              </span>
            </button>
            <div class="task-group-menu-divider"></div>
            <button
              type="button"
              class="task-group-menu-item"
              :class="{ active: isBatchEditMode }"
              @click.stop="toggleBatchEditModeFromMenu"
            >
              <span>{{ isBatchEditMode ? '退出批量编辑' : '进入批量编辑' }}</span>
              <span v-if="isBatchEditMode" class="task-group-menu-check">
                <Icon name="taskCheckboxChecked" width="12" height="12" />
              </span>
            </button>
            <button
              type="button"
              class="task-group-menu-item"
              @click.stop="openTaskGroupDialogFromMenu"
            >
              <span>标签管理</span>
            </button>
            <div class="task-group-menu-divider"></div>
            <button
              type="button"
              class="task-group-menu-item"
              @click.stop="toggleTaskCardDetailsFromMenu"
            >
              <span>{{ showTaskCardDetails ? '隐藏详细' : '显示详细' }}</span>
            </button>
            <button
              type="button"
              class="task-group-menu-item"
              :class="{ active: !showCompletedTasks }"
              @click.stop="toggleHideCompletedTasksFromMenu"
            >
              <span>隐藏已完成任务</span>
              <span v-if="!showCompletedTasks" class="task-group-menu-check">
                <Icon name="taskCheckboxChecked" width="12" height="12" />
              </span>
            </button>
            <button
              v-if="hasVisibleExpandableTasks"
              type="button"
              class="task-group-menu-item"
              @click.stop="toggleAllVisibleSubtasksFromMenu"
            >
              <span>{{ areAllVisibleSubtasksExpanded ? '一键折叠详情' : '一键展开详情' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="taskSearchVisible && !isTaskListCollapsed" class="task-search-row">
      <input
        ref="taskSearchInputRef"
        v-model="taskSearchQuery"
        type="text"
        class="task-search-input"
        placeholder="搜索任务"
        aria-label="搜索任务"
        @keydown.esc.stop.prevent="closeTaskSearch"
      />
    </div>

    <div v-if="isBatchEditMode && !isTaskListCollapsed" class="task-batch-toolbar">
      <div class="task-batch-toolbar-header">
        <span class="task-batch-selected-count">已选 {{ batchSelectedCount }} 项</span>
        <div class="task-batch-toolbar-actions">
          <button type="button" class="task-batch-tool-btn" @click="toggleSelectAllVisibleTasks">
            {{ allVisibleTasksSelected ? '取消全选' : '全选当前列表' }}
          </button>
          <button
            type="button"
            class="task-batch-tool-btn"
            :disabled="batchSelectedCount === 0"
            @click="clearBatchSelection"
          >
            清空选择
          </button>
        </div>
      </div>
      <div class="task-batch-edit-grid">
        <label class="task-batch-field">
          <span>状态</span>
          <SySelect
            :model-value="batchEditStatus"
            :options="batchEditStatusOptions"
            @update:model-value="batchEditStatus = String($event || '')"
          />
        </label>
        <label class="task-batch-field">
          <span>优先级</span>
          <SySelect
            :model-value="batchEditPriority"
            :options="batchEditPriorityOptions"
            @update:model-value="batchEditPriority = String($event || '')"
          />
        </label>
        <label class="task-batch-field">
          <span>标签</span>
          <SySelect
            :model-value="batchEditGroupId"
            :options="batchEditGroupOptions"
            @update:model-value="batchEditGroupId = String($event || '')"
          />
        </label>
        <button
          type="button"
          class="task-batch-apply-btn"
          :disabled="!canApplyBatchEdit"
          @click="applyBatchEdit"
        >
          {{ isBatchApplying ? '应用中...' : '应用到已选' }}
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
        <TaskEditorPanelShell
          v-show="!isTaskListCollapsed && taskEditorSidebarVisible"
          mode="sidebar"
          :title="taskEditorSidebarTitle"
          :show-pin="!!activeTaskEditTask"
          :pin-active="isActiveTaskPinned"
          :show-move="!!activeTaskEditTask"
          :show-archive="!!activeTaskEditTask"
          :is-archived="isActiveTaskArchived"
          :show-delete="!!activeTaskEditTask"
          :show-priority="!!(activeTaskEditTask && activeTaskEditDraft)"
          :show-focus="!!activeTaskEditTask"
          :priority-style="{ background: taskEditorPriorityOption.background, color: taskEditorPriorityOption.color }"
          @backdrop-click="closeTaskEditorSidebar"
          @panel-mousedown="handleTaskEditorSidebarPanelMouseDown"
          @pin="handleTaskEditorPinToggle"
          @move="openTaskMoveDialog"
          @archive="handleTaskEditorArchiveToggle"
          @delete="handleTaskEditorDelete"
          @priority="toggleTaskEditorPriorityPopover"
          @focus="handleTaskEditorStartFocus"
          @close="closeTaskEditorSidebar"
        >
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
              :start-date="activeTaskEditDraft.startDate || ''"
              :start-time="activeTaskEditDraft.startTime || ''"
              :due-date="activeTaskEditDraft.dueDate || ''"
              :due-time="activeTaskEditDraft.dueTime || ''"
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
              :status="activeTaskEditDraft.status"
              :group-button-style="taskEditorGroupButtonStyle"
              :default-group-chip-color="defaultGroupChipColor"
              description-placeholder="添加任务描述..."
              @update:panel="taskEditorQuickPanel = $event"
              @update:description="handleTaskEditorDescriptionInput"
              @update-dates="handleTaskEditorDateFieldsUpdate"
              @select-group="selectTaskEditorGroup"
              @select-reminder="handleTaskEditorReminderSelect"
              @select-status="handleTaskEditorStatusSelect"
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
        </TaskEditorPanelShell>
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
    <div
      v-else
      ref="tasksListRef"
      class="tasks-list b3-typography"
      :class="{ 'is-list-view': taskListViewMode === 'list' }"
      v-show="!isTaskListCollapsed"
    >
      <div v-if="displayedTasks.length === 0" class="empty-state">
        {{ t('taskManager.noTasks') }}
      </div>
      <div
        v-else-if="shouldRenderGroupedList"
        class="task-grouped-list"
        :class="{ 'is-list-view': taskListViewMode === 'list' }"
      >
        <section
          v-for="section in taskGroupedSections"
          :key="section.key"
          class="task-group-section"
        >
          <header class="task-group-section-header">
            <span class="task-group-section-title">
              <span
                v-if="isBatchEditMode"
                class="task-group-section-batch-checkbox"
                :class="{
                  partial: isTaskGroupSectionBatchPartiallySelected(section),
                  'is-disabled': section.tasks.length === 0
                }"
                :title="isTaskGroupSectionBatchAllSelected(section) ? '取消全选该分组' : '全选该分组'"
                :aria-label="isTaskGroupSectionBatchAllSelected(section) ? '取消全选该分组' : '全选该分组'"
                :aria-disabled="section.tasks.length === 0"
                @click.stop="toggleTaskGroupSectionBatchSelection(section)"
              >
                <TaskCheckbox
                  :checked="isTaskGroupSectionBatchAllSelected(section)"
                  :size="16"
                />
              </span>
              <span>{{ section.label }}</span>
            </span>
            <div class="task-group-section-header-actions">
              <span class="task-group-section-count">{{ section.tasks.length }}</span>
              <button
                type="button"
                class="task-group-section-toggle"
                :class="{ collapsed: isTaskGroupSectionCollapsed(section.key) }"
                :title="isTaskGroupSectionCollapsed(section.key) ? '展开分组' : '折叠分组'"
                :aria-label="isTaskGroupSectionCollapsed(section.key) ? '展开分组' : '折叠分组'"
                @click.stop="toggleTaskGroupSectionCollapse(section.key)"
              >
                <Icon name="chevronRight" width="14" height="14" />
              </button>
            </div>
          </header>
          <div v-if="!isTaskGroupSectionCollapsed(section.key)" class="task-group-section-body">
            <div
              v-for="task in section.tasks"
              :key="task.id"
              class="task-batch-item"
              :class="{
                selected: isTaskBatchSelected(task.id),
                'is-batch-mode': isBatchEditMode,
                'mobile-calendar-drag-source': shouldEnableMobileCalendarDrag(),
                'mobile-calendar-dragging': mobileCalendarDraggingTaskId === task.id
              }"
              @pointerdown="handleMobileTaskPointerDown($event, task)"
              @pointermove="handleMobileTaskPointerMove"
              @pointerup="handleMobileTaskPointerUp"
              @pointercancel="handleMobileTaskPointerCancel"
            >
              <TaskCard
                :data-task-id="task.id"
                :task="task"
                :completed="task.status === 'completed'"
                variant="sidebar"
                :task-groups="taskGroups"
                :show-status-badge="true"
                :draggable="!isMobileFrontend && !isBatchEditMode"
                :expanded="expandedSubtasks.has(task.id) || expandedDescriptions.has(task.id)"
                :description-editing="inlineEditingDescriptionTaskId === task.id"
                :description-draft="getInlineDescriptionDraft(task)"
                :show-description="shouldShowTaskCardDetails"
                :show-badges="shouldShowTaskCardDetails"
                :show-subtasks="expandedSubtasks.has(task.id)"
                :title-tooltip="isBatchEditMode ? '点击选择任务' : '点击编辑任务'"
                :disable-context-menu="shouldEnableMobileCalendarDrag()"
                :ref="(el) => setTaskRowRef(task.id, el)"
                @card-click="handleTaskCardClick"
                @open-click="handleTaskCardOpenClick"
                @start-focus="handleTaskCardStartFocus"
                @toggle-status="handleTaskCardToggleStatus"
                @toggle-expand="handleCardToggleExpand"
                @description-start-edit="startInlineDescriptionEdit"
                @description-input="handleInlineDescriptionInput"
                @description-save="saveInlineDescriptionEdit"
                @description-cancel="cancelInlineDescriptionEdit"
                @subtask-toggle="handleCardSubtaskToggle"
                @dragstart="handleDragStart"
              />
            </div>
          </div>
        </section>
      </div>
      <div
        v-else
        class="task-virtual-spacer"
        :style="taskVirtualSpacerStyle"
      >
        <div
          v-for="task in virtualDisplayedTasks"
          :key="task.id"
          class="task-batch-item"
          :class="{
            selected: isTaskBatchSelected(task.id),
            'is-batch-mode': isBatchEditMode,
            'mobile-calendar-drag-source': shouldEnableMobileCalendarDrag(),
            'mobile-calendar-dragging': mobileCalendarDraggingTaskId === task.id
          }"
          @pointerdown="handleMobileTaskPointerDown($event, task)"
          @pointermove="handleMobileTaskPointerMove"
          @pointerup="handleMobileTaskPointerUp"
          @pointercancel="handleMobileTaskPointerCancel"
        >
          <TaskCard
            :data-task-id="task.id"
            :task="task"
            :completed="task.status === 'completed'"
            variant="sidebar"
            :task-groups="taskGroups"
            :show-status-badge="true"
            :draggable="!isMobileFrontend && !isBatchEditMode"
            :expanded="expandedSubtasks.has(task.id) || expandedDescriptions.has(task.id)"
            :description-editing="inlineEditingDescriptionTaskId === task.id"
            :description-draft="getInlineDescriptionDraft(task)"
            :show-description="shouldShowTaskCardDetails"
            :show-badges="shouldShowTaskCardDetails"
              :show-subtasks="expandedSubtasks.has(task.id)"
              :title-tooltip="isBatchEditMode ? '点击选择任务' : '点击编辑任务'"
              :disable-context-menu="shouldEnableMobileCalendarDrag()"
                :ref="(el) => setTaskRowRef(task.id, el)"
                @card-click="handleTaskCardClick"
                @open-click="handleTaskCardOpenClick"
                @start-focus="handleTaskCardStartFocus"
                @toggle-status="handleTaskCardToggleStatus"
                @toggle-expand="handleCardToggleExpand"
                @description-start-edit="startInlineDescriptionEdit"
                @description-input="handleInlineDescriptionInput"
                @description-save="saveInlineDescriptionEdit"
                @description-cancel="cancelInlineDescriptionEdit"
                @subtask-toggle="handleCardSubtaskToggle"
                @dragstart="handleDragStart"
              />
        </div>
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
        presentation="center"
        @close="showTaskModal = false"
        @manage-groups="openTaskGroupDialog"
        @submit="handleCreateTask"
      />
    </Teleport>
    <TaskScopeDialog
      :show="showTaskScopeDialog"
      :notebooks="notebooks"
      :excluded-notebook-ids="excludedNotebookIds"
      :show-scope-tab="true"
      :show-completed-tasks="showCompletedTasks"
      :auto-recognize-task-date="autoRecognizeTaskDate"
      :global-date-recognizing="isGlobalDateRecognitionRunning"
      :task-completion-sound-enabled="taskCompletionSoundEnabled"
      :show-document-group-notebook-path="showDocumentGroupNotebookPath"
      :show-extra="false"
      :lock-close="requiresScopeInitialization"
      :title="requiresScopeInitialization ? '初始化任务范围' : '任务范围'"
      :hint="requiresScopeInitialization
        ? '首次使用请先设置任务抓取范围。开关关闭表示排除该笔记本，开关开启表示参与任务抓取。'
        : '开关关闭后将排除该笔记本，任务列表和看板不再抓取它的任务。'"
      :confirm-text="requiresScopeInitialization ? '开始使用' : '保存'"
      :document-groups="documentGroups"
      :document-group-documents="documentGroupDialogDocuments"
      :goals="goalDefinitions"
      :goal-documents="goalDocuments"
      @close="showTaskScopeDialog = false"
      @global-recognize-date="handleGlobalRecognizeTaskDates"
      @save="handleTaskScopeSave"
    />
    <TaskDateQuickMenu
      :show="taskQuickDateMenu.show"
      :x="taskQuickDateMenu.x"
      :y="taskQuickDateMenu.y"
      :start-date="taskQuickDateDraft.startDate"
      :start-time="taskQuickDateDraft.startTime"
      :due-date="taskQuickDateDraft.dueDate"
      :due-time="taskQuickDateDraft.dueTime"
      title="日期"
      save-label="保存日期"
      @update:startDate="taskQuickDateDraft.startDate = $event"
      @update:startTime="taskQuickDateDraft.startTime = $event"
      @update:dueDate="taskQuickDateDraft.dueDate = $event"
      @update:dueTime="taskQuickDateDraft.dueTime = $event"
      @save="handleTaskQuickDateSave"
    />
    <TaskGroupDialog
      :show="showTaskGroupDialog"
      :groups="taskGroups"
      :include-none-option="true"
      :order-ids="userSettings.kanban.kanbanGroupColumnOrder"
      @close="showTaskGroupDialog = false"
      @save="handleTaskGroupSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { Protyle, getFrontend, showMessage } from 'siyuan';
import SyButton from '@/components/SiyuanTheme/SyButton.vue';
import SySelect from '@/components/SiyuanTheme/SySelect.vue';
import TaskCard from '@/components/TaskCard.vue';
import TaskCheckbox from '@/components/TaskCheckbox.vue';
import TaskModal, { type Notebook, type Document as TaskDocument } from '@/components/TaskModal.vue';
import TaskScopeDialog, { type TaskScopeDialogSavePayload } from '@/components/TaskScopeDialog.vue';
import TaskGroupDialog from '@/components/TaskGroupDialog.vue';
import TaskFilterPopover from '@/components/TaskFilterPopover.vue';
import Icon from '@/components/Icon.vue';
import TaskEditorMetaPanel from '@/components/TaskEditorMetaPanel.vue';
import TaskEditorPanelShell from '@/components/TaskEditorPanelShell.vue';
import PriorityPopover from '@/components/PriorityPopover.vue';
import TaskDateQuickMenu from '@/components/TaskDateQuickMenu.vue';
import { TaskRepository, Task, TaskGroup, buildTaskStatusAttrs, lsNotebooks, createDocWithMd, getIDsByHPath, setBlockAttrs, getBlockDOM, sql, openBlockById, loadTaskGroups, saveTaskGroups, resolveTaskRepeatMaterializeOptions, type TaskQueryScope } from '@/api';
import { syncTaskStatusAttrsIfNeeded, updateTaskMarkdown, skipTaskTemporarily } from '@/utils/taskHelpers';
import { openKanbanView, usePlugin } from '@/main';
import { useUserSettings } from '@/composables/useUserSettings';
import { useGoals } from '@/composables/useGoals';
import { useTaskFilters } from '@/composables/useTaskFilters';
import { useTaskFilterState } from '@/composables/useTaskFilterState';
import { resolveGroupColorCss, resolveGroupTextColor } from '@/utils/groupColor';
import { eventBus, Events } from '@/utils/eventBus';
import { createTaskFocusTarget } from '@/utils/focusTimerTarget';
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
import { playTaskCompletionSound } from '@/utils/completionSound';
import {
  applyRepeatRuleOptimisticToTasks,
  getDocumentCreationSortKey,
  normalizeNotebookIds,
  type RepeatRulePayload
} from '@/utils/taskViewShared';
import {
  buildLiveTaskDomOrderMap,
  compareTaskCreatedAtDesc,
  compareTaskDocumentSortKey
} from '@/utils/taskSortShared';
import { rebuildAffectedRepeatTasks } from '@/repeatRepository';
import {
  loadDocumentGroups,
  saveDocumentGroups,
  type DocumentGroup,
  type DocumentGroupMember
} from '@/documentGroupRepository';
import {
  buildGoalDocumentSource,
  buildGroupDocumentSource,
  buildNotebookDocumentSource,
  parseDocumentSource
} from '@/utils/documentGroupSource';
import {
  getTaskHeadingGroupMeta,
  resolveTaskHeadingGroups,
  type TaskHeadingGroupMeta
} from '@/utils/taskGrouping';

interface MobileCalendarDragEventPayload {
  task: Task;
  clientX: number;
  clientY: number;
}

interface MobileCalendarPointerGesture {
  task: Task;
  pointerId: number;
  startX: number;
  startY: number;
  latestX: number;
  latestY: number;
  timerId: number | null;
  started: boolean;
  captureElement: HTMLElement | null;
}

const props = withDefaults(defineProps<{
  enableMobileCalendarDrag?: boolean;
}>(), {
  enableMobileCalendarDrag: false
});

const emit = defineEmits<{
  mobileCalendarDragStart: [payload: MobileCalendarDragEventPayload];
  mobileCalendarDragMove: [payload: MobileCalendarDragEventPayload];
  mobileCalendarDragEnd: [payload: MobileCalendarDragEventPayload];
  mobileCalendarDragCancel: [];
  startFocus: [task: Task];
}>();

const { data: userSettings, loadSettings, updateSettings } = useUserSettings();
const { goalDefinitions, goalDocuments, goalItems, goalsLoading, saveGoalDefinitions } = useGoals();
const autoRecognizeTaskDate = computed(() => userSettings.taskManager.autoRecognizeTaskDate === true);
const taskCompletionSoundEnabled = computed(() => userSettings.taskManager.taskCompletionSoundEnabled !== false);
const showDocumentGroupNotebookPath = computed(() => userSettings.taskManager.showDocumentGroupNotebookPath !== false);
const FLOATING_FOCUS_STORAGE_KEY = 'pinch-floating-focus-enabled';
let repeatReconcileRequestId = 0;

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
const MOBILE_CALENDAR_DRAG_LONG_PRESS_MS = 280;
const MOBILE_CALENDAR_DRAG_MOVE_THRESHOLD_PX = 18;
const loading = ref(false);
const isRefreshButtonSpinning = ref(false);
const showTaskModal = ref(false);
const showTaskScopeDialog = ref(false);
const isGlobalDateRecognitionRunning = ref(false);
const showTaskGroupDialog = ref(false);
const requiresScopeInitialization = ref(false);
const excludedNotebookIds = ref<string[]>([]);
const showCompletedTasks = ref(true);
const lastTaskNotebook = ref<string>('');
const lastTaskDocument = ref<string>('');
const expandedSubtasks = ref(new Set<string>());
const expandedDescriptions = ref(new Set<string>());
const documentGroups = ref<DocumentGroup[]>([]);
const mobileCalendarPointerGesture = ref<MobileCalendarPointerGesture | null>(null);
const mobileCalendarDraggingTaskId = ref<string | null>(null);
const suppressedTaskCardClicks = new Map<string, number>();
interface TaskEditDraft {
  taskId: string;
  status: Task['status'];
  priority: Task['priority'];
  pinned: boolean;
  startDate: string;
  startTime: string;
  dueDate: string;
  dueTime: string;
  description: string;
  reminderType?: TaskReminderType;
  reminderCustomTime: string;
  groupId: string;
}
type TaskEditorDateFields = Pick<TaskEditDraft, 'startDate' | 'startTime' | 'dueDate' | 'dueTime'>;
type TaskDueFilterKey = 'overdue' | 'today' | 'next7Days' | 'noDueDate';
type TaskUpdateFilterKey = 'today' | 'thisWeek' | 'thisMonth';
type TaskExtraFilterKey = 'hasDescription' | 'hasSubtasks';
type TaskListViewMode = 'kanban' | 'list';
type TaskListGroupMode = 'none' | 'status' | 'group' | 'heading' | 'date';
interface TaskGroupedSection {
  key: string;
  label: string;
  tasks: Task[];
  order: number;
}
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
const taskGroupMenuControlRef = ref<HTMLElement | null>(null);
const taskFilterPopoverRef = ref<InstanceType<typeof TaskFilterPopover> | null>(null);
const taskFilterPopoverStyle = ref<Record<string, string>>({});
const taskSearchInputRef = ref<HTMLInputElement | null>(null);
const taskGroupMenuVisible = ref(false);
const taskSearchVisible = ref(false);
const taskSearchQuery = ref('');
const taskListViewMode = ref<TaskListViewMode>('kanban');
const taskListGroupBy = ref<TaskListGroupMode>('none');
const taskHeadingGroups = ref<Map<string, TaskHeadingGroupMeta>>(new Map());
let taskEditorProtyle: Protyle | null = null;
const openingTaskPopoverBlockIds = new Set<string>();
const taskEditorSidebarVisible = ref(false);
const taskEditorSidebarTitle = ref('编辑任务');
const taskEditorSidebarMountRef = ref<HTMLElement | null>(null);
const taskEditorPriorityPopover = ref<{ position: { x: number; y: number } } | null>(null);
const taskEditorQuickPanel = ref<'due' | 'description' | 'group' | 'reminder' | 'status' | null>(null);
const showTaskMoveDialog = ref(false);
const isTaskMoveSubmitting = ref(false);
const taskMoveSelectedNotebook = ref('');
const taskMoveSelectedDocument = ref('');
const taskFilterPopoverVisible = ref(false);
const taskGroups = ref<TaskGroup[]>([]);
const visibleTaskGroups = computed(() =>
  taskGroups.value.filter(group => group.hidden !== true)
);
const visibleTaskGroupIdSet = computed(() => new Set(visibleTaskGroups.value.map(group => group.id)));
const taskGroupNameMap = computed(() => new Map(taskGroups.value.map(group => [group.id, group.name || ''])));
const lastSelectedTaskGroupId = ref<string>('');
const showTaskCardDetails = ref(true);
const collapsedTaskGroupSectionKeys = ref<Set<string>>(new Set());
const isBatchEditMode = ref(false);
const batchSelectedTaskIds = ref<Set<string>>(new Set());
const batchEditStatus = ref<string>('');
const batchEditPriority = ref<string>('');
const batchEditGroupId = ref<string>('');
const isBatchApplying = ref(false);
const taskQuickDateMenu = ref<{ show: boolean; x: number; y: number; task: Task | null }>({
  show: false,
  x: 0,
  y: 0,
  task: null
});
const taskQuickDateDraft = ref<{ startDate: string; startTime: string; dueDate: string; dueTime: string }>({
  startDate: '',
  startTime: '',
  dueDate: '',
  dueTime: ''
});
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
let taskHeadingGroupRequestId = 0;

const TASK_GROUP_NONE_ID = '__none__';
const defaultGroupChipColor = '#9aa0a6';
interface TaskGroupDialogSavePayload {
  groups: TaskGroup[];
  orderIds: string[];
}

function normalizeTaskGroupDialogOrderIds(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }
  const seen = new Set<string>();
  const normalized: string[] = [];
  input.forEach((item) => {
    if (typeof item !== 'string') {
      return;
    }
    const value = item.trim();
    if (!value || seen.has(value)) {
      return;
    }
    seen.add(value);
    normalized.push(value);
  });
  return normalized;
}

let skipCleanupTimer: number | null = null;
const taskListViewOptions: Array<{ value: TaskListViewMode; label: string }> = [
  { value: 'kanban', label: '看板视图' },
  { value: 'list', label: '列表视图' }
];
const taskListGroupOptions: Array<{ value: TaskListGroupMode; label: string }> = [
  { value: 'none', label: '不分组' },
  { value: 'status', label: '按状态分组' },
  { value: 'date', label: '按日期分组' },
  { value: 'group', label: '按标签分组' },
  { value: 'heading', label: '按标题分组' }
];
const batchEditStatusOptions: Array<{ value: string; text: string }> = [
  { value: '', text: '状态（不修改）' },
  { value: 'pending', text: '待处理' },
  { value: 'in-progress', text: '进行中' },
  { value: 'delayed', text: '延迟' },
  { value: 'completed', text: '已完成' },
  { value: 'cancelled', text: '已取消' }
];
const batchEditPriorityOptions: Array<{ value: string; text: string }> = [
  { value: '', text: '优先级（不修改）' },
  { value: 'none', text: '无' },
  { value: 'low', text: '低' },
  { value: 'medium', text: '中' },
  { value: 'high', text: '高' }
];
const taskGroupStatusOrder: Task['status'][] = ['pending', 'in-progress', 'delayed', 'completed', 'cancelled'];
const taskGroupStatusLabel: Record<Task['status'], string> = {
  'pending': '待处理',
  'in-progress': '进行中',
  'delayed': '延迟',
  'completed': '已完成',
  'cancelled': '已取消'
};

const taskModalTeleportTo = computed(() => taskModalTeleportTarget.value || 'body');
const activeTaskEditTask = computed(() =>
  taskEditMenuTaskId.value
    ? (tasks.value.find(task => task.id === taskEditMenuTaskId.value) || null)
    : null
);
const isActiveTaskPinned = computed(() => activeTaskEditTask.value?.pinned === true);
const isActiveTaskArchived = computed(() => activeTaskEditTask.value?.archived === true);
const activeTaskEditDraft = computed(() =>
  taskEditMenuTaskId.value && taskEditDraft.value?.taskId === taskEditMenuTaskId.value
    ? taskEditDraft.value
    : null
);
const batchSelectedCount = computed(() => batchSelectedTaskIds.value.size);
const allVisibleTasksSelected = computed(() => {
  const currentTasks = displayedTasks.value;
  if (currentTasks.length === 0) {
    return false;
  }
  return currentTasks.every(task => batchSelectedTaskIds.value.has(task.id));
});
const batchEditGroupOptions = computed(() => [
  { value: '', text: '标签（不修改）' },
  { value: TASK_GROUP_NONE_ID, text: '无标签' },
  ...visibleTaskGroups.value.map(group => ({
    value: group.id,
    text: group.name || '未命名标签'
  }))
]);
const canApplyBatchEdit = computed(() => {
  if (isBatchApplying.value || batchSelectedCount.value === 0) {
    return false;
  }
  if (batchEditStatus.value) {
    return true;
  }
  if (batchEditPriority.value) {
    return true;
  }
  return batchEditGroupId.value.trim().length > 0;
});

function isBatchStatus(value: string): value is Task['status'] {
  return value === 'pending'
    || value === 'in-progress'
    || value === 'delayed'
    || value === 'completed'
    || value === 'cancelled';
}

function isBatchPriority(value: string): value is Task['priority'] {
  return value === 'none'
    || value === 'low'
    || value === 'medium'
    || value === 'high';
}

function resetBatchEditInputs(): void {
  batchEditStatus.value = '';
  batchEditPriority.value = '';
  batchEditGroupId.value = '';
}

function clearBatchSelection(): void {
  batchSelectedTaskIds.value = new Set();
}

function exitBatchEditMode(): void {
  isBatchEditMode.value = false;
  clearBatchSelection();
  resetBatchEditInputs();
}

function toggleBatchEditMode(): void {
  if (isBatchEditMode.value) {
    exitBatchEditMode();
    return;
  }
  closeTaskEditMenu();
  closeTaskEditorSidebar();
  taskEditorPriorityPopover.value = null;
  taskEditorQuickPanel.value = null;
  isBatchEditMode.value = true;
}

function isTaskBatchSelected(taskId: string): boolean {
  return batchSelectedTaskIds.value.has(taskId);
}

function toggleTaskBatchSelection(taskId: string): void {
  if (!isBatchEditMode.value) {
    return;
  }
  const normalizedTaskId = typeof taskId === 'string' ? taskId : '';
  if (!normalizedTaskId) {
    return;
  }
  const next = new Set(batchSelectedTaskIds.value);
  if (next.has(normalizedTaskId)) {
    next.delete(normalizedTaskId);
  } else {
    next.add(normalizedTaskId);
  }
  batchSelectedTaskIds.value = next;
}

function toggleSelectAllVisibleTasks(): void {
  if (!isBatchEditMode.value) {
    return;
  }
  const visibleIds = displayedTasks.value.map(task => task.id);
  if (visibleIds.length === 0) {
    return;
  }
  if (allVisibleTasksSelected.value) {
    const visibleIdSet = new Set(visibleIds);
    const next = new Set(
      Array.from(batchSelectedTaskIds.value).filter(taskId => !visibleIdSet.has(taskId))
    );
    batchSelectedTaskIds.value = next;
    return;
  }
  const next = new Set(batchSelectedTaskIds.value);
  visibleIds.forEach(taskId => next.add(taskId));
  batchSelectedTaskIds.value = next;
}

function getTaskGroupSectionTaskIds(section: TaskGroupedSection): string[] {
  if (!section || !Array.isArray(section.tasks)) {
    return [];
  }
  return section.tasks
    .map(task => (typeof task.id === 'string' ? task.id : ''))
    .filter(Boolean);
}

function isTaskGroupSectionBatchAllSelected(section: TaskGroupedSection): boolean {
  const taskIds = getTaskGroupSectionTaskIds(section);
  if (taskIds.length === 0) {
    return false;
  }
  return taskIds.every(taskId => batchSelectedTaskIds.value.has(taskId));
}

function isTaskGroupSectionBatchPartiallySelected(section: TaskGroupedSection): boolean {
  const taskIds = getTaskGroupSectionTaskIds(section);
  if (taskIds.length === 0) {
    return false;
  }
  let selectedCount = 0;
  taskIds.forEach(taskId => {
    if (batchSelectedTaskIds.value.has(taskId)) {
      selectedCount += 1;
    }
  });
  return selectedCount > 0 && selectedCount < taskIds.length;
}

function toggleTaskGroupSectionBatchSelection(section: TaskGroupedSection): void {
  if (!isBatchEditMode.value) {
    return;
  }
  const taskIds = getTaskGroupSectionTaskIds(section);
  if (taskIds.length === 0) {
    return;
  }
  const next = new Set(batchSelectedTaskIds.value);
  const allSelected = taskIds.every(taskId => next.has(taskId));
  if (allSelected) {
    taskIds.forEach(taskId => next.delete(taskId));
  } else {
    taskIds.forEach(taskId => next.add(taskId));
  }
  batchSelectedTaskIds.value = next;
}

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

function applyExternalDocumentGroups(groups: DocumentGroup[]): void {
  documentGroups.value = sortDocumentGroups((groups || []).map(group => ({
    ...group,
    members: Array.isArray(group.members) ? group.members.map(member => ({ ...member })) : []
  })));
  normalizeDocumentSelection(filterNotebook.value);
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

async function handleTaskGroupSave(payload: TaskGroupDialogSavePayload): Promise<void> {
  const groups = Array.isArray(payload?.groups) ? payload.groups : [];
  const orderIds = normalizeTaskGroupDialogOrderIds(payload?.orderIds);
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
  if (saved) {
    try {
      await updateSettings('kanban', { kanbanGroupColumnOrder: orderIds });
    } catch {
    }
  }
  if (saved && removedGroupIds.length > 0) {
    await clearRemovedGroupAssignments(removedGroupIds);
    const removedSet = new Set(removedGroupIds);
    activeTaskGroupFilters.value = activeTaskGroupFilters.value.filter(id => !removedSet.has(id));
  }
  if (activeTaskGroupFilters.value.length > 0) {
    const visibleGroupIdSet = new Set(taskGroups.value.filter(group => group.hidden !== true).map(group => group.id));
    activeTaskGroupFilters.value = activeTaskGroupFilters.value.filter(
      id => id === TASK_GROUP_NONE_ID || visibleGroupIdSet.has(id)
    );
  }
  if (lastSelectedTaskGroupId.value) {
    const exists = visibleTaskGroupIdSet.value.has(lastSelectedTaskGroupId.value);
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
    const groupIdSet = new Set(nextGroups.filter(group => group.hidden !== true).map(group => group.id));
    activeTaskGroupFilters.value = activeTaskGroupFilters.value.filter(
      id => id === TASK_GROUP_NONE_ID || groupIdSet.has(id)
    );
  }
  if (lastSelectedTaskGroupId.value) {
    const exists = nextGroups.some(group => group.id === lastSelectedTaskGroupId.value && group.hidden !== true);
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

function closeTaskGroupMenu(): void {
  taskGroupMenuVisible.value = false;
}

function closeTaskSearch(): void {
  taskSearchVisible.value = false;
  taskSearchQuery.value = '';
}

function toggleTaskSearch(): void {
  closeTaskFilterPopover();
  closeTaskGroupMenu();
  if (taskSearchVisible.value) {
    closeTaskSearch();
    return;
  }
  taskSearchVisible.value = true;
  void nextTick(() => {
    taskSearchInputRef.value?.focus();
    taskSearchInputRef.value?.select();
  });
}

function toggleTaskFilterPopover(): void {
  closeTaskGroupMenu();
  taskFilterPopoverVisible.value = !taskFilterPopoverVisible.value;
  if (taskFilterPopoverVisible.value) {
    void nextTick(updateTaskFilterPopoverPosition);
  }
}

function toggleTaskGroupMenu(): void {
  closeTaskFilterPopover();
  taskGroupMenuVisible.value = !taskGroupMenuVisible.value;
}

function selectTaskListViewMode(mode: TaskListViewMode): void {
  if (taskListViewMode.value === mode) {
    closeTaskGroupMenu();
    return;
  }
  taskListViewMode.value = mode;
  closeTaskGroupMenu();
}

function selectTaskListGroup(mode: TaskListGroupMode): void {
  if (taskListGroupBy.value === mode) {
    closeTaskGroupMenu();
    return;
  }
  taskListGroupBy.value = mode;
  closeTaskGroupMenu();
}

function toggleBatchEditModeFromMenu(): void {
  toggleBatchEditMode();
  closeTaskGroupMenu();
}

function openTaskGroupDialogFromMenu(): void {
  closeTaskGroupMenu();
  openTaskGroupDialog();
}

async function toggleHideCompletedTasksFromMenu(): Promise<void> {
  const nextShowCompletedTasks = !showCompletedTasks.value;
  showCompletedTasks.value = nextShowCompletedTasks;
  if (!nextShowCompletedTasks) {
    showAllCompletedTasks.value = false;
  }
  closeTaskGroupMenu();
  await updateSettings('taskManager', {
    showCompletedTasks: nextShowCompletedTasks
  });
  await refreshTasks(true, {
    showLoading: false,
    compareExisting: false,
    source: 'toggle-hide-completed'
  });
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

type TaskArchiveViewMode = 'active' | 'archived' | 'all';

function normalizeTaskListGroupMode(value: unknown): TaskListGroupMode {
  if (value === 'status' || value === 'group' || value === 'heading' || value === 'date' || value === 'none') {
    return value;
  }
  return 'none';
}

function normalizeTaskListViewMode(value: unknown): TaskListViewMode {
  return value === 'list' ? 'list' : 'kanban';
}

function normalizeTaskCardDetailsVisible(value: unknown): boolean {
  return value !== false;
}

const filterNotebook = ref<string>('all');
const filterDocument = ref<string>('all');
const archiveViewMode = ref<TaskArchiveViewMode>('active');

function sortDocumentGroups(groups: DocumentGroup[]): DocumentGroup[] {
  return [...groups].sort((a, b) => {
    const orderA = typeof a.order === 'number' ? a.order : Number.MAX_SAFE_INTEGER;
    const orderB = typeof b.order === 'number' ? b.order : Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.name.localeCompare(b.name, 'zh-CN');
  });
}

function resolveDocumentEntryName(document: Pick<TaskDocument, 'id' | 'name' | 'path'>): string {
  if (typeof document.name === 'string' && document.name.trim().length > 0) {
    return document.name.trim();
  }
  if (typeof document.path === 'string' && document.path.trim().length > 0) {
    return document.path.trim().split('/').pop() || document.path.trim();
  }
  return document.id;
}

const taskModalDefaultNotebook = computed(() => {
  const selectedDocument = sourceDocuments.value.find(doc => doc.id === filterDocument.value);
  if (selectedDocument) {
    return selectedDocument.notebookId;
  }
  if (parsedFilterSource.value.kind === 'notebook') {
    return parsedFilterSource.value.id;
  }
  if (parsedFilterSource.value.kind === 'group' || parsedFilterSource.value.kind === 'goal') {
    return sourceDocuments.value[0]?.notebookId || lastTaskNotebook.value || '';
  }
  return lastTaskNotebook.value || '';
});

const taskModalDefaultDocument = computed(() => {
  if (filterDocument.value !== 'all') {
    return filterDocument.value;
  }
  if (parsedFilterSource.value.kind === 'group' || parsedFilterSource.value.kind === 'goal') {
    return sourceDocuments.value[0]?.id || lastTaskDocument.value || '';
  }
  return lastTaskDocument.value || '';
});
let filterSettingsUpdateTimer: number | null = null;
let taskPopoverFilterSettingsUpdateTimer: number | null = null;
let taskListGroupSettingsUpdateTimer: number | null = null;

const enabledNotebooks = computed(() => {
  const excludedIdSet = new Set(excludedNotebookIds.value);
  return notebooks.value.filter(notebook => !excludedIdSet.has(notebook.id));
});

const enabledNotebookNameById = computed(() =>
  new Map(enabledNotebooks.value.map(notebook => [notebook.id, notebook.name]))
);

const documentGroupsById = computed(() =>
  new Map(sortDocumentGroups(documentGroups.value).map(group => [group.id, group]))
);

const goalDefinitionsById = computed(() =>
  new Map(goalDefinitions.value.map(goal => [goal.id, goal]))
);
const activeGoalItems = computed(() =>
  goalItems.value.filter(goal => goal.status !== 'completed')
);
const activeGoalIds = computed(() =>
  new Set(activeGoalItems.value.map(goal => goal.id))
);

const parsedFilterSource = computed(() => parseDocumentSource(filterNotebook.value));

const notebookOptions = computed(() => {
  return [
    { value: 'all', text: t('taskManager.all') },
    ...enabledNotebooks.value.map(nb => ({
      value: buildNotebookDocumentSource(nb.id),
      text: nb.name
    })),
    ...sortDocumentGroups(documentGroups.value).map(group => ({
      value: buildGroupDocumentSource(group.id),
      text: `🏷 ${group.name}`
    })),
    ...activeGoalItems.value.map(goal => ({
      value: buildGoalDocumentSource(goal.id),
      text: `${goal.emoji || '🎯'} ${goal.name || '未命名目标'}`
    }))
  ];
});

const taskMoveNotebookOptions = computed(() => {
  return notebooks.value.map(nb => ({ value: nb.id, text: nb.name }));
});

const taskMoveDocuments = computed(() => {
  const notebookId = taskMoveSelectedNotebook.value;
  if (!notebookId) {
    return [] as TaskDocument[];
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
  visibleTaskGroups.value.forEach(group => {
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
  const exists = visibleTaskGroupIdSet.value.has(candidate);
  return exists ? candidate : '';
});

const toggleTaskListCollapsed = () => {
  isTaskListCollapsed.value = !isTaskListCollapsed.value;
};

let lastRefreshTime = 0;

let eventUnsubscribers: Array<() => void> = [];
const processingBlockIds = new Set<string>();
let fallbackRefreshTimer: number | null = null;
const MAX_INCREMENTAL_BLOCKS_PER_FLUSH = 120;
const INCREMENTAL_QUEUE_DELAY_MS = 8;
const IMMEDIATE_FALLBACK_DELAY_MS = 80;
const TASK_ADDED_VERIFY_DELAY_MS = 90;
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
const taskDocumentsByNotebook = ref<Map<string, TaskDocument[]>>(new Map());

// === Notebook/document option derivation and persisted filter selection ===
const allDocuments = computed(() => {
  return Array.from(taskDocumentsByNotebook.value.values()).flat();
});

const allDocumentsByKey = computed(() => {
  const nextMap = new Map<string, TaskDocument>();
  allDocuments.value.forEach((document) => {
    nextMap.set(`${document.notebookId}:${document.id}`, document);
  });
  return nextMap;
});

function getDocumentsForActiveSource(sourceValue: string): TaskDocument[] {
  const parsed = parseDocumentSource(sourceValue);
  if (parsed.kind === 'all') {
    return [];
  }

  if (parsed.kind === 'notebook') {
    return [...(taskDocumentsByNotebook.value.get(parsed.id) || [])];
  }

  const sourceMembers: DocumentGroupMember[] =
    parsed.kind === 'group'
      ? (documentGroupsById.value.get(parsed.id)?.members || [])
      : parsed.kind === 'goal'
        ? (goalDefinitionsById.value.get(parsed.id)?.members || [])
        : [];
  if (sourceMembers.length === 0) {
    return [];
  }

  const documents: TaskDocument[] = [];
  const seen = new Set<string>();
  sourceMembers.forEach((member) => {
    const key = `${member.notebookId}:${member.documentId}`;
    if (!enabledNotebookNameById.value.has(member.notebookId)) {
      return;
    }
    if (seen.has(key)) {
      return;
    }
    seen.add(key);

    const existing = allDocumentsByKey.value.get(key);
    if (existing) {
      documents.push(existing);
      return;
    }

    documents.push({
      id: member.documentId,
      name: resolveDocumentEntryName({
        id: member.documentId,
        name: member.name || '',
        path: member.path
      }),
      notebookId: member.notebookId,
      path: member.path
    });
  });

  return documents.sort((a, b) => {
    const timeDiff = getDocumentCreationSortKey(b.id) - getDocumentCreationSortKey(a.id);
    if (timeDiff !== 0) {
      return timeDiff;
    }
    const notebookNameA = enabledNotebookNameById.value.get(a.notebookId) || a.notebookId;
    const notebookNameB = enabledNotebookNameById.value.get(b.notebookId) || b.notebookId;
    const notebookDiff = notebookNameA.localeCompare(notebookNameB, 'zh-CN');
    if (notebookDiff !== 0) {
      return notebookDiff;
    }
    return resolveDocumentEntryName(a).localeCompare(resolveDocumentEntryName(b), 'zh-CN');
  });
}

const sourceDocuments = computed(() => getDocumentsForActiveSource(filterNotebook.value));

const documentGroupDialogDocuments = computed(() => {
  return [...allDocuments.value]
    .map(document => ({
      id: document.id,
      name: resolveDocumentEntryName(document),
      notebookId: document.notebookId,
      notebookName: enabledNotebookNameById.value.get(document.notebookId) || document.notebookId,
      path: document.path
    }))
    .sort((a, b) => {
      const idA = a.id || '';
      const idB = b.id || '';
      if (idA !== idB) {
        return idB.localeCompare(idA);
      }
      const notebookDiff = a.notebookName.localeCompare(b.notebookName, 'zh-CN');
      if (notebookDiff !== 0) {
        return notebookDiff;
      }
      return a.name.localeCompare(b.name, 'zh-CN');
    });
});

const documentOptions = computed(() => {
  if (parsedFilterSource.value.kind === 'all') return [];

  return [
    { value: 'all', text: t('taskManager.all') },
    ...sourceDocuments.value.map(doc => ({
      value: doc.id,
      text: parsedFilterSource.value.kind === 'group' || parsedFilterSource.value.kind === 'goal'
        ? `${resolveDocumentEntryName(doc)} · ${enabledNotebookNameById.value.get(doc.notebookId) || doc.notebookId}`
        : resolveDocumentEntryName(doc)
    }))
  ];
});

function normalizeDocumentSelection(sourceValue: string): void {
  const parsed = parseDocumentSource(sourceValue);
  if (parsed.kind === 'all') {
    if (filterDocument.value !== 'all') {
      filterDocument.value = 'all';
    }
    return;
  }

  if (parsed.kind === 'notebook' && !enabledNotebookNameById.value.has(parsed.id)) {
    filterNotebook.value = 'all';
    filterDocument.value = 'all';
    return;
  }

  if (parsed.kind === 'goal' && goalsLoading.value && !goalDefinitionsById.value.has(parsed.id)) {
    return;
  }

  if (parsed.kind === 'group' && !documentGroupsById.value.has(parsed.id)) {
    filterNotebook.value = 'all';
    filterDocument.value = 'all';
    return;
  }

  if (parsed.kind === 'goal' && !goalDefinitionsById.value.has(parsed.id)) {
    filterNotebook.value = 'all';
    filterDocument.value = 'all';
    return;
  }

  if (parsed.kind === 'goal' && !activeGoalIds.value.has(parsed.id)) {
    filterNotebook.value = 'all';
    filterDocument.value = 'all';
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

    const nextMap = new Map<string, TaskDocument[]>();
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
      const dedupById = new Map<string, TaskDocument>();
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
    const activeSource = parseDocumentSource(filterNotebook.value);
    await updateSettings('taskManager', {
      filterSource: filterNotebook.value,
      filterNotebook: activeSource.kind === 'notebook' ? activeSource.id : 'all',
      filterDocument: filterDocument.value,
      archiveViewMode: archiveViewMode.value
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

watch([goalDefinitions, goalItems, goalsLoading], () => {
  if (isHydratingFilters || goalsLoading.value) {
    return;
  }
  normalizeDocumentSelection(filterNotebook.value);
});

watch(archiveViewMode, () => {
  if (isHydratingFilters) {
    return;
  }
  if (requiresScopeInitialization.value) {
    return;
  }
  scheduleTaskScopeRefresh(100);
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
    closeTaskGroupMenu();
    closeTaskSearch();
  }
});

watch(taskListGroupBy, (mode) => {
  if (isHydratingFilters) {
    return;
  }
  scheduleTaskListGroupSettingsUpdate();
  if (mode !== 'heading') {
    taskHeadingGroups.value = new Map();
  }
});

watch([taskListViewMode, showTaskCardDetails], () => {
  if (isHydratingFilters) {
    return;
  }
  scheduleTaskListGroupSettingsUpdate();
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
const taskStatusFilterValueSet: ReadonlySet<Task['status']> = new Set(taskStatusFilterOptions.map(option => option.value));
const taskPriorityFilterValueSet: ReadonlySet<Task['priority']> = new Set(taskPriorityFilterOptions.map(option => option.value));
const taskDueFilterValueSet: ReadonlySet<TaskDueFilterKey> = new Set(taskDueFilterOptions.map(option => option.value));
const taskUpdatedFilterValueSet: ReadonlySet<TaskUpdateFilterKey> = new Set(taskUpdatedFilterOptions.map(option => option.value));
const taskExtraFilterValueSet: ReadonlySet<TaskExtraFilterKey> = new Set(taskExtraFilterOptions.map(option => option.value));

function normalizeStoredFilterValues<T extends string>(
  values: unknown,
  allowedValues: ReadonlySet<T>
): T[] {
  if (!Array.isArray(values)) {
    return [];
  }
  const seen = new Set<string>();
  const normalized: T[] = [];
  for (const item of values) {
    if (typeof item !== 'string') {
      continue;
    }
    const value = item.trim() as T;
    if (!value || !allowedValues.has(value) || seen.has(value)) {
      continue;
    }
    seen.add(value);
    normalized.push(value);
  }
  return normalized;
}

function normalizeStoredGroupFilters(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  const seen = new Set<string>();
  const validGroupIds = visibleTaskGroupIdSet.value;
  const normalized: string[] = [];
  for (const item of values) {
    if (typeof item !== 'string') {
      continue;
    }
    const value = item.trim();
    if (!value || seen.has(value)) {
      continue;
    }
    if (value !== TASK_GROUP_NONE_ID && !validGroupIds.has(value)) {
      continue;
    }
    seen.add(value);
    normalized.push(value);
  }
  return normalized;
}
const taskGroupFilterOptions = computed(() => {
  const options: Array<{ value: string; label: string; style: Record<string, string> }> = [
    { value: TASK_GROUP_NONE_ID, label: '无标签', style: {} }
  ];
  visibleTaskGroups.value.forEach(group => {
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

function restoreTaskPopoverFiltersFromSettings(): void {
  const settings = userSettings.taskManager;
  activeTaskStatusFilters.value = normalizeStoredFilterValues<Task['status']>(settings.taskStatusFilters, taskStatusFilterValueSet);
  activeTaskPriorityFilters.value = normalizeStoredFilterValues<Task['priority']>(settings.taskPriorityFilters, taskPriorityFilterValueSet);
  activeTaskDueFilters.value = normalizeStoredFilterValues<TaskDueFilterKey>(settings.taskDueFilters, taskDueFilterValueSet);
  activeTaskUpdatedFilters.value = normalizeStoredFilterValues<TaskUpdateFilterKey>(settings.taskUpdatedFilters, taskUpdatedFilterValueSet);
  activeTaskGroupFilters.value = normalizeStoredGroupFilters(settings.taskGroupFilters);
  activeTaskExtraFilters.value = normalizeStoredFilterValues<TaskExtraFilterKey>(settings.taskExtraFilters, taskExtraFilterValueSet);
}

function scheduleTaskPopoverFilterSettingsUpdate(): void {
  if (taskPopoverFilterSettingsUpdateTimer !== null) {
    clearTimeout(taskPopoverFilterSettingsUpdateTimer);
  }
  taskPopoverFilterSettingsUpdateTimer = window.setTimeout(async () => {
    await updateSettings('taskManager', {
      taskStatusFilters: [...activeTaskStatusFilters.value],
      taskPriorityFilters: [...activeTaskPriorityFilters.value],
      taskDueFilters: [...activeTaskDueFilters.value],
      taskUpdatedFilters: [...activeTaskUpdatedFilters.value],
      taskGroupFilters: [...activeTaskGroupFilters.value],
      taskExtraFilters: [...activeTaskExtraFilters.value]
    });
  }, 200);
}

function scheduleTaskListGroupSettingsUpdate(): void {
  if (taskListGroupSettingsUpdateTimer !== null) {
    clearTimeout(taskListGroupSettingsUpdateTimer);
  }
  taskListGroupSettingsUpdateTimer = window.setTimeout(async () => {
    await updateSettings('taskManager', {
      taskListGroupBy: taskListGroupBy.value,
      taskListViewMode: taskListViewMode.value,
      showTaskCardDetails: showTaskCardDetails.value
    });
  }, 200);
}

async function refreshTaskHeadingGroups(): Promise<void> {
  const requestId = ++taskHeadingGroupRequestId;
  const resolvedGroups = await resolveTaskHeadingGroups(buildHeadingGroupSourceTasks());
  if (requestId !== taskHeadingGroupRequestId) {
    return;
  }
  taskHeadingGroups.value = resolvedGroups;
}

function getTaskRepeatSeriesId(task: Task): string {
  return typeof task.repeatSeriesId === 'string' ? task.repeatSeriesId.trim() : '';
}

function buildHeadingGroupSourceTasks(): Task[] {
  const visibleTasks = displayedTasks.value;
  if (visibleTasks.length === 0) {
    return visibleTasks;
  }

  const virtualSeriesIds = new Set<string>();
  for (const task of visibleTasks) {
    if (!task.isVirtual) {
      continue;
    }
    const seriesId = getTaskRepeatSeriesId(task);
    if (seriesId) {
      virtualSeriesIds.add(seriesId);
    }
  }

  if (virtualSeriesIds.size === 0) {
    return visibleTasks;
  }

  const candidates = new Map<string, Task>();
  for (const task of visibleTasks) {
    candidates.set(task.id, task);
  }

  for (const task of tasks.value) {
    if (task.isVirtual) {
      continue;
    }
    if (task.type !== 'block') {
      continue;
    }
    const seriesId = getTaskRepeatSeriesId(task);
    if (!seriesId || !virtualSeriesIds.has(seriesId)) {
      continue;
    }
    candidates.set(task.id, task);
  }

  return Array.from(candidates.values());
}

watch(
  [
    activeTaskStatusFilters,
    activeTaskPriorityFilters,
    activeTaskDueFilters,
    activeTaskUpdatedFilters,
    activeTaskGroupFilters,
    activeTaskExtraFilters
  ],
  () => {
    if (isHydratingFilters) {
      return;
    }
    scheduleTaskPopoverFilterSettingsUpdate();
  }
);

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

const taskFilterNotebookId = computed(() =>
  parsedFilterSource.value.kind === 'notebook' ? parsedFilterSource.value.id : 'all'
);

const taskFilterDocumentId = computed(() =>
  filterDocument.value !== 'all' ? filterDocument.value : 'all'
);

const taskFilters = {
  notebook: taskFilterNotebookId,
  document: taskFilterDocumentId,
  archiveMode: archiveViewMode
};

let lastLoadedScope: TaskQueryScope | null = null;

function normalizeScope(scope?: TaskQueryScope) {
  return {
    includeCompleted: scope?.includeCompleted !== false,
    includeArchived: scope?.archivedOnly ? true : scope?.includeArchived === true,
    archivedOnly: scope?.archivedOnly === true,
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
  if (datasetScope.archivedOnly && !targetScope.archivedOnly) {
    return false;
  }
  if (!datasetScope.archivedOnly && !datasetScope.includeArchived && targetScope.archivedOnly) {
    return false;
  }
  if (!datasetScope.archivedOnly && !datasetScope.includeArchived && targetScope.includeArchived) {
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
  const mode = archiveViewMode.value;
  const includeArchived = mode === 'all';
  const archivedOnly = mode === 'archived';
  const includeCompleted = mode === 'active' ? showCompletedTasks.value : true;
  const activeSource = parsedFilterSource.value;
  if (activeSource.kind === 'all' && filterDocument.value === 'all' && includeCompleted && !includeArchived && !archivedOnly) {
    return undefined;
  }

  const scope: TaskQueryScope = {
    includeCompleted
  };
  if (includeArchived) {
    scope.includeArchived = true;
  }
  if (archivedOnly) {
    scope.archivedOnly = true;
  }
  if (activeSource.kind === 'notebook') {
    scope.notebookId = activeSource.id;
  }
  if (filterDocument.value !== 'all') {
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

function normalizeTimeInputValue(value: string): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) {
    return '';
  }
  return /^\d{2}:\d{2}$/.test(text) ? text : '';
}

function closeTaskQuickDateMenu(): void {
  taskQuickDateMenu.value = {
    show: false,
    x: 0,
    y: 0,
    task: null
  };
  taskQuickDateDraft.value = {
    startDate: '',
    startTime: '',
    dueDate: '',
    dueTime: ''
  };
}

function seedTaskQuickDateDraft(task: Task): void {
  const normalizedStartDate = normalizeDateInputValue((task.startDate || '').toString());
  const normalizedDueDate = normalizeDateInputValue((task.dueDate || '').toString());
  const normalizedStartTime = normalizeTimeInputValue((task.startTime || '').toString());
  const normalizedDueTime = normalizeTimeInputValue((task.dueTime || '').toString());

  let resolvedStartDate = normalizedStartDate;
  let resolvedDueDate = normalizedDueDate;
  if (!resolvedStartDate && !resolvedDueDate) {
    const inferredDate = normalizeDateInputValue(
      TaskRepository.inferTaskDateFromText(typeof task.title === 'string' ? task.title : '') || ''
    );
    if (inferredDate) {
      resolvedStartDate = inferredDate;
      resolvedDueDate = inferredDate;
    }
  }

  taskQuickDateDraft.value = {
    startDate: resolvedStartDate,
    startTime: normalizedStartTime,
    dueDate: resolvedDueDate,
    dueTime: normalizedDueTime
  };
}

function buildTaskQuickMenuAnchorFromRect(rect: DOMRect | null | undefined): { x: number; y: number } | null {
  if (!rect) {
    return null;
  }
  const left = Number(rect.left);
  const top = Number(rect.top);
  const width = Number(rect.width);
  const height = Number(rect.height);
  if (!Number.isFinite(left) || !Number.isFinite(top)) {
    return null;
  }
  const safeWidth = Number.isFinite(width) ? Math.max(0, width) : 0;
  const safeHeight = Number.isFinite(height) ? Math.max(0, height) : 0;
  return {
    x: Math.round(left + (safeWidth > 0 ? safeWidth / 2 : 0)),
    y: Math.round(top + (safeHeight > 0 ? safeHeight : 18))
  };
}

function getSelectionTaskQuickMenuAnchor(): { x: number; y: number } | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }
  const range = selection.getRangeAt(0);
  const rect = range.getClientRects().length > 0 ? range.getClientRects()[0] : range.getBoundingClientRect();
  const fromRange = buildTaskQuickMenuAnchorFromRect(rect);
  if (fromRange) {
    return fromRange;
  }
  const anchorNode = selection.anchorNode || range.startContainer;
  const anchorElement = anchorNode instanceof Element ? anchorNode : anchorNode?.parentElement || null;
  if (anchorElement instanceof HTMLElement) {
    return buildTaskQuickMenuAnchorFromRect(anchorElement.getBoundingClientRect());
  }
  return null;
}

function getTaskBlockQuickMenuAnchor(blockId: string): { x: number; y: number } | null {
  const normalizedBlockId = typeof blockId === 'string' ? blockId.trim() : '';
  if (!normalizedBlockId) {
    return null;
  }
  const escapedBlockId = normalizedBlockId.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const blockEl = document.querySelector(`[data-node-id="${escapedBlockId}"]`) as HTMLElement | null;
  if (!blockEl) {
    return null;
  }
  return buildTaskQuickMenuAnchorFromRect(blockEl.getBoundingClientRect());
}

function resolveTaskQuickMenuAnchor(blockId: string, anchorX?: unknown, anchorY?: unknown): { x: number; y: number } | null {
  const normalizedAnchorX = typeof anchorX === 'number' && Number.isFinite(anchorX) ? Math.round(anchorX) : null;
  const normalizedAnchorY = typeof anchorY === 'number' && Number.isFinite(anchorY) ? Math.round(anchorY) : null;
  if (normalizedAnchorX !== null && normalizedAnchorY !== null) {
    return {
      x: normalizedAnchorX,
      y: normalizedAnchorY
    };
  }
  const selectionAnchor = getSelectionTaskQuickMenuAnchor();
  if (selectionAnchor) {
    return selectionAnchor;
  }
  return getTaskBlockQuickMenuAnchor(blockId);
}

function openTaskQuickDateMenu(task: Task, anchorPosition?: { x: number; y: number } | null): void {
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const menuWidth = 280;
  const estimatedHeight = 236;
  const margin = 12;
  const belowGap = 8;
  const aboveGap = 4;
  let x = Math.round((viewportWidth - menuWidth) / 2);
  let y = Math.round(viewportHeight * 0.18);

  if (anchorPosition) {
    x = Math.round(anchorPosition.x - menuWidth / 2);
    const belowY = Math.round(anchorPosition.y + belowGap);
    const aboveY = Math.round(anchorPosition.y - estimatedHeight - aboveGap);
    if (belowY + estimatedHeight <= viewportHeight - margin) {
      y = belowY;
    } else if (aboveY >= margin) {
      y = aboveY;
    } else {
      y = Math.max(margin, Math.min(belowY, viewportHeight - estimatedHeight - margin));
    }
  }

  x = Math.max(margin, Math.min(x, Math.max(margin, viewportWidth - menuWidth - margin)));
  y = Math.max(margin, Math.min(y, Math.max(margin, viewportHeight - estimatedHeight - margin)));

  taskQuickDateMenu.value = {
    show: true,
    x,
    y,
    task
  };
  seedTaskQuickDateDraft(task);
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

  const maxHeight = Math.max(160, Math.min(500, viewportHeight - verticalMargin * 2));
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

function getTodayStartTimestamp(): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

function isVirtualTaskForToday(task: Task): boolean {
  if (!task.isVirtual) return false;
  const todayStart = getTodayStartTimestamp();
  const dayMs = 24 * 60 * 60 * 1000;
  const todayEnd = todayStart + dayMs;
  const startTimestamp = getTaskStartDateTimestamp(task);
  const dueTimestamp = getTaskDueDateTimestamp(task);
  if (startTimestamp !== null || dueTimestamp !== null) {
    let rangeStart = startTimestamp ?? dueTimestamp ?? 0;
    let rangeEnd = dueTimestamp ?? startTimestamp ?? 0;
    if (rangeStart > rangeEnd) {
      [rangeStart, rangeEnd] = [rangeEnd, rangeStart];
    }
    const taskRangeEnd = rangeEnd + dayMs;
    return rangeStart < todayEnd && taskRangeEnd > todayStart;
  }
  return false;
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

function matchesTaskSearchValue(value: string | undefined, keyword: string): boolean {
  return typeof value === 'string' && value.toLocaleLowerCase().includes(keyword);
}

function matchesSubtaskSearch(subtasks: Task['subtasks'] | undefined, keyword: string): boolean {
  if (!Array.isArray(subtasks) || subtasks.length === 0) {
    return false;
  }
  return subtasks.some(subtask => (
    matchesTaskSearchValue(subtask.title, keyword)
    || matchesTaskSearchValue(subtask.description, keyword)
    || matchesSubtaskSearch(subtask.subtasks, keyword)
  ));
}

function matchesTaskSearch(task: Task, keyword: string): boolean {
  if (!keyword) {
    return true;
  }
  const groupName = task.groupId ? (taskGroupNameMap.value.get(task.groupId) || '') : '';
  return matchesTaskSearchValue(task.title, keyword)
    || matchesTaskSearchValue(task.description, keyword)
    || matchesTaskSearchValue(task.hPath, keyword)
    || matchesTaskSearchValue(groupName, keyword)
    || (Array.isArray(task.tags) && task.tags.some(tag => matchesTaskSearchValue(tag, keyword)))
    || matchesSubtaskSearch(task.subtasks, keyword);
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
  invalidateSortCache();
  updateTaskIndex();
}

function invalidateSortCache() {
  taskSortVersion.value += 1;
}

const { filtered: baseFilteredTasks, invalidateCache } = useTaskFilters(tasks, taskFilters);

const taskSortVersion = ref(0);
const MAX_VISIBLE_COMPLETED_TASKS = 3;
const showAllCompletedTasks = ref(false);

function matchesActiveSourceFilter(task: Task): boolean {
  const activeSource = parsedFilterSource.value;
  if (activeSource.kind === 'notebook' && task.notebookId !== activeSource.id) {
    return false;
  }
  if (filterDocument.value !== 'all' && task.rootId !== filterDocument.value) {
    return false;
  }
  if (activeSource.kind !== 'group' && activeSource.kind !== 'goal') {
    return true;
  }
  const sourceMembers =
    activeSource.kind === 'group'
      ? documentGroupsById.value.get(activeSource.id)?.members
      : goalDefinitionsById.value.get(activeSource.id)?.members;
  if (!sourceMembers) {
    return false;
  }
  return sourceMembers.some(member =>
    member.documentId === task.rootId && member.notebookId === task.notebookId
  );
}

const filteredTasks = computed(() => {
  // Manual invalidation hook for mutation paths that should force re-sorting.
  void taskSortVersion.value;
  const mode = archiveViewMode.value;
  const includeCompleted = mode === 'active' ? showCompletedTasks.value : true;
  const searchKeyword = taskSearchQuery.value.trim().toLocaleLowerCase();
  const todayStart = getTodayStartTimestamp();
  const todayVirtualSeriesIds = new Set<string>();
  for (const task of baseFilteredTasks.value) {
    if (task.isVirtual && task.repeatSeriesId && isVirtualTaskForToday(task)) {
      todayVirtualSeriesIds.add(task.repeatSeriesId);
    }
  }
  let domOrderMap: Map<string, number> | undefined;
  const resolveDomOrderMap = () => {
    if (!domOrderMap) {
      domOrderMap = buildLiveTaskDomOrderMap();
    }
    return domOrderMap;
  };
  const baseFiltered = baseFilteredTasks.value.filter(task => {
    if (!task.isVirtual && task.repeatSeriesId && todayVirtualSeriesIds.has(task.repeatSeriesId)) {
      return false;
    }
    if (task.isVirtual && !isVirtualTaskForToday(task)) {
      return false;
    }
    if (mode === 'active' && task.archived) {
      return false;
    }
    if (mode === 'archived' && !task.archived) {
      return false;
    }
    if (!includeCompleted && task.status === 'completed') {
      return false;
    }
    const title = task.title?.trim();
    if (!title || title === '-' || title === '') {
      return false;
    }
    if (!matchesActiveSourceFilter(task)) {
      return false;
    }
    if (!matchesTaskFilterChips(task)) {
      return false;
    }
    return matchesTaskSearch(task, searchKeyword);
  });

  const result = [...baseFiltered].sort((a, b) => {
    const isACompleted = a.status === 'completed';
    const isBCompleted = b.status === 'completed';

    if (isACompleted && !isBCompleted) {
      return 1;
    }
    if (!isACompleted && isBCompleted) {
      return -1;
    }

    const isAPinned = a.pinned === true;
    const isBPinned = b.pinned === true;
    if (isAPinned && !isBPinned) {
      return -1;
    }
    if (!isAPinned && isBPinned) {
      return 1;
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
      const dueTimestampA = getTaskDueDateTimestamp(a);
      const dueTimestampB = getTaskDueDateTimestamp(b);
      const isAOverdue = dueTimestampA !== null && dueTimestampA < todayStart;
      const isBOverdue = dueTimestampB !== null && dueTimestampB < todayStart;
      if (isAOverdue && !isBOverdue) {
        return -1;
      }
      if (!isAOverdue && isBOverdue) {
        return 1;
      }
      if (isAOverdue && isBOverdue && dueTimestampA !== null && dueTimestampB !== null && dueTimestampA !== dueTimestampB) {
        return dueTimestampA - dueTimestampB;
      }

      const priorityA = priorityOrder[a.priority] ?? 3;
      const priorityB = priorityOrder[b.priority] ?? 3;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      const createdSortResult = compareTaskCreatedAtDesc(a, b);
      if (createdSortResult !== 0) {
        return createdSortResult;
      }

      const documentSortResult = compareTaskDocumentSortKey(a, b, resolveDomOrderMap());
      if (documentSortResult !== 0) {
        return documentSortResult;
      }
    }

    // Stable fallback ordering: prefer blockId, then id/createdAt (blockId is time-sortable: YYYYMMDDHHmmss-xxx).
    const aSortKey = a.blockId || a.id || a.createdAt || '';
    const bSortKey = b.blockId || b.id || b.createdAt || '';
    return bSortKey.localeCompare(aSortKey);
  });

  return result;
});

const hasHiddenCompletedTasks = computed(() => {
  if (archiveViewMode.value !== 'active') {
    return false;
  }
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
  if (archiveViewMode.value !== 'active') {
    return filteredTasks.value;
  }
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

const taskGroupIdSet = computed(() => new Set(taskGroups.value.map(group => group.id)));
const shouldRenderGroupedList = computed(() =>
  taskListViewMode.value === 'list' || taskListGroupBy.value !== 'none'
);
const shouldShowTaskCardDetails = computed(() => showTaskCardDetails.value);

const taskGroupedSections = computed<TaskGroupedSection[]>(() => {
  const tasks = displayedTasks.value;
  const mode = taskListGroupBy.value;
  const isListView = taskListViewMode.value === 'list';
  if (tasks.length === 0) {
    return [];
  }
  if (mode === 'none') {
    if (!isListView) {
      return [];
    }
    const pendingTasks = tasks.filter(task => task.status !== 'completed');
    const completedTasks = tasks.filter(task => task.status === 'completed');
    const sections: TaskGroupedSection[] = [];
    if (pendingTasks.length > 0) {
      sections.push({
        key: 'list:pending',
        label: '待处理',
        tasks: pendingTasks,
        order: 0
      });
    }
    if (completedTasks.length > 0) {
      sections.push({
        key: 'list:completed',
        label: '已完成',
        tasks: completedTasks,
        order: 1
      });
    }
    return sections;
  }

  const pinnedSectionTasks = tasks.filter(task => task.pinned === true && task.status !== 'completed');
  const tasksWithoutPinnedSection = pinnedSectionTasks.length > 0
    ? tasks.filter(task => !(task.pinned === true && task.status !== 'completed'))
    : tasks;
  const prependPinnedSection = (sections: TaskGroupedSection[]): TaskGroupedSection[] => {
    if (pinnedSectionTasks.length === 0) {
      return sections;
    }
    return [{
      key: 'pinned:top',
      label: '置顶',
      tasks: pinnedSectionTasks,
      order: -1
    }, ...sections];
  };

  if (mode === 'status') {
    const grouped = new Map<Task['status'], Task[]>();
    taskGroupStatusOrder.forEach(status => grouped.set(status, []));
    tasksWithoutPinnedSection.forEach((task) => {
      const status = grouped.has(task.status) ? task.status : 'pending';
      grouped.get(status)?.push(task);
    });
    return prependPinnedSection(taskGroupStatusOrder
      .map((status, index) => ({
        key: `status:${status}`,
        label: taskGroupStatusLabel[status],
        tasks: grouped.get(status) || [],
        order: index
      }))
      .filter(section => section.tasks.length > 0));
  }

  if (mode === 'group') {
    const grouped = new Map<string, Task[]>();
    const completedTasks: Task[] = [];
    tasksWithoutPinnedSection.forEach((task) => {
      if (task.status === 'completed') {
        completedTasks.push(task);
        return;
      }
      const rawGroupId = typeof task.groupId === 'string' ? task.groupId.trim() : '';
      const groupId = rawGroupId && taskGroupIdSet.value.has(rawGroupId) ? rawGroupId : TASK_GROUP_NONE_ID;
      const list = grouped.get(groupId) || [];
      list.push(task);
      grouped.set(groupId, list);
    });

    const sections: TaskGroupedSection[] = [];
    taskGroups.value.forEach((group, index) => {
      const sectionTasks = grouped.get(group.id);
      if (!sectionTasks || sectionTasks.length === 0) {
        return;
      }
      sections.push({
        key: `group:${group.id}`,
        label: group.name,
        tasks: sectionTasks,
        order: index
      });
      grouped.delete(group.id);
    });

    const noneTasks = grouped.get(TASK_GROUP_NONE_ID) || [];
    if (noneTasks.length > 0) {
      sections.push({
        key: `group:${TASK_GROUP_NONE_ID}`,
        label: '无标签',
        tasks: noneTasks,
        order: Number.MAX_SAFE_INTEGER
      });
    }
    if (completedTasks.length > 0) {
      sections.push({
        key: 'completed:all',
        label: '已完成',
        tasks: completedTasks,
        order: Number.MAX_SAFE_INTEGER
      });
    }
    return prependPinnedSection(sections);
  }

  if (mode === 'date') {
    const dayMs = 24 * 60 * 60 * 1000;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    const tomorrowStart = todayStart + dayMs;
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
    const weekStart = new Date(todayStart);
    const weekday = weekStart.getDay();
    const diff = weekday === 0 ? -6 : 1 - weekday;
    weekStart.setDate(weekStart.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartTimestamp = weekStart.getTime();
    const weekEnd = weekStartTimestamp + dayMs * 7;
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1).getTime();

    const dateSections = [
      { key: 'overdue', label: '逾期' },
      { key: 'today', label: '今日' },
      { key: 'thisWeek', label: '本周' },
      { key: 'thisMonth', label: '本月' },
      { key: 'other', label: '其他' }
    ] as const;
    const grouped = new Map<(typeof dateSections)[number]['key'], Task[]>();
    dateSections.forEach((section) => grouped.set(section.key, []));
    const todayVirtualSeriesIds = new Set<string>();
    tasksWithoutPinnedSection.forEach((task) => {
      if (task.isVirtual && task.repeatSeriesId && isVirtualTaskForToday(task)) {
        todayVirtualSeriesIds.add(task.repeatSeriesId);
      }
    });

    tasksWithoutPinnedSection.forEach((task) => {
      const dueTimestamp = getTaskDueDateTimestamp(task);
      const groupingTimestamp = dueTimestamp ?? getTaskDateTimestamp(task.createdAt);
      const repeatSeriesId = typeof task.repeatSeriesId === 'string' ? task.repeatSeriesId.trim() : '';
      const hasTodayVirtualInstance = !!repeatSeriesId && todayVirtualSeriesIds.has(repeatSeriesId);
      let sectionKey: (typeof dateSections)[number]['key'] = 'other';
      if (hasTodayVirtualInstance) {
        sectionKey = 'today';
      } else if (dueTimestamp !== null && dueTimestamp < todayStart) {
        sectionKey = 'overdue';
      } else if (groupingTimestamp !== null) {
        if (groupingTimestamp >= todayStart && groupingTimestamp < tomorrowStart) {
          sectionKey = 'today';
        } else if (groupingTimestamp >= weekStartTimestamp && groupingTimestamp < weekEnd) {
          sectionKey = 'thisWeek';
        } else if (groupingTimestamp >= monthStart && groupingTimestamp < monthEnd) {
          sectionKey = 'thisMonth';
        }
      }
      grouped.get(sectionKey)?.push(task);
    });

    return prependPinnedSection(dateSections
      .map((section, index) => ({
        key: `date:${section.key}`,
        label: section.label,
        tasks: grouped.get(section.key) || [],
        order: index
      }))
      .filter(section => section.tasks.length > 0));
  }

  const headingSections = new Map<string, TaskGroupedSection>();
  const completedTasks: Task[] = [];
  const shouldHideDocumentPrefix = filterDocument.value !== 'all';
  tasksWithoutPinnedSection.forEach((task) => {
    if (task.status === 'completed') {
      completedTasks.push(task);
      return;
    }
    const meta = getTaskHeadingGroupMeta(task, taskHeadingGroups.value);
    const headingKey = meta.key || `heading:${task.id}`;
    const sectionKey = `heading:${headingKey}`;
    let label = (meta.label || '').trim() || '未命名标题';
    if (shouldHideDocumentPrefix && label.includes(' / ')) {
      label = label.split(' / ').slice(1).join(' / ');
    }
    const order = typeof meta.order === 'number' ? meta.order : Number.MAX_SAFE_INTEGER;
    const existing = headingSections.get(sectionKey);
    if (existing) {
      existing.tasks.push(task);
      return;
    }
    headingSections.set(sectionKey, {
      key: sectionKey,
      label,
      tasks: [task],
      order
    });
  });

  const sections = Array.from(headingSections.values())
    .sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      const labelDiff = a.label.localeCompare(b.label, 'zh-CN');
      if (labelDiff !== 0) {
        return labelDiff;
      }
      return a.key.localeCompare(b.key);
    });
  if (completedTasks.length > 0) {
    sections.push({
      key: 'completed:all',
      label: '已完成',
      tasks: completedTasks,
      order: Number.MAX_SAFE_INTEGER
    });
  }
  return prependPinnedSection(sections);
});

function isTaskGroupSectionCollapsed(sectionKey: string): boolean {
  const key = typeof sectionKey === 'string' ? sectionKey.trim() : '';
  if (!key) {
    return false;
  }
  return collapsedTaskGroupSectionKeys.value.has(key);
}

function toggleTaskGroupSectionCollapse(sectionKey: string): void {
  const key = typeof sectionKey === 'string' ? sectionKey.trim() : '';
  if (!key) {
    return;
  }
  const next = new Set(collapsedTaskGroupSectionKeys.value);
  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }
  collapsedTaskGroupSectionKeys.value = next;
  nextTick(() => {
    scheduleTaskTitleHydration(120);
  });
}

const hasExpandedTaskDetails = computed(() =>
  expandedSubtasks.value.size > 0
  || expandedDescriptions.value.size > 0
  || inlineEditingDescriptionTaskId.value !== null
);

const shouldUseTaskVirtualList = computed(() =>
  taskListViewMode.value === 'kanban'
  && taskListGroupBy.value === 'none'
  && displayedTasks.value.length > TASK_VIRTUAL_THRESHOLD
  && !hasExpandedTaskDetails.value
);

watch([taskListGroupBy, displayedTasks], ([mode]) => {
  if (mode !== 'heading') {
    return;
  }
  void refreshTaskHeadingGroups();
}, { immediate: true });

watch(taskGroupedSections, (sections) => {
  const validKeys = new Set(sections.map(section => section.key));
  const next = new Set(
    Array.from(collapsedTaskGroupSectionKeys.value).filter(key => validKeys.has(key))
  );
  if (next.size !== collapsedTaskGroupSectionKeys.value.size) {
    collapsedTaskGroupSectionKeys.value = next;
  }
});

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
    if (!titleHtml.includes('<sup') && !hasMarkdownInlineMemo(titleHtml)) {
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
  if (batchSelectedTaskIds.value.size > 0) {
    const nextSelected = new Set<string>();
    batchSelectedTaskIds.value.forEach(taskId => {
      if (ids.has(taskId)) {
        nextSelected.add(taskId);
      }
    });
    if (nextSelected.size !== batchSelectedTaskIds.value.size) {
      batchSelectedTaskIds.value = nextSelected;
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

function toggleAllVisibleSubtasksFromMenu() {
  toggleAllVisibleSubtasks();
  closeTaskGroupMenu();
}

function toggleTaskCardDetailsFromMenu() {
  showTaskCardDetails.value = !showTaskCardDetails.value;
  if (!showTaskCardDetails.value && inlineEditingDescriptionTaskId.value) {
    inlineEditingDescriptionTaskId.value = null;
  }
  closeTaskGroupMenu();
  nextTick(() => {
    taskHeightVersion.value += 1;
    scheduleTaskRowMeasure();
    scheduleTaskVirtualUpdate();
    scheduleTaskTitleHydration(120);
  });
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
      resolveTaskRepeatMaterializeOptions()
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
  const activeSource = parsedFilterSource.value;
  if (activeSource.kind === 'notebook' && excludedNotebookIds.value.includes(activeSource.id)) {
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

async function handleGlobalRecognizeTaskDates(): Promise<void> {
  if (isGlobalDateRecognitionRunning.value) {
    return;
  }

  isGlobalDateRecognitionRunning.value = true;
  try {
    const result = await TaskRepository.recognizeDatesForUndatedTasks();
    if (result.scanned === 0) {
      showMessage('未找到未设定起止日期的任务', 2200, 'info');
      return;
    }

    if (result.updated > 0) {
      if (result.failed > 0) {
        showMessage(`已写入 ${result.updated} 项日期，${result.failed} 项写入失败`, 3200, 'error');
      } else {
        showMessage(`已识别并写入 ${result.updated} 项任务日期`, 2200, 'info');
      }
      await refreshTasks(true, { showLoading: false, compareExisting: false, source: 'global-date-recognize' });
      return;
    }

    if (result.recognized === 0) {
      showMessage(`扫描 ${result.scanned} 项未设定任务，未识别到可写入日期`, 2800, 'info');
      return;
    }

    showMessage(`识别到 ${result.recognized} 项日期，写入失败 ${result.failed} 项`, 3200, 'error');
  } catch (error) {
    console.error('[TaskManager] 全局识别任务日期失败:', error);
    showMessage('全局识别任务日期失败，请稍后重试', 3200, 'error');
  } finally {
    isGlobalDateRecognitionRunning.value = false;
  }
}

async function handleTaskScopeSave(payload: TaskScopeDialogSavePayload) {
  const {
    excludedNotebookIds: selectedVisibleExcludedNotebookIds,
    showCompletedTasks: nextShowCompletedTasks,
    autoRecognizeTaskDate: nextAutoRecognizeTaskDate,
    taskCompletionSoundEnabled: nextTaskCompletionSoundEnabled,
    showDocumentGroupNotebookPath: nextShowDocumentGroupNotebookPath,
    documentGroups: nextDocumentGroupsPayload,
    goals: nextGoals
  } = payload;
  const visibleNotebookIds = new Set(notebooks.value.map(notebook => notebook.id));
  const hiddenExcludedNotebookIds = excludedNotebookIds.value.filter(id => !visibleNotebookIds.has(id));
  const mergedExcludedNotebookIds = normalizeNotebookIds([
    ...hiddenExcludedNotebookIds,
    ...selectedVisibleExcludedNotebookIds
  ]);
  const nextDocumentGroups = sortDocumentGroups((nextDocumentGroupsPayload || []).map(group => ({
    ...group,
    members: Array.isArray(group.members) ? group.members.map(member => ({ ...member })) : []
  })));

  applyExcludedNotebookScope(mergedExcludedNotebookIds);
  applyExternalDocumentGroups(nextDocumentGroups);
  eventBus.emit(Events.DOCUMENT_GROUPS_UPDATED, { groups: nextDocumentGroups });
  showCompletedTasks.value = nextShowCompletedTasks;
  TaskRepository.setAutoRecognizeTaskDateEnabled(nextAutoRecognizeTaskDate);
  const shouldFinalizeInit = requiresScopeInitialization.value;
  await saveDocumentGroups(nextDocumentGroups);
  await updateSettings('taskManager', {
    excludedNotebookIds: mergedExcludedNotebookIds,
    showCompletedTasks: nextShowCompletedTasks,
    autoRecognizeTaskDate: nextAutoRecognizeTaskDate,
    taskCompletionSoundEnabled: nextTaskCompletionSoundEnabled,
    showDocumentGroupNotebookPath: nextShowDocumentGroupNotebookPath,
    ...(shouldFinalizeInit ? { scopeInitialized: true } : {})
  });
  if (shouldFinalizeInit) {
    requiresScopeInitialization.value = false;
  }
  await saveGoalDefinitions(nextGoals);
  showTaskScopeDialog.value = false;
  await refreshTaskDocumentOptions(true);
  ensureActiveNotebookFilterInScope();
  normalizeDocumentSelection(filterNotebook.value);
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
    ? {
      includeCompleted: requestedScope.includeCompleted,
      includeArchived: requestedScope.includeArchived,
      archivedOnly: requestedScope.archivedOnly
    }
    : requestedScope;
  const now = Date.now();
  const SKIP_DELAY = 500;
  if (!force && !ignoreThrottle && now - lastRefreshTime < SKIP_DELAY) {
    return;
  }
  lastRefreshTime = now;

   try {
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

    if (!compareExisting || force || hasTasksChanged(tasks.value, newTasks)) {
      invalidateCache();
      tasks.value = newTasks;
      invalidateSortCache();

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
  delay = 120,
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

  fallbackRefreshTimer = window.setTimeout(async () => {
    fallbackRefreshTimer = null;
    await refreshTasks(force, { showLoading: false, compareExisting: true, source: 'fallback-refresh' });
  }, delay);
}

function isDeepEqual(oldItem: any, newItem: any, options: { checkUpdatedAt?: boolean } = {}): boolean {
  if (options.checkUpdatedAt && oldItem.updatedAt && newItem.updatedAt && oldItem.updatedAt !== newItem.updatedAt) {
    return false;
  }
  
  const parentFields = ['title', 'status', 'priority', 'pinned', 'description', 'type', 'completedAt', 'blockSort', 'documentOrder'];
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
  flushDelayMs: INCREMENTAL_QUEUE_DELAY_MS,
  followupDelayMs: INCREMENTAL_QUEUE_DELAY_MS,
  onFlushBatch: async (blockIds) => {
    await incrementalUpdateTasks(blockIds);
  }
});

function applyImmediateLiveDomTaskPatch(blockIds: string[]): boolean {
  const normalizedBlockIds = [...new Set(blockIds.filter((id): id is string => typeof id === 'string' && id.length > 0))];
  if (normalizedBlockIds.length === 0) {
    return false;
  }

  let changed = false;
  for (const blockId of normalizedBlockIds) {
    const taskIndex = blockIdToTaskIndex.get(blockId);
    if (!taskIndex) {
      continue;
    }

    const liveCompleted = parseTaskCompleted(blockId);
    const liveTitle = getLiveTaskTitle(blockId);

    if (taskIndex.isSubtask) {
      patchTask(tasks.value, blockId, (subtask) => {
        if (typeof liveCompleted === 'boolean' && subtask.completed !== liveCompleted) {
          subtask.completed = liveCompleted;
          changed = true;
        }

        if (liveTitle !== null && subtask.title !== liveTitle) {
          const currentTitle = typeof subtask.title === 'string' ? subtask.title : '';
          if (!shouldSkipMemoTitleDowngrade(currentTitle, liveTitle)) {
            subtask.title = liveTitle;
            changed = true;
          }
        }
      }, 'nodeId');
      continue;
    }

    patchTask(tasks.value, blockId, (task) => {
      if (typeof liveCompleted === 'boolean') {
        const previousStatus = task.status;
        const previousCompletedAt = task.completedAt;
        const nextStatus: Task['status'] = liveCompleted
          ? 'completed'
          : (task.status === 'completed' ? 'pending' : (task.status || 'pending'));
        if (task.status !== nextStatus) {
          task.status = nextStatus;
          changed = true;
        }
        if (liveCompleted) {
          const nextCompletedAt = previousStatus !== 'completed' || !task.completedAt
            ? new Date().toISOString()
            : task.completedAt;
          if (task.completedAt !== nextCompletedAt) {
            task.completedAt = nextCompletedAt;
            changed = true;
          }
        } else if (task.completedAt) {
          delete task.completedAt;
          changed = true;
        }
        if (previousStatus !== task.status || previousCompletedAt !== task.completedAt) {
          queueExternalTaskStatusAttrSync(blockId, nextStatus, task.completedAt);
        }
      }

      if (liveTitle !== null && task.title !== liveTitle) {
        const currentTitle = typeof task.title === 'string' ? task.title : '';
        if (!shouldSkipMemoTitleDowngrade(currentTitle, liveTitle)) {
          task.title = liveTitle;
          changed = true;
        }
      }
    }, 'blockId');
  }

  if (changed) {
    invalidateCache();
    invalidateSortCache();
    updateTaskIndex();
  }

  return changed;
}

function queueIncrementalUpdates(blockIds: string[], delay = INCREMENTAL_QUEUE_DELAY_MS): void {
  if (!Array.isArray(blockIds) || blockIds.length === 0) {
    return;
  }
  applyImmediateLiveDomTaskPatch(blockIds);
  incrementalUpdateQueue.enqueue(blockIds, delay);
}

const pendingExternalTaskStatusAttrSync = new Map<string, { status: Task['status']; completedAt?: string }>();

function queueExternalTaskStatusAttrSync(
  blockId: string,
  status: Task['status'],
  completedAt?: string
): void {
  if (typeof blockId !== 'string' || blockId.trim().length === 0) {
    return;
  }
  pendingExternalTaskStatusAttrSync.set(blockId, {
    status,
    completedAt: typeof completedAt === 'string' && completedAt.trim().length > 0
      ? completedAt.trim()
      : undefined
  });
}

async function flushExternalTaskStatusAttrSync(blockIds: Iterable<string>): Promise<void> {
  const entries = Array.from(new Set(Array.from(blockIds)))
    .map((blockId) => {
      const sync = pendingExternalTaskStatusAttrSync.get(blockId);
      return sync ? { blockId, ...sync } : null;
    })
    .filter((entry): entry is { blockId: string; status: Task['status']; completedAt?: string } => !!entry);

  if (entries.length === 0) {
    return;
  }

  entries.forEach(entry => pendingExternalTaskStatusAttrSync.delete(entry.blockId));

  const results = await Promise.allSettled(entries.map((entry) =>
    syncTaskStatusAttrsIfNeeded(entry.blockId, entry.status, entry.completedAt)
  ));
  const hasApplied = results.some(result => result.status === 'fulfilled' && result.value === true);
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.warn('[TaskManager] 同步任务完成属性失败:', {
        blockId: entries[index]?.blockId,
        error: result.reason
      });
    }
  });

  if (hasApplied) {
    await TaskRepository.clearCache();
  }
}



function setupEventListeners() {
  const unsubscribe = eventBus.on(Events.TASK_CHANGED, (data?: { blockIds?: string[] }) => {
    if (data?.blockIds && data.blockIds.length > 0) {
      queueIncrementalUpdates(data.blockIds);
    } else {
      scheduleFallbackRefresh(true, IMMEDIATE_FALLBACK_DELAY_MS, 'immediate');
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
      const requestId = ++repeatReconcileRequestId;
      const fastPathApplied = await applyRepeatRuleIncremental(payload, requestId);
      if (requestId !== repeatReconcileRequestId) {
        return;
      }
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

      await incrementalUpdateTasks(scopedBlockIds);
      window.setTimeout(() => {
        if (!blockIdToTaskIndex.has(addedBlockId)) {
          scheduleFallbackRefresh(true, IMMEDIATE_FALLBACK_DELAY_MS, 'immediate');
        }
      }, TASK_ADDED_VERIFY_DELAY_MS);
      return;
    }
    scheduleFallbackRefresh(true, IMMEDIATE_FALLBACK_DELAY_MS, 'immediate');
  });
  
  

  const unsubscribeDateChanged = eventBus.on('task-date-changed', (updatedTask: Task) => {
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
      task.startTime = updatedTask.startTime;
      task.dueTime = updatedTask.dueTime;
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

  const unsubscribeDocumentGroupsUpdated = eventBus.on(
    Events.DOCUMENT_GROUPS_UPDATED,
    (payload?: { groups?: DocumentGroup[] }) => {
      if (payload?.groups) {
        applyExternalDocumentGroups(payload.groups);
        return;
      }
      void (async () => {
        const nextGroups = await loadDocumentGroups();
        applyExternalDocumentGroups(nextGroups);
      })();
    }
  );

  const unsubscribeTaskEditorOpenRequested = eventBus.on(
    Events.TASK_EDITOR_OPEN_REQUEST,
    (payload?: { blockId?: string; rootId?: string; anchorX?: number; anchorY?: number; task?: Task | null }) => {
      void openTaskDateMenuFromExternalRequest(payload);
    }
  );

  eventUnsubscribers.push(
    unsubscribe,
    unsubscribeDeleted,
    unsubscribeUpdated,
    unsubscribeAdded,
    unsubscribeDateChanged,
    unsubscribeGroupsUpdated,
    unsubscribeDocumentGroupsUpdated,
    unsubscribeTaskEditorOpenRequested
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

  const { unresolvedBlockIds, patchedParentStatuses } = await fastSyncTaskFromDom(scopedBlockIds);
  const blockIdsForFullSync = unresolvedBlockIds.length > 0 ? unresolvedBlockIds : scopedBlockIds;
  const parentBlockIds = await resolveParentTaskBlockIds(blockIdsForFullSync, ancestorContextRows);

  if (parentBlockIds.size === 0) {
    if (unresolvedBlockIds.length > 0) {
      scheduleFallbackRefresh(true, IMMEDIATE_FALLBACK_DELAY_MS, 'immediate');
    } else {
      consecutiveFallbackFailures = 0;
    }
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
    const removedTaskIds = new Set<string>();
  
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

    await flushExternalTaskStatusAttrSync(uniqueBlockIds);

    for (const blockId of uniqueBlockIds) {
      if (taskMapBatch.has(blockId)) {
        continue;
      }
      missingRequestedIds.push(blockId);

      const taskIndex = blockIdToTaskIndex.get(blockId);
      if (!taskIndex || taskIndex.isSubtask) {
        continue;
      }

      removedTaskIds.add(taskIndex.task.id);
      removedTasks += 1;
    }
    
    if (updatedTasks.length > 0 || removedTasks > 0) {
      let nextTasks = crdtRepo.getTasks();
      if (removedTaskIds.size > 0) {
        nextTasks = nextTasks.filter(task => !removedTaskIds.has(task.id));
        // Keep CRDT store aligned with scoped list without writing tombstones.
        crdtRepo.syncFromSQLTasks(nextTasks);
        nextTasks = crdtRepo.getTasks();
      }
      tasks.value = nextTasks;
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
      scheduleFallbackRefresh(true, IMMEDIATE_FALLBACK_DELAY_MS, 'immediate');
    }
  } catch {
    scheduleFallbackRefresh(true, IMMEDIATE_FALLBACK_DELAY_MS, 'immediate');
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

function getTaskActionElement(root: Element | null, ownerId?: string): Element | null {
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
}

function parseTaskCompletedByMarker(marker: string | null): boolean | null {
  if (marker === null) {
    return null;
  }
  return marker.trim().length > 0;
}

function parseTaskCompletedFromElement(root: Element | null, ownerId?: string): boolean | null {
  if (!root) return null;

  const ownerElement = root.getAttribute('data-type') === 'NodeListItem'
    ? root
    : (root.closest('[data-type="NodeListItem"]') || root);
  const byMarker = parseTaskCompletedByMarker(ownerElement.getAttribute('data-task'));
  if (byMarker !== null) {
    return byMarker;
  }

  const action = getTaskActionElement(ownerElement, ownerId);
  if (!action) {
    return null;
  }
  const svg = action.querySelector('use');
  const href = svg?.getAttribute('xlink:href') || svg?.getAttribute('href') || '';
  return href ? href === '#iconCheck' : null;
}

function getLiveTaskElement(blockId: string): Element | null {
  const selectors = [
    `.protyle [data-node-id="${blockId}"][data-type="NodeListItem"]`,
    `.protyle [data-node-id="${blockId}"]`,
    `[data-node-id="${blockId}"][data-type="NodeListItem"]`,
    `[data-node-id="${blockId}"]`
  ];
  for (const selector of selectors) {
    const matched = document.querySelector(selector);
    if (matched) {
      return matched;
    }
  }
  return null;
}

function getTaskElementFromDoc(doc: Document, blockId: string): Element | null {
  return doc.querySelector(`[data-node-id="${blockId}"][data-type="NodeListItem"]`)
    || doc.querySelector(`[data-node-id="${blockId}"]`);
}

function parseTaskCompleted(blockId: string, parsedDoc?: Document | null): boolean | null {
  const liveCompleted = parseTaskCompletedFromElement(getLiveTaskElement(blockId), blockId);
  if (liveCompleted !== null) {
    return liveCompleted;
  }

  if (parsedDoc) {
    const domCompleted = parseTaskCompletedFromElement(getTaskElementFromDoc(parsedDoc, blockId), blockId);
    if (domCompleted !== null) {
      return domCompleted;
    }
  }

  return null;
}

function cleanTaskTitleHtml(html: string): string {
  return html.replace(/\{:\s*[^}]*\}/g, '').trim();
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

function hasMarkdownInlineMemo(title: string): boolean {
  const inlineMemoRegex = /\(\(([^()]+)\)\)/g;
  let match: RegExpExecArray | null;
  while ((match = inlineMemoRegex.exec(title)) !== null) {
    const content = match[1];
    // Block references have format: 14-digit timestamp + hyphen + 7+ alphanumeric
    if (!/^[0-9]{14}-[a-z0-9]{7,}$/.test(content)) {
      return true;
    }
  }
  return false;
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
    if (!currentTitle.includes('<sup') && !hasMarkdownInlineMemo(currentTitle)) {
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

function getTaskTitleFromElement(root: Element | null): string | null {
  if (!root) return null;
  const paragraph = root.querySelector('[data-type="NodeParagraph"]');
  const editable = paragraph?.querySelector('[contenteditable="true"]');
  const rawTitle = editable?.innerHTML || paragraph?.innerHTML || '';
  const cleaned = cleanTaskTitleHtml(rawTitle);
  return cleaned.length > 0 ? cleaned : null;
}

function parseTaskTitle(blockId: string, parsedDoc?: Document | null): string | null {
  const liveTitle = getLiveTaskTitle(blockId);
  if (liveTitle !== null) {
    return liveTitle;
  }

  if (parsedDoc) {
    const apiTitle = getTaskTitleFromElement(getTaskElementFromDoc(parsedDoc, blockId));
    if (apiTitle !== null) {
      return apiTitle;
    }
  }

  return null;
}

async function fastSyncTaskFromDom(blockIds: string[]): Promise<{
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
      const blockData = await getBlockDOM(blockId);
      const dom = typeof blockData?.dom === 'string' ? blockData.dom : '';
      return { blockId, dom, error: null as unknown };
    } catch (error) {
      return { blockId, dom: '', error };
    }
  }));
  const parser = new DOMParser();
  for (const snapshot of blockSnapshots) {
    const { blockId, dom, error } = snapshot;
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
      const parsedDoc = dom ? parser.parseFromString(dom, 'text/html') : null;
      const completed = parseTaskCompleted(blockId, parsedDoc);
      const title = parseTaskTitle(blockId, parsedDoc);
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
          const previousStatus = task.status;
          const previousCompletedAt = task.completedAt;
          const nextStatus: Task['status'] = completed
            ? 'completed'
            : (task.status === 'completed' ? 'pending' : (task.status || 'pending'));
          nextStatusForTask = nextStatus;
          if (task.status !== nextStatus) {
            task.status = nextStatus;
            changed = true;
          }
          if (completed) {
            const nextCompletedAt = previousStatus !== 'completed' || !task.completedAt
              ? new Date().toISOString()
              : task.completedAt;
            if (task.completedAt !== nextCompletedAt) {
              task.completedAt = nextCompletedAt;
              changed = true;
            }
          } else if (task.completedAt) {
            delete task.completedAt;
            changed = true;
          }
          if (previousStatus !== task.status || previousCompletedAt !== task.completedAt) {
            queueExternalTaskStatusAttrSync(blockId, nextStatus, task.completedAt);
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
        if (nextStatusForTask) {
          patchedParentStatuses.set(blockId, nextStatusForTask);
        }
        if (changed) {
          hasPatched = true;
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
    status: task.status || 'pending',
    priority: task.priority,
    pinned: task.pinned === true,
    startDate: normalizeDateInputValue((task.startDate || '').toString()),
    startTime: normalizeTimeInputValue((task.startTime || '').toString()),
    dueDate: normalizeDateInputValue((task.dueDate || '').toString()),
    dueTime: normalizeTimeInputValue((task.dueTime || '').toString()),
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
  
  const wasCompleted = task.status === 'completed';
  const newStatus = task.status === 'completed' ? 'pending' : 'completed';
  const shouldPlayCompletionSound = !wasCompleted && newStatus === 'completed';
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
    const editedTask = activeTaskEditDraft.value;
    if (editedTask && editedTask.taskId === task.id) {
      editedTask.status = newStatus;
    }
    
    await refreshInternalState();
    
    if (!isVirtualRepeatTask) {
      eventBus.emit(Events.TASK_CHANGED, { blockIds: task.blockId ? [task.blockId] : [] });
    }
    if (shouldPlayCompletionSound && taskCompletionSoundEnabled.value) {
      playTaskCompletionSound();
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

function handleTaskEditorPinToggle(): void {
  const task = activeTaskEditTask.value;
  if (!task) return;
  void quickSaveTaskPinned(task, !(task.pinned === true));
}

function handleTaskEditorDescriptionInput(value: string): void {
  if (!activeTaskEditDraft.value) return;
  activeTaskEditDraft.value.description = value;
}

function handleTaskEditorDateFieldsUpdate(value: TaskEditorDateFields): void {
  if (!activeTaskEditTask.value || !activeTaskEditDraft.value) return;
  void quickSaveTaskDateFields(activeTaskEditTask.value, value);
}

function handleTaskEditorReminderSelect(value: TaskReminderSelection): void {
  if (!activeTaskEditTask.value || !activeTaskEditDraft.value) return;
  activeTaskEditDraft.value.reminderType = value.reminderType;
  activeTaskEditDraft.value.reminderCustomTime = value.reminderCustomTime || '';
  void quickSaveTaskReminder(activeTaskEditTask.value, value);
}

function handleTaskEditorStatusSelect(value: Task['status']): void {
  if (!activeTaskEditTask.value || !activeTaskEditDraft.value) {
    return;
  }
  activeTaskEditDraft.value.status = value;
  void quickSaveTaskStatus(activeTaskEditTask.value, value);
}

function handleTaskEditorDescriptionCommit(): void {
  if (!activeTaskEditTask.value || !activeTaskEditDraft.value) return;
  void quickSaveTaskDescription(activeTaskEditTask.value, activeTaskEditDraft.value.description || '');
  taskEditorQuickPanel.value = null;
}

async function handleTaskEditorArchiveToggle(): Promise<void> {
  const task = activeTaskEditTask.value;
  if (!task) {
    return;
  }

  const blockId = typeof task.blockId === 'string' ? task.blockId.trim() : '';
  const shouldUnarchive = task.archived === true;
  const nowIso = new Date().toISOString();

  try {
    if (shouldUnarchive) {
      await TaskRepository.unarchiveTask(task.id);
      patchTask(tasks.value, task.id, (currentTask) => {
        currentTask.archived = false;
        currentTask.archivedAt = undefined;
        currentTask.archiveReason = undefined;
        currentTask.updatedAt = nowIso;
      }, 'id');
      await refreshInternalState();
      if (blockId) {
        eventBus.emit(Events.TASK_CHANGED, { blockIds: [blockId] });
      }
      return;
    }

    await TaskRepository.archiveTask(task.id, 'manual');
    patchTask(tasks.value, task.id, (currentTask) => {
      currentTask.archived = true;
      currentTask.archivedAt = nowIso;
      currentTask.archiveReason = 'manual';
      currentTask.updatedAt = nowIso;
    }, 'id');
    await refreshInternalState();
    closeTaskEditorSidebar();
    if (blockId) {
      eventBus.emit(Events.TASK_CHANGED, { blockIds: [blockId] });
    }
  } catch {
  }
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

  if (taskGroupMenuVisible.value) {
    const isInsideGroupMenu = path.some(node =>
      node instanceof HTMLElement && (
        node.classList.contains('task-group-menu-control')
        || node.classList.contains('task-group-menu-popover')
      )
    );
    if (!isInsideGroupMenu && !taskGroupMenuControlRef.value?.contains(target)) {
      closeTaskGroupMenu();
    }
  }

  if (taskQuickDateMenu.value.show) {
    const isInsideQuickDateMenu = path.some(node =>
      node instanceof HTMLElement && node.classList.contains('task-quick-date-menu')
    );
    const isInsideQuickDatePopover = path.some(node =>
      node instanceof HTMLElement && (
        node.classList.contains('date-popover')
        || node.classList.contains('date-popover-overlay')
        || node.classList.contains('time-popover')
        || node.classList.contains('time-popover-overlay')
      )
    );
    if (!isInsideQuickDateMenu && !isInsideQuickDatePopover) {
      closeTaskQuickDateMenu();
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

async function openTaskDateMenuFromExternalRequest(
  payload?: { blockId?: string; rootId?: string; anchorX?: number; anchorY?: number; task?: Task | null }
): Promise<void> {
  const normalizedBlockId = typeof payload?.blockId === 'string' ? payload.blockId.trim() : '';
  if (!normalizedBlockId) {
    return;
  }

  const payloadTask = payload?.task && typeof payload.task.id === 'string' ? payload.task : null;
  const localTask = tasks.value.find(item => item.blockId === normalizedBlockId) || null;
  const loadedTask = payloadTask || localTask || await TaskRepository.getTaskByBlockId(normalizedBlockId, true).catch(() => null);
  if (!loadedTask) {
    return;
  }

  closeTaskEditorSidebar();
  closeTaskEditMenu();
  taskEditDraft.value = null;
  const anchorPosition = resolveTaskQuickMenuAnchor(normalizedBlockId, payload?.anchorX, payload?.anchorY);
  openTaskQuickDateMenu(loadedTask, anchorPosition);
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

function handleTaskCardClick(task: Task): void {
  if (shouldSuppressTaskCardClick(task.id)) {
    return;
  }
  if (isBatchEditMode.value) {
    toggleTaskBatchSelection(task.id);
    return;
  }
  openTaskEditorFromMenu(task);
}

function handleTaskCardOpenClick(task: Task): void {
  if (isBatchEditMode.value) {
    toggleTaskBatchSelection(task.id);
    return;
  }
  handleTaskClick(task);
}

function handleTaskCardStartFocus(task: Task): void {
  if (isBatchEditMode.value) {
    toggleTaskBatchSelection(task.id);
    return;
  }
  emit('startFocus', task);
}

function handleTaskEditorStartFocus(): void {
  const task = activeTaskEditTask.value;
  if (!task) {
    return;
  }

  let floatingFocusEnabled = false;
  try {
    floatingFocusEnabled = localStorage.getItem(FLOATING_FOCUS_STORAGE_KEY) === 'true';
  } catch {
    floatingFocusEnabled = false;
  }

  if (floatingFocusEnabled) {
    closeTaskEditorSidebar();
    eventBus.emit(Events.FOCUS_TIMER_PANEL_OPEN_REQUEST, {
      target: createTaskFocusTarget(task),
      showPanel: false,
      openMiniSettings: true
    });
    return;
  }

  closeTaskEditorSidebar();
  emit('startFocus', task);
}

function handleTaskCardToggleStatus(task: Task): void {
  if (isBatchEditMode.value) {
    toggleTaskBatchSelection(task.id);
    return;
  }
  void toggleTaskStatus(task);
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
  if (isBatchEditMode.value) {
    toggleTaskBatchSelection(task.id);
    return;
  }
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
  beforePersist?: (blockId: string) => Promise<void>;
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
    const blockId = task.type === 'block' && task.blockId ? task.blockId.trim() : '';
    if (blockId) {
      const nextStatus = options.attrs['custom-task-status'] as Task['status'] | undefined;
      const attrsToPersist = nextStatus
        ? { ...options.attrs, ...buildTaskStatusAttrs(nextStatus, task.completedAt) }
        : options.attrs;
      await setBlockAttrs(blockId, attrsToPersist);
      if (options.beforePersist) {
        await options.beforePersist(blockId);
      }
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

async function handleTaskQuickDateSave(): Promise<void> {
  const menuTask = taskQuickDateMenu.value.task;
  if (!menuTask) {
    closeTaskQuickDateMenu();
    return;
  }

  const task = tasks.value.find(item => item.id === menuTask.id)
    || tasks.value.find(item => item.blockId && item.blockId === menuTask.blockId)
    || menuTask;

  const currentStartDate = normalizeDateInputValue((task.startDate || '').toString());
  const currentDueDate = normalizeDateInputValue((task.dueDate || '').toString());
  const currentStartTime = normalizeTimeInputValue((task.startTime || '').toString());
  const currentDueTime = normalizeTimeInputValue((task.dueTime || '').toString());

  const nextStartDate = normalizeDateInputValue(taskQuickDateDraft.value.startDate || '');
  let nextDueDate = normalizeDateInputValue(taskQuickDateDraft.value.dueDate || '');
  if (nextStartDate && nextDueDate && nextDueDate < nextStartDate) {
    nextDueDate = nextStartDate;
  }
  const nextStartTime = nextStartDate ? normalizeTimeInputValue(taskQuickDateDraft.value.startTime || '') : '';
  const nextDueTime = nextDueDate ? normalizeTimeInputValue(taskQuickDateDraft.value.dueTime || '') : '';

  if (
    currentStartDate === nextStartDate
    && currentDueDate === nextDueDate
    && currentStartTime === nextStartTime
    && currentDueTime === nextDueTime
  ) {
    closeTaskQuickDateMenu();
    return;
  }

  const blockId = typeof task.blockId === 'string' ? task.blockId.trim() : '';
  try {
    if (task.type === 'block' && blockId) {
      await setBlockAttrs(blockId, {
        'custom-task-start-date': nextStartDate || '',
        'custom-task-due-date': nextDueDate || '',
        'custom-task-start-time': nextStartTime || '',
        'custom-task-due-time': nextDueTime || ''
      });
    }

    const nowIso = new Date().toISOString();
    patchTask(tasks.value, task.id, (targetTask) => {
      targetTask.startDate = nextStartDate || '';
      targetTask.dueDate = nextDueDate || '';
      targetTask.startTime = nextStartTime || '';
      targetTask.dueTime = nextDueTime || '';
      targetTask.updatedAt = nowIso;
    }, 'id');

    const activeDraft = activeTaskEditDraft.value;
    if (activeDraft && activeDraft.taskId === task.id) {
      activeDraft.startDate = nextStartDate || '';
      activeDraft.dueDate = nextDueDate || '';
      activeDraft.startTime = nextStartTime || '';
      activeDraft.dueTime = nextDueTime || '';
    }

    crdtRepo.updateTaskField(task.id, 'startDate', nextStartDate || '');
    crdtRepo.updateTaskField(task.id, 'dueDate', nextDueDate || '');
    crdtRepo.updateTaskField(task.id, 'startTime', nextStartTime || '');
    crdtRepo.updateTaskField(task.id, 'dueTime', nextDueTime || '');

    const updatedTask = tasks.value.find(item => item.id === task.id) || {
      ...task,
      startDate: nextStartDate || '',
      dueDate: nextDueDate || '',
      startTime: nextStartTime || '',
      dueTime: nextDueTime || '',
      updatedAt: nowIso
    };
    eventBus.emit('task-date-changed', updatedTask);
    if (blockId) {
      eventBus.emit(Events.TASK_CHANGED, { blockIds: [blockId] });
    }
    await refreshInternalState();
    closeTaskQuickDateMenu();
  } catch {
  }
}

async function applyBatchEdit(): Promise<void> {
  if (isBatchApplying.value) {
    return;
  }
  const selectedIds = Array.from(batchSelectedTaskIds.value);
  if (selectedIds.length === 0) {
    showMessage('请先选择任务', 2200, 'error');
    return;
  }

  const nextStatus = isBatchStatus(batchEditStatus.value) ? batchEditStatus.value : null;
  const nextPriority = isBatchPriority(batchEditPriority.value) ? batchEditPriority.value : null;
  const rawGroupSelection = typeof batchEditGroupId.value === 'string' ? batchEditGroupId.value.trim() : '';
  const validGroupIds = visibleTaskGroupIdSet.value;
  let nextGroupId: string | null = null;
  if (rawGroupSelection) {
    if (rawGroupSelection === TASK_GROUP_NONE_ID) {
      nextGroupId = '';
    } else if (validGroupIds.has(rawGroupSelection)) {
      nextGroupId = rawGroupSelection;
    } else {
      showMessage('请选择有效标签', 2200, 'error');
      return;
    }
  }

  if (!nextStatus && !nextPriority && nextGroupId === null) {
    showMessage('请选择要批量修改的字段', 2200, 'error');
    return;
  }

  type BatchTaskUpdate = {
    task: Task;
    blockId: string;
    attrs: Record<string, string>;
    nextStatus: Task['status'] | null;
    nextPriority: Task['priority'] | null;
    nextGroupId: string | undefined | null;
  };
  const updates: BatchTaskUpdate[] = [];

  for (const taskId of selectedIds) {
    const task = tasks.value.find(item => item.id === taskId);
    if (!task || task.type !== 'block') {
      continue;
    }
    const blockId = typeof task.blockId === 'string' ? task.blockId.trim() : '';
    if (!blockId) {
      continue;
    }

    const attrs: Record<string, string> = {};
    let changedStatus: Task['status'] | null = null;
    let changedPriority: Task['priority'] | null = null;
    let changedGroupId: string | undefined | null = null;

    if (nextStatus && task.status !== nextStatus) {
      Object.assign(attrs, buildTaskStatusAttrs(nextStatus, task.completedAt));
      changedStatus = nextStatus;
    }

    if (nextPriority && task.priority !== nextPriority) {
      attrs['custom-task-priority'] = nextPriority;
      changedPriority = nextPriority;
    }

    if (nextGroupId !== null) {
      const currentGroupId = typeof task.groupId === 'string' ? task.groupId.trim() : '';
      if (currentGroupId !== nextGroupId) {
        attrs['custom-task-group'] = nextGroupId;
        changedGroupId = nextGroupId || undefined;
      }
    }

    if (Object.keys(attrs).length === 0) {
      continue;
    }

    updates.push({
      task,
      blockId,
      attrs,
      nextStatus: changedStatus,
      nextPriority: changedPriority,
      nextGroupId: changedGroupId
    });
  }

  if (updates.length === 0) {
    showMessage('未检测到可更新的任务', 2200, 'info');
    return;
  }

  isBatchApplying.value = true;
  try {
    const results = await Promise.allSettled(
      updates.map(async (item) => {
        await setBlockAttrs(item.blockId, item.attrs);
        if (item.nextStatus) {
          await updateTaskMarkdown(item.blockId, item.nextStatus === 'completed');
        }
      })
    );

    const nowIso = new Date().toISOString();
    const changedBlockIds: string[] = [];
    let successCount = 0;
    let failedCount = 0;
    let hasNewlyCompletedTask = false;

    results.forEach((result, index) => {
      const update = updates[index];
      if (!update) {
        return;
      }
      if (result.status !== 'fulfilled') {
        failedCount += 1;
        return;
      }

      successCount += 1;
      changedBlockIds.push(update.blockId);

      patchTask(tasks.value, update.task.id, (targetTask) => {
        if (update.nextStatus) {
          targetTask.status = update.nextStatus;
          if (update.nextStatus === 'completed') {
            targetTask.completedAt = targetTask.completedAt || nowIso;
            hasNewlyCompletedTask = true;
          } else {
            delete targetTask.completedAt;
          }
        }
        if (update.nextPriority) {
          targetTask.priority = update.nextPriority;
        }
        if (update.nextGroupId !== null) {
          targetTask.groupId = update.nextGroupId;
        }
        targetTask.updatedAt = nowIso;
      }, 'id');

      if (update.nextStatus) {
        crdtRepo.updateTaskField(update.task.id, 'status', update.nextStatus);
      }
      if (update.nextPriority) {
        crdtRepo.updateTaskField(update.task.id, 'priority', update.nextPriority);
      }
      if (update.nextGroupId !== null) {
        crdtRepo.updateTaskField(update.task.id, 'groupId', update.nextGroupId);
      }

      const editedTask = taskEditDraft.value;
      if (editedTask && editedTask.taskId === update.task.id) {
        if (update.nextStatus) {
          editedTask.status = update.nextStatus;
        }
        if (update.nextPriority) {
          editedTask.priority = update.nextPriority;
        }
        if (update.nextGroupId !== null) {
          editedTask.groupId = update.nextGroupId || '';
        }
      }
    });

    await refreshInternalState();
    if (changedBlockIds.length > 0) {
      eventBus.emit(Events.TASK_CHANGED, { blockIds: changedBlockIds });
    }
    if (hasNewlyCompletedTask && taskCompletionSoundEnabled.value) {
      playTaskCompletionSound();
    }

    if (successCount > 0) {
      showMessage(`已批量更新 ${successCount} 项任务`, 2200, 'info');
    }
    if (failedCount > 0) {
      showMessage(`有 ${failedCount} 项任务更新失败`, 3000, 'error');
    }
  } finally {
    isBatchApplying.value = false;
  }
}

async function quickSaveTaskStatus(task: Task, status: Task['status']): Promise<void> {
  const wasCompleted = task.status === 'completed';
  await applyTaskEditorFieldUpdate(task, {
    attrs: {
      'custom-task-status': status
    },
    isUnchanged: draft => draft.status === status && task.status === status,
    syncDraft: draft => {
      draft.status = status;
    },
    syncTask: targetTask => {
      targetTask.status = status;
      if (status === 'completed') {
        targetTask.completedAt = targetTask.completedAt || new Date().toISOString();
      } else {
        delete targetTask.completedAt;
      }
    },
    syncCrdt: () => {
      crdtRepo.updateTaskField(task.id, 'status', status);
    },
    beforePersist: async (blockId) => {
      await updateTaskMarkdown(blockId, status === 'completed');
    },
    emitTaskChanged: true
  });

  if (!wasCompleted && status === 'completed' && taskCompletionSoundEnabled.value) {
    const refreshedTask = tasks.value.find(item => item.id === task.id);
    if (refreshedTask?.status === 'completed') {
      playTaskCompletionSound();
    }
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

async function quickSaveTaskPinned(task: Task, pinned: boolean): Promise<void> {
  await applyTaskEditorFieldUpdate(task, {
    attrs: {
      'custom-task-pinned': pinned ? '1' : ''
    },
    isUnchanged: draft => draft.pinned === pinned && (task.pinned === true) === pinned,
    syncDraft: draft => {
      draft.pinned = pinned;
    },
    syncTask: targetTask => {
      targetTask.pinned = pinned;
    },
    syncCrdt: () => {
      crdtRepo.updateTaskField(task.id, 'pinned', pinned);
    },
    emitTaskChanged: true
  });
}

function normalizeTaskEditorDateFields(value: {
  startDate?: string;
  startTime?: string;
  dueDate?: string;
  dueTime?: string;
}): TaskEditorDateFields {
  const startDate = normalizeDateInputValue(value.startDate || '');
  let dueDate = normalizeDateInputValue(value.dueDate || '');
  if (startDate && dueDate && dueDate < startDate) {
    dueDate = startDate;
  }
  const startTime = startDate ? normalizeTimeInputValue(value.startTime || '') : '';
  const dueTime = dueDate ? normalizeTimeInputValue(value.dueTime || '') : '';
  return {
    startDate,
    startTime,
    dueDate,
    dueTime
  };
}

function isSameTaskEditorDateFields(a: TaskEditorDateFields, b: TaskEditorDateFields): boolean {
  return a.startDate === b.startDate
    && a.startTime === b.startTime
    && a.dueDate === b.dueDate
    && a.dueTime === b.dueTime;
}

async function quickSaveTaskDateFields(task: Task, value: TaskEditorDateFields): Promise<void> {
  const normalizedFields = normalizeTaskEditorDateFields(value);
  const currentFields = normalizeTaskEditorDateFields({
    startDate: (task.startDate || '').toString(),
    startTime: (task.startTime || '').toString(),
    dueDate: (task.dueDate || '').toString(),
    dueTime: (task.dueTime || '').toString()
  });
  await applyTaskEditorFieldUpdate(task, {
    attrs: {
      'custom-task-start-date': normalizedFields.startDate || '',
      'custom-task-due-date': normalizedFields.dueDate || '',
      'custom-task-start-time': normalizedFields.startTime || '',
      'custom-task-due-time': normalizedFields.dueTime || ''
    },
    isUnchanged: draft => {
      const normalizedDraft = normalizeTaskEditorDateFields(draft);
      return isSameTaskEditorDateFields(normalizedDraft, normalizedFields)
        && isSameTaskEditorDateFields(currentFields, normalizedFields);
    },
    syncDraft: draft => {
      draft.startDate = normalizedFields.startDate;
      draft.startTime = normalizedFields.startTime;
      draft.dueDate = normalizedFields.dueDate;
      draft.dueTime = normalizedFields.dueTime;
    },
    syncTask: targetTask => {
      targetTask.startDate = normalizedFields.startDate;
      targetTask.startTime = normalizedFields.startTime;
      targetTask.dueDate = normalizedFields.dueDate;
      targetTask.dueTime = normalizedFields.dueTime;
    },
    syncCrdt: () => {
      crdtRepo.updateTaskField(task.id, 'startDate', normalizedFields.startDate);
      crdtRepo.updateTaskField(task.id, 'startTime', normalizedFields.startTime);
      crdtRepo.updateTaskField(task.id, 'dueDate', normalizedFields.dueDate);
      crdtRepo.updateTaskField(task.id, 'dueTime', normalizedFields.dueTime);
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

function shouldEnableMobileCalendarDrag(): boolean {
  return props.enableMobileCalendarDrag && isMobileFrontend && !isBatchEditMode.value;
}

function shouldIgnoreMobileCalendarDragTarget(target: EventTarget | null): boolean {
  const element = target instanceof Element
    ? target
    : (target instanceof Node ? target.parentElement : null);
  if (!element) {
    return false;
  }
  return !!element.closest(
    'button, input, textarea, select, a, [contenteditable="true"], .task-checkbox-wrapper, .task-card-action-btn'
  );
}

function suppressTaskCardClick(taskId: string): void {
  suppressedTaskCardClicks.set(taskId, Date.now() + 450);
}

function shouldSuppressTaskCardClick(taskId: string): boolean {
  const expiresAt = suppressedTaskCardClicks.get(taskId);
  if (!expiresAt) {
    return false;
  }
  if (expiresAt <= Date.now()) {
    suppressedTaskCardClicks.delete(taskId);
    return false;
  }
  return true;
}

function releaseMobileCalendarPointerCapture(gesture: MobileCalendarPointerGesture | null): void {
  if (!gesture?.captureElement) {
    return;
  }
  try {
    if (gesture.captureElement.hasPointerCapture?.(gesture.pointerId)) {
      gesture.captureElement.releasePointerCapture(gesture.pointerId);
    }
  } catch {
    // Ignore pointer capture errors from browsers that auto-release on cancel.
  }
}

function clearMobileCalendarPointerGesture(emitCancel = false): void {
  const gesture = mobileCalendarPointerGesture.value;
  if (gesture?.timerId != null) {
    window.clearTimeout(gesture.timerId);
  }
  releaseMobileCalendarPointerCapture(gesture);
  if (emitCancel && gesture?.started) {
    emit('mobileCalendarDragCancel');
  }
  mobileCalendarPointerGesture.value = null;
  mobileCalendarDraggingTaskId.value = null;
}

function triggerMobileCalendarHaptic(): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return;
  }
  navigator.vibrate(12);
}

function handleMobileTaskPointerDown(event: PointerEvent, task: Task): void {
  if (!shouldEnableMobileCalendarDrag()) {
    return;
  }
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return;
  }
  if (!event.isPrimary || shouldIgnoreMobileCalendarDragTarget(event.target)) {
    clearMobileCalendarPointerGesture(true);
    return;
  }

  clearMobileCalendarPointerGesture(true);

  const timerId = window.setTimeout(() => {
    const gesture = mobileCalendarPointerGesture.value;
    if (!gesture || gesture.pointerId !== event.pointerId || gesture.task.id !== task.id) {
      return;
    }
    gesture.started = true;
    mobileCalendarDraggingTaskId.value = task.id;
    triggerMobileCalendarHaptic();
    emit('mobileCalendarDragStart', {
      task,
      clientX: gesture.latestX,
      clientY: gesture.latestY
    });
  }, MOBILE_CALENDAR_DRAG_LONG_PRESS_MS);

  mobileCalendarPointerGesture.value = {
    task,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    latestX: event.clientX,
    latestY: event.clientY,
    timerId,
    started: false,
    captureElement: null
  };
}

function handleMobileTaskPointerMove(event: PointerEvent): void {
  const gesture = mobileCalendarPointerGesture.value;
  if (!gesture || gesture.pointerId !== event.pointerId) {
    return;
  }

  gesture.latestX = event.clientX;
  gesture.latestY = event.clientY;

  if (!gesture.started) {
    const movedDistance = Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY);
    if (movedDistance > MOBILE_CALENDAR_DRAG_MOVE_THRESHOLD_PX) {
      clearMobileCalendarPointerGesture();
    }
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  emit('mobileCalendarDragMove', {
    task: gesture.task,
    clientX: event.clientX,
    clientY: event.clientY
  });
}

function handleDocumentMobileTaskPointerMove(event: PointerEvent): void {
  if (!mobileCalendarPointerGesture.value) {
    return;
  }
  handleMobileTaskPointerMove(event);
}

function handleDocumentMobileTaskTouchMove(event: TouchEvent): void {
  const gesture = mobileCalendarPointerGesture.value;
  if (!gesture) {
    return;
  }
  const touch = event.touches[0];
  if (!touch) {
    return;
  }
  if (!gesture.started) {
    const movedDistance = Math.hypot(touch.clientX - gesture.startX, touch.clientY - gesture.startY);
    if (movedDistance > MOBILE_CALENDAR_DRAG_MOVE_THRESHOLD_PX) {
      clearMobileCalendarPointerGesture();
    }
    return;
  }
  event.preventDefault();
  gesture.latestX = touch.clientX;
  gesture.latestY = touch.clientY;
  emit('mobileCalendarDragMove', {
    task: gesture.task,
    clientX: touch.clientX,
    clientY: touch.clientY
  });
}

function handleDocumentMobileTaskTouchEnd(event: TouchEvent): void {
  const gesture = mobileCalendarPointerGesture.value;
  if (!gesture) {
    return;
  }
  if (gesture.timerId !== null) {
    window.clearTimeout(gesture.timerId);
  }
  if (!gesture.started) {
    clearMobileCalendarPointerGesture();
    return;
  }
  suppressTaskCardClick(gesture.task.id);
  const touch = event.changedTouches[0];
  emit('mobileCalendarDragEnd', {
    task: gesture.task,
    clientX: touch?.clientX ?? gesture.latestX,
    clientY: touch?.clientY ?? gesture.latestY
  });
  clearMobileCalendarPointerGesture();
}

function handleDocumentMobileTaskTouchCancel(): void {
  const gesture = mobileCalendarPointerGesture.value;
  if (!gesture) {
    return;
  }
  if (gesture.started) {
    emit('mobileCalendarDragCancel');
  }
  clearMobileCalendarPointerGesture();
}

function finishMobileTaskPointer(event: PointerEvent, cancelled: boolean): void {
  const gesture = mobileCalendarPointerGesture.value;
  if (!gesture || gesture.pointerId !== event.pointerId) {
    return;
  }

  if (gesture.timerId !== null) {
    window.clearTimeout(gesture.timerId);
  }

  if (!gesture.started) {
    clearMobileCalendarPointerGesture();
    return;
  }

  suppressTaskCardClick(gesture.task.id);
  event.preventDefault();

  if (cancelled) {
    emit('mobileCalendarDragCancel');
  } else {
    emit('mobileCalendarDragEnd', {
      task: gesture.task,
      clientX: event.clientX,
      clientY: event.clientY
    });
  }

  clearMobileCalendarPointerGesture();
}

function handleMobileTaskPointerUp(event: PointerEvent): void {
  finishMobileTaskPointer(event, false);
}

function handleMobileTaskPointerCancel(event: PointerEvent): void {
  finishMobileTaskPointer(event, true);
}

function handleDocumentMobileTaskPointerUp(event: PointerEvent): void {
  if (!mobileCalendarPointerGesture.value) {
    return;
  }
  handleMobileTaskPointerUp(event);
}

function handleDocumentMobileTaskPointerCancel(event: PointerEvent): void {
  if (!mobileCalendarPointerGesture.value) {
    return;
  }
  handleMobileTaskPointerCancel(event);
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
  document.addEventListener('pointermove', handleDocumentMobileTaskPointerMove);
  document.addEventListener('pointerup', handleDocumentMobileTaskPointerUp);
  document.addEventListener('pointercancel', handleDocumentMobileTaskPointerCancel);
  document.addEventListener('touchmove', handleDocumentMobileTaskTouchMove, { passive: false });
  document.addEventListener('touchend', handleDocumentMobileTaskTouchEnd);
  document.addEventListener('touchcancel', handleDocumentMobileTaskTouchCancel);
  window.addEventListener('resize', scheduleTaskVirtualUpdate, true);
  document.addEventListener('mousedown', handleTaskFilterOutsideClick, true);
  window.addEventListener('resize', handleTaskFilterPopoverViewportChange, true);
  window.addEventListener('scroll', handleTaskFilterPopoverViewportChange, true);
  taskModalTeleportTarget.value?.addEventListener('scroll', handleTaskFilterPopoverViewportChange, true);
  await loadSettings();
  TaskRepository.setAutoRecognizeTaskDateEnabled(userSettings.taskManager.autoRecognizeTaskDate === true);
  taskGroups.value = await loadTaskGroups();
  documentGroups.value = sortDocumentGroups(await loadDocumentGroups());
  const storedGroupId = typeof userSettings.taskManager.selectedGroupId === 'string'
    ? userSettings.taskManager.selectedGroupId
    : '';
  if (storedGroupId && taskGroups.value.some(group => group.id === storedGroupId && group.hidden !== true)) {
    lastSelectedTaskGroupId.value = storedGroupId;
  } else {
    lastSelectedTaskGroupId.value = '';
  }
  applyExcludedNotebookScope(normalizeNotebookIds(userSettings.taskManager.excludedNotebookIds));

  await loadNotebooks();
  await refreshTaskDocumentOptions(true);
  
  filterNotebook.value = userSettings.taskManager.filterSource
    || (userSettings.taskManager.filterNotebook && userSettings.taskManager.filterNotebook !== 'all'
      ? buildNotebookDocumentSource(userSettings.taskManager.filterNotebook)
      : 'all');
  filterDocument.value = userSettings.taskManager.filterDocument || 'all';
  archiveViewMode.value = 'active';
  showCompletedTasks.value = userSettings.taskManager.showCompletedTasks !== false;
  taskListGroupBy.value = normalizeTaskListGroupMode(userSettings.taskManager.taskListGroupBy);
  taskListViewMode.value = normalizeTaskListViewMode(userSettings.taskManager.taskListViewMode);
  showTaskCardDetails.value = normalizeTaskCardDetailsVisible(userSettings.taskManager.showTaskCardDetails);
  restoreTaskPopoverFiltersFromSettings();
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
      lastLoadedScope = { includeCompleted: showCompletedTasks.value, includeArchived: false };
    }
  } finally {
    loading.value = false;
  }

  isHydratingFilters = false;
  // First paint from cache, then silently reconcile with source of truth once.
  void refreshTasks(true, { showLoading: false, compareExisting: true, source: 'mounted-reconcile' });
});

onUnmounted(() => {
  clearMobileCalendarPointerGesture();
  document.removeEventListener('pointermove', handleDocumentMobileTaskPointerMove);
  document.removeEventListener('pointerup', handleDocumentMobileTaskPointerUp);
  document.removeEventListener('pointercancel', handleDocumentMobileTaskPointerCancel);
  document.removeEventListener('touchmove', handleDocumentMobileTaskTouchMove);
  document.removeEventListener('touchend', handleDocumentMobileTaskTouchEnd);
  document.removeEventListener('touchcancel', handleDocumentMobileTaskTouchCancel);
  closeTaskEditMenu();
  closeTaskFilterPopover();
  closeTaskGroupMenu();
  closeTaskQuickDateMenu();
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
  if (taskPopoverFilterSettingsUpdateTimer !== null) {
    clearTimeout(taskPopoverFilterSettingsUpdateTimer);
    taskPopoverFilterSettingsUpdateTimer = null;
  }
  if (taskListGroupSettingsUpdateTimer !== null) {
    clearTimeout(taskListGroupSettingsUpdateTimer);
    taskListGroupSettingsUpdateTimer = null;
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

.task-search-row {
  margin: -4px 0 12px;
  padding: 0 2px;
  box-sizing: border-box;
}

.task-search-input {
  width: 100%;
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--b3-theme-border);
  border-radius: 10px;
  box-sizing: border-box;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  font-size: 12px;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.task-search-input::placeholder {
  color: var(--b3-theme-on-surface);
  opacity: 0.62;
}

.task-search-input:focus {
  border-color: #f98f7a;
  box-shadow: 0 0 0 3px rgba(249, 143, 122, 0.14);
}

.task-batch-toolbar {
  margin: -2px 2px 12px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid var(--b3-theme-border);
  background: var(--b3-theme-background);
  box-shadow: #0000000a 0 1px 4px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-batch-toolbar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.task-batch-selected-count {
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  font-weight: 600;
}

.task-batch-toolbar-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.task-batch-tool-btn {
  border: none;
  height: 24px;
  padding: 0 8px;
  border-radius: 6px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-surface);
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease, opacity 0.15s ease;
}

.task-batch-tool-btn:hover {
  color: var(--b3-theme-on-background);
}

.task-batch-tool-btn:disabled {
  opacity: 0.56;
  cursor: not-allowed;
}

.task-batch-edit-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-end;
}

.task-batch-field {
  min-width: 0;
  flex: 1 1 120px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.task-batch-field > span {
  font-size: 11px;
  color: var(--b3-theme-on-surface);
  opacity: 0.76;
}

.task-batch-field :deep(.b3-select) {
  width: 100%;
}

.task-batch-apply-btn {
  border: none;
  height: 28px;
  padding: 0 12px;
  border-radius: 7px;
  background: #f98f7a;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.task-batch-apply-btn:hover {
  transform: translateY(-1px);
}

.task-batch-apply-btn:disabled {
  opacity: 0.52;
  cursor: not-allowed;
  transform: none;
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
  gap: 4px;
  padding: 12px;
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
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 18px 18px;
}

.task-move-dialog-field {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.task-move-dialog-field :deep(.b3-select.fn__flex-center) {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
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
  gap: 2px;
  flex-shrink: 0;
  position: relative;
}

.archive-mode-switch {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border-radius: 8px;
  background: var(--b3-list-hover);
}

.archive-mode-btn {
  border: none;
  height: 24px;
  min-width: 44px;
  padding: 0 8px;
  border-radius: 6px;
  background: transparent;
  color: var(--b3-theme-on-surface);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.archive-mode-btn:hover {
  color: var(--b3-theme-on-background);
}

.archive-mode-btn.active {
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
}

.task-filter-control {
  position: relative;
}

.task-search-control {
  position: relative;
}

.task-group-menu-control {
  position: relative;
}

.task-search-btn,
.task-group-menu-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--b3-theme-on-surface);
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.task-search-btn:hover,
.task-search-btn.active,
.task-group-menu-btn:hover,
.task-group-menu-btn.active {
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
}

.task-search-btn svg,
.task-group-menu-btn svg {
  width: 16px;
  height: 16px;
}

.task-search-btn svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.task-group-menu-btn svg {
  fill: currentColor;
}

.task-group-menu-btn.is-batch-active,
.task-group-menu-btn.is-batch-active:hover {
  background-color: var(--b3-theme-on-background);
  color: var(--b3-theme-background);
}

.task-group-menu-popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 152px;
  border-radius: 10px;
  border: 1px solid var(--b3-theme-border);
  background: var(--b3-theme-background);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.16);
  padding: 6px;
  z-index: 15;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.task-group-menu-item {
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
  justify-content: space-between;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.task-group-menu-item:hover {
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
}

.task-group-menu-item.active {
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  font-weight: 600;
}

.task-group-menu-check {
  color: #f98f7a;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
}

.task-group-menu-divider {
  height: 1px;
  margin: 2px 4px;
  background: var(--b3-border-color);
  opacity: 0.7;
}

.task-filter-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  padding: 2px;
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

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.task-batch-item {
  border-radius: 10px;
}

.task-batch-item.mobile-calendar-drag-source {
  -webkit-touch-callout: none;
}

.task-batch-item.mobile-calendar-dragging {
  touch-action: none;
}

.task-batch-item.mobile-calendar-drag-source :deep(.task-card.variant-sidebar) {
  transition: transform 0.16s ease, box-shadow 0.16s ease, opacity 0.16s ease;
}

.task-batch-item.mobile-calendar-dragging :deep(.task-card.variant-sidebar) {
  opacity: 0.88;
  transform: scale(0.985);
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.18), 0 10px 22px rgba(15, 23, 42, 0.14);
}

.task-batch-item.is-batch-mode :deep(.task-card.variant-sidebar) {
  cursor: pointer;
}

.task-batch-item.is-batch-mode :deep(.task-card.variant-sidebar .task-card-content) {
  cursor: pointer;
}

.task-batch-item.is-batch-mode:hover :deep(.task-card.variant-sidebar) {
  box-shadow: 0 0 0 1px rgba(249, 143, 122, 0.35), 0 2px 8px rgba(0, 0, 0, 0.08);
}

.task-batch-item.selected :deep(.task-card.variant-sidebar) {
  background: var(--b3-list-hover);
  box-shadow: 0 0 0 1px rgba(249, 143, 122, 0.78), 0 4px 12px rgba(249, 143, 122, 0.18);
}

.tasks-list:not(.is-list-view) .task-group-section-body,
.tasks-list:not(.is-list-view) .task-virtual-spacer {
  padding: 0 2px;
  box-sizing: border-box;
}

.task-grouped-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-grouped-list.is-list-view {
  gap: 8px;
  padding: 0 2px;
  box-sizing: border-box;
}

.task-group-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.task-group-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 2px;
}

.task-group-section-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.task-group-section-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--b3-theme-on-surface);
  font-weight: 600;
  margin-left: 4px;
}

.task-group-section-batch-checkbox {
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

.task-group-section-batch-checkbox:hover {
  background: var(--b3-list-hover);
}

.task-group-section-batch-checkbox :deep(.task-checkbox) {
  --task-checkbox-fill: var(--b3-list-hover);
  --task-checkbox-border: var(--b3-theme-border);
}

.task-group-section-batch-checkbox.partial :deep(.task-checkbox) {
  fill: #f98f7a;
  stroke: none;
  opacity: 0.45;
}

.task-group-section-batch-checkbox.is-disabled {
  opacity: 0.42;
  cursor: not-allowed;
  pointer-events: none;
}

.task-group-section-count {
  min-width: 22px;
  height: 18px;
  padding: 0 2px;
  color: var(--b3-theme-on-surface);
  font-size: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
}

.task-group-section-toggle {
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--b3-theme-on-surface);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
  padding: 0;
}

.task-group-section-toggle:hover {
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
}

.task-group-section-toggle svg {
  width: 14px;
  height: 14px;
  transition: transform 0.2s ease;
  transform: rotate(90deg);
}

.task-group-section-toggle.collapsed svg {
  transform: rotate(0deg);
}

.task-group-section-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tasks-list.is-list-view .task-group-section {
  border: 1px solid var(--b3-theme-border);
  border-radius: 10px;
  background: var(--b3-theme-background);
  box-shadow: #0000000f 0 1px 5px;
  padding: 8px;
  gap: 8px;
}

.tasks-list.is-list-view .task-group-section-header {
  padding: 0;
}

.tasks-list.is-list-view .task-group-section-body {
  gap: 0;
}

.tasks-list.is-list-view .task-group-section-body :deep(.task-card.variant-sidebar) {
  background: transparent;
  box-shadow: none;
  border-radius: 0;
  padding: 8px 2px;
  border-bottom: 1px solid var(--b3-theme-border);
}

.tasks-list.is-list-view .task-group-section-body :deep(.task-card.variant-sidebar:hover) {
  box-shadow: none;
}

.tasks-list.is-list-view .task-group-section-body :deep(.task-card.variant-sidebar:last-child) {
  border-bottom: none;
}

.tasks-list.is-list-view .task-batch-item.selected :deep(.task-card.variant-sidebar) {
  background: var(--b3-list-hover);
  box-shadow: none;
}

.task-virtual-spacer {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

@media (max-width: 560px) {
  .task-batch-edit-grid {
    flex-direction: column;
    align-items: stretch;
  }

  .task-batch-apply-btn {
    width: 100%;
  }
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
  padding: 2px 24px 2px 8px;
  border-radius: 6px;
  height: 24px;
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
