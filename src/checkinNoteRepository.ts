import { usePlugin } from '@/main';
import { enqueueStorageMutation } from '@/storageMutationCoordinator';
import { isMissingPluginStorageValue } from '@/utils/pluginStorage';

export const CHECKIN_NOTE_STORAGE_VERSION = 2;
export const CHECKIN_NOTE_STORAGE_PREFIX = 'Pinch-checkin-notes-';
export const MAX_CHECKIN_NOTE_RANGE_MONTHS = 600;
export const CHECKIN_NOTE_BACKUP_FORMAT = 'pinch-checkin-notes-backup';
export const CHECKIN_NOTE_BACKUP_VERSION = 1;

const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;
const DATE_PREFIX_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:$|T|\s)/;

export interface CheckinNoteEntry {
  eventKey: string;
  content: string;
  starred?: boolean;
  /** Immutable event details captured when the note is first saved. */
  context?: CheckinNoteContext;
  createdAt: string;
  updatedAt: string;
}

export interface CheckinNoteTrashEntry extends CheckinNoteEntry {
  deletedAt: string;
}

export type CheckinNoteType = 'habit' | 'task' | 'focus';

export interface CheckinNoteContext {
  type: CheckinNoteType;
  sourceId: string;
  occurredAt: string;
  title: string;
  meta?: string;
}

export interface CheckinNoteStorage {
  version: number;
  month: string;
  entries: Record<string, CheckinNoteEntry>;
  trash: Record<string, CheckinNoteTrashEntry>;
  updatedAt: string;
}

export interface CheckinNoteBackup {
  format: typeof CHECKIN_NOTE_BACKUP_FORMAT;
  version: typeof CHECKIN_NOTE_BACKUP_VERSION;
  exportedAt: string;
  months: CheckinNoteStorage[];
}

export type CheckinNotesStorage = CheckinNoteStorage;

export interface CheckinNoteDraft {
  eventKey: string;
  content: string;
  starred?: boolean;
  createdAt?: string;
  context?: CheckinNoteContext;
}

type CheckinNoteEntriesInput =
  | Record<string, unknown>
  | CheckinNoteEntry[]
  | undefined
  | null;

// Keep the most recent successfully decoded value so transient read failures
// do not make read-only views appear empty. Mutations always bypass this cache
// and perform a strict fresh read before changing storage.
const lastGoodCheckinNotes = new Map<string, CheckinNoteStorage>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeTimestamp(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeContext(raw: unknown): CheckinNoteContext | undefined {
  if (!isRecord(raw)) return undefined;
  const type = normalizeText(raw.type);
  const sourceId = normalizeText(raw.sourceId);
  const occurredAt = normalizeTimestamp(raw.occurredAt);
  const title = normalizeText(raw.title);
  if ((type !== 'habit' && type !== 'task' && type !== 'focus') || !sourceId || !occurredAt || !title) {
    return undefined;
  }
  const meta = normalizeText(raw.meta);
  return meta ? { type, sourceId, occurredAt, title, meta } : { type, sourceId, occurredAt, title };
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
    ...(raw.starred === true ? { starred: true } : {}),
    context: normalizeContext(raw.context),
    createdAt: normalizeTimestamp(raw.createdAt),
    updatedAt: normalizeTimestamp(raw.updatedAt)
  };
}

function normalizeTrashEntry(raw: unknown, fallbackEventKey = ''): CheckinNoteTrashEntry | null {
  const entry = normalizeEntry(raw, fallbackEventKey);
  const deletedAt = isRecord(raw) ? normalizeTimestamp(raw.deletedAt) : '';
  return entry && deletedAt ? { ...entry, deletedAt } : null;
}

function getRawEntries(input: unknown): {
  entries: CheckinNoteEntriesInput;
  trash: CheckinNoteEntriesInput;
  updatedAt: string;
} {
  if (isRecord(input) && Object.prototype.hasOwnProperty.call(input, 'entries')) {
    return {
      entries: input.entries as CheckinNoteEntriesInput,
      trash: input.trash as CheckinNoteEntriesInput,
      updatedAt: normalizeTimestamp(input.updatedAt)
    };
  }

  return {
    entries: input as CheckinNoteEntriesInput,
    trash: undefined,
    updatedAt: ''
  };
}

