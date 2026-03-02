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
import { eventBus } from "@/utils/eventBus";
import { usePlugin } from "@/main";
import {
  attachRepeatMetadataToTasks,
  materializeRepeatTasks,
  setTaskRepeatSeries,
  getTaskRepeatFrequency,
  setRepeatInstanceStatus,
  type RepeatFrequency
} from "@/repeatRepository";

async function request(url: string, data: any) {
  let response: IWebSocketData = await fetchSyncPost(url, data);
  let res = response.code === 0 ? response.data : null;
  return res;
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

export interface HabitCalendarDay {
  date: string;
  completed: boolean;
  targetCount?: number;
  completedCount?: number;
  timestamp?: number;
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

export interface FocusTimerData {
  dailyRecords: DailyFocusRecord[];
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
      return { dailyRecords: [] };
    }
    
    const data = await plugin.loadData('Pinch-focus-timer.json');
    
    if (data) {
      const parsed: FocusTimerData = typeof data === 'string' ? JSON.parse(data) : data;
      
      if (!parsed.dailyRecords || !Array.isArray(parsed.dailyRecords)) {
        return { dailyRecords: [] };
      }
      
      return parsed;
    } else {
      // 文件不存在时返回空结构，避免首启报错
      return { dailyRecords: [] };
    }
  } catch (error) {
    console.error('Error reading focus timer data:', error);
    // 读取失败时返回空结构
    return { dailyRecords: [] };
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
    await plugin.saveData('Pinch-focus-timer.json', data);
  } catch (error) {
    console.error('Error saving focus timer data:', error);
    throw error;
  }
}

export async function addFocusSession(duration: number): Promise<void> {
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
  CACHE_VERSION: 4,
  CACHE_DURATION: 10 * 60 * 1000,
  BATCH_SIZE: 10,
  SQL_PAGE_SIZE: 1000,
  MAX_SQL_SCAN: 20000,
  MAX_SUBTASK_DEPTH: 10,
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
  subtasks?: SubTask[];
}

export interface EmojiConfig {
  [key: string]: unknown;
  [key: number]: unknown;
}

export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled';
export type TaskPriority = 'none' | 'high' | 'medium' | 'low';
export type TaskType = 'standalone' | 'block';

export interface Task {
  id: string;
  type: TaskType;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  startDate?: string;
  dueTime?: string;
  startTime?: string;
  tags: string[];
  description?: string;
  subtasks?: SubTask[];
  blockId?: string;
  rootId?: string;
  hPath?: string;
  notebookId?: string;
  icon?: string;
  backgroundColor?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  repeatSeriesId?: string;
  repeatFrequency?: RepeatFrequency;
  repeatInstanceDate?: string;
  isVirtual?: boolean;
}

export interface TaskQueryScope {
  notebookId?: string;
  documentId?: string;
  includeCompleted?: boolean;
}

export interface TaskFetchOptions {
  useLiveDom?: boolean;
}

