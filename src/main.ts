import {
  Dialog,
  Plugin,
  getFrontend,
  openTab,
  showMessage,
} from "siyuan";
import { createApp } from 'vue'
import App from './App.vue'
import MobileTaskCreateDialog from './components/MobileTaskCreateDialog.vue'
import KanbanView from './components/KanbanView.vue'

// 确保数据目录存在
import { ensureDataDir } from '@/utils';
let plugin: Plugin | null = null;
let kanbanApp = null;
let mobileKanbanDialog: Dialog | null = null;
let mobileKanbanApp: any = null;
let mobileTaskCreateDialog: Dialog | null = null;
let mobileTaskCreateApp: any = null;
let mobilePinchDialog: Dialog | null = null;
let mobilePinchApp: any = null;
let pinchDockModel: any = null;
const PINCH_DOCK_TYPE = 'Pinch-habit';
const MOBILE_BREADCRUMB_LONG_PRESS_MS = 480;
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
    viewBox: '0 0 24 24',
    path: 'M21.7,10c-1.7-0.2-2.6,0.8-3.3,1.8c-1.4,2.4-3,2.5-4.3,2.5c-2.5,0-4.2-1.8-4.2-4.5c0-2.7,1.7-4.5,4.2-4.5\t\tc2.1,0,3.5,0.6,4.4,2.6c0.4,0.9,1.4,2.1,2.9,1.9c1.6-0.4,2.5-1.9,1.9-4C22.7,3.2,19.5,0,14.1,0C8.7,0,4.8,3.7,4.4,9h0v0.2\t\tc0,0.2,0,0.4,0,0.7c0,0.2,0,0.5,0,0.7v14.8c0,1.5,1.2,2.8,2.8,2.8s2.8-1.2,2.8-2.8v-6.5c1.2,0.5,2.7,0.9,4.2,0.9\tc5,0,8.6-3.2,9.3-6.5C23.7,12,23.4,10.3,21.7,10z',
  },
  {
    id: 'stand-custom-icon',
    viewBox: '0 0 1024 1024',
    path: 'M512.67794 65.291029C265.701966 65.004503 66.200236 263.518742 65.293587 510.472204c-0.916882 247.286036 198.739367 447.915449 446.048939 448.236767 247.38632 0.322341 447.196065-199.272509 447.366957-446.883957C958.882422 265.25734 759.426741 65.579601 512.67794 65.291029zM772.621251 544.93204c-0.64059 26.420743-15.491833 41.562605-41.989323 41.606607-47.989991 0.080841-95.982028 0.124843-143.972019 0.151449 0.01228 45.808302 0.017396 91.615581-0.026606 137.418766-0.033769 35.107589-13.380752 48.577369-48.030923 48.683792-19.839861 0.061398-39.694047 0.370437-59.528791-0.11154-26.414603-0.642636-41.552371-15.495926-41.596374-41.999556-0.079818-47.998177-0.12382-95.996354-0.150426-143.993508-47.941895-0.027629-95.882767-0.072655-143.826709-0.154519-26.546609-0.044002-41.48381-15.205307-42.060955-41.548278-0.478907-21.701255-0.385786-43.417859-0.038886-65.119113 0.438998-27.465538 15.230889-42.333154 42.967604-42.441625 47.653323-0.176009 95.307669-0.155543 142.959969-0.122797 0.027629-47.950082 0.072655-95.89914 0.154519-143.851269 0.041956-26.552749 15.20019-41.49302 41.537022-42.070164 21.694091-0.477884 43.408649-0.385786 65.103764-0.037862 27.460422 0.438998 42.323944 15.233959 42.432415 42.977837 0.176009 47.667649 0.155543 95.335299 0.122797 143.001925 45.796022-0.01228 91.591021-0.017396 137.38295 0.026606 35.100426 0.033769 48.565089 13.382798 48.671513 48.039109C772.796236 505.231853 773.105275 525.093203 772.621251 544.93204z',
  },
] as const;

