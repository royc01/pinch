import { usePlugin } from '../main';
import { normalizeNotebookIds } from './taskViewShared';
import type { TaskViewGroupMode } from './taskGrouping';
import type { TaskDateKeywordConfig } from './taskDateParser';
import type { StoredTaskFilterExpressionItem } from '@/composables/useTaskFilterState';

export type TaskViewSwitcherId = 'kanban' | 'list' | 'table' | 'quadrant' | 'gantt' | 'archive-table' | 'stats' | 'month' | 'week' | 'three-day' | 'day';
export type SidebarSectionId = 'week-dates' | 'habit-list' | 'stand-container';
export type TaskCreateDefaultTarget = 'last' | 'inbox' | 'daily-note';

export interface UserSettings {
  focus: {
    microBreakEnabled?: boolean;
    microBreakSystemNotification?: boolean;
    microBreakPopup?: boolean;
    microBreakSound?: boolean;
    microBreakMinIntervalMinutes?: number;
    microBreakMaxIntervalMinutes?: number;
    microBreakDurationSeconds?: number;
    shortBreakPopup?: boolean;
    focusCompletePopup?: boolean;
    checkinNotePrompt?: boolean;
    whiteNoiseEnabled?: boolean;
    selectedWhiteNoiseId?: string;
    whiteNoiseVolume?: number;
    customWhiteNoiseFile?: string;
    customWhiteNoiseVolume?: number;
    customCompletionSoundFile?: string;
    customCompletionSoundVolume?: number;
    customMicroBreakSoundFile?: string;
    customMicroBreakSoundVolume?: number;
  };
  kanban: {
    currentView?: TaskViewSwitcherId;
    lastCalendarView?: 'month' | 'week' | 'three-day' | 'day';
    calendarSidebarCollapsed?: boolean;
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
    listFilterType?: string;
    listFilterSource?: string;
    listFilterDocument?: string;
    listGroupMode?: boolean;
    tableGroupMode?: boolean;
    kanbanGroupBy?: TaskViewGroupMode;
    listGroupBy?: TaskViewGroupMode;
    tableGroupBy?: TaskViewGroupMode;
    showKanbanTaskCardDetails?: boolean;
    quadrantUrgentDays?: 1 | 3 | 7 | 10 | 15;
    tableFilterUpdatedRange: string;
    tableFilterType: string;
    tableFilterSource?: string;
    tableFilterDocument: string;
    ganttFilterType?: string;
    ganttFilterSource?: string;
    ganttFilterDocument?: string;
    ganttMilestonesEnabled?: boolean;
    ganttDocumentOrderBySource?: Record<string, string[]>;
    documentTabScopesBySource?: Record<string, {
      id: string;
      name: string;
      notebookId: string;
      path?: string;
    }>;
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
    kanbanGroupColumnOrder?: string[];
    kanbanStatusFilters?: string[];
    kanbanPriorityFilters?: string[];
    kanbanDueFilters?: string[];
    kanbanUpdatedFilters?: string[];
    kanbanGroupFilters?: string[];
    kanbanExtraFilters?: string[];
    kanbanFilterExpression?: StoredTaskFilterExpressionItem[];
    tableStatusFilters?: string[];
    tablePriorityFilters?: string[];
    tableDueFilters?: string[];
    tableUpdatedFilters?: string[];
    tableGroupFilters?: string[];
    tableExtraFilters?: string[];
    tableFilterExpression?: StoredTaskFilterExpressionItem[];
    hiddenViewSwitcherIds?: TaskViewSwitcherId[];
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
    dateRecognitionKeywords?: TaskDateKeywordConfig;
    taskCompletionSoundEnabled?: boolean;
    showDocumentGroupNotebookPath?: boolean;
    scopeInitialized?: boolean;
    lastTaskNotebook?: string;
    lastTaskDocument?: string;
    defaultTaskCreateTarget?: TaskCreateDefaultTarget;
    defaultTaskCreateNotebook?: string;
    selectedGroupId?: string;
    taskListGroupBy?: 'none' | TaskViewGroupMode;
    taskListViewMode?: 'kanban' | 'list' | 'timeline';
    showTaskCardDetails?: boolean;
    taskStatusFilters?: string[];
    taskPriorityFilters?: string[];
    taskDueFilters?: string[];
    taskUpdatedFilters?: string[];
    taskGroupFilters?: string[];
    taskExtraFilters?: string[];
    taskFilterExpression?: StoredTaskFilterExpressionItem[];
  };
  sidebar: {
    selectedNotebook: string;
    selectedDocument: string;
    hiddenSectionIds?: SidebarSectionId[];
    sectionOrder?: SidebarSectionId[];
    habitListCollapsed?: boolean;
    taskListCollapsed?: boolean;
    avatarDataUrl?: string;
  };
}

