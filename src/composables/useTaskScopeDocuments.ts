import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { sql, type Task } from '@/api';
import {
  getDocumentCreationSortKey,
  loadRootDocumentMetadata,
  normalizeNotebookIds,
  resolveDocumentDisplayName
} from '@/utils/taskViewShared';
import {
  buildGoalScopeDocumentsFromTasks,
  type GoalScopeDocument
} from '@/utils/goalScopeDocuments';

export interface TaskScopeTaskDocument {
  id: string;
  name: string;
  notebookId: string;
  path?: string;
}

export interface TaskScopeDialogDocument extends TaskScopeTaskDocument {
  notebookName: string;
}

interface UseTaskScopeDocumentsOptions {
  excludedNotebookIds: Ref<string[]> | ComputedRef<string[]>;
  showCompletedTasks: Ref<boolean> | ComputedRef<boolean>;
  enabledNotebookNameById: Ref<Map<string, string>> | ComputedRef<Map<string, string>>;
  tasks: Ref<Task[]> | ComputedRef<Task[]>;
  goalDocuments: Ref<GoalScopeDocument[]> | ComputedRef<GoalScopeDocument[]>;
  extraDocuments?: Ref<TaskScopeTaskDocument[]> | ComputedRef<TaskScopeTaskDocument[]>;
  resolveDocumentName?: (document: TaskScopeTaskDocument) => string;
  cacheTtl?: number;
  logPrefix?: string;
}

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

function buildDocumentKey(notebookId: string, documentId: string): string {
  return `${notebookId}:${documentId}`;
}

function compareTaskDocuments(left: TaskScopeTaskDocument, right: TaskScopeTaskDocument): number {
  const timeDiff = getDocumentCreationSortKey(right.id) - getDocumentCreationSortKey(left.id);
  if (timeDiff !== 0) {
    return timeDiff;
  }
  return left.name.localeCompare(right.name, 'zh-CN');
}

function compareDialogDocuments(left: TaskScopeDialogDocument, right: TaskScopeDialogDocument): number {
  const idA = left.id || '';
  const idB = right.id || '';
  if (idA !== idB) {
    return idB.localeCompare(idA);
  }
  const notebookDiff = left.notebookName.localeCompare(right.notebookName, 'zh-CN');
  if (notebookDiff !== 0) {
    return notebookDiff;
  }
  return left.name.localeCompare(right.name, 'zh-CN');
}

function compareGoalDocuments(left: GoalScopeDocument, right: GoalScopeDocument): number {
  const idA = left.id || '';
  const idB = right.id || '';
  if (idA !== idB) {
    return idB.localeCompare(idA);
  }
  const notebookDiff = left.notebookName.localeCompare(right.notebookName, 'zh-CN');
  if (notebookDiff !== 0) {
    return notebookDiff;
  }
  return left.name.localeCompare(right.name, 'zh-CN');
}

function mergeTaskDocument(
  target: Map<string, TaskScopeTaskDocument>,
  document: TaskScopeTaskDocument,
  resolveDocumentName?: (document: TaskScopeTaskDocument) => string
): void {
  const notebookId = typeof document.notebookId === 'string' ? document.notebookId.trim() : '';
  const documentId = typeof document.id === 'string' ? document.id.trim() : '';
  if (!notebookId || !documentId) {
    return;
  }

  const key = buildDocumentKey(notebookId, documentId);
  const name = resolveDocumentName ? resolveDocumentName(document) : document.name;
  const normalizedDocument: TaskScopeTaskDocument = {
    ...document,
    id: documentId,
    notebookId,
    name: name || documentId
  };
  const existing = target.get(key);
  if (!existing) {
    target.set(key, normalizedDocument);
    return;
  }

  target.set(key, {
    ...existing,
    name: existing.name && existing.name !== existing.id ? existing.name : normalizedDocument.name,
    path: existing.path || normalizedDocument.path
  });
}

