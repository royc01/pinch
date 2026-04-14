<template>
    <div ref="kanbanViewRef" class="kanban-view">
      <div class="kanban-header">
        <div class="kanban-header-view-module">
          <div
            class="view-switcher"
            :class="{ 'mobile-view-switcher-only': isMobileFrontend || isCompactViewSwitcher }"
          >
            <template v-if="isMobileFrontend || isCompactViewSwitcher">
              <div ref="mobileViewSwitcherControlRef" class="mobile-view-switcher">
                <button
                  type="button"
                  class="mobile-view-switcher-btn"
                  :class="{ active: mobileViewSwitcherVisible }"
                  :title="`切换视图（当前：${currentViewOption.text}）`"
                  :aria-label="`切换视图（当前：${currentViewOption.text}）`"
                  @click.stop="toggleMobileViewSwitcher"
                >
                  <Icon :name="currentViewOption.icon" width="16" height="16" />
                </button>
                <div
                  v-if="mobileViewSwitcherVisible"
                  ref="mobileViewSwitcherPopoverRef"
                  class="mobile-view-switcher-popover"
                  @click.stop
                >
                  <button
                    v-for="option in viewSwitcherOptions"
                    :key="option.value"
                    type="button"
                    class="mobile-view-switcher-item"
                    :class="{ active: currentView === option.value }"
                    @click="selectMobileView(option.value)"
                  >
                    <Icon :name="option.icon" width="16" height="16" />
                    <span>{{ option.text }}</span>
                  </button>
                </div>
              </div>
            </template>
            <template v-else>
              <button :class="['view-btn', { active: currentView === 'kanban' }]" @click="currentView = 'kanban'">
                <Icon name="kanban" width="16" height="16" />
                <span>看板</span>
              </button>
              <button :class="['view-btn', { active: currentView === 'table' }]" @click="currentView = 'table'">
                <Icon name="table" width="16" height="16" />
                <span>表格</span>
              </button>
              <button :class="['view-btn', { active: currentView === 'month' }]" @click="currentView = 'month'">
                <Icon name="month" width="16" height="16" />
                <span>月视图</span>
              </button>
              <button :class="['view-btn', { active: currentView === 'week' }]" @click="currentView = 'week'">
                <Icon name="week" width="16" height="16" />
                <span>周视图</span>
              </button>
              <button :class="['view-btn', { active: currentView === 'three-day' }]" @click="currentView = 'three-day'">
                <Icon name="threeDay" width="16" height="16" />
                <span>三日图</span>
              </button>
              <button :class="['view-btn', { active: currentView === 'day' }]" @click="currentView = 'day'">
                <Icon name="day" width="16" height="16" />
                <span>日视图</span>
              </button>
              <button :class="['view-btn', { active: currentView === 'archive-table' }]" @click="currentView = 'archive-table'">
                <Icon name="table" width="16" height="16" />
                <span>归档</span>
              </button>
            </template>
          </div>
        </div>

        <div class="kanban-header-tools-module">
          <div v-if="currentView === 'kanban'" class="filter-bar-inline">
            <div class="filter-group">
              <label>笔记本:</label>
              <SySelect
                :model-value="kanbanFilterType"
                @update:model-value="kanbanFilterType = $event"
                :options="notebookOptions"
              />
            </div>
          </div>

          <div v-if="currentView === 'table' || currentView === 'archive-table'" class="filter-bar-inline">
            <div class="filter-group">
              <label>笔记本:</label>
              <SySelect
                :model-value="tableFilterType"
                @update:model-value="tableFilterType = $event"
                :options="notebookOptions"
              />
            </div>
          </div>

          <div v-if="currentView === 'month'" class="filter-bar-inline">
            <div class="filter-group">
              <label>笔记本:</label>
              <SySelect
                :model-value="monthFilterType"
                @update:model-value="monthFilterType = $event"
                :options="notebookOptions"
              />
            </div>
          </div>

          <div v-if="currentView === 'week'" class="filter-bar-inline">
            <div class="filter-group">
              <label>笔记本:</label>
              <SySelect
                :model-value="weekFilterType"
                @update:model-value="weekFilterType = $event"
                :options="notebookOptions"
              />
            </div>
          </div>

          <div v-if="currentView === 'day' || currentView === 'three-day'" class="filter-bar-inline">
            <div class="filter-group">
              <label>笔记本:</label>
              <SySelect
                :model-value="dayFilterType"
                @update:model-value="dayFilterType = $event"
                :options="notebookOptions"
              />
            </div>
          </div>

          <div class="header-actions">
            <button
              type="button"
              class="scope-btn"
              title="任务范围"
              aria-label="任务范围"
              @click="openTaskScopeDialog"
            >
              <Icon name="taskScope" width="24" height="24" />
            </button>
            <button @click="refreshTasks" class="refresh-btn" title="刷新任务" aria-label="刷新任务">
              <Icon name="refresh" width="24" height="24" />
            </button>
            <button
              v-if="currentView === 'kanban' || currentView === 'table'"
              type="button"
              class="new-task-btn"
              title="新建任务"
              aria-label="新建任务"
              @click="openHeaderTaskModal"
            >
              <Icon name="add" width="24" height="24" />
            </button>
          </div>
        </div>
      </div>
      <div
        v-if="showDocumentTabs || currentView === 'kanban' || currentView === 'table' || currentView === 'archive-table' || currentView === 'month' || currentView === 'week' || currentView === 'three-day' || currentView === 'day'"
        class="document-tabs-row"
      >
      <div
        v-if="showDocumentTabs"
        ref="documentTabsRef"
        class="document-tabs"
        @wheel="handleDocumentTabsWheel"
      >
        <button
          v-for="option in visibleDocumentOptions"
          :key="option.value"
          type="button"
          class="document-tab"
          :class="{ active: currentDocumentFilter === option.value }"
          @click="currentDocumentFilter = option.value"
        >
          {{ option.text }}
        </button>
      </div>
      <div v-else class="document-tabs-placeholder"></div>
      <div
        v-if="currentView === 'kanban' || currentView === 'table' || currentView === 'archive-table' || currentView === 'month' || currentView === 'week' || currentView === 'three-day' || currentView === 'day'"
        ref="documentTabsDropdownControlRef"
        class="document-tabs-dropdown"
      >
        <button
          type="button"
          class="document-tabs-dropdown-btn"
          :class="{ active: documentTabsDropdownVisible }"
          title="文档标签列表"
          aria-label="文档标签列表"
          @click.stop="toggleDocumentTabsDropdown"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 10l5 5 5-5" />
          </svg>
        </button>
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
              class="document-tabs-visibility-btn"
              :title="option.hidden ? '显示标签页' : '隐藏标签页'"
              :aria-label="option.hidden ? '显示标签页' : '隐藏标签页'"
              @click.stop="toggleDocumentTabVisibility(option.value)"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  v-if="option.hidden"
                  fill="currentColor"
                  d="M10.94,6.08A6.93,6.93,0,0,1,12,6c3.18,0,6.17,2.29,7.91,6a15.23,15.23,0,0,1-.9,1.64,1,1,0,0,0-.16.55,1,1,0,0,0,1.86.5,15.77,15.77,0,0,0,1.21-2.3,1,1,0,0,0,0-.79C19.9,6.91,16.1,4,12,4a7.77,7.77,0,0,0-1.4.12,1,1,0,1,0,.34,2ZM3.71,2.29A1,1,0,0,0,2.29,3.71L5.39,6.8a14.62,14.62,0,0,0-3.31,4.8,1,1,0,0,0,0,.8C4.1,17.09,7.9,20,12,20a9.26,9.26,0,0,0,5.05-1.54l3.24,3.25a1,1,0,0,0,1.42,0,1,1,0,0,0,0-1.42Zm6.36,9.19,2.45,2.45A1.81,1.81,0,0,1,12,14a2,2,0,0,1-2-2A1.81,1.81,0,0,1,10.07,11.48ZM12,18c-3.18,0-6.17-2.29-7.9-6A12.09,12.09,0,0,1,6.8,8.21L8.57,10A4,4,0,0,0,14,15.43L15.59,17A7.24,7.24,0,0,1,12,18Z"
                />
                <path
                  v-else
                  fill="currentColor"
                  d="M21.92,11.6C19.9,6.91,16.1,4,12,4S4.1,6.91,2.08,11.6a1,1,0,0,0,0,.8C4.1,17.09,7.9,20,12,20s7.9-2.91,9.92-7.6A1,1,0,0,0,21.92,11.6ZM12,18c-3.17,0-6.17-2.29-7.9-6C5.83,8.29,8.83,6,12,6s6.17,2.29,7.9,6C18.17,15.71,15.17,18,12,18ZM12,8a4,4,0,1,0,4,4A4,4,0,0,0,12,8Zm0,6a2,2,0,1,1,2-2A2,2,0,0,1,12,14Z"
                />
              </svg>
            </button>
          </div>
          <div v-if="documentTabPopoverOptions.length === 0" class="document-tabs-dropdown-empty">
            暂无文档标签
          </div>
        </div>
      </div>
      <div v-if="currentView === 'kanban'" class="document-tabs-actions">
        <div ref="kanbanFilterControlRef" class="task-filter-control">
          <button
            type="button"
            class="task-filter-btn"
            :class="{ active: kanbanFilterPopoverVisible || hasActiveKanbanFilters }"
            title="筛选任务"
            aria-label="筛选任务"
            @click.stop="toggleKanbanFilterPopover($event)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 5h18" />
              <path d="M7 12h10" />
              <path d="M10 19h4" />
            </svg>
            <span v-if="activeKanbanFilterCount > 0" class="task-filter-count">
              {{ activeKanbanFilterCount }}
            </span>
          </button>
        </div>
        <div ref="taskViewGroupMenuControlRef" class="task-group-menu-control">
          <button
            type="button"
            class="task-group-menu-btn"
            :class="{
              active: taskViewGroupMenuVisible || activeTaskViewGroupMode !== 'status' || !showCompletedTasks,
              'is-batch-active': currentView === 'kanban' && isKanbanBatchEditMode
            }"
            title="视图设置"
            aria-label="视图设置"
            @click.stop="toggleTaskViewGroupMenu"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12,7a2,2,0,1,0-2-2A2,2,0,0,0,12,7Zm0,10a2,2,0,1,0,2,2A2,2,0,0,0,12,17Zm0-7a2,2,0,1,0,2,2A2,2,0,0,0,12,10Z" />
            </svg>
          </button>
          <div
            v-if="taskViewGroupMenuVisible"
            ref="taskViewGroupMenuPopoverRef"
            class="task-group-menu-popover"
            @click.stop
          >
            <button
              v-for="option in currentTaskViewGroupOptions"
              :key="`kanban-group:${option.value}`"
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
              :class="{ active: isKanbanBatchEditMode }"
              @click.stop="toggleKanbanBatchEditModeFromMenu"
            >
              <span>{{ isKanbanBatchEditMode ? '退出批量编辑' : '进入批量编辑' }}</span>
              <span v-if="isKanbanBatchEditMode" class="task-group-menu-check">
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
              @click.stop="toggleKanbanTaskCardDetailsFromMenu"
            >
              <span>{{ showKanbanTaskCardDetails ? '隐藏详细' : '显示详细' }}</span>
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
              v-if="hasVisibleExpandableKanbanTasks"
              type="button"
              class="task-group-menu-item"
              @click.stop="toggleAllVisibleKanbanDetailsFromMenu"
            >
              <span>{{ areAllVisibleKanbanDetailsExpanded ? '一键折叠详情' : '一键展开详情' }}</span>
            </button>
          </div>
        </div>
      </div>
        <div v-else-if="currentView === 'table' || currentView === 'archive-table'" class="document-tabs-actions table-document-actions">
          <div class="table-actions-row">
            <div
              ref="tableSearchControlRef"
              class="task-search"
              :class="{ 'is-mobile-collapsed': isMobileTaskSearchCollapsed }"
            >
              <button
                type="button"
                class="task-search-toggle"
                :title="isMobileTaskSearchCollapsed ? '展开搜索' : '搜索任务'"
                :aria-label="isMobileTaskSearchCollapsed ? '展开搜索' : '搜索任务'"
                @click.stop="handleTaskSearchToggleClick"
              >
                <svg class="task-search-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M10.5 3a7.5 7.5 0 1 0 4.83 13.24l3.46 3.46a1 1 0 0 0 1.42-1.42l-3.46-3.46A7.5 7.5 0 0 0 10.5 3zm0 2a5.5 5.5 0 1 1 0 11a5.5 5.5 0 0 1 0-11z"
                  />
                </svg>
              </button>
              <input
                v-show="!isMobileTaskSearchCollapsed"
                ref="tableSearchInputRef"
                v-model="tableSearchQuery"
                type="search"
                placeholder="搜索任务"
                aria-label="搜索任务"
                @keydown.esc.stop.prevent="handleTableSearchEscape"
              />
              <button
                v-if="tableSearchQuery && !isMobileTaskSearchCollapsed"
                type="button"
                class="task-search-clear"
                aria-label="清除搜索"
                @click="tableSearchQuery = ''"
              >
                ×
              </button>
            </div>
            <div ref="tableFilterControlRef" class="task-filter-control">
              <button
                type="button"
                class="task-filter-btn"
                :class="{ active: tableFilterPopoverVisible || hasActiveTableFilters }"
                title="筛选任务"
                aria-label="筛选任务"
                @click.stop="toggleTableFilterPopover($event)"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 5h18" />
                  <path d="M7 12h10" />
                  <path d="M10 19h4" />
                </svg>
                <span v-if="activeTableFilterCount > 0" class="task-filter-count">
                  {{ activeTableFilterCount }}
                </span>
              </button>
            </div>
            <div ref="taskViewGroupMenuControlRef" class="task-group-menu-control">
              <button
                type="button"
                class="task-group-menu-btn"
                :class="{ active: taskViewGroupMenuVisible || activeTaskViewGroupMode !== 'status' || !showCompletedTasks }"
                title="视图设置"
                aria-label="视图设置"
                @click.stop="toggleTaskViewGroupMenu"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12,7a2,2,0,1,0-2-2A2,2,0,0,0,12,7Zm0,10a2,2,0,1,0,2,2A2,2,0,0,0,12,17Zm0-7a2,2,0,1,0,2,2A2,2,0,0,0,12,10Z" />
                </svg>
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
                  <span>隐藏已完成任务</span>
                  <span v-if="!showCompletedTasks" class="task-group-menu-check">
                    <Icon name="taskCheckboxChecked" width="12" height="12" />
                  </span>
                </button>
              </div>
            </div>
          </div>
      </div>
    </div>

    <div
      v-if="currentView === 'kanban' && isKanbanBatchEditMode"
      class="kanban-batch-toolbar"
    >
      <div class="kanban-batch-toolbar-header">
        <span class="kanban-batch-selected-count">已选 {{ kanbanBatchSelectedCount }} 项</span>
        <div class="kanban-batch-toolbar-actions">
          <button type="button" class="kanban-batch-tool-btn" @click="toggleSelectAllVisibleKanbanTasks">
            {{ allVisibleKanbanTasksSelected ? '取消全选' : '全选当前视图' }}
          </button>
          <button
            type="button"
            class="kanban-batch-tool-btn"
            :disabled="kanbanBatchSelectedCount === 0"
            @click="clearKanbanBatchSelection"
          >
            清空选择
          </button>
        </div>
      </div>
      <div class="kanban-batch-edit-grid">
        <label class="kanban-batch-field">
          <span>状态</span>
          <SySelect
            :model-value="kanbanBatchEditStatus"
            :options="kanbanBatchStatusOptions"
            @update:model-value="kanbanBatchEditStatus = String($event || '')"
          />
        </label>
        <label class="kanban-batch-field">
          <span>优先级</span>
          <SySelect
            :model-value="kanbanBatchEditPriority"
            :options="kanbanBatchPriorityOptions"
            @update:model-value="kanbanBatchEditPriority = String($event || '')"
          />
        </label>
        <label class="kanban-batch-field">
          <span>标签</span>
          <SySelect
            :model-value="kanbanBatchEditGroupId"
            :options="kanbanBatchGroupOptions"
            @update:model-value="kanbanBatchEditGroupId = String($event || '')"
          />
        </label>
        <button
          type="button"
          class="kanban-batch-apply-btn"
          :disabled="!canApplyKanbanBatchEdit"
          @click="applyKanbanBatchEdit"
        >
          {{ isKanbanBatchApplying ? '应用中...' : '应用到已选' }}
        </button>
      </div>
    </div>
    <div v-if="loading" class="loading">加载中...</div>
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
              class="kanban-add-group-btn"
              :title="getActionColumnButtonLabel(column)"
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
                <span
                  v-if="isKanbanBatchEditMode"
                  class="column-batch-checkbox-btn"
                  :class="{
                    partial: isKanbanColumnBatchPartiallySelected(column),
                    'is-disabled': getColumnTaskCount(column) === 0
                  }"
                  :title="isKanbanColumnBatchAllSelected(column) ? '取消全选该列' : '全选该列'"
                  :aria-label="isKanbanColumnBatchAllSelected(column) ? '取消全选该列' : '全选该列'"
                  :aria-disabled="getColumnTaskCount(column) === 0"
                  @click.stop="toggleKanbanColumnBatchSelection(column)"
                >
                  <TaskCheckbox
                    :checked="isKanbanColumnBatchAllSelected(column)"
                    :size="18"
                  />
                </span>
                <span v-else class="column-title-dot" :style="getKanbanColumnDotStyle(column)"></span>
                <input
                  ref="columnTitleInputRef"
                  v-model="columnTitleDraft"
                  class="column-title-input"
                  type="text"
                  :placeholder="column.type === 'group' ? '请输入标签名称' : '请输入标题名称'"
                  :disabled="isSavingColumnTitle"
                  @keydown.enter.prevent.stop="submitColumnTitleEdit(column)"
                  @keydown.esc.prevent.stop="cancelColumnTitleEdit()"
                  @blur="submitColumnTitleEdit(column)"
                />
              </div>
              <button
                v-else-if="canEditColumnTitle(column)"
                type="button"
                class="column-title column-title-button"
                :title="column.type === 'group' ? '编辑标签名称' : '编辑标题名称'"
                @click.stop="startColumnTitleEdit(column)"
              >
                <span
                  v-if="isKanbanBatchEditMode"
                  class="column-batch-checkbox-btn"
                  :class="{
                    partial: isKanbanColumnBatchPartiallySelected(column),
                    'is-disabled': getColumnTaskCount(column) === 0
                  }"
                  :title="isKanbanColumnBatchAllSelected(column) ? '取消全选该列' : '全选该列'"
                  :aria-label="isKanbanColumnBatchAllSelected(column) ? '取消全选该列' : '全选该列'"
                  :aria-disabled="getColumnTaskCount(column) === 0"
                  @click.stop="toggleKanbanColumnBatchSelection(column)"
                >
                  <TaskCheckbox
                    :checked="isKanbanColumnBatchAllSelected(column)"
                    :size="18"
                  />
                </span>
                <span v-else class="column-title-dot" :style="getKanbanColumnDotStyle(column)"></span>
                <span class="column-title-text">{{ getKanbanColumnTitleText(column) }}</span>
              </button>
              <div v-else class="column-title">
                <span
                  v-if="isKanbanBatchEditMode"
                  class="column-batch-checkbox-btn"
                  :class="{
                    partial: isKanbanColumnBatchPartiallySelected(column),
                    'is-disabled': getColumnTaskCount(column) === 0
                  }"
                  :title="isKanbanColumnBatchAllSelected(column) ? '取消全选该列' : '全选该列'"
                  :aria-label="isKanbanColumnBatchAllSelected(column) ? '取消全选该列' : '全选该列'"
                  :aria-disabled="getColumnTaskCount(column) === 0"
                  @click.stop="toggleKanbanColumnBatchSelection(column)"
                >
                  <TaskCheckbox
                    :checked="isKanbanColumnBatchAllSelected(column)"
                    :size="18"
                  />
                </span>
                <span v-else class="column-title-dot" :style="getKanbanColumnDotStyle(column)"></span>
                <span class="column-title-text">{{ getKanbanColumnTitleText(column) }}</span>
              </div>
            </div>
            <div class="column-header-actions">
              <div class="column-count">{{ getColumnTaskCount(column) }}</div>
              <button
                v-if="canCreateTaskInColumn(column)"
                type="button"
                class="column-add-task-btn"
                :title="getColumnCreateTaskLabel(column)"
                :aria-label="getColumnCreateTaskLabel(column)"
                @click.stop="openQuickCreateForKanbanColumn(column)"
              >
                <svg viewBox="0 0 1024 1024" width="16" height="16" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M836 476H548V188c0-19.8-16.2-36-36-36s-36 16.2-36 36v288H188c-19.8 0-36 16.2-36 36s16.2 36 36 36h288v288c0 19.8 16.2 36 36 36s36-16.2 36-36V548h288c19.8 0 36-16.2 36-36s-16.2-36-36-36z"
                  />
                </svg>
              </button>
              <button
                v-if="canCreateTaskInColumn(column)"
                type="button"
                class="column-archive-tasks-btn"
                :title="getColumnArchiveTasksLabel(column)"
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
              >
                <TaskCard
                  :task="task"
                  variant="kanban"
                  :task-groups="taskGroups"
                  :show-status-badge="kanbanGroupBy !== 'status'"
                  :completed="isTaskCompletedVisual(task)"
                  :draggable="!isMobileFrontend && kanbanSupportsDrag && !isKanbanBatchEditMode"
                  :dragging="!!(draggedTask && draggedTask.id === task.id)"
                  :expanded="isKanbanTaskExpanded(task.id)"
                  :description-editing="inlineEditingDescriptionTaskId === task.id"
                  :description-draft="getInlineDescriptionDraft(task)"
                  :show-description="showKanbanTaskCardDetails"
                  :show-badges="showKanbanTaskCardDetails"
                  :show-document-title="!kanbanFilterDocument || kanbanFilterDocument === 'all'"
                  :document-icon-override="getTaskDocumentIcon(task)"
                  :show-subtasks="isKanbanTaskExpanded(task.id)"
                  :title-tooltip="isKanbanBatchEditMode ? '点击选择任务' : ''"
                  @card-click="handleKanbanTaskCardClick"
                  @open-click="handleKanbanTaskOpenClick"
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
              暂无任务
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
    
    <TableView 
      v-if="currentView === 'table' || currentView === 'archive-table'"
      :tasks="activeOrArchiveTableViewTasks"
      :task-groups="taskGroups"
      :group-mode="tableGroupBy"
      :heading-groups="taskHeadingGroups"
      :document-icon-by-root-id="documentIconByRootId"
      @task-click="handleTaskClick"
      @open-click="handleTaskEditClick"
      @status-toggle="toggleTaskStatus"
      @subtask-toggle="handleSubtaskToggle"
      @description-update="handleDescriptionUpdate"
      @priority-update="handlePriorityUpdate"
      @status-update="handleStatusUpdate"
      @group-update="handleGroupUpdate"
      @subtask-description-update="handleSubtaskDescriptionUpdate"
      @subtask-priority-update="handleSubtaskPriorityUpdate"
      @subtask-status-update="handleSubtaskStatusUpdate"
      @subtask-group-update="handleSubtaskGroupUpdate"
      @subtask-start-date-update="handleSubtaskStartDateUpdate"
      @subtask-due-date-update="handleSubtaskDueDateUpdate"
      @group-create-task="handleTableGroupCreateTask"
      @group-archive-tasks="handleTableGroupArchiveTasks"
      @manage-groups="openTaskGroupDialog"
      @start-date-update="handleStartDateUpdate"
      @due-date-update="handleDueDateUpdate"
    />
    <MonthView 
      v-if="currentView === 'month'" 
      :tasks="monthViewTasks"
      @task-click="handleTaskClick"
      @task-edit="handleCalendarTaskEdit"
      @task-date-changed="handleTaskDateChanged"
      @task-create-requested="handleTaskCreateRequested"
    />
    <WeekView
      v-if="currentView === 'week'"
      :tasks="weekViewTasks"
      @task-date-changed="handleTaskDateChanged"
      @task-click="handleTaskClick"
      @task-edit="handleCalendarTaskEdit"
      @task-create-requested="handleTaskCreateRequested"
    />
    <WeekView
      v-if="currentView === 'day'"
      :tasks="dayViewTasks"
      :fixed-days-count="1"
      @task-date-changed="handleTaskDateChanged"
      @task-click="handleTaskClick"
      @task-edit="handleCalendarTaskEdit"
      @task-create-requested="handleTaskCreateRequested"
    />
    <WeekView
      v-if="currentView === 'three-day'"
      :tasks="dayViewTasks"
      :fixed-days-count="3"
      :fixed-center-today="true"
      @task-date-changed="handleTaskDateChanged"
      @task-click="handleTaskClick"
      @task-edit="handleCalendarTaskEdit"
      @task-create-requested="handleTaskCreateRequested"
    />

    <TaskModal
      :show="showTaskModal"
      :t="taskModalTranslate"
      :notebooks="taskModalNotebooks"
      :documents="taskModalDocuments"
      :groups="taskGroups"
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

    <PriorityPopover
      v-if="kanbanEditorPriorityPopover"
      :show="true"
      :position="kanbanEditorPriorityPopover.position"
      @select="handleKanbanEditorPrioritySelect"
      @close="kanbanEditorPriorityPopover = null"
    />

    <Teleport to="body">
      <TaskEditorPanelShell
        v-if="kanbanEditorVisible"
        ref="kanbanEditorPanelRef"
        mode="floating"
        :panel-style="kanbanEditorStyle"
        title="编辑任务"
        :show-pin="!!activeKanbanEditTask"
        :pin-active="isActiveKanbanTaskPinned"
        :show-move="!!activeKanbanEditTask"
        :show-archive="!!activeKanbanEditTask"
        :is-archived="isActiveKanbanTaskArchived"
        :show-delete="!!activeKanbanEditTask"
        :show-priority="!!(activeKanbanEditTask && activeKanbanEditDraft)"
        :priority-style="{ background: kanbanEditorPriorityOption.background, color: kanbanEditorPriorityOption.color }"
        @pin="handleKanbanEditorPinToggle"
        @move="openKanbanTaskMoveDialog"
        @archive="handleKanbanEditorArchiveToggle"
        @delete="handleKanbanEditorDelete"
        @priority="toggleKanbanEditorPriorityPopover"
        @close="closeKanbanEditor"
      >
        <div ref="kanbanEditorMountRef" class="kanban-editor-body"></div>
        <div
          v-if="activeKanbanEditTask && activeKanbanEditDraft"
          class="kanban-editor-meta"
        >
          <TaskEditorMetaPanel
            :panel="kanbanEditorQuickPanel"
            :due-date="activeKanbanEditDraft.dueDate || ''"
            :due-text="kanbanEditorDueText"
            :has-due-date="kanbanEditorHasDueDate"
            :description="activeKanbanEditDraft.description || ''"
            :has-description="kanbanEditorHasDescription"
            :group-options="kanbanGroupPickerOptions"
            :selected-group-id="kanbanEditorSelectedGroupId"
            :group-label="kanbanEditorGroupLabel"
            :reminder-type="activeKanbanEditDraft.reminderType"
            :reminder-custom-time="activeKanbanEditDraft.reminderCustomTime || ''"
            :reminder-text="kanbanEditorReminderText"
            :has-reminder="kanbanEditorHasReminder"
            :status="activeKanbanEditDraft.status"
            :group-button-style="kanbanEditorGroupButtonStyle"
            :default-group-chip-color="defaultGroupChipColor"
            description-placeholder="添加任务描述..."
            @update:panel="kanbanEditorQuickPanel = $event"
            @update:description="handleKanbanEditorDescriptionInput"
            @select-due="handleKanbanEditorDateSelect"
            @select-group="handleKanbanEditorGroupSelect"
            @select-reminder="handleKanbanEditorReminderSelect"
            @select-status="handleKanbanEditorStatusSelect"
            @commit-description="handleKanbanEditorDescriptionCommit"
            @manage-groups="openTaskGroupDialog"
          />
        </div>
        <div
          v-if="showKanbanTaskMoveDialog"
          class="kanban-task-move-dialog-overlay"
          @click.self="closeKanbanTaskMoveDialog"
        >
          <div class="kanban-task-move-dialog" @click.stop>
            <div class="kanban-task-move-dialog-header">
              <span class="kanban-task-move-dialog-title">移动任务</span>
              <button
                type="button"
                class="kanban-task-move-dialog-close"
                title="关闭"
                aria-label="关闭"
                @click.stop="closeKanbanTaskMoveDialog"
              >
                <Icon name="close" width="16" height="16" />
              </button>
            </div>
            <div class="kanban-task-move-dialog-body">
              <div class="kanban-task-move-dialog-field">
                <label>笔记本</label>
                <SySelect
                  :model-value="kanbanMoveSelectedNotebook"
                  :options="kanbanMoveNotebookOptions"
                  @update:model-value="handleKanbanMoveNotebookChange(String($event || ''))"
                />
              </div>
              <div class="kanban-task-move-dialog-field">
                <label>文档</label>
                <SySelect
                  :model-value="kanbanMoveSelectedDocument"
                  :options="kanbanMoveDocumentOptions"
                  @update:model-value="kanbanMoveSelectedDocument = String($event || '')"
                />
              </div>
              <div v-if="kanbanMoveTargetUnchanged" class="kanban-task-move-dialog-hint">
                任务已位于当前文档。
              </div>
              <div v-else-if="kanbanMoveDocumentOptions.length === 0" class="kanban-task-move-dialog-hint">
                当前笔记本暂无可选文档，请先在目标笔记本创建文档。
              </div>
            </div>
            <div class="kanban-task-move-dialog-footer">
              <button
                type="button"
                class="kanban-task-move-dialog-btn cancel"
                @click.stop="closeKanbanTaskMoveDialog"
              >
                取消
              </button>
              <button
                type="button"
                class="kanban-task-move-dialog-btn confirm"
                :disabled="!canSubmitKanbanMove"
                @click.stop="handleKanbanEditorMove"
              >
                {{ isKanbanTaskMoveSubmitting ? '移动中...' : '确认移动' }}
              </button>
            </div>
          </div>
        </div>
      </TaskEditorPanelShell>
    </Teleport>

    <div v-if="quickCreateDialog.show" class="quick-create-mask" @click="closeQuickCreateDialog">
      <div class="quick-create-dialog" @click.stop>
        <div class="quick-create-title">
          {{ quickCreateDialog.mode === 'heading-task' ? '新建标题和任务' : '新建任务' }}
        </div>
        <div class="quick-create-row">
          <label>笔记本</label>
          <SySelect
            :model-value="quickCreateNotebookId"
            @update:model-value="quickCreateNotebookId = $event"
            :options="notebookOptions"
          />
        </div>
        <div class="quick-create-row">
          <label>文档</label>
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
          placeholder="请输入标题名称"
          @keydown.enter.prevent="submitQuickCreateTask"
          @keydown.esc.prevent="closeQuickCreateDialog"
        />
        <input
          ref="quickCreateInputRef"
          v-model="quickCreateDialog.title"
          class="quick-create-input"
          type="text"
          :placeholder="quickCreateDialog.mode === 'heading-task' ? '请输入首个任务标题' : '请输入任务标题'"
          @keydown.enter.prevent="submitQuickCreateTask"
          @keydown.esc.prevent="closeQuickCreateDialog"
        />
        <div class="quick-create-actions">
          <button class="quick-create-btn cancel" @click="closeQuickCreateDialog">取消</button>
          <button class="quick-create-btn confirm" @click="submitQuickCreateTask">创建</button>
        </div>
      </div>
    </div>
    <TaskScopeDialog
      :show="showTaskScopeDialog"
      :notebooks="notebooks"
      :excluded-notebook-ids="excludedNotebookIds"
      :auto-recognize-task-date="autoRecognizeTaskDate"
      :global-date-recognizing="isGlobalDateRecognitionRunning"
      :task-completion-sound-enabled="taskCompletionSoundEnabled"
      :show-extra="false"
      @close="showTaskScopeDialog = false"
      @global-recognize-date="handleGlobalRecognizeTaskDates"
      @save="handleTaskScopeSave"
    />
    <TaskGroupDialog
      :show="showTaskGroupDialog"
      :groups="taskGroups"
      :auto-add="taskGroupDialogAutoAdd"
      @close="closeTaskGroupDialog"
      @save="handleTaskGroupSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick, type Ref } from 'vue';
