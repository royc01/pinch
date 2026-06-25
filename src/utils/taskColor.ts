export interface TaskColorSource {
  backgroundColor?: string;
  groupId?: string;
}

export interface TaskColorGroup {
  id?: string;
  color?: string;
}

export function normalizeTaskBackgroundColorValue(backgroundColor?: string): string {
  const raw = typeof backgroundColor === 'string' ? backgroundColor.trim() : '';
  if (!raw) {
    return '';
  }
  const cssVarMatch = raw.match(/^var\(--(pinch-background(?:10|[1-9]))\)$/);
  if (cssVarMatch) {
    return cssVarMatch[1];
  }
  return raw;
}

export function resolveTaskGroupBackgroundColor(
  task: Pick<TaskColorSource, 'groupId'>,
  taskGroups: readonly TaskColorGroup[] = []
): string {
  const groupId = typeof task.groupId === 'string' ? task.groupId.trim() : '';
  if (!groupId) {
    return '';
  }
  const group = taskGroups.find(item => item.id === groupId);
  return normalizeTaskBackgroundColorValue(group?.color);
}

export function resolveEffectiveTaskBackgroundColor(
  task: TaskColorSource,
  taskGroups: readonly TaskColorGroup[] = []
): string {
  return normalizeTaskBackgroundColorValue(task.backgroundColor)
    || resolveTaskGroupBackgroundColor(task, taskGroups);
}

export function resolveTaskBackgroundColor(backgroundColor?: string): string {
  const raw = normalizeTaskBackgroundColorValue(backgroundColor);
  if (!raw) {
    return 'var(--pinch-background6)';
  }
  if (/^pinch-background(?:10|[1-9])$/.test(raw)) {
    return `var(--${raw})`;
  }
  if (/^background(1[0-3]|[4-9])$/.test(raw)) {
    return `var(--b3-font-${raw})`;
  }
  return raw;
}

export function resolveTaskColorIndex(backgroundColor?: string): number | null {
  const raw = normalizeTaskBackgroundColorValue(backgroundColor);
  if (!raw) {
    return null;
  }
  const pinchMatch = raw.match(/^pinch-background(10|[1-9])$/);
  if (pinchMatch) {
    return Number(pinchMatch[1]);
  }
  const legacyMatch = raw.match(/^background(1[0-3]|[4-9])$/);
  if (legacyMatch) {
    return Number(legacyMatch[1]) - 3;
  }
  return null;
}

export function resolveTaskAccentColor(backgroundColor?: string): string {
  const index = resolveTaskColorIndex(backgroundColor) ?? 6;
  return `var(--pinch-color${index})`;
}
