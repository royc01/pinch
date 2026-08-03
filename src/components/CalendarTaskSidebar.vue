<template>
  <aside class="calendar-task-sidebar">
    <div class="calendar-task-mini-calendar">
      <div class="calendar-task-mini-header">
        <span>{{ miniCalendarTitle }}</span>
        <div>
          <button type="button" @click="shiftMonth(-1)">
            <Icon name="chevronLeft" width="15" height="15" /></button
          ><button type="button" @click="miniMonth = new Date()">○</button
          ><button type="button" @click="shiftMonth(1)">
            <Icon name="chevronRight" width="15" height="15" />
          </button>
        </div>
      </div>
      <div class="calendar-task-mini-weekdays">
        <span v-for="day in mondayFirstWeekdays" :key="day">{{ day }}</span>
      </div>
      <div class="calendar-task-mini-days">
        <button
          v-for="day in miniDays"
          :key="day.key"
          type="button"
          :class="{
            muted: !day.currentMonth,
            today: day.today,
            selected: day.selected,
            'range-start': day.rangeStart,
            'range-end': day.rangeEnd,
          }"
          @click="emit('date-select', day.date)"
        >
          <span>{{ day.number }}</span
          ><i v-if="taskDateKeys.has(day.key)"></i>
        </button>
      </div>
    </div>
    <div
      v-if="displayOptions?.length"
      class="calendar-task-sidebar-display-options"
    >
      <div
        v-for="option in displayOptions"
        :key="option.key"
        class="calendar-task-sidebar-display-option"
      >
        <span>{{ t(option.label) }}</span>
        <button
          type="button"
          class="calendar-task-sidebar-switch"
          :class="{ active: option.enabled }"
          role="switch"
          :aria-checked="option.enabled"
          :aria-label="t(option.label)"
          @click="emit('calendar-display-toggle', option.key)"
        >
          <i></i>
        </button>
      </div>
    </div>
    <div class="calendar-task-sidebar-search">
      <Icon name="searchCompact" width="16" height="16" />
      <input
        v-model="query"
        type="search"
        :placeholder="t('taskManager.searchTasks')"
        :aria-label="t('taskManager.searchTasks')"
      />
      <button
        v-if="query"
        type="button"
        class="calendar-task-sidebar-search-clear ariaLabel"
        :aria-label="t('kanbanView.clearSearch')"
        @click="query = ''"
      >
        ×
      </button>
      <button
        type="button"
        class="calendar-task-sidebar-completed-toggle ariaLabel"
        :class="{ active: showCompleted }"
        :aria-label="
          showCompleted
            ? t('ganttView.collapseCompletedTasks')
            : t('ganttView.expandCompletedTasks')
        "
        @click="showCompleted = !showCompleted"
      >
        <Icon :name="showCompleted ? 'chevronsHorizontal' : 'chevronsVertical'" width="15" height="15" />
      </button>
    </div>
    <div
      ref="listRef"
      class="calendar-task-sidebar-list"
      @scroll="updateViewport"
    >
      <div
        v-if="rows.length > 0"
        :style="{ height: `${virtualRange.top}px` }"
      ></div>
      <template v-for="row in visibleRows" :key="row.key">
        <button
          v-if="row.kind === 'group'"
          type="button"
          class="calendar-task-sidebar-group-header"
          :class="{ collapsed: collapsedIds.has(row.group.id) }"
          @click="toggleGroup(row.group.id)"
        >
          <span class="calendar-task-sidebar-group-toggle"
            ><Icon name="chevronDown" width="16" height="16"
          /></span>
          <span class="calendar-task-sidebar-group-name">{{
            row.group.name
          }}</span>
          <span class="calendar-task-sidebar-group-count">{{
            row.group.tasks.length
          }}</span>
        </button>
        <button
          v-else
          type="button"
          class="calendar-task-sidebar-task ariaLabel"
          draggable="false"
          :class="{ 'is-pointer-dragging': pointerDrag.active && pointerDrag.task?.id === row.task.id }"
          :aria-label="getTaskDisplayTitle(row.task)"
          @pointerdown="handleTaskPointerDown($event, row.task)"
          @dragstart.prevent
          @click="handleTaskClick($event, row.task)"
        >
          <span
            class="task-checkbox-wrapper calendar-task-sidebar-task-checkbox"
            @pointerdown.stop
            @dragstart.stop
            @click.stop="emit('task-toggle', row.task)"
            ><TaskCheckbox
              :checked="row.task.status === 'completed'"
              :size="14"
          /></span>
          <span
            class="calendar-task-sidebar-task-title"
            v-html="getTaskTitleHtml(row.task)"
          ></span>
        </button>
      </template>
      <div
        v-if="rows.length > 0"
        :style="{ height: `${virtualRange.bottom}px` }"
      ></div>
      <div v-if="rows.length === 0" class="calendar-task-sidebar-empty">
        {{ t("taskManager.noTasks") }}
      </div>
    </div>
    <div
      v-if="pointerDrag.active && pointerDrag.task"
      class="calendar-task-sidebar-drag-ghost"
      :style="{ transform: `translate3d(${pointerDrag.clientX + 12}px, ${pointerDrag.clientY + 12}px, 0)` }"
    >
      <span v-html="getTaskTitleHtml(pointerDrag.task)"></span>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import type { Task } from "@/api";
