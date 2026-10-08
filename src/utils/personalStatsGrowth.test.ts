import { describe, expect, it } from 'vitest';
import type { RewardLedgerEntry, RewardRedemption } from '@/rewardRepository';
import { sortGrowthEntries, sortGrowthRedemptions, summarizeGrowthPeriod } from './personalStatsGrowth';

function entry(id: string, createdAt: string, overrides: Partial<RewardLedgerEntry> = {}): RewardLedgerEntry {
  return { id, eventKey: id, source: 'task', kind: 'task-complete', title: id, xp: 5, coins: 2, createdAt, ...overrides };
}

describe('personalStatsGrowth', () => {
  it('counts all retained rewards and groups their sources without counting duplicate IDs', () => {
    const entries = Array.from({ length: 12 }, (_, i) => entry(`${i}`, '2026-10-07', { source: i < 9 ? 'task' : 'habit' }));
    const period = summarizeGrowthPeriod([...entries, { ...entries[0], xp: 10 }], '2026-10-01', '2026-11-01', new Date(2026, 9, 8));
    expect(period).toMatchObject({ count: 12, xp: 65, coins: 24, activeDays: 1 });
    expect(period.sources).toEqual([
      { source: 'habit', count: 3, xp: 15, coins: 6 },
      { source: 'task', count: 9, xp: 50, coins: 18 },
      { source: 'focus', count: 0, xp: 0, coins: 0 },
      { source: 'system', count: 0, xp: 0, coins: 0 }
    ]);
  });

  it('uses local days, an exclusive period end, and rejects future or invalid dates', () => {
    const now = new Date(2026, 9, 8, 12);
    const entries = [
      entry('first', '2026-10-07'),
      entry('same-day', new Date(2026, 9, 7, 20).toISOString()),
      entry('now', now.toISOString()),
      entry('before', '2026-10-06'),
      entry('end', '2026-10-09'),
      entry('future-time', new Date(2026, 9, 8, 13).toISOString()),
      entry('rollover', '2026-09-31'),
      entry('invalid', 'invalid')
    ];
    expect(summarizeGrowthPeriod(entries, '2026-10-07', '2026-10-09', now)).toMatchObject({ count: 3, xp: 15, coins: 6, activeDays: 2 });
    expect(summarizeGrowthPeriod(entries, 'invalid', '2026-10-09', now).count).toBe(0);
  });

  it('sorts the latest snapshot of each record without mutating the input', () => {
    const entries = [entry('a', '2026-10-06'), entry('b', '2026-10-07'), entry('a', '2026-10-08'), entry('bad', 'invalid')];
    const before = entries.map(item => ({ ...item }));
    expect(sortGrowthEntries(entries).map(item => item.id)).toEqual(['a', 'b', 'bad']);
    expect(entries).toEqual(before);
  });

  it('sorts and deduplicates redemptions by their real dates', () => {
    const redemption = (id: string, redeemedAt: string): RewardRedemption => ({ id, itemId: 'shop', itemTitle: 'Reward', cost: 5, redeemedAt });
    const entries = [redemption('a', '2026-10-06'), redemption('b', '2026-10-07'), redemption('a', '2026-10-08')];
    expect(sortGrowthRedemptions(entries).map(item => item.id)).toEqual(['a', 'b']);
    expect(entries).toHaveLength(3);
  });
});
