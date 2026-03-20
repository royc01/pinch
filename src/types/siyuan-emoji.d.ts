declare module 'siyuan' {
  export function getFrontend(): 'desktop' | 'desktop-window' | 'mobile' | 'browser-desktop' | 'browser-mobile';
  export class Protyle {
    constructor(...args: unknown[]);
    focusBlock(element: Element, toStart?: boolean): false | Range;
    destroy(): void;
  }
  export function openEmoji(options: {
    position: { x: number; y: number };
    selectedCB?: (emoji: string) => void;
    dynamicIconURL?: string;
    hideDynamicIcon?: boolean;
    hideCustomIcon?: boolean;
  }): void;
}
