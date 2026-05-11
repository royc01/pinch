/**
 * Copyright (c) 2023 frostime. All rights reserved.
 * https://github.com/frostime/sy-plugin-template-vite
 *
 * See API Document in [API.md](https://github.com/siyuan-note/siyuan/blob/master/API.md)
 * API 譁・｡｣隗・[API_zh_CN.md](https://github.com/siyuan-note/siyuan/blob/master/API_zh_CN.md)
 */

import {
  fetchSyncPost,
  getFrontend,
  IWebSocketData,
  openMobileFileById,
  openTab,
  type TProtyleAction
} from "siyuan";
import { eventBus, Events } from "@/utils/eventBus";
import { normalizeNotebookIds } from "@/utils/notebookIds";
import {
  normalizeTaskReminderCustomTime,
  normalizeTaskReminderType,
  type TaskReminderType
} from "@/utils/taskReminder";
import { formatTaskTitleHtml } from "@/utils/taskTitleFormat";
import { usePlugin } from "@/main";
import { awardTaskCompletion } from "@/rewardRepository";
import {
  attachRepeatMetadataToTasks,
  materializeRepeatTasks,
  setTaskRepeatSeries,
  getTaskRepeatFrequency,
  setRepeatInstanceStatus,
  type RepeatFrequency,
  type RepeatMaterializeOptions
} from "@/repeatRepository";
import {
  extractDocumentIconFromBlockRow,
  extractDocumentIconFromDom,
  normalizeDocumentIconValue
} from "@/utils/documentIcon";

async function request(url: string, data: any) {
  let response: IWebSocketData = await fetchSyncPost(url, data);
  let res = response.code === 0 ? response.data : null;
  return res;
}

async function closeOpenMobileKanbanDialogIfNeeded(): Promise<void> {
  if (typeof document === "undefined") {
    return;
  }

  let dialog = document.querySelector(".pinch-mobile-kanban-dialog.b3-dialog--open") as HTMLElement | null;
  if (!dialog) {
    return;
  }

  eventBus.emit(Events.MOBILE_KANBAN_DIALOG_CLOSE_REQUEST);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    dialog = document.querySelector(".pinch-mobile-kanban-dialog.b3-dialog--open") as HTMLElement | null;
    if (!dialog) {
      return;
    }
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 16);
    });
  }

  dialog = document.querySelector(".pinch-mobile-kanban-dialog.b3-dialog--open") as HTMLElement | null;
  if (!dialog) {
    return;
  }

  const closeButton = dialog.querySelector(
    ".pinch-mobile-kanban-dialog-close-button, .b3-dialog__close"
  ) as HTMLButtonElement | null;

  if (!closeButton) {
    return;
  }

  closeButton.click();

  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (!dialog.isConnected || !dialog.classList.contains("b3-dialog--open")) {
      return;
    }
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 16);
    });
  }
}

export async function openBlockById(
  blockId: string,
  options: { focus?: boolean } = {}
): Promise<boolean> {
  const normalizedId = typeof blockId === "string" ? blockId.trim() : "";
  if (!normalizedId) return false;

  const plugin = usePlugin();
  if (!plugin) {
    console.error("[TaskAPI Error] openBlockById: plugin 未初始化");
    return false;
  }

  const action: TProtyleAction[] = options.focus
    ? ["cb-get-focus"]
    : ["cb-get-hl", "cb-get-context"];

  try {
    const frontend = getFrontend();
    const isMobile = frontend === "mobile" || frontend === "browser-mobile";

    if (isMobile) {
      await closeOpenMobileKanbanDialogIfNeeded();
      openMobileFileById(plugin.app, normalizedId, action);
      return true;
    }

    await openTab({
      app: plugin.app,
      doc: {
        id: normalizedId,
        action
      }
    });
    return true;
  } catch (error) {
    console.error("[TaskAPI Error] openBlockById: 打开块失败", error);
    return false;
  }
}

// **************************************** Noteboook ****************************************

export async function lsNotebooks(): Promise<IReslsNotebooks> {
  let url = "/api/notebook/lsNotebooks";
  return request(url, "");
}

export async function openNotebook(notebook: NotebookId) {
  let url = "/api/notebook/openNotebook";
  return request(url, { notebook: notebook });
}

export async function closeNotebook(notebook: NotebookId) {
  let url = "/api/notebook/closeNotebook";
  return request(url, { notebook: notebook });
}

export async function renameNotebook(notebook: NotebookId, name: string) {
  let url = "/api/notebook/renameNotebook";
  return request(url, { notebook: notebook, name: name });
}

export async function createNotebook(name: string): Promise<Notebook> {
  let url = "/api/notebook/createNotebook";
  return request(url, { name: name });
}

export async function removeNotebook(notebook: NotebookId) {
  let url = "/api/notebook/removeNotebook";
  return request(url, { notebook: notebook });
}

export async function getNotebookConf(
  notebook: NotebookId
): Promise<IResGetNotebookConf> {
  let data = { notebook: notebook };
  let url = "/api/notebook/getNotebookConf";
  return request(url, data);
}

export async function setNotebookConf(
  notebook: NotebookId,
  conf: NotebookConf
): Promise<NotebookConf> {
  let data = { notebook: notebook, conf: conf };
  let url = "/api/notebook/setNotebookConf";
  return request(url, data);
}

// **************************************** File Tree ****************************************
export async function createDocWithMd(
  notebook: NotebookId,
  path: string,
  markdown: string
): Promise<DocumentId> {
  let data = {
    notebook: notebook,
    path: path,
    markdown: markdown,
  };
  let url = "/api/filetree/createDocWithMd";
  return request(url, data);
}

export async function renameDoc(
  notebook: NotebookId,
  path: string,
  title: string
): Promise<DocumentId> {
  let data = {
    doc: notebook,
    path: path,
    title: title,
  };
  let url = "/api/filetree/renameDoc";
  return request(url, data);
}

export async function removeDoc(notebook: NotebookId, path: string) {
  let data = {
    notebook: notebook,
    path: path,
  };
  let url = "/api/filetree/removeDoc";
  return request(url, data);
}

export async function moveDocs(
  fromPaths: string[],
  toNotebook: NotebookId,
  toPath: string
) {
  let data = {
    fromPaths: fromPaths,
    toNotebook: toNotebook,
    toPath: toPath,
  };
  let url = "/api/filetree/moveDocs";
  return request(url, data);
}

export async function getHPathByPath(
  notebook: NotebookId,
  path: string
): Promise<string> {
  let data = {
    notebook: notebook,
    path: path,
  };
  let url = "/api/filetree/getHPathByPath";
  return request(url, data);
}

export async function getHPathByID(id: BlockId): Promise<string> {
  let data = {
    id: id,
  };
  let url = "/api/filetree/getHPathByID";
  return request(url, data);
}

export async function getIDsByHPath(
  notebook: NotebookId,
  path: string
): Promise<BlockId[]> {
  let data = {
    notebook: notebook,
    path: path,
  };
  let url = "/api/filetree/getIDsByHPath";
  return request(url, data);
}

// **************************************** Asset Files ****************************************

export async function upload(
  assetsDirPath: string,
  files: any[]
): Promise<IResUpload> {
  let form = new FormData();
  form.append("assetsDirPath", assetsDirPath);
  for (let file of files) {
    form.append("file[]", file);
  }
  let url = "/api/asset/upload";
  return request(url, form);
}

// **************************************** Block ****************************************
type DataType = "markdown" | "dom";
export async function insertBlock(
  dataType: DataType,
  data: string,
  nextID?: BlockId,
  previousID?: BlockId,
  parentID?: BlockId
): Promise<IResdoOperations[]> {
  let payload = {
    dataType: dataType,
    data: data,
    nextID: nextID,
    previousID: previousID,
    parentID: parentID,
  };
  let url = "/api/block/insertBlock";
  return request(url, payload);
}

export async function prependBlock(
  dataType: DataType,
  data: string,
  parentID: BlockId | DocumentId
): Promise<IResdoOperations[]> {
  let payload = {
    dataType: dataType,
    data: data,
    parentID: parentID,
  };
  let url = "/api/block/prependBlock";
  return request(url, payload);
}

export async function appendBlock(
  dataType: DataType,
  data: string,
  parentID: BlockId | DocumentId
): Promise<IResdoOperations[]> {
  let payload = {
    dataType: dataType,
    data: data,
    parentID: parentID,
  };
  let url = "/api/block/appendBlock";
  return request(url, payload);
}

export async function updateBlock(
  dataType: DataType,
  data: string,
  id: BlockId
): Promise<IResdoOperations[]> {
  let payload = {
    dataType: dataType,
    data: data,
    id: id,
  };
  let url = "/api/block/updateBlock";
  return request(url, payload);
}

export async function deleteBlock(id: BlockId): Promise<IResdoOperations[]> {
  let data = {
    id: id,
  };
  let url = "/api/block/deleteBlock";
  return request(url, data);
}

export async function moveBlock(
  id: BlockId,
  previousID?: PreviousID,
  parentID?: ParentID
): Promise<IResdoOperations[]> {
  let data = {
    id: id,
    previousID: previousID,
    parentID: parentID,
  };
  let url = "/api/block/moveBlock";
  return request(url, data);
}

export async function getBlockKramdown(
  id: BlockId
): Promise<IResGetBlockKramdown> {
  let data = {
    id: id,
  };
  let url = "/api/block/getBlockKramdown";
  return request(url, data);
}

export async function getChildBlocks(
  id: BlockId
): Promise<IResGetChildBlock[]> {
  let data = {
    id: id,
  };
  let url = "/api/block/getChildBlocks";
  return request(url, data);
}

export async function transferBlockRef(
  fromID: BlockId,
  toID: BlockId,
  refIDs: BlockId[]
) {
  let data = {
    fromID: fromID,
    toID: toID,
    refIDs: refIDs,
  };
  let url = "/api/block/transferBlockRef";
  return request(url, data);
}

export async function updateTaskListItemMarker(
  id: BlockId,
  marker: string
): Promise<IResdoOperations[]> {
  const normalizedMarker = marker === " " ? " " : "x";
  const data = {
    id,
    marker: normalizedMarker
  };
  const url = "/api/block/updateTaskListItemMarker";
  const result = await request(url, data);
  if (result === null) {
    throw new Error(`updateTaskListItemMarker failed for block ${id}`);
  }
  return result;
}

// **************************************** Attributes ****************************************
export async function setBlockAttrs(
  id: BlockId,
  attrs: { [key: string]: string }
) {
  let data = {
    id: id,
    attrs: attrs,
  };
  let url = "/api/attr/setBlockAttrs";
  return request(url, data);
}

export async function getBlockAttrs(
  id: BlockId
): Promise<{ [key: string]: string }> {
  let data = {
    id: id,
  };
  let url = "/api/attr/getBlockAttrs";
  return request(url, data);
}

// **************************************** SQL ****************************************

export async function sql(sql: string): Promise<any[]> {
  let sqldata = {
    stmt: sql,
  };
  let url = "/api/query/sql";
  return request(url, sqldata);
}

export async function getBlockByID(blockId: string): Promise<Block> {
  let sqlScript = `select * from blocks where id ='${blockId}'`;
  let data = await sql(sqlScript);
  return data[0];
}

// **************************************** Template ****************************************

export async function render(
  id: DocumentId,
  path: string
): Promise<IResGetTemplates> {
  let data = {
    id: id,
    path: path,
  };
  let url = "/api/template/render";
  return request(url, data);
}

export async function renderSprig(template: string): Promise<string> {
  let url = "/api/template/renderSprig";
  return request(url, { template: template });
}

// **************************************** File ****************************************

export async function getFile(path: string): Promise<any> {
  let data = {
    path: path,
  };
  let url = "/api/file/getFile";
  try {
    let file = await fetchSyncPost(url, data);
    return file;
  } catch (error_msg) {
    return null;
  }
}

// 检查习惯数据文件状态（调试辅助）
export async function checkHabitFileStatus() {
  
  try {
    const fileData = await getFile('/data/storage/petal/Pinch-habit/Pinch-habit.json');

    
    if (typeof fileData === 'object' && fileData !== null && Array.isArray(fileData)) {

      
      // 尝试定位指定测试习惯，便于本地排查
      const testHabit = fileData.find(h => h.name === '222');
      if (testHabit) {

      }
    }
  } catch (error) {
    console.error('读取习惯文件状态失败:', error);
  }
}
export async function putFile(path: string, isDir: boolean, file: any) {
    let form = new FormData();
    form.append('path', path);
    form.append('isDir', isDir.toString());
    // Copyright (c) 2023, terwer.
    // https://github.com/terwer/siyuan-plugin-importer/blob/v1.4.1/src/api/kernel-api.ts
    form.append('modTime', Math.floor(Date.now() / 1000).toString());
    form.append('file', file);
    let url = '/api/file/putFile';
    return request(url, form);
}

export async function removeFile(path: string) {
  let data = {
    path: path,
  };
  let url = "/api/file/removeFile";
  return request(url, data);
}

export async function readDir(path: string): Promise<IResReadDir> {
  let data = {
    path: path,
  };
  let url = "/api/file/readDir";
  return request(url, data);
}

// **************************************** Export ****************************************

export async function exportMdContent(
  id: DocumentId
): Promise<IResExportMdContent> {
  let data = {
    id: id,
  };
  let url = "/api/export/exportMdContent";
  return request(url, data);
}

export async function exportResources(
  paths: string[],
  name: string
): Promise<IResExportResources> {
  let data = {
    paths: paths,
    name: name,
  };
  let url = "/api/export/exportResources";
  return request(url, data);
}

// **************************************** Convert ****************************************

export type PandocArgs = string;
export async function pandoc(args: PandocArgs[]) {
  let data = {
    args: args,
  };
  let url = "/api/convert/pandoc";
  return request(url, data);
}

// **************************************** Notification ****************************************

// /api/notification/pushMsg
// {
//     "msg": "test",
//     "timeout": 7000
//   }
export async function pushMsg(msg: string, timeout: number = 7000) {
  let payload = {
    msg: msg,
    timeout: timeout,
  };
  let url = "/api/notification/pushMsg";
  return request(url, payload);
}

export async function pushErrMsg(msg: string, timeout: number = 7000) {
  let payload = {
    msg: msg,
    timeout: timeout,
  };
  let url = "/api/notification/pushErrMsg";
  return request(url, payload);
}

// **************************************** Network ****************************************
export async function forwardProxy(
  url: string,
  method: string = "GET",
  payload: any = {},
  headers: any[] = [],
  timeout: number = 7000,
  contentType: string = "text/html"
): Promise<IResForwardProxy> {
  let data = {
    url: url,
    method: method,
    timeout: timeout,
    contentType: contentType,
    headers: headers,
    payload: payload,
  };
  let url1 = "/api/network/forwardProxy";
  return request(url1, data);
}

// **************************************** System ****************************************

export async function bootProgress(): Promise<IResBootProgress> {
  return request("/api/system/bootProgress", {});
}

export async function version(): Promise<string> {
  return request("/api/system/version", {});
}

export async function currentTime(): Promise<number> {
  return request("/api/system/currentTime", {});
}

// 获取系统 emoji 配置
export async function getEmojiConf(): Promise<any> {
  let url = "/api/system/getEmojiConf";
  return request(url, {});
}

// **************************************** Habit Tracker ****************************************

export interface Habit {
  id: string;
  name: string;
  emoji?: string;
  difficulty: HabitDifficulty;
  frequency: 'daily' | 'weekly' | 'custom' | 'weekly1' | 'weekly2' | 'weekly3' | 'weekly4' | 'weekly5' | 'weekly6';
  timesPerDay?: number;
  noteDocId?: string;
  completedToday: boolean;
  currentStreak: number;
  totalCompletions: number;
  calendar: HabitCalendarDay[];
  createdAt: string;
  currentWeekOffset?: number;
  statsViewMode?: 'month';
  statsMonthOffset?: number;
  usePomodoro?: boolean;
  pomodoroDuration?: number;
  pomodoroTimer?: number;
  pomodoroRemaining?: number;
  pomodoroState?: 'work' | 'shortBreak' | 'longBreak';
  isPaused?: boolean;
  isPomodoroPaused?: boolean;
}

export type HabitDifficulty = 'easy' | 'medium' | 'hard';

export interface HabitCalendarDay {
  date: string;
  completed: boolean;
  targetCount?: number;
  completedCount?: number;
  timestamp?: number;
  note?: string;
}

const HABIT_FREQUENCIES: Habit['frequency'][] = [
  'daily',
  'weekly',
  'custom',
  'weekly1',
  'weekly2',
  'weekly3',
  'weekly4',
  'weekly5',
  'weekly6'
];

function normalizeHabitFrequency(frequency: unknown): Habit['frequency'] {
  if (typeof frequency === 'string' && HABIT_FREQUENCIES.includes(frequency as Habit['frequency'])) {
    return frequency as Habit['frequency'];
  }
  return 'daily';
}

function normalizeHabitDifficulty(difficulty: unknown): HabitDifficulty {
  if (difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard') {
    return difficulty;
  }
  return 'easy';
}

function normalizeHabitCalendar(calendar: unknown): HabitCalendarDay[] {
  if (!Array.isArray(calendar)) return [];

  const normalized: HabitCalendarDay[] = [];
  for (const item of calendar) {
    if (!item || typeof item !== 'object') continue;

    const day = item as Partial<HabitCalendarDay>;
    if (typeof day.date !== 'string' || !day.date) continue;

    const normalizedDay: HabitCalendarDay = {
      date: day.date,
      completed: Boolean(day.completed)
    };

    if (typeof day.targetCount === 'number' && Number.isFinite(day.targetCount)) {
      normalizedDay.targetCount = day.targetCount;
    }
    if (typeof day.completedCount === 'number' && Number.isFinite(day.completedCount)) {
      normalizedDay.completedCount = day.completedCount;
    }
    if (typeof day.timestamp === 'number' && Number.isFinite(day.timestamp)) {
      normalizedDay.timestamp = day.timestamp;
    }

    normalized.push(normalizedDay);
  }

  return normalized;
}

