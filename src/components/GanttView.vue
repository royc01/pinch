<template>
  <div
    class="gantt-view"
    @dragover="handleExternalTaskDragOver"
    @dragleave="handleExternalTaskDragLeave"
    @drop="handleExternalTaskDrop"
  >
    <div ref="ganttShellRef" class="gantt-shell">
      <div class="gantt-toolbar">
        <div class="gantt-range-nav">
          <button type="button" class="gantt-toolbar-btn" :title="t('ganttView.previousRange')" @click="shiftTimeline(-1)">
            <Icon name="chevronLeft" width="20" height="20" />
          </button>
          <button type="button" class="gantt-toolbar-btn today" @click="resetTimeline">
            {{ t('ganttView.today') }}
          </button>
          <button type="button" class="gantt-toolbar-btn" :title="t('ganttView.nextRange')" @click="shiftTimeline(1)">
            <Icon name="chevronRight" width="20" height="20" />
          </button>
        </div>
        <div class="gantt-range-options">
          <button
            v-for="weeks in timelineWeekOptions"
            :key="weeks"
            type="button"
            class="gantt-toolbar-btn"
            :class="{ active: timelineWeeks === weeks }"
            @click="setTimelineWeeks(weeks)"
          >
            {{ formatTimelineWeekOption(weeks) }}
          </button>
        </div>
      </div>
      <div class="gantt-grid" :style="gridStyle">
        <div class="gantt-corner" :style="{ gridColumn: '1', gridRow: '1' }"></div>
        <div class="gantt-header-row-border" :style="{ gridColumn: '1 / -1', gridRow: '1' }"></div>
        <div
          v-for="(day, dayIndex) in timelineDays"
          :key="day.key"
          class="gantt-day-header"
          :class="{ today: day.isToday, weekend: day.isWeekend }"
          :style="{ gridColumn: `${dayIndex + 2}`, gridRow: '1' }"
        >
          <span class="gantt-day-month">{{ day.monthLabel }}</span>
          <span class="gantt-day-date">{{ day.dayLabel }}</span>
        </div>

        <div
          v-for="group in renderGroups"
          :key="group.key"
          class="gantt-group-panel"
          :class="{ 'group-start': group.offsetTop }"
          :style="{
            gridColumn: '1 / -1',
            gridRow: `${group.startRow} / span ${group.rowSpan}`
          }"
        ></div>
        <template v-for="group in renderGroups" :key="`${group.key}:deadline`">
          <div
            v-if="group.deadlineStyle"
            class="gantt-deadline-marker"
            :style="group.deadlineStyle"
            :title="group.deadlineTitle"
          ></div>
        </template>

        <template v-for="(row, rowIndex) in renderRows" :key="row.key">
          <button
            v-if="row.kind === 'section'"
            type="button"
            class="gantt-row-label gantt-section-label"
            :class="{ collapsed: row.collapsed, 'group-start': shouldOffsetGroupStart(rowIndex) }"
            :title="row.title"
            :aria-expanded="!row.collapsed"
            :style="{ gridColumn: '1', gridRow: `${rowIndex + 2}` }"
            @click="toggleSection(row.sectionId)"
          >
            <span class="gantt-section-toggle" aria-hidden="true"></span>
            <span class="gantt-section-icon">{{ row.emoji }}</span>
            <button
              type="button"
              class="gantt-row-title gantt-row-title-btn"
              @pointerdown.stop
              @mousedown.stop
              @click.stop.prevent="emit('manage-goals')"
            >
              {{ row.title }}
            </button>
            <span
              v-if="row.dueDateLabel"
              class="goal-due-date-info"
              :class="{ 'is-overdue': row.isOverdue }"
            >
              {{ row.dueDateLabel }}
            </span>
            <span class="gantt-section-count">{{ row.taskCount }}</span>
          </button>
          <button
            v-else-if="row.kind === 'unscheduled-toggle'"
            type="button"
            class="gantt-row-label gantt-unscheduled-row-label gantt-unscheduled-control-row"
            :title="row.title"
            :aria-expanded="row.expanded"
            :style="{ gridColumn: '1', gridRow: `${rowIndex + 2}` }"
            @click="toggleUnscheduledRows(row.sectionId)"
          >
            <span class="gantt-unscheduled-control-inner">
              <span class="collapse-btn">
                <Icon
                  :name="row.expanded ? 'chevronsHorizontal' : 'chevronsVertical'"
                  width="16"
                  height="16"
                />
              </span>
              <span class="gantt-row-title">{{ row.title }}</span>
              <span class="gantt-section-count">{{ row.taskCount }}</span>
            </span>
          </button>
          <div
            v-else
            class="gantt-row-label"
            :class="{ 'gantt-unscheduled-row-label': row.isUnscheduled }"
            :title="row.title"
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
              class="gantt-row-title gantt-row-title-btn"
              draggable="false"
              @pointerdown.stop
              @mousedown.stop
              @dragstart.stop.prevent
              @click.stop.prevent="emit('edit-task', row.primaryTask, $event)"
            >
              {{ row.title }}
            </button>
            <span
              v-if="isRepeatTask(row.primaryTask)"
              class="gantt-row-repeat-badge"
              :title="t('taskCard.repeatTask')"
              :aria-label="t('taskCard.repeatTask')"
            >
              <Icon name="repeat" width="12" height="12" />
            </span>
            <button
              type="button"
              class="task-card-action-btn task-card-open-btn gantt-row-open-btn"
              :title="t('taskCard.openContent')"
              :aria-label="t('taskCard.openContent')"
              @mousedown.stop
              @click.stop.prevent="emit('task-click', row.primaryTask)"
            >
              <Icon name="moreHorizontal" width="14" height="14" />
            </button>
          </div>
          <div
            v-if="row.kind !== 'unscheduled-toggle'"
            v-for="(day, dayIndex) in timelineDays"
            :key="`${row.key}:${day.key}`"
            class="gantt-day-cell"
            :class="{
              today: day.isToday,
              weekend: day.isWeekend,
              section: row.kind === 'section',
              'drop-target': dragOverDayKey === day.key,
              'group-start': shouldOffsetGroupStart(rowIndex)
            }"
            :style="{ gridColumn: `${dayIndex + 2}`, gridRow: `${rowIndex + 2}` }"
          ></div>
          <div
            v-if="row.kind === 'section' && row.summaryBarStyle"
            class="gantt-summary-bar"
            :class="{ overdue: row.isOverdue, risk: row.hasScheduleRisk, completed: row.completedTasks >= row.taskCount, 'group-start': shouldOffsetGroupStart(rowIndex) }"
            :style="{
              ...row.summaryBarStyle,
              '--gantt-summary-progress': `${row.summaryProgress}%`
            }"
            :title="row.summaryTitle"
          >
            <span class="gantt-summary-bar-fill" aria-hidden="true"></span>
            <span class="gantt-summary-bar-title">{{ row.summaryText }}</span>
          </div>
          <button
            v-for="bar in row.kind === 'task' ? row.bars : []"
            :key="bar.key"
            type="button"
            class="gantt-bar"
            :class="[`priority-${bar.task.priority}`, { completed: bar.task.status === 'completed', dragging: draggingTaskId === bar.task.id, risk: bar.isBeyondSectionDue }]"
            :style="getTaskBarStyle(bar)"
            :title="bar.title"
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
import Icon from './Icon.vue';
import TaskContextMenu from './TaskContextMenu.vue';
import TaskCheckbox from './TaskCheckbox.vue';
import { useI18n } from '@/composables/useI18n';
import { getRepeatSeriesForTask } from '@/repeatRepository';
import type { RepeatFrequency, RepeatRule, RepeatRuleInput } from '@/repeatRepository';

