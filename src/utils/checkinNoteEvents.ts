import type {
  FocusLifelogEvent,
  HabitCheckinLifelogEvent,
  LifelogEvent,
  TaskCompletedLifelogEvent
} from './lifelogEvents';

export type CheckinNoteLifelogEvent =
  | FocusLifelogEvent
  | HabitCheckinLifelogEvent
  | TaskCompletedLifelogEvent;

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function getCheckinNoteEventKey(event: CheckinNoteLifelogEvent | LifelogEvent): string | null {
  if (event.type === 'focus') {
    const sessionId = normalizeText(event.sourceId) || normalizeText(event.id);
    return sessionId ? `focus:${sessionId}` : null;
  }

  if (event.type === 'habit-checkin') {
    const habitId = normalizeText(event.habitId);
    if (!habitId) {
      return null;
    }

    const timestamp = Number(event.checkinTimestamp ?? event.metadata?.timestamp);
    if (Number.isFinite(timestamp) && timestamp > 0) {
      return `habit:${habitId}:${Math.round(timestamp)}`;
    }

    const date = normalizeText(event.date);
    const occurrence = Math.max(1, Math.round(Number(event.checkinIndex ?? event.completedCount) || 1));
    return date ? `habit:${habitId}:${date}:${occurrence}` : null;
  }

  if (event.type === 'task-completed') {
    const taskId = normalizeText(event.taskId);
    const completedAt = normalizeText(event.completedAt);
    return taskId && completedAt ? `task:${taskId}:${completedAt}` : null;
  }

  return null;
}

export function isCheckinNoteLifelogEvent(event: LifelogEvent): event is CheckinNoteLifelogEvent {
  return event.type === 'focus' || event.type === 'habit-checkin' || event.type === 'task-completed';
}
