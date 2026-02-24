<template>
  <div class="month-view">
    <div class="calendar-container">
      <div class="calendar-header">
        <button class="nav-btn" @click="previousMonth">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
          </svg>
        </button>
        <div class="month-title">{{ monthTitle }}</div>
        <button class="nav-btn" @click="nextMonth">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
          </svg>
        </button>
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
                @drop="handleDrop(day)"
              >
                <div class="day-info">
                  <div class="day-number">{{ day.dayNumber }}</div>
                  <div 
                    v-if="day.lunarInfo" 
                    class="day-lunar"
                    :class="{ 
                      'festival': day.lunarInfo.isFestival,
                      'term': day.lunarInfo.isTerm 
                    }"
                  >
                    {{ day.lunarInfo.isFestival ? (day.lunarInfo.lunarFestival || day.lunarInfo.festival) : (day.lunarInfo.isTerm ? day.lunarInfo.term : day.lunarInfo.dayCn) }}
                  </div>
                </div>
                <div 
                  v-if="shouldShowHiddenCountForDay(day, week)"
                  class="more-tasks-placeholder day-more"
                >
                  +{{ getTotalHiddenTaskCountForWeek(week) }} 个任务
                </div>
              </div>
            </div>
            <div class="week-tasks-layer">
              <div 
                v-for="task in getVisibleTasksForWeek(week)" 
                :key="task.id"
                class="task-chip"
                :class="{ 'task-completed': task.status === 'completed' }"
                :style="getTaskStyle(task, week)"
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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type { Task } from '@/api';
import { setBlockAttrs, TaskRepository } from '@/api';
import { updateTaskMarkdown } from '@/utils/taskHelpers';
import { stripHtml } from '@/composables/useTaskCommon';
import { useTaskDrag } from '@/composables/useTaskDrag';
import { useTaskSyncGuard } from '@/composables/useTaskSyncGuard';
import { useTaskLocalMutations } from '@/composables/useTaskLocalMutations';
import { getRepeatSeriesForTask, updateRepeatSeriesDates, type RepeatFrequency } from '@/repeatRepository';
import solarLunar from '@/utils/solarLunar.js';
import Icon from './Icon.vue';
import TaskCheckbox from './TaskCheckbox.vue';
import TaskContextMenu from './TaskContextMenu.vue';

