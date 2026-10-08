/** IDs used by the settings panel for the task view switcher's top-level entries. */
export type TaskViewSwitcherDisplayId = 'kanban' | 'list' | 'table' | 'quadrant' | 'gantt' | 'calendar' | 'archive-table' | 'stats';

/**
 * Visibility and ordering settings for the task view switcher's top-level entries.
 * Calendar's four internal views are intentionally exposed as one entry.
 */
export const taskViewSwitcherDisplayOptions: ReadonlyArray<{
  id: TaskViewSwitcherDisplayId;
  labelKey: string;
  hiddenIds?: readonly string[];
}> = [
  { id: 'stats', labelKey: 'kanbanView.viewStats' },
  { id: 'kanban', labelKey: 'kanbanView.viewKanban' },
  { id: 'list', labelKey: 'kanbanView.viewList' },
  { id: 'table', labelKey: 'kanbanView.viewTable' },
  { id: 'quadrant', labelKey: 'kanbanView.viewQuadrant' },
  { id: 'gantt', labelKey: 'kanbanView.viewGantt' },
  {
    id: 'calendar',
    labelKey: 'kanbanView.viewCalendar',
    hiddenIds: ['month', 'week', 'three-day', 'day']
  },
  { id: 'archive-table', labelKey: 'kanbanView.viewArchive' }
] as const;

export const TASK_VIEW_SWITCHER_DISPLAY_IDS: readonly TaskViewSwitcherDisplayId[] =
  taskViewSwitcherDisplayOptions.map(option => option.id);