function normalizeTrashEntries(input: CheckinNoteEntriesInput): Record<string, CheckinNoteTrashEntry> {
  if (!isRecord(input) && !Array.isArray(input)) return {};
  const candidates = Array.isArray(input)
    ? input.map(raw => ({ raw, fallbackEventKey: isRecord(raw) ? normalizeEventKey(raw.eventKey) : '' }))
    : Object.entries(input).map(([eventKey, raw]) => ({ raw, fallbackEventKey: eventKey }));
  const normalized = new Map<string, CheckinNoteTrashEntry>();
  for (const candidate of candidates) {
    const entry = normalizeTrashEntry(candidate.raw, candidate.fallbackEventKey);
    if (entry && !normalized.has(entry.eventKey)) normalized.set(entry.eventKey, entry);
  }
  return Object.fromEntries(normalized.entries());
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
  return { ...entry, context: entry.context ? { ...entry.context } : undefined };
}

function cloneEntries(entries: Record<string, CheckinNoteEntry>): Record<string, CheckinNoteEntry> {
  return Object.fromEntries(Object.entries(entries).map(([eventKey, entry]) => [
    eventKey,
    cloneEntry(entry)
  ]));
}

function cloneTrashEntries(entries: Record<string, CheckinNoteTrashEntry>): Record<string, CheckinNoteTrashEntry> {
  return Object.fromEntries(Object.entries(entries).map(([eventKey, entry]) => [
    eventKey,
    { ...cloneEntry(entry), deletedAt: entry.deletedAt }
  ]));
}

function cloneStorage(storage: CheckinNoteStorage): CheckinNoteStorage {
  return {
    version: storage.version,
    month: storage.month,
    entries: cloneEntries(storage.entries),
    trash: cloneTrashEntries(storage.trash),
    updatedAt: storage.updatedAt
  };
}

function isValidEntryContainer(input: unknown): boolean {
  if (Array.isArray(input)) {
    const seen = new Set<string>();
    return input.every(raw => {
      if (typeof raw === 'string') {
        // Array entries have no fallback key; a bare string would be dropped
        // by normalizeEntries and must therefore fail closed.
        return false;
      }
      if (!isRecord(raw)) {
        return false;
      }
      const eventKey = normalizeEventKey(raw.eventKey);
      const content = normalizeText(raw.content);
      if (!eventKey || !content || seen.has(eventKey)) {
        return false;
      }
      seen.add(eventKey);
      return true;
    });
  }

  if (!isRecord(input)) {
    return false;
  }

  const seen = new Set<string>();
  return Object.entries(input).every(([eventKey, raw]) => {
    let normalizedEventKey = normalizeEventKey(eventKey);
    if (typeof raw === 'string') {
      if (!normalizedEventKey || !normalizeText(raw) || seen.has(normalizedEventKey)) {
        return false;
      }
      seen.add(normalizedEventKey);
      return true;
    }
    if (!isRecord(raw)) {
      return false;
    }
    normalizedEventKey = normalizeEventKey(raw.eventKey) || normalizedEventKey;
    const content = normalizeText(raw.content);
    if (!normalizedEventKey || !content || seen.has(normalizedEventKey)) {
      return false;
    }
    seen.add(normalizedEventKey);
    return true;
  });
}

function isValidTrashContainer(input: unknown): boolean {
  if (input === undefined) return true;
  if (!isRecord(input) && !Array.isArray(input)) return false;
  const values = Array.isArray(input) ? input : Object.values(input);
  return values.every(raw => isRecord(raw) && Boolean(normalizeTrashEntry(raw, normalizeEventKey(raw.eventKey))));
}

/**
 * Validate the persisted shape before a mutation. Normalization intentionally
 * tolerates legacy records for read-only callers, but silently dropping a bad
 * record during read-modify-write would overwrite data that may be recoverable.
 */
