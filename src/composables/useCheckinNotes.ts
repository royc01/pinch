import { ref } from 'vue';
import {
  getCheckinNoteMonth,
  getCheckinNotes,
  migrateCheckinNote,
  removeCheckinNote,
  upsertCheckinNote,
  type CheckinNoteContext,
  type CheckinNoteEntry
} from '@/checkinNoteRepository';

export interface CheckinNoteTimelineTarget {
  id: string;
  annotationKey?: string;
  annotationDate?: string;
  annotation?: string;
  annotationEditable?: boolean;
  annotationStarred?: boolean;
}

const noteCache = new Map<string, CheckinNoteEntry>();
const loadedMonths = new Set<string>();
const loadingMonths = new Map<string, Promise<void>>();
const noteRevision = ref(0);
const pendingMigrations = new Set<string>();

function getCacheKey(monthInput: unknown, eventKey: string): string {
  const month = getCheckinNoteMonth(monthInput);
  return month && eventKey ? `${month}:${eventKey}` : '';
}

async function loadMonth(monthInput: unknown, force = false): Promise<void> {
  const month = getCheckinNoteMonth(monthInput);
  if (!month) {
    return;
  }

  const existingLoad = loadingMonths.get(month);
  if (existingLoad) {
    await existingLoad;
    if (!force) return;
  }
  if (!force && loadedMonths.has(month)) {
    return;
  }

  const load = (async () => {
    const storage = await getCheckinNotes(month);
    if (force) {
      for (const cacheKey of noteCache.keys()) {
        if (cacheKey.startsWith(`${month}:`)) noteCache.delete(cacheKey);
      }
    }
    for (const [eventKey, entry] of Object.entries(storage.entries)) {
      const cacheKey = getCacheKey(month, eventKey);
      if (cacheKey) {
        noteCache.set(cacheKey, { ...entry });
      }
    }
    loadedMonths.add(month);
    noteRevision.value += 1;
  })();

  loadingMonths.set(month, load);
  try {
    await load;
  } finally {
    loadingMonths.delete(month);
  }
}

export function useCheckinNotes() {
  const ensureDatesLoaded = async (dates: Iterable<string>): Promise<void> => {
    const months = new Set<string>();
    for (const date of dates) {
      const month = getCheckinNoteMonth(date);
      if (month) {
        months.add(month);
      }
    }
    await Promise.all(Array.from(months, month => loadMonth(month)));
  };

  const refreshMonths = async (monthInputs: Iterable<unknown>): Promise<void> => {
    const months = Array.from(new Set(
      Array.from(monthInputs, input => getCheckinNoteMonth(input)).filter(Boolean)
    ));
    await Promise.all(months.map(month => loadMonth(month, true)));
  };

  const getEntry = (
    dateInput: unknown,
    eventKeysInput: string | string[] | undefined
  ): CheckinNoteEntry | undefined => {
    // Reading the revision makes timeline computed values react to async loads and saves.
    void noteRevision.value;
    const eventKeys = (Array.isArray(eventKeysInput) ? eventKeysInput : [eventKeysInput])
      .map(eventKey => typeof eventKey === 'string' ? eventKey.trim() : '')
      .filter(Boolean);
    for (const eventKey of eventKeys) {
      const cacheKey = getCacheKey(dateInput, eventKey);
      const entry = cacheKey ? noteCache.get(cacheKey) : undefined;
      if (entry) return entry;
    }
    return undefined;
  };

  const getNote = (dateInput: unknown, eventKeysInput: string | string[] | undefined): string => (
    getEntry(dateInput, eventKeysInput)?.content || ''
  );

  const scheduleLegacyMigration = (dateInput: unknown, eventKeys: string[]): void => {
    const [targetEventKey, ...legacyEventKeys] = eventKeys;
    const month = getCheckinNoteMonth(dateInput);
    if (!month || !targetEventKey || legacyEventKeys.length === 0) return;
    const targetCacheKey = getCacheKey(month, targetEventKey);
    const legacyEventKey = legacyEventKeys.find(eventKey => noteCache.has(getCacheKey(month, eventKey)));
    if (!legacyEventKey || noteCache.has(targetCacheKey)) return;

    const migrationKey = `${month}:${targetEventKey}`;
    if (pendingMigrations.has(migrationKey)) return;
    pendingMigrations.add(migrationKey);
    void migrateCheckinNote(month, targetEventKey, legacyEventKeys)
      .then(entry => {
        if (!entry) return;
        noteCache.set(targetCacheKey, entry);
        legacyEventKeys.forEach(eventKey => noteCache.delete(getCacheKey(month, eventKey)));
        noteRevision.value += 1;
      })
      .catch(error => console.error('[CheckinNotes] legacy key migration failed:', error))
      .finally(() => pendingMigrations.delete(migrationKey));
  };

  const hydrateTimelineTarget = <T extends CheckinNoteTimelineTarget>(
    target: T,
    dateInput: unknown,
    eventKeysInput: string | string[] | undefined
  ): T & CheckinNoteTimelineTarget => {
    const eventKeys = (Array.isArray(eventKeysInput) ? eventKeysInput : [eventKeysInput])
      .map(eventKey => typeof eventKey === 'string' ? eventKey.trim() : '')
      .filter(Boolean);
    const primaryEventKey = eventKeys[0] || '';
    if (!primaryEventKey) {
      return target;
    }
    scheduleLegacyMigration(dateInput, eventKeys);
    const entry = getEntry(dateInput, eventKeys);
    return {
      ...target,
      annotationKey: primaryEventKey,
      annotationDate: typeof dateInput === 'string' ? dateInput : '',
      annotation: entry?.content || '',
      annotationEditable: true,
      annotationStarred: entry?.starred === true
    };
  };

  const updateNote = async (
    dateInput: unknown,
    eventKeyInput: string | undefined,
    content: string,
    context?: CheckinNoteContext,
    starred?: boolean
  ): Promise<void> => {
    const eventKey = typeof eventKeyInput === 'string' ? eventKeyInput.trim() : '';
    const month = getCheckinNoteMonth(dateInput);
    if (!month || !eventKey) {
      return;
    }

    await loadMonth(month);
    const cacheKey = getCacheKey(month, eventKey);
    const normalizedContent = content.trim();
    if (normalizedContent) {
      const entry = await upsertCheckinNote(month, { eventKey, content: normalizedContent, context, starred });
      if (entry) {
        noteCache.set(cacheKey, entry);
      }
    } else {
      await removeCheckinNote(month, eventKey);
      noteCache.delete(cacheKey);
    }
    noteRevision.value += 1;
  };

  return {
    ensureDatesLoaded,
    refreshMonths,
    getEntry,
    getNote,
    hydrateTimelineTarget,
    updateNote
  };
}
