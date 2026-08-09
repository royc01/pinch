import type { Habit } from './api'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import {
  getHabits,
  saveHabits,
} from './api'

const plugin = vi.hoisted(() => ({
  loadData: vi.fn(),
  saveData: vi.fn(),
}))

vi.mock('@/main', () => ({
  usePlugin: () => plugin,
}))

describe('habit persistence normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 9, 12))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses the same normalization rules when loading and saving habits', async () => {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const rawHabit = {
      id: 'habit-1',
      name: 'Read',
      emoji: 'book',
      noteDocId: '20260222123000-abcdefg',
      emojiColorIndex: '3',
      difficulty: 'hard',
      frequency: 'weekly3',
      customSchedule: {
        type: 'week',
        calendar: 'lunar',
        weekDays: [3, 1, 3],
        monthDays: [2, 40],
        yearDays: ['08-09', '08-09', 'invalid'],
      },
      completionMode: 'atLeast',
      calendar: [
        {
          date: today,
          completed: 1,
          completedCount: 2,
          checkinTimestamps: [10, 11, 12],
          note: ' note ',
        },
        {
          date: '',
          completed: true,
        },
      ],
      currentStreak: 'invalid',
      createdAt: 42,
    }
    const normalizedHabit = {
      id: 'habit-1',
      name: 'Read',
      emoji: 'book',
      emojiColorIndex: 3,
      difficulty: 'hard',
      frequency: 'weekly3',
      customSchedule: {
        type: 'week',
        calendar: 'lunar',
        weekDays: [1, 3],
        monthDays: [2],
        yearDays: ['08-09'],
      },
      completionMode: 'atLeast',
      calendar: [{
        date: today,
        completed: true,
        completedCount: 2,
        checkinTimestamps: [10, 11],
        timestamp: 10,
        note: 'note',
      }],
      completedToday: true,
      currentStreak: 0,
      totalCompletions: 1,
      createdAt: now.toISOString(),
    }

    plugin.loadData.mockResolvedValue([rawHabit, null])

    await expect(getHabits()).resolves.toEqual([normalizedHabit])
    await saveHabits([rawHabit, null] as unknown as Habit[])

    expect(plugin.saveData).toHaveBeenCalledWith('Pinch-habit.json', [normalizedHabit])
  })
})