function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export class TaskRepository {
  private static memoryCache: {
    tasks: Task[] | null;
    timestamp: number;
  } = { tasks: null, timestamp: 0 };
  private static blockTasksFetchPromise: Promise<Task[]> | null = null;
  private static scopedMemoryCache = new Map<string, { tasks: Task[]; timestamp: number }>();
  private static scopedBlockTasksFetchPromises = new Map<string, Promise<Task[]>>();
  private static excludedNotebookIds = new Set<string>();
  
  private static readonly MEMORY_CACHE_DURATION = 5000; // 5 秒内存缓存
  private static readonly SCOPED_MEMORY_CACHE_DURATION = 60000; // 60 秒筛选范围缓存
  private static readonly SCOPED_CACHE_MAX_ENTRIES = 30;
  private static normalizeNotebookIds(notebookIds: string[]): string[] {
    return Array.from(
      new Set(
        notebookIds
          .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
          .map(id => id.trim())
      )
    ).sort();
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
    if (!notebookId && !documentId && includeCompleted) {
      return null;
    }
    return { notebookId, documentId, includeCompleted };
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

  private static buildScopeCacheKey(scope: TaskQueryScope | null, useLiveDom: boolean = true): string {
    const notebookKey = scope?.notebookId || '*';
    const documentKey = scope?.documentId || '*';
    const includeCompletedKey = scope?.includeCompleted === false ? 'open-only' : 'all-status';
    const excludedKey = this.getExcludedNotebookIdsSorted().join(',');
    const domKey = useLiveDom ? 'live-dom' : 'api-dom-only';
    return `${notebookKey}|${documentKey}|${includeCompletedKey}|${excludedKey}|${domKey}`;
  }

  private static setScopedMemoryCache(key: string, tasks: Task[]): void {
    if (this.scopedMemoryCache.has(key)) {
      this.scopedMemoryCache.delete(key);
    }
    this.scopedMemoryCache.set(key, {
      tasks,
      timestamp: Date.now()
    });

    while (this.scopedMemoryCache.size > this.SCOPED_CACHE_MAX_ENTRIES) {
      const oldestKey = this.scopedMemoryCache.keys().next().value;
      if (!oldestKey) break;
      this.scopedMemoryCache.delete(oldestKey);
    }
  }

  static setExcludedNotebookIds(notebookIds: string[] = []): void {
    const normalized = this.normalizeNotebookIds(notebookIds);
    const current = this.getExcludedNotebookIdsSorted();
    if (normalized.length === current.length && normalized.every((id, index) => id === current[index])) {
      return;
    }

    this.excludedNotebookIds = new Set(normalized);
    this.memoryCache = { tasks: null, timestamp: 0 };
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

  private static parseBlockDateTime(value: string | undefined): string {
    try {
      if (!value) return new Date().toISOString();
      if (/^\d{14}$/.test(value)) {
        const year = Number(value.slice(0, 4));
        const month = Number(value.slice(4, 6)) - 1;
        const day = Number(value.slice(6, 8));
        const hour = Number(value.slice(8, 10));
        const minute = Number(value.slice(10, 12));
        const second = Number(value.slice(12, 14));
        return new Date(year, month, day, hour, minute, second).toISOString();
      }
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return new Date().toISOString();
      return date.toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  private static parseTaskStatus(
    attrs: Record<string, string>,
    markdown: string,
    completedByDOM: boolean | null
  ): TaskStatus {
    const validStatuses: TaskStatus[] = ['pending', 'in-progress', 'completed', 'cancelled'];
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
    const cleanHtmlStyle = (html: string) => html.replace(/\{:\s*style="[^"]*"\}/g, '');

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
    return materializeRepeatTasks(blockTasks, {
      pastDays: 60,
      futureDays: 120
    });
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

    const cachedExcludedNotebookIds = this.normalizeNotebookIds(
      Array.isArray(data.excludedNotebookIds) ? data.excludedNotebookIds : []
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
      icon: unicodeToEmoji(t.icon)
    }));

    this.memoryCache = { tasks, timestamp: now };
    return tasks;
  }

  static async getCachedTasksOnly(): Promise<Task[]> {
    const cachedBlockTasks = await this.getCachedBlockTasks();
    if (!cachedBlockTasks) {
      return [];
    }

    return materializeRepeatTasks(cachedBlockTasks, {
      pastDays: 60,
      futureDays: 120
    });
  }
  
  static async getBlockTasks(
    useCache: boolean = true,
    scope?: TaskQueryScope,
    options: TaskFetchOptions = {}
  ): Promise<Task[]> {
    const normalizedScope = this.normalizeTaskQueryScope(scope);
    const useLiveDom = options.useLiveDom !== false;
    const isScopedQuery = !!normalizedScope;
    const now = Date.now();

    // 1. 内存缓存
    if (!isScopedQuery && useCache && this.memoryCache.tasks &&
      now - this.memoryCache.timestamp < this.MEMORY_CACHE_DURATION) {
      return this.memoryCache.tasks;
    }
    
    // 2. 磁盘缓存
    if (!isScopedQuery && useCache) {
      const cachedTasks = await this.getCachedBlockTasks();
      if (cachedTasks) {
        return cachedTasks;
      }
    }

    if (isScopedQuery) {
      const scopedCacheKey = this.buildScopeCacheKey(normalizedScope, useLiveDom);
      if (useCache) {
        const scopedCached = this.scopedMemoryCache.get(scopedCacheKey);
        if (scopedCached && now - scopedCached.timestamp < this.SCOPED_MEMORY_CACHE_DURATION) {
          return scopedCached.tasks;
        }
      }

      const scopedInFlight = this.scopedBlockTasksFetchPromises.get(scopedCacheKey);
      if (scopedInFlight) {
        return scopedInFlight;
      }

      const scopedFetchPromise = (async () => {
        const tasks = await this.fetchBlockTasks(normalizedScope, useLiveDom);
        if (useCache) {
          this.setScopedMemoryCache(scopedCacheKey, tasks);
        }
        return tasks;
      })();
      this.scopedBlockTasksFetchPromises.set(scopedCacheKey, scopedFetchPromise);

      try {
        return await scopedFetchPromise;
      } finally {
        this.scopedBlockTasksFetchPromises.delete(scopedCacheKey);
      }
    }

    // 3. 全量查询并回写缓存（in-flight 去重，避免并发全量扫描）
    if (this.blockTasksFetchPromise) {
      return this.blockTasksFetchPromise;
    }

    this.blockTasksFetchPromise = (async () => {
      const tasks = await this.fetchBlockTasks(null, useLiveDom);
      await this.saveBlockTasksCache(tasks);
      this.memoryCache = { tasks, timestamp: Date.now() };
      return tasks;
    })();

    try {
      return await this.blockTasksFetchPromise;
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
        SELECT b.id, b.content, b.box, b.hpath, b.updated, b.created, b.markdown, b.parent_id, b.root_id, b.type, b.subtype, b.memo,
               GROUP_CONCAT(CASE WHEN a.name = 'custom-task-id' THEN a.value END) as custom_task_id,
               GROUP_CONCAT(CASE WHEN a.name = 'custom-task-priority' THEN a.value END) as custom_task_priority,
               GROUP_CONCAT(CASE WHEN a.name = 'custom-task-status' THEN a.value END) as custom_task_status,
               GROUP_CONCAT(CASE WHEN a.name = 'custom-task-due-date' THEN a.value END) as custom_task_due_date,
               GROUP_CONCAT(CASE WHEN a.name = 'custom-task-due-time' THEN a.value END) as custom_task_due_time,
               GROUP_CONCAT(CASE WHEN a.name = 'custom-task-start-date' THEN a.value END) as custom_task_start_date,
               GROUP_CONCAT(CASE WHEN a.name = 'custom-task-start-time' THEN a.value END) as custom_task_start_time,
               GROUP_CONCAT(CASE WHEN a.name = 'custom-task-tags' THEN a.value END) as custom_task_tags,
               GROUP_CONCAT(CASE WHEN a.name = 'custom-task-description' THEN a.value END) as custom_task_description,
               GROUP_CONCAT(CASE WHEN a.name = 'custom-task-background-color' THEN a.value END) as custom_task_background_color
        FROM blocks b
        LEFT JOIN attributes a ON b.id = a.block_id
          AND a.name IN ('custom-task-id', 'custom-task-priority', 'custom-task-status', 'custom-task-due-date', 'custom-task-due-time', 'custom-task-start-date', 'custom-task-start-time', 'custom-task-tags', 'custom-task-description', 'custom-task-background-color')
        WHERE b.id IN (${idsClause})
          ${this.buildNotebookScopeSql('b')}
          ${this.buildTaskQueryScopeSql(scope, 'b')}
          AND (b.type = 'i' OR b.type = 'p')
          AND b.subtype = 't'
          ${this.buildTaskCompletionSql(scope?.includeCompleted, 'b')}
        GROUP BY b.id, b.content, b.box, b.hpath, b.updated, b.created, b.markdown, b.parent_id, b.root_id, b.type, b.subtype, b.memo
      `) as any[];

      if (!rows || rows.length === 0) {
        return new Map();
      }

      const rootIds = Array.from(new Set(rows.map(row => row.root_id).filter((id): id is string => !!id)));
      const rootIcons = new Map<string, string>();
      if (rootIds.length > 0) {
        const rootAttrs = await batchGetBlockAttrs(rootIds);
        rootAttrs.forEach((attrs, rootId) => {
          if (attrs?.icon) {
            rootIcons.set(rootId, unicodeToEmoji(attrs.icon));
          }
        });
      }

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
          'custom-task-background-color': row.custom_task_background_color
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

        let tags: string[] = [];
        if (attrs['custom-task-tags']) {
          try {
            tags = JSON.parse(attrs['custom-task-tags']);
          } catch {
            tags = [];
          }
        }

        const subtasks = this.parseSubtasksFromParsedDoc(doc, row.id);

        result.set(row.id, {
          id: attrs['custom-task-id'] || `block_${row.id}`,
          type: 'block',
          blockId: row.id,
          rootId: row.root_id,
          title,
          status,
          priority: attrs['custom-task-priority'] as TaskPriority || 'none',
          dueDate: attrs['custom-task-due-date'],
          dueTime: attrs['custom-task-due-time'],
          startDate: attrs['custom-task-start-date'],
          startTime: attrs['custom-task-start-time'],
          tags,
          description: attrs['custom-task-description'] || '',
          hPath: row.hpath,
          notebookId: row.box,
          icon: row.root_id ? (rootIcons.get(row.root_id) || '\uD83D\uDCC4') : '\uD83D\uDCC4',
          backgroundColor: attrs['custom-task-background-color'],
          subtasks: subtasks.length > 0 ? subtasks : undefined,
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
    useLiveDom: boolean = true
  ): Promise<Task[]> {
    const tasks: Task[] = [];
    const BATCH_SIZE = TASK_CONFIG.BATCH_SIZE;
    const shouldFilterTopLevelCompleted = !useLiveDom && scope?.includeCompleted === false;
    
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
                 GROUP_CONCAT(CASE WHEN a.name = 'custom-task-background-color' THEN a.value END) as custom_task_background_color
          FROM blocks b
          LEFT JOIN attributes a ON b.id = a.block_id
            AND a.name IN ('custom-task-id', 'custom-task-priority', 'custom-task-status', 'custom-task-due-date', 'custom-task-due-time', 'custom-task-start-date', 'custom-task-start-time', 'custom-task-tags', 'custom-task-description', 'custom-task-background-color')
          WHERE (b.type = 'i' OR b.type = 'p')
            ${this.buildNotebookScopeSql('b')}
            ${this.buildTaskQueryScopeSql(scope, 'b')}
            AND b.subtype = 't'
            ${completionSqlForTree}
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
          'custom-task-background-color': block.custom_task_background_color
        });
      });
      
      const rootIds = Array.from(rootIdSet);
      const rootIcons = new Map<string, string>();
      const taskBlockById = new Map<string, SiyuanBlock>();
      const subtaskChildIdsByParentTask = new Map<string, string[]>();
      const sqlSubtasksMemo = new Map<string, SubTask[]>();
      
      if (rootIds.length > 0) {
        try {
          const rootAttrsList = await batchGetBlockAttrs(rootIds);
          rootAttrsList.forEach((attrs, rootId) => {
            const icon = attrs['icon'];
            if (icon) {
              const convertedIcon = unicodeToEmoji(icon);
              rootIcons.set(rootId, convertedIcon);
            }
          });
        } catch (error) {
          console.error('[TaskRepository] 获取文档图标失败:', error);
        }
      }

      allBlocks.forEach((block) => {
        taskBlockById.set(block.id, block);
      });

      const buildFastTitleFromBlock = (block: SiyuanBlock): string => {
        const cleanInlineStyleMarker = (text: string) =>
          text.replace(/\s*\{:\s*style="[^"]*"\}\s*/g, ' ').trim();
        const convertMarkdownStrong = (text: string) =>
          text
            .replace(/\*\*\*([^*]+)\*\*\*/g, '<span data-type="strong em">$1</span>')
            .replace(/___([^_]+)___/g, '<span data-type="strong em">$1</span>')
            .replace(/\*\*([^*]+)\*\*/g, '<span data-type="strong">$1</span>')
            .replace(/__([^_]+)__/g, '<span data-type="strong">$1</span>');

        const markdown = typeof block.markdown === 'string' ? block.markdown : '';
        const firstLine = markdown
          .split('\n')
          .map(line => line.trim())
          .find(line => line.length > 0) || '';
        const titleFromMarkdown = convertMarkdownStrong(cleanInlineStyleMarker(firstLine
          .replace(/^\s*[-*]\s*(?:\{:[^}]*\})?\s*\[(x|X| )\]\s*/i, '')
          .trim()));
        if (titleFromMarkdown.length > 0) {
          return titleFromMarkdown;
        }

        const contentTitle = typeof block.content === 'string' ? block.content.trim() : '';
        return convertMarkdownStrong(cleanInlineStyleMarker(contentTitle));
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

      if (!useLiveDom) {
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

        if (parentTaskIdsNeedDomOrder.length > 0) {
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

          const markdown = typeof childBlock.markdown === 'string' ? childBlock.markdown : '';
          const markdownMatch = markdown.match(/\[(x|X| )\]/);
          const completed = !!markdownMatch && (markdownMatch[1] === 'x' || markdownMatch[1] === 'X');
          const title = buildFastTitleFromBlock(childBlock) || 'Untitled';
          const nestedSubtasks = buildSqlSubtasksForParent(childId, path);

          subtasks.push({
            id: `sub_${childId}`,
            title,
            completed,
            nodeId: childId,
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

            const validStatuses = ['pending', 'in-progress', 'completed', 'cancelled'];
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

            const sqlSubtasks = buildSqlSubtasksForParent(parentBlock.id);
            const subtasks = sqlSubtasks.length > 0 ? sqlSubtasks : undefined;
            markSubtaskNodesProcessed(subtasks);
            const docIcon = parentBlock.root_id ? rootIcons.get(parentBlock.root_id) : undefined;
            return {
              id: taskId,
              type: 'block',
              blockId: parentBlock.id,
              rootId: parentBlock.root_id,
              title: buildFastTitleFromBlock(parentBlock),
              status,
              priority: attrs['custom-task-priority'] as any || 'none',
              dueDate: attrs['custom-task-due-date'],
              dueTime: attrs['custom-task-due-time'],
              startDate: attrs['custom-task-start-date'],
              startTime: attrs['custom-task-start-time'],
              tags,
              description: attrs['custom-task-description'] || '',
              hPath: parentBlock.hpath,
              notebookId: parentBlock.box,
              icon: docIcon || '📄',
              backgroundColor: attrs['custom-task-background-color'],
              subtasks,
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
          
          const cleanHtmlStyle = (html: string) => html.replace(/\{:\s*style="[^"]*"\}/g, '');
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
          
          const validStatuses = ['pending', 'in-progress', 'completed', 'cancelled'];
          
          const attrStatus = attrs['custom-task-status'] as 'pending' | 'in-progress' | 'completed' | 'cancelled' | undefined;
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
          
          return {
            id: taskId,
            type: 'block',
            blockId: parentBlock.id,
            rootId: parentBlock.root_id,
            title: title,
            status: status,
            priority: attrs['custom-task-priority'] as any || 'none',
            dueDate: attrs['custom-task-due-date'],
            dueTime: attrs['custom-task-due-time'],
            startDate: attrs['custom-task-start-date'],
            startTime: attrs['custom-task-start-time'],
            tags: attrs['custom-task-tags'] ? JSON.parse(attrs['custom-task-tags']) : [],
            description: attrs['custom-task-description'] || '',
            hPath: parentBlock.hpath,
            notebookId: parentBlock.box,
            icon: docIcon || '📄',
            backgroundColor: attrs['custom-task-background-color'],
            subtasks: subtasks.length > 0 ? subtasks : undefined,
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
    
      for (const chunk of chunks) {
        const domMap = useLiveDom
          ? await batchGetBlockDOM(chunk.map(block => block.id))
          : new Map<string, BlockDOMResponse>();
        
        const results = await Promise.all(chunk.map(block => processBlock(block, domMap)));
        const validResults = results.filter((result): result is Task => result !== null);
        tasks.push(...validResults);
      }
      } catch (error) {
        handleError('获取任务列表失败', error);
      }
      
      if (shouldFilterTopLevelCompleted) {
        return tasks.filter(task => task.status !== 'completed');
      }
      return tasks;
    }

  public static async saveBlockTasksCache(tasks: Task[]): Promise<void> {
    const plugin = usePlugin();
    await plugin.saveData('stand-block-tasks-cache.json', {
      version: TASK_CONFIG.CACHE_VERSION,
      tasks,
      excludedNotebookIds: this.getExcludedNotebookIdsSorted(),
      updatedAt: new Date().toISOString()
    });
    this.memoryCache = { tasks, timestamp: Date.now() };
  }
  
  static async clearCache(): Promise<void> {
    const plugin = usePlugin();
    await plugin.saveData('stand-block-tasks-cache.json', {});
    this.memoryCache = { tasks: null, timestamp: 0 };
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

    if (task.dueDate) {
      attrs['custom-task-due-date'] = task.dueDate;
    }

    if (task.tags && task.tags.length > 0) {
      attrs['custom-task-tags'] = JSON.stringify(task.tags);
    }

    if (task.description && task.description.trim()) {
      attrs['custom-task-description'] = task.description.trim();
    }

    if (task.status && task.status !== 'pending') {
      attrs['custom-task-status'] = task.status;
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
      
      const result = await appendBlock('markdown', taskMarkdown, rootId);
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

        if (!listItemBlockId) {
          const parentBlockId = result[0].doOperations[result[0].doOperations.length - 1]?.id || result[0].doOperations[0].id;
          log_debug('回退到父块查询子任务块', parentBlockId);
          
          const childBlocks = await sql(`
            SELECT id, type, subtype
            FROM blocks
            WHERE parent_id = '${parentBlockId}' 
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
            WHERE root_id = '${rootId}' 
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

        const createResult = {
          taskId: attrs['custom-task-id'],
          blockId: listItemBlockId || result[0].doOperations[0].id
        };

        eventBus.emit('task-added', createResult);

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
      attrsToUpdate['custom-task-status'] = updates.status || '';
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
    if (updates.description !== undefined) {
      attrsToUpdate['custom-task-description'] = updates.description || '';
    }
    if (updates.backgroundColor !== undefined) {
      attrsToUpdate['custom-task-background-color'] = updates.backgroundColor || '';
    }

    if (Object.keys(attrsToUpdate).length === 0) {
      return;
    }

    await setBlockAttrs(blockId, attrsToUpdate);
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
    let cachedTasks = this.memoryCache.tasks;

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
        if (this.memoryCache.tasks && now - this.memoryCache.timestamp < this.MEMORY_CACHE_DURATION) {
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

      if (enrichedTaskMap.size > 0 && this.memoryCache.tasks) {
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
          timestamp: Date.now()
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
