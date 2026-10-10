import { flushPromises, shallowMount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive, ref } from 'vue';
import type { Task } from '@/api';

const settingsMocks = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('@/main', () => ({ usePlugin: () => ({ loadData: vi.fn().mockResolvedValue(null), saveData: vi.fn() }), openHabitTrackerFocusTimer: vi.fn() }));
vi.mock('@/composables/useGoals', () => ({ useGoals: () => ({
  goalDefinitions: ref([]), goalDocuments: ref([]), goalTasks: ref([]), goalItems: ref([]),
  goalsLoading: ref(false), loadGoalsData: vi.fn(), refreshGoalDocuments: vi.fn(),
  saveGoalDefinition: vi.fn(), saveGoalDefinitions: vi.fn(), saveTaskGoalMembership: vi.fn()
}) }));
vi.mock('@/composables/useUserSettings', async () => {
  const { DEFAULT_SETTINGS } = await import('@/utils/userSettings');
  const settings = reactive(structuredClone(DEFAULT_SETTINGS));
  settings.kanban.currentView = 'week';
  return { useUserSettings: () => ({ data: settings, loadSettings: settingsMocks.load, updateSettings: vi.fn() }) };
});
vi.mock('@/kernelBridge', async importOriginal => ({
  ...await importOriginal<Record<string, unknown>>(), refreshKernelTaskIndex: vi.fn()
}));
vi.mock('@/composables/useCheckinNotes', () => ({
  useCheckinNotes: () => ({ ensureDatesLoaded: vi.fn().mockResolvedValue(undefined),
    hydrateTimelineTarget: (target: object) => target, updateNote: vi.fn() })
}));

const { TaskRepository } = await import('@/api');
const { resetCrdtRepository } = await import('@/crdtStore');
const { default: KanbanView } = await import('../KanbanView.vue');
const { default: WeekView } = await import('../WeekView.vue');
const { default: MonthView } = await import('../MonthView.vue');
const { CALENDAR_CONSTANTS } = await import('@/composables/useCalendarConstants');
const { eventBus, Events } = await import('@/utils/eventBus');

function task(id: string, fields: Partial<Task> = {}): Task {
  return { id, blockId: id, rootId: 'doc', notebookId: 'nb', type: 'block', title: id,
    status: 'in-progress', priority: 'none', tags: [],
    startDate: '2026-10-09', dueDate: '2026-10-09',
    createdAt: '2026-10-01T12:00:00', updatedAt: '2026-10-09T11:00:00', ...fields };
}

