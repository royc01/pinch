import { eventBus, Events } from './eventBus';

export type TaskChangeSource = 'local' | 'ws' | 'system';

export type TaskAttributeChanges = Record<string, Record<string, string>>;

export interface TaskChangePayload {
  blockIds: string[];
  revision: number;
  forceRefresh?: boolean;
  attributeChanges?: TaskAttributeChanges;
}

const TASK_CHANGE_FLUSH_DELAY_MS = 8;
const LOCAL_ECHO_RECONCILE_WINDOW_MS = 240;
const LOCAL_ECHO_RECONCILE_DELAY_MS = 80;

const pendingBlockIds = new Set<string>();
const pendingAttributeChanges = new Map<string, Record<string, string>>();
const recentLocalBlockChanges = new Map<string, number>();
const pendingEchoReconcileBlockIds = new Set<string>();
let pendingFallbackRefresh = false;
let pendingForceRefresh = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let localEchoCleanupTimer: ReturnType<typeof setTimeout> | null = null;
let echoReconcileTimer: ReturnType<typeof setTimeout> | null = null;
let revision = 0;

function normalizeBlockIds(blockIds: Iterable<string> | null | undefined): string[] {
  if (!blockIds) {
    return [];
  }

  const normalized = new Set<string>();
  for (const blockId of blockIds) {
    if (typeof blockId !== 'string') {
      continue;
    }
    const value = blockId.trim();
    if (value) {
      normalized.add(value);
    }
  }
  return Array.from(normalized);
}

function pruneRecentLocalBlockChanges(now: number): void {
  for (const [blockId, changedAt] of recentLocalBlockChanges) {
    if (now - changedAt > LOCAL_ECHO_RECONCILE_WINDOW_MS) {
      recentLocalBlockChanges.delete(blockId);
    }
  }
}

function scheduleRecentLocalCleanup(): void {
  if (localEchoCleanupTimer !== null || recentLocalBlockChanges.size === 0) {
    return;
  }

  localEchoCleanupTimer = setTimeout(() => {
    localEchoCleanupTimer = null;
    pruneRecentLocalBlockChanges(Date.now());
    scheduleRecentLocalCleanup();
  }, LOCAL_ECHO_RECONCILE_WINDOW_MS);
}

function scheduleFlush(): void {
  if (flushTimer !== null) {
    return;
  }

  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushPendingTaskChanges();
  }, TASK_CHANGE_FLUSH_DELAY_MS);
}

function scheduleEchoReconciliation(blockIds: string[]): void {
  blockIds.forEach(blockId => pendingEchoReconcileBlockIds.add(blockId));
  if (echoReconcileTimer !== null) {
    return;
  }

  echoReconcileTimer = setTimeout(() => {
    echoReconcileTimer = null;
    pendingEchoReconcileBlockIds.forEach(blockId => pendingBlockIds.add(blockId));
    pendingEchoReconcileBlockIds.clear();
    pendingForceRefresh = true;
    scheduleFlush();
  }, LOCAL_ECHO_RECONCILE_DELAY_MS);
}

function flushPendingTaskChanges(): void {
  if (pendingBlockIds.size === 0 && !pendingFallbackRefresh) {
    return;
  }

  const attributeChanges: TaskAttributeChanges = {};
  pendingBlockIds.forEach((blockId) => {
    const attrs = pendingAttributeChanges.get(blockId);
    if (!attrs) {
      return;
    }
    attributeChanges[blockId] = { ...attrs };
    pendingAttributeChanges.delete(blockId);
  });
  const payload: TaskChangePayload = {
    blockIds: Array.from(pendingBlockIds),
    revision: ++revision
  };
  if (pendingForceRefresh) {
    payload.forceRefresh = true;
  }
  if (Object.keys(attributeChanges).length > 0) {
    payload.attributeChanges = attributeChanges;
  }

  pendingBlockIds.clear();
  pendingFallbackRefresh = false;
  pendingForceRefresh = false;
  eventBus.emit(Events.TASK_CHANGED, payload);
}

export function publishTaskChange(
  blockIds: Iterable<string> | null | undefined,
  source: TaskChangeSource = 'local'
): void {
  const now = Date.now();
  pruneRecentLocalBlockChanges(now);

  const normalizedBlockIds = normalizeBlockIds(blockIds);
  const echoBlockIds: string[] = [];
  const blockIdsToPublish = source === 'ws'
    ? normalizedBlockIds.filter((blockId) => {
      const localChangedAt = recentLocalBlockChanges.get(blockId);
      if (localChangedAt === undefined) {
        return true;
      }
      recentLocalBlockChanges.delete(blockId);
      echoBlockIds.push(blockId);
      return false;
    })
    : normalizedBlockIds;

  if (source === 'local') {
    normalizedBlockIds.forEach(blockId => recentLocalBlockChanges.set(blockId, now));
    scheduleRecentLocalCleanup();
  }

  if (echoBlockIds.length > 0) {
    scheduleEchoReconciliation(echoBlockIds);
  }

  if (blockIdsToPublish.length === 0) {
    if (normalizedBlockIds.length === 0) {
      pendingFallbackRefresh = true;
      scheduleFlush();
    }
    return;
  }

  blockIdsToPublish.forEach(blockId => pendingBlockIds.add(blockId));
  scheduleFlush();
}

export function publishTaskAttributeChange(
  blockId: string,
  attrs: Record<string, unknown>
): void {
  const normalizedBlockId = normalizeBlockIds([blockId])[0];
  if (!normalizedBlockId) {
    return;
  }

  const taskAttrs: Record<string, string> = {};
  Object.entries(attrs).forEach(([name, value]) => {
    if (name.startsWith('custom-task-') && typeof value === 'string') {
      taskAttrs[name] = value;
    }
  });
  if (Object.keys(taskAttrs).length === 0) {
    return;
  }

  const pendingAttrs = pendingAttributeChanges.get(normalizedBlockId) || {};
  Object.assign(pendingAttrs, taskAttrs);
  pendingAttributeChanges.set(normalizedBlockId, pendingAttrs);
  publishTaskChange([normalizedBlockId]);
}

export function resetTaskChangeCoordinator(): void {
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (localEchoCleanupTimer !== null) {
    clearTimeout(localEchoCleanupTimer);
    localEchoCleanupTimer = null;
  }
  if (echoReconcileTimer !== null) {
    clearTimeout(echoReconcileTimer);
    echoReconcileTimer = null;
  }
  pendingBlockIds.clear();
  pendingAttributeChanges.clear();
  recentLocalBlockChanges.clear();
  pendingEchoReconcileBlockIds.clear();
  pendingFallbackRefresh = false;
  pendingForceRefresh = false;
  revision = 0;
}
