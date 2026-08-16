<template>
  <div
    class="gantt-view"
    @dragover="handleExternalTaskDragOver"
    @dragleave="handleExternalTaskDragLeave"
    @drop="handleExternalTaskDrop"
  >
    <div ref="ganttShellRef" class="gantt-shell" @scroll="handleGanttShellScroll">
      <div class="gantt-toolbar">
        <div class="gantt-task-search">
          <Icon name="searchCompact" width="16" height="16" />
          <input
            v-model="ganttSearchQuery"
            class="ariaLabel"
            type="search"
            :placeholder="t('taskManager.searchTasks')"
            :aria-label="t('taskManager.searchTasks')"
          />
          <button
            v-if="ganttSearchQuery"
            type="button"
            class="gantt-search-clear ariaLabel"
            :aria-label="t('kanbanView.clearSearch')"
            @click="ganttSearchQuery = ''"
          >×</button>
        </div>
        <button
          type="button"
          class="gantt-completed-toggle-btn ariaLabel"
          :class="{ active: showCompletedTaskRows }"
          :aria-label="showCompletedTaskRows ? t('ganttView.collapseCompletedTasks') : t('ganttView.expandCompletedTasks')"
          @click="showCompletedTaskRows = !showCompletedTaskRows"
        >
          <Icon :name="showCompletedTaskRows ? 'chevronsHorizontal' : 'chevronsVertical'" width="15" height="15" />
        </button>
        <div class="gantt-toolbar-controls">
          <div class="gantt-range-options">
            <button
              v-for="weeks in timelineWeekOptions"
              :key="weeks"
              type="button"
              class="gantt-range-option-btn"
              :class="{ active: timelineWeeks === weeks }"
              @click="setTimelineWeeks(weeks)"
            >{{ formatTimelineWeekOption(weeks) }}</button>
          </div>
          <div class="gantt-range-nav">
            <button type="button" class="gantt-nav-btn ariaLabel" :aria-label="t('ganttView.previousRange')" @click="shiftTimeline(-1)">
              <Icon name="chevronLeft" width="18" height="18" />
            </button>
            <button type="button" class="gantt-today-btn" @click="resetTimeline">{{ t('ganttView.today') }}</button>
            <button type="button" class="gantt-nav-btn ariaLabel" :aria-label="t('ganttView.nextRange')" @click="shiftTimeline(1)">
              <Icon name="chevronRight" width="18" height="18" />
            </button>
          </div>
        </div>
      </div>
      <div class="gantt-body" :style="{ '--gantt-sidebar-width': `${labelColumnWidth}px` }">
        <aside
          class="gantt-sidebar"
          :class="{ 'is-resize-ready': isSidebarResizeReady, 'has-document-milestones': showDocumentMilestones }"
          :style="{ minHeight: `${ganttGridMinHeight}px` }"
          @pointermove="handleSidebarPointerMove"
          @pointerleave="isSidebarResizeReady = false"
          @pointerdown="handleSidebarPointerDown"
        >
          <div class="gantt-sidebar-header"></div>
          <template v-for="{ row, rowIndex } in visibleRenderRows" :key="`sidebar:${row.key}`">
            <div
              v-if="showDocumentMilestones && row.kind === 'section'"
              class="gantt-document-milestone-rail"
              :class="{
                'has-guide': getDocumentMilestoneGuideRowCount(row.sectionId) > 0,
                'is-dragging': draggedDocumentMilestoneId === row.sectionId,
                'is-drop-target': dragOverDocumentMilestoneId === row.sectionId
              }"
              :style="{
                gridColumn: '1',
                gridRow: `${rowIndex + 2}`,
                '--gantt-milestone-guide-height': `${getDocumentMilestoneGuideRowCount(row.sectionId) * GANTT_ROW_HEIGHT - 17}px`
              }"
              aria-hidden="true"
              draggable="true"
              @dragstart="handleDocumentMilestoneDragStart($event, row.sectionId)"
              @dragover="handleDocumentMilestoneDragOver($event, row.sectionId)"
              @drop="handleDocumentMilestoneDrop($event, row.sectionId)"
              @dragend="clearDocumentMilestoneDragState"
            >
              <span class="gantt-document-milestone">{{ getDocumentMilestoneNumber(row.sectionId) }}</span>
            </div>
            <div
              v-if="row.kind === 'section'"
              class="gantt-row-label gantt-section-label ariaLabel"
              :class="{ collapsed: row.collapsed, 'goal-drop-target': isGoalRenderRowDropTarget(row), 'is-row-hovered': isRenderRowHovered(row) }"
              role="button"
              tabindex="0"
              :aria-label="row.title"
              :aria-expanded="!row.collapsed"
              :style="{ gridRow: `${rowIndex + 2}` }"
              @click="toggleSection(row.sectionId)"
              @keydown.enter.prevent="toggleSection(row.sectionId)"
              @keydown.space.prevent="toggleSection(row.sectionId)"
            >
              <span class="gantt-section-toggle" aria-hidden="true"><Icon name="chevronDown" width="16" height="16" /></span>
              <EmojiIcon v-if="row.emoji" class="gantt-section-icon" :value="row.emoji" />
               <button type="button" class="gantt-row-title gantt-row-title-btn b3-typography" @pointerdown.stop @mousedown.stop @click.stop.prevent="emit('manage-goals')">{{ row.title }}</button>
               <button
                 v-if="groupMode === 'document'"
                 type="button"
                 class="gantt-section-add-task-btn ariaLabel"
                 :aria-label="t('taskManager.newTask')"
                 @pointerdown.stop
                 @mousedown.stop
                 @click.stop.prevent="emit('section-task-create-requested', row.sectionId)"
               >
                 <Icon name="add" width="16" height="16" />
               </button>
               <span v-if="row.dueDateLabel" class="goal-due-date-info" :class="{ 'is-overdue': row.isOverdue }">{{ row.dueDateLabel }}</span>
              <span class="gantt-section-count is-progress" :class="{ overdue: row.isOverdue, risk: row.hasScheduleRisk, completed: row.completedTasks >= row.taskCount }" :style="{ '--gantt-section-progress': `${row.summaryProgress}%` }" :title="row.summaryTitle">
                <span class="gantt-section-progress-text">{{ row.summaryProgress }} %</span><span class="gantt-section-progress-ring" aria-hidden="true"></span>
              </span>
            </div>
            <div
              v-else-if="row.kind === 'task'"
              class="gantt-row-label ariaLabel"
              :class="{ 'gantt-unscheduled-row-label': row.isUnscheduled, 'goal-drop-target': isGoalRenderRowDropTarget(row), 'is-row-hovered': isRenderRowHovered(row) }"
              :aria-label="getTaskTitleText(row.primaryTask, row.title)"
              draggable="true"
              :style="{ gridRow: `${rowIndex + 2}` }"
              @dragstart="handleRowLabelDragStart($event, row.primaryTask)"
              @dragend="handleRowLabelDragEnd"
            >
              <span class="task-checkbox-wrapper gantt-row-checkbox-wrapper" @click.stop="emit('status-toggle', row.primaryTask)" @pointerdown.stop><TaskCheckbox :checked="row.primaryTask.status === 'completed'" :size="18" /></span>
              <button type="button" class="gantt-row-title gantt-row-title-btn b3-typography" draggable="false" @pointerdown.stop @mousedown.stop @dragstart.stop.prevent @click.stop.prevent="emit('edit-task', row.primaryTask, $event)"><TaskTitlePlain class="gantt-task-title-content" :title="row.primaryTask.title" :fallback="row.title" /></button>
              <span v-if="isRepeatTask(row.primaryTask)" class="gantt-row-repeat-badge ariaLabel" :aria-label="t('taskCard.repeatTask')"><Icon name="repeat" width="12" height="12" /></span>
              <button type="button" class="task-card-action-btn task-card-open-btn gantt-row-open-btn ariaLabel" :aria-label="t('taskCard.openContent')" @mousedown.stop @click.stop.prevent="emit('task-click', row.primaryTask)"><Icon name="moreHorizontal" width="14" height="14" /></button>
            </div>
          </template>
          <div v-if="renderRows.length === 0" class="gantt-row-label gantt-empty-label" :style="{ gridRow: '2' }">{{ t('ganttView.noScheduledTasks') }}</div>
          <div class="gantt-sidebar-resizer" role="separator" aria-orientation="vertical" @pointerdown.prevent="handleSidebarResizePointerDown"></div>
        </aside>
        <div class="gantt-timeline-column">
          <div class="gantt-timeline-header">
            <div class="gantt-timeline-header-grid" :style="timelineHeaderStyle">
              <div
                v-for="day in timelineDays"
                :key="`header:${day.key}`"
                class="gantt-day-header"
                :class="{ today: day.isToday, weekend: day.isWeekend, 'month-start': !!day.monthLabel }"
                :style="day.isToday ? { '--gantt-today-position': `${todayTimePosition}%` } : undefined"
              >
                <span class="gantt-day-month">{{ day.monthLabel }}</span>
                <span class="gantt-day-weekday">{{ day.weekdayLabel }}</span>
                <span class="gantt-day-date">{{ day.dayLabel }}</span>
                <span v-if="day.isToday" class="gantt-today-marker">{{ t('ganttView.today') }}</span>
              </div>
            </div>
          </div>
          <div ref="ganttTimelineRef" class="gantt-timeline-scroll" @scroll="handleTimelineScroll">
      <div
        class="gantt-grid"
        :style="gridStyle"
        @pointermove="handleGanttGridPointerMove"
        @pointerleave="clearGanttGridHover"
      >
        <div class="gantt-header-row-bg" :style="{ gridColumn: '1 / -1', gridRow: '1' }"></div>
        <div class="gantt-corner" :style="{ gridColumn: '1', gridRow: '1' }"></div>
        <div class="gantt-header-row-border" :style="{ gridColumn: '1 / -1', gridRow: '1' }"></div>
        <div
          v-for="(day, dayIndex) in timelineDays"
          :key="day.key"
          class="gantt-day-header"
          :class="{ today: day.isToday, weekend: day.isWeekend, 'month-start': !!day.monthLabel }"
          :style="{ gridColumn: `${dayIndex + 2}`, gridRow: '1' }"
        >
          <span class="gantt-day-month">{{ day.monthLabel }}</span>
          <span class="gantt-day-weekday">{{ day.weekdayLabel }}</span>
          <span class="gantt-day-date">{{ day.dayLabel }}</span>
        </div>
        <div
          v-for="(day, dayIndex) in timelineDays"
          :key="`column:${day.key}`"
          class="gantt-day-column"
          :class="{ 'month-start': !!day.monthLabel }"
          :style="{
            gridColumn: `${dayIndex + 2}`,
            gridRow: '2',
            height: `${ganttTimelineBodyHeight}px`
          }"
        ></div>
        <template v-for="(day, dayIndex) in timelineDays" :key="`weekend:${day.key}`">
          <div
            v-if="day.isWeekend"
            class="gantt-weekend-column"
            :style="{
              gridColumn: `${dayIndex + 2}`,
              gridRow: '2',
              height: `${ganttTimelineBodyHeight}px`
            }"
          ></div>
        </template>
        <template v-for="(day, dayIndex) in timelineDays" :key="`today:${day.key}`">
          <div
            v-if="day.isToday"
            class="gantt-today-column"
            :style="{
              gridColumn: `${dayIndex + 2}`,
              gridRow: '2',
              height: `${ganttTimelineBodyHeight}px`,
              '--gantt-today-position': `${todayTimePosition}%`
            }"
          ></div>
        </template>

        <div
          v-for="group in visibleRenderGroups"
          :key="group.key"
          class="gantt-group-panel"
          :class="{ 'group-start': group.offsetTop, 'goal-drop-target': isGoalSectionDropTarget(group.sectionId) }"
          :data-goal-section-id="group.sectionId || undefined"
          :style="{
            gridColumn: '1 / -1',
            gridRow: `${group.startRow} / span ${group.rowSpan}`
          }"
        ></div>
        <template v-for="group in visibleRenderGroups" :key="`${group.key}:deadline`">
          <div
            v-if="group.deadlineStyle"
            class="gantt-deadline-marker ariaLabel"
            :style="group.deadlineStyle"
            :aria-label="group.deadlineTitle"
          ></div>
        </template>

        <template v-for="{ row, rowIndex } in visibleRenderRows" :key="row.key">
          <div
            v-if="row.kind === 'section'"
            class="gantt-row-label gantt-section-label ariaLabel"
            :class="{
              collapsed: row.collapsed,
              'group-start': shouldOffsetGroupStart(rowIndex),
              'goal-drop-target': isGoalRenderRowDropTarget(row),
              'is-row-hovered': isRenderRowHovered(row)
            }"
            role="button"
            tabindex="0"
            :aria-label="row.title"
            :aria-expanded="!row.collapsed"
            :data-goal-section-id="getGoalSectionIdForRenderRow(row) || undefined"
            :style="{ gridColumn: '1', gridRow: `${rowIndex + 2}` }"
            @click="toggleSection(row.sectionId)"
            @keydown.enter.prevent="toggleSection(row.sectionId)"
            @keydown.space.prevent="toggleSection(row.sectionId)"
          >
            <span class="gantt-section-toggle" aria-hidden="true">
              <Icon name="chevronDown" width="16" height="16" />
            </span>
            <EmojiIcon v-if="row.emoji" class="gantt-section-icon" :value="row.emoji" />
            <button
              type="button"
              class="gantt-row-title gantt-row-title-btn b3-typography"
              @pointerdown.stop
              @mousedown.stop
              @click.stop.prevent="emit('manage-goals')"
            >
              {{ row.title }}
            </button>
            <button
              v-if="groupMode === 'document'"
              type="button"
              class="gantt-section-add-task-btn ariaLabel"
              :aria-label="t('taskManager.newTask')"
              @pointerdown.stop
              @mousedown.stop
              @click.stop.prevent="emit('section-task-create-requested', row.sectionId)"
            >
              <Icon name="add" width="16" height="16" />
            </button>
            <span
              v-if="row.dueDateLabel"
              class="goal-due-date-info"
              :class="{ 'is-overdue': row.isOverdue }"
            >
              {{ row.dueDateLabel }}
            </span>
            <span
              class="gantt-section-count is-progress"
              :class="{
                overdue: row.isOverdue,
                risk: row.hasScheduleRisk,
                completed: row.completedTasks >= row.taskCount
              }"
              :style="{ '--gantt-section-progress': `${row.summaryProgress}%` }"
              :title="row.summaryTitle"
            >
              <span class="gantt-section-progress-text">{{ row.summaryProgress }} %</span>
              <span class="gantt-section-progress-ring" aria-hidden="true"></span>
            </span>
          </div>
          <button
            v-else-if="row.kind === 'unscheduled-toggle'"
            type="button"
            class="gantt-row-label gantt-unscheduled-row-label gantt-unscheduled-control-row ariaLabel"
            :class="{
              'goal-drop-target': isGoalRenderRowDropTarget(row),
              'is-row-hovered': isRenderRowHovered(row)
            }"
            :aria-label="row.title"
            :aria-expanded="row.expanded"
            :data-goal-section-id="getGoalSectionIdForRenderRow(row) || undefined"
            :style="{ gridColumn: '1', gridRow: `${rowIndex + 2}` }"
            @click="handleUnscheduledControlClick(row)"
          >
            <span class="gantt-unscheduled-control-inner">
              <span class="collapse-btn">
                <Icon
                  :name="row.action === 'collapse' ? 'chevronsHorizontal' : 'chevronsVertical'"
                  width="16"
                  height="16"
                />
              </span>
              <span class="gantt-row-title b3-typography">{{ row.title }}</span>
              <span class="gantt-section-count">{{ row.taskCount }}</span>
            </span>
          </button>
          <div
            v-if="row.kind === 'unscheduled-toggle'"
            class="gantt-unscheduled-control-row-divider"
            :class="{ 'is-row-hovered': isRenderRowHovered(row) }"
            :style="{ gridColumn: '1 / -1', gridRow: `${rowIndex + 2}` }"
          ></div>
          <div
            v-if="row.kind === 'task'"
            class="gantt-row-label ariaLabel"
            :class="{
              'gantt-unscheduled-row-label': row.isUnscheduled,
              'goal-drop-target': isGoalRenderRowDropTarget(row),
              'is-row-hovered': isRenderRowHovered(row)
            }"
            :aria-label="getTaskTitleText(row.primaryTask, row.title)"
            :data-goal-section-id="getGoalSectionIdForRenderRow(row) || undefined"
            draggable="true"
            :style="{ gridColumn: '1', gridRow: `${rowIndex + 2}` }"
            @dragstart="handleRowLabelDragStart($event, row.primaryTask)"
            @dragend="handleRowLabelDragEnd"
          >
            <span
              class="task-checkbox-wrapper gantt-row-checkbox-wrapper"
              @click.stop="emit('status-toggle', row.primaryTask)"
              @pointerdown.stop
            >
              <TaskCheckbox :checked="row.primaryTask.status === 'completed'" :size="18" />
            </span>
            <button
              type="button"
              class="gantt-row-title gantt-row-title-btn b3-typography"
              draggable="false"
              @pointerdown.stop
              @mousedown.stop
              @dragstart.stop.prevent
              @click.stop.prevent="emit('edit-task', row.primaryTask, $event)"
            >
              <TaskTitlePlain
                class="gantt-task-title-content"
                :title="row.primaryTask.title"
                :fallback="row.title"
              />
            </button>
            <span
              v-if="isRepeatTask(row.primaryTask)"
              class="gantt-row-repeat-badge ariaLabel"
              :aria-label="t('taskCard.repeatTask')"
            >
              <Icon name="repeat" width="12" height="12" />
            </span>
            <button
              type="button"
              class="task-card-action-btn task-card-open-btn gantt-row-open-btn ariaLabel"
              :aria-label="t('taskCard.openContent')"
              @mousedown.stop
              @click.stop.prevent="emit('task-click', row.primaryTask)"
            >
              <Icon name="moreHorizontal" width="14" height="14" />
            </button>
          </div>
          <div
            v-for="(day, dayIndex) in timelineDays"
            :key="`${row.key}:${day.key}`"
            class="gantt-day-cell"
            :class="{
              today: day.isToday,
              weekend: day.isWeekend,
              section: row.kind === 'section',
              'unscheduled-control': row.kind === 'unscheduled-toggle',
              'drop-target': dragOverDayKey === day.key,
              'goal-drop-target': isGoalRenderRowDropTarget(row),
              'group-start': shouldOffsetGroupStart(rowIndex),
              'is-row-hovered': isRenderRowHovered(row)
            }"
            :data-goal-section-id="getGoalSectionIdForRenderRow(row) || undefined"
            :style="{ gridColumn: `${dayIndex + 2}`, gridRow: `${rowIndex + 2}` }"
          ></div>
          <div
            v-if="row.kind === 'section' && row.summaryBarStyle"
            class="gantt-summary-bar ariaLabel"
            :class="{
              overdue: row.isOverdue,
              risk: row.hasScheduleRisk,
              completed: row.completedTasks >= row.taskCount,
              'group-start': shouldOffsetGroupStart(rowIndex),
              'goal-drop-target': isGoalRenderRowDropTarget(row),
              'dragging-due-date': draggingGoalDueDateId === row.sectionId
            }"
            :style="{
              ...row.summaryBarStyle,
              '--gantt-summary-progress': `${row.summaryProgress}%`
            }"
            :aria-label="row.summaryTitle"
            :data-goal-section-id="getGoalSectionIdForRenderRow(row) || undefined"
          >
            <span class="gantt-summary-bar-fill" aria-hidden="true"></span>
            <span class="gantt-summary-bar-title">{{ row.summaryText }}</span>
            <button
              v-if="isGoalSummaryResizable(row)"
              type="button"
              class="gantt-summary-due-handle ariaLabel"
              :class="{ 'handle-dragging': draggingGoalDueDateId === row.sectionId }"
              :aria-label="t('taskManager.dueDate')"
              @pointerdown.stop.prevent="handleGoalSummaryDueHandlePointerDown($event, row)"
              @click.stop.prevent
            ></button>
          </div>
          <button
            v-for="bar in row.kind === 'task' ? row.bars : []"
            :key="bar.key"
            type="button"
            class="gantt-bar ariaLabel"
            :class="[`priority-${bar.task.priority}`, {
              completed: bar.task.status === 'completed',
              dragging: draggingTaskId === bar.task.id,
              risk: bar.isBeyondSectionDue
            }]"
            :style="getTaskBarStyle(bar)"
            :aria-label="bar.title"
            :data-goal-section-id="getGoalSectionIdForRenderRow(row) || undefined"
            @contextmenu="handleContextMenu($event, bar.task)"
            @pointerdown="handleTaskBarPointerDown($event, bar)"
          >
            <span
              class="gantt-task-handle gantt-task-handle-left"
              :class="{ 'handle-dragging': draggingTaskId === bar.task.id && dragMode === 'start' }"
              aria-hidden="true"
              @pointerdown.stop.prevent="handleTaskHandlePointerDown($event, bar, 'start')"
            ></span>
            <span
              class="task-checkbox-wrapper"
              @click.stop="emit('status-toggle', bar.task)"
              @pointerdown.stop
            >
              <TaskCheckbox :checked="bar.task.status === 'completed'" :size="12" />
            </span>
            <span class="gantt-bar-title">{{ bar.title }}</span>
            <span
              class="gantt-task-handle gantt-task-handle-right"
              :class="{ 'handle-dragging': draggingTaskId === bar.task.id && dragMode === 'end' }"
              aria-hidden="true"
              @pointerdown.stop.prevent="handleTaskHandlePointerDown($event, bar, 'end')"
            ></span>
          </button>
        </template>
        <div
          v-if="renderRows.length > 0"
          class="gantt-virtual-spacer"
          :style="{ gridColumn: '1', gridRow: `${renderRows.length + 1}` }"
        ></div>
        <template v-if="renderRows.length === 0">
          <div class="gantt-row-label gantt-empty-label" :style="{ gridColumn: '1', gridRow: '2' }">
            {{ t('ganttView.noScheduledTasks') }}
          </div>
          <div
            v-for="(day, dayIndex) in timelineDays"
            :key="`empty:${day.key}`"
            class="gantt-day-cell"
            :class="{ today: day.isToday, weekend: day.isWeekend, 'drop-target': dragOverDayKey === day.key }"
            :style="{ gridColumn: `${dayIndex + 2}`, gridRow: '2' }"
          ></div>
        </template>
        <div
          v-if="externalDropPreviewStyle"
          class="gantt-bar gantt-drop-preview"
          :style="externalDropPreviewStyle"
        >
          <span class="gantt-bar-title">{{ externalDropPreviewTitle }}</span>
        </div>
      </div>
          </div>
        </div>
      </div>
      <div
        ref="ganttHorizontalScrollbarRef"
        class="gantt-horizontal-scrollbar"
        :style="{ marginLeft: `${labelColumnWidth}px`, width: `calc(100% - ${labelColumnWidth}px)` }"
        @scroll="handleHorizontalScrollbarScroll"
      >
        <div :style="{ width: `${timelineDayCount * effectiveDayColumnWidth}px` }"></div>
      </div>
    </div>
    <TaskContextMenu
      :show="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :task="contextMenu.task"
      :background-colors="backgroundColors"
      :start-date="contextMenuDateDraft.startDate"
      :start-time="contextMenuDateDraft.startTime"
      :due-date="contextMenuDateDraft.dueDate"
      :due-time="contextMenuDateDraft.dueTime"
      :repeat-frequency="contextMenuRepeatFrequency"
      :repeat-rule="contextMenuRepeatRule"
      @update:startDate="contextMenuDateDraft.startDate = $event"
      @update:startTime="contextMenuDateDraft.startTime = $event"
      @update:dueDate="contextMenuDateDraft.dueDate = $event"
      @update:dueTime="contextMenuDateDraft.dueTime = $event"
      @setColor="setTaskBackgroundColor(contextMenu.task!, $event)"
      @saveDates="applyContextMenuDates(contextMenu.task!)"
      @clearTaskDates="clearContextMenuDates(contextMenu.task!)"
      @saveRepeatRule="saveTaskRepeatRule(contextMenu.task!, $event)"
      @start-focus="handleContextMenuStartFocus(contextMenu.task!)"
      @editTask="handleContextMenuEditTask(contextMenu.task!)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { TaskRepository } from '@/api';
