import { escapeSqlLiteral } from './utils/sql';

declare const siyuan: any;

type KernelTaskRow = {
  id: string;
  content: string;
  markdown: string;
  box: string;
  hpath: string;
  root_id: string;
  parent_id: string;
  updated: string;
  created: string;
  parent_task_id?: string;
  is_subtask?: boolean;
  custom_task_id?: string;
  custom_task_status?: string;
  custom_task_priority?: string;
  custom_task_due_date?: string;
  custom_task_due_time?: string;
  custom_task_start_date?: string;
  custom_task_start_time?: string;
  custom_task_tags?: string;
  custom_task_description?: string;
  custom_task_reminder_type?: string;
  custom_task_reminder_custom_time?: string;
  custom_task_focus_estimate?: string;
  custom_task_group?: string;
  custom_task_pinned?: string;
  custom_task_background_color?: string;
  custom_task_urgent?: string;
  custom_task_archived?: string;
  custom_task_completed_at?: string;
  custom_task_archived_at?: string;
  custom_task_archive_reason?: string;
};

type KernelTaskListParams = {
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
};

type SqlResponse<T> = {
  code?: number;
  msg?: string;
  data?: T;
};

type TaskQueryCursor = {
  updated: string;
  id: string;
};

type TaskRowsQueryResult = {
  rows: KernelTaskRow[];
  changedBlockIds?: string[];
  highWatermarkUpdated?: string;
  elapsedMs: number;
  hierarchyElapsedMs?: number;
  pageCount?: number;
  totalScanned?: number;
  partial?: boolean;
  source: "kernel";
  changedRows?: number;
  incremental?: boolean;
};

type TaskIndexResult = TaskRowsQueryResult & {
  indexElapsedMs?: number;
  cached?: boolean;
  refreshedAt?: number;
  fullRefreshedAt?: number;
  highWatermarkUpdated?: string;
  ageMs?: number;
};

type TaskStatsResult = {
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
  ageMs?: number;
};

type ParentBlockRow = {
  id: string;
  parent_id: string;
  type: string;
  subtype: string;
  markdown: string;
};

type KernelBlockDOMBatchResult = {
  blocks: Array<{
    id: string;
    data: Record<string, unknown>;
  }>;
  failedIds: string[];
  elapsedMs: number;
  source: "kernel";
};

const DEFAULT_TASK_LIMIT = 500;
const MAX_TASK_LIMIT = 5000;
const TASK_INDEX_TTL_MS = 30 * 1000;
const TASK_INDEX_FULL_REFRESH_MS = 5 * 60 * 1000;
const TASK_QUERY_PAGE_SIZE = 256;
const MAX_TASK_QUERY_PAGES = 1000;
const TASK_PARENT_LOOKUP_BATCH_SIZE = 32;
const MAX_TASK_PARENT_DEPTH = 12;
const MAX_BLOCK_DOM_BATCH_SIZE = 512;
const BLOCK_DOM_BATCH_CONCURRENCY = 8;

type TaskIndexCacheEntry = {
  rows: KernelTaskRow[];
  refreshedAt: number;
  elapsedMs: number;
  hierarchyElapsedMs?: number;
  pageCount?: number;
  partial?: boolean;
  fullRefreshedAt: number;
  highWatermarkUpdated?: string;
};

const taskIndexCache = new Map<string, TaskIndexCacheEntry>();

function normalizeScopeValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDateValue(value: unknown): string {
  const normalized = normalizeScopeValue(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : "";
}

function normalizeUpdatedValue(value: unknown): string {
  return normalizeScopeValue(value).replace(/[^0-9]/g, "");
}

function normalizeTaskListParams(params: KernelTaskListParams | number | undefined): KernelTaskListParams {
  if (typeof params === "number") {
    return { limit: params };
  }
  return params && typeof params === "object" ? params : {};
}

function normalizeBlockIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const ids: string[] = [];
  for (const item of value) {
    const id = normalizeScopeValue(item);
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids.slice(0, MAX_TASK_LIMIT);
}

function normalizeNotebookIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
        .map(id => id.trim())
    )
  ).sort();
}

function toSqlStringList(values: string[]): string {
  return values.map(value => `'${escapeSqlLiteral(value)}'`).join(", ");
}

function buildTaskIndexCacheKey(params: KernelTaskListParams = {}): string {
  return [
    params.includeCompleted === false ? "open" : "all-status",
    params.archivedOnly ? "archived-only" : (params.includeArchived ? "include-archived" : "active-only"),
    normalizeScopeValue(params.notebookId) || "*",
    normalizeNotebookIds(params.excludedNotebookIds).join(",") || "*",
    normalizeScopeValue(params.documentId) || "*",
  ].join("|");
}

function clampTaskLimit(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return DEFAULT_TASK_LIMIT;
  }
  return Math.min(Math.floor(numeric), MAX_TASK_LIMIT);
}

