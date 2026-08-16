import {
  loadDocumentGroups,
  loadDocumentGroupsStrict,
  type DocumentGroup,
  type DocumentGroupMember
} from './documentGroupRepository';
import { usePlugin } from './main';
import { eventBus, Events } from './utils/eventBus';
import { setTaskGoalMembership, type GoalTaskSource } from './utils/goalTaskMembership';
import { enqueueStorageMutation } from './storageMutationCoordinator';
import { isMissingPluginStorageValue } from './utils/pluginStorage';

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
  excludedDocumentKeys?: string[];
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

let goalsCache: Goal[] | null = null;
let goalsReadFailure: Error | null = null;

function cloneGoal(goal: Goal): Goal {
  return {
    ...goal,
    members: goal.members.map(member => ({ ...member })),
    excludedDocumentKeys: goal.excludedDocumentKeys ? [...goal.excludedDocumentKeys] : undefined,
    taskMembers: goal.taskMembers ? goal.taskMembers.map(member => ({ ...member })) : undefined,
    excludedTaskMembers: goal.excludedTaskMembers
      ? goal.excludedTaskMembers.map(member => ({ ...member }))
      : undefined
  };
}

function cloneGoals(goals: Goal[]): Goal[] {
  return goals.map(cloneGoal);
}

function requireGoalPlugin(): NonNullable<ReturnType<typeof usePlugin>> {
  const plugin = usePlugin();
  if (!plugin) {
    throw new Error('[Goals] Plugin is not initialized');
  }
  return plugin;
}

function enqueueGoalMutation<T>(work: () => Promise<T>): Promise<T> {
  return enqueueStorageMutation(GOALS_STORAGE_KEY, work);
}

function markGoalReadFailure(error: unknown): Error {
  const normalized = error instanceof Error ? error : new Error(String(error));
  goalsReadFailure ||= normalized;
  return normalized;
}

function assertGoalsHealthy(): void {
  if (goalsReadFailure) {
    throw new Error(
      `Cannot mutate ${GOALS_STORAGE_KEY} until a successful reload; last read failed: ${goalsReadFailure.message}`
    );
  }
}

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

function normalizeExcludedDocumentKeys(input: unknown): string[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const keys = Array.from(new Set(input
    .filter((key): key is string => typeof key === 'string')
    .map(key => key.trim())
    .filter(key => /^[^:\s]+:[^:\s]+$/.test(key))));
  return keys.length > 0 ? keys : undefined;
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
    excludedDocumentKeys: normalizeExcludedDocumentKeys(raw.excludedDocumentKeys),
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

function assertValidGoalMembers(input: unknown, goalIndex: number): void {
  if (input === undefined) {
    return;
  }
  if (!Array.isArray(input)) {
    throw new Error(`[Goals] Invalid members for goal at index ${goalIndex}`);
  }
  input.forEach((raw, memberIndex) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error(`[Goals] Invalid member at index ${goalIndex}:${memberIndex}`);
    }
    const member = raw as Record<string, unknown>;
    if (
      typeof member.documentId !== 'string'
      || !member.documentId.trim()
      || typeof member.notebookId !== 'string'
      || !member.notebookId.trim()
    ) {
      throw new Error(`[Goals] Invalid member at index ${goalIndex}:${memberIndex}`);
    }
    for (const key of ['name', 'path']) {
      if (member[key] !== undefined && typeof member[key] !== 'string') {
        throw new Error(`[Goals] Invalid member ${key} at index ${goalIndex}:${memberIndex}`);
      }
    }
  });
}

function assertValidGoalTaskMembers(input: unknown, goalIndex: number, field: string): void {
  if (input === undefined) {
    return;
  }
  if (!Array.isArray(input)) {
    throw new Error(`[Goals] Invalid ${field} for goal at index ${goalIndex}`);
  }
  input.forEach((raw, memberIndex) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error(`[Goals] Invalid ${field} member at index ${goalIndex}:${memberIndex}`);
    }
    const member = raw as Record<string, unknown>;
    if (typeof member.taskId !== 'string' || !member.taskId.trim()) {
      throw new Error(`[Goals] Invalid ${field} member at index ${goalIndex}:${memberIndex}`);
    }
    for (const key of ['blockId', 'repeatSeriesId', 'notebookId', 'rootId', 'title', 'addedAt']) {
      if (member[key] !== undefined && typeof member[key] !== 'string') {
        throw new Error(`[Goals] Invalid ${field}.${key} at index ${goalIndex}:${memberIndex}`);
      }
    }
  });
}

