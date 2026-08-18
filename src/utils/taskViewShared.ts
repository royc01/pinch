import { getBlockDOM, getHPathByID, sql, type Task } from '@/api';
import { normalizeNotebookIds } from './notebookIds';
import { escapeSqlLiteral } from './sql';

export interface RepeatRulePayload {
  blockId?: string;
  seriesId?: string;
  frequency?: string;
}

export { normalizeNotebookIds };

export interface RootDocumentMetadata {
  id: string;
  name: string;
  path?: string;
}

export function getDocumentCreationSortKey(documentId: string): number {
  if (typeof documentId !== 'string' || documentId.length === 0) return 0;
  const match = documentId.match(/^(\d{14})/);
  return match ? Number(match[1]) : 0;
}

function isDocumentDisplayPlaceholder(value: string): boolean {
  return value === '.' || value === '..' || value === '/' || value === '\\';
}

function normalizeDocumentMetadataValue(value?: string): string {
  return typeof value === 'string' ? value.trim() : '';
}

function extractDocumentTitleFromDom(dom: string, rootId: string): string {
  if (typeof dom !== 'string' || dom.trim().length === 0 || typeof DOMParser === 'undefined') {
    return '';
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(dom, 'text/html');
    const titleInput =
      doc.querySelector(`.protyle-title[data-node-id="${rootId}"] .protyle-title__input`)
      || doc.querySelector('.protyle-title__input');
    const rawTitle = titleInput?.textContent?.trim() || '';
    return isDocumentDisplayPlaceholder(rawTitle) ? '' : rawTitle;
  } catch {
    return '';
  }
}

export function resolveDocumentDisplayName(document: { id: string; name?: string; path?: string }): string {
  const rawPath = typeof document.path === 'string' ? document.path.trim().replace(/\/+$/, '') : '';
  if (rawPath && !isDocumentDisplayPlaceholder(rawPath)) {
    const parts = rawPath.split('/').filter(part => part.length > 0);
    if (parts.length > 0) {
      const lastPart = parts[parts.length - 1] || rawPath;
      if (!isDocumentDisplayPlaceholder(lastPart)) {
        return lastPart;
      }
    }
    if (!isDocumentDisplayPlaceholder(rawPath)) {
      return rawPath;
    }
  }

  const rawName = typeof document.name === 'string' ? document.name.trim() : '';
  if (rawName && !isDocumentDisplayPlaceholder(rawName)) {
    return rawName;
  }
  return document.id;
}

