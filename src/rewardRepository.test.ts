import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  awardTaskCompletion,
  getRewardSnapshot,
  getRewardWorkbenchData,
  redeemRewardShopItem,
  type RewardBadge,
  type RewardLedgerEntry,
  type RewardSource,
  type RewardState
} from './rewardRepository';
import { eventBus, Events } from '@/utils/eventBus';

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

describe('reward repository', () => {
  beforeEach(() => {
    mockPlugin.loadData.mockReset();
    mockPlugin.saveData.mockReset();
    mockPlugin.saveData.mockResolvedValue(undefined);
  });

  it('returns a consistent cloned workbench history beyond the eight recent records', async () => {
    const state = createRewardState({
      totalXp: 12, totalCoins: 30, spentCoins: 5,
      ledger: createLedgerEntries('system-history', 12, 'system', () => ({ note: 'original' })),
      redemptions: Array.from({ length: 10 }, (_, index) => ({
        id: `redeem-${index}`, itemId: 'shop', itemTitle: 'Reward', cost: 1, redeemedAt: '2026-10-07'
      }))
    });
    mockPlugin.loadData.mockResolvedValue(state);
    const data = await getRewardWorkbenchData(true);
    expect(data.snapshot).toMatchObject({ ledgerCount: 12, totalXp: 12, availableCoins: 25 });
    expect(data.snapshot.recentEntries).toHaveLength(8);
    expect(data.entries).toHaveLength(12);
    expect(data.redemptions).toHaveLength(10);
    data.entries[0].title = 'mutated';
    data.entries[0].meta!.note = 'mutated';
    data.redemptions[0].itemTitle = 'mutated';
    const again = await getRewardWorkbenchData();
    expect(again.entries[0].title).toBe('system-history-1');
    expect(again.entries[0].meta!.note).toBe('original');
    expect(again.redemptions[0].itemTitle).toBe('Reward');
    expect(mockPlugin.saveData).not.toHaveBeenCalled();
  });

  it('rejects unavailable workbench history instead of returning empty data', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      mockPlugin.loadData.mockRejectedValue(new Error('read failed'));
      await expect(getRewardWorkbenchData(true)).rejects.toThrow('read failed');
      expect(mockPlugin.saveData).not.toHaveBeenCalled();
    } finally { errorLog.mockRestore(); }
  });

  it('rejects changed confirmed prices and insufficient fresh balances without saving', async () => {
    const item = { id: 'shop', title: 'Break', cost: 10, createdAt: '2026-10-07', updatedAt: '2026-10-07' };
    mockPlugin.loadData.mockResolvedValue(createRewardState({ totalCoins: 20, shopItems: [item] }));
    await expect(redeemRewardShopItem('shop', 5)).rejects.toThrow();
    expect(mockPlugin.saveData).not.toHaveBeenCalled();
    mockPlugin.loadData.mockResolvedValue(createRewardState({ totalCoins: 20, spentCoins: 15, shopItems: [item] }));
    await expect(redeemRewardShopItem('shop', 10)).rejects.toThrow();
    expect(mockPlugin.saveData).not.toHaveBeenCalled();
  });

  it('persists a confirmed redemption once and publishes the saved balance', async () => {
    mockPlugin.loadData.mockResolvedValue(createRewardState({
      totalCoins: 20, spentCoins: 5,
      shopItems: [{ id: 'shop', title: 'Break', cost: 10, createdAt: '2026-10-07', updatedAt: '2026-10-07' }]
    }));
    const updates = vi.fn();
    const unsubscribe = eventBus.on(Events.REWARDS_UPDATED, updates);
    try {
      const result = await redeemRewardShopItem('shop', 10);
      expect(result.snapshot.availableCoins).toBe(5);
      expect(result.redemption).toMatchObject({ itemId: 'shop', itemTitle: 'Break', cost: 10 });
      expect(mockPlugin.saveData).toHaveBeenCalledTimes(1);
      expect(mockPlugin.saveData.mock.calls[0][1]).toMatchObject({ spentCoins: 15, redemptions: [result.redemption] });
      expect(updates).toHaveBeenCalledTimes(1);
      expect(updates.mock.calls[0][0].snapshot.availableCoins).toBe(5);
    } finally { unsubscribe(); }
  });

  it('does not publish or deduct a redemption when saving fails', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockPlugin.loadData.mockResolvedValue(createRewardState({
      totalCoins: 20,
      shopItems: [{ id: 'shop', title: 'Break', cost: 10, createdAt: '2026-10-07', updatedAt: '2026-10-07' }]
    }));
    await getRewardWorkbenchData(true);
    mockPlugin.saveData.mockRejectedValueOnce(new Error('save failed'));
    const updates = vi.fn();
    const unsubscribe = eventBus.on(Events.REWARDS_UPDATED, updates);
    try {
      await expect(redeemRewardShopItem('shop', 10)).rejects.toThrow('save failed');
      expect(updates).not.toHaveBeenCalled();
      const data = await getRewardWorkbenchData();
      expect(data.snapshot.availableCoins).toBe(20);
      expect(data.redemptions).toHaveLength(0);
    } finally { unsubscribe(); errorLog.mockRestore(); }
  });

  it.each(['', '   '])('treats blank plugin storage as a new reward store', async (storedValue) => {
    mockPlugin.loadData.mockResolvedValue(storedValue);

    const snapshot = await getRewardSnapshot(true);

    expect(snapshot.ledgerCount).toBe(0);
    expect(snapshot.totalXp).toBe(0);
  });

  it('keeps the reward snapshot on lifecycle cancellation but rejects reward writes', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      mockPlugin.loadData.mockResolvedValue(createRewardState({ totalXp: 12, totalCoins: 8 }));
      const snapshot = await getRewardSnapshot(true);
      mockPlugin.saveData.mockClear();
      const ended = { code: 410, msg: 'Plugin lifecycle has ended', data: null };
      mockPlugin.loadData.mockRejectedValue(ended);
      await expect(getRewardSnapshot(true)).resolves.toEqual(snapshot);
      await expect(awardTaskCompletion({
        id: 'cancelled-task', title: 'Cancelled', priority: 'none', status: 'completed', completedAt: '2026-10-06T00:00:00.000Z'
      })).rejects.toBe(ended);
      expect(errorLog).not.toHaveBeenCalled();
      expect(mockPlugin.saveData).not.toHaveBeenCalled();
    } finally {
      errorLog.mockRestore();
    }
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

  it('fails closed when reward data cannot be read', async () => {
    mockPlugin.loadData.mockRejectedValue(new Error('read failed'));

    await expect(awardTaskCompletion({
      id: 'task-read-failure',
      title: 'Do not overwrite rewards',
      priority: 'none',
      status: 'completed',
      completedAt: '2026-04-25T08:00:00.000Z'
    })).rejects.toThrow('read failed');

    expect(mockPlugin.saveData).not.toHaveBeenCalled();
  });

  it('fails closed when persisted reward JSON is invalid', async () => {
    mockPlugin.loadData.mockResolvedValue('{not valid json');

    await expect(awardTaskCompletion({
      id: 'task-invalid-json',
      title: 'Preserve invalid storage for recovery',
      priority: 'none',
      status: 'completed',
      completedAt: '2026-04-25T08:00:00.000Z'
    })).rejects.toBeInstanceOf(SyntaxError);

    expect(mockPlugin.saveData).not.toHaveBeenCalled();
  });

  it.each([
    ['an empty object', {}],
    ['an API error response', { code: -1, msg: 'read failed', data: null }]
  ])('fails closed when reward storage contains %s', async (_label, storedValue) => {
    mockPlugin.loadData.mockResolvedValue(storedValue);

    await expect(awardTaskCompletion({
      id: 'task-invalid-shape',
      title: 'Do not replace invalid storage',
      priority: 'none',
      status: 'completed',
      completedAt: '2026-04-25T08:00:00.000Z'
    })).rejects.toThrow('Invalid reward data');

    expect(mockPlugin.saveData).not.toHaveBeenCalled();
  });

  it('does not rewrite a ledger containing both valid and invalid entries', async () => {
    const validEntry = createLedgerEntries('existing', 1, 'system')[0];
    mockPlugin.loadData.mockResolvedValue(createRewardState({
      ledger: [validEntry, { id: 'incomplete-entry' } as RewardLedgerEntry]
    }));

    await expect(awardTaskCompletion({
      id: 'task-invalid-ledger',
      title: 'Preserve the original ledger',
      priority: 'none',
      status: 'completed',
      completedAt: '2026-04-25T08:00:00.000Z'
    })).rejects.toThrow('invalid ledger entry');

    expect(mockPlugin.saveData).not.toHaveBeenCalled();
  });

  it('migrates a legacy partial state before applying a reward mutation', async () => {
    const existingEntry = createLedgerEntries('task-complete', 1, 'task')[0];
    mockPlugin.loadData.mockResolvedValue({
      totalXp: existingEntry.xp,
      totalCoins: existingEntry.coins,
      spentCoins: 0,
      ledger: [existingEntry]
    });

    await awardTaskCompletion({
      id: 'task-after-legacy-state',
      title: 'Migrate rewards safely',
      priority: 'none',
      status: 'completed',
      completedAt: '2026-04-25T08:00:00.000Z'
    });

    expect(mockPlugin.saveData).toHaveBeenCalledTimes(1);
    const savedState = mockPlugin.saveData.mock.calls[0][1] as RewardState;
    expect(savedState).toEqual(expect.objectContaining({
      version: 1,
      totalXp: 7,
      totalCoins: 1,
      spentCoins: 0,
      redemptions: []
    }));
    expect(savedState.stats.taskCompletionCount).toBe(2);
    expect(savedState.shopItems).toHaveLength(3);
    expect(savedState.ledger.map(entry => entry.eventKey)).toEqual(expect.arrayContaining([
      existingEntry.eventKey,
      'task:task-after-legacy-state:completed'
    ]));
    expect(savedState.processedEventKeys).toEqual(expect.arrayContaining([
      existingEntry.eventKey,
      'task:task-after-legacy-state:completed'
    ]));
  });

  it.each([
    ['missing xp', (entry: Record<string, unknown>) => { delete entry.xp; }],
    ['a string xp', (entry: Record<string, unknown>) => { entry.xp = '1'; }],
    ['missing coins', (entry: Record<string, unknown>) => { delete entry.coins; }],
    ['negative coins', (entry: Record<string, unknown>) => { entry.coins = -1; }],
    ['missing source', (entry: Record<string, unknown>) => { delete entry.source; }],
    ['an unknown source', (entry: Record<string, unknown>) => { entry.source = 'legacy'; }]
  ])('fails closed when a ledger entry has %s', async (_label, corruptEntry) => {
    const entry = { ...createLedgerEntries('existing', 1, 'system')[0] } as Record<string, unknown>;
    corruptEntry(entry);
    mockPlugin.loadData.mockResolvedValue(createRewardState({
      ledger: [entry as unknown as RewardLedgerEntry]
    }));

    await expect(awardTaskCompletion({
      id: 'task-invalid-ledger-fields',
      title: 'Preserve malformed rewards',
      priority: 'none',
      status: 'completed',
      completedAt: '2026-04-25T08:00:00.000Z'
    })).rejects.toThrow('invalid ledger entry');

    expect(mockPlugin.saveData).not.toHaveBeenCalled();
  });

  it('preserves valid JSON-string reward data during mutation', async () => {
    const existingEntry = createLedgerEntries('existing', 1, 'system')[0];
    mockPlugin.loadData.mockResolvedValue(JSON.stringify(createRewardState({
      totalXp: existingEntry.xp,
      ledger: [existingEntry],
      processedEventKeys: [existingEntry.eventKey]
    })));

    await awardTaskCompletion({
      id: 'task-json-string',
      title: 'Keep existing rewards',
      priority: 'none',
      status: 'completed',
      completedAt: '2026-04-25T08:00:00.000Z'
    });

    const savedState = mockPlugin.saveData.mock.calls[0][1] as RewardState;
    expect(savedState.totalXp).toBe(7);
    expect(savedState.ledger.map(entry => entry.eventKey)).toContain(existingEntry.eventKey);
  });

  it('propagates save failures instead of reporting an in-memory success', async () => {
    mockPlugin.loadData.mockResolvedValue(null);
    mockPlugin.saveData.mockRejectedValue(new Error('save failed'));

    await expect(awardTaskCompletion({
      id: 'task-save-failure',
      title: 'Persist this reward',
      priority: 'none',
      status: 'completed',
      completedAt: '2026-04-25T08:00:00.000Z'
    })).rejects.toThrow('save failed');
  });

  it('recovers the mutation queue without exposing a failed optimistic write', async () => {
    const stored = createRewardState();
    mockPlugin.loadData.mockResolvedValue(stored);
    mockPlugin.saveData.mockRejectedValueOnce(new Error('save failed'));

    await expect(awardTaskCompletion({
      id: 'task-failed-save',
      title: 'Failed reward',
      priority: 'none',
      status: 'completed',
      completedAt: '2026-04-25T08:00:00.000Z'
    })).rejects.toThrow('save failed');

    const snapshotAfterFailure = await getRewardSnapshot(false);
    expect(snapshotAfterFailure.totalXp).toBe(0);
    expect(snapshotAfterFailure.ledgerCount).toBe(0);

    const recovered = await awardTaskCompletion({
      id: 'task-after-failure',
      title: 'Recovered reward',
      priority: 'none',
      status: 'completed',
      completedAt: '2026-04-25T08:01:00.000Z'
    });
    expect(recovered.snapshot.totalXp).toBe(6);
    expect(recovered.snapshot.ledgerCount).toBe(1);
    expect(mockPlugin.saveData).toHaveBeenCalledTimes(2);
  });

  it('initializes missing reward data and persists the first mutation', async () => {
    mockPlugin.loadData.mockResolvedValue(null);

    const result = await awardTaskCompletion({
      id: 'task-first-reward',
      title: 'Create reward storage',
      priority: 'none',
      status: 'completed',
      completedAt: '2026-04-25T08:00:00.000Z'
    });

    expect(result.entries).toHaveLength(1);
    expect(mockPlugin.saveData).toHaveBeenCalledTimes(1);
    expect(mockPlugin.saveData).toHaveBeenCalledWith(
      'Pinch-rewards.json',
      expect.objectContaining({
        totalXp: 6,
        totalCoins: 1,
        processedEventKeys: ['task:task-first-reward:completed']
      })
    );
  });

  it('serializes mutations and reloads storage between writes', async () => {
    const externalEntry = createLedgerEntries('external', 1, 'system')[0];
    let stored: RewardState | null = null;
    let saveCount = 0;

    mockPlugin.loadData.mockImplementation(async () => (
      stored ? structuredClone(stored) : null
    ));
    mockPlugin.saveData.mockImplementation(async (_key: string, state: RewardState) => {
      saveCount += 1;
      stored = structuredClone(state);
      if (saveCount === 1) {
        stored.ledger.unshift(externalEntry);
        stored.totalXp += externalEntry.xp;
        stored.processedEventKeys.unshift(externalEntry.eventKey);
      }
    });

    await Promise.all([
      awardTaskCompletion({
        id: 'task-concurrent-one',
        title: 'First concurrent reward',
        priority: 'none',
        status: 'completed',
        completedAt: '2026-04-25T08:00:00.000Z'
      }),
      awardTaskCompletion({
        id: 'task-concurrent-two',
        title: 'Second concurrent reward',
        priority: 'none',
        status: 'completed',
        completedAt: '2026-04-25T08:01:00.000Z'
      })
    ]);

    expect(mockPlugin.loadData).toHaveBeenCalledTimes(2);
    expect(mockPlugin.saveData).toHaveBeenCalledTimes(2);
    expect(stored?.ledger.map(entry => entry.eventKey)).toEqual(expect.arrayContaining([
      'task:task-concurrent-one:completed',
      'task:task-concurrent-two:completed',
      externalEntry.eventKey
    ]));
  });
});
