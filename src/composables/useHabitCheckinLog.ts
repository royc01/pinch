import { appendBlock, deleteBlock, getBlockDOM, getFocusTimerData, setBlockAttrs, sql, updateBlock, type FocusSessionRecord, type Habit } from '@/api';
import { translate } from '@/composables/useI18n';

export interface CheckinLogOptions {
  habit: Habit;
  date: string;
  note?: string;
  completedCount?: number;
  targetCount?: number;
  focusSummary?: HabitFocusLogSummary | null;
  focusNotes?: HabitFocusNoteItem[];
}

export interface HabitFocusLogSummary {
  minutes: number;
  periods: string[];
}

export interface HabitFocusNoteItem {
  sessionId: string;
  label: string;
  minutes: number;
  note: string;
}

export interface HabitMonthCheckinNote {
  date: string;
  note: string;
  focusNotes?: HabitFocusNoteItem[];
}

export const HABIT_CHECKIN_LOG_CHANGE_EVENT = 'pinch-habit-checkin-log-change';

type CheckinBlockRow = {
  id: string;
  parent_id?: string;
  type?: string;
  content?: string;
  markdown?: string;
};

type NoteItemTarget = {
  itemId: string;
  updateId: string;
  text?: string;
};

type FocusNoteTarget = {
  focusItemId: string;
  label: string;
  minutes: number;
  noteTargets: NoteItemTarget[];
};

type CheckinEntryMatchOptions = Pick<CheckinLogOptions, 'habit' | 'date'>;

type AppendedBlockMeta = {
  listItemId: string;
  listId: string;
  paragraphId: string;
  fallbackId: string;
};

