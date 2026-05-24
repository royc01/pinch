import { usePlugin } from '@/main';
import { eventBus, Events } from '@/utils/eventBus';
import type { Habit, HabitDifficulty, Task } from '@/api';
import { translate } from '@/composables/useI18n';

export type RewardSource = 'habit' | 'task' | 'focus' | 'system';

export interface RewardLedgerEntry {
  id: string;
  eventKey: string;
  source: RewardSource;
  kind: string;
  title: string;
  detail?: string;
  xp: number;
  coins: number;
  createdAt: string;
  meta?: Record<string, string | number | boolean>;
}

export interface RewardBadge {
  id: string;
  title: string;
  description: string;
  unlockedAt: string;
  icon?: string;
}

export interface RewardShopItem {
  id: string;
  title: string;
  description?: string;
  cost: number;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RewardRedemption {
  id: string;
  itemId: string;
  itemTitle: string;
  cost: number;
  redeemedAt: string;
}

interface RewardStats {
  habitCompletionCount: number;
  maxHabitStreak: number;
  taskCompletionCount: number;
  focusSessionCount: number;
}

export interface RewardState {
  version: number;
  totalXp: number;
  totalCoins: number;
  spentCoins: number;
  ledger: RewardLedgerEntry[];
  stats: RewardStats;
  badges: RewardBadge[];
  shopItems: RewardShopItem[];
  redemptions: RewardRedemption[];
  processedEventKeys: string[];
  updatedAt: string;
}

export interface RewardSnapshot {
  totalXp: number;
  totalCoins: number;
  spentCoins: number;
  availableCoins: number;
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  levelProgressPercent: number;
  ledgerCount: number;
  badges: RewardBadge[];
  recentEntries: RewardLedgerEntry[];
  shopItems: RewardShopItem[];
  recentRedemptions: RewardRedemption[];
  updatedAt: string;
}

export interface RewardUpdatePayload {
  snapshot: RewardSnapshot;
  latestEntries: RewardLedgerEntry[];
  newBadges: RewardBadge[];
}

interface RewardAwardInput {
  eventKey: string;
  source: RewardSource;
  kind: string;
  title: string;
  detail?: string;
  xp: number;
  coins: number;
  createdAt?: string;
  meta?: Record<string, string | number | boolean>;
  dailyCap?: {
    xp?: number;
    coins?: number;
    source?: RewardSource;
  };
}

export interface RewardBatchResult {
  entries: RewardLedgerEntry[];
  newBadges: RewardBadge[];
  snapshot: RewardSnapshot;
  skippedEventKeys: string[];
}

export interface RewardShopItemDraft {
  title: string;
  description?: string;
  cost: number;
  icon?: string;
}

export interface HabitRewardPayload {
  habit: Pick<Habit, 'id' | 'name' | 'difficulty' | 'frequency' | 'completionMode' | 'timesPerDay'>;
  date: string;
  previousCompletedCount: number;
  nextCompletedCount: number;
  targetCount: number;
  becameCompleted: boolean;
  previousStreak: number;
  nextStreak: number;
  weeklyCompletedBefore?: boolean;
  weeklyCompletedAfter?: boolean;
  source?: 'manual' | 'calendar' | 'pomodoro';
}

export interface FocusRewardPayload {
  minutes: number;
  sessionId: string;
  source?: 'panel' | 'capsule';
}

function normalizeHabitDifficulty(difficulty: HabitDifficulty | undefined): HabitDifficulty {
  if (difficulty === 'medium' || difficulty === 'hard') {
    return difficulty;
  }
  return 'easy';
}

function getHabitTargetCoinsByDifficulty(difficulty: HabitDifficulty): number {
  if (difficulty === 'hard') {
    return 3;
  }
  if (difficulty === 'medium') {
    return 2;
  }
  return 1;
}

type RewardBadgeGroupId = 'habit' | 'streak' | 'task' | 'focus' | 'level';

interface RewardBadgeDefinition {
  groupId: RewardBadgeGroupId;
  tier: number;
  id: string;
  title: LocalizedTextDefinition;
  description: LocalizedTextDefinition;
  icon: string;
  when: (progress: RewardBadgeProgress) => boolean;
}

interface LocalizedTextDefinition {
  key: string;
  fallback: string;
}

interface DefaultRewardShopItemDefinition {
  id: string;
  title: LocalizedTextDefinition;
  description: LocalizedTextDefinition;
  cost: number;
  icon: string;
}

interface RewardBadgeProgress extends RewardStats {
  level: number;
}

interface RewardBadgeSyncResult {
  changed: boolean;
  newBadges: RewardBadge[];
}

const STORAGE_KEY = 'Pinch-rewards.json';
const REWARD_STATE_VERSION = 1;
const MAX_LEDGER_ENTRIES = 240;
const MAX_PROCESSED_EVENT_KEYS = 960;
const MAX_RECENT_ENTRIES = 8;
const MAX_RECENT_REDEMPTIONS = 8;
const MAX_REDEMPTIONS = 120;
const MAX_SHOP_ITEMS = 24;
const LEVEL_BASE_XP = 40;
const LEVEL_STEP_XP = 20;
const FOCUS_DAILY_CAP_XP = 36;
const FOCUS_DAILY_CAP_COINS = 4;
const STREAK_MILESTONES = [7, 30, 100];
const REWARD_BADGE_GROUP_ORDER: RewardBadgeGroupId[] = ['habit', 'streak', 'task', 'focus', 'level'];

function localizedText(key: string, fallback: string): LocalizedTextDefinition {
  return { key, fallback };
}

const REWARD_BADGE_DEFINITIONS: RewardBadgeDefinition[] = [
  {
    groupId: 'habit',
    tier: 1,
    id: 'habit-starter',
    title: localizedText('rewardRepository.badges.habitStarter.title', 'Habit starter'),
    description: localizedText('rewardRepository.badges.habitStarter.description', 'Complete a habit target for the first time'),
    icon: '🥇',
    when: progress => progress.habitCompletionCount >= 1
  },
  {
    groupId: 'habit',
    tier: 2,
    id: 'habit-builder',
    title: localizedText('rewardRepository.badges.habitBuilder.title', 'Habit builder'),
    description: localizedText('rewardRepository.badges.habitBuilder.description', 'Complete habit targets 20 times'),
    icon: '🏅',
    when: progress => progress.habitCompletionCount >= 20
  },
  {
    groupId: 'habit',
    tier: 3,
    id: 'habit-master',
    title: localizedText('rewardRepository.badges.habitMaster.title', 'Habit master'),
    description: localizedText('rewardRepository.badges.habitMaster.description', 'Complete habit targets 100 times'),
    icon: '🏆',
    when: progress => progress.habitCompletionCount >= 100
  },
  {
    groupId: 'streak',
    tier: 1,
    id: 'streak-keeper',
    title: localizedText('rewardRepository.badges.streakKeeper.title', 'Streak keeper'),
    description: localizedText('rewardRepository.badges.streakKeeper.description', 'Reach a 7-day streak on any habit'),
    icon: '💪',
    when: progress => progress.maxHabitStreak >= 7
  },
  {
    groupId: 'streak',
    tier: 2,
    id: 'streak-anchor',
    title: localizedText('rewardRepository.badges.streakAnchor.title', 'Steady rhythm'),
    description: localizedText('rewardRepository.badges.streakAnchor.description', 'Reach a 30-day streak on any habit'),
    icon: '🦾',
    when: progress => progress.maxHabitStreak >= 30
  },
  {
    groupId: 'streak',
    tier: 3,
    id: 'streak-legend',
    title: localizedText('rewardRepository.badges.streakLegend.title', 'Long-game legend'),
    description: localizedText('rewardRepository.badges.streakLegend.description', 'Reach a 100-day streak on any habit'),
    icon: '🧘',
    when: progress => progress.maxHabitStreak >= 100
  },
  {
    groupId: 'task',
    tier: 1,
    id: 'task-closer',
    title: localizedText('rewardRepository.badges.taskCloser.title', 'Task closer'),
    description: localizedText('rewardRepository.badges.taskCloser.description', 'Complete 10 tasks'),
    icon: '✅',
    when: progress => progress.taskCompletionCount >= 10
  },
  {
    groupId: 'task',
    tier: 2,
    id: 'task-driver',
    title: localizedText('rewardRepository.badges.taskDriver.title', 'Execution boost'),
    description: localizedText('rewardRepository.badges.taskDriver.description', 'Complete 50 tasks'),
    icon: '❇️',
    when: progress => progress.taskCompletionCount >= 50
  },
  {
    groupId: 'task',
    tier: 3,
    id: 'task-master',
    title: localizedText('rewardRepository.badges.taskMaster.title', 'Checklist master'),
    description: localizedText('rewardRepository.badges.taskMaster.description', 'Complete 100 tasks'),
    icon: '✳️',
    when: progress => progress.taskCompletionCount >= 100
  },
  {
    groupId: 'focus',
    tier: 1,
    id: 'focus-rookie',
    title: localizedText('rewardRepository.badges.focusRookie.title', 'Focus starter'),
    description: localizedText('rewardRepository.badges.focusRookie.description', 'Complete 5 focus sessions'),
    icon: '❤️',
    when: progress => progress.focusSessionCount >= 5
  },
  {
    groupId: 'focus',
    tier: 2,
    id: 'focus-regular',
    title: localizedText('rewardRepository.badges.focusRegular.title', 'Focus regular'),
    description: localizedText('rewardRepository.badges.focusRegular.description', 'Complete 20 focus sessions'),
    icon: '💕',
    when: progress => progress.focusSessionCount >= 20
  },
  {
    groupId: 'focus',
    tier: 3,
    id: 'focus-master',
    title: localizedText('rewardRepository.badges.focusMaster.title', 'Flow state'),
    description: localizedText('rewardRepository.badges.focusMaster.description', 'Complete 50 focus sessions'),
    icon: '💖',
    when: progress => progress.focusSessionCount >= 50
  },
  {
    groupId: 'level',
    tier: 1,
    id: 'level-five',
    title: localizedText('rewardRepository.badges.levelFive.title', 'Self-control novice'),
    description: localizedText('rewardRepository.badges.levelFive.description', 'Reach reward level 5'),
    icon: '🌱',
    when: progress => progress.level >= 5
  },
  {
    groupId: 'level',
    tier: 2,
    id: 'level-ten',
    title: localizedText('rewardRepository.badges.levelTen.title', 'Self-control advanced'),
    description: localizedText('rewardRepository.badges.levelTen.description', 'Reach reward level 10'),
    icon: '☘️',
    when: progress => progress.level >= 10
  },
  {
    groupId: 'level',
    tier: 3,
    id: 'level-fifteen',
    title: localizedText('rewardRepository.badges.levelFifteen.title', 'Self-control expert'),
    description: localizedText('rewardRepository.badges.levelFifteen.description', 'Reach reward level 15'),
    icon: '🍀',
    when: progress => progress.level >= 15
  }
];
const REWARD_BADGE_DEFINITION_MAP = new Map(REWARD_BADGE_DEFINITIONS.map(definition => [definition.id, definition]));
const REWARD_BADGE_GROUPS = REWARD_BADGE_GROUP_ORDER.map(groupId => ({
  groupId,
  definitions: REWARD_BADGE_DEFINITIONS
    .filter(definition => definition.groupId === groupId)
    .sort((left, right) => left.tier - right.tier)
}));

let cachedRewardState: RewardState | null = null;
let rewardMutationQueue: Promise<void> = Promise.resolve();

const DEFAULT_REWARD_SHOP_ITEM_DEFINITIONS: DefaultRewardShopItemDefinition[] = [
  {
    id: 'shop-break-30',
    title: localizedText('rewardRepository.shopDefaults.break30.title', 'Watch a movie'),
    description: localizedText('rewardRepository.shopDefaults.break30.description', 'Give yourself a guilt-free stretch of downtime'),
    cost: 12,
    icon: '🎬'
  },
  {
    id: 'shop-drink',
    title: localizedText('rewardRepository.shopDefaults.drink.title', 'Buy a favorite drink'),
    description: localizedText('rewardRepository.shopDefaults.drink.description', 'Coffee, juice, or milk tea all count'),
    cost: 20,
    icon: '🧋'
  },
  {
    id: 'shop-snack',
    title: localizedText('rewardRepository.shopDefaults.snack.title', 'Grab a small snack'),
    description: localizedText('rewardRepository.shopDefaults.snack.description', 'Trade some coins for an easy little break'),
    cost: 28,
    icon: '🍿'
  }
];

function createDefaultShopItems(nowIso: string): RewardShopItem[] {
  return DEFAULT_REWARD_SHOP_ITEM_DEFINITIONS.map(item => ({
    id: item.id,
    title: translate(item.title.key, item.title.fallback),
    description: translate(item.description.key, item.description.fallback),
    cost: item.cost,
    icon: item.icon,
    createdAt: nowIso,
    updatedAt: nowIso
  }));
}

function formatRewardMessage(
  key: string,
  fallback: string,
  values?: Record<string, string | number | boolean>
): string {
  let result = translate(key, fallback);
  if (!values) {
    return result;
  }

  Object.entries(values).forEach(([name, value]) => {
    result = result.split(`{${name}}`).join(String(value));
  });

  return result;
}

function createEmptyRewardStats(): RewardStats {
  return {
    habitCompletionCount: 0,
    maxHabitStreak: 0,
    taskCompletionCount: 0,
    focusSessionCount: 0
  };
}

function createEmptyRewardState(): RewardState {
  const nowIso = new Date().toISOString();
  return {
    version: REWARD_STATE_VERSION,
    totalXp: 0,
    totalCoins: 0,
    spentCoins: 0,
    ledger: [],
    stats: createEmptyRewardStats(),
    badges: [],
    shopItems: createDefaultShopItems(nowIso),
    redemptions: [],
    processedEventKeys: [],
    updatedAt: nowIso
  };
}

function cloneLedgerEntry(entry: RewardLedgerEntry): RewardLedgerEntry {
  return {
    ...entry,
    meta: entry.meta ? { ...entry.meta } : undefined
  };
}

function cloneRewardShopItem(item: RewardShopItem): RewardShopItem {
  return {
    ...item
  };
}

function cloneRewardRedemption(redemption: RewardRedemption): RewardRedemption {
  return {
    ...redemption
  };
}

function cloneRewardState(state: RewardState): RewardState {
  try {
    return structuredClone(state);
  } catch (err) {
    console.error('[Rewards] structuredClone failed, falling back to manual clone:', err);
    // Fallback: manual deep clone
    return {
      ...state,
      ledger: state.ledger.map(cloneLedgerEntry),
      stats: { ...state.stats },
      badges: state.badges.map(badge => ({ ...badge })),
      shopItems: state.shopItems.map(cloneRewardShopItem),
      redemptions: state.redemptions.map(cloneRewardRedemption),
      processedEventKeys: [...state.processedEventKeys]
    };
  }
}

function normalizeMeta(input: unknown): Record<string, string | number | boolean> | undefined {
  if (!input || typeof input !== 'object') {
    return undefined;
  }

  const normalized: Record<string, string | number | boolean> = {};
  Object.entries(input as Record<string, unknown>).forEach(([key, value]) => {
    if (!key) return;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      normalized[key] = value;
    }
  });

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeRewardEntry(input: unknown): RewardLedgerEntry | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const raw = input as Partial<RewardLedgerEntry>;
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const eventKey = typeof raw.eventKey === 'string' ? raw.eventKey.trim() : '';
  const source = raw.source === 'habit' || raw.source === 'task' || raw.source === 'focus' || raw.source === 'system'
    ? raw.source
    : 'system';
  const kind = typeof raw.kind === 'string' ? raw.kind.trim() : '';
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  const createdAt = typeof raw.createdAt === 'string' ? raw.createdAt : '';

