import { addFocusSession, upsertFocusSessionRecord, type FocusSessionTargetInput } from '@/api';
import {
  getActiveFocusSessionOwner,
  setActiveFocusSessionOwner,
  subscribeFocusSessionOwner,
  type FocusSessionOwner
} from '@/composables/useFocusSessionLock';
import { awardFocusSession } from '@/rewardRepository';
import {
  openFocusTimerLinkedTarget,
  type FocusTimerLinkedTarget
} from '@/utils/focusTimerTarget';
import {
  loadHabitFocusTargetOptions,
  loadTaskFocusTargetOptions,
  type FocusTargetPickerMode
} from '@/utils/focusTimerTargetPicker';
import { translate } from '@/composables/useI18n';
import type { FocusTimerHandoffState } from '@/utils/focusTimerHandoff';

type ElectronLike = {
  ipcMain: {
    handle: (channel: string, listener: (...args: any[]) => any) => void;
    removeHandler: (channel: string) => void;
  };
  BrowserWindow?: BrowserWindowStaticLike;
};

type BrowserWindowStaticLike = {
  new (options: Record<string, unknown>): any;
  fromWebContents?: (webContents: unknown) => any;
  getAllWindows?: () => any[];
};

type RemoteLike = {
  BrowserWindow: BrowserWindowStaticLike;
  getCurrentWindow: () => any;
};

type DetachedFocusTheme = {
  background: string;
  border: string;
  shadow: string;
  text: string;
  subtleText: string;
  hover: string;
  accent: string;
  breakAccent: string;
  stopBg: string;
  stopText: string;
  fontFamily: string;
  emojiFontFamily: string;
  emojiFontStylesheetHrefs: string[];
  emojiFontInlineCss: string;
};

type DetachedFocusWindowState = {
  linkedTarget: FocusTimerLinkedTarget | null;
  activeOwner: FocusSessionOwner | null;
  theme: DetachedFocusTheme;
};

type DetachedFocusRequest =
  | { type: 'get-state' }
  | { type: 'claim-focus-session'; owner?: FocusSessionOwner }
  | { type: 'release-focus-session'; owner?: FocusSessionOwner }
  | {
      type: 'record-focus-session';
      minutes?: number;
      target?: FocusTimerLinkedTarget | null;
      source?: 'capsule';
    }
  | {
      type: 'upsert-focus-session';
      sessionId?: string;
      minutes?: number;
      target?: FocusTimerLinkedTarget | null;
      final?: boolean;
      source?: 'capsule';
    }
  | { type: 'open-linked-target' }
  | { type: 'load-target-options'; mode?: FocusTargetPickerMode }
  | { type: 'set-linked-target'; target?: FocusTimerLinkedTarget | null }
  | { type: 'disable-floating-focus' }
  | { type: 'set-expanded'; expanded?: boolean };

const DETACHED_FOCUS_REQUEST_CHANNEL = 'pinch-detached-focus:request';
const DETACHED_FOCUS_WINDOW_BOUNDS_KEY = 'pinch-detached-focus-window-bounds';
const DETACHED_FOCUS_SESSION_EVENT = 'pinch-focus-session';
const DETACHED_FOCUS_DISABLE_EVENT = 'pinch-detached-focus:disable';
const DETACHED_FOCUS_LINKED_TARGET_EVENT = 'pinch-detached-focus:linked-target';
const DETACHED_FOCUS_WINDOW_TITLE = 'Pinch Focus Capsule';
const DETACHED_FOCUS_WINDOW_WIDTH = 280;
const DETACHED_FOCUS_WINDOW_COLLAPSED_HEIGHT = 56;
const DETACHED_FOCUS_WINDOW_EXPANDED_HEIGHT = 420;
const DETACHED_FOCUS_WINDOW_MARGIN = 24;
const DETACHED_FOCUS_DEFAULT_FONT_FAMILY = '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';
const DETACHED_FOCUS_COUNTUP_AUTOSAVE_INTERVAL_MS = 60_000;

let detachedFocusWindow: any | null = null;
let detachedFocusWindowExpanded = false;
let ipcHandlerRegistered = false;
let focusSessionUnsubscribe: (() => void) | null = null;
let latestLinkedTarget: FocusTimerLinkedTarget | null = null;
let latestThemeSnapshot: DetachedFocusTheme | null = null;
let latestHabitTargetOptions: FocusTimerLinkedTarget[] = [];
let latestTaskTargetOptions: FocusTimerLinkedTarget[] = [];
let targetOptionsRefreshPromise: Promise<void> | null = null;
let pendingDetachedFocusOpenSettings = false;
let pendingDetachedFocusHandoff: FocusTimerHandoffState | null = null;

function notifyDetachedFocusDisableRequest(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new CustomEvent(DETACHED_FOCUS_DISABLE_EVENT));
}

export function subscribeDetachedFocusDisableRequest(listener: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleDisable = () => {
    listener();
  };

  window.addEventListener(DETACHED_FOCUS_DISABLE_EVENT, handleDisable);
  return () => {
    window.removeEventListener(DETACHED_FOCUS_DISABLE_EVENT, handleDisable);
  };
}

function notifyDetachedFocusLinkedTargetChange(target: FocusTimerLinkedTarget | null): void {
  latestLinkedTarget = target;

  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(DETACHED_FOCUS_LINKED_TARGET_EVENT, { detail: target }));
}

export function subscribeDetachedFocusLinkedTargetChange(
  listener: (target: FocusTimerLinkedTarget | null) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleLinkedTargetChange = (event: Event) => {
    listener((event as CustomEvent<FocusTimerLinkedTarget | null>).detail ?? null);
  };

  window.addEventListener(DETACHED_FOCUS_LINKED_TARGET_EVENT, handleLinkedTargetChange);
  return () => {
    window.removeEventListener(DETACHED_FOCUS_LINKED_TARGET_EVENT, handleLinkedTargetChange);
  };
}

async function loadFocusTargetOptions(mode: FocusTargetPickerMode): Promise<FocusTimerLinkedTarget[]> {
  const cached = mode === 'habit' ? latestHabitTargetOptions : latestTaskTargetOptions;
  if (cached.length > 0) {
    return cached;
  }

  await refreshDetachedFocusTargetOptions(mode);

  if (mode === 'habit') {
    return latestHabitTargetOptions;
  }

  return latestTaskTargetOptions;
}

async function refreshDetachedFocusTargetOptions(mode?: FocusTargetPickerMode): Promise<void> {
  if (targetOptionsRefreshPromise) {
    await targetOptionsRefreshPromise;
    return;
  }

  targetOptionsRefreshPromise = (async () => {
    if (!mode || mode === 'habit') {
      try {
        latestHabitTargetOptions = await loadHabitFocusTargetOptions();
      } catch (error) {
        console.error('[DetachedFocusWindow] Failed to load habit candidates:', error);
      }
    }

    if (!mode || mode === 'task') {
      try {
        latestTaskTargetOptions = await loadTaskFocusTargetOptions();
      } catch (error) {
        console.error('[DetachedFocusWindow] Failed to load task candidates:', error);
      }
    }
  })();

  try {
    await targetOptionsRefreshPromise;
  } finally {
    targetOptionsRefreshPromise = null;
  }
}

function getRuntimeRequire(): ((id: string) => any) | null {
  if (typeof require === 'function') {
    return require;
  }
  const runtimeRequire = (window as unknown as { require?: (id: string) => any }).require;
  return typeof runtimeRequire === 'function' ? runtimeRequire : null;
}

function getRemote(): RemoteLike | null {
  try {
    const runtimeRequire = getRuntimeRequire();
    if (!runtimeRequire) {
      return null;
    }
    return runtimeRequire('@electron/remote') as RemoteLike;
  } catch {
    return null;
  }
}

function getElectronMain(): ElectronLike | null {
  try {
    const remote = getRemote();
    if (!remote) {
      return null;
    }
    const runtimeRequire = getRuntimeRequire();
    if (!runtimeRequire) {
      return null;
    }
    remote.getCurrentWindow();
    return runtimeRequire('@electron/remote').require('electron') as ElectronLike;
  } catch {
    return null;
  }
}

export function isDetachedFocusWindowSupported(): boolean {
  try {
    const remote = getRemote();
    return !!remote?.getCurrentWindow?.();
  } catch {
    return false;
  }
}

export function isDetachedFocusHostWindowMinimized(): boolean {
  try {
    const currentWindow = getRemote()?.getCurrentWindow?.();
    return !!currentWindow?.isMinimized?.();
  } catch {
    return false;
  }
}

function closeBrowserWindow(windowLike: any): void {
  if (!windowLike || windowLike.isDestroyed?.()) {
    return;
  }

  try {
    windowLike.close?.();
  } catch {
    // Ignore close failures from stale Electron window handles.
  }
}

function closeDetachedFocusWindowFromEvent(event: unknown): void {
  const sender = (event as { sender?: unknown } | null)?.sender;
  if (!sender) {
    return;
  }

  try {
    const sourceWindow = getElectronMain()?.BrowserWindow?.fromWebContents?.(sender);
    if (!sourceWindow) {
      return;
    }

    if (sourceWindow === detachedFocusWindow) {
      detachedFocusWindow = null;
      detachedFocusWindowExpanded = false;
    }
    closeBrowserWindow(sourceWindow);
  } catch {
    // Ignore cleanup failures from a renderer that is already going away.
  }
}

function closeOrphanedDetachedFocusWindows(): void {
  try {
    const windows = getElectronMain()?.BrowserWindow?.getAllWindows?.() || [];
    for (const candidate of windows) {
      if (candidate === detachedFocusWindow) {
        continue;
      }

      const title = typeof candidate?.getTitle === 'function' ? candidate.getTitle() : '';
      if (title === DETACHED_FOCUS_WINDOW_TITLE) {
        closeBrowserWindow(candidate);
      }
    }
  } catch {
    // Ignore cleanup failures while SiYuan is reloading plugin windows.
  }
}

export function subscribeDetachedFocusHostWindowState(
  listener: (minimized: boolean) => void
): () => void {
  try {
    const currentWindow = getRemote()?.getCurrentWindow?.();
    if (!currentWindow?.on) {
      listener(false);
      return () => {};
    }

    const notify = () => {
      listener(!!currentWindow.isMinimized?.());
    };

    currentWindow.on('minimize', notify);
    currentWindow.on('restore', notify);
    currentWindow.on('show', notify);
    currentWindow.on('hide', notify);
    notify();

    return () => {
      try {
        currentWindow.removeListener?.('minimize', notify);
        currentWindow.removeListener?.('restore', notify);
        currentWindow.removeListener?.('show', notify);
        currentWindow.removeListener?.('hide', notify);
      } catch {
        // Ignore listener cleanup failures.
      }
    };
  } catch {
    listener(false);
    return () => {};
  }
}

function serializeForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const GENERIC_FONT_FAMILY_TOKENS = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'math',
  'fangsong',
  'inherit',
  'initial',
  'unset',
  'revert',
  'revert-layer'
]);

