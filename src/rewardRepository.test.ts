import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  awardTaskCompletion,
  getRewardSnapshot,
  type RewardBadge,
  type RewardLedgerEntry,
  type RewardSource,
  type RewardState
} from './rewardRepository';

const { mockPlugin } = vi.hoisted(() => ({
  mockPlugin: {
    loadData: vi.fn(),
    saveData: vi.fn()
  }
}));

vi.mock('@/main', () => ({
  usePlugin: () => mockPlugin
}));

function createLedgerEntries(
  kind: string,
  count: number,
  source: RewardSource,
  metaFactory?: (index: number) => Record<string, string | number | boolean> | undefined
): RewardLedgerEntry[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${kind}-${index + 1}`,
    eventKey: `${kind}-event-${index + 1}`,
    source,
    kind,
    title: `${kind}-${index + 1}`,
    xp: 1,
    coins: 0,
    createdAt: '2026-04-25T00:00:00.000Z',
    meta: metaFactory?.(index)
  }));
}

function createBadge(
  id: string,
  title: string,
  description: string,
  icon: string,
  unlockedAt: string
): RewardBadge {
  return {
    id,
    title,
    description,
    icon,
    unlockedAt
  };
}

function createRewardState(overrides: Partial<RewardState> = {}): RewardState {
  return {
    version: 1,
    totalXp: 0,
    totalCoins: 0,
    spentCoins: 0,
    ledger: [],
    stats: {
      habitCompletionCount: 0,
      maxHabitStreak: 0,
      taskCompletionCount: 0,
      focusSessionCount: 0
    },
    badges: [],
    shopItems: [],
    redemptions: [],
    processedEventKeys: [],
    updatedAt: '2026-04-25T00:00:00.000Z',
    ...overrides
  };
}

describe('reward badge groups', () => {
  beforeEach(() => {
    mockPlugin.loadData.mockReset();
    mockPlugin.saveData.mockReset();
    mockPlugin.saveData.mockResolvedValue(undefined);
  });

  it('keeps at most one highest badge per group in the snapshot', async () => {
    const state = createRewardState({
      totalXp: 2400,
      ledger: [
        ...createLedgerEntries('habit-target', 100, 'habit'),
        ...createLedgerEntries('habit-streak', 1, 'habit', () => ({ streak: 100 })),
        ...createLedgerEntries('task-complete', 100, 'task'),
        ...createLedgerEntries('focus-session', 50, 'focus')
      ],
      badges: [
        createBadge('habit-starter', '习惯起步', '首次完成一个习惯目标', 'HB', '2026-04-01T00:00:00.000Z'),
        createBadge('streak-keeper', '连续守住', '任一习惯达成 7 天连续', 'ST', '2026-04-02T00:00:00.000Z'),
        createBadge('task-closer', '任务收割机', '累计完成 10 个任务', 'TK', '2026-04-03T00:00:00.000Z'),
        createBadge('focus-rookie', '专注入门', '累计完成 5 次专注', 'FC', '2026-04-04T00:00:00.000Z'),
        createBadge('level-five', '升级中', '奖励等级达到 5 级', 'LV', '2026-04-05T00:00:00.000Z')
      ]
    });

    mockPlugin.loadData.mockResolvedValue(state);

    const snapshot = await getRewardSnapshot(true);

    expect(snapshot.badges.map(badge => badge.id)).toEqual([
      'habit-master',
      'streak-legend',
      'task-master',
      'focus-master',
      'level-fifteen'
    ]);
    expect(snapshot.badges).toHaveLength(5);
    expect(mockPlugin.saveData).toHaveBeenCalledTimes(1);
  });

  it('replaces the old badge with the higher tier inside the same group', async () => {
    const state = createRewardState({
      ledger: createLedgerEntries('task-complete', 49, 'task'),
      badges: [
        createBadge('task-closer', '任务收割机', '累计完成 10 个任务', 'TK', '2026-04-01T00:00:00.000Z')
      ]
    });

    mockPlugin.loadData.mockResolvedValue(state);
    await getRewardSnapshot(true);
    mockPlugin.saveData.mockClear();

    const result = await awardTaskCompletion({
      id: 'task-50',
      title: 'Finish report',
      priority: 'none',
      status: 'completed',
      completedAt: '2026-04-25T08:00:00.000Z'
    });

    expect(result.newBadges.map(badge => badge.id)).toEqual(['task-driver']);
    expect(result.snapshot.badges.map(badge => badge.id)).toEqual(['task-driver']);
    expect(mockPlugin.saveData).toHaveBeenCalledTimes(1);

    const savedState = mockPlugin.saveData.mock.calls[0][1] as RewardState;
    expect(savedState.badges).toHaveLength(1);
    expect(savedState.badges[0].id).toBe('task-driver');
  });
});