import type { Task, TaskGroup } from '@/api';
import type { Goal } from '@/goalRepository';
import EmojiIcon from '@/components/EmojiIcon.vue';
import Icon from './Icon.vue';
import TaskContextMenu from './TaskContextMenu.vue';
import TaskCheckbox from './TaskCheckbox.vue';
import TaskTitlePlain from './TaskTitlePlain.vue';
import { formatTemplate, useI18n } from '@/composables/useI18n';
import { getRepeatSeriesForTask } from '@/repeatRepository';
import type { RepeatFrequency, RepeatRule, RepeatRuleInput } from '@/repeatRepository';
import { isTaskInGoalScope } from '@/utils/goalTaskMembership';
import { persistTaskBackgroundColor } from '@/utils/taskBackgroundColorPersistence';
import {
  resolveEffectiveTaskBackgroundColor,
  resolveTaskAccentColor,
  resolveTaskBackgroundColor
} from '@/utils/taskColor';
import { TASK_BACKGROUND_COLOR_OPTIONS } from '@/utils/taskGroupShared';
import { getTaskTitlePlainText } from '@/utils/taskHtml';

const DAY_MS = 24 * 60 * 60 * 1000;
const GANTT_ROW_HEIGHT = 42;
const GANTT_TOOLBAR_HEIGHT = 41;
const DEFAULT_LABEL_COLUMN_WIDTH = 320;
const MIN_LABEL_COLUMN_WIDTH = 180;
const MAX_LABEL_COLUMN_WIDTH = 480;
const MIN_DAY_COLUMN_WIDTH = 46;
const UNGROUPED_UNSCHEDULED_SECTION_ID = '__ungrouped_unscheduled__';
const VIRTUAL_ROW_OVERSCAN = 12;
const timelineWeekOptions = [2, 6, 12] as const;
const GANTT_EN_MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const EMPTY_GOAL_IDS = new Set<string>();

const props = defineProps<{
  tasks: Task[];
  goals?: Goal[];
  taskGroups?: TaskGroup[];
  groupMode?: GanttGroupMode;
  documentIconByRootId?: Map<string, string>;
  documentTitleByRootId?: Map<string, string>;
  documentOrder?: string[];
  showDocumentMilestones?: boolean;
  selectedDocumentSection?: { id: string; title: string };
  autoExpandUnscheduledTasks?: boolean;
}>();

const emit = defineEmits<{
  'task-click': [task: Task];
  'task-date-changed': [task: Task];
  'task-color-changed': [task: Task];
  'goal-due-date-changed': [goalId: string, dueDate: string];
  'start-focus': [task: Task];
  'edit-task': [task: Task, event?: MouseEvent];
  'status-toggle': [task: Task];
  'manage-goals': [];
  'section-task-create-requested': [sectionId: string];
  'task-goal-drop': [task: Task, goalId: string];
  'document-order-change': [sectionOrder: string[]];
}>();

const { t } = useI18n();
const getTaskTitleText = (task: Task, fallbackTitle: string): string => {
  return getTaskTitlePlainText(task.title) || fallbackTitle;
};
const collapsedSectionIds = ref<Set<string>>(new Set());
const draggedDocumentMilestoneId = ref('');
const dragOverDocumentMilestoneId = ref('');
const unscheduledSectionModes = ref<Map<string, UnscheduledDisplayMode>>(new Map());
const timelineAnchor = ref(startOfDay(new Date()));
const timelineWeeks = ref<(typeof timelineWeekOptions)[number]>(6);
const draggingTaskId = ref<string | null>(null);
const dragDeltaDays = ref(0);
const dragMode = ref<GanttDragMode | null>(null);
const optimisticTaskDates = ref<Map<string, { startDate: string; dueDate: string }>>(new Map());
const optimisticGoalDueDates = ref<Map<string, string>>(new Map());
const dragOverDayKey = ref<string | null>(null);
const dragOverGoalSectionId = ref<string | null>(null);
const draggingGoalDueDateId = ref<string | null>(null);
const externalDropTask = ref<Task | null>(null);
const ganttShellRef = ref<HTMLElement | null>(null);
const ganttTimelineRef = ref<HTMLElement | null>(null);
const ganttHorizontalScrollbarRef = ref<HTMLElement | null>(null);
const timelineScrollLeft = ref(0);
const isSidebarResizeReady = ref(false);
let syncingHorizontalScrollbar = false;
const shellWidth = ref(0);
const shellHeight = ref(0);
const shellScrollTop = ref(0);
const labelColumnWidth = ref(DEFAULT_LABEL_COLUMN_WIDTH);
const hoveredRenderRowKey = ref<string | null>(null);
const ganttSearchQuery = ref('');
const showCompletedTaskRows = ref(false);
const currentTime = ref(new Date());
const contextMenu = ref<{ show: boolean; x: number; y: number; task: Task | null }>({
  show: false,
  x: 0,
  y: 0,
  task: null
});
const contextMenuDateDraft = ref<{ startDate: string; startTime: string; dueDate: string; dueTime: string }>({
  startDate: '',
  startTime: '',
  dueDate: '',
  dueTime: ''
});
const contextMenuRepeatFrequency = ref<RepeatFrequency>('none');
const contextMenuRepeatRule = ref<RepeatRule | null>(null);

type GanttDragMode = 'move' | 'start' | 'end';
type UnscheduledDisplayMode = 'collapsed' | 'incomplete' | 'all';

interface GanttDragState {
  task: Task;
  rowStart: Date;
  rowEnd: Date;
  mode: GanttDragMode;
  startX: number;
  lastDeltaDays: number;
  hasMoved: boolean;
}

interface GoalDueDateDragState {
  goalId: string;
  startX: number;
  originalDueDate: Date;
  previewDueDate: Date;
  hasMoved: boolean;
}

let dragState: GanttDragState | null = null;
let goalDueDateDragState: GoalDueDateDragState | null = null;
let sidebarResizeState: { startX: number; startWidth: number; scrollLeft: number } | null = null;
let resizeObserver: ResizeObserver | null = null;
let metricsAnimationFrame: number | null = null;
let currentTimeUpdateInterval: number | null = null;
let contextMenuOutsidePointerBound = false;
const optimisticTaskDateTimers = new Map<string, number>();
const optimisticGoalDueDateTimers = new Map<string, number>();

const backgroundColors = TASK_BACKGROUND_COLOR_OPTIONS;

interface ExternalDropResolution {
  task: Task;
  day: Date;
  startDate: Date;
  endDate: Date;
}

interface TimelineDay {
  key: string;
  monthLabel: string;
  weekdayLabel: string;
  dayLabel: string;
  isToday: boolean;
  isWeekend: boolean;
}

interface GanttBar {
  key: string;
  task: Task;
  title: string;
  start: Date;
  end: Date;
  barStyle: Record<string, string>;
  isBeyondSectionDue?: boolean;
}

interface GanttRow {
  key: string;
  primaryTask: Task;
  title: string;
  start?: Date;
  end?: Date;
  bars: GanttBar[];
  isUnscheduled?: boolean;
}

interface GanttSection {
  id: string;
  title: string;
  emoji: string;
  rows: GanttRow[];
  summaryTasks: Task[];
  dueDate?: Date;
  dueDateLabel?: string;
  hasDeadline?: boolean;
}

export type GanttGroupMode = 'goal' | 'document' | 'none';

type GanttRenderRow =
  | {
    kind: 'section';
    key: string;
    sectionId: string;
    title: string;
    emoji: string;
    taskCount: number;
    collapsed: boolean;
    completedTasks: number;
    summaryProgress: number;
    summaryText: string;
    summaryTitle: string;
    summaryBarStyle: Record<string, string> | null;
    summaryEndDate: Date | null;
    deadlineStyle: Record<string, string> | null;
    deadlineTitle: string;
    isOverdue: boolean;
    hasScheduleRisk: boolean;
    dueDateLabel?: string;
  }
  | {
    kind: 'unscheduled-toggle';
    key: string;
    sectionId: string;
    action: 'show-incomplete' | 'show-all' | 'collapse';
    title: string;
    taskCount: number;
    expanded: boolean;
  }
  | (GanttRow & { kind: 'task'; sectionId?: string });

