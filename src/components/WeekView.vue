<template>
  <div class="week-view">
    <div class="calendar-header">
      <button class="nav-btn" @click="previousWeek">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
        </svg>
      </button>
      <div class="header-center">
        <div class="header-title">{{ weekTitle }}</div>
        <button class="today-btn" @click="goToToday">今天</button>
      </div>
      <button class="nav-btn" @click="nextWeek">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
        </svg>
      </button>
    </div>
    
    <div class="week-body">
      <div class="week-grid">
        <div class="weekday-header">
          <div class="all-day-label-cell">
            <button class="days-control-btn" @click="decreaseDays" :disabled="daysCount <= CALENDAR_CONSTANTS.LAYOUT.MIN_DAYS">-</button>
            <span class="days-count">{{ daysCount }}</span>
            <button class="days-control-btn" @click="increaseDays" :disabled="daysCount >= CALENDAR_CONSTANTS.LAYOUT.MAX_DAYS">+</button>
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
              :class="{
                today: day.isToday,
                'drag-over': dragState.overDay === day.key || dragState.overAllDayColumn === day.key,
                'last-column': index === weekDays.length - 1
              }"
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
        
        <div class="days-scroll">
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
                :class="{ 'drag-over': dragState.overHourCell === `${day.key}-${hour}` }"
                @dragover.prevent="handleHourCellDragOver(day, hour)"
                @dragleave="handleHourCellDragLeave"
                @drop="handleDropOnHourCell(day, hour)"
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import type { Task } from '@/api';
import { setBlockAttrs } from '@/api';
import { stripHtml } from '@/composables/useTaskCommon';
import { formatDate, formatTime, formatHour, getWeekStart, formatChineseDate } from '@/composables/useDateUtils';
import { CALENDAR_CONSTANTS } from '@/composables/useCalendarConstants';
import { useDebouncedSave } from '@/composables/useDebouncedSave';
import { useTaskDrag } from '@/composables/useTaskDrag';
import Icon from './Icon.vue';

interface Props {
  tasks: Task[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'taskDateChanged': [task: Task];
  'taskClick': [task: Task];
}>();

const currentWeekStart = ref(getWeekStart(new Date()));
const currentTime = ref(new Date());
const isAllDaySectionCollapsed = ref(false);
let timeUpdateInterval: ReturnType<typeof setInterval> | null = null;

const localTasks = ref<Task[]>([]);

const { saveTaskAttrs } = useDebouncedSave(500);

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
} = useTaskDrag(localTasks, emit);

const contextMenu = ref<{ show: boolean; x: number; y: number; task: Task | null }>({
  show: false,
  x: 0,
  y: 0,
  task: null
});

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

const daysCount = ref(7);

function decreaseDays() {
  if (daysCount.value > CALENDAR_CONSTANTS.LAYOUT.MIN_DAYS) {
    daysCount.value--;
  }
}

function increaseDays() {
  if (daysCount.value < CALENDAR_CONSTANTS.LAYOUT.MAX_DAYS) {
    daysCount.value++;
  }
}

function getTasksHash(tasks: Task[]): string {
  return tasks.map(t => 
    `${t.id}:${t.status}:${t.priority}:${t.startDate}:${t.dueDate}:${t.startTime}:${t.dueTime}:${t.title}`
  ).sort().join('|');
}

let lastTasksHash = '';

watch(() => props.tasks, (newTasks) => {
  if (isDragging.value) return;
  
  const newHash = getTasksHash(newTasks);
  if (newHash === lastTasksHash) return;
  
  lastTasksHash = newHash;
  localTasks.value = [...newTasks];
}, { deep: true, immediate: true });

const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const weekTitle = computed(() => {
  const start = new Date(currentWeekStart.value);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return `${formatChineseDate(start)} - ${formatChineseDate(end)}`;
});

