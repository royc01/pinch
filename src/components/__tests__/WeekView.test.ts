import { flushPromises, shallowMount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Habit } from '@/api';
import { defineComponent, h, KeepAlive } from 'vue';

const apiMocks = vi.hoisted(() => ({
  getHabits: vi.fn(),
  getMoodData: vi.fn(),
  getFocusTimerData: vi.fn()
}));

vi.mock('@/main', () => ({ usePlugin: () => null, openHabitTrackerFocusTimer: vi.fn() }));
vi.mock('@/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/api')>(),
  ...apiMocks
}));
vi.mock('@/composables/useCheckinNotes', () => ({
  useCheckinNotes: () => ({
    ensureDatesLoaded: vi.fn().mockResolvedValue(undefined),
    hydrateTimelineTarget: (target: object) => target,
    updateNote: vi.fn().mockResolvedValue(undefined)
  })
}));

const { default: WeekView } = await import('../WeekView.vue');

function weeklyHabit(): Habit {
  return {
    id: 'weekly-habit', name: 'Weekly reading', emoji: '📖', emojiColorIndex: 1, frequency: 'weekly3',
    createdAt: '2026-10-01T12:00:00', difficulty: 'medium', timesPerDay: 1,
    calendar: [{ date: '2026-10-07', completed: true, completedCount: 1,
      timestamp: new Date(2026, 9, 7, 9).getTime() }],
    completedToday: true, currentStreak: 1, totalCompletions: 1
  };
}

describe('WeekView calendar updates', () => {
  let wrapper: VueWrapper | undefined;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 7, 12));
    vi.clearAllMocks();
    apiMocks.getHabits.mockResolvedValue([]);
    apiMocks.getMoodData.mockResolvedValue({});
    apiMocks.getFocusTimerData.mockResolvedValue({ dailyRecords: [], sessionRecords: [] });
    vi.stubGlobal('requestAnimationFrame', vi.fn());
    vi.stubGlobal('localStorage', { getItem: vi.fn().mockReturnValue(null), setItem: vi.fn() });
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function mountWeek(props: Record<string, unknown> = {}) {
    wrapper = shallowMount(WeekView, {
      props: { tasks: [], displayOptions: [{ key: 'habits', label: 'Habits', enabled: false }],
        showHabits: false, showHabitLifelog: false,
        showFocusRecords: false, showTaskLifelog: false, showRecordsLifelog: false, ...props },
      global: { stubs: { CalendarTaskSidebar: false, TaskTitlePlain: false } }
    });
    return wrapper;
  }

  function range() {
    return wrapper!.findAll('.day-column').map(day => day.attributes('data-day-key'));
  }

  it('immediately switches both ways through the sidebar without leaving the week', async () => {
    mountWeek({ weekStartsOnSunday: false });
    await flushPromises();
    expect(range()[0]).toBe('2026-10-05');
    await wrapper!.findAll('.calendar-task-sidebar-week-start-btn')[1].trigger('click');
    expect(wrapper!.emitted('weekStartChange')?.at(-1)).toEqual([true]);
    await wrapper!.setProps({ weekStartsOnSunday: true });
    expect(range()).toEqual(['2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07',
      '2026-10-08', '2026-10-09', '2026-10-10']);
    expect(wrapper!.emitted('visibleRangeChange')?.at(-1)).toEqual([
      { startDate: '2026-10-04', endDate: '2026-10-10' }
    ]);
    await wrapper!.findAll('.calendar-task-sidebar-week-start-btn')[0].trigger('click');
    await wrapper!.setProps({ weekStartsOnSunday: false });
    expect(range()[0]).toBe('2026-10-05');
  });

  it.each([1, 3])('keeps the selected date in the %s-day view when the week convention changes', async (count) => {
    mountWeek({ fixedDaysCount: count, weekStartsOnSunday: false });
    const previous = range();
    await wrapper!.setProps({ weekStartsOnSunday: true });
    expect(range()).toEqual(previous);
  });

  it('reports the retained date range when returning to a cached calendar', async () => {
    const onRangeChange = vi.fn();
    const Host = defineComponent({
      props: { active: Boolean },
      setup: props => () => h(KeepAlive, {}, () => props.active
        ? h(WeekView, { tasks: [], onVisibleRangeChange: onRangeChange })
        : h('div'))
    });
    wrapper = shallowMount(Host, {
      props: { active: true },
      global: { stubs: { KeepAlive: false, WeekView: false } }
    });
    await flushPromises();
    await wrapper.findAll('.nav-btn').at(-1)!.trigger('click');
    expect(onRangeChange).toHaveBeenLastCalledWith({ startDate: '2026-10-12', endDate: '2026-10-18' });
    await wrapper.setProps({ active: false });
    onRangeChange.mockClear();
    await wrapper.setProps({ active: true });
    expect(onRangeChange).toHaveBeenLastCalledWith({ startDate: '2026-10-12', endDate: '2026-10-18' });
    expect(range()[0]).toBe('2026-10-12');
  });

  it('loads weekly habit chips when enabled even if habit logs are already on', async () => {
    mountWeek({ showHabitLifelog: true });
    await flushPromises();
    apiMocks.getHabits.mockResolvedValue([weeklyHabit()]);
    await wrapper!.setProps({ showHabits: true });
    await flushPromises();
    expect(wrapper!.findAll('.all-day-habit-task')).toHaveLength(7);
    expect(wrapper!.find('.is-habit-checkin').text()).toContain('Weekly reading');
  });

  it('reloads habit, focus and annotation logs when each layer is enabled', async () => {
    mountWeek();
    await flushPromises();
    apiMocks.getHabits.mockResolvedValue([weeklyHabit()]);
    apiMocks.getMoodData.mockResolvedValue({ '2026-10-07': { entries: [{
      id: 'note-1', text: 'Calendar annotation', createdAt: '2026-10-07T10:00:00', updatedAt: '2026-10-07T10:00:00'
    }] } });
    apiMocks.getFocusTimerData.mockResolvedValue({ dailyRecords: [], sessionRecords: [{
      id: 'focus-1', date: '2026-10-07', minutes: 30,
      timestamp: new Date(2026, 9, 7, 11, 30).getTime(),
      targetType: 'habit', targetId: 'weekly-habit', targetName: 'Weekly reading'
    }] });
    vi.clearAllMocks();
    await wrapper!.setProps({ showHabitLifelog: true, showFocusRecords: true, showRecordsLifelog: true });
    await flushPromises();
    expect(apiMocks.getHabits).toHaveBeenCalledTimes(1);
    expect(apiMocks.getFocusTimerData).toHaveBeenCalledTimes(1);
    expect(apiMocks.getMoodData).toHaveBeenCalledTimes(1);
    expect(wrapper!.find('.is-habit-checkin').exists()).toBe(true);
    expect(wrapper!.find('.is-manual-note').text()).toContain('Calendar annotation');
    expect(wrapper!.find('.is-focus').exists()).toBe(true);
  });
});