function mergeGoalDocument(target: Map<string, GoalScopeDocument>, document: GoalScopeDocument): void {
  const notebookId = typeof document.notebookId === 'string' ? document.notebookId.trim() : '';
  const documentId = typeof document.id === 'string' ? document.id.trim() : '';
  if (!notebookId || !documentId) {
    return;
  }

  const key = buildDocumentKey(notebookId, documentId);
  const existing = target.get(key);
  if (!existing) {
    target.set(key, {
      ...document,
      id: documentId,
      notebookId
    });
    return;
  }

  target.set(key, {
    ...existing,
    name: existing.name && existing.name !== existing.id ? existing.name : document.name,
    notebookName: existing.notebookName && existing.notebookName !== existing.notebookId
      ? existing.notebookName
      : document.notebookName,
    path: existing.path || document.path
  });
}

export function useTaskScopeDocuments(options: UseTaskScopeDocumentsOptions) {
  const taskDocumentsByNotebook = ref<Map<string, TaskScopeTaskDocument[]>>(new Map());
  let lastRefreshAt = 0;
  let refreshTimer: number | null = null;
  const cacheTtl = options.cacheTtl ?? 60000;
  const logPrefix = options.logPrefix || '[TaskScopeDocuments]';

  const allDocuments = computed<TaskScopeTaskDocument[]>(() => {
    const documentsByKey = new Map<string, TaskScopeTaskDocument>();

    for (const documents of taskDocumentsByNotebook.value.values()) {
      for (const document of documents) {
        mergeTaskDocument(documentsByKey, document, options.resolveDocumentName);
      }
    }

    for (const document of options.extraDocuments?.value || []) {
      mergeTaskDocument(documentsByKey, document, options.resolveDocumentName);
    }

    return Array.from(documentsByKey.values()).sort(compareTaskDocuments);
  });

  const allDocumentsByKey = computed(() => {
    const nextMap = new Map<string, TaskScopeTaskDocument>();
    for (const document of allDocuments.value) {
      nextMap.set(buildDocumentKey(document.notebookId, document.id), document);
    }
    return nextMap;
  });

  const documentGroupDialogDocuments = computed<TaskScopeDialogDocument[]>(() =>
    allDocuments.value
      .map(document => ({
        id: document.id,
        name: options.resolveDocumentName ? options.resolveDocumentName(document) : document.name,
        notebookId: document.notebookId,
        notebookName: options.enabledNotebookNameById.value.get(document.notebookId) || document.notebookId,
        path: document.path
      }))
      .sort(compareDialogDocuments)
  );

  const goalScopeDocuments = computed<GoalScopeDocument[]>(() => {
    const documentsByKey = new Map<string, GoalScopeDocument>();

    for (const document of options.goalDocuments.value || []) {
      mergeGoalDocument(documentsByKey, document);
    }

    for (const document of allDocuments.value) {
      mergeGoalDocument(documentsByKey, {
        id: document.id,
        name: options.resolveDocumentName ? options.resolveDocumentName(document) : document.name,
        notebookId: document.notebookId,
        notebookName: options.enabledNotebookNameById.value.get(document.notebookId) || document.notebookId,
        path: document.path
      });
    }

    for (const document of buildGoalScopeDocumentsFromTasks(options.tasks.value, options.enabledNotebookNameById.value)) {
      mergeGoalDocument(documentsByKey, document);
    }

    return Array.from(documentsByKey.values()).sort(compareGoalDocuments);
  });

  function buildScopeSql(alias: string = 'b'): string {
    const excluded = normalizeNotebookIds(options.excludedNotebookIds.value);
    if (excluded.length === 0) {
      return '';
    }
    const idsClause = excluded.map(id => `'${escapeSqlLiteral(id)}'`).join(',');
    return ` AND ${alias}.box NOT IN (${idsClause})`;
  }

  function buildCompletionSql(alias: string = 'b'): string {
    if (options.showCompletedTasks.value) {
      return ` AND (${alias}.markdown LIKE '%[ ]%' OR ${alias}.markdown LIKE '%[x]%' OR ${alias}.markdown LIKE '%[X]%')`;
    }
    return ` AND ${alias}.markdown LIKE '%[ ]%'`;
  }

  function buildArchiveSql(alias: string = 'b'): string {
    const archivedValueSql = "('1', 'true', 'TRUE', 'yes', 'YES')";
    return `
        AND NOT EXISTS (
          SELECT 1 FROM attributes archived_attr
          WHERE archived_attr.block_id = ${alias}.id
            AND archived_attr.name = 'custom-task-archived'
            AND archived_attr.value IN ${archivedValueSql}
        )`;
  }

  async function refreshTaskDocumentOptions(force = false): Promise<void> {
    if (
      !force &&
      taskDocumentsByNotebook.value.size > 0 &&
      Date.now() - lastRefreshAt < cacheTtl
    ) {
      return;
    }

    try {
      const rows = await sql(`
      SELECT b.box, b.root_id, MIN(b.hpath) as hpath
      FROM blocks b
      WHERE (b.type = 'i' OR b.type = 'p')
        ${buildScopeSql('b')}
        AND b.subtype = 't'
        ${buildCompletionSql('b')}
        ${buildArchiveSql('b')}
      GROUP BY b.box, b.root_id
      ORDER BY b.box, b.root_id
    `) as Array<{ box?: string; root_id?: string; hpath?: string }>;
      const fallbackMetadataByRootId = await loadRootDocumentMetadata(
        (rows || [])
          .filter(row => typeof row?.hpath !== 'string' || row.hpath.trim().length === 0)
          .map(row => typeof row?.root_id === 'string' ? row.root_id : '')
      );

      const nextMap = new Map<string, TaskScopeTaskDocument[]>();
      for (const row of rows || []) {
        const notebookId = typeof row?.box === 'string' ? row.box.trim() : '';
        const rootId = typeof row?.root_id === 'string' ? row.root_id.trim() : '';
        if (!notebookId || !rootId) {
          continue;
        }

        const fallbackMetadata = fallbackMetadataByRootId.get(rootId);
        const rawPath = typeof row?.hpath === 'string' && row.hpath.trim().length > 0
          ? row.hpath.trim()
          : fallbackMetadata?.path || '';
        const documents = nextMap.get(notebookId) || [];
        documents.push({
          id: rootId,
          name: resolveDocumentDisplayName({
            id: rootId,
            name: fallbackMetadata?.name,
            path: rawPath
          }),
          notebookId,
          path: rawPath || undefined
        });
        nextMap.set(notebookId, documents);
      }

      nextMap.forEach((documents, notebookId) => {
        const dedupById = new Map<string, TaskScopeTaskDocument>();
        for (const document of documents) {
          if (!dedupById.has(document.id)) {
            dedupById.set(document.id, document);
          }
        }
        nextMap.set(notebookId, Array.from(dedupById.values()).sort(compareTaskDocuments));
      });

      taskDocumentsByNotebook.value = nextMap;
      lastRefreshAt = Date.now();
    } catch (error) {
      console.error(`${logPrefix} failed to refresh task document options`, error);
      taskDocumentsByNotebook.value = new Map();
      lastRefreshAt = 0;
    }
  }

  function scheduleTaskDocumentOptionsRefresh(delay = 640): void {
    if (typeof window === 'undefined') {
      void refreshTaskDocumentOptions(true);
      return;
    }

    if (refreshTimer !== null) {
      clearTimeout(refreshTimer);
    }

    refreshTimer = window.setTimeout(() => {
      refreshTimer = null;
      void refreshTaskDocumentOptions(true);
    }, delay);
  }

  function clearTaskDocumentOptionsRefreshTimer(): void {
    if (refreshTimer !== null) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  }

  return {
    taskDocumentsByNotebook,
    allDocuments,
    allDocumentsByKey,
    documentGroupDialogDocuments,
    goalScopeDocuments,
    refreshTaskDocumentOptions,
    scheduleTaskDocumentOptionsRefresh,
    clearTaskDocumentOptionsRefreshTimer
  };
}
