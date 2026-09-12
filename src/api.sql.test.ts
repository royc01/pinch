import { afterEach, describe, expect, it, vi } from 'vitest';
import * as siyuan from 'siyuan';
import { sql } from './api';

async function flushSqlQueue(): Promise<void> {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve();
  }
}

describe('SQL request scheduling', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('merges matching statements and runs distinct statements one at a time', async () => {
    const callbacks = new Map<string, (response: unknown) => void>();
    const fetchPost = vi.spyOn(siyuan, 'fetchPost').mockImplementation((url, data, callback) => {
      expect(url).toBe('/api/query/sql');
      callbacks.set((data as { stmt: string }).stmt, callback as (response: unknown) => void);
    });

    const first = sql('SELECT first');
    const duplicate = sql('SELECT first');
    const second = sql('SELECT second');
    await flushSqlQueue();

    expect(first).toBe(duplicate);
    expect(fetchPost).toHaveBeenCalledTimes(1);
    expect(callbacks.has('SELECT first')).toBe(true);

    callbacks.get('SELECT first')?.({ code: 0, data: ['first'] });
    await flushSqlQueue();

    expect(fetchPost).toHaveBeenCalledTimes(2);
    expect(callbacks.has('SELECT second')).toBe(true);
    callbacks.get('SELECT second')?.({ code: 0, data: ['second'] });

    await expect(first).resolves.toEqual(['first']);
    await expect(second).resolves.toEqual(['second']);
  });
});
