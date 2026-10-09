import { describe, expect, it } from 'vitest';
import { assignCalendarTaskPositions } from './calendarTaskPositions';

type Range = { id: string; start: number; end: number };
function positions(ranges: Range[]) {
  return assignCalendarTaskPositions(ranges, range => range.id, range => range.start, range => range.end);
}

function referencePositions(ranges: Range[]) {
  const slots = new Map<number, Set<number>>();
  const result = new Map<string, number>();
  for (const range of ranges) {
    let row = 0;
    while (Array.from({ length: range.end - range.start + 1 }, (_, index) => range.start + index)
      .some(day => slots.get(day)?.has(row))) row++;
    for (let day = range.start; day <= range.end; day++) {
      if (!slots.has(day)) slots.set(day, new Set());
      slots.get(day)!.add(row);
    }
    result.set(range.id, row);
  }
  return result;
}

describe('calendar task positions', () => {
  it('matches the existing lowest-free-row order across overlapping inclusive day ranges', () => {
    for (let seed = 0; seed < 40; seed++) {
      const ranges = Array.from({ length: 60 }, (_, index) => {
        const start = (index * 17 + seed * 3) % 42;
        return { id: `${index}`, start, end: start + (index * 7 + seed) % 10 };
      }).sort((a, b) => a.start - b.start || b.end - a.end);
      expect(positions(ranges)).toEqual(referencePositions(ranges));
    }
  });

  it('keeps same-day tasks apart and reuses the lowest freed row on later days', () => {
    expect([...positions([
      { id: 'long', start: 0, end: 3 }, { id: 'short', start: 0, end: 1 },
      { id: 'shared-end', start: 1, end: 1 }, { id: 'next', start: 2, end: 4 },
      { id: 'last', start: 4, end: 4 }
    ]).values()]).toEqual([0, 1, 2, 1, 0]);
  });

  it('assigns 6501 fully overlapping tasks without scanning each occupied row', () => {
    const ranges = Array.from({ length: 6501 }, (_, index) => ({ id: `${index}`, start: 0, end: 41 }));
    expect([...positions(ranges).values()]).toEqual(ranges.map((_, index) => index));
  });
});
