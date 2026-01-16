/**
 * Copyright (c) 2023 frostime. All rights reserved.
 */

/**
 * Frequently used data structures in SiYuan
 */
type DocumentId = string;
type BlockId = string;
type NotebookId = string;
type PreviousID = BlockId;
type ParentID = BlockId | DocumentId;

type Notebook = {
  id: NotebookId;
  name: string;
  icon: string;
  sort: number;
  closed: boolean;
};

type NotebookConf = {
  name: string;
  closed: boolean;
  refCreateSavePath: string;
  createDocNameTemplate: string;
  dailyNoteSavePath: string;
  dailyNoteTemplatePath: string;
};

type BlockType =
  | "d"
  | "s"
  | "h"
  | "t"
  | "i"
  | "p"
  | "f"
  | "audio"
  | "video"
  | "other";

type BlockSubType =
  | "d1"
  | "d2"
  | "s1"
  | "s2"
  | "s3"
  | "t1"
  | "t2"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "table"
  | "task"
  | "toggle"
  | "latex"
  | "quote"
  | "html"
  | "code"
  | "footnote"
  | "cite"
  | "collection"
  | "bookmark"
  | "attachment"
  | "comment"
  | "mindmap"
  | "spreadsheet"
  | "calendar"
  | "image"
  | "audio"
  | "video"
  | "other";

type Block = {
  id: BlockId;
  parent_id?: BlockId;
  root_id: DocumentId;
  hash: string;
  box: string;
  path: string;
  hpath: string;
  name: string;
  alias: string;
  memo: string;
  tag: string;
  content: string;
  fcontent?: string;
  markdown: string;
  length: number;
  type: BlockType;
  subtype: BlockSubType;
  /** string of { [key: string]: string }
   * For instance: "{: custom-type=\"query-code\" id=\"20230613234017-zkw3pr0\" updated=\"20230613234509\"}"
   */
  ial?: string;
  sort: number;
  created: string;
  updated: string;
};

type doOperation = {
  action: string;
  data: string;
  id: BlockId;
  parentID: BlockId | DocumentId;
  previousID: BlockId;
  retData: null;
};

interface Window {
  siyuan: {
    notebooks: any;
    menus: any;
    dialogs: any;
    blockPanels: any;
    storage: any;
    user: any;
    ws: any;
    languages: any;
  };
  _sy_plugin_sample: {
    [key: string]: any;
  };
}


enum SyFrontendTypes {
  // 桌面端
  'desktop' = 'desktop',
  'desktop-window' = 'desktop-window',
  // 移动端
  'mobile' = 'mobile',
  // 浏览器 - 桌面端
  'browser-desktop' = 'browser-desktop',
  // 浏览器 - 移动端
  'browser-mobile' = 'browser-mobile',
}

// 习惯追踪相关类型定义
interface Habit {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'custom';
  customFrequency?: number; // 每周天数
  timesPerDay?: number; // 每天次数
  completedToday: boolean;
  currentStreak: number;
  totalCompletions: number;
  calendar: HabitCalendarDay[];
  createdAt: string;
  usePomodoro?: boolean; // 是否使用番茄钟
  pomodoroDuration?: number; // 番茄钟时长（分钟）
  pomodoroTimer?: number; // 番茄钟计时器ID
  pomodoroRemaining?: number; // 番茄钟剩余时间（秒）
  pomodoroState?: 'work' | 'shortBreak' | 'longBreak'; // 番茄钟状态：工作/短休息/长休息
  isPaused?: boolean; // 习惯是否暂停
  isPomodoroPaused?: boolean; // 番茄钟是否暂停
}

interface HabitCalendarDay {
  date: string; // YYYY-MM-DD
  completed: boolean;
  completedCount: number; // 实际完成次数
  targetCount: number; // 目标完成次数
}

// 情绪数据相关类型定义
interface MoodData {
  [date: string]: {
    emoji: string;
    note: string;
    timestamp: string;
  };
}

interface MoodStat {
  emoji: string;
  count: number;
  percentage: number;
}
