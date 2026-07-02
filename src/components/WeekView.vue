<template>
  <div
    class="week-view"
    :class="{
      'mobile-week-grid-mode': isMobileWeekGridMode,
      'mobile-day-view-mode': isMobileDayViewMode,
      'mobile-three-day-view-mode': isMobileThreeDayViewMode
    }"
  >
    <div class="calendar-toolbar">
      <div v-if="calendarViewOptions.length > 0" class="calendar-view-switcher">
        <button
          v-for="option in calendarViewOptions"
          :key="option.value"
          type="button"
          class="calendar-view-switcher-btn ariaLabel"
          :class="{ active: currentCalendarView === option.value }"
         
          :aria-label="option.title"
          @click="emit('calendarViewChange', option.value)"
        >
          {{ option.label }}
        </button>
      </div>
      <div class="calendar-header">
        <button class="nav-btn ariaLabel" :aria-label="previousNavLabel" @click="previousWeek">
          <Icon name="chevronLeft" width="20" height="20" />
        </button>
        <div class="header-center">
          <div class="header-title">{{ displayWeekTitle }}</div>
          <button class="today-btn" @click="goToToday">{{ t('weekView.today') }}</button>
        </div>
        <div class="header-right">
          <button class="nav-btn ariaLabel" :aria-label="nextNavLabel" @click="nextWeek">
            <Icon name="chevronRight" width="20" height="20" />
          </button>
          <div v-if="showHeaderDaysSwitcher" class="all-day-label-cell header-days-switcher">
            <button class="days-control-btn" @click="decreaseDays" :disabled="isDaysCountLocked || daysCount <= minimumDaysCount">-</button>
            <span class="days-count">{{ daysCount }}</span>
            <button class="days-control-btn" @click="increaseDays" :disabled="isDaysCountLocked || daysCount >= CALENDAR_CONSTANTS.LAYOUT.MAX_DAYS">+</button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="week-body">
      <div v-if="isMobileWeekGridMode" class="mobile-week-grid">
        <div class="mobile-week-cell mobile-month-cell">
          <div class="mobile-cell-header mobile-month-header">
            <span class="mobile-cell-title">{{ t('weekView.monthCalendar') }}</span>
            <span class="mobile-cell-date">{{ mobileCalendarTitle }}</span>
          </div>
          <div class="mobile-mini-calendar">
            <div class="mobile-mini-weekdays">
              <span v-for="label in mobileMiniWeekdayLabels" :key="label" class="mobile-mini-weekday">{{ label }}</span>
            </div>
            <div class="mobile-mini-days">
              <button
                v-for="day in mobileMiniCalendarDays"
                :key="day.key"
                type="button"
                class="mobile-mini-day"
                :class="{
                  'is-other-month': !day.isCurrentMonth,
                  'is-today': day.isToday,
                  'is-in-week': day.isInCurrentWeek
                }"
                @click="focusMobileWeek(day.date)"
              >
                {{ day.dayNumber }}
              </button>
            </div>
          </div>
        </div>
        <div
          v-for="day in mobileWeekDays"
          :key="day.key"
          class="mobile-week-cell mobile-day-cell"
          :class="{
            today: day.isToday,
            'drag-over': dragState.overDay === day.key || dragState.overAllDayColumn === day.key
          }"
          :data-day-key="day.key"
        >
          <div class="mobile-cell-header">
            <span class="mobile-cell-title">{{ day.weekdayName }}</span>
            <span class="mobile-cell-date">{{ day.dayNumber }}</span>
          </div>
          <div class="mobile-chip-list">
            <div
              v-for="task in getMobileDayTasks(day.key)"
              :key="task.id"
              class="mobile-task-chip ariaLabel"
              :aria-label="getTaskDisplayTitle(task)"
              :class="[
                `priority-${task.priority}`,
                {
                  'task-completed': task.status === 'completed',
                  'habit-task-chip': isHabitTaskChip(task)
                }
              ]"
              :style="getMobileTaskChipStyle(task)"
              @click="handleTaskClick(task, $event)"
              @pointerdown="!isHabitTaskChip(task) && handleMobileTaskPointerDown($event, task)"
              @pointermove="handleMobileTaskPointerMove"
              @pointerup="handleMobileTaskPointerUp"
              @pointercancel="handleMobileTaskPointerCancel"
              @contextmenu="!isHabitTaskChip(task) && handleContextMenu($event, task)"
            >
              <span class="task-checkbox-wrapper" @click.stop="toggleTaskStatus(task)">
                <TaskCheckbox :checked="task.status === 'completed'" :size="12" />
              </span>
              <span v-if="isHabitTaskChip(task) && task.icon" class="habit-emoji">{{ task.icon }}</span>
              <span class="mobile-task-chip-title">{{ getTaskDisplayTitle(task) }}</span>
              <span
                v-if="!isHabitTaskChip(task) && task.priority !== 'none'"
                class="task-priority-badge ariaLabel"
                :class="`priority-${task.priority}`"
                :aria-label="getPriorityTitle(task.priority)"
              >
                <Icon name="flag" width="10" height="10" />
              </span>
              <span
                v-if="!isHabitTaskChip(task)"
                class="task-jump-btn"
                @mousedown.stop
                @click.stop="handleTaskOpenClick(task, $event)"
              >
                <Icon name="open" width="14" height="14" />
              </span>
            </div>
            <div v-if="getMobileDayTasks(day.key).length === 0" class="mobile-empty-tip">{{ t('taskManager.noTasks') }}</div>
          </div>
        </div>
      </div>
      <div v-else class="week-grid">
        <div v-if="isMobileDayViewMode" class="mobile-day-weekdates">
          <button
            v-for="day in mobileDayWeekDates"
            :key="day.key"
            type="button"
            class="mobile-day-weekdate-item"
            :class="{
              'is-today': day.isToday,
              'is-active': day.isActive
            }"
            @click="focusMobileDay(day.date)"
          >
            <span class="mobile-day-weekdate-name">{{ day.weekdayName }}</span>
            <span class="mobile-day-weekdate-number">{{ day.dayNumber }}</span>
          </button>
        </div>
        <div v-else class="weekday-header">
          <div class="all-day-label-cell">
            <span class="all-day-label-text">{{ t('weekView.allDay') }}</span>
          </div>
          <button
            v-for="day in weekDays"
            :key="day.key"
            type="button"
            class="weekday-cell"
            :class="{ today: day.isToday }"
            @click="openLifelogTimeline(day.key)"
          >
            <div class="weekday-name">{{ day.weekdayName }}</div>
            <div class="day-number">{{ day.dayNumber }}</div>
          </button>
        </div>
        
        <div class="all-day-section" :style="{ height: isAllDaySectionCollapsed ? '30px' : allDaySectionHeight + 'px' }">
          <div class="all-day-label-in-section" @click="toggleAllDaySection">
            <span class="collapse-btn">
              <Icon
                :name="isAllDaySectionCollapsed ? 'chevronsVertical' : 'chevronsHorizontal'"
                width="16"
                height="16"
              />
            </span>
          </div>
          <div class="all-day-columns" :class="{ collapsed: isAllDaySectionCollapsed }" :style="{ overflow: isAllDaySectionCollapsed ? 'hidden' : 'visible' }">
            <div 
              v-for="(day, index) in weekDays" 
              :key="day.key"
              class="all-day-column"
              :data-day-key="day.key"
              :class="{
                today: day.isToday,
                'drag-over': dragState.overDay === day.key || dragState.overAllDayColumn === day.key,
                'create-selecting': isAllDayInCreateSelection(day.key),
                'last-column': index === weekDays.length - 1
              }"
              @mousedown.left="handleAllDayMouseDown(day, $event)"
              @mouseenter="handleAllDayMouseEnter(day)"
              @dragover.prevent="handleDragOver(day)"
              @dragleave="handleDragLeave"
              @drop="handleDrop(day)"
            >
            </div>
            
            <div class="all-day-tasks-layer">
              <div
                v-for="task in visibleTasks"
                :key="task.id"
                class="ariaLabel"
                :aria-label="getTaskDisplayTitle(task)"
                  :class="[
                    isHabitTaskChip(task) ? 'all-day-habit-task' : 'all-day-task',
                    !isHabitTaskChip(task) ? `priority-${task.priority}` : '',
                    { 'task-completed': task.status === 'completed' },
                    { 'mobile-selected': !isHabitTaskChip(task) && shouldShowMobileAllDayTaskControls(task.id) }
                  ]"
                :style="getAllDayTaskStyle(task)"
                @click="!isHabitTaskChip(task) && handleMobileAllDayTaskClick($event, task)"
                @pointerdown="!isHabitTaskChip(task) && handleMobileAllDayTaskPointerDown($event, task)"
                @pointermove="handleMobileAllDayTaskPointerMove"
                @pointerup="handleMobileAllDayTaskPointerUp"
                @pointercancel="handleMobileAllDayTaskPointerCancel"
                @contextmenu="!isHabitTaskChip(task) && handleContextMenu($event, task)"
              >
                <div 
                  v-if="!isHabitTaskChip(task)"
                  class="task-handle task-handle-left"
                  :class="{
                    'handle-dragging': draggingHandle?.task.id === task.id && draggingHandle?.type === 'start',
                    'mobile-visible': shouldShowMobileAllDayTaskControls(task.id)
                  }"
                  @mousedown="handleHandleMouseDown($event, task, 'start')"
                  @pointerdown.stop="handleMobileAllDayTaskHandlePointerDown($event, task, 'start')"
                ></div>
                <div 
                  class="task-chip-title"
                  :class="{ 'task-dragging': draggingTask?.task.id === task.id }"
                  @mousedown="!isHabitTaskChip(task) && handleTaskMouseDown($event, task)"
                >
                  <span
                    class="task-checkbox-wrapper"
                    @mousedown.stop
                    @click.stop="toggleTaskStatus(task)"
                  >
                    <TaskCheckbox :checked="task.status === 'completed'" :size="12" />
                  </span>
                  <span v-if="isHabitTaskChip(task) && task.icon" class="habit-emoji">{{ task.icon }}</span>
                  <span class="task-title-text" @click.stop="!isHabitTaskChip(task) && handleTaskClick(task, $event)">{{ getTaskDisplayTitle(task) }}</span>
                  <span
                    v-if="!isHabitTaskChip(task) && task.priority !== 'none'"
                    class="task-priority-badge ariaLabel"
                    :class="`priority-${task.priority}`"
                    :aria-label="getPriorityTitle(task.priority)"
                  >
                    <Icon name="flag" width="10" height="10" />
                  </span>
                  <span
                    v-if="!isHabitTaskChip(task)"
                    class="task-jump-btn"
                    @mousedown.stop
                    @click.stop="handleTaskOpenClick(task, $event)"
                  >
                    <Icon name="open" width="14" height="14" />
                  </span>
                </div>
                <div 
                  v-if="!isHabitTaskChip(task)"
                  class="task-handle task-handle-right"
                  :class="{
                    'handle-dragging': draggingHandle?.task.id === task.id && draggingHandle?.type === 'end',
                    'mobile-visible': shouldShowMobileAllDayTaskControls(task.id)
                  }"
                  @mousedown="handleHandleMouseDown($event, task, 'end')"
                  @pointerdown.stop="handleMobileAllDayTaskHandlePointerDown($event, task, 'end')"
                ></div>
              </div>
            </div>
          </div>
          
          <div 
            v-if="hiddenTasksCount > 0" 
            class="more-all-day"
            :class="{ collapsed: isAllDaySectionCollapsed }"
            :style="moreAllDayStyle"
          >
            <button
              type="button"
              class="more-all-day-pill ariaLabel"
             
              :aria-label="getHiddenTasksLabel(hiddenTasksCount)"
              @mousedown.stop
              @click.stop="showAllTasks"
            >
              +{{ hiddenTasksCount }}
            </button>
          </div>
          <div
            v-if="allDayExpandedPanelVisible"
            class="day-expanded-panel all-day-expanded-panel"
            :style="allDayExpandedPanelStyle"
            @mousedown.stop
            @click.stop
          >
            <div class="day-expanded-header">
              <span class="day-expanded-title">{{ t('weekView.allDayTasks') }}</span>
              <button
                type="button"
                class="day-expanded-close"
                @click.stop="hideAllDayExpandedPanel"
              >
                {{ t('monthView.collapse') }}
              </button>
            </div>
            <div class="day-expanded-list">
              <div
                v-for="task in allDayExpandedTasks"
                :key="`expanded-all-day-${task.id}`"
                class="day-expanded-chip ariaLabel"
                :aria-label="getTaskDisplayTitle(task)"
                :style="getExpandedAllDayChipStyle(task)"
                :class="{
                  'task-completed': task.status === 'completed',
                  'habit-task-chip': isHabitTaskChip(task)
                }"
                @pointerdown="!isHabitTaskChip(task) && handleMobileTaskPointerDown($event, task)"
                @pointermove="handleMobileTaskPointerMove"
                @pointerup="handleMobileTaskPointerUp"
                @pointercancel="handleMobileTaskPointerCancel"
                @click="!isHabitTaskChip(task) && handleTaskClick(task, $event)"
                @contextmenu="!isHabitTaskChip(task) && handleContextMenu($event, task)"
              >
                <span class="task-checkbox-wrapper" @click.stop="toggleTaskStatus(task)">
                  <TaskCheckbox :checked="task.status === 'completed'" :size="12" />
                </span>
                <span class="day-expanded-chip-title" @click.stop="!isHabitTaskChip(task) && handleTaskClick(task, $event)">
                  <span v-if="isHabitTaskChip(task) && task.icon" class="habit-emoji">{{ task.icon }}</span>
                  {{ getTaskDisplayTitle(task) }}
                </span>
              </div>
              <div v-if="allDayExpandedTasks.length === 0" class="day-expanded-empty">
                {{ t('taskManager.noTasks') }}
              </div>
            </div>
          </div>
        </div>
        
        <div ref="daysScrollRef" class="days-scroll">
          <div
            class="days-grid"
            :style="{ minHeight: isInactiveHoursCollapsed ? '912px' : '1152px' }"
          >
            <div
              class="time-labels-column"
              :style="{ height: isInactiveHoursCollapsed ? '912px' : '1152px' }"
            >

              <div
                class="inactive-hours-labels"
                :style="{ height: isInactiveHoursCollapsed ? '0px' : '240px' }"
              >
                <div v-for="hour in 5" :key="hour" v-show="!isInactiveHoursCollapsed" class="time-label" :style="{ top: (hour * 48) + 'px' }">
                  {{ formatHour(hour) }}
                </div>
              </div>

              <div
                class="inactive-hours-toggle-btn"
                :style="{ top: isInactiveHoursCollapsed ? '24px' : '264px' }"
                @click="toggleInactiveHours"
              >
                <Icon
                  :name="isInactiveHoursCollapsed ? 'chevronsVertical' : 'chevronsHorizontal'"
                  width="16"
                  height="16"
                />
              </div>

              <div v-for="hour in 18" :key="hour + 5" class="time-label" :style="{ top: ((hour + 5) * 48 - (isInactiveHoursCollapsed ? 240 : 0)) + 'px' }">
                {{ formatHour(hour + 5) }}
              </div>
            </div>
            <div 
              v-for="day in weekDays" 
              :key="day.key"
              class="day-column"
              :class="{
                today: day.isToday,
                'drag-over': dragState.overDayColumn === day.key
              }"
              :data-day-key="day.key"
              :style="{ minHeight: isInactiveHoursCollapsed ? '912px' : '1152px' }"
            >
              <div
                class="inactive-hours-cells"
                :style="{ height: isInactiveHoursCollapsed ? '0px' : '240px', overflow: 'hidden' }"
              >
                <div
                  v-for="hour in 5"
                  :key="hour"
                  class="hour-cell"
                  :class="{
                    'drag-over': dragState.overHourCell === `${day.key}-${hour}`
                  }"
                  @mousedown.left="handleHourCellMouseDown(day, hour, $event)"
                  @mouseenter="handleHourCellMouseEnter(day, hour)"
                  @dragover.prevent="handleHourCellDragOver(day, hour)"
                  @dragleave="handleHourCellDragLeave"
                  @drop="handleDropOnHourCell(day, hour)"
                ></div>
              </div>
              <div
                v-for="hour in 19"
                :key="hour + 5"
                class="hour-cell"
                :class="{
                  'drag-over': dragState.overHourCell === `${day.key}-${hour + 5}`
                }"
                @mousedown.left="handleHourCellMouseDown(day, hour + 5, $event)"
                @mouseenter="handleHourCellMouseEnter(day, hour + 5)"
                @dragover.prevent="handleHourCellDragOver(day, hour + 5)"
                @dragleave="handleHourCellDragLeave"
                @drop="handleDropOnHourCell(day, hour + 5)"
              ></div>
              <div
                v-if="getTimedCreateSelectionStyle(day.key)"
                class="timed-create-selection"
                :style="getTimedCreateSelectionStyle(day.key)!"
              ></div>
               
              <div v-if="showLifelog || showFocusRecords" class="week-lifelog-layer">
                <div
                  v-for="item in (weekLifelogTimelineByDay.get(day.key) || [])"
                  :key="item.id"
                  v-show="shouldShowWeekLifelogTimelineItem(item)"
                  class="week-lifelog-block ariaLabel"
                  :class="`is-${item.type}`"
                  :aria-label="getWeekLifelogItemTitle(item)"
                  :style="getWeekLifelogTimelineItemStyle(item)"
                  @click.stop="openLifelogTimeline(item.date)"
                  @contextmenu.prevent.stop="handleWeekLifelogContextMenu(item)"
                >
                  <div class="week-lifelog-title">
                    <span
                      v-if="item.moodSvg"
                      class="week-lifelog-emoji"
                      v-html="item.moodSvg"
                    ></span>
                    <span v-else-if="item.emoji" class="week-lifelog-emoji">{{ item.emoji }}</span>
                    <Icon v-else :name="item.icon" width="12" height="12" />
                    <span class="week-lifelog-time">{{ item.timeLabel }}</span>
                    <span
                      v-if="item.type === 'habit-checkin' || item.type === 'task-completed'"
                      class="week-lifelog-item-title"
                    >{{ item.title }}</span>
                  </div>
                  <div v-if="item.note" class="week-lifelog-note">{{ item.note }}</div>
                </div>
              </div>

              <div class="timed-tasks-layer">
                <div
                  v-for="item in (tasksByDay.get(day.key) || [])"
                  :key="item.task.id + '-' + item.renderDate"
                  v-show="shouldShowTimedTaskItem(item)"
                  class="timed-task ariaLabel"
                  :aria-label="getTaskDisplayTitle(item.task)"
                  :class="[
                    `priority-${item.task.priority}`,
                    { 'task-completed': item.task.status === 'completed' },
                    { 'task-dragging': draggingTimedTask?.task.id === item.task.id },
                    { 'mobile-selected': shouldShowMobileTimedTaskControls(item.task.id) }
                  ]"
                  :style="getTimedTaskStyle(item)"
                  @click="handleMobileTimedTaskClick($event, item.task)"
                  @mousedown="handleTimedTaskMouseDown($event, item.task, day.key)"
                  @pointerdown="handleMobileTimedTaskPointerDown($event, item)"
                  @pointermove="handleMobileTimedTaskPointerMove"
                  @pointerup="handleMobileTimedTaskPointerUp"
                  @pointercancel="handleMobileTimedTaskPointerCancel"
                  @contextmenu="handleContextMenu($event, item.task)"
                >
                  <div 
                    class="timed-task-handle timed-task-handle-top"
                    :class="{
                      'handle-dragging': draggingTimedTaskHandle?.task.id === item.task.id && draggingTimedTaskHandle?.type === 'start',
                      'mobile-visible': shouldShowMobileTimedTaskControls(item.task.id)
                    }"
                    @mousedown.stop="handleTimedTaskHandleMouseDown($event, item.task, 'start')"
                    @pointerdown.stop="handleMobileTimedTaskHandlePointerDown($event, item.task, 'start')"
                  ></div>
                  <div class="timed-task-content">
                    <div class="timed-task-title">
                      <span
                        class="task-checkbox-wrapper"
                        @mousedown.stop
                        @click.stop="toggleTaskStatus(item.task)"
                      >
                        <TaskCheckbox :checked="item.task.status === 'completed'" :size="12" />
                      </span>
                      <span class="task-title-text" @click.stop="handleTaskClick(item.task, $event)">{{ getTaskDisplayTitle(item.task) }}</span>
                      <span
                        v-if="item.task.priority !== 'none'"
                        class="task-priority-badge ariaLabel"
                        :class="`priority-${item.task.priority}`"
                        :aria-label="getPriorityTitle(item.task.priority)"
                      >
                        <Icon name="flag" width="10" height="10" />
                      </span>
                      <button
                        v-if="shouldShowMobileTimedTaskControls(item.task.id)"
                        type="button"
                        class="mobile-timed-task-more"
                        @click.stop="showTaskContextMenu(item.task, undefined, { keepTimedTaskSelected: true })"
                      >
                        <Icon name="moreHorizontal" width="14" height="14" />
                      </button>
                      <span
                        class="task-jump-btn"
                        @mousedown.stop
                        @click.stop="handleTaskOpenClick(item.task, $event)"
                      >
                        <Icon name="open" width="14" height="14" />
                      </span>
                    </div>
                    <div class="timed-task-time">{{ getTaskTimeRange(item) }}</div>
                  </div>
                  <div 
                    class="timed-task-handle timed-task-handle-bottom"
                    :class="{
                      'handle-dragging': draggingTimedTaskHandle?.task.id === item.task.id && draggingTimedTaskHandle?.type === 'end',
                      'mobile-visible': shouldShowMobileTimedTaskControls(item.task.id)
                    }"
                    @mousedown.stop="handleTimedTaskHandleMouseDown($event, item.task, 'end')"
                    @pointerdown.stop="handleMobileTimedTaskHandlePointerDown($event, item.task, 'end')"
                  ></div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="current-time-line" :style="currentTimeStyle"></div>
          <div class="current-time-line-full" :style="currentTimeLabelStyle"></div>
          <div class="current-time-label" :style="currentTimeLabelStyle">
            {{ currentTimeText }}
          </div>
        </div>
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
      @saveDates="applyTaskDates(contextMenu.task!)"
      @clearTaskDates="clearTaskDates(contextMenu.task!)"
      @saveRepeatRule="saveTaskRepeatRule(contextMenu.task!, $event)"
      @start-focus="startFocusForTask(contextMenu.task!)"
      @editTask="handleContextMenuEditTask(contextMenu.task!)"
    />

    <LifelogTimelinePanel
      :show="lifelogTimelinePanelOpen"
      :title="lifelogTimelineDayTitle"
      :subtitle="lifelogTimelineSubtitle"
      :items="lifelogTimelineItems"
      :empty-text="t('monthView.lifelogEmpty')"
      :close-label="t('common.close')"
      :delete-label="t('common.delete')"
      :show-editor="Boolean(lifelogTimelineDayKey) && showLifelog"
      :draft="lifelogTimelineDraft"
      :editor-placeholder="t('monthView.lifelogManualPlaceholder')"
      :save-label="t('common.save')"
      :cancel-label="t('common.cancel')"
      :delete-confirm-title="t('lifelogTimeline.deleteConfirmTitle')"
      :delete-confirm-message="t('lifelogTimeline.deleteConfirmMessage')"
      :date-strip-days="lifelogTimelineDateStripDays"
      :current-period="weekTitle"
      :previous-period-label="previousNavLabel"
      :next-period-label="nextNavLabel"
      @close="closeLifelogTimeline"
      @change-period="changeLifelogTimelinePeriod"
      @select-date="openLifelogTimeline"
      @update:draft="updateLifelogTimelineDraft"
      @save-draft="saveLifelogTimelineDraft"
      @clear-draft="clearLifelogTimelineDraft"
      @delete-item="deleteLifelogTimelineItem"
    />

    <div
      v-if="mobileDragPreview.active && mobileDragPreview.task"
      class="mobile-drag-preview"
      :style="mobileDragPreviewStyle"
    >
      <div class="mobile-drag-preview-title">{{ mobileDragPreviewTitle }}</div>
      <div v-if="mobileDragHint" class="mobile-drag-preview-hint">{{ mobileDragHint }}</div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import type { FocusSessionRecord, Habit, MoodData, MoodManualEntry, Task, TaskGroup } from '@/api';
import type { Goal } from '@/goalRepository';
import {
  deleteFocusSessionRecord,
  getFocusTimerData,
  getHabits,
  getMoodData,
  saveHabits,
  saveMoodData,
  setBlockAttrs,
  TaskRepository
} from '@/api';
import { updateTaskMarkdown } from '@/utils/taskHelpers';
import { getTaskDisplayTitle } from '@/composables/useTaskCommon';
import { formatDate, formatTime, formatHour } from '@/composables/useDateUtils';
import { CALENDAR_CONSTANTS } from '@/composables/useCalendarConstants';
import { useDebouncedSave } from '@/composables/useDebouncedSave';
import { useTaskDrag } from '@/composables/useTaskDrag';
import { useTaskSyncGuard } from '@/composables/useTaskSyncGuard';
import { useTaskLocalMutations } from '@/composables/useTaskLocalMutations';
import { getRepeatSeriesForTask, notifyRepeatChanged, updateRepeatSeriesBackgroundColor, updateRepeatSeriesDates, type RepeatFrequency, type RepeatRule, type RepeatRuleInput } from '@/repeatRepository';
import { belongsToRepeatSeries, getDayDiff, isRepeatTask as isRepeatTaskEntity, shiftDate } from '@/utils/repeatTaskUtils';
import Icon from './Icon.vue';
import TaskCheckbox from './TaskCheckbox.vue';
import TaskContextMenu from './TaskContextMenu.vue';
import LifelogTimelinePanel, {
  type LifelogTimelineDateStripDay,
  type LifelogTimelinePanelItem
} from './LifelogTimelinePanel.vue';
import { useI18n } from '@/composables/useI18n';
import { openHabitTrackerFocusTimer } from '@/main';
import { createTaskFocusTarget } from '@/utils/focusTimerTarget';
import { getSiyuanIntlLocaleTag } from '@/utils/locale';
import { useHabitEmojis } from '@/composables/useHabitEmojis';
import {
  focusRecordToLifelogEvent,
  habitsToLifelogEvents,
  moodManualEntriesToLifelogEvents,
  tasksToCompletedLifelogEvents,
  type FocusLifelogEvent as FocusCalendarEvent,
  type HabitCheckinLifelogEvent,
  type LifelogEventType,
  type ManualNoteLifelogEvent,
  type TaskCompletedLifelogEvent
} from '@/utils/lifelogEvents';
import { HABIT_CHECKIN_LOG_CHANGE_EVENT, useHabitCheckinLog } from '@/composables/useHabitCheckinLog';
import { eventBus, Events } from '@/utils/eventBus';
import { buildHabitTaskChips, isHabitTaskChip, parseHabitTaskChipId } from '@/utils/habitTaskChips';
import { getGoalIdsForTask } from '@/utils/goalTaskMembership';
import { resolveTaskTagIds } from '@/utils/taskTags';
import {
  normalizeTaskBackgroundColorValue,
  resolveEffectiveTaskBackgroundColor,
  resolveTaskAccentColor,
  resolveTaskBackgroundColor,
  resolveTaskGroupBackgroundColor
} from '@/utils/taskColor';

interface Props {
  tasks: Task[];
  lifelogTasks?: Task[];
  fixedDaysCount?: number;
  fixedCenterToday?: boolean;
  taskGroups?: TaskGroup[];
  goals?: Goal[];
  calendarViewOptions?: CalendarViewOption[];
  currentCalendarView?: CalendarViewMode;
  showFocusRecords?: boolean;
  showHabits?: boolean;
  showLifelog?: boolean;
}

type CalendarViewMode = 'month' | 'week' | 'three-day' | 'day';
type CalendarViewOption = {
  value: CalendarViewMode;
  label: string;
  title: string;
};

interface WeekDay {
  key: string;
  date: Date;
  weekdayName: string;
  dayNumber: number;
  isToday: boolean;
}

interface WeekAllDayTask extends Task {
  startDayOfWeek: number;
  endDayOfWeek: number;
  spanDays: number;
  rangeStart: Date;
  rangeEnd: Date;
}

interface TimedTaskRenderItem {
  task: Task;
  renderDate: string;
  renderStartDate: string;
  renderStartTime: string;
  renderDueDate: string;
  renderDueTime: string;
  laneIndex?: number;
  laneCount?: number;
  focusTrackReserved?: boolean;
}

type WeekLifelogEvent =
  | FocusCalendarEvent
  | HabitCheckinLifelogEvent
  | TaskCompletedLifelogEvent
  | ManualNoteLifelogEvent;

type WeekLifelogTimelineTrack = 'full' | 'focus';

interface WeekLifelogTimelineItem {
  id: string;
  type: LifelogEventType;
  date: string;
  title: string;
  startTime: string;
  endTime: string;
  timeLabel: string;
  note: string;
  icon: string;
  emoji?: string;
  moodSvg?: string;
  event: WeekLifelogEvent;
  layoutTrack?: WeekLifelogTimelineTrack;
  laneIndex?: number;
  laneCount?: number;
}

interface MobileMiniCalendarDay {
  key: string;
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isInCurrentWeek: boolean;
  isToday: boolean;
}