interface GanttRenderGroup {
  key: string;
  sectionId: string;
  startRow: number;
  rowSpan: number;
  offsetTop: boolean;
  deadlineStyle: Record<string, string> | null;
  deadlineTitle: string;
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(date: Date): string {
  return formatDateKey(date);
}

function formatMonthDay(date: Date): string {
  return formatTemplate('weekView.monthDayTemplate', {
    month: date.getMonth() + 1,
    day: date.getDate()
  });
}

function isEnglishLocale(): boolean {
  const siyuan = window.siyuan as any;
  const locale = String(
    siyuan?.config?.appearance?.lang
      || siyuan?.config?.lang
      || (typeof navigator !== 'undefined' ? navigator.language : '')
  ).replace('-', '_').toLowerCase();
  return locale.startsWith('en');
}

function formatGanttMonthLabel(date: Date): string {
  if (isEnglishLocale()) {
    return `${GANTT_EN_MONTH_LABELS[date.getMonth()] || ''} ${date.getFullYear()}`;
  }
  const monthLabel = formatTemplate('date.monthLabelTemplate', {
    month: date.getMonth() + 1
  });
  return `${date.getFullYear()} ${monthLabel}`;
}

function formatGanttWeekdayLabel(date: Date): string {
  if (isEnglishLocale()) {
    return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()];
  }
  const weekdayKey = [
    'taskRepeat.weekdaySunShort',
    'taskRepeat.weekdayMonShort',
    'taskRepeat.weekdayTueShort',
    'taskRepeat.weekdayWedShort',
    'taskRepeat.weekdayThuShort',
    'taskRepeat.weekdayFriShort',
    'taskRepeat.weekdaySatShort'
  ][date.getDay()];
  return t(weekdayKey);
}

function shiftDate(value: string | undefined, days: number): string {
  const date = parseTaskDate(value);
  if (!date) return value || '';
  return formatDate(addDays(date, days));
}

function parseTaskDate(value: string | undefined): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(part => Number(part));
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  return startOfDay(date);
}

function stripHtml(value: string | undefined): string {
  if (!value) return '';
  return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function hasVisibleTaskTitle(task: Task): boolean {
  return stripHtml(task.title).length > 0;
}

const displayableTasks = computed(() => {
  const query = ganttSearchQuery.value.trim().toLocaleLowerCase();
  return props.tasks.filter((task) => {
    if (!hasVisibleTaskTitle(task)) return false;
    return !query || stripHtml(task.title).toLocaleLowerCase().includes(query);
  });
});

function isRepeatTask(task: Task): boolean {
  return !!task.repeatSeriesId || (!!task.repeatFrequency && task.repeatFrequency !== 'none') || !!task.repeatInstanceDate || !!task.isVirtual;
}

function getTaskGanttRange(task: Task, startDateValue?: string, dueDateValue?: string): { start: Date; end: Date } | null {
  if (isRepeatTask(task)) {
    const instanceDate = parseTaskDate(task.repeatInstanceDate || startDateValue || dueDateValue);
    return instanceDate ? { start: instanceDate, end: instanceDate } : null;
  }

  const taskStart = parseTaskDate(startDateValue || dueDateValue);
  const taskEnd = parseTaskDate(dueDateValue || startDateValue);
  if (!taskStart || !taskEnd) return null;

  return taskStart.getTime() <= taskEnd.getTime()
    ? { start: taskStart, end: taskEnd }
    : { start: taskEnd, end: taskStart };
}

function canDropTaskIntoGantt(task: Task): boolean {
  return !isRepeatTask(task) || !!parseTaskDate(task.dueDate);
}

function buildClippedBarStyle(startDate: Date, endDate: Date, gridRow?: number): Record<string, string> | null {
  const start = timelineStart.value;
  const end = timelineEnd.value;
  if (endDate < start || startDate > end) return null;

  const displayStart = startDate < start ? start : startDate;
  const displayEnd = endDate > end ? end : endDate;
  const offset = Math.round((displayStart.getTime() - start.getTime()) / DAY_MS);
  const span = Math.max(1, Math.round((displayEnd.getTime() - displayStart.getTime()) / DAY_MS) + 1);
  const style: Record<string, string> = {
    gridColumn: `${offset + 2} / span ${span}`
  };
  if (gridRow !== undefined) {
    style.gridRow = `${gridRow}`;
  }
  return style;
}

function buildDeadlineStyle(dueDate: Date | undefined, gridRow: number): Record<string, string> | null {
  if (!dueDate || dueDate < timelineStart.value || dueDate > timelineEnd.value) return null;
  const offset = Math.round((dueDate.getTime() - timelineStart.value.getTime()) / DAY_MS);
  return {
    gridColumn: `${offset + 2}`,
    gridRow: `${gridRow}`
  };
}

function buildTaskColorStyle(task: Pick<Task, 'backgroundColor' | 'groupId'>): Record<string, string> {
  const effectiveBackgroundColor = resolveEffectiveTaskBackgroundColor(task, props.taskGroups);
  return {
    background: resolveTaskBackgroundColor(effectiveBackgroundColor),
    '--pinch-task-chip-color': resolveTaskAccentColor(effectiveBackgroundColor)
  };
}

function getTaskBarStyle(bar: GanttBar): Record<string, string> {
  const colorStyle = buildTaskColorStyle(bar.task);

  if (draggingTaskId.value !== bar.task.id || dragDeltaDays.value === 0 || !dragState) {
    return {
      ...bar.barStyle,
      ...colorStyle
    };
  }

  const previewRange = getDragPreviewRange(dragState, dragDeltaDays.value);
  return {
    ...bar.barStyle,
    ...(buildClippedBarStyle(previewRange.start, previewRange.end) || {}),
    ...colorStyle,
    gridRow: bar.barStyle.gridRow
  };
}

function getDragPreviewRange(state: GanttDragState, deltaDays: number): { start: Date; end: Date } {
  if (state.mode === 'move') {
    return {
      start: addDays(state.rowStart, deltaDays),
      end: addDays(state.rowEnd, deltaDays)
    };
  }
  if (state.mode === 'start') {
    const maxDelta = Math.round((state.rowEnd.getTime() - state.rowStart.getTime()) / DAY_MS);
    return {
      start: addDays(state.rowStart, Math.min(deltaDays, maxDelta)),
      end: state.rowEnd
    };
  }
  const minDelta = -Math.round((state.rowEnd.getTime() - state.rowStart.getTime()) / DAY_MS);
  return {
    start: state.rowStart,
    end: addDays(state.rowEnd, Math.max(deltaDays, minDelta))
  };
}

function normalizeRepeatFrequencyForMenu(frequency: RepeatFrequency | undefined): RepeatFrequency {
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
  return 'none';
}

function handleContextMenu(event: MouseEvent, task: Task): void {
  event.preventDefault();
  event.stopPropagation();
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    task
  };
  contextMenuDateDraft.value = {
    startDate: task.startDate || '',
    startTime: task.startTime || '',
    dueDate: task.dueDate || '',
    dueTime: task.dueTime || ''
  };
  contextMenuRepeatFrequency.value = normalizeRepeatFrequencyForMenu(task.repeatFrequency as RepeatFrequency | undefined);
  contextMenuRepeatRule.value = null;

  if (isRepeatTask(task)) {
    getRepeatSeriesForTask(task)
      .then((series) => {
        if (!series) return;
        if (contextMenu.value.task?.id !== task.id) return;
        contextMenuDateDraft.value = {
          startDate: series.startDate || '',
          startTime: series.startTime || '',
          dueDate: series.endDate || '',
          dueTime: series.dueTime || ''
        };
        contextMenuRepeatRule.value = series.rule || null;
      })
      .catch(() => {});
  }

  TaskRepository.getTaskRepeatRule(task)
    .then((frequency) => {
      if (contextMenu.value.task?.id === task.id) {
        contextMenuRepeatFrequency.value = normalizeRepeatFrequencyForMenu(frequency);
      }
    })
    .catch(() => {});
  bindContextMenuOutsidePointerDown();
}

function handleContextMenuOutsidePointerDown(event: PointerEvent): void {
  if (!contextMenu.value.show) return;
  const target = event.target;
  const targetElement = target instanceof Element ? target : null;
  const clickedInsideContextMenu = !!targetElement?.closest(
    '.context-menu, .time-popover-overlay, .time-popover, .date-popover-overlay, .date-popover, .repeat-dialog-overlay, .repeat-dialog, .task-repeat-settings-popover'
  );
  if (clickedInsideContextMenu) return;
  hideContextMenu();
}

function bindContextMenuOutsidePointerDown(): void {
  if (contextMenuOutsidePointerBound) return;
  document.addEventListener('pointerdown', handleContextMenuOutsidePointerDown, true);
  contextMenuOutsidePointerBound = true;
}

function unbindContextMenuOutsidePointerDown(): void {
  if (!contextMenuOutsidePointerBound) return;
  document.removeEventListener('pointerdown', handleContextMenuOutsidePointerDown, true);
  contextMenuOutsidePointerBound = false;
}

function hideContextMenu(): void {
  unbindContextMenuOutsidePointerDown();
  contextMenu.value = { show: false, x: 0, y: 0, task: null };
  contextMenuDateDraft.value = { startDate: '', startTime: '', dueDate: '', dueTime: '' };
  contextMenuRepeatFrequency.value = 'none';
  contextMenuRepeatRule.value = null;
}

function applyContextMenuDates(task: Task): void {
  if (!task) return;
  const startDate = contextMenuDateDraft.value.startDate || '';
  let dueDate = contextMenuDateDraft.value.dueDate || '';
  if (startDate && dueDate && dueDate < startDate) {
    dueDate = startDate;
  }
  emit('task-date-changed', {
    ...task,
    startDate,
    startTime: contextMenuDateDraft.value.startTime || undefined,
    dueDate,
    dueTime: contextMenuDateDraft.value.dueTime || undefined
  });
}

function clearContextMenuDates(task: Task): void {
  if (!task) return;
  emit('task-date-changed', {
    ...task,
    startDate: '',
    startTime: undefined,
    dueDate: '',
    dueTime: undefined
  });
}

async function setTaskBackgroundColor(task: Task, color: string): Promise<void> {
  if (!task) return;
  const result = await persistTaskBackgroundColor(task, color, props.tasks).catch((error) => {
    console.error('[GanttView] failed to update task color', error);
    return null;
  });
  if (result) {
    if (contextMenu.value.task?.id === task.id) {
      contextMenu.value = {
        ...contextMenu.value,
        task: { ...contextMenu.value.task, backgroundColor: result.color }
      };
    }
    emit('task-color-changed', result.updatedTask);
  }
}

async function saveTaskRepeatRule(task: Task, repeat: RepeatFrequency | RepeatRuleInput): Promise<void> {
  if (!task) return;
  const frequency = typeof repeat === 'string' ? repeat : repeat.frequency;
  contextMenuRepeatFrequency.value = normalizeRepeatFrequencyForMenu(frequency);
  const repeatSeries = isRepeatTask(task)
    ? await getRepeatSeriesForTask(task).catch(() => null)
    : null;
  const taskForRepeatRule = isRepeatTask(task)
    ? {
      ...task,
      startDate: contextMenuDateDraft.value.startDate || repeatSeries?.startDate || task.startDate,
      startTime: contextMenuDateDraft.value.startTime || repeatSeries?.startTime || task.startTime,
      dueDate: contextMenuDateDraft.value.dueDate || repeatSeries?.endDate || task.dueDate,
      dueTime: contextMenuDateDraft.value.dueTime || repeatSeries?.dueTime || task.dueTime
    }
    : task;
  try {
    await TaskRepository.setTaskRepeatRule(taskForRepeatRule, repeat);
  } catch (error) {
    console.error('[GanttView] failed to update repeat rule', error);
  }
  hideContextMenu();
}

function handleContextMenuStartFocus(task: Task): void {
  if (!task) return;
  hideContextMenu();
  emit('start-focus', task);
}

function handleContextMenuEditTask(task: Task): void {
  if (!task) return;
  hideContextMenu();
  emit('edit-task', task);
}

function handleTaskBarPointerDown(event: PointerEvent, bar: GanttBar): void {
  if (event.button !== 0) return;
  startTaskBarDrag(event, bar, 'move');
}

function handleTaskHandlePointerDown(event: PointerEvent, bar: GanttBar, mode: Extract<GanttDragMode, 'start' | 'end'>): void {
  if (event.button !== 0) return;
  startTaskBarDrag(event, bar, mode);
}

function startTaskBarDrag(event: PointerEvent, bar: GanttBar, mode: GanttDragMode): void {
  event.preventDefault();
  dragState = {
    task: bar.task,
    rowStart: bar.start,
    rowEnd: bar.end,
    mode,
    startX: event.clientX,
    lastDeltaDays: 0,
    hasMoved: false
  };
  draggingTaskId.value = bar.task.id;
  dragMode.value = mode;
  dragDeltaDays.value = 0;
  document.addEventListener('pointermove', handleTaskBarPointerMove);
  document.addEventListener('pointerup', handleTaskBarPointerUp);
}

function handleTaskBarPointerMove(event: PointerEvent): void {
  if (!dragState) return;
  const deltaPixels = event.clientX - dragState.startX;
  const rawDeltaDays = Math.round(deltaPixels / effectiveDayColumnWidth.value);
  const deltaDays = clampDragDeltaDays(dragState, rawDeltaDays);
  dragState.hasMoved = dragState.hasMoved || Math.abs(deltaPixels) > 3;
  dragState.lastDeltaDays = deltaDays;
  dragDeltaDays.value = deltaDays;
}

function clampDragDeltaDays(state: GanttDragState, deltaDays: number): number {
  if (state.mode === 'start') {
    const maxDelta = Math.round((state.rowEnd.getTime() - state.rowStart.getTime()) / DAY_MS);
    return Math.min(deltaDays, maxDelta);
  }
  if (state.mode === 'end') {
    const minDelta = -Math.round((state.rowEnd.getTime() - state.rowStart.getTime()) / DAY_MS);
    return Math.max(deltaDays, minDelta);
  }
  return deltaDays;
}

function handleTaskBarPointerUp(event: PointerEvent): void {
  if (!dragState) return;
  const state = dragState;

  if (!state.hasMoved && state.mode === 'move') {
    cleanupTaskBarDrag();
    emit('edit-task', state.task, event);
    return;
  }

  if (!state.hasMoved || state.lastDeltaDays === 0) {
    cleanupTaskBarDrag();
    return;
  }

  const nextTask = buildDraggedTaskUpdate(state);
  setOptimisticTaskDates(nextTask);
  cleanupTaskBarDrag();
  emit('task-date-changed', nextTask);
}

function setOptimisticTaskDates(task: Task): void {
  const next = new Map(optimisticTaskDates.value);
  next.set(task.id, {
    startDate: typeof task.startDate === 'string' ? task.startDate : '',
    dueDate: typeof task.dueDate === 'string' ? task.dueDate : ''
  });
  optimisticTaskDates.value = next;

  const existingTimer = optimisticTaskDateTimers.get(task.id);
  if (existingTimer) {
    window.clearTimeout(existingTimer);
  }
  optimisticTaskDateTimers.set(task.id, window.setTimeout(() => {
    optimisticTaskDateTimers.delete(task.id);
    const current = new Map(optimisticTaskDates.value);
    if (current.delete(task.id)) {
      optimisticTaskDates.value = current;
    }
  }, 3000));
}

function buildDraggedTaskUpdate(state: GanttDragState): Task {
  const nextTask: Task = { ...state.task };
  const previewRange = getDragPreviewRange(state, state.lastDeltaDays);

  if (state.mode === 'move') {
    if (state.task.startDate) {
      nextTask.startDate = shiftDate(state.task.startDate, state.lastDeltaDays);
    }
    if (state.task.dueDate) {
      nextTask.dueDate = shiftDate(state.task.dueDate, state.lastDeltaDays);
    }
    return nextTask;
  }

  if (state.mode === 'start') {
    nextTask.startDate = formatDate(previewRange.start);
  } else {
    nextTask.dueDate = formatDate(previewRange.end);
  }
  return nextTask;
}

function cleanupTaskBarDrag(): void {
  document.removeEventListener('pointermove', handleTaskBarPointerMove);
  document.removeEventListener('pointerup', handleTaskBarPointerUp);
  dragState = null;
  draggingTaskId.value = null;
  dragDeltaDays.value = 0;
  dragMode.value = null;
}

function isGoalSummaryResizable(row: GanttRenderRow): row is Extract<GanttRenderRow, { kind: 'section' }> {
  return row.kind === 'section'
    && !!row.summaryBarStyle
    && !!row.summaryEndDate
    && isValidGoalSectionId(row.sectionId);
}

