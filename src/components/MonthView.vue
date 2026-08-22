<template>
  <div class="month-view">
    <div class="month-view-layout">
      <CalendarTaskSidebar
        v-if="!sidebarCollapsed"
        :tasks="sidebarTasks || tasks"
        :document-title-by-root-id="documentTitleByRootId"
        :display-options="displayOptions"
        @task-toggle="toggleTaskStatus"
        @task-edit="(task, anchor) => emit('taskEdit', task, anchor)"
        @date-select="focusMonth"
        @calendar-display-toggle="emit('calendarDisplayToggle', $event)"
        @calendar-task-drag-start="handleCalendarTaskDragStart"
        @calendar-task-drag-move="handleCalendarTaskDragMove"
        @calendar-task-drag-end="handleCalendarTaskDragEnd"
        @calendar-task-drag-cancel="handleCalendarTaskDragCancel"
      />
      <div class="calendar-container">
      <div class="calendar-toolbar">
        <div class="calendar-toolbar-top">
          <button type="button" class="nav-btn ariaLabel" :aria-label="t(sidebarCollapsed ? 'weekView.expandSidebar' : 'weekView.collapseSidebar')" @click="emit('sidebarCollapsedChange', !sidebarCollapsed)">
            <Icon :name="sidebarCollapsed ? 'chevronRight' : 'chevronLeft'" width="20" height="20" />
          </button>
          <div class="calendar-toolbar-actions">
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
          <button class="today-btn" @click="goToToday">{{ t('weekView.today') }}</button>
          <button
            class="nav-btn ariaLabel"
            :aria-label="t('date.previousMonth')"
            @click="previousMonth"
          >
            <Icon name="chevronLeft" width="20" height="20" />
          </button>
          <button
            class="nav-btn ariaLabel"
            :aria-label="t('date.nextMonth')"
            @click="nextMonth"
          >
            <Icon name="chevronRight" width="20" height="20" />
          </button>
          </div>
        </div>
        <div class="month-title">{{ monthTitle }}</div>
      </div>
      <div class="calendar-grid">
        <div class="weekday-header">
          <div v-for="weekday in weekdays" :key="weekday" class="weekday">
            {{ weekday }}
          </div>
        </div>
        <div class="weeks-container">
          <div 
            v-for="(week, weekIndex) in calendarWeeks" 
            :key="`week-${weekIndex}`"
            class="week-row"
            :style="getWeekRowStyle(week)"
          >
            <div class="week-days-grid">
              <div 
                v-for="day in week" 
                :key="day.key"
                class="day-cell all-day-column"
                :data-day-key="day.key"
                :class="{
                  'other-month': day.isOtherMonth,
                  'today': day.isToday,
                  'drag-over': dragOverDay === day.key,
                  'create-selecting': isDayInCreateSelection(day.key)
                }"
                @mousedown.left="handleDayCellMouseDown(day, $event)"
                @mouseenter="handleDayCellMouseEnter(day)"
                @dragover.prevent="handleDragOver(day)"
                @dragleave="handleDragLeave"
                @drop="handleDrop(day, $event)"
              >
                <div class="day-info">
                  <div class="day-date-inline">
                    <button
                      type="button"
                      class="day-number ariaLabel"
                     
                      :aria-label="t('monthView.lifelogOpen')"
                      @mousedown.stop
                      @click.stop="openLifelogDay(day.key)"
                    >
                      {{ day.dayNumber }}
                    </button>
                    <div
                      v-if="(showRecordsLifelog && (getMoodDaySummary(day.key) || getManualNoteDaySummary(day.key))) || (showHabitLifelog && getHabitCheckinDaySummary(day.key)) || (showTaskLifelog && getTaskCompletedDaySummary(day.key)) || (showFocusRecords && getFocusDaySummary(day.key))"
                      class="day-compact-lifelog-summary ariaLabel"
                      :aria-label="getCompactLifelogSummaryTitle(day.key)"
                      @mousedown.stop
                      @click.stop="openLifelogDay(day.key)"
                    >
                      <span v-if="showFocusRecords && getFocusDaySummary(day.key)" class="day-focus-summary">
                        <Icon name="timer" width="11" height="11" />
                        <span>{{ formatFocusDaySummary(day.key) }}</span>
                      </span>
                      <span v-if="showRecordsLifelog && (getMoodDaySummary(day.key) || getManualNoteDaySummary(day.key))" class="day-mood-summary">
                        <span
                          v-if="getMoodDaySummarySvg(day.key)"
                          class="day-mood-summary-icon"
                          v-html="getMoodDaySummarySvg(day.key)"
                        ></span>
                        <span v-else-if="getMoodDaySummary(day.key)">{{ formatMoodDaySummary(day.key) }}</span>
                        <span v-if="getManualNoteDaySummary(day.key)">{{ formatManualNoteDaySummary(day.key) }}</span>
                      </span>
                      <span v-if="showHabitLifelog && getHabitCheckinDaySummary(day.key)" class="day-habit-summary">
                        <Icon name="squareCheck" width="10" height="10" />
                        <span>{{ formatHabitCheckinDaySummary(day.key) }}</span>
                      </span>
                      <span v-if="showTaskLifelog && getTaskCompletedDaySummary(day.key)" class="day-task-summary">
                        <Icon name="taskCheckboxChecked" width="10" height="10" />
                        <span>{{ formatTaskCompletedDaySummary(day.key) }}</span>
                      </span>
                    </div>
                  </div>
                  <div 
                    v-if="showLunarInfo && day.lunarInfo" 
                    class="day-lunar"
                    :class="{ 
                      'festival': day.lunarInfo.isFestival,
                      'term': day.lunarInfo.isTerm 
                    }"
                  >
                    {{ day.lunarInfo.isFestival ? (day.lunarInfo.lunarFestival || day.lunarInfo.festival) : (day.lunarInfo.isTerm ? day.lunarInfo.term : day.lunarInfo.dayCn) }}
                  </div>
                </div>
              </div>
            </div>
            <div class="week-tasks-layer">
              <div 
                v-for="task in getTasksForWeek(week)"
                :key="task.id"
                class="ariaLabel"
                :aria-label="getTaskDisplayTitle(task)"
                :class="[isHabitTaskChip(task) ? 'habit-task-chip' : 'task-chip', {
                  'task-completed': task.status === 'completed',
                  'task-dragging': draggingTask?.task.id === task.id,
                  'keyboard-selected': selectedCalendarTaskId === task.id,
                  'mobile-selected': !isHabitTaskChip(task) && shouldShowMobileTaskChipControls(task.id)
                }]"
                :style="getTaskStyle(task, week)"
                @click="!isHabitTaskChip(task) && handleMobileTaskChipClick($event, task)"
                @pointerdown="!isHabitTaskChip(task) && handleMobileTaskChipPointerDown($event, task)"
                @pointermove="handleMobileTaskChipPointerMove"
                @pointerup="handleMobileTaskChipPointerUp"
                @pointercancel="handleMobileTaskChipPointerCancel"
                @contextmenu="!isHabitTaskChip(task) && handleContextMenu($event, task)"
              >
                <div 
                  v-if="!isHabitTaskChip(task)"
                  class="task-handle task-handle-left"
                  :class="{
                    'handle-dragging': draggingHandle?.task.id === task.id && draggingHandle?.type === 'start',
                    'mobile-visible': shouldShowMobileTaskChipControls(task.id)
                  }"
                  @mousedown="handleHandleMouseDown($event, task, 'start')"
                  @pointerdown.stop="handleMobileTaskChipHandlePointerDown($event, task, 'start')"
                ></div>
                <div 
                  class="task-chip-title"
                  :class="{ 'task-dragging': draggingTask?.task.id === task.id }"
                  @mousedown="!isHabitTaskChip(task) && handleTaskMouseDownWithSelection($event, task)"
                >
                  <span
                    class="task-checkbox-wrapper"
                    @mousedown.stop
                    @click.stop="toggleTaskStatus(task, $event)"
                  >
                    <TaskCheckbox :checked="task.status === 'completed'" :size="12" />
                  </span>
                  <span v-if="isHabitTaskChip(task) && task.icon" class="habit-emoji">{{ task.icon }}</span>
                  <TaskTitlePlain
                    class="task-title-text"
                    :title="task.title"
                    @click.stop="!isHabitTaskChip(task) && handleTaskClick(task, $event)"
                  />
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
                    'mobile-visible': shouldShowMobileTaskChipControls(task.id)
                  }"
                  @mousedown="handleHandleMouseDown($event, task, 'end')"
                  @pointerdown.stop="handleMobileTaskChipHandlePointerDown($event, task, 'end')"
                ></div>
                </div>
              </div>
              <template v-if="allDayTaskDragPreview && week.some(day => day.key === allDayTaskDragPreview.startDate)">
                <div class="month-task-drag-outline" :style="getMonthTaskDragPreviewStyle(allDayTaskDragPreview, week, false)"></div>
                <div class="task-chip month-task-drag-ghost" :ref="setMonthTaskDragGhostElement" :style="getMonthTaskDragPreviewStyle(allDayTaskDragPreview, week, true)">
                  <div class="task-chip-title"><TaskTitlePlain :title="allDayTaskDragPreview.task.title" /></div>
                </div>
              </template>
            </div>
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
      :add-annotation-label="t('lifelogTimeline.addAnnotationLabel')"
      :show-editor="Boolean(lifelogDayKey)"
      :draft="lifelogTimelineDraft"
      :editor-placeholder="t('monthView.lifelogManualPlaceholder')"
      :save-label="t('common.save')"
      :cancel-label="t('common.cancel')"
      :delete-confirm-title="t('lifelogTimeline.deleteConfirmTitle')"
      :delete-confirm-message="t('lifelogTimeline.deleteConfirmMessage')"
      :date-strip-days="lifelogTimelineDateStripDays"
      :current-period="monthTitle"
      :previous-period-label="t('date.previousMonth')"
      :next-period-label="t('date.nextMonth')"
      @close="closeLifelogDay"
      @change-period="changeLifelogTimelinePeriod"
      @select-date="openLifelogDay"
      @update:draft="updateLifelogTimelineDraft"
      @save-draft="saveLifelogTimelineDraft"
      @clear-draft="clearLifelogTimelineDraft"
      @delete-item="deleteLifelogTimelineItem"
      @update-item="updateLifelogTimelineItem"
      @update-annotation="updateLifelogTimelineAnnotation"
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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type { FocusSessionRecord, Habit, MoodData, MoodManualEntry, Task, TaskGroup } from '@/api';
import type { Goal } from '@/goalRepository';
import {
  deleteFocusSessionRecord,
  getFocusTimerData,
  getHabits,
  getMoodData,
  removeMoodEntry,
  saveHabits,
  upsertMoodEntry,
  upsertHabit,
  setBlockAttrs,
  TaskRepository
} from '@/api';
import { requestTaskCompletionNote, updateTaskMarkdown } from '@/utils/taskHelpers';
import { getCheckinNotePromptAnchor } from '@/utils/checkinNotePrompt';
import { getTaskDisplayTitle } from '@/composables/useTaskCommon';
import { getTaskPriorityLabel } from '@/utils/taskPriority';
import { formatDate } from '@/composables/useDateUtils';
import { useTaskDrag } from '@/composables/useTaskDrag';
import { useTaskSyncGuard } from '@/composables/useTaskSyncGuard';
import { useTaskLocalMutations } from '@/composables/useTaskLocalMutations';
import { useHabitEmojis } from '@/composables/useHabitEmojis';
import { getRepeatSeriesForTask, notifyRepeatChanged, updateRepeatSeriesDates, type RepeatFrequency, type RepeatRule, type RepeatRuleInput } from '@/repeatRepository';
import { belongsToRepeatSeries, getDayDiff, isRepeatTask as isRepeatTaskEntity, shiftDate } from '@/utils/repeatTaskUtils';
import { persistTaskBackgroundColor } from '@/utils/taskBackgroundColorPersistence';
import {
  normalizeTaskBackgroundColorValue,
  resolveEffectiveTaskBackgroundColor,
  resolveTaskAccentColor,
  resolveTaskBackgroundColor,
  resolveTaskGroupBackgroundColor
} from '@/utils/taskColor';
import { resolveGroupColorCss, resolveGroupColorLayerCss, resolveGroupTextColor } from '@/utils/groupColor';
import {
  TASK_BACKGROUND_COLOR_OPTIONS,
  TASK_BACKGROUND_COLOR_VALUES
} from '@/utils/taskGroupShared';
import solarLunar from '@/utils/solarLunar.js';
import Icon from './Icon.vue';
import CalendarTaskSidebar from './CalendarTaskSidebar.vue';
import TaskTitlePlain from './TaskTitlePlain.vue';
import TaskCheckbox from './TaskCheckbox.vue';
import TaskContextMenu from './TaskContextMenu.vue';
import LifelogTimelinePanel, {
  type LifelogTimelinePanelBadge,
  type LifelogTimelineDateStripDay,
  type LifelogTimelinePanelItem
} from './LifelogTimelinePanel.vue';
import { openHabitTrackerFocusTimer } from '@/main';
import { createTaskFocusTarget } from '@/utils/focusTimerTarget';
import { formatTemplate, useI18n } from '@/composables/useI18n';
import {
  createCalendarTaskDateFields,
  getEffectiveDueDate,
  normalizeOptionalDateValue,
  saveCalendarTaskDates,
  type CalendarTaskDateFields
} from '@/utils/calendarTaskDates';
import {
  focusRecordsToLifelogEvents,
  type FocusLifelogEvent,
  type HabitCheckinLifelogEvent,
  habitsToLifelogEvents,
  type LifelogEventType,
  moodDataToLifelogEvents,
  moodManualEntriesToLifelogEvents,
  type MoodLifelogEvent,
  type ManualNoteLifelogEvent,
  summarizeManualNoteLifelogEventsByDay,
  summarizeFocusLifelogEventsByDay,
  summarizeHabitCheckinLifelogEventsByDay,
  summarizeMoodLifelogEventsByDay,
  summarizeTaskCompletedLifelogEventsByDay,
  type TaskCompletedLifelogEvent,
  tasksToCompletedLifelogEvents
} from '@/utils/lifelogEvents';
import { eventBus, Events } from '@/utils/eventBus';
import { publishLifelogTaskSnapshot } from '@/utils/lifelogTaskSnapshot';
import { publishLifelogTimelineSnapshot } from '@/utils/lifelogTimelineSnapshot';
import { buildHabitTaskChips, isHabitTaskChip, parseHabitTaskChipId } from '@/utils/habitTaskChips';
import { getGoalIdsForTask } from '@/utils/goalTaskMembership';
import { resolveTaskTagIds } from '@/utils/taskTags';
import { useCheckinNotes } from '@/composables/useCheckinNotes';
import { getCheckinNoteEventKeys } from '@/utils/checkinNoteEvents';

