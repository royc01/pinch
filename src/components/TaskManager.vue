<template>
  <div ref="taskManagerContainerRef" class="task-manager-container">
    <div class="task-manager-header" :class="{ 'is-collapsed': isTaskListCollapsed }">
      <div class="header-left">
        <div class="collapse-arrow" @click="toggleTaskListCollapsed" :class="{ collapsed: isTaskListCollapsed }">
          <Icon name="arrowDown" width="16" height="16" class="icon" />
        </div>
        <div class="title">{{ t('taskManager.title') }}</div>
      </div>
      <div class="header-actions">
        <div ref="kernelDiagnosticsControlRef" class="kernel-diagnostics-control">
          <SyButton
            size="small"
            class="task-kernel-status ariaLabel"
            :class="{
              active: kernelDiagnosticsVisible,
              'is-connected': kernelDiagnostics.status === 'connected',
              'is-error': kernelDiagnostics.status === 'error'
            }"
            :aria-label="t('taskManager.kernelStatus')"
            @click.stop="toggleKernelDiagnostics"
          >
            <Icon name="statsBar" width="20" height="20" class="icon" />
          </SyButton>
          <div
            v-if="kernelDiagnosticsVisible"
            class="kernel-diagnostics-popover"
            @click.stop
          >
            <div class="kernel-diagnostics-head">
              <span class="kernel-diagnostics-title">{{ t('taskManager.kernelStatus') }}</span>
              <span
                class="kernel-diagnostics-badge"
                :class="`status-${kernelDiagnostics.status}`"
              >
                {{ kernelDiagnosticsStatusLabel }}
              </span>
            </div>
            <div v-if="kernelDiagnostics.error" class="kernel-diagnostics-error">
              {{ kernelDiagnostics.error }}
            </div>
            <div class="kernel-diagnostics-grid">
              <span>{{ t('taskManager.source') }}</span>
              <strong>{{ kernelDiagnosticsSourceLabel }}</strong>
              <span>{{ t('taskManager.kernelRows') }}</span>
              <strong>{{ formatKernelDiagnosticNumber(kernelDiagnostics.rows) }}</strong>
              <span>{{ t('taskManager.kernelTopLevelSubtasks') }}</span>
              <strong>{{ formatKernelDiagnosticNumber(kernelDiagnostics.topLevelRows) }} / {{ formatKernelDiagnosticNumber(kernelDiagnostics.subtaskRows) }}</strong>
              <span>{{ t('taskManager.kernelPagesScanned') }}</span>
              <strong>{{ formatKernelDiagnosticNumber(kernelDiagnostics.pageCount) }} / {{ formatKernelDiagnosticNumber(kernelDiagnostics.totalScanned) }}</strong>
              <span>{{ t('taskManager.kernelQueryTime') }}</span>
              <strong>{{ formatKernelDiagnosticMs(kernelDiagnostics.elapsedMs) }}</strong>
              <span>{{ t('taskManager.kernelHierarchyTime') }}</span>
              <strong>{{ formatKernelDiagnosticMs(kernelDiagnostics.hierarchyElapsedMs) }}</strong>
              <span>Ping</span>
              <strong>{{ formatKernelDiagnosticMs(kernelDiagnostics.pingMs) }}</strong>
              <span>{{ t('taskManager.kernelCheckedAt') }}</span>
              <strong>{{ kernelDiagnosticsCheckedAtText }}</strong>
            </div>
            <div v-if="kernelDiagnostics.partial" class="kernel-diagnostics-warning">
              {{ t('taskManager.kernelPartialWarning') }}
            </div>
            <div class="kernel-diagnostics-actions">
              <button
                type="button"
                class="kernel-diagnostics-action ariaLabel"
                :disabled="kernelDiagnosticsChecking"
                :aria-label="t('taskManager.check')"
                @click="checkKernelDiagnostics"
              >
                {{ t('taskManager.check') }}
              </button>
              <button
                type="button"
                class="kernel-diagnostics-action primary ariaLabel"
                :disabled="kernelDiagnosticsChecking"
                :aria-label="t('taskManager.rebuildIndex')"
                @click="rebuildKernelTaskIndex"
              >
                {{ t('taskManager.rebuildIndex') }}
              </button>
            </div>
          </div>
        </div>
        <SyButton
          size="small"
          class="task-refresh ariaLabel"
          :class="{ 'is-refreshing': isRefreshButtonSpinning }"
          :aria-label="t('taskManager.refreshTasks')"
          @click="handleRefreshClick"
        >
          <Icon name="refresh" width="22" height="22" class="icon refresh-icon" />
        </SyButton>
        <SyButton size="small" class="new-task-button ariaLabel" :aria-label="t('taskManager.newTask')" @click="openTaskModal">
          <Icon name="add" width="24" height="24" class="icon" />
        </SyButton>
    </div>
    </div>
    
    <div class="filters-row" v-show="!isTaskListCollapsed">
      <div class="filters-bar">
        <div class="filter-group">
          <label
            class="task-manager-notebook-label ariaLabel"
           
            :aria-label="t('taskManager.source')"
          >
            <Icon name="source" width="16" height="16" class="task-manager-notebook-icon" />
          </label>
          <div class="filter-select-wrap">
            <SourceFilterSelect
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
            class="task-search-btn ariaLabel"
            :class="{ active: taskSearchVisible }"
            :aria-label="t('taskManager.searchTasks')"
            @click.stop="toggleTaskSearch"
          >
            <Icon name="search" width="16" height="16" />
          </button>
        </div>
        <div ref="taskFilterControlRef" class="task-filter-control">
          <button
            type="button"
            class="task-filter-btn ariaLabel"
            :class="{
              active: taskFilterPopoverVisible || hasActiveTaskFilters
            }"
            :aria-label="t('taskManager.filterTasks')"
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
            class="task-group-menu-btn ariaLabel"
            :class="{
              active: taskGroupMenuVisible || taskListGroupBy !== 'none' || taskListViewMode !== 'kanban',
              'is-batch-active': isBatchEditMode
            }"
            :aria-label="t('taskManager.groupTasks')"
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
              <span>{{ isBatchEditMode ? t('taskManager.exitBatchEdit') : t('taskManager.enterBatchEdit') }}</span>
              <span v-if="isBatchEditMode" class="task-group-menu-check">
                <Icon name="taskCheckboxChecked" width="12" height="12" />
              </span>
            </button>
            <button
              type="button"
              class="task-group-menu-item"
              @click.stop="openTaskGroupDialogFromMenu"
            >
              <span>{{ t('taskManager.tagManager') }}</span>
            </button>
            <div class="task-group-menu-divider"></div>
            <button
              type="button"
              class="task-group-menu-item"
              @click.stop="toggleTaskCardDetailsFromMenu"
            >
              <span>{{ showTaskCardDetails ? t('taskManager.hideDetails') : t('taskManager.showDetails') }}</span>
            </button>
            <button
              type="button"
              class="task-group-menu-item"
              :class="{ active: !showCompletedTasks }"
              @click.stop="toggleHideCompletedTasksFromMenu"
            >
              <span>{{ t('taskManager.hideCompletedTasks') }}</span>
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
              <span>{{ areAllVisibleSubtasksExpanded ? t('taskManager.collapseAllDetails') : t('taskManager.expandAllDetails') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="taskListViewMode === 'timeline' && !isTaskListCollapsed" class="task-timeline-tabs" role="tablist">
      <button
        v-for="option in timelineTaskFilterOptions"
        :key="option.value"
        type="button"
        class="task-timeline-tab"
        :class="{ active: timelineTaskFilter === option.value }"
        role="tab"
        :aria-selected="timelineTaskFilter === option.value"
        @click="timelineTaskFilter = option.value"
      >
        {{ option.label }}
      </button>
    </div>

    <div v-if="taskSearchVisible && !isTaskListCollapsed" class="task-search-row">
      <input
        ref="taskSearchInputRef"
        v-model="taskSearchQuery"
            type="text"
            class="task-search-input ariaLabel"
            :placeholder="t('taskManager.searchTasks')"
            :aria-label="t('taskManager.searchTasks')"
            @keydown.esc.stop.prevent="closeTaskSearch"
          />
    </div>

    <div v-if="isBatchEditMode && !isTaskListCollapsed" class="task-batch-toolbar">
      <div class="task-batch-toolbar-header">
        <span class="task-batch-selected-count">{{ t('taskManager.selectedCountPrefix') }} {{ batchSelectedCount }} {{ t('taskManager.selectedCountSuffix') }}</span>
        <div class="task-batch-toolbar-actions">
          <button type="button" class="task-batch-tool-btn" @click="toggleSelectAllVisibleTasks">
            {{ allVisibleTasksSelected ? t('taskManager.cancelSelectAll') : t('taskManager.selectAllCurrentList') }}
          </button>
          <button
            type="button"
            class="task-batch-tool-btn"
            :disabled="batchSelectedCount === 0"
            @click="clearBatchSelection"
          >
            {{ t('taskManager.clearSelection') }}
          </button>
        </div>
      </div>
      <div class="task-batch-edit-grid">
        <label class="task-batch-field">
          <span>{{ t('taskManager.status') }}</span>
          <SySelect
            :model-value="batchEditStatus"
            :options="batchEditStatusOptions"
            @update:model-value="batchEditStatus = String($event || '')"
          />
        </label>
        <label class="task-batch-field">
          <span>{{ t('taskManager.priority') }}</span>
          <SySelect
            :model-value="batchEditPriority"
            :options="batchEditPriorityOptions"
            @update:model-value="batchEditPriority = String($event || '')"
          />
        </label>
        <label class="task-batch-field">
          <span>{{ t('taskManager.batchTagAction') }}</span>
          <SySelect
            :model-value="batchEditTagAction"
            :options="batchEditTagActionOptions"
            @update:model-value="setBatchEditTagAction"
          />
        </label>
        <label class="task-batch-field">
          <span>{{ t('taskManager.tags') }}</span>
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
          {{ isBatchApplying ? t('taskManager.applying') : t('taskManager.applyToSelected') }}
        </button>
      </div>
    </div>

    <TaskFilterPopover
      ref="taskFilterPopoverRef"
      :visible="taskFilterPopoverVisible"
      :popover-style="taskFilterPopoverStyle"
      :has-active="hasActiveTaskFilters"
      :sections="taskFilterSections"
      :expression="taskFilterExpression"
      @clear="clearTaskFilters"
      @toggle="handleTaskFilterToggle"
      @cycle-join="cycleTaskFilterJoin"
    />
    

    <Teleport :to="taskModalTeleportTo" :disabled="!taskModalTeleportTarget">
      <Transition name="task-editor-overlay">
        <TaskEditorPanelShell
          v-show="!isTaskListCollapsed && taskEditorSidebarVisible"
          mode="sidebar"
          :title="taskEditorSidebarTitle"
          :overlay-style="taskEditorSidebarOverlayStyle"
          :panel-style="taskEditorSidebarPanelStyle"
          :show-pin="!!activeTaskEditTask"
          :pin-active="isActiveTaskPinned"
          :show-move="!!activeTaskEditTask"
          :show-archive="!!activeTaskEditTask"
          :is-archived="isActiveTaskArchived"
          :show-delete="!!activeTaskEditTask"
          :show-focus="!!activeTaskEditTask"
          :show-open-content="!!activeTaskEditTask"
          @backdrop-click="closeTaskEditorSidebar"
          @panel-mousedown="handleTaskEditorSidebarPanelMouseDown"
          @pin="handleTaskEditorPinToggle"
          @move="openTaskMoveDialog"
          @archive="handleTaskEditorArchiveToggle"
          @delete="handleTaskEditorDelete"
          @focus="handleTaskEditorStartFocus"
          @open-content="handleTaskEditorOpenContent"
          @close="closeTaskEditorSidebar"
        >
          <TaskEditorProtyleBody
            ref="taskEditorSidebarMountRef"
            :show-description-control="!!(activeTaskEditTask && activeTaskEditDraft)"
            :description="activeTaskEditDraft?.description || ''"
            :has-description="taskEditorHasDescription"
            :description-active="taskEditorQuickPanel === 'description'"
            :description-placeholder="t('taskManager.addTaskDescription')"
            :add-description-label="t('taskManager.addDescription', 'Add description')"
            @open-description="taskEditorQuickPanel = 'description'"
            @update:description="handleTaskEditorDescriptionInput"
            @commit-description="handleTaskEditorDescriptionCommit"
            @close-description="taskEditorQuickPanel = null"
          />
          <TaskEditorMetaPanel
            v-if="activeTaskEditTask && activeTaskEditDraft"
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
            :goal-options="taskGoalPickerOptions"
            :selected-group-id="taskEditorSelectedGroupId"
            :selected-tag-ids="taskEditorSelectedTagIds"
            :selected-goal-ids="taskEditorSelectedGoalIds"
            :group-label="taskEditorGroupLabel"
            :reminder-type="activeTaskEditDraft.reminderType"
            :reminder-custom-time="activeTaskEditDraft.reminderCustomTime || ''"
            :reminder-text="taskEditorReminderText"
            :has-reminder="taskEditorHasReminder"
            :focus-estimate="activeTaskEditDraft.focusEstimate"
            :actual-focus-minutes="taskEditorActualFocus.minutes"
            :actual-focus-sessions="taskEditorActualFocus.sessions"
            :status="activeTaskEditDraft.status"
            :priority="activeTaskEditDraft.priority || 'none'"
            :repeat-frequency="taskEditorRepeatFrequency"
            :repeat-rule="taskEditorRepeatRule"
            :repeat-termination="taskEditorRepeatTermination"
            :group-button-style="taskEditorGroupButtonStyle"
            :default-group-chip-color="defaultGroupChipColor"
            :description-placeholder="t('taskManager.addTaskDescription')"
            :show-description-control="false"
            :show-priority-action="true"
            layout="properties"
            @update:panel="taskEditorQuickPanel = $event"
            @update:description="handleTaskEditorDescriptionInput"
            @update-dates="handleTaskEditorDateFieldsUpdate"
            @select-group="selectTaskEditorGroup"
            @select-goal="selectTaskEditorGoal"
            @select-reminder="handleTaskEditorReminderSelect"
            @select-status="handleTaskEditorStatusSelect"
            @save-focus-estimate="handleTaskEditorFocusEstimateSave"
            @open-focus-estimate="void refreshTaskEditorActualFocus()"
            @select-priority="handleTaskEditorPrioritySelect"
            @save-repeat-rule="handleTaskEditorRepeatRuleSave"
            @commit-description="handleTaskEditorDescriptionCommit"
            @manage-groups="openTaskGroupDialog"
            @manage-goals="void openTaskScopeDialog('goals')"
          />
          <div
            v-if="showTaskMoveDialog"
            class="task-move-dialog-overlay"
            @click.self="closeTaskMoveDialog"
          >
            <div class="task-move-dialog" @click.stop>
              <div class="task-move-dialog-header">
                <span class="task-move-dialog-title">{{ t('taskManager.moveTask') }}</span>
                <button
                  type="button"
                  class="task-move-dialog-close ariaLabel"
                 
                  :aria-label="t('common.close')"
                  @click.stop="closeTaskMoveDialog"
                >
                  <Icon name="close" width="16" height="16" />
                </button>
              </div>
              <div class="task-move-dialog-body">
                <div class="task-move-dialog-field">
                  <label>{{ t('taskManager.notebook') }}</label>
                  <SySelect
                    :model-value="taskMoveSelectedNotebook"
                    :options="taskMoveNotebookOptions"
                    @update:model-value="handleTaskMoveNotebookChange"
                  />
                </div>
                <div class="task-move-dialog-field">
                  <label>{{ t('taskManager.document') }}</label>
                  <SySelect
                    :model-value="taskMoveSelectedDocument"
                    :options="taskMoveDocumentOptions"
                    @update:model-value="taskMoveSelectedDocument = String($event || '')"
                  />
                </div>
                <div v-if="taskMoveTargetUnchanged" class="task-move-dialog-hint">
                  {{ t('taskManager.alreadyInDocument') }}
                </div>
                <div v-else-if="taskMoveDocumentOptions.length === 0" class="task-move-dialog-hint">
                  {{ t('taskManager.noDocumentOptions') }}
                </div>
              </div>
              <div class="task-move-dialog-actions">
                <button
                  type="button"
                  class="task-move-dialog-btn"
                  @click.stop="closeTaskMoveDialog"
                >
                  {{ t('common.cancel') }}
                </button>
                <button
                  type="button"
                  class="task-move-dialog-btn primary"
                  :disabled="!canSubmitTaskMove"
                  @click.stop="handleTaskEditorMove"
                >
                  {{ isTaskMoveSubmitting ? t('taskManager.moving') : t('taskManager.move') }}
                </button>
              </div>
            </div>
          </div>
        </TaskEditorPanelShell>
      </Transition>
    </Teleport>

    <div v-if="loading" class="loading" v-show="!isTaskListCollapsed">{{ t('taskManager.loading') }}</div>
    <div
      v-else
      ref="tasksListRef"
      class="tasks-list b3-typography"
      :class="{
        'is-list-view': taskListViewMode === 'list',
        'is-timeline-view': taskListViewMode === 'timeline'
      }"
      v-show="!isTaskListCollapsed"
    >
      <div v-if="displayedTasks.length === 0" class="empty-state">
        {{ t('taskManager.noTasks') }}
      </div>
      <div
        v-else-if="shouldUseTimelineVirtualList"
        class="task-grouped-list is-timeline-view task-timeline-virtual-list"
        :style="timelineVirtualSpacerStyle"
      >
        <template v-for="row in virtualTimelineRows" :key="row.key">
          <section
            v-if="row.type === 'section' && row.section"
            class="task-group-section timeline-virtual-section-header"
            :class="{ 'timeline-virtual-section-collapsed': row.isSectionEnd }"
            :ref="(el) => setTimelineVirtualRowRef(row.key, el)"
          >
            <header class="task-group-section-header">
              <span v-if="row.section.timelineDateLabel" class="task-timeline-date">
                <strong>{{ row.section.timelineDateLabel.day }}</strong>
                <span>{{ row.section.timelineDateLabel.weekday }}</span>
              </span>
              <span class="task-group-section-title">
                <span
                  v-if="isBatchEditMode"
                  class="task-group-section-batch-checkbox ariaLabel"
                  :class="{
                    partial: isTaskGroupSectionBatchPartiallySelected(row.section),
                    'is-disabled': row.section.tasks.length === 0
                  }"
                  :aria-label="isTaskGroupSectionBatchAllSelected(row.section) ? t('taskManager.cancelSelectGroup') : t('taskManager.selectGroup')"
                  :aria-disabled="row.section.tasks.length === 0"
                  @click.stop="toggleTaskGroupSectionBatchSelection(row.section)"
                >
                  <TaskCheckbox
                    :checked="isTaskGroupSectionBatchAllSelected(row.section)"
                    :size="16"
                  />
                </span>
              </span>
              <div class="task-group-section-header-actions">
                <span class="task-group-section-count">{{ row.section.tasks.length }}</span>
                <button
                  type="button"
                  class="task-group-section-toggle ariaLabel"
                  :class="{ collapsed: isTaskGroupSectionCollapsed(row.section.key) }"
                  :aria-label="isTaskGroupSectionCollapsed(row.section.key) ? t('taskManager.expandGroup') : t('taskManager.collapseGroup')"
                  @click.stop="toggleTaskGroupSectionCollapse(row.section.key)"
                >
                  <Icon name="chevronRight" width="14" height="14" />
                </button>
              </div>
            </header>
          </section>
          <div
            v-else-if="row.type === 'task' && row.task"
            :ref="(el) => setTimelineVirtualRowRef(row.key, el)"
            class="task-batch-item timeline-virtual-task"
            :class="{
              selected: isTaskBatchSelected(row.task.id),
              'is-batch-mode': isBatchEditMode,
              'timeline-entry': row.timelineLabel !== null,
              'timeline-virtual-section-end': row.isSectionEnd,
              'mobile-calendar-drag-source': shouldEnableMobileCalendarDrag(),
              'mobile-calendar-dragging': mobileCalendarDraggingTaskId === row.task.id,
              'calendar-pointer-drag-source': shouldEnableDesktopCalendarPointerDrag(),
              'calendar-pointer-dragging': desktopCalendarDraggingTaskId === row.task.id
            }"
            @pointerdown="handleMobileTaskPointerDown($event, row.task)"
            @pointermove="handleMobileTaskPointerMove"
            @pointerup="handleMobileTaskPointerUp"
            @pointercancel="handleMobileTaskPointerCancel"
          >
            <div v-if="row.timelineLabel !== null" class="task-timeline-entry-meta">
              <span class="task-timeline-time">{{ row.timelineLabel }}</span>
              <span class="task-timeline-node"></span>
            </div>
            <TaskCard
              :data-task-id="row.task.id"
              :task="row.task"
               :completed="row.task.status === 'completed'"
               :disable-status-toggle="isFutureVirtualRepeatPreview(row.task)"
               :show-start-date="isFutureVirtualRepeatPreview(row.task)"
              variant="sidebar"
              :task-groups="taskGroups"
              :goals="goalDefinitions"
              :selected-goal-ids="getTaskManagerGoalIds(row.task)"
              :show-status-badge="true"
              :draggable="shouldUseNativeTaskCardDrag()"
              :expanded="expandedSubtasks.has(row.task.id) || expandedDescriptions.has(row.task.id)"
              :description-editing="inlineEditingDescriptionTaskId === row.task.id"
              :description-draft="getInlineDescriptionDraft(row.task)"
              :show-description="shouldShowTaskCardDetails"
              :show-badges="shouldShowTaskCardDetails"
              :show-subtasks="expandedSubtasks.has(row.task.id)"
              :show-open-content="row.task.type === 'block'"
              :title-tooltip="isBatchEditMode ? t('taskManager.clickSelectTask') : t('taskManager.clickEditTask')"
              :disable-context-menu="shouldEnableMobileCalendarDrag()"
              @card-click="handleTaskCardClick"
              @open-content="handleTaskClick"
              @start-focus="handleTaskCardStartFocus"
              @toggle-status="handleTaskCardToggleStatus"
              @toggle-expand="handleCardToggleExpand"
              @description-start-edit="startInlineDescriptionEdit"
              @description-input="handleInlineDescriptionInput"
              @description-save="saveInlineDescriptionEdit"
              @description-cancel="cancelInlineDescriptionEdit"
              @subtask-toggle="handleCardSubtaskToggle"
              @subtask-open="handleCardSubtaskOpen"
              @dragstart="handleDragStart"
            />
          </div>
        </template>
      </div>
      <div
        v-else-if="shouldRenderGroupedList"
        class="task-grouped-list"
        :class="{
          'is-list-view': taskListViewMode === 'list',
          'is-timeline-view': taskListViewMode === 'timeline'
        }"
      >
        <section
          v-for="section in taskGroupedSections"
          :key="section.key"
          class="task-group-section"
        >
          <header class="task-group-section-header">
            <span v-if="taskListViewMode === 'timeline' && section.timelineDateLabel" class="task-timeline-date">
              <strong>{{ section.timelineDateLabel.day }}</strong>
              <span>{{ section.timelineDateLabel.weekday }}</span>
            </span>
            <span class="task-group-section-title">
              <span
                v-if="isBatchEditMode"
                class="task-group-section-batch-checkbox ariaLabel"
                :class="{
                  partial: isTaskGroupSectionBatchPartiallySelected(section),
                  'is-disabled': section.tasks.length === 0
                }"
               
                :aria-label="isTaskGroupSectionBatchAllSelected(section) ? t('taskManager.cancelSelectGroup') : t('taskManager.selectGroup')"
                :aria-disabled="section.tasks.length === 0"
                @click.stop="toggleTaskGroupSectionBatchSelection(section)"
              >
                <TaskCheckbox
                  :checked="isTaskGroupSectionBatchAllSelected(section)"
                  :size="16"
                />
              </span>
              <span v-if="taskListViewMode !== 'timeline'">{{ section.label }}</span>
            </span>
            <div class="task-group-section-header-actions">
              <span class="task-group-section-count">{{ section.tasks.length }}</span>
              <button
                type="button"
                class="task-group-section-toggle ariaLabel"
                :class="{ collapsed: isTaskGroupSectionCollapsed(section.key) }"
               
                :aria-label="isTaskGroupSectionCollapsed(section.key) ? t('taskManager.expandGroup') : t('taskManager.collapseGroup')"
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
                'timeline-entry': taskListViewMode === 'timeline' && getTaskTimelineLabel(section, task) !== null,
                'mobile-calendar-drag-source': shouldEnableMobileCalendarDrag(),
                'mobile-calendar-dragging': mobileCalendarDraggingTaskId === task.id,
                'calendar-pointer-drag-source': shouldEnableDesktopCalendarPointerDrag(),
                'calendar-pointer-dragging': desktopCalendarDraggingTaskId === task.id
              }"
              @pointerdown="handleMobileTaskPointerDown($event, task)"
              @pointermove="handleMobileTaskPointerMove"
              @pointerup="handleMobileTaskPointerUp"
              @pointercancel="handleMobileTaskPointerCancel"
            >
              <div v-if="taskListViewMode === 'timeline' && getTaskTimelineLabel(section, task) !== null" class="task-timeline-entry-meta">
                <span class="task-timeline-time">{{ getTaskTimelineLabel(section, task) }}</span>
                <span class="task-timeline-node"></span>
              </div>
              <TaskCard
                :data-task-id="task.id"
                :task="task"
                 :completed="task.status === 'completed'"
                 :disable-status-toggle="isFutureVirtualRepeatPreview(task)"
                 :show-start-date="isFutureVirtualRepeatPreview(task)"
                variant="sidebar"
                :task-groups="taskGroups"
                :goals="goalDefinitions"
                :selected-goal-ids="getTaskManagerGoalIds(task)"
                :show-status-badge="true"
                :draggable="shouldUseNativeTaskCardDrag()"
                :expanded="expandedSubtasks.has(task.id) || expandedDescriptions.has(task.id)"
                :description-editing="inlineEditingDescriptionTaskId === task.id"
                :description-draft="getInlineDescriptionDraft(task)"
                :show-description="shouldShowTaskCardDetails"
                :show-badges="shouldShowTaskCardDetails"
                :show-subtasks="expandedSubtasks.has(task.id)"
                :show-open-content="task.type === 'block'"
                :title-tooltip="isBatchEditMode ? t('taskManager.clickSelectTask') : t('taskManager.clickEditTask')"
                :disable-context-menu="shouldEnableMobileCalendarDrag()"
                :ref="(el) => setTaskRowRef(task.id, el)"
                @card-click="handleTaskCardClick"
                @open-content="handleTaskClick"
                @start-focus="handleTaskCardStartFocus"
                @toggle-status="handleTaskCardToggleStatus"
                @toggle-expand="handleCardToggleExpand"
                @description-start-edit="startInlineDescriptionEdit"
                @description-input="handleInlineDescriptionInput"
                @description-save="saveInlineDescriptionEdit"
                @description-cancel="cancelInlineDescriptionEdit"
                @subtask-toggle="handleCardSubtaskToggle"
                @subtask-open="handleCardSubtaskOpen"
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
            'mobile-calendar-dragging': mobileCalendarDraggingTaskId === task.id,
            'calendar-pointer-drag-source': shouldEnableDesktopCalendarPointerDrag(),
            'calendar-pointer-dragging': desktopCalendarDraggingTaskId === task.id
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
             :disable-status-toggle="isFutureVirtualRepeatPreview(task)"
             :show-start-date="isFutureVirtualRepeatPreview(task)"
            variant="sidebar"
            :task-groups="taskGroups"
            :goals="goalDefinitions"
            :selected-goal-ids="getTaskManagerGoalIds(task)"
            :show-status-badge="true"
            :draggable="shouldUseNativeTaskCardDrag()"
            :expanded="expandedSubtasks.has(task.id) || expandedDescriptions.has(task.id)"
            :description-editing="inlineEditingDescriptionTaskId === task.id"
            :description-draft="getInlineDescriptionDraft(task)"
            :show-description="shouldShowTaskCardDetails"
            :show-badges="shouldShowTaskCardDetails"
            :show-subtasks="expandedSubtasks.has(task.id)"
            :show-open-content="task.type === 'block'"
            :title-tooltip="isBatchEditMode ? t('taskManager.clickSelectTask') : t('taskManager.clickEditTask')"
            :disable-context-menu="shouldEnableMobileCalendarDrag()"
            :ref="(el) => setTaskRowRef(task.id, el)"
            @card-click="handleTaskCardClick"
            @open-content="handleTaskClick"
            @start-focus="handleTaskCardStartFocus"
            @toggle-status="handleTaskCardToggleStatus"
            @toggle-expand="handleCardToggleExpand"
            @description-start-edit="startInlineDescriptionEdit"
            @description-input="handleInlineDescriptionInput"
            @description-save="saveInlineDescriptionEdit"
            @description-cancel="cancelInlineDescriptionEdit"
            @subtask-toggle="handleCardSubtaskToggle"
            @subtask-open="handleCardSubtaskOpen"
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
        {{ t('taskManager.moreCompleted') }}
      </button>
    </div>
    
    <Teleport :to="taskModalTeleportTo" :disabled="!taskModalTeleportTarget">
      <QuickCreateTaskModal
        :show="showTaskModal"
        :t="t"
        :notebooks="enabledNotebooks"
        :documents="allDocuments"
        :groups="taskGroups"
        :goals="goalDefinitions"
        :default-group-id="taskModalDefaultGroupId"
        :lastSelectedNotebook="taskModalDefaultNotebook"
        :lastSelectedDocument="taskModalDefaultDocument"
        presentation="center"
        :overlay-style="taskModalOverlayStyle"
        @close="showTaskModal = false"
        @created="handleQuickCreateCreated"
        @manage-groups="openTaskGroupDialog"
      />
    </Teleport>
    <TaskScopeDialog
      :show="showTaskScopeDialog"
      :notebooks="notebooks"
      :excluded-notebook-ids="excludedNotebookIds"
      :show-scope-tab="true"
      :show-completed-tasks="showCompletedTasks"
      :auto-recognize-task-date="autoRecognizeTaskDate"
      :date-recognition-keywords="userSettings.taskManager.dateRecognitionKeywords"
      :global-date-recognizing="isGlobalDateRecognitionRunning"
      :task-completion-sound-enabled="taskCompletionSoundEnabled"
      :show-document-group-notebook-path="showDocumentGroupNotebookPath"
      :show-extra="false"
      :lock-close="requiresScopeInitialization"
      :title="requiresScopeInitialization ? t('taskManager.initScope') : t('taskScopeDialog.settings')"
      :hint="requiresScopeInitialization
        ? t('taskManager.initScopeHint')
        : t('taskManager.scopeHint')"
      :confirm-text="requiresScopeInitialization ? t('taskManager.startUsing') : t('common.save')"
      :initial-tab="taskScopeDialogInitialTab"
      :document-groups="documentGroups"
      :document-group-documents="documentGroupDialogDocuments"
      :all-document-group-documents="allDocumentGroupDocuments"
      :documents-refreshing="taskScopeDocumentsRefreshing"
      :goals="goalDefinitions"
      :goal-documents="sidebarGoalDocuments"
      :goal-tasks="goalTasks"
      :task-view-options="taskScopeViewOptions"
      :hidden-task-view-ids="userSettings.kanban.hiddenViewSwitcherIds"
      :sidebar-section-options="taskScopeSidebarSectionOptions"
      :hidden-sidebar-section-ids="userSettings.sidebar.hiddenSectionIds"
      :sidebar-section-order="userSettings.sidebar.sectionOrder"
      :default-task-create-target="userSettings.taskManager.defaultTaskCreateTarget"
      :default-task-create-notebook="userSettings.taskManager.defaultTaskCreateNotebook"
      :focus-settings="userSettings.focus"
      @close="showTaskScopeDialog = false"
      @global-recognize-date="handleGlobalRecognizeTaskDates"
      @refresh-documents="handleTaskScopeDocumentsRefresh"
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
      :title="t('taskManager.date')"
      :save-label="t('taskManager.saveDate')"
      @update:startDate="taskQuickDateDraft.startDate = $event"
      @update:startTime="taskQuickDateDraft.startTime = $event"
      @update:dueDate="taskQuickDateDraft.dueDate = $event"
      @update:dueTime="taskQuickDateDraft.dueTime = $event"
      @show-meta="handleTaskQuickDateMetaTool"
      @save="handleTaskQuickDateSave"
    />
    <TaskQuickMetaMenu
      :show="taskQuickMetaMenu.show"
      :x="taskQuickMetaMenu.x"
      :y="taskQuickMetaMenu.y"
      :priority="taskQuickMetaDraft.priority"
      :tag-ids="taskQuickMetaDraft.tags"
      :group-options="taskGroupPickerOptions"
      :goal-options="taskGoalPickerOptions"
      :selected-goal-ids="taskQuickMetaDraft.goalIds"
      :start-date="taskQuickMetaDraft.startDate"
      :start-time="taskQuickMetaDraft.startTime"
      :due-date="taskQuickMetaDraft.dueDate"
      :due-time="taskQuickMetaDraft.dueTime"
      :reminder-type="taskQuickMetaDraft.reminderType"
      :reminder-custom-time="taskQuickMetaDraft.reminderCustomTime"
      :initial-panel="taskQuickMetaMenu.initialPanel"
      :panel-only="taskQuickMetaMenu.panelOnly"
      @update:priority="taskQuickMetaDraft.priority = $event"
      @update:startDate="taskQuickMetaDraft.startDate = $event"
      @update:startTime="taskQuickMetaDraft.startTime = $event"
      @update:dueDate="taskQuickMetaDraft.dueDate = $event"
      @update:dueTime="taskQuickMetaDraft.dueTime = $event"
      @update:reminder="handleTaskQuickMetaReminderUpdate"
      @toggle-tag="handleTaskQuickMetaTagToggle"
      @toggle-goal="handleTaskQuickMetaGoalToggle"
      @save="handleTaskQuickMetaSave"
      @close="closeTaskQuickMetaMenu"
    />
    <TaskGroupDialog
      :show="showTaskGroupDialog"
      :groups="taskGroups"
      :include-none-option="true"
      :order-ids="userSettings.kanban.kanbanGroupColumnOrder"
      @close="showTaskGroupDialog = false"
      @save="handleTaskGroupSave"
    />
    <div
      v-if="desktopCalendarPointerGesture?.started && desktopCalendarPointerGesture.task"
      class="task-manager-calendar-drag-ghost"
      :style="{ transform: `translate3d(${desktopCalendarPointerGesture.latestX + 12}px, ${desktopCalendarPointerGesture.latestY + 12}px, 0)` }"
    >{{ desktopCalendarPointerGesture.task.title }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { Protyle, getFrontend, showMessage } from 'siyuan';
import SyButton from '@/components/SiyuanTheme/SyButton.vue';
import SySelect from '@/components/SiyuanTheme/SySelect.vue';
import TaskCard from '@/components/TaskCard.vue';
import TaskCheckbox from '@/components/TaskCheckbox.vue';
import QuickCreateTaskModal, { type Notebook, type Document as TaskDocument, type QuickCreateCreatedPayload } from '@/components/QuickCreateTaskModal.vue';
import TaskScopeDialog, { type TaskScopeDialogSavePayload, type TaskScopeDisplayOption } from '@/components/TaskScopeDialog.vue';
import { taskViewSwitcherDisplayOptions } from '@/utils/taskViewSwitcher';
import TaskGroupDialog from '@/components/TaskGroupDialog.vue';
import TaskFilterPopover from '@/components/TaskFilterPopover.vue';
import SourceFilterSelect from '@/components/SourceFilterSelect.vue';
import Icon from '@/components/Icon.vue';
import TaskEditorMetaPanel from '@/components/TaskEditorMetaPanel.vue';
import TaskEditorPanelShell from '@/components/TaskEditorPanelShell.vue';
import TaskEditorProtyleBody from '@/components/TaskEditorProtyleBody.vue';
import TaskDateQuickMenu from '@/components/TaskDateQuickMenu.vue';
import TaskQuickMetaMenu from '@/components/TaskQuickMetaMenu.vue';
import { TaskRepository, Task, SubTask, TaskGroup, buildTaskStatusAttrs, parseTaskFocusEstimate, serializeTaskFocusEstimate, getFocusTimerData, lsNotebooks, getIDsByHPath, setBlockAttrs, getBlockAttrs, getBlockDOM, sql, openBlockById, loadTaskGroups, saveTaskGroups, DEFAULT_TASK_REPEAT_MATERIALIZE_OPTIONS, resolveTaskRepeatMaterializeOptions, type TaskQueryScope, type TaskRepeatWindow } from '@/api';
import { requestTaskCompletionNote, updateTaskMarkdown, skipTaskTemporarily } from '@/utils/taskHelpers';
import { getCheckinNotePromptAnchor } from '@/utils/checkinNotePrompt';
import { escapeSqlLiteral } from '@/utils/sql';
import { usePlugin } from '@/main';
import { useUserSettings } from '@/composables/useUserSettings';
import { useGoals } from '@/composables/useGoals';
import { useTaskFilters } from '@/composables/useTaskFilters';
import { matchesTaskFilterExpression, useTaskFilterState } from '@/composables/useTaskFilterState';
import { useI18n } from '@/composables/useI18n';
import {
  buildTaskDocumentPathLookup,
  taskMatchesDocumentScope
} from '@/utils/taskDocumentScope';
import { resolveGroupColorCss, resolveGroupColorLayerCss, resolveGroupTextColor } from '@/utils/groupColor';
import {
  TASK_GROUP_NONE_ID,
  buildTaskGroupOptions,
  getTaskGroupColorValue,
  normalizeTaskGroupOrderIds
} from '@/utils/taskGroupShared';
import { buildTaskPriorityOptions } from '@/utils/taskPriority';
import {
  TASK_STATUS_VALUES,
  buildTaskStatusFilterOptions,
  buildTaskStatusSelectOptions,
  getTaskStatusLabel
} from '@/utils/taskStatus';
import { eventBus, Events } from '@/utils/eventBus';
import { emitOptimisticBlockTaskAdded } from '@/utils/taskCreationSync';
import { publishTaskChange, type TaskChangePayload } from '@/utils/taskChangeCoordinator';
import { syncTaskEditorDraftFromAttributeChanges } from '@/utils/taskEditorDraftSync';
import { createTaskStatusAttributeSync } from '@/utils/taskStatusAttributeSync';
import { getInitialAutomaticTaskStatus } from '@/utils/taskStatusAutomation';
import { createTaskFocusTarget } from '@/utils/focusTimerTarget';
import { getCrdtRepository, useCrdtTasks } from '@/crdtStore';
import { applyTaskAttributeMutation } from '@/utils/taskMutationService';
import { formatMonthDay } from '@/utils/dateHelpers';
import { createBlockIdBatchQueue } from '@/utils/blockIdBatchQueue';
import { createPeriodicSetCleanup } from '@/utils/setCleanup';
import {
  normalizeTaskBlockIds as normalizeBlockIds,
  queryTaskAncestorContextRows as queryAncestorContextRows,
  type AncestorContextRow
} from '@/utils/taskAncestorContext';
import {
  collectTaskTitleHydrationBlockIds,
  shouldHydrateTaskTitle
} from '@/utils/taskTitleHydration';
import { getTaskElementFromDoc, parseTaskCompleted } from '@/utils/taskDom';
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
  resolveDocumentDisplayName,
  type RepeatRulePayload
} from '@/utils/taskViewShared';
import {
  buildLiveTaskDomOrderMap,
  compareTaskCreatedAtDesc,
  compareTaskDocumentSortKey
} from '@/utils/taskSortShared';
import { getRepeatSeriesForTask, notifyRepeatChanged, rebuildAffectedRepeatTasks, updateRepeatSeriesDates, type RepeatFrequency, type RepeatRule, type RepeatRuleInput, type RepeatTermination } from '@/repeatRepository';
import { isRepeatTask as isRepeatTaskEntity } from '@/utils/repeatTaskUtils';
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
import { useTaskScopeDocuments } from '@/composables/useTaskScopeDocuments';
import { useDocumentScopeMatcher } from '@/composables/useDocumentScopeMatcher';
import {
  buildTaskQuickDateDraft,
  normalizeQuickDateInputValue,
  normalizeQuickTimeInputValue,
  type TaskQuickDateDraft
} from '@/utils/taskQuickDateDraft';
import {
  getTaskHeadingGroupMeta,
  resolveTaskHeadingGroups,
  type TaskHeadingGroupMeta
} from '@/utils/taskGrouping';
import {
  getKernelTaskIndex,
  pingPinchKernel,
  refreshKernelTaskIndex,
  isKernelRpcUnavailable,
  type KernelTaskIndexParams,
  type KernelTaskRowsResult
} from '@/kernelRpc';
import { PINCH_DAILY_NOTE_OPTION_ID, PINCH_INBOX_OPTION_ID } from '@/utils/pinchInbox';
import {
  applyTaskTagBatchAction,
  areTaskTagIdsEqual,
  buildTaskTagAttrs,
  buildTaskTagState,
  filterKnownTaskTagIds,
  matchesTaskTagFilter,
  removeTaskTags,
  resolveTaskTagIds,
  toggleTaskTagSelection,
  type TaskTagBatchAction
} from '@/utils/taskTags';
import {
  getEffectiveGoalIdsForTask,
  getGoalIdsForTask,
  isTaskDirectGoalMember,
  setTaskGoalMembership,
  toggleTaskGoalMembership
} from '@/utils/goalTaskMembership';
import type { SidebarSectionId, TaskViewSwitcherId } from '@/utils/userSettings';

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

