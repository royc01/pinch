import {
  Dialog,
  Plugin,
  getFrontend,
  openTab,
  showMessage,
} from "siyuan";
import type { IProtyle } from "siyuan";
import { createApp } from 'vue'
import App from './App.vue'
import MobileTaskCreateDialog from './components/MobileTaskCreateDialog.vue'
import KanbanView from './components/KanbanView.vue'
import zhCN from '@/i18n/zh_CN.json';
import { translate } from '@/composables/useI18n';
import { startTaskReminderScheduler, stopTaskReminderScheduler } from '@/taskReminderScheduler';
import { TaskRepository, sql } from '@/api';
import { escapeSqlLiteral } from '@/utils/sql';
import {
  eventBus,
  Events,
  type FocusTimerPanelOpenRequest,
  type HabitTrackerPanelOpenRequest,
  type TaskQuickMetaOpenRequest,
  type TaskViewSwitchRequest
} from '@/utils/eventBus';
import { destroyDetachedFocusWindow } from '@/utils/detachedFocusWindow';

// Ensure the data directory exists.
import { ensureDataDir } from '@/utils';
let plugin: Plugin | null = null;
let kanbanApp = null;
let mobileKanbanDialog: Dialog | null = null;
let mobileKanbanApp: any = null;
let mobileTaskCreateDialog: Dialog | null = null;
let mobileTaskCreateApp: any = null;
let mobileSidebarPinchApp: any = null;
let pinchDockModel: any = null;
let pinchDockElement: HTMLElement | null = null;
let unsubscribeMobileKanbanCloseRequest: (() => void) | null = null;
let topBarViewButton: HTMLElement | null = null;
const PINCH_DOCK_TYPE = 'Pinch-habit';
const KANBAN_TAB_TYPE = 'kanban';
const MOBILE_BREADCRUMB_LONG_PRESS_MS = 480;
const TOP_BAR_VIEW_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"><path d="M7,28c-0.9,0-1.7-0.3-2.3-0.9c-1.1-1.2-1.1-3-1.1-3.2l0-14.1l0,0c0.4-3.2,2-5.3,2.1-5.3c3.3-4.3,8.2-4.2,8.4-4.2c2.6-0.1,5.3,1,7.4,3c1.9,1.9,2.9,4.2,2.9,6.7c0.2,3.7-1.1,6.7-4,8.8c-2.8,2.1-5.6,1.9-7,1.8c-0.2,0-0.3,0-0.5,0c-0.8,0-1,0-1.6,0.4c-0.4,0.3-0.6,1-0.6,1.2l0,2.5C10.8,25.5,10.1,28,7,28z M5.2,9.8v14.1c0,0.4,0.1,1.5,0.6,2.1c0.3,0.3,0.6,0.4,1.1,0.4c2,0,2.1-1.5,2.1-1.8V22c0-0.2,0.2-1.6,1.3-2.4c1-0.7,1.7-0.7,2.6-0.7c0.1,0,0.3,0,0.6,0c1.3,0.1,3.6,0.2,5.9-1.5c2.4-1.8,3.5-4.3,3.3-7.4c0-2.1-0.9-4.1-2.5-5.6c-1.7-1.7-4-2.6-6.2-2.5c-0.1,0-4.4,0-7.1,3.6C6.9,5.4,5.6,7.1,5.2,9.8z"/><path fill="#FF826E" d="M13.1,14.9c-0.3,0-0.6-0.1-0.8-0.3l-2.6-2.7c-0.4-0.4-0.4-1.1,0-1.6c0.4-0.4,1.1-0.4,1.6,0l1.8,1.9l4-4.4c0.4-0.4,1.1-0.5,1.6-0.1c0.4,0.4,0.5,1.1,0.1,1.6l-4.8,5.3C13.7,14.7,13.4,14.9,13.1,14.9C13.1,14.9,13.1,14.9,13.1,14.9z"/></svg>';
const LEGACY_KANBAN_TAB_TITLE = typeof zhCN['app.kanbanTabTitle'] === 'string'
  ? zhCN['app.kanbanTabTitle']
  : 'Pinch View';
export function usePlugin(pluginProps?: Plugin): Plugin | null {
  if (pluginProps) {
    plugin = pluginProps;
    
  }
  
  

  
  if (!plugin && !pluginProps) {
    console.error('need bind plugin');
  }
  
  return plugin;
}
const PINCH_ICONS = [
  {
    id: 'ht-custom-icon',
    viewBox: '0 0 28 28',
    path: '<path d="M7,28c-0.9,0-1.7-0.3-2.3-0.9c-1.1-1.2-1.1-3-1.1-3.2l0-14.1l0,0c0.4-3.2,2-5.3,2.1-5.3c3.3-4.3,8.2-4.2,8.4-4.2c2.6-0.1,5.3,1,7.4,3c1.9,1.9,2.9,4.2,2.9,6.7c0.2,3.7-1.1,6.7-4,8.8c-2.8,2.1-5.6,1.9-7,1.8c-0.2,0-0.3,0-0.5,0c-0.8,0-1,0-1.6,0.4c-0.4,0.3-0.6,1-0.6,1.2l0,2.5C10.8,25.5,10.1,28,7,28z M5.2,9.8v14.1c0,0.4,0.1,1.5,0.6,2.1c0.3,0.3,0.6,0.4,1.1,0.4c2,0,2.1-1.5,2.1-1.8V22c0-0.2,0.2-1.6,1.3-2.4c1-0.7,1.7-0.7,2.6-0.7c0.1,0,0.3,0,0.6,0c1.3,0.1,3.6,0.2,5.9-1.5c2.4-1.8,3.5-4.3,3.3-7.4c0-2.1-0.9-4.1-2.5-5.6c-1.7-1.7-4-2.6-6.2-2.5c-0.1,0-4.4,0-7.1,3.6C6.9,5.4,5.6,7.1,5.2,9.8z"/><path fill="#FF826E" d="M13.1,14.9c-0.3,0-0.6-0.1-0.8-0.3l-2.6-2.7c-0.4-0.4-0.4-1.1,0-1.6c0.4-0.4,1.1-0.4,1.6,0l1.8,1.9l4-4.4c0.4-0.4,1.1-0.5,1.6-0.1c0.4,0.4,0.5,1.1,0.1,1.6l-4.8,5.3C13.7,14.7,13.4,14.9,13.1,14.9C13.1,14.9,13.1,14.9,13.1,14.9z"/>',
  },
  {
    id: 'stand-custom-icon',
    viewBox: '0 0 1024 1024',
    path: 'M512.67794 65.291029C265.701966 65.004503 66.200236 263.518742 65.293587 510.472204c-0.916882 247.286036 198.739367 447.915449 446.048939 448.236767 247.38632 0.322341 447.196065-199.272509 447.366957-446.883957C958.882422 265.25734 759.426741 65.579601 512.67794 65.291029zM772.621251 544.93204c-0.64059 26.420743-15.491833 41.562605-41.989323 41.606607-47.989991 0.080841-95.982028 0.124843-143.972019 0.151449 0.01228 45.808302 0.017396 91.615581-0.026606 137.418766-0.033769 35.107589-13.380752 48.577369-48.030923 48.683792-19.839861 0.061398-39.694047 0.370437-59.528791-0.11154-26.414603-0.642636-41.552371-15.495926-41.596374-41.999556-0.079818-47.998177-0.12382-95.996354-0.150426-143.993508-47.941895-0.027629-95.882767-0.072655-143.826709-0.154519-26.546609-0.044002-41.48381-15.205307-42.060955-41.548278-0.478907-21.701255-0.385786-43.417859-0.038886-65.119113 0.438998-27.465538 15.230889-42.333154 42.967604-42.441625 47.653323-0.176009 95.307669-0.155543 142.959969-0.122797 0.027629-47.950082 0.072655-95.89914 0.154519-143.851269 0.041956-26.552749 15.20019-41.49302 41.537022-42.070164 21.694091-0.477884 43.408649-0.385786 65.103764-0.037862 27.460422 0.438998 42.323944 15.233959 42.432415 42.977837 0.176009 47.667649 0.155543 95.335299 0.122797 143.001925 45.796022-0.01228 91.591021-0.017396 137.38295 0.026606 35.100426 0.033769 48.565089 13.382798 48.671513 48.039109C772.796236 505.231853 773.105275 525.093203 772.621251 544.93204z',
  },
] as const;

