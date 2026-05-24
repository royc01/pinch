import { lsNotebooks, sql } from '@/api';
import { loadRootDocumentMetadata, resolveDocumentDisplayName } from './taskViewShared';

export interface GoalScopeDocument {
  id: string;
  name: string;
  notebookId: string;
  notebookName: string;
  path?: string;
}

export async function loadGoalScopeDocuments(): Promise<GoalScopeDocument[]> {
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

      const key = `${notebookId}:${documentId}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      const fallbackMetadata = fallbackMetadataByRootId.get(documentId);
      const path = typeof row?.hpath === 'string' && row.hpath.trim().length > 0
        ? row.hpath.trim()
        : fallbackMetadata?.path || '';
      documents.push({
        id: documentId,
        name: resolveDocumentDisplayName({ id: documentId, name: fallbackMetadata?.name, path }),
        notebookId,
        notebookName: notebookNameById.get(notebookId) || notebookId,
        path: path || undefined
      });
    }

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
  } catch (error) {
    console.error('[Goals] loadGoalScopeDocuments: load failed', error);
    return [];
  }
}
