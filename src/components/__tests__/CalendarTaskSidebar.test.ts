import { flushPromises, shallowMount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive, nextTick } from 'vue';
import type { Task } from '@/api';
import * as titleUtils from '@/composables/useTaskCommon';

vi.mock('@/main', () => ({ usePlugin: () => null }));
const { default: CalendarTaskSidebar } = await import('../CalendarTaskSidebar.vue');

function makeTasks(count: number): Task[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `task-${index}`, blockId: `block-${index}`, rootId: 'doc', notebookId: 'nb',
    hPath: '/Tasks', type: 'block', title: `Task ${String(index).padStart(5, '0')}`,
    status: 'pending', priority: 'none', tags: [],
    createdAt: '2026-10-01T12:00:00', updatedAt: '2026-10-01T12:00:00'
  }));
}

describe('large calendar sidebar', () => {
  let wrapper: VueWrapper | undefined;
  const frames = new Map<number, FrameRequestCallback>();
  let frameId = 0;

  beforeEach(() => {
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
  });

  function mountSidebar(tasks: Task[]) {
    wrapper = shallowMount(CalendarTaskSidebar, { props: { tasks, notebooks: [{ id: 'nb', name: 'Notebook' }] } });
    return wrapper;
  }

  async function scroll(top: number) {
    const list = wrapper!.find('.calendar-task-sidebar-list');
    (list.element as HTMLElement).scrollTop = top;
    await list.trigger('scroll');
  }

  it('bounds the DOM for 6501 tasks, reaches the middle and end, and keeps task actions', async () => {
    mountSidebar(makeTasks(6501));
    await flushPromises();
    const buttons = () => wrapper!.findAll('.calendar-task-sidebar-task');
    await vi.waitFor(() => expect(buttons().length).toBeGreaterThan(0), { timeout: 15000 });
    expect(buttons().length).toBeGreaterThan(0);
    expect(buttons().length).toBeLessThan(80);
    expect(wrapper!.find('.calendar-task-sidebar-notebook-header').text()).toContain('6501');
    await scroll(3000 * 28 + 58);
    expect(buttons().length).toBeLessThan(80);
    const middle = buttons().find(button => button.attributes('aria-label') === 'Task 03000')!;
    expect(middle).toBeDefined();
    await middle.trigger('click', { clientX: 10, clientY: 20 });
    expect((wrapper!.emitted('task-edit')!.at(-1)![0] as Task).id).toBe('task-3000');
    await middle.find('.calendar-task-sidebar-task-checkbox').trigger('click');
    expect((wrapper!.emitted('task-toggle')!.at(-1)![0] as Task).id).toBe('task-3000');
    await middle.trigger('pointerdown', { button: 0, pointerId: 1, clientX: 10, clientY: 20 });
    document.dispatchEvent(Object.assign(new Event('pointermove'), { pointerId: 1, clientX: 30, clientY: 40 }));
    expect(wrapper!.emitted('calendar-task-drag-start')).toHaveLength(1);
    await scroll(6501 * 28);
    document.dispatchEvent(Object.assign(new Event('pointerup'), { pointerId: 1, clientX: 50, clientY: 60 }));
    expect((wrapper!.emitted('calendar-task-drag-end')![0][0] as { task: Task }).task.id).toBe('task-3000');
    expect(buttons().length).toBeLessThan(80);
    expect(buttons().at(-1)!.attributes('aria-label')).toBe('Task 06500');
  }, 15000);

  it('keeps collapsed groups and finds tasks outside the current viewport', async () => {
    mountSidebar(makeTasks(6501));
    await vi.waitFor(() => expect(wrapper!.findAll('.calendar-task-sidebar-task').length).toBeGreaterThan(0), { timeout: 15000 });
    await wrapper!.find('.calendar-task-sidebar-document-header').trigger('click');
    expect(wrapper!.findAll('.calendar-task-sidebar-task')).toHaveLength(0);
    await wrapper!.find('.calendar-task-sidebar-document-header').trigger('click');
    await scroll(50000);
    await wrapper!.find('input[type="search"]').setValue('Task 06500');
    expect(wrapper!.findAll('.calendar-task-sidebar-task')).toHaveLength(1);
    expect(wrapper!.find('.calendar-task-sidebar-task').attributes('aria-label')).toBe('Task 06500');
    expect(localStorage.setItem).toHaveBeenCalledTimes(2);
  }, 15000);

  it('responds to in-place completion and title changes without losing task grouping', async () => {
    const tasks = reactive(makeTasks(3));
    mountSidebar(tasks);
    tasks[0].status = 'completed';
    tasks[1].title = '<strong>Renamed task</strong>';
    await nextTick();
    expect(wrapper!.findAll('.calendar-task-sidebar-task')).toHaveLength(2);
    expect(wrapper!.findAll('.calendar-task-sidebar-task').map(button => button.attributes('aria-label'))).toContain('Renamed task');
    await wrapper!.find('.calendar-task-sidebar-completed-toggle').trigger('click');
    expect(wrapper!.findAll('.calendar-task-sidebar-task')).toHaveLength(3);
  });

  it('coalesces viewport reads and cancels measurement when unmounted', () => {
    mountSidebar(makeTasks(3));
    const list = wrapper!.find('.calendar-task-sidebar-list').element as HTMLElement;
    const height = vi.fn(() => 300);
    Object.defineProperty(list, 'clientHeight', { get: height });
    expect(height).not.toHaveBeenCalled();
    const [id, callback] = [...frames][0];
    frames.delete(id);
    callback(0);
    expect(height).toHaveBeenCalledOnce();
    wrapper!.unmount();
    wrapper = undefined;
    expect(frames.size).toBe(0);
  });

  it('reuses grouping and sorting through search, completion and scheduling filters', async () => {
    const tasks = reactive(makeTasks(20));
    const compare = vi.spyOn(String.prototype, 'localeCompare');
    mountSidebar(tasks);
    await flushPromises();
    expect(compare).toHaveBeenCalled();
    compare.mockClear();
    const search = wrapper!.find('input[type="search"]');
    await search.setValue('Task 00019');
    expect(wrapper!.findAll('.calendar-task-sidebar-task')).toHaveLength(1);
    await search.setValue('Task 000');
    tasks[0].status = 'completed';
    await nextTick();
    await wrapper!.find('.calendar-task-sidebar-completed-toggle').trigger('click');
    await wrapper!.find('.calendar-task-sidebar-schedule-filter button:nth-child(2)').trigger('click');
    tasks[1].startDate = '2026-10-07';
    tasks[2].dueDate = '2026-10-08';
    await nextTick();
    expect(wrapper!.findAll('.calendar-task-sidebar-task')).toHaveLength(18);
    expect(compare).not.toHaveBeenCalled();
    tasks[1].startDate = '';
    await nextTick();
    expect(wrapper!.findAll('.calendar-task-sidebar-task')).toHaveLength(19);
    tasks[3].title = 'Renamed';
    await nextTick();
    expect(compare).toHaveBeenCalled();
    await search.setValue('Renamed');
    expect(wrapper!.find('.calendar-task-sidebar-task').attributes('aria-label')).toBe('Renamed');
  });

  it('cancels queued title preparation when hidden and publishes the latest task collection on return', async () => {
    vi.useFakeTimers();
    try {
      const title = vi.spyOn(titleUtils, 'getTaskDisplayTitle');
      mountSidebar(makeTasks(6501));
      expect(wrapper!.findAll('.calendar-task-sidebar-task')).toHaveLength(0);
      expect(title).not.toHaveBeenCalled();
      await wrapper!.setProps({ active: false });
      await vi.runAllTimersAsync();
      expect(title).not.toHaveBeenCalled();
      const replacement = makeTasks(2);
      replacement[0].title = 'Latest collection';
      await wrapper!.setProps({ tasks: replacement });
      expect(wrapper!.findAll('.calendar-task-sidebar-task')).toHaveLength(0);
      await wrapper!.setProps({ active: true });
      expect(wrapper!.findAll('.calendar-task-sidebar-task')).toHaveLength(2);
      expect(wrapper!.findAll('.calendar-task-sidebar-task').map(task => task.attributes('aria-label'))).toContain('Latest collection');
    } finally {
      vi.useRealTimers();
    }
  });
});