type CalendarPointerDragPhase = 'start' | 'move' | 'end' | 'cancel';

interface CalendarPointerDragEventPayload extends MobileCalendarDragEventPayload {
  phase: CalendarPointerDragPhase;
}

interface DesktopCalendarPointerGesture {
  task: Task;
  pointerId: number;
  startX: number;
  startY: number;
  latestX: number;
  latestY: number;
  started: boolean;
}

const props = withDefaults(defineProps<{
  enableMobileCalendarDrag?: boolean;
  enableCalendarPointerDrag?: boolean;
}>(), {
  enableMobileCalendarDrag: false,
  enableCalendarPointerDrag: false
});

const emit = defineEmits<{
  mobileCalendarDragStart: [payload: MobileCalendarDragEventPayload];
  mobileCalendarDragMove: [payload: MobileCalendarDragEventPayload];
  mobileCalendarDragEnd: [payload: MobileCalendarDragEventPayload];
  mobileCalendarDragCancel: [];
  calendarPointerDragStart: [payload: MobileCalendarDragEventPayload];
  calendarPointerDragMove: [payload: MobileCalendarDragEventPayload];
  calendarPointerDragEnd: [payload: MobileCalendarDragEventPayload];
  calendarPointerDragCancel: [payload: MobileCalendarDragEventPayload];
  startFocus: [task: Task];
}>();

const { data: userSettings, loadSettings, updateSettings } = useUserSettings();
const {
  goalDefinitions,
  goalDocuments,
  goalTasks,
  goalItems,
  goalsLoading,
  loadGoalsData,
  refreshGoalDocuments,
  saveGoalDefinitions,
  saveTaskGoalMembership
} = useGoals();
const autoRecognizeTaskDate = computed(() => userSettings.taskManager.autoRecognizeTaskDate === true);
const taskCompletionSoundEnabled = computed(() => userSettings.taskManager.taskCompletionSoundEnabled !== false);
const showDocumentGroupNotebookPath = computed(() => userSettings.taskManager.showDocumentGroupNotebookPath !== false);
const FLOATING_FOCUS_STORAGE_KEY = 'pinch-floating-focus-enabled';
let repeatReconcileRequestId = 0;
const { t } = useI18n();
const taskScopeViewOptions = computed<TaskScopeDisplayOption[]>(() =>
  taskViewSwitcherDisplayOptions.map(({ labelKey, ...option }) => ({ ...option, label: t(labelKey) }))
);
const taskScopeSidebarSectionOptions = computed<Array<{ id: SidebarSectionId; label: string }>>(() => [
  { id: 'week-dates', label: t('taskScopeDialog.sidebarWeekDates') },
  { id: 'habit-list', label: t('taskScopeDialog.sidebarHabitList') },
  { id: 'stand-container', label: t('taskScopeDialog.sidebarStandContainer') }
]);

const TASK_MANAGER_CRDT_STORE_ID = 'task-manager';
const crdtRepo = getCrdtRepository(TASK_MANAGER_CRDT_STORE_ID);
const { tasks } = useCrdtTasks(TASK_MANAGER_CRDT_STORE_ID);
type LocalTaskFieldOverride = {
  values: Partial<Task>;
  expiresAt: number;
};
const localTaskFieldOverrides = new Map<string, LocalTaskFieldOverride>();
let isMobileFrontend = false;
try {
  const frontend = getFrontend();
  isMobileFrontend = frontend === 'mobile' || frontend === 'browser-mobile';
} catch {
  isMobileFrontend = false;
}
const MOBILE_CALENDAR_DRAG_LONG_PRESS_MS = 280;
const MOBILE_CALENDAR_DRAG_MOVE_THRESHOLD_PX = 18;
const DESKTOP_CALENDAR_DRAG_MOVE_THRESHOLD_PX = 4;
const loading = ref(false);
const isRefreshButtonSpinning = ref(false);
const showTaskModal = ref(false);
const showTaskScopeDialog = ref(false);
const taskScopeDocumentsRefreshing = ref(false);
type TaskScopeDialogTab = 'scope' | 'task-settings' | 'pomodoro-settings' | 'document-groups' | 'goals' | 'display';
const taskScopeDialogInitialTab = ref<TaskScopeDialogTab>('scope');
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
const desktopCalendarPointerGesture = ref<DesktopCalendarPointerGesture | null>(null);
const desktopCalendarDraggingTaskId = ref<string | null>(null);
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
  tags: string[];
  groupId: string;
  focusEstimate?: NonNullable<Task['focusEstimate']>;
}
type TaskEditorDateFields = Pick<TaskEditDraft, 'startDate' | 'startTime' | 'dueDate' | 'dueTime'>;
interface TaskQuickMetaDraft extends TaskEditorDateFields {
  priority: Task['priority'];
  reminderType?: TaskReminderType;
  reminderCustomTime: string;
  tags: string[];
  groupId: string;
  goalIds: string[];
}
type TaskDueFilterKey = 'overdue' | 'today' | 'next7Days' | 'allScheduled' | 'thisWeekend' | 'noDueDate';
type TaskUpdateFilterKey = 'today' | 'thisWeek' | 'thisMonth';
type TaskExtraFilterKey = 'hasDescription' | 'hasSubtasks' | 'hasFocusEstimate';
type TaskListViewMode = 'kanban' | 'list' | 'timeline';
type TaskListGroupMode = 'none' | 'status' | 'group' | 'heading' | 'date' | 'document';
type TimelineTaskFilter = 'all' | 'incomplete' | 'completed' | 'overdue' | 'unscheduled';
interface TaskGroupedSection {
  key: string;
  label: string;
  tasks: Task[];
  order: number;
  timelineDateLabel?: { day: string; weekday: string };
  timelineDateKey?: string;
  timelineDateTimestamp?: number;
  timelineTaskLabels?: Map<string, string>;
}

interface TimelineVirtualRow {
  key: string;
  type: 'section' | 'task';
  section?: TaskGroupedSection;
  task?: Task;
  timelineLabel?: string | null;
  isSectionEnd?: boolean;
}

type KernelDiagnosticsStatus = 'idle' | 'checking' | 'connected' | 'error';

interface KernelDiagnosticsState {
  status: KernelDiagnosticsStatus;
  rows?: number;
  topLevelRows?: number;
  subtaskRows?: number;
  cached?: boolean;
  rebuilt?: boolean;
  pageCount?: number;
  totalScanned?: number;
  elapsedMs?: number;
  indexElapsedMs?: number;
  hierarchyElapsedMs?: number;
  pingMs?: number;
  partial?: boolean;
  checkedAt?: number;
  refreshedAt?: number;
  ageMs?: number;
  error?: string;
}

const taskEditDraft = ref<TaskEditDraft | null>(null);
const taskEditorActualFocus = ref({ minutes: 0, sessions: 0 });
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
const kernelDiagnosticsControlRef = ref<HTMLElement | null>(null);
const taskFilterPopoverRef = ref<InstanceType<typeof TaskFilterPopover> | null>(null);
const taskFilterPopoverStyle = ref<Record<string, string>>({});
const taskSearchInputRef = ref<HTMLInputElement | null>(null);
const taskGroupMenuVisible = ref(false);
const kernelDiagnosticsVisible = ref(false);
const kernelDiagnosticsChecking = ref(false);
const kernelDiagnostics = ref<KernelDiagnosticsState>({ status: 'idle' });
const taskSearchVisible = ref(false);
const taskSearchQuery = ref('');
const taskListViewMode = ref<TaskListViewMode>('kanban');
const taskListGroupBy = ref<TaskListGroupMode>('none');
const timelineTaskFilter = ref<TimelineTaskFilter>('all');
const timelineTaskFilterOptions = computed<Array<{ value: TimelineTaskFilter; label: string }>>(() => [
  { value: 'all', label: t('taskManager.all') },
  { value: 'incomplete', label: t('taskManager.incomplete') },
  { value: 'completed', label: t('taskManager.statusCompleted') },
  { value: 'overdue', label: t('taskManager.overdue') },
  { value: 'unscheduled', label: t('taskManager.unscheduled') }
]);
const taskHeadingGroups = ref<Map<string, TaskHeadingGroupMeta>>(new Map());
let taskEditorProtyle: Protyle | null = null;
const openingTaskPopoverBlockIds = new Set<string>();
const taskEditorSidebarVisible = ref(false);
const taskEditorSidebarTitle = ref(t('taskManager.editTask'));
const taskEditorSidebarMountRef = ref<InstanceType<typeof TaskEditorProtyleBody> | null>(null);
const taskEditorSidebarOverlayStyle = ref<Record<string, string>>({});
const taskEditorSidebarPanelStyle = ref<Record<string, string>>({});
const taskModalOverlayStyle = ref<Record<string, string>>({});
let taskEditorHostResizeObserver: ResizeObserver | null = null;
let observedTaskEditorHost: HTMLElement | null = null;
let taskEditorSidebarPositionRaf: number | null = null;
let taskEditorParentScrollHost: HTMLElement | null = null;
let taskEditorParentPreviousOverflowY = '';
let taskEditorParentLockedScrollTop = 0;
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

function resolveTaskTagSummaryLabel(tagIds: string[]): string {
  if (tagIds.length === 0) {
    return t('taskManager.noTag');
  }
  const primaryLabel = taskGroupNameMap.value.get(tagIds[0] || '') || t('taskManager.tags');
  return tagIds.length > 1 ? `${primaryLabel} +${tagIds.length - 1}` : primaryLabel;
}

function resolveTaskPrimaryTagColor(tagIds: string[]): string {
  return getTaskGroupColorValue(taskGroups.value, tagIds[0] || '');
}

function getTaskEditorSidebarMountElement(): HTMLElement | null {
  return taskEditorSidebarMountRef.value?.bodyEl ?? null;
}

function getTaskEditorHostVisibleRect(): DOMRect {
  const host = taskModalTeleportTarget.value || taskManagerContainerRef.value || document.documentElement;
  const rect = host.getBoundingClientRect();
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || rect.width;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || rect.height;
  const left = Math.max(0, rect.left);
  const top = Math.max(0, rect.top);
  const right = Math.min(viewportWidth, rect.right);
  const bottom = Math.min(viewportHeight, rect.bottom);
  return new DOMRect(
    left,
    top,
    Math.max(0, right - left),
    Math.max(0, bottom - top)
  );
}

function updateTaskModalOverlayStyle(): void {
  const hostRect = getTaskEditorHostVisibleRect();
  if (hostRect.width <= 0 || hostRect.height <= 0) {
    return;
  }

  taskModalOverlayStyle.value = {
    '--modal-overlay-left': `${Math.round(hostRect.left)}px`,
    '--modal-overlay-top': `${Math.round(hostRect.top)}px`,
    '--modal-overlay-width': `${Math.round(hostRect.width)}px`,
    '--modal-overlay-height': `${Math.round(hostRect.height)}px`
  };
}

function updateTaskEditorSidebarPosition(): void {
  if (taskEditorSidebarPositionRaf !== null) {
    cancelAnimationFrame(taskEditorSidebarPositionRaf);
    taskEditorSidebarPositionRaf = null;
  }
  if (!taskEditorSidebarVisible.value) {
    return;
  }

  const hostRect = getTaskEditorHostVisibleRect();
  if (hostRect.width <= 0 || hostRect.height <= 0) {
    return;
  }

  const teleportHost = taskModalTeleportTarget.value;
  if (teleportHost) {
    const overlayTop = Math.max(0, Math.round(teleportHost.scrollTop || 0));
    const overlayHeight = Math.max(0, Math.round(teleportHost.clientHeight || hostRect.height));
    taskEditorSidebarOverlayStyle.value = {
      position: 'absolute',
      left: '0',
      top: `${overlayTop}px`,
      width: '100%',
      height: `${overlayHeight}px`,
      padding: '0',
      overflow: 'hidden'
    };
    taskEditorSidebarPanelStyle.value = {
      position: 'absolute',
      left: '0',
      bottom: '0',
      width: '100%',
      maxHeight: '100%',
      overflowY: 'auto',
      overscrollBehavior: 'contain'
    };
    return;
  }

  const panelWidth = Math.max(0, hostRect.width);
  const panelMaxHeight = Math.max(240, hostRect.height);

  const left = Math.round(hostRect.left);
  const bottom = Math.max(0, Math.round((window.innerHeight || document.documentElement.clientHeight) - hostRect.bottom));

  taskEditorSidebarOverlayStyle.value = {
    left: `${Math.round(hostRect.left)}px`,
    top: `${Math.round(hostRect.top)}px`,
    width: `${Math.round(hostRect.width)}px`,
    height: `${Math.round(hostRect.height)}px`
  };
  taskEditorSidebarPanelStyle.value = {
    left: `${left}px`,
    bottom: `${bottom}px`,
    width: `${Math.round(panelWidth)}px`,
    maxHeight: `${Math.round(panelMaxHeight)}px`
  };
}

function scheduleTaskEditorSidebarPositionUpdate(): void {
  if (!taskEditorSidebarVisible.value || taskEditorSidebarPositionRaf !== null) {
    return;
  }
  taskEditorSidebarPositionRaf = requestAnimationFrame(() => {
    taskEditorSidebarPositionRaf = null;
    updateTaskEditorSidebarPosition();
  });
}

function cancelTaskEditorSidebarPositionUpdate(): void {
  if (taskEditorSidebarPositionRaf === null) {
    return;
  }
  cancelAnimationFrame(taskEditorSidebarPositionRaf);
  taskEditorSidebarPositionRaf = null;
}

function lockTaskEditorParentScroll(): void {
  const host = taskModalTeleportTarget.value;
  if (!host) {
    unlockTaskEditorParentScroll();
    return;
  }
  if (taskEditorParentScrollHost === host) {
    return;
  }

  unlockTaskEditorParentScroll();
  taskEditorParentScrollHost = host;
  taskEditorParentPreviousOverflowY = host.style.overflowY;
  taskEditorParentLockedScrollTop = host.scrollTop || 0;
  host.style.overflowY = 'hidden';
}

function unlockTaskEditorParentScroll(): void {
  const host = taskEditorParentScrollHost;
  if (!host) {
    return;
  }
  host.style.overflowY = taskEditorParentPreviousOverflowY;
  host.scrollTop = taskEditorParentLockedScrollTop;
  taskEditorParentScrollHost = null;
  taskEditorParentPreviousOverflowY = '';
  taskEditorParentLockedScrollTop = 0;
}

function syncTaskEditorHostResizeObserver(): void {
  const host = taskModalTeleportTarget.value || taskManagerContainerRef.value;
  if (host === observedTaskEditorHost) {
    return;
  }

  taskEditorHostResizeObserver?.disconnect();
  observedTaskEditorHost = host;
  if (!host || typeof ResizeObserver === 'undefined') {
    taskEditorHostResizeObserver = null;
    return;
  }

  taskEditorHostResizeObserver = new ResizeObserver(() => {
    scheduleTaskEditorSidebarPositionUpdate();
    if (showTaskModal.value) {
      updateTaskModalOverlayStyle();
    }
  });
  taskEditorHostResizeObserver.observe(host);
}

function disconnectTaskEditorHostResizeObserver(): void {
  taskEditorHostResizeObserver?.disconnect();
  taskEditorHostResizeObserver = null;
  observedTaskEditorHost = null;
}

