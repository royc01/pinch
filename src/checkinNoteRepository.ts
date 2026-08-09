import { usePlugin } from '@/main';

export const CHECKIN_NOTE_STORAGE_VERSION = 1;
export const CHECKIN_NOTE_STORAGE_PREFIX = 'Pinch-checkin-notes-';

const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;
const DATE_PREFIX_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:$|T|\s)/;

export interface CheckinNoteEntry {
  eventKey: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CheckinNoteStorage {
  version: number;
  month: string;
  entries: Record<string, CheckinNoteEntry>;
  updatedAt: string;
}

export type CheckinNotesStorage = CheckinNoteStorage;

export interface CheckinNoteDraft {
  eventKey: string;
  content: string;
  createdAt?: string;
}

type CheckinNoteEntriesInput =
  | Record<string, unknown>
  | CheckinNoteEntry[]
  | undefined
  | null;

const monthMutationQueues = new Map<string, Promise<void>>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeTimestamp(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function formatMonth(year: number, month: number): string {
  if (!Number.isInteger(year) || year < 1 || !Number.isInteger(month) || month < 1 || month > 12) {
    return '';
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
}

function normalizeDatePrefix(value: string): string {
  const match = value.match(DATE_PREFIX_PATTERN);
  if (!match) {
    return '';
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(day) || day < 1 || day > getDaysInMonth(year, month)) {
    return '';
  }

  return formatMonth(year, month);
}

/** Returns a YYYY-MM key for a month, calendar date, ISO date, or Date value. */
export function getCheckinNoteMonth(value: unknown): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return '';
    }
    return formatMonth(value.getFullYear(), value.getMonth() + 1);
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return '';
    }
    return getCheckinNoteMonth(new Date(value));
  }

  if (typeof value !== 'string') {
    return '';
  }

  const normalized = value.trim();
  if (!normalized) {
    return '';
  }

  const monthMatch = normalized.match(MONTH_PATTERN);
  if (monthMatch) {
    return formatMonth(Number(monthMatch[1]), Number(monthMatch[2]));
  }

  const datePrefix = normalizeDatePrefix(normalized);
  if (datePrefix) {
    return datePrefix;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) {
    return '';
  }

  // Keep support for ISO strings that include a non-standard date prefix while
  // rejecting values that JavaScript would silently roll into another month.
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime())
    ? ''
    : formatMonth(parsed.getFullYear(), parsed.getMonth() + 1);
}

export function getCheckinNoteStorageKey(value: unknown): string {
  const month = getCheckinNoteMonth(value);
  return month ? `${CHECKIN_NOTE_STORAGE_PREFIX}${month}.json` : '';
}

function normalizeEventKey(value: unknown): string {
  return normalizeText(value);
}

function normalizeEntry(raw: unknown, fallbackEventKey = ''): CheckinNoteEntry | null {
  if (typeof raw === 'string') {
    const content = normalizeText(raw);
    const eventKey = normalizeEventKey(fallbackEventKey);
    return eventKey && content
      ? { eventKey, content, createdAt: '', updatedAt: '' }
      : null;
  }

  if (!isRecord(raw)) {
    return null;
  }

  const eventKey = normalizeEventKey(raw.eventKey) || normalizeEventKey(fallbackEventKey);
  const content = normalizeText(raw.content);
  if (!eventKey || !content) {
    return null;
  }

  return {
    eventKey,
    content,
    createdAt: normalizeTimestamp(raw.createdAt),
    updatedAt: normalizeTimestamp(raw.updatedAt)
  };
}

function getRawEntries(input: unknown): {
  entries: CheckinNoteEntriesInput;
  updatedAt: string;
} {
  if (isRecord(input) && Object.prototype.hasOwnProperty.call(input, 'entries')) {
    return {
      entries: input.entries as CheckinNoteEntriesInput,
      updatedAt: normalizeTimestamp(input.updatedAt)
    };
  }

  return {
    entries: input as CheckinNoteEntriesInput,
    updatedAt: ''
  };
}

