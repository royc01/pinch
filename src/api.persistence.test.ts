import type { FocusTimerData, Habit, MoodData } from './api'
import {
  addFocusSession,
  getFocusTimerData,
  getHabits,
  getMoodData,
  saveHabits,
  saveMoodData,
  saveFocusTimerData,
  reorderHabits,
  upsertHabit,
  upsertMoodEntry,
} from './api'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const plugin = vi.hoisted(() => ({
  loadData: vi.fn(),
  saveData: vi.fn(),
}))

vi.mock('@/main', () => ({
  usePlugin: () => plugin,
}))

function clone<T>(value: T): T {
  return value === null || value === undefined
    ? value
    : JSON.parse(JSON.stringify(value)) as T
}

function buildHabit(id: string): Habit {
  return {
    id,
    name: id,
    difficulty: 'easy',
    frequency: 'daily',
    completedToday: false,
    currentStreak: 0,
    totalCompletions: 0,
    calendar: [],
    createdAt: '2026-08-10T00:00:00.000Z',
  }
}

function buildMoodData(date: string): MoodData {
  return {
    [date]: {
      emoji: 'calm',
      note: '',
      timestamp: `${date}T08:00:00.000Z`,
    },
  }
}

const storageReadFailureCases: Array<[
  string,
  () => Promise<unknown>,
  unknown,
  () => Promise<unknown>,
]> = [
  ['habits', () => getHabits(), [], () => saveHabits([])],
  ['mood', () => getMoodData(), {}, () => saveMoodData({})],
  [
    'focus',
    () => getFocusTimerData(),
    { dailyRecords: [], sessionRecords: [] },
    () => addFocusSession(25, null, { sessionId: 'focus-read-failure' }),
  ],
]

