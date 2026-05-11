import type { Task } from '@/api';
import { getBlockDOM, sql } from '@/api';
import { t } from './i18n';

export type TaskViewGroupMode = 'status' | 'group' | 'heading' | 'date';
export type TaskHeadingGroupKind = 'standalone' | 'document-root' | 'heading';

export interface TaskHeadingGroupMeta {
  key: string;
  label: string;
  kind: TaskHeadingGroupKind;
  rootId?: string;
  headingBlockId?: string;
  headingLevel?: number;
  order?: number;
}

export interface TaskHeadingDropTarget {
  rootId: string;
  parentId: string;
  previousId?: string;
}

interface HeadingContextRow {
  id: string;
  parent_id: string;
  root_id: string;
  type: string;
  subtype: string;
  content: string;
  sort?: string | number;
  created?: string;
}

interface HeadingStackEntry {
  id: string;
  label: string;
  level: number;
  order: number;
}

const TASK_VIEW_GROUP_MODES: TaskViewGroupMode[] = ['status', 'group', 'heading', 'date'];

function isTaskViewGroupMode(value: unknown): value is TaskViewGroupMode {
  return typeof value === 'string' && TASK_VIEW_GROUP_MODES.includes(value as TaskViewGroupMode);
}

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

function escapeAttributeSelector(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function getElementChildren(element: ParentNode): Element[] {
  return Array.from(element.children).filter((child): child is Element => child instanceof Element);
}

function getNodeId(element: Element | null | undefined): string {
  return element?.getAttribute('data-node-id') || '';
}

function stripMarkup(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\{:\s*[^}]*\}/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractDocumentLabel(task: Task): string {
  const rawPath = typeof task.hPath === 'string' ? stripMarkup(task.hPath) : '';
  if (!rawPath) {
    return t('document');
  }

  const segments = rawPath
    .split('/')
    .map(segment => segment.trim())
    .filter(Boolean);

  return segments[segments.length - 1] || rawPath;
}

function buildStandaloneHeadingGroupMeta(): TaskHeadingGroupMeta {
  return {
    key: 'standalone',
    label: t('standaloneTasks'),
    kind: 'standalone',
    order: -1
  };
}

function buildDocumentRootHeadingGroupMeta(
  task: Task,
  rootId?: string,
  order = 0
): TaskHeadingGroupMeta {
  const normalizedRootId = typeof rootId === 'string' && rootId.trim().length > 0
    ? rootId.trim()
    : (typeof task.rootId === 'string' ? task.rootId.trim() : '');
  const documentLabel = extractDocumentLabel(task);
  return {
    key: `document:${normalizedRootId || task.blockId || task.id}`,
    label: `${documentLabel} / ${t('documentRoot')}`,
    kind: 'document-root',
    rootId: normalizedRootId || undefined,
    order
  };
}

function buildHeadingChainGroupMeta(
  task: Task,
  stack: HeadingStackEntry[],
  rootId?: string
): TaskHeadingGroupMeta {
  const normalizedRootId = typeof rootId === 'string' && rootId.trim().length > 0
    ? rootId.trim()
    : (typeof task.rootId === 'string' ? task.rootId.trim() : '');
  const nearestHeading = stack[stack.length - 1];
  const headingLabels = stack.map(item => item.label).filter(Boolean);
  const documentLabel = extractDocumentLabel(task);
  const chainLabel = headingLabels.length > 0 ? headingLabels.join(' / ') : t('untitledHeading');

  return {
    key: `heading:${normalizedRootId || task.blockId || task.id}:${nearestHeading?.id || task.id}`,
    label: `${documentLabel} / ${chainLabel}`,
    kind: 'heading',
    rootId: normalizedRootId || undefined,
    headingBlockId: nearestHeading?.id,
    headingLevel: nearestHeading?.level,
    order: nearestHeading?.order ?? 0
  };
}

function normalizeSortValue(value: string | number | undefined): string {
  return value === undefined || value === null ? '' : String(value).trim();
}

function compareBlockOrder(left: HeadingContextRow, right: HeadingContextRow): number {
  const leftSort = normalizeSortValue(left.sort);
  const rightSort = normalizeSortValue(right.sort);

  if (leftSort && rightSort && leftSort !== rightSort) {
    const leftDigits = /^\d+$/.test(leftSort);
    const rightDigits = /^\d+$/.test(rightSort);
    if (leftDigits && rightDigits) {
      if (leftSort.length !== rightSort.length) {
        return leftSort.length - rightSort.length;
      }
      return leftSort < rightSort ? -1 : 1;
    }
    return leftSort.localeCompare(rightSort);
  }

  if (left.created && right.created && left.created !== right.created) {
    return left.created.localeCompare(right.created);
  }

  return left.id.localeCompare(right.id);
}

function isHeadingBlock(block: HeadingContextRow): boolean {
  const normalizedSubtype = block.subtype.trim().toLowerCase();
  return block.type === 'h' || /^h[1-6]$/.test(normalizedSubtype);
}

function resolveHeadingLevel(block: HeadingContextRow): number {
  const normalizedSubtype = block.subtype.trim().toLowerCase();
  const match = normalizedSubtype.match(/^h([1-6])$/);
  return match ? Number(match[1]) : 6;
}

function resolveHeadingLabel(block: HeadingContextRow): string {
  return stripMarkup(block.content) || t('untitledHeading');
}

function pushHeadingEntry(
  stack: HeadingStackEntry[],
  heading: HeadingStackEntry
): HeadingStackEntry[] {
  const nextStack = [...stack];

  while (nextStack.length > 0 && nextStack[nextStack.length - 1].level >= heading.level) {
    nextStack.pop();
  }

  nextStack.push(heading);
  return nextStack;
}

function isHeadingDomElement(element: Element): boolean {
  const blockType = element.getAttribute('data-type') || '';
  const subtype = (element.getAttribute('data-subtype') || '').trim().toLowerCase();
  return blockType === 'NodeHeading' && /^h[1-6]$/.test(subtype);
}

function isTaskListDomElement(element: Element): boolean {
  const blockType = element.getAttribute('data-type') || '';
  const subtype = (element.getAttribute('data-subtype') || '').trim().toLowerCase();
  return blockType === 'NodeList' && subtype === 't';
}

function resolveDomHeadingLevel(element: Element): number {
  const subtype = (element.getAttribute('data-subtype') || '').trim().toLowerCase();
  const match = subtype.match(/^h([1-6])$/);
  return match ? Number(match[1]) : 6;
}

function resolveDomHeadingLabel(element: Element): string {
  const editable = element.querySelector('[contenteditable="true"]');
  const rawText = editable?.innerHTML || element.textContent || '';
  return stripMarkup(rawText) || t('untitledHeading');
}

function buildFallbackHeadingGroupMeta(task: Task): TaskHeadingGroupMeta {
  if (task.type !== 'block' || !task.blockId) {
    return buildStandaloneHeadingGroupMeta();
  }
  return buildDocumentRootHeadingGroupMeta(task);
}

function assignGroupsFromDom(
  rootId: string,
  dom: string,
  taskByBlockId: ReadonlyMap<string, Task>
): Map<string, TaskHeadingGroupMeta> {
  const result = new Map<string, TaskHeadingGroupMeta>();
  if (!dom) {
    return result;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(dom, 'text/html');
  let headingOrder = 0;

  const walk = (elements: Element[], inheritedStack: HeadingStackEntry[]): void => {
    let currentStack = [...inheritedStack];

    for (const element of elements) {
      let nextStack = currentStack;

      if (isHeadingDomElement(element)) {
        headingOrder += 1;
        nextStack = pushHeadingEntry(currentStack, {
          id: getNodeId(element),
          label: resolveDomHeadingLabel(element),
          level: resolveDomHeadingLevel(element),
          order: headingOrder
        });
        currentStack = nextStack;
      }

      const nodeId = getNodeId(element);
      const task = nodeId ? taskByBlockId.get(nodeId) : undefined;
      if (task && !result.has(task.id)) {
        result.set(
          task.id,
          nextStack.length > 0
            ? buildHeadingChainGroupMeta(task, nextStack, rootId)
            : buildDocumentRootHeadingGroupMeta(task, rootId)
        );
      }

      walk(getElementChildren(element), nextStack);
    }
  };

  walk(getElementChildren(doc.body), []);
  return result;
}

function resolveSectionParentId(rootId: string, element: Element): string {
  let current: Element | null = element.parentElement;
  while (current) {
    const nodeId = getNodeId(current);
    if (nodeId) {
      return nodeId;
    }
    current = current.parentElement;
  }
  return rootId;
}

function collectHeadingSectionSiblings(headingElement: Element): Element[] {
  const targetLevel = resolveDomHeadingLevel(headingElement);
  const sectionElements: Element[] = [];
  let current = headingElement.nextElementSibling;

  while (current) {
    if (isHeadingDomElement(current) && resolveDomHeadingLevel(current) <= targetLevel) {
      break;
    }
    sectionElements.push(current);
    current = current.nextElementSibling;
  }

  return sectionElements;
}

function findTopLevelTaskList(sectionElements: Element[]): Element | null {
  for (const element of sectionElements) {
    if (isTaskListDomElement(element)) {
      return element;
    }
  }
  return null;
}

function resolveLastSiblingId(sectionElements: Element[]): string | undefined {
  for (let index = sectionElements.length - 1; index >= 0; index -= 1) {
    const nodeId = getNodeId(sectionElements[index]);
    if (nodeId) {
      return nodeId;
    }
  }
  return undefined;
}

export function normalizeTaskViewGroupMode(
  value: unknown,
  fallback: TaskViewGroupMode = 'status'
): TaskViewGroupMode {
  return isTaskViewGroupMode(value) ? value : fallback;
}

export function resolveStoredTaskViewGroupMode(
  value: unknown,
  legacyValue: unknown,
  fallback: TaskViewGroupMode = 'status'
): TaskViewGroupMode {
  if (isTaskViewGroupMode(value)) {
    return value;
  }

  if (legacyValue === true) {
    return 'group';
  }

  if (legacyValue === false) {
    return fallback;
  }

  return fallback;
}

export function getTaskHeadingGroupMeta(
  task: Task,
  metaMap?: ReadonlyMap<string, TaskHeadingGroupMeta>
): TaskHeadingGroupMeta {
  return metaMap?.get(task.id) || buildFallbackHeadingGroupMeta(task);
}

function getTaskRepeatSeriesId(task: Task): string {
  return typeof task.repeatSeriesId === 'string' ? task.repeatSeriesId.trim() : '';
}

function finalizeTaskHeadingGroupResult(
  taskList: Task[],
  result: Map<string, TaskHeadingGroupMeta>
): Map<string, TaskHeadingGroupMeta> {
  const repeatSeriesMetaMap = new Map<string, TaskHeadingGroupMeta>();

  for (const task of taskList) {
    if (task.isVirtual) {
      continue;
    }
    const seriesId = getTaskRepeatSeriesId(task);
    if (!seriesId || repeatSeriesMetaMap.has(seriesId)) {
      continue;
    }
    const meta = result.get(task.id);
    if (meta) {
      repeatSeriesMetaMap.set(seriesId, meta);
    }
  }

  for (const task of taskList) {
    if (result.has(task.id)) {
      continue;
    }

    const seriesId = getTaskRepeatSeriesId(task);
    if (task.isVirtual && seriesId) {
      const templateMeta = repeatSeriesMetaMap.get(seriesId);
      if (templateMeta) {
        result.set(task.id, { ...templateMeta });
        continue;
      }
    }

    result.set(task.id, buildFallbackHeadingGroupMeta(task));
  }

  return result;
}

export async function resolveTaskHeadingGroups(taskList: Task[]): Promise<Map<string, TaskHeadingGroupMeta>> {
  const result = new Map<string, TaskHeadingGroupMeta>();

  for (const task of taskList) {
    const seriesId = getTaskRepeatSeriesId(task);
    const isRepeatVirtualTask = task.isVirtual === true && seriesId.length > 0;
    if (!isRepeatVirtualTask && (task.type !== 'block' || !task.blockId)) {
      result.set(task.id, buildStandaloneHeadingGroupMeta());
    }
  }

  const blockTasks = taskList.filter(
    (task): task is Task & { blockId: string } =>
      task.type === 'block'
      && typeof task.blockId === 'string'
      && task.blockId.trim().length > 0
  );

  if (blockTasks.length === 0) {
    return finalizeTaskHeadingGroupResult(taskList, result);
  }

  if (!blockTasks.some(task => typeof task.rootId === 'string' && task.rootId.trim().length > 0)) {
    for (const task of blockTasks) {
      result.set(task.id, buildFallbackHeadingGroupMeta(task));
    }
    return finalizeTaskHeadingGroupResult(taskList, result);
  }

  const taskByBlockId = new Map<string, Task>();
  blockTasks.forEach((task) => {
    taskByBlockId.set(task.blockId, task);
  });

  const rootIds = Array.from(new Set(
    blockTasks
      .map(task => (typeof task.rootId === 'string' ? task.rootId.trim() : ''))
      .filter(Boolean)
  ));

  const rootIdSet = new Set(rootIds);
  const rootIdsClause = rootIds
    .map(rootId => `'${escapeSqlLiteral(rootId)}'`)
    .join(',');

  try {
    const domResults = await Promise.all(rootIds.map(async (rootId) => {
      try {
        const response = await getBlockDOM(rootId);
        return { rootId, dom: response?.dom || '' };
      } catch {
        return { rootId, dom: '' };
      }
    }));

    for (const { rootId, dom } of domResults) {
      const domAssignments = assignGroupsFromDom(rootId, dom, taskByBlockId);
      domAssignments.forEach((meta, taskId) => {
        result.set(taskId, meta);
      });
    }

    const unresolvedBlockTasks = blockTasks.filter(task => !result.has(task.id));
    if (unresolvedBlockTasks.length === 0) {
      return finalizeTaskHeadingGroupResult(taskList, result);
    }

    const rows = await sql(`
      SELECT b.id, b.parent_id, b.root_id, b.type, b.subtype, b.content, b.sort, b.created
      FROM blocks b
      WHERE b.root_id IN (${rootIdsClause})
    `) as any[];

    const rowsByRootId = new Map<string, HeadingContextRow[]>();
    if (Array.isArray(rows)) {
      rows.forEach((row) => {
        const id = typeof row?.id === 'string' ? row.id : '';
        const rootId = typeof row?.root_id === 'string' ? row.root_id : '';
        if (!id || !rootId || !rootIdSet.has(rootId)) {
          return;
        }

        const list = rowsByRootId.get(rootId) || [];
        list.push({
          id,
          parent_id: typeof row?.parent_id === 'string' ? row.parent_id : '',
          root_id: rootId,
          type: typeof row?.type === 'string' ? row.type : '',
          subtype: typeof row?.subtype === 'string' ? row.subtype : '',
          content: typeof row?.content === 'string' ? row.content : '',
          sort: row?.sort,
          created: typeof row?.created === 'string' ? row.created : undefined
        });
        rowsByRootId.set(rootId, list);
      });
    }

    const unresolvedTaskIds = new Set(unresolvedBlockTasks.map(task => task.id));

    for (const rootId of rootIds) {
      const documentBlocks = rowsByRootId.get(rootId) || [];
      if (documentBlocks.length === 0) {
        continue;
      }

      const childrenByParentId = new Map<string, HeadingContextRow[]>();
      documentBlocks.forEach((block) => {
        const parentId = block.parent_id || '';
        const siblings = childrenByParentId.get(parentId) || [];
        siblings.push(block);
        childrenByParentId.set(parentId, siblings);
      });

      childrenByParentId.forEach((siblings) => {
        siblings.sort(compareBlockOrder);
      });

      const visited = new Set<string>();
      let headingOrder = 0;

      const processSiblingBlocks = (parentId: string, inheritedStack: HeadingStackEntry[]): void => {
        const siblings = childrenByParentId.get(parentId) || [];
        let currentStack = [...inheritedStack];

        for (const block of siblings) {
          if (visited.has(block.id)) {
            continue;
          }
          visited.add(block.id);

          let blockStack = currentStack;
          if (isHeadingBlock(block)) {
            headingOrder += 1;
            blockStack = pushHeadingEntry(currentStack, {
              id: block.id,
              label: resolveHeadingLabel(block),
              level: resolveHeadingLevel(block),
              order: headingOrder
            });
            currentStack = blockStack;
          }

          const task = taskByBlockId.get(block.id);
          if (task && unresolvedTaskIds.has(task.id) && !result.has(task.id)) {
            result.set(
              task.id,
              blockStack.length > 0
                ? buildHeadingChainGroupMeta(task, blockStack, rootId)
                : buildDocumentRootHeadingGroupMeta(task, rootId)
            );
          }

          processSiblingBlocks(block.id, blockStack);
        }
      };

      processSiblingBlocks(rootId, []);

      documentBlocks
        .filter(block => !visited.has(block.id))
        .sort(compareBlockOrder)
        .forEach((block) => {
          processSiblingBlocks(block.parent_id || rootId, []);
          if (visited.has(block.id)) {
            return;
          }

          visited.add(block.id);
          let blockStack: HeadingStackEntry[] = [];
          if (isHeadingBlock(block)) {
            headingOrder += 1;
            blockStack = pushHeadingEntry([], {
              id: block.id,
              label: resolveHeadingLabel(block),
              level: resolveHeadingLevel(block),
              order: headingOrder
            });
          }

          const task = taskByBlockId.get(block.id);
          if (task && unresolvedTaskIds.has(task.id) && !result.has(task.id)) {
            result.set(
              task.id,
              blockStack.length > 0
                ? buildHeadingChainGroupMeta(task, blockStack, rootId)
                : buildDocumentRootHeadingGroupMeta(task, rootId)
            );
          }

          processSiblingBlocks(block.id, blockStack);
        });
    }
  } catch {
    for (const task of blockTasks) {
      result.set(task.id, buildFallbackHeadingGroupMeta(task));
    }
  }

  for (const task of blockTasks) {
    if (!result.has(task.id)) {
      result.set(task.id, buildFallbackHeadingGroupMeta(task));
    }
  }

  return finalizeTaskHeadingGroupResult(taskList, result);
}

export async function resolveTaskHeadingDropTarget(
  meta: TaskHeadingGroupMeta
): Promise<TaskHeadingDropTarget | null> {
  const rootId = typeof meta.rootId === 'string' ? meta.rootId.trim() : '';
  if (!rootId || meta.kind === 'standalone') {
    return null;
  }

  try {
    const response = await getBlockDOM(rootId);
    const dom = response?.dom || '';
    if (!dom) {
      return { rootId, parentId: rootId };
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(dom, 'text/html');

    if (meta.kind === 'document-root' || !meta.headingBlockId) {
      const topLevelElements = getElementChildren(doc.body);
      const sectionElements: Element[] = [];
      for (const element of topLevelElements) {
        if (isHeadingDomElement(element)) {
          break;
        }
        sectionElements.push(element);
      }

      const taskList = findTopLevelTaskList(sectionElements);
      const listId = getNodeId(taskList);
      if (listId) {
        return { rootId, parentId: listId };
      }

      return {
        rootId,
        parentId: rootId,
        previousId: resolveLastSiblingId(sectionElements)
      };
    }

    const selector = `[data-node-id="${escapeAttributeSelector(meta.headingBlockId)}"]`;
    const headingElement = doc.querySelector(selector);
    if (!(headingElement instanceof Element)) {
      return { rootId, parentId: rootId };
    }

    const sectionElements = collectHeadingSectionSiblings(headingElement);
    const taskList = findTopLevelTaskList(sectionElements);
    const listId = getNodeId(taskList);
    if (listId) {
      return { rootId, parentId: listId };
    }

    return {
      rootId,
      parentId: resolveSectionParentId(rootId, headingElement),
      previousId: resolveLastSiblingId(sectionElements) || meta.headingBlockId
    };
  } catch {
    return {
      rootId,
      parentId: rootId,
      previousId: meta.headingBlockId
    };
  }
}
