import { lsNotebooks, sql, type Task } from '@/api';
import { loadRootDocumentMetadata, resolveDocumentDisplayName } from './taskViewShared';

export interface GoalScopeDocument {
  id: string;
  name: string;
  notebookId: string;
  notebookName: string;
  path?: string;
}

function buildDocumentKey(notebookId: string, documentId: string): string {
  return `${notebookId}:${documentId}`;
}

function sortGoalScopeDocuments(documents: GoalScopeDocument[]): GoalScopeDocument[] {
  return documents.sort((left, right) => {
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
  });
}

function upsertGoalScopeDocument(
  documents: GoalScopeDocument[],
  seen: Set<string>,
  document: GoalScopeDocument
): void {
  const key = buildDocumentKey(document.notebookId, document.id);
  if (seen.has(key)) {
    return;
  }
  seen.add(key);
  documents.push(document);
}

export function buildGoalScopeDocumentsFromTasks(
  tasks: Task[],
  notebookNameById: Map<string, string> = new Map()
): GoalScopeDocument[] {
  const documents: GoalScopeDocument[] = [];
  const seen = new Set<string>();

  for (const task of tasks || []) {
    if (task.type !== 'block') {
      continue;
    }

    const notebookId = typeof task.notebookId === 'string' ? task.notebookId.trim() : '';
    const documentId = typeof task.rootId === 'string' ? task.rootId.trim() : '';
    if (!notebookId || !documentId) {
      continue;
    }

    const path = typeof task.hPath === 'string' && task.hPath.trim().length > 0
      ? task.hPath.trim()
      : '';
    upsertGoalScopeDocument(documents, seen, {
      id: documentId,
      name: resolveDocumentDisplayName({ id: documentId, path }),
      notebookId,
      notebookName: notebookNameById.get(notebookId) || notebookId,
      path: path || undefined
    });
  }

  return sortGoalScopeDocuments(documents);
}

export async function loadGoalScopeDocuments(extraTasks: Task[] = []): Promise<GoalScopeDocument[]> {
  try {
    const [notebookResult, rows] = await Promise.all([
      lsNotebooks(),
      sql(`
        SELECT b.box, b.root_id, MIN(b.hpath) as hpath
        FROM blocks b
        WHERE (b.type = 'i' OR b.type = 'p')
          AND b.subtype = 't'
        GROUP BY b.box, b.root_id
        ORDER BY b.box, b.root_id
      `) as Promise<Array<{ box?: string; root_id?: string; hpath?: string }>>
    ]);

    const notebookNameById = new Map(
      (notebookResult?.notebooks || [])
        .filter(notebook => !notebook.closed)
        .map(notebook => [notebook.id, notebook.name])
    );
    const fallbackMetadataByRootId = await loadRootDocumentMetadata(
      (rows || [])
        .filter(row => typeof row?.hpath !== 'string' || row.hpath.trim().length === 0)
        .map(row => typeof row?.root_id === 'string' ? row.root_id : '')
    );
    const documents: GoalScopeDocument[] = [];
    const seen = new Set<string>();

    for (const row of rows || []) {
      const notebookId = typeof row?.box === 'string' ? row.box.trim() : '';
      const documentId = typeof row?.root_id === 'string' ? row.root_id.trim() : '';
      if (!notebookId || !documentId) {
        continue;
      }

      const fallbackMetadata = fallbackMetadataByRootId.get(documentId);
      const path = typeof row?.hpath === 'string' && row.hpath.trim().length > 0
        ? row.hpath.trim()
        : fallbackMetadata?.path || '';
      upsertGoalScopeDocument(documents, seen, {
        id: documentId,
        name: resolveDocumentDisplayName({ id: documentId, name: fallbackMetadata?.name, path }),
        notebookId,
        notebookName: notebookNameById.get(notebookId) || notebookId,
        path: path || undefined
      });
    }

    for (const document of buildGoalScopeDocumentsFromTasks(extraTasks, notebookNameById)) {
      upsertGoalScopeDocument(documents, seen, document);
    }

    return sortGoalScopeDocuments(documents);
  } catch (error) {
    console.error('[Goals] loadGoalScopeDocuments: load failed', error);
    return buildGoalScopeDocumentsFromTasks(extraTasks);
  }
}
