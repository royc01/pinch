import { computed, type ComputedRef } from 'vue';

/** Keep height indexing independent of scrolling and unrelated view renders. */
export function useTaskHeightOffsets<T>(getHeight: (task: T) => number, gap = 0) {
  const cache = new WeakMap<readonly T[], ComputedRef<number[]>>();

  return (tasks: readonly T[]): number[] => {
    let offsets = cache.get(tasks);
    if (!offsets) {
      offsets = computed(() => {
        const result = new Array<number>(tasks.length + 1);
        result[0] = 0;
        for (let index = 0; index < tasks.length; index += 1) {
          result[index + 1] = result[index] + getHeight(tasks[index])
            + (index < tasks.length - 1 ? gap : 0);
        }
        return result;
      });
      cache.set(tasks, offsets);
    }
    return offsets.value;
  };
}
