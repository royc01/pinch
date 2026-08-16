import { usePlugin } from '@/main';
import { enqueueStorageMutation } from '@/storageMutationCoordinator';
import { isMissingPluginStorageValue } from '@/utils/pluginStorage';

export interface DocumentGroupMember {
  documentId: string;
  notebookId: string;
  name?: string;
  path?: string;
}

export interface DocumentGroup {
  id: string;
  name: string;
  emoji?: string;
  members: DocumentGroupMember[];
  /** Explicit opt-outs from a selected ancestor document. */
  excludedDocumentKeys?: string[];
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

let documentGroupsCache: DocumentGroup[] | null = null;
let documentGroupsReadFailure: Error | null = null;

function cloneDocumentGroup(group: DocumentGroup): DocumentGroup {
  return {
    ...group,
    members: group.members.map(member => ({ ...member })),
    excludedDocumentKeys: group.excludedDocumentKeys ? [...group.excludedDocumentKeys] : undefined
  };
}

function cloneDocumentGroups(groups: DocumentGroup[]): DocumentGroup[] {
  return groups.map(cloneDocumentGroup);
}

function requireDocumentGroupPlugin(): NonNullable<ReturnType<typeof usePlugin>> {
  const plugin = usePlugin();
  if (!plugin) {
    throw new Error('[DocumentGroups] Plugin is not initialized');
  }
  return plugin;
}

function enqueueDocumentGroupMutation<T>(work: () => Promise<T>): Promise<T> {
  return enqueueStorageMutation(DOCUMENT_GROUPS_STORAGE_KEY, work);
}

function markDocumentGroupReadFailure(error: unknown): Error {
  const normalized = error instanceof Error ? error : new Error(String(error));
  documentGroupsReadFailure ||= normalized;
  return normalized;
}

function assertDocumentGroupsHealthy(): void {
  if (documentGroupsReadFailure) {
    throw new Error(
      `Cannot mutate ${DOCUMENT_GROUPS_STORAGE_KEY} until a successful reload; last read failed: ${documentGroupsReadFailure.message}`
    );
  }
}

function assertValidDocumentGroupMembers(input: unknown, groupIndex: number): void {
  if (input === undefined) {
    return;
  }
  if (!Array.isArray(input)) {
    throw new Error(`[DocumentGroups] Invalid members for group at index ${groupIndex}`);
  }
  input.forEach((raw, memberIndex) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error(`[DocumentGroups] Invalid member at index ${groupIndex}:${memberIndex}`);
    }
    const member = raw as Record<string, unknown>;
    if (
      typeof member.documentId !== 'string'
      || !member.documentId.trim()
      || typeof member.notebookId !== 'string'
      || !member.notebookId.trim()
    ) {
      throw new Error(`[DocumentGroups] Invalid member at index ${groupIndex}:${memberIndex}`);
    }
    for (const key of ['name', 'path']) {
      if (member[key] !== undefined && typeof member[key] !== 'string') {
        throw new Error(`[DocumentGroups] Invalid member ${key} at index ${groupIndex}:${memberIndex}`);
      }
    }
  });
}

function assertValidDocumentGroups(input: unknown): asserts input is unknown[] {
  if (!Array.isArray(input)) {
    throw new Error('[DocumentGroups] Invalid data format, expected groups array');
  }
  input.forEach((raw, groupIndex) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error(`[DocumentGroups] Invalid group at index ${groupIndex}`);
    }
    const group = raw as Record<string, unknown>;
    if (
      typeof group.id !== 'string'
      || !group.id.trim()
      || typeof group.name !== 'string'
      || !group.name.trim()
    ) {
      throw new Error(`[DocumentGroups] Invalid group at index ${groupIndex}`);
    }
    assertValidDocumentGroupMembers(group.members, groupIndex);
    if (group.excludedDocumentKeys !== undefined) {
      if (!Array.isArray(group.excludedDocumentKeys)) {
        throw new Error(`[DocumentGroups] Invalid exclusions for group at index ${groupIndex}`);
      }
      group.excludedDocumentKeys.forEach((key, keyIndex) => {
        if (typeof key !== 'string' || !/^[^:\s]+:[^:\s]+$/.test(key.trim())) {
          throw new Error(`[DocumentGroups] Invalid exclusion at index ${groupIndex}:${keyIndex}`);
        }
      });
    }
    if (group.emoji !== undefined && typeof group.emoji !== 'string') {
      throw new Error(`[DocumentGroups] Invalid emoji for group at index ${groupIndex}`);
    }
    if (group.order !== undefined && (typeof group.order !== 'number' || !Number.isFinite(group.order))) {
      throw new Error(`[DocumentGroups] Invalid order for group at index ${groupIndex}`);
    }
    for (const key of ['createdAt', 'updatedAt']) {
      if (group[key] !== undefined && typeof group[key] !== 'string') {
        throw new Error(`[DocumentGroups] Invalid ${key} for group at index ${groupIndex}`);
      }
    }
  });
}

