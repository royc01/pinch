<template>
  <div class="month-view">
    <div class="calendar-container">
      <div class="calendar-header">
        <button
          class="nav-btn"
          :title="t('date.previousMonth')"
          :aria-label="t('date.previousMonth')"
          @click="previousMonth"
        >
          <Icon name="chevronLeft" width="20" height="20" />
        </button>
        <div class="month-title">{{ monthTitle }}</div>
        <button
          class="nav-btn"
          :title="t('date.nextMonth')"
          :aria-label="t('date.nextMonth')"
          @click="nextMonth"
        >
          <Icon name="chevronRight" width="20" height="20" />
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
                <div 
                  v-if="shouldShowHiddenCountForDay(day, week) && !isDayExpanded(day.key)"
                  class="more-tasks-placeholder day-more"
                  :style="getDayMoreStyle(week)"
                >
                  <button
                    type="button"
                    class="more-tasks-pill"
                    :title="getHiddenTasksLabel(getHiddenTaskCountForDay(day, week))"
                    :aria-label="getHiddenTasksLabel(getHiddenTaskCountForDay(day, week))"
                    @mousedown.stop
                    @click.stop="expandDayTasks(day.key)"
                  >
                    +{{ getHiddenTaskCountForDay(day, week) }}
                  </button>
                </div>
                <div
                  v-if="isDayExpanded(day.key)"
                  class="day-expanded-panel"
                  @mousedown.stop
                  @click.stop
                >
                  <div class="day-expanded-header">
                    <span class="day-expanded-title">{{ t('monthView.dayTasks') }}</span>
                    <button
                      type="button"
                      class="day-expanded-close"
                      @click.stop="collapseDayTasks(day.key)"
                    >
                      {{ t('monthView.collapse') }}
                    </button>
                  </div>
                  <div class="day-expanded-list">
                    <div
                      v-for="task in getExpandedTasksForDay(day, week)"
                      :key="`expanded-${day.key}-${task.id}`"
                      class="day-expanded-chip"
                      :title="getTaskDisplayTitle(task)"
                      :style="getExpandedTaskChipStyle(task)"
                      :class="{ 'task-completed': task.status === 'completed' }"
                      @pointerdown="handleMobileTaskPointerDown($event, task)"
                      @pointermove="handleMobileTaskPointerMove"
                      @pointerup="handleMobileTaskPointerUp"
                      @pointercancel="handleMobileTaskPointerCancel"
                      @contextmenu="handleContextMenu($event, task)"
                    >
                      <span class="task-checkbox-wrapper" @click.stop="toggleTaskStatus(task)">
                        <TaskCheckbox :checked="task.status === 'completed'" :size="12" />
                      </span>
                      <span class="day-expanded-chip-title" @click.stop="handleTaskClick(task)">
                        {{ getTaskDisplayTitle(task) }}
                      </span>
                    </div>
                    <div v-if="getExpandedTasksForDay(day, week).length === 0" class="day-expanded-empty">
                      {{ t('taskManager.noTasks') }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="week-tasks-layer">
              <div 
                v-for="task in getVisibleTasksForWeek(week)" 
                :key="task.id"
                class="task-chip"
                :title="getTaskDisplayTitle(task)"
                :class="{
                  'task-completed': task.status === 'completed',
                  'mobile-selected': shouldShowMobileTaskChipControls(task.id)
                }"
                :style="getTaskStyle(task, week)"
                @click="handleMobileTaskChipClick($event, task)"
                @pointerdown="handleMobileTaskChipPointerDown($event, task)"
                @pointermove="handleMobileTaskChipPointerMove"
                @pointerup="handleMobileTaskChipPointerUp"
                @pointercancel="handleMobileTaskChipPointerCancel"
                @contextmenu="handleContextMenu($event, task)"
              >
                <div 
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
                  @mousedown="handleTaskMouseDown($event, task)"
                >
                  <span
                    class="task-checkbox-wrapper"
                    @mousedown.stop
                    @click.stop="toggleTaskStatus(task)"
                  >
                    <TaskCheckbox :checked="task.status === 'completed'" :size="12" />
                  </span>
                  <span class="task-title-text">{{ getTaskDisplayTitle(task) }}</span>
                  <span
                    v-if="task.priority !== 'none'"
                    class="task-priority-badge"
                    :class="`priority-${task.priority}`"
                    :title="getPriorityTitle(task.priority)"
                  >
                    <Icon name="flag" width="10" height="10" />
                  </span>
                  <span class="task-jump-btn" @click.stop="handleTaskClick(task)">
                    <Icon name="open" width="14" height="14" />
                  </span>
                </div>
                <div 
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
import type { Task, TaskGroup } from '@/api';
import { setBlockAttrs, TaskRepository } from '@/api';
import { updateTaskMarkdown } from '@/utils/taskHelpers';
import { getTaskDisplayTitle } from '@/composables/useTaskCommon';
import { formatDate } from '@/composables/useDateUtils';
import { useTaskDrag } from '@/composables/useTaskDrag';
import { useTaskSyncGuard } from '@/composables/useTaskSyncGuard';
import { useTaskLocalMutations } from '@/composables/useTaskLocalMutations';
import { getRepeatSeriesForTask, notifyRepeatChanged, updateRepeatSeriesBackgroundColor, updateRepeatSeriesDates, type RepeatFrequency, type RepeatRule, type RepeatRuleInput } from '@/repeatRepository';
import { belongsToRepeatSeries, getDayDiff, isRepeatTask as isRepeatTaskEntity, shiftDate } from '@/utils/repeatTaskUtils';
import solarLunar from '@/utils/solarLunar.js';
import Icon from './Icon.vue';
import TaskCheckbox from './TaskCheckbox.vue';
import TaskContextMenu from './TaskContextMenu.vue';
import { openHabitTrackerFocusTimer } from '@/main';
import { createTaskFocusTarget } from '@/utils/focusTimerTarget';
import { useI18n } from '@/composables/useI18n';

