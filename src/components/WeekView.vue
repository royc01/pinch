<template>
  <div class="week-view" :class="{ 'mobile-day-view-mode': isMobileDayViewMode }">
    <div class="calendar-header">
      <button class="nav-btn" @click="previousWeek">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
        </svg>
      </button>
      <div class="header-center">
        <div class="header-title">{{ displayWeekTitle }}</div>
        <button class="today-btn" @click="goToToday">今天</button>
      </div>
      <button class="nav-btn" @click="nextWeek">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
        </svg>
      </button>
    </div>
    
    <div class="week-body">
      <div v-if="isMobileWeekGridMode" class="mobile-week-grid">
        <div class="mobile-week-cell mobile-month-cell">
          <div class="mobile-cell-header mobile-month-header">
            <span class="mobile-cell-title">月历</span>
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
          :class="{ today: day.isToday }"
        >
          <div class="mobile-cell-header">
            <span class="mobile-cell-title">{{ day.weekdayName }}</span>
            <span class="mobile-cell-date">{{ day.dayNumber }}</span>
          </div>
          <div class="mobile-chip-list">
            <div
              v-for="task in getMobileDayTasks(day.key)"
              :key="task.id"
              class="mobile-task-chip"
              :class="[
                `priority-${task.priority}`,
                { 'task-completed': task.status === 'completed' }
              ]"
              :style="getMobileTaskChipStyle(task)"
              @click="handleTaskClick(task)"
              @contextmenu="handleContextMenu($event, task)"
            >
              <span class="task-checkbox-wrapper" @click.stop="toggleTaskStatus(task)">
                <TaskCheckbox :checked="task.status === 'completed'" :size="12" />
              </span>
              <span class="mobile-task-chip-title">{{ stripHtml(task.title) }}</span>
              <span v-if="task.priority !== 'none'" class="task-priority-badge" :class="`priority-${task.priority}`">
                <Icon name="flag" width="10" height="10" />
              </span>
              <span class="task-jump-btn" @click.stop="handleTaskClick(task)">
                <Icon name="open" width="14" height="14" />
              </span>
            </div>
            <div v-if="getMobileDayTasks(day.key).length === 0" class="mobile-empty-tip">暂无任务</div>
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
            <template v-if="!isDaysCountLocked">
              <button class="days-control-btn" @click="decreaseDays" :disabled="daysCount <= CALENDAR_CONSTANTS.LAYOUT.MIN_DAYS">-</button>
              <span class="days-count">{{ daysCount }}</span>
              <button class="days-control-btn" @click="increaseDays" :disabled="daysCount >= CALENDAR_CONSTANTS.LAYOUT.MAX_DAYS">+</button>
            </template>
            <span v-else class="all-day-label-text">全天</span>
          </div>
          <div v-for="day in weekDays" :key="day.key" class="weekday-cell" :class="{ today: day.isToday }">
            <div class="weekday-name">{{ day.weekdayName }}</div>
            <div class="day-number">{{ day.dayNumber }}</div>
          </div>
        </div>
        
        <div class="all-day-section" :style="{ height: isAllDaySectionCollapsed ? '30px' : allDaySectionHeight + 'px' }">
          <div class="all-day-label-in-section" @click="toggleAllDaySection">
            <span class="collapse-btn" :class="{ collapsed: isAllDaySectionCollapsed }">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
              </svg>
            </span>
            <span v-show="!isAllDaySectionCollapsed">全天</span>
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
                class="all-day-task"
                :class="[
                  `priority-${task.priority}`,
                  { 'task-completed': task.status === 'completed' }
                ]"
                :style="getAllDayTaskStyle(task)"
                @contextmenu="handleContextMenu($event, task)"
              >
                <div 
                  class="task-handle task-handle-left"
                  :class="{ 'handle-dragging': draggingHandle?.task.id === task.id && draggingHandle?.type === 'start' }"
                  @mousedown="handleHandleMouseDown($event, task, 'start')"
                ></div>
                <div 
                  class="task-chip-title"
                  :class="{ 'task-dragging': draggingTask?.task.id === task.id }"
                  @mousedown="handleTaskMouseDown($event, task)"
                >
                  <span
                    class="task-checkbox-wrapper"
                    @mousedown.stop
                    @click.stop="toggleTaskStatus(task)"
                  >
                    <TaskCheckbox :checked="task.status === 'completed'" :size="12" />
                  </span>
                  <span class="task-title-text">{{ stripHtml(task.title) }}</span>
                  <span v-if="task.priority !== 'none'" class="task-priority-badge" :class="`priority-${task.priority}`">
                    <Icon name="flag" width="10" height="10" />
                  </span>
                  <span class="task-jump-btn" @click.stop="handleTaskClick(task)">
                    <Icon name="open" width="14" height="14" />
                  </span>
                </div>
                <div 
                  class="task-handle task-handle-right"
                  :class="{ 'handle-dragging': draggingHandle?.task.id === task.id && draggingHandle?.type === 'end' }"
                  @mousedown="handleHandleMouseDown($event, task, 'end')"
                ></div>
              </div>
            </div>
          </div>
          
          <div 
            v-if="hiddenTasksCount > 0" 
            class="more-all-day"
            :class="{ collapsed: isAllDaySectionCollapsed }"
            :style="{ 
              left: isAllDaySectionCollapsed ? '64px' : `calc(60px + (100% - 60px) / ${daysCount} * ${moreButtonDayIndex} + 4px)`,
              width: isAllDaySectionCollapsed ? 'calc(100% - 8px)' : `calc((100% - 60px) / ${daysCount} - 16px)`
            }"
            @click="showAllTasks"
          >
            +{{ hiddenTasksCount }} 个任务
          </div>
        </div>
        
        <div ref="daysScrollRef" class="days-scroll">
          <div class="days-grid">
            <div class="time-labels-column">
              <div v-for="hour in 23" :key="hour" class="time-label" :style="{ top: (hour * 48) + 'px' }">
                {{ formatHour(hour) }}
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
            >
              <div
                v-for="hour in 24"
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
              <div
                v-if="getTimedCreateSelectionStyle(day.key)"
                class="timed-create-selection"
                :style="getTimedCreateSelectionStyle(day.key)!"
              ></div>
               
              <div class="timed-tasks-layer">
                <div
                  v-for="item in (tasksByDay.get(day.key) || [])"
                  :key="item.task.id + '-' + item.renderDate"
                  class="timed-task"
                  :class="[
                    `priority-${item.task.priority}`,
                    { 'task-completed': item.task.status === 'completed' },
                    { 'task-dragging': draggingTimedTask?.task.id === item.task.id }
                  ]"
                  :style="getTimedTaskStyle(item)"
                  @mousedown="handleTimedTaskMouseDown($event, item.task, day.key)"
                  @contextmenu="handleContextMenu($event, item.task)"
                >
                  <div 
                    class="timed-task-handle timed-task-handle-top"
                    :class="{ 'handle-dragging': draggingTimedTaskHandle?.task.id === item.task.id && draggingTimedTaskHandle?.type === 'start' }"
                    @mousedown.stop="handleTimedTaskHandleMouseDown($event, item.task, 'start')"
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
                      <span class="task-title-text">{{ stripHtml(item.task.title) }}</span>
                      <span v-if="item.task.priority !== 'none'" class="task-priority-badge" :class="`priority-${item.task.priority}`">
                        <Icon name="flag" width="10" height="10" />
                      </span>
                      <span class="task-jump-btn" @click.stop="handleTaskClick(item.task)">
                        <Icon name="open" width="14" height="14" />
                      </span>
                    </div>
                    <div class="timed-task-time">{{ getTaskTimeRange(item) }}</div>
                  </div>
                  <div 
                    class="timed-task-handle timed-task-handle-bottom"
                    :class="{ 'handle-dragging': draggingTimedTaskHandle?.task.id === item.task.id && draggingTimedTaskHandle?.type === 'end' }"
                    @mousedown.stop="handleTimedTaskHandleMouseDown($event, item.task, 'end')"
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
      :due-date="contextMenuDateDraft.dueDate"
      :repeat-frequency="contextMenuRepeatFrequency"
      @update:startDate="contextMenuDateDraft.startDate = $event"
      @update:dueDate="contextMenuDateDraft.dueDate = $event"
      @setColor="setTaskBackgroundColor(contextMenu.task!, $event)"
      @saveDates="applyTaskDates(contextMenu.task!)"
      @saveRepeatRule="saveTaskRepeatRule(contextMenu.task!, $event)"
      @deleteTask="deleteTask(contextMenu.task!)"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import type { Task } from '@/api';
