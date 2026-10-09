import { describe, expect, it, vi } from 'vitest';
import { reactive, ref } from 'vue';
import { useTaskHeightOffsets } from './useTaskHeightOffsets';

describe('useTaskHeightOffsets', () => {
  it('indexes 6501 cards once across repeated viewport reads', () => {
    const tasks = reactive(Array.from({ length: 6501 }, (_, id) => ({ id, height: 110 })));
    const height = vi.fn((task: typeof tasks[number]) => task.height);
    const getOffsets = useTaskHeightOffsets(height, 8);
    const offsets = getOffsets(tasks);
    expect(offsets.at(-1)).toBe(6501 * 110 + 6500 * 8);
    for (let index = 0; index < 40; index += 1) expect(getOffsets(tasks)).toBe(offsets);
    expect(height).toHaveBeenCalledTimes(6501);
  });

  it('recalculates after expansion, measurement, reorder and insertion', () => {
    const expanded = ref(new Set<number>());
    const measured = ref(new Map<number, number>());
    const tasks = reactive([{ id: 1 }, { id: 2 }]);
    const getOffsets = useTaskHeightOffsets((task: { id: number }) =>
      measured.value.get(task.id) ?? (expanded.value.has(task.id) ? 200 : 100), 8);
    expect(getOffsets(tasks)).toEqual([0, 108, 208]);
    expanded.value.add(1);
    expect(getOffsets(tasks)).toEqual([0, 208, 308]);
    measured.value.set(1, 240);
    expect(getOffsets(tasks)).toEqual([0, 248, 348]);
    tasks.reverse();
    expect(getOffsets(tasks)).toEqual([0, 108, 348]);
    tasks.push({ id: 3 });
    expect(getOffsets(tasks)).toEqual([0, 108, 356, 456]);
  });

  it('keeps separate task arrays and per-view height estimates isolated', () => {
    const tasks = [{ height: 100 }];
    const first = useTaskHeightOffsets((task: { height: number }) => task.height);
    const second = useTaskHeightOffsets((task: { height: number }) => task.height * 2);
    expect(first([])).toEqual([0]);
    expect(first(tasks)).toEqual([0, 100]);
    expect(second(tasks)).toEqual([0, 200]);
    expect(first([{ height: 300 }])).toEqual([0, 300]);
  });
});
