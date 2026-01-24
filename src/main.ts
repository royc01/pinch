import {
  Plugin,
} from "siyuan";
import { createApp } from 'vue'
import App from './App.vue'

// 确保数据目录存在
import { ensureDataDir } from '@/utils';
let plugin: Plugin | null = null;
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
  
  // 尝试将自定义图标注入到思源笔记的SVG符号系统中
  // 首先查找现有的SVG定义容器
  let siyuanSvgDefs = document.querySelector('svg defs') as SVGElement;
  
  if (siyuanSvgDefs) {
    // 如果找到现有defs，检查是否已有该图标
    if (!document.querySelector(`#${customIconId}`)) {
      // 创建symbol元素并添加到现有defs中
      const symbolElement = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
      symbolElement.setAttribute('id', customIconId);
      symbolElement.setAttribute('viewBox', '0 0 24 24');
      
      const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathElement.setAttribute('d', 'M21.7,10c-1.7-0.2-2.6,0.8-3.3,1.8c-1.4,2.4-3,2.5-4.3,2.5c-2.5,0-4.2-1.8-4.2-4.5c0-2.7,1.7-4.5,4.2-4.5\t\tc2.1,0,3.5,0.6,4.4,2.6c0.4,0.9,1.4,2.1,2.9,1.9c1.6-0.4,2.5-1.9,1.9-4C22.7,3.2,19.5,0,14.1,0C8.7,0,4.8,3.7,4.4,9h0v0.2\t\tc0,0.2,0,0.4,0,0.7c0,0.2,0,0.5,0,0.7v14.8c0,1.5,1.2,2.8,2.8,2.8s2.8-1.2,2.8-2.8v-6.5c1.2,0.5,2.7,0.9,4.2,0.9\tc5,0,8.6-3.2,9.3-6.5C23.7,12,23.4,10.3,21.7,10z');
      
      symbolElement.appendChild(pathElement);
      siyuanSvgDefs.appendChild(symbolElement);
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
    const symbolElement = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
    symbolElement.setAttribute('id', customIconId);
    symbolElement.setAttribute('viewBox', '0 0 24 24');
    
    const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathElement.setAttribute('d', 'M21.7,10c-1.7-0.2-2.6,0.8-3.3,1.8c-1.4,2.4-3,2.5-4.3,2.5c-2.5,0-4.2-1.8-4.2-4.5c0-2.7,1.7-4.5,4.2-4.5\t\tc2.1,0,3.5,0.6,4.4,2.6c0.4,0.9,1.4,2.1,2.9,1.9c1.6-0.4,2.5-1.9,1.9-4C22.7,3.2,19.5,0,14.1,0C8.7,0,4.8,3.7,4.4,9h0v0.2\t\tc0,0.2,0,0.4,0,0.7c0,0.2,0,0.5,0,0.7v14.8c0,1.5,1.2,2.8,2.8,2.8s2.8-1.2,2.8-2.8v-6.5c1.2,0.5,2.7,0.9,4.2,0.9\tc5,0,8.6-3.2,9.3-6.5C23.7,12,23.4,10.3,21.7,10z');
    
    symbolElement.appendChild(pathElement);
    defsElement.appendChild(symbolElement);
    svgContainer.appendChild(defsElement);
    
    // 添加到body
    document.body.appendChild(svgContainer);
  }

  // 确保数据目录存在
  ensureDataDir('/data/storage/petal/Pinch-habit');

  // 添加侧边栏面板
  pluginInstance.addDock({
    config: {
      position: "RightTop",  // 位置：右上角
      size: { width: 300, height: 400 },  // 初始大小
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