function normalizeFontFamilyToken(token: string): string {
  return token.trim().replace(/^['"]+|['"]+$/g, '').trim().toLowerCase();
}

function extractFontFamilyCandidates(fontFamilyValue: string): string[] {
  if (!fontFamilyValue) {
    return [];
  }

  const families = fontFamilyValue
    .split(',')
    .map((token) => normalizeFontFamilyToken(token))
    .filter((token) => token && !GENERIC_FONT_FAMILY_TOKENS.has(token));

  return Array.from(new Set(families));
}

function resolveEmojiFontFamily(variableEmojiFontFamily: string): string {
  if (typeof document === 'undefined') {
    return variableEmojiFontFamily;
  }

  const probeHost = document.body || document.documentElement;
  if (!probeHost) {
    return variableEmojiFontFamily;
  }

  const probe = document.createElement('span');
  probe.textContent = 'probe';
  probe.style.position = 'absolute';
  probe.style.opacity = '0';
  probe.style.pointerEvents = 'none';
  probe.style.fontFamily = 'var(--b3-font-family-emoji)';

  probeHost.appendChild(probe);

  try {
    return window.getComputedStyle(probe).fontFamily.trim() || variableEmojiFontFamily;
  } finally {
    probe.remove();
  }
}

function getStyleSheetHref(sheet: CSSStyleSheet): string {
  if (typeof sheet.href === 'string' && sheet.href.trim()) {
    return sheet.href.trim();
  }

  const ownerNode = sheet.ownerNode;
  if (ownerNode instanceof HTMLLinkElement && ownerNode.href) {
    return ownerNode.href;
  }

  return '';
}

function isMatchingEmojiFontFaceRule(
  rule: CSSFontFaceRule,
  emojiFontFamilies: Set<string>,
  emojiFontFamilyCandidates: string[]
): boolean {
  const family = normalizeFontFamilyToken(rule.style.getPropertyValue('font-family'));
  const src = rule.style.getPropertyValue('src').trim();
  const cssText = rule.cssText;
  const fingerprint = `${family} ${src} ${cssText}`.toLowerCase();

  if (family && emojiFontFamilies.has(family)) {
    return true;
  }

  if (emojiFontFamilyCandidates.some((candidate) => fingerprint.includes(candidate))) {
    return true;
  }

  return fingerprint.includes('twemoji') || fingerprint.includes('emoji');
}

function collectEmojiFontResourcesFromRules(
  rules: CSSRuleList,
  ownerSheet: CSSStyleSheet,
  emojiFontFamilies: Set<string>,
  emojiFontFamilyCandidates: string[],
  fontFamilies: Set<string>,
  stylesheetHrefs: Set<string>,
  inlineCssRules: string[],
  visitedSheets: Set<CSSStyleSheet>
): boolean {
  let hasEmojiFont = false;
  const stylesheetHref = getStyleSheetHref(ownerSheet);

  for (const rule of Array.from(rules)) {
    if (rule.type === CSSRule.FONT_FACE_RULE) {
      const fontFaceRule = rule as CSSFontFaceRule;
      if (!isMatchingEmojiFontFaceRule(fontFaceRule, emojiFontFamilies, emojiFontFamilyCandidates)) {
        continue;
      }

      hasEmojiFont = true;
      const family = fontFaceRule.style.getPropertyValue('font-family').trim();
      if (family) {
        fontFamilies.add(family);
      }

      if (stylesheetHref) {
        stylesheetHrefs.add(stylesheetHref);
      } else if (fontFaceRule.cssText) {
        inlineCssRules.push(fontFaceRule.cssText);
      }
      continue;
    }

    if (rule.type === CSSRule.IMPORT_RULE) {
      const importedSheet = (rule as CSSImportRule).styleSheet;
      if (
        importedSheet
        && collectEmojiFontResourcesFromSheet(
          importedSheet,
          emojiFontFamilies,
          emojiFontFamilyCandidates,
          fontFamilies,
          stylesheetHrefs,
          inlineCssRules,
          visitedSheets
        )
      ) {
        hasEmojiFont = true;
      }
      continue;
    }

    const nestedRules = (rule as CSSRule & { cssRules?: CSSRuleList }).cssRules;
    if (
      nestedRules
      && collectEmojiFontResourcesFromRules(
        nestedRules,
        ownerSheet,
        emojiFontFamilies,
        emojiFontFamilyCandidates,
        fontFamilies,
        stylesheetHrefs,
        inlineCssRules,
        visitedSheets
      )
    ) {
      hasEmojiFont = true;
    }
  }

  if (hasEmojiFont && stylesheetHref) {
    stylesheetHrefs.add(stylesheetHref);
  }

  return hasEmojiFont;
}

function collectEmojiFontResourcesFromSheet(
  sheet: CSSStyleSheet,
  emojiFontFamilies: Set<string>,
  emojiFontFamilyCandidates: string[],
  fontFamilies: Set<string>,
  stylesheetHrefs: Set<string>,
  inlineCssRules: string[],
  visitedSheets: Set<CSSStyleSheet>
): boolean {
  if (visitedSheets.has(sheet)) {
    return false;
  }
  visitedSheets.add(sheet);

  let rules: CSSRuleList;
  try {
    rules = sheet.cssRules;
  } catch {
    return false;
  }

  return collectEmojiFontResourcesFromRules(
    rules,
    sheet,
    emojiFontFamilies,
    emojiFontFamilyCandidates,
    fontFamilies,
    stylesheetHrefs,
    inlineCssRules,
    visitedSheets
  );
}

function getEmojiFontResources(): Pick<
  DetachedFocusTheme,
  'emojiFontFamily' | 'emojiFontStylesheetHrefs' | 'emojiFontInlineCss'
> {
  const rootStyles = window.getComputedStyle(document.documentElement);
  const variableEmojiFontFamily = rootStyles.getPropertyValue('--b3-font-family-emoji').trim();
  const resolvedEmojiFontFamily = resolveEmojiFontFamily(variableEmojiFontFamily);
  const emojiFontFamilyCandidates = extractFontFamilyCandidates(
    resolvedEmojiFontFamily || variableEmojiFontFamily
  );
  const emojiFontFamilies = new Set(emojiFontFamilyCandidates);
  const fontFamilies = new Set<string>();
  const stylesheetHrefs = new Set<string>();
  const inlineCssRules: string[] = [];
  const visitedSheets = new Set<CSSStyleSheet>();

  for (const sheet of Array.from(document.styleSheets)) {
    collectEmojiFontResourcesFromSheet(
      sheet,
      emojiFontFamilies,
      emojiFontFamilyCandidates,
      fontFamilies,
      stylesheetHrefs,
      inlineCssRules,
      visitedSheets
    );
  }

  return {
    emojiFontFamily:
      resolvedEmojiFontFamily
      || variableEmojiFontFamily
      || Array.from(fontFamilies).join(', ')
      || '',
    emojiFontStylesheetHrefs: Array.from(stylesheetHrefs),
    emojiFontInlineCss: inlineCssRules.join('\n')
  };
}

function getThemeSnapshot(): DetachedFocusTheme {
  const root = document.documentElement;
  const styles = window.getComputedStyle(root);
  const bodyFontFamily = document.body
    ? window.getComputedStyle(document.body).fontFamily.trim()
    : '';
  const rootFontFamily = styles.fontFamily.trim();
  const emojiFonts = getEmojiFontResources();
  return {
    background: styles.getPropertyValue('--b3-theme-background').trim() || '#ffffff',
    border: styles.getPropertyValue('--b3-border-color').trim() || 'rgba(0, 0, 0, 0.08)',
    shadow: styles.getPropertyValue('--b3-point-shadow').trim() || '0 10px 24px rgba(15, 23, 42, 0.18)',
    text: styles.getPropertyValue('--b3-theme-on-background').trim() || '#20262f',
    subtleText: styles.getPropertyValue('--b3-theme-on-surface').trim() || 'rgba(32, 38, 47, 0.74)',
    hover: styles.getPropertyValue('--b3-list-hover').trim() || 'rgba(15, 23, 42, 0.08)',
    accent: '#f98f7a',
    breakAccent: '#4dab9a',
    stopBg: 'rgba(231, 76, 60, 0.16)',
    stopText: '#e74c3c',
    fontFamily: bodyFontFamily || rootFontFamily || DETACHED_FOCUS_DEFAULT_FONT_FAMILY,
    emojiFontFamily: emojiFonts.emojiFontFamily,
    emojiFontStylesheetHrefs: emojiFonts.emojiFontStylesheetHrefs,
    emojiFontInlineCss: emojiFonts.emojiFontInlineCss
  };
}

function getDetachedFocusWindowState(): DetachedFocusWindowState {
  latestThemeSnapshot = getThemeSnapshot();
  return {
    linkedTarget: latestLinkedTarget,
    activeOwner: getActiveFocusSessionOwner(),
    theme: latestThemeSnapshot
  };
}

function getDetachedWindowBounds():
  | { x: number; y: number; width: number; height: number }
  | null {
  try {
    const raw = localStorage.getItem(DETACHED_FOCUS_WINDOW_BOUNDS_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<Record<'x' | 'y' | 'width' | 'height', number>>;
    if (
      typeof parsed.x !== 'number'
      || typeof parsed.y !== 'number'
      || typeof parsed.width !== 'number'
      || typeof parsed.height !== 'number'
    ) {
      return null;
    }
    return {
      x: Math.round(parsed.x),
      y: Math.round(parsed.y),
      width: Math.max(DETACHED_FOCUS_WINDOW_WIDTH, Math.round(parsed.width)),
      height: Math.max(DETACHED_FOCUS_WINDOW_COLLAPSED_HEIGHT, Math.round(parsed.height))
    };
  } catch {
    return null;
  }
}

function saveDetachedWindowBounds(win: any): void {
  try {
    if (!win || typeof win.getBounds !== 'function') {
      return;
    }
    const bounds = win.getBounds();
    if (
      typeof bounds?.x !== 'number'
      || typeof bounds?.y !== 'number'
      || typeof bounds?.width !== 'number'
      || typeof bounds?.height !== 'number'
    ) {
      return;
    }
    localStorage.setItem(
      DETACHED_FOCUS_WINDOW_BOUNDS_KEY,
      JSON.stringify({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height
      })
    );
  } catch {
    // Ignore storage failures.
  }
}

function getDefaultDetachedWindowBounds():
  { x: number; y: number; width: number; height: number } {
  const remote = getRemote();
  const currentWindow = remote?.getCurrentWindow?.();
  const displayBounds = currentWindow?.getBounds?.()
    || {
      x: 0,
      y: 0,
      width: window.screen.availWidth,
      height: window.screen.availHeight
    };
  const width = DETACHED_FOCUS_WINDOW_WIDTH;
  const height = DETACHED_FOCUS_WINDOW_COLLAPSED_HEIGHT;
  const x = Math.round(displayBounds.x + displayBounds.width - width - DETACHED_FOCUS_WINDOW_MARGIN);
  const y = Math.round(displayBounds.y + displayBounds.height - height - DETACHED_FOCUS_WINDOW_MARGIN * 2);
  return { x, y, width, height };
}

async function persistFocusSession(
  minutes: number,
  target: FocusTimerLinkedTarget | null = null,
  source: 'capsule' = 'capsule'
): Promise<void> {
  const normalizedMinutes = Math.max(1, Math.floor(minutes || 0));
  if (normalizedMinutes <= 0) {
    return;
  }

  const sessionId = `focus-detached-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const sessionTarget: FocusSessionTargetInput | null = target ? {
    type: target.type,
    id: target.id,
    name: target.name,
    emoji: target.emoji,
    blockId: target.blockId
  } : null;

  await addFocusSession(normalizedMinutes, sessionTarget);
  await awardFocusSession({
    minutes: normalizedMinutes,
    sessionId,
    source
  }).catch(() => {});

  window.dispatchEvent(new CustomEvent(DETACHED_FOCUS_SESSION_EVENT, {
    detail: {
      minutes: normalizedMinutes,
      sessionId
    }
  }));
}

async function persistFocusSessionCheckpoint(
  sessionId: string,
  minutes: number,
  target: FocusTimerLinkedTarget | null = null,
  final = false,
  source: 'capsule' = 'capsule'
): Promise<void> {
  const normalizedSessionId = typeof sessionId === 'string' ? sessionId.trim() : '';
  const normalizedMinutes = Math.max(0, Math.floor(minutes || 0));
  if (!normalizedSessionId || normalizedMinutes <= 0) {
    return;
  }

  const sessionTarget: FocusSessionTargetInput | null = target ? {
    type: target.type,
    id: target.id,
    name: target.name,
    emoji: target.emoji,
    blockId: target.blockId
  } : null;

  await upsertFocusSessionRecord(normalizedSessionId, normalizedMinutes, sessionTarget);

  if (final) {
    await awardFocusSession({
      minutes: normalizedMinutes,
      sessionId: normalizedSessionId,
      source
    }).catch(() => {});
  }

  window.dispatchEvent(new CustomEvent(DETACHED_FOCUS_SESSION_EVENT, {
    detail: {
      minutes: normalizedMinutes,
      sessionId: normalizedSessionId,
      checkpoint: !final
    }
  }));
}

const DETACHED_FOCUS_ICON_MAP = {
  timer: {
    viewBox: '0 0 200 200',
    path: '<style type="text/css">.st0{fill:#F98F7A;}</style><path d="M103,68c-1.4,1.6-3.9,1.8-5.5,0.4c-0.1-0.1-0.3-0.3-0.4-0.4L85.9,55c-0.7-0.8-1.6-1.2-2.6-1.3L64,52.1c-2.2-0.2-3.8-2.1-3.6-4.3c0.1-1.3,0.8-2.4,1.9-3l10.5-6.1c1.6-0.9,2.4-2.8,1.8-4.5l-2.6-9.2c-0.6-2.1,0.6-4.3,2.7-4.9c0.7-0.2,1.5-0.2,2.2,0l22,6.7c0.7,0.2,1.5,0.2,2.3,0l21.9-6.7c2.1-0.6,4.2,0.6,4.9,2.6c0.2,0.7,0.2,1.5,0,2.2l-2.7,9.4c-0.6,1.8,0.2,3.7,1.8,4.6l10.5,5.9c1.9,1.1,2.5,3.5,1.4,5.4c-0.6,1.1-1.7,1.8-3,2l-19.3,1.6c-1,0.1-2,0.6-2.6,1.3L103,68z"/><path class="st0" d="M46.6,46.1c-1.2,9.7,5.8,18.6,15.5,19.8c0.2,0,0.5,0.1,0.7,0.1l15.3,1.3l8.4,9.8c6.4,7.5,17.6,8.3,25,1.9c0.7-0.6,1.3-1.2,1.9-1.9l8.4-9.9l15.3-1.2c9.8-0.8,17.1-9.4,16.3-19.2c0,0,0,0,0,0c8.6,5.6,15.7,13.3,20.6,22.3c28.2,50.3-7.5,111.7-74.1,111.7c-68.2-0.4-99.6-59.9-76-108.7C28.9,61.5,36.7,52.4,46.6,46.1z"/>'
  },
  close: {
    viewBox: '0 0 1026 1024',
    path: '<path d="M39.156558 39.219619a133.725281 133.725281 0 0 1 189.221272 0L984.594293 795.703532a133.725281 133.725281 0 0 1-189.221272 189.087547L39.156558 228.307166a133.725281 133.725281 0 0 1 0-189.087547z m0 756.483913L795.373021 39.219619a133.725281 133.725281 0 0 1 189.221272 189.087547L228.37783 984.791079a133.792143 133.792143 0 1 1-189.221272-189.288135z"></path>'
  },
  pause: {
    viewBox: '0 0 1024 1024',
    path: '<path d="M768 912c-44.16 0-80-35.84-80-80V192a80 80 0 0 1 160 0v640c0 44.16-35.84 80-80 80zM256 912c-44.16 0-80-35.84-80-80V192a80 80 0 0 1 160 0v640c0 44.16-35.84 80-80 80z"></path>'
  },
  play: {
    viewBox: '0 0 1024 1024',
    path: '<path d="M897.143467 597.051733l-464.648534 311.5264c-46.976 31.488-110.592 18.944-142.08-28.023466A102.4 102.4 0 0 1 273.066667 823.5264V200.4736c0-56.5504 45.8496-102.4 102.4-102.4a102.4 102.4 0 0 1 57.028266 17.348267l464.64 311.5264c46.976 31.488 59.528533 95.104 28.032 142.08a102.4 102.4 0 0 1-28.023466 28.023466z"></path>'
  },
  stop: {
    viewBox: '0 0 1024 1024',
    path: '<path d="M722.9375 933.875H301.0625a210.9375 210.9375 0 0 1-210.9375-210.9375V301.0625a210.9375 210.9375 0 0 1 210.9375-210.9375h421.875a210.9375 210.9375 0 0 1 210.9375 210.9375v421.875a210.9375 210.9375 0 0 1-210.9375 210.9375z"></path>'
  }
} as const;

const DETACHED_FOCUS_WINDOW_STYLES_V2 = String.raw`
    :root {
      --b3-theme-background: #ffffff;
      --b3-border-color: rgba(0, 0, 0, 0.08);
      --b3-point-shadow: 0 10px 24px rgba(15, 23, 42, 0.18);
      --b3-theme-on-background: #20262f;
      --b3-theme-on-surface: rgba(32, 38, 47, 0.74);
      --b3-list-hover: rgba(15, 23, 42, 0.08);
      --b3-font-family-emoji: ${DETACHED_FOCUS_DEFAULT_FONT_FAMILY};
      --pinch-focus-accent: #f98f7a;
      --pinch-break-accent: #4dab9a;
      --pinch-stop-bg: rgba(231, 76, 60, 0.16);
      --pinch-stop-text: #e74c3c;
      --pinch-font-family: ${DETACHED_FOCUS_DEFAULT_FONT_FAMILY};
      --pinch-emoji-font-family: ${DETACHED_FOCUS_DEFAULT_FONT_FAMILY};
    }

    * {
      box-sizing: border-box;
    }

    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: transparent;
      font-family: var(--pinch-font-family);
      color: var(--b3-theme-on-background);
      user-select: none;
    }

    body {
      display: flex;
      align-items: flex-end;
      justify-content: flex-end;
    }

    .floating-focus {
      position: relative;
      width: 100%;
      min-height: 100%;
      display: flex;
      align-items: flex-end;
      justify-content: flex-end;
      pointer-events: none;
    }

    .floating-focus__capsule {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-width: 120px;
      max-width: 100%;
      min-height: 24px;
      padding: 7px 10px 9px;
      border-radius: 999px;
      border: 1px solid var(--b3-border-color);
      background: var(--b3-theme-background);
      box-shadow: var(--b3-point-shadow);
      color: var(--b3-theme-on-background);
      font-size: 12px;
      font-weight: 600;
      user-select: none;
      pointer-events: auto;
      --progress: 0;
      --progress-color: var(--pinch-focus-accent);
      -webkit-app-region: drag;
    }

    .floating-focus__capsule::after {
      content: '';
      position: absolute;
      left: 12px;
      right: 12px;
      bottom: 4px;
      height: 2px;
      border-radius: 999px;
      background: var(--progress-color);
      transform: scaleX(var(--progress));
      transform-origin: left;
      opacity: 0.6;
      pointer-events: none;
    }

    .floating-focus__capsule.is-paused {
      opacity: 0.7;
    }

    .floating-focus__close {
      position: absolute;
      top: -6px;
      right: 0;
      width: 18px;
      height: 18px;
      padding: 0;
      border: 1px solid var(--b3-border-color);
      border-radius: 999px;
      background: var(--b3-theme-on-background);
      color: var(--b3-theme-background);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      line-height: 1;
      cursor: pointer;
      opacity: 0;
      pointer-events: none;
      transform: translateY(-2px) scale(0.92);
      transition: opacity 0.16s ease, transform 0.16s ease, color 0.16s ease, background 0.16s ease;
      box-shadow: none;
      z-index: 2;
      -webkit-app-region: no-drag;
    }

    .floating-focus__capsule:hover .floating-focus__close,
    .floating-focus__close:focus-visible {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0) scale(1);
    }

    .floating-focus__close:hover {
      color: var(--b3-theme-background);
      background: var(--b3-theme-on-background);
      opacity: 0.92;
    }

    [data-no-drag] {
      -webkit-app-region: no-drag;
    }

    [hidden] {
      display: none !important;
    }

    .floating-focus__dot,
    .floating-focus__close,
    .floating-focus__duration,
    .floating-focus__target,
    .floating-focus__action,
    .floating-focus__popover,
    .floating-focus__popover * {
      -webkit-app-region: no-drag;
      pointer-events: auto;
    }

    .floating-focus__dot,
    .floating-focus__duration,
    .floating-focus__target,
    .floating-focus__action {
      border: none;
      font: inherit;
    }

    .floating-focus__dot,
    .floating-focus__duration,
    .floating-focus__target,
    .floating-focus__action {
      padding: 0;
    }

    .floating-focus__dot {
      width: 22px;
      height: 22px;
      border-radius: 999px;
      background: transparent;
      color: var(--b3-theme-on-background);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .floating-focus__duration {
      min-width: 0;
      background: transparent;
      color: inherit;
      white-space: nowrap;
      cursor: pointer;
    }

    .floating-focus__duration:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    .floating-focus__time {
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.4px;
      line-height: 1.1;
      white-space: nowrap;
    }

    .floating-focus__content {
      display: flex;
      flex: 1 1 auto;
      flex-direction: column;
      min-width: 0;
      gap: 2px;
    }

    .floating-focus__target,
    .floating-focus__target-label {
      flex: 1 1 auto;
      min-width: 0;
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 10px;
      line-height: 1.1;
      color: var(--b3-theme-on-surface);
    }

    .floating-focus__target {
      background: transparent;
      text-align: left;
      cursor: pointer;
    }

    .floating-focus__target:hover {
      color: var(--b3-theme-on-background);
    }

    .floating-focus__actions {
      margin-left: auto;
      display: flex;
      gap: 4px;
      pointer-events: auto;
      -webkit-app-region: no-drag;
    }

    .floating-focus__action {
      width: 22px;
      height: 22px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--b3-list-hover);
      color: var(--b3-theme-on-background);
      cursor: pointer;
    }

    .floating-focus__action.is-stop {
      background: var(--pinch-stop-bg);
      color: var(--pinch-stop-text);
    }

    .floating-focus__action:hover {
      filter: brightness(0.98);
    }

    .floating-focus__action:disabled {
      cursor: not-allowed;
      opacity: 0.45;
      filter: none;
    }

    .floating-focus__popover {
      position: absolute;
      right: 0;
      bottom: 44px;
      width: 260px;
      max-height: calc(100vh - 56px);
      overflow-y: auto;
      overscroll-behavior: contain;
      background: var(--b3-theme-background);
      border-radius: 16px;
      box-shadow: var(--b3-point-shadow);
      border: 1px solid var(--b3-border-color);
      pointer-events: auto;
      z-index: 1;
      display: none;
    }

    .floating-focus__popover.is-visible {
      display: block;
    }

    .timer-settings {
      display: flex;
      flex-direction: column;
      gap: 12px;
      border-radius: 14px;
      padding: 12px;
    }

    .setting-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .setting-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 600;
      color: var(--b3-theme-on-surface);
    }

    .setting-hint {
      font-size: 11px;
      line-height: 1.5;
      color: var(--b3-theme-on-surface);
    }

    .duration-value {
      font-weight: 700;
      color: var(--b3-theme-on-background);
      white-space: nowrap;
    }

    .duration-slider-container {
      display: flex;
      flex-direction: column;
      gap: 6px;
      position: relative;
    }

    .duration-slider {
      width: 100%;
      height: 3px;
      margin: 0;
      appearance: none;
      -webkit-appearance: none;
      background: var(--b3-list-hover);
      border-radius: 3px;
      outline: none;
      cursor: pointer;
      accent-color: var(--b3-theme-on-background);
    }

    .duration-slider:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    .duration-marks {
      position: relative;
      width: calc(100% - 16px);
      height: 18px;
      margin: 0 auto;
    }

    .duration-mark {
      position: absolute;
      font-size: 11px;
      color: var(--b3-theme-on-surface);
      opacity: 0.6;
      transform: translateX(-50%);
      white-space: nowrap;
    }

    .linked-target-setting {
      gap: 10px;
    }

    .linked-habit-banner__chip-row,
    .linked-habit-banner__actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .linked-habit-banner__chip {
      flex: 1 1 auto;
      min-width: 0;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border: 1px solid var(--b3-border-color);
      border-radius: 12px;
      background: var(--b3-list-hover);
      color: var(--b3-theme-on-background);
      cursor: pointer;
    }

    .linked-habit-banner__chip:hover:not(:disabled) {
      border-color: rgba(249, 143, 122, 0.45);
    }

    .linked-habit-banner__chip:disabled {
      cursor: default;
      opacity: 0.72;
    }

    .linked-habit-banner__emoji {
      flex: 0 0 auto;
      font-size: 14px;
      line-height: 1;
      font-family: var(--pinch-emoji-font-family);
    }

    .linked-habit-banner__name {
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
      text-align: left;
    }

    .linked-habit-banner__action,
    .linked-habit-banner__picker-item,
    .linked-habit-banner__picker-close,
    .linked-habit-banner__clear {
      border: 1px solid var(--b3-border-color);
      background: transparent;
      color: var(--b3-theme-on-background);
      font: inherit;
    }

    .linked-habit-banner__action {
      flex: 1 1 0;
      min-height: 32px;
      border-radius: 10px;
      cursor: pointer;
    }

    .linked-habit-banner__action:hover:not(:disabled) {
      background: var(--b3-list-hover);
    }

    .linked-habit-banner__action:disabled,
    .linked-habit-banner__clear:disabled,
    .linked-habit-banner__picker-close:disabled,
    .linked-habit-banner__picker-item:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    .linked-habit-banner__clear {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .linked-habit-banner__clear:hover:not(:disabled) {
      background: var(--b3-list-hover);
    }

    .linked-habit-banner__picker {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 10px;
      border: 1px solid var(--b3-border-color);
      border-radius: 12px;
      background: var(--b3-theme-background);
    }

    .linked-habit-banner__picker-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-size: 12px;
      font-weight: 600;
    }

    .linked-habit-banner__picker-close {
      width: 24px;
      height: 24px;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .linked-habit-banner__picker-close:hover:not(:disabled) {
      background: var(--b3-list-hover);
    }

    .linked-habit-banner__search {
      width: 100%;
      border: 1px solid var(--b3-border-color);
      border-radius: 10px;
      padding: 8px 10px;
      background: var(--b3-theme-background);
      color: var(--b3-theme-on-background);
      font: inherit;
      outline: none;
    }

    .linked-habit-banner__search:focus {
      border-color: rgba(249, 143, 122, 0.55);
    }

    .linked-habit-banner__picker-state {
      padding: 8px 0;
      font-size: 12px;
      color: var(--b3-theme-on-surface);
    }

    .linked-habit-banner__picker-state.is-error {
      color: #d96b5f;
    }

    .linked-habit-banner__picker-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 220px;
      overflow-y: auto;
    }

    .linked-habit-banner__picker-item {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 10px;
      border-radius: 10px;
      cursor: pointer;
    }

    .linked-habit-banner__picker-item:hover:not(:disabled) {
      background: var(--b3-list-hover);
    }

    .linked-habit-banner__picker-item-main {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .linked-habit-banner__picker-item-name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: left;
    }

    .linked-habit-banner__picker-item-meta {
      flex: 0 0 auto;
      font-size: 11px;
      color: var(--b3-theme-on-surface);
    }

    .icon {
      display: block;
      flex: none;
      pointer-events: none;
    }
`;

function buildDetachedFocusWindowHtmlV2(initialState: DetachedFocusWindowState): string {
  const serializedState = serializeForScript(initialState);
  const serializedChannel = serializeForScript(DETACHED_FOCUS_REQUEST_CHANNEL);
  const serializedIcons = serializeForScript(DETACHED_FOCUS_ICON_MAP);
  const serializedCountupAutosaveInterval = serializeForScript(DETACHED_FOCUS_COUNTUP_AUTOSAVE_INTERVAL_MS);
  const detachedText = {
    closeMiniFocus: translate('focusTimer.closeMiniFocus'),
    settings: translate('focusTimer.settings'),
    cycleDuration: translate('focusTimer.cycleDuration'),
    title: translate('focusTimer.title'),
    startFocus: translate('taskManager.startFocus'),
    stop: translate('focusTimer.stop'),
    linkedTarget: translate('focusTimer.linkedTarget'),
    clearLinkedTarget: translate('focusTimer.clearLinkedTarget'),
    linkHabit: translate('focusTimer.linkHabit'),
    linkTask: translate('focusTimer.linkTask'),
    selectHabit: translate('focusTimer.selectHabit'),
    selectTask: translate('focusTimer.selectTask'),
    close: translate('common.close'),
    searchHabit: translate('focusTimer.searchHabit'),
    searchTask: translate('focusTimer.searchTask'),
    loading: translate('taskManager.loading'),
    focusDuration: translate('focusTimer.focusDuration'),
    minuteSuffix: translate('focusTimer.minuteSuffix'),
    shortBreakDuration: translate('focusTimer.shortBreakDuration'),
    focusSets: translate('focusTimer.focusSets'),
    setSuffix: translate('focusTimer.setSuffix'),
    task: translate('focusTimer.task'),
    habit: translate('focusTimer.habit'),
    typeSeparator: translate('focusTimer.typeSeparator'),
    openTargetPrefix: translate('focusTimer.openTargetPrefix'),
    noLinkablePrefix: translate('focusTimer.noLinkablePrefix'),
    loadTargetFailedPrefix: translate('focusTimer.loadTargetFailedPrefix'),
    loadTargetFailedSuffix: translate('focusTimer.loadTargetFailedSuffix'),
    panelFocusRunning: translate('focusTimer.panelFocusRunning'),
    focusAlreadyRunning: translate('focusTimer.focusAlreadyRunning'),
    pause: translate('focusTimer.pause'),
    continueFocus: translate('focusTimer.continueFocus'),
    countup: translate('focusTimer.countup')
  };
  const serializedI18n = serializeForScript(detachedText);
  const htmlText = Object.fromEntries(
    Object.entries(detachedText).map(([key, value]) => [key, escapeHtml(value)])
  ) as typeof detachedText;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${DETACHED_FOCUS_WINDOW_TITLE}</title>
  <style id="pinch-detached-focus-base-styles">
${DETACHED_FOCUS_WINDOW_STYLES_V2}
  </style>
</head>
<body>
  <div class="floating-focus">
    <div id="capsule" class="floating-focus__capsule">
      <button
        id="closeButton"
        type="button"
        class="floating-focus__close"
        data-no-drag
        title="${htmlText.closeMiniFocus}"
        aria-label="${htmlText.closeMiniFocus}"
      >&times;</button>
      <button
        id="settingsToggle"
        type="button"
        class="floating-focus__dot"
        data-no-drag
        title="${htmlText.settings}"
        aria-label="${htmlText.settings}"
        aria-expanded="false"
      ></button>
      <button
        id="targetButton"
        type="button"
        class="floating-focus__target"
        data-no-drag
        hidden
      ></button>
      <span id="targetLabel" class="floating-focus__target-label" hidden></span>
      <button
        id="durationButton"
        type="button"
        class="floating-focus__duration"
        data-no-drag
        title="${htmlText.cycleDuration}"
      >
        ${htmlText.title} 25m
      </button>
      <span id="timeOnly" class="floating-focus__time" hidden>00:00</span>
      <div class="floating-focus__actions" data-no-drag>
        <button
          id="actionButton"
          type="button"
          class="floating-focus__action"
          data-no-drag
          title="${htmlText.startFocus}"
          aria-label="${htmlText.startFocus}"
        ></button>
        <button
          id="stopButton"
          type="button"
          class="floating-focus__action is-stop"
          data-no-drag
          title="${htmlText.stop}"
          aria-label="${htmlText.stop}"
          hidden
        ></button>
      </div>
      <div id="popover" class="floating-focus__popover" data-no-drag>
        <div class="timer-settings">
          <div class="setting-section linked-target-setting">
            <div class="setting-label">
              <span>${htmlText.linkedTarget}</span>
            </div>
            <div id="linkedTargetChipRow" class="linked-habit-banner__chip-row" hidden>
              <button
                id="linkedTargetChip"
                type="button"
                class="linked-habit-banner__chip"
              >
                <span id="linkedTargetEmoji" class="linked-habit-banner__emoji"></span>
                <span id="linkedTargetName" class="linked-habit-banner__name"></span>
              </button>
              <button
                id="clearLinkedTargetButton"
                type="button"
                class="linked-habit-banner__clear"
                title="${htmlText.clearLinkedTarget}"
                aria-label="${htmlText.clearLinkedTarget}"
              ></button>
            </div>
            <div id="linkedTargetActions" class="linked-habit-banner__actions">
              <button
                id="pickHabitButton"
                type="button"
                class="linked-habit-banner__action"
              >${htmlText.linkHabit}</button>
              <button
                id="pickTaskButton"
                type="button"
                class="linked-habit-banner__action"
              >${htmlText.linkTask}</button>
            </div>
            <div id="targetPicker" class="linked-habit-banner__picker" hidden>
              <div class="linked-habit-banner__picker-header">
                <span id="targetPickerTitle">${htmlText.selectHabit}</span>
                <button
                  id="targetPickerClose"
                  type="button"
                  class="linked-habit-banner__picker-close"
                  title="${htmlText.close}"
                  aria-label="${htmlText.close}"
                ></button>
              </div>
              <input
                id="targetSearchInput"
                class="linked-habit-banner__search"
                type="text"
                placeholder="${htmlText.searchHabit}"
              />
              <div id="targetPickerState" class="linked-habit-banner__picker-state" hidden></div>
              <div id="targetPickerList" class="linked-habit-banner__picker-list"></div>
            </div>
          </div>
          <div class="setting-section">
            <div class="setting-label">
              <span>${htmlText.focusDuration}</span>
              <span id="focusDurationValue" class="duration-value">25${htmlText.minuteSuffix}</span>
            </div>
            <div class="duration-slider-container">
              <input id="focusDurationSlider" class="duration-slider" type="range" min="0" max="7" step="1" value="3" />
              <div id="focusMarks" class="duration-marks"></div>
            </div>
          </div>
          <div class="setting-section">
            <div class="setting-label">
              <span>${htmlText.shortBreakDuration}</span>
              <span id="breakDurationValue" class="duration-value">5${htmlText.minuteSuffix}</span>
            </div>
            <div class="duration-slider-container">
              <input id="breakDurationSlider" class="duration-slider" type="range" min="0" max="4" step="1" value="2" />
              <div id="breakMarks" class="duration-marks"></div>
            </div>
          </div>
          <div class="setting-section">
            <div class="setting-label">
              <span>${htmlText.focusSets}</span>
              <span id="setCountValue" class="duration-value">1${htmlText.setSuffix}</span>
            </div>
            <div class="duration-slider-container">
              <input id="setCountSlider" class="duration-slider" type="range" min="1" max="8" step="1" value="1" />
              <div id="setMarks" class="duration-marks"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <script>
    const CHANNEL = ${serializedChannel};
    const ICONS = ${serializedIcons};
    const I18N = ${serializedI18n};
    const COUNTUP_AUTOSAVE_INTERVAL_MS = ${serializedCountupAutosaveInterval};
    const { ipcRenderer } = require('electron');
    const state = {
      linkedTarget: null,
      activeOwner: null,
      theme: null,
      durationMarks: [5, 10, 15, 25, 30, 45, 60],
      durationOptions: [5, 10, 15, 25, 30, 45, 60, 'unlimited'],
      shortBreakMarks: [1, 3, 5, 10, 15],
      pomodoroSetMarks: [1, 2, 3, 4, 5, 6, 7, 8],
      durationIndex: 3,
      shortBreakDurationIndex: 2,
      selectedDuration: 25,
      shortBreakDuration: 5,
      pomodoroSets: 1,
      timerMode: 'countdown',
      phaseElapsedSeconds: 0,
      isRunning: false,
      isPaused: false,
      isBreakMode: false,
      currentSet: 1,
      timerInterval: null,
      timerDeadline: 0,
      timerStartedAt: 0,
      countupSessionId: '',
      savedCountupMinutes: 0,
      isSavingCountupCheckpoint: false,
      hasPendingCountupCheckpoint: false,
      showSettings: false,
      targetPickerMode: null,
      targetSearch: '',
      isLoadingTargetOptions: false,
      targetOptionsError: '',
      habitTargetOptions: [],
      taskTargetOptions: []
    };

    const initialState = ${serializedState};
    const capsuleEl = document.getElementById('capsule');
    const popoverEl = document.getElementById('popover');
    const closeButtonEl = document.getElementById('closeButton');
    const settingsToggleEl = document.getElementById('settingsToggle');
    const durationButtonEl = document.getElementById('durationButton');
    const contentEl = document.getElementById('content');
    const timeOnlyEl = document.getElementById('timeOnly');
    const timeLabelEl = document.getElementById('timeLabel');
    const targetButtonEl = document.getElementById('targetButton');
    const targetLabelEl = document.getElementById('targetLabel');
    const actionButtonEl = document.getElementById('actionButton');
    const stopButtonEl = document.getElementById('stopButton');
    const focusDurationValueEl = document.getElementById('focusDurationValue');
    const breakDurationValueEl = document.getElementById('breakDurationValue');
    const setCountValueEl = document.getElementById('setCountValue');
    const focusDurationSliderEl = document.getElementById('focusDurationSlider');
    const breakDurationSliderEl = document.getElementById('breakDurationSlider');
    const setCountSliderEl = document.getElementById('setCountSlider');
    const focusMarksEl = document.getElementById('focusMarks');
    const breakMarksEl = document.getElementById('breakMarks');
    const setMarksEl = document.getElementById('setMarks');
    const linkedTargetChipRowEl = document.getElementById('linkedTargetChipRow');
    const linkedTargetChipEl = document.getElementById('linkedTargetChip');
    const linkedTargetEmojiEl = document.getElementById('linkedTargetEmoji');
    const linkedTargetNameEl = document.getElementById('linkedTargetName');
    const clearLinkedTargetButtonEl = document.getElementById('clearLinkedTargetButton');
    const linkedTargetActionsEl = document.getElementById('linkedTargetActions');
    const pickHabitButtonEl = document.getElementById('pickHabitButton');
    const pickTaskButtonEl = document.getElementById('pickTaskButton');
    const targetPickerEl = document.getElementById('targetPicker');
    const targetPickerTitleEl = document.getElementById('targetPickerTitle');
    const targetPickerCloseEl = document.getElementById('targetPickerClose');
    const targetSearchInputEl = document.getElementById('targetSearchInput');
    const targetPickerStateEl = document.getElementById('targetPickerState');
    const targetPickerListEl = document.getElementById('targetPickerList');

    function iconMarkup(name, width, height) {
      const icon = ICONS[name];
      if (!icon) {
        return '';
      }
      return '<svg class="icon" viewBox="' + icon.viewBox + '" width="' + width + '" height="' + height + '" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + icon.path + '</svg>';
    }

    function buildMarks(container, values) {
      container.innerHTML = values.map((value, index) => {
        const left = values.length > 1 ? (index / (values.length - 1)) * 100 : 0;
        const label = value === 'unlimited' ? '∞' : value;
        return '<span class="duration-mark" style="left:' + left + '%">' + label + '</span>';
      }).join('');
    }

    buildMarks(focusMarksEl, state.durationOptions);
    buildMarks(breakMarksEl, state.shortBreakMarks);
    buildMarks(setMarksEl, state.pomodoroSetMarks);

    function request(type, payload = {}) {
      return ipcRenderer.invoke(CHANNEL, { type, ...payload });
    }

    function ensureEmojiFontResources(theme) {
      if (!theme) {
        return;
      }

      const head = document.head;
      const styleAnchor = document.getElementById('pinch-detached-focus-base-styles');
      const stylesheetHrefs = Array.isArray(theme.emojiFontStylesheetHrefs)
        ? theme.emojiFontStylesheetHrefs.filter((href) => typeof href === 'string' && href.trim())
        : [];

      const existingLinks = new Map(
        Array.from(head.querySelectorAll('link[data-pinch-emoji-font]')).map((node) => [
          node.getAttribute('data-pinch-emoji-font'),
          node
        ])
      );

      stylesheetHrefs.forEach((href) => {
        if (existingLinks.has(href)) {
          return;
        }
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.setAttribute('data-pinch-emoji-font', href);
        head.insertBefore(link, styleAnchor || head.firstChild);
      });

      const inlineCss = typeof theme.emojiFontInlineCss === 'string'
        ? theme.emojiFontInlineCss.trim()
        : '';
      let inlineStyle = document.getElementById('pinch-detached-focus-emoji-font-inline');
      if (inlineCss) {
        if (!(inlineStyle instanceof HTMLStyleElement)) {
          inlineStyle = document.createElement('style');
          inlineStyle.id = 'pinch-detached-focus-emoji-font-inline';
          head.insertBefore(inlineStyle, styleAnchor || head.firstChild);
        }
        inlineStyle.textContent = inlineCss;
      } else if (inlineStyle) {
        inlineStyle.remove();
      }
    }

    function applyTheme(theme) {
      if (!theme) {
        return;
      }
      state.theme = theme;
      ensureEmojiFontResources(theme);
      document.documentElement.style.setProperty('--b3-theme-background', theme.background || '#ffffff');
      document.documentElement.style.setProperty('--b3-border-color', theme.border || 'rgba(0, 0, 0, 0.08)');
      document.documentElement.style.setProperty('--b3-point-shadow', theme.shadow || '0 10px 24px rgba(15, 23, 42, 0.18)');
      document.documentElement.style.setProperty('--b3-theme-on-background', theme.text || '#20262f');
      document.documentElement.style.setProperty('--b3-theme-on-surface', theme.subtleText || 'rgba(32, 38, 47, 0.74)');
      document.documentElement.style.setProperty('--b3-list-hover', theme.hover || 'rgba(15, 23, 42, 0.08)');
      document.documentElement.style.setProperty('--pinch-focus-accent', theme.accent || '#f98f7a');
      document.documentElement.style.setProperty('--pinch-break-accent', theme.breakAccent || '#4dab9a');
      document.documentElement.style.setProperty('--pinch-stop-bg', theme.stopBg || 'rgba(231, 76, 60, 0.16)');
      document.documentElement.style.setProperty('--pinch-stop-text', theme.stopText || '#e74c3c');
      document.documentElement.style.setProperty('--pinch-font-family', theme.fontFamily || ${JSON.stringify(DETACHED_FOCUS_DEFAULT_FONT_FAMILY)});
      const emojiFontFamily = theme.emojiFontFamily || theme.fontFamily || ${JSON.stringify(DETACHED_FOCUS_DEFAULT_FONT_FAMILY)};
      document.documentElement.style.setProperty('--b3-font-family-emoji', emojiFontFamily);
      document.documentElement.style.setProperty('--pinch-emoji-font-family', emojiFontFamily);
    }

    function formatSeconds(seconds) {
      const total = Math.max(0, Math.floor(seconds || 0));
      const mins = Math.floor(total / 60);
      const secs = total % 60;
      return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
    }

    function isActive() {
      return state.isRunning || state.isPaused;
    }

    function isLockedByOther() {
      return state.activeOwner !== null && state.activeOwner !== 'capsule';
    }

    function phaseDurationSeconds() {
      return (state.isBreakMode ? state.shortBreakDuration : state.selectedDuration) * 60;
    }

    function displayTime() {
      const seconds = state.timerMode === 'countdown'
        ? Math.max(phaseDurationSeconds() - state.phaseElapsedSeconds, 0)
        : Math.max(state.phaseElapsedSeconds, 0);
      return formatSeconds(seconds);
    }

    function linkedTargetLabel() {
      if (!state.linkedTarget) {
        return '';
      }
      return (state.linkedTarget.type === 'task' ? I18N.task : I18N.habit) + I18N.typeSeparator + state.linkedTarget.name;
    }

    function canOpenLinkedTarget() {
      return !!state.linkedTarget && (state.linkedTarget.type === 'habit' || !!state.linkedTarget.blockId);
    }

    function isLinkedTargetLocked() {
      return state.isRunning || state.isPaused;
    }

    function getTargetEmoji(target) {
      if (!target) {
        return '';
      }

      if (target.emoji) {
        return target.emoji;
      }

      return target.type === 'task' ? '✅' : '📝';
    }

    function getTargetOptions() {
      return state.targetPickerMode === 'habit'
        ? state.habitTargetOptions
        : state.taskTargetOptions;
    }

    function getFilteredTargetOptions() {
      const keyword = String(state.targetSearch || '').trim().toLowerCase();
      const options = getTargetOptions();
      if (!keyword) {
        return options;
      }

      return options.filter((target) => String(target.name || '').toLowerCase().includes(keyword));
    }

    function closeTargetPicker() {
      state.targetPickerMode = null;
      state.targetSearch = '';
      state.targetOptionsError = '';
      if (targetSearchInputEl) {
        targetSearchInputEl.value = '';
      }
    }

    function openSettingsPanel() {
      closeTargetPicker();
      state.showSettings = true;
      render();
    }

    function acceptPanelHandoff(handoffState) {
      if (!handoffState) {
        return;
      }

      clearTimer();
      state.timerMode = handoffState.timerMode === 'countup' ? 'countup' : 'countdown';
      state.selectedDuration = Number.isFinite(handoffState.selectedDuration) ? handoffState.selectedDuration : 25;
      state.durationIndex = Number.isFinite(handoffState.durationIndex) ? handoffState.durationIndex : 3;
      state.shortBreakDuration = Number.isFinite(handoffState.shortBreakDuration) ? handoffState.shortBreakDuration : 5;
      state.shortBreakDurationIndex = Number.isFinite(handoffState.shortBreakDurationIndex) ? handoffState.shortBreakDurationIndex : 2;
      state.pomodoroSets = Number.isFinite(handoffState.pomodoroSets) ? handoffState.pomodoroSets : 1;
      state.phaseElapsedSeconds = Math.max(0, Math.floor(handoffState.phaseElapsedSeconds || 0));
      state.isRunning = handoffState.isRunning === true;
      state.isPaused = handoffState.isPaused === true;
      state.isBreakMode = handoffState.isBreakMode === true;
      state.currentSet = Number.isFinite(handoffState.currentSet) ? handoffState.currentSet : 1;
      state.countupSessionId = typeof handoffState.countupSessionId === 'string' ? handoffState.countupSessionId : '';
      state.savedCountupMinutes = Number.isFinite(handoffState.savedCountupMinutes) ? handoffState.savedCountupMinutes : 0;
      state.linkedTarget = handoffState.linkedTarget || null;
      state.showSettings = false;
      closeTargetPicker();

      if (state.isRunning || state.isPaused) {
        void request('claim-focus-session', { owner: 'capsule' });
      }

      if (state.isRunning) {
        startPhaseTimer();
      }

      render();
    }

    async function openTargetPicker(mode) {
      if (isLinkedTargetLocked()) {
        return;
      }

      state.targetPickerMode = mode;
      state.targetSearch = '';
      state.targetOptionsError = '';
      state.isLoadingTargetOptions = true;
      if (targetSearchInputEl) {
        targetSearchInputEl.value = '';
      }

      const existingOptions = mode === 'habit'
        ? state.habitTargetOptions
        : state.taskTargetOptions;
      if (Array.isArray(existingOptions) && existingOptions.length > 0) {
        state.isLoadingTargetOptions = false;
        render();
        if (targetSearchInputEl) {
          targetSearchInputEl.focus();
        }
        return;
      }

      try {
        const options = await request('load-target-options', { mode });
        const normalizedOptions = Array.isArray(options) ? options : [];
        if (mode === 'habit') {
          if (normalizedOptions.length > 0 || state.habitTargetOptions.length === 0) {
            state.habitTargetOptions = normalizedOptions;
          }
        } else if (normalizedOptions.length > 0 || state.taskTargetOptions.length === 0) {
          state.taskTargetOptions = normalizedOptions;
        }
      } catch {
        state.targetOptionsError = I18N.loadTargetFailedPrefix + (mode === 'habit' ? I18N.habit : I18N.task) + I18N.loadTargetFailedSuffix;
      } finally {
        state.isLoadingTargetOptions = false;
        render();
        if (targetSearchInputEl) {
          targetSearchInputEl.focus();
        }
      }
    }

    async function selectLinkedTarget(target) {
      if (isLinkedTargetLocked()) {
        return;
      }

      await request('set-linked-target', { target });
      applyLinkedTarget(target);
      closeTargetPicker();
      render();
    }

    async function clearLinkedTarget() {
      if (isLinkedTargetLocked()) {
        return;
      }

      await request('set-linked-target', { target: null });
      applyLinkedTarget(null);
      closeTargetPicker();
      render();
    }

    function getElapsedFocusMinutes() {
      if (state.isBreakMode || state.timerMode !== 'countup') {
        return 0;
      }
      return Math.floor(state.phaseElapsedSeconds / 60);
    }

    function ensureCountupSessionId() {
      if (!state.countupSessionId) {
        state.countupSessionId = 'focus-detached-countup-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      }
      return state.countupSessionId;
    }

    function resetCountupCheckpointState() {
      state.countupSessionId = '';
      state.savedCountupMinutes = 0;
      state.isSavingCountupCheckpoint = false;
      state.hasPendingCountupCheckpoint = false;
    }

    async function saveCountupCheckpoint(final = false, minutesOverride) {
      if (state.isBreakMode || state.timerMode !== 'countup') {
        return;
      }
      const minutes = typeof minutesOverride === 'number'
        ? Math.max(0, Math.floor(minutesOverride))
        : getElapsedFocusMinutes();
      if (minutes <= state.savedCountupMinutes) {
        return;
      }
      if (state.isSavingCountupCheckpoint) {
        state.hasPendingCountupCheckpoint = true;
        return;
      }

      state.isSavingCountupCheckpoint = true;
      try {
        const sessionId = ensureCountupSessionId();
        await request('upsert-focus-session', {
          sessionId,
          minutes,
          target: state.linkedTarget,
          final,
          source: 'capsule'
        });
        state.savedCountupMinutes = Math.max(state.savedCountupMinutes, minutes);
      } finally {
        state.isSavingCountupCheckpoint = false;
        if (state.hasPendingCountupCheckpoint) {
          state.hasPendingCountupCheckpoint = false;
          void saveCountupCheckpoint(final);
        }
      }
    }

    function resetPhaseProgress() {
      state.phaseElapsedSeconds = 0;
      state.timerStartedAt = 0;
    }

    function clearTimer() {
      if (state.timerInterval !== null) {
        window.clearInterval(state.timerInterval);
        state.timerInterval = null;
      }
      state.timerDeadline = 0;
      state.timerStartedAt = 0;
    }

    function updateProgressVisual() {
      const total = phaseDurationSeconds();
      const elapsed = total > 0 ? Math.min(Math.max(state.phaseElapsedSeconds, 0), total) : 0;
      const progress = total > 0 ? elapsed / total : 0;
      const color = state.isBreakMode ? 'var(--pinch-break-accent)' : 'var(--pinch-focus-accent)';
      capsuleEl.style.setProperty('--progress', String(progress));
      capsuleEl.style.setProperty('--progress-color', color);
    }

    function setTargetPickerState(message, isError) {
      if (!targetPickerStateEl) {
        return;
      }

      targetPickerStateEl.hidden = !message;
      targetPickerStateEl.textContent = message || '';
      targetPickerStateEl.classList.toggle('is-error', !!message && isError === true);
    }

    function renderTargetPickerList(options) {
      if (!targetPickerListEl) {
        return;
      }

      targetPickerListEl.innerHTML = '';

      options.forEach((target) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'linked-habit-banner__picker-item';
        button.disabled = isLinkedTargetLocked();

        const main = document.createElement('span');
        main.className = 'linked-habit-banner__picker-item-main';

        const emoji = document.createElement('span');
        emoji.className = 'linked-habit-banner__emoji';
        emoji.textContent = getTargetEmoji(target);

        const name = document.createElement('span');
        name.className = 'linked-habit-banner__picker-item-name';
        name.textContent = target.name || '';

        main.appendChild(emoji);
        main.appendChild(name);
        button.appendChild(main);

        if (target.type === 'habit' && target.preferredDuration) {
          const meta = document.createElement('span');
          meta.className = 'linked-habit-banner__picker-item-meta';
          meta.textContent = String(target.preferredDuration) + 'm';
          button.appendChild(meta);
        }

        button.addEventListener('click', () => {
          void selectLinkedTarget(target);
        });

        targetPickerListEl.appendChild(button);
      });
    }

    function updateTargetOptionsFromHost(payload) {
      if (!payload || typeof payload !== 'object') {
        return;
      }

      state.habitTargetOptions = Array.isArray(payload.habit) ? payload.habit : [];
      state.taskTargetOptions = Array.isArray(payload.task) ? payload.task : [];

      if (state.targetPickerMode) {
        render();
      }
    }

    function render() {
      applyTheme(state.theme);
      settingsToggleEl.innerHTML = iconMarkup('timer', 16, 16);
      capsuleEl.classList.toggle('is-paused', state.isPaused);
      updateProgressVisual();

      const active = isActive();
      const pomodoroSettingsLocked = active || state.timerMode === 'countup';
      const label = linkedTargetLabel();
      const blocked = isLockedByOther() && !active;
      const actionTitle = blocked
        ? I18N.panelFocusRunning
        : (state.isRunning ? I18N.pause : (state.isPaused ? I18N.continueFocus : I18N.startFocus));

      durationButtonEl.hidden = active;
      durationButtonEl.textContent = state.timerMode === 'countup' ? I18N.title + ' ∞' : I18N.title + ' ' + state.selectedDuration + 'm';
      durationButtonEl.disabled = active;
      durationButtonEl.title = I18N.cycleDuration;
      settingsToggleEl.setAttribute('aria-expanded', state.showSettings ? 'true' : 'false');

      if (contentEl) {
        contentEl.hidden = !state.linkedTarget;
      }
      timeOnlyEl.hidden = !active;
      timeOnlyEl.textContent = displayTime();

      targetButtonEl.hidden = !state.linkedTarget || !canOpenLinkedTarget();
      targetLabelEl.hidden = !state.linkedTarget || canOpenLinkedTarget();
      targetButtonEl.textContent = label;
      targetLabelEl.textContent = label;
      targetButtonEl.title = label;
      targetLabelEl.title = label;

      const linkedTargetLocked = isLinkedTargetLocked();
      const filteredTargetOptions = getFilteredTargetOptions();
      if (linkedTargetChipRowEl) {
        linkedTargetChipRowEl.hidden = !state.linkedTarget;
      }
      if (linkedTargetActionsEl) {
        linkedTargetActionsEl.hidden = !!state.linkedTarget;
      }
      if (linkedTargetChipEl) {
        linkedTargetChipEl.disabled = !canOpenLinkedTarget();
        linkedTargetChipEl.title = canOpenLinkedTarget() ? I18N.openTargetPrefix + label : label;
        linkedTargetChipEl.setAttribute('aria-label', label || I18N.linkedTarget);
      }
      if (linkedTargetEmojiEl) {
        linkedTargetEmojiEl.textContent = getTargetEmoji(state.linkedTarget);
      }
      if (linkedTargetNameEl) {
        linkedTargetNameEl.textContent = label;
      }
      if (clearLinkedTargetButtonEl) {
        clearLinkedTargetButtonEl.disabled = linkedTargetLocked;
        clearLinkedTargetButtonEl.innerHTML = iconMarkup('close', 12, 12);
      }
      if (pickHabitButtonEl) {
        pickHabitButtonEl.disabled = linkedTargetLocked;
      }
      if (pickTaskButtonEl) {
        pickTaskButtonEl.disabled = linkedTargetLocked;
      }
      if (targetPickerEl) {
        targetPickerEl.hidden = !state.targetPickerMode;
      }
      if (targetPickerTitleEl) {
        targetPickerTitleEl.textContent = state.targetPickerMode === 'task' ? I18N.selectTask : I18N.selectHabit;
      }
      if (targetPickerCloseEl) {
        targetPickerCloseEl.disabled = linkedTargetLocked;
        targetPickerCloseEl.innerHTML = iconMarkup('close', 12, 12);
      }
      if (targetSearchInputEl) {
        targetSearchInputEl.placeholder = state.targetPickerMode === 'task' ? I18N.searchTask : I18N.searchHabit;
        targetSearchInputEl.disabled = linkedTargetLocked || state.isLoadingTargetOptions;
        if (targetSearchInputEl.value !== state.targetSearch) {
          targetSearchInputEl.value = state.targetSearch;
        }
      }
      if (state.targetPickerMode) {
        if (state.isLoadingTargetOptions) {
          setTargetPickerState(I18N.loading, false);
          renderTargetPickerList([]);
        } else if (state.targetOptionsError) {
          setTargetPickerState(state.targetOptionsError, true);
          renderTargetPickerList([]);
        } else if (filteredTargetOptions.length === 0) {
          setTargetPickerState(
            I18N.noLinkablePrefix + (state.targetPickerMode === 'habit' ? I18N.habit : I18N.task),
            false
          );
          renderTargetPickerList([]);
        } else {
          setTargetPickerState('', false);
          renderTargetPickerList(filteredTargetOptions);
        }
      } else {
        setTargetPickerState('', false);
        renderTargetPickerList([]);
      }

      actionButtonEl.disabled = blocked;
      actionButtonEl.innerHTML = iconMarkup(state.isRunning ? 'pause' : 'play', 12, 12);
      actionButtonEl.title = actionTitle;
      actionButtonEl.setAttribute('aria-label', actionTitle);
      if (blocked) {
        actionButtonEl.title = I18N.focusAlreadyRunning;
        actionButtonEl.setAttribute('aria-label', I18N.focusAlreadyRunning);
      } else if (active) {
        actionButtonEl.title = I18N.stop;
        actionButtonEl.setAttribute('aria-label', I18N.stop);
      } else {
        actionButtonEl.title = I18N.startFocus;
        actionButtonEl.setAttribute('aria-label', I18N.startFocus);
      }
      if (state.isRunning) {
        actionButtonEl.title = I18N.pause;
        actionButtonEl.setAttribute('aria-label', I18N.pause);
      } else if (state.isPaused) {
        actionButtonEl.title = I18N.continueFocus;
        actionButtonEl.setAttribute('aria-label', I18N.continueFocus);
      }

      stopButtonEl.hidden = !active;
      stopButtonEl.innerHTML = iconMarkup('stop', 12, 12);
      const normalizedActionTitle = blocked
        ? I18N.focusAlreadyRunning
        : (state.isRunning
          ? I18N.pause
          : (state.isPaused ? I18N.continueFocus : I18N.startFocus));
      actionButtonEl.title = normalizedActionTitle;
      actionButtonEl.setAttribute('aria-label', normalizedActionTitle);
      stopButtonEl.hidden = !active;
      stopButtonEl.style.display = active ? '' : 'none';
      stopButtonEl.title = I18N.stop;
      stopButtonEl.setAttribute('aria-label', I18N.stop);

      focusDurationSliderEl.disabled = active;
      breakDurationSliderEl.disabled = pomodoroSettingsLocked;
      setCountSliderEl.disabled = pomodoroSettingsLocked;

      focusDurationSliderEl.value = String(state.durationIndex);
      breakDurationSliderEl.value = String(state.shortBreakDurationIndex);
      setCountSliderEl.value = String(state.pomodoroSets);

      focusDurationValueEl.textContent = state.timerMode === 'countup' ? I18N.countup : state.selectedDuration + I18N.minuteSuffix;
      breakDurationValueEl.textContent = state.shortBreakDuration + I18N.minuteSuffix;
      setCountValueEl.textContent = state.pomodoroSets + I18N.setSuffix;

      popoverEl.classList.toggle('is-visible', state.showSettings);
      request('set-expanded', { expanded: state.showSettings }).catch(() => {});
    }

    async function recordFocusSession(minutes) {
      const normalizedMinutes = Math.max(1, Math.floor(minutes || 0));
      if (normalizedMinutes <= 0) {
        return;
      }
      await request('record-focus-session', {
        minutes: normalizedMinutes,
        target: state.linkedTarget,
        source: 'capsule'
      });
    }

    async function completeTimer() {
      if (!state.isBreakMode) {
        try {
          await recordFocusSession(state.selectedDuration);
        } catch {}

        if (state.currentSet < state.pomodoroSets && state.pomodoroSets >= 2) {
          state.isBreakMode = true;
          resetPhaseProgress();
          state.currentSet += 1;
          startPhaseTimer();
          render();
          return;
        }

        await stopTimer(false);
        render();
        return;
      }

      state.isBreakMode = false;
      resetPhaseProgress();
      startPhaseTimer();
      render();
    }

    function startPhaseTimer() {
      if (state.timerMode === 'countup' && !state.isBreakMode) {
        const startedAt = Date.now() - state.phaseElapsedSeconds * 1000;
        state.timerStartedAt = startedAt;
        let lastAutosavedMinute = state.savedCountupMinutes;
        let lastAutosaveCheckAt = Date.now();
        state.timerInterval = window.setInterval(() => {
          if (!state.isRunning || state.timerStartedAt !== startedAt) {
            return;
          }
          state.phaseElapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
          const elapsedMinutes = getElapsedFocusMinutes();
          const now = Date.now();
          if (
            now - lastAutosaveCheckAt >= COUNTUP_AUTOSAVE_INTERVAL_MS
            && elapsedMinutes > lastAutosavedMinute
            && elapsedMinutes > state.savedCountupMinutes
          ) {
            lastAutosaveCheckAt = now;
            lastAutosavedMinute = elapsedMinutes;
            void saveCountupCheckpoint(false);
          }
          render();
        }, 200);
        return;
      }

      const totalSeconds = phaseDurationSeconds();
      const remainingSeconds = Math.max(totalSeconds - state.phaseElapsedSeconds, 0);
      if (remainingSeconds <= 0) {
        state.phaseElapsedSeconds = totalSeconds;
        void completeTimer();
        return;
      }

      const deadline = Date.now() + remainingSeconds * 1000;
      state.timerDeadline = deadline;
      state.timerInterval = window.setInterval(() => {
        if (!state.isRunning || state.timerDeadline !== deadline) {
          return;
        }
        const timeLeft = Math.ceil((deadline - Date.now()) / 1000);
        if (timeLeft <= 0) {
          state.phaseElapsedSeconds = totalSeconds;
          clearTimer();
          void completeTimer();
        } else {
          state.phaseElapsedSeconds = Math.min(totalSeconds - timeLeft, totalSeconds);
          render();
        }
      }, 200);
    }

    async function startTimer() {
      state.activeOwner = 'capsule';
      request('claim-focus-session', { owner: 'capsule' }).catch(() => {});
      state.currentSet = 1;
      state.isBreakMode = false;
      resetPhaseProgress();
      resetCountupCheckpointState();
      clearTimer();
      state.isRunning = true;
      state.isPaused = false;
      startPhaseTimer();
      render();
    }

    function pauseTimer() {
      if (!state.isRunning) {
        return;
      }
      void saveCountupCheckpoint(false);
      clearTimer();
      state.isRunning = false;
      state.isPaused = true;
      render();
    }

    function resumeTimer() {
      if (!state.isPaused) {
        return;
      }
      state.isRunning = true;
      state.isPaused = false;
      state.activeOwner = 'capsule';
      startPhaseTimer();
      render();
    }

    async function stopTimer(recordCurrentSession = false) {
      const elapsedMinutes = recordCurrentSession ? getElapsedFocusMinutes() : 0;
      clearTimer();
      state.isRunning = false;
      state.isPaused = false;
      state.isBreakMode = false;
      state.currentSet = 1;
      resetPhaseProgress();
      state.activeOwner = null;
      await request('release-focus-session', { owner: 'capsule' });
      if (elapsedMinutes > 0) {
        try {
          if (state.timerMode === 'countup') {
            await saveCountupCheckpoint(true, elapsedMinutes);
            resetCountupCheckpointState();
          } else {
            await recordFocusSession(elapsedMinutes);
          }
        } catch {}
      } else {
        resetCountupCheckpointState();
      }
      render();
    }

    function toggleStartPause() {
      state.showSettings = false;
      closeTargetPicker();
      if (state.isRunning) {
        pauseTimer();
        return;
      }
      if (state.isPaused) {
        resumeTimer();
        return;
      }
      if (isLockedByOther()) {
        return;
      }
      void startTimer();
    }

    function cycleDuration() {
      if (isActive()) {
        return;
      }
      state.durationIndex = (state.durationIndex + 1) % state.durationOptions.length;
      const option = state.durationOptions[state.durationIndex];
      if (option === 'unlimited') {
        state.timerMode = 'countup';
      } else {
        state.timerMode = 'countdown';
        state.selectedDuration = option;
      }
      resetPhaseProgress();
      render();
    }

    function applyLinkedTarget(nextTarget) {
      if (isActive()) {
        return;
      }
      state.linkedTarget = nextTarget || null;
      if (nextTarget || state.targetPickerMode) {
        closeTargetPicker();
      }
      if (nextTarget && typeof nextTarget.preferredDuration === 'number' && Number.isFinite(nextTarget.preferredDuration)) {
        const nextIndex = state.durationMarks.indexOf(nextTarget.preferredDuration);
        state.timerMode = 'countdown';
        state.selectedDuration = nextTarget.preferredDuration;
        state.durationIndex = nextIndex >= 0 ? nextIndex : 3;
        resetPhaseProgress();
      }
    }

    function updateFromHost(hostState) {
      if (!hostState) {
        return;
      }
      state.activeOwner = hostState.activeOwner ?? null;
      applyTheme(hostState.theme);
      if (!isActive()) {
        applyLinkedTarget(hostState.linkedTarget || null);
      } else if (!state.linkedTarget && hostState.linkedTarget) {
        state.linkedTarget = hostState.linkedTarget;
      }
      render();
    }

    window.__PINCH_DETACHED_FOCUS_UPDATE__ = updateFromHost;
    window.__PINCH_DETACHED_FOCUS_SET_OPTIONS__ = updateTargetOptionsFromHost;
    window.__PINCH_DETACHED_FOCUS_OPEN_SETTINGS__ = openSettingsPanel;
    window.__PINCH_DETACHED_FOCUS_HANDOFF__ = acceptPanelHandoff;

    settingsToggleEl.addEventListener('click', (event) => {
      event.preventDefault();
      state.showSettings = !state.showSettings;
      if (!state.showSettings) {
        closeTargetPicker();
      }
      render();
    });

    closeButtonEl?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      void request('disable-floating-focus');
    });

    durationButtonEl.addEventListener('click', (event) => {
      event.preventDefault();
      cycleDuration();
    });

    actionButtonEl.addEventListener('click', (event) => {
      event.preventDefault();
      toggleStartPause();
    });

    stopButtonEl.addEventListener('click', (event) => {
      event.preventDefault();
      void stopTimer(true);
    });

    targetButtonEl.addEventListener('click', (event) => {
      event.preventDefault();
      void request('open-linked-target');
    });

    linkedTargetChipEl?.addEventListener('click', (event) => {
      event.preventDefault();
      if (canOpenLinkedTarget()) {
        void request('open-linked-target');
      }
    });

    clearLinkedTargetButtonEl?.addEventListener('click', (event) => {
      event.preventDefault();
      void clearLinkedTarget();
    });

    pickHabitButtonEl?.addEventListener('click', (event) => {
      event.preventDefault();
      void openTargetPicker('habit');
    });

    pickTaskButtonEl?.addEventListener('click', (event) => {
      event.preventDefault();
      void openTargetPicker('task');
    });

    targetPickerCloseEl?.addEventListener('click', (event) => {
      event.preventDefault();
      closeTargetPicker();
      render();
    });

    targetSearchInputEl?.addEventListener('input', () => {
      state.targetSearch = targetSearchInputEl.value || '';
      render();
    });

    focusDurationSliderEl.addEventListener('input', () => {
      if (isActive()) {
        return;
      }
      state.durationIndex = Number(focusDurationSliderEl.value);
      const option = state.durationOptions[state.durationIndex];
      if (option === 'unlimited') {
        state.timerMode = 'countup';
      } else {
        state.timerMode = 'countdown';
        state.selectedDuration = option || 25;
      }
      resetPhaseProgress();
      render();
    });

    breakDurationSliderEl.addEventListener('input', () => {
      if (isActive() || state.timerMode === 'countup') {
        return;
      }
      state.shortBreakDurationIndex = Number(breakDurationSliderEl.value);
      state.shortBreakDuration = state.shortBreakMarks[state.shortBreakDurationIndex] || 5;
      render();
    });

    setCountSliderEl.addEventListener('input', () => {
      if (isActive() || state.timerMode === 'countup') {
        return;
      }
      state.pomodoroSets = Math.max(1, Math.min(Number(setCountSliderEl.value), state.pomodoroSetMarks[state.pomodoroSetMarks.length - 1]));
      render();
    });

    document.addEventListener('mousedown', (event) => {
      if (!state.showSettings) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (popoverEl.contains(target) || settingsToggleEl.contains(target)) {
        return;
      }
      state.showSettings = false;
      closeTargetPicker();
      render();
    });

    window.addEventListener('beforeunload', () => {
      clearTimer();
      void request('release-focus-session', { owner: 'capsule' });
    });

    updateFromHost(initialState);
    render();
  </script>
</body>
</html>`;
}

