import { usePlugin } from '../main';
import { normalizeNotebookIds } from './taskViewShared';
import type { TaskViewGroupMode } from './taskGrouping';

export interface UserSettings {
  kanban: {
    currentView?: 'kanban' | 'table' | 'archive-table' | 'month' | 'week' | 'three-day' | 'day';
    filterType: string;
    filterSource?: string;
    filterDocument: string;
    filterPriority: string;
    kanbanFilterType: string;
    kanbanFilterSource?: string;
    kanbanFilterDocument: string;
    kanbanFilterPriority: string;
    kanbanFilterUpdatedRange: string;
    kanbanGroupMode?: boolean;
    tableGroupMode?: boolean;
    kanbanGroupBy?: TaskViewGroupMode;
    tableGroupBy?: TaskViewGroupMode;
    showKanbanTaskCardDetails?: boolean;
    tableFilterUpdatedRange: string;
    tableFilterType: string;
    tableFilterSource?: string;
    tableFilterDocument: string;
    monthFilterType: string;
    monthFilterSource?: string;
    monthFilterDocument: string;
    weekFilterType?: string;
    weekFilterSource?: string;
    weekFilterDocument?: string;
    dayFilterType?: string;
    dayFilterSource?: string;
    dayFilterDocument?: string;
    hiddenDocumentTabIds: string[];
    kanbanStatusFilters?: string[];
    kanbanPriorityFilters?: string[];
    kanbanDueFilters?: string[];
    kanbanUpdatedFilters?: string[];
    kanbanGroupFilters?: string[];
    kanbanExtraFilters?: string[];
    tableStatusFilters?: string[];
    tablePriorityFilters?: string[];
    tableDueFilters?: string[];
    tableUpdatedFilters?: string[];
    tableGroupFilters?: string[];
    tableExtraFilters?: string[];
  };
  taskManager: {
    filterStatus: string;
    filterNotebook: string;
    filterSource?: string;
    filterDocument: string;
    filterPriority: string;
    archiveViewMode?: 'active' | 'archived' | 'all';
    excludedNotebookIds: string[];
    showCompletedTasks?: boolean;
    autoRecognizeTaskDate?: boolean;
    taskCompletionSoundEnabled?: boolean;
    scopeInitialized?: boolean;
    lastTaskNotebook?: string;
    lastTaskDocument?: string;
    selectedGroupId?: string;
    taskListGroupBy?: 'none' | TaskViewGroupMode | 'date';
    taskListViewMode?: 'kanban' | 'list';
    showTaskCardDetails?: boolean;
    taskStatusFilters?: string[];
    taskPriorityFilters?: string[];
    taskDueFilters?: string[];
    taskUpdatedFilters?: string[];
    taskGroupFilters?: string[];
    taskExtraFilters?: string[];
  };
  sidebar: {
    selectedNotebook: string;
    selectedDocument: string;
  };
}

export const DEFAULT_SETTINGS: UserSettings = {
  kanban: {
    currentView: 'table',
    filterType: 'all',
    filterSource: 'all',
    filterDocument: 'all',
    filterPriority: 'all',
    kanbanFilterType: 'all',
    kanbanFilterSource: 'all',
    kanbanFilterDocument: 'all',
    kanbanFilterPriority: 'all',
    kanbanFilterUpdatedRange: 'all',
    kanbanGroupMode: false,
    tableGroupMode: false,
    kanbanGroupBy: 'status',
    tableGroupBy: 'status',
    showKanbanTaskCardDetails: true,
    tableFilterUpdatedRange: 'all',
    tableFilterType: 'all',
    tableFilterSource: 'all',
    tableFilterDocument: 'all',
    monthFilterType: 'all',
    monthFilterSource: 'all',
    monthFilterDocument: 'all',
    weekFilterType: 'all',
    weekFilterSource: 'all',
    weekFilterDocument: 'all',
    dayFilterType: 'all',
    dayFilterSource: 'all',
    dayFilterDocument: 'all',
    hiddenDocumentTabIds: [],
    kanbanStatusFilters: [],
    kanbanPriorityFilters: [],
    kanbanDueFilters: [],
    kanbanUpdatedFilters: [],
    kanbanGroupFilters: [],
    kanbanExtraFilters: [],
    tableStatusFilters: [],
    tablePriorityFilters: [],
    tableDueFilters: [],
    tableUpdatedFilters: [],
    tableGroupFilters: [],
    tableExtraFilters: []
  },
  taskManager: {
    filterStatus: 'all',
    filterNotebook: 'all',
    filterSource: 'all',
    filterDocument: 'all',
    filterPriority: 'all',
    archiveViewMode: 'active',
    excludedNotebookIds: [],
    showCompletedTasks: true,
    autoRecognizeTaskDate: false,
    taskCompletionSoundEnabled: true,
    scopeInitialized: false,
    selectedGroupId: 'all',
    taskListGroupBy: 'none',
    taskListViewMode: 'kanban',
    showTaskCardDetails: true,
    taskStatusFilters: [],
    taskPriorityFilters: [],
    taskDueFilters: [],
    taskUpdatedFilters: [],
    taskGroupFilters: [],
    taskExtraFilters: []
  },
  sidebar: {
    selectedNotebook: 'all',
    selectedDocument: 'all'
  }
};

