import type { FocusSessionRecord, Habit, HabitCalendarDay, MoodData, MoodEntry, MoodManualEntry, Task } from '@/api';

export type LifelogEventType =
  | 'focus'
  | 'habit-checkin'
  | 'task-completed'
  | 'mood'
  | 'manual-note';

export interface LifelogEvent {
  id: string;
  type: LifelogEventType;
  date: string;
  title: string;
  startTime?: string;
  endTime?: string;
  minutes?: number;
  summary?: string;
  sourceId?: string;
  sourceType?: string;
  note?: string;
  metadata?: Record<string, unknown>;
}

export interface FocusLifelogEvent extends LifelogEvent {
  type: 'focus';
  startTime: string;
  endTime: string;
  minutes: number;
  targetType: FocusSessionRecord['targetType'];
  targetId?: string;
  laneIndex?: number;
  laneCount?: number;
}

export interface HabitCheckinLifelogEvent extends LifelogEvent {
  type: 'habit-checkin';
  completed: boolean;
  completedCount: number;
  targetCount: number;
  checkinIndex?: number;
  checkinTimestamp?: number;
  habitId: string;
}

export interface TaskCompletedLifelogEvent extends LifelogEvent {
  type: 'task-completed';
  completedAt: string;
  taskId: string;
  priority: Task['priority'];
  tags: string[];
  blockId?: string;
}

export interface MoodLifelogEvent extends LifelogEvent {
  type: 'mood';
  emoji: string;
  moodTimestamp?: string;
}

export interface ManualNoteLifelogEvent extends LifelogEvent {
  type: 'manual-note';
  text: string;
  createdAt: string;
  updatedAt: string;
  emoji?: string;
}

export interface LifelogDaySummary {
  date: string;
  count: number;
  minutes: number;
  countsByType: Partial<Record<LifelogEventType, number>>;
}

export interface FocusDaySummary {
  date: string;
  sessions: number;
  minutes: number;
}

export interface HabitCheckinDaySummary {
  date: string;
  habits: number;
  completed: number;
  checkins: number;
}

export interface TaskCompletedDaySummary {
  date: string;
  tasks: number;
}

export interface MoodDaySummary {
  date: string;
  moods: number;
  emoji: string;
}

export interface ManualNoteDaySummary {
  date: string;
  notes: number;
}

const HTML_ENTITY_MAP: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' '
};

function padTimePart(value: number): string {
  return String(value).padStart(2, '0');
}

function formatTimeFromDate(date: Date): string {
  return `${padTimePart(date.getHours())}:${padTimePart(date.getMinutes())}`;
}

