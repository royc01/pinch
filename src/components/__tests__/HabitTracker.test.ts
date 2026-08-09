import { describe, it, expect, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import HabitTracker from '../HabitTracker.vue';
import { getHabits, saveHabits } from '@/api';

vi.mock('@/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api')>();
  return {
    ...actual,
    getHabits: vi.fn(),
    saveHabits: vi.fn(),
    getMoodData: vi.fn().mockResolvedValue({}),
    saveMoodData: vi.fn().mockResolvedValue(undefined),
    getEmojiConf: vi.fn().mockResolvedValue({}),
    lsNotebooks: vi.fn().mockResolvedValue({ notebooks: [] }),
    sql: vi.fn().mockResolvedValue([])
  };
});

vi.mock('@/composables/useRewards', () => ({
  useRewards: () => ({
    rewardSnapshot: {
      value: {
        level: 1,
        levelProgressPercent: 0,
        currentLevelXp: 0,
        nextLevelXp: 100,
        availableCoins: 0,
        recentEntries: []
      }
    }
  })
}));

vi.mock('@/composables/useGoals', () => ({
  useGoals: () => ({
    goalItems: { value: [] }
  })
}));

const HabitCardListStub = {
  props: ['sortedHabits'],
  emits: ['toggleHabit'],
  template: `
    <div class="habit-card-list-stub">
      <div v-if="!sortedHabits.length" class="habit-empty">暂无习惯</div>
      <div v-for="habit in sortedHabits" :key="habit.id" class="habit-row">
        <span class="habit-name">{{ habit.name }}</span>
        <span class="habit-streak">连续打卡:{{ habit.currentStreak }}天</span>
        <span class="habit-total">总打卡:{{ habit.totalCompletions }}次</span>
        <button class="habit-toggle" type="button" @click="$emit('toggleHabit', habit.id)">打卡</button>
      </div>
    </div>
  `
};

const HabitModalStub = {
  props: ['show'],
  emits: ['submit', 'close'],
  data() {
    return {
      name: ''
    };
  },
  template: `
    <div v-if="show" class="modal-overlay">
      <input class="habit-name-input" type="text" v-model="name" />
      <button
        class="modal-submit"
        type="button"
        @click="$emit('submit', {
          name,
          emoji: '📘',
          difficulty: 'medium',
          frequency: 'daily',
          timesPerDay: 1,
          usePomodoro: false,
          pomodoroDuration: 25
        })"
      >
        确定
      </button>
    </div>
  `
};

const PanelStub = {
  props: ['show'],
  template: '<div v-if="show"><slot /></div>'
};

const mountHabitTracker = async () => {
  const wrapper = mount(HabitTracker, {
    global: {
      stubs: {
        SyButton: { template: '<button type="button"><slot /></button>' },
        Icon: { template: '<span />' },
        WeekDates: { template: '<div data-test="week-dates" />' },
        HabitCardList: HabitCardListStub,
        HabitModal: HabitModalStub,
        HabitStatsPanel: PanelStub,
        StatisticsPanel: PanelStub,
        RewardPanel: PanelStub,
        GoalPanel: PanelStub,
        MoodTrackerModal: PanelStub,
        MoodCalendarPanel: PanelStub,
        FocusTimerHost: {
          template: '<div data-test="focus-timer-host" />',
          methods: {
            open: vi.fn(),
            syncTarget: vi.fn()
          }
        },
        TaskManager: { template: '<div data-test="task-manager" />' }
      }
    }
  });
  await flushPromises();
  await wrapper.vm.$nextTick();
  return wrapper;
};

describe('HabitTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(saveHabits).mockResolvedValue(undefined);
  });

  it('renders the habit panel shell', async () => {
    vi.mocked(getHabits).mockResolvedValue([]);

    const wrapper = await mountHabitTracker();

    expect(wrapper.find('.habit-list').exists()).toBe(true);
    expect(wrapper.find('#add-habit-btn').exists()).toBe(true);
  });

  it('shows an empty state when no habits exist', async () => {
    vi.mocked(getHabits).mockResolvedValue([]);

    const wrapper = await mountHabitTracker();

    expect(wrapper.find('.habit-empty').text()).toBe('暂无习惯');
  });

  it('displays habits when they exist', async () => {
    vi.mocked(getHabits).mockResolvedValue([
      {
        id: '1',
        name: '晨跑',
        frequency: 'daily',
        completedToday: false,
        currentStreak: 3,
        totalCompletions: 5,
        calendar: [],
        createdAt: new Date().toISOString()
      }
    ]);

    const wrapper = await mountHabitTracker();

    expect(wrapper.find('.habit-name').text()).toBe('晨跑');
    expect(wrapper.text()).toContain('连续打卡:3天');
    expect(wrapper.text()).toContain('总打卡:5次');
  });

  it('adds a new habit', async () => {
    vi.mocked(getHabits).mockResolvedValue([]);

    const wrapper = await mountHabitTracker();
    await wrapper.find('#add-habit-btn').trigger('click');
    await wrapper.vm.$nextTick();

    await wrapper.find('input[type="text"]').setValue('读书');
    await wrapper.find('.modal-submit').trigger('click');
    await flushPromises();

    expect(saveHabits).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          name: '读书',
          frequency: 'daily'
        })
      ])
    );
  });

  it('toggles habit completion', async () => {
    vi.mocked(getHabits).mockResolvedValue([
      {
        id: '1',
        name: '喝水',
        frequency: 'daily',
        completedToday: false,
        currentStreak: 0,
        totalCompletions: 0,
        timesPerDay: 2,
        calendar: [],
        createdAt: new Date().toISOString()
      }
    ]);

    const wrapper = await mountHabitTracker();
    await wrapper.find('.habit-toggle').trigger('click');
    await flushPromises();

    expect(saveHabits).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: '1',
          name: '喝水'
        })
      ])
    );
  });
});