import { setBlockAttrs, TaskRepository } from '@/api';
import { updateTaskMarkdown } from '@/utils/taskHelpers';
import { stripHtml } from '@/composables/useTaskCommon';
import { formatDate, formatTime, formatHour, getWeekStart, formatChineseDate } from '@/composables/useDateUtils';
import { CALENDAR_CONSTANTS } from '@/composables/useCalendarConstants';
import { useDebouncedSave } from '@/composables/useDebouncedSave';
import { useTaskDrag } from '@/composables/useTaskDrag';
import { useTaskSyncGuard } from '@/composables/useTaskSyncGuard';
import { useTaskLocalMutations } from '@/composables/useTaskLocalMutations';
import { getRepeatSeriesForTask, notifyRepeatChanged, updateRepeatSeriesBackgroundColor, updateRepeatSeriesDates, type RepeatFrequency } from '@/repeatRepository';
import { belongsToRepeatSeries, getDayDiff, isRepeatTask as isRepeatTaskEntity, shiftDate } from '@/utils/repeatTaskUtils';
import Icon from './Icon.vue';
import TaskCheckbox from './TaskCheckbox.vue';
import TaskContextMenu from './TaskContextMenu.vue';

interface Props {
  tasks: Task[];
  fixedDaysCount?: number;
}

