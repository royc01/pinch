import { eventBus, Events } from './eventBus';

export type TaskChangeSource = 'local' | 'ws' | 'system';

export type TaskAttributeChanges = Record<string, Record<string, string>>;

export interface TaskChangePayload {
  blockIds: string[];
  revision: number;
  forceRefresh?: boolean;
  structureChange?: boolean;
  attributeChanges?: TaskAttributeChanges;
}

const TASK_CHANGE_FLUSH_DELAY_MS = 8;
const LOCAL_ECHO_RECONCILE_WINDOW_MS = 240;
// Structural transactions emit delete/insert operations and their websocket
// echo can arrive well after the local refresh (especially when a new nested
// list is created). Keep the structural marker alive long enough to classify
// that delayed echo correctly.
const LOCAL_STRUCTURE_ECHO_WINDOW_MS = 10000;
const LOCAL_ECHO_RECONCILE_DELAY_MS = 80;

const pendingBlockIds = new Set<string>();
const pendingAttributeChanges = new Map<string, Record<string, string>>();
const recentLocalBlockChanges = new Map<string, number>();
const recentLocalStructureChanges = new Map<string, number>();
const pendingEchoReconcileBlockIds = new Set<string>();
let pendingFallbackRefresh = false;
let pendingForceRefresh = false;
let pendingStructureChange = false;
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
  for (const [blockId, changedAt] of recentLocalStructureChanges) {
    if (now - changedAt > LOCAL_STRUCTURE_ECHO_WINDOW_MS) {
      recentLocalStructureChanges.delete(blockId);
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

function scheduleEchoReconciliation(blockIds: string[], structural = false): void {
  blockIds.forEach(blockId => pendingEchoReconcileBlockIds.add(blockId));
  if (echoReconcileTimer !== null) {
    return;
  }

  echoReconcileTimer = setTimeout(() => {
    echoReconcileTimer = null;
    pendingEchoReconcileBlockIds.forEach(blockId => pendingBlockIds.add(blockId));
    pendingEchoReconcileBlockIds.clear();
    pendingForceRefresh = true;
    // Preserve structural semantics for the delayed websocket echo so it
    // cannot overwrite a freshly rebuilt nested-task tree with an incremental
    // parent-only snapshot.
    if (structural) {
      pendingStructureChange = true;
    }
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
  if (pendingStructureChange) {
    payload.structureChange = true;
  }
  if (Object.keys(attributeChanges).length > 0) {
    payload.attributeChanges = attributeChanges;
  }

  pendingBlockIds.clear();
  pendingFallbackRefresh = false;
  pendingForceRefresh = false;
  pendingStructureChange = false;
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
  let structuralEcho = false;
  const blockIdsToPublish = source === 'ws'
    ? normalizedBlockIds.filter((blockId) => {
      const localChangedAt = recentLocalBlockChanges.get(blockId);
      const localStructureChangedAt = recentLocalStructureChanges.get(blockId);
      if (localChangedAt === undefined && localStructureChangedAt === undefined) {
        return true;
      }
      if (localStructureChangedAt !== undefined) {
        structuralEcho = true;
      }
      recentLocalBlockChanges.delete(blockId);
      recentLocalStructureChanges.delete(blockId);
      echoBlockIds.push(blockId);
      return false;
    })
    : normalizedBlockIds;

  if (source === 'local') {
    normalizedBlockIds.forEach(blockId => recentLocalBlockChanges.set(blockId, now));
    scheduleRecentLocalCleanup();
  }

  if (echoBlockIds.length > 0) {
    if (structuralEcho) {
      pendingStructureChange = true;
    }
    scheduleEchoReconciliation(echoBlockIds, structuralEcho);
  }

  // Kernel transactions can be observed before their DOM/SQL snapshot has
  // settled. The first event keeps the UI responsive; this coalesced forced
  // pass prevents a view from retaining that pre-commit snapshot indefinitely.
  if (source === 'ws' && blockIdsToPublish.length > 0) {
    if (structuralEcho) {
      pendingStructureChange = true;
    }
    scheduleEchoReconciliation(blockIdsToPublish, structuralEcho);
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

/**
 * Publish a structural task change (move/nesting/reparenting).
 *
 * Structural operations can change both the parent tree and the set of
 * top-level tasks visible to a view.  Consumers therefore need a forced
 * reconciliation instead of an attribute-only incremental patch.
 */
export function publishTaskStructureChange(
  blockIds: Iterable<string> | null | undefined
): void {
  const now = Date.now();
  pruneRecentLocalBlockChanges(now);
  const normalizedBlockIds = normalizeBlockIds(blockIds);
  markTaskStructureChangePending(normalizedBlockIds);
  if (normalizedBlockIds.length === 0) {
    pendingFallbackRefresh = true;
  } else {
    normalizedBlockIds.forEach(blockId => pendingBlockIds.add(blockId));
  }
  pendingForceRefresh = true;
  pendingStructureChange = true;
  scheduleFlush();
}

/** Mark a structural transaction before issuing the kernel request. */
export function markTaskStructureChangePending(
  blockIds: Iterable<string> | null | undefined
): void {
  const now = Date.now();
  pruneRecentLocalBlockChanges(now);
  const normalizedBlockIds = normalizeBlockIds(blockIds);
  normalizedBlockIds.forEach(blockId => recentLocalBlockChanges.set(blockId, now));
  normalizedBlockIds.forEach(blockId => recentLocalStructureChanges.set(blockId, now));
  scheduleRecentLocalCleanup();
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
  recentLocalStructureChanges.clear();
  pendingEchoReconcileBlockIds.clear();
  pendingFallbackRefresh = false;
  pendingForceRefresh = false;
  pendingStructureChange = false;
  revision = 0;
}