import { getTaskDisplayTitle } from "@/composables/useTaskCommon";
import { sanitizeTaskTitleHtml } from "@/utils/taskHtml";
import { useI18n } from "@/composables/useI18n";
import Icon from "./Icon.vue";
import TaskCheckbox from "./TaskCheckbox.vue";

const props = defineProps<{
  tasks: Task[];
  documentTitleByRootId?: Map<string, string>;
  selectedStartDate?: Date;
  selectedDaysCount?: number;
  displayOptions?: Array<{ key: string; label: string; enabled: boolean }>;
}>();
const emit = defineEmits<{
  "task-toggle": [task: Task];
  "task-edit": [task: Task, anchor: { x: number; y: number }];
  "date-select": [date: Date];
  "calendar-display-toggle": [key: string];
  "calendar-task-drag-start": [payload: { task: Task; clientX: number; clientY: number }];
  "calendar-task-drag-move": [payload: { task: Task; clientX: number; clientY: number }];
  "calendar-task-drag-end": [payload: { task: Task; clientX: number; clientY: number }];
  "calendar-task-drag-cancel": [];
}>();
const { t } = useI18n();
const query = ref("");
const showCompleted = ref(false);
const collapsedIds = ref(new Set<string>());
const miniMonth = ref(new Date());
const listRef = ref<HTMLElement | null>(null);
const viewport = ref({ top: 0, height: 0 });
const POINTER_DRAG_THRESHOLD = 4;
const pointerDrag = ref<{
  active: boolean;
  task: Task | null;
  pointerId: number | null;
  startX: number;
  startY: number;
  clientX: number;
  clientY: number;
}>({ active: false, task: null, pointerId: null, startX: 0, startY: 0, clientX: 0, clientY: 0 });
let suppressNextTaskClick = false;
const ROW_HEIGHT = 28;
const OVERSCAN = 12;

