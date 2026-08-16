import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FocusSessionRecord, Habit, Task } from '@/api';

const apiMocks = vi.hoisted(() => ({
  getFocusTimerData: vi.fn(),
  loadTaskGroups: vi.fn(),
  getAllTasks: vi.fn()
}));

vi.mock('@/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api')>();
  return {
    ...actual,
    getFocusTimerData: apiMocks.getFocusTimerData,
    loadTaskGroups: apiMocks.loadTaskGroups,
    TaskRepository: {
      ...actual.TaskRepository,
      getAllTasks: apiMocks.getAllTasks
    }
  };
});

vi.mock('@/goalRepository', () => ({
  loadGoals: vi.fn().mockResolvedValue([])
}));

vi.mock('@/composables/useCheckinNotes', () => ({
  useCheckinNotes: () => ({
    ensureDatesLoaded: vi.fn().mockResolvedValue(undefined),
    hydrateTimelineTarget: (target: object) => target,
    updateNote: vi.fn().mockResolvedValue(undefined)
  })
}));

vi.mock('@/composables/useI18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/composables/useI18n')>();
  return {
    ...actual,
    formatTemplate: (key: string) => key,
    useI18n: () => ({
      t: (key: string) => ({
        'habitCheckinLog.minutesTemplate': '{minutes}m',
        'habitCheckinLog.hoursMinutesTemplate': '{hours}h {minutes}m',
        'habitCheckinLog.hoursTemplate': '{hours}h',
        'lifelogTimeline.dailyFocusTime': 'Focus time',
        'lifelogTimeline.dailyCompletedTasks': 'Tasks completed',
        'lifelogTimeline.dailyCompletedHabits': 'Habits completed'
      }[key] || key)
    })
  };
});

const { default: MoodCalendarPanel } = await import('../MoodCalendarPanel.vue');

const CheckinNotesOverviewStub = {
  props: ['mode'],
  template: '<div class="checkin-notes-overview-stub" :data-mode="mode" />'
};

const LifelogTimelinePanelStub = {
  template: `
    <section class="timeline-stub">
      <div class="lifelog-timeline-header">Timeline header</div>
      <slot name="after-header" />
    </section>
  `
};

describe('MoodCalendarPanel record modes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.getFocusTimerData.mockResolvedValue({ dailyRecords: [], sessionRecords: [] });
    apiMocks.loadTaskGroups.mockResolvedValue([]);
    apiMocks.getAllTasks.mockResolvedValue([]);
  });

  it('switches between all records, annotations, and favorites', async () => {
    const wrapper = mount(MoodCalendarPanel, {
      props: {
        show: true,
        moodData: {},
        habits: [],
        currentMonth: new Date(2026, 7, 1).getTime(),
        weekdays: [],
        generateMonthViewData: () => [],
        getLargeMoodSvg: () => ''
      },
      global: {
        stubs: {
          Icon: true,
          LifelogTimelinePanel: LifelogTimelinePanelStub,
          CheckinNotesOverview: CheckinNotesOverviewStub
        }
      }
    });
    await flushPromises();

    const allTab = wrapper.find('[data-record-view="all"]');
    const annotationTab = wrapper.find('[data-record-view="annotations"]');
    const favoritesTab = wrapper.find('[data-record-view="favorites"]');
    expect(allTab.attributes('aria-selected')).toBe('true');
    expect(wrapper.find('.timeline-stub').exists()).toBe(true);

    await annotationTab.trigger('click');
    expect(annotationTab.attributes('aria-selected')).toBe('true');
    expect(wrapper.find('.checkin-notes-overview-stub').attributes('data-mode')).toBe('annotations');

    await favoritesTab.trigger('click');
    expect(favoritesTab.attributes('aria-selected')).toBe('true');
    expect(wrapper.find('.checkin-notes-overview-stub').attributes('data-mode')).toBe('favorites');

    await allTab.trigger('click');
    expect(allTab.attributes('aria-selected')).toBe('true');
    expect(wrapper.find('.timeline-stub').exists()).toBe(true);
  });

  it('shows the selected day focus, completed task, and completed habit summaries directly below the timeline header', async () => {
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const focusRecords: FocusSessionRecord[] = [{
      id: 'focus-1',
      date,
      minutes: 90,
      timestamp: new Date(`${date}T12:00:00`).getTime(),
      targetType: 'unlinked'
    }];
    const completedTasks: Task[] = ['task-1', 'task-2'].map(id => ({
      id,
      type: 'standalone',
      title: id,
      status: 'completed',
      priority: 'none',
      tags: [],
      createdAt: `${date}T08:00:00`,
      updatedAt: `${date}T09:00:00`,
      completedAt: `${date}T09:00:00`
    }));
    const completedHabits: Habit[] = ['habit-1', 'habit-2'].map(id => ({
      id,
      name: id,
      difficulty: 'easy',
      frequency: 'daily',
      completedToday: true,
      currentStreak: 0,
      totalCompletions: 1,
      calendar: [{ date, completed: true }],
      createdAt: `${date}T00:00:00`
    }));
    apiMocks.getFocusTimerData.mockResolvedValue({ dailyRecords: [], sessionRecords: focusRecords });
    apiMocks.getAllTasks.mockResolvedValue(completedTasks);

    const wrapper = mount(MoodCalendarPanel, {
      props: {
        show: true,
        moodData: {},
        habits: completedHabits,
        currentMonth: 0,
        weekdays: [],
        generateMonthViewData: () => [{ date, data: null, isCurrentMonth: true, isToday: true }],
        getLargeMoodSvg: () => ''
      },
      global: {
        stubs: {
          Icon: true,
          LifelogTimelinePanel: LifelogTimelinePanelStub,
          CheckinNotesOverview: CheckinNotesOverviewStub
        }
      }
    });
    await flushPromises();

    const summary = wrapper.find('.lifelog-daily-summary');
    const summaryItems = summary.findAll('.lifelog-daily-summary-item');
    expect(summaryItems).toHaveLength(3);
    expect(summaryItems.map(item => item.find('.lifelog-daily-summary-value').text())).toEqual(['1h 30m', '2', '2']);
    expect(summaryItems.map(item => item.find('.lifelog-daily-summary-label').text())).toEqual([
      'Focus time',
      'Tasks completed',
      'Habits completed'
    ]);

    const timeline = wrapper.find('.timeline-stub');
    expect(timeline.find('.lifelog-timeline-header').element.nextElementSibling).toBe(summary.element);
  });
});
