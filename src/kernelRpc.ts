import type { IKernelPluginRpc } from "siyuan";

const PINCH_KERNEL_PLUGIN_NAME = "pinch";
const PINCH_KERNEL_RPC_TIMEOUT_MS = 12000;
const PINCH_KERNEL_RPC_RETRY_AFTER_MS = 30000;

let kernelRpcUnavailableUntil = 0;
let lastKernelRpcUnavailableReason = "";
const kernelRpcInFlight = new Map<string, Promise<unknown>>();

type KernelPluginRpc = Pick<IKernelPluginRpc, "call">;

type JsonRpcSuccess<T> = {
  jsonrpc: "2.0";
  result: T;
  id: number;
};

type JsonRpcFailure = {
  jsonrpc: "2.0";
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
  id?: number;
};

export type KernelPingResult = {
  ok: boolean;
  source: "kernel";
  now: number;
};

export type KernelTaskRowsResult = {
  rows: Array<Record<string, unknown>>;
  elapsedMs: number;
  indexElapsedMs?: number;
  hierarchyElapsedMs?: number;
  pageCount?: number;
  totalScanned?: number;
  partial?: boolean;
  source: "kernel";
  cached?: boolean;
  refreshedAt?: number;
  fullRefreshedAt?: number;
  highWatermarkUpdated?: string;
  ageMs?: number;
  totalMatched?: number;
  changedRows?: number;
  incremental?: boolean;
};

export type KernelTaskStatsResult = {
  totalRows: number;
  topLevelRows: number;
  subtaskRows: number;
  completedRows: number;
  openRows: number;
  archivedRows: number;
  dueTodayRows: number;
  overdueRows: number;
  withDateRows: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  elapsedMs: number;
  indexElapsedMs?: number;
  hierarchyElapsedMs?: number;
  pageCount?: number;
  totalScanned?: number;
  partial?: boolean;
  source: "kernel";
  cached?: boolean;
  refreshedAt?: number;
  fullRefreshedAt?: number;
  highWatermarkUpdated?: string;
  ageMs?: number;
};

export type KernelBlockDOMBatchResult = {
  blocks: Array<{
    id: string;
    data: Record<string, unknown>;
  }>;
  failedIds: string[];
  elapsedMs: number;
  source: "kernel";
};

export class KernelRpcUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KernelRpcUnavailableError";
  }
}

function markKernelRpcUnavailable(error: unknown): void {
  kernelRpcUnavailableUntil = Date.now() + PINCH_KERNEL_RPC_RETRY_AFTER_MS;
  lastKernelRpcUnavailableReason = error instanceof Error ? error.message : String(error || "Kernel RPC unavailable");
}

export function configurePinchKernelRpc(_rpc?: KernelPluginRpc | null): void {
  /*
   * Do not use Plugin.kernel.rpc.call here.
   *
   * On affected SiYuan builds that client keeps retrying a pending request
   * after the caller has already timed out. Those detached retries reuse the
   * same JSON-RPC ID and turn one logical Pinch operation into dozens of HTTP
   * requests. The direct plugin endpoint supports AbortController, so each
   * Pinch request remains bounded. Keep this lifecycle function for callers
   * on older SiYuan versions, but deliberately ignore the supplied client.
   */
  void _rpc;
  kernelRpcUnavailableUntil = 0;
  lastKernelRpcUnavailableReason = "";
  kernelRpcInFlight.clear();
}

export function isKernelRpcUnavailable(error: unknown): boolean {
  return error instanceof KernelRpcUnavailableError ||
    (error instanceof Error && error.name === "KernelRpcUnavailableError");
}

