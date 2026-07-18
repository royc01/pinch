/**
 * Visibility settings for the task view switcher's eight top-level entries.
 * Calendar's four internal views are intentionally exposed as one entry.
 */
export const taskViewSwitcherDisplayOptions = [
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
  { id: 'archive-table', labelKey: 'kanbanView.viewArchive' },
  { id: 'stats', labelKey: 'kanbanView.viewStats' }
] as const;