interface Props {
  tasks: Task[];
  sidebarTasks?: Task[];
  sidebarCollapsed?: boolean;
  lifelogTasks?: Task[];
  taskGroups?: TaskGroup[];
  documentTitleByRootId?: Map<string, string>;
  goals?: Goal[];
  calendarViewOptions?: CalendarViewOption[];
  currentCalendarView?: CalendarViewMode;
  displayOptions?: Array<{ key: string; label: string; enabled: boolean }>;
  showFocusRecords?: boolean;
  showHabits?: boolean;
  showTaskLifelog?: boolean;
  showHabitLifelog?: boolean;
  showRecordsLifelog?: boolean;
  showLifelog?: boolean;
}

type CalendarViewMode = 'month' | 'week' | 'three-day' | 'day';
type CalendarViewOption = {
  value: CalendarViewMode;
  label: string;
  title: string;
};

interface MonthCalendarDay {
  key: string;
  dayNumber: number;
  date: Date;
  isOtherMonth: boolean;
  isToday: boolean;
}

interface ExternalTaskDropPoint {
  clientX: number;
  clientY: number;
}

interface CalendarTaskSidebarDragPayload extends ExternalTaskDropPoint {
  task: Task;
}

interface TaskManagerCalendarDragDetail extends CalendarTaskSidebarDragPayload {
  phase: 'start' | 'move' | 'end' | 'cancel';
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

type MobileTaskChipGestureMode = 'move' | 'resize-start' | 'resize-end';

interface MobileTaskChipRepeatSnapshotEntry {
  id: string;
  isVirtual: boolean;
  repeatInstanceDate?: string;
  startDate: string;
  dueDate: string;
  hasExplicitDueDate: boolean;
  startTime?: string;
  dueTime?: string;
}

interface MobileTaskChipRepeatSnapshot {
  seriesId: string;
  entries: MobileTaskChipRepeatSnapshotEntry[];
}

interface MobileTaskChipGesture {
  task: Task;
  pointerId: number;
  mode: MobileTaskChipGestureMode;
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
  hasExplicitDueDate: boolean;
  repeatSeriesSnapshot?: MobileTaskChipRepeatSnapshot | null;
}

type MobileTaskChipDropTarget = {
  day: MonthCalendarDay;
  dayKey: string;
  label: string;
};

type RectBounds = Pick<DOMRectReadOnly, 'left' | 'right' | 'top' | 'bottom'>;

type MonthDayHitZone = {
  dayKey: string;
  day: MonthCalendarDay;
  rect: RectBounds;
};

type PointerCaptureSession = {
  pointerId: number;
  captureElement: HTMLElement | null;
};

const props = defineProps<Props>();
const { t } = useI18n();
const { getMoodSvg } = useHabitEmojis();
const {
  ensureDatesLoaded: ensureCheckinNoteDatesLoaded,
  hydrateTimelineTarget: hydrateCheckinNoteTimelineTarget,
  updateNote: updateCheckinNote
} = useCheckinNotes();
const calendarViewOptions = computed(() => props.calendarViewOptions || []);
const showFocusRecords = computed(() => props.showFocusRecords !== false);
const showHabits = computed(() => props.showHabits !== false);
const showLifelog = computed(() => props.showLifelog !== false);
const showTaskLifelog = computed(() => props.showTaskLifelog ?? showLifelog.value);
const showHabitLifelog = computed(() => props.showHabitLifelog ?? showLifelog.value);
const showRecordsLifelog = computed(() => props.showRecordsLifelog ?? showLifelog.value);

const showLunarInfo = computed(() => {
  const siyuan = window.siyuan as any;
  const lang = String(
    siyuan?.config?.appearance?.lang
    || siyuan?.config?.lang
    || navigator.language
    || ''
  ).toLowerCase();
  return lang.startsWith('zh');
});

const emit = defineEmits<{
  taskDateChanged: [task: Task];
  taskColorChanged: [task: Task];
  taskDateSaveRequested: [payload: { task: Task; fields: { startDate: string; startTime: string; dueDate: string; dueTime: string }; repeatPersistenceTarget?: Task; optimisticApplied?: boolean }];
  taskClick: [task: Task];
  taskEdit: [task: Task, anchor: { x: number; y: number }];
  taskCreateRequested: [payload: { startDate: string; dueDate: string; allDay: boolean }];
  visibleRangeChange: [payload: { startDate: string; endDate: string }];
  calendarViewChange: [view: CalendarViewMode];
  calendarDisplayToggle: [key: string];
  sidebarCollapsedChange: [collapsed: boolean];
}>();

type EventListener = (...args: any[]) => void;

class EventManager {
  private listeners = new Map<string, { element: HTMLElement | Document; event: string; handler: EventListener }[]>();

  add(element: HTMLElement | Document, event: string, handler: EventListener, key?: string) {
    element.addEventListener(event, handler);
    const listenerKey = key || event;
    if (!this.listeners.has(listenerKey)) {
      this.listeners.set(listenerKey, []);
    }
    this.listeners.get(listenerKey)!.push({ element, event, handler });
  }

  remove(key: string) {
    const listeners = this.listeners.get(key);
    if (listeners) {
      listeners.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
      });
      this.listeners.delete(key);
    }
  }

  clear() {
    this.listeners.forEach((listeners) => {
      listeners.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
      });
    });
    this.listeners.clear();
  }
}

const eventManager = new EventManager();

const baseDate = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
const sidebarCollapsed = computed(() => props.sidebarCollapsed === true);
const dragOverDay = ref<string | null>(null);
const MOBILE_BREAKPOINT = 768;
const MOBILE_DRAG_LONG_PRESS_MS = 280;
const MOBILE_DRAG_MOVE_THRESHOLD_PX = 18;
const MOBILE_TASK_CHIP_OPERATION_MOVE_THRESHOLD_PX = 10;
const isCompactMobileLayout = ref(false);

let dragOverDayUpdateTimer: ReturnType<typeof setTimeout> | null = null;
let pendingDragOverDay: string | null = null;

const localTasks = ref<Task[]>([]);
const focusSessionRecords = ref<FocusSessionRecord[]>([]);
const habitRecords = ref<Habit[]>([]);
const moodRecords = ref<MoodData>({});
const manualLifelogDrafts = ref<Record<string, string>>({});
const mobilePointerTaskDrag = ref<MobilePointerTaskDragSession | null>(null);
const mobileTaskChipGesture = ref<MobileTaskChipGesture | null>(null);
const selectedMobileTaskChipId = ref<string | null>(null);
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
let contextMenuOutsidePointerBound = false;
let monthDayHitZones: MonthDayHitZone[] | null = null;
let mobileTaskPointerMoveRafId: number | null = null;
let mobileTaskChipPointerMoveRafId: number | null = null;
let unsubscribeHabitUpdates: (() => void) | null = null;
let unsubscribeMoodUpdates: (() => void) | null = null;

function syncCompactMobileLayout() {
  isCompactMobileLayout.value = window.innerWidth <= MOBILE_BREAKPOINT;
  invalidateMonthDropZoneCache();
}

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
  habitRecords.value = await upsertHabit(habit);
  eventBus.emit(Events.HABITS_UPDATED, { source: 'month-view', habits: habitRecords.value });
}

function copyRectBounds(rect: DOMRect | DOMRectReadOnly): RectBounds {
  return {
    left: rect.left,
    right: rect.right,
    top: rect.top,
    bottom: rect.bottom
  };
}

function invalidateMonthDropZoneCache(): void {
  monthDayHitZones = null;
}

function buildMonthDayHitZones(): MonthDayHitZone[] {
  const dayMap = new Map(calendarDays.value.map(day => [day.key, day]));
  return Array.from(document.querySelectorAll<HTMLElement>('.day-cell[data-day-key]'))
    .map((cell) => {
      const dayKey = cell.getAttribute('data-day-key') || '';
      const day = dayMap.get(dayKey);
      if (!day || day.isOtherMonth) {
        return null;
      }
      return {
        dayKey,
        day,
        rect: copyRectBounds(cell.getBoundingClientRect())
      };
    })
    .filter((zone): zone is MonthDayHitZone => !!zone);
}

function getMonthDayHitZones(): MonthDayHitZone[] {
  if (!monthDayHitZones) {
    monthDayHitZones = buildMonthDayHitZones();
  }
  return monthDayHitZones;
}

function findMonthDayHitZone(point: ExternalTaskDropPoint): MonthDayHitZone | null {
  for (const zone of getMonthDayHitZones()) {
    if (pointWithinRect(point, zone.rect)) {
      return zone;
    }
  }
  return null;
}

const mobileDragPreviewTitle = computed(() =>
  mobileDragPreview.value.task ? getTaskDisplayTitle(mobileDragPreview.value.task) : ''
);
const mobileDragPreviewStyle = computed(() => ({
  left: `${Math.max(12, mobileDragPreview.value.clientX + 10)}px`,
  top: `${Math.max(12, mobileDragPreview.value.clientY - 14)}px`
}));
const isMobileTaskChipInteractionEnabled = computed(() => isCompactMobileLayout.value);

const monthTaskLayout = computed(() => {
  if (isCompactMobileLayout.value) {
    return {
      slotHeight: 18,
      positionStep: 16,
      chipHeight: 12,
      topOffset: 24,
      dateNumberHeight: 24,
      moreLabelHeight: 16
    };
  }

  return {
    slotHeight: 24,
    positionStep: 24,
    chipHeight: 16,
    topOffset: 30,
    dateNumberHeight: 30,
    moreLabelHeight: 20
  };
});
const contextMenu = ref<{ show: boolean; x: number; y: number; task: Task | null }>({
  show: false,
  x: 0,
  y: 0,
  task: null
});
const contextMenuDateDraft = ref<CalendarTaskDateFields>(createCalendarTaskDateFields());
const contextMenuRepeatFrequency = ref<RepeatFrequency>('none');
const contextMenuRepeatRule = ref<RepeatRule | null>(null);

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

const pendingDeletion = ref(new Set<string>());
const lifelogDayKey = ref<string | null>(null);
const taskSyncGuard = useTaskSyncGuard(localTasks);
const {
  upsertTask: upsertLocalTask,
  patchTask: patchLocalTask,
  patchTasksBatch: patchLocalTasksBatch
} = useTaskLocalMutations(localTasks);
const CREATE_SELECTION_THRESHOLD_PX = 8;
const createSelection = ref<{
  active: boolean;
  startDay: string;
  endDay: string;
  startX: number;
  startY: number;
  passedThreshold: boolean;
} | null>(null);

function emitTaskDateChanged(task: Task): void {
  taskSyncGuard.emitTaskDateChanged(task, (nextTask) => {
    emit('taskDateChanged', nextTask);
  });
}

function emitTaskColorChanged(task: Task): void {
  taskSyncGuard.emitTaskDateChanged(task, (nextTask) => {
    emit('taskColorChanged', nextTask);
  });
}

const selectedCalendarTaskId = ref<string | null>(null);

function handleTaskMouseDownWithSelection(event: MouseEvent, task: Task): void {
  selectedCalendarTaskId.value = task.id;
  handleTaskMouseDown(event, task);
}

function handleCalendarTaskDateClearKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Delete' && event.key !== 'Backspace') return;
  const target = event.target as HTMLElement | null;
  if (target?.closest('input, textarea, select, [contenteditable="true"], .context-menu, .task-modal, .task-editor-protyle-body.is-sidebar .protyle')) return;
  const taskId = selectedCalendarTaskId.value;
  if (!taskId) return;
  const task = localTasks.value.find(item => item.id === taskId);
  if (!task) {
    selectedCalendarTaskId.value = null;
    return;
  }
  event.preventDefault();
  selectedCalendarTaskId.value = null;
  void clearTaskDates(task);
}

function handleCalendarTaskSelectionOutsidePointerDown(event: PointerEvent): void {
  const target = event.target instanceof Element ? event.target : null;
  if (!target?.closest('.task-chip, .habit-task-chip')) {
    selectedCalendarTaskId.value = null;
  }
}

let monthTaskDragGhostElement: HTMLElement | null = null;
function setMonthTaskDragGhostElement(element: Element | null): void {
  monthTaskDragGhostElement = element instanceof HTMLElement ? element : null;
}
function moveMonthTaskDragGhost(position: { left: number; top: number }): void {
  monthTaskDragGhostElement?.style.setProperty('transform', `translate3d(${position.left}px, ${position.top}px, 0)`);
}

const {
  draggingHandle,
  draggingTask,
  allDayTaskDragPreview,
  isDragging,
  handleHandleMouseDown,
  handleTaskMouseDown,
  removeEventListeners
} = useTaskDrag(localTasks, (task) => {
  if (pendingDeletion.value.has(task.id)) {
    pendingDeletion.value.delete(task.id);
  }
  emitTaskDateChanged(task);
}, { onAllDayTaskDragGhostMove: moveMonthTaskDragGhost });

interface LunarInfo {
  dayCn: string;
  monthCn: string;
  lunarFestival: string;
  festival: string;
  isFestival: boolean;
  isTerm: boolean;
  term: string;
}

const lunarCache = new Map<string, LunarInfo>();

