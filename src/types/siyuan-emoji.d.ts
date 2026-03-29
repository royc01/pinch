import 'siyuan';

declare module 'siyuan' {
  export function openEmoji(options: {
    position: { x: number; y: number };
    selectedCB?: (emoji: string) => void;
    dynamicIconURL?: string;
    hideDynamicIcon?: boolean;
    hideCustomIcon?: boolean;
  }): void;
}