export async function loadRootDocumentMetadata(rootIds: string[]): Promise<Map<string, RootDocumentMetadata>> {
  const normalizedRootIds = Array.from(new Set(
    rootIds
      .filter((id): id is string => typeof id === 'string')
      .map(id => id.trim())
      .filter(id => id.length > 0)
  ));
  if (normalizedRootIds.length === 0) {
    return new Map();
  }

  const rootIdSql = normalizedRootIds.map(id => `'${escapeSqlLiteral(id)}'`).join(',');
  const rows = await sql(`
    SELECT id, hpath, content
    FROM blocks
    WHERE type = 'd'
      AND id IN (${rootIdSql})
  `) as Array<{ id?: string; hpath?: string; content?: string }>;

  const metadataByRootId = new Map<string, RootDocumentMetadata>();
  const missingTitleOrPathIds: string[] = [];
  for (const row of rows || []) {
    const id = typeof row?.id === 'string' ? row.id.trim() : '';
    if (!id) {
      continue;
    }
    const path = typeof row?.hpath === 'string' && row.hpath.trim().length > 0
      ? row.hpath.trim()
      : undefined;
    const rawName = typeof row?.content === 'string' ? row.content.trim() : '';
    metadataByRootId.set(id, {
      id,
      path,
      name: resolveDocumentDisplayName({ id, path, name: rawName })
    });
    if (
      !path
      || isDocumentDisplayPlaceholder(path.replace(/\/+$/, ''))
      || rawName.length === 0
      || isDocumentDisplayPlaceholder(rawName)
    ) {
      missingTitleOrPathIds.push(id);
    }
  }

  const unresolvedRootIds = normalizedRootIds.filter(id => !metadataByRootId.has(id));
  unresolvedRootIds.forEach((id) => {
    metadataByRootId.set(id, {
      id,
      name: id
    });
    missingTitleOrPathIds.push(id);
  });

  const fallbackRootIds = Array.from(new Set(missingTitleOrPathIds));
  if (fallbackRootIds.length === 0) {
    return metadataByRootId;
  }

  const hPathResults = await Promise.all(fallbackRootIds.map(async (id) => {
    try {
      const hPath = await getHPathByID(id);
      return { id, hPath: normalizeDocumentMetadataValue(hPath) };
    } catch {
      return { id, hPath: '' };
    }
  }));

  const domFallbackIds: string[] = [];
  for (const { id, hPath } of hPathResults) {
    const existing = metadataByRootId.get(id) || { id, name: id };
    const existingPath = normalizeDocumentMetadataValue(existing.path);
    const normalizedPath = existingPath && !isDocumentDisplayPlaceholder(existingPath.replace(/\/+$/, ''))
      ? existingPath
      : hPath;
    const shouldKeepPath = normalizedPath && !isDocumentDisplayPlaceholder(normalizedPath.replace(/\/+$/, ''));
    const displayName = resolveDocumentDisplayName({
      id,
      path: shouldKeepPath ? normalizedPath : undefined,
      name: existing.name
    });
    metadataByRootId.set(id, {
      id,
      path: shouldKeepPath ? normalizedPath : undefined,
      name: displayName
    });
    if (displayName === id) {
      domFallbackIds.push(id);
    }
  }

  if (domFallbackIds.length === 0) {
    return metadataByRootId;
  }

  const domResults = await Promise.all(domFallbackIds.map(async (id) => {
    try {
      const response = await getBlockDOM(id);
      return { id, dom: typeof response?.dom === 'string' ? response.dom : '' };
    } catch {
      return { id, dom: '' };
    }
  }));

  for (const { id, dom } of domResults) {
    const titleFromDom = extractDocumentTitleFromDom(dom, id);
    if (!titleFromDom) {
      continue;
    }
    const existing = metadataByRootId.get(id) || { id, name: id };
    metadataByRootId.set(id, {
      id,
      path: existing.path,
      name: resolveDocumentDisplayName({
        id,
        path: existing.path,
        name: titleFromDom
      })
    });
  }

  return metadataByRootId;
}

export function applyRepeatRuleOptimisticToTasks(
  taskList: Task[],
  payload: RepeatRulePayload
): { nextTasks: Task[]; touched: boolean } {
  const { blockId, seriesId, frequency } = payload;
  if (!frequency) {
    return { nextTasks: taskList, touched: false };
  }

  let touched = false;
  let nextTasks = taskList;

  if (blockId) {
    const templateTask = taskList.find(
      task => task.type === 'block' && !task.isVirtual && task.blockId === blockId
    );
    if (templateTask) {
      templateTask.repeatFrequency = frequency as any;
      if (frequency === 'none') {
        templateTask.repeatSeriesId = undefined;
        templateTask.repeatInstanceDate = undefined;
        templateTask.isVirtual = false;
      } else if (seriesId) {
        templateTask.repeatSeriesId = seriesId;
        templateTask.repeatInstanceDate = undefined;
        templateTask.isVirtual = false;
      }
      touched = true;
    }
  }

  if (frequency === 'none' && seriesId) {
    const filtered = taskList.filter(
      task => !(task.isVirtual && task.repeatSeriesId === seriesId)
    );
    if (filtered.length !== taskList.length) {
      nextTasks = filtered;
      touched = true;
    }
  }

  return { nextTasks, touched };
}
