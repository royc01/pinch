import { addFocusSession, upsertFocusSessionRecord } from '@/api';
import {
  getActiveFocusSessionOwner,
  setActiveFocusSessionOwner,
  subscribeFocusSessionOwner,
  type FocusSessionOwner
} from '@/composables/useFocusSessionLock';
import { awardFocusSession } from '@/rewardRepository';
import {
  openFocusTimerLinkedTarget,
  toFocusSessionTargetInput,
  type FocusTimerLinkedTarget
} from '@/utils/focusTimerTarget';
import {
  loadHabitFocusTargetOptions,
  loadTaskFocusTargetOptions,
  type FocusTargetPickerMode
} from '@/utils/focusTimerTargetPicker';
import { translate } from '@/composables/useI18n';
import type { FocusTimerHandoffState } from '@/utils/focusTimerHandoff';
import { userSettings, DEFAULT_SETTINGS } from '@/utils/userSettings';

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
  iconBaseUrl: string;
  focusSettings: Record<string, unknown> | null;
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
  | { type: 'open-focus-settings' }
  | {
      type: 'update-white-noise-settings';
      whiteNoiseEnabled?: boolean;
      selectedWhiteNoiseId?: string;
      whiteNoiseVolume?: number;
    }
  | { type: 'load-target-options'; mode?: FocusTargetPickerMode }
  | { type: 'set-linked-target'; target?: FocusTimerLinkedTarget | null }
  | { type: 'complete-linked-target'; target?: FocusTimerLinkedTarget | null }
  | { type: 'disable-floating-focus' }
  | { type: 'set-expanded'; expanded?: boolean }
  | { type: 'set-compact'; compact?: boolean }
  | { type: 'set-progress-only'; progressOnly?: boolean }
  | { type: 'get-micro-break-settings' }
  | { type: 'show-micro-break-dialog'; duration?: number; title?: string; body?: string; variant?: 'micro-break' | 'short-break' | 'focus-complete' }
  | { type: 'hide-micro-break-dialog' }
  | { type: 'cancel-micro-break' };

const DETACHED_FOCUS_REQUEST_CHANNEL = 'pinch-detached-focus:request';
const DETACHED_FOCUS_WINDOW_BOUNDS_KEY = 'pinch-detached-focus-window-bounds';
const DETACHED_FOCUS_SESSION_EVENT = 'pinch-focus-session';
const DETACHED_FOCUS_DISABLE_EVENT = 'pinch-detached-focus:disable';
const DETACHED_FOCUS_LINKED_TARGET_EVENT = 'pinch-detached-focus:linked-target';
const DETACHED_FOCUS_COMPLETE_LINKED_TARGET_EVENT = 'pinch-detached-focus:complete-linked-target';
const DETACHED_FOCUS_OPEN_SETTINGS_EVENT = 'pinch-detached-focus:open-settings';
const DETACHED_MICRO_BREAK_CANCEL_EVENT = 'pinch-detached-focus:cancel-micro-break';
const DETACHED_FOCUS_WINDOW_TITLE = 'Pinch Focus Capsule';
const DETACHED_FOCUS_WINDOW_WIDTH = 185;
const DETACHED_FOCUS_WINDOW_COLLAPSED_HEIGHT = 65;
const DETACHED_FOCUS_WINDOW_COMPACT_HEIGHT = 47;
const DETACHED_FOCUS_WINDOW_PROGRESS_ONLY_HEIGHT = 55;
const DETACHED_FOCUS_WINDOW_EXPANDED_HEIGHT = 460;
const DETACHED_FOCUS_WINDOW_EXPANDED_WIDTH = 280;
const DETACHED_FOCUS_WINDOW_MARGIN = 24;
const DETACHED_FOCUS_DEFAULT_FONT_FAMILY = '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';
const DETACHED_FOCUS_COUNTUP_AUTOSAVE_INTERVAL_MS = 60_000;

let detachedFocusWindow: any | null = null;
let detachedFocusWindowExpanded = false;
let detachedFocusWindowCompact = false;
let detachedFocusWindowProgressOnly = false;
let detachedFocusWindowCollapsedPosition: { x: number; y: number } | null = null;
let ipcHandlerRegistered = false;
let focusSessionUnsubscribe: (() => void) | null = null;
let latestLinkedTarget: FocusTimerLinkedTarget | null = null;
let latestThemeSnapshot: DetachedFocusTheme | null = null;
let latestHabitTargetOptions: FocusTimerLinkedTarget[] = [];
let latestTaskTargetOptions: FocusTimerLinkedTarget[] = [];
let latestFocusSettings: Record<string, unknown> | null = null;
let targetOptionsRefreshPromise: Promise<void> | null = null;
let pendingDetachedFocusOpenSettings = false;
let pendingDetachedFocusHandoff: FocusTimerHandoffState | null = null;
let detachedMicroBreakWindow: any | null = null;

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

function notifyDetachedFocusCompleteLinkedTarget(target: FocusTimerLinkedTarget | null): void {
  if (!target || typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(DETACHED_FOCUS_COMPLETE_LINKED_TARGET_EVENT, { detail: target }));
}

export function subscribeDetachedFocusCompleteLinkedTarget(
  listener: (target: FocusTimerLinkedTarget) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleCompleteLinkedTarget = (event: Event) => {
    const target = (event as CustomEvent<FocusTimerLinkedTarget | null>).detail;
    if (target) {
      listener(target);
    }
  };

  window.addEventListener(DETACHED_FOCUS_COMPLETE_LINKED_TARGET_EVENT, handleCompleteLinkedTarget);
  return () => {
    window.removeEventListener(DETACHED_FOCUS_COMPLETE_LINKED_TARGET_EVENT, handleCompleteLinkedTarget);
  };
}

function notifyDetachedFocusOpenSettingsRequest(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DETACHED_FOCUS_OPEN_SETTINGS_EVENT));
  }
}

export function subscribeDetachedFocusOpenSettingsRequest(listener: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener(DETACHED_FOCUS_OPEN_SETTINGS_EVENT, listener);
  return () => window.removeEventListener(DETACHED_FOCUS_OPEN_SETTINGS_EVENT, listener);
}

function notifyDetachedMicroBreakCancel(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DETACHED_MICRO_BREAK_CANCEL_EVENT));
  }
}

export function subscribeDetachedMicroBreakCancel(listener: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  window.addEventListener(DETACHED_MICRO_BREAK_CANCEL_EVENT, listener);
  return () => window.removeEventListener(DETACHED_MICRO_BREAK_CANCEL_EVENT, listener);
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

function getMicroBreakHostBounds(remote: RemoteLike): { x: number; y: number; width: number; height: number } {
  const candidates = [
    remote.getCurrentWindow?.(),
    ...(getElectronMain()?.BrowserWindow?.getAllWindows?.() || [])
  ];
  let largestBounds: { x: number; y: number; width: number; height: number } | null = null;

  for (const candidate of candidates) {
    if (
      !candidate
      || candidate === detachedFocusWindow
      || candidate === detachedMicroBreakWindow
      || candidate.isDestroyed?.()
    ) {
      continue;
    }

    const bounds = candidate.getBounds?.() || candidate.getContentBounds?.();
    if (
      !Number.isFinite(bounds?.width)
      || !Number.isFinite(bounds?.height)
      || bounds.width <= 0
      || bounds.height <= 0
    ) {
      continue;
    }

    if (!largestBounds || bounds.width * bounds.height > largestBounds.width * largestBounds.height) {
      largestBounds = {
        x: Number.isFinite(bounds.x) ? bounds.x : 0,
        y: Number.isFinite(bounds.y) ? bounds.y : 0,
        width: bounds.width,
        height: bounds.height
      };
    }
  }

  return largestBounds || { x: 0, y: 0, width: 1280, height: 800 };
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
      const minimized = !!currentWindow.isMinimized?.();
      const hidden = typeof currentWindow.isVisible === 'function'
        ? !currentWindow.isVisible()
        : false;
      listener(minimized || hidden);
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
    theme: latestThemeSnapshot,
    iconBaseUrl: window.location.origin,
    focusSettings: latestFocusSettings
  };
}