function setOptimisticGoalDueDate(goalId: string, dueDate: string, scheduleCleanup = false): void {
  const next = new Map(optimisticGoalDueDates.value);
  next.set(goalId, dueDate);
  optimisticGoalDueDates.value = next;

  if (!scheduleCleanup) return;

  const existingTimer = optimisticGoalDueDateTimers.get(goalId);
  if (existingTimer) {
    window.clearTimeout(existingTimer);
  }
  optimisticGoalDueDateTimers.set(goalId, window.setTimeout(() => {
    optimisticGoalDueDateTimers.delete(goalId);
    const current = new Map(optimisticGoalDueDates.value);
    if (current.delete(goalId)) {
      optimisticGoalDueDates.value = current;
    }
  }, 3000));
}

function clearOptimisticGoalDueDate(goalId: string): void {
  const next = new Map(optimisticGoalDueDates.value);
  if (next.delete(goalId)) {
    optimisticGoalDueDates.value = next;
  }
}

function handleGoalSummaryDueHandlePointerDown(
  event: PointerEvent,
  row: Extract<GanttRenderRow, { kind: 'section' }>
): void {
  if (event.button !== 0 || !isGoalSummaryResizable(row) || !row.summaryEndDate) return;
  const goalId = row.sectionId;
  goalDueDateDragState = {
    goalId,
    startX: event.clientX,
    originalDueDate: row.summaryEndDate,
    previewDueDate: row.summaryEndDate,
    hasMoved: false
  };
  draggingGoalDueDateId.value = goalId;
  setOptimisticGoalDueDate(goalId, formatDate(row.summaryEndDate));
  document.addEventListener('pointermove', handleGoalSummaryDueHandlePointerMove);
  document.addEventListener('pointerup', handleGoalSummaryDueHandlePointerUp);
}

function handleGoalSummaryDueHandlePointerMove(event: PointerEvent): void {
  if (!goalDueDateDragState) return;
  const deltaPixels = event.clientX - goalDueDateDragState.startX;
  const deltaDays = Math.round(deltaPixels / effectiveDayColumnWidth.value);
  const previewDueDate = addDays(goalDueDateDragState.originalDueDate, deltaDays);
  goalDueDateDragState.hasMoved = goalDueDateDragState.hasMoved || Math.abs(deltaPixels) > 3 || deltaDays !== 0;
  goalDueDateDragState.previewDueDate = previewDueDate;
  setOptimisticGoalDueDate(goalDueDateDragState.goalId, formatDate(previewDueDate));
}

function handleGoalSummaryDueHandlePointerUp(): void {
  if (!goalDueDateDragState) return;

  const state = goalDueDateDragState;
  const nextDueDate = formatDate(state.previewDueDate);
  const originalDueDate = formatDate(state.originalDueDate);
  if (state.hasMoved && nextDueDate !== originalDueDate) {
    setOptimisticGoalDueDate(state.goalId, nextDueDate, true);
    emit('goal-due-date-changed', state.goalId, nextDueDate);
  } else {
    clearOptimisticGoalDueDate(state.goalId);
  }
  cleanupGoalDueDateDrag();
}

function cleanupGoalDueDateDrag(): void {
  document.removeEventListener('pointermove', handleGoalSummaryDueHandlePointerMove);
  document.removeEventListener('pointerup', handleGoalSummaryDueHandlePointerUp);
  goalDueDateDragState = null;
  draggingGoalDueDateId.value = null;
}

onBeforeUnmount(() => {
  cleanupTaskBarDrag();
  cleanupGoalDueDateDrag();
  cleanupSidebarResize();
  unbindContextMenuOutsidePointerDown();
  optimisticTaskDateTimers.forEach(timer => window.clearTimeout(timer));
  optimisticTaskDateTimers.clear();
  optimisticGoalDueDateTimers.forEach(timer => window.clearTimeout(timer));
  optimisticGoalDueDateTimers.clear();
  resizeObserver?.disconnect();
  resizeObserver = null;
  if (metricsAnimationFrame !== null) {
    window.cancelAnimationFrame(metricsAnimationFrame);
    metricsAnimationFrame = null;
  }
  if (currentTimeUpdateInterval !== null) {
    window.clearInterval(currentTimeUpdateInterval);
    currentTimeUpdateInterval = null;
  }
  window.removeEventListener('resize', updateShellMetrics);
});

function parseExternalTask(event: DragEvent): Task | null {
  const raw = event.dataTransfer?.getData('application/json');
  if (!raw) return null;
  try {
    const task = JSON.parse(raw) as Task;
    return task && typeof task.id === 'string' ? task : null;
  } catch {
    return null;
  }
}

function getDraggedTask(event: DragEvent): Task | null {
  return parseExternalTask(event) || externalDropTask.value;
}

function hasExternalTaskDragData(event: DragEvent): boolean {
  if (externalDropTask.value) return true;
  const types = Array.from(event.dataTransfer?.types || []);
  return types.includes('application/json') || types.includes('text/plain');
}

function isValidGoalSectionId(sectionId: string): boolean {
  const normalizedSectionId = sectionId.trim();
  return props.groupMode === 'goal'
    && normalizedSectionId.length > 0
    && (props.goals || []).some(goal => goal.id === normalizedSectionId);
}

function getGoalSectionIdForRenderRow(row: GanttRenderRow): string | null {
  const sectionId = typeof row.sectionId === 'string' ? row.sectionId.trim() : '';
  return isValidGoalSectionId(sectionId) ? sectionId : null;
}

function isGoalSectionDropTarget(sectionId: string | null | undefined): boolean {
  const normalizedSectionId = typeof sectionId === 'string' ? sectionId.trim() : '';
  return normalizedSectionId.length > 0 && normalizedSectionId === dragOverGoalSectionId.value;
}

function isGoalRenderRowDropTarget(row: GanttRenderRow): boolean {
  return isGoalSectionDropTarget(getGoalSectionIdForRenderRow(row));
}

function resolveExternalGoalDropTarget(event: DragEvent): string | null {
  const target = event.target instanceof Element
    ? event.target
    : (event.target instanceof Node ? event.target.parentElement : null);
  const goalElement = target?.closest('[data-goal-section-id]') as HTMLElement | null;
  const sectionId = goalElement?.dataset.goalSectionId || '';
  return isValidGoalSectionId(sectionId) ? sectionId : null;
}

function handleRowLabelDragStart(event: DragEvent, task: Task): void {
  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest('button, .task-checkbox-wrapper')) {
    event.preventDefault();
    return;
  }
  externalDropTask.value = task;
  if (!event.dataTransfer) return;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('application/json', JSON.stringify(task));
  event.dataTransfer.setData('text/plain', task.id);
}

function handleRowLabelDragEnd(): void {
  clearExternalDropState();
}

function resolveTimelineDayFromEvent(event: DragEvent): Date | null {
  const grid = (event.currentTarget as HTMLElement | null)?.querySelector('.gantt-grid') as HTMLElement | null;
  if (!grid) return null;
  const rect = grid.getBoundingClientRect();
  const offsetX = event.clientX - rect.left;
  const dayIndex = Math.floor(offsetX / effectiveDayColumnWidth.value);
  if (dayIndex < 0 || dayIndex >= timelineDayCount.value) return null;
  return addDays(timelineStart.value, dayIndex);
}

function getTaskSpanDays(task: Task): number {
  const taskStart = parseTaskDate(task.startDate || task.dueDate);
  const taskEnd = parseTaskDate(task.dueDate || task.startDate);
  if (!taskStart || !taskEnd) return 0;
  return Math.max(0, Math.round(Math.abs(taskEnd.getTime() - taskStart.getTime()) / DAY_MS));
}

function resolveExternalDrop(event: DragEvent): ExternalDropResolution | null {
  const task = getDraggedTask(event);
  const day = resolveTimelineDayFromEvent(event);
  if (!task || !day || !canDropTaskIntoGantt(task)) return null;
  const spanDays = getTaskSpanDays(task);
  return {
    task,
    day,
    startDate: day,
    endDate: addDays(day, spanDays)
  };
}

function clearExternalDropState(): void {
  dragOverDayKey.value = null;
  dragOverGoalSectionId.value = null;
  externalDropTask.value = null;
}

function handleExternalTaskDragOver(event: DragEvent): void {
  const day = resolveTimelineDayFromEvent(event);
  const goalSectionId = resolveExternalGoalDropTarget(event);
  if ((!day && !goalSectionId) || !hasExternalTaskDragData(event)) {
    clearExternalDropState();
    return;
  }
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
  dragOverDayKey.value = day ? formatDate(day) : null;
  dragOverGoalSectionId.value = goalSectionId;
  externalDropTask.value = getDraggedTask(event);
}

function handleExternalTaskDragLeave(event: DragEvent): void {
  const currentTarget = event.currentTarget;
  const relatedTarget = event.relatedTarget;
  if (
    currentTarget instanceof Node
    && relatedTarget instanceof Node
    && currentTarget.contains(relatedTarget)
  ) {
    return;
  }
  clearExternalDropState();
}

function handleExternalTaskDrop(event: DragEvent): void {
  const resolution = resolveExternalDrop(event);
  const goalSectionId = resolveExternalGoalDropTarget(event);
  const task = resolution?.task || getDraggedTask(event);
  clearExternalDropState();
  if (!resolution && (!task || !goalSectionId)) return;
  event.preventDefault();
  if (task && goalSectionId) {
    emit('task-goal-drop', task, goalSectionId);
  }
  if (resolution) {
    emit('task-date-changed', {
      ...resolution.task,
      startDate: formatDate(resolution.startDate),
      dueDate: formatDate(resolution.endDate)
    });
  }
}

const externalDropPreviewTitle = computed(() => {
  const task = externalDropTask.value;
  return stripHtml(task?.title) || t('taskManager.untitledTask');
});

const externalDropPreviewStyle = computed<Record<string, string> | null>(() => {
  const task = externalDropTask.value;
  const dayKey = dragOverDayKey.value;
  if (!dayKey) return null;
  const day = parseTaskDate(dayKey);
  if (!day) return null;
  const spanDays = task ? getTaskSpanDays(task) : 0;
  const style = buildClippedBarStyle(day, addDays(day, spanDays), 2);
  if (!style) return null;
  return {
    ...style,
    ...(task ? buildTaskColorStyle(task) : {}),
    gridRow: '2'
  };
});

const today = computed(() => startOfDay(currentTime.value));
const todayTimePosition = computed(() => {
  const now = currentTime.value;
  return ((now.getHours() * 60 * 60 * 1000
    + now.getMinutes() * 60 * 1000
    + now.getSeconds() * 1000
    + now.getMilliseconds()) / DAY_MS) * 100;
});
const timelineDayCount = computed(() => timelineWeeks.value * 7);
const timelineStart = computed(() => addDays(timelineAnchor.value, -7));
const timelineEnd = computed(() => addDays(timelineStart.value, timelineDayCount.value - 1));
const effectiveDayColumnWidth = computed(() => {
  const availableTimelineWidth = shellWidth.value - labelColumnWidth.value;
  if (availableTimelineWidth <= 0) return MIN_DAY_COLUMN_WIDTH;
  return Math.max(MIN_DAY_COLUMN_WIDTH, Math.floor(availableTimelineWidth / timelineDayCount.value));
});

function updateShellMetrics(): void {
  const shell = ganttShellRef.value;
  const nextWidth = shell?.clientWidth || 0;
  const nextHeight = shell?.clientHeight || 0;
  const nextScrollTop = shell?.scrollTop || 0;
  if (shellWidth.value !== nextWidth) shellWidth.value = nextWidth;
  if (shellHeight.value !== nextHeight) shellHeight.value = nextHeight;
  if (shellScrollTop.value !== nextScrollTop) shellScrollTop.value = nextScrollTop;
}

function scheduleShellMetricsUpdate(): void {
  if (metricsAnimationFrame !== null) return;
  metricsAnimationFrame = window.requestAnimationFrame(() => {
    metricsAnimationFrame = null;
    updateShellMetrics();
  });
}

function updateShellWidth(): void {
  updateShellMetrics();
}

function handleGanttShellScroll(): void {
  shellScrollTop.value = ganttShellRef.value?.scrollTop || 0;
  clearGanttGridHover();
}

function handleTimelineScroll(): void {
  const scrollLeft = ganttTimelineRef.value?.scrollLeft || 0;
  timelineScrollLeft.value = scrollLeft;
  if (!syncingHorizontalScrollbar && ganttHorizontalScrollbarRef.value) {
    syncingHorizontalScrollbar = true;
    ganttHorizontalScrollbarRef.value.scrollLeft = scrollLeft;
    syncingHorizontalScrollbar = false;
  }
  clearGanttGridHover();
}

function handleHorizontalScrollbarScroll(): void {
  if (syncingHorizontalScrollbar) return;
  const scrollLeft = ganttHorizontalScrollbarRef.value?.scrollLeft || 0;
  const timeline = ganttTimelineRef.value;
  if (!timeline) return;
  syncingHorizontalScrollbar = true;
  timeline.scrollLeft = scrollLeft;
  syncingHorizontalScrollbar = false;
}

function handleSidebarResizePointerDown(event: PointerEvent): void {
  if (event.button !== 0) return;
  sidebarResizeState = {
    startX: event.clientX,
    startWidth: labelColumnWidth.value,
    scrollLeft: ganttShellRef.value?.scrollLeft || 0
  };
  document.body.style.cursor = 'col-resize';
  document.addEventListener('pointermove', handleSidebarResizePointerMove);
  document.addEventListener('pointerup', cleanupSidebarResize, { once: true });
}

function handleSidebarResizePointerMove(event: PointerEvent): void {
  if (!sidebarResizeState) return;
  labelColumnWidth.value = Math.min(
    MAX_LABEL_COLUMN_WIDTH,
    Math.max(MIN_LABEL_COLUMN_WIDTH, sidebarResizeState.startWidth + event.clientX - sidebarResizeState.startX)
  );
}

function cleanupSidebarResize(): void {
  sidebarResizeState = null;
  document.body.style.cursor = '';
  document.removeEventListener('pointermove', handleSidebarResizePointerMove);
  document.removeEventListener('pointerup', cleanupSidebarResize);
}

function isSidebarResizeEdge(event: PointerEvent): boolean {
  const sidebar = event.currentTarget as HTMLElement | null;
  if (!sidebar) return false;
  const rect = sidebar.getBoundingClientRect();
  return event.clientX >= rect.right - 12 && event.clientX <= rect.right + 8;
}

function handleSidebarPointerMove(event: PointerEvent): void {
  isSidebarResizeReady.value = isSidebarResizeEdge(event);
}

function handleSidebarPointerDown(event: PointerEvent): void {
  if (!isSidebarResizeEdge(event)) return;
  event.preventDefault();
  handleSidebarResizePointerDown(event);
}

function clearGanttGridHover(): void {
  hoveredRenderRowKey.value = null;
}

function isRenderRowHovered(row: GanttRenderRow): boolean {
  return hoveredRenderRowKey.value === row.key;
}

function handleGanttGridPointerMove(event: PointerEvent): void {
  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest('.gantt-day-header, .gantt-corner, .gantt-header-row-bg, .gantt-header-row-border')) {
    clearGanttGridHover();
    return;
  }

  const grid = event.currentTarget as HTMLElement | null;
  if (!grid) return;

  const rect = grid.getBoundingClientRect();
  const rowIndex = Math.floor((event.clientY - rect.top) / GANTT_ROW_HEIGHT) - 1;
  const nextKey = rowIndex >= 0 && rowIndex < renderRows.value.length
    ? renderRows.value[rowIndex]?.key || null
    : null;

  if (hoveredRenderRowKey.value !== nextKey) {
    hoveredRenderRowKey.value = nextKey;
  }
}

function getTodayColumnIndex(): number {
  const offset = Math.round((today.value.getTime() - timelineStart.value.getTime()) / DAY_MS);
  return offset >= 0 && offset < timelineDayCount.value ? offset : -1;
}

function scrollTodayIntoView(): void {
  const shell = ganttTimelineRef.value;
  const todayIndex = getTodayColumnIndex();
  if (!shell || todayIndex < 0) return;

  const visibleTimelineWidth = shell.clientWidth;
  const visibleTimelineStart = shell.scrollLeft;
  const visibleTimelineEnd = shell.scrollLeft + shell.clientWidth;
  const todayLeft = todayIndex * effectiveDayColumnWidth.value;
  const todayRight = todayLeft + effectiveDayColumnWidth.value;
  if (todayLeft >= visibleTimelineStart && todayRight <= visibleTimelineEnd) return;

  const targetLeft = Math.max(0, todayLeft - Math.floor(visibleTimelineWidth * 0.25));
  shell.scrollTo({
    left: targetLeft,
    behavior: 'smooth'
  });
}

