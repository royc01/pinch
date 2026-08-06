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
});