function buildIconSymbol(id: string, viewBox: string, path: string) {
  const content = path.includes('<')
    ? path
    : `<path d="${path}" />`;
  return `<symbol id="${id}" viewBox="${viewBox}">${content}</symbol>`;
}

function registerIcons(pluginInstance: Plugin) {
  const svg = PINCH_ICONS
    .filter(icon => !document.getElementById(icon.id))
    .map(icon => buildIconSymbol(icon.id, icon.viewBox, icon.path))
    .join('');

  if (svg) {
    pluginInstance.addIcons(svg);
  }
}

function registerTopBarViewButton(pluginInstance: Plugin) {
  topBarViewButton?.remove();
  topBarViewButton = pluginInstance.addTopBar({
    icon: TOP_BAR_VIEW_SVG,
    title: translate('app.openTaskView', 'Open all tasks'),
    callback: () => {
      void openKanbanView();
    }
  });
}

let mobileBreadcrumbObserver: MutationObserver | null = null;
let mobileBreadcrumbRefreshRaf = 0;
const MOBILE_PINCH_PANEL_TYPE = 'sidebar-pinch';
const MOBILE_PINCH_PANEL_ATTR = 'data-pinch-mobile-sidebar-panel';

function openMobilePinchPluginPage(): boolean {
  const existingPanel = document.querySelector<HTMLElement>(
    `[data-type="${MOBILE_PINCH_PANEL_TYPE}"][${MOBILE_PINCH_PANEL_ATTR}="true"]`
  );
  if (existingPanel) {
    return true;
  }

  try {
    const panel = document.createElement('div');
    panel.dataset.type = MOBILE_PINCH_PANEL_TYPE;
    panel.dataset.pinchMobileSidebarPanel = 'true';
    panel.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:10000',
      'background:var(--b3-theme-background)',
      'overflow:hidden'
    ].join(';');

    const mountElement = document.createElement('div');
    mountElement.style.cssText = [
      'width:100%',
      'height:100%',
      'box-sizing:border-box',
      'padding-top:calc(env(safe-area-inset-top) + 48px)'
    ].join(';');
    panel.appendChild(mountElement);

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', translate('common.close', 'Close'));
    closeButton.innerHTML = '&times;';
    closeButton.style.cssText = [
      'position:absolute',
      'top:calc(env(safe-area-inset-top) + 12px)',
      'right:12px',
      'z-index:10002',
      'width:32px',
      'height:32px',
      'border:0',
      'border-radius:50%',
      'background:var(--b3-theme-background-light)',
      'color:var(--b3-theme-on-background)',
      'font-size:26px',
      'line-height:1',
      'cursor:pointer'
    ].join(';');
    closeButton.addEventListener('click', cleanupMobileSidebarPinchView);
    panel.appendChild(closeButton);
    document.body.appendChild(panel);

    mobileSidebarPinchApp = createApp(App);
    mobileSidebarPinchApp.mount(mountElement);
    return true;
  } catch (error) {
    console.error('Failed to open mobile Pinch plugin page:', error);
    cleanupMobileSidebarPinchView();
    return false;
  }
}

function isMobileFrontend() {
  try {
    const frontend = getFrontend();
    return frontend === 'mobile' || frontend === 'browser-mobile';
  } catch {
    return false;
  }
}

// SiYuan command hotkey prefers symbol format, which is adapted per platform.
const OPEN_TASK_EDITOR_HOTKEY = '⌥Q';
const OPEN_GLOBAL_TASK_CREATE_HOTKEY = '';
type QuickTaskViewMode = 'kanban' | 'table' | 'quadrant' | 'gantt' | 'day' | 'week' | 'three-day' | 'month' | 'archive-table';
const QUICK_TASK_VIEW_COMMANDS: Array<{ langKey: string; langTextKey: string; fallback: string; view: QuickTaskViewMode }> = [
  { langKey: 'pinchOpenKanbanView', langTextKey: 'command.openKanbanView', fallback: 'Quick open kanban view', view: 'kanban' },
  { langKey: 'pinchOpenTableView', langTextKey: 'command.openTableView', fallback: 'Quick open table view', view: 'table' },
  { langKey: 'pinchOpenQuadrantView', langTextKey: 'command.openQuadrantView', fallback: 'Quick open quadrant view', view: 'quadrant' },
  { langKey: 'pinchOpenGanttView', langTextKey: 'command.openGanttView', fallback: 'Quick open gantt view', view: 'gantt' },
  { langKey: 'pinchOpenDayView', langTextKey: 'command.openDayView', fallback: 'Quick open day view', view: 'day' },
  { langKey: 'pinchOpenThreeDayView', langTextKey: 'command.openThreeDayView', fallback: 'Quick open three-day view', view: 'three-day' },
  { langKey: 'pinchOpenWeekView', langTextKey: 'command.openWeekView', fallback: 'Quick open week view', view: 'week' },
  { langKey: 'pinchOpenMonthView', langTextKey: 'command.openMonthView', fallback: 'Quick open month view', view: 'month' },
  { langKey: 'pinchOpenArchiveView', langTextKey: 'command.openArchiveView', fallback: 'Quick open archive view', view: 'archive-table' }
];

