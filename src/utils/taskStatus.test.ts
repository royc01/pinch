import { describe, expect, it } from 'vitest';
import {
  buildTaskStatusFilterOptions,
  configureTaskStatuses,
  isClosedTaskStatus,
  isKnownTaskStatus,
  normalizeTaskStatusDefinitions,
  resolveTaskStatusColor,
  taskMarkerToStatus,
  taskStatusToSiyuanTaskMarker
} from './taskStatus';

const t = (key: string) => key;

describe('custom task statuses', () => {
  it('retains built-ins and validates custom definitions', () => {
    const statuses = normalizeTaskStatusDefinitions([
      { id: 'review', name: 'Review', color: '#8b5cf6' },
      { id: 'invalid status', name: 'Ignored', color: '#000000' },
      { id: 'done-custom', name: 'Done', color: '#22c55e' }
    ]);

    expect(statuses.map(status => status.id)).toEqual([
      'review', 'done-custom', 'pending', 'in-progress', 'delayed', 'completed', 'cancelled'
    ]);
    expect(statuses.find(status => status.id === 'completed')).toBeTruthy();
  });

  it('preserves a user-defined order across built-in and custom statuses', () => {
    const statuses = normalizeTaskStatusDefinitions([
      { id: 'review', name: 'Review', color: '#8b5cf6' },
      { id: 'completed', color: '#000000' },
      { id: 'pending', color: '#000000' }
    ]);

    expect(statuses.map(status => status.id)).toEqual([
      'review', 'completed', 'pending', 'in-progress', 'delayed', 'cancelled'
    ]);
    // Built-in colors cannot be overwritten through persisted settings.
    expect(statuses.find(status => status.id === 'completed')?.color).toBe('#10b981');
  });

  it('uses configured labels while keeping custom states active', () => {
    configureTaskStatuses([
      { id: 'review', name: 'Ready for review', color: '#8b5cf6' },
      { id: 'done-custom', name: 'Shipped', color: '#22c55e', closed: true }
    ]);

    expect(isKnownTaskStatus('review')).toBe(true);
    // Legacy `closed` data is deliberately ignored for custom statuses.
    expect(isClosedTaskStatus('done-custom')).toBe(false);
    expect(isClosedTaskStatus('completed')).toBe(true);
    expect(isClosedTaskStatus('review')).toBe(false);
    expect(buildTaskStatusFilterOptions(t)).toContainEqual({ value: 'review', label: 'Ready for review' });
  });

  it('keeps the hidden-column setting and resolves the shared palette colors', () => {
    const statuses = normalizeTaskStatusDefinitions([
      { id: 'review', name: 'Review', color: 'pinch-background4', hidden: true },
      { id: 'pending', hidden: true }
    ]);

    expect(statuses.find(status => status.id === 'review')?.hidden).toBe(true);
    expect(statuses.find(status => status.id === 'pending')?.hidden).toBe(true);
    expect(resolveTaskStatusColor('pinch-background4')).toBe('var(--pinch-background4)');
  });

  it('maps native Siyuan task markers to Pinch statuses and back', () => {
    expect(taskMarkerToStatus('/')).toBe('in-progress');
    expect(taskMarkerToStatus('-')).toBe('cancelled');
    expect(taskMarkerToStatus('X')).toBe('completed');
    expect(taskMarkerToStatus(' ')).toBe('pending');
    expect(taskStatusToSiyuanTaskMarker('in-progress')).toBe('/');
    expect(taskStatusToSiyuanTaskMarker('cancelled')).toBe('-');
  });
});
