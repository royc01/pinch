import type { TaskGroup } from '@/api';
import { resolveGroupColorCss, resolveGroupColorLayerCss, resolveGroupTextColor } from '@/utils/groupColor';

export interface TaskBackgroundColorOption {
  value: string;
  css: string;
}

export interface TaskGroupOption {
  value: string;
  label: string;
  special?: boolean;
  color?: string;
  colorCss?: string;
  borderColor?: string;
  textColor?: string;
}

export interface TaskGroupBadge {
  id: string;
  label: string;
  style?: Record<string, string>;
}

export interface TaskGroupBadgeMeta {
  name?: string;
  background?: string;
  color?: string;
}

export const TASK_GROUP_NONE_ID = '__none__';

export const TASK_BACKGROUND_COLOR_OPTIONS: TaskBackgroundColorOption[] = Array.from(
  { length: 10 },
  (_, index) => {
    const colorIndex = index + 1;
    const value = `pinch-background${colorIndex}`;
    return {
      value,
      css: `var(--${value})`
    };
  }
);

export const TASK_BACKGROUND_COLOR_VALUES = TASK_BACKGROUND_COLOR_OPTIONS.map(color => color.value);

export function normalizeTaskGroupOrderIds(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];
  input.forEach((item) => {
    if (typeof item !== 'string') {
      return;
    }
    const value = item.trim();
    if (!value || seen.has(value)) {
      return;
    }
    seen.add(value);
    normalized.push(value);
  });
  return normalized;
}

export function resolveTaskGroupFallbackLabel(
  group: TaskGroup | null | undefined,
  fallbackLabel: string
): string {
  return group?.name?.trim() || fallbackLabel;
}

export function getTaskGroupColorValue(groups: readonly TaskGroup[], groupId: string): string {
  const normalizedGroupId = typeof groupId === 'string' ? groupId.trim() : '';
  if (!normalizedGroupId) {
    return '';
  }
  return groups.find(group => group.id === normalizedGroupId)?.color || '';
}

export function buildTaskGroupOption(
  group: TaskGroup,
  fallbackLabel: string,
  options: { includeColor?: boolean; includeBorderColor?: boolean } = {}
): TaskGroupOption {
  const rawColor = group.color || '';
  return {
    value: group.id,
    label: resolveTaskGroupFallbackLabel(group, fallbackLabel),
    special: false,
    ...(options.includeColor ? { color: rawColor } : {}),
    colorCss: resolveGroupColorCss(rawColor),
    ...(options.includeBorderColor ? { borderColor: resolveGroupColorLayerCss(rawColor) } : {}),
    textColor: resolveGroupTextColor(rawColor)
  };
}

export function buildTaskGroupOptions(
  groups: readonly TaskGroup[],
  labels: { none: string; fallback: string },
  options: { includeColor?: boolean; includeBorderColor?: boolean } = {}
): TaskGroupOption[] {
  return [
    {
      value: TASK_GROUP_NONE_ID,
      label: labels.none,
      special: true,
      ...(options.includeColor ? { color: '' } : {}),
      colorCss: '',
      ...(options.includeBorderColor ? { borderColor: '' } : {}),
      textColor: ''
    },
    ...groups
      .filter(group => !!group?.id && group.hidden !== true)
      .map(group => buildTaskGroupOption(group, labels.fallback, options))
  ];
}

export function buildTaskGroupBadges(
  groupIds: readonly string[],
  groupLookup: ReadonlyMap<string, TaskGroupBadgeMeta>
): TaskGroupBadge[] {
  return groupIds.map((groupId) => {
    const meta = groupLookup.get(groupId);
    return {
      id: groupId,
      label: meta?.name || groupId,
      style: meta?.background
        ? {
            '--group-badge-bg': meta.background,
            '--group-badge-color': meta.color || 'var(--b3-theme-on-surface)'
          }
        : undefined
    };
  });
}
