import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CHECKIN_NOTE_STORAGE_VERSION,
  createCheckinNoteBackup,
  getCheckinNoteMonth,
  getCheckinNoteMonthsInRange,
  getCheckinNotes,
  getCheckinNotesForMonths,
  getCheckinNoteStorageKey,
  migrateCheckinNote,
  normalizeCheckinNotes,
  purgeCheckinNote,
  removeCheckinNote,
  restoreCheckinNote,
  restoreCheckinNoteBackup,
  saveCheckinNotes,
  upsertCheckinNote,
  type CheckinNoteStorage
} from './checkinNoteRepository';

const { mockPlugin } = vi.hoisted(() => ({
  mockPlugin: {
    loadData: vi.fn(),
    saveData: vi.fn()
  }
}));

vi.mock('@/main', () => ({
  usePlugin: () => mockPlugin
}));

describe('check-in note repository', () => {
  beforeEach(() => {
    mockPlugin.loadData.mockReset();
    mockPlugin.saveData.mockReset();
    mockPlugin.saveData.mockResolvedValue(undefined);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-09T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('normalizes month inputs and builds the monthly storage key', () => {
    expect(getCheckinNoteMonth('2026-08')).toBe('2026-08');
    expect(getCheckinNoteMonth('2026-08-09')).toBe('2026-08');
    expect(getCheckinNoteMonth('2026-08-09T23:30:00.000Z')).toBe('2026-08');
    expect(getCheckinNoteMonth('2026-02-30')).toBe('');
    expect(getCheckinNoteMonth('not-a-date')).toBe('');
    expect(getCheckinNoteStorageKey('2026-08-09')).toBe('Pinch-checkin-notes-2026-08.json');
    expect(getCheckinNoteStorageKey('invalid')).toBe('');
  });

  it('enumerates and loads a normalized cross-month range', async () => {
    expect(getCheckinNoteMonthsInRange('2026-06-15', '2026-08-02')).toEqual([
      '2026-06',
      '2026-07',
      '2026-08'
    ]);
    expect(getCheckinNoteMonthsInRange('2026-08-02', '2026-06-15')).toEqual([]);
    expect(getCheckinNoteMonthsInRange('invalid', '2026-08-02')).toEqual([]);

    mockPlugin.loadData.mockResolvedValue(null);
    const loaded = await getCheckinNotesForMonths(['2026-08', 'invalid', '2026-07', '2026-08']);
    expect(loaded.map(storage => storage.month)).toEqual(['2026-07', '2026-08']);
    expect(mockPlugin.loadData.mock.calls.map(([key]) => key)).toEqual([
      'Pinch-checkin-notes-2026-07.json',
      'Pinch-checkin-notes-2026-08.json'
    ]);
  });

  it('normalizes entries, trims content, and keeps event keys unique', () => {
    const storage = normalizeCheckinNotes({
      version: 0,
      updatedAt: ' 2026-08-09T10:00:00.000Z ',
      entries: {
        'habit:read:1': {
          eventKey: ' habit:read:1 ',
          content: '  Read a chapter  ',
          createdAt: ' 2026-08-08T10:00:00.000Z '
        },
        duplicate: {
          eventKey: 'habit:read:1',
          content: 'duplicate content'
        },
        empty: {
          eventKey: 'task:empty',
          content: ' \n '
        }
      }
    }, '2026-08');

    expect(storage).toMatchObject({
      version: CHECKIN_NOTE_STORAGE_VERSION,
      month: '2026-08',
      updatedAt: '2026-08-09T10:00:00.000Z'
    });
    expect(storage.entries).toEqual({
      'habit:read:1': {
        eventKey: 'habit:read:1',
        content: 'Read a chapter',
        createdAt: '2026-08-08T10:00:00.000Z',
        updatedAt: ''
      }
    });
  });

  it('loads legacy JSON-shaped data and always saves the current version', async () => {
    mockPlugin.loadData.mockResolvedValue(JSON.stringify({
      version: 0,
      entries: {
        'focus:session-1': { content: '  Deep work  ' }
      }
    }));

    const loaded = await getCheckinNotes('2026-08');
    expect(mockPlugin.loadData).toHaveBeenCalledWith('Pinch-checkin-notes-2026-08.json');
    expect(loaded.entries['focus:session-1'].content).toBe('Deep work');

    const saved = await saveCheckinNotes('2026-08', loaded);
    expect(saved.version).toBe(CHECKIN_NOTE_STORAGE_VERSION);
    expect(mockPlugin.saveData).toHaveBeenCalledWith(
      'Pinch-checkin-notes-2026-08.json',
      expect.objectContaining({
        version: CHECKIN_NOTE_STORAGE_VERSION,
        month: '2026-08',
        entries: {
          'focus:session-1': expect.objectContaining({ content: 'Deep work' })
        },
        updatedAt: '2026-08-09T12:00:00.000Z'
      })
    );
  });

  it('upserts non-empty content and treats blank content as removal', async () => {
    let stored: CheckinNoteStorage | null = null;
    mockPlugin.loadData.mockImplementation(async () => stored);
    mockPlugin.saveData.mockImplementation(async (_key: string, value: CheckinNoteStorage) => {
      stored = value;
    });

    const created = await upsertCheckinNote('2026-08-09', {
      eventKey: 'habit:read:100',
      content: '  Finished the chapter  '
    });
    expect(created).toMatchObject({
      eventKey: 'habit:read:100',
      content: 'Finished the chapter',
      createdAt: '2026-08-09T12:00:00.000Z',
      updatedAt: '2026-08-09T12:00:00.000Z'
    });
    expect(mockPlugin.saveData).toHaveBeenCalledTimes(1);

    const blankResult = await upsertCheckinNote('2026-08', {
      eventKey: 'habit:read:100',
      content: ' \n '
    });
    expect(blankResult).toBeNull();
    expect(stored?.entries).toEqual({});
    expect(mockPlugin.saveData).toHaveBeenCalledTimes(2);

    await upsertCheckinNote('2026-08', {
      eventKey: 'task:never-noted',
      content: '   '
    });
    expect(mockPlugin.saveData).toHaveBeenCalledTimes(2);
  });

  it('persists the first event context snapshot and preserves it during later edits', async () => {
    let stored: CheckinNoteStorage | null = null;
    mockPlugin.loadData.mockImplementation(async () => stored);
    mockPlugin.saveData.mockImplementation(async (_key: string, value: CheckinNoteStorage) => {
      stored = value;
    });

    await upsertCheckinNote('2026-08', {
      eventKey: 'task:block-1:2026-08-09T10:00:00.000Z',
      content: 'Finished the original task',
      context: {
        type: 'task',
        sourceId: 'block-1',
        occurredAt: '2026-08-09T10:00:00.000Z',
        title: 'Original title',
        meta: 'completed'
      }
    });
    const edited = await upsertCheckinNote('2026-08', {
      eventKey: 'task:block-1:2026-08-09T10:00:00.000Z',
      content: 'Edited reflection',
      context: {
        type: 'task',
        sourceId: 'block-1',
        occurredAt: '2026-08-10T10:00:00.000Z',
        title: 'Renamed title'
      }
    });

    expect(edited).toMatchObject({
      content: 'Edited reflection',
      context: {
        type: 'task',
        sourceId: 'block-1',
        occurredAt: '2026-08-09T10:00:00.000Z',
        title: 'Original title',
        meta: 'completed'
      }
    });
  });

  it('persists favorites and preserves them while editing note content', async () => {
    let stored: CheckinNoteStorage | null = null;
    mockPlugin.loadData.mockImplementation(async () => stored);
    mockPlugin.saveData.mockImplementation(async (_key: string, value: CheckinNoteStorage) => {
      stored = value;
    });

    await upsertCheckinNote('2026-08', {
      eventKey: 'focus:favorited',
      content: 'Useful reflection',
      starred: true
    });
    const edited = await upsertCheckinNote('2026-08', {
      eventKey: 'focus:favorited',
      content: 'Updated reflection'
    });
    expect(edited?.starred).toBe(true);

    const unstarred = await upsertCheckinNote('2026-08', {
      eventKey: 'focus:favorited',
      content: 'Updated reflection',
      starred: false
    });
    expect(unstarred).not.toHaveProperty('starred');
  });

  it('serializes concurrent upserts for the same month without losing entries', async () => {
    let stored: CheckinNoteStorage | null = null;
    mockPlugin.loadData.mockImplementation(async () => stored);
    mockPlugin.saveData.mockImplementation(async (_key: string, value: CheckinNoteStorage) => {
      stored = value;
    });

    await Promise.all([
      upsertCheckinNote('2026-08', { eventKey: 'focus:one', content: 'First' }),
      upsertCheckinNote('2026-08', { eventKey: 'task:two', content: 'Second' })
    ]);

    expect(Object.keys(stored?.entries || {}).sort()).toEqual(['focus:one', 'task:two']);
    expect(mockPlugin.saveData).toHaveBeenCalledTimes(2);
  });

  it('moves an entry to trash, restores it, and only purges it explicitly', async () => {
    let stored: CheckinNoteStorage | null = null;
    mockPlugin.loadData.mockImplementation(async () => stored);
    mockPlugin.saveData.mockImplementation(async (_key: string, value: CheckinNoteStorage) => {
      stored = value;
    });

    await upsertCheckinNote('2026-08', { eventKey: 'task:done', content: 'Done' });
    expect(await removeCheckinNote('2026-08', 'task:done')).toBe(true);
    expect(await removeCheckinNote('2026-08', 'task:done')).toBe(false);
    expect(stored?.entries).toEqual({});
    expect(stored?.trash['task:done']).toMatchObject({ content: 'Done', deletedAt: '2026-08-09T12:00:00.000Z' });

    expect(await restoreCheckinNote('2026-08', 'task:done')).toMatchObject({ content: 'Done' });
    expect(stored?.entries['task:done']).toMatchObject({ content: 'Done' });
    expect(stored?.trash).toEqual({});

    await removeCheckinNote('2026-08', 'task:done');
    expect(await purgeCheckinNote('2026-08', 'task:done')).toBe(true);
    expect(stored?.trash).toEqual({});
    expect(mockPlugin.saveData).toHaveBeenCalledTimes(5);
  });

  it('creates a structured backup and merges it without deleting local-only notes', async () => {
    const storedByKey = new Map<string, CheckinNoteStorage>();
    storedByKey.set('Pinch-checkin-notes-2026-08.json', normalizeCheckinNotes({
      entries: { 'focus:local': { content: 'Local only' } }
    }, '2026-08'));
    mockPlugin.loadData.mockImplementation(async (key: string) => storedByKey.get(key) || null);
    mockPlugin.saveData.mockImplementation(async (key: string, value: CheckinNoteStorage) => {
      storedByKey.set(key, value);
    });
    const backup = createCheckinNoteBackup([
      normalizeCheckinNotes({
        entries: { 'task:backup': { content: 'From backup' } },
        trash: {
          'habit:deleted': {
            eventKey: 'habit:deleted', content: 'Deleted backup note', createdAt: '', updatedAt: '',
            deletedAt: '2026-07-01T00:00:00.000Z'
          }
        }
      }, '2026-08')
    ]);

    await expect(restoreCheckinNoteBackup(JSON.stringify(backup))).resolves.toEqual(['2026-08']);
    expect(storedByKey.get('Pinch-checkin-notes-2026-08.json')).toMatchObject({
      entries: {
        'focus:local': expect.objectContaining({ content: 'Local only' }),
        'task:backup': expect.objectContaining({ content: 'From backup' })
      },
      trash: {
        'habit:deleted': expect.objectContaining({ content: 'Deleted backup note' })
      }
    });
    await expect(restoreCheckinNoteBackup({ version: 1, months: [] }))
      .rejects.toThrow('Invalid check-in note backup');
  });

  it('migrates a legacy habit occurrence key without losing its note', async () => {
    let stored: CheckinNoteStorage | null = {
      version: CHECKIN_NOTE_STORAGE_VERSION,
      month: '2026-08',
      entries: {
        'habit:water:2026-08-09:2': {
          eventKey: 'habit:water:2026-08-09:2',
          content: 'Second glass after lunch',
          createdAt: '2026-08-09T04:00:00.000Z',
          updatedAt: '2026-08-09T04:00:00.000Z'
        }
      },
      trash: {},
      updatedAt: '2026-08-09T04:00:00.000Z'
    };
    mockPlugin.loadData.mockImplementation(async () => stored);
    mockPlugin.saveData.mockImplementation(async (_key: string, value: CheckinNoteStorage) => {
      stored = value;
    });

    const migrated = await migrateCheckinNote(
      '2026-08-09',
      'habit:water:1723179600000',
      ['habit:water:2026-08-09:2']
    );

    expect(migrated).toEqual({
      eventKey: 'habit:water:1723179600000',
      content: 'Second glass after lunch',
      createdAt: '2026-08-09T04:00:00.000Z',
      updatedAt: '2026-08-09T04:00:00.000Z'
    });
    expect(stored?.entries).toEqual({
      'habit:water:1723179600000': migrated
    });
  });

  it('keeps the current note when both current and legacy habit keys exist', async () => {
    let stored: CheckinNoteStorage | null = {
      version: CHECKIN_NOTE_STORAGE_VERSION,
      month: '2026-08',
      entries: {
        'habit:water:1723179600000': {
          eventKey: 'habit:water:1723179600000', content: 'Current note', createdAt: '', updatedAt: ''
        },
        'habit:water:2026-08-09:2': {
          eventKey: 'habit:water:2026-08-09:2', content: 'Legacy note', createdAt: '', updatedAt: ''
        }
      },
      trash: {},
      updatedAt: ''
    };
    mockPlugin.loadData.mockImplementation(async () => stored);
    mockPlugin.saveData.mockImplementation(async (_key: string, value: CheckinNoteStorage) => {
      stored = value;
    });

    await migrateCheckinNote('2026-08', 'habit:water:1723179600000', ['habit:water:2026-08-09:2']);
    expect(stored?.entries).toEqual({
      'habit:water:1723179600000': expect.objectContaining({ content: 'Current note' })
    });
  });

  it('serves the last good snapshot when a read-only refresh fails', async () => {
    const stored: CheckinNoteStorage = {
      version: CHECKIN_NOTE_STORAGE_VERSION,
      month: '2026-09',
      entries: {
        'focus:last-good': {
          eventKey: 'focus:last-good',
          content: 'Keep this visible',
          createdAt: '2026-09-01T00:00:00.000Z',
          updatedAt: '2026-09-01T00:00:00.000Z'
        }
      },
      trash: {},
      updatedAt: '2026-09-01T00:00:00.000Z'
    };
    mockPlugin.loadData.mockResolvedValueOnce(stored).mockRejectedValueOnce(new Error('temporary read failure'));

    await expect(getCheckinNotes('2026-09')).resolves.toEqual(stored);
    await expect(getCheckinNotes('2026-09')).resolves.toEqual(stored);
    expect(mockPlugin.saveData).not.toHaveBeenCalled();
  });

  it('shows valid entries from mixed storage while mutations still fail closed', async () => {
    mockPlugin.loadData.mockResolvedValue({
      version: CHECKIN_NOTE_STORAGE_VERSION,
      month: '2026-10',
      entries: {
        'focus:valid': { content: '  Preserve this  ' },
        'focus:broken': { updatedAt: 'missing content' }
      },
      updatedAt: ''
    });

    await expect(getCheckinNotes('2026-10')).resolves.toEqual(expect.objectContaining({
      entries: {
        'focus:valid': expect.objectContaining({ content: 'Preserve this' })
      }
    }));
    await expect(upsertCheckinNote('2026-10', 'focus:new', 'Do not overwrite'))
      .rejects.toThrow('Invalid check-in note entries');
    expect(mockPlugin.saveData).not.toHaveBeenCalled();
  });

  it.each([
    ['an API error envelope', { code: -1, msg: 'read failed', data: null }],
    ['a malformed wrapper', {
      version: CHECKIN_NOTE_STORAGE_VERSION,
      month: '2026-11',
      updatedAt: ''
    }],
    ['a primitive value', 42]
  ])('does not replace last-good data with %s', async (_label, invalidValue) => {
    const stored: CheckinNoteStorage = {
      version: CHECKIN_NOTE_STORAGE_VERSION,
      month: '2026-11',
      entries: {
        'focus:last-good-envelope': {
          eventKey: 'focus:last-good-envelope',
          content: 'Keep this visible',
          createdAt: '',
          updatedAt: ''
        }
      },
      trash: {},
      updatedAt: ''
    };
    mockPlugin.loadData.mockResolvedValueOnce(stored).mockResolvedValueOnce(invalidValue);

    await expect(getCheckinNotes('2026-11')).resolves.toEqual(stored);
    await expect(getCheckinNotes('2026-11')).resolves.toEqual(stored);
    expect(mockPlugin.saveData).not.toHaveBeenCalled();
  });

  it.each([
    ['upsert', () => upsertCheckinNote('2026-10', 'focus:read-failure', 'Do not overwrite')],
    ['remove', () => removeCheckinNote('2026-11', 'focus:read-failure')],
    ['full save', () => saveCheckinNotes('2026-12', {
      version: CHECKIN_NOTE_STORAGE_VERSION,
      month: '2026-12',
      entries: {},
      updatedAt: ''
    })]
  ])('fails closed when %s cannot read its storage', async (_label, operation) => {
    mockPlugin.loadData.mockRejectedValue(new Error('storage unavailable'));

    await expect(operation()).rejects.toThrow('storage unavailable');
    expect(mockPlugin.saveData).not.toHaveBeenCalled();
  });

  it('fails closed on invalid JSON and preserves the stored value', async () => {
    mockPlugin.loadData.mockResolvedValue('{not valid JSON');

    await expect(upsertCheckinNote('2027-01', 'focus:invalid-json', 'Do not overwrite'))
      .rejects.toThrow(SyntaxError);
    expect(mockPlugin.saveData).not.toHaveBeenCalled();
  });

  it('fails closed when persisted entries contain an invalid record', async () => {
    mockPlugin.loadData.mockResolvedValue({
      version: CHECKIN_NOTE_STORAGE_VERSION,
      month: '2027-02',
      entries: {
        'focus:valid': { content: 'Preserve this' },
        'focus:broken': { updatedAt: 'missing content' }
      }
    });

    await expect(upsertCheckinNote('2027-02', 'focus:new', 'Do not overwrite'))
      .rejects.toThrow('Invalid check-in note entries');
    expect(mockPlugin.saveData).not.toHaveBeenCalled();
  });

  it('recovers the month queue after a failed strict read', async () => {
    let readCount = 0;
    let stored: CheckinNoteStorage | null = null;
    mockPlugin.loadData.mockImplementation(async () => {
      readCount += 1;
      if (readCount === 1) {
        throw new Error('temporary read failure');
      }
      return stored;
    });
    mockPlugin.saveData.mockImplementation(async (_key: string, value: CheckinNoteStorage) => {
      stored = value;
    });

    await expect(upsertCheckinNote('2027-03', 'focus:first', 'First attempt'))
      .rejects.toThrow('temporary read failure');
    await expect(upsertCheckinNote('2027-03', 'focus:second', 'Second attempt'))
      .resolves.toEqual(expect.objectContaining({ eventKey: 'focus:second' }));

    expect(stored?.entries).toEqual({
      'focus:second': expect.objectContaining({ content: 'Second attempt' })
    });
    expect(mockPlugin.saveData).toHaveBeenCalledTimes(1);
  });

  it('does not expose a failed write through the last-good read snapshot', async () => {
    const existing: CheckinNoteStorage = {
      version: CHECKIN_NOTE_STORAGE_VERSION,
      month: '2027-04',
      entries: {
        'focus:existing': {
          eventKey: 'focus:existing',
          content: 'Existing note',
          createdAt: '',
          updatedAt: ''
        }
      },
      trash: {},
      updatedAt: ''
    };
    let loadCount = 0;
    mockPlugin.loadData.mockImplementation(async () => {
      loadCount += 1;
      if (loadCount <= 2) {
        return existing;
      }
      throw new Error('storage unavailable');
    });
    mockPlugin.saveData.mockRejectedValue(new Error('write failed'));

    await expect(getCheckinNotes('2027-04')).resolves.toEqual(existing);
    await expect(upsertCheckinNote('2027-04', 'focus:new', 'Unsaved note'))
      .rejects.toThrow('write failed');
    await expect(getCheckinNotes('2027-04')).resolves.toEqual(existing);
  });
});