  if (!id || !eventKey || !kind || !title || !createdAt) {
    return null;
  }

  return {
    id,
    eventKey,
    source,
    kind,
    title,
    detail: typeof raw.detail === 'string' ? raw.detail : undefined,
    xp: typeof raw.xp === 'number' && Number.isFinite(raw.xp) ? Math.max(0, Math.floor(raw.xp)) : 0,
    coins: typeof raw.coins === 'number' && Number.isFinite(raw.coins) ? Math.max(0, Math.floor(raw.coins)) : 0,
    createdAt,
    meta: normalizeMeta(raw.meta)
  };
}

function normalizeRewardBadge(input: unknown): RewardBadge | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const raw = input as Partial<RewardBadge>;
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  const description = typeof raw.description === 'string' ? raw.description.trim() : '';
  const unlockedAt = typeof raw.unlockedAt === 'string' ? raw.unlockedAt : '';

  if (!id || !title || !description || !unlockedAt) {
    return null;
  }

  return {
    id,
    title,
    description,
    unlockedAt,
    icon: typeof raw.icon === 'string' ? raw.icon : undefined
  };
}

function normalizeRewardShopItem(input: unknown): RewardShopItem | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const raw = input as Partial<RewardShopItem>;
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  const cost = typeof raw.cost === 'number' && Number.isFinite(raw.cost) ? Math.max(1, Math.floor(raw.cost)) : 0;
  const createdAt = typeof raw.createdAt === 'string' ? raw.createdAt : '';
  const updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt : '';

  if (!id || !title || cost <= 0 || !createdAt || !updatedAt) {
    return null;
  }

  return {
    id,
    title,
    description: typeof raw.description === 'string' ? raw.description.trim() : undefined,
    cost,
    icon: typeof raw.icon === 'string' && raw.icon.trim() ? raw.icon.trim() : undefined,
    createdAt,
    updatedAt
  };
}

