import { onUnmounted } from 'vue';

type MutationCallback = (mutations: MutationRecord[]) => void;

class DocumentObserverManager {
  private static instance: DocumentObserverManager;
  private observer: MutationObserver | null = null;
  private callbacks: Set<MutationCallback> = new Set();
  private isObserving = false;

  private constructor() {}

  static getInstance(): DocumentObserverManager {
    if (!DocumentObserverManager.instance) {
      DocumentObserverManager.instance = new DocumentObserverManager();
    }
    return DocumentObserverManager.instance;
  }

  private handleMutations = (mutations: MutationRecord[]) => {
    this.callbacks.forEach(callback => callback(mutations));
  };

  observe(target: Node, options: MutationObserverInit): void {
    if (!this.observer) {
      this.observer = new MutationObserver(this.handleMutations);
    }

    if (!this.isObserving) {
      this.observer.observe(target, options);
      this.isObserving = true;
    }
  }

  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.isObserving = false;
    }
  }

  register(callback: MutationCallback): () => void {
    this.callbacks.add(callback);

    return () => {
      this.callbacks.delete(callback);
      if (this.callbacks.size === 0) {
        this.disconnect();
      }
    };
  }

  getCallbackCount(): number {
    return this.callbacks.size;
  }
}

export function useDocumentObserver() {
  const manager = DocumentObserverManager.getInstance();
  let unregister: (() => void) | null = null;

  const observe = (
    target: Node,
    options: MutationObserverInit,
    callback: MutationCallback
  ) => {
    manager.observe(target, options);
    unregister = manager.register(callback);
  };

  onUnmounted(() => {
    if (unregister) {
      unregister();
      unregister = null;
    }
  });

  return {
    observe,
    disconnect: () => manager.disconnect(),
    getCallbackCount: () => manager.getCallbackCount()
  };
}
