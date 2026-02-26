/**
 * Copyright (c) 2023 frostime. All rights reserved.
 * https://github.com/frostime/sy-plugin-template-vite
 *
 * See API Document in [API.md](https://github.com/siyuan-note/siyuan/blob/master/API.md)
 * API 譁・｡｣隗・[API_zh_CN.md](https://github.com/siyuan-note/siyuan/blob/master/API_zh_CN.md)
 */

import { fetchSyncPost, IWebSocketData } from "siyuan";
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

function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export class TaskRepository {
  private static memoryCache: {
    tasks: Task[] | null;
    timestamp: number;
  } = { tasks: null, timestamp: 0 };
  
  private static readonly MEMORY_CACHE_DURATION = 5000; // 5 秒内存缓存
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

  private static parseSubtasksFromDOM(domString: string, parentBlockId: string): SubTask[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(domString, 'text/html');
    const cleanHtmlStyle = (html: string) => html.replace(/{: style="[^"]*"}/g, '');

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

  static async getAllTasks(useCache: boolean = true): Promise<Task[]> {
    const blockTasks = await this.getBlockTasks(useCache);
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
  
  static async getBlockTasks(useCache: boolean = true): Promise<Task[]> {
    const now = Date.now();

    // 1. 内存缓存
    if (useCache && this.memoryCache.tasks &&
      now - this.memoryCache.timestamp < this.MEMORY_CACHE_DURATION) {
      return this.memoryCache.tasks;
    }
    
    // 2. 磁盘缓存
    if (useCache) {
      const cachedTasks = await this.getCachedBlockTasks();
      if (cachedTasks) {
        return cachedTasks;
      }
    }

    // 3. 全量查询并回写缓存
    const tasks = await this.fetchBlockTasks();
    await this.saveBlockTasksCache(tasks);
    this.memoryCache = { tasks, timestamp: now };
    return tasks;
  }

  private static async fetchBlockTasksByIds(blockIds: string[]): Promise<Map<string, Task>> {
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
          AND (b.type = 'i' OR b.type = 'p')
          AND b.subtype = 't'
          AND (b.markdown LIKE '%[ ]%' OR b.markdown LIKE '%[x]%')
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
      const protyleElement = document.querySelector('.protyle');
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

        const currentElement =
          protyleElement?.querySelector(`[data-node-id="${row.id}"][data-type="NodeListItem"]`)
          || protyleElement?.querySelector(`[data-node-id="${row.id}"]`)
          || document.querySelector(`[data-node-id="${row.id}"][data-type="NodeListItem"]`)
          || document.querySelector(`[data-node-id="${row.id}"]`);
        const currentParagraph = currentElement?.querySelector('[data-type="NodeParagraph"] [contenteditable="true"]');
        const title = currentParagraph?.innerHTML || titleFromApi;

        const currentAction = this.getTaskActionElement(currentElement, row.id);
        const currentSvg = currentAction?.querySelector('use');
        const currentHref = currentSvg?.getAttribute('xlink:href') || currentSvg?.getAttribute('href') || '';
        const completedByDOM = currentHref ? currentHref === '#iconCheck' : null;
        const status = this.parseTaskStatus(attrs, row.markdown || '', completedByDOM);

        let tags: string[] = [];
        if (attrs['custom-task-tags']) {
          try {
            tags = JSON.parse(attrs['custom-task-tags']);
          } catch {
            tags = [];
          }
        }

        const subtasks = this.parseSubtasksFromDOM(dom.dom, row.id);

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
  
  private static async fetchBlockTasks(): Promise<Task[]> {
    const tasks: Task[] = [];
    const BATCH_SIZE = TASK_CONFIG.BATCH_SIZE;
    
    try {
      const nodeListBlocksPromise = sql(`
        SELECT id, parent_id, type
        FROM blocks
        WHERE type = 'l' AND subtype = 't'
      `);

      const taskBlocks: SiyuanBlock[] = [];
      const pageSize = TASK_CONFIG.SQL_PAGE_SIZE;
      const maxScan = TASK_CONFIG.MAX_SQL_SCAN;

      for (let offset = 0; offset < maxScan; offset += pageSize) {
        const page = await sql(`
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
          WHERE (b.type = 'i' OR b.type = 'p')
            AND b.subtype = 't'
            AND (b.markdown LIKE '%[ ]%' OR b.markdown LIKE '%[x]%')
          GROUP BY b.id, b.content, b.box, b.hpath, b.updated, b.created, b.markdown, b.parent_id, b.root_id, b.type, b.subtype, b.memo
          ORDER BY b.root_id, b.box, b.path, b.id
          LIMIT ${pageSize} OFFSET ${offset}
        `) as any[];

        if (!Array.isArray(page) || page.length === 0) {
          break;
        }

        taskBlocks.push(...(page as SiyuanBlock[]));

        if (page.length < pageSize) {
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
      const paragraphMap = new Map<string, string>();
      const rootIdSet = new Set<string>();
      
      nodeListBlocks.forEach((block: SiyuanBlock) => {
        if (block.type === 'l') {
          nodeListMap.set(block.id, block.parent_id);
        } else if (block.type === 'p') {
          paragraphMap.set(block.id, block.parent_id);
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
        const paragraphParentId = paragraphMap.get(currentParentId);
        
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
        
        if (!subtaskIds.has(block.id)) {
          if (paragraphParentId && allBlockIds.has(paragraphParentId)) {
            subtaskIds.add(block.id);
          }
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
      
      const protyleElement = document.querySelector('.protyle');
      
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
      
      const processBlock = async (
        parentBlock: SiyuanBlock, 
        domMap: Map<string, BlockDOMResponse>
      ): Promise<Task | null> => {
        if (processedIds.has(parentBlock.id)) return null;
        
        processedIds.add(parentBlock.id);
        
        const attrs = blockAttrsMap.get(parentBlock.id) || {};
        const taskId = attrs['custom-task-id'] || `block_${parentBlock.id}`;
        
        try {
          const dom = domMap.get(parentBlock.id);
          if (!dom) {
            log_debug('未获取到 DOM 数据', { blockId: parentBlock.id });
            return null;
          }
          
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
          const currentTitle = currentParagraph?.innerHTML || '';
          
          const currentAction = this.getTaskActionElement(elementToUse, parentBlock.id);
          
          const currentSvg = currentAction?.querySelector('use');
          
          let isCurrentCompleted: boolean | undefined;
          if (currentSvg) {
            const currentHref = currentSvg.getAttribute('xlink:href') || currentSvg.getAttribute('href');
            isCurrentCompleted = currentHref === '#iconCheck';
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
          
          const parseDate = (dateValue: string | undefined): string => {
            try {
              if (!dateValue) return new Date().toISOString();
              const date = new Date(dateValue);
              if (isNaN(date.getTime())) return new Date().toISOString();
              return date.toISOString();
            } catch {
              return new Date().toISOString();
            }
          };
          
          const cleanHtmlStyle = (html: string) => html.replace(/{: style="[^"]*"}/g, '');
          
          const parseSubtasksFromDOM = async (domString: string, parentId: string = parentBlock.id): Promise<SubTask[]> => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(domString, 'text/html');
            
            const parseListItem = async (listItem: Element, level: number = 0): Promise<SubTask | null> => {
              const nodeId = listItem.getAttribute('data-node-id');
              if (!nodeId) return null;
              
              const action = listItem.querySelector('.protyle-action--task');
              if (!action) return null;
              
              const svg = action.querySelector('use');
              let isCompleted = svg?.getAttribute('xlink:href') === '#iconCheck';
              
              const paragraph = listItem.querySelector('[data-type="NodeParagraph"]');
              const editableDiv = paragraph?.querySelector('[contenteditable="true"]');
              const paragraphHtml = editableDiv?.innerHTML || paragraph?.innerHTML || '';
              const titleFromApi = cleanHtmlStyle(paragraphHtml);
              
              let title = titleFromApi;
              let finalCompleted = isCompleted;
              
              if (protyleElement) {
                const currentItemElement = protyleElement.querySelector(`[data-node-id="${nodeId}"][data-type="NodeListItem"]`);
                const currentParagraph = currentItemElement?.querySelector('[data-type="NodeParagraph"]');
                const currentEditableDiv = currentParagraph?.querySelector('[contenteditable="true"]');
                const currentHtml = currentEditableDiv?.innerHTML || currentParagraph?.innerHTML || '';
                const currentCleanHtml = cleanHtmlStyle(currentHtml);
                
                if (currentCleanHtml) {
                  title = currentCleanHtml;
                }
                
                const currentAction = currentItemElement?.querySelector('.protyle-action--task');
                const currentSvg = currentAction?.querySelector('use');
                const isCurrentCompleted = currentSvg?.getAttribute('xlink:href') === '#iconCheck';
                
                if (typeof isCurrentCompleted === 'boolean') {
                  finalCompleted = isCurrentCompleted;
                }
              }
              
              processedIds.add(nodeId);
              
              const subList = listItem.querySelector('.list');
              let subtasks: any[] = [];
              if (subList) {
                subtasks = await parseSubtasksList(subList, level + 1);
              }
              
              return {
                id: `sub_${nodeId}`,
                title: title || 'Untitled',
                completed: finalCompleted,
                nodeId: nodeId,
                subtasks: subtasks.length > 0 ? subtasks : undefined
              };
            };
            
            const parseSubtasksList = async (listElement: Element, level: number = 0): Promise<SubTask[]> => {
              const listItems = Array.from(listElement.children).filter((child): child is Element => 
                child instanceof Element && child.getAttribute('data-type') === 'NodeListItem'
              );
              
              const subtasks: SubTask[] = [];
              for (const listItem of listItems) {
                const subtask = await parseListItem(listItem, level);
                if (subtask) {
                  subtasks.push(subtask);
                }
              }
              return subtasks;
            };
            
            const rootListElements = Array.from(doc.querySelectorAll('.list')).filter(list => {
              const parent = list.parentElement;
              return parent?.getAttribute('data-type') === 'NodeParagraph' || 
                     parent?.classList?.contains('protyle-wysiwyg');
            });
            
            let subtasks: SubTask[] = [];
            if (rootListElements.length > 0) {
              for (const rootList of rootListElements) {
                const listSubtasks = await parseSubtasksList(rootList, 0);
                subtasks = subtasks.concat(listSubtasks);
              }
            } else {
              const fallbackList = doc.querySelector('.list');
              if (fallbackList) {
                subtasks = await parseSubtasksList(fallbackList, 0);
              }
            }
            
            return subtasks;
          };
          
          const subtasks = await parseSubtasksFromDOM(dom.dom, parentBlock.id);
          
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
            createdAt: parseDate(parentBlock.created),
            updatedAt: parseDate(parentBlock.updated)
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
        const blockIds = chunk.map(block => block.id);
        const domMap = await batchGetBlockDOM(blockIds);
        
        const results = await Promise.all(chunk.map(block => processBlock(block, domMap)));
        const validResults = results.filter((result): result is Task => result !== null);
        tasks.push(...validResults);
      }
      } catch (error) {
        handleError('获取任务列表失败', error);
      }
      
      return tasks;
    }

  public static async saveBlockTasksCache(tasks: Task[]): Promise<void> {
    const plugin = usePlugin();
    await plugin.saveData('stand-block-tasks-cache.json', {
      version: TASK_CONFIG.CACHE_VERSION,
      tasks,
      updatedAt: new Date().toISOString()
    });
    this.memoryCache = { tasks, timestamp: Date.now() };
  }
  
  static async clearCache(): Promise<void> {
    const plugin = usePlugin();
    await plugin.saveData('stand-block-tasks-cache.json', {});
    this.memoryCache = { tasks: null, timestamp: 0 };
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
      const taskMap = await this.getTasksByBlockIds([blockId], useCache);
      return taskMap.get(blockId) || null;
    } catch (error) {
      handleError('按 blockId 获取任务失败', error, { blockId });
      return null;
    }
  }
  
  static async getTasksByBlockIds(blockIds: string[], useCache: boolean = false): Promise<Map<string, Task>> {
    try {
      const normalizedIds = Array.from(new Set(blockIds.filter(id => typeof id === 'string' && id.length > 0)));
      if (normalizedIds.length === 0) {
        return new Map();
      }

      if (useCache) {
        const now = Date.now();
        if (this.memoryCache.tasks && now - this.memoryCache.timestamp < this.MEMORY_CACHE_DURATION) {
          const fromMemory = new Map<string, Task>();
          for (const blockId of normalizedIds) {
            const task = this.memoryCache.tasks.find(t => t.blockId === blockId);
            if (task) {
              fromMemory.set(blockId, task);
            }
          }
          if (fromMemory.size === normalizedIds.length) {
            return fromMemory;
          }
        }
      }

      const taskMap = await this.fetchBlockTasksByIds(normalizedIds);
      const enrichedTasks = await attachRepeatMetadataToTasks(Array.from(taskMap.values()));
      const enrichedTaskMap = new Map<string, Task>();
      enrichedTasks.forEach((task) => {
        if (task.blockId) {
          enrichedTaskMap.set(task.blockId, task);
        }
      });

      if (enrichedTaskMap.size > 0 && this.memoryCache.tasks) {
        const cachedMap = new Map(
          this.memoryCache.tasks
            .filter(task => task.type === 'block' && !!task.blockId)
            .map(task => [task.blockId as string, task])
        );
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

