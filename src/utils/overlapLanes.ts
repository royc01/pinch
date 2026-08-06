export interface OverlapLaneAssignment {
  laneIndex: number;
  laneCount: number;
}

export function assignOverlapLanes<T extends object>(
  items: T[],
  getStart: (item: T) => number,
  getEnd: (item: T, start: number) => number,
  compareItems?: (left: T, right: T) => number
): Array<T & OverlapLaneAssignment> {
  if (items.length <= 1) {
    return items.map(item => ({ ...item, laneIndex: 0, laneCount: 1 }));
  }

  const normalized = items
    .map((item) => {
      const start = getStart(item);
      return { item, start, end: getEnd(item, start) };
    })
    .sort((left, right) => {
      if (left.start !== right.start) return left.start - right.start;
      if (left.end !== right.end) return left.end - right.end;
      return compareItems?.(left.item, right.item) || 0;
    });

  const result: Array<T & OverlapLaneAssignment> = [];
  let cluster: typeof normalized = [];
  let clusterEnd = -1;

  const flushCluster = () => {
    if (cluster.length === 0) return;

    const laneEnds: number[] = [];
    const assigned: Array<{ item: T; laneIndex: number }> = [];
    for (const entry of cluster) {
      let laneIndex = laneEnds.findIndex(end => end <= entry.start);
      if (laneIndex === -1) {
        laneIndex = laneEnds.length;
        laneEnds.push(entry.end);
      } else {
        laneEnds[laneIndex] = entry.end;
      }
      assigned.push({ item: entry.item, laneIndex });
    }

    const laneCount = Math.max(1, laneEnds.length);
    for (const { item, laneIndex } of assigned) {
      result.push({ ...item, laneIndex, laneCount });
    }
  };

  for (const entry of normalized) {
    if (cluster.length === 0 || entry.start < clusterEnd) {
      cluster.push(entry);
      clusterEnd = Math.max(clusterEnd, entry.end);
      continue;
    }
    flushCluster();
    cluster = [entry];
    clusterEnd = entry.end;
  }

  flushCluster();
  return result;
}