function normalizeEntries(input: CheckinNoteEntriesInput): Record<string, CheckinNoteEntry> {
  const candidates: Array<{ raw: unknown; fallbackEventKey: string }> = [];

  if (Array.isArray(input)) {
    input.forEach(raw => {
      candidates.push({
        raw,
        fallbackEventKey: isRecord(raw) ? normalizeEventKey(raw.eventKey) : ''
      });
    });
  } else if (isRecord(input)) {
    Object.entries(input).forEach(([eventKey, raw]) => {
      candidates.push({ raw, fallbackEventKey: eventKey });
    });
  }

  const normalized = new Map<string, CheckinNoteEntry>();
  for (const candidate of candidates) {
    const entry = normalizeEntry(candidate.raw, candidate.fallbackEventKey);
    if (entry && !normalized.has(entry.eventKey)) {
      normalized.set(entry.eventKey, entry);
    }
  }

  return Object.fromEntries(normalized.entries());
}

function cloneEntry(entry: CheckinNoteEntry): CheckinNoteEntry {
  return { ...entry };
}

function cloneEntries(entries: Record<string, CheckinNoteEntry>): Record<string, CheckinNoteEntry> {
  return Object.fromEntries(Object.entries(entries).map(([eventKey, entry]) => [
    eventKey,
    cloneEntry(entry)
  ]));
}

function cloneStorage(storage: CheckinNoteStorage): CheckinNoteStorage {
  return {
    version: storage.version,
    month: storage.month,
    entries: cloneEntries(storage.entries),
    updatedAt: storage.updatedAt
  };
}

export function createEmptyCheckinNotes(monthInput: unknown): CheckinNoteStorage {
  return {
    version: CHECKIN_NOTE_STORAGE_VERSION,
    month: getCheckinNoteMonth(monthInput),
    entries: {},
    updatedAt: ''
  };
}

export function normalizeCheckinNotes(input: unknown, monthInput: unknown): CheckinNoteStorage {
  const month = getCheckinNoteMonth(monthInput);
  const raw = getRawEntries(input);
  return {
    version: CHECKIN_NOTE_STORAGE_VERSION,
    month,
    entries: normalizeEntries(raw.entries),
    updatedAt: raw.updatedAt
  };
}

async function readCheckinNotes(month: string): Promise<CheckinNoteStorage> {
  const plugin = usePlugin();
  if (!plugin) {
    console.error('[CheckinNotes] read: plugin is not initialized');
    return createEmptyCheckinNotes(month);
  }

  try {
    const raw = await plugin.loadData(getCheckinNoteStorageKey(month));
    if (!raw) {
      return createEmptyCheckinNotes(month);
    }

    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return normalizeCheckinNotes(parsed, month);
  } catch (error) {
    console.error('[CheckinNotes] read failed:', error);
    return createEmptyCheckinNotes(month);
  }
}

function requirePlugin(): NonNullable<ReturnType<typeof usePlugin>> {
  const plugin = usePlugin();
  if (!plugin) {
    throw new Error('Plugin is not initialized');
  }
  return plugin;
}

async function writeCheckinNotes(
  month: string,
  input: unknown,
  updatedAt = new Date().toISOString()
): Promise<CheckinNoteStorage> {
  const plugin = requirePlugin();
  const normalized = normalizeCheckinNotes(input, month);
  const payload: CheckinNoteStorage = {
    ...normalized,
    version: CHECKIN_NOTE_STORAGE_VERSION,
    month,
    updatedAt
  };

  await plugin.saveData(getCheckinNoteStorageKey(month), payload);
  return cloneStorage(payload);
}

function enqueueMonthMutation<T>(month: string, operation: () => Promise<T>): Promise<T> {
  const previous = monthMutationQueues.get(month) || Promise.resolve();
  const pending = previous.catch(() => undefined).then(operation);
  const queueMarker = pending.then(() => undefined, () => undefined);
  monthMutationQueues.set(month, queueMarker);
  return pending.finally(() => {
    if (monthMutationQueues.get(month) === queueMarker) {
      monthMutationQueues.delete(month);
    }
  });
}

