import { describe, expect, it, vi } from 'vitest';
import { createCalendarDateBuckets, createIncrementalCalendarPositions } from './calendarIncrementalLayout';
import * as positions from './calendarTaskPositions';

interface Range { id: string; start: number; end: number; sortStart?: number; sortEnd?: number }
const options = { id: (item: Range) => item.id, start: (item: Range) => item.start, end: (item: Range) => item.end,
  sortStart: (item: Range) => item.sortStart ?? item.start, sortEnd: (item: Range) => item.sortEnd ?? item.end };
function fullLayout(items: Range[]) {
  const sorted = [...items].sort((a, b) => options.sortStart(a) - options.sortStart(b)
    || (options.sortEnd(b) - options.sortStart(b)) - (options.sortEnd(a) - options.sortStart(a)));
  return positions.assignCalendarTaskPositions(sorted, options.id, options.start, options.end);
}
function entries(map: Map<string, number>) { return [...map].sort(([a], [b]) => a.localeCompare(b)); }

describe('incremental calendar rows', () => {
  it('matches full layout through random moves, insertions, deletions, ties and clipping', () => {
    let seed = 173;
    const random = (max: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % max; };
    let nextId = 0;
    const makeRange = (): Range => { const start = random(100); return { id: String(nextId++), start, end: start + random(20) }; };
    const source = Array.from({ length: 70 }, makeRange);
    const update = createIncrementalCalendarPositions(options);
    for (let step = 0; step < 300; step++) {
      const index = random(source.length);
      if (step % 3 === 0) source.push(makeRange());
      else if (step % 3 === 1) source.splice(index, 1);
      else { const start = random(100); source[index] = { ...source[index], start, end: start + random(20) }; }
      if (step % 19 === 0) source.reverse();
      const items = source.filter(item => item.end >= 20 && item.start <= 80).map(item => ({ ...item,
        sortStart: item.start, sortEnd: item.end, start: Math.max(20, item.start), end: Math.min(80, item.end) }));
      expect(entries(update(items)), `mutation ${step}`).toEqual(entries(fullLayout(items)));
    }
  });

  it('only reflows the affected connected dates and returns the same map for field-only changes', () => {
    const assign = vi.spyOn(positions, 'assignCalendarTaskPositions');
    try {
      const update = createIncrementalCalendarPositions(options);
      const items = [{ id: 'a', start: 1, end: 2 }, { id: 'b', start: 2, end: 3 },
        { id: 'unrelated', start: 10, end: 10 }];
      const before = update(items);
      assign.mockClear();
      expect(update(items.map(item => ({ ...item, title: 'edited' })))).toBe(before);
      expect(assign).not.toHaveBeenCalled();
      items[1] = { ...items[1], end: 4 };
      const after = update(items);
      expect(after).not.toBe(before);
      expect(assign).toHaveBeenCalledOnce();
      expect(assign.mock.calls[0][0].map(item => (item as Range).id)).toEqual(['a', 'b']);
      expect(after.get('unrelated')).toBe(before.get('unrelated'));
    } finally { assign.mockRestore(); }
  });

  it('splits and merges cross-day groups without retaining deleted rows', () => {
    const update = createIncrementalCalendarPositions(options);
    const items = [{ id: 'left', start: 1, end: 2 }, { id: 'right', start: 5, end: 6 },
      { id: 'bridge', start: 2, end: 5 }];
    expect(entries(update(items))).toEqual(entries(fullLayout(items)));
    items.pop();
    expect(entries(update(items))).toEqual([['left', 0], ['right', 0]]);
    items.push({ id: 'new-bridge', start: 1, end: 6 });
    expect(entries(update(items))).toEqual(entries(fullLayout(items)));
    expect(update([]).size).toBe(0);
  });

  it('does not reflow later dates when an earlier task is deleted', () => {
    const assign = vi.spyOn(positions, 'assignCalendarTaskPositions');
    try {
      const update = createIncrementalCalendarPositions(options);
      const items = [{ id: 'early', start: 1, end: 1 }, { id: 'later', start: 10, end: 11 }];
      update(items);
      assign.mockClear();
      expect(update(items.slice(1)).get('later')).toBe(0);
      expect(assign).not.toHaveBeenCalled();
    } finally { assign.mockRestore(); }
  });
});

describe('date layout buckets', () => {
  it('retains unaffected days and evicts dates after navigation', () => {
    const update = createCalendarDateBuckets<{ id: string; time: number }>((a, b) => a.id === b.id && a.time === b.time);
    const layout = vi.fn(items => items.map(item => ({ ...item })));
    const source = new Map([['Monday', [{ id: 'a', time: 9 }]], ['Tuesday', [{ id: 'b', time: 10 }]]]);
    const initial = update(source, layout);
    source.set('Tuesday', [{ id: 'b', time: 11 }]);
    const changed = update(source, layout);
    expect(changed.get('Monday')).toBe(initial.get('Monday'));
    expect(changed.get('Tuesday')).not.toBe(initial.get('Tuesday'));
    expect(layout).toHaveBeenCalledTimes(3);
    update(new Map(), layout);
    expect(update(source, layout).get('Monday')).not.toBe(initial.get('Monday'));
  });

  it('reflows one date when its record overlay changes while task lanes stay the same', () => {
    const update = createCalendarDateBuckets<number>((a, b) => a === b);
    const source = new Map([['Monday', [1]], ['Tuesday', [2]]]);
    const overlays = new Map([['Monday', 0], ['Tuesday', 0]]);
    const layout = vi.fn((items: number[], date: string) => items.map(item => item + overlays.get(date)!));
    const initial = update(source, layout, date => overlays.get(date));
    overlays.set('Tuesday', 10);
    const next = update(source, layout, date => overlays.get(date));
    expect(next.get('Monday')).toBe(initial.get('Monday'));
    expect(next.get('Tuesday')).toEqual([12]);
    expect(layout).toHaveBeenCalledTimes(3);
  });
});