function assertValidGoals(input: unknown): asserts input is unknown[] {
  if (!Array.isArray(input)) {
    throw new Error('[Goals] Invalid data format, expected goals array');
  }
  input.forEach((raw, goalIndex) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error(`[Goals] Invalid goal at index ${goalIndex}`);
    }
    const goal = raw as Record<string, unknown>;
    if (
      typeof goal.id !== 'string'
      || !goal.id.trim()
      || typeof goal.name !== 'string'
      || !goal.name.trim()
    ) {
      throw new Error(`[Goals] Invalid goal at index ${goalIndex}`);
    }
    assertValidGoalMembers(goal.members, goalIndex);
    assertValidGoalTaskMembers(goal.taskMembers, goalIndex, 'taskMembers');
    assertValidGoalTaskMembers(goal.excludedTaskMembers, goalIndex, 'excludedTaskMembers');
    if (goal.excludedDocumentKeys !== undefined) {
      if (!Array.isArray(goal.excludedDocumentKeys)) {
        throw new Error(`[Goals] Invalid exclusions for goal at index ${goalIndex}`);
      }
      goal.excludedDocumentKeys.forEach((key, keyIndex) => {
        if (typeof key !== 'string' || !/^[^:\s]+:[^:\s]+$/.test(key.trim())) {
          throw new Error(`[Goals] Invalid exclusion at index ${goalIndex}:${keyIndex}`);
        }
      });
    }
    if (goal.documentGroupId !== undefined && (typeof goal.documentGroupId !== 'string' || !goal.documentGroupId.trim())) {
      throw new Error(`[Goals] Invalid legacy document group for goal at index ${goalIndex}`);
    }
    if (goal.emoji !== undefined && typeof goal.emoji !== 'string') {
      throw new Error(`[Goals] Invalid emoji for goal at index ${goalIndex}`);
    }
    if (goal.order !== undefined && (typeof goal.order !== 'number' || !Number.isFinite(goal.order))) {
      throw new Error(`[Goals] Invalid order for goal at index ${goalIndex}`);
    }
    if (goal.dueDate !== undefined && typeof goal.dueDate !== 'string') {
      throw new Error(`[Goals] Invalid dueDate for goal at index ${goalIndex}`);
    }
    for (const key of ['createdAt', 'updatedAt']) {
      if (goal[key] !== undefined && typeof goal[key] !== 'string') {
        throw new Error(`[Goals] Invalid ${key} for goal at index ${goalIndex}`);
      }
    }
  });
}

interface ParsedGoalStorage {
  goals: unknown[];
  version: number;
  needsLegacyGroups: boolean;
}

function parseGoalStorage(raw: unknown, strict: boolean): ParsedGoalStorage {
  if (isMissingPluginStorageValue(raw)) {
    return { goals: [], version: GOALS_STORAGE_VERSION, needsLegacyGroups: false };
  }

  const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const isLegacyArray = Array.isArray(parsed);
  const storage = !isLegacyArray && parsed && typeof parsed === 'object'
    ? parsed as Partial<GoalStorage>
    : null;
  const goals = isLegacyArray ? parsed : storage?.goals;
  if (!Array.isArray(goals)) {
    throw new Error('[Goals] Invalid data format');
  }
  if (strict) {
    assertValidGoals(goals);
  }
  const version = isLegacyArray
    ? 0
    : (typeof storage?.version === 'number' ? storage.version : 0);
  return {
    goals,
    version,
    needsLegacyGroups: goals.some(hasLegacyGoalShape)
  };
}

async function readGoalStorage(strict: boolean): Promise<ParsedGoalStorage> {
  const plugin = requireGoalPlugin();
  return parseGoalStorage(await plugin.loadData(GOALS_STORAGE_KEY), strict);
}

async function readAndNormalizeGoals(strict: boolean): Promise<{ goals: Goal[]; needsMigration: boolean }> {
  const storage = await readGoalStorage(strict);
  const legacyGroups = storage.needsLegacyGroups
    ? await (strict ? loadDocumentGroupsStrict() : loadDocumentGroups())
    : [];
  const goals = normalizeGoals(storage.goals, legacyGroups);
  return {
    goals,
    needsMigration: storage.version !== GOALS_STORAGE_VERSION || storage.needsLegacyGroups
  };
}