// 获取习惯数据
export async function getHabits(): Promise<Habit[]> {
  try {
    const plugin = usePlugin();
    if (!plugin) {
      console.error('[Habits] plugin 未初始化');
      return [];
    }

    const data = await plugin.loadData('Pinch-habit.json');
    if (!data) return [];

    const parsedRaw: unknown = typeof data === 'string' ? JSON.parse(data) : data;
    if (!Array.isArray(parsedRaw)) {
      console.error('[Habits] 数据格式错误，期望数组');
      return [];
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const parsed: Habit[] = [];

    for (const raw of parsedRaw) {
      if (!raw || typeof raw !== 'object') continue;

      const habit = raw as Partial<Habit> & Record<string, unknown>;
      const calendar = normalizeHabitCalendar(habit.calendar);
      const todayRecord = calendar.find(day => day.date === todayStr);
      const completedToday = todayRecord ? Boolean(todayRecord.completed) : false;

      parsed.push({
        ...(habit as Habit),
        id: typeof habit.id === 'string' ? habit.id : `habit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: typeof habit.name === 'string' ? habit.name : '',
        difficulty: normalizeHabitDifficulty(habit.difficulty),
        frequency: normalizeHabitFrequency(habit.frequency),
        calendar,
        completedToday,
        currentStreak:
          typeof habit.currentStreak === 'number' && Number.isFinite(habit.currentStreak)
            ? habit.currentStreak
            : 0,
        totalCompletions:
          typeof habit.totalCompletions === 'number' && Number.isFinite(habit.totalCompletions)
            ? habit.totalCompletions
            : calendar.filter(day => day.completed).length,
        createdAt: typeof habit.createdAt === 'string' ? habit.createdAt : new Date().toISOString()
      });
    }

    return parsed;
  } catch (error) {
    console.error('Error reading habits:', error);
    return [];
  }
}

// 保存习惯数据
export async function saveHabits(habits: Habit[]): Promise<void> {
  try {
    const plugin = usePlugin();
    if (!plugin) {
      console.error('[Habits] plugin 未初始化');
      throw new Error('plugin 未初始化');
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const source = Array.isArray(habits) ? habits : [];

    const habitsToSave: Habit[] = source
      .filter(item => Boolean(item) && typeof item === 'object')
      .map((rawHabit: Habit) => {
        const habit = rawHabit as Partial<Habit> & Record<string, unknown>;
        const calendar = normalizeHabitCalendar(habit.calendar);
        const todayRecord = calendar.find(day => day.date === todayStr);
        const completedToday = todayRecord ? Boolean(todayRecord.completed) : false;

        return {
          ...(habit as Habit),
          id: typeof habit.id === 'string' ? habit.id : `habit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: typeof habit.name === 'string' ? habit.name : '',
          difficulty: normalizeHabitDifficulty(habit.difficulty),
          frequency: normalizeHabitFrequency(habit.frequency),
          calendar,
          completedToday,
          currentStreak:
            typeof habit.currentStreak === 'number' && Number.isFinite(habit.currentStreak)
              ? habit.currentStreak
              : 0,
          totalCompletions:
            typeof habit.totalCompletions === 'number' && Number.isFinite(habit.totalCompletions)
              ? habit.totalCompletions
              : calendar.filter(day => day.completed).length,
          createdAt: typeof habit.createdAt === 'string' ? habit.createdAt : new Date().toISOString()
        };
      });

    await plugin.saveData('Pinch-habit.json', habitsToSave);
  } catch (error) {
    console.error('Error saving habits:', error);
    throw error;
  }
}

// 情绪记录数据结构
export interface MoodEntry {
  emoji: string;
  note: string;
  timestamp: string;
}

export interface MoodData {
  [date: string]: MoodEntry;
}

// 获取情绪数据
export async function getMoodData(): Promise<MoodData> {
  try {
    const plugin = usePlugin();
    if (!plugin) {
      console.error('插件未初始化，无法读取数据');
      return {};
    }
    
    const data = await plugin.loadData('Pinch-mood.json');
    
    if (data) {
      const parsed: MoodData = typeof data === 'string' ? JSON.parse(data) : data;
      return parsed;
    } else {
      return {};
    }
  } catch (error) {
    console.error('Error reading mood data:', error);
    return {};
  }
}

// 保存情绪数据
export async function saveMoodData(moodData: MoodData): Promise<void> {
  try {
    const plugin = usePlugin();
    if (!plugin) {
      console.error('插件未初始化，无法保存数据');
      throw new Error('插件未初始化，无法保存数据');
    }
    
    // 直接保存对象，无需额外序列化
    await plugin.saveData('Pinch-mood.json', moodData);
  } catch (error) {
    console.error('Error saving mood data:', error);
    throw error;
  }
}

// **************************************** Focus Timer ****************************************

export interface DailyFocusRecord {
  date: string; // YYYY-MM-DD
  sessions: number;
  minutes: number;
  timestamp: number;
}

export interface FocusSessionRecord {
  id: string;
  date: string; // YYYY-MM-DD
  minutes: number;
  timestamp: number;
  targetType: 'habit' | 'task' | 'unlinked';
  targetId?: string;
  targetName?: string;
  targetEmoji?: string;
  targetBlockId?: string;
}

export interface FocusSessionTargetInput {
  type: 'habit' | 'task';
  id: string;
  name: string;
  emoji?: string;
  blockId?: string;
}

export interface FocusTimerData {
  dailyRecords: DailyFocusRecord[];
  sessionRecords: FocusSessionRecord[];
}

export interface FocusStatsSummary {
  totalSessions: number;
  totalMinutes: number;
  todaySessions: number;
  todayMinutes: number;
  recentDays: DailyFocusRecord[]; // 最近 7 天记录
}

// 获取专注计时数据
export async function getFocusTimerData(): Promise<FocusTimerData> {
  try {
    const plugin = usePlugin();
    if (!plugin) {
      console.error('插件未初始化，无法读取数据');
      return { dailyRecords: [], sessionRecords: [] };
    }
    
    const data = await plugin.loadData('Pinch-focus-timer.json');
    
    if (data) {
      const parsed = (typeof data === 'string' ? JSON.parse(data) : data) as Partial<FocusTimerData>;
      const dailyRecords = Array.isArray(parsed.dailyRecords) ? parsed.dailyRecords : [];
      const sessionRecords = normalizeFocusSessionRecords(parsed.sessionRecords);

      return {
        dailyRecords,
        sessionRecords
      };
    } else {
      // 文件不存在时返回空结构，避免首启报错
      return { dailyRecords: [], sessionRecords: [] };
    }
  } catch (error) {
    console.error('Error reading focus timer data:', error);
    // 读取失败时返回空结构
    return { dailyRecords: [], sessionRecords: [] };
  }
}

export async function getFocusStatsSummary(): Promise<FocusStatsSummary> {
  try {
    const data = await getFocusTimerData();
    const today = new Date().toISOString().split('T')[0];

    const totalSessions = data.dailyRecords.reduce((sum, record) => sum + record.sessions, 0);
    const totalMinutes = data.dailyRecords.reduce((sum, record) => sum + record.minutes, 0);
    const todayRecord = data.dailyRecords.find(record => record.date === today);

    const recentDays = data.dailyRecords
      .filter(record => {
        const recordDate = new Date(record.date);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        return recordDate >= sevenDaysAgo;
      })
      .sort((a, b) => b.timestamp - a.timestamp);

    return {
      totalSessions,
      totalMinutes,
      todaySessions: todayRecord?.sessions || 0,
      todayMinutes: todayRecord?.minutes || 0,
      recentDays
    };
  } catch (error) {
    console.error('Error getting focus stats summary:', error);
    return {
      totalSessions: 0,
      totalMinutes: 0,
      todaySessions: 0,
      todayMinutes: 0,
      recentDays: []
    };
  }
}

// 保存专注计时数据
export async function saveFocusTimerData(data: FocusTimerData): Promise<void> {
  try {
    const plugin = usePlugin();
    if (!plugin) {
      console.error('插件未初始化，无法保存数据');
      throw new Error('插件未初始化，无法保存数据');
    }
    
    // 直接保存对象，无需额外序列化
    await plugin.saveData('Pinch-focus-timer.json', {
      dailyRecords: Array.isArray(data.dailyRecords) ? data.dailyRecords : [],
      sessionRecords: Array.isArray(data.sessionRecords) ? data.sessionRecords : []
    });
  } catch (error) {
    console.error('Error saving focus timer data:', error);
    throw error;
  }
}

function normalizeFocusSessionRecords(records: unknown): FocusSessionRecord[] {
  if (!Array.isArray(records)) {
    return [];
  }

  const normalized: FocusSessionRecord[] = [];

  for (const item of records) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const record = item as Partial<FocusSessionRecord>;
    const minutes = typeof record.minutes === 'number'
      ? record.minutes
      : Number(record.minutes);
    const timestamp = typeof record.timestamp === 'number'
      ? record.timestamp
      : Number(record.timestamp);
    const date = typeof record.date === 'string' ? record.date.trim() : '';

    if (!date || !Number.isFinite(minutes) || minutes <= 0 || !Number.isFinite(timestamp)) {
      continue;
    }

    const targetType = record.targetType === 'habit' || record.targetType === 'task'
      ? record.targetType
      : 'unlinked';
    const targetId = typeof record.targetId === 'string' && record.targetId.trim().length > 0
      ? record.targetId.trim()
      : undefined;
    const targetName = typeof record.targetName === 'string' && record.targetName.trim().length > 0
      ? record.targetName.trim()
      : undefined;
    const targetEmoji = typeof record.targetEmoji === 'string' && record.targetEmoji.trim().length > 0
      ? record.targetEmoji.trim()
      : undefined;
    const targetBlockId = typeof record.targetBlockId === 'string' && record.targetBlockId.trim().length > 0
      ? record.targetBlockId.trim()
      : undefined;

    normalized.push({
      id: typeof record.id === 'string' && record.id.trim().length > 0
        ? record.id.trim()
        : `focus-session-${timestamp}-${normalized.length}`,
      date,
      minutes,
      timestamp,
      targetType,
      targetId,
      targetName,
      targetEmoji,
      targetBlockId
    });
  }

  return normalized;
}

export async function addFocusSession(
  duration: number,
  target: FocusSessionTargetInput | null = null
): Promise<void> {
  try {
    const data = await getFocusTimerData();
    const today = new Date().toISOString().split('T')[0];
    const now = Date.now();

    let todayRecord = data.dailyRecords.find(record => record.date === today);
    if (todayRecord) {
      todayRecord.sessions += 1;
      todayRecord.minutes += duration;
      todayRecord.timestamp = now;
    } else {
      data.dailyRecords.push({
        date: today,
        sessions: 1,
        minutes: duration,
        timestamp: now
      });
    }

    data.sessionRecords.push({
      id: `focus-session-${now}-${Math.random().toString(36).slice(2, 8)}`,
      date: today,
      minutes: duration,
      timestamp: now,
      targetType: target?.type ?? 'unlinked',
      targetId: target?.id,
      targetName: target?.name,
      targetEmoji: target?.emoji,
      targetBlockId: target?.blockId
    });

    await saveFocusTimerData(data);
  } catch (error) {
    console.error('Error adding focus session:', error);
    throw error;
  }
}

export async function getMonthlyRecords(year: number, month: number): Promise<DailyFocusRecord[]> {
  try {
    const data = await getFocusTimerData();
    
    const monthlyRecords = data.dailyRecords.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate.getFullYear() === year && recordDate.getMonth() === month;
    });
    
    return monthlyRecords;
  } catch (error) {
    console.error('Error getting monthly records:', error);
    return [];
  }
}

// **************************************** Task Manager ****************************************

export interface SiyuanBlock {
  id: string;
  content: string;
  box: string;
  hpath: string;
  sort?: string | number;
  updated: string;
  created: string;
  markdown: string;
  parent_id: string;
  root_id: string;
  type: string;
  subtype: string;
  memo?: string;
}

export interface SiyuanRequestPayload {
  dataType?: string;
  data?: string;
  nextID?: string;
  previousID?: string;
  parentID?: string;
  [key: string]: unknown;
}

export interface SiyuanRequestHeader {
  name?: string;
  value?: string;
  [key: string]: unknown;
}

export interface BlockDOMResponse {
  dom: string;
  [key: string]: unknown;
}

const DEBUG = false;

export const TASK_CONFIG = {
  CACHE_VERSION: 8,
  CACHE_DURATION: 10 * 60 * 1000,
  BATCH_SIZE: 10,
  SQL_PAGE_SIZE: 1000,
  MAX_SQL_SCAN: 20000,
  MAX_SUBTASK_DEPTH: 10,
  MAX_DOM_ORDER_SYNC: 120,
  DEBOUNCE_DELAY: 2000,
  SKIP_DELAY: 500,
  MUTATION_SKIP_DURATION: 1000,
  RECENT_TASK_WINDOW: 5000
} as const;

export function unicodeToEmoji(icon: string | undefined): string {
  if (!icon) return '📄';
  
  const hasEmoji = /^[\u{1F300}-\u{1F9FF}]/u.test(icon);
  if (hasEmoji) return icon;
  
  const isUnicodeCodePoint = /^[0-9a-fA-F]{4,5}$/.test(icon);
  if (isUnicodeCodePoint) {
    try {
      const codePoint = parseInt(icon, 16);
      return String.fromCodePoint(codePoint);
    } catch {
      return '📄';
    }
  }
  
  return icon;
}

async function batchGetBlockAttrs(ids: string[]): Promise<Map<string, any>> {
  if (ids.length === 0) return new Map();
  
  const result = new Map<string, any>();
  const batchSize = TASK_CONFIG.BATCH_SIZE;
  
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const promises = batch.map(id => getBlockAttrs(id).catch((error) => {
      log_debug('获取块属性失败', { id, error });
      return {};
    }));
    const attrsArray = await Promise.all(promises);
    
    batch.forEach((id, index) => {
      result.set(id, attrsArray[index]);
    });
  }
  
  return result;
}

function handleError(operation: string, error: unknown, context?: Record<string, unknown>): void {
  const errorInfo = {
    operation,
    message: error instanceof Error ? error.message : String(error),
    context,
    timestamp: new Date().toISOString()
  };
  
  console.error(`[TaskAPI Error] ${operation}:`, errorInfo);
}

function log_debug(msg: string, data?: any) {
  if (DEBUG) {
    console.log(`[TaskAPI Debug] ${msg}`, data || '');
  }
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  nodeId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  description?: string;
  groupId?: string;
  startDate?: string;
  dueDate?: string;
  startTime?: string;
  dueTime?: string;
  createdAt?: string;
  updatedAt?: string;
  subtasks?: SubTask[];
}

export interface EmojiConfig {
  [key: string]: unknown;
  [key: number]: unknown;
}

export type TaskStatus = 'pending' | 'in-progress' | 'delayed' | 'completed' | 'cancelled';
export type TaskPriority = 'none' | 'high' | 'medium' | 'low';
export type TaskType = 'standalone' | 'block';
const TASK_COMPLETED_AT_ATTR = 'custom-task-completed-at';

export function buildTaskStatusAttrs(status: TaskStatus, completedAt?: string): Record<string, string> {
  if (status === 'completed') {
    const normalizedCompletedAt = typeof completedAt === 'string' && completedAt.trim().length > 0
      ? completedAt.trim()
      : new Date().toISOString();
    return {
      'custom-task-status': status,
      [TASK_COMPLETED_AT_ATTR]: normalizedCompletedAt
    };
  }

  return {
    'custom-task-status': status,
    [TASK_COMPLETED_AT_ATTR]: ''
  };
}

function taskStatusToTaskMarker(status: TaskStatus | undefined): " " | "x" {
  return status === 'completed' ? 'x' : ' ';
}

async function syncTaskListItemMarkerByStatus(
  blockId: BlockId,
  status: TaskStatus | undefined
): Promise<void> {
  const marker = taskStatusToTaskMarker(status);
  await updateTaskListItemMarker(blockId, marker);
}

export interface Task {
  id: string;
  type: TaskType;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  pinned?: boolean;
  dueDate?: string;
  startDate?: string;
  dueTime?: string;
  startTime?: string;
  tags: string[];
  groupId?: string;
  description?: string;
  reminderType?: TaskReminderType;
  reminderCustomTime?: string;
  subtasks?: SubTask[];
  blockId?: string;
  blockSort?: string;
  documentOrder?: number;
  rootId?: string;
  hPath?: string;
  notebookId?: string;
  icon?: string;
  backgroundColor?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  archived?: boolean;
  archivedAt?: string;
  archiveReason?: 'manual' | 'auto';
  repeatSeriesId?: string;
  repeatFrequency?: RepeatFrequency;
  repeatInstanceDate?: string;
  isVirtual?: boolean;
}

export interface TaskGroup {
  id: string;
  name: string;
  color?: string;
  hidden?: boolean;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface TaskGroupStorage {
  version: number;
  groups: TaskGroup[];
  updatedAt: string;
}

const TASK_GROUPS_STORAGE_KEY = 'Pinch-task-groups.json';
const TASK_GROUPS_STORAGE_VERSION = 1;

function normalizeTaskGroups(input: unknown): TaskGroup[] {
  if (!Array.isArray(input)) return [];
  const normalized: TaskGroup[] = [];

  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const group = raw as Record<string, unknown>;
    const id = typeof group.id === 'string' ? group.id.trim() : '';
    const name = typeof group.name === 'string' ? group.name.trim() : '';
    if (!id || !name) continue;

    const color = typeof group.color === 'string' ? group.color : undefined;
    const hidden = group.hidden === true;
    const order = typeof group.order === 'number' && Number.isFinite(group.order) ? group.order : undefined;
    const createdAt = typeof group.createdAt === 'string' ? group.createdAt : undefined;
    const updatedAt = typeof group.updatedAt === 'string' ? group.updatedAt : undefined;

    normalized.push({
      id,
      name,
      color,
      hidden,
      order,
      createdAt,
      updatedAt
    });
  }

  return normalized;
}

export async function loadTaskGroups(): Promise<TaskGroup[]> {
  const plugin = usePlugin();
  if (!plugin) {
    console.error('[TaskGroups] loadTaskGroups: plugin 未初始化');
    return [];
  }

  try {
    const raw = await plugin.loadData(TASK_GROUPS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) {
      return normalizeTaskGroups(parsed);
    }

    const storage = parsed as Partial<TaskGroupStorage> | null;
    if (storage && Array.isArray(storage.groups)) {
      return normalizeTaskGroups(storage.groups);
    }
  } catch (error) {
    console.error('[TaskGroups] loadTaskGroups: 读取失败', error);
  }

  return [];
}