function parseDocumentGroups(raw: unknown, strict: boolean): DocumentGroup[] {
  if (isMissingPluginStorageValue(raw)) {
    return [];
  }

  const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
  let groups: unknown;
  if (Array.isArray(parsed)) {
    groups = parsed;
  } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as Partial<DocumentGroupStorage>).groups)) {
    groups = (parsed as Partial<DocumentGroupStorage>).groups;
  } else {
    throw new Error('[DocumentGroups] Invalid data format');
  }

  if (strict) {
    assertValidDocumentGroups(groups);
  }
  return normalizeDocumentGroups(groups);
}

async function readDocumentGroupsFromStorage(strict: boolean): Promise<DocumentGroup[]> {
  const plugin = requireDocumentGroupPlugin();
  const raw = await plugin.loadData(DOCUMENT_GROUPS_STORAGE_KEY);
  return parseDocumentGroups(raw, strict);
}

async function writeDocumentGroups(groups: DocumentGroup[]): Promise<DocumentGroup[]> {
  const plugin = requireDocumentGroupPlugin();
  const normalized = normalizeDocumentGroups(groups);
  const payload: DocumentGroupStorage = {
    version: DOCUMENT_GROUPS_STORAGE_VERSION,
    groups: normalized,
    updatedAt: new Date().toISOString()
  };
  await plugin.saveData(DOCUMENT_GROUPS_STORAGE_KEY, payload);
  return normalized;
}

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

function normalizeExcludedDocumentKeys(input: unknown): string[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const keys = Array.from(new Set(input
    .filter((key): key is string => typeof key === 'string')
    .map(key => key.trim())
    .filter(key => /^[^:\s]+:[^:\s]+$/.test(key))));
  return keys.length > 0 ? keys : undefined;
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
    const excludedDocumentKeys = normalizeExcludedDocumentKeys(group.excludedDocumentKeys);
    const emoji = typeof group.emoji === 'string' && group.emoji.trim().length > 0
      ? group.emoji.trim()
      : '📁';
    const order = typeof group.order === 'number' && Number.isFinite(group.order)
      ? group.order
      : undefined;
    const createdAt = typeof group.createdAt === 'string' ? group.createdAt : undefined;
    const updatedAt = typeof group.updatedAt === 'string' ? group.updatedAt : undefined;

    normalized.push({
      id,
      name,
      emoji,
      members,
      excludedDocumentKeys,
      order,
      createdAt,
      updatedAt
    });
  }

  return normalized;
}

export async function loadDocumentGroups(): Promise<DocumentGroup[]> {
  try {
    const groups = await readDocumentGroupsFromStorage(false);
    documentGroupsCache = cloneDocumentGroups(groups);
    documentGroupsReadFailure = null;
    return cloneDocumentGroups(groups);
  } catch (error) {
    const normalizedError = markDocumentGroupReadFailure(error);
    console.error('[DocumentGroups] loadDocumentGroups: failed to read data', error);
    if (documentGroupsCache) {
      return cloneDocumentGroups(documentGroupsCache);
    }
    throw normalizedError;
  }
}

export async function loadDocumentGroupsStrict(): Promise<DocumentGroup[]> {
  try {
    const groups = await readDocumentGroupsFromStorage(true);
    documentGroupsCache = cloneDocumentGroups(groups);
    documentGroupsReadFailure = null;
    return cloneDocumentGroups(groups);
  } catch (error) {
    markDocumentGroupReadFailure(error);
    console.error('[DocumentGroups] loadDocumentGroupsStrict: failed to read data', error);
    throw error;
  }
}

export async function saveDocumentGroups(groups: DocumentGroup[]): Promise<void> {
  await enqueueDocumentGroupMutation(async () => {
    assertDocumentGroupsHealthy();
    try {
      await readDocumentGroupsFromStorage(true);
      const normalized = await writeDocumentGroups(groups);
      documentGroupsCache = cloneDocumentGroups(normalized);
      documentGroupsReadFailure = null;
    } catch (error) {
      markDocumentGroupReadFailure(error);
      console.error('[DocumentGroups] saveDocumentGroups: failed to persist data', error);
      throw error;
    }
  });
}

export async function setDocumentGroupMembership(
  member: DocumentGroupMember,
  groupIds: readonly string[]
): Promise<DocumentGroup[]> {
  return enqueueDocumentGroupMutation(async () => {
    assertDocumentGroupsHealthy();
    try {
      const groups = await readDocumentGroupsFromStorage(true);
      const normalizedMembers = normalizeDocumentGroupMembers([member]);
      const normalizedMember = normalizedMembers[0];
      if (!normalizedMember) {
        throw new Error('[DocumentGroups] Invalid member');
      }
      const targetGroupIds = new Set(
        groupIds.map(id => typeof id === 'string' ? id.trim() : '').filter(Boolean)
      );
      const nextGroups = groups.map(group => {
        const members = group.members.filter(existing => !(
          existing.documentId === normalizedMember.documentId
          && existing.notebookId === normalizedMember.notebookId
        ));
        return {
          ...group,
          members: targetGroupIds.has(group.id) ? [...members, normalizedMember] : members
        };
      });
      const normalized = await writeDocumentGroups(nextGroups);
      documentGroupsCache = cloneDocumentGroups(normalized);
      documentGroupsReadFailure = null;
      return cloneDocumentGroups(normalized);
    } catch (error) {
      markDocumentGroupReadFailure(error);
      console.error('[DocumentGroups] setDocumentGroupMembership: failed to persist data', error);
      throw error;
    }
  });
}
