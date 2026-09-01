export const TASK_SEARCH_HISTORY_STORAGE_KEY = 'pinch-task-search-history';
const TASK_SEARCH_HISTORY_LIMIT = 8;

export function loadTaskSearchHistory(): string[] {
  try {
    const stored = JSON.parse(localStorage.getItem(TASK_SEARCH_HISTORY_STORAGE_KEY) || '[]');
    return Array.isArray(stored)
      ? stored.filter((query): query is string => typeof query === 'string' && Boolean(query.trim())).slice(0, TASK_SEARCH_HISTORY_LIMIT)
      : [];
  } catch {
    return [];
  }
}

export function saveTaskSearchHistory(history: string[]): void {
  try {
    localStorage.setItem(TASK_SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, TASK_SEARCH_HISTORY_LIMIT)));
  } catch {
    // Search remains available even if the browser blocks local storage.
  }
}

export function recordTaskSearchHistory(query: string): string[] {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return loadTaskSearchHistory();
  const history = [normalizedQuery, ...loadTaskSearchHistory().filter(item => item !== normalizedQuery)]
    .slice(0, TASK_SEARCH_HISTORY_LIMIT);
  saveTaskSearchHistory(history);
  return history;
}

export function removeTaskSearchHistory(query: string): string[] {
  const history = loadTaskSearchHistory().filter(item => item !== query);
  saveTaskSearchHistory(history);
  return history;
}