function scheduleScrollTodayIntoView(): void {
  void nextTick(() => {
    updateShellWidth();
    scrollTodayIntoView();
  });
}

onMounted(() => {
  currentTimeUpdateInterval = window.setInterval(() => {
    currentTime.value = new Date();
  }, 60000);
  void nextTick(() => {
    updateShellMetrics();
    if (typeof ResizeObserver !== 'undefined' && ganttShellRef.value) {
    resizeObserver = new ResizeObserver(scheduleShellMetricsUpdate);
      resizeObserver.observe(ganttShellRef.value);
    } else {
      window.addEventListener('resize', updateShellMetrics);
    }
    scrollTodayIntoView();
  });
});

watch(timelineWeeks, () => {
  scheduleScrollTodayIntoView();
});

watch(
  () => props.tasks,
  (tasks) => {
    if (optimisticTaskDates.value.size === 0) return;

    const next = new Map(optimisticTaskDates.value);
    tasks.forEach((task) => {
      const optimisticDates = next.get(task.id);
      if (!optimisticDates) return;

      const startDate = typeof task.startDate === 'string' ? task.startDate : '';
      const dueDate = typeof task.dueDate === 'string' ? task.dueDate : '';
      if (startDate === optimisticDates.startDate && dueDate === optimisticDates.dueDate) {
        next.delete(task.id);
        const timer = optimisticTaskDateTimers.get(task.id);
        if (timer) {
          window.clearTimeout(timer);
          optimisticTaskDateTimers.delete(task.id);
        }
      }
    });

    if (next.size !== optimisticTaskDates.value.size) {
      optimisticTaskDates.value = next;
    }
  },
  { deep: true }
);

watch(
  () => props.goals,
  (goals) => {
    if (optimisticGoalDueDates.value.size === 0) return;

    const next = new Map(optimisticGoalDueDates.value);
    (goals || []).forEach((goal) => {
      const optimisticDueDate = next.get(goal.id);
      if (!optimisticDueDate) return;

      const dueDate = typeof goal.dueDate === 'string' ? goal.dueDate : '';
      if (dueDate === optimisticDueDate) {
        next.delete(goal.id);
        const timer = optimisticGoalDueDateTimers.get(goal.id);
        if (timer) {
          window.clearTimeout(timer);
          optimisticGoalDueDateTimers.delete(goal.id);
        }
      }
    });

    if (next.size !== optimisticGoalDueDates.value.size) {
      optimisticGoalDueDates.value = next;
    }
  },
  { deep: true }
);

const timelineDays = computed<TimelineDay[]>(() => {
  const todayKey = formatDateKey(today.value);
  return Array.from({ length: timelineDayCount.value }, (_, index) => {
    const date = addDays(timelineStart.value, index);
    const weekday = date.getDay();
    return {
      key: formatDateKey(date),
      monthLabel: index === 0 || date.getDate() === 1 ? formatGanttMonthLabel(date) : '',
      weekdayLabel: formatGanttWeekdayLabel(date),
      dayLabel: String(date.getDate()),
      isToday: formatDateKey(date) === todayKey,
      isWeekend: weekday === 0 || weekday === 6
    };
  });
});

function formatTimelineWeekOption(weeks: number): string {
  return formatTemplate('ganttView.timelineWeeksTemplate', { weeks });
}

function shiftTimeline(direction: -1 | 1): void {
  timelineAnchor.value = addDays(timelineAnchor.value, direction * timelineDayCount.value);
  void nextTick(updateShellWidth);
}

function resetTimeline(): void {
  timelineAnchor.value = today.value;
  scheduleScrollTodayIntoView();
}

function setTimelineWeeks(weeks: (typeof timelineWeekOptions)[number]): void {
  timelineWeeks.value = weeks;
}

const scheduledTaskRows = computed<GanttRow[]>(() => {
  const start = timelineStart.value;
  const end = timelineEnd.value;

  const bars = displayableTasks.value
    .map((task) => {
      const optimisticDates = optimisticTaskDates.value.get(task.id);
      const effectiveStartDate = optimisticDates?.startDate ?? task.startDate;
      const effectiveDueDate = optimisticDates?.dueDate ?? task.dueDate;
      const dueDate = parseTaskDate(effectiveDueDate);
      if (isRepeatTask(task) && !dueDate) return null;

      const range = getTaskGanttRange(task, effectiveStartDate, effectiveDueDate);
      if (!range) return null;

      const normalizedStart = range.start;
      const normalizedEnd = range.end;
      if (normalizedEnd < start || normalizedStart > end) return null;

      const displayTask = optimisticDates
        ? { ...task, startDate: optimisticDates.startDate, dueDate: optimisticDates.dueDate }
        : task;
      return {
        key: `task:${task.id}`,
        task: displayTask,
        title: stripHtml(task.title) || t('taskManager.untitledTask'),
        start: normalizedStart,
        end: normalizedEnd,
        barStyle: buildClippedBarStyle(normalizedStart, normalizedEnd) || {}
      };
    })
    .filter((bar): bar is GanttBar => bar !== null)
    .sort((left, right) => {
      const startDiff = left.start.getTime() - right.start.getTime();
      if (startDiff !== 0) return startDiff;
      return left.end.getTime() - right.end.getTime();
    });

  const rows: GanttRow[] = [];
  const repeatRowBySeriesId = new Map<string, GanttRow>();

  bars.forEach((bar) => {
    const repeatSeriesId = typeof bar.task.repeatSeriesId === 'string' ? bar.task.repeatSeriesId.trim() : '';
    if (!repeatSeriesId) {
      rows.push({
        key: `row:${bar.task.id}`,
        primaryTask: bar.task,
        title: bar.title,
        start: bar.start,
        end: bar.end,
        bars: [bar]
      });
      return;
    }

    const existing = repeatRowBySeriesId.get(repeatSeriesId);
    if (existing) {
      existing.bars.push(bar);
      if (bar.start < existing.start) existing.start = bar.start;
      if (bar.end > existing.end) existing.end = bar.end;
      return;
    }

    const row: GanttRow = {
      key: `repeat:${repeatSeriesId}`,
      primaryTask: bar.task,
      title: bar.title,
      start: bar.start,
      end: bar.end,
      bars: [bar]
    };
    repeatRowBySeriesId.set(repeatSeriesId, row);
    rows.push(row);
  });

  return rows
    .map(row => ({
      ...row,
      bars: [...row.bars].sort((left, right) => {
        const startDiff = left.start!.getTime() - right.start!.getTime();
        if (startDiff !== 0) return startDiff;
        return left.end!.getTime() - right.end!.getTime();
      })
    }))
    .sort((left, right) => {
      const startDiff = left.start!.getTime() - right.start!.getTime();
      if (startDiff !== 0) return startDiff;
      return left.end!.getTime() - right.end!.getTime();
    });
});

function getRepeatSeriesId(task: Task): string {
  return typeof task.repeatSeriesId === 'string' ? task.repeatSeriesId.trim() : '';
}

function isTaskInGoal(task: Task, goal: Goal): boolean {
  return isTaskInGoalScope(goal, task);
}

const goalTaskMembership = computed(() => {
  const goals = Array.isArray(props.goals) ? props.goals : [];
  const goalIdsByTaskId = new Map<string, Set<string>>();
  const taskIdsByGoalId = new Map<string, Set<string>>();

  goals.forEach((goal) => {
    taskIdsByGoalId.set(goal.id, new Set());
  });

  displayableTasks.value.forEach((task) => {
    const taskId = typeof task.id === 'string' ? task.id.trim() : '';
    if (!taskId) return;

    goals.forEach((goal) => {
      if (!isTaskInGoal(task, goal)) return;

      const goalIds = goalIdsByTaskId.get(taskId) || new Set<string>();
      goalIds.add(goal.id);
      goalIdsByTaskId.set(taskId, goalIds);
      taskIdsByGoalId.get(goal.id)?.add(taskId);
    });
  });

  return { goalIdsByTaskId, taskIdsByGoalId };
});

function getGanttTaskGoalIds(task: Task): ReadonlySet<string> {
  const taskId = typeof task.id === 'string' ? task.id.trim() : '';
  return taskId ? goalTaskMembership.value.goalIdsByTaskId.get(taskId) || EMPTY_GOAL_IDS : EMPTY_GOAL_IDS;
}

function buildUnscheduledTaskRow(task: Task): GanttRow {
  return {
    key: getRepeatSeriesId(task) ? `unscheduled-repeat:${getRepeatSeriesId(task)}` : `unscheduled:${task.id}`,
    primaryTask: task,
    title: stripHtml(task.title) || t('taskManager.untitledTask'),
    bars: [],
    isUnscheduled: true
  };
}

function buildUnscheduledRows(
  scheduledRows: GanttRow[],
  matchesTask: (task: Task) => boolean
): GanttRow[] {
  const scheduledTaskIds = new Set<string>();
  const scheduledRepeatSeriesIds = new Set<string>();
  scheduledRows.forEach((row) => {
    row.bars.forEach((bar) => {
      const taskId = typeof bar.task.id === 'string' ? bar.task.id.trim() : '';
      if (taskId) scheduledTaskIds.add(taskId);
      const repeatSeriesId = getRepeatSeriesId(bar.task);
      if (repeatSeriesId) scheduledRepeatSeriesIds.add(repeatSeriesId);
    });
  });

  const rowByKey = new Map<string, GanttRow>();
  displayableTasks.value.forEach((task) => {
    if (!matchesTask(task)) return;

    const repeatSeriesId = getRepeatSeriesId(task);
    if (repeatSeriesId && scheduledRepeatSeriesIds.has(repeatSeriesId)) return;
    const taskId = typeof task.id === 'string' ? task.id.trim() : '';
    if (!repeatSeriesId && taskId && scheduledTaskIds.has(taskId)) return;

    const row = buildUnscheduledTaskRow(task);
    if (!rowByKey.has(row.key)) {
      rowByKey.set(row.key, row);
    }
  });

  return Array.from(rowByKey.values())
    .sort(compareUnscheduledRows);
}

function compareUnscheduledRows(left: GanttRow, right: GanttRow): number {
  const leftCompleted = left.primaryTask.status === 'completed';
  const rightCompleted = right.primaryTask.status === 'completed';
  if (leftCompleted !== rightCompleted) return leftCompleted ? 1 : -1;
  return left.title.localeCompare(right.title, 'zh-Hans-CN');
}

function buildDocumentUnscheduledRows(documentId: string, scheduledRows: GanttRow[]): GanttRow[] {
  return buildUnscheduledRows(scheduledRows, task => getTaskDocumentId(task) === documentId);
}

function getRowTaskCount(row: GanttRow): number {
  return row.bars.length || 1;
}

function getRowTasks(row: GanttRow): Task[] {
  return row.bars.length > 0 ? row.bars.map(bar => bar.task) : [row.primaryTask];
}

function getSectionTaskCount(section: GanttSection): number {
  return section.summaryTasks.length || section.rows.reduce((count, row) => count + getRowTaskCount(row), 0);
}

function getTaskDocumentTitle(task: Task): string {
  const rawPath = typeof task.hPath === 'string' ? task.hPath.trim() : '';
  if (rawPath) {
    const parts = rawPath.split('/').map(part => part.trim()).filter(Boolean);
    const title = parts[parts.length - 1];
    if (title) return title;
  }
  const rootId = typeof task.rootId === 'string' ? task.rootId.trim() : '';
  const mappedTitle = rootId ? props.documentTitleByRootId?.get(rootId)?.trim() : '';
  if (mappedTitle) return mappedTitle;
  return t('ganttView.unassignedDocument');
}

function getTaskDocumentIcon(task?: Task, sectionId?: string): string {
  const rootId = typeof task?.rootId === 'string'
    ? task.rootId.trim()
    : (sectionId || '').split(':').at(-1)?.trim() || '';
  const mappedIcon = rootId ? props.documentIconByRootId?.get(rootId)?.trim() : '';
  if (mappedIcon) return mappedIcon;
  const taskIcon = typeof task?.icon === 'string' ? task.icon.trim() : '';
  return taskIcon || '📄';
}

function getTaskDocumentId(task: Task): string {
  const notebookId = typeof task.notebookId === 'string' ? task.notebookId.trim() : '';
  const rootId = typeof task.rootId === 'string' ? task.rootId.trim() : '';
  return notebookId && rootId ? `${notebookId}:${rootId}` : 'unassigned';
}

function buildGoalSections(): GanttSection[] {
  const goals = Array.isArray(props.goals) ? props.goals : [];
  const sections: GanttSection[] = [];

  goals.forEach((goal) => {
    const goalTaskIds = goalTaskMembership.value.taskIdsByGoalId.get(goal.id) || EMPTY_GOAL_IDS;
    const scheduledRows = scheduledTaskRows.value.filter(row => row.bars.some(bar => goalTaskIds.has(bar.task.id)));
    const unscheduledRows = buildUnscheduledRows(scheduledRows, task => goalTaskIds.has(task.id));
    const rows = [...scheduledRows, ...unscheduledRows];
    const summaryTasks = displayableTasks.value.filter(task => goalTaskIds.has(task.id));
    if (rows.length === 0 && summaryTasks.length === 0) return;

    const effectiveDueDateValue = optimisticGoalDueDates.value.get(goal.id) ?? goal.dueDate;
    const dueDate = parseTaskDate(effectiveDueDateValue);
    sections.push({
      id: goal.id,
      title: goal.name || t('taskManager.untitledGoal'),
      emoji: goal.emoji || '🎯',
      dueDate,
      dueDateLabel: dueDate ? formatMonthDay(dueDate) : undefined,
      hasDeadline: !!dueDate,
      rows,
      summaryTasks
    });
  });

  const unassignedSummaryTasks = displayableTasks.value.filter(task => getGanttTaskGoalIds(task).size === 0);
  const unassignedRows = scheduledTaskRows.value
    .map<GanttRow | null>((row) => {
      const bars = row.bars.filter(bar => getGanttTaskGoalIds(bar.task).size === 0);
      if (bars.length === 0) return null;
      return {
        ...row,
        primaryTask: bars[0].task,
        title: bars[0].title,
        start: bars.reduce((earliest, bar) => bar.start < earliest ? bar.start : earliest, bars[0].start),
        end: bars.reduce((latest, bar) => bar.end > latest ? bar.end : latest, bars[0].end),
        bars
      };
    })
    .filter((row): row is GanttRow => row !== null);
  const unassignedUnscheduledRows = buildUnscheduledRows(
    unassignedRows,
    task => getGanttTaskGoalIds(task).size === 0
  );
  const unassignedSectionRows = [...unassignedRows, ...unassignedUnscheduledRows];
  if (unassignedSectionRows.length > 0 || unassignedSummaryTasks.length > 0) {
    sections.push({
      id: 'unassigned',
      title: t('ganttView.unassignedGoal'),
      emoji: '',
      rows: unassignedSectionRows,
      summaryTasks: unassignedSummaryTasks
    });
  }

  return sections;
}

function buildDocumentSections(): GanttSection[] {
  const selectedSection = props.selectedDocumentSection;
  if (selectedSection) {
    const scheduledRows = scheduledTaskRows.value;
    const unscheduledRows = buildUnscheduledRows(scheduledRows, () => true);
    const rows = [...scheduledRows, ...unscheduledRows];
    if (rows.length === 0 && displayableTasks.value.length === 0) {
      return [];
    }
    return [{
      id: selectedSection.id,
      title: selectedSection.title,
      emoji: '📄',
      rows,
      summaryTasks: displayableTasks.value,
      ...{ emoji: getTaskDocumentIcon(displayableTasks.value[0], selectedSection.id) }
    }];
  }

  const sectionByDocument = new Map<string, GanttSection>();
  const summaryTasksByDocument = new Map<string, Task[]>();

  displayableTasks.value.forEach((task) => {
    const id = getTaskDocumentId(task);
    const tasks = summaryTasksByDocument.get(id);
    if (tasks) {
      tasks.push(task);
      return;
    }
    summaryTasksByDocument.set(id, [task]);
  });

  scheduledTaskRows.value.forEach((row) => {
    const id = getTaskDocumentId(row.primaryTask);
    const existing = sectionByDocument.get(id);
    if (existing) {
      existing.rows.push(row);
      return;
    }

    sectionByDocument.set(id, {
      id,
      title: getTaskDocumentTitle(row.primaryTask),
      emoji: '📄',
      rows: [row],
      summaryTasks: summaryTasksByDocument.get(id) || [],
      ...{ emoji: getTaskDocumentIcon(row.primaryTask, id) }
    });
  });

  summaryTasksByDocument.forEach((summaryTasks, id) => {
    let section = sectionByDocument.get(id);
    const unscheduledRows = buildDocumentUnscheduledRows(id, section?.rows || []);
    if (!section && unscheduledRows.length === 0) {
      return;
    }

    if (!section) {
      const primaryTask = summaryTasks[0];
      section = {
        id,
        title: primaryTask ? getTaskDocumentTitle(primaryTask) : t('ganttView.unassignedDocument'),
        emoji: '📄',
        rows: [],
        summaryTasks,
        ...{ emoji: getTaskDocumentIcon(primaryTask, id) }
      };
      sectionByDocument.set(id, section);
    }

    if (unscheduledRows.length > 0) {
      section.rows.push(...unscheduledRows);
    }
  });

  const orderIndex = new Map((props.documentOrder || []).map((id, index) => [id, index]));
  return Array.from(sectionByDocument.values()).sort((left, right) => {
    const leftOrder = orderIndex.get(left.id);
    const rightOrder = orderIndex.get(right.id);
    if (leftOrder !== undefined || rightOrder !== undefined) {
      return (leftOrder ?? Number.MAX_SAFE_INTEGER) - (rightOrder ?? Number.MAX_SAFE_INTEGER);
    }
    return left.title.localeCompare(right.title, 'zh-Hans-CN');
  });
}