function getTaskTitleHtml(task: Task) {
  return sanitizeTaskTitleHtml(task.title || "");
}
function handleTaskClick(event: MouseEvent, task: Task) {
  if (suppressNextTaskClick) {
    suppressNextTaskClick = false;
    return;
  }
  emit('task-edit', task, { x: event.clientX, y: event.clientY });
}
function formatKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
const mondayFirstWeekdays = computed(() => [
  t("date.weekdayMonShort"),
  t("date.weekdayTueShort"),
  t("date.weekdayWedShort"),
  t("date.weekdayThuShort"),
  t("date.weekdayFriShort"),
  t("date.weekdaySatShort"),
  t("date.weekdaySunShort"),
]);
const miniCalendarTitle = computed(
  () =>
    `${miniMonth.value.getFullYear()} ${miniMonth.value.getMonth() + 1}${t("date.monthSuffix")}`,
);
const taskDateKeys = computed(
  () =>
    new Set(
      props.tasks
        .flatMap((task) => [task.startDate, task.dueDate])
        .filter((key): key is string => !!key),
    ),
);
const miniDays = computed(() => {
  const month = miniMonth.value;
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7));
  const today = formatKey(new Date());
  const selectedStart = props.selectedStartDate
    ? new Date(props.selectedStartDate)
    : null;
  selectedStart?.setHours(0, 0, 0, 0);
  const selectedDays = Math.max(0, props.selectedDaysCount || 0);
  const selectedEnd = selectedStart ? new Date(selectedStart) : null;
  if (selectedEnd)
    selectedEnd.setDate(selectedEnd.getDate() + selectedDays - 1);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = formatKey(date);
    const selected =
      !!selectedStart &&
      !!selectedEnd &&
      date >= selectedStart &&
      date <= selectedEnd;
    return {
      date,
      key,
      number: date.getDate(),
      currentMonth: date.getMonth() === month.getMonth(),
      today: key === today,
      selected,
      rangeStart: selected && date.getTime() === selectedStart.getTime(),
      rangeEnd: selected && date.getTime() === selectedEnd.getTime(),
    };
  });
});
function shiftMonth(offset: number) {
  miniMonth.value = new Date(
    miniMonth.value.getFullYear(),
    miniMonth.value.getMonth() + offset,
    1,
  );
}
function documentId(task: Task) {
  const notebookId = task.notebookId?.trim() || "";
  const rootId = task.rootId?.trim() || "";
  if (notebookId && rootId) return `${notebookId}:${rootId}`;
  if (rootId) return rootId;
  const path = task.hPath?.trim() || "";
  return path ? `path:${path}` : "__unassigned_document__";
}
function documentTitle(task: Task) {
  const path = task.hPath?.trim() || "";
  const parts = path
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length) return parts[parts.length - 1];
  return (
    props.documentTitleByRootId?.get(task.rootId?.trim() || "")?.trim() ||
    t("ganttView.unassignedDocument")
  );
}
const groups = computed(() => {
  const search = query.value.trim().toLocaleLowerCase();
  const result = new Map<string, { id: string; name: string; tasks: Task[] }>();
  for (const task of props.tasks) {
    if (
      task.isVirtual ||
      task.archived ||
      (!showCompleted.value && task.status === "completed") ||
      (search &&
        !getTaskDisplayTitle(task).toLocaleLowerCase().includes(search))
    )
      continue;
    const id = documentId(task);
    if (!result.has(id))
      result.set(id, { id, name: documentTitle(task), tasks: [] });
    result.get(id)!.tasks.push(task);
  }
  return [...result.values()]
    .map((group) => ({
      ...group,
      tasks: group.tasks.sort((a, b) =>
        getTaskDisplayTitle(a).localeCompare(getTaskDisplayTitle(b)),
      ),
    }))
    .sort((a, b) =>
      a.id === "__unassigned_document__"
        ? 1
        : b.id === "__unassigned_document__"
          ? -1
          : a.name.localeCompare(b.name),
    );
});
type SidebarRow =
  | {
      key: string;
      kind: "group";
      group: { id: string; name: string; tasks: Task[] };
    }
  | { key: string; kind: "task"; task: Task };
const rows = computed<SidebarRow[]>(() =>
  groups.value.flatMap((group) => [
    { key: `group:${group.id}`, kind: "group" as const, group },
    ...(collapsedIds.value.has(group.id)
      ? []
      : group.tasks.map((task) => ({
          key: `task:${task.id}`,
          kind: "task" as const,
          task,
        }))),
  ]),
);
const virtualRange = computed(() => {
  const count = rows.value.length;
  if (count <= 80) return { start: 0, end: count, top: 0, bottom: 0 };
  const start = Math.min(
    count,
    Math.max(0, Math.floor(viewport.value.top / ROW_HEIGHT) - OVERSCAN),
  );
  const end = Math.min(
    count,
    Math.ceil((viewport.value.top + viewport.value.height) / ROW_HEIGHT) +
      OVERSCAN,
  );
  return {
    start,
    end,
    top: start * ROW_HEIGHT,
    bottom: Math.max(0, (count - end) * ROW_HEIGHT),
  };
});
const visibleRows = computed(() =>
  rows.value.slice(virtualRange.value.start, virtualRange.value.end),
);
function updateViewport() {
  const element = listRef.value;
  if (element)
    viewport.value = { top: element.scrollTop, height: element.clientHeight };
}
function toggleGroup(id: string) {
  const next = new Set(collapsedIds.value);
  next.has(id) ? next.delete(id) : next.add(id);
  collapsedIds.value = next;
  nextTick(updateViewport);
}
function clearPointerDrag(emitCancel = false) {
  const wasActive = pointerDrag.value.active;
  pointerDrag.value = { active: false, task: null, pointerId: null, startX: 0, startY: 0, clientX: 0, clientY: 0 };
  if (emitCancel && wasActive) emit('calendar-task-drag-cancel');
}

