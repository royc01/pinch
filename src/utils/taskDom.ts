function getTaskActionElement(root: Element | null, ownerId?: string): Element | null {
  if (!root) return null;
  const matchesOwner = (action: Element): boolean => {
    if (!ownerId) return true;
    return action.closest('[data-node-id]')?.getAttribute('data-node-id') === ownerId;
  };

  if (root.classList.contains('protyle-action--task') && matchesOwner(root)) {
    return root;
  }

  for (const action of root.querySelectorAll('.protyle-action--task')) {
    if (matchesOwner(action)) return action;
  }

  const fallback = root.closest('.protyle-task')?.querySelector('.protyle-action--task');
  return fallback && matchesOwner(fallback) ? fallback : null;
}

export function parseTaskCompletedFromElement(root: Element | null, ownerId?: string): boolean | null {
  if (!root) return null;

  const ownerElement = root.getAttribute('data-type') === 'NodeListItem'
    ? root
    : (root.closest('[data-type="NodeListItem"]') || root);
  const marker = ownerElement.getAttribute('data-task');
  if (marker !== null) return marker.trim().length > 0;

  const action = getTaskActionElement(ownerElement, ownerId);
  if (!action) return null;
  const svg = action.querySelector('use');
  const href = svg?.getAttribute('xlink:href') || svg?.getAttribute('href') || '';
  return href ? href === '#iconCheck' : null;
}

export function getLiveTaskElement(blockId: string): Element | null {
  for (const selector of [
    `.protyle [data-node-id="${blockId}"][data-type="NodeListItem"]`,
    `.protyle [data-node-id="${blockId}"]`,
    `[data-node-id="${blockId}"][data-type="NodeListItem"]`,
    `[data-node-id="${blockId}"]`
  ]) {
    const matched = document.querySelector(selector);
    if (matched) return matched;
  }
  return null;
}

export function getTaskElementFromDoc(doc: Document, blockId: string): Element | null {
  return doc.querySelector(`[data-node-id="${blockId}"][data-type="NodeListItem"]`)
    || doc.querySelector(`[data-node-id="${blockId}"]`);
}

export function parseTaskCompleted(blockId: string, parsedDoc?: Document | null): boolean | null {
  const liveCompleted = parseTaskCompletedFromElement(getLiveTaskElement(blockId), blockId);
  if (liveCompleted !== null) return liveCompleted;

  if (parsedDoc) {
    const domCompleted = parseTaskCompletedFromElement(getTaskElementFromDoc(parsedDoc, blockId), blockId);
    if (domCompleted !== null) return domCompleted;
  }

  return null;
}