function buildSectionSummary(
  section: GanttSection,
  gridRow: number
): Pick<Extract<GanttRenderRow, { kind: 'section' }>, 'completedTasks' | 'summaryProgress' | 'summaryText' | 'summaryTitle' | 'summaryBarStyle' | 'summaryEndDate' | 'deadlineStyle' | 'deadlineTitle' | 'isOverdue' | 'hasScheduleRisk'> {
  const sectionBars = section.rows.flatMap(row => row.bars);
  const sectionTasks = section.summaryTasks.length > 0
    ? section.summaryTasks
    : section.rows.flatMap(row => getRowTasks(row));
  const completedTasks = sectionTasks.filter(task => task.status === 'completed').length;
  const totalTasks = sectionTasks.length;
  const summaryProgress = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0;
  const summaryText = `${completedTasks}/${totalTasks}`;
  const summaryTitle = `${section.title} ${summaryText}`;

  if (sectionBars.length === 0) {
    const isOverdue = !!section.dueDate && section.dueDate < today.value && completedTasks < totalTasks;
    return {
      completedTasks,
      summaryProgress,
      summaryText,
      summaryTitle,
      summaryBarStyle: null,
      summaryEndDate: null,
      deadlineStyle: buildDeadlineStyle(section.hasDeadline ? section.dueDate : undefined, gridRow),
      deadlineTitle: section.dueDate ? `${section.title} ${formatMonthDay(section.dueDate)}` : '',
      isOverdue,
      hasScheduleRisk: false
    };
  }

  const starts = sectionBars.map(bar => bar.start.getTime());
  const ends = sectionBars.map(bar => bar.end.getTime());
  const firstTaskStart = new Date(Math.min(...starts));
  const taskEnd = new Date(Math.max(...ends));
  const rawSectionEnd = section.dueDate || taskEnd;
  const sectionStart = firstTaskStart.getTime() <= rawSectionEnd.getTime()
    ? firstTaskStart
    : rawSectionEnd;
  const sectionEnd = firstTaskStart.getTime() <= rawSectionEnd.getTime()
    ? rawSectionEnd
    : firstTaskStart;
  const isOverdue = sectionEnd < today.value && completedTasks < totalTasks;
  const hasScheduleRisk = !!section.dueDate && taskEnd > section.dueDate && completedTasks < totalTasks;

  return {
    completedTasks,
    summaryProgress,
    summaryText,
    summaryTitle,
    summaryBarStyle: buildClippedBarStyle(sectionStart, sectionEnd, gridRow),
    summaryEndDate: sectionEnd,
    deadlineStyle: buildDeadlineStyle(section.hasDeadline ? section.dueDate : undefined, gridRow),
    deadlineTitle: section.dueDate ? `${section.title} ${formatMonthDay(section.dueDate)}` : '',
    isOverdue,
    hasScheduleRisk
  };
}

function toggleSection(sectionId: string): void {
  const next = new Set(collapsedSectionIds.value);
  if (next.has(sectionId)) {
    next.delete(sectionId);
  } else {
    next.add(sectionId);
  }
  collapsedSectionIds.value = next;
}

const showDocumentMilestones = computed(() => props.showDocumentMilestones === true && props.groupMode === 'document');

function getDocumentMilestoneNumber(sectionId: string): number {
  const orderedIndex = (props.documentOrder || []).indexOf(sectionId);
  if (orderedIndex >= 0) return orderedIndex + 1;
  const index = ganttSections.value.findIndex(section => section.id === sectionId);
  return index >= 0 ? index + 1 : 0;
}

function getDocumentMilestoneGuideRowCount(sectionId: string): number {
  const currentIndex = renderRows.value.findIndex(row => row.kind === 'section' && row.sectionId === sectionId);
  if (currentIndex < 0) return 0;
  const nextIndex = renderRows.value.findIndex((row, index) =>
    index > currentIndex && row.kind === 'section'
  );
  return nextIndex > currentIndex ? nextIndex - currentIndex : 0;
}

function handleDocumentMilestoneDragStart(event: DragEvent, sectionId: string): void {
  if (!showDocumentMilestones.value) {
    event.preventDefault();
    return;
  }
  draggedDocumentMilestoneId.value = sectionId;
  dragOverDocumentMilestoneId.value = '';
  event.dataTransfer?.setData('text/plain', sectionId);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
}

function handleDocumentMilestoneDragOver(event: DragEvent, sectionId: string): void {
  if (!showDocumentMilestones.value || !draggedDocumentMilestoneId.value || sectionId === draggedDocumentMilestoneId.value) return;
  event.preventDefault();
  dragOverDocumentMilestoneId.value = sectionId;
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
}

function handleDocumentMilestoneDrop(event: DragEvent, targetSectionId: string): void {
  const sourceSectionId = draggedDocumentMilestoneId.value || event.dataTransfer?.getData('text/plain') || '';
  clearDocumentMilestoneDragState();
  if (!showDocumentMilestones.value || !sourceSectionId || sourceSectionId === targetSectionId) return;
  event.preventDefault();
  const nextOrder = [...(props.documentOrder || ganttSections.value.map(section => section.id))];
  const sourceIndex = nextOrder.indexOf(sourceSectionId);
  const targetIndex = nextOrder.indexOf(targetSectionId);
  if (sourceIndex < 0 || targetIndex < 0) return;
  nextOrder.splice(sourceIndex, 1);
  // Insert on the natural side of the target: after it when moving down,
  // before it when moving up.
  const targetIndexAfterRemoval = nextOrder.indexOf(targetSectionId);
  const insertIndex = sourceIndex < targetIndex
    ? targetIndexAfterRemoval + 1
    : targetIndexAfterRemoval;
  nextOrder.splice(insertIndex, 0, sourceSectionId);
  emit('document-order-change', nextOrder);
}

function clearDocumentMilestoneDragState(): void {
  draggedDocumentMilestoneId.value = '';
  dragOverDocumentMilestoneId.value = '';
}

function getUnscheduledDisplayMode(sectionId: string): UnscheduledDisplayMode {
  void sectionId;
  return showCompletedTaskRows.value ? 'all' : 'incomplete';
}

function setUnscheduledDisplayMode(sectionId: string, mode: UnscheduledDisplayMode): void {
  const next = new Map(unscheduledSectionModes.value);
  if (mode === 'collapsed') {
    next.delete(sectionId);
  } else {
    next.set(sectionId, mode);
  }
  unscheduledSectionModes.value = next;
}

function handleUnscheduledControlClick(row: Extract<GanttRenderRow, { kind: 'unscheduled-toggle' }>): void {
  if (row.action === 'show-incomplete') {
    setUnscheduledDisplayMode(row.sectionId, 'incomplete');
    return;
  }
  if (row.action === 'show-all') {
    setUnscheduledDisplayMode(row.sectionId, 'all');
    return;
  }
  setUnscheduledDisplayMode(row.sectionId, 'collapsed');
}

const ganttSections = computed<GanttSection[]>(() => {
  if (props.groupMode === 'none') {
    return [];
  }
  if (props.groupMode === 'document') {
    return buildDocumentSections();
  }
  return buildGoalSections();
});

function normalizeRenderRowGridPositions(rows: GanttRenderRow[]): GanttRenderRow[] {
  return rows.map((row, index) => {
    const gridRow = `${index + 2}`;

    if (row.kind === 'section') {
      return {
        ...row,
        summaryBarStyle: row.summaryBarStyle
          ? { ...row.summaryBarStyle, gridRow }
          : null,
        deadlineStyle: row.deadlineStyle
          ? { ...row.deadlineStyle, gridRow }
          : null
      };
    }

    if (row.kind === 'task') {
      return {
        ...row,
        bars: row.bars.map(bar => ({
          ...bar,
          barStyle: { ...bar.barStyle, gridRow }
        }))
      };
    }

    return row;
  });
}

function filterCompletedTaskRows(rows: GanttRenderRow[]): GanttRenderRow[] {
  const visibleRows = showCompletedTaskRows.value
    ? rows
    : rows.filter(row =>
      row.kind !== 'task'
      || row.primaryTask.status !== 'completed'
      // Keep completed tasks that have a visible schedule. Only completed
      // tasks outside the current timeline remain hidden by default.
      || !row.isUnscheduled
    );
  // Filtering changes row indices; bars and goal summaries must follow the
  // remaining render rows instead of retaining their pre-filter grid rows.
  return normalizeRenderRowGridPositions(visibleRows);
}

const renderRows = computed<GanttRenderRow[]>(() => {
  const pushUnscheduledControlRow = (
    rows: GanttRenderRow[],
    sectionId: string,
    key: string,
    action: Extract<GanttRenderRow, { kind: 'unscheduled-toggle' }>['action'],
    title: string,
    taskCount: number,
    expanded: boolean
  ): void => {
    rows.push({
      kind: 'unscheduled-toggle',
      key,
      sectionId,
      action,
      title,
      taskCount,
      expanded
    });
  };

  const getUnscheduledControlTitle = (
    action: Extract<GanttRenderRow, { kind: 'unscheduled-toggle' }>['action']
  ): string => {
    if (action === 'show-incomplete') return t('ganttView.showIncompleteUnscheduledTasks');
    if (action === 'show-all') return t('ganttView.showAllUnscheduledTasks');
    return t('ganttView.collapseUnscheduledTasks');
  };

  const pushCollapsedUnscheduledControlRow = (
    rows: GanttRenderRow[],
    sectionId: string,
    keyPrefix: string,
    unscheduledRows: GanttRow[],
    incompleteRows: GanttRow[]
  ): void => {
    const hasIncompleteRows = incompleteRows.length > 0;
    const action: Extract<GanttRenderRow, { kind: 'unscheduled-toggle' }>['action'] = hasIncompleteRows
      ? 'show-incomplete'
      : 'show-all';
    pushUnscheduledControlRow(
      rows,
      sectionId,
      `${keyPrefix}:unscheduled-toggle`,
      action,
      getUnscheduledControlTitle(action),
      hasIncompleteRows ? incompleteRows.length : unscheduledRows.length,
      false
    );
  };

  const appendUnscheduledTaskRows = (
    rows: GanttRenderRow[],
    sectionId: string,
    keyPrefix: string,
    taskRows: GanttRow[]
  ): void => {
    taskRows.forEach((row) => {
      rows.push({
        ...row,
        kind: 'task',
        sectionId,
        key: `${keyPrefix}:${row.key}`,
        bars: []
      });
    });
  };

  const appendSection = (rows: GanttRenderRow[], section: GanttSection): void => {
    const sectionGridRow = rows.length + 2;
    const collapsed = collapsedSectionIds.value.has(section.id);
    const summary = buildSectionSummary(section, sectionGridRow);
    rows.push({
      kind: 'section',
      key: `section:${section.id}`,
      sectionId: section.id,
      title: section.title,
      emoji: section.emoji,
      taskCount: getSectionTaskCount(section),
      collapsed,
      dueDateLabel: section.dueDateLabel,
      ...summary
    });

    if (collapsed) return;

    const scheduledRows = section.rows.filter(row => !row.isUnscheduled);
    const unscheduledRows = section.rows.filter(row => row.isUnscheduled);
    const incompleteUnscheduledRows = unscheduledRows.filter(row => row.primaryTask.status !== 'completed');
    const unscheduledMode = getUnscheduledDisplayMode(section.id);
    const pushUnscheduledToggleRow = (
      action: Extract<GanttRenderRow, { kind: 'unscheduled-toggle' }>['action'],
      taskCount: number,
      expanded: boolean
    ): void => {
      if (unscheduledRows.length === 0) return;
      pushUnscheduledControlRow(
        rows,
        section.id,
        `${section.id}:unscheduled-${action}`,
        action,
        getUnscheduledControlTitle(action),
        taskCount,
        expanded
      );
    };

    scheduledRows.forEach((row) => {
      const gridRow = rows.length + 2;
      rows.push({
        ...row,
        kind: 'task',
        sectionId: section.id,
        key: `${section.id}:${row.key}`,
        bars: row.bars.map(bar => ({
          ...bar,
          isBeyondSectionDue: !!section.dueDate
            && bar.end > section.dueDate
            && bar.task.status !== 'completed',
          barStyle: {
            ...bar.barStyle,
            gridRow: `${gridRow}`
          }
        }))
      });
    });

    if (unscheduledMode === 'collapsed') {
      pushCollapsedUnscheduledControlRow(rows, section.id, section.id, unscheduledRows, incompleteUnscheduledRows);
      return;
    }

    if (unscheduledMode === 'incomplete') {
      appendUnscheduledTaskRows(rows, section.id, section.id, incompleteUnscheduledRows);
      return;
    }

    appendUnscheduledTaskRows(rows, section.id, section.id, unscheduledRows);
    if (!props.autoExpandUnscheduledTasks && !showCompletedTaskRows.value) {
      pushUnscheduledToggleRow('collapse', unscheduledRows.length, true);
    }
  };

  if (props.groupMode === 'none') {
    const rows: GanttRenderRow[] = [];
    const unscheduledRows = buildUnscheduledRows(scheduledTaskRows.value, () => true);
    const incompleteUnscheduledRows = unscheduledRows.filter(row => row.primaryTask.status !== 'completed');
    const unscheduledMode = getUnscheduledDisplayMode(UNGROUPED_UNSCHEDULED_SECTION_ID);
    const pushUnscheduledToggleRow = (
      action: Extract<GanttRenderRow, { kind: 'unscheduled-toggle' }>['action'],
      taskCount: number,
      expanded: boolean
    ): void => {
      if (unscheduledRows.length === 0) return;
      pushUnscheduledControlRow(
        rows,
        UNGROUPED_UNSCHEDULED_SECTION_ID,
        `${UNGROUPED_UNSCHEDULED_SECTION_ID}:unscheduled-${action}`,
        action,
        getUnscheduledControlTitle(action),
        taskCount,
        expanded
      );
    };

    scheduledTaskRows.value.forEach((row) => {
      const gridRow = rows.length + 2;
      rows.push({
        ...row,
        kind: 'task',
        key: row.key,
        bars: row.bars.map(bar => ({
          ...bar,
          barStyle: {
            ...bar.barStyle,
            gridRow: `${gridRow}`
          }
        }))
      });
    });

    if (unscheduledMode === 'collapsed') {
      pushCollapsedUnscheduledControlRow(
        rows,
        UNGROUPED_UNSCHEDULED_SECTION_ID,
        UNGROUPED_UNSCHEDULED_SECTION_ID,
        unscheduledRows,
        incompleteUnscheduledRows
      );
      return filterCompletedTaskRows(rows);
    }

    if (unscheduledMode === 'incomplete') {
      appendUnscheduledTaskRows(
        rows,
        UNGROUPED_UNSCHEDULED_SECTION_ID,
        UNGROUPED_UNSCHEDULED_SECTION_ID,
        incompleteUnscheduledRows
      );
      return filterCompletedTaskRows(rows);
    }

    appendUnscheduledTaskRows(
      rows,
      UNGROUPED_UNSCHEDULED_SECTION_ID,
      UNGROUPED_UNSCHEDULED_SECTION_ID,
      unscheduledRows
    );
    if (!props.autoExpandUnscheduledTasks && !showCompletedTaskRows.value) {
      pushUnscheduledToggleRow('collapse', unscheduledRows.length, true);
    }
    return filterCompletedTaskRows(rows);
  }

  const rows: GanttRenderRow[] = [];
  ganttSections.value.forEach((section) => {
    appendSection(rows, section);
  });
  return filterCompletedTaskRows(rows);
});