function getLunarDate(year: number, month: number, day: number): LunarInfo | null {
  const key = `${year}-${month}-${day}`;
  
  if (lunarCache.has(key)) {
    return lunarCache.get(key)!;
  }
  
  const lunarData = solarLunar.solar2lunar(year, month, day);
  
  if (lunarData === -1) {
    return null;
  }
  
  const result: LunarInfo = {
    dayCn: lunarData.dayCn,
    monthCn: lunarData.monthCn,
    lunarFestival: lunarData.lunarFestival,
    festival: lunarData.festival,
    isFestival: !!(lunarData.lunarFestival || lunarData.festival),
    isTerm: lunarData.isTerm,
    term: lunarData.term
  };
  
  lunarCache.set(key, result);
  
  if (lunarCache.size > 500) {
    const keys = Array.from(lunarCache.keys()).slice(0, 100);
    keys.forEach(k => lunarCache.delete(k));
  }
  
  return result;
}

const backgroundColors = TASK_BACKGROUND_COLOR_OPTIONS;
const monthDropColorValues = TASK_BACKGROUND_COLOR_VALUES;

const focusLifelogEvents = computed(() =>
  focusRecordsToLifelogEvents(focusSessionRecords.value, t('focusTimer.title'))
);
const focusSummariesByDay = computed(() => summarizeFocusLifelogEventsByDay(focusLifelogEvents.value));
const habitCheckinLifelogEvents = computed(() => habitsToLifelogEvents(habitRecords.value));
const habitCheckinSummariesByDay = computed(() =>
  summarizeHabitCheckinLifelogEventsByDay(habitCheckinLifelogEvents.value)
);
const taskCompletedLifelogSourceTasks = computed(() => {
  const tasksById = new Map<string, Task>();
  for (const task of props.lifelogTasks || []) {
    tasksById.set(task.id, task);
  }
  for (const task of localTasks.value) {
    tasksById.set(task.id, task);
  }
  return Array.from(tasksById.values());
});
watch(
  taskCompletedLifelogSourceTasks,
  (tasks) => publishLifelogTaskSnapshot(tasks),
  { deep: true, immediate: true }
);
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
const taskGroupById = computed(() =>
  new Map((props.taskGroups || []).map(group => [group.id, group]))
);
const goalById = computed(() =>
  new Map((props.goals || []).map(goal => [goal.id, goal]))
);
const taskCompletedLifelogEvents = computed(() =>
  tasksToCompletedLifelogEvents(taskCompletedLifelogSourceTasks.value)
);
const taskCompletedSummariesByDay = computed(() =>
  summarizeTaskCompletedLifelogEventsByDay(taskCompletedLifelogEvents.value)
);
const moodLifelogEvents = computed(() => moodDataToLifelogEvents(moodRecords.value));
const moodSummariesByDay = computed(() => summarizeMoodLifelogEventsByDay(moodLifelogEvents.value));
const manualNoteLifelogEvents = computed(() => moodManualEntriesToLifelogEvents(moodRecords.value));
const manualNoteSummariesByDay = computed(() =>
  summarizeManualNoteLifelogEventsByDay(manualNoteLifelogEvents.value)
);

async function refreshFocusSessions(): Promise<void> {
  try {
    const data = await getFocusTimerData();
    focusSessionRecords.value = data.sessionRecords;
  } catch (error) {
    console.error('[MonthView] Failed to load focus sessions', error);
  }
}

async function refreshHabitCheckins(): Promise<void> {
  try {
    habitRecords.value = await getHabits();
  } catch (error) {
    console.error('[MonthView] Failed to load habit checkins', error);
  }
}

async function refreshMoodRecords(): Promise<void> {
  try {
    moodRecords.value = await getMoodData();
  } catch (error) {
    console.error('[MonthView] Failed to load mood records', error);
  }
}

function handleFocusSessionUpdate(): void {
  void refreshFocusSessions();
}

function handleHabitsUpdated(payload?: { source?: string; habits?: Habit[] }): void {
  if (payload?.source === 'month-view') {
    return;
  }
  if (Array.isArray(payload?.habits)) {
    habitRecords.value = [...payload.habits];
    return;
  }
  void refreshHabitCheckins();
}

function handleMoodUpdated(payload?: { moodData?: MoodData }): void {
  if (payload?.moodData && typeof payload.moodData === 'object') {
    moodRecords.value = { ...payload.moodData };
    return;
  }
  void refreshMoodRecords();
}

function getFocusDaySummary(dayKey: string) {
  return focusSummariesByDay.value.get(dayKey) || null;
}

function getHabitCheckinDaySummary(dayKey: string) {
  return habitCheckinSummariesByDay.value.get(dayKey) || null;
}

function getTaskCompletedDaySummary(dayKey: string) {
  return taskCompletedSummariesByDay.value.get(dayKey) || null;
}

function getMoodDaySummary(dayKey: string) {
  return moodSummariesByDay.value.get(dayKey) || null;
}

function getManualNoteDaySummary(dayKey: string) {
  return manualNoteSummariesByDay.value.get(dayKey) || null;
}

function formatFocusDaySummary(dayKey: string): string {
  const summary = getFocusDaySummary(dayKey);
  if (!summary) {
    return '';
  }
  return `${summary.minutes}m`;
}

function getFocusDaySummaryTitle(dayKey: string): string {
  const summary = getFocusDaySummary(dayKey);
  if (!summary) {
    return '';
  }
  return `${t('focusTimer.title')} · ${summary.sessions} · ${formatLifelogMinutes(summary.minutes)}`;
}

function formatHabitCheckinDaySummary(dayKey: string): string {
  const summary = getHabitCheckinDaySummary(dayKey);
  if (!summary) {
    return '';
  }
  return `${summary.completed}`;
}

function getHabitCheckinDaySummaryTitle(dayKey: string): string {
  const summary = getHabitCheckinDaySummary(dayKey);
  if (!summary) {
    return '';
  }
  return `${t('habitCheckinLog.habitLabel')} · ${summary.completed}/${summary.habits} · ${summary.checkins}${t('habitTracker.timesSuffix')}`;
}

function formatTaskCompletedDaySummary(dayKey: string): string {
  const summary = getTaskCompletedDaySummary(dayKey);
  if (!summary) {
    return '';
  }
  return `${summary.tasks}`;
}

function getTaskCompletedDaySummaryTitle(dayKey: string): string {
  const summary = getTaskCompletedDaySummary(dayKey);
  if (!summary) {
    return '';
  }
  return `${t('focusTimer.task')} · ${t('taskManager.statusCompleted')} · ${summary.tasks}`;
}

function formatMoodDaySummary(dayKey: string): string {
  const summary = getMoodDaySummary(dayKey);
  if (!summary) {
    return '';
  }
  return summary.emoji;
}

function getMoodDaySummarySvg(dayKey: string): string {
  const summary = getMoodDaySummary(dayKey);
  if (!summary) {
    return '';
  }
  return getMoodSvg(summary.emoji, 'large');
}

function formatManualNoteDaySummary(dayKey: string): string {
  const summary = getManualNoteDaySummary(dayKey);
  if (!summary) {
    return '';
  }
  return `${summary.notes}`;
}

function getManualNoteDaySummaryTitle(dayKey: string): string {
  const summary = getManualNoteDaySummary(dayKey);
  if (!summary) {
    return '';
  }
  return `${t('monthView.lifelogManualNote')} ${summary.notes}`;
}

function getCompactLifelogSummaryTitle(dayKey: string): string {
  const timelineTitle = getLifelogTimelineItemsForDay(dayKey)
    .map(formatCompactLifelogSummaryTitleLine)
    .filter(Boolean)
    .join('<br>');

  if (timelineTitle) {
    return timelineTitle;
  }

  return [
    showFocusRecords.value && getFocusDaySummary(dayKey) ? getFocusDaySummaryTitle(dayKey) : '',
    showRecordsLifelog.value && getManualNoteDaySummary(dayKey) ? getManualNoteDaySummaryTitle(dayKey) : '',
    showHabitLifelog.value && getHabitCheckinDaySummary(dayKey) ? getHabitCheckinDaySummaryTitle(dayKey) : '',
    showTaskLifelog.value && getTaskCompletedDaySummary(dayKey) ? getTaskCompletedDaySummaryTitle(dayKey) : ''
  ].filter(Boolean).join(' · ');
}

function pickRandomTaskBackgroundColor(): string {
  if (monthDropColorValues.length === 0) {
    return 'pinch-background6';
  }
  const index = Math.floor(Math.random() * monthDropColorValues.length);
  return monthDropColorValues[index];
}

function getTasksHash(tasks: Task[]): string {
  return tasks.map(t => 
    `${t.id}:${t.status}:${t.priority}:${t.startDate}:${t.dueDate}:${t.startTime || ''}:${t.dueTime || ''}:${t.repeatSeriesId || ''}:${t.repeatFrequency || ''}:${t.repeatInstanceDate || ''}:${t.isVirtual === true ? '1' : '0'}:${t.isRepeatWindow === true ? '1' : '0'}:${t.title}:${t.backgroundColor || ''}:${t.groupId || ''}`
  ).join('|');
}

watch(() => props.tasks, (newTasks) => {
  taskSyncGuard.syncTasks(newTasks, isDragging.value, getTasksHash);
}, { deep: true });

function getTaskDateRangeForRender(task: Task): { taskStart: Date; taskEnd: Date } | null {
  const startValue = task.startDate || task.dueDate;
  if (!startValue) return null;

  const taskStart = new Date(startValue);
  taskStart.setHours(0, 0, 0, 0);

  // Both ordinary and virtual tasks may span multiple days.  Ignoring the
  // due date for ordinary tasks made a resized task render as a one-day chip.
  const endValue = task.dueDate || startValue;
  const taskEnd = new Date(endValue);
  taskEnd.setHours(23, 59, 59, 999);

  return { taskStart, taskEnd };
}

function getTaskRepeatSeriesId(task: Task): string {
  return typeof task.repeatSeriesId === 'string' ? task.repeatSeriesId.trim() : '';
}

type TaskRenderRange = {
  task: Task;
  taskStart: Date;
  taskEnd: Date;
  displayStart: Date;
  displayEnd: Date;
  startMs: number;
  endMs: number;
  displayEndMs: number;
};

watch(isMobileTaskChipInteractionEnabled, (enabled) => {
  if (!enabled) {
    clearMobileTaskChipGesture({ restorePreview: true });
    selectMobileTaskChip(null);
  }
});

watch(() => localTasks.value.map(task => task.id).join('|'), () => {
  const selectedTaskId = selectedMobileTaskChipId.value;
  if (!selectedTaskId) {
    return;
  }
  if (!localTasks.value.some(task => task.id === selectedTaskId)) {
    selectedMobileTaskChipId.value = null;
  }
});

const visibleCalendarRange = computed(() => {
  const start = new Date(baseDate.value);
  start.setHours(0, 0, 0, 0);
  const dayOfWeek = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - dayOfWeek);

  const end = new Date(start);
  end.setDate(start.getDate() + 41);
  end.setHours(23, 59, 59, 999);

  return { start, end };
});

function emitVisibleCalendarRange(): void {
  const { start, end } = visibleCalendarRange.value;
  emit('visibleRangeChange', {
    startDate: formatDate(start),
    endDate: formatDate(end)
  });
}

watch(
  visibleCalendarRange,
  () => {
    emitVisibleCalendarRange();
  }
);

const normalizedTaskRanges = computed<TaskRenderRange[]>(() => {
  const { start: visibleStart, end: visibleEnd } = visibleCalendarRange.value;
  const ranges: TaskRenderRange[] = [];

  for (const task of localTasks.value) {
    const range = getTaskDateRangeForRender(task);
    if (!range) continue;

    if (range.taskEnd < visibleStart || range.taskStart > visibleEnd) {
      continue;
    }

    const displayStart = range.taskStart < visibleStart ? visibleStart : range.taskStart;
    const displayEnd = range.taskEnd > visibleEnd ? visibleEnd : range.taskEnd;

    ranges.push({
      task,
      taskStart: range.taskStart,
      taskEnd: range.taskEnd,
      displayStart: new Date(displayStart),
      displayEnd: new Date(displayEnd),
      startMs: range.taskStart.getTime(),
      endMs: range.taskEnd.getTime(),
      displayEndMs: displayEnd.getTime()
    });
  }

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

const habitTaskChipDates = computed(() =>
  Array.from({ length: 42 }, (_, index) => {
    const date = new Date(visibleCalendarRange.value.start);
    date.setDate(date.getDate() + index);
    return {
      key: formatDate(date),
      date
    };
  })
);

const habitTaskChips = computed(() =>
  showHabits.value ? buildHabitTaskChips(habitRecords.value, habitTaskChipDates.value) : []
);

function buildHabitTaskChipRanges(): TaskRenderRange[] {
  return habitTaskChips.value
    .map((task) => {
      const range = getTaskDateRangeForRender(task);
      if (!range) {
        return null;
      }

      return {
        task,
        taskStart: range.taskStart,
        taskEnd: range.taskEnd,
        displayStart: new Date(range.taskStart),
        displayEnd: new Date(range.taskEnd),
        startMs: range.taskStart.getTime(),
        endMs: range.taskEnd.getTime(),
        displayEndMs: range.taskEnd.getTime()
      };
    })
    .filter((range): range is TaskRenderRange =>
      !!range && Number.isFinite(range.startMs) && Number.isFinite(range.endMs)
    );
}

const taskPositionsMap = computed(() => {
  const positionMap = new Map<string, number>();
  const dailyPositionSlots = new Map<string, number[]>();
  
  const sortedRanges = [
    ...normalizedTaskRanges.value,
    ...buildHabitTaskChipRanges()
  ]
    .sort((a, b) => {
      const aStart = a.startMs;
      const bStart = b.startMs;
      if (aStart !== bStart) return aStart - bStart;

      const aEnd = a.endMs;
      const bEnd = b.endMs;
      return (bEnd - bStart) - (aEnd - aStart);
    });
  
  for (const range of sortedRanges) {
    const taskDays: string[] = [];
    const currentDay = new Date(range.displayStart);
    while (currentDay <= range.displayEnd) {
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
          daySlots[pos] = range.displayEndMs;
        }
        
        break;
      }
    }
    
    positionMap.set(range.task.id, assignedPosition);
  }
  
  return positionMap;
});

