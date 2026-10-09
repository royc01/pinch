import { describe, expect, it } from 'vitest';
import { assignOverlapLanes } from './overlapLanes';

interface TimelineItem {
  id: string;
  start: number;
  end: number;
}

describe('overlap lane assignment', () => {
  it('shares a lane for adjacent events and separates overlapping events', () => {
    const assigned = assignOverlapLanes<TimelineItem>(
      [
        { id: 'second', start: 10, end: 20 },
        { id: 'first', start: 0, end: 10 },
        { id: 'overlap', start: 5, end: 15 }
      ],
      item => item.start,
      item => item.end
    );

    expect(assigned).toEqual([
      { id: 'first', start: 0, end: 10, laneIndex: 0, laneCount: 2 },
      { id: 'overlap', start: 5, end: 15, laneIndex: 1, laneCount: 2 },
      { id: 'second', start: 10, end: 20, laneIndex: 0, laneCount: 2 }
    ]);
  });

  it('starts a new cluster when events only touch at their boundaries', () => {
    const assigned = assignOverlapLanes<TimelineItem>(
      [
        { id: 'first', start: 0, end: 10 },
        { id: 'second', start: 10, end: 20 }
      ],
      item => item.start,
      item => item.end
    );

    expect(assigned).toEqual([
      { id: 'first', start: 0, end: 10, laneIndex: 0, laneCount: 1 },
      { id: 'second', start: 10, end: 20, laneIndex: 0, laneCount: 1 }
    ]);
  });

  it('retains the lowest free lane and cluster widths for varied intervals', () => {
    const input = Array.from({ length: 400 }, (_, index) => ({ id: `${index}`, start: index * 17 % 120, end: index * 17 % 120 + index % 12 + 1 }))
      .sort((a, b) => a.start - b.start || a.end - b.end);
    const expected: Array<TimelineItem & { laneIndex: number; laneCount: number }> = [];
    let cluster: TimelineItem[] = [];
    let end = -Infinity;
    const flush = () => {
      const laneEnds: number[] = [];
      const assigned = cluster.map(item => {
        let laneIndex = laneEnds.findIndex(end => end <= item.start);
        if (laneIndex < 0) laneIndex = laneEnds.length;
        laneEnds[laneIndex] = item.end;
        return { ...item, laneIndex };
      });
      expected.push(...assigned.map(item => ({ ...item, laneCount: laneEnds.length })));
    };
    for (const item of input) {
      if (cluster.length && item.start >= end) { flush(); cluster = []; }
      cluster.push(item);
      end = Math.max(end, item.end);
    }
    flush();
    expect(assignOverlapLanes(input, item => item.start, item => item.end)).toEqual(expected);
  });

  it('allocates 6501 simultaneous timed items with a shared cluster width', () => {
    const input = Array.from({ length: 6501 }, (_, index) => ({ id: `${index}`, start: 600, end: 660 }));
    const assigned = assignOverlapLanes(input, item => item.start, item => item.end);
    expect(assigned.map(item => item.laneIndex)).toEqual(input.map((_, index) => index));
    expect(assigned.every(item => item.laneCount === 6501)).toBe(true);
  });
});