const visibleRenderRows = computed<Array<{ row: GanttRenderRow; rowIndex: number }>>(() => {
  const rows = renderRows.value;
  if (rows.length === 0) return [];

  const viewportHeight = shellHeight.value || GANTT_ROW_HEIGHT * 16;
  const rawStart = Math.floor(Math.max(0, shellScrollTop.value - GANTT_ROW_HEIGHT * 2) / GANTT_ROW_HEIGHT);
  const start = Math.max(0, rawStart - VIRTUAL_ROW_OVERSCAN);
  const rawEnd = Math.ceil((shellScrollTop.value + viewportHeight + GANTT_ROW_HEIGHT * 2) / GANTT_ROW_HEIGHT);
  const end = Math.min(rows.length, rawEnd + VIRTUAL_ROW_OVERSCAN);

  return rows.slice(start, end).map((row, offset) => ({
    row,
    rowIndex: start + offset
  }));
});

function isGroupStart(rowIndex: number): boolean {
  if (props.groupMode === 'none') return false;
  return renderRows.value[rowIndex]?.kind === 'section';
}

function shouldOffsetGroupStart(rowIndex: number): boolean {
  return rowIndex > 0 && isGroupStart(rowIndex);
}

const renderGroups = computed<GanttRenderGroup[]>(() => {
  if (props.groupMode === 'none') return [];

  const rows = renderRows.value;
  const sectionIndexes: number[] = [];
  rows.forEach((row, index) => {
    if (row.kind === 'section') {
      sectionIndexes.push(index);
    }
  });

  const groups: GanttRenderGroup[] = [];
  sectionIndexes.forEach((sectionIndex, sectionPosition) => {
    const row = rows[sectionIndex];
    if (!row || row.kind !== 'section') return;
    const endIndex = sectionIndexes[sectionPosition + 1] ?? rows.length;
    const shouldOffset = sectionIndex > 0;
    let unscheduledToggleIndex = -1;
    for (let index = sectionIndex + 1; index < endIndex; index += 1) {
      if (rows[index].kind === 'unscheduled-toggle') {
        unscheduledToggleIndex = index;
        break;
      }
    }
    const markerStartIndex = sectionIndex;
    const markerEndIndex = unscheduledToggleIndex === -1 ? endIndex : unscheduledToggleIndex + 1;
    const markerRowSpan = Math.max(0, markerEndIndex - markerStartIndex);
    const deadlineStyle = row.deadlineStyle
      ? {
        ...row.deadlineStyle,
        gridRow: `${markerStartIndex + 2} / span ${markerRowSpan}`
      }
      : null;
    groups.push({
      key: `group-panel:${row.sectionId}`,
      sectionId: getGoalSectionIdForRenderRow(row) || '',
      startRow: sectionIndex + 2,
      rowSpan: Math.max(1, endIndex - sectionIndex),
      offsetTop: shouldOffset,
      deadlineStyle: markerRowSpan > 0 ? deadlineStyle : null,
      deadlineTitle: row.deadlineTitle
    });
  });
  return groups;
});

const visibleRenderGroups = computed(() => {
  const visibleRows = visibleRenderRows.value;
  if (visibleRows.length === 0) return [];

  const firstVisibleIndex = visibleRows[0].rowIndex;
  const lastVisibleIndex = visibleRows[visibleRows.length - 1].rowIndex + 1;
  return renderGroups.value.filter(group => {
    const groupStartIndex = group.startRow - 2;
    const groupEndIndex = groupStartIndex + group.rowSpan;
    return groupStartIndex < lastVisibleIndex && groupEndIndex > firstVisibleIndex;
  });
});

const ganttGridMinHeight = computed(() => Math.max(
  (renderRows.value.length + 1) * GANTT_ROW_HEIGHT,
  Math.max(0, shellHeight.value - GANTT_TOOLBAR_HEIGHT)
));
const ganttTimelineBodyHeight = computed(() => Math.max(0, ganttGridMinHeight.value - GANTT_ROW_HEIGHT));
const gridStyle = computed(() => ({
  gridTemplateColumns: `0px repeat(${timelineDayCount.value}, ${effectiveDayColumnWidth.value}px)`,
  '--gantt-sidebar-width': `${labelColumnWidth.value}px`,
  minHeight: `${ganttGridMinHeight.value}px`
}));
const timelineHeaderStyle = computed(() => ({
  gridTemplateColumns: `repeat(${timelineDayCount.value}, ${effectiveDayColumnWidth.value}px)`,
  transform: `translateX(-${timelineScrollLeft.value}px)`
}));
</script>

<style scoped>
.gantt-view {
  --gantt-toolbar-height: 41px;
  --gantt-header-height: 42px;
  --gantt-header-chip-offset: 6px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--b3-theme-background);
}

.gantt-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 260px;
  color: var(--b3-theme-on-surface-light);
  font-size: 14px;
}

.gantt-shell {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.gantt-body {
  display: flex;
  min-width: 0;
  min-height: calc(100% - var(--gantt-toolbar-height));
}

.gantt-sidebar {
  position: relative;
  z-index: 2;
  isolation: isolate;
  display: grid;
  flex: 0 0 var(--gantt-sidebar-width);
  grid-auto-rows: 42px;
  min-width: 0;
  background: var(--b3-theme-background);
}

.gantt-sidebar::after {
  content: '';
  position: absolute;
  top: 0;
  right: -2px;
  bottom: 0;
  width: 2px;
  background: color-mix(in srgb, var(--b3-theme-on-background) 10%, var(--b3-theme-background));
  pointer-events: none;
  transition: background-color 0.15s ease, box-shadow 0.15s ease;
}

.gantt-sidebar.is-resize-ready,
.gantt-sidebar.is-resize-ready * {
  cursor: col-resize !important;
}

.gantt-sidebar.is-resize-ready::after {
  background: var(--b3-theme-primary);
}

.gantt-sidebar-header {
  position: sticky;
  top: var(--gantt-toolbar-height);
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  grid-row: 1;
  padding: 0 8px;
  border-bottom: 1px solid color-mix(in srgb, var(--b3-theme-on-background) 30%, var(--b3-theme-background));
  background: var(--b3-theme-background);
  box-sizing: border-box;
}

.gantt-completed-toggle-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--b3-theme-on-surface);
  cursor: pointer;
}

.gantt-completed-toggle-btn:hover,
.gantt-completed-toggle-btn.active {
  background: var(--b3-list-hover);
}

.gantt-sidebar .gantt-row-label {
  position: relative;
  left: auto;
  width: auto;
  grid-column: 1;
}

.gantt-sidebar.has-document-milestones .gantt-row-label {
  padding-left: 42px;
}
.gantt-sidebar.has-document-milestones .gantt-section-label{
  padding-left: 36px;
}

.gantt-sidebar .gantt-sidebar-resizer {
  display: block;
  position: absolute;
  top: 0;
  right: -8px;
  bottom: 0;
  left: auto;
  width: 16px;
  height: auto !important;
  margin: 0;
  z-index: 101;
  pointer-events: auto;
  background: transparent;
}

.gantt-timeline-scroll {
  min-width: 0;
  overflow-x: auto;
  overflow-y: clip;
  scrollbar-width: none;
}

.gantt-timeline-scroll::-webkit-scrollbar {
  height: 0;
}

.gantt-horizontal-scrollbar {
  position: sticky;
  bottom: 0;
  z-index: 4;
  height: 14px;
  margin-top: -14px;
  overflow-x: auto;
  overflow-y: hidden;
}

.gantt-horizontal-scrollbar > div {
  height: 1px;
}

.gantt-timeline-column {
  flex: 1 1 auto;
  min-width: 0;
}

.gantt-timeline-header {
  position: sticky;
  top: var(--gantt-toolbar-height);
  z-index: 3;
  height: var(--gantt-header-height);
  overflow: hidden;
  background: var(--b3-theme-background);
  border-bottom: 1px solid color-mix(in srgb, var(--b3-theme-on-background) 30%, var(--b3-theme-background));
  box-sizing: border-box;
}

.gantt-timeline-header-grid {
  display: grid;
  min-width: max-content;
  height: 100%;
  will-change: transform;
}

.gantt-timeline-header .gantt-day-header {
  position: relative;
  top: auto;
  z-index: 1;
}

.gantt-range-nav {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
}

.gantt-toolbar {
  position: sticky;
  top: 0;
  left: 0;
  z-index: 4;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  height: var(--gantt-toolbar-height);
  padding: 4px 10px;
  background: linear-gradient(var(--b3-list-hover), var(--b3-list-hover)), var(--b3-theme-background);
  box-sizing: border-box;
}

.gantt-toolbar-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.gantt-range-options {
  display: flex;
  align-items: center;
  gap: 2px;
}

.gantt-task-search {
  display: flex;
  align-items: center;
  gap: 6px;
  width: min(260px, 45vw);
  height: 30px;
  padding: 0 8px;
  border-radius: 5px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-surface-light);
  box-sizing: border-box;
}

.gantt-task-search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--b3-theme-on-background);
  font-size: 13px;
}

.gantt-search-clear {
  width: 18px;
  height: 18px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--b3-theme-on-surface-light);
  font-size: 18px;
  line-height: 18px;
  cursor: pointer;
}

.gantt-search-clear:hover {
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
}

.gantt-nav-btn,
.gantt-today-btn,
.gantt-range-option-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--b3-theme-on-background);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.gantt-nav-btn {
  width: 30px;
  padding: 0;
}

.gantt-today-btn {
  padding: 0 6px;
  font-weight: 600;
}

.gantt-range-option-btn {
  padding: 0 7px;
  font-size: 13px;
}

.gantt-nav-btn:hover,
.gantt-today-btn:hover,
.gantt-range-option-btn:hover,
.gantt-range-option-btn.active {
  background: var(--b3-theme-background);
  box-shadow: var(--pinch-shadow);
}

.gantt-grid {
  position: relative;
  display: grid;
  grid-auto-rows: 42px;
  align-content: start;
  min-width: 100%;
  margin-top: calc(-1 * var(--gantt-header-height));
}

.gantt-group-panel {
  position: relative;
  z-index: 0;
  background: var(--b3-theme-background);
  pointer-events: none;
}

.gantt-group-panel.goal-drop-target {
  background: color-mix(in srgb, var(--b3-theme-primary) 8%, var(--b3-theme-background));
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--b3-theme-primary) 20%, transparent);
}

.gantt-weekend-column {
  position: relative;
  z-index: 1;
  align-self: start;
  background: color-mix(in srgb, var(--b3-list-hover) 60%, var(--b3-theme-background));
  pointer-events: none;
}

.gantt-day-column {
  position: relative;
  z-index: 1;
  align-self: start;
  box-sizing: border-box;
  pointer-events: none;
  box-shadow: inset -1px 0 color-mix(in srgb, var(--b3-theme-on-background) 10%, var(--b3-theme-background));
}

.gantt-day-column.month-start,
.gantt-day-header.month-start {
  border-left: 2px solid color-mix(in srgb, var(--b3-theme-on-background) 10%, var(--b3-theme-background));
}

.gantt-today-column {
  position: relative;
  z-index: 1;
  align-self: start;
  pointer-events: none;
}

.gantt-today-column::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: var(--gantt-today-position, 50%);
  width: 2px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: #f98f7a;
  opacity: 0.8;
  transition: left 60s linear;
}

.gantt-weekend-column,
.gantt-today-column {
  box-shadow: inset -1px 0 color-mix(in srgb, var(--b3-theme-on-background) 10%, var(--b3-theme-background));
}

.gantt-virtual-spacer {
  visibility: hidden;
  pointer-events: none;
}

.gantt-corner,
.gantt-day-header {
  position: sticky;
  background: var(--b3-theme-background);
}

.gantt-header-row-bg {
  position: sticky;
  top: var(--gantt-toolbar-height);
  z-index: 3;
  height: var(--gantt-header-height);
  background: var(--b3-theme-background);
  pointer-events: none;
}

.gantt-corner {
  top: var(--gantt-toolbar-height);
  left: 0;
  z-index: 8;
  background: transparent;
  box-sizing: border-box;
}

.gantt-grid > .gantt-row-label,
.gantt-grid > .gantt-unscheduled-control-row-divider,
.gantt-grid > .gantt-sidebar-panel,
.gantt-grid > .gantt-sidebar-resizer,
.gantt-grid > .gantt-corner,
.gantt-grid > .gantt-header-row-bg,
.gantt-grid > .gantt-header-row-border,
.gantt-grid > .gantt-day-header {
  display: none;
}

.gantt-sidebar-panel {
  position: sticky;
  left: 0;
  z-index: 7;
  align-self: start;
  width: var(--gantt-sidebar-width);
  min-width: var(--gantt-sidebar-width);
  box-sizing: border-box;
  background: var(--b3-theme-background);
  box-shadow: 0 -6px 12px 0px color-mix(in srgb, var(--b3-theme-on-background) 15%, transparent);
  pointer-events: none;
}

.gantt-sidebar-resizer {
  position: sticky;
  left: 0;
  z-index: 9;
  align-self: start;
  justify-self: end;
  width: 10px;
  margin-right: -5px;
  cursor: col-resize;
  touch-action: none;
}

.gantt-sidebar-resizer::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 7px;
  width: 2px;
  border-radius: 999px;
  background: transparent;
  transition: background-color 0.15s ease;
}

.gantt-sidebar-resizer:hover::after {
  background: color-mix(in srgb, var(--b3-theme-primary) 55%, transparent);
}

.gantt-header-row-border {
  position: sticky;
  top: calc(var(--gantt-toolbar-height) + var(--gantt-header-height) - 1px);
  z-index: 7;
  align-self: end;
  height: 1px;
  background: var(--b3-theme-on-background);
  pointer-events: none;
  opacity: 0.3;
}

.gantt-day-header {
  top: var(--gantt-toolbar-height);
  z-index: 5;
  display: grid;
  grid-template-columns: max-content max-content;
  grid-template-rows: 20px 22px;
  justify-content: start;
  align-items: center;
  align-self: stretch;
  justify-self: stretch;
  height: var(--gantt-header-height);
  column-gap: 4px;
  padding: 0 6px;
  color: var(--b3-theme-on-surface-light);
  font-size: 11px;
  line-height: 1.1;
  box-sizing: border-box;
}

.gantt-day-month {
  position: absolute;
  top: 0;
  left: 6px;
  width: max-content;
  padding: 0;
  color: var(--b3-theme-on-background);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  white-space: nowrap;
}

.gantt-day-header.month-start {
  z-index: 10;
}

.gantt-day-weekday {
  grid-column: 1;
  grid-row: 2;
  justify-self: start;
}

.gantt-day-date {
  display: inline-flex;
  grid-column: 2;
  grid-row: 2;
  align-items: center;
  justify-content: center;
  justify-self: start;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  color: var(--b3-theme-on-background);
  font-size: 11px;
  line-height: 18px;
}

.gantt-day-header.weekend {
  background: color-mix(in srgb, var(--b3-list-hover) 60%, var(--b3-theme-background));
}


.gantt-day-header.today .gantt-day-date {
  color: var(--b3-theme-background);
  background: var(--b3-theme-on-background);
}

.gantt-day-header.today {
  z-index: 12;
}

.gantt-day-header.today::after {
  content: '';
  position: absolute;
  top: 24px;
  bottom: 0;
  left: var(--gantt-today-position, 50%);
  width: 2px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: #f98f7a;
  opacity: 0.8;
  transition: left 60s linear;
}

.gantt-today-marker {
  position: absolute;
  top: 2px;
  left: var(--gantt-today-position, 50%);
  z-index: 11;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 18px;
  padding: 0 6px;
  transform: translateX(-50%);
  border-radius: 10px;
  background: #f98f7a;
  color: var(--b3-theme-background);
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  pointer-events: none;
  transition: left 60s linear;
}

.gantt-today-marker::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 50%;
  width: 8px;
  height: 8px;
  transform: translateX(-50%) rotate(45deg);
  background: #f98f7a;
}
.gantt-row-label {
  position: sticky;
  left: 0;
  z-index: 8;
  --gantt-row-label-base-bg: var(--b3-theme-background);
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 0 14px;
  border: 0;
  border-right: 0;
  background: var(--gantt-row-label-base-bg);
  color: var(--b3-theme-on-background);
  text-align: left;
  cursor: default;
  box-sizing: border-box;
}

