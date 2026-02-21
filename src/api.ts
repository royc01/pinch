/**
 * Copyright (c) 2023 frostime. All rights reserved.
 * https://github.com/frostime/sy-plugin-template-vite
 *
 * See API Document in [API.md](https://github.com/siyuan-note/siyuan/blob/master/API.md)
 * API 文档见 [API_zh_CN.md](https://github.com/siyuan-note/siyuan/blob/master/API_zh_CN.md)
 */

import { fetchSyncPost, IWebSocketData } from "siyuan";
import { eventBus } from "@/utils/eventBus";

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

// 检查当前文件状态的函数，用于调试同步问题
export async function checkHabitFileStatus() {
  
  try {
    const fileData = await getFile('/data/storage/petal/Pinch-habit/Pinch-habit.json');

    
    if (typeof fileData === 'object' && fileData !== null && Array.isArray(fileData)) {

      
      // 特别检查特定习惯的数据
      const testHabit = fileData.find(h => h.name === '222');
      if (testHabit) {

      }
    }
  } catch (error) {
    console.error('检查文件状态时出错:', error);
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

// 获取思源笔记内置 emoji 配置
export async function getEmojiConf(): Promise<any> {
  let url = "/api/system/getEmojiConf";
  return request(url, {});
}

// **************************************** Habit Tracker ****************************************

// 从main.ts导入插件实例
import { usePlugin } from '@/main';

// 定义习惯接口
export interface Habit {
  id: string;
  name: string;
  emoji?: string; // 习惯的emoji图标
  frequency: 'daily' | 'weekly' | 'custom' | 'weekly1' | 'weekly2' | 'weekly3' | 'weekly4' | 'weekly5' | 'weekly6';
  timesPerDay?: number; // 每天需要完成的次数
  completedToday: boolean;
  currentStreak: number;
  totalCompletions: number;
  calendar: HabitCalendarDay[];
  createdAt: string;
  // 习惯项的视图模式（固定为周视图）
  currentWeekOffset?: number; // 当前显示的周偏移量
  // 统计页面的视图模式
  statsViewMode?: 'month'; // 统计页面的视图模式（目前只支持月视图）
  statsMonthOffset?: number; // 统计页面当前显示的月偏移量
  usePomodoro?: boolean; // 是否使用番茄钟
  pomodoroDuration?: number; // 番茄钟时长（分钟）
  pomodoroTimer?: number; // 番茄钟计时器ID
  pomodoroRemaining?: number; // 番茄钟剩余时间（秒）
  pomodoroState?: 'work' | 'shortBreak' | 'longBreak'; // 番茄钟状态：工作/短休息/长休息
  isPaused?: boolean; // 习惯是否暂停
  isPomodoroPaused?: boolean; // 番茄钟是否暂停
}

export interface HabitCalendarDay {
  date: string; // YYYY-MM-DD
  completed: boolean;
  targetCount?: number; // 目标完成次数
  completedCount?: number; // 实际完成次数
  timestamp?: number; // 时间戳，用于精确判断日期
  // 移除动态的isToday标志，改为基于当前日期计算
}

// 获取习惯数据
export async function getHabits(): Promise<Habit[]> {
  try {
    // 使用思源笔记插件的 loadData 方法来存储习惯数据
    const plugin = usePlugin();
    if (!plugin) {
      console.error('插件实例未初始化');
      return [];
    }
    
    const data = await plugin.loadData('Pinch-habit.json');

    
    if (data) {
      // 如果数据存在且有内容，解析并返回
      let parsed: Habit[] = Array.isArray(data) ? data : JSON.parse(data);
      
      // 更新日历数据中的completedToday标志，因为存储的数据中的completedToday可能已过时
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      parsed = parsed.map((habit: Habit) => {
        // 不再更新存储的isToday标志，而是保持原始数据
        // 日期相关的判断将在组件中基于当前日期动态计算
        
        // 重新计算completedToday标志（基于当前日期）
        const todayRecord = habit.calendar.find(day => day.date === todayStr);
        habit.completedToday = todayRecord ? todayRecord.completed : false;
        
        return habit;
      });
      
      return parsed;
    } else {
    }
  } catch (error) {
    console.error('Error reading habits:', error);
    // 如果读取失败，返回空数组
    return [];
  }
  
  // 如果没有数据或出错，返回默认空数组
  return [];
}

// 保存习惯数据
export async function saveHabits(habits: Habit[]): Promise<void> {
  try {
    // 使用思源笔记插件的 saveData 方法来存储习惯数据
    const plugin = usePlugin();
    if (!plugin) {
      console.error('插件实例未初始化');
      throw new Error('插件实例未初始化');
    }
    
    // 在保存前更新completedToday标志，确保保存的数据中的completedToday标志是正确的
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const habitsToSave = habits.map(habit => {
      // 重新计算completedToday标志（基于当前日期）
      const todayRecord = habit.calendar.find(day => day.date === todayStr);
      
      return {
        ...habit,
        completedToday: todayRecord ? todayRecord.completed : false
      };
    });
    
    // 保存到插件数据
    await plugin.saveData('Pinch-habit.json', habitsToSave);
  } catch (error) {
    console.error('Error saving habits:', error);
    throw error;
  }
}

// 情绪数据接口
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
      console.error('插件实例未初始化');
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
      console.error('插件实例未初始化');
      throw new Error('插件实例未初始化');
    }
    
    // 保存到插件数据
    await plugin.saveData('Pinch-mood.json', moodData);
  } catch (error) {
    console.error('Error saving mood data:', error);
    throw error;
  }
}