function syncDetachedFocusWindowState(): void {
  if (!detachedFocusWindow || detachedFocusWindow.isDestroyed?.()) {
    return;
  }
  const payload = serializeForScript(getDetachedFocusWindowState());
  detachedFocusWindow.webContents?.executeJavaScript?.(
    `window.__PINCH_DETACHED_FOCUS_UPDATE__(${payload});`,
    true
  ).catch(() => {});
}

function syncDetachedFocusWindowTargetOptions(): void {
  if (!detachedFocusWindow || detachedFocusWindow.isDestroyed?.()) {
    return;
  }

  const payload = serializeForScript({
    habit: latestHabitTargetOptions,
    task: latestTaskTargetOptions
  });

  detachedFocusWindow.webContents?.executeJavaScript?.(
    `window.__PINCH_DETACHED_FOCUS_SET_OPTIONS__?.(${payload});`,
    true
  ).catch(() => {});
}

function flushDetachedFocusOpenSettingsRequest(): void {
  if (!pendingDetachedFocusOpenSettings) {
    return;
  }

  if (!detachedFocusWindow || detachedFocusWindow.isDestroyed?.()) {
    return;
  }

  detachedFocusWindow.webContents?.executeJavaScript?.(
    'window.__PINCH_DETACHED_FOCUS_OPEN_SETTINGS__?.();',
    true
  ).then(() => {
    pendingDetachedFocusOpenSettings = false;
  }).catch(() => {});
}