export function syncDetachedFocusWindowFocusSettings(settings: Record<string, unknown> | null | undefined): void {
  latestFocusSettings = settings && typeof settings === 'object' ? { ...settings } : null;
  if (!detachedFocusWindow || detachedFocusWindow.isDestroyed?.()) {
    return;
  }
  const payload = serializeForScript(latestFocusSettings);
  detachedFocusWindow.webContents?.executeJavaScript?.(
    `window.__PINCH_DETACHED_FOCUS_UPDATE_SETTINGS__?.(${payload});`,
    true
  ).catch(() => {});
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
  const sessionTarget = toFocusSessionTargetInput(target);

  await addFocusSession(normalizedMinutes, sessionTarget, { sessionId });
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

  const sessionTarget = toFocusSessionTargetInput(target);

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
  },
  rain: {
    viewBox: '0 0 1024 1024',
    path: '<path d="M979.882667 519.850667c-23.722667 93.44-104.96 168.704-218.453334 196.608l-1.877333 1.877333H237.738667A203.434667 203.434667 0 0 1 33.194667 512c0-109.226667 83.2-198.4 188.757333-208.213333C243.797333 177.152 357.290667 79.36 490.154667 79.36c99.498667 0 190.549333 53.333333 238.506666 140.8 7.850667-1.877333 17.578667 0 27.904 0 104.96 9.642667 194.816 83.114667 220.245334 184.405333 3.072 18.261333 15.189333 61.952 3.072 115.285334zM211.626667 828.16a31.061333 31.061333 0 0 1 37.546666-19.456 32 32 0 0 1 20.138667 37.632l-25.6 78.933333a31.061333 31.061333 0 0 1-37.546667 19.370667 32 32 0 0 1-20.053333-37.546667l25.514667-78.933333z m148.650666-57.088a31.061333 31.061333 0 0 1 37.632-19.370667 32 32 0 0 1 20.053334 37.546667l-45.568 141.482667c-5.973333 15.701333-21.845333 23.637333-37.546667 17.578666a32 32 0 0 1-20.053333-37.632l45.482666-139.605333z m139.008 0a31.061333 31.061333 0 0 1 37.546667-19.370667 32 32 0 0 1 20.053333 37.546667l-46.08 141.482667c-6.058667 15.701333-21.845333 23.637333-37.632 17.578666a32 32 0 0 1-20.053333-37.632l46.08-139.605333z m138.325334 0a31.061333 31.061333 0 0 1 37.546666-19.370667 32 32 0 0 1 20.138667 37.546667l-45.568 141.482667c-5.973333 15.701333-21.845333 23.637333-37.546667 17.578666a32 32 0 0 1-20.053333-37.632l45.482667-139.605333z m129.28 57.088a31.061333 31.061333 0 0 1 37.546666-19.456 32 32 0 0 1 20.053334 37.632l-25.429334 78.933333a31.061333 31.061333 0 0 1-37.632 19.370667 32 32 0 0 1-20.053333-37.546667l25.514667-78.933333z"></path>'
  },
  jungle: {
    viewBox: '0 0 1024 1024',
    path: '<path d="M749.966222 657.976889l-130.901333-117.191111h68.380444a32.995556 32.995556 0 0 0 26.168889-53.191111L604.728889 368.64l-0.398222-0.455111h46.08a28.558222 28.558222 0 0 0 24.746666-42.894222l-19.569777-27.192889-122.709334-170.097778a28.558222 28.558222 0 0 0-49.493333 0l-142.222222 197.290667a28.615111 28.615111 0 0 0 24.746666 42.894222h46.08L302.933333 487.537778a32.995556 32.995556 0 0 0 26.112 53.191111h68.380445l-130.901334 117.191111a37.091556 37.091556 0 0 0 26.567112 62.919111h167.594666v160.256a47.559111 47.559111 0 1 0 95.118222 0v-160.256h167.594667a37.034667 37.034667 0 0 0 26.567111-62.862222z"></path><path d="M827.392 579.015111h56.433778a25.486222 25.486222 0 0 0 20.195555-41.130667l-87.324444-95.402666h38.627555a22.016 22.016 0 0 0 19.057778-33.109334l-83.456-152.405333a22.016 22.016 0 0 0-38.115555 0l-47.957334 66.389333 18.488889 25.656889c4.835556 8.362667 7.395556 20.764444 2.673778 30.890667-4.778667 10.126222-13.994667 21.162667-23.665778 21.105778l-26.453333 0.568889-0.284445 0.341333 90.908445 100.977778c15.758222 20.48 0.455111 66.503111-25.372445 66.503111h-36.295111l86.072889 83.968c21.504 22.186667 6.428444 76.8-24.405333 76.8h-13.767111l-2.446222 145.521778a32.938667 32.938667 0 0 0 32.938666 33.507555 33.507556 33.507556 0 0 0 33.450667-33.507555v-154.282667h94.947555c25.258667 0 38.115556-30.435556 20.48-48.583111l-104.732444-93.866667zM198.144 579.015111h-56.433778a25.486222 25.486222 0 0 1-20.195555-41.130667l87.324444-95.402666h-38.627555a22.016 22.016 0 0 1-19.057778-33.109334l83.456-152.405333a22.016 22.016 0 0 1 38.115555 0l47.957334 66.389333-18.488889 25.656889c-4.835556 8.362667-7.395556 20.764444-2.673778 30.890667 4.778667 10.126222 14.051556 21.162667 23.665778 21.105778l26.453333 0.568889 0.284445 0.341333L259.015111 502.897778c-15.758222 20.48-0.455111 66.503111 25.372445 66.503111h36.295111l-86.072889 83.968c-21.504 22.186667-6.428444 76.8 24.405333 76.8h13.767111l2.446222 145.521778a32.938667 32.938667 0 0 1-32.938666 33.507555 33.507556 33.507556 0 0 1-33.450667-33.507555v-154.282667H113.891556a28.615111 28.615111 0 0 1-20.48-48.583111l104.732444-93.866667z" opacity=".8"></path>'
  },
  waves: {
    viewBox: '0 0 1024 1024',
    path: '<path d="M906.24 465.92c-25.6 76.8-46.08 107.52-107.52 107.52-61.44 0-71.68-35.84-143.36-35.84-81.92 0-102.4 56.32-148.48 30.72-46.08-25.6-66.56-40.96-117.76-40.96-76.8-5.12-107.52 102.4-189.44 35.84-56.32-51.2-122.88-25.6-122.88-25.6-15.36 0-30.72-35.84 30.72-35.84 112.64 0 179.2-133.12 204.8-199.68l35.84-81.92c30.72-71.68 81.92-128 143.36-158.72 30.72-15.36 61.44-20.48 92.16-20.48 40.96 0 76.8 10.24 112.64 30.72 30.72 15.36 56.32 40.96 76.8 71.68 15.36 20.48 35.84 51.2 40.96 81.92 15.36 40.96-30.72 30.72-61.44 10.24 0 0-76.8-40.96-107.52 15.36-71.68 143.36 30.72 204.8 46.08 209.92 35.84 20.48 81.92 25.6 117.76 5.12 81.92-40.96 87.04-92.16 102.4-92.16 25.6 15.36-5.12 92.16-5.12 92.16z m-102.4 302.08c-30.72 0-61.44-10.24-81.92-25.6l-25.6-15.36c-25.6-15.36-56.32-15.36-76.8 5.12-51.2 46.08-128 51.2-179.2 10.24l-25.6-15.36c-25.6-15.36-56.32-15.36-76.8 5.12-51.2 46.08-128 51.2-179.2 10.24l-92.16-66.56c-15.36-15.36-20.48-35.84-5.12-56.32 15.36-15.36 35.84-20.48 56.32-5.12L204.8 680.96c25.6 15.36 56.32 15.36 76.8-5.12 51.2-46.08 128-51.2 179.2-10.24l25.6 15.36c25.6 15.36 56.32 15.36 76.8-5.12 51.2-46.08 128-51.2 179.2-10.24l25.6 15.36c25.6 15.36 56.32 15.36 76.8-5.12l61.44-56.32c15.36-15.36 40.96-15.36 56.32 0 15.36 15.36 15.36 40.96 0 56.32l-61.44 56.32c-25.6 25.6-61.44 35.84-97.28 35.84z m0 194.56c-30.72 0-61.44-10.24-81.92-25.6l-25.6-15.36c-25.6-15.36-56.32-15.36-76.8 5.12-51.2 46.08-128 51.2-179.2 10.24l-25.6-15.36c-25.6-15.36-56.32-15.36-76.8 5.12-51.2 46.08-128 51.2-179.2 10.24L66.56 870.4c-15.36-15.36-20.48-35.84-5.12-56.32 15.36-15.36 35.84-20.48 56.32-5.12L204.8 875.52c25.6 15.36 56.32 15.36 76.8-5.12 51.2-46.08 128-51.2 179.2-10.24l25.6 15.36c25.6 15.36 56.32 15.36 76.8-5.12 51.2-46.08 128-51.2 179.2-10.24l25.6 15.36c25.6 15.36 56.32 15.36 76.8-5.12l61.44-56.32c15.36-15.36 40.96-15.36 56.32 0 15.36 15.36 15.36 40.96 0 56.32l-61.44 56.32c-25.6 25.6-61.44 35.84-97.28 35.84z m390.954667-544c0-14.08-12.8-34.56-31.616-47.36a99.2 99.2 0 0 0-40.106667-14.805333 119.210667 119.210667 0 0 0-56.32 5.162667c-36.864 12.501333-70.357333 39.381333-100.864 76.117333-9.173333 11.008-18.304 25.045333-30.634667 46.293333-2.432 4.181333-14.208 24.832-17.450666 30.378667a385.109333 385.109333 0 0 1-17.92 28.458667c-5.12 7.253333-8.32 11.52-12.757334 16.938666-6.4 7.765333-13.056 14.805333-20.394666 21.077334-19.925333 17.109333-42.666667 27.136-68.437334 27.136-48.512 0-89.045333-30.293333-120.661333-86.485334a29.866667 29.866667 0 0 1 10.410667-40.192c13.653333-8.106667 31.104-3.328 38.997333 10.709334 22.314667 39.637333 45.781333 57.173333 71.253333 57.173333 11.093333 0 21.504-4.565333 31.914667-13.525333 8.277333-7.082667 14.378667-14.506667 23.509333-27.434667 4.309333-6.101333 9.045333-13.653333 15.146667-24.106667l17.365333-30.293333c13.866667-23.850667 24.490667-40.192 36.266667-54.357333 16.085333-19.328 33.28-36.778667 52.096-51.882667a244.181333 244.181333 0 0 1 74.24-41.813333 174.677333 174.677333 0 0 1 82.517333-7.509334 154.922667 154.922667 0 0 1 63.317334 23.978667c33.621333 22.869333 57.173333 60.586667 57.173333 96.341333 0 55.210667-27.946667 93.056-79.189333 106.794667-19.797333 5.333333-38.4-11.904-35.413334-32.725333 2.176-15.530667 0.981333-25.173333-1.877333-29.568-2.304-3.584-3.754667-4.821333-5.333333-5.461334-2.261333-0.938667-6.272-1.493333-13.738667-1.493333a6.4 6.4 0 0 0-2.048 0.725333 17.066667 17.066667 0 0 0-5.12 4.096c-4.352 5.077333-7.125333 12.714667-7.125333 22.954667 0 8.917333 4.736 19.498667 13.781333 30.293333 7.850667 9.429333 18.261333 18.005333 25.813333 22.144 14.165333 7.765333 35.072 12.074667 69.717334 12.885334 24.277333 0.554667 49.92-16.085333 77.184-53.546667a28.117333 28.117333 0 0 1 47.530666 2.816c19.626667 34.816 44.458667 50.688 77.226667 50.688 15.786667 0 28.544 13.184 28.544 29.44 0 16.213333-12.8 29.354667-28.586667 29.354667-41.301333 0-76.288-16.213333-103.68-47.36-30.634667 31.829333-63.829333 48.213333-99.541333 47.36-42.752-1.024-71.978667-6.997333-95.232-19.797334a157.994667 157.994667 0 0 1-42.24-35.669333c-17.194667-20.565333-27.605333-43.733333-27.605333-68.608 0-24.533333 7.808-46.165333 21.717333-62.165333 13.269333-15.274667 31.488-24.405333 49.664-24.405334 14.08 0 24.576 1.408 34.986667 5.717334 12.8 5.248 23.04 14.336 31.573333 27.306666 2.944 4.608 5.333333 9.472 7.253333 14.677334 3.2-7.04 4.693333-15.786667 4.693334-26.453334z"></path>'
  },
  campfire: {
    viewBox: '0 0 1024 1024',
    path: '<path d="M443.733333 68.266667a34.133333 34.133333 0 0 0-34.133333 34.133333c0 129.399467-170.666667 204.4928-170.666667 375.466667 0 140.4928 135.168 233.7792 199.68 238.455466A34.133333 34.133333 0 0 0 443.733333 716.8a34.133333 34.133333 0 0 0 34.133334-34.133333 34.133333 34.133333 0 0 0-12.629334-26.5216c-31.061333-25.1904-55.637333-59.016533-55.637333-111.479467C409.6 454.007467 512 375.466667 512 375.466667c-28.4672 125.883733 64.750933 103.082667 68.676267 302.216533A34.133333 34.133333 0 0 0 580.266667 682.666667a34.133333 34.133333 0 0 0 0.785066 7.133866v0.273067h0.068267A34.133333 34.133333 0 0 0 614.4 716.8a34.133333 34.133333 0 0 0 20.002133-6.519467l0.068267-0.068266C634.709333 710.075733 785.066667 636.552533 785.066667 512c0-82.056533-41.096533-189.064533-70.587734-251.323733A34.133333 34.133333 0 0 0 682.666667 238.933333a34.133333 34.133333 0 0 0-34.133334 34.133334s-1.058133 74.24-34.133333 102.4c0-163.259733-85.777067-230.058667-146.193067-296.789334a34.133333 34.133333 0 0 1 0-0.068266A34.133333 34.133333 0 0 0 443.733333 68.266667z m376.32 648.3968a34.133333 34.133333 0 0 0-9.1136 1.1264l-546.133333 136.533333a34.133333 34.133333 0 1 0 16.520533 66.286933l546.133334-136.533333a34.133333 34.133333 0 0 0-7.406934-67.413333z m-620.987733 0.6144a34.167467 34.167467 0 0 0-2.048 66.901333l70.792533 16.6912 144.520534-36.181333-199.714134-47.035734a34.133333 34.133333 0 0 0-13.550933-0.375466z m575.726933 132.7104l-144.520533 36.1472 146.978133 34.6112a34.2016 34.2016 0 0 0 41.0624-25.463467 34.2016 34.2016 0 0 0-25.429333-41.096533l-18.090667-4.1984z"></path>'
  },
  river: {
    viewBox: '0 0 1024 1024',
    path: '<path d="M981.31968 747.88864a593.7152 593.7152 0 0 1-299.8272 80.24064 719.99488 719.99488 0 0 1-284.59008-61.6448c-151.42912-64.79872-312.27904-0.32768-313.9584 0.24576a45.58848 45.58848 0 0 1-58.65472-22.40512A42.10688 42.10688 0 0 1 47.67744 688.128c8.11008-3.2768 198.77888-79.6672 385.59744 0.24576 125.05088 53.57568 313.46688 94.57664 501.9648-13.96736a45.8752 45.8752 0 0 1 61.31712 14.5408 41.7792 41.7792 0 0 1-15.23712 58.94144zM631.6032 656.5888a230.68672 230.68672 0 0 1-230.52288-230.4 242.688 242.688 0 0 1 42.96704-124.928c4.83328-8.35584 9.4208-16.26112 13.68064-24.00256 30.22848-57.01632 131.23584-227.49184 135.5776-234.7008A44.2368 44.2368 0 0 1 631.6032 20.48h0.49152c15.9744 0.12288 30.72 8.8064 38.58432 22.7328 4.096 7.00416 100.02432 177.07008 125.7472 224.54272 5.36576 10.11712 11.83744 20.11136 18.51392 30.72a221.34784 221.34784 0 0 1-183.33696 358.1952v-0.04096zM376.34048 301.2608c-25.64096 36.864-40.5504 80.11776-43.008 124.96896a228.39296 228.39296 0 0 0 34.2016 119.07072 169.61536 169.61536 0 0 1-73.97376 17.57184l-2.048-6.144-2.12992 6.144a165.888 165.888 0 0 1-167.64928-163.67616c1.6384-31.82592 12.288-62.54592 30.63808-88.59648 3.03104-5.12 5.89824-9.8304 8.47872-14.70464 20.15232-36.94592 86.75328-146.96448 89.7024-151.63392a45.34272 45.34272 0 0 1 39.28064-21.66784c0.6144 0 1.10592 0.24576 1.72032 0.24576 0.6144 0 1.10592-0.24576 1.72032-0.24576 15.9744-0.24576 30.88384 7.9872 39.23968 21.7088 2.17088 3.4816 40.5504 66.64192 67.9936 113.664-4.01408 7.04512-7.70048 14.1312-10.52672 19.33312-4.3008 7.7824-8.84736 15.72864-13.63968 24.08448v-0.12288zM47.63648 863.47776c7.9872-3.2768 198.656-79.6672 385.51552 0.24576 125.05088 53.57568 313.58976 94.57664 501.9648-14.04928a45.83424 45.83424 0 0 1 61.31712 14.62272 41.7792 41.7792 0 0 1-15.27808 58.69568A594.1248 594.1248 0 0 1 681.5744 1003.52a723.31264 723.31264 0 0 1-284.71296-61.6448c-151.47008-64.88064-312.32-0.36864-313.9584 0.2048a45.58848 45.58848 0 0 1-58.69568-22.40512 42.06592 42.06592 0 0 1 23.42912-55.95136v-0.24576z"></path>'
  }
} as const;