function getClosestBlockIdFromElement(element: Element | null, editorRoot?: HTMLElement | null): string {
  if (!element) {
    return '';
  }
  const blockEl = element.closest('[data-node-id]') as HTMLElement | null;
  if (!blockEl) {
    return '';
  }
  if (editorRoot && !editorRoot.contains(blockEl)) {
    return '';
  }
  const blockId = blockEl.getAttribute('data-node-id');
  return typeof blockId === 'string' ? blockId.trim() : '';
}

function getTaskBlockIdFromElement(element: Element | null): string {
  if (!element) {
    return '';
  }
  const taskEl = element.closest('[data-node-id][data-subtype="t"]') as HTMLElement | null;
  if (!taskEl) {
    return '';
  }
  const blockId = taskEl.getAttribute('data-node-id');
  return typeof blockId === 'string' ? blockId.trim() : '';
}

function getMenuAnchorFromBlockElement(blockElement: HTMLElement | null): { x: number; y: number } | null {
  if (!blockElement) {
    return null;
  }
  const rect = blockElement.getBoundingClientRect();
  const left = Number(rect.left);
  const top = Number(rect.top);
  const width = Number(rect.width);
  const height = Number(rect.height);
  if (!Number.isFinite(left) || !Number.isFinite(top)) {
    return null;
  }
  const safeWidth = Number.isFinite(width) ? Math.max(0, width) : 0;
  const safeHeight = Number.isFinite(height) ? Math.max(0, height) : 0;
  return {
    x: Math.round(left + (safeWidth > 0 ? safeWidth / 2 : 0)),
    y: Math.round(top + (safeHeight > 0 ? safeHeight / 2 : 0))
  };
}

function getCurrentContextBlockId(protyle?: IProtyle): string {
  const editorRoot = protyle?.element instanceof HTMLElement ? protyle.element : null;
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const anchorNode = selection.anchorNode || selection.getRangeAt(0).startContainer;
    const anchorElement = anchorNode instanceof Element ? anchorNode : anchorNode?.parentElement || null;
    const fromSelection = getClosestBlockIdFromElement(anchorElement, editorRoot);
    if (fromSelection) {
      return fromSelection;
    }
  }

  const activeElement = document.activeElement;
  if (activeElement instanceof Element) {
    const fromActive = getClosestBlockIdFromElement(activeElement, editorRoot);
    if (fromActive) {
      return fromActive;
    }
  }

  const fallbackBlockId = typeof protyle?.block?.id === 'string' ? protyle.block.id.trim() : '';
  return fallbackBlockId;
}

function buildMenuAnchorFromRect(rect: DOMRect | null | undefined): { x: number; y: number } | null {
  if (!rect) {
    return null;
  }
  const left = Number(rect.left);
  const top = Number(rect.top);
  const width = Number(rect.width);
  const height = Number(rect.height);
  if (!Number.isFinite(left) || !Number.isFinite(top)) {
    return null;
  }
  const safeWidth = Number.isFinite(width) ? Math.max(0, width) : 0;
  const safeHeight = Number.isFinite(height) ? Math.max(0, height) : 0;
  return {
    x: Math.round(left + (safeWidth > 0 ? safeWidth / 2 : 0)),
    y: Math.round(top + (safeHeight > 0 ? safeHeight : 18))
  };
}

function getCurrentContextMenuAnchor(protyle?: IProtyle): { x: number; y: number } | null {
  const editorRoot = protyle?.element instanceof HTMLElement ? protyle.element : null;
  const selection = window.getSelection();

  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const anchorNode = selection.anchorNode || range.startContainer;
    const anchorElement = anchorNode instanceof Element ? anchorNode : anchorNode?.parentElement || null;
    if (!editorRoot || (anchorElement && editorRoot.contains(anchorElement))) {
      const rect = range.getClientRects().length > 0 ? range.getClientRects()[0] : range.getBoundingClientRect();
      const fromRange = buildMenuAnchorFromRect(rect);
      if (fromRange) {
        return fromRange;
      }
      if (anchorElement instanceof HTMLElement) {
        const fromElement = buildMenuAnchorFromRect(anchorElement.getBoundingClientRect());
        if (fromElement) {
          return fromElement;
        }
      }
    }
  }

  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement) {
    if (!editorRoot || editorRoot.contains(activeElement)) {
      return buildMenuAnchorFromRect(activeElement.getBoundingClientRect());
    }
  }

  return null;
}

function getSelectionTriggerRangeForAt(editableRoot: HTMLElement): Range | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }
  const range = selection.getRangeAt(0);
  if (!range.collapsed) {
    return null;
  }
  const container = range.startContainer;
  const offset = range.startOffset;
  if (container.nodeType !== Node.TEXT_NODE || offset <= 0) {
    return null;
  }
  if (!editableRoot.contains(container)) {
    return null;
  }
  const textNode = container as Text;
  if (textNode.data.charAt(offset - 1) !== '@') {
    return null;
  }
  const triggerRange = document.createRange();
  triggerRange.setStart(textNode, offset - 1);
  triggerRange.setEnd(textNode, offset);
  return triggerRange;
}

