import { usePlugin } from '@/main';

export interface DocumentGroupMember {
  documentId: string;
  notebookId: string;
  name?: string;
  path?: string;
}

export interface DocumentGroup {
  id: string;
  name: string;
  members: DocumentGroupMember[];
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface DocumentGroupStorage {
  version: number;
  groups: DocumentGroup[];
  updatedAt: string;
}

const DOCUMENT_GROUPS_STORAGE_KEY = 'Pinch-document-groups.json';
const DOCUMENT_GROUPS_STORAGE_VERSION = 1;

function normalizeDocumentGroupMembers(input: unknown): DocumentGroupMember[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const normalized: DocumentGroupMember[] = [];
  const seen = new Set<string>();

  for (const raw of input) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }
    const member = raw as Record<string, unknown>;
    const documentId = typeof member.documentId === 'string' ? member.documentId.trim() : '';
    const notebookId = typeof member.notebookId === 'string' ? member.notebookId.trim() : '';
    if (!documentId || !notebookId) {
      continue;
    }

    const key = `${notebookId}:${documentId}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    const name = typeof member.name === 'string' && member.name.trim().length > 0
      ? member.name.trim()
      : undefined;
    const path = typeof member.path === 'string' && member.path.trim().length > 0
      ? member.path.trim()
      : undefined;

    normalized.push({
      documentId,
      notebookId,
      name,
      path
    });
  }

  return normalized;
}

function normalizeDocumentGroups(input: unknown): DocumentGroup[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const normalized: DocumentGroup[] = [];

  for (const raw of input) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }

    const group = raw as Record<string, unknown>;
    const id = typeof group.id === 'string' ? group.id.trim() : '';
    const name = typeof group.name === 'string' ? group.name.trim() : '';
    if (!id || !name) {
      continue;
    }

    const members = normalizeDocumentGroupMembers(group.members);
    const order = typeof group.order === 'number' && Number.isFinite(group.order)
      ? group.order
      : undefined;
    const createdAt = typeof group.createdAt === 'string' ? group.createdAt : undefined;
    const updatedAt = typeof group.updatedAt === 'string' ? group.updatedAt : undefined;

    normalized.push({
      id,
      name,
      members,
      order,
      createdAt,
      updatedAt
    });
  }

  return normalized;
}

export async function loadDocumentGroups(): Promise<DocumentGroup[]> {
  const plugin = usePlugin();
  if (!plugin) {
    console.error('[DocumentGroups] loadDocumentGroups: plugin 未初始化');
    return [];
  }

  try {
    const raw = await plugin.loadData(DOCUMENT_GROUPS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) {
      return normalizeDocumentGroups(parsed);
    }

    const storage = parsed as Partial<DocumentGroupStorage> | null;
    if (storage && Array.isArray(storage.groups)) {
      return normalizeDocumentGroups(storage.groups);
    }
  } catch (error) {
    console.error('[DocumentGroups] loadDocumentGroups: 读取失败', error);
  }

  return [];
}

export async function saveDocumentGroups(groups: DocumentGroup[]): Promise<void> {
  const plugin = usePlugin();
  if (!plugin) {
    console.error('[DocumentGroups] saveDocumentGroups: plugin 未初始化');
    return;
  }

  const payload: DocumentGroupStorage = {
    version: DOCUMENT_GROUPS_STORAGE_VERSION,
    groups: normalizeDocumentGroups(groups),
    updatedAt: new Date().toISOString()
  };

  try {
    await plugin.saveData(DOCUMENT_GROUPS_STORAGE_KEY, payload);
  } catch (error) {
    console.error('[DocumentGroups] saveDocumentGroups: 写入失败', error);
  }
}