export async function saveTaskGroups(groups: TaskGroup[]): Promise<void> {
  const plugin = usePlugin();
  if (!plugin) {
    console.error('[TaskGroups] saveTaskGroups: plugin 未初始化');
    return;
  }

  const normalizedGroups = normalizeTaskGroups(groups);
  const payload: TaskGroupStorage = {
    version: TASK_GROUPS_STORAGE_VERSION,
    groups: normalizedGroups,
    updatedAt: new Date().toISOString()
  };

  try {
    await plugin.saveData(TASK_GROUPS_STORAGE_KEY, payload);
  } catch (error) {
    console.error('[TaskGroups] saveTaskGroups: 写入失败', error);
  }
}

export interface TaskQueryScope {
  notebookId?: string;
  documentId?: string;
  includeCompleted?: boolean;
  includeArchived?: boolean;
  archivedOnly?: boolean;
}

type TaskFetchDetailLevel = 'full' | 'light';

type RootTaskMetadataCacheEntry = {
  updatedAt: string;
  icon?: string;
  documentOrderByBlockId: Map<string, number>;
};

export interface TaskRepeatWindow {
  startDate: string;
  endDate: string;
}

export const DEFAULT_TASK_REPEAT_MATERIALIZE_OPTIONS = Object.freeze({
  pastDays: 60,
  futureDays: 120
}) as Readonly<Required<Pick<RepeatMaterializeOptions, 'pastDays' | 'futureDays'>>>;

export function resolveTaskRepeatMaterializeOptions(
  repeatWindow?: TaskRepeatWindow | null
): RepeatMaterializeOptions {
  if (repeatWindow?.startDate && repeatWindow?.endDate) {
    return {
      startDate: repeatWindow.startDate,
      endDate: repeatWindow.endDate
    };
  }

  return {
    pastDays: DEFAULT_TASK_REPEAT_MATERIALIZE_OPTIONS.pastDays,
    futureDays: DEFAULT_TASK_REPEAT_MATERIALIZE_OPTIONS.futureDays
  };
}

export interface TaskFetchOptions {
  useLiveDom?: boolean;
  detailLevel?: TaskFetchDetailLevel;
  materializeRepeats?: boolean;
  repeatWindow?: TaskRepeatWindow;
}

