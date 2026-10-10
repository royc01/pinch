import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, reactive } from 'vue';
import { Plugin } from 'siyuan';
import type { DocumentTaskBadgeOptions } from '@/utils/userSettings';

const mocks = vi.hoisted(() => ({ loadGroups: vi.fn(), loadSettings: vi.fn() }));
const settings = reactive<{
  taskManager: { showDocumentTaskBadges: boolean; documentTaskBadgeOptions?: Partial<DocumentTaskBadgeOptions> }
}>({ taskManager: { showDocumentTaskBadges: true } });
vi.mock('@/api', () => ({ loadTaskGroups: mocks.loadGroups }));
vi.mock('@/composables/useUserSettings', () => ({
  useUserSettings: () => ({ data: settings, loadSettings: mocks.loadSettings })
}));

import { createDocumentTaskBadges } from './documentTaskBadges';
import { eventBus, Events } from '@/utils/eventBus';

class TestPlugin extends Plugin {}

function task(id: string, attrs = '', children = ''): string {
  return `<div data-type="NodeListItem" data-subtype="t" data-node-id="${id}" ${attrs}>
    <div data-type="NodeParagraph" data-node-id="${id}-paragraph">
      <div contenteditable="true"><div class="protyle-action--task"><svg><use href="#iconUncheck"></use></svg></div>Task <strong>${id}</strong></div>
      <div class="protyle-attr" contenteditable="false"><div class="protyle-attr--name">Native name</div></div>
    </div>${children}<div class="protyle-attr" contenteditable="false"></div>
  </div>`;
}

function editor(html: string): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'protyle';
  wrapper.innerHTML = `<div class="protyle-wysiwyg">${html}</div>`;
  document.body.appendChild(wrapper);
  return wrapper.firstElementChild as HTMLElement;
}

function chips(id: string, root: ParentNode = document): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(`[data-node-id="${id}"] > [data-type="NodeParagraph"] > .protyle-attr > .pinch-document-task-badges > span`));
}

async function settle(): Promise<void> {
  await nextTick();
  await vi.advanceTimersByTimeAsync(80);
}

