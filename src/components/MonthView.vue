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
                class="day-cell"
                :data-day-key="day.key"
                :class="{
                  'other-month': day.isOtherMonth,
                  'today': day.isToday,
                  'drag-over': dragOverDay === day.key
                }"
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
                :key="`${task.id}-${tasksVersion}`"
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
    
    <div
      v-if="contextMenu.show"
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @click.stop
    >
      <div class="context-menu-section">
        <div class="context-menu-title">背景色</div>
        <div class="task-color-picker">
          <div
            v-for="color in backgroundColors"
            :key="color.value"
            class="color-option"
            :class="{ selected: contextMenu.task?.backgroundColor === color.value }"
            :style="{ backgroundColor: color.css }"
            @click="setTaskBackgroundColor(contextMenu.task!, color.value)"
          ></div>
        </div>
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item delete-item" @click="deleteTask(contextMenu.task!)">
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
        <span>移除日期</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type { Task } from '@/api';
import { setBlockAttrs } from '@/api';
import { stripHtml } from '@/composables/useTaskCommon';
import solarLunar from '@/utils/solarLunar.js';
import Icon from './Icon.vue';

interface Props {
  tasks: Task[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  taskDateChanged: [task: Task];
  taskClick: [task: Task];
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
const draggingHandle = ref<{ 
  task: Task; 
  type: 'start' | 'end'; 
  originalDate: string;
  finalDate: string | null;
} | null>(null);
const draggingTask = ref<{
  task: Task;
  originalStart: string;
  originalDue: string | null;
  finalStartDate: string | null;
  finalDueDate: string | null;
} | null>(null);

const dragLastUpdatedDate = ref('');
const isDragging = ref(false);

let dragOverDayUpdateTimer: ReturnType<typeof setTimeout> | null = null;
let pendingDragOverDay: string | null = null;

let dragEndCooldownTimer: ReturnType<typeof setTimeout> | null = null;

const localTasks = ref<Task[]>([]);
const tasksVersion = ref(0);
const pendingUpdates = ref<Map<string, Record<string, string>>>(new Map());
const saveTimer = ref<ReturnType<typeof setTimeout> | null>(null);
const contextMenu = ref<{ show: boolean; x: number; y: number; task: Task | null }>({
  show: false,
  x: 0,
  y: 0,
  task: null
});

const pendingDeletion = ref(new Set<string>());
const weekRowHeights = ref<Record<string, number>>({});

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

let lastTasksHash = '';

function getTasksHash(tasks: Task[]): string {
  return tasks.map(t => 
    `${t.id}:${t.status}:${t.priority}:${t.startDate}:${t.dueDate}:${t.title}`
  ).sort().join('|');
}

watch(() => props.tasks, (newTasks) => {
  if (isDragging.value) return;
  if (dragEndCooldownTimer !== null) return;
  
  const newHash = getTasksHash(newTasks);
  if (newHash === lastTasksHash) return;
  
  lastTasksHash = newHash;
  localTasks.value = [...newTasks];
}, { deep: true, immediate: true });

const taskPositionsMap = computed(() => {
  const positionMap = new Map<string, number>();
  const dailyPositionSlots = new Map<string, number[]>();
  
  const sortedTasks = [...localTasks.value]
    .filter(t => t.startDate || t.dueDate)
    .sort((a, b) => {
      const aStart = new Date(a.startDate || a.dueDate!).getTime();
      const bStart = new Date(b.startDate || b.dueDate!).getTime();
      if (aStart !== bStart) return aStart - bStart;

      const aEnd = new Date(a.dueDate || a.startDate!).getTime();
      const bEnd = new Date(b.dueDate || b.startDate!).getTime();
      return (bEnd - bStart) - (aEnd - aStart);
    });
  
  for (const task of sortedTasks) {
    if (!task.startDate && !task.dueDate) continue;
    
    const taskStart = new Date(task.startDate || task.dueDate!);
    taskStart.setHours(0, 0, 0, 0);
    const taskEnd = task.dueDate ? new Date(task.dueDate) : new Date(task.startDate || task.dueDate!);
    taskEnd.setHours(23, 59, 59, 999);
    
    const taskDays: string[] = [];
    const currentDay = new Date(taskStart);
    while (currentDay <= taskEnd) {
      const dateKey = currentDay.toISOString().split('T')[0];
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
          daySlots[pos] = taskEnd.getTime();
        }
        
        break;
      }
    }
    
    positionMap.set(task.id, assignedPosition);
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
    
    const isToday = (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
    
    const isOtherMonth = year !== highlightYear || month !== highlightMonth;
    
    const lunarInfo = getLunarDate(year, month + 1, day);
    
    days.push({
      key: `${year}-${month}-${day}`,
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

const weeklyTasks = computed(() => {
  const result = new Map<string, any[]>();
  
  for (const week of calendarWeeks.value) {
    const weekKey = week.map(d => d.key).join('-');
    const tasksForWeek: any[] = [];
    
    for (const task of localTasks.value) {
      if (!task.startDate && !task.dueDate) continue;
      
      const effectiveStartDate = task.startDate || task.dueDate!;
      const taskStart = new Date(effectiveStartDate);
      taskStart.setHours(0, 0, 0, 0);
      
      const weekStart = new Date(week[0].date);
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(week[6].date);
      weekEnd.setHours(23, 59, 59, 999);
      
      const taskEnd = task.dueDate ? new Date(task.dueDate) : new Date(effectiveStartDate);
      taskEnd.setHours(23, 59, 59, 999);
      
      if (taskEnd < weekStart || taskStart > weekEnd) continue;
      
      const effectiveStart = taskStart < weekStart ? weekStart : taskStart;
      const effectiveEnd = taskEnd > weekEnd ? weekEnd : taskEnd;
      
      const startDayOfWeek = Math.floor((effectiveStart.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
      const endDayOfWeek = Math.floor((effectiveEnd.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
      
      const position = taskPositionsMap.value.get(task.id) ?? 0;
      
      tasksForWeek.push({
        ...task,
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

function getTasksForWeek(week: any[]): any[] {
  const weekKey = week.map((d: any) => d.key).join('-');
  return weeklyTasks.value.get(weekKey) || [];
}

const TASK_CHIP_HEIGHT = 24;
const TOP_OFFSET = 30;

function getMaxVisibleTasksForWeek(week: any[]): number {
  const weekKey = week.map((d: any) => d.key).join('-');
  const rowHeight = weekRowHeights.value[weekKey];
  if (!rowHeight) return 3;

  const DATE_NUMBER_HEIGHT = 30;
  const MORE_LABEL_HEIGHT = 20;
  const SLOT_HEIGHT = 24;

  const count = Math.floor((rowHeight - DATE_NUMBER_HEIGHT - MORE_LABEL_HEIGHT) / SLOT_HEIGHT);
  
  return Math.max(1, count);
}

function getVisibleTasksForWeek(week: any[]): any[] {
  const tasks = getTasksForWeek(week);
  const maxTasks = getMaxVisibleTasksForWeek(week);

  return tasks.filter(task => task.position < maxTasks);
}

function getHiddenTasksForWeek(week: any[]): any[] {
  const tasks = getTasksForWeek(week);
  const maxTasks = getMaxVisibleTasksForWeek(week);
  
  return tasks.filter(task => {
    const position = taskPositionsMap.value.get(task.id) ?? 0;
    return position >= maxTasks;
  });
}

function getTotalHiddenTaskCountForWeek(week: any[]): number {
  return getHiddenTasksForWeek(week).length;
}

function getEarliestHiddenTaskDate(week: any[]): Date | null {
  const hiddenTasks = getHiddenTasksForWeek(week);
  
  if (hiddenTasks.length === 0) return null;
  
  const earliestTask = hiddenTasks.reduce((earliest, task) => {
    const taskDate = new Date(task.startDate || task.dueDate);
    const earliestDate = new Date(earliest.startDate || earliest.dueDate);
    return taskDate < earliestDate ? task : earliest;
  });
  
  return new Date(earliestTask.startDate || earliestTask.dueDate);
}

function shouldShowHiddenCountForDay(day: any, week: any[]): boolean {
  const totalHidden = getTotalHiddenTaskCountForWeek(week);
  if (totalHidden === 0) return false;
  
  const earliestDate = getEarliestHiddenTaskDate(week);
  if (!earliestDate) return false;
  
  const currentDate = new Date(day.date);
  currentDate.setHours(0, 0, 0, 0);
  earliestDate.setHours(0, 0, 0, 0);
  
  return currentDate.getTime() === earliestDate.getTime();
}

function getTaskStyle(task: any, week: any[]) {
  const weekStart = new Date(week[0].date);
  weekStart.setHours(0, 0, 0, 0);
  
  const leftPercent = (task.startDayOfWeek / 7) * 100;
  const widthPercent = (task.spanDays / 7) * 100;
  const bgColor = task.backgroundColor 
    ? `var(--b3-font-${task.backgroundColor})` 
    : 'var(--b3-font-background9)';
  
  const position = taskPositionsMap.value.get(task.id) ?? 0;
  
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

function handleDragLeave(event: DragEvent) {
  const relatedTarget = event.relatedTarget as HTMLElement;
  const currentTarget = event.currentTarget as HTMLElement;
  
  if (relatedTarget && currentTarget.contains(relatedTarget)) {
    return;
  }
  
  pendingDragOverDay = null;
  if (dragOverDayUpdateTimer) {
    clearTimeout(dragOverDayUpdateTimer);
    dragOverDayUpdateTimer = null;
  }
  
  dragOverDay.value = null;
}

function handleDrop(day: any) {
  dragOverDay.value = null;
  
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
    
    const updatedTask = {
      ...task,
      startDate: dateStr,
      dueDate: dateStr
    };
    
    emit('taskDateChanged', updatedTask);
    
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

function findDayCellFromEvent(event: MouseEvent): { date: Date; element: HTMLElement } | null {
  const elements = document.elementsFromPoint(event.clientX, event.clientY);
  const dayCell = elements.find(el => el.classList.contains('day-cell'));
  
  if (!dayCell) return null;
  
  const cellElement = dayCell as HTMLElement;
  const cellIndex = Array.from(document.querySelectorAll('.day-cell')).indexOf(cellElement);
  if (cellIndex === -1) return null;
  
  const allDays = calendarDays.value;
  if (cellIndex >= allDays.length) return null;
  
  const targetDate = new Date(allDays[cellIndex].date);
  targetDate.setHours(0, 0, 0, 0);
  
  return { date: targetDate, element: cellElement };
}

function previousMonth() {
  baseDate.value = new Date(baseDate.value.getFullYear(), baseDate.value.getMonth() - 1, 1);
}

function nextMonth() {
  baseDate.value = new Date(baseDate.value.getFullYear(), baseDate.value.getMonth() + 1, 1);
}

function nextWeek() {
  const newDate = new Date(baseDate.value);
  newDate.setDate(newDate.getDate() + 7);
  baseDate.value = newDate;
}

function previousWeek() {
  const newDate = new Date(baseDate.value);
  newDate.setDate(newDate.getDate() - 7);
  baseDate.value = newDate;
}

function handleWheel(event: WheelEvent) {
  event.preventDefault();
  
  const daysToScroll = event.deltaY > 0 ? 7 : -7;
  const newDate = new Date(baseDate.value);
  newDate.setDate(newDate.getDate() + daysToScroll);
  
  baseDate.value = newDate;
}

function handleHandleMouseDown(event: MouseEvent, task: Task, handleType: 'start' | 'end') {
  const effectiveStartDate = task.startDate || task.dueDate;
  const originalDate = handleType === 'start' 
    ? (effectiveStartDate || '') 
    : (task.dueDate || effectiveStartDate || '');
  
  draggingHandle.value = { 
    task, 
    type: handleType,
    originalDate,
    finalDate: null
  };
  
  dragLastUpdatedDate.value = '';
  isDragging.value = true;
  
  event.preventDefault();
  event.stopPropagation();

  eventManager.add(document, 'mousemove', handleHandleMouseMove, 'handle');
  eventManager.add(document, 'mouseup', handleHandleMouseUp, 'handle');
}

function handleTaskMouseDown(event: MouseEvent, task: Task) {
  if (!task.startDate && !task.dueDate) return;
  
  const effectiveStartDate = task.startDate || task.dueDate!;
  
  draggingTask.value = {
    task,
    originalStart: effectiveStartDate,
    originalDue: task.dueDate || null,
    finalStartDate: null,
    finalDueDate: null
  };
  
  dragLastUpdatedDate.value = '';
  isDragging.value = true;
  
  event.preventDefault();

  eventManager.add(document, 'mousemove', handleTaskMouseMove, 'task');
  eventManager.add(document, 'mouseup', handleTaskMouseUp, 'task');
}

function handleTaskMouseMove(event: MouseEvent) {
  if (!draggingTask.value) return;
  
  const { task, originalStart, originalDue } = draggingTask.value;
  
  const targetData = findDayCellFromEvent(event);
  if (!targetData) return;
  
  const targetDate = targetData.date;
  
  const originalStartDate = new Date(originalStart);
  originalStartDate.setHours(0, 0, 0, 0);
  
  const daysDiff = Math.round((targetDate.getTime() - originalStartDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const newStartDate = new Date(originalStart);
  newStartDate.setDate(newStartDate.getDate() + daysDiff);
  const newStartDateStr = formatDate(newStartDate);
  
  let newDueDateStr = null;
  if (originalDue) {
    const newDueDate = new Date(originalDue);
    newDueDate.setDate(newDueDate.getDate() + daysDiff);
    newDueDateStr = formatDate(newDueDate);
  }
  
  if (dragLastUpdatedDate.value === newStartDateStr) {
    return;
  }
  
  if (pendingDeletion.value.has(task.id)) {
    pendingDeletion.value.delete(task.id);
  }
  
  const taskIndex = localTasks.value.findIndex(t => t.id === task.id);
  if (taskIndex !== -1) {
    const updatedTask = {
      ...localTasks.value[taskIndex],
      startDate: newStartDateStr,
      dueDate: newDueDateStr
    };
    localTasks.value[taskIndex] = updatedTask;
    tasksVersion.value++;
  }
  
  draggingTask.value.finalStartDate = newStartDateStr;
  draggingTask.value.finalDueDate = newDueDateStr;
  
  dragLastUpdatedDate.value = newStartDateStr;
}

function handleTaskMouseUp() {
  eventManager.remove('task');

  const { task, finalStartDate, finalDueDate } = draggingTask.value || {};
  
  if (task && finalStartDate) {
    const updatedTask = {
      ...task,
      startDate: finalStartDate,
      dueDate: finalDueDate
    };
    
    emit('taskDateChanged', updatedTask);
    
    if (task.type === 'block' && task.blockId) {
      const attrs: Record<string, string> = {
        'custom-task-start-date': finalStartDate
      };
      if (finalDueDate) {
        attrs['custom-task-due-date'] = finalDueDate;
      }
      pendingUpdates.value.set(task.blockId, attrs);
      scheduleSave();
    }
  }

  draggingTask.value = null;
  dragLastUpdatedDate.value = '';
  
  if (dragEndCooldownTimer) {
    clearTimeout(dragEndCooldownTimer);
  }
  
  dragEndCooldownTimer = setTimeout(() => {
    isDragging.value = false;
    dragEndCooldownTimer = null;
  }, 500);
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
}

function deleteTask(task: Task) {
  pendingDeletion.value.add(task.id);
  
  localTasks.value = localTasks.value.filter(t => t.id !== task.id);
  
  const updatedTask = {
    ...task,
    startDate: null,
    dueDate: null
  };
  
  emit('taskDateChanged', updatedTask);
  
  hideContextMenu();
  
  if (task.type === 'block' && task.blockId) {
    setBlockAttrs(task.blockId, {
      'custom-task-start-date': '',
      'custom-task-due-date': ''
    }).catch(() => {});
  }
}

async function setTaskBackgroundColor(task: Task, color: string) {
  const taskIndex = localTasks.value.findIndex(t => t.id === task.id);
  if (taskIndex !== -1) {
    localTasks.value[taskIndex] = {
      ...localTasks.value[taskIndex],
      backgroundColor: color
    };
  }

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

async function handleHandleMouseMove(event: MouseEvent) {
  if (!draggingHandle.value) return;
  
  const { task, type } = draggingHandle.value;
  
  const weeksContainer = document.querySelector('.weeks-container');
  if (weeksContainer) {
    const containerRect = weeksContainer.getBoundingClientRect();
    const scrollThreshold = 50;
    
    if (event.clientY > containerRect.bottom - scrollThreshold && event.clientY < containerRect.bottom + scrollThreshold) {
      nextWeek();
    } else if (event.clientY < containerRect.top + scrollThreshold && event.clientY > containerRect.top - scrollThreshold) {
      previousWeek();
    }
  }
  
  const targetData = findDayCellFromEvent(event);
  if (!targetData) return;
  
  const targetDate = targetData.date;
  const targetDateStr = formatDate(targetDate);
  
  if (dragLastUpdatedDate.value === targetDateStr) return;
  
  if (type === 'start' && (task.startDate || task.dueDate)) {
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    if (dueDate) {
      dueDate.setHours(0, 0, 0, 0);
      if (targetDate.getTime() > dueDate.getTime()) {
        return;
      }
    }
    
    updateTaskDate(task, 'start', targetDateStr);
  } else if (type === 'end') {
    const cellRect = targetData.element.getBoundingClientRect();
    const relativeX = event.clientX - cellRect.left;
    const cellWidth = cellRect.width;
    
    if (relativeX < cellWidth * 0.1) {
      return;
    }
    
    const startDate = task.startDate || task.dueDate ? new Date(task.startDate || task.dueDate!) : null;
    if (startDate) {
      startDate.setHours(0, 0, 0, 0);
      if (targetDate.getTime() < startDate.getTime()) {
        return;
      }
    }
    
    updateTaskDate(task, 'end', targetDateStr);
  }
}

function updateTaskDate(task: Task, dateType: 'start' | 'end', targetDateStr: string) {
  const taskField = dateType === 'start' ? 'startDate' : 'dueDate';
  
  if (pendingDeletion.value.has(task.id)) {
    pendingDeletion.value.delete(task.id);
  }
  
  const taskIndex = localTasks.value.findIndex(t => t.id === task.id);
  if (taskIndex !== -1) {
    const updatedTask = {
      ...localTasks.value[taskIndex],
      [taskField]: targetDateStr
    };
    localTasks.value[taskIndex] = updatedTask;
    tasksVersion.value++;
  }
  
  if (draggingHandle.value) {
    draggingHandle.value.finalDate = targetDateStr;
  }
  
  dragLastUpdatedDate.value = targetDateStr;
}

async function handleHandleMouseUp() {
  const { task, type, finalDate } = draggingHandle.value || {};
  
  if (task && finalDate && type) {
    const attrKey = type === 'start' ? 'custom-task-start-date' : 'custom-task-due-date';
    const taskField = type === 'start' ? 'startDate' : 'dueDate';
    
    const updatedTask = {
      ...task,
      [taskField]: finalDate
    };
    
    emit('taskDateChanged', updatedTask);
    
    if (task.type === 'block' && task.blockId) {
      pendingUpdates.value.set(task.blockId, {
        [attrKey]: finalDate
      });
      scheduleSave();
    }
  }
  
  cleanupDragListeners();
  flushSave();
  
  if (dragEndCooldownTimer) {
    clearTimeout(dragEndCooldownTimer);
  }
  
  dragEndCooldownTimer = setTimeout(() => {
    isDragging.value = false;
    dragEndCooldownTimer = null;
  }, 500);
}

function cleanupDragListeners() {
  draggingHandle.value = null;
  eventManager.remove('handle');
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

  updateWeekRowHeights();

  const weeksContainer = document.querySelector('.weeks-container');
  if (weeksContainer) {
    resizeObserver = new ResizeObserver(() => {
      updateWeekRowHeights();
    });
    resizeObserver.observe(weeksContainer as Element);
  }
});

function scheduleSave() {
  if (saveTimer.value !== null) return;
  
  saveTimer.value = setTimeout(async () => {
    if (pendingUpdates.value.size === 0) return;
    
    const updates = Array.from(pendingUpdates.value.entries());
    pendingUpdates.value.clear();
    
    try {
      await Promise.all(updates.map(([blockId, attrs]) => 
        setBlockAttrs(blockId, attrs)
      ));
    } catch (error) {
      // scheduleSave error
    }
    
    saveTimer.value = null;
  }, 300);
}

function handleTaskClick(task: Task) {
  emit('taskClick', task);
}

function flushSave() {
  if (saveTimer.value !== null) {
    clearTimeout(saveTimer.value);
    saveTimer.value = null;
  }
  
  if (pendingUpdates.value.size === 0) return;
  
  const updates = Array.from(pendingUpdates.value.entries());
  pendingUpdates.value.clear();
  
  Promise.all(updates.map(([blockId, attrs]) => 
    setBlockAttrs(blockId, attrs)
  )).catch(() => {});
}

onUnmounted(() => {
  flushSave();

  eventManager.clear();

  if (resizeObserver) {
    resizeObserver.disconnect();
  }
  
  if (dragOverDayUpdateTimer) {
    clearTimeout(dragOverDayUpdateTimer);
    dragOverDayUpdateTimer = null;
  }
  
  if (dragEndCooldownTimer) {
    clearTimeout(dragEndCooldownTimer);
    dragEndCooldownTimer = null;
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

.context-menu {
  position: fixed;
  background: var(--b3-theme-surface);
  border: 1px solid var(--b3-border-color);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 200px;
  padding: 4px;
  animation: contextMenuFadeIn 0.15s ease-out;
}

@keyframes contextMenuFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.context-menu-section {
  padding: 4px;
  margin-bottom: 8px;
}

.context-menu-title {
  font-size: 11px;
  font-weight: 500;
  color: var(--b3-theme-on-surface);
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  padding: 0 4px;
}

.task-color-picker {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  padding: 4px;
}

.color-option {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
  position: relative;
}

.color-option:hover {
  border-color: var(--b3-border-color);
}

.color-option.selected {
  border-color: var(--b3-border-color);
}

.context-menu-divider {
  height: 1px;
  background: var(--b3-border-color);
  margin: 8px 4px;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  color: var(--b3-theme-on-background);
  font-size: 13px;
  border-radius: 6px;
  transition: all 0.15s ease;
  font-weight: 400;
}

.context-menu-item:hover {
  background: var(--b3-list-hover);
}

.context-menu-item.delete-item {
  color: #ef4444;
}

.context-menu-item.delete-item:hover {
  background: #fef2f2;
  color: #dc2626;
}

.context-menu-item svg {
  flex-shrink: 0;
  opacity: 0.8;
  transition: opacity 0.15s;
}

.context-menu-item:hover svg {
  opacity: 1;
}
</style>
