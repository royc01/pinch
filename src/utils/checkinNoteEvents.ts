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

  if (event.type === 'habit-checkin' && 'habitId' in event) {
    const habitEvent = event as HabitCheckinLifelogEvent;
    const habitId = normalizeText(habitEvent.habitId);
    if (!habitId) {
      return null;
    }

    const timestamp = Number(habitEvent.checkinTimestamp ?? habitEvent.metadata?.timestamp);
    if (Number.isFinite(timestamp) && timestamp > 0) {
      return `habit:${habitId}:${Math.round(timestamp)}`;
    }

    const date = normalizeText(habitEvent.date);
    const occurrence = Math.max(1, Math.round(Number(habitEvent.checkinIndex ?? habitEvent.completedCount) || 1));
    return date ? `habit:${habitId}:${date}:${occurrence}` : null;
  }

  if (event.type === 'task-completed' && 'taskId' in event) {
    const taskEvent = event as TaskCompletedLifelogEvent;
    const taskId = normalizeText(taskEvent.taskId);
    const completedAt = normalizeText(taskEvent.completedAt);
    return taskId && completedAt ? `task:${taskId}:${completedAt}` : null;
  }

  return null;
}

export function getCheckinNoteEventKeys(event: CheckinNoteLifelogEvent | LifelogEvent): string[] {
  const primaryKey = getCheckinNoteEventKey(event);
  if (!primaryKey) {
    return [];
  }

  if (event.type !== 'habit-checkin' || !('habitId' in event)) {
    return [primaryKey];
  }

  const habitEvent = event as HabitCheckinLifelogEvent;
  const habitId = normalizeText(habitEvent.habitId);
  const date = normalizeText(habitEvent.date);
  const occurrence = Math.max(1, Math.round(Number(habitEvent.checkinIndex ?? habitEvent.completedCount) || 1));
  const legacyKey = habitId && date ? `habit:${habitId}:${date}:${occurrence}` : '';
  return legacyKey && legacyKey !== primaryKey ? [primaryKey, legacyKey] : [primaryKey];
}

export function isCheckinNoteLifelogEvent(event: LifelogEvent): event is CheckinNoteLifelogEvent {
  return event.type === 'focus' || event.type === 'habit-checkin' || event.type === 'task-completed';
}
