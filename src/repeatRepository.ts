import { usePlugin } from '@/main';
import { eventBus, Events } from '@/utils/eventBus';
import { formatDate } from '@/composables/useDateUtils';
import { translate } from '@/composables/useI18n';

export type RepeatFrequency = 'none' | 'daily' | 'weekdays' | 'weekend' | 'weekly' | 'monthly' | 'custom';
type ActiveRepeatFrequency = Exclude<RepeatFrequency, 'none'>;
type RepeatTaskStatus = 'pending' | 'in-progress' | 'delayed' | 'completed' | 'cancelled';
export type RepeatRuleUnit = 'day' | 'week' | 'month';

export interface RepeatRule {
  unit: RepeatRuleUnit;
  interval: number;
  weekDays?: number[];
  monthDay?: number;
  monthMode?: 'day-of-month' | 'last-day';
}

export interface RepeatRuleInput {
  frequency: RepeatFrequency;
  rule?: RepeatRule;
}

const REPEAT_SERIES_FILE = 'Pinch-repeat-series.json';
const REPEAT_RECORDS_FILE = 'Pinch-repeat-records.json';
const DEFAULT_PAST_WINDOW_DAYS = 30;
const DEFAULT_FUTURE_WINDOW_DAYS = 90;
const REPEAT_CACHE_TTL_MS = 5000;