function createRemoveAtTriggerCallback(triggerRange: Range, editableRoot: HTMLElement): () => void {
  const textNode = triggerRange.startContainer;
  const startOffset = triggerRange.startOffset;

  return () => {
    if (textNode.nodeType !== Node.TEXT_NODE || !textNode.isConnected) {
      return;
    }
    const targetText = textNode as Text;
    if (targetText.data.charAt(startOffset) !== '@') {
      return;
    }

    const deleteRange = document.createRange();
    deleteRange.setStart(targetText, startOffset);
    deleteRange.setEnd(targetText, startOffset + 1);

    const selection = window.getSelection();
    try {
      editableRoot.focus({ preventScroll: true });
    } catch {
      editableRoot.focus();
    }
    selection?.removeAllRanges();
    selection?.addRange(deleteRange);

    let deletedByEditor = false;
    try {
      deletedByEditor = document.execCommand('delete');
    } catch {
      deletedByEditor = false;
    }

    if (!deletedByEditor && targetText.data.charAt(startOffset) === '@') {
      deleteRange.deleteContents();
      try {
        editableRoot.dispatchEvent(new InputEvent('input', {
          bubbles: true,
          inputType: 'deleteContentBackward'
        }));
      } catch {
        editableRoot.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  };
}

async function resolveNearestTaskBlockId(blockId: string): Promise<string | null> {
  const normalizedBlockId = typeof blockId === 'string' ? blockId.trim() : '';
  if (!normalizedBlockId) {
    return null;
  }

  try {
    const escapedBlockId = escapeSqlLiteral(normalizedBlockId);
    const rows = await sql(`
      WITH RECURSIVE ancestors(id, parent_id, depth, subtype) AS (
        SELECT id, parent_id, 0 AS depth, subtype
        FROM blocks
        WHERE id = '${escapedBlockId}'
        UNION ALL
        SELECT b.id, b.parent_id, ancestors.depth + 1, b.subtype
        FROM blocks b
        JOIN ancestors ON ancestors.parent_id = b.id
        WHERE ancestors.parent_id != ''
          AND ancestors.depth < 20
      )
      SELECT id
      FROM ancestors
      WHERE subtype = 't'
      ORDER BY depth ASC
      LIMIT 1
    `) as Array<{ id?: string }>;

    const taskBlockId = rows?.[0]?.id;
    if (typeof taskBlockId !== 'string') {
      return null;
    }
    const normalizedTaskBlockId = taskBlockId.trim();
    return normalizedTaskBlockId.length > 0 ? normalizedTaskBlockId : null;
  } catch {
    return null;
  }
}

async function openTaskEditorFromCurrentContext(protyle?: IProtyle): Promise<void> {
  const contextBlockId = getCurrentContextBlockId(protyle);
  if (!contextBlockId) {
    showMessage(translate('message.noCurrentBlock', 'Current block not found'), 2000, 'error');
    return;
  }

  const taskBlockId = await resolveNearestTaskBlockId(contextBlockId);
  if (!taskBlockId) {
    showMessage(translate('message.currentBlockNotTask', 'Current block is not a task block'), 2000, 'error');
    return;
  }

  const menuAnchor = getCurrentContextMenuAnchor(protyle);

  openPinchDockView();

  const task = await TaskRepository.getTaskByBlockId(taskBlockId, true).catch(() => null);
  const rootId = typeof task?.rootId === 'string' ? task.rootId.trim() : '';
  const payload: TaskQuickMetaOpenRequest = {
    blockId: taskBlockId,
    rootId,
    anchorX: menuAnchor?.x,
    anchorY: menuAnchor?.y,
    task: task || undefined
  };
  eventBus.emit(Events.TASK_EDITOR_OPEN_REQUEST, payload);
  window.setTimeout(() => {
    eventBus.emit(Events.TASK_EDITOR_OPEN_REQUEST, payload);
  }, 180);
}

async function openTaskDateMenuByBlockId(
  blockId: string,
  anchor?: { x: number; y: number } | null
): Promise<void> {
  const normalizedBlockId = typeof blockId === 'string' ? blockId.trim() : '';
  if (!normalizedBlockId) {
    return;
  }

  const taskBlockId = await resolveNearestTaskBlockId(normalizedBlockId);
  if (!taskBlockId) {
    showMessage(translate('message.currentBlockNotTask', 'Current block is not a task block'), 2000, 'error');
    return;
  }

  openPinchDockView();

  const task = await TaskRepository.getTaskByBlockId(taskBlockId, true).catch(() => null);
  const rootId = typeof task?.rootId === 'string' ? task.rootId.trim() : '';
  const payload: TaskQuickMetaOpenRequest = {
    blockId: taskBlockId,
    rootId,
    anchorX: anchor?.x,
    anchorY: anchor?.y,
    task: task || undefined
  };
  eventBus.emit(Events.TASK_EDITOR_OPEN_REQUEST, payload);
  window.setTimeout(() => {
    eventBus.emit(Events.TASK_EDITOR_OPEN_REQUEST, payload);
  }, 180);
}

async function openTaskQuickMetaMenuByBlockId(
  blockId: string,
  anchor?: { x: number; y: number } | null,
  options: { removeTrigger?: () => void } = {}
): Promise<void> {
  const normalizedBlockId = typeof blockId === 'string' ? blockId.trim() : '';
  if (!normalizedBlockId) {
    return;
  }

  const taskBlockId = await resolveNearestTaskBlockId(normalizedBlockId);
  if (!taskBlockId) {
    showMessage(translate('message.currentBlockNotTask', 'Current block is not a task block'), 2000, 'error');
    return;
  }

  openPinchDockView();

  const task = await TaskRepository.getTaskByBlockId(taskBlockId, true).catch(() => null);
  const rootId = typeof task?.rootId === 'string' ? task.rootId.trim() : '';
  const payload: TaskQuickMetaOpenRequest = {
    blockId: taskBlockId,
    rootId,
    anchorX: anchor?.x,
    anchorY: anchor?.y,
    task: task || undefined,
    removeTrigger: options.removeTrigger
  };
  eventBus.emit(Events.TASK_QUICK_META_OPEN_REQUEST, payload);
  window.setTimeout(() => {
    eventBus.emit(Events.TASK_QUICK_META_OPEN_REQUEST, payload);
  }, 180);
}

let taskBlockIconMenuListener: ((event: CustomEvent<{
  menu: { addItem: (item: {
    icon?: string;
    label?: string;
    click?: () => void | Promise<void>;
  }) => void };
  blockElements: HTMLElement[];
}>) => void | Promise<void>) | null = null;
let taskQuickMetaInputListener: ((event: Event) => void) | null = null;
let taskQuickMetaCompositionStartListener: (() => void) | null = null;
let taskQuickMetaCompositionEndListener: (() => void) | null = null;
let isTaskQuickMetaComposing = false;

function registerTaskBlockIconMenu(pluginInstance: Plugin): void {
  if (taskBlockIconMenuListener) {
    pluginInstance.eventBus.off('click-blockicon', taskBlockIconMenuListener as any);
    taskBlockIconMenuListener = null;
  }

  taskBlockIconMenuListener = (event) => {
    const detail = event.detail;
    const blockElements = Array.isArray(detail?.blockElements) ? detail.blockElements : [];
    const primaryBlockElement = blockElements[0] || null;
    const sourceBlockId = getClosestBlockIdFromElement(primaryBlockElement);
    const domTaskBlockId = getTaskBlockIdFromElement(primaryBlockElement);
    const targetBlockId = domTaskBlockId || sourceBlockId;
    if (!targetBlockId) {
      return;
    }

    const anchor = getMenuAnchorFromBlockElement(primaryBlockElement);
    detail.menu.addItem({
      icon: 'iconCalendar',
      label: translate('menu.editTaskDate', 'Edit task date'),
      click: () => {
        void openTaskDateMenuByBlockId(targetBlockId, anchor);
      }
    });
  };

  pluginInstance.eventBus.on('click-blockicon', taskBlockIconMenuListener as any);
}

function unregisterTaskBlockIconMenu(): void {
  if (!plugin || !taskBlockIconMenuListener) {
    return;
  }
  plugin.eventBus.off('click-blockicon', taskBlockIconMenuListener as any);
  taskBlockIconMenuListener = null;
}

function resolveEditableRootFromEventTarget(target: EventTarget | null): HTMLElement | null {
  const element = target instanceof Element ? target : null;
  return element?.closest('[contenteditable="true"]') as HTMLElement | null;
}

async function openTaskQuickMetaFromAtInput(editableRoot: HTMLElement): Promise<void> {
  const triggerRange = getSelectionTriggerRangeForAt(editableRoot);
  if (!triggerRange) {
    return;
  }

  const anchorNode = triggerRange.startContainer;
  const anchorElement = anchorNode instanceof Element ? anchorNode : anchorNode.parentElement;
  const contextBlockId = getClosestBlockIdFromElement(anchorElement);
  if (!contextBlockId) {
    return;
  }

  const taskBlockId = await resolveNearestTaskBlockId(contextBlockId);
  if (!taskBlockId) {
    return;
  }

  const anchor = buildMenuAnchorFromRect(triggerRange.getBoundingClientRect())
    || buildMenuAnchorFromRect(anchorElement?.getBoundingClientRect());
  const removeTrigger = createRemoveAtTriggerCallback(triggerRange, editableRoot);
  await openTaskQuickMetaMenuByBlockId(taskBlockId, anchor, { removeTrigger });
}

function registerTaskQuickMetaInputTrigger(): void {
  unregisterTaskQuickMetaInputTrigger();

  taskQuickMetaCompositionStartListener = () => {
    isTaskQuickMetaComposing = true;
  };
  taskQuickMetaCompositionEndListener = () => {
    isTaskQuickMetaComposing = false;
  };
  taskQuickMetaInputListener = (event: Event) => {
    const inputEvent = event as InputEvent;
    if (
      isTaskQuickMetaComposing
      || inputEvent.isComposing
      || inputEvent.data !== '@'
      || (inputEvent.inputType && inputEvent.inputType !== 'insertText')
    ) {
      return;
    }

    const editableRoot = resolveEditableRootFromEventTarget(event.target);
    if (!editableRoot) {
      return;
    }

    void openTaskQuickMetaFromAtInput(editableRoot);
  };

  document.addEventListener('compositionstart', taskQuickMetaCompositionStartListener, true);
  document.addEventListener('compositionend', taskQuickMetaCompositionEndListener, true);
  document.addEventListener('input', taskQuickMetaInputListener, true);
}

function unregisterTaskQuickMetaInputTrigger(): void {
  if (taskQuickMetaCompositionStartListener) {
    document.removeEventListener('compositionstart', taskQuickMetaCompositionStartListener, true);
    taskQuickMetaCompositionStartListener = null;
  }
  if (taskQuickMetaCompositionEndListener) {
    document.removeEventListener('compositionend', taskQuickMetaCompositionEndListener, true);
    taskQuickMetaCompositionEndListener = null;
  }
  if (taskQuickMetaInputListener) {
    document.removeEventListener('input', taskQuickMetaInputListener, true);
    taskQuickMetaInputListener = null;
  }
  isTaskQuickMetaComposing = false;
}

function registerTaskEditorHotkeyCommand(pluginInstance: Plugin): void {
  pluginInstance.addCommand({
    langKey: 'pinchOpenTaskEditor',
    langText: translate('command.openTaskEditor', 'Open current task date popup'),
    hotkey: OPEN_TASK_EDITOR_HOTKEY,
    editorCallback: (protyle) => {
      void openTaskEditorFromCurrentContext(protyle as IProtyle);
    },
    globalCallback: () => {
      void openTaskEditorFromCurrentContext();
    }
  });
}

function registerGlobalTaskCreateCommand(pluginInstance: Plugin): void {
  pluginInstance.addCommand({
    langKey: 'pinchOpenGlobalTaskCreate',
    langText: translate('command.openGlobalTaskCreate', 'Open global task creation dialog'),
    hotkey: OPEN_GLOBAL_TASK_CREATE_HOTKEY,
    editorCallback: () => {
      void openGlobalTaskCreateDialog();
    },
    globalCallback: () => {
      void openGlobalTaskCreateDialog();
    }
  });
}

function emitTaskViewSwitchRequest(payload: TaskViewSwitchRequest): void {
  eventBus.emit(Events.KANBAN_VIEW_SWITCH_REQUEST, payload);
  window.setTimeout(() => {
    eventBus.emit(Events.KANBAN_VIEW_SWITCH_REQUEST, payload);
  }, 220);
  window.setTimeout(() => {
    eventBus.emit(Events.KANBAN_VIEW_SWITCH_REQUEST, payload);
  }, 480);
}

export async function openTaskViewByRequest(payload: TaskViewSwitchRequest): Promise<void> {
  await openKanbanView();
  emitTaskViewSwitchRequest(payload);
}

async function openTaskViewByMode(view: QuickTaskViewMode): Promise<void> {
  await openTaskViewByRequest({ view });
}

function registerTaskViewHotkeyCommands(pluginInstance: Plugin): void {
  QUICK_TASK_VIEW_COMMANDS.forEach((command) => {
    pluginInstance.addCommand({
      langKey: command.langKey,
      langText: translate(command.langTextKey, command.fallback),
      hotkey: '',
      editorCallback: () => {
        void openTaskViewByMode(command.view);
      },
      globalCallback: () => {
        void openTaskViewByMode(command.view);
      }
    });
  });
}

function createMobileBreadcrumbTaskButton() {
  let longPressTimer: number | null = null;
  let handledLongPress = false;

  const clearLongPressTimer = () => {
    if (longPressTimer !== null) {
      window.clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  };

  const startLongPress = () => {
    clearLongPressTimer();
    handledLongPress = false;
    longPressTimer = window.setTimeout(() => {
      handledLongPress = true;
      clearLongPressTimer();
      closeMobileTaskCreateDialog();
      openPinchDockView();
    }, MOBILE_BREADCRUMB_LONG_PRESS_MS);
  };

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'block__icon fn__flex-center ariaLabel';
  button.dataset.pinchMobileTaskCreate = 'true';
  button.innerHTML = '<svg style="width:18px;height:18px;"><use xlink:href="#ht-custom-icon"></use></svg>';
  button.setAttribute('aria-label', translate('task.new', 'New task'));
  button.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
    startLongPress();
  });
  button.addEventListener('touchstart', () => {
    startLongPress();
  }, { passive: true });
  button.addEventListener('mousedown', () => {
    startLongPress();
  });
  button.addEventListener('pointerup', () => {
    clearLongPressTimer();
  });
  button.addEventListener('touchend', () => {
    clearLongPressTimer();
  });
  button.addEventListener('touchcancel', () => {
    clearLongPressTimer();
  });
  button.addEventListener('mouseup', () => {
    clearLongPressTimer();
  });
  button.addEventListener('pointerleave', () => {
    clearLongPressTimer();
  });
  button.addEventListener('mouseleave', () => {
    clearLongPressTimer();
  });
  button.addEventListener('pointercancel', () => {
    clearLongPressTimer();
  });
  button.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    clearLongPressTimer();
    if (handledLongPress) {
      handledLongPress = false;
      return;
    }
    void openGlobalTaskCreateDialog();
  });
  return button;
}

