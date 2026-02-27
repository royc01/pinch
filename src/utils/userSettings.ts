import { usePlugin } from '../main';

export interface UserSettings {
  kanban: {
    filterType: string;
    filterDocument: string;
    filterPriority: string;
    kanbanFilterType: string;
    kanbanFilterDocument: string;
    kanbanFilterPriority: string;
    tableFilterType: string;
    tableFilterDocument: string;
    monthFilterType: string;
    monthFilterDocument: string;
  };
  taskManager: {
    filterStatus: string;
    filterNotebook: string;
    filterDocument: string;
    filterPriority: string;
    excludedNotebookIds: string[];
    showCompletedTasks?: boolean;
    scopeInitialized?: boolean;
    lastTaskNotebook?: string;
    lastTaskDocument?: string;
  };
  sidebar: {
    selectedNotebook: string;
    selectedDocument: string;
  };
}

const DEFAULT_SETTINGS: UserSettings = {
  kanban: {
    filterType: 'all',
    filterDocument: 'all',
    filterPriority: 'all',
    kanbanFilterType: 'all',
    kanbanFilterDocument: 'all',
    kanbanFilterPriority: 'all',
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

const STORAGE_KEY = 'Stand-settings';
const LOCAL_STORAGE_KEY = 'siyuan-stand-settings';

function normalizeNotebookIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
        .map(id => id.trim())
    )
  );
}

function mergeWithDefaults(input: unknown): UserSettings {
  const raw = input && typeof input === 'object' ? (input as Partial<UserSettings>) : {};
  const rawKanban = raw.kanban && typeof raw.kanban === 'object' ? raw.kanban : {};
  const rawTaskManager = raw.taskManager && typeof raw.taskManager === 'object' ? raw.taskManager : {};
  const rawSidebar = raw.sidebar && typeof raw.sidebar === 'object' ? raw.sidebar : {};

  return {
    kanban: {
      ...DEFAULT_SETTINGS.kanban,
      ...rawKanban
    },
    taskManager: {
      ...DEFAULT_SETTINGS.taskManager,
      ...rawTaskManager,
      excludedNotebookIds: normalizeNotebookIds((rawTaskManager as { excludedNotebookIds?: unknown }).excludedNotebookIds)
    },
    sidebar: {
      ...DEFAULT_SETTINGS.sidebar,
      ...rawSidebar
    }
  };
}

export class UserSettingsManager {
  private settings: UserSettings | null = null;
  
  async load(): Promise<UserSettings> {
    if (this.settings) {
      return this.settings;
    }
    
    try {
      const plugin = usePlugin();
      
      const data = await plugin.loadData(STORAGE_KEY);
      
      if (data) {
        const settings = typeof data === 'string' ? JSON.parse(data) : data;
        this.settings = mergeWithDefaults(settings);
      } else {
        this.settings = mergeWithDefaults(null);
      }
    } catch (error) {
      console.error('[UserSettings] 加载设置失败，使用默认设置:', error);
      this.settings = mergeWithDefaults(null);
    }
    
    this.syncToLocalStorage();
    return this.settings;
  }
  
  async save(settings: Partial<UserSettings>): Promise<void> {
    if (!this.settings) {
      await this.load();
    }
    
    this.settings = {
      ...this.settings!,
      ...settings
    };
    this.settings = mergeWithDefaults(this.settings);
    
    try {
      const plugin = usePlugin();
      await plugin.saveData(STORAGE_KEY, this.settings);
    } catch (error) {
      console.error('[UserSettings] 保存设置失败:', error);
    }
    
    this.syncToLocalStorage();
  }
  
  async update<K extends keyof UserSettings>(
    section: K,
    value: Partial<UserSettings[K]>
  ): Promise<void> {
    if (!this.settings) {
      await this.load();
    }
    
    this.settings![section] = {
      ...this.settings![section],
      ...value
    };
    this.settings = mergeWithDefaults(this.settings);
    
    try {
      const plugin = usePlugin();
      await plugin.saveData(STORAGE_KEY, this.settings);
    } catch (error) {
      console.error('[UserSettings] 更新设置失败:', error);
    }
    
    this.syncToLocalStorage();
  }
  
  async get<K extends keyof UserSettings>(section: K): Promise<UserSettings[K]> {
    if (!this.settings) {
      await this.load();
    }
    
    return this.settings![section];
  }
  
  private syncToLocalStorage(): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.warn('[UserSettings] 同步到 localStorage 失败:', error);
    }
  }

  clear(): void {
    this.settings = null;
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (error) {
      console.warn('[UserSettings] 清除 localStorage 失败:', error);
    }
  }
}

export const userSettings = new UserSettingsManager();