import { Protyle, getFrontend } from 'siyuan';
import { TaskRepository, Task, SubTask, TaskGroup, setBlockAttrs, pushMsg, openBlockById, sql, getBlockKramdown, getBlockAttrs, getBlockDOM, loadTaskGroups, saveTaskGroups, moveBlock, appendBlock, updateBlock, insertBlock, deleteBlock, createDocWithMd, getIDsByHPath } from '../api';
import {
  extractDocumentIconFromBlockRow,
  extractDocumentIconFromDom,
  normalizeDocumentIconValue
} from '@/utils/documentIcon';
import { updateTaskMarkdown, skipTaskTemporarily } from '../utils/taskHelpers';
import { useTaskFilters } from '../composables/useTaskFilters';
import { useUserSettings } from '@/composables/useUserSettings';
import { useNotebooks, stripHtml } from '@/composables/useTaskCommon';
import { eventBus, Events } from '../utils/eventBus';
import { getCrdtRepository, useCrdtTasks } from '@/crdtStore';
import { createBlockIdBatchQueue } from '@/utils/blockIdBatchQueue';
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
import { getRepeatSeriesForTask, rebuildAffectedRepeatTasks } from '@/repeatRepository';
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
import TaskCard from '@/components/TaskCard.vue';
import TaskCheckbox from '@/components/TaskCheckbox.vue';
import TaskModal, { type Notebook as TaskModalNotebook, type Document as TaskModalDocument } from '@/components/TaskModal.vue';
import TaskEditorMetaPanel from '@/components/TaskEditorMetaPanel.vue';
import TaskEditorPanelShell from '@/components/TaskEditorPanelShell.vue';
import { useTaskFilterState } from '@/composables/useTaskFilterState';
import SySelect from '@/components/SiyuanTheme/SySelect.vue';
import TableView from '@/components/TableView.vue';
import MonthView from '@/components/MonthView.vue';
import WeekView from '@/components/WeekView.vue';
import TaskFilterPopover from '@/components/TaskFilterPopover.vue';
import PriorityPopover from '@/components/PriorityPopover.vue';
import TaskScopeDialog from '@/components/TaskScopeDialog.vue';
import TaskGroupDialog from '@/components/TaskGroupDialog.vue';
import { usePlugin } from '@/main';
import { resolveGroupColorCss, resolveGroupTextColor } from '@/utils/groupColor';
import { formatMonthDay } from '@/utils/dateHelpers';
import {
  buildTaskReminderAttrs,
  getTaskReminderLabel,
  normalizeTaskReminderSelection,
  type TaskReminderSelection,
  type TaskReminderType
} from '@/utils/taskReminder';
import { playTaskCompletionSound } from '@/utils/completionSound';