interface WeekDay {
  key: string;
  date: Date;
  weekdayName: string;
  dayNumber: number;
  isToday: boolean;
}

interface WeekAllDayTask extends Task {
  startDayOfWeek: number;
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

const emit = defineEmits<{
  'taskDateChanged': [task: Task];
  'taskClick': [task: Task];
  'taskCreateRequested': [payload: { startDate: string; dueDate: string; startTime?: string; dueTime?: string; allDay: boolean }];
}>();

function getTodayStart(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

const currentWeekStart = ref(props.fixedDaysCount === 1 ? getTodayStart() : getWeekStart(new Date()));
const currentTime = ref(new Date());
const isAllDaySectionCollapsed = ref(false);
let timeUpdateInterval: ReturnType<typeof setInterval> | null = null;
const MOBILE_WEEK_BREAKPOINT = 768;
const mobileMiniWeekdayLabels = ['一', '二', '三', '四', '五', '六', '日'];
const mobileWeekdayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const viewportWidth = ref(typeof window === 'undefined' ? 1024 : window.innerWidth);
const daysScrollRef = ref<HTMLElement | null>(null);

const localTasks = ref<Task[]>([]);
const CREATE_SELECTION_THRESHOLD_PX = 8;
const MINUTES_PER_QUARTER = 15;
const QUARTERS_PER_HOUR = 4;
const TOTAL_QUARTERS_PER_DAY = 24 * QUARTERS_PER_HOUR;
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
  patchTask: patchLocalTask
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
} = useTaskDrag(localTasks, emitTaskDateChanged);

const contextMenu = ref<{ show: boolean; x: number; y: number; task: Task | null }>({
  show: false,
  x: 0,
  y: 0,
  task: null
});
const contextMenuDateDraft = ref<{ startDate: string; dueDate: string }>({
  startDate: '',
  dueDate: ''
});
const contextMenuRepeatFrequency = ref<RepeatFrequency>('none');

function normalizeRepeatFrequencyForMenu(frequency: RepeatFrequency | undefined): RepeatFrequency {
  if (
    frequency === 'none'
    || frequency === 'daily'
    || frequency === 'weekdays'
    || frequency === 'weekend'
    || frequency === 'weekly'
  ) {
    return frequency;
  }
  return 'weekly';
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

function resolveTaskBackgroundColor(backgroundColor?: string): string {
  if (!backgroundColor || typeof backgroundColor !== 'string') {
    return 'var(--b3-font-background9)';
  }
  if (/^pinch-background(?:10|[1-9])$/.test(backgroundColor)) {
    return `var(--${backgroundColor})`;
  }
  return `var(--b3-font-${backgroundColor})`;
}

function resolveTaskColorIndex(backgroundColor?: string): number | null {
  if (!backgroundColor || typeof backgroundColor !== 'string') {
    return null;
  }
  const pinchMatch = backgroundColor.match(/^pinch-background(10|[1-9])$/);
  if (pinchMatch) {
    return Number(pinchMatch[1]);
  }
  const legacyMatch = backgroundColor.match(/^background(1[0-3]|[4-9])$/);
  if (legacyMatch) {
    return Number(legacyMatch[1]) - 3;
  }
  return null;
}

function resolveTaskAccentColor(backgroundColor?: string): string {
  const index = resolveTaskColorIndex(backgroundColor) ?? 6;
  return `var(--pinch-color${index})`;
}

const daysCount = ref(7);
const isDaysCountLocked = computed(() => typeof props.fixedDaysCount === 'number' && Number.isFinite(props.fixedDaysCount));
const isMobileWeekGridMode = computed(() => viewportWidth.value <= MOBILE_WEEK_BREAKPOINT && daysCount.value === 7);
const isMobileDayViewMode = computed(() => viewportWidth.value <= MOBILE_WEEK_BREAKPOINT && daysCount.value === 1);

function handleViewportResize(): void {
  viewportWidth.value = window.innerWidth;
  if (viewportWidth.value <= MOBILE_WEEK_BREAKPOINT && !isDaysCountLocked.value && daysCount.value !== 7) {
    daysCount.value = 7;
  }
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

function decreaseDays() {
  if (isDaysCountLocked.value) return;
  if (daysCount.value > CALENDAR_CONSTANTS.LAYOUT.MIN_DAYS) {
    daysCount.value--;
  }
}

function increaseDays() {
  if (isDaysCountLocked.value) return;
  if (daysCount.value < CALENDAR_CONSTANTS.LAYOUT.MAX_DAYS) {
    daysCount.value++;
  }
}

function getTasksHash(tasks: Task[]): string {
  return tasks.map(t => 
    `${t.id}:${t.status}:${t.priority}:${t.startDate}:${t.dueDate}:${t.startTime}:${t.dueTime}:${t.title}:${t.backgroundColor || ''}`
  ).sort().join('|');
}

watch(() => props.tasks, (newTasks) => {
  taskSyncGuard.syncTasks(newTasks, isDragging.value, getTasksHash);
}, { deep: true, immediate: true });

const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

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

const weekTitle = computed(() => {
  const start = new Date(currentWeekStart.value);
  const end = new Date(start);
  end.setDate(start.getDate() + daysCount.value - 1);

  if (daysCount.value === 1) {
    return formatChineseDate(start);
  }
  return `${formatChineseDate(start)} - ${formatChineseDate(end)}`;
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
      weekdayName: weekdays[dayOfWeek],
      dayNumber: date.getDate(),
      isToday: date.getTime() === today.getTime()
    });
  }
  
  return days;
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

  return mobileMiniWeekdayLabels.map((label, index) => {
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
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  currentWeekStart.value = nextDate;
  isAllDaySectionCollapsed.value = false;
  window.requestAnimationFrame(() => {
    daysScrollRef.value?.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

const mobileWeekStartDate = computed(() => {
  const mondayStart = new Date(currentWeekStart.value);
  mondayStart.setHours(0, 0, 0, 0);
  mondayStart.setDate(mondayStart.getDate() + 1);
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
      weekdayName: mobileWeekdayNames[i],
      dayNumber: date.getDate(),
      isToday: date.getTime() === today
    });
  }

  return days;
});

const mobileWeekDayKeySet = computed(() => new Set(mobileWeekDays.value.map(day => day.key)));

const displayWeekTitle = computed(() => {
  if (!isMobileWeekGridMode.value) {
    return weekTitle.value;
  }
  const start = new Date(mobileWeekStartDate.value);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${formatChineseDate(start)} - ${formatChineseDate(end)}`;
});

const mobileCalendarTitle = computed(() => {
  const date = mobileWeekStartDate.value;
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
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
  const monday = getMondayStart(date);
  const anchor = new Date(monday);
  anchor.setDate(anchor.getDate() - 1);
  currentWeekStart.value = anchor;
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

  return stripHtml(a.title).localeCompare(stripHtml(b.title), 'zh-Hans-CN');
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
  return {
    backgroundColor: resolveTaskBackgroundColor(task.backgroundColor),
    '--pinch-task-chip-color': resolveTaskAccentColor(task.backgroundColor)
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

const normalizedTaskRanges = computed(() => {
  const { weekStart, weekEnd } = weekBounds.value;
  return localTasks.value.flatMap((task) => {
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
});

const weekTasks = computed<WeekAllDayTask[]>(() => {
  const { weekStart, weekEnd } = weekBounds.value;
  return normalizedTaskRanges.value
    .filter(range => !range.isTimed)
    .map(({ task, startDate, endDate }) => {
      const displayStart = startDate < weekStart ? weekStart : startDate;
      const displayEnd = endDate > weekEnd ? weekEnd : endDate;

      const startDayOffset = Math.floor((displayStart.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000));
      const endDayOffset = Math.floor((displayEnd.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000));

      return {
        ...task,
        startDayOfWeek: Math.max(0, startDayOffset),
        spanDays: Math.min(daysCount.value - 1, endDayOffset) - Math.max(0, startDayOffset) + 1,
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

const maxVisibleTasks = computed(() => {
  return 3;
});

const allDaySectionHeight = computed(() => {
  const maxPosition = Math.max(0, ...Array.from(taskPositionsMap.value.values()));
  const visibleRows = Math.min(maxPosition + 1, maxVisibleTasks.value);
  return CALENDAR_CONSTANTS.LAYOUT.ALL_DAY_HEADER_HEIGHT + visibleRows * CALENDAR_CONSTANTS.LAYOUT.TASK_CHIP_HEIGHT + CALENDAR_CONSTANTS.LAYOUT.ALL_DAY_PADDING;
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

function getVisibleTaskPosition(task: WeekAllDayTask): number {
  return taskPositionsMap.value.get(task.id) || 0;
}

function getAllDayTaskStyle(task: WeekAllDayTask) {
  const leftPercent = (task.startDayOfWeek / daysCount.value) * 100;
  const widthPercent = (task.spanDays / daysCount.value) * 100;

  const position = getVisibleTaskPosition(task);

  const bgColor = resolveTaskBackgroundColor(task.backgroundColor);

  return {
    position: 'absolute' as const,
    left: `${leftPercent}%`,
    width: `calc(${widthPercent}% - 30px)`,
    top: `${CALENDAR_CONSTANTS.LAYOUT.TASK_TOP_OFFSET + position * CALENDAR_CONSTANTS.LAYOUT.TASK_CHIP_HEIGHT}px`,
    height: '16px',
    backgroundColor: bgColor,
    '--pinch-task-chip-color': resolveTaskAccentColor(task.backgroundColor)
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date(currentWeekStart.value);
  weekStart.setHours(0, 0, 0, 0);

  const dayOffset = Math.floor((today.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000));
  const inRange = dayOffset >= 0 && dayOffset < daysCount.value;

  return { top, dayOffset, inRange };
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
  const offsetDays = isDaysCountLocked.value && daysCount.value === 1 ? 1 : 7;
  const newDate = new Date(currentWeekStart.value);
  newDate.setDate(newDate.getDate() - offsetDays);
  currentWeekStart.value = newDate;
}

function nextWeek() {
  const offsetDays = isDaysCountLocked.value && daysCount.value === 1 ? 1 : 7;
  const newDate = new Date(currentWeekStart.value);
  newDate.setDate(newDate.getDate() + offsetDays);
  currentWeekStart.value = newDate;
}

function goToToday() {
  if (isMobileWeekGridMode.value && daysCount.value === 7) {
    focusMobileWeek(getTodayStart());
    return;
  }
  currentWeekStart.value = isDaysCountLocked.value && daysCount.value === 1 ? getTodayStart() : getWeekStart(new Date());
}

function toggleAllDaySection() {
  isAllDaySectionCollapsed.value = !isAllDaySectionCollapsed.value;
}

function showAllTasks() {
  isAllDaySectionCollapsed.value = false;
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

  const deltaDays = getDayDiff(series.startDate, payload.targetDate);
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

async function handleDrop(day: WeekDay) {
  clearWeekDragOverState();

  const task = getDraggedTaskFromWindowEvent();
  if (!task) return;

  try {
    const dateStr = formatDate(day.date);
    const hasBackgroundColor = typeof task.backgroundColor === 'string' && task.backgroundColor.trim().length > 0;
    const assignedBackgroundColor = hasBackgroundColor ? undefined : pickRandomTaskBackgroundColor();
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

async function handleDropOnHourCell(day: WeekDay, hour: number) {
  clearWeekDragOverState();

  const task = getDraggedTaskFromWindowEvent();
  if (!task) return;

  try {
    const actualHour = hour - 1;
    const date = new Date(day.date);
    date.setHours(actualHour, 0, 0, 0);
    
    const startDate = formatDate(date);
    const startTime = formatTime(date);
    const dueDate = formatDate(date);
    const dueTime = formatTime(new Date(date.getTime() + 60 * 60 * 1000));
    const hasBackgroundColor = typeof task.backgroundColor === 'string' && task.backgroundColor.trim().length > 0;
    const assignedBackgroundColor = hasBackgroundColor ? undefined : pickRandomTaskBackgroundColor();

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

  return {
    top: `${fromQuarter * quarterHeight}px`,
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
  return Math.floor(offsetY / (CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT / QUARTERS_PER_HOUR));
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

const tasksByDay = computed(() => {
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

  for (const day of weekDays.value) {
    const dayItems = grouped.get(day.key) || [];
    grouped.set(day.key, assignTimedTaskLanes(dayItems));
  }
  
  return grouped;
});

function getTimedTaskStyle(item: TimedTaskRenderItem) {
  const startTime = item.renderStartTime;
  const endTime = item.renderDueTime;
  
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  const top = startMinutes * CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT / 60;
  const height = Math.max(CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT, (endMinutes - startMinutes) * CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT / 60);

  const bgColor = resolveTaskBackgroundColor(item.task.backgroundColor);

  const laneCount = Math.max(1, item.laneCount || 1);
  const laneIndex = Math.min(Math.max(0, item.laneIndex || 0), laneCount - 1);
  const laneGap = 4;
  const horizontalInset = 10;
  const totalGap = (laneCount - 1) * laneGap;
  
  const style: Record<string, string> = {
    top: `${top}px`,
    height: `${height}px`,
    backgroundColor: bgColor
  };

  if (laneCount === 1) {
    style.left = '4px';
    style.right = '4px';
    return style;
  }

  const laneWidth = `calc((100% - ${horizontalInset}px - ${totalGap}px) / ${laneCount})`;
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

async function toggleTaskStatus(task: Task) {
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

function handleTaskClick(task: Task) {
  emit('taskClick', task);
}

function handleContextMenu(event: MouseEvent, task: Task) {
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
    dueDate: task.dueDate || ''
  };
  contextMenuRepeatFrequency.value = normalizeRepeatFrequencyForMenu(task.repeatFrequency as RepeatFrequency | undefined);

  const isRepeatTask = !!task.repeatSeriesId || (!!task.repeatFrequency && task.repeatFrequency !== 'none');
  if (isRepeatTask) {
    getRepeatSeriesForTask(task)
      .then((series) => {
        if (!series) return;
        if (contextMenu.value.task?.id !== task.id) return;
        contextMenuDateDraft.value = {
          startDate: series.startDate || '',
          dueDate: series.endDate || ''
        };
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

  document.addEventListener('click', hideContextMenu, { once: true });
}

function hideContextMenu() {
  contextMenu.value = {
    show: false,
    x: 0,
    y: 0,
    task: null
  };
  contextMenuDateDraft.value = { startDate: '', dueDate: '' };
  contextMenuRepeatFrequency.value = 'none';
}

async function applyTaskDates(task: Task) {
  if (!task) return;

  const nextStartDate = contextMenuDateDraft.value.startDate || null;
  let nextDueDate = contextMenuDateDraft.value.dueDate || null;
  if (nextStartDate && nextDueDate && nextDueDate < nextStartDate) {
    nextDueDate = nextStartDate;
  }

  const isRepeatTask = !!task.repeatSeriesId || (!!task.repeatFrequency && task.repeatFrequency !== 'none');
  if (isRepeatTask) {
    const updatedSeries = await updateRepeatSeriesDates(
      task,
      nextStartDate,
      nextDueDate,
      undefined,
      { emitChange: false }
    );
    if (updatedSeries) {
      const seriesId = task.repeatSeriesId;
      const templateTask = !task.isVirtual
        ? task
        : localTasks.value.find(item => !item.isVirtual && !!seriesId && item.repeatSeriesId === seriesId);
      if (templateTask) {
        const updatedTask = patchLocalTask(templateTask.id, {
          startDate: updatedSeries.startDate || null,
          dueDate: updatedSeries.endDate || null
        });
        if (updatedTask) {
          emitTaskDateChanged(updatedTask);
        }
        if (templateTask.type === 'block' && templateTask.blockId) {
          try {
            await setBlockAttrs(templateTask.blockId, {
              'custom-task-start-date': updatedSeries.startDate || '',
              'custom-task-due-date': updatedSeries.endDate || ''
            });
          } catch (error) {
          }
        }
        notifyRepeatChanged({
          blockId: templateTask.blockId,
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
    dueDate: nextDueDate
  });
  if (updatedTask) {
    emitTaskDateChanged(updatedTask);
  }

  if (task.type === 'block' && task.blockId) {
    try {
      await setBlockAttrs(task.blockId, {
        'custom-task-start-date': nextStartDate || '',
        'custom-task-due-date': nextDueDate || ''
      });
    } catch (error) {
    }
  }

  hideContextMenu();
}

async function saveTaskRepeatRule(task: Task, frequency: RepeatFrequency) {
  if (!task) return;
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
    await TaskRepository.setTaskRepeatRule(task, frequency);
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

async function deleteTask(task: Task) {
  const seriesId = task.repeatSeriesId;
  const isRepeatTask = !!seriesId || (!!task.repeatFrequency && task.repeatFrequency !== 'none');

  if (isRepeatTask) {
    const templateTask = !task.isVirtual
      ? task
      : localTasks.value.find(item => !item.isVirtual && !!seriesId && item.repeatSeriesId === seriesId);

    try {
      await TaskRepository.setTaskRepeatRule(templateTask || task, 'none');
    } catch (error) {
    }

    if (seriesId) {
      localTasks.value = localTasks.value.filter(
        item => !(item.isVirtual && item.repeatSeriesId === seriesId)
      );
    }

    const targetTask = templateTask || (!task.isVirtual ? task : null);
    if (targetTask) {
      if (targetTask.type === 'block' && targetTask.blockId) {
        try {
          await setBlockAttrs(targetTask.blockId, {
            'custom-task-start-date': '',
            'custom-task-due-date': '',
            'custom-task-start-time': '',
            'custom-task-due-time': ''
          });
        } catch (error) {
        }
      }

      const updatedTask = patchLocalTask(targetTask.id, {
        startDate: null,
        dueDate: null,
        startTime: undefined,
        dueTime: undefined,
        repeatFrequency: 'none',
        repeatSeriesId: undefined,
        repeatInstanceDate: undefined,
        isVirtual: false
      });
      if (updatedTask) {
        emitTaskDateChanged(updatedTask);
      }
    }

    hideContextMenu();
    return;
  }

  if (task.type === 'block' && task.blockId) {
    try {
      await setBlockAttrs(task.blockId, {
        'custom-task-start-date': '',
        'custom-task-due-date': '',
        'custom-task-start-time': '',
        'custom-task-due-time': ''
      });
      const updatedTask = patchLocalTask(task.id, {
        startDate: null,
        dueDate: null,
        startTime: undefined,
        dueTime: undefined
      });
      if (updatedTask) {
        emitTaskDateChanged(updatedTask);
      }
    } catch (error) {
    }
  }
  hideContextMenu();
}

onMounted(() => {
  handleViewportResize();
  timeUpdateInterval = setInterval(() => {
    currentTime.value = new Date();
  }, 60000);
  window.addEventListener('resize', handleViewportResize);
  document.addEventListener('mousemove', handleCreateSelectionMouseMove);
  document.addEventListener('mouseup', finishCreateSelection);
  document.addEventListener('dragend', clearWeekDragOverState, true);
  document.addEventListener('drop', clearWeekDragOverState, true);
});

onUnmounted(() => {
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval);
  }
  window.removeEventListener('resize', handleViewportResize);
  document.removeEventListener('mousemove', handleCreateSelectionMouseMove);
  document.removeEventListener('mouseup', finishCreateSelection);
  document.removeEventListener('dragend', clearWeekDragOverState, true);
  document.removeEventListener('drop', clearWeekDragOverState, true);
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

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding:4px 10px;
  background: var(--b3-theme-surface);
  border-bottom: 1px solid var(--b3-theme-border);
}

.nav-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: var(--b3-theme-background);
  border-radius: 4px;
  cursor: pointer;
  color: var(--b3-theme-on-background);
  transition: background-color 0.2s;
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
  background: var(--b3-font-background9);
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
  border-bottom: 1px solid var(--b3-border-color);
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
  background: var(--b3-theme-background);
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
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 6px;
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
  transition: transform 0.2s;
}

.collapse-btn.collapsed {
  transform: rotate(-90deg);
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
  background-color: var(--b3-font-background9);
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

.all-day-task:hover {
  background: var(--b3-list-hover);
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

.task-handle-left {
  left: 0;
}

.task-handle-right {
  right: 0;
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

.all-day-task.task-completed {
  opacity: 0.6;
}

.all-day-task.task-completed .task-chip-title {
  text-decoration: line-through;
}

.more-all-day {
  position: absolute;
  bottom: 4px;
  padding: 2px 4px;
  border-radius: 6px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-surface);
  font-size: 10px;
  font-weight: 500;
  cursor: pointer;
  pointer-events: auto;
  text-align: center;
  border: 1px dashed var(--b3-border-color);
  transition: background-color 0.2s;
}

.more-all-day.collapsed {
  left: 4px;
}

.more-all-day:hover {
  background: var(--b3-font-background2);
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

.timed-task {
  position: absolute;
  left: 4px;
  right: 4px;
  padding: 0;
  border-radius: 6px;
  font-size: 11px;
  background: var(--b3-font-background9);
  border-left: 2px solid transparent;
  pointer-events: auto;
  overflow: hidden;
  cursor: default;
  display: flex;
  flex-direction: column;
  transition: background-color 0.15s;
}

.timed-task-handle {
  position: absolute;
  left: 0;
  right: 0;
  height: 6px;
  cursor: ns-resize;
  transition: background 0.2s;
  z-index: 10;
}


.timed-task-handle-top {
  top: 0;
  border-top: 2px solid transparent;
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
}


.timed-task-handle-bottom {
  bottom: 0;
  border-bottom: 2px solid transparent;
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
}


.timed-task-content {
  padding: 4px 6px;
  min-height: 20px;
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

@media (max-width: 768px) {
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
  .task-title-text {
    font-size: 9px;
  }

  .time-label {
    font-size: 9px;
  }

  .timed-task {
    font-size: 9px;
  }

  .timed-task-content {
    padding: 3px 4px;
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

  .current-time-label {
    font-size: 9px;
    padding: 1px 4px;
  }
}

</style>
