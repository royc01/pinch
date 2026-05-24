export type SupportedTaskDateLocale = 'en_US' | 'zh_CN';

export interface InferTaskDateFromTextOptions {
  locale?: unknown;
  now?: Date;
  keywords?: TaskDateKeywordConfig;
}

export interface TaskDateKeywordConfig {
  start?: readonly string[];
  due?: readonly string[];
  range?: readonly string[];
  englishRange?: readonly string[];
  morning?: readonly string[];
  noon?: readonly string[];
  afternoon?: readonly string[];
}

export interface InferredTaskDateRange {
  startDate?: string;
  dueDate?: string;
  startTime?: string;
  dueTime?: string;
}

interface NormalizedTaskDateText {
  compact: string;
  compactLower: string;
  spacedLower: string;
}

const ENGLISH_MONTH_MAP: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const ENGLISH_WEEKDAY_MAP: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
  weekend: 6,
};

const CHINESE_WEEKDAY_MAP: Record<string, number> = {
  '1': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 0,
  '一': 1,
  '二': 2,
  '三': 3,
  '四': 4,
  '五': 5,
  '六': 6,
  '日': 0,
  '天': 0,
  '末': 6,
};

const TASK_DATE_KEYWORDS = {
  start: ['starting', 'start', 'from', '从', '自', '开始', '起始', '启动', '起'],
  due: ['deadline', 'due', 'by', '截止', '截至', '到期', '之前', '前'],
  range: ['到', '至', '-', '~', '～'],
  englishRange: ['to', 'until', 'through', 'thru'],
  morning: ['凌晨', '早上', '上午', 'am'],
  noon: ['中午'],
  afternoon: ['下午', '傍晚', '晚上', 'pm'],
} as const;

type TaskDateKeywordKey = keyof typeof TASK_DATE_KEYWORDS;
type ResolvedTaskDateKeywords = Record<TaskDateKeywordKey, string[]>;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildKeywordPattern(keywords: readonly string[]): string {
  return [...keywords]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|');
}

function normalizeCustomKeywords(values: readonly string[] | undefined, minLength: number): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .filter((value): value is string => typeof value === 'string')
    .map(value => value.trim())
    .filter(value => value.length >= minLength);
}

