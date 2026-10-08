import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const localKey = 'pinch:calendar-sync-config-v1';
const pluginKey = 'calendar-sync-config';
const config = {
  enabled: true, provider: 'caldav', calendarUrl: 'https://calendar.example.test/work/',
  username: 'synthetic-user', password: 'synthetic-password',
  syncInterval: 'dailyAt', dailySyncTime: '09:30',
  cloud: { enabled: true, method: 'webdav', webdavUrl: 'https://dav.example.test/',
    webdavUsername: 'cloud-user', webdavPassword: 'synthetic-cloud-secret' }
};

describe('calendar settings persistence across reloads', () => {
  let settings: typeof import('./calendarSyncSettings');
  let local: Map<string, string>;
  let stored: unknown;
  let storage: { loadData: ReturnType<typeof vi.fn>; saveData: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.resetModules();
    local = new Map();
    stored = null;
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => local.get(key) ?? null,
      setItem: (key: string, value: string) => { local.set(key, value); }
    });
    storage = {
      loadData: vi.fn(async () => stored),
      saveData: vi.fn(async (_key, value) => { stored = value; })
    };
    settings = await import('./calendarSyncSettings');
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it.each(['', '   '])('accepts an absent backup without warning (%j)', async (value) => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    stored = value;
    await expect(settings.initializeCalendarSyncSettings(storage)).resolves.toBe(true);
    expect(warning).not.toHaveBeenCalled();
    expect(storage.saveData).not.toHaveBeenCalled();
  });

  it('cancels an ended instance without warning or copying its local settings back', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    local.set(localKey, JSON.stringify({ config, updatedAt: 20 }));
    storage.loadData.mockRejectedValueOnce({ code: 410, msg: 'Plugin lifecycle has ended', data: null });
    await expect(settings.initializeCalendarSyncSettings(storage)).resolves.toBe(false);
    expect(warning).not.toHaveBeenCalled();
    expect(settings.loadCalendarSyncConfig()).toMatchObject(config);
    expect(storage.saveData).not.toHaveBeenCalled();
  });

  it('does not hydrate an old backup after unload while loading', async () => {
    let resolveLoad!: (value: unknown) => void;
    storage.loadData.mockReturnValueOnce(new Promise(resolve => { resolveLoad = resolve; }));
    const loading = settings.initializeCalendarSyncSettings(storage);
    settings.disposeCalendarSyncSettings(storage);
    resolveLoad({ config, updatedAt: 20 });
    await expect(loading).resolves.toBe(false);
    expect(local.has(localKey)).toBe(false);
    expect(storage.saveData).not.toHaveBeenCalled();
  });

  it('does not let an old load or unload interfere with the replacement instance', async () => {
    let resolveOld!: (value: unknown) => void;
    storage.loadData.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }));
    const oldLoad = settings.initializeCalendarSyncSettings(storage);
    const replacement = {
      loadData: vi.fn(async () => ({ config: { ...config, username: 'replacement' }, updatedAt: 30 })),
      saveData: vi.fn(async () => undefined)
    };
    await settings.initializeCalendarSyncSettings(replacement);
    settings.disposeCalendarSyncSettings(storage);
    resolveOld({ config, updatedAt: 40 });
    await expect(oldLoad).resolves.toBe(false);
    expect(settings.loadCalendarSyncConfig().username).toBe('replacement');
    settings.saveCalendarSyncConfig({ ...settings.loadCalendarSyncConfig(), username: 'latest' });
    await settings.flushCalendarSyncSettings();
    expect(replacement.saveData).toHaveBeenCalledWith(pluginKey, expect.objectContaining({ config: expect.objectContaining({ username: 'latest' }) }));
    expect(storage.saveData).not.toHaveBeenCalled();
  });

  it('skips queued backups after the instance is disposed', async () => {
    await settings.initializeCalendarSyncSettings(storage);
    settings.saveCalendarSyncConfig(settings.normalizeCalendarSyncConfig(config));
    settings.disposeCalendarSyncSettings(storage);
    await settings.flushCalendarSyncSettings();
    expect(storage.saveData).not.toHaveBeenCalled();
    expect(settings.loadCalendarSyncConfig()).toMatchObject(config);
  });

  it('continues with the local snapshot and warns for a real backup read failure', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    local.set(localKey, JSON.stringify({ config, updatedAt: 20 }));
    storage.loadData.mockRejectedValueOnce(new Error('Read unavailable'));
    await expect(settings.initializeCalendarSyncSettings(storage)).resolves.toBe(true);
    expect(warning).toHaveBeenCalledWith('[CalendarSync] Could not read settings backup; using the local snapshot');
    expect(settings.loadCalendarSyncConfig()).toMatchObject(config);
    expect(storage.saveData).toHaveBeenCalled();
  });

  it('migrates existing local settings and restores every channel after the cache is lost', async () => {
    local.set(localKey, JSON.stringify(config));
    await settings.initializeCalendarSyncSettings(storage);
    expect(storage.saveData).toHaveBeenCalledWith(pluginKey, expect.any(Object));
    expect(stored).toMatchObject({ config });
    local.clear();
    vi.resetModules();
    settings = await import('./calendarSyncSettings');
    await settings.initializeCalendarSyncSettings(storage);
    expect(storage.loadData).toHaveBeenCalledWith(pluginKey);
    expect(settings.loadCalendarSyncConfig()).toMatchObject(config);
    expect(storage.saveData).toHaveBeenCalledTimes(1);
  });

  it('uses a newer plugin backup rather than an older browser snapshot', async () => {
    local.set(localKey, JSON.stringify({ config: { ...config, username: 'old-user' }, updatedAt: 10 }));
    stored = JSON.stringify({ config, updatedAt: 20 });
    await settings.initializeCalendarSyncSettings(storage);
    expect(settings.loadCalendarSyncConfig()).toMatchObject(config);
    expect(storage.saveData).not.toHaveBeenCalled();
  });

  it('recovers an edit whose asynchronous backup was interrupted by reload', async () => {
    stored = { config: { ...config, username: 'old-user' }, updatedAt: 10 };
    local.set(localKey, JSON.stringify({ config, updatedAt: 20 }));
    await settings.initializeCalendarSyncSettings(storage);
    expect(settings.loadCalendarSyncConfig()).toMatchObject(config);
    expect(stored).toMatchObject({ config, updatedAt: 20 });
  });

  it('does not erase edits made while the backup is loading', async () => {
    let resolveLoad!: (value: unknown) => void;
    storage.loadData.mockReturnValue(new Promise(resolve => { resolveLoad = resolve; }));
    const loading = settings.initializeCalendarSyncSettings(storage);
    settings.saveCalendarSyncConfig(settings.normalizeCalendarSyncConfig(config));
    resolveLoad({ config: { ...config, username: 'old-user' }, updatedAt: Date.now() + 1000 });
    await loading;
    expect(settings.loadCalendarSyncConfig().username).toBe('synthetic-user');
    expect(stored).toMatchObject({ config: { username: 'synthetic-user' } });
  });

  it('serializes immutable backups so an older write cannot overwrite a newer edit', async () => {
    await settings.initializeCalendarSyncSettings(storage);
    let finishFirst!: () => void;
    storage.saveData.mockImplementationOnce((_key, value) => new Promise<void>(resolve => {
      finishFirst = () => { stored = value; resolve(); };
    }));
    const draft = settings.normalizeCalendarSyncConfig(config);
    settings.saveCalendarSyncConfig(draft);
    await Promise.resolve();
    draft.username = 'new-user';
    settings.saveCalendarSyncConfig(draft);
    expect(storage.saveData).toHaveBeenCalledTimes(1);
    expect(storage.saveData.mock.calls[0][1].config.username).toBe('synthetic-user');
    expect(settings.loadCalendarSyncConfig().username).toBe('new-user');
    finishFirst();
    await settings.flushCalendarSyncSettings();
    expect(stored).toMatchObject({ config: { username: 'new-user' } });
  });

  it('saves to plugin storage even when localStorage is unavailable', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await settings.initializeCalendarSyncSettings(storage);
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('cache unavailable'); },
      setItem: () => { throw new Error('cache unavailable'); }
    });
    settings.saveCalendarSyncConfig(settings.normalizeCalendarSyncConfig(config));
    await settings.flushCalendarSyncSettings();
    expect(settings.loadCalendarSyncConfig()).toMatchObject(config);
    expect(stored).toMatchObject({ config });
  });

  it('keeps the local settings after a backup failure and allows subsequent saves', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await settings.initializeCalendarSyncSettings(storage);
    storage.saveData.mockRejectedValueOnce(new Error('backup unavailable'));
    settings.saveCalendarSyncConfig(settings.normalizeCalendarSyncConfig(config));
    await settings.flushCalendarSyncSettings();
    expect(settings.loadCalendarSyncConfig()).toMatchObject(config);
    settings.saveCalendarSyncConfig({ ...settings.loadCalendarSyncConfig(), username: 'new-user' });
    await settings.flushCalendarSyncSettings();
    expect(stored).toMatchObject({ config: { username: 'new-user' } });
  });
});