function assertReadableCheckinNotes(input: unknown): void {
  if (Array.isArray(input)) {
    return;
  }

  if (!isRecord(input)) {
    throw new Error('Invalid check-in note storage');
  }

  if (
    Object.prototype.hasOwnProperty.call(input, 'code')
    || Object.prototype.hasOwnProperty.call(input, 'msg')
  ) {
    throw new Error('Invalid check-in note storage');
  }

  if (Object.prototype.hasOwnProperty.call(input, 'entries')) {
    if (!Array.isArray(input.entries) && !isRecord(input.entries)) {
      throw new Error('Invalid check-in note entries');
    }
    if (!isValidTrashContainer(input.trash)) {
      throw new Error('Invalid check-in note trash');
    }
    return;
  }

  // API error envelopes and partially written versioned wrappers must never be
  // interpreted as an empty legacy entry map.
  if (
    Object.prototype.hasOwnProperty.call(input, 'version')
    || Object.prototype.hasOwnProperty.call(input, 'month')
    || Object.prototype.hasOwnProperty.call(input, 'updatedAt')
  ) {
    throw new Error('Invalid check-in note storage');
  }
}

function assertStoredCheckinNotes(input: unknown): void {
  assertReadableCheckinNotes(input);

  if (Array.isArray(input)) {
    if (!isValidEntryContainer(input)) {
      throw new Error('Invalid check-in note entries');
    }
    return;
  }

  if (!isRecord(input)) {
    throw new Error('Invalid check-in note storage');
  }

  const entries = Object.prototype.hasOwnProperty.call(input, 'entries')
    ? input.entries
    : input;

  if (!isValidEntryContainer(entries)) {
    throw new Error('Invalid check-in note entries');
  }
  if (Object.prototype.hasOwnProperty.call(input, 'entries') && !isValidTrashContainer(input.trash)) {
    throw new Error('Invalid check-in note trash');
  }
}

function getLastGoodCheckinNotes(month: string): CheckinNoteStorage {
  const cached = lastGoodCheckinNotes.get(month);
  return cached ? cloneStorage(cached) : createEmptyCheckinNotes(month);
}

export function createEmptyCheckinNotes(monthInput: unknown): CheckinNoteStorage {
  return {
    version: CHECKIN_NOTE_STORAGE_VERSION,
    month: getCheckinNoteMonth(monthInput),
    entries: {},
    trash: {},
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
    trash: normalizeTrashEntries(raw.trash),
    updatedAt: raw.updatedAt
  };
}