async function persistGoals(goals: Goal[], emitEvent: boolean): Promise<Goal[]> {
  const plugin = requireGoalPlugin();

  const nowIso = new Date().toISOString();
  const normalizedGoals = normalizeGoals(goals).map((goal, index) => ({
    ...goal,
    members: cloneGoalMembers(goal.members),
    excludedDocumentKeys: goal.excludedDocumentKeys ? [...goal.excludedDocumentKeys] : undefined,
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

  await plugin.saveData(GOALS_STORAGE_KEY, payload);
  goalsCache = cloneGoals(normalizedGoals);
  if (emitEvent) {
    eventBus.emit(Events.GOALS_UPDATED, {
      goals: cloneGoals(normalizedGoals)
    });
  }

  return cloneGoals(normalizedGoals);
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
  try {
    let snapshot = await readAndNormalizeGoals(false);
    goalsReadFailure = null;

    if (snapshot.needsMigration) {
      snapshot = await enqueueGoalMutation(async () => {
        assertGoalsHealthy();
        const latest = await readAndNormalizeGoals(true);
        if (latest.needsMigration) {
          const migratedGoals = await persistGoals(latest.goals, false);
          return { goals: migratedGoals, needsMigration: false };
        }
        return latest;
      });
    }

    goalsCache = cloneGoals(snapshot.goals);
    return cloneGoals(snapshot.goals);
  } catch (error) {
    const normalizedError = markGoalReadFailure(error);
    console.error('[Goals] loadGoals: read failed', error);
    if (goalsCache) {
      return cloneGoals(goalsCache);
    }
    throw normalizedError;
  }
}

export async function saveGoals(goals: Goal[]): Promise<void> {
  await enqueueGoalMutation(async () => {
    assertGoalsHealthy();
    try {
      await readGoalStorage(true);
      await persistGoals(goals, true);
      goalsReadFailure = null;
    } catch (error) {
      markGoalReadFailure(error);
      console.error('[Goals] saveGoals: failed to persist data', error);
      throw error;
    }
  });
}

export async function upsertGoal(goal: Goal): Promise<Goal[]> {
  return enqueueGoalMutation(async () => {
    assertGoalsHealthy();
    try {
      const snapshot = await readAndNormalizeGoals(true);
      const normalizedGoal = normalizeGoal(goal, new Map());
      if (!normalizedGoal) {
        throw new Error('[Goals] Invalid goal');
      }
      const index = snapshot.goals.findIndex(item => item.id === normalizedGoal.id);
      normalizedGoal.order = index >= 0 ? snapshot.goals[index].order : snapshot.goals.length;
      const nextGoals = index >= 0
        ? snapshot.goals.map((item, itemIndex) => itemIndex === index ? normalizedGoal : item)
        : [...snapshot.goals, normalizedGoal];
      const persisted = await persistGoals(nextGoals, true);
      goalsReadFailure = null;
      return persisted;
    } catch (error) {
      markGoalReadFailure(error);
      console.error('[Goals] upsertGoal: failed to persist data', error);
      throw error;
    }
  });
}

export async function removeGoal(goalId: string): Promise<Goal[]> {
  return enqueueGoalMutation(async () => {
    assertGoalsHealthy();
    try {
      const snapshot = await readAndNormalizeGoals(true);
      const normalizedId = typeof goalId === 'string' ? goalId.trim() : '';
      if (!normalizedId) {
        throw new Error('[Goals] Invalid goal id');
      }
      const persisted = await persistGoals(
        snapshot.goals.filter(goal => goal.id !== normalizedId),
        true
      );
      goalsReadFailure = null;
      return persisted;
    } catch (error) {
      markGoalReadFailure(error);
      console.error('[Goals] removeGoal: failed to persist data', error);
      throw error;
    }
  });
}

export async function updateGoalTaskMembership(
  task: GoalTaskSource,
  goalIds: readonly string[]
): Promise<Goal[]> {
  return enqueueGoalMutation(async () => {
    assertGoalsHealthy();
    try {
      const snapshot = await readAndNormalizeGoals(true);
      const nextGoals = setTaskGoalMembership(snapshot.goals, task, goalIds);
      const persisted = await persistGoals(nextGoals, true);
      goalsReadFailure = null;
      return persisted;
    } catch (error) {
      markGoalReadFailure(error);
      console.error('[Goals] updateGoalTaskMembership: failed to persist data', error);
      throw error;
    }
  });
}