function flushDetachedFocusHandoff(): void {
  if (!pendingDetachedFocusHandoff) {
    return;
  }

  if (!detachedFocusWindow || detachedFocusWindow.isDestroyed?.()) {
    return;
  }

  const handoffState = pendingDetachedFocusHandoff;
  const payload = serializeForScript(handoffState);
  detachedFocusWindow.webContents?.executeJavaScript?.(
    `window.__PINCH_DETACHED_FOCUS_HANDOFF__?.(${payload});`,
    true
  ).then(() => {
    if (pendingDetachedFocusHandoff === handoffState) {
      pendingDetachedFocusHandoff = null;
    }
  }).catch(() => {});
}

export function openDetachedFocusWindowSettings(): void {
  pendingDetachedFocusOpenSettings = true;
  flushDetachedFocusOpenSettingsRequest();
}

export function handoffDetachedFocusSession(state: FocusTimerHandoffState): void {
  pendingDetachedFocusHandoff = state;
  flushDetachedFocusHandoff();
}

function setDetachedFocusWindowExpanded(expanded: boolean): void {
  detachedFocusWindowExpanded = expanded;
  if (!detachedFocusWindow || detachedFocusWindow.isDestroyed?.()) {
    return;
  }

  const bounds = detachedFocusWindow.getBounds?.();
  if (!bounds) {
    return;
  }

  const nextHeight = expanded
    ? DETACHED_FOCUS_WINDOW_EXPANDED_HEIGHT
    : DETACHED_FOCUS_WINDOW_COLLAPSED_HEIGHT;
  if (bounds.height === nextHeight && bounds.width === DETACHED_FOCUS_WINDOW_WIDTH) {
    return;
  }

  // Keep the capsule anchored in place while the detached window grows upward.
  const nextY = bounds.y + (bounds.height - nextHeight);

  detachedFocusWindow.setBounds?.({
    x: bounds.x,
    y: nextY,
    width: DETACHED_FOCUS_WINDOW_WIDTH,
    height: nextHeight
  }, true);
  saveDetachedWindowBounds(detachedFocusWindow);
}

