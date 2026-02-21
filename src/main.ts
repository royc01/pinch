import {
  Plugin,
  openTab,
} from "siyuan";
import { createApp } from 'vue'
import App from './App.vue'
import KanbanView from './components/KanbanView.vue'

// 确保数据目录存在
import { ensureDataDir } from '@/utils';
let plugin: Plugin | null = null;
let kanbanApp = null;
export function usePlugin(pluginProps?: Plugin): Plugin | null {
  if (pluginProps) {
    plugin = pluginProps;
    
  }
  
  

  
  if (!plugin && !pluginProps) {
    console.error('need bind plugin');
  }
  
  return plugin;
}


let app = null;
export function init(pluginInstance: Plugin) {
  // bind plugin hook
  usePlugin(pluginInstance);

  // 注入自定义SVG图标到DOM
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
  pluginInstance.addDock({
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
}

export function destroy() {
  if (app) {
    app.unmount();
  }
  const container = document.getElementById('Pinch-habit-app');
  if (container) {
    container.remove();
  }
}

export async function openKanbanView() {
  if (!plugin) {
    console.error('Plugin not initialized');
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
