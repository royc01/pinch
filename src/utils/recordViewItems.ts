import type { CheckinNoteContext, CheckinNoteEntry, CheckinNoteType } from '@/checkinNoteRepository';
import { getCheckinNoteEventKeys, isCheckinNoteLifelogEvent } from '@/utils/checkinNoteEvents';
import type {
  FocusLifelogEvent,
  HabitCheckinLifelogEvent,
  LifelogEvent,
  ManualNoteLifelogEvent,
  TaskCompletedLifelogEvent
} from '@/utils/lifelogEvents';

export type RecordViewType = CheckinNoteType | 'mood' | 'manual-note';

export interface RecordViewCapabilities {
  editEvent: boolean;
  deleteEvent: boolean;
  editAnnotation: boolean;
  openSource: boolean;
  favorite: boolean;
}

export interface RecordViewItem {
  id: string;
  eventKeys: string[];
  type: RecordViewType;
  date: string;
  occurredAt: string;
  title: string;
  meta: string;
  content: string;
  sourceId?: string;
  annotation?: CheckinNoteEntry;
  capabilities: RecordViewCapabilities;
  event: LifelogEvent;
}

export interface RecordViewMetaResolvers {
  focus?: (event: FocusLifelogEvent) => string;
  habit?: (event: HabitCheckinLifelogEvent) => string;
  task?: (event: TaskCompletedLifelogEvent) => string;
  manualNote?: (event: ManualNoteLifelogEvent) => string;
}

function toIsoFromTimestamp(value: unknown): string {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return '';
  const timestamp = numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function getRecordType(event: LifelogEvent): RecordViewType {
  if (event.type === 'habit-checkin') return 'habit';
  if (event.type === 'task-completed') return 'task';
  return event.type;
}

function getOccurredAt(event: LifelogEvent): string {
  if (event.type === 'focus') {
    const timestamp = toIsoFromTimestamp(event.metadata?.timestamp);
    return timestamp || `${event.date}T${event.startTime || '00:00'}:00`;
  }
  if (event.type === 'habit-checkin') {
    const habitEvent = event as HabitCheckinLifelogEvent;
    return toIsoFromTimestamp(habitEvent.checkinTimestamp ?? habitEvent.metadata?.timestamp)
      || `${event.date}T00:00:00`;
  }
  if (event.type === 'task-completed') return (event as TaskCompletedLifelogEvent).completedAt;
  if (event.type === 'manual-note') {
    const manualEvent = event as ManualNoteLifelogEvent;
    return manualEvent.createdAt || manualEvent.updatedAt || `${event.date}T00:00:00`;
  }
  return `${event.date}T00:00:00`;
}

function getSourceId(event: LifelogEvent): string | undefined {
  if (event.type === 'habit-checkin') return (event as HabitCheckinLifelogEvent).habitId;
  if (event.type === 'task-completed') {
    const taskEvent = event as TaskCompletedLifelogEvent;
    return taskEvent.blockId || taskEvent.taskId;
  }
  return event.sourceId || event.id || undefined;
}

function getMeta(event: LifelogEvent, resolvers: RecordViewMetaResolvers): string {
  if (event.type === 'focus') return resolvers.focus?.(event as FocusLifelogEvent) || '';
  if (event.type === 'habit-checkin') return resolvers.habit?.(event as HabitCheckinLifelogEvent) || '';
  if (event.type === 'task-completed') return resolvers.task?.(event as TaskCompletedLifelogEvent) || '';
  if (event.type === 'manual-note') return resolvers.manualNote?.(event as ManualNoteLifelogEvent) || '';
  return event.summary || '';
}

export function lifelogEventToRecordViewItem(
  event: LifelogEvent,
  resolvers: RecordViewMetaResolvers = {}
): RecordViewItem {
  const annotatable = isCheckinNoteLifelogEvent(event);
  const manualNote = event.type === 'manual-note';
  const focus = event.type === 'focus';
  return {
    id: `${event.type}:${event.id}`,
    eventKeys: annotatable ? getCheckinNoteEventKeys(event) : [],
    type: getRecordType(event),
    date: event.date,
    occurredAt: getOccurredAt(event),
    title: event.title,
    meta: getMeta(event, resolvers),
    content: manualNote ? (event as ManualNoteLifelogEvent).text : (event.note || ''),
    sourceId: getSourceId(event),
    capabilities: {
      editEvent: manualNote,
      deleteEvent: manualNote || focus,
      editAnnotation: annotatable,
      openSource: event.type === 'task-completed' || event.type === 'habit-checkin' || focus,
      favorite: annotatable
    },
    event
  };
}

export function lifelogEventsToRecordViewItems(
  events: LifelogEvent[],
  resolvers: RecordViewMetaResolvers = {}
): RecordViewItem[] {
  return events.map(event => lifelogEventToRecordViewItem(event, resolvers));
}

export function getRecordCheckinContext(item: RecordViewItem): CheckinNoteContext | undefined {
  if (!item.capabilities.editAnnotation || !item.sourceId || !item.occurredAt) return undefined;
  return {
    type: item.type as CheckinNoteType,
    sourceId: item.sourceId,
    occurredAt: item.occurredAt,
    title: item.title,
    ...(item.meta ? { meta: item.meta } : {})
  };
}

export function attachRecordAnnotation(
  item: RecordViewItem,
  annotation: CheckinNoteEntry | undefined
): RecordViewItem {
  return annotation ? { ...item, annotation } : item;
}
