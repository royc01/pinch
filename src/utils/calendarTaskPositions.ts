export class MinHeap<T> {
  private items: T[] = [];

  constructor(private compare: (left: T, right: T) => number) {}

  peek(): T | undefined { return this.items[0]; }

  push(value: T): void {
    let index = this.items.push(value) - 1;
    while (index > 0) {
      const parent = (index - 1) >>> 1;
      if (this.compare(this.items[parent], value) <= 0) break;
      this.items[index] = this.items[parent];
      index = parent;
    }
    this.items[index] = value;
  }

  pop(): T | undefined {
    const first = this.items[0];
    const last = this.items.pop();
    if (this.items.length && last !== undefined) {
      let index = 0;
      while (index * 2 + 1 < this.items.length) {
        let child = index * 2 + 1;
        if (child + 1 < this.items.length && this.compare(this.items[child + 1], this.items[child]) < 0) child++;
        if (this.compare(last, this.items[child]) <= 0) break;
        this.items[index] = this.items[child];
        index = child;
      }
      this.items[index] = last;
    }
    return first;
  }
}

/** Assign the lowest free row to each interval, in ascending start order.
 * Endpoints are inclusive: tasks sharing a calendar day cannot share a row.
 */
export function assignCalendarTaskPositions<T>(
  sortedItems: readonly T[],
  getId: (item: T) => string,
  getStart: (item: T) => number,
  getEnd: (item: T) => number
): Map<string, number> {
  const active = new MinHeap<{ end: number; position: number }>((a, b) => a.end - b.end);
  const available = new MinHeap<number>((a, b) => a - b);
  const positions = new Map<string, number>();
  let rowCount = 0;
  for (const item of sortedItems) {
    const start = getStart(item);
    while (active.peek() && active.peek()!.end < start) {
      available.push(active.pop()!.position);
    }
    const position = available.pop() ?? rowCount++;
    positions.set(getId(item), position);
    active.push({ end: getEnd(item), position });
  }
  return positions;
}