const props = defineProps<Props>();
const { t } = useI18n();
const { getHabitFocusNoteItems } = useHabitCheckinLog();
const { getMoodSvg } = useHabitEmojis();
const calendarViewOptions = computed(() => props.calendarViewOptions || []);
const showFocusRecords = computed(() => props.showFocusRecords !== false);
const showHabits = computed(() => props.showHabits !== false);
const showLifelog = computed(() => props.showLifelog !== false);
const taskCompletedLifelogSourceTasks = computed(() => props.lifelogTasks || localTasks.value);
const taskCompletedLifelogSourceTaskById = computed(() => {
  const taskById = new Map<string, Task>();
  for (const task of taskCompletedLifelogSourceTasks.value) {
    if (task.id) {
      taskById.set(task.id, task);
    }
  }
  return taskById;
});
const taskCompletedLifelogSourceTaskByBlockId = computed(() => {
  const taskByBlockId = new Map<string, Task>();
  for (const task of taskCompletedLifelogSourceTasks.value) {
    if (task.blockId) {
      taskByBlockId.set(task.blockId, task);
    }
  }
  return taskByBlockId;
});
const taskGroupNameById = computed(() =>
  new Map((props.taskGroups || []).map(group => [group.id, group.name]))
);
const goalById = computed(() =>
  new Map((props.goals || []).map(goal => [goal.id, goal]))
);

function formatTemplate(key: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [name, value]) => result.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value)),
    t(key)
  );
}


function formatLocaleWeekday(date: Date, width: 'narrow' | 'short'): string {
  return new Intl.DateTimeFormat(getSiyuanIntlLocaleTag(), { weekday: width }).format(date);
}

function formatMonthDayLabel(date: Date): string {
  return formatTemplate('weekView.monthDayTemplate', {
    month: date.getMonth() + 1,
    day: date.getDate()
  });
}

function formatFullDateLabel(date: Date): string {
  return formatTemplate('weekView.fullDateTemplate', {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate()
  });
}

function formatYearMonthLabel(date: Date): string {
  return formatTemplate('date.yearMonthTemplate', {
    year: date.getFullYear(),
    month: date.getMonth() + 1
  });
}

function formatDateRangeLabel(start: Date, end: Date, formatFn: (date: Date) => string): string {
  return `${formatFn(start)} - ${formatFn(end)}`;
}

function getPriorityTitle(priority: Task['priority']): string {
  if (priority === 'high') {
    return t('taskManager.priorityHighLabel');
  }
  if (priority === 'medium') {
    return t('taskManager.priorityMediumLabel');
  }
  return t('taskManager.priorityLowLabel');
}

function getHiddenTasksLabel(count: number): string {
  return formatTemplate('monthView.moreTasksTemplate', { count });
}

const emit = defineEmits<{
  'taskDateChanged': [task: Task];
  'taskClick': [task: Task];
  'taskEdit': [task: Task, anchor: { x: number; y: number }];
  'taskCreateRequested': [payload: { startDate: string; dueDate: string; startTime?: string; dueTime?: string; allDay: boolean }];
  'visibleRangeChange': [payload: { startDate: string; endDate: string }];
  'calendarViewChange': [view: CalendarViewMode];
  'focusSessionContextmenu': [session: FocusCalendarEvent];
}>();

interface ExternalTaskDropPoint {
  clientX: number;
  clientY: number;
}

interface MobilePointerTaskDragSession {
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

type MobileTimedTaskGestureMode = 'move' | 'resize-start' | 'resize-end';
type MobileAllDayTaskGestureMode = 'move' | 'resize-start' | 'resize-end';

interface MobileTimedTaskRepeatSnapshotEntry {
  id: string;
  isVirtual: boolean;
  repeatInstanceDate?: string;
  startDate: string;
  dueDate: string;
  hasExplicitDueDate: boolean;
  startTime?: string;
  dueTime?: string;
}

interface MobileTimedTaskRepeatSnapshot {
  seriesId: string;
  entries: MobileTimedTaskRepeatSnapshotEntry[];
}

interface MobileTimedTaskGesture {
  task: Task;
  pointerId: number;
  mode: MobileTimedTaskGestureMode;
  startX: number;
  startY: number;
  latestX: number;
  latestY: number;
  timerId: number | null;
  started: boolean;
  moved: boolean;
  captureElement: HTMLElement | null;
  originalStartDate: string;
  originalDueDate: string;
  originalStartTime: string;
  originalDueTime: string;
  clickOffsetY?: number;
  durationMs?: number;
  repeatSeriesSnapshot?: MobileTimedTaskRepeatSnapshot | null;
}

interface MobileAllDayTaskGesture {
  task: Task;
  pointerId: number;
  mode: MobileAllDayTaskGestureMode;
  startX: number;
  startY: number;
  latestX: number;
  latestY: number;
  timerId: number | null;
  started: boolean;
  moved: boolean;
  captureElement: HTMLElement | null;
  originalStartDate: string;
  originalDueDate: string;
  originalStartTime?: string;
  originalDueTime?: string;
  hasExplicitDueDate: boolean;
  repeatSeriesSnapshot?: MobileTimedTaskRepeatSnapshot | null;
}

type MobileTimedTaskDropTarget =
  | { kind: 'all-day'; day: WeekDay; label: string }
  | { kind: 'timed'; day: WeekDay; startTime: string; dueTime: string; dueDate: string; label: string };

type MobileAllDayTaskDropTarget = {
  day: WeekDay;
  dayKey: string;
  label: string;
};

type ExternalTaskDropTarget =
  | { kind: 'all-day'; day: WeekDay }
  | { kind: 'timed'; day: WeekDay; hour: number; startTime: string; dueTime: string; dueDate: string };

type RectBounds = Pick<DOMRectReadOnly, 'left' | 'right' | 'top' | 'bottom'>;

type WeekDayHitZone = {
  dayKey: string;
  day: WeekDay;
  rect: RectBounds;
};

type WeekDropZoneCache = {
  mobileDayZones: WeekDayHitZone[];
  allDayZones: WeekDayHitZone[];
  timedDayZones: WeekDayHitZone[];
  scrollRect: RectBounds | null;
};

function getTodayStart(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function resolveFixedDaysCount(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return Math.max(
    CALENDAR_CONSTANTS.LAYOUT.MIN_DAYS,
    Math.min(CALENDAR_CONSTANTS.LAYOUT.MAX_DAYS, Math.round(value))
  );
}

function resolveCenteredStartDateFromToday(days: number): Date {
  const start = getTodayStart();
  const centerOffset = Math.floor(days / 2);
  start.setDate(start.getDate() - centerOffset);
  return start;
}

function resolveInitialWeekStart(): Date {
  const fixedDays = resolveFixedDaysCount(props.fixedDaysCount);
  if (!fixedDays) {
    return getMondayStart(new Date());
  }
  if (props.fixedCenterToday) {
    return resolveCenteredStartDateFromToday(fixedDays);
  }
  return getTodayStart();
}

const currentWeekStart = ref(resolveInitialWeekStart());
const currentTime = ref(new Date());
const isAllDaySectionCollapsed = ref(false);
const INACTIVE_HOURS_OFFSET = 240; // 5 小时栁E��+5 个 hour-cell ÁE48px
const isInactiveHoursCollapsed = ref(true);
const allDayExpandedPanelVisible = ref(false);
const allDayExpandedDayKey = ref<string | null>(null);
const MAX_VISIBLE_ALL_DAY_ROWS = 4;
let timeUpdateInterval: ReturnType<typeof setInterval> | null = null;
const MOBILE_WEEK_BREAKPOINT = 768;
const MOBILE_DRAG_LONG_PRESS_MS = 280;
const MOBILE_DRAG_MOVE_THRESHOLD_PX = 18;
const MOBILE_TIMED_TASK_OPERATION_MOVE_THRESHOLD_PX = 10;
const MOBILE_TIMED_TASK_SNAP_MINUTES = Math.min(CALENDAR_CONSTANTS.LAYOUT.TIME_SNAP_MINUTES, 5);
const mobileMiniWeekdayLabels = computed(() => {
  const monday = new Date(2024, 0, 1);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return formatLocaleWeekday(date, 'narrow');
  });
});
const mobileWeekdayNames = computed(() => {
  const monday = new Date(2024, 0, 1);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return formatLocaleWeekday(date, 'short');
  });
});
const viewportWidth = ref(typeof window === 'undefined' ? 1024 : window.innerWidth);
const daysScrollRef = ref<HTMLElement | null>(null);
const mobilePointerTaskDrag = ref<MobilePointerTaskDragSession | null>(null);
const mobileAllDayTaskGesture = ref<MobileAllDayTaskGesture | null>(null);
const mobileTimedTaskGesture = ref<MobileTimedTaskGesture | null>(null);
const selectedMobileAllDayTaskId = ref<string | null>(null);
const selectedMobileTimedTaskId = ref<string | null>(null);
const mobileDragPreview = ref<{
  active: boolean;
  task: Task | null;
  clientX: number;
  clientY: number;
}>({
  active: false,
  task: null,
  clientX: 0,
  clientY: 0
});
const mobileDragHint = ref('');
const suppressedTaskClickIds = new Map<string, number>();
let weekDropZoneCache: WeekDropZoneCache | null = null;
let mobileTaskPointerMoveRafId: number | null = null;
let mobileAllDayTaskPointerMoveRafId: number | null = null;
let mobileTimedTaskPointerMoveRafId: number | null = null;

function getCurrentTimeOffsetPx(): number {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const offset = minutes * CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT / 60;
  return isInactiveHoursCollapsed.value
    ? Math.max(0, offset - INACTIVE_HOURS_OFFSET)
    : offset;
}

function scrollToCurrentTimeInView(behavior: ScrollBehavior = 'auto'): void {
  if (isMobileWeekGridMode.value) {
    return;
  }
  const container = daysScrollRef.value;
  if (!container) {
    return;
  }

  const targetCenter = getCurrentTimeOffsetPx() - container.clientHeight / 2;
  const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
  const top = Math.min(Math.max(0, targetCenter), maxTop);
  container.scrollTo({ top, behavior });
}

async function centerCurrentTimeInViewport(behavior: ScrollBehavior = 'auto'): Promise<void> {
  await nextTick();
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      scrollToCurrentTimeInView(behavior);
    });
  });
}

const localTasks = ref<Task[]>([]);
const focusSessionRecords = ref<FocusSessionRecord[]>([]);
const habitRecords = ref<Habit[]>([]);
const moodRecords = ref<MoodData>({});
const habitFocusNotesByKey = ref<Map<string, string>>(new Map());
const lifelogTimelineDayKey = ref<string | null>(null);
const manualLifelogDrafts = ref<Record<string, string>>({});
const CREATE_SELECTION_THRESHOLD_PX = 8;
const MINUTES_PER_QUARTER = 15;
const QUARTERS_PER_HOUR = 4;
const TOTAL_QUARTERS_PER_DAY = 24 * QUARTERS_PER_HOUR;
const WEEK_LIFELOG_MIN_VISUAL_MINUTES = 30;
const WEEK_LIFELOG_TEXT_CHARS_PER_LINE = 14;

function getLocalTodayKey(): string {
  return formatDate(new Date());
}

async function toggleHabitTaskChipStatus(task: Task): Promise<void> {
  const parsed = parseHabitTaskChipId(task.id);
  if (!parsed) {
    return;
  }

  const habit = habitRecords.value.find(item => item.id === parsed.habitId);
  if (!habit) {
    return;
  }

  const targetCount = Math.max(1, Math.round(Number(habit.timesPerDay ?? 1) || 1));
  let record = habit.calendar.find(day => day.date === parsed.date);

  if (record?.completed) {
    record.completed = false;
    record.completedCount = 0;
    delete record.timestamp;
    delete record.checkinTimestamps;
    habit.calendar = habit.calendar.filter(day => day.date !== parsed.date);
  } else {
    if (!record) {
      record = {
        date: parsed.date,
        completed: false,
        completedCount: 0,
        targetCount
      };
      habit.calendar.push(record);
    }

    const previousTimestamps = Array.isArray(record.checkinTimestamps)
      ? record.checkinTimestamps
      : [];
    const now = Date.now();
    record.targetCount = Math.max(1, Math.round(Number(record.targetCount ?? targetCount) || 1));
    record.completedCount = Math.min(record.targetCount, Math.max(0, Math.round(Number(record.completedCount || 0) || 0)) + 1);
    record.completed = record.completedCount >= record.targetCount;
    record.checkinTimestamps = [...previousTimestamps, now];
    record.timestamp ||= now;
  }

  habit.completedToday = Boolean(
    habit.calendar.find(day => day.date === getLocalTodayKey() && day.completed)
  );
  habit.totalCompletions = habit.calendar.filter(day => day.completed).length;

  habitRecords.value = [...habitRecords.value];
  await saveHabits(habitRecords.value);
  eventBus.emit(Events.HABITS_UPDATED, { source: 'week-view', habits: habitRecords.value });
}
const WEEK_LIFELOG_MINUTES_PER_TEXT_LINE = 18;
let unsubscribeHabitUpdates: (() => void) | null = null;
let unsubscribeMoodUpdates: (() => void) | null = null;
const allDayCreateSelection = ref<{
  active: boolean;
  startDay: string;
  endDay: string;
  startX: number;
  startY: number;
  passedThreshold: boolean;
} | null>(null);
const timedCreateSelection = ref<{
  active: boolean;
  dayKey: string;
  startQuarter: number;
  endQuarter: number;
  startX: number;
  startY: number;
  passedThreshold: boolean;
} | null>(null);

const { saveTaskAttrs } = useDebouncedSave(500);
const taskSyncGuard = useTaskSyncGuard(localTasks);
const {
  upsertTask: upsertLocalTask,
  patchTask: patchLocalTask,
  patchTasksBatch: patchLocalTasksBatch
} = useTaskLocalMutations(localTasks);

function emitTaskDateChanged(task: Task): void {
  taskSyncGuard.emitTaskDateChanged(task, (nextTask) => {
    emit('taskDateChanged', nextTask);
  });
}

const {
  dragState,
  draggingHandle,
  draggingTask,
  draggingTimedTaskHandle,
  draggingTimedTask,
  isDragging,
  handleHandleMouseDown,
  handleTaskMouseDown,
  handleTimedTaskHandleMouseDown,
  handleTimedTaskMouseDown,
  removeEventListeners
} = useTaskDrag(localTasks, emitTaskDateChanged, {
  inactiveHoursOffset: () => isInactiveHoursCollapsed.value ? INACTIVE_HOURS_OFFSET : 0
});

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
let contextMenuOutsidePointerBound = false;

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
  return 'weekly';
}

function handleContextMenuOutsidePointerDown(event: PointerEvent): void {
  if (!contextMenu.value.show) {
    return;
  }
  const menu = document.querySelector('.context-menu');
  const target = event.target;
  if (menu && target instanceof Node && menu.contains(target)) {
    return;
  }
  if (target instanceof Element && target.closest('.time-popover-overlay, .time-popover, .date-popover-overlay, .date-popover, .repeat-dialog-overlay, .repeat-dialog')) {
    return;
  }
  selectMobileAllDayTask(null);
  selectMobileTimedTask(null);
  hideContextMenu();
}

function bindContextMenuOutsidePointerDown(): void {
  if (contextMenuOutsidePointerBound) {
    return;
  }
  document.addEventListener('pointerdown', handleContextMenuOutsidePointerDown, true);
  contextMenuOutsidePointerBound = true;
}

function unbindContextMenuOutsidePointerDown(): void {
  if (!contextMenuOutsidePointerBound) {
    return;
  }
  document.removeEventListener('pointerdown', handleContextMenuOutsidePointerDown, true);
  contextMenuOutsidePointerBound = false;
}

const backgroundColors = [
  { value: 'pinch-background1', css: 'var(--pinch-background1)' },
  { value: 'pinch-background2', css: 'var(--pinch-background2)' },
  { value: 'pinch-background3', css: 'var(--pinch-background3)' },
  { value: 'pinch-background4', css: 'var(--pinch-background4)' },
  { value: 'pinch-background5', css: 'var(--pinch-background5)' },
  { value: 'pinch-background6', css: 'var(--pinch-background6)' },
  { value: 'pinch-background7', css: 'var(--pinch-background7)' },
  { value: 'pinch-background8', css: 'var(--pinch-background8)' },
  { value: 'pinch-background9', css: 'var(--pinch-background9)' },
  { value: 'pinch-background10', css: 'var(--pinch-background10)' }
];
const weekDropColorValues = backgroundColors.map(color => color.value);

function pickRandomTaskBackgroundColor(): string {
  if (weekDropColorValues.length === 0) {
    return 'pinch-background6';
  }
  const index = Math.floor(Math.random() * weekDropColorValues.length);
  return weekDropColorValues[index];
}

const daysCount = ref(7);
const hasFixedDaysCount = computed(() => resolveFixedDaysCount(props.fixedDaysCount) !== null);
const isDayViewContext = computed(() => {
  const fixedDays = resolveFixedDaysCount(props.fixedDaysCount);
  if (!fixedDays) {
    return false;
  }
  return fixedDays === 1;
});
const isThreeDayViewContext = computed(() => {
  const fixedDays = resolveFixedDaysCount(props.fixedDaysCount);
  if (!fixedDays) {
    return false;
  }
  return fixedDays === 3;
});
const minimumDaysCount = computed(() =>
  isThreeDayViewContext.value ? 3 : CALENDAR_CONSTANTS.LAYOUT.MIN_DAYS
);
const isDaysCountLocked = computed(() =>
  hasFixedDaysCount.value
  && !isDayViewContext.value
  && !isThreeDayViewContext.value
);
const showHeaderDaysSwitcher = computed(() => {
  if (isDaysCountLocked.value) {
    return false;
  }
  if (viewportWidth.value > MOBILE_WEEK_BREAKPOINT) {
    return true;
  }
  return !isMobileWeekGridMode.value;
});
const isMobileWeekGridMode = computed(() => viewportWidth.value <= MOBILE_WEEK_BREAKPOINT && daysCount.value === 7);
const isMobileDayViewMode = computed(() => viewportWidth.value <= MOBILE_WEEK_BREAKPOINT && daysCount.value === 1);
const isMobileThreeDayViewMode = computed(() => viewportWidth.value <= MOBILE_WEEK_BREAKPOINT && daysCount.value === 3);
const isMobileDragEnabled = computed(() => viewportWidth.value <= MOBILE_WEEK_BREAKPOINT);
const isMobileAllDayTaskInteractionEnabled = computed(() =>
  viewportWidth.value <= MOBILE_WEEK_BREAKPOINT
  && !isMobileWeekGridMode.value
);
const isMobileTimedTaskInteractionEnabled = computed(() =>
  viewportWidth.value <= MOBILE_WEEK_BREAKPOINT
  && (daysCount.value === 1 || daysCount.value === 3)
);
const mobileDragPreviewTitle = computed(() =>
  mobileDragPreview.value.task ? getTaskDisplayTitle(mobileDragPreview.value.task) : ''
);
const mobileDragPreviewStyle = computed(() => ({
  left: `${Math.max(12, mobileDragPreview.value.clientX + 10)}px`,
  top: `${Math.max(12, mobileDragPreview.value.clientY - 14)}px`
}));

function normalizeOptionalDateValue(value: string | null | undefined): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function getEffectiveDueDate(startDate: string, dueDate: string | null | undefined): string {
  return normalizeOptionalDateValue(dueDate) || startDate;
}

function handleViewportResize(): void {
  viewportWidth.value = window.innerWidth;
  invalidateWeekDropZoneCache();
  if (
    viewportWidth.value <= MOBILE_WEEK_BREAKPOINT
    && !isDaysCountLocked.value
    && !isDayViewContext.value
    && !isThreeDayViewContext.value
    && daysCount.value !== 7
  ) {
    daysCount.value = 7;
  }
}

function copyRectBounds(rect: DOMRect | DOMRectReadOnly): RectBounds {
  return {
    left: rect.left,
    right: rect.right,
    top: rect.top,
    bottom: rect.bottom
  };
}

function invalidateWeekDropZoneCache(): void {
  weekDropZoneCache = null;
}

function buildWeekDayHitZones(selector: string): WeekDayHitZone[] {
  const dayMap = new Map(weekDays.value.map(day => [day.key, day]));
  return Array.from(document.querySelectorAll<HTMLElement>(selector))
    .map((element) => {
      const dayKey = element.getAttribute('data-day-key') || '';
      const day = dayMap.get(dayKey);
      if (!day) {
        return null;
      }
      return {
        dayKey,
        day,
        rect: copyRectBounds(element.getBoundingClientRect())
      };
    })
    .filter((zone): zone is WeekDayHitZone => !!zone);
}

function getWeekDropZoneCache(): WeekDropZoneCache {
  if (!weekDropZoneCache) {
    const scrollElement = daysScrollRef.value;
    weekDropZoneCache = {
      mobileDayZones: buildWeekDayHitZones('.mobile-day-cell[data-day-key]'),
      allDayZones: buildWeekDayHitZones('.all-day-column[data-day-key]'),
      timedDayZones: buildWeekDayHitZones('.day-column[data-day-key]'),
      scrollRect: scrollElement ? copyRectBounds(scrollElement.getBoundingClientRect()) : null
    };
  }
  return weekDropZoneCache;
}

function getWeekScrollRect(): RectBounds | null {
  const scrollElement = daysScrollRef.value;
  if (!scrollElement) {
    return null;
  }
  const cache = getWeekDropZoneCache();
  if (!cache.scrollRect) {
    cache.scrollRect = copyRectBounds(scrollElement.getBoundingClientRect());
  }
  return cache.scrollRect;
}

function findWeekDayHitZone(point: ExternalTaskDropPoint, zones: WeekDayHitZone[]): WeekDayHitZone | null {
  for (const zone of zones) {
    if (pointWithinRect(point, zone.rect)) {
      return zone;
    }
  }
  return null;
}

watch(
  () => props.fixedDaysCount,
  (nextCount) => {
    if (typeof nextCount !== 'number' || !Number.isFinite(nextCount)) {
      return;
    }
    const normalized = Math.max(
      CALENDAR_CONSTANTS.LAYOUT.MIN_DAYS,
      Math.min(CALENDAR_CONSTANTS.LAYOUT.MAX_DAYS, Math.round(nextCount))
    );
    daysCount.value = normalized;
  },
  { immediate: true }
);

watch(isMobileAllDayTaskInteractionEnabled, (enabled) => {
  if (enabled) {
    return;
  }
  clearMobileAllDayTaskGesture({ restorePreview: true });
  selectMobileAllDayTask(null);
});

watch(isMobileTimedTaskInteractionEnabled, (enabled) => {
  if (enabled) {
    return;
  }
  clearMobileTimedTaskGesture({ restorePreview: true });
  selectMobileTimedTask(null);
});

watch(
  () => localTasks.value.map(task => task.id),
  (taskIds) => {
    const selectedAllDayTaskId = selectedMobileAllDayTaskId.value;
    if (selectedAllDayTaskId && !taskIds.includes(selectedAllDayTaskId)) {
      selectMobileAllDayTask(null);
    }
    const selectedTaskId = selectedMobileTimedTaskId.value;
    if (!selectedTaskId) {
      return;
    }
    if (!taskIds.includes(selectedTaskId)) {
      selectMobileTimedTask(null);
    }
  }
);

function decreaseDays() {
  if (isDaysCountLocked.value) return;
  if (daysCount.value > minimumDaysCount.value) {
    daysCount.value--;
  }
}

function increaseDays() {
  if (isDaysCountLocked.value) return;
  if (daysCount.value < CALENDAR_CONSTANTS.LAYOUT.MAX_DAYS) {
    daysCount.value++;
  }
}

function resolveNavigationOffsetDays(): number {
  if (hasFixedDaysCount.value) {
    if (props.fixedCenterToday) {
      return 1;
    }
    return Math.max(1, Math.round(daysCount.value));
  }
  return 7;
}

const navigationOffsetDays = computed(() => resolveNavigationOffsetDays());
const previousNavLabel = computed(() => {
  const offset = navigationOffsetDays.value;
  if (offset === 1) {
    return t('weekView.previousDay');
  }
  if (offset === 7) {
    return t('weekView.previousWeek');
  }
  return formatTemplate('weekView.previousDaysTemplate', { count: offset });
});
const nextNavLabel = computed(() => {
  const offset = navigationOffsetDays.value;
  if (offset === 1) {
    return t('weekView.nextDay');
  }
  if (offset === 7) {
    return t('weekView.nextWeek');
  }
  return formatTemplate('weekView.nextDaysTemplate', { count: offset });
});

function getTasksHash(tasks: Task[]): string {
  return tasks.map(t => 
    `${t.id}:${t.status}:${t.priority}:${t.startDate}:${t.dueDate}:${t.startTime}:${t.dueTime}:${t.title}:${t.backgroundColor || ''}:${t.groupId || ''}`
  ).join('|');
}

watch(() => props.tasks, (newTasks) => {
  taskSyncGuard.syncTasks(newTasks, isDragging.value, getTasksHash);
}, { deep: true, immediate: true });

async function refreshFocusSessions(): Promise<void> {
  try {
    const [data, habits] = await Promise.all([
      getFocusTimerData(),
      getHabits()
    ]);
    focusSessionRecords.value = data.sessionRecords;
    habitRecords.value = habits;
    habitFocusNotesByKey.value = await loadHabitFocusNotesForFocusSessions(data.sessionRecords, habits);
  } catch (error) {
    console.error('[WeekView] Failed to load focus sessions', error);
  }
}

async function refreshWeekLifelogRecords(): Promise<void> {
  try {
    const [habits, moodData] = await Promise.all([
      getHabits(),
      getMoodData()
    ]);
    habitRecords.value = habits;
    moodRecords.value = moodData;
  } catch (error) {
    console.error('[WeekView] Failed to load lifelog records', error);
  }
}

function handleFocusSessionUpdate(): void {
  void refreshFocusSessions();
}

function handleHabitCheckinLogChange(): void {
  void refreshFocusSessions();
  void refreshWeekLifelogRecords();
}

function handleHabitsUpdated(payload?: { source?: string; habits?: Habit[] }): void {
  if (payload?.source === 'week-view') {
    return;
  }
  if (Array.isArray(payload?.habits)) {
    habitRecords.value = [...payload.habits];
    return;
  }
  void refreshWeekLifelogRecords();
}

function handleMoodUpdated(payload?: { moodData?: MoodData }): void {
  if (payload?.moodData && typeof payload.moodData === 'object') {
    moodRecords.value = { ...payload.moodData };
    return;
  }
  void refreshWeekLifelogRecords();
}

function getFocusSessionRecordId(record: FocusSessionRecord): string {
  const recordId = typeof record.id === 'string' ? record.id.trim() : '';
  if (recordId) {
    return recordId;
  }
  const targetId = typeof record.targetId === 'string' ? record.targetId.trim() : '';
  const date = typeof record.date === 'string' ? record.date.trim() : '';
  const timestamp = Number(record.timestamp) || 0;
  const minutes = Math.max(0, Math.round(Number(record.minutes) || 0));
  return `${targetId}-${date}-${timestamp}-${minutes}`;
}

function getHabitFocusNoteKey(habitId: string, date: string, sessionId: string): string {
  return `${habitId}::${date}::${sessionId}`;
}

async function loadHabitFocusNotesForFocusSessions(
  records: FocusSessionRecord[],
  habits: Habit[]
): Promise<Map<string, string>> {
  const nextNotes = new Map<string, string>();
  const visibleDateKeys = new Set(weekDays.value.map(day => day.key));
  const habitById = new Map(habits.map(habit => [habit.id, habit]));
  const uniqueHabitDates = new Set<string>();

  for (const record of records) {
    if (record.targetType !== 'habit' || !record.targetId || !visibleDateKeys.has(record.date)) {
      continue;
    }
    uniqueHabitDates.add(`${record.targetId}::${record.date}`);
  }

  for (const key of uniqueHabitDates) {
    const [habitId, date] = key.split('::');
    const habit = habitById.get(habitId);
    if (!habit) {
      continue;
    }

    if (!habit.noteDocId) {
      continue;
    }

    const focusNotes = await getHabitFocusNoteItems(habit.noteDocId, habit, date);
    for (const focusNote of focusNotes) {
      const note = focusNote.note.trim();
      if (!note) {
        continue;
      }
      nextNotes.set(getHabitFocusNoteKey(habitId, date, focusNote.sessionId), note);
    }
  }

  return nextNotes;
}

const weekdays = computed(() => {
  const sunday = new Date(2024, 0, 7);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + index);
    return formatLocaleWeekday(date, 'short');
  });
});

function timeToMinutes(time: string): number {
  const [hour, min] = time.split(':').map(Number);
  return hour * 60 + min;
}

function assignTimedTaskLanes(items: TimedTaskRenderItem[]): TimedTaskRenderItem[] {
  if (items.length <= 1) {
    return items.map(item => ({ ...item, laneIndex: 0, laneCount: 1 }));
  }

  const normalized = items
    .map((item) => {
      const start = timeToMinutes(item.renderStartTime);
      const end = Math.max(start + 1, timeToMinutes(item.renderDueTime));
      return { item, start, end };
    })
    .sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return a.end - b.end;
    });

  const result: TimedTaskRenderItem[] = [];
  let cluster: typeof normalized = [];
  let clusterEnd = -1;

  const flushCluster = () => {
    if (cluster.length === 0) return;

    const laneEnds: number[] = [];
    const assigned: Array<{ item: TimedTaskRenderItem; laneIndex: number }> = [];

    for (const entry of cluster) {
      let laneIndex = laneEnds.findIndex(end => end <= entry.start);
      if (laneIndex === -1) {
        laneIndex = laneEnds.length;
        laneEnds.push(entry.end);
      } else {
        laneEnds[laneIndex] = entry.end;
      }

      assigned.push({ item: entry.item, laneIndex });
    }

    const laneCount = Math.max(1, laneEnds.length);
    for (const { item, laneIndex } of assigned) {
      result.push({
        ...item,
        laneIndex,
        laneCount
      });
    }
  };

  for (const entry of normalized) {
    if (cluster.length === 0 || entry.start < clusterEnd) {
      cluster.push(entry);
      clusterEnd = Math.max(clusterEnd, entry.end);
      continue;
    }

    flushCluster();
    cluster = [entry];
    clusterEnd = entry.end;
  }

  flushCluster();
  return result;
}

