import { usePlugin } from '@/main';
import { enqueueStorageMutation } from '@/storageMutationCoordinator';

export const CHECKIN_NOTE_SYNC_STORAGE_KEY = 'Pinch-checkin-note-sync-targets.json';

export type CheckinNoteSyncFormat = 'blockquote-v1' | 'superblock-row-v1';

export interface CheckinNoteSyncTarget {
  documentId: string;
  blockId: string;
  /** The block representation used for the synchronized snapshot. */
  format?: CheckinNoteSyncFormat;
  updatedAt: string;
}

type CheckinNoteSyncTargets = Record<string, CheckinNoteSyncTarget>;

function normalizeTarget(value: unknown): CheckinNoteSyncTarget | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  const documentId = typeof input.documentId === 'string' ? input.documentId.trim() : '';
  const blockId = typeof input.blockId === 'string' ? input.blockId.trim() : '';
  if (!documentId || !blockId) return null;
  return {
    documentId,
    blockId,
    ...(input.format === 'blockquote-v1' || input.format === 'superblock-row-v1'
      ? { format: input.format }
      : {}),
    updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : ''
  };
}

function normalizeTargets(value: unknown): CheckinNoteSyncTargets {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.entries(value as Record<string, unknown>).reduce<CheckinNoteSyncTargets>((targets, [key, target]) => {
    const normalized = normalizeTarget(target);
    if (normalized) targets[key] = normalized;
    return targets;
  }, {});
}

function requirePlugin(): NonNullable<ReturnType<typeof usePlugin>> {
  const plugin = usePlugin();
  if (!plugin) throw new Error('Plugin is not initialized');
  return plugin;
}

export async function getCheckinNoteSyncTarget(scope: string): Promise<CheckinNoteSyncTarget | null> {
  const key = scope.trim();
  if (!key) return null;
  const targets = normalizeTargets(await requirePlugin().loadData(CHECKIN_NOTE_SYNC_STORAGE_KEY));
  return targets[key] || null;
}

export async function saveCheckinNoteSyncTarget(scope: string, target: CheckinNoteSyncTarget): Promise<void> {
  const key = scope.trim();
  const normalized = normalizeTarget(target);
  if (!key || !normalized) throw new Error('A valid check-in note sync target is required');
  await enqueueStorageMutation(CHECKIN_NOTE_SYNC_STORAGE_KEY, async () => {
    const plugin = requirePlugin();
    const targets = normalizeTargets(await plugin.loadData(CHECKIN_NOTE_SYNC_STORAGE_KEY));
    targets[key] = normalized;
    await plugin.saveData(CHECKIN_NOTE_SYNC_STORAGE_KEY, targets);
  });
}