function resolveMobileBreadcrumbButtonHost(breadcrumb: HTMLElement): HTMLElement {
  return breadcrumb.querySelector<HTMLElement>('.protyle-breadcrumb__bar')
    || breadcrumb.querySelector<HTMLElement>('.fn__flex')
    || breadcrumb;
}

function ensureMobileBreadcrumbTaskButtons() {
  if (!isMobileFrontend()) {
    return;
  }

  const breadcrumbs = document.querySelectorAll<HTMLElement>('.protyle-breadcrumb');
  breadcrumbs.forEach((breadcrumb) => {
    const host = resolveMobileBreadcrumbButtonHost(breadcrumb);
    if (!host || host.querySelector('[data-pinch-mobile-task-create="true"]')) {
      return;
    }
    host.appendChild(createMobileBreadcrumbTaskButton());
  });
}

function cleanupMobileSidebarPinchView() {
  if (mobileSidebarPinchApp) {
    mobileSidebarPinchApp.unmount();
    mobileSidebarPinchApp = null;
  }
  document
    .querySelectorAll<HTMLElement>(`[data-type="${MOBILE_PINCH_PANEL_TYPE}"][${MOBILE_PINCH_PANEL_ATTR}="true"]`)
    .forEach((panel) => panel.remove());
}

function cleanupLegacyMobileToolbarEntry() {
  document
    .querySelectorAll<HTMLElement>(
      '[data-pinch-mobile-toolbar-button="true"], .toolbar__icon[data-type="sidebar-pinch-tab"]'
    )
    .forEach((button) => button.remove());
}

