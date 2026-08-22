import { ref, type Ref } from 'vue';
import { getFrontend } from 'siyuan';
import { setBlockAttrs, type Task } from '@/api';
import { getRepeatSeriesForTask, notifyRepeatChanged, updateRepeatSeriesDates } from '@/repeatRepository';
import { isRepeatTask } from '@/utils/repeatTaskUtils';
import { formatDate, formatTime } from './useDateUtils';
import { CALENDAR_CONSTANTS } from './useCalendarConstants';
import { useDebouncedSave } from './useDebouncedSave';
import { useTaskLocalMutations } from './useTaskLocalMutations';

interface EventListener {
  element: Document;
  event: string;
  handler: (...args: any[]) => void;
}

type RepeatMoveScope = 'single' | 'series' | 'cancel';

interface RepeatMoveDecisionPayload {
  task: Task;
  mode: 'all-day' | 'timed';
  fromStartDate: string | null;
  fromDueDate: string | null;
  toStartDate: string | null;
  toDueDate: string | null;
}

interface UseTaskDragOptions {
  resolveRepeatMoveScope?: (payload: RepeatMoveDecisionPayload) => Promise<RepeatMoveScope> | RepeatMoveScope;
  /** Number of pixels the inactive hours region (0-5am) is collapsed by.
   *  When collapsed, timed-task positioning and drag calculations need to offset
   *  by this amount. Defaults to 0 (no collapse).
   *  Can be a number or a getter function for dynamic updates. */
  inactiveHoursOffset?: number | (() => number);
  /** Moves the free-floating timed-task ghost without causing a Vue render. */
  onTimedTaskDragGhostMove?: (position: { left: number; top: number }) => void;
  onAllDayTaskDragGhostMove?: (position: { left: number; top: number }) => void;
}

interface RepeatSeriesDragSnapshotEntry {
  id: string;
  isVirtual: boolean;
  repeatInstanceDate?: string;
  startDate: string;
  dueDate: string;
  hasExplicitDueDate: boolean;
  startTime?: string;
  dueTime?: string;
}

interface RepeatSeriesDragSnapshot {
  seriesId: string;
  entries: RepeatSeriesDragSnapshotEntry[];
}

interface TimedTaskDropResolution {
  kind: 'all-day' | 'timed';
  dayKey: string;
  startTime?: string;
  dueTime?: string;
  dueDate?: string;
}

