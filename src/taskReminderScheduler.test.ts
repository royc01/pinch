import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskRepository } from './api';
import {
  startTaskReminderScheduler,
  stopTaskReminderScheduler
} from './taskReminderScheduler';

describe('task reminder scheduler refreshes', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    stopTaskReminderScheduler();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('uses the kernel materialized task index without a frontend SQL scan', async () => {
    const kernelTasks = vi.spyOn(TaskRepository, 'getKernelReminderTasks').mockResolvedValue({
      tasks: [],
      elapsedMs: 1,
      partial: false
    });
    const fullTasks = vi.spyOn(TaskRepository, 'getAllTasks').mockResolvedValue([]);

    startTaskReminderScheduler();
    await vi.advanceTimersByTimeAsync(240);

    expect(kernelTasks).toHaveBeenCalledWith(undefined, undefined, {
      includeRepeatTemplateDate: true,
      materializeRepeats: true
    });
    expect(fullTasks).not.toHaveBeenCalled();
  });

  it('backs off a failed full refresh instead of retrying on every focus event', async () => {
    vi.spyOn(TaskRepository, 'getKernelReminderTasks').mockRejectedValue(new Error('kernel unavailable'));
    const fullTasks = vi.spyOn(TaskRepository, 'getAllTasks').mockRejectedValue(new Error('SQL unavailable'));
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'debug').mockImplementation(() => undefined);

    startTaskReminderScheduler();
    await vi.advanceTimersByTimeAsync(240);
    await Promise.resolve();

    expect(fullTasks).toHaveBeenCalledTimes(1);
    expect(warning).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event('focus'));
    await vi.advanceTimersByTimeAsync(240);

    expect(fullTasks).toHaveBeenCalledTimes(1);
  });
});
