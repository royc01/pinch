type FlushHandler = (blockIds: string[], remainingCount: number) => Promise<void> | void;

interface BlockIdBatchQueueOptions {
  maxBatchSize: number;
  onFlushBatch: FlushHandler;
  flushDelayMs?: number;
  followupDelayMs?: number;
}

export interface BlockIdBatchQueue {
  enqueue: (blockIds: string[], delayMs?: number) => void;
  clear: () => void;
}

export function createBlockIdBatchQueue(options: BlockIdBatchQueueOptions): BlockIdBatchQueue {
  const flushDelayMs = options.flushDelayMs ?? 24;
  const followupDelayMs = options.followupDelayMs ?? 16;
  const pendingBlockIds = new Set<string>();
  let flushTimer: number | null = null;
  let inFlight = false;

  const scheduleFlush = (delayMs: number): void => {
    if (pendingBlockIds.size === 0 || flushTimer !== null) {
      return;
    }
    flushTimer = window.setTimeout(() => {
      flushTimer = null;
      void flush();
    }, delayMs);
  };

  const flush = async (): Promise<void> => {
    if (inFlight || pendingBlockIds.size === 0) {
      return;
    }

    inFlight = true;
    try {
      const blockIds = Array.from(pendingBlockIds).slice(0, options.maxBatchSize);
      blockIds.forEach((blockId) => pendingBlockIds.delete(blockId));
      if (blockIds.length > 0) {
        await options.onFlushBatch(blockIds, pendingBlockIds.size);
      }
    } finally {
      inFlight = false;
    }

    if (pendingBlockIds.size > 0) {
      scheduleFlush(followupDelayMs);
    }
  };

  return {
    enqueue(blockIds: string[], delayMs = flushDelayMs): void {
      for (const blockId of blockIds) {
        if (typeof blockId === 'string' && blockId.length > 0) {
          pendingBlockIds.add(blockId);
        }
      }
      scheduleFlush(delayMs);
    },
    clear(): void {
      if (flushTimer !== null) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      pendingBlockIds.clear();
    }
  };
}