export const DEFAULT_SETTINGS: UserSettings = {
  focus: {
    microBreakEnabled: false,
    microBreakSystemNotification: false,
    microBreakPopup: true,
    microBreakSound: true,
    microBreakMinIntervalMinutes: 3,
    microBreakMaxIntervalMinutes: 5,
    microBreakDurationSeconds: 10,
    shortBreakPopup: false,
    focusCompletePopup: false,
    checkinNotePrompt: false,
    whiteNoiseEnabled: false,
    selectedWhiteNoiseId: 'rain',
    whiteNoiseVolume: 0.3,
    customWhiteNoiseVolume: 0.3,
    customCompletionSoundVolume: 0.3,
    customMicroBreakSoundVolume: 0.3
  },
  kanban: {
    currentView: 'table',
    lastCalendarView: 'month',
    calendarSidebarCollapsed: false,
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
    listFilterType: 'all',
    listFilterSource: 'all',
    listFilterDocument: 'all',
    listGroupMode: false,
    tableGroupMode: false,
    kanbanGroupBy: 'status',
    listGroupBy: 'status',
    tableGroupBy: 'status',
    showKanbanTaskCardDetails: true,
    quadrantUrgentDays: 7,
    tableFilterUpdatedRange: 'all',
    tableFilterType: 'all',
    tableFilterSource: 'all',
    tableFilterDocument: 'all',
    ganttFilterType: 'all',
    ganttFilterSource: 'all',
    ganttFilterDocument: 'all',
    ganttMilestonesEnabled: false,
    ganttDocumentOrderBySource: {},
    documentTabScopesBySource: {},
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
    kanbanGroupColumnOrder: [],
    kanbanStatusFilters: [],
    kanbanPriorityFilters: [],
    kanbanDueFilters: [],
    kanbanUpdatedFilters: [],
    kanbanGroupFilters: [],
    kanbanExtraFilters: [],
    kanbanFilterExpression: [],
    tableStatusFilters: [],
    tablePriorityFilters: [],
    tableDueFilters: [],
    tableUpdatedFilters: [],
    tableGroupFilters: [],
    tableExtraFilters: [],
    tableFilterExpression: [],
    hiddenViewSwitcherIds: []
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
    dateRecognitionKeywords: {},
    taskCompletionSoundEnabled: true,
    showDocumentGroupNotebookPath: true,
    scopeInitialized: false,
    defaultTaskCreateTarget: 'last',
    defaultTaskCreateNotebook: '',
    selectedGroupId: 'all',
    taskListGroupBy: 'none',
    taskListViewMode: 'kanban',
    showTaskCardDetails: true,
    taskStatusFilters: [],
    taskPriorityFilters: [],
    taskDueFilters: [],
    taskUpdatedFilters: [],
    taskGroupFilters: [],
    taskExtraFilters: [],
    taskFilterExpression: []
  },
  sidebar: {
    selectedNotebook: 'all',
    selectedDocument: 'all',
    hiddenSectionIds: [],
    sectionOrder: ['week-dates', 'habit-list', 'stand-container'],
    habitListCollapsed: false,
    taskListCollapsed: false,
    avatarDataUrl: ''
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

function normalizeTaskFilterExpression(input: unknown): StoredTaskFilterExpressionItem[] {
  if (!Array.isArray(input)) {
    return [];
  }
  const groups = new Set(['status', 'priority', 'group', 'due', 'updated', 'extra']);
  const seen = new Set<string>();
  const normalized: StoredTaskFilterExpressionItem[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    const group = typeof item.group === 'string' ? item.group : '';
    const value = typeof item.value === 'string' ? item.value.trim() : '';
    const key = `${group}:${value}`;
    if (!groups.has(group) || !value || seen.has(key)) continue;
    normalized.push({
      group: group as StoredTaskFilterExpressionItem['group'],
      value,
      join: item.join === 'or' || item.join === 'not' ? item.join : 'and'
    });
    seen.add(key);
  }
  return normalized;
}

function normalizeDocumentOrderBySource(input: unknown): Record<string, string[]> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }

  return Object.entries(input as Record<string, unknown>).reduce<Record<string, string[]>>((result, [source, order]) => {
    const normalizedSource = source.trim();
    if (normalizedSource) {
      result[normalizedSource] = normalizeStringArray(order);
    }
    return result;
  }, {});
}

