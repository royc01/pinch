import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cancelLayoutMeasurement, scheduleLayoutMeasurement } from './layoutMeasurement';

describe('layout measurements', () => {
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrame = 0;
  const jobs: Array<() => (() => void) | void> = [];

  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => frames.delete(id)));
  });

  afterEach(() => {
    jobs.forEach(cancelLayoutMeasurement);
    jobs.length = 0;
    frames.clear();
    vi.unstubAllGlobals();
  });

  function job(read: () => (() => void) | void) { jobs.push(read); return read; }
  function frame() {
    const [id, callback] = [...frames][0];
    frames.delete(id);
    callback(0);
  }

  it('coalesces repeated requests and performs every read before any write', () => {
    const order: string[] = [];
    const first = job(() => { order.push('read first'); return () => order.push('write first'); });
    const second = job(() => { order.push('read second'); return () => order.push('write second'); });
    for (let index = 0; index < 40; index += 1) scheduleLayoutMeasurement(first);
    scheduleLayoutMeasurement(second);
    expect(order).toEqual([]);
    expect(frames.size).toBe(1);
    frame();
    expect(order).toEqual(['read first', 'read second', 'write first', 'write second']);
  });

  it('cancels hidden or unmounted views before measuring them', () => {
    const read = job(vi.fn());
    scheduleLayoutMeasurement(read);
    cancelLayoutMeasurement(read);
    expect(frames.size).toBe(0);
    expect(read).not.toHaveBeenCalled();
  });

  it('cancels a pending commit when a view is hidden during another read', () => {
    const write = vi.fn();
    const first = job(() => write);
    const second = job(() => { cancelLayoutMeasurement(first); });
    scheduleLayoutMeasurement(first);
    scheduleLayoutMeasurement(second);
    frame();
    expect(write).not.toHaveBeenCalled();
  });

  it('defers measurements scheduled while applying a layout to the next frame', () => {
    const nextRead = job(vi.fn());
    const first = job(() => () => scheduleLayoutMeasurement(nextRead));
    scheduleLayoutMeasurement(first);
    frame();
    expect(nextRead).not.toHaveBeenCalled();
    frame();
    expect(nextRead).toHaveBeenCalledOnce();
  });
});
