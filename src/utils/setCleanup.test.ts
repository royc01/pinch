import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPeriodicSetCleanup } from './setCleanup';

afterEach(() => {
  vi.useRealTimers();
});

describe('periodic set cleanup', () => {
  it('clears values on its configured interval and stops cleanly', () => {
    vi.useFakeTimers();
    const values = new Set(['first']);
    const cleanup = createPeriodicSetCleanup(values, 100);

    cleanup.start();
    vi.advanceTimersByTime(99);
    expect(values).toEqual(new Set(['first']));

    vi.advanceTimersByTime(1);
    expect(values.size).toBe(0);

    values.add('second');
    cleanup.stop();
    vi.advanceTimersByTime(100);
    expect(values).toEqual(new Set(['second']));
  });
});
