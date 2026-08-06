export function createPeriodicSetCleanup<T>(
  values: Set<T>,
  intervalMs: number = 60000
): { start: () => void; stop: () => void } {
  let timer: number | null = null;

  const stop = (): void => {
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  };

  const start = (): void => {
    stop();
    timer = window.setInterval(() => {
      if (values.size > 0) {
        values.clear();
      }
    }, intervalMs);
  };

  return { start, stop };
}
