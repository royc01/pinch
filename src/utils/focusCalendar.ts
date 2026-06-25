import type { FocusSessionRecord } from '@/api';
import {
  createFocusEventTitle,
  focusRecordToLifelogEvent,
  summarizeFocusLifelogEventsByDay,
  type FocusDaySummary,
  type FocusLifelogEvent
} from '@/utils/lifelogEvents';

export type FocusCalendarEvent = FocusLifelogEvent;
export type { FocusDaySummary };
export { createFocusEventTitle };

export function focusRecordToCalendarEvent(
  record: FocusSessionRecord,
  fallbackTitle: string
): FocusCalendarEvent | null {
  return focusRecordToLifelogEvent(record, fallbackTitle);
}

export function summarizeFocusRecordsByDay(records: FocusSessionRecord[]): Map<string, FocusDaySummary> {
  const events = records
    .map(record => focusRecordToLifelogEvent(record, ''))
    .filter((event): event is FocusCalendarEvent => Boolean(event));
  return summarizeFocusLifelogEventsByDay(events);
}