export function useHabitCheckinLog() {
  const escapeSql = (value: string): string => value.replace(/'/g, "''");

  const debugHabitCheckinLog = (_message: string, _data?: Record<string, unknown>): void => {};

  const sleep = (ms: number): Promise<void> => new Promise(resolve => window.setTimeout(resolve, ms));

  const normalizeBlockText = (value: unknown): string => {
    if (typeof value !== 'string') {
      return '';
    }
    return value
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();
  };

  const readElementText = (element: Element | null | undefined): string => {
    const text = element?.textContent?.replace(/\u200b/g, ' ') || '';
    return normalizeBlockText(text);
  };

  const getRowText = (row: CheckinBlockRow | null | undefined): string => (
    normalizeBlockText(row?.markdown) || normalizeBlockText(row?.content)
  );

  const getChildBlocks = async (parentId: string): Promise<CheckinBlockRow[]> => {
    const rows = await sql(`
      SELECT id, parent_id, type, content, markdown
      FROM blocks
      WHERE parent_id = '${escapeSql(parentId)}'
      ORDER BY id ASC
    `);
    return Array.isArray(rows) ? rows : [];
  };

  const getBlockRow = async (blockId: string): Promise<CheckinBlockRow | null> => {
    const rows = await sql(`
      SELECT id, parent_id, type, content, markdown
      FROM blocks
      WHERE id = '${escapeSql(blockId)}'
      LIMIT 1
    `);
    return rows?.[0] || null;
  };

  const resolveEditableTextBlockId = async (blockId: string): Promise<string> => {
    const children = await getChildBlocks(blockId);
    const textChild = children.find(child => (
      child.type !== 'l'
      && (normalizeBlockText(child.markdown) || normalizeBlockText(child.content))
    ));
    return textChild?.id || blockId;
  };

  const getEntryItemText = async (entryItemId: string): Promise<string> => {
    const entryRow = await getBlockRow(entryItemId);
    const entryText = getRowText(entryRow);
    if (entryText) {
      return entryText;
    }

    const editableTextBlockId = await resolveEditableTextBlockId(entryItemId);
    if (editableTextBlockId === entryItemId) {
      return '';
    }

    return getRowText(await getBlockRow(editableTextBlockId));
  };

  const dispatchCheckinLogChange = (detail: { docId: string; date: string; habitId: string }): void => {
    if (typeof window === 'undefined') {
      return;
    }
    window.dispatchEvent(new CustomEvent(HABIT_CHECKIN_LOG_CHANGE_EVENT, { detail }));
  };

  const formatDateDot = (dateStr: string): string => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[0]}.${parts[1]}.${parts[2]}`;
    }
    return dateStr;
  };

  const formatMinutes = (minutes: number): string => {
    const roundedMinutes = Math.max(0, Math.round(minutes));
    if (roundedMinutes < 60) {
      return translate('habitCheckinLog.minutesTemplate').replace('{minutes}', String(roundedMinutes));
    }

    const hours = Math.floor(roundedMinutes / 60);
    const restMinutes = roundedMinutes % 60;
    return restMinutes > 0
      ? translate('habitCheckinLog.hoursMinutesTemplate')
        .replace('{hours}', String(hours))
        .replace('{minutes}', String(restMinutes))
      : translate('habitCheckinLog.hoursTemplate').replace('{hours}', String(hours));
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const formatFocusPeriod = (record: FocusSessionRecord): string | null => {
    const minutes = Math.max(0, Math.round(Number(record.minutes) || 0));
    const end = Number(record.timestamp);
    if (minutes <= 0 || !Number.isFinite(end)) {
      return null;
    }

    const start = end - minutes * 60 * 1000;
    return `${formatTime(start)}-${formatTime(end)}`;
  };

  const getFocusSessionId = (record: FocusSessionRecord): string => {
    const rawId = typeof record.id === 'string' ? record.id.trim() : '';
    if (rawId) {
      return rawId;
    }
    return [
      record.targetId || 'habit',
      record.date,
      String(record.timestamp || 0),
      String(record.minutes || 0)
    ].join('-');
  };

  const formatFocusSessionLabel = (record: FocusSessionRecord): string => {
    const period = formatFocusPeriod(record);
    const minutes = formatMinutes(Math.max(0, Math.round(Number(record.minutes) || 0)));
    return period ? `${period} ・ ${minutes}` : minutes;
  };

  const getHabitFocusRecords = async (habit: Habit, date: string): Promise<FocusSessionRecord[]> => {
    try {
      const data = await getFocusTimerData();
      return data.sessionRecords
        .filter(record =>
          record.date === date
          && record.targetType === 'habit'
          && record.targetId === habit.id
          && Number(record.minutes) > 0
          && getFocusSessionId(record)
        )
        .sort((left, right) => left.timestamp - right.timestamp);
    } catch (error) {
      console.error('[HabitCheckinLog] getHabitFocusRecords failed:', error);
      return [];
    }
  };

  const formatHabitName = (habit: Habit): string => {
    const name = habit.name.trim() || translate('habitCheckinLog.untitledHabit');
    return habit.emoji ? `${habit.emoji} ${name}` : name;
  };

  const formatFocusSummary = (summary?: HabitFocusLogSummary | null): string => {
    if (!summary || summary.minutes <= 0) {
      return '';
    }

    return ` ・ ${translate('habitCheckinLog.focusLabel')}: ${formatMinutes(summary.minutes)}`;
  };

  const getHabitFocusSummary = async (habit: Habit, date: string): Promise<HabitFocusLogSummary | null> => {
    try {
      const records = await getHabitFocusRecords(habit, date);

      if (records.length === 0) {
        return null;
      }

      return {
        minutes: records.reduce((sum, record) => sum + Math.max(0, Number(record.minutes) || 0), 0),
        periods: records
          .map(formatFocusPeriod)
          .filter((period): period is string => Boolean(period))
      };
    } catch (error) {
      console.error('[HabitCheckinLog] getHabitFocusSummary failed:', error);
      return null;
    }
  };

  const formatCheckinLog = (options: CheckinLogOptions): string => {
    const { habit, date, note, completedCount, targetCount, focusSummary } = options;
    const displayDate = formatDateDot(date);

    let log = `* ${displayDate} ・ ${translate('habitCheckinLog.habitLabel')}: ${formatHabitName(habit)}${formatFocusSummary(focusSummary)}`;

    if (completedCount !== undefined && targetCount !== undefined && targetCount > 1) {
      log += ` (${completedCount}/${targetCount})`;
    }

    if (note && note.trim()) {
      log += `\n  * ${note.trim()}`;
    }

    return log;
  };

  const findContainingNodeList = async (blockId: string): Promise<string | null> => {
    let currentId = blockId;

    for (let depth = 0; depth < 8; depth++) {
      const rows = await sql(`
        SELECT id, parent_id, type
        FROM blocks
        WHERE id = '${escapeSql(currentId)}'
        LIMIT 1
      `);

      if (!rows || rows.length === 0) {
        return null;
      }

      const row = rows[0];
      if (row.type === 'l') {
        return row.id;
      }
      if (!row.parent_id || row.parent_id === currentId) {
        return null;
      }

      currentId = row.parent_id;
    }

    return null;
  };

  const findContainingListItem = async (blockId: string): Promise<string | null> => {
    let currentId = blockId;

    for (let depth = 0; depth < 8; depth++) {
      const rows = await sql(`
        SELECT id, parent_id, type
        FROM blocks
        WHERE id = '${escapeSql(currentId)}'
        LIMIT 1
      `);

      if (!rows || rows.length === 0) {
        return null;
      }

      const row = rows[0];
      if (row.type === 'i') {
        return row.id;
      }
      if (!row.parent_id || row.parent_id === currentId || row.type === 'd') {
        return null;
      }

      currentId = row.parent_id;
    }

    return null;
  };

  const findFirstListItem = async (nodeListId: string): Promise<string | null> => {
    const rows = await sql(`
      SELECT id
      FROM blocks
      WHERE parent_id = '${escapeSql(nodeListId)}'
      AND type = 'i'
      ORDER BY id ASC
      LIMIT 1
    `);

    return rows?.[0]?.id || null;
  };

  const normalizeCheckinEntryItemId = async (blockId: string): Promise<string | null> => {
    const rows = await sql(`
      SELECT id, type
      FROM blocks
      WHERE id = '${escapeSql(blockId)}'
      LIMIT 1
    `);
    const row = rows?.[0];
    if (!row) {
      return null;
    }

    if (row.type === 'i') {
      return row.id;
    }
    if (row.type === 'l') {
      return await findFirstListItem(row.id);
    }
    return await findContainingListItem(row.id);
  };

  const findCheckinEntryItemIdsFromDom = async (docId: string, date: string, habitId: string): Promise<string[]> => {
    if (typeof DOMParser === 'undefined') {
      return [];
    }

    try {
      const response = await getBlockDOM(docId);
      const dom = typeof response?.dom === 'string' ? response.dom : '';
      if (!dom) {
        return [];
      }

      const doc = new DOMParser().parseFromString(dom, 'text/html');
      const lists = Array.from(doc.querySelectorAll('[data-type="NodeList"][data-node-id]'));
      const entryItemIds: string[] = [];
      const seen = new Set<string>();
      const pushEntryItemId = (entryItemId: string) => {
        if (entryItemId && !seen.has(entryItemId)) {
          seen.add(entryItemId);
          entryItemIds.push(entryItemId);
        }
      };

      for (const list of lists) {
        if (list.getAttribute('custom-checkin-date') !== date) {
          continue;
        }
        if (list.getAttribute('custom-checkin-habit-id') !== habitId) {
          continue;
        }

        const listItem = Array.from(list.children)
          .find(child => child.getAttribute('data-type') === 'NodeListItem');
        pushEntryItemId(listItem?.getAttribute('data-node-id') || '');
      }

      if (entryItemIds.length > 0) {
        debugHabitCheckinLog('find entry by doc DOM list attrs', {
          docId,
          date,
          habitId,
          entryItemIds
        });
        return entryItemIds;
      }

      return entryItemIds;
    } catch (error) {
      console.error('[HabitCheckinLog] findCheckinEntryItemIdsFromDom failed:', error);
      return [];
    }
  };

  const findContainingNodeListFromDom = async (docId: string, blockId: string): Promise<string | null> => {
    if (typeof DOMParser === 'undefined') {
      return null;
    }

    try {
      const response = await getBlockDOM(docId);
      const dom = typeof response?.dom === 'string' ? response.dom : '';
      if (!dom) {
        return null;
      }

      const doc = new DOMParser().parseFromString(dom, 'text/html');
      const target = doc.querySelector(`[data-node-id="${blockId}"]`);
      let current = target?.parentElement || null;
      while (current) {
        if (current.getAttribute('data-type') === 'NodeList') {
          return current.getAttribute('data-node-id') || null;
        }
        current = current.parentElement;
      }
    } catch (error) {
      console.error('[HabitCheckinLog] findContainingNodeListFromDom failed:', error);
    }
    return null;
  };

  const findEditableTextBlockIdFromDom = async (docId: string, blockId: string): Promise<string | null> => {
    if (typeof DOMParser === 'undefined') {
      return null;
    }

    try {
      const response = await getBlockDOM(docId);
      const dom = typeof response?.dom === 'string' ? response.dom : '';
      if (!dom) {
        return null;
      }

      const doc = new DOMParser().parseFromString(dom, 'text/html');
      const target = doc.querySelector(`[data-node-id="${blockId}"]`);
      if (!target) {
        return null;
      }

      if (target.getAttribute('data-type') === 'NodeParagraph') {
        return target.getAttribute('data-node-id') || null;
      }

      const directParagraph = Array.from(target.children)
        .find(child => child.getAttribute('data-type') === 'NodeParagraph');
      if (directParagraph) {
        return directParagraph.getAttribute('data-node-id') || null;
      }

      const nestedParagraph = target.querySelector('[data-type="NodeParagraph"][data-node-id]');
      return nestedParagraph?.getAttribute('data-node-id') || null;
    } catch (error) {
      console.error('[HabitCheckinLog] findEditableTextBlockIdFromDom failed:', error);
      return null;
    }
  };

  const findCheckinEntryItemIds = async (docId: string, date: string, habitId: string): Promise<string[]> => {
    try {
      const domEntryItemIds = await findCheckinEntryItemIdsFromDom(docId, date, habitId);
      if (domEntryItemIds.length > 0) {
        return domEntryItemIds;
      }

      const findFromRows = async (rows: any[] | null | undefined): Promise<string[]> => {
        const entryItemIds: string[] = [];
        const seen = new Set<string>();
        if (!rows) {
          return entryItemIds;
        }

        const sortedRows = [...rows].sort((left, right) => {
          const leftRank = left.block_type === 'i' ? 0 : left.block_type === 'l' ? 2 : 1;
          const rightRank = right.block_type === 'i' ? 0 : right.block_type === 'l' ? 2 : 1;
          return leftRank - rightRank;
        });

        for (const row of sortedRows) {
          const entryItemId = await normalizeCheckinEntryItemId(row.block_id);
          if (entryItemId && !seen.has(entryItemId)) {
            seen.add(entryItemId);
            entryItemIds.push(entryItemId);
          }
        }

        return entryItemIds;
      };

      const scopedResults = await sql(`
        SELECT a.block_id, b.type AS block_type
        FROM attributes AS a
        INNER JOIN attributes AS habit_attr
          ON habit_attr.block_id = a.block_id
          AND habit_attr.name = 'custom-checkin-habit-id'
          AND habit_attr.value = '${escapeSql(habitId)}'
        LEFT JOIN blocks AS b ON b.id = a.block_id
        WHERE a.name = 'custom-checkin-date'
        AND a.value = '${escapeSql(date)}'
        AND (
          a.root_id = '${escapeSql(docId)}'
          OR habit_attr.root_id = '${escapeSql(docId)}'
          OR b.root_id = '${escapeSql(docId)}'
        )
        ORDER BY a.block_id DESC
      `);

      const scopedEntryItemIds = await findFromRows(scopedResults);
      if (scopedEntryItemIds.length > 0) {
        return scopedEntryItemIds;
      }

      const fallbackResults = await sql(`
        SELECT a.block_id, b.type AS block_type
        FROM attributes AS a
        INNER JOIN attributes AS habit_attr
          ON habit_attr.block_id = a.block_id
          AND habit_attr.name = 'custom-checkin-habit-id'
          AND habit_attr.value = '${escapeSql(habitId)}'
        LEFT JOIN blocks AS b ON b.id = a.block_id
        WHERE a.name = 'custom-checkin-date'
        AND a.value = '${escapeSql(date)}'
        ORDER BY a.block_id DESC
      `);

      const fallbackEntryItemIds = await findFromRows(fallbackResults);
      if (fallbackEntryItemIds.length > 0) {
        return fallbackEntryItemIds;
      }

      return [];
    } catch (error) {
      console.error('[HabitCheckinLog] findCheckinEntryItemIds failed:', error);
    }
    return [];
  };

  const findCheckinNodeListIds = async (docId: string, date: string, habitId: string): Promise<string[]> => {
    const entryItemIds = await findCheckinEntryItemIds(docId, date, habitId);
    const nodeListIds: string[] = [];
    const seen = new Set<string>();
    for (const entryItemId of entryItemIds) {
      const nodeListId = await findContainingNodeList(entryItemId);
      if (nodeListId && !seen.has(nodeListId)) {
        seen.add(nodeListId);
        nodeListIds.push(nodeListId);
      }
    }
    return nodeListIds;
  };

  const findCheckinNodeListId = async (docId: string, date: string, habitId: string): Promise<string | null> => {
    const nodeListIds = await findCheckinNodeListIds(docId, date, habitId);
    return nodeListIds[0] || null;
  };

  const getNodeListItems = async (nodeListId: string): Promise<CheckinBlockRow[]> => {
    const childItems = await sql(`
      SELECT id, parent_id, type, content, markdown
      FROM blocks
      WHERE parent_id = '${escapeSql(nodeListId)}'
      AND type = 'i'
      ORDER BY id ASC
    `);
    return Array.isArray(childItems) ? childItems : [];
  };

  const findNoteItemTargetsFromEntryItem = async (entryItemId: string): Promise<NoteItemTarget[]> => {
    const children = await getChildBlocks(entryItemId);

    if (!children || children.length === 0) return [];

    const targets: NoteItemTarget[] = [];
    const seen = new Set<string>();
    const pushTarget = async (itemId: string) => {
      if (seen.has(itemId)) {
        return;
      }
      seen.add(itemId);
      targets.push({
        itemId,
        updateId: await resolveEditableTextBlockId(itemId)
      });
    };

    let skippedEntryText = false;
    for (const child of children) {
      if (child.type === 'l') {
        const subItems = await getNodeListItems(child.id);
        for (const subItem of subItems) {
          await pushTarget(subItem.id);
        }
        continue;
      }

      const hasText = normalizeBlockText(child.markdown) || normalizeBlockText(child.content);
      if (!hasText) {
        continue;
      }

      if (!skippedEntryText) {
        skippedEntryText = true;
        continue;
      }

      await pushTarget(child.id);
    }

    return targets;
  };

  const findNoteItemTargetsFromDom = async (docId: string, entryItemId: string): Promise<NoteItemTarget[]> => {
    if (typeof DOMParser === 'undefined') {
      return [];
    }

    try {
      const response = await getBlockDOM(docId);
      const dom = typeof response?.dom === 'string' ? response.dom : '';
      if (!dom) {
        return [];
      }

      const doc = new DOMParser().parseFromString(dom, 'text/html');
      let target = doc.querySelector(`[data-node-id="${entryItemId}"]`);
      if (!target) {
        return [];
      }

      if (target.getAttribute('data-type') === 'NodeParagraph') {
        target = target.closest('[data-type="NodeListItem"]') || target;
      } else if (target.getAttribute('data-type') === 'NodeList') {
        target = Array.from(target.children)
          .find(child => child.getAttribute('data-type') === 'NodeListItem') || target;
      }

      const targets: NoteItemTarget[] = [];
      const seen = new Set<string>();
      const pushTarget = (itemId: string, updateId: string) => {
        if (!itemId || !updateId || seen.has(itemId)) {
          return;
        }
        seen.add(itemId);
        targets.push({ itemId, updateId });
      };

      let skippedHeaderParagraph = false;
      for (const child of Array.from(target.children)) {
        const type = child.getAttribute('data-type');
        if (type === 'NodeParagraph') {
          if (!skippedHeaderParagraph) {
            skippedHeaderParagraph = true;
            continue;
          }

          const paragraphId = child.getAttribute('data-node-id') || '';
          pushTarget(paragraphId, paragraphId);
          continue;
        }

        if (type === 'NodeList') {
          const noteItems = Array.from(child.children)
            .filter(item => item.getAttribute('data-type') === 'NodeListItem');
          for (const noteItem of noteItems) {
            if (noteItem.getAttribute('custom-checkin-focus-session-id')) {
              continue;
            }
            const itemId = noteItem.getAttribute('data-node-id') || '';
            const paragraph = Array.from(noteItem.children)
              .find(itemChild => itemChild.getAttribute('data-type') === 'NodeParagraph');
            const paragraphId = paragraph?.getAttribute('data-node-id') || itemId;
            pushTarget(itemId, paragraphId);
          }
        }
      }

      if (targets.length > 0) {
        debugHabitCheckinLog('find note targets by doc DOM', {
          docId,
          entryItemId,
          targets
        });
      }

      return targets;
    } catch (error) {
      console.error('[HabitCheckinLog] findNoteItemTargetsFromDom failed:', error);
      return [];
    }
  };

  const getEntryElementFromDom = (doc: Document, entryItemId: string): Element | null => {
    let target = doc.querySelector(`[data-node-id="${entryItemId}"]`);
    if (!target) {
      return null;
    }

    if (target.getAttribute('data-type') === 'NodeParagraph') {
      target = target.closest('[data-type="NodeListItem"]') || target;
    } else if (target.getAttribute('data-type') === 'NodeList') {
      target = Array.from(target.children)
        .find(child => child.getAttribute('data-type') === 'NodeListItem') || target;
    }

    return target;
  };

  const getNoteTargetsUnderListItemElement = (item: Element): NoteItemTarget[] => {
    const targets: NoteItemTarget[] = [];
    const seen = new Set<string>();
    const pushTarget = (itemId: string, updateId: string, text = '') => {
      if (!itemId || !updateId || seen.has(itemId)) {
        return;
      }
      seen.add(itemId);
      targets.push({ itemId, updateId, text });
    };

    for (const child of Array.from(item.children)) {
      if (child.getAttribute('data-type') !== 'NodeList') {
        continue;
      }

      const noteItems = Array.from(child.children)
        .filter(noteItem => noteItem.getAttribute('data-type') === 'NodeListItem');
      for (const noteItem of noteItems) {
        const itemId = noteItem.getAttribute('data-node-id') || '';
        const paragraph = Array.from(noteItem.children)
          .find(noteChild => noteChild.getAttribute('data-type') === 'NodeParagraph');
        const paragraphId = paragraph?.getAttribute('data-node-id') || itemId;
        pushTarget(itemId, paragraphId, readElementText(paragraph));
      }
    }

    return targets;
  };

  const findFocusNoteTargetsFromDom = async (docId: string, entryItemId: string): Promise<Map<string, FocusNoteTarget>> => {
    const targets = new Map<string, FocusNoteTarget>();
    if (typeof DOMParser === 'undefined') {
      return targets;
    }

    try {
      const response = await getBlockDOM(docId);
      const dom = typeof response?.dom === 'string' ? response.dom : '';
      if (!dom) {
        return targets;
      }

      const doc = new DOMParser().parseFromString(dom, 'text/html');
      const entryElement = getEntryElementFromDom(doc, entryItemId);
      if (!entryElement) {
        return targets;
      }

      const childLists = Array.from(entryElement.children)
        .filter(child => child.getAttribute('data-type') === 'NodeList');
      for (const childList of childLists) {
        const focusItems = Array.from(childList.children)
          .filter(item => item.getAttribute('data-type') === 'NodeListItem');
        for (const focusItem of focusItems) {
          const sessionId = focusItem.getAttribute('custom-checkin-focus-session-id') || '';
          const focusItemId = focusItem.getAttribute('data-node-id') || '';
          if (!sessionId || !focusItemId) {
            continue;
          }
          const labelParagraph = Array.from(focusItem.children)
            .find(itemChild => itemChild.getAttribute('data-type') === 'NodeParagraph');
          const label = focusItem.getAttribute('custom-checkin-focus-label')
            || readElementText(labelParagraph)
            || sessionId;
          const minutes = Math.max(0, Math.round(Number(focusItem.getAttribute('custom-checkin-focus-minutes')) || 0));

          targets.set(sessionId, {
            focusItemId,
            label,
            minutes,
            noteTargets: getNoteTargetsUnderListItemElement(focusItem)
          });
        }
      }

      if (targets.size > 0) {
        debugHabitCheckinLog('find focus note targets by doc DOM', {
          docId,
          entryItemId,
          sessionIds: Array.from(targets.keys())
        });
      }
    } catch (error) {
      console.error('[HabitCheckinLog] findFocusNoteTargetsFromDom failed:', error);
    }

    return targets;
  };

  const readNoteFromEntryItemFromDom = async (docId: string, entryItemId: string): Promise<string | null> => {
    if (typeof DOMParser === 'undefined') {
      return null;
    }

    try {
      const response = await getBlockDOM(docId);
      const dom = typeof response?.dom === 'string' ? response.dom : '';
      if (!dom) {
        return null;
      }

      const doc = new DOMParser().parseFromString(dom, 'text/html');
      let target = doc.querySelector(`[data-node-id="${entryItemId}"]`);
      if (!target) {
        return null;
      }

      if (target.getAttribute('data-type') === 'NodeParagraph') {
        target = target.closest('[data-type="NodeListItem"]') || target;
      } else if (target.getAttribute('data-type') === 'NodeList') {
        target = Array.from(target.children)
          .find(child => child.getAttribute('data-type') === 'NodeListItem') || target;
      }

      const noteParts: string[] = [];
      let skippedHeaderParagraph = false;

      for (const child of Array.from(target.children)) {
        const type = child.getAttribute('data-type');
        if (type === 'NodeParagraph') {
          if (!skippedHeaderParagraph) {
            skippedHeaderParagraph = true;
            continue;
          }

          const note = readElementText(child);
          if (note) {
            noteParts.push(note);
          }
          continue;
        }

        if (type === 'NodeList') {
          const noteItems = Array.from(child.children)
            .filter(item => item.getAttribute('data-type') === 'NodeListItem');
          for (const noteItem of noteItems) {
            if (noteItem.getAttribute('custom-checkin-focus-session-id')) {
              for (const focusChild of Array.from(noteItem.children)) {
                if (focusChild.getAttribute('data-type') !== 'NodeList') {
                  continue;
                }
                const focusNoteItems = Array.from(focusChild.children)
                  .filter(item => item.getAttribute('data-type') === 'NodeListItem');
                for (const focusNoteItem of focusNoteItems) {
                  const paragraph = Array.from(focusNoteItem.children)
                    .find(itemChild => itemChild.getAttribute('data-type') === 'NodeParagraph');
                  const note = readElementText(paragraph);
                  if (note) {
                    noteParts.push(note);
                  }
                }
              }
            } else {
              const paragraph = Array.from(noteItem.children)
                .find(itemChild => itemChild.getAttribute('data-type') === 'NodeParagraph');
              const note = readElementText(paragraph);
              if (note) {
                noteParts.push(note);
              }
            }
          }
        }
      }

      return noteParts.length > 0 ? noteParts.join('\n') : null;
    } catch (error) {
      console.error('[HabitCheckinLog] readNoteFromEntryItemFromDom failed:', error);
      return null;
    }
  };

  const readNoteFromEntryItem = async (docId: string, entryItemId: string): Promise<string | null> => {
    const domNote = await readNoteFromEntryItemFromDom(docId, entryItemId);
    if (domNote) {
      return domNote;
    }

    const domNoteItemTargets = await findNoteItemTargetsFromDom(docId, entryItemId);
    const noteItemTargets = domNoteItemTargets.length > 0
      ? domNoteItemTargets
      : await findNoteItemTargetsFromEntryItem(entryItemId);
    if (noteItemTargets.length === 0) {
      return null;
    }

    const noteParts: string[] = [];
    for (const target of noteItemTargets) {
      const rows = await sql(`
        SELECT content, markdown
        FROM blocks
        WHERE id = '${escapeSql(target.updateId)}'
        LIMIT 1
      `);
      const row = rows?.[0];
      const note = normalizeBlockText(row?.markdown) || normalizeBlockText(row?.content);
      if (note) {
        noteParts.push(note);
      }
    }

    return noteParts.length > 0 ? noteParts.join('\n') : null;
  };

  const readNoteFromTargets = async (noteTargets: NoteItemTarget[]): Promise<string> => {
    const noteParts: string[] = [];
    for (const target of noteTargets) {
      if (target.text) {
        noteParts.push(target.text);
        continue;
      }

      const rows = await sql(`
        SELECT content, markdown
        FROM blocks
        WHERE id = '${escapeSql(target.updateId)}'
        LIMIT 1
      `);
      const row = rows?.[0];
      const note = normalizeBlockText(row?.markdown) || normalizeBlockText(row?.content);
      if (note) {
        noteParts.push(note);
      }
    }
    return noteParts.join('\n');
  };

  const textLooksLikeCheckinEntry = (text: string, options: CheckinEntryMatchOptions): boolean => {
    if (!text) {
      return false;
    }

    const habitName = formatHabitName(options.habit);
    const rawHabitName = options.habit.name.trim();
    return text.includes(formatDateDot(options.date))
      && (text.includes(habitName) || Boolean(rawHabitName && text.includes(rawHabitName)));
  };

  const entryItemLooksLikeCheckinEntry = async (
    entryItemId: string,
    row: CheckinBlockRow | null | undefined,
    options: CheckinEntryMatchOptions
  ): Promise<boolean> => {
    const text = getRowText(row) || await getEntryItemText(entryItemId);
    return textLooksLikeCheckinEntry(text, options);
  };

  const getHabitId = (habitOrId: Habit | string): string => (
    typeof habitOrId === 'string' ? habitOrId : habitOrId.id
  );

  const findMatchingEntryItemInSameList = async (
    entryItemId: string,
    options: CheckinEntryMatchOptions
  ): Promise<string | null> => {
    const entryRow = await getBlockRow(entryItemId);
    if (entryRow && await entryItemLooksLikeCheckinEntry(entryItemId, entryRow, options)) {
      return entryItemId;
    }

    const nodeListId = await findContainingNodeList(entryItemId);
    if (!nodeListId) {
      return null;
    }

    const childItems = await getNodeListItems(nodeListId);
    for (const item of childItems) {
      if (await entryItemLooksLikeCheckinEntry(item.id, item, options)) {
        return item.id;
      }
    }
    return null;
  };

  const findSiblingDuplicateEntryItemIds = async (
    entryItemId: string,
    options: CheckinEntryMatchOptions
  ): Promise<string[]> => {
    const nodeListId = await findContainingNodeList(entryItemId);
    if (!nodeListId) {
      return [];
    }

    const childItems = await getNodeListItems(nodeListId);
    const duplicateEntryItemIds: string[] = [];
    for (const item of childItems) {
      if (item.id !== entryItemId && await entryItemLooksLikeCheckinEntry(item.id, item, options)) {
        duplicateEntryItemIds.push(item.id);
      }
    }
    return duplicateEntryItemIds;
  };

  const findNewlyCreatedEntryItem = async (
    docId: string,
    options: CheckinLogOptions
  ): Promise<string | null> => {
    try {
      const displayDate = formatDateDot(options.date);
      const habitNames = Array.from(new Set([
        formatHabitName(options.habit),
        options.habit.name.trim()
      ].filter(Boolean)));

      if (habitNames.length > 0) {
        const habitConditions = habitNames
          .map(name => `(content LIKE '%${escapeSql(name)}%' OR markdown LIKE '%${escapeSql(name)}%')`)
          .join(' OR ');
        const textRows = await sql(`
          SELECT id, parent_id, type, content, markdown
          FROM blocks
          WHERE root_id = '${escapeSql(docId)}'
          AND type != 'l'
          AND (content LIKE '%${escapeSql(displayDate)}%' OR markdown LIKE '%${escapeSql(displayDate)}%')
          AND (${habitConditions})
          ORDER BY updated DESC, created DESC
          LIMIT 120
        `);

        if (Array.isArray(textRows)) {
          for (const row of textRows) {
            const entryItemId = await normalizeCheckinEntryItemId(row.id);
            if (entryItemId && await entryItemLooksLikeCheckinEntry(entryItemId, row, options)) {
              debugHabitCheckinLog('found entry by text query', {
                docId,
                date: options.date,
                habitId: options.habit.id,
                sourceBlockId: row.id,
                entryItemId
              });
              return entryItemId;
            }
          }
        }
      }

      const recentItems = await sql(`
        SELECT id, parent_id, type, content, markdown
        FROM blocks
        WHERE root_id = '${escapeSql(docId)}'
        AND type = 'i'
        ORDER BY created DESC
        LIMIT 80
      `);

      if (Array.isArray(recentItems)) {
        for (const item of recentItems) {
          if (await entryItemLooksLikeCheckinEntry(item.id, item, options)) {
            return item.id;
          }
        }
      }
    } catch (error) {
      console.error('[HabitCheckinLog] findNewlyCreatedEntryItem failed:', error);
    }
    return null;
  };

  const updateExistingCheckinLog = async (
    docId: string,
    entryItemId: string,
    logContent: string,
    note: string
  ): Promise<boolean> => {
    const editableEntryId = await findEditableTextBlockIdFromDom(docId, entryItemId)
      || await resolveEditableTextBlockId(entryItemId);
    if (!editableEntryId) {
      return false;
    }

    const firstLine = logContent.split('\n')[0]?.replace(/^\*\s*/, '').trim();
    if (firstLine) {
      await updateBlock('markdown', firstLine, editableEntryId);
    }

    const domNoteItemTargets = await findNoteItemTargetsFromDom(docId, entryItemId);
    const noteItemTargets = domNoteItemTargets.length > 0
      ? domNoteItemTargets
      : await findNoteItemTargetsFromEntryItem(entryItemId);
    const normalizedNote = note.trim();
    if (normalizedNote) {
      if (noteItemTargets.length > 0) {
        await updateBlock('markdown', normalizedNote, noteItemTargets[0].updateId);
        for (const duplicateNoteItem of noteItemTargets.slice(1)) {
          await deleteBlock(duplicateNoteItem.itemId);
        }
      } else {
        await appendBlock('markdown', `* ${normalizedNote}`, entryItemId);
      }
    } else {
      for (const noteItem of noteItemTargets) {
        await deleteBlock(noteItem.itemId);
      }
    }

    return true;
  };

  const updateCheckinEntryHeader = async (
    docId: string,
    entryItemId: string,
    logContent: string
  ): Promise<boolean> => {
    const editableEntryId = await findEditableTextBlockIdFromDom(docId, entryItemId)
      || await resolveEditableTextBlockId(entryItemId);
    if (!editableEntryId) {
      return false;
    }

    const firstLine = logContent.split('\n')[0]?.replace(/^\*\s*/, '').trim();
    if (firstLine) {
      await updateBlock('markdown', firstLine, editableEntryId);
    }
    return true;
  };

  const writeFocusNotesToEntry = async (
    docId: string,
    entryItemId: string,
    focusNotes: HabitFocusNoteItem[]
  ): Promise<void> => {
    if (focusNotes.length === 0) {
      return;
    }

    const targetMap = await findFocusNoteTargetsFromDom(docId, entryItemId);
    for (const focusNote of focusNotes) {
      const sessionId = focusNote.sessionId.trim();
      const normalizedNote = focusNote.note.trim();
      if (!sessionId) {
        continue;
      }

      const target = targetMap.get(sessionId);
      if (target) {
        const focusHeaderBlockId = await findEditableTextBlockIdFromDom(docId, target.focusItemId)
          || await resolveEditableTextBlockId(target.focusItemId);
        await updateBlock('markdown', focusNote.label, focusHeaderBlockId);
        await setBlockAttrs(target.focusItemId, {
          'custom-checkin-focus-session-id': sessionId,
          'custom-checkin-focus-label': focusNote.label,
          'custom-checkin-focus-minutes': String(focusNote.minutes)
        });

        if (normalizedNote) {
          if (target.noteTargets.length > 0) {
            await updateBlock('markdown', normalizedNote, target.noteTargets[0].updateId);
            for (const duplicateNoteItem of target.noteTargets.slice(1)) {
              await deleteBlock(duplicateNoteItem.itemId);
            }
          } else {
            await appendBlock('markdown', `* ${normalizedNote}`, target.focusItemId);
          }
        } else {
          for (const noteItem of target.noteTargets) {
            await deleteBlock(noteItem.itemId);
          }
        }

        debugHabitCheckinLog('updated focus note entry', {
          docId,
          entryItemId,
          sessionId,
          focusItemId: target.focusItemId,
          noteLength: normalizedNote.length
        });
        continue;
      }

      const result = await appendBlock(
        'markdown',
        `* ${focusNote.label}${normalizedNote ? `\n  * ${normalizedNote}` : ''}`,
        entryItemId
      );
      const appendedMeta = extractAppendedBlockMeta(result);
      const focusItemId = appendedMeta.listItemId;
      if (focusItemId) {
        await setBlockAttrs(focusItemId, {
          'custom-checkin-focus-session-id': sessionId,
          'custom-checkin-focus-label': focusNote.label,
          'custom-checkin-focus-minutes': String(focusNote.minutes)
        });
      }
      debugHabitCheckinLog('created focus note entry', {
        docId,
        entryItemId,
        sessionId,
        focusItemId: focusItemId || '',
        noteLength: normalizedNote.length
      });
    }
  };

  const getExistingNote = async (docId: string, date: string, habitOrId: Habit | string): Promise<string | null> => {
    try {
      const habitId = getHabitId(habitOrId);
      const entryItemId = (await findCheckinEntryItemIds(docId, date, habitId))[0];
      if (!entryItemId) {
        debugHabitCheckinLog('getExistingNote no entry', {
          docId,
          date,
          habitId
        });
        return null;
      }

      const resolvedEntryItemId = typeof habitOrId === 'string'
        ? entryItemId
        : (await findMatchingEntryItemInSameList(entryItemId, { habit: habitOrId, date })) || entryItemId;

      const note = await readNoteFromEntryItem(docId, resolvedEntryItemId);
      debugHabitCheckinLog('getExistingNote result', {
        docId,
        date,
        habitId,
        entryItemId,
        resolvedEntryItemId,
        hasNote: Boolean(note),
        noteLength: note?.length || 0
      });
      return note;
    } catch (error) {
      console.error('[HabitCheckinLog] getExistingNote failed:', error);
    }
    return null;
  };

  const getHabitFocusNoteItems = async (
    docId: string,
    habit: Habit,
    date: string
  ): Promise<HabitFocusNoteItem[]> => {
    const records = await getHabitFocusRecords(habit, date);
    if (records.length === 0) {
      return [];
    }

    const entryItemId = (await findCheckinEntryItemIds(docId, date, habit.id))[0];
    const targetMap = entryItemId
      ? await findFocusNoteTargetsFromDom(docId, entryItemId)
      : new Map<string, FocusNoteTarget>();

    const items: HabitFocusNoteItem[] = [];
    for (const record of records) {
      const sessionId = getFocusSessionId(record);
      const target = targetMap.get(sessionId);
      items.push({
        sessionId,
        label: formatFocusSessionLabel(record),
        minutes: Math.max(0, Math.round(Number(record.minutes) || 0)),
        note: target ? await readNoteFromTargets(target.noteTargets) : ''
      });
    }

    debugHabitCheckinLog('get focus note items', {
      docId,
      date,
      habitId: habit.id,
      count: items.length,
      entryItemId: entryItemId || ''
    });

    return items;
  };

  const extractAppendedBlockMeta = (result: any[]): AppendedBlockMeta => {
    const meta: AppendedBlockMeta = {
      listItemId: '',
      listId: '',
      paragraphId: '',
      fallbackId: ''
    };
    if (!result || result.length === 0) return meta;

    for (const res of result) {
      const ops = res.doOperations || [];
      for (const op of ops) {
        if (op.id && !meta.fallbackId) {
          meta.fallbackId = op.id;
        }
        if (op.id && op.objectType === 'NodeListItem' && !meta.listItemId) {
          meta.listItemId = op.id;
        }
        if (op.id && op.objectType === 'NodeList' && !meta.listId) {
          meta.listId = op.id;
        }
        if (op.data && typeof op.data === 'string') {
          const parser = new DOMParser();
          const doc = parser.parseFromString(op.data, 'text/html');
          const listItem = doc.querySelector('[data-type="NodeListItem"][data-node-id]');
          const nodeList = doc.querySelector('[data-type="NodeList"][data-node-id]');
          const paragraph = doc.querySelector('[data-type="NodeParagraph"][data-node-id]');
          const listItemId = listItem?.getAttribute('data-node-id') || '';
          const listId = nodeList?.getAttribute('data-node-id') || '';
          const paragraphId = paragraph?.getAttribute('data-node-id') || '';
          if (listItemId && !meta.listItemId) {
            meta.listItemId = listItemId;
          }
          if (listId && !meta.listId) {
            meta.listId = listId;
          }
          if (paragraphId && !meta.paragraphId) {
            meta.paragraphId = paragraphId;
          }
        }
      }
    }

    return meta;
  };

  const resolveAppendedEntryItemId = async (
    docId: string,
    meta: AppendedBlockMeta,
    options: CheckinLogOptions
  ): Promise<string | null> => {
    if (meta.listItemId) {
      return meta.listItemId;
    }

    const candidateIds = [meta.fallbackId, meta.listId].filter(Boolean);
    for (const candidateId of candidateIds) {
      const entryItemId = await normalizeCheckinEntryItemId(candidateId);
      if (entryItemId) {
        return entryItemId;
      }
    }

    for (let attempt = 1; attempt <= 8; attempt++) {
      if (meta.listId) {
        const listEntryItemId = await findFirstListItem(meta.listId);
        if (listEntryItemId) {
          return listEntryItemId;
        }
      }

      const entryItemId = await findNewlyCreatedEntryItem(docId, options);
      if (entryItemId) {
        debugHabitCheckinLog('resolved appended entry by SQL fallback', {
          docId,
          date: options.date,
          habitId: options.habit.id,
          entryItemId,
          attempt
        });
        return entryItemId;
      }

      await sleep(80);
    }

    debugHabitCheckinLog('resolve appended entry failed', {
      docId,
      date: options.date,
      habitId: options.habit.id,
      meta
    });
    return null;
  };

  const tagCheckinEntryItem = async (
    docId: string,
    entryItemId: string,
    options: CheckinLogOptions,
    knownNodeListId = ''
  ): Promise<string | null> => {
    const targetEntryItemId = await normalizeCheckinEntryItemId(entryItemId) || entryItemId;
    const targetNodeListId = knownNodeListId
      || await findContainingNodeListFromDom(docId, targetEntryItemId)
      || await findContainingNodeListFromDom(docId, entryItemId);
    if (!targetNodeListId) {
      debugHabitCheckinLog('tag entry list attrs skipped, no NodeList found', {
        docId,
        entryItemId: targetEntryItemId,
        originalEntryItemId: entryItemId,
        date: options.date,
        habitId: options.habit.id
      });
      return null;
    }

    const attrs = {
      'custom-checkin-date': options.date,
      'custom-checkin-habit-id': options.habit.id
    };
    await setBlockAttrs(targetNodeListId, attrs);

    debugHabitCheckinLog('tagged entry list attrs', {
      nodeListId: targetNodeListId,
      entryItemId: targetEntryItemId,
      originalEntryItemId: entryItemId,
      date: options.date,
      habitId: options.habit.id
    });
    return targetNodeListId;
  };

  const writeCheckinLogToDoc = async (docId: string, options: CheckinLogOptions): Promise<boolean> => {
    try {
      const existingEntryItemIds = await findCheckinEntryItemIds(docId, options.date, options.habit.id);
      const logOptions = options.focusSummary === undefined
        ? { ...options, focusSummary: await getHabitFocusSummary(options.habit, options.date) }
        : options;
      const logContent = formatCheckinLog(logOptions);

      let entryItemId: string | null = existingEntryItemIds[0] || null;
      let appendedMeta: AppendedBlockMeta | null = null;
      debugHabitCheckinLog('write start', {
        docId,
        date: options.date,
        habitId: options.habit.id,
        noteLength: options.note?.trim().length || 0,
        focusNoteCount: options.focusNotes?.length || 0,
        existingEntryCount: existingEntryItemIds.length,
        firstEntryItemId: entryItemId || ''
      });

      if (entryItemId) {
        entryItemId = (await findMatchingEntryItemInSameList(entryItemId, logOptions)) || entryItemId;
        const taggedNodeListId = await tagCheckinEntryItem(docId, entryItemId, options);
        if (!taggedNodeListId) {
          debugHabitCheckinLog('write ignored invalid existing entry without NodeList', {
            docId,
            date: options.date,
            habitId: options.habit.id,
            entryItemId
          });
          entryItemId = null;
        }
      }

      if (entryItemId) {
        const hasFocusNotes = Boolean(options.focusNotes && options.focusNotes.length > 0);
        const updatedExistingLog = hasFocusNotes
          ? await updateCheckinEntryHeader(docId, entryItemId, logContent)
          : await updateExistingCheckinLog(docId, entryItemId, logContent, options.note || '');
        if (!updatedExistingLog) {
          await updateBlock('markdown', logContent, entryItemId);
        }
        debugHabitCheckinLog('write updated existing entry', {
          docId,
          date: options.date,
          habitId: options.habit.id,
          entryItemId,
          updatedExistingLog
        });

        const duplicateEntryItemIds = new Set<string>(existingEntryItemIds.slice(1));
        for (const siblingDuplicateId of await findSiblingDuplicateEntryItemIds(entryItemId, logOptions)) {
          duplicateEntryItemIds.add(siblingDuplicateId);
        }
        duplicateEntryItemIds.delete(entryItemId);

        for (const duplicateEntryItemId of duplicateEntryItemIds) {
          await deleteBlock(duplicateEntryItemId);
        }
        if (duplicateEntryItemIds.size > 0) {
          debugHabitCheckinLog('write removed duplicate entries', {
            docId,
            date: options.date,
            habitId: options.habit.id,
            duplicateEntryItemIds: Array.from(duplicateEntryItemIds)
          });
        }
      }

      if (!entryItemId) {
        const result = await appendBlock('markdown', logContent, docId);
        appendedMeta = extractAppendedBlockMeta(result);
        entryItemId = await resolveAppendedEntryItemId(docId, appendedMeta, logOptions);
        debugHabitCheckinLog('write appended new entry', {
          docId,
          date: options.date,
          habitId: options.habit.id,
          appendedMeta,
          entryItemId: entryItemId || ''
        });
      }

      if (entryItemId) {
        if (options.focusNotes && options.focusNotes.length > 0) {
          await writeFocusNotesToEntry(docId, entryItemId, options.focusNotes);
        }
        await tagCheckinEntryItem(docId, entryItemId, options, appendedMeta?.listId || '');
      }
      debugHabitCheckinLog('write finish', {
        docId,
        date: options.date,
        habitId: options.habit.id,
        entryItemId: entryItemId || ''
      });

      dispatchCheckinLogChange({
        docId,
        date: options.date,
        habitId: options.habit.id
      });

      return true;
    } catch (error) {
      console.error('[HabitCheckinLog] writeCheckinLogToDoc failed:', error);
      return false;
    }
  };

  const deleteCheckinLogFromDoc = async (docId: string, date: string, habitOrId: Habit | string): Promise<boolean> => {
    try {
      const habitId = getHabitId(habitOrId);
      const existingEntryItemIds = await findCheckinEntryItemIds(docId, date, habitId);
      if (existingEntryItemIds.length === 0) {
        dispatchCheckinLogChange({ docId, date, habitId });
        return true;
      }

      let entryItemIdsToDelete = existingEntryItemIds;
      if (typeof habitOrId !== 'string') {
        const matchedEntryItemIds = new Set<string>();
        for (const existingEntryItemId of existingEntryItemIds) {
          const matchedEntryItemId = await findMatchingEntryItemInSameList(existingEntryItemId, { habit: habitOrId, date });
          if (matchedEntryItemId) {
            matchedEntryItemIds.add(matchedEntryItemId);
            for (const siblingDuplicateId of await findSiblingDuplicateEntryItemIds(matchedEntryItemId, { habit: habitOrId, date })) {
              matchedEntryItemIds.add(siblingDuplicateId);
            }
          }
        }
        if (matchedEntryItemIds.size > 0) {
          entryItemIdsToDelete = Array.from(matchedEntryItemIds);
        }
      }

      for (const existingEntryItemId of entryItemIdsToDelete) {
        await deleteBlock(existingEntryItemId);
      }
      dispatchCheckinLogChange({ docId, date, habitId });
      return true;
    } catch (error) {
      console.error('[HabitCheckinLog] deleteCheckinLogFromDoc failed:', error);
      return false;
    }
  };

  const getMonthCheckinNotes = async (
    docId: string,
    habitOrId: Habit | string,
    year: number,
    month: number
  ): Promise<HabitMonthCheckinNote[]> => {
    try {
      const habitId = getHabitId(habitOrId);
      const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
      const monthEnd = `${year}-${String(month).padStart(2, '0')}-31`;

      const results = await sql(`
        SELECT a.value AS checkin_date, a.block_id
        FROM attributes AS a
        INNER JOIN attributes AS habit_attr
          ON habit_attr.block_id = a.block_id
          AND habit_attr.name = 'custom-checkin-habit-id'
          AND habit_attr.value = '${escapeSql(habitId)}'
        LEFT JOIN blocks AS b ON b.id = a.block_id
        WHERE a.name = 'custom-checkin-date'
        AND a.value >= '${monthStart}'
        AND a.value <= '${monthEnd}'
        AND (
          a.root_id = '${escapeSql(docId)}'
          OR habit_attr.root_id = '${escapeSql(docId)}'
          OR b.root_id = '${escapeSql(docId)}'
        )
        ORDER BY a.value DESC
      `);

      if (!results || results.length === 0) return [];

      const notes: HabitMonthCheckinNote[] = [];
      const seenEntryItems = new Set<string>();

      for (const row of results) {
        const date = row.checkin_date;
        let entryItemId = await normalizeCheckinEntryItemId(row.block_id);
        if (entryItemId && typeof habitOrId !== 'string') {
          entryItemId = (await findMatchingEntryItemInSameList(entryItemId, { habit: habitOrId, date })) || entryItemId;
        }
        if (!entryItemId || seenEntryItems.has(entryItemId)) {
          continue;
        }
        seenEntryItems.add(entryItemId);

        const focusTargetMap = await findFocusNoteTargetsFromDom(docId, entryItemId);
        const focusNotes: HabitFocusNoteItem[] = [];
        for (const [sessionId, target] of focusTargetMap) {
          const focusNote = await readNoteFromTargets(target.noteTargets);
          if (!focusNote) {
            continue;
          }
          focusNotes.push({
            sessionId,
            label: target.label,
            minutes: target.minutes,
            note: focusNote
          });
        }

        if (focusNotes.length > 0) {
          notes.push({
            date,
            note: focusNotes.map(item => `${item.label}\n${item.note}`).join('\n\n'),
            focusNotes
          });
          continue;
        }

        const note = await readNoteFromEntryItem(docId, entryItemId);
        if (note) {
          notes.push({
            date,
            note
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
    deleteCheckinLogFromDoc,
    findCheckinNodeListId,
    getExistingNote,
    getHabitFocusNoteItems,
    getMonthCheckinNotes
  };
}
