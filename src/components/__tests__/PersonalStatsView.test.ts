import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import type { FocusSessionRecord, Habit, Task } from '@/api';
import type { GoalListItem } from '@/composables/useGoals';
import type { RewardSnapshot, RewardLedgerEntry, RewardWorkbenchData } from '@/rewardRepository';
import { eventBus, Events } from '@/utils/eventBus';

const apiMocks = vi.hoisted(() => ({
  getFocusTimerData: vi.fn(),
  getHabits: vi.fn(),
  upsertHabit: vi.fn(),
  loadTaskGroups: vi.fn(),
  openBlockById: vi.fn(),
  createDocWithMd: vi.fn(),
  getIDsByHPath: vi.fn(),
  getPathByID: vi.fn(),
  getMoodData: vi.fn(),
  sql: vi.fn(),
  removeDoc: vi.fn(),
  lsNotebooks: vi.fn()
}));

const rewardMocks = vi.hoisted(() => ({
  getRewardSnapshot: vi.fn(),
  getRewardWorkbenchData: vi.fn(),
  redeemRewardShopItem: vi.fn(),
  awardHabitRewards: vi.fn()
}));

const navigationMocks = vi.hoisted(() => ({
  openTaskViewByRequest: vi.fn(),
  usePlugin: vi.fn(),
  loadData: vi.fn()
}));

const siyuanMocks = vi.hoisted(() => ({ showMessage: vi.fn(), Protyle: vi.fn(), destroyProtyle: vi.fn() }));

vi.mock('siyuan', () => ({ showMessage: siyuanMocks.showMessage, Protyle: siyuanMocks.Protyle }));

const emptyRewardSnapshot: RewardSnapshot = {
  totalXp: 0,
  totalCoins: 0,
  spentCoins: 0,
  availableCoins: 0,
  level: 1,
  badges: [],
  ledgerCount: 0,
  currentLevelXp: 0,
  nextLevelXp: 40,
  levelProgressPercent: 0,
  recentEntries: [],
  shopItems: [],
  recentRedemptions: [],
  updatedAt: ''
};

vi.mock('@/api', () => ({
  getFocusTimerData: apiMocks.getFocusTimerData,
  getHabits: apiMocks.getHabits,
  upsertHabit: apiMocks.upsertHabit,
  loadTaskGroups: apiMocks.loadTaskGroups,
  openBlockById: apiMocks.openBlockById,
  createDocWithMd: apiMocks.createDocWithMd,
  getIDsByHPath: apiMocks.getIDsByHPath,
  getPathByID: apiMocks.getPathByID,
  getMoodData: apiMocks.getMoodData,
  sql: apiMocks.sql,
  removeDoc: apiMocks.removeDoc,
  lsNotebooks: apiMocks.lsNotebooks
}));

vi.mock('@/rewardRepository', () => ({
  createEmptyRewardSnapshot: () => ({ ...emptyRewardSnapshot }),
  getLocalizedRewardEntryTitle: () => '',
  getLocalizedRewardEntryDetail: () => '',
  getRewardSnapshot: rewardMocks.getRewardSnapshot,
  getRewardWorkbenchData: rewardMocks.getRewardWorkbenchData,
  redeemRewardShopItem: rewardMocks.redeemRewardShopItem,
  awardHabitRewards: rewardMocks.awardHabitRewards
}));

vi.mock('@/main', () => ({
  openTaskViewByRequest: navigationMocks.openTaskViewByRequest,
  usePlugin: navigationMocks.usePlugin
}));

const { default: PersonalStatsView } = await import('../PersonalStatsView.vue');

const mountedWrappers: Array<{ unmount: () => void }> = [];
let localStorageData = new Map<string, string>();

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function createTask(overrides: Partial<Task> = {}): Task {
  const now = new Date();
  return {
    id: 'task-1',
    blockId: 'task-1',
    type: 'block',
    title: 'Test task',
    status: 'pending',
    priority: 'none',
    tags: [],
    createdAt: addDays(now, -1).toISOString(),
    updatedAt: now.toISOString(),
    ...overrides
  };
}

function createHabit(overrides: Partial<Habit> = {}): Habit {
  const today = formatDateKey(new Date());
  return {
    id: 'habit-1',
    name: 'Drink water',
    difficulty: 'easy',
    frequency: 'daily',
    completedToday: true,
    currentStreak: 1,
    totalCompletions: 1,
    calendar: [{ date: today, completed: true, completedCount: 1, targetCount: 1 }],
    createdAt: `${today}T00:00:00`,
    ...overrides
  };
}

function createWorkbenchGoal(overrides: Partial<GoalListItem> = {}): GoalListItem {
  return {
    id: 'goal-1', name: 'Test goal', members: [], documentCount: 0, taskMemberCount: 2,
    scopeCount: 2, documentSummary: '', totalTasks: 2, completedTasks: 1,
    remainingTasks: 1, progressPercent: 50, status: 'in-progress', ...overrides
  };
}

function createGrowthData(count = 0): RewardWorkbenchData {
  const day = formatDateKey(new Date());
  const entries: RewardLedgerEntry[] = Array.from({ length: count }, (_, index) => ({
    id: `growth-${index}`, eventKey: `growth-event-${index}`, source: index % 2 ? 'habit' : 'task',
    kind: 'test', title: `<b>成长 ${index}</b>`, detail: '<em>奖励说明</em>', xp: 5, coins: 2,
    createdAt: `${day}T00:${String(index).padStart(2, '0')}:00`
  }));
  return {
    snapshot: {
      ...emptyRewardSnapshot, totalXp: 55, totalCoins: 30, spentCoins: 10, availableCoins: 20,
      level: 2, currentLevelXp: 15, nextLevelXp: 60, levelProgressPercent: 25,
      ledgerCount: count, recentEntries: entries.slice(0, 8),
      shopItems: Array.from({ length: 7 }, (_, index) => ({
        id: `shop-${index}`, title: `<b>奖励 ${index}</b>`, description: '<i>休息片刻</i>',
        icon: index ? '🎁' : 'api/icon/getDynamicIcon?type=1&color=%23fff', cost: 5 + index * 5,
        createdAt: day, updatedAt: day
      })),
      badges: Array.from({ length: 7 }, (_, index) => ({
        id: `badge-${index}`, title: `<b>徽章 ${index}</b>`, description: '<i>坚持的成果</i>', icon: '🏅', unlockedAt: day
      }))
    },
    entries,
    redemptions: Array.from({ length: 7 }, (_, index) => ({
      id: `redemption-${index}`, itemId: 'shop-0', itemTitle: `<b>兑换 ${index}</b>`, cost: 5, redeemedAt: day
    }))
  };
}

function mountStats(props: {
  tasks?: Task[];
  goalItems?: GoalListItem[];
  goalTasks?: Task[];
  completeTask?: (task: Task) => Promise<Task | void>;
  rescheduleTask?: (task: Task, dueDate: string) => Promise<void>;
  undoCompleteTask?: (completed: Task, previous: Task) => Promise<void>;
} = {}) {
  const wrapper = mount(PersonalStatsView, {
    global: { stubs: { TransitionGroup: false } },
    props: {
      tasks: props.tasks ?? [],
      taskGroups: [],
      goalItems: props.goalItems ?? [],
      goalTasks: props.goalTasks ?? [],
      sourceLabel: '全部',
      documentLabel: '',
      completeTask: props.completeTask,
      rescheduleTask: props.rescheduleTask,
      undoCompleteTask: props.undoCompleteTask
    }
  });
  mountedWrappers.push(wrapper);
  return wrapper;
}

function findButtonByText(wrapper: ReturnType<typeof mountStats>, selector: string, text: string) {
  const button = wrapper.findAll(selector).find(item => item.text() === text);
  expect(button, `Expected button "${text}"`).toBeDefined();
  return button!;
}

function findOverviewMetric(wrapper: ReturnType<typeof mountStats>, label: string) {
  const metric = wrapper.findAll('.overview-kpi').find(item => item.text().includes(label));
  expect(metric, `Expected overview metric "${label}"`).toBeDefined();
  return metric!;
}

