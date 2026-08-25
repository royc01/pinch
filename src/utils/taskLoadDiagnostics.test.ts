import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  beginTaskLoadTrace,
  markTaskLoadFirstTasks,
  markTaskLoadMilestone,
  markTaskLoadReconciled,
  taskLoadDiagnostics
} from './taskLoadDiagnostics';

describe('task load diagnostics', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('records milestones for the active surface trace', () => {
    const traceId = beginTaskLoadTrace('sidebar');
    markTaskLoadMilestone('sidebar', traceId, 'settingsMs');
    markTaskLoadFirstTasks('sidebar', traceId, 'cache', 24);
    markTaskLoadMilestone('sidebar', traceId, 'metadataMs');
    markTaskLoadReconciled('sidebar', traceId, 25);

    expect(taskLoadDiagnostics.value.sidebar).toMatchObject({
      id: traceId,
      firstTasksSource: 'cache',
      firstTaskCount: 24,
      reconciledTaskCount: 25
    });
    expect(taskLoadDiagnostics.value.sidebar?.settingsMs).toBeTypeOf('number');
    expect(taskLoadDiagnostics.value.sidebar?.metadataMs).toBeTypeOf('number');
    expect(taskLoadDiagnostics.value.sidebar?.reconcileMs).toBeTypeOf('number');
  });

  it('ignores late updates from an older trace', () => {
    const oldTraceId = beginTaskLoadTrace('view');
    const currentTraceId = beginTaskLoadTrace('view');
    markTaskLoadFirstTasks('view', oldTraceId, 'cache', 99);
    markTaskLoadFirstTasks('view', currentTraceId, 'kernel', 7);

    expect(taskLoadDiagnostics.value.view).toMatchObject({
      id: currentTraceId,
      firstTasksSource: 'kernel',
      firstTaskCount: 7
    });
  });
});