function buildIconSymbol(id: string, viewBox: string, path: string) {
  return `<symbol id="${id}" viewBox="${viewBox}"><path d="${path}" /></symbol>`;
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

let mobileBreadcrumbObserver: MutationObserver | null = null;
let mobileBreadcrumbRefreshRaf = 0;

function isMobileFrontend() {
  try {
    const frontend = getFrontend();
    return frontend === 'mobile' || frontend === 'browser-mobile';
  } catch {
    return false;
  }
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
      showMessage('\u6B63\u5728\u6253\u5F00 Pinch \u9875\u9762', 1500, 'info');
      void openPinchViewFromMobileBreadcrumb();
    }, MOBILE_BREADCRUMB_LONG_PRESS_MS);
  };

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'block__icon fn__flex-center ariaLabel';
  button.dataset.pinchMobileTaskCreate = 'true';
  button.setAttribute('aria-label', '新建任务');
  button.setAttribute('title', '新建任务');
  button.innerHTML = '<svg style="width:18px;height:18px;"><use xlink:href="#ht-custom-icon"></use></svg>';
  button.setAttribute('aria-label', '\u65B0\u5EFA\u4EFB\u52A1');
  button.setAttribute('title', '\u65B0\u5EFA\u4EFB\u52A1\uff08\u957F\u6309\u6253\u5F00 Pinch-habit-app\uff09');
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
    void openTaskCreateFromMobileBreadcrumb();
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

function cleanupMobilePinchApp() {
  if (mobilePinchApp) {
    mobilePinchApp.unmount();
    mobilePinchApp = null;
  }
}

function handleMobilePinchDialogDestroyed() {
  cleanupMobilePinchApp();
  mobilePinchDialog = null;
}

function closeMobilePinchDialog() {
  if (!mobilePinchDialog) {
    cleanupMobilePinchApp();
    return;
  }

  const dialog = mobilePinchDialog;
  mobilePinchDialog = null;
  dialog.destroy();
}

function openPinchMobileDialog(): boolean {
  if (mobilePinchDialog) {
    return true;
  }

  let dialog: Dialog | null = null;
  try {
    const mountId = `pinch-mobile-app-${Date.now()}`;
    dialog = new Dialog({
      title: 'Pinch',
      content: `<div id="${mountId}" style="width:100%;height:100%;"></div>`,
      width: '100vw',
      height: '100vh',
      destroyCallback: () => {
        handleMobilePinchDialogDestroyed();
      }
    });

    const mountElement = dialog.element.querySelector(`#${mountId}`) as HTMLElement | null;
    if (!mountElement) {
      dialog.destroy();
      return false;
    }

    mobilePinchDialog = dialog;
    mobilePinchApp = createApp(App);
    mobilePinchApp.mount(mountElement);
    return true;
  } catch (error) {
    console.error('Failed to open mobile Pinch dialog:', error);
    if (dialog) {
      dialog.destroy();
    } else {
      handleMobilePinchDialogDestroyed();
    }
    return false;
  }
}

async function waitForPinchDockViewVisible(timeoutMs = 320): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (isPinchDockViewVisible()) {
      return true;
    }
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
  }
  return isPinchDockViewVisible();
}

async function openPinchViewFromMobileBreadcrumb() {
  if (openPinchMobileDialog()) {
    return true;
  }

  if (openPinchDockView() && await waitForPinchDockViewVisible()) {
    return true;
  }

  showMessage('\u65E0\u6CD5\u6253\u5F00 Pinch \u9875\u9762', 3000, 'error');
  return false;
}

