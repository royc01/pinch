/**
 * Copyright (c) 2023 frostime. All rights reserved.
 * https://github.com/frostime/sy-plugin-template-vite
 *
 * See API Document in [API.md](https://github.com/siyuan-note/siyuan/blob/master/API.md)
 * API 文档见 [API_zh_CN.md](https://github.com/siyuan-note/siyuan/blob/master/API_zh_CN.md)
 */

import { fetchSyncPost, IWebSocketData } from "siyuan";

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