export async function getCheckinNotes(monthInput: unknown): Promise<CheckinNoteStorage> {
  const month = getCheckinNoteMonth(monthInput);
  if (!month) {
    return createEmptyCheckinNotes('');
  }
  return readCheckinNotes(month);
}

export const loadCheckinNotes = getCheckinNotes;

export async function getCheckinNote(
  monthInput: unknown,
  eventKeyInput: unknown
): Promise<CheckinNoteEntry | null> {
  const eventKey = normalizeEventKey(eventKeyInput);
  if (!eventKey) {
    return null;
  }

  const storage = await getCheckinNotes(monthInput);
  const entry = storage.entries[eventKey];
  return entry ? cloneEntry(entry) : null;
}

export async function saveCheckinNotes(
  monthInput: unknown,
  input?: unknown
): Promise<CheckinNoteStorage>;
export async function saveCheckinNotes(input: CheckinNoteStorage): Promise<CheckinNoteStorage>;
export async function saveCheckinNotes(
  monthOrStorage: unknown,
  input?: unknown
): Promise<CheckinNoteStorage> {
  let month = getCheckinNoteMonth(monthOrStorage);
  let source = input;

  if (!month && isRecord(monthOrStorage)) {
    month = getCheckinNoteMonth(monthOrStorage.month);
    source = monthOrStorage;
  }

  if (!month) {
    throw new Error('A valid check-in note month is required');
  }

  return enqueueMonthMutation(month, async () => writeCheckinNotes(month, source || {}));
}

export async function upsertCheckinNote(
  monthInput: unknown,
  draft: CheckinNoteDraft
): Promise<CheckinNoteEntry | null>;
export async function upsertCheckinNote(
  monthInput: unknown,
  eventKey: string,
  content: string
): Promise<CheckinNoteEntry | null>;
export async function upsertCheckinNote(
  monthInput: unknown,
  draftOrEventKey: CheckinNoteDraft | string,
  contentInput?: string
): Promise<CheckinNoteEntry | null> {
  const month = getCheckinNoteMonth(monthInput);
  if (!month) {
    throw new Error('A valid check-in note month is required');
  }

  const draft: CheckinNoteDraft = typeof draftOrEventKey === 'string'
    ? { eventKey: draftOrEventKey, content: contentInput ?? '' }
    : draftOrEventKey;
  const eventKey = normalizeEventKey(draft?.eventKey);
  if (!eventKey) {
    throw new Error('A check-in note event key is required');
  }
  const content = normalizeText(draft?.content);

  return enqueueMonthMutation(month, async () => {
    const storage = await readCheckinNotes(month);
    const existing = storage.entries[eventKey];

    if (!content) {
      if (!existing) {
        return null;
      }
      const entries = cloneEntries(storage.entries);
      delete entries[eventKey];
      await writeCheckinNotes(month, { ...storage, entries });
      return null;
    }

    const now = new Date().toISOString();
    const entry: CheckinNoteEntry = {
      eventKey,
      content,
      createdAt: existing?.createdAt || normalizeTimestamp(draft?.createdAt) || now,
      updatedAt: now
    };
    const entries = cloneEntries(storage.entries);
    entries[eventKey] = entry;
    await writeCheckinNotes(month, { ...storage, entries }, now);
    return cloneEntry(entry);
  });
}

export async function removeCheckinNote(monthInput: unknown, eventKeyInput: unknown): Promise<boolean> {
  const month = getCheckinNoteMonth(monthInput);
  if (!month) {
    throw new Error('A valid check-in note month is required');
  }

  const eventKey = normalizeEventKey(eventKeyInput);
  if (!eventKey) {
    return false;
  }

  return enqueueMonthMutation(month, async () => {
    const storage = await readCheckinNotes(month);
    if (!storage.entries[eventKey]) {
      return false;
    }

    const entries = cloneEntries(storage.entries);
    delete entries[eventKey];
    await writeCheckinNotes(month, { ...storage, entries });
    return true;
  });
}
