import { usePlugin } from '@/main';
import { eventBus, Events } from '@/utils/eventBus';
import { formatDate } from '@/composables/useDateUtils';
import { translate } from '@/composables/useI18n';
import solarLunar from '@/utils/solarLunar.js';
import { enqueueStorageMutation, enqueueStorageMutations } from '@/storageMutationCoordinator';
import { isMissingPluginStorageValue } from '@/utils/pluginStorage';
import { getAutomaticScheduledTaskStatus } from '@/utils/taskStatusAutomation';

export type RepeatFrequency = 'none' | 'daily' | 'weekdays' | 'weekend' | 'weekly' | 'monthly' | 'custom';
type ActiveRepeatFrequency = Exclude<RepeatFrequency, 'none'>;
type RepeatTaskStatus = 'pending' | 'in-progress' | 'delayed' | 'completed' | 'cancelled';
export type RepeatRuleUnit = 'day' | 'week' | 'month' | 'year';
export type RepeatRuleCalendar = 'solar' | 'lunar';

export interface RepeatRule {
  unit: RepeatRuleUnit;
  interval: number;
  weekDays?: number[];
  monthDay?: number;
  monthDays?: number[];
  /** A single monthly task that can be completed anywhere in this day range. */
  windowStartDay?: number;
  windowEndDay?: number;
  yearDays?: string[];
  calendar?: RepeatRuleCalendar;
  monthMode?: 'day-of-month' | 'last-day';
}

export interface RepeatRuleInput {
  frequency: RepeatFrequency;
  rule?: RepeatRule;
  termination?: RepeatTermination;
}

export type RepeatTermination =
  | { type: 'never' }
  | { type: 'date'; date: string }
  | { type: 'count'; count: number };

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
  termination?: RepeatTermination;
  spanDays: number;
  title: string;
  description?: string;
  priority: 'none' | 'high' | 'medium' | 'low';
  tags: string[];
  groupId?: string;
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
  taskId?: string;
  sourceBlockId?: string;
  type: 'standalone' | 'block';
  title: string;
  status: RepeatTaskStatus;
  priority: 'none' | 'high' | 'medium' | 'low';
  dueDate?: string;
  startDate?: string;
  dueTime?: string;
  startTime?: string;
  tags: string[];
  groupId?: string;
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
  isRepeatWindow?: boolean;
}

export interface RepeatMaterializeOptions {
  pastDays?: number;
  futureDays?: number;
  startDate?: string;
  endDate?: string;
  includeTemplateDate?: boolean;
  filterBaseTasksToRange?: boolean;
  /** Include completed instances whose completion date is in range, even if their instance date is not. */
  includeCompletedOutsideRange?: boolean;
}

let repeatSeriesCache: { value: RepeatSeries[]; timestamp: number } | null = null;
let repeatRecordsCache: { value: RepeatRecord[]; timestamp: number } | null = null;

type StorageLoadResult<T> =
  | { status: 'missing' }
  | { status: 'loaded'; value: T };

class RepeatStorageError extends Error {
  readonly file: string;
  readonly operation: 'read' | 'parse' | 'write';
  readonly originalError?: unknown;

  constructor(
    file: string,
    operation: 'read' | 'parse' | 'write',
    message: string,
    originalError?: unknown
  ) {
    super(`[RepeatRepository] ${operation} failed for ${file}: ${message}`);
    this.name = 'RepeatStorageError';
    this.file = file;
    this.operation = operation;
    this.originalError = originalError;
  }
}

function serializeStorageMutation<T>(file: string, mutation: () => Promise<T>): Promise<T> {
  return enqueueStorageMutation(file, mutation);
}

function serializeStorageMutations<T>(files: string[], mutation: () => Promise<T>): Promise<T> {
  return enqueueStorageMutations(files, mutation);
}

