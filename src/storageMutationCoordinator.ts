const localMutationQueues = new Map<string, Promise<void>>();
const LOCK_PREFIX = 'pinch-storage:';

async function runWithWebLock<T>(storageKey: string, operation: () => Promise<T>): Promise<T> {
  if (typeof navigator === 'undefined' || !navigator.locks?.request) {
    return operation();
  }
  return await navigator.locks.request(`${LOCK_PREFIX}${storageKey}`, operation);
}

export function enqueueStorageMutation<T>(
  storageKey: string,
  operation: () => Promise<T>
): Promise<T> {
  const previous = localMutationQueues.get(storageKey) || Promise.resolve();
  const result = previous
    .catch(() => undefined)
    .then(() => runWithWebLock(storageKey, operation));
  const tail = result.then(() => undefined, () => undefined);
  localMutationQueues.set(storageKey, tail);
  void tail.then(() => {
    if (localMutationQueues.get(storageKey) === tail) {
      localMutationQueues.delete(storageKey);
    }
  });
  return result;
}

export function enqueueStorageMutations<T>(
  storageKeys: readonly string[],
  operation: () => Promise<T>
): Promise<T> {
  const keys = Array.from(new Set(storageKeys)).sort();
  const acquire = (index: number): Promise<T> => (
    index >= keys.length
      ? operation()
      : enqueueStorageMutation(keys[index], () => acquire(index + 1))
  );
  return acquire(0);
}
