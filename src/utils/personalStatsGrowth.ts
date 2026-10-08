import type { RewardLedgerEntry, RewardSource, RewardRedemption } from '@/rewardRepository';
import { formatSummaryDateKey } from '@/utils/personalStatsSummary';

function growthTimestamp(key: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return Date.parse(key);
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return formatSummaryDateKey(date) === key ? date.getTime() : NaN;
}

export function sortGrowthEntries(entries: RewardLedgerEntry[]): RewardLedgerEntry[] {
  return [...new Map(entries.map(entry => [entry.id, entry])).values()]
    .sort((left, right) => (growthTimestamp(right.createdAt) || 0) - (growthTimestamp(left.createdAt) || 0) || left.id.localeCompare(right.id));
}

export function sortGrowthRedemptions(entries: RewardRedemption[]): RewardRedemption[] {
  return [...new Map(entries.map(entry => [entry.id, entry])).values()]
    .sort((left, right) => (growthTimestamp(right.redeemedAt) || 0) - (growthTimestamp(left.redeemedAt) || 0) || left.id.localeCompare(right.id));
}

export function summarizeGrowthPeriod(entries: RewardLedgerEntry[], startKey: string, endExclusiveKey: string, now = new Date()) {
  const start = growthTimestamp(startKey);
  const end = growthTimestamp(endExclusiveKey);
  const selected = sortGrowthEntries(entries).filter(entry => {
    const timestamp = growthTimestamp(entry.createdAt);
    return Number.isFinite(timestamp) && timestamp >= start && timestamp < end && timestamp <= now.getTime();
  });
  const sourceRows = (['habit', 'task', 'focus', 'system'] as RewardSource[]).map(source => {
    const matching = selected.filter(entry => entry.source === source);
    return { source, count: matching.length, xp: matching.reduce((sum, entry) => sum + entry.xp, 0), coins: matching.reduce((sum, entry) => sum + entry.coins, 0) };
  });
  const days = new Set(selected.map(entry => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(entry.createdAt)) return entry.createdAt;
    const date = new Date(entry.createdAt);
    return formatSummaryDateKey(date);
  }));
  return { count: selected.length, xp: selected.reduce((sum, entry) => sum + entry.xp, 0), coins: selected.reduce((sum, entry) => sum + entry.coins, 0), activeDays: days.size, sources: sourceRows };
}
