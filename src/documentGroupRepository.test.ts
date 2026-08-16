import { beforeEach, describe, expect, it, vi } from 'vitest';

const plugin = vi.hoisted(() => ({
  loadData: vi.fn(),
  saveData: vi.fn()
}));

vi.mock('@/main', () => ({
  usePlugin: () => plugin
}));

function storedGroups() {
  return {
    version: 1,
    groups: [{
      id: 'group-1',
      name: 'Projects',
      members: [{ documentId: 'doc-1', notebookId: 'notebook-1' }]
    }],
    updatedAt: '2026-08-10T00:00:00.000Z'
  };
}

describe('document group persistence safety', () => {
  beforeEach(() => {
    vi.resetModules();
    plugin.loadData.mockReset().mockResolvedValue(null);
    plugin.saveData.mockReset().mockResolvedValue(undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('rejects a first read failure instead of presenting missing storage', async () => {
    plugin.loadData.mockRejectedValue(new Error('read failed'));
    const { loadDocumentGroups } = await import('./documentGroupRepository');

    await expect(loadDocumentGroups()).rejects.toThrow('read failed');
  });

  it('returns the last good snapshot but blocks mutation after a read failure', async () => {
    const repository = await import('./documentGroupRepository');
    plugin.loadData.mockResolvedValueOnce(storedGroups());
    await expect(repository.loadDocumentGroups()).resolves.toHaveLength(1);

    plugin.loadData.mockRejectedValueOnce(new Error('temporarily unavailable'));
    await expect(repository.loadDocumentGroups()).resolves.toEqual([
      expect.objectContaining({ id: 'group-1', name: 'Projects' })
    ]);

    plugin.loadData.mockResolvedValue(storedGroups());
    await expect(repository.saveDocumentGroups([])).rejects.toThrow('until a successful reload');
    expect(plugin.saveData).not.toHaveBeenCalled();
  });

  it('fails closed when persisted nested entries are invalid', async () => {
    plugin.loadData.mockResolvedValue({
      ...storedGroups(),
      groups: [{
        id: 'group-1',
        name: 'Projects',
        members: [{ documentId: 'doc-1' }]
      }]
    });
    const { saveDocumentGroups } = await import('./documentGroupRepository');

    await expect(saveDocumentGroups([])).rejects.toThrow('Invalid member');
    expect(plugin.saveData).not.toHaveBeenCalled();
  });

  it('propagates write failures', async () => {
    plugin.loadData.mockResolvedValue(storedGroups());
    plugin.saveData.mockRejectedValue(new Error('write failed'));
    const { saveDocumentGroups } = await import('./documentGroupRepository');

    await expect(saveDocumentGroups(storedGroups().groups)).rejects.toThrow('write failed');
  });

  it('preserves unrelated memberships across concurrent document updates', async () => {
    let stored = storedGroups();
    plugin.loadData.mockImplementation(async () => JSON.parse(JSON.stringify(stored)));
    plugin.saveData.mockImplementation(async (_key: string, value: ReturnType<typeof storedGroups>) => {
      stored = JSON.parse(JSON.stringify(value));
    });
    const { setDocumentGroupMembership } = await import('./documentGroupRepository');

    await Promise.all([
      setDocumentGroupMembership({ documentId: 'doc-2', notebookId: 'notebook-1' }, ['group-1']),
      setDocumentGroupMembership({ documentId: 'doc-3', notebookId: 'notebook-1' }, ['group-1'])
    ]);

    expect(stored.groups[0].members.map(member => member.documentId))
      .toEqual(['doc-1', 'doc-2', 'doc-3']);
  });
});
