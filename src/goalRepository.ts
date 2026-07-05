import { loadDocumentGroups, type DocumentGroup, type DocumentGroupMember } from './documentGroupRepository';
import { usePlugin } from './main';
import { eventBus, Events } from './utils/eventBus';

export interface GoalTaskMember {
  taskId: string;
  blockId?: string;
  repeatSeriesId?: string;
  notebookId?: string;
  rootId?: string;
  title?: string;
  addedAt?: string;
}

export interface Goal {
  id: string;
  name: string;
  emoji?: string;
  members: DocumentGroupMember[];
  taskMembers?: GoalTaskMember[];
  excludedTaskMembers?: GoalTaskMember[];
  order?: number;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface GoalStorage {
  version: number;
  goals: Goal[];
  updatedAt: string;
}

const GOALS_STORAGE_KEY = 'Pinch-goals.json';
const GOALS_STORAGE_VERSION = 3;

function cloneGoalMembers(members: DocumentGroupMember[]): DocumentGroupMember[] {
  return members.map(member => ({ ...member }));
}

function cloneGoalTaskMembers(members: GoalTaskMember[] | undefined): GoalTaskMember[] {
  return normalizeGoalTaskMembers(members);
}

function normalizeGoalMembers(input: unknown): DocumentGroupMember[] {
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

function normalizeGoalTaskMembers(input: unknown): GoalTaskMember[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const normalized: GoalTaskMember[] = [];
  const seen = new Set<string>();

  for (const raw of input) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }

    const member = raw as Record<string, unknown>;
    const taskId = typeof member.taskId === 'string' ? member.taskId.trim() : '';
    if (!taskId || seen.has(taskId)) {
      continue;
    }
    seen.add(taskId);

    const blockId = typeof member.blockId === 'string' && member.blockId.trim().length > 0
      ? member.blockId.trim()
      : undefined;
    const repeatSeriesId = typeof member.repeatSeriesId === 'string' && member.repeatSeriesId.trim().length > 0
      ? member.repeatSeriesId.trim()
      : undefined;
    const notebookId = typeof member.notebookId === 'string' && member.notebookId.trim().length > 0
      ? member.notebookId.trim()
      : undefined;
    const rootId = typeof member.rootId === 'string' && member.rootId.trim().length > 0
      ? member.rootId.trim()
      : undefined;
    const title = typeof member.title === 'string' && member.title.trim().length > 0
      ? member.title.trim()
      : undefined;
    const addedAt = typeof member.addedAt === 'string' && member.addedAt.trim().length > 0
      ? member.addedAt.trim()
      : undefined;

    normalized.push({
      taskId,
      blockId,
      repeatSeriesId,
      notebookId,
      rootId,
      title,
      addedAt
    });
  }

  return normalized;
}

function resolveLegacyGoalMembers(
  raw: Record<string, unknown>,
  legacyGroupsById: Map<string, DocumentGroup>
): DocumentGroupMember[] {
  const documentGroupId = typeof raw.documentGroupId === 'string' ? raw.documentGroupId.trim() : '';
  if (!documentGroupId) {
    return [];
  }

  const legacyGroup = legacyGroupsById.get(documentGroupId);
  if (!legacyGroup || !Array.isArray(legacyGroup.members)) {
    return [];
  }

  return cloneGoalMembers(normalizeGoalMembers(legacyGroup.members));
}

function normalizeGoal(input: unknown, legacyGroupsById: Map<string, DocumentGroup>): Goal | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const raw = input as Record<string, unknown>;
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  const emoji = typeof raw.emoji === 'string' ? raw.emoji.trim() : '';
  if (!id || !name) {
    return null;
  }

  const explicitMembers = normalizeGoalMembers(raw.members);
  const members = explicitMembers.length > 0
    ? explicitMembers
    : resolveLegacyGoalMembers(raw, legacyGroupsById);

  const dueDate = typeof raw.dueDate === 'string' ? raw.dueDate.trim() : '';

  return {
    id,
    name,
    emoji: emoji || undefined,
    members,
    taskMembers: normalizeGoalTaskMembers(raw.taskMembers),
    excludedTaskMembers: normalizeGoalTaskMembers(raw.excludedTaskMembers),
    order: typeof raw.order === 'number' && Number.isFinite(raw.order) ? raw.order : undefined,
    dueDate: dueDate || undefined,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : undefined,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined
  };
}

