import { flushPromises, shallowMount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, reactive } from 'vue';
import type { Task } from '@/api';
import { CALENDAR_CONSTANTS } from '@/composables/useCalendarConstants';

const apiMocks = vi.hoisted(() => ({ getHabits: vi.fn(), getMoodData: vi.fn(), getFocusTimerData: vi.fn() }));
vi.mock('@/main', () => ({ usePlugin: () => ({ loadData: vi.fn().mockResolvedValue(null), saveData: vi.fn() }), openHabitTrackerFocusTimer: vi.fn() }));
vi.mock('@/api', async importOriginal => ({ ...await importOriginal<typeof import('@/api')>(), ...apiMocks }));
vi.mock('@/composables/useCheckinNotes', () => ({
  useCheckinNotes: () => ({ ensureDatesLoaded: vi.fn().mockResolvedValue(undefined),
    hydrateTimelineTarget: (target: object) => target, updateNote: vi.fn() })
}));

const { default: MonthView } = await import('../MonthView.vue');
const { default: WeekView } = await import('../WeekView.vue');

function tasks(count: number): Task[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `task-${index}`, blockId: `block-${index}`, rootId: 'doc', notebookId: 'nb',
    type: 'block', title: `Calendar task ${String(index).padStart(5, '0')}`,
    status: 'pending', priority: 'none', tags: [],
    startDate: '2026-10-07', dueDate: '2026-10-07',
    createdAt: '2026-10-01T12:00:00', updatedAt: '2026-10-01T12:00:00'
  }));
}

