import { describe, expect, it, vi } from 'vitest';
import { createCalendarRangeCache } from './calendarRangeCache';

const month = { startDate: '2026-10-01', endDate: '2026-10-31' };
const week = { startDate: '2026-10-05', endDate: '2026-10-11' };
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }

describe('calendar log range cache', () => {
  it('reuses a covering month for weeks without narrowing records to their instance dates', async () => {
    const records = [{ id: 'repeat', repeatInstanceDate: '2026-09-30', completedAt: '2026-10-07T12:00:00' }];
    const fetch = vi.fn().mockResolvedValue(records);
    const cache = createCalendarRangeCache(fetch);
    expect(await cache.load(month)).toBe(records);
    expect(await cache.load(week)).toBe(records);
    expect(fetch).toHaveBeenCalledOnce();
    await cache.load({ startDate: '2026-09-28', endDate: '2026-10-04' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('shares concurrent covering requests and simultaneous forced reloads', async () => {
    const read = deferred<number>();
    const fetch = vi.fn(() => read.promise);
    const cache = createCalendarRangeCache(fetch);
    const first = cache.load(month, true);
    expect(cache.load(week, true)).toBe(first);
    expect(cache.load(week)).toBe(first);
    await Promise.resolve();
    expect(fetch).toHaveBeenCalledOnce();
    read.resolve(1);
    expect(await first).toBe(1);
  });

  it('ignores an old request after force refresh', async () => {
    const oldRead = deferred<number>(), freshRead = deferred<number>();
    const fetch = vi.fn().mockReturnValueOnce(oldRead.promise).mockReturnValueOnce(freshRead.promise);
    const cache = createCalendarRangeCache<number>(fetch);
    const old = cache.load(month);
    const fresh = cache.load(month, true);
    freshRead.resolve(2);
    await fresh;
    oldRead.resolve(1);
    await old;
    expect(await cache.load(week)).toBe(2);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('does not merge a new mutation with a request started before invalidation', async () => {
    const oldRead = deferred<number>(), freshRead = deferred<number>();
    const fetch = vi.fn().mockReturnValueOnce(oldRead.promise).mockReturnValueOnce(freshRead.promise);
    const cache = createCalendarRangeCache<number>(fetch);
    const old = cache.load(month, true);
    cache.clear();
    const fresh = cache.load(month, true);
    expect(fresh).not.toBe(old);
    oldRead.resolve(1);
    await old;
    expect(cache.load(week)).toBe(fresh);
    freshRead.resolve(2);
    await fresh;
    expect(await cache.load(month)).toBe(2);
  });

  it('retries failed reads and replaces covered small ranges with a larger result', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    const cache = createCalendarRangeCache<number>(fetch);
    await expect(cache.load(week)).rejects.toThrow('offline');
    expect(await cache.load(week)).toBe(1);
    expect(await cache.load(month)).toBe(2);
    expect(await cache.load(week)).toBe(2);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('bounds cached windows and leaves the caller date window untouched', async () => {
    const fetch = vi.fn().mockResolvedValue(1);
    const cache = createCalendarRangeCache<number>(fetch);
    for (let day = 1; day <= 5; day++) {
      const date = `2026-10-0${day}`;
      await cache.load({ startDate: date, endDate: date });
    }
    await cache.load({ startDate: '2026-10-01', endDate: '2026-10-01' });
    expect(fetch).toHaveBeenCalledTimes(6);
    const requested = { ...month };
    const pending = cache.load(requested);
    requested.startDate = 'changed by caller';
    await pending;
    expect(fetch.mock.calls.at(-1)![0]).toEqual(month);
  });
});