function normalizeRewardRedemption(input: unknown): RewardRedemption | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const raw = input as Partial<RewardRedemption>;
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const itemId = typeof raw.itemId === 'string' ? raw.itemId.trim() : '';
  const itemTitle = typeof raw.itemTitle === 'string' ? raw.itemTitle.trim() : '';
  const cost = typeof raw.cost === 'number' && Number.isFinite(raw.cost) ? Math.max(1, Math.floor(raw.cost)) : 0;
  const redeemedAt = typeof raw.redeemedAt === 'string' ? raw.redeemedAt : '';

  if (!id || !itemId || !itemTitle || cost <= 0 || !redeemedAt) {
    return null;
  }

  return {
    id,
    itemId,
    itemTitle,
    cost,
    redeemedAt
  };
}

function collectRewardStatsFromLedger(ledger: RewardLedgerEntry[]): RewardStats {
  return ledger.reduce<RewardStats>((summary, entry) => {
    if (entry.kind === 'habit-target' || entry.kind === 'habit-weekly-target') {
      summary.habitCompletionCount += 1;
    }

    if (entry.kind === 'task-complete') {
      summary.taskCompletionCount += 1;
    }

    if (entry.kind === 'focus-session') {
      summary.focusSessionCount += 1;
    }

    if (entry.kind === 'habit-streak') {
      const streak = Number(entry.meta?.streak);
      if (Number.isFinite(streak)) {
        summary.maxHabitStreak = Math.max(summary.maxHabitStreak, Math.floor(streak));
      }
    }

    return summary;
  }, createEmptyRewardStats());
}