function handleTaskPointerDown(event: PointerEvent, task: Task) {
  if (event.button !== 0) return;
  pointerDrag.value = {
    active: false,
    task,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    clientX: event.clientX,
    clientY: event.clientY
  };
  document.addEventListener('pointermove', handleTaskPointerMove, true);
  document.addEventListener('pointerup', handleTaskPointerUp, true);
  document.addEventListener('pointercancel', handleTaskPointerCancel, true);
}

function handleTaskPointerMove(event: PointerEvent) {
  const drag = pointerDrag.value;
  if (!drag.task || drag.pointerId !== event.pointerId) return;
  const moved = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
  if (!drag.active && moved < POINTER_DRAG_THRESHOLD) return;
  if (!drag.active) {
    drag.active = true;
    emit('calendar-task-drag-start', { task: drag.task, clientX: event.clientX, clientY: event.clientY });
  }
  drag.clientX = event.clientX;
  drag.clientY = event.clientY;
  event.preventDefault();
  emit('calendar-task-drag-move', { task: drag.task, clientX: event.clientX, clientY: event.clientY });
}

function removePointerDragListeners() {
  document.removeEventListener('pointermove', handleTaskPointerMove, true);
  document.removeEventListener('pointerup', handleTaskPointerUp, true);
  document.removeEventListener('pointercancel', handleTaskPointerCancel, true);
}

function handleTaskPointerUp(event: PointerEvent) {
  const drag = pointerDrag.value;
  if (!drag.task || drag.pointerId !== event.pointerId) return;
  removePointerDragListeners();
  if (drag.active) {
    suppressNextTaskClick = true;
    setTimeout(() => { suppressNextTaskClick = false; }, 0);
    emit('calendar-task-drag-end', { task: drag.task, clientX: event.clientX, clientY: event.clientY });
  }
  clearPointerDrag();
}

function handleTaskPointerCancel(event: PointerEvent) {
  if (pointerDrag.value.pointerId !== event.pointerId) return;
  removePointerDragListeners();
  clearPointerDrag(true);
}
onMounted(() => {
  updateViewport();
  window.addEventListener("resize", updateViewport);
});
onUnmounted(() => {
  window.removeEventListener("resize", updateViewport);
  removePointerDragListeners();
});
</script>

<style scoped>
.calendar-task-sidebar {
  flex: 0 0 240px;
  width: 240px;
  min-width: 180px;
  display: flex;
  flex-direction: column;
  position: relative;
  border-right: 1px solid var(--b3-theme-border);
  background: var(--b3-theme-background);
  overflow: hidden;
}
.calendar-task-sidebar-task.is-pointer-dragging {
  opacity: 0.32;
}
.calendar-task-sidebar-drag-ghost {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 10000;
  max-width: 260px;
  padding: 5px 8px;
  overflow: hidden;
  border-radius: 6px;
  background: var(--pinch-background7, var(--b3-theme-surface));
  color: var(--b3-theme-on-background);
  box-shadow: 0 8px 18px rgba(0, 0, 0, .18);
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
  text-overflow: ellipsis;
  pointer-events: none;
  will-change: transform;
}
.calendar-task-sidebar-search {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  margin: 8px 6px;
  padding: 0 14px;
  border: 1px solid var(--b3-theme-border);
  border-radius: 21px;
  color: var(--b3-theme-on-surface);
  background: var(--b3-theme-background);
}
.calendar-task-sidebar-search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  color: var(--b3-theme-on-background);
  background: transparent;
  font-size: 14px;
}
.calendar-task-sidebar-search-clear,
.calendar-task-sidebar-completed-toggle {
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 5px;
  color: var(--b3-theme-on-surface);
  background: transparent;
  cursor: pointer;
}
.calendar-task-sidebar-completed-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.calendar-task-sidebar-search-clear:hover,
.calendar-task-sidebar-completed-toggle:hover,
.calendar-task-sidebar-completed-toggle.active {
  background: var(--b3-list-hover);
}
.calendar-task-sidebar-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 6px;
}
.calendar-task-sidebar-group + .calendar-task-sidebar-group {
  margin-top: 5px;
}
.calendar-task-sidebar-group-header,
.calendar-task-sidebar-task {
  width: 100%;
  display: flex;
  align-items: center;
  border: 0;
  color: var(--b3-theme-on-background);
  text-align: left;
}
.calendar-task-sidebar-group-header {
  height: 28px;
  padding: 0 10px 0 5px;
  border-radius: 8px;
  background: var(--b3-list-hover);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
}
.calendar-task-sidebar-task {
  gap: 5px;
  height: 28px;
  padding: 0 6px;
  border-radius: 5px;
  background: transparent;
  cursor: grab;
  font-size: 13px;
}
.calendar-task-sidebar-task:hover {
  background: var(--b3-list-hover);
}
.calendar-task-sidebar-task:active {
  cursor: grabbing;
}
.calendar-task-sidebar-group-toggle {
  display: inline-flex;
  margin-right: 2px;
  transition: transform 0.15s ease;
}
.calendar-task-sidebar-group-header.collapsed
  .calendar-task-sidebar-group-toggle {
  transform: rotate(-90deg);
}
.calendar-task-sidebar-group-name,
.calendar-task-sidebar-task-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.calendar-task-sidebar-group-name {
  flex: 1;
}
.calendar-task-sidebar-group-count {
  margin-left: 6px;
  color: var(--b3-theme-on-surface);
  font-size: 12px;
}
.calendar-task-sidebar-task-checkbox {
  flex: 0 0 auto;
}
.calendar-task-sidebar-empty {
  padding: 18px 8px;
  color: var(--b3-theme-on-surface);
  text-align: center;
  font-size: 13px;
}
@media (max-width: 768px) {
  .calendar-task-sidebar {
    display: none;
  }
}
</style>