interface MonthDayCellHitRect {
  element: HTMLElement;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const TIMED_TASK_DRAG_THRESHOLD_PX = 4;

function parseLocalDayKey(dayKey: string): Date | null {
  const match = dayKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  date.setHours(0, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function useTaskDrag(
  localTasks: Ref<Task[]>,
  emitTaskDateChanged: (task: Task) => void,
  options: UseTaskDragOptions = {}
) {
  let isMobileFrontend = false;
  try {
    const frontend = getFrontend();
    isMobileFrontend = frontend === 'mobile' || frontend === 'browser-mobile';
  } catch {
    isMobileFrontend = false;
  }

  const resolveInactiveHoursOffset = (): number => {
    const offset = options.inactiveHoursOffset;
    return typeof offset === 'function' ? offset() : (offset || 0);
  };

  const { scheduleSave } = useDebouncedSave(500);
  const {
    patchTask: patchLocalTask,
    patchTasksBatch: patchLocalTasksBatch
  } = useTaskLocalMutations(localTasks);

  const dragState = ref({
    overDay: null as string | null,
    overHourCell: null as string | null,
    overDayColumn: null as string | null,
    overAllDayColumn: null as string | null
  });

  const draggingHandle = ref<{ task: Task; type: 'start' | 'end'; originalDate: string } | null>(null);
  const draggingTask = ref<{
    task: Task;
    originalStart: string;
    originalDue: string | null;
    pointerOffsetDays: number;
    clickOffsetX?: number;
    clickOffsetY?: number;
    width?: number;
    height?: number;
    repeatSeriesSnapshot?: RepeatSeriesDragSnapshot | null;
  } | null>(null);
  const allDayTaskDragPreview = ref<{
    task: Task;
    startDate: string;
    dueDate: string | null;
    floatingLeft: number;
    floatingTop: number;
    width: number;
    height: number;
  } | null>(null);
  const dragLastUpdatedDate = ref('');
  const isDragging = ref(false);

  const draggingTimedTaskHandle = ref<{
    task: Task;
    type: 'start' | 'end';
    originalStartTime: string;
    originalEndTime: string;
    originalStartDate: string;
    originalDueDate: string;
    repeatSeriesSnapshot?: RepeatSeriesDragSnapshot | null;
  } | null>(null);
  const draggingTimedTask = ref<{ task: Task; originalStartTime: string; originalEndTime: string; originalStartDate: string; originalDueDate: string; dayKey: string; startClientX: number; startClientY: number; hasMoved: boolean; clickOffsetX?: number; clickOffsetY?: number; taskWidth?: number; taskHeight?: number; durationMs?: number; repeatSeriesSnapshot?: RepeatSeriesDragSnapshot | null } | null>(null);
  const timedTaskDragPreview = ref<{
    task: Task;
    target: TimedTaskDropResolution | null;
    floatingLeft: number;
    floatingTop: number;
    width: number;
  } | null>(null);
  const pendingTimedRepeatPreview = ref<{
    snapshot: RepeatSeriesDragSnapshot;
    deltaDays: number;
    nextStartTime?: string;
    clearTime: boolean;
  } | null>(null);
  let timedRepeatPreviewRafId: number | null = null;
  // Pointer events can arrive much faster than the browser can paint.  Keep the
  // visual preview at most one update per frame, while preserving the final
  // pointer position when the mouse is released.
  let timedTaskMoveRafId: number | null = null;
  let pendingTimedTaskMoveEvent: MouseEvent | null = null;
  let allDayTaskMoveRafId: number | null = null;
  let pendingAllDayTaskMoveEvent: MouseEvent | null = null;
  let handleDateChangedDuringDrag = false;
  let timedTaskHandleMoveRafId: number | null = null;
  let pendingTimedTaskHandleMoveEvent: MouseEvent | null = null;
  let lastTimedTaskPreviewKey = '';
  let lastTimedTaskHandlePreviewKey = '';

  const eventListeners = ref<EventListener[]>([]);
  let monthDayCellHitRects: MonthDayCellHitRect[] | null = null;

  function resetMonthDayCellHitRects(): void {
    monthDayCellHitRects = null;
  }

  function getMonthDayCellHitRects(): MonthDayCellHitRect[] {
    if (monthDayCellHitRects) {
      return monthDayCellHitRects;
    }

    monthDayCellHitRects = Array.from(document.querySelectorAll('.day-cell[data-day-key]'))
      .map((cell) => {
        const element = cell as HTMLElement;
        const rect = element.getBoundingClientRect();
        return {
          element,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom
        };
      });
    return monthDayCellHitRects;
  }

  function findMonthDayCellByPoint(clientX: number, clientY: number): HTMLElement | null {
    for (const cellRect of getMonthDayCellHitRects()) {
      if (
        clientX >= cellRect.left &&
        clientX <= cellRect.right &&
        clientY >= cellRect.top &&
        clientY <= cellRect.bottom
      ) {
        return cellRect.element;
      }
    }
    return null;
  }

  function preventConcurrentDragStart(event: MouseEvent): boolean {
    if (!isDragging.value) return false;

    event.preventDefault();
    event.stopPropagation();
    return true;
  }

  function buildRepeatSeriesDragSnapshot(task: Task): RepeatSeriesDragSnapshot | null {
    if (!task.repeatSeriesId) return null;
    const seriesId = task.repeatSeriesId;
    const entries = localTasks.value
      .filter(candidate => candidate.repeatSeriesId === seriesId)
      .map((candidate) => {
        const startDate = candidate.startDate || candidate.dueDate || '';
        const dueDate = candidate.dueDate || candidate.startDate || startDate;
        const hasExplicitDueDate = typeof candidate.dueDate === 'string' && candidate.dueDate.trim().length > 0;
        if (!startDate || !dueDate) return null;
        return {
          id: candidate.id,
          isVirtual: !!candidate.isVirtual,
          repeatInstanceDate: candidate.repeatInstanceDate,
          startDate,
          dueDate,
          hasExplicitDueDate,
          startTime: candidate.startTime,
          dueTime: candidate.dueTime
        } as RepeatSeriesDragSnapshotEntry;
      })
      .filter((entry): entry is RepeatSeriesDragSnapshotEntry => !!entry);
    if (entries.length === 0) return null;
    return { seriesId, entries };
  }

  function restoreRepeatSeriesDragSnapshot(snapshot: RepeatSeriesDragSnapshot): void {
    patchLocalTasksBatch(
      snapshot.entries.map(entry => ({
        id: entry.id,
        patch: {
          repeatInstanceDate: entry.isVirtual ? entry.repeatInstanceDate : undefined,
          startDate: entry.startDate,
          dueDate: entry.hasExplicitDueDate ? entry.dueDate : undefined,
          startTime: entry.startTime,
          dueTime: entry.dueTime
        }
      })),
      { emit: false }
    );
  }

  function applyRepeatSeriesTimedMove(
    snapshot: RepeatSeriesDragSnapshot,
    deltaDays: number,
    nextStartTime?: string,
    clearTime: boolean = false
  ): void {
    const updates: Array<{ id: string; patch: Partial<Task> }> = [];

    for (const entry of snapshot.entries) {
      const shiftedStartDate = shiftDate(entry.startDate, deltaDays);
      const shiftedDueDate = shiftDate(entry.dueDate, deltaDays);

      if (clearTime) {
        const nextDueDate = entry.hasExplicitDueDate ? shiftedDueDate : undefined;
        updates.push({
          id: entry.id,
          patch: {
            repeatInstanceDate: entry.isVirtual ? shiftedStartDate : undefined,
            startDate: shiftedStartDate,
            dueDate: nextDueDate,
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
      const nextDueDate = entry.hasExplicitDueDate || shiftedDueDateStr !== shiftedStartDateStr
        ? shiftedDueDateStr
        : undefined;

      updates.push({
        id: entry.id,
        patch: {
          repeatInstanceDate: entry.isVirtual ? shiftedStartDateStr : undefined,
          startDate: shiftedStartDateStr,
          dueDate: nextDueDate,
          startTime: targetStartTime,
          dueTime: formatTime(shiftedDueDateTime)
        }
      });
    }

    patchLocalTasksBatch(updates, { emit: false });
  }

  function emitRepeatSeriesSnapshotTasks(snapshot: RepeatSeriesDragSnapshot): void {
    for (const entry of snapshot.entries) {
      const syncedTask = getLocalTask(entry.id);
      if (syncedTask) {
        emitTaskDateChanged(syncedTask);
      }
    }
  }

  function applyRepeatSeriesTimedHandleMove(
    snapshot: RepeatSeriesDragSnapshot,
    draggedTaskId: string,
    handleType: 'start' | 'end',
    targetDate: string,
    targetTime: string
  ): void {
    const anchorEntry = snapshot.entries.find(entry => entry.id === draggedTaskId);
    if (!anchorEntry) return;

    const anchorDate = handleType === 'start'
      ? anchorEntry.startDate
      : anchorEntry.dueDate;
    const anchorTime = handleType === 'start'
      ? (anchorEntry.startTime || '00:00')
      : (anchorEntry.dueTime || anchorEntry.startTime || '01:00');
    const anchorDateTime = new Date(`${anchorDate}T${anchorTime}`);
    const targetDateTime = new Date(`${targetDate}T${targetTime}`);
    const deltaMs = targetDateTime.getTime() - anchorDateTime.getTime();
    if (!Number.isFinite(deltaMs)) return;

    const minDurationMs = 15 * 60 * 1000;
    const updates: Array<{ id: string; patch: Partial<Task> }> = [];
    for (const entry of snapshot.entries) {
      const entryStartDateTime = new Date(`${entry.startDate}T${entry.startTime || '00:00'}`);
      const entryDueDateTime = new Date(`${entry.dueDate}T${entry.dueTime || entry.startTime || '01:00'}`);

      if (handleType === 'start') {
        const candidateStartMs = entryStartDateTime.getTime() + deltaMs;
        const maxStartMs = entryDueDateTime.getTime() - minDurationMs;
        const nextStartDateTime = new Date(Math.min(candidateStartMs, maxStartMs));
        updates.push({
          id: entry.id,
          patch: {
            repeatInstanceDate: entry.isVirtual ? formatDate(nextStartDateTime) : undefined,
            startDate: formatDate(nextStartDateTime),
            startTime: formatTime(nextStartDateTime)
          }
        });
      } else {
        const candidateDueMs = entryDueDateTime.getTime() + deltaMs;
        const minDueMs = entryStartDateTime.getTime() + minDurationMs;
        const nextDueDateTime = new Date(Math.max(candidateDueMs, minDueMs));
        const nextDueDateStr = formatDate(nextDueDateTime);
        const currentStartDateStr = formatDate(entryStartDateTime);
        updates.push({
          id: entry.id,
          patch: {
            dueDate: entry.hasExplicitDueDate || nextDueDateStr !== currentStartDateStr
              ? nextDueDateStr
              : undefined,
            dueTime: formatTime(nextDueDateTime)
          }
        });
      }
    }

    patchLocalTasksBatch(updates, { emit: false });
  }

  function flushTimedRepeatPreview(): void {
    const pending = pendingTimedRepeatPreview.value;
    if (!pending) return;
    pendingTimedRepeatPreview.value = null;
    applyRepeatSeriesTimedMove(
      pending.snapshot,
      pending.deltaDays,
      pending.nextStartTime,
      pending.clearTime
    );
  }

  function clearTimedRepeatPreview(): void {
    pendingTimedRepeatPreview.value = null;
    if (timedRepeatPreviewRafId !== null) {
      cancelAnimationFrame(timedRepeatPreviewRafId);
      timedRepeatPreviewRafId = null;
    }
  }

  function queueTimedTaskMove(event: MouseEvent): void {
    pendingTimedTaskMoveEvent = event;
    if (timedTaskMoveRafId !== null) return;
    timedTaskMoveRafId = requestAnimationFrame(() => {
      timedTaskMoveRafId = null;
      const pendingEvent = pendingTimedTaskMoveEvent;
      pendingTimedTaskMoveEvent = null;
      if (pendingEvent) updateTimedTaskPosition(pendingEvent);
    });
  }

  function flushTimedTaskMove(): void {
    if (timedTaskMoveRafId !== null) {
      cancelAnimationFrame(timedTaskMoveRafId);
      timedTaskMoveRafId = null;
    }
    const pendingEvent = pendingTimedTaskMoveEvent;
    pendingTimedTaskMoveEvent = null;
    if (pendingEvent) updateTimedTaskPosition(pendingEvent);
  }

  function clearTimedTaskMove(): void {
    if (timedTaskMoveRafId !== null) cancelAnimationFrame(timedTaskMoveRafId);
    timedTaskMoveRafId = null;
    pendingTimedTaskMoveEvent = null;
    lastTimedTaskPreviewKey = '';
    timedTaskDragPreview.value = null;
  }

  // Month view has up to six task layers.  Coalescing all-day moves to the
  // paint cadence avoids recalculating every layer for each high-frequency
  // pointer event, while the mouseup path still processes the exact drop point.
  function queueAllDayTaskMove(event: MouseEvent): void {
    pendingAllDayTaskMoveEvent = event;
    if (allDayTaskMoveRafId !== null) return;
    allDayTaskMoveRafId = requestAnimationFrame(() => {
      allDayTaskMoveRafId = null;
      const pendingEvent = pendingAllDayTaskMoveEvent;
      pendingAllDayTaskMoveEvent = null;
      if (pendingEvent) updateAllDayTaskPosition(pendingEvent);
    });
  }

  function flushAllDayTaskMove(event?: MouseEvent): void {
    if (allDayTaskMoveRafId !== null) {
      cancelAnimationFrame(allDayTaskMoveRafId);
      allDayTaskMoveRafId = null;
    }
    const pendingEvent = event || pendingAllDayTaskMoveEvent;
    pendingAllDayTaskMoveEvent = null;
    if (pendingEvent) updateAllDayTaskPosition(pendingEvent);
  }

  function clearAllDayTaskMove(): void {
    if (allDayTaskMoveRafId !== null) cancelAnimationFrame(allDayTaskMoveRafId);
    allDayTaskMoveRafId = null;
    pendingAllDayTaskMoveEvent = null;
  }

  function queueTimedTaskHandleMove(event: MouseEvent): void {
    pendingTimedTaskHandleMoveEvent = event;
    if (timedTaskHandleMoveRafId !== null) return;
    timedTaskHandleMoveRafId = requestAnimationFrame(() => {
      timedTaskHandleMoveRafId = null;
      const pendingEvent = pendingTimedTaskHandleMoveEvent;
      pendingTimedTaskHandleMoveEvent = null;
      if (pendingEvent) updateTimedTaskHandlePosition(pendingEvent);
    });
  }

  function flushTimedTaskHandleMove(): void {
    if (timedTaskHandleMoveRafId !== null) {
      cancelAnimationFrame(timedTaskHandleMoveRafId);
      timedTaskHandleMoveRafId = null;
    }
    const pendingEvent = pendingTimedTaskHandleMoveEvent;
    pendingTimedTaskHandleMoveEvent = null;
    if (pendingEvent) updateTimedTaskHandlePosition(pendingEvent);
  }

  function clearTimedTaskHandleMove(): void {
    if (timedTaskHandleMoveRafId !== null) cancelAnimationFrame(timedTaskHandleMoveRafId);
    timedTaskHandleMoveRafId = null;
    pendingTimedTaskHandleMoveEvent = null;
    lastTimedTaskHandlePreviewKey = '';
  }

  function shiftDate(dateStr: string, deltaDays: number): string {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + deltaDays);
    return formatDate(date);
  }

  function getDayDelta(fromDate: string, toDate: string): number {
    const from = parseLocalDayKey(fromDate);
    const to = parseLocalDayKey(toDate);
    if (!from || !to) return 0;
    return Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
  }

  async function resolveRepeatMoveScope(payload: RepeatMoveDecisionPayload): Promise<RepeatMoveScope> {
    if (!isRepeatTask(payload.task)) return 'single';
    if (!options.resolveRepeatMoveScope) return 'series';
    try {
      const scope = await options.resolveRepeatMoveScope(payload);
      if (scope === 'single' || scope === 'series' || scope === 'cancel') {
        return scope;
      }
      return 'cancel';
    } catch (_error) {
      return 'cancel';
    }
  }

  function getLocalTask(taskId: string): Task | null {
    return localTasks.value.find(task => task.id === taskId) || null;
  }

  function addEventListener(element: Document, event: string, handler: (...args: any[]) => void) {
    element.addEventListener(event, handler);
    eventListeners.value.push({ element, event, handler });
  }

  function removeEventListeners(eventKey?: string) {
    if (eventKey) {
      const listenersToRemove = eventListeners.value.filter(l => l.event === eventKey);
      listenersToRemove.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
      });
      eventListeners.value = eventListeners.value.filter(l => l.event !== eventKey);
    } else {
      eventListeners.value.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
      });
      eventListeners.value = [];
    }
  }

  function findDayColumnFromEvent(event: MouseEvent): { date: Date; element: HTMLElement; isTimedArea: boolean } | null {
    const elements = document.elementsFromPoint(event.clientX, event.clientY);
    const target = event.target as HTMLElement | null;

    const allDayColumn = elements.find(el =>
      el.classList.contains('all-day-column') || el.classList.contains('day-cell')
    );
    const dayColumn = elements.find(el => el.classList.contains('day-column'));

    let columnElement: HTMLElement | null = null;
    let isTimedArea = false;

    if (allDayColumn) {
      columnElement = allDayColumn as HTMLElement;
      isTimedArea = false;
    } else if (dayColumn) {
      columnElement = dayColumn as HTMLElement;
      isTimedArea = true;
    } else {
      const fromTarget = target?.closest('.day-cell[data-day-key]') as HTMLElement | null;
      const hitCell = fromTarget || findMonthDayCellByPoint(event.clientX, event.clientY);
      if (!hitCell) {
        return null;
      }
      columnElement = hitCell;
      isTimedArea = false;
    }

    const dayKey = columnElement.getAttribute('data-day-key');
    if (!dayKey) return null;
    const targetDate = parseLocalDayKey(dayKey);
    if (!targetDate) return null;

    return { date: targetDate, element: columnElement, isTimedArea };
  }

  function resolveTimedHourFromPoint(event: MouseEvent, dayColumn: HTMLElement): {
    hourIndex: number;
    startTime: string;
    dueTime: string;
  } {
    const daysScrollElement = dayColumn.closest('.days-scroll') as HTMLElement | null;
    const scrollRect = daysScrollElement?.getBoundingClientRect();
    let hourIndex = 9;

    if (daysScrollElement && scrollRect) {
      const scrollTop = daysScrollElement.scrollTop;
      const offsetY = event.clientY - scrollRect.top + scrollTop;
      const inactiveOffsetMinutes = resolveInactiveHoursOffset() * 60 / CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT;
      const totalMinutes = offsetY * 60 / CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT + inactiveOffsetMinutes;
      hourIndex = Math.floor(totalMinutes / 60);
    }

    hourIndex = Math.max(0, Math.min(23, hourIndex));
    const dueHour = (hourIndex + 1) % 24;
    return {
      hourIndex,
      startTime: `${String(hourIndex).padStart(2, '0')}:00`,
      dueTime: `${String(dueHour).padStart(2, '0')}:00`
    };
  }

  function resolveTimedTaskDropFromEvent(
    event: MouseEvent,
    payload: {
      originalStartDate: string;
      clickOffsetY?: number;
      durationMs?: number;
    }
  ): TimedTaskDropResolution | null {
    const { originalStartDate, clickOffsetY = 0, durationMs } = payload;
    const elements = document.elementsFromPoint(event.clientX, event.clientY);
    const target = event.target as HTMLElement | null;

    const allDayColumn = (elements.find(el => el.classList.contains('all-day-column')) as HTMLElement | undefined)
      || (target?.closest('.all-day-column') as HTMLElement | null);
    if (allDayColumn) {
      const dayKey = allDayColumn.getAttribute('data-day-key') || originalStartDate;
      return {
        kind: 'all-day',
        dayKey
      };
    }

    const dayColumn = (elements.find(el => el.classList.contains('day-column')) as HTMLElement | undefined)
      || (target?.closest('.day-column') as HTMLElement | null);
    if (!dayColumn) return null;

    const dayKey = dayColumn.getAttribute('data-day-key') || originalStartDate;
    const daysScrollElement = (elements.find(el => el.classList.contains('days-scroll')) as HTMLElement | undefined)
      || (dayColumn.closest('.days-scroll') as HTMLElement | null)
      || (target?.closest('.days-scroll') as HTMLElement | null);
    if (!daysScrollElement) return null;

    const scrollRect = daysScrollElement.getBoundingClientRect();
    const scrollTop = daysScrollElement.scrollTop;
    const offsetY = event.clientY - scrollRect.top + scrollTop - clickOffsetY;
    const inactiveOffsetMinutes = resolveInactiveHoursOffset() * 60 / CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT;
    const totalMinutes = offsetY * 60 / CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT + inactiveOffsetMinutes;
    const snapMinutes = CALENDAR_CONSTANTS.LAYOUT.TIME_SNAP_MINUTES;
    const snappedMinutes = Math.round(totalMinutes / snapMinutes) * snapMinutes;
    const maxStartMinutes = Math.max(0, 24 * 60 - snapMinutes);
    const clampedMinutes = Math.max(0, Math.min(maxStartMinutes, snappedMinutes));

    const hours = Math.floor(clampedMinutes / 60);
    const minutes = clampedMinutes % 60;
    const startTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    const safeDurationMs = Number.isFinite(durationMs)
      ? Math.max(15 * 60 * 1000, Number(durationMs))
      : 60 * 60 * 1000;
    const startDateTime = new Date(`${dayKey}T${startTime}`);
    const dueDateTime = new Date(startDateTime.getTime() + safeDurationMs);

    return {
      kind: 'timed',
      dayKey,
      startTime,
      dueTime: formatTime(dueDateTime),
      dueDate: formatDate(dueDateTime)
    };
  }

  function handleHandleMouseDown(event: MouseEvent, task: Task, handleType: 'start' | 'end') {
    if (event.button !== 0) return;
    if (isMobileFrontend) return;
    if (preventConcurrentDragStart(event)) return;
    resetMonthDayCellHitRects();

    const effectiveStartDate = task.startDate || task.dueDate;
    const originalDate = handleType === 'start'
      ? (effectiveStartDate || '')
      : (task.dueDate || effectiveStartDate || '');

    draggingHandle.value = {
      task,
      type: handleType,
      originalDate
    };

    dragLastUpdatedDate.value = '';
    handleDateChangedDuringDrag = false;
    isDragging.value = true;

    event.preventDefault();
    event.stopPropagation();

    addEventListener(document, 'mousemove', handleHandleMouseMove);
    addEventListener(document, 'mouseup', handleHandleMouseUp);
  }

  function handleHandleMouseMove(event: MouseEvent) {
    if (!draggingHandle.value) return;

    const { task, type } = draggingHandle.value;

    const targetData = findDayColumnFromEvent(event);
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
      const columnRect = targetData.element.getBoundingClientRect();
      const relativeX = event.clientX - columnRect.left;
      const columnWidth = columnRect.width;
      const isMonthDayCell = targetData.element.classList.contains('day-cell');

      if (!isMonthDayCell && relativeX < columnWidth * 0.1) {
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
    const attrKey = dateType === 'start' ? 'custom-task-start-date' : 'custom-task-due-date';
    const patch: Partial<Task> = dateType === 'start'
      ? { startDate: targetDateStr }
      : { dueDate: targetDateStr };

    const updatedTask = patchLocalTask(task.id, patch);
    handleDateChangedDuringDrag = !!updatedTask;

    if (task.type === 'block' && task.blockId) {
      scheduleSave(task.blockId, {
        [attrKey]: targetDateStr
      });
    }

    dragLastUpdatedDate.value = targetDateStr;
  }

  async function handleHandleMouseUp() {
    const taskId = draggingHandle.value?.task.id;
    if (handleDateChangedDuringDrag && taskId) {
      const updatedTask = getLocalTask(taskId);
      if (updatedTask) {
        emitTaskDateChanged(updatedTask);
      }
    }
    cleanupDragListeners();
    isDragging.value = false;
  }

  function cleanupDragListeners() {
    draggingHandle.value = null;
    handleDateChangedDuringDrag = false;
    resetMonthDayCellHitRects();
    removeEventListeners('mousemove');
    removeEventListeners('mouseup');
  }

  function handleTaskMouseDown(event: MouseEvent, task: Task) {
    if (event.button !== 0) return;
    if (isMobileFrontend) return;
    if (preventConcurrentDragStart(event)) return;
    if (!task.startDate && !task.dueDate) return;
    resetMonthDayCellHitRects();

    const effectiveStartDate = task.startDate || task.dueDate!;
    const pointerDay = findDayColumnFromEvent(event)?.date || new Date(effectiveStartDate);
    pointerDay.setHours(0, 0, 0, 0);
    const originalStartDate = new Date(effectiveStartDate);
    originalStartDate.setHours(0, 0, 0, 0);
    const taskElement = (event.target as HTMLElement).closest('.all-day-task, .task-chip') as HTMLElement | null;
    const layerElement = taskElement?.closest('.all-day-tasks-layer, .week-tasks-layer') as HTMLElement | null;
    const taskRect = taskElement?.getBoundingClientRect();
    const layerRect = layerElement?.getBoundingClientRect();
    const pointerOffsetDays = Math.round((pointerDay.getTime() - originalStartDate.getTime()) / (1000 * 60 * 60 * 24));

    draggingTask.value = {
      task,
      originalStart: effectiveStartDate,
      originalDue: task.dueDate || null,
      pointerOffsetDays,
      clickOffsetX: taskRect && layerRect ? event.clientX - taskRect.left : 0,
      clickOffsetY: taskRect && layerRect ? event.clientY - taskRect.top : 0,
      width: taskRect?.width || 0,
      height: taskRect?.height || 0,
      repeatSeriesSnapshot: isRepeatTask(task)
        ? buildRepeatSeriesDragSnapshot(task)
        : null
    };

    dragLastUpdatedDate.value = '';
    allDayTaskDragPreview.value = null;
    timedTaskDragPreview.value = null;
    isDragging.value = true;

    event.preventDefault();

    addEventListener(document, 'mousemove', queueAllDayTaskMove);
    addEventListener(document, 'mouseup', handleTaskMouseUp);
  }

  function updateAllDayTaskPosition(event: MouseEvent) {
    if (!draggingTask.value) return;

    const { task, originalStart, originalDue, pointerOffsetDays, clickOffsetX, clickOffsetY, width, height } = draggingTask.value;

    const targetData = findDayColumnFromEvent(event);
    if (!targetData) {
      dragState.value.overDayColumn = null;
      dragState.value.overAllDayColumn = null;
      return;
    }

    const targetDate = targetData.date;
    const targetDateStr = formatDate(targetDate);
    let timedStartTime = '09:00';
    let timedDueTime = '10:00';

    if (targetData.isTimedArea) {
      const dayColumn = targetData.element;
      const dayKey = dayColumn.getAttribute('data-day-key');
      if (dayKey) {
        const resolvedTime = resolveTimedHourFromPoint(event, dayColumn);
        dragState.value.overHourCell = `${dayKey}-${resolvedTime.hourIndex + 1}`;
        timedStartTime = resolvedTime.startTime;
        timedDueTime = resolvedTime.dueTime;
      }

      dragState.value.overDayColumn = null;
      dragState.value.overAllDayColumn = null;
    } else {
      dragState.value.overDayColumn = null;
      dragState.value.overHourCell = null;
      dragState.value.overAllDayColumn = null;
    }

    const originalStartDate = new Date(originalStart);
    originalStartDate.setHours(0, 0, 0, 0);
    const originalPointerDate = new Date(originalStartDate);
    originalPointerDate.setDate(originalPointerDate.getDate() + pointerOffsetDays);

    const daysDiff = Math.round((targetDate.getTime() - originalPointerDate.getTime()) / (1000 * 60 * 60 * 24));

    const newStartDate = new Date(originalStart);
    newStartDate.setDate(newStartDate.getDate() + daysDiff);

    let newDueDateStr = null;
    if (originalDue) {
      const newDueDate = new Date(originalDue);
      newDueDate.setDate(newDueDate.getDate() + daysDiff);
      newDueDateStr = formatDate(newDueDate);
    }

    const shiftedStartDateStr = formatDate(newStartDate);
    const dragSignature = targetData.isTimedArea
      ? `timed:${targetDateStr}:${timedStartTime}:${timedDueTime}`
      : `all-day:${shiftedStartDateStr}:${newDueDateStr || ''}`;

    if (!targetData.isTimedArea) {
      timedTaskDragPreview.value = null;
      const layer = (targetData.element.closest('.week-row')?.querySelector('.week-tasks-layer')
        || document.querySelector('.all-day-tasks-layer')) as HTMLElement | null;
      const layerRect = layer?.getBoundingClientRect();
      if (layerRect) {
        const floatingPosition = {
          left: event.clientX - layerRect.left - (clickOffsetX || 0),
          top: event.clientY - layerRect.top - (clickOffsetY || 0)
        };
        options.onAllDayTaskDragGhostMove?.(floatingPosition);
        if (dragLastUpdatedDate.value === dragSignature) return;
        allDayTaskDragPreview.value = {
          task,
          startDate: shiftedStartDateStr,
          dueDate: newDueDateStr,
          floatingLeft: floatingPosition.left,
          floatingTop: floatingPosition.top,
          width: width || 0,
          height: height || 0
        };
      }
    } else {
      const dayColumn = targetData.element;
      const daysScrollElement = dayColumn.closest('.days-scroll') as HTMLElement | null;
      const scrollRect = daysScrollElement?.getBoundingClientRect();
      const columnRect = dayColumn.getBoundingClientRect();
      if (scrollRect) {
        const floatingPosition = {
          left: event.clientX - columnRect.left - (width || 0) / 2,
          top: event.clientY - scrollRect.top + daysScrollElement!.scrollTop - (height || 0) / 2
        };
        options.onTimedTaskDragGhostMove?.(floatingPosition);
        if (dragLastUpdatedDate.value === dragSignature) return;
        timedTaskDragPreview.value = {
          task,
          target: {
            kind: 'timed',
            dayKey: targetDateStr,
            startTime: timedStartTime,
            dueTime: timedDueTime,
            dueDate: targetDateStr
          },
          floatingLeft: floatingPosition.left,
          floatingTop: floatingPosition.top,
          width: width || 0
        };
      }
      allDayTaskDragPreview.value = null;
    }

    dragLastUpdatedDate.value = dragSignature;
  }

  async function handleTaskMouseUp(event: MouseEvent) {
    if (!draggingTask.value) return;

    flushAllDayTaskMove(event);

    const { task, originalStart, originalDue, repeatSeriesSnapshot } = draggingTask.value;

    const targetData = findDayColumnFromEvent(event);
    const preview = allDayTaskDragPreview.value;
    allDayTaskDragPreview.value = null;
    timedTaskDragPreview.value = null;
    if (preview && preview.task.id === task.id && targetData && !targetData.isTimedArea) {
      const updatedTask = patchLocalTask(task.id, {
        startDate: preview.startDate,
        dueDate: preview.dueDate || undefined
      });
      if (updatedTask && !isRepeatTask(updatedTask)) {
        emitTaskDateChanged(updatedTask);
        if (updatedTask.type === 'block' && updatedTask.blockId) {
          scheduleSave(updatedTask.blockId, {
            'custom-task-start-date': preview.startDate,
            'custom-task-due-date': preview.dueDate || ''
          });
        }
      }
    }
    const currentTask = getLocalTask(task.id);
    const dropHourCell = dragState.value.overHourCell;

    // End drag visuals/listeners immediately, but keep sync suppression active until
    // repeat-series persistence finishes so stale external snapshots cannot briefly
    // restore the template task to its old slot.
    dragState.value.overDayColumn = null;
    dragState.value.overAllDayColumn = null;
    dragState.value.overHourCell = null;
    removeEventListeners('mousemove');
    removeEventListeners('mouseup');
    draggingTask.value = null;
    clearAllDayTaskMove();
    dragLastUpdatedDate.value = '';
    resetMonthDayCellHitRects();

    try {
      if (currentTask && targetData && targetData.isTimedArea) {
        const newDayKey = formatDate(targetData.date);

        let startTime = '09:00';
        let dueTime = '10:00';

        if (dropHourCell) {
          const match = dropHourCell.match(/-(\d+)$/);
          if (match) {
            // dragState.overHourCell stores display hour index (1-24), convert to 0-23.
            const hourIndex = Math.max(0, Math.min(23, parseInt(match[1], 10) - 1));
            startTime = `${String(hourIndex).padStart(2, '0')}:00`;
            const dueHour = (hourIndex + 1) % 24;
            dueTime = `${String(dueHour).padStart(2, '0')}:00`;
          }
        }

        const targetDate = repeatSeriesSnapshot
          ? newDayKey
          : (currentTask.isVirtual && currentTask.repeatInstanceDate
          ? currentTask.repeatInstanceDate
          : newDayKey);

        const scope = await resolveRepeatMoveScope({
          task: currentTask,
          mode: 'timed',
          fromStartDate: originalStart || null,
          fromDueDate: originalDue || null,
          toStartDate: targetDate,
          toDueDate: targetDate
        });

        if (scope !== 'cancel') {
          if (repeatSeriesSnapshot && scope === 'series' && isRepeatTask(currentTask)) {
            const deltaDays = getDayDelta(originalStart, targetDate);

            try {
              const series = await getRepeatSeriesForTask(currentTask);
              if (series) {
                const nextSeriesStart = shiftDate(series.startDate, deltaDays);
                const nextSeriesEnd = series.endDate ? shiftDate(series.endDate, deltaDays) : null;
                await updateRepeatSeriesDates(
                  currentTask,
                  nextSeriesStart,
                  nextSeriesEnd,
                  {
                    startTime,
                    dueTime
                  },
                  { emitChange: false }
                );

                const templateBlockId = series.templateBlockId
                  || localTasks.value.find(item => !item.isVirtual && item.repeatSeriesId === series.id)?.blockId;
                if (templateBlockId) {
                  await setBlockAttrs(templateBlockId, {
                    'custom-task-start-date': nextSeriesStart || '',
                    'custom-task-due-date': nextSeriesEnd || '',
                    'custom-task-start-time': startTime,
                    'custom-task-due-time': dueTime
                  });
                }
                notifyRepeatChanged({
                  blockId: templateBlockId,
                  seriesId: series.id,
                  frequency: series.frequency
                });
              }

              emitRepeatSeriesSnapshotTasks(repeatSeriesSnapshot);
            } catch (_error) {
              restoreRepeatSeriesDragSnapshot(repeatSeriesSnapshot);
            }
            return;
          }

          if (repeatSeriesSnapshot && scope === 'single') {
            restoreRepeatSeriesDragSnapshot(repeatSeriesSnapshot);
          }

          const updatedTask = patchLocalTask(task.id, {
            startDate: targetDate,
            dueDate: targetDate,
            startTime,
            dueTime
          });
          if (updatedTask) {
            emitTaskDateChanged(updatedTask);
          }

          if (scope === 'series' && currentTask.repeatSeriesId) {
            for (const candidate of localTasks.value) {
              if (candidate.id === task.id) continue;
              if (candidate.repeatSeriesId !== currentTask.repeatSeriesId) continue;
              const syncedTask = patchLocalTask(candidate.id, {
                startTime,
                dueTime
              });
              if (syncedTask) {
                emitTaskDateChanged(syncedTask);
              }
            }
            try {
              const series = await getRepeatSeriesForTask(currentTask);
              if (series) {
                await updateRepeatSeriesDates(
                  currentTask,
                  series.startDate,
                  series.endDate || null,
                  {
                    startTime,
                    dueTime
                  },
                  { emitChange: false }
                );
              }
            } catch (_error) {
            }
          }

          const persistTarget = (task.type === 'block' && task.blockId)
            ? task
            : localTasks.value.find(
              candidate => !candidate.isVirtual
                && !!candidate.blockId
                && !!currentTask.repeatSeriesId
                && candidate.repeatSeriesId === currentTask.repeatSeriesId
            );

          if (persistTarget?.blockId) {
            try {
              const attrs: Record<string, string> = {
                'custom-task-start-time': startTime,
                'custom-task-due-time': dueTime
              };
              if (persistTarget.id === task.id) {
                attrs['custom-task-start-date'] = targetDate;
                attrs['custom-task-due-date'] = targetDate;
              }
              await setBlockAttrs(persistTarget.blockId, attrs);
            } catch (error) {
            }
          }

          if (scope === 'series' && currentTask.repeatSeriesId) {
            try {
              const series = await getRepeatSeriesForTask(currentTask);
              if (series) {
                notifyRepeatChanged({
                  blockId: series.templateBlockId || persistTarget?.blockId,
                  seriesId: series.id,
                  frequency: series.frequency
                });
              }
            } catch (_error) {
            }
          }
        } else {
          if (repeatSeriesSnapshot) {
            restoreRepeatSeriesDragSnapshot(repeatSeriesSnapshot);
          } else {
            patchLocalTask(task.id, {
              startDate: originalStart,
              dueDate: originalDue,
              startTime: task.startTime,
              dueTime: task.dueTime
            });
          }
        }
      } else if (currentTask && isRepeatTask(currentTask)) {
        const currentStart = currentTask.startDate || currentTask.dueDate || null;
        const currentDue = currentTask.dueDate || currentTask.startDate || null;
        const originalStartDate = originalStart || null;
        const originalDueDate = originalDue || originalStart || null;
        const moved = currentStart !== originalStartDate || currentDue !== originalDueDate;
        if (moved && currentStart) {
          const scope = await resolveRepeatMoveScope({
            task: currentTask,
            mode: 'all-day',
            fromStartDate: originalStartDate,
            fromDueDate: originalDueDate,
            toStartDate: currentStart,
            toDueDate: currentDue
          });

          if (scope === 'cancel') {
            if (repeatSeriesSnapshot) {
              restoreRepeatSeriesDragSnapshot(repeatSeriesSnapshot);
            } else {
              patchLocalTask(task.id, {
                startDate: originalStartDate,
                dueDate: originalDueDate
              });
            }
            if (task.type === 'block' && task.blockId) {
              try {
                await setBlockAttrs(task.blockId, {
                  'custom-task-start-date': originalStartDate || '',
                  'custom-task-due-date': originalDueDate || ''
                });
              } catch (_error) {
              }
            }
          } else if (scope === 'series') {
            const from = new Date(originalStartDate || currentStart);
            const to = new Date(currentStart);
            from.setHours(0, 0, 0, 0);
            to.setHours(0, 0, 0, 0);
            const deltaDays = Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));

            if (repeatSeriesSnapshot) {
              try {
                const series = await getRepeatSeriesForTask(currentTask);
                if (series) {
                  const nextSeriesStart = shiftDate(series.startDate, deltaDays);
                  const nextSeriesEnd = series.endDate ? shiftDate(series.endDate, deltaDays) : null;
                  await updateRepeatSeriesDates(
                    currentTask,
                    nextSeriesStart,
                    nextSeriesEnd,
                    undefined,
                    { emitChange: false }
                  );
                  if (series.templateBlockId) {
                    await setBlockAttrs(series.templateBlockId, {
                      'custom-task-start-date': nextSeriesStart || '',
                      'custom-task-due-date': nextSeriesEnd || ''
                    });
                  }
                  notifyRepeatChanged({
                    blockId: series.templateBlockId,
                    seriesId: series.id,
                    frequency: series.frequency
                  });
                }

                emitRepeatSeriesSnapshotTasks(repeatSeriesSnapshot);
              } catch (_error) {
                restoreRepeatSeriesDragSnapshot(repeatSeriesSnapshot);
              }
            } else {
              if (deltaDays !== 0 && currentTask.repeatSeriesId) {
                for (const candidate of localTasks.value) {
                  if (candidate.id === task.id) continue;
                  if (candidate.repeatSeriesId !== currentTask.repeatSeriesId) continue;
                  const baseStart = candidate.startDate || candidate.dueDate;
                  const baseDue = candidate.dueDate || candidate.startDate;
                  if (!baseStart || !baseDue) continue;
                  const shiftedTask = patchLocalTask(candidate.id, {
                    startDate: shiftDate(baseStart, deltaDays),
                    dueDate: shiftDate(baseDue, deltaDays)
                  });
                  if (shiftedTask) {
                    emitTaskDateChanged(shiftedTask);
                  }
                }
              }
              try {
                const series = await getRepeatSeriesForTask(currentTask);
                if (series) {
                  const nextSeriesStart = shiftDate(series.startDate, deltaDays);
                  const nextSeriesEnd = series.endDate ? shiftDate(series.endDate, deltaDays) : null;
                  await updateRepeatSeriesDates(
                    currentTask,
                    nextSeriesStart,
                    nextSeriesEnd,
                    undefined,
                    { emitChange: false }
                  );
                  if (series.templateBlockId) {
                    await setBlockAttrs(series.templateBlockId, {
                      'custom-task-start-date': nextSeriesStart || '',
                      'custom-task-due-date': nextSeriesEnd || ''
                    });
                  }
                  notifyRepeatChanged({
                    blockId: series.templateBlockId,
                    seriesId: series.id,
                    frequency: series.frequency
                  });
                }
              } catch (_error) {
              }
            }
          } else if (scope === 'single' && task.type === 'block' && task.blockId) {
            if (repeatSeriesSnapshot) {
              restoreRepeatSeriesDragSnapshot(repeatSeriesSnapshot);
              const updatedTask = patchLocalTask(task.id, {
                startDate: currentStart,
                dueDate: currentDue
              });
              if (updatedTask) {
                emitTaskDateChanged(updatedTask);
              }
            }
            try {
              await setBlockAttrs(task.blockId, {
                'custom-task-start-date': currentStart || '',
                'custom-task-due-date': currentDue || ''
              });
            } catch (_error) {
            }
          }
        }
      }
    } finally {
      isDragging.value = false;
    }

  }

  function handleTimedTaskHandleMouseDown(event: MouseEvent, task: Task, handleType: 'start' | 'end') {
    if (event.button !== 0) return;
    if (isMobileFrontend) return;
    if (preventConcurrentDragStart(event)) return;
    clearTimedTaskHandleMove();

    const repeatSeriesSnapshot = isRepeatTask(task)
      ? buildRepeatSeriesDragSnapshot(task)
      : null;
    draggingTimedTaskHandle.value = {
      task,
      type: handleType,
      originalStartTime: task.startTime || '00:00',
      originalEndTime: task.dueTime || '01:00',
      originalStartDate: task.startDate || formatDate(new Date()),
      originalDueDate: task.dueDate || formatDate(new Date()),
      repeatSeriesSnapshot
    };

    isDragging.value = true;

    event.preventDefault();
    event.stopPropagation();

    addEventListener(document, 'mousemove', handleTimedTaskHandleMouseMove);
    addEventListener(document, 'mouseup', handleTimedTaskHandleMouseUp);
  }

  function handleTimedTaskHandleMouseMove(event: MouseEvent) {
    queueTimedTaskHandleMove(event);
  }

  function updateTimedTaskHandlePosition(event: MouseEvent) {
    if (!draggingTimedTaskHandle.value) return;

    const { task, type, repeatSeriesSnapshot } = draggingTimedTaskHandle.value;

    const target = event.target as HTMLElement;
    const dayColumn = target.closest('.day-column') as HTMLElement;
    const daysScrollElement = target.closest('.days-scroll') as HTMLElement;
    if (!dayColumn || !daysScrollElement) return;

    const newDayKey = dayColumn.getAttribute('data-day-key');
    if (!newDayKey) return;

    const scrollRect = daysScrollElement.getBoundingClientRect();
    const scrollTop = daysScrollElement.scrollTop;
    const offsetY = event.clientY - scrollRect.top + scrollTop;

    const inactiveOffsetMinutes = resolveInactiveHoursOffset() * 60 / CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT;
    const totalMinutes = Math.round(offsetY * 60 / CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT) + inactiveOffsetMinutes;
    const snappedMinutes = Math.round(totalMinutes / CALENDAR_CONSTANTS.LAYOUT.TIME_SNAP_MINUTES) * CALENDAR_CONSTANTS.LAYOUT.TIME_SNAP_MINUTES;

    const hours = Math.floor(snappedMinutes / 60);
    const minutes = snappedMinutes % 60;
    const newTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    const previewKey = `${type}:${newDayKey}:${newTime}`;
    if (previewKey === lastTimedTaskHandlePreviewKey) return;

    const currentTask = getLocalTask(task.id);
    if (!currentTask) return;
    const currentStartDate = currentTask.startDate || newDayKey;
    const currentDueDate = currentTask.dueDate || newDayKey;
    const currentStartTime = currentTask.startTime || '00:00';
    const currentDueTime = currentTask.dueTime || '01:00';

    const endDateTime = new Date(currentDueDate + 'T' + currentDueTime);
    const startDateTime = new Date(currentStartDate + 'T' + currentStartTime);

    if (type === 'start') {
      const newStartDateTime = new Date(newDayKey + 'T' + newTime);
      const maxStartTime = endDateTime.getTime() - 15 * 60 * 1000;

      if (newStartDateTime.getTime() >= maxStartTime) return;

      if (repeatSeriesSnapshot) {
        applyRepeatSeriesTimedHandleMove(
          repeatSeriesSnapshot,
          task.id,
          'start',
          newDayKey,
          newTime
        );
      } else {
        patchLocalTask(task.id, {
          startDate: newDayKey,
          startTime: newTime
        });
      }
    } else {
      const newEndDateTime = new Date(newDayKey + 'T' + newTime);
      const minEndTime = startDateTime.getTime() + 15 * 60 * 1000;

      if (newEndDateTime.getTime() <= minEndTime) return;

      if (repeatSeriesSnapshot) {
        applyRepeatSeriesTimedHandleMove(
          repeatSeriesSnapshot,
          task.id,
          'end',
          newDayKey,
          newTime
        );
      } else {
        patchLocalTask(task.id, {
          dueDate: newDayKey,
          dueTime: newTime
        });
      }
    }
    lastTimedTaskHandlePreviewKey = previewKey;
  }

  async function handleTimedTaskHandleMouseUp() {
    if (!draggingTimedTaskHandle.value) return;
    flushTimedTaskHandleMove();

    const {
      task,
      type,
      originalStartTime,
      originalEndTime,
      originalStartDate,
      originalDueDate,
      repeatSeriesSnapshot
    } = draggingTimedTaskHandle.value;
    // End the interaction before persistence starts.  setBlockAttrs and repeat
    // updates are async; keeping this ref set until they finish leaves the UI
    // looking like it is still attached to the pointer.
    draggingTimedTaskHandle.value = null;
    isDragging.value = false;
    clearTimedTaskHandleMove();
    removeEventListeners('mousemove');
    removeEventListeners('mouseup');
    const currentTask = getLocalTask(task.id);

    if (currentTask) {
      const newStartTime = currentTask.startTime || originalStartTime;
      const newEndTime = currentTask.dueTime || originalEndTime;
      const newStartDate = currentTask.startDate || originalStartDate;
      const newDueDate = currentTask.dueDate || originalDueDate;

      const timeChanged = newStartTime !== originalStartTime || newEndTime !== originalEndTime;
      const dateChanged = newStartDate !== originalStartDate || newDueDate !== originalDueDate;

      if (timeChanged || dateChanged) {
        if (repeatSeriesSnapshot && isRepeatTask(currentTask)) {
          try {
            const series = await getRepeatSeriesForTask(currentTask);

            if (series) {
              const dateDeltaDays = type === 'start'
                ? getDayDelta(originalStartDate, newStartDate)
                : getDayDelta(originalDueDate, newDueDate);
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
                try {
                  await setBlockAttrs(templateBlockId, {
                    'custom-task-start-date': nextSeriesStart || '',
                    'custom-task-due-date': nextSeriesEnd || '',
                    'custom-task-start-time': newStartTime,
                    'custom-task-due-time': newEndTime
                  });
                } catch (_error) {
                }
              }
              notifyRepeatChanged({
                blockId: templateBlockId,
                seriesId: series.id,
                frequency: series.frequency
              });

              for (const entry of repeatSeriesSnapshot.entries) {
                const syncedTask = getLocalTask(entry.id);
                if (syncedTask) {
                  emitTaskDateChanged(syncedTask);
                }
              }
            }
          } catch (error) {
            restoreRepeatSeriesDragSnapshot(repeatSeriesSnapshot);
          }
        } else if (task.type === 'block' && task.blockId) {
          try {
            const attrs: Record<string, string> = {
              'custom-task-start-time': newStartTime,
              'custom-task-due-time': newEndTime
            };

            if (dateChanged) {
              attrs['custom-task-start-date'] = newStartDate;
              attrs['custom-task-due-date'] = newDueDate;
            }

            await setBlockAttrs(task.blockId, attrs);
            const syncedTask = getLocalTask(task.id);
            if (syncedTask) {
              emitTaskDateChanged(syncedTask);
            }
          } catch (error) {
            patchLocalTask(task.id, {
              startDate: originalStartDate,
              dueDate: originalDueDate,
              startTime: originalStartTime,
              dueTime: originalEndTime
            });
          }
        } else {
          emitTaskDateChanged(currentTask);
        }
      }
    }

  }

