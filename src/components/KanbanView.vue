﻿<template>
    <div ref="kanbanViewRef" class="kanban-view">
      <div class="kanban-header">
        <div class="kanban-header-tools-module">
          <div v-if="showSourceFilterBar" class="filter-bar-inline">
            <div class="filter-group">
              <SourceFilterSelect
                :model-value="activeSourceFilterType"
                @update:model-value="activeSourceFilterType = String($event || 'all')"
                :options="sourceOptions"
              />
              <label
                v-if="showMilestoneModeSwitch"
                class="gantt-milestone-switch ariaLabel"
                :aria-label="t('kanbanView.enableMilestones')"
              >
                <span
                  class="gantt-milestone-checkbox"
                  :class="{ completed: ganttMilestonesEnabled }"
                >
                  <input v-model="ganttMilestonesEnabled" type="checkbox" />
                  <Icon
                    :name="ganttMilestonesEnabled ? 'squareCheck' : 'square'"
                    class="gantt-milestone-checkbox-icon"
                  />
                </span>
                <span>{{ t('kanbanView.enableMilestones') }}</span>
              </label>
            </div>
          </div>

          <div class="kanban-header-view-module">
            <div
              class="view-switcher"
              :class="{ 'mobile-view-switcher-only': isMobileFrontend || isCompactViewSwitcher }"
            >
              <template v-if="isMobileFrontend || isCompactViewSwitcher">
                <div ref="mobileViewSwitcherControlRef" class="mobile-view-switcher">
                  <button
                    type="button"
                    class="mobile-view-switcher-btn ariaLabel"
                    :class="{ active: mobileViewSwitcherVisible }"
                   
                    :aria-label="formatTemplate('kanbanView.switchViewCurrentTemplate', { current: currentViewOption.text })"
                    @click.stop="toggleMobileViewSwitcher"
                  >
                    <Icon v-if="currentView === 'stats'" name="statsBar" width="16" height="16" />
                    <Icon v-else :name="currentViewOption.icon" width="16" height="16" />
                    <span class="mobile-view-switcher-btn-text">{{ currentViewOption.text }}</span>
                  </button>
                  <div
                    v-if="mobileViewSwitcherVisible"
                    ref="mobileViewSwitcherPopoverRef"
                    class="mobile-view-switcher-popover"
                    @click.stop
                  >
                    <button
                      v-for="option in primaryViewSwitcherOptions"
                      :key="option.id"
                      type="button"
                      class="mobile-view-switcher-item"
                      :class="{ active: isPrimaryViewOptionActive(option) }"
                      @click="selectPrimaryMobileView(option)"
                    >
                      <Icon v-if="option.value === 'stats'" name="statsBar" width="17" height="17" />
                      <Icon v-else :name="option.icon" width="17" height="17" />
                      <span>{{ option.text }}</span>
                    </button>
                  </div>
                </div>
              </template>
              <template v-else>
                <button
                  v-for="option in primaryViewSwitcherOptions"
                  :key="option.id"
                  :class="['view-btn', { active: isPrimaryViewOptionActive(option) }]"
                  @click="selectPrimaryView(option)"
                >
                  <Icon v-if="option.value === 'stats'" name="statsBar" width="15" height="15" />
                  <Icon v-else :name="option.icon" width="15" height="15" />
                  <span>{{ option.text }}</span>
                </button>
              </template>
            </div>
          </div>

          <div class="header-actions">
            <button
              v-if="currentView === 'kanban' && isKanbanBatchEditMode"
              type="button"
              class="exit-kanban-batch-edit-btn"
              @click="exitKanbanBatchEditMode"
            >
              {{ t('taskManager.exitBatchEdit') }}
            </button>
            <button
              type="button"
              class="scope-btn ariaLabel"
             
              :aria-label="t('taskScopeDialog.settings')"
              @click="void openTaskScopeDialog()"
            >
              <Icon name="taskScope" width="24" height="24" />
            </button>
            <button @click="refreshTasks" class="refresh-btn ariaLabel" :aria-label="t('taskManager.refreshTasks')">
              <Icon name="refresh" width="24" height="24" />
            </button>
            <button
              v-if="showMobileCalendarTaskDrawerButton"
              type="button"
              class="mobile-calendar-task-drawer-btn ariaLabel"
              :class="{ active: mobileCalendarTaskDrawerVisible }"
             
              :aria-label="t('kanbanView.openTaskLibrary')"
              @click="toggleMobileCalendarTaskDrawer"
            >
              <Icon name="taskDrawer" width="21" height="21" />
            </button>
            <button
              v-if="props.showDialogCloseButton"
              type="button"
              class="pinch-mobile-kanban-dialog-close-button ariaLabel"
             
              :aria-label="t('common.close')"
              @click="emit('dialogClose')"
            >
              <Icon name="close" width="24" height="24" />
            </button>
          </div>
        </div>
      </div>
      <div
        v-if="showDocumentTabsRow"
        class="document-tabs-row"
      >
      <div
        v-if="showDocumentTabs"
        ref="documentTabsRef"
        class="document-tabs"
        @wheel="handleDocumentTabsWheel"
      >
        <template v-for="option in visibleDocumentOptions" :key="option.value">
          <div
            v-if="option.value === 'all'"
            class="document-tab document-tab-scope"
            :class="{ active: currentDocumentFilter === 'all' }"
            @contextmenu.prevent.stop="handleDocumentTabContextMenu($event, option)"
          >
            <button
              type="button"
              class="document-tab-scope-label"
              @click="currentDocumentFilter = 'all'; closeDocumentScopePicker()"
            >
              {{ option.text }}
            </button>
            <button
              type="button"
              class="document-tab-scope-toggle ariaLabel"
              :class="{ active: documentScopePickerVisible }"
              :aria-label="t('kanbanView.documentTabList')"
              @click.stop="toggleDocumentScopePicker"
            >
              <Icon name="chevronDown" width="14" height="14" />
            </button>
            <button
              v-if="activeDocumentTabScope"
              type="button"
              class="document-tab-scope-reset ariaLabel"
              :aria-label="t('taskManager.all')"
              @click.stop="void selectDocumentTabScope()"
            >
              ×
            </button>
          </div>
          <button
            v-else
            type="button"
            class="document-tab"
            :class="{
              active: currentDocumentFilter === option.value,
              draggable: canReorderDocumentTabs,
              'is-dragging': draggedDocumentTabId === option.value,
              'is-drop-target': dragOverDocumentTabId === option.value
            }"
            :draggable="canReorderDocumentTabs"
            @click="currentDocumentFilter = option.value; closeDocumentScopePicker()"
            @contextmenu.prevent.stop="handleDocumentTabContextMenu($event, option)"
            @dragstart="handleDocumentTabDragStart($event, option)"
            @dragover="handleDocumentTabDragOver($event, option)"
            @drop="handleDocumentTabDrop($event, option)"
            @dragend="clearDocumentTabDragState"
          >
            <span v-if="canReorderDocumentTabs" class="document-tab-milestone-number">
              {{ getDocumentTabMilestoneNumber(option.value) }}
            </span>
            <span>{{ option.text }}</span>
          </button>
        </template>
        <Teleport to="body">
          <div
            v-if="documentScopePickerVisible"
            ref="documentScopePickerRef"
            class="document-scope-picker"
            :style="documentScopePickerStyle"
            @click.stop
          >
            <input
              ref="documentScopePickerSearchInputRef"
              v-model="documentScopeTreeSearch"
              type="search"
              class="document-scope-picker-search"
              :placeholder="t('kanbanView.searchDocumentName')"
              :aria-label="t('kanbanView.searchDocumentName')"
              @click.stop
            >
            <button
              type="button"
              class="document-scope-picker-row document-scope-picker-all"
              :class="{ active: !activeDocumentTabScope }"
              @click="void selectDocumentTabScope()"
            >
              {{ t('taskManager.all') }}
            </button>
            <div v-if="documentScopeTreeLoading" class="document-scope-picker-empty">{{ t('taskManager.loading') }}</div>
            <button
              v-for="row in documentScopeTreeRows"
              :key="row.key"
              type="button"
              class="document-scope-picker-row"
              :class="{ active: activeDocumentTabScope?.id === row.document.id && activeDocumentTabScope?.notebookId === row.document.notebookId }"
              :style="{ paddingLeft: `${12 + row.depth * 18}px` }"
              :title="row.document.path || row.document.name"
              @click="void selectDocumentTabScope(row.document)"
            >
              {{ row.document.name }}
            </button>
            <div v-if="!documentScopeTreeLoading && documentScopeTreeRows.length === 0" class="document-scope-picker-empty">
              {{ t('kanbanView.noDocumentTabs') }}
            </div>
          </div>
        </Teleport>
      </div>
      <div v-else class="document-tabs-placeholder"></div>
      <div
        v-if="showDocumentTabsDropdown"
        ref="documentTabsDropdownControlRef"
        class="document-tabs-dropdown"
      >
        <button
          ref="documentTabsDropdownButtonRef"
          type="button"
          class="document-tabs-dropdown-btn ariaLabel"
          :class="{ active: documentTabsDropdownVisible }"
         
          :aria-label="t('kanbanView.documentTabList')"
          @click.stop="toggleDocumentTabsDropdown"
        >
          <Icon name="chevronDown" width="16" height="16" />
        </button>
        <Teleport to="body">
          <div
            v-if="documentTabsDropdownVisible"
            ref="documentTabsDropdownPopoverRef"
            class="document-tabs-dropdown-popover"
            :style="documentTabsDropdownPopoverStyle"
            @click.stop
          >
            <div
              v-for="option in documentTabPopoverOptions"
              :key="option.value"
              class="document-tabs-dropdown-item"
              :class="{ active: currentDocumentFilter === option.value, hidden: option.hidden }"
              @click.stop="selectDocumentTabFromPopover(option.value)"
            >
              <span class="document-tabs-dropdown-item-text">{{ option.text }}</span>
              <button
                type="button"
                class="document-tabs-visibility-btn ariaLabel"
               
                :aria-label="getDocumentTabVisibilityLabel(option.hidden)"
                @click.stop="toggleDocumentTabVisibility(option.value)"
              >
                <Icon :name="option.hidden ? 'eyeOff' : 'eye'" width="16" height="16" />
              </button>
            </div>
            <div v-if="documentTabPopoverOptions.length === 0" class="document-tabs-dropdown-empty">
              {{ t('kanbanView.noDocumentTabs') }}
            </div>
          </div>
        </Teleport>
      </div>
      <div v-if="isBoardTaskView" class="document-tabs-actions">
        <div
          ref="tableSearchControlRef"
          class="task-search"
          :class="{ 'is-mobile-collapsed': isMobileTaskSearchCollapsed }"
        >
          <button
            type="button"
            class="task-search-toggle ariaLabel"
            :aria-label="isMobileTaskSearchCollapsed ? t('kanbanView.expandSearch') : t('taskManager.searchTasks')"
            @click.stop="handleTaskSearchToggleClick"
          >
            <Icon name="searchCompact" class="task-search-icon" width="14" height="14" />
          </button>
          <input class="ariaLabel"
            v-show="!isMobileTaskSearchCollapsed"
            ref="tableSearchInputRef"
            v-model="tableSearchQuery"
            type="search"
            :placeholder="t('taskManager.searchTasks')"
            :aria-label="t('taskManager.searchTasks')"
            @keydown.esc.stop.prevent="handleTableSearchEscape"
          />
          <button
            v-if="tableSearchQuery && !isMobileTaskSearchCollapsed"
            type="button"
            class="task-search-clear ariaLabel"
            :aria-label="t('kanbanView.clearSearch')"
            @click="tableSearchQuery = ''"
          >
            ×
          </button>
        </div>
        <div ref="kanbanFilterControlRef" class="task-filter-control">
          <button
            type="button"
            class="task-filter-btn ariaLabel"
            :class="{ active: kanbanFilterPopoverVisible || hasActiveKanbanFilters }"
           
            :aria-label="t('taskManager.filterTasks')"
            @click.stop="toggleKanbanFilterPopover($event)"
          >
            <Icon name="filter" width="16" height="16" />
            <span v-if="activeKanbanFilterCount > 0" class="task-filter-count">
              {{ activeKanbanFilterCount }}
            </span>
          </button>
        </div>
        <div ref="taskViewGroupMenuControlRef" class="task-group-menu-control">
          <button
            type="button"
            class="task-group-menu-btn ariaLabel"
            :class="{
              active: taskViewGroupMenuVisible || activeTaskViewGroupMode !== 'status' || !showCompletedTasks || currentView === 'list',
              'is-batch-active': currentView === 'kanban' && isKanbanBatchEditMode
            }"
           
            :aria-label="t('kanbanView.viewSettings')"
            @click.stop="toggleTaskViewGroupMenu"
          >
            <Icon name="moreVertical" width="16" height="16" />
          </button>
          <div
            v-if="taskViewGroupMenuVisible"
            ref="taskViewGroupMenuPopoverRef"
            class="task-group-menu-popover"
            :class="{ 'quadrant-settings-popover': currentView === 'quadrant' }"
            @click.stop
          >
            <template v-if="currentTaskViewGroupOptions.length">
              <button
                v-for="option in currentTaskViewGroupOptions"
                :key="`task-group:${option.value}`"
                type="button"
                class="task-group-menu-item"
                :class="{ active: activeTaskViewGroupMode === option.value }"
                @click.stop="selectTaskViewGroupMode(option.value)"
              >
                <span>{{ option.text }}</span>
                <span v-if="activeTaskViewGroupMode === option.value" class="task-group-menu-check">
                  <Icon name="taskCheckboxChecked" width="12" height="12" />
                </span>
              </button>
              <div class="task-group-menu-divider"></div>
            </template>
            <button
              v-if="currentView === 'kanban'"
              type="button"
              class="task-group-menu-item"
              :class="{ active: isKanbanBatchEditMode }"
              @click.stop="toggleKanbanBatchEditModeFromMenu"
            >
              <span>{{ isKanbanBatchEditMode ? t('taskManager.exitBatchEdit') : t('taskManager.enterBatchEdit') }}</span>
              <span v-if="isKanbanBatchEditMode" class="task-group-menu-check">
                <Icon name="taskCheckboxChecked" width="12" height="12" />
              </span>
            </button>
            <div v-if="currentView === 'kanban'" class="task-group-menu-divider"></div>
            <div v-if="currentView === 'quadrant'" class="quadrant-urgency-setting">
              <label for="quadrant-urgency-days">
                <span>{{ t('quadrantView.urgencyWindow') }}</span>
                <strong>{{ formatTemplate('quadrantView.urgencyWindowValue', { days: quadrantUrgentDays }) }}</strong>
              </label>
              <input
                id="quadrant-urgency-days"
                v-model.number="quadrantUrgencyDayIndex"
                type="range"
                min="0"
                :max="QUADRANT_URGENCY_DAY_OPTIONS.length - 1"
                step="1"
                :style="{
                  '--quadrant-urgency-progress': `${(quadrantUrgencyDayIndex / (QUADRANT_URGENCY_DAY_OPTIONS.length - 1)) * 100}%`
                }"
                @change="saveQuadrantUrgencyDays"
              />
              <div class="quadrant-urgency-anchors" aria-hidden="true">
                <span
                  v-for="(days, index) in QUADRANT_URGENCY_DAY_OPTIONS"
                  :key="days"
                  :style="{
                    left: `calc(${(index / (QUADRANT_URGENCY_DAY_OPTIONS.length - 1)) * 100}% + ${9 - (index / (QUADRANT_URGENCY_DAY_OPTIONS.length - 1)) * 18}px)`
                  }"
                >{{ days }}</span>
              </div>
            </div>
            <button
              v-if="isBoardTaskView"
              type="button"
              class="task-group-menu-item"
              @click.stop="toggleKanbanTaskCardDetailsFromMenu"
            >
              <span>{{ showKanbanTaskCardDetails ? t('taskManager.hideDetails') : t('taskManager.showDetails') }}</span>
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
              v-if="hasVisibleExpandableKanbanTasks"
              type="button"
              class="task-group-menu-item"
              @click.stop="toggleAllVisibleKanbanDetailsFromMenu"
            >
              <span>{{ areAllVisibleKanbanDetailsExpanded ? t('taskManager.collapseAllDetails') : t('taskManager.expandAllDetails') }}</span>
            </button>
            <div class="task-group-menu-divider"></div>
            <button
              type="button"
              class="task-group-menu-item"
              @click.stop="openTaskGroupDialogFromMenu"
            >
              <span>{{ t('taskManager.tagManager') }}</span>
            </button>
          </div>
        </div>
      </div>
        <div v-else-if="isTableTaskView" class="document-tabs-actions table-document-actions">
          <div class="table-actions-row">
            <div
              ref="tableSearchControlRef"
              class="task-search"
              :class="{ 'is-mobile-collapsed': isMobileTaskSearchCollapsed }"
            >
              <button
                type="button"
                class="task-search-toggle ariaLabel"
               
                :aria-label="isMobileTaskSearchCollapsed ? t('kanbanView.expandSearch') : t('taskManager.searchTasks')"
                @click.stop="handleTaskSearchToggleClick"
              >
                <Icon name="searchCompact" class="task-search-icon" width="14" height="14" />
              </button>
              <input class="ariaLabel"
                v-show="!isMobileTaskSearchCollapsed"
                ref="tableSearchInputRef"
                v-model="tableSearchQuery"
                type="search"
                :placeholder="t('taskManager.searchTasks')"
                :aria-label="t('taskManager.searchTasks')"
                @keydown.esc.stop.prevent="handleTableSearchEscape"
              />
              <button
                v-if="tableSearchQuery && !isMobileTaskSearchCollapsed"
                type="button"
                class="task-search-clear ariaLabel"
                :aria-label="t('kanbanView.clearSearch')"
                @click="tableSearchQuery = ''"
              >
                ×
              </button>
            </div>
            <div ref="tableFilterControlRef" class="task-filter-control">
              <button
                type="button"
                class="task-filter-btn ariaLabel"
                :class="{ active: tableFilterPopoverVisible || hasActiveTableFilters }"
               
                :aria-label="t('taskManager.filterTasks')"
                @click.stop="toggleTableFilterPopover($event)"
              >
                <Icon name="filter" width="16" height="16" />
                <span v-if="activeTableFilterCount > 0" class="task-filter-count">
                  {{ activeTableFilterCount }}
                </span>
              </button>
            </div>
            <div ref="taskViewGroupMenuControlRef" class="task-group-menu-control">
              <button
                type="button"
                class="task-group-menu-btn ariaLabel"
                :class="{ active: taskViewGroupMenuVisible || activeTaskViewGroupMode !== 'status' || !showCompletedTasks }"
               
                :aria-label="t('kanbanView.viewSettings')"
                @click.stop="toggleTaskViewGroupMenu"
              >
                <Icon name="moreVertical" width="16" height="16" />
              </button>
              <div
                v-if="taskViewGroupMenuVisible"
                ref="taskViewGroupMenuPopoverRef"
                class="task-group-menu-popover"
                @click.stop
              >
                <button
                  v-for="option in currentTaskViewGroupOptions"
                  :key="`table-group:${option.value}`"
                  type="button"
                  class="task-group-menu-item"
                  :class="{ active: activeTaskViewGroupMode === option.value }"
                  @click.stop="selectTaskViewGroupMode(option.value)"
                >
                  <span>{{ option.text }}</span>
                  <span v-if="activeTaskViewGroupMode === option.value" class="task-group-menu-check">
                    <Icon name="taskCheckboxChecked" width="12" height="12" />
                  </span>
                </button>
                <div class="task-group-menu-divider"></div>
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
                  v-if="tableViewRef?.hasExpandableTasks"
                  type="button"
                  class="task-group-menu-item"
                  @click.stop="toggleAllTableTaskDetailsFromMenu"
                >
                  <span>{{ tableViewRef?.areAllExpandableTasksExpanded ? t('taskManager.collapseAllDetails') : t('taskManager.expandAllDetails') }}</span>
                </button>
              </div>
            </div>
          </div>
      </div>
    </div>

    <div v-if="loading" class="loading">{{ t('taskManager.loading') }}</div>
    <div
      v-else-if="currentView === 'kanban' && isSettingsLoaded"
      ref="kanbanBoardRef"
      class="kanban-board"
      :class="{ 'is-batch-mode': isKanbanBatchEditMode }"
      @mousedown.capture="handleKanbanBatchLassoMouseDown"
    >
      <div 
        v-for="column in kanbanColumns" 
        :key="column.id" 
        class="kanban-column"
        :class="[
          column.type === 'status' ? `status-${column.status}` : '',
          column.type === 'group' ? 'group-column' : '',
          column.type === 'heading' ? 'heading-column' : '',
          column.type === 'date' ? 'date-column' : '',
          column.type === 'action' ? 'action-column' : ''
        ]"
      >
        <template v-if="column.type === 'action'">
          <div class="column-tasks action-column-body">
            <button
              type="button"
              class="kanban-add-group-btn ariaLabel"
             
              :aria-label="getActionColumnButtonLabel(column)"
              @click="handleActionColumnClick(column)"
            >
              <Icon name="add" width="18" height="18" />
            </button>
          </div>
        </template>
        <template v-else>
          <div
            class="column-header"
            :class="{
              'group-column-reorder-header': canReorderGroupColumn(column),
              'group-column-reorder-target': isGroupColumnReorderTarget(column),
              'group-column-reorder-before': isGroupColumnReorderBefore(column),
              'group-column-reorder-after': isGroupColumnReorderAfter(column),
              'group-column-reorder-dragging': isGroupColumnBeingDragged(column)
            }"
            :draggable="canReorderGroupColumn(column)"
            @dragstart="handleGroupColumnReorderDragStart($event, column)"
            @dragover.prevent="handleGroupColumnReorderDragOver($event, column)"
            @dragleave="handleGroupColumnReorderDragLeave($event, column)"
            @drop.prevent="handleGroupColumnReorderDrop($event, column)"
            @dragend="handleGroupColumnReorderDragEnd"
          >
            <div class="column-header-main">
              <div
                v-if="isColumnTitleEditing(column)"
                class="column-title column-title-editing"
                @click.stop
              >
                <KanbanColumnTitlePrefix
                  :batch-mode="isKanbanBatchEditMode"
                  :batch-checked="isKanbanColumnBatchAllSelected(column)"
                  :batch-partial="isKanbanColumnBatchPartiallySelected(column)"
                  :batch-disabled="getColumnTaskCount(column) === 0"
                  :batch-label="getColumnBatchSelectionLabel(isKanbanColumnBatchAllSelected(column))"
                  :heading="isKanbanHeadingColumn(column)"
                  :group="isKanbanGroupColumn(column)"
                  :document="isKanbanDocumentColumn(column)"
                  :document-icon="getKanbanColumnDocumentIcon(column)"
                  :dot-style="getKanbanColumnDotStyle(column)"
                  :heading-icon-name="getKanbanHeadingIconName(column)"
                  @toggle-batch="toggleKanbanColumnBatchSelection(column)"
                />
                <input
                  ref="columnTitleInputRef"
                  v-model="columnTitleDraft"
                  class="column-title-input"
                  type="text"
                  :placeholder="getColumnTitlePlaceholder(column)"
                  :disabled="isSavingColumnTitle"
                  @keydown.enter.prevent.stop="submitColumnTitleEdit(column)"
                  @keydown.esc.prevent.stop="cancelColumnTitleEdit()"
                  @blur="submitColumnTitleEdit(column)"
                />
              </div>
              <button
                v-else-if="canEditColumnTitle(column)"
                type="button"
                class="column-title column-title-button ariaLabel"
                :aria-label="getEditColumnTitleLabel(column)"
                @click.stop="startColumnTitleEdit(column)"
              >
                <KanbanColumnTitlePrefix
                  :batch-mode="isKanbanBatchEditMode"
                  :batch-checked="isKanbanColumnBatchAllSelected(column)"
                  :batch-partial="isKanbanColumnBatchPartiallySelected(column)"
                  :batch-disabled="getColumnTaskCount(column) === 0"
                  :batch-label="getColumnBatchSelectionLabel(isKanbanColumnBatchAllSelected(column))"
                  :heading="isKanbanHeadingColumn(column)"
                  :group="isKanbanGroupColumn(column)"
                  :document="isKanbanDocumentColumn(column)"
                  :document-icon="getKanbanColumnDocumentIcon(column)"
                  :dot-style="getKanbanColumnDotStyle(column)"
                  :heading-icon-name="getKanbanHeadingIconName(column)"
                  @toggle-batch="toggleKanbanColumnBatchSelection(column)"
                />
                <span class="column-title-text">{{ getKanbanColumnTitleText(column) }}</span>
              </button>
              <div v-else class="column-title">
                <KanbanColumnTitlePrefix
                  :batch-mode="isKanbanBatchEditMode"
                  :batch-checked="isKanbanColumnBatchAllSelected(column)"
                  :batch-partial="isKanbanColumnBatchPartiallySelected(column)"
                  :batch-disabled="getColumnTaskCount(column) === 0"
                  :batch-label="getColumnBatchSelectionLabel(isKanbanColumnBatchAllSelected(column))"
                  :heading="isKanbanHeadingColumn(column)"
                  :group="isKanbanGroupColumn(column)"
                  :document="isKanbanDocumentColumn(column)"
                  :document-icon="getKanbanColumnDocumentIcon(column)"
                  :dot-style="getKanbanColumnDotStyle(column)"
                  :heading-icon-name="getKanbanHeadingIconName(column)"
                  @toggle-batch="toggleKanbanColumnBatchSelection(column)"
                />
                <span class="column-title-text">{{ getKanbanColumnTitleText(column) }}</span>
              </div>
            </div>
            <div class="column-header-actions">
              <div class="column-count">{{ getColumnTaskCount(column) }}</div>
              <button
                v-if="canCreateTaskInColumn(column)"
                type="button"
                class="column-add-task-btn ariaLabel"
               
                :aria-label="getColumnCreateTaskLabel(column)"
                @click.stop="openQuickCreateForKanbanColumn(column)"
              >
                <Icon name="addPlain" width="16" height="16" />
              </button>
              <button
                v-if="canCreateTaskInColumn(column)"
                type="button"
                class="column-archive-tasks-btn ariaLabel"
               
                :aria-label="getColumnArchiveTasksLabel(column)"
                :disabled="isKanbanColumnArchiving(column.id) || !canArchiveTasksInColumn(column)"
                @click.stop="archiveColumnTasks(column)"
              >
                <Icon name="archive" width="16" height="16" />
              </button>
            </div>
          </div>
          <div 
            class="column-tasks"
            :class="{ 'drag-over': dragOverColumnId === column.id }"
            @dragover.prevent="handleDragOver($event, column)"
            @dragleave="handleDragLeave"
            @drop="handleDrop($event, column)"
            @scroll="handleKanbanColumnScroll($event, column)"
            :ref="(el) => setKanbanColumnTasksRef(column.id, el as HTMLElement | null)"
          >
            <div
              v-if="getColumnTaskCount(column) > 0"
              class="column-task-spacer"
              :style="getKanbanSpacerStyle(column)"
            >
              <div
                v-for="task in getVisibleTasksForColumn(column)"
                :key="task.id"
                class="kanban-batch-item"
                :data-task-id="task.id"
                :class="{ selected: isKanbanTaskBatchSelected(task.id), 'is-batch-mode': isKanbanBatchEditMode }"
                @contextmenu="handleKanbanTaskContextMenu(task, $event)"
              >
                <TaskCard
                  :task="task"
                  variant="kanban"
                  :task-groups="taskGroups"
                  :goals="goalDefinitions"
                  :selected-goal-ids="getKanbanTaskCardGoalIds(task)"
                  :show-status-badge="activeBoardGroupBy !== 'status'"
                  :completed="isTaskCompletedVisual(task)"
                  :draggable="!isMobileFrontend && kanbanSupportsDrag && !isKanbanBatchEditMode"
                  :dragging="!!(draggedTask && draggedTask.id === task.id)"
                  :expanded="isKanbanTaskExpanded(task.id)"
                  :description-editing="inlineEditingDescriptionTaskId === task.id"
                  :description-draft="getInlineDescriptionDraft(task)"
                  :show-description="showKanbanTaskCardDetails"
                  :show-badges="showKanbanTaskCardDetails"
                  :show-document-title="shouldShowBoardTaskDocumentTitle(task, kanbanFilterDocument)"
                  :show-open-content="task.type === 'block'"
                  :document-title-override="getTaskDocumentTitle(task)"
                  :document-icon-override="getTaskDocumentIcon(task)"
                  :document-icon-svg="getTaskDocumentIconSvg(task, kanbanFilterDocument)"
                  :disable-description-context-menu="true"
                  :show-subtasks="isKanbanTaskExpanded(task.id)"
                  :title-tooltip="isKanbanBatchEditMode ? t('taskManager.clickSelectTask') : ''"
                  @card-click="handleKanbanTaskCardClick"
                  @open-content="openKanbanTaskContentInRight"
                  @start-focus="startFocusForTask"
                  @toggle-status="handleKanbanTaskToggleStatus"
                  @toggle-expand="toggleKanbanTaskExpand"
                  @description-start-edit="startInlineDescriptionEdit"
                  @description-input="handleInlineDescriptionInput"
                  @description-save="saveInlineDescriptionEdit"
                  @description-cancel="cancelInlineDescriptionEdit"
                  @subtask-toggle="handleSubtaskToggle"
                  @dragstart="handleDragStart"
                  @dragend="handleDragEnd"
                />
              </div>
            </div>
            <div v-else class="empty-column">
              {{ t('taskManager.noTasks') }}
            </div>
          </div>
        </template>
      </div>
      <div
        v-if="kanbanBatchLassoBox.active"
        class="kanban-batch-lasso"
        :style="kanbanBatchLassoStyle"
      ></div>
    </div>
    <div
      v-else-if="currentView === 'quadrant' && isSettingsLoaded"
      class="quadrant-board"
    >
      <section
        v-for="quadrant in quadrantSections"
        :key="quadrant.id"
        class="quadrant-section"
        :class="[`quadrant-${quadrant.id}`, { 'is-drag-over': quadrantDragOverId === quadrant.id }]"
        @dragover.prevent="handleQuadrantDragOver(quadrant.id)"
        @dragleave="handleQuadrantDragLeave($event)"
        @drop.prevent="void handleQuadrantDrop(quadrant.id)"
      >
        <header class="quadrant-section-header">
          <h3>{{ quadrant.title }}</h3>
          <span class="quadrant-section-count">{{ quadrant.tasks.length }}</span>
        </header>
        <div
          class="quadrant-section-tasks"
          :ref="(el) => setQuadrantSectionTasksRef(quadrant.id, el as HTMLElement | null)"
          @scroll="handleQuadrantSectionScroll($event, quadrant.id)"
        >
          <div
            v-if="quadrant.tasks.length > 0"
            class="quadrant-task-spacer"
            :style="getQuadrantSpacerStyle(quadrant.id, quadrant.tasks)"
          >
            <div
              v-for="task in getVisibleQuadrantTasks(quadrant.id, quadrant.tasks)"
              :key="task.id"
              class="quadrant-task"
              @contextmenu="handleKanbanTaskContextMenu(task, $event)"
            >
            <TaskCard
              :task="task"
              variant="kanban"
              :task-groups="taskGroups"
              :goals="goalDefinitions"
              :selected-goal-ids="getKanbanTaskCardGoalIds(task)"
              :show-status-badge="true"
              :completed="isTaskCompletedVisual(task)"
              :draggable="!isMobileFrontend && !task.isVirtual"
              :expanded="isKanbanTaskExpanded(task.id)"
              :show-description="showKanbanTaskCardDetails"
              :show-badges="showKanbanTaskCardDetails"
              :show-document-title="shouldShowBoardTaskDocumentTitle(task, kanbanFilterDocument)"
              :show-open-content="task.type === 'block'"
              :document-title-override="getTaskDocumentTitle(task)"
              :document-icon-override="getTaskDocumentIcon(task)"
              :document-icon-svg="getTaskDocumentIconSvg(task, kanbanFilterDocument)"
              :show-subtasks="isKanbanTaskExpanded(task.id)"
              @card-click="handleKanbanTaskCardClick"
              @open-content="openKanbanTaskContentInRight"
              @start-focus="startFocusForTask"
              @toggle-status="handleKanbanTaskToggleStatus"
              @toggle-expand="toggleKanbanTaskExpand"
              @dragstart="handleQuadrantDragStart"
              @dragend="handleQuadrantDragEnd"
            />
            </div>
          </div>
          <div v-if="quadrant.tasks.length === 0" class="quadrant-empty">
            {{ t('quadrantView.empty') }}
          </div>
        </div>
      </section>
    </div>
    <div
      v-else-if="currentView === 'list' && isSettingsLoaded"
      ref="listViewRef"
      class="kanban-list-view"
      @scroll="handleListViewScroll"
    >
      <div v-if="kanbanListSections.length === 0" class="empty-state">
        {{ t('taskManager.noTasks') }}
      </div>
      <div v-else class="kanban-list-masonry">
        <div
          v-for="(column, colIndex) in kanbanListMasonryColumns"
          :key="column.id"
          class="kanban-list-masonry-column"
        >
          <section
            v-if="colIndex === kanbanListMasonryColumns.length - 1 && kanbanListGroupActionColumn"
            class="kanban-list-section kanban-list-action-section"
          >
            <div class="kanban-list-action-body" @click="handleActionColumnClick(kanbanListGroupActionColumn)">
              <Icon name="add" width="16" height="16" />
              <span>{{ getActionColumnButtonLabel(kanbanListGroupActionColumn) }}</span>
            </div>
          </section>
          <section
            v-for="section in column.sections"
            :key="section.id"
            class="kanban-list-section"
            :class="[
              section.column.type === 'status' ? `status-${section.column.status}` : '',
              section.column.type === 'group' ? 'group-column' : '',
              section.column.type === 'heading' ? 'heading-column' : '',
              section.column.type === 'date' ? 'date-column' : '',
              { 'drag-over': dragOverColumnId === section.column.id }
            ]"
            @dragover.prevent="handleDragOver($event, section.column)"
            @dragleave="handleDragLeave"
            @drop="handleDrop($event, section.column)"
          >
            <header class="kanban-list-section-header">
              <div class="kanban-list-section-title-wrap">
                <KanbanColumnTitlePrefix
                  :heading="isKanbanHeadingColumn(section.column)"
                  :group="isKanbanGroupColumn(section.column)"
                  :document="isKanbanDocumentColumn(section.column)"
                  :document-icon="getKanbanColumnDocumentIcon(section.column)"
                  :dot-style="getKanbanColumnDotStyle(section.column)"
                  :heading-icon-name="getKanbanHeadingIconName(section.column)"
                />
                <span class="kanban-list-section-title">{{ getKanbanColumnTitleText(section.column) }}</span>
              </div>
              <div class="kanban-list-section-meta">
                <span class="kanban-list-section-count">{{ section.tasks.length }}</span>
                <button
                  v-if="canCreateTaskInColumn(section.column)"
                  type="button"
                  class="column-add-task-btn ariaLabel"
                 
                  :aria-label="getColumnCreateTaskLabel(section.column)"
                  @click.stop="openQuickCreateForKanbanColumn(section.column)"
                >
                  <Icon name="addPlain" width="16" height="16" />
                </button>
                <button
                  v-if="canCreateTaskInColumn(section.column)"
                  type="button"
                  class="column-archive-tasks-btn ariaLabel"
                 
                  :aria-label="getColumnArchiveTasksLabel(section.column)"
                  :disabled="isKanbanColumnArchiving(section.column.id) || !canArchiveTasksInColumn(section.column)"
                  @click.stop="archiveColumnTasks(section.column)"
                >
                  <Icon name="archive" width="16" height="16" />
                </button>
                <button
                  type="button"
                  class="kanban-list-section-toggle ariaLabel"
                  :class="{ collapsed: isKanbanListSectionCollapsed(section.id) }"
                 
                  :aria-label="isKanbanListSectionCollapsed(section.id) ? t('taskManager.expandGroup') : t('taskManager.collapseGroup')"
                  :aria-expanded="!isKanbanListSectionCollapsed(section.id)"
                  @click.stop="toggleKanbanListSectionCollapse(section.id)"
                >
                  <Icon name="chevronRight" width="14" height="14" />
                </button>
              </div>
            </header>
            <div
              v-if="!isKanbanListSectionCollapsed(section.id)"
              class="kanban-list-section-body protyle-wysiwyg"
              :style="getListSectionSpacerStyle(section)"
            >
              <div
                v-for="task in getVisibleTasksForListSection(section)"
                :key="task.id"
                v-memo="[task.status, task.priority, task.title, task.pinned, task.dueDate, task.dueTime, task.groupId, (task.tags || []).join(','), task.focusEstimate?.unit, task.focusEstimate?.value, task.isVirtual, task.taskId, task.blockId, task.sourceBlockId, task.repeatSeriesId, goalDefinitions, getKanbanTaskCardGoalIds(task).join(','), getTaskDocumentTitle(task), getTaskDocumentIcon(task), getTaskDocumentIconSvg(task, listFilterDocument), shouldShowBoardTaskDocumentTitle(task, listFilterDocument), activeBoardGroupBy, isKanbanTaskExpanded(task.id), showKanbanTaskCardDetails, inlineEditingDescriptionTaskId === task.id, !!(draggedTask && draggedTask.id === task.id)]"
                class="kanban-list-task-item"
                :data-task-id="task.id"
                @contextmenu="handleKanbanTaskContextMenu(task, $event)"
              >
                <TaskCard
                  :task="task"
                  variant="sidebar"
                  :task-groups="taskGroups"
                  :goals="goalDefinitions"
                  :selected-goal-ids="getKanbanTaskCardGoalIds(task)"
                  :show-status-badge="activeBoardGroupBy !== 'status'"
                  :completed="isTaskCompletedVisual(task)"
                  :draggable="!isMobileFrontend && kanbanSupportsDrag"
                  :dragging="!!(draggedTask && draggedTask.id === task.id)"
                  :expanded="isKanbanTaskExpanded(task.id)"
                  :description-editing="inlineEditingDescriptionTaskId === task.id"
                  :description-draft="getInlineDescriptionDraft(task)"
                  :show-description="showKanbanTaskCardDetails"
                  :show-badges="showKanbanTaskCardDetails"
                  :show-document-title="shouldShowBoardTaskDocumentTitle(task, listFilterDocument)"
                  :show-open-content="task.type === 'block'"
                  :document-title-override="getTaskDocumentTitle(task)"
                  :document-icon-override="getTaskDocumentIcon(task)"
                  :document-icon-svg="getTaskDocumentIconSvg(task, listFilterDocument)"
                  :disable-description-context-menu="true"
                  :show-subtasks="isKanbanTaskExpanded(task.id)"
                  @card-click="handleKanbanTaskCardClick"
                  @open-content="openKanbanTaskContentInRight"
                  @start-focus="startFocusForTask"
                  @toggle-status="handleKanbanTaskToggleStatus"
                  @toggle-expand="toggleKanbanTaskExpand"
                  @description-start-edit="startInlineDescriptionEdit"
                  @description-input="handleInlineDescriptionInput"
                  @description-save="saveInlineDescriptionEdit"
                  @description-cancel="cancelInlineDescriptionEdit"
                  @subtask-toggle="handleSubtaskToggle"
                  @dragstart="handleDragStart"
                  @dragend="handleDragEnd"
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
    
    <TableView 
      v-if="isTableTaskView"
      ref="tableViewRef"
      :tasks="activeOrArchiveTableViewTasks"
       :task-groups="taskGroups"
       :goals="goalDefinitions"
       :goal-ids-for-task="getKanbanTaskCardGoalIds"
       :group-mode="activeTableGroupBy"
      :document-group-order="tableDocumentGroupOrder"
      :heading-groups="taskHeadingGroups"
      :document-icon-by-root-id="documentIconByRootId"
      :document-title-by-root-id="documentTitleByRootId"
      @task-click="handleTaskClick"
      @open-click="openKanbanTaskContentInRight"
      @start-focus="startFocusForTask"
      @status-toggle="toggleTaskStatus"
      @subtask-toggle="handleSubtaskToggle"
      @description-update="handleDescriptionUpdate"
      @priority-update="handlePriorityUpdate"
      @status-update="handleStatusUpdate"
      @group-update="handleGroupUpdate"
      @tag-update="handleTaskTagUpdate"
      @subtask-description-update="handleSubtaskDescriptionUpdate"
      @subtask-priority-update="handleSubtaskPriorityUpdate"
      @subtask-status-update="handleSubtaskStatusUpdate"
      @subtask-group-update="handleSubtaskGroupUpdate"
      @subtask-start-date-update="handleSubtaskStartDateUpdate"
      @subtask-due-date-update="handleSubtaskDueDateUpdate"
      @subtask-start-time-update="handleSubtaskStartTimeUpdate"
      @subtask-due-time-update="handleSubtaskDueTimeUpdate"
      @group-create-task="handleTableGroupCreateTask"
      @group-archive-tasks="handleTableGroupArchiveTasks"
      @manage-groups="openTaskGroupDialog"
      @manage-goals="void openTaskScopeDialog('goals')"
      @goal-update="handleTableGoalUpdate"
      @start-date-update="handleStartDateUpdate"
      @due-date-update="handleDueDateUpdate"
      @start-time-update="handleStartTimeUpdate"
      @due-time-update="handleDueTimeUpdate"
    />
    <GanttView
      v-if="currentView === 'gantt'"
      :tasks="ganttViewTasks"
      :goals="goalDefinitions"
      :task-groups="taskGroups"
      :group-mode="ganttGroupMode"
      :document-order="ganttDocumentSectionOrder"
      :show-document-milestones="canReorderDocumentTabs"
      :selected-document-section="ganttSelectedDocumentSection"
      :document-icon-by-root-id="documentIconByRootId"
      :document-title-by-root-id="documentTitleByRootId"
      :auto-expand-unscheduled-tasks="currentDocumentFilter !== 'all'"
      @task-click="openKanbanTaskContentInRight"
      @task-date-changed="handleGanttTaskDateChanged"
      @task-color-changed="handleGanttTaskColorChanged"
      @start-focus="startFocusForTask"
      @edit-task="handleGanttTaskEdit"
       @status-toggle="toggleTaskStatus"
       @manage-goals="void openTaskScopeDialog('goals')"
       @section-task-create-requested="handleGanttSectionTaskCreateRequested"
       @task-goal-drop="handleGanttTaskGoalDrop"
      @goal-due-date-changed="handleGanttGoalDueDateChanged"
      @document-order-change="handleGanttDocumentOrderChange"
    />
    <MonthView 
      ref="calendarMonthViewRef"
      v-if="currentView === 'month'" 
      :tasks="showCalendarTasks ? monthViewTasks : []"
      :sidebar-tasks="showCalendarTasks ? monthSidebarTasks : []"
      :sidebar-collapsed="calendarSidebarCollapsed"
      :document-title-by-root-id="documentTitleByRootId"
      :lifelog-tasks="showCalendarTaskLifelog ? monthLifelogTasks : []"
      :task-groups="taskGroups"
      :goals="goalDefinitions"
      :show-focus-records="showCalendarFocusLifelog"
      :show-habits="showCalendarHabits"
      :show-task-lifelog="showCalendarTaskLifelog"
      :show-habit-lifelog="showCalendarHabitLifelog"
      :show-records-lifelog="showCalendarRecordsLifelog"
      :display-options="calendarSidebarDisplayOptions"
      :calendar-view-options="calendarHeaderViewOptions"
      :current-calendar-view="currentView"
      @task-click="handleTaskEditClick"
      @task-edit="handleCalendarTaskEdit"
      @task-date-changed="handleTaskDateChanged"
      @task-color-changed="handleGanttTaskColorChanged"
      @task-date-save-requested="handleCalendarTaskDateSaveRequested"
      @task-create-requested="handleCalendarTaskCreateRequested"
      @visible-range-change="handleMonthVisibleRangeChange"
      @calendar-view-change="handleCalendarViewChange"
      @calendar-display-toggle="toggleCalendarDisplayOption"
      @sidebar-collapsed-change="handleCalendarSidebarCollapsedChange"
    />
    <WeekView
      ref="calendarWeekViewRef"
      v-if="currentView === 'week'"
      :tasks="showCalendarTasks ? weekViewTasks : []"
      :sidebar-tasks="showCalendarTasks ? weekSidebarTasks : []"
      :sidebar-collapsed="calendarSidebarCollapsed"
      :document-title-by-root-id="documentTitleByRootId"
      :lifelog-tasks="showCalendarTaskLifelog ? weekLifelogTasks : []"
      :task-groups="taskGroups"
      :goals="goalDefinitions"
      :show-focus-records="showCalendarFocusLifelog"
      :show-habits="showCalendarHabits"
      :show-task-lifelog="showCalendarTaskLifelog"
      :show-habit-lifelog="showCalendarHabitLifelog"
      :show-records-lifelog="showCalendarRecordsLifelog"
      :display-options="calendarSidebarDisplayOptions"
      :calendar-view-options="calendarHeaderViewOptions"
      :current-calendar-view="currentView"
      @task-date-changed="handleTaskDateChanged"
      @task-color-changed="handleGanttTaskColorChanged"
      @task-date-save-requested="handleCalendarTaskDateSaveRequested"
      @task-click="handleTaskEditClick"
      @task-edit="handleCalendarTaskEdit"
      @task-create-requested="handleCalendarTaskCreateRequested"
      @visible-range-change="handleWeekVisibleRangeChange"
      @calendar-view-change="handleCalendarViewChange"
      @calendar-display-toggle="toggleCalendarDisplayOption"
      @sidebar-collapsed-change="handleCalendarSidebarCollapsedChange"
      @focus-session-contextmenu="handleCalendarFocusSessionContextmenu"
    />
    <WeekView
      ref="calendarWeekViewRef"
      v-if="currentView === 'day'"
      :tasks="showCalendarTasks ? dayViewTasks : []"
      :sidebar-tasks="showCalendarTasks ? daySidebarTasks : []"
      :sidebar-collapsed="calendarSidebarCollapsed"
      :document-title-by-root-id="documentTitleByRootId"
      :lifelog-tasks="showCalendarTaskLifelog ? dayLifelogTasks : []"
      :task-groups="taskGroups"
      :goals="goalDefinitions"
      :fixed-days-count="1"
      :show-focus-records="showCalendarFocusLifelog"
      :show-habits="showCalendarHabits"
      :show-task-lifelog="showCalendarTaskLifelog"
      :show-habit-lifelog="showCalendarHabitLifelog"
      :show-records-lifelog="showCalendarRecordsLifelog"
      :display-options="calendarSidebarDisplayOptions"
      :calendar-view-options="calendarHeaderViewOptions"
      :current-calendar-view="currentView"
      @task-date-changed="handleTaskDateChanged"
      @task-color-changed="handleGanttTaskColorChanged"
      @task-date-save-requested="handleCalendarTaskDateSaveRequested"
      @task-click="handleTaskEditClick"
      @task-edit="handleCalendarTaskEdit"
      @task-create-requested="handleCalendarTaskCreateRequested"
      @visible-range-change="handleWeekVisibleRangeChange"
      @calendar-view-change="handleCalendarViewChange"
      @calendar-display-toggle="toggleCalendarDisplayOption"
      @sidebar-collapsed-change="handleCalendarSidebarCollapsedChange"
      @focus-session-contextmenu="handleCalendarFocusSessionContextmenu"
    />
    <WeekView
      ref="calendarWeekViewRef"
      v-if="currentView === 'three-day'"
      :tasks="showCalendarTasks ? dayViewTasks : []"
      :sidebar-tasks="showCalendarTasks ? daySidebarTasks : []"
      :sidebar-collapsed="calendarSidebarCollapsed"
      :document-title-by-root-id="documentTitleByRootId"
      :lifelog-tasks="showCalendarTaskLifelog ? dayLifelogTasks : []"
      :task-groups="taskGroups"
      :goals="goalDefinitions"
      :fixed-days-count="3"
      :fixed-center-today="true"
      :show-focus-records="showCalendarFocusLifelog"
      :show-habits="showCalendarHabits"
      :show-task-lifelog="showCalendarTaskLifelog"
      :show-habit-lifelog="showCalendarHabitLifelog"
      :show-records-lifelog="showCalendarRecordsLifelog"
      :display-options="calendarSidebarDisplayOptions"
      :calendar-view-options="calendarHeaderViewOptions"
      :current-calendar-view="currentView"
      @task-date-changed="handleTaskDateChanged"
      @task-color-changed="handleGanttTaskColorChanged"
      @task-date-save-requested="handleCalendarTaskDateSaveRequested"
      @task-click="handleTaskEditClick"
      @task-edit="handleCalendarTaskEdit"
      @task-create-requested="handleCalendarTaskCreateRequested"
      @visible-range-change="handleWeekVisibleRangeChange"
      @calendar-view-change="handleCalendarViewChange"
      @calendar-display-toggle="toggleCalendarDisplayOption"
      @sidebar-collapsed-change="handleCalendarSidebarCollapsedChange"
      @focus-session-contextmenu="handleCalendarFocusSessionContextmenu"
    />
    <PersonalStatsView
      v-if="currentView === 'stats'"
      :tasks="statsViewTasks"
      :task-groups="taskGroups"
      :goal-items="goalItems"
      :source-label="statsViewSourceLabel"
      :document-label="statsViewDocumentLabel"
      @drilldown="handleStatsDrilldown"
      @open-detail="handleStatsDetailOpen"
    />

    <Teleport to="body">
      <div
        v-if="mobileCalendarTaskDrawerVisible && showMobileCalendarTaskDrawerButton"
        class="mobile-calendar-task-drawer-shell"
        :class="{ 'is-dragging': mobileCalendarTaskDrag.active }"
      >
        <div class="mobile-calendar-task-drawer">
          <div class="mobile-calendar-task-drawer-grabber"></div>
          <div class="mobile-calendar-task-drawer-header">
            <div class="mobile-calendar-task-drawer-title">{{ t('kanbanView.taskLibrary') }}</div>
            <button
              type="button"
              class="mobile-calendar-task-drawer-close ariaLabel"
             
              :aria-label="t('kanbanView.closeTaskLibrary')"
              @click="closeMobileCalendarTaskDrawer"
            >
              <Icon name="close" width="14" height="14" />
            </button>
          </div>
          <div class="mobile-calendar-task-drawer-hint">{{ t('kanbanView.mobileDrawerHint') }}</div>
          <div class="mobile-calendar-task-drawer-body">
            <TaskManager
              :enable-mobile-calendar-drag="true"
              :enable-calendar-pointer-drag="true"
              @mobile-calendar-drag-start="handleMobileCalendarTaskDragStart"
              @mobile-calendar-drag-move="handleMobileCalendarTaskDragMove"
              @mobile-calendar-drag-end="handleMobileCalendarTaskDragEnd"
              @mobile-calendar-drag-cancel="cancelMobileCalendarTaskDrag"
            />
          </div>
        </div>
        <div
          v-if="mobileCalendarTaskDrag.active && mobileCalendarTaskDrag.task"
          class="mobile-calendar-task-drag-preview"
          :style="[mobileCalendarTaskDragPreviewStyle, mobileCalendarTaskDragPreviewColorStyle]"
        >
          <div class="mobile-calendar-task-drag-preview-title">{{ mobileCalendarTaskDragTitle }}</div>
          <div v-if="mobileCalendarTaskDragHint" class="mobile-calendar-task-drag-preview-hint">
            {{ mobileCalendarTaskDragHint }}
          </div>
        </div>
      </div>
    </Teleport>

    <TaskModal
      :show="showTaskModal"
      :t="taskModalTranslate"
      :notebooks="taskModalNotebooks"
      :documents="taskModalDocuments"
      :groups="taskGroups"
      :goals="goalDefinitions"
      :default-group-id="taskModalDefaultGroupId"
      :lastSelectedNotebook="taskModalDefaultNotebook"
      :lastSelectedDocument="taskModalDefaultDocument"
      presentation="center"
      @close="showTaskModal = false"
      @manage-groups="openTaskGroupDialog"
      @submit="handleTaskModalCreate"
    />

    <TaskFilterPopover
      ref="kanbanFilterPopoverRef"
      :visible="kanbanFilterPopoverVisible"
      :popover-style="kanbanFilterPopoverStyle"
      :has-active="hasActiveKanbanFilters"
      :sections="kanbanFilterSections"
      @clear="clearKanbanFilters"
      @toggle="handleKanbanFilterToggle"
    />

    <TaskFilterPopover
      ref="tableFilterPopoverRef"
      :visible="tableFilterPopoverVisible"
      :popover-style="tableFilterPopoverStyle"
      :has-active="hasActiveTableFilters"
      :sections="tableFilterSections"
      @clear="clearTableFilters"
      @toggle="handleTableFilterToggle"
    />

    <Teleport to="body">
      <div
        v-if="kanbanBatchMenuVisible"
        ref="kanbanBatchMenuRef"
        class="kanban-batch-context-menu"
        :style="kanbanBatchMenuStyle"
        @contextmenu.prevent
        @mousedown.stop
      >
        <div class="kanban-batch-context-menu-header">
          <span>{{ formatTemplate('kanbanView.selectedCountTemplate', { count: kanbanBatchSelectedCount }) }}</span>
          <button type="button" class="kanban-batch-context-menu-close" :aria-label="t('taskManager.closeEditor')" @click="closeKanbanBatchMenu">×</button>
        </div>
        <button type="button" class="kanban-batch-context-menu-item" @mouseenter="kanbanBatchMenuSubmenu = null; kanbanBatchTagSubmenuAction = null" @click="toggleSelectAllVisibleKanbanTasks">
          {{ allVisibleKanbanTasksSelected ? t('taskManager.cancelSelectAll') : t('kanbanView.selectAllCurrentView') }}
        </button>
        <button type="button" class="kanban-batch-context-menu-item" :disabled="kanbanBatchSelectedCount === 0" @mouseenter="kanbanBatchMenuSubmenu = null; kanbanBatchTagSubmenuAction = null" @click="clearKanbanBatchSelection">
          {{ t('taskManager.clearSelection') }}
        </button>
        <div class="kanban-batch-context-menu-divider"></div>
        <div class="kanban-batch-menu-item-with-submenu" @mouseenter="kanbanBatchMenuSubmenu = 'status'; kanbanBatchTagSubmenuAction = null">
          <button type="button" class="kanban-batch-context-menu-item">
            <span>{{ t('taskManager.status') }}</span><span class="kanban-batch-context-menu-arrow">›</span>
          </button>
          <div v-if="kanbanBatchMenuSubmenu === 'status'" class="kanban-batch-context-submenu">
            <button v-for="option in kanbanBatchStatusOptions.filter(option => option.value)" :key="option.value" type="button" class="kanban-batch-context-menu-item" :disabled="isKanbanBatchApplying" @click="applyKanbanBatchStatusEdit(String(option.value))">
              {{ option.text }}
            </button>
          </div>
        </div>
        <div class="kanban-batch-menu-item-with-submenu" @mouseenter="kanbanBatchMenuSubmenu = 'priority'; kanbanBatchTagSubmenuAction = null">
          <button type="button" class="kanban-batch-context-menu-item">
            <span>{{ t('taskManager.priority') }}</span><span class="kanban-batch-context-menu-arrow">›</span>
          </button>
          <div v-if="kanbanBatchMenuSubmenu === 'priority'" class="kanban-batch-context-submenu">
            <button v-for="option in kanbanBatchPriorityOptions.filter(option => option.value)" :key="option.value" type="button" class="kanban-batch-context-menu-item" :disabled="isKanbanBatchApplying" @click="applyKanbanBatchPriorityEdit(String(option.value))">
              {{ option.text }}
            </button>
          </div>
        </div>
        <div v-for="action in kanbanBatchTagActionOptions" :key="action.value" class="kanban-batch-menu-item-with-submenu" @mouseenter="kanbanBatchMenuSubmenu = null; kanbanBatchTagSubmenuAction = action.value">
          <button type="button" class="kanban-batch-context-menu-item">
            <span>{{ action.text }}</span><span class="kanban-batch-context-menu-arrow">›</span>
          </button>
          <div v-if="kanbanBatchTagSubmenuAction === action.value" class="kanban-batch-context-submenu">
            <button v-for="option in getKanbanBatchTagOptions(action.value)" :key="option.value" type="button" class="kanban-batch-context-menu-item" :disabled="isKanbanBatchApplying" @click="applyKanbanBatchTagEdit(action.value, option.value)">
              {{ option.text }}
            </button>
          </div>
        </div>
        <button type="button" class="kanban-batch-context-menu-item" :disabled="isKanbanBatchApplying" @mouseenter="kanbanBatchMenuSubmenu = null; kanbanBatchTagSubmenuAction = null" @click="clearKanbanBatchTags">
          {{ t('kanbanView.clearBatchTags') }}
        </button>
      </div>
    </Teleport>

    <Teleport to="body">
      <TaskEditorPanelShell
        v-if="kanbanEditorVisible && !calendarDockEditorActive"
        ref="kanbanEditorPanelRef"
        mode="floating"
        :panel-style="kanbanEditorStyle"
        :title="t('taskManager.editTask')"
        :show-pin="!!activeKanbanEditTask"
        :pin-active="isActiveKanbanTaskPinned"
        :show-move="!!activeKanbanEditTask"
        :show-archive="!!activeKanbanEditTask"
        :is-archived="isActiveKanbanTaskArchived"
        :show-delete="!!activeKanbanEditTask"
        :show-focus="!!activeKanbanEditTask"
        :show-urgent="!!activeKanbanEditTask"
        :urgent-active="activeKanbanEditTask?.urgent === true"
        :show-open-content="!!activeKanbanEditTask"
        @panel-mousedown="handleKanbanEditorPanelMouseDown"
        @pin="handleKanbanEditorPinToggle"
        @move="openKanbanTaskMoveDialog"
        @archive="handleKanbanEditorArchiveToggle"
        @delete="handleKanbanEditorDelete"
        @focus="handleKanbanEditorStartFocus"
        @urgent="handleKanbanEditorUrgentToggle"
        @open-content="handleKanbanEditorOpenContent"
        @close="closeKanbanEditor"
      >
        <TaskEditorProtyleBody
          ref="kanbanEditorMountRef"
          variant="floating"
          :show-description-control="!!(activeKanbanEditTask && activeKanbanEditDraft)"
          :description="activeKanbanEditDraft?.description || ''"
          :has-description="kanbanEditorHasDescription"
          :description-active="kanbanEditorQuickPanel === 'description'"
          :description-placeholder="t('taskManager.addTaskDescription')"
          :add-description-label="t('taskManager.addDescription', 'Add description')"
          @open-description="kanbanEditorQuickPanel = 'description'"
          @update:description="handleKanbanEditorDescriptionInput"
          @commit-description="handleKanbanEditorDescriptionCommit"
          @close-description="kanbanEditorQuickPanel = null"
        />
        <TaskEditorMetaPanel
          v-if="activeKanbanEditTask && activeKanbanEditDraft"
          variant="floating"
          :panel="kanbanEditorQuickPanel"
          :start-date="activeKanbanEditDraft.startDate || ''"
          :start-time="activeKanbanEditDraft.startTime || ''"
          :due-date="activeKanbanEditDraft.dueDate || ''"
          :due-time="activeKanbanEditDraft.dueTime || ''"
          :due-text="kanbanEditorDueText"
          :has-due-date="kanbanEditorHasDueDate"
          :description="activeKanbanEditDraft.description || ''"
          :has-description="kanbanEditorHasDescription"
          :group-options="kanbanGroupPickerOptions"
          :goal-options="kanbanGoalPickerOptions"
          :selected-group-id="kanbanEditorSelectedGroupId"
          :selected-tag-ids="kanbanEditorSelectedTagIds"
          :selected-goal-ids="kanbanEditorSelectedGoalIds"
          :group-label="kanbanEditorGroupLabel"
          :reminder-type="activeKanbanEditDraft.reminderType"
          :reminder-custom-time="activeKanbanEditDraft.reminderCustomTime || ''"
          :reminder-text="kanbanEditorReminderText"
          :has-reminder="kanbanEditorHasReminder"
          :status="activeKanbanEditDraft.status"
          :priority="activeKanbanEditDraft.priority || 'none'"
          :repeat-frequency="kanbanEditorRepeatFrequency"
          :repeat-rule="kanbanEditorRepeatRule"
          :group-button-style="kanbanEditorGroupButtonStyle"
          :default-group-chip-color="defaultGroupChipColor"
          :description-placeholder="t('taskManager.addTaskDescription')"
          :show-description-control="false"
          :show-priority-action="true"
          layout="properties"
          @update:panel="kanbanEditorQuickPanel = $event"
          @update:description="handleKanbanEditorDescriptionInput"
          @update-dates="handleKanbanEditorDateFieldsUpdate"
          @select-group="handleKanbanEditorGroupSelect"
          @select-goal="handleKanbanEditorGoalSelect"
          @select-reminder="handleKanbanEditorReminderSelect"
          @select-status="handleKanbanEditorStatusSelect"
          @select-priority="handleKanbanEditorPrioritySelect"
          @save-repeat-rule="handleKanbanEditorRepeatRuleSave"
          @commit-description="handleKanbanEditorDescriptionCommit"
          @manage-groups="openTaskGroupDialog"
          @manage-goals="void openTaskScopeDialog('goals')"
        />
        <div
          v-if="showKanbanTaskMoveDialog"
          class="kanban-task-move-dialog-overlay"
          @click.self="closeKanbanTaskMoveDialog"
        >
          <div class="kanban-task-move-dialog" @click.stop>
            <div class="kanban-task-move-dialog-header">
              <span class="kanban-task-move-dialog-title">{{ t('taskManager.moveTask') }}</span>
              <button
                type="button"
                class="kanban-task-move-dialog-close ariaLabel"
               
                :aria-label="t('common.close')"
                @click.stop="closeKanbanTaskMoveDialog"
              >
                <Icon name="close" width="16" height="16" />
              </button>
            </div>
            <div class="kanban-task-move-dialog-body">
              <div class="kanban-task-move-dialog-field">
                <label>{{ t('taskManager.notebook') }}</label>
                <SySelect
                  :model-value="kanbanMoveSelectedNotebook"
                  :options="kanbanMoveNotebookOptions"
                  @update:model-value="handleKanbanMoveNotebookChange(String($event || ''))"
                />
              </div>
              <div class="kanban-task-move-dialog-field">
                <label>{{ t('taskManager.document') }}</label>
                <SySelect
                  :model-value="kanbanMoveSelectedDocument"
                  :options="kanbanMoveDocumentOptions"
                  @update:model-value="kanbanMoveSelectedDocument = String($event || '')"
                />
              </div>
              <div v-if="kanbanMoveTargetUnchanged" class="kanban-task-move-dialog-hint">
                {{ t('taskManager.alreadyInDocument') }}
              </div>
              <div v-else-if="kanbanMoveDocumentOptions.length === 0" class="kanban-task-move-dialog-hint">
                {{ t('taskManager.noDocumentOptions') }}
              </div>
            </div>
            <div class="kanban-task-move-dialog-footer">
              <button
                type="button"
                class="kanban-task-move-dialog-btn cancel"
                @click.stop="closeKanbanTaskMoveDialog"
              >
                {{ t('common.cancel') }}
              </button>
              <button
                type="button"
                class="kanban-task-move-dialog-btn confirm"
                :disabled="!canSubmitKanbanMove"
                @click.stop="handleKanbanEditorMove"
              >
                {{ isKanbanTaskMoveSubmitting ? t('taskManager.moving') : t('taskManager.move') }}
              </button>
            </div>
          </div>
        </div>
      </TaskEditorPanelShell>
    </Teleport>

    <Teleport :to="calendarDockEditorTeleportTo">
      <Transition
        name="calendar-dock-editor"
        @after-leave="handleCalendarDockEditorAfterLeave"
      >
        <div
          v-if="calendarDockEditorRendered"
          v-show="calendarDockEditorVisible"
          class="calendar-dock-editor-frame"
        >
          <CalendarTaskEditorPanel
            ref="calendarDockEditorPanelRef"
            mode="dock"
            :title="t('taskManager.editTask')"
            :task="activeKanbanEditTask"
            :panel="kanbanEditorQuickPanel"
            :panel-style="calendarDockEditorPanelStyle"
            :show-pin="!!activeKanbanEditTask"
            :pin-active="isActiveKanbanTaskPinned"
            :show-move="!!activeKanbanEditTask"
            :show-archive="!!activeKanbanEditTask"
            :is-archived="isActiveKanbanTaskArchived"
            :show-delete="!!activeKanbanEditTask"
            :show-priority="!!(activeKanbanEditTask && activeKanbanEditDraft)"
            :show-focus="!!activeKanbanEditTask"
            :show-open-content="!!activeKanbanEditTask"
            :background-colors="calendarTaskEditorBackgroundColors"
            :start-date="activeKanbanEditDraft?.startDate || ''"
            :start-time="activeKanbanEditDraft?.startTime || ''"
            :due-date="activeKanbanEditDraft?.dueDate || ''"
            :due-time="activeKanbanEditDraft?.dueTime || ''"
            :due-text="kanbanEditorDueText"
            :has-due-date="kanbanEditorHasDueDate"
            :description="activeKanbanEditDraft?.description || ''"
            :has-description="kanbanEditorHasDescription"
            :group-options="kanbanGroupPickerOptions"
            :goal-options="kanbanGoalPickerOptions"
            :selected-group-id="kanbanEditorSelectedGroupId"
            :selected-tag-ids="kanbanEditorSelectedTagIds"
            :selected-goal-ids="kanbanEditorSelectedGoalIds"
            :group-label="kanbanEditorGroupLabel"
            :reminder-type="activeKanbanEditDraft?.reminderType"
            :reminder-custom-time="activeKanbanEditDraft?.reminderCustomTime || ''"
            :reminder-text="kanbanEditorReminderText"
            :has-reminder="kanbanEditorHasReminder"
            :status="activeKanbanEditDraft?.status || 'pending'"
            :repeat-frequency="kanbanEditorRepeatFrequency"
            :repeat-rule="kanbanEditorRepeatRule"
            :group-button-style="kanbanEditorGroupButtonStyle"
            :default-group-chip-color="defaultGroupChipColor"
            :description-placeholder="t('taskManager.addTaskDescription')"
            @panel-mousedown="handleKanbanEditorPanelMouseDown"
            @pin="handleKanbanEditorPinToggle"
            @move="openKanbanTaskMoveDialog"
            @archive="handleKanbanEditorArchiveToggle"
            @delete="handleKanbanEditorDelete"
            @focus="handleKanbanEditorStartFocus"
            @open-content="handleKanbanEditorOpenContent"
            @close="closeKanbanEditor"
            @set-color="handleCalendarEditorColorSelect"
            @clear-dates="handleCalendarEditorDateClear"
            @quick-update-dates="handleKanbanEditorDateFieldsUpdate"
            @update:panel="kanbanEditorQuickPanel = $event"
            @update:description="handleKanbanEditorDescriptionInput"
            @select-group="handleKanbanEditorGroupSelect"
            @select-goal="handleKanbanEditorGoalSelect"
            @select-reminder="handleKanbanEditorReminderSelect"
            @select-status="handleKanbanEditorStatusSelect"
            @select-priority="handleKanbanEditorPrioritySelect"
            @save-repeat-rule="handleKanbanEditorRepeatRuleSave"
            @commit-description="handleKanbanEditorDescriptionCommit"
            @manage-groups="openTaskGroupDialog"
            @manage-goals="void openTaskScopeDialog('goals')"
          >
            <template #move-dialog>
              <div
                v-if="showKanbanTaskMoveDialog"
                class="kanban-task-move-dialog-overlay"
                @click.self="closeKanbanTaskMoveDialog"
              >
                <div class="kanban-task-move-dialog" @click.stop>
                  <div class="kanban-task-move-dialog-header">
                    <span class="kanban-task-move-dialog-title">{{ t('taskManager.moveTask') }}</span>
                    <button
                      type="button"
                      class="kanban-task-move-dialog-close ariaLabel"
                      :aria-label="t('common.close')"
                      @click.stop="closeKanbanTaskMoveDialog"
                    >
                      <Icon name="close" width="16" height="16" />
                    </button>
                  </div>
                  <div class="kanban-task-move-dialog-body">
                    <div class="kanban-task-move-dialog-field">
                      <label>{{ t('taskManager.notebook') }}</label>
                      <SySelect
                        :model-value="kanbanMoveSelectedNotebook"
                        :options="kanbanMoveNotebookOptions"
                        @update:model-value="handleKanbanMoveNotebookChange(String($event || ''))"
                      />
                    </div>
                    <div class="kanban-task-move-dialog-field">
                      <label>{{ t('taskManager.document') }}</label>
                      <SySelect
                        :model-value="kanbanMoveSelectedDocument"
                        :options="kanbanMoveDocumentOptions"
                        @update:model-value="kanbanMoveSelectedDocument = String($event || '')"
                      />
                    </div>
                    <div v-if="kanbanMoveTargetUnchanged" class="kanban-task-move-dialog-hint">
                      {{ t('taskManager.alreadyInDocument') }}
                    </div>
                    <div v-else-if="kanbanMoveDocumentOptions.length === 0" class="kanban-task-move-dialog-hint">
                      {{ t('taskManager.noDocumentOptions') }}
                    </div>
                  </div>
                  <div class="kanban-task-move-dialog-footer">
                    <button
                      type="button"
                      class="kanban-task-move-dialog-btn cancel"
                      @click.stop="closeKanbanTaskMoveDialog"
                    >
                      {{ t('common.cancel') }}
                    </button>
                    <button
                      type="button"
                      class="kanban-task-move-dialog-btn confirm"
                      :disabled="!canSubmitKanbanMove"
                      @click.stop="handleKanbanEditorMove"
                    >
                      {{ isKanbanTaskMoveSubmitting ? t('taskManager.moving') : t('taskManager.move') }}
                    </button>
                  </div>
                </div>
              </div>
            </template>
          </CalendarTaskEditorPanel>
        </div>
      </Transition>
    </Teleport>

    <div v-if="quickCreateDialog.show" class="quick-create-mask" @click="closeQuickCreateDialog">
      <div class="quick-create-dialog" @click.stop>
        <div class="quick-create-title">
          {{ getQuickCreateDialogTitle(quickCreateDialog.mode) }}
        </div>
        <div class="quick-create-row">
          <label>{{ t('taskManager.notebook') }}</label>
          <SySelect
            :model-value="quickCreateNotebookId"
            @update:model-value="quickCreateNotebookId = $event"
            :options="notebookOptions"
          />
        </div>
        <div class="quick-create-row">
          <label>{{ t('taskManager.document') }}</label>
          <SySelect
            :model-value="quickCreateDocumentId"
            @update:model-value="quickCreateDocumentId = $event"
            :options="quickCreateDocumentOptions"
          />
        </div>
        <input
          v-if="quickCreateDialog.mode === 'heading-task'"
          ref="quickCreateHeadingInputRef"
          v-model="quickCreateDialog.headingTitle"
          class="quick-create-input"
          type="text"
          :placeholder="t('kanbanView.enterHeadingName')"
          @keydown.enter.prevent="submitQuickCreateTask"
          @keydown.esc.prevent="closeQuickCreateDialog"
        />
        <input
          ref="quickCreateInputRef"
          v-model="quickCreateDialog.title"
          class="quick-create-input"
          type="text"
          :placeholder="getQuickCreateTaskPlaceholder(quickCreateDialog.mode)"
          @keydown.enter.prevent="submitQuickCreateTask"
          @keydown.esc.prevent="closeQuickCreateDialog"
        />
        <div class="quick-create-actions">
          <button class="quick-create-btn cancel" @click="closeQuickCreateDialog">{{ t('common.cancel') }}</button>
          <button class="quick-create-btn confirm" @click="submitQuickCreateTask">{{ t('kanbanView.create') }}</button>
        </div>
      </div>
    </div>
    <TaskScopeDialog
      :show="showTaskScopeDialog"
      :notebooks="notebooks"
      :excluded-notebook-ids="excludedNotebookIds"
      :show-scope-tab="true"
      :auto-recognize-task-date="autoRecognizeTaskDate"
      :date-recognition-keywords="userSettings.taskManager.dateRecognitionKeywords"
      :global-date-recognizing="isGlobalDateRecognitionRunning"
      :task-completion-sound-enabled="taskCompletionSoundEnabled"
      :show-document-group-notebook-path="showDocumentGroupNotebookPath"
      :show-extra="false"
      :initial-tab="taskScopeDialogInitialTab"
      :document-groups="documentGroups"
      :document-group-documents="documentGroupDialogDocuments"
      :all-document-group-documents="allDocumentGroupDocuments"
      :documents-refreshing="taskScopeDocumentsRefreshing"
      :goals="goalDefinitions"
      :goal-documents="kanbanGoalDocuments"
      :goal-tasks="tasks"
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
    <div
      v-if="documentTabContextMenu"
      ref="documentTabContextMenuRef"
      class="document-tab-context-menu"
      :style="documentTabContextMenuStyle"
      @click.stop
    >
      <div class="document-tab-context-menu-title">{{ documentTabContextMenu.text }}</div>
      <button
        type="button"
        class="document-tab-context-menu-trigger"
        @click="void showSiblingDocumentsFromTabMenu()"
      >
        {{ t('kanbanView.showSiblingDocuments') }}
      </button>
      <div class="document-tab-context-menu-submenu">
        <button type="button" class="document-tab-context-menu-trigger">
          <span>{{ t('kanbanView.addToDocumentGroup') }}</span>
          <span class="document-tab-context-menu-arrow" aria-hidden="true">›</span>
        </button>
        <div class="document-tab-context-menu-panel">
          <div v-if="sortedDocumentGroups.length > 0" class="document-tab-context-menu-list">
            <button
              v-for="group in sortedDocumentGroups"
              :key="group.id"
              type="button"
              class="document-tab-context-menu-item"
              :class="{ active: documentTabContextGroupIds.includes(group.id) }"
              @click="void toggleDocumentTabGroupAssignment(group.id)"
            >
              <span>{{ group.name }}</span>
              <span v-if="documentTabContextGroupIds.includes(group.id)" class="task-group-menu-check">
                <Icon name="check" width="12" height="12" />
              </span>
            </button>
          </div>
          <div v-else class="document-tab-context-menu-empty">{{ t('documentGroup.emptyGroups') }}</div>
          <button
            type="button"
            class="document-tab-context-menu-manage"
            @click="void openDocumentGroupManagerFromTabMenu()"
          >
            {{ t('kanbanView.manageGroups') }}
          </button>
        </div>
      </div>
      <div class="document-tab-context-menu-submenu">
        <button type="button" class="document-tab-context-menu-trigger">
          <span>{{ t('kanbanView.addToGoal') }}</span>
          <span class="document-tab-context-menu-arrow" aria-hidden="true">›</span>
        </button>
        <div class="document-tab-context-menu-panel">
          <div v-if="goalDefinitions.length > 0" class="document-tab-context-menu-list">
            <button
              v-for="goal in goalDefinitions"
              :key="goal.id"
              type="button"
              class="document-tab-context-menu-item"
              :class="{ active: documentTabContextGoalIds.includes(goal.id) }"
              @click="void toggleDocumentTabGoalAssignment(goal.id)"
            >
              <span>{{ goal.name || t('taskManager.untitledGoal') }}</span>
              <span v-if="documentTabContextGoalIds.includes(goal.id)" class="task-group-menu-check">
                <Icon name="check" width="12" height="12" />
              </span>
            </button>
          </div>
          <div v-else class="document-tab-context-menu-empty">{{ t('goalManager.emptyGoals') }}</div>
          <button
            type="button"
            class="document-tab-context-menu-manage"
            @click="void openGoalManagerFromTabMenu()"
          >
            {{ t('goalManager.title') }}
          </button>
        </div>
      </div>
    </div>
    <TaskGroupDialog
      :show="showTaskGroupDialog"
      :groups="taskGroups"
      :auto-add="taskGroupDialogAutoAdd"
      :include-none-option="true"
      :order-ids="kanbanGroupColumnOrder"
      @close="closeTaskGroupDialog"
      @save="handleTaskGroupSave"
    />
    <HabitDocBindDialog
      :show="calendarFocusBindDialogVisible"
      :doc-id-input="calendarFocusBindDocInput"
      @update:docIdInput="calendarFocusBindDocInput = $event"
      @close="closeCalendarFocusBindDialog"
      @clear="handleCalendarFocusBindClear"
      @confirm="handleCalendarFocusBindConfirm"
    />
    <HabitCheckinNoteDialog
      :show="calendarFocusNoteDialogVisible"
      :habit-name="calendarFocusNoteHabit?.name || ''"
      :habit-emoji="calendarFocusNoteHabit?.emoji || ''"
      :is-edit="true"
      :initial-note="''"
      :focus-notes="calendarFocusNoteItems"
      :has-note-doc="!!calendarFocusNoteHabit?.noteDocId"
      @close="closeCalendarFocusNoteDialog"
      @confirm="handleCalendarFocusNoteConfirm"
      @bind-doc="handleCalendarFocusNoteBindDoc"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick, type Ref } from 'vue';
import { Protyle, getFrontend } from 'siyuan';
import { TaskRepository, Task, SubTask, TaskGroup, buildTaskStatusAttrs, setBlockAttrs, pushMsg, openBlockById, sql, getBlockKramdown, getBlockAttrs, getBlockDOM, loadTaskGroups, saveTaskGroups, moveBlock, appendBlock, updateBlock, insertBlock, deleteBlock, createDocWithMd, createDailyNote, getHPathByID, getIDsByHPath, listDocsByPath, resolveTaskRepeatMaterializeOptions, getHabits, saveHabits, type Habit, type TaskRepeatWindow } from '../api';
import {
  extractDocumentIconFromBlockRow,
  extractDocumentIconFromDom,
  normalizeDocumentIconValue
} from '@/utils/documentIcon';
import {
  TASK_BACKGROUND_COLOR_OPTIONS,
  TASK_GROUP_NONE_ID,
  buildTaskGroupOptions,
  getTaskGroupColorValue,
  normalizeTaskGroupOrderIds
} from '@/utils/taskGroupShared';
import { buildTaskPriorityOptions } from '@/utils/taskPriority';
import {
  buildTaskStatusFilterOptions,
  buildTaskStatusSelectOptions,
  getTaskStatusLabel,
  type TaskStatusValue
} from '@/utils/taskStatus';
import { updateTaskMarkdown, skipTaskTemporarily } from '../utils/taskHelpers';
import { useTaskFilters } from '../composables/useTaskFilters';
import { useUserSettings } from '@/composables/useUserSettings';
import { useNotebooks, stripHtml } from '@/composables/useTaskCommon';
import {
  buildTaskDocumentPathLookup,
  isDocumentPathInScope,
  taskMatchesDocumentScope
} from '@/utils/taskDocumentScope';
import { eventBus, Events, type TaskViewSwitchRequest } from '../utils/eventBus';
import {
  publishTaskChange,
  publishTaskAttributeChange,
  type TaskChangePayload
} from '@/utils/taskChangeCoordinator';
import { syncTaskEditorDraftFromAttributeChanges } from '@/utils/taskEditorDraftSync';
import { createTaskStatusAttributeSync } from '@/utils/taskStatusAttributeSync';
import { getCrdtRepository, useCrdtTasks } from '@/crdtStore';
import { createBlockIdBatchQueue } from '@/utils/blockIdBatchQueue';
import { getTaskElementFromDoc, parseTaskCompleted } from '@/utils/taskDom';
import {
  applyRepeatRuleOptimisticToTasks,
  getDocumentCreationSortKey,
  loadRootDocumentMetadata,
  normalizeNotebookIds,
  resolveDocumentDisplayName,
  type RootDocumentMetadata,
  type RepeatRulePayload
} from '@/utils/taskViewShared';
import {
  buildLiveTaskDomOrderMap,
  compareTaskCreatedAtDesc,
  compareTaskDocumentSortKey
} from '@/utils/taskSortShared';
import { hasVisibleTaskTitle } from '@/utils/taskVisibility';
import { getTaskQuadrant, TASK_QUADRANT_ORDER, type TaskQuadrantId } from '@/utils/taskQuadrant';
import { getRepeatSeriesForTask, notifyRepeatChanged, rebuildAffectedRepeatTasks, updateRepeatSeriesDates, type RepeatFrequency, type RepeatRule, type RepeatRuleInput } from '@/repeatRepository';
import { isRepeatTask as isRepeatTaskEntity } from '@/utils/repeatTaskUtils';
import { persistTaskBackgroundColor } from '@/utils/taskBackgroundColorPersistence';
import { isKernelRpcUnavailable, refreshKernelTaskIndex } from '@/kernelRpc';
import {
  getTaskHeadingGroupMeta,
  resolveTaskHeadingDropTarget,
  resolveStoredTaskViewGroupMode,
  resolveTaskHeadingGroups,
  type TaskHeadingDropTarget,
  type TaskHeadingGroupMeta,
  type TaskViewGroupMode
} from '@/utils/taskGrouping';
import Icon from '@/components/Icon.vue';
import SourceFilterSelect from '@/components/SourceFilterSelect.vue';
import CalendarTaskEditorPanel, { type CalendarTaskEditorColorOption } from '@/components/CalendarTaskEditorPanel.vue';
import TaskCard from '@/components/TaskCard.vue';
import TaskModal, { type Notebook as TaskModalNotebook, type Document as TaskModalDocument } from '@/components/TaskModal.vue';
import TaskEditorMetaPanel from '@/components/TaskEditorMetaPanel.vue';
import TaskEditorPanelShell from '@/components/TaskEditorPanelShell.vue';
import TaskEditorProtyleBody from '@/components/TaskEditorProtyleBody.vue';
import { useTaskFilterState } from '@/composables/useTaskFilterState';
import { useMobileTextInputActivation } from '@/composables/useMobileTextInputActivation';
import { useI18n } from '@/composables/useI18n';
import SySelect from '@/components/SiyuanTheme/SySelect.vue';
import KanbanColumnTitlePrefix from '@/components/KanbanColumnTitlePrefix.vue';
import TableView from '@/components/TableView.vue';
import GanttView from '@/components/GanttView.vue';
import MonthView from '@/components/MonthView.vue';
import WeekView from '@/components/WeekView.vue';
import PersonalStatsView from '@/components/PersonalStatsView.vue';
import TaskManager from '@/components/TaskManager.vue';
import TaskFilterPopover from '@/components/TaskFilterPopover.vue';
import TaskScopeDialog, { type TaskScopeDialogSavePayload, type TaskScopeDisplayOption } from '@/components/TaskScopeDialog.vue';
import { taskViewSwitcherDisplayOptions } from '@/utils/taskViewSwitcher';
import TaskGroupDialog from '@/components/TaskGroupDialog.vue';
import HabitDocBindDialog from '@/components/HabitDocBindDialog.vue';
import HabitCheckinNoteDialog from '@/components/HabitCheckinNoteDialog.vue';
import { useGoals } from '@/composables/useGoals';
import { getPinchDockElement, openHabitTrackerFocusTimer, openHabitTrackerPanel, openPinchDockView, usePlugin } from '@/main';
import { resolveGroupColorCss, resolveGroupColorLayerCss, resolveGroupTextColor } from '@/utils/groupColor';
import { formatDate } from '@/composables/useDateUtils';
import { formatMonthDay } from '@/utils/dateHelpers';
import { createTaskFocusTarget } from '@/utils/focusTimerTarget';
import {
  buildTaskReminderAttrs,
  getTaskReminderLabel,
  normalizeTaskReminderSelection,
  type TaskReminderSelection,
  type TaskReminderType
} from '@/utils/taskReminder';
import { playTaskCompletionSound } from '@/utils/completionSound';
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
import { useHabitCheckinLog, type HabitFocusNoteItem } from '@/composables/useHabitCheckinLog';
import type { FocusCalendarEvent } from '@/utils/focusCalendar';
import { PINCH_DAILY_NOTE_OPTION_ID, PINCH_INBOX_OPTION_ID, PINCH_INBOX_PATH } from '@/utils/pinchInbox';
import {
  applyTaskTagBatchAction,
  areTaskTagIdsEqual,
  buildTaskTagAttrs,
  buildTaskTagState,
  filterKnownTaskTagIds,
  matchesTaskTagFilter,
  removeTaskTags,
  resolveTaskTagIds,
  setPrimaryTaskTag,
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

const FLOATING_FOCUS_STORAGE_KEY = 'pinch-floating-focus-enabled';
const DESCENDANT_DOCUMENT_ICON_SVG = '<svg t="1781940701340" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="18335" width="200" height="200"><path d="M256 130.688c22.08 0 40 17.92 40 40v163.84h265.728a140.8 140.8 0 1 1 0 80H296v106.88A216 216 0 0 0 512 737.536h49.728a140.8 140.8 0 1 1 0 80H512a296 296 0 0 1-296-296V375.424a38.784 38.784 0 0 1 0-1.792V170.688c0-22.08 17.92-40 40-40z m440.704 183.04a60.736 60.736 0 1 0 0 121.536 60.736 60.736 0 0 0 0-121.472z m0 403.008a60.736 60.736 0 1 0 0 121.472 60.736 60.736 0 0 0 0-121.472z" p-id="18336"></path></svg>';
const { t } = useI18n();
const {
  writeCheckinLogToDoc,
  getHabitFocusNoteItems
} = useHabitCheckinLog();
const props = withDefaults(defineProps<{
  showDialogCloseButton?: boolean;
}>(), {
  showDialogCloseButton: false
});
const emit = defineEmits<{
  dialogClose: [];
}>();
const { data: userSettings, loadSettings, updateSettings } = useUserSettings();
const {
  goalDefinitions,
  goalDocuments,
  goalItems,
  goalsLoading,
  loadGoalsData,
  refreshGoalDocuments,
  saveGoalDefinitions
} = useGoals();

const formatTemplate = (key: string, values: Record<string, string | number>): string => {
  return Object.entries(values).reduce(
    (result, [name, value]) => result.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value)),
    t(key)
  );
};

const crdtRepo = getCrdtRepository();
const { tasks, updateTasks, syncFromSQL } = useCrdtTasks();
type LocalTaskFieldOverride = {
  values: Partial<Task>;
  expiresAt: number;
};
const localTaskFieldOverrides = new Map<string, LocalTaskFieldOverride>();
const localClearedRepeatSeriesIds = new Map<string, number>();
let isMobileFrontend = false;
try {
  const frontend = getFrontend();
  isMobileFrontend = frontend === 'mobile' || frontend === 'browser-mobile';
} catch {
  isMobileFrontend = false;
}
const loading = ref(false);
const calendarLifelogTasks = ref<Task[]>([]);
let calendarLifelogLoadRequestId = 0;
const showTaskScopeDialog = ref(false);
const taskScopeDocumentsRefreshing = ref(false);
type TaskScopeDialogTab = 'scope' | 'task-settings' | 'pomodoro-settings' | 'document-groups' | 'goals' | 'display';
const taskScopeDialogInitialTab = ref<TaskScopeDialogTab>('task-settings');
const isGlobalDateRecognitionRunning = ref(false);
const showTaskGroupDialog = ref(false);
const taskGroupDialogAutoAdd = ref(false);
const excludedNotebookIds = ref<string[]>([]);
const skipSet = new Set<string>();
const kanbanGroupModeOptions = [
  { value: 'status', text: t('taskManager.groupByStatus') },
  { value: 'date', text: t('taskManager.groupByDate') },
  { value: 'document', text: t('taskManager.groupByDocument') },
  { value: 'group', text: t('taskManager.groupByTag') },
  { value: 'heading', text: t('taskManager.groupByHeading') }
] as const;
const tableGroupModeOptions = [
  { value: 'status', text: t('taskManager.groupByNone') },
  { value: 'date', text: t('taskManager.groupByDate') },
  { value: 'document', text: t('taskManager.groupByDocument') },
  { value: 'group', text: t('taskManager.groupByTag') },
  { value: 'heading', text: t('taskManager.groupByHeading') }
] as const;
type TaskViewMode = TaskViewSwitcherId;
type TaskLoadMode = 'full' | 'light-with-repeats' | 'light-base';
type CalendarTaskViewMode = Extract<TaskViewMode, 'month' | 'week' | 'three-day' | 'day'>;
type GanttGroupMode = 'goal' | 'document' | 'none';
type StatsDrilldownPayload = {
  title: string;
  target?: 'table' | 'archive-table';
  statuses?: Task['status'][];
  due?: KanbanTaskDueFilterKey;
  updated?: KanbanTaskUpdateFilterKey;
  includeCompleted?: boolean;
};
type StatsDetailPayload = {
  target: 'habit-total' | 'habit-detail' | 'reward' | 'goal';
  habitId?: string;
  goalId?: string;
  rewardEntryId?: string;
};
type DocumentFilterOption = {
  value: string;
  text: string;
  notebookId?: string;
  notebookName?: string;
};
type DocumentTabScope = {
  id: string;
  name: string;
  notebookId: string;
  path?: string;
};
type DocumentScopeTreeDocument = DocumentTabScope & {
  parentId?: string;
  storagePath?: string;
};
type DocumentScopeTreeRow = {
  key: string;
  depth: number;
  document: DocumentScopeTreeDocument;
};
type DocumentTabContextMenuState = {
  x: number;
  y: number;
  value: string;
  text: string;
  documentId: string;
  notebookId: string;
  notebookName: string;
};
type ExternalCalendarDropPoint = {
  clientX: number;
  clientY: number;
};
type MobileCalendarDragPayload = {
  task: Task;
  clientX: number;
  clientY: number;
};
type MobileCalendarDropController = {
  updateExternalTaskDrag: (point: ExternalCalendarDropPoint, task?: Task) => { label: string } | null;
  clearExternalTaskDrag: () => void;
  dropExternalTask: (task: Task, point: ExternalCalendarDropPoint) => Promise<boolean>;
};
type MobileCalendarDragSession = {
  active: boolean;
  task: Task | null;
  clientX: number;
  clientY: number;
};
type ViewSwitcherOption = { value: TaskViewMode; text: string; icon: string };
type PrimaryViewSwitcherOption = ViewSwitcherOption & { id: string; isCalendarGroup?: boolean };
type CalendarHeaderViewOption = { value: CalendarTaskViewMode; label: string; title: string };

const baseViewSwitcherOptions: ViewSwitcherOption[] = [
  { value: 'kanban', text: t('kanbanView.viewKanban'), icon: 'kanban' },
  { value: 'list', text: t('kanbanView.viewList'), icon: 'card' },
  { value: 'table', text: t('kanbanView.viewTable'), icon: 'table' },
  { value: 'quadrant', text: t('kanbanView.viewQuadrant'), icon: 'quadrant' },
  { value: 'gantt', text: t('kanbanView.viewGantt'), icon: 'gantt' },
  { value: 'month', text: t('kanbanView.viewMonth'), icon: 'month' },
  { value: 'week', text: t('kanbanView.viewWeek'), icon: 'week' },
  { value: 'three-day', text: t('kanbanView.viewThreeDay'), icon: 'threeDay' },
  { value: 'day', text: t('kanbanView.viewDay'), icon: 'day' },
  { value: 'archive-table', text: t('kanbanView.viewArchive'), icon: 'archive' },
  { value: 'stats', text: t('kanbanView.viewStats'), icon: 'stats' }
];
const viewSwitcherOptions = computed(() => {
  const hidden = new Set(userSettings.kanban.hiddenViewSwitcherIds || []);
  const visible = baseViewSwitcherOptions.filter(option => !hidden.has(option.value));
  return visible.length > 0 ? visible : baseViewSwitcherOptions;
});
const calendarViewOrder: CalendarTaskViewMode[] = ['month', 'week', 'three-day', 'day'];
const calendarShortLabels: Record<CalendarTaskViewMode, string> = {
  month: t('kanbanView.calendarShortMonth'),
  week: t('kanbanView.calendarShortWeek'),
  'three-day': t('kanbanView.calendarShortThreeDay'),
  day: t('kanbanView.calendarShortDay')
};
const calendarHeaderViewOptions = computed<CalendarHeaderViewOption[]>(() =>
  calendarViewOrder
    .map(view => {
      const option = viewSwitcherOptions.value.find(item => item.value === view);
      return option
        ? { value: view, label: calendarShortLabels[view], title: option.text }
        : null;
    })
    .filter((option): option is CalendarHeaderViewOption => option !== null)
);
const primaryViewSwitcherOptions = computed<PrimaryViewSwitcherOption[]>(() => {
  const options: PrimaryViewSwitcherOption[] = [];
  let calendarGroupAdded = false;

  for (const option of viewSwitcherOptions.value) {
    if (isCalendarTaskViewMode(option.value)) {
      if (!calendarGroupAdded) {
        const calendarEntryView = getCalendarEntryView();
        if (calendarEntryView) {
          options.push({
            id: 'calendar',
            value: calendarEntryView,
            text: t('kanbanView.viewCalendar'),
            icon: 'calendar',
            isCalendarGroup: true
          });
          calendarGroupAdded = true;
        }
      }
      continue;
    }
    options.push({ ...option, id: option.value });
  }

  return options;
});
const taskScopeViewOptions = computed<TaskScopeDisplayOption[]>(() =>
  taskViewSwitcherDisplayOptions.map(({ labelKey, ...option }) => ({ ...option, label: t(labelKey) }))
);
const taskScopeSidebarSectionOptions = computed<Array<{ id: SidebarSectionId; label: string }>>(() => [
  { id: 'week-dates', label: t('taskScopeDialog.sidebarWeekDates') },
  { id: 'habit-list', label: t('taskScopeDialog.sidebarHabitList') },
  { id: 'stand-container', label: t('taskScopeDialog.sidebarStandContainer') }
]);

function getDocumentTabVisibilityLabel(hidden: boolean): string {
  return hidden ? t('kanbanView.showDocumentTab') : t('kanbanView.hideDocumentTab');
}

function getColumnBatchSelectionLabel(allSelected: boolean): string {
  return allSelected ? t('kanbanView.clearColumnSelection') : t('kanbanView.selectColumn');
}

function getColumnTitlePlaceholder(column: { type: string }): string {
  return column.type === 'group' ? t('kanbanView.enterTagName') : t('kanbanView.enterHeadingName');
}

function getEditColumnTitleLabel(column: { type: string }): string {
  return column.type === 'group' ? t('kanbanView.editTagName') : t('kanbanView.editHeadingTitle');
}

function getColumnTitleRequiredMessage(column: { type: string }): string {
  return column.type === 'group' ? t('kanbanView.enterTagName') : t('kanbanView.enterHeadingName');
}

function getQuickCreateDialogTitle(mode: 'task' | 'heading-task'): string {
  return mode === 'heading-task' ? t('kanbanView.newHeadingAndTask') : t('taskManager.newTask');
}

function getQuickCreateTaskPlaceholder(mode: 'task' | 'heading-task'): string {
  return mode === 'heading-task' ? t('kanbanView.enterFirstTaskTitle') : t('kanbanView.enterTaskTitle');
}

function getCurrentGroupLabel(label?: string): string {
  return (label || t('kanbanView.currentGroup')).trim() || t('kanbanView.currentGroup');
}

function getCurrentColumnLabel(title?: string): string {
  return (title || t('kanbanView.currentColumn')).trim() || t('kanbanView.currentColumn');
}

function getArchiveGroupConfirmMessage(label: string, totalCount: number): string {
  return formatTemplate('kanbanView.confirmArchiveGroupTasksTemplate', { label, totalCount });
}

function getArchivedGroupSuccessMessage(label: string, totalCount: number): string {
  return formatTemplate('kanbanView.archivedGroupTasksTemplate', { label, totalCount });
}

function getArchiveColumnConfirmMessage(title: string, totalCount: number): string {
  return formatTemplate('kanbanView.confirmArchiveColumnTasksTemplate', { title, totalCount });
}

function getArchivedColumnSuccessMessage(title: string, totalCount: number): string {
  return formatTemplate('kanbanView.archivedColumnTasksTemplate', { title, totalCount });
}

function getArchivePartialMessage(successCount: number, totalCount: number): string {
  return formatTemplate('kanbanView.archivePartialTemplate', { successCount, totalCount });
}
function normalizeTaskViewMode(value: unknown): TaskViewMode {
  if (
    value === 'kanban'
    || value === 'list'
    || value === 'table'
    || value === 'quadrant'
    || value === 'archive-table'
    || value === 'stats'
    || value === 'gantt'
    || value === 'month'
    || value === 'week'
    || value === 'three-day'
    || value === 'day'
  ) {
    return value;
  }
  return 'table';
}

function isCalendarTaskViewMode(view: TaskViewMode): view is CalendarTaskViewMode {
  return view === 'month' || view === 'week' || view === 'day' || view === 'three-day';
}

function getCalendarEntryView(): CalendarTaskViewMode | null {
  if (
    isCalendarTaskViewMode(currentView.value)
    && viewSwitcherOptions.value.some(option => option.value === currentView.value)
  ) {
    return currentView.value;
  }
  if (
    viewSwitcherOptions.value.some(option => option.value === lastCalendarView.value)
  ) {
    return lastCalendarView.value;
  }
  return calendarViewOrder.find(view =>
    viewSwitcherOptions.value.some(option => option.value === view)
  ) || null;
}

function isPrimaryViewOptionActive(option: PrimaryViewSwitcherOption): boolean {
  return option.isCalendarGroup ? isCalendarTaskViewMode(currentView.value) : currentView.value === option.value;
}

function prepareForTaskViewChange(nextView: TaskViewMode): void {
  closeDocumentTabsDropdown();
  closeMobileViewSwitcher();
  closeDocumentTabContextMenu();
  closeTaskViewGroupMenu();
  closeCalendarDisplayMenu();
  closeKanbanFilterPopover();
  closeTableFilterPopover();
  closeMobileTableSearch(true);
  closeMobileCalendarTaskDrawer();
  cancelMobileCalendarTaskDrag();
  cancelColumnTitleEdit(true);
  clearGroupColumnReorderDragState();
  resetKanbanBatchLasso();
  removeKanbanBatchLassoListeners();
  if (quickCreateDialog.value.show) {
    closeQuickCreateDialog();
  }
  if (currentView.value !== nextView && kanbanEditorVisible.value) {
    closeKanbanEditor();
  }
  if (kanbanMetricsRaf !== null) {
    cancelAnimationFrame(kanbanMetricsRaf);
    kanbanMetricsRaf = null;
  }
  if (listViewMetricsRaf !== null) {
    cancelAnimationFrame(listViewMetricsRaf);
    listViewMetricsRaf = null;
  }
  pendingKanbanMetricColumnIds.clear();
}

function selectPrimaryView(option: PrimaryViewSwitcherOption): void {
  let nextView: TaskViewMode | null = null;
  if (option.isCalendarGroup) {
    const calendarEntryView = getCalendarEntryView();
    if (calendarEntryView) {
      nextView = calendarEntryView;
    }
  } else {
    nextView = option.value;
  }
  if (!nextView) {
    return;
  }
  prepareForTaskViewChange(nextView);
  if (currentView.value !== nextView) {
    currentView.value = nextView;
  }
}

function handleCalendarViewChange(view: CalendarTaskViewMode): void {
  if (viewSwitcherOptions.value.some(option => option.value === view)) {
    lastCalendarView.value = view;
    prepareForTaskViewChange(view);
    if (currentView.value !== view) {
      currentView.value = view;
    }
  }
}

function handleCalendarSidebarCollapsedChange(collapsed: boolean): void {
  calendarSidebarCollapsed.value = collapsed;
  void updateSettings('kanban', { calendarSidebarCollapsed: collapsed });
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function buildTaskRepeatWindow(start: Date, end: Date): TaskRepeatWindow {
  const normalizedStart = getStartOfDay(start);
  const normalizedEnd = getStartOfDay(end);
  if (normalizedStart.getTime() <= normalizedEnd.getTime()) {
    return {
      startDate: formatDate(normalizedStart),
      endDate: formatDate(normalizedEnd)
    };
  }
  return {
    startDate: formatDate(normalizedEnd),
    endDate: formatDate(normalizedStart)
  };
}

function resolveDefaultRepeatWindowForView(view: CalendarTaskViewMode): TaskRepeatWindow {
  const today = getStartOfDay(new Date());
  if (view === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    const mondayOffset = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - mondayOffset);
    return buildTaskRepeatWindow(start, addDays(start, 41));
  }
  if (view === 'week') {
    const start = getStartOfWeekMonday(today);
    return buildTaskRepeatWindow(start, addDays(start, 6));
  }
  if (view === 'three-day') {
    const start = addDays(today, -1);
    return buildTaskRepeatWindow(start, addDays(start, 2));
  }
  return buildTaskRepeatWindow(today, today);
}

function areTaskRepeatWindowsEqual(
  first: TaskRepeatWindow | null,
  second: TaskRepeatWindow | null
): boolean {
  if (!first || !second) {
    return first === second;
  }
  return first.startDate === second.startDate && first.endDate === second.endDate;
}

function doesTaskRepeatWindowCover(
  available: TaskRepeatWindow | null,
  requested: TaskRepeatWindow | null
): boolean {
  if (!requested) {
    return !available;
  }
  if (!available) {
    return false;
  }
  return available.startDate <= requested.startDate && available.endDate >= requested.endDate;
}

function isTaskLoadWindowSatisfied(
  available: TaskRepeatWindow | null,
  requested: TaskRepeatWindow | null
): boolean {
  return doesTaskRepeatWindowCover(available, requested);
}

function resolveTaskLoadModeForView(view: TaskViewMode): TaskLoadMode {
  if (view === 'stats') {
    return 'light-base';
  }
  if (view === 'month' || view === 'week' || view === 'day' || view === 'three-day') {
    return 'light-with-repeats';
  }
  return 'full';
}

function getTaskLoadModeRank(mode: TaskLoadMode): number {
  switch (mode) {
    case 'full':
      return 2;
    case 'light-with-repeats':
      return 1;
    default:
      return 0;
  }
}

function isTaskLoadModeSatisfied(
  available: TaskLoadMode | null,
  requested: TaskLoadMode
): boolean {
  if (!available) {
    return false;
  }
  return getTaskLoadModeRank(available) >= getTaskLoadModeRank(requested);
}

function shouldPrefillWithLightTasks(mode: TaskLoadMode): boolean {
  return mode === 'full';
}

function parseTaskWindowDate(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }
  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getCalendarLoadBufferDays(view: TaskViewMode): number {
  if (view === 'month') {
    return 42;
  }
  if (view === 'week') {
    return 21;
  }
  if (view === 'three-day' || view === 'day') {
    return 14;
  }
  return 0;
}

function expandRepeatWindowForCalendarLoad(
  view: TaskViewMode,
  repeatWindow: TaskRepeatWindow | null
): TaskRepeatWindow | null {
  if (!isCalendarTaskViewMode(view) || !repeatWindow) {
    return repeatWindow;
  }
  const bufferDays = getCalendarLoadBufferDays(view);
  if (bufferDays <= 0) {
    return repeatWindow;
  }
  const start = parseTaskWindowDate(repeatWindow.startDate);
  const end = parseTaskWindowDate(repeatWindow.endDate);
  if (!start || !end) {
    return repeatWindow;
  }
  return buildTaskRepeatWindow(addDays(start, -bufferDays), addDays(end, bufferDays));
}

function buildTaskFetchOptionsForLoadMode(mode: TaskLoadMode, repeatWindow: TaskRepeatWindow | null = null) {
  if (mode === 'light-base') {
    return {
      useLiveDom: false,
      detailLevel: 'light' as const,
      materializeRepeats: false
    };
  }
  if (mode === 'light-with-repeats') {
    return {
      useLiveDom: false,
      detailLevel: 'light' as const,
      repeatWindow: repeatWindow ?? undefined,
      constrainBaseTasksToRepeatWindow: true
    };
  }
  return {
    useLiveDom: false,
    detailLevel: 'full' as const,
    repeatWindow: repeatWindow ?? undefined,
    includeRepeatTemplateDate: true
  };
}

function mergeTasksById(primaryTasks: Task[], secondaryTasks: Task[]): Task[] {
  const merged = new Map<string, Task>();
  for (const task of secondaryTasks) {
    merged.set(task.id, task);
  }
  for (const task of primaryTasks) {
    merged.set(task.id, task);
  }
  return Array.from(merged.values());
}

function hasTaskCompletionRecord(task: Task): boolean {
  return task.status === 'completed'
    || (typeof task.completedAt === 'string' && task.completedAt.trim().length > 0);
}

function matchesCalendarLifelogTask(
  task: Task,
  sourceValue: string,
  documentId: string
): boolean {
  if (!isTaskIncludedByNotebookScope(task)) return false;
  if (task.type !== 'block') return false;
  if (task.isVirtual === true) return false;
  if (!hasTaskCompletionRecord(task)) return false;
  return matchesTaskBySourceAndDocument(task, sourceValue, documentId);
}

async function ensureCalendarLifelogTasksLoaded(forceRefresh: boolean = false): Promise<void> {
  const requestId = ++calendarLifelogLoadRequestId;
  try {
    const allTasks = await TaskRepository.getAllTasks(
      !forceRefresh,
      { includeArchived: true },
      {
        useLiveDom: false,
        detailLevel: 'light',
        materializeRepeats: false
      }
    );
    if (requestId !== calendarLifelogLoadRequestId) {
      return;
    }
    if (
      !forceRefresh
      && calendarLifelogTasks.value.length > 0
      && allTasks.length < calendarLifelogTasks.value.length
    ) {
      return;
    }
    calendarLifelogTasks.value = filterTasksByNotebookScope(allTasks);
  } catch (error) {
    console.warn('[KanbanView] Failed to load calendar lifelog tasks:', error);
  }
}

function syncCalendarLifelogTask(task: Task): void {
  if (!task?.id || task.type !== 'block' || task.isVirtual === true) {
    return;
  }
  const nextTask = { ...task };
  const taskIndex = calendarLifelogTasks.value.findIndex(item => item.id === task.id);
  if (taskIndex === -1) {
    calendarLifelogTasks.value = [...calendarLifelogTasks.value, nextTask];
    return;
  }
  calendarLifelogTasks.value = [
    ...calendarLifelogTasks.value.slice(0, taskIndex),
    {
      ...calendarLifelogTasks.value[taskIndex],
      ...nextTask
    },
    ...calendarLifelogTasks.value.slice(taskIndex + 1)
  ];
}

function removeCalendarLifelogTaskByBlockId(blockId: string): void {
  if (!blockId) {
    return;
  }
  calendarLifelogTasks.value = calendarLifelogTasks.value.filter(task => task.blockId !== blockId);
}

function normalizeCalendarTaskDate(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 10) : '';
}

function doesTaskIntersectRepeatWindow(task: Task, repeatWindow: TaskRepeatWindow): boolean {
  const startDate = normalizeCalendarTaskDate(task.startDate || task.repeatInstanceDate || task.dueDate);
  const dueDate = normalizeCalendarTaskDate(task.dueDate || task.startDate || task.repeatInstanceDate);
  if (!startDate && !dueDate) {
    return false;
  }
  const rangeStart = startDate || dueDate;
  const rangeEnd = dueDate || startDate;
  const taskStart = rangeStart <= rangeEnd ? rangeStart : rangeEnd;
  const taskEnd = rangeStart <= rangeEnd ? rangeEnd : rangeStart;
  return taskStart <= repeatWindow.endDate && taskEnd >= repeatWindow.startDate;
}

function filterTasksForCalendarWindow(tasks: Task[], repeatWindow: TaskRepeatWindow | null): Task[] {
  if (!repeatWindow) {
    return tasks;
  }
  return tasks.filter(task => (
    task.isVirtual
      ? doesTaskIntersectRepeatWindow(task, repeatWindow)
      : true
  ));
}

let skipCleanupTimer: number | null = null;

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

const kanbanFilterType = ref('all');
const kanbanFilterDocument = ref('all');
const kanbanGroupBy = ref<TaskViewGroupMode>('status');
const listFilterType = ref('all');
const listFilterDocument = ref('all');
const listGroupBy = ref<TaskViewGroupMode>('status');
const kanbanGroupColumnOrder = ref<string[]>([]);
const tableGroupBy = ref<TaskViewGroupMode>('status');
const ganttFilterType = ref('all');
const ganttFilterDocument = ref('all');
const ganttMilestonesEnabled = ref(false);
const ganttDocumentOrderBySource = ref<Record<string, string[]>>({});
const kanbanFilterPopoverVisible = ref(false);
const kanbanFilterPopoverStyle = ref<Record<string, string>>({});
const kanbanFilterPopoverRef = ref<InstanceType<typeof TaskFilterPopover> | null>(null);
const kanbanFilterControlRef = ref<HTMLElement | null>(null);
const kanbanFilterPopoverPoint = ref<{ x: number; y: number } | null>(null);
const tableFilterPopoverVisible = ref(false);
const tableFilterPopoverStyle = ref<Record<string, string>>({});
const tableFilterPopoverRef = ref<InstanceType<typeof TaskFilterPopover> | null>(null);
const tableFilterControlRef = ref<HTMLElement | null>(null);
const tableFilterPopoverPoint = ref<{ x: number; y: number } | null>(null);
const tableSearchControlRef = ref<HTMLElement | null>(null);
const tableSearchInputRef = ref<HTMLInputElement | null>(null);
const tableViewRef = ref<InstanceType<typeof TableView> | null>(null);
const isMobileTableSearchExpanded = ref(false);
const kanbanBoardRef = ref<HTMLElement | null>(null);
const isKanbanBatchEditMode = ref(false);
const kanbanBatchSelectedTaskIds = ref<Set<string>>(new Set());
const kanbanBatchMenuVisible = ref(false);
const kanbanBatchMenuRef = ref<HTMLElement | null>(null);
const kanbanBatchMenuStyle = ref<Record<string, string>>({});
const kanbanBatchMenuSubmenu = ref<'status' | 'priority' | null>(null);
const kanbanBatchTagSubmenuAction = ref<TaskTagBatchAction | null>(null);
const kanbanBatchEditStatus = ref<string>('');
const kanbanBatchEditPriority = ref<string>('');
const kanbanBatchEditTagAction = ref<BatchTagActionSelection>('set-primary');
const kanbanBatchEditGroupId = ref<string>('');
const isKanbanBatchApplying = ref(false);
const kanbanBatchLassoBox = ref<{ active: boolean; left: number; top: number; width: number; height: number }>({
  active: false,
  left: 0,
  top: 0,
  width: 0,
  height: 0
});
const kanbanBatchLassoStart = ref<{ x: number; y: number } | null>(null);
const isKanbanBatchLassoSelecting = ref(false);
let kanbanBatchLassoSuppressCardClickUntil = 0;
let kanbanBatchLassoBaseSelection = new Set<string>();
let kanbanBatchLassoMoveHandler: ((event: MouseEvent) => void) | null = null;
let kanbanBatchLassoUpHandler: ((event: MouseEvent) => void) | null = null;
const documentTabsDropdownVisible = ref(false);
const draggedDocumentTabId = ref('');
const dragOverDocumentTabId = ref('');
const documentTabsRef = ref<HTMLElement | null>(null);
const documentTabsDropdownControlRef = ref<HTMLElement | null>(null);
const documentTabsDropdownButtonRef = ref<HTMLElement | null>(null);
const documentTabsDropdownPopoverRef = ref<HTMLElement | null>(null);
const documentTabsDropdownPopoverStyle = ref<Record<string, string>>({});
const documentScopePickerVisible = ref(false);
const documentScopePickerRef = ref<HTMLElement | null>(null);
const documentScopePickerStyle = ref<Record<string, string>>({});
const documentScopePickerSearchInputRef = ref<HTMLInputElement | null>(null);
const documentScopeTreeSearch = ref('');
const documentTabScopesBySource = ref<Record<string, DocumentTabScope>>({});
const documentScopeTreeDocumentsByNotebook = ref<Map<string, DocumentScopeTreeDocument[]>>(new Map());
const documentScopeTreeLoading = ref(false);
let documentScopeTreeRequestId = 0;
let documentScopeTreeRetryTimer: number | null = null;
const documentScopeTreeRetryCounts = new Map<string, number>();
let documentScopeTreeRefreshPending = false;
const documentScopeAncestorRefreshes = new Map<string, Promise<void>>();
const documentTabContextMenu = ref<DocumentTabContextMenuState | null>(null);
const documentTabContextMenuRef = ref<HTMLElement | null>(null);
const documentIconByRootId = ref<Map<string, string>>(new Map());
const documentMetadataByRootId = ref<Map<string, RootDocumentMetadata>>(new Map());
let documentIconRefreshTimer: number | null = null;
let documentIconRefreshSeq = 0;
let documentMetadataRefreshTimer: number | null = null;
let documentMetadataRefreshSeq = 0;
const taskViewGroupMenuVisible = ref(false);
const taskViewGroupMenuControlRef = ref<HTMLElement | null>(null);
const taskViewGroupMenuPopoverRef = ref<HTMLElement | null>(null);
const calendarDisplayMenuVisible = ref(false);
const calendarDisplayMenuControlRef = ref<HTMLElement | null>(null);
const calendarDisplayMenuPopoverRef = ref<HTMLElement | null>(null);
const CALENDAR_DISPLAY_STORAGE_KEY = 'pinch-calendar-display-settings';
const showCalendarTasks = ref(true);
const showCalendarHabits = ref(false);
const showCalendarTaskLifelog = ref(false);
const showCalendarHabitLifelog = ref(false);
const showCalendarFocusLifelog = ref(false);
const showCalendarRecordsLifelog = ref(false);
const savedCalendarDisplaySettings = loadCalendarDisplaySettings();
if (savedCalendarDisplaySettings) {
  showCalendarTasks.value = savedCalendarDisplaySettings.showTasks;
  showCalendarHabits.value = savedCalendarDisplaySettings.showHabits;
  showCalendarTaskLifelog.value = savedCalendarDisplaySettings.showTaskLifelog;
  showCalendarHabitLifelog.value = savedCalendarDisplaySettings.showHabitLifelog;
  showCalendarFocusLifelog.value = savedCalendarDisplaySettings.showFocusLifelog;
  showCalendarRecordsLifelog.value = savedCalendarDisplaySettings.showRecordsLifelog;
}
const calendarLifelogDisplayOptions = computed(() => [
  { key: 'task', label: 'kanbanView.showCalendarTaskLifelog', visible: showCalendarTaskLifelog.value, toggle: toggleCalendarTaskLifelogVisible },
  { key: 'habit', label: 'kanbanView.showCalendarHabitLifelog', visible: showCalendarHabitLifelog.value, toggle: toggleCalendarHabitLifelogVisible },
  { key: 'focus', label: 'kanbanView.showCalendarFocusLifelog', visible: showCalendarFocusLifelog.value, toggle: toggleCalendarFocusLifelogVisible },
  { key: 'records', label: 'kanbanView.showCalendarRecordsLifelog', visible: showCalendarRecordsLifelog.value, toggle: toggleCalendarRecordsLifelogVisible }
]);
const calendarSidebarDisplayOptions = computed(() => [
  { key: 'tasks', label: 'kanbanView.showCalendarTasks', enabled: showCalendarTasks.value },
  { key: 'habits', label: 'kanbanView.showCalendarHabits', enabled: showCalendarHabits.value },
  ...calendarLifelogDisplayOptions.value.map(option => ({ key: option.key, label: option.label, enabled: option.visible }))
]);
watch([showCalendarTasks, showCalendarHabits, showCalendarTaskLifelog, showCalendarHabitLifelog, showCalendarFocusLifelog, showCalendarRecordsLifelog], saveCalendarDisplaySettings);
const calendarFocusHabits = ref<Habit[]>([]);
const calendarFocusNoteDialogVisible = ref(false);
const calendarFocusNoteHabit = ref<Habit | null>(null);
const calendarFocusNoteDate = ref('');
const calendarFocusNoteItems = ref<HabitFocusNoteItem[]>([]);
const calendarFocusBindDialogVisible = ref(false);
const calendarFocusBindDocInput = ref('');
const calendarFocusBindHabit = ref<Habit | null>(null);
let calendarFocusNoteRequestId = 0;
const collapsedKanbanListSectionIds = ref<Set<string>>(new Set());
const hiddenDocumentTabIds = ref(new Set<string>());
const mobileViewSwitcherVisible = ref(false);
const mobileViewSwitcherControlRef = ref<HTMLElement | null>(null);
const mobileViewSwitcherPopoverRef = ref<HTMLElement | null>(null);
const calendarMonthViewRef = ref<MobileCalendarDropController | null>(null);
const calendarWeekViewRef = ref<MobileCalendarDropController | null>(null);
const mobileCalendarTaskDrawerVisible = ref(false);
const mobileCalendarTaskDrag = ref<MobileCalendarDragSession>({
  active: false,
  task: null,
  clientX: 0,
  clientY: 0
});
const mobileCalendarTaskDragHint = ref('');
const kanbanViewRef = ref<HTMLElement | null>(null);
const isCompactViewSwitcher = ref(false);
const kanbanListColumnCount = ref(1);
const COMPACT_VIEW_SWITCHER_BREAKPOINT = 760;
let kanbanViewResizeObserver: ResizeObserver | null = null;
let isKanbanViewMounted = false;

interface TaskGroupDialogSavePayload {
  groups: TaskGroup[];
  orderIds: string[];
}

type KanbanTaskDueFilterKey = 'overdue' | 'today' | 'next7Days' | 'allScheduled' | 'thisWeekend' | 'noDueDate';
type KanbanTaskUpdateFilterKey = 'today' | 'thisWeek' | 'thisMonth';
type KanbanTaskExtraFilterKey = 'hasDescription' | 'hasSubtasks' | 'hasFocusEstimate';
const tableFilterType = ref('all');
const tableFilterDocument = ref('all');
const tableSearchQuery = ref('');
const normalizedTableSearch = computed(() => normalizeSearchText(tableSearchQuery.value));
const isMobileTaskSearchCollapsed = computed(() =>
  isMobileFrontend && !isMobileTableSearchExpanded.value && !tableSearchQuery.value
);

// All calendar subviews share one source and active document tab. This keeps
// the user's calendar context intact while switching between month/week/day.
const calendarFilterType = ref('all');
const calendarFilterDocument = ref('all');
const monthFilterType = calendarFilterType;
const monthFilterDocument = calendarFilterDocument;
const weekFilterType = calendarFilterType;
const weekFilterDocument = calendarFilterDocument;
const dayFilterType = calendarFilterType;
const dayFilterDocument = calendarFilterDocument;

const isSettingsLoaded = ref(false);
// A restored SiYuan custom tab mounts before its saved view filters have been
// read. Keep persistence paused from setup onward, otherwise the temporary
// default view can save its "all" source before loadUserSettings restores it.
const isHydratingSettings = ref(true);

const { notebooks, loadNotebooks } = useNotebooks();
const taskGroups = ref<TaskGroup[]>([]);
const hasLoadedTaskGroups = ref(false);
const documentGroups = ref<DocumentGroup[]>([]);
const visibleTaskGroups = computed(() =>
  taskGroups.value.filter(group => group.hidden !== true)
);
const visibleTaskGroupIdSet = computed(() => new Set(visibleTaskGroups.value.map(group => group.id)));
const kanbanTaskGroupNameMap = computed(() => new Map(taskGroups.value.map(group => [group.id, group.name || ''])));

function resolveKanbanTaskTagSummaryLabel(tagIds: string[]): string {
  if (tagIds.length === 0) {
    return t('taskManager.noTag');
  }
  const primaryLabel = kanbanTaskGroupNameMap.value.get(tagIds[0] || '') || t('taskManager.tags');
  return tagIds.length > 1 ? `${primaryLabel} +${tagIds.length - 1}` : primaryLabel;
}

function resolveKanbanPrimaryTagColor(tagIds: string[]): string {
  const primaryTagId = tagIds[0] || '';
  if (!primaryTagId) {
    return '';
  }
  return taskGroups.value.find(item => item.id === primaryTagId)?.color || '';
}

let taskGroupsLoadingPromise: Promise<TaskGroup[]> | null = null;
async function ensureTaskGroupsLoaded(): Promise<TaskGroup[]> {
  if (taskGroups.value.length > 0) {
    return taskGroups.value;
  }
  if (taskGroupsLoadingPromise) {
    return taskGroupsLoadingPromise;
  }
  taskGroupsLoadingPromise = loadTaskGroups()
    .then((groups) => {
      taskGroups.value = groups;
      hasLoadedTaskGroups.value = true;
      return groups;
    })
    .finally(() => {
      taskGroupsLoadingPromise = null;
    });
  return taskGroupsLoadingPromise;
}
const taskHeadingGroups = ref<Map<string, TaskHeadingGroupMeta>>(new Map());
const pendingTaskHeadingGroups = new Map<string, { meta: TaskHeadingGroupMeta; expiresAt: number }>();
const PENDING_TASK_HEADING_GROUP_TTL_MS = 8000;
// A block task can be written before the kernel task index exposes it to a
// full query. Keep the local card through that brief gap so a refresh cannot
// undo a successful quick-create.
const pendingOptimisticQuickCreatedTasks = new Map<string, { task: Task; expiresAt: number }>();
const PENDING_OPTIMISTIC_QUICK_CREATE_TTL_MS = 8000;
const draggedTask = ref<Task | null>(null);
const dragOverColumnId = ref<string | null>(null);
const draggedGroupColumnId = ref<string | null>(null);
const dragOverGroupColumnId = ref<string | null>(null);
const dragOverGroupColumnPosition = ref<'before' | 'after' | null>(null);
const archivingKanbanColumnIds = ref<Set<string>>(new Set());
const kanbanColumnMetrics = ref<Record<string, { scrollTop: number; height: number }>>({});
const isDropping = ref(false);
const kanbanColumnElements = new Map<string, HTMLElement>();
const pendingKanbanMetricColumnIds = new Set<string>();
let kanbanMetricsRaf: number | null = null;
const kanbanColumnEstimatedHeights = ref<Record<string, number>>({});
const kanbanColumnTaskHeightCache = new Map<string, Map<string, number>>();
const kanbanColumnHeightVersion = ref(0);
const listViewRef = ref<HTMLElement | null>(null);
const listViewMetrics = ref<{ scrollTop: number; height: number }>({ scrollTop: 0, height: 600 });
let listViewMetricsRaf: number | null = null;
const listViewTaskHeightCache = new Map<string, number>();
const listViewTaskHeightVersion = ref(0);
const LIST_VIRTUAL_CARD_HEIGHT = 56;
const listViewEstimatedCardHeight = ref<number>(LIST_VIRTUAL_CARD_HEIGHT);
const currentView = ref<TaskViewMode>(normalizeTaskViewMode(userSettings.kanban?.currentView));
const lastCalendarView = ref<CalendarTaskViewMode>('month');
const calendarSidebarCollapsed = ref(false);
const isBoardTaskView = computed(() =>
  currentView.value === 'kanban' || currentView.value === 'list' || currentView.value === 'quadrant'
);
const isTableTaskView = computed(() => currentView.value === 'table' || currentView.value === 'archive-table');
const currentViewOption = computed(() =>
  primaryViewSwitcherOptions.value.find(option => isPrimaryViewOptionActive(option)) || primaryViewSwitcherOptions.value[0]
);
watch(
  viewSwitcherOptions,
  (options) => {
    if (options.length > 0 && !options.some(option => option.value === currentView.value)) {
      currentView.value = options[0].value;
    }
  },
  { deep: true }
);
const loadedTaskLoadMode = ref<TaskLoadMode | null>(null);
const loadedRepeatWindow = ref<TaskRepeatWindow | null>(null);
const calendarRepeatWindowByView = ref<Record<CalendarTaskViewMode, TaskRepeatWindow>>({
  month: resolveDefaultRepeatWindowForView('month'),
  week: resolveDefaultRepeatWindowForView('week'),
  day: resolveDefaultRepeatWindowForView('day'),
  'three-day': resolveDefaultRepeatWindowForView('three-day')
});
let latestTaskLoadRequestId = 0;
let pendingVisibleTaskLoadCount = 0;
const isCalendarView = computed(() =>
  currentView.value === 'month'
  || currentView.value === 'week'
  || currentView.value === 'day'
  || currentView.value === 'three-day'
);
const showMobileCalendarTaskDrawerButton = computed(() =>
  isMobileFrontend && isCalendarView.value
);
const activeMobileCalendarDropController = computed<MobileCalendarDropController | null>(() => {
  if (currentView.value === 'month') {
    return calendarMonthViewRef.value;
  }
  if (currentView.value === 'week' || currentView.value === 'day' || currentView.value === 'three-day') {
    return calendarWeekViewRef.value;
  }
  return null;
});

function resolveRequestedRepeatWindowForView(view: TaskViewMode): TaskRepeatWindow | null {
  if (!isCalendarTaskViewMode(view)) {
    return null;
  }
  return calendarRepeatWindowByView.value[view];
}

function resolveCurrentRepeatMaterializeOptions() {
  if (loadedTaskLoadMode.value === 'light-base') {
    return null;
  }
  return {
    ...resolveTaskRepeatMaterializeOptions(loadedRepeatWindow.value),
    includeTemplateDate: true
  };
}

function handleCalendarVisibleRangeChange(view: CalendarTaskViewMode, repeatWindow: TaskRepeatWindow): void {
  const previousWindow = calendarRepeatWindowByView.value[view];
  if (areTaskRepeatWindowsEqual(previousWindow, repeatWindow)) {
    return;
  }
  calendarRepeatWindowByView.value[view] = repeatWindow;
  if (currentView.value !== view) {
    return;
  }
  void ensureTasksLoadedForView(view, {
    silent: true,
    validateSelection: false
  });
}

function handleMonthVisibleRangeChange(repeatWindow: TaskRepeatWindow): void {
  handleCalendarVisibleRangeChange('month', repeatWindow);
}

function handleWeekVisibleRangeChange(repeatWindow: TaskRepeatWindow): void {
  if (currentView.value === 'week' || currentView.value === 'day' || currentView.value === 'three-day') {
    handleCalendarVisibleRangeChange(currentView.value, repeatWindow);
  }
}

const mobileCalendarTaskDragTitle = computed(() =>
  mobileCalendarTaskDrag.value.task ? stripHtml(mobileCalendarTaskDrag.value.task.title) : ''
);
const mobileCalendarTaskDragPreviewStyle = computed(() => ({
  left: `${Math.max(12, mobileCalendarTaskDrag.value.clientX + 14)}px`,
  top: `${Math.max(12, mobileCalendarTaskDrag.value.clientY - 18)}px`
}));
function resolveTaskCalendarPreviewColor(task: Task | null | undefined): string {
  const taskColor = typeof task?.backgroundColor === 'string' ? task.backgroundColor.trim() : '';
  if (taskColor) {
    if (/^pinch-background(?:10|[1-9])$/.test(taskColor)) {
      return `var(--${taskColor})`;
    }
    if (/^background(1[0-3]|[4-9])$/.test(taskColor)) {
      return `var(--b3-font-${taskColor})`;
    }
    return taskColor;
  }
  const groupId = typeof task?.groupId === 'string' ? task.groupId.trim() : '';
  if (!groupId) {
    return '';
  }
  const group = taskGroups.value.find(item => item.id === groupId);
  return resolveGroupColorCss(group?.color || '');
}
const mobileCalendarTaskDragPreviewColorStyle = computed<Record<string, string>>(() => {
  const color = resolveTaskCalendarPreviewColor(mobileCalendarTaskDrag.value.task);
  if (!color) {
    return {};
  }
  return {
    '--pinch-mobile-drag-preview-color': color
  };
});
const expandedKanbanTaskIds = ref(new Set<string>());
const showKanbanTaskCardDetails = ref(userSettings.kanban?.showKanbanTaskCardDetails !== false);
const QUADRANT_URGENCY_DAY_OPTIONS = [1, 3, 7, 10, 15] as const;
const quadrantUrgencyDayIndex = ref(QUADRANT_URGENCY_DAY_OPTIONS.indexOf(userSettings.kanban?.quadrantUrgentDays || 7));
const quadrantUrgentDays = computed(() => QUADRANT_URGENCY_DAY_OPTIONS[quadrantUrgencyDayIndex.value] || 7);
const showCompletedTasks = computed(() => userSettings.taskManager.showCompletedTasks !== false);
const autoRecognizeTaskDate = computed(() => userSettings.taskManager.autoRecognizeTaskDate === true);
const taskCompletionSoundEnabled = computed(() => userSettings.taskManager.taskCompletionSoundEnabled !== false);
const showDocumentGroupNotebookPath = computed(() => userSettings.taskManager.showDocumentGroupNotebookPath !== false);
const kanbanSubtaskHydratingIds = new Set<string>();
const inlineEditingDescriptionTaskId = ref<string | null>(null);
const inlineDescriptionDraftByTaskId = ref(new Map<string, string>());
const inlineDescriptionSavingTaskIds = new Set<string>();
const kanbanEditorVisible = ref(false);
const kanbanEditorPosition = ref({ x: 0, y: 0 });
const kanbanEditorPanelRef = ref<InstanceType<typeof TaskEditorPanelShell> | null>(null);
const kanbanEditorMountRef = ref<InstanceType<typeof TaskEditorProtyleBody> | null>(null);
const calendarDockEditorActive = ref(false);
const calendarDockEditorRendered = ref(false);
const calendarDockEditorVisible = ref(false);
const calendarDockEditorTarget = ref<HTMLElement | null>(null);
const calendarDockEditorLayoutVersion = ref(0);
const calendarDockEditorPanelRef = ref<InstanceType<typeof CalendarTaskEditorPanel> | null>(null);
const CALENDAR_DOCK_EDITOR_HOST_ID = 'pinch-calendar-task-editor-dock-host';
let calendarDockEditorHostElement: HTMLElement | null = null;
useMobileTextInputActivation(kanbanViewRef);
let suppressNextKanbanEditorOutsideMouseDown = false;
let kanbanEditorProtyle: Protyle | null = null;
const kanbanEditorTaskId = ref<string | null>(null);

function getCalendarDockEditorMountElement(): HTMLElement | null {
  const exposed = calendarDockEditorPanelRef.value as { bodyEl?: HTMLElement | { value?: HTMLElement | null } } | null;
  const bodyEl = exposed?.bodyEl;
  if (bodyEl instanceof HTMLElement) {
    return bodyEl;
  }
  if (bodyEl && typeof bodyEl === 'object' && 'value' in bodyEl) {
    return (bodyEl as { value?: HTMLElement | null }).value || null;
  }
  return null;
}

function getKanbanEditorMountElement(): HTMLElement | null {
  if (calendarDockEditorActive.value) {
    return getCalendarDockEditorMountElement();
  }

  return kanbanEditorMountRef.value?.bodyEl ?? null;
}
type KanbanEditorDateFields = {
  startDate: string;
  startTime: string;
  dueDate: string;
  dueTime: string;
};
const kanbanEditorDraft = ref<{
  taskId: string;
  status: Task['status'];
  startDate: string;
  startTime: string;
  dueDate: string;
  dueTime: string;
  description: string;
  reminderType?: TaskReminderType;
  reminderCustomTime: string;
  tags: string[];
  groupId: string;
  priority: Task['priority'];
} | null>(null);
const kanbanEditorQuickPanel = ref<'due' | 'description' | 'group' | 'reminder' | 'status' | null>(null);
const kanbanEditorRepeatFrequency = ref<RepeatFrequency>('none');
const kanbanEditorRepeatRule = ref<RepeatRule | null>(null);
const showKanbanTaskMoveDialog = ref(false);
const isKanbanTaskMoveSubmitting = ref(false);
const kanbanMoveSelectedNotebook = ref('');
const kanbanMoveSelectedDocument = ref('');
const openingKanbanEditorBlockIds = new Set<string>();

const virtualRepeatSeriesIds = computed(() => {
  const set = new Set<string>();
  for (const task of tasks.value) {
    if (task.isVirtual && task.repeatSeriesId) {
      set.add(task.repeatSeriesId);
    }
  }
  return set;
});

// Keep one actionable virtual instance per repeat series in non-calendar views.
// Prefer today's occurrence; otherwise retain the most recent overdue occurrence.
const visibleVirtualRepeatTaskIds = computed(() => {
  const todayStart = getStartOfDay(new Date()).getTime();
  const todayEnd = todayStart + 24 * 60 * 60 * 1000;
  const todayIds = new Set<string>();
  const latestOverdueBySeries = new Map<string, { id: string; date: number }>();

  for (const task of tasks.value) {
    if (!task.isVirtual || !task.repeatSeriesId) continue;
    const taskDate = getTaskDueDateTimestamp(task) ?? getTaskStartDateTimestamp(task);
    if (taskDate === null) continue;
    if (taskDate >= todayStart && taskDate < todayEnd) {
      todayIds.add(task.id);
      continue;
    }
    if (taskDate < todayStart) {
      const current = latestOverdueBySeries.get(task.repeatSeriesId);
      if (!current || taskDate > current.date) {
        latestOverdueBySeries.set(task.repeatSeriesId, { id: task.id, date: taskDate });
      }
    }
  }

  const seriesWithTodayInstance = new Set(
    tasks.value
      .filter(task => task.isVirtual && task.repeatSeriesId && todayIds.has(task.id))
      .map(task => task.repeatSeriesId as string)
  );
  for (const [seriesId, instance] of latestOverdueBySeries) {
    if (!seriesWithTodayInstance.has(seriesId)) todayIds.add(instance.id);
  }
  return todayIds;
});

const activeKanbanEditTask = computed(() =>
  kanbanEditorTaskId.value
    ? (tasks.value.find(task => task.id === kanbanEditorTaskId.value) || null)
    : null
);
const isActiveKanbanTaskPinned = computed(() => activeKanbanEditTask.value?.pinned === true);
const isActiveKanbanTaskUrgent = computed(() => activeKanbanEditTask.value?.urgent === true);
const isActiveKanbanTaskArchived = computed(() => activeKanbanEditTask.value?.archived === true);
const activeKanbanEditDraft = computed(() =>
  kanbanEditorTaskId.value && kanbanEditorDraft.value?.taskId === kanbanEditorTaskId.value
    ? kanbanEditorDraft.value
    : null
);
const visibleKanbanTasks = computed(() =>
  tasks.value.filter(task => isTaskIncludedByNotebookScope(task) && matchesKanbanFilters(task))
);
const quadrantTitles: Record<TaskQuadrantId, string> = {
  'important-urgent': t('quadrantView.importantUrgent'),
  'important-not-urgent': t('quadrantView.importantNotUrgent'),
  'not-important-urgent': t('quadrantView.notImportantUrgent'),
  'not-important-not-urgent': t('quadrantView.notImportantNotUrgent')
};
const quadrantSections = computed(() => {
  const sections = TASK_QUADRANT_ORDER.map(id => ({
    id,
    title: quadrantTitles[id],
    tasks: [] as Task[]
  }));
  const sectionsById = new Map(sections.map(section => [section.id, section]));
  for (const task of visibleKanbanTasks.value) {
    sectionsById.get(getTaskQuadrant(task, new Date(), quadrantUrgentDays.value).id)?.tasks.push(task);
  }
  const sortContext = createSidebarSortContext();
  for (const section of sections) {
    sortTasksLikeSidebar(section.tasks, sortContext);
  }
  return sections;
});
const quadrantDraggedTask = ref<Task | null>(null);
const quadrantDragOverId = ref<TaskQuadrantId | null>(null);
const quadrantSectionMetrics = ref<Record<string, { scrollTop: number; height: number }>>({});
const QUADRANT_VIRTUAL_THRESHOLD = 60;
const QUADRANT_VIRTUAL_CARD_HEIGHT = 110;
const QUADRANT_VIRTUAL_CARD_GAP = 8;
const QUADRANT_VIRTUAL_OVERSCAN = 6;

function getQuadrantVirtualRange(quadrantId: string, quadrantTasks: Task[]) {
  const totalCount = quadrantTasks.length;
  if (totalCount <= QUADRANT_VIRTUAL_THRESHOLD) {
    return { start: 0, end: totalCount, top: 0, bottom: 0 };
  }
  const metrics = quadrantSectionMetrics.value[quadrantId];
  const scrollTop = metrics?.scrollTop || 0;
  const viewportHeight = metrics?.height || 480;
  const rowHeight = QUADRANT_VIRTUAL_CARD_HEIGHT + QUADRANT_VIRTUAL_CARD_GAP;
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - QUADRANT_VIRTUAL_OVERSCAN);
  const end = Math.min(
    totalCount,
    Math.ceil((scrollTop + viewportHeight) / rowHeight) + QUADRANT_VIRTUAL_OVERSCAN
  );
  return {
    start,
    end,
    top: start * rowHeight,
    bottom: Math.max(0, (totalCount - end) * rowHeight)
  };
}

function getVisibleQuadrantTasks(quadrantId: string, quadrantTasks: Task[]): Task[] {
  const range = getQuadrantVirtualRange(quadrantId, quadrantTasks);
  return quadrantTasks.slice(range.start, range.end);
}

function getQuadrantSpacerStyle(quadrantId: string, quadrantTasks: Task[]): Record<string, string> {
  if (quadrantTasks.length <= QUADRANT_VIRTUAL_THRESHOLD) return {};
  const range = getQuadrantVirtualRange(quadrantId, quadrantTasks);
  return {
    paddingTop: `${range.top}px`,
    paddingBottom: `${range.bottom}px`
  };
}

function updateQuadrantSectionMetrics(quadrantId: string, element: HTMLElement): void {
  const next = { scrollTop: element.scrollTop, height: element.clientHeight };
  const previous = quadrantSectionMetrics.value[quadrantId];
  if (previous?.scrollTop === next.scrollTop && previous.height === next.height) return;
  quadrantSectionMetrics.value = { ...quadrantSectionMetrics.value, [quadrantId]: next };
}

function setQuadrantSectionTasksRef(quadrantId: string, element: HTMLElement | null): void {
  if (element) updateQuadrantSectionMetrics(quadrantId, element);
}

function handleQuadrantSectionScroll(event: Event, quadrantId: string): void {
  const element = event.target as HTMLElement | null;
  if (element) updateQuadrantSectionMetrics(quadrantId, element);
}
const visibleKanbanExpandableTaskIds = computed(() =>
  visibleKanbanTasks.value
    .filter(task => Array.isArray(task.subtasks) && task.subtasks.length > 0)
    .map(task => task.id)
);
const hasVisibleExpandableKanbanTasks = computed(() => visibleKanbanExpandableTaskIds.value.length > 0);
const areAllVisibleKanbanDetailsExpanded = computed(() => {
  const taskIds = visibleKanbanExpandableTaskIds.value;
  return taskIds.length > 0 && taskIds.every(taskId => expandedKanbanTaskIds.value.has(taskId));
});
const kanbanBatchSelectedCount = computed(() => kanbanBatchSelectedTaskIds.value.size);
const allVisibleKanbanTasksSelected = computed(() => {
  const currentTasks = visibleKanbanTasks.value;
  if (currentTasks.length === 0) {
    return false;
  }
  return currentTasks.every(task => kanbanBatchSelectedTaskIds.value.has(task.id));
});
const kanbanBatchLassoStyle = computed<Record<string, string>>(() => {
  if (!kanbanBatchLassoBox.value.active) {
    return {};
  }
  return {
    left: `${Math.round(kanbanBatchLassoBox.value.left)}px`,
    top: `${Math.round(kanbanBatchLassoBox.value.top)}px`,
    width: `${Math.round(kanbanBatchLassoBox.value.width)}px`,
    height: `${Math.round(kanbanBatchLassoBox.value.height)}px`
  };
});

const defaultGroupChipColor = '#9aa0a6';
const ADD_GROUP_COLUMN_ID = '__add-group__';
const ADD_HEADING_COLUMN_ID = '__add-heading__';
const calendarTaskEditorBackgroundColors: CalendarTaskEditorColorOption[] = TASK_BACKGROUND_COLOR_OPTIONS;
type BatchTagActionSelection = TaskTagBatchAction | '';
type KanbanDateGroupKey = 'overdue' | 'today' | 'thisWeek' | 'thisMonth' | 'other';

type KanbanColumn = {
  id: string;
  title: string;
  type: 'status' | 'group' | 'heading' | 'date' | 'document' | 'action';
  actionKind?: 'group-add' | 'heading-add';
  status?: Task['status'];
  groupId?: string;
  headingKey?: string;
  headingMeta?: TaskHeadingGroupMeta;
  dateGroupKey?: KanbanDateGroupKey;
  documentId?: string;
  notebookId?: string;
};

type KanbanListSection = {
  id: string;
  column: KanbanColumn;
  tasks: Task[];
};

type KanbanListMasonryColumn = {
  id: string;
  sections: KanbanListSection[];
  heightScore: number;
};

const kanbanStatusColumnOrder: TaskStatusValue[] = ['pending', 'in-progress', 'completed', 'delayed', 'cancelled'];
const statusColumns: KanbanColumn[] = kanbanStatusColumnOrder.map(status => ({
  id: `status-${status}`,
  status,
  title: getTaskStatusLabel(status, t),
  type: 'status'
}));
const kanbanDateGroups: Array<{ key: KanbanDateGroupKey; title: string; dotColor: string }> = [
  { key: 'overdue', title: t('taskManager.overdue'), dotColor: '#ef4444' },
  { key: 'today', title: t('taskManager.today'), dotColor: '#f59e0b' },
  { key: 'thisWeek', title: t('taskManager.thisWeek'), dotColor: '#3b82f6' },
  { key: 'thisMonth', title: t('taskManager.thisMonth'), dotColor: '#10b981' },
  { key: 'other', title: t('taskManager.other'), dotColor: '#9ca3af' }
];

const KANBAN_VIRTUAL_CARD_HEIGHT = 110;
const KANBAN_VIRTUAL_CARD_GAP = 8;
const KANBAN_VIRTUAL_OVERSCAN = 6;
const KANBAN_VIRTUAL_THRESHOLD = 120;
const LIST_VIRTUAL_OVERSCAN = 8;
const LIST_VIRTUAL_THRESHOLD = 80;
const KANBAN_TITLE_HYDRATE_LIMIT = 120;
const KANBAN_LIST_MIN_COLUMN_WIDTH = 330;
const KANBAN_LIST_COLUMN_GAP = 10;
const kanbanPriorityOrder = { high: 0, medium: 1, low: 2, none: 3 } as const;

const taskGroupIdSet = computed(() => {
  return new Set(taskGroups.value.map(group => group.id));
});

function resolveKanbanGroupColumnOrder(availableIds: string[], storedOrder: string[]): string[] {
  const normalizedStoredOrder = normalizeTaskGroupOrderIds(storedOrder);
  const visibleGroupIds = availableIds.filter(id => id !== TASK_GROUP_NONE_ID);
  const visibleGroupIdSet = new Set(visibleGroupIds);
  const noneIndex = normalizedStoredOrder.indexOf(TASK_GROUP_NONE_ID);
  const noneSlot = noneIndex >= 0
    ? normalizedStoredOrder
      .slice(0, noneIndex)
      .filter(id => id !== TASK_GROUP_NONE_ID && visibleGroupIdSet.has(id))
      .length
    : 0;

  const resolved = [...visibleGroupIds];
  resolved.splice(Math.max(0, Math.min(noneSlot, resolved.length)), 0, TASK_GROUP_NONE_ID);
  return resolved;
}

const baseGroupColumns = computed<KanbanColumn[]>(() => {
  const columns: KanbanColumn[] = [
    { id: TASK_GROUP_NONE_ID, title: t('taskManager.noTag'), type: 'group', groupId: '' }
  ];
  for (const group of visibleTaskGroups.value) {
    if (!group || !group.id) continue;
    columns.push({
      id: group.id,
      title: group.name?.trim() || t('taskManager.untitledTag'),
      type: 'group',
      groupId: group.id
    });
  }
  return columns;
});

const resolvedKanbanGroupColumnOrder = computed(() =>
  resolveKanbanGroupColumnOrder(
    baseGroupColumns.value.map(column => column.id),
    kanbanGroupColumnOrder.value
  )
);

const groupColumns = computed<KanbanColumn[]>(() => {
  const columnsById = new Map(baseGroupColumns.value.map(column => [column.id, column]));
  return resolvedKanbanGroupColumnOrder.value
    .map(id => columnsById.get(id))
    .filter((column): column is KanbanColumn => !!column);
});

const headingColumns = computed<KanbanColumn[]>(() => {
  const columnsByKey = new Map<string, KanbanColumn>();

  for (const task of visibleKanbanTasks.value) {
    const meta = getTaskHeadingGroupMeta(task, taskHeadingGroups.value);
    if (columnsByKey.has(meta.key)) {
      continue;
    }
    columnsByKey.set(meta.key, {
      id: meta.key,
      title: meta.label,
      type: 'heading',
      headingKey: meta.key,
      headingMeta: meta
    });
  }

  if (columnsByKey.size === 0) {
    return [
      { id: '__heading-empty__', title: t('kanbanView.headingGroup'), type: 'heading', headingKey: '__heading-empty__' }
    ];
  }

  return Array.from(columnsByKey.values()).sort((a, b) => {
    const orderDelta = (a.headingMeta?.order ?? Number.MAX_SAFE_INTEGER) - (b.headingMeta?.order ?? Number.MAX_SAFE_INTEGER);
    if (orderDelta !== 0) {
      return orderDelta;
    }
    return a.title.localeCompare(b.title, 'zh-CN');
  });
});
const dateColumns = computed<KanbanColumn[]>(() =>
  kanbanDateGroups.map(group => ({
    id: `date:${group.key}`,
    title: group.title,
    type: 'date',
    dateGroupKey: group.key
  }))
);

function getDocumentColumnIdForTask(task: Task): string {
  const rootId = typeof task.rootId === 'string' ? task.rootId.trim() : '';
  if (!rootId) {
    return 'document:unknown';
  }
  const notebookId = typeof task.notebookId === 'string' ? task.notebookId.trim() : '';
  return `document:${notebookId || '*'}:${rootId}`;
}

function resolveDocumentColumnTitle(task: Task): string {
  const rootId = typeof task.rootId === 'string' ? task.rootId.trim() : '';
  if (!rootId) {
    return t('personalStats.unlocatedDocument');
  }
  return getTaskDocumentTitle(task) || rootId;
}

const documentColumns = computed<KanbanColumn[]>(() => {
  const columnsById = new Map<string, KanbanColumn & { order: number }>();
  for (const task of visibleKanbanTasks.value) {
    const columnId = getDocumentColumnIdForTask(task);
    if (columnsById.has(columnId)) {
      continue;
    }
    const rootId = typeof task.rootId === 'string' ? task.rootId.trim() : '';
    const notebookId = typeof task.notebookId === 'string' ? task.notebookId.trim() : '';
    columnsById.set(columnId, {
      id: columnId,
      title: resolveDocumentColumnTitle(task),
      type: 'document',
      documentId: rootId,
      notebookId,
      order: rootId ? -getDocumentCreationSortKey(rootId) : Number.MAX_SAFE_INTEGER
    });
  }
  // Keep the overview columns in exactly the same order as the document tabs.
  // This also honors a user's custom milestone order.
  const documentTabOrderIndex = new Map(
    visibleDocumentOptions.value
      .filter(option => option.value !== 'all')
      .map((option, index) => [option.value, index])
  );
  return Array.from(columnsById.values()).sort((a, b) => {
    const leftTabOrder = a.documentId ? documentTabOrderIndex.get(a.documentId) : undefined;
    const rightTabOrder = b.documentId ? documentTabOrderIndex.get(b.documentId) : undefined;
    if (leftTabOrder !== undefined || rightTabOrder !== undefined) {
      return (leftTabOrder ?? Number.MAX_SAFE_INTEGER) - (rightTabOrder ?? Number.MAX_SAFE_INTEGER);
    }
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    const labelDiff = a.title.localeCompare(b.title, 'zh-CN');
    if (labelDiff !== 0) {
      return labelDiff;
    }
    return a.id.localeCompare(b.id);
  });
});

const addGroupColumn: KanbanColumn = { id: ADD_GROUP_COLUMN_ID, title: '', type: 'action', actionKind: 'group-add' };
const addHeadingColumn: KanbanColumn = { id: ADD_HEADING_COLUMN_ID, title: '', type: 'action', actionKind: 'heading-add' };
const kanbanListGroupActionColumn = computed<KanbanColumn | null>(() => {
  if (activeBoardGroupBy.value === 'group') return addGroupColumn;
  if (activeBoardGroupBy.value === 'heading') return addHeadingColumn;
  return null;
});
const kanbanSupportsDrag = computed(() => activeBoardGroupBy.value !== 'date' && activeBoardGroupBy.value !== 'document');
const kanbanColumns = computed<KanbanColumn[]>(() => {
  if (activeBoardGroupBy.value === 'group') {
    return [...groupColumns.value, addGroupColumn];
  }
  if (activeBoardGroupBy.value === 'heading') {
    return [...headingColumns.value, addHeadingColumn];
  }
  if (activeBoardGroupBy.value === 'date') {
    return dateColumns.value;
  }
  if (activeBoardGroupBy.value === 'document') {
    return documentColumns.value;
  }
  return showCompletedTasks.value
    ? statusColumns
    : statusColumns.filter(column => column.status !== 'completed');
});

const kanbanListSections = computed<KanbanListSection[]>(() =>
  kanbanColumns.value
    .filter(column => column.type !== 'action')
    .map(column => ({
      id: column.id,
      column,
      tasks: getTasksForColumn(column)
    }))
    .filter(section => section.tasks.length > 0)
);

function getKanbanListSectionHeightScore(section: KanbanListSection): number {
  if (isKanbanListSectionCollapsed(section.id)) {
    return 1.2;
  }
  const detailWeight = showKanbanTaskCardDetails.value ? 1.45 : 1;
  const subtaskScore = section.tasks.reduce((total, task) => {
    if (!Array.isArray(task.subtasks) || task.subtasks.length === 0) {
      return total;
    }
    return total + Math.min(task.subtasks.length, 6) * 0.35;
  }, 0);
  return 1.2 + section.tasks.length * detailWeight + subtaskScore;
}

const kanbanListMasonryColumns = computed<KanbanListMasonryColumn[]>(() => {
  const sections = kanbanListSections.value;
  if (sections.length === 0) {
    return [];
  }
  const columnCount = Math.max(1, Math.min(kanbanListColumnCount.value, sections.length));
  const columns: KanbanListMasonryColumn[] = Array.from({ length: columnCount }, (_, index) => ({
    id: `kanban-list-column-${index}`,
    sections: [],
    heightScore: 0
  }));

  sections.forEach((section, index) => {
    const targetColumn = index < columnCount
      ? columns[index]
      : columns.reduce((shortest, column) =>
        column.heightScore < shortest.heightScore ? column : shortest
      );
    targetColumn.sections.push(section);
    targetColumn.heightScore += getKanbanListSectionHeightScore(section);
  });

  return columns;
});

function isKanbanListSectionCollapsed(sectionId: string): boolean {
  const id = typeof sectionId === 'string' ? sectionId.trim() : '';
  return id ? collapsedKanbanListSectionIds.value.has(id) : false;
}

function toggleKanbanListSectionCollapse(sectionId: string): void {
  const id = typeof sectionId === 'string' ? sectionId.trim() : '';
  if (!id) {
    return;
  }
  const next = new Set(collapsedKanbanListSectionIds.value);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  collapsedKanbanListSectionIds.value = next;
  nextTick(() => {
    scheduleKanbanTitleHydration(120);
  });
}

interface CreateTaskPayload {
  startDate: string;
  dueDate: string;
  startTime?: string;
  dueTime?: string;
  allDay: boolean;
}

interface QuickCreateTarget {
  notebookId: string;
  documentId: string;
  docPath: string;
}

interface QuickCreateContext {
  columnType: 'status' | 'group' | 'heading';
  status?: Task['status'];
  groupId?: string;
  headingMeta?: TaskHeadingGroupMeta;
  fixedTarget?: QuickCreateTarget;
}

interface OpenQuickCreateOptions {
  context?: QuickCreateContext;
  preferredNotebookId?: string;
  preferredDocumentId?: string;
  preferLastTaskTarget?: boolean;
  mode?: 'task' | 'heading-task';
}

interface TableGroupActionPayload {
  mode: 'group' | 'heading';
  groupId: string;
  groupLabel: string;
  sampleTaskId?: string;
  taskIds?: string[];
}

const quickCreateHeadingInputRef = ref<HTMLInputElement | null>(null);
const quickCreateInputRef = ref<HTMLInputElement | null>(null);
const columnTitleInputRef = ref<HTMLInputElement | HTMLInputElement[] | null>(null);
const editingColumnTitleId = ref<string>('');
const columnTitleDraft = ref<string>('');
const editingColumnOriginalTitle = ref<string>('');
const isSavingColumnTitle = ref(false);
const quickCreateNotebookId = ref<string>('all');
const quickCreateDocumentId = ref<string>('all');
const quickCreateDialog = ref<{
  show: boolean;
  mode: 'task' | 'heading-task';
  headingTitle: string;
  title: string;
  payload: CreateTaskPayload | null;
  context: QuickCreateContext | null;
}>({
  show: false,
  mode: 'task',
  headingTitle: '',
  title: '',
  payload: null,
  context: null
});
const showTaskModal = ref(false);
const taskModalDefaultNotebook = ref('');
const taskModalDefaultDocument = ref(PINCH_INBOX_OPTION_ID);
const taskModalDefaultGroupId = ref('');

interface TaskModalCreateTaskPayload {
  title: string;
  description?: string;
  priority?: Task['priority'];
  status?: Task['status'];
  dueDate?: string;
  reminderType?: TaskReminderType;
  reminderCustomTime?: string;
  tags?: string[];
  groupId?: string;
  goalIds?: string[];
}

const kanbanStatusFilterOptions: Array<{ value: Task['status']; label: string }> = buildTaskStatusFilterOptions(t);
const kanbanPriorityFilterOptions: Array<{ value: Task['priority']; label: string }> = buildTaskPriorityOptions(t);
const kanbanDueFilterOptions: Array<{ value: KanbanTaskDueFilterKey; label: string }> = [
  { value: 'overdue', label: t('taskManager.dueOverdue') },
  { value: 'today', label: t('taskManager.dueToday') },
  { value: 'next7Days', label: t('taskManager.dueNext7Days') },
  { value: 'allScheduled', label: t('taskManager.allScheduledTasks') },
  { value: 'thisWeekend', label: t('taskManager.thisWeekend') },
  { value: 'noDueDate', label: t('taskManager.noDueDate') }
];
const kanbanUpdatedFilterOptions: Array<{ value: KanbanTaskUpdateFilterKey; label: string }> = [
  { value: 'today', label: t('taskManager.today') },
  { value: 'thisWeek', label: t('taskManager.thisWeek') },
  { value: 'thisMonth', label: t('taskManager.thisMonth') }
];
const kanbanExtraFilterOptions: Array<{ value: KanbanTaskExtraFilterKey; label: string }> = [
  { value: 'hasDescription', label: t('taskManager.hasDescription') },
  { value: 'hasSubtasks', label: t('taskManager.hasSubtasks') },
  { value: 'hasFocusEstimate', label: t('taskManager.hasFocusEstimate') }
];
const kanbanBatchStatusOptions = buildTaskStatusSelectOptions(t);
const kanbanBatchPriorityOptions: Array<{ value: string; text: string }> = [
  { value: '', text: t('taskManager.priorityNoChange') },
  { value: 'none', text: t('taskManager.priorityNone') },
  { value: 'low', text: t('taskManager.priorityLow') },
  { value: 'medium', text: t('taskManager.priorityMedium') },
  { value: 'high', text: t('taskManager.priorityHigh') }
];
const kanbanBatchTagActionOptions: Array<{ value: TaskTagBatchAction; text: string }> = [
  { value: 'set-primary', text: t('taskManager.batchSetPrimaryTag') },
  { value: 'add', text: t('taskManager.batchAddTag') },
  { value: 'remove', text: t('taskManager.batchRemoveTag') }
];
const kanbanStatusFilterValueSet: ReadonlySet<Task['status']> = new Set(kanbanStatusFilterOptions.map(option => option.value));
const kanbanPriorityFilterValueSet: ReadonlySet<Task['priority']> = new Set(kanbanPriorityFilterOptions.map(option => option.value));
const kanbanDueFilterValueSet: ReadonlySet<KanbanTaskDueFilterKey> = new Set(kanbanDueFilterOptions.map(option => option.value));
const kanbanUpdatedFilterValueSet: ReadonlySet<KanbanTaskUpdateFilterKey> = new Set(kanbanUpdatedFilterOptions.map(option => option.value));
const kanbanExtraFilterValueSet: ReadonlySet<KanbanTaskExtraFilterKey> = new Set(kanbanExtraFilterOptions.map(option => option.value));

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
  const shouldValidateGroupId = taskGroups.value.length > 0;
  const normalized: string[] = [];
  for (const item of values) {
    if (typeof item !== 'string') {
      continue;
    }
    const value = item.trim();
    if (!value || seen.has(value)) {
      continue;
    }
    if (value !== TASK_GROUP_NONE_ID && shouldValidateGroupId && !validGroupIds.has(value)) {
      continue;
    }
    seen.add(value);
    normalized.push(value);
  }
  return normalized;
}

const enabledNotebooks = computed(() => {
  const excludedNotebookIdSet = new Set(excludedNotebookIds.value);
  return notebooks.value.filter(notebook => !excludedNotebookIdSet.has(notebook.id));
});

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

const enabledNotebookNameById = computed(() =>
  new Map(enabledNotebooks.value.map(notebook => [notebook.id, notebook.name]))
);

const sortedDocumentGroups = computed(() => sortDocumentGroups(documentGroups.value));
const documentGroupsById = computed(() =>
  new Map(sortedDocumentGroups.value.map(group => [group.id, group]))
);
const goalDefinitionsById = computed(() =>
  new Map(goalDefinitions.value.map(goal => [goal.id, goal]))
);
const documentScopeMetadataByRootId = computed(() => {
  return new Map<string, RootDocumentMetadata>(documentMetadataByRootId.value);
});
const documentTitleByRootId = computed(() => {
  const titleByRootId = new Map<string, string>();
  for (const task of tasks.value) {
    if (task.type !== 'block' || !task.rootId) {
      continue;
    }
    if (titleByRootId.has(task.rootId)) {
      continue;
    }
    const fallbackMetadata = documentMetadataByRootId.value.get(task.rootId);
    const hPath = typeof task.hPath === 'string' ? task.hPath.trim() : '';
    titleByRootId.set(task.rootId, resolveDocumentDisplayName({
      id: task.rootId,
      path: hPath || fallbackMetadata?.path,
      name: fallbackMetadata?.name
    }));
  }
  documentScopeMetadataByRootId.value.forEach((metadata, rootId) => {
    if (!titleByRootId.has(rootId)) {
      titleByRootId.set(rootId, resolveDocumentDisplayName({
        id: rootId,
        path: metadata.path,
        name: metadata.name
      }));
    }
  });
  return titleByRootId;
});
const taskDocumentPathLookup = computed(() =>
  buildTaskDocumentPathLookup(tasks.value, documentScopeMetadataByRootId.value)
);
const notebookOptions = computed(() => [
  { value: 'all', text: t('taskManager.all') },
  ...enabledNotebooks.value.map(nb => ({ value: nb.id, text: nb.name }))
]);

const sourceOptions = computed(() => [
  { value: 'all', text: t('taskManager.all') },
  ...enabledNotebooks.value.map(nb => ({
    value: buildNotebookDocumentSource(nb.id),
    text: nb.name,
    icon: nb.icon
  })),
  ...sortedDocumentGroups.value.map(group => ({
    value: buildGroupDocumentSource(group.id),
    text: group.name,
    icon: group.emoji || '📁',
    kind: 'group' as const
  })),
  ...goalItems.value.map(goal => ({
    value: buildGoalDocumentSource(goal.id),
    text: goal.name || t('taskManager.untitledGoal'),
    icon: goal.emoji || '🎯',
    kind: 'goal' as const
  }))
]);
const taskModalNotebooks = computed<TaskModalNotebook[]>(() =>
  enabledNotebooks.value.map(notebook => ({
    id: notebook.id,
    name: notebook.name
  }))
);
const taskModalDocuments = computed<TaskModalDocument[]>(() =>
  getDocumentEntriesByNotebook('all').map(doc => ({
    id: doc.id,
    name: doc.name,
    notebookId: doc.notebookId
  }))
);

const taskScopeExtraDocuments = computed<TaskModalDocument[]>(() => getDocumentEntriesByNotebook('all'));
const {
  documentGroupDialogDocuments,
  allDocumentGroupDocuments,
  goalScopeDocuments: kanbanGoalDocuments,
  refreshTaskDocumentOptions,
  scheduleTaskDocumentOptionsRefresh
} = useTaskScopeDocuments({
  excludedNotebookIds,
  showCompletedTasks,
  enabledNotebookNameById,
  tasks,
  goalDocuments,
  extraDocuments: taskScopeExtraDocuments,
  logPrefix: '[KanbanView]'
});

const kanbanMoveNotebookOptions = computed(() =>
  notebooks.value.map(notebook => ({
    value: notebook.id,
    text: notebook.name
  }))
);

const kanbanMoveDocuments = computed(() => {
  const notebookId = kanbanMoveSelectedNotebook.value;
  if (!notebookId) {
    return [] as Array<{ id: string; name: string }>;
  }

  const docs = [...getDocumentEntriesByNotebook(notebookId)];
  const activeTask = activeKanbanEditTask.value;
  const activeRootId = typeof activeTask?.rootId === 'string' ? activeTask.rootId.trim() : '';
  if (
    activeTask
    && activeTask.notebookId === notebookId
    && activeRootId
    && !docs.some(doc => doc.id === activeRootId)
  ) {
    const fallbackPath = typeof activeTask.hPath === 'string' ? activeTask.hPath : '';
    const fallbackMetadata = documentMetadataByRootId.value.get(activeRootId);
    docs.unshift({
      id: activeRootId,
      name: resolveDocumentDisplayName({
        id: activeRootId,
        path: fallbackPath || fallbackMetadata?.path || '',
        name: fallbackMetadata?.name
      }),
      notebookId
    });
  }

  return docs;
});

const kanbanMoveDocumentOptions = computed(() =>
  kanbanMoveDocuments.value.map(doc => ({
    value: doc.id,
    text: doc.name
  }))
);

const kanbanMoveTargetUnchanged = computed(() => {
  const activeTask = activeKanbanEditTask.value;
  if (!activeTask) {
    return false;
  }
  return kanbanMoveSelectedNotebook.value === (activeTask.notebookId || '')
    && kanbanMoveSelectedDocument.value === (activeTask.rootId || '');
});

const canSubmitKanbanMove = computed(() => {
  const activeTask = activeKanbanEditTask.value;
  return !!activeTask?.blockId
    && !!kanbanMoveSelectedNotebook.value
    && !!kanbanMoveSelectedDocument.value
    && !kanbanMoveTargetUnchanged.value
    && !isKanbanTaskMoveSubmitting.value;
});

const kanbanGroupPickerOptions = computed(() => buildTaskGroupOptions(visibleTaskGroups.value, {
  none: t('taskManager.noTag'),
  fallback: t('taskManager.untitledTag')
}));

const kanbanGoalPickerOptions = computed(() => (
  goalDefinitions.value.map(goal => ({
    value: goal.id,
    label: goal.name || t('taskManager.untitledGoal'),
    emoji: goal.emoji || ''
  }))
));

const kanbanGroupFilterOptions = computed(() => {
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

function buildActiveKanbanGroupChipStyle(groupId: string): Record<string, string> | undefined {
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

function getKanbanColumnDotStyle(column: KanbanColumn): Record<string, string> {
  if (column.type === 'status') {
    if (column.status === 'pending') {
      return { backgroundColor: '#f59e0b' };
    }
    if (column.status === 'in-progress') {
      return { backgroundColor: '#3b82f6' };
    }
    if (column.status === 'delayed') {
      return { backgroundColor: '#f97316' };
    }
    if (column.status === 'completed') {
      return { backgroundColor: '#10b981' };
    }
    if (column.status === 'cancelled') {
      return { backgroundColor: '#9ca3af' };
    }
  }

  if (column.type === 'group') {
    const groupId = typeof column.groupId === 'string' ? column.groupId.trim() : '';
    if (!groupId) {
      return {
        backgroundColor: 'var(--b3-theme-background)',
        color: 'var(--b3-theme-on-background)'
      };
    }
    const groupColor = getTaskGroupColorValue(taskGroups.value, groupId);
    const backgroundColor = resolveGroupColorCss(groupColor);
    const textColor = resolveGroupTextColor(groupColor);
    return {
      background: backgroundColor || 'var(--b3-theme-background)',
      color: backgroundColor ? (textColor || 'var(--b3-theme-on-surface)') : 'var(--b3-theme-on-background)'
    };
  }

  if (column.type === 'heading') {
    return {};
  }

  if (column.type === 'date') {
    const dateMeta = kanbanDateGroups.find(group => group.key === column.dateGroupKey);
    return { backgroundColor: dateMeta?.dotColor || '#9ca3af' };
  }

  if (column.type === 'document') {
    return {
      backgroundColor: 'var(--b3-theme-background)',
      color: 'var(--b3-theme-on-background)'
    };
  }

  return { backgroundColor: 'transparent' };
}

function isKanbanHeadingColumn(column: KanbanColumn): boolean {
  return column.type === 'heading' && activeBoardGroupBy.value === 'heading';
}

function isKanbanGroupColumn(column: KanbanColumn): boolean {
  return column.type === 'group' && activeBoardGroupBy.value === 'group';
}

function isKanbanDocumentColumn(column: KanbanColumn): boolean {
  return column.type === 'document' && activeBoardGroupBy.value === 'document';
}

function getKanbanColumnDocumentIcon(column: KanbanColumn): string {
  if (!isKanbanDocumentColumn(column)) {
    return '';
  }
  const documentId = typeof column.documentId === 'string' ? column.documentId.trim() : '';
  if (!documentId) {
    return '📄';
  }
  const mapped = documentIconByRootId.value.get(documentId);
  if (typeof mapped === 'string' && mapped.trim().length > 0) {
    return mapped.trim();
  }
  return resolveDocumentTabHeaderIcon(column) || '📄';
}

function normalizeDocumentTabMatchText(value: unknown): string {
  return typeof value === 'string'
    ? value.trim().replace(/\\/g, '/').replace(/\/+$/g, '')
    : '';
}

function getDocumentTabTitleCandidates(column: KanbanColumn): Set<string> {
  const candidates = new Set<string>();
  const documentId = typeof column.documentId === 'string' ? column.documentId.trim() : '';
  const addCandidate = (value: unknown): void => {
    const normalized = normalizeDocumentTabMatchText(value);
    if (!normalized) {
      return;
    }
    candidates.add(normalized);
    const leaf = normalized.split('/').filter(Boolean).pop() || '';
    if (leaf) {
      candidates.add(leaf);
    }
  };

  addCandidate(column.title);
  addCandidate(documentId);
  if (documentId) {
    const metadata = documentMetadataByRootId.value.get(documentId)
      || documentScopeMetadataByRootId.value.get(documentId);
    addCandidate(metadata?.name);
    addCandidate(metadata?.path);
    addCandidate(documentTitleByRootId.value.get(documentId));
  }
  return candidates;
}

function isDocumentTabHeaderMatch(tabHeader: HTMLElement, candidates: Set<string>): boolean {
  if (candidates.size === 0) {
    return false;
  }
  const tabTitle = normalizeDocumentTabMatchText(tabHeader.querySelector('.item__text')?.textContent || '');
  const ariaLabel = normalizeDocumentTabMatchText(tabHeader.getAttribute('aria-label') || '');
  for (const candidate of candidates) {
    if (tabTitle === candidate || ariaLabel === candidate) {
      return true;
    }
    if (ariaLabel && (ariaLabel.endsWith(`/${candidate}`) || ariaLabel.endsWith(candidate))) {
      return true;
    }
  }
  return false;
}

function resolveDocumentTabHeaderIcon(column: KanbanColumn): string {
  if (typeof document === 'undefined') {
    return '';
  }
  const candidates = getDocumentTabTitleCandidates(column);
  const tabHeaders = Array.from(document.querySelectorAll<HTMLElement>('li[data-type="tab-header"]'));
  for (const tabHeader of tabHeaders) {
    if (!isDocumentTabHeaderMatch(tabHeader, candidates)) {
      continue;
    }
    const iconImage = tabHeader.querySelector<HTMLImageElement>('.item__icon img[src], .item__graphic img[src], img[src]');
    const icon = normalizeDocumentIconValue(iconImage?.getAttribute('src'));
    if (icon) {
      return icon;
    }
  }
  return '';
}

function getKanbanHeadingIconName(column: KanbanColumn): string {
  if (column.headingMeta?.kind === 'document-root') {
    return 'iconFile';
  }
  const headingLevel = Math.max(1, Math.min(6, Number(column.headingMeta?.headingLevel) || 2));
  return `iconH${headingLevel}`;
}

function normalizeColumnTitleDraft(value: string): string {
  return value
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractHeadingLeafTitleFromChainLabel(label: string): string {
  const normalized = normalizeColumnTitleDraft(label || '');
  const delimiter = ' / ';
  const delimiterIndex = normalized.lastIndexOf(delimiter);
  if (delimiterIndex === -1) {
    return normalized;
  }
  return normalized.slice(delimiterIndex + delimiter.length).trim();
}

function getKanbanColumnTitleText(column: KanbanColumn): string {
  if (
    column.type === 'heading'
    && activeBoardGroupBy.value === 'heading'
    && getBoardFilterDocumentForView(currentView.value) !== 'all'
  ) {
    return extractHeadingLeafTitleFromChainLabel(column.title || '');
  }
  return column.title;
}

function parseHeadingTitleFromKramdown(markdown: string): string {
  const firstLine = markdown
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(line => line.length > 0) || '';
  if (!firstLine) {
    return '';
  }
  return normalizeColumnTitleDraft(firstLine.replace(/^#{1,6}\s*/, ''));
}

async function resolveEditableColumnTitle(column: KanbanColumn): Promise<string> {
  if (column.type === 'group') {
    return normalizeColumnTitleDraft(column.title || '');
  }

  if (column.type === 'heading') {
    const headingBlockId = typeof column.headingMeta?.headingBlockId === 'string'
      ? column.headingMeta.headingBlockId.trim()
      : '';
    if (headingBlockId) {
      try {
        const blockData = await getBlockKramdown(headingBlockId);
        const markdown = typeof blockData === 'string' ? blockData : blockData?.kramdown || '';
        const parsedTitle = parseHeadingTitleFromKramdown(markdown);
        if (parsedTitle) {
          return parsedTitle;
        }
      } catch {
      }
    }
    return extractHeadingLeafTitleFromChainLabel(column.title || '');
  }

  return normalizeColumnTitleDraft(column.title || '');
}

function getEditableColumnTitleKey(column: KanbanColumn): string {
  if (column.type === 'group') {
    const groupId = typeof column.groupId === 'string' ? column.groupId.trim() : '';
    return groupId ? `group:${groupId}` : '';
  }

  if (column.type === 'heading') {
    const headingBlockId = typeof column.headingMeta?.headingBlockId === 'string'
      ? column.headingMeta.headingBlockId.trim()
      : '';
    return headingBlockId ? `heading:${headingBlockId}` : '';
  }

  return '';
}

function canEditColumnTitle(column: KanbanColumn): boolean {
  if (isKanbanBatchEditMode.value) {
    return false;
  }
  if (column.type === 'group') {
    const groupId = typeof column.groupId === 'string' ? column.groupId.trim() : '';
    return groupId.length > 0;
  }

  if (column.type === 'heading') {
    const headingMeta = column.headingMeta;
    const headingBlockId = typeof headingMeta?.headingBlockId === 'string'
      ? headingMeta.headingBlockId.trim()
      : '';
    return !!(headingMeta && headingMeta.kind === 'heading' && headingMeta.rootId && headingBlockId);
  }

  return false;
}

function isColumnTitleEditing(column: KanbanColumn): boolean {
  const key = getEditableColumnTitleKey(column);
  return !!key && key === editingColumnTitleId.value;
}

function getActiveColumnTitleInput(): HTMLInputElement | null {
  const inputRef = columnTitleInputRef.value;
  const inputs = Array.isArray(inputRef) ? inputRef : [inputRef];
  return inputs.find((input): input is HTMLInputElement => (
    input instanceof HTMLInputElement
    && input.isConnected
    && !input.disabled
  )) || null;
}

function focusColumnTitleInput(options: { select?: boolean } = {}): void {
  const input = getActiveColumnTitleInput();
  if (!input) {
    return;
  }
  input.focus();
  if (options.select) {
    input.select();
  }
}

async function startColumnTitleEdit(column: KanbanColumn): Promise<void> {
  if (!canEditColumnTitle(column) || isSavingColumnTitle.value) {
    return;
  }
  const key = getEditableColumnTitleKey(column);
  if (!key) {
    return;
  }
  editingColumnTitleId.value = key;
  const fallbackTitle = column.type === 'heading'
    ? extractHeadingLeafTitleFromChainLabel(column.title || '')
    : normalizeColumnTitleDraft(column.title || '');
  columnTitleDraft.value = fallbackTitle;
  editingColumnOriginalTitle.value = fallbackTitle;
  await nextTick();
  focusColumnTitleInput({ select: true });

  if (column.type === 'heading') {
    const resolvedTitle = await resolveEditableColumnTitle(column);
    if (
      editingColumnTitleId.value === key
      && normalizeColumnTitleDraft(columnTitleDraft.value) === fallbackTitle
      && resolvedTitle
    ) {
      columnTitleDraft.value = resolvedTitle;
      editingColumnOriginalTitle.value = resolvedTitle;
      await nextTick();
      focusColumnTitleInput({ select: true });
    }
  }
}

function cancelColumnTitleEdit(force = false): void {
  if (!force && isSavingColumnTitle.value) {
    return;
  }
  editingColumnTitleId.value = '';
  columnTitleDraft.value = '';
  editingColumnOriginalTitle.value = '';
}

async function submitColumnTitleEdit(column: KanbanColumn): Promise<void> {
  if (!isColumnTitleEditing(column) || isSavingColumnTitle.value) {
    return;
  }

  const nextTitle = normalizeColumnTitleDraft(columnTitleDraft.value);
  const currentTitle = normalizeColumnTitleDraft(
    editingColumnOriginalTitle.value || column.title || ''
  );

  if (!nextTitle) {
    await pushMsg(getColumnTitleRequiredMessage(column), 2000);
    await nextTick();
    focusColumnTitleInput();
    return;
  }

  if (nextTitle === currentTitle) {
    cancelColumnTitleEdit(true);
    return;
  }

  isSavingColumnTitle.value = true;
  try {
    if (column.type === 'group') {
      const groupId = typeof column.groupId === 'string' ? column.groupId.trim() : '';
      if (!groupId) {
        cancelColumnTitleEdit(true);
        return;
      }
      const nextGroups = taskGroups.value.map(group => (
        group.id === groupId
          ? { ...group, name: nextTitle }
          : { ...group }
      ));
      await saveTaskGroups(nextGroups);
      const refreshedGroups = await loadTaskGroups();
      taskGroups.value = refreshedGroups;
      eventBus.emit(Events.TASK_GROUPS_UPDATED, { groups: refreshedGroups });
      cancelColumnTitleEdit(true);
      return;
    }

    if (column.type === 'heading') {
      const headingMeta = column.headingMeta;
      const headingBlockId = typeof headingMeta?.headingBlockId === 'string'
        ? headingMeta.headingBlockId.trim()
        : '';
      if (!headingMeta || headingMeta.kind !== 'heading' || !headingBlockId) {
        await pushMsg(t('kanbanView.currentGroupRenameUnsupported'), 2000);
        cancelColumnTitleEdit(true);
        return;
      }
      const headingLevel = Math.max(1, Math.min(6, Number(headingMeta.headingLevel) || 2));
      const markdown = `${'#'.repeat(headingLevel)} ${nextTitle}`;
      await updateBlock('markdown', markdown, headingBlockId);
      cancelColumnTitleEdit(true);
      scheduleRefreshTasks(120, 'full');
    }
  } catch (error) {
    console.error('[KanbanView] Failed to edit group title:', error);
    await pushMsg(t('kanbanView.saveFailedRetry'), 2600);
  } finally {
    isSavingColumnTitle.value = false;
  }
}

function canCreateTaskInColumn(column: KanbanColumn): boolean {
  if (column.type === 'status' || column.type === 'group' || column.type === 'document') {
    return true;
  }
  if (column.type === 'heading') {
    return !!(column.headingMeta && column.headingMeta.kind !== 'standalone' && column.headingMeta.rootId);
  }
  return false;
}

function getColumnCreateTaskLabel(column: KanbanColumn): string {
  if (column.type === 'status' || column.type === 'group' || column.type === 'heading' || column.type === 'document') {
    return formatTemplate('kanbanView.createTaskInColumnTemplate', { title: column.title });
  }
  return t('taskManager.newTask');
}

function getDefaultCreateTaskPayload(): CreateTaskPayload {
  return {
    startDate: '',
    dueDate: '',
    allDay: true
  };
}

function resolveTaskCreateTargetFromTask(task: Task): QuickCreateTarget | null {
  if (task.type !== 'block') {
    return null;
  }
  const notebookId = typeof task.notebookId === 'string' ? task.notebookId.trim() : '';
  const documentId = typeof task.rootId === 'string' ? task.rootId.trim() : '';
  const hPath = typeof task.hPath === 'string' ? task.hPath.trim() : '';
  if (!notebookId || !documentId || !hPath) {
    return null;
  }
  const notebook = notebooks.value.find(nb => nb.id === notebookId);
  if (!notebook) {
    return null;
  }
  return {
    notebookId,
    documentId,
    docPath: normalizeDocPath(notebook.name, hPath)
  };
}

function resolveColumnSampleTarget(column: KanbanColumn): QuickCreateTarget | null {
  const task = getTasksForColumn(column).find(item =>
    item.type === 'block'
    && typeof item.notebookId === 'string'
    && item.notebookId.trim().length > 0
    && typeof item.rootId === 'string'
    && item.rootId.trim().length > 0
    && typeof item.hPath === 'string'
    && item.hPath.trim().length > 0
  );
  if (!task) {
    return null;
  }
  return resolveTaskCreateTargetFromTask(task);
}

function buildQuickCreateOptionsForColumn(column: KanbanColumn): OpenQuickCreateOptions {
  const options: OpenQuickCreateOptions = {};
  const sampleTarget = resolveColumnSampleTarget(column);
  if (sampleTarget) {
    options.preferredNotebookId = sampleTarget.notebookId;
    options.preferredDocumentId = sampleTarget.documentId;
  }

  if (column.type === 'status') {
    options.context = {
      columnType: 'status',
      status: column.status || 'pending'
    };
    return options;
  }

  if (column.type === 'group') {
    const rawGroupId = column.id === TASK_GROUP_NONE_ID
      ? ''
      : (typeof column.groupId === 'string' ? column.groupId.trim() : column.id);
    options.context = {
      columnType: 'group',
      groupId: rawGroupId
    };
    return options;
  }

  if (column.type === 'heading' && column.headingMeta) {
    let fixedTarget = sampleTarget;
    if (!fixedTarget && column.headingMeta.rootId) {
      const rootTask = tasks.value.find(item =>
        item.type === 'block'
        && item.rootId === column.headingMeta?.rootId
        && typeof item.hPath === 'string'
        && item.hPath.trim().length > 0
      );
      if (rootTask) {
        fixedTarget = resolveTaskCreateTargetFromTask(rootTask);
      }
    }
    options.context = {
      columnType: 'heading',
      headingMeta: { ...column.headingMeta },
      fixedTarget: fixedTarget || undefined
    };
    if (fixedTarget) {
      options.preferredNotebookId = fixedTarget.notebookId;
      options.preferredDocumentId = fixedTarget.documentId;
    }
  }

  return options;
}

function openQuickCreateForKanbanColumn(column: KanbanColumn): void {
  if (!canCreateTaskInColumn(column)) {
    return;
  }
  void handleTaskCreateRequested(getDefaultCreateTaskPayload(), buildQuickCreateOptionsForColumn(column));
}

function resolveTableGroupSampleTask(payload: TableGroupActionPayload): Task | null {
  const sampleTaskId = typeof payload.sampleTaskId === 'string' ? payload.sampleTaskId.trim() : '';
  if (sampleTaskId) {
    const sampleTask = tasks.value.find(task => task.id === sampleTaskId);
    if (sampleTask) {
      return sampleTask;
    }
  }

  if (payload.mode === 'group') {
    const normalizedGroupId = payload.groupId === TASK_GROUP_NONE_ID
      ? ''
      : (typeof payload.groupId === 'string' ? payload.groupId.trim() : '');
    return tasks.value.find(task => {
      if (task.type !== 'block' || task.isVirtual || task.archived) return false;
      const taskGroupId = typeof task.groupId === 'string' ? task.groupId.trim() : '';
      return taskGroupId === normalizedGroupId;
    }) || null;
  }

  if (payload.mode === 'heading') {
    const headingKey = typeof payload.groupId === 'string' ? payload.groupId.trim() : '';
    if (!headingKey) {
      return null;
    }
    return tasks.value.find(task =>
      task.type === 'block'
      && !task.isVirtual
      && !task.archived
      && getHeadingColumnIdForTask(task) === headingKey
    ) || null;
  }

  return null;
}

function buildQuickCreateOptionsForTableGroup(payload: TableGroupActionPayload): OpenQuickCreateOptions | null {
  const options: OpenQuickCreateOptions = {};
  const sampleTask = resolveTableGroupSampleTask(payload);
  const sampleTarget = sampleTask ? resolveTaskCreateTargetFromTask(sampleTask) : null;
  if (sampleTarget) {
    options.preferredNotebookId = sampleTarget.notebookId;
    options.preferredDocumentId = sampleTarget.documentId;
  }

  if (payload.mode === 'group') {
    const normalizedGroupId = payload.groupId === TASK_GROUP_NONE_ID
      ? ''
      : (typeof payload.groupId === 'string' ? payload.groupId.trim() : '');
    options.context = {
      columnType: 'group',
      groupId: normalizedGroupId
    };
    return options;
  }

  if (payload.mode === 'heading') {
    if (!sampleTask) {
      return null;
    }
    const headingMeta = getTaskHeadingGroupMeta(sampleTask, taskHeadingGroups.value);
    if (!headingMeta || headingMeta.kind === 'standalone' || !headingMeta.rootId) {
      return null;
    }
    options.context = {
      columnType: 'heading',
      headingMeta: { ...headingMeta },
      fixedTarget: sampleTarget || undefined
    };
    return options;
  }

  return null;
}

async function handleTableGroupCreateTask(payload: TableGroupActionPayload): Promise<void> {
  const options = buildQuickCreateOptionsForTableGroup(payload);
  if (!options) {
    await pushMsg(t('kanbanView.currentGroupCreateUnsupported'), 2200);
    return;
  }
  await handleTaskCreateRequested(getDefaultCreateTaskPayload(), options);
}

async function handleTableGroupArchiveTasks(payload: TableGroupActionPayload): Promise<void> {
  const label = getCurrentGroupLabel(payload.groupLabel);
  const taskIds = Array.isArray(payload.taskIds) ? payload.taskIds : [];
  const tasksToArchive = taskIds
    .map(taskId => tasks.value.find(task => task.id === taskId))
    .filter((task): task is Task => !!task)
    .filter(task => task.type === 'block' && task.isVirtual !== true && task.archived !== true);
  const totalCount = tasksToArchive.length;

  if (totalCount === 0) {
    await pushMsg(t('kanbanView.noGroupTasksToArchive'), 2000);
    return;
  }

  const confirmed = window.confirm(getArchiveGroupConfirmMessage(label, totalCount));
  if (!confirmed) {
    return;
  }

  let successCount = 0;

  for (const task of tasksToArchive) {
    try {
      await TaskRepository.archiveTask(task.id, 'manual');
      const taskIndex = tasks.value.findIndex(item => item.id === task.id);
      if (taskIndex !== -1) {
        const nowIso = new Date().toISOString();
        const target = tasks.value[taskIndex];
        target.archived = true;
        target.archivedAt = nowIso;
        target.archiveReason = 'manual';
        target.updatedAt = nowIso;
      }
      successCount += 1;
    } catch (error) {
        console.error('[KanbanView] Failed to archive group tasks:', error);
    }
  }

  invalidateTableFilters();

  if (successCount === totalCount) {
    await pushMsg(getArchivedGroupSuccessMessage(label, totalCount), 2400);
    return;
  }
  if (successCount > 0) {
    await pushMsg(getArchivePartialMessage(successCount, totalCount), 3000);
    return;
  }
  await pushMsg(t('kanbanView.archiveFailedRetry'), 3000);
}

function getArchivableTasksForColumn(column: KanbanColumn): Task[] {
  if (column.type === 'action') {
    return [];
  }
  return getTasksForColumn(column).filter(task =>
    task.type === 'block'
    && task.isVirtual !== true
    && task.archived !== true
  );
}

function canArchiveTasksInColumn(column: KanbanColumn): boolean {
  return getArchivableTasksForColumn(column).length > 0;
}

function getColumnArchiveTasksLabel(column: KanbanColumn): string {
  const title = getCurrentColumnLabel(column.title);
  const taskCount = getArchivableTasksForColumn(column).length;
  if (taskCount > 0) {
    return formatTemplate('kanbanView.archiveColumnTasksTemplate', { title, taskCount });
  }
  return formatTemplate('kanbanView.archiveColumnTasksWithoutCountTemplate', { title });
}

function isKanbanColumnArchiving(columnId: string): boolean {
  return archivingKanbanColumnIds.value.has(columnId);
}

function setKanbanColumnArchiving(columnId: string, archiving: boolean): void {
  const next = new Set(archivingKanbanColumnIds.value);
  if (archiving) {
    next.add(columnId);
  } else {
    next.delete(columnId);
  }
  archivingKanbanColumnIds.value = next;
}

async function archiveColumnTasks(column: KanbanColumn): Promise<void> {
  if (column.type === 'action') {
    return;
  }
  if (isKanbanColumnArchiving(column.id)) {
    return;
  }

  const tasksToArchive = getArchivableTasksForColumn(column);
  const totalCount = tasksToArchive.length;
  if (totalCount === 0) {
    await pushMsg(t('kanbanView.noColumnTasksToArchive'), 2000);
    return;
  }

  const title = getCurrentColumnLabel(column.title);
  const confirmed = window.confirm(getArchiveColumnConfirmMessage(title, totalCount));
  if (!confirmed) {
    return;
  }

  setKanbanColumnArchiving(column.id, true);
  let successCount = 0;

  try {
    for (const task of tasksToArchive) {
      try {
        await TaskRepository.archiveTask(task.id, 'manual');
        const taskIndex = tasks.value.findIndex(item => item.id === task.id);
        if (taskIndex !== -1) {
          const nowIso = new Date().toISOString();
          const target = tasks.value[taskIndex];
          target.archived = true;
          target.archivedAt = nowIso;
          target.archiveReason = 'manual';
          target.updatedAt = nowIso;
        }
        successCount += 1;
      } catch (error) {
        console.error('[KanbanView] Failed to archive column tasks:', error);
      }
    }

    invalidateTableFilters();

    if (successCount === totalCount) {
      await pushMsg(getArchivedColumnSuccessMessage(title, totalCount), 2400);
      return;
    }
    if (successCount > 0) {
      await pushMsg(getArchivePartialMessage(successCount, totalCount), 3000);
      return;
    }
    await pushMsg(t('kanbanView.archiveFailedRetry'), 3000);
  } finally {
    setKanbanColumnArchiving(column.id, false);
  }
}

const kanbanEditorSelectedTagIds = computed(() => (
  buildTaskTagState(activeKanbanEditDraft.value?.tags, activeKanbanEditDraft.value?.groupId).tagIds
));

const kanbanEditorSelectedGoalIds = computed(() => (
  activeKanbanEditTask.value ? getKanbanScopedGoalIds(activeKanbanEditTask.value) : []
));

function normalizeKanbanTaskIdentity(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function resolveKanbanTaskCardGoalSource(task: Task): Task {
  if (task.isVirtual !== true) {
    return task;
  }

  const taskId = normalizeKanbanTaskIdentity(task.taskId);
  const sourceBlockId = normalizeKanbanTaskIdentity(task.sourceBlockId) || normalizeKanbanTaskIdentity(task.blockId);
  const repeatSeriesId = normalizeKanbanTaskIdentity(task.repeatSeriesId);
  const templateTask = tasks.value.find(item => (
    item.type === 'block'
    && item.isVirtual !== true
    && (
      (!!taskId && (item.id === taskId || item.taskId === taskId))
      || (!!sourceBlockId && item.blockId === sourceBlockId)
      || (!!repeatSeriesId && item.repeatSeriesId === repeatSeriesId)
    )
  ));
  return templateTask || task;
}

function getKanbanTaskCardGoalIds(task: Task): string[] {
  return Array.from(new Set([
    ...getKanbanScopedGoalIds(resolveKanbanTaskCardGoalSource(task)),
    ...getGoalIdsForTask(goalDefinitions.value, task)
  ]));
}

const kanbanEditorSelectedGroupId = computed(() => (
  kanbanEditorSelectedTagIds.value[0] || TASK_GROUP_NONE_ID
));

const kanbanEditorGroupLabel = computed(() => (
  resolveKanbanTaskTagSummaryLabel(kanbanEditorSelectedTagIds.value)
));

const kanbanEditorGroupColorValue = computed(() => (
  resolveKanbanPrimaryTagColor(kanbanEditorSelectedTagIds.value)
));

const kanbanEditorGroupButtonStyle = computed(() => {
  const rawColor = kanbanEditorGroupColorValue.value;
  if (!rawColor) {
    return {};
  }
  return {
    background: resolveGroupColorCss(rawColor),
    borderColor: resolveGroupColorLayerCss(rawColor),
    color: resolveGroupTextColor(rawColor)
  };
});

const kanbanEditorDueText = computed(() => {
  const dueDate = activeKanbanEditDraft.value?.dueDate || '';
  if (!dueDate) return t('taskManager.notSet');
  return formatMonthDay(dueDate);
});

const kanbanEditorHasDueDate = computed(() => {
  return !!(activeKanbanEditDraft.value?.dueDate || '').trim();
});

const kanbanEditorHasDescription = computed(() => {
  const description = activeKanbanEditDraft.value?.description || '';
  return description.trim().length > 0;
});
const kanbanEditorReminderText = computed(() => {
  return getTaskReminderLabel(
    activeKanbanEditDraft.value?.reminderType,
    activeKanbanEditDraft.value?.reminderCustomTime
  );
});
const kanbanEditorHasReminder = computed(() => {
  return !!(activeKanbanEditDraft.value?.reminderType || '').trim();
});

function normalizeRepeatFrequencyForKanbanEditor(frequency: RepeatFrequency | undefined): RepeatFrequency {
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

function syncKanbanEditorRepeatState(task: Task | null): void {
  if (!task) {
    kanbanEditorRepeatFrequency.value = 'none';
    kanbanEditorRepeatRule.value = null;
    return;
  }

  const taskId = task.id;
  kanbanEditorRepeatFrequency.value = normalizeRepeatFrequencyForKanbanEditor(task.repeatFrequency as RepeatFrequency | undefined);
  kanbanEditorRepeatRule.value = null;

  const isRepeatTask = isRepeatTaskEntity(task);
  if (isRepeatTask) {
    getRepeatSeriesForTask(task)
      .then((series) => {
        if (!series || activeKanbanEditTask.value?.id !== taskId) return;
        kanbanEditorRepeatFrequency.value = normalizeRepeatFrequencyForKanbanEditor(series.frequency as RepeatFrequency);
        kanbanEditorRepeatRule.value = series.rule || null;
        const draft = activeKanbanEditDraft.value;
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
      if (activeKanbanEditTask.value?.id !== taskId) return;
      if (frequency === 'none' && isRepeatTask) return;
      kanbanEditorRepeatFrequency.value = normalizeRepeatFrequencyForKanbanEditor(frequency);
    })
    .catch(() => {});
}

const {
  activeStatusFilters: activeKanbanStatusFilters,
  activePriorityFilters: activeKanbanPriorityFilters,
  activeDueFilters: activeKanbanDueFilters,
  activeUpdatedFilters: activeKanbanUpdatedFilters,
  activeGroupFilters: activeKanbanGroupFilters,
  activeExtraFilters: activeKanbanExtraFilters,
  hasActive: hasActiveKanbanFilters,
  count: activeKanbanFilterCount,
  sections: kanbanFilterSections,
  clear: clearKanbanFilters,
  handleToggle: handleKanbanFilterToggle
} = useTaskFilterState({
  statusOptions: kanbanStatusFilterOptions,
  priorityOptions: kanbanPriorityFilterOptions,
  dueOptions: kanbanDueFilterOptions,
  updatedOptions: kanbanUpdatedFilterOptions,
  extraOptions: kanbanExtraFilterOptions,
  groupOptions: kanbanGroupFilterOptions,
  buildActiveGroupStyle: buildActiveKanbanGroupChipStyle,
  updatedSingle: true
});

function restoreTaskFilterPopoverSettings(): void {
  const settings = userSettings.kanban;
  activeKanbanStatusFilters.value = normalizeStoredFilterValues<Task['status']>(settings.kanbanStatusFilters, kanbanStatusFilterValueSet);
  activeKanbanPriorityFilters.value = normalizeStoredFilterValues<Task['priority']>(settings.kanbanPriorityFilters, kanbanPriorityFilterValueSet);
  activeKanbanDueFilters.value = normalizeStoredFilterValues<KanbanTaskDueFilterKey>(settings.kanbanDueFilters, kanbanDueFilterValueSet);
  activeKanbanUpdatedFilters.value = normalizeStoredFilterValues<KanbanTaskUpdateFilterKey>(settings.kanbanUpdatedFilters, kanbanUpdatedFilterValueSet);
  activeKanbanGroupFilters.value = normalizeStoredGroupFilters(settings.kanbanGroupFilters);
  activeKanbanExtraFilters.value = normalizeStoredFilterValues<KanbanTaskExtraFilterKey>(settings.kanbanExtraFilters, kanbanExtraFilterValueSet);

  activeTableStatusFilters.value = normalizeStoredFilterValues<Task['status']>(settings.tableStatusFilters, kanbanStatusFilterValueSet);
  activeTablePriorityFilters.value = normalizeStoredFilterValues<Task['priority']>(settings.tablePriorityFilters, kanbanPriorityFilterValueSet);
  activeTableDueFilters.value = normalizeStoredFilterValues<KanbanTaskDueFilterKey>(settings.tableDueFilters, kanbanDueFilterValueSet);
  activeTableUpdatedFilters.value = normalizeStoredFilterValues<KanbanTaskUpdateFilterKey>(settings.tableUpdatedFilters, kanbanUpdatedFilterValueSet);
  activeTableGroupFilters.value = normalizeStoredGroupFilters(settings.tableGroupFilters);
  activeTableExtraFilters.value = normalizeStoredFilterValues<KanbanTaskExtraFilterKey>(settings.tableExtraFilters, kanbanExtraFilterValueSet);
}

const {
  activeStatusFilters: activeTableStatusFilters,
  activePriorityFilters: activeTablePriorityFilters,
  activeDueFilters: activeTableDueFilters,
  activeUpdatedFilters: activeTableUpdatedFilters,
  activeGroupFilters: activeTableGroupFilters,
  activeExtraFilters: activeTableExtraFilters,
  hasActive: hasActiveTableFilters,
  count: activeTableFilterCount,
  sections: tableFilterSections,
  clear: clearTableFilters,
  handleToggle: handleTableFilterToggle
} = useTaskFilterState({
  statusOptions: kanbanStatusFilterOptions,
  priorityOptions: kanbanPriorityFilterOptions,
  dueOptions: kanbanDueFilterOptions,
  updatedOptions: kanbanUpdatedFilterOptions,
  extraOptions: kanbanExtraFilterOptions,
  groupOptions: kanbanGroupFilterOptions,
  buildActiveGroupStyle: buildActiveKanbanGroupChipStyle,
  updatedSingle: true
});

function applyExcludedNotebookScope(ids: string[]): void {
  const normalized = normalizeNotebookIds(ids);
  excludedNotebookIds.value = normalized;
  TaskRepository.setExcludedNotebookIds(normalized);
  const scopedTasks = filterTasksByNotebookScope(tasks.value);
  if (scopedTasks.length !== tasks.value.length) {
    syncTaskSnapshot(scopedTasks);
    invalidateTableFilters();
  }
  calendarLifelogTasks.value = filterTasksByNotebookScope(calendarLifelogTasks.value);
}

function resetSourceFilterIfNeeded(
  sourceRef: Ref<string>,
  documentRef: Ref<string>,
  predicate: (source: ReturnType<typeof parseDocumentSource>) => boolean
): boolean {
  const source = parseDocumentSource(sourceRef.value);
  if (!predicate(source)) {
    return false;
  }
  sourceRef.value = 'all';
  documentRef.value = 'all';
  return true;
}

function resetFiltersForExcludedNotebooks(): boolean {
  const excludedNotebookIdSet = new Set(excludedNotebookIds.value);
  let changed = false;

  changed = resetSourceFilterIfNeeded(kanbanFilterType, kanbanFilterDocument, source =>
    source.kind === 'notebook' && excludedNotebookIdSet.has(source.id)
  ) || changed;
  changed = resetSourceFilterIfNeeded(listFilterType, listFilterDocument, source =>
    source.kind === 'notebook' && excludedNotebookIdSet.has(source.id)
  ) || changed;
  changed = resetSourceFilterIfNeeded(tableFilterType, tableFilterDocument, source =>
    source.kind === 'notebook' && excludedNotebookIdSet.has(source.id)
  ) || changed;
  changed = resetSourceFilterIfNeeded(monthFilterType, monthFilterDocument, source =>
    source.kind === 'notebook' && excludedNotebookIdSet.has(source.id)
  ) || changed;
  changed = resetSourceFilterIfNeeded(weekFilterType, weekFilterDocument, source =>
    source.kind === 'notebook' && excludedNotebookIdSet.has(source.id)
  ) || changed;
  changed = resetSourceFilterIfNeeded(dayFilterType, dayFilterDocument, source =>
    source.kind === 'notebook' && excludedNotebookIdSet.has(source.id)
  ) || changed;

  if (quickCreateNotebookId.value !== 'all' && excludedNotebookIdSet.has(quickCreateNotebookId.value)) {
    quickCreateNotebookId.value = 'all';
    quickCreateDocumentId.value = 'all';
    changed = true;
  }

  return changed;
}

async function openTaskScopeDialog(initialTab: TaskScopeDialogTab = 'task-settings') {
  if (notebooks.value.length === 0) {
    await loadNotebooks();
  }
  closeDocumentTabContextMenu();
  taskScopeDialogInitialTab.value = initialTab;
  showTaskScopeDialog.value = true;
  if (initialTab === 'goals' || initialTab === 'document-groups' || initialTab === 'scope') {
    void refreshTaskScopeDocumentSourcesInBackground();
  }
}

async function refreshTaskScopeDocumentSources(
  options: { includeGoalsData?: boolean } = {}
): Promise<void> {
  await loadTasks(true, { silent: true, validateSelection: false });
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
    console.error('[KanbanView] Failed to refresh task scope document sources:', error);
  } finally {
    taskScopeDocumentsRefreshing.value = false;
  }
}

function closeDocumentTabContextMenu(): void {
  documentTabContextMenu.value = null;
}

function updateDocumentTabContextMenuPosition(): void {
  const menuState = documentTabContextMenu.value;
  const menuEl = documentTabContextMenuRef.value;
  if (!menuState || !menuEl) {
    return;
  }

  const rect = menuEl.getBoundingClientRect();
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const padding = 10;
  const nextX = Math.min(
    Math.max(padding, menuState.x),
    Math.max(padding, viewportWidth - rect.width - padding)
  );
  const nextY = Math.min(
    Math.max(padding, menuState.y),
    Math.max(padding, viewportHeight - rect.height - padding)
  );

  if (nextX !== menuState.x || nextY !== menuState.y) {
    documentTabContextMenu.value = {
      ...menuState,
      x: nextX,
      y: nextY
    };
  }
}

function handleDocumentTabContextMenu(event: MouseEvent, option: DocumentFilterOption): void {
  if (!option?.value || option.value === 'all' || !option.notebookId) {
    closeDocumentTabContextMenu();
    return;
  }

  closeDocumentTabsDropdown();
  closeTaskViewGroupMenu();
  closeMobileViewSwitcher();
  closeKanbanFilterPopover();
  closeTableFilterPopover();

  documentTabContextMenu.value = {
    x: event.clientX,
    y: event.clientY,
    value: option.value,
    text: option.text,
    documentId: option.value,
    notebookId: option.notebookId,
    notebookName: option.notebookName || enabledNotebookNameById.value.get(option.notebookId) || ''
  };
  nextTick(() => {
    updateDocumentTabContextMenuPosition();
  });
}

async function saveDocumentTabGroupAssignments(nextGroups: DocumentGroup[]): Promise<void> {
  const normalizedGroups = sortDocumentGroups(nextGroups.map(group => ({
    ...group,
    members: Array.isArray(group.members) ? group.members.map(member => ({ ...member })) : []
  })));

  applyExternalDocumentGroups(normalizedGroups);
  eventBus.emit(Events.DOCUMENT_GROUPS_UPDATED, { groups: normalizedGroups });
  closeDocumentTabContextMenu();
  await saveDocumentGroups(normalizedGroups);
  await validateDocumentSelection();
}

async function toggleDocumentTabGroupAssignment(targetGroupId: string): Promise<void> {
  const menu = documentTabContextMenu.value;
  const normalizedTargetGroupId = typeof targetGroupId === 'string' ? targetGroupId.trim() : '';
  if (!menu || !normalizedTargetGroupId) {
    return;
  }

  const nextGroups = sortedDocumentGroups.value.map(group => {
    if (group.id !== normalizedTargetGroupId) {
      return group;
    }

    const isAssigned = group.members.some(member =>
      member.documentId === menu.documentId && member.notebookId === menu.notebookId
    );
    return {
      ...group,
      members: isAssigned
        ? group.members.filter(member =>
            !(member.documentId === menu.documentId && member.notebookId === menu.notebookId)
          )
        : [...group.members, {
            documentId: menu.documentId,
            notebookId: menu.notebookId,
            name: menu.text
          }]
    };
  });

  await saveDocumentTabGroupAssignments(nextGroups);
}

async function openDocumentGroupManagerFromTabMenu(): Promise<void> {
  closeDocumentTabContextMenu();
  await openTaskScopeDialog('document-groups');
}

async function showSiblingDocumentsFromTabMenu(): Promise<void> {
  const menu = documentTabContextMenu.value;
  if (!menu) {
    return;
  }

  await loadDocumentScopeTree();
  const document = documentScopeTreeDocumentsByNotebook.value
    .get(menu.notebookId)
    ?.find(item => item.id === menu.documentId);
  const parent = document?.parentId
    ? documentScopeTreeDocumentsByNotebook.value
      .get(menu.notebookId)
      ?.find(item => item.id === document.parentId)
    : undefined;

  if (!parent) {
    const nextSourceValue = buildNotebookDocumentSource(menu.notebookId);
    const nextScopes = { ...documentTabScopesBySource.value };
    delete nextScopes[getDocumentTabScopeStorageKey(nextSourceValue)];
    documentTabScopesBySource.value = nextScopes;
    activeSourceFilterType.value = nextSourceValue;
    currentDocumentFilter.value = 'all';
    closeDocumentTabContextMenu();
    return;
  }

  let path = '';
  try {
    path = (await getHPathByID(parent.id) || '').trim();
  } catch {
    path = '';
  }
  const sourceValue = getCurrentFilterNotebookId();
  documentTabScopesBySource.value = {
    ...documentTabScopesBySource.value,
    [getDocumentTabScopeStorageKey(sourceValue)]: {
      id: parent.id,
      name: parent.name,
      notebookId: parent.notebookId,
      path
    }
  };
  currentDocumentFilter.value = 'all';
  closeDocumentTabContextMenu();
}

async function toggleDocumentTabGoalAssignment(goalId: string): Promise<void> {
  const menu = documentTabContextMenu.value;
  const normalizedGoalId = typeof goalId === 'string' ? goalId.trim() : '';
  if (!menu || !normalizedGoalId) {
    return;
  }

  const memberKey = `${menu.notebookId}:${menu.documentId}`;
  const nextGoals = goalDefinitions.value.map(goal => {
    if (goal.id !== normalizedGoalId) {
      return goal;
    }

    const isAssigned = goal.members.some(member =>
      `${member.notebookId}:${member.documentId}` === memberKey
    );
    return {
      ...goal,
      members: isAssigned
        ? goal.members.filter(member => `${member.notebookId}:${member.documentId}` !== memberKey)
        : [...goal.members, {
            documentId: menu.documentId,
            notebookId: menu.notebookId,
            name: menu.text
          }]
    };
  });

  goalDefinitions.value = nextGoals;
  closeDocumentTabContextMenu();
  await saveGoalDefinitions(nextGoals);
  await validateDocumentSelection();
}

async function openGoalManagerFromTabMenu(): Promise<void> {
  closeDocumentTabContextMenu();
  await openTaskScopeDialog('goals');
}

async function openTaskGroupQuickCreate(): Promise<void> {
  await ensureTaskGroupsLoaded();
  taskGroupDialogAutoAdd.value = true;
  showTaskGroupDialog.value = true;
}

async function openHeadingAndTaskQuickCreate(): Promise<void> {
  await handleTaskCreateRequested(getDefaultCreateTaskPayload(), { mode: 'heading-task' });
}

function getActionColumnButtonLabel(column: KanbanColumn): string {
  return column.actionKind === 'heading-add' ? t('kanbanView.newHeading') : t('kanbanView.newTag');
}

function handleActionColumnClick(column: KanbanColumn): void {
  if (column.actionKind === 'heading-add') {
    void openHeadingAndTaskQuickCreate();
    return;
  }
  void openTaskGroupQuickCreate();
}

async function openTaskGroupDialog(): Promise<void> {
  await ensureTaskGroupsLoaded();
  taskGroupDialogAutoAdd.value = false;
  showTaskGroupDialog.value = true;
}

function closeTaskGroupDialog(): void {
  showTaskGroupDialog.value = false;
  taskGroupDialogAutoAdd.value = false;
}

function applyExternalDocumentGroups(groups: DocumentGroup[]): void {
  documentGroups.value = sortDocumentGroups((groups || []).map(group => ({
    ...group,
    members: Array.isArray(group.members) ? group.members.map(member => ({ ...member })) : []
  })));
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
    console.error('[KanbanView] Failed to query tagged tasks:', error);
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
      console.error('[KanbanView] Failed to clear task group attrs:', error);
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
    invalidateTableFilters();
  }

}

async function handleTaskGroupSave(payload: TaskGroupDialogSavePayload): Promise<void> {
  const groups = Array.isArray(payload?.groups) ? payload.groups : [];
  kanbanGroupColumnOrder.value = normalizeTaskGroupOrderIds(payload?.orderIds);
  const removedGroupIds = collectRemovedGroupIds(taskGroups.value, groups);
  // Optimistically update so UI reflects changes immediately
  const nextGroups = (groups || []).map(group => ({ ...group }));
  taskGroups.value = nextGroups;
  eventBus.emit(Events.TASK_GROUPS_UPDATED, { groups: nextGroups });
  try {
    await saveTaskGroups(nextGroups);
    await saveUserSettings();
    const refreshedGroups = await loadTaskGroups();
    taskGroups.value = refreshedGroups;
    eventBus.emit(Events.TASK_GROUPS_UPDATED, { groups: refreshedGroups });
    closeTaskGroupDialog();
    if (removedGroupIds.length > 0) {
      await clearRemovedGroupAssignments(removedGroupIds);
      const removedSet = new Set(removedGroupIds);
      activeKanbanGroupFilters.value = activeKanbanGroupFilters.value.filter(id => !removedSet.has(id));
      activeTableGroupFilters.value = activeTableGroupFilters.value.filter(id => !removedSet.has(id));
    }
    if (activeKanbanGroupFilters.value.length > 0 || activeTableGroupFilters.value.length > 0) {
      const visibleGroupIdSet = new Set(taskGroups.value.filter(group => group.hidden !== true).map(group => group.id));
      activeKanbanGroupFilters.value = activeKanbanGroupFilters.value.filter(
        id => id === TASK_GROUP_NONE_ID || visibleGroupIdSet.has(id)
      );
      activeTableGroupFilters.value = activeTableGroupFilters.value.filter(
        id => id === TASK_GROUP_NONE_ID || visibleGroupIdSet.has(id)
      );
    }
  } catch (error) {
    console.error('[KanbanView] Failed to save task groups:', error);
  }
}

function applyExternalTaskGroups(groups: TaskGroup[]): void {
  const nextGroups = (groups || []).map(group => ({ ...group }));
  taskGroups.value = nextGroups;
  hasLoadedTaskGroups.value = true;
  const groupIdSet = new Set(nextGroups.filter(group => group.hidden !== true).map(group => group.id));
  if (activeKanbanGroupFilters.value.length > 0) {
    activeKanbanGroupFilters.value = activeKanbanGroupFilters.value.filter(
      id => id === TASK_GROUP_NONE_ID || groupIdSet.has(id)
    );
  }
  if (activeTableGroupFilters.value.length > 0) {
    activeTableGroupFilters.value = activeTableGroupFilters.value.filter(
      id => id === TASK_GROUP_NONE_ID || groupIdSet.has(id)
    );
  }
}

async function handleTaskScopeSave(payload: TaskScopeDialogSavePayload) {
  const {
    excludedNotebookIds: selectedVisibleExcludedNotebookIds,
    autoRecognizeTaskDate: nextAutoRecognizeTaskDate,
    dateRecognitionKeywords: nextDateRecognitionKeywords,
    taskCompletionSoundEnabled: nextTaskCompletionSoundEnabled,
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
  applyExternalDocumentGroups(nextDocumentGroups);
  eventBus.emit(Events.TASK_SCOPE_UPDATED, { excludedNotebookIds: mergedExcludedNotebookIds });
  eventBus.emit(Events.DOCUMENT_GROUPS_UPDATED, { groups: nextDocumentGroups });
  TaskRepository.setAutoRecognizeTaskDateEnabled(nextAutoRecognizeTaskDate);
  await saveDocumentGroups(nextDocumentGroups);
  await saveGoalDefinitions(nextGoals);
  showTaskScopeDialog.value = false;
  const hasFilterChanges = resetFiltersForExcludedNotebooks() || normalizeInvalidNotebookFilters();

  await updateSettings('taskManager', {
    excludedNotebookIds: mergedExcludedNotebookIds,
    autoRecognizeTaskDate: nextAutoRecognizeTaskDate,
    dateRecognitionKeywords: nextDateRecognitionKeywords,
    taskCompletionSoundEnabled: nextTaskCompletionSoundEnabled,
    showDocumentGroupNotebookPath: nextShowDocumentGroupNotebookPath,
    defaultTaskCreateTarget: defaultTaskCreateTarget as typeof userSettings.taskManager.defaultTaskCreateTarget,
    defaultTaskCreateNotebook
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
  if (!viewSwitcherOptions.value.some(option => option.value === currentView.value)) {
    currentView.value = viewSwitcherOptions.value[0]?.value || 'table';
  }
  if (hasFilterChanges) {
    await saveUserSettings();
  }

  await loadTasks(true);
  await validateDocumentSelection();
}

async function handleGlobalRecognizeTaskDates(): Promise<void> {
  if (isGlobalDateRecognitionRunning.value) {
    return;
  }

  isGlobalDateRecognitionRunning.value = true;
  try {
    const result = await TaskRepository.recognizeDatesForUndatedTasks();
    if (result.scanned === 0) {
      await pushMsg(t('taskManager.noUndatedTasks'), 2200);
      return;
    }

    if (result.updated > 0) {
      if (result.failed > 0) {
        await pushMsg(formatTemplate('kanbanView.dateWriteSuccessWithFailureTemplate', {
          updated: result.updated,
          failed: result.failed
        }), 3200);
      } else {
        await pushMsg(formatTemplate('kanbanView.dateRecognizedWrittenTemplate', {
          updated: result.updated
        }), 2200);
      }
      await loadTasks(true, { silent: true });
      return;
    }

    if (result.recognized === 0) {
      await pushMsg(formatTemplate('kanbanView.scannedNoWritableDateTemplate', {
        scanned: result.scanned
      }), 2800);
      return;
    }

    await pushMsg(formatTemplate('kanbanView.recognizedWriteFailedTemplate', {
      recognized: result.recognized,
      failed: result.failed
    }), 3200);
  } catch (error) {
    console.error('[KanbanView] Global task date recognition failed:', error);
    await pushMsg(t('taskManager.globalDateRecognizeFailed'), 3200);
  } finally {
    isGlobalDateRecognitionRunning.value = false;
  }
}

let eventUnsubscribers: Array<() => void> = [];
let saveSettingsTimer: number | null = null;
let fallbackRefreshTimer: number | null = null;
let kanbanTitleHydrateTimer: number | null = null;
let kernelTaskIndexRefreshTimer: number | null = null;
let isKanbanTitleHydrating = false;
let queuedIncrementalAllowUnknown = false;
const queuedIncrementalForceFreshBlockIds = new Set<string>();
const MAX_INCREMENTAL_BLOCKS_PER_FLUSH = 80;
const dragStatusLocks = new Map<string, Task['status']>();
const dragSyncSuppressUntil = new Map<string, number>();
let repeatReconcileRequestId = 0;
function getCurrentFilterNotebookId(): string {
  switch (currentView.value) {
    case 'kanban':
    case 'quadrant':
      return kanbanFilterType.value;
    case 'list':
      return listFilterType.value;
    case 'table':
    case 'archive-table':
    case 'stats':
      return tableFilterType.value;
    case 'gantt':
      return ganttFilterType.value;
    case 'month':
      return monthFilterType.value;
    case 'week':
      return weekFilterType.value;
    case 'three-day':
    case 'day':
      return dayFilterType.value;
    default:
      return 'all';
  }
}

function getBoardFilterTypeForView(view: TaskViewMode): string {
  return view === 'list' ? listFilterType.value : kanbanFilterType.value;
}

function getBoardFilterDocumentForView(view: TaskViewMode): string {
  return view === 'list' ? listFilterDocument.value : kanbanFilterDocument.value;
}

function shouldShowTaskDocumentTitle(task: Task, documentId: string): boolean {
  const normalizedDocumentId = typeof documentId === 'string' && documentId.trim().length > 0
    ? documentId.trim()
    : 'all';
  if (normalizedDocumentId === 'all') {
    return true;
  }

  const taskDocumentId = typeof task.rootId === 'string' ? task.rootId.trim() : '';
  return taskDocumentId.length > 0
    && taskDocumentId !== normalizedDocumentId
    && taskMatchesDocumentScope(task, normalizedDocumentId, taskDocumentPathLookup.value);
}

function shouldShowBoardTaskDocumentTitle(task: Task, documentId: string): boolean {
  if (activeBoardGroupBy.value === 'document') {
    return false;
  }
  return shouldShowTaskDocumentTitle(task, documentId);
}

function getTaskDocumentIconSvg(task: Task, documentId: string): string {
  const normalizedDocumentId = typeof documentId === 'string' && documentId.trim().length > 0
    ? documentId.trim()
    : 'all';
  if (normalizedDocumentId === 'all') {
    return '';
  }
  return shouldShowTaskDocumentTitle(task, normalizedDocumentId)
    ? DESCENDANT_DOCUMENT_ICON_SVG
    : '';
}

const sourceFilterViewModes = new Set<TaskViewMode>([
  'kanban',
  'list',
  'quadrant',
  'table',
  'archive-table',
  'stats',
  'gantt',
  'month',
  'week',
  'three-day',
  'day'
]);

const showSourceFilterBar = computed(() => sourceFilterViewModes.has(currentView.value));

const activeSourceFilterType = computed<string>({
  get() {
    return getCurrentFilterNotebookId();
  },
  set(value) {
    const nextValue = String(value || 'all');
    switch (currentView.value) {
      case 'kanban':
      case 'quadrant':
        kanbanFilterType.value = nextValue;
        break;
      case 'list':
        listFilterType.value = nextValue;
        break;
      case 'table':
      case 'archive-table':
      case 'stats':
        tableFilterType.value = nextValue;
        break;
      case 'gantt':
        ganttFilterType.value = nextValue;
        break;
      case 'month':
        monthFilterType.value = nextValue;
        break;
      case 'week':
        weekFilterType.value = nextValue;
        break;
      case 'three-day':
      case 'day':
        dayFilterType.value = nextValue;
        break;
    }
  }
});

const activeBoardGroupBy = computed<TaskViewGroupMode>({
  get() {
    // Milestone overview always uses document columns. Selecting a concrete
    // document restores the grouping chosen from the task group menu.
    if (isTaskViewMilestoneOverview.value) {
      return 'document';
    }
    if (currentView.value === 'list') {
      return listGroupBy.value;
    }
    return kanbanGroupBy.value;
  },
  set(value) {
    if (currentView.value === 'list') {
      listGroupBy.value = value;
      return;
    }
    kanbanGroupBy.value = value;
  }
});
const activeTableGroupBy = computed<TaskViewGroupMode>(() =>
  isTaskViewMilestoneOverview.value && currentView.value === 'table'
    ? 'document'
    : tableGroupBy.value
);

function shouldHideCompletedOnlyDocumentTabs(view: TaskViewMode): boolean {
  return !showCompletedTasks.value && (view === 'kanban' || view === 'list' || view === 'quadrant' || view === 'table');
}

type DocumentOptionsTaskMatcher = (task: Task) => boolean;

const documentScopeMatcherDocuments = computed(() => {
  const documents = new Map<string, DocumentScopeTreeDocument>();
  allDocumentGroupDocuments.value.forEach(document => {
    documents.set(`${document.notebookId}:${document.id}`, document);
  });
  // `listDocsByPath` provides the authoritative parent IDs for freshly
  // created documents. Prefer it over the SQL document row when available.
  documentScopeTreeDocumentsByNotebook.value.forEach(notebookDocuments => {
    notebookDocuments.forEach(document => {
      documents.set(`${document.notebookId}:${document.id}`, document);
    });
  });
  return Array.from(documents.values());
});
const {
  matchesMember: matchesTaskDocumentMemberScope,
  isExcluded: isTaskExcludedFromDocumentScope
} = useDocumentScopeMatcher({
  documents: documentScopeMatcherDocuments,
  documentGroups,
  goals: goalDefinitions,
  taskPathLookup: taskDocumentPathLookup,
  logPrefix: '[KanbanView]'
});

function getKanbanScopedGoalIds(task: Task): string[] {
  return goalDefinitions.value
    .filter(goal => isTaskDirectGoalMember(goal, task)
      || (!isTaskExcludedFromDocumentScope(task, goal.excludedDocumentKeys)
        && goal.members.some(member => matchesTaskDocumentMemberScope(task, member))))
    .map(goal => goal.id);
}

function scheduleDocumentScopeTreeRetryIfNeeded(): void {
  const loadedNotebookIds = new Set(documentScopeTreeDocumentsByNotebook.value.keys());
  const treeKeys = new Set(
    Array.from(documentScopeTreeDocumentsByNotebook.value.values())
      .flat()
      .map(document => `${document.notebookId}:${document.id}`)
  );
  const missingTaskDocumentKeys = tasks.value
    .filter(task => task.type === 'block' && !!task.notebookId && !!task.rootId && loadedNotebookIds.has(task.notebookId))
    .map(task => `${task.notebookId}:${task.rootId}`)
    .filter(key => !treeKeys.has(key));

  // A successful load resolves the retry state; retaining it would make a
  // later, unrelated creation of the same document key skip its safety retry.
  documentScopeTreeRetryCounts.forEach((_count, key) => {
    if (treeKeys.has(key)) {
      documentScopeTreeRetryCounts.delete(key);
    }
  });

  const retryable = missingTaskDocumentKeys.filter(key => {
    const retries = documentScopeTreeRetryCounts.get(key) || 0;
    return retries < 2;
  });
  if (retryable.length === 0) {
    return;
  }
  retryable.forEach(key => {
    documentScopeTreeRetryCounts.set(key, (documentScopeTreeRetryCounts.get(key) || 0) + 1);
  });
  if (documentScopeTreeRetryTimer !== null) {
    clearTimeout(documentScopeTreeRetryTimer);
  }
  documentScopeTreeRetryTimer = window.setTimeout(() => {
    documentScopeTreeRetryTimer = null;
    void loadDocumentScopeTree(true);
  }, 420);
}

function getDocumentTabScopeStorageKey(sourceValue: string): string {
  const viewScope = isCalendarTaskViewMode(currentView.value) ? 'calendar' : currentView.value;
  return `${viewScope}:${sourceValue}`;
}

function matchesTaskBySource(task: Task, sourceValue: string): boolean {
  if (!isTaskIncludedByNotebookScope(task)) {
    return false;
  }
  const source = parseDocumentSource(sourceValue);
  if (source.kind === 'notebook' && task.notebookId !== source.id) {
    return false;
  }
  if (source.kind !== 'group' && source.kind !== 'goal') {
    return true;
  }
  if (source.kind === 'goal') {
    const goal = goalDefinitionsById.value.get(source.id);
    return isTaskDirectGoalMember(goal, task)
      || (!!goal
        && !isTaskExcludedFromDocumentScope(task, goal.excludedDocumentKeys)
        && goal.members.some(member => matchesTaskDocumentMemberScope(task, member)));
  }

  const group = documentGroupsById.value.get(source.id);
  if (!group || isTaskExcludedFromDocumentScope(task, group.excludedDocumentKeys)) {
    return false;
  }
  return group.members.some(member => matchesTaskDocumentMemberScope(task, member));
}

function matchesTaskBySourceAndDocument(task: Task, sourceValue: string, documentId: string = 'all'): boolean {
  if (!matchesTaskBySource(task, sourceValue)) {
    return false;
  }
  const documentScope = documentTabScopesBySource.value[getDocumentTabScopeStorageKey(sourceValue)];
  if (documentScope && !taskMatchesDocumentScope(task, documentScope.id, taskDocumentPathLookup.value, documentScope)) {
    return false;
  }
  return documentId === 'all'
    || taskMatchesDocumentScope(task, documentId, taskDocumentPathLookup.value);
}

function matchesDateViewDocumentCandidate(task: Task, sourceValue: string): boolean {
  if (task.type !== 'block') return false;
  if (task.archived) return false;
  if (!task.startDate && !task.dueDate) return false;
  if (!matchesTaskBySourceAndDocument(task, sourceValue)) {
    return false;
  }
  return true;
}

function collectCalendarSubtaskNodeIds(subtasks: SubTask[] | undefined, result: Set<string>): void {
  if (!Array.isArray(subtasks) || subtasks.length === 0) {
    return;
  }
  for (const subtask of subtasks) {
    const nodeId = typeof subtask.nodeId === 'string' ? subtask.nodeId.trim() : '';
    if (nodeId) {
      result.add(nodeId);
    }
    collectCalendarSubtaskNodeIds(subtask.subtasks, result);
  }
}

const ganttSubtaskNodeIds = computed(() => {
  const subtaskNodeIds = new Set<string>();
  tasks.value.forEach(task => collectCalendarSubtaskNodeIds(task.subtasks, subtaskNodeIds));
  return subtaskNodeIds;
});

const ganttSubtaskRepeatSeriesIds = computed(() => {
  const subtaskRepeatSeriesIds = new Set<string>();
  tasks.value.forEach((task) => {
    const blockId = typeof task.blockId === 'string' ? task.blockId.trim() : '';
    const repeatSeriesId = typeof task.repeatSeriesId === 'string' ? task.repeatSeriesId.trim() : '';
    if (!task.isVirtual && blockId && ganttSubtaskNodeIds.value.has(blockId) && repeatSeriesId) {
      subtaskRepeatSeriesIds.add(repeatSeriesId);
    }
  });
  return subtaskRepeatSeriesIds;
});

function isGanttTopLevelTask(task: Task): boolean {
  const blockId = typeof task.blockId === 'string' ? task.blockId.trim() : '';
  if (blockId && ganttSubtaskNodeIds.value.has(blockId)) {
    return false;
  }

  const repeatSeriesId = typeof task.repeatSeriesId === 'string' ? task.repeatSeriesId.trim() : '';
  if (task.isVirtual && repeatSeriesId && ganttSubtaskRepeatSeriesIds.value.has(repeatSeriesId)) {
    return false;
  }

  return true;
}

function matchesKanbanFiltersByDocumentScope(
  task: Task,
  includeDocumentFilter: boolean,
  view: TaskViewMode = currentView.value
): boolean {
  if (!hasVisibleTaskTitle(task.title)) return false;
  if (task.type !== 'block') return false;
  if (task.archived) return false;
  if (!task.isVirtual && task.repeatSeriesId && virtualRepeatSeriesIds.value.has(task.repeatSeriesId)) {
    return false;
  }
  if (task.isVirtual && !visibleVirtualRepeatTaskIds.value.has(task.id)) return false;
  if (!matchesTaskBySourceAndDocument(
    task,
    getBoardFilterTypeForView(view),
    includeDocumentFilter ? getBoardFilterDocumentForView(view) : 'all'
  )) {
    return false;
  }
  if (!showCompletedTasks.value && isTaskCompletedVisual(task)) {
    return false;
  }
  if (activeKanbanStatusFilters.value.length > 0) {
    const status = getTaskVisualStatus(task);
    if (!activeKanbanStatusFilters.value.includes(status)) {
      return false;
    }
  }
  if (activeKanbanPriorityFilters.value.length > 0 && !activeKanbanPriorityFilters.value.includes(task.priority)) {
    return false;
  }
  if (!matchesTaskTagFilter(task.tags, task.groupId, activeKanbanGroupFilters.value, TASK_GROUP_NONE_ID)) {
    return false;
  }
  if (activeKanbanDueFilters.value.length > 0 && !activeKanbanDueFilters.value.some(filter => matchesKanbanDueFilter(task, filter))) {
    return false;
  }
  if (activeKanbanUpdatedFilters.value.length > 0 && !activeKanbanUpdatedFilters.value.some(filter => matchesKanbanUpdatedFilter(task, filter))) {
    return false;
  }
  if (activeKanbanExtraFilters.value.length > 0) {
    const wantsDescription = activeKanbanExtraFilters.value.includes('hasDescription');
    const wantsSubtasks = activeKanbanExtraFilters.value.includes('hasSubtasks');
    const wantsFocusEstimate = activeKanbanExtraFilters.value.includes('hasFocusEstimate');
    const hasDescription = typeof task.description === 'string' && task.description.trim().length > 0;
    const hasSubtasks = Array.isArray(task.subtasks) && task.subtasks.length > 0;
    const hasFocusEstimate = !!task.focusEstimate;

    if ((wantsDescription && hasDescription) || (wantsSubtasks && hasSubtasks) || (wantsFocusEstimate && hasFocusEstimate)) {
      return true;
    }
    if (wantsDescription || wantsSubtasks || wantsFocusEstimate) {
      return false;
    }
  }
  return true;
}

function getDocumentTabTaskMatcher(view: TaskViewMode): DocumentOptionsTaskMatcher {
  switch (view) {
    case 'kanban':
    case 'quadrant':
    case 'list':
      return (task) => matchesKanbanFiltersByDocumentScope(task, false, view);
    case 'table':
      return (task) => matchesTableFiltersByArchivedState(task, false, false);
    case 'archive-table':
      return (task) => matchesTableFiltersByArchivedState(task, true, false);
    case 'stats':
      return (task) =>
        task.type === 'block'
        && task.isVirtual !== true
        && matchesTaskBySourceAndDocument(task, tableFilterType.value);
    case 'gantt':
      return (task) => matchesGanttDocumentCandidate(task, ganttFilterType.value);
    case 'month':
      return (task) => matchesDateViewDocumentCandidate(task, monthFilterType.value);
    case 'week':
      return (task) => matchesDateViewDocumentCandidate(task, weekFilterType.value);
    case 'three-day':
    case 'day':
      return (task) => matchesDateViewDocumentCandidate(task, dayFilterType.value);
    default:
      return () => true;
  }
}

function matchesGanttDocumentCandidate(task: Task, sourceValue: string): boolean {
  if (task.type !== 'block') return false;
  if (task.archived) return false;
  if (!isGanttTopLevelTask(task)) return false;
  if (!task.isVirtual && task.repeatSeriesId && virtualRepeatSeriesIds.value.has(task.repeatSeriesId)) {
    return false;
  }

  return matchesTaskBySourceAndDocument(task, sourceValue);
}

function getDocumentEntriesByNotebook(
  notebookId: string,
  options: { includeNotebookName?: boolean; excludeCompletedOnlyDocs?: boolean; taskMatcher?: DocumentOptionsTaskMatcher } = {}
): Array<{ id: string; name: string; notebookId: string }> {
  const includeNotebookName = options.includeNotebookName === true;
  const excludeCompletedOnlyDocs = options.excludeCompletedOnlyDocs === true;
  const taskMatcher = typeof options.taskMatcher === 'function' ? options.taskMatcher : null;
  const notebookNameById = includeNotebookName
    ? new Map(notebooks.value.map(notebook => [notebook.id, notebook.name]))
    : null;
  const docs = new Map<string, { hPath: string; name: string; notebookId: string; hasVisibleActiveTask: boolean }>();
  for (const task of tasks.value) {
    if (task.type !== 'block' || !task.rootId) {
      continue;
    }
    const taskNotebookId = typeof task.notebookId === 'string' ? task.notebookId.trim() : '';
    if (!taskNotebookId) {
      continue;
    }
    if (notebookId !== 'all' && taskNotebookId !== notebookId) {
      continue;
    }
    if (taskMatcher && !taskMatcher(task)) {
      continue;
    }

    const hPath = typeof task.hPath === 'string' ? task.hPath.trim() : '';
    const visibleEntries: Array<{ id: string; path?: string; name?: string }> = [{
      id: task.rootId,
      path: hPath,
      name: documentScopeMetadataByRootId.value.get(task.rootId)?.name
    }];

    const markVisibleActiveTask = !task.archived && (!excludeCompletedOnlyDocs || !isTaskCompletedVisual(task));
    visibleEntries.forEach((entry) => {
      const documentId = entry.id;
      let documentMeta = docs.get(documentId);
      if (!documentMeta) {
        const fallbackMetadata = documentScopeMetadataByRootId.value.get(documentId);
        documentMeta = {
          hPath: entry.path || fallbackMetadata?.path || '',
          name: entry.name || fallbackMetadata?.name || '',
          notebookId: taskNotebookId,
          hasVisibleActiveTask: false
        };
        docs.set(documentId, documentMeta);
      }
      if (!documentMeta.hPath && entry.path) {
        documentMeta.hPath = entry.path;
      }
      const fallbackMetadata = documentScopeMetadataByRootId.value.get(documentId);
      if (!documentMeta.hPath && fallbackMetadata?.path) {
        documentMeta.hPath = fallbackMetadata.path;
      }
      if (!documentMeta.name && (entry.name || fallbackMetadata?.name)) {
        documentMeta.name = entry.name || fallbackMetadata?.name || '';
      }
      if (markVisibleActiveTask) {
        documentMeta.hasVisibleActiveTask = true;
      }
    });
  }

  if (excludeCompletedOnlyDocs) {
    const activeDocumentPaths = Array.from(docs.values())
      .filter(meta => meta.hasVisibleActiveTask)
      .map(meta => meta.hPath)
      .filter(path => path.trim().length > 0);
    if (activeDocumentPaths.length > 0) {
      docs.forEach((meta) => {
        if (meta.hasVisibleActiveTask || !meta.hPath) {
          return;
        }
        meta.hasVisibleActiveTask = activeDocumentPaths.some(activePath =>
          activePath !== meta.hPath && isDocumentPathInScope(activePath, meta.hPath)
        );
      });
    }
  }

  return Array.from(docs.entries())
    .filter(([, meta]) => !excludeCompletedOnlyDocs || meta.hasVisibleActiveTask)
    .map(([id, meta]) => {
      const documentName = resolveDocumentDisplayName({ id, path: meta.hPath, name: meta.name });
      const notebookName = notebookNameById?.get(meta.notebookId) || '';
      const name = includeNotebookName && notebookName
        ? `${notebookName} / ${documentName}`
        : documentName;
      return {
        id,
        name,
        notebookId: meta.notebookId
      };
    })
    .sort((a, b) => {
      const timeDiff = getDocumentCreationSortKey(b.id) - getDocumentCreationSortKey(a.id);
      if (timeDiff !== 0) return timeDiff;
      return a.name.localeCompare(b.name, 'zh-CN');
    });
}

function getDocumentEntriesBySource(
  sourceValue: string,
  options: { includeNotebookName?: boolean; excludeCompletedOnlyDocs?: boolean; taskMatcher?: DocumentOptionsTaskMatcher } = {}
): Array<{ id: string; name: string; notebookId: string }> {
  const source = parseDocumentSource(sourceValue);
  if (source.kind !== 'group' && source.kind !== 'goal') {
    return getDocumentEntriesByNotebook(source.kind === 'notebook' ? source.id : 'all', options);
  }

  const sourceGoal = source.kind === 'goal'
    ? goalDefinitionsById.value.get(source.id) || null
    : null;
  const sourceMembers: DocumentGroupMember[] =
    source.kind === 'group'
      ? (documentGroupsById.value.get(source.id)?.members || [])
      : (sourceGoal?.members || []);
  if (sourceMembers.length === 0 && !sourceGoal) {
    return [];
  }

  const allDocs = getDocumentEntriesByNotebook('all', {
    includeNotebookName: options.includeNotebookName === true,
    excludeCompletedOnlyDocs: options.excludeCompletedOnlyDocs,
    taskMatcher: options.taskMatcher
  });
  // `allDocs` already contains the actual root documents of tasks that match
  // this document-group or goal scope. Returning the configured member list
  // below would replace a new descendant document with its selected ancestor
  // and lose its tab.
  if (source.kind === 'group' || source.kind === 'goal') {
    return allDocs;
  }
  const allDocsByKey = new Map<string, { id: string; name: string; notebookId: string }>();
  allDocs.forEach((document) => {
    allDocsByKey.set(`${document.notebookId}:${document.id}`, document);
  });

  const includeNotebookName = options.includeNotebookName === true;
  const result: Array<{ id: string; name: string; notebookId: string }> = [];
  const seen = new Set<string>();

  const addDocument = (notebookId: string | undefined, documentId: string | undefined): void => {
    const normalizedNotebookId = typeof notebookId === 'string' ? notebookId.trim() : '';
    const normalizedDocumentId = typeof documentId === 'string' ? documentId.trim() : '';
    if (!normalizedNotebookId || !normalizedDocumentId) {
      return;
    }
    const key = `${normalizedNotebookId}:${normalizedDocumentId}`;
    if (!enabledNotebookNameById.value.has(normalizedNotebookId) || seen.has(key)) {
      return;
    }
    const existing = allDocsByKey.get(key);
    if (!existing) {
      return;
    }
    seen.add(key);
    const notebookName = enabledNotebookNameById.value.get(normalizedNotebookId) || normalizedNotebookId;
    result.push({
      id: existing.id,
      notebookId: existing.notebookId,
      name: includeNotebookName ? `${notebookName} / ${existing.name}` : existing.name
    });
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

  return result.sort((a, b) => {
    const timeDiff = getDocumentCreationSortKey(b.id) - getDocumentCreationSortKey(a.id);
    if (timeDiff !== 0) {
      return timeDiff;
    }
    return a.name.localeCompare(b.name, 'zh-CN');
  });
}

function getDocumentIdsBySource(
  sourceValue: string,
  options: { excludeCompletedOnlyDocs?: boolean; taskMatcher?: DocumentOptionsTaskMatcher } = {}
): string[] {
  return getDocumentEntriesBySource(sourceValue, {
    excludeCompletedOnlyDocs: options.excludeCompletedOnlyDocs,
    taskMatcher: options.taskMatcher
  }).map(doc => doc.id);
}

function getTaskDocumentIcon(task: Task): string {
  const rootId = typeof task.rootId === 'string' ? task.rootId.trim() : '';
  if (rootId) {
    const mapped = documentIconByRootId.value.get(rootId);
    if (mapped) {
      return mapped;
    }
  }
  const fallback = typeof task.icon === 'string' ? task.icon.trim() : '';
  return fallback || '📄';
}

function getTaskDocumentTitle(task: Task): string {
  const rootId = typeof task.rootId === 'string' ? task.rootId.trim() : '';
  if (rootId) {
    const mapped = documentTitleByRootId.value.get(rootId);
    if (mapped) {
      return mapped;
    }
  }
  const hPath = typeof task.hPath === 'string' ? task.hPath.trim() : '';
  return hPath
    ? resolveDocumentDisplayName({ id: rootId || task.id, path: hPath })
    : '';
}

async function refreshTaskDocumentIcons(): Promise<void> {
  const seq = ++documentIconRefreshSeq;
  const rootIds = Array.from(new Set(
    tasks.value
      .filter(task => task.type === 'block')
      .map(task => (typeof task.rootId === 'string' ? task.rootId.trim() : ''))
      .filter(id => id.length > 0)
  ));
  if (rootIds.length === 0) {
    if (seq === documentIconRefreshSeq) {
      documentIconByRootId.value = new Map();
    }
    return;
  }

  const nextMap = new Map<string, string>();
  try {
    const rootIdSql = rootIds.map(id => `'${id.replace(/'/g, "''")}'`).join(',');
    const rows = await sql(`
      SELECT *
      FROM blocks
      WHERE id IN (${rootIdSql})
    `) as Array<Record<string, unknown>>;
    for (const row of rows) {
      const rowId = typeof row?.id === 'string' ? row.id.trim() : '';
      if (!rowId) {
        continue;
      }
      const icon = extractDocumentIconFromBlockRow(row);
      if (icon) {
        nextMap.set(rowId, icon);
      }
    }
  } catch {
    // Ignore SQL failures and continue with API/DOM fallback.
  }

  const unresolvedRootIds = rootIds.filter(id => !nextMap.has(id));
  if (unresolvedRootIds.length > 0) {
    const attrsList = await Promise.all(unresolvedRootIds.map(async (rootId) => {
      try {
        const attrs = await getBlockAttrs(rootId);
        return { rootId, attrs };
      } catch {
        return { rootId, attrs: null as Record<string, string> | null };
      }
    }));
    for (const item of attrsList) {
      if (!item.attrs) {
        continue;
      }
      const attrIcon = normalizeDocumentIconValue(item.attrs.icon);
      if (attrIcon) {
        nextMap.set(item.rootId, attrIcon);
      }
    }
  }

  const domFallbackIds = rootIds.filter(id => !nextMap.has(id));
  if (domFallbackIds.length > 0) {
    const domList = await Promise.all(domFallbackIds.map(async (rootId) => {
      try {
        const dom = await getBlockDOM(rootId);
        return { rootId, dom: dom?.dom || '' };
      } catch {
        return { rootId, dom: '' };
      }
    }));
    for (const item of domList) {
      const domIcon = extractDocumentIconFromDom(item.dom);
      if (domIcon) {
        nextMap.set(item.rootId, domIcon);
      }
    }
  }

  if (seq !== documentIconRefreshSeq) {
    return;
  }
  documentIconByRootId.value = nextMap;
}

async function refreshTaskDocumentMetadata(): Promise<void> {
  const seq = ++documentMetadataRefreshSeq;
  const unresolvedRootIds = Array.from(new Set(
    tasks.value
      .filter(task =>
        task.type === 'block'
        && typeof task.rootId === 'string'
        && task.rootId.trim().length > 0
        && (!task.hPath || task.hPath.trim().length === 0)
      )
      .map(task => task.rootId!.trim())
  ));
  if (unresolvedRootIds.length === 0) {
    if (seq === documentMetadataRefreshSeq) {
      documentMetadataByRootId.value = new Map();
    }
    return;
  }

  try {
    const nextMap = await loadRootDocumentMetadata(unresolvedRootIds);
    if (seq !== documentMetadataRefreshSeq) {
      return;
    }
    documentMetadataByRootId.value = nextMap;
  } catch {
    if (seq === documentMetadataRefreshSeq) {
      documentMetadataByRootId.value = new Map();
    }
  }
}

function scheduleTaskDocumentIconRefresh(delay = 80): void {
  if (documentIconRefreshTimer !== null) {
    clearTimeout(documentIconRefreshTimer);
  }
  documentIconRefreshTimer = window.setTimeout(() => {
    documentIconRefreshTimer = null;
    void refreshTaskDocumentIcons();
  }, delay);
}

function scheduleTaskDocumentMetadataRefresh(delay = 80): void {
  if (documentMetadataRefreshTimer !== null) {
    clearTimeout(documentMetadataRefreshTimer);
  }
  documentMetadataRefreshTimer = window.setTimeout(() => {
    documentMetadataRefreshTimer = null;
    void refreshTaskDocumentMetadata();
  }, delay);
}

function toFilterDocumentOptions(
  sourceValue: string,
  options: { excludeCompletedOnlyDocs?: boolean; taskMatcher?: DocumentOptionsTaskMatcher } = {}
): DocumentFilterOption[] {
  const source = parseDocumentSource(sourceValue);
  const includeNotebookName = source.kind === 'all'
    || ((source.kind === 'group' || source.kind === 'goal') && showDocumentGroupNotebookPath.value);
  return [
    { value: 'all', text: t('taskManager.all') },
    ...getDocumentEntriesBySource(sourceValue, {
      includeNotebookName,
      excludeCompletedOnlyDocs: options.excludeCompletedOnlyDocs,
      taskMatcher: options.taskMatcher
    }).map(doc => ({
      value: doc.id,
      text: doc.name,
      notebookId: doc.notebookId,
      notebookName: enabledNotebookNameById.value.get(doc.notebookId) || ''
    }))
  ];
}

function toQuickCreateDocumentOptions(notebookId: string): Array<{ value: string; text: string }> {
  if (notebookId === 'all') {
    return [{ value: 'all', text: t('taskManager.all') }];
  }
  return toFilterDocumentOptions(notebookId);
}

const activeDocumentTabScope = computed(() =>
  documentTabScopesBySource.value[getDocumentTabScopeStorageKey(getCurrentFilterNotebookId())] || null
);
const documentOptions = computed(() => {
  const scope = activeDocumentTabScope.value;
  const options = toFilterDocumentOptions(getCurrentFilterNotebookId(), {
    excludeCompletedOnlyDocs: shouldHideCompletedOnlyDocumentTabs(currentView.value),
    taskMatcher: getDocumentTabTaskMatcher(currentView.value)
  });
  return options
    .filter(option => option.value === 'all' || option.value !== scope?.id)
    .map(option => {
      if (option.value === 'all' && scope) {
        return { ...option, text: scope.name };
      }
      if (scope && option.notebookName) {
        return {
          ...option,
          text: option.text.replace(`${option.notebookName} / `, '')
        };
      }
      return option;
    });
});
const quickCreateDocumentOptions = computed(() => toQuickCreateDocumentOptions(quickCreateNotebookId.value));
const activeMilestoneSource = computed(() =>
  currentView.value === 'kanban'
    ? kanbanFilterType.value
    : currentView.value === 'list'
      ? listFilterType.value
      : currentView.value === 'table' || currentView.value === 'archive-table'
        ? tableFilterType.value
      : ganttFilterType.value
);
const isGoalMilestoneSource = computed(() => parseDocumentSource(activeMilestoneSource.value).kind === 'goal');
const showMilestoneModeSwitch = computed(() =>
  (currentView.value === 'gantt' && isGoalMilestoneSource.value)
  || ((currentView.value === 'kanban' || currentView.value === 'list' || currentView.value === 'table') && isGoalMilestoneSource.value)
);
const canReorderDocumentTabs = computed(() =>
  (currentView.value === 'gantt'
    || ((currentView.value === 'kanban' || currentView.value === 'list' || currentView.value === 'table') && isGoalMilestoneSource.value))
  && isGoalMilestoneSource.value
  && ganttMilestonesEnabled.value
  && activeMilestoneSource.value !== 'all'
);
const activeGanttDocumentOrder = computed(() =>
  ganttDocumentOrderBySource.value[activeMilestoneSource.value] || []
);
const isTaskViewMilestoneOverview = computed(() =>
  (currentView.value === 'kanban' || currentView.value === 'list' || currentView.value === 'table')
  && isGoalMilestoneSource.value
  && ganttMilestonesEnabled.value
  && currentDocumentFilter.value === 'all'
);
const tableDocumentGroupOrder = computed(() =>
  currentView.value === 'table' && isTaskViewMilestoneOverview.value
    ? visibleDocumentOptions.value
      .filter(option => option.value !== 'all')
      .map(option => option.value)
    : []
);
const milestoneDocumentOptions = computed(() => {
  if (!canReorderDocumentTabs.value) {
    return documentOptions.value;
  }
  return documentOptions.value.filter(option => {
    if (option.value === 'all') return true;
    return tasks.value.some(task =>
      task.rootId === option.value
      && task.notebookId === option.notebookId
      && matchesGanttDocumentCandidate(task, activeMilestoneSource.value)
    );
  });
});
const visibleDocumentOptions = computed(() => {
  const options = milestoneDocumentOptions.value.filter(option =>
    option.value === 'all' || !hiddenDocumentTabIds.value.has(option.value)
  );
  if (!canReorderDocumentTabs.value) {
    return options;
  }

  const orderIndex = new Map(activeGanttDocumentOrder.value.map((id, index) => [id, index]));
  return [...options].sort((left, right) => {
    if (left.value === 'all') return -1;
    if (right.value === 'all') return 1;
    const leftOrder = orderIndex.get(left.value);
    const rightOrder = orderIndex.get(right.value);
    if (leftOrder !== undefined || rightOrder !== undefined) {
      return (leftOrder ?? Number.MAX_SAFE_INTEGER) - (rightOrder ?? Number.MAX_SAFE_INTEGER);
    }
    return 0;
  });
});
const ganttDocumentSectionOrder = computed(() => {
  if (!canReorderDocumentTabs.value) {
    return [];
  }
  return getOrderedGanttDocumentIds()
    .map(documentId => {
      const option = milestoneDocumentOptions.value.find(candidate => candidate.value === documentId);
      return option?.notebookId ? `${option.notebookId}:${documentId}` : documentId;
    });
});
const ganttSelectedDocumentSection = computed<{ id: string; title: string } | undefined>(() => {
  if (!canReorderDocumentTabs.value || ganttFilterDocument.value === 'all') {
    return undefined;
  }
  const option = milestoneDocumentOptions.value.find(candidate => candidate.value === ganttFilterDocument.value);
  if (!option?.notebookId) {
    return undefined;
  }
  return {
    id: `${option.notebookId}:${option.value}`,
    title: option.text
  };
});
const documentTabPopoverOptions = computed(() =>
  milestoneDocumentOptions.value
    .filter(option => option.value !== 'all')
    .map(option => ({
      ...option,
      hidden: hiddenDocumentTabIds.value.has(option.value)
    }))
);

const currentDocumentFilter = computed<string>({
  get() {
    switch (currentView.value) {
      case 'kanban':
      case 'quadrant':
        return kanbanFilterDocument.value;
      case 'list':
        return listFilterDocument.value;
      case 'table':
      case 'archive-table':
      case 'stats':
        return tableFilterDocument.value;
      case 'gantt':
        return ganttFilterDocument.value;
      case 'month':
        return monthFilterDocument.value;
      case 'week':
        return weekFilterDocument.value;
      case 'three-day':
      case 'day':
        return dayFilterDocument.value;
      default:
        return 'all';
    }
  },
  set(value) {
    switch (currentView.value) {
      case 'kanban':
      case 'quadrant':
        kanbanFilterDocument.value = value;
        break;
      case 'list':
        listFilterDocument.value = value;
        break;
      case 'table':
      case 'archive-table':
      case 'stats':
        tableFilterDocument.value = value;
        break;
      case 'gantt':
        ganttFilterDocument.value = value;
        break;
      case 'month':
        monthFilterDocument.value = value;
        break;
      case 'week':
        weekFilterDocument.value = value;
        break;
      case 'three-day':
      case 'day':
        dayFilterDocument.value = value;
        break;
      default:
        break;
    }
  }
});

const statsViewTasks = computed(() =>
  tasks.value.filter(task =>
    task.type === 'block'
    && task.isVirtual !== true
    && matchesTaskBySourceAndDocument(task, tableFilterType.value, tableFilterDocument.value)
  )
);
const statsViewSourceLabel = computed(() =>
  sourceOptions.value.find(option => option.value === tableFilterType.value)?.text || t('taskManager.all')
);
const statsViewDocumentLabel = computed(() => {
  if (tableFilterDocument.value === 'all') {
    return t('taskManager.all');
  }
  const options = toFilterDocumentOptions(tableFilterType.value, {
    taskMatcher: getDocumentTabTaskMatcher('stats')
  });
  return options.find(option => option.value === tableFilterDocument.value)?.text || t('taskManager.all');
});

async function handleStatsDrilldown(payload: StatsDrilldownPayload): Promise<void> {
  clearTableFilters();

  if (tableSearchQuery.value) {
    tableSearchQuery.value = '';
  }

  if (payload.includeCompleted && !showCompletedTasks.value) {
    await updateSettings('taskManager', {
      showCompletedTasks: true
    });
    await validateDocumentSelection();
  }

  activeTableStatusFilters.value = Array.isArray(payload.statuses) ? [...payload.statuses] : [];
  activeTableDueFilters.value = payload.due ? [payload.due] : [];
  activeTableUpdatedFilters.value = payload.updated ? [payload.updated] : [];

  currentView.value = payload.target === 'archive-table' ? 'archive-table' : 'table';
}

function handleStatsDetailOpen(payload: StatsDetailPayload): void {
  openHabitTrackerPanel(payload);
}

const showDocumentTabs = computed(() =>
  visibleDocumentOptions.value.length > 1 || activeDocumentTabScope.value !== null
);
const showDocumentTabsDropdown = computed(() => showSourceFilterBar.value);
const showDocumentTabsRow = computed(() => showDocumentTabs.value || showDocumentTabsDropdown.value);
const documentTabContextGroupIds = computed(() => {
  const menu = documentTabContextMenu.value;
  if (!menu) {
    return [];
  }
  return sortedDocumentGroups.value
    .filter(group => group.members.some(member =>
      member.documentId === menu.documentId && member.notebookId === menu.notebookId
    ))
    .map(group => group.id);
});
const documentTabContextGoalIds = computed(() => {
  const menu = documentTabContextMenu.value;
  if (!menu) {
    return [];
  }
  return goalDefinitions.value
    .filter(goal => goal.members.some(member =>
      member.documentId === menu.documentId && member.notebookId === menu.notebookId
    ))
    .map(goal => goal.id);
});
const documentTabContextMenuStyle = computed<Record<string, string>>(() => {
  const menu = documentTabContextMenu.value;
  if (!menu) {
    return {};
  }
  return {
    left: `${Math.round(menu.x)}px`,
    top: `${Math.round(menu.y)}px`
  };
});
const activeTaskViewGroupMode = computed<TaskViewGroupMode>(() =>
  isBoardTaskView.value ? activeBoardGroupBy.value : activeTableGroupBy.value
);
const currentTaskViewGroupOptions = computed(() => {
  if (currentView.value === 'quadrant') {
    return [];
  }
  return isBoardTaskView.value ? kanbanGroupModeOptions : tableGroupModeOptions;
});

function closeTaskViewGroupMenu(): void {
  taskViewGroupMenuVisible.value = false;
}

function toggleAllTableTaskDetailsFromMenu(): void {
  tableViewRef.value?.toggleAllTaskDetails();
  closeTaskViewGroupMenu();
}

function closeCalendarDisplayMenu(): void {
  calendarDisplayMenuVisible.value = false;
}

function toggleTaskViewGroupMenu(): void {
  const nextVisible = !taskViewGroupMenuVisible.value;
  taskViewGroupMenuVisible.value = nextVisible;
  if (!nextVisible) {
    return;
  }
  closeDocumentTabContextMenu();
  closeDocumentTabsDropdown();
  closeMobileViewSwitcher();
  closeKanbanFilterPopover();
  closeTableFilterPopover();
  closeCalendarDisplayMenu();
}

function toggleCalendarTasksVisible(): void {
  showCalendarTasks.value = !showCalendarTasks.value;
}

function toggleCalendarHabitsVisible(): void {
  showCalendarHabits.value = !showCalendarHabits.value;
}

function toggleCalendarTaskLifelogVisible(): void {
  showCalendarTaskLifelog.value = !showCalendarTaskLifelog.value;
}

function toggleCalendarHabitLifelogVisible(): void {
  showCalendarHabitLifelog.value = !showCalendarHabitLifelog.value;
}

function toggleCalendarFocusLifelogVisible(): void {
  showCalendarFocusLifelog.value = !showCalendarFocusLifelog.value;
}

function toggleCalendarRecordsLifelogVisible(): void {
  showCalendarRecordsLifelog.value = !showCalendarRecordsLifelog.value;
}

function toggleCalendarDisplayOption(key: string): void {
  switch (key) {
    case 'tasks': toggleCalendarTasksVisible(); break;
    case 'habits': toggleCalendarHabitsVisible(); break;
    case 'task': toggleCalendarTaskLifelogVisible(); break;
    case 'habit': toggleCalendarHabitLifelogVisible(); break;
    case 'focus': toggleCalendarFocusLifelogVisible(); break;
    case 'records': toggleCalendarRecordsLifelogVisible(); break;
  }
}

interface CalendarDisplaySettings {
  showTasks: boolean;
  showHabits: boolean;
  showTaskLifelog: boolean;
  showHabitLifelog: boolean;
  showFocusLifelog: boolean;
  showRecordsLifelog: boolean;
  /** Legacy setting, retained only to migrate existing local preferences. */
  showLifelog?: boolean;
}

function loadCalendarDisplaySettings(): CalendarDisplaySettings | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(CALENDAR_DISPLAY_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<CalendarDisplaySettings>;
    return {
      showTasks: parsed.showTasks !== false,
      showHabits: parsed.showHabits === true,
      showTaskLifelog: parsed.showTaskLifelog ?? parsed.showLifelog === true,
      showHabitLifelog: parsed.showHabitLifelog ?? parsed.showLifelog === true,
      showFocusLifelog: parsed.showFocusLifelog ?? parsed.showLifelog === true,
      showRecordsLifelog: parsed.showRecordsLifelog ?? parsed.showLifelog === true
    };
  } catch (error) {
    console.warn('[KanbanView] Failed to load calendar display settings', error);
    return null;
  }
}

function saveCalendarDisplaySettings(): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(CALENDAR_DISPLAY_STORAGE_KEY, JSON.stringify({
      showTasks: showCalendarTasks.value,
      showHabits: showCalendarHabits.value,
      showTaskLifelog: showCalendarTaskLifelog.value,
      showHabitLifelog: showCalendarHabitLifelog.value,
      showFocusLifelog: showCalendarFocusLifelog.value,
      showRecordsLifelog: showCalendarRecordsLifelog.value
    }));
  } catch (error) {
    console.warn('[KanbanView] Failed to save calendar display settings', error);
  }
}

async function ensureCalendarFocusHabitsLoaded(): Promise<Habit[]> {
  if (calendarFocusHabits.value.length > 0) {
    return calendarFocusHabits.value;
  }
  const habits = await getHabits();
  calendarFocusHabits.value = habits;
  return habits;
}

function getCalendarFocusDayRecord(habit: Habit, date: string) {
  return habit.calendar.find(day => day.date === date) || null;
}

async function openCalendarFocusNoteDialog(habit: Habit, date: string): Promise<void> {
  calendarFocusNoteHabit.value = habit;
  calendarFocusNoteDate.value = date;
  if (!habit.noteDocId) {
    calendarFocusBindHabit.value = habit;
    calendarFocusBindDocInput.value = habit.noteDocId || '';
    calendarFocusBindDialogVisible.value = true;
    return;
  }

  const requestId = ++calendarFocusNoteRequestId;
  calendarFocusNoteDialogVisible.value = false;
  calendarFocusNoteItems.value = [];

  const focusNotes = await getHabitFocusNoteItems(habit.noteDocId, habit, date);
  if (
    requestId !== calendarFocusNoteRequestId
    || calendarFocusNoteHabit.value?.id !== habit.id
    || calendarFocusNoteDate.value !== date
  ) {
    return;
  }

  calendarFocusNoteItems.value = focusNotes;
  calendarFocusNoteDialogVisible.value = true;
}

async function handleCalendarFocusSessionContextmenu(session: FocusCalendarEvent): Promise<void> {
  if (session.targetType !== 'habit' || !session.targetId) {
    await pushMsg(t('kanbanView.focusSessionHabitOnly'), 2200);
    return;
  }

  const habits = await ensureCalendarFocusHabitsLoaded();
  const habit = habits.find(item => item.id === session.targetId);
  if (!habit) {
    await pushMsg(t('kanbanView.focusSessionHabitMissing'), 2200);
    return;
  }

  await openCalendarFocusNoteDialog(habit, session.date);
}

function closeCalendarFocusNoteDialog(): void {
  calendarFocusNoteRequestId++;
  calendarFocusNoteDialogVisible.value = false;
  calendarFocusNoteHabit.value = null;
  calendarFocusNoteDate.value = '';
  calendarFocusNoteItems.value = [];
}

function closeCalendarFocusBindDialog(): void {
  calendarFocusBindDialogVisible.value = false;
  calendarFocusBindDocInput.value = '';
  calendarFocusBindHabit.value = null;
}

async function handleCalendarFocusBindConfirm(): Promise<void> {
  const habit = calendarFocusBindHabit.value;
  if (!habit) return;

  const docId = calendarFocusBindDocInput.value.trim().match(/\d{14}-[a-z0-9]{7}/i)?.[0] || calendarFocusBindDocInput.value.trim();
  if (!docId) {
    await pushMsg(t('habitDocBind.enterDocId'), 2200);
    return;
  }
  if (!/^\d{14}-[a-z0-9]{7}$/i.test(docId)) {
    await pushMsg(t('habitDocBind.invalidDocId'), 2200);
    return;
  }

  habit.noteDocId = docId;
  calendarFocusHabits.value = [...calendarFocusHabits.value];
  await saveHabits(calendarFocusHabits.value);
  calendarFocusBindDialogVisible.value = false;
  calendarFocusBindDocInput.value = '';
  calendarFocusBindHabit.value = null;

  if (calendarFocusNoteDate.value) {
    await openCalendarFocusNoteDialog(habit, calendarFocusNoteDate.value);
  }
}

async function handleCalendarFocusBindClear(): Promise<void> {
  const habit = calendarFocusBindHabit.value;
  if (!habit) return;

  habit.noteDocId = '';
  calendarFocusHabits.value = [...calendarFocusHabits.value];
  await saveHabits(calendarFocusHabits.value);
  closeCalendarFocusBindDialog();
}

function handleCalendarFocusNoteBindDoc(): void {
  const habit = calendarFocusNoteHabit.value;
  if (!habit) return;
  calendarFocusNoteDialogVisible.value = false;
  calendarFocusBindHabit.value = habit;
  calendarFocusBindDocInput.value = habit.noteDocId || '';
  calendarFocusBindDialogVisible.value = true;
}

async function handleCalendarFocusNoteConfirm(_note: string, focusNotes: HabitFocusNoteItem[] = []): Promise<void> {
  const habit = calendarFocusNoteHabit.value;
  const date = calendarFocusNoteDate.value;
  if (!habit || !habit.noteDocId || !date) return;

  const dayRecord = getCalendarFocusDayRecord(habit, date);
  await writeCheckinLogToDoc(habit.noteDocId, {
    habit,
    date,
    focusNotes,
    completedCount: dayRecord?.completedCount,
    targetCount: dayRecord?.targetCount
  });

  closeCalendarFocusNoteDialog();
}

function selectTaskViewGroupMode(mode: TaskViewGroupMode): void {
  if (currentView.value === 'kanban' || currentView.value === 'list') {
    activeBoardGroupBy.value = mode;
  } else if (currentView.value === 'table' || currentView.value === 'archive-table') {
    tableGroupBy.value = mode;
  }
  closeTaskViewGroupMenu();
}

function toggleKanbanBatchEditModeFromMenu(): void {
  if (currentView.value !== 'kanban') {
    return;
  }
  toggleKanbanBatchEditMode();
  closeTaskViewGroupMenu();
}

async function openTaskGroupDialogFromMenu(): Promise<void> {
  closeTaskViewGroupMenu();
  await openTaskGroupDialog();
}

async function toggleHideCompletedTasksFromMenu(): Promise<void> {
  closeTaskViewGroupMenu();
  await updateSettings('taskManager', {
    showCompletedTasks: !showCompletedTasks.value
  });
  await validateDocumentSelection();
}

function toggleKanbanTaskCardDetailsFromMenu(): void {
  if (!isBoardTaskView.value) {
    return;
  }
  showKanbanTaskCardDetails.value = !showKanbanTaskCardDetails.value;
  if (!showKanbanTaskCardDetails.value && inlineEditingDescriptionTaskId.value) {
    inlineEditingDescriptionTaskId.value = null;
  }
  closeTaskViewGroupMenu();
  nextTick(() => {
    scheduleAllKanbanMetricsUpdates();
    scheduleListViewMetricsUpdate();
  });
}

function toggleAllVisibleKanbanDetails(): void {
  const taskIds = visibleKanbanExpandableTaskIds.value;
  if (taskIds.length === 0) {
    return;
  }
  const shouldCollapse = areAllVisibleKanbanDetailsExpanded.value;
  const next = new Set(expandedKanbanTaskIds.value);
  for (const taskId of taskIds) {
    if (shouldCollapse) {
      next.delete(taskId);
    } else {
      next.add(taskId);
    }
  }
  expandedKanbanTaskIds.value = next;
  nextTick(() => {
    scheduleAllKanbanMetricsUpdates();
    scheduleListViewMetricsUpdate();
  });
}

function toggleAllVisibleKanbanDetailsFromMenu(): void {
  if (!isBoardTaskView.value) {
    return;
  }
  toggleAllVisibleKanbanDetails();
  closeTaskViewGroupMenu();
}

function toggleDocumentTabsDropdown(): void {
  const nextVisible = !documentTabsDropdownVisible.value;
  documentTabsDropdownVisible.value = nextVisible;
  if (nextVisible) {
    closeDocumentTabContextMenu();
    closeTaskViewGroupMenu();
    closeCalendarDisplayMenu();
    closeMobileViewSwitcher();
    nextTick(() => {
      updateDocumentTabsDropdownPosition();
    });
  } else {
    documentTabsDropdownPopoverStyle.value = {};
  }
}

function closeDocumentTabsDropdown(): void {
  documentTabsDropdownVisible.value = false;
  documentTabsDropdownPopoverStyle.value = {};
}

const documentScopeTreeRows = computed<DocumentScopeTreeRow[]>(() => {
  const sourceValue = getCurrentFilterNotebookId();
  const matchingTaskKeys = new Set(
    tasks.value
      .filter(task => task.type === 'block' && matchesTaskBySource(task, sourceValue))
      .map(task => `${task.notebookId}:${task.rootId}`)
  );
  const documents = Array.from(documentScopeTreeDocumentsByNotebook.value.values()).flat();
  const documentsByKey = new Map(documents.map(document => [`${document.notebookId}:${document.id}`, document]));
  const visibleKeys = new Set<string>();

  matchingTaskKeys.forEach((key) => {
    let document = documentsByKey.get(key);
    while (document) {
      const documentKey = `${document.notebookId}:${document.id}`;
      if (visibleKeys.has(documentKey)) break;
      visibleKeys.add(documentKey);
      document = document.parentId
        ? documentsByKey.get(`${document.notebookId}:${document.parentId}`)
        : undefined;
    }
  });

  const childrenByParentKey = new Map<string, DocumentScopeTreeDocument[]>();
  documents.forEach(document => {
    const parentKey = document.parentId
      ? `${document.notebookId}:${document.parentId}`
      : `${document.notebookId}:root`;
    const children = childrenByParentKey.get(parentKey) || [];
    children.push(document);
    childrenByParentKey.set(parentKey, children);
  });
  childrenByParentKey.forEach(children => children.sort((left, right) =>
    left.name.localeCompare(right.name, 'zh-CN')
  ));

  const rows: DocumentScopeTreeRow[] = [];
  const appendChildren = (parentKey: string, depth: number): void => {
    (childrenByParentKey.get(parentKey) || []).forEach(document => {
      const key = `${document.notebookId}:${document.id}`;
      if (!visibleKeys.has(key)) return;
      rows.push({ key, depth, document });
      appendChildren(key, depth + 1);
    });
  };
  Array.from(new Set(documents.map(document => document.notebookId)))
    .sort((left, right) => (enabledNotebookNameById.value.get(left) || left)
      .localeCompare(enabledNotebookNameById.value.get(right) || right, 'zh-CN'))
    .forEach(notebookId => appendChildren(`${notebookId}:root`, 0));
  const keyword = documentScopeTreeSearch.value.trim().toLocaleLowerCase();
  if (!keyword) return rows;

  const matchedKeys = new Set(
    documents
      .filter(document => document.name.toLocaleLowerCase().includes(keyword))
      .map(document => `${document.notebookId}:${document.id}`)
  );
  Array.from(matchedKeys).forEach((key) => {
    let document = documentsByKey.get(key);
    while (document?.parentId) {
      const parentKey = `${document.notebookId}:${document.parentId}`;
      matchedKeys.add(parentKey);
      document = documentsByKey.get(parentKey);
    }
  });
  return rows.filter(row => matchedKeys.has(row.key));
});

async function loadDocumentScopeTree(forceRefresh = false): Promise<void> {
  // listDocsByPath recursively walks whole notebooks. Coalesce overlapping
  // event, picker, and retry requests into at most one follow-up traversal.
  if (documentScopeTreeLoading.value) {
    documentScopeTreeRefreshPending = true;
    return;
  }
  const sourceValue = getCurrentFilterNotebookId();
  const notebookIdSet = new Set(
    tasks.value
      .filter(task => task.type === 'block' && matchesTaskBySource(task, sourceValue))
      .map(task => typeof task.notebookId === 'string' ? task.notebookId.trim() : '')
      .filter(Boolean)
  );
  // A group can contain a parent document with no tasks. In that case no task
  // can yet identify its notebook, but we still need its tree to determine
  // whether a newly-created child document belongs to the group.
  const source = parseDocumentSource(sourceValue);
  if (source.kind === 'notebook') {
    notebookIdSet.add(source.id);
  } else if (source.kind === 'group') {
    documentGroupsById.value.get(source.id)?.members.forEach(member => {
      if (member.notebookId) notebookIdSet.add(member.notebookId);
    });
  } else if (source.kind === 'goal') {
    const goal = goalDefinitionsById.value.get(source.id);
    goal?.members.forEach(member => {
      if (member.notebookId) notebookIdSet.add(member.notebookId);
    });
    goal?.taskMembers?.forEach(member => {
      if (member.notebookId) notebookIdSet.add(member.notebookId);
    });
  }
  const notebookIds = Array.from(notebookIdSet).filter(id => enabledNotebookNameById.value.has(id));
  const notebookIdsToLoad = forceRefresh
    ? notebookIds
    : notebookIds.filter(id => !documentScopeTreeDocumentsByNotebook.value.has(id));
  if (notebookIdsToLoad.length === 0) return;

  const requestId = ++documentScopeTreeRequestId;
  documentScopeTreeLoading.value = true;
  try {
    const loadedTrees = await Promise.all(notebookIdsToLoad.map(async notebookId => {
      const documents: DocumentScopeTreeDocument[] = [];
      const loadBranch = async (path: string, parentId?: string): Promise<void> => {
        const response = await listDocsByPath(notebookId, path);
        const files = response && typeof response === 'object' && Array.isArray((response as { files?: unknown }).files)
          ? (response as { files: Array<{ id?: unknown; name?: unknown; path?: unknown; subFileCount?: unknown }> }).files
          : [];
        for (const file of files) {
          const id = typeof file.id === 'string' ? file.id.trim() : '';
          const storagePath = typeof file.path === 'string' ? file.path.trim() : '';
          if (!id || !storagePath) continue;
          documents.push({
            id,
            name: typeof file.name === 'string' && file.name.trim() ? file.name.trim() : id,
            notebookId,
            parentId,
            storagePath
          });
          if (Number(file.subFileCount) > 0) {
            await loadBranch(storagePath, id);
          }
        }
      };
      await loadBranch('/');
      return [notebookId, documents] as const;
    }));
    if (requestId !== documentScopeTreeRequestId) return;
    const nextTrees = new Map(documentScopeTreeDocumentsByNotebook.value);
    loadedTrees.forEach(([notebookId, documents]) => nextTrees.set(notebookId, documents));
    documentScopeTreeDocumentsByNotebook.value = nextTrees;
    // Descendants stay implicit: matching uses this tree at runtime rather
    // than writing every child document into group and goal membership.
    scheduleDocumentScopeTreeRetryIfNeeded();
  } catch (error) {
    console.warn('[KanbanView] Failed to load the document scope tree:', error);
  } finally {
    if (requestId !== documentScopeTreeRequestId) return;
    documentScopeTreeLoading.value = false;
    if (documentScopeTreeRefreshPending) {
      documentScopeTreeRefreshPending = false;
      void loadDocumentScopeTree(true);
    }
  }
}

/**
 * Refresh only a newly-created document and its ancestors. Full recursive
 * notebook traversal remains reserved for the document-scope picker.
 */
async function loadDocumentScopeAncestors(notebookId: string, documentId: string): Promise<void> {
  const initialId = typeof documentId === 'string' ? documentId.trim() : '';
  const initialNotebookId = typeof notebookId === 'string' ? notebookId.trim() : '';
  if (!initialId || !initialNotebookId) return;

  const refreshKey = `${initialNotebookId}:${initialId}`;
  const existingRefresh = documentScopeAncestorRefreshes.get(refreshKey);
  if (existingRefresh) {
    return existingRefresh;
  }

  const refresh = (async () => {
    const pendingIds = new Set([initialId]);
    const visitedIds = new Set<string>();
    const discovered: DocumentScopeTreeDocument[] = [];
    try {
      while (pendingIds.size > 0) {
        const ids = Array.from(pendingIds).filter(id => !visitedIds.has(id)).slice(0, 300);
        pendingIds.clear();
        if (ids.length === 0) break;
        ids.forEach(id => visitedIds.add(id));
        const idsClause = ids.map(id => `'${id.replace(/'/g, "''")}'`).join(',');
        const rows = await sql(`
          SELECT id, box, hpath, content, parent_id, path AS storage_path
          FROM blocks
          WHERE type = 'd' AND id IN (${idsClause})
        `) as Array<{ id?: string; box?: string; hpath?: string; content?: string; parent_id?: string; storage_path?: string }>;
        for (const row of rows) {
          const id = typeof row.id === 'string' ? row.id.trim() : '';
          const box = typeof row.box === 'string' ? row.box.trim() : '';
          if (!id || !box) continue;
          const parentId = typeof row.parent_id === 'string' ? row.parent_id.trim() : '';
          const path = typeof row.hpath === 'string' ? row.hpath.trim() : '';
          discovered.push({
            id,
            notebookId: box,
            name: resolveDocumentDisplayName({ id, name: row.content, path }),
            path: path || undefined,
            parentId: parentId || undefined,
            storagePath: typeof row.storage_path === 'string' && row.storage_path.trim()
              ? row.storage_path.trim()
              : undefined
          });
          if (box === initialNotebookId && parentId && !visitedIds.has(parentId)) {
            pendingIds.add(parentId);
          }
        }
      }
    } catch (error) {
      console.warn('[KanbanView] Failed to load document scope ancestors:', error);
      return;
    }
    if (discovered.length === 0) return;

    const nextTrees = new Map(documentScopeTreeDocumentsByNotebook.value);
    const documentsByNotebook = new Map<string, Map<string, DocumentScopeTreeDocument>>();
    discovered.forEach(document => {
      let documents = documentsByNotebook.get(document.notebookId);
      if (!documents) {
        documents = new Map((nextTrees.get(document.notebookId) || []).map(item => [item.id, item]));
        documentsByNotebook.set(document.notebookId, documents);
      }
      documents.set(document.id, document);
    });
    documentsByNotebook.forEach((documents, box) => nextTrees.set(box, Array.from(documents.values())));
    documentScopeTreeDocumentsByNotebook.value = nextTrees;
  })().finally(() => {
    documentScopeAncestorRefreshes.delete(refreshKey);
  });
  documentScopeAncestorRefreshes.set(refreshKey, refresh);
  return refresh;
}

function updateDocumentScopePickerPosition(): void {
  if (!documentScopePickerVisible.value) return;
  const trigger = documentTabsRef.value?.querySelector<HTMLElement>('.document-tab');
  if (!trigger) return;
  const rect = trigger.getBoundingClientRect();
  documentScopePickerStyle.value = {
    position: 'fixed',
    left: `${Math.round(rect.left)}px`,
    top: `${Math.round(rect.bottom + 6)}px`,
    maxWidth: `${Math.min(360, window.innerWidth - Math.max(8, rect.left) - 8)}px`
  };
}

function closeDocumentScopePicker(): void {
  documentScopePickerVisible.value = false;
  documentScopePickerStyle.value = {};
  documentScopeTreeSearch.value = '';
}

function toggleDocumentScopePicker(): void {
  documentScopePickerVisible.value = !documentScopePickerVisible.value;
  if (!documentScopePickerVisible.value) {
    documentScopePickerStyle.value = {};
    return;
  }
  closeDocumentTabsDropdown();
  closeDocumentTabContextMenu();
  void loadDocumentScopeTree(true);
  nextTick(() => {
    updateDocumentScopePickerPosition();
    documentScopePickerSearchInputRef.value?.focus();
  });
}

async function selectDocumentTabScope(scope?: DocumentScopeTreeDocument): Promise<void> {
  const sourceValue = getCurrentFilterNotebookId();
  const scopeStorageKey = getDocumentTabScopeStorageKey(sourceValue);
  const nextScopes = { ...documentTabScopesBySource.value };
  if (scope) {
    let path = '';
    try {
      path = (await getHPathByID(scope.id) || '').trim();
    } catch {
      path = '';
    }
    nextScopes[scopeStorageKey] = {
      id: scope.id,
      name: scope.name,
      notebookId: scope.notebookId,
      path
    };
  } else {
    delete nextScopes[scopeStorageKey];
  }
  documentTabScopesBySource.value = nextScopes;
  currentDocumentFilter.value = 'all';
  closeDocumentScopePicker();
}

function updateDocumentTabsDropdownPosition(): void {
  if (!documentTabsDropdownVisible.value) {
    return;
  }
  const control = documentTabsDropdownButtonRef.value || documentTabsDropdownControlRef.value;
  const popover = documentTabsDropdownPopoverRef.value;
  if (!control || !popover) {
    return;
  }

  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  if (viewportWidth <= 0) {
    return;
  }
  const controlRect = control.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();
  const gap = 6;
  const availableWidth = Math.max(1, controlRect.right);
  const popoverWidth = Math.min(popoverRect.width || availableWidth, availableWidth);
  const resolvedLeft = controlRect.right - popoverWidth;

  documentTabsDropdownPopoverStyle.value = {
    position: 'fixed',
    left: `${Math.round(resolvedLeft)}px`,
    top: `${Math.round(controlRect.bottom + gap)}px`,
    right: 'auto',
    maxWidth: `${Math.min(360, availableWidth)}px`,
    minWidth: `${Math.min(220, availableWidth)}px`
  };
}

function toggleMobileViewSwitcher(): void {
  const nextVisible = !mobileViewSwitcherVisible.value;
  mobileViewSwitcherVisible.value = nextVisible;
  if (nextVisible) {
    closeDocumentTabContextMenu();
    closeDocumentTabsDropdown();
    closeTaskViewGroupMenu();
    closeKanbanFilterPopover();
    closeTableFilterPopover();
  }
}

function closeMobileViewSwitcher(): void {
  mobileViewSwitcherVisible.value = false;
}

function toggleMobileCalendarTaskDrawer(): void {
  if (!showMobileCalendarTaskDrawerButton.value) {
    return;
  }
  mobileCalendarTaskDrawerVisible.value = !mobileCalendarTaskDrawerVisible.value;
  if (mobileCalendarTaskDrawerVisible.value) {
    closeMobileViewSwitcher();
    closeDocumentTabsDropdown();
    closeTaskViewGroupMenu();
    closeKanbanFilterPopover();
    closeTableFilterPopover();
  } else {
    cancelMobileCalendarTaskDrag();
  }
}

function closeMobileCalendarTaskDrawer(): void {
  mobileCalendarTaskDrawerVisible.value = false;
  cancelMobileCalendarTaskDrag();
}

function updateMobileCalendarDropHint(point: ExternalCalendarDropPoint, task?: Task): void {
  const controller = activeMobileCalendarDropController.value;
  if (!controller) {
    mobileCalendarTaskDragHint.value = '';
    return;
  }
  const result = controller.updateExternalTaskDrag(point, task);
  mobileCalendarTaskDragHint.value = result?.label || '';
}

function resetMobileCalendarTaskDrag(): void {
  activeMobileCalendarDropController.value?.clearExternalTaskDrag();
  mobileCalendarTaskDrag.value = {
    active: false,
    task: null,
    clientX: 0,
    clientY: 0
  };
  mobileCalendarTaskDragHint.value = '';
}

function handleMobileCalendarTaskDragStart(payload: MobileCalendarDragPayload): void {
  mobileCalendarTaskDrag.value = {
    active: true,
    task: payload.task,
    clientX: payload.clientX,
    clientY: payload.clientY
  };
  updateMobileCalendarDropHint({
    clientX: payload.clientX,
    clientY: payload.clientY
  }, payload.task);
}

function handleMobileCalendarTaskDragMove(payload: MobileCalendarDragPayload): void {
  if (!mobileCalendarTaskDrag.value.active) {
    return;
  }
  mobileCalendarTaskDrag.value = {
    active: true,
    task: payload.task,
    clientX: payload.clientX,
    clientY: payload.clientY
  };
  updateMobileCalendarDropHint({
    clientX: payload.clientX,
    clientY: payload.clientY
  }, payload.task);
}

async function handleMobileCalendarTaskDragEnd(payload: MobileCalendarDragPayload): Promise<void> {
  const controller = activeMobileCalendarDropController.value;
  const task = mobileCalendarTaskDrag.value.task || payload.task;
  if (!controller || !task) {
    resetMobileCalendarTaskDrag();
    return;
  }

  const didDrop = await controller.dropExternalTask(task, {
    clientX: payload.clientX,
    clientY: payload.clientY
  });
  resetMobileCalendarTaskDrag();
  if (didDrop) {
    mobileCalendarTaskDrawerVisible.value = false;
  }
}

function cancelMobileCalendarTaskDrag(): void {
  if (!mobileCalendarTaskDrag.value.active && !mobileCalendarTaskDragHint.value) {
    return;
  }
  resetMobileCalendarTaskDrag();
}

function updateCompactViewSwitcherMode(): void {
  if (isMobileFrontend) {
    isCompactViewSwitcher.value = false;
    return;
  }
  const containerWidth = kanbanViewRef.value?.clientWidth || window.innerWidth || 0;
  isCompactViewSwitcher.value = containerWidth > 0 && containerWidth <= COMPACT_VIEW_SWITCHER_BREAKPOINT;
}

function updateKanbanListColumnCount(): void {
  const containerWidth = kanbanViewRef.value?.clientWidth || window.innerWidth || 0;
  const availableWidth = Math.max(0, containerWidth - 20);
  const nextColumnCount = Math.max(
    1,
    Math.floor((availableWidth + KANBAN_LIST_COLUMN_GAP) / (KANBAN_LIST_MIN_COLUMN_WIDTH + KANBAN_LIST_COLUMN_GAP))
  );
  kanbanListColumnCount.value = isMobileFrontend ? 1 : nextColumnCount;
}

function closeMobileTableSearch(force = false): void {
  if (!isMobileFrontend) {
    return;
  }
  if (!force && tableSearchQuery.value) {
    return;
  }
  isMobileTableSearchExpanded.value = false;
}

function handleTaskSearchToggleClick(): void {
  if (!isMobileFrontend) {
    tableSearchInputRef.value?.focus();
    return;
  }
  if (!isMobileTaskSearchCollapsed.value) {
    tableSearchInputRef.value?.focus();
    return;
  }
  isMobileTableSearchExpanded.value = true;
  nextTick(() => {
    tableSearchInputRef.value?.focus();
  });
}

function handleTableSearchEscape(): void {
  if (tableSearchQuery.value) {
    tableSearchQuery.value = '';
    return;
  }
  closeMobileTableSearch(true);
}

function selectPrimaryMobileView(option: PrimaryViewSwitcherOption): void {
  selectPrimaryView(option);
  closeMobileViewSwitcher();
}

function handleDocumentTabsWheel(event: WheelEvent): void {
  const tabs = documentTabsRef.value;
  if (!tabs || tabs.scrollWidth <= tabs.clientWidth) {
    return;
  }

  const delta = event.deltaX !== 0 ? event.deltaX : event.deltaY;
  if (delta === 0) {
    return;
  }

  tabs.scrollLeft += delta;
  event.preventDefault();
}

function getOrderedGanttDocumentIds(): string[] {
  const availableIds = milestoneDocumentOptions.value
    .map(option => option.value)
    .filter(value => value !== 'all');
  const availableIdSet = new Set(availableIds);
  const storedOrder = activeGanttDocumentOrder.value.filter(id => availableIdSet.has(id));
  const storedIdSet = new Set(storedOrder);
  return [...storedOrder, ...availableIds.filter(id => !storedIdSet.has(id))];
}

function getDocumentTabMilestoneNumber(documentId: string): number {
  const index = getOrderedGanttDocumentIds().indexOf(documentId);
  return index >= 0 ? index + 1 : 0;
}

function handleDocumentTabDragStart(event: DragEvent, option: DocumentFilterOption): void {
  if (!canReorderDocumentTabs.value || option.value === 'all') {
    event.preventDefault();
    return;
  }
  draggedDocumentTabId.value = option.value;
  dragOverDocumentTabId.value = '';
  event.dataTransfer?.setData('text/plain', option.value);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
}

function handleDocumentTabDragOver(event: DragEvent, option: DocumentFilterOption): void {
  if (!canReorderDocumentTabs.value || !draggedDocumentTabId.value || option.value === 'all') return;
  event.preventDefault();
  if (option.value !== draggedDocumentTabId.value) {
    dragOverDocumentTabId.value = option.value;
  }
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
}

function handleDocumentTabDrop(event: DragEvent, target: DocumentFilterOption): void {
  const sourceId = draggedDocumentTabId.value || event.dataTransfer?.getData('text/plain') || '';
  clearDocumentTabDragState();
  if (!canReorderDocumentTabs.value || !sourceId || sourceId === target.value || target.value === 'all') return;
  event.preventDefault();

  const nextOrder = getOrderedGanttDocumentIds();
  const sourceIndex = nextOrder.indexOf(sourceId);
  const targetIndex = nextOrder.indexOf(target.value);
  if (sourceIndex < 0 || targetIndex < 0) return;
  nextOrder.splice(sourceIndex, 1);
  // Keep tab drag semantics consistent with the milestone rail: dropping on
  // a later tab places the source after it, while dropping on an earlier tab
  // places it before it.
  const targetIndexAfterRemoval = nextOrder.indexOf(target.value);
  const insertIndex = sourceIndex < targetIndex
    ? targetIndexAfterRemoval + 1
    : targetIndexAfterRemoval;
  nextOrder.splice(insertIndex, 0, sourceId);
  ganttDocumentOrderBySource.value = {
    ...ganttDocumentOrderBySource.value,
    [activeMilestoneSource.value]: nextOrder
  };
}

function clearDocumentTabDragState(): void {
  draggedDocumentTabId.value = '';
  dragOverDocumentTabId.value = '';
}

function handleGanttDocumentOrderChange(sectionOrder: string[]): void {
  if (!canReorderDocumentTabs.value) return;
  const documentIdBySectionId = new Map(
    milestoneDocumentOptions.value
      .filter(option => option.value !== 'all' && option.notebookId)
      .map(option => [`${option.notebookId}:${option.value}`, option.value])
  );
  const nextOrder = sectionOrder
    .map(sectionId => documentIdBySectionId.get(sectionId))
    .filter((documentId): documentId is string => !!documentId);
  if (nextOrder.length === 0) return;
  ganttDocumentOrderBySource.value = {
    ...ganttDocumentOrderBySource.value,
    [activeMilestoneSource.value]: nextOrder
  };
}

function selectDocumentTabFromPopover(value: string): void {
  if (!value || value === 'all') return;
  if (hiddenDocumentTabIds.value.has(value)) return;
  currentDocumentFilter.value = value;
  closeDocumentTabsDropdown();
}

function toggleDocumentTabVisibility(value: string): void {
  if (!value || value === 'all') return;
  const nextHidden = new Set(hiddenDocumentTabIds.value);
  const shouldHide = !nextHidden.has(value);
  if (shouldHide) {
    nextHidden.add(value);
  } else {
    nextHidden.delete(value);
  }
  hiddenDocumentTabIds.value = nextHidden;
  if (shouldHide && currentDocumentFilter.value === value) {
    currentDocumentFilter.value = 'all';
  }

  const remainingVisibleTabs = documentOptions.value.filter(
    option => option.value !== 'all' && !nextHidden.has(option.value)
  );
  if (remainingVisibleTabs.length === 0) {
    closeDocumentTabsDropdown();
  }
}

function setupFilterTypeWatcher(
  typeRef: Ref<string>,
  documentRef: Ref<string>,
  taskMatcher?: () => DocumentOptionsTaskMatcher
): void {
  watch(typeRef, (newType) => {
    const matcher = taskMatcher ? taskMatcher() : undefined;
    const options = toFilterDocumentOptions(newType, { taskMatcher: matcher });
    const allowedValues = new Set(options.map(option => option.value));
    if (!allowedValues.has(documentRef.value)) {
      documentRef.value = 'all';
    }
  });
}

setupFilterTypeWatcher(kanbanFilterType, kanbanFilterDocument, () => getDocumentTabTaskMatcher('kanban'));
setupFilterTypeWatcher(listFilterType, listFilterDocument, () => getDocumentTabTaskMatcher('list'));
setupFilterTypeWatcher(tableFilterType, tableFilterDocument, () => getDocumentTabTaskMatcher('table'));
setupFilterTypeWatcher(ganttFilterType, ganttFilterDocument, () => getDocumentTabTaskMatcher('gantt'));
setupFilterTypeWatcher(monthFilterType, monthFilterDocument, () => getDocumentTabTaskMatcher('month'));

const ensureTableDocumentSelection = () => {
  const options = toFilterDocumentOptions(tableFilterType.value, {
    excludeCompletedOnlyDocs: shouldHideCompletedOnlyDocumentTabs('table'),
    taskMatcher: getDocumentTabTaskMatcher('table')
  });
  const optionValues = new Set(options.map(option => option.value));
  if (!optionValues.has(tableFilterDocument.value)) {
    tableFilterDocument.value = 'all';
  }
};

watch(tableFilterType, () => {
  ensureTableDocumentSelection();
});

watch(visibleDocumentOptions, (options) => {
  const allowedValues = new Set(options.map(option => option.value));
  if (!allowedValues.has(currentDocumentFilter.value)) {
    currentDocumentFilter.value = 'all';
  }
});
watch(currentDocumentFilter, () => {
  closeDocumentTabsDropdown();
});

watch(quickCreateNotebookId, (newType, oldType) => {
  if (newType !== oldType && quickCreateDialog.value.show) {
    const exists = quickCreateDocumentOptions.value.some(opt => opt.value === quickCreateDocumentId.value);
    if (!exists) {
      quickCreateDocumentId.value = 'all';
    }
  } else if (newType !== oldType) {
    quickCreateDocumentId.value = 'all';
  }
});

function scheduleSaveUserSettings() {
  if (saveSettingsTimer !== null) {
    clearTimeout(saveSettingsTimer);
  }

  saveSettingsTimer = window.setTimeout(async () => {
    await saveUserSettings();
  }, 200);
}

/**
 * The active view can be destroyed during a plugin reload before its debounce
 * elapses. Flush that final snapshot instead of silently discarding the
 * selected source/document tab and grouping preferences.
 */
function flushSaveUserSettings(): void {
  if (saveSettingsTimer === null) {
    return;
  }
  clearTimeout(saveSettingsTimer);
  saveSettingsTimer = null;
  void saveUserSettings();
}

const shouldLoadHeadingGroups = computed(() =>
  kanbanGroupBy.value === 'heading' || listGroupBy.value === 'heading' || tableGroupBy.value === 'heading'
);

let taskHeadingGroupRequestId = 0;

async function refreshTaskHeadingGroups(): Promise<void> {
  const requestId = ++taskHeadingGroupRequestId;
  const resolvedGroups = await resolveTaskHeadingGroups(tasks.value);
  if (requestId !== taskHeadingGroupRequestId) {
    return;
  }
  taskHeadingGroups.value = applyPendingTaskHeadingGroupOverrides(resolvedGroups);
}

watch([
  currentView,
  kanbanGroupBy,
  listGroupBy,
  tableGroupBy,
  showKanbanTaskCardDetails,
  kanbanFilterType,
  kanbanFilterDocument,
  listFilterType,
  listFilterDocument,
  tableFilterType,
  tableFilterDocument,
  ganttFilterType,
  ganttFilterDocument,
  ganttMilestonesEnabled,
  ganttDocumentOrderBySource,
  documentTabScopesBySource,
  monthFilterType,
  monthFilterDocument,
  weekFilterType,
  weekFilterDocument,
  dayFilterType,
  dayFilterDocument,
  activeKanbanStatusFilters,
  activeKanbanPriorityFilters,
  activeKanbanDueFilters,
  activeKanbanUpdatedFilters,
  activeKanbanGroupFilters,
  activeKanbanExtraFilters,
  activeTableStatusFilters,
  activeTablePriorityFilters,
  activeTableDueFilters,
  activeTableUpdatedFilters,
  activeTableGroupFilters,
  activeTableExtraFilters
], () => {
  if (isHydratingSettings.value) {
    return;
  }
  scheduleSaveUserSettings();
});
watch(hiddenDocumentTabIds, () => {
  if (isHydratingSettings.value) {
    return;
  }
  scheduleSaveUserSettings();
});
watch([shouldLoadHeadingGroups, () => tasks.value], ([enabled]) => {
  if (isHydratingSettings.value) {
    return;
  }
  if (!enabled) {
    return;
  }
  void refreshTaskHeadingGroups();
}, { immediate: true });

watch(kanbanFilterPopoverVisible, (visible) => {
  if (visible) {
    closeDocumentTabsDropdown();
    closeMobileViewSwitcher();
    closeTaskViewGroupMenu();
    void nextTick(updateKanbanFilterPopoverPosition);
  }
});
watch(tableFilterPopoverVisible, (visible) => {
  if (visible) {
    closeDocumentTabsDropdown();
    closeMobileViewSwitcher();
    closeTaskViewGroupMenu();
    void nextTick(updateTableFilterPopoverPosition);
  }
});
watch(currentView, () => {
  closeDocumentTabsDropdown();
  closeMobileViewSwitcher();
  closeTaskViewGroupMenu();
  cancelColumnTitleEdit();
  clearGroupColumnReorderDragState();
  if (currentView.value !== 'kanban' && isKanbanBatchEditMode.value) {
    exitKanbanBatchEditMode();
  }
});

watch(kanbanGroupBy, async (mode) => {
  if (mode !== 'group') {
    clearGroupColumnReorderDragState();
    return;
  }
  clearGroupColumnReorderDragState();
  await ensureTaskGroupsLoaded();
});
watch(listGroupBy, async (mode) => {
  if (mode !== 'group') {
    return;
  }
  await ensureTaskGroupsLoaded();
});
watch(tableGroupBy, async (mode) => {
  if (mode !== 'group') {
    return;
  }
  await ensureTaskGroupsLoaded();
});

const tableArchiveMode = computed<'active' | 'archived'>(() =>
  currentView.value === 'archive-table' ? 'archived' : 'active'
);

const tableFilterNotebookScope = computed(() => {
  const source = parseDocumentSource(tableFilterType.value);
  return source.kind === 'notebook' ? source.id : 'all';
});

const tableFilterDocumentScope = computed(() =>
  tableFilterDocument.value !== 'all' ? tableFilterDocument.value : 'all'
);

const tableFilters = {
  notebook: tableFilterNotebookScope,
  document: tableFilterDocumentScope,
  archiveMode: tableArchiveMode
};

const { filtered: filteredTasks, invalidateCache: invalidateTableFilters } = useTaskFilters(tasks, tableFilters);
const tableViewTasks = computed(() =>
  filteredTasks.value.filter(task => matchesTableFilters(task))
);
const archivedTableViewTasks = computed(() =>
  filteredTasks.value.filter(task => matchesArchivedTableFilters(task))
);
const activeOrArchiveTableViewTasks = computed(() =>
  currentView.value === 'archive-table' ? archivedTableViewTasks.value : tableViewTasks.value
);

const ganttGroupMode = computed<GanttGroupMode>(() => {
  // In the goal (Gantt) view, preserve the goal overview only when both
  // source and document scopes are "All". A selected document tab should
  // always make the rows use document sections, including within a goal
  // source scope.
  return ganttFilterType.value === 'all' && ganttFilterDocument.value === 'all'
    ? 'goal'
    : 'document';
});

const calendarTopLevelTasks = computed(() => {
  return tasks.value.filter(isGanttTopLevelTask);
});

const ganttViewTasks = computed(() => {
  return calendarTopLevelTasks.value.filter(task => {
    if (!matchesGanttDocumentCandidate(task, ganttFilterType.value)) {
      return false;
    }
    if (ganttFilterDocument.value !== 'all' && !taskMatchesDocumentScope(task, ganttFilterDocument.value, taskDocumentPathLookup.value)) {
      return false;
    }

    return true;
  });
});

const monthViewTasks = computed(() => {
  return calendarTopLevelTasks.value.filter(task => {
    if (task.type !== 'block') return false;
    if (task.archived) return false;
    if (!task.startDate && !task.dueDate) return false;
    if (!matchesTaskBySourceAndDocument(task, monthFilterType.value, monthFilterDocument.value)) {
      return false;
    }
    
    return true;
  });
});

const monthSidebarTasks = computed(() => {
  return calendarTopLevelTasks.value.filter(task => {
    if (task.type !== 'block' || task.archived) return false;
    return matchesTaskBySourceAndDocument(task, monthFilterType.value, monthFilterDocument.value);
  });
});

const weekSidebarTasks = computed(() => {
  return calendarTopLevelTasks.value.filter(task =>
    task.type === 'block' && !task.archived
    && matchesTaskBySourceAndDocument(task, weekFilterType.value, weekFilterDocument.value)
  );
});

const daySidebarTasks = computed(() => {
  return calendarTopLevelTasks.value.filter(task =>
    task.type === 'block' && !task.archived
    && matchesTaskBySourceAndDocument(task, dayFilterType.value, dayFilterDocument.value)
  );
});

const monthLifelogTasks = computed(() => {
  return calendarLifelogTasks.value.filter(task =>
    matchesCalendarLifelogTask(task, monthFilterType.value, monthFilterDocument.value)
  );
});

const weekViewTasks = computed(() => {
  return calendarTopLevelTasks.value.filter(task => {
    if (task.type !== 'block') return false;
    if (task.archived) return false;
    if (!task.startDate && !task.dueDate) return false;
    if (!matchesTaskBySourceAndDocument(task, weekFilterType.value, weekFilterDocument.value)) {
      return false;
    }
    
    return true;
  });
});

const weekLifelogTasks = computed(() => {
  return calendarLifelogTasks.value.filter(task =>
    matchesCalendarLifelogTask(task, weekFilterType.value, weekFilterDocument.value)
  );
});

const dayViewTasks = computed(() => {
  return calendarTopLevelTasks.value.filter(task => {
    if (task.type !== 'block') return false;
    if (task.archived) return false;
    if (!task.startDate && !task.dueDate) return false;
    if (!matchesTaskBySourceAndDocument(task, dayFilterType.value, dayFilterDocument.value)) {
      return false;
    }

    return true;
  });
});

const dayLifelogTasks = computed(() => {
  return calendarLifelogTasks.value.filter(task =>
    matchesCalendarLifelogTask(task, dayFilterType.value, dayFilterDocument.value)
  );
});

watch(tasks, () => {
  invalidateTableFilters();
}, { immediate: true });

watch(visibleKanbanTasks, (nextTasks) => {
  pruneVirtualHeightCaches(nextTasks);
  if (currentView.value === 'kanban' || currentView.value === 'list') {
    nextTick(() => {
      if (currentView.value === 'kanban') {
        scheduleAllKanbanMetricsUpdates();
      } else if (currentView.value === 'list') {
        scheduleListViewMetricsUpdate();
      }
    });
  }
  if (kanbanBatchSelectedTaskIds.value.size === 0) {
    return;
  }
  const idSet = new Set(nextTasks.map(task => task.id));
  const nextSelected = new Set<string>();
  kanbanBatchSelectedTaskIds.value.forEach(taskId => {
    if (idSet.has(taskId)) {
      nextSelected.add(taskId);
    }
  });
  if (nextSelected.size !== kanbanBatchSelectedTaskIds.value.size) {
    kanbanBatchSelectedTaskIds.value = nextSelected;
  }
});

function getTaskVisualStatus(task: Task): Task['status'] {
  if (task.type === 'block' && task.blockId) {
    const locked = getLockedDraggedTaskStatus(task.blockId);
    if (locked) {
      return locked;
    }
  }
  return task.status;
}

function isTaskCompletedVisual(task: Task): boolean {
  return getTaskVisualStatus(task) === 'completed';
}

function compareTasksLikeSidebar(a: Task, b: Task, todayStart: number, domOrderMap?: Map<string, number>): number {
  const isACompleted = getTaskVisualStatus(a) === 'completed';
  const isBCompleted = getTaskVisualStatus(b) === 'completed';

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
    const dueA = getTaskDueDateTimestamp(a);
    const dueB = getTaskDueDateTimestamp(b);
    const isAOverdue = dueA !== null && dueA < todayStart;
    const isBOverdue = dueB !== null && dueB < todayStart;
    if (isAOverdue && !isBOverdue) {
      return -1;
    }
    if (!isAOverdue && isBOverdue) {
      return 1;
    }
    if (isAOverdue && isBOverdue && dueA !== null && dueB !== null && dueA !== dueB) {
      return dueA - dueB;
    }

    const priorityA = kanbanPriorityOrder[a.priority] ?? 3;
    const priorityB = kanbanPriorityOrder[b.priority] ?? 3;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    const createdSortResult = compareTaskCreatedAtDesc(a, b);
    if (createdSortResult !== 0) {
      return createdSortResult;
    }

    const documentSortResult = compareTaskDocumentSortKey(a, b, domOrderMap);
    if (documentSortResult !== 0) {
      return documentSortResult;
    }
  }

  const aSortKey = a.blockId || a.id || a.createdAt || '';
  const bSortKey = b.blockId || b.id || b.createdAt || '';
  return bSortKey.localeCompare(aSortKey);
}

interface SidebarSortContext {
  todayStart: number;
  domOrderMap: Map<string, number>;
}

let cachedDomOrderMap: Map<string, number> | null = null;
let cachedDomOrderMapTimestamp = 0;
const DOM_ORDER_MAP_CACHE_MS = 200;

function getCachedDomOrderMap(): Map<string, number> {
  const now = Date.now();
  if (cachedDomOrderMap && (now - cachedDomOrderMapTimestamp) < DOM_ORDER_MAP_CACHE_MS) {
    return cachedDomOrderMap;
  }
  cachedDomOrderMap = buildLiveTaskDomOrderMap();
  cachedDomOrderMapTimestamp = now;
  return cachedDomOrderMap;
}

function createSidebarSortContext(): SidebarSortContext {
  return {
    todayStart: getStartOfDay(new Date()).getTime(),
    domOrderMap: getCachedDomOrderMap()
  };
}

function sortTasksLikeSidebar(taskList: Task[], context?: SidebarSortContext): Task[] {
  const resolvedContext = context || createSidebarSortContext();
  const { todayStart, domOrderMap } = resolvedContext;
  return taskList.sort((a, b) => compareTasksLikeSidebar(a, b, todayStart, domOrderMap));
}

function getStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getStartOfWeekMonday(date: Date): Date {
  const startOfDay = getStartOfDay(date);
  const day = startOfDay.getDay(); // 0 (Sun) - 6 (Sat)
  const delta = day === 0 ? 6 : day - 1;
  startOfDay.setDate(startOfDay.getDate() - delta);
  return startOfDay;
}

function closeKanbanFilterPopover(): void {
  kanbanFilterPopoverVisible.value = false;
}

function updateKanbanFilterPopoverPosition(): void {
  if (!kanbanFilterPopoverVisible.value) return;
  const point = kanbanFilterPopoverPoint.value;
  const controlRect = kanbanFilterControlRef.value?.getBoundingClientRect();
  const x = point?.x ?? controlRect?.left ?? window.innerWidth / 2;
  const y = point?.y ?? controlRect?.bottom ?? window.innerHeight / 2;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const horizontalMargin = 12;
  const verticalMargin = 12;
  const width = 300;
  const maxHeight = Math.max(200, Math.min(500, viewportHeight - verticalMargin * 2));
  let left = x;
  let top = y + 8;
  left = Math.max(horizontalMargin, Math.min(left, viewportWidth - horizontalMargin - width));
  top = Math.max(verticalMargin, Math.min(top, viewportHeight - verticalMargin - maxHeight));

  kanbanFilterPopoverStyle.value = {
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    width: `${Math.round(width)}px`,
    maxHeight: `${Math.round(maxHeight)}px`
  };
}

function toggleKanbanFilterPopover(event: MouseEvent): void {
  if (kanbanFilterPopoverVisible.value) {
    closeKanbanFilterPopover();
    return;
  }
  if (tableFilterPopoverVisible.value) {
    closeTableFilterPopover();
  }
  kanbanFilterPopoverPoint.value = { x: event.clientX, y: event.clientY };
  kanbanFilterPopoverVisible.value = true;
  void nextTick(updateKanbanFilterPopoverPosition);
}

function closeTableFilterPopover(): void {
  tableFilterPopoverVisible.value = false;
}

function updateTableFilterPopoverPosition(): void {
  if (!tableFilterPopoverVisible.value) return;
  const point = tableFilterPopoverPoint.value;
  const controlRect = tableFilterControlRef.value?.getBoundingClientRect();
  const x = point?.x ?? controlRect?.left ?? window.innerWidth / 2;
  const y = point?.y ?? controlRect?.bottom ?? window.innerHeight / 2;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const horizontalMargin = 12;
  const verticalMargin = 12;
  const width = 300;
  const maxHeight = Math.max(200, Math.min(500, viewportHeight - verticalMargin * 2));
  let left = x;
  let top = y + 8;
  left = Math.max(horizontalMargin, Math.min(left, viewportWidth - horizontalMargin - width));
  top = Math.max(verticalMargin, Math.min(top, viewportHeight - verticalMargin - maxHeight));

  tableFilterPopoverStyle.value = {
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    width: `${Math.round(width)}px`,
    maxHeight: `${Math.round(maxHeight)}px`
  };
}

function toggleTableFilterPopover(event: MouseEvent): void {
  if (tableFilterPopoverVisible.value) {
    closeTableFilterPopover();
    return;
  }
  if (kanbanFilterPopoverVisible.value) {
    closeKanbanFilterPopover();
  }
  tableFilterPopoverPoint.value = { x: event.clientX, y: event.clientY };
  tableFilterPopoverVisible.value = true;
  void nextTick(updateTableFilterPopoverPosition);
}

function isKanbanBatchStatus(value: string): value is Task['status'] {
  return value === 'pending'
    || value === 'in-progress'
    || value === 'delayed'
    || value === 'completed'
    || value === 'cancelled';
}

function isKanbanBatchPriority(value: string): value is Task['priority'] {
  return value === 'none'
    || value === 'low'
    || value === 'medium'
    || value === 'high';
}

function normalizeKanbanBatchTagAction(value: unknown): TaskTagBatchAction {
  return value === 'add' || value === 'remove' || value === 'set-primary'
    ? value
    : 'set-primary';
}

function setKanbanBatchEditTagAction(value: unknown): void {
  const nextAction = normalizeKanbanBatchTagAction(value);
  kanbanBatchEditTagAction.value = nextAction;
  if (nextAction !== 'set-primary' && kanbanBatchEditGroupId.value === TASK_GROUP_NONE_ID) {
    kanbanBatchEditGroupId.value = '';
  }
}

function resetKanbanBatchEditInputs(): void {
  kanbanBatchEditStatus.value = '';
  kanbanBatchEditPriority.value = '';
  kanbanBatchEditTagAction.value = 'set-primary';
  kanbanBatchEditGroupId.value = '';
}

function clearKanbanBatchSelection(): void {
  kanbanBatchSelectedTaskIds.value = new Set();
}

function exitKanbanBatchEditMode(): void {
  finishKanbanBatchLassoSelection();
  closeKanbanBatchMenu();
  isKanbanBatchEditMode.value = false;
  clearKanbanBatchSelection();
  resetKanbanBatchEditInputs();
}

function toggleKanbanBatchEditMode(): void {
  if (isKanbanBatchEditMode.value) {
    exitKanbanBatchEditMode();
    return;
  }
  cancelColumnTitleEdit();
  clearGroupColumnReorderDragState();
  closeKanbanFilterPopover();
  closeTableFilterPopover();
  closeKanbanEditor();
  isKanbanBatchEditMode.value = true;
}

function resetKanbanBatchLasso(): void {
  kanbanBatchLassoBox.value = {
    active: false,
    left: 0,
    top: 0,
    width: 0,
    height: 0
  };
  kanbanBatchLassoStart.value = null;
  isKanbanBatchLassoSelecting.value = false;
  kanbanBatchLassoBaseSelection = new Set();
}

function removeKanbanBatchLassoListeners(): void {
  if (kanbanBatchLassoMoveHandler) {
    window.removeEventListener('mousemove', kanbanBatchLassoMoveHandler);
    kanbanBatchLassoMoveHandler = null;
  }
  if (kanbanBatchLassoUpHandler) {
    window.removeEventListener('mouseup', kanbanBatchLassoUpHandler);
    kanbanBatchLassoUpHandler = null;
  }
}

function isKanbanBatchCardClickSuppressed(): boolean {
  return Date.now() < kanbanBatchLassoSuppressCardClickUntil;
}

function shouldIgnoreKanbanBatchLassoTarget(target: EventTarget | null): boolean {
  const targetElement = target instanceof Element
    ? target
    : (target instanceof Node ? target.parentElement : null);
  if (!targetElement) {
    return true;
  }
  if (!kanbanBoardRef.value?.contains(targetElement)) {
    return true;
  }
  return !!targetElement.closest(
    'button, input, textarea, select, a, [contenteditable="true"], .task-checkbox-wrapper, .task-card-action-btn, .column-header-actions'
  );
}

function buildKanbanBatchLassoRect(startX: number, startY: number, endX: number, endY: number) {
  const left = Math.min(startX, endX);
  const top = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height
  };
}

function collectKanbanBatchLassoTaskIds(rect: { left: number; top: number; right: number; bottom: number }): Set<string> {
  const taskIds = new Set<string>();
  if (!kanbanBoardRef.value) {
    return taskIds;
  }
  const taskNodes = kanbanBoardRef.value.querySelectorAll<HTMLElement>('.kanban-batch-item[data-task-id]');
  taskNodes.forEach((node) => {
    const taskId = node.dataset.taskId || '';
    if (!taskId) {
      return;
    }
    const nodeRect = node.getBoundingClientRect();
    const intersects = rect.left < nodeRect.right
      && rect.right > nodeRect.left
      && rect.top < nodeRect.bottom
      && rect.bottom > nodeRect.top;
    if (intersects) {
      taskIds.add(taskId);
    }
  });
  return taskIds;
}

function finishKanbanBatchLassoSelection(): void {
  if (isKanbanBatchLassoSelecting.value) {
    kanbanBatchLassoSuppressCardClickUntil = Date.now() + 240;
  }
  removeKanbanBatchLassoListeners();
  resetKanbanBatchLasso();
}

function handleKanbanBatchLassoMouseMove(event: MouseEvent): void {
  if (!isKanbanBatchEditMode.value || !kanbanBatchLassoStart.value) {
    return;
  }
  const start = kanbanBatchLassoStart.value;
  const rect = buildKanbanBatchLassoRect(start.x, start.y, event.clientX, event.clientY);
  const passedThreshold = rect.width > 4 || rect.height > 4;
  if (!passedThreshold) {
    return;
  }
  if (!isKanbanBatchLassoSelecting.value) {
    isKanbanBatchLassoSelecting.value = true;
  }
  event.preventDefault();
  kanbanBatchLassoBox.value = {
    active: true,
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height
  };
  const intersectedTaskIds = collectKanbanBatchLassoTaskIds(rect);
  const next = new Set(kanbanBatchLassoBaseSelection);
  // Toggle selection for tasks inside lasso area:
  // selected -> unselected, unselected -> selected.
  intersectedTaskIds.forEach((taskId) => {
    if (next.has(taskId)) {
      next.delete(taskId);
    } else {
      next.add(taskId);
    }
  });
  kanbanBatchSelectedTaskIds.value = next;
}

function handleKanbanBatchLassoMouseUp(_event: MouseEvent): void {
  finishKanbanBatchLassoSelection();
}

function handleKanbanBatchLassoMouseDown(event: MouseEvent): void {
  if (!isKanbanBatchEditMode.value || event.button !== 0) {
    return;
  }
  if (shouldIgnoreKanbanBatchLassoTarget(event.target)) {
    return;
  }
  removeKanbanBatchLassoListeners();
  resetKanbanBatchLasso();
  kanbanBatchLassoBaseSelection = new Set(kanbanBatchSelectedTaskIds.value);
  kanbanBatchLassoStart.value = { x: event.clientX, y: event.clientY };
  kanbanBatchLassoMoveHandler = handleKanbanBatchLassoMouseMove;
  kanbanBatchLassoUpHandler = handleKanbanBatchLassoMouseUp;
  window.addEventListener('mousemove', kanbanBatchLassoMoveHandler);
  window.addEventListener('mouseup', kanbanBatchLassoUpHandler);
}

function isKanbanTaskBatchSelected(taskId: string): boolean {
  return kanbanBatchSelectedTaskIds.value.has(taskId);
}

function toggleKanbanTaskBatchSelection(taskId: string): void {
  if (!isKanbanBatchEditMode.value) {
    return;
  }
  const normalizedTaskId = typeof taskId === 'string' ? taskId : '';
  if (!normalizedTaskId) {
    return;
  }
  const next = new Set(kanbanBatchSelectedTaskIds.value);
  if (next.has(normalizedTaskId)) {
    next.delete(normalizedTaskId);
  } else {
    next.add(normalizedTaskId);
  }
  kanbanBatchSelectedTaskIds.value = next;
}

function closeKanbanBatchMenu(): void {
  kanbanBatchMenuVisible.value = false;
  kanbanBatchMenuSubmenu.value = null;
  kanbanBatchTagSubmenuAction.value = null;
}

function openKanbanBatchMenu(task: Task, event: MouseEvent): void {
  event.preventDefault();
  if (kanbanBatchSelectedTaskIds.value.size === 0) {
    kanbanBatchSelectedTaskIds.value = new Set([task.id]);
  }
  const padding = 12;
  const menuWidth = 300;
  const menuHeight = 390;
  kanbanBatchMenuStyle.value = {
    left: `${Math.min(event.clientX + 8, Math.max(padding, window.innerWidth - menuWidth - padding))}px`,
    top: `${Math.min(event.clientY + 8, Math.max(padding, window.innerHeight - menuHeight - padding))}px`
  };
  kanbanBatchMenuSubmenu.value = null;
  kanbanBatchTagSubmenuAction.value = null;
  kanbanBatchMenuVisible.value = true;
}

async function applyKanbanBatchEditFromMenu(): Promise<void> {
  await applyKanbanBatchEdit();
  closeKanbanBatchMenu();
}

function getKanbanBatchTagOptions(_action?: TaskTagBatchAction): Array<{ value: string; text: string }> {
  return [
    ...visibleTaskGroups.value.map(group => ({ value: group.id, text: group.name }))
  ];
}

async function applyKanbanBatchStatusEdit(status: string): Promise<void> {
  kanbanBatchEditStatus.value = status;
  kanbanBatchEditPriority.value = '';
  kanbanBatchEditGroupId.value = '';
  await applyKanbanBatchEditFromMenu();
}

async function applyKanbanBatchPriorityEdit(priority: string): Promise<void> {
  kanbanBatchEditStatus.value = '';
  kanbanBatchEditPriority.value = priority;
  kanbanBatchEditGroupId.value = '';
  await applyKanbanBatchEditFromMenu();
}

async function applyKanbanBatchTagEdit(action: TaskTagBatchAction, groupId: string): Promise<void> {
  kanbanBatchEditStatus.value = '';
  kanbanBatchEditPriority.value = '';
  setKanbanBatchEditTagAction(action);
  kanbanBatchEditGroupId.value = groupId;
  await applyKanbanBatchEditFromMenu();
}

async function clearKanbanBatchTags(): Promise<void> {
  await applyKanbanBatchTagEdit('set-primary', TASK_GROUP_NONE_ID);
}

function toggleSelectAllVisibleKanbanTasks(): void {
  if (!isKanbanBatchEditMode.value) {
    return;
  }
  const visibleIds = visibleKanbanTasks.value.map(task => task.id);
  if (visibleIds.length === 0) {
    return;
  }
  if (allVisibleKanbanTasksSelected.value) {
    const visibleIdSet = new Set(visibleIds);
    const next = new Set(
      Array.from(kanbanBatchSelectedTaskIds.value).filter(taskId => !visibleIdSet.has(taskId))
    );
    kanbanBatchSelectedTaskIds.value = next;
    return;
  }
  const next = new Set(kanbanBatchSelectedTaskIds.value);
  visibleIds.forEach(taskId => next.add(taskId));
  kanbanBatchSelectedTaskIds.value = next;
}

function getKanbanColumnSelectableTaskIds(column: KanbanColumn): string[] {
  if (column.type !== 'status' && column.type !== 'group' && column.type !== 'heading' && column.type !== 'date') {
    return [];
  }
  return getTasksForColumn(column).map(task => task.id);
}

function isKanbanColumnBatchAllSelected(column: KanbanColumn): boolean {
  const taskIds = getKanbanColumnSelectableTaskIds(column);
  if (taskIds.length === 0) {
    return false;
  }
  return taskIds.every(taskId => kanbanBatchSelectedTaskIds.value.has(taskId));
}

function isKanbanColumnBatchPartiallySelected(column: KanbanColumn): boolean {
  const taskIds = getKanbanColumnSelectableTaskIds(column);
  if (taskIds.length === 0) {
    return false;
  }
  let selectedCount = 0;
  taskIds.forEach(taskId => {
    if (kanbanBatchSelectedTaskIds.value.has(taskId)) {
      selectedCount += 1;
    }
  });
  return selectedCount > 0 && selectedCount < taskIds.length;
}

function toggleKanbanColumnBatchSelection(column: KanbanColumn): void {
  if (!isKanbanBatchEditMode.value) {
    return;
  }
  const taskIds = getKanbanColumnSelectableTaskIds(column);
  if (taskIds.length === 0) {
    return;
  }
  const next = new Set(kanbanBatchSelectedTaskIds.value);
  const allSelected = taskIds.every(taskId => next.has(taskId));
  if (allSelected) {
    taskIds.forEach(taskId => next.delete(taskId));
  } else {
    taskIds.forEach(taskId => next.add(taskId));
  }
  kanbanBatchSelectedTaskIds.value = next;
}

function handleKanbanTaskCardClick(task: Task, event?: MouseEvent): void {
  if (isKanbanBatchEditMode.value) {
    if (isKanbanBatchCardClickSuppressed()) {
      return;
    }
    toggleKanbanTaskBatchSelection(task.id);
    return;
  }
  handleTaskClick(task, event);
}

function handleKanbanTaskContextMenu(task: Task, event: MouseEvent): void {
  if (isKanbanBatchEditMode.value) {
    openKanbanBatchMenu(task, event);
    return;
  }
  if (isKanbanBatchCardClickSuppressed()) {
    return;
  }
  const target = event.target instanceof Element
    ? event.target
    : (event.target instanceof Node ? event.target.parentElement : null);
  if (
    target?.closest('[data-disable-description-contextmenu]')
    || target?.closest('button, input, textarea, select, a, [contenteditable="true"]')
  ) {
    return;
  }
  event.preventDefault();
  void openKanbanEditor(task, event);
}

function handleKanbanTaskToggleStatus(task: Task): void {
  if (isKanbanBatchEditMode.value) {
    if (isKanbanBatchCardClickSuppressed()) {
      return;
    }
    toggleKanbanTaskBatchSelection(task.id);
    return;
  }
  void toggleTaskStatus(task);
}

function startFocusForTask(task: Task): void {
  openHabitTrackerFocusTimer(createTaskFocusTarget(task));
}

function handleKanbanEditorStartFocus(): void {
  const task = activeKanbanEditTask.value;
  if (!task) {
    return;
  }

  let floatingFocusEnabled = false;
  try {
    floatingFocusEnabled = localStorage.getItem(FLOATING_FOCUS_STORAGE_KEY) === 'true';
  } catch {
    floatingFocusEnabled = false;
  }

  closeKanbanEditor();

  if (floatingFocusEnabled) {
    eventBus.emit(Events.FOCUS_TIMER_PANEL_OPEN_REQUEST, {
      target: createTaskFocusTarget(task),
      showPanel: false,
      openMiniSettings: true
    });
    return;
  }

  startFocusForTask(task);
}

function handleKanbanEditorOpenContent(): void {
  const task = activeKanbanEditTask.value;
  if (!task) {
    return;
  }
  void handleTaskEditClick(task);
}

async function saveQuadrantUrgencyDays(): Promise<void> {
  const index = Math.max(0, Math.min(QUADRANT_URGENCY_DAY_OPTIONS.length - 1, quadrantUrgencyDayIndex.value));
  quadrantUrgencyDayIndex.value = index;
  await updateSettings('kanban', { quadrantUrgentDays: quadrantUrgentDays.value });
}

function openKanbanTaskContentInRight(task: Task): void {
  void openKanbanTaskContent(task, 'right');
}

async function applyKanbanBatchEdit(): Promise<void> {
  if (isKanbanBatchApplying.value) {
    return;
  }
  const selectedIds = Array.from(kanbanBatchSelectedTaskIds.value);
  if (selectedIds.length === 0) {
    await pushMsg(t('taskManager.selectTasksFirst'), 2200);
    return;
  }

  const nextStatus = isKanbanBatchStatus(kanbanBatchEditStatus.value) ? kanbanBatchEditStatus.value : null;
  const nextPriority = isKanbanBatchPriority(kanbanBatchEditPriority.value) ? kanbanBatchEditPriority.value : null;
  const nextTagAction = normalizeKanbanBatchTagAction(kanbanBatchEditTagAction.value);
  const rawGroupSelection = typeof kanbanBatchEditGroupId.value === 'string' ? kanbanBatchEditGroupId.value.trim() : '';
  const validGroupIds = visibleTaskGroupIdSet.value;
  let nextTagSelection: { action: TaskTagBatchAction; tagId: string } | null = null;
  if (rawGroupSelection) {
    if (rawGroupSelection === TASK_GROUP_NONE_ID) {
      if (nextTagAction !== 'set-primary') {
        await pushMsg(t('taskManager.selectValidTag'), 2200);
        return;
      }
      nextTagSelection = { action: nextTagAction, tagId: '' };
    } else if (validGroupIds.has(rawGroupSelection)) {
      nextTagSelection = { action: nextTagAction, tagId: rawGroupSelection };
    } else {
      await pushMsg(t('taskManager.selectValidTag'), 2200);
      return;
    }
  }

  if (!nextStatus && !nextPriority && nextTagSelection === null) {
    await pushMsg(t('taskManager.selectBatchFields'), 2200);
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
    await pushMsg(t('taskManager.noBatchUpdates'), 2200);
    return;
  }

  isKanbanBatchApplying.value = true;
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

      const taskIndex = tasks.value.findIndex(item => item.id === update.task.id);
      if (taskIndex !== -1) {
        const targetTask = tasks.value[taskIndex];
        if (update.nextStatus) {
          targetTask.status = update.nextStatus;
          if (update.nextStatus === 'completed') {
            targetTask.completedAt = targetTask.completedAt || nowIso;
            hasNewlyCompletedTask = true;
          } else {
            delete targetTask.completedAt;
          }
          crdtRepo.updateTaskField(update.task.id, 'status', update.nextStatus);
        }
        if (update.nextPriority) {
          targetTask.priority = update.nextPriority;
          crdtRepo.updateTaskField(update.task.id, 'priority', update.nextPriority);
        }
        if (update.nextTagIds !== null) {
          targetTask.tags = [...update.nextTagIds];
          crdtRepo.updateTaskField(update.task.id, 'tags', [...update.nextTagIds]);
        }
        if (update.nextGroupId !== null) {
          targetTask.groupId = update.nextGroupId;
          crdtRepo.updateTaskField(update.task.id, 'groupId', update.nextGroupId);
        }
        targetTask.updatedAt = nowIso;
      }

      if (kanbanEditorDraft.value?.taskId === update.task.id) {
        if (update.nextStatus) {
          kanbanEditorDraft.value.status = update.nextStatus;
        }
        if (update.nextPriority) {
          kanbanEditorDraft.value.priority = update.nextPriority;
        }
        if (update.nextTagIds !== null) {
          kanbanEditorDraft.value.tags = [...update.nextTagIds];
        }
        if (update.nextGroupId !== null) {
          kanbanEditorDraft.value.groupId = update.nextGroupId || '';
        }
      }
    });

    invalidateTableFilters();
    if (hasNewlyCompletedTask && taskCompletionSoundEnabled.value) {
      playTaskCompletionSound();
    }

    if (successCount > 0) {
      await pushMsg(`${t('taskManager.batchUpdatedPrefix')} ${successCount} ${t('taskManager.batchUpdatedSuffix')}`, 2200);
    }
    if (failedCount > 0) {
      await pushMsg(`${t('taskManager.batchUpdateFailedPrefix')} ${failedCount} ${t('taskManager.batchUpdateFailedSuffix')}`, 3000);
    }
  } finally {
    isKanbanBatchApplying.value = false;
  }
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

function isVirtualTaskForToday(task: Task): boolean {
  if (!task.isVirtual) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();
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

function matchesKanbanDueFilter(task: Task, filter: KanbanTaskDueFilterKey): boolean {
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

function getKanbanUpdatedFilterRange(
  filter: KanbanTaskUpdateFilterKey
): { start: number; end: number } {
  const dayMs = 24 * 60 * 60 * 1000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();

  switch (filter) {
    case 'today':
      return { start: todayStart, end: todayStart + dayMs };
    case 'thisWeek': {
      const weekStart = getStartOfWeekMonday(today);
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

function matchesKanbanUpdatedFilter(task: Task, filter: KanbanTaskUpdateFilterKey): boolean {
  const { start, end } = getKanbanUpdatedFilterRange(filter);
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

function normalizeSearchText(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function collectSubtaskTitles(subtasks: SubTask[] | undefined, result: string[]): void {
  if (!subtasks || subtasks.length === 0) return;
  for (const subtask of subtasks) {
    if (subtask.title) {
      const text = normalizeSearchText(stripHtml(subtask.title));
      if (text) {
        result.push(text);
      }
    }
    if (subtask.subtasks?.length) {
      collectSubtaskTitles(subtask.subtasks, result);
    }
  }
}

function getTaskSearchText(task: Task): string {
  const segments: string[] = [];
  if (task.title) {
    const titleText = normalizeSearchText(stripHtml(task.title));
    if (titleText) {
      segments.push(titleText);
    }
  }
  if (task.description) {
    const descriptionText = normalizeSearchText(stripHtml(task.description));
    if (descriptionText) {
      segments.push(descriptionText);
    }
  }
  if (task.hPath) {
    const locationText = normalizeSearchText(stripHtml(task.hPath));
    if (locationText) {
      segments.push(locationText);
    }
  }
  const tagLabels = resolveTaskTagIds(task.tags, task.groupId)
    .map(tagId => normalizeSearchText(kanbanTaskGroupNameMap.value.get(tagId) || ''))
    .filter(Boolean);
  if (tagLabels.length > 0) {
    segments.push(tagLabels.join(' '));
  }
  if (task.subtasks?.length) {
    const subtaskTexts: string[] = [];
    collectSubtaskTitles(task.subtasks, subtaskTexts);
    if (subtaskTexts.length > 0) {
      segments.push(subtaskTexts.join(' '));
    }
  }
  return segments.join(' ');
}

function matchesTableSearch(task: Task): boolean {
  const needle = normalizedTableSearch.value;
  if (!needle) return true;
  const tokens = needle.split(' ').filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = getTaskSearchText(task);
  if (!haystack) return false;
  return tokens.every(token => haystack.includes(token));
}

function matchesKanbanFilters(task: Task): boolean {
  return matchesKanbanFiltersByDocumentScope(task, true) && matchesTableSearch(task);
}

function matchesTableFiltersByArchivedState(
  task: Task,
  archivedOnly: boolean,
  includeDocumentFilter: boolean = true
): boolean {
  if (!hasVisibleTaskTitle(task.title)) return false;
  if (task.type !== 'block') return false;
  if (archivedOnly ? !task.archived : task.archived) return false;
  if (archivedOnly && task.isVirtual) return false;
  if (!archivedOnly) {
    if (!task.isVirtual && task.repeatSeriesId && virtualRepeatSeriesIds.value.has(task.repeatSeriesId)) {
      return false;
    }
    if (task.isVirtual && !visibleVirtualRepeatTaskIds.value.has(task.id)) {
      return false;
    }
  }
  if (!matchesTaskBySourceAndDocument(
    task,
    tableFilterType.value,
    includeDocumentFilter ? tableFilterDocument.value : 'all'
  )) return false;
  if (!archivedOnly && !showCompletedTasks.value && isTaskCompletedVisual(task)) return false;
  if (!matchesTableSearch(task)) return false;
  if (activeTableStatusFilters.value.length > 0) {
    const status = getTaskVisualStatus(task);
    if (!activeTableStatusFilters.value.includes(status)) {
      return false;
    }
  }
  if (activeTablePriorityFilters.value.length > 0 && !activeTablePriorityFilters.value.includes(task.priority)) {
    return false;
  }
  if (!matchesTaskTagFilter(task.tags, task.groupId, activeTableGroupFilters.value, TASK_GROUP_NONE_ID)) {
    return false;
  }
  if (activeTableDueFilters.value.length > 0 && !activeTableDueFilters.value.some(filter => matchesKanbanDueFilter(task, filter))) {
    return false;
  }
  if (activeTableUpdatedFilters.value.length > 0 && !activeTableUpdatedFilters.value.some(filter => matchesKanbanUpdatedFilter(task, filter))) {
    return false;
  }
  if (activeTableExtraFilters.value.length > 0) {
    const wantsDescription = activeTableExtraFilters.value.includes('hasDescription');
    const wantsSubtasks = activeTableExtraFilters.value.includes('hasSubtasks');
    const wantsFocusEstimate = activeTableExtraFilters.value.includes('hasFocusEstimate');
    const hasDescription = typeof task.description === 'string' && task.description.trim().length > 0;
    const hasSubtasks = Array.isArray(task.subtasks) && task.subtasks.length > 0;
    const hasFocusEstimate = !!task.focusEstimate;

    if ((wantsDescription && hasDescription) || (wantsSubtasks && hasSubtasks) || (wantsFocusEstimate && hasFocusEstimate)) {
      return true;
    }
    if (wantsDescription || wantsSubtasks || wantsFocusEstimate) {
      return false;
    }
  }
  return true;
}

function matchesTableFilters(task: Task): boolean {
  return matchesTableFiltersByArchivedState(task, false);
}

function matchesArchivedTableFilters(task: Task): boolean {
  return matchesTableFiltersByArchivedState(task, true);
}

function getGroupColumnIdForTask(task: Task): string {
  const rawGroupId = typeof task.groupId === 'string' ? task.groupId.trim() : '';
  if (!rawGroupId) {
    return TASK_GROUP_NONE_ID;
  }
  return taskGroupIdSet.value.has(rawGroupId) ? rawGroupId : TASK_GROUP_NONE_ID;
}

function getHeadingColumnIdForTask(task: Task): string {
  return getTaskHeadingGroupMeta(task, taskHeadingGroups.value).key;
}

function normalizeTaskIdentityId(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function getTaskHeadingIdentityIds(task: Task): string[] {
  return Array.from(new Set([
    normalizeTaskIdentityId(task.id),
    normalizeTaskIdentityId(task.taskId),
    normalizeTaskIdentityId(task.blockId),
    normalizeTaskIdentityId(task.sourceBlockId)
  ].filter(Boolean)));
}

function rememberPendingTaskHeadingGroupMetaForIds(
  taskIds: string[],
  meta: TaskHeadingGroupMeta | null | undefined
): void {
  if (!meta) {
    return;
  }
  const expiresAt = Date.now() + PENDING_TASK_HEADING_GROUP_TTL_MS;
  taskIds
    .map(normalizeTaskIdentityId)
    .filter(Boolean)
    .forEach(taskId => {
      pendingTaskHeadingGroups.set(taskId, { meta: { ...meta }, expiresAt });
    });
}

function forgetPendingTaskHeadingGroupMetaForIds(taskIds: string[]): void {
  taskIds
    .map(normalizeTaskIdentityId)
    .filter(Boolean)
    .forEach(taskId => {
      pendingTaskHeadingGroups.delete(taskId);
    });
}

function getPendingTaskHeadingGroupMetaForTask(
  task: Task,
  now: number
): TaskHeadingGroupMeta | null {
  for (const taskId of getTaskHeadingIdentityIds(task)) {
    const pending = pendingTaskHeadingGroups.get(taskId);
    if (!pending) {
      continue;
    }
    if (pending.expiresAt <= now) {
      pendingTaskHeadingGroups.delete(taskId);
      continue;
    }
    return pending.meta;
  }
  return null;
}

function applyPendingTaskHeadingGroupOverrides(
  resolvedGroups: Map<string, TaskHeadingGroupMeta>
): Map<string, TaskHeadingGroupMeta> {
  if (pendingTaskHeadingGroups.size === 0) {
    return resolvedGroups;
  }

  const now = Date.now();
  pendingTaskHeadingGroups.forEach((pending, taskId) => {
    if (pending.expiresAt <= now) {
      pendingTaskHeadingGroups.delete(taskId);
    }
  });
  if (pendingTaskHeadingGroups.size === 0) {
    return resolvedGroups;
  }

  const nextGroupMap = new Map(resolvedGroups);
  for (const task of tasks.value) {
    const pendingMeta = getPendingTaskHeadingGroupMetaForTask(task, now);
    if (!pendingMeta) {
      continue;
    }
    getTaskHeadingIdentityIds(task).forEach(taskId => {
      nextGroupMap.set(taskId, { ...pendingMeta });
    });
  }
  return nextGroupMap;
}

function setTaskHeadingGroupMetaForIds(
  taskIds: string[],
  meta: TaskHeadingGroupMeta | null | undefined,
  options: { rememberPending?: boolean } = {}
): void {
  if (!meta) {
    return;
  }
  const normalizedIds = Array.from(new Set(
    taskIds
      .map(id => typeof id === 'string' ? id.trim() : '')
      .filter(Boolean)
  ));
  if (normalizedIds.length === 0) {
    return;
  }
  const nextGroupMap = new Map(taskHeadingGroups.value);
  normalizedIds.forEach(taskId => {
    nextGroupMap.set(taskId, { ...meta });
  });
  taskHeadingGroups.value = nextGroupMap;
  if (options.rememberPending === true) {
    rememberPendingTaskHeadingGroupMetaForIds(normalizedIds, meta);
  }
}

const kanbanTasksByVisualStatus = computed<Record<string, Task[]>>(() => {
  const grouped: Record<string, Task[]> = {
    'pending': [],
    'in-progress': [],
    'delayed': [],
    'completed': [],
    'cancelled': []
  };

  const sourceTasks = visibleKanbanTasks.value;
  const dayMs = 24 * 60 * 60 * 1000;
  const today = getStartOfDay(new Date());
  const todayStart = today.getTime();
  const tomorrowStart = todayStart + dayMs;
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1).getTime();
  const weekStartTimestamp = getStartOfWeekMonday(today).getTime();
  const weekEnd = weekStartTimestamp + dayMs * 7;

  for (const task of sourceTasks) {
    const status = getTaskVisualStatus(task);
    if (grouped[status]) {
      grouped[status].push(task);
    }
  }

  const isTimestampInDateGroup = (timestamp: number | null, groupKey: KanbanDateGroupKey): boolean => {
    if (timestamp === null) {
      return false;
    }
    if (groupKey === 'overdue') {
      return timestamp < todayStart;
    }
    if (groupKey === 'today') {
      return timestamp >= todayStart && timestamp < tomorrowStart;
    }
    if (groupKey === 'thisWeek') {
      return timestamp >= weekStartTimestamp && timestamp < weekEnd;
    }
    if (groupKey === 'thisMonth') {
      return timestamp >= monthStart && timestamp < monthEnd;
    }
    return false;
  };

  const sortContext = createSidebarSortContext();
  for (const groupKey of Object.keys(grouped) as KanbanDateGroupKey[]) {
    const list = grouped[groupKey];
    sortTasksLikeSidebar(list, sortContext);
    const originalIndex = new Map<string, number>();
    list.forEach((task, index) => {
      originalIndex.set(task.id, index);
    });
    list.sort((left, right) => {
      const leftDueInGroup = isTimestampInDateGroup(getTaskDueDateTimestamp(left), groupKey);
      const rightDueInGroup = isTimestampInDateGroup(getTaskDueDateTimestamp(right), groupKey);
      if (leftDueInGroup !== rightDueInGroup) {
        return leftDueInGroup ? -1 : 1;
      }
      return (originalIndex.get(left.id) ?? 0) - (originalIndex.get(right.id) ?? 0);
    });
  }

  return grouped;
});

const kanbanTasksByGroup = computed<Record<string, Task[]>>(() => {
  const grouped: Record<string, Task[]> = {
    [TASK_GROUP_NONE_ID]: []
  };
  for (const group of taskGroups.value) {
    if (group && group.id) {
      grouped[group.id] = [];
    }
  }

  const sourceTasks = visibleKanbanTasks.value;
  for (const task of sourceTasks) {
    const groupId = getGroupColumnIdForTask(task);
    if (!grouped[groupId]) {
      grouped[groupId] = [];
    }
    grouped[groupId].push(task);
  }

  const sortContext = createSidebarSortContext();
  for (const list of Object.values(grouped)) {
    sortTasksLikeSidebar(list, sortContext);
  }

  return grouped;
});

const kanbanTasksByHeading = computed<Record<string, Task[]>>(() => {
  const grouped: Record<string, Task[]> = {};

  const sourceTasks = visibleKanbanTasks.value;
  for (const task of sourceTasks) {
    const headingKey = getHeadingColumnIdForTask(task);
    if (!grouped[headingKey]) {
      grouped[headingKey] = [];
    }
    grouped[headingKey].push(task);
  }

  const sortContext = createSidebarSortContext();
  for (const list of Object.values(grouped)) {
    sortTasksLikeSidebar(list, sortContext);
  }

  return grouped;
});
const kanbanTasksByDate = computed<Record<KanbanDateGroupKey, Task[]>>(() => {
  const grouped: Record<KanbanDateGroupKey, Task[]> = {
    overdue: [],
    today: [],
    thisWeek: [],
    thisMonth: [],
    other: []
  };
  const filteredTasks = visibleKanbanTasks.value;
  const dayMs = 24 * 60 * 60 * 1000;
  const today = getStartOfDay(new Date());
  const todayStart = today.getTime();
  const tomorrowStart = todayStart + dayMs;
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1).getTime();
  const weekStartTimestamp = getStartOfWeekMonday(today).getTime();
  const weekEnd = weekStartTimestamp + dayMs * 7;
  const todayVirtualSeriesIdSet = new Set<string>();

  for (const task of filteredTasks) {
    if (task.isVirtual && task.repeatSeriesId && isVirtualTaskForToday(task)) {
      todayVirtualSeriesIdSet.add(task.repeatSeriesId);
    }
  }

  for (const task of filteredTasks) {
    const dueTimestamp = getTaskDueDateTimestamp(task);
    const groupingTimestamp = dueTimestamp ?? getTaskDateTimestamp(task.createdAt);
    const repeatSeriesId = typeof task.repeatSeriesId === 'string' ? task.repeatSeriesId.trim() : '';
    const hasTodayVirtualInstance = !!repeatSeriesId && todayVirtualSeriesIdSet.has(repeatSeriesId);
    let dateGroupKey: KanbanDateGroupKey = 'other';

    if (hasTodayVirtualInstance) {
      dateGroupKey = 'today';
    } else if (dueTimestamp !== null && dueTimestamp < todayStart) {
      dateGroupKey = 'overdue';
    } else if (groupingTimestamp !== null) {
      if (groupingTimestamp >= todayStart && groupingTimestamp < tomorrowStart) {
        dateGroupKey = 'today';
      } else if (groupingTimestamp >= weekStartTimestamp && groupingTimestamp < weekEnd) {
        dateGroupKey = 'thisWeek';
      } else if (groupingTimestamp >= monthStart && groupingTimestamp < monthEnd) {
        dateGroupKey = 'thisMonth';
      }
    }

    grouped[dateGroupKey].push(task);
  }

  const sortContext = createSidebarSortContext();
  for (const list of Object.values(grouped)) {
    sortTasksLikeSidebar(list, sortContext);
  }

  return grouped;
});

const kanbanTasksByDocument = computed<Record<string, Task[]>>(() => {
  const grouped: Record<string, Task[]> = {};
  for (const task of visibleKanbanTasks.value) {
    const documentKey = getDocumentColumnIdForTask(task);
    if (!grouped[documentKey]) {
      grouped[documentKey] = [];
    }
    grouped[documentKey].push(task);
  }

  const sortContext = createSidebarSortContext();
  for (const list of Object.values(grouped)) {
    sortTasksLikeSidebar(list, sortContext);
  }

  return grouped;
});

function getFilteredTasksForStatus(status?: string): Task[] {
  if (!status) return [];
  return kanbanTasksByVisualStatus.value[status] || [];
}

function getTasksForColumn(column: KanbanColumn): Task[] {
  if (column.type === 'status') {
    return getFilteredTasksForStatus(column.status);
  }
  if (column.type === 'heading') {
    return kanbanTasksByHeading.value[column.id] || [];
  }
  if (column.type === 'date') {
    const dateGroupKey = column.dateGroupKey;
    return dateGroupKey ? (kanbanTasksByDate.value[dateGroupKey] || []) : [];
  }
  if (column.type === 'document') {
    return kanbanTasksByDocument.value[column.id] || [];
  }
  return kanbanTasksByGroup.value[column.id] || [];
}

function shouldUseKanbanVirtualList(column: KanbanColumn, taskCount: number): boolean {
  if (column.type !== 'status' && column.type !== 'group' && column.type !== 'heading' && column.type !== 'date' && column.type !== 'document') {
    return false;
  }
  if (taskCount <= KANBAN_VIRTUAL_THRESHOLD) {
    return false;
  }
  return true;
}

function findKanbanTaskIndexForOffset(offsets: number[], offset: number): number {
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

function countNestedSubtasks(subtasks: Task['subtasks'] | undefined): number {
  if (!subtasks || subtasks.length === 0) return 0;
  let count = 0;
  const stack: Task['subtasks'][] = [subtasks];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    count += current.length;
    for (const subtask of current) {
      if (subtask.subtasks && subtask.subtasks.length > 0) {
        stack.push(subtask.subtasks);
      }
    }
  }
  return count;
}

function estimateExpandedKanbanTaskHeight(baseHeight: number, task: Task): number {
  if (!isKanbanTaskExpanded(task.id)) {
    return baseHeight;
  }
  const subtaskCount = countNestedSubtasks(task.subtasks);
  const subtaskBonus = Math.min(subtaskCount, 24) * 28 + (subtaskCount > 24 ? 56 : 0);
  const descriptionBonus = showKanbanTaskCardDetails.value && task.description?.trim() ? 22 : 0;
  return baseHeight + subtaskBonus + descriptionBonus;
}

function getKanbanTaskMeasuredHeight(columnId: string, taskId: string): number | undefined {
  return kanbanColumnTaskHeightCache.get(columnId)?.get(taskId);
}

function getKanbanTaskEstimatedHeight(columnId: string, task: Task): number {
  kanbanColumnHeightVersion.value;
  return getKanbanTaskMeasuredHeight(columnId, task.id)
    ?? estimateExpandedKanbanTaskHeight(kanbanColumnEstimatedHeights.value[columnId] || KANBAN_VIRTUAL_CARD_HEIGHT, task);
}

function getKanbanTaskHeightOffsets(column: KanbanColumn, tasks: Task[]): number[] {
  const offsets = new Array(tasks.length + 1);
  offsets[0] = 0;
  for (let index = 0; index < tasks.length; index += 1) {
    const task = tasks[index];
    const gap = index < tasks.length - 1 ? KANBAN_VIRTUAL_CARD_GAP : 0;
    offsets[index + 1] = offsets[index] + getKanbanTaskEstimatedHeight(column.id, task) + gap;
  }
  return offsets;
}

function getKanbanVirtualRange(column: KanbanColumn, tasks: Task[]) {
  const totalCount = tasks.length;
  if (!shouldUseKanbanVirtualList(column, totalCount)) {
    return { start: 0, end: totalCount, top: 0, bottom: 0 };
  }
  const offsets = getKanbanTaskHeightOffsets(column, tasks);
  const metrics = kanbanColumnMetrics.value[column.id];
  const scrollTop = metrics?.scrollTop || 0;
  const height = metrics?.height || 600;
  const startIndex = Math.max(
    0,
    findKanbanTaskIndexForOffset(offsets, scrollTop) - KANBAN_VIRTUAL_OVERSCAN
  );
  const endIndex = Math.min(
    totalCount,
    findKanbanTaskIndexForOffset(offsets, scrollTop + height) + KANBAN_VIRTUAL_OVERSCAN + 1
  );
  const topPadding = offsets[startIndex] || 0;
  const totalHeight = offsets[offsets.length - 1] || 0;
  const bottomPadding = Math.max(0, totalHeight - (offsets[endIndex] || 0));
  return {
    start: startIndex,
    end: endIndex,
    top: topPadding,
    bottom: bottomPadding
  };
}

function getVisibleTasksForColumn(column: KanbanColumn): Task[] {
  const tasks = getTasksForColumn(column);
  const range = getKanbanVirtualRange(column, tasks);
  return tasks.slice(range.start, range.end);
}

function getKanbanSpacerStyle(column: KanbanColumn): Record<string, string> {
  const tasks = getTasksForColumn(column);
  if (!shouldUseKanbanVirtualList(column, tasks.length)) {
    return {};
  }
  const range = getKanbanVirtualRange(column, tasks);
  return {
    paddingTop: `${range.top}px`,
    paddingBottom: `${range.bottom}px`
  };
}

function cleanTaskTitleHtml(html: string): string {
  return html.replace(/\{:\s*[^}]*\}/g, '').trim();
}

function getLiveKanbanTaskTitle(blockId: string): string | null {
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

function hydrateKanbanMemoTitlesSync(taskList: Task[], limit = KANBAN_TITLE_HYDRATE_LIMIT): void {
  let handled = 0;
  for (const task of taskList) {
    if (handled >= limit) break;
    if (task.type !== 'block' || !task.blockId) continue;
    const currentTitle = typeof task.title === 'string' ? task.title : '';
    if (!currentTitle.includes('<sup') && !hasMarkdownInlineMemo(currentTitle)) continue;
    const liveTitle = getLiveKanbanTaskTitle(task.blockId);
    if (!liveTitle || liveTitle === currentTitle) continue;
    task.title = liveTitle;
    handled += 1;
  }
}

function scheduleKanbanTitleHydration(delay = 120): void {
  if (kanbanTitleHydrateTimer !== null) {
    clearTimeout(kanbanTitleHydrateTimer);
  }
  kanbanTitleHydrateTimer = window.setTimeout(() => {
    kanbanTitleHydrateTimer = null;
    void hydrateVisibleKanbanTitles();
  }, delay);
}

function hasMarkdownInlineMemo(title: string): boolean {
  const inlineMemoRegex = /\(\(([^()]+)\)\)/g;
  let match: RegExpExecArray | null;
  while ((match = inlineMemoRegex.exec(title)) !== null) {
    const content = match[1];
    if (!/^[0-9]{14}-[a-z0-9]{7,}$/.test(content)) {
      return true;
    }
  }
  return false;
}

async function hydrateVisibleKanbanTitles(): Promise<void> {
  if (isKanbanTitleHydrating || currentView.value !== 'kanban') {
    return;
  }
  if (!isSettingsLoaded.value) {
    return;
  }
  const blockIds: string[] = [];
  const seen = new Set<string>();
  for (const column of kanbanColumns.value) {
    if (column.type === 'action') continue;
    const visibleTasks = getVisibleTasksForColumn(column);
    for (const task of visibleTasks) {
      if (task.type !== 'block' || !task.blockId) continue;
      if (seen.has(task.blockId)) continue;
      const titleHtml = typeof task.title === 'string' ? task.title : '';
      if (!titleHtml.includes('<sup') && !hasMarkdownInlineMemo(titleHtml)) {
        continue;
      }
      seen.add(task.blockId);
      blockIds.push(task.blockId);
      if (blockIds.length >= KANBAN_TITLE_HYDRATE_LIMIT) break;
    }
    if (blockIds.length >= KANBAN_TITLE_HYDRATE_LIMIT) break;
  }
  if (blockIds.length === 0) {
    return;
  }

  isKanbanTitleHydrating = true;
  try {
    const updatedTasksMap = await TaskRepository.getTasksByBlockIds(
      blockIds,
      false,
      undefined,
      { useLiveDom: true }
    );
    if (updatedTasksMap.size === 0) {
      return;
    }

    const indexByBlockId = new Map<string, number>();
    tasks.value.forEach((task, index) => {
      if (task.type === 'block' && task.blockId) {
        indexByBlockId.set(task.blockId, index);
      }
    });

    let touched = false;
    updatedTasksMap.forEach((updatedTask, blockId) => {
      const index = indexByBlockId.get(blockId);
      if (index === undefined) return;
      const lockedStatus = getLockedDraggedTaskStatus(blockId);
      if (lockedStatus) {
        updatedTask.status = lockedStatus;
      }
      Object.assign(tasks.value[index], updatedTask);
      touched = true;
    });

    if (touched) {
      tasks.value = applyDraggedStatusLocks(tasks.value);
      invalidateTableFilters();
    }
  } catch (error) {
    console.error('[KanbanView] Failed to hydrate task titles:', error);
  } finally {
    isKanbanTitleHydrating = false;
  }
}

function updateKanbanColumnMetrics(columnId: string, el: HTMLElement): void {
  const next = {
    scrollTop: el.scrollTop,
    height: el.clientHeight
  };
  const prev = kanbanColumnMetrics.value[columnId];
  if (prev && prev.scrollTop === next.scrollTop && prev.height === next.height) {
    return;
  }
  kanbanColumnMetrics.value = {
    ...kanbanColumnMetrics.value,
    [columnId]: next
  };
}

function updateKanbanColumnEstimate(columnId: string, el: HTMLElement): void {
  const items = Array.from(el.querySelectorAll<HTMLElement>('.kanban-batch-item[data-task-id]'));
  if (items.length === 0) return;

  let changed = false;
  const cache = kanbanColumnTaskHeightCache.get(columnId) || new Map<string, number>();
  if (!kanbanColumnTaskHeightCache.has(columnId)) {
    kanbanColumnTaskHeightCache.set(columnId, cache);
  }

  const collapsedHeights: number[] = [];
  for (const item of items) {
    const taskId = item.dataset.taskId;
    if (!taskId) continue;
    const height = Math.max(1, Math.round(item.getBoundingClientRect().height));
    const previousHeight = cache.get(taskId);
    if (previousHeight !== height) {
      cache.set(taskId, height);
      changed = true;
    }
    if (!expandedKanbanTaskIds.value.has(taskId)) {
      collapsedHeights.push(height);
    }
  }

  if (changed) {
    kanbanColumnHeightVersion.value += 1;
  }

  if (collapsedHeights.length === 0) {
    return;
  }
  const averageHeight = Math.round(
    collapsedHeights.reduce((total, height) => total + height, 0) / collapsedHeights.length
  );
  const prev = kanbanColumnEstimatedHeights.value[columnId] || KANBAN_VIRTUAL_CARD_HEIGHT;
  if (averageHeight && Math.abs(prev - averageHeight) >= 4) {
    kanbanColumnEstimatedHeights.value = {
      ...kanbanColumnEstimatedHeights.value,
      [columnId]: averageHeight
    };
  }
}

function setKanbanColumnTasksRef(columnId: string, el: HTMLElement | null): void {
  if (!el) {
    kanbanColumnElements.delete(columnId);
    return;
  }
  const current = kanbanColumnElements.get(columnId);
  if (current === el) {
    return;
  }
  kanbanColumnElements.set(columnId, el);
  scheduleKanbanMetricsUpdate(columnId);
}

function handleKanbanColumnScroll(event: Event, column: KanbanColumn): void {
  if (column.type === 'action') return;
  const target = event.target as HTMLElement | null;
  if (!target) return;
  kanbanColumnElements.set(column.id, target);
  scheduleKanbanMetricsUpdate(column.id);
  scheduleKanbanTitleHydration(160);
}

function scheduleKanbanMetricsUpdate(columnId: string): void {
  if (!isKanbanViewMounted || currentView.value !== 'kanban') {
    return;
  }
  pendingKanbanMetricColumnIds.add(columnId);
  if (kanbanMetricsRaf !== null) return;
  kanbanMetricsRaf = requestAnimationFrame(() => {
    kanbanMetricsRaf = null;
    if (!isKanbanViewMounted || currentView.value !== 'kanban') {
      pendingKanbanMetricColumnIds.clear();
      return;
    }
    const columnIds = Array.from(pendingKanbanMetricColumnIds);
    pendingKanbanMetricColumnIds.clear();
    for (const id of columnIds) {
      const el = kanbanColumnElements.get(id);
      if (!el || !el.isConnected) continue;
      updateKanbanColumnMetrics(id, el);
      updateKanbanColumnEstimate(id, el);
    }
  });
}

function scheduleAllKanbanMetricsUpdates(): void {
  if (!isKanbanViewMounted || currentView.value !== 'kanban') {
    return;
  }
  for (const columnId of kanbanColumnElements.keys()) {
    scheduleKanbanMetricsUpdate(columnId);
  }
}

function scheduleKanbanMetricsUpdateForTask(taskId: string): void {
  for (const column of kanbanColumns.value) {
    if (column.type === 'action') continue;
    const columnTasks = getTasksForColumn(column);
    if (columnTasks.some(task => task.id === taskId)) {
      scheduleKanbanMetricsUpdate(column.id);
      return;
    }
  }
  scheduleAllKanbanMetricsUpdates();
}

function pruneVirtualHeightCaches(currentTasks: Task[]): void {
  const visibleIds = new Set(currentTasks.map(task => task.id));
  let kanbanCacheChanged = false;
  for (const [columnId, cache] of kanbanColumnTaskHeightCache.entries()) {
    for (const taskId of cache.keys()) {
      if (!visibleIds.has(taskId)) {
        cache.delete(taskId);
        kanbanCacheChanged = true;
      }
    }
    if (cache.size === 0) {
      kanbanColumnTaskHeightCache.delete(columnId);
    }
  }
  if (kanbanCacheChanged) {
    kanbanColumnHeightVersion.value += 1;
  }

  let listCacheChanged = false;
  for (const taskId of listViewTaskHeightCache.keys()) {
    if (!visibleIds.has(taskId)) {
      listViewTaskHeightCache.delete(taskId);
      listCacheChanged = true;
    }
  }
  if (listCacheChanged) {
    listViewTaskHeightVersion.value += 1;
  }
}

function shouldUseListVirtualScroll(taskCount: number): boolean {
  if (taskCount <= LIST_VIRTUAL_THRESHOLD) return false;
  return true;
}

function getListTaskEstimatedHeight(task: Task): number {
  listViewTaskHeightVersion.value;
  return listViewTaskHeightCache.get(task.id)
    ?? estimateExpandedKanbanTaskHeight(listViewEstimatedCardHeight.value || LIST_VIRTUAL_CARD_HEIGHT, task);
}

function getListSectionHeightOffsets(section: KanbanListSection): number[] {
  const offsets = new Array(section.tasks.length + 1);
  offsets[0] = 0;
  for (let index = 0; index < section.tasks.length; index += 1) {
    offsets[index + 1] = offsets[index] + getListTaskEstimatedHeight(section.tasks[index]);
  }
  return offsets;
}

function getListSectionEstimatedBodyHeight(section: KanbanListSection): number {
  const offsets = getListSectionHeightOffsets(section);
  return offsets[offsets.length - 1] || 0;
}

function getPreviousListSectionsInMasonryColumn(sectionId: string): KanbanListSection[] {
  for (const column of kanbanListMasonryColumns.value) {
    const sectionIndex = column.sections.findIndex(section => section.id === sectionId);
    if (sectionIndex >= 0) {
      return column.sections.slice(0, sectionIndex);
    }
  }
  return [];
}

function getListSectionVirtualRange(section: KanbanListSection) {
  const taskCount = section.tasks.length;
  if (!shouldUseListVirtualScroll(taskCount)) {
    return { start: 0, end: taskCount, top: 0, bottom: 0 };
  }
  const { scrollTop, height } = listViewMetrics.value;
  const offsets = getListSectionHeightOffsets(section);
  const totalHeight = offsets[offsets.length - 1] || 0;
  const averageCardHeight = listViewEstimatedCardHeight.value || LIST_VIRTUAL_CARD_HEIGHT;
  const sectionHeaderHeight = 42;
  const sectionGap = 10;
  let estimatedTop = 0;
  for (const prevSection of getPreviousListSectionsInMasonryColumn(section.id)) {
    if (isKanbanListSectionCollapsed(prevSection.id)) {
      estimatedTop += sectionHeaderHeight + sectionGap;
    } else {
      estimatedTop += sectionHeaderHeight + getListSectionEstimatedBodyHeight(prevSection) + sectionGap;
    }
  }
  const sectionBodyTop = estimatedTop + sectionHeaderHeight;
  const sectionBodyBottom = sectionBodyTop + totalHeight;
  const viewTop = scrollTop;
  const viewBottom = scrollTop + height;
  const overscanPx = averageCardHeight * LIST_VIRTUAL_OVERSCAN;
  if (sectionBodyBottom < viewTop - overscanPx || sectionBodyTop > viewBottom + overscanPx) {
    return {
      start: 0,
      end: 0,
      top: 0,
      bottom: totalHeight
    };
  }
  const localScrollTop = Math.max(0, viewTop - sectionBodyTop);
  const startIndex = Math.max(
    0,
    findKanbanTaskIndexForOffset(offsets, localScrollTop) - LIST_VIRTUAL_OVERSCAN
  );
  const endIndex = Math.min(
    taskCount,
    findKanbanTaskIndexForOffset(offsets, localScrollTop + height) + LIST_VIRTUAL_OVERSCAN + 1
  );
  const topPadding = offsets[startIndex] || 0;
  const bottomPadding = Math.max(0, totalHeight - (offsets[endIndex] || 0));
  return { start: startIndex, end: endIndex, top: topPadding, bottom: bottomPadding };
}

function getVisibleTasksForListSection(section: KanbanListSection): Task[] {
  const range = getListSectionVirtualRange(section);
  return section.tasks.slice(range.start, range.end);
}

function getListSectionSpacerStyle(section: KanbanListSection): Record<string, string> {
  if (!shouldUseListVirtualScroll(section.tasks.length)) return {};
  const range = getListSectionVirtualRange(section);
  if (range.top === 0 && range.bottom === 0) return {};
  const style: Record<string, string> = {};
  if (range.top > 0) style.paddingTop = `${range.top}px`;
  if (range.bottom > 0) style.paddingBottom = `${range.bottom}px`;
  return style;
}

function updateListViewMetricsAndMeasurements(el: HTMLElement): void {
  const next = { scrollTop: el.scrollTop, height: el.clientHeight };
  if (listViewMetrics.value.scrollTop !== next.scrollTop || listViewMetrics.value.height !== next.height) {
    listViewMetrics.value = next;
  }

  const items = Array.from(el.querySelectorAll<HTMLElement>('.kanban-list-task-item[data-task-id]'));
  let changed = false;
  const collapsedHeights: number[] = [];
  for (const item of items) {
    const taskId = item.dataset.taskId;
    if (!taskId) continue;
    const height = Math.max(1, Math.round(item.getBoundingClientRect().height));
    const previousHeight = listViewTaskHeightCache.get(taskId);
    if (previousHeight !== height) {
      listViewTaskHeightCache.set(taskId, height);
      changed = true;
    }
    if (!expandedKanbanTaskIds.value.has(taskId)) {
      collapsedHeights.push(height);
    }
  }

  if (changed) {
    listViewTaskHeightVersion.value += 1;
  }

  if (collapsedHeights.length === 0) {
    return;
  }
  const averageHeight = Math.round(
    collapsedHeights.reduce((total, height) => total + height, 0) / collapsedHeights.length
  );
  if (averageHeight && Math.abs(listViewEstimatedCardHeight.value - averageHeight) > 4) {
    listViewEstimatedCardHeight.value = averageHeight;
  }
}

function scheduleListViewMetricsUpdate(): void {
  if (!isKanbanViewMounted || currentView.value !== 'list') {
    return;
  }
  if (listViewMetricsRaf !== null) {
    return;
  }
  listViewMetricsRaf = requestAnimationFrame(() => {
    listViewMetricsRaf = null;
    if (!isKanbanViewMounted || currentView.value !== 'list') {
      return;
    }
    const el = listViewRef.value;
    if (!el || !el.isConnected) return;
    updateListViewMetricsAndMeasurements(el);
  });
}

function handleListViewScroll(): void {
  scheduleListViewMetricsUpdate();
}

async function loadTasks(
  forceRefresh: boolean = false,
  options: {
    silent?: boolean;
    validateSelection?: boolean;
    mode?: TaskLoadMode;
    repeatWindow?: TaskRepeatWindow | null;
    view?: TaskViewMode;
  } = {}
) {
  const requestView = options.view || currentView.value;
  const {
    silent = false,
    validateSelection = true,
    mode = resolveTaskLoadModeForView(requestView),
    repeatWindow = mode === 'light-with-repeats' ? resolveRequestedRepeatWindowForView(requestView) : null
  } = options;
  const fetchRepeatWindow = mode === 'light-with-repeats'
    ? expandRepeatWindowForCalendarLoad(requestView, repeatWindow)
    : repeatWindow;
  const requestId = ++latestTaskLoadRequestId;
  if (!silent) {
    pendingVisibleTaskLoadCount += 1;
    loading.value = true;
  }
  try {
    if (forceRefresh) {
      await TaskRepository.clearCache();
    }
    if (!silent && !forceRefresh && tasks.value.length === 0 && shouldPrefillWithLightTasks(mode)) {
      try {
        // Keep the fast first paint consistent with the full load: repeat
        // instances must already include their persisted completion records.
        const { tasks: lightTasks } = await TaskRepository.getKernelMaterializedTasks(
          5000,
          { includeArchived: true },
          { includeRepeatTemplateDate: true }
        );
        if (lightTasks.length > 0 && requestId === latestTaskLoadRequestId) {
          syncTaskSnapshot(lightTasks);
          invalidateTableFilters();
        }
      } catch (error) {
        if (!isKernelRpcUnavailable(error)) {
          console.debug('[KanbanView] kernel light prefill skipped', error);
        }
      }
    }
    const fetchOptions = buildTaskFetchOptionsForLoadMode(mode, fetchRepeatWindow);
    let sqlTasks: Task[];
    if (mode === 'light-with-repeats' && fetchRepeatWindow?.startDate && fetchRepeatWindow?.endDate) {
      try {
        const { tasks: rangedTasks } = await TaskRepository.getKernelLightTasksByDateRange(
          fetchRepeatWindow.startDate,
          fetchRepeatWindow.endDate,
          { includeArchived: true },
          {
            materializeRepeats: true,
            force: forceRefresh
          }
        );
        const baseTasks = await TaskRepository.getAllTasks(
          !forceRefresh,
          { includeArchived: true },
          {
            ...fetchOptions,
            materializeRepeats: false,
            repeatWindow: undefined,
            constrainBaseTasksToRepeatWindow: false
          }
        );
        sqlTasks = mergeTasksById(rangedTasks, baseTasks);
      } catch (error) {
        if (!isKernelRpcUnavailable(error)) {
          console.debug('[KanbanView] kernel date-range task fetch skipped', error);
        }
        sqlTasks = await TaskRepository.getAllTasks(
          !forceRefresh,
          { includeArchived: true },
          fetchOptions
        );
      }
    } else {
      sqlTasks = await TaskRepository.getAllTasks(
        !forceRefresh,
        { includeArchived: true },
        fetchOptions
      );
    }
    if (requestId !== latestTaskLoadRequestId) {
      return;
    }
    if (options.view && currentView.value !== options.view) {
      return;
    }
    const nextTasks = mode === 'light-with-repeats'
      ? filterTasksForCalendarWindow(sqlTasks, fetchRepeatWindow)
      : sqlTasks;
    hydrateKanbanMemoTitlesSync(nextTasks, KANBAN_TITLE_HYDRATE_LIMIT);
    syncTaskSnapshot(nextTasks);
    loadedTaskLoadMode.value = mode;
    loadedRepeatWindow.value = fetchRepeatWindow;
    if (validateSelection) {
      void validateDocumentSelection();
    }
    scheduleKanbanTitleHydration(120);
  } catch (error) {
    console.error('[KanbanView] Failed to load tasks:', error);
  } finally {
    if (!silent) {
      pendingVisibleTaskLoadCount = Math.max(0, pendingVisibleTaskLoadCount - 1);
      if (pendingVisibleTaskLoadCount === 0) {
        loading.value = false;
      }
    }
  }
}

async function refreshTasks() {
  await loadTasks(true);
}

async function ensureTasksLoadedForView(
  view: TaskViewMode,
  options: { silent?: boolean; validateSelection?: boolean } = {}
): Promise<void> {
  if (currentView.value !== view) {
    return;
  }
  const mode = resolveTaskLoadModeForView(view);
  const repeatWindow = mode === 'light-with-repeats' ? resolveRequestedRepeatWindowForView(view) : null;
  if (
    isTaskLoadModeSatisfied(loadedTaskLoadMode.value, mode)
    && isTaskLoadWindowSatisfied(loadedRepeatWindow.value, repeatWindow)
  ) {
    return;
  }
  await loadTasks(false, {
    ...options,
    mode,
    repeatWindow,
    view
  });
}

function scheduleDocumentScopeRefreshForUnknownTaskDocuments(delay = 640): void {
  if (documentGroups.value.length === 0 && goalDefinitions.value.length === 0) {
    return;
  }
  const knownKeys = new Set(
    allDocumentGroupDocuments.value.map(document => `${document.notebookId}:${document.id}`)
  );
  const hasUnknownTaskDocument = tasks.value.some(task => {
    const notebookId = typeof task.notebookId === 'string' ? task.notebookId.trim() : '';
    const rootId = typeof task.rootId === 'string' ? task.rootId.trim() : '';
    return task.type === 'block' && !!notebookId && !!rootId && !knownKeys.has(`${notebookId}:${rootId}`);
  });
  if (hasUnknownTaskDocument) {
    scheduleTaskDocumentOptionsRefresh(delay);
    tasks.value.forEach(task => {
      const notebookId = typeof task.notebookId === 'string' ? task.notebookId.trim() : '';
      const rootId = typeof task.rootId === 'string' ? task.rootId.trim() : '';
      if (task.type === 'block' && notebookId && rootId && !knownKeys.has(`${notebookId}:${rootId}`)) {
        void loadDocumentScopeAncestors(notebookId, rootId);
      }
    });
  }
}

function syncTaskSnapshot(nextTasks: Task[]): void {
  const now = Date.now();
  const indexedBlockIds = new Set(
    nextTasks
      .map(task => task.blockId)
      .filter((blockId): blockId is string => typeof blockId === 'string' && blockId.length > 0)
  );
  const reconciledTasks = [...nextTasks];
  pendingOptimisticQuickCreatedTasks.forEach((pending, blockId) => {
    if (indexedBlockIds.has(blockId)) {
      pendingOptimisticQuickCreatedTasks.delete(blockId);
      return;
    }
    if (pending.expiresAt <= now) {
      pendingOptimisticQuickCreatedTasks.delete(blockId);
      return;
    }
    reconciledTasks.push(pending.task);
  });
  syncFromSQL(filterTasksByNotebookScope(applyLocalTaskFieldOverridesToList(reconciledTasks)));
  tasks.value = filterTasksByNotebookScope(applyDraggedStatusLocks(crdtRepo.getTasks()));

  // Keep the document-tree index current for document groups and goals.  A
  // new child document may arrive with a task before it has appeared in the
  // cached tree; schedule one debounced refresh instead of requiring the user
  // to reopen and save the group settings.
  scheduleDocumentScopeRefreshForUnknownTaskDocuments();
}

function scheduleRefreshTasks(
  delay = 180,
  mode: 'full' | 'light' | 'silent-full' = 'full'
) {
  if (fallbackRefreshTimer !== null) {
    clearTimeout(fallbackRefreshTimer);
  }
  fallbackRefreshTimer = window.setTimeout(async () => {
    fallbackRefreshTimer = null;
    if (!isKanbanViewMounted) {
      return;
    }
    if (mode === 'light') {
      await loadTasks(false, { silent: true });
      return;
    }
    if (mode === 'silent-full') {
      await loadTasks(true, { silent: true });
      return;
    }
    await refreshTasks();
  }, delay);
}

function scheduleKernelTaskIndexRefresh(delay = 220, reloadCalendarTasks = true, force = false): void {
  if (kernelTaskIndexRefreshTimer !== null) {
    clearTimeout(kernelTaskIndexRefreshTimer);
  }
  kernelTaskIndexRefreshTimer = window.setTimeout(async () => {
    kernelTaskIndexRefreshTimer = null;
    try {
      await refreshKernelTaskIndex({ limit: 5000, includeArchived: true, force });
      if (reloadCalendarTasks && isCalendarView.value) {
        const mode = resolveTaskLoadModeForView(currentView.value);
        await loadTasks(false, {
          silent: true,
          validateSelection: false,
          mode,
          repeatWindow: mode === 'light-with-repeats'
            ? resolveRequestedRepeatWindowForView(currentView.value)
            : null
        });
      }
    } catch (error) {
      if (!isKernelRpcUnavailable(error)) {
        console.debug('[KanbanView] kernel task index refresh after date change skipped', error);
      }
    }
  }, delay);
}

function applyRepeatRuleOptimistic(payload: RepeatRulePayload): boolean {
  const { nextTasks, touched } = applyRepeatRuleOptimisticToTasks(tasks.value, payload);
  if (nextTasks !== tasks.value) {
    tasks.value = nextTasks;
  }
  if (touched) {
    invalidateTableFilters();
  }
  return touched;
}

function applyRepeatTemplateBroadcastUpdates(payload: {
  seriesId?: string;
  templateUpdates?: Record<string, unknown>;
}): void {
  const seriesId = typeof payload.seriesId === 'string' ? payload.seriesId.trim() : '';
  const updates = payload.templateUpdates;
  if (!seriesId || !updates || Object.keys(updates).length === 0) {
    return;
  }

  const now = Date.now();
  tasks.value.forEach((task) => {
    if (task.repeatSeriesId !== seriesId) {
      return;
    }
    for (const [field, value] of Object.entries(updates) as Array<[keyof Task, Task[keyof Task]]>) {
      crdtRepo.updateTaskField(task.id, field as any, value, now);
      rememberLocalTaskFieldOverride(task.id, field, value);
    }
  });
  tasks.value = applyLocalTaskFieldOverridesToList(applyDraggedStatusLocks(crdtRepo.getTasks()));
}

async function applyRepeatRuleIncremental(payload: RepeatRulePayload, requestId: number): Promise<boolean> {
  applyRepeatRuleOptimistic(payload);
  try {
    const repeatMaterializeOptions = resolveCurrentRepeatMaterializeOptions();
    if (!repeatMaterializeOptions) {
      return true;
    }
    const { nextTasks, touched, handled } = await rebuildAffectedRepeatTasks(
      tasks.value,
      payload,
      repeatMaterializeOptions
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
    tasks.value = applyDraggedStatusLocks(crdtRepo.getTasks());
    invalidateTableFilters();
    return true;
  } catch {
    return false;
  }
}

function buildRepeatReconcilePayloadsFromTasks(taskList: Task[]): RepeatRulePayload[] {
  const payloadBySeries = new Map<string, RepeatRulePayload>();
  for (const task of taskList) {
    if (task.type !== 'block' || task.isVirtual) {
      continue;
    }
    const seriesId = typeof task.repeatSeriesId === 'string' ? task.repeatSeriesId.trim() : '';
    const frequency = typeof task.repeatFrequency === 'string' ? task.repeatFrequency : '';
    if (
      !seriesId
      || (
        frequency !== 'daily'
        && frequency !== 'weekdays'
        && frequency !== 'weekend'
        && frequency !== 'weekly'
        && frequency !== 'monthly'
      )
    ) {
      continue;
    }
    if (!payloadBySeries.has(seriesId)) {
      payloadBySeries.set(seriesId, {
        blockId: typeof task.blockId === 'string' ? task.blockId : undefined,
        seriesId,
        frequency
      });
    }
  }
  return Array.from(payloadBySeries.values());
}

function unlockDraggedTaskStatus(blockId: string): void {
  dragStatusLocks.delete(blockId);
}

function lockDraggedTaskStatus(blockId: string, status: Task['status']): void {
  dragStatusLocks.set(blockId, status);
}

function getLockedDraggedTaskStatus(blockId: string): Task['status'] | null {
  return dragStatusLocks.get(blockId) || null;
}

function rememberLocalTaskFieldOverride<K extends keyof Task>(
  taskId: string,
  field: K,
  value: Task[K],
  ttlMs = 5000
): void {
  if (!taskId) {
    return;
  }
  const existing = localTaskFieldOverrides.get(taskId);
  localTaskFieldOverrides.set(taskId, {
    values: {
      ...(existing?.values || {}),
      [field]: value
    } as Partial<Task>,
    expiresAt: Date.now() + ttlMs
  });
}

function rememberLocalRepeatSeriesClear(seriesId: string, ttlMs = 8000): void {
  const normalizedSeriesId = typeof seriesId === 'string' ? seriesId.trim() : '';
  if (!normalizedSeriesId) {
    return;
  }
  localClearedRepeatSeriesIds.set(normalizedSeriesId, Date.now() + ttlMs);
}

function isLocalRepeatSeriesCleared(seriesId: unknown): boolean {
  const normalizedSeriesId = typeof seriesId === 'string' ? seriesId.trim() : '';
  if (!normalizedSeriesId) {
    return false;
  }
  const expiresAt = localClearedRepeatSeriesIds.get(normalizedSeriesId);
  if (!expiresAt) {
    return false;
  }
  if (expiresAt <= Date.now()) {
    localClearedRepeatSeriesIds.delete(normalizedSeriesId);
    return false;
  }
  return true;
}

function applyLocalTaskFieldOverrides(task: Task): Task {
  const override = localTaskFieldOverrides.get(task.id);
  if (!override) {
    return task;
  }
  if (override.expiresAt <= Date.now()) {
    localTaskFieldOverrides.delete(task.id);
    return task;
  }
  return {
    ...task,
    ...override.values
  };
}

function applyLocalTaskFieldOverridesToList(taskList: Task[]): Task[] {
  const filteredTasks = localClearedRepeatSeriesIds.size === 0
    ? taskList
    : taskList.filter(task => !(task.isVirtual === true && isLocalRepeatSeriesCleared(task.repeatSeriesId)));
  if (localTaskFieldOverrides.size === 0) {
    return filteredTasks;
  }
  return filteredTasks.map(task => applyLocalTaskFieldOverrides(task));
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

function suppressDragTaskSync(blockId: string, ttlMs = 1400): void {
  dragSyncSuppressUntil.set(blockId, Date.now() + ttlMs);
}

function isDragTaskSyncSuppressed(blockId: string): boolean {
  const expiresAt = dragSyncSuppressUntil.get(blockId);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    dragSyncSuppressUntil.delete(blockId);
    return false;
  }
  return true;
}

function filterSuppressedBlockIds(blockIds: string[]): string[] {
  if (!blockIds.length) return [];
  return blockIds.filter(id => typeof id === 'string' && id.length > 0 && !isDragTaskSyncSuppressed(id));
}

function getTaskRepeatSeriesId(task: Task | null | undefined): string {
  return typeof task?.repeatSeriesId === 'string' ? task.repeatSeriesId.trim() : '';
}

function syncRepeatTaskDescriptionLocally(task: Task, description: string): boolean {
  const seriesId = getTaskRepeatSeriesId(task);
  if (!seriesId) {
    return false;
  }

  const nowIso = new Date().toISOString();
  let touched = false;
  tasks.value = tasks.value.map((item) => {
    if (item.repeatSeriesId !== seriesId) {
      return item;
    }
    if (item.id !== task.id && !item.isVirtual) {
      return item;
    }
    touched = true;
    return {
      ...item,
      description,
      updatedAt: nowIso
    };
  });

  if (touched) {
    invalidateTableFilters();
    if (kanbanEditorDraft.value?.taskId === task.id) {
      kanbanEditorDraft.value.description = description;
    }
  }

  return touched;
}

function applyDraggedStatusLocks(taskList: Task[]): Task[] {
  if (dragStatusLocks.size === 0 || taskList.length === 0) {
    return taskList;
  }

  for (const task of taskList) {
    if (task.type !== 'block' || !task.blockId) {
      continue;
    }
    const lockedStatus = getLockedDraggedTaskStatus(task.blockId);
    if (!lockedStatus) {
      continue;
    }
    if (task.status === lockedStatus) {
      unlockDraggedTaskStatus(task.blockId);
      continue;
    }
    task.status = lockedStatus;
  }

  return taskList;
}

function normalizeInvalidNotebookFilters(): boolean {
  if (enabledNotebooks.value.length === 0) {
    return false;
  }
  const enabledNotebookIds = new Set(enabledNotebooks.value.map(notebook => notebook.id));
  let changed = false;

  changed = resetSourceFilterIfNeeded(kanbanFilterType, kanbanFilterDocument, source =>
    (source.kind === 'notebook' && !enabledNotebookIds.has(source.id))
    || (source.kind === 'group' && !documentGroupsById.value.has(source.id))
    || (source.kind === 'goal' && !goalsLoading.value && !goalDefinitionsById.value.has(source.id))
  ) || changed;
  changed = resetSourceFilterIfNeeded(listFilterType, listFilterDocument, source =>
    (source.kind === 'notebook' && !enabledNotebookIds.has(source.id))
    || (source.kind === 'group' && !documentGroupsById.value.has(source.id))
    || (source.kind === 'goal' && !goalsLoading.value && !goalDefinitionsById.value.has(source.id))
  ) || changed;
  changed = resetSourceFilterIfNeeded(tableFilterType, tableFilterDocument, source =>
    (source.kind === 'notebook' && !enabledNotebookIds.has(source.id))
    || (source.kind === 'group' && !documentGroupsById.value.has(source.id))
    || (source.kind === 'goal' && !goalsLoading.value && !goalDefinitionsById.value.has(source.id))
  ) || changed;
  changed = resetSourceFilterIfNeeded(monthFilterType, monthFilterDocument, source =>
    (source.kind === 'notebook' && !enabledNotebookIds.has(source.id))
    || (source.kind === 'group' && !documentGroupsById.value.has(source.id))
    || (source.kind === 'goal' && !goalsLoading.value && !goalDefinitionsById.value.has(source.id))
  ) || changed;
  changed = resetSourceFilterIfNeeded(weekFilterType, weekFilterDocument, source =>
    (source.kind === 'notebook' && !enabledNotebookIds.has(source.id))
    || (source.kind === 'group' && !documentGroupsById.value.has(source.id))
    || (source.kind === 'goal' && !goalsLoading.value && !goalDefinitionsById.value.has(source.id))
  ) || changed;
  changed = resetSourceFilterIfNeeded(dayFilterType, dayFilterDocument, source =>
    (source.kind === 'notebook' && !enabledNotebookIds.has(source.id))
    || (source.kind === 'group' && !documentGroupsById.value.has(source.id))
    || (source.kind === 'goal' && !goalsLoading.value && !goalDefinitionsById.value.has(source.id))
  ) || changed;

  return changed;
}

function shouldDeferGoalSourceValidation(sourceValue: string): boolean {
  const source = parseDocumentSource(sourceValue);
  return source.kind === 'goal' && goalsLoading.value && !goalDefinitionsById.value.has(source.id);
}

async function loadUserSettings() {
  isHydratingSettings.value = true;
  try {
    const settings = userSettings.kanban;
    calendarSidebarCollapsed.value = settings.calendarSidebarCollapsed === true;
    const storedLastCalendarView = normalizeTaskViewMode(settings.lastCalendarView);
    const storedCurrentView = normalizeTaskViewMode(settings.currentView);
    if (isCalendarTaskViewMode(storedLastCalendarView)) {
      lastCalendarView.value = storedLastCalendarView;
    } else if (isCalendarTaskViewMode(storedCurrentView)) {
      lastCalendarView.value = storedCurrentView;
    }
    kanbanFilterType.value = settings.kanbanFilterSource
      || (settings.kanbanFilterType && settings.kanbanFilterType !== 'all'
        ? buildNotebookDocumentSource(settings.kanbanFilterType)
        : 'all');
    kanbanFilterDocument.value = settings.kanbanFilterDocument || 'all';
    kanbanGroupBy.value = resolveStoredTaskViewGroupMode(settings.kanbanGroupBy, settings.kanbanGroupMode, 'status');
    listFilterType.value = settings.listFilterSource
      || (settings.listFilterType && settings.listFilterType !== 'all'
        ? buildNotebookDocumentSource(settings.listFilterType)
        : 'all');
    listFilterDocument.value = settings.listFilterDocument || 'all';
    listGroupBy.value = resolveStoredTaskViewGroupMode(settings.listGroupBy, settings.listGroupMode, 'status');
    kanbanGroupColumnOrder.value = normalizeTaskGroupOrderIds(settings.kanbanGroupColumnOrder);
    tableGroupBy.value = resolveStoredTaskViewGroupMode(settings.tableGroupBy, settings.tableGroupMode, 'status');
    showKanbanTaskCardDetails.value = settings.showKanbanTaskCardDetails !== false;
    const urgencyIndex = QUADRANT_URGENCY_DAY_OPTIONS.indexOf(settings.quadrantUrgentDays || 7);
    quadrantUrgencyDayIndex.value = urgencyIndex >= 0 ? urgencyIndex : QUADRANT_URGENCY_DAY_OPTIONS.indexOf(7);
    tableFilterType.value = settings.tableFilterSource
      || (settings.tableFilterType && settings.tableFilterType !== 'all'
        ? buildNotebookDocumentSource(settings.tableFilterType)
        : 'all');
    tableFilterDocument.value = settings.tableFilterDocument || 'all';
    ganttFilterType.value = settings.ganttFilterSource
      || (settings.ganttFilterType && settings.ganttFilterType !== 'all'
        ? buildNotebookDocumentSource(settings.ganttFilterType)
        : 'all');
    ganttFilterDocument.value = settings.ganttFilterDocument || 'all';
    ganttMilestonesEnabled.value = settings.ganttMilestonesEnabled === true;
    ganttDocumentOrderBySource.value = settings.ganttDocumentOrderBySource || {};
    documentTabScopesBySource.value = settings.documentTabScopesBySource || {};
    const persistedCalendarView = isCalendarTaskViewMode(storedCurrentView)
      ? storedCurrentView
      : lastCalendarView.value;
    const calendarFilterSettings = persistedCalendarView === 'month'
      ? { source: settings.monthFilterSource, type: settings.monthFilterType, document: settings.monthFilterDocument }
      : persistedCalendarView === 'week'
        ? { source: settings.weekFilterSource, type: settings.weekFilterType, document: settings.weekFilterDocument }
        : { source: settings.dayFilterSource, type: settings.dayFilterType, document: settings.dayFilterDocument };
    calendarFilterType.value = calendarFilterSettings.source
      || (calendarFilterSettings.type && calendarFilterSettings.type !== 'all'
        ? buildNotebookDocumentSource(calendarFilterSettings.type)
        : 'all');
    calendarFilterDocument.value = calendarFilterSettings.document || 'all';
    restoreTaskFilterPopoverSettings();
    hiddenDocumentTabIds.value = new Set(normalizeNotebookIds(settings.hiddenDocumentTabIds));

    let shouldPersistSettings = resetFiltersForExcludedNotebooks();
    if (normalizeInvalidNotebookFilters()) {
      shouldPersistSettings = true;
    }

    const shouldPrimeHeadingGroups =
      tasks.value.length > 0
      && (
        (currentView.value === 'kanban' && kanbanGroupBy.value === 'heading')
        || (currentView.value === 'list' && listGroupBy.value === 'heading')
        || (
          (currentView.value === 'table' || currentView.value === 'archive-table')
          && tableGroupBy.value === 'heading'
        )
      );
    if (shouldPrimeHeadingGroups) {
      // Prime heading metadata only when initial active view needs it.
      await refreshTaskHeadingGroups();
    }

    isSettingsLoaded.value = true;

    if (shouldPersistSettings) {
      void saveUserSettings();
    }
  } catch (error) {
    console.error('[KanbanView] Failed to load user settings:', error);
  }
  isHydratingSettings.value = false;
}

async function saveUserSettings() {
  try {
    const kanbanSource = parseDocumentSource(kanbanFilterType.value);
    const listSource = parseDocumentSource(listFilterType.value);
    const tableSource = parseDocumentSource(tableFilterType.value);
    const ganttSource = parseDocumentSource(ganttFilterType.value);
    const monthSource = parseDocumentSource(monthFilterType.value);
    const weekSource = parseDocumentSource(weekFilterType.value);
    const daySource = parseDocumentSource(dayFilterType.value);
    await updateSettings('kanban', {
      currentView: currentView.value,
      lastCalendarView: lastCalendarView.value,
      calendarSidebarCollapsed: calendarSidebarCollapsed.value,
      kanbanGroupMode: kanbanGroupBy.value === 'group',
      listGroupMode: listGroupBy.value === 'group',
      tableGroupMode: tableGroupBy.value === 'group',
      kanbanGroupBy: kanbanGroupBy.value,
      listGroupBy: listGroupBy.value,
      tableGroupBy: tableGroupBy.value,
      showKanbanTaskCardDetails: showKanbanTaskCardDetails.value,
      quadrantUrgentDays: quadrantUrgentDays.value,
      kanbanFilterType: kanbanSource.kind === 'notebook' ? kanbanSource.id : 'all',
      kanbanFilterSource: kanbanFilterType.value,
      kanbanFilterDocument: kanbanFilterDocument.value,
      listFilterType: listSource.kind === 'notebook' ? listSource.id : 'all',
      listFilterSource: listFilterType.value,
      listFilterDocument: listFilterDocument.value,
      kanbanGroupColumnOrder: hasLoadedTaskGroups.value
        ? [...resolvedKanbanGroupColumnOrder.value]
        : [...normalizeTaskGroupOrderIds(kanbanGroupColumnOrder.value)],
      tableFilterType: tableSource.kind === 'notebook' ? tableSource.id : 'all',
      tableFilterSource: tableFilterType.value,
      tableFilterDocument: tableFilterDocument.value,
      ganttFilterType: ganttSource.kind === 'notebook' ? ganttSource.id : 'all',
      ganttFilterSource: ganttFilterType.value,
      ganttFilterDocument: ganttFilterDocument.value,
      ganttMilestonesEnabled: ganttMilestonesEnabled.value,
      ganttDocumentOrderBySource: ganttDocumentOrderBySource.value,
      documentTabScopesBySource: documentTabScopesBySource.value,
      monthFilterType: monthSource.kind === 'notebook' ? monthSource.id : 'all',
      monthFilterSource: monthFilterType.value,
      monthFilterDocument: monthFilterDocument.value,
      weekFilterType: weekSource.kind === 'notebook' ? weekSource.id : 'all',
      weekFilterSource: weekFilterType.value,
      weekFilterDocument: weekFilterDocument.value,
      dayFilterType: daySource.kind === 'notebook' ? daySource.id : 'all',
      dayFilterSource: dayFilterType.value,
      dayFilterDocument: dayFilterDocument.value,
      kanbanStatusFilters: [...activeKanbanStatusFilters.value],
      kanbanPriorityFilters: [...activeKanbanPriorityFilters.value],
      kanbanDueFilters: [...activeKanbanDueFilters.value],
      kanbanUpdatedFilters: [...activeKanbanUpdatedFilters.value],
      kanbanGroupFilters: [...activeKanbanGroupFilters.value],
      kanbanExtraFilters: [...activeKanbanExtraFilters.value],
      tableStatusFilters: [...activeTableStatusFilters.value],
      tablePriorityFilters: [...activeTablePriorityFilters.value],
      tableDueFilters: [...activeTableDueFilters.value],
      tableUpdatedFilters: [...activeTableUpdatedFilters.value],
      tableGroupFilters: [...activeTableGroupFilters.value],
      tableExtraFilters: [...activeTableExtraFilters.value],
      hiddenDocumentTabIds: normalizeNotebookIds(Array.from(hiddenDocumentTabIds.value), { sort: true })
    });
  } catch (error) {
    console.error('[KanbanView] Failed to save user settings:', error);
  }
}

async function validateDocumentSelection() {
  let hasChanges = false;

  if (kanbanFilterDocument.value !== 'all' && !shouldDeferGoalSourceValidation(kanbanFilterType.value)) {
    const availableDocIds = getDocumentIdsBySource(kanbanFilterType.value, {
      excludeCompletedOnlyDocs: shouldHideCompletedOnlyDocumentTabs('kanban'),
      taskMatcher: getDocumentTabTaskMatcher('kanban')
    });
    if (!availableDocIds.includes(kanbanFilterDocument.value)) {
      kanbanFilterDocument.value = 'all';
      hasChanges = true;
    }
  }

  if (listFilterDocument.value !== 'all' && !shouldDeferGoalSourceValidation(listFilterType.value)) {
    const availableDocIds = getDocumentIdsBySource(listFilterType.value, {
      excludeCompletedOnlyDocs: shouldHideCompletedOnlyDocumentTabs('list'),
      taskMatcher: getDocumentTabTaskMatcher('list')
    });
    if (!availableDocIds.includes(listFilterDocument.value)) {
      listFilterDocument.value = 'all';
      hasChanges = true;
    }
  }

  if (tableFilterDocument.value !== 'all' && !shouldDeferGoalSourceValidation(tableFilterType.value)) {
    const availableDocIds = getDocumentIdsBySource(tableFilterType.value, {
      excludeCompletedOnlyDocs: shouldHideCompletedOnlyDocumentTabs('table'),
      taskMatcher: getDocumentTabTaskMatcher('table')
    });
    if (!availableDocIds.includes(tableFilterDocument.value)) {
      tableFilterDocument.value = 'all';
      hasChanges = true;
    }
  }

  if (monthFilterDocument.value !== 'all' && !shouldDeferGoalSourceValidation(monthFilterType.value)) {
    const availableDocIds = getDocumentIdsBySource(monthFilterType.value, {
      taskMatcher: getDocumentTabTaskMatcher('month')
    });
    if (!availableDocIds.includes(monthFilterDocument.value)) {
      monthFilterDocument.value = 'all';
      hasChanges = true;
    }
  }

  if (weekFilterDocument.value !== 'all' && !shouldDeferGoalSourceValidation(weekFilterType.value)) {
    const availableDocIds = getDocumentIdsBySource(weekFilterType.value, {
      taskMatcher: getDocumentTabTaskMatcher('week')
    });
    if (!availableDocIds.includes(weekFilterDocument.value)) {
      weekFilterDocument.value = 'all';
      hasChanges = true;
    }
  }

  if (dayFilterDocument.value !== 'all' && !shouldDeferGoalSourceValidation(dayFilterType.value)) {
    const availableDocIds = getDocumentIdsBySource(dayFilterType.value, {
      taskMatcher: getDocumentTabTaskMatcher('day')
    });
    if (!availableDocIds.includes(dayFilterDocument.value)) {
      dayFilterDocument.value = 'all';
      hasChanges = true;
    }
  }

  if (hasChanges) {
    await saveUserSettings();
  }
}

function queueIncrementalUpdates(
  blockIds: string[],
  options: { allowUnknown?: boolean; forceFresh?: boolean } = {},
  delay = 24
): void {
  if (options.allowUnknown) {
    queuedIncrementalAllowUnknown = true;
  }
  if (options.forceFresh) {
    blockIds.forEach((blockId) => {
      if (typeof blockId === 'string' && blockId.length > 0) {
        queuedIncrementalForceFreshBlockIds.add(blockId);
      }
    });
  }
  incrementalUpdateQueue.enqueue(blockIds, delay);
}

const {
  queue: queueExternalTaskStatusAttrSync,
  flush: flushExternalTaskStatusAttrSync
} = createTaskStatusAttributeSync({
  onApplied: () => TaskRepository.clearCache(),
  onError: (blockId, error) => {
    console.warn('[KanbanView] Failed to sync task completion attrs:', { blockId, error });
  }
});

const incrementalUpdateQueue = createBlockIdBatchQueue({
  maxBatchSize: MAX_INCREMENTAL_BLOCKS_PER_FLUSH,
  onFlushBatch: async (blockIds, remainingCount) => {
    const allowUnknown = queuedIncrementalAllowUnknown;
    let forceFresh = false;
    blockIds.forEach((blockId) => {
      if (queuedIncrementalForceFreshBlockIds.delete(blockId)) {
        forceFresh = true;
      }
    });
    await incrementalUpdateTasks(blockIds, { allowUnknown, forceFresh });
    if (remainingCount === 0) {
      queuedIncrementalAllowUnknown = false;
    }
  }
});

function setupEventListeners() {
  const unsubscribeChanged = eventBus.on(Events.TASK_CHANGED, (data?: TaskChangePayload) => {
    if (data?.blockIds && data.blockIds.length > 0) {
      if (data.attributeChanges) {
        syncTaskEditorDraftFromAttributeChanges(
          activeKanbanEditTask.value,
          activeKanbanEditDraft.value,
          data.attributeChanges
        );
        invalidateTableFilters();
        void nextTick(() => {
          scheduleAllKanbanMetricsUpdates();
          scheduleListViewMetricsUpdate();
        });
      }
      const blockIds = data.forceRefresh === true
        ? data.blockIds
        : filterSuppressedBlockIds(data.blockIds);
      if (blockIds.length > 0) {
        // A block that is not in this view yet is normally a task just added
        // in a document. Match the sidebar's eager path so it appears as soon
        // as the editor publishes the change instead of waiting for batching.
        const containsNewTask = blockIds.some(blockId => !hasTaskOrSubtask(blockId));
        if (containsNewTask) {
          void incrementalUpdateTasks(blockIds, {
            allowUnknown: true,
            forceFresh: true
          });
        } else {
          queueIncrementalUpdates(blockIds, { forceFresh: data.forceRefresh === true });
        }
        if (isCalendarTaskViewMode(currentView.value)) {
          void ensureCalendarLifelogTasksLoaded(true);
        }
      }
    }
  });

  const unsubscribeDeleted = eventBus.on(Events.TASK_DELETED, ({ blockId }: { blockId: string }) => {
    const taskIndex = tasks.value.findIndex(t => t.blockId === blockId);
    if (taskIndex !== -1) {
      tasks.value = tasks.value.filter(t => t.blockId !== blockId);
      removeCalendarLifelogTaskByBlockId(blockId);
      invalidateTableFilters();
    }
  });

  const unsubscribeUpdated = eventBus.on(Events.TASK_UPDATED, ({ blockId }: { blockId: string }) => {
    if (isDragTaskSyncSuppressed(blockId)) {
      return;
    }
    if (!hasTaskOrSubtask(blockId)) {
      void incrementalUpdateTasks([blockId], { allowUnknown: true, forceFresh: true });
    } else {
      queueIncrementalUpdates([blockId]);
    }
    if (isCalendarTaskViewMode(currentView.value)) {
      void ensureCalendarLifelogTasksLoaded(true);
    }
  });

  const unsubscribeAdded = eventBus.on(Events.TASK_ADDED, async (payload?: { blockId?: string; reason?: string; seriesId?: string; frequency?: string; templateUpdates?: Record<string, unknown>; task?: Task }) => {
    if (payload?.reason === 'repeat-changed' && payload.frequency) {
      applyRepeatTemplateBroadcastUpdates(payload);
      const requestId = ++repeatReconcileRequestId;
      const fastPathApplied = await applyRepeatRuleIncremental(payload, requestId);
      if (requestId !== repeatReconcileRequestId) {
        return;
      }
      if (!fastPathApplied) {
        scheduleRefreshTasks(100, 'silent-full');
        return;
      }
      scheduleRefreshTasks(140, 'silent-full');
      return;
    }
    if (payload?.task?.type === 'block' && payload.task.blockId) {
      upsertOptimisticQuickCreatedTask(payload.task);
      return;
    }
    if (payload?.blockId) {
      const addedBlockId = payload.blockId;
      const scopedBlockIds = await TaskRepository.filterIncludedBlockIds([payload.blockId]);
      if (scopedBlockIds.length === 0) {
        return;
      }

      await incrementalUpdateTasks(scopedBlockIds, { allowUnknown: true, forceFresh: true });
      window.setTimeout(() => {
        void (async () => {
          if (hasTaskOrSubtask(addedBlockId)) {
            return;
          }
          if (await isSubtaskBlockId(addedBlockId)) {
            return;
          }
          scheduleRefreshTasks(80, 'silent-full');
        })();
      }, 90);
      return;
    }
    scheduleRefreshTasks(180, 'full');
  });

  const unsubscribeDateChanged = eventBus.on(Events.TASK_DATE_CHANGED, (updatedTask: Task) => {
    applyExternalTaskDateChange(updatedTask);
  });

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
        if (normalizeInvalidNotebookFilters()) {
          void saveUserSettings();
        }
        void validateDocumentSelection();
        return;
      }
      void (async () => {
        const nextGroups = await loadDocumentGroups();
        applyExternalDocumentGroups(nextGroups);
        if (normalizeInvalidNotebookFilters()) {
          await saveUserSettings();
        }
        await validateDocumentSelection();
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
      if (resetFiltersForExcludedNotebooks() || normalizeInvalidNotebookFilters()) {
        void saveUserSettings();
      }
      void loadTasks(true, { silent: true, validateSelection: true });
      if (isCalendarTaskViewMode(currentView.value)) {
        void ensureCalendarLifelogTasksLoaded(true);
      }
    }
  );
  const unsubscribeViewSwitchRequested = eventBus.on(
    Events.KANBAN_VIEW_SWITCH_REQUEST,
    (payload?: TaskViewSwitchRequest) => {
      if (payload?.view !== undefined) {
        const nextView = normalizeTaskViewMode(payload.view);
        if (currentView.value !== nextView) {
          currentView.value = nextView;
        }
      }
      if (typeof payload?.source === 'string' && payload.source.trim().length > 0) {
        if (currentView.value === 'list') {
          listFilterType.value = payload.source;
        } else if (currentView.value === 'gantt') {
          ganttFilterType.value = payload.source;
        } else {
          kanbanFilterType.value = payload.source;
        }
      }
      if (typeof payload?.documentId === 'string' && payload.documentId.trim().length > 0) {
        if (currentView.value === 'list') {
          listFilterDocument.value = payload.documentId;
        } else if (currentView.value === 'gantt') {
          ganttFilterDocument.value = payload.documentId;
        } else {
          kanbanFilterDocument.value = payload.documentId;
        }
      } else if (payload?.source !== undefined) {
        if (currentView.value === 'list') {
          listFilterDocument.value = 'all';
        } else if (currentView.value === 'gantt') {
          ganttFilterDocument.value = 'all';
        } else {
          kanbanFilterDocument.value = 'all';
        }
      }
    }
  );

  eventUnsubscribers.push(
    unsubscribeChanged,
    unsubscribeDeleted,
    unsubscribeUpdated,
    unsubscribeAdded,
    unsubscribeDateChanged,
    unsubscribeGroupsUpdated,
    unsubscribeDocumentGroupsUpdated,
    unsubscribeTaskScopeUpdated,
    unsubscribeViewSwitchRequested
  );
}

function cleanupEventListeners() {
  eventUnsubscribers.forEach(unsubscribe => unsubscribe());
  eventUnsubscribers = [];
  incrementalUpdateQueue.clear();
  queuedIncrementalAllowUnknown = false;
  queuedIncrementalForceFreshBlockIds.clear();
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

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
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

async function resolveParentTaskBlockIds(
  blockIds: string[],
  taskIndexMap?: Map<string, number>
): Promise<Set<string>> {
  const resolvedParentBlockIds = new Set<string>();
  const unknownBlockIds: string[] = [];
  const normalizedBlockIds = normalizeBlockIds(blockIds);

  for (const blockId of normalizedBlockIds) {
    unknownBlockIds.push(blockId);
  }

  if (unknownBlockIds.length === 0) {
    return resolvedParentBlockIds;
  }

  try {
    const rows = await queryAncestorContextRows(unknownBlockIds);
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

      if (taskIndexMap) {
        for (const candidate of candidates) {
          if (candidate.depth <= 0) continue;
          if (taskIndexMap.has(candidate.id)) {
            mappedParentId = candidate.id;
            break;
          }
        }
      }

      if (!mappedParentId) {
        const fallbackAncestor = candidates.find((candidate) => candidate.depth > 0);
        if (fallbackAncestor) {
          mappedParentId = fallbackAncestor.id;
        }
      }

      if (!mappedParentId) {
        const selfCandidate = candidates.find((candidate) => candidate.id === sourceId);
        if (selfCandidate) {
          mappedParentId = sourceId;
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

interface SubtaskLookup {
  subtask: SubTask;
  parentBlockId: string;
}

function collectSubtasksByNodeId(subtasks: SubTask[] | undefined, map: Map<string, SubTask>): void {
  if (!subtasks || subtasks.length === 0) {
    return;
  }
  for (const subtask of subtasks) {
    if (subtask?.nodeId) {
      map.set(subtask.nodeId, subtask);
    }
    if (subtask?.subtasks && subtask.subtasks.length > 0) {
      collectSubtasksByNodeId(subtask.subtasks, map);
    }
  }
}

function mergeSubtaskCustomFields(
  previousSubtasks: SubTask[] | undefined,
  nextSubtasks: SubTask[] | undefined
): SubTask[] | undefined {
  if (!nextSubtasks || nextSubtasks.length === 0) {
    return nextSubtasks;
  }

  const previousByNodeId = new Map<string, SubTask>();
  collectSubtasksByNodeId(previousSubtasks, previousByNodeId);

  const mergeItem = (item: SubTask): SubTask => {
    const merged: SubTask = { ...item };
    const previous = item.nodeId ? previousByNodeId.get(item.nodeId) : undefined;
    if (previous) {
      if (merged.status === undefined && previous.status !== undefined) {
        merged.status = previous.status;
      }
      if (merged.priority === undefined && previous.priority !== undefined) {
        merged.priority = previous.priority;
      }
      if (merged.description === undefined && previous.description !== undefined) {
        merged.description = previous.description;
      }
      if (merged.groupId === undefined && previous.groupId !== undefined) {
        merged.groupId = previous.groupId;
      }
      if (merged.startDate === undefined && previous.startDate !== undefined) {
        merged.startDate = previous.startDate;
      }
      if (merged.dueDate === undefined && previous.dueDate !== undefined) {
        merged.dueDate = previous.dueDate;
      }
      if (merged.startTime === undefined && previous.startTime !== undefined) {
        merged.startTime = previous.startTime;
      }
      if (merged.dueTime === undefined && previous.dueTime !== undefined) {
        merged.dueTime = previous.dueTime;
      }
      if (merged.createdAt === undefined && previous.createdAt !== undefined) {
        merged.createdAt = previous.createdAt;
      }
      if (merged.updatedAt === undefined && previous.updatedAt !== undefined) {
        merged.updatedAt = previous.updatedAt;
      }
    }
    if (item.subtasks && item.subtasks.length > 0) {
      merged.subtasks = item.subtasks.map(child => mergeItem(child));
    }
    return merged;
  };

  return nextSubtasks.map(item => mergeItem(item));
}

function collectSubtaskLookup(
  subtasks: SubTask[] | undefined,
  parentBlockId: string,
  map: Map<string, SubtaskLookup>
): void {
  if (!subtasks || subtasks.length === 0) {
    return;
  }

  for (const subtask of subtasks) {
    if (subtask?.nodeId) {
      map.set(subtask.nodeId, { subtask, parentBlockId });
    }
    if (subtask?.subtasks && subtask.subtasks.length > 0) {
      collectSubtaskLookup(subtask.subtasks, parentBlockId, map);
    }
  }
}

function buildTaskLookup(): {
  taskIndexMap: Map<string, number>;
  subtaskNodeMap: Map<string, SubtaskLookup>;
} {
  const taskIndexMap = new Map<string, number>();
  const subtaskNodeMap = new Map<string, SubtaskLookup>();

  tasks.value.forEach((task, index) => {
    if (task?.blockId) {
      taskIndexMap.set(task.blockId, index);
    }
    if (task?.subtasks && task.subtasks.length > 0) {
      collectSubtaskLookup(task.subtasks, task.blockId || '', subtaskNodeMap);
    }
  });

  return { taskIndexMap, subtaskNodeMap };
}

function hasTaskOrSubtask(blockId: string): boolean {
  if (!blockId) return false;
  if (tasks.value.some(task => task.blockId === blockId)) {
    return true;
  }
  const { subtaskNodeMap } = buildTaskLookup();
  return subtaskNodeMap.has(blockId);
}

async function isSubtaskBlockId(blockId: string): Promise<boolean> {
  if (!blockId) return false;
  try {
    const rows = await queryAncestorContextRows([blockId]);
    return rows.some(row =>
      row.source_id === blockId
      && row.subtype === 't'
      && Number(row.depth) > 0
    );
  } catch {
    return false;
  }
}

function getTaskTitleFromElement(root: Element | null): string | null {
  if (!root) {
    return null;
  }
  const paragraph = root.matches('[data-type="NodeParagraph"]')
    ? root
    : root.querySelector('[data-type="NodeParagraph"]');
  const editable = paragraph?.matches('[contenteditable="true"]')
    ? paragraph
    : paragraph?.querySelector('[contenteditable="true"]');
  const title = cleanTaskTitleHtml(editable?.innerHTML || paragraph?.innerHTML || '');
  return title.length > 0 ? title : null;
}

async function fastSyncTaskFromDom(
  blockIds: string[],
  taskIndexMap: Map<string, number>,
  subtaskNodeMap: Map<string, SubtaskLookup>
): Promise<{
  unresolvedBlockIds: string[];
  patchedParentStatuses: Map<string, Task['status']>;
  patchedParentTitles: Map<string, string>;
  hasPatched: boolean;
}> {
  const unresolved: string[] = [];
  const patchedParentStatuses = new Map<string, Task['status']>();
  const patchedParentTitles = new Map<string, string>();
  let hasPatched = false;
  const validBlockIds: string[] = [];

  for (const blockId of blockIds) {
    if (taskIndexMap.has(blockId) || subtaskNodeMap.has(blockId)) {
      validBlockIds.push(blockId);
    } else {
      unresolved.push(blockId);
    }
  }

  if (validBlockIds.length === 0) {
    return { unresolvedBlockIds: unresolved, patchedParentStatuses, patchedParentTitles, hasPatched };
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

    const parsedDoc = dom ? parser.parseFromString(dom, 'text/html') : null;
    const completed = parseTaskCompleted(blockId, parsedDoc);
    const title = getLiveKanbanTaskTitle(blockId)
      ?? (parsedDoc ? getTaskTitleFromElement(getTaskElementFromDoc(parsedDoc, blockId)) : null);
    if (completed === null) {
      unresolved.push(blockId);
      continue;
    }

    const taskIndex = taskIndexMap.get(blockId);
    if (taskIndex !== undefined) {
      const task = tasks.value[taskIndex];
      if (!task) {
        unresolved.push(blockId);
        continue;
      }

      let changed = false;
      const previousStatus = task.status;
      const previousCompletedAt = task.completedAt;
      const nextStatus: Task['status'] = completed
        ? 'completed'
        : (task.status === 'completed' ? 'pending' : (task.status || 'pending'));
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
        patchedParentTitles.set(blockId, title);
        if (task.title !== title) {
          task.title = title;
          crdtRepo.updateTaskField(task.id, 'title', title);
          changed = true;
        }
      }
      patchedParentStatuses.set(blockId, nextStatus);
      if (changed) {
        task.updatedAt = new Date().toISOString();
        hasPatched = true;
      }
      continue;
    }

    const subtaskEntry = subtaskNodeMap.get(blockId);
    if (subtaskEntry) {
      if (subtaskEntry.subtask.completed !== completed) {
        subtaskEntry.subtask.completed = completed;
        hasPatched = true;
      }
      if (title !== null && subtaskEntry.subtask.title !== title) {
        subtaskEntry.subtask.title = title;
        hasPatched = true;
      }
      continue;
    }

    unresolved.push(blockId);
  }

  return {
    unresolvedBlockIds: unresolved,
    patchedParentStatuses,
    patchedParentTitles,
    hasPatched
  };
}

async function incrementalUpdateTasks(
  blockIds: string[],
  options: { allowUnknown?: boolean; forceFresh?: boolean } = {}
) {
  const { allowUnknown = false, forceFresh = false } = options;
  if (isDropping.value) {
    return;
  }
  
  try {
    const normalizedBlockIds = blockIds.filter((id): id is string => typeof id === 'string' && id.length > 0);
    if (normalizedBlockIds.length === 0) {
      return;
    }

    const scopedBlockIds = await TaskRepository.filterIncludedBlockIds(normalizedBlockIds);
    if (scopedBlockIds.length === 0) {
      return;
    }

    const { taskIndexMap, subtaskNodeMap } = buildTaskLookup();
    const { patchedParentStatuses, patchedParentTitles, hasPatched } = await fastSyncTaskFromDom(
      scopedBlockIds,
      taskIndexMap,
      subtaskNodeMap
    );

    const parentBlockIds = new Set<string>();
    const stillUnresolved: string[] = [];

    // Always resolve affected parent tasks so attribute updates (date/time/group/etc.)
    // from outside kanban can be merged, not only checkbox status changes.
    for (const blockId of scopedBlockIds) {
      if (taskIndexMap.has(blockId)) {
        parentBlockIds.add(blockId);
        continue;
      }
      const subtaskEntry = subtaskNodeMap.get(blockId);
      if (subtaskEntry?.parentBlockId) {
        parentBlockIds.add(subtaskEntry.parentBlockId);
        continue;
      }
      stillUnresolved.push(blockId);
    }

    if (stillUnresolved.length > 0) {
      const resolvedParentIds = await resolveParentTaskBlockIds(stillUnresolved, taskIndexMap);
      resolvedParentIds.forEach((id) => parentBlockIds.add(id));
    }

    if (parentBlockIds.size === 0) {
      if (hasPatched) {
        applyDraggedStatusLocks(tasks.value);
        invalidateTableFilters();
        await nextTick();
        return;
      }
      scheduleRefreshTasks(180, 'silent-full');
      return;
    }
    
    const canUseLightIncremental =
      loadedTaskLoadMode.value === 'light-base' ||
      loadedTaskLoadMode.value === 'light-with-repeats';
    const updatedTasksMap = await TaskRepository.getTasksByBlockIds(
      Array.from(parentBlockIds),
      false,
      undefined,
      canUseLightIncremental
        ? { useLiveDom: false, detailLevel: 'light', forceFresh }
        : { useLiveDom: true, forceFresh }
    );
    updatedTasksMap.forEach(task => {
      const forcedStatus = task.blockId ? patchedParentStatuses.get(task.blockId) : null;
      if (forcedStatus) {
        task.status = forcedStatus;
        if (forcedStatus === 'completed') {
          task.completedAt = task.completedAt || new Date().toISOString();
        } else {
          delete task.completedAt;
        }
        task.updatedAt = new Date().toISOString();
      }
      const forcedTitle = task.blockId ? patchedParentTitles.get(task.blockId) : null;
      if (forcedTitle) {
        task.title = forcedTitle;
      }
      const lockedStatus = task.blockId ? getLockedDraggedTaskStatus(task.blockId) : null;
      if (lockedStatus) {
        task.status = lockedStatus;
      }
    });

    await flushExternalTaskStatusAttrSync(parentBlockIds);
    
    let touched = hasPatched;

    for (const blockId of parentBlockIds) {
      const updatedTask = updatedTasksMap.get(blockId);
      const oldIndex = taskIndexMap.get(blockId);
      
      if (updatedTask) {
        // The indexed task is now authoritative; it can replace the
        // quick-create placeholder on subsequent full snapshots.
        pendingOptimisticQuickCreatedTasks.delete(blockId);
        const taskToApply = applyLocalTaskFieldOverrides(updatedTask);
        if (oldIndex !== undefined) {
          const currentTask = tasks.value[oldIndex];
          const optimisticHeadingMeta = currentTask ? taskHeadingGroups.value.get(currentTask.id) : undefined;
          const hasPendingHeadingMeta = currentTask
            ? getTaskHeadingIdentityIds(currentTask).some(taskId => pendingTaskHeadingGroups.has(taskId))
            : false;
          taskToApply.subtasks = mergeSubtaskCustomFields(currentTask?.subtasks, taskToApply.subtasks);
          if (currentTask) {
            Object.assign(currentTask, taskToApply);
          } else {
            tasks.value[oldIndex] = taskToApply;
          }
          if (optimisticHeadingMeta) {
            setTaskHeadingGroupMetaForIds(
              [currentTask?.id || '', taskToApply.id, taskToApply.blockId || ''],
              optimisticHeadingMeta,
              { rememberPending: hasPendingHeadingMeta }
            );
          }
        } else {
          tasks.value.push(taskToApply);
        }
        touched = true;
      }
    }

    const repeatReconcilePayloads = buildRepeatReconcilePayloadsFromTasks(Array.from(updatedTasksMap.values()));
    const repeatMaterializeOptions = resolveCurrentRepeatMaterializeOptions();
    if (repeatReconcilePayloads.length > 0 && repeatMaterializeOptions) {
      let reconciledTasks = tasks.value;
      let repeatTouched = false;
      for (const payload of repeatReconcilePayloads) {
        const result = await rebuildAffectedRepeatTasks(
          reconciledTasks,
          payload,
          repeatMaterializeOptions
        );
        if (!result.handled) {
          continue;
        }
        reconciledTasks = result.nextTasks;
        repeatTouched = repeatTouched || result.touched;
      }
      if (reconciledTasks !== tasks.value) {
        tasks.value = reconciledTasks;
      }
      touched = touched || repeatTouched;
    }

    if (touched) {
      crdtRepo.syncFromSQLTasks(tasks.value);
      tasks.value = applyDraggedStatusLocks(crdtRepo.getTasks());
      // Incremental updates are the normal path for tasks created in a
      // document. Refresh the scope tree immediately when their document is
      // new, otherwise group/goal filtering would hide the task until a later
      // full reload.
      scheduleDocumentScopeRefreshForUnknownTaskDocuments(0);
      invalidateTableFilters();
      
      await nextTick();
    }
  } catch (error) {
    console.error('[KanbanView] Failed to incrementally update tasks:', error);
    scheduleRefreshTasks(180, allowUnknown ? 'silent-full' : 'full');
  }
}

function getColumnTaskCount(column: KanbanColumn): number {
  return getTasksForColumn(column).length;
}

const kanbanEditorStyle = computed(() => ({
  left: `${kanbanEditorPosition.value.x}px`,
  top: `${kanbanEditorPosition.value.y}px`
}));

const calendarDockEditorTeleportTo = computed(() => calendarDockEditorTarget.value || 'body');
const calendarDockEditorPanelStyle = computed<Record<string, string>>(() => {
  calendarDockEditorLayoutVersion.value;

  if (calendarDockEditorTarget.value) {
    return {
      position: 'relative',
      inset: 'auto',
      top: 'auto',
      right: 'auto',
      bottom: 'auto',
      left: 'auto',
      width: '100%',
      maxWidth: '100%',
      height: '100%',
      minHeight: '0',
      maxHeight: '100%',
      borderRadius: '0',
      boxShadow: 'none'
    };
  }

  return {
    top: '12px',
    right: '52px',
    bottom: '12px',
    width: 'min(440px, calc(100vw - 76px))',
    maxHeight: 'calc(100vh - 24px)'
  };
});

function resolveCalendarDockContainer(): HTMLElement | null {
  openPinchDockView();

  const dockElement = getPinchDockElement();
  if (dockElement) {
    return dockElement;
  }

  const appElement = document.getElementById('Pinch-habit-app') as HTMLElement | null;
  if (appElement?.parentElement) {
    return appElement.parentElement as HTMLElement;
  }

  return document.querySelector('.layout__dockr') as HTMLElement | null;
}

function ensureCalendarDockEditorHost(container: HTMLElement | null): HTMLElement | null {
  if (!container) {
    return null;
  }

  const ownerDocument = container.ownerDocument || document;
  let host = calendarDockEditorHostElement;
  if (!host || !host.isConnected) {
    host = ownerDocument.getElementById(CALENDAR_DOCK_EDITOR_HOST_ID) as HTMLElement | null;
  }
  if (!host) {
    host = ownerDocument.createElement('div');
    host.id = CALENDAR_DOCK_EDITOR_HOST_ID;
  }
  if (host.parentElement !== container) {
    container.appendChild(host);
  }

  if (window.getComputedStyle(container).position === 'static') {
    container.style.position = 'relative';
  }

  host.style.position = 'absolute';
  host.style.inset = '0';
  host.style.zIndex = '40';
  host.style.display = 'block';
  host.style.overflow = 'hidden';
  host.style.minWidth = '0';
  host.style.minHeight = '0';
  host.style.background = 'transparent';
  calendarDockEditorHostElement = host;
  return host;
}

function hideCalendarDockEditorHost(): void {
  if (calendarDockEditorHostElement) {
    calendarDockEditorHostElement.style.display = 'none';
  }
  calendarDockEditorTarget.value = null;
  calendarDockEditorLayoutVersion.value += 1;
}

function resetKanbanEditorState(): void {
  suppressNextKanbanEditorOutsideMouseDown = false;
  kanbanEditorTaskId.value = null;
  kanbanEditorDraft.value = null;
  kanbanEditorQuickPanel.value = null;
  kanbanEditorRepeatFrequency.value = 'none';
  kanbanEditorRepeatRule.value = null;
  showKanbanTaskMoveDialog.value = false;
  isKanbanTaskMoveSubmitting.value = false;
  kanbanMoveSelectedNotebook.value = '';
  kanbanMoveSelectedDocument.value = '';
}

function cleanupKanbanEditorProtyle(mountElement: HTMLElement | null = getKanbanEditorMountElement()): void {
  if (kanbanEditorProtyle) {
    try {
      kanbanEditorProtyle.destroy();
    } catch {
    }
    kanbanEditorProtyle = null;
  }
  if (mountElement) {
    mountElement.innerHTML = '';
  }
}

function handleCalendarDockEditorAfterLeave(): void {
  if (calendarDockEditorActive.value || calendarDockEditorVisible.value) {
    return;
  }

  if (kanbanEditorVisible.value) {
    const calendarMountElement = getCalendarDockEditorMountElement();
    if (calendarMountElement) {
      calendarMountElement.innerHTML = '';
    }
    calendarDockEditorRendered.value = false;
    hideCalendarDockEditorHost();
    return;
  }

  cleanupKanbanEditorProtyle(getCalendarDockEditorMountElement());
  calendarDockEditorRendered.value = false;
  resetKanbanEditorState();
  hideCalendarDockEditorHost();
}

function resolveCalendarDockEditorTarget(): HTMLElement | null {
  const host = ensureCalendarDockEditorHost(resolveCalendarDockContainer());
  calendarDockEditorTarget.value = host;
  calendarDockEditorLayoutVersion.value += 1;
  return host;
}

function resolveKanbanEditorPanelElement(): HTMLElement | null {
  if (calendarDockEditorActive.value) {
    const exposed = calendarDockEditorPanelRef.value as { panelEl?: HTMLElement | { value?: HTMLElement | null } } | null;
    const panelEl = exposed?.panelEl;
    if (!panelEl) {
      return null;
    }
    if (panelEl instanceof HTMLElement) {
      return panelEl;
    }
    if (typeof panelEl === 'object' && 'value' in panelEl) {
      return (panelEl as { value?: HTMLElement | null }).value || null;
    }
    return null;
  }
  const exposed = kanbanEditorPanelRef.value as { panelEl?: HTMLElement | { value?: HTMLElement | null } } | null;
  const panelEl = exposed?.panelEl;
  if (!panelEl) {
    return null;
  }
  if (panelEl instanceof HTMLElement) {
    return panelEl;
  }
  if (typeof panelEl === 'object' && 'value' in panelEl) {
    return (panelEl as { value?: HTMLElement | null }).value || null;
  }
  return null;
}

function clampKanbanEditorPosition(): void {
  const panel = resolveKanbanEditorPanelElement();
  if (!panel) return;
  const padding = 12;
  const rect = panel.getBoundingClientRect();
  const maxX = window.innerWidth - rect.width - padding;
  const maxY = window.innerHeight - rect.height - padding;
  const nextX = Math.min(Math.max(padding, kanbanEditorPosition.value.x), Math.max(padding, maxX));
  const nextY = Math.min(Math.max(padding, kanbanEditorPosition.value.y), Math.max(padding, maxY));
  kanbanEditorPosition.value = { x: nextX, y: nextY };
}

function setKanbanEditorPositionFromEvent(event: MouseEvent): void {
  const offset = 12;
  kanbanEditorPosition.value = {
    x: event.clientX + offset,
    y: event.clientY + offset
  };
}

function isKanbanTaskExpanded(taskId: string): boolean {
  return expandedKanbanTaskIds.value.has(taskId);
}

async function ensureKanbanTaskSubtasks(task: Task): Promise<void> {
  if (!task.blockId) return;
  if (task.subtasks && task.subtasks.length > 0) return;
  if (kanbanSubtaskHydratingIds.has(task.blockId)) return;

  kanbanSubtaskHydratingIds.add(task.blockId);
  try {
    const refreshedTaskMap = await TaskRepository.getTasksByBlockIds(
      [task.blockId],
      false,
      undefined,
      { useLiveDom: false }
    );
    const refreshedTask = refreshedTaskMap.get(task.blockId);
    if (!refreshedTask) return;
    refreshedTask.subtasks = mergeSubtaskCustomFields(task.subtasks, refreshedTask.subtasks);
    crdtRepo.syncIncrementalTasks([refreshedTask]);
    updateTasks();
    nextTick(() => {
      scheduleKanbanMetricsUpdateForTask(task.id);
      scheduleListViewMetricsUpdate();
    });
  } catch (error) {
    console.warn('[KanbanView] Failed to fetch subtasks:', error);
  } finally {
    kanbanSubtaskHydratingIds.delete(task.blockId);
  }
}

function toggleKanbanTaskExpand(task: Task): void {
  const taskId = task.id;
  const next = new Set(expandedKanbanTaskIds.value);
  if (next.has(taskId)) {
    next.delete(taskId);
  } else {
    next.add(taskId);
    void ensureKanbanTaskSubtasks(task);
  }
  expandedKanbanTaskIds.value = next;
  nextTick(() => {
    scheduleKanbanMetricsUpdateForTask(taskId);
    scheduleListViewMetricsUpdate();
  });
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
  if (isKanbanBatchEditMode.value) {
    if (isKanbanBatchCardClickSuppressed()) {
      return;
    }
    toggleKanbanTaskBatchSelection(task.id);
    return;
  }
  if (inlineDescriptionSavingTaskIds.has(task.id)) {
    return;
  }
  if (inlineEditingDescriptionTaskId.value === task.id) {
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
  const targetTask = await resolveKanbanEditorTargetTask(task);
  if (!targetTask) {
    clearInlineDescriptionEdit(taskId);
    return;
  }
  if (description === (targetTask.description || '')) {
    clearInlineDescriptionEdit(taskId);
    return;
  }

  inlineDescriptionSavingTaskIds.add(taskId);
  try {
    await handleDescriptionUpdate(targetTask, description);
  } finally {
    inlineDescriptionSavingTaskIds.delete(taskId);
    clearInlineDescriptionEdit(taskId);
  }
}

async function handleTaskClick(task: Task, event?: MouseEvent) {
  if (isCalendarTaskViewMode(currentView.value)) {
    const editorEvent = event || new MouseEvent('click', {
      clientX: Math.round(window.innerWidth / 2),
      clientY: Math.round(window.innerHeight / 2),
      view: window
    });
    void openKanbanEditor(task, editorEvent, { calendarDock: true });
    return;
  }
  if (event && (
    currentView.value === 'kanban'
    || currentView.value === 'list'
    || currentView.value === 'quadrant'
    || currentView.value === 'table'
    || currentView.value === 'archive-table'
  )) {
    void openKanbanEditor(task, event);
    return;
  }
  const targetTask = await resolveKanbanEditorTargetTask(task);
  const blockId = typeof targetTask?.blockId === 'string' ? targetTask.blockId.trim() : '';
  if (targetTask?.type === 'block' && blockId) {
    await openBlockById(blockId);
  }
}

function handleCalendarTaskEdit(task: Task, anchor: { x: number; y: number }): void {
  const safeX = Number.isFinite(anchor?.x) ? anchor.x : Math.round(window.innerWidth / 2);
  const safeY = Number.isFinite(anchor?.y) ? anchor.y : Math.round(window.innerHeight / 2);
  const syntheticEvent = new MouseEvent('click', {
    clientX: safeX,
    clientY: safeY,
    view: window
  });
  void openKanbanEditor(task, syntheticEvent, { calendarDock: true });
}

function handleGanttTaskEdit(task: Task, event?: MouseEvent): void {
  const editorEvent = event || new MouseEvent('click', {
    clientX: Math.round(window.innerWidth / 2),
    clientY: Math.round(window.innerHeight / 2),
    view: window
  });
  void openKanbanEditor(task, editorEvent, { calendarDock: true });
}

async function handleKanbanEditorPrioritySelect(value: string): Promise<void> {
  if (!activeKanbanEditTask.value || !activeKanbanEditDraft.value) return;
  const priority = value as Task['priority'];
  activeKanbanEditDraft.value.priority = priority;
  await handlePriorityUpdate(activeKanbanEditTask.value, priority);
  invalidateTableFilters();
}

async function handleCalendarEditorColorSelect(color: string): Promise<void> {
  const sourceTask = activeKanbanEditTask.value;
  if (!sourceTask) {
    return;
  }
  const result = await persistTaskBackgroundColor(sourceTask, color, tasks.value).catch((error) => {
    console.error('[KanbanView] Failed to update task background color:', error);
    return null;
  });
  if (!result) {
    return;
  }

  const nowTs = Date.now();
  result.updatedTasks.forEach((task) => {
    crdtRepo.updateTaskField(task.id, 'backgroundColor', result.color, nowTs);
  });
  updateTasks();
  invalidateTableFilters();
}

async function handleKanbanEditorPinToggle(): Promise<void> {
  const task = activeKanbanEditTask.value;
  if (!task) return;
  const nextPinned = !(task.pinned === true);
  await applyBlockTaskFieldUpdate(
    task,
    { 'custom-task-pinned': nextPinned ? '1' : '' },
    'pinned',
    nextPinned,
    'Failed to update task pin'
  );
  invalidateTableFilters();
}

function handleKanbanEditorDescriptionInput(value: string): void {
  if (!activeKanbanEditDraft.value) return;
  activeKanbanEditDraft.value.description = value;
}

async function handleKanbanEditorDescriptionCommit(): Promise<void> {
  if (!activeKanbanEditTask.value || !activeKanbanEditDraft.value) return;
  const description = activeKanbanEditDraft.value.description || '';
  await handleDescriptionUpdate(activeKanbanEditTask.value, description);
  invalidateTableFilters();
}

function normalizeKanbanEditorDateFields(value: {
  startDate?: string;
  startTime?: string;
  dueDate?: string;
  dueTime?: string;
}): KanbanEditorDateFields {
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

function isSameKanbanEditorDateFields(a: KanbanEditorDateFields, b: KanbanEditorDateFields): boolean {
  return a.startDate === b.startDate
    && a.startTime === b.startTime
    && a.dueDate === b.dueDate
    && a.dueTime === b.dueTime;
}

function handleKanbanEditorDateFieldsUpdate(value: KanbanEditorDateFields): void {
  if (!activeKanbanEditTask.value || !activeKanbanEditDraft.value) return;
  const normalizedFields = normalizeKanbanEditorDateFields(value);
  const draftFields = normalizeKanbanEditorDateFields(activeKanbanEditDraft.value);
  const currentFields = normalizeKanbanEditorDateFields({
    startDate: (activeKanbanEditTask.value.startDate || '').toString(),
    startTime: (activeKanbanEditTask.value.startTime || '').toString(),
    dueDate: (activeKanbanEditTask.value.dueDate || '').toString(),
    dueTime: (activeKanbanEditTask.value.dueTime || '').toString()
  });
  if (isSameKanbanEditorDateFields(draftFields, normalizedFields)
    && isSameKanbanEditorDateFields(currentFields, normalizedFields)) {
    return;
  }
  activeKanbanEditDraft.value.startDate = normalizedFields.startDate;
  activeKanbanEditDraft.value.startTime = normalizedFields.startTime;
  activeKanbanEditDraft.value.dueDate = normalizedFields.dueDate;
  activeKanbanEditDraft.value.dueTime = normalizedFields.dueTime;
  void saveKanbanEditorDateFields(activeKanbanEditTask.value, normalizedFields);
}

function handleCalendarTaskDateSaveRequested(payload: {
  task: Task;
  fields: KanbanEditorDateFields;
  repeatPersistenceTarget?: Task;
  optimisticApplied?: boolean;
}): void {
  void saveKanbanEditorDateFields(payload.task, payload.fields, {
    repeatPersistenceTarget: payload.repeatPersistenceTarget,
    optimisticApplied: payload.optimisticApplied === true
  });
}

function handleCalendarEditorDateClear(): void {
  handleKanbanEditorDateFieldsUpdate({
    startDate: '',
    startTime: '',
    dueDate: '',
    dueTime: ''
  });
  closeKanbanEditor();
}

function handleGanttSectionTaskCreateRequested(sectionId: string): void {
  const targetTask = ganttViewTasks.value.find(task =>
    task.type === 'block'
    && `${task.notebookId}:${task.rootId}` === sectionId
  );
  const fixedTarget = targetTask ? resolveTaskCreateTargetFromTask(targetTask) : null;
  if (!fixedTarget) {
    void pushMsg(t('kanbanView.selectNotebookAndDocument'), 3000);
    return;
  }
  void handleTaskCreateRequested(getDefaultCreateTaskPayload(), {
    context: {
      columnType: 'status',
      status: 'pending',
      fixedTarget
    }
  });
}

async function saveKanbanEditorDateFields(
  task: Task,
  value: KanbanEditorDateFields,
  options: { repeatPersistenceTarget?: Task; optimisticApplied?: boolean } = {}
): Promise<void> {
  const normalizedFields = normalizeKanbanEditorDateFields(value);
  const shouldClearRepeatDates = !normalizedFields.startDate
    && !normalizedFields.startTime
    && !normalizedFields.dueDate
    && !normalizedFields.dueTime;
  const targetTask = shouldClearRepeatDates && options.repeatPersistenceTarget
    ? { ...options.repeatPersistenceTarget }
    : await resolveKanbanEditorTargetTask(task);
  const blockId = typeof targetTask?.blockId === 'string' ? targetTask.blockId.trim() : '';
  if (!targetTask || targetTask.type !== 'block' || !blockId) {
    return;
  }
  try {
    const isRepeatTask = isRepeatTaskEntity(targetTask);
    if (isRepeatTask) {
      if (shouldClearRepeatDates) {
        const repeatSeriesId = targetTask.repeatSeriesId;
        const repeatPersistenceTarget = { ...targetTask };
        const updatedTask = {
          ...targetTask,
          startDate: '',
          startTime: undefined,
          dueDate: '',
          dueTime: undefined,
          repeatFrequency: 'none' as const,
          repeatSeriesId: undefined,
          repeatInstanceDate: undefined,
          isVirtual: false
        };
        if (!options.optimisticApplied) {
          applyKanbanEditorTaskDateChange(updatedTask);
        }
        await TaskRepository.updateTask(updatedTask.id, {
          startDate: '',
          startTime: undefined,
          dueDate: '',
          dueTime: undefined
        });
        await TaskRepository.setTaskRepeatRule(repeatPersistenceTarget, 'none');
        notifyRepeatChanged({
          blockId,
          seriesId: repeatSeriesId,
          frequency: 'none'
        });
        invalidateTableFilters();
        return;
      }

      const updatedSeries = await updateRepeatSeriesDates(
        targetTask,
        normalizedFields.startDate || null,
        normalizedFields.dueDate || null,
        {
          startTime: normalizedFields.startTime || null,
          dueTime: normalizedFields.dueTime || null
        },
        { emitChange: false }
      );

      if (updatedSeries) {
        const updatedTask = {
          ...targetTask,
          startDate: updatedSeries.startDate || '',
          startTime: updatedSeries.startTime || undefined,
          dueDate: updatedSeries.endDate || '',
          dueTime: updatedSeries.dueTime || undefined
        };
        await TaskRepository.updateTask(updatedTask.id, {
          startDate: updatedTask.startDate,
          startTime: updatedTask.startTime,
          dueDate: updatedTask.dueDate,
          dueTime: updatedTask.dueTime
        });
        applyKanbanEditorTaskDateChange(updatedTask);
        notifyRepeatChanged({
          blockId,
          seriesId: updatedSeries.id,
          frequency: updatedSeries.frequency
        });
        invalidateTableFilters();
        return;
      }
    }

    const updatedTask = {
      ...targetTask,
      startDate: normalizedFields.startDate || '',
      startTime: normalizedFields.startTime || undefined,
      dueDate: normalizedFields.dueDate || '',
      dueTime: normalizedFields.dueTime || undefined
    };
    await TaskRepository.updateTask(updatedTask.id, {
      startDate: updatedTask.startDate,
      startTime: updatedTask.startTime,
      dueDate: updatedTask.dueDate,
      dueTime: updatedTask.dueTime
    });
    applyKanbanEditorTaskDateChange(updatedTask);
    invalidateTableFilters();
  } catch (error) {
    console.error('[KanbanView] Failed to update task dates:', error);
  }
}

async function handleKanbanEditorGroupSelect(value: string): Promise<void> {
  if (!activeKanbanEditTask.value || !activeKanbanEditDraft.value) return;
  const nextTagIds = value === TASK_GROUP_NONE_ID
    ? []
    : toggleTaskTagSelection(kanbanEditorSelectedTagIds.value, value);
  const nextTagState = buildTaskTagState(nextTagIds);
  activeKanbanEditDraft.value.tags = [...nextTagState.tagIds];
  activeKanbanEditDraft.value.groupId = nextTagState.primaryTagId;
  await applyBlockTaskTagUpdate(activeKanbanEditTask.value, nextTagState.tagIds, 'Failed to update task group');
  invalidateTableFilters();
}

async function handleKanbanEditorGoalSelect(value: string): Promise<void> {
  const task = activeKanbanEditTask.value;
  if (!task) {
    return;
  }

  const nextGoals = toggleTaskGoalMembership(goalDefinitions.value, task, value);
  goalDefinitions.value = nextGoals;
  await saveGoalDefinitions(nextGoals);
  invalidateTableFilters();
}

async function handleTableGoalUpdate(task: Task, goalId: string): Promise<void> {
  const normalizedGoalId = typeof goalId === 'string' ? goalId.trim() : '';
  if (!task || !normalizedGoalId || !goalDefinitionsById.value.has(normalizedGoalId)) {
    return;
  }

  const nextGoals = toggleTaskGoalMembership(goalDefinitions.value, task, normalizedGoalId);
  goalDefinitions.value = nextGoals;
  await saveGoalDefinitions(nextGoals);
  invalidateTableFilters();
}

async function handleGanttTaskGoalDrop(task: Task, goalId: string): Promise<void> {
  const normalizedGoalId = typeof goalId === 'string' ? goalId.trim() : '';
  if (!task || !normalizedGoalId || !goalDefinitionsById.value.has(normalizedGoalId)) {
    return;
  }

  const currentGoalIds = new Set(getEffectiveGoalIdsForTask(goalDefinitions.value, task));
  if (currentGoalIds.has(normalizedGoalId)) {
    return;
  }

  currentGoalIds.add(normalizedGoalId);
  const nextGoals = setTaskGoalMembership(goalDefinitions.value, task, Array.from(currentGoalIds));
  goalDefinitions.value = nextGoals;
  await saveGoalDefinitions(nextGoals);
  invalidateTableFilters();
}

async function handleGanttGoalDueDateChanged(goalId: string, dueDate: string): Promise<void> {
  const normalizedGoalId = typeof goalId === 'string' ? goalId.trim() : '';
  const normalizedDueDate = typeof dueDate === 'string' ? dueDate.trim() : '';
  const goal = normalizedGoalId ? goalDefinitionsById.value.get(normalizedGoalId) : null;
  if (!goal || !/^\d{4}-\d{2}-\d{2}$/.test(normalizedDueDate)) {
    return;
  }
  if ((goal.dueDate || '') === normalizedDueDate) {
    return;
  }

  const nextGoals = goalDefinitions.value.map(item => (
    item.id === normalizedGoalId
      ? { ...item, dueDate: normalizedDueDate }
      : item
  ));
  goalDefinitions.value = nextGoals;
  await saveGoalDefinitions(nextGoals);
  invalidateTableFilters();
}

async function handleKanbanEditorReminderSelect(value: TaskReminderSelection): Promise<void> {
  if (!activeKanbanEditTask.value || !activeKanbanEditDraft.value) return;

  const normalizedReminder = normalizeTaskReminderSelection(value);

  activeKanbanEditDraft.value.reminderType = normalizedReminder.reminderType;
  activeKanbanEditDraft.value.reminderCustomTime = normalizedReminder.reminderCustomTime;

  await applyBlockTaskFieldUpdate(
    activeKanbanEditTask.value,
    buildTaskReminderAttrs(normalizedReminder),
    'reminderType',
    normalizedReminder.reminderType,
    'Failed to update task reminder',
    async () => {
      const activeTask = activeKanbanEditTask.value;
      const targetTask = activeTask ? await resolveKanbanEditorTargetTask(activeTask) : null;
      if (targetTask) {
        updateTaskLocalField(
          targetTask.id,
          'reminderCustomTime',
          normalizedReminder.reminderCustomTimeValue
        );
      }
    }
  );
}

async function handleKanbanEditorStatusSelect(status: Task['status']): Promise<void> {
  if (!activeKanbanEditTask.value || !activeKanbanEditDraft.value) {
    return;
  }
  activeKanbanEditDraft.value.status = status;
  await handleStatusUpdate(activeKanbanEditTask.value, status);
  invalidateTableFilters();
}

async function handleKanbanEditorRepeatRuleSave(repeat: RepeatFrequency | RepeatRuleInput): Promise<void> {
  const task = activeKanbanEditTask.value;
  if (!task) {
    return;
  }

  const frequency = typeof repeat === 'string' ? repeat : repeat.frequency;
  kanbanEditorRepeatFrequency.value = normalizeRepeatFrequencyForKanbanEditor(frequency);
  kanbanEditorRepeatRule.value = typeof repeat === 'string' ? null : (repeat.rule || null);

  const isRepeatTask = isRepeatTaskEntity(task);
  const repeatSeries = isRepeatTask
    ? await getRepeatSeriesForTask(task).catch(() => null)
    : null;
  const draft = activeKanbanEditDraft.value;
  const taskForRepeatRule = {
    ...task,
    startDate: draft?.startDate || repeatSeries?.startDate || task.startDate,
    startTime: draft?.startTime || repeatSeries?.startTime || task.startTime,
    dueDate: draft?.dueDate || repeatSeries?.endDate || task.dueDate,
    dueTime: draft?.dueTime || repeatSeries?.dueTime || task.dueTime
  };

  try {
    const savedRepeatSeries = await TaskRepository.setTaskRepeatRule(taskForRepeatRule, repeat);
    const repeatEndDate = savedRepeatSeries && typeof repeat !== 'string'
      ? (savedRepeatSeries.endDate || '')
      : undefined;
    if (repeatEndDate !== undefined && draft) {
      // The recurrence cutoff is also the task's displayed due date in the
      // calendar editor, so keep the open form in sync immediately.
      draft.dueDate = repeatEndDate;
    }
    const index = tasks.value.findIndex(item => item.id === task.id);
    if (index >= 0) {
      const nextRepeatSeriesId = frequency === 'none'
        ? undefined
        : (savedRepeatSeries?.id || tasks.value[index].repeatSeriesId);
      tasks.value[index] = {
        ...tasks.value[index],
        ...(repeatEndDate !== undefined ? { dueDate: repeatEndDate } : {}),
        repeatFrequency: frequency,
        repeatSeriesId: nextRepeatSeriesId,
        repeatInstanceDate: frequency === 'none' ? undefined : tasks.value[index].repeatInstanceDate,
        isVirtual: frequency === 'none' ? false : tasks.value[index].isVirtual,
        updatedAt: new Date().toISOString()
      };
    }
    if (repeatEndDate !== undefined && task.blockId) {
      await setBlockAttrs(task.blockId, {
        'custom-task-due-date': repeatEndDate
      });
    }
    invalidateTableFilters();
    scheduleKernelTaskIndexRefresh();
  } catch (error) {
    console.error('[KanbanView] Failed to update task repeat rule:', error);
  }
}

function syncKanbanMoveSelectedDocument(preferredDocumentId?: string): void {
  const preferredId = typeof preferredDocumentId === 'string' ? preferredDocumentId.trim() : '';
  if (preferredId && kanbanMoveDocuments.value.some(doc => doc.id === preferredId)) {
    kanbanMoveSelectedDocument.value = preferredId;
    return;
  }
  kanbanMoveSelectedDocument.value = kanbanMoveDocuments.value[0]?.id || '';
}

async function openKanbanTaskMoveDialog(): Promise<void> {
  const task = activeKanbanEditTask.value;
  if (!task) {
    return;
  }

  if (task.type !== 'block' || !task.blockId) {
    await pushMsg(t('kanbanView.taskCannotMove'), 2000);
    return;
  }

  if (notebooks.value.length === 0) {
    await loadNotebooks();
  }

  kanbanEditorQuickPanel.value = null;

  const currentNotebookId = typeof task.notebookId === 'string' ? task.notebookId.trim() : '';
  kanbanMoveSelectedNotebook.value = notebooks.value.some(notebook => notebook.id === currentNotebookId)
    ? currentNotebookId
    : (notebooks.value[0]?.id || '');
  syncKanbanMoveSelectedDocument(task.rootId);
  showKanbanTaskMoveDialog.value = true;
}

function closeKanbanTaskMoveDialog(): void {
  showKanbanTaskMoveDialog.value = false;
  isKanbanTaskMoveSubmitting.value = false;
}

function handleKanbanMoveNotebookChange(value: string): void {
  kanbanMoveSelectedNotebook.value = typeof value === 'string' ? value : '';
  syncKanbanMoveSelectedDocument();
}

async function handleKanbanEditorMove(): Promise<void> {
  const task = activeKanbanEditTask.value;
  if (!task || !canSubmitKanbanMove.value) {
    return;
  }

  isKanbanTaskMoveSubmitting.value = true;
  try {
    const moveResult = await TaskRepository.moveTask(task.id, kanbanMoveSelectedDocument.value);
    closeKanbanTaskMoveDialog();
    closeKanbanEditor();
    if (moveResult.blockId) {
      publishTaskChange([moveResult.blockId]);
    }
    scheduleRefreshTasks(120, 'silent-full');
  } catch (error) {
    console.error('[KanbanView] Failed to move task:', error);
    isKanbanTaskMoveSubmitting.value = false;
    await pushMsg(t('kanbanView.moveTaskFailedRetry'), 3000);
  }
}

async function handleKanbanEditorArchiveToggle(): Promise<void> {
  const task = activeKanbanEditTask.value;
  if (!task) {
    return;
  }

  const shouldUnarchive = task.archived === true;
  const blockId = typeof task.blockId === 'string' ? task.blockId.trim() : '';
  const nowIso = new Date().toISOString();

  try {
    if (shouldUnarchive) {
      await TaskRepository.unarchiveTask(task.id);
      const taskIndex = tasks.value.findIndex(item => item.id === task.id);
      if (taskIndex !== -1) {
        const currentTask = tasks.value[taskIndex];
        currentTask.archived = false;
        currentTask.archivedAt = undefined;
        currentTask.archiveReason = undefined;
        currentTask.updatedAt = nowIso;
      }
      invalidateTableFilters();
      if (!blockId) {
        scheduleRefreshTasks(120, 'silent-full');
      }
      return;
    }

    await TaskRepository.archiveTask(task.id, 'manual');
    const taskIndex = tasks.value.findIndex(item => item.id === task.id);
    if (taskIndex !== -1) {
      const currentTask = tasks.value[taskIndex];
      currentTask.archived = true;
      currentTask.archivedAt = nowIso;
      currentTask.archiveReason = 'manual';
      currentTask.updatedAt = nowIso;
    }
    invalidateTableFilters();
    closeKanbanEditor();
    if (!blockId) {
      scheduleRefreshTasks(120, 'silent-full');
    }
  } catch (error) {
    console.error('[KanbanView] Failed to toggle task archive:', error);
    await pushMsg(t('kanbanView.archiveOperationFailedRetry'), 3000);
  }
}

async function handleKanbanEditorDelete(): Promise<void> {
  const task = activeKanbanEditTask.value;
  if (!task) {
    return;
  }

  if (!window.confirm(t('taskManager.confirmDelete'))) {
    return;
  }

  const blockId = typeof task.blockId === 'string' ? task.blockId.trim() : '';

  try {
    await TaskRepository.deleteTask(task.id);
    if (task.id) {
      crdtRepo.deleteTask(task.id, Date.now());
      tasks.value = applyDraggedStatusLocks(crdtRepo.getTasks());
    }
    invalidateTableFilters();
    closeKanbanEditor();
    if (blockId) {
      eventBus.emit(Events.TASK_DELETED, { blockId });
    } else {
      scheduleRefreshTasks(120, 'silent-full');
    }
  } catch (error) {
    console.error('[KanbanView] Failed to delete task:', error);
    await pushMsg(t('kanbanView.deleteTaskFailedRetry'), 3000);
  }
}

function closeKanbanEditor(): void {
  const wasCalendarDockEditor = calendarDockEditorActive.value;
  if (wasCalendarDockEditor) {
    kanbanEditorVisible.value = false;
    calendarDockEditorActive.value = false;
    calendarDockEditorVisible.value = false;
    suppressNextKanbanEditorOutsideMouseDown = false;
    showKanbanTaskMoveDialog.value = false;
    isKanbanTaskMoveSubmitting.value = false;
    return;
  }

  const mountElement = getKanbanEditorMountElement();
  kanbanEditorVisible.value = false;
  calendarDockEditorActive.value = false;
  calendarDockEditorVisible.value = false;
  calendarDockEditorRendered.value = false;
  cleanupKanbanEditorProtyle(mountElement);
  resetKanbanEditorState();
}

function handleKanbanEditorPanelMouseDown(): void {
  suppressNextKanbanEditorOutsideMouseDown = true;
}

function isCalendarTaskEditorSwitchTarget(path: EventTarget[]): boolean {
  if (!calendarDockEditorActive.value || !isCalendarTaskViewMode(currentView.value)) {
    return false;
  }

  return path.some(node =>
    node instanceof HTMLElement
    && (
      node.classList.contains('task-chip')
      || node.classList.contains('day-expanded-chip')
      || node.classList.contains('all-day-task')
      || node.classList.contains('timed-task')
      || node.classList.contains('mobile-task-chip')
    )
  );
}

function handleKanbanEditorOutsideClick(event: MouseEvent): void {
  if (suppressNextKanbanEditorOutsideMouseDown) {
    suppressNextKanbanEditorOutsideMouseDown = false;
    return;
  }
  const target = event.target as Node | null;
  if (!target) return;

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

  const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
  if (isCalendarTaskEditorSwitchTarget(path)) {
    return;
  }
  const isInsidePopover = path.some(node =>
    node instanceof HTMLElement && node.classList.contains('task-filter-popover')
  );
  const isInsideControl = path.some(node =>
    node instanceof HTMLElement && node.classList.contains('task-filter-control')
  );
  const isInsidePriority = path.some(node =>
    node instanceof HTMLElement && node.classList.contains('priority-popover')
  );
  const isInsideDatePopover = path.some(node =>
      node instanceof HTMLElement
      && (
        node.classList.contains('date-popover')
        || node.classList.contains('date-popover-overlay')
        || node.classList.contains('time-popover')
        || node.classList.contains('time-popover-overlay')
        || node.classList.contains('repeat-dialog')
        || node.classList.contains('repeat-dialog-overlay')
        || node.classList.contains('task-reminder-popover')
        || node.classList.contains('task-reminder-popover-overlay')
        || node.classList.contains('status-popover')
      )
  );
  if (isMobileFrontend && isMobileTableSearchExpanded.value) {
    const isInsideTaskSearch = path.some(node =>
      node instanceof HTMLElement
      && (node === tableSearchControlRef.value || node.classList.contains('task-search'))
    );
    if (!isInsideTaskSearch) {
      closeMobileTableSearch();
    }
  }
  if (isInsidePopover || isInsideControl || isInsidePriority || isInsideDatePopover) {
    return;
  }

  if (kanbanFilterPopoverVisible.value) {
    const popoverEl = resolvePopoverElement(kanbanFilterPopoverRef.value);
    if (popoverEl?.contains(target)) {
      return;
    }
    if (kanbanFilterControlRef.value?.contains(target)) {
      return;
    }
  }
  if (tableFilterPopoverVisible.value) {
    const popoverEl = resolvePopoverElement(tableFilterPopoverRef.value);
    if (popoverEl?.contains(target)) {
      return;
    }
    if (tableFilterControlRef.value?.contains(target)) {
      return;
    }
  }
  if (mobileViewSwitcherVisible.value) {
    if (mobileViewSwitcherControlRef.value?.contains(target)) {
      return;
    }
    if (mobileViewSwitcherPopoverRef.value?.contains(target)) {
      return;
    }
    closeMobileViewSwitcher();
  }
  if (documentTabsDropdownVisible.value) {
    if (documentTabsDropdownControlRef.value?.contains(target)) {
      return;
    }
    if (documentTabsDropdownPopoverRef.value?.contains(target)) {
      return;
    }
    closeDocumentTabsDropdown();
  }
  if (documentScopePickerVisible.value) {
    if (documentTabsRef.value?.contains(target) || documentScopePickerRef.value?.contains(target)) {
      return;
    }
    closeDocumentScopePicker();
  }
  if (documentTabContextMenu.value) {
    if (documentTabContextMenuRef.value?.contains(target)) {
      return;
    }
    closeDocumentTabContextMenu();
  }
  if (kanbanBatchMenuVisible.value) {
    if (kanbanBatchMenuRef.value?.contains(target)) {
      return;
    }
    closeKanbanBatchMenu();
  }
  if (taskViewGroupMenuVisible.value) {
    if (taskViewGroupMenuControlRef.value?.contains(target)) {
      return;
    }
    if (taskViewGroupMenuPopoverRef.value?.contains(target)) {
      return;
    }
    closeTaskViewGroupMenu();
  }
  if (calendarDisplayMenuVisible.value) {
    if (calendarDisplayMenuControlRef.value?.contains(target)) {
      return;
    }
    if (calendarDisplayMenuPopoverRef.value?.contains(target)) {
      return;
    }
    closeCalendarDisplayMenu();
  }
  if (kanbanFilterPopoverVisible.value) {
    closeKanbanFilterPopover();
  }
  if (tableFilterPopoverVisible.value) {
    closeTableFilterPopover();
  }

  if (kanbanEditorVisible.value) {
    const panelEl = resolveKanbanEditorPanelElement();
    if (panelEl?.contains(target)) {
      return;
    }
    closeKanbanEditor();
  }

}

function handleKanbanEditorKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return;
  if (mobileViewSwitcherVisible.value) {
    closeMobileViewSwitcher();
    return;
  }
  if (documentTabsDropdownVisible.value) {
    closeDocumentTabsDropdown();
    return;
  }
  if (documentScopePickerVisible.value) {
    closeDocumentScopePicker();
    return;
  }
  if (documentTabContextMenu.value) {
    closeDocumentTabContextMenu();
    return;
  }
  if (kanbanBatchMenuVisible.value) {
    closeKanbanBatchMenu();
    return;
  }
  if (taskViewGroupMenuVisible.value) {
    closeTaskViewGroupMenu();
    return;
  }
  if (calendarDisplayMenuVisible.value) {
    closeCalendarDisplayMenu();
    return;
  }
  if (showKanbanTaskMoveDialog.value) {
    closeKanbanTaskMoveDialog();
    return;
  }
  if (kanbanEditorVisible.value) {
    closeKanbanEditor();
  }
}

function handleKanbanEditorViewportChange(): void {
  updateCompactViewSwitcherMode();
  if (kanbanEditorVisible.value) {
    if (calendarDockEditorActive.value) {
      resolveCalendarDockEditorTarget();
    } else {
      clampKanbanEditorPosition();
    }
  }
  if (kanbanFilterPopoverVisible.value) {
    updateKanbanFilterPopoverPosition();
  }
  if (tableFilterPopoverVisible.value) {
    updateTableFilterPopoverPosition();
  }
  if (documentTabsDropdownVisible.value) {
    updateDocumentTabsDropdownPosition();
  }
  if (documentScopePickerVisible.value) {
    updateDocumentScopePickerPosition();
  }
  if (documentTabContextMenu.value) {
    closeDocumentTabContextMenu();
  }
}

async function focusKanbanEditorBlock(
  blockId: string,
  retries = 20,
  intervalMs = 80
): Promise<boolean> {
  const normalizedBlockId = typeof blockId === 'string' ? blockId.trim() : '';
  const editorMountElement = getKanbanEditorMountElement();
  if (!normalizedBlockId || !kanbanEditorProtyle || !editorMountElement) {
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
      try {
        kanbanEditorProtyle?.focusBlock(target, true);
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

async function resolveKanbanEditorRootId(blockId: string, preferredRootId?: string): Promise<string> {
  const normalizedBlockId = typeof blockId === 'string' ? blockId.trim() : '';
  const normalizedPreferredRootId = typeof preferredRootId === 'string' ? preferredRootId.trim() : '';
  if (!normalizedBlockId) {
    return normalizedPreferredRootId;
  }

  try {
    const rows = await sql(`
      SELECT root_id
      FROM blocks
      WHERE id = '${escapeSqlLiteral(normalizedBlockId)}'
      LIMIT 1
    `) as Array<{ root_id?: string }>;
    const rootId = typeof rows?.[0]?.root_id === 'string' ? rows[0].root_id.trim() : '';
    return rootId || normalizedPreferredRootId;
  } catch {
    return normalizedPreferredRootId;
  }
}

async function resolveKanbanEditorTargetTask(task: Task): Promise<Task | null> {
  if (task.type !== 'block') {
    return null;
  }

  const directBlockId = typeof task.blockId === 'string' ? task.blockId.trim() : '';
  if (task.isVirtual !== true && directBlockId) {
    return task;
  }

  const repeatSeriesId = typeof task.repeatSeriesId === 'string' ? task.repeatSeriesId.trim() : '';
  if (!repeatSeriesId) {
    return directBlockId ? task : null;
  }

  const localTemplateTask = tasks.value.find(item =>
    item.type === 'block'
    && item.isVirtual !== true
    && item.repeatSeriesId === repeatSeriesId
    && typeof item.blockId === 'string'
    && item.blockId.trim().length > 0
  );
  if (localTemplateTask) {
    return localTemplateTask;
  }

  try {
    const repeatSeries = await getRepeatSeriesForTask(task);
    const templateBlockId = typeof repeatSeries?.templateBlockId === 'string'
      ? repeatSeries.templateBlockId.trim()
      : '';
    if (!templateBlockId) {
      return null;
    }

    const cachedTemplateTask = tasks.value.find(item =>
      item.type === 'block'
      && item.isVirtual !== true
      && item.blockId === templateBlockId
    );
    if (cachedTemplateTask) {
      return cachedTemplateTask;
    }

    const fetchedTemplateTask = await TaskRepository.getTaskByBlockId(templateBlockId, true);
    if (
      fetchedTemplateTask
      && fetchedTemplateTask.type === 'block'
      && typeof fetchedTemplateTask.blockId === 'string'
      && fetchedTemplateTask.blockId.trim().length > 0
    ) {
      return fetchedTemplateTask;
    }
  } catch (error) {
    console.warn('[KanbanView] Failed to parse repeat template:', error);
  }

  return null;
}

async function openKanbanEditor(
  task: Task,
  event: MouseEvent,
  options: { calendarDock?: boolean } = {}
): Promise<void> {
  const shouldUseCalendarDock = options.calendarDock === true;
  const targetTask = await resolveKanbanEditorTargetTask(task);
  const blockId = typeof targetTask?.blockId === 'string' ? targetTask.blockId.trim() : '';
  if (!targetTask || targetTask.type !== 'block' || !blockId) {
    const message = task.isVirtual ? t('kanbanView.repeatTemplateMissing') : t('kanbanView.taskCannotEdit');
    await pushMsg(message, 2000);
    return;
  }
  if (openingKanbanEditorBlockIds.has(blockId)) {
    return;
  }
  if (
    shouldUseCalendarDock
    && kanbanEditorVisible.value
    && calendarDockEditorActive.value
    && kanbanEditorTaskId.value === targetTask.id
    && kanbanEditorProtyle
  ) {
    resolveCalendarDockEditorTarget();
    return;
  }
  await ensureTaskGroupsLoaded();
  const shouldMountCalendarDockEditor = shouldUseCalendarDock && !calendarDockEditorRendered.value;
  calendarDockEditorActive.value = shouldUseCalendarDock;
  if (shouldUseCalendarDock) {
    resolveCalendarDockEditorTarget();
    calendarDockEditorRendered.value = true;
    if (shouldMountCalendarDockEditor) {
      calendarDockEditorVisible.value = false;
    }
  } else {
    calendarDockEditorVisible.value = false;
    calendarDockEditorRendered.value = false;
  }
  kanbanEditorTaskId.value = targetTask.id;
  const normalizedReminder = normalizeTaskReminderSelection(targetTask);
  const normalizedDateFields = normalizeKanbanEditorDateFields({
    startDate: typeof targetTask.startDate === 'string' ? targetTask.startDate : '',
    startTime: typeof targetTask.startTime === 'string' ? targetTask.startTime : '',
    dueDate: typeof targetTask.dueDate === 'string' ? targetTask.dueDate : '',
    dueTime: typeof targetTask.dueTime === 'string' ? targetTask.dueTime : ''
  });
  const tagState = buildTaskTagState(targetTask.tags, targetTask.groupId);
  kanbanEditorDraft.value = {
    taskId: targetTask.id,
    status: targetTask.status || 'pending',
    startDate: normalizedDateFields.startDate,
    startTime: normalizedDateFields.startTime,
    dueDate: normalizedDateFields.dueDate,
    dueTime: normalizedDateFields.dueTime,
    description: typeof targetTask.description === 'string' ? targetTask.description : '',
    reminderType: normalizedReminder.reminderType,
    reminderCustomTime: normalizedReminder.reminderCustomTime,
    tags: tagState.tagIds,
    groupId: tagState.primaryTagId,
    priority: targetTask.priority || 'none'
  };
  syncKanbanEditorRepeatState(targetTask);
  kanbanEditorQuickPanel.value = null;
  openingKanbanEditorBlockIds.add(blockId);
  if (!shouldUseCalendarDock) {
    setKanbanEditorPositionFromEvent(event);
  }
  kanbanEditorVisible.value = true;
  await nextTick();
  if (shouldUseCalendarDock) {
    resolveCalendarDockEditorTarget();
    if (!calendarDockEditorVisible.value) {
      calendarDockEditorVisible.value = true;
      await nextTick();
    }
    await nextTick();
  } else {
    clampKanbanEditorPosition();
  }

  const plugin = usePlugin();
  const mountElement = getKanbanEditorMountElement();
  if (!plugin?.app || !mountElement) {
    openingKanbanEditorBlockIds.delete(blockId);
    closeKanbanEditor();
    await pushMsg(t('kanbanView.editorInitFailed'), 2000);
    return;
  }

  if (kanbanEditorProtyle) {
    try {
      kanbanEditorProtyle.destroy();
    } catch {
    }
    kanbanEditorProtyle = null;
  }
  mountElement.innerHTML = '';

  try {
    const options: Record<string, any> = {
      blockId,
      action: shouldUseCalendarDock ? [] : ['cb-get-focus'],
      mode: 'wysiwyg',
      render: {
        title: false,
        breadcrumb: false,
        gutter: false,
        scroll: false
      }
    };
    const rootId = await resolveKanbanEditorRootId(blockId, targetTask.rootId);
    if (rootId) {
      options.rootId = rootId;
    }
    kanbanEditorProtyle = new Protyle(plugin.app, mountElement, options);
    if (!shouldUseCalendarDock) {
      await focusKanbanEditorBlock(blockId);
    }
    if (shouldUseCalendarDock) {
      resolveCalendarDockEditorTarget();
    } else {
      clampKanbanEditorPosition();
    }
  } catch {
    kanbanEditorProtyle = null;
    closeKanbanEditor();
    await pushMsg(t('kanbanView.editorOpenFailed'), 2000);
  } finally {
    openingKanbanEditorBlockIds.delete(blockId);
  }
}

async function handleTaskEditClick(task: Task): Promise<void> {
  await openKanbanTaskContent(task);
}

async function handleKanbanEditorUrgentToggle(): Promise<void> {
  const task = activeKanbanEditTask.value;
  if (!task) return;
  const nextUrgent = !isActiveKanbanTaskUrgent.value;
  await applyBlockTaskFieldUpdate(
    task,
    { 'custom-task-urgent': nextUrgent ? 'true' : '' },
    'urgent',
    nextUrgent,
    'Failed to update task urgency'
  );
  invalidateTableFilters();
}

async function openKanbanTaskContent(task: Task, position?: 'right' | 'bottom'): Promise<void> {
  const targetTask = await resolveKanbanEditorTargetTask(task);
  const blockId = typeof targetTask?.blockId === 'string' ? targetTask.blockId.trim() : '';
  if (targetTask?.type === 'block' && blockId) {
    await openBlockById(blockId, { position });
  }
}

function applyExternalTaskDateChange(updatedTask: Task): void {
  if (!updatedTask?.id && !updatedTask?.blockId) {
    return;
  }

  const existingTask = tasks.value.find(task => task.id === updatedTask.id)
    || (updatedTask.blockId ? tasks.value.find(task => task.blockId === updatedTask.blockId) : null);
  const taskId = existingTask?.id || updatedTask.id;
  if (!taskId) {
    return;
  }
  const previousRepeatSeriesId = typeof existingTask?.repeatSeriesId === 'string'
    ? existingTask.repeatSeriesId.trim()
    : '';
  const hasOwn = (key: keyof Task) => Object.prototype.hasOwnProperty.call(updatedTask, key);
  const nextStartDate = hasOwn('startDate') ? (updatedTask.startDate || '') : (existingTask?.startDate || '');
  const nextDueDate = hasOwn('dueDate') ? (updatedTask.dueDate || '') : (existingTask?.dueDate || '');
  const nextStartTime = hasOwn('startTime') ? (updatedTask.startTime || '') : (existingTask?.startTime || '');
  const nextDueTime = hasOwn('dueTime') ? (updatedTask.dueTime || '') : (existingTask?.dueTime || '');
  const nextTask: Task = {
    ...(existingTask || updatedTask),
    id: taskId,
    blockId: existingTask?.blockId || updatedTask.blockId,
    startDate: nextStartDate,
    dueDate: nextDueDate,
    startTime: nextStartTime,
    dueTime: nextDueTime,
    updatedAt: updatedTask.updatedAt || new Date().toISOString()
  };

  if (hasOwn('repeatFrequency')) {
    nextTask.repeatFrequency = updatedTask.repeatFrequency;
  }
  if (hasOwn('repeatSeriesId')) {
    nextTask.repeatSeriesId = updatedTask.repeatSeriesId;
  }
  if (hasOwn('repeatInstanceDate')) {
    nextTask.repeatInstanceDate = updatedTask.repeatInstanceDate;
  }
  if (hasOwn('isVirtual')) {
    nextTask.isVirtual = updatedTask.isVirtual;
  }

  if (updatedTask.backgroundColor !== undefined) {
    nextTask.backgroundColor = updatedTask.backgroundColor;
  }

  if (hasOwn('startDate')) rememberLocalTaskFieldOverride(taskId, 'startDate', nextStartDate);
  if (hasOwn('dueDate')) rememberLocalTaskFieldOverride(taskId, 'dueDate', nextDueDate);
  if (hasOwn('startTime')) rememberLocalTaskFieldOverride(taskId, 'startTime', nextStartTime);
  if (hasOwn('dueTime')) rememberLocalTaskFieldOverride(taskId, 'dueTime', nextDueTime);
  if (hasOwn('repeatFrequency')) rememberLocalTaskFieldOverride(taskId, 'repeatFrequency', nextTask.repeatFrequency);
  if (hasOwn('repeatSeriesId')) rememberLocalTaskFieldOverride(taskId, 'repeatSeriesId', nextTask.repeatSeriesId);
  if (hasOwn('repeatInstanceDate')) rememberLocalTaskFieldOverride(taskId, 'repeatInstanceDate', nextTask.repeatInstanceDate);
  if (hasOwn('isVirtual')) rememberLocalTaskFieldOverride(taskId, 'isVirtual', nextTask.isVirtual);

  if (existingTask) {
    const ts = Date.now();
    crdtRepo.updateTaskField(taskId, 'startDate', nextStartDate, ts);
    crdtRepo.updateTaskField(taskId, 'dueDate', nextDueDate, ts);
    crdtRepo.updateTaskField(taskId, 'startTime', nextStartTime, ts);
    crdtRepo.updateTaskField(taskId, 'dueTime', nextDueTime, ts);
    if (updatedTask.backgroundColor !== undefined) {
      crdtRepo.updateTaskField(taskId, 'backgroundColor', updatedTask.backgroundColor, ts);
    }
    if (hasOwn('repeatFrequency') || hasOwn('repeatSeriesId') || hasOwn('repeatInstanceDate') || hasOwn('isVirtual')) {
      crdtRepo.syncIncrementalTasks([nextTask]);
    }
    updateTasks();
    tasks.value = applyDraggedStatusLocks(tasks.value);
  } else {
    crdtRepo.syncIncrementalTasks([nextTask]);
    tasks.value = applyDraggedStatusLocks(crdtRepo.getTasks());
  }

  if (updatedTask.repeatFrequency === 'none' && previousRepeatSeriesId) {
    rememberLocalRepeatSeriesClear(previousRepeatSeriesId);
    removeVirtualRepeatTasksLocally(previousRepeatSeriesId);
  }

  if (isActiveKanbanEditorDateChangeTarget(taskId, nextTask, updatedTask, existingTask || null)) {
    syncActiveKanbanEditorDraftDateFields(nextTask);
    if (calendarDockEditorActive.value && !nextStartDate && !nextDueDate) {
      closeKanbanEditor();
    }
  }

  const blockId = typeof nextTask.blockId === 'string' ? nextTask.blockId.trim() : '';
  if (blockId) {
    queueIncrementalUpdates([blockId], { allowUnknown: true }, 80);
  }
  scheduleKernelTaskIndexRefresh(260);
  invalidateTableFilters();
  nextTick(() => {
    scheduleAllKanbanMetricsUpdates();
    scheduleListViewMetricsUpdate();
  });
}

function collectKanbanTaskDateIdentity(task: Partial<Task> | null | undefined): {
  taskIds: Set<string>;
  blockIds: Set<string>;
  repeatSeriesId: string;
} {
  const taskIds = new Set<string>();
  const blockIds = new Set<string>();
  const addTaskId = (value: unknown): void => {
    const normalizedValue = normalizeKanbanTaskIdentity(value);
    if (normalizedValue) {
      taskIds.add(normalizedValue);
    }
  };
  const addBlockId = (value: unknown): void => {
    const normalizedValue = normalizeKanbanTaskIdentity(value);
    if (normalizedValue) {
      blockIds.add(normalizedValue);
    }
  };

  addTaskId(task?.id);
  addTaskId(task?.taskId);
  addBlockId(task?.blockId);
  addBlockId(task?.sourceBlockId);

  return {
    taskIds,
    blockIds,
    repeatSeriesId: normalizeKanbanTaskIdentity(task?.repeatSeriesId)
  };
}

function areKanbanTaskDateIdentitiesRelated(
  left: Partial<Task> | null | undefined,
  right: Partial<Task> | null | undefined
): boolean {
  if (!left || !right) {
    return false;
  }
  const leftIdentity = collectKanbanTaskDateIdentity(left);
  const rightIdentity = collectKanbanTaskDateIdentity(right);
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
  return !!leftIdentity.repeatSeriesId
    && leftIdentity.repeatSeriesId === rightIdentity.repeatSeriesId;
}

function isActiveKanbanEditorDateChangeTarget(
  taskId: string,
  nextTask: Task,
  updatedTask: Task,
  existingTask: Task | null
): boolean {
  const draft = kanbanEditorDraft.value;
  if (!draft) {
    return false;
  }
  if (draft.taskId === taskId) {
    return true;
  }

  const activeTask = activeKanbanEditTask.value
    || tasks.value.find(task => task.id === draft.taskId)
    || null;
  if (!activeTask) {
    return false;
  }

  return [nextTask, updatedTask, existingTask].some(task =>
    areKanbanTaskDateIdentitiesRelated(activeTask, task)
  );
}

function syncActiveKanbanEditorDraftDateFields(task: Task): void {
  const draft = kanbanEditorDraft.value;
  if (!draft) {
    return;
  }
  draft.startDate = task.startDate || '';
  draft.startTime = task.startTime || '';
  draft.dueDate = task.dueDate || '';
  draft.dueTime = task.dueTime || '';
}

function applyKanbanEditorTaskDateChange(updatedTask: Task): void {
  applyExternalTaskDateChange(updatedTask);
  eventBus.emit(Events.TASK_DATE_CHANGED, updatedTask);
}

function removeVirtualRepeatTasksLocally(seriesId: string): void {
  const normalizedSeriesId = typeof seriesId === 'string' ? seriesId.trim() : '';
  if (!normalizedSeriesId) {
    return;
  }
  const nextTasks = tasks.value.filter(task =>
    !(task.isVirtual === true && task.repeatSeriesId === normalizedSeriesId)
  );
  if (nextTasks.length === tasks.value.length) {
    return;
  }
  crdtRepo.syncFromSQLTasks(nextTasks);
  tasks.value = applyDraggedStatusLocks(crdtRepo.getTasks());
}

function handleTaskDateChanged(updatedTask: Task) {
  const task = tasks.value.find(t => t.id === updatedTask.id);
  if (!task) return;
  let repeatMetadataChanged = false;
  const previousRepeatSeriesId = typeof task.repeatSeriesId === 'string'
    ? task.repeatSeriesId.trim()
    : '';
  
  if (updatedTask.startDate !== task.startDate) {
    crdtRepo.updateTaskField(task.id, 'startDate', updatedTask.startDate);
    task.startDate = updatedTask.startDate;
  }
  
  if (updatedTask.dueDate !== task.dueDate) {
    crdtRepo.updateTaskField(task.id, 'dueDate', updatedTask.dueDate);
    task.dueDate = updatedTask.dueDate;
  }
  
  if (updatedTask.startTime !== task.startTime) {
    crdtRepo.updateTaskField(task.id, 'startTime', updatedTask.startTime);
    task.startTime = updatedTask.startTime;
  }
  
  if (updatedTask.dueTime !== task.dueTime) {
    crdtRepo.updateTaskField(task.id, 'dueTime', updatedTask.dueTime);
    task.dueTime = updatedTask.dueTime;
  }

  if (updatedTask.repeatFrequency !== undefined && updatedTask.repeatFrequency !== task.repeatFrequency) {
    task.repeatFrequency = updatedTask.repeatFrequency;
    repeatMetadataChanged = true;
  }

  if (updatedTask.repeatSeriesId !== task.repeatSeriesId) {
    task.repeatSeriesId = updatedTask.repeatSeriesId;
    repeatMetadataChanged = true;
  }

  if (updatedTask.repeatInstanceDate !== task.repeatInstanceDate) {
    task.repeatInstanceDate = updatedTask.repeatInstanceDate;
    repeatMetadataChanged = true;
  }

  if (updatedTask.isVirtual !== undefined && updatedTask.isVirtual !== task.isVirtual) {
    task.isVirtual = updatedTask.isVirtual;
    repeatMetadataChanged = true;
  }

  if (updatedTask.backgroundColor !== undefined && updatedTask.backgroundColor !== task.backgroundColor) {
    crdtRepo.updateTaskField(task.id, 'backgroundColor', updatedTask.backgroundColor);
    task.backgroundColor = updatedTask.backgroundColor;
  }

  if (repeatMetadataChanged) {
    task.updatedAt = updatedTask.updatedAt || new Date().toISOString();
    crdtRepo.syncIncrementalTasks([task]);
  }
  
  updateTasks();
  if (updatedTask.repeatFrequency === 'none' && previousRepeatSeriesId) {
    removeVirtualRepeatTasksLocally(previousRepeatSeriesId);
  }
  scheduleKernelTaskIndexRefresh();
  eventBus.emit(Events.TASK_DATE_CHANGED, updatedTask);
}

function handleGanttTaskColorChanged(updatedTask: Task): void {
  if (!updatedTask) return;
  const color = typeof updatedTask.backgroundColor === 'string'
    ? updatedTask.backgroundColor
    : undefined;
  const seriesId = typeof updatedTask.repeatSeriesId === 'string'
    ? updatedTask.repeatSeriesId.trim()
    : '';
  const targetTask = tasks.value.find(task => task.id === updatedTask.id)
    || (updatedTask.blockId ? tasks.value.find(task => task.blockId === updatedTask.blockId) : null);
  const targetIds = seriesId
    ? tasks.value
      .filter(task => task.repeatSeriesId === seriesId)
      .map(task => task.id)
    : (targetTask?.id ? [targetTask.id] : []);

  if (targetIds.length === 0) return;

  const ts = Date.now();
  targetIds.forEach((taskId) => {
    crdtRepo.updateTaskField(taskId, 'backgroundColor', color, ts);
  });
  updateTasks();
  scheduleKernelTaskIndexRefresh();
}

async function handleGanttTaskDateChanged(updatedTask: Task) {
  try {
    const isRepeatTask = isRepeatTaskEntity(updatedTask);
    if (isRepeatTask) {
      const nextStartDate = updatedTask.startDate || null;
      let nextDueDate = updatedTask.dueDate || null;
      const nextStartTime = updatedTask.startTime || null;
      const nextDueTime = updatedTask.dueTime || null;
      if (nextStartDate && nextDueDate && nextDueDate < nextStartDate) {
        nextDueDate = nextStartDate;
      }

      const updatedSeries = await updateRepeatSeriesDates(
        updatedTask,
        nextStartDate,
        nextDueDate,
        {
          startTime: nextStartTime,
          dueTime: nextDueTime
        },
        { emitChange: false }
      );

      if (updatedSeries) {
        const templateTask = await resolveKanbanEditorTargetTask(updatedTask);
        const templateUpdate = templateTask
          ? {
            ...templateTask,
            startDate: updatedSeries.startDate || '',
            startTime: updatedSeries.startTime || undefined,
            dueDate: updatedSeries.endDate || '',
            dueTime: updatedSeries.dueTime || undefined
          }
          : null;

        if (templateUpdate) {
          await TaskRepository.updateTask(templateUpdate.id, {
            startDate: templateUpdate.startDate,
            startTime: templateUpdate.startTime,
            dueDate: templateUpdate.dueDate,
            dueTime: templateUpdate.dueTime
          });
          handleTaskDateChanged(templateUpdate);
        }

        notifyRepeatChanged({
          blockId: templateTask?.blockId || updatedSeries.templateBlockId,
          seriesId: updatedSeries.id,
          frequency: updatedSeries.frequency
        });
        return;
      }
    }

    await TaskRepository.updateTask(updatedTask.id, {
      startDate: updatedTask.startDate || '',
      startTime: updatedTask.startTime || undefined,
      dueDate: updatedTask.dueDate || '',
      dueTime: updatedTask.dueTime || undefined
    });
    handleTaskDateChanged(updatedTask);
  } catch (error) {
    console.error('[GanttView] failed to update task dates', error);
    pushMsg('Failed to update task dates');
  }
}

function normalizeDocPath(notebookName: string, hPath: string): string {
  const prefix = `${notebookName}/`;
  if (hPath.startsWith(prefix)) {
    return hPath.slice(prefix.length);
  }
  return hPath;
}

function getCurrentSidebarFilterSelection(): { sourceValue: string; documentId: string } {
  switch (currentView.value) {
    case 'kanban':
    case 'quadrant':
      return {
        sourceValue: kanbanFilterType.value,
        documentId: kanbanFilterDocument.value
      };
    case 'list':
      return {
        sourceValue: listFilterType.value,
        documentId: listFilterDocument.value
      };
    case 'table':
    case 'archive-table':
    case 'stats':
      return {
        sourceValue: tableFilterType.value,
        documentId: tableFilterDocument.value
      };
    case 'month':
      return {
        sourceValue: monthFilterType.value,
        documentId: monthFilterDocument.value
      };
    case 'three-day':
    case 'day':
      return {
        sourceValue: dayFilterType.value,
        documentId: dayFilterDocument.value
      };
    case 'week':
    default:
      return {
        sourceValue: weekFilterType.value,
        documentId: weekFilterDocument.value
      };
  }
}

function taskModalTranslate(key: string): string {
  return t(key);
}

async function ensureInboxDocument(notebookId: string): Promise<string> {
  try {
    const existingIds = await getIDsByHPath(notebookId, PINCH_INBOX_PATH);
    if (existingIds && existingIds.length > 0) {
      return PINCH_INBOX_PATH;
    }
  } catch {
    // Fallback to create when read-by-path fails.
  }

  await createDocWithMd(notebookId, PINCH_INBOX_PATH, '');
  return PINCH_INBOX_PATH;
}

function extractDailyNoteId(result: Awaited<ReturnType<typeof createDailyNote>>): string {
  if (typeof result === 'string') {
    return result;
  }
  if (result && typeof result === 'object') {
    return result.id || result.rootId || '';
  }
  return '';
}

function normalizeNotebookDocPathForCreate(notebookId: string, hPath: string): string {
  const notebook = notebooks.value.find(nb => nb.id === notebookId);
  const normalizedHPath = hPath.startsWith('/') ? hPath : `/${hPath}`;
  if (!notebook?.name) {
    return normalizedHPath;
  }
  const notebookPrefix = `/${notebook.name}/`;
  if (normalizedHPath.startsWith(notebookPrefix)) {
    return `/${normalizedHPath.slice(notebookPrefix.length)}`;
  }
  return normalizedHPath;
}

async function ensureDailyNoteDocument(notebookId: string): Promise<string> {
  const result = await createDailyNote(notebookId);
  if (result && typeof result === 'object') {
    const directPath = typeof result.path === 'string' && result.path.trim()
      ? result.path.trim()
      : typeof result.hPath === 'string' && result.hPath.trim()
        ? result.hPath.trim()
        : '';
    if (directPath) {
      return normalizeNotebookDocPathForCreate(notebookId, directPath);
    }
  }
  const dailyNoteId = extractDailyNoteId(result);
  if (!dailyNoteId) {
    throw new Error('Failed to create daily note');
  }
  const hPath = await getHPathByID(dailyNoteId);
  if (!hPath) {
    throw new Error('Failed to resolve daily note path');
  }
  return normalizeNotebookDocPathForCreate(notebookId, hPath);
}

async function handleTaskModalCreate(
  taskData: TaskModalCreateTaskPayload,
  notebookId: string,
  documentId: string
): Promise<void> {
  try {
    let docPath = '';
    if (documentId === PINCH_DAILY_NOTE_OPTION_ID) {
      docPath = await ensureDailyNoteDocument(notebookId);
    } else if (documentId && documentId !== PINCH_INBOX_OPTION_ID) {
      const target = resolveCreateTarget(notebookId, documentId);
      docPath = target?.docPath || '';
    }
    if (!docPath) {
      docPath = await ensureInboxDocument(notebookId);
    }

    const tagState = buildTaskTagState(taskData.tags, taskData.groupId);
    const normalizedGroupId = tagState.primaryTagId;
    const created = await TaskRepository.createBlockTask({
      title: taskData.title,
      description: taskData.description || '',
      priority: taskData.priority || 'none',
      status: taskData.status || 'pending',
      dueDate: taskData.dueDate || undefined,
      reminderType: taskData.reminderType,
      reminderCustomTime: taskData.reminderCustomTime || undefined,
      tags: tagState.tagIds,
      groupId: normalizedGroupId || undefined
    }, notebookId, docPath);

    const selectedGoalIds = Array.isArray(taskData.goalIds)
      ? taskData.goalIds
        .map(goalId => typeof goalId === 'string' ? goalId.trim() : '')
        .filter(goalId => goalId && goalDefinitionsById.value.has(goalId))
      : [];
    if (selectedGoalIds.length > 0 && created?.taskId) {
      const createdRootId = documentId
        && documentId !== PINCH_DAILY_NOTE_OPTION_ID
        && documentId !== PINCH_INBOX_OPTION_ID
        ? documentId
        : undefined;
      const nextGoals = setTaskGoalMembership(goalDefinitions.value, {
        taskId: created.taskId,
        blockId: created.blockId,
        notebookId,
        rootId: createdRootId,
        title: taskData.title
      }, selectedGoalIds);
      goalDefinitions.value = nextGoals;
      await saveGoalDefinitions(nextGoals);
    }

    taskModalDefaultNotebook.value = notebookId;
    taskModalDefaultDocument.value = documentId;
    taskModalDefaultGroupId.value = normalizedGroupId;
    await updateSettings('taskManager', {
      lastTaskNotebook: notebookId,
      lastTaskDocument: documentId,
      selectedGroupId: normalizedGroupId
    });
    showTaskModal.value = false;

    if (created?.blockId) {
      const createdBlockId = created.blockId;
      await incrementalUpdateTasks([createdBlockId], { allowUnknown: true });
      if (!tasks.value.some(task => task.blockId === createdBlockId)) {
        queueIncrementalUpdates([createdBlockId], { allowUnknown: true }, 120);
        window.setTimeout(() => {
          if (!tasks.value.some(task => task.blockId === createdBlockId)) {
            scheduleRefreshTasks(180, 'silent-full');
          }
        }, 420);
      }
    } else {
      scheduleRefreshTasks(180, 'silent-full');
    }
  } catch (error) {
    console.error('[KanbanView] Failed to create task via modal:', error);
    await pushMsg(t('kanbanView.createTaskFailedRetry'), 3000);
  }
}

function resolveCreateTarget(notebookId: string, documentId: string): { notebookId: string; documentId: string; docPath: string } | null {
  if (notebookId === 'all' || documentId === 'all') {
    return null;
  }

  const notebook = notebooks.value.find(nb => nb.id === notebookId);
  if (!notebook) return null;

  const taskInDoc = tasks.value.find(
    t => t.type === 'block' && t.notebookId === notebookId && t.rootId === documentId && !!t.hPath
  );
  if (!taskInDoc?.hPath) return null;

  return {
    notebookId,
    documentId,
    docPath: normalizeDocPath(notebook.name, taskInDoc.hPath)
  };
}

function normalizeQuickCreateHeadingTitle(rawTitle: string): string {
  return rawTitle
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^#+\s*/, '')
    .trim();
}

function extractCreatedBlockIdFromOperations(result: unknown): string {
  if (!Array.isArray(result) || result.length === 0) {
    return '';
  }
  const firstItem = result[0] as { doOperations?: unknown };
  const operations = Array.isArray(firstItem?.doOperations)
    ? firstItem.doOperations as Array<Record<string, unknown>>
    : [];
  for (const operation of operations) {
    const id = typeof operation.id === 'string' ? operation.id.trim() : '';
    const objectType = typeof operation.objectType === 'string' ? operation.objectType : '';
    const type = typeof operation.type === 'string' ? operation.type : '';
    if (!id) {
      continue;
    }
    if (objectType === 'NodeHeading' || type === 'h') {
      return id;
    }
  }
  for (const operation of operations) {
    const id = typeof operation.id === 'string' ? operation.id.trim() : '';
    if (id) {
      return id;
    }
  }
  return '';
}

async function createQuickCreateHeading(rootId: string, headingTitle: string): Promise<string> {
  const headingMarkdown = `## ${headingTitle}`;
  const result = await appendBlock('markdown', headingMarkdown, rootId);
  return extractCreatedBlockIdFromOperations(result);
}

interface BlockTypeMeta {
  id: string;
  parentId: string;
  type: string;
  subtype: string;
}

interface TaskListInsertMeta {
  listId: string;
  listItemId: string;
}

interface EnsuredTaskHeadingDropTarget {
  parentId: string;
  previousId?: string;
  placeholderTaskItemId?: string;
}

function isTaskListBlockMeta(meta: BlockTypeMeta | null | undefined): boolean {
  if (!meta) {
    return false;
  }
  return meta.type === 'l' && meta.subtype.trim().toLowerCase() === 't';
}

async function queryBlockTypeMeta(blockId: string): Promise<BlockTypeMeta | null> {
  const normalizedBlockId = typeof blockId === 'string' ? blockId.trim() : '';
  if (!normalizedBlockId) {
    return null;
  }
  try {
    const rows = await sql(`
      SELECT id, parent_id, type, subtype
      FROM blocks
      WHERE id = '${escapeSqlLiteral(normalizedBlockId)}'
      LIMIT 1
    `) as Array<{ id?: string; parent_id?: string; type?: string; subtype?: string }>;
    const row = rows?.[0];
    if (!row?.id) {
      return null;
    }
    return {
      id: typeof row.id === 'string' ? row.id : '',
      parentId: typeof row.parent_id === 'string' ? row.parent_id : '',
      type: typeof row.type === 'string' ? row.type : '',
      subtype: typeof row.subtype === 'string' ? row.subtype : ''
    };
  } catch {
    return null;
  }
}

function extractTaskListInsertMeta(result: unknown): TaskListInsertMeta {
  const meta: TaskListInsertMeta = { listId: '', listItemId: '' };
  if (!Array.isArray(result) || result.length === 0) {
    return meta;
  }

  const firstItem = result[0] as { doOperations?: unknown };
  const operations = Array.isArray(firstItem?.doOperations)
    ? firstItem.doOperations as Array<Record<string, unknown>>
    : [];

  const updateMetaFromDataHtml = (rawData: string): void => {
    if (!rawData) {
      return;
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawData, 'text/html');
    if (!meta.listId) {
      const listEl = doc.querySelector('[data-type="NodeList"][data-subtype="t"]');
      const listId = listEl?.getAttribute('data-node-id') || '';
      if (listId) {
        meta.listId = listId;
      }
    }
    if (!meta.listItemId) {
      const itemEl = doc.querySelector('[data-type="NodeListItem"][data-subtype="t"]');
      const itemId = itemEl?.getAttribute('data-node-id') || '';
      if (itemId) {
        meta.listItemId = itemId;
      }
    }
  };

  for (const operation of operations) {
    const id = typeof operation.id === 'string' ? operation.id.trim() : '';
    const objectType = typeof operation.objectType === 'string' ? operation.objectType : '';
    if (id && objectType === 'NodeList' && !meta.listId) {
      meta.listId = id;
    }
    if (id && objectType === 'NodeListItem' && !meta.listItemId) {
      meta.listItemId = id;
    }
    const rawData = typeof operation.data === 'string' ? operation.data : '';
    if (rawData) {
      updateMetaFromDataHtml(rawData);
    }
  }

  return meta;
}

async function resolveParentTaskListIdFromTaskItem(listItemId: string): Promise<string> {
  const listItemMeta = await queryBlockTypeMeta(listItemId);
  if (!listItemMeta?.parentId) {
    return '';
  }
  const parentMeta = await queryBlockTypeMeta(listItemMeta.parentId);
  return isTaskListBlockMeta(parentMeta) ? parentMeta!.id : '';
}

async function ensureTaskListDropTarget(
  dropTarget: TaskHeadingDropTarget
): Promise<EnsuredTaskHeadingDropTarget> {
  const parentMeta = await queryBlockTypeMeta(dropTarget.parentId);
  if (isTaskListBlockMeta(parentMeta)) {
    return {
      parentId: parentMeta!.id,
      previousId: dropTarget.previousId
    };
  }

  const placeholderInsertResult = await insertBlock(
    'markdown',
    '- [ ] ',
    undefined,
    dropTarget.previousId,
    dropTarget.parentId
  );
  const insertMeta = extractTaskListInsertMeta(placeholderInsertResult);
  let taskListId = insertMeta.listId;
  if (!taskListId && insertMeta.listItemId) {
    taskListId = await resolveParentTaskListIdFromTaskItem(insertMeta.listItemId);
  }
  if (!taskListId) {
    const refreshedParentMeta = await queryBlockTypeMeta(dropTarget.parentId);
    if (isTaskListBlockMeta(refreshedParentMeta)) {
      taskListId = refreshedParentMeta!.id;
    }
  }
  if (!taskListId) {
    if (insertMeta.listItemId) {
      await deleteBlock(insertMeta.listItemId).catch(() => undefined);
    }
    throw new Error('Failed to create task list container for heading');
  }

  return {
    parentId: taskListId,
    previousId: insertMeta.listItemId || undefined,
    placeholderTaskItemId: insertMeta.listItemId || undefined
  };
}

async function moveTaskBlockToHeadingMeta(blockId: string, headingMeta: TaskHeadingGroupMeta): Promise<void> {
  const dropTarget = await resolveTaskHeadingDropTarget(headingMeta);
  if (!dropTarget) {
    throw new Error('Failed to resolve target heading position');
  }

  let moveParentId = dropTarget.parentId;
  let movePreviousId = dropTarget.previousId;
  let placeholderTaskItemId = '';
  const parentMeta = await queryBlockTypeMeta(dropTarget.parentId);

  if (!isTaskListBlockMeta(parentMeta)) {
    const ensuredTarget = await ensureTaskListDropTarget(dropTarget);
    moveParentId = ensuredTarget.parentId;
    movePreviousId = ensuredTarget.previousId;
    placeholderTaskItemId = ensuredTarget.placeholderTaskItemId || '';
  }

  try {
    await moveBlock(blockId, movePreviousId, moveParentId);
  } finally {
    if (placeholderTaskItemId) {
      await deleteBlock(placeholderTaskItemId).catch(() => undefined);
    }
  }
}

async function handleTaskCreateRequested(payload: CreateTaskPayload, options: OpenQuickCreateOptions = {}) {
  const sidebarSelection = getCurrentSidebarFilterSelection();
  const sidebarSource = parseDocumentSource(sidebarSelection.sourceValue);
  const sidebarSourceDocuments = getDocumentEntriesBySource(sidebarSelection.sourceValue);
  const lastTaskTarget = options.preferLastTaskTarget ? resolveLastTaskCreateTarget() : null;
  const preferredSidebarDocument =
    sidebarSourceDocuments.find(doc => doc.id === sidebarSelection.documentId)
    || sidebarSourceDocuments[0];
  const preferredNotebookId = lastTaskTarget?.notebookId
    || options.preferredNotebookId
    || ((sidebarSource.kind === 'group' || sidebarSource.kind === 'goal')
      ? preferredSidebarDocument?.notebookId || 'all'
      : sidebarSource.kind === 'notebook'
        ? sidebarSource.id
        : 'all');
  quickCreateNotebookId.value = notebookOptions.value.some(option => option.value === preferredNotebookId)
    ? preferredNotebookId
    : 'all';

  const preferredDocumentId = lastTaskTarget?.documentId
    || options.preferredDocumentId
    || ((sidebarSource.kind === 'group' || sidebarSource.kind === 'goal')
      ? preferredSidebarDocument?.id || 'all'
      : sidebarSelection.documentId);
  quickCreateDocumentId.value = preferredDocumentId;
  if (!quickCreateDocumentOptions.value.some(opt => opt.value === quickCreateDocumentId.value)) {
    quickCreateDocumentId.value = 'all';
  }

  if (options.context?.fixedTarget) {
    quickCreateNotebookId.value = options.context.fixedTarget.notebookId;
    quickCreateDocumentId.value = options.context.fixedTarget.documentId;
  }
  if (!quickCreateDocumentOptions.value.some(opt => opt.value === quickCreateDocumentId.value)) {
    quickCreateDocumentId.value = 'all';
  }

  const mode = options.mode === 'heading-task' ? 'heading-task' : 'task';
  quickCreateDialog.value = {
    show: true,
    mode,
    headingTitle: '',
    title: mode === 'heading-task' ? '' : t('taskManager.newTask'),
    payload,
    context: options.context || null
  };
  await nextTick();
  if (mode === 'heading-task') {
    quickCreateHeadingInputRef.value?.focus();
    quickCreateHeadingInputRef.value?.select();
    return;
  }
  quickCreateInputRef.value?.focus();
  quickCreateInputRef.value?.select();
}

function handleCalendarTaskCreateRequested(payload: CreateTaskPayload): Promise<void> {
  return handleTaskCreateRequested(payload, { preferLastTaskTarget: true });
}

function resolveLastTaskCreateTarget(): Pick<QuickCreateTarget, 'notebookId' | 'documentId'> | null {
  const notebookId = typeof userSettings.taskManager.lastTaskNotebook === 'string'
    ? userSettings.taskManager.lastTaskNotebook.trim()
    : '';
  const documentId = typeof userSettings.taskManager.lastTaskDocument === 'string'
    ? userSettings.taskManager.lastTaskDocument.trim()
    : '';
  if (!notebookId || !documentId || !enabledNotebooks.value.some(notebook => notebook.id === notebookId)) {
    return null;
  }
  if (documentId === PINCH_INBOX_OPTION_ID || documentId === PINCH_DAILY_NOTE_OPTION_ID) {
    return { notebookId, documentId };
  }
  return getDocumentEntriesByNotebook(notebookId).some(document => document.id === documentId)
    ? { notebookId, documentId }
    : null;
}

function closeQuickCreateDialog() {
  quickCreateNotebookId.value = 'all';
  quickCreateDocumentId.value = 'all';
  quickCreateDialog.value = {
    show: false,
    mode: 'task',
    headingTitle: '',
    title: '',
    payload: null,
    context: null
  };
}

function buildOptimisticTaskForQuickCreate(
  blockId: string,
  taskId: string,
  title: string,
  payload: CreateTaskPayload,
  target: QuickCreateTarget,
  status: Task['status'],
  groupId?: string
): Task {
  const now = new Date().toISOString();
  const normalizedStartDate = typeof payload.startDate === 'string' ? payload.startDate.trim() : '';
  const normalizedDueDate = typeof payload.dueDate === 'string' ? payload.dueDate.trim() : '';
  const normalizedStartTime = typeof payload.startTime === 'string' ? payload.startTime.trim() : '';
  const normalizedDueTime = typeof payload.dueTime === 'string' ? payload.dueTime.trim() : '';
  const startDate = normalizedStartDate || normalizedDueDate || undefined;
  const dueDate = normalizedDueDate || normalizedStartDate || undefined;
  const normalizedGroupId = typeof groupId === 'string' ? groupId.trim() : '';

  const optimisticTask: Task = {
    id: taskId || blockId,
    type: 'block',
    title,
    status,
    priority: 'none',
    startDate,
    dueDate,
    startTime: normalizedStartTime || undefined,
    dueTime: normalizedDueTime || undefined,
    tags: [],
    groupId: normalizedGroupId || undefined,
    description: '',
    blockId,
    rootId: target.documentId,
    hPath: target.docPath,
    notebookId: target.notebookId,
    createdAt: now,
    updatedAt: now
  };

  return optimisticTask;
}

function upsertOptimisticQuickCreatedTask(task: Task): void {
  if (!task.blockId) {
    return;
  }
  pendingOptimisticQuickCreatedTasks.set(task.blockId, {
    task: { ...task },
    expiresAt: Date.now() + PENDING_OPTIMISTIC_QUICK_CREATE_TTL_MS
  });
  const existingIndex = tasks.value.findIndex(item => item.blockId === task.blockId);
  if (existingIndex !== -1) {
    const existing = tasks.value[existingIndex];
    if (existing) {
      Object.assign(existing, task);
    }
  } else {
    tasks.value.unshift(task);
  }
  invalidateTableFilters();
}

async function submitQuickCreateTask() {
  const payload = quickCreateDialog.value.payload;
  const context = quickCreateDialog.value.context;
  const isHeadingTaskMode = quickCreateDialog.value.mode === 'heading-task';
  const headingTitle = isHeadingTaskMode
    ? normalizeQuickCreateHeadingTitle(quickCreateDialog.value.headingTitle)
    : '';
  const trimmedTitle = quickCreateDialog.value.title.trim();
  if (!payload) return;
  if (isHeadingTaskMode && !headingTitle) {
    await pushMsg(t('kanbanView.enterHeadingName'), 2000);
    return;
  }
  if (!trimmedTitle) {
    await pushMsg(t('kanbanView.enterTaskTitle'), 2000);
    return;
  }

  const target = context?.fixedTarget || resolveCreateTarget(quickCreateNotebookId.value, quickCreateDocumentId.value);
  if (!target) {
    await pushMsg(t('kanbanView.selectNotebookAndDocument'), 3000);
    return;
  }

  try {
    let headingMetaForNewTask: TaskHeadingGroupMeta | null = null;
    if (isHeadingTaskMode) {
      const headingBlockId = await createQuickCreateHeading(target.documentId, headingTitle);
      if (!headingBlockId) {
        await pushMsg(t('kanbanView.createHeadingFailedRetry'), 3000);
        return;
      }
      headingMetaForNewTask = {
        key: `heading:${target.documentId}:${headingBlockId}`,
        label: headingTitle,
        kind: 'heading',
        rootId: target.documentId,
        headingBlockId,
        headingLevel: 2
      };
    }

    const normalizedGroupId = context?.columnType === 'group'
      ? (typeof context.groupId === 'string' ? context.groupId.trim() : '')
      : '';
    const createStatus = context?.columnType === 'status' && context.status
      ? context.status
      : 'pending';

    const created = await TaskRepository.createBlockTask({
      title: trimmedTitle,
      description: '',
      priority: 'none',
      status: createStatus,
      dueDate: payload.dueDate,
      tags: [],
      groupId: normalizedGroupId || undefined
    }, target.notebookId, target.docPath);

    let appliedHeadingMetaForNewTask: TaskHeadingGroupMeta | null = null;
    if (created?.blockId) {
      const createDateAttrs: Record<string, string> = {};
      if (payload.startDate) {
        createDateAttrs['custom-task-start-date'] = payload.startDate;
      }
      if (payload.dueDate) {
        createDateAttrs['custom-task-due-date'] = payload.dueDate;
      }
      if (payload.startTime) {
        createDateAttrs['custom-task-start-time'] = payload.startTime;
      }
      if (payload.dueTime) {
        createDateAttrs['custom-task-due-time'] = payload.dueTime;
      }
      if (Object.keys(createDateAttrs).length > 0) {
        await setBlockAttrs(created.blockId, createDateAttrs);
      }

      const targetHeadingMeta = headingMetaForNewTask
        || (context?.columnType === 'heading' && context.headingMeta ? context.headingMeta : null);
      if (targetHeadingMeta) {
        try {
          await moveTaskBlockToHeadingMeta(created.blockId, targetHeadingMeta);
          appliedHeadingMetaForNewTask = targetHeadingMeta;
          setTaskHeadingGroupMetaForIds(
            [created.blockId, created.taskId],
            targetHeadingMeta,
            { rememberPending: true }
          );
        } catch (error) {
          console.error('[KanbanView] Failed to move new task to heading:', error);
          await pushMsg(t('kanbanView.taskCreatedMoveHeadingFailed'), 3000);
        }
      }
    }

    const createdBlockId = created?.blockId || '';
    if (createdBlockId) {
      const optimisticTask = buildOptimisticTaskForQuickCreate(
        createdBlockId,
        created?.taskId || '',
        trimmedTitle,
        payload,
        target,
        createStatus,
        normalizedGroupId
      );
      upsertOptimisticQuickCreatedTask(optimisticTask);
      eventBus.emit(Events.TASK_ADDED, { blockId: createdBlockId, task: optimisticTask });
      setTaskHeadingGroupMetaForIds(
        [createdBlockId, created?.taskId || '', optimisticTask.id],
        appliedHeadingMetaForNewTask,
        { rememberPending: true }
      );
    }

    await updateSettings('taskManager', {
      lastTaskNotebook: target.notebookId,
      lastTaskDocument: target.documentId
    });
    closeQuickCreateDialog();
    if (createdBlockId) {
      void incrementalUpdateTasks([createdBlockId], { allowUnknown: true });
      queueIncrementalUpdates([createdBlockId], { allowUnknown: true }, 64);
      window.setTimeout(() => {
        const hydratedTask = tasks.value.find(t => t.blockId === createdBlockId);
        if (!hydratedTask || !hydratedTask.blockSort) {
          scheduleRefreshTasks(180, 'silent-full');
        }
      }, 420);
    } else {
      scheduleRefreshTasks(180, 'silent-full');
    }
  } catch (error) {
    console.error('[KanbanView] Failed to create task:', error);
    await pushMsg(t('kanbanView.createTaskFailedRetry'), 3000);
  }
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
      syncTaskLocalStatusState(task.id, newStatus);
      invalidateTableFilters();
      if (shouldPlayCompletionSound && taskCompletionSoundEnabled.value) {
        playTaskCompletionSound();
      }
      return;
    }

    if (task.type === 'block' && task.blockId) {
      await updateTaskMarkdown(task.blockId, newStatus === 'completed', true);
      crdtRepo.updateTaskField(task.id, 'status', newStatus);
      syncTaskLocalStatusState(task.id, newStatus);
      invalidateTableFilters();
      if (shouldPlayCompletionSound && taskCompletionSoundEnabled.value) {
        playTaskCompletionSound();
      }
    }
  } catch (error) {
    console.error('[KanbanView] Failed to toggle task status:', error);
  }
}

async function handleSubtaskToggle(parentTask: Task, subtask: Task['subtasks'][0]) {
  if (skipSet.has(subtask.id)) {
    return;
  }
  
  const newCompleted = !subtask.completed;
  const nextStatus: Task['status'] = newCompleted ? 'completed' : 'pending';
  
  skipTaskTemporarily(skipSet, subtask.id);
  
  patchSubtaskInTask(parentTask, subtask.id, (targetSubtask) => {
    targetSubtask.completed = newCompleted;
    targetSubtask.status = nextStatus;
    targetSubtask.updatedAt = new Date().toISOString();
  });
  
  if (subtask.nodeId) {
    updateTaskMarkdown(subtask.nodeId, newCompleted).catch(() => {});
    setBlockAttrs(subtask.nodeId, {
      'custom-task-status': nextStatus
    }).catch(() => {});
  }
  
  TaskRepository.updateSubtaskInCache(parentTask.id, subtask.id, newCompleted).catch(() => {});
}

function normalizeSubtaskPriority(value: unknown): Task['priority'] {
  if (value === 'high' || value === 'medium' || value === 'low' || value === 'none') {
    return value;
  }
  return 'none';
}

function normalizeSubtaskStatus(value: unknown): Task['status'] {
  if (
    value === 'pending'
    || value === 'in-progress'
    || value === 'delayed'
    || value === 'completed'
    || value === 'cancelled'
  ) {
    return value;
  }
  return 'pending';
}

function getSubtaskStatusValue(subtask: SubTask): Task['status'] {
  const normalized = normalizeSubtaskStatus(subtask.status);
  if (subtask.completed && normalized !== 'completed') {
    return 'completed';
  }
  if (!subtask.completed && normalized === 'completed') {
    return 'pending';
  }
  return normalized;
}

function patchSubtaskRecursive(
  subtasks: SubTask[] | undefined,
  subtaskId: string,
  patch: (target: SubTask) => void
): boolean {
  if (!subtasks || subtasks.length === 0) {
    return false;
  }
  for (const item of subtasks) {
    if (item.id === subtaskId) {
      patch(item);
      return true;
    }
    if (patchSubtaskRecursive(item.subtasks, subtaskId, patch)) {
      return true;
    }
  }
  return false;
}

function patchSubtaskInTask(parentTask: Task, subtaskId: string, patch: (target: SubTask) => void): boolean {
  const taskIndex = tasks.value.findIndex(task =>
    task.id === parentTask.id
    || (!!parentTask.blockId && task.blockId === parentTask.blockId)
  );
  if (taskIndex === -1) {
    return false;
  }
  const task = tasks.value[taskIndex];
  const patched = patchSubtaskRecursive(task.subtasks, subtaskId, patch);
  if (patched) {
    task.updatedAt = new Date().toISOString();
  }
  return patched;
}

async function applySubtaskFieldUpdate(
  parentTask: Task,
  subtask: SubTask,
  attrs: Record<string, string>,
  patch: (target: SubTask) => void,
  errorMessage: string,
  afterUpdate?: (blockId: string) => Promise<void> | void
): Promise<void> {
  const subtaskBlockId = typeof subtask.nodeId === 'string' ? subtask.nodeId.trim() : '';
  if (!subtaskBlockId) {
    return;
  }

  try {
    await setBlockAttrs(subtaskBlockId, attrs);
    patchSubtaskInTask(parentTask, subtask.id, patch);
    if (afterUpdate) {
      await afterUpdate(subtaskBlockId);
    }
    const changedBlockIds = [parentTask.blockId, subtaskBlockId]
      .filter((id): id is string => typeof id === 'string' && id.length > 0);
    if (changedBlockIds.length > 0) {
      publishTaskChange(changedBlockIds);
    }
    invalidateTableFilters();
  } catch (error) {
    console.error(`[KanbanView] ${errorMessage}:`, error);
  }
}

async function handleSubtaskDescriptionUpdate(parentTask: Task, subtask: SubTask, description: string): Promise<void> {
  const normalizedDescription = typeof description === 'string' ? description : '';
  const currentDescription = typeof subtask.description === 'string' ? subtask.description : '';
  if (normalizedDescription === currentDescription) {
    return;
  }
  await applySubtaskFieldUpdate(
    parentTask,
    subtask,
    { 'custom-task-description': normalizedDescription || '' },
    (targetSubtask) => {
      targetSubtask.description = normalizedDescription;
      targetSubtask.updatedAt = new Date().toISOString();
    },
    'Failed to update subtask description'
  );
}

async function handleSubtaskPriorityUpdate(parentTask: Task, subtask: SubTask, priority: Task['priority']): Promise<void> {
  const normalizedPriority = normalizeSubtaskPriority(priority);
  if (normalizedPriority === normalizeSubtaskPriority(subtask.priority)) {
    return;
  }
  await applySubtaskFieldUpdate(
    parentTask,
    subtask,
    { 'custom-task-priority': normalizedPriority },
    (targetSubtask) => {
      targetSubtask.priority = normalizedPriority;
      targetSubtask.updatedAt = new Date().toISOString();
    },
    'Failed to update subtask priority'
  );
}

async function handleSubtaskStatusUpdate(parentTask: Task, subtask: SubTask, status: Task['status']): Promise<void> {
  const normalizedStatus = normalizeSubtaskStatus(status);
  const currentStatus = getSubtaskStatusValue(subtask);
  if (normalizedStatus === currentStatus) {
    return;
  }
  await applySubtaskFieldUpdate(
    parentTask,
    subtask,
    { 'custom-task-status': normalizedStatus },
    (targetSubtask) => {
      targetSubtask.status = normalizedStatus;
      targetSubtask.completed = normalizedStatus === 'completed';
      targetSubtask.updatedAt = new Date().toISOString();
    },
    'Failed to update subtask status',
    async (blockId) => {
      await updateTaskMarkdown(blockId, normalizedStatus === 'completed');
    }
  );
}

async function handleSubtaskGroupUpdate(parentTask: Task, subtask: SubTask, groupId: string): Promise<void> {
  const normalizedGroupId = typeof groupId === 'string' ? groupId.trim() : '';
  const currentGroupId = typeof subtask.groupId === 'string' ? subtask.groupId.trim() : '';
  if (normalizedGroupId === currentGroupId) {
    return;
  }
  await applySubtaskFieldUpdate(
    parentTask,
    subtask,
    { 'custom-task-group': normalizedGroupId || '' },
    (targetSubtask) => {
      targetSubtask.groupId = normalizedGroupId || undefined;
      targetSubtask.updatedAt = new Date().toISOString();
    },
    'Failed to update subtask group'
  );
}

async function handleSubtaskStartDateUpdate(parentTask: Task, subtask: SubTask, startDate: string): Promise<void> {
  const normalizedStartDate = normalizeDateInputValue(startDate || '');
  const currentStartDate = normalizeDateInputValue((subtask.startDate || '').toString());
  if (normalizedStartDate === currentStartDate) {
    return;
  }
  await applySubtaskFieldUpdate(
    parentTask,
    subtask,
    { 'custom-task-start-date': normalizedStartDate || '' },
    (targetSubtask) => {
      targetSubtask.startDate = normalizedStartDate || undefined;
      targetSubtask.updatedAt = new Date().toISOString();
    },
    'Failed to update subtask start date'
  );
}

async function handleSubtaskDueDateUpdate(parentTask: Task, subtask: SubTask, dueDate: string): Promise<void> {
  const normalizedDueDate = normalizeDateInputValue(dueDate || '');
  const currentDueDate = normalizeDateInputValue((subtask.dueDate || '').toString());
  if (normalizedDueDate === currentDueDate) {
    return;
  }
  await applySubtaskFieldUpdate(
    parentTask,
    subtask,
    { 'custom-task-due-date': normalizedDueDate || '' },
    (targetSubtask) => {
      targetSubtask.dueDate = normalizedDueDate || undefined;
      targetSubtask.updatedAt = new Date().toISOString();
    },
    'Failed to update subtask due date'
  );
}

async function handleSubtaskStartTimeUpdate(parentTask: Task, subtask: SubTask, startTime: string): Promise<void> {
  const normalizedStartTime = normalizeTimeInputValue(startTime || '');
  const currentStartTime = normalizeTimeInputValue((subtask.startTime || '').toString());
  if (normalizedStartTime === currentStartTime) {
    return;
  }
  await applySubtaskFieldUpdate(
    parentTask,
    subtask,
    { 'custom-task-start-time': normalizedStartTime || '' },
    (targetSubtask) => {
      targetSubtask.startTime = normalizedStartTime || undefined;
      targetSubtask.updatedAt = new Date().toISOString();
    },
    'Failed to update subtask start time'
  );
}

async function handleSubtaskDueTimeUpdate(parentTask: Task, subtask: SubTask, dueTime: string): Promise<void> {
  const normalizedDueTime = normalizeTimeInputValue(dueTime || '');
  const currentDueTime = normalizeTimeInputValue((subtask.dueTime || '').toString());
  if (normalizedDueTime === currentDueTime) {
    return;
  }
  await applySubtaskFieldUpdate(
    parentTask,
    subtask,
    { 'custom-task-due-time': normalizedDueTime || '' },
    (targetSubtask) => {
      targetSubtask.dueTime = normalizedDueTime || undefined;
      targetSubtask.updatedAt = new Date().toISOString();
    },
    'Failed to update subtask due time'
  );
}

async function handleDescriptionUpdate(task: Task, description: string) {
  const targetTask = await resolveKanbanEditorTargetTask(task);
  if (!targetTask) {
    return;
  }

  await applyBlockTaskFieldUpdate(
    targetTask,
    { 'custom-task-description': description || '' },
    'description',
    description,
    'Failed to update task description'
  );
  const repeatTouched = syncRepeatTaskDescriptionLocally(targetTask, description);
  if (repeatTouched) {
    notifyRepeatChanged({
      blockId: targetTask.blockId,
      seriesId: getTaskRepeatSeriesId(targetTask),
      frequency: targetTask.repeatFrequency
    });
  }
}

async function handlePriorityUpdate(task: Task, priority: Task['priority']) {
  await applyBlockTaskFieldUpdate(
    task,
    { 'custom-task-priority': priority },
    'priority',
    priority,
    'Failed to update task priority'
  );
}

async function handleStatusUpdate(task: Task, status: Task['status']) {
  const wasCompleted = task.status === 'completed';
  await applyBlockTaskFieldUpdate(
    task,
    { 'custom-task-status': status },
    'status',
    status,
    'Failed to update task status',
    async (blockId) => {
      await updateTaskMarkdown(blockId, status === 'completed');
    }
  );
  if (!wasCompleted && status === 'completed' && taskCompletionSoundEnabled.value) {
    const refreshedTask = tasks.value.find(item => item.id === task.id);
    if (refreshedTask?.status === 'completed') {
      playTaskCompletionSound();
    }
  }
}

async function handleGroupUpdate(task: Task, groupId: string) {
  const currentTagIds = resolveTaskTagIds(task.tags, task.groupId);
  const nextTagIds = groupId ? setPrimaryTaskTag(currentTagIds, groupId) : [];
  await applyBlockTaskTagUpdate(task, nextTagIds, 'Failed to update task group');
  invalidateTableFilters();
}

async function handleTaskTagUpdate(task: Task, tagIds: string[]) {
  const currentTagState = buildTaskTagState(task.tags, task.groupId);
  const nextTagState = buildTaskTagState(tagIds);
  if (
    areTaskTagIdsEqual(currentTagState.tagIds, nextTagState.tagIds)
    && currentTagState.primaryTagId === nextTagState.primaryTagId
  ) {
    return;
  }
  await applyBlockTaskTagUpdate(task, nextTagState.tagIds, 'Failed to update task tags');
  invalidateTableFilters();
}

async function handleStartDateUpdate(task: Task, startDate: string) {
  await applyBlockTaskFieldUpdate(
    task,
    { 'custom-task-start-date': startDate || '' },
    'startDate',
    startDate,
    'Failed to update start date'
  );
}

async function handleDueDateUpdate(task: Task, dueDate: string) {
  await applyBlockTaskFieldUpdate(
    task,
    { 'custom-task-due-date': dueDate || '' },
    'dueDate',
    dueDate,
    'Failed to update due date'
  );
}

async function handleStartTimeUpdate(task: Task, startTime: string) {
  const normalizedStartTime = normalizeTimeInputValue(startTime || '');
  const currentStartTime = normalizeTimeInputValue((task.startTime || '').toString());
  if (normalizedStartTime === currentStartTime) {
    return;
  }
  await applyBlockTaskFieldUpdate(
    task,
    { 'custom-task-start-time': normalizedStartTime || '' },
    'startTime',
    normalizedStartTime || undefined,
    'Failed to update start time'
  );
}

async function handleDueTimeUpdate(task: Task, dueTime: string) {
  const normalizedDueTime = normalizeTimeInputValue(dueTime || '');
  const currentDueTime = normalizeTimeInputValue((task.dueTime || '').toString());
  if (normalizedDueTime === currentDueTime) {
    return;
  }
  await applyBlockTaskFieldUpdate(
    task,
    { 'custom-task-due-time': normalizedDueTime || '' },
    'dueTime',
    normalizedDueTime || undefined,
    'Failed to update due time'
  );
}

function updateTaskLocalField<K extends keyof Task>(taskId: string, field: K, value: Task[K]): void {
  const task = tasks.value.find(item => item.id === taskId);
  if (!task) {
    return;
  }
  const now = Date.now();
  crdtRepo.updateTaskField(taskId, field as any, value, now);
  rememberLocalTaskFieldOverride(taskId, field, value);

  // Attribute writes address the template block only. Keep its virtual
  // instances in the same optimistic CRDT snapshot so views never repaint
  // them with the previous value between the write and materialized refresh.
  if (!task.isVirtual && task.repeatSeriesId) {
    tasks.value.forEach((item) => {
      if (!item.isVirtual || item.repeatSeriesId !== task.repeatSeriesId) return;
      crdtRepo.updateTaskField(item.id, field as any, value, now);
      rememberLocalTaskFieldOverride(item.id, field, value);
    });
  }
  tasks.value = applyLocalTaskFieldOverridesToList(applyDraggedStatusLocks(crdtRepo.getTasks()));
}

function updateTaskLocalTagState(taskId: string, tagIds: string[]): void {
  const nextTagState = buildTaskTagState(tagIds);
  const task = tasks.value.find(item => item.id === taskId);
  if (!task) {
    return;
  }
  const now = Date.now();
  const syncTagState = (target: Task) => {
    crdtRepo.updateTaskField(target.id, 'tags', [...nextTagState.tagIds], now);
    crdtRepo.updateTaskField(target.id, 'groupId', nextTagState.primaryTagId || undefined, now);
    rememberLocalTaskFieldOverride(target.id, 'tags', [...nextTagState.tagIds]);
    rememberLocalTaskFieldOverride(target.id, 'groupId', nextTagState.primaryTagId || undefined);
  };
  syncTagState(task);
  if (!task.isVirtual && task.repeatSeriesId) {
    tasks.value.forEach((item) => {
      if (item.isVirtual && item.repeatSeriesId === task.repeatSeriesId) {
        syncTagState(item);
      }
    });
  }
  tasks.value = applyLocalTaskFieldOverridesToList(applyDraggedStatusLocks(crdtRepo.getTasks()));
  const updatedTaskIndex = tasks.value.findIndex(t => t.id === taskId);
  if (updatedTaskIndex === -1) {
    return;
  }
  tasks.value[updatedTaskIndex].tags = [...nextTagState.tagIds];
  tasks.value[updatedTaskIndex].groupId = nextTagState.primaryTagId || undefined;
  if (kanbanEditorDraft.value?.taskId === taskId) {
    kanbanEditorDraft.value.tags = [...nextTagState.tagIds];
    kanbanEditorDraft.value.groupId = nextTagState.primaryTagId;
  }
}

function syncTaskLocalStatusState(taskId: string, status: Task['status']): void {
  const taskIndex = tasks.value.findIndex(t => t.id === taskId);
  if (taskIndex === -1) {
    return;
  }

  const nowIso = new Date().toISOString();
  const nowTs = Date.now();
  crdtRepo.updateTaskField(taskId, 'status', status, nowTs);
  crdtRepo.updateTaskField(taskId, 'completedAt', status === 'completed' ? nowIso : undefined, nowTs);
  updateTasks();
  const updatedTaskIndex = tasks.value.findIndex(t => t.id === taskId);
  if (updatedTaskIndex === -1) {
    return;
  }

  const targetTask = tasks.value[updatedTaskIndex];
  targetTask.status = status;
  if (status === 'completed') {
    targetTask.completedAt = targetTask.completedAt || nowIso;
  } else {
    delete targetTask.completedAt;
  }
  targetTask.updatedAt = nowIso;
  syncCalendarLifelogTask(targetTask);

  if (kanbanEditorDraft.value?.taskId === taskId) {
    kanbanEditorDraft.value.status = status;
  }
}

async function applyBlockTaskFieldUpdate<K extends keyof Task>(
  task: Task,
  attrs: Record<string, string>,
  field: K,
  value: Task[K],
  errorMessage: string,
  afterUpdate?: (blockId: string) => Promise<void> | void
): Promise<void> {
  if (task.isVirtual && task.repeatSeriesId && task.repeatInstanceDate && field === 'status') {
    try {
      await TaskRepository.updateRepeatInstanceStatus(task, value as Task['status']);
      syncTaskLocalStatusState(task.id, value as Task['status']);
    } catch (error) {
      console.error(`[KanbanView] ${errorMessage}:`, error);
    }
    return;
  }

  // Non-status edits made from a materialized repeat instance persist on its
  // template. Resolve that template before applying the local update too, so
  // every visible instance receives the optimistic value immediately.
  const targetTask = task.isVirtual
    ? await resolveKanbanEditorTargetTask(task)
    : task;
  if (!targetTask) {
    return;
  }

  if (targetTask.type === 'block' && targetTask.blockId) {
    try {
      const attrsToPersist = field === 'status'
        ? { ...attrs, ...buildTaskStatusAttrs(value as Task['status'], targetTask.completedAt) }
        : attrs;
      if (field !== 'status') {
        updateTaskLocalField(targetTask.id, field, value);
      }
      await setBlockAttrs(targetTask.blockId, attrsToPersist);
      if (field === 'description') {
        await TaskRepository.clearCache();
        suppressDragTaskSync(targetTask.blockId, 1200);
      }
      if (field === 'status') {
        syncTaskLocalStatusState(targetTask.id, value as Task['status']);
      }
      if (afterUpdate) {
        await afterUpdate(targetTask.blockId);
      }
      if (field !== 'status') {
        suppressDragTaskSync(targetTask.blockId, 1200);
      }
    } catch (error) {
      console.error(`[KanbanView] ${errorMessage}:`, error);
    }
  }
}

async function applyBlockTaskTagUpdate(
  task: Task,
  tagIds: string[],
  errorMessage: string
): Promise<void> {
  const targetTask = task.isVirtual
    ? await resolveKanbanEditorTargetTask(task)
    : task;
  if (!targetTask || targetTask.type !== 'block' || !targetTask.blockId) {
    return;
  }
  try {
    updateTaskLocalTagState(targetTask.id, tagIds);
    await setBlockAttrs(targetTask.blockId, buildTaskTagAttrs(tagIds).attrs);
  } catch (error) {
    console.error(`[KanbanView] ${errorMessage}:`, error);
  }
}

function resolveGroupColumnDragId(column: KanbanColumn): string {
  if (column.type !== 'group') {
    return '';
  }
  const columnId = typeof column.id === 'string' ? column.id.trim() : '';
  if (columnId === TASK_GROUP_NONE_ID) {
    return TASK_GROUP_NONE_ID;
  }
  const groupId = typeof column.groupId === 'string' ? column.groupId.trim() : '';
  return groupId || columnId;
}

function canReorderGroupColumn(column: KanbanColumn): boolean {
  if (isMobileFrontend || kanbanGroupBy.value !== 'group' || isKanbanBatchEditMode.value) {
    return false;
  }
  if (column.type !== 'group' || isColumnTitleEditing(column)) {
    return false;
  }
  return resolveGroupColumnDragId(column).length > 0;
}

function isGroupColumnReorderTarget(column: KanbanColumn): boolean {
  const groupId = resolveGroupColumnDragId(column);
  return !!groupId && dragOverGroupColumnId.value === groupId;
}

function isGroupColumnReorderBefore(column: KanbanColumn): boolean {
  return isGroupColumnReorderTarget(column) && dragOverGroupColumnPosition.value === 'before';
}

function isGroupColumnReorderAfter(column: KanbanColumn): boolean {
  return isGroupColumnReorderTarget(column) && dragOverGroupColumnPosition.value === 'after';
}

function isGroupColumnBeingDragged(column: KanbanColumn): boolean {
  const groupId = resolveGroupColumnDragId(column);
  return !!groupId && draggedGroupColumnId.value === groupId;
}

function clearGroupColumnReorderDragState(): void {
  draggedGroupColumnId.value = null;
  dragOverGroupColumnId.value = null;
  dragOverGroupColumnPosition.value = null;
}

function resolveGroupColumnDropPosition(event: DragEvent): 'before' | 'after' {
  const currentTarget = event.currentTarget;
  if (!(currentTarget instanceof HTMLElement)) {
    return 'after';
  }
  const rect = currentTarget.getBoundingClientRect();
  const midpoint = rect.left + rect.width / 2;
  return event.clientX < midpoint ? 'before' : 'after';
}

function moveGroupColumnOrderByPosition(
  columnIds: string[],
  sourceId: string,
  targetId: string,
  position: 'before' | 'after'
): string[] {
  const sourceIndex = columnIds.findIndex(id => id === sourceId);
  const targetIndex = columnIds.findIndex(id => id === targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return [...columnIds];
  }

  const next = [...columnIds];
  const [moved] = next.splice(sourceIndex, 1);
  const targetIndexAfterRemoval = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
  const insertionIndex = position === 'before'
    ? targetIndexAfterRemoval
    : targetIndexAfterRemoval + 1;
  next.splice(Math.max(0, Math.min(insertionIndex, next.length)), 0, moved);
  return next;
}

function reorderVisibleTaskGroups(groups: TaskGroup[], visibleOrderIds: string[]): TaskGroup[] {
  const orderMap = new Map(visibleOrderIds.map((id, index) => [id, index]));
  const orderedVisibleGroups = groups
    .filter(group => group.hidden !== true && orderMap.has(group.id))
    .sort((a, b) => (orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER))
    .map(group => ({ ...group }));

  let visibleIndex = 0;
  return groups.map((group) => {
    if (group.hidden === true || !orderMap.has(group.id)) {
      return { ...group };
    }
    const nextGroup = orderedVisibleGroups[visibleIndex];
    visibleIndex += 1;
    return nextGroup ? { ...nextGroup } : { ...group };
  });
}

async function reorderTaskGroupsByColumnDrag(
  sourceGroupId: string,
  targetGroupId: string,
  position: 'before' | 'after'
): Promise<void> {
  const sourceId = sourceGroupId.trim();
  const targetId = targetGroupId.trim();
  if (!sourceId || !targetId || sourceId === targetId) {
    return;
  }

  const currentColumnOrder = [...resolvedKanbanGroupColumnOrder.value];
  const reorderedColumnOrder = moveGroupColumnOrderByPosition(currentColumnOrder, sourceId, targetId, position);
  if (currentColumnOrder.join('|') === reorderedColumnOrder.join('|')) {
    return;
  }

  kanbanGroupColumnOrder.value = reorderedColumnOrder;

  const nextVisibleGroupOrder = reorderedColumnOrder.filter(
    id => id !== TASK_GROUP_NONE_ID && visibleTaskGroupIdSet.value.has(id)
  );
  const currentVisibleGroupOrder = visibleTaskGroups.value.map(group => group.id);
  if (currentVisibleGroupOrder.join('|') === nextVisibleGroupOrder.join('|')) {
    try {
      await saveUserSettings();
    } catch (error) {
      console.error('[KanbanView] Failed to save tag column order:', error);
      await pushMsg(t('kanbanView.saveTagColumnOrderFailed'), 2600);
    }
    return;
  }

  const currentGroups = taskGroups.value.map(group => ({ ...group }));
  const reorderedGroups = reorderVisibleTaskGroups(currentGroups, nextVisibleGroupOrder);
  const now = new Date().toISOString();
  const nextGroups = reorderedGroups.map((group, index) => ({
    ...group,
    order: index,
    updatedAt: now
  }));

  taskGroups.value = nextGroups;
  eventBus.emit(Events.TASK_GROUPS_UPDATED, { groups: nextGroups });

  try {
    await saveTaskGroups(nextGroups);
    await saveUserSettings();
    const refreshedGroups = await loadTaskGroups();
    taskGroups.value = refreshedGroups;
    eventBus.emit(Events.TASK_GROUPS_UPDATED, { groups: refreshedGroups });
  } catch (error) {
    console.error('[KanbanView] Failed to save tag column order:', error);
    await pushMsg(t('kanbanView.saveTagColumnOrderFailed'), 2600);
  }
}

function handleGroupColumnReorderDragStart(event: DragEvent, column: KanbanColumn): void {
  if (!canReorderGroupColumn(column)) {
    return;
  }
  const groupId = resolveGroupColumnDragId(column);
  if (!groupId) {
    return;
  }

  draggedGroupColumnId.value = groupId;
  dragOverGroupColumnId.value = null;
  dragOverGroupColumnPosition.value = null;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', groupId);
  }
}

function handleGroupColumnReorderDragOver(event: DragEvent, column: KanbanColumn): void {
  if (!draggedGroupColumnId.value || !canReorderGroupColumn(column)) {
    return;
  }
  const targetGroupId = resolveGroupColumnDragId(column);
  if (!targetGroupId || targetGroupId === draggedGroupColumnId.value) {
    dragOverGroupColumnId.value = null;
    dragOverGroupColumnPosition.value = null;
    return;
  }

  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
  dragOverGroupColumnId.value = targetGroupId;
  dragOverGroupColumnPosition.value = resolveGroupColumnDropPosition(event);
}

function handleGroupColumnReorderDragLeave(event: DragEvent, column: KanbanColumn): void {
  const targetGroupId = resolveGroupColumnDragId(column);
  if (!targetGroupId || dragOverGroupColumnId.value !== targetGroupId) {
    return;
  }
  const currentTarget = event.currentTarget;
  const relatedTarget = event.relatedTarget;
  if (
    currentTarget instanceof Node
    && relatedTarget instanceof Node
    && currentTarget.contains(relatedTarget)
  ) {
    return;
  }
  dragOverGroupColumnId.value = null;
  dragOverGroupColumnPosition.value = null;
}

async function handleGroupColumnReorderDrop(event: DragEvent, column: KanbanColumn): Promise<void> {
  event.preventDefault();
  const sourceGroupId = draggedGroupColumnId.value;
  if (!sourceGroupId || !canReorderGroupColumn(column)) {
    clearGroupColumnReorderDragState();
    return;
  }

  const targetGroupId = resolveGroupColumnDragId(column);
  const dropPosition = resolveGroupColumnDropPosition(event);
  clearGroupColumnReorderDragState();
  if (!targetGroupId || sourceGroupId === targetGroupId) {
    return;
  }
  await reorderTaskGroupsByColumnDrag(sourceGroupId, targetGroupId, dropPosition);
}

function handleGroupColumnReorderDragEnd(): void {
  clearGroupColumnReorderDragState();
}

function handleDragStart(event: DragEvent, task: Task) {
  if (isMobileFrontend || !kanbanSupportsDrag.value) return;

  draggedTask.value = task;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/json', JSON.stringify(task));
    event.dataTransfer.setData('text/plain', task.id);
  }
}

function handleDragEnd() {
  draggedTask.value = null;
  dragOverColumnId.value = null;
}

function handleDragOver(event: DragEvent, column: KanbanColumn) {
  if (isMobileFrontend) return;

  event.preventDefault();
  if (!draggedTask.value) {
    return;
  }

  if (activeBoardGroupBy.value === 'group') {
    if (column.type !== 'group') {
      return;
    }
    const currentGroupId = getGroupColumnIdForTask(draggedTask.value);
    if (currentGroupId !== column.id) {
      dragOverColumnId.value = column.id;
    }
    return;
  }

  if (activeBoardGroupBy.value === 'heading') {
    if (column.type !== 'heading' || !column.headingMeta) {
      return;
    }
    if (!(draggedTask.value.type === 'block' && draggedTask.value.blockId)) {
      return;
    }
    const currentHeadingKey = getHeadingColumnIdForTask(draggedTask.value);
    if (currentHeadingKey !== column.id) {
      dragOverColumnId.value = column.id;
    }
    return;
  }

  if (column.type === 'status' && column.status && draggedTask.value.status !== column.status) {
    dragOverColumnId.value = column.id;
  }
}

function handleDragLeave() {
  dragOverColumnId.value = null;
}

function handleQuadrantDragStart(event: DragEvent, task: Task): void {
  if (isMobileFrontend || task.isVirtual) return;
  quadrantDraggedTask.value = task;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', task.id);
  }
}

function handleQuadrantDragEnd(): void {
  quadrantDraggedTask.value = null;
  quadrantDragOverId.value = null;
}

function handleQuadrantDragOver(quadrantId: TaskQuadrantId): void {
  if (quadrantDraggedTask.value) {
    quadrantDragOverId.value = quadrantId;
  }
}

function handleQuadrantDragLeave(event: DragEvent): void {
  const section = event.currentTarget as HTMLElement | null;
  const nextTarget = event.relatedTarget as Node | null;
  // dragleave bubbles while moving over cards inside the same quadrant.
  if (section && nextTarget && section.contains(nextTarget)) {
    return;
  }
  quadrantDragOverId.value = null;
}

async function handleQuadrantDrop(quadrantId: TaskQuadrantId): Promise<void> {
  const dragged = quadrantDraggedTask.value;
  handleQuadrantDragEnd();
  if (!dragged || dragged.isVirtual) return;

  const taskIndex = tasks.value.findIndex(task => task.id === dragged.id);
  if (taskIndex === -1) return;

  const targetImportant = quadrantId === 'important-urgent' || quadrantId === 'important-not-urgent';
  const targetUrgent = quadrantId === 'important-urgent' || quadrantId === 'not-important-urgent';
  const currentTask = tasks.value[taskIndex];
  const nextPriority: Task['priority'] = targetImportant ? 'high' : 'low';
  const nextUrgent = targetUrgent;
  if (currentTask.priority === nextPriority && currentTask.urgent === nextUrgent) return;

  const previousTask = currentTask;
  const updatedTask = { ...currentTask, priority: nextPriority, urgent: nextUrgent };
  tasks.value = [
    ...tasks.value.slice(0, taskIndex),
    updatedTask,
    ...tasks.value.slice(taskIndex + 1)
  ];
  crdtRepo.updateTaskField(updatedTask.id, 'priority', nextPriority);
  crdtRepo.updateTaskField(updatedTask.id, 'urgent', nextUrgent);
  invalidateTableFilters();

  try {
    // Quadrant tasks already carry their source block id. Write the attributes directly
    // instead of resolving a task id again, so legacy tasks without custom-task-id persist too.
    if (!updatedTask.blockId) {
      throw new Error('Task block id is unavailable');
    }
    await setBlockAttrs(updatedTask.blockId, {
      'custom-task-priority': nextPriority,
      'custom-task-urgent': nextUrgent ? 'true' : ''
    });
    publishTaskAttributeChange(updatedTask.blockId, {
      'custom-task-priority': nextPriority,
      'custom-task-urgent': nextUrgent ? 'true' : ''
    });
    // The task view normally reads from the kernel index. Refresh it after the
    // attribute write so a subsequent reload does not restore stale index data.
    scheduleKernelTaskIndexRefresh(0, false, true);
    scheduleRefreshTasks(360, 'silent-full');
  } catch (error) {
    console.error('[KanbanView] Failed to update quadrant task fields:', error);
    const currentIndex = tasks.value.findIndex(task => task.id === updatedTask.id);
    if (currentIndex !== -1) {
      tasks.value = [
        ...tasks.value.slice(0, currentIndex),
        previousTask,
        ...tasks.value.slice(currentIndex + 1)
      ];
      crdtRepo.updateTaskField(previousTask.id, 'priority', previousTask.priority);
      crdtRepo.updateTaskField(previousTask.id, 'urgent', previousTask.urgent);
      invalidateTableFilters();
    }
  }
}

async function handleDrop(event: DragEvent, column: KanbanColumn) {
  if (isMobileFrontend) return;

  event.preventDefault();
  
  if (!draggedTask.value) return;

  if (activeBoardGroupBy.value === 'group') {
    if (column.type !== 'group') {
      return;
    }
    await handleGroupDrop(column);
    return;
  }

  if (activeBoardGroupBy.value === 'heading') {
    if (column.type !== 'heading') {
      return;
    }
    await handleHeadingDrop(column);
    return;
  }

  if (column.type === 'status' && column.status) {
    await handleStatusDrop(column.status);
  }
}

async function handleGroupDrop(column: KanbanColumn) {
  if (!draggedTask.value) return;
  
  isDropping.value = true;
  
  const task = draggedTask.value;
  const taskId = task.id;
  
  const taskIndex = tasks.value.findIndex(t => t.id === taskId);
  if (taskIndex === -1) {
    isDropping.value = false;
    return;
  }
  
  const currentTask = tasks.value[taskIndex];
  const oldGroupId = typeof currentTask.groupId === 'string' ? currentTask.groupId.trim() : '';
  const targetGroupId = column.id === TASK_GROUP_NONE_ID ? '' : (column.groupId || column.id);
  const normalizedTargetGroupId = typeof targetGroupId === 'string' ? targetGroupId.trim() : '';
  const oldTagIds = resolveTaskTagIds(currentTask.tags, currentTask.groupId);
  const nextTagIds = normalizedTargetGroupId
    ? setPrimaryTaskTag(oldTagIds, normalizedTargetGroupId)
    : [];
  const nextTagState = buildTaskTagState(nextTagIds);
  
  if (oldGroupId === normalizedTargetGroupId && areTaskTagIdsEqual(oldTagIds, nextTagState.tagIds)) {
    isDropping.value = false;
    return;
  }
  
  const updatedTask = {
    ...currentTask,
    tags: [...nextTagState.tagIds],
    groupId: nextTagState.primaryTagId || undefined
  };
  const droppedBlockId = task.type === 'block' && task.blockId ? task.blockId : null;
  if (droppedBlockId) {
    suppressDragTaskSync(droppedBlockId, 1600);
  }
  tasks.value = [
    ...tasks.value.slice(0, taskIndex),
    updatedTask,
    ...tasks.value.slice(taskIndex + 1)
  ];
  crdtRepo.updateTaskField(taskId, 'tags', [...nextTagState.tagIds]);
  crdtRepo.updateTaskField(taskId, 'groupId', nextTagState.primaryTagId || undefined);
  invalidateTableFilters();

  // End drag visual state immediately to avoid long "dragging" flicker while async sync is running.
  draggedTask.value = null;
  dragOverColumnId.value = null;
  
  try {
    if (task.type === 'block' && task.blockId) {
      await setBlockAttrs(task.blockId, buildTaskTagAttrs(nextTagState.tagIds).attrs);
    }
  } catch (error) {
    console.error('[KanbanView] Failed to update task group via drag:', error);
    if (droppedBlockId) {
      dragSyncSuppressUntil.delete(droppedBlockId);
    }
    const revertTaskIndex = tasks.value.findIndex(t => t.id === taskId);
    if (revertTaskIndex !== -1) {
      const revertedTask = {
        ...tasks.value[revertTaskIndex],
        tags: [...oldTagIds],
        groupId: oldGroupId || undefined
      };
      tasks.value = [
        ...tasks.value.slice(0, revertTaskIndex),
        revertedTask,
        ...tasks.value.slice(revertTaskIndex + 1)
      ];
      crdtRepo.updateTaskField(taskId, 'tags', [...oldTagIds]);
      crdtRepo.updateTaskField(taskId, 'groupId', oldGroupId || undefined);
      invalidateTableFilters();
    }
  } finally {
    isDropping.value = false;
  }
  if (droppedBlockId) {
    // Keep optimistic result to avoid post-drop visual flicker; backend events have been suppressed.
    window.setTimeout(() => {
      dragSyncSuppressUntil.delete(droppedBlockId);
    }, 500);
  }
}

async function handleHeadingDrop(column: KanbanColumn) {
  if (!draggedTask.value || column.type !== 'heading' || !column.headingMeta) return;

  const task = draggedTask.value;
  if (!(task.type === 'block' && task.blockId)) {
    pushMsg(t('kanbanView.headingDragBlockOnly'));
    draggedTask.value = null;
    dragOverColumnId.value = null;
    return;
  }

  isDropping.value = true;

  const taskId = task.id;
  const taskIndex = tasks.value.findIndex(t => t.id === taskId);
  if (taskIndex === -1) {
    isDropping.value = false;
    return;
  }

  const currentTask = tasks.value[taskIndex];
  const currentHeadingKey = getHeadingColumnIdForTask(currentTask);
  if (currentHeadingKey === column.id) {
    isDropping.value = false;
    return;
  }

  const droppedBlockId = task.blockId;
  const previousMeta = taskHeadingGroups.value.get(taskId);
  const nextMeta = column.headingMeta;
  const headingIdentityIds = getTaskHeadingIdentityIds(task);

  suppressDragTaskSync(droppedBlockId, 2200);
  setTaskHeadingGroupMetaForIds(headingIdentityIds, nextMeta, { rememberPending: true });

  // End drag visual state immediately to avoid long "dragging" flicker while async sync is running.
  draggedTask.value = null;
  dragOverColumnId.value = null;

  try {
    await moveTaskBlockToHeadingMeta(droppedBlockId, nextMeta);

    window.setTimeout(() => {
      dragSyncSuppressUntil.delete(droppedBlockId);
      publishTaskChange([droppedBlockId]);
    }, 500);
  } catch (error) {
    console.error('[KanbanView] Failed to move task to heading via drag:', error);
    dragSyncSuppressUntil.delete(droppedBlockId);
    forgetPendingTaskHeadingGroupMetaForIds(headingIdentityIds);
    const nextGroupMap = new Map(taskHeadingGroups.value);
    if (previousMeta) {
      nextGroupMap.set(taskId, previousMeta);
    } else {
      nextGroupMap.delete(taskId);
    }
    taskHeadingGroups.value = nextGroupMap;
    pushMsg(t('kanbanView.moveToHeadingFailed'));
  } finally {
    isDropping.value = false;
  }
}

async function handleStatusDrop(targetStatus: Task['status']) {
  if (!draggedTask.value) return;
  
  isDropping.value = true;
  
  const task = draggedTask.value;
  const taskId = task.id;
  
  const taskIndex = tasks.value.findIndex(t => t.id === taskId);
  if (taskIndex === -1) {
    isDropping.value = false;
    return;
  }
  
  const currentTask = tasks.value[taskIndex];
  const oldStatus = currentTask.status;
  const wasCompleted = oldStatus === 'completed';
  
  if (oldStatus === targetStatus) {
    isDropping.value = false;
    return;
  }
  
  const updatedTask = { ...currentTask, status: targetStatus as Task['status'] };
  const droppedBlockId = task.type === 'block' && task.blockId ? task.blockId : null;
  if (droppedBlockId) {
    lockDraggedTaskStatus(droppedBlockId, targetStatus as Task['status']);
    suppressDragTaskSync(droppedBlockId, 1600);
  }
  tasks.value = [
    ...tasks.value.slice(0, taskIndex),
    updatedTask,
    ...tasks.value.slice(taskIndex + 1)
  ];
  invalidateTableFilters();

  // End drag visual state immediately to avoid long "dragging" flicker while async sync is running.
  draggedTask.value = null;
  dragOverColumnId.value = null;
  
  try {
    if (task.isVirtual && task.repeatSeriesId && task.repeatInstanceDate) {
      await TaskRepository.updateRepeatInstanceStatus(task, targetStatus as Task['status']);
    } else if (task.type === 'block' && task.blockId) {
      await setBlockAttrs(task.blockId, {
        ...buildTaskStatusAttrs(targetStatus as Task['status'], task.completedAt)
      });
      await updateTaskMarkdown(task.blockId, targetStatus === 'completed');
    }
    if (!wasCompleted && targetStatus === 'completed' && taskCompletionSoundEnabled.value) {
      playTaskCompletionSound();
    }
  } catch (error) {
    console.error('[KanbanView] Failed to update task status via drag:', error);
    if (droppedBlockId) {
      unlockDraggedTaskStatus(droppedBlockId);
      dragSyncSuppressUntil.delete(droppedBlockId);
    }
    const revertTaskIndex = tasks.value.findIndex(t => t.id === taskId);
    if (revertTaskIndex !== -1) {
      const revertedTask = { ...tasks.value[revertTaskIndex], status: oldStatus };
      tasks.value = [
        ...tasks.value.slice(0, revertTaskIndex),
        revertedTask,
        ...tasks.value.slice(revertTaskIndex + 1)
      ];
      invalidateTableFilters();
    }
  } finally {
    isDropping.value = false;
  }
  if (droppedBlockId) {
    // Keep optimistic result to avoid post-drop visual flicker; backend events have been suppressed.
    window.setTimeout(() => {
      dragSyncSuppressUntil.delete(droppedBlockId);
    }, 500);
  }
}

onMounted(async () => {
  isKanbanViewMounted = true;
  setupEventListeners();
  await loadSettings();
  TaskRepository.setAutoRecognizeTaskDateEnabled(userSettings.taskManager.autoRecognizeTaskDate === true);
  applyExcludedNotebookScope(normalizeNotebookIds(userSettings.taskManager.excludedNotebookIds));
  const storedInitialView = normalizeTaskViewMode(userSettings.kanban?.currentView);
  const initialView = viewSwitcherOptions.value.some(option => option.value === storedInitialView)
    ? storedInitialView
    : viewSwitcherOptions.value[0]?.value || 'table';
  const initialLoadMode = resolveTaskLoadModeForView(initialView);
  currentView.value = viewSwitcherOptions.value.some(option => option.value === initialView)
    ? initialView
    : viewSwitcherOptions.value[0]?.value || 'table';
  const initialKanbanGroupMode = resolveStoredTaskViewGroupMode(
    userSettings.kanban?.kanbanGroupBy,
    userSettings.kanban?.kanbanGroupMode,
    'status'
  );
  const initialTableGroupMode = resolveStoredTaskViewGroupMode(
    userSettings.kanban?.tableGroupBy,
    userSettings.kanban?.tableGroupMode,
    'status'
  );
  const shouldWarmTaskGroups =
    initialView === 'kanban'
    || initialView === 'list'
    || initialView === 'table'
    || initialView === 'archive-table'
    || initialKanbanGroupMode === 'group'
    || initialTableGroupMode === 'group';
  const shouldAwaitTaskGroups =
    initialView === 'kanban'
    || initialView === 'list'
    || (
      initialView === 'table' || initialView === 'archive-table'
    );
  const notebooksLoadPromise = loadNotebooks();
  const taskGroupsLoadPromise = shouldWarmTaskGroups ? ensureTaskGroupsLoaded() : Promise.resolve([]);

  let shouldRunMountedReconcile = false;
  if (initialLoadMode === 'full') {
    try {
      const cachedTasks = await TaskRepository.getCachedTasksOnly({
        includeRepeatTemplateDate: true
      });
      if (cachedTasks.length > 0) {
        hydrateKanbanMemoTitlesSync(cachedTasks, KANBAN_TITLE_HYDRATE_LIMIT);
        syncTaskSnapshot(cachedTasks);
        loadedTaskLoadMode.value = 'full';
        scheduleKanbanTitleHydration(120);
        shouldRunMountedReconcile = true;
      } else {
        const { tasks: lightTasks } = await TaskRepository.getKernelMaterializedTasks(
          5000,
          { includeArchived: true },
          { includeRepeatTemplateDate: true }
        );
        if (lightTasks.length > 0) {
          syncTaskSnapshot(lightTasks);
          loadedTaskLoadMode.value = 'light-base';
          shouldRunMountedReconcile = true;
        }
      }
    } catch {
      // Ignore cache read failures and fallback to view-specific load.
    }
  }

  if (!shouldRunMountedReconcile) {
    const shouldLoadInitialTasksInBackground = initialLoadMode === 'light-with-repeats';
    const initialTaskLoadPromise = loadTasks(false, {
      silent: shouldLoadInitialTasksInBackground,
      validateSelection: false,
      mode: initialLoadMode,
      view: initialView
    });
    if (shouldLoadInitialTasksInBackground) {
      void initialTaskLoadPromise;
    } else {
      await initialTaskLoadPromise;
    }
  }
  if (isCalendarTaskViewMode(currentView.value)) {
    void ensureCalendarLifelogTasksLoaded(true);
  }
  if (shouldAwaitTaskGroups) {
    await taskGroupsLoadPromise;
  }
  documentGroups.value = sortDocumentGroups(await loadDocumentGroups());
  // Restore filters only after notebook options are available. TaskManager
  // already follows this ordering; restoring earlier lets the validity pass
  // mistake a temporarily unavailable notebook for an invalid source and
  // persist "all" over the saved selection.
  await notebooksLoadPromise;
  await loadUserSettings();
  if (shouldAwaitTaskGroups) {
    // Task groups are already awaited above for the initial active view.
  } else if (kanbanGroupBy.value === 'group' || listGroupBy.value === 'group' || tableGroupBy.value === 'group') {
    void ensureTaskGroupsLoaded();
  }
  if (shouldRunMountedReconcile) {
    void loadTasks(false, {
      silent: true,
      validateSelection: false,
      mode: initialLoadMode
    });
  }
  if (normalizeInvalidNotebookFilters()) {
    await saveUserSettings();
  }
  await validateDocumentSelection();
  startSkipSetCleanup();
  document.addEventListener('mousedown', handleKanbanEditorOutsideClick);
  window.addEventListener('keydown', handleKanbanEditorKeydown);
  window.addEventListener('resize', handleKanbanEditorViewportChange);
  window.addEventListener('scroll', updateDocumentTabsDropdownPosition, true);
  window.addEventListener('resize', updateKanbanListColumnCount);
  nextTick(() => {
    updateCompactViewSwitcherMode();
    updateKanbanListColumnCount();
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const container = kanbanViewRef.value;
    if (!container) {
      return;
    }
    if (kanbanViewResizeObserver) {
      kanbanViewResizeObserver.disconnect();
    }
    kanbanViewResizeObserver = new ResizeObserver(() => {
      updateCompactViewSwitcherMode();
      updateKanbanListColumnCount();
    });
    kanbanViewResizeObserver.observe(container);
  });
});

onUnmounted(() => {
  isKanbanViewMounted = false;
  closeMobileCalendarTaskDrawer();
  cleanupEventListeners();
  stopSkipSetCleanup();
  flushSaveUserSettings();
  if (fallbackRefreshTimer !== null) {
    clearTimeout(fallbackRefreshTimer);
    fallbackRefreshTimer = null;
  }
  if (kanbanTitleHydrateTimer !== null) {
    clearTimeout(kanbanTitleHydrateTimer);
    kanbanTitleHydrateTimer = null;
  }
  if (kernelTaskIndexRefreshTimer !== null) {
    clearTimeout(kernelTaskIndexRefreshTimer);
    kernelTaskIndexRefreshTimer = null;
  }
  if (documentIconRefreshTimer !== null) {
    clearTimeout(documentIconRefreshTimer);
    documentIconRefreshTimer = null;
  }
  document.removeEventListener('mousedown', handleKanbanEditorOutsideClick);
  window.removeEventListener('keydown', handleKanbanEditorKeydown);
  window.removeEventListener('resize', handleKanbanEditorViewportChange);
  window.removeEventListener('scroll', updateDocumentTabsDropdownPosition, true);
  window.removeEventListener('resize', updateKanbanListColumnCount);
  if (kanbanViewResizeObserver) {
    kanbanViewResizeObserver.disconnect();
    kanbanViewResizeObserver = null;
  }
  closeKanbanEditor();
  removeKanbanBatchLassoListeners();
  resetKanbanBatchLasso();
  dragStatusLocks.clear();
  dragSyncSuppressUntil.clear();
  if (kanbanMetricsRaf !== null) {
    cancelAnimationFrame(kanbanMetricsRaf);
    kanbanMetricsRaf = null;
  }
  if (listViewMetricsRaf !== null) {
    cancelAnimationFrame(listViewMetricsRaf);
    listViewMetricsRaf = null;
  }
  pendingKanbanMetricColumnIds.clear();
  kanbanColumnElements.clear();
  kanbanColumnTaskHeightCache.clear();
  listViewTaskHeightCache.clear();
});

const taskDocumentIconWatchSignature = computed(() =>
  tasks.value
    .filter(task => task.type === 'block')
    .map(task => {
      const rootId = typeof task.rootId === 'string' ? task.rootId.trim() : '';
      const icon = typeof task.icon === 'string' ? task.icon.trim() : '';
      return `${rootId}:${icon}`;
    })
    .sort()
    .join('|')
);

const taskDocumentMetadataWatchSignature = computed(() =>
  tasks.value
    .filter(task => task.type === 'block')
    .map(task => {
      const rootId = typeof task.rootId === 'string' ? task.rootId.trim() : '';
      const hasPath = typeof task.hPath === 'string' && task.hPath.trim().length > 0 ? '1' : '0';
      return rootId ? `${rootId}:${hasPath}` : '';
    })
    .filter(value => value.length > 0)
    .sort()
    .join('|')
);

watch(taskDocumentIconWatchSignature, () => {
  scheduleTaskDocumentIconRefresh();
}, { immediate: true });

watch(taskDocumentMetadataWatchSignature, () => {
  scheduleTaskDocumentMetadataRefresh();
}, { immediate: true });

watch(documentTabPopoverOptions, () => {
  if (!documentTabsDropdownVisible.value) {
    return;
  }
  nextTick(() => {
    updateDocumentTabsDropdownPosition();
  });
});

watch(documentOptions, (options) => {
  const menu = documentTabContextMenu.value;
  if (!menu) {
    return;
  }
  const stillExists = options.some(option =>
    option.value === menu.value && option.notebookId === menu.notebookId
  );
  if (!stillExists) {
    closeDocumentTabContextMenu();
    return;
  }
  nextTick(() => {
    updateDocumentTabContextMenuPosition();
  });
});

watch([goalDefinitions, goalItems, goalsLoading], () => {
  if (!isSettingsLoaded.value || goalsLoading.value) {
    return;
  }
  const shouldPersistSettings = normalizeInvalidNotebookFilters();
  void validateDocumentSelection().finally(() => {
    if (shouldPersistSettings) {
      void saveUserSettings();
    }
  });
});

watch(currentView, (nextView) => {
  closeDocumentTabContextMenu();
  closeTaskViewGroupMenu();
  cancelMobileCalendarTaskDrag();
  if (isCalendarTaskViewMode(nextView)) {
    lastCalendarView.value = nextView;
    calendarRepeatWindowByView.value[nextView] = resolveDefaultRepeatWindowForView(nextView);
    void ensureCalendarLifelogTasksLoaded(true);
  }
  if (
    nextView !== 'month'
    && nextView !== 'week'
    && nextView !== 'day'
    && nextView !== 'three-day'
  ) {
    mobileCalendarTaskDrawerVisible.value = false;
    closeCalendarDisplayMenu();
  }
  if (nextView !== 'kanban' && nextView !== 'list') {
    closeKanbanFilterPopover();
    if (isKanbanBatchEditMode.value) {
      exitKanbanBatchEditMode();
    }
  }
  if (nextView !== 'table' && nextView !== 'archive-table') {
    closeTableFilterPopover();
    closeMobileTableSearch(true);
  }
  if (
    kanbanEditorVisible.value
    && (
      calendarDockEditorActive.value
        ? !isCalendarTaskViewMode(nextView)
        : (nextView !== 'kanban' && nextView !== 'list')
    )
  ) {
    closeKanbanEditor();
  }
  void ensureTasksLoadedForView(nextView, {
    silent: nextView !== 'gantt',
    validateSelection: false
  });
  if (nextView === 'kanban' || nextView === 'list') {
    void ensureTaskGroupsLoaded();
    scheduleKanbanTitleHydration(120);
    nextTick(() => {
      if (currentView.value !== nextView) {
        return;
      }
      scheduleAllKanbanMetricsUpdates();
      scheduleListViewMetricsUpdate();
    });
    if (nextView === 'list') {
      nextTick(() => {
        if (currentView.value !== nextView) {
          return;
        }
        const el = listViewRef.value;
        if (el) {
          listViewMetrics.value = { scrollTop: el.scrollTop, height: el.clientHeight };
          updateListViewMetricsAndMeasurements(el);
        }
      });
    }
    return;
  }
  if (nextView === 'table' || nextView === 'archive-table') {
    void ensureTaskGroupsLoaded();
  }
});

watch(kanbanColumns, () => {
  nextTick(() => {
    for (const column of kanbanColumns.value) {
      const el = kanbanColumnElements.get(column.id);
      if (el) {
        updateKanbanColumnMetrics(column.id, el);
      }
    }
    scheduleKanbanTitleHydration(160);
  });
});
</script>

<style scoped>
@property --document-tabs-mask-start {
  syntax: "<length>";
  inherits: false;
  initial-value: 0px;
}

@property --document-tabs-mask-end {
  syntax: "<length>";
  inherits: false;
  initial-value: 0px;
}

@keyframes document-tabs-mask-start {
  0% {
    --document-tabs-mask-start: 0px;
  }

  1%,
  100% {
    --document-tabs-mask-start: 40px;
  }
}

@keyframes document-tabs-mask-end {
  0% {
    --document-tabs-mask-end: 0px;
  }

  1%,
  100% {
    --document-tabs-mask-end: 40px;
  }
}

.kanban-view {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--b3-theme-background);
  box-sizing: border-box;
  overflow: hidden;
}

.calendar-dock-editor-frame {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--b3-theme-background);
}

.calendar-dock-editor-enter-active,
.calendar-dock-editor-leave-active {
  transition:
    opacity 200ms ease,
    transform 220ms cubic-bezier(0.2, 0, 0, 1);
  will-change: opacity, transform;
}

.calendar-dock-editor-enter-from,
.calendar-dock-editor-leave-to {
  opacity: 0;
  transform: translateX(14px);
}

.calendar-dock-editor-enter-to,
.calendar-dock-editor-leave-from {
  opacity: 1;
  transform: translateX(0);
}

@media (prefers-reduced-motion: reduce) {
  .calendar-dock-editor-enter-active,
  .calendar-dock-editor-leave-active {
    transition: none;
  }

  .calendar-dock-editor-enter-from,
  .calendar-dock-editor-leave-to,
  .calendar-dock-editor-enter-to,
  .calendar-dock-editor-leave-from {
    transform: none;
  }
}

.kanban-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  margin: 10px;
}

.kanban-header-view-module {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 0 1 auto;
  margin-left: auto;
}

.kanban-header-tools-module {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  min-width: 0;
  flex: 1 1 auto;
}

.document-tabs-row {
  margin: 0 10px 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 9px;
  min-height: 32px;
  flex-wrap: wrap;
}

.document-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
  flex: 1;
  min-width: 0;
  -webkit-mask-image: linear-gradient(
    to right,
    transparent,
    black var(--document-tabs-mask-start),
    black calc(100% - var(--document-tabs-mask-end)),
    transparent
  );
  mask-image: linear-gradient(
    to right,
    transparent,
    black var(--document-tabs-mask-start),
    black calc(100% - var(--document-tabs-mask-end)),
    transparent
  );
  animation-name: document-tabs-mask-start, document-tabs-mask-end;
  animation-range: 1px 100%, 0% calc(100% - 1px);
  animation-direction: alternate, alternate-reverse;
  animation-timeline: scroll(self x);
}

.gantt-milestone-switch {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: 8px;
  color: var(--b3-theme-on-surface);
  font-size: 12px;
  white-space: nowrap;
  cursor: pointer;
}

.gantt-milestone-checkbox {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 18px;
  height: 18px;
  padding: 2px;
  box-sizing: border-box;
  flex-shrink: 0;
}

.gantt-milestone-checkbox-icon {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  color: var(--b3-list-hover);
  transition: all 0.2s;
}

.gantt-milestone-checkbox.completed .gantt-milestone-checkbox-icon {
  color: #f98f7a;
}

.gantt-milestone-checkbox input {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.gantt-milestone-checkbox input:focus-visible + :deep(.gantt-milestone-checkbox-icon) {
  outline: 2px solid var(--b3-theme-primary);
  outline-offset: 2px;
}

.document-tabs::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.document-tabs-placeholder {
  flex: 1;
  min-width: 0;
}

.document-tabs-actions {
  display: flex;
  align-items: center;
  gap: 9px;
  justify-content: flex-end;
}

.document-tabs-dropdown {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
}

.document-tabs-dropdown-btn {
  width: 26px;
  height: 26px;
  padding: 1px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.document-tabs-dropdown-btn svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.document-tabs-dropdown-btn:hover {
  background: var(--b3-theme-background);
  border-color: var(--b3-border-color);
}

.document-tabs-dropdown-btn.active {
  background: var(--b3-theme-on-background);
  color: var(--b3-theme-background);
  border-color: var(--b3-theme-on-background);
}

.document-tabs-dropdown-popover {
  position: fixed;
  min-width: min(220px, calc(100vw - 24px));
  width: max-content;
  max-width: min(360px, calc(100vw - 24px));
  max-height: 280px;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 6px;
  border: 1px solid var(--b3-border-color);
  border-radius: 10px;
  background: var(--b3-theme-background);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.14);
  box-sizing: border-box;
  z-index: 90;
}

.document-tabs-dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 8px;
  border-radius: 8px;
  cursor: pointer;
}

.document-tabs-dropdown-item:hover {
  background: var(--b3-list-hover);
}

.document-tabs-dropdown-item.active {
  background: var(--b3-list-hover);
  color: var(--b3-theme-primary);
}

.document-tabs-dropdown-item.hidden {
  opacity: 0.65;
  cursor: default;
}

.document-tabs-dropdown-item.hidden:hover {
  background: transparent;
}

.document-tabs-dropdown-item-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}

.document-tabs-visibility-btn {
  width: 26px;
  height: 26px;
  min-width: 26px;
  min-height: 26px;
  padding: 1px;
  flex: 0 0 auto;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--b3-theme-on-surface);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.document-tabs-visibility-btn:hover {
  background: var(--b3-theme-background-light);
  color: var(--b3-theme-primary);
}

.document-tabs-visibility-btn svg {
  width: 16px;
  height: 16px;
}

.document-tabs-dropdown-empty {
  padding: 8px;
  color: var(--b3-theme-on-surface);
  opacity: 0.7;
  font-size: 12px;
}

.document-scope-picker {
  min-width: 200px;
  max-height: min(420px, calc(100vh - 80px));
  overflow: auto;
  padding: 6px;
  font-size: 12px;
  border: 1px solid var(--b3-border-color);
  border-radius: 10px;
  background: var(--b3-theme-background);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.14);
  box-sizing: border-box;
  z-index: 90;
}

.document-scope-picker-search {
  display: block;
  width: 100%;
  height: 30px;
  margin: 0 0 6px;
  padding: 0 8px;
  border: 1px solid var(--b3-border-color);
  border-radius: 6px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  font: inherit;
  box-sizing: border-box;
  outline: none;
}

.document-scope-picker-search:focus {
  border-color: var(--b3-theme-primary);
}

.document-scope-picker-row {
  display: block;
  width: 100%;
  min-height: 30px;
  padding-top: 5px;
  padding-right: 10px;
  padding-bottom: 5px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--b3-theme-on-background);
  overflow: hidden;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.document-scope-picker-row:hover,
.document-scope-picker-row.active {
  background: var(--b3-list-hover);
}

.document-scope-picker-row.active {
  font-weight: 600;
}

.document-scope-picker-all {
  padding-left: 12px;
}

.document-scope-picker-empty {
  padding: 8px;
  color: var(--b3-theme-on-surface);
  font-size: 12px;
  opacity: 0.7;
}

.table-document-actions {
  align-items: center;
}

.table-actions-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  flex: 0 0 auto;
}

.table-document-actions .active-task-filters {
  flex: 1 1 100%;
  justify-content: flex-end;
}

.task-group-menu-control {
  position: relative;
}

.task-group-menu-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--b3-theme-on-surface);
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
  padding: 0;
}

.task-group-menu-btn:hover,
.task-group-menu-btn.active {
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
}

.task-group-menu-btn svg {
  width: 16px;
  height: 16px;
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
}


.task-search {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid var(--b3-border-color);
  border-radius: 999px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-surface);
  min-height: 28px;
  flex: 0 1 220px;
  max-width: 280px;
  box-sizing: border-box;
}

.task-search input {
  border: none;
  background: transparent;
  outline: none;
  color: inherit;
  font-size: 12px;
  width: 160px;
  min-width: 90px;
}

.task-search input::placeholder {
  color: var(--b3-theme-on-surface);
  opacity: 0.5;
}

.task-search:focus-within {
  border-color: var(--b3-theme-primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.18);
}

.task-search-toggle {
  border: none;
  background: transparent;
  color: inherit;
  padding: 0;
  margin: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  cursor: pointer;
}

.task-search-icon {
  width: 14px;
  height: 14px;
  fill: currentColor;
  opacity: 0.6;
  flex-shrink: 0;
}

.task-search-clear {
  border: none;
  background: transparent;
  color: var(--b3-theme-on-surface);
  cursor: pointer;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  opacity: 0.6;
  transition: background-color 0.15s ease, opacity 0.15s ease;
}

.task-search-clear:hover {
  background: var(--b3-list-hover);
  opacity: 1;
}

.document-tab {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid transparent;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.document-tab:hover {
  background: var(--b3-theme-background);
  border-color: var(--b3-border-color);
}

.document-tab.active {
  background: var(--b3-theme-on-background);
  color: var(--b3-theme-background);
}

.document-tab-scope {
  flex: 0 0 auto;
  gap: 4px;
  padding: 3px 4px 3px 10px;
}

.document-tab-scope-label,
.document-tab-scope-toggle,
.document-tab-scope-reset {
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.document-tab-scope-label {
  min-width: 48px;
  max-width: 180px;
  padding: 3px 1px;
  overflow: hidden;
  font: inherit;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.document-tab-scope-toggle {
  flex: 0 0 25px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border-radius: 50%;
  background: color-mix(in srgb, currentColor 10%, transparent);
}

.document-tab-scope-toggle:hover,
.document-tab-scope-toggle.active,
.document-tab-scope-reset:hover {
  background: color-mix(in srgb, currentColor 15%, transparent);
}

.document-tab-scope-toggle svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.document-tab-scope-reset {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 24px;
  width: 24px;
  height: 24px;
  padding: 0;
  border-radius: 50%;
  background: color-mix(in srgb, currentColor 10%, transparent);
  font-size: 16px;
  line-height: 1;
}

.document-tab-milestone-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  margin-right: 2px;
  margin-left: -2px;
  border-radius: 50%;
  box-shadow: var(--pinch-shadow);
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
}

.document-tab.draggable {
  cursor: grab;
}

.document-tab.draggable:active {
  cursor: grabbing;
}

.document-tab.is-dragging {
  opacity: 0.45;
  transform: scale(0.96);
}

.document-tab.is-drop-target {
  border-color: var(--b3-theme-primary);
  background: color-mix(in srgb, var(--b3-theme-primary) 12%, var(--b3-theme-background));
  color: var(--b3-theme-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--b3-theme-primary) 22%, transparent);
  transform: translateY(-1px);
}

.document-tab-context-menu {
  position: fixed;
  min-width: 188px;
  max-width: min(280px, calc(100vw - 20px));
  border-radius: 12px;
  border: 1px solid var(--b3-theme-border);
  background: var(--b3-theme-background);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.18);
  padding: 8px;
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.document-tab-context-menu-title {
  padding: 0 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--b3-theme-on-background);
  word-break: break-word;
}

.document-tab-context-menu-submenu {
  position: relative;
}

.document-tab-context-menu-submenu::after {
  content: '';
  position: absolute;
  top: 0;
  left: 100%;
  width: 12px;
  height: 100%;
}

.document-tab-context-menu-trigger {
  width: 100%;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--b3-theme-on-surface);
  font-size: 12px;
  line-height: 1.2;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}

.document-tab-context-menu-submenu:hover .document-tab-context-menu-trigger,
.document-tab-context-menu-submenu:focus-within .document-tab-context-menu-trigger {
  color: var(--b3-theme-on-background);
}

.document-tab-context-menu-arrow {
  font-size: 18px;
  line-height: 10px;
}

.document-tab-context-menu-panel {
  position: absolute;
  z-index: 1;
  top: -8px;
  left: calc(100% + 12px);
  display: none;
  min-width: 188px;
  max-width: min(280px, calc(100vw - 20px));
  border: 1px solid var(--b3-theme-border);
  border-radius: 12px;
  background: var(--b3-theme-background);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.18);
  padding: 8px;
}

.document-tab-context-menu-submenu:hover .document-tab-context-menu-panel,
.document-tab-context-menu-submenu:focus-within .document-tab-context-menu-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.document-tab-context-menu-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.document-tab-context-menu-item {
  width: 100%;
  border: none;
  background: transparent;
  border-radius: 8px;
  color: var(--b3-theme-on-surface);
  font-size: 12px;
  line-height: 1.2;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.document-tab-context-menu-item:hover {
  color: var(--b3-theme-on-background);
}

.document-tab-context-menu-item.active {
  color: var(--b3-theme-on-background);
  font-weight: 600;
}

.document-tab-context-menu-empty {
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  padding: 4px 2px;
}

.document-tab-context-menu-manage {
  width: 100%;
  border: none;
  border-radius: 999px;
  background: #f98f7a;
  color: #fff;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.document-tab-context-menu-manage:hover {
  filter: brightness(0.98);
}

.task-filter-control {
  position: relative;
}

.task-filter-btn {
  border: none;
  background: transparent;
  color: var(--b3-theme-on-surface);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: background-color 0.2s ease, color 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
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

.kanban-batch-entry-btn {
  min-height: 24px;
  padding: 4px 10px;
  line-height: 1;
  font-size: 12px;
  border-radius: 999px;
  background: var(--b3-list-hover);
}

.kanban-batch-entry-btn span {
  white-space: nowrap;
}

.kanban-batch-entry-btn.active,
.kanban-batch-entry-btn.active:hover {
  background: var(--b3-theme-on-background);
  color: var(--b3-theme-background);
}

.kanban-batch-context-menu {
  position: fixed;
  z-index: 320;
  width: 200px;
  padding: 10px;
  border: 1px solid var(--b3-border-color);
  border-radius: 10px;
  background: var(--b3-theme-background);
  box-shadow: var(--pinch-menu-shadow);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.kanban-batch-context-menu-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--b3-theme-on-surface);
  font-size: 12px;
  font-weight: 600;
}

.kanban-batch-context-menu-close {
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--b3-theme-on-surface);
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
}

.kanban-batch-context-menu-close:hover,
.kanban-batch-context-menu-item:hover {
  background: var(--b3-list-hover);
}

.kanban-batch-context-menu-divider {
  height: 1px;
  margin: 1px -2px;
  background: var(--b3-border-color);
}

.kanban-batch-menu-item-with-submenu {
  position: relative;
}

.kanban-batch-context-menu-item {
  width: 100%;
  min-height: 28px;
  padding: 4px 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--b3-theme-on-surface);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  text-align: left;
  font-size: 13px;
}

.kanban-batch-context-menu-item:disabled {
  cursor: not-allowed;
  opacity: 0.56;
}

.kanban-batch-context-menu-arrow {
  color: var(--b3-theme-on-surface);
  opacity: 0.64;
  font-size: 18px;
  line-height: 1;
}

.kanban-batch-context-submenu {
  position: absolute;
  z-index: 1;
  left: calc(100% + 6px);
  top: -10px;
  width: 190px;
  max-height: min(420px, calc(100vh - 24px));
  overflow-y: auto;
  padding: 8px;
  border: 1px solid var(--b3-border-color);
  border-radius: 10px;
  background: var(--b3-theme-background);
  box-shadow: var(--pinch-menu-shadow);
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

.kanban-header h1 {
  margin: 0;
  font-size: 24px;
  color: var(--b3-theme-on-background);
}

.view-switcher {
  display: flex;
  gap: 4px;
  background: var(--b3-list-hover);
  border-radius: 99px;
  min-width: 0;
  box-shadow: var(--pinch-shadow);
}

.view-switcher.mobile-view-switcher-only {
  background: transparent;
  padding: 0;
}

.mobile-view-switcher {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.mobile-view-switcher-btn {
  height: 30px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 99px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.mobile-view-switcher-btn-text {
  font-size: 13px;
  font-weight: 500;
}

.mobile-view-switcher-btn:hover {
  background: var(--b3-theme-background);
  border-color: var(--b3-border-color);
}

.mobile-view-switcher-btn.active {
  background: var(--b3-theme-on-background);
  color: var(--b3-theme-background);
  border-color: var(--b3-theme-on-background);
}

.mobile-view-switcher-popover {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 136px;
  padding: 6px;
  border: 1px solid var(--b3-border-color);
  border-radius: 10px;
  background: var(--b3-theme-background);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.16);
  z-index: 70;
}

.mobile-view-switcher-item {
  width: 100%;
  border: none;
  background: transparent;
  color: var(--b3-theme-on-background);
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.25;
  text-align: left;
  cursor: pointer;
}

.mobile-view-switcher-item:hover {
  background: var(--b3-list-hover);
}

.mobile-view-switcher-item.active {
  background: var(--b3-list-hover);
  color: var(--b3-theme-primary);
}

.mobile-view-switcher-item span {
  flex: 1;
  min-width: 0;
}

.view-btn {
  padding: 6px 10px 6px 8px;
  border: none;
  background: transparent;
  border-radius: 99px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--b3-theme-on-surface);
  transition: all 0.2s;
}

.view-btn:hover {
  background: var(--b3-theme-background);
  box-shadow: var(--pinch-shadow);
}

.view-btn.active {
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  box-shadow: var(--pinch-shadow);
  font-weight: 700;
  opacity: 1;
}

.header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
  margin-left: 0;
  gap: 6px;
}

.exit-kanban-batch-edit-btn {
  height: 26px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: #f98f7a;
  color: var(--b3-theme-background);
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;
}


.kanban-group-switch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: 0;
  color: var(--b3-theme-on-background);
  font-size: 14px;
  white-space: nowrap;
}

.group-mode-select {
  width: calc(3em + 32px);
  min-width: calc(3em + 32px);
}

.refresh-btn,
.scope-btn,
.mobile-calendar-task-drawer-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  svg {
    color: var(--b3-theme-on-background);
  }
  &:hover {
    background: var(--b3-list-hover);
    border-radius: 7px;
  }
}

.mobile-calendar-task-drawer-btn.active {
  border-radius: 7px;
  background: var(--b3-list-hover);
}

.mobile-calendar-task-drawer-shell {
  position: fixed;
  inset: 0;
  pointer-events: none;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  padding: 0 10px calc(env(safe-area-inset-bottom) + 76px);
  z-index: 10001;
}

.mobile-calendar-task-drawer {
  width: min(680px, 100%);
  max-height: min(62vh, 620px);
  display: flex;
  flex-direction: column;
  border-radius: 18px 18px 0 0;
  border: 1px solid var(--b3-border-color);
  border-bottom: none;
  background-color: var(--Sv-theme-surface, var(--b3-theme-surface));
  box-shadow: 0 -14px 34px rgba(15, 23, 42, 0.18);
  overflow: hidden;
  pointer-events: auto;
}

.mobile-calendar-task-drawer-grabber {
  width: 44px;
  height: 4px;
  border-radius: 999px;
  background: var(--b3-border-color);
  margin: 8px auto 0;
  flex-shrink: 0;
}

.mobile-calendar-task-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0px 14px 4px;
}

.mobile-calendar-task-drawer-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--b3-theme-on-background);
}

.mobile-calendar-task-drawer-close {
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 999px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.mobile-calendar-task-drawer-hint {
  padding: 0 14px 10px;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
}

.mobile-calendar-task-drawer-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 0 10px 10px;
}

.mobile-calendar-task-drawer-body :deep(.task-manager-container) {
  margin-top: 0;
}

.mobile-calendar-task-drawer-body :deep(.task-manager-header) {
  margin-bottom: 8px;
}

.mobile-calendar-task-drawer-body :deep(.tasks-list) {
  min-height: 0;
}

.mobile-calendar-task-drag-preview {
  position: fixed;
  max-width: min(76vw, 280px);
  min-width: 180px;
  padding: 10px 12px 10px 16px;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--pinch-mobile-drag-preview-color, var(--b3-theme-primary)) 28%, transparent);
  background: color-mix(in srgb, var(--pinch-mobile-drag-preview-color, var(--b3-theme-primary)) 12%, var(--b3-card-background) 88%);
  color: var(--b3-theme-on-surface);
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.16), 0 6px 18px rgba(15, 23, 42, 0.12);
  transform: translate(0, -58%) rotate(-1.6deg) scale(1.02);
  pointer-events: none;
  z-index: 1260;
  overflow: hidden;
  backdrop-filter: blur(14px);
}

.mobile-calendar-task-drag-preview::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--pinch-mobile-drag-preview-color, var(--b3-theme-primary));
}

.mobile-calendar-task-drag-preview-title {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mobile-calendar-task-drag-preview-hint {
  margin-top: 4px;
  font-size: 11px;
  line-height: 1.3;
  color: color-mix(in srgb, var(--pinch-mobile-drag-preview-color, var(--b3-theme-primary)) 48%, var(--b3-theme-on-surface) 52%);
}


.filter-bar {
  display: flex;
  gap: 16px;
  padding: 0 12px 12px;
  border-radius: 8px;
}

.filter-bar-inline {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  min-width: 0;
  justify-content: flex-start;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-group label {
  font-size: 14px;
  color: var(--b3-theme-on-surface);
  white-space: nowrap;
  flex-shrink: 0;
}

.filter-group select,
.filter-group :deep(.b3-select) {
  border-radius: 6px;
  color: var(--b3-theme-on-background);
  font-size: 14px;
}

@media (max-width: 768px) {
  .kanban-header {
    flex-direction: row;
    align-items: center;
    flex-wrap: nowrap;
  }

  .kanban-header-tools-module {
    width: auto;
  }

  .kanban-header-tools-module {
    flex: 1 1 auto;
  }

  .kanban-header-tools-module {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 6px;
    overflow-x: auto;
  }

  .view-switcher {
    width: 100%;
    overflow-x: auto;
  }

  .view-switcher.mobile-view-switcher-only {
    width: auto;
    overflow: visible;
  }

  .filter-bar-inline {
    min-width: 0;
    flex-wrap: nowrap;
    justify-content: flex-start;
    overflow: hidden;
  }

  .header-actions {
    flex: 0 0 auto;
    margin-left: 0;
  }

  .mobile-calendar-task-drawer-btn {
    position: fixed;
    right: 14px;
    bottom: calc(env(safe-area-inset-bottom) + 76px);
    width: 48px;
    height: 48px;
    border-radius: 999px;
    background: var(--b3-theme-on-background);
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.18), 0 3px 10px rgba(15, 23, 42, 0.12);
    z-index: 51;
    backdrop-filter: blur(10px);
  }

  .mobile-calendar-task-drawer-btn svg {
    color: var(--b3-theme-background);
  }

  .mobile-calendar-task-drawer-btn.active {
    border-radius: 999px;
    background: color-mix(in srgb, var(--b3-theme-primary) 78%, var(--b3-theme-background) 22%);
    transform: translateY(-1px);
  }

  .document-tabs-actions .task-search {
    flex: 0 1 110px;
    max-width: 140px;
    transition: max-width 0.18s ease, width 0.18s ease, padding 0.18s ease, gap 0.18s ease;
  }

  .document-tabs-actions .task-search.is-mobile-collapsed {
    flex: 0 0 30px;
    width: 30px;
    min-width: 30px;
    max-width: 30px;
    padding: 4px 7px;
    gap: 0;
    justify-content: center;
  }

  .document-tabs-actions .task-search input {
    width: 80px;
    min-width: 48px;
  }

  .document-tabs-actions .task-search.is-mobile-collapsed input,
  .document-tabs-actions .task-search.is-mobile-collapsed .task-search-clear {
    display: none;
  }

  .filter-group {
    min-width: 0;
    max-width: 100%;
  }

  .filter-group :deep(.b3-select) {
    width: 100%;
    min-width: 0;
    max-width: 100%;
  }

  .kanban-batch-context-menu {
    width: min(300px, calc(100vw - 24px));
  }

  .kanban-batch-context-submenu {
    width: min(190px, calc(100vw - 24px));
  }
}

.filter-info {
  font-size: 14px;
  color: var(--b3-theme-on-surface);
  opacity: 0.7;
}

.loading {
  text-align: center;
  padding: 40px;
  color: var(--b3-theme-on-background);
  font-size: 14px;
}

.quick-create-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
}

.quick-create-dialog {
  width: min(420px, calc(100vw - 32px));
  max-width: calc(100vw - 32px);
  background: var(--b3-theme-surface);
  border: 1px solid var(--b3-border-color);
  border-radius: 10px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
  padding: 14px;
  overflow: hidden;
  box-sizing: border-box;
}

.quick-create-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--b3-theme-on-background);
  margin-bottom: 10px;
}

.quick-create-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.quick-create-row label {
  width: 48px;
  flex-shrink: 0;
  color: var(--b3-theme-on-surface);
  font-size: 13px;
}

.quick-create-input {
  display: block;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  margin-top: 4px;
  border: none;
  border-radius: 8px;
  background-color: var(--Sv-select-field);
  box-shadow: none;
  color: var(--b3-theme-on-background);
  font-size: 14px;
  padding: 8px 10px;
  outline: none;
  box-sizing: border-box;
}

.quick-create-input:focus {
  border: none;
  box-shadow: none;
}

.quick-create-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.quick-create-btn {
  border: none;
  border-radius: 20px;
  padding: 4px 10px;
  font-size: 13px;
  cursor: pointer;
  color: var(--b3-theme-on-background);
}

.quick-create-btn.cancel {
  background: var(--b3-list-hover);
}

.quick-create-btn.confirm {
  background: #f98f7a;
  color: #fff;
}

.kanban-board {
  display: flex;
  gap: 10px;
  flex: 1;
  overflow-x: auto;
  align-items: flex-start;
  min-height: 0;
  margin: 0 10px;
}

.kanban-list-view {
  flex: 1 1 0;
  min-height: 0;
  height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  margin: 0;
  padding: 10px;
  box-sizing: border-box;
  overscroll-behavior: contain;
  background: radial-gradient(var(--b3-border-color) 1.5px, var(--b3-list-hover) 1px) 0 0 / 20px 20px;
}

.kanban-list-masonry {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.kanban-list-action-section {
  cursor: pointer;
}

.kanban-list-action-body {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 14px 10px;
  color: var(--b3-theme-on-background);
  font-size: 14px;
  font-weight: 500;
  background: var(--b3-theme-background);
  transition: background 0.15s ease;
}

.kanban-list-action-body:hover {
  background: var(--b3-list-hover);
}

.kanban-list-masonry-column {
  flex: 1 1 0;
  min-width: 0;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.kanban-list-section {
  display: block;
  width: 100%;
  margin: 0;
  border-radius: 16px;
  box-shadow:  var(--pinch-shadow);
  overflow: hidden;
  box-sizing: border-box;
  background: var(--b3-theme-background);
}

.kanban-list-section.drag-over {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.14), #0000000f 0 2px 8px;
  background: rgba(59, 130, 246, 0.08);
}

.kanban-list-section-header {
  min-height: 42px;
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  box-sizing: border-box;
  background: var(--b3-theme-background);
}

.kanban-list-section-title-wrap {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.kanban-list-section-title {
  min-width: 0;
  color: var(--b3-theme-on-background);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kanban-list-section-meta {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.kanban-list-section-count {
  min-width: 24px;
  color: var(--b3-theme-on-surface);
  font-size: 12px;
  text-align: center;
  opacity: 0.76;
}

.kanban-list-section-toggle {
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

.kanban-list-section-toggle:hover {
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
}

.kanban-list-section-toggle svg {
  width: 14px;
  height: 14px;
  transition: transform 0.2s ease;
  transform: rotate(90deg);
}

.kanban-list-section-toggle.collapsed svg {
  transform: rotate(0deg);
}

.kanban-list-section-body {
  background: var(--b3-theme-background);
  padding: 2px 10px 8px;
}

.kanban-list-task-item :deep(.task-card.variant-sidebar) {
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  padding: 8px 0;
  cursor: default;
}

.kanban-list-task-item :deep(.task-card.variant-sidebar[draggable="true"]) {
  cursor: grab;
}

.kanban-list-task-item :deep(.task-card.variant-sidebar[draggable="true"]:active) {
  cursor: grabbing;
}

.kanban-list-task-item :deep(.task-card.variant-sidebar:hover) {
  background: transparent;
  box-shadow: none;
}

.kanban-list-task-item :deep(.task-card.variant-sidebar .task-card-content) {
  cursor: pointer;
}

.kanban-list-task-item :deep(.task-card.variant-sidebar .task-title) {
  white-space: normal;
}

.kanban-list-task-item :deep(.task-card.variant-sidebar .task-title *) {
  white-space: normal;
}

.kanban-list-task-item :deep(.task-card.variant-sidebar .task-description),
.kanban-list-task-item :deep(.task-card.variant-sidebar .task-badges),
.kanban-list-task-item :deep(.task-card.variant-sidebar .task-document-title) {
  margin-left: 26px;
}

.kanban-column {
  flex: 1;
  min-width: 280px;
  max-width: 350px;
  display: flex;
  flex-direction: column;
  background: var(--b3-list-hover);
  border-radius: 15px;
  overflow: hidden;
  height: fit-content;
  max-height: 100%;
}

.kanban-column.action-column {
  min-width: 200px;
  max-width: 240px;
  background: transparent;
  box-shadow: none;
}

.action-column-body {
  min-height: 107px;
  align-items: center;
  justify-content: center;
  background: var(--b3-list-hover);
}

.kanban-add-group-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid var(--b3-border-color);
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.kanban-add-group-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.column-header {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
}

.column-header-main {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1 1 auto;
}

.group-column-reorder-header {
  user-select: none;
  cursor: grab;
}

.group-column-reorder-header:active {
  cursor: grabbing;
}

.group-column-reorder-dragging {
  opacity: 0.58;
}

.group-column-reorder-target {
  background: rgba(59, 130, 246, 0.08);
}

.group-column-reorder-before::before,
.group-column-reorder-after::after {
  content: '';
  position: absolute;
  top: 6px;
  bottom: 6px;
  width: 3px;
  border-radius: 999px;
  background: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
  pointer-events: none;
}

.group-column-reorder-before::before {
  left: 2px;
}

.group-column-reorder-after::after {
  right: 2px;
}

.column-header-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.column-count {
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  opacity: 0.72;
  min-width: 24px;
  text-align: center;
}

.column-add-task-btn,
.column-archive-tasks-btn {
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--b3-theme-on-surface);
  cursor: pointer;
  padding: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.column-add-task-btn:hover,
.column-archive-tasks-btn:hover:not(:disabled) {
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
}

.column-add-task-btn:focus-visible,
.column-archive-tasks-btn:focus-visible {
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  outline: none;
}

.column-archive-tasks-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.column-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
  color: var(--b3-theme-on-background);
  min-width: 0;
}

.column-title-editing {
  flex: 1;
}

.column-title-input {
  width: 100%;
  min-width: 0;
  border: none;
  border-radius: 8px;
  background-color: var(--Sv-select-field);
  box-shadow: none;
  color: var(--b3-theme-on-background);
  font-size: 14px;
  font-weight: 500;
  padding: 4px 8px;
  outline: none;
}

.column-title-input:focus {
  border: none;
  box-shadow: inset 0 0 0 1px var(--b3-theme-primary);
}

.column-title-input:disabled {
  opacity: 0.6;
  cursor: default;
}

.column-title-button {
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  transition: opacity 0.2s ease;
}

.column-title-button:hover {
  opacity: 0.8;
}

.column-title-button:focus-visible {
  outline: 2px solid #f98f7a;
  outline-offset: 4px;
  border-radius: 8px;
}

.column-title-text {
  min-width: 0;
}

.column-tasks {
  flex: 1;
  overflow-y: auto;
  padding: 1px 8px 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.column-task-spacer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.kanban-batch-item.is-batch-mode :deep(.task-card.variant-kanban) {
  cursor: pointer;
}

.kanban-batch-item.is-batch-mode :deep(.task-card.variant-kanban .task-card-content) {
  cursor: pointer;
}

.kanban-batch-item.is-batch-mode:hover :deep(.task-card.variant-kanban) {
  box-shadow: 0 0 0 1px rgba(249, 143, 122, 0.35), 0 2px 8px rgba(0, 0, 0, 0.08);
}

.kanban-batch-item.selected :deep(.task-card.variant-kanban) {
  background: var(--b3-list-hover);
  box-shadow: 0 0 0 1px rgba(249, 143, 122, 0.78), 0 4px 12px rgba(249, 143, 122, 0.18);
}

.kanban-batch-lasso {
  position: fixed;
  z-index: 80;
  border: 1px solid rgba(249, 143, 122, 0.95);
  background: rgba(249, 143, 122, 0.16);
  border-radius: 4px;
  pointer-events: none;
  box-sizing: border-box;
}

.kanban-task-move-dialog-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.kanban-task-move-dialog {
  width: min(340px, calc(100% - 24px));
  max-height: calc(100% - 24px);
  background: var(--b3-theme-surface);
  border: 1px solid var(--b3-border-color);
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.kanban-task-move-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--b3-border-color);
}

.kanban-task-move-dialog-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--b3-theme-on-background);
}

.kanban-task-move-dialog-close {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--b3-theme-on-background);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.kanban-task-move-dialog-close:hover {
  background: var(--b3-list-hover);
}

.kanban-task-move-dialog-body {
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
}

.kanban-task-move-dialog-field {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.kanban-task-move-dialog-field :deep(.b3-select.fn__flex-center) {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.kanban-task-move-dialog-field label {
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  opacity: 0.8;
}

.kanban-task-move-dialog-hint {
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  opacity: 0.75;
  line-height: 1.5;
}

.kanban-task-move-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 12px 12px;
}

.kanban-task-move-dialog-btn {
  border: 1px solid var(--b3-border-color);
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
}

.kanban-task-move-dialog-btn.confirm {
  border-color: var(--b3-theme-primary);
  color: var(--b3-theme-primary);
}

.kanban-task-move-dialog-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.column-tasks.drag-over {
  background: rgba(59, 130, 246, 0.15);
  border: 2px dashed #3b82f6;
  border-radius: 8px;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
  transition: all 0.2s ease;
}


.empty-column {
  text-align: center;
  padding: 20px;
  color: var(--b3-theme-on-surface);
  opacity: 0.5;
  font-size: 14px;
}

.task-group-menu-popover.quadrant-settings-popover {
  width: 220px;
}

.quadrant-urgency-setting {
  padding: 7px 10px 5px;
}

.quadrant-urgency-setting label {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
}

.quadrant-urgency-setting strong {
  color: var(--b3-theme-on-background);
  font-weight: 600;
}

.quadrant-urgency-setting input {
  width: 100%;
  height: 6px;
  margin: 8px 0;
  padding: 0;
  appearance: none;
  border: 0;
  border-radius: 999px;
  outline: 0;
  background: linear-gradient(
    to right,
    #f98f7a 0 var(--quadrant-urgency-progress),
    var(--b3-list-hover) var(--quadrant-urgency-progress) 100%
  );
}

.quadrant-urgency-setting input::-webkit-slider-runnable-track {
  height: 6px;
  border: 0;
  border-radius: 999px;
  background: transparent;
}

.quadrant-urgency-setting input::-webkit-slider-thumb {
  width: 18px;
  height: 18px;
  margin-top: -6px;
  appearance: none;
  border: 0;
  border-radius: 50%;
  background: #f98f7a;
}

.quadrant-urgency-setting input::-moz-range-track {
  height: 6px;
  border: 0;
  border-radius: 999px;
  background: var(--b3-list-hover);
}

.quadrant-urgency-setting input::-moz-range-progress {
  height: 6px;
  border: 0;
  border-radius: 999px;
  background: #f98f7a;
}

.quadrant-urgency-setting input::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border: 0;
  border-radius: 50%;
  background: #f98f7a;
}

.quadrant-urgency-anchors {
  position: relative;
  height: 16px;
  color: var(--b3-theme-on-surface);
  font-size: 11px;
  opacity: 0.65;
}

.quadrant-urgency-anchors span {
  position: absolute;
  transform: translateX(-50%);
}

.quadrant-board {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 0 10px 10px;
  overflow: auto;
}

.quadrant-section {
  min-width: 0;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--b3-border-color);
  border-radius: 10px;
  overflow: hidden;
  background: var(--b3-theme-surface);
}

.quadrant-section.is-drag-over {
  border-color: var(--b3-theme-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--b3-theme-primary) 18%, transparent);
}

.quadrant-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 11px;
}

.quadrant-section-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.quadrant-section-count {
  min-width: 20px;
  padding: 1px 6px;
  border-radius: 999px;
  text-align: center;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  background: var(--b3-list-hover);
}

.quadrant-important-urgent .quadrant-section-header h3 { color: var(--pinch-group-color10); }
.quadrant-important-not-urgent .quadrant-section-header h3 { color: var(--pinch-group-color4
  ); }
.quadrant-not-important-urgent .quadrant-section-header h3 { color: var(--pinch-group-color7); }
.quadrant-not-important-not-urgent .quadrant-section-header h3 { color: var(--pinch-group-color5); }

.quadrant-important-urgent { background: color-mix(in srgb, var(--pinch-background10-color) 50%, var(--b3-theme-background)); }
.quadrant-important-not-urgent { background: color-mix(in srgb, var(--pinch-background4-color) 50%, var(--b3-theme-background)); }
.quadrant-not-important-urgent { background: color-mix(in srgb, var(--pinch-background7-color) 50%, var(--b3-theme-background)); }
.quadrant-not-important-not-urgent { background: color-mix(in srgb, var(--pinch-background5-color) 50%, var(--b3-theme-background)); }

.quadrant-important-urgent { border-color: var(--pinch-color10); }
.quadrant-important-not-urgent { border-color: var(--pinch-color3); }
.quadrant-not-important-urgent { border-color: var(--pinch-color7); }
.quadrant-not-important-not-urgent { border-color: var(--pinch-color5); }

.quadrant-section-tasks {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  overflow: auto;
}

.quadrant-task-spacer {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  box-sizing: border-box;
}

.quadrant-empty {
  padding: 22px 10px;
  text-align: center;
  font-size: 13px;
  color: var(--b3-theme-on-surface);
  opacity: 0.55;
}

@media (max-width: 700px) {
  .quadrant-board {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: none;
  }

  .quadrant-section {
    min-height: 180px;
  }
}
</style>
