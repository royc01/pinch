import { assignCalendarTaskPositions } from './calendarTaskPositions';

interface Interval {
  id: string;
  start: number;
  end: number;
  sortStart: number;
  sortEnd: number;
  order: number;
}
interface Group { start: number; end: number; items: Interval[] }

/** Reflow connected date intervals; disconnected dates keep their row assignments. */
export function createIncrementalCalendarPositions<T>(options: {
  id: (item: T) => string;
  start: (item: T) => number;
  end: (item: T) => number;
  sortStart?: (item: T) => number;
  sortEnd?: (item: T) => number;
}) {
  let previous = new Map<string, Interval>();
  let groups: Group[] = [];
  const groupById = new Map<string, Group>();
  const positions = new Map<string, number>();
  let result = new Map<string, number>();
  const compare = (a: Interval, b: Interval) => a.sortStart - b.sortStart
    || (b.sortEnd - b.sortStart) - (a.sortEnd - a.sortStart) || a.order - b.order;

  function split(items: Interval[]): Group[] {
    items.sort(compare);
    const splitGroups: Group[] = [];
    for (const item of items) {
      let group = splitGroups.at(-1);
      if (!group || item.start > group.end) {
        group = { start: item.start, end: item.end, items: [] };
        splitGroups.push(group);
      }
      group.items.push(item);
      group.end = Math.max(group.end, item.end);
    }
    return splitGroups;
  }
  function firstOverlap(start: number): number {
    let low = 0, high = groups.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (groups[mid].end < start) low = mid + 1;
      else high = mid;
    }
    return low;
  }
  function assign(group: Group): void {
    for (const [id, position] of assignCalendarTaskPositions(group.items, item => item.id, item => item.start, item => item.end)) {
      positions.set(id, position);
      groupById.set(id, group);
    }
  }

  return (items: readonly T[]): Map<string, number> => {
    const next = new Map<string, Interval>();
    const changed = new Set<string>();
    const tieOrder = new Map<string, number>();
    items.forEach(item => {
      const interval = { id: options.id(item), start: options.start(item), end: options.end(item),
        sortStart: options.sortStart?.(item) ?? options.start(item),
        sortEnd: options.sortEnd?.(item) ?? options.end(item), order: 0 };
      const tie = `${interval.sortStart}|${interval.sortEnd}`;
      interval.order = tieOrder.get(tie) || 0;
      tieOrder.set(tie, interval.order + 1);
      next.set(interval.id, interval);
      const old = previous.get(interval.id);
      if (!old || old.start !== interval.start || old.end !== interval.end
        || old.sortStart !== interval.sortStart || old.sortEnd !== interval.sortEnd || old.order !== interval.order) changed.add(interval.id);
    });
    for (const id of previous.keys()) if (!next.has(id)) changed.add(id);
    if (!changed.size) return result;

    const dirty = new Set<Group>();
    for (const id of changed) {
      const group = groupById.get(id);
      if (group) dirty.add(group);
      positions.delete(id);
      groupById.delete(id);
    }
    const pending: Interval[] = [];
    for (const group of dirty) {
      for (const item of group.items) if (!changed.has(item.id)) pending.push(next.get(item.id)!);
    }
    groups = groups.filter(group => !dirty.has(group));
    for (const id of changed) if (next.has(id)) pending.push(next.get(id)!);

    for (const candidate of split(pending)) {
      const index = firstOverlap(candidate.start);
      let endIndex = index;
      while (endIndex < groups.length && groups[endIndex].start <= candidate.end) {
        candidate.items.push(...groups[endIndex].items);
        candidate.start = Math.min(candidate.start, groups[endIndex].start);
        candidate.end = Math.max(candidate.end, groups[endIndex].end);
        endIndex++;
      }
      candidate.items.sort(compare);
      groups.splice(index, endIndex - index, candidate);
      assign(candidate);
    }
    previous = next;
    result = new Map(positions);
    return result;
  };
}

/** Each date owns its cached layout. Updating Tuesday leaves Monday's result intact. */
export function createCalendarDateBuckets<T>(same: (left: T, right: T) => boolean) {
  const cache = new Map<string, { inputs: readonly T[]; result: T[]; context: unknown }>();
  return (groups: Map<string, T[]>, layout: (items: T[], date: string) => T[], context?: (date: string) => unknown): Map<string, T[]> => {
    const result = new Map<string, T[]>();
    for (const [date, items] of groups) {
      const previous = cache.get(date);
      const dateContext = context?.(date);
      const unchanged = previous && previous.context === dateContext && previous.inputs.length === items.length
        && items.every((item, index) => same(item, previous.inputs[index]));
      const value = unchanged ? previous! : { inputs: items, result: layout(items, date), context: dateContext };
      cache.set(date, value);
      result.set(date, value.result);
    }
    for (const date of cache.keys()) if (!groups.has(date)) cache.delete(date);
    return result;
  };
}
