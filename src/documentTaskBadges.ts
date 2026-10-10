import type { Plugin } from 'siyuan';
import { watch } from 'vue';
import { loadTaskGroups, type TaskGroup } from '@/api';
import { useUserSettings } from '@/composables/useUserSettings';
import { formatTemplate, translate } from '@/composables/useI18n';
import { eventBus, Events } from '@/utils/eventBus';
import { resolveTaskTagIds, parseTaskTagIdsAttribute } from '@/utils/taskTags';
import { getTaskPriorityShortLabel, TASK_PRIORITY_STYLES, type TaskPriorityLevel } from '@/utils/taskPriority';
import { resolveGroupColorCss, resolveGroupTextColor } from '@/utils/groupColor';
import type { TaskChangePayload } from '@/utils/taskChangeCoordinator';
import { parseTaskStatusFromElement } from '@/utils/taskDom';

const TASK_SELECTOR = '[data-type="NodeListItem"][data-subtype="t"], [data-type="NodeListItem"][data-task]';
const BADGE_CLASS = 'pinch-document-task-badges';
const BADGE_ATTRIBUTES = [
  'custom-task-priority', 'custom-task-due-date', 'custom-task-due-time',
  'custom-task-tags', 'custom-task-group', 'custom-task-status', 'data-task', 'data-subtype',
  'href', 'xlink:href'
];
const MAX_RENDER_BATCH = 60;

interface TaskTarget {
  element: HTMLElement;
  blockId: string;
  visible: boolean;
  intersectionElement?: HTMLElement;
  badges?: HTMLElement;
  signature?: string;
}

interface EditorBadges {
  tasks: Map<HTMLElement, TaskTarget>;
  dispose: () => void;
}

interface Badge {
  text: string;
  title?: string;
  kind: string;
  dueDate?: string;
  background?: string;
  color?: string;
}

function getTaskParagraph(element: HTMLElement): HTMLElement | undefined {
  return Array.from(element.children).find(child => child.getAttribute('data-type') === 'NodeParagraph') as HTMLElement | undefined;
}

function getAttributeSlot(element: HTMLElement): HTMLElement | undefined {
  // Lute explicitly skips the native protyle-attr container during DOM ->
  // Markdown conversion. Keep its class unchanged and never enter the body.
  const paragraph = getTaskParagraph(element);
  return paragraph
    ? Array.from(paragraph.children).find(child => child.className === 'protyle-attr') as HTMLElement | undefined
    : undefined;
}

function dueBadge(date: string, time: string, finished: boolean): Badge | undefined {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!parts) return;
  const [year, month, day] = parts.slice(1).map(Number);
  const due = new Date(year, month - 1, day);
  if (due.getFullYear() !== year || due.getMonth() !== month - 1 || due.getDate() !== day) return;
  const now = new Date();
  const days = Math.round((Date.UTC(year, month - 1, day) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86_400_000);
  const validTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : '';
  let text = `${month}/${day}${validTime ? ` ${validTime}` : ''}`;
  if (!finished) {
    if (days < 0) text = formatTemplate('personalStats.overdueDaysTemplate', { days: -days });
    else if (days === 0) text = validTime
      ? formatTemplate('taskCard.dueTodayWithTime', { time: validTime })
      : translate('taskManager.dueToday');
    else if (days === 1) text = translate('taskCard.dueTomorrow');
    else if (days <= 7) text = formatTemplate('taskCard.remainingDaysTemplate', { days });
  }
  return {
    text: `◷ ${text}`,
    title: `${translate('taskManager.dueDate')}: ${date}${validTime ? ` ${validTime}` : ''}`,
    kind: !finished && days < 0 ? 'overdue' : 'due',
    dueDate: date
  };
}