describe('JSON data persistence safety', () => {
  beforeEach(async () => {
    plugin.loadData.mockReset().mockResolvedValue(null)
    plugin.saveData.mockReset().mockResolvedValue(undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await getHabits()
    await getMoodData()
    await getFocusTimerData()
    plugin.loadData.mockClear()
    plugin.saveData.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('treats only missing storage as empty data', async () => {
    await expect(getHabits()).resolves.toEqual([])
    await expect(getMoodData()).resolves.toEqual({})
    await expect(getFocusTimerData()).resolves.toEqual({
      dailyRecords: [],
      sessionRecords: [],
    })
  })

  it.each(['', '   '])('treats blank plugin storage as missing data', async (storedValue) => {
    plugin.loadData.mockResolvedValue(storedValue)

    await expect(getHabits()).resolves.toEqual([])
    await expect(getMoodData()).resolves.toEqual({})
    await expect(getFocusTimerData()).resolves.toEqual({
      dailyRecords: [],
      sessionRecords: [],
    })
    expect(console.error).not.toHaveBeenCalled()
  })

  it.each(storageReadFailureCases)(
    'keeps the %s getter fail-soft but blocks a write while storage is unreadable',
    async (_name, read, fallback, mutate) => {
      plugin.loadData.mockRejectedValue(new Error('storage unavailable'))

      await expect(read()).resolves.toEqual(fallback)
      await expect(mutate()).rejects.toThrow('storage unavailable')
      expect(plugin.saveData).not.toHaveBeenCalled()
    },
  )

  it('requires a successful reload before allowing a recovered habit or mood save', async () => {
    plugin.loadData.mockRejectedValueOnce(new Error('habit read failed'))
    await expect(getHabits()).resolves.toEqual([])

    plugin.loadData.mockResolvedValue([buildHabit('habit-existing')])
    await expect(saveHabits([buildHabit('habit-new')])).rejects.toThrow('successful reload')
    expect(plugin.saveData).not.toHaveBeenCalled()

    await expect(getHabits()).resolves.toHaveLength(1)
    await expect(saveHabits([buildHabit('habit-new')])).resolves.toBeUndefined()
    expect(plugin.saveData).toHaveBeenCalledTimes(1)

    plugin.loadData.mockClear()
    plugin.saveData.mockClear()
    plugin.loadData.mockRejectedValueOnce(new Error('mood read failed'))
    await expect(getMoodData()).resolves.toEqual({})

    plugin.loadData.mockResolvedValue({})
    await expect(saveMoodData(buildMoodData('2026-08-10'))).rejects.toThrow('successful reload')
    expect(plugin.saveData).not.toHaveBeenCalled()

    await expect(getMoodData()).resolves.toEqual({})
    await expect(saveMoodData(buildMoodData('2026-08-10'))).resolves.toBeUndefined()
    expect(plugin.saveData).toHaveBeenCalledTimes(1)

    plugin.loadData.mockClear()
    plugin.saveData.mockClear()
    plugin.loadData.mockRejectedValueOnce(new Error('focus read failed'))
    await expect(getFocusTimerData()).resolves.toEqual({
      dailyRecords: [],
      sessionRecords: [],
    })

    plugin.loadData.mockResolvedValue({ dailyRecords: [], sessionRecords: [] })
    await expect(saveFocusTimerData({ dailyRecords: [], sessionRecords: [] }))
      .rejects.toThrow('successful reload')
    expect(plugin.saveData).not.toHaveBeenCalled()

    await expect(getFocusTimerData()).resolves.toEqual({
      dailyRecords: [],
      sessionRecords: [],
    })
    await expect(saveFocusTimerData({ dailyRecords: [], sessionRecords: [] }))
      .resolves.toBeUndefined()
    expect(plugin.saveData).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['habits', () => saveHabits([])],
    ['mood', () => saveMoodData({})],
    ['focus', () => addFocusSession(25, null, { sessionId: 'focus-invalid-json' })],
  ])('does not overwrite %s storage after invalid JSON', async (_name, mutate) => {
    plugin.loadData.mockResolvedValue('{invalid json')

    await expect(mutate()).rejects.toThrow()
    expect(plugin.saveData).not.toHaveBeenCalled()
  })

  it('does not overwrite focus data containing an invalid nested record', async () => {
    plugin.loadData.mockResolvedValue({
      dailyRecords: [{
        date: '2026-08-10',
        sessions: 'invalid',
        minutes: 25,
        timestamp: 1000,
      }],
      sessionRecords: [],
    })

    await expect(addFocusSession(25, null, {
      date: '2026-08-10',
      sessionId: 'focus-nested-corruption',
    })).rejects.toThrow('Invalid daily record')
    expect(plugin.saveData).not.toHaveBeenCalled()
  })

  it('accepts legacy focus data that predates the sessionRecords field', async () => {
    plugin.loadData.mockResolvedValue({
      dailyRecords: [{
        date: '2026-08-10',
        sessions: 1,
        minutes: 25,
        timestamp: 1000,
      }],
    })

    await expect(addFocusSession(30, null, {
      date: '2026-08-10',
      timestamp: 2000,
      sessionId: 'focus-legacy-format',
    })).resolves.toBeUndefined()
    expect(plugin.saveData).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['habits', [{}], () => saveHabits([])],
    [
      'focus',
      {},
      () => addFocusSession(25, null, { sessionId: 'focus-truncated-object' }),
    ],
  ])('does not overwrite structurally incomplete %s data', async (_name, stored, mutate) => {
    plugin.loadData.mockResolvedValue(stored)

    await expect(mutate()).rejects.toThrow('Invalid')
    expect(plugin.saveData).not.toHaveBeenCalled()
  })

  it('serializes focus read-modify-write mutations without losing sessions', async () => {
    let stored: FocusTimerData | null = null
    plugin.loadData.mockImplementation(async () => clone(stored))
    plugin.saveData.mockImplementation(async (_key: string, value: FocusTimerData) => {
      stored = clone(value)
    })

    await Promise.all([
      addFocusSession(25, null, {
        date: '2026-08-10',
        timestamp: 1000,
        sessionId: 'focus-a',
      }),
      addFocusSession(30, null, {
        date: '2026-08-10',
        timestamp: 2000,
        sessionId: 'focus-b',
      }),
    ])

    expect(stored).toEqual({
      dailyRecords: [{
        date: '2026-08-10',
        sessions: 2,
        minutes: 55,
        timestamp: 2000,
      }],
      sessionRecords: [
        expect.objectContaining({ id: 'focus-a', minutes: 25 }),
        expect.objectContaining({ id: 'focus-b', minutes: 30 }),
      ],
    })
  })

  it('preserves unrelated habits across concurrent incremental updates', async () => {
    let stored: Habit[] = []
    plugin.loadData.mockImplementation(async () => clone(stored))
    plugin.saveData.mockImplementation(async (_key: string, value: Habit[]) => {
      stored = clone(value)
    })

    await Promise.all([
      upsertHabit(buildHabit('habit-a')),
      upsertHabit(buildHabit('habit-b')),
    ])

    expect(stored.map(habit => habit.id)).toEqual(['habit-a', 'habit-b'])
  })

  it('reorders the latest habit snapshot without dropping concurrent additions', async () => {
    let stored: Habit[] = [buildHabit('habit-a'), buildHabit('habit-b')]
    plugin.loadData.mockImplementation(async () => clone(stored))
    plugin.saveData.mockImplementation(async (_key: string, value: Habit[]) => {
      stored = clone(value)
    })

    await Promise.all([
      reorderHabits(['habit-b', 'habit-a']),
      upsertHabit(buildHabit('habit-c')),
    ])

    expect(stored.map(habit => habit.id)).toEqual(['habit-a', 'habit-b', 'habit-c'])
    expect(stored.find(habit => habit.id === 'habit-b')?.sortOrder).toBe(0)
    expect(stored.find(habit => habit.id === 'habit-a')?.sortOrder).toBe(1)
  })

  it('preserves unrelated dates across concurrent mood updates', async () => {
    let stored: MoodData = {}
    plugin.loadData.mockImplementation(async () => clone(stored))
    plugin.saveData.mockImplementation(async (_key: string, value: MoodData) => {
      stored = clone(value)
    })

    await Promise.all([
      upsertMoodEntry('2026-08-10', buildMoodData('2026-08-10')['2026-08-10']),
      upsertMoodEntry('2026-08-11', buildMoodData('2026-08-11')['2026-08-11']),
    ])

    expect(Object.keys(stored)).toEqual(['2026-08-10', '2026-08-11'])
  })

  it('serializes writes per storage key without blocking other stores', async () => {
    let releaseFirstHabitSave: () => void = () => undefined
    let notifyFirstHabitSaveStarted: () => void = () => undefined
    const firstHabitSaveStarted = new Promise<void>((resolve) => {
      notifyFirstHabitSaveStarted = resolve
    })
    const firstHabitSaveBlocked = new Promise<void>((resolve) => {
      releaseFirstHabitSave = resolve
    })
    let habitSaveCount = 0

    plugin.loadData.mockImplementation(async (key: string) => (
      key === 'Pinch-habit.json' ? [] : {}
    ))
    plugin.saveData.mockImplementation(async (key: string) => {
      if (key === 'Pinch-habit.json' && habitSaveCount++ === 0) {
        notifyFirstHabitSaveStarted()
        await firstHabitSaveBlocked
      }
    })

    const firstHabitSave = saveHabits([buildHabit('habit-a')])
    await firstHabitSaveStarted
    const secondHabitSave = saveHabits([buildHabit('habit-b')])
    const moodSave = saveMoodData(buildMoodData('2026-08-10'))

    await moodSave
    expect(plugin.loadData.mock.calls.filter(([key]) => key === 'Pinch-habit.json')).toHaveLength(1)
    expect(plugin.saveData.mock.calls.some(([key]) => key === 'Pinch-mood.json')).toBe(true)

    releaseFirstHabitSave()
    await Promise.all([firstHabitSave, secondHabitSave])
    expect(plugin.loadData.mock.calls.filter(([key]) => key === 'Pinch-habit.json')).toHaveLength(2)
  })
})