async function handleDetachedFocusRequest(_event: unknown, request?: DetachedFocusRequest): Promise<unknown> {
  if (!request || typeof request !== 'object') {
    return null;
  }

  switch (request.type) {
    case 'get-state':
      return getDetachedFocusWindowState();
    case 'claim-focus-session': {
      const requestedOwner = request.owner === 'capsule' ? 'capsule' : 'capsule';
      const activeOwner = getActiveFocusSessionOwner();
      if (activeOwner && activeOwner !== requestedOwner) {
        return false;
      }
      setActiveFocusSessionOwner(requestedOwner);
      syncDetachedFocusWindowState();
      return true;
    }
    case 'release-focus-session':
      if (getActiveFocusSessionOwner() === (request.owner || 'capsule')) {
        setActiveFocusSessionOwner(null);
      }
      syncDetachedFocusWindowState();
      return true;
    case 'record-focus-session':
      await persistFocusSession(
        request.minutes || 0,
        request.target || latestLinkedTarget,
        'capsule'
      );
      return true;
    case 'upsert-focus-session':
      await persistFocusSessionCheckpoint(
        request.sessionId || '',
        request.minutes || 0,
        request.target || latestLinkedTarget,
        request.final === true,
        'capsule'
      );
      return true;
    case 'open-linked-target':
      if (latestLinkedTarget) {
        await openFocusTimerLinkedTarget(latestLinkedTarget);
      }
      return true;
    case 'load-target-options':
      return loadFocusTargetOptions(request.mode === 'task' ? 'task' : 'habit');
    case 'set-linked-target':
      notifyDetachedFocusLinkedTargetChange(request.target ?? null);
      syncDetachedFocusWindowState();
      return true;
    case 'disable-floating-focus':
      notifyDetachedFocusDisableRequest();
      closeDetachedFocusWindowFromEvent(_event);
      return true;
    case 'set-expanded':
      setDetachedFocusWindowExpanded(request.expanded === true);
      return true;
    default:
      return null;
  }
}