function assignFocusSessionLanes(items: FocusCalendarEvent[]): FocusCalendarEvent[] {
  if (items.length <= 1) {
    return items.map(item => ({ ...item, laneIndex: 0, laneCount: 1 }));
  }

  const normalized = items
    .map((item) => {
      const start = timeToMinutes(item.startTime);
      const end = Math.max(start + 15, timeToMinutes(item.endTime));
      return { item, start, end };
    })
    .sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return a.end - b.end;
    });

  const result: FocusCalendarEvent[] = [];
  let cluster: typeof normalized = [];
  let clusterEnd = -1;

  const flushCluster = () => {
    if (cluster.length === 0) return;

    const laneEnds: number[] = [];
    const assigned: Array<{ item: FocusCalendarEvent; laneIndex: number }> = [];

    for (const entry of cluster) {
      let laneIndex = laneEnds.findIndex(end => end <= entry.start);
      if (laneIndex === -1) {
        laneIndex = laneEnds.length;
        laneEnds.push(entry.end);
      } else {
        laneEnds[laneIndex] = entry.end;
      }

      assigned.push({ item: entry.item, laneIndex });
    }

    const laneCount = Math.max(1, laneEnds.length);
    for (const { item, laneIndex } of assigned) {
      result.push({
        ...item,
        laneIndex,
        laneCount
      });
    }
  };

  for (const entry of normalized) {
    if (cluster.length === 0 || entry.start < clusterEnd) {
      cluster.push(entry);
      clusterEnd = Math.max(clusterEnd, entry.end);
      continue;
    }

    flushCluster();
    cluster = [entry];
    clusterEnd = entry.end;
  }

  flushCluster();
  return result;
}

const weekTitle = computed(() => {
  const start = new Date(currentWeekStart.value);
  const end = new Date(start);
  end.setDate(start.getDate() + daysCount.value - 1);

  if (daysCount.value === 1) {
    return formatFullDateLabel(start);
  }
  return formatDateRangeLabel(start, end, formatFullDateLabel);
});

const weekDays = computed<WeekDay[]>(() => {
  const days: WeekDay[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < daysCount.value; i++) {
    const date = new Date(currentWeekStart.value);
    date.setDate(currentWeekStart.value.getDate() + i);
    date.setHours(0, 0, 0, 0);
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const dayOfWeek = date.getDay();
    
    days.push({
      key: `${year}-${month}-${day}`,
      date,
      weekdayName: weekdays.value[dayOfWeek],
      dayNumber: date.getDate(),
      isToday: date.getTime() === today.getTime()
    });
  }
  
  return days;
});

watch(
  weekDays,
  (days) => {
    if (days.length === 0) {
      return;
    }
    emit('visibleRangeChange', {
      startDate: days[0].key,
      endDate: days[days.length - 1].key
    });
  },
  { immediate: true }
);

watch(
  () => weekDays.value.map(day => day.key).join('|'),
  () => {
    invalidateWeekDropZoneCache();
    void refreshFocusSessions();
  }
);

watch(isMobileWeekGridMode, () => {
  invalidateWeekDropZoneCache();
});

watch(isAllDaySectionCollapsed, () => {
  invalidateWeekDropZoneCache();
});

function getMondayStart(date: Date): Date {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff);
  return monday;
}

const mobileDayWeekDates = computed(() => {
  const selectedDate = new Date(currentWeekStart.value);
  selectedDate.setHours(0, 0, 0, 0);
  const mondayStart = getMondayStart(selectedDate);
  const today = getTodayStart().getTime();

  return mobileMiniWeekdayLabels.value.map((label, index) => {
    const date = new Date(mondayStart);
    date.setDate(mondayStart.getDate() + index);
    date.setHours(0, 0, 0, 0);
    const timestamp = date.getTime();
    return {
      key: formatDate(date),
      date,
      weekdayName: label,
      dayNumber: date.getDate(),
      isToday: timestamp === today,
      isActive: timestamp === selectedDate.getTime()
    };
  });
});

function focusMobileDay(date: Date): void {
  hideAllDayExpandedPanel();
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  currentWeekStart.value = nextDate;
  isAllDaySectionCollapsed.value = false;
  void centerCurrentTimeInViewport('smooth');
}

const mobileWeekStartDate = computed(() => {
  const mondayStart = new Date(currentWeekStart.value);
  mondayStart.setHours(0, 0, 0, 0);
  return mondayStart;
});

const mobileWeekBounds = computed(() => {
  const start = new Date(mobileWeekStartDate.value);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
});

const mobileWeekDays = computed<WeekDay[]>(() => {
  const days: WeekDay[] = [];
  const today = getTodayStart().getTime();
  const start = mobileWeekStartDate.value;

  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    date.setHours(0, 0, 0, 0);
    const key = formatDate(date);
    days.push({
      key,
      date,
      weekdayName: mobileWeekdayNames.value[i],
      dayNumber: date.getDate(),
      isToday: date.getTime() === today
    });
  }

  return days;
});

const mobileWeekDayKeySet = computed(() => new Set(mobileWeekDays.value.map(day => day.key)));

function formatMonthDayWithoutYear(date: Date): string {
  return formatMonthDayLabel(date);
}

const displayWeekTitle = computed(() => {
  if (hasFixedDaysCount.value) {
    const start = new Date(currentWeekStart.value);
    const end = new Date(start);
    end.setDate(start.getDate() + daysCount.value - 1);
    if (daysCount.value === 1) {
      return formatMonthDayWithoutYear(start);
    }
    return formatDateRangeLabel(start, end, formatMonthDayWithoutYear);
  }
  if (!isMobileWeekGridMode.value) {
    return weekTitle.value;
  }
  const start = new Date(mobileWeekStartDate.value);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return formatDateRangeLabel(start, end, formatFullDateLabel);
});

const mobileCalendarTitle = computed(() => {
  const date = mobileWeekStartDate.value;
  return formatYearMonthLabel(date);
});

const mobileMiniCalendarDays = computed<MobileMiniCalendarDay[]>(() => {
  const baseDate = mobileWeekStartDate.value;
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const monthStart = new Date(year, month, 1);
  monthStart.setHours(0, 0, 0, 0);

  const mondayOffset = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - mondayOffset);

  const todayKey = formatDate(getTodayStart());
  const currentWeekKeys = mobileWeekDayKeySet.value;
  const days: MobileMiniCalendarDay[] = [];

  for (let i = 0; i < 42; i++) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    date.setHours(0, 0, 0, 0);
    const key = formatDate(date);

    days.push({
      key,
      date,
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === month,
      isInCurrentWeek: currentWeekKeys.has(key),
      isToday: key === todayKey
    });
  }

  return days;
});

function focusMobileWeek(date: Date): void {
  hideAllDayExpandedPanel();
  const monday = getMondayStart(date);
  currentWeekStart.value = monday;
}

function compareTasksForMobileDay(a: Task, b: Task): number {
  const aIsTimed = Boolean(a.startTime || a.dueTime);
  const bIsTimed = Boolean(b.startTime || b.dueTime);
  if (aIsTimed !== bIsTimed) {
    return aIsTimed ? 1 : -1;
  }

  const aStart = a.startTime || '00:00';
  const bStart = b.startTime || '00:00';
  if (aStart !== bStart) {
    return aStart.localeCompare(bStart);
  }

  const aDue = a.dueTime || '23:59';
  const bDue = b.dueTime || '23:59';
  if (aDue !== bDue) {
    return aDue.localeCompare(bDue);
  }

  return getTaskDisplayTitle(a).localeCompare(getTaskDisplayTitle(b), 'zh-Hans-CN');
}

const mobileTasksByDay = computed(() => {
  const grouped = new Map<string, Task[]>();
  const seenByDay = new Map<string, Set<string>>();
  const { start, end } = mobileWeekBounds.value;

  for (const day of mobileWeekDays.value) {
    grouped.set(day.key, []);
    seenByDay.set(day.key, new Set());
  }

  for (const task of localTasks.value) {
    const range = getTaskDateRangeForRender(task);
    if (!range) continue;
    if (range.startDate > end || range.endDate < start) continue;

    for (const day of mobileWeekDays.value) {
      const dayTimestamp = day.date.getTime();
      if (dayTimestamp < range.startDate.getTime() || dayTimestamp > range.endDate.getTime()) continue;

      const seen = seenByDay.get(day.key);
      if (!seen || seen.has(task.id)) continue;
      seen.add(task.id);
      grouped.get(day.key)?.push(task);
    }
  }

  if (showHabits.value) {
    for (const task of buildHabitTaskChips(habitRecords.value, mobileWeekDays.value)) {
      const date = task.startDate || task.dueDate || '';
      const seen = seenByDay.get(date);
      if (!seen || seen.has(task.id)) continue;
      seen.add(task.id);
      grouped.get(date)?.push(task);
    }
  }

  for (const day of mobileWeekDays.value) {
    const tasks = grouped.get(day.key) || [];
    grouped.set(day.key, tasks.sort(compareTasksForMobileDay));
  }

  return grouped;
});

function getMobileDayTasks(dayKey: string): Task[] {
  return mobileTasksByDay.value.get(dayKey) || [];
}

function getMobileTaskChipStyle(task: Task): Record<string, string> {
  const effectiveBackgroundColor = resolveEffectiveTaskBackgroundColor(task, props.taskGroups);
  return {
    background: resolveTaskBackgroundColor(effectiveBackgroundColor),
    '--pinch-task-chip-color': resolveTaskAccentColor(effectiveBackgroundColor)
  };
}

function getWeekBounds() {
  const weekStart = new Date(currentWeekStart.value);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + daysCount.value - 1);
  weekEnd.setHours(23, 59, 59, 999);
  return { weekStart, weekEnd };
}

const weekBounds = computed(() => getWeekBounds());

function getTaskDateRangeForRender(task: Task): { startDate: Date; endDate: Date } | null {
  const startValue = task.startDate || task.dueDate;
  if (!startValue) return null;

  const startDate = new Date(startValue);
  startDate.setHours(0, 0, 0, 0);

  const isRepeatTask = !!task.repeatSeriesId || (!!task.repeatFrequency && task.repeatFrequency !== 'none');
  const endValue = isRepeatTask ? startValue : (task.dueDate || startValue);
  const endDate = new Date(endValue);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
}

function getTaskRepeatSeriesId(task: Task): string {
  return typeof task.repeatSeriesId === 'string' ? task.repeatSeriesId.trim() : '';
}

const normalizedTaskRanges = computed(() => {
  const { weekStart, weekEnd } = weekBounds.value;
  const ranges = localTasks.value.flatMap((task) => {
    const range = getTaskDateRangeForRender(task);
    if (!range) return [];
    const { startDate, endDate } = range;

    if (startDate > weekEnd || endDate < weekStart) {
      return [];
    }

    return [{
      task,
      startDate,
      endDate,
      isTimed: Boolean(task.startTime || task.dueTime)
    }];
  });

  const virtualRepeatSeriesIds = new Set<string>();
  for (const range of ranges) {
    if (!range.task.isVirtual) continue;
    const seriesId = getTaskRepeatSeriesId(range.task);
    if (seriesId) {
      virtualRepeatSeriesIds.add(seriesId);
    }
  }

  if (virtualRepeatSeriesIds.size === 0) {
    return ranges;
  }

  return ranges.filter((range) => {
    if (range.task.isVirtual) return true;
    const seriesId = getTaskRepeatSeriesId(range.task);
    return !seriesId || !virtualRepeatSeriesIds.has(seriesId);
  });
});

const weekTasks = computed<WeekAllDayTask[]>(() => {
  const { weekStart, weekEnd } = weekBounds.value;
  const taskRanges = [
    ...normalizedTaskRanges.value,
    ...(showHabits.value ? buildHabitTaskChips(habitRecords.value, weekDays.value) : []).map(task => {
      const startDate = new Date(task.startDate || task.dueDate || '');
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(task.dueDate || task.startDate || '');
      endDate.setHours(23, 59, 59, 999);
      return {
        task,
        startDate,
        endDate,
        isTimed: false
      };
    }).filter(range => Number.isFinite(range.startDate.getTime()) && Number.isFinite(range.endDate.getTime()))
  ];

  return taskRanges
    .filter(range => !range.isTimed)
    .map(({ task, startDate, endDate }) => {
      const displayStart = startDate < weekStart ? weekStart : startDate;
      const displayEnd = endDate > weekEnd ? weekEnd : endDate;

      const startDayOffset = Math.floor((displayStart.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000));
      const endDayOffset = Math.floor((displayEnd.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000));
      const startDayOfWeek = Math.max(0, startDayOffset);
      const endDayOfWeek = Math.min(daysCount.value - 1, endDayOffset);

      return {
        ...task,
        startDayOfWeek,
        endDayOfWeek,
        spanDays: endDayOfWeek - startDayOfWeek + 1,
        rangeStart: startDate,
        rangeEnd: endDate
      };
    });
});

const timedTaskRanges = computed(() => {
  return normalizedTaskRanges.value
    .filter(range => range.isTimed)
    .map(({ task, startDate, endDate }) => ({
      task,
      // Use normalized render range to avoid repeat templates leaking original multi-day dates.
      taskStartDate: formatDate(startDate),
      taskDueDate: formatDate(endDate),
      startDate,
      endDate
    }));
});