const STORAGE_KEY = 'Stand-settings';
const LOCAL_STORAGE_KEY = 'siyuan-stand-settings';

function normalizeStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const item of input) {
    if (typeof item !== 'string') {
      continue;
    }
    const value = item.trim();
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    normalized.push(value);
  }
  return normalized;
}

function mergeWithDefaults(input: unknown): UserSettings {
  const raw = input && typeof input === 'object' ? (input as Partial<UserSettings>) : {};
  const rawKanban = raw.kanban && typeof raw.kanban === 'object' ? raw.kanban : {};
  const rawTaskManager = raw.taskManager && typeof raw.taskManager === 'object' ? raw.taskManager : {};
  const rawSidebar = raw.sidebar && typeof raw.sidebar === 'object' ? raw.sidebar : {};

  return {
    kanban: {
      ...DEFAULT_SETTINGS.kanban,
      ...rawKanban,
      hiddenDocumentTabIds: normalizeNotebookIds((rawKanban as { hiddenDocumentTabIds?: unknown }).hiddenDocumentTabIds),
      kanbanStatusFilters: normalizeStringArray((rawKanban as { kanbanStatusFilters?: unknown }).kanbanStatusFilters),
      kanbanPriorityFilters: normalizeStringArray((rawKanban as { kanbanPriorityFilters?: unknown }).kanbanPriorityFilters),
      kanbanDueFilters: normalizeStringArray((rawKanban as { kanbanDueFilters?: unknown }).kanbanDueFilters),
      kanbanUpdatedFilters: normalizeStringArray((rawKanban as { kanbanUpdatedFilters?: unknown }).kanbanUpdatedFilters),
      kanbanGroupFilters: normalizeStringArray((rawKanban as { kanbanGroupFilters?: unknown }).kanbanGroupFilters),
      kanbanExtraFilters: normalizeStringArray((rawKanban as { kanbanExtraFilters?: unknown }).kanbanExtraFilters),
      tableStatusFilters: normalizeStringArray((rawKanban as { tableStatusFilters?: unknown }).tableStatusFilters),
      tablePriorityFilters: normalizeStringArray((rawKanban as { tablePriorityFilters?: unknown }).tablePriorityFilters),
      tableDueFilters: normalizeStringArray((rawKanban as { tableDueFilters?: unknown }).tableDueFilters),
      tableUpdatedFilters: normalizeStringArray((rawKanban as { tableUpdatedFilters?: unknown }).tableUpdatedFilters),
      tableGroupFilters: normalizeStringArray((rawKanban as { tableGroupFilters?: unknown }).tableGroupFilters),
      tableExtraFilters: normalizeStringArray((rawKanban as { tableExtraFilters?: unknown }).tableExtraFilters)
    },
    taskManager: {
      ...DEFAULT_SETTINGS.taskManager,
      ...rawTaskManager,
      excludedNotebookIds: normalizeNotebookIds((rawTaskManager as { excludedNotebookIds?: unknown }).excludedNotebookIds),
      taskStatusFilters: normalizeStringArray((rawTaskManager as { taskStatusFilters?: unknown }).taskStatusFilters),
      taskPriorityFilters: normalizeStringArray((rawTaskManager as { taskPriorityFilters?: unknown }).taskPriorityFilters),
      taskDueFilters: normalizeStringArray((rawTaskManager as { taskDueFilters?: unknown }).taskDueFilters),
      taskUpdatedFilters: normalizeStringArray((rawTaskManager as { taskUpdatedFilters?: unknown }).taskUpdatedFilters),
      taskGroupFilters: normalizeStringArray((rawTaskManager as { taskGroupFilters?: unknown }).taskGroupFilters),
      taskExtraFilters: normalizeStringArray((rawTaskManager as { taskExtraFilters?: unknown }).taskExtraFilters)
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