function scheduleMobileBreadcrumbButtonRefresh() {
  if (mobileBreadcrumbRefreshRaf) {
    return;
  }
  mobileBreadcrumbRefreshRaf = window.requestAnimationFrame(() => {
    mobileBreadcrumbRefreshRaf = 0;
    ensureMobileBreadcrumbTaskButtons();
  });
}

function startMobileBreadcrumbButtonObserver() {
  if (!isMobileFrontend()) {
    return;
  }

  ensureMobileBreadcrumbTaskButtons();
  cleanupLegacyMobileToolbarEntry();
  mobileBreadcrumbObserver?.disconnect();
  mobileBreadcrumbObserver = new MutationObserver(() => {
    scheduleMobileBreadcrumbButtonRefresh();
  });
  mobileBreadcrumbObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function stopMobileBreadcrumbButtonObserver() {
  mobileBreadcrumbObserver?.disconnect();
  mobileBreadcrumbObserver = null;
  if (mobileBreadcrumbRefreshRaf) {
    window.cancelAnimationFrame(mobileBreadcrumbRefreshRaf);
    mobileBreadcrumbRefreshRaf = 0;
  }
  document
    .querySelectorAll('[data-pinch-mobile-task-create="true"]')
    .forEach((button) => button.remove());
  cleanupLegacyMobileToolbarEntry();
  cleanupMobileSidebarPinchView();
}

function cleanupMobileTaskCreateApp() {
  if (mobileTaskCreateApp) {
    mobileTaskCreateApp.unmount();
    mobileTaskCreateApp = null;
  }
}

function handleMobileTaskCreateDialogDestroyed() {
  cleanupMobileTaskCreateApp();
  mobileTaskCreateDialog = null;
}

function closeMobileTaskCreateDialog() {
  if (!mobileTaskCreateDialog) {
    cleanupMobileTaskCreateApp();
    return;
  }

  const dialog = mobileTaskCreateDialog;
  mobileTaskCreateDialog = null;
  cleanupMobileTaskCreateApp();
  dialog.destroy();
}

async function openTaskCreateFromMobileBreadcrumb() {
  if (mobileTaskCreateDialog) {
    return true;
  }

  let dialog: Dialog | null = null;
  try {
    const mountId = `pinch-mobile-task-create-${Date.now()}`;
    dialog = new Dialog({
      transparent: true,
      disableClose: true,
      hideCloseIcon: true,
      disableAnimation: true,
      content: `<div id="${mountId}" style="width:100%;height:100%;position:relative;"></div>`,
      width: '100vw',
      height: '100vh',
      destroyCallback: () => {
        handleMobileTaskCreateDialogDestroyed();
      }
    });
    dialog.element.classList.add('pinch-mobile-task-create-dialog');

    const mountElement = dialog.element.querySelector(`#${mountId}`) as HTMLElement | null;
    if (!mountElement) {
      dialog.destroy();
      return false;
    }

    mobileTaskCreateDialog = dialog;
    mobileTaskCreateApp = createApp(MobileTaskCreateDialog, {
      onClose: closeMobileTaskCreateDialog,
    });
    mobileTaskCreateApp.mount(mountElement);
    return true;
  } catch (error) {
    console.error('Failed to open mobile task create dialog:', error);
    if (dialog) {
      dialog.destroy();
    } else {
      handleMobileTaskCreateDialogDestroyed();
    }
    return false;
  }
}

async function openGlobalTaskCreateDialog() {
  return openTaskCreateFromMobileBreadcrumb();
}

let app = null;
export function init(pluginInstance: Plugin) {
  // bind plugin hook
  usePlugin(pluginInstance);
  registerIcons(pluginInstance);
  registerTopBarViewButton(pluginInstance);
  registerTaskEditorHotkeyCommand(pluginInstance);
  registerGlobalTaskCreateCommand(pluginInstance);
  registerTaskViewHotkeyCommands(pluginInstance);
  registerTaskBlockIconMenu(pluginInstance);
  registerTaskQuickMetaInputTrigger();
  startMobileBreadcrumbButtonObserver();
  startTaskReminderScheduler();

  // Ensure the data directory exists.
  ensureDataDir('/data/storage/petal/Pinch-habit');
  ensureDataDir('/data/storage/petal/stand');
  ensureDataDir('/data/storage/petal/pinch/audio');

  unsubscribeMobileKanbanCloseRequest?.();
  unsubscribeMobileKanbanCloseRequest = eventBus.on(
    Events.MOBILE_KANBAN_DIALOG_CLOSE_REQUEST,
    () => {
      closeMobileKanbanDialog();
    }
  );

  // Register the custom tab.
  pluginInstance.addTab({
    type: KANBAN_TAB_TYPE,
    init: function() {
      if (this.element) {
        initKanbanView(this.element as HTMLElement);
      }
    },
    destroy: function() {
      if (kanbanApp) {
        kanbanApp.unmount();
        kanbanApp = null;
      }
    }
  });

  const dockHandle = pluginInstance.addDock({
    config: {
      position: "RightTop",
      size: { width: 500, height: 400 },
      icon: 'ht-custom-icon',
      title: "Pinch-habit",
    },
    data: {},
    type: "Pinch-habit",
    init: (dock) => {
      const container = document.createElement('div');
      container.id = 'Pinch-habit-app';
      container.style.width = '100%';
      container.style.height = '100%';
      app = createApp(App);

      if (dock.element) {
        pinchDockElement = dock.element as HTMLElement;
        dock.element.innerHTML = '';
        dock.element.style.overflow = 'hidden';
        if (window.getComputedStyle(dock.element).position === 'static') {
          dock.element.style.position = 'relative';
        }
        dock.element.appendChild(container);
        app.mount(container);
      }
    },
    destroy: () => {
      if (app) {
        app.unmount();
      }
      const container = document.getElementById('Pinch-habit-app');
      if (container) {
        container.remove();
      }
      pinchDockElement = null;
    }
  });
  pinchDockModel = dockHandle?.model || null;
}

export function destroy() {
  stopTaskReminderScheduler();
  stopMobileBreadcrumbButtonObserver();
  unregisterTaskBlockIconMenu();
  unregisterTaskQuickMetaInputTrigger();
  destroyDetachedFocusWindow();
  topBarViewButton?.remove();
  topBarViewButton = null;
  unsubscribeMobileKanbanCloseRequest?.();
  unsubscribeMobileKanbanCloseRequest = null;
  closeMobileTaskCreateDialog();
  cleanupMobileSidebarPinchView();
  if (app) {
    app.unmount();
  }
  closeMobileKanbanDialog();
  pinchDockModel = null;
  pinchDockElement = null;
  const container = document.getElementById('Pinch-habit-app');
  if (container) {
    container.remove();
  }
}

function cleanupMobileKanbanApp() {
  if (mobileKanbanApp) {
    mobileKanbanApp.unmount();
    mobileKanbanApp = null;
  }
}

function closeMobileKanbanDialog() {
  if (!mobileKanbanDialog) {
    cleanupMobileKanbanApp();
    return;
  }

  const dialog = mobileKanbanDialog;
  mobileKanbanDialog = null;
  cleanupMobileKanbanApp();
  dialog.destroy();
}

function prepareMobileKanbanDialogChrome(dialog: Dialog) {
  const dialogRoot = dialog.element as HTMLElement | null;
  if (!dialogRoot) {
    return;
  }

  const header = dialogRoot.querySelector('.resize__move.b3-dialog__header') as HTMLElement | null;
  const closeButton = (header?.querySelector('.b3-dialog__close') as HTMLButtonElement | null)
    || (dialogRoot.querySelector('.b3-dialog__close') as HTMLButtonElement | null);

  if (closeButton && !closeButton.dataset.pinchMobileKanbanCloseBound) {
    closeButton.dataset.pinchMobileKanbanCloseBound = 'true';
    closeButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeMobileKanbanDialog();
    });
  }
}