const DAY_MS = 24 * 60 * 60 * 1000;
const LABEL_COLUMN_WIDTH = 240;
const MIN_DAY_COLUMN_WIDTH = 46;
const timelineWeekOptions = [2, 6, 12] as const;

const props = defineProps<{
  tasks: Task[];
  goals?: Goal[];
  taskGroups?: TaskGroup[];
  groupMode?: GanttGroupMode;
  documentTitleByRootId?: Map<string, string>;
}>();

const emit = defineEmits<{
  'task-click': [task: Task];
  'task-date-changed': [task: Task];
  'start-focus': [task: Task];
  'edit-task': [task: Task, event?: MouseEvent];
  'status-toggle': [task: Task];
  'manage-goals': [];
}>();

const { t } = useI18n();
const formatTemplate = (key: string, values: Record<string, string | number>): string => {
  return Object.entries(values).reduce(
    (result, [name, value]) => result.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value)),
    t(key)
  );
};
const collapsedSectionIds = ref<Set<string>>(new Set());
const expandedUnscheduledSectionIds = ref<Set<string>>(new Set());
const timelineAnchor = ref(startOfDay(new Date()));
const timelineWeeks = ref<(typeof timelineWeekOptions)[number]>(6);
const draggingTaskId = ref<string | null>(null);
const dragDeltaDays = ref(0);
const dragMode = ref<GanttDragMode | null>(null);
const optimisticTaskDates = ref<Map<string, { startDate: string; dueDate: string }>>(new Map());
const dragOverDayKey = ref<string | null>(null);
const externalDropTask = ref<Task | null>(null);
const ganttShellRef = ref<HTMLElement | null>(null);
const shellWidth = ref(0);
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