async function readCheckinNotes(month: string, strict = false): Promise<CheckinNoteStorage> {
  const plugin = usePlugin();
  if (!plugin) {
    const error = new Error('Plugin is not initialized');
    if (strict) {
      throw error;
    }
    console.error('[CheckinNotes] read: plugin is not initialized');
    return getLastGoodCheckinNotes(month);
  }

  try {
    const raw = await plugin.loadData(getCheckinNoteStorageKey(month));
    if (isMissingPluginStorageValue(raw)) {
      const empty = createEmptyCheckinNotes(month);
      lastGoodCheckinNotes.set(month, cloneStorage(empty));
      return empty;
    }

    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (strict) {
      assertStoredCheckinNotes(parsed);
    } else {
      assertReadableCheckinNotes(parsed);
    }
    const normalized = normalizeCheckinNotes(parsed, month);
    lastGoodCheckinNotes.set(month, cloneStorage(normalized));
    return cloneStorage(normalized);
  } catch (error) {
    console.error('[CheckinNotes] read failed:', error);
    if (strict) {
      throw error;
    }
    return getLastGoodCheckinNotes(month);
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
  const saved = cloneStorage(payload);
  lastGoodCheckinNotes.set(month, cloneStorage(saved));
  return saved;
}

function enqueueMonthMutation<T>(month: string, operation: () => Promise<T>): Promise<T> {
  return enqueueStorageMutation(getCheckinNoteStorageKey(month), operation);
}

export async function getCheckinNotes(monthInput: unknown): Promise<CheckinNoteStorage> {
  const month = getCheckinNoteMonth(monthInput);
  if (!month) {
    return createEmptyCheckinNotes('');
  }
  return readCheckinNotes(month);
}

export function getCheckinNoteMonthsInRange(startInput: unknown, endInput: unknown): string[] {
  const startMonth = getCheckinNoteMonth(startInput);
  const endMonth = getCheckinNoteMonth(endInput);
  if (!startMonth || !endMonth || startMonth > endMonth) {
    return [];
  }

  const [startYear, startMonthNumber] = startMonth.split('-').map(Number);
  const [endYear, endMonthNumber] = endMonth.split('-').map(Number);
  const monthCount = (endYear - startYear) * 12 + endMonthNumber - startMonthNumber + 1;
  if (monthCount > MAX_CHECKIN_NOTE_RANGE_MONTHS) {
    throw new Error(`Check-in note range exceeds ${MAX_CHECKIN_NOTE_RANGE_MONTHS} months`);
  }

  return Array.from({ length: monthCount }, (_, index) => {
    const date = new Date(startYear, startMonthNumber - 1 + index, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  });
}

export async function getCheckinNotesForMonths(monthInputs: Iterable<unknown>): Promise<CheckinNoteStorage[]> {
  const months = Array.from(new Set(
    Array.from(monthInputs, input => getCheckinNoteMonth(input)).filter(Boolean)
  )).sort();
  return Promise.all(months.map(month => getCheckinNotes(month)));
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

  return enqueueMonthMutation(month, async () => {
    await readCheckinNotes(month, true);
    return writeCheckinNotes(month, source || {});
  });
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
    const storage = await readCheckinNotes(month, true);
    const existing = storage.entries[eventKey];

    if (!content) {
      if (!existing) {
        return null;
      }
      const entries = cloneEntries(storage.entries);
      const trash = cloneTrashEntries(storage.trash);
      delete entries[eventKey];
      trash[eventKey] = { ...cloneEntry(existing), deletedAt: new Date().toISOString() };
      await writeCheckinNotes(month, { ...storage, entries, trash });
      return null;
    }

    const now = new Date().toISOString();
    const starred = typeof draft?.starred === 'boolean' ? draft.starred : existing?.starred === true;
    const entry: CheckinNoteEntry = {
      eventKey,
      content,
      ...(starred ? { starred: true } : {}),
      // Context is a historical snapshot. Editing a note must not replace it
      // with later object names or state.
      context: existing?.context || normalizeContext(draft?.context),
      createdAt: existing?.createdAt || normalizeTimestamp(draft?.createdAt) || now,
      updatedAt: now
    };
    const entries = cloneEntries(storage.entries);
    const trash = cloneTrashEntries(storage.trash);
    entries[eventKey] = entry;
    delete trash[eventKey];
    await writeCheckinNotes(month, { ...storage, entries, trash }, now);
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
    const storage = await readCheckinNotes(month, true);
    if (!storage.entries[eventKey]) {
      return false;
    }

    const entries = cloneEntries(storage.entries);
    const trash = cloneTrashEntries(storage.trash);
    trash[eventKey] = { ...cloneEntry(storage.entries[eventKey]), deletedAt: new Date().toISOString() };
    delete entries[eventKey];
    await writeCheckinNotes(month, { ...storage, entries, trash });
    return true;
  });
}

export async function restoreCheckinNote(monthInput: unknown, eventKeyInput: unknown): Promise<CheckinNoteEntry | null> {
  const month = getCheckinNoteMonth(monthInput);
  if (!month) throw new Error('A valid check-in note month is required');
  const eventKey = normalizeEventKey(eventKeyInput);
  if (!eventKey) return null;

  return enqueueMonthMutation(month, async () => {
    const storage = await readCheckinNotes(month, true);
    const trashed = storage.trash[eventKey];
    if (!trashed) return null;
    const entries = cloneEntries(storage.entries);
    const trash = cloneTrashEntries(storage.trash);
    const { deletedAt: _deletedAt, ...entry } = trashed;
    entries[eventKey] = cloneEntry(entry);
    delete trash[eventKey];
    await writeCheckinNotes(month, { ...storage, entries, trash });
    return cloneEntry(entry);
  });
}

export async function purgeCheckinNote(monthInput: unknown, eventKeyInput: unknown): Promise<boolean> {
  const month = getCheckinNoteMonth(monthInput);
  if (!month) throw new Error('A valid check-in note month is required');
  const eventKey = normalizeEventKey(eventKeyInput);
  if (!eventKey) return false;

  return enqueueMonthMutation(month, async () => {
    const storage = await readCheckinNotes(month, true);
    if (!storage.trash[eventKey]) return false;
    const trash = cloneTrashEntries(storage.trash);
    delete trash[eventKey];
    await writeCheckinNotes(month, { ...storage, trash });
    return true;
  });
}