const weekDays = computed(() => {
  const days = [];
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

function getWeekBounds() {
  const weekStart = new Date(currentWeekStart.value);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + daysCount.value - 1);
  weekEnd.setHours(23, 59, 59, 999);
  return { weekStart, weekEnd };
}

const weekTasks = computed(() => {
  const { weekStart, weekEnd } = getWeekBounds();
  
  return localTasks.value.filter(task => {
    if (!task.startDate && !task.dueDate) return false;
    
    const taskStart = new Date(task.startDate || task.dueDate!);
    taskStart.setHours(0, 0, 0, 0);
    const taskEnd = task.dueDate ? new Date(task.dueDate) : new Date(task.startDate || task.dueDate!);
    taskEnd.setHours(23, 59, 59, 999);
    
    return taskStart <= weekEnd && taskEnd >= weekStart;
  }).filter(task => {
    return !task.startTime && !task.dueTime;
  }).map(task => {
    const taskStart = new Date(task.startDate || task.dueDate!);
    taskStart.setHours(0, 0, 0, 0);
    const taskEnd = task.dueDate ? new Date(task.dueDate) : new Date(task.startDate || task.dueDate!);
    taskEnd.setHours(23, 59, 59, 999);
    
    const weekStart = new Date(currentWeekStart.value);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    const displayStart = taskStart < weekStart ? weekStart : taskStart;
    const displayEnd = taskEnd > weekEnd ? weekEnd : taskEnd;
    
    const startDayOffset = Math.floor((displayStart.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000));
    const endDayOffset = Math.floor((displayEnd.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000));
    
    return {
      ...task,
      startDayOfWeek: Math.max(0, startDayOffset),
      spanDays: Math.min(6, endDayOffset) - Math.max(0, startDayOffset) + 1
    };
  });
});

const timedTasks = computed(() => {
  const { weekStart, weekEnd } = getWeekBounds();
  
  return localTasks.value.filter(task => {
    if (!task.startDate && !task.dueDate) {
      return false;
    }
    
    const taskStart = new Date(task.startDate || task.dueDate!);
    taskStart.setHours(0, 0, 0, 0);
    const taskEnd = task.dueDate ? new Date(task.dueDate) : new Date(task.startDate || task.dueDate!);
    taskEnd.setHours(23, 59, 59, 999);
    
    return taskStart <= weekEnd && taskEnd >= weekStart;
  }).filter(task => {
    return task.startTime || task.dueTime;
  });
});

const taskPositionsMap = computed(() => {
  const positionMap = new Map<string, number>();
  const dailyPositionSlots = new Map<string, number[]>();
  
  const sortedTasks = [...weekTasks.value].sort((a, b) => {
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
    const taskDate = new Date(task.startDate || task.dueDate);
    const earliestDate = new Date(earliest.startDate || earliest.dueDate);
    return taskDate < earliestDate ? task : earliest;
  });
  
  return new Date(earliestTask.startDate || earliestTask.dueDate);
});

const moreButtonDayIndex = computed(() => {
  if (!earliestHiddenTaskDate.value) return 0;
  
  const weekStart = new Date(currentWeekStart.value);
  weekStart.setHours(0, 0, 0, 0);
  
  const taskDate = new Date(earliestHiddenTaskDate.value);
  taskDate.setHours(0, 0, 0, 0);
  
  const daysDiff = Math.round((taskDate.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
  
  return Math.max(0, Math.min(6, daysDiff));
});

function getVisibleTaskPosition(task: any): number {
  return taskPositionsMap.value.get(task.id) || 0;
}

function getAllDayTaskStyle(task: any) {
  const leftPercent = (task.startDayOfWeek / daysCount.value) * 100;
  const widthPercent = (task.spanDays / daysCount.value) * 100;

  const position = getVisibleTaskPosition(task);

  const bgColor = task.backgroundColor
    ? `var(--b3-font-${task.backgroundColor})`
    : 'var(--b3-font-background9)';

  return {
    position: 'absolute' as const,
    left: `${leftPercent}%`,
    width: `calc(${widthPercent}% - 30px)`,
    top: `${CALENDAR_CONSTANTS.LAYOUT.TASK_TOP_OFFSET + position * CALENDAR_CONSTANTS.LAYOUT.TASK_CHIP_HEIGHT}px`,
    height: '16px',
    backgroundColor: bgColor
  };
}

const currentTimeStyle = computed(() => {
  const now = currentTime.value;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const top = minutes * CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT / 60;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date(currentWeekStart.value);
  weekStart.setHours(0, 0, 0, 0);

  const dayOffset = Math.floor((today.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000));

  if (dayOffset < 0 || dayOffset >= daysCount.value) {
    return { display: 'none' };
  }

  return {
    left: `calc(${CALENDAR_CONSTANTS.LAYOUT.TIME_COLUMN_WIDTH}px + (100% - ${CALENDAR_CONSTANTS.LAYOUT.TIME_COLUMN_WIDTH}px) * ${dayOffset / daysCount.value} + ${CALENDAR_CONSTANTS.SPACING.CURRENT_TIME_LINE_LEFT}px)`,
    width: `calc((100% - ${CALENDAR_CONSTANTS.LAYOUT.TIME_COLUMN_WIDTH}px) / ${daysCount.value} - ${CALENDAR_CONSTANTS.SPACING.CURRENT_TIME_LINE_MARGIN}px)`,
    top: `${top}px`
  };
});

const currentTimeLabelStyle = computed(() => {
  const now = currentTime.value;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const top = minutes * CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT / 60;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date(currentWeekStart.value);
  weekStart.setHours(0, 0, 0, 0);
  
  const dayOffset = Math.floor((today.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000));
  
  if (dayOffset < 0 || dayOffset > 6) {
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
  const newDate = new Date(currentWeekStart.value);
  newDate.setDate(newDate.getDate() - 7);
  currentWeekStart.value = newDate;
}

function nextWeek() {
  const newDate = new Date(currentWeekStart.value);
  newDate.setDate(newDate.getDate() + 7);
  currentWeekStart.value = newDate;
}

function goToToday() {
  currentWeekStart.value = getWeekStart(new Date());
}

function toggleAllDaySection() {
  isAllDaySectionCollapsed.value = !isAllDaySectionCollapsed.value;
}

function showAllTasks() {
  isAllDaySectionCollapsed.value = false;
}

function handleDragOver(day: any) {
  dragState.value.overDay = day.key;
}

function handleDragLeave() {
  dragState.value.overDay = null;
}

async function handleDrop(day: any) {
  dragState.value.overDay = null;
  
  const event = window.event as DragEvent;
  const taskData = event?.dataTransfer?.getData('application/json');
  
  if (!taskData) return;
  
  try {
    const task = JSON.parse(taskData) as Task;
    const dateStr = formatDate(day.date);
    
    const taskIndex = localTasks.value.findIndex(t => t.id === task.id);
    if (taskIndex !== -1) {
      const updatedTask = {
        ...localTasks.value[taskIndex],
        startDate: dateStr,
        dueDate: dateStr,
        startTime: undefined,
        dueTime: undefined
      };
      localTasks.value[taskIndex] = updatedTask;
      emit('taskDateChanged', updatedTask);
    } else {
      const newTask = {
        ...task,
        startDate: dateStr,
        dueDate: dateStr,
        startTime: undefined,
        dueTime: undefined
      };
      localTasks.value = [...localTasks.value, newTask];
      emit('taskDateChanged', newTask);
    }
    
    if (task.type === 'block' && task.blockId) {
      await setBlockAttrs(task.blockId, {
        'custom-task-start-date': dateStr,
        'custom-task-due-date': dateStr,
        'custom-task-start-time': null,
        'custom-task-due-time': null
      });
    }
  } catch (error) {
  }
}

async function handleDropOnHourCell(day: any, hour: number) {
  dragState.value.overHourCell = null;
  
  const event = window.event as DragEvent;
  const taskData = event?.dataTransfer?.getData('application/json');
  
  if (!taskData) return;
  
  try {
    const task = JSON.parse(taskData) as Task;
    const actualHour = hour - 1;
    const date = new Date(day.date);
    date.setHours(actualHour, 0, 0, 0);
    
    const startDate = formatDate(date);
    const startTime = formatTime(date);
    const dueDate = formatDate(date);
    const dueTime = formatTime(new Date(date.getTime() + 60 * 60 * 1000));
    
    const taskIndex = localTasks.value.findIndex(t => t.id === task.id);
    if (taskIndex !== -1) {
      localTasks.value[taskIndex] = {
        ...localTasks.value[taskIndex],
        startDate: startDate,
        dueDate: dueDate,
        startTime: startTime,
        dueTime: dueTime
      };
    } else {
      const newTask = {
        ...task,
        startDate: startDate,
        dueDate: dueDate,
        startTime: startTime,
        dueTime: dueTime
      };
      localTasks.value = [...localTasks.value, newTask];
      emit('taskDateChanged', newTask);
    }
    
    await saveTaskAttrs(task, {
      'custom-task-start-date': startDate,
      'custom-task-start-time': startTime,
      'custom-task-due-date': dueDate,
      'custom-task-due-time': dueTime
    });
  } catch (error) {
  }
}

function handleHourCellDragOver(day: any, hour: number) {
  dragState.value.overHourCell = `${day.key}-${hour}`;
}

function handleHourCellDragLeave() {
  dragState.value.overHourCell = null;
}

const tasksByDay = computed(() => {
  const grouped = new Map<string, Array<{ task: Task; renderDate: string; renderStartDate: string; renderStartTime: string; renderDueDate: string; renderDueTime: string }>>();
  
  for (const day of weekDays.value) {
    grouped.set(day.key, []);
  }
  
  for (const task of timedTasks.value) {
    const taskStartDate = task.startDate || task.dueDate;
    const taskDueDate = task.dueDate || task.startDate;
    
    if (!taskStartDate || !taskDueDate) continue;
    
    const startDate = new Date(taskStartDate);
    const dueDate = new Date(taskDueDate);
    
    for (const day of weekDays.value) {
      const dayDate = new Date(day.key);
      
      if (dayDate >= startDate && dayDate <= dueDate) {
        const isStartDay = dayDate.getTime() === startDate.getTime();
        const isEndDay = dayDate.getTime() === dueDate.getTime();
        
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

function getTimedTaskStyle(item: { task: Task; renderDate: string; renderStartDate: string; renderStartTime: string; renderDueDate: string; renderDueTime: string }) {
  const startTime = item.renderStartTime;
  const endTime = item.renderDueTime;
  
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  const top = startMinutes * CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT / 60;
  const height = Math.max(CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT, (endMinutes - startMinutes) * CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT / 60);

  const bgColor = item.task.backgroundColor
    ? `var(--b3-font-${item.task.backgroundColor})`
    : 'var(--b3-font-background9)';
  
  return {
    top: `${top}px`,
    height: `${height}px`,
    backgroundColor: bgColor
  };
}

function getTaskTimeRange(item: { task: Task; renderDate: string; renderStartDate: string; renderStartTime: string; renderDueDate: string; renderDueTime: string }) {
  const startTime = item.renderStartTime;
  const endTime = item.renderDueTime;
  return `${startTime} - ${endTime}`;
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

  document.addEventListener('click', hideContextMenu, { once: true });
}

function hideContextMenu() {
  contextMenu.value = {
    show: false,
    x: 0,
    y: 0,
    task: null
  };
}

async function setTaskBackgroundColor(task: Task, color: string) {
  const index = localTasks.value.findIndex(t => t.id === task.id);
  if (index !== -1) {
    localTasks.value[index].backgroundColor = color;
    emit('taskDateChanged', localTasks.value[index]);

    if (task.type === 'block' && task.blockId) {
      try {
        await setBlockAttrs(task.blockId, {
          'custom-task-background-color': color
        });
      } catch (error) {
      }
    }
  }
  hideContextMenu();
}

async function deleteTask(task: Task) {
  if (task.type === 'block' && task.blockId) {
    try {
      await setBlockAttrs(task.blockId, {
        'custom-task-start-date': '',
        'custom-task-due-date': ''
      });
      const index = localTasks.value.findIndex(t => t.id === task.id);
      if (index !== -1) {
        localTasks.value[index].startDate = null;
        localTasks.value[index].dueDate = null;
        emit('taskDateChanged', localTasks.value[index]);
      }
    } catch (error) {
    }
  }
  hideContextMenu();
}

onMounted(() => {
  timeUpdateInterval = setInterval(() => {
    currentTime.value = new Date();
  }, 60000);
});

onUnmounted(() => {
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval);
  }
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
  padding:14px 10px;
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
  padding: 4px 12px;
  border: 1px solid var(--b3-theme-primary);
  border-radius: 4px;
  background: transparent;
  color: var(--b3-theme-primary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.today-btn:hover {
  background: var(--b3-theme-primary);
  color: white;
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
      padding: 2px 3px;
}

.weekday-name {
  font-size: 14px;
  color: var(--b3-theme-on-surface);
  opacity: 0.7;
}

.day-number {
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

.context-menu {
  position: fixed;
  background: var(--b3-theme-surface);
  border: 1px solid var(--b3-border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 200px;
  padding: 8px;
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
