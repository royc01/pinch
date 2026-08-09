import { escapeSqlLiteral } from '@/utils/sql';

export interface AncestorContextRow {
  source_id: string;
  id: string;
  depth: number;
  subtype: string;
}

type SqlExecutor = (statement: string) => Promise<unknown>;

export function normalizeTaskBlockIds(blockIds: string[]): string[] {
  return [...new Set(blockIds.filter((id): id is string => typeof id === 'string' && id.length > 0))];
}

export async function queryTaskAncestorContextRows(
  blockIds: string[],
  executeSql: SqlExecutor
): Promise<AncestorContextRow[]> {
  const normalizedBlockIds = normalizeTaskBlockIds(blockIds);
  if (normalizedBlockIds.length === 0) {
    return [];
  }

  try {
    const idsClause = normalizedBlockIds.map(id => `'${escapeSqlLiteral(id)}'`).join(',');
    const rows = await executeSql(`
      WITH RECURSIVE ancestors(source_id, id, parent_id, depth) AS (
        SELECT id AS source_id, id, parent_id, 0
        FROM blocks
        WHERE id IN (${idsClause})
        UNION ALL
        SELECT ancestors.source_id, b.id, b.parent_id, ancestors.depth + 1
        FROM blocks b
        JOIN ancestors ON ancestors.parent_id = b.id
        WHERE ancestors.parent_id != ''
          AND ancestors.depth < 10
      )
      SELECT ancestors.source_id, ancestors.id, ancestors.depth, b.subtype
      FROM ancestors
      JOIN blocks b ON b.id = ancestors.id
    `);

    if (!Array.isArray(rows)) {
      return [];
    }

    return rows
      .map((row) => ({
        source_id: typeof row?.source_id === 'string' ? row.source_id : '',
        id: typeof row?.id === 'string' ? row.id : '',
        depth: Number(row?.depth),
        subtype: typeof row?.subtype === 'string' ? row.subtype : ''
      }))
      .filter((row) => row.source_id.length > 0 && row.id.length > 0 && Number.isFinite(row.depth));
  } catch {
    return [];
  }
}