function compareGoals(left: Goal, right: Goal): number {
  const leftOrder = typeof left.order === 'number' ? left.order : Number.MAX_SAFE_INTEGER;
  const rightOrder = typeof right.order === 'number' ? right.order : Number.MAX_SAFE_INTEGER;
  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  const leftCreatedAt = left.createdAt || '';
  const rightCreatedAt = right.createdAt || '';
  if (leftCreatedAt && rightCreatedAt && leftCreatedAt !== rightCreatedAt) {
    return leftCreatedAt.localeCompare(rightCreatedAt);
  }

  return left.id.localeCompare(right.id);
}

function hasLegacyGoalShape(input: unknown): boolean {
  if (!input || typeof input !== 'object') {
    return false;
  }

  const raw = input as Record<string, unknown>;
  const documentGroupId = typeof raw.documentGroupId === 'string' ? raw.documentGroupId.trim() : '';
  return documentGroupId.length > 0;
}

async function persistGoals(goals: Goal[], emitEvent: boolean): Promise<Goal[]> {
  const plugin = usePlugin();
  if (!plugin) {
    console.error('[Goals] persistGoals: plugin not ready');
    return normalizeGoals(goals);
  }

  const nowIso = new Date().toISOString();
  const normalizedGoals = normalizeGoals(goals).map((goal, index) => ({
    ...goal,
    members: cloneGoalMembers(goal.members),
    taskMembers: cloneGoalTaskMembers(goal.taskMembers),
    excludedTaskMembers: cloneGoalTaskMembers(goal.excludedTaskMembers),
    order: index,
    createdAt: goal.createdAt || nowIso,
    updatedAt: nowIso
  }));

  const payload: GoalStorage = {
    version: GOALS_STORAGE_VERSION,
    goals: normalizedGoals,
    updatedAt: nowIso
  };

  try {
    await plugin.saveData(GOALS_STORAGE_KEY, payload);
    if (emitEvent) {
      eventBus.emit(Events.GOALS_UPDATED, {
        goals: normalizedGoals
      });
    }
  } catch (error) {
    console.error('[Goals] persistGoals: save failed', error);
  }

  return normalizedGoals;
}

export function normalizeGoals(input: unknown, legacyGroups: DocumentGroup[] = []): Goal[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const legacyGroupsById = new Map(legacyGroups.map(group => [group.id, group]));

  return input
    .map(goal => normalizeGoal(goal, legacyGroupsById))
    .filter((goal): goal is Goal => goal !== null)
    .sort(compareGoals)
    .map((goal, index) => ({
      ...goal,
      members: cloneGoalMembers(goal.members),
      taskMembers: cloneGoalTaskMembers(goal.taskMembers),
      order: index
    }));
}

export async function loadGoals(): Promise<Goal[]> {
  const plugin = usePlugin();
  if (!plugin) {
    console.error('[Goals] loadGoals: plugin not ready');
    return [];
  }

  try {
    const raw = await plugin.loadData(GOALS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const parsedGoals = Array.isArray(parsed)
      ? parsed
      : (Array.isArray((parsed as Partial<GoalStorage> | null)?.goals)
        ? (parsed as Partial<GoalStorage>).goals!
        : []);
    const storageVersion = !Array.isArray(parsed) && typeof (parsed as Partial<GoalStorage> | null)?.version === 'number'
      ? (parsed as Partial<GoalStorage>).version!
      : 0;
    const needsLegacyGroups = parsedGoals.some(hasLegacyGoalShape);
    const legacyGroups = needsLegacyGroups
      ? await loadDocumentGroups()
      : [];
    const normalizedGoals = normalizeGoals(parsedGoals, legacyGroups);

    if (storageVersion !== GOALS_STORAGE_VERSION || needsLegacyGroups) {
      await persistGoals(normalizedGoals, false);
    }

    return normalizedGoals;
  } catch (error) {
    console.error('[Goals] loadGoals: read failed', error);
  }

  return [];
}

export async function saveGoals(goals: Goal[]): Promise<void> {
  await persistGoals(goals, true);
}
