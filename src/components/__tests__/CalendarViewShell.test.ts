import { flushPromises, shallowMount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, KeepAlive, ref, type PropType } from 'vue';
import type { Task } from '@/api';
import * as titleUtils from '@/composables/useTaskCommon';

const apiMocks = vi.hoisted(() => ({ getHabits: vi.fn(), getMoodData: vi.fn(), getFocusTimerData: vi.fn() }));
vi.mock('@/main', () => ({ usePlugin: () => ({ loadData: vi.fn().mockResolvedValue(null), saveData: vi.fn() }), openHabitTrackerFocusTimer: vi.fn() }));
vi.mock('@/api', async original => ({ ...await original<typeof import('@/api')>(), ...apiMocks }));
vi.mock('@/composables/useCheckinNotes', () => ({ useCheckinNotes: () => ({
  ensureDatesLoaded: vi.fn().mockResolvedValue(undefined), hydrateTimelineTarget: (target: object) => target, updateNote: vi.fn()
}) }));
const { default: CalendarViewShell } = await import('../CalendarViewShell.vue');
const { default: CalendarTaskSidebar } = await import('../CalendarTaskSidebar.vue');
const { default: MonthView } = await import('../MonthView.vue');
const { default: WeekView } = await import('../WeekView.vue');

function tasks(count: number): Task[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `task-${index}`, type: 'block', title: `Shared task ${String(index).padStart(5, '0')}`,
    status: 'pending', priority: 'none', tags: [], notebookId: 'nb', rootId: 'doc',
    startDate: '2026-10-07', dueDate: '2026-10-07', createdAt: '2026-10-01', updatedAt: '2026-10-01'
  }));
}

describe('shared calendar sidebar', () => {
  let wrapper: VueWrapper | undefined;
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 7, 12));
    apiMocks.getHabits.mockResolvedValue([]);
    apiMocks.getMoodData.mockResolvedValue({});
    apiMocks.getFocusTimerData.mockResolvedValue({ sessionRecords: [], dailyRecords: [] });
    vi.stubGlobal('requestAnimationFrame', vi.fn());
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() });
  });
  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function mountCalendar(data: Task[], active = true) {
    const Host = defineComponent({
      props: { active: Boolean, collapsed: Boolean, view: String, tasks: { type: Array as PropType<Task[]>, required: true } },
      setup(props) {
        const controller = ref<{ selectSidebarDate: (date: Date) => void } | null>(null);
        return () => h(CalendarViewShell, {
          active: props.active, sidebarCollapsed: props.collapsed, tasks: props.tasks,
          selectedStartDate: props.view === 'week' ? new Date(2026, 9, 5) : undefined,
          selectedDaysCount: props.view === 'week' ? 7 : undefined,
          onDateSelect: (date: Date) => controller.value?.selectSidebarDate(date)
        }, () => h(KeepAlive, {}, () => props.active ? h(props.view === 'month' ? MonthView : WeekView, {
          ref: controller, tasks: props.tasks,
          showHabits: false, showHabitLifelog: false, showFocusRecords: false,
          showTaskLifelog: false, showRecordsLifelog: false
        }) : h('div')));
      }
    });
    wrapper = shallowMount(Host, { props: { active, collapsed: false, view: 'month', tasks: data },
      global: { stubs: { KeepAlive: false, CalendarViewShell: false, CalendarTaskSidebar: false, MonthView: false, WeekView: false } } });
  }

  it('initializes 6501 tasks once and retains search and its single instance through month/week, collapse and leave/return', async () => {
    const title = vi.spyOn(titleUtils, 'getTaskDisplayTitle');
    mountCalendar(tasks(6501), false);
    expect(wrapper!.findComponent(CalendarTaskSidebar).exists()).toBe(false);
    await wrapper!.setProps({ active: true });
    await vi.waitFor(() => expect(wrapper!.find('.calendar-task-sidebar-notebook-header').text()).toContain('6501'), { timeout: 15000 });
    const sidebarUid = wrapper!.findComponent(CalendarTaskSidebar).vm.$.uid;
    await wrapper!.find('input[type="search"]').setValue('Shared task 03000');
    const calls = title.mock.calls.length;
    await wrapper!.setProps({ view: 'week' });
    await flushPromises();
    expect(wrapper!.findAllComponents(CalendarTaskSidebar)).toHaveLength(1);
    expect(wrapper!.findAll('.calendar-view-layout')).toHaveLength(1);
    expect(wrapper!.findComponent(CalendarTaskSidebar).vm.$.uid).toBe(sidebarUid);
    expect((wrapper!.find('input[type="search"]').element as HTMLInputElement).value).toBe('Shared task 03000');
    expect(title.mock.calls.length - calls).toBeLessThan(200);
    expect(apiMocks.getHabits).not.toHaveBeenCalled();
    expect(apiMocks.getMoodData).not.toHaveBeenCalled();
    expect(apiMocks.getFocusTimerData).not.toHaveBeenCalled();
    await wrapper!.find('.calendar-task-sidebar-document-header').trigger('click');
    const list = wrapper!.find('.calendar-task-sidebar-list');
    (list.element as HTMLElement).scrollTop = 12;
    await list.trigger('scroll');
    await wrapper!.setProps({ collapsed: true });
    await wrapper!.setProps({ collapsed: false, view: 'month' });
    await wrapper!.setProps({ active: false });
    await wrapper!.setProps({ active: true });
    await flushPromises();
    expect(wrapper!.findComponent(CalendarTaskSidebar).vm.$.uid).toBe(sidebarUid);
    expect((wrapper!.find('input[type="search"]').element as HTMLInputElement).value).toBe('Shared task 03000');
    expect(wrapper!.find('.calendar-task-sidebar-document-header').classes()).toContain('collapsed');
    expect((wrapper!.find('.calendar-task-sidebar-list').element as HTMLElement).scrollTop).toBe(12);
  }, 15000);

  it('routes shared mini-calendar selections to the active calendar and exposes no nested sidebars', async () => {
    mountCalendar(tasks(3));
    await flushPromises();
    await wrapper!.setProps({ view: 'week' });
    await flushPromises();
    const button = wrapper!.findAll('.calendar-task-mini-days button').find(day => day.text() === '20' && !day.classes('muted'))!;
    await button.trigger('click');
    expect(wrapper!.findComponent(WeekView).emitted('visibleRangeChange')?.at(-1)).toEqual([{ startDate: '2026-10-19', endDate: '2026-10-25' }]);
    expect(wrapper!.findAllComponents(CalendarTaskSidebar)).toHaveLength(1);
  });

  it('stops the cached week clock while hidden and resumes a single clock on return', async () => {
    const startClock = vi.spyOn(globalThis, 'setInterval');
    const stopClock = vi.spyOn(globalThis, 'clearInterval');
    mountCalendar(tasks(1));
    await flushPromises();
    expect(startClock).not.toHaveBeenCalled();
    await wrapper!.setProps({ view: 'week' });
    await flushPromises();
    expect(startClock).toHaveBeenCalledOnce();
    expect(startClock).toHaveBeenLastCalledWith(expect.any(Function), 60000);
    await wrapper!.setProps({ view: 'month' });
    expect(stopClock).toHaveBeenCalledOnce();
    await wrapper!.setProps({ view: 'week' });
    expect(startClock).toHaveBeenCalledTimes(2);
    await wrapper!.setProps({ active: false });
    expect(stopClock).toHaveBeenCalledTimes(2);
  });
});
