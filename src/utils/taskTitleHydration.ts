export interface TaskTitleHydrationCandidate {
  type?: unknown;
  blockId?: unknown;
  title?: unknown;
}

export function hasMarkdownInlineMemo(title: string): boolean {
  const inlineMemoRegex = /\(\(([^()]+)\)\)/g;
  let match: RegExpExecArray | null;
  while ((match = inlineMemoRegex.exec(title)) !== null) {
    if (!/^[0-9]{14}-[a-z0-9]{7,}$/.test(match[1])) {
      return true;
    }
  }
  return false;
}

export function shouldHydrateTaskTitle(title: string): boolean {
  return title.includes('<sup') || hasMarkdownInlineMemo(title);
}

export function collectTaskTitleHydrationBlockIds(
  candidates: Iterable<TaskTitleHydrationCandidate>,
  limit: number
): string[] {
  const blockIds: string[] = [];
  const seen = new Set<string>();

  for (const task of candidates) {
    if (task.type !== 'block' || typeof task.blockId !== 'string' || !task.blockId) continue;
    if (seen.has(task.blockId)) continue;
    const title = typeof task.title === 'string' ? task.title : '';
    if (!shouldHydrateTaskTitle(title)) continue;

    seen.add(task.blockId);
    blockIds.push(task.blockId);
    if (blockIds.length >= limit) break;
  }

  return blockIds;
}