const taskPositionsMap = computed(() => {
  const positionMap = new Map<string, number>();
  const dailyPositionSlots = new Map<string, number[]>();
  
  const sortedTasks = [...weekTasks.value].sort((a, b) => {
    const aStart = a.rangeStart.getTime();
    const bStart = b.rangeStart.getTime();
    if (aStart !== bStart) return aStart - bStart;

    const aEnd = a.rangeEnd.getTime();
    const bEnd = b.rangeEnd.getTime();
    return (bEnd - bStart) - (aEnd - aStart);
  });
  
  for (const task of sortedTasks) {
    const taskDays: string[] = [];
    const currentDay = new Date(task.rangeStart);
    while (currentDay <= task.rangeEnd) {
      const dateKey = formatDate(currentDay);
      taskDays.push(dateKey);
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    let assignedPosition = 0;
    
    for (let pos = 0; ; pos++) {
      let positionAvailable = true;
      
      for (const dayKey of taskDays) {
        if (!dailyPositionSlots.has(dayKey)) {
          dailyPositionSlots.set(dayKey, []);
        }
        
        const daySlots = dailyPositionSlots.get(dayKey)!;
        if (daySlots[pos] !== undefined) {
          positionAvailable = false;
          break;
        }
      }
      
      if (positionAvailable) {
        assignedPosition = pos;
        
        for (const dayKey of taskDays) {
          const daySlots = dailyPositionSlots.get(dayKey)!;
          daySlots[pos] = task.rangeEnd.getTime();
        }
        
        break;
      }
    }
    
    positionMap.set(task.id, assignedPosition);
  }
  
  return positionMap;
});

const allDayTaskRowCount = computed(() => {
  const maxPosition = Math.max(0, ...Array.from(taskPositionsMap.value.values()));
  return maxPosition + 1;
});

const maxVisibleTasks = computed(() => (
  isAllDaySectionCollapsed.value ? MAX_VISIBLE_ALL_DAY_ROWS : allDayTaskRowCount.value
));

const allDaySectionHeight = computed(() => {
  return allDayTaskRowCount.value * CALENDAR_CONSTANTS.LAYOUT.TASK_CHIP_HEIGHT + 6;
});

const visibleTasks = computed(() => {
  return weekTasks.value.filter(task => {
    const position = taskPositionsMap.value.get(task.id) || 0;
    return position < maxVisibleTasks.value;
  });
});

const hiddenTasksCount = computed(() => {
  if (isAllDaySectionCollapsed.value) {
    return weekTasks.value.length;
  }
  
  const maxPosition = Math.max(0, ...Array.from(taskPositionsMap.value.values()));
  if (maxPosition < maxVisibleTasks.value) return 0;
  
  return weekTasks.value.filter(task => {
    const position = taskPositionsMap.value.get(task.id) || 0;
    return position >= maxVisibleTasks.value;
  }).length;
});

const allDayExpandedTasks = computed<WeekAllDayTask[]>(() => {
  const dayIndex = expandedAllDayDayIndex.value;
  if (dayIndex < 0) {
    return [];
  }
  return weekTasks.value
    .filter((task) => {
      return task.startDayOfWeek <= dayIndex && dayIndex <= task.endDayOfWeek;
    })
    .sort((a, b) => {
      const positionDelta = (taskPositionsMap.value.get(a.id) ?? 0) - (taskPositionsMap.value.get(b.id) ?? 0);
      if (positionDelta !== 0) {
        return positionDelta;
      }
      const startDelta = a.startDayOfWeek - b.startDayOfWeek;
      if (startDelta !== 0) {
        return startDelta;
      }
      return getTaskDisplayTitle(a).localeCompare(getTaskDisplayTitle(b), 'zh-Hans-CN');
    });
});

const earliestHiddenTaskDate = computed(() => {
  const hiddenTasks = weekTasks.value.filter(task => {
    const position = taskPositionsMap.value.get(task.id) || 0;
    return position >= maxVisibleTasks.value;
  });
  
  if (hiddenTasks.length === 0) return null;
  
  const earliestTask = hiddenTasks.reduce((earliest, task) => {
    const taskDate = task.rangeStart;
    const earliestDate = earliest.rangeStart;
    return taskDate < earliestDate ? task : earliest;
  });
  
  return new Date(earliestTask.rangeStart);
});

const moreButtonDayIndex = computed(() => {
  if (!earliestHiddenTaskDate.value) return 0;
  
  const weekStart = new Date(currentWeekStart.value);
  weekStart.setHours(0, 0, 0, 0);
  
  const taskDate = new Date(earliestHiddenTaskDate.value);
  taskDate.setHours(0, 0, 0, 0);
  
  const daysDiff = Math.round((taskDate.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
  
  return Math.max(0, Math.min(daysCount.value - 1, daysDiff));
});

const expandedAllDayDayIndex = computed(() => {
  if (weekDays.value.length === 0) {
    return -1;
  }
  const fallbackKey = weekDays.value[moreButtonDayIndex.value]?.key ?? weekDays.value[0]?.key ?? null;
  const targetDayKey = allDayExpandedDayKey.value || fallbackKey;
  if (!targetDayKey) {
    return -1;
  }
  return weekDays.value.findIndex((day) => day.key === targetDayKey);
});

const allDayExpandedPanelStyle = computed<Record<string, string>>(() => {
  const panelDayIndex = expandedAllDayDayIndex.value >= 0
    ? expandedAllDayDayIndex.value
    : moreButtonDayIndex.value;
  if (viewportWidth.value <= MOBILE_WEEK_BREAKPOINT) {
    return {};
  }
  if (isAllDaySectionCollapsed.value) {
    return {
      left: '64px',
      width: 'calc(100% - 8px)',
      right: 'auto'
    };
  }
  return {
    left: `calc(60px + (100% - 60px) / ${daysCount.value} * ${panelDayIndex} + 4px)`,
    width: `calc((100% - 60px) / ${daysCount.value} - 16px)`,
    right: 'auto'
  };
});

const moreAllDayStyle = computed<Record<string, string>>(() => {
  if (isAllDaySectionCollapsed.value) {
    return {
      left: '4px',
      width: 'calc(100% - 8px)',
      top: '4px',
      height: '22px'
    };
  }

  return {
    left: `calc(60px + (100% - 60px) / ${daysCount.value} * ${moreButtonDayIndex.value} + 10px)`,
    width: `calc((100% - 60px) / ${daysCount.value} - 16px)`,
    top: `${CALENDAR_CONSTANTS.LAYOUT.TASK_TOP_OFFSET + (maxVisibleTasks.value - 1) * CALENDAR_CONSTANTS.LAYOUT.TASK_CHIP_HEIGHT}px`,
    height: '22px'
  };
});

function getAllDayMoreReserveWidthPx(): number {
  return viewportWidth.value <= MOBILE_WEEK_BREAKPOINT ? 24 : 34;
}

function getAllDayTaskMoreReserveWidth(task: WeekAllDayTask): number {
  if (isAllDaySectionCollapsed.value || hiddenTasksCount.value <= 0) {
    return 0;
  }

  const position = getVisibleTaskPosition(task);
  if (position !== Math.max(0, maxVisibleTasks.value - 1)) {
    return 0;
  }

  return task.endDayOfWeek === moreButtonDayIndex.value ? getAllDayMoreReserveWidthPx() : 0;
}

function getVisibleTaskPosition(task: WeekAllDayTask): number {
  return taskPositionsMap.value.get(task.id) || 0;
}

function getAllDayTaskStyle(task: WeekAllDayTask) {
  const leftPercent = (task.startDayOfWeek / daysCount.value) * 100;
  const widthPercent = (task.spanDays / daysCount.value) * 100;

  const position = getVisibleTaskPosition(task);
  const widthOffset = 24 + getAllDayTaskMoreReserveWidth(task);

  const effectiveBackgroundColor = resolveEffectiveTaskBackgroundColor(task, props.taskGroups);
  const bgColor = resolveTaskBackgroundColor(effectiveBackgroundColor);

  return {
    position: 'absolute' as const,
    left: `${leftPercent}%`,
    width: `calc(${widthPercent}% - ${widthOffset}px)`,
    top: `${CALENDAR_CONSTANTS.LAYOUT.TASK_TOP_OFFSET + position * CALENDAR_CONSTANTS.LAYOUT.TASK_CHIP_HEIGHT}px`,
    height: '16px',
    background: bgColor,
    '--pinch-task-chip-color': resolveTaskAccentColor(effectiveBackgroundColor)
  };
}

function getExpandedAllDayChipStyle(task: WeekAllDayTask): Record<string, string> {
  const effectiveBackgroundColor = resolveEffectiveTaskBackgroundColor(task, props.taskGroups);
  return {
    background: resolveTaskBackgroundColor(effectiveBackgroundColor),
    '--pinch-task-chip-color': resolveTaskAccentColor(effectiveBackgroundColor)
  };
}

const currentTimeStyle = computed(() => {
  const { top, dayOffset, inRange } = currentTimePlacement.value;
  if (!inRange) {
    return { display: 'none' };
  }

  return {
    left: `calc(${CALENDAR_CONSTANTS.LAYOUT.TIME_COLUMN_WIDTH}px + (100% - ${CALENDAR_CONSTANTS.LAYOUT.TIME_COLUMN_WIDTH}px) * ${dayOffset / daysCount.value} + ${CALENDAR_CONSTANTS.SPACING.CURRENT_TIME_LINE_LEFT}px)`,
    width: `calc((100% - ${CALENDAR_CONSTANTS.LAYOUT.TIME_COLUMN_WIDTH}px) / ${daysCount.value} - ${CALENDAR_CONSTANTS.SPACING.CURRENT_TIME_LINE_MARGIN}px)`,
    top: `${top}px`
  };
});

const currentTimePlacement = computed(() => {
  const now = currentTime.value;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const top = minutes * CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT / 60;
  const adjustedTop = isInactiveHoursCollapsed.value
    ? Math.max(0, top - INACTIVE_HOURS_OFFSET)
    : top;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date(currentWeekStart.value);
  weekStart.setHours(0, 0, 0, 0);

  const dayOffset = Math.floor((today.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000));
  const inRange = dayOffset >= 0 && dayOffset < daysCount.value;

  return { top: adjustedTop, dayOffset, inRange };
});

const currentTimeLabelStyle = computed(() => {
  const { top, inRange } = currentTimePlacement.value;
  if (!inRange) {
    return { display: 'none' };
  }
  
  return {
    top: `${top}px`
  };
});

const currentTimeText = computed(() => {
  const now = currentTime.value;
  const hour = now.getHours();
  const minute = now.getMinutes();
  const period = hour < 12 ? 'am' : 'pm';
  const displayHour = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
  const displayMinute = minute.toString().padStart(2, '0');
  return `${displayHour}:${displayMinute}${period}`;
});

function previousWeek() {
  hideAllDayExpandedPanel();
  const offsetDays = resolveNavigationOffsetDays();
  const newDate = new Date(currentWeekStart.value);
  newDate.setDate(newDate.getDate() - offsetDays);
  currentWeekStart.value = newDate;
}

function nextWeek() {
  hideAllDayExpandedPanel();
  const offsetDays = resolveNavigationOffsetDays();
  const newDate = new Date(currentWeekStart.value);
  newDate.setDate(newDate.getDate() + offsetDays);
  currentWeekStart.value = newDate;
}

function goToToday() {
  hideAllDayExpandedPanel();
  if (isMobileWeekGridMode.value && daysCount.value === 7) {
    focusMobileWeek(getTodayStart());
    return;
  }
  if (hasFixedDaysCount.value) {
    const fixedDays = resolveFixedDaysCount(daysCount.value) || 1;
    currentWeekStart.value = props.fixedCenterToday
      ? resolveCenteredStartDateFromToday(fixedDays)
      : getTodayStart();
    void centerCurrentTimeInViewport('smooth');
    return;
  }
  currentWeekStart.value = getMondayStart(new Date());
  void centerCurrentTimeInViewport('smooth');
}

function toggleInactiveHours() {
  isInactiveHoursCollapsed.value = !isInactiveHoursCollapsed.value;
}

function toggleAllDaySection() {
  const willCollapse = !isAllDaySectionCollapsed.value;
  isAllDaySectionCollapsed.value = willCollapse;
  if (willCollapse) {
    hideAllDayExpandedPanel();
  }
}

function showAllTasks() {
  isAllDaySectionCollapsed.value = false;
  allDayExpandedDayKey.value = weekDays.value[moreButtonDayIndex.value]?.key ?? weekDays.value[0]?.key ?? null;
  allDayExpandedPanelVisible.value = allDayExpandedDayKey.value !== null;
}

function hideAllDayExpandedPanel() {
  allDayExpandedPanelVisible.value = false;
  allDayExpandedDayKey.value = null;
}

function handleGlobalPointerDown(event: PointerEvent): void {
  const targetElement = event.target instanceof Element ? event.target : null;

  if (selectedMobileAllDayTaskId.value || selectedMobileTimedTaskId.value) {
    const clickedInsideInteractiveTask = !!targetElement?.closest('.all-day-task, .all-day-habit-task, .timed-task, .context-menu, .mobile-drag-preview, .time-popover-overlay, .time-popover, .date-popover-overlay, .date-popover');
    if (!clickedInsideInteractiveTask) {
      selectMobileAllDayTask(null);
      selectMobileTimedTask(null);
    }
  }

  if (!allDayExpandedPanelVisible.value) {
    return;
  }
  const clickedInsidePanel = !!targetElement?.closest('.all-day-expanded-panel');
  const clickedExpandTrigger = !!targetElement?.closest('.more-all-day');
  const clickedInsideContextMenu = !!targetElement?.closest('.context-menu, .time-popover-overlay, .time-popover, .date-popover-overlay, .date-popover, .repeat-dialog-overlay, .repeat-dialog');
  if (clickedInsidePanel || clickedExpandTrigger || clickedInsideContextMenu) {
    return;
  }
  hideAllDayExpandedPanel();
}

function clearWeekDragOverState() {
  dragState.value.overDay = null;
  dragState.value.overAllDayColumn = null;
  dragState.value.overDayColumn = null;
  dragState.value.overHourCell = null;
}

function handleDragOver(day: WeekDay) {
  dragState.value.overDay = day.key;
}

function handleDragLeave() {
  clearWeekDragOverState();
}

function getDraggedTaskFromWindowEvent(): Task | null {
  const event = window.event as DragEvent | undefined;
  const taskData = event?.dataTransfer?.getData('application/json');
  if (!taskData) return null;

  try {
    return JSON.parse(taskData) as Task;
  } catch {
    return null;
  }
}

async function applyRepeatSeriesDrop(
  task: Task,
  payload: { targetDate: string; startTime?: string; dueTime?: string; clearTime?: boolean }
): Promise<boolean> {
  if (!isRepeatTaskEntity(task)) return false;

  const series = await getRepeatSeriesForTask(task);
  if (!series) return false;

  const draggedInstanceDate = task.repeatInstanceDate
    || task.startDate
    || task.dueDate
    || series.startDate;
  const deltaDays = getDayDiff(draggedInstanceDate, payload.targetDate);
  const nextSeriesStart = shiftDate(series.startDate, deltaDays);
  const nextSeriesEnd = series.endDate ? shiftDate(series.endDate, deltaDays) : null;

  const seriesTasksForSync: Task[] = [];
  let templateTask: Task | null = null;

  for (const candidate of localTasks.value) {
    if (!belongsToRepeatSeries(candidate, series.id, series.templateBlockId)) continue;

    const baseStart = candidate.startDate || candidate.dueDate || series.startDate;
    const baseDue = candidate.dueDate || candidate.startDate || baseStart;
    const patch: Partial<Task> = {
      startDate: shiftDate(baseStart, deltaDays),
      dueDate: shiftDate(baseDue, deltaDays)
    };

    if (payload.clearTime) {
      patch.startTime = undefined;
      patch.dueTime = undefined;
    } else if (payload.startTime && payload.dueTime) {
      patch.startTime = payload.startTime;
      patch.dueTime = payload.dueTime;
    }

    const updatedTask = patchLocalTask(candidate.id, patch);
    if (!updatedTask) continue;

    seriesTasksForSync.push(updatedTask);
    if (!templateTask && !updatedTask.isVirtual) {
      templateTask = updatedTask;
    }
  }

  seriesTasksForSync.forEach((item) => {
    emitTaskDateChanged(item);
  });

  try {
    await updateRepeatSeriesDates(
      task,
      nextSeriesStart,
      nextSeriesEnd,
      {
        startTime: payload.clearTime ? null : (payload.startTime || null),
        dueTime: payload.clearTime ? null : (payload.dueTime || null)
      },
      { emitChange: false }
    );
  } catch (error) {
  }

  const templateBlockId = series.templateBlockId || templateTask?.blockId;
  if (templateBlockId) {
    const attrs: Record<string, string | null> = {
      'custom-task-start-date': nextSeriesStart || '',
      'custom-task-due-date': nextSeriesEnd || ''
    };
    if (payload.clearTime) {
      attrs['custom-task-start-time'] = null;
      attrs['custom-task-due-time'] = null;
    } else if (payload.startTime && payload.dueTime) {
      attrs['custom-task-start-time'] = payload.startTime;
      attrs['custom-task-due-time'] = payload.dueTime;
    }
    try {
      await setBlockAttrs(templateBlockId, attrs);
    } catch (error) {
    }
  }

  notifyRepeatChanged({
    blockId: templateBlockId,
    seriesId: series.id,
    frequency: series.frequency
  });

  return true;
}

async function applyTaskDropToDay(task: Task, day: WeekDay): Promise<void> {
  try {
    const dateStr = formatDate(day.date);
    const existingBackgroundColor = normalizeTaskBackgroundColorValue(task.backgroundColor);
    const assignedBackgroundColor = existingBackgroundColor
      ? undefined
      : (resolveTaskGroupBackgroundColor(task, props.taskGroups) || pickRandomTaskBackgroundColor());
    const handledBySeries = await applyRepeatSeriesDrop(task, {
      targetDate: dateStr,
      clearTime: true
    });
    if (handledBySeries) return;

    const updatedTask = upsertLocalTask(task, {
      startDate: dateStr,
      dueDate: dateStr,
      startTime: undefined,
      dueTime: undefined,
      ...(assignedBackgroundColor ? { backgroundColor: assignedBackgroundColor } : {})
    });
    emitTaskDateChanged(updatedTask);

    if (task.type === 'block' && task.blockId) {
      const attrs: Record<string, string | null> = {
        'custom-task-start-date': dateStr,
        'custom-task-due-date': dateStr,
        'custom-task-start-time': null,
        'custom-task-due-time': null
      };
      if (assignedBackgroundColor) {
        attrs['custom-task-background-color'] = assignedBackgroundColor;
      }
      await setBlockAttrs(task.blockId, attrs);
      await TaskRepository.clearCache();
    }
  } catch (error) {
  }
}

async function applyTaskDropToHourCell(task: Task, day: WeekDay, hour: number): Promise<void> {
  try {
    const actualHour = hour - 1;
    const date = new Date(day.date);
    date.setHours(actualHour, 0, 0, 0);
    
    const startDate = formatDate(date);
    const startTime = formatTime(date);
    const dueDate = formatDate(date);
    const dueTime = formatTime(new Date(date.getTime() + 60 * 60 * 1000));
    const existingBackgroundColor = normalizeTaskBackgroundColorValue(task.backgroundColor);
    const assignedBackgroundColor = existingBackgroundColor
      ? undefined
      : (resolveTaskGroupBackgroundColor(task, props.taskGroups) || pickRandomTaskBackgroundColor());

    const handledBySeries = await applyRepeatSeriesDrop(task, {
      targetDate: startDate,
      startTime,
      dueTime,
      clearTime: false
    });
    if (handledBySeries) return;

    const updatedTask = upsertLocalTask(task, {
      startDate,
      dueDate,
      startTime,
      dueTime,
      ...(assignedBackgroundColor ? { backgroundColor: assignedBackgroundColor } : {})
    });
    emitTaskDateChanged(updatedTask);

    const attrs: Record<string, string> = {
      'custom-task-start-date': updatedTask.startDate || '',
      'custom-task-start-time': updatedTask.startTime || '',
      'custom-task-due-date': updatedTask.dueDate || '',
      'custom-task-due-time': updatedTask.dueTime || ''
    };
    if (assignedBackgroundColor) {
      attrs['custom-task-background-color'] = assignedBackgroundColor;
    }
    const saved = await saveTaskAttrs(task, attrs);
    if (saved) {
      await TaskRepository.clearCache();
    }
  } catch (error) {
  }
}

function findWeekDayByKey(dayKey: string): WeekDay | null {
  return weekDays.value.find(day => day.key === dayKey) || null;
}

function formatExternalDropLabel(day: WeekDay, hour?: number): string {
  const label = formatMonthDayLabel(day.date);
  if (typeof hour !== 'number') {
    return label;
  }
  const actualHour = Math.max(0, Math.min(23, hour - 1));
  return `${label} ${String(actualHour).padStart(2, '0')}:00`;
}

function resolveTaskDurationMs(task: Task | null | undefined): number {
  if (!task) {
    return 60 * 60 * 1000;
  }
  const baseStartDate = task.startDate || task.dueDate;
  const baseDueDate = task.dueDate || task.startDate || baseStartDate;
  if (!baseStartDate || !baseDueDate) {
    return 60 * 60 * 1000;
  }
  const startDateTime = new Date(`${baseStartDate}T${task.startTime || '00:00'}`);
  const dueDateTime = new Date(`${baseDueDate}T${task.dueTime || task.startTime || '01:00'}`);
  const durationMs = dueDateTime.getTime() - startDateTime.getTime();
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return 60 * 60 * 1000;
  }
  return Math.max(15 * 60 * 1000, durationMs);
}

function buildExternalTimedDropTarget(
  day: WeekDay,
  point: ExternalTaskDropPoint,
  task?: Task,
  scrollRect: RectBounds | null = getWeekScrollRect()
): ExternalTaskDropTarget | null {
  const scrollElement = daysScrollRef.value;
  if (!scrollElement || !scrollRect) {
    return null;
  }

  const scrollTop = scrollElement.scrollTop;
  const offsetY = point.clientY - scrollRect.top + scrollTop;
  const inactiveOffsetMinutes = (isInactiveHoursCollapsed.value ? INACTIVE_HOURS_OFFSET : 0) * 60 / CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT;
  const totalMinutes = offsetY * 60 / CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT + inactiveOffsetMinutes;
  const snappedMinutes = Math.round(totalMinutes / MOBILE_TIMED_TASK_SNAP_MINUTES) * MOBILE_TIMED_TASK_SNAP_MINUTES;
  const maxStartMinutes = Math.max(0, 24 * 60 - MOBILE_TIMED_TASK_SNAP_MINUTES);
  const clampedMinutes = Math.max(0, Math.min(maxStartMinutes, snappedMinutes));
  const hours = Math.floor(clampedMinutes / 60);
  const minutes = clampedMinutes % 60;
  const startTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  const durationMs = resolveTaskDurationMs(task);
  const startDateTime = new Date(`${day.key}T${startTime}`);
  const dueDateTime = new Date(startDateTime.getTime() + durationMs);

  return {
    kind: 'timed',
    day,
    hour: Math.max(1, Math.min(24, Math.floor(clampedMinutes / 60) + 1)),
    startTime,
    dueTime: formatTime(dueDateTime),
    dueDate: formatDate(dueDateTime)
  };
}

function pointWithinRect(point: ExternalTaskDropPoint, rect: RectBounds): boolean {
  return point.clientX >= rect.left
    && point.clientX <= rect.right
    && point.clientY >= rect.top
    && point.clientY <= rect.bottom;
}

function resolveExternalDropTarget(point: ExternalTaskDropPoint, task?: Task): ExternalTaskDropTarget | null {
  const dropZoneCache = getWeekDropZoneCache();
  if (isMobileWeekGridMode.value) {
    const mobileDayZone = findWeekDayHitZone(point, dropZoneCache.mobileDayZones);
    if (mobileDayZone) {
      return { kind: 'all-day', day: mobileDayZone.day };
    }
    return null;
  }

  const allDayZone = findWeekDayHitZone(point, dropZoneCache.allDayZones);
  if (allDayZone) {
    return { kind: 'all-day', day: allDayZone.day };
  }

  const timedDayZone = findWeekDayHitZone(point, dropZoneCache.timedDayZones);
  if (timedDayZone) {
    return buildExternalTimedDropTarget(timedDayZone.day, point, task, getWeekScrollRect());
  }

  const element = document.elementFromPoint(point.clientX, point.clientY) as HTMLElement | null;
  if (!element) {
    return null;
  }

  const dayColumn = element.closest('.day-column[data-day-key]') as HTMLElement | null;
  const dayColumnKey = dayColumn?.getAttribute('data-day-key') || '';
  const dayFromColumn = dayColumnKey ? findWeekDayByKey(dayColumnKey) : null;
  if (dayFromColumn) {
    return { kind: 'all-day', day: dayFromColumn };
  }

  return null;
}

function updateExternalTaskDrag(point: ExternalTaskDropPoint, task?: Task): { label: string } | null {
  const target = resolveExternalDropTarget(point, task);
  clearWeekDragOverState();
  if (!target) {
    return null;
  }

  if (target.kind === 'timed') {
    dragState.value.overHourCell = `${target.day.key}-${target.hour}`;
    return { label: formatMobileTimedTaskDropLabel(target.day, target.startTime, target.dueTime) };
  }

  dragState.value.overDay = target.day.key;
  dragState.value.overAllDayColumn = target.day.key;
  if (!isMobileWeekGridMode.value) {
    dragState.value.overDayColumn = target.day.key;
  }
  return { label: formatExternalDropLabel(target.day) };
}

async function dropExternalTask(task: Task, point: ExternalTaskDropPoint): Promise<boolean> {
  const target = resolveExternalDropTarget(point, task);
  clearWeekDragOverState();
  if (!target) {
    return false;
  }

  if (target.kind === 'timed') {
    const existingBackgroundColor = normalizeTaskBackgroundColorValue(task.backgroundColor);
    const assignedBackgroundColor = existingBackgroundColor
      ? undefined
      : (resolveTaskGroupBackgroundColor(task, props.taskGroups) || pickRandomTaskBackgroundColor());
    const handledBySeries = await applyRepeatSeriesDrop(task, {
      targetDate: target.day.key,
      startTime: target.startTime,
      dueTime: target.dueTime,
      clearTime: false
    });
    if (handledBySeries) {
      return true;
    }

    const updatedTask = upsertLocalTask(task, {
      startDate: target.day.key,
      dueDate: target.dueDate,
      startTime: target.startTime,
      dueTime: target.dueTime,
      ...(assignedBackgroundColor ? { backgroundColor: assignedBackgroundColor } : {})
    });
    emitTaskDateChanged(updatedTask);

    const attrs: Record<string, string | null> = {
      'custom-task-start-date': updatedTask.startDate || '',
      'custom-task-due-date': updatedTask.dueDate || '',
      'custom-task-start-time': updatedTask.startTime || '',
      'custom-task-due-time': updatedTask.dueTime || ''
    };
    if (assignedBackgroundColor) {
      attrs['custom-task-background-color'] = assignedBackgroundColor;
    }
    const saved = await saveTaskAttrs(task, attrs);
    if (saved) {
      await TaskRepository.clearCache();
    }
    return true;
  }

  await applyTaskDropToDay(task, target.day);
  return true;
}

async function handleDrop(day: WeekDay) {
  clearWeekDragOverState();

  const task = getDraggedTaskFromWindowEvent();
  if (!task) return;

  await applyTaskDropToDay(task, day);
}

async function handleDropOnHourCell(day: WeekDay, hour: number) {
  clearWeekDragOverState();

  const task = getDraggedTaskFromWindowEvent();
  if (!task) return;

  await applyTaskDropToHourCell(task, day, hour);
}

function handleHourCellDragOver(day: WeekDay, hour: number) {
  dragState.value.overHourCell = `${day.key}-${hour}`;
}

function handleHourCellDragLeave() {
  clearWeekDragOverState();
}

function handleAllDayMouseDown(day: WeekDay, event: MouseEvent) {
  if (event.button !== 0) return;
  allDayCreateSelection.value = {
    active: true,
    startDay: day.key,
    endDay: day.key,
    startX: event.clientX,
    startY: event.clientY,
    passedThreshold: false
  };
}

function handleAllDayMouseEnter(day: WeekDay) {
  if (!allDayCreateSelection.value?.active) return;
  allDayCreateSelection.value.endDay = day.key;
}

function isAllDayInCreateSelection(dayKey: string): boolean {
  if (!allDayCreateSelection.value?.active || !allDayCreateSelection.value.passedThreshold) return false;
  const { startDay, endDay } = allDayCreateSelection.value;
  const from = startDay <= endDay ? startDay : endDay;
  const to = startDay <= endDay ? endDay : startDay;
  return dayKey >= from && dayKey <= to;
}

function handleHourCellMouseDown(day: WeekDay, hour: number, event: MouseEvent) {
  if (event.button !== 0) return;
  const quarter = getQuarterFromClientY(day.key, event.clientY) ?? ((hour - 1) * QUARTERS_PER_HOUR);
  timedCreateSelection.value = {
    active: true,
    dayKey: day.key,
    startQuarter: quarter,
    endQuarter: quarter,
    startX: event.clientX,
    startY: event.clientY,
    passedThreshold: false
  };
}

function handleHourCellMouseEnter(day: WeekDay, hour: number) {
  if (!timedCreateSelection.value?.active) return;
  if (timedCreateSelection.value.dayKey !== day.key) return;
  timedCreateSelection.value.endQuarter = Math.min(TOTAL_QUARTERS_PER_DAY - 1, hour * QUARTERS_PER_HOUR - 1);
}

function getTimedCreateSelectionStyle(dayKey: string): Record<string, string> | null {
  const selection = timedCreateSelection.value;
  if (!selection?.active || !selection.passedThreshold) return null;
  if (selection.dayKey !== dayKey) return null;

  const fromQuarter = Math.min(selection.startQuarter, selection.endQuarter);
  const toQuarter = Math.max(selection.startQuarter, selection.endQuarter);
  const quarterHeight = CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT / QUARTERS_PER_HOUR;

  const rawTop = fromQuarter * quarterHeight;
  const top = isInactiveHoursCollapsed.value
    ? Math.max(0, rawTop - INACTIVE_HOURS_OFFSET)
    : rawTop;

  return {
    top: `${top}px`,
    height: `${(toQuarter - fromQuarter + 1) * quarterHeight}px`
  };
}

function handleCreateSelectionMouseMove(event: MouseEvent) {
  const timedSelection = timedCreateSelection.value;
  if (timedSelection?.active && !timedSelection.passedThreshold) {
    const dx = event.clientX - timedSelection.startX;
    const dy = event.clientY - timedSelection.startY;
    if (Math.hypot(dx, dy) >= CREATE_SELECTION_THRESHOLD_PX) {
      timedSelection.passedThreshold = true;
    }
    const quarter = getQuarterFromClientY(timedSelection.dayKey, event.clientY);
    if (quarter !== null) {
      timedSelection.endQuarter = quarter;
    }
    return;
  }

  if (timedSelection?.active) {
    const quarter = getQuarterFromClientY(timedSelection.dayKey, event.clientY);
    if (quarter !== null) {
      timedSelection.endQuarter = quarter;
    }
    return;
  }

  const allDaySelection = allDayCreateSelection.value;
  if (allDaySelection?.active && !allDaySelection.passedThreshold) {
    const dx = event.clientX - allDaySelection.startX;
    const dy = event.clientY - allDaySelection.startY;
    if (Math.hypot(dx, dy) >= CREATE_SELECTION_THRESHOLD_PX) {
      allDaySelection.passedThreshold = true;
    }
  }
}

function getQuarterFromClientY(dayKey: string, clientY: number): number | null {
  const dayColumn = document.querySelector(`.day-column[data-day-key="${dayKey}"]`) as HTMLElement | null;
  if (!dayColumn) return null;
  const rect = dayColumn.getBoundingClientRect();
  const dayHeight = CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT * 24;
  const offsetY = Math.max(0, Math.min(clientY - rect.top, dayHeight - 1));
  const adjustedOffset = isInactiveHoursCollapsed.value
    ? offsetY + INACTIVE_HOURS_OFFSET
    : offsetY;
  return Math.floor(adjustedOffset / (CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT / QUARTERS_PER_HOUR));
}

function quarterToTime(quarter: number): string {
  const clampedQuarter = Math.max(0, Math.min(TOTAL_QUARTERS_PER_DAY - 1, quarter));
  const totalMinutes = clampedQuarter * MINUTES_PER_QUARTER;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function quarterToEndTime(quarter: number): string {
  const clampedQuarter = Math.max(0, Math.min(TOTAL_QUARTERS_PER_DAY - 1, quarter));
  const endMinutes = (clampedQuarter + 1) * MINUTES_PER_QUARTER;
  if (endMinutes >= 24 * 60) {
    return '23:59';
  }
  const hour = Math.floor(endMinutes / 60);
  const minute = endMinutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function finishCreateSelection() {
  if (timedCreateSelection.value?.active) {
    const selection = timedCreateSelection.value;
    const passedThreshold = selection.passedThreshold;
    const startQuarter = Math.min(selection.startQuarter, selection.endQuarter);
    const endQuarter = Math.max(selection.startQuarter, selection.endQuarter);
    const startTime = quarterToTime(startQuarter);
    const dueTime = quarterToEndTime(endQuarter);
    timedCreateSelection.value = null;
    if (!passedThreshold) return;

    emit('taskCreateRequested', {
      startDate: selection.dayKey,
      dueDate: selection.dayKey,
      startTime,
      dueTime,
      allDay: false
    });
    return;
  }

  if (allDayCreateSelection.value?.active) {
    const selection = allDayCreateSelection.value;
    const passedThreshold = selection.passedThreshold;
    const from = selection.startDay <= selection.endDay ? selection.startDay : selection.endDay;
    const to = selection.startDay <= selection.endDay ? selection.endDay : selection.startDay;
    allDayCreateSelection.value = null;
    if (!passedThreshold) return;

    emit('taskCreateRequested', {
      startDate: from,
      dueDate: to,
      allDay: true
    });
  }
}

const timedTaskRenderItemsByDay = computed(() => {
  const grouped = new Map<string, TimedTaskRenderItem[]>();
  
  for (const day of weekDays.value) {
    grouped.set(day.key, []);
  }
  
  for (const timedRange of timedTaskRanges.value) {
    const { task, taskStartDate, taskDueDate, startDate, endDate } = timedRange;
    if (!taskStartDate || !taskDueDate) continue;
    
    for (const day of weekDays.value) {
      const dayDate = new Date(day.date);
      dayDate.setHours(0, 0, 0, 0);
      
      if (dayDate >= startDate && dayDate <= endDate) {
        const isStartDay = day.key === taskStartDate;
        const isEndDay = day.key === taskDueDate;
        
        const renderStartDate = isStartDay ? taskStartDate : day.key;
        const renderDueDate = isEndDay ? taskDueDate : day.key;
        const renderStartTime = isStartDay ? (task.startTime || '00:00') : '00:00';
        const renderDueTime = isEndDay ? (task.dueTime || '23:59') : '23:59';
        
        grouped.get(day.key)!.push({
          task,
          renderDate: day.key,
          renderStartDate,
          renderStartTime,
          renderDueDate,
          renderDueTime
        });
      }
    }
  }

  return grouped;
});

const tasksByDay = computed(() => {
  const grouped = new Map<string, TimedTaskRenderItem[]>();

  for (const day of weekDays.value) {
    const dayItems = timedTaskRenderItemsByDay.value.get(day.key) || [];
    grouped.set(day.key, assignTimedTaskFocusTrackReserve(assignTimedTaskLanes(dayItems), weekLifelogTimelineByDay.value.get(day.key) || []));
  }
  
  return grouped;
});

const focusSessionsByDay = computed(() => {
  const grouped = new Map<string, FocusCalendarEvent[]>();
  for (const day of weekDays.value) {
    grouped.set(day.key, []);
  }

  if (!showFocusRecords.value) {
    return grouped;
  }

  for (const record of focusSessionRecords.value) {
    const event = focusRecordToLifelogEvent(record, t('focusTimer.title'));
    if (!event || !grouped.has(event.date)) {
      continue;
    }
    if (record.targetType === 'habit' && record.targetId) {
      const note = habitFocusNotesByKey.value.get(
        getHabitFocusNoteKey(record.targetId, record.date, getFocusSessionRecordId(record))
      );
      if (note) {
        event.note = note;
      }
    }
    grouped.get(event.date)!.push(event);
  }

  for (const [date, sessions] of grouped) {
    grouped.set(date, assignFocusSessionLanes(sessions));
  }
  return grouped;
});

const allWeekLifelogEvents = computed<WeekLifelogEvent[]>(() => [
  ...(showFocusRecords.value ? Array.from(focusSessionsByDay.value.values()).flat() : []),
  ...(showLifelog.value && showHabits.value ? habitsToLifelogEvents(habitRecords.value) : []),
  ...(showLifelog.value ? tasksToCompletedLifelogEvents(taskCompletedLifelogSourceTasks.value) : []),
  ...(showLifelog.value ? moodManualEntriesToLifelogEvents(moodRecords.value) : [])
]);

const weekLifelogTimelineByDay = computed(() => {
  const grouped = new Map<string, WeekLifelogTimelineItem[]>();
  for (const day of weekDays.value) {
    grouped.set(day.key, []);
  }

  for (const event of allWeekLifelogEvents.value) {
    if (!grouped.has(event.date)) {
      continue;
    }
    const item = lifelogEventToWeekTimelineItem(event);
    if (item) {
      grouped.get(event.date)!.push(item);
    }
  }

  for (const [date, items] of grouped) {
    grouped.set(date, assignWeekLifelogTimelineLayout(
      items,
      timedTaskRenderItemsByDay.value.get(date) || []
    ));
  }

  return grouped;
});

function formatTimelineTime(minutes: number): string {
  const normalized = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)));
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function getDateTimeMinutes(value: string | undefined, fallbackMinutes: number): number {
  if (!value) {
    return fallbackMinutes;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallbackMinutes;
  }
  return date.getHours() * 60 + date.getMinutes();
}

function getTimestampMinutes(value: unknown, fallbackMinutes: number): number {
  const rawTimestamp = typeof value === 'number'
    ? value
    : (typeof value === 'string' && value.trim() ? Number(value) : Number.NaN);
  if (!Number.isFinite(rawTimestamp) || rawTimestamp <= 0) {
    return fallbackMinutes;
  }
  const timestamp = rawTimestamp < 1_000_000_000_000 ? rawTimestamp * 1000 : rawTimestamp;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return fallbackMinutes;
  }
  return date.getHours() * 60 + date.getMinutes();
}

function getEventTimestampMinutes(event: WeekLifelogEvent): number {
  if (event.type === 'focus') {
    return timeToMinutes(event.startTime);
  }
  if (event.type === 'task-completed') {
    return getDateTimeMinutes(event.completedAt, 20 * 60);
  }
  if (event.type === 'manual-note') {
    return getDateTimeMinutes(event.createdAt || event.updatedAt, 21 * 60);
  }
  if (event.type === 'habit-checkin') {
    return getTimestampMinutes(event.metadata?.timestamp, 7 * 60);
  }
  return 7 * 60;
}

function getWeekLifelogIcon(type: LifelogEventType): string {
  if (type === 'focus') {
    return 'timer';
  }
  if (type === 'habit-checkin') {
    return 'squareCheck';
  }
  if (type === 'task-completed') {
    return 'taskCheckboxChecked';
  }
  return 'descriptionBubble';
}

function getWeekLifelogNote(event: WeekLifelogEvent): string {
  if (event.type === 'task-completed') {
    return typeof event.note === 'string' ? event.note : '';
  }
  if (event.type === 'habit-checkin') {
    const checkinCount = event.checkinIndex || event.completedCount;
    const statusText = event.completed ? t('habitTracker.checkedIn') : t('habitTracker.scheduledCheckin');
    const progress = event.targetCount > 1
      ? `${checkinCount}/${event.targetCount}${t('habitTracker.timesSuffix')}`
      : statusText;
    return event.note ? `${progress} · ${event.note}` : progress;
  }
  return typeof event.note === 'string' ? event.note : '';
}

function getWeekLifelogTimeLabel(event: WeekLifelogEvent, startTime: string, endTime: string): string {
  if (event.type === 'focus') {
    return `${startTime} - ${endTime}`;
  }
  return startTime;
}

function getWeekLifelogEventNote(event: WeekLifelogEvent): string {
  if (event.type === 'habit-checkin') {
    return typeof event.note === 'string' ? event.note : '';
  }
  return getWeekLifelogNote(event);
}

function getTaskCompletedSourceTask(event: TaskCompletedLifelogEvent): Task | null {
  return taskCompletedLifelogSourceTaskById.value.get(event.taskId)
    || (event.blockId ? taskCompletedLifelogSourceTaskByBlockId.value.get(event.blockId) : null)
    || null;
}

function getTaskCompletedEventGroupId(event: TaskCompletedLifelogEvent): string {
  const groupId = event.metadata?.groupId;
  return typeof groupId === 'string' ? groupId.trim() : '';
}

function getTaskCompletedTagLabels(event: TaskCompletedLifelogEvent): string[] {
  const sourceTask = getTaskCompletedSourceTask(event);
  return resolveTaskTagIds(
    sourceTask ? sourceTask.tags : event.tags,
    sourceTask?.groupId || getTaskCompletedEventGroupId(event)
  )
    .map(tagId => taskGroupNameById.value.get(tagId) || '')
    .filter(Boolean);
}

function formatTaskCompletedGoalLabel(goal: Goal): string {
  const name = typeof goal.name === 'string' && goal.name.trim()
    ? goal.name.trim()
    : t('taskManager.untitledGoal');
  const emoji = typeof goal.emoji === 'string' ? goal.emoji.trim() : '';
  return emoji ? `${emoji} ${name}` : name;
}

function getTaskCompletedGoalLabels(event: TaskCompletedLifelogEvent): string[] {
  const sourceTask = getTaskCompletedSourceTask(event);
  const goalSource = sourceTask || {
    id: event.taskId,
    taskId: event.taskId,
    blockId: event.blockId,
    title: event.title
  };
  return getGoalIdsForTask(props.goals || [], goalSource)
    .map(goalId => goalById.value.get(goalId))
    .filter((goal): goal is Goal => Boolean(goal))
    .map(formatTaskCompletedGoalLabel);
}

function formatTaskCompletedLifelogMeta(event: TaskCompletedLifelogEvent): string {
  const detailLabels = [
    ...getTaskCompletedTagLabels(event),
    ...getTaskCompletedGoalLabels(event)
  ];
  return [
    t('taskManager.statusCompleted'),
    ...detailLabels
  ].join(' · ');
}

function getLifelogTimelineMeta(event: WeekLifelogEvent): string {
  if (event.type === 'focus') {
    return `${t('focusTimer.title')} · ${Math.max(0, Math.round(event.minutes || 0))}m`;
  }
  if (event.type === 'habit-checkin') {
    const checkinCount = event.checkinIndex || event.completedCount;
    if (!event.completed) {
      return event.targetCount > 1
        ? `${t('habitTracker.scheduledCheckin')} · ${checkinCount}/${event.targetCount}${t('habitTracker.timesSuffix')}`
        : t('habitTracker.scheduledCheckin');
    }
    return event.targetCount > 1
      ? `${t('habitTracker.checkedIn')} · ${checkinCount}/${event.targetCount}${t('habitTracker.timesSuffix')}`
      : t('habitTracker.checkedIn');
  }
  if (event.type === 'task-completed') {
    return formatTaskCompletedLifelogMeta(event);
  }
  return t('monthView.lifelogManualNote');
}

function lifelogEventToTimelineListItem(event: WeekLifelogEvent): LifelogTimelinePanelItem | null {
  const startMinutes = getEventTimestampMinutes(event);
  const startTime = event.type === 'focus' ? event.startTime : formatTimelineTime(startMinutes);
  const endMinutes = event.type === 'focus'
    ? Math.max(startMinutes + 15, timeToMinutes(event.endTime))
    : startMinutes;
  const endTime = event.type === 'focus' ? event.endTime : formatTimelineTime(endMinutes);
  const title = event.type === 'manual-note'
    ? t('monthView.lifelogManualNote')
    : event.title;

  return {
    id: `${event.type}-${event.id}`,
    type: event.type,
    date: event.date,
    timeLabel: getWeekLifelogTimeLabel(event, startTime, endTime),
    sortMinutes: startMinutes,
    title,
    meta: getLifelogTimelineMeta(event),
    note: event.type === 'manual-note' ? event.text : getWeekLifelogEventNote(event),
    icon: event.type === 'habit-checkin' && !event.completed ? 'square' : getWeekLifelogIcon(event.type),
    emoji: event.type === 'manual-note' ? event.emoji : undefined,
    moodSvg: event.type === 'manual-note' && event.emoji ? getMoodSvg(event.emoji, 'large') : undefined,
    sourceId: event.type === 'manual-note' ? event.id : event.sourceId,
    deletable: event.type === 'manual-note' || event.type === 'focus'
  };
}

const lifelogTimelinePanelOpen = computed(() =>
  Boolean(lifelogTimelineDayKey.value) && (showLifelog.value || showFocusRecords.value)
);

const lifelogTimelineItems = computed(() => {
  const dayKey = lifelogTimelineDayKey.value;
  if (!dayKey) {
    return [];
  }

  return allWeekLifelogEvents.value
    .filter(event => event.date === dayKey)
    .map(event => lifelogEventToTimelineListItem(event))
    .filter((item): item is LifelogTimelinePanelItem => Boolean(item))
    .sort((left, right) => {
      if (left.sortMinutes !== right.sortMinutes) {
        return left.sortMinutes - right.sortMinutes;
      }
      return left.title.localeCompare(right.title, 'zh-Hans-CN');
    });
});

const lifelogTimelineDayTitle = computed(() => {
  const day = lifelogTimelineDayKey.value ? weekDays.value.find(item => item.key === lifelogTimelineDayKey.value) : null;
  if (!day) {
    return '';
  }
  return `${day.weekdayName} · ${day.key}`;
});

const lifelogTimelineSubtitle = computed(() => formatTemplate('weekView.lifelogTimelineCountTemplate', {
  count: lifelogTimelineItems.value.length
}));

const lifelogTimelineDateStripDays = computed<LifelogTimelineDateStripDay[]>(() => (
  weekDays.value.map(day => ({
    date: day.key,
    weekdayLabel: day.weekdayName,
    dayNumber: day.dayNumber,
    ariaLabel: `${day.weekdayName} ${day.key}`,
    selected: day.key === lifelogTimelineDayKey.value,
    today: day.isToday,
    hasRecord: allWeekLifelogEvents.value.some(event => event.date === day.key)
  }))
));

const lifelogTimelineDraft = computed(() => (
  lifelogTimelineDayKey.value ? getManualLifelogDraft(lifelogTimelineDayKey.value) : ''
));

function getManualLifelogDraft(dayKey: string): string {
  return manualLifelogDrafts.value[dayKey] || '';
}

function updateLifelogTimelineDraft(value: string): void {
  if (!lifelogTimelineDayKey.value) {
    return;
  }
  manualLifelogDrafts.value = {
    ...manualLifelogDrafts.value,
    [lifelogTimelineDayKey.value]: value
  };
}

function clearManualLifelogDraft(dayKey: string): void {
  const nextDrafts = { ...manualLifelogDrafts.value };
  delete nextDrafts[dayKey];
  manualLifelogDrafts.value = nextDrafts;
}

function clearLifelogTimelineDraft(): void {
  if (lifelogTimelineDayKey.value) {
    clearManualLifelogDraft(lifelogTimelineDayKey.value);
  }
}

async function persistMoodRecords(nextMoodData: MoodData): Promise<void> {
  await saveMoodData(nextMoodData);
  moodRecords.value = nextMoodData;
  eventBus.emit(Events.MOOD_UPDATED, { moodData: nextMoodData });
}

async function saveManualLifelogDraft(dayKey: string): Promise<void> {
  const text = getManualLifelogDraft(dayKey).trim();
  if (!dayKey || !text) {
    return;
  }

  const now = new Date().toISOString();
  const entry: MoodManualEntry = {
    id: `mood-entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    createdAt: now,
    updatedAt: now
  };

  try {
    const existingEntry = moodRecords.value[dayKey] || { emoji: '', note: '', timestamp: now };
    const nextMoodData: MoodData = {
      ...moodRecords.value,
      [dayKey]: {
        ...existingEntry,
        timestamp: existingEntry.timestamp || now,
        entries: [...(existingEntry.entries || []), entry]
      }
    };
    await persistMoodRecords(nextMoodData);
    clearManualLifelogDraft(dayKey);
  } catch (error) {
    console.error('[WeekView] Failed to save manual lifelog entry', error);
  }
}

function saveLifelogTimelineDraft(): void {
  if (lifelogTimelineDayKey.value) {
    void saveManualLifelogDraft(lifelogTimelineDayKey.value);
  }
}

async function deleteManualLifelogEntry(entryId: string): Promise<void> {
  if (!entryId) {
    return;
  }
  let changed = false;
  const nextMoodData: MoodData = {};
  for (const [date, entry] of Object.entries(moodRecords.value)) {
    const entries = Array.isArray(entry.entries)
      ? entry.entries.filter(item => item.id !== entryId)
      : [];
    if ((entry.entries || []).length !== entries.length) {
      changed = true;
    }
    nextMoodData[date] = {
      ...entry,
      ...(entries.length > 0 ? { entries } : { entries: undefined })
    };
  }

  if (!changed) {
    return;
  }

  try {
    await persistMoodRecords(nextMoodData);
  } catch (error) {
    console.error('[WeekView] Failed to delete manual lifelog entry', error);
  }
}

async function deleteFocusLifelogSession(sessionId: string): Promise<void> {
  if (!sessionId) {
    return;
  }

  try {
    const deleted = await deleteFocusSessionRecord(sessionId);
    if (!deleted) {
      return;
    }
    focusSessionRecords.value = focusSessionRecords.value.filter(record => record.id !== sessionId);
    window.dispatchEvent(new CustomEvent('pinch-focus-session'));
  } catch (error) {
    console.error('[WeekView] Failed to delete focus session', error);
  }
}

function deleteLifelogTimelineItem(item: LifelogTimelinePanelItem): void {
  if (!item.sourceId) {
    return;
  }
  if (item.type === 'focus') {
    void deleteFocusLifelogSession(item.sourceId);
    return;
  }
  void deleteManualLifelogEntry(item.sourceId);
}

function openLifelogTimeline(dayKey: string): void {
  lifelogTimelineDayKey.value = dayKey;
}

function closeLifelogTimeline(): void {
  lifelogTimelineDayKey.value = null;
}

function changeLifelogTimelinePeriod(offset: number): void {
  const currentIndex = weekDays.value.findIndex(day => day.key === lifelogTimelineDayKey.value);
  const selectedIndex = currentIndex >= 0 ? currentIndex : 0;
  hideAllDayExpandedPanel();
  const offsetDays = resolveNavigationOffsetDays() * (offset < 0 ? -1 : 1);
  const newDate = new Date(currentWeekStart.value);
  newDate.setDate(newDate.getDate() + offsetDays);
  currentWeekStart.value = newDate;

  const nextSelectedDate = new Date(newDate);
  nextSelectedDate.setDate(newDate.getDate() + selectedIndex);
  const year = nextSelectedDate.getFullYear();
  const month = String(nextSelectedDate.getMonth() + 1).padStart(2, '0');
  const day = String(nextSelectedDate.getDate()).padStart(2, '0');
  lifelogTimelineDayKey.value = `${year}-${month}-${day}`;
}

function lifelogEventToWeekTimelineItem(event: WeekLifelogEvent): WeekLifelogTimelineItem | null {
  const startMinutes = getEventTimestampMinutes(event);
  const endMinutes = event.type === 'focus'
    ? Math.max(startMinutes + 15, timeToMinutes(event.endTime))
    : startMinutes + 18;
  const startTime = event.type === 'focus' ? event.startTime : formatTimelineTime(startMinutes);
  const endTime = event.type === 'focus' ? event.endTime : formatTimelineTime(endMinutes);
  const title = event.title;
  const emoji = event.type === 'manual-note' ? event.emoji : undefined;
  const moodSvg = emoji ? getMoodSvg(emoji, 'large') : '';

  return {
    id: `${event.type}-${event.id}`,
    type: event.type,
    date: event.date,
    title,
    startTime,
    endTime,
    timeLabel: getWeekLifelogTimeLabel(event, startTime, endTime),
    note: getWeekLifelogEventNote(event),
    icon: getWeekLifelogIcon(event.type),
    emoji,
    moodSvg,
    event
  };
}

function getWeekLifelogVisualMinutes(item: WeekLifelogTimelineItem): number {
  const text = `${item.title || ''} ${item.note || ''}`.trim();
  const estimatedLines = text
    ? Math.ceil(text.length / WEEK_LIFELOG_TEXT_CHARS_PER_LINE)
    : 1;
  return Math.max(
    WEEK_LIFELOG_MIN_VISUAL_MINUTES,
    WEEK_LIFELOG_MINUTES_PER_TEXT_LINE * Math.min(6, estimatedLines)
  );
}

function assignWeekLifelogTimelineLanes(items: WeekLifelogTimelineItem[]): WeekLifelogTimelineItem[] {
  if (items.length <= 1) {
    return items.map(item => ({ ...item, laneIndex: 0, laneCount: 1 }));
  }

  const normalized = items
    .map((item) => {
      const start = timeToMinutes(item.startTime);
      const end = Math.max(start + getWeekLifelogVisualMinutes(item), timeToMinutes(item.endTime));
      return { item, start, end };
    })
    .sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      if (a.end !== b.end) return a.end - b.end;
      return a.item.title.localeCompare(b.item.title);
    });

  const result: WeekLifelogTimelineItem[] = [];
  let cluster: typeof normalized = [];
  let clusterEnd = -1;

  const flushCluster = () => {
    if (cluster.length === 0) return;
    const laneEnds: number[] = [];
    const assigned: Array<{ item: WeekLifelogTimelineItem; laneIndex: number }> = [];

    for (const entry of cluster) {
      let laneIndex = laneEnds.findIndex(end => end <= entry.start);
      if (laneIndex === -1) {
        laneIndex = laneEnds.length;
        laneEnds.push(entry.end);
      } else {
        laneEnds[laneIndex] = entry.end;
      }
      assigned.push({ item: entry.item, laneIndex });
    }

    const laneCount = Math.max(1, laneEnds.length);
    for (const { item, laneIndex } of assigned) {
      result.push({ ...item, laneIndex, laneCount });
    }
  };

  for (const entry of normalized) {
    if (cluster.length === 0 || entry.start < clusterEnd) {
      cluster.push(entry);
      clusterEnd = Math.max(clusterEnd, entry.end);
      continue;
    }
    flushCluster();
    cluster = [entry];
    clusterEnd = entry.end;
  }

  flushCluster();
  return result;
}

function assignWeekLifelogTimelineLayout(
  items: WeekLifelogTimelineItem[],
  timedItems: TimedTaskRenderItem[]
): WeekLifelogTimelineItem[] {
  if (items.length === 0) {
    return [];
  }

  const trackGroups = new Map<WeekLifelogTimelineTrack, WeekLifelogTimelineItem[]>([
    ['full', []],
    ['focus', []]
  ]);

  for (const item of items) {
    const layoutTrack: WeekLifelogTimelineTrack = weekLifelogItemOverlapsTimedTaskItems(item, timedItems)
      ? 'focus'
      : 'full';
    trackGroups.get(layoutTrack)!.push({ ...item, layoutTrack });
  }

  const assignedById = new Map<string, WeekLifelogTimelineItem>();
  for (const group of trackGroups.values()) {
    for (const assigned of assignWeekLifelogTimelineLanes(group)) {
      assignedById.set(assigned.id, assigned);
    }
  }

  return items.map(item => assignedById.get(item.id) || item);
}

function getTimedTaskStyle(item: TimedTaskRenderItem) {
  const startTime = item.renderStartTime;
  const endTime = item.renderDueTime;
  
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const visibleStartMinutes = isInactiveHoursCollapsed.value
    ? timeToMinutes('06:00')
    : 0;
  const visibleEndMinutes = 24 * 60;
  const clippedStartMinutes = Math.max(startMinutes, visibleStartMinutes);
  const clippedEndMinutes = Math.min(Math.max(endMinutes, clippedStartMinutes + 1), visibleEndMinutes);

  const rawTop = clippedStartMinutes * CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT / 60;
  const top = isInactiveHoursCollapsed.value
    ? Math.max(0, rawTop - INACTIVE_HOURS_OFFSET)
    : rawTop;
  const height = Math.max(CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT, (clippedEndMinutes - clippedStartMinutes) * CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT / 60);

  const effectiveBackgroundColor = resolveEffectiveTaskBackgroundColor(item.task, props.taskGroups);
  const bgColor = resolveTaskBackgroundColor(effectiveBackgroundColor);

  const laneCount = Math.max(1, item.laneCount || 1);
  const laneIndex = Math.min(Math.max(0, item.laneIndex || 0), laneCount - 1);
  const laneGap = 4;
  const totalGap = (laneCount - 1) * laneGap;
  const focusTrackReserve = item.focusTrackReserved
    ? 'var(--focus-track-width)'
    : '0px';
  const horizontalInset = focusTrackReserve === '0px' ? 10 : 12;
  
  const style: Record<string, string> = {
    top: `${top}px`,
    height: `${height}px`,
    background: bgColor,
    '--pinch-task-chip-color': resolveTaskAccentColor(effectiveBackgroundColor)
  };

  if (laneCount === 1) {
    style.left = '4px';
    style.right = focusTrackReserve === '0px' ? '4px' : `calc(${focusTrackReserve} + 8px)`;
    return style;
  }

  const laneWidth = `calc((100% - ${focusTrackReserve} - ${horizontalInset}px - ${totalGap}px) / ${laneCount})`;
  style.left = `calc(4px + ${laneIndex} * (${laneWidth} + ${laneGap}px))`;
  style.width = laneWidth;
  style.right = 'auto';
  return style;
}

function getTaskTimeRange(item: TimedTaskRenderItem) {
  const startTime = item.renderStartTime;
  const endTime = item.renderDueTime;
  return `${startTime} - ${endTime}`;
}

function timeRangeOverlapsWeekLifelogItem(
  startTime: string,
  endTime: string,
  lifelogItem: WeekLifelogTimelineItem
): boolean {
  const startA = timeToMinutes(startTime);
  const endA = Math.max(startA + 1, timeToMinutes(endTime));
  const startB = timeToMinutes(lifelogItem.startTime);
  const endB = Math.max(startB + getWeekLifelogVisualMinutes(lifelogItem), timeToMinutes(lifelogItem.endTime));
  return startA < endB && startB < endA;
}

function assignTimedTaskFocusTrackReserve(
  items: TimedTaskRenderItem[],
  lifelogItems: WeekLifelogTimelineItem[]
): TimedTaskRenderItem[] {
  if (items.length === 0 || lifelogItems.length === 0) {
    return items.map(item => ({ ...item, focusTrackReserved: false }));
  }

  const normalized = items
    .map((item) => {
      const start = timeToMinutes(item.renderStartTime);
      const end = Math.max(start + 1, timeToMinutes(item.renderDueTime));
      return { item, start, end };
    })
    .sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return a.end - b.end;
    });

  const result: TimedTaskRenderItem[] = [];
  let cluster: typeof normalized = [];
  let clusterEnd = -1;

  const flushCluster = () => {
    if (cluster.length === 0) return;
    const shouldReserveFocusTrack = cluster.some(({ item }) => (
      lifelogItems.some(lifelogItem => timeRangeOverlapsWeekLifelogItem(
        item.renderStartTime,
        item.renderDueTime,
        lifelogItem
      ))
    ));

    for (const { item } of cluster) {
      result.push({ ...item, focusTrackReserved: shouldReserveFocusTrack });
    }
  };

  for (const entry of normalized) {
    if (cluster.length === 0 || entry.start < clusterEnd) {
      cluster.push(entry);
      clusterEnd = Math.max(clusterEnd, entry.end);
      continue;
    }

    flushCluster();
    cluster = [entry];
    clusterEnd = entry.end;
  }

  flushCluster();
  return result;
}

function weekLifelogItemOverlapsTimedTaskItems(
  lifelogItem: WeekLifelogTimelineItem,
  items: TimedTaskRenderItem[]
): boolean {
  return items.some(taskItem => timeRangeOverlapsWeekLifelogItem(
    taskItem.renderStartTime,
    taskItem.renderDueTime,
    lifelogItem
  ));
}

function weekLifelogItemOverlapsTimedTask(lifelogItem: WeekLifelogTimelineItem): boolean {
  return weekLifelogItemOverlapsTimedTaskItems(
    lifelogItem,
    timedTaskRenderItemsByDay.value.get(lifelogItem.date) || []
  );
}

function getWeekLifelogTimelineItemStyle(item: WeekLifelogTimelineItem): Record<string, string> {
  const startMinutes = timeToMinutes(item.startTime);
  const endMinutes = timeToMinutes(item.endTime);
  const visibleStartMinutes = isInactiveHoursCollapsed.value
    ? timeToMinutes('06:00')
    : 0;
  const visibleEndMinutes = 24 * 60;
  const clippedStartMinutes = Math.max(startMinutes, visibleStartMinutes);
  const rawTop = clippedStartMinutes * CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT / 60;
  const top = isInactiveHoursCollapsed.value
    ? Math.max(0, rawTop - INACTIVE_HOURS_OFFSET)
    : rawTop;
  const visualEndMinutes = Math.max(endMinutes, startMinutes + getWeekLifelogVisualMinutes(item));
  const clippedVisualEndMinutes = Math.min(Math.max(visualEndMinutes, clippedStartMinutes + 1), visibleEndMinutes);
  const height = (clippedVisualEndMinutes - clippedStartMinutes) * CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT / 60;
  const laneCount = Math.max(1, item.laneCount || 1);
  const laneIndex = Math.min(Math.max(0, item.laneIndex || 0), laneCount - 1);
  const laneGap = 4;
  const totalGap = (laneCount - 1) * laneGap;
  const overlapsTask = item.layoutTrack
    ? item.layoutTrack === 'focus'
    : weekLifelogItemOverlapsTimedTask(item);
  const trackWidth = overlapsTask ? 'var(--focus-track-width)' : '100%';
  const laneWidth = `calc((${trackWidth} - 10px - ${totalGap}px) / ${laneCount})`;

  const style: Record<string, string> = {
    top: `${top}px`,
    minHeight: `${height}px`,
    width: laneWidth
  };

  style.left = overlapsTask
    ? `calc(100% - var(--focus-track-width) + 4px + ${laneIndex} * (${laneWidth} + ${laneGap}px))`
    : `calc(4px + ${laneIndex} * (${laneWidth} + ${laneGap}px))`;

  return style;
}

function getWeekLifelogItemTitle(item: WeekLifelogTimelineItem): string {
  if (item.type === 'habit-checkin' || item.type === 'task-completed') {
    return item.title || (item.type === 'habit-checkin' ? t('habitTracker.checkedIn') : t('taskManager.statusCompleted'));
  }
  if (item.type === 'manual-note') {
    return item.note ? `${item.timeLabel}\n${item.note}` : item.timeLabel;
  }
  const baseTitle = `${item.timeLabel} · ${item.title}`;
  return item.note ? `${baseTitle}\n${item.note}` : baseTitle;
}

function shouldShowWeekLifelogTimelineItem(item: WeekLifelogTimelineItem): boolean {
  if (!isInactiveHoursCollapsed.value) {
    return true;
  }

  const visibleStartMinutes = timeToMinutes('06:00');
  const startMinutes = timeToMinutes(item.startTime);
  const endMinutes = timeToMinutes(item.endTime);
  return endMinutes > visibleStartMinutes && startMinutes < 24 * 60;
}

function handleWeekLifelogContextMenu(item: WeekLifelogTimelineItem): void {
  if (item.event.type === 'focus') {
    emit('focusSessionContextmenu', item.event);
  }
}

function shouldShowTimedTaskItem(item: TimedTaskRenderItem): boolean {
  if (!isInactiveHoursCollapsed.value) {
    return true;
  }

  const visibleStartMinutes = timeToMinutes('06:00');
  const startMinutes = timeToMinutes(item.renderStartTime);
  const endMinutes = timeToMinutes(item.renderDueTime);
  return endMinutes > visibleStartMinutes && startMinutes < 24 * 60;
}

function isMobileAllDayTaskSelected(taskId: string): boolean {
  return selectedMobileAllDayTaskId.value === taskId;
}

function shouldShowMobileAllDayTaskControls(taskId: string): boolean {
  return isMobileAllDayTaskInteractionEnabled.value && isMobileAllDayTaskSelected(taskId);
}

function selectMobileAllDayTask(taskId: string | null): void {
  selectedMobileAllDayTaskId.value = taskId;
}

function isMobileTimedTaskSelected(taskId: string): boolean {
  return selectedMobileTimedTaskId.value === taskId;
}

function shouldShowMobileTimedTaskControls(taskId: string): boolean {
  return isMobileTimedTaskInteractionEnabled.value && isMobileTimedTaskSelected(taskId);
}

function selectMobileTimedTask(taskId: string | null): void {
  selectedMobileTimedTaskId.value = taskId;
}

function buildMobileTimedTaskRepeatSnapshot(task: Task): MobileTimedTaskRepeatSnapshot | null {
  if (!task.repeatSeriesId) {
    return null;
  }
  const entries = localTasks.value
    .filter(candidate => candidate.repeatSeriesId === task.repeatSeriesId)
    .map((candidate) => {
      const startDate = candidate.startDate || candidate.dueDate || '';
      const dueDate = candidate.dueDate || candidate.startDate || startDate;
      const hasExplicitDueDate = typeof candidate.dueDate === 'string' && candidate.dueDate.trim().length > 0;
      if (!startDate || !dueDate) {
        return null;
      }
      return {
        id: candidate.id,
        isVirtual: !!candidate.isVirtual,
        repeatInstanceDate: candidate.repeatInstanceDate,
        startDate,
        dueDate,
        hasExplicitDueDate,
        startTime: candidate.startTime,
        dueTime: candidate.dueTime
      } as MobileTimedTaskRepeatSnapshotEntry;
    })
    .filter((entry): entry is MobileTimedTaskRepeatSnapshotEntry => !!entry);
  if (entries.length === 0) {
    return null;
  }
  return {
    seriesId: task.repeatSeriesId,
    entries
  };
}

function restoreMobileTimedTaskRepeatSnapshot(snapshot: MobileTimedTaskRepeatSnapshot): void {
  for (const entry of snapshot.entries) {
    patchLocalTask(entry.id, {
      repeatInstanceDate: entry.isVirtual ? entry.repeatInstanceDate : undefined,
      startDate: entry.startDate,
      dueDate: entry.hasExplicitDueDate ? entry.dueDate : undefined,
      startTime: entry.startTime,
      dueTime: entry.dueTime
    });
  }
}

function applyMobileTimedTaskRepeatHandlePreview(
  snapshot: MobileTimedTaskRepeatSnapshot,
  draggedTaskId: string,
  handleType: 'start' | 'end',
  targetDate: string,
  targetTime: string
): void {
  const anchorEntry = snapshot.entries.find(entry => entry.id === draggedTaskId);
  if (!anchorEntry) {
    return;
  }

  const anchorDate = handleType === 'start' ? anchorEntry.startDate : anchorEntry.dueDate;
  const anchorTime = handleType === 'start'
    ? (anchorEntry.startTime || '00:00')
    : (anchorEntry.dueTime || anchorEntry.startTime || '01:00');
  const anchorDateTime = new Date(`${anchorDate}T${anchorTime}`);
  const targetDateTime = new Date(`${targetDate}T${targetTime}`);
  const deltaMs = targetDateTime.getTime() - anchorDateTime.getTime();
  if (!Number.isFinite(deltaMs)) {
    return;
  }

  for (const entry of snapshot.entries) {
    const entryStartDateTime = new Date(`${entry.startDate}T${entry.startTime || '00:00'}`);
    const entryDueDateTime = new Date(`${entry.dueDate}T${entry.dueTime || entry.startTime || '01:00'}`);

    if (handleType === 'start') {
      const candidateStartMs = entryStartDateTime.getTime() + deltaMs;
      const maxStartMs = entryDueDateTime.getTime() - 15 * 60 * 1000;
      const nextStartDateTime = new Date(Math.min(candidateStartMs, maxStartMs));
      patchLocalTask(entry.id, {
        repeatInstanceDate: entry.isVirtual ? formatDate(nextStartDateTime) : undefined,
        startDate: formatDate(nextStartDateTime),
        startTime: formatTime(nextStartDateTime)
      });
      continue;
    }

    const candidateDueMs = entryDueDateTime.getTime() + deltaMs;
    const minDueMs = entryStartDateTime.getTime() + 15 * 60 * 1000;
    const nextDueDateTime = new Date(Math.max(candidateDueMs, minDueMs));
    const nextDueDate = formatDate(nextDueDateTime);
    patchLocalTask(entry.id, {
      dueDate: entry.hasExplicitDueDate || nextDueDate !== formatDate(entryStartDateTime)
        ? nextDueDate
        : undefined,
      dueTime: formatTime(nextDueDateTime)
    });
  }
}

function restoreMobileAllDayTaskPreview(gesture: MobileAllDayTaskGesture): void {
  if (gesture.repeatSeriesSnapshot) {
    restoreMobileTimedTaskRepeatSnapshot(gesture.repeatSeriesSnapshot);
    return;
  }
  patchLocalTask(gesture.task.id, {
    startDate: gesture.originalStartDate,
    dueDate: gesture.hasExplicitDueDate ? gesture.originalDueDate : undefined,
    startTime: gesture.originalStartTime,
    dueTime: gesture.originalDueTime
  }, { emit: false });
}

function applyMobileAllDayTaskRepeatMovePreview(
  snapshot: MobileTimedTaskRepeatSnapshot,
  deltaDays: number
): void {
  const updates = snapshot.entries.map((entry) => {
    const nextStartDate = shiftDate(entry.startDate, deltaDays);
    const effectiveDueDate = getEffectiveDueDate(entry.startDate, entry.hasExplicitDueDate ? entry.dueDate : null);
    const nextDueDate = shiftDate(effectiveDueDate, deltaDays);
    return {
      id: entry.id,
      patch: {
        repeatInstanceDate: entry.isVirtual ? nextStartDate : undefined,
        startDate: nextStartDate,
        dueDate: entry.hasExplicitDueDate || nextDueDate !== nextStartDate
          ? nextDueDate
          : undefined
      }
    };
  });

  patchLocalTasksBatch(updates, { emit: false });
}

function applyMobileAllDayTaskRepeatHandlePreview(
  snapshot: MobileTimedTaskRepeatSnapshot,
  draggedTaskId: string,
  handleType: 'start' | 'end',
  targetDate: string
): void {
  const anchorEntry = snapshot.entries.find(entry => entry.id === draggedTaskId);
  if (!anchorEntry) {
    return;
  }

  const anchorDate = handleType === 'start'
    ? anchorEntry.startDate
    : getEffectiveDueDate(anchorEntry.startDate, anchorEntry.hasExplicitDueDate ? anchorEntry.dueDate : null);
  const deltaDays = getDayDiff(anchorDate, targetDate);
  const updates = snapshot.entries.map((entry) => {
    const effectiveDueDate = getEffectiveDueDate(entry.startDate, entry.hasExplicitDueDate ? entry.dueDate : null);
    if (handleType === 'start') {
      let nextStartDate = shiftDate(entry.startDate, deltaDays);
      if (nextStartDate > effectiveDueDate) {
        nextStartDate = effectiveDueDate;
      }
      return {
        id: entry.id,
        patch: {
          repeatInstanceDate: entry.isVirtual ? nextStartDate : undefined,
          startDate: nextStartDate,
          dueDate: entry.hasExplicitDueDate || effectiveDueDate !== nextStartDate
            ? effectiveDueDate
            : undefined
        }
      };
    }

    let nextDueDate = shiftDate(effectiveDueDate, deltaDays);
    if (nextDueDate < entry.startDate) {
      nextDueDate = entry.startDate;
    }
    return {
      id: entry.id,
      patch: {
        dueDate: entry.hasExplicitDueDate || nextDueDate !== entry.startDate
          ? nextDueDate
          : undefined
      }
    };
  });

  patchLocalTasksBatch(updates, { emit: false });
}

function applyMobileAllDayTaskMovePreview(
  gesture: MobileAllDayTaskGesture,
  target: MobileTimedTaskDropTarget | null
): void {
  if (!target) {
    restoreMobileAllDayTaskPreview(gesture);
    return;
  }

  const deltaDays = getDayDiff(gesture.originalStartDate, target.day.key);
  if (gesture.repeatSeriesSnapshot) {
    if (target.kind === 'all-day') {
      applyMobileAllDayTaskRepeatMovePreview(gesture.repeatSeriesSnapshot, deltaDays);
      return;
    }
    applyMobileTimedTaskRepeatMovePreview(
      gesture.repeatSeriesSnapshot,
      deltaDays,
      target.startTime,
      false
    );
    return;
  }

  if (target.kind === 'all-day') {
    const nextDueDate = shiftDate(gesture.originalDueDate, deltaDays);
    patchLocalTask(gesture.task.id, {
      startDate: target.day.key,
      dueDate: gesture.hasExplicitDueDate || nextDueDate !== target.day.key
        ? nextDueDate
        : undefined,
      startTime: undefined,
      dueTime: undefined
    }, { emit: false });
    return;
  }

  patchLocalTask(gesture.task.id, {
    startDate: target.day.key,
    dueDate: target.dueDate,
    startTime: target.startTime,
    dueTime: target.dueTime
  }, { emit: false });
}

function resolveMobileAllDayTaskMoveTarget(point: ExternalTaskDropPoint): MobileTimedTaskDropTarget | null {
  const dropZoneCache = getWeekDropZoneCache();
  const allDayZone = findWeekDayHitZone(point, dropZoneCache.allDayZones);
  if (allDayZone) {
    return {
      kind: 'all-day',
      day: allDayZone.day,
      label: formatMobileTimedTaskDropLabel(allDayZone.day)
    };
  }

  const scrollElement = daysScrollRef.value;
  const scrollRect = getWeekScrollRect();
  if (!scrollElement || !scrollRect) {
    return null;
  }

  const timedZone = findWeekDayHitZone(point, dropZoneCache.timedDayZones);
  if (!timedZone) {
    return null;
  }
  const scrollTop = scrollElement.scrollTop;
  const offsetY = point.clientY - scrollRect.top + scrollTop;
  const inactiveOffsetMinutes = (isInactiveHoursCollapsed.value ? INACTIVE_HOURS_OFFSET : 0) * 60 / CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT;
  const totalMinutes = offsetY * 60 / CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT + inactiveOffsetMinutes;
  const snapMinutes = MOBILE_TIMED_TASK_SNAP_MINUTES;
  const snappedMinutes = Math.round(totalMinutes / snapMinutes) * snapMinutes;
  const maxStartMinutes = Math.max(0, 24 * 60 - snapMinutes);
  const clampedMinutes = Math.max(0, Math.min(maxStartMinutes, snappedMinutes));
  const hours = Math.floor(clampedMinutes / 60);
  const minutes = clampedMinutes % 60;
  const startTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  const startDateTime = new Date(`${timedZone.day.key}T${startTime}`);
  const dueDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
  const dueTime = formatTime(dueDateTime);
  const dueDate = formatDate(dueDateTime);
  return {
    kind: 'timed',
    day: timedZone.day,
    startTime,
    dueTime,
    dueDate,
    label: formatMobileTimedTaskDropLabel(timedZone.day, startTime, dueTime)
  };
}

function resolveMobileAllDayTaskDropTarget(point: ExternalTaskDropPoint): MobileAllDayTaskDropTarget | null {
  const dropZoneCache = getWeekDropZoneCache();
  const allDayZone = findWeekDayHitZone(point, dropZoneCache.allDayZones);
  if (allDayZone) {
    return {
      day: allDayZone.day,
      dayKey: allDayZone.dayKey,
      label: formatFullDateLabel(allDayZone.day.date)
    };
  }

  const timedZone = findWeekDayHitZone(point, dropZoneCache.timedDayZones);
  if (timedZone) {
    return {
      day: timedZone.day,
      dayKey: timedZone.dayKey,
      label: formatFullDateLabel(timedZone.day.date)
    };
  }

  const element = document.elementFromPoint(point.clientX, point.clientY) as HTMLElement | null;
  const dayKey = (element?.closest('.all-day-column[data-day-key], .day-column[data-day-key]') as HTMLElement | null)
    ?.getAttribute('data-day-key') || '';
  const day = dayKey ? findWeekDayByKey(dayKey) : null;
  if (!day) {
    return null;
  }
  return {
    day,
    dayKey,
    label: formatFullDateLabel(day.date)
  };
}

function clearMobileAllDayTaskGesture(options: { restorePreview?: boolean } = {}): void {
  const gesture = mobileAllDayTaskGesture.value;
  if (!gesture) {
    return;
  }
  if (gesture.timerId != null) {
    window.clearTimeout(gesture.timerId);
  }
  cancelMobileAllDayTaskPointerMoveFrame();
  if (options.restorePreview && gesture.started) {
    restoreMobileAllDayTaskPreview(gesture);
  }
  releaseMobileTaskPointerCapture(gesture);
  mobileAllDayTaskGesture.value = null;
  resetMobileDragFeedback();
  invalidateWeekDropZoneCache();
}

function updateMobileAllDayTaskDragState(
  target: MobileTimedTaskDropTarget | MobileAllDayTaskDropTarget | null
): void {
  clearWeekDragOverState();
  if (!target) {
    return;
  }
  if (!('kind' in target) || target.kind === 'all-day') {
    const dayKey = 'dayKey' in target ? target.dayKey : target.day.key;
    dragState.value.overDay = dayKey;
    dragState.value.overAllDayColumn = dayKey;
    if (!isMobileWeekGridMode.value) {
      dragState.value.overDayColumn = dayKey;
    }
    return;
  }
  const hour = Math.max(1, Math.min(24, Number.parseInt(target.startTime.slice(0, 2), 10) + 1));
  dragState.value.overDayColumn = target.day.key;
  dragState.value.overHourCell = `${target.day.key}-${hour}`;
}

function updateMobileAllDayTaskMoveFeedback(
  gesture: MobileAllDayTaskGesture,
  point: ExternalTaskDropPoint
): MobileTimedTaskDropTarget | null {
  const target = resolveMobileAllDayTaskMoveTarget(point);
  updateMobileAllDayTaskDragState(target);
  applyMobileAllDayTaskMovePreview(gesture, target);
  mobileDragPreview.value = {
    active: true,
    task: gesture.task,
    clientX: point.clientX,
    clientY: point.clientY
  };
  mobileDragHint.value = target?.label || '';
  return target;
}

function previewMobileAllDayTaskHandleDrag(
  gesture: MobileAllDayTaskGesture,
  point: ExternalTaskDropPoint
): boolean {
  const target = resolveMobileAllDayTaskDropTarget(point);
  if (!target) {
    resetMobileDragFeedback();
    return false;
  }

  if (gesture.repeatSeriesSnapshot) {
    applyMobileAllDayTaskRepeatHandlePreview(
      gesture.repeatSeriesSnapshot,
      gesture.task.id,
      gesture.mode === 'resize-start' ? 'start' : 'end',
      target.dayKey
    );
  } else {
    const currentTask = localTasks.value.find(task => task.id === gesture.task.id);
    if (!currentTask) {
      return false;
    }
    const currentStartDate = currentTask.startDate || gesture.originalStartDate;
    const currentDueDateValue = normalizeOptionalDateValue(currentTask.dueDate);
    const currentEffectiveDueDate = getEffectiveDueDate(currentStartDate, currentDueDateValue);

    if (gesture.mode === 'resize-start') {
      if (target.dayKey > currentEffectiveDueDate) {
        return false;
      }
      patchLocalTask(gesture.task.id, {
        startDate: target.dayKey,
        dueDate: currentDueDateValue || currentEffectiveDueDate !== target.dayKey
          ? currentEffectiveDueDate
          : undefined
      }, { emit: false });
    } else {
      if (target.dayKey < currentStartDate) {
        return false;
      }
      patchLocalTask(gesture.task.id, {
        dueDate: target.dayKey !== currentStartDate ? target.dayKey : undefined
      }, { emit: false });
    }
  }

  updateMobileAllDayTaskDragState(target);
  mobileDragPreview.value = {
    active: true,
    task: gesture.task,
    clientX: point.clientX,
    clientY: point.clientY
  };
  mobileDragHint.value = target.label;
  return true;
}

async function commitMobileAllDayTaskMove(
  gesture: MobileAllDayTaskGesture,
  target: MobileTimedTaskDropTarget | null
): Promise<void> {
  if (!target) {
    return;
  }

  const task = gesture.task;
  if (isRepeatTaskEntity(task)) {
    if (target.kind === 'all-day') {
      await applyRepeatSeriesDrop(task, {
        targetDate: target.day.key,
        clearTime: true
      });
      return;
    }
    await applyRepeatSeriesDrop(task, {
      targetDate: target.day.key,
      startTime: target.startTime,
      dueTime: target.dueTime,
      clearTime: false
    });
    return;
  }

  const patch: Partial<Task> = target.kind === 'all-day'
    ? (() => {
      const deltaDays = getDayDiff(gesture.originalStartDate, target.day.key);
      const nextDueDate = shiftDate(gesture.originalDueDate, deltaDays);
      const nextDueDateValue = gesture.hasExplicitDueDate || nextDueDate !== target.day.key
        ? nextDueDate
        : undefined;
      return {
        startDate: target.day.key,
        dueDate: nextDueDateValue,
        startTime: undefined,
        dueTime: undefined
      };
    })()
    : {
      startDate: target.day.key,
      dueDate: target.dueDate,
      startTime: target.startTime,
      dueTime: target.dueTime
    };
  const updatedTask = patchLocalTask(task.id, patch);
  const syncedTask = updatedTask || localTasks.value.find(item => item.id === task.id) || task;
  if (syncedTask) {
    emitTaskDateChanged(syncedTask);
  }

  const persistBlockId = resolveTaskPersistBlockId(syncedTask);
  if (!persistBlockId) {
    return;
  }

  try {
    await setBlockAttrs(persistBlockId, {
      'custom-task-start-date': target.day.key,
      'custom-task-due-date': target.kind === 'all-day' ? (syncedTask.dueDate || '') : target.dueDate,
      'custom-task-start-time': target.kind === 'all-day' ? null : target.startTime,
      'custom-task-due-time': target.kind === 'all-day' ? null : target.dueTime
    });
  } catch {
    patchLocalTask(task.id, {
      startDate: gesture.originalStartDate,
      dueDate: gesture.hasExplicitDueDate ? gesture.originalDueDate : undefined,
      startTime: gesture.originalStartTime,
      dueTime: gesture.originalDueTime
    });
  }
}

async function commitMobileAllDayTaskHandleDrag(gesture: MobileAllDayTaskGesture): Promise<void> {
  const currentTask = localTasks.value.find(task => task.id === gesture.task.id);
  if (!currentTask) {
    return;
  }

  const currentStartDate = currentTask.startDate || gesture.originalStartDate;
  const currentDueDateValue = normalizeOptionalDateValue(currentTask.dueDate);
  const originalDueDateValue = gesture.hasExplicitDueDate ? gesture.originalDueDate : null;
  const changed = currentStartDate !== gesture.originalStartDate || currentDueDateValue !== originalDueDateValue;
  if (!changed) {
    return;
  }

  if (gesture.repeatSeriesSnapshot && isRepeatTaskEntity(currentTask)) {
    try {
      const series = await getRepeatSeriesForTask(currentTask);
      if (series) {
        let nextSeriesStart = series.startDate;
        let nextSeriesEnd: string | null = series.endDate || null;

        if (gesture.mode === 'resize-start') {
          const dateDeltaDays = getDayDiff(gesture.originalStartDate, currentStartDate);
          nextSeriesStart = shiftDate(series.startDate, dateDeltaDays);
          nextSeriesEnd = currentDueDateValue ? (series.endDate || series.startDate) : null;
        } else {
          const originalEffectiveDueDate = getEffectiveDueDate(gesture.originalStartDate, originalDueDateValue);
          const currentEffectiveDueDate = getEffectiveDueDate(currentStartDate, currentDueDateValue);
          const dateDeltaDays = getDayDiff(originalEffectiveDueDate, currentEffectiveDueDate);
          nextSeriesEnd = currentDueDateValue
            ? shiftDate(series.endDate || series.startDate, dateDeltaDays)
            : null;
        }

        await updateRepeatSeriesDates(
          currentTask,
          nextSeriesStart,
          nextSeriesEnd,
          undefined,
          { emitChange: false }
        );

        const templateBlockId = series.templateBlockId
          || localTasks.value.find(item => !item.isVirtual && item.repeatSeriesId === series.id)?.blockId;
        if (templateBlockId) {
          await setBlockAttrs(templateBlockId, {
            'custom-task-start-date': nextSeriesStart || '',
            'custom-task-due-date': nextSeriesEnd || ''
          });
        }

        notifyRepeatChanged({
          blockId: templateBlockId,
          seriesId: series.id,
          frequency: series.frequency
        });

        for (const entry of gesture.repeatSeriesSnapshot.entries) {
          const syncedTask = localTasks.value.find(task => task.id === entry.id);
          if (syncedTask) {
            emitTaskDateChanged(syncedTask);
          }
        }
      }
      return;
    } catch {
      restoreMobileTimedTaskRepeatSnapshot(gesture.repeatSeriesSnapshot);
      return;
    }
  }

  const persistBlockId = resolveTaskPersistBlockId(currentTask);
  if (persistBlockId) {
    try {
      await setBlockAttrs(persistBlockId, {
        'custom-task-start-date': currentStartDate,
        'custom-task-due-date': currentDueDateValue || ''
      });
    } catch {
      patchLocalTask(gesture.task.id, {
        startDate: gesture.originalStartDate,
        dueDate: gesture.hasExplicitDueDate ? gesture.originalDueDate : undefined
      });
      return;
    }
  }

  const syncedTask = localTasks.value.find(task => task.id === gesture.task.id) || currentTask;
  emitTaskDateChanged(syncedTask);
}

function restoreMobileTimedTaskPreview(gesture: MobileTimedTaskGesture): void {
  if (gesture.repeatSeriesSnapshot) {
    restoreMobileTimedTaskRepeatSnapshot(gesture.repeatSeriesSnapshot);
    return;
  }
  patchLocalTask(gesture.task.id, {
    startDate: gesture.originalStartDate,
    dueDate: gesture.originalDueDate,
    startTime: gesture.originalStartTime,
    dueTime: gesture.originalDueTime
  }, { emit: false });
}

function applyMobileTimedTaskRepeatMovePreview(
  snapshot: MobileTimedTaskRepeatSnapshot,
  deltaDays: number,
  nextStartTime?: string,
  clearTime: boolean = false
): void {
  const updates: Array<{ id: string; patch: Partial<Task> }> = [];

  for (const entry of snapshot.entries) {
    const shiftedStartDate = shiftDate(entry.startDate, deltaDays);
    const shiftedDueDate = shiftDate(entry.dueDate, deltaDays);

    if (clearTime) {
      updates.push({
        id: entry.id,
        patch: {
          repeatInstanceDate: entry.isVirtual ? shiftedStartDate : undefined,
          startDate: shiftedStartDate,
          dueDate: entry.hasExplicitDueDate ? shiftedDueDate : undefined,
          startTime: undefined,
          dueTime: undefined
        }
      });
      continue;
    }

    const baseStartDateTime = new Date(`${entry.startDate}T${entry.startTime || '00:00'}`);
    const baseDueDateTime = new Date(`${entry.dueDate}T${entry.dueTime || entry.startTime || '01:00'}`);
    const durationMs = Math.max(15 * 60 * 1000, baseDueDateTime.getTime() - baseStartDateTime.getTime());
    const targetStartTime = nextStartTime || entry.startTime || '00:00';
    const shiftedStartDateTime = new Date(`${shiftedStartDate}T${targetStartTime}`);
    const shiftedDueDateTime = new Date(shiftedStartDateTime.getTime() + durationMs);
    const shiftedStartDateStr = formatDate(shiftedStartDateTime);
    const shiftedDueDateStr = formatDate(shiftedDueDateTime);

    updates.push({
      id: entry.id,
      patch: {
        repeatInstanceDate: entry.isVirtual ? shiftedStartDateStr : undefined,
        startDate: shiftedStartDateStr,
        dueDate: entry.hasExplicitDueDate || shiftedDueDateStr !== shiftedStartDateStr
          ? shiftedDueDateStr
          : undefined,
        startTime: targetStartTime,
        dueTime: formatTime(shiftedDueDateTime)
      }
    });
  }

  patchLocalTasksBatch(updates, { emit: false });
}

function applyMobileTimedTaskMovePreview(
  gesture: MobileTimedTaskGesture,
  target: MobileTimedTaskDropTarget | null
): void {
  if (!target) {
    restoreMobileTimedTaskPreview(gesture);
    return;
  }

  if (gesture.repeatSeriesSnapshot) {
    const deltaDays = getDayDiff(gesture.originalStartDate, target.day.key);
    if (target.kind === 'all-day') {
      applyMobileTimedTaskRepeatMovePreview(gesture.repeatSeriesSnapshot, deltaDays, undefined, true);
      return;
    }
    applyMobileTimedTaskRepeatMovePreview(
      gesture.repeatSeriesSnapshot,
      deltaDays,
      target.startTime,
      false
    );
    return;
  }

  if (target.kind === 'all-day') {
    patchLocalTask(gesture.task.id, {
      startDate: target.day.key,
      dueDate: target.day.key,
      startTime: undefined,
      dueTime: undefined
    }, { emit: false });
    return;
  }

  patchLocalTask(gesture.task.id, {
    startDate: target.day.key,
    dueDate: target.dueDate,
    startTime: target.startTime,
    dueTime: target.dueTime
  }, { emit: false });
}

function shouldIgnoreMobileTaskDragTarget(target: EventTarget | null): boolean {
  const element = target instanceof Element
    ? target
    : (target instanceof Node ? target.parentElement : null);
  if (!element) {
    return false;
  }
  return !!element.closest(
    'button, a, input, textarea, select, .task-checkbox-wrapper, .task-jump-btn, .task-priority-badge, .task-handle'
  );
}

function suppressTaskClick(taskId: string): void {
  suppressedTaskClickIds.set(taskId, Date.now() + 450);
}

function shouldSuppressTaskClick(taskId: string): boolean {
  const expiresAt = suppressedTaskClickIds.get(taskId);
  if (!expiresAt) {
    return false;
  }
  if (expiresAt <= Date.now()) {
    suppressedTaskClickIds.delete(taskId);
    return false;
  }
  return true;
}

function releaseMobileTaskPointerCapture(gesture: MobilePointerTaskDragSession | null): void {
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

function releaseMobileTimedTaskPointerCapture(gesture: MobileTimedTaskGesture | null): void {
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

function resetMobileDragFeedback(): void {
  mobileDragPreview.value = {
    active: false,
    task: null,
    clientX: 0,
    clientY: 0
  };
  mobileDragHint.value = '';
  clearWeekDragOverState();
}

function clearMobileTaskPointerDrag(): void {
  const gesture = mobilePointerTaskDrag.value;
  if (gesture?.timerId != null) {
    window.clearTimeout(gesture.timerId);
  }
  cancelMobileTaskPointerMoveFrame();
  releaseMobileTaskPointerCapture(gesture);
  mobilePointerTaskDrag.value = null;
}

function triggerMobileDragHaptic(): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return;
  }
  navigator.vibrate(12);
}

function clearMobileTaskDrag(): void {
  clearMobileTaskPointerDrag();
  resetMobileDragFeedback();
  invalidateWeekDropZoneCache();
}

function cancelMobileTaskPointerMoveFrame(): void {
  if (mobileTaskPointerMoveRafId == null) {
    return;
  }
  window.cancelAnimationFrame(mobileTaskPointerMoveRafId);
  mobileTaskPointerMoveRafId = null;
}

function flushMobileTaskPointerMoveFrame(): void {
  mobileTaskPointerMoveRafId = null;
  const gesture = mobilePointerTaskDrag.value;
  if (!gesture?.started) {
    return;
  }
  mobileDragPreview.value = {
    active: true,
    task: gesture.task,
    clientX: gesture.latestX,
    clientY: gesture.latestY
  };
  const result = updateExternalTaskDrag({
    clientX: gesture.latestX,
    clientY: gesture.latestY
  }, gesture.task);
  mobileDragHint.value = result?.label || '';
}

function scheduleMobileTaskPointerMoveFrame(): void {
  if (mobileTaskPointerMoveRafId != null) {
    return;
  }
  mobileTaskPointerMoveRafId = window.requestAnimationFrame(() => {
    flushMobileTaskPointerMoveFrame();
  });
}

function cancelMobileAllDayTaskPointerMoveFrame(): void {
  if (mobileAllDayTaskPointerMoveRafId == null) {
    return;
  }
  window.cancelAnimationFrame(mobileAllDayTaskPointerMoveRafId);
  mobileAllDayTaskPointerMoveRafId = null;
}

function flushMobileAllDayTaskPointerMoveFrame(): void {
  mobileAllDayTaskPointerMoveRafId = null;
  const gesture = mobileAllDayTaskGesture.value;
  if (!gesture?.started) {
    return;
  }
  const point = {
    clientX: gesture.latestX,
    clientY: gesture.latestY
  };
  if (gesture.mode === 'move') {
    updateMobileAllDayTaskMoveFeedback(gesture, point);
    return;
  }
  previewMobileAllDayTaskHandleDrag(gesture, point);
}

function scheduleMobileAllDayTaskPointerMoveFrame(): void {
  if (mobileAllDayTaskPointerMoveRafId != null) {
    return;
  }
  mobileAllDayTaskPointerMoveRafId = window.requestAnimationFrame(() => {
    flushMobileAllDayTaskPointerMoveFrame();
  });
}

function cancelMobileTimedTaskPointerMoveFrame(): void {
  if (mobileTimedTaskPointerMoveRafId == null) {
    return;
  }
  window.cancelAnimationFrame(mobileTimedTaskPointerMoveRafId);
  mobileTimedTaskPointerMoveRafId = null;
}

function flushMobileTimedTaskPointerMoveFrame(): void {
  mobileTimedTaskPointerMoveRafId = null;
  const gesture = mobileTimedTaskGesture.value;
  if (!gesture?.started) {
    return;
  }
  const point = {
    clientX: gesture.latestX,
    clientY: gesture.latestY
  };
  if (gesture.mode === 'move') {
    updateMobileTimedTaskMoveFeedback(gesture, point);
    return;
  }
  previewMobileTimedTaskHandleDrag(gesture, point);
}

function scheduleMobileTimedTaskPointerMoveFrame(): void {
  if (mobileTimedTaskPointerMoveRafId != null) {
    return;
  }
  mobileTimedTaskPointerMoveRafId = window.requestAnimationFrame(() => {
    flushMobileTimedTaskPointerMoveFrame();
  });
}

function resolveTaskPersistBlockId(task: Task | null | undefined): string | null {
  if (!task) {
    return null;
  }
  if (typeof task.blockId === 'string' && task.blockId.trim().length > 0) {
    return task.blockId;
  }
  if (typeof task.id === 'string' && task.id.startsWith('block_')) {
    return task.id.slice(6);
  }
  return null;
}

function formatMobileTimedTaskDropLabel(day: WeekDay, startTime?: string, dueTime?: string): string {
  const dateLabel = formatFullDateLabel(day.date);
  if (!startTime || !dueTime) {
    return `${dateLabel} ${t('weekView.allDay')}`;
  }
  return `${dateLabel} ${startTime} - ${dueTime}`;
}

function resolveMobileTimedTaskDropTarget(
  point: ExternalTaskDropPoint,
  gesture: MobileTimedTaskGesture
): MobileTimedTaskDropTarget | null {
  const dropZoneCache = getWeekDropZoneCache();
  const allDayZone = findWeekDayHitZone(point, dropZoneCache.allDayZones);
  if (allDayZone) {
    return {
      kind: 'all-day',
      day: allDayZone.day,
      label: formatMobileTimedTaskDropLabel(allDayZone.day)
    };
  }

  const scrollElement = daysScrollRef.value;
  const scrollRect = getWeekScrollRect();
  if (!scrollElement || !scrollRect) {
    return null;
  }

  const timedZone = findWeekDayHitZone(point, dropZoneCache.timedDayZones);
  if (!timedZone) {
    return null;
  }
  const scrollTop = scrollElement.scrollTop;
  const offsetY = point.clientY - scrollRect.top + scrollTop - (gesture.clickOffsetY || 0);
  const inactiveOffsetMinutes = (isInactiveHoursCollapsed.value ? INACTIVE_HOURS_OFFSET : 0) * 60 / CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT;
  const totalMinutes = offsetY * 60 / CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT + inactiveOffsetMinutes;
  const snapMinutes = MOBILE_TIMED_TASK_SNAP_MINUTES;
  const snappedMinutes = Math.round(totalMinutes / snapMinutes) * snapMinutes;
  const maxStartMinutes = Math.max(0, 24 * 60 - snapMinutes);
  const clampedMinutes = Math.max(0, Math.min(maxStartMinutes, snappedMinutes));
  const hours = Math.floor(clampedMinutes / 60);
  const minutes = clampedMinutes % 60;
  const startTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  const safeDurationMs = Number.isFinite(gesture.durationMs)
    ? Math.max(15 * 60 * 1000, Number(gesture.durationMs))
    : 60 * 60 * 1000;
  const startDateTime = new Date(`${timedZone.day.key}T${startTime}`);
  const dueDateTime = new Date(startDateTime.getTime() + safeDurationMs);
  const dueTime = formatTime(dueDateTime);
  const dueDate = formatDate(dueDateTime);
  return {
    kind: 'timed',
    day: timedZone.day,
    startTime,
    dueTime,
    dueDate,
    label: formatMobileTimedTaskDropLabel(timedZone.day, startTime, dueTime)
  };
}

function resolveMobileTimedTaskHandleTarget(point: ExternalTaskDropPoint): {
  day: WeekDay;
  dayKey: string;
  time: string;
  label: string;
} | null {
  const scrollElement = daysScrollRef.value;
  const scrollRect = getWeekScrollRect();
  if (!scrollElement || !scrollRect) {
    return null;
  }

  const timedZone = findWeekDayHitZone(point, getWeekDropZoneCache().timedDayZones);
  if (!timedZone) {
    return null;
  }
  const scrollTop = scrollElement.scrollTop;
  const offsetY = point.clientY - scrollRect.top + scrollTop;
  const inactiveOffsetMinutes = (isInactiveHoursCollapsed.value ? INACTIVE_HOURS_OFFSET : 0) * 60 / CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT;
  const totalMinutes = Math.round(offsetY * 60 / CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT) + inactiveOffsetMinutes;
  const snappedMinutes = Math.round(totalMinutes / MOBILE_TIMED_TASK_SNAP_MINUTES)
    * MOBILE_TIMED_TASK_SNAP_MINUTES;
  const clampedMinutes = Math.max(0, Math.min(24 * 60 - 15, snappedMinutes));
  const hours = Math.floor(clampedMinutes / 60);
  const minutes = clampedMinutes % 60;
  const time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  return {
    day: timedZone.day,
    dayKey: timedZone.dayKey,
    time,
    label: formatMobileTimedTaskDropLabel(timedZone.day, time, time)
  };
}

function clearMobileTimedTaskGesture(options: { restorePreview?: boolean } = {}): void {
  const gesture = mobileTimedTaskGesture.value;
  if (!gesture) {
    return;
  }
  if (gesture.timerId != null) {
    window.clearTimeout(gesture.timerId);
  }
  cancelMobileTimedTaskPointerMoveFrame();
  if (options.restorePreview && gesture.started) {
    restoreMobileTimedTaskPreview(gesture);
  }
  releaseMobileTimedTaskPointerCapture(gesture);
  mobileTimedTaskGesture.value = null;
  resetMobileDragFeedback();
  invalidateWeekDropZoneCache();
}

function updateMobileTimedTaskDragState(target: MobileTimedTaskDropTarget | null): void {
  clearWeekDragOverState();
  if (!target) {
    return;
  }
  if (target.kind === 'all-day') {
    dragState.value.overDay = target.day.key;
    dragState.value.overAllDayColumn = target.day.key;
    return;
  }
  const hour = Math.max(1, Math.min(24, Number.parseInt(target.startTime.slice(0, 2), 10) + 1));
  dragState.value.overDayColumn = target.day.key;
  dragState.value.overHourCell = `${target.day.key}-${hour}`;
}

function updateMobileTimedTaskMoveFeedback(
  gesture: MobileTimedTaskGesture,
  point: ExternalTaskDropPoint
): MobileTimedTaskDropTarget | null {
  const target = resolveMobileTimedTaskDropTarget(point, gesture);
  updateMobileTimedTaskDragState(target);
  applyMobileTimedTaskMovePreview(gesture, target);
  mobileDragPreview.value = {
    active: true,
    task: gesture.task,
    clientX: point.clientX,
    clientY: point.clientY
  };
  mobileDragHint.value = target?.label || '';
  return target;
}

function previewMobileTimedTaskHandleDrag(
  gesture: MobileTimedTaskGesture,
  point: ExternalTaskDropPoint
): boolean {
  const target = resolveMobileTimedTaskHandleTarget(point);
  if (!target) {
    resetMobileDragFeedback();
    return false;
  }

  const currentTask = localTasks.value.find(task => task.id === gesture.task.id);
  if (!currentTask) {
    return false;
  }

  if (gesture.repeatSeriesSnapshot) {
    applyMobileTimedTaskRepeatHandlePreview(
      gesture.repeatSeriesSnapshot,
      gesture.task.id,
      gesture.mode === 'resize-start' ? 'start' : 'end',
      target.dayKey,
      target.time
    );
  } else {
    const currentStartDate = currentTask.startDate || gesture.originalStartDate;
    const currentDueDate = currentTask.dueDate || gesture.originalDueDate;
    const currentStartTime = currentTask.startTime || gesture.originalStartTime;
    const currentDueTime = currentTask.dueTime || gesture.originalDueTime;
    const startDateTime = new Date(`${currentStartDate}T${currentStartTime}`);
    const dueDateTime = new Date(`${currentDueDate}T${currentDueTime}`);

    if (gesture.mode === 'resize-start') {
      const nextStartDateTime = new Date(`${target.dayKey}T${target.time}`);
      const maxStartTime = dueDateTime.getTime() - 15 * 60 * 1000;
      if (nextStartDateTime.getTime() >= maxStartTime) {
        return false;
      }
      patchLocalTask(gesture.task.id, {
        startDate: target.dayKey,
        startTime: target.time
      });
    } else {
      const nextDueDateTime = new Date(`${target.dayKey}T${target.time}`);
      const minEndTime = startDateTime.getTime() + 15 * 60 * 1000;
      if (nextDueDateTime.getTime() <= minEndTime) {
        return false;
      }
      patchLocalTask(gesture.task.id, {
        dueDate: target.dayKey,
        dueTime: target.time
      });
    }
  }

  mobileDragPreview.value = {
    active: true,
    task: gesture.task,
    clientX: point.clientX,
    clientY: point.clientY
  };
  mobileDragHint.value = target.label;
  dragState.value.overDayColumn = target.day.key;
  dragState.value.overHourCell = `${target.day.key}-${Math.max(1, Math.min(24, Number.parseInt(target.time.slice(0, 2), 10) + 1))}`;
  return true;
}

async function commitMobileTimedTaskMove(
  gesture: MobileTimedTaskGesture,
  target: MobileTimedTaskDropTarget | null
): Promise<void> {
  if (!target) {
    return;
  }

  const task = gesture.task;
  if (isRepeatTaskEntity(task)) {
    if (target.kind === 'all-day') {
      await applyRepeatSeriesDrop(task, {
        targetDate: target.day.key,
        clearTime: true
      });
      return;
    }

    await applyRepeatSeriesDrop(task, {
      targetDate: target.day.key,
      startTime: target.startTime,
      dueTime: target.dueTime,
      clearTime: false
    });
    return;
  }

  const patch: Partial<Task> = target.kind === 'all-day'
    ? {
      startDate: target.day.key,
      dueDate: target.day.key,
      startTime: undefined,
      dueTime: undefined
    }
    : {
      startDate: target.day.key,
      dueDate: target.dueDate,
      startTime: target.startTime,
      dueTime: target.dueTime
    };

  const updatedTask = patchLocalTask(task.id, patch);
  const syncedTask = updatedTask || localTasks.value.find(item => item.id === task.id) || task;
  if (syncedTask) {
    emitTaskDateChanged(syncedTask);
  }

  const persistBlockId = resolveTaskPersistBlockId(syncedTask);
  if (!persistBlockId) {
    return;
  }

  try {
    await setBlockAttrs(persistBlockId, {
      'custom-task-start-date': target.day.key,
      'custom-task-due-date': target.kind === 'all-day' ? target.day.key : target.dueDate,
      'custom-task-start-time': target.kind === 'all-day' ? null : target.startTime,
      'custom-task-due-time': target.kind === 'all-day' ? null : target.dueTime
    });
  } catch {
    patchLocalTask(task.id, {
      startDate: gesture.originalStartDate,
      dueDate: gesture.originalDueDate,
      startTime: gesture.originalStartTime,
      dueTime: gesture.originalDueTime
    });
  }
}

async function commitMobileTimedTaskHandleDrag(gesture: MobileTimedTaskGesture): Promise<void> {
  const currentTask = localTasks.value.find(task => task.id === gesture.task.id);
  if (!currentTask) {
    return;
  }

  const newStartTime = currentTask.startTime || gesture.originalStartTime;
  const newEndTime = currentTask.dueTime || gesture.originalDueTime;
  const newStartDate = currentTask.startDate || gesture.originalStartDate;
  const newDueDate = currentTask.dueDate || gesture.originalDueDate;
  const timeChanged = newStartTime !== gesture.originalStartTime || newEndTime !== gesture.originalDueTime;
  const dateChanged = newStartDate !== gesture.originalStartDate || newDueDate !== gesture.originalDueDate;

  if (!timeChanged && !dateChanged) {
    return;
  }

  if (gesture.repeatSeriesSnapshot && isRepeatTaskEntity(currentTask)) {
    try {
      const series = await getRepeatSeriesForTask(currentTask);
      if (series) {
        const dateDeltaDays = gesture.mode === 'resize-start'
          ? getDayDiff(gesture.originalStartDate, newStartDate)
          : getDayDiff(gesture.originalDueDate, newDueDate);
        const nextSeriesStart = shiftDate(series.startDate, dateDeltaDays);
        const nextSeriesEnd = series.endDate ? shiftDate(series.endDate, dateDeltaDays) : null;
        await updateRepeatSeriesDates(
          currentTask,
          nextSeriesStart,
          nextSeriesEnd,
          {
            startTime: newStartTime,
            dueTime: newEndTime
          },
          { emitChange: false }
        );

        const templateBlockId = series.templateBlockId
          || localTasks.value.find(item => !item.isVirtual && item.repeatSeriesId === series.id)?.blockId;
        if (templateBlockId) {
          await setBlockAttrs(templateBlockId, {
            'custom-task-start-date': nextSeriesStart || '',
            'custom-task-due-date': nextSeriesEnd || '',
            'custom-task-start-time': newStartTime,
            'custom-task-due-time': newEndTime
          });
        }

        notifyRepeatChanged({
          blockId: templateBlockId,
          seriesId: series.id,
          frequency: series.frequency
        });

        for (const entry of gesture.repeatSeriesSnapshot.entries) {
          const syncedTask = localTasks.value.find(task => task.id === entry.id);
          if (syncedTask) {
            emitTaskDateChanged(syncedTask);
          }
        }
      }
      return;
    } catch {
      restoreMobileTimedTaskRepeatSnapshot(gesture.repeatSeriesSnapshot);
      return;
    }
  }

  const persistBlockId = resolveTaskPersistBlockId(currentTask);
  if (persistBlockId) {
    try {
      await setBlockAttrs(persistBlockId, {
        'custom-task-start-date': newStartDate,
        'custom-task-due-date': newDueDate,
        'custom-task-start-time': newStartTime,
        'custom-task-due-time': newEndTime
      });
    } catch {
      patchLocalTask(gesture.task.id, {
        startDate: gesture.originalStartDate,
        dueDate: gesture.originalDueDate,
        startTime: gesture.originalStartTime,
        dueTime: gesture.originalDueTime
      });
      return;
    }
  }

  const syncedTask = localTasks.value.find(task => task.id === gesture.task.id) || currentTask;
  emitTaskDateChanged(syncedTask);
}

function handleMobileTaskPointerDown(event: PointerEvent, task: Task): void {
  if (!isMobileDragEnabled.value) {
    return;
  }
  if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) {
    return;
  }
  if (shouldIgnoreMobileTaskDragTarget(event.target)) {
    clearMobileTaskDrag();
    return;
  }

  const captureElement = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
  clearMobileTaskDrag();

  const timerId = window.setTimeout(() => {
    const gesture = mobilePointerTaskDrag.value;
    if (!gesture || gesture.pointerId !== event.pointerId || gesture.task.id !== task.id) {
      return;
    }
    gesture.started = true;
    mobileDragPreview.value = {
      active: true,
      task,
      clientX: gesture.latestX,
      clientY: gesture.latestY
    };
    triggerMobileDragHaptic();
    const result = updateExternalTaskDrag({
      clientX: gesture.latestX,
      clientY: gesture.latestY
    }, task);
    mobileDragHint.value = result?.label || '';
  }, MOBILE_DRAG_LONG_PRESS_MS);

  if (captureElement) {
    try {
      captureElement.setPointerCapture(event.pointerId);
    } catch {
      // Ignore environments that don't allow capturing this pointer.
    }
  }

  mobilePointerTaskDrag.value = {
    task,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    latestX: event.clientX,
    latestY: event.clientY,
    timerId,
    started: false,
    captureElement
  };
}

function handleMobileTaskPointerMove(event: PointerEvent): void {
  const gesture = mobilePointerTaskDrag.value;
  if (!gesture || gesture.pointerId !== event.pointerId) {
    return;
  }

  gesture.latestX = event.clientX;
  gesture.latestY = event.clientY;

  if (!gesture.started) {
    const movedDistance = Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY);
    if (movedDistance > MOBILE_DRAG_MOVE_THRESHOLD_PX) {
      clearMobileTaskDrag();
    }
    return;
  }

  event.preventDefault();
  scheduleMobileTaskPointerMoveFrame();
}

function handleDocumentMobileTaskPointerMove(event: PointerEvent): void {
  if (!mobilePointerTaskDrag.value) {
    return;
  }
  handleMobileTaskPointerMove(event);
}

async function finishMobileTaskPointer(event: PointerEvent, cancelled: boolean): Promise<void> {
  const gesture = mobilePointerTaskDrag.value;
  if (!gesture || gesture.pointerId !== event.pointerId) {
    return;
  }
  if (gesture.timerId !== null) {
    window.clearTimeout(gesture.timerId);
  }

  if (!gesture.started) {
    clearMobileTaskDrag();
    return;
  }

  suppressTaskClick(gesture.task.id);
  event.preventDefault();
  const task = gesture.task;
  const point = {
    clientX: event.clientX,
    clientY: event.clientY
  };
  clearMobileTaskDrag();
  if (!cancelled) {
    await dropExternalTask(task, point);
  }
}

function handleMobileTaskPointerUp(event: PointerEvent): void {
  void finishMobileTaskPointer(event, false);
}

function handleMobileTaskPointerCancel(event: PointerEvent): void {
  void finishMobileTaskPointer(event, true);
}

function handleDocumentMobileTaskPointerUp(event: PointerEvent): void {
  if (!mobilePointerTaskDrag.value) {
    return;
  }
  handleMobileTaskPointerUp(event);
}

function handleDocumentMobileTaskPointerCancel(event: PointerEvent): void {
  if (!mobilePointerTaskDrag.value) {
    return;
  }
  handleMobileTaskPointerCancel(event);
}

function handleMobileAllDayTaskPointerDown(event: PointerEvent, task: Task): void {
  if (!isMobileAllDayTaskInteractionEnabled.value) {
    handleMobileTaskPointerDown(event, task);
    return;
  }
  if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) {
    return;
  }
  if (shouldIgnoreMobileTaskDragTarget(event.target)) {
    return;
  }

  const captureElement = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
  const originalStartDate = task.startDate || task.dueDate || formatDate(new Date());
  const originalDueDateValue = normalizeOptionalDateValue(task.dueDate);
  const originalDueDate = getEffectiveDueDate(originalStartDate, originalDueDateValue);
  const originalStartTime = task.startTime;
  const originalDueTime = task.dueTime;
  const alreadySelected = isMobileAllDayTaskSelected(task.id);

  clearMobileAllDayTaskGesture();
  resetMobileDragFeedback();
  selectMobileTimedTask(null);

  let timerId: number | null = null;
  if (!alreadySelected) {
    timerId = window.setTimeout(() => {
      const gesture = mobileAllDayTaskGesture.value;
      if (!gesture || gesture.pointerId !== event.pointerId || gesture.task.id !== task.id) {
        return;
      }
      gesture.started = true;
      selectMobileAllDayTask(task.id);
      triggerMobileDragHaptic();
    }, MOBILE_DRAG_LONG_PRESS_MS);
  } else {
    selectMobileAllDayTask(task.id);
  }

  if (captureElement) {
    try {
      captureElement.setPointerCapture(event.pointerId);
    } catch {
      // Ignore environments that don't allow capturing this pointer.
    }
  }

  mobileAllDayTaskGesture.value = {
    task,
    pointerId: event.pointerId,
    mode: 'move',
    startX: event.clientX,
    startY: event.clientY,
    latestX: event.clientX,
    latestY: event.clientY,
    timerId,
    started: alreadySelected,
    moved: false,
    captureElement,
    originalStartDate,
    originalDueDate,
    originalStartTime,
    originalDueTime,
    hasExplicitDueDate: !!originalDueDateValue,
    repeatSeriesSnapshot: isRepeatTaskEntity(task)
      ? buildMobileTimedTaskRepeatSnapshot(task)
      : null
  };
}

function handleMobileAllDayTaskHandlePointerDown(
  event: PointerEvent,
  task: Task,
  handleType: 'start' | 'end'
): void {
  if (!isMobileAllDayTaskInteractionEnabled.value) {
    return;
  }
  if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) {
    return;
  }

  clearMobileAllDayTaskGesture();
  resetMobileDragFeedback();
  selectMobileTimedTask(null);
  selectMobileAllDayTask(task.id);

  const captureElement = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
  if (captureElement) {
    try {
      captureElement.setPointerCapture(event.pointerId);
    } catch {
      // Ignore environments that don't allow capturing this pointer.
    }
  }

  const originalStartDate = task.startDate || task.dueDate || formatDate(new Date());
  const originalDueDateValue = normalizeOptionalDateValue(task.dueDate);
  mobileAllDayTaskGesture.value = {
    task,
    pointerId: event.pointerId,
    mode: handleType === 'start' ? 'resize-start' : 'resize-end',
    startX: event.clientX,
    startY: event.clientY,
    latestX: event.clientX,
    latestY: event.clientY,
    timerId: null,
    started: true,
    moved: false,
    captureElement,
    originalStartDate,
    originalDueDate: getEffectiveDueDate(originalStartDate, originalDueDateValue),
    originalStartTime: task.startTime,
    originalDueTime: task.dueTime,
    hasExplicitDueDate: !!originalDueDateValue,
    repeatSeriesSnapshot: isRepeatTaskEntity(task)
      ? buildMobileTimedTaskRepeatSnapshot(task)
      : null
  };
}

function handleMobileAllDayTaskPointerMove(event: PointerEvent): void {
  const gesture = mobileAllDayTaskGesture.value;
  if (!gesture || gesture.pointerId !== event.pointerId) {
    return;
  }

  gesture.latestX = event.clientX;
  gesture.latestY = event.clientY;

  if (!gesture.started) {
    const movedDistance = Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY);
    if (movedDistance > MOBILE_DRAG_MOVE_THRESHOLD_PX) {
      clearMobileAllDayTaskGesture();
    }
    return;
  }

  if (gesture.mode === 'move') {
    const movedDistance = Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY);
    if (!gesture.moved && movedDistance < MOBILE_TIMED_TASK_OPERATION_MOVE_THRESHOLD_PX) {
      return;
    }
    gesture.moved = true;
    event.preventDefault();
    scheduleMobileAllDayTaskPointerMoveFrame();
    return;
  }

  gesture.moved = true;
  event.preventDefault();
  scheduleMobileAllDayTaskPointerMoveFrame();
}

function handleDocumentMobileAllDayTaskPointerMove(event: PointerEvent): void {
  if (!mobileAllDayTaskGesture.value) {
    return;
  }
  handleMobileAllDayTaskPointerMove(event);
}

async function finishMobileAllDayTaskPointer(event: PointerEvent, cancelled: boolean): Promise<void> {
  const gesture = mobileAllDayTaskGesture.value;
  if (!gesture || gesture.pointerId !== event.pointerId) {
    return;
  }
  if (gesture.timerId != null) {
    window.clearTimeout(gesture.timerId);
  }

  if (!gesture.started) {
    clearMobileAllDayTaskGesture();
    return;
  }

  if (gesture.mode === 'move') {
    const point = {
      clientX: event.clientX,
      clientY: event.clientY
    };
    const target = !cancelled && gesture.moved
      ? resolveMobileAllDayTaskMoveTarget(point)
      : null;
    const task = gesture.task;
    const shouldAllowTapClick = !cancelled && !gesture.moved && gesture.timerId == null;
    const shouldRestorePreview = cancelled || (gesture.moved && !target);
    clearMobileAllDayTaskGesture({ restorePreview: shouldRestorePreview });
    if (shouldAllowTapClick) {
      return;
    }
    suppressTaskClick(task.id);
    if (!cancelled && !gesture.moved) {
      selectMobileAllDayTask(task.id);
      return;
    }
    if (!cancelled && gesture.moved) {
      await commitMobileAllDayTaskMove(gesture, target);
    }
    return;
  }

  const gestureSnapshot = gesture;
  clearMobileAllDayTaskGesture({ restorePreview: cancelled });
  if (cancelled || !gestureSnapshot.moved) {
    return;
  }
  suppressTaskClick(gestureSnapshot.task.id);
  await commitMobileAllDayTaskHandleDrag(gestureSnapshot);
}

function handleMobileAllDayTaskPointerUp(event: PointerEvent): void {
  void finishMobileAllDayTaskPointer(event, false);
}

function handleMobileAllDayTaskPointerCancel(event: PointerEvent): void {
  void finishMobileAllDayTaskPointer(event, true);
}

function handleDocumentMobileAllDayTaskPointerUp(event: PointerEvent): void {
  if (!mobileAllDayTaskGesture.value) {
    return;
  }
  handleMobileAllDayTaskPointerUp(event);
}

function handleDocumentMobileAllDayTaskPointerCancel(event: PointerEvent): void {
  if (!mobileAllDayTaskGesture.value) {
    return;
  }
  handleMobileAllDayTaskPointerCancel(event);
}

function handleMobileTimedTaskPointerDown(event: PointerEvent, item: TimedTaskRenderItem): void {
  if (!isMobileTimedTaskInteractionEnabled.value) {
    handleMobileTaskPointerDown(event, item.task);
    return;
  }
  if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) {
    return;
  }
  if (shouldIgnoreMobileTaskDragTarget(event.target)) {
    return;
  }

  const task = item.task;
  const captureElement = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
  const originalStartDate = task.startDate || item.renderStartDate || item.renderDate;
  const originalDueDate = task.dueDate || item.renderDueDate || originalStartDate;
  const originalStartTime = task.startTime || item.renderStartTime || '00:00';
  const originalDueTime = task.dueTime || item.renderDueTime || originalStartTime;
  const taskRect = captureElement?.getBoundingClientRect();
  const clickOffsetY = typeof taskRect?.top === 'number' ? event.clientY - taskRect.top : 0;
  const durationMs = new Date(`${originalDueDate}T${originalDueTime}`).getTime()
    - new Date(`${originalStartDate}T${originalStartTime}`).getTime();
  const alreadySelected = isMobileTimedTaskSelected(task.id);

  clearMobileTimedTaskGesture();
  resetMobileDragFeedback();
  selectMobileAllDayTask(null);

  let timerId: number | null = null;
  if (!alreadySelected) {
    timerId = window.setTimeout(() => {
      const gesture = mobileTimedTaskGesture.value;
      if (!gesture || gesture.pointerId !== event.pointerId || gesture.task.id !== task.id) {
        return;
      }
      gesture.started = true;
      selectMobileTimedTask(task.id);
      triggerMobileDragHaptic();
    }, MOBILE_DRAG_LONG_PRESS_MS);
  } else {
    selectMobileTimedTask(task.id);
  }

  if (captureElement) {
    try {
      captureElement.setPointerCapture(event.pointerId);
    } catch {
      // Ignore environments that don't allow capturing this pointer.
    }
  }

  mobileTimedTaskGesture.value = {
    task,
    pointerId: event.pointerId,
    mode: 'move',
    startX: event.clientX,
    startY: event.clientY,
    latestX: event.clientX,
    latestY: event.clientY,
    timerId,
    started: alreadySelected,
    moved: false,
    captureElement,
    originalStartDate,
    originalDueDate,
    originalStartTime,
    originalDueTime,
    clickOffsetY,
    durationMs
  };
}

function handleMobileTimedTaskHandlePointerDown(
  event: PointerEvent,
  task: Task,
  handleType: 'start' | 'end'
): void {
  if (!isMobileTimedTaskInteractionEnabled.value) {
    return;
  }
  if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) {
    return;
  }

  clearMobileTimedTaskGesture();
  resetMobileDragFeedback();
  selectMobileTimedTask(task.id);

  const captureElement = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
  if (captureElement) {
    try {
      captureElement.setPointerCapture(event.pointerId);
    } catch {
      // Ignore environments that don't allow capturing this pointer.
    }
  }

  mobileTimedTaskGesture.value = {
    task,
    pointerId: event.pointerId,
    mode: handleType === 'start' ? 'resize-start' : 'resize-end',
    startX: event.clientX,
    startY: event.clientY,
    latestX: event.clientX,
    latestY: event.clientY,
    timerId: null,
    started: true,
    moved: false,
    captureElement,
    originalStartDate: task.startDate || formatDate(new Date()),
    originalDueDate: task.dueDate || task.startDate || formatDate(new Date()),
    originalStartTime: task.startTime || '00:00',
    originalDueTime: task.dueTime || task.startTime || '01:00',
    repeatSeriesSnapshot: isRepeatTaskEntity(task)
      ? buildMobileTimedTaskRepeatSnapshot(task)
      : null
  };
}

function handleMobileTimedTaskPointerMove(event: PointerEvent): void {
  const gesture = mobileTimedTaskGesture.value;
  if (!gesture || gesture.pointerId !== event.pointerId) {
    return;
  }

  gesture.latestX = event.clientX;
  gesture.latestY = event.clientY;

  if (!gesture.started) {
    const movedDistance = Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY);
    if (movedDistance > MOBILE_DRAG_MOVE_THRESHOLD_PX) {
      clearMobileTimedTaskGesture();
    }
    return;
  }

  if (gesture.mode === 'move') {
    const movedDistance = Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY);
    if (!gesture.moved && movedDistance < MOBILE_TIMED_TASK_OPERATION_MOVE_THRESHOLD_PX) {
      return;
    }
    gesture.moved = true;
    event.preventDefault();
    scheduleMobileTimedTaskPointerMoveFrame();
    return;
  }

  gesture.moved = true;
  event.preventDefault();
  scheduleMobileTimedTaskPointerMoveFrame();
}

function handleDocumentMobileTimedTaskPointerMove(event: PointerEvent): void {
  if (!mobileTimedTaskGesture.value) {
    return;
  }
  handleMobileTimedTaskPointerMove(event);
}

async function finishMobileTimedTaskPointer(event: PointerEvent, cancelled: boolean): Promise<void> {
  const gesture = mobileTimedTaskGesture.value;
  if (!gesture || gesture.pointerId !== event.pointerId) {
    return;
  }
  if (gesture.timerId != null) {
    window.clearTimeout(gesture.timerId);
  }

  if (!gesture.started) {
    clearMobileTimedTaskGesture();
    return;
  }

  if (gesture.mode === 'move') {
    const point = {
      clientX: event.clientX,
      clientY: event.clientY
    };
    const target = !cancelled && gesture.moved
      ? resolveMobileTimedTaskDropTarget(point, gesture)
      : null;
    const task = gesture.task;
    const shouldAllowTapClick = !cancelled && !gesture.moved && gesture.timerId == null;
    const shouldRestorePreview = cancelled || (gesture.moved && !target);
    clearMobileTimedTaskGesture({ restorePreview: shouldRestorePreview });
    if (shouldAllowTapClick) {
      return;
    }
    suppressTaskClick(task.id);
    if (!cancelled && !gesture.moved) {
      selectMobileTimedTask(task.id);
      return;
    }
    if (!cancelled && gesture.moved) {
      await commitMobileTimedTaskMove(gesture, target);
    }
    return;
  }

  const gestureSnapshot = gesture;
  clearMobileTimedTaskGesture({ restorePreview: cancelled });
  if (cancelled || !gestureSnapshot.moved) {
    return;
  }
  suppressTaskClick(gestureSnapshot.task.id);
  await commitMobileTimedTaskHandleDrag(gestureSnapshot);
}

function handleMobileTimedTaskPointerUp(event: PointerEvent): void {
  void finishMobileTimedTaskPointer(event, false);
}

function handleMobileTimedTaskPointerCancel(event: PointerEvent): void {
  void finishMobileTimedTaskPointer(event, true);
}

function handleDocumentMobileTimedTaskPointerUp(event: PointerEvent): void {
  if (!mobileTimedTaskGesture.value) {
    return;
  }
  handleMobileTimedTaskPointerUp(event);
}

function handleDocumentMobileTimedTaskPointerCancel(event: PointerEvent): void {
  if (!mobileTimedTaskGesture.value) {
    return;
  }
  handleMobileTimedTaskPointerCancel(event);
}

async function toggleTaskStatus(task: Task) {
  if (isHabitTaskChip(task)) {
    await toggleHabitTaskChipStatus(task);
    return;
  }

  const currentTask = localTasks.value.find(t => t.id === task.id);
  if (!currentTask) return;
  const previousStatus = currentTask.status;
  const nextStatus = previousStatus === 'completed' ? 'pending' : 'completed';
  const previousCompletedAt = currentTask.completedAt;

  const updatedTask = patchLocalTask(task.id, {
    status: nextStatus,
    completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined
  });
  if (!updatedTask) return;

  try {
    if (task.isVirtual && task.repeatSeriesId && task.repeatInstanceDate) {
      await TaskRepository.updateRepeatInstanceStatus(task, nextStatus);
    } else if (task.type === 'block' && task.blockId) {
      await updateTaskMarkdown(task.blockId, nextStatus === 'completed', true);
    }
  } catch (error) {
    patchLocalTask(task.id, {
      status: previousStatus,
      completedAt: previousCompletedAt
    });
  }
}

function handleTaskClick(task: Task, event?: MouseEvent) {
  if (isHabitTaskChip(task)) {
    return;
  }
  if (shouldSuppressTaskClick(task.id)) {
    return;
  }
  emit('taskEdit', task, {
    x: event?.clientX ?? window.innerWidth / 2,
    y: event?.clientY ?? window.innerHeight / 2
  });
}

function handleTaskOpenClick(task: Task, event?: MouseEvent) {
  if (isHabitTaskChip(task)) {
    return;
  }
  event?.preventDefault();
  event?.stopPropagation();
  emit('taskClick', task);
}

function handleMobileAllDayTaskClick(event: MouseEvent, task: Task): void {
  if (!isMobileAllDayTaskInteractionEnabled.value) {
    handleTaskClick(task, event);
    return;
  }
  if (shouldSuppressTaskClick(task.id)) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  selectMobileTimedTask(null);
  selectMobileAllDayTask(null);
  handleTaskClick(task, event);
}

function handleMobileTimedTaskClick(event: MouseEvent, task: Task): void {
  if (!isMobileTimedTaskInteractionEnabled.value) {
    handleTaskClick(task, event);
    return;
  }
  if (shouldSuppressTaskClick(task.id)) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  selectMobileAllDayTask(null);
  selectMobileTimedTask(null);
  handleTaskClick(task, event);
}

function handleContextMenuEditTask(task: Task): void {
  if (!task) {
    return;
  }
  emit('taskEdit', task, {
    x: contextMenu.value.x,
    y: contextMenu.value.y
  });
  hideContextMenu();
}

function showTaskContextMenu(
  task: Task,
  anchor?: { x: number; y: number },
  options: { keepTimedTaskSelected?: boolean } = {}
): void {
  if (options.keepTimedTaskSelected) {
    selectMobileTimedTask(task.id);
  }
  contextMenu.value = {
    show: true,
    x: anchor?.x ?? window.innerWidth / 2,
    y: anchor?.y ?? window.innerHeight / 2,
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

  const isRepeatTask = !!task.repeatSeriesId || (!!task.repeatFrequency && task.repeatFrequency !== 'none');
  if (isRepeatTask) {
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

function handleContextMenu(event: MouseEvent, task: Task) {
  if (isMobileDragEnabled.value) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  showTaskContextMenu(task, {
    x: event.clientX,
    y: event.clientY
  }, {
    keepTimedTaskSelected: false
  });
}

function hideContextMenu() {
  unbindContextMenuOutsidePointerDown();
  contextMenu.value = {
    show: false,
    x: 0,
    y: 0,
    task: null
  };
  contextMenuDateDraft.value = { startDate: '', startTime: '', dueDate: '', dueTime: '' };
  contextMenuRepeatFrequency.value = 'none';
  contextMenuRepeatRule.value = null;
}

function startFocusForTask(task: Task): void {
  hideContextMenu();
  openHabitTrackerFocusTimer(createTaskFocusTarget(task));
}

async function applyTaskDates(task: Task) {
  if (!task) return;

  const nextStartDate = contextMenuDateDraft.value.startDate || '';
  let nextDueDate = contextMenuDateDraft.value.dueDate || '';
  const nextStartTime = contextMenuDateDraft.value.startTime || '';
  const nextDueTime = contextMenuDateDraft.value.dueTime || '';
  if (nextStartDate && nextDueDate && nextDueDate < nextStartDate) {
    nextDueDate = nextStartDate;
  }

  const isRepeatTask = !!task.repeatSeriesId || (!!task.repeatFrequency && task.repeatFrequency !== 'none');
  if (isRepeatTask) {
    const seriesId = task.repeatSeriesId;
    const templateTask = !task.isVirtual
      ? task
      : localTasks.value.find(item => !item.isVirtual && !!seriesId && item.repeatSeriesId === seriesId);
    const targetTask = templateTask || task;
    const updatedSeries = await updateRepeatSeriesDates(
      targetTask,
      nextStartDate || null,
      nextDueDate || null,
      {
        startTime: nextStartTime || null,
        dueTime: nextDueTime || null
      },
      { emitChange: false }
    );
    if (updatedSeries) {
      const updatedTask = patchLocalTask(targetTask.id, {
        startDate: updatedSeries.startDate || '',
        dueDate: updatedSeries.endDate || '',
        startTime: updatedSeries.startTime || undefined,
        dueTime: updatedSeries.dueTime || undefined
      });
      try {
        await TaskRepository.updateTask(targetTask.id, {
          startDate: updatedSeries.startDate || '',
          dueDate: updatedSeries.endDate || '',
          startTime: updatedSeries.startTime || undefined,
          dueTime: updatedSeries.dueTime || undefined
        });
      } catch (error) {
      }
      if (updatedTask) {
        emitTaskDateChanged(updatedTask);
      }
      if (targetTask.type === 'block' && targetTask.blockId) {
        notifyRepeatChanged({
          blockId: targetTask.blockId,
          seriesId: updatedSeries.id,
          frequency: updatedSeries.frequency
        });
      }
      hideContextMenu();
      return;
    }
  }

  const updatedTask = patchLocalTask(task.id, {
    startDate: nextStartDate,
    dueDate: nextDueDate,
    startTime: nextStartTime || undefined,
    dueTime: nextDueTime || undefined
  });

  try {
    await TaskRepository.updateTask(task.id, {
      startDate: nextStartDate,
      dueDate: nextDueDate,
      startTime: nextStartTime || undefined,
      dueTime: nextDueTime || undefined
    });
  } catch (error) {
  }

  if (updatedTask) {
    emitTaskDateChanged(updatedTask);
  }

  hideContextMenu();
}

async function clearTaskDates(task: Task): Promise<void> {
  if (!task) return;

  contextMenuDateDraft.value = {
    startDate: '',
    startTime: '',
    dueDate: '',
    dueTime: ''
  };
  await applyTaskDates(task);
}

async function saveTaskRepeatRule(task: Task, repeat: RepeatFrequency | RepeatRuleInput) {
  if (!task) return;
  const frequency = typeof repeat === 'string' ? repeat : repeat.frequency;
  contextMenuRepeatFrequency.value = frequency;
  if (frequency === 'none') {
    patchLocalTask(task.id, {
      repeatFrequency: 'none',
      repeatSeriesId: undefined,
      repeatInstanceDate: undefined,
      isVirtual: false
    });
  } else {
    patchLocalTask(task.id, { repeatFrequency: frequency });
  }
  try {
    await TaskRepository.setTaskRepeatRule(task, repeat);
    hideContextMenu();
  } catch (error) {
  }
}

async function setTaskBackgroundColor(task: Task, color: string) {
  const seriesId = task.repeatSeriesId;
  const isRepeatTask = !!seriesId || (!!task.repeatFrequency && task.repeatFrequency !== 'none');
  const templateTask = isRepeatTask
    ? (!task.isVirtual
      ? task
      : localTasks.value.find(item => !item.isVirtual && !!seriesId && item.repeatSeriesId === seriesId))
    : undefined;

  let updatedTask: Task | null = null;
  if (isRepeatTask && seriesId) {
    localTasks.value = localTasks.value.map((item) => (
      item.repeatSeriesId === seriesId
        ? { ...item, backgroundColor: color }
        : item
    ));
    updatedTask = (templateTask && localTasks.value.find(item => item.id === templateTask.id))
      || localTasks.value.find(item => item.id === task.id)
      || null;
  } else {
    updatedTask = patchLocalTask(task.id, { backgroundColor: color });
  }

  if (updatedTask) {
    emitTaskDateChanged(updatedTask);
  }

  const persistenceTarget = templateTask || task;
  if (persistenceTarget.type === 'block' && persistenceTarget.blockId) {
    try {
      await setBlockAttrs(persistenceTarget.blockId, {
        'custom-task-background-color': color
      });
    } catch (error) {
    }
  }

  if (isRepeatTask) {
    try {
      await updateRepeatSeriesBackgroundColor(persistenceTarget, color);
    } catch (error) {
    }
  }

  hideContextMenu();
}

defineExpose({
  updateExternalTaskDrag,
  clearExternalTaskDrag: clearWeekDragOverState,
  dropExternalTask
});

onMounted(() => {
  handleViewportResize();
  timeUpdateInterval = setInterval(() => {
    currentTime.value = new Date();
  }, 60000);
  document.addEventListener('pointermove', handleDocumentMobileTaskPointerMove);
  document.addEventListener('pointerup', handleDocumentMobileTaskPointerUp);
  document.addEventListener('pointercancel', handleDocumentMobileTaskPointerCancel);
  document.addEventListener('pointermove', handleDocumentMobileAllDayTaskPointerMove);
  document.addEventListener('pointerup', handleDocumentMobileAllDayTaskPointerUp);
  document.addEventListener('pointercancel', handleDocumentMobileAllDayTaskPointerCancel);
  document.addEventListener('pointermove', handleDocumentMobileTimedTaskPointerMove);
  document.addEventListener('pointerup', handleDocumentMobileTimedTaskPointerUp);
  document.addEventListener('pointercancel', handleDocumentMobileTimedTaskPointerCancel);
  window.addEventListener('resize', handleViewportResize);
  document.addEventListener('pointerdown', handleGlobalPointerDown);
  document.addEventListener('mousemove', handleCreateSelectionMouseMove);
  document.addEventListener('mouseup', finishCreateSelection);
  document.addEventListener('dragend', clearWeekDragOverState, true);
  document.addEventListener('drop', clearWeekDragOverState, true);
  window.addEventListener('pinch-focus-session', handleFocusSessionUpdate);
  window.addEventListener(HABIT_CHECKIN_LOG_CHANGE_EVENT, handleHabitCheckinLogChange);
  unsubscribeHabitUpdates = eventBus.on(Events.HABITS_UPDATED, handleHabitsUpdated);
  unsubscribeMoodUpdates = eventBus.on(Events.MOOD_UPDATED, handleMoodUpdated);
  void refreshFocusSessions();
  void refreshWeekLifelogRecords();
  void centerCurrentTimeInViewport();
});

onUnmounted(() => {
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval);
  }
  clearMobileTaskDrag();
  clearMobileAllDayTaskGesture({ restorePreview: true });
  clearMobileTimedTaskGesture({ restorePreview: true });
  unbindContextMenuOutsidePointerDown();
  document.removeEventListener('pointermove', handleDocumentMobileTaskPointerMove);
  document.removeEventListener('pointerup', handleDocumentMobileTaskPointerUp);
  document.removeEventListener('pointercancel', handleDocumentMobileTaskPointerCancel);
  document.removeEventListener('pointermove', handleDocumentMobileAllDayTaskPointerMove);
  document.removeEventListener('pointerup', handleDocumentMobileAllDayTaskPointerUp);
  document.removeEventListener('pointercancel', handleDocumentMobileAllDayTaskPointerCancel);
  document.removeEventListener('pointermove', handleDocumentMobileTimedTaskPointerMove);
  document.removeEventListener('pointerup', handleDocumentMobileTimedTaskPointerUp);
  document.removeEventListener('pointercancel', handleDocumentMobileTimedTaskPointerCancel);
  window.removeEventListener('resize', handleViewportResize);
  document.removeEventListener('pointerdown', handleGlobalPointerDown);
  document.removeEventListener('mousemove', handleCreateSelectionMouseMove);
  document.removeEventListener('mouseup', finishCreateSelection);
  document.removeEventListener('dragend', clearWeekDragOverState, true);
  document.removeEventListener('drop', clearWeekDragOverState, true);
  window.removeEventListener('pinch-focus-session', handleFocusSessionUpdate);
  window.removeEventListener(HABIT_CHECKIN_LOG_CHANGE_EVENT, handleHabitCheckinLogChange);
  unsubscribeHabitUpdates?.();
  unsubscribeHabitUpdates = null;
  unsubscribeMoodUpdates?.();
  unsubscribeMoodUpdates = null;
  clearWeekDragOverState();
  taskSyncGuard.clearAllTaskSyncLocks();
  removeEventListeners();
});
</script>

<style scoped>
.week-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--b3-theme-background);
  overflow: hidden;
}

.calendar-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding:4px 10px;
  border-bottom: 1px solid var(--b3-theme-border);
}

.calendar-header {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px;
  border-radius: 9px;
  background: var(--b3-list-hover);
}

.calendar-view-switcher {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border-radius: 9px;
  background: var(--b3-list-hover);
  flex-shrink: 0;
}

.calendar-view-switcher-btn {
  min-width: 28px;
  height: 28px;
  padding: 0 8px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--b3-theme-on-surface);
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}

.calendar-view-switcher-btn:hover {
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
}

.calendar-view-switcher-btn.active {
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  box-shadow: var(--pinch-shadow);
}

.nav-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: var(--b3-theme-background);
  border-radius: 7px;
  cursor: pointer;
  color: var(--b3-theme-on-background);
  transition: background-color 0.2s;
  box-shadow: var(--pinch-shadow);
}

.nav-btn:hover {
  background: var(--b3-list-hover);
}

.header-title {
  font-size: 18px;
  font-weight: 500;
  color: var(--b3-theme-on-background);
}

.header-center {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-days-switcher {
  width: auto;
  padding: 2px 4px;
  border-radius: 6px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  height: 24px;
}

.today-btn {
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

.today-btn:hover {
  background: var(--b3-theme-background);
  border-color: var(--b3-border-color);
}

.week-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.week-grid {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.mobile-week-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(4, minmax(0, 1fr));
  gap: 8px;
  padding: 8px;
  overflow-y: auto;
  background: var(--Sv-theme-surface, var(--b3-theme-surface));
}

.mobile-week-cell {
  min-height: 0;
  border-radius: 10px;
  background: var(--b3-theme-surface);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.mobile-week-cell.mobile-month-cell {
  box-shadow: #0000000f 0 1px 5px;
}

.mobile-week-cell.today {
  border-color: #f98f7a;
}

.mobile-week-cell.drag-over {
  background: rgba(59, 130, 246, 0.12);
  box-shadow: inset 0 0 0 2px #3b82f6;
}

.mobile-cell-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 8px 10px;
  background: var(--b3-theme-background);
}

.mobile-cell-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--b3-theme-on-background);
}

.mobile-cell-date {
  font-size: 12px;
  color: var(--b3-theme-on-surface);
}

.mobile-mini-calendar {
  flex: 1;
  min-height: 0;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mobile-mini-weekdays {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 2px;
}

.mobile-mini-days {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  grid-template-rows: repeat(6, minmax(0, 1fr));
  flex: 1;
  min-height: 0;
  gap: 2px;
}

.mobile-mini-weekday {
  text-align: center;
  font-size: 10px;
  color: var(--b3-theme-on-surface);
  opacity: 0.7;
}

.mobile-mini-day {
  border: none;
  background: transparent;
  color: var(--b3-theme-on-background);
  border-radius: 6px;
  height: auto;
  min-height: 0;
  padding: 0;
  font-size: 11px;
  cursor: pointer;
}

.mobile-mini-day.is-other-month {
  opacity: 0.35;
}

.mobile-mini-day.is-in-week {
  background: var(--b3-theme-primary-lightest);
  font-weight: 600;
}

.mobile-mini-day.is-today {
  background: #f98f7a;
  color: #fff;
  font-weight: 700;
}

.mobile-chip-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px;
}

.mobile-task-chip {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px 4px 8px;
  border-radius: 8px;
  background: var(--pinch-background7);
  cursor: pointer;
}

.mobile-task-chip::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 4px;
  bottom: 4px;
  width: 3px;
  border-radius: 999px;
  background: var(--pinch-task-chip-color, var(--pinch-color6));
}

.mobile-task-chip.habit-task-chip::before,
.day-expanded-chip.habit-task-chip::before {
  display: none;
}

.mobile-task-chip-title {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  color: var(--b3-theme-on-background);
}

.mobile-task-chip.task-completed .mobile-task-chip-title {
  text-decoration: line-through;
  opacity: 0.65;
}

.mobile-empty-tip {
  margin: auto 0;
  text-align: center;
  color: var(--b3-theme-on-surface);
  opacity: 0.65;
  font-size: 11px;
  padding: 8px 0;
}

.mobile-day-weekdates {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  padding: 8px;
  background: var(--Sv-theme-surface, var(--b3-theme-surface));
}

.mobile-day-weekdate-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  flex: 1 1 0;
  min-width: 38px;
  max-width: 50px;
  min-height: 0;
  border: none;
  border-radius: 14px;
  background-color: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  padding: 6px;
  box-shadow: rgba(0, 0, 0, 0.03) 0px 1px 5px 0px;
  cursor: pointer;
  overflow: hidden;
  position: relative;
}

.mobile-day-weekdate-name {
  font-size: 10px;
  position: relative;
}

.mobile-day-weekdate-name::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 0;
  right: 0;
  height: 1px;
  background-color: var(--b3-border-color);
}

.mobile-day-weekdate-number {
  font-size: 14px;
  z-index: 1;
  margin-top: 15px;
}

.mobile-day-weekdate-item.is-active {
  background-color: var(--b3-theme-on-background);
  color: var(--b3-theme-background);
}

.mobile-day-weekdate-item.is-active .mobile-day-weekdate-name {
  color: inherit;
}

.mobile-day-weekdate-item.is-today .mobile-day-weekdate-name {
  color: #f98f7a;
}

.weekday-header {
  display: flex;
  height: 30px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--b3-border-color);
}

.all-day-label-cell {
  width: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex-shrink: 0;
}

.all-day-label-text {
  font-size: 12px;
  font-weight: 500;
  color: var(--b3-theme-on-surface-light);
}

.days-control-btn {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: var(--b3-theme-on-background);
  font-size: 14px;
  font-weight: bold;
  transition: background-color 0.2s;
}

.days-control-btn:hover:not(:disabled) {
  background: var(--b3-list-hover);
}

.days-control-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.days-count {
  font-size: 12px;
  font-weight: 500;
  color: var(--b3-theme-on-background);
  min-width: 16px;
  text-align: center;
}

.weekday-cell {
  flex: 1;
  text-align: center;
  padding: 8px;
  border: none;
  border-radius: 0;
  background: transparent;
  color: inherit;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.weekday-cell:hover {
  background: var(--b3-list-hover);
}

.weekday-cell:last-child {
  border-right: none;
}

.weekday-cell.today .day-number {
  color: var(--b3-theme-background);
  background-color: #f98f7a;
  border-radius: 6px;
  padding: 0;
}

.weekday-name {
  font-size: 14px;
  color: var(--b3-theme-on-surface);
  opacity: 0.7;
}

.day-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--b3-theme-on-background);
}

.all-day-section {
  flex-shrink: 0;
  border-bottom: 1px solid var(--b3-border-color);
  position: relative;
  display: flex;
}

.all-day-label-in-section {
  width: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  opacity: 0.7;
  cursor: pointer;
  user-select: none;
  gap: 4px;
  border-right: 1px solid var(--b3-border-color);
  flex-shrink: 0;
}

.collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
}

.all-day-columns {
  display: flex;
  position: relative;
  height: 100%;
  flex: 1;
}

.all-day-columns.collapsed {
  visibility: hidden;
}

.all-day-column {
  flex: 1;
  border-right: 1px solid var(--b3-border-color);
  height: 100%;
}

.all-day-column.last-column {
  border-right: none;
}

.all-day-column.drag-over,
.day-column.drag-over,
.hour-cell.drag-over {
  background: rgba(59, 130, 246, 0.15);
  box-shadow: inset 0 0 0 2px #3b82f6;
}

.all-day-column.create-selecting {
  background: var(--b3-theme-primary-lightest);
}

.all-day-tasks-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  padding: 0 5px;
}

.all-day-task {
  padding: 3px 6px;
  border-radius: 6px;
  font-size: 11px;
  cursor: default;
  background-color: var(--pinch-background7);
  border-left: 2px solid transparent;
  transition: background-color 0.15s;
  display: flex;
  align-items: center;
  white-space: nowrap;
  overflow: visible;
  pointer-events: auto;
  position: relative;
  margin-left: 5px;
}

.all-day-task::before {
  content: '';
  position: absolute;
  left: 1px;
  top: 3px;
  bottom: 3px;
  width: 4px;
  border-radius: 999px;
  background: var(--pinch-task-chip-color, var(--pinch-color6));
  pointer-events: none;
}

.all-day-habit-task {
  padding: 3px 6px;
  border-radius: 20px;
  font-size: 11px;
  cursor: default;
  border: 1px solid var(--pinch-task-chip-color, var(--pinch-color6));
  transition: background-color 0.15s;
  display: flex;
  align-items: center;
  white-space: nowrap;
  overflow: visible;
  pointer-events: auto;
  position: relative;
  margin-left: 5px;
}

.all-day-habit-task.task-completed {
  opacity: 0.6;
}

.all-day-habit-task .task-chip-title {
  cursor: default;
}

.all-day-task:hover {
  background: var(--b3-list-hover);
}

.all-day-task.mobile-selected {
  box-shadow: 0 0 0 2px var(--pinch-task-chip-color, var(--pinch-color6));
  z-index: 25;
}

.task-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: col-resize;
  transition: background 0.2s;
  z-index: 20;
  border-radius: 2px;
}

.all-day-task .task-handle::after {
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

.task-handle-left {
  left: 0;
}

.task-handle-left::after {
  left: 3px;
}

.task-handle-right {
  right: 0;
}

.task-handle-right::after {
  right: 3px;
}

.task-chip-title {
  white-space: nowrap;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 3px;
  flex: 1;
  margin: 0 4px;
  cursor: grab;
  user-select: none;
}

.task-checkbox-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
}

.task-title-text {
  flex: 0 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.habit-emoji {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  margin-right: 3px;
  line-height: 1;
}

.task-priority-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 2px;
  margin-left: 3px;
  flex-shrink: 0;
}

.task-priority-badge.priority-high {
  background: var(--pinch-background10);
  color: var(--pinch-font-color10);
}

.task-priority-badge.priority-medium {
  background: var(--pinch-background3);
  color: var(--pinch-font-color3);
}

.task-priority-badge.priority-low {
  background: var(--pinch-background7);
  color: var(--pinch-font-color7);
}

.task-jump-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 2px;
  cursor: pointer;
  flex-shrink: 0;
  opacity: 0.5;
  transition: opacity 0.15s;
}

.task-jump-btn:hover {
  opacity: 1;
  background: var(--b3-list-hover);
}

.task-chip-title:active {
  cursor: grabbing;
}

.task-chip-title.task-dragging {
  cursor: grabbing;
}

.all-day-task:has(.task-chip-title.task-dragging) {
  opacity: 0.72;
  box-shadow: 0 0 0 2px var(--pinch-task-chip-color, var(--pinch-color6));
}

.all-day-task.task-completed {
  opacity: 0.6;
}

.all-day-task.task-completed .task-chip-title {
  text-decoration: line-through;
}

.more-all-day {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  pointer-events: none;
  z-index: 24;
  --more-pill-reserve-width: 30px;
  font-size: 11px;
}

.more-all-day.collapsed {
  justify-content: center;
}

.more-all-day-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  box-sizing: border-box;
  width: var(--more-pill-reserve-width);
  max-width: calc(100% - 4px);
  padding: 0 6px;
  border: 1px dashed var(--b3-border-color);
  border-radius: 6px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-surface);
  font-size: inherit;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  pointer-events: auto;
  transition: background-color 0.2s;
}

.more-all-day-pill:hover {
  background: var(--b3-font-background2);
}

.day-expanded-panel {
  position: absolute;
  border: 1px solid var(--b3-border-color);
  border-radius: 8px;
  background: var(--b3-theme-background);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  z-index: 30;
  display: flex;
  flex-direction: column;
  overflow: visible;
}

.all-day-expanded-panel {
  top: 4px;
}

.day-expanded-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 6px;
}

.day-expanded-title {
  font-size: 10px;
  font-weight: 600;
  color: var(--b3-theme-on-surface);
}

.day-expanded-close {
  border: none;
  border-radius: 999px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-surface);
  font-size: 10px;
  padding: 2px 8px;
  cursor: pointer;
}

.day-expanded-list {
  overflow: visible;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.day-expanded-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 18px;
  border-radius: 6px;
  padding: 2px 6px;
  border-left: 2px solid transparent;
  position: relative;
  background: var(--b3-theme-surface);
}

.day-expanded-chip::before {
  content: '';
  position: absolute;
  left: 1px;
  top: 3px;
  bottom: 3px;
  width: 4px;
  border-radius: 999px;
  background: var(--pinch-task-chip-color, var(--pinch-color6));
  pointer-events: none;
}

.day-expanded-chip.habit-task-chip::before {
  display: none;
}

.day-expanded-chip.task-completed {
  opacity: 0.6;
}

.day-expanded-chip-title {
  flex: 1;
  min-width: 0;
  font-size: 10px;
  line-height: 1.3;
  color: var(--b3-theme-on-background);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.day-expanded-empty {
  padding: 8px 4px;
  font-size: 10px;
  text-align: center;
  color: var(--b3-theme-on-surface);
  opacity: 0.6;
}

.inactive-hours-labels {
  position: relative;
}

.inactive-hours-toggle-btn {
  position: absolute;
  right: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  cursor: pointer;
  user-select: none;
  color: var(--b3-theme-on-surface);
  opacity: 0.5;
  border-radius: 4px;
  z-index: 2;
  transition: opacity 0.15s;
  transform: translateY(-50%);
}

.inactive-hours-toggle-btn:hover {
  opacity: 0.9;
  background: var(--b3-list-hover);
}

.inactive-hours-cells {
  position: relative;
}

.days-scroll {
  flex: 1;
  overflow-y: auto;
  position: relative;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.days-scroll::-webkit-scrollbar {
  display: none;
}

.days-grid {
  display: flex;
  position: relative;
  min-height: 1152px;
}

.time-labels-column {
  width: 60px;
  flex-shrink: 0;
  border-right: 1px solid var(--b3-border-color);
  position: sticky;
  left: 0;
  background: var(--b3-theme-background);
  z-index: 1;
  height: 1152px;
}

.time-label {
  position: absolute;
  top: 0;
  right: 8px;
  font-size: 11px;
  color: var(--b3-theme-on-surface);
  opacity: 0.6;
  transform: translateY(-50%);
  white-space: nowrap;
}

.day-column {
  flex: 1;
  border-right: 1px solid var(--b3-border-color);
  position: relative;
  min-height: 1152px;
  --focus-track-width: calc(50% - 1px);
}

.day-column:last-child {
  border-right: none;
}

.timed-create-selection {
  position: absolute;
  left: 0;
  right: 0;
  background: var(--b3-theme-primary-lightest);
  box-shadow: inset 0 0 0 2px var(--b3-theme-primary);
  pointer-events: none;
  z-index: 2;
}

.timed-tasks-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  padding: 0 4px;
}

.week-lifelog-layer,
.focus-sessions-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 3;
}

.week-lifelog-block,
.focus-session-block {
  position: absolute;
  padding: 0;
  border: 2px dashed var(--pinch-color2);
  border-radius: 6px;
  background: var(--pinch-background2);
  color: var(--b3-theme-on-background);
  overflow: hidden;
  box-sizing: border-box;
  pointer-events: auto;
}

.week-lifelog-block.is-habit-checkin {
  border-color: var(--pinch-color5);
  background: var(--pinch-background5);
}

.week-lifelog-block.is-task-completed {
  border-color: var(--pinch-color7);
  background: var(--pinch-background7);
}


.week-lifelog-block.is-manual-note {
  border-color: var(--pinch-color8);
  background: var(--pinch-background8);
}

.week-lifelog-block {
  overflow: visible;
}

.week-lifelog-title,
.focus-session-title {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  padding: 4px 5px 0;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.focus-session-title span {
  overflow: hidden;
  text-overflow: ellipsis;
}

.week-lifelog-emoji {
  display: inline-flex;
  width: 14px;
  height: 14px;
  align-items: center;
  justify-content: center;
  flex: 0 0 14px;
  line-height: 1;
  overflow: visible;
  text-align: center;
}

.week-lifelog-emoji :deep(svg) {
  display: block;
  width: 14px;
  height: 14px;
}

.week-lifelog-time {
  flex: 0 0 auto;
  min-width: 0;
  padding: 0;
  margin: 0;
  color: var(--b3-theme-on-surface);
  font-size: 10px;
  font-weight: 400;
  line-height: 1.25;
  opacity: 0.78;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.week-lifelog-item-title {
  flex: 1 1 auto;
  min-width: 0;
  color: var(--b3-theme-on-background);
  font-size: 10px;
  font-weight: 500;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.focus-session-time {
  padding: 0 5px;
  margin-top: 2px;
  color: var(--b3-theme-on-surface);
  font-size: 10px;
  opacity: 0.78;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.week-lifelog-note,
.focus-session-note {
  padding: 0 5px 4px;
  margin-top: 2px;
  color: var(--b3-theme-on-background);
  font-size: 10px;
  line-height: 1.25;
  opacity: 0.82;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.week-lifelog-note {
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
  word-break: break-word;
}

.timed-task {
  position: absolute;
  left: 4px;
  right: 4px;
  padding: 0;
  border-radius: 6px;
  font-size: 11px;
  background: var(--pinch-background7);
  border-left: 2px solid transparent;
  pointer-events: auto;
  overflow: hidden;
  cursor: default;
  display: flex;
  flex-direction: column;
  transition: background-color 0.15s, box-shadow 0.15s, transform 0.15s;
  z-index: 2;
}

.timed-task-handle {
  position: absolute;
  left: 0;
  right: 0;
  height: 10px;
  cursor: ns-resize;
  transition: background 0.2s, opacity 0.2s;
  z-index: 10;
  opacity: 1;
  pointer-events: auto;
}

.timed-task.mobile-selected {
  box-shadow: 0 0 0 2px var(--pinch-task-chip-color, var(--pinch-color6));
  transform: translateY(-1px);
  overflow: visible;
}

.timed-task-handle::after {
  display: none;
  content: '';
  position: absolute;
  left: 50%;
  width: 44px;
  height: 9px;
  border-radius: 6px;
  transform: translateX(-50%);
  background: color-mix(in srgb, var(--pinch-task-chip-color, var(--pinch-color6)) 72%, white 28%);
  box-shadow: var(--pinch-shadow);
}


.timed-task-handle-top {
  top: 0;
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
}

.timed-task-handle-top::after {
  top: 2px;
}


.timed-task-handle-bottom {
  bottom: 0;
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
}

.timed-task-handle-bottom::after {
  bottom: 2px;
}


.timed-task-content {
  padding: 4px 6px;
  min-height: 20px;
}

.mobile-timed-task-more {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  margin-left: auto;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.18);
  color: inherit;
  opacity: 0.88;
  flex-shrink: 0;
}

.mobile-timed-task-more svg {
  fill: currentColor;
}

.timed-task.task-dragging {
  opacity: 0.7;
  cursor: grabbing;
}

.timed-task:not(.task-dragging) {
  cursor: grab;
}

.timed-task-title {
  font-weight: 500;
  color: var(--b3-theme-on-background);
  white-space: nowrap;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 3px;
}

.timed-task-time {
  font-size: 10px;
  color: var(--b3-theme-on-surface);
  opacity: 0.7;
  margin-top: 2px;
}

.timed-task.task-completed .timed-task-title {
  text-decoration: line-through;
  opacity: 0.6;
}

.hour-cell {
  height: 48px;
  box-shadow: inset 0 -1px 0 0 var(--b3-list-hover);
}

.current-time-line {
  position: absolute;
  height: 2px;
  background: #dc2626;
  z-index: 10;
  pointer-events: none;
  transform: translateY(-25%);
}

.current-time-line::before {
  content: '';
  position: absolute;
  left: -4px;
  top: -3px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #dc2626;
}

.current-time-label {
  position: absolute;
  left: 8px;
  padding: 2px 6px;
  font-size: 11px;
  color: white;
  font-weight: 500;
  background: #dc2626;
  border-radius: 5px;
  transform: translateY(-50%);
  white-space: nowrap;
  z-index: 10;
  pointer-events: none;
}

.current-time-line-full {
  position: absolute;
  left: 60px;
  right: 0;
  height: 1px;
  background: #dc2626;
  opacity: 0.3;
  z-index: 9;
  pointer-events: none;
}

.mobile-drag-preview {
  position: fixed;
  max-width: min(72vw, 260px);
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.92);
  color: #fff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.24);
  transform: translate(0, -100%);
  pointer-events: none;
  z-index: 1300;
}

.mobile-drag-preview-title {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mobile-drag-preview-hint {
  margin-top: 4px;
  font-size: 11px;
  line-height: 1.3;
  color: rgba(255, 255, 255, 0.75);
}

@media (hover: hover) and (pointer: fine) {
  .all-day-task .task-handle {
    top: -3px;
    bottom: -3px;
    width: 14px;
  }

  .all-day-task .task-handle-left {
    left: -7px;
  }

  .all-day-task .task-handle-left::after {
    left: 4px;
  }

  .all-day-task .task-handle-right {
    right: -7px;
  }

  .all-day-task .task-handle-right::after {
    right: 4px;
  }

  .all-day-task:hover {
    box-shadow: 0 0 0 2px var(--pinch-task-chip-color, var(--pinch-color6));
    z-index: 25;
  }

  .all-day-task:hover .task-handle::after {
    display: block;
  }

  .timed-task-handle {
    left: -3px;
    right: -3px;
    height: 14px;
  }

  .timed-task-handle-top {
    top: -7px;
  }

  .timed-task-handle-top::after {
    top: 4px;
  }

  .timed-task-handle-bottom {
    bottom: -7px;
  }

  .timed-task-handle-bottom::after {
    bottom: 4px;
  }

  .timed-task:hover {
    box-shadow: 0 0 0 2px var(--pinch-task-chip-color, var(--pinch-color6));
    transform: translateY(-1px);
    overflow: visible;
    z-index: 25;
  }

  .timed-task:hover .timed-task-handle::after {
    display: block;
  }
}

.mobile-task-chip,
.all-day-habit-task,
.all-day-task,
.all-day-task .task-handle,
.all-day-task .task-chip-title,
.day-expanded-chip,
.timed-task {
  -webkit-touch-callout: none;
  touch-action: none;
}

@media (max-width: 768px) {
  .mobile-week-cell.drag-over {
    background: var(--b3-theme-surface);
    box-shadow: none;
  }

  .all-day-column.drag-over,
  .day-column.drag-over,
  .hour-cell.drag-over {
    background: transparent;
    box-shadow: none;
  }

  .week-view.mobile-week-grid-mode .header-days-switcher {
    display: none;
  }

  .weekday-header > .all-day-label-cell {
    visibility: hidden;
    pointer-events: none;
  }

  .header-title {
    font-size: 15px;
  }

  .today-btn {
    padding: 4px 10px;
    font-size: 12px;
  }

  .weekday-header {
    height: 26px;
  }

  .weekday-name {
    font-size: 11px;
  }

  .day-number {
    width: 18px;
    height: 18px;
    font-size: 11px;
  }

  .all-day-label-text,
  .all-day-label-in-section,
  .days-count {
    font-size: 10px;
  }

  .all-day-task,
  .all-day-habit-task,
  .task-title-text {
    font-size: 9px;
  }

  .all-day-task .task-handle {
    display: none;
    pointer-events: none;
    top: -4px;
    bottom: -4px;
    width: 20px;
  }

  .all-day-task .task-handle-left {
    left: -10px;
  }

  .all-day-task .task-handle-left::after {
    left: 7px;
  }

  .all-day-task .task-handle-right {
    right: -10px;
  }

  .all-day-task .task-handle-right::after {
    right: 7px;
  }

  .all-day-task .task-handle.mobile-visible {
    display: block;
    pointer-events: auto;
  }

  .all-day-task .task-handle.mobile-visible::after {
    display: block;
  }

  .more-all-day {
    --more-pill-reserve-width: 30px;
    font-size: 9px;
  }

  .more-all-day-pill {
    padding: 0 5px;
  }

  .time-label {
    font-size: 9px;
  }

  .timed-task {
    font-size: 9px;
  }

  .timed-task-handle {
    display: none;
    pointer-events: none;
  }

  .timed-task-handle.mobile-visible {
    display: block;
    pointer-events: auto;
    opacity: 1;
    height: 18px;
  }

  .timed-task-handle.mobile-visible::after {
    display: block;
  }

  .timed-task-handle.mobile-visible.timed-task-handle-top {
    top: -9px;
  }

  .timed-task-handle.mobile-visible.timed-task-handle-bottom {
    bottom: -9px;
  }

  .timed-task-content {
    padding: 3px 4px;
  }

  .timed-task-handle.mobile-visible.timed-task-handle-top::after {
    top: 4px;
  }

  .timed-task-handle.mobile-visible.timed-task-handle-bottom::after {
    bottom: 4px;
  }

  .timed-task-time {
    font-size: 8px;
  }

  .week-view.mobile-day-view-mode .timed-task {
    font-size: 14px;
  }

  .week-view.mobile-day-view-mode .timed-task .task-title-text {
    font-size: inherit;
  }

  .week-view.mobile-day-view-mode .timed-task-time {
    font-size: 13px;
  }

  .week-view.mobile-day-view-mode .timed-task.mobile-selected,
  .week-view.mobile-three-day-view-mode .timed-task.mobile-selected {
    box-shadow: 0 0 0 2px var(--pinch-task-chip-color, var(--pinch-color6));
  }

  .week-view.mobile-day-view-mode .timed-task-handle::after,
  .week-view.mobile-three-day-view-mode .timed-task-handle::after {
    width: 50px;
    height: 10px;
    border-radius: 7px;
  }

  .current-time-label {
    font-size: 9px;
    padding: 1px 4px;
  }

  .all-day-expanded-panel {
    position: fixed;
    left: 0;
    right: 0;
    top: auto;
    bottom: 0;
    width: auto;
    max-width: none;
    border-radius: 12px 12px 0 0;
    border-left: none;
    border-right: none;
    border-bottom: none;
    box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.16);
    z-index: 1200;
    padding-bottom: env(safe-area-inset-bottom);
  }

  .day-expanded-title,
  .day-expanded-close,
  .day-expanded-chip-title,
  .day-expanded-empty {
    font-size: 9px;
  }
}

</style>
