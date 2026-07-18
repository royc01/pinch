function normalizeTaskTagId(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export type TaskTagBatchAction = 'set-primary' | 'add' | 'remove';

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

export function filterKnownTaskTagIds(tags: unknown, knownTagIds: ReadonlySet<string>): string[] {
  return normalizeTaskTagIds(tags).filter(tagId => knownTagIds.has(tagId));
}

export function resolveTaskTagIds(tags: unknown, groupId?: unknown): string[] {
  const normalizedTags = normalizeTaskTagIds(tags);
  const primaryTagId = normalizeTaskTagId(groupId);
  if (!primaryTagId) {
    return normalizedTags;
  }
  if (normalizedTags.includes(primaryTagId)) {
    return [primaryTagId, ...normalizedTags.filter((tagId) => tagId !== primaryTagId)];
  }
  return [primaryTagId, ...normalizedTags];
}

export function resolveTaskPrimaryTagId(tags: unknown, groupId?: unknown): string {
  return resolveTaskTagIds(tags, groupId)[0] || '';
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
      'custom-task-group': primaryTagId
    }
  };
}

export function setPrimaryTaskTag(tags: unknown, primaryTagId: unknown): string[] {
  const normalizedPrimary = normalizeTaskTagId(primaryTagId);
  if (!normalizedPrimary) {
    return [];
  }
  const normalizedTags = normalizeTaskTagIds(tags);
  return [normalizedPrimary, ...normalizedTags.filter((tagId) => tagId !== normalizedPrimary)];
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
  if (existingIndex === 0) {
    return normalizedTags.slice(1);
  }
  return [normalizedTarget, ...normalizedTags.filter((tagId) => tagId !== normalizedTarget)];
}

export function applyTaskTagBatchAction(
  tags: unknown,
  action: TaskTagBatchAction,
  targetTagId: unknown
): string[] {
  const normalizedTags = normalizeTaskTagIds(tags);
  const normalizedTarget = normalizeTaskTagId(targetTagId);
  if (action === 'set-primary') {
    return setPrimaryTaskTag(normalizedTags, normalizedTarget);
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
  noneId: string
): boolean {
  if (activeFilterIds.length === 0) {
    return true;
  }
  const tagIds = resolveTaskTagIds(tags, groupId);
  if (tagIds.length === 0) {
    return activeFilterIds.includes(noneId);
  }
  return tagIds.some((tagId) => activeFilterIds.includes(tagId));
}