describe('document task badges', () => {
  let stop: (() => void) | undefined;
  let plugin: TestPlugin;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 10, 12));
    vi.stubGlobal('IntersectionObserver', undefined);
    document.body.innerHTML = '';
    Object.defineProperty(window, 'siyuan', { configurable: true, value: { config: { appearance: { lang: 'zh_CN' } } } });
    settings.taskManager.showDocumentTaskBadges = true;
    settings.taskManager.documentTaskBadgeOptions = undefined;
    mocks.loadSettings.mockReset().mockResolvedValue(undefined);
    mocks.loadGroups.mockReset().mockResolvedValue([
      { id: 'work', name: '工作', color: 'pinch-background3' },
      { id: 'project', parentId: 'work', name: '项目' },
      { id: 'other', name: '其他' }
    ]);
    plugin = new TestPlugin({} as any);
  });

  afterEach(() => {
    stop?.();
    stop = undefined;
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('renders bounded metadata in the native attribute slot without changing the editable body or block attributes', async () => {
    const root = editor(task('parent', `custom-task-priority="high" custom-task-due-date="2026-10-12" custom-task-tags='["work","project","other"]'`, task('child', 'custom-task-priority="low"')));
    const editable = root.querySelector('[contenteditable="true"]')!;
    const originalBody = editable.innerHTML;
    const owner = root.firstElementChild!;
    const originalAttrs = owner.getAttributeNames().map(name => [name, owner.getAttribute(name)]);
    stop = createDocumentTaskBadges(plugin);
    await settle();
    expect(chips('parent').map(chip => chip.textContent)).toEqual(['⚑ 高', '◷ 还剩2天', '# 工作', '# 工作/项目', '+1']);
    expect(chips('child').map(chip => chip.textContent)).toEqual(['⚑ 低']);
    expect(editable.innerHTML).toBe(originalBody);
    expect(owner.getAttributeNames().map(name => [name, owner.getAttribute(name)])).toEqual(originalAttrs);
    expect(root.querySelectorAll('.protyle-attr--name')).toHaveLength(2);
    expect(mocks.loadGroups).toHaveBeenCalledOnce();
    stop();
    expect(root.querySelector('.pinch-document-task-badges')).toBeNull();
    expect(editable.innerHTML).toBe(originalBody);
  });

  it('updates selected badge types immediately and avoids work for disabled types', async () => {
    settings.taskManager.documentTaskBadgeOptions = { priority: false, dueDate: true, tags: false };
    const root = editor(task('task', 'custom-task-priority="high" custom-task-due-date="2026-10-12" custom-task-tags=\'["work"]\''));
    stop = createDocumentTaskBadges(plugin);
    await settle();
    expect(chips('task').map(chip => chip.textContent)).toEqual(['◷ 还剩2天']);
    expect(mocks.loadGroups).not.toHaveBeenCalled();

    settings.taskManager.documentTaskBadgeOptions.tags = true;
    await settle();
    expect(chips('task').map(chip => chip.textContent)).toEqual(['◷ 还剩2天', '# 工作']);
    expect(mocks.loadGroups).toHaveBeenCalledOnce();

    settings.taskManager.documentTaskBadgeOptions = { priority: true, dueDate: false, tags: false };
    await settle();
    expect(chips('task').map(chip => chip.textContent)).toEqual(['⚑ 高']);
    expect(vi.getTimerCount()).toBe(0);

    settings.taskManager.documentTaskBadgeOptions.priority = false;
    await settle();
    expect(root.querySelector('.pinch-document-task-badges')).toBeNull();
    expect(vi.getTimerCount()).toBe(0);

    settings.taskManager.documentTaskBadgeOptions.tags = true;
    await settle();
    expect(chips('task').map(chip => chip.textContent)).toEqual(['# 工作']);
    expect(mocks.loadGroups).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);

    settings.taskManager.showDocumentTaskBadges = false;
    await settle();
    expect(chips('task')).toHaveLength(0);
    settings.taskManager.showDocumentTaskBadges = true;
    await settle();
    expect(chips('task').map(chip => chip.textContent)).toEqual(['# 工作']);
  });

  it('shares tag data and local attribute updates across editors', async () => {
    const first = editor(task('shared', 'custom-task-priority="low"'));
    const second = editor(task('shared', 'custom-task-priority="low"'));
    stop = createDocumentTaskBadges(plugin);
    await settle();
    eventBus.emit(Events.TASK_CHANGED, {
      blockIds: ['shared'], revision: 1,
      attributeChanges: { shared: { 'custom-task-priority': 'high', 'custom-task-tags': '["project"]' } }
    });
    await settle();
    expect(chips('shared', first).map(chip => chip.textContent)).toEqual(['⚑ 高', '# 工作/项目']);
    expect(chips('shared', second).map(chip => chip.textContent)).toEqual(['⚑ 高', '# 工作/项目']);
    expect(mocks.loadGroups).toHaveBeenCalledOnce();
    eventBus.emit(Events.TASK_GROUPS_UPDATED, { groups: [{ id: 'project', name: '改名' }] });
    await settle();
    expect(chips('shared', first)[1].textContent).toBe('# 改名');
  });

  it('routes due-date clicks and keyboard activation to the month view while other badges edit properties', async () => {
    const root = editor(task('task', 'custom-task-priority="high" custom-task-due-date="2026-11-27" custom-task-due-time="16:30" custom-task-tags=\'["work"]\''));
    const openProperties = vi.fn();
    const openDate = vi.fn();
    const editorClick = vi.fn();
    const editorKeydown = vi.fn();
    root.addEventListener('click', editorClick);
    root.addEventListener('keydown', editorKeydown);
    stop = createDocumentTaskBadges(plugin, openProperties, openDate);
    await settle();
    const [priority, due, tag] = chips('task');
    expect(due.title).toContain('2026-11-27 16:30');
    expect(due.getAttribute('aria-label')).toContain('在月视图查看');
    expect(due.getAttribute('role')).toBe('button');
    expect(due.tabIndex).toBe(0);
    due.click();
    for (const key of ['Enter', ' ']) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      due.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    }
    expect(openDate.mock.calls).toEqual([['2026-11-27'], ['2026-11-27'], ['2026-11-27']]);
    expect(openProperties).not.toHaveBeenCalled();
    expect(editorClick).not.toHaveBeenCalled();
    expect(editorKeydown).not.toHaveBeenCalled();
    priority.click();
    tag.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    expect(openProperties.mock.calls).toEqual([['task', { x: 0, y: 0 }], ['task', { x: 0, y: 0 }]]);
    expect(openDate).toHaveBeenCalledTimes(3);
  });

  it('navigates overdue badges to their actual due date and uses updated dates', async () => {
    editor(task('task', 'custom-task-due-date="2026-10-08"'));
    const openProperties = vi.fn();
    const openDate = vi.fn();
    stop = createDocumentTaskBadges(plugin, openProperties, openDate);
    await settle();
    const overdue = chips('task')[0];
    expect(overdue.classList.contains('is-overdue')).toBe(true);
    overdue.click();
    expect(openDate).toHaveBeenLastCalledWith('2026-10-08');
    eventBus.emit(Events.TASK_CHANGED, {
      blockIds: ['task'], revision: 1,
      attributeChanges: { task: { 'custom-task-due-date': '2026-12-01' } }
    });
    await settle();
    chips('task')[0].click();
    expect(openDate).toHaveBeenLastCalledWith('2026-12-01');
    expect(openProperties).not.toHaveBeenCalled();
  });

  it('tracks native completion icons and reattaches after the editor replaces a paragraph', async () => {
    const root = editor(task('task', 'custom-task-due-date="2026-10-08"'));
    stop = createDocumentTaskBadges(plugin);
    await settle();
    expect(chips('task')[0].classList.contains('is-overdue')).toBe(true);
    root.querySelector('use')!.setAttribute('href', '#iconCheck');
    await settle();
    expect(chips('task')[0].textContent).toBe('◷ 10/8');
    root.innerHTML = task('task', 'custom-task-due-date="2026-10-10" custom-task-due-time="16:30"');
    await settle();
    expect(chips('task')[0].textContent).toBe('◷ 今天16:30到期');
    expect(root.querySelectorAll('.pinch-document-task-badges')).toHaveLength(1);
    root.innerHTML = '';
    await settle();
    eventBus.emit(Events.TASK_CHANGED, { blockIds: ['task'], revision: 2 });
    await settle();
    expect(root.querySelector('.pinch-document-task-badges')).toBeNull();
  });

  it('renders only intersecting tasks and performs no reads for offscreen tasks or ordinary input', async () => {
    const observers: Array<{ callback: IntersectionObserverCallback; observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }> = [];
    vi.stubGlobal('IntersectionObserver', class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
      constructor(public callback: IntersectionObserverCallback) { observers.push(this); }
    });
    const root = editor(Array.from({ length: 1000 }, (_, index) => task(`task-${index}`, 'custom-task-priority="low" custom-task-tags=\'["work"]\'')).join(''));
    stop = createDocumentTaskBadges(plugin);
    await settle();
    expect(observers[0].observe).toHaveBeenCalledTimes(1000);
    expect(root.querySelector('.pinch-document-task-badges')).toBeNull();
    expect(mocks.loadGroups).not.toHaveBeenCalled();
    const visible = root.querySelector('[data-node-id="task-50"]')!;
    eventBus.emit(Events.TASK_CHANGED, {
      blockIds: ['task-50'], revision: 1,
      attributeChanges: { 'task-50': { 'custom-task-priority': 'high' } }
    });
    await settle();
    expect(chips('task-50')).toHaveLength(0);
    observers[0].callback([{ target: visible.firstElementChild!, isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    await settle();
    expect(root.querySelectorAll('.pinch-document-task-badges')).toHaveLength(1);
    expect(chips('task-50')[0].textContent).toBe('⚑ 高');
    expect(mocks.loadGroups).toHaveBeenCalledOnce();
    const container = chips('task-50')[0].parentElement;
    visible.querySelector('[contenteditable="true"]')!.appendChild(document.createTextNode(' typing'));
    await settle();
    expect(chips('task-50')[0].parentElement).toBe(container);
    expect(mocks.loadGroups).toHaveBeenCalledOnce();
    settings.taskManager.showDocumentTaskBadges = false;
    await settle();
    expect(root.querySelector('.pinch-document-task-badges')).toBeNull();
    expect(observers[0].disconnect).toHaveBeenCalledOnce();
  });

  it('handles editor lifecycle, keyboard editing and the display switch', async () => {
    settings.taskManager.showDocumentTaskBadges = false;
    const root = editor(task('task', 'custom-task-priority="medium"'));
    const open = vi.fn();
    stop = createDocumentTaskBadges(plugin, open);
    await settle();
    expect(chips('task')).toHaveLength(0);
    settings.taskManager.showDocumentTaskBadges = true;
    await settle();
    chips('task')[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(open).toHaveBeenCalledWith('task', { x: 0, y: 0 });
    plugin.eventBus.emit('destroy-protyle', new CustomEvent('destroy-protyle', { detail: { protyle: { wysiwyg: { element: root } } } }));
    expect(chips('task')).toHaveLength(0);
    plugin.eventBus.emit('loaded-protyle-static', new CustomEvent('loaded-protyle-static', { detail: { protyle: { wysiwyg: { element: root } } } }));
    await settle();
    expect(chips('task')).toHaveLength(1);
    settings.taskManager.showDocumentTaskBadges = false;
    await settle();
    root.firstElementChild!.setAttribute('custom-task-priority', 'high');
    await settle();
    expect(chips('task')).toHaveLength(0);
  });

  it('refreshes dates once at midnight and ignores invalid dates and missing native slots', async () => {
    vi.setSystemTime(new Date(2026, 9, 10, 23, 59, 59));
    editor(task('due', 'custom-task-due-date="2026-10-11"') + task('invalid', 'custom-task-due-date="2026-02-30"') + '<div data-type="NodeListItem" data-subtype="t" data-node-id="bare" custom-task-priority="high"></div>');
    stop = createDocumentTaskBadges(plugin);
    await settle();
    expect(chips('due')[0].textContent).toBe('◷ 明天到期');
    expect(chips('invalid')).toHaveLength(0);
    expect(chips('bare')).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1100);
    expect(chips('due')[0].textContent).toBe('◷ 今天到期');
  });

  it('cannot restart after unloading during a delayed settings load', async () => {
    let resolve!: () => void;
    mocks.loadSettings.mockReturnValueOnce(new Promise<void>(finish => { resolve = finish; }));
    editor(task('task', 'custom-task-priority="high"'));
    stop = createDocumentTaskBadges(plugin);
    stop();
    resolve();
    await settle();
    expect(chips('task')).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