describe('large calendar grids', () => {
  let wrapper: VueWrapper | undefined;
  const frames = new Map<number, FrameRequestCallback>();
  let frameId = 0;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 7, 12));
    apiMocks.getHabits.mockResolvedValue([]);
    apiMocks.getMoodData.mockResolvedValue({});
    apiMocks.getFocusTimerData.mockResolvedValue({ dailyRecords: [], sessionRecords: [] });
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      frames.set(++frameId, callback);
      return frameId;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => frames.delete(id)));
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() });
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    frames.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function mountCalendar(component = MonthView, data = tasks(1)) {
    wrapper = shallowMount(component, { props: { tasks: data,
      showHabits: false, showHabitLifelog: false, showFocusRecords: false,
      showTaskLifelog: false, showRecordsLifelog: false } });
  }

  async function measureViewport() {
    for (const [id, callback] of [...frames]) {
      frames.delete(id);
      callback(0);
    }
    await nextTick();
  }

  it('uses passive wheel input, throttles short-grid date navigation and leaves sidebar input alone', async () => {
    const listener = vi.spyOn(HTMLElement.prototype, 'addEventListener');
    mountCalendar();
    await flushPromises();
    const grid = wrapper!.find('.calendar-grid').element;
    expect(listener.mock.calls.some(([event, , options]) => event === 'wheel'
      && typeof options === 'object' && options?.passive === true)).toBe(true);
    const range = () => wrapper!.emitted('visibleRangeChange')!.at(-1)![0] as { startDate: string; endDate: string };
    const initial = range();
    wrapper!.element.dispatchEvent(new WheelEvent('wheel', { deltaY: 40, bubbles: true, cancelable: true }));
    await nextTick();
    expect(range()).toEqual(initial);
    const wheel = new WheelEvent('wheel', { deltaY: 40, bubbles: true, cancelable: true });
    grid.dispatchEvent(wheel);
    await nextTick();
    const shifted = range();
    expect(new Date(shifted.startDate).getTime() - new Date(initial.startDate).getTime()).toBe(7 * 86400000);
    expect(wheel.defaultPrevented).toBe(false);
    grid.dispatchEvent(new WheelEvent('wheel', { deltaY: 40 }));
    await nextTick();
    expect(range()).toEqual(shifted);
    vi.setSystemTime(new Date(2026, 9, 7, 12, 0, 1));
    grid.dispatchEvent(new WheelEvent('wheel', { deltaY: 40 }));
    await nextTick();
    expect(range()).not.toEqual(shifted);
  });

  it('preserves dates and native scrolling when the month grid overflows', async () => {
    mountCalendar(MonthView, tasks(6501));
    await flushPromises();
    const grid = wrapper!.find('.calendar-grid').element as HTMLElement;
    Object.defineProperty(grid, 'clientHeight', { value: 600 });
    Object.defineProperty(grid, 'scrollHeight', { value: 160000 });
    await measureViewport();
    const range = wrapper!.emitted('visibleRangeChange')!.at(-1);
    const wheel = new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true });
    grid.dispatchEvent(wheel);
    await nextTick();
    expect(wheel.defaultPrevented).toBe(false);
    expect(wrapper!.emitted('visibleRangeChange')!.at(-1)).toEqual(range);
  });

  it.each([
    { component: MonthView, trigger: '.day-number' },
    { component: WeekView, trigger: '.weekday-cell' }
  ])('loads disabled record datasets only when the day log is explicitly opened', async ({ component, trigger }) => {
    mountCalendar(component);
    await flushPromises();
    window.dispatchEvent(new Event('pinch-focus-session'));
    await flushPromises();
    expect(apiMocks.getHabits).not.toHaveBeenCalled();
    expect(apiMocks.getMoodData).not.toHaveBeenCalled();
    expect(apiMocks.getFocusTimerData).not.toHaveBeenCalled();
    await wrapper!.find(trigger).trigger('click');
    await flushPromises();
    expect(wrapper!.emitted('lifelogRequested')).toHaveLength(1);
    expect(apiMocks.getHabits).toHaveBeenCalledOnce();
    expect(apiMocks.getMoodData).toHaveBeenCalledOnce();
    expect(apiMocks.getFocusTimerData).toHaveBeenCalledOnce();
    expect(wrapper!.findComponent({ name: 'LifelogTimelinePanel' }).props('show')).toBe(true);
  });

  it.each([
    { name: 'month', component: MonthView, chip: '.week-tasks-layer > .task-chip', viewport: '.calendar-grid', step: 24 },
    { name: 'week', component: WeekView, chip: '.all-day-tasks-layer > .all-day-task', viewport: '.all-day-columns', step: CALENDAR_CONSTANTS.LAYOUT.TASK_CHIP_HEIGHT }
  ])('bounds 6501 same-day tasks in $name and renders the final tasks on scroll', async ({ component, chip, viewport, step }) => {
    const data = tasks(6501);
    wrapper = shallowMount(component, { props: { tasks: data,
      showHabits: false, showHabitLifelog: false, showFocusRecords: false,
      showTaskLifelog: false, showRecordsLifelog: false },
      global: { stubs: { TaskTitlePlain: false } } });
    await flushPromises();
    expect(wrapper.findAll(chip).length).toBeGreaterThan(0);
    expect(wrapper.findAll(chip).length).toBeLessThan(100);
    const scroll = wrapper.find(viewport);
    (scroll.element as HTMLElement).scrollTop = 6500 * step + (component === MonthView ? 140 : 0);
    await scroll.trigger('scroll');
    expect(wrapper.findAll(chip).length).toBeLessThan(100);
    expect(wrapper.findAll(chip).map(task => task.attributes('aria-label'))).toContain('Calendar task 06500');
  });

  it.each([MonthView, WeekView])('refreshes in-place title, status and dates without traversing unrelated nested fields', async component => {
    const nestedRead = vi.fn(() => 'unused metadata');
    const data = reactive(tasks(1));
    wrapper = shallowMount(component, { props: { tasks: data,
      showHabits: false, showHabitLifelog: false, showFocusRecords: false,
      showTaskLifelog: false, showRecordsLifelog: false } });
    await flushPromises();
    Object.defineProperty(data[0], 'metadata', { enumerable: true, configurable: true,
      value: { get nested() { return nestedRead(); } } });
    expect(nestedRead).not.toHaveBeenCalled();
    data[0].title = 'Updated calendar task';
    data[0].status = 'completed';
    await flushPromises();
    expect(wrapper.find('.task-completed').attributes('aria-label')).toBe('Updated calendar task');
    data[0].startDate = '2026-12-01';
    data[0].dueDate = '2026-12-01';
    await flushPromises();
    expect(wrapper.findAll('.week-tasks-layer > .task-chip, .all-day-tasks-layer > .all-day-task')).toHaveLength(0);
    expect(nestedRead).not.toHaveBeenCalled();
  });

  it('retains unchanged month weeks and live layout records when a different task moves', async () => {
    const data = reactive(tasks(2));
    Object.assign(data[1], { startDate: '2026-10-21', dueDate: '2026-10-21' });
    mountCalendar(MonthView, data);
    await flushPromises();
    const state = (wrapper!.vm.$ as any).setupState;
    const initial = state.weeklyTasks as Map<string, Task[]>;
    const changedWeek = [...initial].find(([, tasks]) => tasks.some(task => task.id === 'task-0'))![0];
    const unchangedWeek = [...initial].find(([, tasks]) => tasks.some(task => task.id === 'task-1'))![0];
    Object.assign(data[0], { startDate: '2026-10-08', dueDate: '2026-10-08' });
    await flushPromises();
    expect(state.weeklyTasks.get(unchangedWeek)).toBe(initial.get(unchangedWeek));
    expect(state.weeklyTasks.get(changedWeek)).not.toBe(initial.get(changedWeek));
    data[1].title = 'Live updated title';
    await flushPromises();
    expect(initial.get(unchangedWeek)![0].title).toBe('Live updated title');
    expect(state.weeklyTasks.get(unchangedWeek)).toBe(initial.get(unchangedWeek));
  });

  it('retains unrelated timed days and all-day records when one time slot changes', async () => {
    const data = reactive(tasks(3));
    Object.assign(data[0], { startDate: '2026-10-06', dueDate: '2026-10-06', startTime: '09:00', dueTime: '10:00' });
    Object.assign(data[1], { startTime: '09:00', dueTime: '10:00' });
    mountCalendar(WeekView, data);
    await flushPromises();
    const state = (wrapper!.vm.$ as any).setupState;
    const initialDays = state.tasksByDay as Map<string, unknown[]>;
    const initialAllDay = state.weekTasks[0];
    data[0].startTime = '08:30';
    await flushPromises();
    expect(state.tasksByDay.get('2026-10-07')).toBe(initialDays.get('2026-10-07'));
    expect(state.tasksByDay.get('2026-10-06')).not.toBe(initialDays.get('2026-10-06'));
    expect(state.weekTasks[0]).toBe(initialAllDay);
    (wrapper!.vm as unknown as { selectSidebarDate: (date: Date) => void }).selectSidebarDate(new Date(2026, 9, 14));
    await flushPromises();
    expect(state.tasksByDay.has('2026-10-07')).toBe(false);
  });
});
