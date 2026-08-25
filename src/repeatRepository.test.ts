import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RepeatRecord, RepeatSeries, RepeatTaskLike } from './repeatRepository';

const REPEAT_SERIES_FILE = 'Pinch-repeat-series.json';
const REPEAT_RECORDS_FILE = 'Pinch-repeat-records.json';

const { mockPlugin } = vi.hoisted(() => ({
  mockPlugin: {
    loadData: vi.fn(),
    saveData: vi.fn()
  }
}));

vi.mock('@/main', () => ({
  usePlugin: () => mockPlugin
}));

function cloneStoredValue<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function installMemoryStorage(initial: Record<string, unknown> = {}): Map<string, unknown> {
  const stored = new Map<string, unknown>(
    Object.entries(initial).map(([key, value]) => [key, cloneStoredValue(value)])
  );
  mockPlugin.loadData.mockImplementation(async (key: string) => {
    return cloneStoredValue(stored.has(key) ? stored.get(key) : null);
  });
  mockPlugin.saveData.mockImplementation(async (key: string, value: unknown) => {
    await Promise.resolve();
    stored.set(key, cloneStoredValue(value));
  });
  return stored;
}

function createTask(id: string): RepeatTaskLike {
  return {
    id,
    blockId: `block-${id}`,
    type: 'block',
    title: `Task ${id}`,
    status: 'in-progress',
    priority: 'none',
    startDate: '2026-08-10',
    dueDate: '2026-08-10',
    tags: [],
    createdAt: '2026-08-10T00:00:00.000Z',
    updatedAt: '2026-08-10T00:00:00.000Z'
  };
}

