type LayoutMeasurement = () => (() => void) | void;

const pending = new Map<LayoutMeasurement, number>();
const versions = new WeakMap<LayoutMeasurement, number>();
let frameId: number | null = null;

/** Read all queued geometry before applying any layout-affecting changes. */
function flush(): void {
  frameId = null;
  const measurements = [...pending];
  pending.clear();
  const writes: Array<() => void> = [];
  for (const [measure, version] of measurements) {
    if (versions.get(measure) !== version) continue;
    const apply = measure();
    if (apply) {
      writes.push(() => {
        if (versions.get(measure) === version) apply();
      });
    }
  }
  for (const write of writes) write();
}

export function scheduleLayoutMeasurement(measure: LayoutMeasurement): void {
  const version = (versions.get(measure) || 0) + 1;
  versions.set(measure, version);
  pending.set(measure, version);
  if (frameId === null) frameId = requestAnimationFrame(flush);
}

export function cancelLayoutMeasurement(measure: LayoutMeasurement): void {
  versions.set(measure, (versions.get(measure) || 0) + 1);
  pending.delete(measure);
  if (pending.size === 0 && frameId !== null) {
    cancelAnimationFrame(frameId);
    frameId = null;
  }
}