function mergeKeywords(
  defaults: readonly string[],
  custom: readonly string[] | undefined,
  minCustomLength = 2,
): string[] {
  const merged = [...defaults, ...normalizeCustomKeywords(custom, minCustomLength)];
  const seen = new Set<string>();
  return merged.filter((keyword) => {
    const key = keyword.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function resolveTaskDateKeywords(config?: TaskDateKeywordConfig): ResolvedTaskDateKeywords {
  return {
    start: mergeKeywords(TASK_DATE_KEYWORDS.start, config?.start),
    due: mergeKeywords(TASK_DATE_KEYWORDS.due, config?.due),
    range: mergeKeywords(TASK_DATE_KEYWORDS.range, config?.range, 1),
    englishRange: mergeKeywords(TASK_DATE_KEYWORDS.englishRange, config?.englishRange, 1),
    morning: mergeKeywords(TASK_DATE_KEYWORDS.morning, config?.morning),
    noon: mergeKeywords(TASK_DATE_KEYWORDS.noon, config?.noon),
    afternoon: mergeKeywords(TASK_DATE_KEYWORDS.afternoon, config?.afternoon),
  };
}

function getTaskDateKeywords(options?: InferTaskDateFromTextOptions): ResolvedTaskDateKeywords {
  return resolveTaskDateKeywords(options?.keywords);
}

function getTaskDateKeywordPatterns(options?: InferTaskDateFromTextOptions): {
  start: string;
  due: string;
  timePeriod: string;
  chineseTimePeriod: string;
  englishRange: string;
  morning: string;
  afternoon: string;
} {
  const keywords = getTaskDateKeywords(options);
  return {
    start: buildKeywordPattern(keywords.start),
    due: buildKeywordPattern(keywords.due),
    timePeriod: buildKeywordPattern([
      ...keywords.morning,
      ...keywords.noon,
      ...keywords.afternoon,
    ]),
    chineseTimePeriod: buildKeywordPattern([
      ...keywords.morning.filter(keyword => keyword.toLowerCase() !== 'am'),
      ...keywords.noon,
      ...keywords.afternoon.filter(keyword => keyword.toLowerCase() !== 'pm'),
    ]),
    englishRange: buildKeywordPattern(keywords.englishRange),
    morning: buildKeywordPattern(keywords.morning),
    afternoon: buildKeywordPattern([
      ...keywords.noon,
      ...keywords.afternoon,
    ]),
  };
}

function normalizeTaskDateLocale(locale: unknown): SupportedTaskDateLocale {
  if (typeof locale !== 'string' || locale.trim().length === 0) {
    return 'zh_CN';
  }

  const normalized = locale.replace('-', '_').toLowerCase();
  if (normalized.startsWith('en')) {
    return 'en_US';
  }
  if (normalized.startsWith('zh')) {
    return 'zh_CN';
  }
  return 'zh_CN';
}

function getTaskDateLocaleOrder(locale: unknown): SupportedTaskDateLocale[] {
  const preferred = normalizeTaskDateLocale(locale);
  if (preferred === 'en_US') {
    return ['en_US', 'zh_CN'];
  }
  return ['zh_CN', 'en_US'];
}

function normalizeTaskDateText(title: string): NormalizedTaskDateText {
  const normalized = (title || '')
    .trim()
    .replace(/[０-９]/g, char => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
    .replace(/／/g, '/')
    .replace(/[－—–]/g, '-')
    .replace(/．/g, '.');

  return {
    compact: normalized.replace(/\s+/g, ''),
    compactLower: normalized.replace(/\s+/g, '').toLowerCase(),
    spacedLower: normalized.replace(/\s+/g, ' ').trim().toLowerCase(),
  };
}

function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildRelativeDate(now: Date, days: number): string {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return formatDateString(date);
}

function buildValidDateString(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const candidate = new Date(year, month - 1, day);
  if (
    candidate.getFullYear() !== year
    || candidate.getMonth() !== month - 1
    || candidate.getDate() !== day
  ) {
    return null;
  }

  return formatDateString(candidate);
}

function compareDateString(a: string, b: string): number {
  return a.localeCompare(b);
}

function parseDateString(dateStr: string): Date | null {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function addDaysToDateString(dateStr: string, days: number): string {
  const date = parseDateString(dateStr);
  if (!date) {
    return dateStr;
  }
  date.setDate(date.getDate() + days);
  return formatDateString(date);
}

function moveDueDateAfterStart(startDate: string, dueDate: string): string {
  let resolvedDueDate = dueDate;
  while (compareDateString(resolvedDueDate, startDate) < 0) {
    resolvedDueDate = addDaysToDateString(resolvedDueDate, 7);
  }
  return resolvedDueDate;
}

function normalizeTimeString(hour: number, minute: number): string | null {
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return null;
  }
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function applyTimePeriod(hour: number, period: string, options?: InferTaskDateFromTextOptions): number {
  const patterns = getTaskDateKeywordPatterns(options);

  if (new RegExp(patterns.afternoon, 'i').test(period)) {
    return hour < 12 ? hour + 12 : hour;
  }
  if (new RegExp(patterns.morning, 'i').test(period)) {
    return hour === 12 ? 0 : hour;
  }
  return hour;
}

function inferTaskTimeFromText(title: string, options?: InferTaskDateFromTextOptions): string | null {
  const patterns = getTaskDateKeywordPatterns(options);
  const normalized = (title || '')
    .replace(/[０-９]/g, char => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
    .replace(/：/g, ':')
    .toLowerCase();

  const colonMatch = normalized.match(new RegExp(`(${patterns.timePeriod})?\\s*(2[0-3]|[01]?\\d)\\s*:\\s*([0-5]\\d)\\s*(am|pm)?`, 'i'));
  if (colonMatch) {
    const period = `${colonMatch[1] || ''}${colonMatch[4] || ''}`;
    return normalizeTimeString(applyTimePeriod(Number(colonMatch[2]), period, options), Number(colonMatch[3]));
  }

  const chineseHourMatch = normalized.match(new RegExp(`(${patterns.chineseTimePeriod})?\\s*(2[0-3]|[01]?\\d)\\s*[点時时](半|[0-5]?\\d分?)?`));
  if (chineseHourMatch) {
    const rawMinute = chineseHourMatch[3] || '';
    const minute = rawMinute === '半'
      ? 30
      : rawMinute
        ? Number(rawMinute.replace('分', ''))
        : 0;
    return normalizeTimeString(applyTimePeriod(Number(chineseHourMatch[2]), chineseHourMatch[1] || '', options), minute);
  }

  const englishAmPmMatch = normalized.match(/(?:^|[^a-z\d])(1[0-2]|0?[1-9])(?:\s*(?::)\s*([0-5]\d))?\s*(am|pm)(?![a-z])/i);
  if (englishAmPmMatch) {
    return normalizeTimeString(
      applyTimePeriod(Number(englishAmPmMatch[1]), englishAmPmMatch[3], options),
      englishAmPmMatch[2] ? Number(englishAmPmMatch[2]) : 0,
    );
  }

  return null;
}

function stripTaskTimeText(title: string, options?: InferTaskDateFromTextOptions): string {
  const patterns = getTaskDateKeywordPatterns(options);
  return (title || '')
    .replace(new RegExp(`(${patterns.timePeriod})?\\s*(2[0-3]|[01]?\\d)\\s*[：:]\\s*([0-5]\\d)\\s*(am|pm)?`, 'gi'), '')
    .replace(new RegExp(`(${patterns.chineseTimePeriod})?\\s*(2[0-3]|[01]?\\d)\\s*[点時时](半|[0-5]?\\d分?)?`, 'g'), '')
    .replace(/(?:^|[^a-z\d])(1[0-2]|0?[1-9])(?:\s*(?::)\s*([0-5]\d))?\s*(am|pm)(?![a-z])/gi, '');
}

function resolveWeekdayDate(now: Date, targetWeekday: number, extraWeeks: number = 0): string {
  const currentWeekday = now.getDay();
  let daysUntil = (targetWeekday - currentWeekday + 7) % 7;
  if (daysUntil === 0) {
    daysUntil = 7;
  }
  daysUntil += extraWeeks * 7;
  return buildRelativeDate(now, daysUntil);
}

function getChineseWeekdayOffsetFromMonday(targetWeekday: number): number {
  return targetWeekday === 0 ? 6 : targetWeekday - 1;
}

function resolveChineseWeekdayDate(now: Date, targetWeekday: number, prefix: string): string {
  if (!prefix) {
    return resolveWeekdayDate(now, targetWeekday);
  }

  const currentWeekday = now.getDay();
  const daysSinceMonday = (currentWeekday + 6) % 7;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - daysSinceMonday);

  const weekOffset = prefix === '下下' ? 2 : (prefix === '下' ? 1 : 0);
  monday.setDate(monday.getDate() + weekOffset * 7 + getChineseWeekdayOffsetFromMonday(targetWeekday));
  return formatDateString(monday);
}

function parseChineseRelativeDate(text: NormalizedTaskDateText, now: Date): string | null {
  if (text.compact.includes('大后天')) return buildRelativeDate(now, 3);
  if (text.compact.includes('后天')) return buildRelativeDate(now, 2);
  if (text.compact.includes('明天')) return buildRelativeDate(now, 1);
  if (text.compact.includes('今天')) return buildRelativeDate(now, 0);
  return null;
}

function parseEnglishRelativeDate(text: NormalizedTaskDateText, now: Date): string | null {
  if (text.compactLower.includes('dayaftertomorrow') || text.compactLower.includes('overmorrow')) {
    return buildRelativeDate(now, 2);
  }
  if (text.compactLower.includes('tomorrow')) return buildRelativeDate(now, 1);
  if (text.compactLower.includes('today')) return buildRelativeDate(now, 0);
  return null;
}

function parseChineseWeekdayDate(text: NormalizedTaskDateText, now: Date): string | null {
  const weekdayMatch = text.compact.match(
    /(?:^|[^\d])(下下|下|本|这)?(?:周|星期|礼拜)(末|天|日|[1-7]|一|二|三|四|五|六)(?![一二三四五六日天末\d])/
  );
  if (!weekdayMatch) {
    return null;
  }

  const prefix = weekdayMatch[1] || '';
  const weekdayToken = weekdayMatch[2];
  const targetWeekday = CHINESE_WEEKDAY_MAP[weekdayToken];
  if (typeof targetWeekday !== 'number') {
    return null;
  }

  return resolveChineseWeekdayDate(now, targetWeekday, prefix);
}

function parseEnglishWeekdayDate(text: NormalizedTaskDateText, now: Date): string | null {
  const weekdayMatch = text.spacedLower.match(
    /(?:^|[^a-z])(?:(next\s+next|next|this)\s+)?(?:(week)\s+)?(weekend|sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?)(?![a-z])/
  );
  if (!weekdayMatch) {
    return null;
  }

  const prefix = (weekdayMatch[1] || '').replace(/\s+/g, '');
  const hasWeekToken = weekdayMatch[2] === 'week';
  const weekdayToken = weekdayMatch[3];
  const targetWeekday = ENGLISH_WEEKDAY_MAP[weekdayToken];
  if (typeof targetWeekday !== 'number') {
    return null;
  }

  let extraWeeks = 0;
  if (prefix === 'nextnext') {
    extraWeeks = 1;
  } else if (prefix === 'next' && hasWeekToken) {
    extraWeeks = 1;
  }

  return resolveWeekdayDate(now, targetWeekday, extraWeeks);
}

function parseNumericDate(text: NormalizedTaskDateText, now: Date): string | null {
  const fullDateMatch = text.compact.match(
    /(?:^|[^\d])((?:19|20)\d{2})[年\-/.](1[0-2]|0?[1-9])[月\-/.](3[01]|[12]\d|0?[1-9])(?:日|号)?(?!\d)/
  );
  if (fullDateMatch) {
    const parsed = buildValidDateString(
      Number(fullDateMatch[1]),
      Number(fullDateMatch[2]),
      Number(fullDateMatch[3]),
    );
    if (parsed) {
      return parsed;
    }
  }

  const monthDayChineseMatch = text.compact.match(
    /(?:^|[^\d])(1[0-2]|0?[1-9])月(3[01]|[12]\d|0?[1-9])(?:日|号)(?!\d)/
  );
  if (monthDayChineseMatch) {
    const parsed = buildValidDateString(
      now.getFullYear(),
      Number(monthDayChineseMatch[1]),
      Number(monthDayChineseMatch[2]),
    );
    if (parsed) {
      return parsed;
    }
  }

  const monthDaySlashMatch = text.compact.match(
    /(?:^|[^\d])(1[0-2]|0?[1-9])[\/.-](3[01]|[12]\d|0?[1-9])(?!\d)/
  );
  if (monthDaySlashMatch) {
    const parsed = buildValidDateString(
      now.getFullYear(),
      Number(monthDaySlashMatch[1]),
      Number(monthDaySlashMatch[2]),
    );
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

function parseNumericDateFragment(fragment: string, now: Date, fallbackMonth?: number): string | null {
  const normalized = normalizeTaskDateText(fragment).compact;
  if (!normalized) {
    return null;
  }

  const fullDateMatch = normalized.match(
    /^((?:19|20)\d{2})[年\-/.](1[0-2]|0?[1-9])[月\-/.](3[01]|[12]\d|0?[1-9])(?:日|号)?$/
  );
  if (fullDateMatch) {
    return buildValidDateString(
      Number(fullDateMatch[1]),
      Number(fullDateMatch[2]),
      Number(fullDateMatch[3]),
    );
  }

  const monthDayMatch = normalized.match(
    /^(1[0-2]|0?[1-9])(?:月|[\/.])(3[01]|[12]\d|0?[1-9])(?:日|号)?$/
  );
  if (monthDayMatch) {
    return buildValidDateString(
      now.getFullYear(),
      Number(monthDayMatch[1]),
      Number(monthDayMatch[2]),
    );
  }

  const dayOnlyMatch = normalized.match(/^(3[01]|[12]\d|0?[1-9])(?:日|号)?$/);
  if (dayOnlyMatch && fallbackMonth) {
    return buildValidDateString(
      now.getFullYear(),
      fallbackMonth,
      Number(dayOnlyMatch[1]),
    );
  }

  return null;
}

function parseNumericMonth(fragment: string): number | null {
  const normalized = normalizeTaskDateText(fragment).compact;
  const fullDateMatch = normalized.match(/^((?:19|20)\d{2})[年\-/.](1[0-2]|0?[1-9])/);
  if (fullDateMatch) {
    return Number(fullDateMatch[2]);
  }
  const monthDayMatch = normalized.match(/^(1[0-2]|0?[1-9])(?:月|[\/.])/);
  if (monthDayMatch) {
    return Number(monthDayMatch[1]);
  }
  return null;
}

function parseEnglishMonthDate(text: NormalizedTaskDateText, now: Date): string | null {
  const monthFirstMatch = text.spacedLower.match(
    /(?:^|[^a-z])(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*((?:19|20)\d{2}))?(?![a-z\d])/
  );
  if (monthFirstMatch) {
    const month = ENGLISH_MONTH_MAP[monthFirstMatch[1]];
    const day = Number(monthFirstMatch[2]);
    const year = monthFirstMatch[3] ? Number(monthFirstMatch[3]) : now.getFullYear();
    const parsed = buildValidDateString(year, month, day);
    if (parsed) {
      return parsed;
    }
  }

  const dayFirstMatch = text.spacedLower.match(
    /(?:^|[^a-z])(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s*,?\s*((?:19|20)\d{2}))?(?![a-z\d])/
  );
  if (dayFirstMatch) {
    const day = Number(dayFirstMatch[1]);
    const month = ENGLISH_MONTH_MAP[dayFirstMatch[2]];
    const year = dayFirstMatch[3] ? Number(dayFirstMatch[3]) : now.getFullYear();
    const parsed = buildValidDateString(year, month, day);
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

function inferSingleTaskDateFromText(
  title: string,
  options: InferTaskDateFromTextOptions = {},
): string | null {
  const text = normalizeTaskDateText(title);
  if (!text.compact) {
    return null;
  }

  const now = options.now instanceof Date ? options.now : new Date();
  const localeOrder = getTaskDateLocaleOrder(options.locale);

  for (const locale of localeOrder) {
    const relativeDate = locale === 'zh_CN'
      ? parseChineseRelativeDate(text, now)
      : parseEnglishRelativeDate(text, now);
    if (relativeDate) {
      return relativeDate;
    }

    const weekdayDate = locale === 'zh_CN'
      ? parseChineseWeekdayDate(text, now)
      : parseEnglishWeekdayDate(text, now);
    if (weekdayDate) {
      return weekdayDate;
    }

    if (locale === 'en_US') {
      const englishMonthDate = parseEnglishMonthDate(text, now);
      if (englishMonthDate) {
        return englishMonthDate;
      }
    }
  }

  const numericDate = parseNumericDate(text, now);
  if (numericDate) {
    return numericDate;
  }

  const textWithoutTime = stripTaskTimeText(title, options);
  if (textWithoutTime !== title) {
    const strippedText = normalizeTaskDateText(textWithoutTime);
    return parseNumericDate(strippedText, now);
  }

  return null;
}

function parseNumericDateRange(
  title: string,
  now: Date,
  options?: InferTaskDateFromTextOptions,
): InferredTaskDateRange | null {
  const compact = normalizeTaskDateText(title).compact;
  const dateToken = String.raw`(?:(?:19|20)\d{2}[年\-/.])?(?:1[0-2]|0?[1-9])(?:月|[\/.])(?:3[01]|[12]\d|0?[1-9])(?:日|号)?|(?:(?:19|20)\d{2})[年\-/.](?:1[0-2]|0?[1-9])[月\-/.](?:3[01]|[12]\d|0?[1-9])(?:日|号)?`;
  const rangeMatch = compact.match(new RegExp(`(${dateToken})\\s*(?:-|~|～|至|到|—|–)\\s*(${dateToken}|(?:3[01]|[12]\\d|0?[1-9])(?:日|号)?)`));
  if (!rangeMatch) {
    return null;
  }

  const firstRaw = rangeMatch[1];
  const secondRaw = rangeMatch[2];
  const startDate = parseNumericDateFragment(firstRaw, now);
  const fallbackMonth = parseNumericMonth(firstRaw) || undefined;
  const dueDate = parseNumericDateFragment(secondRaw, now, fallbackMonth);
  if (!startDate || !dueDate) {
    return null;
  }

  if (compareDateString(startDate, dueDate) <= 0) {
    return {
      startDate,
      dueDate,
      startTime: inferTaskTimeFromText(firstRaw, options) || undefined,
      dueTime: inferTaskTimeFromText(secondRaw, options) || undefined,
    };
  }
  return {
    startDate: dueDate,
    dueDate: startDate,
    startTime: inferTaskTimeFromText(secondRaw, options) || undefined,
    dueTime: inferTaskTimeFromText(firstRaw, options) || undefined,
  };
}

function parseNaturalDateRange(
  title: string,
  options: InferTaskDateFromTextOptions,
): InferredTaskDateRange | null {
  const text = normalizeTaskDateText(title);
  const compactConnectors = getTaskDateKeywords(options).range;
  const patterns = getTaskDateKeywordPatterns(options);

  for (const connector of compactConnectors) {
    const index = text.compact.indexOf(connector);
    if (index <= 0 || index >= text.compact.length - connector.length) {
      continue;
    }

    const left = text.compact.slice(0, index);
    const right = text.compact.slice(index + connector.length);
    const startDate = inferSingleTaskDateFromText(left, options);
    const rawDueDate = inferSingleTaskDateFromText(right, options);
    if (startDate && rawDueDate) {
      return {
        startDate,
        dueDate: moveDueDateAfterStart(startDate, rawDueDate),
        startTime: inferTaskTimeFromText(left, options) || undefined,
        dueTime: inferTaskTimeFromText(right, options) || undefined,
      };
    }
  }

  const englishRangeMatch = text.spacedLower.match(new RegExp(`^(.+?)\\s+(?:${patterns.englishRange})\\s+(.+)$`, 'i'));
  if (englishRangeMatch) {
    const startDate = inferSingleTaskDateFromText(englishRangeMatch[1], options);
    const rawDueDate = inferSingleTaskDateFromText(englishRangeMatch[2], options);
    if (startDate && rawDueDate) {
      return {
        startDate,
        dueDate: moveDueDateAfterStart(startDate, rawDueDate),
        startTime: inferTaskTimeFromText(englishRangeMatch[1], options) || undefined,
        dueTime: inferTaskTimeFromText(englishRangeMatch[2], options) || undefined,
      };
    }
  }

  return null;
}

function inferLastSingleTaskDateFromText(
  title: string,
  options: InferTaskDateFromTextOptions,
): string | null {
  const segments = title
    .split(/[，,。；;、]/)
    .map(segment => segment.trim())
    .filter(Boolean);

  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const inferredDate = inferSingleTaskDateFromText(segments[i], options);
    if (inferredDate) {
      return inferredDate;
    }
  }

  return inferSingleTaskDateFromText(title, options);
}

function inferLastTaskTimeFromText(title: string, options?: InferTaskDateFromTextOptions): string | null {
  const segments = title
    .split(/[，,。；;、]/)
    .map(segment => segment.trim())
    .filter(Boolean);

  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const inferredTime = inferTaskTimeFromText(segments[i], options);
    if (inferredTime) {
      return inferredTime;
    }
  }

  return inferTaskTimeFromText(title, options);
}

function parseSemanticDoubleDateRange(
  title: string,
  options: InferTaskDateFromTextOptions,
): InferredTaskDateRange | null {
  const compact = normalizeTaskDateText(title).compact;
  const patterns = getTaskDateKeywordPatterns(options);
  const startKeyword = `(?:${patterns.start})`;
  const dueKeyword = `(?:${patterns.due})`;

  const startThenDueMatch = compact.match(new RegExp(`${startKeyword}(.+?)${dueKeyword}(.+)`, 'i'));
  if (startThenDueMatch) {
    const startDate = inferSingleTaskDateFromText(startThenDueMatch[1], options);
    const dueDate = inferSingleTaskDateFromText(startThenDueMatch[2], options);
    if (startDate && dueDate) {
      return {
        startDate,
        dueDate,
        startTime: inferTaskTimeFromText(startThenDueMatch[1], options) || undefined,
        dueTime: inferTaskTimeFromText(startThenDueMatch[2], options) || undefined,
      };
    }
  }

  const dueThenStartMatch = compact.match(new RegExp(`${dueKeyword}(.+?)${startKeyword}(.+)`, 'i'));
  if (dueThenStartMatch) {
    const dueHead = typeof dueThenStartMatch.index === 'number'
      ? compact.slice(0, dueThenStartMatch.index)
      : '';
    const dueDate = inferLastSingleTaskDateFromText(dueHead, options)
      || inferSingleTaskDateFromText(dueThenStartMatch[1], options);
    const startDate = inferSingleTaskDateFromText(dueThenStartMatch[2], options);
    if (startDate && dueDate) {
      return {
        startDate,
        dueDate,
        startTime: inferTaskTimeFromText(dueThenStartMatch[2], options) || undefined,
        dueTime: inferLastTaskTimeFromText(dueHead || dueThenStartMatch[1], options) || undefined,
      };
    }
  }

  const startKeywordMatch = compact.match(new RegExp(startKeyword, 'i'));
  const dueKeywordMatch = compact.match(new RegExp(dueKeyword, 'i'));
  if (startKeywordMatch?.index !== undefined && dueKeywordMatch?.index !== undefined) {
    const startHead = compact.slice(0, startKeywordMatch.index);
    const startTail = compact.slice(startKeywordMatch.index + startKeywordMatch[0].length);
    const dueHead = compact.slice(0, dueKeywordMatch.index);
    const dueTail = compact.slice(dueKeywordMatch.index + dueKeywordMatch[0].length);
    const startDate = inferSingleTaskDateFromText(startTail, options)
      || inferLastSingleTaskDateFromText(startHead, options);
    const dueDate = inferLastSingleTaskDateFromText(dueHead, options)
      || inferSingleTaskDateFromText(dueTail, options);
    if (startDate && dueDate) {
      return {
        startDate,
        dueDate,
        startTime: inferTaskTimeFromText(startTail, options) || inferTaskTimeFromText(startHead, options) || undefined,
        dueTime: inferTaskTimeFromText(dueTail, options) || inferLastTaskTimeFromText(dueHead, options) || undefined,
      };
    }
  }

  const startLooseMatch = compact.match(new RegExp(`${startKeyword}(.+)`, 'i'));
  const dueLooseMatch = compact.match(new RegExp(`${dueKeyword}(.+)`, 'i'));
  if (startLooseMatch && dueLooseMatch) {
    const startDate = inferSingleTaskDateFromText(startLooseMatch[1], options);
    const dueDate = inferSingleTaskDateFromText(dueLooseMatch[1], options);
    if (startDate && dueDate && startDate !== dueDate) {
      return {
        startDate,
        dueDate,
        startTime: inferTaskTimeFromText(startLooseMatch[1], options) || undefined,
        dueTime: inferTaskTimeFromText(dueLooseMatch[1], options) || undefined,
      };
    }
  }

  return null;
}

function parseSemanticSingleDateRange(
  title: string,
  options: InferTaskDateFromTextOptions,
): InferredTaskDateRange | null {
  const compact = normalizeTaskDateText(title).compact;
  const patterns = getTaskDateKeywordPatterns(options);
  const startMatch = compact.match(new RegExp(`(?:${patterns.start})(.+)`, 'i'));
  if (startMatch) {
    const startDate = inferSingleTaskDateFromText(startMatch[1], options);
    if (startDate) {
      return {
        startDate,
        startTime: inferTaskTimeFromText(startMatch[1], options) || undefined,
      };
    }
  }

  const dueMatch = compact.match(new RegExp(`(?:${patterns.due}|到)(.+)`, 'i'));
  if (dueMatch) {
    const dueDate = inferSingleTaskDateFromText(dueMatch[1], options);
    if (dueDate) {
      return {
        dueDate,
        dueTime: inferTaskTimeFromText(dueMatch[1], options) || inferTaskTimeFromText(compact.slice(0, dueMatch.index || 0), options) || undefined,
      };
    }
  }

  const dueBeforeKeywordMatch = compact.match(new RegExp(`(.+?)(?:${patterns.due})$`, 'i'));
  if (dueBeforeKeywordMatch) {
    const dueDate = inferSingleTaskDateFromText(dueBeforeKeywordMatch[1], options);
    if (dueDate) {
      return {
        dueDate,
        dueTime: inferTaskTimeFromText(dueBeforeKeywordMatch[1], options) || undefined,
      };
    }
  }

  return null;
}

export function inferTaskDateRangeFromText(
  title: string,
  options: InferTaskDateFromTextOptions = {},
): InferredTaskDateRange | null {
  const text = normalizeTaskDateText(title);
  if (!text.compact) {
    return null;
  }

  const now = options.now instanceof Date ? options.now : new Date();
  const numericRange = parseNumericDateRange(title, now, { ...options, now });
  if (numericRange) {
    return numericRange;
  }

  const naturalRange = parseNaturalDateRange(title, { ...options, now });
  if (naturalRange) {
    return naturalRange;
  }

  const semanticDoubleRange = parseSemanticDoubleDateRange(title, { ...options, now });
  if (semanticDoubleRange) {
    return semanticDoubleRange;
  }

  const semanticRange = parseSemanticSingleDateRange(title, { ...options, now });
  if (semanticRange) {
    return semanticRange;
  }

  const inferredDate = inferSingleTaskDateFromText(title, { ...options, now });
  const inferredTime = inferTaskTimeFromText(title, { ...options, now });
  return inferredDate
    ? {
      startDate: inferredDate,
      dueDate: inferredDate,
      startTime: inferredTime || undefined,
      dueTime: inferredTime || undefined,
    }
    : null;
}

export function inferTaskDateFromText(
  title: string,
  options: InferTaskDateFromTextOptions = {},
): string | null {
  const range = inferTaskDateRangeFromText(title, options);
  return range?.dueDate || range?.startDate || null;
}
