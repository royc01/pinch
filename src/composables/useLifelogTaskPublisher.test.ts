import { afterEach, describe, expect, it, vi } from 'vitest';
import { computed, effectScope, nextTick, reactive, ref, type EffectScope } from 'vue';
import type { Task } from '@/api';
import { eventBus, Events } from '@/utils/eventBus';
import { getLifelogTaskSnapshot, patchLifelogTaskSnapshotByBlockId, publishLifelogTaskSnapshot } from '@/utils/lifelogTaskSnapshot';
import { useLifelogTaskPublisher } from './useLifelogTaskPublisher';

const makeTask = (id: string): Task => ({ id, blockId: id, type: 'block', title: id, status: 'pending', priority: 'none', tags: [], createdAt: '', updatedAt: '' });
async function settle() { await nextTick(); await Promise.resolve(); }

describe('calendar log publisher', () => {
  let scope: EffectScope | undefined;
  afterEach(() => { scope?.stop(); scope = undefined; eventBus.clear(); publishLifelogTaskSnapshot([]); });
  function start(source: () => Task[], active: () => boolean = () => true) {
    const published = vi.fn();
    eventBus.on(Events.LIFELOG_TASKS_UPDATED, published);
    scope = effectScope();
    scope.run(() => useLifelogTaskPublisher(source, active));
    return published;
  }

  it('coalesces edits to one event and does not read unrelated live tasks in a 6501-task collection', async () => {
    const untouchedTitle = vi.fn(() => 'untouched');
    const tasks = ref(Array.from({ length: 6501 }, (_, index) => makeTask(String(index))));
    Object.defineProperty(tasks.value[0], 'title', { configurable: true, enumerable: true, get: untouchedTitle });
    const published = start(() => tasks.value);
    await settle();
    expect(published).toHaveBeenCalledOnce();
    published.mockClear();
    untouchedTitle.mockClear();
    tasks.value[3000].title = 'edited';
    tasks.value[3000].status = 'completed';
    tasks.value[3000].completedAt = '2026-10-07T10:00:00';
    await settle();
    expect(published).toHaveBeenCalledOnce();
    expect(untouchedTitle).not.toHaveBeenCalled();
    expect(getLifelogTaskSnapshot()[3000]).toMatchObject({ title: 'edited', status: 'completed' });
  });

  it('publishes one field update when a filter recomputes the same task membership', async () => {
    const tasks = reactive([makeTask('a'), makeTask('b')]);
    const filtered = computed(() => tasks.filter(task => Boolean(task.title)));
    const published = start(() => filtered.value);
    await settle();
    published.mockClear();
    tasks[0].title = 'renamed';
    await settle();
    expect(published).toHaveBeenCalledOnce();
    expect(getLifelogTaskSnapshot()[0].title).toBe('renamed');
    tasks[0].title = '';
    await settle();
    expect(getLifelogTaskSnapshot().map(task => task.id)).toEqual(['b']);
  });

  it('tracks tag mutations and replacements, handles deletions, and supports block status patches', async () => {
    const tasks = ref([makeTask('a'), makeTask('b')]);
    const published = start(() => tasks.value);
    await settle();
    published.mockClear();
    tasks.value[0].tags.push('changed');
    await settle();
    expect(published).toHaveBeenCalledOnce();
    expect(getLifelogTaskSnapshot()[0].tags).toEqual(['changed']);
    expect(patchLifelogTaskSnapshotByBlockId('b', true, '2026-10-07')).toBe(true);
    tasks.value[0].title = 'new title';
    await settle();
    expect(getLifelogTaskSnapshot()[1].status).toBe('completed');
    tasks.value = [{ ...makeTask('c'), title: 'replacement' }];
    await settle();
    expect(getLifelogTaskSnapshot().map(task => task.id)).toEqual(['c']);
    tasks.value[0].title = 'changed replacement';
    await settle();
    expect(getLifelogTaskSnapshot()[0].title).toBe('changed replacement');
  });

  it('stops publishing while hidden and after disposal, then refreshes the snapshot on return', async () => {
    const tasks = ref([makeTask('a')]), active = ref(true);
    const published = start(() => tasks.value, () => active.value);
    await settle();
    active.value = false;
    await settle();
    published.mockClear();
    tasks.value[0].title = 'hidden update';
    tasks.value.push(makeTask('b'));
    await settle();
    expect(published).not.toHaveBeenCalled();
    active.value = true;
    await settle();
    expect(published).toHaveBeenCalledOnce();
    expect(getLifelogTaskSnapshot().map(task => task.title)).toEqual(['hidden update', 'b']);
    scope!.stop();
    published.mockClear();
    tasks.value[0].status = 'completed';
    await settle();
    expect(published).not.toHaveBeenCalled();
  });

  it('clears an old owner snapshot when an empty calendar becomes active', async () => {
    publishLifelogTaskSnapshot([makeTask('old-owner')]);
    const active = ref(false);
    const published = start(() => [], () => active.value);
    await settle();
    expect(published).not.toHaveBeenCalled();
    active.value = true;
    await settle();
    expect(published).toHaveBeenCalledOnce();
    expect(getLifelogTaskSnapshot()).toEqual([]);
  });
});
