import { computed, ref } from 'vue';
import type { Task } from '@/api';
import type { RepeatScheduleSnapshot } from '@/repeatRepository';

export interface CalendarScheduleAction { finish(): Promise<void> }
export type BeginCalendarScheduleChange = (task: Task) => Promise<CalendarScheduleAction>;

const scheduleKeys = ['startDate', 'dueDate', 'startTime', 'dueTime', 'repeatSeriesId',
  'repeatFrequency', 'repeatInstanceDate', 'isVirtual'] as const;
export type CalendarScheduleState = Pick<Task, typeof scheduleKeys[number]>;
export function calendarScheduleState(task: Task): CalendarScheduleState {
  return Object.fromEntries(scheduleKeys.map(key => [key, task[key]])) as CalendarScheduleState;
}
function sameSchedule(a: CalendarScheduleState, b: CalendarScheduleState): boolean {
  return scheduleKeys.every(key => (a[key] || '') === (b[key] || ''));
}
export class CalendarScheduleConflict extends Error {}

interface HistoryEntry {
  before: Task[];
  after: Map<string, CalendarScheduleState>;
  repeatBefore: RepeatScheduleSnapshot | null;
  repeatAfter: RepeatScheduleSnapshot | null;
}

/** History is local to the shared calendar and only restores scheduling fields. */
export function useCalendarScheduleHistory(options: {
  tasks: () => Task[];
  captureRepeat: (task: Task) => Promise<RepeatScheduleSnapshot | null>;
  repeatMatches: (a: RepeatScheduleSnapshot | null, b: RepeatScheduleSnapshot | null) => boolean;
  settle: () => Promise<void>;
  restore: (before: Task[], repeat: RepeatScheduleSnapshot | null, expected: RepeatScheduleSnapshot | null) => Promise<void>;
}) {
  const entries: HistoryEntry[] = [];
  const count = ref(0);
  const busy = ref(false);
  const preparing = ref(0);

  const begin: BeginCalendarScheduleChange = async task => {
    preparing.value++;
    try {
      const current = options.tasks().find(item => item.id === task.id) || task;
      const seriesId = current.repeatSeriesId;
      const before = (seriesId ? options.tasks().filter(item => item.repeatSeriesId === seriesId) : [current])
        .map(item => ({ ...item }));
      const repeatBefore = await options.captureRepeat(current);
      let finished = false;
      return { async finish() {
        if (finished) return;
        finished = true;
        try {
          await options.settle();
          const latest = new Map(options.tasks().map(item => [item.id, item]));
          const after = new Map<string, CalendarScheduleState>();
          for (const previous of before) {
            const item = latest.get(previous.id);
            if (item) after.set(item.id, calendarScheduleState(item));
          }
          const repeatAfter = repeatBefore ? await options.captureRepeat(before.find(item => !item.isVirtual) || current) : null;
          if (before.every(item => after.has(item.id) && sameSchedule(item, after.get(item.id)!))
            && options.repeatMatches(repeatBefore, repeatAfter)) return;
          entries.push({ before, after, repeatBefore, repeatAfter });
          if (entries.length > 20) entries.shift();
          count.value = entries.length;
        } finally { preparing.value--; }
      } };
    } catch (error) {
      preparing.value--;
      throw error;
    }
  };

  async function undo(): Promise<void> {
    if (busy.value || preparing.value || !entries.length) return;
    busy.value = true;
    try {
      await options.settle();
      const entry = entries.at(-1)!;
      const latest = new Map(options.tasks().map(item => [item.id, item]));
      for (const previous of entry.before) {
        // Recurrence regeneration can replace virtual IDs; its series is checked below.
        if (previous.isVirtual && entry.repeatBefore) continue;
        const current = latest.get(previous.id);
        const expected = entry.after.get(previous.id);
        if (!current || !expected || !sameSchedule(current, expected)) throw new CalendarScheduleConflict();
      }
      if (entry.repeatBefore) {
        const current = await options.captureRepeat(entry.before.find(item => !item.isVirtual) || entry.before[0]);
        if (!options.repeatMatches(current, entry.repeatAfter)) throw new CalendarScheduleConflict();
      }
      await options.restore(entry.before, entry.repeatBefore, entry.repeatAfter);
      entries.pop();
      count.value = entries.length;
    } finally { busy.value = false; }
  }
  return { begin, undo, busy, canUndo: computed(() => count.value > 0 && !busy.value && !preparing.value) };
}