function normalizeRewardStats(input: unknown, fallbackLedger: RewardLedgerEntry[]): RewardStats {
  if (!input || typeof input !== 'object') {
    return collectRewardStatsFromLedger(fallbackLedger);
  }

  const raw = input as Partial<RewardStats>;
  const fallback = collectRewardStatsFromLedger(fallbackLedger);

  return {
    habitCompletionCount: typeof raw.habitCompletionCount === 'number' && Number.isFinite(raw.habitCompletionCount)
      ? Math.max(fallback.habitCompletionCount, Math.floor(raw.habitCompletionCount))
      : fallback.habitCompletionCount,
    maxHabitStreak: typeof raw.maxHabitStreak === 'number' && Number.isFinite(raw.maxHabitStreak)
      ? Math.max(fallback.maxHabitStreak, Math.floor(raw.maxHabitStreak))
      : fallback.maxHabitStreak,
    taskCompletionCount: typeof raw.taskCompletionCount === 'number' && Number.isFinite(raw.taskCompletionCount)
      ? Math.max(fallback.taskCompletionCount, Math.floor(raw.taskCompletionCount))
      : fallback.taskCompletionCount,
    focusSessionCount: typeof raw.focusSessionCount === 'number' && Number.isFinite(raw.focusSessionCount)
      ? Math.max(fallback.focusSessionCount, Math.floor(raw.focusSessionCount))
      : fallback.focusSessionCount
  };
}

function normalizeRewardState(input: unknown): RewardState {
  if (!input || typeof input !== 'object') {
    return createEmptyRewardState();
  }

  const raw = input as Partial<RewardState>;
  const ledger = Array.isArray(raw.ledger)
    ? raw.ledger.map(normalizeRewardEntry).filter((entry): entry is RewardLedgerEntry => entry !== null)
    : [];
  const badges = Array.isArray(raw.badges)
    ? raw.badges.map(normalizeRewardBadge).filter((badge): badge is RewardBadge => badge !== null)
    : [];
  const shopItemsRaw = Array.isArray(raw.shopItems)
    ? raw.shopItems.map(normalizeRewardShopItem).filter((item): item is RewardShopItem => item !== null)
    : null;
  const shopItems = shopItemsRaw === null ? createDefaultShopItems(new Date().toISOString()) : shopItemsRaw;
  const redemptions = Array.isArray(raw.redemptions)
    ? raw.redemptions.map(normalizeRewardRedemption).filter((item): item is RewardRedemption => item !== null)
    : [];
  const processedEventKeys = Array.isArray(raw.processedEventKeys)
    ? raw.processedEventKeys
      .filter((key): key is string => typeof key === 'string' && key.trim().length > 0)
      .map(key => key.trim())
    : [];
  const stats = normalizeRewardStats((raw as { stats?: unknown }).stats, ledger);

  return {
    version: REWARD_STATE_VERSION,
    totalXp: typeof raw.totalXp === 'number' && Number.isFinite(raw.totalXp) ? Math.max(0, Math.floor(raw.totalXp)) : 0,
    totalCoins: typeof raw.totalCoins === 'number' && Number.isFinite(raw.totalCoins) ? Math.max(0, Math.floor(raw.totalCoins)) : 0,
    spentCoins: typeof raw.spentCoins === 'number' && Number.isFinite(raw.spentCoins) ? Math.max(0, Math.floor(raw.spentCoins)) : 0,
    ledger: ledger.slice(0, MAX_LEDGER_ENTRIES),
    stats,
    badges,
    shopItems: shopItems.slice(0, MAX_SHOP_ITEMS),
    redemptions: redemptions.slice(0, MAX_REDEMPTIONS),
    processedEventKeys: Array.from(new Set(processedEventKeys)).slice(0, MAX_PROCESSED_EVENT_KEYS),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : ''
  };
}

function createRewardEntryId(prefix: string = 'reward'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getDateKey(isoDateTime: string): string {
  return isoDateTime.slice(0, 10);
}

function getWeekKey(dateStr: string): string {
  const baseDate = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(baseDate.getTime())) {
    return dateStr;
  }

  const weekday = baseDate.getDay();
  const delta = weekday === 0 ? -6 : 1 - weekday;
  baseDate.setDate(baseDate.getDate() + delta);
  return baseDate.toISOString().slice(0, 10);
}