describe('calendar tasks across view switches', () => {
  let wrapper: VueWrapper | undefined;
  const elementsFromPointDescriptor = Object.getOwnPropertyDescriptor(document, 'elementsFromPoint');

  beforeEach(() => {
    settingsMocks.load.mockReset().mockResolvedValue(undefined);
    resetCrdtRepository();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 9, 12));
    vi.stubGlobal('requestAnimationFrame', vi.fn());
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() });
    vi.spyOn(TaskRepository, 'getAllTasks').mockResolvedValue([]);
    vi.spyOn(TaskRepository, 'getCachedTasksOnly').mockResolvedValue([]);
    vi.spyOn(TaskRepository, 'getKernelMaterializedTasks').mockResolvedValue({ tasks: [] } as never);
    vi.spyOn(TaskRepository, 'getTasksByBlockIds').mockResolvedValue(new Map());
    vi.spyOn(TaskRepository, 'clearCache').mockResolvedValue(undefined);
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    if (elementsFromPointDescriptor) {
      Object.defineProperty(document, 'elementsFromPoint', elementsFromPointDescriptor);
    } else {
      Reflect.deleteProperty(document, 'elementsFromPoint');
    }
    vi.useRealTimers();
    resetCrdtRepository();
  });

  it('retains an all-day task dropped into a populated time grid after switching to the board and back', async () => {
    wrapper = shallowMount(KanbanView, { attachTo: document.body,
      global: { stubs: { CalendarViewShell: false, WeekView: false, KeepAlive: false } } });
    await flushPromises();
    const state = (wrapper.vm.$ as any).setupState;
    const original = [task('existing', { startTime: '09:00', dueTime: '10:00' }), task('moved')];
    state.syncTaskSnapshot(original);
    await flushPromises();
    expect(state.currentView).toBe('week');
    const week = wrapper.findComponent(WeekView);
    (week.vm.$.setupState as any).isInactiveHoursCollapsed = false;
    await flushPromises();
    expect(week.findAll('.timed-task')).toHaveLength(1);
    const allDayColumn = week.find('.all-day-column[data-day-key="2026-10-09"]').element;
    const timeColumn = week.find('.day-column[data-day-key="2026-10-09"]');
    const elementsFromPoint = vi.fn().mockReturnValue([allDayColumn]);
    Object.defineProperty(document, 'elementsFromPoint', { configurable: true, value: elementsFromPoint });
    await week.find('.all-day-task .task-chip-title').trigger('mousedown', { button: 0, clientX: 100, clientY: 20 });
    elementsFromPoint.mockReturnValue([week.find('.timed-task').element, timeColumn.element]);
    vi.mocked(TaskRepository.clearCache).mockClear();
    await timeColumn.trigger('mouseup', { clientX: 100, clientY: CALENDAR_CONSTANTS.LAYOUT.TIME_ROW_HEIGHT * 12 });
    await flushPromises();
    expect(TaskRepository.clearCache).toHaveBeenCalled();
    expect(week.findAll('.all-day-task')).toHaveLength(0);
    expect(week.findAll('.timed-task')).toHaveLength(2);
    expect(state.tasks.find((item: Task) => item.id === 'moved')).toMatchObject({
      startTime: '12:00', dueTime: '13:00', status: 'in-progress'
    });

    vi.mocked(TaskRepository.getAllTasks).mockResolvedValue([original[0], { ...original[1], startTime: '12:00', dueTime: '13:00' }]);
    state.currentView = 'kanban';
    await flushPromises();
    vi.setSystemTime(new Date(2026, 9, 9, 12, 0, 10));
    state.currentView = 'week';
    await flushPromises();
    const returnedWeek = wrapper.findComponent(WeekView);
    expect(returnedWeek.findAll('.all-day-task')).toHaveLength(0);
    expect(returnedWeek.findAll('.timed-task')).toHaveLength(2);
    expect(returnedWeek.props('tasks')).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'existing', startTime: '09:00', dueTime: '10:00' }),
      expect.objectContaining({ id: 'moved', startTime: '12:00', dueTime: '13:00', status: 'in-progress' })
    ]));
  });

  it('keeps a second timed task after an older calendar load completes and local guards expire', async () => {
    wrapper = shallowMount(KanbanView);
    await flushPromises();
    const state = (wrapper.vm.$ as any).setupState;
    const original = [task('existing', { startTime: '09:00', dueTime: '10:00' }), task('moved')];
    state.syncTaskSnapshot(original);
    const moved = { ...original[1], startTime: '12:00', dueTime: '13:00' };
    let finishLoad!: (tasks: Task[]) => void;
    vi.mocked(TaskRepository.getAllTasks).mockImplementationOnce(() => new Promise(resolve => { finishLoad = resolve; }));
    const loading = state.loadTasks(false, { silent: true, validateSelection: false, view: 'week' });
    state.handleTaskDateChanged(moved);
    finishLoad(original);
    await loading;
    expect(state.tasks.find((item: Task) => item.id === 'moved').startTime).toBe('12:00');

    // Switching to the board replaces the CRDT snapshot and consumes its
    // pending field acknowledgements. Return after all short guards expire.
    state.currentView = 'kanban';
    state.syncTaskSnapshot([original[0], moved]);
    await flushPromises();
    vi.setSystemTime(new Date(2026, 9, 9, 12, 0, 10));
    state.currentView = 'week';
    expect(state.restoreCachedTaskSnapshot('week')).toBe(true);
    expect(state.tasks.find((item: Task) => item.id === 'moved')).toMatchObject({
      startTime: '12:00', dueTime: '13:00'
    });
  });

  it('shares scheduled task and log filters across month, week and day while preserving document scope', async () => {
    wrapper = shallowMount(KanbanView);
    await flushPromises();
    const state = (wrapper.vm.$ as any).setupState;
    const original = [task('first'), task('other-document', { rootId: 'other-doc' }),
      task('other-notebook', { notebookId: 'other-nb' }), task('unscheduled', { startDate: '', dueDate: '' })];
    state.syncTaskSnapshot(original);
    state.calendarFilterType = 'all';
    state.calendarFilterDocument = 'all';
    const initial = state.monthViewTasks;
    expect(initial.map((item: Task) => item.id)).toEqual(['first', 'other-document', 'other-notebook']);
    expect(state.weekViewTasks).toBe(initial);
    expect(state.dayViewTasks).toBe(initial);
    expect(state.weekLifelogTasks).toBe(state.monthLifelogTasks);
    expect(state.dayLifelogTasks).toBe(state.monthLifelogTasks);
    state.calendarFilterDocument = 'doc';
    expect(state.monthViewTasks.map((item: Task) => item.id)).toEqual(['first', 'other-notebook']);
    expect(state.weekViewTasks).toBe(state.monthViewTasks);
    expect(state.dayViewTasks).toBe(state.monthViewTasks);
    expect(state.sharedCalendarSidebarTasks.map((item: Task) => item.id)).toContain('unscheduled');
    const scoped = state.monthViewTasks;
    state.currentView = 'month';
    expect(state.monthViewTasks).toBe(scoped);
    state.currentView = 'day';
    expect(state.dayViewTasks).toBe(scoped);
  });

  it('opens and reuses the month view at the requested local date without replaying navigation or changing scope', async () => {
    wrapper = shallowMount(KanbanView, {
      global: { stubs: { CalendarViewShell: false, MonthView: false, KeepAlive: false } }
    });
    await flushPromises();
    const state = (wrapper.vm.$ as any).setupState;
    state.currentView = 'table';
    state.calendarFilterType = 'all';
    state.calendarFilterDocument = 'doc';
    await flushPromises();
    const request = { view: 'month', date: '2026-11-27' };
    eventBus.emit(Events.KANBAN_VIEW_SWITCH_REQUEST, request);
    await flushPromises();
    const month = wrapper.findComponent(MonthView);
    expect(state.currentView).toBe('month');
    expect(state.calendarFilterDocument).toBe('doc');
    expect(month.find('[data-day-key="2026-11-27"]').classes()).not.toContain('focused-date');
    const uid = month.vm.$.uid;
    const focus = vi.spyOn(state.calendarMonthViewRef, 'focusDate');
    eventBus.emit(Events.KANBAN_VIEW_SWITCH_REQUEST, request);
    await flushPromises();
    expect(focus).not.toHaveBeenCalled();
    eventBus.emit(Events.KANBAN_VIEW_SWITCH_REQUEST, { view: 'month', date: '2026-11-03' });
    await flushPromises();
    expect(focus).toHaveBeenCalledOnce();
    expect(focus).toHaveBeenLastCalledWith(new Date(2026, 10, 3));
    expect(wrapper.findComponent(MonthView).vm.$.uid).toBe(uid);
    expect(month.find('[data-day-key="2026-11-03"]').exists()).toBe(true);
    eventBus.emit(Events.KANBAN_VIEW_SWITCH_REQUEST, { view: 'month', date: '2026-02-30' });
    await flushPromises();
    expect(focus).toHaveBeenCalledOnce();
    expect(month.find('[data-day-key="2026-11-03"]').exists()).toBe(true);
  });

  it('retains a date navigation request received before initial settings finish loading', async () => {
    let finishSettings!: () => void;
    settingsMocks.load.mockImplementationOnce(() => new Promise<void>(resolve => { finishSettings = resolve; }));
    wrapper = shallowMount(KanbanView, {
      global: { stubs: { CalendarViewShell: false, MonthView: false, KeepAlive: false } }
    });
    eventBus.emit(Events.KANBAN_VIEW_SWITCH_REQUEST, { view: 'month', date: '2026-08-12' });
    finishSettings();
    await flushPromises();
    expect((wrapper.vm.$ as any).setupState.currentView).toBe('month');
    expect(wrapper.findComponent(MonthView).find('[data-day-key="2026-08-12"]').exists()).toBe(true);
  });

  it('invalidates covered log reads on deletion and rejects a snapshot requested before the mutation', async () => {
    wrapper = shallowMount(KanbanView);
    await flushPromises();
    const state = (wrapper.vm.$ as any).setupState;
    const removed = task('archived-log', { archived: true, status: 'completed', completedAt: '2026-10-09T10:00:00' });
    state.calendarLifelogTasks = [removed];
    let resolveOld!: (tasks: Task[]) => void;
    vi.mocked(TaskRepository.getAllTasks).mockClear();
    vi.mocked(TaskRepository.getAllTasks).mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
    const oldRead = state.ensureCalendarLifelogTasksLoaded(false, true);
    await Promise.resolve();
    eventBus.emit(Events.TASK_DELETED, { blockId: removed.blockId });
    expect(state.calendarLifelogTasks).toEqual([]);
    const freshRead = state.ensureCalendarLifelogTasksLoaded(false, true);
    await freshRead;
    resolveOld([removed]);
    await oldRead;
    expect(state.calendarLifelogTasks).toEqual([]);
    expect(TaskRepository.getAllTasks).toHaveBeenCalledTimes(2);
    await state.ensureCalendarLifelogTasksLoaded(false, true);
    expect(TaskRepository.getAllTasks).toHaveBeenCalledTimes(2);
  });
});