function normalizeDocumentTabScopesBySource(input: unknown): Record<string, {
  id: string;
  name: string;
  notebookId: string;
  path?: string;
}> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }

  return Object.entries(input as Record<string, unknown>).reduce<Record<string, {
    id: string;
    name: string;
    notebookId: string;
    path?: string;
  }>>((result, [source, value]) => {
    const raw = value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
    const normalizedSource = source.trim();
    const id = typeof raw?.id === 'string' ? raw.id.trim() : '';
    const name = typeof raw?.name === 'string' ? raw.name.trim() : '';
    const notebookId = typeof raw?.notebookId === 'string' ? raw.notebookId.trim() : '';
    const path = typeof raw?.path === 'string' ? raw.path.trim() : '';
    if (normalizedSource && id && name && notebookId) {
      result[normalizedSource] = { id, name, notebookId, ...(path ? { path } : {}) };
    }
    return result;
  }, {});
}

function normalizePositiveInteger(input: unknown, fallback: number): number {
  const value = typeof input === 'number' ? Math.floor(input) : Number(input);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function normalizeDateRecognitionKeywords(input: unknown): TaskDateKeywordConfig {
  const raw = input && typeof input === 'object' ? input as TaskDateKeywordConfig : {};
  return {
    start: normalizeStringArray(raw.start),
    due: normalizeStringArray(raw.due),
    range: normalizeStringArray(raw.range),
    afternoon: normalizeStringArray(raw.afternoon)
  };
}

function normalizeAllowedStringArray<T extends string>(input: unknown, allowed: readonly T[]): T[] {
  const allowedSet = new Set<string>(allowed);
  return normalizeStringArray(input).filter((item): item is T => allowedSet.has(item));
}

function normalizeAllowedString<T extends string>(input: unknown, allowed: readonly T[], fallback: T): T {
  return typeof input === 'string' && (allowed as readonly string[]).includes(input)
    ? input as T
    : fallback;
}

function normalizeOrderedAllowedStringArray<T extends string>(
  input: unknown,
  allowed: readonly T[]
): T[] {
  const stored = normalizeAllowedStringArray(input, allowed);
  const storedSet = new Set(stored);
  return [
    ...stored,
    ...allowed.filter(item => !storedSet.has(item))
  ];
}

const TASK_VIEW_SWITCHER_IDS: readonly TaskViewSwitcherId[] = [
  'kanban',
  'list',
  'table',
  'quadrant',
  'gantt',
  'month',
  'week',
  'three-day',
  'day',
  'archive-table',
  'stats'
];

const SIDEBAR_SECTION_IDS: readonly SidebarSectionId[] = [
  'week-dates',
  'habit-list',
  'stand-container'
];
const TASK_CREATE_DEFAULT_TARGETS: readonly TaskCreateDefaultTarget[] = ['last', 'inbox', 'daily-note'];

function mergeWithDefaults(input: unknown): UserSettings {
  const raw = input && typeof input === 'object' ? (input as Partial<UserSettings>) : {};
  const rawFocus = raw.focus && typeof raw.focus === 'object' ? raw.focus : {};
  const rawKanban = raw.kanban && typeof raw.kanban === 'object' ? raw.kanban : {};
  const rawTaskManager = raw.taskManager && typeof raw.taskManager === 'object' ? raw.taskManager : {};
  const rawSidebar = raw.sidebar && typeof raw.sidebar === 'object' ? raw.sidebar : {};

  return {
    focus: {
      ...DEFAULT_SETTINGS.focus,
      ...rawFocus,
      microBreakMinIntervalMinutes: normalizePositiveInteger(
        (rawFocus as { microBreakMinIntervalMinutes?: unknown }).microBreakMinIntervalMinutes,
        DEFAULT_SETTINGS.focus.microBreakMinIntervalMinutes
      ),
      microBreakMaxIntervalMinutes: normalizePositiveInteger(
        (rawFocus as { microBreakMaxIntervalMinutes?: unknown }).microBreakMaxIntervalMinutes,
        DEFAULT_SETTINGS.focus.microBreakMaxIntervalMinutes
      ),
      microBreakDurationSeconds: normalizePositiveInteger(
        (rawFocus as { microBreakDurationSeconds?: unknown }).microBreakDurationSeconds,
        DEFAULT_SETTINGS.focus.microBreakDurationSeconds
      )
    },
    kanban: {
      ...DEFAULT_SETTINGS.kanban,
      ...rawKanban,
      calendarSidebarCollapsed: (rawKanban as { calendarSidebarCollapsed?: unknown }).calendarSidebarCollapsed === true,
      quadrantUrgentDays: ([1, 3, 7, 10, 15] as const).includes(
        (rawKanban as { quadrantUrgentDays?: unknown }).quadrantUrgentDays as 1 | 3 | 7 | 10 | 15
      )
        ? (rawKanban as { quadrantUrgentDays: 1 | 3 | 7 | 10 | 15 }).quadrantUrgentDays
        : DEFAULT_SETTINGS.kanban.quadrantUrgentDays,
      hiddenDocumentTabIds: normalizeNotebookIds((rawKanban as { hiddenDocumentTabIds?: unknown }).hiddenDocumentTabIds),
      ganttDocumentOrderBySource: normalizeDocumentOrderBySource(
        (rawKanban as { ganttDocumentOrderBySource?: unknown }).ganttDocumentOrderBySource
      ),
      documentTabScopesBySource: normalizeDocumentTabScopesBySource(
        (rawKanban as { documentTabScopesBySource?: unknown }).documentTabScopesBySource
      ),
      kanbanGroupColumnOrder: normalizeStringArray((rawKanban as { kanbanGroupColumnOrder?: unknown }).kanbanGroupColumnOrder),
      kanbanStatusFilters: normalizeStringArray((rawKanban as { kanbanStatusFilters?: unknown }).kanbanStatusFilters),
      kanbanPriorityFilters: normalizeStringArray((rawKanban as { kanbanPriorityFilters?: unknown }).kanbanPriorityFilters),
      kanbanDueFilters: normalizeStringArray((rawKanban as { kanbanDueFilters?: unknown }).kanbanDueFilters),
      kanbanUpdatedFilters: normalizeStringArray((rawKanban as { kanbanUpdatedFilters?: unknown }).kanbanUpdatedFilters),
      kanbanGroupFilters: normalizeStringArray((rawKanban as { kanbanGroupFilters?: unknown }).kanbanGroupFilters),
      kanbanExtraFilters: normalizeStringArray((rawKanban as { kanbanExtraFilters?: unknown }).kanbanExtraFilters),
      kanbanFilterExpression: normalizeTaskFilterExpression((rawKanban as { kanbanFilterExpression?: unknown }).kanbanFilterExpression),
      tableStatusFilters: normalizeStringArray((rawKanban as { tableStatusFilters?: unknown }).tableStatusFilters),
      tablePriorityFilters: normalizeStringArray((rawKanban as { tablePriorityFilters?: unknown }).tablePriorityFilters),
      tableDueFilters: normalizeStringArray((rawKanban as { tableDueFilters?: unknown }).tableDueFilters),
      tableUpdatedFilters: normalizeStringArray((rawKanban as { tableUpdatedFilters?: unknown }).tableUpdatedFilters),
      tableGroupFilters: normalizeStringArray((rawKanban as { tableGroupFilters?: unknown }).tableGroupFilters),
      tableExtraFilters: normalizeStringArray((rawKanban as { tableExtraFilters?: unknown }).tableExtraFilters),
      tableFilterExpression: normalizeTaskFilterExpression((rawKanban as { tableFilterExpression?: unknown }).tableFilterExpression),
      hiddenViewSwitcherIds: normalizeAllowedStringArray(
        (rawKanban as { hiddenViewSwitcherIds?: unknown }).hiddenViewSwitcherIds,
        TASK_VIEW_SWITCHER_IDS
      )
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
      taskExtraFilters: normalizeStringArray((rawTaskManager as { taskExtraFilters?: unknown }).taskExtraFilters),
      taskFilterExpression: normalizeTaskFilterExpression((rawTaskManager as { taskFilterExpression?: unknown }).taskFilterExpression),
      dateRecognitionKeywords: normalizeDateRecognitionKeywords(
        (rawTaskManager as { dateRecognitionKeywords?: unknown }).dateRecognitionKeywords
      ),
      defaultTaskCreateTarget: normalizeAllowedString(
        (rawTaskManager as { defaultTaskCreateTarget?: unknown }).defaultTaskCreateTarget,
        TASK_CREATE_DEFAULT_TARGETS,
        DEFAULT_SETTINGS.taskManager.defaultTaskCreateTarget
      ),
      defaultTaskCreateNotebook: typeof (rawTaskManager as { defaultTaskCreateNotebook?: unknown }).defaultTaskCreateNotebook === 'string'
        ? (rawTaskManager as { defaultTaskCreateNotebook: string }).defaultTaskCreateNotebook.trim()
        : DEFAULT_SETTINGS.taskManager.defaultTaskCreateNotebook
    },
    sidebar: {
      ...DEFAULT_SETTINGS.sidebar,
      ...rawSidebar,
      hiddenSectionIds: normalizeAllowedStringArray(
        (rawSidebar as { hiddenSectionIds?: unknown }).hiddenSectionIds,
        SIDEBAR_SECTION_IDS
      ),
      sectionOrder: normalizeOrderedAllowedStringArray(
        (rawSidebar as { sectionOrder?: unknown }).sectionOrder,
        SIDEBAR_SECTION_IDS
      ),
      habitListCollapsed: (rawSidebar as { habitListCollapsed?: unknown }).habitListCollapsed === true,
      taskListCollapsed: (rawSidebar as { taskListCollapsed?: unknown }).taskListCollapsed === true,
      avatarDataUrl: typeof (rawSidebar as { avatarDataUrl?: unknown }).avatarDataUrl === 'string'
        ? (rawSidebar as { avatarDataUrl: string }).avatarDataUrl
        : ''
    }
  };
}

export class UserSettingsManager {
  private settings: UserSettings | null = null;
  private localSnapshotLoaded = false;
  private loadPromise: Promise<UserSettings> | null = null;
  private saveQueue: Promise<void> = Promise.resolve();

  loadLocalSnapshot(): UserSettings | null {
    if (this.settings) return this.settings;
    try {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return null;
      this.settings = mergeWithDefaults(JSON.parse(raw));
      this.localSnapshotLoaded = true;
      return this.settings;
    } catch (error) {
      console.warn('[UserSettings] Failed to read local settings snapshot:', error);
      return null;
    }
  }
  
  async load(options: { refresh?: boolean } = {}): Promise<UserSettings> {
    // Settings can also be requested by startup helpers that do not use the
    // Vue composable. Always try the synchronous local snapshot here so an
    // earlier caller cannot put the sidebar behind a slow plugin load.
    if (!this.settings) {
      this.loadLocalSnapshot();
    }
    if (this.settings && options.refresh !== true) {
      return this.settings;
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this.loadFromStorage();
    try {
      return await this.loadPromise;
    } finally {
      this.loadPromise = null;
    }
  }

  private async loadFromStorage(): Promise<UserSettings> {
    const localSnapshot = this.localSnapshotLoaded ? this.settings : null;
    
    try {
      const plugin = usePlugin();
      
      const data = await plugin.loadData(STORAGE_KEY);
      
      if (data) {
        const settings = typeof data === 'string' ? JSON.parse(data) : data;
        this.settings = localSnapshot || mergeWithDefaults(settings);
      } else {
        this.settings = localSnapshot || mergeWithDefaults(null);
      }
    } catch (error) {
      console.error('[UserSettings] 加载设置失败，使用默认设置:', error);
      this.settings = localSnapshot || mergeWithDefaults(null);
    }
    
    if (!localSnapshot) {
      this.syncToLocalStorage();
    }
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
      await this.enqueueSave(this.settings);
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

    // The UI restores this snapshot synchronously on the next mount. Keep it
    // current before awaiting plugin storage, otherwise a reload between a
    // source selection and saveData resolving restores the previous "all"
    // filter and never reapplies the later background refresh.
    this.syncToLocalStorage();
    
    try {
      await this.enqueueSave(this.settings);
    } catch (error) {
      console.error('[UserSettings] 更新设置失败:', error);
    }
    
  }
  
  async get<K extends keyof UserSettings>(section: K): Promise<UserSettings[K]> {
    if (!this.settings) {
      await this.load();
    }
    
    return this.settings![section];
  }

  /**
   * Writes are serialized with an immutable snapshot. Concurrent view mounts
   * otherwise issue overlapping saveData calls, allowing an older "all"
   * filter snapshot to finish after a newer notebook selection.
   */
  private enqueueSave(settings: UserSettings | null): Promise<void> {
    const snapshot = mergeWithDefaults(settings);
    const pendingSave = this.saveQueue.then(async () => {
      const plugin = usePlugin();
      await plugin.saveData(STORAGE_KEY, snapshot);
    });

    // Keep the queue usable after a failed storage write; the caller still
    // receives the failure and logs it through its existing error path.
    this.saveQueue = pendingSave.catch(() => undefined);
    return pendingSave;
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
    this.localSnapshotLoaded = false;
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (error) {
      console.warn('[UserSettings] 清除 localStorage 失败:', error);
    }
  }
}

export const userSettings = new UserSettingsManager();
