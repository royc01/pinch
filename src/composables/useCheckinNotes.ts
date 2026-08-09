import { ref } from 'vue';
import {
  getCheckinNoteMonth,
  getCheckinNotes,
  removeCheckinNote,
  upsertCheckinNote,
  type CheckinNoteEntry
} from '@/checkinNoteRepository';

export interface CheckinNoteTimelineTarget {
  annotationKey?: string;
  annotationDate?: string;
  annotation?: string;
  annotationEditable?: boolean;
}

const noteCache = new Map<string, CheckinNoteEntry>();
const loadedMonths = new Set<string>();
const loadingMonths = new Map<string, Promise<void>>();
const noteRevision = ref(0);

function getCacheKey(monthInput: unknown, eventKey: string): string {
  const month = getCheckinNoteMonth(monthInput);
  return month && eventKey ? `${month}:${eventKey}` : '';
}

async function loadMonth(monthInput: unknown): Promise<void> {
  const month = getCheckinNoteMonth(monthInput);
  if (!month || loadedMonths.has(month)) {
    return;
  }

  const existingLoad = loadingMonths.get(month);
  if (existingLoad) {
    return existingLoad;
  }

  const load = (async () => {
    const storage = await getCheckinNotes(month);
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

  const getNote = (dateInput: unknown, eventKey: string | undefined): string => {
    // Reading the revision makes timeline computed values react to async loads and saves.
    void noteRevision.value;
    const normalizedEventKey = typeof eventKey === 'string' ? eventKey.trim() : '';
    const cacheKey = getCacheKey(dateInput, normalizedEventKey);
    return cacheKey ? noteCache.get(cacheKey)?.content || '' : '';
  };

  const hydrateTimelineTarget = <T extends CheckinNoteTimelineTarget>(
    target: T,
    dateInput: unknown,
    eventKey: string | undefined
  ): T & CheckinNoteTimelineTarget => {
    const normalizedEventKey = typeof eventKey === 'string' ? eventKey.trim() : '';
    if (!normalizedEventKey) {
      return target;
    }
    return {
      ...target,
      annotationKey: normalizedEventKey,
      annotationDate: typeof dateInput === 'string' ? dateInput : '',
      annotation: getNote(dateInput, normalizedEventKey),
      annotationEditable: true
    };
  };

  const updateNote = async (
    dateInput: unknown,
    eventKeyInput: string | undefined,
    content: string
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
      const entry = await upsertCheckinNote(month, { eventKey, content: normalizedContent });
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
    getNote,
    hydrateTimelineTarget,
    updateNote
  };
}