const weekdays = computed(() => [
  t('date.weekdayMonShort'),
  t('date.weekdayTueShort'),
  t('date.weekdayWedShort'),
  t('date.weekdayThuShort'),
  t('date.weekdayFriShort'),
  t('date.weekdaySatShort'),
  t('date.weekdaySunShort')
]);

const monthTitle = computed(() => {
  return `${baseDate.value.getFullYear()} ${baseDate.value.getMonth() + 1}${t('date.monthSuffix')}`;
});

const calendarDays = computed(() => {
  const days = [];
  
  const startDate = new Date(baseDate.value);
  startDate.setHours(0, 0, 0, 0);
  const dayOfWeek = (startDate.getDay() + 6) % 7;
  startDate.setDate(startDate.getDate() - dayOfWeek);
  
  const today = new Date();
  
  const monthCount = new Map<string, number>();
  const monthDays = new Map<string, number[]>();
  
  for (let i = 0; i < 42; i++) {
    const dayDate = new Date(startDate);
    dayDate.setDate(startDate.getDate() + i);
    
    const year = dayDate.getFullYear();
    const month = dayDate.getMonth();
    const key = `${year}-${month}`;
    
    monthCount.set(key, (monthCount.get(key) || 0) + 1);
    if (!monthDays.has(key)) {
      monthDays.set(key, []);
    }
    monthDays.get(key)!.push(i);
  }
  
  let maxCount = 0;
  let bestMonthKey = '';
  for (const [key, count] of monthCount) {
    if (count > maxCount || (count === maxCount && key > bestMonthKey)) {
      maxCount = count;
      bestMonthKey = key;
    }
  }
  
  const [highlightYearStr, highlightMonthStr] = bestMonthKey.split('-');
  const highlightYear = parseInt(highlightYearStr);
  const highlightMonth = parseInt(highlightMonthStr);
  
  for (let i = 0; i < 42; i++) {
    const dayDate = new Date(startDate);
    dayDate.setDate(startDate.getDate() + i);
    
    const year = dayDate.getFullYear();
    const month = dayDate.getMonth();
    const day = dayDate.getDate();
    const monthKey = String(month + 1).padStart(2, '0');
    const dayKey = String(day).padStart(2, '0');
    
    const isToday = (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
    
    const isOtherMonth = year !== highlightYear || month !== highlightMonth;
    
    const lunarInfo = getLunarDate(year, month + 1, day);
    
    days.push({
      key: `${year}-${monthKey}-${dayKey}`,
      dayNumber: day,
      date: dayDate,
      isOtherMonth,
      isToday,
      lunarInfo
    });
  }
  
  return days;
});

const calendarWeeks = computed(() => {
  const weeks = [];
  const days = calendarDays.value;
  
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  
  return weeks;
});

watch(
  () => calendarDays.value.map(day => day.key).join('|'),
  () => {
    invalidateMonthDropZoneCache();
  }
);

type WeekTask = Task & {
  startDayOfWeek: number;
  endDayOfWeek: number;
  spanDays: number;
  position: number;
};

const weeklyTasks = computed(() => {
  const result = new Map<string, WeekTask[]>();
  
  for (const week of calendarWeeks.value) {
    const weekKey = week.map(d => d.key).join('-');
    const tasksForWeek: WeekTask[] = [];
    const weekStart = new Date(week[0].date);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(week[6].date);
    weekEnd.setHours(23, 59, 59, 999);
    const weekStartMs = weekStart.getTime();
    const weekEndMs = weekEnd.getTime();
    
    const taskRanges = [
      ...normalizedTaskRanges.value,
      ...habitTaskChips.value.map(task => {
        const taskStart = new Date(task.startDate || task.dueDate || '');
        taskStart.setHours(0, 0, 0, 0);
        const taskEnd = new Date(task.dueDate || task.startDate || '');
        taskEnd.setHours(23, 59, 59, 999);
        return {
          task,
          taskStart,
          taskEnd,
          startMs: taskStart.getTime(),
          endMs: taskEnd.getTime()
        };
      }).filter(range => Number.isFinite(range.startMs) && Number.isFinite(range.endMs))
    ];

    for (const range of taskRanges) {
      if (range.taskEnd < weekStart || range.taskStart > weekEnd) continue;

      const effectiveStart = range.startMs < weekStartMs ? weekStart : range.taskStart;
      const effectiveEnd = range.endMs > weekEndMs ? weekEnd : range.taskEnd;
      
      const startDayOfWeek = Math.floor((effectiveStart.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
      const endDayOfWeek = Math.floor((effectiveEnd.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
      
      const position = taskPositionsMap.value.get(range.task.id) ?? 0;
      
      tasksForWeek.push({
        ...range.task,
        startDayOfWeek,
        endDayOfWeek,
        spanDays: endDayOfWeek - startDayOfWeek + 1,
        position
      });
    }
    
    result.set(weekKey, tasksForWeek);
  }
  
  return result;
});

function getWeekKey(week: any[]): string {
  return week.map((d: any) => d.key).join('-');
}

function getTasksForWeek(week: any[]): WeekTask[] {
  const weekKey = getWeekKey(week);
  return weeklyTasks.value.get(weekKey) || [];
}

function getWeekRowStyle(week: any[]): Record<string, string> {
  const {
    topOffset: TOP_OFFSET,
    positionStep: POSITION_STEP,
    chipHeight: CHIP_HEIGHT
  } = monthTaskLayout.value;
  const tasks = getTasksForWeek(week);
  const highestPosition = tasks.reduce((highest, task) => Math.max(highest, task.position ?? 0), -1);
  const bottomPadding = isCompactMobileLayout.value ? 6 : 10;
  const requiredHeight = highestPosition < 0
    ? TOP_OFFSET + CHIP_HEIGHT + bottomPadding
    : TOP_OFFSET + highestPosition * POSITION_STEP + CHIP_HEIGHT + bottomPadding;

  return {
    minHeight: `${requiredHeight}px`
  };
}

function getPriorityTitle(priority: string | undefined): string {
  return getTaskPriorityLabel(priority, t);
}

function openLifelogDay(dayKey: string): void {
  if (!dayKey) return;
  lifelogDayKey.value = dayKey;
}

function closeLifelogDay(): void {
  lifelogDayKey.value = null;
}

const lifelogTimelinePanelOpen = computed(() => Boolean(lifelogDayKey.value));

function formatLifelogDayTitle(dayKey: string): string {
  const date = new Date(dayKey);
  if (Number.isNaN(date.getTime())) {
    return dayKey;
  }
  return formatTemplate('weekView.fullDateTemplate', {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate()
  });
}

const lifelogTimelineDayTitle = computed(() => (
  lifelogDayKey.value ? formatLifelogDayTitle(lifelogDayKey.value) : ''
));

const lifelogTimelineSubtitle = computed(() => formatTemplate('weekView.lifelogTimelineCountTemplate', {
  count: lifelogTimelineItems.value.length
}));

const lifelogTimelineDateStripDays = computed<LifelogTimelineDateStripDay[]>(() => (
  calendarDays.value.map(day => {
    const weekdayIndex = (day.date.getDay() + 6) % 7;
    const weekdayLabel = weekdays.value[weekdayIndex] || '';
    const hasRecord = Boolean(
      getFocusDaySummary(day.key)
      || getMoodDaySummary(day.key)
      || getManualNoteDaySummary(day.key)
      || getHabitCheckinDaySummary(day.key)
      || getTaskCompletedDaySummary(day.key)
    );

    return {
      date: day.key,
      weekdayLabel,
      dayNumber: day.dayNumber,
      ariaLabel: `${weekdayLabel} ${day.key}`,
      selected: day.key === lifelogDayKey.value,
      today: day.isToday,
      hasRecord,
      moodSvg: getMoodDaySummarySvg(day.key) || undefined
    };
  })
));

function getFocusEventsForDay(dayKey: string): FocusLifelogEvent[] {
  return focusLifelogEvents.value
    .filter(event => event.date === dayKey)
    .sort((left, right) => {
      if (left.startTime !== right.startTime) return left.startTime.localeCompare(right.startTime);
      return left.title.localeCompare(right.title);
    });
}

function getHabitEventsForDay(dayKey: string): HabitCheckinLifelogEvent[] {
  return habitCheckinLifelogEvents.value
    .filter(event => event.date === dayKey)
    .sort((left, right) => {
      const leftTimestamp = Number(left.checkinTimestamp || left.metadata?.timestamp || 0);
      const rightTimestamp = Number(right.checkinTimestamp || right.metadata?.timestamp || 0);
      if (Number.isFinite(leftTimestamp) && Number.isFinite(rightTimestamp) && leftTimestamp !== rightTimestamp) {
        return leftTimestamp - rightTimestamp;
      }
      return left.title.localeCompare(right.title);
    });
}

function getTaskEventsForDay(dayKey: string): TaskCompletedLifelogEvent[] {
  return taskCompletedLifelogEvents.value
    .filter(event => event.date === dayKey)
    .sort((left, right) => {
      const leftTime = Date.parse(left.completedAt);
      const rightTime = Date.parse(right.completedAt);
      if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
        return leftTime - rightTime;
      }
      return left.title.localeCompare(right.title);
    });
}

function getManualNoteEventsForDay(dayKey: string): ManualNoteLifelogEvent[] {
  return manualNoteLifelogEvents.value
    .filter(event => event.date === dayKey)
    .sort((left, right) => {
      const leftTime = Date.parse(left.createdAt);
      const rightTime = Date.parse(right.createdAt);
      if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
        return leftTime - rightTime;
      }
      return left.id.localeCompare(right.id);
    });
}

function timeToSortMinutes(value: string | undefined, fallbackMinutes: number): number {
  if (!value) {
    return fallbackMinutes;
  }
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    return Number(match[1]) * 60 + Number(match[2]);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallbackMinutes;
  }
  return date.getHours() * 60 + date.getMinutes();
}

function timestampToSortMinutes(value: unknown, fallbackMinutes: number): number {
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

function formatSortMinutes(minutes: number): string {
  const normalized = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)));
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function getLifelogTimelineIcon(type: LifelogEventType): string {
  if (type === 'focus') return 'timer';
  if (type === 'habit-checkin') return 'squareCheck';
  if (type === 'task-completed') return 'taskCheckboxChecked';
  if (type === 'mood') return 'smile';
  return 'descriptionBubble';
}

function focusEventToTimelineItem(event: FocusLifelogEvent): LifelogTimelinePanelItem {
  const sortMinutes = timeToSortMinutes(event.startTime, 8 * 60);
  return hydrateCheckinNoteTimelineTarget({
    id: `focus-${event.id}`,
    sourceId: event.id,
    type: event.type,
    timeLabel: `${event.startTime} - ${event.endTime}`,
    sortMinutes,
    title: event.title,
    meta: `${t('focusTimer.title')} · ${formatFocusLifelogDuration(event)} · ${formatFocusLifelogTarget(event)}`,
    note: event.note || '',
    icon: getLifelogTimelineIcon(event.type),
    deletable: true
  }, event.date, getCheckinNoteEventKeys(event));
}

function habitEventToTimelineItem(event: HabitCheckinLifelogEvent): LifelogTimelinePanelItem {
  const sortMinutes = timestampToSortMinutes(event.checkinTimestamp || event.metadata?.timestamp, 7 * 60);
  const statusText = event.completed ? t('habitTracker.checkedIn') : t('habitTracker.scheduledCheckin');
  return hydrateCheckinNoteTimelineTarget({
    id: `habit-${event.id}`,
    sourceId: event.id,
    type: event.type,
    timeLabel: formatSortMinutes(sortMinutes),
    sortMinutes,
    title: event.title,
    note: event.note || '',
    meta: `${statusText} · ${formatHabitLifelogProgress(event)}`,
    icon: event.completed ? getLifelogTimelineIcon(event.type) : 'square'
  }, event.date, getCheckinNoteEventKeys(event));
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

function getTaskCompletedTagBadges(event: TaskCompletedLifelogEvent): LifelogTimelinePanelBadge[] {
  const sourceTask = getTaskCompletedSourceTask(event);
  return resolveTaskTagIds(
    sourceTask ? sourceTask.tags : event.tags,
    sourceTask?.groupId || getTaskCompletedEventGroupId(event)
  )
    .map(tagId => taskGroupById.value.get(tagId))
    .filter((group): group is TaskGroup => Boolean(group))
    .map(group => ({
      type: 'tag',
      label: group.name,
      style: group.color ? {
        background: resolveGroupColorCss(group.color),
        borderColor: resolveGroupColorLayerCss(group.color),
        color: resolveGroupTextColor(group.color)
      } : {}
    }));
}

function getTaskCompletedGoalBadges(event: TaskCompletedLifelogEvent): LifelogTimelinePanelBadge[] {
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
    .map(goal => ({
      type: 'goal',
      label: typeof goal.name === 'string' && goal.name.trim()
        ? goal.name.trim()
        : t('taskManager.untitledGoal'),
      emoji: typeof goal.emoji === 'string' ? goal.emoji.trim() : ''
    }));
}

function taskEventToTimelineItem(event: TaskCompletedLifelogEvent): LifelogTimelinePanelItem {
  const sortMinutes = timeToSortMinutes(event.completedAt, 20 * 60);
  return hydrateCheckinNoteTimelineTarget({
    id: `task-${event.id}`,
    sourceId: event.taskId,
    type: event.type,
    timeLabel: formatTaskCompletedTime(event),
    sortMinutes,
    title: event.title,
    isTaskTitle: true,
    meta: t('taskManager.statusCompleted'),
    note: event.note || '',
    icon: getLifelogTimelineIcon(event.type),
    badges: [
      ...getTaskCompletedTagBadges(event),
      ...getTaskCompletedGoalBadges(event)
    ]
  }, event.date, getCheckinNoteEventKeys(event));
}

function manualNoteEventToTimelineItem(event: ManualNoteLifelogEvent): LifelogTimelinePanelItem {
  const sortMinutes = timeToSortMinutes(event.createdAt || event.updatedAt, 21 * 60);
  return {
    id: `manual-${event.id}`,
    sourceId: event.id,
    type: event.type,
    timeLabel: formatManualNoteTimestamp(event),
    sortMinutes,
    title: t('monthView.lifelogManualNote'),
    meta: t('monthView.lifelogManualNote'),
    note: event.text,
    icon: getLifelogTimelineIcon(event.type),
    emoji: event.emoji,
    moodSvg: event.emoji ? getMoodSvg(event.emoji, 'large') : undefined,
    deletable: true,
    editable: true
  };
}

function moodEventToTimelineItem(event: MoodLifelogEvent): LifelogTimelinePanelItem {
  const sortMinutes = timestampToSortMinutes(event.moodTimestamp, 9 * 60);
  return {
    id: `mood-${event.id}`,
    sourceId: event.sourceId,
    type: event.type,
    timeLabel: formatMoodTimestamp(event),
    sortMinutes,
    title: event.emoji,
    meta: `${t('moodTracker.todayMood')} ﾂｷ ${event.emoji}`,
    note: event.note || '',
    icon: getLifelogTimelineIcon(event.type),
    emoji: event.emoji,
    moodSvg: event.emoji ? getMoodSvg(event.emoji, 'large') : undefined
  };
}

function sortLifelogTimelineItems(items: LifelogTimelinePanelItem[]): LifelogTimelinePanelItem[] {
  return items.sort((left, right) => {
    if (left.sortMinutes !== right.sortMinutes) {
      return left.sortMinutes - right.sortMinutes;
    }
    return left.title.localeCompare(right.title, 'zh-Hans-CN');
  });
}

function getLifelogTimelineItemsForDay(
  dayKey: string,
  options: { includeMood?: boolean; respectDisplaySettings?: boolean } = {}
): LifelogTimelinePanelItem[] {
  if (!dayKey) {
    return [];
  }

  const respectDisplaySettings = options.respectDisplaySettings !== false;
  const includeFocus = !respectDisplaySettings || showFocusRecords.value;
  const includeRecords = !respectDisplaySettings || showRecordsLifelog.value;
  const includeHabits = !respectDisplaySettings || showHabitLifelog.value;
  const includeTasks = !respectDisplaySettings || showTaskLifelog.value;

  return sortLifelogTimelineItems([
    ...(includeFocus ? getFocusEventsForDay(dayKey).map(focusEventToTimelineItem) : []),
    ...(includeRecords && options.includeMood ? moodLifelogEvents.value.filter(event => event.date === dayKey).map(moodEventToTimelineItem) : []),
    ...(includeHabits ? getHabitEventsForDay(dayKey).map(habitEventToTimelineItem) : []),
    ...(includeTasks ? getTaskEventsForDay(dayKey).map(taskEventToTimelineItem) : []),
    ...(includeRecords ? getManualNoteEventsForDay(dayKey).map(manualNoteEventToTimelineItem) : [])
  ]);
}

function escapeCompactLifelogSummaryHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCompactLifelogSummaryTitleLine(item: LifelogTimelinePanelItem): string {
  const time = escapeCompactLifelogSummaryHtml(item.timeLabel);
  const content = escapeCompactLifelogSummaryHtml(
    item.type === 'manual-note'
      ? item.note
      : (item.type === 'task-completed' ? `${t('taskManager.statusCompleted')} · ${item.title}` : item.meta)
  );
  if (!time && !content) {
    return '';
  }
  return `<small class='ft__on-surface'>${time}</small>${content}`;
}

const lifelogTimelineItems = computed<LifelogTimelinePanelItem[]>(() => {
  const dayKey = lifelogDayKey.value;
  if (!dayKey) {
    return [];
  }

  return getLifelogTimelineItemsForDay(dayKey, {
    includeMood: true,
    respectDisplaySettings: false
  });
});
watch(lifelogDayKey, (dayKey) => {
  if (dayKey) {
    void ensureCheckinNoteDatesLoaded([dayKey]);
  }
}, { immediate: true });
watch(
  [lifelogDayKey, lifelogTimelineItems],
  ([dayKey, items]) => {
    if (dayKey) {
      publishLifelogTimelineSnapshot(dayKey, items);
    }
  },
  { deep: true }
);

const lifelogTimelineDraft = computed(() => (
  lifelogDayKey.value ? getManualLifelogDraft(lifelogDayKey.value) : ''
));

function updateLifelogTimelineDraft(value: string): void {
  if (!lifelogDayKey.value) {
    return;
  }
  manualLifelogDrafts.value = {
    ...manualLifelogDrafts.value,
    [lifelogDayKey.value]: value
  };
}

function saveLifelogTimelineDraft(): void {
  if (lifelogDayKey.value) {
    void saveManualLifelogDraft(lifelogDayKey.value);
  }
}

function clearLifelogTimelineDraft(): void {
  if (lifelogDayKey.value) {
    clearManualLifelogDraft(lifelogDayKey.value);
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
    console.error('[MonthView] Failed to delete focus session', error);
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

async function updateLifelogTimelineItem(item: LifelogTimelinePanelItem, text: string): Promise<void> {
  if (item.type !== 'manual-note' || !item.sourceId) {
    return;
  }
  const now = new Date().toISOString();
  let changed = false;
  const nextMoodData: MoodData = {};
  for (const [date, entry] of Object.entries(moodRecords.value)) {
    const entries = Array.isArray(entry.entries)
      ? entry.entries.map(entryItem => {
        if (entryItem.id !== item.sourceId) return entryItem;
        changed = true;
        return { ...entryItem, text, updatedAt: now };
      })
      : [];
    nextMoodData[date] = { ...entry, ...(entries.length > 0 ? { entries } : { entries: undefined }) };
  }
  if (!changed) return;
  try {
    await persistMoodRecords(nextMoodData);
  } catch (error) {
    console.error('[MonthView] Failed to update manual lifelog entry', error);
  }
}

function formatLifelogMinutes(minutes: number): string {
  const roundedMinutes = Math.max(0, Math.round(Number(minutes) || 0));
  if (roundedMinutes < 60) {
    return t('habitCheckinLog.minutesTemplate').replace('{minutes}', String(roundedMinutes));
  }

  const hours = Math.floor(roundedMinutes / 60);
  const restMinutes = roundedMinutes % 60;
  if (restMinutes > 0) {
    return t('habitCheckinLog.hoursMinutesTemplate')
      .replace('{hours}', String(hours))
      .replace('{minutes}', String(restMinutes));
  }
  return t('habitCheckinLog.hoursTemplate').replace('{hours}', String(hours));
}

function formatFocusLifelogDuration(event: FocusLifelogEvent): string {
  return formatLifelogMinutes(event.minutes);
}

function formatFocusLifelogTarget(event: FocusLifelogEvent): string {
  if (event.targetType === 'habit') {
    return t('focusTimer.habit');
  }
  if (event.targetType === 'task') {
    return t('focusTimer.task');
  }
  return t('focusTimer.title');
}

function formatHabitLifelogProgress(event: HabitCheckinLifelogEvent): string {
  const checkinCount = event.checkinIndex || event.completedCount;
  const progress = event.targetCount > 1 ? `${checkinCount}/${event.targetCount}` : (event.completed ? '1/1' : '0/1');
  return `${progress}${t('habitTracker.timesSuffix')}`;
}

function formatTaskCompletedTime(event: TaskCompletedLifelogEvent): string {
  const completedAt = new Date(event.completedAt);
  if (Number.isNaN(completedAt.getTime())) {
    return event.date;
  }
  return `${String(completedAt.getHours()).padStart(2, '0')}:${String(completedAt.getMinutes()).padStart(2, '0')}`;
}

function getManualLifelogDraft(dayKey: string): string {
  return manualLifelogDrafts.value[dayKey] || '';
}

function clearManualLifelogDraft(dayKey: string): void {
  const nextDrafts = { ...manualLifelogDrafts.value };
  delete nextDrafts[dayKey];
  manualLifelogDrafts.value = nextDrafts;
}

async function persistMoodRecords(nextMoodData: MoodData): Promise<void> {
  const previous = moodRecords.value;
  const dates = new Set([...Object.keys(previous), ...Object.keys(nextMoodData)]);
  let persisted = previous;
  for (const date of dates) {
    if (JSON.stringify(previous[date]) === JSON.stringify(nextMoodData[date])) continue;
    if (nextMoodData[date]) persisted = await upsertMoodEntry(date, nextMoodData[date]);
    else persisted = await removeMoodEntry(date);
  }
  moodRecords.value = persisted;
  eventBus.emit(Events.MOOD_UPDATED, { moodData: persisted });
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
    console.error('[MonthView] Failed to save manual lifelog entry', error);
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
    console.error('[MonthView] Failed to delete manual lifelog entry', error);
  }
}

function formatManualNoteTimestamp(event: ManualNoteLifelogEvent): string {
  const timestamp = new Date(event.createdAt || event.updatedAt);
  if (Number.isNaN(timestamp.getTime())) {
    return event.date;
  }
  return `${String(timestamp.getHours()).padStart(2, '0')}:${String(timestamp.getMinutes()).padStart(2, '0')}`;
}

function formatMoodTimestamp(event: MoodLifelogEvent): string {
  const timestamp = new Date(event.moodTimestamp || '');
  if (Number.isNaN(timestamp.getTime())) {
    return formatSortMinutes(9 * 60);
  }
  return `${String(timestamp.getHours()).padStart(2, '0')}:${String(timestamp.getMinutes()).padStart(2, '0')}`;
}

function getTaskStyle(task: any, week: any[]): Record<string, string> {
  const {
    positionStep: TASK_POSITION_STEP,
    chipHeight: TASK_CHIP_HEIGHT,
    topOffset: TOP_OFFSET
  } = monthTaskLayout.value;
  const weekStart = new Date(week[0].date);
  weekStart.setHours(0, 0, 0, 0);
  
  const leftPercent = (task.startDayOfWeek / 7) * 100;
  const widthPercent = (task.spanDays / 7) * 100;
  const widthOffset = isCompactMobileLayout.value ? 6 : 24;
  const effectiveBackgroundColor = resolveEffectiveTaskBackgroundColor(task, props.taskGroups);
  const bgColor = resolveTaskBackgroundColor(effectiveBackgroundColor);
  
  const position = task.position ?? (taskPositionsMap.value.get(task.id) ?? 0);
  
    return {
      position: 'absolute' as const,
      left: `${leftPercent}%`,
      width: `calc(${widthPercent}% - ${widthOffset}px)`,
      top: `${TOP_OFFSET + position * TASK_POSITION_STEP}px`,
      height: `${TASK_CHIP_HEIGHT}px`,
      background: bgColor,
    '--pinch-task-chip-color': resolveTaskAccentColor(effectiveBackgroundColor)
  };
}

async function updateLifelogTimelineAnnotation(item: LifelogTimelinePanelItem, text: string): Promise<void> {
  if (!item.annotationKey) {
    return;
  }
  try {
    await updateCheckinNote(item.annotationDate || item.date || '', item.annotationKey, text);
  } catch (error) {
    console.error('[MonthView] Failed to update check-in note', error);
  }
}

function getMonthTaskDragPreviewStyle(preview: NonNullable<typeof allDayTaskDragPreview.value>, week: any[], followPointer: boolean): Record<string, string> {
  const startDayOfWeek = week.findIndex(day => day.key === preview.startDate);
  const dueDate = preview.dueDate || preview.startDate;
  const endDayOfWeek = week.findIndex(day => day.key === dueDate);
  if (startDayOfWeek < 0 || endDayOfWeek < startDayOfWeek) return { display: 'none' };
  const style = getTaskStyle({ ...preview.task, startDayOfWeek, endDayOfWeek, spanDays: endDayOfWeek - startDayOfWeek + 1 }, week);
  if (followPointer) {
    style.left = '0px'; style.top = '0px'; style.width = `${preview.width}px`; style.height = `${preview.height}px`;
    style.transform = `translate3d(${preview.floatingLeft}px, ${preview.floatingTop}px, 0)`;
  }
  return style;
}

function isMobileTaskChipSelected(taskId: string): boolean {
  return selectedMobileTaskChipId.value === taskId;
}

function shouldShowMobileTaskChipControls(taskId: string): boolean {
  return isMobileTaskChipInteractionEnabled.value && isMobileTaskChipSelected(taskId);
}

function selectMobileTaskChip(taskId: string | null): void {
  selectedMobileTaskChipId.value = taskId;
}

function buildMobileTaskChipRepeatSnapshot(task: Task): MobileTaskChipRepeatSnapshot | null {
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
      } as MobileTaskChipRepeatSnapshotEntry;
    })
    .filter((entry): entry is MobileTaskChipRepeatSnapshotEntry => !!entry);
  if (entries.length === 0) {
    return null;
  }
  return {
    seriesId: task.repeatSeriesId,
    entries
  };
}