const { data: userSettings, loadSettings, updateSettings } = useUserSettings();

const crdtRepo = getCrdtRepository();
const { tasks, updateTasks, syncFromSQL } = useCrdtTasks();
let isMobileFrontend = false;
try {
  const frontend = getFrontend();
  isMobileFrontend = frontend === 'mobile' || frontend === 'browser-mobile';
} catch {
  isMobileFrontend = false;
}
const loading = ref(false);
const showTaskScopeDialog = ref(false);
const isGlobalDateRecognitionRunning = ref(false);
const showTaskGroupDialog = ref(false);
const taskGroupDialogAutoAdd = ref(false);
const excludedNotebookIds = ref<string[]>([]);
const skipSet = new Set<string>();
const kanbanGroupModeOptions = [
  { value: 'status', text: '按状态分组' },
  { value: 'date', text: '按日期分组' },
  { value: 'group', text: '按标签分组' },
  { value: 'heading', text: '按标题分组' }
] as const;
const tableGroupModeOptions = [
  { value: 'status', text: '不分组' },
  { value: 'date', text: '按日期分组' },
  { value: 'group', text: '按标签分组' },
  { value: 'heading', text: '按标题分组' }
] as const;
type TaskViewMode = 'kanban' | 'table' | 'archive-table' | 'month' | 'week' | 'three-day' | 'day';
const viewSwitcherOptions: Array<{ value: TaskViewMode; text: string; icon: string }> = [
  { value: 'kanban', text: '看板', icon: 'kanban' },
  { value: 'table', text: '表格', icon: 'table' },
  { value: 'month', text: '月视图', icon: 'month' },
  { value: 'week', text: '周视图', icon: 'week' },
  { value: 'three-day', text: '三日图', icon: 'threeDay' },
  { value: 'day', text: '日视图', icon: 'day' },
  { value: 'archive-table', text: '归档', icon: 'table' }
];

function normalizeTaskViewMode(value: unknown): TaskViewMode {
  if (
    value === 'kanban'
    || value === 'table'
    || value === 'archive-table'
    || value === 'month'
    || value === 'week'
    || value === 'three-day'
    || value === 'day'
  ) {
    return value;
  }
  return 'table';
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
const tableGroupBy = ref<TaskViewGroupMode>('status');
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
const isMobileTableSearchExpanded = ref(false);
const kanbanBoardRef = ref<HTMLElement | null>(null);
const isKanbanBatchEditMode = ref(false);
const kanbanBatchSelectedTaskIds = ref<Set<string>>(new Set());
const kanbanBatchEditStatus = ref<string>('');
const kanbanBatchEditPriority = ref<string>('');
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
const documentTabsRef = ref<HTMLElement | null>(null);
const documentTabsDropdownControlRef = ref<HTMLElement | null>(null);
const documentTabsDropdownPopoverRef = ref<HTMLElement | null>(null);
const documentTabsDropdownPopoverStyle = ref<Record<string, string>>({});
const documentIconByRootId = ref<Map<string, string>>(new Map());
let documentIconRefreshTimer: number | null = null;
let documentIconRefreshSeq = 0;
const taskViewGroupMenuVisible = ref(false);
const taskViewGroupMenuControlRef = ref<HTMLElement | null>(null);
const taskViewGroupMenuPopoverRef = ref<HTMLElement | null>(null);
const hiddenDocumentTabIds = ref(new Set<string>());
const mobileViewSwitcherVisible = ref(false);
const mobileViewSwitcherControlRef = ref<HTMLElement | null>(null);
const mobileViewSwitcherPopoverRef = ref<HTMLElement | null>(null);
const kanbanViewRef = ref<HTMLElement | null>(null);
const isCompactViewSwitcher = ref(false);
const COMPACT_VIEW_SWITCHER_BREAKPOINT = 980;
let kanbanViewResizeObserver: ResizeObserver | null = null;

type KanbanTaskDueFilterKey = 'overdue' | 'today' | 'next7Days' | 'noDueDate';
type KanbanTaskUpdateFilterKey = 'today' | 'thisWeek' | 'thisMonth';
type KanbanTaskExtraFilterKey = 'hasDescription' | 'hasSubtasks';
const tableFilterType = ref('all');
const tableFilterDocument = ref('all');
const tableSearchQuery = ref('');
const normalizedTableSearch = computed(() => normalizeSearchText(tableSearchQuery.value));
const isMobileTaskSearchCollapsed = computed(() =>
  isMobileFrontend && !isMobileTableSearchExpanded.value && !tableSearchQuery.value
);

const monthFilterType = ref('all');
const monthFilterDocument = ref('all');

const weekFilterType = ref('all');
const weekFilterDocument = ref('all');
const dayFilterType = ref('all');
const dayFilterDocument = ref('all');

const isSettingsLoaded = ref(false);
const isHydratingSettings = ref(false);

const { notebooks, loadNotebooks } = useNotebooks();
const taskGroups = ref<TaskGroup[]>([]);
const visibleTaskGroups = computed(() =>
  taskGroups.value.filter(group => group.hidden !== true)
);
const visibleTaskGroupIdSet = computed(() => new Set(visibleTaskGroups.value.map(group => group.id)));
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
      return groups;
    })
    .finally(() => {
      taskGroupsLoadingPromise = null;
    });
  return taskGroupsLoadingPromise;
}
const taskHeadingGroups = ref<Map<string, TaskHeadingGroupMeta>>(new Map());
const draggedTask = ref<Task | null>(null);
const dragOverColumnId = ref<string | null>(null);
const draggedGroupColumnId = ref<string | null>(null);
const dragOverGroupColumnId = ref<string | null>(null);
const dragOverGroupColumnPosition = ref<'before' | 'after' | null>(null);
const archivingKanbanColumnIds = ref<Set<string>>(new Set());
const kanbanColumnMetrics = ref<Record<string, { scrollTop: number; height: number }>>({});
const isDropping = ref(false);
const kanbanColumnElements = new Map<string, HTMLElement>();
let kanbanMetricsRaf: number | null = null;
const kanbanColumnEstimatedHeights = ref<Record<string, number>>({});
const currentView = ref<TaskViewMode>(normalizeTaskViewMode(userSettings.kanban?.currentView));
const currentViewOption = computed(() =>
  viewSwitcherOptions.find(option => option.value === currentView.value) || viewSwitcherOptions[0]
);
const expandedKanbanTaskIds = ref(new Set<string>());
const showKanbanTaskCardDetails = ref(userSettings.kanban?.showKanbanTaskCardDetails !== false);
const showCompletedTasks = computed(() => userSettings.taskManager.showCompletedTasks !== false);
const autoRecognizeTaskDate = computed(() => userSettings.taskManager.autoRecognizeTaskDate === true);
const taskCompletionSoundEnabled = computed(() => userSettings.taskManager.taskCompletionSoundEnabled !== false);
const kanbanSubtaskHydratingIds = new Set<string>();
const inlineEditingDescriptionTaskId = ref<string | null>(null);
const inlineDescriptionDraftByTaskId = ref(new Map<string, string>());
const inlineDescriptionSavingTaskIds = new Set<string>();
const kanbanEditorVisible = ref(false);
const kanbanEditorPosition = ref({ x: 0, y: 0 });
const kanbanEditorPanelRef = ref<InstanceType<typeof TaskEditorPanelShell> | null>(null);
const kanbanEditorMountRef = ref<HTMLElement | null>(null);
let kanbanEditorProtyle: Protyle | null = null;
const kanbanEditorTaskId = ref<string | null>(null);
const kanbanEditorDraft = ref<{
  taskId: string;
  status: Task['status'];
  dueDate: string;
  description: string;
  reminderType?: TaskReminderType;
  reminderCustomTime: string;
  groupId: string;
  priority: Task['priority'];
} | null>(null);
const kanbanEditorQuickPanel = ref<'due' | 'description' | 'group' | 'reminder' | 'status' | null>(null);
const kanbanEditorPriorityPopover = ref<{ position: { x: number; y: number } } | null>(null);
const showKanbanTaskMoveDialog = ref(false);
const isKanbanTaskMoveSubmitting = ref(false);
const kanbanMoveSelectedNotebook = ref('');
const kanbanMoveSelectedDocument = ref('');
const openingKanbanEditorBlockIds = new Set<string>();

const todayVirtualSeriesIds = computed(() => {
  const set = new Set<string>();
  for (const task of tasks.value) {
    if (task.isVirtual && task.repeatSeriesId && isVirtualTaskForToday(task)) {
      set.add(task.repeatSeriesId);
    }
  }
  return set;
});

