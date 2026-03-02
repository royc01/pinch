import {
  Plugin,
  getFrontend,
} from "siyuan";
import "@/index.scss";
import PluginInfoString from '@/../plugin.json'
import { destroy, init } from '@/main'
import { eventBus } from '@/utils/eventBus'

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

export default class HabitTrackerPlugin extends Plugin {
  public isMobile: boolean
  public isBrowser: boolean
  public isLocal: boolean
  public isElectron: boolean
  public isInWindow: boolean
  public platform: SyFrontendTypes
  public readonly version = version

  private debounceTimer: any = null;
  private pendingTransactionBatches: Array<{
    transactions: any[];
    transactionIndex: number;
    operationIndex: number;
  }> = [];
  private readonly MAX_OPERATIONS_PER_FLUSH = 150;

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
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return;
    }

    // Keep websocket/input handler O(1): only enqueue batch and return.
    this.pendingTransactionBatches.push({
      transactions,
      transactionIndex: 0,
      operationIndex: 0
    });

    if (this.debounceTimer !== null) {
      return;
    }

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.flushPendingTransactions();
    }, 24);
  }

  private async flushPendingTransactions() {
    if (this.pendingTransactionBatches.length === 0) {
      return;
    }

    const changedIds = new Set<string>();
    let processedOperations = 0;

    while (
      this.pendingTransactionBatches.length > 0 &&
      processedOperations < this.MAX_OPERATIONS_PER_FLUSH
    ) {
      const head = this.pendingTransactionBatches[0];
      if (!head || head.transactionIndex >= head.transactions.length) {
        this.pendingTransactionBatches.shift();
        continue;
      }

      const trans = head.transactions[head.transactionIndex];
      const ops = Array.isArray(trans?.doOperations) ? trans.doOperations : [];

      if (ops.length === 0) {
        head.transactionIndex += 1;
        head.operationIndex = 0;
        if (head.transactionIndex >= head.transactions.length) {
          this.pendingTransactionBatches.shift();
        }
        continue;
      }

      while (
        head.operationIndex < ops.length &&
        processedOperations < this.MAX_OPERATIONS_PER_FLUSH
      ) {
        const op = ops[head.operationIndex++];
        processedOperations += 1;
        const relatedIds = [op?.id, op?.parentID, op?.parentId, op?.previousID, op?.nextID];
        relatedIds.forEach((id) => {
          if (typeof id === 'string' && id.length > 0) {
            changedIds.add(id);
          }
        });
      }

      if (head.operationIndex >= ops.length) {
        head.transactionIndex += 1;
        head.operationIndex = 0;
      }

      if (head.transactionIndex >= head.transactions.length) {
        this.pendingTransactionBatches.shift();
      }
    }

    if (changedIds.size > 0) {
      eventBus.emit('task-changed', { blockIds: Array.from(changedIds) });
    }

    if (this.pendingTransactionBatches.length > 0 && this.debounceTimer === null) {
      this.debounceTimer = setTimeout(() => {
        this.debounceTimer = null;
        void this.flushPendingTransactions();
      }, 16);
    }
  }

  onunload() {
    destroy()
  }
}

