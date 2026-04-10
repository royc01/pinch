import type { Task } from '@/api';

export function buildLiveTaskDomOrderMap(): Map<string, number> {
  const orderMap = new Map<string, number>();
  if (typeof document === 'undefined') {
    return orderMap;
  }

  const domRoots = Array.from(document.querySelectorAll('.protyle-wysiwyg'));
  const roots: ParentNode[] = domRoots.length > 0 ? domRoots : [document];
  let order = 0;

  for (const root of roots) {
    const items = root.querySelectorAll('[data-type="NodeListItem"][data-subtype="t"][data-node-id]');
    items.forEach((item) => {
      const blockId = item.getAttribute('data-node-id');
      if (!blockId || orderMap.has(blockId)) {
        return;
      }
      const hasTaskAction = item.querySelector('.protyle-action--task');
      if (!hasTaskAction) {
        return;
      }
      orderMap.set(blockId, order);
      order += 1;
    });
  }

  return orderMap;
}

export function compareTaskDocumentSortKey(a: Task, b: Task, domOrderMap?: Map<string, number>): number {
  if (!a.rootId || !b.rootId || a.rootId !== b.rootId) {
    return 0;
  }

  if (domOrderMap) {
    const blockIdA = typeof a.blockId === 'string' ? a.blockId : '';
    const blockIdB = typeof b.blockId === 'string' ? b.blockId : '';
    if (blockIdA && blockIdB) {
      const orderA = domOrderMap.get(blockIdA);
      const orderB = domOrderMap.get(blockIdB);
      if (orderA !== undefined && orderB !== undefined && orderA !== orderB) {
        return orderA - orderB;
      }
    }
  }

  const documentOrderA = typeof a.documentOrder === 'number' ? a.documentOrder : null;
  const documentOrderB = typeof b.documentOrder === 'number' ? b.documentOrder : null;
  if (documentOrderA !== null && documentOrderB !== null && documentOrderA !== documentOrderB) {
    return documentOrderA - documentOrderB;
  }
  if (documentOrderA !== null && documentOrderB === null) {
    return -1;
  }
  if (documentOrderA === null && documentOrderB !== null) {
    return 1;
  }

  const sortA = typeof a.blockSort === 'string' ? a.blockSort.trim() : '';
  const sortB = typeof b.blockSort === 'string' ? b.blockSort.trim() : '';
  if (!sortA || !sortB || sortA === sortB) {
    return 0;
  }
  const sortANumeric = /^\d+$/.test(sortA);
  const sortBNumeric = /^\d+$/.test(sortB);
  if (sortANumeric && sortBNumeric) {
    if (sortA.length !== sortB.length) {
      return sortA.length - sortB.length;
    }
    return sortA < sortB ? -1 : 1;
  }
  return sortA.localeCompare(sortB);
}

export function compareTaskCreatedAtDesc(a: Task, b: Task): number {
  const createdA = Date.parse(a.createdAt || '');
  const createdB = Date.parse(b.createdAt || '');
  const hasCreatedA = Number.isFinite(createdA);
  const hasCreatedB = Number.isFinite(createdB);

  if (hasCreatedA && hasCreatedB) {
    if (createdA !== createdB) {
      return createdB - createdA;
    }
    return 0;
  }
  if (hasCreatedA && !hasCreatedB) {
    return -1;
  }
  if (!hasCreatedA && hasCreatedB) {
    return 1;
  }

  const createdKeyA = a.createdAt || a.blockId || a.id || '';
  const createdKeyB = b.createdAt || b.blockId || b.id || '';
  if (createdKeyA === createdKeyB) {
    return 0;
  }
  return createdKeyB.localeCompare(createdKeyA);
}
