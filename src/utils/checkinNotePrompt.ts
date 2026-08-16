export interface CheckinNotePromptBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface CheckinNotePromptAnchor {
  left: number;
  top: number;
  right: number;
  bottom: number;
  /** The plugin panel that owns the completion control, when available. */
  bounds?: CheckinNotePromptBounds;
}

export interface CheckinNotePromptDetail {
  date: string;
  eventKey: string;
  context?: CheckinNoteContext;
  /** Viewport coordinates of the control that completed the item. */
  anchor?: CheckinNotePromptAnchor;
}

export const CHECKIN_NOTE_PROMPT_EVENT = 'pinch-checkin-note-prompt';

let lastPointerTarget: Element | null = null;
let lastPointerTime = 0;

if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', event => {
    if (event.target instanceof Element) {
      lastPointerTarget = event.target;
      lastPointerTime = Date.now();
    }
  }, true);
}

export function getCheckinNotePromptAnchor(element: Element | null): CheckinNotePromptAnchor | undefined {
  const preferredElement = element?.closest('.check-in-btn, .task-checkbox-wrapper, button, input, [role="checkbox"]');
  const anchorElement = preferredElement instanceof HTMLElement
    ? preferredElement
    : (element instanceof HTMLElement ? element : null);
  if (!anchorElement) return undefined;
  const rect = anchorElement.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return undefined;
  const panel = anchorElement.closest('.Pinch-habit-container, #Pinch-habit-app, #kanban-app');
  const panelRect = panel?.getBoundingClientRect();
  const bounds = panelRect && panelRect.width > 0 && panelRect.height > 0
    ? { left: panelRect.left, top: panelRect.top, right: panelRect.right, bottom: panelRect.bottom }
    : undefined;
  return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, bounds };
}

export function getLocalCheckinNoteDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function requestCheckinNote(detail: CheckinNotePromptDetail): void {
  if (typeof window === 'undefined' || !detail.date || !detail.eventKey) return;
  const recentPointerTarget = Date.now() - lastPointerTime < 5_000 ? lastPointerTarget : null;
  const activeElement = document.activeElement;
  const anchorElement = recentPointerTarget ?? (activeElement instanceof HTMLElement ? activeElement : null);
  const anchor = getCheckinNotePromptAnchor(anchorElement);
  window.dispatchEvent(new CustomEvent<CheckinNotePromptDetail>(CHECKIN_NOTE_PROMPT_EVENT, {
    detail: { ...detail, anchor: detail.anchor ?? anchor }
  }));
}
import type { CheckinNoteContext } from '@/checkinNoteRepository';