function cloneRepeatSeries(series: RepeatSeries): RepeatSeries {
  return {
    ...series,
    rule: series.rule
      ? {
        ...series.rule,
        weekDays: series.rule.weekDays ? [...series.rule.weekDays] : undefined,
        monthDays: series.rule.monthDays ? [...series.rule.monthDays] : undefined,
        yearDays: series.rule.yearDays ? [...series.rule.yearDays] : undefined
      }
      : undefined,
    termination: series.termination ? { ...series.termination } : undefined,
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

function normalizeMonthDays(days: unknown, max = 31): number[] | undefined {
  if (!Array.isArray(days)) return undefined;
  const normalized = Array.from(new Set(
    days
      .map(day => Number(day))
      .filter(day => Number.isInteger(day) && day >= 1 && day <= max)
  )).sort((a, b) => a - b);
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeYearDays(days: unknown): string[] | undefined {
  if (!Array.isArray(days)) return undefined;
  const normalized = Array.from(new Set(
    days
      .map(day => typeof day === 'string' ? day.trim() : '')
      .filter(day => /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(day))
  )).sort();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeRepeatRule(raw: unknown): RepeatRule | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const item = raw as Partial<RepeatRule>;
  const unit = item.unit === 'day' || item.unit === 'week' || item.unit === 'month' || item.unit === 'year'
    ? item.unit
    : undefined;
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
    rule.monthDays = normalizeMonthDays(item.monthDays, item.calendar === 'lunar' ? 30 : 31);
    const windowStartDay = normalizeMonthDay(item.windowStartDay);
    const windowEndDay = normalizeMonthDay(item.windowEndDay);
    if (windowStartDay && windowEndDay && windowEndDay >= windowStartDay) {
      rule.windowStartDay = windowStartDay;
      rule.windowEndDay = windowEndDay;
      // A window is one occurrence, not a collection of daily occurrences.
      rule.monthDays = undefined;
      rule.monthDay = windowStartDay;
    }
    rule.calendar = item.calendar === 'lunar' ? 'lunar' : 'solar';
  }

  if (unit === 'year') {
    rule.calendar = item.calendar === 'lunar' ? 'lunar' : 'solar';
    rule.yearDays = normalizeYearDays(item.yearDays);
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
): { frequency: RepeatFrequency; rule?: RepeatRule; termination?: RepeatTermination } {
  if (typeof input === 'string') {
    return { frequency: input };
  }
  return {
    frequency: input.frequency,
    rule: normalizeRepeatRule(input.rule),
    termination: normalizeRepeatTermination(input.termination)
  };
}

function normalizeRepeatTermination(raw: unknown): RepeatTermination | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const item = raw as Partial<RepeatTermination>;
  if (item.type === 'never') return { type: 'never' };
  if (item.type === 'date') {
    const date = parseDate(typeof item.date === 'string' ? item.date : undefined);
    return date ? { type: 'date', date: formatDate(date) } : undefined;
  }
  if (item.type === 'count') {
    const count = Number(item.count);
    return Number.isInteger(count) && count > 0 ? { type: 'count', count: Math.min(9999, count) } : undefined;
  }
  return undefined;
}

function getSeriesTerminationDate(series: RepeatSeries): Date | null {
  if (series.termination) {
    return series.termination.type === 'date'
      ? parseDate(series.termination.date)
      : null;
  }
  return parseDate(series.endDate);
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

/**
 * Virtual instances used to be identified only by `isVirtual`. A stale date
 * broadcast could temporarily overwrite that flag, leaving old instances in
 * the base-task snapshot. Their generated id remains stable, so use it as a
 * second identity signal while rebuilding a series.
 */
function isVirtualRepeatInstance(task: RepeatTaskLike): boolean {
  if (task.isVirtual === true) {
    return true;
  }
  const seriesId = typeof task.repeatSeriesId === 'string' ? task.repeatSeriesId.trim() : '';
  const instanceDate = typeof task.repeatInstanceDate === 'string' ? task.repeatInstanceDate.trim() : '';
  if (!seriesId) {
    return false;
  }
  // Also recognize cards produced before the virtual flag/date was
  // accidentally overwritten by a template broadcast.
  if (typeof task.id === 'string' && task.id.startsWith(`repeat_${seriesId}_`)) {
    return true;
  }
  return !!instanceDate && task.id === buildVirtualTaskId(seriesId, instanceDate);
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
  includeTemplateDate = false,
  includeRecordedDate = false
): T[] {
  const seriesEndDate = getSeriesTerminationDate(series);
  const effectiveRangeEnd = seriesEndDate || range.end;
  if (effectiveRangeEnd.getTime() < range.start.getTime()) {
    return [];
  }

  const virtualTasks: T[] = [];
  const cursor = new Date(range.start);
  while (cursor <= effectiveRangeEnd) {
    if (!matchesSeriesDate(series, cursor) && !includeRecordedDate) {
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

    const templateTitle = typeof templateTask.title === 'string' ? templateTask.title : '';
    const templateDescription = typeof templateTask.description === 'string' ? templateTask.description : '';
    const templatePriority = (
      templateTask.priority === 'high'
      || templateTask.priority === 'medium'
      || templateTask.priority === 'low'
      || templateTask.priority === 'none'
    ) ? templateTask.priority : undefined;
    const templateTags = Array.isArray(templateTask.tags) ? [...templateTask.tags] : [];
    const templateGroupId = typeof templateTask.groupId === 'string' && templateTask.groupId.trim()
      ? templateTask.groupId.trim()
      : (typeof series.groupId === 'string' && series.groupId.trim()
        ? series.groupId.trim()
        : (Array.isArray(series.tags) ? series.tags.find(tag => typeof tag === 'string' && tag.trim())?.trim() : undefined));

    const isRepeatWindow = series.rule?.unit === 'month'
      && !!series.rule.windowStartDay
      && !!series.rule.windowEndDay;
    const instanceDueDate = isRepeatWindow ? (() => {
      const due = new Date(cursor);
      due.setDate(due.getDate() + (series.rule!.windowEndDay! - series.rule!.windowStartDay!));
      return formatDate(due);
    })() : instanceDate;
    const status = record?.status || getAutomaticScheduledTaskStatus({
      startDate: instanceDate,
      dueDate: instanceDueDate,
      startTime: series.startTime || templateTask.startTime,
      dueTime: series.dueTime || templateTask.dueTime
    });
    virtualTasks.push({
      ...templateTask,
      id: buildVirtualTaskId(series.id, instanceDate),
      taskId: templateTask.taskId || templateTask.id,
      sourceBlockId: templateTask.sourceBlockId || templateTask.blockId || series.templateBlockId,
      isVirtual: true,
      isRepeatWindow,
      repeatSeriesId: series.id,
      repeatFrequency: series.frequency,
      repeatInstanceDate: instanceDate,
      status,
      startDate: instanceDate,
      dueDate: instanceDueDate,
      startTime: series.startTime || templateTask.startTime,
      dueTime: series.dueTime || templateTask.dueTime,
      // Keep virtual instances aligned with latest template edits (title/priority/description/tags).
      title: templateTitle || series.title || '\u91cd\u590d\u4efb\u52a1',
      description: templateDescription,
      priority: templatePriority || series.priority || 'none',
      tags: templateTags.length > 0 ? templateTags : [...series.tags],
      groupId: templateGroupId,
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

function isCompletionInRange(record: RepeatRecord, range: { start: Date; end: Date }): boolean {
  if (record.status !== 'completed' || !record.completedAt) return false;
  const completedAt = new Date(record.completedAt);
  if (Number.isNaN(completedAt.getTime())) return false;
  const completedDate = new Date(completedAt.getFullYear(), completedAt.getMonth(), completedAt.getDate());
  return completedDate.getTime() >= range.start.getTime() && completedDate.getTime() <= range.end.getTime();
}

function matchesSeriesDate(series: RepeatSeries, date: Date): boolean {
  const start = parseDate(series.startDate);
  if (!start) return false;
  if (date < start) return false;
  const end = getSeriesTerminationDate(series);
  if (end && date > end) return false;

  if (!matchesSeriesScheduleDate(series, start, date)) return false;

  if (series.termination?.type !== 'count') return true;
  let occurrences = 0;
  const cursor = new Date(start);
  while (cursor <= date) {
    if (matchesSeriesScheduleDate(series, start, cursor)) {
      occurrences += 1;
      if (occurrences > series.termination.count) return false;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return true;
}

function matchesSeriesScheduleDate(series: RepeatSeries, start: Date, date: Date): boolean {
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

  if (rule.unit === 'year') {
    const yearDiff = date.getFullYear() - start.getFullYear();
    if (yearDiff < 0 || yearDiff % interval !== 0) return false;
    const dateParts = getRepeatRuleDateParts(rule, date);
    return !!dateParts
      && !dateParts.isLeap
      && !!rule.yearDays?.includes(dateParts.monthDay);
  }

  const monthDiff = (date.getFullYear() - start.getFullYear()) * 12 + (date.getMonth() - start.getMonth());
  if (monthDiff < 0 || monthDiff % interval !== 0) return false;

  const dateParts = getRepeatRuleDateParts(rule, date);
  if (!dateParts) return false;
  if (rule.windowStartDay && rule.windowEndDay) {
    return dateParts.dayOfMonth === rule.windowStartDay;
  }
  if (rule.monthDays?.length) {
    return rule.monthDays.includes(dateParts.dayOfMonth);
  }

  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  if (rule.monthMode === 'last-day') {
    return date.getDate() === lastDay;
  }

  const expectedDay = Math.min(rule.monthDay || start.getDate(), lastDay);
  return date.getDate() === expectedDay;
}

function getRepeatRuleDateParts(rule: RepeatRule, date: Date): {
  dayOfMonth: number;
  monthDay: string;
  isLeap: boolean;
} | null {
  if (rule.calendar !== 'lunar') {
    return {
      dayOfMonth: date.getDate(),
      monthDay: `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      isLeap: false
    };
  }
  const lunar = solarLunar.solar2lunar(date.getFullYear(), date.getMonth() + 1, date.getDate());
  if (lunar === -1) return null;
  return {
    dayOfMonth: lunar.lDay,
    monthDay: `${String(lunar.lMonth).padStart(2, '0')}-${String(lunar.lDay).padStart(2, '0')}`,
    isLeap: lunar.isLeap === true
  };
}

async function loadData<T>(file: string): Promise<StorageLoadResult<T>> {
  const plugin = usePlugin();
  if (!plugin) {
    throw new RepeatStorageError(file, 'read', 'plugin is not initialized');
  }

  let data: unknown;
  try {
    data = await plugin.loadData(file);
  } catch (error) {
    throw new RepeatStorageError(file, 'read', 'storage read rejected', error);
  }

  if (isMissingPluginStorageValue(data)) {
    return { status: 'missing' };
  }

  if (typeof data === 'string') {
    try {
      return { status: 'loaded', value: JSON.parse(data) as T };
    } catch (error) {
      throw new RepeatStorageError(file, 'parse', 'invalid JSON', error);
    }
  }

  return { status: 'loaded', value: data as T };
}

async function saveData(file: string, value: unknown): Promise<void> {
  const plugin = usePlugin();
  if (!plugin) {
    throw new RepeatStorageError(file, 'write', 'plugin is not initialized');
  }
  try {
    await plugin.saveData(file, value);
  } catch (error) {
    throw new RepeatStorageError(file, 'write', 'storage write rejected', error);
  }
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
  const isMonthlyWindow = normalizedRule.unit === 'month'
    && !!normalizedRule.windowStartDay
    && !!normalizedRule.windowEndDay;
  let normalizedEndDate: string | undefined;
  if (rawEndDate && rawEndDate.getTime() > startDate.getTime()) {
    normalizedEndDate = formatDate(rawEndDate);
  } else if (normalizedSpanDays > 0 && !isMonthlyWindow) {
    const derivedEnd = new Date(startDate);
    derivedEnd.setDate(derivedEnd.getDate() + normalizedSpanDays);
    normalizedEndDate = formatDate(derivedEnd);
  }
  const normalizedTermination = normalizeRepeatTermination(item.termination)
    || (isMonthlyWindow
      ? { type: 'never' as const }
      : (normalizedEndDate ? { type: 'date' as const, date: normalizedEndDate } : { type: 'never' as const }));

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
    termination: normalizedTermination,
    spanDays: normalizedSpanDays,
    title: typeof item.title === 'string' && item.title.trim() ? item.title.trim() : translate('taskCard.repeatTask', 'Recurring task'),
    description: typeof item.description === 'string' ? item.description : '',
    priority: item.priority === 'high' || item.priority === 'medium' || item.priority === 'low' ? item.priority : 'none',
    tags: Array.isArray(item.tags) ? item.tags.filter((tag) => typeof tag === 'string') : [],
    groupId: typeof item.groupId === 'string' && item.groupId.trim()
      ? item.groupId.trim()
      : undefined,
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

  try {
    return cloneRepeatSeriesList(await readRepeatSeriesFromStorage());
  } catch (error) {
    if (repeatSeriesCache) {
      return cloneRepeatSeriesList(repeatSeriesCache.value);
    }
    throw error;
  }
}

async function readRepeatSeriesFromStorage(): Promise<RepeatSeries[]> {
  const result = await loadData<unknown>(REPEAT_SERIES_FILE);
  if (result.status === 'missing') {
    repeatSeriesCache = { value: [], timestamp: Date.now() };
    return [];
  }

  if (!Array.isArray(result.value)) {
    throw new RepeatStorageError(REPEAT_SERIES_FILE, 'parse', 'expected an array');
  }

  const normalizedItems = result.value.map(normalizeSeries);
  if (normalizedItems.some((item) => item === null)) {
    throw new RepeatStorageError(REPEAT_SERIES_FILE, 'parse', 'contains an invalid repeat series');
  }
  const normalized = normalizedItems as RepeatSeries[];
  repeatSeriesCache = {
    value: cloneRepeatSeriesList(normalized),
    timestamp: Date.now()
  };
  return normalized;
}

async function persistRepeatSeries(series: RepeatSeries[]): Promise<void> {
  await saveData(REPEAT_SERIES_FILE, series);
  repeatSeriesCache = {
    value: cloneRepeatSeriesList(series),
    timestamp: Date.now()
  };
}

export async function saveRepeatSeries(series: RepeatSeries[]): Promise<void> {
  const snapshot = cloneRepeatSeriesList(series);
  await serializeStorageMutation(REPEAT_SERIES_FILE, async () => {
    await readRepeatSeriesFromStorage();
    await persistRepeatSeries(snapshot);
  });
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
  return serializeStorageMutation(REPEAT_SERIES_FILE, async () => {
    const seriesList = await readRepeatSeriesFromStorage();
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
      // Recurrence materialization prioritizes termination.date over endDate.
      // Keep both representations aligned when the task editor changes its due
      // date; otherwise an old termination date keeps producing occurrences
      // after the newly selected deadline.
      termination: normalizedEnd
        ? { type: 'date', date: normalizedEnd }
        : (series.termination?.type === 'date' ? { type: 'never' } : series.termination),
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

    await persistRepeatSeries(seriesList);
    if (options.emitChange !== false) {
      emitRepeatChanged({
        blockId: updated.templateBlockId,
        seriesId: updated.id,
        frequency: updated.frequency
      });
    }

    return updated;
  });
}

export async function updateRepeatSeriesBackgroundColor(
  task: Pick<RepeatTaskLike, 'id' | 'blockId' | 'repeatSeriesId'>,
  backgroundColor?: string,
  options: {
    emitChange?: boolean;
  } = {}
): Promise<RepeatSeries | null> {
  return serializeStorageMutation(REPEAT_SERIES_FILE, async () => {
    const seriesList = await readRepeatSeriesFromStorage();
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

    await persistRepeatSeries(seriesList);

    if (options.emitChange !== false) {
      emitRepeatChanged({
        blockId: updated.templateBlockId,
        seriesId: updated.id,
        frequency: updated.frequency
      });
    }

    return updated;
  });
}

export async function loadRepeatRecords(): Promise<RepeatRecord[]> {
  if (repeatRecordsCache && isRepeatCacheFresh(repeatRecordsCache.timestamp)) {
    return cloneRepeatRecords(repeatRecordsCache.value);
  }

  try {
    return cloneRepeatRecords(await readRepeatRecordsFromStorage());
  } catch (error) {
    if (repeatRecordsCache) {
      return cloneRepeatRecords(repeatRecordsCache.value);
    }
    throw error;
  }
}

async function readRepeatRecordsFromStorage(): Promise<RepeatRecord[]> {
  const result = await loadData<unknown>(REPEAT_RECORDS_FILE);
  if (result.status === 'missing') {
    repeatRecordsCache = { value: [], timestamp: Date.now() };
    return [];
  }

  if (!Array.isArray(result.value)) {
    throw new RepeatStorageError(REPEAT_RECORDS_FILE, 'parse', 'expected an array');
  }

  const normalizedItems = result.value.map(normalizeRecord);
  if (normalizedItems.some((item) => item === null)) {
    throw new RepeatStorageError(REPEAT_RECORDS_FILE, 'parse', 'contains an invalid repeat record');
  }
  const normalized = normalizedItems as RepeatRecord[];
  repeatRecordsCache = {
    value: cloneRepeatRecords(normalized),
    timestamp: Date.now()
  };
  return normalized;
}

async function persistRepeatRecords(records: RepeatRecord[]): Promise<void> {
  await saveData(REPEAT_RECORDS_FILE, records);
  repeatRecordsCache = {
    value: cloneRepeatRecords(records),
    timestamp: Date.now()
  };
}

export async function saveRepeatRecords(records: RepeatRecord[]): Promise<void> {
  const snapshot = cloneRepeatRecords(records);
  await serializeStorageMutation(REPEAT_RECORDS_FILE, async () => {
    await readRepeatRecordsFromStorage();
    await persistRepeatRecords(snapshot);
  });
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
  templateUpdates?: Record<string, unknown>;
} = {}): void {
  eventBus.emit(Events.TASK_ADDED, {
    reason: 'repeat-changed',
    blockId: payload.blockId,
    seriesId: payload.seriesId,
    frequency: payload.frequency,
    templateUpdates: payload.templateUpdates
  });
}

export function notifyRepeatChanged(payload: {
  blockId?: string;
  seriesId?: string;
  frequency?: RepeatFrequency;
  templateUpdates?: Record<string, unknown>;
} = {}): void {
  emitRepeatChanged(payload);
}

export async function setTaskRepeatSeries(
  task: RepeatTaskLike,
  repeat: RepeatFrequency | RepeatRuleInput,
  options: { emitChange?: boolean } = {}
): Promise<RepeatSeries | null> {
  const normalizedRepeat = normalizeRepeatRuleInput(repeat);
  const storageKeys = normalizedRepeat.frequency === 'none'
    ? [REPEAT_SERIES_FILE, REPEAT_RECORDS_FILE]
    : [REPEAT_SERIES_FILE];
  return serializeStorageMutations(
    storageKeys,
    () => setTaskRepeatSeriesUnlocked(task, normalizedRepeat, options)
  );
}

async function setTaskRepeatSeriesUnlocked(
  task: RepeatTaskLike,
  normalizedRepeat: ReturnType<typeof normalizeRepeatRuleInput>,
  options: { emitChange?: boolean }
): Promise<RepeatSeries | null> {
  const { frequency, rule, termination } = normalizedRepeat;
  const seriesList = await readRepeatSeriesFromStorage();
  const existing = findSeriesForTask(seriesList, task);

  if (frequency === 'none') {
    const matchingSeries = seriesList
      .filter((series) =>
        series.id === task.repeatSeriesId
        || series.templateTaskId === task.id
        || (!!task.blockId && series.templateBlockId === task.blockId)
      );
    const requestedSeriesId = typeof task.repeatSeriesId === 'string'
      ? task.repeatSeriesId.trim()
      : '';
    const removedSeriesIds = Array.from(new Set([
      ...matchingSeries.map((series) => series.id),
      ...(requestedSeriesId ? [requestedSeriesId] : [])
    ]));

    if (removedSeriesIds.length === 0) {
      return null;
    }

    const nextSeries = seriesList.filter((series) => !removedSeriesIds.includes(series.id));
    const records = await readRepeatRecordsFromStorage();
    const nextRecords = records.filter((record) => !removedSeriesIds.includes(record.seriesId));
    const seriesChanged = nextSeries.length !== seriesList.length;
    const recordsChanged = nextRecords.length !== records.length;
    if (!seriesChanged && !recordsChanged) {
      return null;
    }

    // Commit the authoritative series deletion first. If record cleanup fails,
    // orphaned records cannot materialize and are safer than an active series
    // whose instance state was already deleted. A retry carrying repeatSeriesId
    // can still identify and remove those orphaned records.
    if (seriesChanged) {
      await persistRepeatSeries(nextSeries);
    }
    if (recordsChanged) {
      await persistRepeatRecords(nextRecords);
    }
    const fallbackBlockId =
      task.blockId
      || existing?.templateBlockId
      || matchingSeries[0]?.templateBlockId;
    if (options.emitChange !== false) {
      emitRepeatChanged({
        blockId: fallbackBlockId,
        seriesId: existing?.id || removedSeriesIds[0],
        frequency: 'none'
      });
    }
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
  const isMonthlyWindow = nextRule.unit === 'month' && !!nextRule.windowStartDay && !!nextRule.windowEndDay;
  const nextTermination = termination || existing?.termination || (!isMonthlyWindow && normalizedEndDate
    ? { type: 'date' as const, date: normalizedEndDate }
    : (!isMonthlyWindow && existing?.endDate ? { type: 'date' as const, date: existing.endDate } : { type: 'never' as const }));
  const terminationEndDate = nextTermination.type === 'date' ? nextTermination.date : undefined;
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
    // `endDate` is the recurrence cutoff. A task's duration lives in spanDays.
    endDate: task.isVirtual ? existing?.endDate : terminationEndDate,
    termination: nextTermination,
    spanDays: isMonthlyWindow
      ? nextRule.windowEndDay! - nextRule.windowStartDay!
      : calculateSpanDays(task),
    title: task.title || existing?.title || translate('taskCard.repeatTask', 'Recurring task'),
    description: task.description || '',
    priority: task.priority || existing?.priority || 'none',
    tags: Array.isArray(task.tags) ? [...task.tags] : [],
    groupId: typeof task.groupId === 'string' && task.groupId.trim()
      ? task.groupId.trim()
      : existing?.groupId,
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

  await persistRepeatSeries(seriesList);
  if (options.emitChange !== false) {
    emitRepeatChanged({
      blockId: task.blockId || existing?.templateBlockId,
      seriesId: nextSeries.id,
      frequency
    });
  }
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

export async function setRepeatInstanceStatus(seriesId: string, date: string, status: RepeatTaskStatus): Promise<string> {
  const normalizedDate = parseDate(date);
  if (!seriesId || !normalizedDate) return '';

  let series: RepeatSeries | undefined;
  try {
    const seriesList = await loadRepeatSeries();
    series = seriesList.find((item) => item.id === seriesId);
  } catch {
    // Series metadata is only used to enrich the change event. Record storage
    // remains authoritative for this mutation and must fail independently.
  }

  return serializeStorageMutation(REPEAT_RECORDS_FILE, async () => {
    const targetDate = formatDate(normalizedDate);
    const key = buildRecordKey(seriesId, targetDate);
    const records = await readRepeatRecordsFromStorage();
    const index = records.findIndex((record) => record.key === key);

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

    await persistRepeatRecords(records);
    emitRepeatChanged({
      blockId: series?.templateBlockId,
      seriesId: seriesId,
      frequency: series?.frequency
    });
    return next.completedAt || '';
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
  const virtualTaskIds = new Set<string>();
  const appendVirtualTasks = (tasks: T[]): void => {
    for (const task of tasks) {
      if (virtualTaskIds.has(task.id)) continue;
      virtualTaskIds.add(task.id);
      virtualTasks.push(task);
    }
  };

  for (const series of seriesList) {
    const templateTask = taskMapById.get(series.templateTaskId)
      || (series.templateBlockId ? taskMapByBlockId.get(series.templateBlockId) : undefined);
    if (!templateTask) continue;
    appendVirtualTasks(buildVirtualTasksForSeries(
      series,
      templateTask,
      recordMap,
      range,
      options.includeTemplateDate === true
    ));

    if (options.includeCompletedOutsideRange !== true) continue;
    for (const record of records) {
      if (record.seriesId !== series.id || !isCompletionInRange(record, range)) continue;
      const instanceDate = parseDate(record.date);
      if (!instanceDate) continue;
      appendVirtualTasks(buildVirtualTasksForSeries(
        series,
        templateTask,
        recordMap,
        { start: instanceDate, end: instanceDate },
        true,
        true
      ));
    }
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

  const baseTasks = taskList.filter((task) => !isVirtualRepeatInstance(task)) as T[];
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
    dueDate: targetSeries.spanDays > 0
      ? formatDate(new Date(parseDate(targetSeries.startDate)!.getFullYear(), parseDate(targetSeries.startDate)!.getMonth(), parseDate(targetSeries.startDate)!.getDate() + targetSeries.spanDays))
      : targetSeries.startDate,
    startTime: targetSeries.startTime,
    dueTime: targetSeries.dueTime,
    status: templateTask.status
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
    const shouldDrop = isVirtualRepeatInstance(task) && task.repeatSeriesId === seriesId;
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