export function createDocumentTaskBadges(
  plugin: Plugin,
  openProperties?: (blockId: string, anchor: { x: number; y: number }) => void,
  openDueDate?: (date: string) => void
): () => void {
  const settings = useUserSettings();
  const editors = new Map<HTMLElement, EditorBadges>();
  const targetsById = new Map<string, Set<TaskTarget>>();
  const dirty = new Set<TaskTarget>();
  const attributePatches = new Map<string, Record<string, string>>();
  let groupLookup = new Map<string, TaskGroup & { label: string }>();
  let groupsReady = false;
  let groupsLoading = false;
  let active = false;
  let disposed = false;
  let renderTimer: ReturnType<typeof setTimeout> | undefined;
  let dateTimer: ReturnType<typeof setTimeout> | undefined;

  function queue(target: TaskTarget): void {
    if (!active || !target.visible) return;
    dirty.add(target);
    if (renderTimer !== undefined) return;
    renderTimer = setTimeout(flush, 24);
  }

  function refreshVisible(): void {
    targetsById.forEach(targets => targets.forEach(queue));
  }

  function setGroups(groups: TaskGroup[]): void {
    const byId = new Map(groups.map(group => [group.id, group]));
    groupLookup = new Map(groups.map(group => {
      const names: string[] = [];
      const visited = new Set<string>();
      let current: TaskGroup | undefined = group;
      while (current && !visited.has(current.id)) {
        visited.add(current.id);
        names.unshift(current.name);
        current = current.parentId ? byId.get(current.parentId) : undefined;
      }
      return [group.id, { ...group, label: names.join('/') }];
    }));
    groupsReady = true;
    refreshVisible();
  }

  function ensureGroups(): void {
    if (groupsReady || groupsLoading) return;
    groupsLoading = true;
    void loadTaskGroups().then(groups => {
      if (!disposed && !groupsReady) setGroups(groups);
    }).catch(error => console.error('[DocumentTaskBadges] Failed to load tags:', error))
      .finally(() => { groupsLoading = false; });
  }

  function buildBadges(target: TaskTarget): Badge[] {
    const paragraph = getTaskParagraph(target.element);
    const patches = attributePatches.get(target.blockId);
    const attr = (name: string): string => patches?.[name]
      ?? target.element.getAttribute(name) ?? paragraph?.getAttribute(name) ?? '';
    const badges: Badge[] = [];
    const options = settings.data.taskManager.documentTaskBadgeOptions;
    const priority = attr('custom-task-priority');
    if (options?.priority !== false && (priority === 'high' || priority === 'medium' || priority === 'low')) {
      badges.push({
        text: `⚑ ${getTaskPriorityShortLabel(priority as TaskPriorityLevel, translate)}`,
        kind: 'priority',
        ...TASK_PRIORITY_STYLES[priority]
      });
    }
    if (options?.dueDate !== false) {
      const status = patches?.['custom-task-status']
        || parseTaskStatusFromElement(target.element, target.blockId)
        || attr('custom-task-status');
      const due = status !== 'cancelled' && dueBadge(attr('custom-task-due-date'), attr('custom-task-due-time'), status === 'completed');
      if (due) badges.push(due);
    }
    if (options?.tags === false) return badges;
    const tagIds = resolveTaskTagIds(parseTaskTagIdsAttribute(attr('custom-task-tags')), attr('custom-task-group'));
    if (tagIds.length > 0) ensureGroups();
    const groups = tagIds.flatMap(id => {
      const group = groupLookup.get(id);
      return group ? [group] : [];
    });
    groups.slice(0, 2).forEach(group => badges.push({
      text: `# ${group.label}`, title: group.label, kind: 'tag',
      background: resolveGroupColorCss(group.color), color: resolveGroupTextColor(group.color)
    }));
    if (groups.length > 2) badges.push({ text: `+${groups.length - 2}`, title: groups.slice(2).map(group => group.label).join(', '), kind: 'tag' });
    return badges;
  }

  function render(target: TaskTarget): void {
    const slot = getAttributeSlot(target.element);
    if (!slot) {
      target.badges?.remove();
      target.badges = undefined;
      target.signature = undefined;
      return;
    }
    const badges = buildBadges(target);
    const signature = JSON.stringify(badges);
    if (target.signature === signature && (badges.length === 0 || target.badges?.parentElement === slot)) return;
    target.badges?.remove();
    target.badges = undefined;
    target.signature = signature;
    if (badges.length === 0) return;
    const container = document.createElement('span');
    container.className = BADGE_CLASS;
    container.contentEditable = 'false';
    container.setAttribute('aria-label', translate('taskScopeDialog.documentTaskBadges'));
    if (openProperties || openDueDate) {
      container.addEventListener('mousedown', event => { event.preventDefault(); event.stopPropagation(); });
    }
    for (const badge of badges) {
      const chip = document.createElement('span');
      chip.className = `pinch-document-task-badge is-${badge.kind}`;
      chip.textContent = badge.text;
      chip.title = badge.title || badge.text;
      const open = badge.dueDate && openDueDate
        ? () => openDueDate(badge.dueDate!)
        : openProperties ? () => {
          const rect = chip.getBoundingClientRect();
          openProperties(target.blockId, { x: rect.left, y: rect.bottom });
        } : undefined;
      if (open) {
        if (badge.dueDate && openDueDate) chip.title += `\n${translate('taskScopeDialog.documentTaskDueDateOpenMonth')}`;
        chip.setAttribute('role', 'button');
        chip.setAttribute('aria-label', chip.title);
        chip.tabIndex = 0;
        chip.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); open(); });
        chip.addEventListener('keydown', event => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          event.stopPropagation();
          open();
        });
      }
      if (badge.background) chip.style.background = badge.background;
      if (badge.color) chip.style.color = badge.color;
      container.appendChild(chip);
    }
    slot.appendChild(container);
    target.badges = container;
  }

  function flush(): void {
    renderTimer = undefined;
    const batch = Array.from(dirty).slice(0, MAX_RENDER_BATCH);
    batch.forEach(target => {
      dirty.delete(target);
      if (active && target.visible && target.element.isConnected) render(target);
    });
    if (dirty.size > 0) renderTimer = setTimeout(flush, 16);
  }

  function connect(root: HTMLElement): void {
    if (!active || !root.isConnected || editors.has(root)) return;
    const tasks = new Map<HTMLElement, TaskTarget>();
    const observedTargets = new Map<Element, TaskTarget>();
    const intersection = typeof IntersectionObserver === 'undefined' ? undefined : new IntersectionObserver(entries => {
      for (const entry of entries) {
        const target = observedTargets.get(entry.target);
        if (!target) continue;
        target.visible = entry.isIntersecting;
        if (target.visible) queue(target);
        else dirty.delete(target);
      }
    }, { rootMargin: '160px' });

    function untrack(element: HTMLElement): void {
      const target = tasks.get(element);
      if (!target) return;
      if (target.intersectionElement) {
        intersection?.unobserve(target.intersectionElement);
        observedTargets.delete(target.intersectionElement);
      }
      dirty.delete(target);
      target.badges?.remove();
      tasks.delete(element);
      const siblings = targetsById.get(target.blockId);
      siblings?.delete(target);
      if (siblings?.size === 0) {
        targetsById.delete(target.blockId);
        attributePatches.delete(target.blockId);
      }
    }

    function observe(target: TaskTarget): void {
      if (!intersection) return;
      const paragraph = getTaskParagraph(target.element) || target.element;
      if (target.intersectionElement === paragraph) return;
      if (target.intersectionElement) {
        intersection.unobserve(target.intersectionElement);
        observedTargets.delete(target.intersectionElement);
      }
      target.intersectionElement = paragraph;
      observedTargets.set(paragraph, target);
      target.visible = false;
      intersection.observe(paragraph);
    }

    function track(element: HTMLElement): void {
      if (!root.contains(element) || !element.matches(TASK_SELECTOR)) return;
      const existing = tasks.get(element);
      if (existing) { observe(existing); queue(existing); return; }
      const blockId = element.getAttribute('data-node-id');
      if (!blockId) return;
      const target: TaskTarget = { element, blockId, visible: !intersection };
      tasks.set(element, target);
      const siblings = targetsById.get(blockId) || new Set<TaskTarget>();
      siblings.add(target);
      targetsById.set(blockId, siblings);
      observe(target);
      queue(target);
    }

    function visit(node: Node, handler: (element: HTMLElement) => void): void {
      if (!(node instanceof HTMLElement)) return;
      if (node.matches(TASK_SELECTOR)) handler(node);
      node.querySelectorAll<HTMLElement>(TASK_SELECTOR).forEach(handler);
    }

    const mutations = new MutationObserver(records => {
      for (const record of records) {
        const element = record.target instanceof HTMLElement ? record.target : record.target.parentElement;
        if (!element || element.closest(`.${BADGE_CLASS}`)) continue;
        if (record.type === 'childList') {
          const nodes = [...record.addedNodes, ...record.removedNodes];
          if (nodes.length > 0 && nodes.every(node => node instanceof HTMLElement && node.classList.contains(BADGE_CLASS))) continue;
          record.removedNodes.forEach(node => visit(node, removed => { if (!root.contains(removed)) untrack(removed); }));
          record.addedNodes.forEach(node => visit(node, track));
        }
        const owner = element.closest<HTMLElement>('[data-type="NodeListItem"]');
        if (!owner) continue;
        if (record.type === 'attributes') {
          const patches = attributePatches.get(owner.getAttribute('data-node-id') || '');
          if (patches && record.attributeName) delete patches[record.attributeName];
          if (!owner.matches(TASK_SELECTOR)) { untrack(owner); continue; }
        }
        track(owner);
      }
    });
    mutations.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: BADGE_ATTRIBUTES });
    editors.set(root, {
      tasks,
      dispose: () => {
        mutations.disconnect();
        intersection?.disconnect();
        Array.from(tasks.keys()).forEach(untrack);
      }
    });
    visit(root, track);
  }

  function discoverEditors(): void {
    editors.forEach((editor, root) => {
      if (!root.isConnected) { editor.dispose(); editors.delete(root); }
    });
    document.querySelectorAll<HTMLElement>('.protyle .protyle-wysiwyg').forEach(connect);
  }

  function handleEditor(event: CustomEvent): void {
    const protyle = event.detail?.protyle;
    const root = protyle?.wysiwyg?.element || protyle?.element?.querySelector('.protyle-wysiwyg');
    if (root instanceof HTMLElement) connect(root);
    else discoverEditors();
  }

  function scheduleDateRefresh(): void {
    if (dateTimer !== undefined) clearTimeout(dateTimer);
    dateTimer = undefined;
    if (!active || settings.data.taskManager.documentTaskBadgeOptions?.dueDate === false) return;
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    dateTimer = setTimeout(() => {
      refreshVisible();
      if (active) scheduleDateRefresh();
    }, midnight.getTime() - Date.now() + 50);
  }

  function deactivate(): void {
    active = false;
    if (renderTimer !== undefined) clearTimeout(renderTimer);
    if (dateTimer !== undefined) clearTimeout(dateTimer);
    renderTimer = undefined;
    dateTimer = undefined;
    editors.forEach(editor => editor.dispose());
    editors.clear();
    dirty.clear();
    attributePatches.clear();
  }

  const editorEvents = ['loaded-protyle-static', 'loaded-protyle-dynamic', 'switch-protyle', 'switch-protyle-mode'] as const;
  editorEvents.forEach(name => plugin.eventBus.on(name, handleEditor));
  const destroyEditor = (event: CustomEvent) => {
    const root = event.detail?.protyle?.wysiwyg?.element;
    editors.get(root)?.dispose();
    editors.delete(root);
  };
  plugin.eventBus.on('destroy-protyle', destroyEditor);
  const unsubscribeTasks = eventBus.on(Events.TASK_CHANGED, (payload?: TaskChangePayload) => {
    if (!active) return;
    if (!payload?.blockIds?.length) { refreshVisible(); return; }
    for (const blockId of payload.blockIds) {
      const targets = targetsById.get(blockId);
      if (!targets) continue;
      const patches = Object.fromEntries(Object.entries(payload.attributeChanges?.[blockId] || {})
        .filter(([name]) => BADGE_ATTRIBUTES.includes(name)));
      if (Object.keys(patches).length > 0) attributePatches.set(blockId, { ...attributePatches.get(blockId), ...patches });
      targets.forEach(queue);
    }
  });
  const unsubscribeGroups = eventBus.on(Events.TASK_GROUPS_UPDATED, (payload?: { groups?: TaskGroup[] }) => {
    if (payload?.groups) setGroups(payload.groups);
    else {
      groupsReady = false;
      if (active && settings.data.taskManager.documentTaskBadgeOptions?.tags !== false) ensureGroups();
    }
  });
  const onVisibility = () => { if (active && !document.hidden) refreshVisible(); };
  document.addEventListener('visibilitychange', onVisibility);
  function updateDisplay(): void {
    if (disposed) return;
    const options = settings.data.taskManager.documentTaskBadgeOptions;
    if (settings.data.taskManager.showDocumentTaskBadges === false
      || (options?.priority === false && options?.dueDate === false && options?.tags === false)) deactivate();
    else {
      active = true;
      discoverEditors();
      refreshVisible();
      scheduleDateRefresh();
    }
  }
  const stopWatching = watch(() => [
    settings.data.taskManager.showDocumentTaskBadges !== false,
    settings.data.taskManager.documentTaskBadgeOptions?.priority !== false,
    settings.data.taskManager.documentTaskBadgeOptions?.dueDate !== false,
    settings.data.taskManager.documentTaskBadgeOptions?.tags !== false
  ], updateDisplay);
  void settings.loadSettings().then(updateDisplay);

  return () => {
    disposed = true;
    stopWatching();
    deactivate();
    editorEvents.forEach(name => plugin.eventBus.off(name, handleEditor));
    plugin.eventBus.off('destroy-protyle', destroyEditor);
    unsubscribeTasks();
    unsubscribeGroups();
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
