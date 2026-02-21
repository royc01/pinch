import { ref, type Ref } from 'vue';
import type { Task } from '@/api';
import { formatDate, formatTime } from './useDateUtils';
import { CALENDAR_CONSTANTS } from './useCalendarConstants';
import { useDebouncedSave } from './useDebouncedSave';

interface EventListener {
  element: Document;
  event: string;
  handler: (...args: any[]) => void;
}

export function useTaskDrag(
  localTasks: Ref<Task[]>,
  emit: (event: 'taskDateChanged', task: Task) => void
) {
  const { scheduleSave } = useDebouncedSave(500);

  const dragState = ref({
    overDay: null as string | null,
    overHourCell: null as string | null,
    overDayColumn: null as string | null,
    overAllDayColumn: null as string | null
  });

  const draggingHandle = ref<{ task: Task; type: 'start' | 'end'; originalDate: string } | null>(null);
  const draggingTask = ref<{ task: Task; originalStart: string; originalDue: string | null } | null>(null);
  const dragLastUpdatedDate = ref('');
  const isDragging = ref(false);

  const draggingTimedTaskHandle = ref<{ task: Task; type: 'start' | 'end'; originalStartTime: string; originalEndTime: string; originalStartDate: string; originalDueDate: string } | null>(null);
  const draggingTimedTask = ref<{ task: Task; originalStartTime: string; originalEndTime: string; originalStartDate: string; originalDueDate: string; dayKey: string; clickOffsetY?: number; durationMs?: number } | null>(null);

  const eventListeners = ref<EventListener[]>([]);

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

  function findDayColumnFromEvent(event: MouseEvent, weekDays: any[]): { date: Date; element: HTMLElement; isTimedArea: boolean } | null {
    const elements = document.elementsFromPoint(event.clientX, event.clientY);

    const allDayColumn = elements.find(el => el.classList.contains('all-day-column'));
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
      return null;
    }

    const columns = Array.from(document.querySelectorAll(isTimedArea ? '.day-column' : '.all-day-column'));
    const columnIndex = columns.indexOf(columnElement);
    if (columnIndex === -1 || columnIndex >= weekDays.length) return null;

    const targetDate = new Date(weekDays[columnIndex].date);
    targetDate.setHours(0, 0, 0, 0);

    return { date: targetDate, element: columnElement, isTimedArea };
  }

  function handleHandleMouseDown(event: MouseEvent, task: Task, handleType: 'start' | 'end') {
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

    const targetData = findDayColumnFromEvent(event, []);
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

      if (relativeX < columnWidth * 0.1) {
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
    const taskField = dateType === 'start' ? 'startDate' : 'dueDate';

    const taskIndex = localTasks.value.findIndex(t => t.id === task.id);
    if (taskIndex !== -1) {
      localTasks.value[taskIndex] = {
        ...localTasks.value[taskIndex],
        [taskField]: targetDateStr
      };

      const updatedTask = localTasks.value[taskIndex];

      emit('taskDateChanged', updatedTask);
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
    if (!task.startDate && !task.dueDate) return;

    const effectiveStartDate = task.startDate || task.dueDate!;

    draggingTask.value = {
      task,
      originalStart: effectiveStartDate,
      originalDue: task.dueDate || null
    };

    dragLastUpdatedDate.value = '';
    isDragging.value = true;

    event.preventDefault();

    addEventListener(document, 'mousemove', handleTaskMouseMove);
    addEventListener(document, 'mouseup', handleTaskMouseUp);
  }

  function handleTaskMouseMove(event: MouseEvent) {
    if (!draggingTask.value) return;

    const { task, originalStart, originalDue } = draggingTask.value;

    const targetData = findDayColumnFromEvent(event, []);
    if (!targetData) {
      dragState.value.overDayColumn = null;
      dragState.value.overAllDayColumn = null;
      return;
    }

    const targetDate = targetData.date;
    const newStartDateStr = formatDate(targetDate);

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

    const daysDiff = Math.round((targetDate.getTime() - originalStartDate.getTime()) / (1000 * 60 * 60 * 24));

    const newStartDate = new Date(originalStart);
    newStartDate.setDate(newStartDate.getDate() + daysDiff);

    let newDueDateStr = null;
    if (originalDue) {
      const newDueDate = new Date(originalDue);
      newDueDate.setDate(newDueDate.getDate() + daysDiff);
      newDueDateStr = formatDate(newDueDate);
    }

    if (dragLastUpdatedDate.value === newStartDateStr) {
      return;
    }

    const taskIndex = localTasks.value.findIndex(t => t.id === task.id);
    if (taskIndex !== -1) {
      localTasks.value[taskIndex] = {
        ...localTasks.value[taskIndex],
        startDate: newStartDateStr,
        dueDate: newDueDateStr
      };

      emit('taskDateChanged', localTasks.value[taskIndex]);
    }

    if (task.type === 'block' && task.blockId) {
      const attrs: Record<string, string> = {
        'custom-task-start-date': newStartDateStr
      };
      if (newDueDateStr) {
        attrs['custom-task-due-date'] = newDueDateStr;
      }
      scheduleSave(task.blockId, attrs);
    }

    dragLastUpdatedDate.value = newStartDateStr;
  }

  async function handleTaskMouseUp(event: MouseEvent) {
    if (!draggingTask.value) return;

    const { task } = draggingTask.value;
    const taskIndex = localTasks.value.findIndex(t => t.id === task.id);

    const targetData = findDayColumnFromEvent(event, []);

    if (taskIndex !== -1 && targetData && targetData.isTimedArea) {
      const newDayKey = formatDate(targetData.date);

      let startTime = '09:00';
      let dueTime = '10:00';

      if (dragState.value.overHourCell) {
        const match = dragState.value.overHourCell.match(/-(\d+)$/);
        if (match) {
          const hour = parseInt(match[1]);
          startTime = `${String(hour).padStart(2, '0')}:00`;
          const dueHour = (hour + 1) % 24;
          dueTime = `${String(dueHour).padStart(2, '0')}:00`;
        }
      }

      if (task.type === 'block' && task.blockId) {
        try {
          const { setBlockAttrs } = await import('@/api');
          await setBlockAttrs(task.blockId, {
            'custom-task-start-date': newDayKey,
            'custom-task-due-date': newDayKey,
            'custom-task-start-time': startTime,
            'custom-task-due-time': dueTime
          });

          localTasks.value[taskIndex] = {
            ...localTasks.value[taskIndex],
            startDate: newDayKey,
            dueDate: newDayKey,
            startTime: startTime,
            dueTime: dueTime
          };
        } catch (error) {
        }
      }
    }

    dragState.value.overDayColumn = null;
    dragState.value.overAllDayColumn = null;
    dragState.value.overHourCell = null;

    removeEventListeners('mousemove');
    removeEventListeners('mouseup');

    isDragging.value = false;
    draggingTask.value = null;
    dragLastUpdatedDate.value = '';
  }

  function handleTimedTaskHandleMouseDown(event: MouseEvent, task: Task, handleType: 'start' | 'end') {
    draggingTimedTaskHandle.value = {
      task,
      type: handleType,
      originalStartTime: task.startTime || '00:00',
      originalEndTime: task.dueTime || '01:00',
      originalStartDate: task.startDate || formatDate(new Date()),
      originalDueDate: task.dueDate || formatDate(new Date())
    };

    isDragging.value = true;

    event.preventDefault();
    event.stopPropagation();

    addEventListener(document, 'mousemove', handleTimedTaskHandleMouseMove);
    addEventListener(document, 'mouseup', handleTimedTaskHandleMouseUp);
  }

  function handleTimedTaskHandleMouseMove(event: MouseEvent) {
    if (!draggingTimedTaskHandle.value) return;

    const { task, type } = draggingTimedTaskHandle.value;

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

    const taskIndex = localTasks.value.findIndex(t => t.id === task.id);
    if (taskIndex === -1) return;

    const currentTask = localTasks.value[taskIndex];
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

      localTasks.value[taskIndex] = {
        ...localTasks.value[taskIndex],
        startDate: newDayKey,
        startTime: newTime
      };
    } else {
      const newEndDateTime = new Date(newDayKey + 'T' + newTime);
      const minEndTime = startDateTime.getTime() + 15 * 60 * 1000;

      if (newEndDateTime.getTime() <= minEndTime) return;

      localTasks.value[taskIndex] = {
        ...localTasks.value[taskIndex],
        dueDate: newDayKey,
        dueTime: newTime
      };
    }
  }

  async function handleTimedTaskHandleMouseUp() {
    if (!draggingTimedTaskHandle.value) return;

    const { task, originalStartTime, originalEndTime, originalStartDate, originalDueDate } = draggingTimedTaskHandle.value;
    const taskIndex = localTasks.value.findIndex(t => t.id === task.id);

    if (taskIndex !== -1) {
      const currentTask = localTasks.value[taskIndex];
      const newStartTime = currentTask.startTime || originalStartTime;
      const newEndTime = currentTask.dueTime || originalEndTime;
      const newStartDate = currentTask.startDate || originalStartDate;
      const newDueDate = currentTask.dueDate || originalDueDate;

      const timeChanged = newStartTime !== originalStartTime || newEndTime !== originalEndTime;
      const dateChanged = newStartDate !== originalStartDate || newDueDate !== originalDueDate;

      if (timeChanged || dateChanged) {
        if (task.type === 'block' && task.blockId) {
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
            localTasks.value[taskIndex] = {
              ...localTasks.value[taskIndex],
              startDate: originalStartDate,
              dueDate: originalDueDate,
              startTime: originalStartTime,
              dueTime: originalEndTime
            };
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

    draggingTimedTask.value = {
      task,
      originalStartTime,
      originalEndTime,
      originalStartDate,
      originalDueDate,
      dayKey,
      clickOffsetY,
      durationMs
    };

    isDragging.value = true;

    event.preventDefault();
    event.stopPropagation();

    addEventListener(document, 'mousemove', handleTimedTaskMouseMove);
    addEventListener(document, 'mouseup', handleTimedTaskMouseUp);
  }

  function handleTimedTaskMouseMove(event: MouseEvent) {
    if (!draggingTimedTask.value) return;

    const { task, originalStartDate, clickOffsetY, durationMs } = draggingTimedTask.value;

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

          const taskIndex = localTasks.value.findIndex(t => t.id === task.id);
          if (taskIndex !== -1) {
            const newDayKey = formatDate(new Date(originalStartDate));
            localTasks.value[taskIndex] = {
              ...localTasks.value[taskIndex],
              startDate: newDayKey,
              dueDate: newDayKey,
              startTime: undefined,
              dueTime: undefined
            };
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
    const newDueDateStr = formatDate(newDueDateTime);

    const taskIndex = localTasks.value.findIndex(t => t.id === task.id);
    if (taskIndex === -1) return;

    localTasks.value[taskIndex] = {
      ...localTasks.value[taskIndex],
      startTime: newStartTime,
      dueTime: formatTime(newDueDateTime),
      startDate: newDayKey,
      dueDate: newDueDateStr
    };
  }

  async function handleTimedTaskMouseUp(event: MouseEvent) {
    if (!draggingTimedTask.value) return;

    const { task, originalStartTime, originalEndTime, originalStartDate, originalDueDate } = draggingTimedTask.value;
    const taskIndex = localTasks.value.findIndex(t => t.id === task.id);

    if (taskIndex !== -1) {
      const currentTask = localTasks.value[taskIndex];
      const newStartTime = currentTask.startTime || originalStartTime;
      const newEndTime = currentTask.dueTime || originalEndTime;
      const newStartDate = currentTask.startDate || originalStartDate;
      const newDueDate = currentTask.dueDate || originalDueDate;

      const target = event.target as HTMLElement;
      const allDaySection = target.closest('.all-day-section') as HTMLElement;

      if (allDaySection) {
        const updatedTask = {
          ...localTasks.value[taskIndex],
          startDate: newStartDate,
          dueDate: newDueDate,
          startTime: undefined,
          dueTime: undefined
        };
        localTasks.value[taskIndex] = updatedTask;

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
            localTasks.value[taskIndex] = {
              ...localTasks.value[taskIndex],
              startTime: originalStartTime,
              dueTime: originalEndTime,
              startDate: originalStartDate,
              dueDate: originalDueDate
            };
          }
        }

        emit('taskDateChanged', updatedTask);
      } else {
        if (newStartTime !== originalStartTime || newEndTime !== originalEndTime || newStartDate !== originalStartDate || newDueDate !== originalDueDate) {
          const updatedTask = {
            ...localTasks.value[taskIndex],
            startTime: newStartTime,
            dueTime: newEndTime,
            startDate: newStartDate,
            dueDate: newDueDate
          };
          localTasks.value[taskIndex] = updatedTask;

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
              localTasks.value[taskIndex] = {
                ...localTasks.value[taskIndex],
                startTime: originalStartTime,
                dueTime: originalEndTime,
                startDate: originalStartDate,
                dueDate: originalDueDate
              };
            }
          }

          emit('taskDateChanged', updatedTask);
        }
      }
    }

    draggingTimedTask.value = null;
    dragState.value.overDayColumn = null;
    dragState.value.overAllDayColumn = null;
    isDragging.value = false;

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