interface Props {
  tasks: Task[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  taskDateChanged: [task: Task];
  taskClick: [task: Task];
  taskCreateRequested: [payload: { startDate: string; dueDate: string; allDay: boolean }];
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
const dragOverDay = ref<string | null>(null);

let dragOverDayUpdateTimer: ReturnType<typeof setTimeout> | null = null;
let pendingDragOverDay: string | null = null;

const localTasks = ref<Task[]>([]);
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

const pendingDeletion = ref(new Set<string>());
const weekRowHeights = ref<Record<string, number>>({});
const taskSyncGuard = useTaskSyncGuard(localTasks);
const {
  upsertTask: upsertLocalTask,
  patchTask: patchLocalTask,
  removeTask: removeLocalTask
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

const {
  draggingHandle,
  draggingTask,
  isDragging,
  handleHandleMouseDown,
  handleTaskMouseDown,
  removeEventListeners
} = useTaskDrag(localTasks, (task) => {
  if (pendingDeletion.value.has(task.id)) {
    pendingDeletion.value.delete(task.id);
  }
  emitTaskDateChanged(task);
});

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

const backgroundColors = [
  { value: 'background4', css: 'var(--b3-font-background4)' },
  { value: 'background5', css: 'var(--b3-font-background5)' },
  { value: 'background6', css: 'var(--b3-font-background6)' },
  { value: 'background7', css: 'var(--b3-font-background7)' },
  { value: 'background8', css: 'var(--b3-font-background8)' },
  { value: 'background9', css: 'var(--b3-font-background9)' },
  { value: 'background10', css: 'var(--b3-font-background10)' },
  { value: 'background11', css: 'var(--b3-font-background11)' },
  { value: 'background12', css: 'var(--b3-font-background12)' },
  { value: 'background13', css: 'var(--b3-font-background13)' }
];

function getTasksHash(tasks: Task[]): string {
  return tasks.map(t => 
    `${t.id}:${t.status}:${t.priority}:${t.startDate}:${t.dueDate}:${t.title}`
  ).sort().join('|');
}

function getTaskDateRangeForRender(task: Task): { taskStart: Date; taskEnd: Date } | null {
  const startValue = task.startDate || task.dueDate;
  if (!startValue) return null;

  const taskStart = new Date(startValue);
  taskStart.setHours(0, 0, 0, 0);

  const isRepeatTask = !!task.repeatSeriesId || (!!task.repeatFrequency && task.repeatFrequency !== 'none');
  const endValue = isRepeatTask ? startValue : (task.dueDate || startValue);
  const taskEnd = new Date(endValue);
  taskEnd.setHours(23, 59, 59, 999);

  return { taskStart, taskEnd };
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

watch(() => props.tasks, (newTasks) => {
  taskSyncGuard.syncTasks(newTasks, isDragging.value, getTasksHash);
}, { deep: true, immediate: true });

const visibleCalendarRange = computed(() => {
  const start = new Date(baseDate.value);
  start.setHours(0, 0, 0, 0);
  const dayOfWeek = start.getDay();
  start.setDate(start.getDate() - dayOfWeek);

  const end = new Date(start);
  end.setDate(start.getDate() + 41);
  end.setHours(23, 59, 59, 999);

  return { start, end };
});

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

  return ranges;
});

const taskPositionsMap = computed(() => {
  const positionMap = new Map<string, number>();
  const dailyPositionSlots = new Map<string, number[]>();
  
  const sortedRanges = [...normalizedTaskRanges.value]
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

const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

const monthTitle = computed(() => {
  const startDate = new Date(baseDate.value);
  startDate.setHours(0, 0, 0, 0);
  const dayOfWeek = startDate.getDay();
  startDate.setDate(startDate.getDate() - dayOfWeek);
  
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 41);
  
  const formatMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return `${year}年${month}月`;
  };
  
  const startMonth = formatMonth(startDate);
  const endMonth = formatMonth(endDate);
  
  if (startMonth === endMonth) {
    return startMonth;
  } else {
    return `${startMonth} - ${endMonth}`;
  }
});

const calendarDays = computed(() => {
  const days = [];
  
  const startDate = new Date(baseDate.value);
  startDate.setHours(0, 0, 0, 0);
  const dayOfWeek = startDate.getDay();
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

type WeekTask = Task & {
  startDayOfWeek: number;
  endDayOfWeek: number;
  spanDays: number;
  position: number;
};

type WeekRenderData = {
  tasks: WeekTask[];
  visibleTasks: WeekTask[];
  hiddenCount: number;
  earliestHiddenDateMs: number | null;
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
    
    for (const range of normalizedTaskRanges.value) {
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

const TASK_CHIP_HEIGHT = 24;
const TOP_OFFSET = 30;

function getWeekKey(week: any[]): string {
  return week.map((d: any) => d.key).join('-');
}

function getMaxVisibleTasksForWeek(week: any[]): number {
  const weekKey = getWeekKey(week);
  const rowHeight = weekRowHeights.value[weekKey];
  if (!rowHeight) return 3;

  const DATE_NUMBER_HEIGHT = 30;
  const MORE_LABEL_HEIGHT = 20;
  const SLOT_HEIGHT = 24;

  const count = Math.floor((rowHeight - DATE_NUMBER_HEIGHT - MORE_LABEL_HEIGHT) / SLOT_HEIGHT);
  
  return Math.max(1, count);
}

const weekRenderDataMap = computed(() => {
  const map = new Map<string, WeekRenderData>();

  for (const week of calendarWeeks.value) {
    const weekKey = getWeekKey(week);
    const tasks = weeklyTasks.value.get(weekKey) || [];
    const maxTasks = getMaxVisibleTasksForWeek(week);

    const visibleTasks = tasks.filter(task => task.position < maxTasks);
    const hiddenTasks = tasks.filter(task => task.position >= maxTasks);

    let earliestHiddenDateMs: number | null = null;
    if (hiddenTasks.length > 0) {
      for (const task of hiddenTasks) {
        const time = new Date(task.startDate || task.dueDate!).setHours(0, 0, 0, 0);
        if (earliestHiddenDateMs === null || time < earliestHiddenDateMs) {
          earliestHiddenDateMs = time;
        }
      }
    }

    map.set(weekKey, {
      tasks,
      visibleTasks,
      hiddenCount: hiddenTasks.length,
      earliestHiddenDateMs
    });
  }

  return map;
});

function getVisibleTasksForWeek(week: any[]): WeekTask[] {
  const weekKey = getWeekKey(week);
  return weekRenderDataMap.value.get(weekKey)?.visibleTasks || [];
}

function getTotalHiddenTaskCountForWeek(week: any[]): number {
  const weekKey = getWeekKey(week);
  return weekRenderDataMap.value.get(weekKey)?.hiddenCount || 0;
}

function shouldShowHiddenCountForDay(day: any, week: any[]): boolean {
  const weekKey = getWeekKey(week);
  const weekData = weekRenderDataMap.value.get(weekKey);
  if (!weekData) return false;

  const totalHidden = weekData.hiddenCount;
  if (totalHidden === 0) return false;

  if (weekData.earliestHiddenDateMs === null) return false;
  const currentDateMs = new Date(day.date).setHours(0, 0, 0, 0);
  return currentDateMs === weekData.earliestHiddenDateMs;
}

function getTaskStyle(task: any, week: any[]) {
  const weekStart = new Date(week[0].date);
  weekStart.setHours(0, 0, 0, 0);
  
  const leftPercent = (task.startDayOfWeek / 7) * 100;
  const widthPercent = (task.spanDays / 7) * 100;
  const bgColor = task.backgroundColor 
    ? `var(--b3-font-${task.backgroundColor})` 
    : 'var(--b3-font-background9)';
  
  const position = task.position ?? (taskPositionsMap.value.get(task.id) ?? 0);
  
  return {
    position: 'absolute' as const,
    left: `${leftPercent}%`,
    width: `calc(${widthPercent}% - 30px)`,
    top: `${TOP_OFFSET + position * TASK_CHIP_HEIGHT}px`,
    height: '16px',
    backgroundColor: bgColor
  };
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

function handleDrop(day: any) {
  clearDragOverState();
  
  if (day.isOtherMonth) return;
  
  const event = window.event as DragEvent;
  const taskData = event?.dataTransfer?.getData('application/json');
  
  if (!taskData) return;
  
  try {
    const task = JSON.parse(taskData) as Task;
    const dateStr = formatDate(day.date);
    
    if (pendingDeletion.value.has(task.id)) {
      pendingDeletion.value.delete(task.id);
    }
    
    const updatedTask = upsertLocalTask(task, {
      startDate: dateStr,
      dueDate: dateStr
    });
    emitTaskDateChanged(updatedTask);
    
    if (task.type === 'block' && task.blockId) {
      setBlockAttrs(task.blockId, {
        'custom-task-start-date': dateStr,
        'custom-task-due-date': dateStr
      }).catch(() => {});
    }
  } catch (error) {
    console.error('[MonthView] handleDrop error', error);
  }
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function previousMonth() {
  baseDate.value = new Date(baseDate.value.getFullYear(), baseDate.value.getMonth() - 1, 1);
}

function nextMonth() {
  baseDate.value = new Date(baseDate.value.getFullYear(), baseDate.value.getMonth() + 1, 1);
}

function handleWheel(event: WheelEvent) {
  event.preventDefault();
  
  const daysToScroll = event.deltaY > 0 ? 7 : -7;
  const newDate = new Date(baseDate.value);
  newDate.setDate(newDate.getDate() + daysToScroll);
  
  baseDate.value = newDate;
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
}

function handleGlobalClick(event: MouseEvent) {
  const menu = document.querySelector('.context-menu');
  if (menu && !menu.contains(event.target as Node)) {
    hideContextMenu();
  }
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
    const updatedSeries = await updateRepeatSeriesDates(task, nextStartDate, nextDueDate);
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
      const virtualTaskIds = localTasks.value
        .filter(item => item.isVirtual && item.repeatSeriesId === seriesId)
        .map(item => item.id);
      virtualTaskIds.forEach((id) => {
        pendingDeletion.value.add(id);
        removeLocalTask(id);
      });
    }

    const targetTask = templateTask || (!task.isVirtual ? task : null);
    if (targetTask) {
      pendingDeletion.value.add(targetTask.id);
      removeLocalTask(targetTask.id);

      const updatedTask = {
        ...targetTask,
        startDate: null,
        dueDate: null,
        startTime: undefined,
        dueTime: undefined,
        repeatFrequency: 'none',
        repeatSeriesId: undefined,
        repeatInstanceDate: undefined,
        isVirtual: false
      };
      emitTaskDateChanged(updatedTask);

      if (targetTask.type === 'block' && targetTask.blockId) {
        setBlockAttrs(targetTask.blockId, {
          'custom-task-start-date': '',
          'custom-task-due-date': '',
          'custom-task-start-time': '',
          'custom-task-due-time': ''
        }).catch(() => {});
      }
    }

    hideContextMenu();
    return;
  }

  pendingDeletion.value.add(task.id);
  
  removeLocalTask(task.id);
  
  const updatedTask = {
    ...task,
    startDate: null,
    dueDate: null,
    startTime: undefined,
    dueTime: undefined
  };
  
  emitTaskDateChanged(updatedTask);
  
  hideContextMenu();
  
  if (task.type === 'block' && task.blockId) {
    setBlockAttrs(task.blockId, {
      'custom-task-start-date': '',
      'custom-task-due-date': '',
      'custom-task-start-time': '',
      'custom-task-due-time': ''
    }).catch(() => {});
  }
}

async function setTaskBackgroundColor(task: Task, color: string) {
  patchLocalTask(task.id, { backgroundColor: color });

  if (task.type === 'block' && task.blockId) {
    try {
      await setBlockAttrs(task.blockId, {
        'custom-task-background-color': color
      });
    } catch (error) {
      // setTaskBackgroundColor error
    }
  }
}


function updateWeekRowHeights() {
  const weeksContainer = document.querySelector('.weeks-container');
  if (!weeksContainer) return;
  
  const weekRows = Array.from(weeksContainer.querySelectorAll('.week-row'));
  const newHeights: Record<string, number> = {};
  
  weekRows.forEach((row) => {
    const height = row.getBoundingClientRect().height;
    const days = Array.from(row.querySelectorAll('.day-cell'));
    const weekKey = days.map(d => d.getAttribute('data-day-key')).filter(Boolean).join('-');
    if (weekKey) {
      newHeights[weekKey] = height;
    }
  });
  
  weekRowHeights.value = newHeights;
}

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  const container = document.querySelector('.month-view');
  if (container) {
    eventManager.add(container as HTMLElement, 'wheel', handleWheel, 'wheel');
  }
  eventManager.add(document, 'click', handleGlobalClick, 'globalClick');
  eventManager.add(document, 'mousemove', handleCreateSelectionMouseMove as EventListener, 'createSelectionMousemove');
  eventManager.add(document, 'mouseup', finishCreateSelection as EventListener, 'createSelectionMouseup');
  eventManager.add(document, 'dragend', clearDragOverState as EventListener, 'dragCleanup');
  eventManager.add(document, 'drop', clearDragOverState as EventListener, 'dragCleanup');

  updateWeekRowHeights();

  const weeksContainer = document.querySelector('.weeks-container');
  if (weeksContainer) {
    resizeObserver = new ResizeObserver(() => {
      updateWeekRowHeights();
    });
    resizeObserver.observe(weeksContainer as Element);
  }
});

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

function handleTaskClick(task: Task) {
  emit('taskClick', task);
}

onUnmounted(() => {
  taskSyncGuard.clearAllTaskSyncLocks();
  removeEventListeners();

  eventManager.clear();

  clearDragOverState();

  if (resizeObserver) {
    resizeObserver.disconnect();
  }
  
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
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.calendar-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--b3-theme-background);
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 10px;
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

.month-title {
  font-size: 18px;
  font-weight: 500;
  color: var(--b3-theme-on-background);
}

.calendar-grid {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
  overflow-y: auto;
  gap: 1px;
  background-color: var(--b3-list-hover);
}

.week-row {
  position: relative;
  flex: 1;
  min-height: 0;
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


.day-cell.drag-over {
  background: var(--b3-font-color2-1, #e3f2fd);
  border: 2px dashed var(--b3-font-color2, #1976d2);
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

.task-chip:hover {
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
  background: #fee2e2;
  color: #dc2626;
}

.task-priority-badge.priority-medium {
  background: #fef3c7;
  color: #d97706;
}

.task-priority-badge.priority-low {
  background: #dbeafe;
  color: #2563eb;
}

.placeholder-text {
  font-size: 11px;
  color: var(--b3-theme-on-surface);
  opacity: 0.4;
  text-align: center;
  padding: 8px 4px;
  font-style: italic;
}

.more-tasks-placeholder {
  position: absolute;
  left: 32px;
  right: 6px;
  padding: 3px 6px;
  border-radius: 6px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-surface);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  pointer-events: auto;
  text-align: center;
  border: 1px dashed var(--b3-border-color);
  transition: background-color 0.2s;
}

.more-tasks-placeholder:hover {
  background: var(--b3-font-background2);
}

.more-tasks-placeholder.day-more {
  left: 4px;
  right: 4px;
  bottom: 4px;
  top: auto;
  font-size: 10px;
  padding: 2px 4px;
}

</style>