const activeKanbanEditTask = computed(() =>
  kanbanEditorTaskId.value
    ? (tasks.value.find(task => task.id === kanbanEditorTaskId.value) || null)
    : null
);
const isActiveKanbanTaskPinned = computed(() => activeKanbanEditTask.value?.pinned === true);
const isActiveKanbanTaskArchived = computed(() => activeKanbanEditTask.value?.archived === true);
const activeKanbanEditDraft = computed(() =>
  kanbanEditorTaskId.value && kanbanEditorDraft.value?.taskId === kanbanEditorTaskId.value
    ? kanbanEditorDraft.value
    : null
);
const visibleKanbanTasks = computed(() =>
  tasks.value.filter(task => matchesKanbanFilters(task))
);
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
const kanbanBatchGroupOptions = computed(() => [
  { value: '', text: '标签（不修改）' },
  { value: TASK_GROUP_NONE_ID, text: '无标签' },
  ...visibleTaskGroups.value.map(group => ({
    value: group.id,
    text: group.name || '未命名标签'
  }))
]);
const canApplyKanbanBatchEdit = computed(() => {
  if (isKanbanBatchApplying.value || kanbanBatchSelectedCount.value === 0) {
    return false;
  }
  if (kanbanBatchEditStatus.value) {
    return true;
  }
  if (kanbanBatchEditPriority.value) {
    return true;
  }
  return kanbanBatchEditGroupId.value.trim().length > 0;
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

const TASK_GROUP_NONE_ID = '__none__';
const defaultGroupChipColor = '#9aa0a6';
const ADD_GROUP_COLUMN_ID = '__add-group__';
const ADD_HEADING_COLUMN_ID = '__add-heading__';
type KanbanDateGroupKey = 'overdue' | 'today' | 'thisWeek' | 'thisMonth' | 'other';

type KanbanColumn = {
  id: string;
  title: string;
  type: 'status' | 'group' | 'heading' | 'date' | 'action';
  actionKind?: 'group-add' | 'heading-add';
  status?: Task['status'];
  groupId?: string;
  headingKey?: string;
  headingMeta?: TaskHeadingGroupMeta;
  dateGroupKey?: KanbanDateGroupKey;
};

const statusColumns: KanbanColumn[] = [
  { id: 'status-pending', status: 'pending', title: '待处理', type: 'status' },
  { id: 'status-in-progress', status: 'in-progress', title: '进行中', type: 'status' },
  { id: 'status-completed', status: 'completed', title: '已完成', type: 'status' },
  { id: 'status-delayed', status: 'delayed', title: '延迟', type: 'status' },
  { id: 'status-cancelled', status: 'cancelled', title: '已取消', type: 'status' }
];
const kanbanDateGroups: Array<{ key: KanbanDateGroupKey; title: string; dotColor: string }> = [
  { key: 'overdue', title: '逾期', dotColor: '#ef4444' },
  { key: 'today', title: '今日', dotColor: '#f59e0b' },
  { key: 'thisWeek', title: '本周', dotColor: '#3b82f6' },
  { key: 'thisMonth', title: '本月', dotColor: '#10b981' },
  { key: 'other', title: '其他', dotColor: '#9ca3af' }
];

const KANBAN_VIRTUAL_CARD_HEIGHT = 110;
const KANBAN_VIRTUAL_OVERSCAN = 6;
const KANBAN_VIRTUAL_THRESHOLD = 120;
const KANBAN_TITLE_HYDRATE_LIMIT = 120;
const kanbanPriorityOrder = { high: 0, medium: 1, low: 2, none: 3 } as const;

const taskGroupIdSet = computed(() => {
  return new Set(taskGroups.value.map(group => group.id));
});

const groupColumns = computed<KanbanColumn[]>(() => {
  const columns: KanbanColumn[] = [
    { id: TASK_GROUP_NONE_ID, title: '无标签', type: 'group', groupId: '' }
  ];
  for (const group of visibleTaskGroups.value) {
    if (!group || !group.id) continue;
    columns.push({
      id: group.id,
      title: group.name?.trim() || '标签',
      type: 'group',
      groupId: group.id
    });
  }
  return columns;
});

const headingColumns = computed<KanbanColumn[]>(() => {
  const columnsByKey = new Map<string, KanbanColumn>();

  for (const task of tasks.value) {
    if (!matchesKanbanFilters(task)) continue;
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
      { id: '__heading-empty__', title: '标题归类', type: 'heading', headingKey: '__heading-empty__' }
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

const addGroupColumn: KanbanColumn = { id: ADD_GROUP_COLUMN_ID, title: '', type: 'action', actionKind: 'group-add' };
const addHeadingColumn: KanbanColumn = { id: ADD_HEADING_COLUMN_ID, title: '', type: 'action', actionKind: 'heading-add' };
const kanbanSupportsDrag = computed(() => kanbanGroupBy.value !== 'date');
const kanbanColumns = computed<KanbanColumn[]>(() => {
  if (kanbanGroupBy.value === 'group') {
    return [...groupColumns.value, addGroupColumn];
  }
  if (kanbanGroupBy.value === 'heading') {
    return [...headingColumns.value, addHeadingColumn];
  }
  if (kanbanGroupBy.value === 'date') {
    return dateColumns.value;
  }
  return showCompletedTasks.value
    ? statusColumns
    : statusColumns.filter(column => column.status !== 'completed');
});

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
const columnTitleInputRef = ref<HTMLInputElement | null>(null);
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
const PINCH_INBOX_OPTION_ID = '__pinch_inbox__';
const PINCH_INBOX_PATH = '/pinch收集箱';
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
}

const kanbanStatusFilterOptions: Array<{ value: Task['status']; label: string }> = [
  { value: 'pending', label: '待处理' },
  { value: 'in-progress', label: '进行中' },
  { value: 'delayed', label: '延迟' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' }
];
const kanbanPriorityFilterOptions: Array<{ value: Task['priority']; label: string }> = [
  { value: 'high', label: '高优先级' },
  { value: 'medium', label: '中优先级' },
  { value: 'low', label: '低优先级' },
  { value: 'none', label: '无优先级' }
];
const kanbanDueFilterOptions: Array<{ value: KanbanTaskDueFilterKey; label: string }> = [
  { value: 'overdue', label: '已逾期' },
  { value: 'today', label: '今天到期' },
  { value: 'next7Days', label: '未来 7 天' },
  { value: 'noDueDate', label: '无截止日期' }
];
const kanbanUpdatedFilterOptions: Array<{ value: KanbanTaskUpdateFilterKey; label: string }> = [
  { value: 'today', label: '今日' },
  { value: 'thisWeek', label: '本周' },
  { value: 'thisMonth', label: '本月' }
];
const kanbanExtraFilterOptions: Array<{ value: KanbanTaskExtraFilterKey; label: string }> = [
  { value: 'hasDescription', label: '有描述' },
  { value: 'hasSubtasks', label: '有子任务' }
];
const kanbanBatchStatusOptions: Array<{ value: string; text: string }> = [
  { value: '', text: '状态（不修改）' },
  { value: 'pending', text: '待处理' },
  { value: 'in-progress', text: '进行中' },
  { value: 'delayed', text: '延迟' },
  { value: 'completed', text: '已完成' },
  { value: 'cancelled', text: '已取消' }
];
const kanbanBatchPriorityOptions: Array<{ value: string; text: string }> = [
  { value: '', text: '优先级（不修改）' },
  { value: 'none', text: '无' },
  { value: 'low', text: '低' },
  { value: 'medium', text: '中' },
  { value: 'high', text: '高' }
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

const notebookOptions = computed(() => [
  { value: 'all', text: '全部' },
  ...enabledNotebooks.value.map(nb => ({ value: nb.id, text: nb.name }))
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
    docs.unshift({
      id: activeRootId,
      name: fallbackPath.split('/').pop() || fallbackPath || activeRootId,
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

const kanbanGroupPickerOptions = computed(() => {
  const options = [
    { value: TASK_GROUP_NONE_ID, label: '无标签', special: true, colorCss: '', textColor: '' }
  ];
  visibleTaskGroups.value.forEach(group => {
    const rawColor = group.color || '';
    options.push({
      value: group.id,
      label: group.name,
      special: false,
      colorCss: resolveGroupColorCss(rawColor),
      textColor: resolveGroupTextColor(rawColor)
    });
  });
  return options;
});

const kanbanGroupFilterOptions = computed(() => {
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
      return { backgroundColor: defaultGroupChipColor };
    }
    const group = taskGroups.value.find(item => item.id === groupId);
    const backgroundColor = resolveGroupColorCss(group?.color || '');
    return { backgroundColor: backgroundColor || defaultGroupChipColor };
  }

  if (column.type === 'heading') {
    return { backgroundColor: 'var(--b3-theme-primary)' };
  }

  if (column.type === 'date') {
    const dateMeta = kanbanDateGroups.find(group => group.key === column.dateGroupKey);
    return { backgroundColor: dateMeta?.dotColor || '#9ca3af' };
  }

  return { backgroundColor: 'transparent' };
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
    && kanbanGroupBy.value === 'heading'
    && kanbanFilterDocument.value !== 'all'
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
  columnTitleInputRef.value?.focus();
  columnTitleInputRef.value?.select();

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
      columnTitleInputRef.value?.focus();
      columnTitleInputRef.value?.select();
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
    await pushMsg(column.type === 'group' ? '标签名称不能为空' : '标题名称不能为空', 2000);
    await nextTick();
    columnTitleInputRef.value?.focus();
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
        await pushMsg('当前分组不支持重命名', 2000);
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
    console.error('[KanbanView] 分组标题编辑失败:', error);
    await pushMsg('保存失败，请稍后重试', 2600);
  } finally {
    isSavingColumnTitle.value = false;
  }
}

function canCreateTaskInColumn(column: KanbanColumn): boolean {
  if (column.type === 'status' || column.type === 'group') {
    return true;
  }
  if (column.type === 'heading') {
    return !!(column.headingMeta && column.headingMeta.kind !== 'standalone' && column.headingMeta.rootId);
  }
  return false;
}

function getColumnCreateTaskLabel(column: KanbanColumn): string {
  if (column.type === 'status') {
    return `在“${column.title}”列新建任务`;
  }
  if (column.type === 'group') {
    return `在“${column.title}”列新建任务`;
  }
  if (column.type === 'heading') {
    return `在“${column.title}”列新建任务`;
  }
  return '新建任务';
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
    await pushMsg('当前分组暂不支持新建任务', 2200);
    return;
  }
  await handleTaskCreateRequested(getDefaultCreateTaskPayload(), options);
}

async function handleTableGroupArchiveTasks(payload: TableGroupActionPayload): Promise<void> {
  const label = (payload.groupLabel || '当前分组').trim() || '当前分组';
  const taskIds = Array.isArray(payload.taskIds) ? payload.taskIds : [];
  const tasksToArchive = taskIds
    .map(taskId => tasks.value.find(task => task.id === taskId))
    .filter((task): task is Task => !!task)
    .filter(task => task.type === 'block' && task.isVirtual !== true && task.archived !== true);
  const totalCount = tasksToArchive.length;

  if (totalCount === 0) {
    await pushMsg('该分组暂无可归档任务', 2000);
    return;
  }

  const confirmed = window.confirm(
    `确认归档“${label}”分组的全部 ${totalCount} 个任务吗？\n归档后可在「归档」视图查看。`
  );
  if (!confirmed) {
    return;
  }

  let successCount = 0;
  const changedBlockIdSet = new Set<string>();

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
      if (task.blockId) {
        changedBlockIdSet.add(task.blockId);
      }
      successCount += 1;
    } catch (error) {
      console.error('[KanbanView] 分组批量归档任务失败:', error);
    }
  }

  if (changedBlockIdSet.size > 0) {
    eventBus.emit(Events.TASK_CHANGED, { blockIds: Array.from(changedBlockIdSet) });
  }
  invalidateTableFilters();

  if (successCount === totalCount) {
    await pushMsg(`已归档“${label}”分组全部 ${totalCount} 个任务`, 2400);
    return;
  }
  if (successCount > 0) {
    await pushMsg(`已归档 ${successCount}/${totalCount} 个任务，部分归档失败`, 3000);
    return;
  }
  await pushMsg('归档失败，请稍后重试', 3000);
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
  const title = (column.title || '当前').trim() || '当前';
  const taskCount = getArchivableTasksForColumn(column).length;
  if (taskCount > 0) {
    return `归档“${title}”列全部 ${taskCount} 个任务`;
  }
  return `归档“${title}”列全部任务`;
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
    await pushMsg('该列暂无可归档任务', 2000);
    return;
  }

  const title = (column.title || '当前').trim() || '当前';
  const confirmed = window.confirm(
    `确认归档“${title}”列的全部 ${totalCount} 个任务吗？\n归档后可在「归档」视图查看。`
  );
  if (!confirmed) {
    return;
  }

  setKanbanColumnArchiving(column.id, true);
  let successCount = 0;
  const changedBlockIdSet = new Set<string>();

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
        if (task.blockId) {
          changedBlockIdSet.add(task.blockId);
        }
        successCount += 1;
      } catch (error) {
        console.error('[KanbanView] 列批量归档任务失败:', error);
      }
    }

    if (changedBlockIdSet.size > 0) {
      eventBus.emit(Events.TASK_CHANGED, { blockIds: Array.from(changedBlockIdSet) });
    }
    invalidateTableFilters();

    if (successCount === totalCount) {
      await pushMsg(`已归档“${title}”列全部 ${totalCount} 个任务`, 2400);
      return;
    }
    if (successCount > 0) {
      await pushMsg(`已归档 ${successCount}/${totalCount} 个任务，部分归档失败`, 3000);
      return;
    }
    await pushMsg('归档失败，请稍后重试', 3000);
  } finally {
    setKanbanColumnArchiving(column.id, false);
  }
}

const kanbanEditorSelectedGroupId = computed(() => {
  const groupId = (activeKanbanEditDraft.value?.groupId || '').trim();
  return groupId || TASK_GROUP_NONE_ID;
});

const kanbanEditorGroupLabel = computed(() => {
  const groupId = (activeKanbanEditDraft.value?.groupId || '').trim();
  if (!groupId) {
    return '无标签';
  }
  const group = taskGroups.value.find(item => item.id === groupId);
  return group?.name || '标签';
});

const kanbanEditorGroupColorValue = computed(() => {
  const groupId = (activeKanbanEditDraft.value?.groupId || '').trim();
  if (!groupId) {
    return '';
  }
  return taskGroups.value.find(item => item.id === groupId)?.color || '';
});

const kanbanEditorGroupButtonStyle = computed(() => {
  const rawColor = kanbanEditorGroupColorValue.value;
  if (!rawColor) {
    return {};
  }
  return {
    backgroundColor: resolveGroupColorCss(rawColor),
    borderColor: resolveGroupColorCss(rawColor),
    color: resolveGroupTextColor(rawColor)
  };
});

const kanbanEditPriorityOptions: Array<{
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

const kanbanEditorPriorityOption = computed(() => {
  const current = activeKanbanEditDraft.value?.priority || 'none';
  return kanbanEditPriorityOptions.find(option => option.value === current) || kanbanEditPriorityOptions[3];
});

const kanbanEditorDueText = computed(() => {
  const dueDate = activeKanbanEditDraft.value?.dueDate || '';
  if (!dueDate) return '未设置';
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
}

function resetFiltersForExcludedNotebooks(): boolean {
  const excludedNotebookIdSet = new Set(excludedNotebookIds.value);
  let changed = false;

  if (kanbanFilterType.value !== 'all' && excludedNotebookIdSet.has(kanbanFilterType.value)) {
    kanbanFilterType.value = 'all';
    kanbanFilterDocument.value = 'all';
    changed = true;
  }

  if (tableFilterType.value !== 'all' && excludedNotebookIdSet.has(tableFilterType.value)) {
    tableFilterType.value = 'all';
    tableFilterDocument.value = 'all';
    changed = true;
  }

  if (monthFilterType.value !== 'all' && excludedNotebookIdSet.has(monthFilterType.value)) {
    monthFilterType.value = 'all';
    monthFilterDocument.value = 'all';
    changed = true;
  }

  if (weekFilterType.value !== 'all' && excludedNotebookIdSet.has(weekFilterType.value)) {
    weekFilterType.value = 'all';
    weekFilterDocument.value = 'all';
    changed = true;
  }

  if (dayFilterType.value !== 'all' && excludedNotebookIdSet.has(dayFilterType.value)) {
    dayFilterType.value = 'all';
    dayFilterDocument.value = 'all';
    changed = true;
  }

  if (quickCreateNotebookId.value !== 'all' && excludedNotebookIdSet.has(quickCreateNotebookId.value)) {
    quickCreateNotebookId.value = 'all';
    quickCreateDocumentId.value = 'all';
    changed = true;
  }

  return changed;
}

async function openTaskScopeDialog() {
  if (notebooks.value.length === 0) {
    await loadNotebooks();
  }
  showTaskScopeDialog.value = true;
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
  return column.actionKind === 'heading-add' ? '新建标题' : '新建标签';
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
    console.error('[KanbanView] 查询标签任务失败:', error);
    blockIdsToClear = Array.from(new Set(localBlockIds));
  }

  const successBlockIds: string[] = [];
  for (const blockId of blockIdsToClear) {
    try {
      await setBlockAttrs(blockId, { 'custom-task-group': '' });
      successBlockIds.push(blockId);
    } catch (error) {
      console.error('[KanbanView] 清理任务标签属性失败:', error);
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
    invalidateTableFilters();
  }

  if (successBlockIds.length > 0) {
    eventBus.emit(Events.TASK_CHANGED, { blockIds: successBlockIds });
  }
}

async function handleTaskGroupSave(groups: TaskGroup[]): Promise<void> {
  const removedGroupIds = collectRemovedGroupIds(taskGroups.value, groups);
  // Optimistically update so UI reflects changes immediately
  const nextGroups = (groups || []).map(group => ({ ...group }));
  taskGroups.value = nextGroups;
  eventBus.emit(Events.TASK_GROUPS_UPDATED, { groups: nextGroups });
  try {
    await saveTaskGroups(nextGroups);
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
    console.error('[KanbanView] 保存标签失败:', error);
  }
}

function applyExternalTaskGroups(groups: TaskGroup[]): void {
  const nextGroups = (groups || []).map(group => ({ ...group }));
  taskGroups.value = nextGroups;
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

async function handleTaskScopeSave(
  selectedVisibleExcludedNotebookIds: string[],
  _nextShowCompletedTasks: boolean,
  nextAutoRecognizeTaskDate: boolean,
  nextTaskCompletionSoundEnabled: boolean
) {
  const visibleNotebookIds = new Set(notebooks.value.map(notebook => notebook.id));
  const hiddenExcludedNotebookIds = excludedNotebookIds.value.filter(id => !visibleNotebookIds.has(id));
  const mergedExcludedNotebookIds = normalizeNotebookIds([
    ...hiddenExcludedNotebookIds,
    ...selectedVisibleExcludedNotebookIds
  ]);

  applyExcludedNotebookScope(mergedExcludedNotebookIds);
  TaskRepository.setAutoRecognizeTaskDateEnabled(nextAutoRecognizeTaskDate);
  showTaskScopeDialog.value = false;
  const hasFilterChanges = resetFiltersForExcludedNotebooks();

  await updateSettings('taskManager', {
    excludedNotebookIds: mergedExcludedNotebookIds,
    autoRecognizeTaskDate: nextAutoRecognizeTaskDate,
    taskCompletionSoundEnabled: nextTaskCompletionSoundEnabled
  });
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
      await pushMsg('未找到未设定起止日期的任务', 2200);
      return;
    }

    if (result.updated > 0) {
      if (result.failed > 0) {
        await pushMsg(`已写入 ${result.updated} 项日期，${result.failed} 项写入失败`, 3200);
      } else {
        await pushMsg(`已识别并写入 ${result.updated} 项任务日期`, 2200);
      }
      await loadTasks(true, { silent: true });
      return;
    }

    if (result.recognized === 0) {
      await pushMsg(`扫描 ${result.scanned} 项未设定任务，未识别到可写入日期`, 2800);
      return;
    }

    await pushMsg(`识别到 ${result.recognized} 项日期，写入失败 ${result.failed} 项`, 3200);
  } catch (error) {
    console.error('[KanbanView] 全局识别任务日期失败:', error);
    await pushMsg('全局识别任务日期失败，请稍后重试', 3200);
  } finally {
    isGlobalDateRecognitionRunning.value = false;
  }
}

let eventUnsubscribers: Array<() => void> = [];
let saveSettingsTimer: number | null = null;
let fallbackRefreshTimer: number | null = null;
let kanbanTitleHydrateTimer: number | null = null;
let isKanbanTitleHydrating = false;
let queuedIncrementalAllowUnknown = false;
const MAX_INCREMENTAL_BLOCKS_PER_FLUSH = 80;
const dragStatusLocks = new Map<string, Task['status']>();
const dragSyncSuppressUntil = new Map<string, number>();
let repeatReconcileRequestId = 0;
function getCurrentFilterNotebookId(): string {
  switch (currentView.value) {
    case 'kanban':
      return kanbanFilterType.value;
    case 'table':
    case 'archive-table':
      return tableFilterType.value;
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

function shouldHideCompletedOnlyDocumentTabs(view: TaskViewMode): boolean {
  return !showCompletedTasks.value && (view === 'kanban' || view === 'table');
}

type DocumentOptionsTaskMatcher = (task: Task) => boolean;

function matchesDateViewDocumentCandidate(task: Task, notebookId: string): boolean {
  if (task.type !== 'block') return false;
  if (task.archived) return false;
  if (!task.startDate && !task.dueDate) return false;
  if (notebookId !== 'all' && task.notebookId !== notebookId) {
    return false;
  }
  return true;
}

function matchesKanbanFiltersByDocumentScope(task: Task, includeDocumentFilter: boolean): boolean {
  if (!task.title || task.title.trim() === '') return false;
  if (task.type !== 'block') return false;
  if (task.archived) return false;
  if (!task.isVirtual && task.repeatSeriesId && todayVirtualSeriesIds.value.has(task.repeatSeriesId)) {
    return false;
  }
  if (task.isVirtual && !isVirtualTaskForToday(task)) return false;
  if (kanbanFilterType.value !== 'all' && task.notebookId !== kanbanFilterType.value) {
    return false;
  }
  if (includeDocumentFilter && kanbanFilterDocument.value !== 'all' && task.rootId !== kanbanFilterDocument.value) {
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
  if (activeKanbanGroupFilters.value.length > 0) {
    const groupId = typeof task.groupId === 'string' ? task.groupId.trim() : '';
    const resolvedGroupId = groupId || TASK_GROUP_NONE_ID;
    if (!activeKanbanGroupFilters.value.includes(resolvedGroupId)) {
      return false;
    }
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

function getDocumentTabTaskMatcher(view: TaskViewMode): DocumentOptionsTaskMatcher {
  switch (view) {
    case 'kanban':
      return (task) => matchesKanbanFiltersByDocumentScope(task, false);
    case 'table':
      return (task) => matchesTableFiltersByArchivedState(task, false);
    case 'archive-table':
      return (task) => matchesTableFiltersByArchivedState(task, true);
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
  const docs = new Map<string, { hPath: string; notebookId: string; hasVisibleActiveTask: boolean }>();
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

    let documentMeta = docs.get(task.rootId);
    if (!documentMeta) {
      const hPath = task.hPath || task.rootId;
      documentMeta = { hPath, notebookId: taskNotebookId, hasVisibleActiveTask: false };
      docs.set(task.rootId, documentMeta);
    }

    if (task.archived) {
      continue;
    }
    if (!excludeCompletedOnlyDocs || !isTaskCompletedVisual(task)) {
      documentMeta.hasVisibleActiveTask = true;
    }
  }

  return Array.from(docs.entries())
    .filter(([, meta]) => !excludeCompletedOnlyDocs || meta.hasVisibleActiveTask)
    .map(([id, meta]) => {
      const documentName = meta.hPath.split('/').pop() || meta.hPath;
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

function getDocumentIdsByNotebook(
  notebookId: string,
  options: { excludeCompletedOnlyDocs?: boolean; taskMatcher?: DocumentOptionsTaskMatcher } = {}
): string[] {
  return getDocumentEntriesByNotebook(notebookId, {
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

function scheduleTaskDocumentIconRefresh(delay = 80): void {
  if (documentIconRefreshTimer !== null) {
    clearTimeout(documentIconRefreshTimer);
  }
  documentIconRefreshTimer = window.setTimeout(() => {
    documentIconRefreshTimer = null;
    void refreshTaskDocumentIcons();
  }, delay);
}

function toFilterDocumentOptions(
  notebookId: string,
  options: { excludeCompletedOnlyDocs?: boolean; taskMatcher?: DocumentOptionsTaskMatcher } = {}
): Array<{ value: string; text: string }> {
  return [
    { value: 'all', text: '全部' },
    ...getDocumentEntriesByNotebook(notebookId, {
      includeNotebookName: notebookId === 'all',
      excludeCompletedOnlyDocs: options.excludeCompletedOnlyDocs,
      taskMatcher: options.taskMatcher
    }).map(doc => ({
      value: doc.id,
      text: doc.name
    }))
  ];
}

function toQuickCreateDocumentOptions(notebookId: string): Array<{ value: string; text: string }> {
  if (notebookId === 'all') {
    return [{ value: 'all', text: '全部' }];
  }
  return toFilterDocumentOptions(notebookId);
}

const documentOptions = computed(() => toFilterDocumentOptions(getCurrentFilterNotebookId(), {
  excludeCompletedOnlyDocs: shouldHideCompletedOnlyDocumentTabs(currentView.value),
  taskMatcher: getDocumentTabTaskMatcher(currentView.value)
}));
const quickCreateDocumentOptions = computed(() => toQuickCreateDocumentOptions(quickCreateNotebookId.value));
const visibleDocumentOptions = computed(() =>
  documentOptions.value.filter(option => option.value === 'all' || !hiddenDocumentTabIds.value.has(option.value))
);
const documentTabPopoverOptions = computed(() =>
  documentOptions.value
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
        return kanbanFilterDocument.value;
      case 'table':
      case 'archive-table':
        return tableFilterDocument.value;
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
        kanbanFilterDocument.value = value;
        break;
      case 'table':
      case 'archive-table':
        tableFilterDocument.value = value;
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

const showDocumentTabs = computed(() => visibleDocumentOptions.value.length > 1);
const activeTaskViewGroupMode = computed<TaskViewGroupMode>(() =>
  currentView.value === 'kanban' ? kanbanGroupBy.value : tableGroupBy.value
);
const currentTaskViewGroupOptions = computed(() =>
  currentView.value === 'kanban' ? kanbanGroupModeOptions : tableGroupModeOptions
);

function closeTaskViewGroupMenu(): void {
  taskViewGroupMenuVisible.value = false;
}

function toggleTaskViewGroupMenu(): void {
  const nextVisible = !taskViewGroupMenuVisible.value;
  taskViewGroupMenuVisible.value = nextVisible;
  if (!nextVisible) {
    return;
  }
  closeDocumentTabsDropdown();
  closeMobileViewSwitcher();
  closeKanbanFilterPopover();
  closeTableFilterPopover();
}

function selectTaskViewGroupMode(mode: TaskViewGroupMode): void {
  if (currentView.value === 'kanban') {
    kanbanGroupBy.value = mode;
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
  if (currentView.value !== 'kanban') {
    return;
  }
  showKanbanTaskCardDetails.value = !showKanbanTaskCardDetails.value;
  if (!showKanbanTaskCardDetails.value && inlineEditingDescriptionTaskId.value) {
    inlineEditingDescriptionTaskId.value = null;
  }
  closeTaskViewGroupMenu();
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
}

function toggleAllVisibleKanbanDetailsFromMenu(): void {
  if (currentView.value !== 'kanban') {
    return;
  }
  toggleAllVisibleKanbanDetails();
  closeTaskViewGroupMenu();
}

function toggleDocumentTabsDropdown(): void {
  const nextVisible = !documentTabsDropdownVisible.value;
  documentTabsDropdownVisible.value = nextVisible;
  if (nextVisible) {
    closeTaskViewGroupMenu();
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

function updateDocumentTabsDropdownPosition(): void {
  if (!documentTabsDropdownVisible.value) {
    return;
  }
  const control = documentTabsDropdownControlRef.value;
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
  const container = control.closest('.kanban-view') as HTMLElement | null;
  const containerRect = container?.getBoundingClientRect();
  const padding = 10;

  const safeLeft = Math.max(
    padding,
    Math.ceil(containerRect ? containerRect.left + padding : padding)
  );
  const safeRight = Math.min(
    viewportWidth - padding,
    Math.floor(containerRect ? containerRect.right - padding : viewportWidth - padding)
  );
  const availableWidth = Math.max(160, safeRight - safeLeft);
  const popoverWidth = Math.min(popoverRect.width || availableWidth, availableWidth);
  const minLeft = safeLeft;
  const maxLeft = Math.max(minLeft, safeRight - popoverWidth);
  const preferredLeft = controlRect.right - popoverWidth;
  const resolvedLeft = Math.min(Math.max(preferredLeft, minLeft), maxLeft);
  const leftOffset = resolvedLeft - controlRect.left;

  documentTabsDropdownPopoverStyle.value = {
    left: `${leftOffset}px`,
    right: 'auto',
    maxWidth: `${availableWidth}px`,
    minWidth: `${Math.min(220, availableWidth)}px`
  };
}

function toggleMobileViewSwitcher(): void {
  const nextVisible = !mobileViewSwitcherVisible.value;
  mobileViewSwitcherVisible.value = nextVisible;
  if (nextVisible) {
    closeDocumentTabsDropdown();
    closeTaskViewGroupMenu();
    closeKanbanFilterPopover();
    closeTableFilterPopover();
  }
}

function closeMobileViewSwitcher(): void {
  mobileViewSwitcherVisible.value = false;
}

function updateCompactViewSwitcherMode(): void {
  if (isMobileFrontend) {
    isCompactViewSwitcher.value = false;
    return;
  }
  const containerWidth = kanbanViewRef.value?.clientWidth || window.innerWidth || 0;
  isCompactViewSwitcher.value = containerWidth > 0 && containerWidth <= COMPACT_VIEW_SWITCHER_BREAKPOINT;
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

function selectMobileView(view: TaskViewMode): void {
  currentView.value = view;
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
setupFilterTypeWatcher(tableFilterType, tableFilterDocument, () => getDocumentTabTaskMatcher('table'));
setupFilterTypeWatcher(monthFilterType, monthFilterDocument, () => getDocumentTabTaskMatcher('month'));
setupFilterTypeWatcher(weekFilterType, weekFilterDocument, () => getDocumentTabTaskMatcher('week'));
setupFilterTypeWatcher(dayFilterType, dayFilterDocument, () => getDocumentTabTaskMatcher('day'));

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

const shouldLoadHeadingGroups = computed(() =>
  kanbanGroupBy.value === 'heading' || tableGroupBy.value === 'heading'
);

let taskHeadingGroupRequestId = 0;

async function refreshTaskHeadingGroups(): Promise<void> {
  const requestId = ++taskHeadingGroupRequestId;
  const resolvedGroups = await resolveTaskHeadingGroups(tasks.value);
  if (requestId !== taskHeadingGroupRequestId) {
    return;
  }
  taskHeadingGroups.value = resolvedGroups;
}

watch([
  currentView,
  kanbanGroupBy,
  tableGroupBy,
  showKanbanTaskCardDetails,
  kanbanFilterType,
  kanbanFilterDocument,
  tableFilterType,
  tableFilterDocument,
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
watch(tableGroupBy, async (mode) => {
  if (mode !== 'group') {
    return;
  }
  await ensureTaskGroupsLoaded();
});

const tableArchiveMode = computed<'active' | 'archived'>(() =>
  currentView.value === 'archive-table' ? 'archived' : 'active'
);

const tableFilters = {
  notebook: tableFilterType,
  document: tableFilterDocument,
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

const monthViewTasks = computed(() => {
  return tasks.value.filter(task => {
    if (task.type !== 'block') return false;
    if (task.archived) return false;
    if (!task.startDate && !task.dueDate) return false;
    if (monthFilterType.value !== 'all' && task.notebookId !== monthFilterType.value) {
      return false;
    }
    if (monthFilterDocument.value !== 'all' && task.rootId !== monthFilterDocument.value) {
      return false;
    }
    
    return true;
  });
});

const weekViewTasks = computed(() => {
  return tasks.value.filter(task => {
    if (task.type !== 'block') return false;
    if (task.archived) return false;
    if (!task.startDate && !task.dueDate) return false;
    if (weekFilterType.value !== 'all' && task.notebookId !== weekFilterType.value) {
      return false;
    }
    if (weekFilterDocument.value !== 'all' && task.rootId !== weekFilterDocument.value) {
      return false;
    }
    
    return true;
  });
});

const dayViewTasks = computed(() => {
  return tasks.value.filter(task => {
    if (task.type !== 'block') return false;
    if (task.archived) return false;
    if (!task.startDate && !task.dueDate) return false;
    if (dayFilterType.value !== 'all' && task.notebookId !== dayFilterType.value) {
      return false;
    }
    if (dayFilterDocument.value !== 'all' && task.rootId !== dayFilterDocument.value) {
      return false;
    }

    return true;
  });
});

watch(tasks, () => {
  invalidateTableFilters();
}, { immediate: true });

watch(visibleKanbanTasks, (nextTasks) => {
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

function createSidebarSortContext(): SidebarSortContext {
  return {
    todayStart: getStartOfDay(new Date()).getTime(),
    domOrderMap: buildLiveTaskDomOrderMap()
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

function resetKanbanBatchEditInputs(): void {
  kanbanBatchEditStatus.value = '';
  kanbanBatchEditPriority.value = '';
  kanbanBatchEditGroupId.value = '';
}

function clearKanbanBatchSelection(): void {
  kanbanBatchSelectedTaskIds.value = new Set();
}

function exitKanbanBatchEditMode(): void {
  finishKanbanBatchLassoSelection();
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

function handleKanbanTaskOpenClick(task: Task): void {
  if (isKanbanBatchEditMode.value) {
    if (isKanbanBatchCardClickSuppressed()) {
      return;
    }
    toggleKanbanTaskBatchSelection(task.id);
    return;
  }
  void handleTaskEditClick(task);
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

async function applyKanbanBatchEdit(): Promise<void> {
  if (isKanbanBatchApplying.value) {
    return;
  }
  const selectedIds = Array.from(kanbanBatchSelectedTaskIds.value);
  if (selectedIds.length === 0) {
    await pushMsg('请先选择任务', 2200);
    return;
  }

  const nextStatus = isKanbanBatchStatus(kanbanBatchEditStatus.value) ? kanbanBatchEditStatus.value : null;
  const nextPriority = isKanbanBatchPriority(kanbanBatchEditPriority.value) ? kanbanBatchEditPriority.value : null;
  const rawGroupSelection = typeof kanbanBatchEditGroupId.value === 'string' ? kanbanBatchEditGroupId.value.trim() : '';
  const validGroupIds = visibleTaskGroupIdSet.value;
  let nextGroupId: string | null = null;
  if (rawGroupSelection) {
    if (rawGroupSelection === TASK_GROUP_NONE_ID) {
      nextGroupId = '';
    } else if (validGroupIds.has(rawGroupSelection)) {
      nextGroupId = rawGroupSelection;
    } else {
      await pushMsg('请选择有效标签', 2200);
      return;
    }
  }

  if (!nextStatus && !nextPriority && nextGroupId === null) {
    await pushMsg('请选择要批量修改的字段', 2200);
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
      attrs['custom-task-status'] = nextStatus;
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
    await pushMsg('未检测到可更新的任务', 2200);
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
        if (update.nextGroupId !== null) {
          targetTask.groupId = update.nextGroupId;
          crdtRepo.updateTaskField(update.task.id, 'groupId', update.nextGroupId);
        }
        targetTask.updatedAt = nowIso;
      }
    });

    invalidateTableFilters();
    if (changedBlockIds.length > 0) {
      eventBus.emit(Events.TASK_CHANGED, { blockIds: changedBlockIds });
    }
    if (hasNewlyCompletedTask && taskCompletionSoundEnabled.value) {
      playTaskCompletionSound();
    }

    if (successCount > 0) {
      await pushMsg(`已批量更新 ${successCount} 项任务`, 2200);
    }
    if (failedCount > 0) {
      await pushMsg(`有 ${failedCount} 项任务更新失败`, 3000);
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
  return matchesKanbanFiltersByDocumentScope(task, true);
}

function matchesTableFiltersByArchivedState(task: Task, archivedOnly: boolean): boolean {
  if (task.type !== 'block') return false;
  if (archivedOnly ? !task.archived : task.archived) return false;
  if (task.isVirtual) return false;
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
  if (activeTableGroupFilters.value.length > 0) {
    const groupId = typeof task.groupId === 'string' ? task.groupId.trim() : '';
    const resolvedGroupId = groupId || TASK_GROUP_NONE_ID;
    if (!activeTableGroupFilters.value.includes(resolvedGroupId)) {
      return false;
    }
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

const kanbanTasksByVisualStatus = computed<Record<string, Task[]>>(() => {
  const grouped: Record<string, Task[]> = {
    'pending': [],
    'in-progress': [],
    'delayed': [],
    'completed': [],
    'cancelled': []
  };

  for (const task of tasks.value) {
    if (!matchesKanbanFilters(task)) continue;
    const status = getTaskVisualStatus(task);
    if (grouped[status]) {
      grouped[status].push(task);
    }
  }

  const sortContext = createSidebarSortContext();
  for (const list of Object.values(grouped)) {
    sortTasksLikeSidebar(list, sortContext);
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

  for (const task of tasks.value) {
    if (!matchesKanbanFilters(task)) continue;
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

  for (const task of tasks.value) {
    if (!matchesKanbanFilters(task)) continue;
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
  const filteredTasks = tasks.value.filter(task => matchesKanbanFilters(task));
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
  return kanbanTasksByGroup.value[column.id] || [];
}

function shouldUseKanbanVirtualList(column: KanbanColumn, taskCount: number): boolean {
  if (column.type !== 'status' && column.type !== 'group' && column.type !== 'heading' && column.type !== 'date') {
    return false;
  }
  if (taskCount <= KANBAN_VIRTUAL_THRESHOLD) {
    return false;
  }
  return expandedKanbanTaskIds.value.size === 0;
}

function getKanbanVirtualRange(column: KanbanColumn, totalCount: number) {
  if (!shouldUseKanbanVirtualList(column, totalCount)) {
    return { start: 0, end: totalCount, top: 0, bottom: 0 };
  }
  const metrics = kanbanColumnMetrics.value[column.id];
  const scrollTop = metrics?.scrollTop || 0;
  const height = metrics?.height || 600;
  const estimatedHeight = kanbanColumnEstimatedHeights.value[column.id] || KANBAN_VIRTUAL_CARD_HEIGHT;
  const startIndex = Math.max(
    0,
    Math.floor(scrollTop / estimatedHeight) - KANBAN_VIRTUAL_OVERSCAN
  );
  const visibleCount = Math.ceil(height / estimatedHeight) + KANBAN_VIRTUAL_OVERSCAN * 2;
  const endIndex = Math.min(totalCount, startIndex + visibleCount);
  const topPadding = startIndex * estimatedHeight;
  const totalHeight = totalCount * estimatedHeight;
  const bottomPadding = Math.max(0, totalHeight - topPadding - (endIndex - startIndex) * KANBAN_VIRTUAL_CARD_HEIGHT);
  return {
    start: startIndex,
    end: endIndex,
    top: topPadding,
    bottom: bottomPadding
  };
}

function getVisibleTasksForColumn(column: KanbanColumn): Task[] {
  const tasks = getTasksForColumn(column);
  const range = getKanbanVirtualRange(column, tasks.length);
  return tasks.slice(range.start, range.end);
}

function getKanbanSpacerStyle(column: KanbanColumn): Record<string, string> {
  const tasks = getTasksForColumn(column);
  if (!shouldUseKanbanVirtualList(column, tasks.length)) {
    return {};
  }
  const range = getKanbanVirtualRange(column, tasks.length);
  return {
    paddingTop: `${range.top}px`,
    paddingBottom: `${range.bottom}px`
  };
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
      if (!titleHtml.includes('<sup')) {
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
    console.error('[KanbanView] 任务标题同步失败:', error);
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
  const card = el.querySelector<HTMLElement>('.kanban-task-card');
  if (!card) return;
  const height = Math.round(card.getBoundingClientRect().height);
  if (!height) return;
  const prev = kanbanColumnEstimatedHeights.value[columnId] || KANBAN_VIRTUAL_CARD_HEIGHT;
  if (Math.abs(prev - height) < 4) {
    return;
  }
  kanbanColumnEstimatedHeights.value = {
    ...kanbanColumnEstimatedHeights.value,
    [columnId]: height
  };
}

function setKanbanColumnTasksRef(columnId: string, el: HTMLElement | null): void {
  if (!el) return;
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
  if (kanbanMetricsRaf !== null) {
    cancelAnimationFrame(kanbanMetricsRaf);
  }
  kanbanMetricsRaf = requestAnimationFrame(() => {
    kanbanMetricsRaf = null;
    const el = kanbanColumnElements.get(columnId);
    if (!el) return;
    updateKanbanColumnMetrics(columnId, el);
    updateKanbanColumnEstimate(columnId, el);
  });
}

async function loadTasks(
  forceRefresh: boolean = false,
  options: { silent?: boolean; validateSelection?: boolean } = {}
) {
  const { silent = false, validateSelection = true } = options;
  if (!silent) {
    loading.value = true;
  }
  try {
    if (forceRefresh) {
      await TaskRepository.clearCache();
    }
    const sqlTasks = await TaskRepository.getAllTasks(
      !forceRefresh,
      { includeArchived: true },
      { useLiveDom: false }
    );
    syncFromSQL(sqlTasks);
    tasks.value = applyDraggedStatusLocks(tasks.value);
    if (validateSelection) {
      validateDocumentSelection();
    }
    scheduleKanbanTitleHydration(120);
  } catch (error) {
    console.error('[KanbanView] 加载任务失败:', error);
  } finally {
    if (!silent) {
      loading.value = false;
    }
  }
}

async function refreshTasks() {
  await TaskRepository.clearCache();
  await loadTasks(true);
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

function hasSuppressedBlockId(blockIds: string[]): boolean {
  if (!blockIds.length) return false;
  return blockIds.some(id => typeof id === 'string' && id.length > 0 && isDragTaskSyncSuppressed(id));
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

  if (kanbanFilterType.value !== 'all' && !enabledNotebookIds.has(kanbanFilterType.value)) {
    kanbanFilterType.value = 'all';
    kanbanFilterDocument.value = 'all';
    changed = true;
  }

  if (weekFilterType.value !== 'all' && !enabledNotebookIds.has(weekFilterType.value)) {
    weekFilterType.value = 'all';
    weekFilterDocument.value = 'all';
    changed = true;
  }

  return changed;
}

async function loadUserSettings() {
  isHydratingSettings.value = true;
  try {
    const settings = userSettings.kanban;
    kanbanFilterType.value = settings.kanbanFilterType || 'all';
    kanbanFilterDocument.value = settings.kanbanFilterDocument || 'all';
    kanbanGroupBy.value = resolveStoredTaskViewGroupMode(settings.kanbanGroupBy, settings.kanbanGroupMode, 'status');
    tableGroupBy.value = resolveStoredTaskViewGroupMode(settings.tableGroupBy, settings.tableGroupMode, 'status');
    showKanbanTaskCardDetails.value = settings.showKanbanTaskCardDetails !== false;
    tableFilterType.value = settings.tableFilterType || 'all';
    tableFilterDocument.value = settings.tableFilterDocument || 'all';
    monthFilterType.value = settings.monthFilterType || 'all';
    monthFilterDocument.value = settings.monthFilterDocument || 'all';
    weekFilterType.value = settings.weekFilterType || 'all';
    weekFilterDocument.value = settings.weekFilterDocument || 'all';
    dayFilterType.value = settings.dayFilterType || settings.weekFilterType || 'all';
    dayFilterDocument.value = settings.dayFilterDocument || 'all';
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
    console.error('[KanbanView] 加载用户设置失败:', error);
  }
  isHydratingSettings.value = false;
}

async function saveUserSettings() {
  try {
    await updateSettings('kanban', {
      currentView: currentView.value,
      kanbanGroupMode: kanbanGroupBy.value === 'group',
      tableGroupMode: tableGroupBy.value === 'group',
      kanbanGroupBy: kanbanGroupBy.value,
      tableGroupBy: tableGroupBy.value,
      showKanbanTaskCardDetails: showKanbanTaskCardDetails.value,
      kanbanFilterType: kanbanFilterType.value,
      kanbanFilterDocument: kanbanFilterDocument.value,
      tableFilterType: tableFilterType.value,
      tableFilterDocument: tableFilterDocument.value,
      monthFilterType: monthFilterType.value,
      monthFilterDocument: monthFilterDocument.value,
      weekFilterType: weekFilterType.value,
      weekFilterDocument: weekFilterDocument.value,
      dayFilterType: dayFilterType.value,
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
    console.error('[KanbanView] 保存用户设置失败:', error);
  }
}

async function validateDocumentSelection() {
  let hasChanges = false;

  if (kanbanFilterDocument.value !== 'all') {
    const availableDocIds = getDocumentIdsByNotebook(kanbanFilterType.value, {
      excludeCompletedOnlyDocs: shouldHideCompletedOnlyDocumentTabs('kanban'),
      taskMatcher: getDocumentTabTaskMatcher('kanban')
    });
    if (!availableDocIds.includes(kanbanFilterDocument.value)) {
      kanbanFilterDocument.value = 'all';
      hasChanges = true;
    }
  }

  if (tableFilterDocument.value !== 'all') {
    const availableDocIds = getDocumentIdsByNotebook(tableFilterType.value, {
      excludeCompletedOnlyDocs: shouldHideCompletedOnlyDocumentTabs('table'),
      taskMatcher: getDocumentTabTaskMatcher('table')
    });
    if (!availableDocIds.includes(tableFilterDocument.value)) {
      tableFilterDocument.value = 'all';
      hasChanges = true;
    }
  }

  if (monthFilterDocument.value !== 'all') {
    const availableDocIds = getDocumentIdsByNotebook(monthFilterType.value, {
      taskMatcher: getDocumentTabTaskMatcher('month')
    });
    if (!availableDocIds.includes(monthFilterDocument.value)) {
      monthFilterDocument.value = 'all';
      hasChanges = true;
    }
  }

  if (weekFilterDocument.value !== 'all') {
    const availableDocIds = getDocumentIdsByNotebook(weekFilterType.value, {
      taskMatcher: getDocumentTabTaskMatcher('week')
    });
    if (!availableDocIds.includes(weekFilterDocument.value)) {
      weekFilterDocument.value = 'all';
      hasChanges = true;
    }
  }

  if (dayFilterDocument.value !== 'all') {
    const availableDocIds = getDocumentIdsByNotebook(dayFilterType.value, {
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
  options: { allowUnknown?: boolean } = {},
  delay = 24
): void {
  if (options.allowUnknown) {
    queuedIncrementalAllowUnknown = true;
  }
  incrementalUpdateQueue.enqueue(blockIds, delay);
}

const incrementalUpdateQueue = createBlockIdBatchQueue({
  maxBatchSize: MAX_INCREMENTAL_BLOCKS_PER_FLUSH,
  onFlushBatch: async (blockIds, remainingCount) => {
    const allowUnknown = queuedIncrementalAllowUnknown;
    await incrementalUpdateTasks(blockIds, { allowUnknown });
    if (remainingCount === 0) {
      queuedIncrementalAllowUnknown = false;
    }
  }
});

function setupEventListeners() {
  const unsubscribeChanged = eventBus.on(Events.TASK_CHANGED, (data?: { blockIds?: string[] }) => {
    if (data?.blockIds && data.blockIds.length > 0) {
      if (hasSuppressedBlockId(data.blockIds)) {
        return;
      }
      const blockIds = filterSuppressedBlockIds(data.blockIds);
      if (blockIds.length > 0) {
        queueIncrementalUpdates(blockIds);
      }
    }
  });

  const unsubscribeDeleted = eventBus.on(Events.TASK_DELETED, ({ blockId }: { blockId: string }) => {
    const taskIndex = tasks.value.findIndex(t => t.blockId === blockId);
    if (taskIndex !== -1) {
      tasks.value = tasks.value.filter(t => t.blockId !== blockId);
      invalidateTableFilters();
    }
  });

  const unsubscribeUpdated = eventBus.on(Events.TASK_UPDATED, ({ blockId }: { blockId: string }) => {
    if (isDragTaskSyncSuppressed(blockId)) {
      return;
    }
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
        scheduleRefreshTasks(100, 'silent-full');
      }
      return;
    }
    if (payload?.blockId) {
      const addedBlockId = payload.blockId;
      const scopedBlockIds = await TaskRepository.filterIncludedBlockIds([payload.blockId]);
      if (scopedBlockIds.length === 0) {
        return;
      }

      queueIncrementalUpdates(scopedBlockIds, { allowUnknown: true });
      window.setTimeout(() => {
        void (async () => {
          if (hasTaskOrSubtask(addedBlockId)) {
            return;
          }
          if (await isSubtaskBlockId(addedBlockId)) {
            return;
          }
          scheduleRefreshTasks(180, 'full');
        })();
      }, 220);
      return;
    }
    scheduleRefreshTasks(180, 'full');
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
  const unsubscribeViewSwitchRequested = eventBus.on(
    Events.KANBAN_VIEW_SWITCH_REQUEST,
    (payload?: { view?: unknown }) => {
      const nextView = normalizeTaskViewMode(payload?.view);
      if (currentView.value !== nextView) {
        currentView.value = nextView;
      }
    }
  );

  eventUnsubscribers.push(
    unsubscribeChanged,
    unsubscribeDeleted,
    unsubscribeUpdated,
    unsubscribeAdded,
    unsubscribeGroupsUpdated,
    unsubscribeViewSwitchRequested
  );
}

function cleanupEventListeners() {
  eventUnsubscribers.forEach(unsubscribe => unsubscribe());
  eventUnsubscribers = [];
  incrementalUpdateQueue.clear();
  queuedIncrementalAllowUnknown = false;
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

async function fastSyncTaskFromDom(
  blockIds: string[],
  taskIndexMap: Map<string, number>,
  subtaskNodeMap: Map<string, SubtaskLookup>
): Promise<{
  unresolvedBlockIds: string[];
  patchedParentStatuses: Map<string, Task['status']>;
  hasPatched: boolean;
}> {
  const unresolved: string[] = [];
  const patchedParentStatuses = new Map<string, Task['status']>();
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
    return { unresolvedBlockIds: unresolved, patchedParentStatuses, hasPatched };
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
      const nextStatus: Task['status'] = completed
        ? 'completed'
        : (task.status === 'completed' ? 'pending' : (task.status || 'pending'));
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
      continue;
    }

    unresolved.push(blockId);
  }

  return {
    unresolvedBlockIds: unresolved,
    patchedParentStatuses,
    hasPatched
  };
}

async function incrementalUpdateTasks(
  blockIds: string[],
  options: { allowUnknown?: boolean } = {}
) {
  const { allowUnknown = false } = options;
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
    const { patchedParentStatuses, hasPatched } = await fastSyncTaskFromDom(
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
    
    const updatedTasksMap = await TaskRepository.getTasksByBlockIds(
      Array.from(parentBlockIds),
      false,
      undefined,
      { useLiveDom: true }
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
      const lockedStatus = task.blockId ? getLockedDraggedTaskStatus(task.blockId) : null;
      if (lockedStatus) {
        task.status = lockedStatus;
      }
    });
    
    let touched = hasPatched;

    for (const blockId of parentBlockIds) {
      const updatedTask = updatedTasksMap.get(blockId);
      const oldIndex = taskIndexMap.get(blockId);
      
      if (updatedTask) {
        if (oldIndex !== undefined) {
          const currentTask = tasks.value[oldIndex];
          updatedTask.subtasks = mergeSubtaskCustomFields(currentTask?.subtasks, updatedTask.subtasks);
          if (currentTask) {
            Object.assign(currentTask, updatedTask);
          } else {
            tasks.value[oldIndex] = updatedTask;
          }
        } else {
          tasks.value.push(updatedTask);
        }
        touched = true;
      }
    }

    const repeatReconcilePayloads = buildRepeatReconcilePayloadsFromTasks(Array.from(updatedTasksMap.values()));
    if (repeatReconcilePayloads.length > 0) {
      let reconciledTasks = tasks.value;
      let repeatTouched = false;
      for (const payload of repeatReconcilePayloads) {
        const result = await rebuildAffectedRepeatTasks(
          reconciledTasks,
          payload,
          { pastDays: 60, futureDays: 120 }
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
      invalidateTableFilters();
      
      await nextTick();
    }
  } catch (error) {
    console.error('[KanbanView] 增量更新任务失败:', error);
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

function resolveKanbanEditorPanelElement(): HTMLElement | null {
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
    const refreshedTasks = await TaskRepository.getAllTasks(false, undefined, { useLiveDom: false });
    const refreshedTask = refreshedTasks.find(item => item.blockId === task.blockId);
    if (!refreshedTask) return;
    crdtRepo.syncIncrementalTasks([refreshedTask]);
    updateTasks();
  } catch (error) {
    console.warn('[KanbanView] 获取子任务失败:', error);
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
  if (description === (task.description || '')) {
    clearInlineDescriptionEdit(taskId);
    return;
  }

  inlineDescriptionSavingTaskIds.add(taskId);
  try {
    await handleDescriptionUpdate(task, description);
  } finally {
    inlineDescriptionSavingTaskIds.delete(taskId);
    clearInlineDescriptionEdit(taskId);
  }
}

function handleTaskClick(task: Task, event?: MouseEvent) {
  if (event && (currentView.value === 'kanban' || currentView.value === 'table' || currentView.value === 'archive-table')) {
    void openKanbanEditor(task, event);
    return;
  }
  if (task.type === 'block' && task.blockId) {
    void openBlockById(task.blockId);
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
  void openKanbanEditor(task, syntheticEvent);
}

function toggleKanbanEditorPriorityPopover(event: MouseEvent): void {
  if (!activeKanbanEditTask.value || !activeKanbanEditDraft.value) {
    kanbanEditorPriorityPopover.value = null;
    return;
  }
  if (kanbanEditorPriorityPopover.value) {
    kanbanEditorPriorityPopover.value = null;
    return;
  }
  const target = event.currentTarget as HTMLElement | null;
  if (!target) return;
  const rect = target.getBoundingClientRect();
  kanbanEditorPriorityPopover.value = {
    position: {
      x: rect.left + rect.width / 2,
      y: rect.bottom + 8
    }
  };
}

async function handleKanbanEditorPrioritySelect(value: string): Promise<void> {
  if (!activeKanbanEditTask.value || !activeKanbanEditDraft.value) return;
  const priority = value as Task['priority'];
  activeKanbanEditDraft.value.priority = priority;
  await handlePriorityUpdate(activeKanbanEditTask.value, priority);
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
    '更新任务置顶失败'
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

function handleKanbanEditorDateSelect(value: string): void {
  if (!activeKanbanEditTask.value || !activeKanbanEditDraft.value) return;
  const normalized = normalizeDateInputValue(value || '');
  activeKanbanEditDraft.value.dueDate = normalized;
  void handleDueDateUpdate(activeKanbanEditTask.value, normalized);
  invalidateTableFilters();
}

async function handleKanbanEditorGroupSelect(value: string): Promise<void> {
  if (!activeKanbanEditTask.value || !activeKanbanEditDraft.value) return;
  const groupId = value === TASK_GROUP_NONE_ID ? '' : value;
  const normalized = typeof groupId === 'string' ? groupId.trim() : '';
  activeKanbanEditDraft.value.groupId = normalized;
  await applyBlockTaskFieldUpdate(
    activeKanbanEditTask.value,
    { 'custom-task-group': normalized || '' },
    'groupId',
    normalized || undefined,
    '更新任务标签失败'
  );
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
    '更新任务提醒失败',
    () => {
      updateTaskLocalField(
        activeKanbanEditTask.value!.id,
        'reminderCustomTime',
        normalizedReminder.reminderCustomTimeValue
      );
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
    await pushMsg('该任务无法移动', 2000);
    return;
  }

  if (notebooks.value.length === 0) {
    await loadNotebooks();
  }

  kanbanEditorPriorityPopover.value = null;
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
      eventBus.emit(Events.TASK_CHANGED, { blockIds: [moveResult.blockId] });
    }
    scheduleRefreshTasks(120, 'silent-full');
  } catch (error) {
    console.error('[KanbanView] 移动任务失败:', error);
    isKanbanTaskMoveSubmitting.value = false;
    await pushMsg('移动任务失败，请稍后重试', 3000);
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
      if (blockId) {
        eventBus.emit(Events.TASK_CHANGED, { blockIds: [blockId] });
      } else {
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
    if (blockId) {
      eventBus.emit(Events.TASK_CHANGED, { blockIds: [blockId] });
    } else {
      scheduleRefreshTasks(120, 'silent-full');
    }
  } catch (error) {
    console.error('[KanbanView] 切换任务归档失败:', error);
    await pushMsg('归档操作失败，请稍后重试', 3000);
  }
}

async function handleKanbanEditorDelete(): Promise<void> {
  const task = activeKanbanEditTask.value;
  if (!task) {
    return;
  }

  if (!window.confirm('确认删除该任务？')) {
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
    console.error('[KanbanView] 删除任务失败:', error);
    await pushMsg('删除任务失败，请稍后重试', 3000);
  }
}

function closeKanbanEditor(): void {
  kanbanEditorVisible.value = false;
  kanbanEditorTaskId.value = null;
  kanbanEditorDraft.value = null;
  kanbanEditorQuickPanel.value = null;
  kanbanEditorPriorityPopover.value = null;
  showKanbanTaskMoveDialog.value = false;
  isKanbanTaskMoveSubmitting.value = false;
  kanbanMoveSelectedNotebook.value = '';
  kanbanMoveSelectedDocument.value = '';
  if (kanbanEditorProtyle) {
    try {
      kanbanEditorProtyle.destroy();
    } catch {
    }
    kanbanEditorProtyle = null;
  }
  if (kanbanEditorMountRef.value) {
    kanbanEditorMountRef.value.innerHTML = '';
  }
}

function handleKanbanEditorOutsideClick(event: MouseEvent): void {
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
    && (node.classList.contains('date-popover') || node.classList.contains('date-popover-overlay'))
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
  if (taskViewGroupMenuVisible.value) {
    if (taskViewGroupMenuControlRef.value?.contains(target)) {
      return;
    }
    if (taskViewGroupMenuPopoverRef.value?.contains(target)) {
      return;
    }
    closeTaskViewGroupMenu();
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
  if (taskViewGroupMenuVisible.value) {
    closeTaskViewGroupMenu();
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
    clampKanbanEditorPosition();
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
}

async function focusKanbanEditorBlock(
  blockId: string,
  retries = 20,
  intervalMs = 80
): Promise<boolean> {
  const normalizedBlockId = typeof blockId === 'string' ? blockId.trim() : '';
  if (!normalizedBlockId || !kanbanEditorProtyle || !kanbanEditorMountRef.value) {
    return false;
  }

  const tryFocus = (): boolean => {
    const mountElement = kanbanEditorMountRef.value;
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
    console.warn('[KanbanView] 解析重复任务模板失败:', error);
  }

  return null;
}

async function openKanbanEditor(task: Task, event: MouseEvent): Promise<void> {
  const targetTask = await resolveKanbanEditorTargetTask(task);
  const blockId = typeof targetTask?.blockId === 'string' ? targetTask.blockId.trim() : '';
  if (!targetTask || targetTask.type !== 'block' || !blockId) {
    const message = task.isVirtual ? '未找到重复任务模板，无法编辑' : '该任务无法编辑';
    await pushMsg(message, 2000);
    return;
  }
  if (openingKanbanEditorBlockIds.has(blockId)) {
    return;
  }
  await ensureTaskGroupsLoaded();
  kanbanEditorTaskId.value = targetTask.id;
  const normalizedReminder = normalizeTaskReminderSelection(targetTask);
  kanbanEditorDraft.value = {
    taskId: targetTask.id,
    status: targetTask.status || 'pending',
    dueDate: typeof targetTask.dueDate === 'string' ? targetTask.dueDate : '',
    description: typeof targetTask.description === 'string' ? targetTask.description : '',
    reminderType: normalizedReminder.reminderType,
    reminderCustomTime: normalizedReminder.reminderCustomTime,
    groupId: typeof targetTask.groupId === 'string' ? targetTask.groupId : '',
    priority: targetTask.priority || 'none'
  };
  kanbanEditorQuickPanel.value = null;
  kanbanEditorPriorityPopover.value = null;
  openingKanbanEditorBlockIds.add(blockId);
  setKanbanEditorPositionFromEvent(event);
  kanbanEditorVisible.value = true;
  await nextTick();
  clampKanbanEditorPosition();

  const plugin = usePlugin();
  const mountElement = kanbanEditorMountRef.value;
  if (!plugin?.app || !mountElement) {
    openingKanbanEditorBlockIds.delete(blockId);
    closeKanbanEditor();
    await pushMsg('编辑器初始化失败', 2000);
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
      action: ['cb-get-focus'],
      mode: 'wysiwyg',
      render: {
        title: false,
        breadcrumb: false,
        gutter: false,
        scroll: false
      }
    };
    const rootId = typeof targetTask.rootId === 'string' ? targetTask.rootId.trim() : '';
    if (rootId) {
      options.rootId = rootId;
    }
    kanbanEditorProtyle = new Protyle(plugin.app, mountElement, options);
    await focusKanbanEditorBlock(blockId);
    clampKanbanEditorPosition();
  } catch {
    kanbanEditorProtyle = null;
    closeKanbanEditor();
    await pushMsg('编辑器打开失败', 2000);
  } finally {
    openingKanbanEditorBlockIds.delete(blockId);
  }
}

async function handleTaskEditClick(task: Task): Promise<void> {
  if (task.type === 'block' && task.blockId) {
    await openBlockById(task.blockId);
  }
}

function handleTaskDateChanged(updatedTask: Task) {
  const task = tasks.value.find(t => t.id === updatedTask.id);
  if (!task) return;
  
  if (updatedTask.startDate !== task.startDate) {
    crdtRepo.updateTaskField(task.id, 'startDate', updatedTask.startDate);
  }
  
  if (updatedTask.dueDate !== task.dueDate) {
    crdtRepo.updateTaskField(task.id, 'dueDate', updatedTask.dueDate);
  }
  
  if (updatedTask.startTime !== task.startTime) {
    crdtRepo.updateTaskField(task.id, 'startTime', updatedTask.startTime);
  }
  
  if (updatedTask.dueTime !== task.dueTime) {
    crdtRepo.updateTaskField(task.id, 'dueTime', updatedTask.dueTime);
  }

  if (updatedTask.backgroundColor !== undefined && updatedTask.backgroundColor !== task.backgroundColor) {
    crdtRepo.updateTaskField(task.id, 'backgroundColor', updatedTask.backgroundColor);
    task.backgroundColor = updatedTask.backgroundColor;
  }
  
  updateTasks();
  eventBus.emit('task-date-changed', updatedTask);
}

function normalizeDocPath(notebookName: string, hPath: string): string {
  const prefix = `${notebookName}/`;
  if (hPath.startsWith(prefix)) {
    return hPath.slice(prefix.length);
  }
  return hPath;
}

function getCurrentSidebarFilterSelection(): { notebookId: string; documentId: string } {
  switch (currentView.value) {
    case 'kanban':
      return {
        notebookId: kanbanFilterType.value,
        documentId: kanbanFilterDocument.value
      };
    case 'table':
    case 'archive-table':
      return {
        notebookId: tableFilterType.value,
        documentId: tableFilterDocument.value
      };
    case 'month':
      return {
        notebookId: monthFilterType.value,
        documentId: monthFilterDocument.value
      };
    case 'three-day':
    case 'day':
      return {
        notebookId: dayFilterType.value,
        documentId: dayFilterDocument.value
      };
    case 'week':
    default:
      return {
        notebookId: weekFilterType.value,
        documentId: weekFilterDocument.value
      };
  }
}

function taskModalTranslate(key: string): string {
  return key;
}

function resolvePreferredTaskModalGroupId(): string {
  const activeGroupFilters =
    currentView.value === 'kanban'
      ? activeKanbanGroupFilters.value
      : (currentView.value === 'table' || currentView.value === 'archive-table'
        ? activeTableGroupFilters.value
        : []);
  if (activeGroupFilters.length !== 1) {
    return '';
  }
  const candidate = typeof activeGroupFilters[0] === 'string' ? activeGroupFilters[0].trim() : '';
  if (!candidate || candidate === TASK_GROUP_NONE_ID) {
    return '';
  }
  return taskGroups.value.some(group => group.id === candidate && group.hidden !== true) ? candidate : '';
}

function resolveTaskModalDefaults(): { notebookId: string; documentId: string; groupId: string } {
  const enabledNotebookIdSet = new Set(enabledNotebooks.value.map(notebook => notebook.id));
  const sidebarSelection = getCurrentSidebarFilterSelection();
  const firstNotebookId = enabledNotebooks.value[0]?.id || '';

  let notebookId = '';
  if (sidebarSelection.notebookId !== 'all' && enabledNotebookIdSet.has(sidebarSelection.notebookId)) {
    notebookId = sidebarSelection.notebookId;
  } else if (taskModalDefaultNotebook.value && enabledNotebookIdSet.has(taskModalDefaultNotebook.value)) {
    notebookId = taskModalDefaultNotebook.value;
  } else {
    notebookId = firstNotebookId;
  }

  const documentIdSet = new Set(getDocumentEntriesByNotebook(notebookId).map(doc => doc.id));
  let documentId = PINCH_INBOX_OPTION_ID;
  if (sidebarSelection.documentId !== 'all' && documentIdSet.has(sidebarSelection.documentId)) {
    documentId = sidebarSelection.documentId;
  } else if (
    taskModalDefaultDocument.value
    && taskModalDefaultDocument.value !== PINCH_INBOX_OPTION_ID
    && documentIdSet.has(taskModalDefaultDocument.value)
  ) {
    documentId = taskModalDefaultDocument.value;
  }

  const preferredGroupId = resolvePreferredTaskModalGroupId();
  const fallbackGroupId = (taskModalDefaultGroupId.value || '').trim();
  const hasFallbackGroup = fallbackGroupId
    && taskGroups.value.some(group => group.id === fallbackGroupId && group.hidden !== true);
  const groupId = preferredGroupId || (hasFallbackGroup ? fallbackGroupId : '');

  return {
    notebookId,
    documentId,
    groupId
  };
}

async function openHeaderTaskModal(): Promise<void> {
  if (enabledNotebooks.value.length === 0) {
    await pushMsg('暂无可用笔记本，请先在任务范围中启用笔记本', 3000);
    return;
  }
  await ensureTaskGroupsLoaded();
  const defaults = resolveTaskModalDefaults();
  taskModalDefaultNotebook.value = defaults.notebookId;
  taskModalDefaultDocument.value = defaults.documentId;
  taskModalDefaultGroupId.value = defaults.groupId;
  showTaskModal.value = true;
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

async function handleTaskModalCreate(
  taskData: TaskModalCreateTaskPayload,
  notebookId: string,
  documentId: string
): Promise<void> {
  try {
    let docPath = '';
    if (documentId && documentId !== PINCH_INBOX_OPTION_ID) {
      const target = resolveCreateTarget(notebookId, documentId);
      docPath = target?.docPath || '';
    }
    if (!docPath) {
      docPath = await ensureInboxDocument(notebookId);
    }

    const normalizedGroupId = typeof taskData.groupId === 'string' ? taskData.groupId.trim() : '';
    const created = await TaskRepository.createBlockTask({
      title: taskData.title,
      description: taskData.description || '',
      priority: taskData.priority || 'none',
      status: taskData.status || 'pending',
      dueDate: taskData.dueDate || undefined,
      reminderType: taskData.reminderType,
      reminderCustomTime: taskData.reminderCustomTime || undefined,
      tags: Array.isArray(taskData.tags) ? taskData.tags : [],
      groupId: normalizedGroupId || undefined
    }, notebookId, docPath);

    taskModalDefaultNotebook.value = notebookId;
    taskModalDefaultDocument.value = documentId;
    taskModalDefaultGroupId.value = normalizedGroupId;
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
    console.error('[KanbanView] 通过弹窗创建任务失败:', error);
    await pushMsg('创建任务失败，请稍后重试', 3000);
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
    throw new Error('创建标题任务列表容器失败');
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
    throw new Error('无法解析目标标题位置');
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
  const preferredNotebookId = options.preferredNotebookId || sidebarSelection.notebookId;
  quickCreateNotebookId.value = notebookOptions.value.some(option => option.value === preferredNotebookId)
    ? preferredNotebookId
    : 'all';

  const preferredDocumentId = options.preferredDocumentId || sidebarSelection.documentId;
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
    title: mode === 'heading-task' ? '' : '新建任务',
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
    await pushMsg('请输入标题名称', 2000);
    return;
  }
  if (!trimmedTitle) {
    await pushMsg('请输入任务标题', 2000);
    return;
  }

  const target = context?.fixedTarget || resolveCreateTarget(quickCreateNotebookId.value, quickCreateDocumentId.value);
  if (!target) {
    await pushMsg('请先选择笔记本和文档', 3000);
    return;
  }

  try {
    let headingMetaForNewTask: TaskHeadingGroupMeta | null = null;
    if (isHeadingTaskMode) {
      const headingBlockId = await createQuickCreateHeading(target.documentId, headingTitle);
      if (!headingBlockId) {
        await pushMsg('创建标题失败，请稍后重试', 3000);
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
        } catch (error) {
          console.error('[KanbanView] 新建任务后移动到标题失败:', error);
          await pushMsg('任务已创建，但移动到标题失败', 3000);
        }
      }
    }

    closeQuickCreateDialog();
    if (created?.blockId) {
      const createdBlockId = created.blockId;
      await incrementalUpdateTasks([createdBlockId], { allowUnknown: true });
      if (!tasks.value.some(t => t.blockId === createdBlockId)) {
        queueIncrementalUpdates([createdBlockId], { allowUnknown: true }, 120);
        window.setTimeout(() => {
          if (!tasks.value.some(t => t.blockId === createdBlockId)) {
            scheduleRefreshTasks(180, 'silent-full');
          }
        }, 420);
      }
    } else {
      scheduleRefreshTasks(180, 'silent-full');
    }
  } catch (error) {
    console.error('[KanbanView] 创建任务失败:', error);
    await pushMsg('创建任务失败，请稍后重试', 3000);
  }
}

async function toggleTaskStatus(task: Task) {
  const wasCompleted = task.status === 'completed';
  const newStatus = task.status === 'completed' ? 'pending' : 'completed';
  const shouldPlayCompletionSound = !wasCompleted && newStatus === 'completed';

  try {
    if (task.isVirtual && task.repeatSeriesId && task.repeatInstanceDate) {
      await TaskRepository.updateRepeatInstanceStatus(task, newStatus);
      updateTaskLocalField(task.id, 'status', newStatus);
      if (shouldPlayCompletionSound && taskCompletionSoundEnabled.value) {
        playTaskCompletionSound();
      }
      return;
    }

    if (task.type === 'block' && task.blockId) {
      await setBlockAttrs(task.blockId, {
        'custom-task-status': newStatus
      });
      
      await TaskRepository.clearCache();
      
      if (newStatus === 'completed') {
        await updateTaskMarkdown(task.blockId, true);
      } else {
        await updateTaskMarkdown(task.blockId, false);
      }
      
      crdtRepo.updateTaskField(task.id, 'status', newStatus);
      
      const taskIndex = tasks.value.findIndex(t => t.id === task.id);
      if (taskIndex !== -1) {
        tasks.value[taskIndex].status = newStatus;
      }
      if (shouldPlayCompletionSound && taskCompletionSoundEnabled.value) {
        playTaskCompletionSound();
      }
    }
  } catch (error) {
    console.error('[KanbanView] 切换任务状态失败:', error);
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
      eventBus.emit(Events.TASK_CHANGED, { blockIds: changedBlockIds });
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
    '更新子任务描述失败'
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
    '更新子任务优先级失败'
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
    '更新子任务状态失败',
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
    '更新子任务标签失败'
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
    '更新子任务开始日期失败'
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
    '更新子任务截止日期失败'
  );
}

async function handleDescriptionUpdate(task: Task, description: string) {
  await applyBlockTaskFieldUpdate(
    task,
    { 'custom-task-description': description || '' },
    'description',
    description,
    '更新任务描述失败'
  );
}

async function handlePriorityUpdate(task: Task, priority: Task['priority']) {
  await applyBlockTaskFieldUpdate(
    task,
    { 'custom-task-priority': priority },
    'priority',
    priority,
    '更新任务优先级失败'
  );
}

async function handleStatusUpdate(task: Task, status: Task['status']) {
  const wasCompleted = task.status === 'completed';
  await applyBlockTaskFieldUpdate(
    task,
    { 'custom-task-status': status },
    'status',
    status,
    '更新任务状态失败',
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
  const normalizedGroupId = typeof groupId === 'string' ? groupId.trim() : '';
  await applyBlockTaskFieldUpdate(
    task,
    { 'custom-task-group': normalizedGroupId || '' },
    'groupId',
    normalizedGroupId || undefined,
    '更新任务标签失败'
  );
  invalidateTableFilters();
}

async function handleStartDateUpdate(task: Task, startDate: string) {
  await applyBlockTaskFieldUpdate(
    task,
    { 'custom-task-start-date': startDate || '' },
    'startDate',
    startDate,
    '更新开始日期失败'
  );
}

async function handleDueDateUpdate(task: Task, dueDate: string) {
  await applyBlockTaskFieldUpdate(
    task,
    { 'custom-task-due-date': dueDate || '' },
    'dueDate',
    dueDate,
    '更新截止日期失败'
  );
}

function updateTaskLocalField<K extends keyof Task>(taskId: string, field: K, value: Task[K]): void {
  const taskIndex = tasks.value.findIndex(t => t.id === taskId);
  if (taskIndex === -1) {
    return;
  }
  tasks.value[taskIndex][field] = value;
  tasks.value[taskIndex].updatedAt = new Date().toISOString();
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
      updateTaskLocalField(task.id, field, value);
    } catch (error) {
      console.error(`[KanbanView] ${errorMessage}:`, error);
    }
    return;
  }

  if (task.type === 'block' && task.blockId) {
    try {
      await setBlockAttrs(task.blockId, attrs);
      updateTaskLocalField(task.id, field, value);
      if (afterUpdate) {
        await afterUpdate(task.blockId);
      }
      eventBus.emit(Events.TASK_CHANGED, { blockIds: [task.blockId] });
    } catch (error) {
      console.error(`[KanbanView] ${errorMessage}:`, error);
    }
  }
}

function resolveGroupColumnDragId(column: KanbanColumn): string {
  if (column.type !== 'group') {
    return '';
  }
  return typeof column.groupId === 'string' ? column.groupId.trim() : '';
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

function moveTaskGroupsByPosition(
  groups: TaskGroup[],
  sourceId: string,
  targetId: string,
  position: 'before' | 'after'
): TaskGroup[] {
  const sourceIndex = groups.findIndex(group => group.id === sourceId);
  const targetIndex = groups.findIndex(group => group.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return groups;
  }

  const next = groups.map(group => ({ ...group }));
  const [moved] = next.splice(sourceIndex, 1);
  const targetIndexAfterRemoval = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
  const insertionIndex = position === 'before'
    ? targetIndexAfterRemoval
    : targetIndexAfterRemoval + 1;
  next.splice(Math.max(0, Math.min(insertionIndex, next.length)), 0, moved);
  return next;
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

  const currentGroups = taskGroups.value.map(group => ({ ...group }));
  const reorderedGroups = moveTaskGroupsByPosition(currentGroups, sourceId, targetId, position);
  if (reorderedGroups.length !== currentGroups.length) {
    return;
  }
  const currentOrder = currentGroups.map(group => group.id).join('|');
  const nextOrder = reorderedGroups.map(group => group.id).join('|');
  if (currentOrder === nextOrder) {
    return;
  }

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
    const refreshedGroups = await loadTaskGroups();
    taskGroups.value = refreshedGroups;
    eventBus.emit(Events.TASK_GROUPS_UPDATED, { groups: refreshedGroups });
  } catch (error) {
    console.error('[KanbanView] 标签列排序保存失败:', error);
    await pushMsg('标签列排序保存失败，请稍后重试', 2600);
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

  if (kanbanGroupBy.value === 'group') {
    if (column.type !== 'group') {
      return;
    }
    const currentGroupId = getGroupColumnIdForTask(draggedTask.value);
    if (currentGroupId !== column.id) {
      dragOverColumnId.value = column.id;
    }
    return;
  }

  if (kanbanGroupBy.value === 'heading') {
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

async function handleDrop(event: DragEvent, column: KanbanColumn) {
  if (isMobileFrontend) return;

  event.preventDefault();
  
  if (!draggedTask.value) return;

  if (kanbanGroupBy.value === 'group') {
    if (column.type !== 'group') {
      return;
    }
    await handleGroupDrop(column);
    return;
  }

  if (kanbanGroupBy.value === 'heading') {
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
  
  if (oldGroupId === normalizedTargetGroupId) {
    isDropping.value = false;
    return;
  }
  
  const updatedTask = { ...currentTask, groupId: normalizedTargetGroupId || undefined };
  const droppedBlockId = task.type === 'block' && task.blockId ? task.blockId : null;
  if (droppedBlockId) {
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
    if (task.type === 'block' && task.blockId) {
      await setBlockAttrs(task.blockId, {
        'custom-task-group': normalizedTargetGroupId || ''
      });
      eventBus.emit(Events.TASK_CHANGED, { blockIds: [task.blockId] });
    }
  } catch (error) {
    console.error('[KanbanView] 拖拽更新任务标签失败:', error);
    if (droppedBlockId) {
      dragSyncSuppressUntil.delete(droppedBlockId);
    }
    const revertTaskIndex = tasks.value.findIndex(t => t.id === taskId);
    if (revertTaskIndex !== -1) {
      const revertedTask = { ...tasks.value[revertTaskIndex], groupId: oldGroupId || undefined };
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

async function handleHeadingDrop(column: KanbanColumn) {
  if (!draggedTask.value || column.type !== 'heading' || !column.headingMeta) return;

  const task = draggedTask.value;
  if (!(task.type === 'block' && task.blockId)) {
    pushMsg('只有块任务支持按标题拖动');
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

  suppressDragTaskSync(droppedBlockId, 2200);
  taskHeadingGroups.value = new Map(taskHeadingGroups.value).set(taskId, { ...nextMeta });

  // End drag visual state immediately to avoid long "dragging" flicker while async sync is running.
  draggedTask.value = null;
  dragOverColumnId.value = null;

  try {
    await moveTaskBlockToHeadingMeta(droppedBlockId, nextMeta);

    window.setTimeout(() => {
      dragSyncSuppressUntil.delete(droppedBlockId);
      eventBus.emit(Events.TASK_CHANGED, { blockIds: [droppedBlockId] });
    }, 500);
  } catch (error) {
    console.error('[KanbanView] 拖拽移动任务到标题失败:', error);
    dragSyncSuppressUntil.delete(droppedBlockId);
    const nextGroupMap = new Map(taskHeadingGroups.value);
    if (previousMeta) {
      nextGroupMap.set(taskId, previousMeta);
    } else {
      nextGroupMap.delete(taskId);
    }
    taskHeadingGroups.value = nextGroupMap;
    pushMsg('移动到标题失败');
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
        'custom-task-status': targetStatus
      });
      await updateTaskMarkdown(task.blockId, targetStatus === 'completed');
    }
    if (!wasCompleted && targetStatus === 'completed' && taskCompletionSoundEnabled.value) {
      playTaskCompletionSound();
    }
  } catch (error) {
    console.error('[KanbanView] 拖拽更新任务状态失败:', error);
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
  setupEventListeners();
  await loadSettings();
  TaskRepository.setAutoRecognizeTaskDateEnabled(userSettings.taskManager.autoRecognizeTaskDate === true);
  applyExcludedNotebookScope(normalizeNotebookIds(userSettings.taskManager.excludedNotebookIds));
  const initialView = normalizeTaskViewMode(userSettings.kanban?.currentView);
  currentView.value = initialView;
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
    || initialKanbanGroupMode === 'group'
    || initialTableGroupMode === 'group';
  const shouldAwaitTaskGroups =
    initialView === 'kanban'
    || (
      (initialView === 'table' || initialView === 'archive-table')
      && initialTableGroupMode === 'group'
    );
  const notebooksLoadPromise = loadNotebooks();
  const taskGroupsLoadPromise = shouldWarmTaskGroups ? ensureTaskGroupsLoaded() : Promise.resolve([]);

  let shouldRunMountedReconcile = false;
  try {
    const cachedTasks = await TaskRepository.getCachedTasksOnly();
    if (cachedTasks.length > 0) {
      syncFromSQL(cachedTasks);
      tasks.value = applyDraggedStatusLocks(tasks.value);
      scheduleKanbanTitleHydration(120);
      shouldRunMountedReconcile = true;
    }
  } catch {
    // Ignore cache read failures and fallback to full load.
  }

  if (!shouldRunMountedReconcile) {
    await loadTasks(false, { validateSelection: false });
  }
  if (shouldAwaitTaskGroups) {
    await taskGroupsLoadPromise;
  }
  await loadUserSettings();
  if (shouldAwaitTaskGroups) {
    // Task groups are already awaited above for the initial active view.
  } else if (kanbanGroupBy.value === 'group' || tableGroupBy.value === 'group') {
    void ensureTaskGroupsLoaded();
  }
  if (shouldRunMountedReconcile) {
    void loadTasks(false, {
      silent: true,
      validateSelection: false
    });
  }
  void notebooksLoadPromise.then(async () => {
    let shouldPersistSettings = false;
    if (normalizeInvalidNotebookFilters()) {
      shouldPersistSettings = true;
    }
    if (shouldPersistSettings) {
      await saveUserSettings();
    }
    await validateDocumentSelection();
  }).catch(() => {
    // Ignore notebook preload failures; filters will reconcile on next refresh.
  });
  startSkipSetCleanup();
  document.addEventListener('mousedown', handleKanbanEditorOutsideClick);
  window.addEventListener('keydown', handleKanbanEditorKeydown);
  window.addEventListener('resize', handleKanbanEditorViewportChange);
  nextTick(() => {
    updateCompactViewSwitcherMode();
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
    });
    kanbanViewResizeObserver.observe(container);
  });
});

onUnmounted(() => {
  cleanupEventListeners();
  stopSkipSetCleanup();
  if (saveSettingsTimer !== null) {
    clearTimeout(saveSettingsTimer);
    saveSettingsTimer = null;
  }
  if (fallbackRefreshTimer !== null) {
    clearTimeout(fallbackRefreshTimer);
    fallbackRefreshTimer = null;
  }
  if (kanbanTitleHydrateTimer !== null) {
    clearTimeout(kanbanTitleHydrateTimer);
    kanbanTitleHydrateTimer = null;
  }
  if (documentIconRefreshTimer !== null) {
    clearTimeout(documentIconRefreshTimer);
    documentIconRefreshTimer = null;
  }
  document.removeEventListener('mousedown', handleKanbanEditorOutsideClick);
  window.removeEventListener('keydown', handleKanbanEditorKeydown);
  window.removeEventListener('resize', handleKanbanEditorViewportChange);
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
  kanbanColumnElements.clear();
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

watch(taskDocumentIconWatchSignature, () => {
  scheduleTaskDocumentIconRefresh();
}, { immediate: true });

watch(documentTabPopoverOptions, () => {
  if (!documentTabsDropdownVisible.value) {
    return;
  }
  nextTick(() => {
    updateDocumentTabsDropdownPosition();
  });
});

watch(currentView, (nextView) => {
  closeTaskViewGroupMenu();
  if (nextView !== 'kanban') {
    closeKanbanFilterPopover();
    if (isKanbanBatchEditMode.value) {
      exitKanbanBatchEditMode();
    }
  }
  if (nextView !== 'table' && nextView !== 'archive-table') {
    closeTableFilterPopover();
    closeMobileTableSearch(true);
  }
  if (nextView !== 'kanban' && kanbanEditorVisible.value) {
    closeKanbanEditor();
  }
  if (nextView === 'kanban') {
    void ensureTaskGroupsLoaded();
    scheduleKanbanTitleHydration(120);
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
.kanban-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--b3-theme-background);
  box-sizing: border-box;
  overflow: hidden;
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
  padding-bottom: 4px;
  scrollbar-width: none;
  -ms-overflow-style: none;
  flex: 1;
  min-width: 0;
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
  flex-wrap: wrap;
  justify-content: flex-end;
}

.document-tabs-dropdown {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
}

.document-tabs-dropdown-btn {
  width: 24px;
  height: 24px;
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
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
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
  z-index: 60;
}

.document-tabs-dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px;
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
  border: 1px solid transparent;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  font-size: 12px;
  padding: 4px 10px;
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

.kanban-batch-toolbar {
  margin:0 10px 10px;
  padding: 10px;
  border-radius: 10px;
  background: var(--b3-list-hover);
  box-shadow: #0000000a 0 1px 4px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.kanban-batch-toolbar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.kanban-batch-selected-count {
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  font-weight: 600;
}

.kanban-batch-toolbar-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.kanban-batch-tool-btn {
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

.kanban-batch-tool-btn:hover {
  color: var(--b3-theme-on-background);
}

.kanban-batch-tool-btn:disabled {
  opacity: 0.56;
  cursor: not-allowed;
}

.kanban-batch-edit-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-end;
}

.kanban-batch-field {
  min-width: 0;
  flex: 1 1 120px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.kanban-batch-field > span {
  font-size: 11px;
  color: var(--b3-theme-on-surface);
  opacity: 0.76;
}

.kanban-batch-field :deep(.b3-select) {
  width: 100%;
}

.kanban-batch-apply-btn {
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

.kanban-batch-apply-btn:hover {
  transform: translateY(-1px);
}

.kanban-batch-apply-btn:disabled {
  opacity: 0.52;
  cursor: not-allowed;
  transform: none;
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
  padding: 3px;
  border-radius: 9px;
  min-width: 0;
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
  width: 30px;
  height: 30px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
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
  gap: 8px;
  padding: 7px 8px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.2;
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
  padding: 4px 8px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--b3-theme-on-surface);
  transition: all 0.2s;
  font-size: 13px;
}

.view-btn:hover {
  background: var(--b3-list-hover);
}

.view-btn.active {
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
  margin-left: auto;
  gap: 7px;
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
.new-task-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  svg {
    color: var(--b3-theme-on-background);
  }
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

.filter-group select {
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

  .kanban-header-view-module,
  .kanban-header-tools-module {
    width: auto;
  }

  .kanban-header-view-module {
    flex: 0 0 auto;
  }

  .kanban-header-tools-module {
    flex: 1 1 auto;
  }

  .kanban-header-tools-module {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
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

  .table-document-actions .task-search {
    flex: 0 1 110px;
    max-width: 140px;
    transition: max-width 0.18s ease, width 0.18s ease, padding 0.18s ease, gap 0.18s ease;
  }

  .table-document-actions .task-search.is-mobile-collapsed {
    flex: 0 0 30px;
    width: 30px;
    min-width: 30px;
    max-width: 30px;
    padding: 4px 7px;
    gap: 0;
    justify-content: center;
  }

  .table-document-actions .task-search input {
    width: 80px;
    min-width: 48px;
  }

  .table-document-actions .task-search.is-mobile-collapsed input,
  .table-document-actions .task-search.is-mobile-collapsed .task-search-clear {
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

  .kanban-batch-edit-grid {
    flex-direction: column;
    align-items: stretch;
  }

  .kanban-batch-apply-btn {
    width: 100%;
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
  padding: 12px 16px;
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

.column-title-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.column-batch-checkbox-btn {
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

.column-batch-checkbox-btn:hover {
  background: var(--b3-list-hover);
}

.column-batch-checkbox-btn :deep(.task-checkbox) {
  --task-checkbox-fill: var(--b3-list-hover);
  --task-checkbox-border: var(--b3-border-color);
}

.column-batch-checkbox-btn.partial :deep(.task-checkbox) {
  fill: #f98f7a;
  stroke: none;
  opacity: 0.45;
}

.column-batch-checkbox-btn.is-disabled {
  opacity: 0.42;
  cursor: not-allowed;
  pointer-events: none;
}

.column-title-text {
  min-width: 0;
}

.column-tasks {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
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

.kanban-editor-body {
  position: relative;
  flex: 1 1 auto;
  min-height: 220px;
  overflow: hidden;
  padding: 6px;
}

.kanban-editor-meta {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 12px 14px;
  border-top: 1px solid var(--b3-theme-border);
}

.kanban-editor-body :deep(.protyle-content) {
  overflow: auto;
  border-radius: 6px;
}

.kanban-editor-body :deep(.protyle-wysiwyg) {
  padding: 10px !important;
}

.kanban-editor-body :deep(.protyle-toolbar),
.kanban-editor-body :deep(.protyle-hint) {
  z-index: 6;
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
</style>
