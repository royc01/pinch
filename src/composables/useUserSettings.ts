import { reactive } from 'vue';
import { userSettings as userSettingsManager, UserSettings, DEFAULT_SETTINGS } from '@/utils/userSettings';

const state = reactive<UserSettings>({
  focus: { ...DEFAULT_SETTINGS.focus },
  kanban: { ...DEFAULT_SETTINGS.kanban },
  taskManager: { ...DEFAULT_SETTINGS.taskManager },
  sidebar: { ...DEFAULT_SETTINGS.sidebar }
});

let isLoading = false;
let isInitialized = false;
let loadingPromise: Promise<void> | null = null;

export function useUserSettings() {
  async function loadSettings() {
    if (isInitialized) return;
    const localSnapshot = userSettingsManager.loadLocalSnapshot();
    if (localSnapshot) {
      Object.assign(state.focus, localSnapshot.focus);
      Object.assign(state.kanban, localSnapshot.kanban);
      Object.assign(state.taskManager, localSnapshot.taskManager);
      Object.assign(state.sidebar, localSnapshot.sidebar);
      isInitialized = true;
      void userSettingsManager.load({ refresh: true }).then((loaded) => {
        Object.assign(state.focus, loaded.focus);
        Object.assign(state.kanban, loaded.kanban);
        Object.assign(state.taskManager, loaded.taskManager);
        Object.assign(state.sidebar, loaded.sidebar);
      }).catch((error) => {
        console.error('[useUserSettings] Background settings refresh failed:', error);
      });
      return;
    }
    // The dock and a task view can mount together. Every caller must wait for
    // the same load, rather than proceeding with DEFAULT_SETTINGS while the
    // first caller is still reading persisted preferences.
    if (!loadingPromise) {
      isLoading = true;
      loadingPromise = (async () => {
        try {
          const loaded = await userSettingsManager.load();
          Object.assign(state.focus, loaded.focus);
          Object.assign(state.kanban, loaded.kanban);
          Object.assign(state.taskManager, loaded.taskManager);
          Object.assign(state.sidebar, loaded.sidebar);
          isInitialized = true;
        } catch (error) {
      console.error('[useUserSettings] 加载设置失败:', error);
        } finally {
          isLoading = false;
        }
      })();
    }

    try {
      await loadingPromise;
    } finally {
      if (!isLoading) {
        loadingPromise = null;
      }
    }
  }
  
  async function updateSettings<K extends keyof UserSettings>(
    section: K,
    updates: Partial<UserSettings[K]>
  ): Promise<void> {
    Object.assign(state[section], updates);
    await userSettingsManager.update(section, updates);
  }
  
  async function saveAllSettings(settings: Partial<UserSettings>): Promise<void> {
    if (settings.focus) Object.assign(state.focus, settings.focus);
    if (settings.kanban) Object.assign(state.kanban, settings.kanban);
    if (settings.taskManager) Object.assign(state.taskManager, settings.taskManager);
    if (settings.sidebar) Object.assign(state.sidebar, settings.sidebar);
    await userSettingsManager.save(settings);
  }
  
  return {
    data: state,
    loadSettings,
    updateSettings,
    saveAllSettings,
    isLoading
  };
}

export { useUserSettings as default };