<style scoped>
.calendar-task-mini-calendar {
  padding: 7px 10px;
  border-bottom: 1px solid var(--b3-theme-border);
}
.calendar-task-mini-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 600;
}
.calendar-task-mini-header div {
  display: flex;
  align-items: center;
  gap: 2px;
}
.calendar-task-mini-header button {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  padding: 0;
  border: 0;
  border-radius: 4px;
  color: var(--b3-theme-on-surface);
  background: transparent;
  cursor: pointer;
}
.calendar-task-mini-header button:hover {
  background: var(--b3-list-hover);
}
.calendar-task-mini-weekdays,
.calendar-task-mini-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
}
.calendar-task-mini-weekdays {
  margin-top: 7px;
  color: var(--b3-theme-on-surface);
  font-size: 11px;
}
.calendar-task-mini-days {
  margin-top: 3px;
}
.calendar-task-mini-days button {
  position: relative;
  height: 25px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  color: var(--b3-theme-on-background);
  background: transparent;
  font-size: 12px;
  cursor: pointer;
}
.calendar-task-mini-days button:hover {
  background: var(--b3-list-hover);
}
.calendar-task-mini-days button.muted {
  color: var(--b3-theme-on-surface);
  opacity: 0.55;
}
.calendar-task-mini-days button.today {
  color: var(--b3-theme-background);
  font-weight: 700;
  background: #f98f7a;
}
.calendar-task-mini-days i {
  position: absolute;
  bottom: 2px;
  left: 50%;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: currentColor;
  transform: translateX(-50%);
}
.calendar-task-sidebar {
  margin: 0 0 10px 10px;
  border-radius: 8px;
  background: var(--b3-list-hover);
}
.calendar-task-sidebar-display-options {
  border-bottom: 1px solid var(--b3-theme-border);
}
.calendar-task-sidebar-display-option {
  height: 26px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--b3-theme-on-background);
  font-size: 13px;
}
.calendar-task-sidebar-display-option + .calendar-task-sidebar-display-option {
  border-top: 1px solid var(--b3-theme-border);
}
.calendar-task-sidebar-switch {
  width: 30px;
  height: 18px;
  padding: 2px;
  border: 0;
  border-radius: 9px;
  background: var(--b3-theme-surface-lighter);
  cursor: pointer;
  transition: background 0.15s ease;
}
.calendar-task-sidebar-switch i {
  display: block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--b3-theme-background);
  box-shadow: 0 1px 2px rgb(0 0 0 / 18%);
  transition: transform 0.15s ease;
}
.calendar-task-sidebar-switch.active {
  background: var(--b3-theme-primary);
}
.calendar-task-sidebar-switch.active i {
  transform: translateX(12px);
}
.calendar-task-mini-days button.selected {
  border-radius: 0;
  background: var(--b3-list-hover);
}
.calendar-task-mini-days button.range-start {
  border-radius: 8px 0 0 8px;
}
.calendar-task-mini-days button.range-end {
  border-radius: 0 8px 8px 0;
}
.calendar-task-mini-days button.range-start.range-end {
  border-radius: 8px;
}
.calendar-task-mini-days button.selected.today {
  border-radius: 8px;
  color: var(--b3-theme-background);
  background: #f98f7a;
}
</style>