function openKanbanMobileDialog(): boolean {
  let dialog: Dialog | null = null;
  try {
    closeMobileKanbanDialog();

    const mountId = `pinch-mobile-kanban-${Date.now()}`;
    dialog = new Dialog({
      title: translate('app.pinchTasks', 'Pinch Tasks'),
      content: `<div id="${mountId}" style="width:100%;height:100%;"></div>`,
      width: '100vw',
      height: '100vh',
      destroyCallback: () => {
        cleanupMobileKanbanApp();
        mobileKanbanDialog = null;
      }
    });
    dialog.element.classList.add('pinch-mobile-kanban-dialog');

    const mountElement = dialog.element.querySelector(`#${mountId}`) as HTMLElement | null;
    if (!mountElement) {
      dialog.destroy();
      return false;
    }

    mobileKanbanApp = createApp(KanbanView, {
      showDialogCloseButton: true,
      onDialogClose: closeMobileKanbanDialog,
    });
    mobileKanbanApp.mount(mountElement);
    mobileKanbanDialog = dialog;
    prepareMobileKanbanDialogChrome(dialog);
    return true;
  } catch (error) {
    console.error('Failed to open mobile kanban dialog:', error);
    if (dialog) {
      dialog.destroy();
    } else {
      cleanupMobileKanbanApp();
      mobileKanbanDialog = null;
    }
    return false;
  }
}

