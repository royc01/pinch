import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  getMoodData: vi.fn(),
  upsertMoodEntry: vi.fn(),
  removeMoodEntry: vi.fn()
}));

vi.mock('@/api', () => api);

import { useMoodTracker } from './useMoodTracker';

describe('useMoodTracker date isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.upsertMoodEntry.mockResolvedValue({});
    api.removeMoodEntry.mockResolvedValue({});
  });

  it('ignores a stale open response after the user switches dates', async () => {
    let resolveFirst: (value: unknown) => void = () => undefined;
    const firstRead = new Promise(resolve => {
      resolveFirst = resolve;
    });
    api.getMoodData
      .mockImplementationOnce(() => firstRead)
      .mockResolvedValueOnce({
        '2026-08-11': { emoji: 'new', note: '', timestamp: 'new-time' }
      });
    const tracker = useMoodTracker();

    const firstOpen = tracker.openMoodTracker('2026-08-10');
    await tracker.openMoodTracker('2026-08-11');
    resolveFirst({
      '2026-08-10': { emoji: 'old', note: '', timestamp: 'old-time' }
    });
    await firstOpen;

    expect(tracker.selectedDate.value).toBe('2026-08-11');
    expect(tracker.moodEntry.value.emoji).toBe('new');
  });

  it('saves to the date captured when submission starts', async () => {
    let resolveRead: (value: unknown) => void = () => undefined;
    api.getMoodData.mockImplementation(() => new Promise(resolve => {
      resolveRead = resolve;
    }));
    const tracker = useMoodTracker();
    tracker.selectedDate.value = '2026-08-10';

    const save = tracker.handleSaveMoodEntry({ emoji: 'calm', note: '' });
    tracker.selectedDate.value = '2026-08-11';
    resolveRead({});
    await save;

    expect(api.upsertMoodEntry).toHaveBeenCalledWith(
      '2026-08-10',
      expect.objectContaining({ emoji: 'calm' })
    );
  });
});