  function handleTimedTaskMouseDown(event: MouseEvent, task: Task, dayKey: string) {
    if (event.button !== 0) return;
    if (isMobileFrontend) return;
    if (preventConcurrentDragStart(event)) return;

    clearTimedRepeatPreview();
    clearTimedTaskMove();
    const target = event.target as HTMLElement;
    const timedTaskElement = target.closest('.timed-task') as HTMLElement;
    const daysScrollElement = target.closest('.days-scroll') as HTMLElement;
    if (!timedTaskElement || !daysScrollElement) return;

    const taskRect = timedTaskElement.getBoundingClientRect();
    const clickOffsetX = event.clientX - taskRect.left;
    const clickOffsetY = event.clientY - taskRect.top;

    const originalStartDate = task.startDate || dayKey;
    const originalDueDate = task.dueDate || dayKey;
    const originalStartTime = task.startTime || '00:00';
    const originalEndTime = task.dueTime || '01:00';

    const startDateTime = new Date(originalStartDate + 'T' + originalStartTime);
    const dueDateTime = new Date(originalDueDate + 'T' + originalEndTime);
    const durationMs = dueDateTime.getTime() - startDateTime.getTime();
    const repeatSeriesSnapshot = isRepeatTask(task)
      ? buildRepeatSeriesDragSnapshot(task)
      : null;

    draggingTimedTask.value = {
      task,
      originalStartTime,
      originalEndTime,
      originalStartDate,
      originalDueDate,
      dayKey,
      startClientX: event.clientX,
      startClientY: event.clientY,
      hasMoved: false,
      clickOffsetX,
      clickOffsetY,
      taskWidth: taskRect.width,
      taskHeight: taskRect.height,
      durationMs,
      repeatSeriesSnapshot
    };

    isDragging.value = true;

    event.preventDefault();
    event.stopPropagation();

    addEventListener(document, 'mousemove', handleTimedTaskMouseMove);
    addEventListener(document, 'mouseup', handleTimedTaskMouseUp);
  }