let app = null;
export function init(pluginInstance: Plugin) {
  // bind plugin hook
  usePlugin(pluginInstance);
  registerIcons(pluginInstance);
  startMobileBreadcrumbButtonObserver();

  // 注入自定义SVG图标到DOM
  if (false) {
    const customIconId = 'ht-custom-icon';
  const standIconId = 'stand-custom-icon';
  
  // 注入习惯追踪图标
  let siyuanSvgDefs = document.querySelector('svg defs') as SVGElement;
  
  if (siyuanSvgDefs) {
    if (!document.querySelector(`#${customIconId}`)) {
      const symbolElement = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
      symbolElement.setAttribute('id', customIconId);
      symbolElement.setAttribute('viewBox', '0 0 24 24');
      
      const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathElement.setAttribute('d', 'M21.7,10c-1.7-0.2-2.6,0.8-3.3,1.8c-1.4,2.4-3,2.5-4.3,2.5c-2.5,0-4.2-1.8-4.2-4.5c0-2.7,1.7-4.5,4.2-4.5\t\tc2.1,0,3.5,0.6,4.4,2.6c0.4,0.9,1.4,2.1,2.9,1.9c1.6-0.4,2.5-1.9,1.9-4C22.7,3.2,19.5,0,14.1,0C8.7,0,4.8,3.7,4.4,9h0v0.2\t\tc0,0.2,0,0.4,0,0.7c0,0.2,0,0.5,0,0.7v14.8c0,1.5,1.2,2.8,2.8,2.8s2.8-1.2,2.8-2.8v-6.5c1.2,0.5,2.7,0.9,4.2,0.9\tc5,0,8.6-3.2,9.3-6.5C23.7,12,23.4,10.3,21.7,10z');
      
      symbolElement.appendChild(pathElement);
      siyuanSvgDefs.appendChild(symbolElement);
    }
    
    // 注入 Stand 看板图标
    if (!document.querySelector(`#${standIconId}`)) {
      const standSymbolElement = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
      standSymbolElement.setAttribute('id', standIconId);
      standSymbolElement.setAttribute('viewBox', '0 0 1024 1024');
      
      const standPathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      standPathElement.setAttribute('d', 'M512.67794 65.291029C265.701966 65.004503 66.200236 263.518742 65.293587 510.472204c-0.916882 247.286036 198.739367 447.915449 446.048939 448.236767 247.38632 0.322341 447.196065-199.272509 447.366957-446.883957C958.882422 265.25734 759.426741 65.579601 512.67794 65.291029zM772.621251 544.93204c-0.64059 26.420743-15.491833 41.562605-41.989323 41.606607-47.989991 0.080841-95.982028 0.124843-143.972019 0.151449 0.01228 45.808302 0.017396 91.615581-0.026606 137.418766-0.033769 35.107589-13.380752 48.577369-48.030923 48.683792-19.839861 0.061398-39.694047 0.370437-59.528791-0.11154-26.414603-0.642636-41.552371-15.495926-41.596374-41.999556-0.079818-47.998177-0.12382-95.996354-0.150426-143.993508-47.941895-0.027629-95.882767-0.072655-143.826709-0.154519-26.546609-0.044002-41.48381-15.205307-42.060955-41.548278-0.478907-21.701255-0.385786-43.417859-0.038886-65.119113 0.438998-27.465538 15.230889-42.333154 42.967604-42.441625 47.653323-0.176009 95.307669-0.155543 142.959969-0.122797 0.027629-47.950082 0.072655-95.89914 0.154519-143.851269 0.041956-26.552749 15.20019-41.49302 41.537022-42.070164 21.694091-0.477884 43.408649-0.385786 65.103764-0.037862 27.460422 0.438998 42.323944 15.233959 42.432415 42.977837 0.176009 47.667649 0.155543 95.335299 0.122797 143.001925 45.796022-0.01228 91.591021-0.017396 137.38295 0.026606 35.100426 0.033769 48.565089 13.382798 48.671513 48.039109C772.796236 505.231853 773.105275 525.093203 772.621251 544.93204z');
      
      standSymbolElement.appendChild(standPathElement);
      siyuanSvgDefs.appendChild(standSymbolElement);
    }
  } else {
    // 如果没有找到现有defs，创建新的SVG容器
    const svgContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgContainer.setAttribute('data-name', 'siyuan-plugin-Pinch-habit');
    svgContainer.style.position = 'absolute';
    svgContainer.style.width = '0';
    svgContainer.style.height = '0';
    svgContainer.style.overflow = 'hidden';
    
    // 创建defs和symbol
    const defsElement = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    
    // 习惯追踪图标
    const symbolElement = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
    symbolElement.setAttribute('id', customIconId);
    symbolElement.setAttribute('viewBox', '0 0 24 24');
    
    const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathElement.setAttribute('d', 'M21.7,10c-1.7-0.2-2.6,0.8-3.3,1.8c-1.4,2.4-3,2.5-4.3,2.5c-2.5,0-4.2-1.8-4.2-4.5c0-2.7,1.7-4.5,4.2-4.5\t\tc2.1,0,3.5,0.6,4.4,2.6c0.4,0.9,1.4,2.1,2.9,1.9c1.6-0.4,2.5-1.9,1.9-4C22.7,3.2,19.5,0,14.1,0C8.7,0,4.8,3.7,4.4,9h0v0.2\t\tc0,0.2,0,0.4,0,0.7c0,0.2,0,0.5,0,0.7v14.8c0,1.5,1.2,2.8,2.8,2.8s2.8-1.2,2.8-2.8v-6.5c1.2,0.5,2.7,0.9,4.2,0.9\tc5,0,8.6-3.2,9.3-6.5C23.7,12,23.4,10.3,21.7,10z');
    
    symbolElement.appendChild(pathElement);
    defsElement.appendChild(symbolElement);
    
    // Stand 看板图标
    const standSymbolElement = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
    standSymbolElement.setAttribute('id', standIconId);
    standSymbolElement.setAttribute('viewBox', '0 0 1024 1024');
    
    const standPathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    standPathElement.setAttribute('d', 'M512.67794 65.291029C265.701966 65.004503 66.200236 263.518742 65.293587 510.472204c-0.916882 247.286036 198.739367 447.915449 446.048939 448.236767 247.38632 0.322341 447.196065-199.272509 447.366957-446.883957C958.882422 265.25734 759.426741 65.579601 512.67794 65.291029zM772.621251 544.93204c-0.64059 26.420743-15.491833 41.562605-41.989323 41.606607-47.989991 0.080841-95.982028 0.124843-143.972019 0.151449 0.01228 45.808302 0.017396 91.615581-0.026606 137.418766-0.033769 35.107589-13.380752 48.577369-48.030923 48.683792-19.839861 0.061398-39.694047 0.370437-59.528791-0.11154-26.414603-0.642636-41.552371-15.495926-41.596374-41.999556-0.079818-47.998177-0.12382-95.996354-0.150426-143.993508-47.941895-0.027629-95.882767-0.072655-143.826709-0.154519-26.546609-0.044002-41.48381-15.205307-42.060955-41.548278-0.478907-21.701255-0.385786-43.417859-0.038886-65.119113 0.438998-27.465538 15.230889-42.333154 42.967604-42.441625 47.653323-0.176009 95.307669-0.155543 142.959969-0.122797 0.027629-47.950082 0.072655-95.89914 0.154519-143.851269 0.041956-26.552749 15.20019-41.49302 41.537022-42.070164 21.694091-0.477884 43.408649-0.385786 65.103764-0.037862 27.460422 0.438998 42.323944 15.233959 42.432415 42.977837 0.176009 47.667649 0.155543 95.335299 0.122797 143.001925 45.796022-0.01228 91.591021-0.017396 137.38295 0.026606 35.100426 0.033769 48.565089 13.382798 48.671513 48.039109C772.796236 505.231853 773.105275 525.093203 772.621251 544.93204z');
    
    standSymbolElement.appendChild(standPathElement);
    defsElement.appendChild(standSymbolElement);
    
    svgContainer.appendChild(defsElement);
    
    // 添加到body
    document.body.appendChild(svgContainer);
  }
  }

  // 确保数据目录存在
  ensureDataDir('/data/storage/petal/Pinch-habit');
  ensureDataDir('/data/storage/petal/stand');

  // 注册自定义 Tab
  pluginInstance.addTab({
    type: 'kanban',
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

  // 添加侧边栏面板
  const dockHandle = pluginInstance.addDock({
    config: {
      position: "RightTop",  // 位置：右上角
      size: { width: 500, height: 400 },  // 初始大小
      icon: 'ht-custom-icon',  // 图标
      title: "Pinch-habit",  // 标题
    },
    data: {},
    type: "Pinch-habit",  // 类型
    init: (dock) => {
      // 创建容器元素
      const container = document.createElement('div');
      container.id = 'Pinch-habit-app';
      container.style.width = '100%';
      container.style.height = '100%';
      
      // 创建Vue应用实例
      app = createApp(App);
      
      // 确保在DOM元素完全准备后再挂载
      if (dock.element) {
        // 在挂载Vue应用前，先清空dock元素并添加我们的容器
        dock.element.innerHTML = '';
        dock.element.style.overflow = 'hidden';
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
    }
  });
  pinchDockModel = dockHandle?.model || null;
}

export function destroy() {
  stopMobileBreadcrumbButtonObserver();
  closeMobileTaskCreateDialog();
  closeMobilePinchDialog();
  if (app) {
    app.unmount();
  }
  if (mobileKanbanApp) {
    mobileKanbanApp.unmount();
    mobileKanbanApp = null;
  }
  if (mobileKanbanDialog) {
    mobileKanbanDialog.destroy();
    mobileKanbanDialog = null;
  }
  pinchDockModel = null;
  const container = document.getElementById('Pinch-habit-app');
  if (container) {
    container.remove();
  }
}

function openKanbanMobileDialog(): boolean {
  try {
    if (mobileKanbanApp) {
      mobileKanbanApp.unmount();
      mobileKanbanApp = null;
    }
    if (mobileKanbanDialog) {
      mobileKanbanDialog.destroy();
      mobileKanbanDialog = null;
    }

    const mountId = `pinch-mobile-kanban-${Date.now()}`;
    const dialog = new Dialog({
      title: 'Pinch Tasks',
      content: `<div id="${mountId}" style="width:100%;height:100%;"></div>`,
      width: '100vw',
      height: '100vh',
      destroyCallback: () => {
        if (mobileKanbanApp) {
          mobileKanbanApp.unmount();
          mobileKanbanApp = null;
        }
        mobileKanbanDialog = null;
      }
    });

    const mountElement = dialog.element.querySelector(`#${mountId}`) as HTMLElement | null;
    if (!mountElement) {
      dialog.destroy();
      return false;
    }

    mobileKanbanApp = createApp(KanbanView);
    mobileKanbanApp.mount(mountElement);
    mobileKanbanDialog = dialog;
    return true;
  } catch (error) {
    console.error('Failed to open mobile kanban dialog:', error);
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

function openPinchDockView(): boolean {
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
    return false;
  }

  trigger.click();
  return true;
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
    // 检查是否已存在 kanban 标签页
    const existingTab = findExistingKanbanTab();
    
    if (existingTab) {
      // 如果已存在，激活该标签页
      existingTab.click();
      return;
    }

    // 如果不存在，创建新标签页
    const tab = await openTab({
      app: plugin.app,
      custom: {
        id: 'kanban',
        icon: 'ht-custom-icon',
        title: 'pinch视图',
        data: {}
      }
    });

    if (tab) {
      // 手动初始化（因为 tab 的 init 回调可能不会自动触发）
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
  // 通过 DOM 查询查找所有标签页
  const tabHeaders = document.querySelectorAll('li[data-type="tab-header"]');
  
  for (let i = 0; i < tabHeaders.length; i++) {
    const tabHeader = tabHeaders[i] as HTMLElement;
    const titleElement = tabHeader.querySelector('.item__text');
    const iconElement = tabHeader.querySelector('.item__graphic');
    
    const title = titleElement?.textContent;
    
    // 检查是否是 pinch 视图标签页
    if (title === 'pinch视图' && iconElement) {
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
