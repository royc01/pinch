import { lsNotebooks, sql } from '@/api';

export interface GoalScopeDocument {
  id: string;
  name: string;
  notebookId: string;
  notebookName: string;
  path?: string;
}

function resolveDocumentName(path: string, fallbackId: string): string {
  const trimmedPath = path.trim();
  if (!trimmedPath) {
    return fallbackId;
  }

  const segments = trimmedPath.split('/').filter(Boolean);
  return segments[segments.length - 1] || trimmedPath || fallbackId;
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

      const path = typeof row?.hpath === 'string' ? row.hpath.trim() : '';
      documents.push({
        id: documentId,
        name: resolveDocumentName(path, documentId),
        notebookId,
        notebookName: notebookNameById.get(notebookId) || notebookId,
        path: path || undefined
      });
    }

    return documents.sort((left, right) => {
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
