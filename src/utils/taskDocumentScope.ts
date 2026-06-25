import type { Task } from '@/api';

export interface RootDocumentPathFallback {
  path?: string;
}

export interface TaskDocumentPathLookup {
  pathByKey: Map<string, string>;
  pathByDocumentId: Map<string, string>;
  notebookIdsByDocumentId: Map<string, Set<string>>;
}

export interface TaskDocumentScopeMatcher {
  cacheKey: string;
  lookup: TaskDocumentPathLookup;
  matches: (task: Pick<Task, 'hPath' | 'notebookId' | 'rootId'>) => boolean;
}

export interface TaskDocumentScopeFallback {
  notebookId?: string;
  path?: string;
}

function normalizeDocumentId(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeTaskDocumentPath(value: unknown): string {
  const rawPath = typeof value === 'string' ? value.trim() : '';
  if (!rawPath) {
    return '';
  }

  const normalizedPath = rawPath
    .replace(/\\/g, '/')
    .replace(/\/{2,}/g, '/')
    .replace(/\/+$/g, '');

  if (!normalizedPath || normalizedPath === '/') {
    return '';
  }

  return normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
}

export function buildTaskDocumentKey(notebookId: string, documentId: string): string {
  return `${notebookId}:${documentId}`;
}

function rememberDocumentNotebook(
  lookup: TaskDocumentPathLookup,
  documentId: string,
  notebookId: string
): void {
  const notebooks = lookup.notebookIdsByDocumentId.get(documentId) || new Set<string>();
  notebooks.add(notebookId);
  lookup.notebookIdsByDocumentId.set(documentId, notebooks);
}

function rememberDocumentPath(
  lookup: TaskDocumentPathLookup,
  notebookId: string,
  documentId: string,
  path: string
): void {
  rememberDocumentNotebook(lookup, documentId, notebookId);
  if (!path) {
    return;
  }

  lookup.pathByKey.set(buildTaskDocumentKey(notebookId, documentId), path);
  if (!lookup.pathByDocumentId.has(documentId)) {
    lookup.pathByDocumentId.set(documentId, path);
  }
}

export function buildTaskDocumentPathLookup(
  tasks: readonly Task[],
  fallbackMetadataByRootId?: ReadonlyMap<string, RootDocumentPathFallback | undefined>
): TaskDocumentPathLookup {
  const lookup: TaskDocumentPathLookup = {
    pathByKey: new Map(),
    pathByDocumentId: new Map(),
    notebookIdsByDocumentId: new Map()
  };

  for (const task of tasks) {
    if (task.type !== 'block') {
      continue;
    }

    const notebookId = normalizeDocumentId(task.notebookId);
    const documentId = normalizeDocumentId(task.rootId);
    if (!notebookId || !documentId) {
      continue;
    }

    const fallbackPath = normalizeTaskDocumentPath(
      fallbackMetadataByRootId?.get(documentId)?.path
    );
    const path = normalizeTaskDocumentPath(task.hPath) || fallbackPath;
    rememberDocumentPath(lookup, notebookId, documentId, path);
  }

  fallbackMetadataByRootId?.forEach((metadata, documentId) => {
    const normalizedDocumentId = normalizeDocumentId(documentId);
    const path = normalizeTaskDocumentPath(metadata?.path);
    if (normalizedDocumentId && path && !lookup.pathByDocumentId.has(normalizedDocumentId)) {
      lookup.pathByDocumentId.set(normalizedDocumentId, path);
    }
  });

  return lookup;
}

function getDocumentScopePaths(
  documentId: string,
  lookup: TaskDocumentPathLookup,
  fallback?: TaskDocumentScopeFallback
): string[] {
  const paths: string[] = [];
  const seen = new Set<string>();
  const notebookIds = lookup.notebookIdsByDocumentId.get(documentId);

  const addPath = (path: string | undefined): void => {
    const normalizedPath = normalizeTaskDocumentPath(path);
    if (!normalizedPath || seen.has(normalizedPath)) {
      return;
    }
    seen.add(normalizedPath);
    paths.push(normalizedPath);
  };

  notebookIds?.forEach((notebookId) => {
    addPath(lookup.pathByKey.get(buildTaskDocumentKey(notebookId, documentId)));
  });
  addPath(fallback?.path);
  addPath(lookup.pathByDocumentId.get(documentId));

  return paths;
}

function getTaskDocumentPath(
  task: Pick<Task, 'hPath' | 'notebookId' | 'rootId'>,
  lookup: TaskDocumentPathLookup
): string {
  const directPath = normalizeTaskDocumentPath(task.hPath);
  if (directPath) {
    return directPath;
  }

  const notebookId = normalizeDocumentId(task.notebookId);
  const documentId = normalizeDocumentId(task.rootId);
  if (notebookId && documentId) {
    const keyedPath = lookup.pathByKey.get(buildTaskDocumentKey(notebookId, documentId));
    if (keyedPath) {
      return keyedPath;
    }
  }

  return documentId ? lookup.pathByDocumentId.get(documentId) || '' : '';
}

export function isDocumentPathInScope(path: string, scopePath: string): boolean {
  const normalizedPath = normalizeTaskDocumentPath(path);
  const normalizedScopePath = normalizeTaskDocumentPath(scopePath);
  if (!normalizedPath || !normalizedScopePath) {
    return false;
  }

  return normalizedPath === normalizedScopePath
    || normalizedPath.startsWith(`${normalizedScopePath}/`);
}

export function taskMatchesDocumentScope(
  task: Pick<Task, 'hPath' | 'notebookId' | 'rootId'>,
  documentId: string,
  lookup: TaskDocumentPathLookup,
  fallback?: TaskDocumentScopeFallback
): boolean {
  const normalizedDocumentId = normalizeDocumentId(documentId);
  if (!normalizedDocumentId || normalizedDocumentId === 'all') {
    return true;
  }

  const taskDocumentId = normalizeDocumentId(task.rootId);
  if (taskDocumentId === normalizedDocumentId) {
    return true;
  }

  const scopePaths = getDocumentScopePaths(normalizedDocumentId, lookup, fallback);
  if (scopePaths.length === 0) {
    return false;
  }

  const taskNotebookId = normalizeDocumentId(task.notebookId);
  const scopeNotebookIds = lookup.notebookIdsByDocumentId.get(normalizedDocumentId);
  const fallbackNotebookId = normalizeDocumentId(fallback?.notebookId);
  if (fallbackNotebookId && taskNotebookId !== fallbackNotebookId) {
    return false;
  }
  if (!fallbackNotebookId && scopeNotebookIds && scopeNotebookIds.size > 0 && !scopeNotebookIds.has(taskNotebookId)) {
    return false;
  }

  const taskPath = getTaskDocumentPath(task, lookup);
  return scopePaths.some(scopePath => isDocumentPathInScope(taskPath, scopePath));
}

export function createTaskDocumentScopeMatcher(
  documentId: string,
  tasks: readonly Task[],
  fallbackMetadataByRootId?: ReadonlyMap<string, RootDocumentPathFallback | undefined>
): TaskDocumentScopeMatcher {
  const normalizedDocumentId = normalizeDocumentId(documentId);
  if (!normalizedDocumentId || normalizedDocumentId === 'all') {
    return {
      cacheKey: 'all',
      lookup: {
        pathByKey: new Map(),
        pathByDocumentId: new Map(),
        notebookIdsByDocumentId: new Map()
      },
      matches: () => true
    };
  }

  const lookup = buildTaskDocumentPathLookup(tasks, fallbackMetadataByRootId);
  const scopePaths = getDocumentScopePaths(normalizedDocumentId, lookup);
  const scopedDocumentIds = new Set<string>();
  for (const task of tasks) {
    const taskDocumentId = normalizeDocumentId(task.rootId);
    if (taskDocumentId && taskMatchesDocumentScope(task, normalizedDocumentId, lookup)) {
      scopedDocumentIds.add(taskDocumentId);
    }
  }

  const cacheKey = [
    normalizedDocumentId,
    scopePaths.slice().sort().join(','),
    Array.from(scopedDocumentIds).sort().join(',')
  ].join(':');

  return {
    cacheKey,
    lookup,
    matches: task => taskMatchesDocumentScope(task, normalizedDocumentId, lookup)
  };
}