const lastSelectedTaskGroupId = ref<string>('');
const showTaskCardDetails = ref(true);
const collapsedTaskGroupSectionKeys = ref<Set<string>>(new Set());
const isBatchEditMode = ref(false);
const batchSelectedTaskIds = ref<Set<string>>(new Set());
const batchEditStatus = ref<string>('');
const batchEditPriority = ref<string>('');
const batchEditTagAction = ref<BatchTagActionSelection>('set-primary');
const batchEditGroupId = ref<string>('');
const isBatchApplying = ref(false);
const taskQuickDateMenu = ref<{
  show: boolean;
  x: number;
  y: number;
  task: Task | null;
}>({
  show: false,
  x: 0,
  y: 0,
  task: null
});
const taskQuickMetaMenu = ref<{
  show: boolean;
  x: number;
  y: number;
  task: Task | null;
  removeTrigger?: (() => void) | null;
  initialPanel?: 'priority' | 'tags' | 'goals' | 'due' | 'reminder' | null;
  panelOnly?: boolean;
}>({
  show: false,
  x: 0,
  y: 0,
  task: null,
  removeTrigger: null,
  initialPanel: null,
  panelOnly: false
});
const taskQuickDateDraft = ref<TaskQuickDateDraft>({
  startDate: '',
  startTime: '',
  dueDate: '',
  dueTime: ''
});
const taskQuickMetaDraft = ref<TaskQuickMetaDraft>({
  priority: 'none',
  reminderType: undefined,
  reminderCustomTime: '',
  tags: [],
  groupId: '',
  goalIds: [],
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
const TIMELINE_VIRTUAL_THRESHOLD = 120;
const TIMELINE_VIRTUAL_HEADER_HEIGHT = 32;
const TIMELINE_VIRTUAL_SECTION_END_EXTRA_HEIGHT = 14;
const timelineWeekdayFormatter = new Intl.DateTimeFormat('zh-CN', { weekday: 'short' });
const TASK_TITLE_HYDRATE_LIMIT = 120;
const taskVirtualRange = ref({ start: 0, end: 0, top: 0, bottom: 0 });
let taskVirtualRaf: number | null = null;
const taskHeightCache = new Map<string, number>();
const taskRowElements = new Map<string, HTMLElement>();
const timelineVirtualRowHeightCache = new Map<string, number>();
const timelineVirtualRowElements = new Map<string, HTMLElement>();
const taskHeightVersion = ref(0);
let taskRowMeasureRaf: number | null = null;
let taskTitleHydrateTimer: number | null = null;
let isTaskTitleHydrating = false;
let taskHeadingGroupRequestId = 0;

const defaultGroupChipColor = '#9aa0a6';
type BatchTagActionSelection = TaskTagBatchAction | '';
interface TaskGroupDialogSavePayload {
  groups: TaskGroup[];
  orderIds: string[];
}

const { start: startSkipSetCleanup, stop: stopSkipSetCleanup } = createPeriodicSetCleanup(skipSet);
const taskListViewOptions: Array<{ value: TaskListViewMode; label: string }> = [
  { value: 'kanban', label: t('taskManager.kanbanView') },
  { value: 'list', label: t('taskManager.listView') },
  { value: 'timeline', label: t('taskManager.timelineView') }
];
const taskListGroupOptions: Array<{ value: TaskListGroupMode; label: string }> = [
  { value: 'none', label: t('taskManager.groupByNone') },
  { value: 'status', label: t('taskManager.groupByStatus') },
  { value: 'date', label: t('taskManager.groupByDate') },
  { value: 'document', label: t('taskManager.groupByDocument') },
  { value: 'group', label: t('taskManager.groupByTag') },
  { value: 'heading', label: t('taskManager.groupByHeading') }
];
const batchEditStatusOptions = buildTaskStatusSelectOptions(t);
const batchEditPriorityOptions: Array<{ value: string; text: string }> = [
  { value: '', text: t('taskManager.priorityNoChange') },
  { value: 'none', text: t('taskManager.priorityNone') },
  { value: 'low', text: t('taskManager.priorityLow') },
  { value: 'medium', text: t('taskManager.priorityMedium') },
  { value: 'high', text: t('taskManager.priorityHigh') }
];
const batchEditTagActionOptions: Array<{ value: TaskTagBatchAction; text: string }> = [
  { value: 'set-primary', text: t('taskManager.batchSetPrimaryTag') },
  { value: 'add', text: t('taskManager.batchAddTag') },
  { value: 'remove', text: t('taskManager.batchRemoveTag') }
];
const taskGroupStatusOrder: Task['status'][] = [...TASK_STATUS_VALUES];

const taskModalTeleportTo = computed(() => taskModalTeleportTarget.value || 'body');
const activeTaskEditOverride = ref<Task | null>(null);
const activeTaskEditTask = computed(() =>
  taskEditMenuTaskId.value
    ? (activeTaskEditOverride.value || tasks.value.find(task => task.id === taskEditMenuTaskId.value) || null)
    : null
);
const isActiveTaskPinned = computed(() => activeTaskEditTask.value?.pinned === true);
const isActiveTaskArchived = computed(() => activeTaskEditTask.value?.archived === true);
const activeTaskEditDraft = computed(() =>
  taskEditMenuTaskId.value && taskEditDraft.value?.taskId === taskEditMenuTaskId.value
    ? taskEditDraft.value
    : null
);
const taskEditorRepeatFrequency = ref<RepeatFrequency>('none');
const taskEditorRepeatRule = ref<RepeatRule | null>(null);
const taskEditorRepeatTermination = ref<RepeatTermination>({ type: 'never' });
const batchSelectedCount = computed(() => batchSelectedTaskIds.value.size);
const allVisibleTasksSelected = computed(() => {
  const currentTasks = displayedTasks.value;
  if (currentTasks.length === 0) {
    return false;
  }
  return currentTasks.every(task => batchSelectedTaskIds.value.has(task.id));
});
const batchEditGroupOptions = computed(() => [
  { value: '', text: t('taskManager.tagNoChange') },
  ...(batchEditTagAction.value === 'set-primary'
    ? [{ value: TASK_GROUP_NONE_ID, text: t('taskManager.noTag') }]
    : []),
  ...visibleTaskGroups.value.map(group => ({
    value: group.id,
    text: group.name || t('taskManager.untitledTag')
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

function normalizeBatchTagAction(value: unknown): TaskTagBatchAction {
  return value === 'add' || value === 'remove' || value === 'set-primary'
    ? value
    : 'set-primary';
}

function setBatchEditTagAction(value: unknown): void {
  const nextAction = normalizeBatchTagAction(value);
  batchEditTagAction.value = nextAction;
  if (nextAction !== 'set-primary' && batchEditGroupId.value === TASK_GROUP_NONE_ID) {
    batchEditGroupId.value = '';
  }
}

function resetBatchEditInputs(): void {
  batchEditStatus.value = '';
  batchEditPriority.value = '';
  batchEditTagAction.value = 'set-primary';
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
    syncTaskEditorHostResizeObserver();
    if (taskEditorSidebarVisible.value) {
      unlockTaskEditorParentScroll();
    }
    return;
  }
  taskModalTeleportTarget.value = localHost.closest('.Pinch-habit-container') as HTMLElement | null;
  syncTaskEditorHostResizeObserver();
  if (taskEditorSidebarVisible.value) {
    lockTaskEditorParentScroll();
  }
}

function resolveTaskScrollContainer(): HTMLElement | null {
  const localHost = taskManagerContainerRef.value;
  if (!localHost || typeof localHost.closest !== 'function') {
    return document.documentElement;
  }

  // The home sidebar scrolls inside `.habit-list-container`, not its
  // `.Pinch-habit-container` parent. Listening to the parent leaves the
  // virtual range frozen after the initial render, so scrolling through a
  // large task list eventually shows only the spacer's blank area.
  return (localHost.closest('.habit-list-container') as HTMLElement | null)
    || (localHost.closest('.Pinch-habit-container') as HTMLElement | null)
    || document.documentElement;
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

function hasActiveTaskVirtualList(): boolean {
  return shouldUseTaskVirtualList.value || shouldUseTimelineVirtualList.value;
}

function getActiveTaskVirtualItemCount(): number {
  return shouldUseTimelineVirtualList.value
    ? timelineVirtualRows.value.length
    : displayedTasks.value.length;
}

function getActiveTaskVirtualOffsets(): number[] {
  return shouldUseTimelineVirtualList.value
    ? timelineVirtualRowHeightOffsets.value
    : taskHeightOffsets.value;
}

function updateTaskVirtualRange(): void {
  if (!hasActiveTaskVirtualList()) {
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
  const itemCount = getActiveTaskVirtualItemCount();
  const offsets = getActiveTaskVirtualOffsets();
  const totalHeight = offsets[offsets.length - 1] || 0;
  const startIndex = Math.max(
    0,
    findTaskIndexForOffset(offsets, listOffset) - TASK_VIRTUAL_OVERSCAN
  );
  const endIndex = Math.min(
    itemCount,
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
  scheduleTaskEditorSidebarPositionUpdate();
}

function scheduleTaskRowMeasure(): void {
  if (!hasActiveTaskVirtualList()) {
    return;
  }
  if (taskRowMeasureRaf !== null) {
    cancelAnimationFrame(taskRowMeasureRaf);
  }
  taskRowMeasureRaf = requestAnimationFrame(() => {
    taskRowMeasureRaf = null;
    let changed = false;
    const rowElements = shouldUseTimelineVirtualList.value
      ? timelineVirtualRowElements
      : taskRowElements;
    const heightCache = shouldUseTimelineVirtualList.value
      ? timelineVirtualRowHeightCache
      : taskHeightCache;
    for (const [rowKey, el] of rowElements.entries()) {
      const height = Math.max(1, Math.round(el.getBoundingClientRect().height));
      const prev = heightCache.get(rowKey);
      if (prev !== height) {
        heightCache.set(rowKey, height);
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

function setTimelineVirtualRowRef(rowKey: string, el: unknown): void {
  const resolved = resolveTaskRowElement(el);
  if (!resolved) {
    timelineVirtualRowElements.delete(rowKey);
    return;
  }
  const current = timelineVirtualRowElements.get(rowKey);
  if (current === resolved) return;
  timelineVirtualRowElements.set(rowKey, resolved);
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
    const tagIds = resolveTaskTagIds(task.tags, task.groupId);
    return tagIds.some(tagId => removedSet.has(tagId));
  });

  const localBlockIds = localAffectedTasks
    .map(task => (task.type === 'block' ? task.blockId : null))
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  let blockIdsToClear: string[] = [];
  try {
    const idsClause = normalizedIds.map(id => `'${escapeSqlLiteral(id)}'`).join(',');
    const likeClause = normalizedIds
      .map(id => `a.value LIKE '%"${escapeSqlLiteral(id)}"%'`)
      .join(' OR ');
    const rows = await sql(`
      SELECT DISTINCT a.block_id as id
      FROM attributes a
      JOIN blocks b ON b.id = a.block_id
      WHERE (
          (a.name = 'custom-task-group' AND a.value IN (${idsClause}))
          OR (a.name = 'custom-task-tags' AND (${likeClause}))
        )
        AND (b.type = 'i' OR b.type = 'p')
        AND b.subtype = 't'
    `) as Array<{ id?: string }>;
    const sqlBlockIds = (rows || [])
      .map(row => (typeof row?.id === 'string' ? row.id : ''))
      .filter(id => id.length > 0);
    blockIdsToClear = Array.from(new Set([...sqlBlockIds, ...localBlockIds]));
  } catch (error) {
    console.error('[TaskManager] Failed to query tagged tasks:', error);
    blockIdsToClear = Array.from(new Set(localBlockIds));
  }

  const successUpdates = new Map<string, { tagIds: string[]; groupId: string }>();
  for (const blockId of blockIdsToClear) {
    try {
      const localTask = localAffectedTasks.find(task => task.blockId === blockId) || null;
      let currentTagState = localTask
        ? buildTaskTagState(localTask.tags, localTask.groupId)
        : buildTaskTagState([], '');
      if (!localTask) {
        const attrs = await getBlockAttrs(blockId);
        let parsedTags: unknown = [];
        if (attrs['custom-task-tags']) {
          try {
            parsedTags = JSON.parse(attrs['custom-task-tags']);
          } catch {
            parsedTags = [];
          }
        }
        currentTagState = buildTaskTagState(parsedTags, attrs['custom-task-group']);
      }
      const nextTagIds = removeTaskTags(currentTagState.tagIds, removedSet);
      const nextTagAttrs = buildTaskTagAttrs(nextTagIds);
      await setBlockAttrs(blockId, nextTagAttrs.attrs);
      successUpdates.set(blockId, {
        tagIds: nextTagAttrs.tagIds,
        groupId: nextTagAttrs.primaryTagId
      });
    } catch (error) {
      console.error('[TaskManager] Failed to clear task group attrs:', error);
    }
  }

  const successBlockIds = Array.from(successUpdates.keys());
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
      const nextTagState = task.blockId ? successUpdates.get(task.blockId) : null;
      return {
        ...task,
        tags: nextTagState ? [...nextTagState.tagIds] : task.tags,
        groupId: nextTagState?.groupId || undefined,
        updatedAt: now
      };
    });
    idsToUpdate.forEach(taskId => {
      const updatedTask = tasks.value.find(task => task.id === taskId);
      crdtRepo.updateTaskField(taskId, 'tags', [...(updatedTask?.tags || [])]);
      crdtRepo.updateTaskField(taskId, 'groupId', updatedTask?.groupId || undefined);
    });
    await refreshInternalState();
  }

}

async function handleTaskGroupSave(payload: TaskGroupDialogSavePayload): Promise<void> {
  const groups = Array.isArray(payload?.groups) ? payload.groups : [];
  const orderIds = normalizeTaskGroupOrderIds(payload?.orderIds);
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
  activeTaskEditOverride.value = null;
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

function closeKernelDiagnostics(): void {
  kernelDiagnosticsVisible.value = false;
}

function closeTaskSearch(): void {
  taskSearchVisible.value = false;
  taskSearchQuery.value = '';
}

function toggleTaskSearch(): void {
  closeTaskFilterPopover();
  closeTaskGroupMenu();
  closeKernelDiagnostics();
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
  closeKernelDiagnostics();
  taskFilterPopoverVisible.value = !taskFilterPopoverVisible.value;
  if (taskFilterPopoverVisible.value) {
    void nextTick(updateTaskFilterPopoverPosition);
  }
}

function toggleTaskGroupMenu(): void {
  closeTaskFilterPopover();
  closeKernelDiagnostics();
  taskGroupMenuVisible.value = !taskGroupMenuVisible.value;
}

function toggleKernelDiagnostics(): void {
  closeTaskFilterPopover();
  closeTaskGroupMenu();
  kernelDiagnosticsVisible.value = !kernelDiagnosticsVisible.value;
  if (kernelDiagnosticsVisible.value && kernelDiagnostics.value.status === 'idle') {
    void checkKernelDiagnostics();
  }
}

const kernelDiagnosticsStatusLabel = computed(() => {
  if (kernelDiagnosticsChecking.value || kernelDiagnostics.value.status === 'checking') {
    return t('taskManager.checking');
  }
  if (kernelDiagnostics.value.status === 'connected') {
    return t('taskManager.connected');
  }
  if (kernelDiagnostics.value.status === 'error') {
    return t('taskManager.error');
  }
  return t('taskManager.unchecked');
});

const kernelDiagnosticsSourceLabel = computed(() => {
  const state = kernelDiagnostics.value;
  if (state.status === 'error') {
    return t('taskManager.unavailable');
  }
  if (state.rebuilt) {
    return t('taskManager.rebuilt');
  }
  if (state.cached === true) {
    return t('taskManager.cache');
  }
  if (state.cached === false && state.rows !== undefined) {
    return t('taskManager.newIndex');
  }
  return t('taskManager.unchecked');
});

const kernelDiagnosticsCheckedAtText = computed(() => {
  const checkedAt = kernelDiagnostics.value.checkedAt;
  if (!checkedAt) {
    return '--';
  }
  return new Date(checkedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
});

function formatKernelDiagnosticNumber(value: number | undefined): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? String(value)
    : '--';
}

function formatKernelDiagnosticMs(value: number | undefined): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${Math.max(0, Math.round(value))}ms`
    : '--';
}

function isKernelSubtaskRow(row: Record<string, unknown>): boolean {
  return row?.is_subtask === true ||
    row?.is_subtask === 'true' ||
    row?.is_subtask === 1 ||
    Boolean(row?.parent_task_id);
}

function buildKernelDiagnosticsParams(): KernelTaskIndexParams {
  const scope = getCurrentTaskQueryScope();
  return {
    limit: 5000,
    includeCompleted: scope?.includeCompleted,
    includeArchived: scope?.includeArchived,
    archivedOnly: scope?.archivedOnly,
    notebookId: scope?.notebookId,
    documentId: scope?.documentId
  };
}

function buildKernelDiagnosticsState(
  result: KernelTaskRowsResult,
  pingMs: number,
  rebuilt = false
): KernelDiagnosticsState {
  const rows = Array.isArray(result.rows) ? result.rows : [];
  const subtaskRows = rows.filter(row => isKernelSubtaskRow(row)).length;
  return {
    status: 'connected',
    rows: rows.length,
    topLevelRows: Math.max(0, rows.length - subtaskRows),
    subtaskRows,
    cached: result.cached,
    rebuilt,
    pageCount: result.pageCount,
    totalScanned: result.totalScanned,
    elapsedMs: result.elapsedMs,
    indexElapsedMs: result.indexElapsedMs,
    hierarchyElapsedMs: result.hierarchyElapsedMs,
    pingMs,
    partial: result.partial,
    checkedAt: Date.now(),
    refreshedAt: result.refreshedAt,
    ageMs: result.ageMs
  };
}

async function runKernelDiagnostics(rebuild = false): Promise<void> {
  if (kernelDiagnosticsChecking.value) {
    return;
  }
  kernelDiagnosticsChecking.value = true;
  kernelDiagnostics.value = {
    ...kernelDiagnostics.value,
    status: 'checking',
    error: undefined
  };

  try {
    const pingStartedAt = performance.now();
    await pingPinchKernel();
    const pingMs = performance.now() - pingStartedAt;
    const params = buildKernelDiagnosticsParams();
    const result = rebuild
      ? await refreshKernelTaskIndex(params)
      : await getKernelTaskIndex(params);
    kernelDiagnostics.value = buildKernelDiagnosticsState(result, pingMs, rebuild);
    if (rebuild) {
      showMessage(t('taskManager.kernelIndexRebuilt'), 2200, 'info');
    }
  } catch (error) {
    kernelDiagnostics.value = {
      status: 'error',
      checkedAt: Date.now(),
      error: error instanceof Error ? error.message : t('taskManager.kernelDisconnected')
    };
    if (rebuild) {
      showMessage(t('taskManager.kernelIndexRebuildFailed'), 3200, 'error');
    }
  } finally {
    kernelDiagnosticsChecking.value = false;
  }
}

function checkKernelDiagnostics(): void {
  void runKernelDiagnostics(false);
}

function rebuildKernelTaskIndex(): void {
  void runKernelDiagnostics(true);
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
  const nextTagIds = value === TASK_GROUP_NONE_ID
    ? []
    : toggleTaskTagSelection(taskEditorSelectedTagIds.value, value);
  void quickSaveTaskTags(activeTaskEditTask.value, nextTagIds);
}

function handleTaskQuickMetaTagToggle(value: string): void {
  const nextTagIds = value === TASK_GROUP_NONE_ID
    ? []
    : toggleTaskTagSelection(taskQuickMetaDraft.value.tags, value);
  const nextTagState = buildTaskTagState(nextTagIds);
  taskQuickMetaDraft.value.tags = [...nextTagState.tagIds];
  taskQuickMetaDraft.value.groupId = nextTagState.primaryTagId;
}

function handleTaskQuickMetaGoalToggle(value: string): void {
  const normalizedGoalId = typeof value === 'string' ? value.trim() : '';
  if (!normalizedGoalId || !goalDefinitionsById.value.has(normalizedGoalId)) {
    return;
  }
  const currentGoalIds = new Set(taskQuickMetaDraft.value.goalIds);
  if (currentGoalIds.has(normalizedGoalId)) {
    currentGoalIds.delete(normalizedGoalId);
  } else {
    currentGoalIds.add(normalizedGoalId);
  }
  taskQuickMetaDraft.value.goalIds = Array.from(currentGoalIds);
}

function handleTaskQuickMetaReminderUpdate(value: TaskReminderSelection): void {
  const normalizedReminder = normalizeTaskReminderSelection(value);
  taskQuickMetaDraft.value.reminderType = normalizedReminder.reminderType;
  taskQuickMetaDraft.value.reminderCustomTime = normalizedReminder.reminderCustomTime;
}

function normalizeTaskQuickGoalIds(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }
  const seen = new Set<string>();
  const normalized: string[] = [];
  input.forEach((item) => {
    const value = typeof item === 'string' ? item.trim() : '';
    if (!value || seen.has(value) || !goalDefinitionsById.value.has(value)) {
      return;
    }
    seen.add(value);
    normalized.push(value);
  });
  return normalized;
}

function areTaskQuickGoalIdsEqual(left: unknown, right: unknown): boolean {
  const leftSet = new Set(normalizeTaskQuickGoalIds(left));
  const rightSet = new Set(normalizeTaskQuickGoalIds(right));
  if (leftSet.size !== rightSet.size) {
    return false;
  }
  for (const goalId of leftSet) {
    if (!rightSet.has(goalId)) {
      return false;
    }
  }
  return true;
}

async function selectTaskEditorGoal(value: string): Promise<void> {
  const task = activeTaskEditTask.value;
  if (!task) {
    return;
  }

  const nextGoals = toggleTaskGoalMembership(goalDefinitions.value, task, value);
  goalDefinitions.value = nextGoals;
  await saveTaskGoalMembership(task, getGoalIdsForTask(nextGoals, task));
}

type TaskArchiveViewMode = 'active' | 'archived' | 'all';

function normalizeTaskListGroupMode(value: unknown): TaskListGroupMode {
  if (value === 'status' || value === 'group' || value === 'heading' || value === 'date' || value === 'document' || value === 'none') {
    return value;
  }
  return 'none';
}

function normalizeTaskListViewMode(value: unknown): TaskListViewMode {
  return value === 'list' || value === 'timeline' ? value : 'kanban';
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
  return resolveDocumentDisplayName(document);
}

function resolveTaskDocumentGroup(task: Task): { key: string; label: string; order: number } {
  const rootId = typeof task.rootId === 'string' ? task.rootId.trim() : '';
  const notebookId = typeof task.notebookId === 'string' ? task.notebookId.trim() : '';
  if (!rootId) {
    return {
      key: 'document:unknown',
      label: t('personalStats.unlocatedDocument'),
      order: Number.MAX_SAFE_INTEGER
    };
  }

  const documentKey = notebookId ? `${notebookId}:${rootId}` : '';
  const documents = allDocuments.value;
  const exactDocument = documentKey ? allDocumentsByKey.value.get(documentKey) : undefined;
  const documentIndex = documents.findIndex(document =>
    document.id === rootId && (!notebookId || document.notebookId === notebookId)
  );
  const documentEntry = exactDocument || (documentIndex >= 0 ? documents[documentIndex] : undefined);
  const label = documentEntry
    ? resolveDocumentEntryName(documentEntry)
    : resolveDocumentDisplayName({
      id: rootId,
      path: typeof task.hPath === 'string' ? task.hPath : ''
    });
  const creationOrder = getDocumentCreationSortKey(rootId);

  return {
    key: `document:${notebookId || '*'}:${rootId}`,
    label: label || rootId,
    order: documentIndex >= 0
      ? documentIndex
      : (creationOrder > 0 ? -creationOrder : Number.MAX_SAFE_INTEGER)
  };
}

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
const taskDocumentPathLookup = computed(() => buildTaskDocumentPathLookup(tasks.value));

const notebookOptions = computed(() => {
  return [
    { value: 'all', text: t('taskManager.all') },
    ...enabledNotebooks.value.map(nb => ({
      value: buildNotebookDocumentSource(nb.id),
      text: nb.name
    })),
    ...sortDocumentGroups(documentGroups.value).map(group => ({
      value: buildGroupDocumentSource(group.id),
      text: group.name,
      icon: group.emoji || '📁',
      kind: 'group' as const
    })),
    ...activeGoalItems.value.map(goal => ({
      value: buildGoalDocumentSource(goal.id),
      text: goal.name || t('taskManager.untitledGoal'),
      icon: goal.emoji || '🎯',
      kind: 'goal' as const
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
      name: resolveDocumentDisplayName({ id: activeRootId, path: fallbackPath }),
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

const taskGroupPickerOptions = computed(() => buildTaskGroupOptions(
  visibleTaskGroups.value,
  {
    none: t('taskManager.noTag'),
    fallback: t('taskManager.untitledTag')
  },
  {
    includeColor: true,
    includeBorderColor: true
  }
));

const taskGoalPickerOptions = computed(() => (
  goalDefinitions.value.map(goal => ({
    value: goal.id,
    label: goal.name || t('taskManager.untitledGoal'),
    emoji: goal.emoji || ''
  }))
));

const taskEditorSelectedTagIds = computed(() => (
  buildTaskTagState(activeTaskEditDraft.value?.tags, activeTaskEditDraft.value?.groupId).tagIds
));

const taskEditorSelectedGoalIds = computed(() => (
  activeTaskEditTask.value ? getEffectiveGoalIdsForTask(goalDefinitions.value, activeTaskEditTask.value) : []
));

const taskEditorSelectedGroupId = computed(() => {
  return taskEditorSelectedTagIds.value[0] || TASK_GROUP_NONE_ID;
});

const taskEditorGroupLabel = computed(() => {
  return resolveTaskTagSummaryLabel(taskEditorSelectedTagIds.value);
});

const taskEditorGroupColorValue = computed(() => {
  return resolveTaskPrimaryTagColor(taskEditorSelectedTagIds.value);
});

const taskEditorGroupButtonStyle = computed(() => {
  const rawColor = taskEditorGroupColorValue.value;
  if (!rawColor) {
    return {};
  }
  return {
    background: resolveGroupColorCss(rawColor),
    borderColor: resolveGroupColorLayerCss(rawColor),
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
  void updateSettings('sidebar', { taskListCollapsed: isTaskListCollapsed.value });
};

let lastRefreshTime = 0;

let eventUnsubscribers: Array<() => void> = [];
const processingBlockIds = new Set<string>();
const queuedIncrementalForceFreshBlockIds = new Set<string>();
let fallbackRefreshTimer: number | null = null;
const MAX_INCREMENTAL_BLOCKS_PER_FLUSH = 120;
const INCREMENTAL_QUEUE_DELAY_MS = 8;
const IMMEDIATE_FALLBACK_DELAY_MS = 80;
const TASK_ADDED_VERIFY_DELAY_MS = 90;
const OPTIMISTIC_TASK_SYNC_GUARD_MS = 2000;
const optimisticTaskSyncGuards = new Map<string, { task: Task; expiresAt: number }>();
const RECENTLY_DELETED_TASK_GUARD_MS = 2000;
const recentlyDeletedTaskBlockIds = new Map<string, number>();
const FALLBACK_FAILURE_THRESHOLD = 2;
let consecutiveFallbackFailures = 0;
let lastMismatchForceRefreshAt = 0;
const MISMATCH_FORCE_REFRESH_COOLDOWN = 500;
let taskScopeRefreshTimer: number | null = null;
let kernelTaskIndexRefreshTimer: number | null = null;
let isHydratingFilters = true;
const FILTER_SWITCH_BROAD_LOAD_THRESHOLD = 5000;

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
const {
  taskDocumentsByNotebook,
  allDocuments,
  allDocumentsByKey,
  documentGroupDialogDocuments,
  allDocumentGroupDocuments,
  goalScopeDocuments: sidebarGoalDocuments,
  refreshTaskDocumentOptions,
  scheduleTaskDocumentOptionsRefresh,
  clearTaskDocumentOptionsRefreshTimer
} = useTaskScopeDocuments({
  excludedNotebookIds,
  showCompletedTasks,
  enabledNotebookNameById,
  tasks,
  goalDocuments,
  resolveDocumentName: resolveDocumentEntryName,
  logPrefix: '[TaskManager]'
});

// === Notebook/document option derivation and persisted filter selection ===

function getDocumentsForActiveSource(sourceValue: string): TaskDocument[] {
  const parsed = parseDocumentSource(sourceValue);
  if (parsed.kind === 'all') {
    return [];
  }

  if (parsed.kind === 'notebook') {
    return [...(taskDocumentsByNotebook.value.get(parsed.id) || [])];
  }

  const sourceGoal = parsed.kind === 'goal'
    ? goalDefinitionsById.value.get(parsed.id) || null
    : null;
  const sourceMembers: DocumentGroupMember[] =
    parsed.kind === 'group'
      ? (documentGroupsById.value.get(parsed.id)?.members || [])
      : (sourceGoal?.members || []);
  if (sourceMembers.length === 0 && !sourceGoal) {
    return [];
  }

  const documents: TaskDocument[] = [];
  const seen = new Set<string>();

  const addDocument = (notebookId: string | undefined, documentId: string | undefined): void => {
    const normalizedNotebookId = typeof notebookId === 'string' ? notebookId.trim() : '';
    const normalizedDocumentId = typeof documentId === 'string' ? documentId.trim() : '';
    if (!normalizedNotebookId || !normalizedDocumentId) {
      return;
    }
    const key = `${normalizedNotebookId}:${normalizedDocumentId}`;
    if (!enabledNotebookNameById.value.has(normalizedNotebookId)) {
      return;
    }
    if (seen.has(key)) {
      return;
    }
    seen.add(key);

    const existing = allDocumentsByKey.value.get(key);
    if (!existing) {
      return;
    }

    documents.push(existing);
  };

  sourceMembers.forEach((member) => {
    addDocument(member.notebookId, member.documentId);
  });
  if (sourceGoal) {
    (sourceGoal.taskMembers || []).forEach((member) => {
      addDocument(member.notebookId, member.rootId);
    });
    tasks.value.forEach((task) => {
      if (!isTaskDirectGoalMember(sourceGoal, task)) {
        return;
      }
      addDocument(task.notebookId, task.rootId);
    });
  }

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

function getConfiguredDefaultTaskNotebook(): string {
  const configured = typeof userSettings.taskManager.defaultTaskCreateNotebook === 'string'
    ? userSettings.taskManager.defaultTaskCreateNotebook.trim()
    : '';
  return enabledNotebooks.value.some(notebook => notebook.id === configured) ? configured : '';
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
  return getConfiguredDefaultTaskNotebook() || lastTaskNotebook.value || '';
});

const taskModalDefaultDocument = computed(() => {
  if (userSettings.taskManager.defaultTaskCreateTarget === 'daily-note') {
    return PINCH_DAILY_NOTE_OPTION_ID;
  }
  if (userSettings.taskManager.defaultTaskCreateTarget === 'inbox') {
    return PINCH_INBOX_OPTION_ID;
  }
  if (filterDocument.value !== 'all') {
    return filterDocument.value;
  }
  if (parsedFilterSource.value.kind === 'group' || parsedFilterSource.value.kind === 'goal') {
    return sourceDocuments.value[0]?.id || lastTaskDocument.value || '';
  }
  return lastTaskDocument.value || '';
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

/**
 * Persist the current scope without waiting for the debounce timer. This is
 * used during teardown, when clearing the timer would otherwise discard the
 * last source/document selection before it ever reaches plugin storage.
 */
function flushFilterSettingsUpdate(): void {
  if (filterSettingsUpdateTimer === null) {
    return;
  }
  clearTimeout(filterSettingsUpdateTimer);
  filterSettingsUpdateTimer = null;
  const activeSource = parseDocumentSource(filterNotebook.value);
  void updateSettings('taskManager', {
    filterSource: filterNotebook.value,
    filterNotebook: activeSource.kind === 'notebook' ? activeSource.id : 'all',
    filterDocument: filterDocument.value,
    archiveViewMode: archiveViewMode.value
  });
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
  if (show) {
    void nextTick(updateTaskModalOverlayStyle);
  }
});

watch(taskEditMenuTaskId, () => {
  taskEditorQuickPanel.value = null;
  void nextTick(scheduleTaskEditorSidebarPositionUpdate);
});

watch(activeTaskEditTask, (task) => {
  syncTaskEditorRepeatState(task);
  void nextTick(scheduleTaskEditorSidebarPositionUpdate);
}, { immediate: true });

watch(taskEditorSidebarVisible, (visible) => {
  if (visible) {
    lockTaskEditorParentScroll();
    void nextTick(scheduleTaskEditorSidebarPositionUpdate);
  } else {
    unlockTaskEditorParentScroll();
  }
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
const taskStatusFilterOptions: Array<{ value: Task['status']; label: string }> = buildTaskStatusFilterOptions(t);
const taskPriorityFilterOptions: Array<{ value: Task['priority']; label: string }> = buildTaskPriorityOptions(t);
const taskDueFilterOptions: Array<{ value: TaskDueFilterKey; label: string }> = [
  { value: 'overdue', label: t('taskManager.dueOverdue') },
  { value: 'today', label: t('taskManager.dueToday') },
  { value: 'next7Days', label: t('taskManager.dueNext7Days') },
  { value: 'allScheduled', label: t('taskManager.allScheduledTasks') },
  { value: 'thisWeekend', label: t('taskManager.thisWeekend') },
  { value: 'noDueDate', label: t('taskManager.noDueDate') }
];
const taskUpdatedFilterOptions: Array<{ value: TaskUpdateFilterKey; label: string }> = [
  { value: 'today', label: t('taskManager.today') },
  { value: 'thisWeek', label: t('taskManager.thisWeek') },
  { value: 'thisMonth', label: t('taskManager.thisMonth') }
];
const taskExtraFilterOptions: Array<{ value: TaskExtraFilterKey; label: string }> = [
  { value: 'hasDescription', label: t('taskManager.hasDescription') },
  { value: 'hasSubtasks', label: t('taskManager.hasSubtasks') },
  { value: 'hasFocusEstimate', label: t('taskManager.hasFocusEstimate') }
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
    { value: TASK_GROUP_NONE_ID, label: t('taskManager.noTag'), style: {} }
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
  expression: taskFilterExpression,
  clear: clearTaskFilters,
  handleToggle: handleTaskFilterToggle,
  restoreExpression: restoreTaskFilterExpression,
  cycleExpressionJoin: cycleTaskFilterJoin
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
  restoreTaskFilterExpression(settings.taskFilterExpression);
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
      taskExtraFilters: [...activeTaskExtraFilters.value],
      taskFilterExpression: taskFilterExpression.value.map(({ group, value, join }) => ({ group, value, join }))
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

/** Flush a pending grouping/view preference before this panel is destroyed. */
function flushTaskListGroupSettingsUpdate(): void {
  if (taskListGroupSettingsUpdateTimer === null) {
    return;
  }
  clearTimeout(taskListGroupSettingsUpdateTimer);
  taskListGroupSettingsUpdateTimer = null;
  void updateSettings('taskManager', {
    taskListGroupBy: taskListGroupBy.value,
    taskListViewMode: taskListViewMode.value,
    showTaskCardDetails: showTaskCardDetails.value
  });
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
    activeTaskExtraFilters,
    taskFilterExpression
  ],
  () => {
    if (isHydratingFilters) {
      return;
    }
    scheduleTaskPopoverFilterSettingsUpdate();
  }
);

const taskEditorDueText = computed(() => {
  const dueDate = activeTaskEditDraft.value?.dueDate || '';
  if (!dueDate) return t('taskManager.notSet');
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
  const includeCompleted = mode === 'active'
    ? showCompletedTasks.value || taskListViewMode.value === 'timeline'
    : true;
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
  return normalizeQuickDateInputValue(value);
}

function normalizeTimeInputValue(value: string): string {
  return normalizeQuickTimeInputValue(value);
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

function closeTaskQuickMetaMenu(): void {
  taskQuickMetaMenu.value = {
    show: false,
    x: 0,
    y: 0,
    task: null,
    removeTrigger: null,
    initialPanel: null,
    panelOnly: false
  };
  taskQuickMetaDraft.value = {
    priority: 'none',
    reminderType: undefined,
    reminderCustomTime: '',
    tags: [],
    groupId: '',
    goalIds: [],
    startDate: '',
    startTime: '',
    dueDate: '',
    dueTime: ''
  };
}

async function resolveTaskQuickDateRecognitionText(task: Task): Promise<string> {
  const blockId = typeof task.blockId === 'string' ? task.blockId.trim() : '';
  if (blockId) {
    const liveTitle = getLiveTaskTitle(blockId);
    if (liveTitle !== null) {
      return liveTitle;
    }

    try {
      const blockData = await getBlockDOM(blockId);
      const dom = typeof blockData?.dom === 'string' ? blockData.dom : '';
      if (dom) {
        const parsedDoc = new DOMParser().parseFromString(dom, 'text/html');
        const parsedTitle = parseTaskTitle(blockId, parsedDoc);
        if (parsedTitle !== null) {
          return parsedTitle;
        }
      }
    } catch {
    }
  }

  return typeof task.title === 'string' ? task.title : '';
}

async function seedTaskQuickDateDraft(task: Task): Promise<void> {
  const recognitionText = await resolveTaskQuickDateRecognitionText(task);
  const inferredDateRange = TaskRepository.inferTaskDateRangeFromText(recognitionText);
  const repeatDateFields = isRepeatTaskForDateSave(task)
    ? await getRepeatTaskDateFields(task).catch(() => null)
    : null;
  taskQuickDateDraft.value = buildTaskQuickDateDraft(repeatDateFields || task, inferredDateRange);
}

async function seedTaskQuickMetaDraft(task: Task): Promise<void> {
  const repeatDateFields = isRepeatTaskForDateSave(task)
    ? await getRepeatTaskDateFields(task).catch(() => null)
    : null;
  const dateDraft = buildTaskQuickDateDraft(repeatDateFields || task);
  const tagState = buildTaskTagState(task.tags, task.groupId);
  const reminderState = normalizeTaskReminderSelection(task);
  taskQuickMetaDraft.value = {
    ...dateDraft,
    priority: task.priority || 'none',
    reminderType: reminderState.reminderType,
    reminderCustomTime: reminderState.reminderCustomTime,
    tags: [...tagState.tagIds],
    groupId: tagState.primaryTagId,
    goalIds: getEffectiveGoalIdsForTask(goalDefinitions.value, task)
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

async function openTaskQuickDateMenu(
  task: Task,
  anchorPosition?: { x: number; y: number } | null
): Promise<void> {
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const menuWidth = Math.min(300, viewportWidth - 24);
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

  await seedTaskQuickDateDraft(task);
  taskQuickDateMenu.value = {
    show: true,
    x,
    y,
    task
  };
}

async function openTaskQuickMetaMenu(
  task: Task,
  anchorPosition?: { x: number; y: number } | null,
  options: { removeTrigger?: (() => void) | null; initialPanel?: 'priority' | 'tags' | 'goals' | 'due' | 'reminder' | null; panelOnly?: boolean } = {}
): Promise<void> {
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const menuWidth = 190;
  const popoverWidth = 300;
  const estimatedHeight = 330;
  const popoverOverflow = Math.max(0, (popoverWidth - menuWidth) / 2);
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

  const minX = margin + popoverOverflow;
  const maxX = Math.max(minX, viewportWidth - menuWidth - margin - popoverOverflow);
  x = Math.max(minX, Math.min(x, maxX));
  y = Math.max(margin, Math.min(y, Math.max(margin, viewportHeight - estimatedHeight - margin)));

  await seedTaskQuickMetaDraft(task);
  taskQuickMetaMenu.value = {
    show: true,
    x,
    y,
    task,
    removeTrigger: typeof options.removeTrigger === 'function' ? options.removeTrigger : null,
    initialPanel: options.initialPanel || null,
    panelOnly: options.panelOnly === true
  };
}

async function handleTaskQuickDateMetaTool(
  panel: 'priority' | 'tags' | 'goals' | 'reminder',
  anchor: DOMRect
): Promise<void> {
  const { task } = taskQuickDateMenu.value;
  if (!task) return;
  await openTaskQuickMetaMenu(task, { x: anchor.left + anchor.width / 2, y: anchor.bottom }, {
    initialPanel: panel,
    panelOnly: true
  });
  taskQuickMetaDraft.value.startDate = taskQuickDateDraft.value.startDate;
  taskQuickMetaDraft.value.startTime = taskQuickDateDraft.value.startTime;
  taskQuickMetaDraft.value.dueDate = taskQuickDateDraft.value.dueDate;
  taskQuickMetaDraft.value.dueTime = taskQuickDateDraft.value.dueTime;
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
    Math.min(400, viewportWidth - horizontalMargin * 2, containerRect.width - 8)
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

function formatTaskManagerRepeatWindowDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function resolveTaskManagerRepeatWindow(): TaskRepeatWindow {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - DEFAULT_TASK_REPEAT_MATERIALIZE_OPTIONS.pastDays);
  const end = new Date(today);
  end.setDate(end.getDate() + DEFAULT_TASK_REPEAT_MATERIALIZE_OPTIONS.futureDays);
  return {
    startDate: formatTaskManagerRepeatWindowDate(start),
    endDate: formatTaskManagerRepeatWindowDate(end)
  };
}

function resolveTaskManagerRepeatMaterializeOptions() {
  return {
    ...resolveTaskRepeatMaterializeOptions(resolveTaskManagerRepeatWindow()),
    includeTemplateDate: true
  };
}

function matchesTaskDueFilter(task: Task, filter: TaskDueFilterKey): boolean {
  const dueTimestamp = getTaskDueDateTimestamp(task);
  if (filter === 'noDueDate') {
    return dueTimestamp === null;
  }
  if (dueTimestamp === null) {
    return false;
  }
  if (filter === 'allScheduled') {
    return true;
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
    case 'thisWeekend': {
      const saturday = new Date(today);
      const mondayBasedDay = (today.getDay() + 6) % 7;
      saturday.setDate(today.getDate() + 5 - mondayBasedDay);
      const weekendStart = saturday.getTime();
      return dueTimestamp >= weekendStart && dueTimestamp < weekendStart + dayMs * 2;
    }
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
  return matchesTaskFilterExpression(task, taskFilterExpression.value, (candidate, condition) => {
    switch (condition.group) {
      case 'status':
        return candidate.status === condition.value;
      case 'priority':
        return candidate.priority === condition.value;
      case 'group':
        return matchesTaskTagFilter(candidate.tags, candidate.groupId, [condition.value], TASK_GROUP_NONE_ID);
      case 'due':
        return matchesTaskDueFilter(candidate, condition.value as TaskDueFilterKey);
      case 'updated':
        return matchesTaskUpdatedFilter(candidate, condition.value as TaskUpdateFilterKey);
      case 'extra':
        if (condition.value === 'hasDescription') {
          return typeof candidate.description === 'string' && candidate.description.trim().length > 0;
        }
        if (condition.value === 'hasSubtasks') {
          return Array.isArray(candidate.subtasks) && candidate.subtasks.length > 0;
        }
        return condition.value === 'hasFocusEstimate' && !!candidate.focusEstimate;
    }
  });
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
  const tagNames = resolveTaskTagIds(task.tags, task.groupId)
    .map(tagId => taskGroupNameMap.value.get(tagId) || '')
    .filter(name => name.length > 0);
  return matchesTaskSearchValue(task.title, keyword)
    || matchesTaskSearchValue(task.description, keyword)
    || matchesTaskSearchValue(task.hPath, keyword)
    || tagNames.some(name => matchesTaskSearchValue(name, keyword))
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

function normalizeTaskDateIdentityValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function collectTaskDateIdentity(task: Partial<Task> | null | undefined): {
  taskIds: Set<string>;
  blockIds: Set<string>;
  repeatSeriesId: string;
} {
  const taskIds = new Set<string>();
  const blockIds = new Set<string>();
  const addTaskId = (value: unknown): void => {
    const normalizedValue = normalizeTaskDateIdentityValue(value);
    if (normalizedValue) {
      taskIds.add(normalizedValue);
    }
  };
  const addBlockId = (value: unknown): void => {
    const normalizedValue = normalizeTaskDateIdentityValue(value);
    if (normalizedValue) {
      blockIds.add(normalizedValue);
    }
  };

  addTaskId(task?.id);
  addBlockId(task?.blockId);

  return {
    taskIds,
    blockIds,
    repeatSeriesId: normalizeTaskDateIdentityValue(task?.repeatSeriesId)
  };
}

function areTaskDateIdentitiesRelated(
  left: Partial<Task> | null | undefined,
  right: Partial<Task> | null | undefined
): boolean {
  if (!left || !right) {
    return false;
  }
  const leftIdentity = collectTaskDateIdentity(left);
  const rightIdentity = collectTaskDateIdentity(right);
  for (const taskId of leftIdentity.taskIds) {
    if (rightIdentity.taskIds.has(taskId)) {
      return true;
    }
  }
  for (const blockId of leftIdentity.blockIds) {
    if (rightIdentity.blockIds.has(blockId)) {
      return true;
    }
  }
  // A date update is for one concrete task (or its backing block), not every
  // occurrence in a repeat series. Matching on repeatSeriesId here turns the
  // virtual occurrences into the template when an editor broadcasts a
  // template date change, which makes later reconciliations accumulate cards.
  return false;
}

/**
 * Incremental block queries return child items from the DOM, which only has
 * presentation fields. Retain the existing complete subtree and overlay just
 * the live title/completion state so a child attribute change cannot erase its
 * siblings or descendants.
 */
function mergeIncrementalSubtaskPresentation(
  existingSubtasks: NonNullable<Task['subtasks']>,
  incomingSubtasks: NonNullable<Task['subtasks']>
): NonNullable<Task['subtasks']> {
  const existingByIdentity = new Map<string, NonNullable<Task['subtasks']>[number]>();
  for (const subtask of existingSubtasks) {
    if (subtask.nodeId) existingByIdentity.set(`node:${subtask.nodeId}`, subtask);
    existingByIdentity.set(`id:${subtask.id}`, subtask);
  }

  const merged = incomingSubtasks.map((incoming) => {
    const existing = (incoming.nodeId ? existingByIdentity.get(`node:${incoming.nodeId}`) : undefined)
      || existingByIdentity.get(`id:${incoming.id}`);
    if (!existing) return incoming;

    const incomingChildren = Array.isArray(incoming.subtasks) ? incoming.subtasks : [];
    const existingChildren = Array.isArray(existing.subtasks) ? existing.subtasks : [];
    return {
      ...existing,
      title: incoming.title || existing.title,
      completed: typeof incoming.completed === 'boolean' ? incoming.completed : existing.completed,
      status: incoming.status || existing.status,
      subtasks: incomingChildren.length > 0
        ? mergeIncrementalSubtaskPresentation(existingChildren, incomingChildren)
        : existing.subtasks
    };
  });
  const incomingIdentities = new Set(incomingSubtasks.flatMap(subtask => [
    `id:${subtask.id}`,
    ...(subtask.nodeId ? [`node:${subtask.nodeId}`] : [])
  ]));
  // A DOM response can be partial while a transaction is settling. Keep any
  // missing existing children until a dedicated delete/full-refresh event
  // confirms otherwise.
  for (const existing of existingSubtasks) {
    const isPresent = incomingIdentities.has(`id:${existing.id}`)
      || (!!existing.nodeId && incomingIdentities.has(`node:${existing.nodeId}`));
    if (!isPresent) merged.push(existing);
  }
  return merged;
}

function patchTaskByDateIdentity(
  taskList: Task[],
  updatedTask: Task,
  patch: (task: Task) => void
): boolean {
  let touched = false;
  for (const task of taskList) {
    if (areTaskDateIdentitiesRelated(task, updatedTask)) {
      patch(task);
      touched = true;
    }
    if (Array.isArray(task.subtasks) && patchTaskByDateIdentity(task.subtasks as unknown as Task[], updatedTask, patch)) {
      touched = true;
    }
  }
  return touched;
}

function rememberLocalTaskFieldOverride<K extends keyof Task>(
  taskId: string,
  field: K,
  value: Task[K],
  ttlMs = 8000
): void {
  const normalizedTaskId = normalizeTaskDateIdentityValue(taskId);
  if (!normalizedTaskId) {
    return;
  }
  const existing = localTaskFieldOverrides.get(normalizedTaskId);
  localTaskFieldOverrides.set(normalizedTaskId, {
    values: {
      ...(existing?.values || {}),
      [field]: value
    } as Partial<Task>,
    expiresAt: Date.now() + ttlMs
  });
}

function applyLocalTaskFieldOverrides(task: Task): Task {
  const override = localTaskFieldOverrides.get(task.id);
  if (override && override.expiresAt <= Date.now()) {
    localTaskFieldOverrides.delete(task.id);
  }

  const activeOverride = localTaskFieldOverrides.get(task.id);
  const subtasks = Array.isArray(task.subtasks)
    ? task.subtasks.map(subtask => applyLocalTaskFieldOverrides(subtask as Task) as typeof subtask)
    : task.subtasks;

  if (!activeOverride && subtasks === task.subtasks) {
    return task;
  }
  return {
    ...task,
    ...(activeOverride?.values || {}),
    subtasks
  };
}

function applyLocalTaskFieldOverridesToList(taskList: Task[]): Task[] {
  if (localTaskFieldOverrides.size === 0) {
    return taskList;
  }
  return taskList.map(task => applyLocalTaskFieldOverrides(task));
}

function clearLocalRepeatInstanceOverrides(seriesId: string | undefined): void {
  const normalizedSeriesId = typeof seriesId === 'string' ? seriesId.trim() : '';
  if (!normalizedSeriesId) {
    return;
  }
  const instanceIdPrefix = `repeat_${normalizedSeriesId}_`;
  for (const taskId of localTaskFieldOverrides.keys()) {
    if (taskId.startsWith(instanceIdPrefix)) {
      localTaskFieldOverrides.delete(taskId);
    }
  }
}

function isTaskIncludedByNotebookScope(task: Task): boolean {
  const notebookId = typeof task.notebookId === 'string' ? task.notebookId.trim() : '';
  return !notebookId || !excludedNotebookIds.value.includes(notebookId);
}

function filterTasksByNotebookScope(taskList: Task[]): Task[] {
  if (excludedNotebookIds.value.length === 0) {
    return taskList;
  }
  return taskList.filter(task => isTaskIncludedByNotebookScope(task));
}

function getTasksWithLocalOverrides(): Task[] {
  return filterRecentlyDeletedTasks(filterTasksByNotebookScope(applyLocalTaskFieldOverridesToList(crdtRepo.getTasks())));
}

function isRecentlyDeletedTaskBlock(blockId?: string): boolean {
  const normalizedBlockId = typeof blockId === 'string' ? blockId.trim() : '';
  if (!normalizedBlockId) return false;
  const expiresAt = recentlyDeletedTaskBlockIds.get(normalizedBlockId);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    recentlyDeletedTaskBlockIds.delete(normalizedBlockId);
    return false;
  }
  return true;
}

function filterRecentlyDeletedTasks(taskList: Task[]): Task[] {
  return taskList.filter(task => !isRecentlyDeletedTaskBlock(task.blockId));
}

function reconcileTaskSnapshotWithOptimisticGuards(taskList: Task[]): Task[] {
  const now = Date.now();
  const indexedBlockIds = new Set(
    taskList
      .map(task => task.blockId)
      .filter((blockId): blockId is string => typeof blockId === 'string' && blockId.length > 0)
  );
  const reconciledTasks = [...taskList];
  optimisticTaskSyncGuards.forEach((pending, blockId) => {
    if (indexedBlockIds.has(blockId) || pending.expiresAt <= now) {
      optimisticTaskSyncGuards.delete(blockId);
      return;
    }
    reconciledTasks.push(pending.task);
  });
  return reconciledTasks;
}

function syncTaskSnapshotWithLocalOverrides(taskList: Task[]): Task[] {
  const reconciledTasks = reconcileTaskSnapshotWithOptimisticGuards(filterRecentlyDeletedTasks(taskList));
  crdtRepo.syncFromSQLTasks(filterTasksByNotebookScope(applyLocalTaskFieldOverridesToList(reconciledTasks)));
  return getTasksWithLocalOverrides();
}

function syncRepeatTaskDescriptionLocally(task: Task, description: string): boolean {
  return syncRepeatTemplateTaskLocally(task, (item) => {
    item.description = description;
  });
}

/** Keep repeat-instance cards aligned with their persisted template immediately. */
function syncRepeatTemplateTaskLocally(task: Task, syncTask: (task: Task) => void): boolean {
  const seriesId = getTaskRepeatSeriesId(task);
  if (!seriesId) {
    return false;
  }

  let touched = false;
  tasks.value.forEach((item) => {
    if (!item.isVirtual || item.repeatSeriesId !== seriesId) {
      return;
    }
    syncTask(item);
    // A virtual instance's updatedAt comes from the repeat series, not the
    // template block. Changing it here makes the subsequent materialized
    // snapshot look different and replaces the card tree unnecessarily.
    touched = true;
  });

  return touched;
}

function rememberRepeatTaskFieldOverrides(task: Task, values: Partial<Task>): void {
  const seriesId = getTaskRepeatSeriesId(task);
  const affectedTasks = tasks.value.filter((item) => (
    item.id === task.id || (!!seriesId && item.isVirtual && item.repeatSeriesId === seriesId)
  ));
  for (const affectedTask of affectedTasks) {
    for (const [field, value] of Object.entries(values) as Array<[keyof Task, Task[keyof Task]]>) {
      rememberLocalTaskFieldOverride(affectedTask.id, field, value);
    }
  }
}

function syncRepeatTaskFieldOverridesToCrdt(task: Task, values: Partial<Task>): void {
  const seriesId = getTaskRepeatSeriesId(task);
  if (!seriesId) {
    return;
  }
  for (const instance of tasks.value) {
    if (!instance.isVirtual || instance.repeatSeriesId !== seriesId) {
      continue;
    }
    for (const [field, value] of Object.entries(values) as Array<[keyof Task, Task[keyof Task]]>) {
      crdtRepo.updateTaskField(instance.id, field as any, value);
    }
  }
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

const {
  matchesMember: matchesTaskDocumentMemberScope,
  isExcluded: isTaskExcludedFromDocumentScope
} = useDocumentScopeMatcher({
  documents: allDocumentGroupDocuments,
  documentGroups,
  goals: goalDefinitions,
  taskPathLookup: taskDocumentPathLookup,
  logPrefix: '[TaskManager]'
});

function getTaskManagerGoalIds(task: Task): string[] {
  return Array.from(new Set([
    ...goalDefinitions.value
      .filter(goal => isTaskDirectGoalMember(goal, task)
        || (!isTaskExcludedFromDocumentScope(task, goal.excludedDocumentKeys)
          && goal.members.some(member => matchesTaskDocumentMemberScope(task, member))))
      .map(goal => goal.id),
    ...getGoalIdsForTask(goalDefinitions.value, task)
  ]));
}

function matchesActiveSourceFilter(task: Task): boolean {
  const activeSource = parsedFilterSource.value;
  if (activeSource.kind === 'notebook' && task.notebookId !== activeSource.id) {
    return false;
  }
  if (filterDocument.value !== 'all' && !taskMatchesDocumentScope(task, filterDocument.value, taskDocumentPathLookup.value)) {
    return false;
  }
  if (activeSource.kind !== 'group' && activeSource.kind !== 'goal') {
    return true;
  }
  if (activeSource.kind === 'goal') {
    const goal = goalDefinitionsById.value.get(activeSource.id);
    return isTaskDirectGoalMember(goal, task)
      || (!!goal
        && !isTaskExcludedFromDocumentScope(task, goal.excludedDocumentKeys)
        && goal.members.some(member => matchesTaskDocumentMemberScope(task, member)));
  }

  const group = documentGroupsById.value.get(activeSource.id);
  if (!group || isTaskExcludedFromDocumentScope(task, group.excludedDocumentKeys)) {
    return false;
  }
  return group.members.some(member => matchesTaskDocumentMemberScope(task, member));
}

const filteredTasks = computed(() => {
  // Manual invalidation hook for mutation paths that should force re-sorting.
  void taskSortVersion.value;
  const mode = archiveViewMode.value;
  const includeCompleted = mode === 'active' ? showCompletedTasks.value : true;
  const searchKeyword = taskSearchQuery.value.trim().toLocaleLowerCase();
  const todayStart = getTodayStartTimestamp();
  const virtualRepeatSeriesIds = new Set<string>();
  const visibleVirtualRepeatTaskIds = new Set<string>();
  const todayVirtualSeriesIds = new Set<string>();
  const latestOverdueVirtualBySeries = new Map<string, { id: string; date: number }>();
  const nearestFutureVirtualBySeries = new Map<string, { id: string; date: number }>();
  for (const task of baseFilteredTasks.value) {
    if (task.isVirtual && task.repeatSeriesId) {
      virtualRepeatSeriesIds.add(task.repeatSeriesId);
      if (isVirtualTaskForToday(task)) {
        todayVirtualSeriesIds.add(task.repeatSeriesId);
        visibleVirtualRepeatTaskIds.add(task.id);
        continue;
      }
      const taskDate = getTaskDueDateTimestamp(task) ?? getTaskStartDateTimestamp(task);
      if (taskDate !== null && taskDate < todayStart) {
        const current = latestOverdueVirtualBySeries.get(task.repeatSeriesId);
        if (!current || taskDate > current.date) {
          latestOverdueVirtualBySeries.set(task.repeatSeriesId, { id: task.id, date: taskDate });
        }
      } else if (taskDate !== null && taskDate > todayStart) {
        const current = nearestFutureVirtualBySeries.get(task.repeatSeriesId);
        if (!current || taskDate < current.date) {
          nearestFutureVirtualBySeries.set(task.repeatSeriesId, { id: task.id, date: taskDate });
        }
      }
    }
  }
  for (const [seriesId, instance] of latestOverdueVirtualBySeries) {
    if (!todayVirtualSeriesIds.has(seriesId)) visibleVirtualRepeatTaskIds.add(instance.id);
  }
  for (const [seriesId, instance] of nearestFutureVirtualBySeries) {
    if (!todayVirtualSeriesIds.has(seriesId) && !latestOverdueVirtualBySeries.has(seriesId)) {
      visibleVirtualRepeatTaskIds.add(instance.id);
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
    if (!isTaskIncludedByNotebookScope(task)) {
      return false;
    }
    if (!task.isVirtual && task.repeatSeriesId && virtualRepeatSeriesIds.has(task.repeatSeriesId)) {
      return false;
    }
    if (task.isVirtual && !visibleVirtualRepeatTaskIds.has(task.id)) {
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
  if (taskListViewMode.value === 'timeline') {
    const todayStart = getTodayStartTimestamp();
    return filteredTasks.value.filter((task) => {
      switch (timelineTaskFilter.value) {
        case 'incomplete':
          return task.status !== 'completed';
        case 'completed':
          return task.status === 'completed';
        case 'overdue': {
          const dueTimestamp = getTaskDueDateTimestamp(task);
          return task.status !== 'completed' && dueTimestamp !== null && dueTimestamp < todayStart;
        }
        case 'unscheduled':
          return getTaskStartDateTimestamp(task) === null && getTaskDueDateTimestamp(task) === null;
        default:
          return true;
      }
    });
  }
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
  taskListViewMode.value === 'list'
  || taskListViewMode.value === 'timeline'
  || taskListGroupBy.value !== 'none'
);
const shouldShowTaskCardDetails = computed(() => showTaskCardDetails.value);

const taskGroupedSections = computed<TaskGroupedSection[]>(() => {
  const tasks = displayedTasks.value;
  const mode = taskListGroupBy.value;
  const isListView = taskListViewMode.value === 'list';
  if (tasks.length === 0) {
    return [];
  }
  if (taskListViewMode.value === 'timeline') {
    const sections = new Map<string, TaskGroupedSection>();
    const unscheduled: Task[] = [];
    const dayMs = 24 * 60 * 60 * 1000;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    const tomorrowStart = todayStart + dayMs;
    const getTimelineTimestamp = (task: Task): number | null => {
      const date = task.startDate || task.dueDate;
      const time = task.startDate ? task.startTime : task.dueTime;
      const dateTimestamp = getTaskDateTimestamp(date);
      if (dateTimestamp === null) return null;
      const normalizedTime = normalizeTimeInputValue((time || '').toString());
      if (!normalizedTime) return dateTimestamp;
      const [hours, minutes] = normalizedTime.split(':').map(Number);
      return dateTimestamp + (hours * 60 + minutes) * 60 * 1000;
    };
    const getTimelineDateLabel = (timestamp: number): { day: string; weekday: string } => {
      const date = new Date(timestamp);
      return {
        day: `${date.getMonth() + 1}-${date.getDate()}`,
        weekday: timelineWeekdayFormatter.format(date)
      };
    };
    const getTimelineDateKey = (timestamp: number): string => {
      const date = new Date(timestamp);
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    };
    tasks.forEach((task) => {
      const scheduledTimestamp = getTimelineTimestamp(task);
      if (scheduledTimestamp === null) {
        unscheduled.push(task);
        return;
      }
      const startTimestamp = getTaskStartDateTimestamp(task);
      const dueTimestamp = getTaskDueDateTimestamp(task);
      const isOverdue = task.status !== 'completed'
        && dueTimestamp !== null
        && dueTimestamp < todayStart;
      // A task with a past start date and no due date remains active, so keep it
      // in today's timeline instead of leaving it under its original start date.
      const isActiveToday = startTimestamp !== null
        && startTimestamp < todayStart
        && (dueTimestamp === null || dueTimestamp >= todayStart);
      const isToday = isActiveToday
        || (startTimestamp !== null && startTimestamp >= todayStart && startTimestamp < tomorrowStart)
        || (dueTimestamp !== null && dueTimestamp >= todayStart && dueTimestamp < tomorrowStart);
      const timestamp = isActiveToday ? todayStart : scheduledTimestamp;
      const bucket = isToday ? 'today' : isOverdue ? 'overdue' : startTimestamp !== null && startTimestamp < todayStart ? 'past' : 'future';
      // Keep overdue work visible before historical (completed) entries.
      const bucketOrder = bucket === 'today' ? 0 : bucket === 'future' ? 1 : bucket === 'overdue' ? 2 : 3;
      const dateKey = bucket === 'overdue' ? 'overdue' : getTimelineDateKey(timestamp);
      const key = `timeline:${bucket}:${timestamp}`;
      const existing = sections.get(key);
      if (existing) {
        existing.tasks.push(task);
        return;
      }
      sections.set(key, {
        key,
        label: new Date(timestamp).getHours() === 0 && new Date(timestamp).getMinutes() === 0
          ? t('taskManager.allDay')
          : `${String(new Date(timestamp).getHours()).padStart(2, '0')}:${String(new Date(timestamp).getMinutes()).padStart(2, '0')}`,
        tasks: [task],
        order: bucketOrder * 1_000_000_000_000_000 + timestamp,
        timelineDateKey: dateKey,
        timelineDateTimestamp: timestamp
      });
    });
    const timeSections = Array.from(sections.values()).sort((left, right) => left.order - right.order);
    const dateSections = new Map<string, TaskGroupedSection>();
    timeSections.forEach((timeSection) => {
      const dateKey = timeSection.timelineDateKey || timeSection.key;
      const existing = dateSections.get(dateKey);
      if (existing) {
        existing.tasks.push(...timeSection.tasks);
        const firstTaskId = timeSection.tasks[0]?.id;
        if (firstTaskId) {
          existing.timelineTaskLabels?.set(firstTaskId, timeSection.label);
        }
        return;
      }
      const timelineTaskLabels = new Map<string, string>();
      const firstTaskId = timeSection.tasks[0]?.id;
      if (firstTaskId) {
        timelineTaskLabels.set(firstTaskId, timeSection.label);
      }
      dateSections.set(dateKey, {
        key: `timeline:date:${dateKey}`,
        label: '',
        tasks: [...timeSection.tasks],
        order: timeSection.order,
        timelineDateKey: dateKey,
        timelineDateTimestamp: timeSection.timelineDateTimestamp,
        timelineTaskLabels
      });
    });
    const result = Array.from(dateSections.values()).sort((left, right) => left.order - right.order);
    result.forEach((section) => {
      const dateKey = section.timelineDateKey || '';
      section.timelineDateLabel = dateKey === 'overdue'
        ? { day: t('taskManager.overdue'), weekday: '' }
        : getTimelineDateLabel(section.timelineDateTimestamp || todayStart);
    });
    if (unscheduled.length > 0) {
      const timelineTaskLabels = new Map<string, string>();
      const firstTaskId = unscheduled[0]?.id;
      if (firstTaskId) {
        timelineTaskLabels.set(firstTaskId, t('taskManager.unscheduled'));
      }
      result.push({
        key: 'timeline:unscheduled',
        label: t('taskManager.unscheduled'),
        tasks: unscheduled,
        order: Number.MAX_SAFE_INTEGER,
        timelineTaskLabels,
        timelineDateLabel: { day: t('taskManager.other'), weekday: '' }
      });
    }
    return result;
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
        label: t('taskManager.statusPending'),
        tasks: pendingTasks,
        order: 0
      });
    }
    if (completedTasks.length > 0) {
      sections.push({
        key: 'list:completed',
        label: t('taskManager.statusCompleted'),
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
      label: t('taskManager.pinned'),
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
        label: getTaskStatusLabel(status, t),
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
        label: t('taskManager.noTag'),
        tasks: noneTasks,
        order: Number.MAX_SAFE_INTEGER
      });
    }
    if (completedTasks.length > 0) {
      sections.push({
        key: 'completed:all',
        label: t('taskManager.statusCompleted'),
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
      { key: 'overdue', label: t('taskManager.overdue') },
      { key: 'today', label: t('taskManager.today') },
      { key: 'thisWeek', label: t('taskManager.thisWeek') },
      { key: 'thisMonth', label: t('taskManager.thisMonth') },
      { key: 'other', label: t('taskManager.other') }
    ] as const;
    const grouped = new Map<(typeof dateSections)[number]['key'], Task[]>();
    dateSections.forEach((section) => grouped.set(section.key, []));
    const dateTaskOriginalIndex = new Map<string, number>();
    tasksWithoutPinnedSection.forEach((task, index) => {
      dateTaskOriginalIndex.set(task.id, index);
    });
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

    const isTimestampInDateSection = (
      timestamp: number | null,
      sectionKey: (typeof dateSections)[number]['key']
    ): boolean => {
      if (timestamp === null) {
        return false;
      }
      if (sectionKey === 'overdue') {
        return timestamp < todayStart;
      }
      if (sectionKey === 'today') {
        return timestamp >= todayStart && timestamp < tomorrowStart;
      }
      if (sectionKey === 'thisWeek') {
        return timestamp >= weekStartTimestamp && timestamp < weekEnd;
      }
      if (sectionKey === 'thisMonth') {
        return timestamp >= monthStart && timestamp < monthEnd;
      }
      return false;
    };

    const compareTasksInDateSection = (
      sectionKey: (typeof dateSections)[number]['key'],
      left: Task,
      right: Task
    ): number => {
      const leftDueInSection = isTimestampInDateSection(getTaskDueDateTimestamp(left), sectionKey);
      const rightDueInSection = isTimestampInDateSection(getTaskDueDateTimestamp(right), sectionKey);
      if (leftDueInSection !== rightDueInSection) {
        return leftDueInSection ? -1 : 1;
      }

      return (dateTaskOriginalIndex.get(left.id) ?? 0) - (dateTaskOriginalIndex.get(right.id) ?? 0);
    };

    return prependPinnedSection(dateSections
      .map((section, index) => ({
        key: `date:${section.key}`,
        label: section.label,
        tasks: [...(grouped.get(section.key) || [])].sort((left, right) =>
          compareTasksInDateSection(section.key, left, right)
        ),
        order: index
      }))
      .filter(section => section.tasks.length > 0));
  }

  if (mode === 'document') {
    const documentSections = new Map<string, TaskGroupedSection>();
    tasksWithoutPinnedSection.forEach((task, index) => {
      const documentGroup = resolveTaskDocumentGroup(task);
      const existing = documentSections.get(documentGroup.key);
      if (existing) {
        existing.tasks.push(task);
        existing.order = Math.min(existing.order, documentGroup.order);
        return;
      }
      documentSections.set(documentGroup.key, {
        key: documentGroup.key,
        label: documentGroup.label,
        tasks: [task],
        order: Number.isFinite(documentGroup.order) ? documentGroup.order : index
      });
    });

    const sections = Array.from(documentSections.values())
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
    return prependPinnedSection(sections);
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
    let label = (meta.label || '').trim() || t('taskManager.untitledHeading');
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
      label: t('taskManager.statusCompleted'),
      tasks: completedTasks,
      order: Number.MAX_SAFE_INTEGER
    });
  }
  return prependPinnedSection(sections);
});

function getTaskTimelineLabel(section: TaskGroupedSection, task: Task): string | null {
  return section.timelineTaskLabels?.get(task.id) ?? null;
}

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

const timelineVirtualRows = computed<TimelineVirtualRow[]>(() => {
  if (taskListViewMode.value !== 'timeline') {
    return [];
  }

  const rows: TimelineVirtualRow[] = [];
  for (const section of taskGroupedSections.value) {
    const collapsed = isTaskGroupSectionCollapsed(section.key);
    rows.push({
      key: `timeline:section:${section.key}`,
      type: 'section',
      section,
      isSectionEnd: collapsed
    });
    if (collapsed) {
      continue;
    }
    section.tasks.forEach((task, index) => {
      rows.push({
        key: `timeline:task:${section.key}:${task.id}`,
        type: 'task',
        section,
        task,
        timelineLabel: getTaskTimelineLabel(section, task),
        isSectionEnd: index === section.tasks.length - 1
      });
    });
  }
  return rows;
});

const shouldUseTaskVirtualList = computed(() =>
  taskListViewMode.value === 'kanban'
  && taskListGroupBy.value === 'none'
  && displayedTasks.value.length > TASK_VIRTUAL_THRESHOLD
  && !hasExpandedTaskDetails.value
);

const shouldUseTimelineVirtualList = computed(() =>
  taskListViewMode.value === 'timeline'
  && timelineVirtualRows.value.length > TIMELINE_VIRTUAL_THRESHOLD
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

const timelineVirtualRowHeightOffsets = computed(() => {
  taskHeightVersion.value;
  const rows = timelineVirtualRows.value;
  const offsets = new Array(rows.length + 1);
  offsets[0] = 0;
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const estimatedHeight = row.type === 'section'
      ? TIMELINE_VIRTUAL_HEADER_HEIGHT + (row.isSectionEnd ? TIMELINE_VIRTUAL_SECTION_END_EXTRA_HEIGHT : 0)
      : TASK_VIRTUAL_ROW_HEIGHT + (row.isSectionEnd ? TIMELINE_VIRTUAL_SECTION_END_EXTRA_HEIGHT : 0);
    const height = timelineVirtualRowHeightCache.get(row.key) ?? estimatedHeight;
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

const timelineVirtualSpacerStyle = computed(() => {
  if (!shouldUseTimelineVirtualList.value) return {};
  return {
    paddingTop: `${taskVirtualRange.value.top}px`,
    paddingBottom: `${taskVirtualRange.value.bottom}px`
  };
});

const virtualTimelineRows = computed(() => {
  if (!shouldUseTimelineVirtualList.value) return timelineVirtualRows.value;
  return timelineVirtualRows.value.slice(taskVirtualRange.value.start, taskVirtualRange.value.end);
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
  } else if (shouldUseTimelineVirtualList.value) {
    candidates = virtualTimelineRows.value
      .map(row => row.task)
      .filter((task): task is Task => Boolean(task));
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

  const blockIds = collectTaskTitleHydrationBlockIds(candidates, TASK_TITLE_HYDRATE_LIMIT);

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
    console.error('[TaskManager] Failed to hydrate task titles:', error);
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
  [displayedTasks, shouldUseTaskVirtualList, shouldUseTimelineVirtualList, isTaskListCollapsed],
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

watch(timelineVirtualRows, (rows) => {
  const validKeys = new Set(rows.map(row => row.key));
  for (const key of timelineVirtualRowHeightCache.keys()) {
    if (!validKeys.has(key)) {
      timelineVirtualRowHeightCache.delete(key);
    }
  }
  for (const key of timelineVirtualRowElements.keys()) {
    if (!validKeys.has(key)) {
      timelineVirtualRowElements.delete(key);
    }
  }
  taskHeightVersion.value += 1;
  if (!isTaskListCollapsed.value) {
    nextTick(() => {
      scheduleTaskVirtualUpdate();
    });
  }
});

watch(virtualDisplayedTasks, () => {
  nextTick(() => {
    scheduleTaskRowMeasure();
    scheduleTaskTitleHydration(120);
  });
});

watch(virtualTimelineRows, () => {
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
  // Virtual instances are regenerated from the series. Never carry a stale
  // optimistic override from a previous template-date broadcast into that
  // replacement snapshot, or the new instances become ordinary list cards.
  clearLocalRepeatInstanceOverrides(payload.seriesId);
  try {
    const { nextTasks, touched, handled } = await rebuildAffectedRepeatTasks(
      tasks.value,
      payload,
      resolveTaskManagerRepeatMaterializeOptions()
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

    tasks.value = syncTaskSnapshotWithLocalOverrides(nextTasks);
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

async function handleCardSubtaskOpen(_parentTask: Task, subtask: SubTask): Promise<void> {
  const blockId = typeof subtask.nodeId === 'string' ? subtask.nodeId.trim() : '';
  if (!blockId || isBatchEditMode.value) return;

  const fullTask = await TaskRepository.getTaskByBlockId(blockId, true).catch(() => null);
  const editorTask = fullTask || ({ ...subtask, blockId, type: 'block' } as Task);
  if (!ensureTaskEditDraft(editorTask)) return;

  activeTaskEditOverride.value = editorTask;
  taskEditMenuTaskId.value = editorTask.id;
  await openTaskEditorPopover(editorTask);
}

function updateTaskIndex() {
  blockIdToTaskIndex.clear();
  subtaskToParentMap.clear();
  
  tasks.value.forEach((task) => {
    if (task.blockId) {
      const existing = blockIdToTaskIndex.get(task.blockId);
      // Virtual instances share their template's blockId. Keep broadcasts
      // bound to the persisted template, never an arbitrary virtual card.
      if (!existing || (!task.isVirtual && existing.task.isVirtual)) {
        blockIdToTaskIndex.set(task.blockId, {
          task,
          isSubtask: false
        });
      }
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
  const scopedTasks = filterTasksByNotebookScope(tasks.value);
  if (scopedTasks.length !== tasks.value.length) {
    tasks.value = syncTaskSnapshotWithLocalOverrides(scopedTasks);
    invalidateCache();
    invalidateSortCache();
    updateTaskIndex();
  }
  lastLoadedScope = null;
}

function ensureActiveNotebookFilterInScope(): void {
  const activeSource = parsedFilterSource.value;
  if (activeSource.kind === 'notebook' && excludedNotebookIds.value.includes(activeSource.id)) {
    filterNotebook.value = 'all';
    filterDocument.value = 'all';
  }
}

async function openTaskScopeDialog(initialTab: TaskScopeDialogTab = 'scope') {
  if (notebooks.value.length === 0) {
    await loadNotebooks();
  }
  taskScopeDialogInitialTab.value = initialTab;
  showTaskScopeDialog.value = true;
  if (initialTab === 'goals') {
    // The goal manager can render the shared snapshot immediately. A fresh
    // task scan is comparatively expensive, so do not delay opening the
    // settings dialog while it runs.
    void loadGoalsData({ taskUseCache: false });
  }
  if (initialTab === 'scope' || initialTab === 'document-groups') {
    void refreshTaskScopeDocumentSourcesInBackground({ includeGoalsData: true });
  }
}

function closeTaskScopeDialog(): void {
  showTaskScopeDialog.value = false;
}

async function refreshTaskScopeDocumentSources(
  options: { includeGoalsData?: boolean } = {}
): Promise<void> {
  if (!requiresScopeInitialization.value) {
    await refreshTasks(true, {
      showLoading: false,
      compareExisting: false,
      source: 'manual-refresh'
    });
  }
  const refreshGoals = options.includeGoalsData
    ? loadGoalsData({ taskUseCache: false })
    : refreshGoalDocuments({ taskUseCache: false });
  await Promise.all([
    refreshTaskDocumentOptions(true),
    refreshGoals
  ]);
}

async function handleTaskScopeDocumentsRefresh(): Promise<void> {
  await refreshTaskScopeDocumentSourcesInBackground();
}

async function refreshTaskScopeDocumentSourcesInBackground(
  options: { includeGoalsData?: boolean } = {}
): Promise<void> {
  if (taskScopeDocumentsRefreshing.value) {
    return;
  }
  taskScopeDocumentsRefreshing.value = true;
  try {
    await refreshTaskScopeDocumentSources(options);
  } catch (error) {
    console.error('[TaskManager] Failed to refresh task scope document sources:', error);
  } finally {
    taskScopeDocumentsRefreshing.value = false;
  }
}

async function handleGlobalRecognizeTaskDates(): Promise<void> {
  if (isGlobalDateRecognitionRunning.value) {
    return;
  }

  isGlobalDateRecognitionRunning.value = true;
  try {
    const result = await TaskRepository.recognizeDatesForUndatedTasks();
    if (result.scanned === 0) {
      showMessage(t('taskManager.noUndatedTasks'), 2200, 'info');
      return;
    }

    if (result.updated > 0) {
      if (result.failed > 0) {
        showMessage(`${t('taskManager.dateWriteSuccessPrefix')} ${result.updated} ${t('taskManager.dateWriteSuccessMiddle')}，${result.failed} ${t('taskManager.dateWriteFailedSuffix')}`, 3200, 'error');
      } else {
        showMessage(`${t('taskManager.dateRecognizedWrittenPrefix')} ${result.updated} ${t('taskManager.dateRecognizedWrittenSuffix')}`, 2200, 'info');
      }
      await refreshTasks(true, { showLoading: false, compareExisting: false, source: 'global-date-recognize' });
      return;
    }

    if (result.recognized === 0) {
      showMessage(`${t('taskManager.scannedPrefix')} ${result.scanned} ${t('taskManager.scannedNoWritableDateSuffix')}`, 2800, 'info');
      return;
    }

    showMessage(`${t('taskManager.recognizedPrefix')} ${result.recognized} ${t('taskManager.recognizedMiddle')}，${t('taskManager.writeFailedPrefix')} ${result.failed} ${t('taskManager.itemSuffix')}`, 3200, 'error');
  } catch (error) {
    console.error('[TaskManager] Global task date recognition failed:', error);
    showMessage(t('taskManager.globalDateRecognizeFailed'), 3200, 'error');
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
    dateRecognitionKeywords: nextDateRecognitionKeywords,
    showDocumentGroupNotebookPath: nextShowDocumentGroupNotebookPath,
    documentGroups: nextDocumentGroupsPayload,
    goals: nextGoals,
    hiddenTaskViewIds,
    hiddenSidebarSectionIds,
    sidebarSectionOrder,
    defaultTaskCreateTarget,
    defaultTaskCreateNotebook,
    focusSettings
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
  eventBus.emit(Events.TASK_SCOPE_UPDATED, { excludedNotebookIds: mergedExcludedNotebookIds });
  showCompletedTasks.value = nextShowCompletedTasks;
  TaskRepository.setAutoRecognizeTaskDateEnabled(nextAutoRecognizeTaskDate);
  const shouldFinalizeInit = requiresScopeInitialization.value;
  await saveDocumentGroups(nextDocumentGroups);
  applyExternalDocumentGroups(nextDocumentGroups);
  eventBus.emit(Events.DOCUMENT_GROUPS_UPDATED, { groups: nextDocumentGroups });
  await updateSettings('taskManager', {
    excludedNotebookIds: mergedExcludedNotebookIds,
    showCompletedTasks: nextShowCompletedTasks,
    autoRecognizeTaskDate: nextAutoRecognizeTaskDate,
    dateRecognitionKeywords: nextDateRecognitionKeywords,
    taskCompletionSoundEnabled: nextTaskCompletionSoundEnabled,
    showDocumentGroupNotebookPath: nextShowDocumentGroupNotebookPath,
    defaultTaskCreateTarget: defaultTaskCreateTarget as typeof userSettings.taskManager.defaultTaskCreateTarget,
    defaultTaskCreateNotebook,
    ...(shouldFinalizeInit ? { scopeInitialized: true } : {})
  });
  await updateSettings('kanban', {
    hiddenViewSwitcherIds: hiddenTaskViewIds as TaskViewSwitcherId[]
  });
  await updateSettings('sidebar', {
    hiddenSectionIds: hiddenSidebarSectionIds as SidebarSectionId[],
    sectionOrder: sidebarSectionOrder as SidebarSectionId[]
  });
  await updateSettings('focus', focusSettings);
  window.dispatchEvent(new CustomEvent('pinch-focus-settings-updated', { detail: focusSettings }));
  if (shouldFinalizeInit) {
    requiresScopeInitialization.value = false;
  }
  await saveGoalDefinitions(nextGoals);
  showTaskScopeDialog.value = false;
  ensureActiveNotebookFilterInScope();
  normalizeDocumentSelection(filterNotebook.value);
  await refreshTasks(true, { showLoading: false, compareExisting: false, source: 'scope-save' });
  await refreshTaskDocumentOptions(true);
  normalizeDocumentSelection(filterNotebook.value);
}
async function handleRefreshClick() {
  if (requiresScopeInitialization.value) {
    taskScopeDialogInitialTab.value = 'scope';
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
      {
        useLiveDom,
        includeRepeatTemplateDate: true,
        repeatWindow: resolveTaskManagerRepeatWindow()
      }
    );
    if (!useLiveDom) {
      preserveInlineMemoTitles(sqlTasks, tasks.value);
      hydrateMemoTitlesFromLiveDom(sqlTasks, TASK_TITLE_HYDRATE_LIMIT);
    }

    const newTasks = syncTaskSnapshotWithLocalOverrides(sqlTasks);

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

async function prefillKernelLightTasks(scope: TaskQueryScope | null | undefined): Promise<boolean> {
  try {
    // Materialize repeats even for the fast first paint so completed virtual
    // instances never flash as pending before the full reconciliation arrives.
    const { tasks: lightTasks } = await TaskRepository.getKernelMaterializedTasks(
      5000,
      scope || null,
      {
        includeRepeatTemplateDate: true,
        repeatWindow: resolveTaskManagerRepeatWindow()
      }
    );
    if (lightTasks.length === 0) {
      return false;
    }
    tasks.value = syncTaskSnapshotWithLocalOverrides(lightTasks);
    invalidateSortCache();
    await nextTick();
    updateTaskIndex();
    return true;
  } catch (error) {
    if (!isKernelRpcUnavailable(error)) {
      console.debug('[TaskManager] kernel light prefill skipped', error);
    }
    return false;
  }
}

function mergeKernelSyncedTasks(kernelTasks: Task[], currentTasks: Task[]): Task[] {
  const currentById = new Map(currentTasks.map(task => [task.id, task]));
  const currentByBlockId = new Map(
    currentTasks
      .filter(task => task.type === 'block' && !!task.blockId)
      .map(task => [task.blockId as string, task])
  );

  const mergedById = new Map<string, Task>();
  for (const task of currentTasks) {
    mergedById.set(task.id, task);
  }

  for (const task of kernelTasks) {
    const current = currentById.get(task.id) || (task.blockId ? currentByBlockId.get(task.blockId) : undefined);
    if (!current) {
      mergedById.set(task.id, task);
      continue;
    }

    mergedById.set(task.id, {
      ...current,
      ...task,
      subtasks: current.subtasks || task.subtasks,
      description: typeof task.description === 'string' ? task.description : current.description,
      icon: task.icon || current.icon,
      hPath: task.hPath || current.hPath
    });
  }

  return Array.from(mergedById.values());
}

async function syncRepeatChangedFromKernel(): Promise<boolean> {
  try {
    const { tasks: kernelTasks } = await TaskRepository.getKernelMaterializedTasks(
      5000,
      getCurrentTaskQueryScope() || null,
      {
        force: true,
        includeRepeatTemplateDate: true,
        repeatWindow: resolveTaskManagerRepeatWindow()
      }
    );
    if (kernelTasks.length === 0) {
      return false;
    }

    tasks.value = syncTaskSnapshotWithLocalOverrides(mergeKernelSyncedTasks(kernelTasks, tasks.value));
    invalidateCache();
    invalidateSortCache();
    await nextTick();
    updateTaskIndex();
    return true;
  } catch (error) {
    if (!isKernelRpcUnavailable(error)) {
      console.debug('[TaskManager] kernel repeat sync skipped', error);
    }
    return false;
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

function scheduleKernelTaskIndexRefresh(delay = 220): void {
  if (kernelTaskIndexRefreshTimer !== null) {
    clearTimeout(kernelTaskIndexRefreshTimer);
  }
  kernelTaskIndexRefreshTimer = window.setTimeout(async () => {
    kernelTaskIndexRefreshTimer = null;
    try {
      await refreshKernelTaskIndex({ limit: 5000, includeArchived: true });
    } catch (error) {
      if (!isKernelRpcUnavailable(error)) {
        console.debug('[TaskManager] kernel task index refresh after date change skipped', error);
      }
    }
  }, delay);
}

function scheduleRepeatChangedRefresh(delay = 120) {
  if (fallbackRefreshTimer !== null) {
    clearTimeout(fallbackRefreshTimer);
  }

  fallbackRefreshTimer = window.setTimeout(async () => {
    fallbackRefreshTimer = null;
    const syncedFromKernel = await syncRepeatChangedFromKernel();
    if (!syncedFromKernel) {
      await refreshTasks(true, {
        showLoading: false,
        compareExisting: true,
        ignoreThrottle: true,
        source: 'repeat-changed'
      });
    }
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

  if (JSON.stringify(oldItem.focusEstimate) !== JSON.stringify(newItem.focusEstimate)) {
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
    let forceFresh = false;
    blockIds.forEach((blockId) => {
      if (queuedIncrementalForceFreshBlockIds.delete(blockId)) {
        forceFresh = true;
      }
    });
    await incrementalUpdateTasks(blockIds, { forceFresh });
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
          // The active editor DOM is authoritative. Match the kanban sync
          // path and apply it directly instead of retaining an older cached
          // title merely because it contains an inline memo.
          subtask.title = liveTitle;
          changed = true;
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

      if (liveTitle !== null) {
        // Use the same direct live-DOM update strategy as KanbanView.
        if (task.title !== liveTitle) {
          task.title = liveTitle;
          crdtRepo.updateTaskField(task.id, 'title', liveTitle);
          syncRepeatTemplateTaskLocally(task, (instance) => {
            instance.title = liveTitle;
          });
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

function queueIncrementalUpdates(
  blockIds: string[],
  delay = INCREMENTAL_QUEUE_DELAY_MS,
  forceFresh = false
): void {
  if (!Array.isArray(blockIds) || blockIds.length === 0) {
    return;
  }
  if (forceFresh) {
    blockIds.forEach((blockId) => {
      if (typeof blockId === 'string' && blockId.length > 0) {
        queuedIncrementalForceFreshBlockIds.add(blockId);
      }
    });
  }
  applyImmediateLiveDomTaskPatch(blockIds);
  incrementalUpdateQueue.enqueue(blockIds, delay);
}

const {
  queue: queueExternalTaskStatusAttrSync,
  flush: flushExternalTaskStatusAttrSync
} = createTaskStatusAttributeSync({
  onApplied: () => TaskRepository.clearCache(),
  onError: (blockId, error) => {
    console.warn('[TaskManager] Failed to sync task completion attrs:', { blockId, error });
  }
});



function setupEventListeners() {
  const unsubscribe = eventBus.on(Events.TASK_CHANGED, (data?: TaskChangePayload) => {
    const hasUnknownTaskBlock = data?.blockIds?.some(blockId =>
      !blockIdToTaskIndex.has(blockId) && !subtaskToParentMap.has(blockId)
    ) === true;
    scheduleTaskDocumentOptionsRefresh(hasUnknownTaskBlock ? 0 : undefined);
      if (data?.blockIds && data.blockIds.length > 0) {
        if (data.attributeChanges) {
          syncTaskEditorDraftFromAttributeChanges(
            activeTaskEditTask.value,
            activeTaskEditDraft.value,
            data.attributeChanges
          );
          invalidateCache();
          invalidateSortCache();
          updateTaskIndex();
          // setBlockAttrs has already applied these attributes to the CRDT
          // task tree synchronously. A second immediate fetch by only the
          // parent block returns DOM-only child summaries and can overwrite
          // every descendant's metadata. Let the coalesced kernel echo/full
          // refresh reconcile it instead.
          return;
        }
        queueIncrementalUpdates(
        data.blockIds,
        INCREMENTAL_QUEUE_DELAY_MS,
        data.forceRefresh === true
      );
    } else {
      scheduleFallbackRefresh(true, IMMEDIATE_FALLBACK_DELAY_MS, 'immediate');
    }
  });

  const unsubscribeDeleted = eventBus.on(Events.TASK_DELETED, ({ blockId }: { blockId: string }) => {
    scheduleTaskDocumentOptionsRefresh(320);
    optimisticTaskSyncGuards.delete(blockId);
    recentlyDeletedTaskBlockIds.set(blockId, Date.now() + RECENTLY_DELETED_TASK_GUARD_MS);
    const taskIndex = blockIdToTaskIndex.get(blockId);
    if (taskIndex && !taskIndex.isSubtask) {
      tasks.value = tasks.value.filter(t => t.blockId !== blockId);
      invalidateCache();
      invalidateSortCache();
      updateTaskIndex();
    }
  });

  const unsubscribeUpdated = eventBus.on(Events.TASK_UPDATED, ({ blockId }: { blockId: string }) => {
    scheduleTaskDocumentOptionsRefresh();
    queueIncrementalUpdates([blockId]);
  });

  const unsubscribeAdded = eventBus.on(Events.TASK_ADDED, async (payload?: { blockId?: string; reason?: string; seriesId?: string; frequency?: string; task?: Task }) => {
    scheduleTaskDocumentOptionsRefresh(0);
    const optimisticTask = payload?.task;
    if (isRecentlyDeletedTaskBlock(optimisticTask?.blockId)) {
      return;
    }
    if (
      optimisticTask?.type === 'block'
      && optimisticTask.blockId
      && !TaskRepository.isNotebookExcluded(optimisticTask.notebookId)
    ) {
      optimisticTaskSyncGuards.set(optimisticTask.blockId, {
        task: { ...optimisticTask },
        expiresAt: Date.now() + OPTIMISTIC_TASK_SYNC_GUARD_MS
      });
      crdtRepo.syncIncrementalTasks([optimisticTask]);
      tasks.value = crdtRepo.getTasks();
      invalidateCache();
      invalidateSortCache();
      await updateTaskIndex();
      window.setTimeout(() => queueIncrementalUpdates([optimisticTask.blockId!], 0, true), 300);
      return;
    }
    if (payload?.reason === 'repeat-changed' && payload.frequency) {
      const requestId = ++repeatReconcileRequestId;
      const fastPathApplied = await applyRepeatRuleIncremental(payload, requestId);
      if (requestId !== repeatReconcileRequestId) {
        return;
      }
      if (!fastPathApplied) {
        scheduleFallbackRefresh(true, 60, 'immediate');
        return;
      }
      scheduleRepeatChangedRefresh(120);
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
  
  

  const unsubscribeDateChanged = eventBus.on(Events.TASK_DATE_CHANGED, (updatedTask: Task) => {
    const now = Date.now();
    const taskId = typeof updatedTask.id === 'string' ? updatedTask.id : '';
    const blockId = typeof updatedTask.blockId === 'string' ? updatedTask.blockId.trim() : '';
    const existingTask = tasks.value.find(task => task.id === taskId)
      || (blockId ? tasks.value.find(task => task.blockId === blockId) : undefined)
      || tasks.value.find(task => areTaskDateIdentitiesRelated(task, updatedTask));
    const previousRepeatSeriesId = typeof existingTask?.repeatSeriesId === 'string'
      ? existingTask.repeatSeriesId.trim()
      : '';
    const recordKey = taskId || blockId;
    if (!recordKey) {
      return;
    }
    
    if (updatedTask.startDate === null && updatedTask.dueDate === null) {
      recentlyDeletedDates.value.set(recordKey, {
        startDate: null,
        dueDate: null,
        timestamp: now
      });
      
      setTimeout(() => {
        recentlyDeletedDates.value.delete(recordKey);
      }, 5000);
    } else if (updatedTask.startDate !== null || updatedTask.dueDate !== null) {
      if (recentlyDeletedDates.value.has(recordKey)) {
        recentlyDeletedDates.value.delete(recordKey);
      }
    }
    
    const patchDates = (task: Task) => {
      task.startDate = updatedTask.startDate || '';
      task.dueDate = updatedTask.dueDate || '';
      task.startTime = updatedTask.startTime || '';
      task.dueTime = updatedTask.dueTime || '';
      if (updatedTask.backgroundColor !== undefined) {
        task.backgroundColor = updatedTask.backgroundColor;
      }
      if (updatedTask.repeatFrequency !== undefined) {
        task.repeatFrequency = updatedTask.repeatFrequency;
      }
      if (updatedTask.repeatSeriesId !== task.repeatSeriesId) {
        task.repeatSeriesId = updatedTask.repeatSeriesId;
      }
      if (updatedTask.repeatInstanceDate !== task.repeatInstanceDate) {
        task.repeatInstanceDate = updatedTask.repeatInstanceDate;
      }
      if (updatedTask.isVirtual !== undefined) {
        task.isVirtual = updatedTask.isVirtual;
      }
    };
    const hasOwn = (key: keyof Task) => Object.prototype.hasOwnProperty.call(updatedTask, key);
    const patched = patchTaskByDateIdentity(tasks.value, updatedTask, patchDates)
      || (taskId ? patchTask(tasks.value, taskId, patchDates, 'id') : false)
      || (blockId ? patchTask(tasks.value, blockId, patchDates, 'blockId') : false);
    const rememberPatchedTask = (task: Task): void => {
      rememberLocalTaskFieldOverride(task.id, 'startDate', task.startDate || '');
      rememberLocalTaskFieldOverride(task.id, 'dueDate', task.dueDate || '');
      rememberLocalTaskFieldOverride(task.id, 'startTime', task.startTime || '');
      rememberLocalTaskFieldOverride(task.id, 'dueTime', task.dueTime || '');
      if (hasOwn('repeatFrequency')) {
        rememberLocalTaskFieldOverride(task.id, 'repeatFrequency', task.repeatFrequency);
      }
      if (hasOwn('repeatSeriesId')) {
        rememberLocalTaskFieldOverride(task.id, 'repeatSeriesId', task.repeatSeriesId);
      }
      if (hasOwn('repeatInstanceDate')) {
        rememberLocalTaskFieldOverride(task.id, 'repeatInstanceDate', task.repeatInstanceDate);
      }
      if (hasOwn('isVirtual')) {
        rememberLocalTaskFieldOverride(task.id, 'isVirtual', task.isVirtual);
      }
    };
    tasks.value.forEach(task => {
      if (areTaskDateIdentitiesRelated(task, updatedTask)) {
        rememberPatchedTask(task);
      }
    });
    if (!patched && blockId) {
      queueIncrementalUpdates([blockId], 80);
    }
    if (updatedTask.repeatFrequency === 'none' && previousRepeatSeriesId) {
      const nextTasks = tasks.value.filter(task =>
        !(task.isVirtual === true && task.repeatSeriesId === previousRepeatSeriesId)
      );
      if (nextTasks.length !== tasks.value.length) {
        tasks.value = syncTaskSnapshotWithLocalOverrides(nextTasks);
        updateTaskIndex();
      }
    }
    invalidateSortCache();
    if (patched) {
      tasks.value = [...tasks.value];
      updateTaskIndex();
    }
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

  const unsubscribeTaskScopeUpdated = eventBus.on(
    Events.TASK_SCOPE_UPDATED,
    (payload?: { excludedNotebookIds?: string[] }) => {
      if (!payload || !Array.isArray(payload.excludedNotebookIds)) {
        return;
      }
      const normalized = normalizeNotebookIds(payload.excludedNotebookIds);
      const current = normalizeNotebookIds(excludedNotebookIds.value);
      const isSame = normalized.length === current.length
        && normalized.every((id, index) => id === current[index]);
      if (isSame) {
        return;
      }
      applyExcludedNotebookScope(normalized);
      ensureActiveNotebookFilterInScope();
      normalizeDocumentSelection(filterNotebook.value);
      void refreshTasks(true, { showLoading: false, compareExisting: false, source: 'scope-external' });
      void refreshTaskDocumentOptions(true);
    }
  );

  const unsubscribeTaskEditorOpenRequested = eventBus.on(
    Events.TASK_EDITOR_OPEN_REQUEST,
    (payload?: { blockId?: string; rootId?: string; anchorX?: number; anchorY?: number; task?: Task | null }) => {
      void openTaskDateMenuFromExternalRequest(payload);
    }
  );

  const unsubscribeTaskQuickMetaOpenRequested = eventBus.on(
    Events.TASK_QUICK_META_OPEN_REQUEST,
    (payload?: { blockId?: string; rootId?: string; anchorX?: number; anchorY?: number; task?: Task | null; removeTrigger?: () => void }) => {
      void openTaskQuickMetaMenuFromExternalRequest(payload);
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
    unsubscribeTaskScopeUpdated,
    unsubscribeTaskEditorOpenRequested,
    unsubscribeTaskQuickMetaOpenRequested
  );
}

async function incrementalUpdateTasks(
  blockIds: string[],
  options: { forceFresh?: boolean } = {}
) { 
  if (requiresScopeInitialization.value) {
    return;
  }

  const scopedBlockIds = await TaskRepository.filterIncludedBlockIds(blockIds);
  if (scopedBlockIds.length === 0) {
    return;
  }

  const ancestorContextRows = await queryAncestorContextRows(scopedBlockIds, sql);
  await pruneInvalidParentsFromEvents(scopedBlockIds, ancestorContextRows);

  const { unresolvedBlockIds, patchedParentStatuses, patchedParentTitles } = await fastSyncTaskFromDom(scopedBlockIds);
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
      { useLiveDom: true, forceFresh: options.forceFresh === true }
    );
    
    const updatedTasks: Task[] = [];
    let removedTasks = 0;
    const missingRequestedIds: string[] = [];
    const removedTaskIds = new Set<string>();
  
    for (const [blockId, newTask] of taskMapBatch) {
      if (isRecentlyDeletedTaskBlock(blockId)) {
        continue;
      }
      const forcedStatus = patchedParentStatuses.get(blockId);
      const forcedTitle = patchedParentTitles.get(blockId);
      if (forcedStatus) {
        newTask.status = forcedStatus;
        if (forcedStatus === 'completed') {
          newTask.completedAt = newTask.completedAt || new Date().toISOString();
        } else {
          delete newTask.completedAt;
        }
      }
      if (forcedTitle) {
        newTask.title = forcedTitle;
      }
      const currentTask = blockIdToTaskIndex.get(blockId)?.task;
      if (currentTask?.subtasks && newTask.subtasks) {
        newTask.subtasks = mergeIncrementalSubtaskPresentation(currentTask.subtasks, newTask.subtasks);
      } else if (currentTask?.subtasks && !newTask.subtasks) {
        newTask.subtasks = currentTask.subtasks;
      }
      crdtRepo.syncIncrementalTasks([newTask]);
      updatedTasks.push(newTask);
    }

    await flushExternalTaskStatusAttrSync(uniqueBlockIds);

    for (const blockId of uniqueBlockIds) {
      if (taskMapBatch.has(blockId)) {
        optimisticTaskSyncGuards.delete(blockId);
        continue;
      }
      const pendingGuard = optimisticTaskSyncGuards.get(blockId);
      if (pendingGuard && pendingGuard.expiresAt > Date.now()) {
        continue;
      }
      optimisticTaskSyncGuards.delete(blockId);
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
        nextTasks = syncTaskSnapshotWithLocalOverrides(nextTasks);
      }
      tasks.value = applyLocalTaskFieldOverridesToList(nextTasks);
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

async function pruneInvalidParentsFromEvents(
  blockIds: string[],
  ancestorContextRows?: AncestorContextRow[]
): Promise<number> {
  const normalizedBlockIds = normalizeBlockIds(blockIds);
  if (normalizedBlockIds.length === 0) {
    return 0;
  }

  try {
    const rows = ancestorContextRows ?? await queryAncestorContextRows(normalizedBlockIds, sql);
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
      tasks.value = getTasksWithLocalOverrides();
      await updateTaskIndex();
    }
    return removedBlockIds.length;
  } catch {
    // Silent fallback: next refresh cycle will reconcile if SQL check fails.
    return 0;
  }
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
    const rows = ancestorContextRows ?? await queryAncestorContextRows(unknownBlockIds, sql);
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

function getOwnTaskParagraph(root: Element | null, ownerId?: string): Element | null {
  if (!root) return null;
  const ownerListItem = root.getAttribute('data-type') === 'NodeListItem'
    ? root
    : root.closest('[data-type="NodeListItem"]');
  const resolvedOwnerId = ownerId
    || ownerListItem?.getAttribute('data-node-id')
    || root.getAttribute('data-node-id')
    || '';
  const paragraphs: Element[] = [];
  if (root.getAttribute('data-type') === 'NodeParagraph') {
    paragraphs.push(root);
  }
  paragraphs.push(...Array.from(root.querySelectorAll('[data-type="NodeParagraph"]')));
  for (const paragraph of paragraphs) {
    const paragraphOwner = paragraph.closest('[data-type="NodeListItem"]');
    if (resolvedOwnerId) {
      if (paragraphOwner?.getAttribute('data-node-id') === resolvedOwnerId) {
        return paragraph;
      }
    } else if (!ownerListItem || paragraphOwner === ownerListItem) {
      return paragraph;
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
    const currentParagraph = getOwnTaskParagraph(currentElement, blockId);
    const editable = currentParagraph?.querySelector('[contenteditable="true"]');
    const liveTitle = cleanTaskTitleHtml(currentParagraph?.innerHTML || '');
    const editableTitle = cleanTaskTitleHtml(editable?.innerHTML || '');
    if (editableTitle.length > 0) {
      return editableTitle;
    }
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
    if (!shouldHydrateTaskTitle(currentTitle)) {
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

function getTaskTitleFromElement(root: Element | null, ownerId?: string): string | null {
  if (!root) return null;
  const paragraph = getOwnTaskParagraph(root, ownerId);
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
    const apiTitle = getTaskTitleFromElement(getTaskElementFromDoc(parsedDoc, blockId), blockId);
    if (apiTitle !== null) {
      return apiTitle;
    }
  }

  return null;
}

async function fastSyncTaskFromDom(blockIds: string[]): Promise<{
  unresolvedBlockIds: string[];
  patchedParentStatuses: Map<string, Task['status']>;
  patchedParentTitles: Map<string, string>;
}> {
  const unresolved: string[] = [];
  const patchedParentStatuses = new Map<string, Task['status']>();
  const patchedParentTitles = new Map<string, string>();
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
      const liveTitle = getLiveTaskTitle(blockId);
      const title = liveTitle ?? (parsedDoc ? getTaskTitleFromElement(getTaskElementFromDoc(parsedDoc, blockId), blockId) : null);
      const titleCameFromLiveDom = liveTitle !== null;
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
            if (titleCameFromLiveDom || !shouldSkipMemoTitleDowngrade(currentTitle, title)) {
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
          if (title !== null) {
            const currentTitle = typeof task.title === 'string' ? task.title : '';
            if (titleCameFromLiveDom || !shouldSkipMemoTitleDowngrade(currentTitle, title)) {
              patchedParentTitles.set(blockId, title);
              if (task.title !== title) {
                task.title = title;
                crdtRepo.updateTaskField(task.id, 'title', title);
                syncRepeatTemplateTaskLocally(task, (instance) => {
                  instance.title = title;
                });
                changed = true;
              }
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
    patchedParentStatuses,
    patchedParentTitles
  };
}

function createTaskEditDraft(task: Task): TaskEditDraft {
  const normalizedReminder = normalizeTaskReminderSelection(task);
  const tagState = buildTaskTagState(task.tags, task.groupId);
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
    tags: tagState.tagIds,
    groupId: tagState.primaryTagId,
    focusEstimate: task.focusEstimate
  };
}

function normalizeRepeatFrequencyForEditor(frequency: RepeatFrequency | undefined): RepeatFrequency {
  if (
    frequency === 'none'
    || frequency === 'daily'
    || frequency === 'weekdays'
    || frequency === 'weekend'
    || frequency === 'weekly'
    || frequency === 'custom'
  ) {
    return frequency;
  }
  return frequency ? 'weekly' : 'none';
}

function syncTaskEditorRepeatState(task: Task | null): void {
  if (!task) {
    taskEditorRepeatFrequency.value = 'none';
    taskEditorRepeatRule.value = null;
    taskEditorRepeatTermination.value = { type: 'never' };
    return;
  }

  const taskDueDateTermination: RepeatTermination = task.dueDate
    ? { type: 'date', date: task.dueDate }
    : { type: 'never' };
  taskEditorRepeatFrequency.value = normalizeRepeatFrequencyForEditor(task.repeatFrequency as RepeatFrequency | undefined);
  taskEditorRepeatRule.value = null;
  taskEditorRepeatTermination.value = taskDueDateTermination;

  const taskId = task.id;
  const isRepeatTask = isRepeatTaskEntity(task);
  if (isRepeatTask) {
    getRepeatSeriesForTask(task)
      .then((series) => {
        const currentTask = activeTaskEditTask.value;
        if (!series || currentTask?.id !== taskId || !isRepeatTaskForDateSave(currentTask)) return;
        taskEditorRepeatFrequency.value = normalizeRepeatFrequencyForEditor(series.frequency as RepeatFrequency);
        taskEditorRepeatRule.value = series.rule || null;
        taskEditorRepeatTermination.value = series.termination
          || (series.endDate ? { type: 'date', date: series.endDate } : taskDueDateTermination);
        const draft = activeTaskEditDraft.value;
        if (draft?.taskId === taskId) {
          draft.startDate = series.startDate || '';
          draft.startTime = series.startTime || '';
          draft.dueDate = series.endDate || '';
          draft.dueTime = series.dueTime || '';
        }
      })
      .catch(() => {});
  }

  TaskRepository.getTaskRepeatRule(task)
    .then((frequency) => {
      if (activeTaskEditTask.value?.id !== taskId) return;
      if (frequency === 'none' && isRepeatTask) return;
      taskEditorRepeatFrequency.value = normalizeRepeatFrequencyForEditor(frequency);
    })
    .catch(() => {});
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
  clearTaskDocumentOptionsRefreshTimer();
  incrementalUpdateQueue.clear();
  queuedIncrementalForceFreshBlockIds.clear();
}

async function toggleTaskStatus(task: Task, event?: MouseEvent) {
  if (skipSet.has(task.id)) {
    return;
  }
  
  const wasCompleted = task.status === 'completed';
  const newStatus = task.status === 'completed' ? 'pending' : 'completed';
  const shouldPlayCompletionSound = !wasCompleted && newStatus === 'completed';
  const isVirtualRepeatTask = !!task.isVirtual && !!task.repeatSeriesId && !!task.repeatInstanceDate;
  const checkinNotePromptAnchor = getCheckinNotePromptAnchor(
    event?.currentTarget instanceof Element ? event.currentTarget : null
  );
  
  skipTaskTemporarily(skipSet, task.id);
  
  try {
    if (isVirtualRepeatTask) {
      const completedAt = await TaskRepository.updateRepeatInstanceStatus(task, newStatus);
      if (newStatus === 'completed' && completedAt) {
        requestTaskCompletionNote(task.id, completedAt, checkinNotePromptAnchor, task.title, task.blockId || task.id);
      }
    } else if (task.type === 'block' && task.blockId) {
      await updateTaskMarkdown(task.blockId, newStatus === 'completed', true, checkinNotePromptAnchor);
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
    
    if (!isVirtualRepeatTask && !(task.type === 'block' && task.blockId)) {
      publishTaskChange(task.blockId ? [task.blockId] : []);
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

async function handleTaskClick(task: Task): Promise<void> {
  const targetTask = await resolveTaskEditorTargetTask(task);
  const blockId = typeof targetTask.blockId === 'string' ? targetTask.blockId.trim() : '';
  if (targetTask.type === 'block' && blockId) {
    await openBlockById(blockId);
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

async function scrollTaskEditorSidebarToBlock(
  blockId: string,
  retries = 24,
  intervalMs = 80
): Promise<boolean> {
  const normalizedBlockId = typeof blockId === 'string' ? blockId.trim() : '';
  const editorMountElement = getTaskEditorSidebarMountElement();
  if (!normalizedBlockId || !taskEditorProtyle || !editorMountElement) {
    return false;
  }

  const tryFocus = (): boolean => {
    const mountElement = editorMountElement;
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
  unlockTaskEditorParentScroll();
  cancelTaskEditorSidebarPositionUpdate();
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
  const mountElement = getTaskEditorSidebarMountElement();
  if (mountElement) {
    mountElement.innerHTML = '';
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
  const normalizedFields = normalizeTaskEditorDateFields(value);
  syncTaskEditorDraftDateFields(activeTaskEditTask.value.id, normalizedFields);
  void quickSaveTaskDateFields(activeTaskEditTask.value, normalizedFields);
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

function handleTaskEditorRepeatRuleSave(value: RepeatFrequency | RepeatRuleInput): void {
  if (!activeTaskEditTask.value) {
    return;
  }
  taskEditorRepeatFrequency.value = typeof value === 'string' ? value : value.frequency;
  taskEditorRepeatRule.value = typeof value === 'string' ? null : (value.rule || null);
  // A simple frequency selection does not carry a termination value. Keep the
  // editor's current default in that case so a task with a due date continues
  // to show (and save) that date as the recurrence cutoff.
  taskEditorRepeatTermination.value = typeof value === 'string'
    ? (taskEditorRepeatFrequency.value === 'none'
      ? { type: 'never' }
      : taskEditorRepeatTermination.value)
    : (value.termination || taskEditorRepeatTermination.value);
  void quickSaveTaskRepeatRule(activeTaskEditTask.value, value);
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
  } catch {
  }
}

async function handleTaskEditorDelete(): Promise<void> {
  const task = activeTaskEditTask.value;
  if (!task) {
    return;
  }

  if (!confirm(t('taskManager.confirmDelete'))) {
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

  if (kernelDiagnosticsVisible.value) {
    const isInsideKernelDiagnostics = path.some(node =>
      node instanceof HTMLElement && (
        node.classList.contains('kernel-diagnostics-control')
        || node.classList.contains('kernel-diagnostics-popover')
      )
    );
    if (!isInsideKernelDiagnostics && !kernelDiagnosticsControlRef.value?.contains(target)) {
      closeKernelDiagnostics();
    }
  }

  const isInsideQuickDateOrTimePopover = path.some(node =>
      node instanceof HTMLElement && (
        node.classList.contains('date-popover')
        || node.classList.contains('date-popover-overlay')
        || node.classList.contains('time-popover')
        || node.classList.contains('time-popover-overlay')
        || node.classList.contains('task-reminder-popover')
        || node.classList.contains('task-reminder-popover-overlay')
      )
  );

  if (taskQuickDateMenu.value.show) {
    const isInsideQuickDateMenu = path.some(node =>
      node instanceof HTMLElement && node.classList.contains('task-quick-date-menu')
    );
    const isInsideQuickMetaMenu = path.some(node =>
      node instanceof HTMLElement && node.classList.contains('task-quick-meta-menu')
    );
    if (!isInsideQuickDateMenu && !isInsideQuickMetaMenu && !isInsideQuickDateOrTimePopover) {
      closeTaskQuickDateMenu();
    }
  }

  if (taskQuickMetaMenu.value.show) {
    const isInsideQuickMetaMenu = path.some(node =>
      node instanceof HTMLElement && node.classList.contains('task-quick-meta-menu')
    );
    if (!isInsideQuickMetaMenu && !isInsideQuickDateOrTimePopover) {
      closeTaskQuickMetaMenu();
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
  updateTaskEditorSidebarPosition();

  const mountElement = getTaskEditorSidebarMountElement();
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
    await scrollTaskEditorSidebarToBlock(normalizedBlockId);
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
  taskEditorSidebarTitle.value = t('taskManager.editTask');
  try {
    const opened = await openTaskEditorInSidebar(blockId, rootId);
    if (!opened) {
      closeTaskEditorSidebar();
    }
  } finally {
    openingTaskPopoverBlockIds.delete(blockId);
  }
}

async function resolveTaskFromExternalRequest(
  payload?: { blockId?: string; rootId?: string; anchorX?: number; anchorY?: number; task?: Task | null; removeTrigger?: () => void }
): Promise<{ task: Task; blockId: string; anchorPosition: { x: number; y: number } | null } | null> {
  const normalizedBlockId = typeof payload?.blockId === 'string' ? payload.blockId.trim() : '';
  if (!normalizedBlockId) {
    return null;
  }

  const payloadTask = payload?.task && typeof payload.task.id === 'string' ? payload.task : null;
  const localTask = tasks.value.find(item => item.blockId === normalizedBlockId) || null;
  const loadedTask = payloadTask || localTask || await TaskRepository.getTaskByBlockId(normalizedBlockId, true).catch(() => null);
  if (!loadedTask) {
    return null;
  }

  const anchorPosition = resolveTaskQuickMenuAnchor(normalizedBlockId, payload?.anchorX, payload?.anchorY);
  return {
    task: loadedTask,
    blockId: normalizedBlockId,
    anchorPosition
  };
}

async function openTaskDateMenuFromExternalRequest(
  payload?: { blockId?: string; rootId?: string; anchorX?: number; anchorY?: number; task?: Task | null }
): Promise<void> {
  const resolved = await resolveTaskFromExternalRequest(payload);
  if (!resolved) {
    return;
  }

  closeTaskEditorSidebar();
  closeTaskEditMenu();
  taskEditDraft.value = null;
  closeTaskQuickMetaMenu();
  await openTaskQuickDateMenu(resolved.task, resolved.anchorPosition);
}

async function openTaskQuickMetaMenuFromExternalRequest(
  payload?: { blockId?: string; rootId?: string; anchorX?: number; anchorY?: number; task?: Task | null; removeTrigger?: () => void }
): Promise<void> {
  const resolved = await resolveTaskFromExternalRequest(payload);
  if (!resolved) {
    return;
  }

  closeTaskEditorSidebar();
  closeTaskEditMenu();
  taskEditDraft.value = null;
  closeTaskQuickDateMenu();
  await openTaskQuickMetaMenu(resolved.task, resolved.anchorPosition, {
    removeTrigger: payload?.removeTrigger
  });
}

async function resolveTaskEditorTargetTask(task: Task): Promise<Task> {
  const isVirtualRepeatTask = !!task.isVirtual && !!task.repeatSeriesId;
  if (!isVirtualRepeatTask) {
    return task;
  }

  const series = await getRepeatSeriesForTask(task).catch(() => null);
  const templateTask = series
    ? tasks.value.find(item =>
      !item.isVirtual
      && (
        item.id === series.templateTaskId
        || (!!series.templateBlockId && item.blockId === series.templateBlockId)
      )
    )
    : null;
  if (templateTask) {
    return templateTask;
  }

  const sameBlockTask = task.blockId
    ? tasks.value.find(item => !item.isVirtual && item.blockId === task.blockId)
    : null;
  return sameBlockTask || task;
}

async function openTaskEditorFromMenu(task: Task): Promise<void> {
  const targetTask = await resolveTaskEditorTargetTask(task);
  await hydrateTaskFocusEstimate(targetTask);
  const taskId = typeof targetTask.id === 'string' ? targetTask.id : '';
  if (!taskId) {
    return;
  }
  if (!ensureTaskEditDraft(targetTask)) {
    return;
  }
  taskEditMenuTaskId.value = taskId;
  await openTaskEditorPopover(targetTask);
}

function handleTaskCardClick(task: Task): void {
  if (shouldSuppressTaskCardClick(task.id)) {
    return;
  }
  if (isBatchEditMode.value) {
    toggleTaskBatchSelection(task.id);
    return;
  }
  void openTaskEditorFromMenu(task);
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

async function hydrateTaskFocusEstimate(task: Task): Promise<void> {
  const blockId = typeof task.blockId === 'string' ? task.blockId.trim() : '';
  if (!blockId) return;
  try {
    const attrs = await getBlockAttrs(blockId);
    const focusEstimate = parseTaskFocusEstimate(attrs['custom-task-focus-estimate']);
    task.focusEstimate = focusEstimate;
    patchTask(tasks.value, task.id, item => { item.focusEstimate = focusEstimate; }, 'id');
  } catch {
    // The editor can still open when attributes are temporarily unavailable.
  }
}

function handleTaskEditorFocusEstimateSave(value: Task['focusEstimate']): void {
  if (!activeTaskEditTask.value || !activeTaskEditDraft.value) return;
  void quickSaveTaskFocusEstimate(activeTaskEditTask.value, value);
}

async function refreshTaskEditorActualFocus(): Promise<void> {
  const task = activeTaskEditTask.value;
  if (!task) return;
  const data = await getFocusTimerData();
  const records = data.sessionRecords.filter(record => record.targetType === 'task' && (record.targetId === task.id || record.targetBlockId === task.blockId));
  taskEditorActualFocus.value = {
    minutes: records.reduce((total, record) => total + Math.max(0, record.minutes || 0), 0),
    sessions: records.length
  };
}

function handleTaskEditorOpenContent(): void {
  const task = activeTaskEditTask.value;
  if (!task) {
    return;
  }
  void handleTaskClick(task);
}

function handleTaskCardToggleStatus(task: Task, event?: MouseEvent): void {
  if (isFutureVirtualRepeatPreview(task)) {
    return;
  }
  if (isBatchEditMode.value) {
    toggleTaskBatchSelection(task.id);
    return;
  }
  void toggleTaskStatus(task, event);
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
  const targetTask = await resolveTaskEditorTargetTask(task);
  const targetTaskId = targetTask.id;
  if (description === (targetTask.description || '')) {
    clearInlineDescriptionEdit(taskId);
    return;
  }

  inlineDescriptionSavingTaskIds.add(taskId);
  try {
    const blockId = targetTask.type === 'block' && targetTask.blockId ? targetTask.blockId : '';
    if (blockId) {
      await setBlockAttrs(blockId, {
        'custom-task-description': description || ''
      });
      await TaskRepository.clearCache();
    }

    crdtRepo.updateTaskField(targetTaskId, 'description', description);
    patchTask(tasks.value, targetTaskId, (item) => {
      item.description = description;
      item.updatedAt = new Date().toISOString();
    }, 'id');
    const repeatTouched = syncRepeatTaskDescriptionLocally(targetTask, description);
    await refreshInternalState();
    if (repeatTouched) {
      notifyRepeatChanged({
        blockId,
        seriesId: getTaskRepeatSeriesId(targetTask),
        frequency: targetTask.repeatFrequency
      });
    }
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
  localOverrides?: Partial<Task>;
  beforePersist?: (blockId: string) => Promise<void>;
  refreshKernelIndex?: boolean;
}

async function applyTaskEditorFieldUpdate(
  task: Task,
  options: TaskEditorFieldUpdateOptions
): Promise<boolean> {
  const editedTask = activeTaskEditDraft.value;
  if (!editedTask || editedTask.taskId !== task.id || options.isUnchanged(editedTask)) {
    return false;
  }

  options.syncDraft(editedTask);
  // A subtask opened in the editor is an override rather than a top-level
  // item in `tasks`. Keep that editor instance in sync before its own
  // attribute-change broadcast is delivered.
  options.syncTask(task);
  // Reflect editor changes in task cards before the block-attribute request
  // finishes. In particular, a newly added focus estimate controls whether
  // the focus-progress badge is rendered.
  patchTask(tasks.value, task.id, (targetTask) => {
    options.syncTask(targetTask);
  }, 'id');
  // Status belongs to an individual repeat occurrence. Other editable card
  // fields belong to the template and should be visible on every occurrence
  // before the persistence/broadcast cycle completes.
  if (!Object.prototype.hasOwnProperty.call(options.attrs, 'custom-task-status')) {
    syncRepeatTemplateTaskLocally(task, options.syncTask);
  }
  const repeatSeriesId = getTaskRepeatSeriesId(task);
  const shouldBroadcastRepeatTemplateUpdate = (
    !Object.prototype.hasOwnProperty.call(options.attrs, 'custom-task-status')
    && !!repeatSeriesId
    && !!task.repeatFrequency
  );
  if (options.localOverrides) {
    for (const [field, value] of Object.entries(options.localOverrides) as Array<[keyof Task, Task[keyof Task]]>) {
      rememberLocalTaskFieldOverride(task.id, field, value);
    }
    rememberRepeatTaskFieldOverrides(task, options.localOverrides);
  }
  // Register the optimistic field in CRDT before the attribute transaction.
  // The host can broadcast an older SQL snapshot while that transaction is
  // still committing; pending local fields prevent it from repainting cards
  // with the previous value in the interim.
  options.syncCrdt();
  if (options.localOverrides) {
    // Virtual instances do not own the template blockId, so the block-attribute
    // mutation only reaches the template in CRDT. Mirror the same optimistic
    // fields here before that mutation publishes its raw CRDT snapshot.
    syncRepeatTaskFieldOverridesToCrdt(task, options.localOverrides);
  }

  try {
    const blockId = task.type === 'block' && task.blockId ? task.blockId.trim() : '';
    if (blockId) {
      const nextStatus = options.attrs['custom-task-status'] as Task['status'] | undefined;
      const attrsToPersist = nextStatus
        ? { ...options.attrs, ...buildTaskStatusAttrs(nextStatus, task.completedAt) }
        : options.attrs;
      applyTaskAttributeMutation(blockId, attrsToPersist);
      await setBlockAttrs(blockId, attrsToPersist);
      if (options.beforePersist) {
        await options.beforePersist(blockId);
      }
      await TaskRepository.clearCache();
    }

    patchTask(tasks.value, task.id, (targetTask) => {
      targetTask.updatedAt = new Date().toISOString();
    }, 'id');
    await refreshInternalState();
    if (options.refreshKernelIndex) {
      scheduleKernelTaskIndexRefresh();
    }
    if (shouldBroadcastRepeatTemplateUpdate) {
      // Ordinary block changes already notify every view. Virtual instances
      // have no blockId of their own, so also publish the series identity for
      // each view's repeat-materialization path.
      notifyRepeatChanged({
        blockId: task.blockId,
        seriesId: repeatSeriesId,
        frequency: task.repeatFrequency,
        templateUpdates: options.localOverrides
      });
    }
    return true;
  } catch (error) {
    console.error('[TaskManager] Failed to update task editor field:', error);
    return false;
  }
}

function consumeTaskQuickMetaTrigger(): void {
  const removeTrigger = taskQuickMetaMenu.value.removeTrigger;
  if (typeof removeTrigger !== 'function') {
    return;
  }
  taskQuickMetaMenu.value.removeTrigger = null;
  try {
    removeTrigger();
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

  const currentFields = await resolveCurrentTaskDateFields(task);
  const nextFields = normalizeTaskEditorDateFields(taskQuickDateDraft.value);
  const automaticStatus = getInitialAutomaticTaskStatus(task, nextFields);

  if (isSameTaskEditorDateFields(currentFields, nextFields)) {
    closeTaskQuickDateMenu();
    return;
  }

  const blockId = typeof task.blockId === 'string' ? task.blockId.trim() : '';
  try {
    if (isRepeatTaskForDateSave(task)) {
      const updatedRepeatTask = await saveRepeatTaskDateFields(task, nextFields);
      if (updatedRepeatTask) {
        closeTaskQuickDateMenu();
        return;
      }
    }

    if (task.type === 'block' && blockId) {
      await setBlockAttrs(blockId, {
        'custom-task-start-date': nextFields.startDate,
        'custom-task-due-date': nextFields.dueDate,
        'custom-task-start-time': nextFields.startTime,
        'custom-task-due-time': nextFields.dueTime,
        ...(automaticStatus ? buildTaskStatusAttrs(automaticStatus, undefined, true) : {})
      });
      await TaskRepository.clearCache();
    }

    const nowIso = new Date().toISOString();
    const updatedTask = applyTaskDateFieldsLocally(task, nextFields, nowIso);
    if (automaticStatus) {
      updatedTask.status = automaticStatus;
      patchTask(tasks.value, task.id, targetTask => { targetTask.status = automaticStatus; }, 'id');
      crdtRepo.updateTaskField(task.id, 'status', automaticStatus);
    }
    eventBus.emit(Events.TASK_DATE_CHANGED, updatedTask);
    scheduleKernelTaskIndexRefresh();
    await refreshInternalState();
    closeTaskQuickDateMenu();
  } catch (error) {
    console.error('[TaskManager] Failed to update task quick date:', error);
  }
}

async function handleTaskQuickMetaSave(closeAfterSave = true): Promise<void> {
  const menuTask = taskQuickMetaMenu.value.task;
  if (!menuTask) {
    if (closeAfterSave) {
      closeTaskQuickMetaMenu();
    }
    return;
  }

  const task = tasks.value.find(item => item.id === menuTask.id)
    || tasks.value.find(item => item.blockId && item.blockId === menuTask.blockId)
    || menuTask;

  const currentFields = await resolveCurrentTaskDateFields(task);
  const nextFields = normalizeTaskEditorDateFields(taskQuickMetaDraft.value);
  const datesChanged = !isSameTaskEditorDateFields(currentFields, nextFields);
  const automaticStatus = datesChanged ? getInitialAutomaticTaskStatus(task, nextFields) : null;
  const nextPriority = isBatchPriority(taskQuickMetaDraft.value.priority)
    ? taskQuickMetaDraft.value.priority
    : 'none';
  const currentTagState = buildTaskTagState(task.tags, task.groupId);
  const nextTagState = buildTaskTagState(taskQuickMetaDraft.value.tags, taskQuickMetaDraft.value.groupId);
  const currentGoalIds = getEffectiveGoalIdsForTask(goalDefinitions.value, task);
  const nextGoalIds = normalizeTaskQuickGoalIds(taskQuickMetaDraft.value.goalIds);
  const nextReminder = normalizeTaskReminderSelection(taskQuickMetaDraft.value);
  const priorityChanged = task.priority !== nextPriority;
  const tagsChanged = !areTaskTagIdsEqual(currentTagState.tagIds, nextTagState.tagIds)
    || currentTagState.primaryTagId !== nextTagState.primaryTagId;
  const goalsChanged = !areTaskQuickGoalIdsEqual(currentGoalIds, nextGoalIds);
  const reminderChanged = !isSameTaskReminderSelection(task, nextReminder);

  if (!datesChanged && !priorityChanged && !tagsChanged && !goalsChanged && !reminderChanged) {
    if (closeAfterSave) {
      closeTaskQuickMetaMenu();
    }
    return;
  }

  const blockId = typeof task.blockId === 'string' ? task.blockId.trim() : '';
  try {
    let dateSavedByRepeat = false;
    if (datesChanged && isRepeatTaskForDateSave(task)) {
      const updatedRepeatTask = await saveRepeatTaskDateFields(task, nextFields);
      if (updatedRepeatTask) {
        dateSavedByRepeat = true;
      }
    }

    const attrsToPersist: Record<string, string> = {};
    if (datesChanged && !dateSavedByRepeat) {
      attrsToPersist['custom-task-start-date'] = nextFields.startDate;
      attrsToPersist['custom-task-due-date'] = nextFields.dueDate;
      attrsToPersist['custom-task-start-time'] = nextFields.startTime;
      attrsToPersist['custom-task-due-time'] = nextFields.dueTime;
      if (automaticStatus) {
        Object.assign(attrsToPersist, buildTaskStatusAttrs(automaticStatus, undefined, true));
      }
    }
    if (priorityChanged) {
      attrsToPersist['custom-task-priority'] = nextPriority;
    }
    if (tagsChanged) {
      Object.assign(attrsToPersist, buildTaskTagAttrs(nextTagState.tagIds).attrs);
    }
    if (reminderChanged) {
      Object.assign(attrsToPersist, buildTaskReminderAttrs(nextReminder));
    }

    const hasPersistedTaskAttrs = Object.keys(attrsToPersist).length > 0;
    if (task.type === 'block' && blockId && hasPersistedTaskAttrs) {
      await setBlockAttrs(blockId, attrsToPersist);
      await TaskRepository.clearCache();
    }

    const nowIso = new Date().toISOString();
    if (datesChanged && !dateSavedByRepeat) {
      const updatedTask = applyTaskDateFieldsLocally(task, nextFields, nowIso);
      if (automaticStatus) {
        updatedTask.status = automaticStatus;
        patchTask(tasks.value, task.id, targetTask => { targetTask.status = automaticStatus; }, 'id');
        crdtRepo.updateTaskField(task.id, 'status', automaticStatus);
      }
      eventBus.emit(Events.TASK_DATE_CHANGED, updatedTask);
    }
    if (priorityChanged || tagsChanged || reminderChanged) {
      if (priorityChanged) {
        crdtRepo.updateTaskField(task.id, 'priority', nextPriority);
      }
      if (tagsChanged) {
        crdtRepo.updateTaskField(task.id, 'tags', [...nextTagState.tagIds]);
        crdtRepo.updateTaskField(task.id, 'groupId', nextTagState.primaryTagId || undefined);
      }
      if (reminderChanged) {
        crdtRepo.updateTaskField(task.id, 'reminderType', nextReminder.reminderType);
        crdtRepo.updateTaskField(task.id, 'reminderCustomTime', nextReminder.reminderCustomTimeValue);
      }
      patchTask(tasks.value, task.id, (targetTask) => {
        if (priorityChanged) {
          targetTask.priority = nextPriority;
        }
        if (tagsChanged) {
          targetTask.tags = [...nextTagState.tagIds];
          targetTask.groupId = nextTagState.primaryTagId || undefined;
        }
        if (reminderChanged) {
          targetTask.reminderType = nextReminder.reminderType;
          targetTask.reminderCustomTime = nextReminder.reminderCustomTimeValue;
        }
        targetTask.updatedAt = nowIso;
      }, 'id');
    }
    if (goalsChanged) {
      const nextGoals = setTaskGoalMembership(goalDefinitions.value, task, nextGoalIds);
      goalDefinitions.value = nextGoals;
      await saveTaskGoalMembership(task, nextGoalIds);
    }
    if (blockId && !hasPersistedTaskAttrs) {
      publishTaskChange([blockId]);
    }
    if (datesChanged) {
      scheduleKernelTaskIndexRefresh();
    }
    // The @ character only triggers this menu. Remove it as soon as an
    // attribute has been applied, even though the quick menu stays open for
    // additional edits.
    consumeTaskQuickMetaTrigger();
    await refreshInternalState();
    if (closeAfterSave) {
      closeTaskQuickMetaMenu();
    }
  } catch (error) {
    console.error('[TaskManager] Failed to update task quick metadata:', error);
  }
}

async function applyBatchEdit(): Promise<void> {
  if (isBatchApplying.value) {
    return;
  }
  const selectedIds = Array.from(batchSelectedTaskIds.value);
  if (selectedIds.length === 0) {
    showMessage(t('taskManager.selectTasksFirst'), 2200, 'error');
    return;
  }

  const nextStatus = isBatchStatus(batchEditStatus.value) ? batchEditStatus.value : null;
  const nextPriority = isBatchPriority(batchEditPriority.value) ? batchEditPriority.value : null;
  const nextTagAction = normalizeBatchTagAction(batchEditTagAction.value);
  const rawGroupSelection = typeof batchEditGroupId.value === 'string' ? batchEditGroupId.value.trim() : '';
  const validGroupIds = visibleTaskGroupIdSet.value;
  let nextTagSelection: { action: TaskTagBatchAction; tagId: string } | null = null;
  if (rawGroupSelection) {
    if (rawGroupSelection === TASK_GROUP_NONE_ID) {
      if (nextTagAction !== 'set-primary') {
        showMessage(t('taskManager.selectValidTag'), 2200, 'error');
        return;
      }
      nextTagSelection = { action: nextTagAction, tagId: '' };
    } else if (validGroupIds.has(rawGroupSelection)) {
      nextTagSelection = { action: nextTagAction, tagId: rawGroupSelection };
    } else {
      showMessage(t('taskManager.selectValidTag'), 2200, 'error');
      return;
    }
  }

  if (!nextStatus && !nextPriority && nextTagSelection === null) {
    showMessage(t('taskManager.selectBatchFields'), 2200, 'error');
    return;
  }

  type BatchTaskUpdate = {
    task: Task;
    blockId: string;
    attrs: Record<string, string>;
    nextStatus: Task['status'] | null;
    nextPriority: Task['priority'] | null;
    nextTagIds: string[] | null;
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
    let changedTagIds: string[] | null = null;
    let changedGroupId: string | undefined | null = null;

    if (nextStatus && task.status !== nextStatus) {
      Object.assign(attrs, buildTaskStatusAttrs(nextStatus, task.completedAt));
      changedStatus = nextStatus;
    }

    if (nextPriority && task.priority !== nextPriority) {
      attrs['custom-task-priority'] = nextPriority;
      changedPriority = nextPriority;
    }

    if (nextTagSelection !== null) {
      const currentTagState = buildTaskTagState(task.tags, task.groupId);
      const knownCurrentTagIds = filterKnownTaskTagIds(currentTagState.tagIds, taskGroupIdSet.value);
      const nextTagIds = applyTaskTagBatchAction(
        knownCurrentTagIds,
        nextTagSelection.action,
        nextTagSelection.tagId
      );
      const nextTagState = buildTaskTagState(nextTagIds);
      if (
        !areTaskTagIdsEqual(currentTagState.tagIds, nextTagState.tagIds)
        || currentTagState.primaryTagId !== nextTagState.primaryTagId
      ) {
        Object.assign(attrs, buildTaskTagAttrs(nextTagState.tagIds).attrs);
        changedTagIds = nextTagState.tagIds;
        changedGroupId = nextTagState.primaryTagId || undefined;
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
      nextTagIds: changedTagIds,
      nextGroupId: changedGroupId
    });
  }

  if (updates.length === 0) {
    showMessage(t('taskManager.noBatchUpdates'), 2200, 'info');
    return;
  }

  isBatchApplying.value = true;
  try {
    const results = await Promise.allSettled(
      updates.map(async (item) => {
        // Register the batch mutation before persisting it. The host may emit a
        // change event with a pre-commit SQL snapshot; recording the local
        // attributes keeps that snapshot from temporarily restoring old tags
        // on a subset of the selected cards.
        applyTaskAttributeMutation(item.blockId, item.attrs);
        await setBlockAttrs(item.blockId, item.attrs);
        if (item.nextStatus) {
          await updateTaskMarkdown(item.blockId, item.nextStatus === 'completed');
        }
      })
    );

    const nowIso = new Date().toISOString();
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
        if (update.nextTagIds !== null) {
          targetTask.tags = [...update.nextTagIds];
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
      if (update.nextTagIds !== null) {
        crdtRepo.updateTaskField(update.task.id, 'tags', [...update.nextTagIds]);
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
        if (update.nextTagIds !== null) {
          editedTask.tags = [...update.nextTagIds];
        }
        if (update.nextGroupId !== null) {
          editedTask.groupId = update.nextGroupId || '';
        }
      }
    });

    await refreshInternalState();
    if (hasNewlyCompletedTask && taskCompletionSoundEnabled.value) {
      playTaskCompletionSound();
    }

    if (successCount > 0) {
      showMessage(`${t('taskManager.batchUpdatedPrefix')} ${successCount} ${t('taskManager.batchUpdatedSuffix')}`, 2200, 'info');
    }
    if (failedCount > 0) {
      showMessage(`${t('taskManager.batchUpdateFailedPrefix')} ${failedCount} ${t('taskManager.batchUpdateFailedSuffix')}`, 3000, 'error');
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
    }
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
    },
    localOverrides: { priority }
  });
}

async function quickSaveTaskFocusEstimate(task: Task, focusEstimate: Task['focusEstimate']): Promise<void> {
  await applyTaskEditorFieldUpdate(task, {
    attrs: { 'custom-task-focus-estimate': serializeTaskFocusEstimate(focusEstimate) },
    isUnchanged: draft => JSON.stringify(draft.focusEstimate) === JSON.stringify(focusEstimate) && JSON.stringify(task.focusEstimate) === JSON.stringify(focusEstimate),
    syncDraft: draft => { draft.focusEstimate = focusEstimate; },
    syncTask: targetTask => { targetTask.focusEstimate = focusEstimate; },
    // focusEstimate is stored as a block attribute; snapshots retain it in CRDT metadata.
    syncCrdt: () => {},
    localOverrides: { focusEstimate }
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
    localOverrides: { pinned }
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

function isRepeatTaskForDateSave(task: Task | null | undefined): boolean {
  return !!task && (!!task.repeatSeriesId || (!!task.repeatFrequency && task.repeatFrequency !== 'none'));
}

function getTaskDateFields(task: Task): TaskEditorDateFields {
  return normalizeTaskEditorDateFields({
    startDate: (task.startDate || '').toString(),
    startTime: (task.startTime || '').toString(),
    dueDate: (task.dueDate || '').toString(),
    dueTime: (task.dueTime || '').toString()
  });
}

async function getRepeatTaskDateFields(task: Task): Promise<TaskEditorDateFields | null> {
  const series = await getRepeatSeriesForTask(task);
  if (!series) {
    return null;
  }
  return normalizeTaskEditorDateFields({
    startDate: series.startDate || '',
    startTime: series.startTime || '',
    dueDate: series.endDate || '',
    dueTime: series.dueTime || ''
  });
}

async function resolveCurrentTaskDateFields(task: Task): Promise<TaskEditorDateFields> {
  if (isRepeatTaskForDateSave(task)) {
    const repeatFields = await getRepeatTaskDateFields(task).catch(() => null);
    if (repeatFields) {
      return repeatFields;
    }
  }
  return getTaskDateFields(task);
}

function syncTaskEditorDraftDateFields(taskId: string, fields: TaskEditorDateFields): void {
  const activeDraft = activeTaskEditDraft.value;
  if (activeDraft && activeDraft.taskId === taskId) {
    activeDraft.startDate = fields.startDate;
    activeDraft.dueDate = fields.dueDate;
    activeDraft.startTime = fields.startTime;
    activeDraft.dueTime = fields.dueTime;
  }
}

function syncTaskDateFieldsToCrdt(taskId: string, fields: TaskEditorDateFields): void {
  crdtRepo.updateTaskField(taskId, 'startDate', fields.startDate);
  crdtRepo.updateTaskField(taskId, 'startTime', fields.startTime);
  crdtRepo.updateTaskField(taskId, 'dueDate', fields.dueDate);
  crdtRepo.updateTaskField(taskId, 'dueTime', fields.dueTime);
}

function applyTaskDateFieldsLocally(
  task: Task,
  fields: TaskEditorDateFields,
  nowIso: string,
  repeatMeta: Partial<Pick<Task, 'repeatSeriesId' | 'repeatFrequency' | 'repeatInstanceDate' | 'isVirtual'>> = {}
): Task {
  patchTask(tasks.value, task.id, (targetTask) => {
    targetTask.startDate = fields.startDate;
    targetTask.startTime = fields.startTime;
    targetTask.dueDate = fields.dueDate;
    targetTask.dueTime = fields.dueTime;
    if ('repeatSeriesId' in repeatMeta) targetTask.repeatSeriesId = repeatMeta.repeatSeriesId;
    if ('repeatFrequency' in repeatMeta) targetTask.repeatFrequency = repeatMeta.repeatFrequency;
    if ('repeatInstanceDate' in repeatMeta) targetTask.repeatInstanceDate = repeatMeta.repeatInstanceDate;
    if ('isVirtual' in repeatMeta) targetTask.isVirtual = repeatMeta.isVirtual;
    targetTask.updatedAt = nowIso;
  }, 'id');

  syncTaskEditorDraftDateFields(task.id, fields);
  syncTaskDateFieldsToCrdt(task.id, fields);

  const currentTask = tasks.value.find(item => item.id === task.id);
  return {
    ...(currentTask || task),
    ...repeatMeta,
    startDate: fields.startDate,
    startTime: fields.startTime,
    dueDate: fields.dueDate,
    dueTime: fields.dueTime,
    updatedAt: nowIso
  };
}

async function saveRepeatTaskDateFields(
  task: Task,
  fields: TaskEditorDateFields
): Promise<Task | null> {
  if (!isRepeatTaskForDateSave(task)) {
    return null;
  }

  const targetTask = await resolveTaskEditorTargetTask(task);
  const automaticStatus = getInitialAutomaticTaskStatus(targetTask, fields);
  const blockId = typeof targetTask.blockId === 'string' ? targetTask.blockId.trim() : '';
  const repeatSeriesId = targetTask.repeatSeriesId;
  const repeatPersistenceTarget = { ...targetTask };
  const shouldClearRepeatDates = !fields.startDate && !fields.startTime && !fields.dueDate && !fields.dueTime;
  if (shouldClearRepeatDates) {
    const nowIso = new Date().toISOString();
    const updatedTask = applyTaskDateFieldsLocally(targetTask, fields, nowIso, {
      repeatSeriesId: undefined,
      repeatFrequency: 'none',
      repeatInstanceDate: undefined,
      isVirtual: false
    });
    taskEditorRepeatFrequency.value = 'none';
    taskEditorRepeatRule.value = null;
    eventBus.emit(Events.TASK_DATE_CHANGED, updatedTask);

    if (blockId) {
      await TaskRepository.updateTask(targetTask.id, {
        startDate: '',
        startTime: undefined,
        dueDate: '',
        dueTime: undefined
      });
      await TaskRepository.clearCache();
    }
    await TaskRepository.setTaskRepeatRule(repeatPersistenceTarget, 'none');

    notifyRepeatChanged({
      blockId,
      seriesId: repeatSeriesId,
      frequency: 'none'
    });
    scheduleKernelTaskIndexRefresh();
    await refreshInternalState();
    return updatedTask;
  }

  const updatedSeries = await updateRepeatSeriesDates(
    targetTask,
    fields.startDate || null,
    fields.dueDate || null,
    {
      startTime: fields.startTime || null,
      dueTime: fields.dueTime || null
    },
    { emitChange: false }
  );
  if (!updatedSeries) {
    return null;
  }

  const persistedFields: TaskEditorDateFields = {
    startDate: updatedSeries.startDate || '',
    startTime: updatedSeries.startTime || '',
    dueDate: updatedSeries.endDate || '',
    dueTime: updatedSeries.dueTime || ''
  };
  const persistedBlockId = blockId
    || updatedSeries.templateBlockId
    || '';
  if (persistedBlockId) {
    await setBlockAttrs(persistedBlockId, {
      'custom-task-start-date': persistedFields.startDate,
      'custom-task-due-date': persistedFields.dueDate,
      'custom-task-start-time': persistedFields.startTime,
      'custom-task-due-time': persistedFields.dueTime,
      ...(automaticStatus ? buildTaskStatusAttrs(automaticStatus, undefined, true) : {})
    });
    await TaskRepository.clearCache();
  }

  const nowIso = new Date().toISOString();
  const updatedTask = applyTaskDateFieldsLocally(targetTask, persistedFields, nowIso, {
    repeatSeriesId: updatedSeries.id,
    repeatFrequency: updatedSeries.frequency,
    repeatInstanceDate: undefined,
    isVirtual: false
  });
  if (automaticStatus) {
    updatedTask.status = automaticStatus;
    patchTask(tasks.value, targetTask.id, currentTask => { currentTask.status = automaticStatus; }, 'id');
    crdtRepo.updateTaskField(targetTask.id, 'status', automaticStatus);
  }

  eventBus.emit(Events.TASK_DATE_CHANGED, updatedTask);
  notifyRepeatChanged({
    blockId: persistedBlockId,
    seriesId: updatedSeries.id,
    frequency: updatedSeries.frequency
  });
  scheduleKernelTaskIndexRefresh();
  await refreshInternalState();
  return updatedTask;
}

async function quickSaveTaskDateFields(task: Task, value: TaskEditorDateFields): Promise<void> {
  const normalizedFields = normalizeTaskEditorDateFields(value);
  const automaticStatus = getInitialAutomaticTaskStatus(task, normalizedFields);
  const currentFields = await resolveCurrentTaskDateFields(task);
  const activeDraft = activeTaskEditDraft.value;
  const normalizedDraft = activeDraft?.taskId === task.id
    ? normalizeTaskEditorDateFields(activeDraft)
    : currentFields;
  if (
    isSameTaskEditorDateFields(normalizedDraft, normalizedFields)
    && isSameTaskEditorDateFields(currentFields, normalizedFields)
  ) {
    return;
  }

  if (isRepeatTaskForDateSave(task)) {
    try {
      const updatedRepeatTask = await saveRepeatTaskDateFields(task, normalizedFields);
      if (updatedRepeatTask) {
        return;
      }
    } catch (error) {
      console.error('[TaskManager] Failed to update repeat task dates:', error);
      return;
    }
  }

  const updated = await applyTaskEditorFieldUpdate(task, {
    attrs: {
      'custom-task-start-date': normalizedFields.startDate || '',
      'custom-task-due-date': normalizedFields.dueDate || '',
      'custom-task-start-time': normalizedFields.startTime || '',
      'custom-task-due-time': normalizedFields.dueTime || '',
      ...(automaticStatus ? buildTaskStatusAttrs(automaticStatus, undefined, true) : {})
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
      if (automaticStatus) targetTask.status = automaticStatus;
    },
    syncCrdt: () => {
      crdtRepo.updateTaskField(task.id, 'startDate', normalizedFields.startDate);
      crdtRepo.updateTaskField(task.id, 'startTime', normalizedFields.startTime);
      crdtRepo.updateTaskField(task.id, 'dueDate', normalizedFields.dueDate);
      crdtRepo.updateTaskField(task.id, 'dueTime', normalizedFields.dueTime);
      if (automaticStatus) crdtRepo.updateTaskField(task.id, 'status', automaticStatus);
    },
    refreshKernelIndex: true
  });
  if (!updated) {
    return;
  }
  const currentTask = tasks.value.find(item => item.id === task.id);
  const updatedTask: Task = {
    ...(currentTask || task),
    startDate: normalizedFields.startDate,
    startTime: normalizedFields.startTime,
    dueDate: normalizedFields.dueDate,
    dueTime: normalizedFields.dueTime,
    updatedAt: currentTask?.updatedAt || new Date().toISOString()
  };
  eventBus.emit(Events.TASK_DATE_CHANGED, updatedTask);
}

async function quickSaveTaskRepeatRule(task: Task, repeat: RepeatFrequency | RepeatRuleInput): Promise<void> {
  const frequency = typeof repeat === 'string' ? repeat : repeat.frequency;
  if (frequency === 'none') {
    patchTask(tasks.value, task.id, (targetTask) => {
      targetTask.repeatFrequency = 'none';
      targetTask.repeatSeriesId = undefined;
      targetTask.repeatInstanceDate = undefined;
      targetTask.isVirtual = false;
      targetTask.updatedAt = new Date().toISOString();
    }, 'id');
  } else {
    patchTask(tasks.value, task.id, (targetTask) => {
      targetTask.repeatFrequency = frequency;
      targetTask.updatedAt = new Date().toISOString();
    }, 'id');
  }
  invalidateCache();
  invalidateSortCache();
  updateTaskIndex();

  try {
    const series = await TaskRepository.setTaskRepeatRule(task, repeat);
    if (series && typeof repeat !== 'string') {
      const currentFields = getTaskDateFields(task);
      const syncedFields: TaskEditorDateFields = {
        ...currentFields,
        dueDate: series.endDate || ''
      };
      const blockId = typeof task.blockId === 'string' ? task.blockId.trim() : '';
      if (blockId) {
        await setBlockAttrs(blockId, {
          'custom-task-due-date': syncedFields.dueDate
        });
        await TaskRepository.clearCache();
      }
      const updatedTask = applyTaskDateFieldsLocally(task, syncedFields, new Date().toISOString(), {
        repeatSeriesId: series.id,
        repeatFrequency: series.frequency,
        repeatInstanceDate: undefined,
        isVirtual: false
      });
      eventBus.emit(Events.TASK_DATE_CHANGED, updatedTask);

      // setTaskRepeatRule emits while this editor flow is still applying the
      // template fields above. Rebuild once more from the final series so the
      // active view never waits for the asynchronous event-bus reconciliation.
      const repeatPayload = {
        blockId,
        seriesId: series.id,
        frequency: series.frequency
      };
      const rebuilt = await rebuildAffectedRepeatTasks(
        tasks.value,
        repeatPayload,
        resolveTaskManagerRepeatMaterializeOptions()
      );
      if (rebuilt.handled && rebuilt.touched) {
        tasks.value = syncTaskSnapshotWithLocalOverrides(rebuilt.nextTasks);
        invalidateCache();
        invalidateSortCache();
        updateTaskIndex();
      }
      // This second notification is intentionally after all template writes;
      // other mounted views then reconcile against the same final snapshot.
      notifyRepeatChanged(repeatPayload);
    }
    await refreshInternalState();
  } catch {
  }
}

async function quickSaveTaskDescription(task: Task, description: string): Promise<void> {
  const normalizedDescription = typeof description === 'string' ? description : '';
  const currentDescription = typeof task.description === 'string' ? task.description : '';
  const updated = await applyTaskEditorFieldUpdate(task, {
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
    },
    localOverrides: { description: normalizedDescription }
  });
  if (!updated) {
    return;
  }

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
    localOverrides: {
      reminderType: normalizedReminder.reminderType,
      reminderCustomTime: normalizedReminder.reminderCustomTimeValue
    }
  });
}

async function quickSaveTaskTags(task: Task, tagIds: string[]): Promise<void> {
  const nextTagState = buildTaskTagState(tagIds);
  const currentTagState = buildTaskTagState(task.tags, task.groupId);
  await applyTaskEditorFieldUpdate(task, {
    attrs: buildTaskTagAttrs(nextTagState.tagIds).attrs,
    isUnchanged: draft => (
      areTaskTagIdsEqual(draft.tags, nextTagState.tagIds)
      && draft.groupId === nextTagState.primaryTagId
      && areTaskTagIdsEqual(currentTagState.tagIds, nextTagState.tagIds)
      && currentTagState.primaryTagId === nextTagState.primaryTagId
    ),
    syncDraft: draft => {
      draft.tags = [...nextTagState.tagIds];
      draft.groupId = nextTagState.primaryTagId;
    },
    syncTask: targetTask => {
      targetTask.tags = [...nextTagState.tagIds];
      targetTask.groupId = nextTagState.primaryTagId || undefined;
    },
    syncCrdt: () => {
      crdtRepo.updateTaskField(task.id, 'tags', [...nextTagState.tagIds]);
      crdtRepo.updateTaskField(task.id, 'groupId', nextTagState.primaryTagId || undefined);
    },
    localOverrides: {
      tags: [...nextTagState.tagIds],
      groupId: nextTagState.primaryTagId || undefined
    }
  });
}

function handleDragStart(event: DragEvent, task: Task) {
  if (isMobileFrontend || shouldEnableDesktopCalendarPointerDrag()) {
    event.preventDefault();
    return;
  }
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/json', JSON.stringify(task));
    event.dataTransfer.setData('text/plain', task.id);
  }
}

function shouldEnableMobileCalendarDrag(): boolean {
  return props.enableMobileCalendarDrag && isMobileFrontend && !isBatchEditMode.value;
}

function shouldEnableDesktopCalendarPointerDrag(): boolean {
  return props.enableCalendarPointerDrag && !isMobileFrontend && !isBatchEditMode.value;
}

function shouldUseNativeTaskCardDrag(): boolean {
  return !isMobileFrontend && !isBatchEditMode.value && !shouldEnableDesktopCalendarPointerDrag();
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

function emitDesktopCalendarPointerDrag(
  phase: CalendarPointerDragPhase,
  task: Task,
  clientX: number,
  clientY: number
): void {
  const payload: MobileCalendarDragEventPayload = { task, clientX, clientY };
  if (phase === 'start') {
    emit('calendarPointerDragStart', payload);
  } else if (phase === 'move') {
    emit('calendarPointerDragMove', payload);
  } else if (phase === 'end') {
    emit('calendarPointerDragEnd', payload);
  } else {
    emit('calendarPointerDragCancel', payload);
  }

  if (typeof window === 'undefined') {
    return;
  }
  const detail: CalendarPointerDragEventPayload = { phase, ...payload };
  window.dispatchEvent(new CustomEvent<CalendarPointerDragEventPayload>(
    'pinch-calendar-task-pointer-drag',
    { detail }
  ));
}

function clearDesktopCalendarPointerGesture(emitCancel = false): void {
  const gesture = desktopCalendarPointerGesture.value;
  if (emitCancel && gesture?.started) {
    emitDesktopCalendarPointerDrag('cancel', gesture.task, gesture.latestX, gesture.latestY);
  }
  desktopCalendarPointerGesture.value = null;
  desktopCalendarDraggingTaskId.value = null;
}

function handleDesktopCalendarTaskPointerDown(event: PointerEvent, task: Task): void {
  if (!shouldEnableDesktopCalendarPointerDrag()) {
    return;
  }
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return;
  }
  if (!event.isPrimary || shouldIgnoreMobileCalendarDragTarget(event.target)) {
    clearDesktopCalendarPointerGesture(true);
    return;
  }

  clearDesktopCalendarPointerGesture(true);
  desktopCalendarPointerGesture.value = {
    task,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    latestX: event.clientX,
    latestY: event.clientY,
    started: false
  };
}

function handleDesktopCalendarTaskPointerMove(event: PointerEvent): void {
  const gesture = desktopCalendarPointerGesture.value;
  if (!gesture || gesture.pointerId !== event.pointerId) {
    return;
  }

  gesture.latestX = event.clientX;
  gesture.latestY = event.clientY;
  if (!gesture.started) {
    const movedDistance = Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY);
    if (movedDistance < DESKTOP_CALENDAR_DRAG_MOVE_THRESHOLD_PX) {
      return;
    }
    gesture.started = true;
    desktopCalendarDraggingTaskId.value = gesture.task.id;
    event.preventDefault();
    event.stopPropagation();
    emitDesktopCalendarPointerDrag('start', gesture.task, event.clientX, event.clientY);
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  emitDesktopCalendarPointerDrag('move', gesture.task, event.clientX, event.clientY);
}

function finishDesktopCalendarTaskPointer(event: PointerEvent, cancelled: boolean): void {
  const gesture = desktopCalendarPointerGesture.value;
  if (!gesture || gesture.pointerId !== event.pointerId) {
    return;
  }

  gesture.latestX = event.clientX;
  gesture.latestY = event.clientY;
  if (!gesture.started) {
    clearDesktopCalendarPointerGesture();
    return;
  }

  suppressTaskCardClick(gesture.task.id);
  event.preventDefault();
  event.stopPropagation();
  emitDesktopCalendarPointerDrag(cancelled ? 'cancel' : 'end', gesture.task, event.clientX, event.clientY);
  clearDesktopCalendarPointerGesture();
}

function handleDesktopCalendarTaskPointerUp(event: PointerEvent): void {
  finishDesktopCalendarTaskPointer(event, false);
}

function handleDesktopCalendarTaskPointerCancel(event: PointerEvent): void {
  finishDesktopCalendarTaskPointer(event, true);
}

function handleWindowDesktopCalendarPointerDragBlur(): void {
  clearDesktopCalendarPointerGesture(true);
}

function handleMobileTaskPointerDown(event: PointerEvent, task: Task): void {
  if (shouldEnableDesktopCalendarPointerDrag()) {
    handleDesktopCalendarTaskPointerDown(event, task);
    return;
  }
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
  if (desktopCalendarPointerGesture.value) {
    handleDesktopCalendarTaskPointerMove(event);
    return;
  }
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
  if (desktopCalendarPointerGesture.value) {
    handleDesktopCalendarTaskPointerMove(event);
    return;
  }
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
  if (desktopCalendarPointerGesture.value) {
    handleDesktopCalendarTaskPointerUp(event);
    return;
  }
  finishMobileTaskPointer(event, false);
}

function handleMobileTaskPointerCancel(event: PointerEvent): void {
  if (desktopCalendarPointerGesture.value) {
    handleDesktopCalendarTaskPointerCancel(event);
    return;
  }
  finishMobileTaskPointer(event, true);
}

function handleDocumentMobileTaskPointerUp(event: PointerEvent): void {
  if (desktopCalendarPointerGesture.value) {
    handleDesktopCalendarTaskPointerUp(event);
    return;
  }
  if (!mobileCalendarPointerGesture.value) {
    return;
  }
  handleMobileTaskPointerUp(event);
}

function handleDocumentMobileTaskPointerCancel(event: PointerEvent): void {
  if (desktopCalendarPointerGesture.value) {
    handleDesktopCalendarTaskPointerCancel(event);
    return;
  }
  if (!mobileCalendarPointerGesture.value) {
    return;
  }
  handleMobileTaskPointerCancel(event);
}

async function handleQuickCreateCreated(payload: QuickCreateCreatedPayload): Promise<void> {
  try {
    const { blockId, taskId, notebookId, documentId, docPath, task } = payload;
    const tagState = buildTaskTagState(task.tags, task.groupId);
    let resolvedRootId = documentId !== PINCH_INBOX_OPTION_ID && documentId !== PINCH_DAILY_NOTE_OPTION_ID
      ? documentId
      : '';
    if (!resolvedRootId) {
      try {
        resolvedRootId = (await getIDsByHPath(notebookId, docPath))[0] || '';
      } catch {
        // The optimistic sidebar entry can still be reconciled by block ID.
      }
    }
    emitOptimisticBlockTaskAdded({ blockId, taskId }, {
      notebookId,
      rootId: resolvedRootId,
      docPath,
      task: {
        title: task.title,
        status: task.status || 'pending',
        priority: task.priority || 'none',
        dueDate: task.dueDate || undefined,
        tags: tagState.tagIds,
        groupId: tagState.primaryTagId || undefined,
        description: task.description || ''
      }
    });
    const selectedGoalIds = Array.isArray(task.goalIds)
      ? task.goalIds
        .map(goalId => typeof goalId === 'string' ? goalId.trim() : '')
        .filter(goalId => goalId && goalDefinitionsById.value.has(goalId))
      : [];
    if (selectedGoalIds.length > 0 && taskId) {
      const goalTask = {
        taskId,
        blockId,
        notebookId,
        rootId: resolvedRootId || undefined,
        title: task.title
      };
      const nextGoals = setTaskGoalMembership(goalDefinitions.value, goalTask, selectedGoalIds);
      goalDefinitions.value = nextGoals;
      await saveTaskGoalMembership(goalTask, selectedGoalIds);
    }
    lastTaskNotebook.value = notebookId;
    lastTaskDocument.value = documentId;
    lastSelectedTaskGroupId.value = tagState.primaryTagId;
    await updateSettings('taskManager', {
      lastTaskNotebook: notebookId,
      lastTaskDocument: documentId,
      selectedGroupId: tagState.primaryTagId
    });
    showTaskModal.value = false;
  } catch (error) {
    console.error('[TaskManager] Failed to finalize quick-create task:', error);
  }
}

defineExpose({
  openTaskScopeDialog,
  closeTaskScopeDialog
});

const futureVirtualRepeatPreviewTaskIds = computed(() => {
  const todayStart = getTodayStartTimestamp();
  const seriesWithTodayOrOverdueInstance = new Set<string>();
  const nearestFutureVirtualBySeries = new Map<string, { id: string; date: number }>();

  for (const task of baseFilteredTasks.value) {
    const seriesId = getTaskRepeatSeriesId(task);
    if (!task.isVirtual || !seriesId) continue;
    if (isVirtualTaskForToday(task)) {
      seriesWithTodayOrOverdueInstance.add(seriesId);
      continue;
    }
    const taskDate = getTaskDueDateTimestamp(task) ?? getTaskStartDateTimestamp(task);
    if (taskDate === null) continue;
    if (taskDate < todayStart) {
      seriesWithTodayOrOverdueInstance.add(seriesId);
      continue;
    }
    if (taskDate > todayStart) {
      const current = nearestFutureVirtualBySeries.get(seriesId);
      if (!current || taskDate < current.date) {
        nearestFutureVirtualBySeries.set(seriesId, { id: task.id, date: taskDate });
      }
    }
  }

  return new Set(
    Array.from(nearestFutureVirtualBySeries.entries())
      .filter(([seriesId]) => !seriesWithTodayOrOverdueInstance.has(seriesId))
      .map(([, instance]) => instance.id)
  );
});

function isFutureVirtualRepeatPreview(task: Task): boolean {
  return futureVirtualRepeatPreviewTaskIds.value.has(task.id);
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
  window.addEventListener('blur', handleWindowDesktopCalendarPointerDragBlur);
  window.addEventListener('resize', scheduleTaskVirtualUpdate, true);
  window.addEventListener('resize', scheduleTaskEditorSidebarPositionUpdate, true);
  window.addEventListener('resize', updateTaskModalOverlayStyle, true);
  document.addEventListener('mousedown', handleTaskFilterOutsideClick, true);
  window.addEventListener('resize', handleTaskFilterPopoverViewportChange, true);
  window.addEventListener('scroll', handleTaskFilterPopoverViewportChange, true);
  taskModalTeleportTarget.value?.addEventListener('scroll', handleTaskFilterPopoverViewportChange, true);
  await loadSettings();
  isTaskListCollapsed.value = userSettings.sidebar.taskListCollapsed === true;
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
    taskScopeDialogInitialTab.value = 'scope';
    showTaskScopeDialog.value = true;
    isHydratingFilters = false;
    return;
  }

  loading.value = true;
  try {
    const cachedTasks = await TaskRepository.getCachedTasksOnly({
      includeRepeatTemplateDate: true,
      repeatWindow: resolveTaskManagerRepeatWindow()
    });
    if (cachedTasks.length > 0) {
      hydrateMemoTitlesFromLiveDom(cachedTasks, TASK_TITLE_HYDRATE_LIMIT);
      tasks.value = syncTaskSnapshotWithLocalOverrides(cachedTasks);
      hydrateMemoTitlesFromLiveDom(tasks.value, TASK_TITLE_HYDRATE_LIMIT);
      await refreshInternalState();
      if (tasks.value.length > 0 && tasks.value.length <= FILTER_SWITCH_BROAD_LOAD_THRESHOLD) {
        lastLoadedScope = { includeCompleted: showCompletedTasks.value, includeArchived: false };
      }
    } else {
      const prefilled = await prefillKernelLightTasks(getCurrentTaskQueryScope() || null);
      if (prefilled) {
        await refreshInternalState();
      }
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
  clearDesktopCalendarPointerGesture(true);
  document.removeEventListener('pointermove', handleDocumentMobileTaskPointerMove);
  document.removeEventListener('pointerup', handleDocumentMobileTaskPointerUp);
  document.removeEventListener('pointercancel', handleDocumentMobileTaskPointerCancel);
  document.removeEventListener('touchmove', handleDocumentMobileTaskTouchMove);
  document.removeEventListener('touchend', handleDocumentMobileTaskTouchEnd);
  document.removeEventListener('touchcancel', handleDocumentMobileTaskTouchCancel);
  window.removeEventListener('blur', handleWindowDesktopCalendarPointerDragBlur);
  closeTaskEditMenu();
  closeTaskFilterPopover();
  closeTaskGroupMenu();
  closeTaskQuickDateMenu();
  cleanupEventListeners();
  stopSkipSetCleanup();
  closeTaskEditorSidebar();
  taskScrollContainerRef.value?.removeEventListener('scroll', handleTaskListScroll);
  window.removeEventListener('resize', scheduleTaskVirtualUpdate, true);
  window.removeEventListener('resize', scheduleTaskEditorSidebarPositionUpdate, true);
  window.removeEventListener('resize', updateTaskModalOverlayStyle, true);
  cancelTaskEditorSidebarPositionUpdate();
  unlockTaskEditorParentScroll();
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
  timelineVirtualRowElements.clear();
  timelineVirtualRowHeightCache.clear();
  document.removeEventListener('mousedown', handleTaskFilterOutsideClick, true);
  window.removeEventListener('resize', handleTaskFilterPopoverViewportChange, true);
  window.removeEventListener('scroll', handleTaskFilterPopoverViewportChange, true);
  taskModalTeleportTarget.value?.removeEventListener('scroll', handleTaskFilterPopoverViewportChange, true);
  disconnectTaskEditorHostResizeObserver();
  flushFilterSettingsUpdate();
  if (taskPopoverFilterSettingsUpdateTimer !== null) {
    clearTimeout(taskPopoverFilterSettingsUpdateTimer);
    taskPopoverFilterSettingsUpdateTimer = null;
  }
  flushTaskListGroupSettingsUpdate();
  if (fallbackRefreshTimer !== null) {
    clearTimeout(fallbackRefreshTimer);
    fallbackRefreshTimer = null;
  }
  if (taskScopeRefreshTimer !== null) {
    clearTimeout(taskScopeRefreshTimer);
    taskScopeRefreshTimer = null;
  }
  if (kernelTaskIndexRefreshTimer !== null) {
    clearTimeout(kernelTaskIndexRefreshTimer);
    kernelTaskIndexRefreshTimer = null;
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

  &.is-collapsed {
    box-sizing: border-box;
    padding: 8px 0px 8px 8px;
    border-radius: 10px;
    background-color: var(--b3-theme-background);
    box-shadow: var(--pinch-shadow);
    margin-bottom: 0px;
  }
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
  align-items: center;
}

.new-task-button,
.task-refresh,
.task-kernel-status {
  background: none;
  border: none;
  padding: 0;
  margin: 0 6px 0 0;
  cursor: pointer;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  svg {
    color: var(--b3-theme-on-surface);
    width: 18px;
    height: 18px;
    margin: 0;
  }
}

.task-manager-header .header-actions .new-task-button:hover,
.task-manager-header .header-actions .task-refresh:hover,
.task-manager-header .header-actions .task-kernel-status:hover {
  background: var(--b3-list-hover);
}

.task-manager-header .header-actions .new-task-button .icon,
.task-manager-header .header-actions .task-refresh .icon,
.task-manager-header .header-actions .task-kernel-status .icon {
  margin: 0;
}

.kernel-diagnostics-control {
  position: relative;
  display: flex;
}

.task-kernel-status {
  display: none;
  &.active,
  &.is-connected {
    svg {
      color: var(--b3-theme-primary);
    }
  }

  &.is-error {
    svg {
      color: var(--b3-theme-error);
    }
  }
}

.kernel-diagnostics-popover {
  position: absolute;
  top: 30px;
  right: 2px;
  z-index: 20;
  width: min(300px, calc(100vw - 32px));
  padding: 12px;
  border: 1px solid var(--b3-border-color);
  border-radius: 8px;
  background: var(--b3-theme-surface);
  box-shadow: var(--b3-dialog-shadow);
  color: var(--b3-theme-on-surface);
}

.kernel-diagnostics-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.kernel-diagnostics-title {
  font-size: 13px;
  font-weight: 700;
}

.kernel-diagnostics-badge {
  display: inline-flex;
  align-items: center;
  min-height: 20px;
  padding: 0 7px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 1;
  color: var(--b3-theme-on-surface);
  background: var(--b3-list-hover);

  &.status-connected {
    color: var(--b3-theme-primary);
    background: color-mix(in srgb, var(--b3-theme-primary) 14%, transparent);
  }

  &.status-error {
    color: var(--b3-theme-error);
    background: color-mix(in srgb, var(--b3-theme-error) 14%, transparent);
  }
}

.kernel-diagnostics-grid {
  display: grid;
  grid-template-columns: minmax(76px, auto) 1fr;
  gap: 7px 12px;
  font-size: 12px;

  span {
    color: var(--b3-theme-on-surface-light);
  }

  strong {
    min-width: 0;
    overflow-wrap: anywhere;
    font-weight: 600;
    color: var(--b3-theme-on-surface);
    text-align: right;
  }
}

.kernel-diagnostics-error,
.kernel-diagnostics-warning {
  margin-bottom: 10px;
  padding: 8px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.5;
}

.kernel-diagnostics-error {
  color: var(--b3-theme-error);
  background: color-mix(in srgb, var(--b3-theme-error) 12%, transparent);
}

.kernel-diagnostics-warning {
  margin-top: 10px;
  margin-bottom: 0;
  color: var(--b3-theme-on-surface);
  background: var(--b3-list-hover);
}

.kernel-diagnostics-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.kernel-diagnostics-action {
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--b3-border-color);
  border-radius: 6px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  font-size: 12px;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  &.primary {
    border-color: var(--b3-theme-primary);
    background: var(--b3-theme-primary);
    color: var(--b3-theme-on-primary);
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

.task-editor-overlay-enter-active,
.task-editor-overlay-leave-active {
  transition: opacity 0.3s ease;
}

.task-editor-overlay-enter-active :deep(.task-editor-sidebar-panel.is-sidebar),
.task-editor-overlay-leave-active :deep(.task-editor-sidebar-panel.is-sidebar) {
  transition: opacity 0.24s ease, transform 0.26s cubic-bezier(0.2, 0.8, 0.2, 1);
  transform-origin: bottom center;
}

.task-editor-overlay-enter-from,
.task-editor-overlay-leave-to {
  opacity: 0;
}

.task-editor-overlay-enter-from :deep(.task-editor-sidebar-panel.is-sidebar),
.task-editor-overlay-leave-to :deep(.task-editor-sidebar-panel.is-sidebar) {
  opacity: 0;
  transform: translateY(calc(100% + 24px));
}

.task-editor-overlay-enter-to :deep(.task-editor-sidebar-panel.is-sidebar),
.task-editor-overlay-leave-from :deep(.task-editor-sidebar-panel.is-sidebar) {
  opacity: 1;
  transform: translateY(0);
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
  padding-top: 1px;
  padding-bottom: 3px;
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

.task-manager-calendar-drag-ghost {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 10000;
  max-width: 300px;
  padding: 6px 10px;
  overflow: hidden;
  border-radius: 8px;
  background: var(--pinch-background7, var(--b3-theme-surface));
  color: var(--b3-theme-on-background);
  box-shadow: 0 8px 18px rgba(0, 0, 0, .18);
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
  text-overflow: ellipsis;
  pointer-events: none;
  will-change: transform;
}

.task-batch-item.calendar-pointer-drag-source {
  -webkit-user-select: none;
  user-select: none;
}

.task-batch-item.calendar-pointer-drag-source :deep(.task-card.variant-sidebar) {
  cursor: grab;
}

.task-batch-item.calendar-pointer-dragging :deep(.task-card.variant-sidebar) {
  opacity: 0.42;
  transform: scale(0.985);
  transition: transform 0.14s ease, opacity 0.14s ease;
}

.task-batch-item.calendar-pointer-dragging :deep(.task-card.variant-sidebar),
.task-batch-item.calendar-pointer-dragging :deep(.task-card.variant-sidebar *) {
  cursor: grabbing !important;
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

.task-grouped-list.is-timeline-view {
  gap: 0;
  position: relative;
  isolation: isolate;
  padding-left: 70px;
}

.task-timeline-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 0px 2px 12px;
  scrollbar-width: none;
}

.task-timeline-tabs::-webkit-scrollbar {
  display: none;
}

.task-timeline-tab {
  flex: 0 0 auto;
  border: none;
  border-radius: 999px;
  padding: 6px 10px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-surface);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.task-timeline-tab:hover {
  color: var(--b3-theme-on-background);
}

.task-timeline-tab.active {
  background: var(--b3-theme-on-background);
  color: var(--b3-theme-background);
}

.tasks-list.is-timeline-view .task-group-section {
  position: relative;
  z-index: 1;
  gap: 6px;
  padding-bottom: 20px;
}

.tasks-list.is-timeline-view .task-group-section-header {
  padding: 0;
}

.tasks-list.is-timeline-view .task-group-section-title {
  margin-left: 0;
  padding-left: 8px;
  font-size: 12px;
}

.task-timeline-date {
  position: absolute;
  top: -2px;
  left: -60px;
  width: 72px;
  display: flex;
  align-items: baseline;
  gap: 5px;
  color: var(--b3-theme-on-surface);
  white-space: nowrap;
}

.task-timeline-date strong {
  font-size: 18px;
  line-height: 1;
  flex-shrink: 0;
}

.task-timeline-date span {
  font-size: 12px;
  opacity: 0.78;
  flex-shrink: 0;
}

.task-timeline-time {
  display: inline-flex;
  width: 60px;
  min-height: 24px;
  padding: 3px 6px;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  border: 1.5px dashed color-mix(in srgb, var(--b3-theme-on-surface) 30%, transparent);
  border-radius: 999px;
  background: var(--b3-theme-background);
  text-align: right;
  color: var(--b3-theme-on-surface);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.task-timeline-entry-meta {
  position: absolute;
  top: -2px;
  left: -68px;
  width: 72px;
}

.tasks-list.is-timeline-view .task-batch-item.timeline-entry {
  position: relative;
}

.task-timeline-node {
  display: none;
}

.tasks-list.is-timeline-view .task-group-section-body {
  position: relative;
  gap: 6px;
}

.tasks-list.is-timeline-view .task-group-section-body::before {
  content: '';
  position: absolute;
  z-index: 0;
  top: 0;
  bottom: 0;
  left: -36px;
  pointer-events: none;
  border-left: 1.5px dashed color-mix(in srgb, var(--b3-theme-on-surface) 30%, transparent);
}

.tasks-list.is-timeline-view .task-group-section-body > .task-batch-item {
  z-index: 1;
}

.tasks-list.is-timeline-view .task-timeline-virtual-list .timeline-virtual-section-header {
  padding-bottom: 6px;
}

.tasks-list.is-timeline-view .task-timeline-virtual-list .timeline-virtual-section-header.timeline-virtual-section-collapsed {
  padding-bottom: 20px;
}

.tasks-list.is-timeline-view .task-timeline-virtual-list .timeline-virtual-task {
  position: relative;
  z-index: 1;
  padding-bottom: 6px;
}

.tasks-list.is-timeline-view .task-timeline-virtual-list .timeline-virtual-task.timeline-virtual-section-end {
  padding-bottom: 20px;
}

.tasks-list.is-timeline-view .task-timeline-virtual-list .timeline-virtual-task::before {
  content: '';
  position: absolute;
  z-index: 0;
  top: -6px;
  bottom: 0;
  left: -36px;
  pointer-events: none;
  border-left: 1.5px dashed color-mix(in srgb, var(--b3-theme-on-surface) 30%, transparent);
}

.tasks-list.is-timeline-view .task-timeline-virtual-list .timeline-virtual-task.timeline-virtual-section-end::before {
  bottom: 20px;
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
<div
  class="task-title ariaLabel"
  :aria-label="titleTooltip + (titleTooltip ? '<br>' : '') + t('taskCard.rightClickFillDescription')"
  v-html="titleHtml"
></div>