export interface RepeatSeries {
  id: string;
  templateTaskId: string;
  templateBlockId?: string;
  frequency: ActiveRepeatFrequency;
  rule?: RepeatRule;
  interval: number;
  weekDays?: number[];
  monthDay?: number;
  startDate: string;
  endDate?: string;
  spanDays: number;
  title: string;
  description?: string;
  priority: 'none' | 'high' | 'medium' | 'low';
  tags: string[];
  startTime?: string;
  dueTime?: string;
  notebookId?: string;
  rootId?: string;
  hPath?: string;
  icon?: string;
  backgroundColor?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RepeatRecord {
  key: string;
  seriesId: string;
  date: string;
  status: RepeatTaskStatus;
  completedAt?: string;
  updatedAt: string;
}

export interface RepeatTaskLike {
  id: string;
  type: 'standalone' | 'block';
  title: string;
  status: RepeatTaskStatus;
  priority: 'none' | 'high' | 'medium' | 'low';
  dueDate?: string;
  startDate?: string;
  dueTime?: string;
  startTime?: string;
  tags: string[];
  description?: string;
  blockId?: string;
  rootId?: string;
  hPath?: string;
  notebookId?: string;
  icon?: string;
  backgroundColor?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  repeatSeriesId?: string;
  repeatFrequency?: RepeatFrequency;
  repeatInstanceDate?: string;
  isVirtual?: boolean;
}

export interface RepeatMaterializeOptions {
  pastDays?: number;
  futureDays?: number;
  startDate?: string;
  endDate?: string;
  includeTemplateDate?: boolean;
  filterBaseTasksToRange?: boolean;
}

let repeatSeriesCache: { value: RepeatSeries[]; timestamp: number } | null = null;
let repeatRecordsCache: { value: RepeatRecord[]; timestamp: number } | null = null;

function cloneRepeatSeries(series: RepeatSeries): RepeatSeries {
  return {
    ...series,
    rule: series.rule
      ? {
        ...series.rule,
        weekDays: series.rule.weekDays ? [...series.rule.weekDays] : undefined
      }
      : undefined,
    weekDays: series.weekDays ? [...series.weekDays] : undefined,
    tags: Array.isArray(series.tags) ? [...series.tags] : []
  };
}

function cloneRepeatSeriesList(seriesList: RepeatSeries[]): RepeatSeries[] {
  return seriesList.map(cloneRepeatSeries);
}

function cloneRepeatRecords(records: RepeatRecord[]): RepeatRecord[] {
  return records.map((record) => ({ ...record }));
}

function isRepeatCacheFresh(timestamp: number): boolean {
  return Date.now() - timestamp < REPEAT_CACHE_TTL_MS;
}

function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function daysBetween(startDate: Date, endDate: Date): number {
  const ms = endDate.getTime() - startDate.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

function nowDateString(): string {
  return formatDate(new Date());
}

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizeFrequency(frequency: unknown): ActiveRepeatFrequency | null {
  if (
    frequency === 'daily'
    || frequency === 'weekdays'
    || frequency === 'weekend'
    || frequency === 'weekly'
    || frequency === 'monthly'
    || frequency === 'custom'
  ) {
    return frequency;
  }
  return null;
}

function normalizeInterval(interval: unknown): number {
  const n = Number(interval);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.max(1, Math.floor(n));
}

function normalizeWeekDays(days: unknown): number[] | undefined {
  if (!Array.isArray(days)) return undefined;
  const normalized = Array.from(
    new Set(
      days
        .map((day) => Number(day))
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    )
  ).sort((a, b) => a - b);
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeMonthDay(day: unknown): number | undefined {
  const monthDay = Number(day);
  if (!Number.isInteger(monthDay)) return undefined;
  if (monthDay < 1 || monthDay > 31) return undefined;
  return monthDay;
}

function normalizeRepeatRule(raw: unknown): RepeatRule | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const item = raw as Partial<RepeatRule>;
  const unit = item.unit === 'day' || item.unit === 'week' || item.unit === 'month' ? item.unit : undefined;
  if (!unit) return undefined;

  const rule: RepeatRule = {
    unit,
    interval: normalizeInterval(item.interval)
  };

  if (unit === 'week') {
    rule.weekDays = normalizeWeekDays(item.weekDays);
  }

  if (unit === 'month') {
    const monthMode = item.monthMode === 'last-day' ? 'last-day' : 'day-of-month';
    rule.monthMode = monthMode;
    rule.monthDay = monthMode === 'day-of-month' ? normalizeMonthDay(item.monthDay) : undefined;
  }

  return rule;
}

function buildDefaultRepeatRule(
  frequency: ActiveRepeatFrequency,
  baseDate: Date,
  interval = 1,
  weekDays?: number[],
  monthDay?: number
): RepeatRule {
  if (frequency === 'daily') {
    return { unit: 'day', interval };
  }
  if (frequency === 'weekdays') {
    return { unit: 'week', interval: 1, weekDays: [1, 2, 3, 4, 5] };
  }
  if (frequency === 'weekend') {
    return { unit: 'week', interval: 1, weekDays: [0, 6] };
  }
  if (frequency === 'monthly') {
    return {
      unit: 'month',
      interval,
      monthMode: 'day-of-month',
      monthDay: monthDay || baseDate.getDate()
    };
  }
  return {
    unit: 'week',
    interval,
    weekDays: weekDays?.length ? weekDays : [baseDate.getDay()]
  };
}

function normalizeRepeatRuleInput(
  input: RepeatFrequency | RepeatRuleInput
): { frequency: RepeatFrequency; rule?: RepeatRule } {
  if (typeof input === 'string') {
    return { frequency: input };
  }
  return {
    frequency: input.frequency,
    rule: normalizeRepeatRule(input.rule)
  };
}

function normalizeSpanDays(spanDays: unknown): number {
  const n = Number(spanDays);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function buildSeriesId(): string {
  return `series_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function buildRecordKey(seriesId: string, date: string): string {
  return `${seriesId}:${date}`;
}

function buildVirtualTaskId(seriesId: string, date: string): string {
  return `repeat_${seriesId}_${date}`.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function buildRepeatRecordMap(records: RepeatRecord[]): Map<string, RepeatRecord> {
  return new Map(records.map((record) => [record.key, record]));
}

function getMaterializeRange(options: RepeatMaterializeOptions = {}): { start: Date; end: Date } {
  const explicitStart = parseDate(options.startDate);
  const explicitEnd = parseDate(options.endDate);
  if (explicitStart || explicitEnd) {
    const start = explicitStart ? new Date(explicitStart) : new Date(explicitEnd!);
    const end = explicitEnd ? new Date(explicitEnd) : new Date(explicitStart!);
    if (start.getTime() <= end.getTime()) {
      return { start, end };
    }
    return { start: end, end: start };
  }

  const today = parseDate(nowDateString())!;
  const start = new Date(today);
  start.setDate(start.getDate() - (options.pastDays ?? DEFAULT_PAST_WINDOW_DAYS));
  start.setHours(0, 0, 0, 0);

  const end = new Date(today);
  end.setDate(end.getDate() + (options.futureDays ?? DEFAULT_FUTURE_WINDOW_DAYS));
  end.setHours(0, 0, 0, 0);

  return { start, end };
}

function getTaskBaseDate(task: RepeatTaskLike): string {
  const fromTask = task.startDate || task.dueDate;
  const parsed = parseDate(fromTask);
  return parsed ? formatDate(parsed) : nowDateString();
}

function calculateSpanDays(task: RepeatTaskLike): number {
  const start = parseDate(task.startDate || task.dueDate);
  const due = parseDate(task.dueDate || task.startDate);
  if (!start || !due) return 0;
  const span = daysBetween(start, due);
  return Math.max(0, span);
}

function findTemplateTaskForSeries<T extends RepeatTaskLike>(baseTasks: T[], series: RepeatSeries): T | undefined {
  return baseTasks.find((task) => task.id === series.templateTaskId)
    || (series.templateBlockId
      ? baseTasks.find((task) => task.blockId === series.templateBlockId)
      : undefined);
}

function getTaskDateRange(task: RepeatTaskLike): { start: Date; end: Date } | null {
  const start = parseDate(task.startDate || task.repeatInstanceDate || task.dueDate);
  const end = parseDate(task.dueDate || task.startDate || task.repeatInstanceDate);
  if (!start && !end) return null;
  const rangeStart = start || end!;
  const rangeEnd = end || start!;
  return rangeStart.getTime() <= rangeEnd.getTime()
    ? { start: rangeStart, end: rangeEnd }
    : { start: rangeEnd, end: rangeStart };
}

function isTaskInMaterializeRange(task: RepeatTaskLike, range: { start: Date; end: Date }): boolean {
  const taskRange = getTaskDateRange(task);
  if (!taskRange) return false;
  return taskRange.start.getTime() <= range.end.getTime()
    && taskRange.end.getTime() >= range.start.getTime();
}

function isRepeatTemplateTask(task: RepeatTaskLike, seriesList: RepeatSeries[]): boolean {
  return seriesList.some((series) =>
    series.templateTaskId === task.id
    || (!!task.blockId && series.templateBlockId === task.blockId)
  );
}

function filterBaseTasksForMaterializeRange<T extends RepeatTaskLike>(
  baseTasks: T[],
  seriesList: RepeatSeries[],
  range: { start: Date; end: Date }
): T[] {
  return baseTasks.filter((task) =>
    isTaskInMaterializeRange(task, range)
    || isRepeatTemplateTask(task, seriesList)
  );
}

function buildVirtualTasksForSeries<T extends RepeatTaskLike>(
  series: RepeatSeries,
  templateTask: T,
  recordMap: Map<string, RepeatRecord>,
  range: { start: Date; end: Date },
  includeTemplateDate = false
): T[] {
  const seriesEndDate = parseDate(series.endDate);
  const effectiveRangeEnd = seriesEndDate || range.end;
  if (effectiveRangeEnd.getTime() < range.start.getTime()) {
    return [];
  }

  const virtualTasks: T[] = [];
  const cursor = new Date(range.start);
  while (cursor <= effectiveRangeEnd) {
    if (!matchesSeriesDate(series, cursor)) {
      cursor.setDate(cursor.getDate() + 1);
      continue;
    }

    const instanceDate = formatDate(cursor);
    if (!includeTemplateDate && instanceDate === series.startDate) {
      cursor.setDate(cursor.getDate() + 1);
      continue;
    }

    const recordKey = buildRecordKey(series.id, instanceDate);
    const record = recordMap.get(recordKey);
    const status = record?.status || 'in-progress';

    const templateTitle = typeof templateTask.title === 'string' ? templateTask.title : '';
    const templateDescription = typeof templateTask.description === 'string' ? templateTask.description : '';
    const templatePriority = (
      templateTask.priority === 'high'
      || templateTask.priority === 'medium'
      || templateTask.priority === 'low'
      || templateTask.priority === 'none'
    ) ? templateTask.priority : undefined;
    const templateTags = Array.isArray(templateTask.tags) ? [...templateTask.tags] : [];

    virtualTasks.push({
      ...templateTask,
      id: buildVirtualTaskId(series.id, instanceDate),
      isVirtual: true,
      repeatSeriesId: series.id,
      repeatFrequency: series.frequency,
      repeatInstanceDate: instanceDate,
      status,
      startDate: instanceDate,
      dueDate: instanceDate,
      startTime: series.startTime || templateTask.startTime,
      dueTime: series.dueTime || templateTask.dueTime,
      // Keep virtual instances aligned with latest template edits (title/priority/description/tags).
      title: templateTitle || series.title || '\u91cd\u590d\u4efb\u52a1',
      description: templateDescription,
      priority: templatePriority || series.priority || 'none',
      tags: templateTags,
      backgroundColor: templateTask.backgroundColor || series.backgroundColor,
      blockId: undefined,
      completedAt: record?.completedAt,
      updatedAt: record?.updatedAt || series.updatedAt,
      createdAt: series.createdAt
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return virtualTasks;
}

function matchesSeriesDate(series: RepeatSeries, date: Date): boolean {
  const start = parseDate(series.startDate);
  if (!start) return false;
  if (date < start) return false;
  const end = parseDate(series.endDate);
  if (end && date > end) return false;

  const diffDays = daysBetween(start, date);
  if (diffDays < 0) return false;

  if (series.frequency === 'custom') {
    const rule = series.rule || buildDefaultRepeatRule('weekly', start, series.interval, series.weekDays, series.monthDay);
    return matchesRepeatRule(rule, start, date, diffDays);
  }

  if (series.frequency === 'daily') {
    return diffDays % series.interval === 0;
  }

  if (series.frequency === 'weekdays') {
    const day = date.getDay();
    return day >= 1 && day <= 5;
  }

  if (series.frequency === 'weekend') {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  if (series.frequency === 'weekly') {
    const allowedDays = series.weekDays?.length ? series.weekDays : [start.getDay()];
    if (!allowedDays.includes(date.getDay())) return false;
    const diffWeeks = Math.floor(diffDays / 7);
    return diffWeeks % series.interval === 0;
  }

  const monthDay = series.monthDay || start.getDate();
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const expectedDay = Math.min(monthDay, lastDay);
  if (date.getDate() !== expectedDay) return false;

  const monthDiff = (date.getFullYear() - start.getFullYear()) * 12 + (date.getMonth() - start.getMonth());
  return monthDiff >= 0 && monthDiff % series.interval === 0;
}

function matchesRepeatRule(rule: RepeatRule, start: Date, date: Date, diffDays: number): boolean {
  const interval = normalizeInterval(rule.interval);

  if (rule.unit === 'day') {
    return diffDays % interval === 0;
  }

  if (rule.unit === 'week') {
    const allowedDays = rule.weekDays?.length ? rule.weekDays : [start.getDay()];
    if (!allowedDays.includes(date.getDay())) return false;
    const diffWeeks = Math.floor(diffDays / 7);
    return diffWeeks % interval === 0;
  }

  const monthDiff = (date.getFullYear() - start.getFullYear()) * 12 + (date.getMonth() - start.getMonth());
  if (monthDiff < 0 || monthDiff % interval !== 0) return false;

  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  if (rule.monthMode === 'last-day') {
    return date.getDate() === lastDay;
  }

  const expectedDay = Math.min(rule.monthDay || start.getDate(), lastDay);
  return date.getDate() === expectedDay;
}

async function loadData<T>(file: string, fallback: T): Promise<T> {
  const plugin = usePlugin();
  if (!plugin) return fallback;
  try {
    const data = await plugin.loadData(file);
    if (!data) return fallback;
    return (typeof data === 'string' ? JSON.parse(data) : data) as T;
  } catch {
    return fallback;
  }
}

async function saveData(file: string, value: unknown): Promise<void> {
  const plugin = usePlugin();
  if (!plugin) return;
  await plugin.saveData(file, value);
}

function normalizeSeries(raw: unknown): RepeatSeries | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Partial<RepeatSeries>;

  const frequency = normalizeFrequency(item.frequency);
  if (!frequency) return null;

  const templateTaskId = typeof item.templateTaskId === 'string' ? item.templateTaskId.trim() : '';
  if (!templateTaskId) return null;

  const startDate = parseDate(item.startDate);
  if (!startDate) return null;

  const normalizedWeekDays = normalizeWeekDays(item.weekDays);
  const normalizedSpanDays = normalizeSpanDays(item.spanDays);
  const rawEndDate = typeof item.endDate === 'string' ? parseDate(item.endDate) : null;
  const normalizedRule = normalizeRepeatRule(item.rule)
    || buildDefaultRepeatRule(
      frequency,
      startDate,
      normalizeInterval(item.interval),
      normalizedWeekDays,
      normalizeMonthDay(item.monthDay)
    );
  let normalizedEndDate: string | undefined;
  if (rawEndDate && rawEndDate.getTime() > startDate.getTime()) {
    normalizedEndDate = formatDate(rawEndDate);
  } else if (normalizedSpanDays > 0) {
    const derivedEnd = new Date(startDate);
    derivedEnd.setDate(derivedEnd.getDate() + normalizedSpanDays);
    normalizedEndDate = formatDate(derivedEnd);
  }

  return {
    id: typeof item.id === 'string' && item.id ? item.id : buildSeriesId(),
    templateTaskId,
    templateBlockId: typeof item.templateBlockId === 'string' ? item.templateBlockId : undefined,
    frequency,
    rule: normalizedRule,
    interval: frequency === 'monthly' || frequency === 'custom' ? normalizeInterval(normalizedRule.interval) : 1,
    weekDays: frequency === 'weekly'
      ? normalizedWeekDays
      : (frequency === 'weekdays'
        ? [1, 2, 3, 4, 5]
        : (frequency === 'weekend'
          ? [0, 6]
          : (frequency === 'custom' && normalizedRule.unit === 'week' ? normalizedRule.weekDays : undefined))),
    monthDay: frequency === 'monthly' ? normalizeMonthDay(item.monthDay) : undefined,
    startDate: formatDate(startDate),
    endDate: normalizedEndDate,
    spanDays: normalizedSpanDays,
    title: typeof item.title === 'string' && item.title.trim() ? item.title.trim() : translate('taskCard.repeatTask', 'Recurring task'),
    description: typeof item.description === 'string' ? item.description : '',
    priority: item.priority === 'high' || item.priority === 'medium' || item.priority === 'low' ? item.priority : 'none',
    tags: Array.isArray(item.tags) ? item.tags.filter((tag) => typeof tag === 'string') : [],
    startTime: typeof item.startTime === 'string' ? item.startTime : undefined,
    dueTime: typeof item.dueTime === 'string' ? item.dueTime : undefined,
    notebookId: typeof item.notebookId === 'string' ? item.notebookId : undefined,
    rootId: typeof item.rootId === 'string' ? item.rootId : undefined,
    hPath: typeof item.hPath === 'string' ? item.hPath : undefined,
    icon: typeof item.icon === 'string' ? item.icon : undefined,
    backgroundColor: typeof item.backgroundColor === 'string' ? item.backgroundColor : undefined,
    enabled: item.enabled !== false,
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
    updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString()
  };
}

function normalizeRecord(raw: unknown): RepeatRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Partial<RepeatRecord>;
  if (typeof item.seriesId !== 'string' || !item.seriesId) return null;
  if (typeof item.date !== 'string' || !parseDate(item.date)) return null;
  if (
    item.status !== 'pending'
    && item.status !== 'in-progress'
    && item.status !== 'delayed'
    && item.status !== 'completed'
    && item.status !== 'cancelled'
  ) {
    return null;
  }

  return {
    key: typeof item.key === 'string' && item.key ? item.key : buildRecordKey(item.seriesId, item.date),
    seriesId: item.seriesId,
    date: item.date,
    status: item.status,
    completedAt: typeof item.completedAt === 'string' ? item.completedAt : undefined,
    updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString()
  };
}

export async function loadRepeatSeries(): Promise<RepeatSeries[]> {
  if (repeatSeriesCache && isRepeatCacheFresh(repeatSeriesCache.timestamp)) {
    return cloneRepeatSeriesList(repeatSeriesCache.value);
  }

  const raw = await loadData<unknown>(REPEAT_SERIES_FILE, []);
  const normalized = toArray<unknown>(raw).map(normalizeSeries).filter((item): item is RepeatSeries => !!item);
  repeatSeriesCache = {
    value: cloneRepeatSeriesList(normalized),
    timestamp: Date.now()
  };
  return cloneRepeatSeriesList(normalized);
}

export async function saveRepeatSeries(series: RepeatSeries[]): Promise<void> {
  await saveData(REPEAT_SERIES_FILE, series);
  repeatSeriesCache = {
    value: cloneRepeatSeriesList(series),
    timestamp: Date.now()
  };
}

export async function getRepeatSeriesForTask(
  task: Pick<RepeatTaskLike, 'id' | 'blockId' | 'repeatSeriesId'>
): Promise<RepeatSeries | null> {
  const seriesList = await loadRepeatSeries();
  const series = findSeriesForTask(seriesList, task);
  return series || null;
}

export async function updateRepeatSeriesDates(
  task: Pick<RepeatTaskLike, 'id' | 'blockId' | 'repeatSeriesId'>,
  startDate: string | null,
  dueDate: string | null,
  timePatch?: {
    startTime?: string | null;
    dueTime?: string | null;
  },
  options: {
    emitChange?: boolean;
  } = {}
): Promise<RepeatSeries | null> {
  const seriesList = await loadRepeatSeries();
  const series = findSeriesForTask(seriesList, task);
  if (!series) return null;

  const baseStart = startDate ? parseDate(startDate) : parseDate(series.startDate);
  if (!baseStart) return null;
  const normalizedStart = formatDate(baseStart);

  let normalizedEnd: string | undefined;
  if (dueDate) {
    const parsedDue = parseDate(dueDate);
    if (parsedDue && parsedDue.getTime() >= baseStart.getTime()) {
      normalizedEnd = formatDate(parsedDue);
    }
  }

  const hasStartTimePatch = !!timePatch && Object.prototype.hasOwnProperty.call(timePatch, 'startTime');
  const hasDueTimePatch = !!timePatch && Object.prototype.hasOwnProperty.call(timePatch, 'dueTime');
  const normalizedStartTime = hasStartTimePatch
    ? (typeof timePatch?.startTime === 'string' && timePatch.startTime.trim().length > 0
      ? timePatch.startTime
      : undefined)
    : series.startTime;
  const normalizedDueTime = hasDueTimePatch
    ? (typeof timePatch?.dueTime === 'string' && timePatch.dueTime.trim().length > 0
      ? timePatch.dueTime
      : undefined)
    : series.dueTime;

  const updated: RepeatSeries = {
    ...series,
    startDate: normalizedStart,
    endDate: normalizedEnd,
    startTime: normalizedStartTime,
    dueTime: normalizedDueTime,
    spanDays: normalizedEnd ? daysBetween(baseStart, parseDate(normalizedEnd)!) : 0,
    updatedAt: new Date().toISOString()
  };

  if (updated.frequency === 'weekly') {
    updated.weekDays = [baseStart.getDay()];
  }

  const idx = seriesList.findIndex(item => item.id === series.id);
  if (idx >= 0) {
    seriesList[idx] = updated;
  } else {
    seriesList.push(updated);
  }

  await saveRepeatSeries(seriesList);
  if (options.emitChange !== false) {
    emitRepeatChanged({
      blockId: updated.templateBlockId,
      seriesId: updated.id,
      frequency: updated.frequency
    });
  }

  return updated;
}

export async function updateRepeatSeriesBackgroundColor(
  task: Pick<RepeatTaskLike, 'id' | 'blockId' | 'repeatSeriesId'>,
  backgroundColor?: string,
  options: {
    emitChange?: boolean;
  } = {}
): Promise<RepeatSeries | null> {
  const seriesList = await loadRepeatSeries();
  const series = findSeriesForTask(seriesList, task);
  if (!series) return null;

  const normalizedBackgroundColor = typeof backgroundColor === 'string' && backgroundColor.trim().length > 0
    ? backgroundColor.trim()
    : undefined;

  const updated: RepeatSeries = {
    ...series,
    backgroundColor: normalizedBackgroundColor,
    updatedAt: new Date().toISOString()
  };

  const idx = seriesList.findIndex(item => item.id === series.id);
  if (idx >= 0) {
    seriesList[idx] = updated;
  } else {
    seriesList.push(updated);
  }

  await saveRepeatSeries(seriesList);

  if (options.emitChange !== false) {
    emitRepeatChanged({
      blockId: updated.templateBlockId,
      seriesId: updated.id,
      frequency: updated.frequency
    });
  }

  return updated;
}

export async function loadRepeatRecords(): Promise<RepeatRecord[]> {
  if (repeatRecordsCache && isRepeatCacheFresh(repeatRecordsCache.timestamp)) {
    return cloneRepeatRecords(repeatRecordsCache.value);
  }

  const raw = await loadData<unknown>(REPEAT_RECORDS_FILE, []);
  const normalized = toArray<unknown>(raw).map(normalizeRecord).filter((item): item is RepeatRecord => !!item);
  repeatRecordsCache = {
    value: cloneRepeatRecords(normalized),
    timestamp: Date.now()
  };
  return cloneRepeatRecords(normalized);
}

export async function saveRepeatRecords(records: RepeatRecord[]): Promise<void> {
  await saveData(REPEAT_RECORDS_FILE, records);
  repeatRecordsCache = {
    value: cloneRepeatRecords(records),
    timestamp: Date.now()
  };
}

function findSeriesForTask(seriesList: RepeatSeries[], task: Pick<RepeatTaskLike, 'id' | 'blockId' | 'repeatSeriesId'>): RepeatSeries | undefined {
  if (task.repeatSeriesId) {
    return seriesList.find((series) => series.id === task.repeatSeriesId);
  }
  return seriesList.find((series) =>
    series.templateTaskId === task.id
    || (!!task.blockId && series.templateBlockId === task.blockId)
  );
}

export async function attachRepeatMetadataToTasks<T extends RepeatTaskLike>(
  baseTasks: T[],
  seriesListOverride?: RepeatSeries[]
): Promise<T[]> {
  if (!Array.isArray(baseTasks) || baseTasks.length === 0) {
    return baseTasks;
  }

  const sourceSeries = seriesListOverride ?? (await loadRepeatSeries());
  const seriesList = sourceSeries.filter((series) => series.enabled);
  if (seriesList.length === 0) {
    return baseTasks;
  }

  return baseTasks.map((task) => {
    const series = findSeriesForTask(seriesList, task);
    if (!series) return task;
    return {
      ...task,
      repeatSeriesId: series.id,
      repeatFrequency: series.frequency,
      isVirtual: false
    };
  }) as T[];
}

function emitRepeatChanged(payload: {
  blockId?: string;
  seriesId?: string;
  frequency?: RepeatFrequency;
} = {}): void {
  eventBus.emit(Events.TASK_ADDED, {
    reason: 'repeat-changed',
    blockId: payload.blockId,
    seriesId: payload.seriesId,
    frequency: payload.frequency
  });
}

export function notifyRepeatChanged(payload: {
  blockId?: string;
  seriesId?: string;
  frequency?: RepeatFrequency;
} = {}): void {
  emitRepeatChanged(payload);
}

export async function setTaskRepeatSeries(task: RepeatTaskLike, repeat: RepeatFrequency | RepeatRuleInput): Promise<RepeatSeries | null> {
  const { frequency, rule } = normalizeRepeatRuleInput(repeat);
  const seriesList = await loadRepeatSeries();
  const existing = findSeriesForTask(seriesList, task);

  if (frequency === 'none') {
    const removedSeriesIds = seriesList
      .filter((series) =>
        series.id === task.repeatSeriesId
        || series.templateTaskId === task.id
        || (!!task.blockId && series.templateBlockId === task.blockId)
      )
      .map((series) => series.id);

    if (removedSeriesIds.length === 0) {
      return null;
    }

    const nextSeries = seriesList.filter((series) => !removedSeriesIds.includes(series.id));
    const records = await loadRepeatRecords();
    const nextRecords = records.filter((record) => !removedSeriesIds.includes(record.seriesId));
    await Promise.all([
      saveRepeatSeries(nextSeries),
      saveRepeatRecords(nextRecords)
    ]);
    const fallbackBlockId =
      task.blockId
      || existing?.templateBlockId
      || seriesList.find((series) => removedSeriesIds.includes(series.id))?.templateBlockId;
    emitRepeatChanged({
      blockId: fallbackBlockId,
      seriesId: existing?.id || removedSeriesIds[0],
      frequency: 'none'
    });
    return null;
  }

  const now = new Date().toISOString();
  const baseDate = getTaskBaseDate(task);
  const baseDateObj = parseDate(baseDate)!;
  const dueDateObj = parseDate(task.dueDate);
  const normalizedEndDate = dueDateObj && dueDateObj.getTime() > baseDateObj.getTime()
    ? formatDate(dueDateObj)
    : undefined;
  const nextRule = frequency === 'custom'
    ? (rule || existing?.rule || buildDefaultRepeatRule('weekly', baseDateObj, 1, [baseDateObj.getDay()]))
    : buildDefaultRepeatRule(
      frequency,
      baseDateObj,
      frequency === 'monthly' ? (existing?.interval || 1) : 1,
      frequency === 'weekly' ? [baseDateObj.getDay()] : undefined,
      frequency === 'monthly' ? (existing?.monthDay || baseDateObj.getDate()) : undefined
    );
  const nextSeries: RepeatSeries = {
    id: existing?.id || buildSeriesId(),
    templateTaskId: existing?.templateTaskId || task.id,
    templateBlockId: task.blockId || existing?.templateBlockId,
    frequency,
    rule: nextRule,
    interval: frequency === 'monthly' || frequency === 'custom' ? nextRule.interval : 1,
    weekDays: frequency === 'weekly'
      ? [baseDateObj.getDay()]
      : (frequency === 'weekdays'
        ? [1, 2, 3, 4, 5]
        : (frequency === 'weekend'
          ? [0, 6]
          : (frequency === 'custom' && nextRule.unit === 'week' ? nextRule.weekDays : undefined))),
    monthDay: frequency === 'monthly'
      ? (existing?.monthDay || baseDateObj.getDate())
      : (frequency === 'custom' && nextRule.unit === 'month' ? nextRule.monthDay : undefined),
    startDate: existing?.startDate || baseDate,
    endDate: normalizedEndDate,
    spanDays: calculateSpanDays(task),
    title: task.title || existing?.title || translate('taskCard.repeatTask', 'Recurring task'),
    description: task.description || '',
    priority: task.priority || existing?.priority || 'none',
    tags: Array.isArray(task.tags) ? [...task.tags] : [],
    startTime: task.startTime || existing?.startTime,
    dueTime: task.dueTime || existing?.dueTime,
    notebookId: task.notebookId || existing?.notebookId,
    rootId: task.rootId || existing?.rootId,
    hPath: task.hPath || existing?.hPath,
    icon: task.icon || existing?.icon,
    backgroundColor: task.backgroundColor || existing?.backgroundColor,
    enabled: existing?.enabled ?? true,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };

  const idx = existing ? seriesList.findIndex((series) => series.id === existing.id) : -1;
  if (idx >= 0) {
    seriesList[idx] = nextSeries;
  } else {
    seriesList.push(nextSeries);
  }

  await saveRepeatSeries(seriesList);
  emitRepeatChanged({
    blockId: task.blockId || existing?.templateBlockId,
    seriesId: nextSeries.id,
    frequency
  });
  return nextSeries;
}

export async function getTaskRepeatFrequency(task: RepeatTaskLike): Promise<RepeatFrequency> {
  const seriesList = await loadRepeatSeries();
  const found = findSeriesForTask(seriesList, task);
  if (!found) return 'none';
  if (found.frequency === 'weekly') {
    const days = [...(found.weekDays || [])].sort((a, b) => a - b).join(',');
    if (days === '1,2,3,4,5') return 'weekdays';
    if (days === '0,6') return 'weekend';
    return 'weekly';
  }
  if (found.frequency === 'monthly') {
    // Monthly is kept for backward compatibility, but UI no longer exposes it.
    return 'weekly';
  }
  return found.frequency;
}

export async function setRepeatInstanceStatus(seriesId: string, date: string, status: RepeatTaskStatus): Promise<void> {
  const normalizedDate = parseDate(date);
  if (!seriesId || !normalizedDate) return;

  const seriesList = await loadRepeatSeries();
  const series = seriesList.find((item) => item.id === seriesId);
  const targetDate = formatDate(normalizedDate);
  const key = buildRecordKey(seriesId, targetDate);
  const records = await loadRepeatRecords();
  const index = records.findIndex((record) => record.key === key);

  if (status === 'pending') {
    if (index >= 0) {
      records.splice(index, 1);
      await saveRepeatRecords(records);
      emitRepeatChanged({
        blockId: series?.templateBlockId,
        seriesId: seriesId,
        frequency: series?.frequency
      });
    }
    return;
  }

  const now = new Date().toISOString();
  const next: RepeatRecord = {
    key,
    seriesId,
    date: targetDate,
    status,
    completedAt: status === 'completed' ? now : undefined,
    updatedAt: now
  };

  if (index >= 0) {
    records[index] = next;
  } else {
    records.push(next);
  }

  await saveRepeatRecords(records);
  emitRepeatChanged({
    blockId: series?.templateBlockId,
    seriesId: seriesId,
    frequency: series?.frequency
  });
}

export async function materializeRepeatTasks<T extends RepeatTaskLike>(
  baseTasks: T[],
  options: RepeatMaterializeOptions = {}
): Promise<T[]> {
  if (!Array.isArray(baseTasks) || baseTasks.length === 0) {
    return baseTasks;
  }

  const seriesList = (await loadRepeatSeries()).filter((series) => series.enabled);
  if (seriesList.length === 0) {
    return baseTasks;
  }

  const range = getMaterializeRange(options);
  const scopedBaseTasks = options.filterBaseTasksToRange === true
    ? filterBaseTasksForMaterializeRange(baseTasks, seriesList, range)
    : baseTasks;

  const records = await loadRepeatRecords();
  const recordMap = buildRepeatRecordMap(records);
  const taskMapById = new Map(scopedBaseTasks.map((task) => [task.id, task]));
  const taskMapByBlockId = new Map(
    scopedBaseTasks
      .filter((task) => !!task.blockId)
      .map((task) => [task.blockId as string, task])
  );

  const decoratedBaseTasks = await attachRepeatMetadataToTasks(scopedBaseTasks, seriesList);

  const virtualTasks: T[] = [];

  for (const series of seriesList) {
    const templateTask = taskMapById.get(series.templateTaskId)
      || (series.templateBlockId ? taskMapByBlockId.get(series.templateBlockId) : undefined);
    if (!templateTask) continue;
    virtualTasks.push(...buildVirtualTasksForSeries(
      series,
      templateTask,
      recordMap,
      range,
      options.includeTemplateDate === true
    ));
  }

  return [...decoratedBaseTasks, ...virtualTasks] as T[];
}

export async function rebuildAffectedRepeatTasks<T extends RepeatTaskLike>(
  taskList: T[],
  payload: {
    blockId?: string;
    seriesId?: string;
    frequency?: string;
  },
  options: RepeatMaterializeOptions = {}
): Promise<{ nextTasks: T[]; touched: boolean; handled: boolean }> {
  const { seriesId, frequency } = payload;
  if (!Array.isArray(taskList)) {
    return { nextTasks: taskList, touched: false, handled: false };
  }

  if (!frequency) {
    return { nextTasks: taskList, touched: false, handled: false };
  }

  if (frequency === 'none') {
    if (!seriesId) {
      return { nextTasks: taskList, touched: false, handled: false };
    }
    return { nextTasks: taskList, touched: false, handled: true };
  }

  if (!seriesId) {
    return { nextTasks: taskList, touched: false, handled: false };
  }

  const seriesList = (await loadRepeatSeries()).filter((series) => series.enabled);
  const targetSeries = seriesList.find((series) => series.id === seriesId);
  if (!targetSeries) {
    return { nextTasks: taskList, touched: false, handled: false };
  }

  const baseTasks = taskList.filter((task) => !task.isVirtual) as T[];
  const templateTask = findTemplateTaskForSeries(baseTasks, targetSeries);
  if (!templateTask) {
    return { nextTasks: taskList, touched: false, handled: false };
  }

  const records = await loadRepeatRecords();
  const recordMap = buildRepeatRecordMap(records);
  const range = getMaterializeRange(options);
  const alignedTemplateTask = {
    ...templateTask,
    isVirtual: false,
    repeatSeriesId: targetSeries.id,
    repeatFrequency: targetSeries.frequency,
    repeatInstanceDate: undefined,
    startDate: targetSeries.startDate,
    dueDate: targetSeries.endDate,
    startTime: targetSeries.startTime,
    dueTime: targetSeries.dueTime,
    status: templateTask.status === 'pending' ? 'in-progress' as const : templateTask.status
  } as T;
  const templateChanged = (
    templateTask.repeatSeriesId !== alignedTemplateTask.repeatSeriesId
    || templateTask.repeatFrequency !== alignedTemplateTask.repeatFrequency
    || !!templateTask.isVirtual
    || templateTask.repeatInstanceDate !== alignedTemplateTask.repeatInstanceDate
    || templateTask.startDate !== alignedTemplateTask.startDate
    || templateTask.dueDate !== alignedTemplateTask.dueDate
    || templateTask.startTime !== alignedTemplateTask.startTime
    || templateTask.dueTime !== alignedTemplateTask.dueTime
  );
  const rebuiltVirtualTasks = buildVirtualTasksForSeries(
    targetSeries,
    alignedTemplateTask,
    recordMap,
    range,
    options.includeTemplateDate === true
  );

  let touched = templateChanged || rebuiltVirtualTasks.length > 0;
  const retainedTasks = taskList.filter((task) => {
    const shouldDrop = !!task.isVirtual && task.repeatSeriesId === seriesId;
    if (shouldDrop) {
      touched = true;
    }
    return !shouldDrop;
  }).map((task) => (
    task.id === templateTask.id
      ? alignedTemplateTask
      : task
  )) as T[];

  return {
    nextTasks: [...retainedTasks, ...rebuiltVirtualTasks],
    touched,
    handled: true
  };
}