.gantt-document-milestone-rail {
  position: relative;
  z-index: 9;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  cursor: grab;
}

.gantt-document-milestone-rail:active {
  cursor: grabbing;
}

.gantt-document-milestone-rail.is-dragging .gantt-document-milestone {
  opacity: 0.45;
  transform: scale(0.92);
}

.gantt-document-milestone-rail.is-drop-target .gantt-document-milestone {
  color: var(--b3-theme-primary);
  background: color-mix(in srgb, var(--b3-theme-primary) 12%, var(--b3-theme-background));
  transform: scale(1.15);
  box-shadow: var(--pinch-shadow), 0 0 5px color-mix(in srgb, var(--b3-theme-primary) 55%, transparent);
}

.gantt-document-milestone-rail.has-guide::after {
  content: '';
  position: absolute;
  top: calc(50% + 17px);
  left: 21px;
  width: 2px;
  height: max(0px, var(--gantt-milestone-guide-height));
  background: color-mix(in srgb, var(--b3-border-color) 75%, var(--b3-theme-background));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--b3-theme-background) 70%, transparent);
  pointer-events: none;
}

.gantt-document-milestone {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin: -4px 0;
  color: var(--b3-theme-on-background);
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  background: var(--b3-theme-background);
  border-radius: 50%;
  box-shadow: var(--pinch-shadow);
}


.gantt-row-label:hover {
  background: linear-gradient(var(--b3-list-hover), var(--b3-list-hover)), var(--gantt-row-label-base-bg);
}

.gantt-row-label.is-row-hovered:not(.goal-drop-target) {
  background: linear-gradient(var(--b3-list-hover), var(--b3-list-hover)), var(--gantt-row-label-base-bg);
}

.gantt-row-label.goal-drop-target {
  background: color-mix(in srgb, var(--b3-theme-primary) 14%, var(--b3-theme-background));
  box-shadow: inset 3px 0 0 color-mix(in srgb, var(--b3-theme-primary) 68%, transparent);
}

.gantt-row-label[draggable='true'] {
  cursor: grab;
}

.gantt-row-label[draggable='true']:active {
  cursor: grabbing;
}

.gantt-row-label .task-card-action-btn {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 26px;
  padding: 0;
  margin-left: auto;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--b3-theme-on-background);
  cursor: pointer;
  opacity: 0.35;
  transition: opacity 0.2s, background-color 0.2s, transform 0.2s;
}

.gantt-row-label:hover .task-card-action-btn {
  opacity: 1;
}

.gantt-row-label.is-row-hovered .task-card-action-btn {
  opacity: 1;
}

.gantt-row-label .task-card-action-btn:hover {
  background: var(--b3-list-hover);
}

.gantt-row-label .task-card-open-btn svg {
  width: 14px;
  height: 14px;
  fill: currentColor;
}

.gantt-row-repeat-badge {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-left: auto;
  border-radius: 6px;
  color: var(--b3-theme-primary);
  background: color-mix(in srgb, var(--b3-theme-primary) 12%, var(--b3-theme-background));
}

.gantt-row-repeat-badge + .task-card-action-btn {
  margin-left: 0;
}

.gantt-row-checkbox-wrapper {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.gantt-unscheduled-row-label {
  color: var(--b3-theme-on-surface-light);
}

.gantt-unscheduled-control-row {
  position: sticky;
  left: 0;
  z-index: 8;
  width: 100%;
  border-right: 0;
  border-top: 0;
  border-right: 0;
  padding: 6px;
  background: var(--b3-theme-background);
  cursor: pointer;
}

.gantt-unscheduled-control-row:hover {
  background: var(--b3-theme-background);
}

.gantt-unscheduled-control-row-divider {
  position: relative;
  z-index: 3;
  align-self: stretch;
  pointer-events: none;
}

.gantt-unscheduled-control-inner {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
  height: 30px;
  padding: 0 8px;
  border-radius: 6px;
  background: var(--b3-list-hover);
  box-sizing: border-box;
}

.gantt-unscheduled-control-row:hover .gantt-unscheduled-control-inner {
  background: var(--b3-list-hover);
}

.gantt-unscheduled-control-row.is-row-hovered .gantt-unscheduled-control-inner {
  background: var(--b3-list-hover);
}

.gantt-unscheduled-control-row .collapse-btn {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  color: var(--b3-theme-on-surface-light);
}

.gantt-unscheduled-control-row:hover .collapse-btn {
  background: var(--b3-theme-surface-lighter);
  color: var(--b3-theme-on-background);
}

.gantt-unscheduled-control-row.is-row-hovered .collapse-btn {
  background: var(--b3-theme-surface-lighter);
  color: var(--b3-theme-on-background);
}

.gantt-empty-label {
  cursor: default;
  color: var(--b3-theme-on-surface-light);
  font-size: 13px;
}

.gantt-empty-label:hover {
  background: var(--b3-theme-background);
}

.gantt-section-label {
  --gantt-row-label-base-bg: var(--b3-list-hover);
  margin: 6px;
  padding: 0 12px 0 8px;
  border-radius: 10px;
  gap: 8px;
  cursor: pointer;
  font-weight: 600;
  color: var(--b3-theme-on-background);
}

.gantt-section-label:hover {
  background: var(--gantt-row-label-base-bg);
}

.gantt-section-label.is-row-hovered:not(.goal-drop-target) {
  background: linear-gradient(var(--b3-list-hover), var(--b3-list-hover)), var(--gantt-row-label-base-bg);
}

.gantt-section-add-task-btn {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  margin-left: auto;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--b3-theme-on-surface-light);
  cursor: pointer;
}

.gantt-section-add-task-btn:hover {
  background: var(--b3-theme-surface-lighter);
  color: var(--b3-theme-primary);
}

.gantt-section-icon {
  flex: 0 0 auto;
  width: 18px;
  text-align: center;
}

.gantt-section-toggle {
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.16s ease;
}

.gantt-section-label.collapsed .gantt-section-toggle {
  transform: rotate(-90deg);
}

.gantt-section-toggle svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.gantt-section-count {
  flex: 0 0 auto;
  min-width: 22px;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-surface-light);
  font-size: 11px;
  font-weight: 500;
  line-height: 18px;
  text-align: center;
}

.gantt-section-count.is-progress {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  padding: 0;
  background: transparent;
  color: var(--b3-theme-on-background);
  font-size: 11px;
  font-weight: 500;
}

.gantt-section-count.is-progress.overdue {
  color: var(--pinch-font-color10);
}

.gantt-section-count.is-progress.risk:not(.completed) {
  color: var(--pinch-font-color6);
}

.gantt-section-count.is-progress.completed {
  color: var(--pinch-font-color5);
}

.gantt-section-progress-text {
  flex: 0 0 auto;
  line-height: 18px;
}

.gantt-section-progress-ring {
  flex: 0 0 auto;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background:
    radial-gradient(circle closest-side, var(--b3-theme-background) 62%, transparent 64%),
    conic-gradient(currentColor var(--gantt-section-progress, 0%), color-mix(in srgb, currentColor 18%, transparent) 0);
}

.gantt-section-label .goal-due-date-info {
  flex: 0 0 auto;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgb(42 147 106 / 0.08);
  color: #256e53;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.2;
}

.gantt-section-label .goal-due-date-info.is-overdue {
  background: rgb(237 97 84 / 0.1);
  color: #c24d3f;
}

.gantt-row-title,
.gantt-bar-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gantt-row-title-btn {
  flex: 1 1 auto;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.gantt-row-title-btn:hover {
  color: var(--b3-theme-primary);
}

.gantt-task-title-content :deep(*) {
  display: inline;
  white-space: nowrap;
}

.gantt-task-title-content :deep([data-type~="a"]) {
  border-bottom: 1px solid currentColor;
}

.gantt-task-title-content :deep(br) {
  display: none;
}

.gantt-day-cell {
  position: relative;
  z-index: 2;
  background: transparent;
}

.gantt-day-cell.today {
  background: transparent;
}

.gantt-day-cell.drop-target {
  background: color-mix(in srgb, var(--b3-theme-primary) 16%, var(--b3-theme-background));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--b3-theme-primary) 32%, transparent);
}

.gantt-day-cell.goal-drop-target {
  background: color-mix(in srgb, var(--b3-theme-primary) 10%, var(--b3-theme-background));
}

.gantt-day-cell.drop-target.goal-drop-target {
  background: color-mix(in srgb, var(--b3-theme-primary) 18%, var(--b3-theme-background));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--b3-theme-primary) 42%, transparent);
}

.gantt-day-cell.section {
  box-shadow: none;;
}


.gantt-day-cell.is-row-hovered:not(.drop-target):not(.goal-drop-target) {
  background: var(--b3-list-hover);
}

.gantt-day-cell.weekend.is-row-hovered:not(.drop-target):not(.goal-drop-target) {
  background: var(--b3-list-hover);
}

.gantt-day-cell.today.is-row-hovered:not(.drop-target):not(.goal-drop-target) {
  background: var(--b3-list-hover);
}

.gantt-day-cell.section.is-row-hovered:not(.drop-target):not(.goal-drop-target) {
  background: transparent;
}

.gantt-deadline-marker {
  position: relative;
  z-index: 2;
  align-self: stretch;
  justify-self: end;
  width: 2px;
  margin-right: -1px;
  background: #dc2626;
  box-shadow: 0 0 0 1px rgb(220 38 38 / 0.18);
  pointer-events: none;
}

.gantt-summary-bar {
  z-index: 1;
  position: relative;
  align-self: center;
  --gantt-summary-bg-color: color-mix(in srgb, var(--b3-theme-primary) 8%, var(--b3-theme-background));
  --gantt-summary-stripe-color: color-mix(in srgb, var(--b3-theme-primary) 20%, var(--b3-theme-background));
  --gantt-summary-fill-color: color-mix(in srgb, var(--b3-theme-primary) 52%, var(--b3-theme-background));
  min-width: 48px;
  height: 26px;
  margin: 0 3px;
  padding: 0 7px;
  border: 1px solid color-mix(in srgb, var(--b3-theme-primary) 28%, var(--b3-theme-background));
  border-radius: 6px;
  background: repeating-linear-gradient(
    -45deg,
    var(--gantt-summary-bg-color) 0,
    var(--gantt-summary-bg-color) 8px,
    var(--gantt-summary-stripe-color) 8px,
    var(--gantt-summary-stripe-color) 10px
  );
  color: var(--b3-theme-on-background);
  font-size: 11px;
  font-weight: 600;
  line-height: 26px;
  overflow: hidden;
  pointer-events: auto;
}

.gantt-summary-bar.goal-drop-target {
  border-color: color-mix(in srgb, var(--b3-theme-primary) 54%, var(--b3-theme-background));
}

.gantt-summary-bar.dragging-due-date {
  z-index: 25;
}

.gantt-summary-bar.overdue {
  border-color: color-mix(in srgb, #f98f7a 48%, transparent);
  color: var(--pinch-font-color10);
  --gantt-summary-bg-color: color-mix(in srgb, #f98f7a 10%, var(--b3-theme-background));
  --gantt-summary-stripe-color: color-mix(in srgb, #f98f7a 24%, var(--b3-theme-background));
  --gantt-summary-fill-color: color-mix(in srgb, #f98f7a 62%, var(--b3-theme-background));
}

.gantt-summary-bar.risk:not(.completed) {
  border-color: color-mix(in srgb, var(--pinch-color6) 20%, transparent);
  color: var(--pinch-font-color6);
  --gantt-summary-bg-color: color-mix(in srgb, var(--pinch-color6) 8%, var(--b3-theme-background));
  --gantt-summary-stripe-color: color-mix(in srgb, var(--pinch-color6) 20%, var(--b3-theme-background));
  --gantt-summary-fill-color: color-mix(in srgb, var(--pinch-color6) 58%, var(--b3-theme-background));
}

.gantt-summary-bar.completed {
  border-color: color-mix(in srgb, var(--pinch-background5-color) 48%, transparent);
  color: var(--pinch-font-color5);
  --gantt-summary-bg-color: color-mix(in srgb, var(--pinch-background5-color) 10%, var(--b3-theme-background));
  --gantt-summary-stripe-color: color-mix(in srgb, var(--pinch-background5-color) 24%, var(--b3-theme-background));
  --gantt-summary-fill-color: color-mix(in srgb, var(--pinch-background5-color) 68%, var(--b3-theme-background));
}

.gantt-summary-bar-fill {
  position: absolute;
  inset: 2px auto 2px 2px;
  width: var(--gantt-summary-progress, 0%);
  max-width: calc(100% - 4px);
  min-width: 0;
  border-radius: 4px;
  background: var(--gantt-summary-fill-color);
  transition: width 0.18s ease;
  pointer-events: none;
}

.gantt-summary-bar-title {
  position: relative;
  z-index: 1;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}

.gantt-summary-due-handle {
  position: absolute;
  top: -3px;
  right: -7px;
  bottom: -3px;
  z-index: 4;
  width: 14px;
  padding: 0;
  border: 0;
  border-radius: 3px;
  background: transparent;
  cursor: col-resize;
}

.gantt-summary-due-handle::after {
  display: none;
  content: '';
  position: absolute;
  top: 50%;
  right: 4px;
  width: 8px;
  height: 22px;
  border-radius: 999px;
  transform: translateY(-50%);
  background: color-mix(in srgb, var(--gantt-summary-fill-color) 72%, white 28%);
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.18);
}

.gantt-summary-bar:hover .gantt-summary-due-handle::after,
.gantt-summary-due-handle.handle-dragging::after {
  display: block;
}

.gantt-bar {
  z-index: 2;
  display: flex;
  align-items: center;
  align-self: center;
  min-width: 28px;
  height: 24px;
  margin: 0 3px;
  padding: 0 9px 0 14px;
  border: 0;
  border-radius: 6px;
  background: var(--pinch-background7);
  color: var(--b3-theme-on-background);
  font-size: 12px;
  line-height: 1;
  text-align: left;
  cursor: grab;
  position: relative;
  overflow: hidden;
  transition: background-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
  user-select: none;
}

.gantt-bar .task-checkbox-wrapper {
  position: relative;
  z-index: 2;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  margin: 0 4px 0 0;
  cursor: pointer;
}

.gantt-bar::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 4px;
  bottom: 4px;
  width: 4px;
  border-radius: 999px;
  background: var(--pinch-task-chip-color, var(--pinch-color6));
  pointer-events: none;
}

.gantt-bar:hover,
.gantt-bar.dragging {
  box-shadow: 0 0 0 2px var(--pinch-task-chip-color, var(--pinch-color6));
  z-index: 25;
}

.gantt-bar:active,
.gantt-bar.dragging {
  cursor: grabbing;
}

.gantt-bar.dragging {
  transform: translateY(-1px);
}

.gantt-drop-preview {
  opacity: 0.72;
  pointer-events: none;
  border: 1px dashed var(--pinch-task-chip-color, var(--pinch-color6));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--pinch-task-chip-color, var(--pinch-color6)) 24%, transparent);
}

.gantt-bar.risk:not(.completed) {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pinch-background10-color) 62%, transparent);
}

.gantt-bar.risk:not(.completed)::after {
  content: '';
  position: absolute;
  top: 4px;
  right: 5px;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--pinch-background10);
}

.gantt-bar.completed {
  opacity: 0.6;
}

.gantt-bar-title {
  display: block;
  flex: 1 1 auto;
  min-width: 0;
  align-items: center;
  max-width: 100%;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gantt-task-handle {
  position: absolute;
  top: -3px;
  bottom: -3px;
  width: 14px;
  cursor: col-resize;
  z-index: 20;
  border-radius: 2px;
}

.gantt-task-handle::after {
  display: none;
  content: '';
  position: absolute;
  top: 50%;
  width: 8px;
  height: 22px;
  border-radius: 999px;
  transform: translateY(-50%);
  background: color-mix(in srgb, var(--pinch-task-chip-color, var(--pinch-color6)) 72%, white 28%);
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.18);
}

.gantt-task-handle-left {
  left: -7px;
}

.gantt-task-handle-left::after {
  left: 4px;
}

.gantt-task-handle-right {
  right: -7px;
}

.gantt-task-handle-right::after {
  right: 4px;
}

.gantt-bar:hover .gantt-task-handle::after,
.gantt-task-handle.handle-dragging::after {
  display: block;
}
</style>
