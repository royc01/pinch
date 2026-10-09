import { flushPromises, shallowMount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, KeepAlive, type Component, type PropType } from 'vue';
import type { Task } from '@/api';

const apiMocks = vi.hoisted(() => ({ getFocusTimerData: vi.fn() }));
vi.mock('@/main', () => ({ usePlugin: () => null, openHabitTrackerFocusTimer: vi.fn() }));
vi.mock('@/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/api')>(), ...apiMocks
}));

const { TaskRepository } = await import('@/api');
const { default: TableView } = await import('../TableView.vue');
const { default: GanttView } = await import('../GanttView.vue');

function tasks(count: number): Task[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `task-${index}`, blockId: `block-${index}`, rootId: 'doc', notebookId: 'nb',
    type: 'block', title: `Task ${index}`, status: 'pending', priority: 'none', tags: [],
    startDate: '2026-10-01', dueDate: '2026-10-02',
    createdAt: '2026-10-01T12:00:00', updatedAt: '2026-10-01T12:00:00'
  }));
}

describe('cached task views', () => {
  let wrapper: VueWrapper | undefined;

  beforeEach(() => {
    apiMocks.getFocusTimerData.mockResolvedValue({ dailyRecords: [], sessionRecords: [] });
    vi.spyOn(TaskRepository, 'getBlockTasks').mockResolvedValue([]);
    vi.stubGlobal('requestAnimationFrame', vi.fn());
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('localStorage', { getItem: vi.fn().mockReturnValue(null), setItem: vi.fn() });
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function mountCached(view: Component, data: Task[]) {
    const Host = defineComponent({
      props: { active: Boolean, tasks: { type: Array as PropType<Task[]>, required: true } },
      setup: props => () => h(KeepAlive, {}, () => props.active ? h(view, { tasks: props.tasks }) : h('div'))
    });
    wrapper = shallowMount(Host, {
      props: { active: true, tasks: data },
      global: { stubs: { KeepAlive: false, TableView: false, GanttView: false } }
    });
    return wrapper;
  }

  it('retains a 6501-task table with a bounded number of rendered rows', async () => {
    mountCached(TableView, tasks(6501));
    await flushPromises();
    const instance = wrapper!.findComponent(TableView).vm.$.uid;
    const renderedRows = wrapper!.findAll('tbody tr.task-row');
    expect(renderedRows.length).toBeGreaterThan(0);
    expect(renderedRows.length).toBeLessThan(100);
    await wrapper!.setProps({ active: false });
    await wrapper!.setProps({ active: true });
    await flushPromises();
    expect(wrapper!.findComponent(TableView).vm.$.uid).toBe(instance);
    expect(wrapper!.findAll('tbody tr.task-row')).toHaveLength(renderedRows.length);
    await wrapper!.setProps({ active: false });
    await wrapper!.setProps({ tasks: tasks(1) });
    await wrapper!.setProps({ active: true });
    await flushPromises();
    expect(wrapper!.findComponent(TableView).props('tasks')).toHaveLength(1);
  });

  it('retains Gantt data without repeating hydration and pauses its clock while hidden', async () => {
    const timer = vi.spyOn(window, 'setInterval');
    const clearTimer = vi.spyOn(window, 'clearInterval');
    mountCached(GanttView, tasks(3));
    await flushPromises();
    const instance = wrapper!.findComponent(GanttView).vm.$.uid;
    expect(TaskRepository.getBlockTasks).toHaveBeenCalledTimes(1);
    expect(TaskRepository.getBlockTasks).toHaveBeenCalledWith(true, undefined,
      { useLiveDom: false, detailLevel: 'full' });
    expect(timer).toHaveBeenCalledTimes(1);
    await wrapper!.setProps({ active: false });
    expect(clearTimer).toHaveBeenCalledTimes(1);
    await wrapper!.setProps({ active: true });
    await flushPromises();
    expect(wrapper!.findComponent(GanttView).vm.$.uid).toBe(instance);
    expect(TaskRepository.getBlockTasks).toHaveBeenCalledTimes(1);
    expect(timer).toHaveBeenCalledTimes(2);
  });
});
