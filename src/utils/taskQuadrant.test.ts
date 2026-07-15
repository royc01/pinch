import { describe, expect, it } from 'vitest';
import { getTaskQuadrant } from './taskQuadrant';

const now = new Date(2026, 6, 15, 12);

describe('getTaskQuadrant', () => {
  it.each([
    ['high', '2026-07-14', 'important-urgent'],
    ['medium', '2026-07-15', 'important-urgent'],
    ['high', '2026-07-16', 'important-not-urgent'],
    ['low', '2026-07-15', 'not-important-urgent'],
    ['none', '', 'not-important-not-urgent']
  ] as const)('classifies %s task due %s', (priority, dueDate, quadrant) => {
    expect(getTaskQuadrant({ priority, dueDate }, now).id).toBe(quadrant);
  });

  it('treats invalid dates as not urgent', () => {
    expect(getTaskQuadrant({ priority: 'high', dueDate: '2026-02-30' }, now).id).toBe('important-not-urgent');
  });

  it('honors a manual urgent marker without changing the due date', () => {
    expect(getTaskQuadrant({ priority: 'low', dueDate: '', urgent: true }, now).id).toBe('not-important-urgent');
  });

  it('treats tasks due within the configured inclusive window as urgent', () => {
    expect(getTaskQuadrant({ priority: 'high', dueDate: '2026-07-22' }, now, 7).id).toBe('important-urgent');
    expect(getTaskQuadrant({ priority: 'high', dueDate: '2026-07-23' }, now, 7).id).toBe('important-not-urgent');
  });
});
