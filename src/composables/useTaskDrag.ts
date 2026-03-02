import { ref, type Ref } from 'vue';
import { getFrontend } from 'siyuan';
import type { Task } from '@/api';
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
}

interface RepeatSeriesDragSnapshotEntry {
  id: string;
  startDate: string;
  dueDate: string;
  startTime?: string;
  dueTime?: string;
}

interface RepeatSeriesDragSnapshot {
  seriesId: string;
  entries: RepeatSeriesDragSnapshotEntry[];
}

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
  const draggingTask = ref<{ task: Task; originalStart: string; originalDue: string | null; pointerOffsetDays: number } | null>(null);
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
  const draggingTimedTask = ref<{ task: Task; originalStartTime: string; originalEndTime: string; originalStartDate: string; originalDueDate: string; dayKey: string; clickOffsetY?: number; durationMs?: number; repeatSeriesSnapshot?: RepeatSeriesDragSnapshot | null } | null>(null);
  const pendingTimedRepeatPreview = ref<{
    snapshot: RepeatSeriesDragSnapshot;
    deltaDays: number;
    nextStartTime?: string;
    clearTime: boolean;
  } | null>(null);
  let timedRepeatPreviewRafId: number | null = null;

  const eventListeners = ref<EventListener[]>([]);

  function isRepeatTask(task: Task): boolean {
    return !!task.repeatSeriesId || (!!task.repeatFrequency && task.repeatFrequency !== 'none');
  }

  function buildRepeatSeriesDragSnapshot(task: Task): RepeatSeriesDragSnapshot | null {
    if (!task.repeatSeriesId) return null;
    const seriesId = task.repeatSeriesId;
    const entries = localTasks.value
      .filter(candidate => candidate.repeatSeriesId === seriesId)
      .map((candidate) => {
        const startDate = candidate.startDate || candidate.dueDate || '';
        const dueDate = candidate.dueDate || candidate.startDate || startDate;
        if (!startDate || !dueDate) return null;
        return {
          id: candidate.id,
          startDate,
          dueDate,
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
          startDate: entry.startDate,
          dueDate: entry.dueDate,
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
        updates.push({
          id: entry.id,
          patch: {
            startDate: shiftedStartDate,
            dueDate: shiftedDueDate,
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

      updates.push({
        id: entry.id,
        patch: {
          startDate: formatDate(shiftedStartDateTime),
          dueDate: formatDate(shiftedDueDateTime),
          startTime: targetStartTime,
          dueTime: formatTime(shiftedDueDateTime)
        }
      });
    }

    patchLocalTasksBatch(updates, { emit: false });
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
            startDate: formatDate(nextStartDateTime),
            startTime: formatTime(nextStartDateTime)
          }
        });
      } else {
        const candidateDueMs = entryDueDateTime.getTime() + deltaMs;
        const minDueMs = entryStartDateTime.getTime() + minDurationMs;
        const nextDueDateTime = new Date(Math.max(candidateDueMs, minDueMs));
        updates.push({
          id: entry.id,
          patch: {
            dueDate: formatDate(nextDueDateTime),
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

  function scheduleTimedRepeatPreview(
    snapshot: RepeatSeriesDragSnapshot,
    deltaDays: number,
    nextStartTime: string | undefined,
    clearTime: boolean
  ): void {
    pendingTimedRepeatPreview.value = {
      snapshot,
      deltaDays,
      nextStartTime,
      clearTime
    };
    if (timedRepeatPreviewRafId !== null) return;
    timedRepeatPreviewRafId = requestAnimationFrame(() => {
      timedRepeatPreviewRafId = null;
      flushTimedRepeatPreview();
    });
  }

  function clearTimedRepeatPreview(): void {
    pendingTimedRepeatPreview.value = null;
    if (timedRepeatPreviewRafId !== null) {
      cancelAnimationFrame(timedRepeatPreviewRafId);
      timedRepeatPreviewRafId = null;
    }
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
      // Fallback for MonthView: resolve day cell by pointer position.
      const dayCells = Array.from(document.querySelectorAll('.day-cell[data-day-key]')) as HTMLElement[];
      const hitCell = dayCells.find((cell) => {
        const rect = cell.getBoundingClientRect();
        return event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom;
      });
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

  function handleHandleMouseDown(event: MouseEvent, task: Task, handleType: 'start' | 'end') {
    if (isMobileFrontend) return;

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
    if (updatedTask) {
      emitTaskDateChanged(updatedTask);
    }

    if (task.type === 'block' && task.blockId) {
      scheduleSave(task.blockId, {
        [attrKey]: targetDateStr
      });
    }

    dragLastUpdatedDate.value = targetDateStr;
  }

  async function handleHandleMouseUp() {
    cleanupDragListeners();
    isDragging.value = false;
  }

  function cleanupDragListeners() {
    draggingHandle.value = null;
    removeEventListeners('mousemove');
    removeEventListeners('mouseup');
  }

  function handleTaskMouseDown(event: MouseEvent, task: Task) {
    if (isMobileFrontend) return;
    if (!task.startDate && !task.dueDate) return;

    const effectiveStartDate = task.startDate || task.dueDate!;
    const pointerDay = findDayColumnFromEvent(event)?.date || new Date(effectiveStartDate);
    pointerDay.setHours(0, 0, 0, 0);
    const originalStartDate = new Date(effectiveStartDate);
    originalStartDate.setHours(0, 0, 0, 0);
    const pointerOffsetDays = Math.round((pointerDay.getTime() - originalStartDate.getTime()) / (1000 * 60 * 60 * 24));

    draggingTask.value = {
      task,
      originalStart: effectiveStartDate,
      originalDue: task.dueDate || null,
      pointerOffsetDays
    };

    dragLastUpdatedDate.value = '';
    isDragging.value = true;

    event.preventDefault();

    addEventListener(document, 'mousemove', handleTaskMouseMove);
    addEventListener(document, 'mouseup', handleTaskMouseUp);
  }

  function handleTaskMouseMove(event: MouseEvent) {
    if (!draggingTask.value) return;

    const { task, originalStart, originalDue, pointerOffsetDays } = draggingTask.value;

    const targetData = findDayColumnFromEvent(event);
    if (!targetData) {
      dragState.value.overDayColumn = null;
      dragState.value.overAllDayColumn = null;
      return;
    }

    const targetDate = targetData.date;
    const targetDateStr = formatDate(targetDate);

    if (targetData.isTimedArea) {
      const target = event.target as HTMLElement;
      const hourCell = target.closest('.hour-cell') as HTMLElement;
      const dayColumn = target.closest('.day-column') as HTMLElement;

      if (dayColumn && hourCell) {
        const dayKey = dayColumn.getAttribute('data-day-key');
        if (dayKey) {
          const hourCells = Array.from(dayColumn.querySelectorAll('.hour-cell'));
          const hourIndex = hourCells.indexOf(hourCell);
          if (hourIndex !== -1) {
            dragState.value.overHourCell = `${dayKey}-${hourIndex + 1}`;
          }
        }
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

    if (dragLastUpdatedDate.value === shiftedStartDateStr) {
      return;
    }

    const updatedTask = patchLocalTask(task.id, {
      startDate: shiftedStartDateStr,
      dueDate: newDueDateStr
    });
    if (updatedTask) {
      emitTaskDateChanged(updatedTask);
    }

    if (task.type === 'block' && task.blockId && !isRepeatTask(task)) {
      const attrs: Record<string, string> = {
        'custom-task-start-date': shiftedStartDateStr
      };
      if (newDueDateStr) {
        attrs['custom-task-due-date'] = newDueDateStr;
      }
      scheduleSave(task.blockId, attrs);
    }

    dragLastUpdatedDate.value = shiftedStartDateStr;
  }

  async function handleTaskMouseUp(event: MouseEvent) {
    if (!draggingTask.value) return;

    const { task, originalStart, originalDue } = draggingTask.value;
    const currentTask = getLocalTask(task.id);

    const targetData = findDayColumnFromEvent(event);
    const dropHourCell = dragState.value.overHourCell;

    // End drag visual/listener state before any async confirmation flow.
    dragState.value.overDayColumn = null;
    dragState.value.overAllDayColumn = null;
    dragState.value.overHourCell = null;
    removeEventListeners('mousemove');
    removeEventListeners('mouseup');
    isDragging.value = false;
    draggingTask.value = null;
    dragLastUpdatedDate.value = '';

    if (currentTask && targetData && targetData.isTimedArea) {
      const newDayKey = formatDate(targetData.date);

      let startTime = '09:00';
      let dueTime = '10:00';

      if (dropHourCell) {
        const match = dropHourCell.match(/-(\d+)$/);
        if (match) {
          const hour = parseInt(match[1]);
          startTime = `${String(hour).padStart(2, '0')}:00`;
          const dueHour = (hour + 1) % 24;
          dueTime = `${String(dueHour).padStart(2, '0')}:00`;
        }
      }

      const targetDate = currentTask.isVirtual && currentTask.repeatInstanceDate
        ? currentTask.repeatInstanceDate
        : newDayKey;

      const scope = await resolveRepeatMoveScope({
        task: currentTask,
        mode: 'timed',
        fromStartDate: originalStart || null,
        fromDueDate: originalDue || null,
        toStartDate: targetDate,
        toDueDate: targetDate
      });

      if (scope !== 'cancel') {
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
            const { getRepeatSeriesForTask, updateRepeatSeriesDates } = await import('@/repeatRepository');
            const series = await getRepeatSeriesForTask(currentTask);
            if (series) {
              await updateRepeatSeriesDates(
                currentTask,
                series.startDate,
                series.endDate || null,
                {
                  startTime,
                  dueTime
                }
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
            const { setBlockAttrs } = await import('@/api');
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
      } else {
        patchLocalTask(task.id, {
          startDate: originalStart,
          dueDate: originalDue,
          startTime: task.startTime,
          dueTime: task.dueTime
        });
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
          patchLocalTask(task.id, {
            startDate: originalStartDate,
            dueDate: originalDueDate
          });
          if (task.type === 'block' && task.blockId) {
            try {
              const { setBlockAttrs } = await import('@/api');
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
            const { getRepeatSeriesForTask, updateRepeatSeriesDates } = await import('@/repeatRepository');
            const series = await getRepeatSeriesForTask(currentTask);
            if (series) {
              const nextSeriesStart = shiftDate(series.startDate, deltaDays);
              const nextSeriesEnd = series.endDate ? shiftDate(series.endDate, deltaDays) : null;
              await updateRepeatSeriesDates(currentTask, nextSeriesStart, nextSeriesEnd);
              if (series.templateBlockId) {
                const { setBlockAttrs } = await import('@/api');
                await setBlockAttrs(series.templateBlockId, {
                  'custom-task-start-date': nextSeriesStart || '',
                  'custom-task-due-date': nextSeriesEnd || ''
                });
              }
            }
          } catch (_error) {
          }
        } else if (scope === 'single' && task.type === 'block' && task.blockId) {
          try {
            const { setBlockAttrs } = await import('@/api');
            await setBlockAttrs(task.blockId, {
              'custom-task-start-date': currentStart || '',
              'custom-task-due-date': currentDue || ''
            });
          } catch (_error) {
          }
        }
      }
    }

  }

  function handleTimedTaskHandleMouseDown(event: MouseEvent, task: Task, handleType: 'start' | 'end') {
    if (isMobileFrontend) return;

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

    const totalMinutes = Math.round(offsetY * 60 / CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT);
    const snappedMinutes = Math.round(totalMinutes / CALENDAR_CONSTANTS.LAYOUT.TIME_SNAP_MINUTES) * CALENDAR_CONSTANTS.LAYOUT.TIME_SNAP_MINUTES;

    const hours = Math.floor(snappedMinutes / 60);
    const minutes = snappedMinutes % 60;
    const newTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

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
  }

  async function handleTimedTaskHandleMouseUp() {
    if (!draggingTimedTaskHandle.value) return;

    const {
      task,
      type,
      originalStartTime,
      originalEndTime,
      originalStartDate,
      originalDueDate,
      repeatSeriesSnapshot
    } = draggingTimedTaskHandle.value;
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
            const { getRepeatSeriesForTask, updateRepeatSeriesDates } = await import('@/repeatRepository');
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
                }
              );

              const templateBlockId = series.templateBlockId
                || localTasks.value.find(item => !item.isVirtual && item.repeatSeriesId === series.id)?.blockId;
              if (templateBlockId) {
                try {
                  const { setBlockAttrs } = await import('@/api');
                  await setBlockAttrs(templateBlockId, {
                    'custom-task-start-date': nextSeriesStart || '',
                    'custom-task-due-date': nextSeriesEnd || '',
                    'custom-task-start-time': newStartTime,
                    'custom-task-due-time': newEndTime
                  });
                } catch (_error) {
                }
              }

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
            const { setBlockAttrs } = await import('@/api');
            const attrs: Record<string, string> = {
              'custom-task-start-time': newStartTime,
              'custom-task-due-time': newEndTime
            };

            if (dateChanged) {
              attrs['custom-task-start-date'] = newStartDate;
              attrs['custom-task-due-date'] = newDueDate;
            }

            await setBlockAttrs(task.blockId, attrs);
          } catch (error) {
            patchLocalTask(task.id, {
              startDate: originalStartDate,
              dueDate: originalDueDate,
              startTime: originalStartTime,
              dueTime: originalEndTime
            });
          }
        }
      }
    }

    draggingTimedTaskHandle.value = null;
    isDragging.value = false;

    removeEventListeners('mousemove');
    removeEventListeners('mouseup');
  }

  function handleTimedTaskMouseDown(event: MouseEvent, task: Task, dayKey: string) {
    if (isMobileFrontend) return;

    clearTimedRepeatPreview();
    const target = event.target as HTMLElement;
    const timedTaskElement = target.closest('.timed-task') as HTMLElement;
    const daysScrollElement = target.closest('.days-scroll') as HTMLElement;
    if (!timedTaskElement || !daysScrollElement) return;

    const taskRect = timedTaskElement.getBoundingClientRect();
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
      clickOffsetY,
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
    if (!draggingTimedTask.value) return;

    const { task, originalStartDate, clickOffsetY, durationMs, repeatSeriesSnapshot } = draggingTimedTask.value;

    const target = event.target as HTMLElement;
    const daysScrollElement = target.closest('.days-scroll') as HTMLElement;
    const allDaySection = target.closest('.all-day-section') as HTMLElement;

    if (allDaySection) {
      const allDayColumn = target.closest('.all-day-column') as HTMLElement;
      if (allDayColumn) {
        const allDayColumns = Array.from(document.querySelectorAll('.all-day-column'));
        const columnIndex = allDayColumns.indexOf(allDayColumn);
        if (columnIndex !== -1) {
          dragState.value.overAllDayColumn = `day-${columnIndex}`;
          dragState.value.overDayColumn = null;

          const newDayKey = allDayColumn.getAttribute('data-day-key') || originalStartDate;
          const from = new Date(originalStartDate);
          const to = new Date(newDayKey);
          from.setHours(0, 0, 0, 0);
          to.setHours(0, 0, 0, 0);
          const deltaDays = Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));

          if (repeatSeriesSnapshot) {
            scheduleTimedRepeatPreview(repeatSeriesSnapshot, deltaDays, undefined, true);
          } else {
            patchLocalTask(task.id, {
              startDate: newDayKey,
              dueDate: newDayKey,
              startTime: undefined,
              dueTime: undefined
            });
          }
        }
      }
      return;
    }

    dragState.value.overAllDayColumn = null;

    const dayColumn = target.closest('.day-column') as HTMLElement;
    if (!daysScrollElement || !dayColumn) return;

    const newDayKey = dayColumn.getAttribute('data-day-key') || originalStartDate;

    const scrollRect = daysScrollElement.getBoundingClientRect();
    const scrollTop = daysScrollElement.scrollTop;
    const offsetY = event.clientY - scrollRect.top + scrollTop - (clickOffsetY || 0);

    const totalMinutes = Math.round(offsetY * 60 / CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT);
    const snappedMinutes = Math.round(totalMinutes / CALENDAR_CONSTANTS.LAYOUT.TIME_SNAP_MINUTES) * CALENDAR_CONSTANTS.LAYOUT.TIME_SNAP_MINUTES;

    const hours = Math.floor(snappedMinutes / 60);
    const minutes = snappedMinutes % 60;
    const newStartTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    const newStartDateTime = new Date(newDayKey + 'T' + newStartTime);
    const newDueDateTime = new Date(newStartDateTime.getTime() + durationMs);
    if (repeatSeriesSnapshot) {
      const from = new Date(originalStartDate);
      const to = new Date(newDayKey);
      from.setHours(0, 0, 0, 0);
      to.setHours(0, 0, 0, 0);
      const deltaDays = Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
      scheduleTimedRepeatPreview(repeatSeriesSnapshot, deltaDays, newStartTime, false);
    } else {
      const newDueDateStr = formatDate(newDueDateTime);
      patchLocalTask(task.id, {
        startTime: newStartTime,
        dueTime: formatTime(newDueDateTime),
        startDate: newDayKey,
        dueDate: newDueDateStr
      });
    }
  }

  async function handleTimedTaskMouseUp(event: MouseEvent) {
    if (!draggingTimedTask.value) return;

    flushTimedRepeatPreview();
    const { task, originalStartTime, originalEndTime, originalStartDate, originalDueDate, repeatSeriesSnapshot } = draggingTimedTask.value;
    const currentTask = getLocalTask(task.id);

    if (currentTask) {
      const newStartTime = currentTask.startTime || originalStartTime;
      const newEndTime = currentTask.dueTime || originalEndTime;
      const newStartDate = currentTask.startDate || originalStartDate;
      const newDueDate = currentTask.dueDate || originalDueDate;

      const target = event.target as HTMLElement;
      const allDaySection = target.closest('.all-day-section') as HTMLElement;

      if (repeatSeriesSnapshot && isRepeatTask(currentTask)) {
        try {
          const { getRepeatSeriesForTask, updateRepeatSeriesDates } = await import('@/repeatRepository');
          const series = await getRepeatSeriesForTask(currentTask);
          if (series) {
            const from = new Date(originalStartDate);
            const to = new Date(newStartDate);
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
                startTime: allDaySection ? null : newStartTime,
                dueTime: allDaySection ? null : newEndTime
              }
            );

            const templateBlockId = series.templateBlockId
              || localTasks.value.find(item => !item.isVirtual && item.repeatSeriesId === series.id)?.blockId;
            if (templateBlockId) {
              const { setBlockAttrs } = await import('@/api');
              await setBlockAttrs(templateBlockId, {
                'custom-task-start-date': nextSeriesStart || '',
                'custom-task-due-date': nextSeriesEnd || '',
                'custom-task-start-time': allDaySection ? null : newStartTime,
                'custom-task-due-time': allDaySection ? null : newEndTime
              });
            }

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
      } else if (allDaySection) {
        const updatedTask = patchLocalTask(task.id, {
          startDate: newStartDate,
          dueDate: newDueDate,
          startTime: undefined,
          dueTime: undefined
        });
        if (!updatedTask) {
          draggingTimedTask.value = null;
          dragState.value.overDayColumn = null;
          dragState.value.overAllDayColumn = null;
          isDragging.value = false;
          clearTimedRepeatPreview();
          removeEventListeners('mousemove');
          removeEventListeners('mouseup');
          return;
        }

        if (task.type === 'block' && task.blockId) {
          try {
            const { setBlockAttrs } = await import('@/api');
            await setBlockAttrs(task.blockId, {
              'custom-task-start-date': newStartDate,
              'custom-task-due-date': newDueDate,
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

        emitTaskDateChanged(updatedTask);
      } else {
        if (newStartTime !== originalStartTime || newEndTime !== originalEndTime || newStartDate !== originalStartDate || newDueDate !== originalDueDate) {
          const updatedTask = patchLocalTask(task.id, {
            startTime: newStartTime,
            dueTime: newEndTime,
            startDate: newStartDate,
            dueDate: newDueDate
          });
          if (!updatedTask) {
            draggingTimedTask.value = null;
            dragState.value.overDayColumn = null;
            dragState.value.overAllDayColumn = null;
            isDragging.value = false;
            clearTimedRepeatPreview();
            removeEventListeners('mousemove');
            removeEventListeners('mouseup');
            return;
          }

          if (task.type === 'block' && task.blockId) {
            try {
              const { setBlockAttrs } = await import('@/api');
              await setBlockAttrs(task.blockId, {
                'custom-task-start-time': newStartTime,
                'custom-task-due-time': newEndTime,
                'custom-task-start-date': newStartDate,
                'custom-task-due-date': newDueDate
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

          emitTaskDateChanged(updatedTask);
        }
      }
    }

    draggingTimedTask.value = null;
    dragState.value.overDayColumn = null;
    dragState.value.overAllDayColumn = null;
    isDragging.value = false;
    clearTimedRepeatPreview();

    removeEventListeners('mousemove');
    removeEventListeners('mouseup');
  }

  return {
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
  };
}
