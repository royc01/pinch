declare module '*.vue' {
  import type { DefineComponent } from 'vue';

  const component: DefineComponent<Record<string, never>, Record<string, never>, any>;
  export default component;
  export interface LifelogTimelinePanelItem {
    [key: string]: any;
  }
}
