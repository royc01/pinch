import {
  Plugin,
  getFrontend,
} from "siyuan";
import "@/index.scss";
import PluginInfoString from '@/../plugin.json'
import { destroy, init } from '@/main'
import { eventBus } from '@/utils/eventBus'
import { sql } from '@/api'

let PluginInfo = {
  version: '',
}
try {
  PluginInfo = PluginInfoString
} catch (err) {
  
}
const {
  version,
} = PluginInfo

interface DebounceState {
  lastCallTime: number;
  adaptiveDelay: number;
  operationCount: number;
}

export default class HabitTrackerPlugin extends Plugin {
  public isMobile: boolean
  public isBrowser: boolean
  public isLocal: boolean
  public isElectron: boolean
  public isInWindow: boolean
  public platform: SyFrontendTypes
  public readonly version = version

  private debounceTimer: any = null;
  private debounceState: DebounceState = {
    lastCallTime: 0,
    adaptiveDelay: 150,
    operationCount: 0
  };
  private readonly MAX_DEBOUNCE_DELAY = 200;
  private readonly BASE_DEBOUNCE_DELAY = 50;

  async onload() {
    const frontEnd = getFrontend();
    this.platform = frontEnd as SyFrontendTypes
    this.isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile"
    this.isBrowser = frontEnd.includes('browser')
    this.isLocal =
      location.href.includes('127.0.0.1')
      || location.href.includes('localhost')
    this.isInWindow = location.href.includes('window.html')

    try {
      require("@electron/remote")
        .require("@electron/remote/main")
      this.isElectron = true
    } catch (err) {
      this.isElectron = false
    }

    init(this);
  }

  onLayoutReady() {
    this.setupWebSocketListener();
  }

  private setupWebSocketListener() {
    this.eventBus.on("ws-main", (event: any) => {
      const { cmd, data } = event.detail;

      if (cmd === "transactions") {
        this.handleIncrementalUpdate(data);
      }
    });
  }

  private handleIncrementalUpdate = (transactions: any[]) => {
    // 计算本次操作数量
    const operationCount = transactions.reduce((count: number, trans: any) => {
      return count + (trans.doOperations?.length || 0);
    }, 0);
    
    this.debounceState.operationCount += operationCount;
    const now = Date.now();
    const timeSinceLastCall = now - this.debounceState.lastCallTime;
    
    // 动态调整防抖延迟：操作越频繁，延迟越长
    if (timeSinceLastCall < 1000) { // 1秒内多次调用
      this.debounceState.adaptiveDelay = Math.min(
        this.debounceState.adaptiveDelay + 20,
        this.MAX_DEBOUNCE_DELAY
      );
    } else if (timeSinceLastCall > 5000) { // 5秒无操作，重置
      this.debounceState.adaptiveDelay = this.BASE_DEBOUNCE_DELAY;
      this.debounceState.operationCount = 0;
    }
    
    this.debounceState.lastCallTime = now;
    
    const isFirstCall = !this.debounceTimer;
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      await this.queryAndUpdateTasks(transactions);
      this.debounceTimer = null;
    }, this.debounceState.adaptiveDelay);
    
    // Leading edge：第一次调用立即执行
    if (isFirstCall || operationCount > 10) {
      clearTimeout(this.debounceTimer!);
      this.debounceTimer = null;
      this.queryAndUpdateTasks(transactions);
    }
  }

  private async queryAndUpdateTasks(transactions: any[]) {
    const changedIds = new Set<string>();
    
    transactions.forEach((trans: any) => {
      trans.doOperations?.forEach((op: any) => {
        if (op.id) {
          changedIds.add(op.id);
        }
      });
    });

    if (changedIds.size === 0) {
      return;
    }

    const idList = Array.from(changedIds).map(id => `'${id}'`).join(",");
    
    const sqlStmt = `
      SELECT DISTINCT b.id FROM blocks b
      WHERE b.subtype = 't' 
        AND (
          b.id IN (${idList})
          OR b.parent_id IN (${idList})
          OR b.id IN (SELECT parent_id FROM blocks WHERE id IN (${idList}) AND parent_id != '')
        )
    `;

    try {
      const updatedTasks = await sql(sqlStmt);

      if (updatedTasks && updatedTasks.length > 0) {
        const blockIds = updatedTasks.map((t: any) => t.id);
        eventBus.emit('task-changed', { blockIds });
      }
    } catch (error) {
      // Error handling - silently fail
    }
  }

  onunload() {
    destroy()
  }
}