function ensureDetachedFocusBridgeRegistered(): void {
  if (ipcHandlerRegistered) {
    return;
  }

  const electronMain = getElectronMain();
  if (!electronMain?.ipcMain) {
    return;
  }

  try {
    electronMain.ipcMain.handle(DETACHED_FOCUS_REQUEST_CHANNEL, handleDetachedFocusRequest);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('Attempted to register a second handler')) {
      throw error;
    }

    // SiYuan can reload the plugin bundle without clearing Electron's main-process
    // handler. Replace the stale handler for this plugin-owned channel and retry.
    electronMain.ipcMain.removeHandler?.(DETACHED_FOCUS_REQUEST_CHANNEL);
    electronMain.ipcMain.handle(DETACHED_FOCUS_REQUEST_CHANNEL, handleDetachedFocusRequest);
  }
  ipcHandlerRegistered = true;

  if (!focusSessionUnsubscribe) {
    focusSessionUnsubscribe = subscribeFocusSessionOwner(() => {
      syncDetachedFocusWindowState();
    });
  }
}

function createDetachedFocusWindow(): void {
  const remote = getRemote();
  if (!remote) {
    return;
  }

  const savedBounds = getDetachedWindowBounds();
  const defaultBounds = getDefaultDetachedWindowBounds();
  const initialBounds = savedBounds || defaultBounds;
  const initialState = getDetachedFocusWindowState();

  detachedFocusWindowExpanded = initialBounds.height > DETACHED_FOCUS_WINDOW_COLLAPSED_HEIGHT;
  detachedFocusWindow = new remote.BrowserWindow({
    x: initialBounds.x,
    y: initialBounds.y,
    width: DETACHED_FOCUS_WINDOW_WIDTH,
    height: detachedFocusWindowExpanded
      ? DETACHED_FOCUS_WINDOW_EXPANDED_HEIGHT
      : DETACHED_FOCUS_WINDOW_COLLAPSED_HEIGHT,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false
    }
  });

  detachedFocusWindow.setAlwaysOnTop?.(true, 'screen-saver');
  detachedFocusWindow.setVisibleOnAllWorkspaces?.(true, { visibleOnFullScreen: true });
  detachedFocusWindow.loadURL?.(
    `data:text/html;charset=UTF-8,${encodeURIComponent(buildDetachedFocusWindowHtmlV2(initialState))}`
  );

  detachedFocusWindow.webContents?.on?.('did-finish-load', () => {
    detachedFocusWindow.showInactive?.();
    if (!detachedFocusWindow.isVisible?.()) {
      detachedFocusWindow.show?.();
    }
    syncDetachedFocusWindowState();
    syncDetachedFocusWindowTargetOptions();
    flushDetachedFocusOpenSettingsRequest();
    flushDetachedFocusHandoff();
  });

  detachedFocusWindow.once?.('ready-to-show', () => {
    detachedFocusWindow.showInactive?.();
    if (!detachedFocusWindow.isVisible?.()) {
      detachedFocusWindow.show?.();
    }
    syncDetachedFocusWindowState();
    syncDetachedFocusWindowTargetOptions();
    flushDetachedFocusOpenSettingsRequest();
    flushDetachedFocusHandoff();
  });

  detachedFocusWindow.on?.('move', () => {
    saveDetachedWindowBounds(detachedFocusWindow);
  });

  detachedFocusWindow.on?.('closed', () => {
    detachedFocusWindow = null;
    detachedFocusWindowExpanded = false;
    if (getActiveFocusSessionOwner() === 'capsule') {
      setActiveFocusSessionOwner(null);
    }
  });
}