  function handleTimedTaskMouseMove(event: MouseEvent) {
    queueTimedTaskMove(event);
  }

  function updateTimedTaskPosition(event: MouseEvent) {
    if (!draggingTimedTask.value) return;

    const drag = draggingTimedTask.value;
    const { task, originalStartDate, clickOffsetX, clickOffsetY, taskWidth, taskHeight, durationMs } = drag;
    if (!drag.hasMoved) {
      const movedDistance = Math.hypot(event.clientX - drag.startClientX, event.clientY - drag.startClientY);
      if (movedDistance < TIMED_TASK_DRAG_THRESHOLD_PX) return;
      drag.hasMoved = true;
    }

    const target = event.target as HTMLElement;
    const daysScrollElement = target.closest('.days-scroll') as HTMLElement;
    const allDaySection = target.closest('.all-day-section') as HTMLElement;

    if (allDaySection) {
      const allDayColumn = target.closest('.all-day-column') as HTMLElement;
      if (allDayColumn) {
        const newDayKey = allDayColumn.getAttribute('data-day-key') || originalStartDate;
        const previewKey = `all-day:${newDayKey}`;
        const layer = document.querySelector('.all-day-tasks-layer') as HTMLElement | null;
        const layerRect = layer?.getBoundingClientRect();
        if (layerRect) {
          const floatingPosition = {
            left: event.clientX - layerRect.left - (clickOffsetX || 0),
            top: event.clientY - layerRect.top - (clickOffsetY || 0)
          };
          options.onAllDayTaskDragGhostMove?.(floatingPosition);
          if (previewKey === lastTimedTaskPreviewKey) return;
          allDayTaskDragPreview.value = {
            task,
            startDate: newDayKey,
            dueDate: newDayKey,
            floatingLeft: floatingPosition.left,
            floatingTop: floatingPosition.top,
            width: taskWidth || 0,
            height: taskHeight || 0
          };
        } else if (previewKey === lastTimedTaskPreviewKey) {
          return;
        }
        dragState.value.overAllDayColumn = newDayKey;
        dragState.value.overDayColumn = null;

        timedTaskDragPreview.value = null;
        lastTimedTaskPreviewKey = previewKey;
      }
      return;
    }

    dragState.value.overAllDayColumn = null;
    allDayTaskDragPreview.value = null;

    const dayColumn = target.closest('.day-column') as HTMLElement;
    if (!daysScrollElement || !dayColumn) return;

    const newDayKey = dayColumn.getAttribute('data-day-key') || originalStartDate;

    const scrollRect = daysScrollElement.getBoundingClientRect();
    const scrollTop = daysScrollElement.scrollTop;
    const offsetY = event.clientY - scrollRect.top + scrollTop - (clickOffsetY || 0);
    const columnRect = dayColumn.getBoundingClientRect();
    const floatingLeft = event.clientX - columnRect.left - (clickOffsetX || 0);

    const inactiveOffsetMinutes = resolveInactiveHoursOffset() * 60 / CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT;
    const totalMinutes = offsetY * 60 / CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT + inactiveOffsetMinutes;
    const snapMinutes = CALENDAR_CONSTANTS.LAYOUT.TIME_SNAP_MINUTES;
    const snappedMinutes = Math.round(totalMinutes / snapMinutes) * snapMinutes;
    const maxStartMinutes = Math.max(0, 24 * 60 - snapMinutes);
    const clampedMinutes = Math.max(0, Math.min(maxStartMinutes, snappedMinutes));

    const hours = Math.floor(clampedMinutes / 60);
    const minutes = clampedMinutes % 60;
    const newStartTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    const previewKey = `timed:${newDayKey}:${newStartTime}`;
    const newStartDateTime = new Date(newDayKey + 'T' + newStartTime);
    const safeDurationMs = Number.isFinite(durationMs)
      ? Math.max(15 * 60 * 1000, Number(durationMs))
      : 60 * 60 * 1000;
    const newDueDateTime = new Date(newStartDateTime.getTime() + safeDurationMs);
    const floatingPosition = { left: floatingLeft, top: offsetY };
    options.onTimedTaskDragGhostMove?.(floatingPosition);
    if (previewKey === lastTimedTaskPreviewKey) return;
    timedTaskDragPreview.value = {
      task,
      target: {
        kind: 'timed',
        dayKey: newDayKey,
        startTime: newStartTime,
        dueTime: formatTime(newDueDateTime),
        dueDate: formatDate(newDueDateTime)
      },
      floatingLeft: floatingPosition.left,
      floatingTop: floatingPosition.top,
      width: taskWidth || 0
    };
    lastTimedTaskPreviewKey = previewKey;
  }

