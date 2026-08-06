import { listDocsByPath } from '@/api';

export interface FiletreeDocumentTreeDocument {
  id: string;
  name: string;
  notebookId: string;
  parentId?: string;
  storagePath?: string;
}

interface ListedDocument {
  id?: string;
  name?: string;
  path?: string;
  subFileCount?: number;
}

interface CachedDocumentTree {
  documents: FiletreeDocumentTreeDocument[];
  expiresAt: number;
}

const FILETREE_DOCUMENT_TREE_CACHE_TTL = 30_000;
const cachedDocumentTrees = new Map<string, CachedDocumentTree>();
const pendingDocumentTrees = new Map<string, Promise<FiletreeDocumentTreeDocument[]>>();
const documentTreeRequestVersions = new Map<string, number>();

function cloneDocuments(documents: readonly FiletreeDocumentTreeDocument[]): FiletreeDocumentTreeDocument[] {
  return documents.map(document => ({ ...document }));
}

function normalizeNotebookId(notebookId: string): string {
  return typeof notebookId === 'string' ? notebookId.trim() : '';
}

async function fetchDocumentTree(notebookId: string): Promise<FiletreeDocumentTreeDocument[]> {
  const documentsByKey = new Map<string, FiletreeDocumentTreeDocument>();
  const loadBranch = async (path: string, parentId?: string): Promise<void> => {
    const response = await listDocsByPath(notebookId, path);
    const files = response && typeof response === 'object' && Array.isArray((response as { files?: unknown }).files)
      ? (response as { files: ListedDocument[] }).files
      : null;
    if (!files) {
      throw new Error('Unexpected listDocsByPath response');
    }

    await Promise.all(files.map(async (file) => {
      const id = typeof file.id === 'string' ? file.id.trim() : '';
      const storagePath = typeof file.path === 'string' ? file.path.trim() : '';
      if (!id || !storagePath) {
        return;
      }

      documentsByKey.set(`${notebookId}:${id}`, {
        id,
        name: typeof file.name === 'string' && file.name.trim() ? file.name.trim() : id,
        notebookId,
        parentId,
        storagePath
      });
      if (Number(file.subFileCount) > 0) {
        await loadBranch(storagePath, id);
      }
    }));
  };

  await loadBranch('/');
  return Array.from(documentsByKey.values());
}

/**
 * Reads a notebook's document tree once and briefly reuses it across the
 * document-group and goal panels. Returned data is cloned for callers so a
 * component cannot mutate the shared snapshot.
 */
export async function loadFiletreeDocumentTree(
  notebookId: string,
  options: { force?: boolean } = {}
): Promise<FiletreeDocumentTreeDocument[]> {
  const normalizedNotebookId = normalizeNotebookId(notebookId);
  if (!normalizedNotebookId) {
    return [];
  }

  const force = options.force === true;
  const cached = cachedDocumentTrees.get(normalizedNotebookId);
  if (!force && cached && cached.expiresAt > Date.now()) {
    return cloneDocuments(cached.documents);
  }

  const pending = pendingDocumentTrees.get(normalizedNotebookId);
  if (!force && pending) {
    return cloneDocuments(await pending);
  }

  const requestVersion = (documentTreeRequestVersions.get(normalizedNotebookId) || 0) + 1;
  documentTreeRequestVersions.set(normalizedNotebookId, requestVersion);
  const request = fetchDocumentTree(normalizedNotebookId);
  pendingDocumentTrees.set(normalizedNotebookId, request);
  try {
    const documents = await request;
    if (documentTreeRequestVersions.get(normalizedNotebookId) === requestVersion) {
      cachedDocumentTrees.set(normalizedNotebookId, {
        documents: cloneDocuments(documents),
        expiresAt: Date.now() + FILETREE_DOCUMENT_TREE_CACHE_TTL
      });
    }
    return cloneDocuments(documents);
  } finally {
    if (pendingDocumentTrees.get(normalizedNotebookId) === request) {
      pendingDocumentTrees.delete(normalizedNotebookId);
    }
  }
}

export function invalidateFiletreeDocumentTree(notebookIds?: readonly string[]): void {
  if (!notebookIds) {
    cachedDocumentTrees.clear();
    pendingDocumentTrees.forEach((_request, notebookId) => {
      documentTreeRequestVersions.set(notebookId, (documentTreeRequestVersions.get(notebookId) || 0) + 1);
    });
    return;
  }

  notebookIds.forEach((notebookId) => {
    const normalizedNotebookId = normalizeNotebookId(notebookId);
    if (normalizedNotebookId) {
      cachedDocumentTrees.delete(normalizedNotebookId);
      documentTreeRequestVersions.set(normalizedNotebookId, (documentTreeRequestVersions.get(normalizedNotebookId) || 0) + 1);
    }
  });
}
