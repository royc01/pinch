import type { Tag } from '@/api';

export function getTagDescendantIds(tags: readonly Tag[], rootId: string): Set<string> {
  const children = new Map<string, string[]>();
  for (const tag of tags) {
    if (!tag.parentId) continue;
    const siblings = children.get(tag.parentId) || [];
    siblings.push(tag.id);
    children.set(tag.parentId, siblings);
  }

  const result = new Set<string>();
  const pending = [rootId];
  while (pending.length > 0) {
    const id = pending.pop()!;
    if (result.has(id)) continue;
    result.add(id);
    pending.push(...(children.get(id) || []));
  }
  return result;
}

export function getTagDepth(tags: readonly Tag[], tagId: string): number {
  const parents = new Map(tags.map(tag => [tag.id, tag.parentId]));
  const visited = new Set<string>();
  let depth = 0;
  let current = parents.get(tagId);
  while (current && !visited.has(current)) {
    visited.add(current);
    depth += 1;
    current = parents.get(current);
  }
  return depth;
}

export function getTagPath(tags: readonly Tag[], tagId: string): string[] {
  const byId = new Map(tags.map(tag => [tag.id, tag]));
  const path: string[] = [];
  const visited = new Set<string>();
  let current = byId.get(tagId);
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    path.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
}