function stripHtml(value: string | undefined): string {
  if (!value) return '';
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function getLevelInfo(totalXp: number) {
  let level = 1;
  let currentLevelXp = Math.max(0, Math.floor(totalXp));
  let nextLevelXp = LEVEL_BASE_XP;

  while (currentLevelXp >= nextLevelXp) {
    currentLevelXp -= nextLevelXp;
    level += 1;
    nextLevelXp = LEVEL_BASE_XP + (level - 1) * LEVEL_STEP_XP;
  }

  return {
    level,
    currentLevelXp,
    nextLevelXp,
    levelProgressPercent: nextLevelXp > 0 ? Math.round((currentLevelXp / nextLevelXp) * 100) : 0
  };
}

function getRewardBadgeDefinition(badgeId: string): RewardBadgeDefinition | undefined {
  return REWARD_BADGE_DEFINITION_MAP.get(badgeId);
}

function collectRewardBadgeProgress(state: RewardState): RewardBadgeProgress {
  const ledgerStats = collectRewardStatsFromLedger(state.ledger);
  const stats: RewardStats = {
    habitCompletionCount: Math.max(state.stats.habitCompletionCount, ledgerStats.habitCompletionCount),
    maxHabitStreak: Math.max(state.stats.maxHabitStreak, ledgerStats.maxHabitStreak),
    taskCompletionCount: Math.max(state.stats.taskCompletionCount, ledgerStats.taskCompletionCount),
    focusSessionCount: Math.max(state.stats.focusSessionCount, ledgerStats.focusSessionCount)
  };

  return {
    ...stats,
    level: getLevelInfo(state.totalXp).level
  };
}

function getRewardBadgeSortIndex(badge: RewardBadge): number {
  const definition = getRewardBadgeDefinition(badge.id);
  if (!definition) {
    return Number.MAX_SAFE_INTEGER;
  }
  return REWARD_BADGE_GROUP_ORDER.indexOf(definition.groupId);
}

function sortRewardBadges(badges: RewardBadge[]): RewardBadge[] {
  return [...badges].sort((left, right) => {
    const orderDiff = getRewardBadgeSortIndex(left) - getRewardBadgeSortIndex(right);
    if (orderDiff !== 0) {
      return orderDiff;
    }

    const timeDiff = new Date(right.unlockedAt).getTime() - new Date(left.unlockedAt).getTime();
    if (Number.isFinite(timeDiff) && timeDiff !== 0) {
      return timeDiff;
    }

    return left.id.localeCompare(right.id);
  });
}

function createBadgeFromDefinition(definition: RewardBadgeDefinition, unlockedAt: string): RewardBadge {
  return {
    id: definition.id,
    title: translate(definition.title.key, definition.title.fallback),
    description: translate(definition.description.key, definition.description.fallback),
    icon: definition.icon,
    unlockedAt
  };
}

function getStoredBadgesByGroup(badges: RewardBadge[]): Map<RewardBadgeGroupId, RewardBadge> {
  const grouped = new Map<RewardBadgeGroupId, RewardBadge>();

  badges.forEach((badge) => {
    const definition = getRewardBadgeDefinition(badge.id);
    if (!definition) {
      return;
    }

    const existing = grouped.get(definition.groupId);
    if (!existing) {
      grouped.set(definition.groupId, { ...badge });
      return;
    }

    const existingDefinition = getRewardBadgeDefinition(existing.id);
    if (!existingDefinition) {
      grouped.set(definition.groupId, { ...badge });
      return;
    }

    if (definition.tier > existingDefinition.tier) {
      grouped.set(definition.groupId, { ...badge });
      return;
    }

    if (definition.tier === existingDefinition.tier && badge.unlockedAt > existing.unlockedAt) {
      grouped.set(definition.groupId, { ...badge });
    }
  });

  return grouped;
}

function areRewardBadgesEqual(left: RewardBadge[], right: RewardBadge[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((badge, index) => {
    const nextBadge = right[index];
    return badge.id === nextBadge.id
      && badge.title === nextBadge.title
      && badge.description === nextBadge.description
      && badge.icon === nextBadge.icon
      && badge.unlockedAt === nextBadge.unlockedAt;
  });
}

function syncRewardBadges(state: RewardState, unlockedAt: string): RewardBadgeSyncResult {
  const progress = collectRewardBadgeProgress(state);
  const previousBadges = sortRewardBadges(state.badges);
  const storedBadgesByGroup = getStoredBadgesByGroup(state.badges);
  const nextBadges: RewardBadge[] = [];
  const newBadges: RewardBadge[] = [];

  REWARD_BADGE_GROUPS.forEach(({ groupId, definitions }) => {
    const highestDefinition = definitions.reduce<RewardBadgeDefinition | null>((currentHighest, definition) => {
      if (!definition.when(progress)) {
        return currentHighest;
      }
      return definition;
    }, null);

    const existingBadge = storedBadgesByGroup.get(groupId);
    const existingDefinition = existingBadge ? getRewardBadgeDefinition(existingBadge.id) : undefined;

    if (!highestDefinition && !existingDefinition) {
      return;
    }

    if (existingDefinition && (!highestDefinition || existingDefinition.tier > highestDefinition.tier)) {
      nextBadges.push(createBadgeFromDefinition(existingDefinition, existingBadge!.unlockedAt));
      return;
    }

    if (existingBadge?.id === highestDefinition?.id) {
      nextBadges.push({
        ...createBadgeFromDefinition(highestDefinition!, existingBadge.unlockedAt),
      });
      return;
    }

    const nextBadge = createBadgeFromDefinition(highestDefinition!, unlockedAt);
    nextBadges.push(nextBadge);
    newBadges.push({ ...nextBadge });
  });

  const normalizedNextBadges = sortRewardBadges(nextBadges);
  state.badges = normalizedNextBadges.map(badge => ({ ...badge }));

  return {
    changed: !areRewardBadgesEqual(previousBadges, normalizedNextBadges),
    newBadges
  };
}

function buildRewardSnapshot(state: RewardState): RewardSnapshot {
  const levelInfo = getLevelInfo(state.totalXp);
  return {
    totalXp: state.totalXp,
    totalCoins: state.totalCoins,
    spentCoins: state.spentCoins,
    availableCoins: Math.max(0, state.totalCoins - state.spentCoins),
    level: levelInfo.level,
    currentLevelXp: levelInfo.currentLevelXp,
    nextLevelXp: levelInfo.nextLevelXp,
    levelProgressPercent: levelInfo.levelProgressPercent,
    ledgerCount: state.ledger.length,
    badges: sortRewardBadges(state.badges).map(badge => ({ ...badge })),
    recentEntries: state.ledger.slice(0, MAX_RECENT_ENTRIES).map(cloneLedgerEntry),
    shopItems: state.shopItems.map(cloneRewardShopItem),
    recentRedemptions: state.redemptions.slice(0, MAX_RECENT_REDEMPTIONS).map(cloneRewardRedemption),
    updatedAt: state.updatedAt
  };
}

async function loadRewardState(forceRefresh: boolean = false): Promise<RewardState> {
  if (cachedRewardState && !forceRefresh) {
    return cloneRewardState(cachedRewardState);
  }

  try {
    const plugin = usePlugin();
    if (!plugin) {
      const emptyState = createEmptyRewardState();
      cachedRewardState = emptyState;
      return cloneRewardState(emptyState);
    }

    const stored = await plugin.loadData(STORAGE_KEY);
    const normalized = normalizeRewardState(stored);
    cachedRewardState = normalized;
    return cloneRewardState(normalized);
  } catch (error) {
    console.error('[Rewards] Failed to load reward data:', error);
    const emptyState = createEmptyRewardState();
    cachedRewardState = emptyState;
    return cloneRewardState(emptyState);
  }
}

async function saveRewardState(state: RewardState): Promise<void> {
  cachedRewardState = cloneRewardState(state);

  try {
    const plugin = usePlugin();
    if (!plugin) {
      return;
    }
    await plugin.saveData(STORAGE_KEY, state);
  } catch (error) {
    console.error('[Rewards] Failed to save reward data:', error);
  }
}

function enqueueRewardMutation<T>(work: () => Promise<T>): Promise<T> {
  const next = rewardMutationQueue.then(work, work);
  rewardMutationQueue = next.then(() => undefined, () => undefined);
  return next;
}

function getDailySourceTotals(
  state: RewardState,
  source: RewardSource,
  dateKey: string
): { xp: number; coins: number } {
  let xp = 0;
  let coins = 0;
  const ledger = state.ledger;
  for (let i = 0; i < ledger.length; i++) {
    const entry = ledger[i];
    if (entry.source !== source || getDateKey(entry.createdAt) !== dateKey) {
      continue;
    }
    xp += entry.xp;
    coins += entry.coins;
  }
  return { xp, coins };
}

function applyEntryToRewardStats(stats: RewardStats, entry: RewardLedgerEntry): void {
  if (entry.kind === 'habit-target' || entry.kind === 'habit-weekly-target') {
    stats.habitCompletionCount += 1;
  }

  if (entry.kind === 'task-complete') {
    stats.taskCompletionCount += 1;
  }

  if (entry.kind === 'focus-session') {
    stats.focusSessionCount += 1;
  }

  if (entry.kind === 'habit-streak') {
    const streak = Number(entry.meta?.streak);
    if (Number.isFinite(streak)) {
      stats.maxHabitStreak = Math.max(stats.maxHabitStreak, Math.floor(streak));
    }
  }
}

function unlockBadges(state: RewardState, unlockedAt: string): RewardBadgeSyncResult {
  return syncRewardBadges(state, unlockedAt);
}

function emitRewardUpdate(
  snapshot: RewardSnapshot,
  latestEntries: RewardLedgerEntry[] = [],
  newBadges: RewardBadge[] = []
): void {
  eventBus.emit(Events.REWARDS_UPDATED, {
    snapshot,
    latestEntries: latestEntries.map(cloneLedgerEntry),
    newBadges: newBadges.map(badge => ({ ...badge }))
  } satisfies RewardUpdatePayload);
}

async function applyRewardBatch(inputs: RewardAwardInput[]): Promise<RewardBatchResult> {
  return enqueueRewardMutation(async () => {
    const state = await loadRewardState(false);
    const nowIso = new Date().toISOString();
    const skippedEventKeys: string[] = [];
    const latestEntries: RewardLedgerEntry[] = [];
    let stateChanged = false;

    for (const input of inputs) {
      const eventKey = typeof input.eventKey === 'string' ? input.eventKey.trim() : '';
      if (!eventKey) {
        continue;
      }

      if (state.processedEventKeys.includes(eventKey)) {
        skippedEventKeys.push(eventKey);
        continue;
      }

      state.processedEventKeys.unshift(eventKey);
      stateChanged = true;

      let xp = Math.max(0, Math.floor(input.xp || 0));
      let coins = Math.max(0, Math.floor(input.coins || 0));
      const createdAt = typeof input.createdAt === 'string' && input.createdAt
        ? input.createdAt
        : nowIso;

      if (input.dailyCap) {
        const capSource = input.dailyCap.source || input.source;
        const dailyTotals = getDailySourceTotals(state, capSource, getDateKey(createdAt));
        if (typeof input.dailyCap.xp === 'number') {
          xp = Math.max(0, Math.min(xp, Math.floor(input.dailyCap.xp) - dailyTotals.xp));
        }
        if (typeof input.dailyCap.coins === 'number') {
          coins = Math.max(0, Math.min(coins, Math.floor(input.dailyCap.coins) - dailyTotals.coins));
        }
      }

      if (xp <= 0 && coins <= 0) {
        continue;
      }

      const entry: RewardLedgerEntry = {
        id: createRewardEntryId(input.source),
        eventKey,
        source: input.source,
        kind: input.kind,
        title: input.title,
        detail: input.detail,
        xp,
        coins,
        createdAt,
        meta: input.meta ? { ...input.meta } : undefined
      };

      state.ledger.unshift(entry);
      state.totalXp += xp;
      state.totalCoins += coins;
      applyEntryToRewardStats(state.stats, entry);
      latestEntries.unshift(entry);
    }

    if (state.processedEventKeys.length > MAX_PROCESSED_EVENT_KEYS) {
      state.processedEventKeys = state.processedEventKeys.slice(0, MAX_PROCESSED_EVENT_KEYS);
    }
    if (state.ledger.length > MAX_LEDGER_ENTRIES) {
      state.ledger = state.ledger.slice(0, MAX_LEDGER_ENTRIES);
    }

    const badgeSyncResult = unlockBadges(state, nowIso);
    const { newBadges } = badgeSyncResult;
    if (badgeSyncResult.changed) {
      stateChanged = true;
    }

    if (stateChanged) {
      state.updatedAt = nowIso;
      await saveRewardState(state);
    }

    const snapshot = buildRewardSnapshot(state);
    if (latestEntries.length > 0 || newBadges.length > 0) {
      emitRewardUpdate(snapshot, latestEntries, newBadges);
    }

    return {
      entries: latestEntries.map(cloneLedgerEntry),
      newBadges: newBadges.map(badge => ({ ...badge })),
      snapshot,
      skippedEventKeys
    };
  });
}

export function createEmptyRewardSnapshot(): RewardSnapshot {
  return buildRewardSnapshot(createEmptyRewardState());
}

export async function getRewardSnapshot(forceRefresh: boolean = false): Promise<RewardSnapshot> {
  const state = await loadRewardState(forceRefresh);
  const syncTimestamp = state.updatedAt || new Date().toISOString();
  const badgeSyncResult = unlockBadges(state, syncTimestamp);
  if (badgeSyncResult.changed) {
    state.updatedAt = syncTimestamp;
    await saveRewardState(state);
  }
  return buildRewardSnapshot(state);
}

function normalizeShopItemDraft(input: RewardShopItemDraft): RewardShopItemDraft {
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const description = typeof input.description === 'string' ? input.description.trim() : '';
  const icon = typeof input.icon === 'string' ? input.icon.trim() : '';
  const cost = typeof input.cost === 'number' && Number.isFinite(input.cost)
    ? Math.max(1, Math.floor(input.cost))
    : 0;

  if (!title) {
    throw new Error(formatRewardMessage(
      'rewardRepository.errors.emptyTitle',
      'Reward name cannot be empty'
    ));
  }
  if (cost <= 0) {
    throw new Error(formatRewardMessage(
      'rewardRepository.errors.invalidCost',
      'Reward price must be greater than 0'
    ));
  }

  return {
    title,
    description: description || undefined,
    icon: icon || undefined,
    cost
  };
}

export async function addRewardShopItem(input: RewardShopItemDraft): Promise<RewardSnapshot> {
  const normalized = normalizeShopItemDraft(input);

  return enqueueRewardMutation(async () => {
    const state = await loadRewardState(false);
    if (state.shopItems.length >= MAX_SHOP_ITEMS) {
      throw new Error(formatRewardMessage(
        'rewardRepository.errors.maxShopItemsTemplate',
        'You can add at most {count} reward items',
        { count: MAX_SHOP_ITEMS }
      ));
    }

    const nowIso = new Date().toISOString();
    const item: RewardShopItem = {
      id: createRewardEntryId('shop'),
      title: normalized.title,
      description: normalized.description,
      cost: normalized.cost,
      icon: normalized.icon,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    state.shopItems.unshift(item);
    state.updatedAt = nowIso;
    await saveRewardState(state);

    const snapshot = buildRewardSnapshot(state);
    emitRewardUpdate(snapshot);
    return snapshot;
  });
}

export async function updateRewardShopItem(itemId: string, input: RewardShopItemDraft): Promise<RewardSnapshot> {
  const normalizedItemId = typeof itemId === 'string' ? itemId.trim() : '';
  const normalized = normalizeShopItemDraft(input);

  if (!normalizedItemId) {
    throw new Error(formatRewardMessage(
      'rewardRepository.errors.missingShopItemId',
      'Missing reward item ID'
    ));
  }

  return enqueueRewardMutation(async () => {
    const state = await loadRewardState(false);
    const target = state.shopItems.find(item => item.id === normalizedItemId);
    if (!target) {
      throw new Error(formatRewardMessage(
        'rewardRepository.errors.updateTargetNotFound',
        'Reward item to update was not found'
      ));
    }

    const nowIso = new Date().toISOString();
    target.title = normalized.title;
    target.description = normalized.description;
    target.cost = normalized.cost;
    target.icon = normalized.icon;
    target.updatedAt = nowIso;
    state.updatedAt = nowIso;

    await saveRewardState(state);
    const snapshot = buildRewardSnapshot(state);
    emitRewardUpdate(snapshot);
    return snapshot;
  });
}

export async function deleteRewardShopItem(itemId: string): Promise<RewardSnapshot> {
  const normalizedItemId = typeof itemId === 'string' ? itemId.trim() : '';
  if (!normalizedItemId) {
    throw new Error(formatRewardMessage(
      'rewardRepository.errors.missingShopItemId',
      'Missing reward item ID'
    ));
  }

  return enqueueRewardMutation(async () => {
    const state = await loadRewardState(false);
    const nextItems = state.shopItems.filter(item => item.id !== normalizedItemId);
    if (nextItems.length === state.shopItems.length) {
      throw new Error(formatRewardMessage(
        'rewardRepository.errors.deleteTargetNotFound',
        'Reward item to delete was not found'
      ));
    }

    state.shopItems = nextItems;
    state.updatedAt = new Date().toISOString();
    await saveRewardState(state);

    const snapshot = buildRewardSnapshot(state);
    emitRewardUpdate(snapshot);
    return snapshot;
  });
}

export async function redeemRewardShopItem(itemId: string): Promise<{ snapshot: RewardSnapshot; redemption: RewardRedemption }> {
  const normalizedItemId = typeof itemId === 'string' ? itemId.trim() : '';
  if (!normalizedItemId) {
    throw new Error(formatRewardMessage(
      'rewardRepository.errors.missingShopItemId',
      'Missing reward item ID'
    ));
  }

  return enqueueRewardMutation(async () => {
    const state = await loadRewardState(false);
    const item = state.shopItems.find(shopItem => shopItem.id === normalizedItemId);
    if (!item) {
      throw new Error(formatRewardMessage(
        'rewardRepository.errors.redeemTargetNotFound',
        'Reward item to redeem was not found'
      ));
    }

    const availableCoins = Math.max(0, state.totalCoins - state.spentCoins);
    if (availableCoins < item.cost) {
      throw new Error(formatRewardMessage(
        'rewardRepository.errors.notEnoughCoins',
        'Not enough coins'
      ));
    }

    const nowIso = new Date().toISOString();
    const redemption: RewardRedemption = {
      id: createRewardEntryId('redeem'),
      itemId: item.id,
      itemTitle: item.title,
      cost: item.cost,
      redeemedAt: nowIso
    };

    state.spentCoins += item.cost;
    state.redemptions.unshift(redemption);
    if (state.redemptions.length > MAX_REDEMPTIONS) {
      state.redemptions = state.redemptions.slice(0, MAX_REDEMPTIONS);
    }
    state.updatedAt = nowIso;

    await saveRewardState(state);
    const snapshot = buildRewardSnapshot(state);
    emitRewardUpdate(snapshot);
    return {
      snapshot,
      redemption: cloneRewardRedemption(redemption)
    };
  });
}

export async function awardHabitRewards(payload: HabitRewardPayload): Promise<RewardBatchResult> {
  const habitDifficulty = normalizeHabitDifficulty(payload.habit.difficulty);
  const habitName = payload.habit.name?.trim()
    || formatRewardMessage('rewardRepository.untitledHabit', 'Untitled habit');
  const normalizedDate = typeof payload.date === 'string' ? payload.date : new Date().toISOString().slice(0, 10);
  const safeTargetCount = Math.max(1, Math.floor(payload.targetCount || payload.habit.timesPerDay || 1));
  const inputs: RewardAwardInput[] = [];

  const stepGain = Math.max(0, payload.nextCompletedCount - payload.previousCompletedCount);
  for (let index = 0; index < stepGain; index += 1) {
    const nextCount = payload.previousCompletedCount + index + 1;
    inputs.push({
      eventKey: `habit:${payload.habit.id}:${normalizedDate}:step:${nextCount}`,
      source: 'habit',
      kind: 'habit-step',
      title: formatRewardMessage(
        'rewardRepository.habitStepTitleTemplate',
        'Habit progress: {title}',
        { title: habitName }
      ),
      detail: formatRewardMessage(
        'rewardRepository.habitStepDetailTemplate',
        '{count}/{target} times',
        { count: nextCount, target: safeTargetCount }
      ),
      xp: 2,
      coins: 0,
      meta: {
        count: nextCount,
        targetCount: safeTargetCount,
        difficulty: habitDifficulty,
        source: payload.source || 'manual'
      }
    });
  }

  if (payload.becameCompleted) {
    inputs.push({
      eventKey: `habit:${payload.habit.id}:${normalizedDate}:target-met`,
      source: 'habit',
      kind: 'habit-target',
      title: formatRewardMessage(
        'rewardRepository.habitTargetTitleTemplate',
        'Habit target reached: {title}',
        { title: habitName }
      ),
      detail: payload.source === 'pomodoro'
        ? formatRewardMessage(
          'rewardRepository.habitTargetDetailPomodoro',
          'Completed via pomodoro focus'
        )
        : formatRewardMessage(
          'rewardRepository.habitTargetDetailDefault',
          'Completed today\'s target'
        ),
      xp: 6,
      coins: getHabitTargetCoinsByDifficulty(habitDifficulty),
      meta: {
        targetCount: safeTargetCount,
        difficulty: habitDifficulty,
        source: payload.source || 'manual'
      }
    });
  }

  if (payload.weeklyCompletedAfter && !payload.weeklyCompletedBefore) {
    const weekKey = getWeekKey(normalizedDate);
    inputs.push({
      eventKey: `habit:${payload.habit.id}:${weekKey}:weekly-target`,
      source: 'habit',
      kind: 'habit-weekly-target',
      title: formatRewardMessage(
        'rewardRepository.habitWeeklyTargetTitleTemplate',
        'Weekly target reached: {title}',
        { title: habitName }
      ),
      detail: formatRewardMessage(
        'rewardRepository.habitWeeklyTargetDetail',
        'This week\'s target is complete'
      ),
      xp: 8,
      coins: 2,
      meta: {
        weekKey,
        difficulty: habitDifficulty,
        source: payload.source || 'manual'
      }
    });
  }

  if (payload.nextStreak > payload.previousStreak && STREAK_MILESTONES.includes(payload.nextStreak)) {
    inputs.push({
      eventKey: `habit:${payload.habit.id}:streak:${payload.nextStreak}`,
      source: 'habit',
      kind: 'habit-streak',
      title: formatRewardMessage(
        'rewardRepository.habitStreakTitleTemplate',
        '{days}-day streak: {title}',
        { days: payload.nextStreak, title: habitName }
      ),
      detail: formatRewardMessage(
        'rewardRepository.habitStreakDetail',
        'Kept the streak going'
      ),
      xp: payload.nextStreak >= 100 ? 30 : (payload.nextStreak >= 30 ? 16 : 10),
      coins: payload.nextStreak >= 100 ? 12 : (payload.nextStreak >= 30 ? 5 : 3),
      meta: {
        streak: payload.nextStreak
      }
    });
  }

  if (inputs.length === 0) {
    return {
      entries: [],
      newBadges: [],
      snapshot: await getRewardSnapshot(false),
      skippedEventKeys: []
    };
  }

  return applyRewardBatch(inputs);
}

function getTaskCompletionEventKey(task: Pick<Task, 'id' | 'repeatSeriesId' | 'repeatInstanceDate' | 'isVirtual'>): string {
  if (task.isVirtual && task.repeatSeriesId && task.repeatInstanceDate) {
    return `task:repeat:${task.repeatSeriesId}:${task.repeatInstanceDate}:completed`;
  }
  return `task:${task.id}:completed`;
}

function isTaskCompletedOnTime(task: Pick<Task, 'dueDate' | 'dueTime' | 'completedAt'>): boolean | null {
  const dueDate = typeof task.dueDate === 'string' ? task.dueDate.trim() : '';
  if (!dueDate) {
    return null;
  }

  const dueTime = typeof task.dueTime === 'string' && task.dueTime.trim()
    ? task.dueTime.trim()
    : '23:59:59';
  const normalizedDueTime = dueTime.length === 5 ? `${dueTime}:59` : dueTime;
  const dueAt = new Date(`${dueDate}T${normalizedDueTime}`);
  const completedAt = new Date(task.completedAt || '');

  if (Number.isNaN(dueAt.getTime()) || Number.isNaN(completedAt.getTime())) {
    return null;
  }

  return completedAt.getTime() <= dueAt.getTime();
}

export async function awardTaskCompletion(
  task: Pick<Task, 'id' | 'title' | 'priority' | 'status' | 'completedAt' | 'dueDate' | 'dueTime' | 'repeatSeriesId' | 'repeatInstanceDate' | 'isVirtual'>
): Promise<RewardBatchResult> {
  if (!task.id || task.status !== 'completed') {
    return {
      entries: [],
      newBadges: [],
      snapshot: await getRewardSnapshot(false),
      skippedEventKeys: []
    };
  }

  const priority = task.priority || 'none';
  const baseRewards: Record<string, { xp: number; coins: number }> = {
    none: { xp: 6, coins: 1 },
    low: { xp: 7, coins: 1 },
    medium: { xp: 10, coins: 2 },
    high: { xp: 14, coins: 3 }
  };
  const baseReward = baseRewards[priority] || baseRewards.none;
  const onTime = isTaskCompletedOnTime(task);
  const title = stripHtml(task.title) || formatRewardMessage('focusTimer.untitledTask', 'Untitled task');

  return applyRewardBatch([
    {
      eventKey: getTaskCompletionEventKey(task),
      source: 'task',
      kind: 'task-complete',
      title: formatRewardMessage(
        'rewardRepository.taskCompleteTitleTemplate',
        'Task completed: {title}',
        { title }
      ),
      detail: onTime === true
        ? formatRewardMessage(
          'rewardRepository.taskCompleteDetailOnTime',
          'Completed on time'
        )
        : (onTime === false
          ? formatRewardMessage(
            'rewardRepository.taskCompleteDetailLate',
            'Task completed after the due time'
          )
          : formatRewardMessage(
            'rewardRepository.taskCompleteDetailDone',
            'Task completed'
          )),
      xp: baseReward.xp + (onTime === true ? 4 : 0),
      coins: baseReward.coins + (onTime === true ? 1 : 0),
      createdAt: task.completedAt || new Date().toISOString(),
      meta: {
        priority,
        onTime: onTime === true
      }
    }
  ]);
}

export async function awardFocusSession(payload: FocusRewardPayload): Promise<RewardBatchResult> {
  const minutes = Math.max(1, Math.floor(payload.minutes || 0));
  if (!payload.sessionId || minutes <= 0) {
    return {
      entries: [],
      newBadges: [],
      snapshot: await getRewardSnapshot(false),
      skippedEventKeys: []
    };
  }

  const xp = Math.max(4, Math.round(minutes / 10) * 2);
  const coins = Math.max(0, Math.min(2, Math.floor(minutes / 25)));

  return applyRewardBatch([
    {
      eventKey: `focus:${payload.sessionId}`,
      source: 'focus',
      kind: 'focus-session',
      title: formatRewardMessage(
        'rewardRepository.focusSessionTitleTemplate',
        'Focus session completed: {minutes} min',
        { minutes }
      ),
      detail: payload.source === 'capsule'
        ? formatRewardMessage(
          'rewardRepository.focusSessionDetailCapsule',
          'From floating capsule'
        )
        : formatRewardMessage(
          'rewardRepository.focusSessionDetailPanel',
          'From focus panel'
        ),
      xp,
      coins,
      meta: {
        minutes,
        source: payload.source || 'panel'
      },
      dailyCap: {
        source: 'focus',
        xp: FOCUS_DAILY_CAP_XP,
        coins: FOCUS_DAILY_CAP_COINS
      }
    }
  ]);
}
