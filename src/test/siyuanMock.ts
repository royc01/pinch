type MenuItem = {
  click?: (...args: any[]) => void;
  [key: string]: any;
};

class EventBusMock {
  private listeners = new Map<string, Set<(...args: any[]) => void>>();

  on(eventName: string, listener: (...args: any[]) => void): void {
    const listeners = this.listeners.get(eventName) || new Set();
    listeners.add(listener);
    this.listeners.set(eventName, listeners);
  }

  off(eventName: string, listener: (...args: any[]) => void): void {
    this.listeners.get(eventName)?.delete(listener);
  }

  emit(eventName: string, payload?: unknown): void {
    this.listeners.get(eventName)?.forEach(listener => listener(payload));
  }
}

export class Menu {
  public items: MenuItem[] = [];

  addItem(item: MenuItem): HTMLElement {
    this.items.push(item);
    const element = document.createElement('button');
    element.type = 'button';
    element.textContent = String(item?.label || item?.icon || '');
    element.addEventListener('click', () => item?.click?.());
    return element;
  }

  addSeparator(): HTMLElement {
    const element = document.createElement('hr');
    return element;
  }

  open(): void {}
  close(): void {}
  showSubMenu(): void {}
}

export class Dialog {
  public element: HTMLElement;
  public editors: Record<string, unknown> = {};

  constructor(options: { title?: string; content?: string; width?: string; height?: string; destroyCallback?: () => void } = {}) {
    this.element = document.createElement('div');
    this.element.className = 'b3-dialog';
    this.element.innerHTML = options.content || '';
    this.destroyCallback = options.destroyCallback;
    document.body.appendChild(this.element);
  }

  private destroyCallback?: () => void;

  destroy(): void {
    this.element.remove();
    this.destroyCallback?.();
  }
}

export class Protyle {
  public protyle: Record<string, any>;

  constructor(_app: unknown, element: HTMLElement, options: Record<string, any> = {}) {
    this.protyle = {
      element,
      options,
      wysiwyg: {
        element,
      },
    };
    options?.after?.(this);
  }

  destroy(): void {}
  focusBlock(): void {}
  insert(): void {}
}

export abstract class Plugin {
  public app: Record<string, any> = {};
  public eventBus = new EventBusMock();
  public protyleOptions: Record<string, any> = {};

  addCommand(): void {}
  addDock(): HTMLElement {
    return document.createElement('div');
  }
  addTopBar(): HTMLElement {
    return document.createElement('button');
  }
  loadData(): Promise<unknown> {
    return Promise.resolve(null);
  }
  saveData(): Promise<void> {
    return Promise.resolve();
  }
}

export function getFrontend(): 'desktop' {
  return 'desktop';
}

export function showMessage(): void {}

export function openEmoji(options: { callback?: (emoji: string) => void }): void {
  options?.callback?.('😀');
}

export function confirm(_title: string, _text: string, confirmCallback?: () => void): void {
  confirmCallback?.();
}

export function fetchPost(_url: string, _data?: unknown, callback?: (response: unknown) => void): void {
  callback?.({ code: 0, data: null });
}

export function fetchSyncPost(): Promise<{ code: number; data: null }> {
  return Promise.resolve({ code: 0, data: null });
}

export function openTab(): void {}
export function openMobileFileById(): void {}
export function getAllEditor(): Protyle[] {
  return [];
}

export const IWebSocketData = {};