function restoreMobileTaskChipRepeatSnapshot(snapshot: MobileTaskChipRepeatSnapshot): void {
  for (const entry of snapshot.entries) {
    patchLocalTask(entry.id, {
      repeatInstanceDate: entry.isVirtual ? entry.repeatInstanceDate : undefined,
      startDate: entry.startDate,
      dueDate: entry.hasExplicitDueDate ? entry.dueDate : undefined,
      startTime: entry.startTime,
      dueTime: entry.dueTime
    }, { emit: false });
  }
}

function restoreMobileTaskChipPreview(gesture: MobileTaskChipGesture): void {
  if (gesture.repeatSeriesSnapshot) {
    restoreMobileTaskChipRepeatSnapshot(gesture.repeatSeriesSnapshot);
    return;
  }
  patchLocalTask(gesture.task.id, {
    startDate: gesture.originalStartDate,
    dueDate: gesture.hasExplicitDueDate ? gesture.originalDueDate : undefined
  }, { emit: false });
}

function applyMobileTaskChipRepeatMovePreview(
  snapshot: MobileTaskChipRepeatSnapshot,
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

function applyMobileTaskChipRepeatHandlePreview(
  snapshot: MobileTaskChipRepeatSnapshot,
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

function applyMobileTaskChipMovePreview(
  gesture: MobileTaskChipGesture,
  target: MobileTaskChipDropTarget | null
): void {
  if (!target) {
    restoreMobileTaskChipPreview(gesture);
    return;
  }

  const deltaDays = getDayDiff(gesture.originalStartDate, target.dayKey);
  if (gesture.repeatSeriesSnapshot) {
    applyMobileTaskChipRepeatMovePreview(gesture.repeatSeriesSnapshot, deltaDays);
    return;
  }

  const nextDueDate = shiftDate(gesture.originalDueDate, deltaDays);
  patchLocalTask(gesture.task.id, {
    startDate: target.dayKey,
    dueDate: gesture.hasExplicitDueDate || nextDueDate !== target.dayKey
      ? nextDueDate
      : undefined
  }, { emit: false });
}

async function applyRepeatSeriesDrop(task: Task, targetDate: string): Promise<boolean> {
  if (!isRepeatTaskEntity(task)) return false;

  const series = await getRepeatSeriesForTask(task);
  if (!series) return false;

  const draggedInstanceDate = task.repeatInstanceDate
    || task.startDate
    || task.dueDate
    || series.startDate;
  const deltaDays = getDayDiff(draggedInstanceDate, targetDate);
  const nextSeriesStart = shiftDate(series.startDate, deltaDays);
  const nextSeriesEnd = series.endDate ? shiftDate(series.endDate, deltaDays) : null;

  const seriesTasksForSync: Task[] = [];
  let templateTask: Task | null = null;

  for (const item of localTasks.value) {
    if (!belongsToRepeatSeries(item, series.id, series.templateBlockId)) continue;

    const baseStart = item.startDate || item.dueDate || series.startDate;
    const baseDue = item.dueDate || item.startDate || baseStart;
    const updatedTask = patchLocalTask(item.id, {
      startDate: shiftDate(baseStart, deltaDays),
      dueDate: shiftDate(baseDue, deltaDays)
    });
    if (!updatedTask) continue;

    seriesTasksForSync.push(updatedTask);
    if (!templateTask && !updatedTask.isVirtual) {
      templateTask = updatedTask;
    }
  }

  seriesTasksForSync.forEach((updatedTask) => {
    emitTaskDateChanged(updatedTask);
  });

  try {
    await updateRepeatSeriesDates(
      task,
      nextSeriesStart,
      nextSeriesEnd,
      undefined,
      { emitChange: false }
    );
  } catch (error) {
  }

  const templateBlockId = series.templateBlockId || templateTask?.blockId;
  if (templateBlockId) {
    try {
      await setBlockAttrs(templateBlockId, {
        'custom-task-start-date': nextSeriesStart || '',
        'custom-task-due-date': nextSeriesEnd || ''
      });
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

function handleDragOver(day: any) {
  if (day.isOtherMonth) return;
  
  pendingDragOverDay = day.key;
  
  if (dragOverDayUpdateTimer) {
    clearTimeout(dragOverDayUpdateTimer);
  }
  
  dragOverDayUpdateTimer = setTimeout(() => {
    if (pendingDragOverDay) {
      dragOverDay.value = pendingDragOverDay;
    }
  }, 16);
}

function clearDragOverState() {
  pendingDragOverDay = null;
  if (dragOverDayUpdateTimer) {
    clearTimeout(dragOverDayUpdateTimer);
    dragOverDayUpdateTimer = null;
  }
  dragOverDay.value = null;
}

function handleDragLeave(event: DragEvent) {
  const relatedTarget = event.relatedTarget as HTMLElement;
  const currentTarget = event.currentTarget as HTMLElement;
  
  if (relatedTarget && currentTarget.contains(relatedTarget)) {
    return;
  }

  clearDragOverState();
}

function findCalendarDayByKey(dayKey: string): MonthCalendarDay | null {
  return calendarDays.value.find(day => day.key === dayKey) || null;
}

function formatExternalDropLabel(day: MonthCalendarDay): string {
  return `${day.date.getMonth() + 1}/${day.date.getDate()}`;
}

function pointWithinRect(point: ExternalTaskDropPoint, rect: RectBounds): boolean {
  return point.clientX >= rect.left
    && point.clientX <= rect.right
    && point.clientY >= rect.top
    && point.clientY <= rect.bottom;
}

function resolveExternalDropDay(point: ExternalTaskDropPoint): MonthCalendarDay | null {
  const hitZone = findMonthDayHitZone(point);
  if (hitZone) {
    return hitZone.day;
  }

  const element = document.elementFromPoint(point.clientX, point.clientY) as HTMLElement | null;
  const dayCell = element?.closest('.day-cell[data-day-key]') as HTMLElement | null;
  const dayKey = dayCell?.getAttribute('data-day-key') || '';
  if (!dayKey) {
    return null;
  }
  const day = findCalendarDayByKey(dayKey);
  if (!day || day.isOtherMonth) {
    return null;
  }
  return day;
}

function resolveMobileTaskChipDropTarget(point: ExternalTaskDropPoint): MobileTaskChipDropTarget | null {
  const day = resolveExternalDropDay(point);
  if (!day) {
    return null;
  }
  return {
    day,
    dayKey: day.key,
    label: formatExternalDropLabel(day)
  };
}

function resetMobileDragFeedback(): void {
  mobileDragPreview.value = {
    active: false,
    task: null,
    clientX: 0,
    clientY: 0
  };
  mobileDragHint.value = '';
  clearDragOverState();
}

function clearMobileTaskChipGesture(options: { restorePreview?: boolean } = {}): void {
  const gesture = mobileTaskChipGesture.value;
  if (!gesture) {
    return;
  }
  if (gesture.timerId != null) {
    window.clearTimeout(gesture.timerId);
  }
  cancelMobileTaskChipPointerMoveFrame();
  if (options.restorePreview && gesture.started) {
    restoreMobileTaskChipPreview(gesture);
  }
  releaseMobileTaskPointerCapture(gesture);
  mobileTaskChipGesture.value = null;
  resetMobileDragFeedback();
  invalidateMonthDropZoneCache();
}

function updateMobileTaskChipDragState(target: MobileTaskChipDropTarget | null): void {
  clearDragOverState();
  if (!target) {
    return;
  }
  dragOverDay.value = target.dayKey;
}

function updateMobileTaskChipMoveFeedback(
  gesture: MobileTaskChipGesture,
  point: ExternalTaskDropPoint
): MobileTaskChipDropTarget | null {
  const target = resolveMobileTaskChipDropTarget(point);
  updateMobileTaskChipDragState(target);
  applyMobileTaskChipMovePreview(gesture, target);
  mobileDragPreview.value = {
    active: true,
    task: gesture.task,
    clientX: point.clientX,
    clientY: point.clientY
  };
  mobileDragHint.value = target?.label || '';
  return target;
}

function previewMobileTaskChipHandleDrag(
  gesture: MobileTaskChipGesture,
  point: ExternalTaskDropPoint
): boolean {
  const target = resolveMobileTaskChipDropTarget(point);
  if (!target) {
    resetMobileDragFeedback();
    return false;
  }

  if (gesture.repeatSeriesSnapshot) {
    applyMobileTaskChipRepeatHandlePreview(
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

  updateMobileTaskChipDragState(target);
  mobileDragPreview.value = {
    active: true,
    task: gesture.task,
    clientX: point.clientX,
    clientY: point.clientY
  };
  mobileDragHint.value = target.label;
  return true;
}

function updateExternalTaskDrag(point: ExternalTaskDropPoint): { label: string } | null {
  const day = resolveExternalDropDay(point);
  clearDragOverState();
  if (!day) {
    return null;
  }
  dragOverDay.value = day.key;
  return {
    label: formatExternalDropLabel(day)
  };
}

function handleCalendarTaskDragStart(payload: CalendarTaskSidebarDragPayload): void {
  if (!payload?.task) {
    clearDragOverState();
    return;
  }
  updateExternalTaskDrag(payload);
}

function handleCalendarTaskDragMove(payload: CalendarTaskSidebarDragPayload): void {
  if (!payload?.task) {
    clearDragOverState();
    return;
  }
  updateExternalTaskDrag(payload);
}

async function handleCalendarTaskDragEnd(payload: CalendarTaskSidebarDragPayload): Promise<void> {
  if (!payload?.task) {
    clearDragOverState();
    return;
  }
  await dropExternalTask(payload.task, payload);
}

function handleCalendarTaskDragCancel(): void {
  clearDragOverState();
}

function handleTaskManagerCalendarPointerDrag(event: Event): void {
  const detail = (event as CustomEvent<TaskManagerCalendarDragDetail>).detail;
  if (!detail || (detail.phase !== 'cancel' && !detail.task)) return;
  if (detail.phase === 'start' || detail.phase === 'move') {
    updateExternalTaskDrag(detail);
  } else if (detail.phase === 'end') {
    void dropExternalTask(detail.task, detail).catch(() => clearDragOverState());
  } else {
    clearDragOverState();
  }
}

async function applyTaskDropToDay(task: Task, day: MonthCalendarDay): Promise<void> {
  try {
    const dateStr = formatDate(day.date);
    const existingBackgroundColor = normalizeTaskBackgroundColorValue(task.backgroundColor);
    const assignedBackgroundColor = existingBackgroundColor
      ? undefined
      : (resolveTaskGroupBackgroundColor(task, props.taskGroups) || pickRandomTaskBackgroundColor());
    
    if (pendingDeletion.value.has(task.id)) {
      pendingDeletion.value.delete(task.id);
    }

    const handledBySeries = await applyRepeatSeriesDrop(task, dateStr);
    if (handledBySeries) return;
    
    const updatedTask = upsertLocalTask(task, {
      startDate: dateStr,
      dueDate: dateStr,
      ...(assignedBackgroundColor ? { backgroundColor: assignedBackgroundColor } : {})
    });
    emitTaskDateChanged(updatedTask);
    
    if (task.type === 'block' && task.blockId) {
      const attrs: Record<string, string> = {
        'custom-task-start-date': dateStr,
        'custom-task-due-date': dateStr
      };
      if (assignedBackgroundColor) {
        attrs['custom-task-background-color'] = assignedBackgroundColor;
      }
      setBlockAttrs(task.blockId, attrs)
        .then(() => TaskRepository.clearCache())
        .catch(() => {});
    }
  } catch (error) {
    console.error('[MonthView] handleDrop error', error);
  }
}

async function dropExternalTask(task: Task, point: ExternalTaskDropPoint): Promise<boolean> {
  const day = resolveExternalDropDay(point);
  clearDragOverState();
  if (!day) {
    return false;
  }
  await applyTaskDropToDay(task, day);
  return true;
}

async function handleDrop(day: MonthCalendarDay, event: DragEvent) {
  clearDragOverState();
  
  if (day.isOtherMonth) return;
  
  const taskData = event?.dataTransfer?.getData('application/json');
  
  if (!taskData) return;
  
  try {
    const task = JSON.parse(taskData) as Task;
    await applyTaskDropToDay(task, day);
  } catch (error) {
    console.error('[MonthView] handleDrop parse error', error);
  }
}

function previousMonth() {
  closeLifelogDay();
  baseDate.value = new Date(baseDate.value.getFullYear(), baseDate.value.getMonth() - 1, 1);
}

function nextMonth() {
  closeLifelogDay();
  baseDate.value = new Date(baseDate.value.getFullYear(), baseDate.value.getMonth() + 1, 1);
}

function goToToday(): void {
  closeLifelogDay();
  const today = new Date();
  baseDate.value = new Date(today.getFullYear(), today.getMonth(), 1);
}

function focusMonth(date: Date): void {
  closeLifelogDay();
  baseDate.value = new Date(date.getFullYear(), date.getMonth(), 1);
}

function changeLifelogTimelinePeriod(offset: number): void {
  const nextDate = new Date(baseDate.value.getFullYear(), baseDate.value.getMonth() + (offset < 0 ? -1 : 1), 1);
  baseDate.value = nextDate;
  const year = nextDate.getFullYear();
  const month = String(nextDate.getMonth() + 1).padStart(2, '0');
  lifelogDayKey.value = `${year}-${month}-01`;
}

function handleWheel(event: WheelEvent) {
  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest('.calendar-task-sidebar-list')) {
    return;
  }

  if (lifelogDayKey.value) {
    event.stopPropagation();
    return;
  }

  event.preventDefault();
  closeLifelogDay();
  
  const daysToScroll = event.deltaY > 0 ? 7 : -7;
  const newDate = new Date(baseDate.value);
  newDate.setDate(newDate.getDate() + daysToScroll);
  
  baseDate.value = newDate;
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

function releaseMobileTaskPointerCapture(gesture: PointerCaptureSession | null): void {
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
  invalidateMonthDropZoneCache();
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
  });
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

function cancelMobileTaskChipPointerMoveFrame(): void {
  if (mobileTaskChipPointerMoveRafId == null) {
    return;
  }
  window.cancelAnimationFrame(mobileTaskChipPointerMoveRafId);
  mobileTaskChipPointerMoveRafId = null;
}

function flushMobileTaskChipPointerMoveFrame(): void {
  mobileTaskChipPointerMoveRafId = null;
  const gesture = mobileTaskChipGesture.value;
  if (!gesture?.started) {
    return;
  }
  const point = {
    clientX: gesture.latestX,
    clientY: gesture.latestY
  };
  if (gesture.mode === 'move') {
    updateMobileTaskChipMoveFeedback(gesture, point);
    return;
  }
  previewMobileTaskChipHandleDrag(gesture, point);
}

function scheduleMobileTaskChipPointerMoveFrame(): void {
  if (mobileTaskChipPointerMoveRafId != null) {
    return;
  }
  mobileTaskChipPointerMoveRafId = window.requestAnimationFrame(() => {
    flushMobileTaskChipPointerMoveFrame();
  });
}

function handleMobileTaskPointerDown(event: PointerEvent, task: Task): void {
  if (!isCompactMobileLayout.value) {
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
  selectMobileTaskChip(null);
  clearMobileTaskChipGesture({ restorePreview: true });
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
    });
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

async function commitMobileTaskChipMove(
  gesture: MobileTaskChipGesture,
  target: MobileTaskChipDropTarget | null
): Promise<void> {
  if (!target) {
    return;
  }

  const task = gesture.task;
  if (isRepeatTaskEntity(task)) {
    await applyRepeatSeriesDrop(task, target.dayKey);
    return;
  }

  const deltaDays = getDayDiff(gesture.originalStartDate, target.dayKey);
  const nextDueDate = shiftDate(gesture.originalDueDate, deltaDays);
  const nextDueDateValue = gesture.hasExplicitDueDate || nextDueDate !== target.dayKey
    ? nextDueDate
    : undefined;
  const updatedTask = patchLocalTask(task.id, {
    startDate: target.dayKey,
    dueDate: nextDueDateValue
  });
  const syncedTask = updatedTask || localTasks.value.find(item => item.id === task.id) || task;
  if (syncedTask) {
    emitTaskDateChanged(syncedTask);
  }

  if (syncedTask.type !== 'block' || !syncedTask.blockId) {
    return;
  }

  try {
    await setBlockAttrs(syncedTask.blockId, {
      'custom-task-start-date': target.dayKey,
      'custom-task-due-date': nextDueDateValue || ''
    });
  } catch {
    patchLocalTask(task.id, {
      startDate: gesture.originalStartDate,
      dueDate: gesture.hasExplicitDueDate ? gesture.originalDueDate : undefined
    });
  }
}

async function commitMobileTaskChipHandleDrag(gesture: MobileTaskChipGesture): Promise<void> {
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
      restoreMobileTaskChipRepeatSnapshot(gesture.repeatSeriesSnapshot);
      return;
    }
  }

  if (currentTask.type === 'block' && currentTask.blockId) {
    try {
      await setBlockAttrs(currentTask.blockId, {
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

function handleMobileTaskChipPointerDown(event: PointerEvent, task: Task): void {
  if (!isMobileTaskChipInteractionEnabled.value) {
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
  const alreadySelected = isMobileTaskChipSelected(task.id);

  clearMobileTaskChipGesture();
  resetMobileDragFeedback();

  let timerId: number | null = null;
  if (!alreadySelected) {
    timerId = window.setTimeout(() => {
      const gesture = mobileTaskChipGesture.value;
      if (!gesture || gesture.pointerId !== event.pointerId || gesture.task.id !== task.id) {
        return;
      }
      gesture.started = true;
      selectMobileTaskChip(task.id);
      triggerMobileDragHaptic();
    }, MOBILE_DRAG_LONG_PRESS_MS);
  } else {
    selectMobileTaskChip(task.id);
  }

  if (captureElement) {
    try {
      captureElement.setPointerCapture(event.pointerId);
    } catch {
      // Ignore environments that don't allow capturing this pointer.
    }
  }

  mobileTaskChipGesture.value = {
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
    hasExplicitDueDate: !!originalDueDateValue,
    repeatSeriesSnapshot: isRepeatTaskEntity(task)
      ? buildMobileTaskChipRepeatSnapshot(task)
      : null
  };
}

function handleMobileTaskChipHandlePointerDown(
  event: PointerEvent,
  task: Task,
  handleType: 'start' | 'end'
): void {
  if (!isMobileTaskChipInteractionEnabled.value) {
    return;
  }
  if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) {
    return;
  }

  clearMobileTaskChipGesture();
  resetMobileDragFeedback();
  selectMobileTaskChip(task.id);

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
  mobileTaskChipGesture.value = {
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
    hasExplicitDueDate: !!originalDueDateValue,
    repeatSeriesSnapshot: isRepeatTaskEntity(task)
      ? buildMobileTaskChipRepeatSnapshot(task)
      : null
  };
}

function handleMobileTaskChipPointerMove(event: PointerEvent): void {
  const gesture = mobileTaskChipGesture.value;
  if (!gesture || gesture.pointerId !== event.pointerId) {
    return;
  }

  gesture.latestX = event.clientX;
  gesture.latestY = event.clientY;

  if (!gesture.started) {
    const movedDistance = Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY);
    if (movedDistance > MOBILE_DRAG_MOVE_THRESHOLD_PX) {
      clearMobileTaskChipGesture();
    }
    return;
  }

  if (gesture.mode === 'move') {
    const movedDistance = Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY);
    if (!gesture.moved && movedDistance < MOBILE_TASK_CHIP_OPERATION_MOVE_THRESHOLD_PX) {
      return;
    }
    gesture.moved = true;
    event.preventDefault();
    scheduleMobileTaskChipPointerMoveFrame();
    return;
  }

  gesture.moved = true;
  event.preventDefault();
  scheduleMobileTaskChipPointerMoveFrame();
}

function handleDocumentMobileTaskChipPointerMove(event: PointerEvent): void {
  if (!mobileTaskChipGesture.value) {
    return;
  }
  handleMobileTaskChipPointerMove(event);
}

async function finishMobileTaskChipPointer(event: PointerEvent, cancelled: boolean): Promise<void> {
  const gesture = mobileTaskChipGesture.value;
  if (!gesture || gesture.pointerId !== event.pointerId) {
    return;
  }
  if (gesture.timerId != null) {
    window.clearTimeout(gesture.timerId);
  }

  if (!gesture.started) {
    clearMobileTaskChipGesture();
    return;
  }

  if (gesture.mode === 'move') {
    const point = {
      clientX: event.clientX,
      clientY: event.clientY
    };
    const target = !cancelled && gesture.moved
      ? resolveMobileTaskChipDropTarget(point)
      : null;
    const task = gesture.task;
    const shouldAllowTapClick = !cancelled && !gesture.moved && gesture.timerId == null;
    const shouldRestorePreview = cancelled || (gesture.moved && !target);
    clearMobileTaskChipGesture({ restorePreview: shouldRestorePreview });
    if (shouldAllowTapClick) {
      return;
    }
    suppressTaskClick(task.id);
    if (!cancelled && !gesture.moved) {
      selectMobileTaskChip(task.id);
      return;
    }
    if (!cancelled && gesture.moved) {
      await commitMobileTaskChipMove(gesture, target);
    }
    return;
  }

  const gestureSnapshot = gesture;
  clearMobileTaskChipGesture({ restorePreview: cancelled });
  if (cancelled || !gestureSnapshot.moved) {
    return;
  }
  suppressTaskClick(gestureSnapshot.task.id);
  await commitMobileTaskChipHandleDrag(gestureSnapshot);
}

function handleMobileTaskChipPointerUp(event: PointerEvent): void {
  void finishMobileTaskChipPointer(event, false);
}

function handleMobileTaskChipPointerCancel(event: PointerEvent): void {
  void finishMobileTaskChipPointer(event, true);
}

function handleDocumentMobileTaskChipPointerUp(event: PointerEvent): void {
  if (!mobileTaskChipGesture.value) {
    return;
  }
  handleMobileTaskChipPointerUp(event);
}

function handleDocumentMobileTaskChipPointerCancel(event: PointerEvent): void {
  if (!mobileTaskChipGesture.value) {
    return;
  }
  handleMobileTaskChipPointerCancel(event);
}

function handleMobileTaskChipClick(event: MouseEvent, task: Task): void {
  if (!isMobileTaskChipInteractionEnabled.value) {
    selectedCalendarTaskId.value = task.id;
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
  selectMobileTaskChip(null);
  handleTaskClick(task, event);
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
  if (target instanceof Element && target.closest('.time-popover-overlay, .time-popover, .date-popover-overlay, .date-popover, .repeat-dialog-overlay, .repeat-dialog, .task-repeat-settings-popover')) {
    return;
  }
  selectMobileTaskChip(null);
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

function showTaskContextMenu(task: Task, anchor?: { x: number; y: number }): void {
  contextMenu.value = {
    show: true,
    x: anchor?.x ?? window.innerWidth / 2,
    y: anchor?.y ?? window.innerHeight / 2,
    task
  };
  contextMenuDateDraft.value = createCalendarTaskDateFields({
    startDate: task.startDate || '',
    startTime: task.startTime || '',
    dueDate: task.dueDate || '',
    dueTime: task.dueTime || ''
  });
  contextMenuRepeatFrequency.value = normalizeRepeatFrequencyForMenu(task.repeatFrequency as RepeatFrequency | undefined);
  contextMenuRepeatRule.value = null;

  const isRepeatTask = isRepeatTaskEntity(task);
  if (isRepeatTask) {
    getRepeatSeriesForTask(task)
      .then((series) => {
        if (!series) return;
        if (contextMenu.value.task?.id !== task.id) return;
        contextMenuDateDraft.value = createCalendarTaskDateFields({
          startDate: series.startDate || '',
          startTime: series.startTime || '',
          dueDate: series.endDate || '',
          dueTime: series.dueTime || ''
        });
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
  if (isCompactMobileLayout.value) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  showTaskContextMenu(task, {
    x: event.clientX,
    y: event.clientY
  });
}

function handleGlobalClick(event: MouseEvent) {
  const target = event.target;
  const targetElement = target instanceof Element ? target : null;

  if (selectedMobileTaskChipId.value) {
    const clickedInsideInteractiveChip = !!targetElement?.closest('.task-chip, .habit-task-chip, .context-menu, .mobile-drag-preview, .time-popover-overlay, .time-popover, .date-popover-overlay, .date-popover');
    if (!clickedInsideInteractiveChip) {
      selectMobileTaskChip(null);
    }
  }

  if (lifelogDayKey.value) {
    const clickedInsideLifelogPanel = !!targetElement?.closest('.lifelog-timeline-panel');
    const clickedLifelogTrigger = !!targetElement?.closest('.day-number, .day-focus-summary, .day-habit-summary, .day-task-summary, .day-compact-lifelog-summary, .day-mood-summary');
    if (!clickedInsideLifelogPanel && !clickedLifelogTrigger) {
      closeLifelogDay();
    }
  }

  const menu = document.querySelector('.context-menu');
  if (menu && !(target instanceof Node && menu.contains(target))) {
    if (!(targetElement && targetElement.closest('.time-popover-overlay, .time-popover, .date-popover-overlay, .date-popover'))) {
      hideContextMenu();
    }
  }
}

function startFocusForTask(task: Task): void {
  hideContextMenu();
  openHabitTrackerFocusTimer(createTaskFocusTarget(task));
}

function hideContextMenu() {
  unbindContextMenuOutsidePointerDown();
  contextMenu.value = {
    show: false,
    x: 0,
    y: 0,
    task: null
  };
  contextMenuDateDraft.value = createCalendarTaskDateFields();
  contextMenuRepeatFrequency.value = 'none';
  contextMenuRepeatRule.value = null;
}

async function applyTaskDates(task: Task) {
  if (!task) return;

  emit('taskDateSaveRequested', saveCalendarTaskDates({
    task,
    fields: contextMenuDateDraft.value,
    localTasks,
    patchLocalTask,
    suppressRepeatSeriesSync: taskSyncGuard.suppressRepeatSeriesSync,
    emitTaskDateChanged
  }));
}

async function clearTaskDates(task: Task): Promise<void> {
  if (!task) return;

  contextMenuDateDraft.value = createCalendarTaskDateFields();
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
  const result = await persistTaskBackgroundColor(task, color, localTasks.value).catch((error) => {
    console.error('[MonthView] failed to update task color', error);
    return null;
  });
  if (!result) {
    return;
  }

  if (result.isRepeatTask) {
    const updatedById = new Map<string, Task>();
    result.updatedTasks.forEach(item => {
      updatedById.set(item.id, item);
    });
    localTasks.value = localTasks.value.map(item => updatedById.get(item.id) || item);
  } else {
    patchLocalTask(task.id, { backgroundColor: result.color });
  }
  if (contextMenu.value.task?.id === task.id) {
    contextMenu.value = {
      ...contextMenu.value,
      task: { ...contextMenu.value.task, backgroundColor: result.color }
    };
  }

  emitTaskColorChanged(result.updatedTask);
}


onMounted(() => {
  document.addEventListener('keydown', handleCalendarTaskDateClearKeydown);
  document.addEventListener('pointerdown', handleCalendarTaskSelectionOutsidePointerDown);
  window.addEventListener('pinch-calendar-task-pointer-drag', handleTaskManagerCalendarPointerDrag as EventListener);
  emitVisibleCalendarRange();
  taskSyncGuard.syncTasks(props.tasks, false, getTasksHash);
  syncCompactMobileLayout();
  window.addEventListener('resize', syncCompactMobileLayout);
  document.addEventListener('pointermove', handleDocumentMobileTaskPointerMove);
  document.addEventListener('pointerup', handleDocumentMobileTaskPointerUp);
  document.addEventListener('pointercancel', handleDocumentMobileTaskPointerCancel);
  document.addEventListener('pointermove', handleDocumentMobileTaskChipPointerMove);
  document.addEventListener('pointerup', handleDocumentMobileTaskChipPointerUp);
  document.addEventListener('pointercancel', handleDocumentMobileTaskChipPointerCancel);
  window.addEventListener('pinch-focus-session', handleFocusSessionUpdate);
  unsubscribeHabitUpdates = eventBus.on(Events.HABITS_UPDATED, handleHabitsUpdated);
  unsubscribeMoodUpdates = eventBus.on(Events.MOOD_UPDATED, handleMoodUpdated);
  void refreshFocusSessions();
  void refreshHabitCheckins();
  void refreshMoodRecords();

  const container = document.querySelector('.month-view');
  if (container) {
    eventManager.add(container as HTMLElement, 'wheel', handleWheel, 'wheel');
  }
  eventManager.add(document, 'click', handleGlobalClick, 'globalClick');
  eventManager.add(document, 'mousemove', handleCreateSelectionMouseMove as EventListener, 'createSelectionMousemove');
  eventManager.add(document, 'mouseup', finishCreateSelection as EventListener, 'createSelectionMouseup');
  eventManager.add(document, 'dragend', clearDragOverState as EventListener, 'dragCleanup');
  eventManager.add(document, 'drop', clearDragOverState as EventListener, 'dragCleanup');

});

async function toggleTaskStatus(task: Task, event?: MouseEvent) {
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
      const completedAt = await TaskRepository.updateRepeatInstanceStatus(task, nextStatus);
      if (nextStatus === 'completed' && completedAt) {
        requestTaskCompletionNote(task.id, completedAt, getCheckinNotePromptAnchor(event?.currentTarget ?? null), task.title, task.blockId || task.id);
      }
    } else if (task.type === 'block' && task.blockId) {
      await updateTaskMarkdown(task.blockId, nextStatus === 'completed', true, getCheckinNotePromptAnchor(event?.currentTarget ?? null));
    }
  } catch (error) {
    patchLocalTask(task.id, {
      status: previousStatus,
      completedAt: previousCompletedAt
    });
  }
}

function handleDayCellMouseDown(day: { key: string }, event: MouseEvent) {
  if (event.button !== 0) return;
  createSelection.value = {
    active: true,
    startDay: day.key,
    endDay: day.key,
    startX: event.clientX,
    startY: event.clientY,
    passedThreshold: false
  };
}

function handleDayCellMouseEnter(day: { key: string }) {
  if (!createSelection.value?.active) return;
  createSelection.value.endDay = day.key;
}

function isDayInCreateSelection(dayKey: string): boolean {
  if (!createSelection.value?.active || !createSelection.value.passedThreshold) return false;
  const { startDay, endDay } = createSelection.value;
  const from = startDay <= endDay ? startDay : endDay;
  const to = startDay <= endDay ? endDay : startDay;
  return dayKey >= from && dayKey <= to;
}

function handleCreateSelectionMouseMove(event: MouseEvent) {
  const selection = createSelection.value;
  if (!selection?.active || selection.passedThreshold) return;
  const dx = event.clientX - selection.startX;
  const dy = event.clientY - selection.startY;
  if (Math.hypot(dx, dy) >= CREATE_SELECTION_THRESHOLD_PX) {
    selection.passedThreshold = true;
  }
}

function finishCreateSelection() {
  const selection = createSelection.value;
  if (!selection?.active) return;

  const from = selection.startDay <= selection.endDay ? selection.startDay : selection.endDay;
  const to = selection.startDay <= selection.endDay ? selection.endDay : selection.startDay;

  createSelection.value = null;

  if (!selection.passedThreshold) return;

  emit('taskCreateRequested', {
    startDate: from,
    dueDate: to,
    allDay: true
  });
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

defineExpose({
  updateExternalTaskDrag,
  clearExternalTaskDrag: clearDragOverState,
  dropExternalTask
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleCalendarTaskDateClearKeydown);
  document.removeEventListener('pointerdown', handleCalendarTaskSelectionOutsidePointerDown);
  window.removeEventListener('pinch-calendar-task-pointer-drag', handleTaskManagerCalendarPointerDrag as EventListener);
  clearMobileTaskDrag();
  clearMobileTaskChipGesture({ restorePreview: true });
  document.removeEventListener('pointermove', handleDocumentMobileTaskPointerMove);
  document.removeEventListener('pointerup', handleDocumentMobileTaskPointerUp);
  document.removeEventListener('pointercancel', handleDocumentMobileTaskPointerCancel);
  document.removeEventListener('pointermove', handleDocumentMobileTaskChipPointerMove);
  document.removeEventListener('pointerup', handleDocumentMobileTaskChipPointerUp);
  document.removeEventListener('pointercancel', handleDocumentMobileTaskChipPointerCancel);
  window.removeEventListener('resize', syncCompactMobileLayout);
  window.removeEventListener('pinch-focus-session', handleFocusSessionUpdate);
  unsubscribeHabitUpdates?.();
  unsubscribeHabitUpdates = null;
  unsubscribeMoodUpdates?.();
  unsubscribeMoodUpdates = null;
  taskSyncGuard.clearAllTaskSyncLocks();
  removeEventListeners();

  eventManager.clear();
  unbindContextMenuOutsidePointerDown();

  clearDragOverState();

  if (dragOverDayUpdateTimer) {
    clearTimeout(dragOverDayUpdateTimer);
    dragOverDayUpdateTimer = null;
  }
  
});

</script>

<style scoped>
.month-view {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.month-view-layout {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

.calendar-container {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--b3-theme-background);
}

.calendar-toolbar {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  padding: 0 10px;
  border-bottom: 1px solid var(--b3-theme-border);
}

.calendar-toolbar-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.calendar-toolbar-top {
  display: flex;
  align-items: center;
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

.month-title {
  font-size: 26px;
  font-weight: 500;
  color: var(--b3-theme-on-background);
}

.today-btn {
  height: 28px;
  border: 1px solid transparent;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  font-size: 12px;
  padding: 0 10px;
  border-radius: 7px;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: var(--pinch-shadow);
}

.today-btn:hover {
  background: var(--b3-list-hover);
}

.calendar-grid {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.weekday-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  border-bottom: 1px solid var(--b3-list-hover);
}

.weekday {
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  color: var(--b3-theme-on-surface);
  padding: 8px;
}

.weeks-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
  background-color: var(--b3-list-hover);
}

.week-row {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.week-days-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-rows: 1fr;
  gap: 1px;
}

.day-cell {
  background: var(--b3-theme-background);
  min-height: 0;
  padding: 6px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  transition: background-color 0.2s;
  box-sizing: border-box;
  position: relative;
  overflow: visible;
}

.day-cell.other-month .day-number {
  opacity: 0.5;
}

.day-info {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 4px;
  width: 100%;
  padding: 0 2px;
}

.day-number {
  font-size: 13px;
  font-weight: 500;
  color: var(--b3-theme-on-background);
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  font-family: inherit;
  line-height: 1;
  cursor: pointer;
}

.day-number:hover,
.day-number:focus-visible {
  background: var(--b3-list-hover);
  outline: none;
}

.day-date-inline {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  min-width: 0;
}

.day-compact-lifelog-summary {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  height: 18px;
  padding: 0 5px;
  border-radius: 5px;
  box-shadow: var(--pinch-shadow);
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  font-size: 10px;
  line-height: 16px;
  box-sizing: border-box;
  overflow: visible;
  white-space: nowrap;
  cursor: pointer;
  pointer-events: auto;
  flex-shrink: 0;
}

.day-lunar {
  font-size: 10px;
  color: var(--b3-theme-on-surface);
  opacity: 0.7;
  text-align: right;
  line-height: 2;
}

.day-lunar.festival {
  color: #f98f7a;
  font-weight: 500;
}

.day-lunar.term {
  color: #4caf50;
  font-weight: 500;
}

.day-focus-summary {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  min-width: 0;
  height: 16px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: inherit;
  line-height: 16px;
  box-sizing: border-box;
  flex-shrink: 0;
}

.day-focus-summary span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.day-habit-summary,
.day-task-summary {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  min-width: 0;
  height: 16px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: inherit;
  line-height: 16px;
  box-sizing: border-box;
  flex-shrink: 0;
}

.day-habit-summary span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.day-task-summary {
  border: 0;
  background: transparent;
}

.day-habit-summary :deep(svg),
.day-task-summary :deep(svg) {
  color: #f98f7a;
  stroke: #f98f7a;
}

.day-task-summary span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.day-mood-summary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-width: 0;
  height: 16px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: inherit;
  font-size: 12px;
  line-height: 16px;
  box-sizing: border-box;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.day-mood-summary-icon {
  display: inline-flex;
  width: 14px;
  height: 14px;
  align-items: center;
  justify-content: center;
  flex: 0 0 14px;
}

.day-mood-summary-icon :deep(svg) {
  display: block;
  width: 14px;
  height: 14px;
}

.day-cell.drag-over {
  background: transparent;
  border: 2px solid var(--pinch-color7);
  border-radius: 6px;
}

.day-cell.create-selecting {
  background: var(--b3-theme-primary-lightest);
}

.day-cell.today .day-number {
  color: var(--b3-theme-background);
  background-color: #f98f7a;
  border-radius: 6px;
}

.week-tasks-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  padding: 6px;
  padding-left: 32px;
}

.task-chip {
  padding: 3px 6px;
  border-radius: 6px;
  font-size: 11px;
  cursor: default;
  background: var(--b3-theme-surface);
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

.task-chip::before {
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

.habit-task-chip {
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

.habit-task-chip.task-completed {
  opacity: 0.6;
}

.habit-task-chip .task-chip-title {
  cursor: default;
}
.task-chip:hover {
  background: var(--b3-list-hover);
}

.task-chip.mobile-selected {
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

.task-chip .task-handle::after {
  display: none;
  content: '';
  position: absolute;
  top: 50%;
  width: 8px;
  height: 22px;
  border-radius: 999px;
  transform: translate(-50%, -50%);
  background: var(--pinch-task-chip-color, var(--pinch-color6));
  box-shadow: none;
}

.task-handle-left {
  left: 0;
}

.task-handle-left::after {
  left: 50%;
}

.task-handle-right {
  right: 0;
}

.task-handle-right::after {
  left: 50%;
  right: auto;
}

.task-chip.task-completed {
  opacity: 0.6;
}

.task-chip-title {
  display: flex;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  margin: 0 4px;
  cursor: grab;
  user-select: none;
  gap: 2px;
}

.task-checkbox-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
}

.task-chip-title:active {
  cursor: grabbing;
}

.task-chip-title.task-dragging {
  cursor: grabbing;
}

.task-chip.keyboard-selected {
  box-shadow: 0 0 0 2px var(--pinch-task-chip-color, var(--pinch-color6));
}

.task-chip.task-dragging { opacity: 0.32; }
.month-task-drag-outline { position: absolute; box-sizing: content-box; padding: 3px 6px 3px 8px; margin-left: 5px; border: none; box-shadow: inset 0 0 0 2px var(--pinch-task-chip-color, var(--pinch-color6)); border-radius: 6px; background: transparent !important; pointer-events: none; z-index: 5; }
.month-task-drag-ghost { pointer-events: none; z-index: 6; opacity: 0.94; box-shadow: 0 6px 14px rgba(0, 0, 0, .16); will-change: transform; }

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

.task-title-text {
  flex: 0 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.task-title-text :deep(*) {
  display: inline;
  white-space: nowrap;
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

.placeholder-text {
  font-size: 11px;
  color: var(--b3-theme-on-surface);
  opacity: 0.4;
  text-align: center;
  padding: 8px 4px;
  font-style: italic;
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
  .task-chip .task-handle {
    top: -3px;
    bottom: -3px;
    width: 14px;
  }

  .task-chip .task-handle-left {
    left: -7px;
  }

  .task-chip .task-handle-left::after {
    left: 50%;
  }

  .task-chip .task-handle-right {
    right: -7px;
  }

  .task-chip .task-handle-right::after {
    left: 50%;
    right: auto;
  }

  .task-chip:hover {
    box-shadow: 0 0 0 2px var(--pinch-task-chip-color, var(--pinch-color6));
    z-index: 25;
  }

  .task-chip:hover .task-handle::after {
    display: block;
  }
}

.habit-task-chip,
.task-chip,
.task-chip-title {
  -webkit-touch-callout: none;
  touch-action: none;
}

@media (max-width: 768px) {
  .calendar-toolbar-top > .nav-btn:first-child {
    display: none;
  }

  .calendar-toolbar-actions {
    margin-left: 0;
    width: 100%;
  }

  .calendar-view-switcher {
    margin-right: auto;
  }

  .day-cell.drag-over {
    background: transparent;
    border: 2px solid var(--pinch-color7);
    border-radius: 6px;
  }

  .calendar-toolbar {
    padding: 4px 8px;
  }

  .month-title {
    font-size: 15px;
  }

  .weekday {
    font-size: 10px;
    padding: 6px 4px;
  }

  .day-cell {
    padding: 4px;
    gap: 1px;
  }

  .day-number {
    font-size: 11px;
    width: 18px;
    height: 18px;
  }

  .day-lunar {
    font-size: 8px;
    line-height: 1.3;
  }

  .week-tasks-layer {
    padding: 4px;
    padding-left: 24px;
  }

  .task-chip,
  .habit-task-chip {
    height: 12px !important;
    min-height: 12px;
    padding: 1px 4px;
    border-radius: 4px;
    box-sizing: border-box;
    margin-left: 3px;
  }

  .task-chip::before {
    display: none;
  }

  .task-chip.mobile-selected {
    z-index: 28;
  }

  .task-handle {
    display: none;
    pointer-events: none;
    top: -4px;
    bottom: -4px;
    width: 20px;
  }

  .task-handle-left {
    left: -10px;
  }

  .task-handle-left::after {
    left: 50%;
  }

  .task-handle-right {
    right: -10px;
  }

  .task-handle-right::after {
    left: 50%;
    right: auto;
  }

  .task-handle.mobile-visible {
    display: block !important;
    pointer-events: auto;
  }

  .task-handle.mobile-visible::after {
    display: block;
  }

  .task-checkbox-wrapper,
  .task-priority-badge,
  .task-jump-btn {
    display: none !important;
  }

  .task-chip-title {
    margin: 0;
    gap: 0;
    width: 100%;
  }

  .task-title-text {
    font-size: 9px;
    line-height: 1.1;
    width: 100%;
    display: block;
  }

  .placeholder-text {
    font-size: 9px;
  }

}

</style>