const DETACHED_FOCUS_WINDOW_STYLES_V2 = String.raw`
    :root {
      --b3-theme-background: #ffffff;
      --b3-border-color: rgba(0, 0, 0, 0.08);
      --b3-point-shadow: 0 10px 24px rgba(15, 23, 42, 0.18);
      --b3-theme-on-background: #20262f;
      --b3-theme-on-surface: rgba(32, 38, 47, 0.74);
      --b3-theme-on-surface-light: rgba(32, 38, 47, 0.55);
      --b3-theme-surface: #ffffff;
      --b3-theme-surface-light: rgba(15, 23, 42, 0.08);
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
      padding: 0 4px 4px 0;
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
      display: grid;
      grid-template-columns: 17px minmax(44px, 1fr) 22px auto;
      grid-template-rows: minmax(53px, 1fr) 17px;
      align-items: center;
      gap: 0 4px;
      width: 165px;
      height: 83px;
      box-sizing: border-box;
      padding: 5px;
      max-width: 100%;
      border-radius: 18px;
      border: 1px solid color-mix(in srgb, var(--b3-border-color) 65%, transparent);
      background: var(--b3-theme-background);
      box-shadow: var(--b3-border-color) 0px 0px 0 .5px, rgba(0, 0, 0, .05) 0px 1px 2px 0px, rgba(15, 15, 15, .05) 0px 2px 4px;
      color: var(--b3-theme-on-background);
      font-size: 12px;
      font-weight: 600;
      user-select: none;
      pointer-events: auto;
      -webkit-app-region: drag;
    }

    .floating-focus__close {
      position: absolute;
      top: -4px;
      right: -4px;
      width: 16px;
      height: 16px;
      padding: 0;
      border: none;
      border-radius: 999px;
      background: var(--b3-theme-background);
      color: var(--b3-theme-on-surface);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 8px;
      line-height: 1;
      cursor: pointer;
      opacity: 0;
      pointer-events: none;
      transform: translateY(-2px) scale(0.92);
      transition: opacity 0.16s ease, transform 0.16s ease, color 0.16s ease, background 0.16s ease;
      box-shadow: var(--b3-point-shadow);
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
      grid-column: 1;
      grid-row: 2;
      width: 17px;
      height: 17px;
      border-radius: 999px;
      background: transparent;
      color: var(--b3-theme-on-background);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .floating-focus__duration,
    .floating-focus__time {
      grid-column: 1 / -1;
      grid-row: 1;
      justify-self: center;
      background: transparent;
      color: inherit;
      white-space: nowrap;
      font-size: 38px;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      letter-spacing: -2px;
      line-height: .95;
      cursor: pointer;
    }

    .floating-focus__duration:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    .floating-focus__time {
      cursor: default;
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
      grid-column: 2 / 4;
      grid-row: 2;
      min-width: 0;
      max-width: 100%;
      height: 16px;
      padding: 0 6px;
      box-sizing: border-box;
      border-radius: 6px;
      background: transparent;
      justify-self: start;
      z-index: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 6px;
      line-height: 16px;
      color: #38201d;
    }

    .floating-focus__target {
      text-align: left;
      cursor: pointer;
    }

    .floating-focus__target:hover {
      color: var(--b3-theme-on-background);
    }

    .floating-focus__actions {
      grid-column: 4;
      grid-row: 2;
      display: flex;
      gap: 4px;
      pointer-events: auto;
      -webkit-app-region: no-drag;
    }

    .floating-focus__action {
      width: 17px;
      height: 17px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--b3-list-hover);
      color: var(--b3-theme-on-background);
      cursor: pointer;
    }

    .floating-focus__action.is-stop {
      background: var(--b3-list-hover);
      color: var(--b3-theme-on-background);
    }

    .floating-focus__action:hover {
      filter: brightness(0.98);
    }

    .floating-focus__action:disabled {
      cursor: not-allowed;
      opacity: 0.45;
      filter: none;
    }

    .floating-focus__capsule { display: block; width: 180px; height: 60px; padding: 0; border-radius: 35px; --progress: 0; --progress-color: var(--pinch-focus-accent); }
    .floating-focus__capsule.is-compact { height: 42px; border-radius: 24px; }
    .floating-focus__capsule.is-progress-only { height: 50px; border-radius: 29px; }
    .floating-focus__capsule::before, .floating-focus__capsule::after { display: none; }
    .floating-focus__progress-track { position: absolute; left: 18px; right: 18px; bottom: 5px; height: 6px; overflow: hidden; border-radius: 3px; background: var(--b3-list-hover); }
    .floating-focus__progress-fill { position: absolute; inset: 0 auto 0 0; width: calc(var(--progress) * 100%); border-radius: inherit; background: var(--progress-color); }
    .floating-focus__dot, .floating-focus__action { position: absolute; z-index: 2; top: 8px; width: 23px; height: 23px; pointer-events: auto; }
    .floating-focus__dot { left: 17.5px; background: transparent; }
    .floating-focus__duration, .floating-focus__time { position: absolute; top: 4px; left: 50%; width: auto; transform: translateX(-50%); font-family: var(--pinch-font-family); font-size: 31px; letter-spacing: 0; text-align: center; }
    .floating-focus__capsule.has-linked-target .floating-focus__duration, .floating-focus__capsule.has-linked-target .floating-focus__time { top: 14px; }
    .floating-focus__capsule.has-linked-target .floating-focus__dot, .floating-focus__capsule.has-linked-target .floating-focus__action { top: 18px; }
    .floating-focus__target, .floating-focus__target-label { position: absolute; z-index: 1; top: 2px; left: 0; width: 100%; max-width: none; height: 11px; padding: 0; border-radius: 0; background: transparent; font-size: 8px; line-height: 11px; text-align: center; }
    .floating-focus__actions { display: contents; pointer-events: none; }
    .floating-focus__action { right: 17.5px; }
    .floating-focus__action.is-stop { left: 17.5px; right: auto; }
    .floating-focus__dot svg,
    .floating-focus__action svg { width: 14px; height: 14px; }

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

    .white-noise-setting {
      padding-top: 10px;
    }

    .white-noise-toggle {
      position: relative;
      width: 36px;
      height: 20px;
      margin: 0;
      appearance: none;
      border: 0;
      border-radius: 10px;
      background: var(--b3-border-color);
      cursor: pointer;
      transition: background .2s ease;
    }

    .white-noise-toggle:checked { background: var(--pinch-focus-accent); }
    .white-noise-toggle::before {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #fff;
      content: '';
      transition: transform .2s ease;
    }
    .white-noise-toggle:checked::before { transform: translateX(16px); }

    .white-noise-options { display: flex; gap: 6px; }
    .white-noise-options.is-disabled { opacity: .45; }
    .white-noise-option {
      display: grid; width: 30px; height: 30px; padding: 0; place-items: center;
      color: var(--b3-theme-on-surface-light); background: var(--b3-theme-surface-light);
      border: 1px solid transparent; border-radius: 8px; cursor: pointer;
    }
    .white-noise-option:hover:not(:disabled), .white-noise-option.is-active {
      color: var(--pinch-focus-accent); background: color-mix(in srgb, var(--pinch-focus-accent) 13%, var(--b3-theme-surface));
      border-color: color-mix(in srgb, var(--pinch-focus-accent) 40%, transparent);
    }
    .white-noise-option:disabled { cursor: not-allowed; }
    .white-noise-option svg { width: 16px; height: 16px; fill: currentColor; }
    .white-noise-volume { display: flex; align-items: center; gap: 8px; color: var(--b3-theme-on-surface-light); font-size: 12px; }
    .white-noise-volume input { flex: 1; min-width: 0; accent-color: var(--pinch-focus-accent); }

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
      max-width: 100%;
      box-sizing: border-box;
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
    miniExitConfirm: translate('focusTimer.miniExitConfirm'),
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
    secondSuffix: translate('focusTimer.secondSuffix'),
    shortBreakDuration: translate('focusTimer.shortBreakDuration'),
    focusSets: translate('focusTimer.focusSets'),
    setSuffix: translate('focusTimer.setSuffix'),
    whiteNoise: translate('focusTimer.whiteNoise'),
    soundRain: translate('focusTimer.soundRain'),
    soundForest: translate('focusTimer.soundForest'),
    soundWaves: translate('focusTimer.soundWaves'),
    soundCampfire: translate('focusTimer.soundCampfire'),
    soundRiver: translate('focusTimer.soundRiver'),
    customWhiteNoise: translate('taskScopeDialog.customWhiteNoise'),
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
    countup: translate('focusTimer.countup'),
    shortBreakActiveTitle: translate('focusTimer.shortBreakActiveTitle'),
    shortBreakActiveBody: translate('focusTimer.shortBreakActiveBody'),
    focusCompletePopupTitle: translate('focusTimer.focusCompletePopupTitle'),
    focusCompletePopupBody: translate('focusTimer.focusCompletePopupBody')
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
        class="floating-focus__close ariaLabel"
        data-no-drag
        aria-label="${htmlText.closeMiniFocus}"
      >&times;</button>
      <button
        id="settingsToggle"
        type="button"
        class="floating-focus__dot ariaLabel"
        data-no-drag
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
        class="floating-focus__duration ariaLabel"
        data-no-drag
        aria-label="${htmlText.cycleDuration}"
      >
        25:00
      </button>
      <span id="timeOnly" class="floating-focus__time" hidden>00:00</span>
      <div id="progressTrack" class="floating-focus__progress-track" aria-hidden="true">
        <span class="floating-focus__progress-fill"></span>
      </div>
      <div class="floating-focus__actions">
        <button
          id="stopButton"
          type="button"
          class="floating-focus__action is-stop ariaLabel"
          data-no-drag
          aria-label="${htmlText.stop}"
          hidden
        ></button>
        <button
          id="actionButton"
          type="button"
          class="floating-focus__action ariaLabel"
          data-no-drag
          aria-label="${htmlText.startFocus}"
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
                class="linked-habit-banner__chip ariaLabel"
              >
                <span id="linkedTargetEmoji" class="linked-habit-banner__emoji"></span>
                <span id="linkedTargetName" class="linked-habit-banner__name"></span>
              </button>
              <button
                id="clearLinkedTargetButton"
                type="button"
                class="linked-habit-banner__clear ariaLabel"
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
                  class="linked-habit-banner__picker-close ariaLabel"
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
          <div class="setting-section white-noise-setting">
            <div class="setting-label">
              <span>${htmlText.whiteNoise}</span>
              <input id="whiteNoiseToggle" class="white-noise-toggle" type="checkbox" aria-label="${htmlText.whiteNoise}" />
            </div>
            <div id="whiteNoiseOptions" class="white-noise-options is-disabled">
              <button type="button" class="white-noise-option ariaLabel" data-sound="rain" aria-label="${htmlText.soundRain}"></button>
              <button type="button" class="white-noise-option ariaLabel" data-sound="jungle" aria-label="${htmlText.soundForest}"></button>
              <button type="button" class="white-noise-option ariaLabel" data-sound="waves" aria-label="${htmlText.soundWaves}"></button>
              <button type="button" class="white-noise-option ariaLabel" data-sound="campfire" aria-label="${htmlText.soundCampfire}"></button>
              <button type="button" class="white-noise-option ariaLabel" data-sound="river" aria-label="${htmlText.soundRiver}"></button>
              <button id="customWhiteNoiseButton" type="button" class="white-noise-option ariaLabel" data-sound="custom" aria-label="${htmlText.customWhiteNoise}">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.65 2.24a1 1 0 0 0-.8-.23l-13 2A1 1 0 0 0 7 5v10.35A3.45 3.45 0 0 0 5.5 15a3.5 3.5 0 1 0 3.5 3.5v-7.64L20 9.17v4.18A3.45 3.45 0 0 0 18.5 13a3.5 3.5 0 1 0 3.5 3.5V3a1 1 0 0 0-.35-.76ZM5.5 20A1.5 1.5 0 1 1 7 18.5 1.5 1.5 0 0 1 5.5 20Zm13-2A1.5 1.5 0 1 1 20 16.5 1.5 1.5 0 0 1 18.5 18ZM20 7.14 9 8.83v-3l11-1.66Z" /></svg>
              </button>
              <button id="whiteNoiseSettingsButton" type="button" class="white-noise-option ariaLabel" aria-label="${htmlText.settings}" title="${htmlText.settings}">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.07-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.12 7.12 0 0 0-1.63-.94L14.5 2.78A.49.49 0 0 0 14 2.4h-4a.49.49 0 0 0-.49.38l-.36 2.54c-.59.24-1.13.55-1.63.94l-2.39-.96a.49.49 0 0 0-.61.22L2.6 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.08.63-.08.94s.03.63.08.94L2.72 14.52a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.31.61.22l2.39-.96c.5.39 1.04.71 1.63.94l.36 2.54c.04.24.24.42.49.42h4c.25 0 .46-.18.5-.42l.36-2.54c.59-.24 1.13-.55 1.63-.94l2.39.96c.22.09.48 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.04-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z" /></svg>
              </button>
            </div>
            <div id="whiteNoiseVolumeRow" class="white-noise-volume" hidden>
              <span aria-hidden="true">🔊</span>
              <input id="whiteNoiseVolume" type="range" min="0" max="1" step="0.1" value="0.3" aria-label="${htmlText.whiteNoise}" />
              <span id="whiteNoiseVolumeValue">30%</span>
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
      iconBaseUrl: '',
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
    const progressTrackEl = document.getElementById('progressTrack');
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
    const whiteNoiseToggleEl = document.getElementById('whiteNoiseToggle');
    const whiteNoiseOptionsEl = document.getElementById('whiteNoiseOptions');
    const customWhiteNoiseButtonEl = document.getElementById('customWhiteNoiseButton');
    const whiteNoiseSettingsButtonEl = document.getElementById('whiteNoiseSettingsButton');
    const whiteNoiseVolumeRowEl = document.getElementById('whiteNoiseVolumeRow');
    const whiteNoiseVolumeEl = document.getElementById('whiteNoiseVolume');
    const whiteNoiseVolumeValueEl = document.getElementById('whiteNoiseVolumeValue');
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
    let reportedSettingsExpanded = null;
    let reportedCapsuleCompact = null;
    let reportedCapsuleProgressOnly = null;

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
    const whiteNoiseIcons = { rain: 'rain', jungle: 'jungle', waves: 'waves', campfire: 'campfire', river: 'river' };
    Array.from(whiteNoiseOptionsEl.querySelectorAll('[data-sound]')).forEach((button) => {
      const soundId = button.getAttribute('data-sound');
      if (whiteNoiseIcons[soundId]) {
        button.innerHTML = iconMarkup(whiteNoiseIcons[soundId], 16, 16);
      }
    });

    function request(type, payload = {}) {
      return ipcRenderer.invoke(CHANNEL, { type, ...payload });
    }

    let completeSoundAudioContext = null;
    let customCompletionAudio = null;
    let microBreakAudio = null;
    let whiteNoiseAudio = null;
    let whiteNoiseEnabled = false;
    let selectedWhiteNoiseId = 'rain';
    let whiteNoiseVolume = 0.3;
    let customWhiteNoiseFile = '';
    const whiteNoiseFiles = {
      rain: 'rain.ogg',
      jungle: 'jungle.ogg',
      waves: 'waves.ogg',
      campfire: 'campfire.ogg',
      river: 'river.ogg'
    };

    function persistWhiteNoiseSettings() {
      void request('update-white-noise-settings', {
        whiteNoiseEnabled,
        selectedWhiteNoiseId,
        whiteNoiseVolume
      });
    }
    const storedAudioUrls = new Map();

    async function getStoredAudioUrl(path) {
      if (!path) return '';
      if (!storedAudioUrls.has(path)) {
        storedAudioUrls.set(path, fetch((state.iconBaseUrl || '') + '/api/file/getFile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: '/data/storage/petal/pinch/audio/' + path })
        }).then(async (response) => {
          if (!response.ok) return '';
          const blob = await response.blob();
          return blob.size > 0 ? URL.createObjectURL(blob) : '';
        }).catch(() => ''));
      }
      return storedAudioUrls.get(path);
    }

    function stopWhiteNoise() {
      if (!whiteNoiseAudio) return;
      whiteNoiseAudio.pause();
      whiteNoiseAudio.currentTime = 0;
      whiteNoiseAudio = null;
    }

    async function getSelectedWhiteNoiseSource() {
      return selectedWhiteNoiseId === 'custom'
        ? getStoredAudioUrl(customWhiteNoiseFile || '')
        : (whiteNoiseFiles[selectedWhiteNoiseId] ? getStoredAudioUrl(whiteNoiseFiles[selectedWhiteNoiseId]) : '');
    }

    async function playWhiteNoise() {
      if (!whiteNoiseEnabled) return;
      const source = await getSelectedWhiteNoiseSource();
      if (!source) return;
      const resolvedSource = new URL(source, document.baseURI).href;
      if (!whiteNoiseAudio || whiteNoiseAudio.src !== resolvedSource) {
        stopWhiteNoise();
        whiteNoiseAudio = new Audio(source);
        whiteNoiseAudio.preload = 'auto';
        whiteNoiseAudio.loop = true;
      }
      whiteNoiseAudio.muted = false;
      whiteNoiseAudio.volume = selectedWhiteNoiseId === 'custom' && Number.isFinite(microBreakSettings?.customWhiteNoiseVolume)
        ? Math.max(0, Math.min(microBreakSettings.customWhiteNoiseVolume, 1))
        : whiteNoiseVolume;
      whiteNoiseAudio.play().catch(() => {});
    }

    function renderWhiteNoise() {
      if (!whiteNoiseToggleEl) return;
      whiteNoiseToggleEl.checked = whiteNoiseEnabled;
      whiteNoiseOptionsEl.classList.toggle('is-disabled', !whiteNoiseEnabled);
      Array.from(whiteNoiseOptionsEl.querySelectorAll('[data-sound]')).forEach((button) => {
        const soundId = button.getAttribute('data-sound');
        button.disabled = !whiteNoiseEnabled;
        button.classList.toggle('is-active', soundId === selectedWhiteNoiseId);
      });
      customWhiteNoiseButtonEl.disabled = !whiteNoiseEnabled;
      whiteNoiseVolumeRowEl.hidden = !whiteNoiseEnabled;
      whiteNoiseVolumeEl.value = String(whiteNoiseVolume);
      whiteNoiseVolumeValueEl.textContent = Math.round(whiteNoiseVolume * 100) + '%';
    }

    async function prepareCustomCompletionSound(fileName) {
      if (!fileName) return;
      const source = await getStoredAudioUrl(fileName);
      if (!source) return;
      customCompletionAudio = new Audio(source);
      customCompletionAudio.preload = 'auto';
      customCompletionAudio.muted = true;
      customCompletionAudio.play().then(() => {
        customCompletionAudio.pause();
        customCompletionAudio.currentTime = 0;
        customCompletionAudio.muted = false;
      }).catch(() => {
        if (customCompletionAudio) customCompletionAudio.muted = false;
      });
    }

    async function getMicroBreakSoundSource(fileName) {
      return fileName
        ? getStoredAudioUrl(fileName)
        : (state.iconBaseUrl || '') + '/plugins/pinch/audio/correct.mp3';
    }

    async function getMicroBreakAudio(fileName) {
      const source = await getMicroBreakSoundSource(fileName);
      if (!source) return null;
      const resolvedSource = new URL(source, document.baseURI).href;
      if (!microBreakAudio || microBreakAudio.src !== resolvedSource) {
        microBreakAudio = new Audio(source);
        microBreakAudio.preload = 'auto';
      }
      return microBreakAudio;
    }

    async function prepareMicroBreakSound(fileName) {
      const audio = await getMicroBreakAudio(fileName);
      if (!audio) return;
      audio.muted = true;
      audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
      }).catch(() => {
        audio.muted = false;
      });
    }

    async function playMicroBreakSound(settings) {
      if (settings.microBreakSound === false) return;
      try {
        const audio = await getMicroBreakAudio(settings.customMicroBreakSoundFile);
        if (!audio) return;
        audio.muted = false;
        audio.volume = Number.isFinite(settings.customMicroBreakSoundVolume)
          ? Math.max(0, Math.min(settings.customMicroBreakSoundVolume, 1))
          : 0.3;
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } catch {}
    }

    async function prepareCompleteSound() {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!completeSoundAudioContext) {
        completeSoundAudioContext = new AudioContextClass();
      }
      if (completeSoundAudioContext.state === 'suspended') {
        await completeSoundAudioContext.resume();
      }
    }

    async function playCompleteSound() {
      try {
        if (customCompletionAudio) {
          customCompletionAudio.muted = false;
          customCompletionAudio.volume = Number.isFinite(microBreakSettings?.customCompletionSoundVolume)
            ? Math.max(0, Math.min(microBreakSettings.customCompletionSoundVolume, 1))
            : 0.3;
          customCompletionAudio.currentTime = 0;
          await customCompletionAudio.play();
          return;
        }
        await prepareCompleteSound();
        if (!completeSoundAudioContext) return;
        const playTone = (frequency, startTime, duration) => {
          const oscillator = completeSoundAudioContext.createOscillator();
          const gain = completeSoundAudioContext.createGain();
          oscillator.connect(gain);
          gain.connect(completeSoundAudioContext.destination);
          oscillator.type = 'sine';
          oscillator.frequency.value = frequency;
          gain.gain.setValueAtTime(0.2, startTime);
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
          oscillator.start(startTime);
          oscillator.stop(startTime + duration);
        };
        const now = completeSoundAudioContext.currentTime;
        playTone(523.25, now, 0.2);
        playTone(659.25, now + 0.15, 0.2);
        playTone(783.99, now + 0.3, 0.3);
      } catch {}
    }

    let microBreakSettings = null;
    let microBreakDeadline = 0;
    let microBreakEndDeadline = 0;
    let microBreakActive = false;
    let microBreakScheduleToken = 0;

    function stopMicroBreakReminder() {
      microBreakScheduleToken += 1;
      microBreakDeadline = 0;
      microBreakEndDeadline = 0;
      microBreakActive = false;
      request('hide-micro-break-dialog').catch(() => {});
    }

    function scheduleNextMicroBreak(settings) {
      if (!state.isRunning || state.isBreakMode || settings.microBreakEnabled !== true) {
        return;
      }
      const min = Math.max(1, Number(settings.microBreakMinIntervalMinutes) || 3);
      const max = Math.max(min, Number(settings.microBreakMaxIntervalMinutes) || 5);
      microBreakDeadline = Date.now() + (min + Math.random() * (max - min)) * 60 * 1000;
    }

    function triggerMicroBreakReminder(settings) {
      if (!state.isRunning || state.isBreakMode || settings.microBreakEnabled !== true) {
        return;
      }
      playMicroBreakSound(settings);
      if (settings.microBreakPopup === false) {
        scheduleNextMicroBreak(settings);
        return;
      }
      const duration = Math.max(1, Number(settings.microBreakDurationSeconds) || 10);
      microBreakActive = true;
      microBreakEndDeadline = Date.now() + duration * 1000;
      request('show-micro-break-dialog', { duration }).catch(() => {});
    }

    function tickMicroBreakReminder() {
      const settings = microBreakSettings || {};
      if (settings.microBreakEnabled !== true || !state.isRunning || state.isBreakMode) {
        return;
      }
      const now = Date.now();
      if (microBreakActive) {
        if (now < microBreakEndDeadline) return;
        microBreakActive = false;
        microBreakEndDeadline = 0;
        request('hide-micro-break-dialog').catch(() => {});
        playMicroBreakSound(settings);
        scheduleNextMicroBreak(settings);
        return;
      }
      if (microBreakDeadline > 0 && now >= microBreakDeadline) {
        microBreakDeadline = 0;
        triggerMicroBreakReminder(settings);
      }
    }

    async function startMicroBreakReminder(settingsOverride = null) {
      stopMicroBreakReminder();
      const scheduleToken = microBreakScheduleToken;
      if (settingsOverride && typeof settingsOverride === 'object') {
        microBreakSettings = settingsOverride;
      } else {
        try {
          microBreakSettings = await request('get-micro-break-settings');
        } catch {
          microBreakSettings = null;
        }
      }
      const settings = microBreakSettings || {};
      prepareCustomCompletionSound(settings.customCompletionSoundFile);
      prepareMicroBreakSound(settings.customMicroBreakSoundFile);
      if (scheduleToken !== microBreakScheduleToken || settings.microBreakEnabled !== true || !state.isRunning || state.isBreakMode) {
        return;
      }
      scheduleNextMicroBreak(settings);
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

    function isImageIcon(icon) {
      if (typeof icon !== 'string') {
        return false;
      }

      const value = icon.trim();
      return /^(?:https?:)?\\/\\//i.test(value)
        || /^data:image\\//i.test(value)
        || /^(?:\\.?\\.?\\/|\\/)?(?:api\\/icon\\/|assets\\/|emojis\\/)/i.test(value)
        || /\\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i.test(value);
    }

    function renderTargetIcon(container, target) {
      const icon = getTargetEmoji(target);
      container.replaceChildren();

      if (!isImageIcon(icon)) {
        container.textContent = icon;
        return;
      }

      const image = document.createElement('img');
      image.src = state.iconBaseUrl && !/^(?:https?:)?\\/\\//i.test(icon) && !/^data:/i.test(icon)
        ? new URL(icon, state.iconBaseUrl).toString()
        : icon;
      image.alt = '';
      image.style.cssText = 'display:block;width:1em;height:1em;object-fit:contain';
      container.appendChild(image);
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

      return options.filter((target) => String(target.searchText || target.name || '').toLowerCase().includes(keyword));
    }

    function closeTargetPicker() {
      state.targetPickerMode = null;
      state.targetSearch = '';
      state.targetOptionsError = '';
      if (targetSearchInputEl) {
        targetSearchInputEl.value = '';
      }
    }

    function applyFocusSettings(nextSettings) {
      if (!nextSettings || typeof nextSettings !== 'object') {
        return;
      }
      const nextSnapshot = JSON.stringify(nextSettings);
      if (nextSnapshot === JSON.stringify(microBreakSettings)) {
        return;
      }
      microBreakSettings = nextSettings;
      customWhiteNoiseFile = typeof nextSettings.customWhiteNoiseFile === 'string'
        ? nextSettings.customWhiteNoiseFile
        : '';
      if (typeof nextSettings.whiteNoiseEnabled === 'boolean') {
        whiteNoiseEnabled = nextSettings.whiteNoiseEnabled;
      }
      if (typeof nextSettings.selectedWhiteNoiseId === 'string') {
        selectedWhiteNoiseId = nextSettings.selectedWhiteNoiseId;
      }
      if (Number.isFinite(nextSettings.whiteNoiseVolume)) {
        whiteNoiseVolume = Math.max(0, Math.min(nextSettings.whiteNoiseVolume, 1));
      }
      renderWhiteNoise();
      if (state.isRunning && !state.isBreakMode) {
        void startMicroBreakReminder(microBreakSettings);
      }
    }

    function openSettingsPanel() {
      closeTargetPicker();
      state.showSettings = true;
      render();
    }

    function buildHandoffState() {
      return {
        timerMode: state.timerMode,
        selectedDuration: state.selectedDuration,
        durationIndex: state.durationIndex,
        shortBreakDuration: state.shortBreakDuration,
        shortBreakDurationIndex: state.shortBreakDurationIndex,
        pomodoroSets: state.pomodoroSets,
        phaseElapsedSeconds: state.phaseElapsedSeconds,
        isRunning: state.isRunning,
        isPaused: state.isPaused,
        isBreakMode: state.isBreakMode,
        currentSet: state.currentSet,
        countupSessionId: state.countupSessionId,
        savedCountupMinutes: state.savedCountupMinutes,
        whiteNoiseEnabled,
        selectedWhiteNoiseId,
        whiteNoiseVolume,
        microBreakSettings,
        linkedTarget: state.linkedTarget || null
      };
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
      whiteNoiseEnabled = handoffState.whiteNoiseEnabled === true;
      selectedWhiteNoiseId = typeof handoffState.selectedWhiteNoiseId === 'string'
        ? handoffState.selectedWhiteNoiseId
        : 'rain';
      whiteNoiseVolume = Number.isFinite(handoffState.whiteNoiseVolume)
        ? Math.max(0, Math.min(handoffState.whiteNoiseVolume, 1))
        : 0.3;
      applyFocusSettings(handoffState.microBreakSettings);
      state.linkedTarget = handoffState.linkedTarget || null;
      state.showSettings = false;
      closeTargetPicker();

      if (state.isRunning || state.isPaused) {
        void request('claim-focus-session', { owner: 'capsule' });
      }

      if (state.isRunning) {
        playWhiteNoise();
        void startMicroBreakReminder(microBreakSettings);
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
        renderTargetIcon(emoji, target);

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
      const compact = !state.linkedTarget && !active;
      const progressOnly = !state.linkedTarget && active;
      capsuleEl.classList.toggle('is-compact', compact);
      capsuleEl.classList.toggle('is-progress-only', progressOnly);
      capsuleEl.classList.toggle('has-linked-target', !!state.linkedTarget);
      if (reportedCapsuleCompact !== compact) {
        reportedCapsuleCompact = compact;
        request('set-compact', { compact: compact }).catch(() => {});
      }
      if (reportedCapsuleProgressOnly !== progressOnly) {
        reportedCapsuleProgressOnly = progressOnly;
        request('set-progress-only', { progressOnly: progressOnly }).catch(() => {});
      }
      const pomodoroSettingsLocked = active || state.timerMode === 'countup';
      const label = linkedTargetLabel();
      const blocked = isLockedByOther() && !active;
      const actionTitle = blocked
        ? I18N.panelFocusRunning
        : (state.isRunning ? I18N.pause : (state.isPaused ? I18N.continueFocus : I18N.startFocus));

      durationButtonEl.hidden = active;
      durationButtonEl.textContent = state.timerMode === 'countup' ? '00:00' : String(state.selectedDuration).padStart(2, '0') + ':00';
      durationButtonEl.disabled = active;
      durationButtonEl.title = I18N.cycleDuration;
      settingsToggleEl.setAttribute('aria-expanded', state.showSettings ? 'true' : 'false');
      settingsToggleEl.hidden = active;
      progressTrackEl.hidden = !state.linkedTarget && !active;

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
        linkedTargetChipEl.setAttribute('aria-label', canOpenLinkedTarget() ? I18N.openTargetPrefix + label : (label || I18N.linkedTarget));
      }
      if (linkedTargetEmojiEl) {
        renderTargetIcon(linkedTargetEmojiEl, state.linkedTarget);
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
      actionButtonEl.setAttribute('aria-label', actionTitle);
      if (blocked) {
        actionButtonEl.setAttribute('aria-label', I18N.focusAlreadyRunning);
      } else if (active) {
        actionButtonEl.setAttribute('aria-label', I18N.stop);
      } else {
        actionButtonEl.setAttribute('aria-label', I18N.startFocus);
      }
      if (state.isRunning) {
        actionButtonEl.setAttribute('aria-label', I18N.pause);
      } else if (state.isPaused) {
        actionButtonEl.setAttribute('aria-label', I18N.continueFocus);
      }

      stopButtonEl.hidden = !active;
      stopButtonEl.innerHTML = iconMarkup('stop', 12, 12);
      const normalizedActionTitle = blocked
        ? I18N.focusAlreadyRunning
        : (state.isRunning
          ? I18N.pause
          : (state.isPaused ? I18N.continueFocus : I18N.startFocus));
      actionButtonEl.setAttribute('aria-label', normalizedActionTitle);
      stopButtonEl.hidden = !active;
      stopButtonEl.style.display = active ? '' : 'none';
      stopButtonEl.setAttribute('aria-label', I18N.stop);

      const total = phaseDurationSeconds();
      const elapsed = total > 0 ? Math.min(Math.max(state.phaseElapsedSeconds, 0), total) : 0;
      capsuleEl.style.setProperty('--progress', String(total > 0 ? elapsed / total : 0));
      capsuleEl.style.setProperty('--progress-color', state.isBreakMode ? 'var(--pinch-break-accent)' : 'var(--pinch-focus-accent)');

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
      if (reportedSettingsExpanded !== state.showSettings) {
        reportedSettingsExpanded = state.showSettings;
        request('set-expanded', { expanded: state.showSettings }).catch(() => {});
      }
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

    async function completeLinkedTarget() {
      if (!state.linkedTarget) {
        return;
      }
      await request('complete-linked-target', {
        target: state.linkedTarget
      });
    }

    function showShortBreakPopup() {
      const settings = microBreakSettings || {};
      if (settings.shortBreakPopup !== true) return;
      const duration = Math.max(1, Math.round((Number(state.shortBreakDuration) || 1) * 60));
      request('show-micro-break-dialog', {
        duration,
        title: I18N.shortBreakActiveTitle,
        body: I18N.shortBreakActiveBody
      }).catch(() => {});
    }

    function showFocusCompletePopup() {
      const settings = microBreakSettings || {};
      if (settings.focusCompletePopup !== true) return;
      request('show-micro-break-dialog', {
        duration: 10,
        title: I18N.focusCompletePopupTitle,
        body: I18N.focusCompletePopupBody
      }).catch(() => {});
    }

    async function completeTimer() {
      void playCompleteSound();
      if (!state.isBreakMode) {
        try {
          await recordFocusSession(state.selectedDuration);
        } catch {}
        try {
          await completeLinkedTarget();
        } catch {}

        if (state.currentSet < state.pomodoroSets && state.pomodoroSets >= 2) {
          state.isBreakMode = true;
          resetPhaseProgress();
          state.currentSet += 1;
          showShortBreakPopup();
          startPhaseTimer();
          render();
          return;
        }

        await stopTimer(false);
        showFocusCompletePopup();
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
          tickMicroBreakReminder();
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
          tickMicroBreakReminder();
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
      void prepareCompleteSound();
      prepareMicroBreakSound();
      if (!whiteNoiseAudio || whiteNoiseAudio.paused) playWhiteNoise();
      void startMicroBreakReminder(microBreakSettings);
      startPhaseTimer();
      render();
    }

    function pauseTimer() {
      if (!state.isRunning) {
        return;
      }
      void saveCountupCheckpoint(false);
      clearTimer();
      stopMicroBreakReminder();
      stopWhiteNoise();
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
      void prepareCompleteSound();
      prepareMicroBreakSound();
      playWhiteNoise();
      void startMicroBreakReminder(microBreakSettings);
      startPhaseTimer();
      render();
    }

    async function stopTimer(recordCurrentSession = false) {
      const elapsedMinutes = recordCurrentSession ? getElapsedFocusMinutes() : 0;
      clearTimer();
      stopMicroBreakReminder();
      stopWhiteNoise();
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
      state.iconBaseUrl = hostState.iconBaseUrl || state.iconBaseUrl;
      applyTheme(hostState.theme);
      applyFocusSettings(hostState.focusSettings);
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
    window.__PINCH_DETACHED_FOCUS_GET_HANDOFF__ = buildHandoffState;
    window.__PINCH_DETACHED_FOCUS_HANDOFF__ = acceptPanelHandoff;
    window.__PINCH_DETACHED_FOCUS_UPDATE_SETTINGS__ = applyFocusSettings;
    window.__PINCH_DETACHED_FOCUS_CANCEL_MICRO_BREAK__ = () => {
      if (!microBreakActive) return;
      microBreakActive = false;
      microBreakEndDeadline = 0;
      scheduleNextMicroBreak(microBreakSettings || {});
    };

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
      if (isActive() && !window.confirm(I18N.miniExitConfirm)) {
        return;
      }
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

    whiteNoiseToggleEl.addEventListener('change', () => {
      whiteNoiseEnabled = whiteNoiseToggleEl.checked;
      if (!whiteNoiseEnabled) stopWhiteNoise();
      else if (state.isRunning) playWhiteNoise();
      renderWhiteNoise();
      persistWhiteNoiseSettings();
    });

    whiteNoiseOptionsEl.addEventListener('click', (event) => {
      const button = event.target.closest('[data-sound]');
      if (!button || !whiteNoiseEnabled) return;
      selectedWhiteNoiseId = button.getAttribute('data-sound') || 'rain';
      if (state.isRunning) playWhiteNoise();
      renderWhiteNoise();
      persistWhiteNoiseSettings();
    });

    whiteNoiseSettingsButtonEl.addEventListener('click', (event) => {
      event.preventDefault();
      void request('open-focus-settings');
    });

    whiteNoiseVolumeEl.addEventListener('input', () => {
      whiteNoiseVolume = Number(whiteNoiseVolumeEl.value);
      if (whiteNoiseAudio) whiteNoiseAudio.volume = whiteNoiseVolume;
      renderWhiteNoise();
      persistWhiteNoiseSettings();
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
      stopWhiteNoise();
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
  syncDetachedFocusWindowFocusSettings(state.microBreakSettings);
  pendingDetachedFocusHandoff = state;
  flushDetachedFocusHandoff();
}

export async function takeDetachedFocusSessionHandoff(): Promise<FocusTimerHandoffState | null> {
  if (!detachedFocusWindow || detachedFocusWindow.isDestroyed?.()) {
    detachedFocusWindow = null;
    detachedFocusWindowExpanded = false;
    return null;
  }

  const webContents = detachedFocusWindow.webContents;
  if (typeof webContents?.executeJavaScript !== 'function') {
    closeDetachedFocusWindow();
    return null;
  }

  try {
    const handoffState = await webContents.executeJavaScript(
      'window.__PINCH_DETACHED_FOCUS_GET_HANDOFF__?.() ?? null'
    );
    closeDetachedFocusWindow();
    return handoffState && typeof handoffState === 'object'
      ? handoffState as FocusTimerHandoffState
      : null;
  } catch {
    closeDetachedFocusWindow();
    return null;
  }
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
    : (detachedFocusWindowCompact
      ? DETACHED_FOCUS_WINDOW_COMPACT_HEIGHT
      : (detachedFocusWindowProgressOnly
        ? DETACHED_FOCUS_WINDOW_PROGRESS_ONLY_HEIGHT
        : DETACHED_FOCUS_WINDOW_COLLAPSED_HEIGHT));
  const nextWidth = expanded
    ? DETACHED_FOCUS_WINDOW_EXPANDED_WIDTH
    : DETACHED_FOCUS_WINDOW_WIDTH;
  if (bounds.height === nextHeight && bounds.width === nextWidth) {
    return;
  }

  // The expanded popover occupies a larger window. Preserve the exact collapsed
  // position and restore it directly rather than deriving it from resize bounds:
  // transparent frameless windows can report dimensions at different stages of a
  // resize, which otherwise produces a small positional drift after each click.
  if (expanded) {
    detachedFocusWindowCollapsedPosition = { x: bounds.x, y: bounds.y };
  }
  const nextX = expanded
    ? bounds.x + (bounds.width - nextWidth)
    : (detachedFocusWindowCollapsedPosition?.x ?? bounds.x + (bounds.width - nextWidth));
  const nextY = expanded
    ? bounds.y + (bounds.height - nextHeight)
    : (detachedFocusWindowCollapsedPosition?.y ?? bounds.y + (bounds.height - nextHeight));

  detachedFocusWindow.setBounds?.({
    x: nextX,
    y: nextY,
    width: nextWidth,
    height: nextHeight
  }, false);
  if (!expanded) {
    detachedFocusWindowCollapsedPosition = null;
  }
}

function setDetachedFocusWindowCompact(compact: boolean): void {
  detachedFocusWindowCompact = compact;
  if (!detachedFocusWindowExpanded) {
    setDetachedFocusWindowExpanded(false);
  }
}

function setDetachedFocusWindowProgressOnly(progressOnly: boolean): void {
  detachedFocusWindowProgressOnly = progressOnly;
  if (!detachedFocusWindowExpanded) {
    setDetachedFocusWindowExpanded(false);
  }
}

async function handleDetachedFocusRequest(_event: unknown, request?: DetachedFocusRequest): Promise<unknown> {
  if (!request || typeof request !== 'object') {
    return null;
  }

  switch (request.type) {
    case 'get-micro-break-settings': {
      const settings = await userSettings.load();
      return settings.focus;
    }
    case 'show-micro-break-dialog': {
      const remote = getRemote();
      if (!remote) {
        return false;
      }
      if (detachedMicroBreakWindow && !detachedMicroBreakWindow.isDestroyed?.()) {
        closeBrowserWindow(detachedMicroBreakWindow);
      }
      const theme = latestThemeSnapshot || getThemeSnapshot();
      const duration = Math.max(1, Math.floor(request.duration || DEFAULT_SETTINGS.focus.microBreakDurationSeconds || 10));
      const hostBounds = getMicroBreakHostBounds(remote);
      const width = Math.max(320, Math.round(hostBounds.width));
      const height = Math.max(240, Math.round(hostBounds.height));
      const requestedTitle = typeof request.title === 'string' ? request.title.trim() : '';
      const requestedBody = typeof request.body === 'string' ? request.body.trim() : '';
      const variant = request.variant || 'micro-break';
      const title = escapeHtml(requestedTitle || translate('focusTimer.microBreakActiveTitle'));
      const body = escapeHtml(requestedBody || translate('focusTimer.microBreakActiveBody'));
      const secondSuffix = escapeHtml(translate('focusTimer.secondSuffix'));
      const awardImageUrl = new URL('/plugins/pinch/images/award.png', window.location.origin).toString();
      const teaImageUrl = new URL('/plugins/pinch/images/tea.png', window.location.origin).toString();
      const randomImageUrl = new URL('/plugins/pinch/images/random.png', window.location.origin).toString();
      const celebration = variant === 'focus-complete'
        ? `<style>.celebration{position:absolute!important;inset:0!important;width:auto!important;height:auto!important;margin:0!important;overflow:hidden;pointer-events:none;z-index:1}.celebration__halo{position:absolute!important;inset:auto!important;top:calc(50% - 56px)!important;left:calc(50% - 56px)!important;width:112px!important;height:112px!important}.celebration__mark{position:absolute!important;inset:auto!important;top:calc(50% - 65px)!important;left:calc(50% - 65px)!important;width:130px!important;height:130px!important}.celebration i{top:-28px!important;left:var(--x)!important;margin-left:0!important;width:var(--w)!important;height:var(--h)!important;background:var(--c)!important;animation:full-confetti var(--dur) linear var(--d) infinite!important}@keyframes full-confetti{0%{opacity:0;transform:translate3d(0,-20px,0) rotate(0deg)}8%,88%{opacity:.9}100%{opacity:0;transform:translate3d(var(--drift),calc(65vh + 36px),0) rotate(var(--turn))}}</style><div class="celebration" aria-hidden="true"><div class="celebration__halo"></div><div class="celebration__mark">✦</div>${Array.from({ length: 28 }, (_, index) => { const colors = ['#d0a06c', '#e7cf9c', '#bd8a5d', '#f1dfbd']; const x = 3 + ((index * 37) % 94); const drift = ((index * 43) % 120) - 60; const delay = ((index * 37) % 600) / 100; const duration = 4.2 + ((index * 13) % 25) / 10; const width = 4 + (index % 3); const height = 12 + ((index * 7) % 12); const turn = 160 + ((index * 47) % 240); return `<i style="--x:${x}%;--drift:${drift}px;--d:-${delay}s;--dur:${duration}s;--w:${width}px;--h:${height}px;--turn:${turn}deg;--c:${colors[index % colors.length]}"></i>`; }).join('')}</div>`
        : '';
      const html = `<!doctype html><html><head><meta charset="utf-8"><style>:root{--accent:#7ba8a3;--accent-rgb:123,168,163}body[data-variant="short-break"]{--accent:#8ea7d1;--accent-rgb:142,167,209}body[data-variant="focus-complete"]{--accent:#d0a06c;--accent-rgb:208,160,108}body{margin:0;display:grid;place-items:center;min-height:100vh;overflow:hidden;background:rgba(0,0,0,.5);font-family:${theme.fontFamily};}body::before{content:"";position:fixed;width:46vw;height:46vw;border-radius:50%;background:radial-gradient(circle,rgba(var(--accent-rgb),.22),transparent 68%);filter:blur(18px);animation:breathe 5s ease-in-out infinite;pointer-events:none}main{box-sizing:border-box;position:relative;width:80vw;height:65vh;overflow:hidden;padding:24px;border:1px solid rgba(var(--accent-rgb),.38);border-radius:16px;background:linear-gradient(135deg,rgba(var(--accent-rgb),.09),transparent 42%),${theme.background};box-shadow:0 24px 70px rgba(0,0,0,.3),${theme.shadow};text-align:center;color:${theme.text};display:grid;place-content:center}main::before{content:"";position:absolute;inset:22px;border:1px solid rgba(var(--accent-rgb),.18);border-radius:10px;pointer-events:none}section{position:relative;max-width:420px;padding:36px}button{position:absolute;z-index:2;top:20px;right:20px;width:32px;height:32px;border:1px solid transparent;border-radius:50%;background:transparent;color:${theme.subtleText};font-size:22px;line-height:1;cursor:pointer}button:hover{border-color:rgba(var(--accent-rgb),.35);background:rgba(var(--accent-rgb),.1);color:${theme.text}}h1{margin:0;color:var(--accent);font-size:20px;font-weight:600;letter-spacing:.12em}p{margin:14px 0 0;color:${theme.subtleText};font-size:14px;letter-spacing:.04em;line-height:1.7}strong{display:inline-block;margin-top:28px;padding:11px 20px;border:1px solid rgba(var(--accent-rgb),.35);border-radius:999px;background:rgba(var(--accent-rgb),.1);color:var(--accent);font-size:30px;font-weight:500;font-variant-numeric:tabular-nums;letter-spacing:.06em}.celebration{position:relative;width:130px;height:112px;margin:0 auto 18px}.celebration__halo{position:absolute;inset:10px;border:1px solid rgba(var(--accent-rgb),.34);border-radius:50%;box-shadow:0 0 32px rgba(var(--accent-rgb),.24);animation:halo 2.8s ease-in-out infinite}.celebration__mark{position:absolute;inset:0;display:grid;place-items:center;color:var(--accent);font-size:64px;line-height:1;text-shadow:0 3px 16px rgba(var(--accent-rgb),.35);animation:mark 2.8s ease-in-out infinite}.celebration i{position:absolute;top:-12px;left:50%;width:5px;height:14px;border-radius:4px;background:var(--accent);opacity:0;animation:confetti 2.9s cubic-bezier(.2,.7,.2,1) infinite}.celebration i:nth-of-type(1){margin-left:-58px;animation-delay:.1s;transform:rotate(18deg)}.celebration i:nth-of-type(2){margin-left:-38px;background:#e7cf9c;animation-delay:.48s;transform:rotate(-24deg)}.celebration i:nth-of-type(3){margin-left:-16px;animation-delay:.22s;transform:rotate(33deg)}.celebration i:nth-of-type(4){margin-left:8px;background:#e7cf9c;animation-delay:.7s;transform:rotate(-15deg)}.celebration i:nth-of-type(5){margin-left:31px;animation-delay:.35s;transform:rotate(28deg)}.celebration i:nth-of-type(6){margin-left:51px;background:#e7cf9c;animation-delay:.88s;transform:rotate(-31deg)}.celebration i:nth-of-type(7){margin-left:-5px;animation-delay:1.1s;transform:rotate(13deg)}.celebration i:nth-of-type(8){margin-left:21px;background:#e7cf9c;animation-delay:1.35s;transform:rotate(-20deg)}@keyframes breathe{50%{transform:scale(1.12);opacity:.74}}@keyframes halo{50%{transform:scale(1.12);opacity:.45}}@keyframes mark{50%{transform:translateY(-5px) scale(1.04)}}@keyframes confetti{10%{opacity:1}85%{opacity:1}100%{top:105px;opacity:0;transform:translateX(var(--drift,0)) rotate(210deg)}}</style></head><body data-variant="${variant}"><main><button id="close" type="button" aria-label="${escapeHtml(translate('common.close'))}" title="${escapeHtml(translate('common.close'))}">×</button><section>${celebration}<h1>${title}</h1><p>${body}</p><strong id="count">${duration}${secondSuffix}</strong></section></main><script>const {ipcRenderer}=require('electron');const channel=${serializeForScript(DETACHED_FOCUS_REQUEST_CHANNEL)};document.getElementById('close').addEventListener('click',()=>{ipcRenderer.invoke(channel,{type:'cancel-micro-break'}).catch(()=>{});window.close()});let n=${duration};setInterval(()=>{n-=1;document.getElementById('count').textContent=n+'${secondSuffix}';if(n<=0)window.close()},1000)</script></body></html>`;
      const imageSlot = variant === 'focus-complete'
        ? `<img class="focus-complete-award" src="${escapeHtml(awardImageUrl)}" alt="" />`
        : variant === 'short-break'
          ? `<img class="focus-short-break-image" src="${escapeHtml(teaImageUrl)}" alt="" />`
          : variant === 'micro-break'
            ? `<img class="focus-micro-break-image" src="${escapeHtml(randomImageUrl)}" alt="" />`
            : '<div class="focus-popup-image-slot" aria-hidden="true"></div>';
      const contentHtml = html.replace(`<h1>${title}</h1>`, `${imageSlot}<h1>${title}</h1>`);
      const layoutHtml = variant === 'focus-complete'
        ? contentHtml.replace(`<section>${celebration}`, `${celebration}<section>`)
        : contentHtml;
      const renderedHtml = variant === 'focus-complete'
        ? layoutHtml.replace('</head>', '<style>main{width:90vw!important;height:78vh!important;place-items:center!important}.celebration__halo,.celebration__mark{display:none!important}section{box-sizing:border-box;width:min(760px,calc(100% - 96px))!important;text-align:center!important;justify-self:center!important;align-self:center!important}h1,p,strong{width:100%;box-sizing:border-box;text-align:center!important}h1{font-size:40px!important}p{font-size:28px!important}strong{display:inline-block;width:auto;font-size:60px!important}button{font-size:44px!important}@keyframes full-confetti{0%{opacity:0;transform:translate3d(0,-20px,0) rotate(0deg)}8%,88%{opacity:.9}100%{opacity:0;transform:translate3d(var(--drift),calc(78vh + 36px),0) rotate(var(--turn))}}</style></head>')
        : layoutHtml;
      const alignedHtml = renderedHtml.replace('</head>', '<style>main{width:90vw!important;height:78vh!important;place-items:center!important}main::before{display:none!important}section{position:absolute!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%)!important;width:min(960px,calc(100% - 96px))!important;max-width:none!important;padding:0!important;text-align:center!important}.focus-complete-award,.focus-short-break-image,.focus-micro-break-image,.focus-popup-image-slot{display:block;width:300px;height:300px;object-fit:contain;margin:0 auto 24px}h1,p{white-space:nowrap!important;font-size:inherit}h1{font-size:40px!important}p{font-size:28px!important}strong{display:block!important;width:fit-content!important;margin-left:auto!important;margin-right:auto!important;font-size:60px!important}#close{width:36px!important;height:36px!important;font-size:28px!important;line-height:1!important}</style></head>');
      const expandedHtml = variant === 'focus-complete'
        ? alignedHtml.replace('</body>', `<script>(()=>{const host=document.querySelector('.celebration');const colors=['#d0a06c','#e7cf9c','#bd8a5d','#f1dfbd'];for(let i=0;i<44;i+=1){const piece=document.createElement('i');const x=1+((i*19)%98);const drift=((i*31)%150)-75;const delay=((i*23)%720)/100;const duration=4+((i*17)%30)/10;piece.style.cssText='--x:'+x+'%;--drift:'+drift+'px;--d:-'+delay+'s;--dur:'+duration+'s;--w:'+(3+i%4)+'px;--h:'+(10+(i*5)%15)+'px;--turn:'+(140+(i*29)%280)+'deg;--c:'+colors[i%colors.length];host.appendChild(piece)}})()</script></body>`)
        : alignedHtml;
      detachedMicroBreakWindow = new remote.BrowserWindow({
        x: hostBounds.x, y: hostBounds.y, width, height, frame: false, transparent: true,
        resizable: false, alwaysOnTop: true, skipTaskbar: true, show: false,
        webPreferences: { nodeIntegration: true, contextIsolation: false, backgroundThrottling: false }
      });
      detachedMicroBreakWindow.setAlwaysOnTop?.(true, 'screen-saver');
      detachedMicroBreakWindow.on?.('closed', () => { detachedMicroBreakWindow = null; });
      const loaded = detachedMicroBreakWindow.loadURL?.(`data:text/html;charset=UTF-8,${encodeURIComponent(expandedHtml)}`);
      Promise.resolve(loaded).then(() => detachedMicroBreakWindow?.showInactive?.()).catch(() => {});
      return true;
    }
    case 'hide-micro-break-dialog':
      closeBrowserWindow(detachedMicroBreakWindow);
      detachedMicroBreakWindow = null;
      return true;
    case 'cancel-micro-break':
      closeBrowserWindow(detachedMicroBreakWindow);
      detachedMicroBreakWindow = null;
      notifyDetachedMicroBreakCancel();
      detachedFocusWindow?.webContents?.executeJavaScript?.(
        'window.__PINCH_DETACHED_FOCUS_CANCEL_MICRO_BREAK__?.();',
        true
      ).catch(() => {});
      return true;
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
    case 'open-focus-settings':
      notifyDetachedFocusOpenSettingsRequest();
      return true;
    case 'update-white-noise-settings': {
      const updates = {
        ...(typeof request.whiteNoiseEnabled === 'boolean' ? { whiteNoiseEnabled: request.whiteNoiseEnabled } : {}),
        ...(typeof request.selectedWhiteNoiseId === 'string' ? { selectedWhiteNoiseId: request.selectedWhiteNoiseId } : {}),
        ...(Number.isFinite(request.whiteNoiseVolume) ? { whiteNoiseVolume: Math.max(0, Math.min(request.whiteNoiseVolume!, 1)) } : {})
      };
      await userSettings.update('focus', updates);
      const settings = await userSettings.get('focus');
      syncDetachedFocusWindowFocusSettings(settings);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pinch-focus-settings-updated', { detail: updates }));
      }
      return true;
    }
    case 'load-target-options':
      return loadFocusTargetOptions(request.mode === 'task' ? 'task' : 'habit');
    case 'set-linked-target':
      notifyDetachedFocusLinkedTargetChange(request.target ?? null);
      syncDetachedFocusWindowState();
      return true;
    case 'complete-linked-target':
      notifyDetachedFocusCompleteLinkedTarget(request.target || latestLinkedTarget);
      return true;
    case 'disable-floating-focus':
      notifyDetachedFocusDisableRequest();
      closeDetachedFocusWindowFromEvent(_event);
      return true;
    case 'set-expanded':
      setDetachedFocusWindowExpanded(request.expanded === true);
      return true;
    case 'set-compact':
      setDetachedFocusWindowCompact(request.compact === true);
      return true;
    case 'set-progress-only':
      setDetachedFocusWindowProgressOnly(request.progressOnly === true);
      return true;
    default:
      return null;
  }
}

