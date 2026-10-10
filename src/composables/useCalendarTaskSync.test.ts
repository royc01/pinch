import { afterEach, describe, expect, it, vi } from 'vitest';
import { computed, effectScope, nextTick, ref, type EffectScope } from 'vue';
import type { Task } from '@/api';
import { useCalendarTaskSync } from './useCalendarTaskSync';
import type { useTaskSyncGuard } from './useTaskSyncGuard';

const makeTask = (id: string): Task => ({ id, blockId: id, type: 'block', title: id, status: 'pending', priority: 'none', tags: [],
  startDate: '2026-10-07', dueDate: '2026-10-07', createdAt: '', updatedAt: '' });
async function settle() { await nextTick(); await Promise.resolve(); }

describe('incremental calendar synchronization', () => {
  let scope: EffectScope | undefined;
  afterEach(() => { scope?.stop(); scope = undefined; });
  function start(source: () => Task[]) {
    const dragging = ref(false);
    const guard = { syncTasks: vi.fn(), syncTaskChanges: vi.fn() };
    scope = effectScope();
    scope.run(() => useCalendarTaskSync(source, dragging, guard as unknown as ReturnType<typeof useTaskSyncGuard>));
    return { dragging, guard };
  }

  it('only synchronizes the moved task when a 6501-task schedule filter recomputes the same members', async () => {
    const tasks = ref(Array.from({ length: 6501 }, (_, index) => makeTask(String(index))));
    const scheduled = computed(() => tasks.value.filter(task => task.startDate || task.dueDate));
    const { guard } = start(() => scheduled.value);
    await settle();
    expect(guard.syncTasks).toHaveBeenCalledOnce();
    guard.syncTasks.mockClear();
    tasks.value[3000].startDate = '2026-10-08';
    tasks.value[3000].dueDate = '2026-10-08';
    tasks.value[3000].title = 'edited';
    await settle();
    expect(guard.syncTasks).not.toHaveBeenCalled();
    expect(guard.syncTaskChanges).toHaveBeenCalledOnce();
    expect(guard.syncTaskChanges).toHaveBeenCalledWith([tasks.value[3000]]);
  });

  it('defers edits and membership changes during a drag and reconciles the latest collection afterwards', async () => {
    const tasks = ref([makeTask('a'), makeTask('b')]);
    const { dragging, guard } = start(() => tasks.value);
    await settle();
    guard.syncTasks.mockClear();
    dragging.value = true;
    tasks.value[0].startDate = '2026-10-09';
    await settle();
    tasks.value.splice(1, 1, makeTask('c'));
    await settle();
    expect(guard.syncTasks).not.toHaveBeenCalled();
    expect(guard.syncTaskChanges).not.toHaveBeenCalled();
    dragging.value = false;
    await settle();
    expect(guard.syncTasks).toHaveBeenCalledOnce();
    expect(guard.syncTasks.mock.calls[0][0]).toEqual(tasks.value);
    expect(guard.syncTaskChanges).not.toHaveBeenCalled();
  });

  it('removes filtered tasks and stops synchronization after disposal', async () => {
    const tasks = ref([makeTask('a')]);
    const scheduled = computed(() => tasks.value.filter(task => task.startDate || task.dueDate));
    const { guard } = start(() => scheduled.value);
    await settle();
    guard.syncTasks.mockClear();
    tasks.value[0].startDate = '';
    tasks.value[0].dueDate = '';
    await settle();
    expect(guard.syncTasks).toHaveBeenCalledOnce();
    expect(guard.syncTasks.mock.calls[0][0]).toEqual([]);
    scope!.stop();
    guard.syncTasks.mockClear();
    tasks.value.push(makeTask('new'));
    await settle();
    expect(guard.syncTasks).not.toHaveBeenCalled();
  });
});
