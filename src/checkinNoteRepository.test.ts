import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CHECKIN_NOTE_STORAGE_VERSION,
  getCheckinNoteMonth,
  getCheckinNotes,
  getCheckinNoteStorageKey,
  normalizeCheckinNotes,
  removeCheckinNote,
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

  it('removes an existing entry and reports whether anything changed', async () => {
    let stored: CheckinNoteStorage | null = null;
    mockPlugin.loadData.mockImplementation(async () => stored);
    mockPlugin.saveData.mockImplementation(async (_key: string, value: CheckinNoteStorage) => {
      stored = value;
    });

    await upsertCheckinNote('2026-08', { eventKey: 'task:done', content: 'Done' });
    expect(await removeCheckinNote('2026-08', 'task:done')).toBe(true);
    expect(await removeCheckinNote('2026-08', 'task:done')).toBe(false);
    expect(stored?.entries).toEqual({});
    expect(mockPlugin.saveData).toHaveBeenCalledTimes(2);
  });
});

