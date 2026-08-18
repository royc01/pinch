import { describe, expect, it } from 'vitest';
import {
  getAutomaticScheduledTaskStatus,
  getInitialAutomaticTaskStatus,
  shouldStartPendingTaskOnInitialDate
} from './taskStatusAutomation';

describe('task status automation', () => {
  it('starts a pending task only when its first date is assigned', () => {
    expect(shouldStartPendingTaskOnInitialDate(
      { status: 'pending' },
      { startDate: '2026-08-17' }
    )).toBe(true);
    expect(shouldStartPendingTaskOnInitialDate(
      { status: 'pending', startDate: '2026-08-16' },
      { startDate: '2026-08-17' }
    )).toBe(false);
    expect(shouldStartPendingTaskOnInitialDate(
      { status: 'cancelled' },
      { dueDate: '2026-08-17' }
    )).toBe(false);
  });

  it('uses the date window immediately when the first date is assigned', () => {
    const task = { status: 'pending' as const };
    const now = new Date('2026-08-17T12:00:00');

    expect(getInitialAutomaticTaskStatus(task, {
      startDate: '2026-08-14',
      dueDate: '2026-08-16'
    }, now)).toBe('delayed');
    expect(getInitialAutomaticTaskStatus(task, {
      startDate: '2026-08-17',
      dueDate: '2026-08-17'
    }, now)).toBe('in-progress');
    expect(getInitialAutomaticTaskStatus(task, {
      startDate: '2026-08-18',
      dueDate: '2026-08-18'
    }, now)).toBe('pending');
  });

  it('uses the inclusive scheduled time window for automatic status', () => {
    const fields = {
      startDate: '2026-08-17',
      startTime: '09:00',
      dueDate: '2026-08-17',
      dueTime: '10:00'
    };
    expect(getAutomaticScheduledTaskStatus(fields, new Date('2026-08-17T08:59:59'))).toBe('pending');
    expect(getAutomaticScheduledTaskStatus(fields, new Date('2026-08-17T09:00:00'))).toBe('in-progress');
    expect(getAutomaticScheduledTaskStatus(fields, new Date('2026-08-17T10:00:00'))).toBe('in-progress');
    expect(getAutomaticScheduledTaskStatus(fields, new Date('2026-08-17T10:00:01'))).toBe('delayed');
  });

  it('treats a date-only task as active for the whole local day', () => {
    const fields = { startDate: '2026-08-17', dueDate: '2026-08-17' };
    expect(getAutomaticScheduledTaskStatus(fields, new Date('2026-08-17T23:30:00'))).toBe('in-progress');
  });
});
