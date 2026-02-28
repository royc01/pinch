import { ref, reactive, watch } from 'vue';
import { userSettings as userSettingsManager, UserSettings } from '@/utils/userSettings';

const DEFAULT_SETTINGS: UserSettings = {
  kanban: {
    filterType: 'all',
    filterDocument: 'all',
    filterPriority: 'all',
    kanbanFilterType: 'all',
    kanbanFilterDocument: 'all',
    kanbanFilterPriority: 'all',
    kanbanFilterUpdatedRange: 'all',
    tableFilterUpdatedRange: 'all',
    tableFilterType: 'all',
    tableFilterDocument: 'all',
    monthFilterType: 'all',
    monthFilterDocument: 'all'
  },
  taskManager: {
    filterStatus: 'all',
    filterNotebook: 'all',
    filterDocument: 'all',
    filterPriority: 'all',
    excludedNotebookIds: [],
    showCompletedTasks: true,
    scopeInitialized: false
  },
  sidebar: {
    selectedNotebook: 'all',
    selectedDocument: 'all'
  }
};

const state = reactive<UserSettings>({
  kanban: { ...DEFAULT_SETTINGS.kanban },
  taskManager: { ...DEFAULT_SETTINGS.taskManager },
  sidebar: { ...DEFAULT_SETTINGS.sidebar }
});

let isLoading = false;
let isInitialized = false;

export function useUserSettings() {
  async function loadSettings() {
    if (isInitialized) return;
    if (isLoading) return;
    
    isLoading = true;
    try {
      const loaded = await userSettingsManager.load();
      Object.assign(state.kanban, loaded.kanban);
      Object.assign(state.taskManager, loaded.taskManager);
      Object.assign(state.sidebar, loaded.sidebar);
      isInitialized = true;
    } catch (error) {
      console.error('[useUserSettings] 加载设置失败:', error);
    } finally {
      isLoading = false;
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