describe('repeat repository storage safety', () => {
  let repository: typeof import('./repeatRepository');

  beforeEach(async () => {
    vi.resetModules();
    mockPlugin.loadData.mockReset();
    mockPlugin.saveData.mockReset();
    repository = await import('./repeatRepository');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('treats a missing series file as an empty collection that can be initialized', async () => {
    const stored = installMemoryStorage();

    await repository.setTaskRepeatSeries(createTask('one'), 'daily');

    const series = stored.get(REPEAT_SERIES_FILE) as RepeatSeries[];
    expect(series).toHaveLength(1);
    expect(series[0].templateTaskId).toBe('one');
    expect(mockPlugin.saveData).toHaveBeenCalledTimes(1);
  });

  it('shares concurrent repeat-storage reads', async () => {
    let releaseSeriesRead!: () => void;
    const pendingSeriesRead = new Promise<unknown>(resolve => {
      releaseSeriesRead = () => resolve([]);
    });
    mockPlugin.loadData.mockImplementation((key: string) => {
      if (key === REPEAT_SERIES_FILE) return pendingSeriesRead;
      return Promise.resolve([]);
    });

    const first = repository.loadRepeatSeries();
    const second = repository.loadRepeatSeries();

    expect(mockPlugin.loadData).toHaveBeenCalledTimes(1);
    releaseSeriesRead();
    await expect(Promise.all([first, second])).resolves.toEqual([[], []]);
  });

  it.each(['', '   '])('treats a blank series file as missing storage', async (storedValue) => {
    mockPlugin.loadData.mockResolvedValue(storedValue);
    mockPlugin.saveData.mockResolvedValue(undefined);

    await expect(repository.setTaskRepeatSeries(createTask('one'), 'daily')).resolves.not.toBeNull();
    expect(mockPlugin.saveData).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['read error', () => Promise.reject(new Error('disk unavailable')), /read failed/],
    ['invalid JSON', () => Promise.resolve('{not valid JSON'), /parse failed/]
  ])('does not overwrite series after a %s', async (_label, loadResult, expectedError) => {
    mockPlugin.loadData.mockImplementation(loadResult);
    mockPlugin.saveData.mockResolvedValue(undefined);

    await expect(repository.setTaskRepeatSeries(createTask('one'), 'daily'))
      .rejects.toThrow(expectedError);
    expect(mockPlugin.saveData).not.toHaveBeenCalled();
  });

  it.each([
    [
      'series',
      REPEAT_SERIES_FILE,
      [{ frequency: 'daily' }],
      () => repository.saveRepeatSeries([]),
      /invalid repeat series/
    ],
    [
      'records',
      REPEAT_RECORDS_FILE,
      [{ seriesId: 'series-one', date: 'not-a-date', status: 'completed' }],
      () => repository.saveRepeatRecords([]),
      /invalid repeat record/
    ]
  ])('strictly reloads %s before a public snapshot save', async (
    _label,
    storageKey,
    invalidStoredValue,
    save,
    expectedError
  ) => {
    mockPlugin.loadData.mockImplementation(async (key: string) => (
      key === storageKey ? invalidStoredValue : null
    ));
    mockPlugin.saveData.mockResolvedValue(undefined);

    await expect(save()).rejects.toThrow(expectedError);
    expect(mockPlugin.saveData).not.toHaveBeenCalled();
  });

  it('can defer repeat change events until a caller finishes related writes', async () => {
    installMemoryStorage();
    const { eventBus, Events } = await import('./utils/eventBus');
    const repeatEvents: Array<Record<string, unknown>> = [];
    const unsubscribe = eventBus.on(Events.TASK_ADDED, (payload) => {
      if (payload?.reason === 'repeat-changed') {
        repeatEvents.push(payload);
      }
    });

    await repository.setTaskRepeatSeries(createTask('deferred'), 'daily', { emitChange: false });

    expect(repeatEvents).toEqual([]);
    unsubscribe();
  });

  it('serializes concurrent series mutations without losing either task', async () => {
    const stored = installMemoryStorage();

    await Promise.all([
      repository.setTaskRepeatSeries(createTask('one'), 'daily'),
      repository.setTaskRepeatSeries(createTask('two'), 'weekly')
    ]);

    const series = stored.get(REPEAT_SERIES_FILE) as RepeatSeries[];
    expect(series.map((item) => item.templateTaskId).sort()).toEqual(['one', 'two']);
    expect(mockPlugin.saveData).toHaveBeenCalledTimes(2);
  });

  it('does not overwrite instance records when their storage read fails', async () => {
    const stored = installMemoryStorage();
    const series = await repository.setTaskRepeatSeries(createTask('one'), 'daily');
    mockPlugin.loadData.mockImplementation(async (key: string) => {
      if (key === REPEAT_RECORDS_FILE) {
        throw new Error('records unavailable');
      }
      return cloneStoredValue(stored.has(key) ? stored.get(key) : null);
    });
    mockPlugin.saveData.mockClear();

    await expect(repository.setRepeatInstanceStatus(series!.id, '2026-08-11', 'completed'))
      .rejects.toThrow(/read failed/);
    expect(mockPlugin.saveData).not.toHaveBeenCalled();
    expect(stored.has(REPEAT_RECORDS_FILE)).toBe(false);
  });

  it('serializes concurrent instance mutations without losing either record', async () => {
    const stored = installMemoryStorage();
    const series = await repository.setTaskRepeatSeries(createTask('one'), 'daily');
    mockPlugin.saveData.mockClear();

    await Promise.all([
      repository.setRepeatInstanceStatus(series!.id, '2026-08-11', 'completed'),
      repository.setRepeatInstanceStatus(series!.id, '2026-08-12', 'cancelled')
    ]);

    const records = stored.get(REPEAT_RECORDS_FILE) as RepeatRecord[];
    expect(records.map((record) => record.date).sort()).toEqual(['2026-08-11', '2026-08-12']);
    expect(mockPlugin.saveData).toHaveBeenCalledTimes(2);
  });

  it('returns the persisted completion timestamp for a completed instance', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-11T09:30:00.000Z'));
    installMemoryStorage();
    const series = await repository.setTaskRepeatSeries(createTask('one'), 'daily');

    await expect(repository.setRepeatInstanceStatus(series!.id, '2026-08-11', 'completed'))
      .resolves.toBe('2026-08-11T09:30:00.000Z');
  });

  it('automates unmodified instance status only inside its start and due time', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 11, 9, 30));
    installMemoryStorage();
    const templateTask = {
      ...createTask('scheduled'),
      status: 'pending' as const,
      startDate: '2026-08-09',
      dueDate: '2026-08-09',
      startTime: '09:00',
      dueTime: '10:00'
    };
    const series = await repository.setTaskRepeatSeries(templateTask, 'daily');

    let tasks = await repository.materializeRepeatTasks([templateTask], {
      startDate: '2026-08-09',
      endDate: '2026-08-12'
    });
    expect(tasks.find(item => item.repeatInstanceDate === '2026-08-10')?.status).toBe('delayed');
    expect(tasks.find(item => item.repeatInstanceDate === '2026-08-11')?.status).toBe('in-progress');
    expect(tasks.find(item => item.repeatInstanceDate === '2026-08-12')?.status).toBe('pending');

    await repository.setRepeatInstanceStatus(series!.id, '2026-08-11', 'pending');
    vi.advanceTimersByTime(2 * 60 * 60 * 1000);
    tasks = await repository.materializeRepeatTasks([templateTask], {
      startDate: '2026-08-09',
      endDate: '2026-08-12'
    });
    expect(tasks.find(item => item.repeatInstanceDate === '2026-08-11')?.status).toBe('pending');

    const records = await repository.loadRepeatRecords();
    expect(records).toEqual(expect.arrayContaining([
      expect.objectContaining({
        seriesId: series!.id,
        date: '2026-08-11',
        status: 'pending'
      })
    ]));
  });

  it('includes an overdue instance in a completion window when it was completed during that window', async () => {
    vi.useFakeTimers();
    installMemoryStorage();
    const templateTask = {
      ...createTask('overdue'),
      startDate: '2026-07-01',
      dueDate: '2026-07-01'
    };
    const series = await repository.setTaskRepeatSeries(templateTask, 'daily');
    vi.setSystemTime(new Date('2026-08-11T09:30:00.000Z'));
    await repository.setRepeatInstanceStatus(series!.id, '2026-07-31', 'completed');

    const tasks = await repository.materializeRepeatTasks([templateTask], {
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      includeCompletedOutsideRange: true
    });

    expect(tasks).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: `repeat_${series!.id}_2026-07-31`.replace(/[^a-zA-Z0-9_-]/g, '_'),
        status: 'completed',
        completedAt: '2026-08-11T09:30:00.000Z'
      })
    ]));
  });

  it('serves stale read caches after storage fails while mutations still fail closed', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-10T00:00:00.000Z'));
    installMemoryStorage();
    const series = await repository.setTaskRepeatSeries(createTask('one'), 'daily');
    await repository.setRepeatInstanceStatus(series!.id, '2026-08-11', 'completed');

    vi.advanceTimersByTime(6000);
    mockPlugin.loadData.mockRejectedValue(new Error('storage unavailable'));
    mockPlugin.saveData.mockClear();

    await expect(repository.loadRepeatSeries()).resolves.toEqual([
      expect.objectContaining({ templateTaskId: 'one' })
    ]);
    await expect(repository.loadRepeatRecords()).resolves.toEqual([
      expect.objectContaining({ date: '2026-08-11', status: 'completed' })
    ]);
    await expect(repository.setTaskRepeatSeries(createTask('two'), 'weekly'))
      .rejects.toThrow(/read failed/);
    expect(mockPlugin.saveData).not.toHaveBeenCalled();
  });

  it('updates instance records when series metadata cannot be read', async () => {
    const stored = installMemoryStorage();
    mockPlugin.loadData.mockImplementation(async (key: string) => {
      if (key === REPEAT_SERIES_FILE) {
        throw new Error('series unavailable');
      }
      return cloneStoredValue(stored.has(key) ? stored.get(key) : null);
    });

    await repository.setRepeatInstanceStatus('series-without-metadata', '2026-08-11', 'completed');

    expect(stored.get(REPEAT_RECORDS_FILE)).toEqual([
      expect.objectContaining({
        seriesId: 'series-without-metadata',
        date: '2026-08-11',
        status: 'completed'
      })
    ]);
  });

  it('cleans orphan records and emits the deletion after a partial delete is retried', async () => {
    const task = createTask('one');
    const stored = installMemoryStorage();
    const series = await repository.setTaskRepeatSeries(task, 'daily');
    await repository.setRepeatInstanceStatus(series!.id, '2026-08-11', 'completed');
    const { eventBus, Events } = await import('./utils/eventBus');
    const repeatEvents: Array<Record<string, unknown>> = [];
    const unsubscribe = eventBus.on(Events.TASK_ADDED, (payload) => {
      if (payload?.reason === 'repeat-changed') {
        repeatEvents.push(payload);
      }
    });
    const writeOrder: string[] = [];
    mockPlugin.saveData.mockClear();
    mockPlugin.saveData.mockImplementation(async (key: string, value: unknown) => {
      writeOrder.push(key);
      if (key === REPEAT_RECORDS_FILE) {
        throw new Error('record cleanup failed');
      }
      stored.set(key, cloneStoredValue(value));
    });

    await expect(repository.setTaskRepeatSeries(task, 'none'))
      .rejects.toThrow(/write failed/);

    expect(writeOrder).toEqual([REPEAT_SERIES_FILE, REPEAT_RECORDS_FILE]);
    expect(stored.get(REPEAT_SERIES_FILE)).toEqual([]);
    expect(stored.get(REPEAT_RECORDS_FILE)).toEqual([
      expect.objectContaining({ seriesId: series!.id, date: '2026-08-11' })
    ]);
    expect(repeatEvents).toEqual([]);

    mockPlugin.saveData.mockClear();
    mockPlugin.saveData.mockImplementation(async (key: string, value: unknown) => {
      stored.set(key, cloneStoredValue(value));
    });

    await expect(repository.setTaskRepeatSeries({
      ...task,
      repeatSeriesId: series!.id
    }, 'none')).resolves.toBeNull();

    expect(mockPlugin.saveData).toHaveBeenCalledTimes(1);
    expect(mockPlugin.saveData).toHaveBeenCalledWith(REPEAT_RECORDS_FILE, []);
    expect(stored.get(REPEAT_SERIES_FILE)).toEqual([]);
    expect(stored.get(REPEAT_RECORDS_FILE)).toEqual([]);
    expect(repeatEvents).toEqual([
      expect.objectContaining({
        reason: 'repeat-changed',
        blockId: task.blockId,
        seriesId: series!.id,
        frequency: 'none'
      })
    ]);
    unsubscribe();
  });

  it('keeps mixed invalid series data untouched during mutations', async () => {
    const stored = installMemoryStorage();
    await repository.setTaskRepeatSeries(createTask('one'), 'daily');
    (stored.get(REPEAT_SERIES_FILE) as unknown[]).push({ frequency: 'daily' });
    mockPlugin.saveData.mockClear();

    await expect(repository.setTaskRepeatSeries(createTask('two'), 'weekly'))
      .rejects.toThrow(/invalid repeat series/);
    expect(mockPlugin.saveData).not.toHaveBeenCalled();
    expect(stored.get(REPEAT_SERIES_FILE)).toHaveLength(2);
  });

  it('keeps mixed invalid record data untouched during mutations', async () => {
    const stored = installMemoryStorage();
    const series = await repository.setTaskRepeatSeries(createTask('one'), 'daily');
    await repository.setRepeatInstanceStatus(series!.id, '2026-08-11', 'completed');
    (stored.get(REPEAT_RECORDS_FILE) as unknown[]).push({
      seriesId: series!.id,
      date: 'not-a-date',
      status: 'completed'
    });
    mockPlugin.saveData.mockClear();

    await expect(repository.setRepeatInstanceStatus(series!.id, '2026-08-12', 'completed'))
      .rejects.toThrow(/invalid repeat record/);
    expect(mockPlugin.saveData).not.toHaveBeenCalled();
    expect(stored.get(REPEAT_RECORDS_FILE)).toHaveLength(2);
  });
});