// **************************************** Focus Timer ****************************************

// 单日专注记录
export interface DailyFocusRecord {
  date: string; // YYYY-MM-DD 格式
  sessions: number; // 当天专注次数
  minutes: number; // 当天专注总时长（分钟）
  timestamp: number; // 时间戳
}

// 专注计时器数据接口（按天存储）
export interface FocusTimerData {
  dailyRecords: DailyFocusRecord[];
}

// 专注统计摘要（用于显示）
export interface FocusStatsSummary {
  totalSessions: number;
  totalMinutes: number;
  todaySessions: number;
  todayMinutes: number;
  recentDays: DailyFocusRecord[]; // 最近7天的数据
}

// 获取专注计时器数据
export async function getFocusTimerData(): Promise<FocusTimerData> {
  try {
    const plugin = usePlugin();
    if (!plugin) {
      console.error('插件实例未初始化');
      return { dailyRecords: [] };
    }
    
    const data = await plugin.loadData('Pinch-focus-timer.json');
    
    if (data) {
      const parsed: FocusTimerData = typeof data === 'string' ? JSON.parse(data) : data;
      
      // 确保 dailyRecords 是数组
      if (!parsed.dailyRecords || !Array.isArray(parsed.dailyRecords)) {
        return { dailyRecords: [] };
      }
      
      return parsed;
    } else {
      // 如果没有数据，返回默认值
      return { dailyRecords: [] };
    }
  } catch (error) {
    console.error('Error reading focus timer data:', error);
    // 如果读取失败，返回默认值
    return { dailyRecords: [] };
  }
}

