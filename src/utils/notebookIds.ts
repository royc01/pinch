export function normalizeNotebookIds(
  ids: unknown,
  options: { sort?: boolean } = {}
): string[] {
  if (!Array.isArray(ids)) return [];
  const normalized = Array.from(
    new Set(
      ids
        .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
        .map(id => id.trim())
    )
  );
  return options.sort ? normalized.sort() : normalized;
}