function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export class TaskRepository {
  private static memoryCache: {
    tasks: Task[] | null;
    timestamp: number;
    detailLevel: TaskFetchDetailLevel;
  } = { tasks: null, timestamp: 0, detailLevel: 'full' };
  private static blockTasksFetchPromise: {
    promise: Promise<Task[]>;
    detailLevel: TaskFetchDetailLevel;
  } | null = null;
  private static scopedMemoryCache = new Map<string, {
    tasks: Task[];
    timestamp: number;
    detailLevel: TaskFetchDetailLevel;
  }>();
  private static scopedBlockTasksFetchPromises = new Map<string, {
    promise: Promise<Task[]>;
    detailLevel: TaskFetchDetailLevel;
  }>();
  private static rootTaskMetadataCache = new Map<string, RootTaskMetadataCacheEntry>();
  private static excludedNotebookIds = new Set<string>();
  private static inferredDatePersistingBlockIds = new Set<string>();
  private static autoRecognizeTaskDateEnabled: boolean | null = null;
  private static readonly TASK_DATE_INFER_SESSION_STARTED_AT = Date.now();
  private static readonly TASK_DATE_INFER_SESSION_SKEW_MS = 5000;
  
  private static readonly MEMORY_CACHE_DURATION = 5000; // 5 秒内存缓存
  private static readonly SCOPED_MEMORY_CACHE_DURATION = 60000; // 60 秒筛选范围缓存
  private static readonly SCOPED_CACHE_MAX_ENTRIES = 30;
  private static readonly ROOT_TASK_METADATA_CACHE_MAX_ENTRIES = 500;
  private static readonly TASK_CONTAINER_ATTR = 'custom-task-container';
  private static readonly SETTINGS_LOCAL_STORAGE_KEY = 'siyuan-stand-settings';

  private static resolveAutoRecognizeTaskDateEnabled(): boolean {
    let enabledFromStorage: boolean | null = null;
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(this.SETTINGS_LOCAL_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const taskManager = parsed && typeof parsed === 'object'
            ? (parsed as { taskManager?: unknown }).taskManager
            : null;
          if (taskManager && typeof taskManager === 'object') {
            const autoRecognizeTaskDate = (taskManager as { autoRecognizeTaskDate?: unknown }).autoRecognizeTaskDate;
            if (typeof autoRecognizeTaskDate === 'boolean') {
              enabledFromStorage = autoRecognizeTaskDate;
            }
          }
        }
      }
    } catch {
      enabledFromStorage = null;
    }

    if (enabledFromStorage !== null) {
      this.autoRecognizeTaskDateEnabled = enabledFromStorage;
      return enabledFromStorage;
    }

    if (typeof this.autoRecognizeTaskDateEnabled === 'boolean') {
      return this.autoRecognizeTaskDateEnabled;
    }

    this.autoRecognizeTaskDateEnabled = false;
    return false;
  }

  static isAutoRecognizeTaskDateEnabled(): boolean {
    return this.resolveAutoRecognizeTaskDateEnabled();
  }

  static setAutoRecognizeTaskDateEnabled(enabled: boolean): void {
    this.autoRecognizeTaskDateEnabled = enabled === true;
  }

  private static getExcludedNotebookIdsSorted(): string[] {
    return Array.from(this.excludedNotebookIds).sort();
  }

  private static buildNotebookScopeSql(alias: string | null = 'b'): string {
    const excludedNotebookIds = this.getExcludedNotebookIdsSorted();
    if (excludedNotebookIds.length === 0) {
      return '';
    }

    const escapedIds = excludedNotebookIds.map(id => `'${this.escapeSqlLiteral(id)}'`).join(',');
    const target = alias ? `${alias}.box` : 'box';
    return ` AND ${target} NOT IN (${escapedIds})`;
  }

  private static normalizeTaskQueryScope(scope?: TaskQueryScope): TaskQueryScope | null {
    if (!scope) return null;
    const notebookId = typeof scope.notebookId === 'string' && scope.notebookId.trim().length > 0
      ? scope.notebookId.trim()
      : undefined;
    const documentId = typeof scope.documentId === 'string' && scope.documentId.trim().length > 0
      ? scope.documentId.trim()
      : undefined;
    const includeCompleted = scope.includeCompleted !== false;
    const archivedOnly = scope.archivedOnly === true;
    const includeArchived = archivedOnly || scope.includeArchived === true;
    if (!notebookId && !documentId && includeCompleted && !includeArchived && !archivedOnly) {
      return null;
    }
    return { notebookId, documentId, includeCompleted, includeArchived, archivedOnly };
  }

  private static buildTaskQueryScopeSql(scope: TaskQueryScope | null, alias: string | null = 'b'): string {
    if (!scope) {
      return '';
    }

    const prefix = alias ? `${alias}.` : '';
    const clauses: string[] = [];
    if (scope.notebookId) {
      clauses.push(`${prefix}box = '${this.escapeSqlLiteral(scope.notebookId)}'`);
    }
    if (scope.documentId) {
      clauses.push(`${prefix}root_id = '${this.escapeSqlLiteral(scope.documentId)}'`);
    }

    if (clauses.length === 0) {
      return '';
    }
    return ` AND ${clauses.join(' AND ')}`;
  }

  private static buildTaskCompletionSql(includeCompleted: boolean | undefined, alias: string | null = 'b'): string {
    const target = alias ? `${alias}.markdown` : 'markdown';
    if (includeCompleted === false) {
      return ` AND ${target} LIKE '%[ ]%'`;
    }
    return ` AND (${target} LIKE '%[ ]%' OR ${target} LIKE '%[x]%' OR ${target} LIKE '%[X]%')`;
  }

  private static buildTaskArchiveSql(scope: TaskQueryScope | null, alias: string | null = 'b'): string {
    const target = alias ? `${alias}.id` : 'id';
    const archivedValueSql = "('1', 'true', 'TRUE', 'yes', 'YES')";
    if (scope?.archivedOnly) {
      return ` AND EXISTS (
        SELECT 1
        FROM attributes archived_attr
        WHERE archived_attr.block_id = ${target}
          AND archived_attr.name = 'custom-task-archived'
          AND archived_attr.value IN ${archivedValueSql}
      )`;
    }
    if (scope?.includeArchived === true) {
      return '';
    }
    return ` AND NOT EXISTS (
      SELECT 1
      FROM attributes archived_attr
      WHERE archived_attr.block_id = ${target}
        AND archived_attr.name = 'custom-task-archived'
        AND archived_attr.value IN ${archivedValueSql}
    )`;
  }

  private static resolveTaskFetchDetailLevel(options: TaskFetchOptions = {}): TaskFetchDetailLevel {
    return options.detailLevel === 'light' ? 'light' : 'full';
  }

  private static isTaskFetchDetailLevelSatisfied(
    available: TaskFetchDetailLevel,
    requested: TaskFetchDetailLevel
  ): boolean {
    return available === 'full' || available === requested;
  }

  private static buildScopeCacheKey(
    scope: TaskQueryScope | null,
    useLiveDom: boolean = true,
    detailLevel: TaskFetchDetailLevel = 'full'
  ): string {
    const notebookKey = scope?.notebookId || '*';
    const documentKey = scope?.documentId || '*';
    const includeCompletedKey = scope?.includeCompleted === false ? 'open-only' : 'all-status';
    const archiveKey = scope?.archivedOnly
      ? 'archived-only'
      : (scope?.includeArchived === true ? 'include-archived' : 'active-only');
    const excludedKey = this.getExcludedNotebookIdsSorted().join(',');
    const domKey = useLiveDom ? 'live-dom' : 'api-dom-only';
    return `${notebookKey}|${documentKey}|${includeCompletedKey}|${archiveKey}|${excludedKey}|${domKey}|${detailLevel}`;
  }

  private static setScopedMemoryCache(
    key: string,
    tasks: Task[],
    detailLevel: TaskFetchDetailLevel
  ): void {
    if (this.scopedMemoryCache.has(key)) {
      this.scopedMemoryCache.delete(key);
    }
    this.scopedMemoryCache.set(key, {
      tasks,
      timestamp: Date.now(),
      detailLevel
    });

    while (this.scopedMemoryCache.size > this.SCOPED_CACHE_MAX_ENTRIES) {
      const oldestKey = this.scopedMemoryCache.keys().next().value;
      if (!oldestKey) break;
      this.scopedMemoryCache.delete(oldestKey);
    }
  }

  static setExcludedNotebookIds(notebookIds: string[] = []): void {
    const normalized = normalizeNotebookIds(notebookIds, { sort: true });
    const current = this.getExcludedNotebookIdsSorted();
    if (normalized.length === current.length && normalized.every((id, index) => id === current[index])) {
      return;
    }

    this.excludedNotebookIds = new Set(normalized);
    this.memoryCache = { tasks: null, timestamp: 0, detailLevel: 'full' };
    this.scopedMemoryCache.clear();
    this.scopedBlockTasksFetchPromises.clear();
  }

  static getExcludedNotebookIds(): string[] {
    return this.getExcludedNotebookIdsSorted();
  }

  static isNotebookExcluded(notebookId?: string): boolean {
    if (!notebookId) return false;
    return this.excludedNotebookIds.has(notebookId);
  }

  static async filterIncludedBlockIds(blockIds: string[]): Promise<string[]> {
    const normalizedBlockIds = Array.from(
      new Set(blockIds.filter((id): id is string => typeof id === 'string' && id.length > 0))
    );
    if (normalizedBlockIds.length === 0 || this.excludedNotebookIds.size === 0) {
      return normalizedBlockIds;
    }

    try {
      const idsClause = normalizedBlockIds.map(id => `'${this.escapeSqlLiteral(id)}'`).join(',');
      const rows = await sql(`
        SELECT id, box
        FROM blocks
        WHERE id IN (${idsClause})
      `) as Array<{ id?: string; box?: string }>;

      const notebookByBlockId = new Map<string, string>();
      rows?.forEach((row) => {
        if (typeof row?.id === 'string' && typeof row?.box === 'string') {
          notebookByBlockId.set(row.id, row.box);
        }
      });

      return normalizedBlockIds.filter((blockId) => {
        const notebookId = notebookByBlockId.get(blockId);
        if (!notebookId) return true;
        return !this.excludedNotebookIds.has(notebookId);
      });
    } catch (error) {
      handleError('过滤排除笔记本 blockId 失败', error, { blockIds: normalizedBlockIds });
      return normalizedBlockIds;
    }
  }

  static async isBlockInExcludedNotebook(blockId: string): Promise<boolean> {
    if (typeof blockId !== 'string' || blockId.length === 0 || this.excludedNotebookIds.size === 0) {
      return false;
    }

    try {
      const escapedId = this.escapeSqlLiteral(blockId);
      const rows = await sql(`
        SELECT box
        FROM blocks
        WHERE id = '${escapedId}'
        LIMIT 1
      `) as Array<{ box?: string }>;
      const notebookId = rows?.[0]?.box;
      return typeof notebookId === 'string' && this.excludedNotebookIds.has(notebookId);
    } catch (error) {
      handleError('检查 blockId 是否属于排除笔记本失败', error, { blockId });
      return false;
    }
  }

  private static parseBlockDateTime(value: string | number | undefined): string {
    try {
      if (value === null || value === undefined || value === '') return '';
      const raw = String(value);
      if (/^\d{14}$/.test(raw)) {
        const year = Number(raw.slice(0, 4));
        const month = Number(raw.slice(4, 6)) - 1;
        const day = Number(raw.slice(6, 8));
        const hour = Number(raw.slice(8, 10));
        const minute = Number(raw.slice(10, 12));
        const second = Number(raw.slice(12, 14));
        return new Date(year, month, day, hour, minute, second).toISOString();
      }
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) return '';
      return date.toISOString();
    } catch {
      return '';
    }
  }

  private static resolveTaskCompletedAt(
    attrs: Record<string, string>,
    status: TaskStatus,
    fallbackRaw?: string | number
  ): string | undefined {
    const completedAtRaw = (attrs[TASK_COMPLETED_AT_ATTR] || '')
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0)
      .pop() || '';
    const completedAt = this.parseBlockDateTime(completedAtRaw);
    if (completedAt) {
      return completedAt;
    }
    if (status !== 'completed') {
      return undefined;
    }
    const fallback = this.parseBlockDateTime(fallbackRaw);
    return fallback || undefined;
  }

  private static formatDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private static buildValidDateString(year: number, month: number, day: number): string | null {
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
      return null;
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }
    const candidate = new Date(year, month - 1, day);
    if (
      candidate.getFullYear() !== year
      || candidate.getMonth() !== month - 1
      || candidate.getDate() !== day
    ) {
      return null;
    }
    return this.formatDateString(candidate);
  }

  private static extractDateFromTaskTitle(title: string, now: Date = new Date()): string | null {
    const normalizedTitle = (title || '')
      .trim()
      .replace(/\s+/g, '')
      .replace(/[０-９]/g, char => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
      .replace(/／/g, '/')
      .replace(/[－—–]/g, '-')
      .replace(/．/g, '.');
    if (!normalizedTitle) {
      return null;
    }

    const buildRelativeDate = (days: number): string => {
      const date = new Date(now);
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() + days);
      return this.formatDateString(date);
    };

    if (normalizedTitle.includes('大后天')) return buildRelativeDate(3);
    if (normalizedTitle.includes('后天') || normalizedTitle.toLowerCase().includes('day after tomorrow')) return buildRelativeDate(2);
    if (normalizedTitle.includes('明天') || normalizedTitle.toLowerCase().includes('tomorrow')) return buildRelativeDate(1);
    if (normalizedTitle.includes('今天') || normalizedTitle.toLowerCase().includes('today')) return buildRelativeDate(0);
    if (normalizedTitle.includes('昨天') || normalizedTitle.toLowerCase().includes('yesterday')) return buildRelativeDate(-1);

    const weekdayMatch = normalizedTitle.match(
      /(?:^|[^\d])(下下|下|本|这)?(?:周|星期|礼拜)(末|天|日|[1-7]|一|二|三|四|五|六)(?![一二三四五六日天末\d])/
    );
    if (weekdayMatch) {
      const prefix = weekdayMatch[1] || '';
      const weekdayToken = weekdayMatch[2];
      const weekdayMap: Record<string, number> = {
        '1': 1,
        '2': 2,
        '3': 3,
        '4': 4,
        '5': 5,
        '6': 6,
        '7': 0,
        '一': 1,
        '二': 2,
        '三': 3,
        '四': 4,
        '五': 5,
        '六': 6,
        '日': 0,
        '天': 0,
        '末': 6
      };
      const targetWeekday = weekdayMap[weekdayToken];
      if (typeof targetWeekday === 'number') {
        const currentWeekday = now.getDay();
        let daysUntil = (targetWeekday - currentWeekday + 7) % 7;
        if (daysUntil === 0) {
          daysUntil = 7;
        }
        if (prefix === '下') {
          daysUntil += 7;
        } else if (prefix === '下下') {
          daysUntil += 14;
        }
        return buildRelativeDate(daysUntil);
      }
    }

    const fullDateMatch = normalizedTitle.match(
      /(?:^|[^\d])((?:19|20)\d{2})[年\-/.](1[0-2]|0?[1-9])[月\-/.](3[01]|[12]\d|0?[1-9])(?:日|号)?(?!\d)/
    );
    if (fullDateMatch) {
      const year = Number(fullDateMatch[1]);
      const month = Number(fullDateMatch[2]);
      const day = Number(fullDateMatch[3]);
      const parsed = this.buildValidDateString(year, month, day);
      if (parsed) return parsed;
    }

    const monthDayChineseMatch = normalizedTitle.match(
      /(?:^|[^\d])(1[0-2]|0?[1-9])月(3[01]|[12]\d|0?[1-9])(?:日|号)(?!\d)/
    );
    if (monthDayChineseMatch) {
      const year = now.getFullYear();
      const month = Number(monthDayChineseMatch[1]);
      const day = Number(monthDayChineseMatch[2]);
      const parsed = this.buildValidDateString(year, month, day);
      if (parsed) return parsed;
    }

    const monthDaySlashMatch = normalizedTitle.match(
      /(?:^|[^\d])(1[0-2]|0?[1-9])[\/.-](3[01]|[12]\d|0?[1-9])(?!\d)/
    );
    if (monthDaySlashMatch) {
      const year = now.getFullYear();
      const month = Number(monthDaySlashMatch[1]);
      const day = Number(monthDaySlashMatch[2]);
      const parsed = this.buildValidDateString(year, month, day);
      if (parsed) return parsed;
    }

    return null;
  }

  private static extractDateFromTaskText(title: string): string | null {
    if (!title) return null;
    const plainTitle = title
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&#(\d+);/g, (_, code) => {
        const parsed = Number(code);
        return Number.isNaN(parsed) ? '' : String.fromCharCode(parsed);
      })
      .trim();
    return this.extractDateFromTaskTitle(plainTitle);
  }

  static inferTaskDateFromText(title: string): string | null {
    return this.extractDateFromTaskText(title);
  }

  static async recognizeDatesForUndatedTasks(): Promise<{
    scanned: number;
    recognized: number;
    updated: number;
    failed: number;
  }> {
    const tasks = await this.getBlockTasks(false, undefined, { useLiveDom: false });
    const undatedTasks = tasks.filter((task) => {
      if (task.type !== 'block' || !task.blockId) {
        return false;
      }
      const startDate = typeof task.startDate === 'string' ? task.startDate.trim() : '';
      const dueDate = typeof task.dueDate === 'string' ? task.dueDate.trim() : '';
      return !startDate && !dueDate;
    });

    if (undatedTasks.length === 0) {
      return { scanned: 0, recognized: 0, updated: 0, failed: 0 };
    }

    let recognized = 0;
    let updated = 0;
    let failed = 0;
    let cursor = 0;
    const workerCount = Math.min(8, undatedTasks.length);

    const worker = async (): Promise<void> => {
      while (cursor < undatedTasks.length) {
        const currentIndex = cursor;
        cursor += 1;
        const currentTask = undatedTasks[currentIndex];
        if (!currentTask?.blockId) {
          continue;
        }

        const inferredDate = this.inferTaskDateFromText(currentTask.title || '');
        if (!inferredDate) {
          continue;
        }

        recognized += 1;
        try {
          await setBlockAttrs(currentTask.blockId, {
            'custom-task-start-date': inferredDate,
            'custom-task-due-date': inferredDate
          });
          updated += 1;
        } catch (error) {
          failed += 1;
          handleError('全局识别任务日期并写入失败', error, {
            blockId: currentTask.blockId,
            taskId: currentTask.id
          });
        }
      }
    };

    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    if (updated > 0) {
      await this.clearCache();
    }

    return {
      scanned: undatedTasks.length,
      recognized,
      updated,
      failed
    };
  }

  private static resolveTaskDateRange(
    attrs: Record<string, string>,
    title: string,
    options: {
      allowInferFromTitle?: boolean;
      createdAtRaw?: string | number;
    } = {}
  ): { startDate?: string; dueDate?: string; inferredFromTitle: boolean } {
    const startDate = (attrs['custom-task-start-date'] || '').trim();
    const dueDate = (attrs['custom-task-due-date'] || '').trim();
    if (startDate || dueDate) {
      return {
        startDate: startDate || undefined,
        dueDate: dueDate || undefined,
        inferredFromTitle: false
      };
    }

    const shouldInferFromTitle = options.allowInferFromTitle === true
      && this.isAutoRecognizeTaskDateEnabled()
      && this.isNewlyCreatedTaskBlock(options.createdAtRaw);
    if (!shouldInferFromTitle) {
      return { inferredFromTitle: false };
    }

    const inferredDate = this.extractDateFromTaskText(title);
    if (!inferredDate) {
      return { inferredFromTitle: false };
    }

    return {
      startDate: inferredDate,
      dueDate: inferredDate,
      inferredFromTitle: true
    };
  }

  private static isNewlyCreatedTaskBlock(createdAtRaw?: string | number): boolean {
    if (createdAtRaw === null || createdAtRaw === undefined || createdAtRaw === '') {
      return false;
    }
    const createdAtIso = this.parseBlockDateTime(createdAtRaw);
    if (!createdAtIso) {
      return false;
    }
    const createdAtTs = new Date(createdAtIso).getTime();
    if (Number.isNaN(createdAtTs)) {
      return false;
    }
    return createdAtTs >= (this.TASK_DATE_INFER_SESSION_STARTED_AT - this.TASK_DATE_INFER_SESSION_SKEW_MS);
  }

  private static queuePersistInferredTaskDate(
    blockId: string,
    dateRange: { startDate?: string; dueDate?: string; inferredFromTitle: boolean }
  ): void {
    if (!dateRange.inferredFromTitle) return;
    const normalizedBlockId = typeof blockId === 'string' ? blockId.trim() : '';
    if (!normalizedBlockId) return;

    const attrsToPersist: Record<string, string> = {};
    if (dateRange.startDate) {
      attrsToPersist['custom-task-start-date'] = dateRange.startDate;
    }
    if (dateRange.dueDate) {
      attrsToPersist['custom-task-due-date'] = dateRange.dueDate;
    }
    if (Object.keys(attrsToPersist).length === 0) return;
    if (this.inferredDatePersistingBlockIds.has(normalizedBlockId)) return;

    this.inferredDatePersistingBlockIds.add(normalizedBlockId);
    void setBlockAttrs(normalizedBlockId, attrsToPersist)
      .catch((error) => {
        handleError('回写推断任务日期失败', error, { blockId: normalizedBlockId, attrs: attrsToPersist });
      })
      .finally(() => {
        this.inferredDatePersistingBlockIds.delete(normalizedBlockId);
      });
  }

  private static parseTaskStatus(
    attrs: Record<string, string>,
    markdown: string,
    completedByDOM: boolean | null
  ): TaskStatus {
    const validStatuses: TaskStatus[] = ['pending', 'in-progress', 'delayed', 'completed', 'cancelled'];
    const attrStatus = attrs['custom-task-status'] as TaskStatus | undefined;
    const hasValidAttrStatus = !!(attrStatus && validStatuses.includes(attrStatus));
    const markdownMatch = markdown?.match(/\[(x|X| )\]/);
    const markdownCompleted = markdownMatch ? (markdownMatch[1] === 'x' || markdownMatch[1] === 'X') : null;

    // Completed signals from DOM/Markdown are authoritative.
    if (completedByDOM === true || markdownCompleted === true) {
      return 'completed';
    }

    if (completedByDOM === false || markdownCompleted === false) {
      if (hasValidAttrStatus && attrStatus !== 'completed') {
        return attrStatus!;
      }
      return 'pending';
    }

    if (hasValidAttrStatus) {
      return attrStatus!;
    }

    return 'pending';
  }

  private static parseTaskBooleanFlag(value: string | undefined): boolean {
    if (typeof value !== 'string' || value.length === 0) {
      return false;
    }
    const tokens = value
      .split(',')
      .map(item => item.trim().toLowerCase())
      .filter(item => item.length > 0);
    if (tokens.length === 0) {
      return false;
    }
    return tokens.some(token => token === '1' || token === 'true' || token === 'yes');
  }

  private static parseTaskPinnedFlag(value: string | undefined): boolean {
    return this.parseTaskBooleanFlag(value);
  }

  private static parseTaskArchivedFlag(value: string | undefined): boolean {
    return this.parseTaskBooleanFlag(value);
  }

  private static normalizeTaskBlockSort(value: unknown): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  private static async buildDocumentIconMap(
    rootIds: string[],
    preloadedDomMap?: Map<string, BlockDOMResponse>
  ): Promise<Map<string, string>> {
    return (await this.resolveRootTaskMetadata(rootIds, preloadedDomMap)).rootIcons;
  }

  private static async buildTaskDocumentOrderByRoots(
    rootIds: string[],
    preloadedDomMap?: Map<string, BlockDOMResponse>
  ): Promise<Map<string, number>> {
    return (await this.resolveRootTaskMetadata(rootIds, preloadedDomMap)).documentOrderByBlockId;
  }

  private static setRootTaskMetadataCacheEntry(rootId: string, entry: RootTaskMetadataCacheEntry): void {
    if (!rootId) {
      return;
    }
    if (this.rootTaskMetadataCache.has(rootId)) {
      this.rootTaskMetadataCache.delete(rootId);
    }
    this.rootTaskMetadataCache.set(rootId, entry);

    while (this.rootTaskMetadataCache.size > this.ROOT_TASK_METADATA_CACHE_MAX_ENTRIES) {
      const oldestKey = this.rootTaskMetadataCache.keys().next().value;
      if (!oldestKey) {
        break;
      }
      this.rootTaskMetadataCache.delete(oldestKey);
    }
  }

  private static buildTaskDocumentOrderFromDom(
    dom: string,
    parser: DOMParser
  ): Map<string, number> {
    const orderMap = new Map<string, number>();
    if (typeof dom !== 'string' || dom.trim().length === 0) {
      return orderMap;
    }

    const doc = parser.parseFromString(dom, 'text/html');
    let order = 0;
    const taskItems = doc.querySelectorAll('[data-type="NodeListItem"][data-subtype="t"][data-node-id]');
    taskItems.forEach((item) => {
      const blockId = item.getAttribute('data-node-id');
      if (!blockId || orderMap.has(blockId)) {
        return;
      }
      const hasTaskAction = item.querySelector('.protyle-action--task');
      if (!hasTaskAction) {
        return;
      }
      orderMap.set(blockId, order);
      order += 1;
    });

    return orderMap;
  }

  private static async loadRootBlockRows(rootIds: string[]): Promise<Map<string, Record<string, unknown>>> {
    const rootRowsById = new Map<string, Record<string, unknown>>();
    const uniqueRootIds = Array.from(new Set(rootIds.filter(id => typeof id === 'string' && id.length > 0)));
    if (uniqueRootIds.length === 0) {
      return rootRowsById;
    }

    try {
      const rootIdSql = uniqueRootIds
        .map(id => `'${this.escapeSqlLiteral(id)}'`)
        .join(',');
      const rootRows = await sql(`
        SELECT *
        FROM blocks
        WHERE id IN (${rootIdSql})
      `) as Array<Record<string, unknown>>;
      for (const row of rootRows) {
        const rootId = typeof row?.id === 'string' ? row.id : '';
        if (rootId) {
          rootRowsById.set(rootId, row);
        }
      }
    } catch (error) {
      console.warn('[TaskRepository] 读取文档块元数据失败', error);
    }

    return rootRowsById;
  }

  private static async resolveRootTaskMetadata(
    rootIds: string[],
    preloadedDomMap?: Map<string, BlockDOMResponse>
  ): Promise<{
    documentOrderByBlockId: Map<string, number>;
    rootIcons: Map<string, string>;
  }> {
    const documentOrderByBlockId = new Map<string, number>();
    const rootIcons = new Map<string, string>();
    const uniqueRootIds = Array.from(new Set(rootIds.filter(id => typeof id === 'string' && id.length > 0)));
    if (uniqueRootIds.length === 0) {
      return { documentOrderByBlockId, rootIcons };
    }

    const rootRowsById = await this.loadRootBlockRows(uniqueRootIds);
    const staleRootIds: string[] = [];

    for (const rootId of uniqueRootIds) {
      const rootRow = rootRowsById.get(rootId);
      const updatedAt = typeof rootRow?.updated === 'string' ? rootRow.updated : '';
      const cachedEntry = this.rootTaskMetadataCache.get(rootId);
      if (cachedEntry && cachedEntry.updatedAt === updatedAt) {
        if (cachedEntry.icon) {
          rootIcons.set(rootId, cachedEntry.icon);
        }
        cachedEntry.documentOrderByBlockId.forEach((order, blockId) => {
          documentOrderByBlockId.set(blockId, order);
        });
        this.setRootTaskMetadataCacheEntry(rootId, cachedEntry);
        continue;
      }
      if (cachedEntry) {
        this.rootTaskMetadataCache.delete(rootId);
      }
      staleRootIds.push(rootId);
    }

    if (staleRootIds.length === 0) {
      return { documentOrderByBlockId, rootIcons };
    }

    try {
      const rootAttrsMap = await batchGetBlockAttrs(staleRootIds);
      rootAttrsMap.forEach((attrs, rootId) => {
        const icon = normalizeDocumentIconValue(attrs?.icon);
        if (icon) {
          rootIcons.set(rootId, icon);
        }
      });
    } catch (error) {
      console.warn('[TaskRepository] 读取文档属性图标失败，将尝试块属性或 DOM 图标', error);
    }

    for (const rootId of staleRootIds) {
      if (rootIcons.has(rootId)) {
        continue;
      }
      const iconFromRoot = extractDocumentIconFromBlockRow(rootRowsById.get(rootId) || {});
      if (iconFromRoot) {
        rootIcons.set(rootId, iconFromRoot);
      }
    }

    let fetchedDomMap = preloadedDomMap;
    if (!fetchedDomMap) {
      try {
        fetchedDomMap = await batchGetBlockDOM(staleRootIds);
      } catch (error) {
        console.warn('[TaskRepository] 读取文档 DOM 失败，回退至默认排序', error);
        fetchedDomMap = new Map<string, BlockDOMResponse>();
      }
    }
    const domMap = fetchedDomMap || new Map<string, BlockDOMResponse>();

    const parser = new DOMParser();
    for (const rootId of staleRootIds) {
      const rootRow = rootRowsById.get(rootId);
      const updatedAt = typeof rootRow?.updated === 'string' ? rootRow.updated : '';
      const dom = domMap.get(rootId)?.dom;
      if (rootIcons.has(rootId) === false) {
        const iconFromDom = extractDocumentIconFromDom(dom);
        if (iconFromDom) {
          rootIcons.set(rootId, iconFromDom);
        }
      }
      if (!dom) {
        continue;
      }

      const rootOrderMap = this.buildTaskDocumentOrderFromDom(dom, parser);
      rootOrderMap.forEach((order, blockId) => {
        documentOrderByBlockId.set(blockId, order);
      });
      this.setRootTaskMetadataCacheEntry(rootId, {
        updatedAt,
        icon: rootIcons.get(rootId),
        documentOrderByBlockId: rootOrderMap
      });
    }

    return { documentOrderByBlockId, rootIcons };
  }

  private static normalizeTaskArchiveReason(value: string | undefined): 'manual' | 'auto' | undefined {
    if (typeof value !== 'string' || value.length === 0) {
      return undefined;
    }
    const normalized = value
      .split(',')
      .map(item => item.trim().toLowerCase())
      .filter(item => item.length > 0);
    if (normalized.length === 0) {
      return undefined;
    }
    for (let i = normalized.length - 1; i >= 0; i -= 1) {
      const item = normalized[i];
      if (item === 'manual' || item === 'auto') {
        return item;
      }
    }
    return undefined;
  }

  private static getTaskActionElement(root: Element | null, ownerId?: string): Element | null {
    if (!root) return null;

    const matchesOwner = (action: Element): boolean => {
      if (!ownerId) return true;
      const owner = action.closest('[data-node-id]');
      return owner?.getAttribute('data-node-id') === ownerId;
    };

    if (root.classList.contains('protyle-action--task') && matchesOwner(root)) {
      return root;
    }

    const actions = root.querySelectorAll('.protyle-action--task');
    for (const action of actions) {
      if (matchesOwner(action)) {
        return action;
      }
    }

    const fallback = root.closest('.protyle-task')?.querySelector('.protyle-action--task');
    if (fallback && matchesOwner(fallback)) {
      return fallback;
    }

    return null;
  }

  private static parseSubtasksFromParsedDoc(doc: Document, parentBlockId: string): SubTask[] {
    const cleanHtmlStyle = (html: string) => html.replace(/\{:\s*[^}]*\}/g, '');

    const parseSubtaskList = (listElement: Element): SubTask[] => {
      const listItems = Array.from(listElement.children).filter((child): child is Element =>
        child instanceof Element && child.getAttribute('data-type') === 'NodeListItem'
      );

      const result: SubTask[] = [];
      for (const item of listItems) {
        const nodeId = item.getAttribute('data-node-id');
        if (!nodeId || nodeId === parentBlockId) continue;

        const action = item.querySelector('.protyle-action--task');
        if (!action) continue;

        const svg = action.querySelector('use');
        const href = svg?.getAttribute('xlink:href') || svg?.getAttribute('href') || '';
        const completed = href === '#iconCheck';

        const paragraph = item.querySelector('[data-type="NodeParagraph"]');
        const editable = paragraph?.querySelector('[contenteditable="true"]');
        const titleHtml = editable?.innerHTML || paragraph?.innerHTML || '';
        const title = cleanHtmlStyle(titleHtml) || 'Untitled';

        const directList = item.querySelector(':scope > .list');
        const nested = directList ? parseSubtaskList(directList) : [];

        result.push({
          id: `sub_${nodeId}`,
          title,
          completed,
          nodeId,
          subtasks: nested.length > 0 ? nested : undefined
        });
      }

      return result;
    };

    const parentNode =
      doc.querySelector(`[data-node-id="${parentBlockId}"][data-type="NodeListItem"]`) ||
      doc.querySelector(`[data-node-id="${parentBlockId}"]`);
    if (!parentNode) return [];
    const rootList = parentNode.querySelector(':scope > .list') || parentNode.querySelector('.list');
    if (!rootList) return [];
    return parseSubtaskList(rootList);
  }

  private static escapeSqlLiteral(value: string): string {
    return value.replace(/'/g, "''");
  }

  private static async resolveTaskContainerListId(rootId: string): Promise<string | null> {
    const escapedRootId = this.escapeSqlLiteral(rootId);
    try {
      const rows = await sql(`
        SELECT b.id
        FROM blocks b
        LEFT JOIN attributes a ON b.id = a.block_id
        WHERE b.root_id = '${escapedRootId}'
          AND b.parent_id = '${escapedRootId}'
          AND b.type = 'l'
          AND b.subtype = 't'
          AND a.name = '${this.TASK_CONTAINER_ATTR}'
          AND a.value = '1'
        ORDER BY b.created ASC
        LIMIT 1
      `);
      if (rows && rows.length > 0) {
        return rows[0].id as string;
      }
    } catch {
    }

    try {
      const rows = await sql(`
        SELECT l.id
        FROM blocks i
        JOIN blocks l ON i.parent_id = l.id
        WHERE i.root_id = '${escapedRootId}'
          AND i.type IN ('i', 'p')
          AND i.subtype = 't'
          AND l.type = 'l'
          AND l.subtype = 't'
          AND l.parent_id = '${escapedRootId}'
        ORDER BY i.created DESC
        LIMIT 1
      `);
      if (rows && rows.length > 0) {
        return rows[0].id as string;
      }
    } catch {
    }

    return null;
  }

  private static async markTaskContainerList(listId: string, rootId: string): Promise<void> {
    const normalized = typeof listId === 'string' ? listId.trim() : '';
    if (!normalized) return;
    const escapedRootId = this.escapeSqlLiteral(rootId);
    const escapedListId = this.escapeSqlLiteral(normalized);
    try {
      const rows = await sql(`
        SELECT id
        FROM blocks
        WHERE id = '${escapedListId}'
          AND parent_id = '${escapedRootId}'
          AND type = 'l'
          AND subtype = 't'
        LIMIT 1
      `);
      if (!rows || rows.length === 0) {
        return;
      }
    } catch {
      return;
    }
    try {
      await setBlockAttrs(normalized, { [this.TASK_CONTAINER_ATTR]: '1' });
    } catch {
    }
  }

  private static async resolveBlockIdByTaskId(taskId: string): Promise<string | null> {
    const normalizedTaskId = typeof taskId === 'string' ? taskId.trim() : '';
    if (!normalizedTaskId) return null;

    if (normalizedTaskId.startsWith('block_') && normalizedTaskId.length > 6) {
      return normalizedTaskId.slice(6);
    }

    const escapedTaskId = this.escapeSqlLiteral(normalizedTaskId);

    try {
      const attrRows = await sql(`
        SELECT block_id
        FROM attributes
        WHERE name = 'custom-task-id'
          AND value = '${escapedTaskId}'
        LIMIT 1
      `) as Array<{ block_id?: string }>;

      const blockIdByAttr = attrRows?.[0]?.block_id;
      if (typeof blockIdByAttr === 'string' && blockIdByAttr.length > 0) {
        return blockIdByAttr;
      }

      const blockRows = await sql(`
        SELECT id
        FROM blocks
        WHERE id = '${escapedTaskId}'
        LIMIT 1
      `) as Array<{ id?: string }>;

      const blockIdById = blockRows?.[0]?.id;
      if (typeof blockIdById === 'string' && blockIdById.length > 0) {
        return blockIdById;
      }
    } catch (error) {
      handleError('根据 taskId 解析 blockId 失败', error, { taskId: normalizedTaskId });
    }

    return null;
  }

  private static setSubtaskCompletion(subtasks: SubTask[] | undefined, subtaskId: string, completed: boolean): boolean {
    if (!Array.isArray(subtasks) || subtasks.length === 0) return false;

    for (const subtask of subtasks) {
      if (subtask.id === subtaskId) {
        if (subtask.completed !== completed) {
          subtask.completed = completed;
        }
        return true;
      }

      if (this.setSubtaskCompletion(subtask.subtasks, subtaskId, completed)) {
        return true;
      }
    }

    return false;
  }

  static async getAllTasks(
    useCache: boolean = true,
    scope?: TaskQueryScope,
    options: TaskFetchOptions = {}
  ): Promise<Task[]> {
    const blockTasks = await this.getBlockTasks(useCache, scope, options);
    if (options.materializeRepeats === false) {
      return blockTasks;
    }
    return materializeRepeatTasks(blockTasks, resolveTaskRepeatMaterializeOptions(options.repeatWindow));
  }

  private static async getCachedBlockTasks(): Promise<Task[] | null> {
    const now = Date.now();

    if (
      this.memoryCache.tasks &&
      now - this.memoryCache.timestamp < this.MEMORY_CACHE_DURATION
    ) {
      return this.memoryCache.tasks;
    }

    const plugin = usePlugin();
    const cachedData = await plugin.loadData('stand-block-tasks-cache.json');
    if (!cachedData) {
      return null;
    }

    const data = typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
    if (!data?.tasks || !data?.updatedAt) {
      return null;
    }

    const cacheAge = now - new Date(data.updatedAt).getTime();
    if (cacheAge >= TASK_CONFIG.CACHE_DURATION || data.version !== TASK_CONFIG.CACHE_VERSION) {
      return null;
    }

    const cachedExcludedNotebookIds = normalizeNotebookIds(
      Array.isArray(data.excludedNotebookIds) ? data.excludedNotebookIds : [],
      { sort: true }
    );
    const currentExcludedNotebookIds = this.getExcludedNotebookIdsSorted();
    const isScopeMatched =
      cachedExcludedNotebookIds.length === currentExcludedNotebookIds.length &&
      cachedExcludedNotebookIds.every((id, index) => id === currentExcludedNotebookIds[index]);
    if (!isScopeMatched) {
      return null;
    }

    const tasks = data.tasks.map((t: Task) => ({
      ...t,
      icon: unicodeToEmoji(t.icon),
      completedAt: t.completedAt || (t.status === 'completed' ? this.parseBlockDateTime(t.updatedAt) || undefined : undefined)
    }));

    this.memoryCache = { tasks, timestamp: now, detailLevel: 'full' };
    return tasks;
  }

  static async getCachedTasksOnly(options: TaskFetchOptions = {}): Promise<Task[]> {
    const cachedBlockTasks = await this.getCachedBlockTasks();
    if (!cachedBlockTasks) {
      return [];
    }
    if (options.materializeRepeats === false) {
      return cachedBlockTasks;
    }

    return materializeRepeatTasks(cachedBlockTasks, resolveTaskRepeatMaterializeOptions(options.repeatWindow));
  }
  
  static async getBlockTasks(
    useCache: boolean = true,
    scope?: TaskQueryScope,
    options: TaskFetchOptions = {}
  ): Promise<Task[]> {
    const normalizedScope = this.normalizeTaskQueryScope(scope);
    const useLiveDom = options.useLiveDom !== false;
    const detailLevel = this.resolveTaskFetchDetailLevel(options);
    const isScopedQuery = !!normalizedScope;
    const now = Date.now();

    // 1. 内存缓存
    if (!isScopedQuery && useCache && this.memoryCache.tasks &&
      now - this.memoryCache.timestamp < this.MEMORY_CACHE_DURATION &&
      this.isTaskFetchDetailLevelSatisfied(this.memoryCache.detailLevel, detailLevel)) {
      return this.memoryCache.tasks;
    }
    
    // 2. 磁盘缓存
    if (!isScopedQuery && useCache) {
      const cachedTasks = await this.getCachedBlockTasks();
      if (cachedTasks && this.isTaskFetchDetailLevelSatisfied(this.memoryCache.detailLevel, detailLevel)) {
        return cachedTasks;
      }
    }

    if (isScopedQuery) {
      const scopedCacheKey = this.buildScopeCacheKey(normalizedScope, useLiveDom, detailLevel);
      if (useCache) {
        const scopedCached = this.scopedMemoryCache.get(scopedCacheKey);
        if (
          scopedCached &&
          now - scopedCached.timestamp < this.SCOPED_MEMORY_CACHE_DURATION &&
          this.isTaskFetchDetailLevelSatisfied(scopedCached.detailLevel, detailLevel)
        ) {
          return scopedCached.tasks;
        }
      }

      const scopedInFlight = this.scopedBlockTasksFetchPromises.get(scopedCacheKey);
      if (scopedInFlight && this.isTaskFetchDetailLevelSatisfied(scopedInFlight.detailLevel, detailLevel)) {
        return scopedInFlight.promise;
      }

      const scopedFetchPromise = (async () => {
        const tasks = await this.fetchBlockTasks(normalizedScope, useLiveDom, detailLevel);
        if (useCache) {
          this.setScopedMemoryCache(scopedCacheKey, tasks, detailLevel);
        }
        return tasks;
      })();
      this.scopedBlockTasksFetchPromises.set(scopedCacheKey, {
        promise: scopedFetchPromise,
        detailLevel
      });

      try {
        return await scopedFetchPromise;
      } finally {
        this.scopedBlockTasksFetchPromises.delete(scopedCacheKey);
      }
    }

    // 3. 全量查询并回写缓存（in-flight 去重，避免并发全量扫描）
    if (
      this.blockTasksFetchPromise &&
      this.isTaskFetchDetailLevelSatisfied(this.blockTasksFetchPromise.detailLevel, detailLevel)
    ) {
      return this.blockTasksFetchPromise.promise;
    }

    const globalFetchPromise = (async () => {
      const tasks = await this.fetchBlockTasks(null, useLiveDom, detailLevel);
      if (detailLevel === 'full') {
        await this.saveBlockTasksCache(tasks);
      } else {
        this.memoryCache = { tasks, timestamp: Date.now(), detailLevel };
      }
      return tasks;
    })();
    this.blockTasksFetchPromise = {
      promise: globalFetchPromise,
      detailLevel
    };

    try {
      return await globalFetchPromise;
    } finally {
      this.blockTasksFetchPromise = null;
    }
  }

  private static async fetchBlockTasksByIds(
    blockIds: string[],
    scope: TaskQueryScope | null = null,
    useLiveDom: boolean = true
  ): Promise<Map<string, Task>> {
    const uniqueIds = Array.from(new Set(blockIds.filter(id => typeof id === 'string' && id.length > 0)));
    if (uniqueIds.length === 0) return new Map();

    try {
      const idsClause = uniqueIds.map(id => `'${id}'`).join(',');
      const rows = await sql(`
        SELECT b.id, b.content, b.box, b.hpath, b.sort, b.updated, b.created, b.markdown, b.parent_id, b.root_id, b.type, b.subtype, b.memo,
               GROUP_CONCAT(CASE WHEN a.name = 'custom-task-id' THEN a.value END) as custom_task_id,
               GROUP_CONCAT(CASE WHEN a.name = 'custom-task-priority' THEN a.value END) as custom_task_priority,
               GROUP_CONCAT(CASE WHEN a.name = 'custom-task-status' THEN a.value END) as custom_task_status,
               GROUP_CONCAT(CASE WHEN a.name = 'custom-task-due-date' THEN a.value END) as custom_task_due_date,
               GROUP_CONCAT(CASE WHEN a.name = 'custom-task-due-time' THEN a.value END) as custom_task_due_time,
               GROUP_CONCAT(CASE WHEN a.name = 'custom-task-start-date' THEN a.value END) as custom_task_start_date,
               GROUP_CONCAT(CASE WHEN a.name = 'custom-task-start-time' THEN a.value END) as custom_task_start_time,
               GROUP_CONCAT(CASE WHEN a.name = 'custom-task-tags' THEN a.value END) as custom_task_tags,
               GROUP_CONCAT(CASE WHEN a.name = 'custom-task-description' THEN a.value END) as custom_task_description,
               GROUP_CONCAT(CASE WHEN a.name = 'custom-task-reminder-type' THEN a.value END) as custom_task_reminder_type,
               GROUP_CONCAT(CASE WHEN a.name = 'custom-task-reminder-custom-time' THEN a.value END) as custom_task_reminder_custom_time,
               GROUP_CONCAT(CASE WHEN a.name = 'custom-task-group' THEN a.value END) as custom_task_group,
               GROUP_CONCAT(CASE WHEN a.name = 'custom-task-pinned' THEN a.value END) as custom_task_pinned,
               GROUP_CONCAT(CASE WHEN a.name = 'custom-task-background-color' THEN a.value END) as custom_task_background_color,
               GROUP_CONCAT(CASE WHEN a.name = 'custom-task-archived' THEN a.value END) as custom_task_archived,
               GROUP_CONCAT(CASE WHEN a.name = 'custom-task-completed-at' THEN a.value END) as custom_task_completed_at,
               GROUP_CONCAT(CASE WHEN a.name = 'custom-task-archived-at' THEN a.value END) as custom_task_archived_at,
               GROUP_CONCAT(CASE WHEN a.name = 'custom-task-archive-reason' THEN a.value END) as custom_task_archive_reason
         FROM blocks b
         LEFT JOIN attributes a ON b.id = a.block_id
          AND a.name IN ('custom-task-id', 'custom-task-priority', 'custom-task-status', 'custom-task-due-date', 'custom-task-due-time', 'custom-task-start-date', 'custom-task-start-time', 'custom-task-tags', 'custom-task-description', 'custom-task-reminder-type', 'custom-task-reminder-custom-time', 'custom-task-group', 'custom-task-pinned', 'custom-task-background-color', 'custom-task-archived', 'custom-task-completed-at', 'custom-task-archived-at', 'custom-task-archive-reason')
        WHERE b.id IN (${idsClause})
          ${this.buildNotebookScopeSql('b')}
          ${this.buildTaskQueryScopeSql(scope, 'b')}
          AND (b.type = 'i' OR b.type = 'p')
          AND b.subtype = 't'
          ${this.buildTaskCompletionSql(scope?.includeCompleted, 'b')}
          ${this.buildTaskArchiveSql(scope, 'b')}
        GROUP BY b.id, b.content, b.box, b.hpath, b.sort, b.updated, b.created, b.markdown, b.parent_id, b.root_id, b.type, b.subtype, b.memo
      `) as any[];

      if (!rows || rows.length === 0) {
        return new Map();
      }

      const rootIds = Array.from(new Set(rows.map(row => row.root_id).filter((id): id is string => !!id)));
      const {
        documentOrderByBlockId,
        rootIcons
      } = await this.resolveRootTaskMetadata(rootIds);

      const domMap = await batchGetBlockDOM(rows.map(row => row.id));
      const protyleElement = useLiveDom ? document.querySelector('.protyle') : null;
      const result = new Map<string, Task>();

      for (const row of rows) {
        const attrs: Record<string, string> = {
          'custom-task-id': row.custom_task_id,
          'custom-task-priority': row.custom_task_priority,
          'custom-task-status': row.custom_task_status,
          'custom-task-due-date': row.custom_task_due_date,
          'custom-task-due-time': row.custom_task_due_time,
          'custom-task-start-date': row.custom_task_start_date,
          'custom-task-start-time': row.custom_task_start_time,
          'custom-task-tags': row.custom_task_tags,
          'custom-task-description': row.custom_task_description,
          'custom-task-reminder-type': row.custom_task_reminder_type,
          'custom-task-reminder-custom-time': row.custom_task_reminder_custom_time,
          'custom-task-group': row.custom_task_group,
          'custom-task-pinned': row.custom_task_pinned,
          'custom-task-background-color': row.custom_task_background_color,
          'custom-task-archived': row.custom_task_archived,
          'custom-task-completed-at': row.custom_task_completed_at,
          'custom-task-archived-at': row.custom_task_archived_at,
          'custom-task-archive-reason': row.custom_task_archive_reason
        };

        const dom = domMap.get(row.id);
        if (!dom?.dom) continue;

        const parser = new DOMParser();
        const doc = parser.parseFromString(dom.dom, 'text/html');
        const parentListItem =
          doc.querySelector(`[data-node-id="${row.id}"][data-type="NodeListItem"]`) ||
          doc.querySelector(`[data-node-id="${row.id}"]`);
        const parentParagraph = parentListItem?.querySelector('[data-type="NodeParagraph"]');
        const titleFromApi = parentParagraph?.querySelector('[contenteditable="true"]')?.innerHTML
          || parentParagraph?.innerHTML
          || '';

        let title = titleFromApi;
        let completedByDOM: boolean | null = null;
        if (useLiveDom) {
          const currentElement =
            protyleElement?.querySelector(`[data-node-id="${row.id}"][data-type="NodeListItem"]`)
            || protyleElement?.querySelector(`[data-node-id="${row.id}"]`)
            || document.querySelector(`[data-node-id="${row.id}"][data-type="NodeListItem"]`)
            || document.querySelector(`[data-node-id="${row.id}"]`);
          const currentParagraph = currentElement?.querySelector('[data-type="NodeParagraph"] [contenteditable="true"]');
          title = currentParagraph?.innerHTML || titleFromApi;

          const currentAction = this.getTaskActionElement(currentElement, row.id);
          const currentSvg = currentAction?.querySelector('use');
          const currentHref = currentSvg?.getAttribute('xlink:href') || currentSvg?.getAttribute('href') || '';
          completedByDOM = currentHref ? currentHref === '#iconCheck' : null;
        }
        const status = this.parseTaskStatus(attrs, row.markdown || '', completedByDOM);
        const pinned = this.parseTaskPinnedFlag(attrs['custom-task-pinned']);
        const archived = this.parseTaskArchivedFlag(attrs['custom-task-archived']);
        const archivedAtRaw = (attrs['custom-task-archived-at'] || '')
          .split(',')
          .map(item => item.trim())
          .filter(item => item.length > 0)
          .pop() || '';
        const archiveReason = this.normalizeTaskArchiveReason(attrs['custom-task-archive-reason']);

        let tags: string[] = [];
        if (attrs['custom-task-tags']) {
          try {
            tags = JSON.parse(attrs['custom-task-tags']);
          } catch {
            tags = [];
          }
        }

        const subtasks = this.parseSubtasksFromParsedDoc(doc, row.id);
        const dateRange = this.resolveTaskDateRange(attrs, title, {
          allowInferFromTitle: true,
          createdAtRaw: row.created
        });
        this.queuePersistInferredTaskDate(row.id, dateRange);

        result.set(row.id, {
          id: attrs['custom-task-id'] || `block_${row.id}`,
          type: 'block',
          blockId: row.id,
          blockSort: this.normalizeTaskBlockSort(row.sort),
          documentOrder: documentOrderByBlockId.get(row.id),
          rootId: row.root_id,
          title,
          status,
          priority: attrs['custom-task-priority'] as TaskPriority || 'none',
          pinned,
          dueDate: dateRange.dueDate,
          dueTime: attrs['custom-task-due-time'],
          startDate: dateRange.startDate,
          startTime: attrs['custom-task-start-time'],
          tags,
          description: attrs['custom-task-description'] || '',
          reminderType: normalizeTaskReminderType(attrs['custom-task-reminder-type']),
          reminderCustomTime: normalizeTaskReminderCustomTime(attrs['custom-task-reminder-custom-time']),
          groupId: attrs['custom-task-group'] || undefined,
          hPath: row.hpath,
          notebookId: row.box,
          icon: row.root_id ? (rootIcons.get(row.root_id) || '\uD83D\uDCC4') : '\uD83D\uDCC4',
          backgroundColor: attrs['custom-task-background-color'],
          subtasks: subtasks.length > 0 ? subtasks : undefined,
          archived,
          completedAt: this.resolveTaskCompletedAt(attrs, status, row.updated),
          archivedAt: archived && archivedAtRaw ? archivedAtRaw : undefined,
          archiveReason: archived ? archiveReason : undefined,
          createdAt: this.parseBlockDateTime(row.created),
          updatedAt: this.parseBlockDateTime(row.updated)
        });
      }

      return result;
    } catch (error) {
      handleError('按 blockId 增量查询任务失败', error, { blockIds: uniqueIds });
      return new Map();
    }
  }
  
  private static async fetchBlockTasks(
    scope: TaskQueryScope | null = null,
    useLiveDom: boolean = true,
    detailLevel: TaskFetchDetailLevel = 'full'
  ): Promise<Task[]> {
    const tasks: Task[] = [];
    const BATCH_SIZE = TASK_CONFIG.BATCH_SIZE;
    const shouldFilterTopLevelCompleted = !useLiveDom && scope?.includeCompleted === false;
    const shouldBuildNestedSubtasks = !useLiveDom && detailLevel === 'full';
    
    try {
      const notebookScopeSql = this.buildNotebookScopeSql(null);
      const taskScopeSql = this.buildTaskQueryScopeSql(scope, null);
      const completionSqlForNodeLists = useLiveDom
        ? this.buildTaskCompletionSql(scope?.includeCompleted, null)
        : '';
      const completionSqlForTree = useLiveDom
        ? this.buildTaskCompletionSql(scope?.includeCompleted, 'b')
        : '';
      const nodeListBlocksPromise = sql(`
        SELECT id, parent_id, type
        FROM blocks
        WHERE type = 'l' AND subtype = 't'
        ${notebookScopeSql}
        ${taskScopeSql}
        ${completionSqlForNodeLists}
      `);

      const taskBlocks: SiyuanBlock[] = [];
      const pageSize = TASK_CONFIG.SQL_PAGE_SIZE;
      const maxScan = TASK_CONFIG.MAX_SQL_SCAN;

      let scanned = 0;
      let cursorId: string | null = null;
      while (scanned < maxScan) {
        const remaining = maxScan - scanned;
        const limit = Math.min(pageSize, remaining);
        const cursorClause = cursorId
          ? `AND b.id > '${this.escapeSqlLiteral(cursorId)}'`
          : '';

        const page = await sql(`
          SELECT b.id, b.content, b.box, b.hpath, b.sort, b.updated, b.created, b.markdown, b.parent_id, b.root_id, b.type, b.subtype, b.memo,
                 GROUP_CONCAT(CASE WHEN a.name = 'custom-task-id' THEN a.value END) as custom_task_id,
                 GROUP_CONCAT(CASE WHEN a.name = 'custom-task-priority' THEN a.value END) as custom_task_priority,
                 GROUP_CONCAT(CASE WHEN a.name = 'custom-task-status' THEN a.value END) as custom_task_status,
                 GROUP_CONCAT(CASE WHEN a.name = 'custom-task-due-date' THEN a.value END) as custom_task_due_date,
                 GROUP_CONCAT(CASE WHEN a.name = 'custom-task-due-time' THEN a.value END) as custom_task_due_time,
                 GROUP_CONCAT(CASE WHEN a.name = 'custom-task-start-date' THEN a.value END) as custom_task_start_date,
                 GROUP_CONCAT(CASE WHEN a.name = 'custom-task-start-time' THEN a.value END) as custom_task_start_time,
                 GROUP_CONCAT(CASE WHEN a.name = 'custom-task-tags' THEN a.value END) as custom_task_tags,
                 GROUP_CONCAT(CASE WHEN a.name = 'custom-task-description' THEN a.value END) as custom_task_description,
                 GROUP_CONCAT(CASE WHEN a.name = 'custom-task-reminder-type' THEN a.value END) as custom_task_reminder_type,
                 GROUP_CONCAT(CASE WHEN a.name = 'custom-task-reminder-custom-time' THEN a.value END) as custom_task_reminder_custom_time,
                 GROUP_CONCAT(CASE WHEN a.name = 'custom-task-group' THEN a.value END) as custom_task_group,
                 GROUP_CONCAT(CASE WHEN a.name = 'custom-task-pinned' THEN a.value END) as custom_task_pinned,
                 GROUP_CONCAT(CASE WHEN a.name = 'custom-task-background-color' THEN a.value END) as custom_task_background_color,
                 GROUP_CONCAT(CASE WHEN a.name = 'custom-task-archived' THEN a.value END) as custom_task_archived,
                 GROUP_CONCAT(CASE WHEN a.name = 'custom-task-completed-at' THEN a.value END) as custom_task_completed_at,
                 GROUP_CONCAT(CASE WHEN a.name = 'custom-task-archived-at' THEN a.value END) as custom_task_archived_at,
                 GROUP_CONCAT(CASE WHEN a.name = 'custom-task-archive-reason' THEN a.value END) as custom_task_archive_reason
          FROM blocks b
          LEFT JOIN attributes a ON b.id = a.block_id
            AND a.name IN ('custom-task-id', 'custom-task-priority', 'custom-task-status', 'custom-task-due-date', 'custom-task-due-time', 'custom-task-start-date', 'custom-task-start-time', 'custom-task-tags', 'custom-task-description', 'custom-task-reminder-type', 'custom-task-reminder-custom-time', 'custom-task-group', 'custom-task-pinned', 'custom-task-background-color', 'custom-task-archived', 'custom-task-completed-at', 'custom-task-archived-at', 'custom-task-archive-reason')
          WHERE (b.type = 'i' OR b.type = 'p')
            ${this.buildNotebookScopeSql('b')}
            ${this.buildTaskQueryScopeSql(scope, 'b')}
            AND b.subtype = 't'
            ${completionSqlForTree}
            ${this.buildTaskArchiveSql(scope, 'b')}
            ${cursorClause}
          GROUP BY b.id, b.content, b.box, b.hpath, b.sort, b.updated, b.created, b.markdown, b.parent_id, b.root_id, b.type, b.subtype, b.memo
          ORDER BY b.id
          LIMIT ${limit}
        `) as any[];

        if (!Array.isArray(page) || page.length === 0) {
          break;
        }

        taskBlocks.push(...(page as SiyuanBlock[]));
        scanned += page.length;

        const lastId = page[page.length - 1]?.id;
        if (typeof lastId !== 'string' || lastId.length === 0) {
          break;
        }
        cursorId = lastId;

        if (page.length < limit) {
          break;
        }
      }

      if (taskBlocks.length >= maxScan) {
        console.warn('[TaskRepository] 已触发任务扫描上限，可能仍有部分任务未加载', {
          scanned: taskBlocks.length,
          maxScan
        });
      }

      const nodeListBlocks = await nodeListBlocksPromise;
      const allBlocks = taskBlocks;
      const nodeListMap = new Map<string, string>();
      const rootIdSet = new Set<string>();
      
      nodeListBlocks.forEach((block: SiyuanBlock) => {
        if (block.type === 'l') {
          nodeListMap.set(block.id, block.parent_id);
        }
      });
      
      allBlocks.forEach((block: SiyuanBlock) => {
        if (block.root_id) {
          rootIdSet.add(block.root_id);
        }
      });
      
      const processedIds = new Set<string>();
      const allBlockIds = new Set(allBlocks.map(b => b.id));
      
      const subtaskIds = new Set<string>();
      
      for (const block of allBlocks) {
        const currentParentId = block.parent_id;
        if (!currentParentId || currentParentId === '') continue;
        
        const nodeListParentId = nodeListMap.get(currentParentId);
        
        if (nodeListParentId && allBlockIds.has(nodeListParentId)) {
          subtaskIds.add(block.id);
          continue;
        }
        
        let tempId = nodeListParentId;
        let depth = 0;
        const maxDepth = TASK_CONFIG.MAX_SUBTASK_DEPTH;
        
        while (tempId && depth < maxDepth) {
          const nextNodeListParent = nodeListMap.get(tempId);
          if (!nextNodeListParent) break;
          
          if (allBlockIds.has(nextNodeListParent)) {
            subtaskIds.add(block.id);
            break;
          }
          
          tempId = nextNodeListParent;
          depth++;
        }
      }
      
      const parentBlocks = allBlocks.filter(b => {
        if (subtaskIds.has(b.id)) return false;
        
        if (b.type === 'p') return true;
        
        const hasNoParent = !b.parent_id || b.parent_id === '';
        const parentNotFound = !allBlockIds.has(b.parent_id);
        const isSelfParent = b.parent_id === b.id;
        const isParent = hasNoParent || parentNotFound || isSelfParent;
        
        return isParent;
      });
      
      const protyleElement = useLiveDom ? document.querySelector('.protyle') : null;
      
      const blockAttrsMap = new Map<string, any>();
      taskBlocks.forEach((block: any) => {
        blockAttrsMap.set(block.id, {
          'custom-task-id': block.custom_task_id,
          'custom-task-priority': block.custom_task_priority,
          'custom-task-status': block.custom_task_status,
          'custom-task-due-date': block.custom_task_due_date,
          'custom-task-due-time': block.custom_task_due_time,
          'custom-task-start-date': block.custom_task_start_date,
          'custom-task-start-time': block.custom_task_start_time,
          'custom-task-tags': block.custom_task_tags,
          'custom-task-description': block.custom_task_description,
          'custom-task-reminder-type': block.custom_task_reminder_type,
          'custom-task-reminder-custom-time': block.custom_task_reminder_custom_time,
          'custom-task-group': block.custom_task_group,
          'custom-task-pinned': block.custom_task_pinned,
          'custom-task-background-color': block.custom_task_background_color,
          'custom-task-archived': block.custom_task_archived,
          'custom-task-completed-at': block.custom_task_completed_at,
          'custom-task-archived-at': block.custom_task_archived_at,
          'custom-task-archive-reason': block.custom_task_archive_reason
        });
      });
      
      const rootIds = detailLevel === 'full' ? Array.from(rootIdSet) : [];
      const {
        documentOrderByBlockId,
        rootIcons
      } = detailLevel === 'full'
        ? await this.resolveRootTaskMetadata(rootIds)
        : {
          documentOrderByBlockId: new Map<string, number>(),
          rootIcons: new Map<string, string>()
        };
      const taskBlockById = new Map<string, SiyuanBlock>();
      const subtaskChildIdsByParentTask = new Map<string, string[]>();
      const sqlSubtasksMemo = new Map<string, SubTask[]>();

      allBlocks.forEach((block) => {
        taskBlockById.set(block.id, block);
      });

      const buildFastTitleFromBlock = (block: SiyuanBlock): string => {
        const markdown = typeof block.markdown === 'string' ? block.markdown : '';
        const firstLine = markdown
          .split('\n')
          .map(line => line.trim())
          .find(line => line.length > 0) || '';
        const titleFromMarkdown = formatTaskTitleHtml(firstLine
          .replace(/^\s*[-*]\s*(?:\{:[^}]*\})?\s*\[(x|X| )\]\s*/i, '')
          .trim());
        if (titleFromMarkdown.length > 0) {
          return titleFromMarkdown;
        }

        const contentTitle = typeof block.content === 'string' ? block.content.trim() : '';
        return formatTaskTitleHtml(contentTitle);
      };

      const appendSubtaskChild = (parentTaskId: string, childTaskId: string): void => {
        const existing = subtaskChildIdsByParentTask.get(parentTaskId) || [];
        if (!existing.includes(childTaskId)) {
          existing.push(childTaskId);
          subtaskChildIdsByParentTask.set(parentTaskId, existing);
        }
      };

      const compareBlockOrder = (leftId: string, rightId: string): number => {
        const left = taskBlockById.get(leftId);
        const right = taskBlockById.get(rightId);
        if (!left && !right) return leftId.localeCompare(rightId);
        if (!left) return 1;
        if (!right) return -1;

        const leftSortRaw = left.sort;
        const rightSortRaw = right.sort;
        const leftSort = leftSortRaw === undefined || leftSortRaw === null ? '' : String(leftSortRaw).trim();
        const rightSort = rightSortRaw === undefined || rightSortRaw === null ? '' : String(rightSortRaw).trim();

        if (leftSort && rightSort && leftSort !== rightSort) {
          const leftDigits = /^\d+$/.test(leftSort);
          const rightDigits = /^\d+$/.test(rightSort);
          if (leftDigits && rightDigits) {
            if (leftSort.length !== rightSort.length) {
              return leftSort.length - rightSort.length;
            }
            return leftSort < rightSort ? -1 : 1;
          }
          return leftSort.localeCompare(rightSort);
        }

        if (left.created && right.created && left.created !== right.created) {
          return left.created.localeCompare(right.created);
        }
        return left.id.localeCompare(right.id);
      };

      const resolveNearestTaskParentId = (block: SiyuanBlock): string | null => {
        let currentParentId = block.parent_id || '';
        const visited = new Set<string>();
        while (currentParentId && !visited.has(currentParentId)) {
          visited.add(currentParentId);
          if (allBlockIds.has(currentParentId)) {
            return currentParentId;
          }

          const nextParentId = nodeListMap.get(currentParentId) || '';
          currentParentId = nextParentId;
        }
        return null;
      };

      if (shouldBuildNestedSubtasks) {
        for (const block of allBlocks) {
          const parentTaskId = resolveNearestTaskParentId(block);
          if (parentTaskId && parentTaskId !== block.id) {
            appendSubtaskChild(parentTaskId, block.id);
          }
        }

        const domChildOrderByParentTask = new Map<string, string[]>();
        const parentTaskIdsNeedDomOrder = Array.from(subtaskChildIdsByParentTask.entries())
          .filter(([, childIds]) => childIds.length > 1)
          .map(([parentTaskId]) => parentTaskId);

        const shouldAlignSubtaskOrder = parentTaskIdsNeedDomOrder.length > 0
          && parentTaskIdsNeedDomOrder.length <= TASK_CONFIG.MAX_DOM_ORDER_SYNC;

        if (shouldAlignSubtaskOrder) {
          try {
            const domMap = await batchGetBlockDOM(parentTaskIdsNeedDomOrder);
            for (const parentTaskId of parentTaskIdsNeedDomOrder) {
              const dom = domMap.get(parentTaskId)?.dom;
              if (!dom) continue;
              const parser = new DOMParser();
              const doc = parser.parseFromString(dom, 'text/html');
              const directSubtasks = this.parseSubtasksFromParsedDoc(doc, parentTaskId);
              const directChildIds = directSubtasks
                .map(subtask => subtask.nodeId)
                .filter((nodeId): nodeId is string => typeof nodeId === 'string' && nodeId.length > 0);
              if (directChildIds.length > 0) {
                domChildOrderByParentTask.set(parentTaskId, directChildIds);
              }
            }
          } catch (error) {
            console.warn('[TaskRepository] 快速路径子任务顺序 DOM 对齐失败，回退到 SQL 排序', error);
          }
        }

        for (const [parentTaskId, childIds] of subtaskChildIdsByParentTask.entries()) {
          const domChildOrder = domChildOrderByParentTask.get(parentTaskId) || [];
          const domOrderIndex = new Map<string, number>();
          domChildOrder.forEach((childId, index) => {
            domOrderIndex.set(childId, index);
          });

          const parentMarkdown = taskBlockById.get(parentTaskId)?.markdown || '';
          const markdownOrderIndex = new Map<string, number>();
          if (parentMarkdown) {
            for (const childId of childIds) {
              const pos = parentMarkdown.indexOf(childId);
              if (pos >= 0) {
                markdownOrderIndex.set(childId, pos);
              }
            }
          }

          childIds.sort((leftId, rightId) => {
            const leftDomPos = domOrderIndex.get(leftId);
            const rightDomPos = domOrderIndex.get(rightId);
            const leftHasDomPos = leftDomPos !== undefined;
            const rightHasDomPos = rightDomPos !== undefined;

            if (leftHasDomPos && rightHasDomPos && leftDomPos !== rightDomPos) {
              return leftDomPos - rightDomPos;
            }
            if (leftHasDomPos && !rightHasDomPos) {
              return -1;
            }
            if (!leftHasDomPos && rightHasDomPos) {
              return 1;
            }

            const leftMarkdownPos = markdownOrderIndex.get(leftId);
            const rightMarkdownPos = markdownOrderIndex.get(rightId);
            const leftHasMarkdownPos = leftMarkdownPos !== undefined;
            const rightHasMarkdownPos = rightMarkdownPos !== undefined;

            if (leftHasMarkdownPos && rightHasMarkdownPos && leftMarkdownPos !== rightMarkdownPos) {
              return leftMarkdownPos - rightMarkdownPos;
            }
            if (leftHasMarkdownPos && !rightHasMarkdownPos) {
              return -1;
            }
            if (!leftHasMarkdownPos && rightHasMarkdownPos) {
              return 1;
            }

            return compareBlockOrder(leftId, rightId);
          });
        }
      }

      const buildSqlSubtasksForParent = (parentTaskId: string, path = new Set<string>()): SubTask[] => {
        if (path.has(parentTaskId)) {
          return [];
        }
        if (sqlSubtasksMemo.has(parentTaskId)) {
          return sqlSubtasksMemo.get(parentTaskId)!;
        }

        path.add(parentTaskId);
        const childIds = subtaskChildIdsByParentTask.get(parentTaskId) || [];
        const subtasks: SubTask[] = [];

        for (const childId of childIds) {
          const childBlock = taskBlockById.get(childId);
          if (!childBlock) continue;

          const childAttrs = blockAttrsMap.get(childId) || {};
          const markdown = typeof childBlock.markdown === 'string' ? childBlock.markdown : '';
          const markdownMatch = markdown.match(/\[(x|X| )\]/);
          const completed = !!markdownMatch && (markdownMatch[1] === 'x' || markdownMatch[1] === 'X');
          const title = buildFastTitleFromBlock(childBlock) || 'Untitled';
          const status = this.parseTaskStatus(childAttrs, markdown, completed);
          const priorityRaw = typeof childAttrs['custom-task-priority'] === 'string'
            ? childAttrs['custom-task-priority'].trim()
            : '';
          const priority: TaskPriority = (priorityRaw === 'high'
            || priorityRaw === 'medium'
            || priorityRaw === 'low'
            || priorityRaw === 'none')
            ? priorityRaw
            : 'none';
          const description = typeof childAttrs['custom-task-description'] === 'string'
            ? childAttrs['custom-task-description']
            : '';
          const groupId = typeof childAttrs['custom-task-group'] === 'string'
            ? childAttrs['custom-task-group'].trim()
            : '';
          const dateRange = this.resolveTaskDateRange(childAttrs, title, {
            allowInferFromTitle: false,
            createdAtRaw: childBlock.created
          });
          const startTime = typeof childAttrs['custom-task-start-time'] === 'string'
            ? childAttrs['custom-task-start-time'].trim()
            : '';
          const dueTime = typeof childAttrs['custom-task-due-time'] === 'string'
            ? childAttrs['custom-task-due-time'].trim()
            : '';
          const nestedSubtasks = buildSqlSubtasksForParent(childId, path);

          subtasks.push({
            id: `sub_${childId}`,
            title,
            completed,
            nodeId: childId,
            status,
            priority,
            description,
            groupId: groupId || undefined,
            startDate: dateRange.startDate,
            dueDate: dateRange.dueDate,
            startTime: startTime || undefined,
            dueTime: dueTime || undefined,
            createdAt: this.parseBlockDateTime(childBlock.created),
            updatedAt: this.parseBlockDateTime(childBlock.updated),
            subtasks: nestedSubtasks.length > 0 ? nestedSubtasks : undefined
          });
        }

        path.delete(parentTaskId);
        sqlSubtasksMemo.set(parentTaskId, subtasks);
        return subtasks;
      };

      const markSubtaskNodesProcessed = (subtasks: SubTask[] | undefined): void => {
        if (!subtasks || subtasks.length === 0) return;
        for (const subtask of subtasks) {
          if (subtask.nodeId) {
            processedIds.add(subtask.nodeId);
          }
          if (subtask.subtasks) {
            markSubtaskNodesProcessed(subtask.subtasks);
          }
        }
      };
      
      const processBlock = async (
        parentBlock: SiyuanBlock, 
        domMap: Map<string, BlockDOMResponse>
      ): Promise<Task | null> => {
        if (processedIds.has(parentBlock.id)) return null;
        
        processedIds.add(parentBlock.id);
        
        const attrs = blockAttrsMap.get(parentBlock.id) || {};
        const taskId = attrs['custom-task-id'] || `block_${parentBlock.id}`;
        
        try {
          if (!useLiveDom) {
            let tags: string[] = [];
            if (attrs['custom-task-tags']) {
              try {
                tags = JSON.parse(attrs['custom-task-tags']);
              } catch {
                tags = [];
              }
            }

            let markdownStatus: 'pending' | 'completed' | null = null;
            if (parentBlock.markdown) {
              const markdown = parentBlock.markdown.trim();
              const taskRegex = /\[(x|X| )\]/;
              const match = markdown.match(taskRegex);
              if (match) {
                const statusChar = match[1];
                markdownStatus = statusChar === 'x' || statusChar === 'X' ? 'completed' : 'pending';
              }
            }

            const validStatuses = ['pending', 'in-progress', 'delayed', 'completed', 'cancelled'];
            const attrStatus = attrs['custom-task-status'] as TaskStatus | undefined;
            const hasValidAttrStatus = !!(attrStatus && validStatuses.includes(attrStatus));
            let status: TaskStatus;
            if (markdownStatus === 'completed') {
              status = 'completed';
            } else if (markdownStatus === 'pending') {
              status = hasValidAttrStatus && attrStatus !== 'completed' ? attrStatus! : 'pending';
            } else if (hasValidAttrStatus) {
              status = attrStatus!;
            } else {
              status = 'pending';
            }

            const sqlSubtasks = shouldBuildNestedSubtasks
              ? buildSqlSubtasksForParent(parentBlock.id)
              : [];
            const subtasks = sqlSubtasks.length > 0 ? sqlSubtasks : undefined;
            markSubtaskNodesProcessed(subtasks);
            const docIcon = detailLevel === 'full' && parentBlock.root_id
              ? rootIcons.get(parentBlock.root_id)
              : undefined;
            const title = markdownHasInlineMemo(parentBlock.markdown || '')
              ? (() => {
                  const domEntry = domMap.get(parentBlock.id);
                  const domTitle = domEntry?.dom
                    ? extractTitleFromBlockDom(domEntry.dom, parentBlock.id)
                    : null;
                  return (domTitle && domTitle.length > 0)
                    ? domTitle
                    : buildFastTitleFromBlock(parentBlock);
                })()
              : buildFastTitleFromBlock(parentBlock);
            const dateRange = this.resolveTaskDateRange(attrs, title, {
              allowInferFromTitle: true,
              createdAtRaw: parentBlock.created
            });
            this.queuePersistInferredTaskDate(parentBlock.id, dateRange);
            const pinned = this.parseTaskPinnedFlag(attrs['custom-task-pinned']);
            const archived = this.parseTaskArchivedFlag(attrs['custom-task-archived']);
            const archivedAtRaw = (attrs['custom-task-archived-at'] || '')
              .split(',')
              .map(item => item.trim())
              .filter(item => item.length > 0)
              .pop() || '';
            const archiveReason = this.normalizeTaskArchiveReason(attrs['custom-task-archive-reason']);
            return {
              id: taskId,
              type: 'block',
              blockId: parentBlock.id,
              blockSort: this.normalizeTaskBlockSort(parentBlock.sort),
              documentOrder: detailLevel === 'full'
                ? documentOrderByBlockId.get(parentBlock.id)
                : undefined,
              rootId: parentBlock.root_id,
              title,
              status,
              priority: attrs['custom-task-priority'] as any || 'none',
              pinned,
              dueDate: dateRange.dueDate,
              dueTime: attrs['custom-task-due-time'],
              startDate: dateRange.startDate,
              startTime: attrs['custom-task-start-time'],
              tags,
              groupId: attrs['custom-task-group'] || undefined,
              description: attrs['custom-task-description'] || '',
              reminderType: normalizeTaskReminderType(attrs['custom-task-reminder-type']),
              reminderCustomTime: normalizeTaskReminderCustomTime(attrs['custom-task-reminder-custom-time']),
              hPath: parentBlock.hpath,
              notebookId: parentBlock.box,
              icon: docIcon || '📄',
              backgroundColor: attrs['custom-task-background-color'],
              subtasks,
              archived,
              completedAt: this.resolveTaskCompletedAt(attrs, status, parentBlock.updated),
              archivedAt: archived && archivedAtRaw ? archivedAtRaw : undefined,
              archiveReason: archived ? archiveReason : undefined,
              createdAt: this.parseBlockDateTime(parentBlock.created),
              updatedAt: this.parseBlockDateTime(parentBlock.updated)
            };
          }

          const dom = domMap.get(parentBlock.id);
          if (!dom) {
            log_debug('未获取到 DOM 数据', { blockId: parentBlock.id });
            return null;
          }
          
          let currentTitle = '';
          let isCurrentCompleted: boolean | undefined;
          {
            const currentDomElement = protyleElement?.querySelector(`[data-node-id="${parentBlock.id}"][data-type="NodeListItem"]`) 
              || protyleElement?.querySelector(`[data-node-id="${parentBlock.id}"]`);
            
            // 如果当前编辑器未命中，则回退到全局查询
            let fallbackElement = currentDomElement;
            if (!fallbackElement) {
              fallbackElement = document.querySelector(`[data-node-id="${parentBlock.id}"][data-type="NodeListItem"]`) 
                || document.querySelector(`[data-node-id="${parentBlock.id}"]`);
            }
            
            // 使用当前编辑器里的元素；若拿不到则回退到全局查询结果
            const elementToUse = currentDomElement || fallbackElement;
            
            const currentParagraph = elementToUse?.querySelector('[data-type="NodeParagraph"] [contenteditable="true"]');
            currentTitle = currentParagraph?.innerHTML || '';
            
            const currentAction = this.getTaskActionElement(elementToUse, parentBlock.id);
            const currentSvg = currentAction?.querySelector('use');
            
            if (currentSvg) {
              const currentHref = currentSvg.getAttribute('xlink:href') || currentSvg.getAttribute('href');
              isCurrentCompleted = currentHref === '#iconCheck';
            }
          }
          
          const parser = new DOMParser();
          const doc = parser.parseFromString(dom.dom, 'text/html');
          
          let parentListItem = doc.querySelector(`[data-node-id="${parentBlock.id}"][data-type="NodeListItem"]`);
          if (!parentListItem) {
            parentListItem = doc.querySelector(`[data-node-id="${parentBlock.id}"]`);
          }
          
          const parentParagraph = parentListItem?.querySelector('[data-type="NodeParagraph"]');
          
          const parentAction = this.getTaskActionElement(parentListItem, parentBlock.id);
          
          const svg = parentAction?.querySelector('use');
          const apiHref = svg?.getAttribute('xlink:href') || svg?.getAttribute('href');
          const apiDomStatus: 'completed' | 'pending' | null = apiHref
            ? (apiHref === '#iconCheck' ? 'completed' : 'pending')
            : null;
          
          const cleanHtmlStyle = (html: string) => html.replace(/\{:\s*[^}]*\}/g, '');
          const collectSubtaskNodeIds = (subtasks: SubTask[] | undefined): void => {
            if (!subtasks || subtasks.length === 0) return;
            for (const subtask of subtasks) {
              if (subtask.nodeId) {
                processedIds.add(subtask.nodeId);
              }
              if (subtask.subtasks) {
                collectSubtaskNodeIds(subtask.subtasks);
              }
            }
          };

          const subtasks = this.parseSubtasksFromParsedDoc(doc, parentBlock.id);
          collectSubtaskNodeIds(subtasks);
          
          const titleHtml = parentParagraph?.querySelector('[contenteditable="true"]')?.innerHTML || '';
          const titleFromApi = cleanHtmlStyle(titleHtml);
          const currentTitleClean = cleanHtmlStyle(currentTitle);
          const title = currentTitleClean || titleFromApi;
          const dateRange = this.resolveTaskDateRange(attrs, title, {
            allowInferFromTitle: true,
            createdAtRaw: parentBlock.created
          });
          this.queuePersistInferredTaskDate(parentBlock.id, dateRange);

          let status: TaskStatus;

          let markdownStatus: 'pending' | 'completed' | null = null;
          if (parentBlock.markdown) {
            const markdown = parentBlock.markdown.trim();
            const taskRegex = /\[(x|X| )\]/;
            const match = markdown.match(taskRegex);
            if (match) {
              const statusChar = match[1];
              if (statusChar === 'x' || statusChar === 'X') {
                markdownStatus = 'completed';
              } else {
                markdownStatus = 'pending';
              }
            }
          }
          
          const validStatuses = ['pending', 'in-progress', 'delayed', 'completed', 'cancelled'];
          
          const attrStatus = attrs['custom-task-status'] as 'pending' | 'in-progress' | 'delayed' | 'completed' | 'cancelled' | undefined;
          const hasValidAttrStatus = !!(attrStatus && validStatuses.includes(attrStatus));
          const isCompletedBySignals =
            isCurrentCompleted === true ||
            apiDomStatus === 'completed' ||
            markdownStatus === 'completed';
          const isUncheckedBySignals =
            isCurrentCompleted === false ||
            apiDomStatus === 'pending' ||
            markdownStatus === 'pending';

          if (isCompletedBySignals) {
            status = 'completed';
          } else if (isUncheckedBySignals) {
            if (hasValidAttrStatus && attrStatus !== 'completed') {
              status = attrStatus!;
            } else {
              status = 'pending';
            }
          } else if (hasValidAttrStatus) {
            status = attrStatus!;
          } else {
            status = 'pending';
          }
          
          processedIds.add(parentBlock.id);
          
          const docIcon = parentBlock.root_id ? rootIcons.get(parentBlock.root_id) : undefined;
          const pinned = this.parseTaskPinnedFlag(attrs['custom-task-pinned']);
          const archived = this.parseTaskArchivedFlag(attrs['custom-task-archived']);
          const archivedAtRaw = (attrs['custom-task-archived-at'] || '')
            .split(',')
            .map(item => item.trim())
            .filter(item => item.length > 0)
            .pop() || '';
          const archiveReason = this.normalizeTaskArchiveReason(attrs['custom-task-archive-reason']);
          
          return {
            id: taskId,
            type: 'block',
            blockId: parentBlock.id,
            blockSort: this.normalizeTaskBlockSort(parentBlock.sort),
            documentOrder: documentOrderByBlockId.get(parentBlock.id),
            rootId: parentBlock.root_id,
            title: title,
            status: status,
            priority: attrs['custom-task-priority'] as any || 'none',
            pinned,
            dueDate: dateRange.dueDate,
            dueTime: attrs['custom-task-due-time'],
            startDate: dateRange.startDate,
            startTime: attrs['custom-task-start-time'],
            tags: attrs['custom-task-tags'] ? JSON.parse(attrs['custom-task-tags']) : [],
            groupId: attrs['custom-task-group'] || undefined,
            description: attrs['custom-task-description'] || '',
            reminderType: normalizeTaskReminderType(attrs['custom-task-reminder-type']),
            reminderCustomTime: normalizeTaskReminderCustomTime(attrs['custom-task-reminder-custom-time']),
            hPath: parentBlock.hpath,
            notebookId: parentBlock.box,
            icon: docIcon || '📄',
            backgroundColor: attrs['custom-task-background-color'],
            subtasks: subtasks.length > 0 ? subtasks : undefined,
            archived,
            completedAt: this.resolveTaskCompletedAt(attrs, status, parentBlock.updated),
            archivedAt: archived && archivedAtRaw ? archivedAtRaw : undefined,
            archiveReason: archived ? archiveReason : undefined,
            createdAt: this.parseBlockDateTime(parentBlock.created),
            updatedAt: this.parseBlockDateTime(parentBlock.updated)
          };
        } catch (error) {
          handleError('处理任务块失败', error, { blockId: parentBlock.id });
          return null;
        }
      };
      
      const chunks = [];
      for (let i = 0; i < parentBlocks.length; i += BATCH_SIZE) {
        chunks.push(parentBlocks.slice(i, i + BATCH_SIZE));
      }

      const markdownHasInlineMemo = (md: string): boolean => {
        const regex = /\(\(([^()]+)\)\)/g;
        let m: RegExpExecArray | null;
        while ((m = regex.exec(md)) !== null) {
          if (!/^[0-9]{14}-[a-z0-9]{7,}$/.test(m[1])) {
            return true;
          }
        }
        return false;
      };

      const extractTitleFromBlockDom = (domHtml: string, blockId: string): string | null => {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(domHtml, 'text/html');
          const listItem =
            doc.querySelector(`[data-node-id="${blockId}"][data-type="NodeListItem"]`) ||
            doc.querySelector(`[data-node-id="${blockId}"]`);
          const paragraph = listItem?.querySelector('[data-type="NodeParagraph"]');
          const rawTitle = paragraph?.querySelector('[contenteditable="true"]')?.innerHTML
            || paragraph?.innerHTML
            || '';
          return rawTitle.replace(/\{:\s*[^}]*\}/g, '').trim();
        } catch {
          return null;
        }
      };
    
      for (const chunk of chunks) {
        const needsDomForMemos = !useLiveDom && chunk.some(
          block => markdownHasInlineMemo(block.markdown || '')
        );
        const domMap = (useLiveDom || needsDomForMemos)
          ? await batchGetBlockDOM(chunk.map(block => block.id))
          : new Map<string, BlockDOMResponse>();
        
        const results = await Promise.all(chunk.map(block => processBlock(block, domMap)));
        const validResults = results.filter((result): result is Task => result !== null);
        tasks.push(...validResults);
      }
      } catch (error) {
        handleError('获取任务列表失败', error);
      }
      
      return shouldFilterTopLevelCompleted
        ? tasks.filter(task => task.status !== 'completed')
        : tasks;
    }

  public static async saveBlockTasksCache(tasks: Task[]): Promise<void> {
    const plugin = usePlugin();
    await plugin.saveData('stand-block-tasks-cache.json', {
      version: TASK_CONFIG.CACHE_VERSION,
      tasks,
      excludedNotebookIds: this.getExcludedNotebookIdsSorted(),
      updatedAt: new Date().toISOString()
    });
    this.memoryCache = { tasks, timestamp: Date.now(), detailLevel: 'full' };
  }
  
  static async clearCache(): Promise<void> {
    const plugin = usePlugin();
    await plugin.saveData('stand-block-tasks-cache.json', {});
    this.memoryCache = { tasks: null, timestamp: 0, detailLevel: 'full' };
    this.scopedMemoryCache.clear();
    this.scopedBlockTasksFetchPromises.clear();
  }
  
  static async createBlockTask(
    task: Omit<Task, 'id' | 'type' | 'createdAt' | 'updatedAt' | 'blockId' | 'hPath' | 'notebookId'>,
    notebookId: string,
    docPath: string
  ): Promise<{ taskId: string; blockId: string }> {
    const trimmedTitle = task.title?.trim();
    if (!trimmedTitle) {
      throw new Error('任务标题不能为空');
    }

    const attrs: { [key: string]: string } = {
      'custom-task-id': generateTaskId(),
      'custom-task-priority': task.priority
    };

    const normalizedStartDate = typeof task.startDate === 'string' ? task.startDate.trim() : '';
    const normalizedDueDate = typeof task.dueDate === 'string' ? task.dueDate.trim() : '';
    const normalizedStartTime = typeof task.startTime === 'string' ? task.startTime.trim() : '';
    const normalizedDueTime = typeof task.dueTime === 'string' ? task.dueTime.trim() : '';

    let resolvedStartDate = normalizedStartDate;
    let resolvedDueDate = normalizedDueDate;

    if (!resolvedStartDate && !resolvedDueDate && this.isAutoRecognizeTaskDateEnabled()) {
      const inferredDate = this.extractDateFromTaskTitle(trimmedTitle);
      if (inferredDate) {
        resolvedStartDate = inferredDate;
        resolvedDueDate = inferredDate;
      }
    }

    if (resolvedStartDate) {
      attrs['custom-task-start-date'] = resolvedStartDate;
    }

    if (resolvedDueDate) {
      attrs['custom-task-due-date'] = resolvedDueDate;
    }

    if (normalizedStartTime) {
      attrs['custom-task-start-time'] = normalizedStartTime;
    }

    if (normalizedDueTime) {
      attrs['custom-task-due-time'] = normalizedDueTime;
    }

    if (task.groupId) {
      attrs['custom-task-group'] = task.groupId;
    }

    if (task.pinned) {
      attrs['custom-task-pinned'] = '1';
    }

    if (task.tags && task.tags.length > 0) {
      attrs['custom-task-tags'] = JSON.stringify(task.tags);
    }

    if (task.description && task.description.trim()) {
      attrs['custom-task-description'] = task.description.trim();
    }

    const reminderType = normalizeTaskReminderType(task.reminderType);
    const reminderCustomTime = normalizeTaskReminderCustomTime(task.reminderCustomTime);
    if (reminderType) {
      attrs['custom-task-reminder-type'] = reminderType;
    }
    if (reminderType === 'custom' && reminderCustomTime) {
      attrs['custom-task-reminder-custom-time'] = reminderCustomTime;
    }

    if (task.status && task.status !== 'pending') {
      attrs['custom-task-status'] = task.status;
    }
    if (task.status === 'completed') {
      attrs[TASK_COMPLETED_AT_ATTR] = typeof task.completedAt === 'string' && task.completedAt.trim().length > 0
        ? task.completedAt.trim()
        : new Date().toISOString();
    }

    const taskMarkdown = task.status === 'completed' ? `- [x] ${trimmedTitle}` : `- [ ] ${trimmedTitle}`;

    try {
      log_debug('创建块任务', { notebookId, docPath, taskMarkdown });

      const ids = await getIDsByHPath(notebookId, docPath);
      log_debug('获取文档 ID', ids);
      
      if (!ids || ids.length === 0) {
        throw new Error('文档不存在');
      }

      const rootId = ids[0];
      log_debug('文档根 ID', rootId);

      const containerListId = await this.resolveTaskContainerListId(rootId);
      const insertParentId = containerListId || rootId;
      const result = await appendBlock('markdown', taskMarkdown, insertParentId);
      log_debug('appendBlock 霑泌屓扈捺棡', JSON.stringify(result, null, 2));

      if (result && result.length > 0) {
        let listItemBlockId = '';

        log_debug('doOperations 数量', result[0].doOperations.length);
        
        for (let i = 0; i < result[0].doOperations.length; i++) {
          const op = result[0].doOperations[i] as any;
          log_debug(`遍历 doOperation[${i}]`, { id: op.id, objectType: op.objectType, type: op.type });
          
          if (op.objectType === 'NodeListItem') {
            listItemBlockId = op.id;
            log_debug('检测到 NodeListItem', listItemBlockId);
            break;
          }
          
          if (op.data && typeof op.data === 'string') {
            const parser = new DOMParser();
            const doc = parser.parseFromString(op.data, 'text/html');
            const listItem = doc.querySelector('[data-type="NodeListItem"]');
            if (listItem) {
              const nodeId = listItem.getAttribute('data-node-id');
              if (nodeId) {
                listItemBlockId = nodeId;
                log_debug('从 data HTML 解析到 NodeListItem', listItemBlockId);
                break;
              }
            }
          }
        }

        if (!listItemBlockId && insertParentId !== rootId) {
          log_debug('回退到列表容器查询任务块', insertParentId);
          const childBlocks = await sql(`
            SELECT id, type, subtype
            FROM blocks
            WHERE parent_id = '${this.escapeSqlLiteral(insertParentId)}'
            AND type IN ('i', 'p')
            AND subtype = 't'
            ORDER BY created DESC
            LIMIT 1
          `);
          log_debug('SQL譟･隸｢扈捺棡1', childBlocks);
          if (childBlocks && childBlocks.length > 0) {
            listItemBlockId = childBlocks[0].id;
            log_debug('从列表容器查询到任务块', listItemBlockId);
          }
        }

        if (!listItemBlockId) {
          const parentBlockId = result[0].doOperations[result[0].doOperations.length - 1]?.id || result[0].doOperations[0].id;
          log_debug('回退到父块查询子任务块', parentBlockId);
          
          const childBlocks = await sql(`
            SELECT id, type, subtype
            FROM blocks
            WHERE parent_id = '${this.escapeSqlLiteral(parentBlockId)}' 
            AND type = 'l' 
            AND subtype = 't'
            ORDER BY created DESC
            LIMIT 1
          `);
          log_debug('SQL譟･隸｢扈捺棡1', childBlocks);

          if (childBlocks && childBlocks.length > 0) {
            listItemBlockId = childBlocks[0].id;
            log_debug('从父块查询到任务块', listItemBlockId);
          }
        }

        if (!listItemBlockId) {
          log_debug('回退到 root 查询最近任务块');
          
          const childBlocks = await sql(`
            SELECT id, type, subtype
            FROM blocks
            WHERE root_id = '${this.escapeSqlLiteral(rootId)}' 
            AND type = 'l' 
            AND subtype = 't'
            ORDER BY created DESC
            LIMIT 3
          `);
          log_debug('SQL譟･隸｢扈捺棡2', childBlocks);

          if (childBlocks && childBlocks.length > 0) {
            const now = Date.now();
            for (const block of childBlocks) {
              const blockTime = new Date(block.created || block.updated).getTime();
              if (now - blockTime < TASK_CONFIG.RECENT_TASK_WINDOW) {
                listItemBlockId = block.id;
                log_debug('命中最近创建的任务块', listItemBlockId);
                break;
              }
            }
            
            if (!listItemBlockId && childBlocks.length > 0) {
              listItemBlockId = childBlocks[0].id;
              log_debug('使用最新任务块作为兜底', listItemBlockId);
            }
          }
        }

        log_debug('最终任务块 ID', listItemBlockId);
        log_debug('准备写入属性', attrs);

        if (listItemBlockId && Object.keys(attrs).length > 0) {
          await setBlockAttrs(listItemBlockId, attrs);
          log_debug('任务属性写入成功');
          
          const verifyAttrs = await getBlockAttrs(listItemBlockId);
          log_debug('写入后属性校验', verifyAttrs);
        }

        let resolvedListId = containerListId || '';
        if (!resolvedListId && listItemBlockId) {
          try {
            const listRows = await sql(`
              SELECT parent_id, type, subtype
              FROM blocks
              WHERE id = '${this.escapeSqlLiteral(listItemBlockId)}'
              LIMIT 1
            `);
            const parentId = listRows?.[0]?.parent_id as string | undefined;
            if (parentId) {
              const parentRows = await sql(`
                SELECT id, type, subtype
                FROM blocks
                WHERE id = '${this.escapeSqlLiteral(parentId)}'
                LIMIT 1
              `);
              const parentBlock = parentRows?.[0];
              if (parentBlock && parentBlock.type === 'l' && parentBlock.subtype === 't') {
                resolvedListId = parentId;
              }
            }
          } catch {
          }
        }

        if (resolvedListId) {
          await this.markTaskContainerList(resolvedListId, rootId);
        }

        const createResult = {
          taskId: attrs['custom-task-id'],
          blockId: listItemBlockId || result[0].doOperations[0].id
        };

        await this.clearCache();
        eventBus.emit(Events.TASK_ADDED, createResult);

        return createResult;
      }

      throw new Error('Failed to create block');
    } catch (error) {
      handleError('创建块任务失败', error, { notebookId, docPath, taskTitle: task.title });
      throw error;
    }
  }
  
  static async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    const blockId = await this.resolveBlockIdByTaskId(taskId);
    if (!blockId) {
      return;
    }

    const attrsToUpdate: { [key: string]: string } = {};
    if (updates.status !== undefined) {
      const statusAttrs = buildTaskStatusAttrs(updates.status, updates.completedAt);
      attrsToUpdate['custom-task-status'] = statusAttrs['custom-task-status'];
      attrsToUpdate[TASK_COMPLETED_AT_ATTR] = statusAttrs[TASK_COMPLETED_AT_ATTR];
    }
    if (updates.priority !== undefined) {
      attrsToUpdate['custom-task-priority'] = updates.priority || '';
    }
    if (updates.startDate !== undefined) {
      attrsToUpdate['custom-task-start-date'] = updates.startDate || '';
    }
    if (updates.startTime !== undefined) {
      attrsToUpdate['custom-task-start-time'] = updates.startTime || '';
    }
    if (updates.dueDate !== undefined) {
      attrsToUpdate['custom-task-due-date'] = updates.dueDate || '';
    }
    if (updates.dueTime !== undefined) {
      attrsToUpdate['custom-task-due-time'] = updates.dueTime || '';
    }
    if (updates.tags !== undefined) {
      attrsToUpdate['custom-task-tags'] = JSON.stringify(updates.tags || []);
    }
    if (updates.groupId !== undefined) {
      attrsToUpdate['custom-task-group'] = updates.groupId || '';
    }
    if (updates.pinned !== undefined) {
      attrsToUpdate['custom-task-pinned'] = updates.pinned ? '1' : '';
    }
    if (updates.description !== undefined) {
      attrsToUpdate['custom-task-description'] = updates.description || '';
    }
    if (updates.reminderType !== undefined) {
      const reminderType = normalizeTaskReminderType(updates.reminderType);
      attrsToUpdate['custom-task-reminder-type'] = reminderType || '';
      if (reminderType !== 'custom') {
        attrsToUpdate['custom-task-reminder-custom-time'] = '';
      }
    }
    if (updates.reminderCustomTime !== undefined) {
      attrsToUpdate['custom-task-reminder-custom-time'] = normalizeTaskReminderCustomTime(updates.reminderCustomTime) || '';
    }
    if (updates.backgroundColor !== undefined) {
      attrsToUpdate['custom-task-background-color'] = updates.backgroundColor || '';
    }
    if (updates.archived !== undefined) {
      attrsToUpdate['custom-task-archived'] = updates.archived ? '1' : '';
    }
    if (updates.archivedAt !== undefined) {
      attrsToUpdate['custom-task-archived-at'] = updates.archivedAt || '';
    }
    if (updates.completedAt !== undefined && updates.status === undefined) {
      attrsToUpdate[TASK_COMPLETED_AT_ATTR] = updates.completedAt || '';
    }
    if (updates.archiveReason !== undefined) {
      attrsToUpdate['custom-task-archive-reason'] = updates.archiveReason || '';
    }

    if (Object.keys(attrsToUpdate).length === 0) {
      return;
    }

    await setBlockAttrs(blockId, attrsToUpdate);
    if (updates.status !== undefined) {
      await syncTaskListItemMarkerByStatus(blockId, updates.status);
    }
    await this.clearCache();
  }

  static async archiveTask(taskId: string, reason: 'manual' | 'auto' = 'manual'): Promise<void> {
    const blockId = await this.resolveBlockIdByTaskId(taskId);
    if (!blockId) {
      return;
    }

    const normalizedReason = reason === 'auto' ? 'auto' : 'manual';
    await setBlockAttrs(blockId, {
      'custom-task-archived': '1',
      'custom-task-archived-at': new Date().toISOString(),
      'custom-task-archive-reason': normalizedReason
    });
    await this.clearCache();
  }

  static async unarchiveTask(taskId: string): Promise<void> {
    const blockId = await this.resolveBlockIdByTaskId(taskId);
    if (!blockId) {
      return;
    }

    await setBlockAttrs(blockId, {
      'custom-task-archived': '',
      'custom-task-archived-at': '',
      'custom-task-archive-reason': ''
    });
    await this.clearCache();
  }

  static async setTaskRepeatRule(task: Task, frequency: RepeatFrequency): Promise<void> {
    if (task.type !== 'block') {
      return;
    }
    await setTaskRepeatSeries(task, frequency);
  }

  static async getTaskRepeatRule(task: Task): Promise<RepeatFrequency> {
    if (task.type !== 'block') {
      return 'none';
    }
    return getTaskRepeatFrequency(task);
  }

  static async updateRepeatInstanceStatus(task: Task, status: TaskStatus): Promise<void> {
    if (!task.repeatSeriesId || !task.repeatInstanceDate) {
      return;
    }
    await setRepeatInstanceStatus(task.repeatSeriesId, task.repeatInstanceDate, status);
    if (status === 'completed') {
      void awardTaskCompletion({
        ...task,
        status,
        completedAt: task.completedAt || new Date().toISOString()
      });
    }
  }

  static async moveTask(taskId: string, targetRootId: string): Promise<{ blockId: string; parentId: string }> {
    const normalizedTaskId = typeof taskId === 'string' ? taskId.trim() : '';
    const normalizedRootId = typeof targetRootId === 'string' ? targetRootId.trim() : '';
    if (!normalizedTaskId || !normalizedRootId) {
      throw new Error('缺少移动任务所需的目标信息');
    }

    const blockId = await this.resolveBlockIdByTaskId(normalizedTaskId);
    if (!blockId) {
      throw new Error('未找到要移动的任务块');
    }

    const containerListId = await this.resolveTaskContainerListId(normalizedRootId);
    const parentId = containerListId || normalizedRootId;

    await moveBlock(blockId, undefined, parentId);
    if (containerListId) {
      await this.markTaskContainerList(containerListId, normalizedRootId);
    }
    await this.clearCache();

    return { blockId, parentId };
  }
  
  static async deleteTask(taskId: string): Promise<void> {
    const blockId = await this.resolveBlockIdByTaskId(taskId);
    if (!blockId) {
      return;
    }

    await deleteBlock(blockId);
    await this.clearCache();
  }
  
  static async updateSubtaskInCache(parentTaskId: string, subtaskId: string, completed: boolean): Promise<void> {
    let cachedTasks = this.memoryCache.detailLevel === 'full'
      ? this.memoryCache.tasks
      : null;

    if (!cachedTasks) {
      const plugin = usePlugin();
      const cachedData = await plugin.loadData('stand-block-tasks-cache.json');
      const parsed = typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
      if (parsed && Array.isArray(parsed.tasks)) {
        cachedTasks = parsed.tasks as Task[];
      }
    }

    if (!cachedTasks || cachedTasks.length === 0) {
      return;
    }

    const parentTask = cachedTasks.find(
      t => t.id === parentTaskId || (t.blockId && t.blockId === parentTaskId)
    );
    if (!parentTask) {
      return;
    }

    const changed = this.setSubtaskCompletion(parentTask.subtasks, subtaskId, completed);
    if (changed) {
      parentTask.updatedAt = new Date().toISOString();
      await this.saveBlockTasksCache(cachedTasks);
    }
  }
  
  static async getTaskByBlockId(blockId: string, useCache: boolean = false): Promise<Task | null> {
    try {
      const taskMap = await this.getTasksByBlockIds([blockId], useCache, undefined, { useLiveDom: false });
      return taskMap.get(blockId) || null;
    } catch (error) {
      handleError('按 blockId 获取任务失败', error, { blockId });
      return null;
    }
  }
  
  static async getTasksByBlockIds(
    blockIds: string[],
    useCache: boolean = false,
    scope?: TaskQueryScope,
    options: TaskFetchOptions = {}
  ): Promise<Map<string, Task>> {
    try {
      const normalizedScope = this.normalizeTaskQueryScope(scope);
      const useLiveDom = options.useLiveDom !== false;
      const normalizedIds = Array.from(new Set(blockIds.filter(id => typeof id === 'string' && id.length > 0)));
      if (normalizedIds.length === 0) {
        return new Map();
      }
      const scopedIds = await this.filterIncludedBlockIds(normalizedIds);
      if (scopedIds.length === 0) {
        return new Map();
      }

      if (useCache) {
        const now = Date.now();
        if (
          this.memoryCache.tasks &&
          this.memoryCache.detailLevel === 'full' &&
          now - this.memoryCache.timestamp < this.MEMORY_CACHE_DURATION
        ) {
          const memoryTaskMap = new Map<string, Task>();
          for (const task of this.memoryCache.tasks) {
            if (task.type === 'block' && task.blockId) {
              memoryTaskMap.set(task.blockId, task);
            }
          }

          const fromMemory = new Map<string, Task>();
          for (const blockId of scopedIds) {
            const task = memoryTaskMap.get(blockId);
            if (task) {
              fromMemory.set(blockId, task);
            }
          }
          if (fromMemory.size === scopedIds.length) {
            return fromMemory;
          }
        }
      }

      const taskMap = await this.fetchBlockTasksByIds(scopedIds, normalizedScope, useLiveDom);
      const enrichedTasks = await attachRepeatMetadataToTasks(Array.from(taskMap.values()));
      const enrichedTaskMap = new Map<string, Task>();
      enrichedTasks.forEach((task) => {
        if (task.blockId) {
          enrichedTaskMap.set(task.blockId, task);
        }
      });

      if (
        enrichedTaskMap.size > 0 &&
        this.memoryCache.tasks &&
        this.memoryCache.detailLevel === 'full'
      ) {
        const cachedMap = new Map<string, Task>();
        for (const task of this.memoryCache.tasks) {
          if (task.type === 'block' && task.blockId) {
            cachedMap.set(task.blockId, task);
          }
        }
        enrichedTaskMap.forEach((task, blockId) => {
          cachedMap.set(blockId, task);
        });
        this.memoryCache = {
          tasks: Array.from(cachedMap.values()),
          timestamp: Date.now(),
          detailLevel: 'full'
        };
      }

      return enrichedTaskMap;
    } catch (error) {
      handleError('批量获取任务失败', error, { blockIds });
      return new Map();
    }
  }
}