export async function emptyCheckinNoteTrash(monthInputs: Iterable<unknown>): Promise<number> {
  const months = Array.from(new Set(
    Array.from(monthInputs, input => getCheckinNoteMonth(input)).filter(Boolean)
  ));
  const removed = await Promise.all(months.map(month => enqueueMonthMutation(month, async () => {
    const storage = await readCheckinNotes(month, true);
    const count = Object.keys(storage.trash).length;
    if (count > 0) await writeCheckinNotes(month, { ...storage, trash: {} });
    return count;
  })));
  return removed.reduce((total, count) => total + count, 0);
}

export function createCheckinNoteBackup(storages: Iterable<CheckinNoteStorage>): CheckinNoteBackup {
  const months = Array.from(storages, storage => cloneStorage(normalizeCheckinNotes(storage, storage.month)))
    .filter(storage => Boolean(storage.month))
    .sort((left, right) => left.month.localeCompare(right.month));
  return {
    format: CHECKIN_NOTE_BACKUP_FORMAT,
    version: CHECKIN_NOTE_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    months
  };
}

export async function restoreCheckinNoteBackup(input: unknown): Promise<string[]> {
  const parsed = typeof input === 'string' ? JSON.parse(input) : input;
  if (!isRecord(parsed)
    || parsed.format !== CHECKIN_NOTE_BACKUP_FORMAT
    || parsed.version !== CHECKIN_NOTE_BACKUP_VERSION
    || !Array.isArray(parsed.months)) {
    throw new Error('Invalid check-in note backup');
  }

  const incomingMonths = parsed.months.map(raw => {
    if (!isRecord(raw)) throw new Error('Invalid check-in note backup month');
    const month = getCheckinNoteMonth(raw.month);
    if (!month) throw new Error('Invalid check-in note backup month');
    assertStoredCheckinNotes(raw);
    return normalizeCheckinNotes(raw, month);
  });
  if (new Set(incomingMonths.map(storage => storage.month)).size !== incomingMonths.length) {
    throw new Error('Duplicate check-in note backup month');
  }

  await Promise.all(incomingMonths.map(incoming => enqueueMonthMutation(incoming.month, async () => {
    const current = await readCheckinNotes(incoming.month, true);
    const entries = { ...cloneEntries(current.entries), ...cloneEntries(incoming.entries) };
    const trash = { ...cloneTrashEntries(current.trash), ...cloneTrashEntries(incoming.trash) };
    Object.keys(entries).forEach(eventKey => delete trash[eventKey]);
    await writeCheckinNotes(incoming.month, { ...current, entries, trash });
  })));
  return incomingMonths.map(storage => storage.month).sort();
}

export async function migrateCheckinNote(
  monthInput: unknown,
  targetEventKeyInput: unknown,
  legacyEventKeyInputs: unknown[]
): Promise<CheckinNoteEntry | null> {
  const month = getCheckinNoteMonth(monthInput);
  if (!month) {
    throw new Error('A valid check-in note month is required');
  }

  const targetEventKey = normalizeEventKey(targetEventKeyInput);
  if (!targetEventKey) {
    throw new Error('A check-in note target event key is required');
  }

  const legacyEventKeys = Array.from(new Set(
    legacyEventKeyInputs
      .map(normalizeEventKey)
      .filter(eventKey => eventKey && eventKey !== targetEventKey)
  ));
  if (legacyEventKeys.length === 0) {
    return null;
  }

  return enqueueMonthMutation(month, async () => {
    const storage = await readCheckinNotes(month, true);
    const existingTarget = storage.entries[targetEventKey];
    const legacyEntry = legacyEventKeys
      .map(eventKey => storage.entries[eventKey])
      .find((entry): entry is CheckinNoteEntry => Boolean(entry));

    if (!existingTarget && !legacyEntry) {
      return null;
    }

    const entries = cloneEntries(storage.entries);
    legacyEventKeys.forEach(eventKey => delete entries[eventKey]);
    const migratedEntry = existingTarget || {
      ...legacyEntry!,
      eventKey: targetEventKey
    };
    entries[targetEventKey] = migratedEntry;

    const changed = legacyEventKeys.some(eventKey => Boolean(storage.entries[eventKey]));
    if (changed) {
      await writeCheckinNotes(month, { ...storage, entries });
    }
    return cloneEntry(migratedEntry);
  });
}