describe('PersonalStatsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageData = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => localStorageData.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => localStorageData.set(key, value)),
        removeItem: vi.fn((key: string) => localStorageData.delete(key)),
        clear: vi.fn(() => localStorageData.clear()),
        key: vi.fn((index: number) => Array.from(localStorageData.keys())[index] ?? null),
        get length() {
          return localStorageData.size;
        }
      } satisfies Storage
    });
    (window as any).siyuan = { config: { appearance: { lang: 'zh_CN' } }, languages: {} };
    apiMocks.getHabits.mockResolvedValue([]);
    apiMocks.upsertHabit.mockImplementation(async habit => [habit]);
    rewardMocks.awardHabitRewards.mockResolvedValue(undefined);
    apiMocks.getFocusTimerData.mockResolvedValue({ dailyRecords: [], sessionRecords: [] });
    apiMocks.loadTaskGroups.mockResolvedValue([]);
    apiMocks.openBlockById.mockResolvedValue(true);
    apiMocks.createDocWithMd.mockResolvedValue('summary-doc');
    apiMocks.getIDsByHPath.mockResolvedValue([]);
    apiMocks.getPathByID.mockResolvedValue({ notebook: 'notebook-1', path: '/data/2026-10-05.sy' });
    apiMocks.getMoodData.mockResolvedValue({});
    apiMocks.sql.mockResolvedValue([]);
    apiMocks.removeDoc.mockResolvedValue(undefined);
    apiMocks.lsNotebooks.mockResolvedValue({ notebooks: [{ id: 'notebook-1', name: 'Notebook', icon: '', sort: 0, closed: false }] });
    rewardMocks.getRewardSnapshot.mockResolvedValue({ ...emptyRewardSnapshot });
    rewardMocks.redeemRewardShopItem.mockReset();
    rewardMocks.getRewardWorkbenchData.mockReset();
    rewardMocks.getRewardWorkbenchData.mockImplementation(async (forceRefresh: boolean) => {
      const snapshot = await rewardMocks.getRewardSnapshot(forceRefresh);
      return { snapshot, entries: snapshot.recentEntries || [], redemptions: snapshot.recentRedemptions || [] };
    });
    navigationMocks.openTaskViewByRequest.mockResolvedValue(undefined);
    navigationMocks.loadData.mockResolvedValue(null);
    navigationMocks.usePlugin.mockReturnValue({ app: {}, loadData: navigationMocks.loadData });
    siyuanMocks.Protyle.mockImplementation(function () {
      return { destroy: siyuanMocks.destroyProtyle };
    });
  });

  afterEach(() => {
    mountedWrappers.splice(0).forEach(wrapper => wrapper.unmount());
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('growth workbench keeps level and shop available without ledger records, and opens management', async () => {
    rewardMocks.getRewardWorkbenchData.mockResolvedValue(createGrowthData());
    const wrapper = mountStats();
    await flushPromises();
    await findButtonByText(wrapper, '.stats-tabs button', '成长').trigger('click');
    expect(wrapper.findAll('.growth-card-grid > article')).toHaveLength(4);
    expect(wrapper.find('.growth-level-card').text()).toContain('Lv.2');
    expect(wrapper.find('.growth-level-next').text()).toContain('45');
    expect(wrapper.find('.growth-wallet strong').text()).toBe('20');
    expect(wrapper.findAll('.growth-shop-item')).toHaveLength(5);
    expect(wrapper.findAll('.growth-history-item')).toHaveLength(0);
    expect(wrapper.find('.growth-history-card .growth-empty').text()).toContain('完成习惯');
    await wrapper.find('.growth-workbench-head button').trigger('click');
    expect(wrapper.emitted('open-detail')).toContainEqual([{ target: 'reward' }]);
  });

  it('growth workbench expands retained lists, filters only history, and renders plain text and dynamic icons', async () => {
    rewardMocks.getRewardWorkbenchData.mockResolvedValue(createGrowthData(12));
    const wrapper = mountStats();
    await flushPromises();
    await findButtonByText(wrapper, '.stats-tabs button', '成长').trigger('click');
    for (const [card, row, count] of [
      ['.growth-shop-card', '.growth-shop-item', 7], ['.growth-badges-card', '.growth-badge', 7],
      ['.growth-history-card', '.growth-history-item', 12], ['.growth-redemptions-card', '.growth-redemption', 7]
    ] as const) {
      expect(wrapper.find(card).findAll(row)).toHaveLength(5);
      await wrapper.find(card).find('.growth-list-toggle').trigger('click');
      expect(wrapper.find(card).findAll(row)).toHaveLength(count);
    }
    expect(wrapper.find('[data-shop-item-id="shop-0"] img').attributes('src')).toContain('api/icon/getDynamicIcon');
    expect(wrapper.find('.growth-shop-card').text()).not.toContain('<b>');
    await wrapper.find('.growth-badge').trigger('click');
    expect(wrapper.find('.growth-badge .growth-item-description').text()).toBe('坚持的成果');
    await wrapper.find('.growth-history-item').trigger('click');
    expect(wrapper.find('.growth-history-item .growth-item-description').text()).toBe('奖励说明');
    const metrics = () => wrapper.findAll('.growth-period-metrics strong').map(item => item.text());
    expect(metrics()).toEqual(['60', '24', '12', '1']);
    await wrapper.find('.growth-source-filter select').setValue('habit');
    expect(wrapper.findAll('.growth-history-item')).toHaveLength(5);
    await wrapper.find('.growth-history-card .growth-list-toggle').trigger('click');
    expect(wrapper.findAll('.growth-history-item')).toHaveLength(6);
    expect(metrics()).toEqual(['60', '24', '12', '1']);
  });

  it('growth workbench period follows the selected range without changing cumulative level or history', async () => {
    const data = createGrowthData(1);
    const yesterday = formatDateKey(addDays(new Date(), -1));
    data.entries.push({ ...data.entries[0], id: 'yesterday', createdAt: yesterday, xp: 20 });
    rewardMocks.getRewardWorkbenchData.mockResolvedValue(data);
    const wrapper = mountStats();
    await flushPromises();
    await findButtonByText(wrapper, '.stats-tabs button', '成长').trigger('click');
    await wrapper.findAll('.range-switch button')[0].trigger('click');
    expect(wrapper.find('.growth-period-metrics strong').text()).toBe('5');
    expect(wrapper.findAll('.growth-history-item')).toHaveLength(2);
    expect(wrapper.find('.growth-wallet strong').text()).toBe('20');
    expect(wrapper.find('.growth-level-value').text()).toBe('Lv.2');
  });

  it('growth workbench cancels confirmation, blocks repeat purchases, and follows persisted balance and redemption updates', async () => {
    const data = createGrowthData();
    rewardMocks.getRewardWorkbenchData.mockResolvedValue(data);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const wrapper = mountStats();
    await flushPromises();
    await findButtonByText(wrapper, '.stats-tabs button', '成长').trigger('click');
    await wrapper.find('[data-shop-item-id="shop-0"] .growth-redeem').trigger('click');
    expect(rewardMocks.redeemRewardShopItem).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    let finish!: (result: { snapshot: RewardSnapshot; redemption: RewardWorkbenchData['redemptions'][number] }) => void;
    rewardMocks.redeemRewardShopItem.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    await wrapper.find('[data-shop-item-id="shop-0"] .growth-redeem').trigger('click');
    expect(rewardMocks.redeemRewardShopItem).toHaveBeenCalledTimes(1);
    expect(rewardMocks.redeemRewardShopItem).toHaveBeenCalledWith('shop-0', 5);
    expect(wrapper.findAll('.growth-redeem').every(button => button.attributes('disabled') !== undefined)).toBe(true);
    expect(wrapper.find('.growth-wallet strong').text()).toBe('20');
    const redemption = { id: 'new-redemption', itemId: 'shop-0', itemTitle: '奖励 0', cost: 5, redeemedAt: new Date().toISOString() };
    const snapshot = { ...data.snapshot, availableCoins: 15, spentCoins: 15 };
    rewardMocks.getRewardWorkbenchData.mockResolvedValue({ ...data, snapshot, redemptions: [redemption, ...data.redemptions] });
    eventBus.emit(Events.REWARDS_UPDATED, { snapshot });
    finish({ snapshot, redemption });
    await flushPromises();
    expect(wrapper.find('.growth-wallet strong').text()).toBe('15');
    expect(wrapper.find('.growth-redemptions-card').text()).toContain('奖励 0');
    expect(wrapper.find('.growth-success').text()).toContain('奖励 0');
    await wrapper.findAll('.growth-shop-filter button')[1].trigger('click');
    expect(wrapper.findAll('.growth-shop-item')).toHaveLength(3);
  });

  it('growth workbench preserves balances on a failed purchase and refreshes the shop', async () => {
    rewardMocks.getRewardWorkbenchData.mockResolvedValue(createGrowthData());
    rewardMocks.redeemRewardShopItem.mockRejectedValue(new Error('价格已变更'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const wrapper = mountStats();
    await flushPromises();
    await findButtonByText(wrapper, '.stats-tabs button', '成长').trigger('click');
    await wrapper.find('.growth-redeem').trigger('click');
    await flushPromises();
    expect(wrapper.find('.growth-error').text()).toBe('价格已变更');
    expect(wrapper.find('.growth-wallet strong').text()).toBe('20');
    expect(rewardMocks.getRewardWorkbenchData).toHaveBeenLastCalledWith(true);
    expect(wrapper.find('.growth-success').exists()).toBe(false);
  });

  it('growth workbench ignores stale initial responses and preserves loaded data when refresh fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let finishInitial!: (data: RewardWorkbenchData) => void;
    rewardMocks.getRewardWorkbenchData.mockImplementationOnce(() => new Promise(resolve => { finishInitial = resolve; }));
    const wrapper = mountStats();
    await flushPromises();
    const current = createGrowthData(12);
    rewardMocks.getRewardWorkbenchData.mockResolvedValue(current);
    eventBus.emit(Events.REWARDS_UPDATED, { snapshot: current.snapshot });
    await flushPromises();
    finishInitial({ snapshot: emptyRewardSnapshot, entries: [], redemptions: [] });
    await flushPromises();
    await findButtonByText(wrapper, '.stats-tabs button', '成长').trigger('click');
    expect(wrapper.find('.growth-wallet strong').text()).toBe('20');
    expect(wrapper.find('.growth-period-metrics strong').text()).toBe('60');
    rewardMocks.getRewardWorkbenchData.mockRejectedValueOnce(new Error('read failed'));
    eventBus.emit(Events.REWARDS_UPDATED);
    await flushPromises();
    expect(wrapper.find('.growth-load-error').text()).toContain('加载失败');
    expect(wrapper.find('.growth-wallet strong').text()).toBe('20');
    await wrapper.find('.growth-load-error button').trigger('click');
    await flushPromises();
    expect(wrapper.find('.growth-load-error').exists()).toBe(false);
    expect(wrapper.find('.growth-period-metrics strong').text()).toBe('60');
  });

  it('keeps a greeting stable and refreshes it at period boundaries and on focus', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 7, 11, 29));
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const wrapper = mountStats();
    await flushPromises();
    const title = () => wrapper.find('.stats-toolbar-copy h2').text();
    expect(title()).toBe('上午好，记得喝杯水 💧');

    await vi.advanceTimersByTimeAsync(60_000);
    expect(title()).toBe('中午好，记得好好吃午饭 🍚');
    vi.mocked(Math.random).mockReturnValue(0.4);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(title()).toBe('中午好，记得好好吃午饭 🍚');

    vi.setSystemTime(new Date(2026, 9, 7, 19));
    window.dispatchEvent(new Event('focus'));
    await wrapper.vm.$nextTick();
    expect(title()).toBe('晚上好，今天的努力都值得肯定');
  });

  it('shows a stable dated quote and updates it at midnight and on focus', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 7, 23, 58));
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const wrapper = mountStats();
    await flushPromises();
    const subtitle = () => wrapper.find('.stats-toolbar-copy p').text();
    expect(subtitle()).toBe('2026年10月7日 · 脑子已开机，灵魂还在加载。');

    vi.mocked(Math.random).mockReturnValue(0.999);
    await wrapper.setProps({ sourceLabel: '新的任务范围' });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(subtitle()).toBe('2026年10月7日 · 脑子已开机，灵魂还在加载。');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(subtitle()).toBe('2026年10月8日 · 今天的隐藏任务：找出是谁把时间按了快进。');

    vi.mocked(Math.random).mockReturnValue(0);
    vi.setSystemTime(new Date(2026, 9, 9, 9));
    window.dispatchEvent(new Event('focus'));
    await wrapper.vm.$nextTick();
    expect(subtitle()).toBe('2026年10月9日 · 脑子已开机，灵魂还在加载。');
  });

  it('shows the dated quote in English', async () => {
    (window as any).siyuan.config.appearance.lang = 'en_US';
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 7, 15));
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const wrapper = mountStats();
    await flushPromises();
    expect(wrapper.find('.stats-toolbar-copy p').text()).toBe('10/7/2026 · Brain online. Soul still loading.');
  });

  it('switches between overview and detail tabs', async () => {
    const wrapper = mountStats();
    await flushPromises();

    expect(wrapper.find('.overview-dashboard').exists()).toBe(true);

    await findButtonByText(wrapper, '.stats-tabs button', '任务').trigger('click');
    expect(wrapper.find('.tasks-panel').exists()).toBe(true);
    expect(wrapper.find('.overview-dashboard').exists()).toBe(false);

    await findButtonByText(wrapper, '.stats-tabs button', '习惯与专注').trigger('click');
    expect(wrapper.find('.habits-panel').exists()).toBe(true);
    expect(wrapper.find('.focus-panel').exists()).toBe(true);
  });

  it('task review expands exact period metrics and keeps current counts stable when the period changes', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const now = new Date(2026, 9, 8, 12);
    vi.setSystemTime(now);
    const wrapper = mountStats({ tasks: [
      createTask({ id: 'new', blockId: 'new', title: 'New today', createdAt: now.toISOString(), dueDate: formatDateKey(addDays(now, -1)) }),
      createTask({ id: 'yesterday', title: 'New yesterday', createdAt: addDays(now, -1).toISOString() }),
      createTask({ id: 'old-done', blockId: 'old-done', title: 'Old task finished today', createdAt: addDays(now, -20).toISOString(), status: 'completed', completedAt: now.toISOString() }),
      createTask({ id: 'archived', blockId: 'archived', title: 'Archived completion', createdAt: now.toISOString(), status: 'completed', completedAt: now.toISOString(), archived: true }),
      createTask({ id: 'virtual', title: 'Virtual excluded', createdAt: now.toISOString(), isVirtual: true }),
      createTask({ id: 'cancelled', createdAt: addDays(now, -20).toISOString(), status: 'cancelled' })
    ] });
    await flushPromises();
    await findButtonByText(wrapper, '.stats-tabs button', '任务').trigger('click');

    const counts = () => wrapper.findAll('.task-metric-action .mini-stat-value').map(item => item.text());
    expect(counts()).toEqual(['3', '2', '2', '1']);
    expect(wrapper.findAll('.task-metric-group h4').map(item => item.text())).toEqual(['本周期表现', '当前任务状况']);
    expect(wrapper.find('.task-current-review .task-scope-note').text()).toContain('不随所选周期切换');
    const periodMetrics = wrapper.findAll('.task-metric-group')[0].findAll('button');
    await periodMetrics[0].trigger('click');
    expect(wrapper.findAll('.task-period-list .stuck-title').map(item => item.text())).toEqual([
      'Archived completion', 'New today', 'New yesterday'
    ]);
    expect(wrapper.findAll('.task-period-list button')).toHaveLength(Number(counts()[0]));

    await periodMetrics[1].trigger('click');
    expect(wrapper.findAll('.task-period-list .stuck-title').map(item => item.text())).toEqual([
      'Archived completion', 'Old task finished today'
    ]);
    expect(wrapper.findAll('.task-period-list button')).toHaveLength(Number(counts()[1]));
    await wrapper.findAll('.task-period-list button')[1].trigger('click');
    expect(apiMocks.openBlockById).toHaveBeenCalledWith('old-done');

    await periodMetrics[0].trigger('click');
    await findButtonByText(wrapper, '.range-switch button', '今日').trigger('click');
    expect(counts()).toEqual(['2', '2', '2', '1']);
    expect(wrapper.findAll('.task-period-list .stuck-title').map(item => item.text())).toEqual([
      'Archived completion', 'New today'
    ]);
    expect(periodMetrics[0].attributes('aria-expanded')).toBe('true');
    await periodMetrics[0].trigger('click');
    expect(wrapper.find('.task-period-details').exists()).toBe(false);
    expect(periodMetrics[0].attributes('aria-expanded')).toBe('false');
  });

  it('goal workbench prioritizes deadlines, partitions all goals once, and never flags completed goals as overdue', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 8, 12));
    const goalItems = [
      createWorkbenchGoal({ id: 'seven', dueDate: '2026-10-15' }),
      createWorkbenchGoal({ id: 'eight', dueDate: '2026-10-16' }),
      createWorkbenchGoal({ id: 'today', dueDate: '2026-10-08' }),
      createWorkbenchGoal({ id: 'overdue', dueDate: '2026-10-06' }),
      createWorkbenchGoal({ id: 'urgent-empty', status: 'empty', totalTasks: 0, completedTasks: 0, progressPercent: 0, dueDate: '2026-10-09' }),
      createWorkbenchGoal({ id: 'empty', status: 'empty', totalTasks: 0, completedTasks: 0, progressPercent: 0 }),
      createWorkbenchGoal({ id: 'completed', status: 'completed', completedTasks: 2, remainingTasks: 0, progressPercent: 100, dueDate: '2026-10-01' })
    ];
    const wrapper = mountStats({ goalItems });
    await flushPromises();
    await findButtonByText(wrapper, '.stats-tabs button', '目标').trigger('click');
    const ids = (selector: string) => wrapper.findAll(`${selector} .goal-workbench-item`).map(row => row.attributes('data-goal-id'));
    expect(wrapper.findAll('.goal-workbench-grid > article')).toHaveLength(4);
    expect(ids('.goal-workbench-attention')).toEqual(['overdue', 'today', 'urgent-empty', 'seven']);
    expect(ids('.goal-workbench-progress')).toEqual(['eight']);
    expect(ids('.goal-workbench-pending')).toEqual(['empty']);
    expect(ids('.goal-workbench-completed')).toEqual(['completed']);
    expect(wrapper.findAll('.goal-workbench-item')).toHaveLength(goalItems.length);
    expect(wrapper.find('[data-goal-id="overdue"]').text()).toContain('逾期 2 天');
    expect(wrapper.find('[data-goal-id="today"]').text()).toContain('今天截止');
    expect(wrapper.find('.goal-workbench-completed .is-overdue').exists()).toBe(false);
    expect(wrapper.find('.goal-workbench-head').text()).toContain('未完成目标平均进度 33%');
  });

  it('goal workbench expands each complete list and keeps global goal progress independent of period and scoped tasks', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 8, 12));
    const goalItems = ['attention', 'progress', 'pending', 'completed'].flatMap(group =>
      Array.from({ length: 6 }, (_, index) => createWorkbenchGoal({
        id: `${group}-${index}`, name: `${group} ${index}`, order: index,
        status: group === 'pending' ? 'empty' : group === 'completed' ? 'completed' : 'in-progress',
        totalTasks: group === 'pending' ? 0 : 2, completedTasks: group === 'completed' ? 2 : group === 'pending' ? 0 : 1,
        progressPercent: group === 'completed' ? 100 : group === 'pending' ? 0 : 50,
        dueDate: group === 'attention' ? '2026-10-08' : undefined
      }))
    );
    const wrapper = mountStats({ goalItems, tasks: [] });
    await flushPromises();
    await findButtonByText(wrapper, '.stats-tabs button', '目标').trigger('click');
    for (const group of ['attention', 'progress', 'pending', 'completed']) {
      const card = wrapper.find(`.goal-workbench-${group}`);
      expect(card.findAll('.goal-workbench-item')).toHaveLength(5);
      const toggle = card.find('.goal-workbench-toggle');
      expect(toggle.text()).toBe('查看全部 6 项');
      await toggle.trigger('click');
      expect(toggle.attributes('aria-expanded')).toBe('true');
      expect(card.findAll('.goal-workbench-item')).toHaveLength(6);
    }
    await findButtonByText(wrapper, '.range-switch button', '本月').trigger('click');
    expect(wrapper.findAll('.goal-workbench-item')).toHaveLength(24);
    expect(wrapper.find('[data-goal-id="progress-0"] .goal-workbench-footer').text()).toContain('1/2 任务');
    await wrapper.find('.goal-workbench-attention .goal-workbench-toggle').trigger('click');
    expect(wrapper.findAll('.goal-workbench-attention .goal-workbench-item')).toHaveLength(5);
    await wrapper.setProps({ goalItems: goalItems.filter(goal => goal.id !== 'completed-5') });
    expect(wrapper.find('.goal-workbench-completed .goal-workbench-toggle').exists()).toBe(false);
    expect(wrapper.findAll('.goal-workbench-completed .goal-workbench-item')).toHaveLength(5);
  });

  it('goal workbench opens goal management and the full goal task board while stripping title markup', async () => {
    const dynamicIcon = 'api/icon/getDynamicIcon?type=2&color=%23d2f31&date=2026-07-07&weekdayType=1&lang=4';
    const wrapper = mountStats({ goalItems: [
      createWorkbenchGoal({ id: 'rich', name: '<strong>Launch</strong> {: style="color:red"}', emoji: dynamicIcon, documentCount: 1 }),
      createWorkbenchGoal({ id: 'empty', name: 'New goal', status: 'empty', totalTasks: 0, completedTasks: 0, progressPercent: 0, taskMemberCount: 0 })
    ] });
    await flushPromises();
    await findButtonByText(wrapper, '.stats-tabs button', '目标').trigger('click');
    const rich = wrapper.find('[data-goal-id="rich"]');
    expect(rich.find('.goal-workbench-name').text()).toBe('Launch');
    expect(rich.find('.goal-workbench-icon img').attributes('src')).toBe(`/${dynamicIcon}`);
    expect(rich.text()).not.toContain('api/icon/');
    expect(rich.text()).not.toContain('style=');
    expect(rich.find('.goal-workbench-scope').text()).toContain('1 文档');
    await rich.find('.goal-workbench-name').trigger('click');
    expect(wrapper.emitted('open-detail')).toContainEqual([{ target: 'goal', goalId: 'rich' }]);
    await rich.find('.goal-workbench-footer button').trigger('click');
    await flushPromises();
    expect(navigationMocks.openTaskViewByRequest).toHaveBeenCalledWith({ view: 'kanban', source: 'goal:rich', documentId: 'all' });
    await wrapper.find('[data-goal-id="empty"] .goal-workbench-footer button').trigger('click');
    expect(wrapper.emitted('create-goal-task')).toContainEqual(['empty']);
    await wrapper.find('.goal-workbench-actions button').trigger('click');
    expect(wrapper.emitted('open-detail')).toContainEqual([{ target: 'goal' }]);
  });

  it('goal workbench next actions use global membership, expand beyond five, open tasks, and create for the chosen goal', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 8, 12));
    const goalTasks = Array.from({ length: 6 }, (_, index) => createTask({
      id: `global-${index}`, blockId: `global-${index}`, title: index === 0 ? '<strong>Ship</strong> {: style="color:red"}' : `Global ${index}`,
      notebookId: 'nb', rootId: 'outside-scope', dueDate: '2026-10-07', dueTime: `1${index}:00`
    }));
    const goalItems = goalTasks.map((task, index) => createWorkbenchGoal({ id: `goal-${index}`, name: `Goal ${index}`, taskMembers: [{ taskId: task.id }] }));
    goalItems.push(createWorkbenchGoal({ id: 'empty', name: 'Empty', status: 'empty', totalTasks: 0, completedTasks: 0, progressPercent: 0 }));
    const wrapper = mountStats({ tasks: [createTask({ title: 'Scoped unrelated' })], goalItems, goalTasks });
    await flushPromises();
    await findButtonByText(wrapper, '.stats-tabs button', '目标').trigger('click');
    const section = wrapper.find('.goal-next-actions');
    expect(section.findAll('.goal-next-action')).toHaveLength(5);
    expect(section.find('.goal-next-action-task').text()).toBe('Ship');
    expect(section.text()).not.toContain('style=');
    expect(section.text()).not.toContain('Scoped unrelated');
    await section.find('.goal-workbench-toggle').trigger('click');
    expect(section.findAll('.goal-next-action')).toHaveLength(7);
    await section.find('.goal-next-action-task').trigger('click');
    expect(apiMocks.openBlockById).toHaveBeenCalledWith('global-0');
    await section.find('[data-goal-id="goal-0"] .goal-add-task').trigger('click');
    expect(wrapper.emitted('create-goal-task')).toContainEqual(['goal-0']);
    await section.find('[data-goal-id="empty"] .goal-add-task').trigger('click');
    expect(wrapper.emitted('create-goal-task')).toContainEqual(['empty']);
    await findButtonByText(wrapper, '.range-switch button', '本月').trigger('click');
    expect(section.findAll('.goal-next-action')).toHaveLength(7);
    await wrapper.setProps({ goalItems: goalItems.map(goal => goal.id === 'goal-0' ? { ...goal, status: 'completed', progressPercent: 100 } : goal) });
    expect(section.findAll('.goal-next-action')).toHaveLength(6);
    expect(section.find('[data-goal-id="goal-0"]').exists()).toBe(false);
    await wrapper.find('.goal-workbench-completed .goal-add-task').trigger('click');
    expect(wrapper.emitted('create-goal-task')).toContainEqual(['goal-0']);
  });

  it('goal workbench next actions share safe completion and undo, block duplicate submissions, and preserve failed saves', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 8, 12));
    const previous = createTask({ id: 'global', blockId: 'global', title: 'Global task', notebookId: 'nb', rootId: 'doc', dueDate: '2026-10-07' });
    const followup = createTask({ id: 'followup', blockId: 'followup', title: 'Next task', notebookId: 'nb', rootId: 'doc', status: 'in-progress' });
    const goal = createWorkbenchGoal({ members: [{ notebookId: 'nb', documentId: 'doc' }] });
    let rejectSave!: (reason: Error) => void;
    const completeTask = vi.fn().mockImplementationOnce(() => new Promise((_, reject) => { rejectSave = reject; }));
    let wrapper: ReturnType<typeof mountStats>;
    const undoCompleteTask = vi.fn(async () => { await wrapper.setProps({ goalTasks: [previous, followup] }); });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    wrapper = mountStats({ tasks: [], goalItems: [goal], goalTasks: [previous, followup], completeTask, undoCompleteTask });
    await flushPromises();
    await findButtonByText(wrapper, '.stats-tabs button', '目标').trigger('click');
    const section = wrapper.find('.goal-next-actions');
    await section.find('.task-complete-action').trigger('click');
    expect(section.find('.goal-next-action').attributes('aria-busy')).toBe('true');
    expect(section.find('.task-complete-action').attributes('disabled')).toBeDefined();
    await section.find('.task-complete-action').trigger('click');
    expect(completeTask).toHaveBeenCalledOnce();
    rejectSave(new Error('offline'));
    await flushPromises();
    expect(section.find('.goal-next-action-task').text()).toBe('Global task');
    expect(section.find('[role="alert"]').text()).toContain('保存失败');
    expect(previous.status).toBe('pending');
    completeTask.mockImplementationOnce(async () => {
      const saved = { ...previous, status: 'completed', completedAt: new Date().toISOString() };
      await wrapper.setProps({ goalTasks: [saved, followup] });
      return saved;
    });
    await section.find('.task-complete-action').trigger('click');
    await flushPromises();
    expect(section.find('.goal-next-action-task').text()).toBe('Next task');
    expect(section.find('.task-undo-notice').text()).toContain('Global task');
    await section.find('.task-undo-notice button').trigger('click');
    await flushPromises();
    expect(undoCompleteTask).toHaveBeenCalledWith(expect.objectContaining({ id: 'global', status: 'completed' }), previous);
    expect(section.find('.goal-next-action-task').text()).toBe('Global task');
    expect(section.find('.task-undo-notice').exists()).toBe(false);
  });

  it('goal workbench next actions reschedule shared tasks in one row at a time and refresh recommendations', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 8, 12));
    const shared = createTask({ id: 'shared', blockId: 'shared', title: 'Shared', notebookId: 'nb', rootId: 'doc', dueDate: '2026-10-07', startDate: '2026-10-01' });
    const followup = createTask({ id: 'followup', blockId: 'followup', title: 'Follow up', notebookId: 'nb', rootId: 'doc', status: 'in-progress' });
    const goalItems = ['first', 'second'].map(id => createWorkbenchGoal({ id, members: [{ notebookId: 'nb', documentId: 'doc' }] }));
    let wrapper: ReturnType<typeof mountStats>;
    const rescheduleTask = vi.fn(async (_task, dueDate) => { await wrapper.setProps({ goalTasks: [{ ...shared, dueDate }, followup] }); });
    wrapper = mountStats({ goalItems, goalTasks: [shared, followup], rescheduleTask });
    await flushPromises();
    await findButtonByText(wrapper, '.stats-tabs button', '目标').trigger('click');
    const section = wrapper.find('.goal-next-actions');
    const rows = section.findAll('.goal-next-action');
    await rows[0].find('.task-reschedule-action').trigger('click');
    expect(section.findAll('.task-reschedule-menu')).toHaveLength(1);
    await rows[1].find('.task-reschedule-action').trigger('click');
    expect(section.findAll('.task-reschedule-menu')).toHaveLength(1);
    expect(rows[0].find('.task-reschedule-menu').exists()).toBe(false);
    expect(section.find('input[type="date"]').attributes('min')).toBe('2026-10-01');
    await section.find('input[type="date"]').setValue('2026-10-20');
    await section.find('.task-reschedule-custom').trigger('submit');
    await flushPromises();
    expect(rescheduleTask).toHaveBeenCalledWith(shared, '2026-10-20');
    expect(section.findAll('.goal-next-action-task').map(task => task.text())).toEqual(['Follow up', 'Follow up']);
    expect(section.find('.task-reschedule-menu').exists()).toBe(false);
  });

  it('goal workbench pins up to three priority goals, restores the selection, and keeps them first in next actions', async () => {
    const goalItems = Array.from({ length: 6 }, (_, index) => createWorkbenchGoal({ id: `goal-${index}`, name: `Goal ${index}`, taskMembers: [{ taskId: `task-${index}` }] }));
    const goalTasks = goalItems.map((_, index) => createTask({ id: `task-${index}`, blockId: `task-${index}`, title: `<b>Priority ${index}</b>`, notebookId: 'nb', rootId: 'doc' }));
    const wrapper = mountStats({ goalItems, goalTasks });
    await flushPromises();
    await findButtonByText(wrapper, '.stats-tabs button', '目标').trigger('click');
    await wrapper.find('.goal-workbench-progress .goal-workbench-toggle').trigger('click');
    const pin = (id: string) => wrapper.find(`.goal-workbench-grid [data-goal-id="${id}"] .goal-focus-toggle`);
    for (const id of ['goal-5', 'goal-2', 'goal-0']) await pin(id).trigger('click');
    expect(wrapper.findAll('.goal-focus-card').map(card => card.attributes('data-focus-goal-id'))).toEqual(['goal-5', 'goal-2', 'goal-0']);
    expect(wrapper.find('.goal-focus-next-task').text()).toBe('下一步：Priority 5');
    await wrapper.find('.goal-focus-next-task').trigger('click');
    expect(apiMocks.openBlockById).toHaveBeenCalledWith('task-5');
    expect(wrapper.findAll('.goal-next-action').slice(0, 3).map(row => row.attributes('data-goal-id'))).toEqual(['goal-5', 'goal-2', 'goal-0']);
    expect(pin('goal-1').attributes('disabled')).toBeDefined();
    expect(pin('goal-5').attributes('aria-pressed')).toBe('true');
    expect(JSON.parse(localStorageData.get('pinch.personal-stats.focus-goals')!)).toEqual(['goal-5', 'goal-2', 'goal-0']);
    await wrapper.find('.goal-focus-card .goal-focus-toggle').trigger('click');
    expect(pin('goal-1').attributes('disabled')).toBeUndefined();
    await pin('goal-1').trigger('click');
    const restored = mountStats({ goalItems, goalTasks });
    await flushPromises();
    await findButtonByText(restored, '.stats-tabs button', '目标').trigger('click');
    expect(restored.findAll('.goal-focus-card').map(card => card.attributes('data-focus-goal-id'))).toEqual(['goal-2', 'goal-0', 'goal-1']);
    await wrapper.setProps({ goalItems: goalItems.map(goal => goal.id === 'goal-2' ? { ...goal, status: 'completed', progressPercent: 100 } : goal) });
    expect(wrapper.findAll('.goal-focus-card')).toHaveLength(2);
    await pin('goal-3').trigger('click');
    expect(JSON.parse(localStorageData.get('pinch.personal-stats.focus-goals')!)).toEqual(['goal-0', 'goal-1', 'goal-3']);
    await findButtonByText(wrapper, '.range-switch button', '本月').trigger('click');
    expect(wrapper.findAll('.goal-focus-card')).toHaveLength(3);
  });

  it('goal workbench preserves pins on failed saves and temporary empty loads, and follows storage updates', async () => {
    localStorageData.set('pinch.personal-stats.focus-goals', '{invalid');
    const goalItems = [createWorkbenchGoal({ id: 'one' }), createWorkbenchGoal({ id: 'two' })];
    const wrapper = mountStats({ goalItems });
    await flushPromises();
    await findButtonByText(wrapper, '.stats-tabs button', '目标').trigger('click');
    expect(wrapper.findAll('.goal-focus-card')).toHaveLength(0);
    const pin = wrapper.find('.goal-workbench-grid [data-goal-id="one"] .goal-focus-toggle');
    vi.mocked(window.localStorage.setItem).mockImplementationOnce(() => { throw new Error('storage full'); });
    await pin.trigger('click');
    expect(wrapper.find('.goal-focus-error').text()).toContain('保存失败');
    expect(pin.attributes('aria-pressed')).toBe('false');
    await pin.trigger('click');
    expect(wrapper.findAll('.goal-focus-card')).toHaveLength(1);
    expect(wrapper.find('.goal-focus-error').exists()).toBe(false);
    await wrapper.setProps({ goalItems: [] });
    expect(localStorageData.get('pinch.personal-stats.focus-goals')).toBe('["one"]');
    await wrapper.setProps({ goalItems });
    expect(wrapper.find('.goal-focus-card').attributes('data-focus-goal-id')).toBe('one');
    localStorageData.set('pinch.personal-stats.focus-goals', '["two"]');
    window.dispatchEvent(new StorageEvent('storage', { key: 'pinch.personal-stats.focus-goals', newValue: '["two"]' }));
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.goal-focus-card').attributes('data-focus-goal-id')).toBe('two');
    localStorageData.clear();
    window.dispatchEvent(new StorageEvent('storage', { key: null, newValue: null }));
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('.goal-focus-card')).toHaveLength(0);
  });

  it('goal workbench weekly progress includes archived completions, expands goal and task lists, opens sources, and follows the week', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 8, 12));
    const goalItems = Array.from({ length: 6 }, (_, index) => createWorkbenchGoal({ id: `g-${index}`, name: `Goal ${index}`, members: [{ notebookId: 'nb', documentId: `doc-${index}` }] }));
    const goalTasks = goalItems.flatMap((goal, index) => Array.from({ length: 6 }, (_, taskIndex) => createTask({
      id: `${goal.id}-${taskIndex}`, blockId: `${goal.id}-${taskIndex}`, title: `<b>Done ${index}-${taskIndex}</b> {: style="color:red"}`,
      notebookId: 'nb', rootId: `doc-${index}`, status: 'completed', archived: taskIndex === 0,
      completedAt: new Date(2026, 9, 8, 6 + taskIndex).toISOString()
    })));
    const wrapper = mountStats({ tasks: [], goalItems, goalTasks });
    await flushPromises();
    await findButtonByText(wrapper, '.stats-tabs button', '目标').trigger('click');
    const section = wrapper.find('.goal-weekly-progress');
    expect(section.find('header').text()).toContain('2026-10-05 — 2026-10-08');
    expect(section.find('header').text()).toContain('完成 36 项任务 · 推进 6 个目标');
    expect(section.findAll('.goal-weekly-entry')).toHaveLength(5);
    expect(section.findAll('.goal-weekly-task')).toHaveLength(0);
    expect(section.text()).not.toContain('style=');
    await section.find(':scope > .goal-workbench-toggle').trigger('click');
    expect(section.findAll('.goal-weekly-entry')).toHaveLength(6);
    const entry = section.find('[data-weekly-goal-id="g-0"]');
    await entry.find('.goal-weekly-detail-toggle').trigger('click');
    expect(entry.findAll('.goal-weekly-task')).toHaveLength(5);
    expect(entry.find('.goal-weekly-task').text()).toContain('Done 0-5');
    await entry.find('.goal-workbench-toggle').trigger('click');
    expect(entry.findAll('.goal-weekly-task')).toHaveLength(6);
    expect(entry.findAll('.goal-weekly-task')[5].text()).toContain('已归档');
    await entry.findAll('.goal-weekly-task')[5].trigger('click');
    expect(apiMocks.openBlockById).toHaveBeenCalledWith('g-0-0');
    await entry.find('.goal-workbench-name').trigger('click');
    expect(wrapper.emitted('open-detail')).toContainEqual([{ target: 'goal', goalId: 'g-0' }]);
    await findButtonByText(wrapper, '.range-switch button', '本月').trigger('click');
    expect(section.find('header').text()).toContain('2026-10-05 — 2026-10-08');
    await wrapper.setProps({ goalTasks: goalTasks.map(task => task.id === 'g-0-0' ? { ...task, status: 'pending' } : task) });
    expect(section.find('header').text()).toContain('完成 35 项任务');
    vi.setSystemTime(new Date(2026, 9, 12, 12));
    window.dispatchEvent(new Event('focus'));
    await wrapper.vm.$nextTick();
    expect(section.find('header').text()).toContain('2026-10-12 — 2026-10-12');
    expect(section.findAll('.goal-weekly-entry')).toHaveLength(0);
    expect(section.text()).toContain('本周还没有');
  });

  it('goal workbench handles empty workspaces and ignores invalid deadlines', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 8, 12));
    const wrapper = mountStats();
    await flushPromises();
    await findButtonByText(wrapper, '.stats-tabs button', '目标').trigger('click');
    expect(wrapper.findAll('.goal-workbench-item')).toHaveLength(0);
    await wrapper.find('.goal-workbench-actions button').trigger('click');
    expect(wrapper.emitted('open-detail')).toContainEqual([{ target: 'goal' }]);
    await wrapper.setProps({ goalItems: [createWorkbenchGoal({ id: 'invalid', dueDate: '2026-02-30' })] });
    expect(wrapper.find('.goal-workbench-attention .goal-workbench-item').exists()).toBe(false);
    expect(wrapper.find('.goal-workbench-progress .goal-workbench-item').text()).toContain('未设截止日');
  });

  it('rhythm workbench shows scheduled pending habits, expands beyond five, and opens habit details', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 8, 12));
    const habitData = [
      ...Array.from({ length: 6 }, (_, index) => createHabit({ id: `pending-${index}`, name: `Pending ${index}`, calendar: [] })),
      createHabit({ id: 'paused', name: 'Paused', isPaused: true, calendar: [] }),
      createHabit({ id: 'future', name: 'Future', createdAt: '2026-10-09T00:00:00', calendar: [] }),
      createHabit({ id: 'off', name: 'Rest day', frequency: 'custom', customSchedule: { type: 'week', weekDays: [1] }, calendar: [] }),
      createHabit({ id: 'weekly-done', name: 'Weekly complete', frequency: 'weekly2', createdAt: '2026-10-01T00:00:00', calendar: [
        { date: '2026-10-05', completed: true }, { date: '2026-10-06', completed: true }
      ] }),
      createHabit({ id: 'complete', name: 'Complete' })
    ];
    apiMocks.getHabits.mockResolvedValue(habitData);
    const wrapper = mountStats();
    await flushPromises();
    await findButtonByText(wrapper, '.stats-tabs button', '习惯与专注').trigger('click');
    expect(wrapper.findAll('.rhythm-workbench-grid > article')).toHaveLength(4);
    const card = wrapper.find('.today-habits-workbench');
    expect(card.findAll('.habit-checkin-row')).toHaveLength(5);
    expect(card.find('.rhythm-list-toggle').text()).toBe('查看全部 6 项');
    await card.find('.rhythm-list-toggle').trigger('click');
    expect(card.findAll('.habit-checkin-row')).toHaveLength(6);
    await card.find('.rhythm-item-title').trigger('click');
    expect(wrapper.emitted('open-detail')).toContainEqual([{ target: 'habit-detail', habitId: 'pending-0' }]);
    await findButtonByText(wrapper, '.range-switch button', '本月').trigger('click');
    expect(card.findAll('.habit-checkin-row')).toHaveLength(6);
  });

  it('rhythm workbench uses schedule-aware completion rates and shows missed dates without flagging rest days or open weeks', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 8, 12));
    apiMocks.getHabits.mockResolvedValue([
      createHabit({ id: 'custom', name: 'Scheduled success', frequency: 'custom', createdAt: '2026-10-05T00:00:00', customSchedule: { type: 'week', weekDays: [1, 3] }, calendar: [
        { date: '2026-10-05', completed: true }, { date: '2026-10-07', completed: true }
      ] }),
      createHabit({ id: 'partial', name: 'Partial', createdAt: '2026-10-07T00:00:00', timesPerDay: 3, calendar: [
        { date: '2026-10-07', completed: false, completedCount: 1, targetCount: 3 },
        { date: '2026-10-08', completed: false, completedCount: 1, targetCount: 3 }
      ] }),
      createHabit({ id: 'paused', name: 'Paused', isPaused: true, createdAt: '2026-10-01T00:00:00', calendar: [
        { date: '2026-10-07', completed: true, completedCount: 5, targetCount: 1 }
      ] })
    ]);
    const wrapper = mountStats();
    await flushPromises();
    await findButtonByText(wrapper, '.stats-tabs button', '习惯与专注').trigger('click');
    expect(wrapper.findAll('.habits-panel .mini-stat-value').map(item => item.text())).toEqual(['2', '9', '2 天', '67%']);
    const attention = wrapper.find('.attention-habits-workbench');
    expect(attention.findAll('.attention-habit-row')).toHaveLength(1);
    expect(attention.find('.rhythm-item-title').text()).toContain('Partial');
    await attention.find('.rhythm-item-footer button').trigger('click');
    expect(attention.find('.rhythm-missed-dates').text()).toContain('2026-10-07');
    expect(attention.find('.rhythm-missed-dates').text()).not.toContain('2026-10-08');
    eventBus.emit(Events.HABITS_UPDATED, { habits: [createHabit({ id: 'weekly', name: 'Open week', frequency: 'weekly2', createdAt: '2026-10-05T00:00:00', calendar: [] })] });
    await wrapper.vm.$nextTick();
    expect(attention.findAll('.attention-habit-row')).toHaveLength(0);
    expect(wrapper.find('.rhythm-week-progress').text()).toBe('本周已达标 0/2 天');
  });

  it('rhythm workbench saves a check-in once before updating progress and can undo only that check-in', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 8, 12));
    const initial = createHabit({ id: 'partial', name: 'Drink water', timesPerDay: 2, calendar: [
      { date: '2026-10-08', completed: true, completedCount: 1, targetCount: 2, note: 'Keep this note' }
    ] });
    apiMocks.getHabits.mockResolvedValue([initial]);
    let resolveSave!: (habits: Habit[]) => void;
    apiMocks.upsertHabit.mockImplementationOnce(() => new Promise<Habit[]>(resolve => { resolveSave = resolve; }));
    const wrapper = mountStats();
    await flushPromises();
    await findButtonByText(wrapper, '.stats-tabs button', '习惯与专注').trigger('click');
    const card = wrapper.find('.today-habits-workbench');
    const action = card.find('.habit-checkin-action');
    await action.trigger('click');
    await action.trigger('click');
    expect(apiMocks.upsertHabit).toHaveBeenCalledTimes(1);
    expect(card.text()).toContain('今日 1/2 次');
    expect(wrapper.find('.rhythm-undo').exists()).toBe(false);
    expect(initial.calendar[0].completedCount).toBe(1);
    const saved = apiMocks.upsertHabit.mock.calls[0][0] as Habit;
    resolveSave([{ ...saved, calendar: saved.calendar.map(entry => ({ date: entry.date, completed: entry.completed, targetCount: entry.targetCount,
      completedCount: entry.completedCount, timestamp: entry.timestamp, checkinTimestamps: entry.checkinTimestamps, note: entry.note })) }]);
    await flushPromises();
    expect(card.findAll('.habit-checkin-row')).toHaveLength(0);
    await wrapper.find('.rhythm-undo button').trigger('click');
    await flushPromises();
    expect(apiMocks.upsertHabit).toHaveBeenCalledTimes(2);
    expect(apiMocks.upsertHabit.mock.calls[1][0].calendar.find((entry: Habit['calendar'][number]) => entry.date === '2026-10-08')).toEqual(initial.calendar[0]);
    expect(card.text()).toContain('今日 1/2 次');
    expect(wrapper.find('.rhythm-undo').exists()).toBe(false);
  });

  it('rhythm workbench preserves progress on save failure and rejects undo after another check-in changes the record', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 8, 12));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const initial = createHabit({ id: 'partial', timesPerDay: 3, calendar: [] });
    apiMocks.getHabits.mockResolvedValue([initial]);
    apiMocks.upsertHabit.mockRejectedValueOnce(new Error('save failed'));
    const wrapper = mountStats();
    await flushPromises();
    await findButtonByText(wrapper, '.stats-tabs button', '习惯与专注').trigger('click');
    const card = wrapper.find('.today-habits-workbench');
    await card.find('.habit-checkin-action').trigger('click');
    await flushPromises();
    expect(card.text()).toContain('今日 0/3 次');
    expect(card.find('[role="alert"]').text()).toContain('保存失败');
    expect(wrapper.find('.rhythm-undo').exists()).toBe(false);
    await card.find('.habit-checkin-action').trigger('click');
    await flushPromises();
    expect(card.text()).toContain('今日 1/3 次');
    eventBus.emit(Events.HABITS_UPDATED, { habits: [{ ...initial, calendar: [{ date: '2026-10-08', completed: false, completedCount: 2, targetCount: 3 }] }] });
    await wrapper.vm.$nextTick();
    await wrapper.find('.rhythm-undo button').trigger('click');
    expect(apiMocks.upsertHabit).toHaveBeenCalledTimes(2);
    expect(wrapper.find('.rhythm-workbench > [role="alert"]').text()).toContain('已发生变化');
    expect(card.text()).toContain('今日 2/3 次');
    vi.setSystemTime(new Date(2026, 9, 9, 9));
    window.dispatchEvent(new Event('focus'));
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.rhythm-undo').exists()).toBe(false);
    expect(card.text()).toContain('今日 0/3 次');
  });

  it('rhythm workbench lists recent sessions, keeps today totals fixed, and opens linked objects without exposing markup', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 8, 12));
    const sessions: FocusSessionRecord[] = Array.from({ length: 8 }, (_, index) => ({
      id: `focus-${index}`, date: '2026-10-08', minutes: 15, timestamp: new Date(2026, 9, 8, 8, index).getTime(),
      targetType: 'task', targetId: 'linked', targetName: '<strong>Task 91</strong>{: style="color: red;"}'
    }));
    sessions[0] = { ...sessions[0], targetType: 'habit', targetId: 'habit-1', targetName: 'Drink water' };
    sessions[1] = { ...sessions[1], targetType: 'unlinked', targetId: undefined, targetName: undefined };
    apiMocks.getHabits.mockResolvedValue([createHabit()]);
    apiMocks.getFocusTimerData.mockResolvedValue({ dailyRecords: [{ date: '2026-10-08', minutes: 135, sessions: 9 }], sessionRecords: [
      ...sessions, { ...sessions[0], id: 'old', date: '2026-10-01', timestamp: new Date(2026, 9, 1).getTime() }
    ] });
    const wrapper = mountStats({ tasks: [createTask({ id: 'linked', blockId: 'linked-block' })] });
    await flushPromises();
    await findButtonByText(wrapper, '.stats-tabs button', '习惯与专注').trigger('click');
    const recent = wrapper.find('.recent-focus-workbench');
    const today = wrapper.find('.today-focus-workbench');
    expect(today.text()).toContain('2h 15m');
    expect(today.text()).toContain('9 次会话');
    expect(today.text()).toContain('部分会话仅有汇总');
    expect(recent.findAll('.rhythm-record')).toHaveLength(5);
    expect(recent.text()).not.toMatch(/<strong>|style=/);
    await recent.find('.rhythm-record').trigger('click');
    expect(apiMocks.openBlockById).toHaveBeenCalledWith('linked-block');
    await recent.find('.rhythm-list-toggle').trigger('click');
    expect(recent.findAll('.rhythm-record')).toHaveLength(8);
    const unlinked = recent.findAll('.rhythm-record').find(item => item.text().includes('未关联专注'))!;
    expect(unlinked.attributes('disabled')).toBeDefined();
    await recent.findAll('.rhythm-record').find(item => item.text().includes('Drink water'))!.trigger('click');
    expect(wrapper.emitted('open-detail')).toContainEqual([{ target: 'habit-detail', habitId: 'habit-1' }]);
    await findButtonByText(wrapper, '.range-switch button', '本月').trigger('click');
    expect(recent.findAll('.rhythm-record')).toHaveLength(9);
    expect(today.text()).toContain('2h 15m');
    await today.find('.rhythm-list-toggle').trigger('click');
    expect(today.findAll('.rhythm-record')).toHaveLength(8);
  });

  it('task review metrics navigate to current filters and retain the archive entry', async () => {
    const overdueDate = formatDateKey(addDays(new Date(), -2));
    const wrapper = mountStats({ tasks: [
      createTask({ id: 'overdue', blockId: 'overdue', dueDate: overdueDate }),
      createTask({ id: 'active-overdue', status: 'in-progress', dueDate: overdueDate }),
      createTask({ id: 'completed-overdue', status: 'completed', dueDate: overdueDate }),
      createTask({ id: 'cancelled-overdue', status: 'cancelled', dueDate: overdueDate }),
      createTask({ id: 'delayed-overdue', status: 'delayed', dueDate: overdueDate }),
      createTask({ id: 'unscheduled', dueDate: '' }),
      createTask({ id: 'archived', archived: true })
    ] });
    await flushPromises();
    await findButtonByText(wrapper, '.stats-tabs button', '任务').trigger('click');

    expect(wrapper.find('.task-metric-action.overdue strong').text()).toBe('2');
    expect(wrapper.find('.task-status-pills .status-pill.overdue').text()).toBe('已逾期 2');
    expect(wrapper.find('.task-status-pills').text()).not.toContain('已拖延');
    await wrapper.find('.task-metric-action.backlog').trigger('click');
    await wrapper.find('.task-metric-action.overdue').trigger('click');
    await wrapper.find('.task-status-pills .status-pill.overdue').trigger('click');
    await wrapper.find('.task-current-review .overview-link-action').trigger('click');
    expect(wrapper.emitted('drilldown')).toEqual([
      [expect.objectContaining({ target: 'table', statuses: ['pending', 'in-progress', 'delayed'] })],
      [expect.objectContaining({ target: 'table', due: 'overdue', statuses: ['pending', 'in-progress'] })],
      [expect.objectContaining({ target: 'table', due: 'overdue', statuses: ['pending', 'in-progress'] })],
      [expect.objectContaining({ target: 'archive-table' })]
    ]);
    const body = wrapper.find('.tasks-panel .panel-body').element;
    const sections = Array.from(body.children).map(item => item.className);
    expect(sections.indexOf('task-current-review')).toBeLessThan(sections.indexOf('trend-stack'));
    expect(sections.indexOf('trend-stack')).toBeLessThan(sections.indexOf('task-distribution-review'));

    await wrapper.setProps({ tasks: [createTask({ createdAt: addDays(new Date(), -60).toISOString() })] });
    expect(wrapper.findAll('.task-metric-group')[0].findAll('button').every(button => button.attributes('disabled') !== undefined)).toBe(true);
    expect(wrapper.find('.task-metric-action.overdue').attributes('disabled')).toBeDefined();
    expect(wrapper.find('.task-status-pills .status-pill.overdue').text()).toBe('已逾期 0');
    expect(wrapper.find('.task-status-pills .status-pill.overdue').attributes('disabled')).toBeDefined();
    expect(wrapper.find('.task-current-review .overview-link-action').attributes('disabled')).toBeDefined();
  });

  it('task review saves up to three daily priorities, restores them, and resets on the next day', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 8, 12));
    const tasks = ['A', 'B', 'C', 'D'].map(title => createTask({ id: title, blockId: title, title: `Task ${title}`, focusEstimate: { unit: 'minutes', value: 20 } }));
    const wrapper = mountStats({ tasks });
    await flushPromises();
    await findButtonByText(wrapper, '.stats-tabs button', '任务').trigger('click');
    await wrapper.find('.task-priority-picker-toggle').trigger('click');
    const options = wrapper.findAll('.task-priority-options button');
    for (const option of options.slice(0, 3)) await option.trigger('click');
    expect(wrapper.findAll('.priorities-task-row .stuck-title').map(item => item.text())).toEqual(['Task A', 'Task B', 'Task C']);
    expect(options[3].attributes('disabled')).toBeDefined();
    expect(JSON.parse(localStorageData.get('pinch.personal-stats.today-priorities')!)).toEqual({ date: '2026-10-08', ids: ['A', 'B', 'C'] });

    const restored = mountStats({ tasks });
    await flushPromises();
    await findButtonByText(restored, '.stats-tabs button', '任务').trigger('click');
    expect(restored.findAll('.priorities-task-row')).toHaveLength(3);
    await findButtonByText(restored, '.range-switch button', '今日').trigger('click');
    expect(restored.findAll('.priorities-task-row')).toHaveLength(3);
    await restored.find('.task-priority-remove').trigger('click');
    expect(restored.findAll('.priorities-task-row')).toHaveLength(2);
    vi.setSystemTime(new Date(2026, 9, 9, 9));
    window.dispatchEvent(new Event('focus'));
    await restored.vm.$nextTick();
    expect(restored.findAll('.priorities-task-row')).toHaveLength(0);
    expect(restored.find('.priorities-review-block .list-block-subtle').text()).toContain('0/3');
  });

  it('task review includes all tasks due today in time order and merges manual priorities without duplicates', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 8, 12));
    const tasks = [
      createTask({ id: 'no-time', title: 'No time', dueDate: '2026-10-08' }),
      createTask({ id: 'late', title: 'Late', dueDate: '2026-10-08', dueTime: '18:00' }),
      createTask({ id: 'early', title: 'Early', dueDate: '2026-10-08', dueTime: '09:00' }),
      createTask({ id: 'midday', title: 'Midday', dueDate: '2026-10-08', dueTime: '12:00' }),
      createTask({ id: 'manual', title: 'Manual' }),
      createTask({ id: 'tomorrow', title: 'Tomorrow', dueDate: '2026-10-09' }),
      createTask({ id: 'overdue', title: 'Overdue', dueDate: '2026-10-07' }),
      ...[
        { id: 'done', status: 'completed' as const },
        { id: 'cancelled', status: 'cancelled' as const },
        { id: 'archived', archived: true },
        { id: 'virtual', isVirtual: true }
      ].map(task => createTask({ ...task, title: task.id, dueDate: '2026-10-08' }))
    ];
    const wrapper = mountStats({ tasks });
    await flushPromises();
    await findButtonByText(wrapper, '.stats-tabs button', '任务').trigger('click');
    const titles = () => wrapper.findAll('.priorities-task-row .stuck-title').map(item => item.text());
    expect(titles()).toEqual(['Early', 'Midday', 'Late', 'No time']);
    expect(wrapper.findAll('.priorities-task-row .task-priority-remove')).toHaveLength(0);
    expect(wrapper.findAll('.priorities-task-row .today-deadline').map(item => item.text())).toEqual([
      '今日截止 09:00', '今日截止 12:00', '今日截止 18:00', '今日截止'
    ]);
    await wrapper.find('.task-priority-picker-toggle').trigger('click');
    for (const title of ['Early', 'Manual']) {
      const option = wrapper.findAll('.task-priority-options button').find(item => item.text().startsWith(title));
      await option!.trigger('click');
    }
    expect(titles()).toEqual(['Early', 'Midday', 'Late', 'No time', 'Manual']);
    expect(wrapper.findAll('.priorities-task-row .task-priority-remove')).toHaveLength(2);
    expect(JSON.parse(localStorageData.get('pinch.personal-stats.today-priorities')!)).toEqual({
      date: '2026-10-08', ids: ['early', 'manual']
    });
    await wrapper.find('.priorities-task-row .task-priority-remove').trigger('click');
    expect(titles()).toEqual(['Early', 'Midday', 'Late', 'No time', 'Manual']);
    expect(wrapper.find('.priorities-review-block .list-block-subtle').text()).toContain('今日截止 4 项');
  });

  it('task review refreshes automatic priorities after completion, rescheduling, scope changes, and midnight', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 8, 12));
    const first = createTask({ id: 'first', title: 'First', dueDate: '2026-10-08' });
    const second = createTask({ id: 'second', title: 'Second', dueDate: '2026-10-08' });
    const tomorrow = createTask({ id: 'tomorrow', title: 'Tomorrow', dueDate: '2026-10-09' });
    const wrapper = mountStats({ tasks: [first, second, tomorrow] });
    await flushPromises();
    await findButtonByText(wrapper, '.stats-tabs button', '任务').trigger('click');
    const titles = () => wrapper.findAll('.priorities-task-row .stuck-title').map(item => item.text());
    expect(titles()).toEqual(['First', 'Second']);
    await wrapper.setProps({ tasks: [{ ...first, status: 'completed' }, second, tomorrow] });
    expect(titles()).toEqual(['Second']);
    const rescheduled = { ...second, dueDate: '2026-10-09' };
    await wrapper.setProps({ tasks: [rescheduled, tomorrow] });
    expect(titles()).toEqual([]);
    vi.setSystemTime(new Date(2026, 9, 9, 9));
    window.dispatchEvent(new Event('focus'));
    await wrapper.vm.$nextTick();
    expect(titles()).toEqual(['Second', 'Tomorrow']);
    await wrapper.setProps({ tasks: [tomorrow] });
    expect(titles()).toEqual(['Tomorrow']);
    expect(localStorageData.has('pinch.personal-stats.today-priorities')).toBe(false);
  });

  it('task review safely handles invalid saved priorities and storage write failures', async () => {
    localStorageData.set('pinch.personal-stats.today-priorities', 'invalid-json');
    const wrapper = mountStats({ tasks: [createTask()] });
    await flushPromises();
    await findButtonByText(wrapper, '.stats-tabs button', '任务').trigger('click');
    await wrapper.find('.task-priority-picker-toggle').trigger('click');
    vi.mocked(window.localStorage.setItem).mockImplementationOnce(() => { throw new Error('storage unavailable'); });
    await wrapper.find('.task-priority-options button').trigger('click');
    expect(wrapper.findAll('.priorities-task-row')).toHaveLength(1);
    expect(wrapper.find('.priorities-review-block [role="alert"]').text()).toContain('未能保存');
  });

  it('task review inbox distinguishes unscheduled tasks from tasks without tags or effective goals', async () => {
    const tasks = [
      createTask({ id: 'loose', title: 'Loose task' }),
      createTask({ id: 'tagged', title: 'Tagged unscheduled', tags: ['tag-1'] }),
      createTask({ id: 'planned', title: 'Planned unclassified', dueDate: formatDateKey(new Date()) }),
      createTask({ id: 'linked', title: 'Direct goal member', dueDate: formatDateKey(new Date()) }),
      createTask({ id: 'inherited', title: 'Document goal member', notebookId: 'notebook-1', rootId: 'goal-doc', dueDate: formatDateKey(new Date()) }),
      createTask({ id: 'done', status: 'completed' }),
      createTask({ id: 'archived', archived: true }),
      createTask({ id: 'virtual', isVirtual: true })
    ];
    const goal: GoalListItem = {
      id: 'goal-1', name: 'Goal', members: [{ notebookId: 'notebook-1', documentId: 'goal-doc', path: '/Goal' }],
      taskMembers: [{ taskId: 'linked', addedAt: new Date().toISOString() }],
      documentCount: 1, taskMemberCount: 1, scopeCount: 2, documentSummary: '',
      totalTasks: 2, completedTasks: 0, remainingTasks: 2, progressPercent: 0, status: 'in-progress'
    };
    const wrapper = mountStats({ tasks, goalItems: [goal], rescheduleTask: vi.fn() });
    await flushPromises();
    await findButtonByText(wrapper, '.stats-tabs button', '任务').trigger('click');
    const panel = wrapper.find('.inbox-review-block');
    expect(panel.findAll('.stuck-title').map(item => item.text())).toEqual(['Loose task', 'Tagged unscheduled']);
    const filters = panel.findAll('.task-inbox-switch button');
    expect(filters.map(button => button.text())).toEqual(['未排期 2', '未分类 2']);
    await filters[1].trigger('click');
    expect(panel.findAll('.stuck-title').map(item => item.text())).toEqual(['Loose task', 'Planned unclassified']);
    await panel.find('.task-organize-action').trigger('click');
    expect(wrapper.emitted('edit-task')?.[0][0]).toEqual(tasks[0]);
    expect(wrapper.emitted('edit-task')?.[0][1]).toBeInstanceOf(MouseEvent);
    await wrapper.setProps({ tasks: tasks.map(task => task.id === 'loose' ? { ...task, tags: ['tag-1'] } : task) });
    expect(panel.findAll('.stuck-title').map(item => item.text())).toEqual(['Planned unclassified']);
  });

  it('task review offers a short completion undo window and retains it for a failed undo', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 8, 12));
    const previous = createTask({ status: 'delayed', statusAutomatic: true, dueDate: '2026-10-07' });
    let wrapper: ReturnType<typeof mountStats>;
    const completeTask = vi.fn(async () => {
      const completed = { ...previous, status: 'completed', completedAt: new Date().toISOString() };
      await wrapper.setProps({ tasks: [completed] });
      return completed;
    });
    const undo = vi.fn().mockRejectedValueOnce(new Error('offline')).mockImplementation(async (_completed, original) => {
      await wrapper.setProps({ tasks: [original] });
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    wrapper = mountStats({ tasks: [previous], completeTask, undoCompleteTask: undo });
    await flushPromises();
    await findButtonByText(wrapper, '.stats-tabs button', '任务').trigger('click');
    await wrapper.find('.stuck-review-block .task-complete-action').trigger('click');
    await flushPromises();
    expect(wrapper.find('.task-undo-notice').text()).toContain('已完成');
    expect(wrapper.find('.task-metric-action.backlog strong').text()).toBe('0');
    await wrapper.find('.task-undo-notice button').trigger('click');
    await flushPromises();
    expect(wrapper.find('.task-undo-notice [role="alert"]').text()).toContain('撤销失败');
    await wrapper.find('.task-undo-notice button').trigger('click');
    await flushPromises();
    expect(undo).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'completed' }), previous);
    expect(wrapper.find('.task-undo-notice').exists()).toBe(false);
    expect(wrapper.find('.task-metric-action.backlog strong').text()).toBe('1');
    await wrapper.find('.stuck-review-block .task-complete-action').trigger('click');
    await flushPromises();
    await vi.advanceTimersByTimeAsync(8000);
    expect(wrapper.find('.task-undo-notice').exists()).toBe(false);
  });

  it('task review replaces overdue distribution with upcoming tasks and shares their quick actions', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const now = new Date(2026, 9, 8, 12);
    vi.setSystemTime(now);
    const completeTask = vi.fn().mockResolvedValue(undefined);
    const rescheduleTask = vi.fn().mockResolvedValue(undefined);
    const early = createTask({ id: 'early', blockId: 'early', title: 'Early tomorrow', dueDate: '2026-10-09', dueTime: '08:00', updatedAt: addDays(now, -8).toISOString() });
    const day7 = createTask({ id: 'day7', title: 'Day seven', dueDate: '2026-10-15' });
    const tasks = [
      day7,
      early,
      createTask({ id: 'late', title: 'Late tomorrow', dueDate: '2026-10-09', dueTime: '18:00' }),
      ...[2, 3, 4, 5].map(days => createTask({ id: `day${days}`, title: `Day ${days}`, dueDate: formatDateKey(addDays(now, days)) })),
      createTask({ id: 'today', title: 'Today excluded', dueDate: '2026-10-08' }),
      createTask({ id: 'day8', title: 'Day eight excluded', dueDate: '2026-10-16' }),
      createTask({ id: 'done', title: 'Completed excluded', status: 'completed', dueDate: '2026-10-09' }),
      createTask({ id: 'archived', title: 'Archived excluded', archived: true, dueDate: '2026-10-09' }),
      createTask({ id: 'cancelled', title: 'Cancelled excluded', status: 'cancelled', dueDate: '2026-10-09' }),
      createTask({ id: 'virtual', title: 'Virtual excluded', isVirtual: true, dueDate: '2026-10-09' })
    ];
    const wrapper = mountStats({ tasks, completeTask, rescheduleTask });
    await flushPromises();
    await findButtonByText(wrapper, '.stats-tabs button', '任务').trigger('click');
    const panel = () => wrapper.find('.upcoming-review-block');
    expect(wrapper.find('.bucket-list').exists()).toBe(false);
    expect(panel().findAll('.stuck-title').map(item => item.text())).toEqual([
      'Early tomorrow', 'Late tomorrow', 'Day 2', 'Day 3', 'Day 4'
    ]);
    expect(panel().find('.list-block-head').text()).toContain('7 项任务即将截止');
    expect(panel().find('.stuck-reason').text()).toContain('2026-10-09 08:00');
    await panel().find('.overview-link-action').trigger('click');
    expect(panel().findAll('.upcoming-task-row')).toHaveLength(7);
    expect(panel().findAll('.stuck-title')[6].text()).toBe('Day seven');
    await findButtonByText(wrapper, '.range-switch button', '今日').trigger('click');
    expect(panel().findAll('.upcoming-task-row')).toHaveLength(7);

    await panel().find('.task-reschedule-action').trigger('click');
    expect(wrapper.findAll('.task-reschedule-menu')).toHaveLength(1);
    expect(wrapper.find('.stuck-review-block .task-reschedule-action').attributes('aria-expanded')).toBe('false');
    await wrapper.find('.stuck-review-block .task-reschedule-action').trigger('click');
    expect(wrapper.findAll('.task-reschedule-menu')).toHaveLength(1);
    expect(panel().find('.task-reschedule-menu').exists()).toBe(false);

    await panel().find('.task-complete-action').trigger('click');
    await flushPromises();
    expect(completeTask).toHaveBeenCalledWith(early);
    const updatedTasks = tasks.map(task => task.id === early.id ? { ...task, status: 'completed' } : task);
    await wrapper.setProps({ tasks: updatedTasks });
    expect(panel().findAll('.upcoming-task-row')).toHaveLength(6);
    expect(wrapper.find('.stuck-task-row').exists()).toBe(false);
    await panel().findAll('.task-reschedule-action')[5].trigger('click');
    await panel().find('input[type="date"]').setValue('2026-10-20');
    await panel().find('.task-reschedule-custom').trigger('submit');
    await flushPromises();
    expect(rescheduleTask).toHaveBeenCalledWith(day7, '2026-10-20');
    await wrapper.setProps({ tasks: updatedTasks.map(task => task.id === day7.id ? { ...task, dueDate: '2026-10-20' } : task) });
    expect(panel().findAll('.upcoming-task-row')).toHaveLength(5);
    expect(panel().find('.overview-link-action').exists()).toBe(false);
    expect(apiMocks.openBlockById).not.toHaveBeenCalled();
  });

  it('task review only lists overdue tasks or tasks idle for at least seven days', async () => {
    const now = new Date();
    const wrapper = mountStats({ tasks: [
      createTask({ id: 'six', title: 'Six days excluded', updatedAt: addDays(now, -6).toISOString() }),
      createTask({ id: 'seven', title: 'Seven days idle', updatedAt: addDays(now, -7).toISOString() }),
      createTask({ id: 'old', title: 'Oldest update', updatedAt: addDays(now, -30).toISOString() }),
      createTask({ id: 'due', blockId: 'due', title: 'Overdue with recent update', dueDate: formatDateKey(addDays(now, -2)) }),
      createTask({ id: 'fallback', title: 'Creation fallback', updatedAt: undefined, createdAt: addDays(now, -10).toISOString() }),
      createTask({ id: 'done', status: 'completed', updatedAt: addDays(now, -30).toISOString() }),
      createTask({ id: 'cancelled', status: 'cancelled', dueDate: formatDateKey(addDays(now, -2)) }),
      createTask({ id: 'archived', archived: true, updatedAt: addDays(now, -30).toISOString() })
    ] });
    await flushPromises();
    await findButtonByText(wrapper, '.stats-tabs button', '任务').trigger('click');
    const rows = wrapper.findAll('.stuck-task-row');
    expect(rows.map(row => row.find('.stuck-title').text())).toEqual([
      'Overdue with recent update', 'Oldest update', 'Creation fallback', 'Seven days idle'
    ]);
    expect(rows[0].find('.stuck-reasons').text()).toContain('逾期 2 天');
    expect(rows[0].find('.stuck-reasons').text()).not.toContain('未更新');
    expect(rows[3].find('.stuck-reasons').text()).toContain('7 天未更新');
    await rows[0].find('.stuck-task-open').trigger('click');
    expect(apiMocks.openBlockById).toHaveBeenCalledWith('due');
  });

  it('task review shows five overdue or idle tasks and can expand and collapse the full list', async () => {
    const now = new Date();
    const overdue = Array.from({ length: 7 }, (_, index) => createTask({
      id: `overdue-${index}`, title: `Overdue ${index}`,
      dueDate: formatDateKey(addDays(now, -(index + 1)))
    }));
    const idle = Array.from({ length: 6 }, (_, index) => createTask({
      id: `idle-${index}`, title: `Idle ${index}`,
      updatedAt: addDays(now, -(index + 7)).toISOString()
    }));
    const excluded = [
      createTask({ id: 'done', status: 'completed', dueDate: overdue[0].dueDate }),
      createTask({ id: 'cancelled', status: 'cancelled', dueDate: overdue[0].dueDate }),
      createTask({ id: 'archived', archived: true, dueDate: overdue[0].dueDate }),
      createTask({ id: 'virtual', isVirtual: true, dueDate: overdue[0].dueDate })
    ];
    const wrapper = mountStats({ tasks: [...idle, ...overdue, ...excluded] });
    await flushPromises();
    await findButtonByText(wrapper, '.stats-tabs button', '任务').trigger('click');
    const titles = () => wrapper.findAll('.stuck-task-row .stuck-title').map(item => item.text());
    const toggle = () => wrapper.find('.stuck-review-block .overview-link-action');
    expect(wrapper.find('.task-metric-action.overdue strong').text()).toBe('7');
    expect(titles()).toEqual(['Overdue 6', 'Overdue 5', 'Overdue 4', 'Overdue 3', 'Overdue 2']);
    expect(toggle().text()).toBe('查看全部 13 项');
    expect(toggle().attributes('aria-expanded')).toBe('false');
    await toggle().trigger('click');
    expect(toggle().text()).toBe('收起列表');
    expect(toggle().attributes('aria-expanded')).toBe('true');
    expect(titles()).toEqual([
      'Overdue 6', 'Overdue 5', 'Overdue 4', 'Overdue 3', 'Overdue 2', 'Overdue 1', 'Overdue 0',
      'Idle 5', 'Idle 4', 'Idle 3', 'Idle 2', 'Idle 1', 'Idle 0'
    ]);
    await wrapper.setProps({ tasks: [...idle, ...overdue.slice(1), { ...overdue[0], status: 'completed' }, ...excluded] });
    expect(wrapper.find('.task-metric-action.overdue strong').text()).toBe('6');
    expect(titles().filter(title => title.startsWith('Overdue'))).toHaveLength(6);
    expect(titles()).not.toContain('Overdue 0');
    await toggle().trigger('click');
    expect(titles()).toHaveLength(5);
    expect(toggle().text()).toBe('查看全部 12 项');
    await wrapper.setProps({ tasks: overdue.slice(0, 3) });
    expect(titles()).toHaveLength(3);
    expect(toggle().exists()).toBe(false);
  });

  it('task review removes HTML and SiYuan style markers from titles, search results, and action labels', async () => {
    const titles = [
      '任务 {: style="color: var(--b3-font-color4);"}9{: style="background-color: var(--b3-font-background11); color: var(--b3-font-color4);"}1{: style="background-color: var(--b3-font-background11);"}',
      '<span style="color: red">任务</span><strong>91</strong>',
      '&lt;span style=&quot;color: red&quot;&gt;任务91&lt;/span&gt;',
      '**任务**<u>91</u>{: style="background-color: var(--b3-font-background11);"}'
    ];
    const tasks = titles.map((title, index) => createTask({
      id: `formatted-${index}`, title,
      dueDate: formatDateKey(addDays(new Date(), -1))
    }));
    const wrapper = mountStats({ tasks, completeTask: vi.fn() });
    await flushPromises();
    await findButtonByText(wrapper, '.stats-tabs button', '任务').trigger('click');
    const rows = wrapper.findAll('.stuck-task-row');
    expect(rows.map(row => row.find('.stuck-title').text()).sort()).toEqual([
      '任务 9 1', '任务91', '任务91', '任务91'
    ]);
    for (const row of rows) {
      expect(row.find('.task-complete-action').attributes('aria-label')).not.toMatch(/style=|\{:/);
    }
    await wrapper.find('.task-priority-picker-toggle').trigger('click');
    await wrapper.find('.task-priority-picker input').setValue('任务');
    expect(wrapper.findAll('.task-priority-options button')).toHaveLength(4);
    expect(wrapper.find('.task-priority-picker').text()).not.toMatch(/style=|\{:/);
    expect(tasks.map(task => task.title)).toEqual(titles);
  });

  it('task review completes a task once and refreshes counts only after saving', async () => {
    let resolveSave!: () => void;
    const completeTask = vi.fn(() => new Promise<void>(resolve => { resolveSave = resolve; }));
    const task = createTask({ dueDate: formatDateKey(addDays(new Date(), -1)) });
    const wrapper = mountStats({ tasks: [task], completeTask });
    await flushPromises();
    await findButtonByText(wrapper, '.stats-tabs button', '任务').trigger('click');
    await wrapper.find('.task-complete-action').trigger('click');
    expect(completeTask).toHaveBeenCalledOnce();
    expect(completeTask).toHaveBeenCalledWith(task);
    expect(wrapper.find('.stuck-task-row').attributes('aria-busy')).toBe('true');
    expect(wrapper.find('.task-complete-action').attributes('disabled')).toBeDefined();
    expect(wrapper.find('.task-metric-action.backlog strong').text()).toBe('1');
    expect(apiMocks.openBlockById).not.toHaveBeenCalled();

    await wrapper.find('.task-complete-action').trigger('click');
    expect(completeTask).toHaveBeenCalledOnce();
    await wrapper.setProps({ tasks: [{ ...task, status: 'completed', completedAt: new Date().toISOString() }] });
    resolveSave();
    await flushPromises();
    expect(wrapper.find('.stuck-task-row').exists()).toBe(false);
    expect(wrapper.find('.task-metric-action.backlog strong').text()).toBe('0');
    expect(wrapper.find('.task-metric-action.overdue strong').text()).toBe('0');
    expect(wrapper.findAll('.task-metric-group')[0].findAll('strong')[1].text()).toBe('1');
  });

  it('task review reschedules with presets and custom dates and preserves a failed draft', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 8, 12));
    const task = createTask({ dueDate: '2026-10-07', dueTime: '18:00' });
    const rescheduleTask = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    const completeTask = vi.fn().mockRejectedValue(new Error('offline'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapper = mountStats({ tasks: [task], rescheduleTask, completeTask });
    await flushPromises();
    await findButtonByText(wrapper, '.stats-tabs button', '任务').trigger('click');
    await wrapper.find('.task-complete-action').trigger('click');
    await flushPromises();
    expect(wrapper.find('[role="alert"]').text()).toContain('保存失败');
    expect(wrapper.find('.task-metric-action.overdue strong').text()).toBe('1');
    expect(wrapper.find('.task-complete-action').attributes('disabled')).toBeUndefined();

    await wrapper.find('.task-reschedule-action').trigger('click');
    const presets = wrapper.findAll('.task-reschedule-presets button');
    expect(presets.map(button => button.text())).toEqual(['今日', '明天', '下周一']);
    await presets[1].trigger('click');
    await flushPromises();
    expect(rescheduleTask).toHaveBeenLastCalledWith(task, '2026-10-09');
    expect(wrapper.find('.task-reschedule-menu').exists()).toBe(true);
    expect((wrapper.find('input[type="date"]').element as HTMLInputElement).value).toBe('2026-10-09');
    expect(wrapper.find('[role="alert"]').text()).toContain('保存失败');
    await wrapper.find('.task-reschedule-custom').trigger('submit');
    await flushPromises();
    expect(rescheduleTask).toHaveBeenCalledTimes(2);
    expect(wrapper.find('.task-reschedule-menu').exists()).toBe(false);
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);

    await wrapper.find('.task-reschedule-action').trigger('click');
    await wrapper.findAll('.task-reschedule-presets button')[2].trigger('click');
    await flushPromises();
    expect(rescheduleTask).toHaveBeenLastCalledWith(task, '2026-10-12');
    await wrapper.find('.task-reschedule-action').trigger('click');
    await wrapper.findAll('.task-reschedule-presets button')[0].trigger('click');
    await flushPromises();
    expect(rescheduleTask).toHaveBeenLastCalledWith(task, '2026-10-08');
    await wrapper.find('.task-reschedule-action').trigger('click');
    await wrapper.find('input[type="date"]').setValue('2026-10-20');
    await wrapper.find('.task-reschedule-custom').trigger('submit');
    await wrapper.setProps({ tasks: [{ ...task, dueDate: '2026-10-20', updatedAt: new Date().toISOString() }] });
    await flushPromises();
    expect(rescheduleTask).toHaveBeenLastCalledWith(task, '2026-10-20');
    expect(wrapper.find('.stuck-task-row').exists()).toBe(false);
    expect(wrapper.find('.task-metric-action.overdue strong').text()).toBe('0');
    expect(apiMocks.openBlockById).not.toHaveBeenCalled();
  });

  it('task review prevents rescheduling before the task start date', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 8, 12));
    const task = createTask({ startDate: '2026-10-10', updatedAt: '2026-09-30T12:00:00' });
    const wrapper = mountStats({ tasks: [task], rescheduleTask: vi.fn() });
    await flushPromises();
    await findButtonByText(wrapper, '.stats-tabs button', '任务').trigger('click');
    await wrapper.find('.task-reschedule-action').trigger('click');
    const presets = wrapper.findAll('.task-reschedule-presets button');
    expect(presets[0].attributes('disabled')).toBeDefined();
    expect(presets[1].attributes('disabled')).toBeDefined();
    expect(presets[2].attributes('disabled')).toBeUndefined();
    expect(wrapper.find('input[type="date"]').attributes('min')).toBe('2026-10-10');
    await wrapper.find('input[type="date"]').setValue('2026-10-09');
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined();
    expect(wrapper.find('.task-reschedule-menu .task-scope-note').text()).toContain('2026-10-10');
  });

  it('opens the period summary tab and switches between week and month reviews', async () => {
    const now = new Date();
    const wrapper = mountStats({
      tasks: [
        createTask({ id: 'summary-done', title: 'Summary done', status: 'completed', completedAt: now.toISOString() }),
        createTask({ id: 'summary-open', title: 'Summary open', dueDate: formatDateKey(addDays(now, -1)) })
      ]
    });
    await flushPromises();

    await wrapper.findAll('.stats-tabs [role="tab"]')[5].trigger('click');

    expect(wrapper.find('.stats-summary-panel').exists()).toBe(true);
    expect(wrapper.findAll('.summary-mode-chip')).toHaveLength(2);
    expect(wrapper.find('.summary-comparison').exists()).toBe(true);
    expect(wrapper.findAll('.summary-task-row')).not.toHaveLength(0);

    await wrapper.findAll('.summary-mode-chip')[1].trigger('click');
    expect(wrapper.find('.summary-mode-chip.active').text()).toContain('月');
    expect(wrapper.find('.summary-period-actions .panel-chip').text()).toContain('月');
  });

  it('counts scheduled habit occurrences without requiring calendar rows for the denominator', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-07T12:00:00'));
    const today = formatDateKey(new Date());
    apiMocks.getHabits.mockResolvedValue([createHabit({
      createdAt: '2026-10-01T00:00:00',
      calendar: [{ date: today, completed: true, completedCount: 1, targetCount: 1 }]
    })]);
    const wrapper = mountStats();
    await flushPromises();
    await wrapper.findAll('.stats-tabs [role="tab"]')[5].trigger('click');

    const habitMetric = wrapper.findAll('.summary-stat-grid .mini-stat-card')[2];
    expect(habitMetric.text()).toContain('1/3');
  });

  it('saves the current summary directly under Pinch', async () => {
    const wrapper = mountStats({
      tasks: [createTask({ notebookId: 'notebook-1', status: 'completed', completedAt: new Date().toISOString() })]
    });
    await flushPromises();
    await wrapper.findAll('.stats-tabs [role="tab"]')[5].trigger('click');
    await flushPromises();
    await wrapper.find('.summary-save-button').trigger('click');
    await flushPromises();

    expect(apiMocks.createDocWithMd).toHaveBeenCalledWith(
      'notebook-1',
      expect.stringContaining('/Pinch/'),
      expect.stringContaining('#')
    );
  });

  it('shows only annotated period records and includes their notes in the exported summary', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-07T12:00:00'));
    apiMocks.getMoodData.mockResolvedValue({
      '2026-10-06': {
        emoji: '',
        entries: [{ id: 'manual-1', text: '整理项目计划', createdAt: '2026-10-06T18:00:00', updatedAt: '2026-10-06T18:00:00' }]
      }
    });
    const notedHabit = createHabit();
    notedHabit.calendar[0].note = '习惯备注';
    apiMocks.getHabits.mockResolvedValue([notedHabit]);
    navigationMocks.loadData.mockResolvedValue({
      version: 2,
      month: '2026-10',
      entries: {
        'focus:focus-1': {
          eventKey: 'focus:focus-1',
          content: '专注备注',
          context: { type: 'focus', sourceId: 'focus-1', occurredAt: '2026-10-06T10:25:00.000Z', title: '整理项目' },
          createdAt: '2026-10-06T10:25:00.000Z',
          updatedAt: '2026-10-06T10:25:00.000Z'
        }
      },
      trash: {},
      updatedAt: '2026-10-06T18:00:00.000Z'
    });
    apiMocks.getFocusTimerData.mockResolvedValue({
      dailyRecords: [{ date: '2026-10-06', minutes: 25, sessions: 1, timestamp: Date.parse('2026-10-06T10:25:00') }],
      sessionRecords: [{
        id: 'focus-1', date: '2026-10-06', minutes: 25, timestamp: Date.parse('2026-10-06T10:25:00'),
        targetType: 'task', targetId: 'record-task', targetName: '整理项目'
      }]
    });
    const wrapper = mountStats({
      tasks: [createTask({ id: 'record-task', status: 'completed', completedAt: '2026-10-06T10:00:00', description: '任务备注' })]
    });
    await flushPromises();
    await wrapper.findAll('.stats-tabs [role="tab"]')[5].trigger('click');
    await flushPromises();

    expect(wrapper.find('.summary-records').exists()).toBe(true);
    expect(wrapper.find('.summary-focus-records').text()).toContain('整理项目');
    expect(wrapper.find('.summary-habit-records').text()).toContain('Drink water');
    expect(wrapper.find('.summary-task-records').text()).toContain('Test task');
    expect(wrapper.find('.summary-records').text()).toContain('整理项目计划');

    await wrapper.find('.summary-save-button').trigger('click');
    await flushPromises();
    const markdown = apiMocks.createDocWithMd.mock.calls[0][2];
    expect(markdown).toContain('整理项目计划');
    expect(markdown).toContain('## 专注备注');
    expect(markdown).toContain('## 习惯备注');
    expect(markdown).toContain('## 任务备注');
    expect(markdown).toContain('## 记录');
    expect(markdown).toMatch(/## 专注备注[\s\S]*整理项目：专注备注/);
    expect(markdown).toMatch(/## 习惯备注[\s\S]*Drink water：习惯备注/);
    expect(markdown).toMatch(/## 任务备注[\s\S]*Test task：任务备注/);
    expect(markdown).toMatch(/## 记录[\s\S]*整理项目计划/);
    expect(markdown).not.toContain('记录：整理项目计划');
  });

  it('confirms before deleting the current summary document and restores save state', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-07T12:00:00'));
    apiMocks.getIDsByHPath.mockImplementation(async (notebookId, path) =>
      notebookId === 'notebook-1' && path === '/Pinch/周-2026-10-05' ? ['summary-to-delete'] : []
    );
    const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const wrapper = mountStats({ tasks: [createTask({ notebookId: 'notebook-1' })] });
    await flushPromises();
    await wrapper.findAll('.stats-tabs [role="tab"]')[5].trigger('click');
    await flushPromises();

    await wrapper.find('.summary-delete-document').trigger('click');
    expect(confirmMock).toHaveBeenCalledWith(expect.stringContaining('/Notebook/Pinch/周-2026-10-05'));
    expect(apiMocks.removeDoc).not.toHaveBeenCalled();
    expect(wrapper.find('.summary-document-protyle').exists()).toBe(true);

    confirmMock.mockReturnValue(true);
    await wrapper.find('.summary-delete-document').trigger('click');
    await flushPromises();

    expect(apiMocks.getPathByID).toHaveBeenCalledWith('summary-to-delete');
    expect(apiMocks.removeDoc).toHaveBeenCalledWith('notebook-1', '/data/2026-10-05.sy');
    expect(wrapper.find('.summary-document-protyle').exists()).toBe(false);
    expect(wrapper.find('.summary-delete-document').exists()).toBe(false);
    expect(wrapper.find('.summary-save-button').attributes('disabled')).toBeUndefined();
    expect(siyuanMocks.showMessage).toHaveBeenCalledWith('摘要文档已删除', 3000, 'info');
  });

  it('renders inline task title formatting and exports readable titles without markup', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-07T12:00:00'));
    const wrapper = mountStats({ tasks: [
      createTask({
        id: 'rich-completed', notebookId: 'notebook-1', status: 'completed', completedAt: '2026-10-06T12:00:00',
        title: '完成项目 🚀<span data-type="strong">整理计划与安排</span>{: style="color: var(--b3-font-color1);"}'
      }),
      createTask({
        id: 'rich-unfinished', notebookId: 'notebook-1',
        title: '待办事项 🚀&lt;span data-type="strong"&gt;核对清单&lt;/span&gt;{: style="color: var(--b3-font-color2);"}'
      })
    ] });
    await flushPromises();
    await wrapper.findAll('.stats-tabs [role="tab"]')[5].trigger('click');
    await flushPromises();

    const titles = wrapper.findAll('.summary-task-title');
    expect(titles.map(title => title.text())).toEqual(['完成项目 🚀整理计划与安排', '待办事项 🚀核对清单']);
    expect(titles[0].find('[data-type~="strong"]').attributes('style')).toContain('color: var(--b3-font-color1)');
    expect(titles[1].find('[data-type~="strong"]').text()).toBe('核对清单');

    await wrapper.find('.summary-save-button').trigger('click');
    await flushPromises();
    const markdown = apiMocks.createDocWithMd.mock.calls[0][2];
    expect(markdown).toContain('- 完成项目 🚀整理计划与安排');
    expect(markdown).toContain('- 待办事项 🚀核对清单');
    expect(markdown).not.toMatch(/<\/?span|&lt;|\{:\s*style=/);
  });

  it.each([
    '/Pinch/周-2026-10-05',
    '/Pinch/week-2026-10-05',
    '/Pinch/summaries/周-2026-10-05',
    '/Pinch/summaries/week-2026-10-05'
  ])('shows a saved summary from another notebook and prevents another save: %s', async (path) => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-07T12:00:00'));
    apiMocks.lsNotebooks.mockResolvedValue({ notebooks: [
      { id: 'notebook-a', name: '笔记本 A', closed: false },
      { id: 'notebook-b', name: '笔记本 B', closed: false }
    ] });
    apiMocks.getIDsByHPath.mockImplementation(async (notebookId, documentPath) =>
      notebookId === 'notebook-a' && documentPath === path ? ['saved-in-a'] : []
    );
    const wrapper = mountStats({ tasks: [createTask({ notebookId: 'notebook-b' })] });
    await flushPromises();
    await wrapper.findAll('.stats-tabs [role="tab"]')[5].trigger('click');
    await flushPromises();

    expect((wrapper.find('.summary-notebook-select').element as HTMLSelectElement).value).toBe('notebook-b');
    expect(wrapper.find('.summary-document-path').text()).toBe(`/笔记本 A${path}`);
    expect(siyuanMocks.Protyle).toHaveBeenCalledWith(
      expect.anything(), expect.anything(), expect.objectContaining({ blockId: 'saved-in-a', rootId: 'saved-in-a' })
    );
    expect(wrapper.find('.summary-save-button').attributes('disabled')).toBeDefined();
    expect(wrapper.find('.summary-save-button').text()).toBe('本周期已保存');

    const lookupCount = apiMocks.getIDsByHPath.mock.calls.length;
    await wrapper.find('.summary-notebook-select').setValue('notebook-a');
    await wrapper.find('.summary-notebook-select').setValue('notebook-b');
    await flushPromises();
    expect(wrapper.find('.summary-document-path').text()).toBe(`/笔记本 A${path}`);
    expect(apiMocks.getIDsByHPath).toHaveBeenCalledTimes(lookupCount);
    expect(siyuanMocks.Protyle).toHaveBeenCalledTimes(1);
    expect(siyuanMocks.destroyProtyle).not.toHaveBeenCalled();

    await wrapper.find('.summary-save-button').trigger('click');
    expect(apiMocks.createDocWithMd).not.toHaveBeenCalled();
    await wrapper.find('.summary-open-document').trigger('click');
    expect(apiMocks.openBlockById).toHaveBeenCalledWith('saved-in-a', { focus: true });
  });

  it('rechecks all notebooks before saving when a summary was created after loading', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-07T12:00:00'));
    apiMocks.lsNotebooks.mockResolvedValue({ notebooks: [
      { id: 'notebook-a', name: '笔记本 A', closed: false },
      { id: 'notebook-b', name: '笔记本 B', closed: false }
    ] });
    const wrapper = mountStats({ tasks: [createTask({ notebookId: 'notebook-b' })] });
    await flushPromises();
    await wrapper.findAll('.stats-tabs [role="tab"]')[5].trigger('click');
    await flushPromises();
    expect(wrapper.find('.summary-save-button').attributes('disabled')).toBeUndefined();

    apiMocks.getIDsByHPath.mockImplementation(async (notebookId, path) =>
      notebookId === 'notebook-a' && path === '/Pinch/周-2026-10-05' ? ['new-summary-in-a'] : []
    );
    await wrapper.find('.summary-save-button').trigger('click');
    await flushPromises();

    expect(apiMocks.createDocWithMd).not.toHaveBeenCalled();
    expect(wrapper.find('.summary-document-path').text()).toBe('/笔记本 A/Pinch/周-2026-10-05');
    expect(wrapper.find('.summary-save-button').attributes('disabled')).toBeDefined();
    expect(siyuanMocks.showMessage).toHaveBeenCalledWith('这个摘要文档已经存在', 3000, 'info');
  });

  it('allows a different period to be saved and restores the existing summary on return', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-07T12:00:00'));
    apiMocks.lsNotebooks.mockResolvedValue({ notebooks: [
      { id: 'notebook-a', name: '笔记本 A', closed: false },
      { id: 'notebook-b', name: '笔记本 B', closed: false }
    ] });
    apiMocks.getIDsByHPath.mockImplementation(async (notebookId, path) =>
      notebookId === 'notebook-a' && path === '/Pinch/周-2026-10-05' ? ['current-summary-in-a'] : []
    );
    const wrapper = mountStats({ tasks: [createTask({ notebookId: 'notebook-b' })] });
    await flushPromises();
    await wrapper.findAll('.stats-tabs [role="tab"]')[5].trigger('click');
    await flushPromises();
    await wrapper.findAll('.summary-period-nav')[0].trigger('click');
    await flushPromises();

    expect(wrapper.find('.summary-document-protyle').exists()).toBe(false);
    expect(wrapper.find('.summary-save-button').attributes('disabled')).toBeUndefined();
    await wrapper.find('.summary-save-button').trigger('click');
    await flushPromises();
    expect(apiMocks.createDocWithMd).toHaveBeenCalledWith('notebook-b', '/Pinch/周-2026-09-28', expect.any(String));
    expect(wrapper.find('.summary-document-path').text()).toBe('/笔记本 B/Pinch/周-2026-09-28');
    expect(wrapper.find('.summary-save-button').attributes('disabled')).toBeDefined();

    await wrapper.findAll('.summary-period-nav')[1].trigger('click');
    await flushPromises();
    expect(wrapper.find('.summary-document-path').text()).toBe('/笔记本 A/Pinch/周-2026-10-05');
    expect(wrapper.find('.summary-save-button').attributes('disabled')).toBeDefined();
    expect(siyuanMocks.destroyProtyle).toHaveBeenCalledTimes(2);
  });

  it('ignores a stale document lookup after the period changes', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-07T12:00:00'));
    let resolveLookup!: (ids: string[]) => void;
    const pendingLookup = new Promise<string[]>(resolve => { resolveLookup = resolve; });
    apiMocks.getIDsByHPath.mockImplementation(async (_notebookId, path) =>
      path === '/Pinch/周-2026-10-05' ? pendingLookup : []
    );
    const wrapper = mountStats();
    await flushPromises();
    await wrapper.findAll('.stats-tabs [role="tab"]')[5].trigger('click');
    await flushPromises();
    expect(wrapper.find('.summary-save-button').attributes('disabled')).toBeDefined();

    await wrapper.findAll('.summary-period-nav')[0].trigger('click');
    await flushPromises();
    resolveLookup(['stale-current-summary']);
    await flushPromises();

    expect(wrapper.find('.summary-document-protyle').exists()).toBe(false);
    expect(wrapper.find('.summary-save-button').attributes('disabled')).toBeUndefined();
    expect(siyuanMocks.Protyle).not.toHaveBeenCalled();
  });

  it('keeps the document editor mounted while activity statistics finish loading', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-07T12:00:00'));
    let resolveHabits!: (habits: Habit[]) => void;
    apiMocks.getHabits.mockReturnValue(new Promise<Habit[]>(resolve => { resolveHabits = resolve; }));
    apiMocks.getIDsByHPath.mockImplementation(async (_notebookId, path) =>
      path === '/Pinch/周-2026-10-05' ? ['saved-summary'] : []
    );
    const wrapper = mountStats();
    await flushPromises();
    await wrapper.findAll('.stats-tabs [role="tab"]')[5].trigger('click');
    await flushPromises();
    expect(wrapper.find('.stats-summary-panel .panel-empty').exists()).toBe(true);
    expect(wrapper.find('.summary-document-protyle').exists()).toBe(true);
    expect(siyuanMocks.Protyle).toHaveBeenCalledTimes(1);

    resolveHabits([]);
    await flushPromises();
    expect(wrapper.find('.summary-document-protyle').exists()).toBe(true);
    expect(siyuanMocks.Protyle).toHaveBeenCalledTimes(1);
    expect(siyuanMocks.destroyProtyle).not.toHaveBeenCalled();
  });

  it('does not create a summary when another notebook cannot be checked', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    apiMocks.lsNotebooks.mockResolvedValue({ notebooks: [
      { id: 'notebook-a', name: '笔记本 A', closed: false },
      { id: 'notebook-b', name: '笔记本 B', closed: false }
    ] });
    const wrapper = mountStats({ tasks: [createTask({ notebookId: 'notebook-b' })] });
    await flushPromises();
    await wrapper.findAll('.stats-tabs [role="tab"]')[5].trigger('click');
    await flushPromises();
    apiMocks.getIDsByHPath.mockImplementation(async (notebookId) => {
      if (notebookId === 'notebook-a') throw new Error('Lookup failed');
      return [];
    });
    await wrapper.find('.summary-save-button').trigger('click');
    await flushPromises();

    expect(apiMocks.createDocWithMd).not.toHaveBeenCalled();
    expect(siyuanMocks.showMessage).toHaveBeenCalledWith('摘要文档保存失败', 3000, 'error');
  });

  it.each([
    { currentTasks: 2, previousTasks: 1, currentFocus: 30, previousFocus: 90, expected: '完成任务 +1 项 · 专注 −1h' },
    { currentTasks: 1, previousTasks: 2, currentFocus: 90, previousFocus: 30, expected: '完成任务 −1 项 · 专注 +1h' },
    { currentTasks: 0, previousTasks: 0, currentFocus: 0, previousFocus: 0, expected: '完成任务和专注时长持平' }
  ])('compares completed tasks and focus time independently: $expected', async ({ currentTasks, previousTasks, currentFocus, previousFocus, expected }) => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-07T12:00:00'));
    apiMocks.getFocusTimerData.mockResolvedValue({
      dailyRecords: [
        { date: '2026-10-06', minutes: currentFocus, sessions: 1 },
        { date: '2026-09-30', minutes: previousFocus, sessions: 1 }
      ],
      sessionRecords: []
    });
    const wrapper = mountStats({ tasks: [
      ...Array.from({ length: currentTasks }, (_, index) => createTask({
        id: `current-${index}`, status: 'completed', completedAt: '2026-10-06T12:00:00'
      })),
      ...Array.from({ length: previousTasks }, (_, index) => createTask({
        id: `previous-${index}`, status: 'completed', completedAt: '2026-09-30T12:00:00'
      }))
    ] });
    await flushPromises();
    await wrapper.findAll('.stats-tabs [role="tab"]')[5].trigger('click');

    expect(wrapper.find('.summary-comparison').text()).toContain(expected);
  });

  it('updates period metrics when the selected range changes', async () => {
    const wrapper = mountStats();
    await flushPromises();

    const todayButton = findButtonByText(wrapper, '.range-switch button', '今日');
    await todayButton.trigger('click');

    expect(todayButton.attributes('aria-selected')).toBe('true');
    expect(findOverviewMetric(wrapper, '今日完成').exists()).toBe(true);
  });

  it('emits an overdue drilldown from the attention list', async () => {
    const yesterday = formatDateKey(addDays(new Date(), -1));
    const wrapper = mountStats({ tasks: [createTask({ dueDate: yesterday })] });
    await flushPromises();

    const overdueAction = wrapper.findAll('.attention-item').find(item => item.text().includes('当前逾期'));
    expect(overdueAction).toBeDefined();
    await overdueAction!.trigger('click');

    expect(wrapper.emitted('drilldown')).toEqual([[
      expect.objectContaining({ target: 'table', due: 'overdue' })
    ]]);
  });

  it('shows stable empty states when there is no activity data', async () => {
    const wrapper = mountStats();
    await flushPromises();

    expect(wrapper.find('.attention-empty').text()).toContain('当前节奏稳定');

    await findButtonByText(wrapper, '.stats-tabs button', '任务').trigger('click');
    expect(wrapper.find('.panel-empty').text()).toContain('还没有可复盘的任务数据');

    await findButtonByText(wrapper, '.stats-tabs button', '习惯与专注').trigger('click');
    const emptyMessages = wrapper.findAll('.panel-empty').map(item => item.text());
    expect(emptyMessages).toContain('还没有创建习惯。');
    expect(emptyMessages).toContain('这个周期里还没有专注记录。');
  });

  it('applies a habit broadcast immediately and ignores an older pending load', async () => {
    let resolveInitialLoad!: (habits: Habit[]) => void;
    apiMocks.getHabits.mockReturnValueOnce(new Promise<Habit[]>((resolve) => {
      resolveInitialLoad = resolve;
    }));
    const wrapper = mountStats();

    eventBus.emit(Events.HABITS_UPDATED, {
      source: 'habit-tracker',
      habits: [createHabit()]
    });
    await wrapper.vm.$nextTick();

    expect(findOverviewMetric(wrapper, '习惯打卡').find('strong').text()).toBe('100%');

    resolveInitialLoad([]);
    await flushPromises();

    expect(findOverviewMetric(wrapper, '习惯打卡').find('strong').text()).toBe('100%');
  });

  it('customizes overview cards and persists the selection', async () => {
    const wrapper = mountStats();
    await flushPromises();

    await findButtonByText(wrapper, '.overview-customize-btn', '自定义卡片').trigger('click');
    const habitOption = wrapper.findAll('.overview-card-option').find(option => option.text().includes('习惯执行'));
    expect(habitOption).toBeDefined();
    expect(habitOption!.find('.task-checkbox').attributes('width')).toBe('18');
    expect(habitOption!.find('.task-checkbox').classes()).not.toContain('checked');
    await habitOption!.find('input').setValue(true);
    expect(habitOption!.find('.task-checkbox').classes()).toContain('checked');

    expect(wrapper.find('.habit-rhythm-card').exists()).toBe(true);
    expect(localStorageData.get('pinch.personal-stats.overview-cards')).toBeUndefined();
    expect(wrapper.find('.overview-unsaved').text()).toBe('未保存');
    await wrapper.find('.overview-customizer-save').trigger('click');
    expect(localStorageData.get('pinch.personal-stats.overview-cards')).toContain('habit-rhythm');
    expect(wrapper.find('.overview-customizer').exists()).toBe(false);
    expect(wrapper.find('.overview-save-status').exists()).toBe(false);
    expect(siyuanMocks.showMessage).toHaveBeenCalledWith('卡片配置已保存', 2200, 'info');

    wrapper.unmount();
    const restoredWrapper = mountStats();
    await flushPromises();
    expect(restoredWrapper.find('.habit-rhythm-card').exists()).toBe(true);

    await findButtonByText(restoredWrapper, '.overview-customize-btn', '自定义卡片').trigger('click');
    await findButtonByText(restoredWrapper, '.overview-customizer-reset', '恢复默认').trigger('click');
    expect(restoredWrapper.find('.habit-rhythm-card').exists()).toBe(false);
    expect(restoredWrapper.findAll('.overview-kpi')).toHaveLength(4);
    expect(localStorageData.get('pinch.personal-stats.overview-cards')).toContain('habit-rhythm');
    await restoredWrapper.find('.overview-customizer-save').trigger('click');
    expect(localStorageData.get('pinch.personal-stats.overview-cards')).not.toContain('habit-rhythm');
  });

  it('groups the options and cancels preview changes without persisting them', async () => {
    const wrapper = mountStats();
    await flushPromises();
    await wrapper.find('.overview-customize-btn').trigger('click');
    expect(wrapper.find('.stats-tabs-actions .overview-customize-btn').text()).toBe('取消编辑');
    expect(wrapper.findAll('.overview-card-group legend').map(item => item.text())).toEqual([
      '趋势与提醒', '行动与回顾', '投入与成长'
    ]);
    expect(wrapper.findAll('.overview-card-option')).toHaveLength(13);
    expect(wrapper.find('.overview-kpi .overview-card-hide').exists()).toBe(false);
    expect(wrapper.find('input[value="kpi-task"]').exists()).toBe(false);
    await wrapper.find('[data-card-id="attention"] .overview-card-hide').trigger('click');
    await wrapper.find('input[value="habit-rhythm"]').setValue(true);
    expect(wrapper.find('[data-card-id="attention"]').exists()).toBe(false);
    expect(wrapper.findAll('.overview-kpi')).toHaveLength(4);
    expect(wrapper.find('.habit-rhythm-card').exists()).toBe(true);
    expect(wrapper.find('.overview-customizer-status').text()).toContain('已显示 2 张可选卡片');
    await wrapper.find('.stats-tabs-actions .overview-customize-btn').trigger('click');
    expect(wrapper.find('.overview-customizer').exists()).toBe(false);
    expect(wrapper.find('.stats-tabs-actions .overview-customize-btn').text()).toBe('自定义卡片');
    expect(wrapper.find('.stats-tabs-actions .overview-customize-btn').attributes('aria-expanded')).toBe('false');
    expect(wrapper.find('[data-card-id="attention"]').exists()).toBe(true);
    expect(wrapper.find('.habit-rhythm-card').exists()).toBe(false);
    expect(localStorageData.get('pinch.personal-stats.overview-cards')).toBeUndefined();
    await wrapper.find('.overview-customize-btn').trigger('click');
    expect(wrapper.find('input[value="attention"]').element).toHaveProperty('checked', true);
    expect(wrapper.find('input[value="habit-rhythm"]').element).toHaveProperty('checked', false);
    await wrapper.find('[data-card-id="attention"]').trigger('keydown', { key: 'Escape' });
    expect(wrapper.find('.overview-customizer').exists()).toBe(false);
  });

  it('moves optional cards across groups and restores their saved DOM order', async () => {
    localStorageData.set('pinch.personal-stats.overview-cards', JSON.stringify([
      'kpi-task', 'kpi-focus', 'activity', 'attention', 'today-actions', 'recent-activity', 'habit-rhythm', 'focus-summary'
    ]));
    const wrapper = mountStats();
    await flushPromises();
    await wrapper.find('.overview-customize-btn').trigger('click');
    for (const id of ['attention', 'recent-activity', 'focus-summary']) {
      await wrapper.find(`[data-card-id="${id}"]`).trigger('keydown', { key: 'ArrowUp' });
    }
    await wrapper.find('[data-card-id="recent-activity"]').trigger('keydown', { key: 'ArrowUp' });
    await wrapper.find('[data-card-id="focus-summary"]').trigger('keydown', { key: 'ArrowUp' });
    const order = (view: ReturnType<typeof mountStats>) => view.findAll('[data-card-id]').map(card => card.attributes('data-card-id'));
    const expectedOrder = ['kpi-task', 'kpi-focus', 'kpi-habit', 'kpi-backlog', 'attention', 'recent-activity', 'activity', 'focus-summary', 'today-actions', 'habit-rhythm'];
    expect(order(wrapper)).toEqual(expectedOrder);
    expect(wrapper.find('.overview-kpi-grid .overview-card-editor-controls').exists()).toBe(false);
    await wrapper.find('.overview-customizer-save').trigger('click');
    const restored = mountStats();
    await flushPromises();
    expect(order(restored)).toEqual(expectedOrder);
    expect(restored.find('.overview-card-editor-controls').exists()).toBe(false);
  });

  it('keeps core metrics fixed when editing, ignores old saved orders and rejects optional drops', async () => {
    const legacyOrder = ['kpi-backlog', 'attention', 'kpi-habit', 'activity', 'kpi-focus', 'kpi-task'];
    localStorageData.set('pinch.personal-stats.overview-cards', JSON.stringify(legacyOrder));
    const wrapper = mountStats();
    await flushPromises();
    const coreOrder = (view: ReturnType<typeof mountStats>) => view.findAll('.overview-kpi').map(card => card.attributes('data-card-id'));
    const optionalOrder = (view: ReturnType<typeof mountStats>) => view.findAll('.overview-cards-grid > [data-card-id]').map(card => card.attributes('data-card-id'));
    const fixedOrder = ['kpi-task', 'kpi-focus', 'kpi-habit', 'kpi-backlog'];
    expect(coreOrder(wrapper)).toEqual(fixedOrder);
    expect(optionalOrder(wrapper)).toEqual(['attention', 'activity']);
    expect(JSON.parse(localStorageData.get('pinch.personal-stats.overview-cards')!)).toEqual(legacyOrder);
    await wrapper.find('.overview-customize-btn').trigger('click');
    expect(wrapper.find('.overview-kpi-grid .overview-card-editor-controls').exists()).toBe(false);
    expect(wrapper.find('.overview-kpi-grid .is-editing-card').exists()).toBe(false);
    expect(wrapper.find('.overview-kpi-grid [draggable="true"]').exists()).toBe(false);
    const dataTransfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
    await wrapper.find('[data-card-id="attention"]').trigger('dragstart', { dataTransfer });
    await wrapper.find('[data-card-id="kpi-habit"]').trigger('dragover', { dataTransfer });
    expect(dataTransfer.dropEffect).toBe('');
    await wrapper.find('[data-card-id="kpi-habit"]').trigger('drop', { dataTransfer });
    expect(coreOrder(wrapper)).toEqual(fixedOrder);
    expect(optionalOrder(wrapper)).toEqual(['attention', 'activity']);
    await wrapper.find('[data-card-id="attention"]').trigger('dragend');
    await wrapper.find('[data-card-id="activity"]').trigger('keydown', { key: 'ArrowUp' });
    expect(optionalOrder(wrapper)).toEqual(['activity', 'attention']);
    expect(coreOrder(wrapper)).toEqual(fixedOrder);
    await wrapper.find('.overview-customizer-save').trigger('click');
    expect(JSON.parse(localStorageData.get('pinch.personal-stats.overview-cards')!)).toEqual([...fixedOrder, 'activity', 'attention']);
    const restored = mountStats();
    await flushPromises();
    expect(coreOrder(restored)).toEqual(fixedOrder);
    expect(optionalOrder(restored)).toEqual(['activity', 'attention']);
  });

  it('drags cards from different categories into one grid and persists the mixed order', async () => {
    localStorageData.set('pinch.personal-stats.overview-cards', JSON.stringify(['activity', 'attention', 'recent-activity', 'today-actions']));
    const wrapper = mountStats();
    await flushPromises();
    const order = (view: ReturnType<typeof mountStats>) => view.findAll('.overview-cards-grid > [data-card-id]').map(card => card.attributes('data-card-id'));
    expect(order(wrapper)).toEqual(['activity', 'attention', 'recent-activity', 'today-actions']);
    await wrapper.find('.overview-customize-btn').trigger('click');
    const dataTransfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
    await wrapper.find('[data-card-id="recent-activity"]').trigger('dragstart', { dataTransfer });
    await wrapper.find('[data-card-id="attention"]').trigger('dragover', { dataTransfer });
    expect(dataTransfer.dropEffect).toBe('move');
    expect(order(wrapper)).toEqual(['activity', 'recent-activity', 'attention', 'today-actions']);
    expect(wrapper.find('[data-card-id="recent-activity"]').classes()).toContain('is-drag-preview');
    expect(localStorageData.get('pinch.personal-stats.overview-cards')).toBe(JSON.stringify(['activity', 'attention', 'recent-activity', 'today-actions']));
    await wrapper.find('[data-card-id="attention"]').trigger('drop', { dataTransfer });
    expect(order(wrapper)).toEqual(['activity', 'recent-activity', 'attention', 'today-actions']);
    await wrapper.find('[data-card-id="today-actions"]').trigger('dragstart', { dataTransfer });
    await wrapper.find('[data-card-id="activity"]').trigger('drop', { dataTransfer });
    const mixed = ['today-actions', 'activity', 'recent-activity', 'attention'];
    expect(order(wrapper)).toEqual(mixed);
    expect(wrapper.find('.overview-card-move-up').exists()).toBe(false);
    expect(wrapper.find('.overview-card-move-down').exists()).toBe(false);
    expect(wrapper.findAll('.overview-card-hide')).toHaveLength(mixed.length);
    await wrapper.find('.overview-customizer-save').trigger('click');
    const restored = mountStats();
    await flushPromises();
    expect(order(restored)).toEqual(mixed);
    await restored.find('.overview-customize-btn').trigger('click');
    await restored.find('[data-card-id="today-actions"]').trigger('keydown', { key: 'ArrowDown' });
    expect(order(restored)).toEqual(['activity', 'today-actions', 'recent-activity', 'attention']);
    await restored.find('.overview-customizer-cancel').trigger('click');
    expect(order(restored)).toEqual(mixed);
  });

  it('cancels drag previews without changing the draft and cleans up the whole-card drag image', async () => {
    const saved = ['activity', 'attention', 'today-actions', 'recent-activity'];
    localStorageData.set('pinch.personal-stats.overview-cards', JSON.stringify(saved));
    const wrapper = mountStats();
    await flushPromises();
    const order = () => wrapper.findAll('.overview-cards-grid > [data-card-id]').map(card => card.attributes('data-card-id'));
    expect(wrapper.find('[data-card-id="recent-activity"]').attributes('draggable')).toBe('false');
    await wrapper.find('.overview-customize-btn').trigger('click');
    expect(wrapper.find('[data-card-id="recent-activity"]').attributes('draggable')).toBe('true');
    expect(wrapper.findAll('.overview-card-editor-controls button')).toHaveLength(saved.length);
    wrapper.findAll('.overview-cards-grid > [data-card-id]').forEach(card => {
      const element = card.element as HTMLElement;
      Object.defineProperties(element, {
        offsetLeft: { configurable: true, get: () => Array.from(element.parentElement!.children).indexOf(element) * 110 },
        offsetWidth: { configurable: true, value: 100 },
        offsetHeight: { configurable: true, value: 100 }
      });
    });
    const dataTransfer = { setData: vi.fn(), setDragImage: vi.fn(), effectAllowed: '', dropEffect: '' };
    await wrapper.find('[data-card-id="recent-activity"] h3').trigger('dragstart', { dataTransfer, clientX: 50, clientY: 50 });
    expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'recent-activity');
    expect(dataTransfer.setDragImage).toHaveBeenCalledTimes(1);
    const ghost = dataTransfer.setDragImage.mock.calls[0][0] as HTMLElement;
    expect(ghost.dataset.cardId).toBe('recent-activity');
    expect(ghost.isConnected).toBe(true);
    await wrapper.find('[data-card-id="attention"]').trigger('dragover', { dataTransfer, clientX: 150, clientY: 50 });
    expect(order()).toEqual(['activity', 'recent-activity', 'attention', 'today-actions']);
    expect(wrapper.find('.overview-unsaved').exists()).toBe(false);
    // Layout movement must not keep reshuffling the order under a slightly moving pointer.
    await wrapper.find('[data-card-id="today-actions"]').trigger('dragover', { dataTransfer, clientX: 158, clientY: 50 });
    expect(order()).toEqual(['activity', 'recent-activity', 'attention', 'today-actions']);
    await wrapper.find('[data-card-id="recent-activity"]').trigger('dragend', { dataTransfer });
    expect(order()).toEqual(saved);
    expect(wrapper.find('.is-drag-preview').exists()).toBe(false);
    expect(ghost.isConnected).toBe(false);
    expect(wrapper.find('.overview-unsaved').exists()).toBe(false);
    await wrapper.find('[data-card-id="recent-activity"]').trigger('dragstart', { dataTransfer });
    await wrapper.find('[data-card-id="attention"]').trigger('dragover', { dataTransfer, clientX: 150, clientY: 50 });
    await wrapper.find('[data-card-id="recent-activity"]').trigger('drop', { dataTransfer });
    expect(order()).toEqual(['activity', 'recent-activity', 'attention', 'today-actions']);
    expect(wrapper.find('.overview-unsaved').text()).toBe('未保存');
    expect(wrapper.find('.is-drag-preview').exists()).toBe(false);
    await wrapper.find('.overview-customizer-cancel').trigger('click');
    expect(order()).toEqual(saved);
    expect(JSON.parse(localStorageData.get('pinch.personal-stats.overview-cards')!)).toEqual(saved);
  });

  it('accepts drops in grid gaps and animates cards moving into their new positions', async () => {
    localStorageData.set('pinch.personal-stats.overview-cards', JSON.stringify(['attention', 'today-actions', 'recent-activity']));
    const wrapper = mountStats();
    await flushPromises();
    await wrapper.find('.overview-customize-btn').trigger('click');
    const grid = wrapper.find('.overview-cards-grid');
    const cards = () => grid.findAll('[data-card-id]');
    cards().forEach(card => {
      const el = card.element as HTMLElement;
      const left = () => Array.from(el.parentElement!.children).indexOf(el) * 110;
      vi.spyOn(el, 'getBoundingClientRect').mockImplementation(() => ({ x: left(), y: 0, left: left(), top: 0, width: 100, height: 100, right: left() + 100, bottom: 100, toJSON: () => ({}) }));
      Object.defineProperty(el, 'offsetLeft', { configurable: true, get: left });
      Object.defineProperty(el, 'offsetWidth', { configurable: true, value: 100 });
      Object.defineProperty(el, 'offsetHeight', { configurable: true, value: 100 });
    });
    const originalStyle = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudoElement) => {
      const style = originalStyle(element, pseudoElement);
      if (element.classList.contains('overview-card-move')) {
        return new Proxy(style, { get: (target, property) => {
          if (property === 'transitionDuration') return '0.22s';
          if (property === 'transitionDelay') return '0s';
          if (property === 'transitionProperty') return 'transform';
          return Reflect.get(target, property);
        } });
      }
      return style;
    });
    const dataTransfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
    await wrapper.find('[data-card-id="recent-activity"]').trigger('dragstart', { dataTransfer, clientX: 250, clientY: 50 });
    // The gap nearest the first card is a valid insertion position.
    await grid.trigger('dragover', { dataTransfer, clientX: 104, clientY: 50 });
    expect(cards().map(card => card.attributes('data-card-id'))).toEqual(['recent-activity', 'attention', 'today-actions']);
    expect(grid.findAll('.overview-card-move')).toHaveLength(3);
    await grid.trigger('drop', { dataTransfer, clientX: 104, clientY: 50 });
    expect(grid.find('.is-drag-preview').exists()).toBe(false);
    await wrapper.find('.overview-customizer-save').trigger('click');
    expect(JSON.parse(localStorageData.get('pinch.personal-stats.overview-cards')!).filter((id: string) => !id.startsWith('kpi-'))).toEqual(['recent-activity', 'attention', 'today-actions']);
  });

  it('does not flip adjacent cards back when animated neighbours emit more dragover events', async () => {
    localStorageData.set('pinch.personal-stats.overview-cards', JSON.stringify(['attention', 'today-actions']));
    const wrapper = mountStats();
    await flushPromises();
    await wrapper.find('.overview-customize-btn').trigger('click');
    const grid = wrapper.find('.overview-cards-grid');
    const firstCard = wrapper.find('[data-card-id="attention"]');
    const secondCard = wrapper.find('[data-card-id="today-actions"]');
    const order = () => grid.findAll('[data-card-id]').map(card => card.attributes('data-card-id'));
    [firstCard, secondCard].forEach((card, initialIndex) => {
      const element = card.element as HTMLElement;
      Object.defineProperties(element, {
        offsetLeft: { configurable: true, get: () => Array.from(element.parentElement!.children).indexOf(element) * 110 },
        offsetWidth: { configurable: true, value: 100 },
        offsetHeight: { configurable: true, value: 100 }
      });
      // Visible card bounds can still be at their old positions during the animation.
      vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ x: initialIndex * 110, y: 0, left: initialIndex * 110, top: 0, right: initialIndex * 110 + 100, bottom: 100, width: 100, height: 100, toJSON: () => ({}) });
    });
    const dataTransfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
    await secondCard.trigger('dragstart', { dataTransfer, clientX: 150, clientY: 50 });
    await firstCard.trigger('dragover', { dataTransfer, clientX: 35, clientY: 50 });
    expect(order()).toEqual(['today-actions', 'attention']);
    for (const x of [43, 52, 68, 82]) {
      await firstCard.trigger('dragover', { dataTransfer, clientX: x, clientY: 50 });
      expect(order()).toEqual(['today-actions', 'attention']);
    }
    // Leaving the destination slot deliberately permits moving back to slot two.
    await firstCard.trigger('dragover', { dataTransfer, clientX: 160, clientY: 50 });
    expect(order()).toEqual(['attention', 'today-actions']);
    await firstCard.trigger('dragover', { dataTransfer, clientX: 172, clientY: 50 });
    expect(order()).toEqual(['attention', 'today-actions']);
    await firstCard.trigger('dragover', { dataTransfer, clientX: 45, clientY: 50 });
    expect(order()).toEqual(['today-actions', 'attention']);
    await firstCard.trigger('drop', { dataTransfer, clientX: 65, clientY: 50 });
    expect(order()).toEqual(['today-actions', 'attention']);
    await secondCard.trigger('dragend', { dataTransfer });
    expect(order()).toEqual(['today-actions', 'attention']);
    expect(grid.find('.is-drag-preview').exists()).toBe(false);
  });

  it('keeps hiding cards as a draft action with checkbox sync, cancel and save', async () => {
    const wrapper = mountStats();
    await flushPromises();
    await wrapper.find('.overview-customize-btn').trigger('click');
    expect(wrapper.find('.overview-kpi-grid .overview-card-hide').exists()).toBe(false);
    await wrapper.find('[data-card-id="attention"] .overview-card-hide').trigger('click');
    expect(wrapper.find('[data-card-id="attention"]').exists()).toBe(false);
    expect(wrapper.find('input[value="attention"]').element).toHaveProperty('checked', false);
    expect(localStorageData.get('pinch.personal-stats.overview-cards')).toBeUndefined();
    await wrapper.find('.overview-customizer-cancel').trigger('click');
    expect(wrapper.find('[data-card-id="attention"]').exists()).toBe(true);
    await wrapper.find('.overview-customize-btn').trigger('click');
    await wrapper.find('[data-card-id="attention"] .overview-card-hide').trigger('click');
    await wrapper.find('.overview-customizer-save').trigger('click');
    const restored = mountStats();
    await flushPromises();
    expect(restored.find('[data-card-id="attention"]').exists()).toBe(false);
  });

  it('uses a decorative drag icon and lets focused cards reorder with arrow keys', async () => {
    const wrapper = mountStats();
    document.body.appendChild(wrapper.element);
    await flushPromises();
    const order = () => wrapper.findAll('.overview-cards-grid > [data-card-id]').map(card => card.attributes('data-card-id'));
    const card = wrapper.find('[data-card-id="attention"]');
    expect(card.attributes('tabindex')).toBeUndefined();
    await wrapper.find('.overview-customize-btn').trigger('click');
    expect(card.attributes('tabindex')).toBe('0');
    expect(card.attributes('aria-label')).toContain('聚焦卡片后使用方向键');
    const icon = card.find('.overview-card-drag-handle');
    expect(icon.element.tagName).toBe('SPAN');
    expect(icon.attributes('tabindex')).toBeUndefined();
    expect(icon.attributes('aria-hidden')).toBe('true');
    await icon.trigger('click');
    expect(order()).toEqual(['activity', 'attention']);
    (card.element as HTMLElement).focus();
    await card.trigger('keydown', { key: 'ArrowLeft' });
    expect(order()).toEqual(['attention', 'activity']);
    expect(document.activeElement).toBe(card.element);
    await card.trigger('keydown', { key: 'ArrowRight' });
    expect(order()).toEqual(['activity', 'attention']);
    expect(document.activeElement).toBe(card.element);
    await card.find('.overview-card-hide').trigger('keydown', { key: 'ArrowUp' });
    expect(order()).toEqual(['activity', 'attention']);
    expect(wrapper.find('.overview-kpi-grid [tabindex]').exists()).toBe(false);
    await wrapper.find('.overview-customizer-save').trigger('click');
    expect(card.attributes('tabindex')).toBeUndefined();
    await card.trigger('keydown', { key: 'ArrowUp' });
    expect(order()).toEqual(['activity', 'attention']);
  });

  it('keeps the draft open on storage failure and saves it when retried', async () => {
    const wrapper = mountStats();
    await flushPromises();
    await wrapper.find('.overview-customize-btn').trigger('click');
    await wrapper.find('input[value="habit-rhythm"]').setValue(true);
    vi.mocked(window.localStorage.setItem).mockImplementationOnce(() => { throw new Error('Storage full'); });
    await wrapper.find('.overview-customizer-save').trigger('click');
    expect(wrapper.find('.overview-customizer').exists()).toBe(true);
    expect(wrapper.find('.overview-save-status').text()).toContain('保存失败');
    expect(siyuanMocks.showMessage).not.toHaveBeenCalled();
    expect(wrapper.find('.habit-rhythm-card').exists()).toBe(true);
    expect(localStorageData.get('pinch.personal-stats.overview-cards')).toBeUndefined();
    await wrapper.find('.overview-customizer-save').trigger('click');
    expect(wrapper.find('.overview-customizer').exists()).toBe(false);
    expect(localStorageData.get('pinch.personal-stats.overview-cards')).toContain('habit-rhythm');
    expect(siyuanMocks.showMessage).toHaveBeenCalledTimes(1);
  });

  it('offers add and reset actions when empty, and previews reset before saving', async () => {
    localStorageData.set('pinch.personal-stats.overview-cards', '[]');
    const wrapper = mountStats();
    await flushPromises();
    await wrapper.find('.overview-empty-selection .overview-customize-btn').trigger('click');
    expect(wrapper.find('.overview-customizer').exists()).toBe(true);
    expect(wrapper.findAll('.overview-kpi')).toHaveLength(4);
    expect(wrapper.find('.overview-kpi .overview-card-hide').exists()).toBe(false);
    expect(wrapper.find('.overview-customizer-status').text()).toContain('已显示 0 张可选卡片');
    await wrapper.find('.overview-customizer-cancel').trigger('click');
    await wrapper.find('.overview-empty-selection .overview-customizer-reset').trigger('click');
    expect(wrapper.findAll('.overview-kpi')).toHaveLength(4);
    expect(localStorageData.get('pinch.personal-stats.overview-cards')).toBe('[]');
    await wrapper.find('.overview-customizer-cancel').trigger('click');
    expect(wrapper.find('.overview-empty-selection').exists()).toBe(true);
    await wrapper.find('.overview-empty-selection .overview-customizer-reset').trigger('click');
    await wrapper.find('.overview-customizer-save').trigger('click');
    const restored = mountStats();
    await flushPromises();
    expect(restored.findAll('.overview-kpi')).toHaveLength(4);
    expect(restored.find('.overview-empty-selection').exists()).toBe(false);
  });

  it('offers the five action cards and renders their live data', async () => {
    const now = new Date();
    const today = formatDateKey(now);
    const yesterday = formatDateKey(addDays(now, -1));
    const selectedCards = [
      'today-actions',
      'goal-progress-detail',
      'habit-rhythm',
      'focus-summary',
      'recent-activity'
    ];
    localStorageData.set('pinch.personal-stats.overview-cards', JSON.stringify(selectedCards));

    apiMocks.getHabits.mockResolvedValue([
      createHabit({
        currentStreak: 4,
        calendar: [
          {
            date: today,
            completed: true,
            completedCount: 1,
            targetCount: 1,
            timestamp: now.getTime()
          },
          {
            date: yesterday,
            completed: true,
            completedCount: 1,
            targetCount: 1,
            timestamp: addDays(now, -1).getTime()
          }
        ]
      })
    ]);
    apiMocks.getFocusTimerData.mockResolvedValue({
      dailyRecords: [{ date: today, sessions: 1, minutes: 20, timestamp: now.getTime() }],
      sessionRecords: [{
        id: 'focus-1',
        date: today,
        minutes: 20,
        timestamp: now.getTime(),
        targetType: 'task',
        targetId: 'today-task',
        targetName: 'Today task',
        targetBlockId: 'today-task'
      }]
    });

    const tasks = [
      createTask({
        id: 'today-task',
        blockId: 'today-task',
        title: 'Today task',
        dueDate: today,
        focusEstimate: { unit: 'minutes', value: 60 }
      }),
      createTask({
        id: 'done-task',
        blockId: 'done-task',
        title: 'Finished task',
        status: 'completed',
        completedAt: now.toISOString()
      })
    ];
    const goals: GoalListItem[] = [{
      id: 'goal-1',
      name: 'Launch project',
      members: [],
      documentCount: 0,
      taskMemberCount: 0,
      scopeCount: 0,
      documentSummary: '',
      totalTasks: 4,
      completedTasks: 1,
      remainingTasks: 3,
      progressPercent: 25,
      status: 'in-progress',
      dueDate: formatDateKey(addDays(now, 5))
    }];
    const emitSpy = vi.spyOn(eventBus, 'emit');
    const wrapper = mountStats({ tasks, goalItems: goals });
    await flushPromises();

    expect(wrapper.findAll('[data-card-id]')).toHaveLength(9);
    expect(wrapper.find('.today-actions-card').text()).toContain('40m');
    expect(wrapper.find('.today-task-list').text()).toContain('Today task');
    expect(wrapper.find('.today-actions-card .overview-detail-metrics').text()).toContain('今日完成1');
    expect(wrapper.find('.goal-progress-detail-card').text()).toContain('Launch project');
    expect(wrapper.find('.habit-execution-list').text()).toContain('Drink water');
    expect(wrapper.find('.focus-allocation-list').text()).toContain('Today task');
    expect(wrapper.find('.recent-activity-card').text()).toContain('Finished task');

    await wrapper.find('.overview-customize-btn').trigger('click');
    const optionValues = wrapper.findAll('.overview-card-option input').map(input => input.attributes('value'));
    expect(optionValues).toEqual(expect.arrayContaining(selectedCards));

    await wrapper.find('.today-task-list button').trigger('click');
    expect(apiMocks.openBlockById).toHaveBeenCalledWith('today-task');
    await wrapper.find('.focus-allocation-list button').trigger('click');
    expect(apiMocks.openBlockById).toHaveBeenCalledWith('today-task');
    await wrapper.find('.habit-execution-list button').trigger('click');
    expect(wrapper.emitted('open-detail')).toContainEqual([{ target: 'habit-detail', habitId: 'habit-1' }]);

    await wrapper.find('.today-actions-button').trigger('click');
    expect(emitSpy).toHaveBeenCalledWith(
      Events.FOCUS_TIMER_PANEL_OPEN_REQUEST,
      expect.objectContaining({
        target: expect.objectContaining({ id: 'today-task', preferredDuration: 60 }),
        showPanel: true
      })
    );
    emitSpy.mockRestore();
  });

  it('migrates merged cards once, deduplicates them, and preserves their saved order', async () => {
    const legacy = ['goals-summary', 'goal-progress-detail', 'task-status', 'habit-summary', 'habit-rhythm', 'period-comparison', 'activity', 'unknown-card'];
    localStorageData.set('pinch.personal-stats.overview-cards', JSON.stringify(legacy));
    const wrapper = mountStats();
    await flushPromises();
    const mixed = ['goal-progress-detail', 'today-actions', 'habit-rhythm', 'activity'];
    const order = (view: ReturnType<typeof mountStats>) => view.findAll('.overview-cards-grid > [data-card-id]').map(card => card.attributes('data-card-id'));
    expect(order(wrapper)).toEqual(mixed);
    expect(JSON.parse(localStorageData.get('pinch.personal-stats.overview-cards')!)).toEqual(legacy);
    await wrapper.find('.overview-customize-btn').trigger('click');
    const optionIds = wrapper.findAll('.overview-card-option input').map(input => input.attributes('value'));
    expect(optionIds).toHaveLength(13);
    expect(['task-status', 'habit-summary', 'goals-summary', 'period-comparison'].filter(id => optionIds.includes(id))).toEqual([]);
    await wrapper.find('.overview-customizer-save').trigger('click');
    const saved = JSON.parse(localStorageData.get('pinch.personal-stats.overview-cards')!);
    expect(saved.filter((id: string) => !id.startsWith('kpi-'))).toEqual(mixed);
    const restored = mountStats();
    await flushPromises();
    expect(order(restored)).toEqual(mixed);
  });

  it('filters upcoming deadlines to tomorrow through day seven, sorts them and expands the list', async () => {
    const now = new Date();
    const due = (days: number) => formatDateKey(addDays(now, days));
    localStorageData.set('pinch.personal-stats.overview-cards', JSON.stringify(['upcoming-deadlines']));
    const tasks = [
      createTask({ id: 'day7', title: 'Day seven', dueDate: due(7) }),
      createTask({ id: 'day2', title: 'Day two', dueDate: due(2) }),
      createTask({ id: 'late', title: 'Tomorrow evening', dueDate: due(1), dueTime: '18:00' }),
      createTask({ id: 'early', blockId: 'early', title: 'Tomorrow morning', dueDate: due(1), dueTime: '08:00' }),
      createTask({ id: 'today', title: 'Today excluded', dueDate: due(0) }),
      createTask({ id: 'overdue', title: 'Overdue excluded', dueDate: due(-1) }),
      createTask({ id: 'day8', title: 'Day eight excluded', dueDate: due(8) }),
      createTask({ id: 'done', title: 'Done excluded', dueDate: due(1), status: 'completed' }),
      createTask({ id: 'cancelled', title: 'Cancelled excluded', dueDate: due(1), status: 'cancelled' }),
      createTask({ id: 'archived', title: 'Archived excluded', dueDate: due(1), archived: true }),
      createTask({ id: 'virtual', title: 'Virtual excluded', dueDate: due(1), isVirtual: true }),
      createTask({ id: 'invalid', title: 'Invalid excluded', dueDate: 'invalid' })
    ];
    const wrapper = mountStats({ tasks });
    await flushPromises();
    const card = wrapper.find('.upcoming-deadlines-card');
    expect(card.text()).toContain('4 项任务即将截止');
    expect(card.findAll('.overview-highlight-row strong').map(row => row.text())).toEqual(['Tomorrow morning', 'Tomorrow evening', 'Day two']);
    expect(card.text()).toContain('剩余 1 天');
    await card.find('.overview-highlight-row').trigger('click');
    expect(apiMocks.openBlockById).toHaveBeenCalledWith('early');
    await card.find('.overview-list-toggle').trigger('click');
    expect(card.find('.overview-list-toggle').attributes('aria-expanded')).toBe('true');
    expect(card.findAll('.overview-highlight-row strong').map(row => row.text())).toEqual(['Tomorrow morning', 'Tomorrow evening', 'Day two', 'Day seven']);
    await findButtonByText(wrapper, '.range-switch button', '今日').trigger('click');
    expect(card.findAll('.overview-highlight-row')).toHaveLength(4);
    await card.find('.overview-list-toggle').trigger('click');
    expect(card.findAll('.overview-highlight-row')).toHaveLength(3);
  });

  it('uses the last update for stagnant tasks with a seven-day threshold and creation fallback', async () => {
    const now = new Date();
    localStorageData.set('pinch.personal-stats.overview-cards', JSON.stringify(['stagnant-tasks']));
    const tasks = [
      createTask({ id: 'seven', title: 'Seven days idle', updatedAt: addDays(now, -7).toISOString() }),
      createTask({ id: 'old', blockId: 'old', title: 'Oldest update', updatedAt: addDays(now, -20).toISOString() }),
      createTask({ id: 'fallback', title: 'Creation fallback', updatedAt: undefined, createdAt: addDays(now, -10).toISOString() }),
      createTask({ id: 'six', title: 'Six days excluded', updatedAt: addDays(now, -6).toISOString() }),
      createTask({ id: 'start', title: 'Old start excluded', startDate: formatDateKey(addDays(now, -90)) }),
      createTask({ id: 'done', status: 'completed', updatedAt: addDays(now, -30).toISOString() }),
      createTask({ id: 'cancelled', status: 'cancelled', updatedAt: addDays(now, -30).toISOString() }),
      createTask({ id: 'archived', archived: true, updatedAt: addDays(now, -30).toISOString() })
    ];
    const wrapper = mountStats({ tasks });
    await flushPromises();
    const card = wrapper.find('.stagnant-tasks-card');
    expect(card.text()).toContain('3 项任务需要重新推进');
    expect(card.findAll('.overview-highlight-row strong').map(row => row.text())).toEqual(['Oldest update', 'Creation fallback', 'Seven days idle']);
    expect(card.text()).toContain('7 天未更新');
    await card.find('.overview-highlight-row').trigger('click');
    expect(apiMocks.openBlockById).toHaveBeenCalledWith('old');
    await wrapper.setProps({ tasks: tasks.map(task => task.id === 'old' ? { ...task, updatedAt: now.toISOString() } : task) });
    expect(card.findAll('.overview-highlight-row')).toHaveLength(2);
  });

  it('shows only pending scheduled habits and applies weekly targets and live check-in updates', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-07T12:00:00'));
    const now = new Date();
    const today = formatDateKey(now);
    const checkin = (date: string, count = 1, target = 1) => ({ date, completed: count >= target, completedCount: count, targetCount: target });
    const habitData = [
      createHabit({ id: 'partial', name: 'Partial habit', timesPerDay: 3, calendar: [checkin(today, 1, 3)] }),
      createHabit({ id: 'empty', name: 'Pending habit', calendar: [], completedToday: false }),
      createHabit({ id: 'custom-today', name: 'Scheduled today', frequency: 'custom', customSchedule: { type: 'week', weekDays: [now.getDay()] }, calendar: [] }),
      createHabit({ id: 'weekly-pending', name: 'Weekly remaining', frequency: 'weekly2', calendar: [checkin(formatDateKey(addDays(now, -1)))] }),
      createHabit({ id: 'weekly-done', name: 'Weekly target met', frequency: 'weekly2', calendar: [checkin(formatDateKey(addDays(now, -1))), checkin(formatDateKey(addDays(now, -2)))] }),
      createHabit({ id: 'paused', name: 'Paused excluded', isPaused: true, calendar: [] }),
      createHabit({ id: 'future', name: 'Future excluded', createdAt: addDays(now, 1).toISOString(), calendar: [] }),
      createHabit({ id: 'custom-off', name: 'Unscheduled excluded', frequency: 'custom', customSchedule: { type: 'week', weekDays: [(now.getDay() + 1) % 7] }, calendar: [] }),
      createHabit({ id: 'done', name: 'Completed excluded' })
    ];
    apiMocks.getHabits.mockResolvedValue(habitData);
    localStorageData.set('pinch.personal-stats.overview-cards', JSON.stringify(['today-habits']));
    const wrapper = mountStats();
    await flushPromises();
    const card = wrapper.find('.today-habits-card');
    expect(card.text()).toContain('4 个习惯待打卡');
    expect(card.text()).toContain('今日已完成 1/3 次');
    await card.find('.overview-list-toggle').trigger('click');
    expect(card.findAll('.overview-highlight-row strong').map(row => row.text())).toEqual(['Partial habit', 'Pending habit', 'Scheduled today', 'Weekly remaining']);
    await card.find('.overview-highlight-row').trigger('click');
    expect(wrapper.emitted('open-detail')).toContainEqual([{ target: 'habit-detail', habitId: 'partial' }]);
    eventBus.emit(Events.HABITS_UPDATED, { source: 'habit-tracker', habits: habitData.map(habit => habit.id === 'partial' ? { ...habit, calendar: [checkin(today, 3, 3)] } : habit) });
    await wrapper.vm.$nextTick();
    expect(card.text()).toContain('3 个习惯待打卡');
    expect(card.text()).not.toContain('Partial habit');
  });

  it('previews, cancels and saves new cards alongside the existing mixed order', async () => {
    localStorageData.set('pinch.personal-stats.overview-cards', JSON.stringify(['habit-rhythm', 'activity']));
    const wrapper = mountStats();
    await flushPromises();
    const newIds = ['upcoming-deadlines', 'stagnant-tasks', 'today-habits', 'unscheduled-tasks', 'estimate-vs-actual'];
    const order = (view: ReturnType<typeof mountStats>) => view.findAll('.overview-cards-grid > [data-card-id]').map(card => card.attributes('data-card-id'));
    await wrapper.find('.overview-customize-btn').trigger('click');
    for (const id of newIds) await wrapper.find(`input[value="${id}"]`).setValue(true);
    expect(order(wrapper)).toEqual(['habit-rhythm', 'activity', ...newIds]);
    await wrapper.find('.overview-customizer-cancel').trigger('click');
    expect(order(wrapper)).toEqual(['habit-rhythm', 'activity']);
    await wrapper.find('.overview-customize-btn').trigger('click');
    for (const id of newIds) await wrapper.find(`input[value="${id}"]`).setValue(true);
    await wrapper.find('[data-card-id="upcoming-deadlines"]').trigger('keydown', { key: 'ArrowUp' });
    await wrapper.find('.overview-customizer-save').trigger('click');
    const restored = mountStats();
    await flushPromises();
    expect(order(restored)).toEqual(['habit-rhythm', 'upcoming-deadlines', 'activity', 'stagnant-tasks', 'today-habits', 'unscheduled-tasks', 'estimate-vs-actual']);
    expect(restored.find('.upcoming-deadlines-card .overview-inline-empty').text()).toContain('没有待完成的截止任务');
    expect(restored.find('.stagnant-tasks-card .overview-inline-empty').text()).toContain('没有连续 7 天及以上未更新');
    expect(restored.find('.today-habits-card .overview-inline-empty').text()).toContain('没有待打卡的习惯');
    expect(restored.find('.unscheduled-tasks-card .overview-inline-empty').text()).toContain('没有尚未安排日期');
    expect(restored.find('.estimate-vs-actual-card .overview-inline-empty').text()).toContain('本周期还没有已完成任务');
  });

  it('lists only unfinished high-priority tasks with neither a start date nor a deadline', async () => {
    const now = new Date();
    const today = formatDateKey(now);
    localStorageData.set('pinch.personal-stats.overview-cards', JSON.stringify(['unscheduled-tasks']));
    const tasks = [
      createTask({ id: 'new', title: 'Newest waiting', priority: 'high', createdAt: now.toISOString() }),
      createTask({ id: 'old', blockId: 'old', title: 'Oldest waiting', priority: 'high', createdAt: addDays(now, -20).toISOString() }),
      createTask({ id: 'middle', title: 'Middle waiting', priority: 'high', createdAt: addDays(now, -10).toISOString() }),
      createTask({ id: 'blank', title: 'Blank dates', priority: 'high', startDate: ' ', dueDate: '', createdAt: addDays(now, -5).toISOString() }),
      createTask({ id: 'start', title: 'Start date excluded', priority: 'high', startDate: today }),
      createTask({ id: 'due', title: 'Deadline excluded', priority: 'high', dueDate: today }),
      createTask({ id: 'medium', priority: 'medium' }),
      createTask({ id: 'low', priority: 'low' }),
      createTask({ id: 'none', priority: 'none' }),
      createTask({ id: 'completed', priority: 'high', status: 'completed' }),
      createTask({ id: 'cancelled', priority: 'high', status: 'cancelled' }),
      createTask({ id: 'archived', priority: 'high', archived: true }),
      createTask({ id: 'virtual', priority: 'high', isVirtual: true })
    ];
    const wrapper = mountStats({ tasks });
    await flushPromises();
    const card = wrapper.find('.unscheduled-tasks-card');
    expect(card.text()).toContain('4 项高优先级任务尚未安排日期');
    expect(card.findAll('.overview-highlight-row strong').map(row => row.text())).toEqual(['Oldest waiting', 'Middle waiting', 'Blank dates']);
    await card.find('.overview-highlight-row').trigger('click');
    expect(apiMocks.openBlockById).toHaveBeenCalledWith('old');
    await card.find('.overview-list-toggle').trigger('click');
    expect(card.findAll('.overview-highlight-row')).toHaveLength(4);
    await findButtonByText(wrapper, '.range-switch button', '今日').trigger('click');
    expect(card.findAll('.overview-highlight-row')).toHaveLength(4);
    await wrapper.setProps({ tasks: tasks.map(task => task.id === 'old' ? { ...task, startDate: today } : task) });
    expect(card.findAll('.overview-highlight-row strong').map(row => row.text())).toEqual(['Middle waiting', 'Blank dates', 'Newest waiting']);
  });

  it('compares complete estimates against lifetime linked focus for tasks completed in the selected period', async () => {
    const now = new Date();
    const today = formatDateKey(now);
    const yesterday = formatDateKey(addDays(now, -1));
    localStorageData.set('pinch.personal-stats.overview-cards', JSON.stringify(['estimate-vs-actual']));
    localStorageData.set('pinch.personal-stats.range', '7d');
    const done = (overrides: Partial<Task>) => createTask({ status: 'completed', completedAt: now.toISOString(), focusEstimate: { unit: 'minutes', value: 30 }, ...overrides });
    const tasks = [
      done({ id: 'over', blockId: 'block-over', title: 'Over estimate', focusEstimate: { unit: 'minutes', value: 60 } }),
      done({ id: 'under', title: 'Under estimate', focusEstimate: { unit: 'pomodoros', value: 2 } }),
      done({ id: 'equal', title: 'Equal estimate', completedAt: addDays(now, -1).toISOString() }),
      done({ id: 'archived', title: 'Archived completion', archived: true, focusEstimate: { unit: 'minutes', value: 10 } }),
      done({ id: 'no-estimate', title: 'No estimate', focusEstimate: undefined }),
      done({ id: 'no-focus', title: 'No focus' }),
      done({ id: 'outside', title: 'Older completion excluded', completedAt: addDays(now, -40).toISOString() }),
      done({ id: 'pending', title: 'Pending excluded', status: 'pending' }),
      done({ id: 'virtual', title: 'Virtual excluded', isVirtual: true })
    ];
    const session = (id: string, overrides: Partial<FocusSessionRecord>): FocusSessionRecord => ({ id, date: today, timestamp: now.getTime(), targetType: 'task', minutes: 30, ...overrides });
    apiMocks.getFocusTimerData.mockResolvedValue({
      dailyRecords: [{ date: today, sessions: 99, minutes: 9999, timestamp: now.getTime() }],
      sessionRecords: [
        session('over-old', { targetId: 'over', targetBlockId: 'block-over', minutes: 40, date: formatDateKey(addDays(now, -40)) }),
        session('over-block', { targetId: 'legacy-id', targetBlockId: 'block-over', minutes: 60 }),
        session('under', { targetId: 'under', targetBlockId: 'block-over', minutes: 20 }),
        session('equal', { targetId: 'equal', date: yesterday }),
        session('archived', { targetId: 'archived', minutes: 10 }),
        session('no-estimate', { targetId: 'no-estimate', minutes: 20 }),
        session('name-only', { targetName: 'No focus', minutes: 100 }),
        session('habit', { targetType: 'habit', targetId: 'no-focus' }),
        session('unlinked', { targetType: 'unlinked', targetId: 'no-focus' }),
        session('negative', { targetId: 'over', minutes: -30 }),
        session('invalid', { targetId: 'over', minutes: Number.NaN }),
        session('outside', { targetId: 'outside' }),
        session('pending', { targetId: 'pending' }),
        session('virtual', { targetId: 'virtual' })
      ]
    });
    const wrapper = mountStats({ tasks });
    await flushPromises();
    const card = wrapper.find('.estimate-vs-actual-card');
    expect(card.text()).toContain('6 项已完成任务中，4 项可对比');
    expect(card.findAll('.overview-detail-metrics strong').map(metric => metric.text())).toEqual(['2h30m', '2h40m']);
    expect(card.text()).toContain('较预估多 7%');
    expect(card.text()).toContain('1 项未估时');
    expect(card.text()).toContain('1 项无关联专注');
    expect(card.findAll('.overview-highlight-row strong').map(row => row.text())).toEqual(['Over estimate', 'Under estimate', 'Archived completion']);
    expect(card.findAll('.overview-highlight-row')[0].text()).toContain('多 40m');
    expect(card.findAll('.overview-highlight-row')[1].text()).toContain('少 30m');
    await card.find('.overview-highlight-row').trigger('click');
    expect(apiMocks.openBlockById).toHaveBeenCalledWith('block-over');
    await card.find('.overview-list-toggle').trigger('click');
    expect(card.findAll('.overview-highlight-row')[3].text()).toContain('与预估一致');
    await findButtonByText(wrapper, '.range-switch button', '今日').trigger('click');
    expect(card.text()).toContain('5 项已完成任务中，3 项可对比');
    expect(card.findAll('.overview-detail-metrics strong').map(metric => metric.text())).toEqual(['2h', '2h10m']);
    expect(card.text()).not.toContain('Equal estimate');
  });

  it('keeps missing focus and estimates out of comparison totals and updates when linked sessions arrive', async () => {
    const now = new Date();
    const today = formatDateKey(now);
    localStorageData.set('pinch.personal-stats.overview-cards', JSON.stringify(['estimate-vs-actual']));
    const tasks = [
      createTask({ id: 'ready', blockId: 'ready', status: 'completed', completedAt: now.toISOString(), focusEstimate: { unit: 'minutes', value: 60 } }),
      createTask({ id: 'zero', status: 'completed', completedAt: now.toISOString(), focusEstimate: { unit: 'minutes', value: 0 } }),
      createTask({ id: 'invalid', status: 'completed', completedAt: now.toISOString(), focusEstimate: { unit: 'minutes', value: Number.NaN } })
    ];
    const wrapper = mountStats({ tasks });
    await flushPromises();
    const card = wrapper.find('.estimate-vs-actual-card');
    expect(card.text()).toContain('3 项已完成任务中，0 项可对比');
    expect(card.text()).toContain('2 项未估时');
    expect(card.text()).toContain('3 项无关联专注');
    expect(card.find('.overview-detail-metrics').exists()).toBe(false);
    expect(card.find('.overview-inline-empty').text()).toContain('暂无法对比');
    apiMocks.getFocusTimerData.mockResolvedValue({
      dailyRecords: [],
      sessionRecords: [{ id: 'new-focus', date: today, minutes: 45, timestamp: now.getTime(), targetType: 'task', targetId: 'ready', targetBlockId: 'ready' }]
    });
    window.dispatchEvent(new Event('pinch-focus-session'));
    await flushPromises();
    expect(card.text()).toContain('3 项已完成任务中，1 项可对比');
    expect(card.findAll('.overview-detail-metrics strong').map(metric => metric.text())).toEqual(['1h', '45m']);
    expect(card.text()).toContain('较预估少 25%');
  });

  it('shows actionable empty states and level progress in the retained cards', async () => {
    localStorageData.set('pinch.personal-stats.overview-cards', JSON.stringify(['today-actions', 'goal-progress-detail', 'habit-rhythm', 'focus-summary', 'growth-summary']));
    rewardMocks.getRewardSnapshot.mockResolvedValue({ ...emptyRewardSnapshot, currentLevelXp: 20, nextLevelXp: 40, levelProgressPercent: 50 });
    const wrapper = mountStats();
    await flushPromises();
    expect(wrapper.find('.today-actions-card').text()).toContain('今天没有待办或逾期任务');
    expect(wrapper.find('.goal-progress-detail-card').text()).toContain('当前没有待推进的目标');
    expect(wrapper.find('.habit-rhythm-card').text()).toContain('本周期没有需要执行的习惯');
    expect(wrapper.find('.focus-summary-card').text()).toContain('这个周期里还没有专注记录');
    expect(wrapper.find('.growth-summary-card .overview-summary-progress span').attributes('style')).toContain('50%');
    await wrapper.find('.today-actions-button').trigger('click');
    expect(wrapper.emitted('drilldown')).toContainEqual([expect.objectContaining({ target: 'table', statuses: ['pending', 'in-progress', 'delayed'] })]);
  });
});