// 获取专注统计摘要
export async function getFocusStatsSummary(): Promise<FocusStatsSummary> {
  try {
    const data = await getFocusTimerData();
    const today = new Date().toISOString().split('T')[0];
    
    // 计算总数
    const totalSessions = data.dailyRecords.reduce((sum, record) => sum + record.sessions, 0);
    const totalMinutes = data.dailyRecords.reduce((sum, record) => sum + record.minutes, 0);
    
    // 查找今天的记录
    const todayRecord = data.dailyRecords.find(record => record.date === today);
    
    // 获取最近7天的数据
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

// 保存专注计时器数据
export async function saveFocusTimerData(data: FocusTimerData): Promise<void> {
  try {
    const plugin = usePlugin();
    if (!plugin) {
      console.error('插件实例未初始化');
      throw new Error('插件实例未初始化');
    }
    
    // 保存到插件数据
    await plugin.saveData('Pinch-focus-timer.json', data);
  } catch (error) {
    console.error('Error saving focus timer data:', error);
    throw error;
  }
}

// 添加单次专注记录
export async function addFocusSession(duration: number): Promise<void> {
  try {
    const data = await getFocusTimerData();
    const today = new Date().toISOString().split('T')[0];
    const now = Date.now();
    
    // 查找今天的记录
    let todayRecord = data.dailyRecords.find(record => record.date === today);
    
    if (todayRecord) {
      // 如果今天已有记录，更新它
      todayRecord.sessions += 1;
      todayRecord.minutes += duration;
      todayRecord.timestamp = now;
    } else {
      // 如果今天没有记录，创建新记录
      data.dailyRecords.push({
        date: today,
        sessions: 1,
        minutes: duration,
        timestamp: now
      });
    }
    
    // 保存数据
    await saveFocusTimerData(data);
  } catch (error) {
    console.error('Error adding focus session:', error);
    throw error;
  }
}

// 获取指定月份的记录
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
  CACHE_VERSION: 3,
  CACHE_DURATION: 10 * 60 * 1000,
  BATCH_SIZE: 10,
  SQL_LIMIT: 1000,
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
}

function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export class TaskRepository {
  private static memoryCache: {
    tasks: Task[] | null;
    timestamp: number;
  } = { tasks: null, timestamp: 0 };
  
  private static readonly MEMORY_CACHE_DURATION = 5000; // 5秒内存缓存

  static async getAllTasks(useCache: boolean = true): Promise<Task[]> {
    const [standaloneTasks, blockTasks] = await Promise.all([
      this.getStandaloneTasks(),
      this.getBlockTasks(useCache)
    ]);
    
    return [...standaloneTasks, ...blockTasks];
  }
  
  static async getStandaloneTasks(): Promise<Task[]> {
    const plugin = usePlugin();
    const data = await plugin.loadData('Stand-tasks.json');
    
    if (!data) return [];
    
    const tasks = typeof data === 'string' ? JSON.parse(data) : data;
    return tasks.map((t: Task) => ({ 
      ...t, 
      type: 'standalone' as const,
      icon: unicodeToEmoji(t.icon)
    }));
  }
  
  static async getBlockTasks(useCache: boolean = true): Promise<Task[]> {
    const now = Date.now();
    
    // 1. 检查内存缓存（最快）
    if (useCache && this.memoryCache.tasks && 
        now - this.memoryCache.timestamp < this.MEMORY_CACHE_DURATION) {
      return this.memoryCache.tasks;
    }
    
    const plugin = usePlugin();

    // 2. 检查文件缓存
    if (useCache) {
      const cachedData = await plugin.loadData('stand-block-tasks-cache.json');
      if (cachedData) {
        const data = typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
        if (data.tasks && data.updatedAt) {
          const cacheAge = now - new Date(data.updatedAt).getTime();
          if (cacheAge < TASK_CONFIG.CACHE_DURATION && data.version === TASK_CONFIG.CACHE_VERSION) {
            const tasks = data.tasks.map((t: Task) => ({
              ...t,
              icon: unicodeToEmoji(t.icon)
            }));
            // 更新内存缓存
            this.memoryCache = { tasks, timestamp: now };
            return tasks;
          }
        }
      }
    }

    // 3. 重新获取
    const tasks = await this.fetchBlockTasks();
    await this.saveBlockTasksCache(tasks);
    // 更新内存缓存
    this.memoryCache = { tasks, timestamp: now };
    return tasks;
  }
  
  private static async fetchBlockTasks(): Promise<Task[]> {
    const tasks: Task[] = [];
    const BATCH_SIZE = TASK_CONFIG.BATCH_SIZE;
    
    try {
      const [taskBlocks, nodeListBlocks] = await Promise.all([
        sql(`
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
          WHERE (b.type = 'i' OR b.type = 'p') AND (b.markdown LIKE '%[ ]%' OR b.markdown LIKE '%[x]%')
          GROUP BY b.id, b.content, b.box, b.hpath, b.updated, b.created, b.markdown, b.parent_id, b.root_id, b.type, b.subtype, b.memo
          ORDER BY b.root_id, b.box, b.path
          LIMIT ${TASK_CONFIG.SQL_LIMIT}
        `),
        sql(`
          SELECT id, parent_id, type
          FROM blocks
          WHERE type = 'l' AND subtype = 't'
        `)
      ]);
      
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
            log_debug('未找到DOM数据', { blockId: parentBlock.id });
            return null;
          }
          
          const currentDomElement = protyleElement?.querySelector(`[data-node-id="${parentBlock.id}"][data-type="NodeListItem"]`) 
            || protyleElement?.querySelector(`[data-node-id="${parentBlock.id}"]`);
          
          // 如果在 protyleElement 中找不到，尝试在整个文档中查找
          let fallbackElement = currentDomElement;
          if (!fallbackElement) {
            fallbackElement = document.querySelector(`[data-node-id="${parentBlock.id}"][data-type="NodeListItem"]`) 
              || document.querySelector(`[data-node-id="${parentBlock.id}"]`);
          }
          
          // 使用找到的元素（优先使用 protyleElement 中的，否则使用 fallback）
          const elementToUse = currentDomElement || fallbackElement;
          
          const currentParagraph = elementToUse?.querySelector('[data-type="NodeParagraph"] [contenteditable="true"]');
          const currentTitle = currentParagraph?.innerHTML || '';
          
          let currentAction = elementToUse?.querySelector('.protyle-action--task');
          
          if (!currentAction) {
            currentAction = elementToUse?.closest('.protyle-task')?.querySelector('.protyle-action--task');
          }
          
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
          
          let parentAction = parentListItem?.querySelector('.protyle-action--task');
          if (!parentAction) {
            parentAction = parentListItem?.closest('.protyle-task')?.querySelector('.protyle-action--task');
          }
          
          const svg = parentAction?.querySelector('use');
          const apiHref = svg?.getAttribute('xlink:href') || svg?.getAttribute('href');
          const isCompleted = apiHref === '#iconCheck';
          
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
            
            const allListItems = doc.querySelectorAll('[data-type="NodeListItem"]');
            const subtaskNodeIds: string[] = [];
            const validSubtasks: Array<{ item: Element; nodeId: string }> = [];
            
            for (let i = 0; i < allListItems.length; i++) {
              const item = allListItems[i];
              const nodeId = item.getAttribute('data-node-id');
              if (!nodeId || nodeId === parentId) continue;
              
              const action = item.querySelector('.protyle-action--task');
              if (!action) continue;
              
              subtaskNodeIds.push(nodeId);
              validSubtasks.push({ item, nodeId });
            }
            
            let subtaskBlocksMap = new Map<string, any>();
            if (subtaskNodeIds.length > 0) {
              try {
                const ids = subtaskNodeIds.map(id => `'${id}'`).join(',');
                const blocks = await sql(`SELECT id, markdown FROM blocks WHERE id IN (${ids})`);
                blocks.forEach((block: SiyuanBlock) => {
                  subtaskBlocksMap.set(block.id, block);
                });
              } catch (error) {
                handleError('获取子任务块', error, { parentId });
              }
            }
            
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
          const apiDomStatus = isCompleted ? 'completed' : 'pending';
          
          if (isCurrentCompleted === true) {
            status = 'completed';
          } else if (attrStatus && validStatuses.includes(attrStatus) && attrStatus !== 'completed' && attrStatus !== 'pending') {
            status = attrStatus;
          } else if (typeof isCurrentCompleted === 'boolean') {
            status = isCurrentCompleted ? 'completed' : 'pending';
          } else {
            status = markdownStatus || apiDomStatus || 'pending';
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
          handleError('处理任务块', error, { blockId: parentBlock.id });
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
        handleError('获取块任务', error);
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
  }
  
  static async clearCache(): Promise<void> {
    const plugin = usePlugin();
    await plugin.saveData('stand-block-tasks-cache.json', {});
    // 清除内存缓存
    this.memoryCache = { tasks: null, timestamp: 0 };
  }
  
  static async createStandaloneTask(task: Omit<Task, 'id' | 'type' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const plugin = usePlugin();
    const tasks = await this.getStandaloneTasks();
    
    const newTask: Task = {
      ...task,
      id: generateTaskId(),
      type: 'standalone',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    tasks.push(newTask);
    await plugin.saveData('Stand-tasks.json', tasks);
    
    return newTask.id;
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
      log_debug('开始创建任务块', { notebookId, docPath, taskMarkdown });

      const ids = await getIDsByHPath(notebookId, docPath);
      log_debug('获取文档ID', ids);
      
      if (!ids || ids.length === 0) {
        throw new Error('文档不存在');
      }

      const rootId = ids[0];
      log_debug('文档根ID', rootId);
      
      const result = await appendBlock('markdown', taskMarkdown, rootId);
      log_debug('appendBlock 返回结果', JSON.stringify(result, null, 2));

      if (result && result.length > 0) {
        let listItemBlockId = '';

        log_debug('doOperations 数量', result[0].doOperations.length);
        
        for (let i = 0; i < result[0].doOperations.length; i++) {
          const op = result[0].doOperations[i] as any;
          log_debug(`操作 ${i}`, { id: op.id, objectType: op.objectType, type: op.type });
          
          if (op.objectType === 'NodeListItem') {
            listItemBlockId = op.id;
            log_debug('找到 NodeListItem', listItemBlockId);
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
                log_debug('从 data HTML 解析出 NodeListItem', listItemBlockId);
                break;
              }
            }
          }
        }

        if (!listItemBlockId) {
          const parentBlockId = result[0].doOperations[result[0].doOperations.length - 1]?.id || result[0].doOperations[0].id;
          log_debug('尝试从父块查找子项', parentBlockId);
          
          const childBlocks = await sql(`
            SELECT id, type, subtype
            FROM blocks
            WHERE parent_id = '${parentBlockId}' 
            AND type = 'l' 
            AND subtype = 't'
            ORDER BY created DESC
            LIMIT 1
          `);
          log_debug('SQL查询结果1', childBlocks);

          if (childBlocks && childBlocks.length > 0) {
            listItemBlockId = childBlocks[0].id;
            log_debug('从父块找到子项', listItemBlockId);
          }
        }

        if (!listItemBlockId) {
          log_debug('尝试从文档根查找最新任务项');
          
          const childBlocks = await sql(`
            SELECT id, type, subtype
            FROM blocks
            WHERE root_id = '${rootId}' 
            AND type = 'l' 
            AND subtype = 't'
            ORDER BY created DESC
            LIMIT 3
          `);
          log_debug('SQL查询结果2', childBlocks);

          if (childBlocks && childBlocks.length > 0) {
            const now = Date.now();
            for (const block of childBlocks) {
              const blockTime = new Date(block.created || block.updated).getTime();
              if (now - blockTime < TASK_CONFIG.RECENT_TASK_WINDOW) {
                listItemBlockId = block.id;
                log_debug('找到最近创建的任务项', listItemBlockId);
                break;
              }
            }
            
            if (!listItemBlockId && childBlocks.length > 0) {
              listItemBlockId = childBlocks[0].id;
              log_debug('使用最新的任务项', listItemBlockId);
            }
          }
        }

        log_debug('最终找到的块ID', listItemBlockId);
        log_debug('准备设置的属性', attrs);

        if (listItemBlockId && Object.keys(attrs).length > 0) {
          await setBlockAttrs(listItemBlockId, attrs);
          log_debug('属性设置完成');
          
          const verifyAttrs = await getBlockAttrs(listItemBlockId);
          log_debug('验证属性', verifyAttrs);
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
      handleError('创建块任务', error, { notebookId, docPath, taskTitle: task.title });
      throw error;
    }
  }
  
  static async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    const tasks = await this.getStandaloneTasks();
    const task = tasks.find(t => t.id === taskId);
    
    if (task) {
      Object.assign(task, updates, { updatedAt: new Date().toISOString() });
      const plugin = usePlugin();
      await plugin.saveData('Stand-tasks.json', tasks);
      return;
    }
    
    const blockTasks = await this.getBlockTasks(false);
    const blockTask = blockTasks.find(t => t.id === taskId);
    if (blockTask) {
      const attrsToUpdate: { [key: string]: string } = {};
      if (updates.status) {
        attrsToUpdate['custom-task-status'] = updates.status;
      }
      if (updates.priority) {
        attrsToUpdate['custom-task-priority'] = updates.priority;
      }
      if (updates.dueDate !== undefined) {
        attrsToUpdate['custom-task-due-date'] = updates.dueDate || '';
      }
      if (updates.tags) {
        attrsToUpdate['custom-task-tags'] = JSON.stringify(updates.tags);
      }

      await setBlockAttrs(blockTask.blockId!, attrsToUpdate);

      Object.assign(blockTask, updates, { updatedAt: new Date().toISOString() });
      await this.saveBlockTasksCache(blockTasks);
    }
  }
  
  static async deleteTask(taskId: string): Promise<void> {
    const tasks = await this.getStandaloneTasks();
    const index = tasks.findIndex(t => t.id === taskId);
    
    if (index >= 0) {
      tasks.splice(index, 1);
      const plugin = usePlugin();
      await plugin.saveData('Stand-tasks.json', tasks);
      return;
    }
    
    const blockTasks = await this.getBlockTasks(false);
    const blockTask = blockTasks.find(t => t.id === taskId);
    if (blockTask) {
      await deleteBlock(blockTask.blockId!);
      
      const newBlockTasks = blockTasks.filter(t => t.id !== taskId);
      await this.saveBlockTasksCache(newBlockTasks);
    }
  }
  
  static async updateSubtaskInCache(parentTaskId: string, subtaskId: string, completed: boolean): Promise<void> {
    const blockTasks = await this.getBlockTasks(false);
    const parentTask = blockTasks.find(t => t.id === parentTaskId);
    
    if (parentTask && parentTask.subtasks) {
      const subtask = parentTask.subtasks.find(st => st.id === subtaskId);
      if (subtask) {
        subtask.completed = completed;
        await this.saveBlockTasksCache(blockTasks);
      }
    }
  }
  
  static async getTaskByBlockId(blockId: string, useCache: boolean = false): Promise<Task | null> {
    try {
      const allTasks = await this.getBlockTasks(useCache);
      return allTasks.find(t => t.blockId === blockId) || null;
    } catch (error) {
      handleError('获取单个任务', error, { blockId });
      return null;
    }
  }
  
  static async getTasksByBlockIds(blockIds: string[], useCache: boolean = false): Promise<Map<string, Task>> {
    try {
      const allTasks = await this.getBlockTasks(useCache);
      const taskMap = new Map<string, Task>();
      
      for (const blockId of blockIds) {
        const task = allTasks.find(t => t.blockId === blockId);
        if (task) {
          taskMap.set(blockId, task);
        }
      }
      
      return taskMap;
    } catch (error) {
      handleError('批量获取任务', error, { blockIds });
      return new Map();
    }
  }
}

// 还需要添加 getBlockDOM 函数，如果主项目没有的话
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
              log_debug('获取块DOM失败', { id, error });
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
