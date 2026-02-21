import { usePlugin } from '../main';

interface UserSettings {
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
    filterPriority: 'all'
  },
  sidebar: {
    selectedNotebook: 'all',
    selectedDocument: 'all'
  }
};

const STORAGE_KEY = 'Stand-settings';
const LOCAL_STORAGE_KEY = 'siyuan-stand-settings';

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
        this.settings = { ...DEFAULT_SETTINGS, ...settings };
      } else {
        this.settings = { ...DEFAULT_SETTINGS };
      }
    } catch (error) {
      console.error('[UserSettings] 加载设置失败，使用默认设置:', error);
      this.settings = { ...DEFAULT_SETTINGS };
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