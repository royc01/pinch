import type { Task } from '@/api';
import { syncTaskStatusAttrsIfNeeded } from './taskHelpers';

interface PendingTaskStatusAttributeSync {
  status: Task['status'];
  completedAt?: string;
}

export interface TaskStatusAttributeSyncOptions {
  onApplied?: () => void | Promise<void>;
  onError?: (blockId: string, error: unknown) => void;
}

export interface TaskStatusAttributeSync {
  queue(blockId: string, status: Task['status'], completedAt?: string): void;
  flush(blockIds: Iterable<string>): Promise<void>;
}

export function createTaskStatusAttributeSync(
  options: TaskStatusAttributeSyncOptions = {}
): TaskStatusAttributeSync {
  const pending = new Map<string, PendingTaskStatusAttributeSync>();

  function queue(blockId: string, status: Task['status'], completedAt?: string): void {
    if (typeof blockId !== 'string' || blockId.trim().length === 0) {
      return;
    }
    pending.set(blockId, {
      status,
      completedAt: typeof completedAt === 'string' && completedAt.trim().length > 0
        ? completedAt.trim()
        : undefined
    });
  }

  async function flush(blockIds: Iterable<string>): Promise<void> {
    const entries = Array.from(new Set(Array.from(blockIds)))
      .map((blockId) => {
        const sync = pending.get(blockId);
        return sync ? { blockId, ...sync } : null;
      })
      .filter((entry): entry is { blockId: string; status: Task['status']; completedAt?: string } => !!entry);

    if (entries.length === 0) {
      return;
    }

    entries.forEach(entry => pending.delete(entry.blockId));

    const results = await Promise.allSettled(entries.map((entry) =>
      syncTaskStatusAttrsIfNeeded(entry.blockId, entry.status, entry.completedAt)
    ));
    const hasApplied = results.some(result => result.status === 'fulfilled' && result.value === true);
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        options.onError?.(entries[index]?.blockId || '', result.reason);
      }
    });

    if (hasApplied) {
      await options.onApplied?.();
    }
  }

  return { queue, flush };
}
