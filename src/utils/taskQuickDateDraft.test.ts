import { describe, expect, it } from 'vitest';
import { buildTaskQuickDateDraft } from './taskQuickDateDraft';

describe('buildTaskQuickDateDraft', () => {
  it('prefers freshly inferred date and time values over existing task fields', () => {
    expect(buildTaskQuickDateDraft(
      {
        startDate: '2026-05-20',
        startTime: '09:00',
        dueDate: '2026-05-20',
        dueTime: '10:00',
      },
      {
        startDate: '2026-05-21',
        startTime: '15:00',
        dueDate: '2026-05-21',
        dueTime: '15:00',
      },
    )).toEqual({
      startDate: '2026-05-21',
      startTime: '15:00',
      dueDate: '2026-05-21',
      dueTime: '15:00',
    });
  });

  it('keeps existing fields when no reusable inference result exists', () => {
    expect(buildTaskQuickDateDraft({
      startDate: '2026-05-20',
      startTime: '09:00',
      dueDate: '2026-05-22',
      dueTime: '18:00',
    }, null)).toEqual({
      startDate: '2026-05-20',
      startTime: '09:00',
      dueDate: '2026-05-22',
      dueTime: '18:00',
    });
  });
});