function isElementVisible(element: HTMLElement | null): boolean {
  if (!element) {
    return false;
  }

  let current: HTMLElement | null = element;
  while (current) {
    if (current.classList.contains('fn__none')) {
      return false;
    }

    const style = window.getComputedStyle(current);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }

    current = current.parentElement;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && element.getClientRects().length > 0;
}

function isPinchDockViewVisible(): boolean {
  return isElementVisible(document.getElementById('Pinch-habit-app') as HTMLElement | null);
}

export function getPinchDockElement(): HTMLElement | null {
  if (pinchDockElement?.isConnected) {
    return pinchDockElement;
  }

  const appElement = document.getElementById('Pinch-habit-app') as HTMLElement | null;
  const dockElement = appElement?.parentElement as HTMLElement | null;
  if (dockElement) {
    pinchDockElement = dockElement;
    if (window.getComputedStyle(dockElement).position === 'static') {
      dockElement.style.position = 'relative';
    }
    return dockElement;
  }

  pinchDockElement = null;
  return null;
}

function matchesPinchDockTrigger(element: HTMLElement): boolean {
  if (element.dataset.pinchMobileTaskCreate === 'true') {
    return false;
  }

  const haystack = [
    element.getAttribute('data-type') || '',
    element.getAttribute('data-id') || '',
    element.getAttribute('title') || '',
    element.getAttribute('aria-label') || '',
    element.textContent || '',
  ].join(' ');

  return /Pinch-habit-app|Pinch-habit|Pinch Habit/i.test(haystack);
}

function findPinchDockTrigger(): HTMLElement | null {
  const selectors = [
    `[data-type="${PINCH_DOCK_TYPE}"]`,
    `.dock__item[data-type="${PINCH_DOCK_TYPE}"]`,
    `[data-id="Pinch-habit-app"]`,
    `[title="${PINCH_DOCK_TYPE}"]`,
    `[aria-label="${PINCH_DOCK_TYPE}"]`,
  ];

  for (const selector of selectors) {
    const trigger = document.querySelector(selector) as HTMLElement | null;
    if (trigger) {
      return trigger;
    }
  }

  const fallbackCandidates = document.querySelectorAll<HTMLElement>(
    'button, [role="button"], .dock__item, .b3-list-item, [data-type], [data-id], [title], [aria-label]'
  );
  for (const candidate of fallbackCandidates) {
    if (matchesPinchDockTrigger(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function openPinchDockView(): boolean {
  const model = pinchDockModel;
  if (model && (typeof model.showDock === 'function' || typeof model.toggleModel === 'function')) {
    try {
      model.showDock?.(true);
      model.toggleModel?.(PINCH_DOCK_TYPE, true);
    } catch {
    }
  }

  if (isPinchDockViewVisible()) {
    return true;
  }

  const trigger = findPinchDockTrigger();
  if (!trigger) {
    return isMobileFrontend() ? openMobilePinchPluginPage() : false;
  }

  trigger.click();
  return isPinchDockViewVisible() || !isMobileFrontend() || openMobilePinchPluginPage();
}

export function openHabitTrackerPanel(payload: HabitTrackerPanelOpenRequest): boolean {
  const opened = openPinchDockView();
  eventBus.emit(Events.HABIT_TRACKER_PANEL_OPEN_REQUEST, payload);
  window.setTimeout(() => eventBus.emit(Events.HABIT_TRACKER_PANEL_OPEN_REQUEST, payload), 220);
  window.setTimeout(() => eventBus.emit(Events.HABIT_TRACKER_PANEL_OPEN_REQUEST, payload), 480);
  return opened;
}

export function openHabitTrackerFocusTimer(
  target: FocusTimerPanelOpenRequest['target'] = null
): boolean {
  const opened = openPinchDockView();
  eventBus.emit(Events.FOCUS_TIMER_PANEL_OPEN_REQUEST, { target });
  return opened;
}

export async function openKanbanView() {
  if (!plugin) {
    console.error('Plugin not initialized');
    return;
  }

  const frontend = getFrontend();
  const isMobile = frontend === 'mobile' || frontend === 'browser-mobile';
  if (isMobile) {
    if (!openKanbanMobileDialog() && !openPinchDockView()) {
      console.warn('Pinch mobile view trigger not found on mobile frontend');
    }
    return;
  }

  try {
    // Check whether the kanban tab already exists.
    const existingTab = findExistingKanbanTab();
    
    if (existingTab) {
      // If it already exists, activate that tab.
      existingTab.click();
      return;
    }

    // Otherwise create a new tab.
    const tab = await openTab({
      app: plugin.app,
      custom: {
        // SiYuan uses this identifier to restore pinned custom tabs from the layout.
        // It must be the plugin name followed by the registered tab type.
        id: `${plugin.name}${KANBAN_TAB_TYPE}`,
        icon: 'ht-custom-icon',
        title: translate('app.kanbanTabTitle', 'Pinch View'),
        data: {}
      }
    });

    if (tab) {
      setTimeout(() => {
        const panelElement = (tab as any).panelElement;
        if (panelElement && !panelElement.querySelector('#kanban-app')) {
          initKanbanView(panelElement);
        }
      }, 200);
    }
  } catch (error) {
    console.error('Failed to open kanban view:', error);
  }
}

function findExistingKanbanTab(): HTMLElement | null {
  // Find all tab headers via the DOM.
  const tabHeaders = document.querySelectorAll('li[data-type="tab-header"]');
  
  for (let i = 0; i < tabHeaders.length; i++) {
    const tabHeader = tabHeaders[i] as HTMLElement;
    const titleElement = tabHeader.querySelector('.item__text');
    const iconElement = tabHeader.querySelector('.item__graphic');
    
    const title = titleElement?.textContent;
    
    // Check whether this is a Pinch view tab.
    if (
      iconElement
      && (
        title === translate('app.kanbanTabTitle', 'Pinch View')
        || title === LEGACY_KANBAN_TAB_TITLE
        || title === 'Pinch View'
      )
    ) {
      const hasIcon = iconElement.innerHTML.includes('ht-custom-icon');
      if (hasIcon) {
        return tabHeader;
      }
    }
  }
  
  return null;
}

export function initKanbanView(element: HTMLElement) {
  if (kanbanApp) {
    kanbanApp.unmount();
  }

  element.innerHTML = '';
  
  const container = document.createElement('div');
  container.style.width = '100%';
  container.style.height = '100%';
  container.id = 'kanban-app';
  element.appendChild(container);

  kanbanApp = createApp(KanbanView);
  kanbanApp.mount(container);
}