interface GanttDragState {
  task: Task;
  rowStart: Date;
  rowEnd: Date;
  mode: GanttDragMode;
  startX: number;
  lastDeltaDays: number;
  hasMoved: boolean;
}

let dragState: GanttDragState | null = null;
let resizeObserver: ResizeObserver | null = null;
let contextMenuOutsidePointerBound = false;
const optimisticTaskDateTimers = new Map<string, number>();

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

interface ExternalDropResolution {
  task: Task;
  day: Date;
  startDate: Date;
  endDate: Date;
}

interface TimelineDay {
  key: string;
  monthLabel: string;
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
    title: string;
    taskCount: number;
    expanded: boolean;
  }
  | (GanttRow & { kind: 'task' });

interface GanttRenderGroup {
  key: string;
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

function normalizeTaskBackgroundColorValue(backgroundColor?: string): string {
  const raw = typeof backgroundColor === 'string' ? backgroundColor.trim() : '';
  if (!raw) return '';
  const cssVarMatch = raw.match(/^var\(--(pinch-background(?:10|[1-9]))\)$/);
  if (cssVarMatch) return cssVarMatch[1];
  return raw;
}

function resolveTaskGroupBackgroundColor(task: Pick<Task, 'groupId'>): string {
  const groupId = typeof task.groupId === 'string' ? task.groupId.trim() : '';
  if (!groupId) return '';
  const group = (props.taskGroups || []).find(item => item.id === groupId);
  return normalizeTaskBackgroundColorValue(group?.color);
}

function resolveEffectiveTaskBackgroundColor(task: Pick<Task, 'backgroundColor' | 'groupId'>): string {
  return normalizeTaskBackgroundColorValue(task.backgroundColor) || resolveTaskGroupBackgroundColor(task);
}

function resolveTaskBackgroundColor(backgroundColor?: string): string {
  const raw = normalizeTaskBackgroundColorValue(backgroundColor);
  if (!raw) return 'var(--b3-font-background9)';
  if (/^pinch-background(?:10|[1-9])$/.test(raw)) return `var(--${raw})`;
  if (/^background(1[0-3]|[4-9])$/.test(raw)) return `var(--b3-font-${raw})`;
  return raw;
}

function resolveTaskColorIndex(backgroundColor?: string): number | null {
  const raw = normalizeTaskBackgroundColorValue(backgroundColor);
  if (!raw) return null;
  const pinchMatch = raw.match(/^pinch-background(10|[1-9])$/);
  if (pinchMatch) return Number(pinchMatch[1]);
  const legacyMatch = raw.match(/^background(1[0-3]|[4-9])$/);
  if (legacyMatch) return Number(legacyMatch[1]) - 3;
  return null;
}

function resolveTaskAccentColor(backgroundColor?: string): string {
  const index = resolveTaskColorIndex(backgroundColor) ?? 6;
  return `var(--pinch-color${index})`;
}

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
  const effectiveBackgroundColor = resolveEffectiveTaskBackgroundColor(task);
  return {
    backgroundColor: resolveTaskBackgroundColor(effectiveBackgroundColor),
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
    '.context-menu, .time-popover-overlay, .time-popover, .date-popover-overlay, .date-popover, .repeat-dialog-overlay, .repeat-dialog'
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
  hideContextMenu();
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
  hideContextMenu();
}

async function setTaskBackgroundColor(task: Task, color: string): Promise<void> {
  if (!task) return;
  const updatedTask = { ...task, backgroundColor: color };
  try {
    await TaskRepository.updateTask(task.id, { backgroundColor: color });
  } catch (error) {
    console.error('[GanttView] failed to update task color', error);
  }
  emit('task-date-changed', updatedTask);
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

function handleTaskBarPointerUp(): void {
  if (!dragState) return;
  const state = dragState;

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

onBeforeUnmount(() => {
  cleanupTaskBarDrag();
  unbindContextMenuOutsidePointerDown();
  optimisticTaskDateTimers.forEach(timer => window.clearTimeout(timer));
  optimisticTaskDateTimers.clear();
  resizeObserver?.disconnect();
  resizeObserver = null;
  window.removeEventListener('resize', updateShellWidth);
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
  const offsetX = event.clientX - rect.left - LABEL_COLUMN_WIDTH;
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
  externalDropTask.value = null;
}

function handleExternalTaskDragOver(event: DragEvent): void {
  const day = resolveTimelineDayFromEvent(event);
  if (!day || !hasExternalTaskDragData(event)) {
    clearExternalDropState();
    return;
  }
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
  dragOverDayKey.value = formatDate(day);
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
  clearExternalDropState();
  if (!resolution) return;
  event.preventDefault();
  emit('task-date-changed', {
    ...resolution.task,
    startDate: formatDate(resolution.startDate),
    dueDate: formatDate(resolution.endDate)
  });
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

const today = computed(() => startOfDay(new Date()));
const timelineDayCount = computed(() => timelineWeeks.value * 7);
const timelineStart = computed(() => addDays(timelineAnchor.value, -7));
const timelineEnd = computed(() => addDays(timelineStart.value, timelineDayCount.value - 1));
const effectiveDayColumnWidth = computed(() => {
  const availableTimelineWidth = shellWidth.value - LABEL_COLUMN_WIDTH;
  if (availableTimelineWidth <= 0) return MIN_DAY_COLUMN_WIDTH;
  return Math.max(MIN_DAY_COLUMN_WIDTH, Math.floor(availableTimelineWidth / timelineDayCount.value));
});

function updateShellWidth(): void {
  shellWidth.value = ganttShellRef.value?.clientWidth || 0;
}

function getTodayColumnIndex(): number {
  const offset = Math.round((today.value.getTime() - timelineStart.value.getTime()) / DAY_MS);
  return offset >= 0 && offset < timelineDayCount.value ? offset : -1;
}

function scrollTodayIntoView(): void {
  const shell = ganttShellRef.value;
  const todayIndex = getTodayColumnIndex();
  if (!shell || todayIndex < 0) return;

  const visibleTimelineWidth = Math.max(0, shell.clientWidth - LABEL_COLUMN_WIDTH);
  const visibleTimelineStart = shell.scrollLeft + LABEL_COLUMN_WIDTH;
  const visibleTimelineEnd = shell.scrollLeft + shell.clientWidth;
  const todayLeft = LABEL_COLUMN_WIDTH + todayIndex * effectiveDayColumnWidth.value;
  const todayRight = todayLeft + effectiveDayColumnWidth.value;
  if (todayLeft >= visibleTimelineStart && todayRight <= visibleTimelineEnd) return;

  const targetLeft = Math.max(0, todayLeft - LABEL_COLUMN_WIDTH - Math.floor(visibleTimelineWidth * 0.25));
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
  void nextTick(() => {
    updateShellWidth();
    if (typeof ResizeObserver !== 'undefined' && ganttShellRef.value) {
      resizeObserver = new ResizeObserver(() => updateShellWidth());
      resizeObserver.observe(ganttShellRef.value);
    } else {
      window.addEventListener('resize', updateShellWidth);
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

const timelineDays = computed<TimelineDay[]>(() => {
  const todayKey = formatDateKey(today.value);
  return Array.from({ length: timelineDayCount.value }, (_, index) => {
    const date = addDays(timelineStart.value, index);
    const weekday = date.getDay();
    return {
      key: formatDateKey(date),
      monthLabel: formatTemplate('date.monthLabelTemplate', {
        month: date.getMonth() + 1
      }),
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

  const bars = props.tasks
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

function canRenderTaskAsBar(task: Task): boolean {
  const dueDate = parseTaskDate(task.dueDate);
  if (isRepeatTask(task) && !dueDate) return false;
  return !!parseTaskDate(task.startDate || task.dueDate) && !!(dueDate || parseTaskDate(task.startDate));
}

function getRepeatSeriesId(task: Task): string {
  return typeof task.repeatSeriesId === 'string' ? task.repeatSeriesId.trim() : '';
}

function isTaskInGoal(task: Task, goal: Goal): boolean {
  const notebookId = typeof task.notebookId === 'string' ? task.notebookId.trim() : '';
  const rootId = typeof task.rootId === 'string' ? task.rootId.trim() : '';
  if (!notebookId || !rootId) return false;

  return goal.members.some((member) =>
    member.notebookId === notebookId && member.documentId === rootId
  );
}

function hasExplicitTaskRange(task: Task): boolean {
  return !!parseTaskDate(task.startDate) && !!parseTaskDate(task.dueDate);
}

function isTaskInAnyGoal(task: Task, goals: Goal[]): boolean {
  return goals.some(goal => isTaskInGoal(task, goal));
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

function buildGoalUnscheduledRows(goal: Goal, scheduledRows: GanttRow[]): GanttRow[] {
  const scheduledRepeatSeriesIds = new Set<string>();
  scheduledRows.forEach((row) => {
    row.bars.forEach((bar) => {
      const repeatSeriesId = getRepeatSeriesId(bar.task);
      if (repeatSeriesId) scheduledRepeatSeriesIds.add(repeatSeriesId);
    });
  });

  const rowByKey = new Map<string, GanttRow>();
  props.tasks.forEach((task) => {
    if (canRenderTaskAsBar(task) || !isTaskInGoal(task, goal)) return;

    const repeatSeriesId = getRepeatSeriesId(task);
    if (repeatSeriesId && scheduledRepeatSeriesIds.has(repeatSeriesId)) return;

    const row = buildUnscheduledTaskRow(task);
    if (!rowByKey.has(row.key)) {
      rowByKey.set(row.key, row);
    }
  });

  return Array.from(rowByKey.values())
    .sort((left, right) => left.title.localeCompare(right.title, 'zh-Hans-CN'));
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

function getTaskDocumentId(task: Task): string {
  const notebookId = typeof task.notebookId === 'string' ? task.notebookId.trim() : '';
  const rootId = typeof task.rootId === 'string' ? task.rootId.trim() : '';
  return notebookId && rootId ? `${notebookId}:${rootId}` : 'unassigned';
}

function buildGoalSections(): GanttSection[] {
  const goals = Array.isArray(props.goals) ? props.goals : [];
  const sections: GanttSection[] = [];

  goals.forEach((goal) => {
    const scheduledRows = scheduledTaskRows.value.filter((row) => row.bars.some(bar => isTaskInGoal(bar.task, goal)));
    const unscheduledRows = buildGoalUnscheduledRows(goal, scheduledRows);
    const rows = [...scheduledRows, ...unscheduledRows];
    const summaryTasks = props.tasks.filter(task => isTaskInGoal(task, goal));
    if (rows.length === 0 && summaryTasks.length === 0) return;

    const dueDate = parseTaskDate(goal.dueDate);
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

  const unassignedSummaryTasks = props.tasks.filter(task =>
    hasExplicitTaskRange(task) && !isTaskInAnyGoal(task, goals)
  );
  const unassignedRows = scheduledTaskRows.value
    .map<GanttRow | null>((row) => {
      const bars = row.bars.filter(bar =>
        hasExplicitTaskRange(bar.task) && !isTaskInAnyGoal(bar.task, goals)
      );
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
  if (unassignedRows.length > 0 || unassignedSummaryTasks.length > 0) {
    sections.push({
      id: 'unassigned',
      title: t('ganttView.unassignedGoal'),
      emoji: '•',
      rows: unassignedRows,
      summaryTasks: unassignedSummaryTasks
    });
  }

  return sections;
}

function buildDocumentSections(): GanttSection[] {
  const sectionByDocument = new Map<string, GanttSection>();
  const summaryTasksByDocument = new Map<string, Task[]>();

  props.tasks.forEach((task) => {
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
      summaryTasks: summaryTasksByDocument.get(id) || []
    });
  });

  return Array.from(sectionByDocument.values()).sort((left, right) =>
    left.title.localeCompare(right.title, 'zh-Hans-CN')
  );
}

function buildSectionSummary(
  section: GanttSection,
  gridRow: number
): Pick<Extract<GanttRenderRow, { kind: 'section' }>, 'completedTasks' | 'summaryProgress' | 'summaryText' | 'summaryTitle' | 'summaryBarStyle' | 'deadlineStyle' | 'deadlineTitle' | 'isOverdue' | 'hasScheduleRisk'> {
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

function toggleUnscheduledRows(sectionId: string): void {
  const next = new Set(expandedUnscheduledSectionIds.value);
  if (next.has(sectionId)) {
    next.delete(sectionId);
  } else {
    next.add(sectionId);
  }
  expandedUnscheduledSectionIds.value = next;
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

const renderRows = computed<GanttRenderRow[]>(() => {
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
    const unscheduledExpanded = expandedUnscheduledSectionIds.value.has(section.id);
    const pushUnscheduledToggleRow = (): void => {
      if (unscheduledRows.length === 0) return;
      rows.push({
        kind: 'unscheduled-toggle',
        key: `${section.id}:unscheduled-toggle`,
        sectionId: section.id,
        title: t('ganttView.moreUnscheduledTasks'),
        taskCount: unscheduledRows.length,
        expanded: unscheduledExpanded
      });
    };

    scheduledRows.forEach((row) => {
      const gridRow = rows.length + 2;
      rows.push({
        ...row,
        kind: 'task',
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

    if (!unscheduledExpanded) {
      pushUnscheduledToggleRow();
      return;
    }

    unscheduledRows.forEach((row) => {
      rows.push({
        ...row,
        kind: 'task',
        key: `${section.id}:${row.key}`,
        bars: []
      });
    });
    pushUnscheduledToggleRow();
  };

  if (props.groupMode === 'none') {
    const rows: GanttRenderRow[] = scheduledTaskRows.value.map((row, index) => ({
      ...row,
      kind: 'task',
      key: row.key,
      bars: row.bars.map(bar => ({
        ...bar,
        barStyle: {
          ...bar.barStyle,
          gridRow: `${index + 2}`
        }
      }))
    }));
    return rows;
  }

  const rows: GanttRenderRow[] = [];
  ganttSections.value.forEach((section) => {
    appendSection(rows, section);
  });
  return rows;
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

  const groups: GanttRenderGroup[] = [];
  renderRows.value.forEach((row, index) => {
    if (row.kind !== 'section') return;
    const nextSectionIndex = renderRows.value.findIndex((candidate, candidateIndex) =>
      candidateIndex > index && candidate.kind === 'section'
    );
    const endIndex = nextSectionIndex === -1 ? renderRows.value.length : nextSectionIndex;
    const shouldOffset = index > 0;
    const unscheduledToggleIndex = renderRows.value.findIndex((candidate, candidateIndex) =>
      candidateIndex > index
      && candidateIndex < endIndex
      && candidate.kind === 'unscheduled-toggle'
    );
    const markerStartIndex = index;
    const markerEndIndex = unscheduledToggleIndex === -1 ? endIndex : unscheduledToggleIndex;
    const markerRowSpan = Math.max(0, markerEndIndex - markerStartIndex);
    const deadlineStyle = row.deadlineStyle
      ? {
        ...row.deadlineStyle,
        marginTop: shouldOffset ? '10px' : '0',
        gridRow: `${markerStartIndex + 2} / span ${markerRowSpan}`
      }
      : null;
    groups.push({
      key: `group-panel:${row.sectionId}`,
      startRow: index + 2,
      rowSpan: Math.max(1, endIndex - index),
      offsetTop: shouldOffset,
      deadlineStyle: markerRowSpan > 0 ? deadlineStyle : null,
      deadlineTitle: row.deadlineTitle
    });
  });
  return groups;
});

const gridStyle = computed(() => ({
  gridTemplateColumns: `${LABEL_COLUMN_WIDTH}px repeat(${timelineDayCount.value}, ${effectiveDayColumnWidth.value}px)`
}));
</script>

<style scoped>
.gantt-view {
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
  overflow: auto;
}

.gantt-toolbar {
  position: sticky;
  left: 0;
  z-index: 6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: min(100vw, 100%);
  min-width: 0;
  padding: 4px 10px;
  border-bottom: 1px solid var(--b3-theme-border);
  background: var(--b3-theme-surface);
  box-sizing: border-box;
}

.gantt-range-nav,
.gantt-range-options {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.gantt-toolbar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 10px;
  border: none;
  border-radius: 4px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  font-size: 12px;
  line-height: 32px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.gantt-toolbar-btn:hover {
  background: var(--b3-theme-background);
}

.gantt-toolbar-btn.active,
.gantt-toolbar-btn.today {
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
}

.gantt-toolbar-btn.active:hover,
.gantt-toolbar-btn.today:hover {
  background: var(--b3-theme-background);
}

.gantt-grid {
  position: relative;
  display: grid;
  grid-auto-rows: 42px;
  min-width: 100%;
}

.gantt-group-panel {
  position: relative;
  z-index: 0;
  background: var(--b3-theme-background);
  pointer-events: none;
}

.gantt-corner,
.gantt-day-header {
  position: sticky;
  top: 0;
  z-index: 3;
  background: var(--b3-theme-background);
}

.gantt-corner {
  left: 0;
  z-index: 5;
  border-bottom: 1px solid var(--b3-list-hover);
  box-sizing: border-box;
}

.gantt-header-row-border {
  position: sticky;
  top: 41px;
  z-index: 4;
  align-self: end;
  height: 1px;
  background: var(--b3-list-hover);
  pointer-events: none;
}

.gantt-day-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  align-self: center;
  justify-self: stretch;
  height: 30px;
  margin: 6px 3px;
  padding: 3px 6px;
  border-radius: 6px;
  color: var(--b3-theme-on-surface-light);
  font-size: 11px;
  line-height: 1.1;
  box-sizing: border-box;
}

.gantt-day-header.weekend,
.gantt-day-cell.weekend {
  background: color-mix(in srgb, var(--b3-list-hover) 30%, var(--b3-theme-background));
}

.gantt-day-header.today {
  color: var(--b3-theme-background);
  background: color-mix(in srgb, #f98f7a 80%, var(--b3-theme-background));
}
.gantt-row-label {
  position: sticky;
  left: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 0 12px;
  border: 0;
  border-right: 1px solid var(--b3-theme-surface-lighter);
  border-bottom: 1px solid var(--b3-theme-surface-lighter);
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  text-align: left;
  cursor: default;
}

.gantt-row-label.group-start,
.gantt-day-cell.group-start {
  margin-top: 10px;
}

.gantt-row-label:hover {
  background: var(--b3-list-hover);
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
  z-index: 2;
  width: 100%;
  border-right: 0;
  border-bottom: 0;
  padding: 6px 8px;
  background: var(--b3-theme-background);
  cursor: pointer;
}

.gantt-unscheduled-control-row:hover {
  background: var(--b3-theme-background);
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
  background: color-mix(in srgb, var(--b3-list-hover) 55%, var(--b3-theme-background));
  box-sizing: border-box;
}

.gantt-unscheduled-control-row:hover .gantt-unscheduled-control-inner {
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

.gantt-empty-label {
  cursor: default;
  color: var(--b3-theme-on-surface-light);
  font-size: 13px;
}

.gantt-empty-label:hover {
  background: var(--b3-theme-background);
}

.gantt-section-label {
  gap: 10px;
  cursor: pointer;
  font-weight: 600;
  color: var(--b3-theme-on-background);
  background: var(--b3-body-background);
}

.gantt-section-label:hover {
  background: var(--b3-body-background);
}

.gantt-section-icon {
  flex: 0 0 auto;
  width: 18px;
  text-align: center;
}

.gantt-section-toggle {
  flex: 0 0 auto;
  width: 0;
  height: 0;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 6px solid currentColor;
  transform: rotate(90deg);
  transition: transform 0.16s ease;
}

.gantt-section-label.collapsed .gantt-section-toggle {
  transform: rotate(0deg);
}

.gantt-section-count {
  flex: 0 0 auto;
  min-width: 22px;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-surface-light);
  font-size: 11px;
  font-weight: 500;
  line-height: 18px;
  text-align: center;
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

.gantt-day-cell {
  position: relative;
  z-index: 1;
  border-right: 1px solid var(--b3-list-hover);
  border-bottom: 1px solid var(--b3-list-hover);
  background: var(--b3-theme-background);
}

.gantt-day-cell.today {
  background: color-mix(in srgb, #f98f7a 8%, var(--b3-theme-background));
}

.gantt-day-cell.drop-target {
  background: color-mix(in srgb, var(--b3-theme-primary) 16%, var(--b3-theme-background));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--b3-theme-primary) 32%, transparent);
}

.gantt-day-cell.section {
  border-right: 0;
  background: var(--b3-list-hover);
  box-shadow: none;
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

.gantt-group-panel.group-start {
  margin-top: 10px;
}

.gantt-summary-bar {
  z-index: 1;
  position: relative;
  align-self: center;
  min-width: 48px;
  height: 26px;
  margin: 0 3px;
  padding: 0 7px;
  border: 1px solid color-mix(in srgb, var(--b3-theme-primary) 28%, var(--b3-theme-background));
  border-radius: 6px;
  background: color-mix(in srgb, var(--b3-theme-primary) 10%, var(--b3-theme-background));
  color: var(--b3-theme-on-background);
  font-size: 11px;
  font-weight: 600;
  line-height: 26px;
  overflow: hidden;
  pointer-events: none;
  --gantt-summary-fill-color: color-mix(in srgb, var(--b3-theme-primary) 52%, var(--b3-theme-background));
}

.gantt-summary-bar.group-start {
  transform: translateY(5px);
}

.gantt-summary-bar.overdue {
  border-color: color-mix(in srgb, #f98f7a 48%, transparent);
  background: color-mix(in srgb, #f98f7a 14%, var(--b3-theme-background));
  color: var(--pinch-font-color10);
  --gantt-summary-fill-color: color-mix(in srgb, #f98f7a 62%, var(--b3-theme-background));
}

.gantt-summary-bar.risk:not(.completed) {
  border-color: color-mix(in srgb, var(--pinch-color6) 20%, transparent);
  background: color-mix(in srgb, var(--pinch-color6) 12%, var(--b3-theme-background));
  color: var(--pinch-font-color6);
  --gantt-summary-fill-color: color-mix(in srgb, var(--pinch-color6) 58%, var(--b3-theme-background));
}

.gantt-summary-bar.completed {
  border-color: color-mix(in srgb, var(--pinch-background5) 48%, transparent);
  background: color-mix(in srgb, var(--pinch-background5) 14%, var(--b3-theme-background));
  color: var(--pinch-font-color5);
  --gantt-summary-fill-color: color-mix(in srgb, var(--pinch-background5) 68%, var(--b3-theme-background));
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

.gantt-bar {
  z-index: 1;
  display: flex;
  align-items: center;
  align-self: center;
  min-width: 28px;
  height: 24px;
  margin: 0 3px;
  padding: 0 9px 0 14px;
  border: 0;
  border-radius: 6px;
  background: var(--b3-font-background9);
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
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pinch-background10) 62%, transparent);
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
