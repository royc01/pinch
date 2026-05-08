import { appendBlock, deleteBlock, setBlockAttrs, sql, type Habit } from '@/api';

export interface CheckinLogOptions {
  habit: Habit;
  date: string;
  note?: string;
  completedCount?: number;
  targetCount?: number;
}

export function useHabitCheckinLog() {
  const formatDateDot = (dateStr: string): string => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[0]}.${parts[1]}.${parts[2]}`;
    }
    return dateStr;
  };

  const formatCheckinLog = (options: CheckinLogOptions): string => {
    const { date, note, completedCount, targetCount } = options;
    const displayDate = formatDateDot(date);

    let log = `* ${displayDate}`;

    if (completedCount !== undefined && targetCount !== undefined && targetCount > 1) {
      log += ` (${completedCount}/${targetCount})`;
    }

    if (note && note.trim()) {
      log += `\n  * ${note.trim()}`;
    }

    return log;
  };

  const findCheckinNodeListId = async (docId: string, date: string, habitId: string): Promise<string | null> => {
    try {
      const results = await sql(`
        SELECT a.block_id
        FROM attributes AS a
        WHERE a.root_id = '${docId.replace(/'/g, "''")}'
        AND a.name = 'custom-checkin-date'
        AND a.value = '${date.replace(/'/g, "''")}'
        AND a.block_id IN (
          SELECT a2.block_id
          FROM attributes AS a2
          WHERE a2.name = 'custom-checkin-habit-id'
          AND a2.value = '${habitId.replace(/'/g, "''")}'
        )
        LIMIT 1
      `);

      if (results && results.length > 0) {
        return results[0].block_id;
      }
    } catch (error) {
      console.error('[HabitCheckinLog] findCheckinNodeListId failed:', error);
    }
    return null;
  };

  const getExistingNote = async (docId: string, date: string, habitId: string): Promise<string | null> => {
    try {
      const nodeListId = await findCheckinNodeListId(docId, date, habitId);
      if (!nodeListId) return null;

      const childItems = await sql(`
        SELECT id, content
        FROM blocks
        WHERE parent_id = '${nodeListId.replace(/'/g, "''")}'
        AND type = 'i'
        ORDER BY id ASC
      `);

      if (!childItems || childItems.length === 0) return null;

      const noteParts: string[] = [];
      for (const item of childItems) {
        const subLists = await sql(`
          SELECT id
          FROM blocks
          WHERE parent_id = '${item.id.replace(/'/g, "''")}'
          AND type = 'l'
          ORDER BY id ASC
        `);

        if (subLists && subLists.length > 0) {
          for (const subList of subLists) {
            const subItems = await sql(`
              SELECT content
              FROM blocks
              WHERE parent_id = '${subList.id.replace(/'/g, "''")}'
              AND type = 'i'
              ORDER BY id ASC
            `);
            if (subItems) {
              for (const si of subItems) {
                if (si.content && si.content.trim()) {
                  noteParts.push(si.content.trim());
                }
              }
            }
          }
        }
      }

      return noteParts.length > 0 ? noteParts.join('\n') : null;
    } catch (error) {
      console.error('[HabitCheckinLog] getExistingNote failed:', error);
    }
    return null;
  };

  const findParentNodeList = async (blockId: string): Promise<string | null> => {
    try {
      const results = await sql(`
        SELECT parent_id, type
        FROM blocks
        WHERE id = '${blockId.replace(/'/g, "''")}'
        LIMIT 1
      `);

      if (results && results.length > 0) {
        const { parent_id, type } = results[0];
        if (type === 'l') {
          return blockId;
        }
        if (parent_id) {
          const parent = await sql(`
            SELECT id, type
            FROM blocks
            WHERE id = '${parent_id.replace(/'/g, "''")}'
            LIMIT 1
          `);
          if (parent && parent.length > 0 && parent[0].type === 'l') {
            return parent[0].id;
          }
        }
      }
    } catch (error) {
      console.error('[HabitCheckinLog] findParentNodeList failed:', error);
    }
    return null;
  };

  const findNewlyCreatedNodeList = async (docId: string): Promise<string | null> => {
    try {
      const now = new Date();
      const timeStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

      const results = await sql(`
        SELECT id
        FROM blocks
        WHERE root_id = '${docId.replace(/'/g, "''")}'
        AND type = 'l'
        AND created >= '${timeStr}'
        ORDER BY created DESC
        LIMIT 1
      `);

      if (results && results.length > 0) {
        return results[0].id;
      }

      const fallback = await sql(`
        SELECT id
        FROM blocks
        WHERE root_id = '${docId.replace(/'/g, "''")}'
        AND type = 'l'
        ORDER BY created DESC
        LIMIT 1
      `);

      if (fallback && fallback.length > 0) {
        return fallback[0].id;
      }
    } catch (error) {
      console.error('[HabitCheckinLog] findNewlyCreatedNodeList failed:', error);
    }
    return null;
  };

  const extractBlockIdFromOps = (result: any[]): string | null => {
    if (!result || result.length === 0) return null;

    for (const res of result) {
      const ops = res.doOperations || [];
      for (const op of ops) {
        if (op.id) {
          if (op.objectType === 'NodeList') {
            return op.id;
          }
          if (op.data && typeof op.data === 'string') {
            const parser = new DOMParser();
            const doc = parser.parseFromString(op.data, 'text/html');
            const nodeList = doc.querySelector('[data-type="NodeList"]');
            if (nodeList) {
              return nodeList.getAttribute('data-node-id') || null;
            }
          }
        }
      }

      for (const op of ops) {
        if (op.id) {
          return op.id;
        }
      }
    }

    return null;
  };

  const writeCheckinLogToDoc = async (docId: string, options: CheckinLogOptions): Promise<boolean> => {
    try {
      const existingNodeListId = await findCheckinNodeListId(docId, options.date, options.habit.id);

      if (existingNodeListId) {
        await deleteBlock(existingNodeListId);
      }

      const logContent = formatCheckinLog(options);
      const result = await appendBlock('markdown', logContent, docId);

      let nodeListBlockId: string | null = extractBlockIdFromOps(result);

      if (nodeListBlockId) {
        const blockInfo = await sql(`
          SELECT type
          FROM blocks
          WHERE id = '${nodeListBlockId.replace(/'/g, "''")}'
          LIMIT 1
        `);

        if (blockInfo && blockInfo.length > 0 && blockInfo[0].type !== 'l') {
          const parentId = await findParentNodeList(nodeListBlockId);
          if (parentId) {
            nodeListBlockId = parentId;
          }
        }
      }

      if (!nodeListBlockId) {
        nodeListBlockId = await findNewlyCreatedNodeList(docId);
      }

      if (nodeListBlockId) {
        const timestamp = Date.now();
        await setBlockAttrs(nodeListBlockId, {
          'custom-checkin-timestamp': String(timestamp),
          'custom-checkin-date': options.date,
          'custom-checkin-habit-id': options.habit.id
        });
      }

      return true;
    } catch (error) {
      console.error('[HabitCheckinLog] writeCheckinLogToDoc failed:', error);
      return false;
    }
  };

  const getMonthCheckinNotes = async (
    docId: string,
    habitId: string,
    year: number,
    month: number
  ): Promise<{ date: string; note: string }[]> => {
    try {
      const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
      const monthEnd = `${year}-${String(month).padStart(2, '0')}-31`;

      const results = await sql(`
        SELECT a.value AS checkin_date, a.block_id
        FROM attributes AS a
        WHERE a.root_id = '${docId.replace(/'/g, "''")}'
        AND a.name = 'custom-checkin-date'
        AND a.value >= '${monthStart}'
        AND a.value <= '${monthEnd}'
        AND a.block_id IN (
          SELECT a2.block_id
          FROM attributes AS a2
          WHERE a2.name = 'custom-checkin-habit-id'
          AND a2.value = '${habitId.replace(/'/g, "''")}'
        )
        ORDER BY a.value DESC
      `);

      if (!results || results.length === 0) return [];

      const notes: { date: string; note: string }[] = [];

      for (const row of results) {
        const nodeListId = row.block_id;
        const date = row.checkin_date;

        const childItems = await sql(`
          SELECT id
          FROM blocks
          WHERE parent_id = '${nodeListId.replace(/'/g, "''")}'
          AND type = 'i'
          ORDER BY id ASC
        `);

        if (!childItems || childItems.length === 0) continue;

        const noteParts: string[] = [];
        for (const item of childItems) {
          const subLists = await sql(`
            SELECT id
            FROM blocks
            WHERE parent_id = '${item.id.replace(/'/g, "''")}'
            AND type = 'l'
            ORDER BY id ASC
          `);

          if (subLists && subLists.length > 0) {
            for (const subList of subLists) {
              const subItems = await sql(`
                SELECT content
                FROM blocks
                WHERE parent_id = '${subList.id.replace(/'/g, "''")}'
                AND type = 'i'
                ORDER BY id ASC
              `);
              if (subItems) {
                for (const si of subItems) {
                  if (si.content && si.content.trim()) {
                    noteParts.push(si.content.trim());
                  }
                }
              }
            }
          }
        }

        if (noteParts.length > 0) {
          notes.push({
            date,
            note: noteParts.join('\n')
          });
        }
      }

      return notes;
    } catch (error) {
      console.error('[HabitCheckinLog] getMonthCheckinNotes failed:', error);
      return [];
    }
  };

  return {
    formatCheckinLog,
    writeCheckinLogToDoc,
    findCheckinNodeListId,
    getExistingNote,
    getMonthCheckinNotes
  };
}