function compareTaskRowsByUpdatedDesc(a: KernelTaskRow, b: KernelTaskRow): number {
  const updatedCompare = String(b.updated || "").localeCompare(String(a.updated || ""));
  return updatedCompare || String(b.id || "").localeCompare(String(a.id || ""));
}

function getHighWatermarkUpdated(rows: KernelTaskRow[]): string | undefined {
  return rows.reduce<string | undefined>((latest, row) => {
    const updated = normalizeUpdatedValue(row.updated);
    if (!updated) {
      return latest;
    }
    return !latest || updated > latest ? updated : latest;
  }, undefined);
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function resolveTaskRowStatus(row: KernelTaskRow): string {
  const status = normalizeScopeValue(row.custom_task_status);
  if (status) {
    return status;
  }
  return /\[[xX]\]/.test(row.markdown || "") ? "completed" : "pending";
}

function isTaskRowArchived(row: KernelTaskRow): boolean {
  return ["1", "true", "TRUE", "yes", "YES"].includes(normalizeScopeValue(row.custom_task_archived));
}

function isTaskRowCompleted(row: KernelTaskRow): boolean {
  return /\[[xX]\]/.test(row.markdown || "");
}

function doesTaskRowMatchParams(row: KernelTaskRow, params: KernelTaskListParams = {}): boolean {
  if (params.includeCompleted === false && isTaskRowCompleted(row)) {
    return false;
  }
  if (params.notebookId && row.box !== normalizeScopeValue(params.notebookId)) {
    return false;
  }
  if (normalizeNotebookIds(params.excludedNotebookIds).includes(row.box)) {
    return false;
  }
  if (params.documentId && row.root_id !== normalizeScopeValue(params.documentId)) {
    return false;
  }

  const archived = isTaskRowArchived(row);
  if (params.archivedOnly) {
    return archived;
  }
  if (!params.includeArchived && archived) {
    return false;
  }
  return true;
}

function getTaskRowDateBounds(row: KernelTaskRow): { startDate: string; endDate: string } | null {
  const startDate = normalizeDateValue(row.custom_task_start_date);
  const dueDate = normalizeDateValue(row.custom_task_due_date);
  const effectiveStart = startDate || dueDate;
  const effectiveEnd = dueDate || startDate;
  return effectiveStart && effectiveEnd
    ? { startDate: effectiveStart, endDate: effectiveEnd }
    : null;
}

function doesTaskRowOverlapDateRange(row: KernelTaskRow, startDate: string, endDate: string): boolean {
  const bounds = getTaskRowDateBounds(row);
  return Boolean(bounds && bounds.startDate <= endDate && bounds.endDate >= startDate);
}

function isTaskBlockShape(row: Pick<ParentBlockRow, "type" | "subtype" | "markdown">): boolean {
  const markdown = String(row.markdown || "");
  return (row.type === "i" || row.type === "p") &&
    row.subtype === "t" &&
    (markdown.includes("[ ]") || markdown.includes("[x]") || markdown.includes("[X]"));
}

function normalizeTaskRow(row: any): KernelTaskRow {
  return {
    id: String(row?.id || ""),
    content: String(row?.content || ""),
    markdown: String(row?.markdown || ""),
    box: String(row?.box || ""),
    hpath: String(row?.hpath || ""),
    root_id: String(row?.root_id || ""),
    parent_id: String(row?.parent_id || ""),
    updated: String(row?.updated || ""),
    created: String(row?.created || ""),
    parent_task_id: row?.parent_task_id || undefined,
    is_subtask: row?.is_subtask === true,
    custom_task_id: row?.custom_task_id || undefined,
    custom_task_status: row?.custom_task_status || undefined,
    custom_task_priority: row?.custom_task_priority || undefined,
    custom_task_due_date: row?.custom_task_due_date || undefined,
    custom_task_due_time: row?.custom_task_due_time || undefined,
    custom_task_start_date: row?.custom_task_start_date || undefined,
    custom_task_start_time: row?.custom_task_start_time || undefined,
    custom_task_tags: row?.custom_task_tags || undefined,
    custom_task_description: row?.custom_task_description || undefined,
    custom_task_reminder_type: row?.custom_task_reminder_type || undefined,
    custom_task_reminder_custom_time: row?.custom_task_reminder_custom_time || undefined,
    custom_task_focus_estimate: row?.custom_task_focus_estimate || undefined,
    custom_task_group: row?.custom_task_group || undefined,
    custom_task_pinned: row?.custom_task_pinned || undefined,
    custom_task_background_color: row?.custom_task_background_color || undefined,
    custom_task_urgent: row?.custom_task_urgent || undefined,
    custom_task_archived: row?.custom_task_archived || undefined,
    custom_task_completed_at: row?.custom_task_completed_at || undefined,
    custom_task_archived_at: row?.custom_task_archived_at || undefined,
    custom_task_archive_reason: row?.custom_task_archive_reason || undefined,
  };
}

async function kernelSql<T>(stmt: string): Promise<T> {
  const response = await siyuan.client.fetch("/api/query/sql", {
    method: "POST",
    body: JSON.stringify({ stmt }),
  });
  const payload = await response.json() as SqlResponse<T>;
  if (payload?.code !== 0) {
    throw new Error(payload?.msg || "SQL query failed");
  }
  return payload.data as T;
}

function buildTaskFilters(params: KernelTaskListParams = {}): string[] {
  const completionSql = params.includeCompleted === false
    ? "b.markdown LIKE '%[ ]%'"
    : "(b.markdown LIKE '%[ ]%' OR b.markdown LIKE '%[x]%' OR b.markdown LIKE '%[X]%')";
  const notebookId = normalizeScopeValue(params.notebookId);
  const excludedNotebookIds = normalizeNotebookIds(params.excludedNotebookIds);
  const documentId = normalizeScopeValue(params.documentId);
  const archivedValueSql = "('1', 'true', 'TRUE', 'yes', 'YES')";
  const filters = [
    "(b.type = 'i' OR b.type = 'p')",
    "b.subtype = 't'",
    completionSql,
  ];

  if (notebookId) {
    filters.push(`b.box = '${escapeSqlLiteral(notebookId)}'`);
  }
  if (excludedNotebookIds.length > 0) {
    filters.push(`b.box NOT IN (${toSqlStringList(excludedNotebookIds)})`);
  }
  if (documentId) {
    filters.push(`b.root_id = '${escapeSqlLiteral(documentId)}'`);
  }
  if (params.archivedOnly) {
    filters.push(`EXISTS (
        SELECT 1 FROM attributes archived_attr
        WHERE archived_attr.block_id = b.id
          AND archived_attr.name = 'custom-task-archived'
          AND archived_attr.value IN ${archivedValueSql}
      )`);
  } else if (!params.includeArchived) {
    filters.push(`NOT EXISTS (
        SELECT 1 FROM attributes archived_attr
        WHERE archived_attr.block_id = b.id
          AND archived_attr.name = 'custom-task-archived'
          AND archived_attr.value IN ${archivedValueSql}
      )`);
  }

  return filters;
}

function buildTaskRowsSql(filters: string[], orderBy: string, limit: number): string {
  return `
    SELECT b.id, b.content, b.markdown, b.box, b.hpath, b.root_id, b.parent_id, b.updated, b.created,
           MAX(CASE WHEN a.name = 'custom-task-id' THEN a.value END) AS custom_task_id,
           MAX(CASE WHEN a.name = 'custom-task-status' THEN a.value END) AS custom_task_status,
           MAX(CASE WHEN a.name = 'custom-task-priority' THEN a.value END) AS custom_task_priority,
           MAX(CASE WHEN a.name = 'custom-task-due-date' THEN a.value END) AS custom_task_due_date,
           MAX(CASE WHEN a.name = 'custom-task-due-time' THEN a.value END) AS custom_task_due_time,
           MAX(CASE WHEN a.name = 'custom-task-start-date' THEN a.value END) AS custom_task_start_date,
           MAX(CASE WHEN a.name = 'custom-task-start-time' THEN a.value END) AS custom_task_start_time,
           MAX(CASE WHEN a.name = 'custom-task-tags' THEN a.value END) AS custom_task_tags,
           MAX(CASE WHEN a.name = 'custom-task-description' THEN a.value END) AS custom_task_description,
            MAX(CASE WHEN a.name = 'custom-task-reminder-type' THEN a.value END) AS custom_task_reminder_type,
            MAX(CASE WHEN a.name = 'custom-task-reminder-custom-time' THEN a.value END) AS custom_task_reminder_custom_time,
            MAX(CASE WHEN a.name = 'custom-task-focus-estimate' THEN a.value END) AS custom_task_focus_estimate,
            MAX(CASE WHEN a.name = 'custom-task-group' THEN a.value END) AS custom_task_group,
           MAX(CASE WHEN a.name = 'custom-task-pinned' THEN a.value END) AS custom_task_pinned,
           MAX(CASE WHEN a.name = 'custom-task-background-color' THEN a.value END) AS custom_task_background_color,
           MAX(CASE WHEN a.name = 'custom-task-urgent' THEN a.value END) AS custom_task_urgent,
           MAX(CASE WHEN a.name = 'custom-task-archived' THEN a.value END) AS custom_task_archived,
           MAX(CASE WHEN a.name = 'custom-task-completed-at' THEN a.value END) AS custom_task_completed_at,
           MAX(CASE WHEN a.name = 'custom-task-archived-at' THEN a.value END) AS custom_task_archived_at,
           MAX(CASE WHEN a.name = 'custom-task-archive-reason' THEN a.value END) AS custom_task_archive_reason
    FROM blocks b
    LEFT JOIN attributes a ON a.block_id = b.id
    WHERE ${filters.join("\n      AND ")}
    GROUP BY b.id
    ORDER BY ${orderBy}
    LIMIT ${limit}
  `;
}

async function queryTaskRowsPage(
  params: KernelTaskListParams,
  cursor: TaskQueryCursor | null,
  limit: number,
): Promise<KernelTaskRow[]> {
  const filters = buildTaskFilters(params);
  if (cursor?.updated && cursor?.id) {
    filters.push(`(b.updated < '${escapeSqlLiteral(cursor.updated)}'
      OR (b.updated = '${escapeSqlLiteral(cursor.updated)}' AND b.id < '${escapeSqlLiteral(cursor.id)}'))`);
  }

  const rows = await kernelSql<any[]>(buildTaskRowsSql(filters, "b.updated DESC, b.id DESC", limit));
  return Array.isArray(rows) ? rows.map(normalizeTaskRow).filter(row => row.id) : [];
}

async function fetchParentRowsByIds(ids: string[]): Promise<ParentBlockRow[]> {
  const uniqueIds = normalizeBlockIds(ids);
  if (uniqueIds.length === 0) {
    return [];
  }

  const rows = await kernelSql<any[]>(`
    SELECT id, parent_id, type, subtype, markdown
    FROM blocks
    WHERE id IN (${toSqlStringList(uniqueIds)})
  `);
  const normalizedRows = Array.isArray(rows)
    ? rows
        .map(row => ({
          id: String(row?.id || ""),
          parent_id: String(row?.parent_id || ""),
          type: String(row?.type || ""),
          subtype: String(row?.subtype || ""),
          markdown: String(row?.markdown || ""),
        }))
        .filter(row => row.id)
    : [];

  if (normalizedRows.length < uniqueIds.length && uniqueIds.length > 1) {
    const midpoint = Math.ceil(uniqueIds.length / 2);
    const leftRows = await fetchParentRowsByIds(uniqueIds.slice(0, midpoint));
    const rightRows = await fetchParentRowsByIds(uniqueIds.slice(midpoint));
    return [...leftRows, ...rightRows];
  }

  return normalizedRows;
}

async function enrichTaskHierarchy(rows: KernelTaskRow[]): Promise<KernelTaskRow[]> {
  if (rows.length === 0) {
    return rows;
  }

  const taskBlockIds = new Set(rows.map(row => row.id).filter(Boolean));
  const parentById = new Map<string, string>();
  const pendingLookupIds = new Set<string>();

  for (const row of rows) {
    parentById.set(row.id, row.parent_id || "");
    if (row.parent_id && !parentById.has(row.parent_id)) {
      pendingLookupIds.add(row.parent_id);
    }
  }

  let lookupIds = Array.from(pendingLookupIds);
  for (let depth = 0; depth < MAX_TASK_PARENT_DEPTH && lookupIds.length > 0; depth += 1) {
    const nextLookupIds = new Set<string>();
    for (let i = 0; i < lookupIds.length; i += TASK_PARENT_LOOKUP_BATCH_SIZE) {
      const batchIds = lookupIds
        .slice(i, i + TASK_PARENT_LOOKUP_BATCH_SIZE)
        .filter(id => id && !parentById.has(id));
      if (batchIds.length === 0) {
        continue;
      }

      const parentRows = await fetchParentRowsByIds(batchIds);
      for (const parentRow of parentRows) {
        parentById.set(parentRow.id, parentRow.parent_id || "");
        if (isTaskBlockShape(parentRow)) {
          taskBlockIds.add(parentRow.id);
        }
        if (parentRow.parent_id && !parentById.has(parentRow.parent_id)) {
          nextLookupIds.add(parentRow.parent_id);
        }
      }
    }
    lookupIds = Array.from(nextLookupIds);
  }

  return rows.map(row => {
    let currentParentId = row.parent_id || "";
    const visited = new Set<string>();
    let depth = 0;

    while (currentParentId && depth < MAX_TASK_PARENT_DEPTH && !visited.has(currentParentId)) {
      if (taskBlockIds.has(currentParentId)) {
        return {
          ...row,
          parent_task_id: currentParentId,
          is_subtask: true,
        };
      }
      visited.add(currentParentId);
      currentParentId = parentById.get(currentParentId) || "";
      depth += 1;
    }

    return {
      ...row,
      parent_task_id: undefined,
      is_subtask: false,
    };
  });
}

async function queryTaskRowsByBlockIds(params: KernelTaskListParams = {}): Promise<TaskRowsQueryResult> {
  const startedAt = Date.now();
  const requestedIds = normalizeBlockIds(params.blockIds);
  if (requestedIds.length === 0) {
    return {
      rows: [],
      elapsedMs: Date.now() - startedAt,
      source: "kernel",
    };
  }

  const fetchRowsForIds = async (ids: string[]): Promise<KernelTaskRow[]> => {
    if (ids.length === 0) {
      return [];
    }
    const filters = buildTaskFilters(params);
    filters.push(`b.id IN (${toSqlStringList(ids)})`);
    const rows = await kernelSql<any[]>(buildTaskRowsSql(filters, "b.updated DESC, b.id DESC", ids.length));
    const normalizedRows = Array.isArray(rows) ? rows.map(normalizeTaskRow).filter(row => row.id) : [];
    if (normalizedRows.length < ids.length && ids.length > 1) {
      const midpoint = Math.ceil(ids.length / 2);
      const leftRows = await fetchRowsForIds(ids.slice(0, midpoint));
      const rightRows = await fetchRowsForIds(ids.slice(midpoint));
      return [...leftRows, ...rightRows];
    }
    return normalizedRows;
  };

  const rowsById = new Map<string, KernelTaskRow>();
  const rawRows = await fetchRowsForIds(requestedIds);
  for (const row of rawRows) {
    rowsById.set(row.id, row);
  }

  const hierarchyStartedAt = Date.now();
  const rows = await enrichTaskHierarchy(Array.from(rowsById.values()));
  rows.sort(compareTaskRowsByUpdatedDesc);

  const limit = Math.max(1, Math.min(clampTaskLimit(params.limit || requestedIds.length), requestedIds.length));
  return {
    rows: rows.slice(0, limit),
    elapsedMs: Date.now() - startedAt,
    hierarchyElapsedMs: Date.now() - hierarchyStartedAt,
    totalScanned: requestedIds.length,
    source: "kernel",
  };
}

async function queryExistingBlockIds(blockIds: string[]): Promise<Set<string>> {
  const normalizedIds = normalizeBlockIds(blockIds);
  if (normalizedIds.length === 0) {
    return new Set();
  }

  const rows = await kernelSql<Array<{ id?: unknown }>>(`
    SELECT id
    FROM blocks
    WHERE id IN (${toSqlStringList(normalizedIds)})
  `);
  return new Set(
    (Array.isArray(rows) ? rows : [])
      .map(row => String(row?.id || ""))
      .filter(Boolean)
  );
}

async function queryTaskRows(params: KernelTaskListParams = {}): Promise<TaskRowsQueryResult> {
  if (normalizeBlockIds(params.blockIds).length > 0) {
    return queryTaskRowsByBlockIds(params);
  }

  const startedAt = Date.now();
  const limit = clampTaskLimit(params.limit);
  const scanLimit = limit + 1;
  const rows: KernelTaskRow[] = [];
  const seenIds = new Set<string>();
  let cursor: TaskQueryCursor | null = null;
  let pageCount = 0;
  let partial = false;

  while (rows.length < scanLimit && pageCount < MAX_TASK_QUERY_PAGES) {
    const pageLimit = Math.min(TASK_QUERY_PAGE_SIZE, scanLimit - rows.length);
    const pageRows = await queryTaskRowsPage(params, cursor, pageLimit);
    pageCount += 1;
    if (pageRows.length === 0) {
      break;
    }

    const lastRow = pageRows[pageRows.length - 1];
    cursor = {
      updated: lastRow.updated,
      id: lastRow.id,
    };

    for (const row of pageRows) {
      if (!seenIds.has(row.id)) {
        seenIds.add(row.id);
        rows.push(row);
      }
    }

    if (!cursor.updated || !cursor.id) {
      break;
    }
  }

  partial = rows.length > limit || (rows.length < scanLimit && pageCount >= MAX_TASK_QUERY_PAGES);

  const hierarchyStartedAt = Date.now();
  const rowsWithHierarchy = await enrichTaskHierarchy(rows);
  rowsWithHierarchy.sort(compareTaskRowsByUpdatedDesc);

  return {
    rows: rowsWithHierarchy.slice(0, limit),
    elapsedMs: Date.now() - startedAt,
    hierarchyElapsedMs: Date.now() - hierarchyStartedAt,
    pageCount,
    totalScanned: rows.length,
    partial,
    source: "kernel",
  };
}

async function queryChangedTaskRows(params: KernelTaskListParams = {}): Promise<TaskRowsQueryResult> {
  const sinceUpdated = normalizeUpdatedValue(params.sinceUpdated);
  if (!sinceUpdated) {
    return queryTaskRows(params);
  }

  const startedAt = Date.now();
  const limit = clampTaskLimit(params.limit || MAX_TASK_LIMIT);
  const filters = [
    "(b.type = 'i' OR b.type = 'p')",
    "b.subtype = 't'",
    "(b.markdown LIKE '%[ ]%' OR b.markdown LIKE '%[x]%' OR b.markdown LIKE '%[X]%')",
    `b.updated >= '${escapeSqlLiteral(sinceUpdated)}'`,
  ];
  const notebookId = normalizeScopeValue(params.notebookId);
  const excludedNotebookIds = normalizeNotebookIds(params.excludedNotebookIds);
  const documentId = normalizeScopeValue(params.documentId);
  if (notebookId) {
    filters.push(`b.box = '${escapeSqlLiteral(notebookId)}'`);
  }
  if (excludedNotebookIds.length > 0) {
    filters.push(`b.box NOT IN (${toSqlStringList(excludedNotebookIds)})`);
  }
  if (documentId) {
    filters.push(`b.root_id = '${escapeSqlLiteral(documentId)}'`);
  }

  const rows = await kernelSql<any[]>(buildTaskRowsSql(filters, "b.updated DESC, b.id DESC", limit + 1));
  const normalizedRows = Array.isArray(rows) ? rows.map(normalizeTaskRow).filter(row => row.id) : [];
  const limitedRows = normalizedRows.slice(0, limit);

  // Dirty IDs intentionally ignore the current scope. A task moved out of a
  // notebook or document must still remove its old row from that scoped index.
  const changedBlocks = await kernelSql<Array<{ id?: unknown; updated?: unknown }>>(`
    SELECT b.id, b.updated
    FROM blocks b
    WHERE b.updated >= '${escapeSqlLiteral(sinceUpdated)}'
    ORDER BY b.updated DESC, b.id DESC
    LIMIT ${limit + 1}
  `);
  const normalizedChangedBlocks = Array.isArray(changedBlocks)
    ? changedBlocks
        .map(row => ({
          id: String(row?.id || ""),
          updated: normalizeUpdatedValue(row?.updated),
        }))
        .filter(row => row.id)
    : [];
  const changedBlockIds = Array.from(
    new Set(normalizedChangedBlocks.slice(0, limit).map(row => row.id))
  );
  const hierarchyStartedAt = Date.now();
  const rowsWithHierarchy = await enrichTaskHierarchy(limitedRows);
  rowsWithHierarchy.sort(compareTaskRowsByUpdatedDesc);

  return {
    rows: rowsWithHierarchy,
    changedBlockIds,
    highWatermarkUpdated: normalizedChangedBlocks.reduce<string | undefined>((latest, row) => {
      if (!row.updated) return latest;
      return !latest || row.updated > latest ? row.updated : latest;
    }, undefined),
    elapsedMs: Date.now() - startedAt,
    hierarchyElapsedMs: Date.now() - hierarchyStartedAt,
    totalScanned: changedBlockIds.length,
    partial: normalizedRows.length > limit || normalizedChangedBlocks.length > limit,
    source: "kernel",
  };
}

async function refreshTaskIndex(params: KernelTaskListParams | number = {}): Promise<TaskIndexResult> {
  const normalizedParams = normalizeTaskListParams(params);
  const requestedLimit = clampTaskLimit(normalizedParams.limit);
  const cacheKey = buildTaskIndexCacheKey(normalizedParams);
  const result = await queryTaskRows({
    ...normalizedParams,
    blockIds: undefined,
    limit: MAX_TASK_LIMIT,
  });
  const entry = {
    rows: result.rows,
    refreshedAt: Date.now(),
    elapsedMs: result.elapsedMs,
    hierarchyElapsedMs: result.hierarchyElapsedMs,
    pageCount: result.pageCount,
    partial: result.partial,
    fullRefreshedAt: Date.now(),
    highWatermarkUpdated: getHighWatermarkUpdated(result.rows),
  };
  taskIndexCache.set(cacheKey, entry);

  return {
    ...result,
    rows: entry.rows.slice(0, requestedLimit),
    cached: false,
    refreshedAt: entry.refreshedAt,
    fullRefreshedAt: entry.fullRefreshedAt,
    highWatermarkUpdated: entry.highWatermarkUpdated,
  };
}

async function refreshTaskIndexIncremental(params: KernelTaskListParams | number = {}): Promise<TaskIndexResult> {
  const normalizedParams = normalizeTaskListParams(params);
  const requestedLimit = clampTaskLimit(normalizedParams.limit);
  const cacheKey = buildTaskIndexCacheKey(normalizedParams);
  const entry = taskIndexCache.get(cacheKey);
  if (!entry?.highWatermarkUpdated) {
    return refreshTaskIndex(normalizedParams);
  }

  const changed = await queryChangedTaskRows({
    ...normalizedParams,
    blockIds: undefined,
    limit: MAX_TASK_LIMIT,
    sinceUpdated: entry.highWatermarkUpdated,
  });
  if (changed.partial) {
    return refreshTaskIndex(normalizedParams);
  }
  const rowsById = new Map<string, KernelTaskRow>();
  for (const row of entry.rows) {
    rowsById.set(row.id, row);
  }
  const changedBlockIds = new Set(changed.changedBlockIds ?? changed.rows.map(row => row.id));
  const existingBlockIds = await queryExistingBlockIds(Array.from(rowsById.keys()));
  for (const blockId of rowsById.keys()) {
    if (!existingBlockIds.has(blockId)) {
      changedBlockIds.add(blockId);
    }
  }
  for (const blockId of changedBlockIds) {
    rowsById.delete(blockId);
  }
  for (const row of changed.rows) {
    if (doesTaskRowMatchParams(row, normalizedParams)) {
      rowsById.set(row.id, row);
    }
  }

  const mergedRows = Array.from(rowsById.values()).sort(compareTaskRowsByUpdatedDesc);
  const refreshedAt = Date.now();
  const nextEntry: TaskIndexCacheEntry = {
    rows: mergedRows,
    refreshedAt,
    elapsedMs: changed.elapsedMs,
    hierarchyElapsedMs: changed.hierarchyElapsedMs,
    pageCount: changed.pageCount ?? entry.pageCount,
    partial: entry.partial || changed.partial,
    fullRefreshedAt: entry.fullRefreshedAt,
    highWatermarkUpdated: changed.highWatermarkUpdated
      || getHighWatermarkUpdated(mergedRows)
      || entry.highWatermarkUpdated,
  };
  taskIndexCache.set(cacheKey, nextEntry);

  return {
    rows: nextEntry.rows.slice(0, requestedLimit),
    elapsedMs: changed.elapsedMs,
    indexElapsedMs: changed.elapsedMs,
    hierarchyElapsedMs: changed.hierarchyElapsedMs,
    pageCount: changed.pageCount,
    totalScanned: changed.totalScanned,
    partial: nextEntry.partial,
    source: "kernel",
    cached: false,
    incremental: true,
    changedRows: changedBlockIds.size,
    refreshedAt: nextEntry.refreshedAt,
    fullRefreshedAt: nextEntry.fullRefreshedAt,
    highWatermarkUpdated: nextEntry.highWatermarkUpdated,
  };
}

async function getTaskIndex(params: KernelTaskListParams | number = {}): Promise<TaskIndexResult> {
  const normalizedParams = normalizeTaskListParams(params);
  const blockIds = normalizeBlockIds(normalizedParams.blockIds);
  if (blockIds.length > 0) {
    return queryTaskRowsByBlockIds({
      ...normalizedParams,
      blockIds,
    });
  }

  const now = Date.now();
  const limit = clampTaskLimit(normalizedParams.limit);
  const cacheKey = buildTaskIndexCacheKey(normalizedParams);
  const entry = taskIndexCache.get(cacheKey);
  const isFresh = entry && now - entry.refreshedAt < TASK_INDEX_TTL_MS;
  const needsFullRefresh = entry && now - entry.fullRefreshedAt >= TASK_INDEX_FULL_REFRESH_MS;
  const hasEnoughRows = Boolean(entry && (!entry.partial || entry.rows.length >= limit));

  if (normalizedParams.force || !entry || needsFullRefresh || !hasEnoughRows) {
    return refreshTaskIndex(normalizedParams);
  }

  if (!isFresh) {
    return refreshTaskIndexIncremental(normalizedParams);
  }

  return {
    rows: entry.rows.slice(0, limit),
    elapsedMs: 0,
    indexElapsedMs: entry.elapsedMs,
    hierarchyElapsedMs: entry.hierarchyElapsedMs,
    pageCount: entry.pageCount,
    partial: entry.partial,
    source: "kernel",
    cached: true,
    refreshedAt: entry.refreshedAt,
    fullRefreshedAt: entry.fullRefreshedAt,
    highWatermarkUpdated: entry.highWatermarkUpdated,
    ageMs: now - entry.refreshedAt,
  };
}

async function getTaskRowsByBlockIds(params: KernelTaskListParams | string[] = {}) {
  const normalizedParams = Array.isArray(params)
    ? { blockIds: params }
    : normalizeTaskListParams(params);
  return queryTaskRowsByBlockIds(normalizedParams);
}

async function getTaskRowsByDateRange(params: KernelTaskListParams = {}) {
  const normalizedParams = normalizeTaskListParams(params);
  const startDate = normalizeDateValue(normalizedParams.startDate);
  const endDate = normalizeDateValue(normalizedParams.endDate || normalizedParams.startDate);
  if (!startDate || !endDate) {
    throw new Error("startDate and endDate must use YYYY-MM-DD format");
  }

  const requestedLimit = clampTaskLimit(normalizedParams.limit);
  const result = await getTaskIndex({
    ...normalizedParams,
    blockIds: undefined,
    limit: MAX_TASK_LIMIT,
  });
  const matchedRows = result.rows
    .filter(row => normalizedParams.includeSubtasks || !row.is_subtask)
    .filter(row => doesTaskRowOverlapDateRange(row, startDate, endDate))
    .sort(compareTaskRowsByUpdatedDesc);
  const rows = matchedRows.slice(0, requestedLimit);

  return {
    ...result,
    rows,
    totalMatched: matchedRows.length,
  };
}

async function getTaskStats(params: KernelTaskListParams = {}): Promise<TaskStatsResult> {
  const startedAt = Date.now();
  const normalizedParams = normalizeTaskListParams(params);
  const today = formatLocalDate(new Date());
  const result = await getTaskIndex({
    ...normalizedParams,
    blockIds: undefined,
    limit: MAX_TASK_LIMIT,
  });
  const sourceRows = normalizeDateValue(normalizedParams.startDate)
    ? result.rows.filter(row => doesTaskRowOverlapDateRange(
        row,
        normalizeDateValue(normalizedParams.startDate),
        normalizeDateValue(normalizedParams.endDate || normalizedParams.startDate) || normalizeDateValue(normalizedParams.startDate),
      ))
    : result.rows;
  const rows = normalizedParams.includeSubtasks
    ? sourceRows
    : sourceRows.filter(row => !row.is_subtask);
  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  let completedRows = 0;
  let archivedRows = 0;
  let dueTodayRows = 0;
  let overdueRows = 0;
  let withDateRows = 0;

  for (const row of rows) {
    const status = resolveTaskRowStatus(row);
    const priority = normalizeScopeValue(row.custom_task_priority) || "none";
    const archived = isTaskRowArchived(row);
    const dateBounds = getTaskRowDateBounds(row);
    byStatus[status] = (byStatus[status] || 0) + 1;
    byPriority[priority] = (byPriority[priority] || 0) + 1;

    if (status === "completed") {
      completedRows += 1;
    }
    if (archived) {
      archivedRows += 1;
    }
    if (dateBounds) {
      withDateRows += 1;
      if (dateBounds.endDate === today) {
        dueTodayRows += 1;
      }
      if (dateBounds.endDate < today && status !== "completed" && !archived) {
        overdueRows += 1;
      }
    }
  }

  const subtaskRows = rows.filter(row => row.is_subtask).length;
  return {
    totalRows: rows.length,
    topLevelRows: rows.length - subtaskRows,
    subtaskRows,
    completedRows,
    openRows: rows.length - completedRows,
    archivedRows,
    dueTodayRows,
    overdueRows,
    withDateRows,
    byStatus,
    byPriority,
    elapsedMs: Date.now() - startedAt,
    indexElapsedMs: result.indexElapsedMs ?? result.elapsedMs,
    hierarchyElapsedMs: result.hierarchyElapsedMs,
    pageCount: result.pageCount,
    totalScanned: result.totalScanned,
    partial: result.partial,
    source: "kernel",
    cached: result.cached,
    refreshedAt: result.refreshedAt,
    ageMs: result.ageMs,
  };
}

async function getBlockDOMBatch(
  params: { ids?: string[] } = {}
): Promise<KernelBlockDOMBatchResult> {
  const startedAt = Date.now();
  const ids = normalizeBlockIds(params.ids).slice(0, MAX_BLOCK_DOM_BATCH_SIZE);
  const blocks: KernelBlockDOMBatchResult["blocks"] = [];
  const failedIds: string[] = [];
  let nextIndex = 0;

  const worker = async (): Promise<void> => {
    while (nextIndex < ids.length) {
      const id = ids[nextIndex++];
      try {
        const response = await siyuan.client.fetch("/api/block/getBlockDOM", {
          method: "POST",
          body: JSON.stringify({ id }),
        });
        const payload = await response.json() as SqlResponse<Record<string, unknown>>;
        if (payload?.code !== 0 || !payload.data || typeof payload.data.dom !== "string") {
          failedIds.push(id);
          continue;
        }
        blocks.push({ id, data: payload.data });
      } catch {
        failedIds.push(id);
      }
    }
  };

  const workerCount = Math.min(BLOCK_DOM_BATCH_CONCURRENCY, ids.length);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return {
    blocks,
    failedIds,
    elapsedMs: Date.now() - startedAt,
    source: "kernel",
  };
}

siyuan.plugin.lifecycle.onload = async () => {
  await siyuan.rpc.bind("ping", () => ({
    ok: true,
    source: "kernel",
    now: Date.now(),
  }), "Check whether the Pinch kernel plugin is running");

  await siyuan.rpc.bind("refreshTaskIndex", refreshTaskIndex, "Refresh the cached lightweight task index");
  await siyuan.rpc.bind("refreshTaskIndexIncremental", refreshTaskIndexIncremental, "Incrementally refresh the cached lightweight task index");
  await siyuan.rpc.bind("getTaskIndex", getTaskIndex, "Get the cached lightweight task index");
  await siyuan.rpc.bind("getTaskRowsByBlockIds", getTaskRowsByBlockIds, "Get lightweight task rows by block IDs");
  await siyuan.rpc.bind("getTaskRowsByDateRange", getTaskRowsByDateRange, "Get lightweight task rows in a date range");
  await siyuan.rpc.bind("getTaskStats", getTaskStats, "Get lightweight task statistics");
  await siyuan.rpc.bind("getBlockDOMBatch", getBlockDOMBatch, "Get block DOM for multiple block IDs");
};

if ("onrunning" in siyuan.plugin.lifecycle) {
  siyuan.plugin.lifecycle.onrunning = () => {};
}

siyuan.plugin.lifecycle.onunload = async () => {
  await siyuan.rpc.unbind("ping");
  await siyuan.rpc.unbind("refreshTaskIndex");
  await siyuan.rpc.unbind("refreshTaskIndexIncremental");
  await siyuan.rpc.unbind("getTaskIndex");
  await siyuan.rpc.unbind("getTaskRowsByBlockIds");
  await siyuan.rpc.unbind("getTaskRowsByDateRange");
  await siyuan.rpc.unbind("getTaskStats");
  await siyuan.rpc.unbind("getBlockDOMBatch");
};