interface Props {
  tasks: Task[];
  taskGroups?: TaskGroup[];
}

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

const formatTemplate = (key: string, values: Record<string, string | number>): string => {
  return Object.entries(values).reduce(
    (result, [name, value]) => result.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value)),
    t(key)
  );
};

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
  taskClick: [task: Task];
  taskEdit: [task: Task, anchor: { x: number; y: number }];
  taskCreateRequested: [payload: { startDate: string; dueDate: string; allDay: boolean }];
  visibleRangeChange: [payload: { startDate: string; endDate: string }];
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
const MOBILE_BREAKPOINT = 768;
const MOBILE_DRAG_LONG_PRESS_MS = 280;
const MOBILE_DRAG_MOVE_THRESHOLD_PX = 18;
const MOBILE_TASK_CHIP_OPERATION_MOVE_THRESHOLD_PX = 10;
const isCompactMobileLayout = ref(false);

let dragOverDayUpdateTimer: ReturnType<typeof setTimeout> | null = null;
let pendingDragOverDay: string | null = null;

const localTasks = ref<Task[]>([]);
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

function syncCompactMobileLayout() {
  isCompactMobileLayout.value = window.innerWidth <= MOBILE_BREAKPOINT;
  invalidateMonthDropZoneCache();
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

function normalizeOptionalDateValue(value: string | null | undefined): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function getEffectiveDueDate(startDate: string, dueDate: string | null | undefined): string {
  return normalizeOptionalDateValue(dueDate) || startDate;
}

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
const contextMenuDateDraft = ref<{ startDate: string; startTime: string; dueDate: string; dueTime: string }>({
  startDate: '',
  startTime: '',
  dueDate: '',
  dueTime: ''
});
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
const weekRowHeights = ref<Record<string, number>>({});
const expandedDayKeys = ref<Set<string>>(new Set());
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
const monthDropColorValues = backgroundColors.map(color => color.value);

function pickRandomTaskBackgroundColor(): string {
  if (monthDropColorValues.length === 0) {
    return 'pinch-background6';
  }
  const index = Math.floor(Math.random() * monthDropColorValues.length);
  return monthDropColorValues[index];
}

function normalizeTaskBackgroundColorValue(backgroundColor?: string): string {
  const raw = typeof backgroundColor === 'string' ? backgroundColor.trim() : '';
  if (!raw) {
    return '';
  }
  const cssVarMatch = raw.match(/^var\(--(pinch-background(?:10|[1-9]))\)$/);
  if (cssVarMatch) {
    return cssVarMatch[1];
  }
  return raw;
}

function resolveTaskGroupBackgroundColor(task: Pick<Task, 'groupId'>): string {
  const groupId = typeof task.groupId === 'string' ? task.groupId.trim() : '';
  if (!groupId) {
    return '';
  }
  const group = (props.taskGroups || []).find(item => item.id === groupId);
  return normalizeTaskBackgroundColorValue(group?.color);
}

function resolveEffectiveTaskBackgroundColor(task: Pick<Task, 'backgroundColor' | 'groupId'>): string {
  return normalizeTaskBackgroundColorValue(task.backgroundColor) || resolveTaskGroupBackgroundColor(task);
}

function resolveTaskBackgroundColor(backgroundColor?: string): string {
  const raw = normalizeTaskBackgroundColorValue(backgroundColor);
  if (!raw) {
    return 'var(--b3-font-background9)';
  }
  if (/^pinch-background(?:10|[1-9])$/.test(raw)) {
    return `var(--${raw})`;
  }
  if (/^background(1[0-3]|[4-9])$/.test(raw)) {
    return `var(--b3-font-${raw})`;
  }
  return raw;
}

function resolveTaskColorIndex(backgroundColor?: string): number | null {
  const raw = normalizeTaskBackgroundColorValue(backgroundColor);
  if (!raw) {
    return null;
  }
  const pinchMatch = raw.match(/^pinch-background(10|[1-9])$/);
  if (pinchMatch) {
    return Number(pinchMatch[1]);
  }
  const legacyMatch = raw.match(/^background(1[0-3]|[4-9])$/);
  if (legacyMatch) {
    return Number(legacyMatch[1]) - 3;
  }
  return null;
}

function resolveTaskAccentColor(backgroundColor?: string): string {
  const index = resolveTaskColorIndex(backgroundColor) ?? 6;
  return `var(--pinch-color${index})`;
}

function getTasksHash(tasks: Task[]): string {
  return tasks.map(t => 
    `${t.id}:${t.status}:${t.priority}:${t.startDate}:${t.dueDate}:${t.startTime || ''}:${t.dueTime || ''}:${t.title}:${t.backgroundColor || ''}:${t.groupId || ''}`
  ).join('|');
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

watch(() => props.tasks, (newTasks) => {
  taskSyncGuard.syncTasks(newTasks, isDragging.value, getTasksHash);
}, { deep: true, immediate: true });

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

watch(
  visibleCalendarRange,
  ({ start, end }) => {
    emit('visibleRangeChange', {
      startDate: formatDate(start),
      endDate: formatDate(end)
    });
  },
  { immediate: true }
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
  const startDate = new Date(baseDate.value);
  startDate.setHours(0, 0, 0, 0);
  const dayOfWeek = (startDate.getDay() + 6) % 7;
  startDate.setDate(startDate.getDate() - dayOfWeek);
  
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 41);
  
  const formatMonth = (date: Date) => {
    return formatTemplate('date.yearMonthTemplate', {
      year: date.getFullYear(),
      month: date.getMonth() + 1
    });
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

watch(calendarDays, (days) => {
  if (expandedDayKeys.value.size === 0) {
    return;
  }
  const validDayKeys = new Set(days.map(day => day.key));
  let changed = false;
  const next = new Set<string>();
  expandedDayKeys.value.forEach((dayKey) => {
    if (validDayKeys.has(dayKey)) {
      next.add(dayKey);
    } else {
      changed = true;
    }
  });
  if (changed || next.size !== expandedDayKeys.value.size) {
    expandedDayKeys.value = next;
  }
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

watch(
  () => Array.from(expandedDayKeys.value).join('|'),
  () => {
    invalidateMonthDropZoneCache();
  }
);

watch(
  () => Object.entries(weekRowHeights.value)
    .map(([weekKey, height]) => `${weekKey}:${height}`)
    .join('|'),
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

type WeekRenderData = {
  tasks: WeekTask[];
  visibleTasks: WeekTask[];
  hiddenCountByDayKey: Record<string, number>;
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

function getWeekKey(week: any[]): string {
  return week.map((d: any) => d.key).join('-');
}

function getMaxVisibleTasksForWeek(week: any[]): number {
  const weekKey = getWeekKey(week);
  const rowHeight = weekRowHeights.value[weekKey];
  if (!rowHeight) return 3;

  const {
    dateNumberHeight: DATE_NUMBER_HEIGHT,
    slotHeight: SLOT_HEIGHT
  } = monthTaskLayout.value;

  const count = Math.floor((rowHeight - DATE_NUMBER_HEIGHT) / SLOT_HEIGHT);
  
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
    const hiddenCountByDayKey: Record<string, number> = {};
    const weekDayKeySet = new Set(week.map((day) => day.key));

    for (const task of hiddenTasks) {
      const startValue = task.startDate || task.dueDate;
      if (!startValue) continue;

      const taskStart = new Date(startValue);
      if (Number.isNaN(taskStart.getTime())) continue;
      taskStart.setHours(0, 0, 0, 0);

      const startDayKey = formatDate(taskStart);
      if (!weekDayKeySet.has(startDayKey)) continue;

      hiddenCountByDayKey[startDayKey] = (hiddenCountByDayKey[startDayKey] || 0) + 1;
    }

    map.set(weekKey, {
      tasks,
      visibleTasks,
      hiddenCountByDayKey
    });
  }

  return map;
});

function getVisibleTasksForWeek(week: any[]): WeekTask[] {
  const weekKey = getWeekKey(week);
  return weekRenderDataMap.value.get(weekKey)?.visibleTasks || [];
}

function getHiddenTaskCountForDay(day: any, week: any[]): number {
  const weekKey = getWeekKey(week);
  const weekData = weekRenderDataMap.value.get(weekKey);
  if (!weekData) return 0;
  return weekData.hiddenCountByDayKey[day.key] || 0;
}

function shouldShowHiddenCountForDay(day: any, week: any[]): boolean {
  return getHiddenTaskCountForDay(day, week) > 0;
}

function getHiddenTasksLabel(count: number): string {
  return formatTemplate('monthView.moreTasksTemplate', { count });
}

function getPriorityTitle(priority: string | undefined): string {
  if (priority === 'high') return t('taskManager.priorityHighLabel');
  if (priority === 'medium') return t('taskManager.priorityMediumLabel');
  return t('taskManager.priorityLowLabel');
}

function getDayMoreStyle(week: any[]): Record<string, string> {
  const {
    topOffset: TOP_OFFSET,
    positionStep: POSITION_STEP,
    chipHeight: CHIP_HEIGHT
  } = monthTaskLayout.value;
  const maxTasks = getMaxVisibleTasksForWeek(week);
  const rowIndex = Math.max(0, maxTasks - 1);
  const visualHeight = CHIP_HEIGHT + (isCompactMobileLayout.value ? 2 : 6);

  return {
    top: `${TOP_OFFSET + rowIndex * POSITION_STEP}px`,
    height: `${visualHeight}px`
  };
}

function getDayMoreReserveWidthPx(): number {
  return isCompactMobileLayout.value ? 24 : 34;
}

function getTaskMoreReserveWidth(task: WeekTask, week: any[]): number {
  const maxTasks = getMaxVisibleTasksForWeek(week);
  const rowIndex = Math.max(0, maxTasks - 1);
  const position = task.position ?? (taskPositionsMap.value.get(task.id) ?? 0);
  if (position !== rowIndex) {
    return 0;
  }

  const weekData = weekRenderDataMap.value.get(getWeekKey(week));
  const endDay = week[task.endDayOfWeek];
  if (!weekData || !endDay) {
    return 0;
  }

  return (weekData.hiddenCountByDayKey[endDay.key] || 0) > 0 ? getDayMoreReserveWidthPx() : 0;
}

function isDayExpanded(dayKey: string): boolean {
  return expandedDayKeys.value.has(dayKey);
}

function expandDayTasks(dayKey: string): void {
  if (!dayKey) return;
  expandedDayKeys.value = new Set([dayKey]);
}

function collapseDayTasks(dayKey: string): void {
  if (!dayKey || !expandedDayKeys.value.has(dayKey)) return;
  const next = new Set(expandedDayKeys.value);
  next.delete(dayKey);
  expandedDayKeys.value = next;
}

function getExpandedTasksForDay(day: any, week: any[]): WeekTask[] {
  const weekKey = getWeekKey(week);
  const weekData = weekRenderDataMap.value.get(weekKey);
  if (!weekData) return [];

  const dayIndex = week.findIndex(item => item.key === day.key);
  if (dayIndex < 0) return [];

  return weekData.tasks
    .filter(task => task.startDayOfWeek <= dayIndex && task.endDayOfWeek >= dayIndex)
    .sort((a, b) => {
      const positionDelta = (a.position ?? 0) - (b.position ?? 0);
      if (positionDelta !== 0) {
        return positionDelta;
      }
      const startDelta = a.startDayOfWeek - b.startDayOfWeek;
      if (startDelta !== 0) {
        return startDelta;
      }
      return (a.title || '').localeCompare(b.title || '', 'zh-CN');
    });
}

function getTaskStyle(task: any, week: any[]) {
  const {
    positionStep: TASK_POSITION_STEP,
    chipHeight: TASK_CHIP_HEIGHT,
    topOffset: TOP_OFFSET
  } = monthTaskLayout.value;
  const weekStart = new Date(week[0].date);
  weekStart.setHours(0, 0, 0, 0);
  
  const leftPercent = (task.startDayOfWeek / 7) * 100;
  const widthPercent = (task.spanDays / 7) * 100;
  const widthOffset = (isCompactMobileLayout.value ? 6 : 24) + getTaskMoreReserveWidth(task, week);
  const effectiveBackgroundColor = resolveEffectiveTaskBackgroundColor(task);
  const bgColor = resolveTaskBackgroundColor(effectiveBackgroundColor);
  
  const position = task.position ?? (taskPositionsMap.value.get(task.id) ?? 0);
  
    return {
      position: 'absolute' as const,
      left: `${leftPercent}%`,
      width: `calc(${widthPercent}% - ${widthOffset}px)`,
      top: `${TOP_OFFSET + position * TASK_POSITION_STEP}px`,
      height: `${TASK_CHIP_HEIGHT}px`,
      backgroundColor: bgColor,
    '--pinch-task-chip-color': resolveTaskAccentColor(effectiveBackgroundColor)
  };
}

function getExpandedTaskChipStyle(task: WeekTask): Record<string, string> {
  const effectiveBackgroundColor = resolveEffectiveTaskBackgroundColor(task);
  return {
    backgroundColor: resolveTaskBackgroundColor(effectiveBackgroundColor),
    '--pinch-task-chip-color': resolveTaskAccentColor(effectiveBackgroundColor)
  };
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

async function applyTaskDropToDay(task: Task, day: MonthCalendarDay): Promise<void> {
  try {
    const dateStr = formatDate(day.date);
    const existingBackgroundColor = normalizeTaskBackgroundColorValue(task.backgroundColor);
    const assignedBackgroundColor = existingBackgroundColor
      ? undefined
      : (resolveTaskGroupBackgroundColor(task) || pickRandomTaskBackgroundColor());
    
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

async function handleDrop(day: MonthCalendarDay) {
  clearDragOverState();
  
  if (day.isOtherMonth) return;
  
  const event = window.event as DragEvent;
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
  expandedDayKeys.value = new Set();
  baseDate.value = new Date(baseDate.value.getFullYear(), baseDate.value.getMonth() - 1, 1);
}

function nextMonth() {
  expandedDayKeys.value = new Set();
  baseDate.value = new Date(baseDate.value.getFullYear(), baseDate.value.getMonth() + 1, 1);
}

function handleWheel(event: WheelEvent) {
  event.preventDefault();
  expandedDayKeys.value = new Set();
  
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
  showTaskContextMenu(task, {
    x: event.clientX,
    y: event.clientY
  });
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
    const clickedInsideInteractiveChip = !!targetElement?.closest('.task-chip, .context-menu, .mobile-drag-preview, .time-popover-overlay, .time-popover, .date-popover-overlay, .date-popover');
    if (!clickedInsideInteractiveChip) {
      selectMobileTaskChip(null);
    }
  }

  if (expandedDayKeys.value.size > 0) {
    const clickedInsideExpandedPanel = !!targetElement?.closest('.day-expanded-panel');
    const clickedExpandTrigger = !!targetElement?.closest('.more-tasks-placeholder.day-more');
    const clickedInsideContextMenu = !!targetElement?.closest('.context-menu, .time-popover-overlay, .time-popover, .date-popover-overlay, .date-popover, .repeat-dialog-overlay, .repeat-dialog');
    if (!clickedInsideExpandedPanel && !clickedExpandTrigger && !clickedInsideContextMenu) {
      expandedDayKeys.value = new Set();
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
  contextMenuDateDraft.value = { startDate: '', startTime: '', dueDate: '', dueTime: '' };
  contextMenuRepeatFrequency.value = 'none';
  contextMenuRepeatRule.value = null;
}

async function applyTaskDates(task: Task) {
  if (!task) return;

  const nextStartDate = contextMenuDateDraft.value.startDate || null;
  let nextDueDate = contextMenuDateDraft.value.dueDate || null;
  const nextStartTime = contextMenuDateDraft.value.startTime || null;
  const nextDueTime = contextMenuDateDraft.value.dueTime || null;
  if (nextStartDate && nextDueDate && nextDueDate < nextStartDate) {
    nextDueDate = nextStartDate;
  }

  const isRepeatTask = !!task.repeatSeriesId || (!!task.repeatFrequency && task.repeatFrequency !== 'none');
  if (isRepeatTask) {
    const updatedSeries = await updateRepeatSeriesDates(
      task,
      nextStartDate,
      nextDueDate,
      {
        startTime: nextStartTime,
        dueTime: nextDueTime
      },
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
          dueDate: updatedSeries.endDate || null,
          startTime: updatedSeries.startTime || undefined,
          dueTime: updatedSeries.dueTime || undefined
        });
        if (updatedTask) {
          emitTaskDateChanged(updatedTask);
        }
        if (templateTask.type === 'block' && templateTask.blockId) {
          try {
            await setBlockAttrs(templateTask.blockId, {
              'custom-task-start-date': updatedSeries.startDate || '',
              'custom-task-due-date': updatedSeries.endDate || '',
              'custom-task-start-time': updatedSeries.startTime || '',
              'custom-task-due-time': updatedSeries.dueTime || ''
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
    dueDate: nextDueDate,
    startTime: nextStartTime || undefined,
    dueTime: nextDueTime || undefined
  });
  if (updatedTask) {
    emitTaskDateChanged(updatedTask);
  }

  if (task.type === 'block' && task.blockId) {
    try {
      await setBlockAttrs(task.blockId, {
        'custom-task-start-date': nextStartDate || '',
        'custom-task-due-date': nextDueDate || '',
        'custom-task-start-time': nextStartTime || '',
        'custom-task-due-time': nextDueTime || ''
      });
    } catch (error) {
    }
  }

  hideContextMenu();
}

async function clearTaskDates(task: Task): Promise<void> {
  if (!task) return;

  const isRepeatTask = !!task.repeatSeriesId || (!!task.repeatFrequency && task.repeatFrequency !== 'none');
  if (isRepeatTask) {
    const seriesId = task.repeatSeriesId;
    const templateTask = !task.isVirtual
      ? task
      : localTasks.value.find(item => !item.isVirtual && !!seriesId && item.repeatSeriesId === seriesId);
    const targetTask = templateTask || task;

    localTasks.value = localTasks.value.filter(
      item => !item.isVirtual || item.repeatSeriesId !== seriesId
    );

    notifyRepeatChanged({
      blockId: targetTask.blockId,
      seriesId: seriesId,
      frequency: 'none'
    });

    const patchedTask = patchLocalTask(targetTask.id, {
      repeatFrequency: 'none',
      repeatSeriesId: undefined,
      repeatInstanceDate: undefined,
      isVirtual: false,
      startDate: null,
      dueDate: null,
      startTime: undefined,
      dueTime: undefined
    });

    if (patchedTask) {
      emitTaskDateChanged(patchedTask);
    }

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

    try {
      await TaskRepository.setTaskRepeatRule(targetTask, 'none');
    } catch (error) {
    }

    hideContextMenu();
    return;
  }

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
      // setTaskBackgroundColor error
    }
  }

  if (isRepeatTask) {
    try {
      await updateRepeatSeriesBackgroundColor(persistenceTarget, color);
    } catch (error) {
      // updateRepeatSeriesBackgroundColor error
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
  syncCompactMobileLayout();
  window.addEventListener('resize', syncCompactMobileLayout);
  document.addEventListener('pointermove', handleDocumentMobileTaskPointerMove);
  document.addEventListener('pointerup', handleDocumentMobileTaskPointerUp);
  document.addEventListener('pointercancel', handleDocumentMobileTaskPointerCancel);
  document.addEventListener('pointermove', handleDocumentMobileTaskChipPointerMove);
  document.addEventListener('pointerup', handleDocumentMobileTaskChipPointerUp);
  document.addEventListener('pointercancel', handleDocumentMobileTaskChipPointerCancel);

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
  if (shouldSuppressTaskClick(task.id)) {
    return;
  }
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
  clearMobileTaskDrag();
  clearMobileTaskChipGesture({ restorePreview: true });
  document.removeEventListener('pointermove', handleDocumentMobileTaskPointerMove);
  document.removeEventListener('pointerup', handleDocumentMobileTaskPointerUp);
  document.removeEventListener('pointercancel', handleDocumentMobileTaskPointerCancel);
  document.removeEventListener('pointermove', handleDocumentMobileTaskChipPointerMove);
  document.removeEventListener('pointerup', handleDocumentMobileTaskChipPointerUp);
  document.removeEventListener('pointercancel', handleDocumentMobileTaskChipPointerCancel);
  window.removeEventListener('resize', syncCompactMobileLayout);
  taskSyncGuard.clearAllTaskSyncLocks();
  removeEventListeners();

  eventManager.clear();
  unbindContextMenuOutsidePointerDown();

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
  padding: 4px 10px;
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
  display: flex;
  align-items: center;
  justify-content: flex-end;
  pointer-events: none;
  z-index: 9;
}

.more-tasks-pill {
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

.more-tasks-pill:hover {
  background: var(--b3-font-background2);
}

.more-tasks-placeholder.day-more {
  left: 4px;
  right: 4px;
  --more-pill-reserve-width: 30px;
  font-size: 11px;
}

.day-expanded-panel {
  position: absolute;
  left: 4px;
  right: 4px;
  top: 28px;
  border: 1px solid var(--b3-border-color);
  border-radius: 8px;
  background: var(--b3-theme-background);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  z-index: 30;
  display: flex;
  flex-direction: column;
  overflow: visible;
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
    left: 4px;
  }

  .task-chip .task-handle-right {
    right: -7px;
  }

  .task-chip .task-handle-right::after {
    right: 4px;
  }

  .task-chip:hover {
    box-shadow: 0 0 0 2px var(--pinch-task-chip-color, var(--pinch-color6));
    z-index: 25;
  }

  .task-chip:hover .task-handle::after {
    display: block;
  }
}

.day-expanded-chip,
.task-chip,
.task-chip-title {
  -webkit-touch-callout: none;
  touch-action: none;
}

@media (max-width: 768px) {
  .day-cell.drag-over {
    background: var(--b3-theme-background);
    border: none;
  }

  .calendar-header {
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

  .task-chip {
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
    left: 7px;
  }

  .task-handle-right {
    right: -10px;
  }

  .task-handle-right::after {
    right: 7px;
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

  .placeholder-text,
  .more-tasks-placeholder {
    font-size: 9px;
  }

  .more-tasks-pill {
    padding: 0 5px;
  }

  .more-tasks-placeholder.day-more {
    --more-pill-reserve-width: 30px;
    font-size: 9px;
  }

  .day-expanded-panel {
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
