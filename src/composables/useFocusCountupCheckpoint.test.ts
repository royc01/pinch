import { describe, expect, it, vi } from 'vitest';
import { useFocusCountupCheckpoint } from '@/composables/useFocusCountupCheckpoint';

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('useFocusCountupCheckpoint', () => {
  it('persists only newly elapsed minutes and reports the checkpoint delta', async () => {
    let elapsedSeconds = 12 * 60;
    const upsertSession = vi.fn().mockResolvedValue(undefined);
    const onSaved = vi.fn();
    const checkpoint = useFocusCountupCheckpoint({
      isEnabled: () => true,
      getElapsedSeconds: () => elapsedSeconds,
      createSessionId: () => 'session-1',
      getTarget: () => ({ id: 'task-1' }),
      upsertSession,
      onSaved
    });

    await checkpoint.save();
    await checkpoint.save();
    elapsedSeconds = 18 * 60;
    await checkpoint.save(true);

    expect(upsertSession).toHaveBeenNthCalledWith(1, 'session-1', 12, { id: 'task-1' });
    expect(upsertSession).toHaveBeenNthCalledWith(2, 'session-1', 18, { id: 'task-1' });
    expect(onSaved).toHaveBeenNthCalledWith(1, {
      minutes: 12,
      sessionId: 'session-1',
      checkpoint: true
    });
    expect(onSaved).toHaveBeenNthCalledWith(2, {
      minutes: 6,
      sessionId: 'session-1',
      checkpoint: false
    });
    expect(checkpoint.savedMinutes.value).toBe(18);
  });

  it('defers concurrent saves and writes the latest elapsed value after the first save', async () => {
    let elapsedSeconds = 2 * 60;
    let finishFirstSave: (() => void) | undefined;
    const firstSave = new Promise<void>((resolve) => {
      finishFirstSave = resolve;
    });
    const upsertSession = vi.fn()
      .mockImplementationOnce(() => firstSave)
      .mockResolvedValueOnce(undefined);
    const checkpoint = useFocusCountupCheckpoint({
      isEnabled: () => true,
      getElapsedSeconds: () => elapsedSeconds,
      createSessionId: () => 'session-2',
      getTarget: () => null,
      upsertSession
    });

    const pendingSave = checkpoint.save();
    elapsedSeconds = 5 * 60;
    const queuedSave = checkpoint.save();
    finishFirstSave?.();
    await Promise.all([pendingSave, queuedSave]);
    await flushMicrotasks();

    expect(upsertSession).toHaveBeenNthCalledWith(1, 'session-2', 2, null);
    expect(upsertSession).toHaveBeenNthCalledWith(2, 'session-2', 5, null);
    expect(checkpoint.savedMinutes.value).toBe(5);
  });

  it('preserves final state and the final minute override while a checkpoint is saving', async () => {
    let finishFirstSave: (() => void) | undefined;
    const firstSave = new Promise<void>((resolve) => {
      finishFirstSave = resolve;
    });
    const upsertSession = vi.fn()
      .mockImplementationOnce(() => firstSave)
      .mockResolvedValueOnce(undefined);
    const onSaved = vi.fn();
    const checkpoint = useFocusCountupCheckpoint({
      isEnabled: () => true,
      getElapsedSeconds: () => 2 * 60,
      createSessionId: () => 'session-final',
      getTarget: () => null,
      upsertSession,
      onSaved
    });

    const checkpointSave = checkpoint.save(false, 2);
    const finalSave = checkpoint.save(true, 7);
    finishFirstSave?.();
    await Promise.all([checkpointSave, finalSave]);

    expect(upsertSession).toHaveBeenNthCalledWith(2, 'session-final', 7, null);
    expect(onSaved).toHaveBeenLastCalledWith({
      minutes: 5,
      sessionId: 'session-final',
      checkpoint: false
    });
    expect(checkpoint.savedMinutes.value).toBe(7);
  });

  it('does not persist while count-up mode is inactive and restores handoff state', async () => {
    const upsertSession = vi.fn().mockResolvedValue(undefined);
    const checkpoint = useFocusCountupCheckpoint({
      isEnabled: () => false,
      getElapsedSeconds: () => 8 * 60,
      createSessionId: () => 'unused',
      getTarget: () => null,
      upsertSession
    });

    await checkpoint.save();
    checkpoint.restore({ sessionId: 'handoff-session', savedMinutes: 7 });

    expect(upsertSession).not.toHaveBeenCalled();
    expect(checkpoint.sessionId.value).toBe('handoff-session');
    expect(checkpoint.savedMinutes.value).toBe(7);
    checkpoint.reset();
    expect(checkpoint.sessionId.value).toBe('');
    expect(checkpoint.savedMinutes.value).toBe(0);
  });
});