export function syncDetachedFocusWindow(
  enabled: boolean,
  linkedTarget: FocusTimerLinkedTarget | null = null
): void {
  latestLinkedTarget = linkedTarget;

  if (!isDetachedFocusWindowSupported()) {
    return;
  }

  if (!enabled) {
    closeDetachedFocusWindow();
    return;
  }

  ensureDetachedFocusBridgeRegistered();
  void refreshDetachedFocusTargetOptions()
    .then(() => {
      syncDetachedFocusWindowTargetOptions();
    })
    .catch(() => {});

  if (!detachedFocusWindow || detachedFocusWindow.isDestroyed?.()) {
    createDetachedFocusWindow();
    return;
  }

  if (!detachedFocusWindow.isVisible?.()) {
    detachedFocusWindow.showInactive?.();
    if (!detachedFocusWindow.isVisible?.()) {
      detachedFocusWindow.show?.();
    }
  }
  syncDetachedFocusWindowState();
  syncDetachedFocusWindowTargetOptions();
}

export function closeDetachedFocusWindow(): void {
  if (getActiveFocusSessionOwner() === 'capsule') {
    setActiveFocusSessionOwner(null);
  }

  closeOrphanedDetachedFocusWindows();

  if (!detachedFocusWindow || detachedFocusWindow.isDestroyed?.()) {
    detachedFocusWindow = null;
    detachedFocusWindowExpanded = false;
    return;
  }

  closeBrowserWindow(detachedFocusWindow);
  detachedFocusWindow = null;
  detachedFocusWindowExpanded = false;
}

export function destroyDetachedFocusWindow(): void {
  closeDetachedFocusWindow();

  if (focusSessionUnsubscribe) {
    focusSessionUnsubscribe();
    focusSessionUnsubscribe = null;
  }

  if (!ipcHandlerRegistered) {
    return;
  }

  const electronMain = getElectronMain();
  try {
    electronMain?.ipcMain?.removeHandler?.(DETACHED_FOCUS_REQUEST_CHANNEL);
  } catch {
    // Ignore cleanup failures during plugin shutdown.
  }
  ipcHandlerRegistered = false;
}