function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${padTimePart(date.getMonth() + 1)}-${padTimePart(date.getDate())}`;
}

export function parseLifelogDateValue(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const plainDateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (plainDateMatch) {
    const [, year, month, day] = plainDateMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  const compactDateTimeMatch = trimmed.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (compactDateTimeMatch) {
    const [, year, month, day, hour, minute, second] = compactDateTimeMatch;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    );
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

export function getLifelogLocalDateKey(value: string | undefined): string {
  const parsed = parseLifelogDateValue(value);
  return parsed ? formatLocalDate(parsed) : '';
}

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    const normalized = entity.toLowerCase();
    if (normalized.startsWith('#x')) {
      const codePoint = Number.parseInt(normalized.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    if (normalized.startsWith('#')) {
      const codePoint = Number.parseInt(normalized.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    return HTML_ENTITY_MAP[normalized] ?? match;
  });
}

function stripHtmlToText(value: string): string {
  let text = value;
  for (let index = 0; index < 2; index += 1) {
    const decoded = decodeHtmlEntities(text);
    if (decoded === text) {
      break;
    }
    text = decoded;
  }
  return text
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function createFocusEventTitle(record: FocusSessionRecord, fallbackTitle: string): string {
  const targetName = typeof record.targetName === 'string' ? record.targetName.trim() : '';
  const targetEmoji = typeof record.targetEmoji === 'string' ? record.targetEmoji.trim() : '';
  return targetName ? `${targetEmoji ? `${targetEmoji} ` : ''}${targetName}` : fallbackTitle;
}

export function focusRecordToLifelogEvent(
  record: FocusSessionRecord,
  fallbackTitle: string
): FocusLifelogEvent | null {
  const minutes = Math.max(0, Math.floor(Number(record.minutes) || 0));
  const timestamp = Number(record.timestamp);
  const date = typeof record.date === 'string' ? record.date.trim() : '';
  if (!date || minutes <= 0 || !Number.isFinite(timestamp)) {
    return null;
  }

  const end = new Date(timestamp);
  const start = new Date(timestamp - minutes * 60 * 1000);
  const startTime = formatLocalDate(start) === date ? formatTimeFromDate(start) : '00:00';
  const endTime = formatLocalDate(end) === date ? formatTimeFromDate(end) : '23:59';
  const id = record.id || `focus-session-${timestamp}`;

  return {
    id,
    type: 'focus',
    date,
    startTime,
    endTime,
    minutes,
    title: createFocusEventTitle(record, fallbackTitle),
    sourceId: id,
    sourceType: 'focus-session',
    targetType: record.targetType,
    targetId: record.targetId,
    metadata: {
      timestamp
    }
  };
}

function formatHabitName(habit: Habit): string {
  const name = typeof habit.name === 'string' ? habit.name.trim() : '';
  return `${habit.emoji ? `${habit.emoji} ` : ''}${name || 'Habit'}`;
}

function getHabitTargetCount(habit: Habit, record: HabitCalendarDay): number {
  return Math.max(1, Math.round(Number(record.targetCount ?? habit.timesPerDay ?? 1) || 1));
}

function getHabitCompletedCount(record: HabitCalendarDay): number {
  if (typeof record.completedCount === 'number' && Number.isFinite(record.completedCount)) {
    return Math.max(0, Math.round(record.completedCount));
  }
  return record.completed ? 1 : 0;
}

export function habitCheckinRecordToLifelogEvent(
  habit: Habit,
  record: HabitCalendarDay
): HabitCheckinLifelogEvent | null {
  const date = typeof record.date === 'string' ? record.date.trim() : '';
  if (!habit.id || !date) {
    return null;
  }

  const targetCount = getHabitTargetCount(habit, record);
  const completedCount = getHabitCompletedCount(record);
  if (!record.completed && completedCount <= 0) {
    return null;
  }

  const title = formatHabitName(habit);
  const progressSummary = targetCount > 1 ? `${completedCount}/${targetCount}` : '';

  return {
    id: `habit-checkin-${habit.id}-${date}`,
    type: 'habit-checkin',
    date,
    title,
    summary: progressSummary,
    sourceId: habit.id,
    sourceType: 'habit',
    note: typeof record.note === 'string' ? record.note.trim() : '',
    completed: Boolean(record.completed),
    completedCount,
    targetCount,
    habitId: habit.id,
    metadata: {
      timestamp: record.timestamp
    }
  };
}

export function habitCheckinRecordToLifelogEvents(
  habit: Habit,
  record: HabitCalendarDay
): HabitCheckinLifelogEvent[] {
  const date = typeof record.date === 'string' ? record.date.trim() : '';
  if (!habit.id || !date) {
    return [];
  }

  const targetCount = getHabitTargetCount(habit, record);
  const completedCount = getHabitCompletedCount(record);
  if (!record.completed && completedCount <= 0) {
    return [];
  }

  const timestamps = Array.isArray(record.checkinTimestamps)
    ? record.checkinTimestamps
      .map(timestamp => Number(timestamp))
      .filter(timestamp => Number.isFinite(timestamp) && timestamp > 0)
    : [];

  if (timestamps.length === 0) {
    const fallbackEvent = habitCheckinRecordToLifelogEvent(habit, record);
    return fallbackEvent ? [fallbackEvent] : [];
  }

  const title = formatHabitName(habit);
  const note = typeof record.note === 'string' ? record.note.trim() : '';
  const limitedTimestamps = timestamps.slice(0, Math.max(completedCount, timestamps.length));

  return limitedTimestamps.map((timestamp, index) => {
    const checkinIndex = index + 1;
    return {
      id: `habit-checkin-${habit.id}-${date}-${checkinIndex}-${timestamp}`,
      type: 'habit-checkin',
      date,
      title,
      summary: targetCount > 1 ? `${checkinIndex}/${targetCount}` : '',
      sourceId: habit.id,
      sourceType: 'habit',
      note,
      completed: checkinIndex >= targetCount || Boolean(record.completed),
      completedCount: checkinIndex,
      targetCount,
      checkinIndex,
      checkinTimestamp: timestamp,
      habitId: habit.id,
      metadata: {
        timestamp,
        dayCompletedCount: completedCount
      }
    };
  });
}

export function taskCompletedToLifelogEvent(task: Task): TaskCompletedLifelogEvent | null {
  const rawCompletedAt = typeof task.completedAt === 'string' ? task.completedAt.trim() : '';
  const completedAt = rawCompletedAt
    ? rawCompletedAt
    : (typeof task.updatedAt === 'string' ? task.updatedAt.trim() : '');
  if (task.status !== 'completed' && !rawCompletedAt) {
    return null;
  }
  if (!task.id || !completedAt) {
    return null;
  }

  const completedDate = parseLifelogDateValue(completedAt);
  if (!completedDate) {
    return null;
  }
  const normalizedCompletedAt = completedDate.toISOString();

  const plainTitle = typeof task.title === 'string' ? stripHtmlToText(task.title) : '';
  const title = plainTitle
    ? plainTitle
    : 'Task';
  const note = typeof task.description === 'string' ? task.description.trim() : '';

  return {
    id: `task-completed-${task.id}-${normalizedCompletedAt}`,
    type: 'task-completed',
    date: formatLocalDate(completedDate),
    title,
    note,
    sourceId: task.id,
    sourceType: 'task',
    completedAt: normalizedCompletedAt,
    taskId: task.id,
    priority: task.priority,
    tags: Array.isArray(task.tags) ? [...task.tags] : [],
    blockId: task.blockId,
    metadata: {
      dueDate: task.dueDate,
      startDate: task.startDate,
      groupId: task.groupId
    }
  };
}

export function moodEntryToLifelogEvent(date: string, entry: MoodEntry): MoodLifelogEvent | null {
  const dateKey = typeof date === 'string' ? date.trim() : '';
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return null;
  }

  const emoji = typeof entry?.emoji === 'string' ? entry.emoji.trim() : '';
  const note = typeof entry?.note === 'string' ? entry.note.trim() : '';
  if (!emoji && !note) {
    return null;
  }

  return {
    id: `mood-${dateKey}`,
    type: 'mood',
    date: dateKey,
    title: emoji || 'Mood',
    summary: note,
    sourceId: dateKey,
    sourceType: 'mood',
    note,
    emoji,
    moodTimestamp: typeof entry.timestamp === 'string' ? entry.timestamp : undefined
  };
}

export function moodManualEntryToLifelogEvent(
  date: string,
  entry: MoodManualEntry,
  emoji?: string
): ManualNoteLifelogEvent | null {
  const dateKey = typeof date === 'string' ? date.trim() : '';
  const text = typeof entry.text === 'string' ? entry.text.trim() : '';
  const moodEmoji = typeof emoji === 'string' ? emoji.trim() : '';
  if (!entry.id || !dateKey || !text) {
    return null;
  }

  return {
    id: entry.id,
    type: 'manual-note',
    date: dateKey,
    title: text,
    summary: text,
    sourceId: entry.id,
    sourceType: 'mood-entry',
    note: text,
    text,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    emoji: moodEmoji || undefined
  };
}




export function summarizeLifelogEventsByDay(events: LifelogEvent[]): Map<string, LifelogDaySummary> {
  const summaries = new Map<string, LifelogDaySummary>();
  for (const event of events) {
    const date = typeof event.date === 'string' ? event.date.trim() : '';
    if (!date) {
      continue;
    }

    const summary = summaries.get(date) || {
      date,
      count: 0,
      minutes: 0,
      countsByType: {}
    };
    summary.count += 1;
    summary.minutes += Math.max(0, Math.floor(Number(event.minutes) || 0));
    summary.countsByType[event.type] = (summary.countsByType[event.type] || 0) + 1;
    summaries.set(date, summary);
  }
  return summaries;
}

export function summarizeFocusLifelogEventsByDay(events: FocusLifelogEvent[]): Map<string, FocusDaySummary> {
  const summaries = new Map<string, FocusDaySummary>();
  for (const event of events) {
    const date = typeof event.date === 'string' ? event.date.trim() : '';
    const minutes = Math.max(0, Math.floor(Number(event.minutes) || 0));
    if (!date || minutes <= 0) {
      continue;
    }
    const summary = summaries.get(date) || { date, sessions: 0, minutes: 0 };
    summary.sessions += 1;
    summary.minutes += minutes;
    summaries.set(date, summary);
  }
  return summaries;
}

export function summarizeHabitCheckinLifelogEventsByDay(
  events: HabitCheckinLifelogEvent[]
): Map<string, HabitCheckinDaySummary> {
  const summaries = new Map<string, HabitCheckinDaySummary>();
  const habitIdsByDate = new Map<string, Set<string>>();
  const completedHabitIdsByDate = new Map<string, Set<string>>();
  for (const event of events) {
    const date = typeof event.date === 'string' ? event.date.trim() : '';
    if (!date) {
      continue;
    }
    const summary = summaries.get(date) || { date, habits: 0, completed: 0, checkins: 0 };
    const habitIds = habitIdsByDate.get(date) || new Set<string>();
    habitIds.add(event.habitId);
    habitIdsByDate.set(date, habitIds);
    if (event.completed) {
      const completedHabitIds = completedHabitIdsByDate.get(date) || new Set<string>();
      completedHabitIds.add(event.habitId);
      completedHabitIdsByDate.set(date, completedHabitIds);
    }
    summary.habits = habitIds.size;
    summary.completed = completedHabitIdsByDate.get(date)?.size || 0;
    if (event.completed || event.completedCount > 0) {
      summary.checkins += 1;
    }
    summaries.set(date, summary);
  }
  return summaries;
}

export function summarizeTaskCompletedLifelogEventsByDay(
  events: TaskCompletedLifelogEvent[]
): Map<string, TaskCompletedDaySummary> {
  const summaries = new Map<string, TaskCompletedDaySummary>();
  for (const event of events) {
    const date = typeof event.date === 'string' ? event.date.trim() : '';
    if (!date) {
      continue;
    }
    const summary = summaries.get(date) || { date, tasks: 0 };
    summary.tasks += 1;
    summaries.set(date, summary);
  }
  return summaries;
}

export function summarizeMoodLifelogEventsByDay(events: MoodLifelogEvent[]): Map<string, MoodDaySummary> {
  const summaries = new Map<string, MoodDaySummary>();
  for (const event of events) {
    const date = typeof event.date === 'string' ? event.date.trim() : '';
    if (!date) {
      continue;
    }
    const summary = summaries.get(date) || { date, moods: 0, emoji: '' };
    summary.moods += 1;
    if (!summary.emoji && event.emoji) {
      summary.emoji = event.emoji;
    }
    summaries.set(date, summary);
  }
  return summaries;
}

export function summarizeManualNoteLifelogEventsByDay(
  events: ManualNoteLifelogEvent[]
): Map<string, ManualNoteDaySummary> {
  const summaries = new Map<string, ManualNoteDaySummary>();
  for (const event of events) {
    const date = typeof event.date === 'string' ? event.date.trim() : '';
    if (!date) {
      continue;
    }
    const summary = summaries.get(date) || { date, notes: 0 };
    summary.notes += 1;
    summaries.set(date, summary);
  }
  return summaries;
}

export function groupLifelogEventsByDay<T extends LifelogEvent>(
  events: T[],
  dates?: Iterable<string>
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  if (dates) {
    for (const date of dates) {
      grouped.set(date, []);
    }
  }

  for (const event of events) {
    const date = typeof event.date === 'string' ? event.date.trim() : '';
    if (!date) {
      continue;
    }
    if (!grouped.has(date)) {
      grouped.set(date, []);
    }
    grouped.get(date)!.push(event);
  }

  return grouped;
}

export function focusRecordsToLifelogEvents(
  records: FocusSessionRecord[],
  fallbackTitle: string
): FocusLifelogEvent[] {
  return records
    .map(record => focusRecordToLifelogEvent(record, fallbackTitle))
    .filter((event): event is FocusLifelogEvent => Boolean(event));
}

export function habitsToLifelogEvents(habits: Habit[]): HabitCheckinLifelogEvent[] {
  const events: HabitCheckinLifelogEvent[] = [];
  for (const habit of habits) {
    const calendar = Array.isArray(habit.calendar) ? habit.calendar : [];
    for (const record of calendar) {
      events.push(...habitCheckinRecordToLifelogEvents(habit, record));
    }
  }
  return events;
}

export function tasksToCompletedLifelogEvents(tasks: Task[]): TaskCompletedLifelogEvent[] {
  return tasks
    .map(task => taskCompletedToLifelogEvent(task))
    .filter((event): event is TaskCompletedLifelogEvent => Boolean(event));
}

export function moodDataToLifelogEvents(moodData: MoodData): MoodLifelogEvent[] {
  return Object.entries(moodData || {})
    .map(([date, entry]) => moodEntryToLifelogEvent(date, entry))
    .filter((event): event is MoodLifelogEvent => Boolean(event));
}

export function moodManualEntriesToLifelogEvents(moodData: MoodData): ManualNoteLifelogEvent[] {
  return Object.entries(moodData || {})
    .flatMap(([date, entry]) => (
      Array.isArray(entry?.entries)
        ? entry.entries.map(manualEntry => moodManualEntryToLifelogEvent(date, manualEntry, entry.emoji))
        : []
    ))
    .filter((event): event is ManualNoteLifelogEvent => Boolean(event));
}
