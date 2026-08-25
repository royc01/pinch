import { readonly, shallowRef } from 'vue';

export type TaskLoadSurface = 'view' | 'sidebar';
export type TaskLoadSource = 'cache' | 'kernel' | 'full' | 'empty';

export interface TaskLoadTrace {
  id: number;
  surface: TaskLoadSurface;
  startedAt: number;
  settingsMs?: number;
  firstTasksMs?: number;
  firstTasksSource?: TaskLoadSource;
  firstTaskCount?: number;
  metadataMs?: number;
  reconcileMs?: number;
  reconciledTaskCount?: number;
}

type TaskLoadMilestone = 'settingsMs' | 'metadataMs';

const traces = shallowRef<Record<TaskLoadSurface, TaskLoadTrace | null>>({
  view: null,
  sidebar: null
});
let nextTraceId = 0;

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function updateTrace(
  surface: TaskLoadSurface,
  traceId: number,
  update: (trace: TaskLoadTrace) => TaskLoadTrace
): void {
  const current = traces.value[surface];
  if (!current || current.id !== traceId) return;
  traces.value = { ...traces.value, [surface]: update(current) };
}

function elapsed(trace: TaskLoadTrace): number {
  return Math.max(0, now() - trace.startedAt);
}

export function beginTaskLoadTrace(surface: TaskLoadSurface): number {
  const id = ++nextTraceId;
  traces.value = {
    ...traces.value,
    [surface]: {
      id,
      surface,
      startedAt: now()
    }
  };
  return id;
}

export function markTaskLoadMilestone(
  surface: TaskLoadSurface,
  traceId: number,
  milestone: TaskLoadMilestone
): void {
  updateTrace(surface, traceId, trace => (
    trace[milestone] === undefined
      ? { ...trace, [milestone]: elapsed(trace) }
      : trace
  ));
}

export function markTaskLoadFirstTasks(
  surface: TaskLoadSurface,
  traceId: number,
  source: TaskLoadSource,
  taskCount: number
): void {
  updateTrace(surface, traceId, trace => (
    trace.firstTasksMs === undefined
      ? {
          ...trace,
          firstTasksMs: elapsed(trace),
          firstTasksSource: source,
          firstTaskCount: Math.max(0, taskCount)
        }
      : trace
  ));
}

export function markTaskLoadReconciled(
  surface: TaskLoadSurface,
  traceId: number,
  taskCount: number
): void {
  updateTrace(surface, traceId, trace => ({
    ...trace,
    reconcileMs: elapsed(trace),
    reconciledTaskCount: Math.max(0, taskCount)
  }));
}

export const taskLoadDiagnostics = readonly(traces);

