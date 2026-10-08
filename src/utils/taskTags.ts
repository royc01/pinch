function normalizeTaskTagId(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export type TaskTagBatchAction = 'add' | 'remove' | 'clear';

export function normalizeTaskTagIds(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const item of input) {
    const value = normalizeTaskTagId(item);
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    normalized.push(value);
  }
  return normalized;
}

export function parseTaskTagIdsAttribute(value: unknown): string[] {
  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  try {
    return normalizeTaskTagIds(JSON.parse(value));
  } catch {
    return [];
  }
}

export function filterKnownTaskTagIds(tags: unknown, knownTagIds: ReadonlySet<string>): string[] {
  return normalizeTaskTagIds(tags).filter(tagId => knownTagIds.has(tagId));
}

export function resolveTaskTagGroupIds(
  tags: unknown,
  groupId: unknown,
  knownTagIds: { has(tagId: string): boolean },
  noneId: string
): string[] {
  const matchedTagIds = resolveTaskTagIds(tags, groupId)
    .filter(tagId => knownTagIds.has(tagId));
  return matchedTagIds.length > 0 ? matchedTagIds : [noneId];
}

export function resolveTaskTagIds(tags: unknown, groupId?: unknown): string[] {
  const normalizedTags = normalizeTaskTagIds(tags);
  const legacyGroupId = normalizeTaskTagId(groupId);
  if (!legacyGroupId || normalizedTags.includes(legacyGroupId)) {
    return normalizedTags;
  }
  // custom-task-group predates multi-tag storage. Keep reading it so old tasks
  // retain their tag, but never let it reorder an existing tag selection.
  return [...normalizedTags, legacyGroupId];
}

export function buildTaskTagState(tags: unknown, groupId?: unknown): {
  tagIds: string[];
  primaryTagId: string;
} {
  const tagIds = resolveTaskTagIds(tags, groupId);
  return {
    tagIds,
    primaryTagId: tagIds[0] || ''
  };
}

export function areTaskTagIdsEqual(left: unknown, right: unknown): boolean {
  const normalizedLeft = normalizeTaskTagIds(left);
  const normalizedRight = normalizeTaskTagIds(right);
  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }
  return normalizedLeft.every((tagId, index) => tagId === normalizedRight[index]);
}

export function buildTaskTagAttrs(tags: unknown, groupId?: unknown): {
  tagIds: string[];
  primaryTagId: string;
  attrs: Record<'custom-task-tags' | 'custom-task-group', string>;
} {
  const { tagIds, primaryTagId } = buildTaskTagState(tags, groupId);
  return {
    tagIds,
    primaryTagId,
    attrs: {
      'custom-task-tags': tagIds.length > 0 ? JSON.stringify(tagIds) : '',
      'custom-task-group': ''
    }
  };
}

export function removeTaskTags(tags: unknown, removedTagIds: Iterable<string>): string[] {
  const removedSet = new Set(Array.from(removedTagIds).map((tagId) => normalizeTaskTagId(tagId)).filter(Boolean));
  if (removedSet.size === 0) {
    return normalizeTaskTagIds(tags);
  }
  return normalizeTaskTagIds(tags).filter((tagId) => !removedSet.has(tagId));
}

export function toggleTaskTagSelection(tags: unknown, targetTagId: unknown): string[] {
  const normalizedTarget = normalizeTaskTagId(targetTagId);
  const normalizedTags = normalizeTaskTagIds(tags);
  if (!normalizedTarget) {
    return normalizedTags;
  }

  const existingIndex = normalizedTags.indexOf(normalizedTarget);
  if (existingIndex === -1) {
    return [...normalizedTags, normalizedTarget];
  }
  return normalizedTags.filter((tagId) => tagId !== normalizedTarget);
}

export function moveTaskTagBetweenGroups(
  tags: unknown,
  sourceTagId: unknown,
  targetTagId: unknown
): string[] {
  const normalizedTags = normalizeTaskTagIds(tags);
  const normalizedSource = normalizeTaskTagId(sourceTagId);
  const normalizedTarget = normalizeTaskTagId(targetTagId);
  if (!normalizedTarget) {
    return [];
  }
  if (normalizedSource === normalizedTarget) {
    return normalizedTags;
  }
  const remaining = normalizedSource
    ? normalizedTags.filter(tagId => tagId !== normalizedSource)
    : normalizedTags;
  return remaining.includes(normalizedTarget) ? remaining : [...remaining, normalizedTarget];
}

export function applyTaskTagBatchAction(
  tags: unknown,
  action: TaskTagBatchAction,
  targetTagId: unknown
): string[] {
  const normalizedTags = normalizeTaskTagIds(tags);
  const normalizedTarget = normalizeTaskTagId(targetTagId);
  if (action === 'clear') {
    return [];
  }
  if (!normalizedTarget) {
    return normalizedTags;
  }
  if (action === 'add') {
    return normalizedTags.includes(normalizedTarget)
      ? normalizedTags
      : [...normalizedTags, normalizedTarget];
  }
  return normalizedTags.filter((tagId) => tagId !== normalizedTarget);
}

export function matchesTaskTagFilter(
  tags: unknown,
  groupId: unknown,
  activeFilterIds: readonly string[],
  noneId: string,
  descendantIdsByTag?: ReadonlyMap<string, ReadonlySet<string>>
): boolean {
  if (activeFilterIds.length === 0) {
    return true;
  }
  const tagIds = resolveTaskTagIds(tags, groupId);
  if (tagIds.length === 0) {
    return activeFilterIds.includes(noneId);
  }
  return activeFilterIds.some((filterId) => {
    const matchingIds = descendantIdsByTag?.get(filterId);
    return matchingIds ? tagIds.some(tagId => matchingIds.has(tagId)) : tagIds.includes(filterId);
  });
}
