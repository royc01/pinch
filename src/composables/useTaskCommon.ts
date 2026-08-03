import { ref } from 'vue';
import { lsNotebooks } from '@/api';
import type { SubTask, Task } from '@/api';
import { translate } from '@/composables/useI18n';
import { getTaskStatusLabel } from '@/utils/taskStatus';
import { sanitizeTaskTitleHtml } from '@/utils/taskHtml';

export function getStatusLabel(status: string): string {
  return getTaskStatusLabel(status, key => translate(key, status));
}

export function formatLocaleDate(dateStr: string, options?: { includeTime?: boolean }): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return dateStr;
  }
  if (options?.includeTime) {
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }
  return date.toLocaleDateString();
}

export function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  tmp.querySelectorAll('.list, [data-type="NodeList"], ul, ol').forEach((list) => {
    list.remove();
  });
  const firstElement = tmp.firstElementChild;
  const hasTextOutsideFirstElement = Array.from(tmp.childNodes).some((node) => (
    node !== firstElement
    && node.nodeType === Node.TEXT_NODE
    && (node.textContent || '').trim().length > 0
  ));
  const keepSingleTopLevelListItem = !!firstElement
    && tmp.children.length === 1
    && !hasTextOutsideFirstElement
    && firstElement.matches('[data-type="NodeListItem"], .li');
  tmp.querySelectorAll('.protyle-action--task, [data-type="NodeListItem"], .li').forEach((node) => {
    if (keepSingleTopLevelListItem && node === firstElement) {
      return;
    }
    node.remove();
  });
  const inlineMemoSupNodes = tmp.querySelectorAll('sup');
  inlineMemoSupNodes.forEach((sup) => {
    const text = (sup.textContent || '').trim();
    if (/^\([^()]+\)$/.test(text)) {
      sup.remove();
    }
  });
  return tmp.textContent || tmp.innerText || '';
}

type TaskTitleSource = Pick<Task, 'title' | 'subtasks'> | Pick<SubTask, 'title' | 'subtasks'>;
const TASK_DISPLAY_TITLE_CACHE_LIMIT = 1200;
const taskDisplayTitleCache = new Map<string, string>();

function normalizeTitleText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function getPlainTaskTitle(value: string): string {
  return normalizeTitleText(stripHtml(sanitizeTaskTitleHtml(value)));
}

function appendTitleCachePart(parts: string[], value: string): void {
  parts.push(`${value.length}:${value}`);
}

function appendSubtaskTitleCacheParts(subtasks: TaskTitleSource['subtasks'], parts: string[]): void {
  if (!Array.isArray(subtasks) || subtasks.length === 0) {
    return;
  }

  for (const subtask of subtasks) {
    appendTitleCachePart(parts, subtask.title || '');
    appendSubtaskTitleCacheParts(subtask.subtasks, parts);
  }
}

function getTaskDisplayTitleCacheKey(task: TaskTitleSource): string {
  const parts: string[] = [];
  appendTitleCachePart(parts, task.title || '');
  appendSubtaskTitleCacheParts(task.subtasks, parts);
  return parts.join('|');
}

function rememberTaskDisplayTitle(cacheKey: string, title: string): string {
  if (!taskDisplayTitleCache.has(cacheKey) && taskDisplayTitleCache.size >= TASK_DISPLAY_TITLE_CACHE_LIMIT) {
    const oldestKey = taskDisplayTitleCache.keys().next().value;
    if (oldestKey !== undefined) {
      taskDisplayTitleCache.delete(oldestKey);
    }
  }
  taskDisplayTitleCache.set(cacheKey, title);
  return title;
}

function collectSubtaskTitles(subtasks: TaskTitleSource['subtasks']): string[] {
  if (!Array.isArray(subtasks) || subtasks.length === 0) {
    return [];
  }

  const titles: string[] = [];
  for (const subtask of subtasks) {
    const title = getPlainTaskTitle(subtask.title || '');
    if (title) {
      titles.push(title);
    }
    titles.push(...collectSubtaskTitles(subtask.subtasks));
  }
  return titles;
}

function titleHasNestedTaskStructure(rawTitle: string): boolean {
  return /data-type=["']NodeList(Item)?["']|class=["'][^"']*(?:list|li|protyle-task)|<(?:ul|ol)\b|\n\s*[-*]\s*(?:\{:[^}]*\})?\s*\[(?:x|X| )\]/i.test(rawTitle);
}

export function getTaskDisplayTitle(task: TaskTitleSource | null | undefined): string {
  if (!task) {
    return '';
  }

  const cacheKey = getTaskDisplayTitleCacheKey(task);
  if (taskDisplayTitleCache.has(cacheKey)) {
    return taskDisplayTitleCache.get(cacheKey) || '';
  }

  const title = getPlainTaskTitle(task.title || '');
  if (!title) {
    return rememberTaskDisplayTitle(cacheKey, title);
  }

  const subtaskTitles = collectSubtaskTitles(task.subtasks);
  if (subtaskTitles.length === 0 && !titleHasNestedTaskStructure(task.title || '')) {
    return rememberTaskDisplayTitle(cacheKey, title);
  }

  let cutIndex = title.length;
  for (const subtaskTitle of subtaskTitles) {
    const index = title.indexOf(subtaskTitle);
    if (index > 0 && index < cutIndex) {
      cutIndex = index;
    }
  }

  const displayTitle = cutIndex < title.length
    ? (title.slice(0, cutIndex).trim() || title)
    : title;
  return rememberTaskDisplayTitle(cacheKey, displayTitle);
}

export interface TaskCommonNotebook {
  id: string;
  name: string;
  icon: string;
}

export function useNotebooks() {
  const notebooks = ref<TaskCommonNotebook[]>([]);
  const loading = ref(false);

  async function loadNotebooks() {
    loading.value = true;
    try {
      const result = await lsNotebooks();
      if (result && result.notebooks) {
        notebooks.value = result.notebooks
          .filter((nb) => !nb.closed)
          .map((nb) => ({
            id: nb.id,
            name: nb.name,
            // SiYuan returns an empty icon for notebooks that use its default icon.
            icon: nb.icon || '1f5c3'
          }));
      }
    } catch (error) {
      console.error('[useNotebooks] Failed to load notebooks:', error);
    } finally {
      loading.value = false;
    }
  }

  return {
    notebooks,
    loading,
    loadNotebooks
  };
}