export async function showDetachedMicroBreakWindow(
  duration: number,
  content: { title?: string; body?: string; variant?: 'micro-break' | 'short-break' | 'focus-complete' } = {}
): Promise<boolean> {
  return (await handleDetachedFocusRequest(null, {
    type: 'show-micro-break-dialog',
    duration,
    ...content
  })) === true;
}

export function hideDetachedMicroBreakWindow(): void {
  closeBrowserWindow(detachedMicroBreakWindow);
  detachedMicroBreakWindow = null;
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
    console.warn('[Pinch focus capsule] Cannot create detached window: @electron/remote is unavailable');
    return;
  }

  const defaultBounds = getDefaultDetachedWindowBounds();
  const initialBounds = getDetachedWindowBounds() ?? defaultBounds;
  const initialState = getDetachedFocusWindowState();

  detachedFocusWindowCompact = !latestLinkedTarget && !getActiveFocusSessionOwner();
  detachedFocusWindowProgressOnly = !latestLinkedTarget && !!getActiveFocusSessionOwner();
  detachedFocusWindowCollapsedPosition = null;
  detachedFocusWindowExpanded = initialBounds.height > DETACHED_FOCUS_WINDOW_COLLAPSED_HEIGHT;
  detachedFocusWindow = new remote.BrowserWindow({
    x: initialBounds.x,
    y: initialBounds.y,
    width: DETACHED_FOCUS_WINDOW_WIDTH,
    height: detachedFocusWindowExpanded
      ? DETACHED_FOCUS_WINDOW_EXPANDED_HEIGHT
      : (detachedFocusWindowCompact
        ? DETACHED_FOCUS_WINDOW_COMPACT_HEIGHT
        : (detachedFocusWindowProgressOnly
          ? DETACHED_FOCUS_WINDOW_PROGRESS_ONLY_HEIGHT
          : DETACHED_FOCUS_WINDOW_COLLAPSED_HEIGHT)),
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
  const loadResult = detachedFocusWindow.loadURL?.(
    `data:text/html;charset=UTF-8,${encodeURIComponent(buildDetachedFocusWindowHtmlV2(initialState))}`
  );
  Promise.resolve(loadResult).catch((error) => {
    console.error('[Pinch focus capsule] Failed to load detached focus window', error);
  });
  detachedFocusWindow.showInactive?.();
  if (!detachedFocusWindow.isVisible?.()) {
    detachedFocusWindow.show?.();
  }

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
    detachedFocusWindowCollapsedPosition = null;
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
    console.warn('[Pinch focus capsule] Detached focus window is not supported');
    return;
  }

  if (!enabled) {
    closeDetachedFocusWindow();
    return;
  }

  ensureDetachedFocusBridgeRegistered();
  void userSettings.load()
    .then(settings => {
      syncDetachedFocusWindowFocusSettings(settings.focus);
    })
    .catch(() => {});
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