  async function handleTimedTaskMouseUp(event: MouseEvent) {
    if (!draggingTimedTask.value) return;
    flushTimedTaskMove();

    const {
      task,
      originalStartTime,
      originalEndTime,
      originalStartDate,
      originalDueDate,
      clickOffsetY,
      durationMs,
      repeatSeriesSnapshot,
      hasMoved
    } = draggingTimedTask.value;
    if (!hasMoved) {
      draggingTimedTask.value = null;
      isDragging.value = false;
      clearTimedTaskMove();
      removeEventListeners('mousemove');
      removeEventListeners('mouseup');
      return;
    }
    const finalDrop = resolveTimedTaskDropFromEvent(event, {
      originalStartDate,
      clickOffsetY,
      durationMs
    });

    // Release the visual drag state before any async persistence.  This makes
    // the card settle immediately on mouseup even when saving is slow.
    draggingTimedTask.value = null;
    dragState.value.overDayColumn = null;
    dragState.value.overAllDayColumn = null;
    isDragging.value = false;
    clearTimedTaskMove();
    allDayTaskDragPreview.value = null;
    removeEventListeners('mousemove');
    removeEventListeners('mouseup');

    if (repeatSeriesSnapshot) {
      if (finalDrop) {
        clearTimedRepeatPreview();
        const deltaDays = getDayDelta(originalStartDate, finalDrop.dayKey);
        if (finalDrop.kind === 'all-day') {
          applyRepeatSeriesTimedMove(repeatSeriesSnapshot, deltaDays, undefined, true);
        } else {
          applyRepeatSeriesTimedMove(repeatSeriesSnapshot, deltaDays, finalDrop.startTime, false);
        }
      } else {
        flushTimedRepeatPreview();
      }
    } else {
      clearTimedRepeatPreview();
    }

    const currentTask = getLocalTask(task.id);

    if (currentTask) {
      const target = event.target as HTMLElement | null;
      const allDaySection = target?.closest('.all-day-section') as HTMLElement | null;
      const isAllDayDrop = finalDrop ? finalDrop.kind === 'all-day' : !!allDaySection;
      const resolvedStartDate = finalDrop?.dayKey || currentTask.startDate || originalStartDate;
      const resolvedDueDate = (
        finalDrop?.kind === 'timed'
          ? finalDrop.dueDate
          : finalDrop?.kind === 'all-day'
            ? finalDrop.dayKey
            : undefined
      ) || currentTask.dueDate || originalDueDate;
      const resolvedStartTime = finalDrop?.kind === 'timed'
        ? (finalDrop.startTime || currentTask.startTime || originalStartTime)
        : (currentTask.startTime || originalStartTime);
      const resolvedEndTime = finalDrop?.kind === 'timed'
        ? (finalDrop.dueTime || currentTask.dueTime || originalEndTime)
        : (currentTask.dueTime || originalEndTime);

      if (repeatSeriesSnapshot && isRepeatTask(currentTask)) {
        try {
          const series = await getRepeatSeriesForTask(currentTask);
          if (series) {
            const from = new Date(originalStartDate);
            const to = new Date(resolvedStartDate);
            from.setHours(0, 0, 0, 0);
            to.setHours(0, 0, 0, 0);
            const deltaDays = Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
            const nextSeriesStart = shiftDate(series.startDate, deltaDays);
            const nextSeriesEnd = series.endDate ? shiftDate(series.endDate, deltaDays) : null;
            await updateRepeatSeriesDates(
              currentTask,
              nextSeriesStart,
              nextSeriesEnd,
              {
                startTime: isAllDayDrop ? null : resolvedStartTime,
                dueTime: isAllDayDrop ? null : resolvedEndTime
              },
              { emitChange: false }
            );

            const templateBlockId = series.templateBlockId
              || localTasks.value.find(item => !item.isVirtual && item.repeatSeriesId === series.id)?.blockId;
            if (templateBlockId) {
              await setBlockAttrs(templateBlockId, {
                'custom-task-start-date': nextSeriesStart || '',
                'custom-task-due-date': nextSeriesEnd || '',
                'custom-task-start-time': isAllDayDrop ? null : resolvedStartTime,
                'custom-task-due-time': isAllDayDrop ? null : resolvedEndTime
              });
            }
            notifyRepeatChanged({
              blockId: templateBlockId,
              seriesId: series.id,
              frequency: series.frequency
            });

            for (const entry of repeatSeriesSnapshot.entries) {
              const synced = getLocalTask(entry.id);
              if (synced) {
                emitTaskDateChanged(synced);
              }
            }

            const templateTask = localTasks.value.find(item => !item.isVirtual && item.repeatSeriesId === series.id);
            if (!templateTask) {
              emitTaskDateChanged(currentTask);
            }
          }
        } catch (error) {
          restoreRepeatSeriesDragSnapshot(repeatSeriesSnapshot);
        }
      } else if (isAllDayDrop) {
        const updatedTask = patchLocalTask(task.id, {
          startDate: resolvedStartDate,
          dueDate: resolvedDueDate,
          startTime: undefined,
          dueTime: undefined
        });
        const syncedTask = updatedTask || getLocalTask(task.id) || currentTask;
        const persistBlockId = (
          (typeof currentTask.blockId === 'string' && currentTask.blockId.trim())
          || (typeof task.blockId === 'string' && task.blockId.trim())
          || (typeof task.id === 'string' && task.id.startsWith('block_') ? task.id.slice(6) : '')
        );

        if (persistBlockId) {
          try {
            await setBlockAttrs(persistBlockId, {
              'custom-task-start-date': resolvedStartDate,
              'custom-task-due-date': resolvedDueDate,
              'custom-task-start-time': null,
              'custom-task-due-time': null
            });
          } catch (error) {
            patchLocalTask(task.id, {
              startTime: originalStartTime,
              dueTime: originalEndTime,
              startDate: originalStartDate,
              dueDate: originalDueDate
            });
          }
        }

        if (syncedTask) {
          emitTaskDateChanged(syncedTask);
        }
      } else {
        if (
          resolvedStartTime !== originalStartTime
          || resolvedEndTime !== originalEndTime
          || resolvedStartDate !== originalStartDate
          || resolvedDueDate !== originalDueDate
        ) {
          const updatedTask = patchLocalTask(task.id, {
            startTime: resolvedStartTime,
            dueTime: resolvedEndTime,
            startDate: resolvedStartDate,
            dueDate: resolvedDueDate
          });
          const syncedTask = updatedTask || getLocalTask(task.id) || currentTask;
          const persistBlockId = (
            (typeof currentTask.blockId === 'string' && currentTask.blockId.trim())
            || (typeof task.blockId === 'string' && task.blockId.trim())
            || (typeof task.id === 'string' && task.id.startsWith('block_') ? task.id.slice(6) : '')
          );

          if (persistBlockId) {
            try {
              await setBlockAttrs(persistBlockId, {
                'custom-task-start-time': resolvedStartTime,
                'custom-task-due-time': resolvedEndTime,
                'custom-task-start-date': resolvedStartDate,
                'custom-task-due-date': resolvedDueDate
              });
            } catch (error) {
              patchLocalTask(task.id, {
                startTime: originalStartTime,
                dueTime: originalEndTime,
                startDate: originalStartDate,
                dueDate: originalDueDate
              });
            }
          }

          if (syncedTask) {
            emitTaskDateChanged(syncedTask);
          }
        }
      }
    }

    clearTimedRepeatPreview();
  }

  return {
    dragState,
    draggingHandle,
    draggingTask,
    allDayTaskDragPreview,
    draggingTimedTaskHandle,
    draggingTimedTask,
    timedTaskDragPreview,
    isDragging,
    handleHandleMouseDown,
    handleTaskMouseDown,
    handleTimedTaskHandleMouseDown,
    handleTimedTaskMouseDown,
    removeEventListeners
  };
}