export async function callPinchKernel<T>(method: string, params?: unknown): Promise<T> {
  if (Date.now() < kernelRpcUnavailableUntil) {
    throw new KernelRpcUnavailableError(lastKernelRpcUnavailableReason || "Kernel RPC is temporarily unavailable");
  }

  const key = `${method}:${params === undefined ? "" : JSON.stringify(params)}`;
  const existing = kernelRpcInFlight.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const request = callPinchKernelHttp<T>(method, params);
  kernelRpcInFlight.set(key, request);
  void request.then(
    () => {
      if (kernelRpcInFlight.get(key) === request) {
        kernelRpcInFlight.delete(key);
      }
    },
    () => {
      if (kernelRpcInFlight.get(key) === request) {
        kernelRpcInFlight.delete(key);
      }
    }
  );
  return request;
}

async function callPinchKernelHttp<T>(method: string, params?: unknown): Promise<T> {
  const id = Date.now();
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, PINCH_KERNEL_RPC_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`/api/plugin/rpc/${PINCH_KERNEL_PLUGIN_NAME}`, {
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id,
        method,
        ...(params === undefined ? {} : { params }),
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if ((error as { name?: string })?.name === "AbortError") {
      const timeoutError = new KernelRpcUnavailableError(`Kernel RPC request timed out: ${method}`);
      markKernelRpcUnavailable(timeoutError);
      throw timeoutError;
    }
    markKernelRpcUnavailable(error);
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const error = new KernelRpcUnavailableError(`Kernel RPC request failed: HTTP ${response.status}`);
    markKernelRpcUnavailable(error);
    throw error;
  }

  const payload = await response.json() as JsonRpcSuccess<T> | JsonRpcFailure;
  if ("error" in payload) {
    throw new Error(payload.error?.message || "Kernel RPC failed");
  }

  return payload.result;
}

export function pingPinchKernel(): Promise<KernelPingResult> {
  return callPinchKernel<KernelPingResult>("ping");
}

export type KernelTaskIndexParams = {
  limit?: number;
  includeCompleted?: boolean;
  includeArchived?: boolean;
  archivedOnly?: boolean;
  notebookId?: string;
  excludedNotebookIds?: string[];
  documentId?: string;
  force?: boolean;
  blockIds?: string[];
  startDate?: string;
  endDate?: string;
  includeSubtasks?: boolean;
  sinceUpdated?: string;
  includeRemindersOnly?: boolean;
};

export function refreshKernelTaskIndex(params: KernelTaskIndexParams | number = { limit: 20000 }): Promise<KernelTaskRowsResult> {
  const payload = typeof params === 'number' ? { limit: params } : params;
  return callPinchKernel<KernelTaskRowsResult>("refreshTaskIndex", payload);
}

export function getKernelTaskIndex(params: KernelTaskIndexParams | number = { limit: 200 }): Promise<KernelTaskRowsResult> {
  const payload = typeof params === 'number' ? { limit: params } : params;
  return callPinchKernel<KernelTaskRowsResult>("getTaskIndex", payload);
}

export function getKernelTaskRowsByBlockIds(
  blockIds: string[],
  params: Omit<KernelTaskIndexParams, 'blockIds'> = {}
): Promise<KernelTaskRowsResult> {
  return callPinchKernel<KernelTaskRowsResult>("getTaskRowsByBlockIds", {
    ...params,
    blockIds
  });
}

export function getKernelTaskRowsByDateRange(
  startDate: string,
  endDate: string,
  params: Omit<KernelTaskIndexParams, 'startDate' | 'endDate' | 'blockIds'> = {}
): Promise<KernelTaskRowsResult> {
  return callPinchKernel<KernelTaskRowsResult>("getTaskRowsByDateRange", {
    ...params,
    startDate,
    endDate
  });
}

export function getKernelTaskStats(
  params: Omit<KernelTaskIndexParams, 'blockIds'> = {}
): Promise<KernelTaskStatsResult> {
  return callPinchKernel<KernelTaskStatsResult>("getTaskStats", params);
}

export function getKernelBlockDOMBatch(ids: string[]): Promise<KernelBlockDOMBatchResult> {
  return callPinchKernel<KernelBlockDOMBatchResult>("getBlockDOMBatch", { ids });
}
