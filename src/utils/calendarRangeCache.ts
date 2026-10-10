export interface CalendarDateWindow { startDate: string; endDate: string }
function covers(available: CalendarDateWindow, requested: CalendarDateWindow): boolean {
  return available.startDate <= requested.startDate && available.endDate >= requested.endDate;
}

/** Reuse covered dates and share pending reads within one calendar owner. */
export function createCalendarRangeCache<T>(fetch: (range: CalendarDateWindow, force: boolean) => Promise<T>) {
  let generation = 0;
  const cached: Array<{ range: CalendarDateWindow; value: T }> = [];
  const pending = new Set<{ range: CalendarDateWindow; generation: number; force: boolean; promise: Promise<T> }>();

  function clear(): void { generation++; cached.length = 0; }
  function load(requested: CalendarDateWindow, force = false): Promise<T> {
    const range = { ...requested };
    if (force) {
      const existingForce = [...pending].find(entry => entry.generation === generation && entry.force && covers(entry.range, range));
      if (existingForce) return existingForce.promise;
      clear();
    } else {
      const hit = cached.find(entry => covers(entry.range, range));
      if (hit) return Promise.resolve(hit.value);
    }
    const existing = [...pending].find(entry => entry.generation === generation && covers(entry.range, range));
    if (existing) return existing.promise;
    const entry = { range, generation, force, promise: undefined as unknown as Promise<T> };
    entry.promise = Promise.resolve().then(() => fetch(range, force)).then(value => {
      if (entry.generation === generation) {
        for (let index = cached.length - 1; index >= 0; index--) {
          if (covers(range, cached[index].range)) cached.splice(index, 1);
        }
        cached.unshift({ range, value });
        if (cached.length > 4) cached.pop();
      }
      return value;
    }).finally(() => pending.delete(entry));
    pending.add(entry);
    return entry.promise;
  }
  return { load, clear };
}