// 获取块 DOM 数据
export async function getBlockDOM(
  id: BlockId
): Promise<BlockDOMResponse> {
  let data = {
    id: id,
  };
  let url = "/api/block/getBlockDOM";
  return request(url, data);
}

async function batchGetBlockDOM(ids: string[]): Promise<Map<string, BlockDOMResponse>> {
  if (ids.length === 0) return new Map();
  
  const result = new Map<string, BlockDOMResponse>();
  const batchSize = 20;
  const maxConcurrent = 5;
  
  for (let i = 0; i < ids.length; i += batchSize * maxConcurrent) {
    const batchPromises: Promise<void>[] = [];
    
    for (let j = 0; j < maxConcurrent && i + j * batchSize < ids.length; j++) {
      const startIdx = i + j * batchSize;
      const batch = ids.slice(startIdx, Math.min(startIdx + batchSize, ids.length));
      
      batchPromises.push(
        (async () => {
          const domPromises = batch.map(id => 
            getBlockDOM(id).catch((error) => {
              log_debug('获取块 DOM 失败', { id, error });
              return null;
            })
          );
          const domResults = await Promise.all(domPromises);
          
          batch.forEach((id, index) => {
            if (domResults[index]) {
              result.set(id, domResults[index]!);
            }
          });
        })()
      );
    }
    
    await Promise.all(batchPromises);
  }
  
  return result;
}
