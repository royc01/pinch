import { computed, shallowRef, unref, watch, type Ref } from 'vue';
import { translate } from '@/composables/useI18n';

export type TaskFilterSectionKey = 'status' | 'priority' | 'group' | 'due' | 'updated' | 'extra';
export type TaskFilterJoin = 'and' | 'or' | 'not';

export interface StoredTaskFilterExpressionItem {
  group: TaskFilterSectionKey;
  value: string;
  join: TaskFilterJoin;
}

export interface TaskFilterOption<T extends string = string> {
  value: T;
  label: string;
  style?: Record<string, string>;
}

export interface TaskFilterSection {
  key: TaskFilterSectionKey;
  title: string;
  options: Array<{
    value: string;
    label: string;
    active: boolean;
    style?: Record<string, string>;
  }>;
}

export interface TaskFilterChip {
  key: string;
  group: TaskFilterSectionKey;
  value: string;
  label: string;
  style?: Record<string, string>;
}

export interface TaskFilterExpressionItem extends TaskFilterChip {
  join: TaskFilterJoin;
}

export function matchesTaskFilterExpression<T>(
  task: T,
  expression: readonly StoredTaskFilterExpressionItem[],
  matchesCondition: (task: T, condition: StoredTaskFilterExpressionItem) => boolean
): boolean {
  if (expression.length === 0) {
    return true;
  }

  let result = matchesCondition(task, expression[0]);
  for (let index = 1; index < expression.length; index++) {
    const condition = expression[index];
    const matched = matchesCondition(task, condition);
    switch (condition.join) {
      case 'or':
        result = result || matched;
        break;
      case 'not':
        result = result && !matched;
        break;
      default:
        result = result && matched;
        break;
    }
  }
  return result;
}

type MaybeRef<T> = T | Ref<T>;

export function useTaskFilterState<
  TStatus extends string,
  TPriority extends string,
  TDue extends string,
  TUpdated extends string,
  TExtra extends string
>(options: {
  statusOptions: Array<TaskFilterOption<TStatus>>;
  priorityOptions: Array<TaskFilterOption<TPriority>>;
  dueOptions: Array<TaskFilterOption<TDue>>;
  updatedOptions: Array<TaskFilterOption<TUpdated>>;
  extraOptions: Array<TaskFilterOption<TExtra>>;
  groupOptions: MaybeRef<Array<TaskFilterOption<string>>>;
  buildActiveGroupStyle?: (value: string) => Record<string, string> | undefined;
  updatedSingle?: boolean;
  sectionTitles?: Partial<Record<TaskFilterSectionKey, string>>;
}) {
  const activeStatusFilters = shallowRef<TStatus[]>([]);
  const activePriorityFilters = shallowRef<TPriority[]>([]);
  const activeDueFilters = shallowRef<TDue[]>([]);
  const activeUpdatedFilters = shallowRef<TUpdated[]>([]);
  const activeGroupFilters = shallowRef<string[]>([]);
  const activeExtraFilters = shallowRef<TExtra[]>([]);
  const expressionState = shallowRef<StoredTaskFilterExpressionItem[]>([]);

  const groupOptions = computed(() => {
    const resolved = unref(options.groupOptions);
    return Array.isArray(resolved) ? resolved : [];
  });

  const sectionTitles: Record<TaskFilterSectionKey, string> = {
    status: translate('taskManager.status'),
    priority: translate('taskManager.priority'),
    group: translate('taskManager.tags'),
    due: translate('taskManager.dueDate'),
    updated: translate('taskManager.updatedDate'),
    extra: translate('taskManager.other'),
    ...options.sectionTitles
  };

  const toggleFilterValue = <T extends string>(
    filterRef: Ref<T[]>,
    group: TaskFilterSectionKey,
    value: T
  ): void => {
    if (filterRef.value.includes(value)) {
      filterRef.value = filterRef.value.filter(item => item !== value);
      expressionState.value = expressionState.value.filter(item => !(item.group === group && item.value === value));
      return;
    }

    filterRef.value = [...filterRef.value, value];
    let sameGroupIndex = -1;
    for (let index = expressionState.value.length - 1; index >= 0; index--) {
      if (expressionState.value[index].group === group) {
        sameGroupIndex = index;
        break;
      }
    }
    if (sameGroupIndex >= 0) {
      expressionState.value = [
        ...expressionState.value.slice(0, sameGroupIndex + 1),
        { group, value, join: 'or' },
        ...expressionState.value.slice(sameGroupIndex + 1)
      ];
      return;
    }
    expressionState.value = [...expressionState.value, { group, value, join: 'and' }];
  };

  const toggleStatus = (value: TStatus): void => {
    toggleFilterValue(activeStatusFilters, 'status', value);
  };

  const togglePriority = (value: TPriority): void => {
    toggleFilterValue(activePriorityFilters, 'priority', value);
  };

  const toggleDue = (value: TDue): void => {
    toggleFilterValue(activeDueFilters, 'due', value);
  };

  const toggleUpdated = (value: TUpdated): void => {
    if (options.updatedSingle === false) {
      toggleFilterValue(activeUpdatedFilters, 'updated', value);
      return;
    }
    for (const activeValue of activeUpdatedFilters.value) {
      if (activeValue !== value) {
        expressionState.value = expressionState.value.filter(item => !(item.group === 'updated' && item.value === activeValue));
      }
    }
    if (activeUpdatedFilters.value.includes(value)) {
      activeUpdatedFilters.value = [];
      expressionState.value = expressionState.value.filter(item => !(item.group === 'updated' && item.value === value));
      return;
    }
    activeUpdatedFilters.value = [value];
    const previous = expressionState.value[expressionState.value.length - 1];
    expressionState.value = [
      ...expressionState.value,
      { group: 'updated', value, join: previous?.group === 'updated' ? 'or' : 'and' }
    ];
  };

  const toggleGroup = (value: string): void => {
    toggleFilterValue(activeGroupFilters, 'group', value);
  };

  const toggleExtra = (value: TExtra): void => {
    toggleFilterValue(activeExtraFilters, 'extra', value);
  };

  const clear = (): void => {
    activeStatusFilters.value = [];
    activePriorityFilters.value = [];
    activeDueFilters.value = [];
    activeUpdatedFilters.value = [];
    activeGroupFilters.value = [];
    activeExtraFilters.value = [];
    expressionState.value = [];
  };

  const hasActive = computed(() =>
    activeStatusFilters.value.length > 0
    || activePriorityFilters.value.length > 0
    || activeDueFilters.value.length > 0
    || activeUpdatedFilters.value.length > 0
    || activeGroupFilters.value.length > 0
    || activeExtraFilters.value.length > 0
  );

  const count = computed(() =>
    activeStatusFilters.value.length
    + activePriorityFilters.value.length
    + activeDueFilters.value.length
    + activeUpdatedFilters.value.length
    + activeGroupFilters.value.length
    + activeExtraFilters.value.length
  );

  const findLabel = <T extends string>(opts: Array<TaskFilterOption<T>>, value: T): string => {
    return opts.find(option => option.value === value)?.label || value;
  };

  const chips = computed<TaskFilterChip[]>(() => [
    ...activeStatusFilters.value.map(value => ({
      key: `status:${value}`,
      group: 'status' as const,
      value,
      label: findLabel(options.statusOptions, value)
    })),
    ...activePriorityFilters.value.map(value => ({
      key: `priority:${value}`,
      group: 'priority' as const,
      value,
      label: findLabel(options.priorityOptions, value)
    })),
    ...activeDueFilters.value.map(value => ({
      key: `due:${value}`,
      group: 'due' as const,
      value,
      label: findLabel(options.dueOptions, value)
    })),
    ...activeUpdatedFilters.value.map(value => ({
      key: `updated:${value}`,
      group: 'updated' as const,
      value,
      label: findLabel(options.updatedOptions, value)
    })),
    ...activeGroupFilters.value.map(value => ({
      key: `group:${value}`,
      group: 'group' as const,
      value,
      label: findLabel(groupOptions.value, value),
      style: options.buildActiveGroupStyle?.(value)
    })),
    ...activeExtraFilters.value.map(value => ({
      key: `extra:${value}`,
      group: 'extra' as const,
      value,
      label: findLabel(options.extraOptions, value)
    }))
  ]);

  const expression = computed<TaskFilterExpressionItem[]>(() => {
    const chipMap = new Map(chips.value.map(chip => [`${chip.group}:${chip.value}`, chip]));
    return expressionState.value.flatMap(item => {
      const chip = chipMap.get(`${item.group}:${item.value}`);
      return chip ? [{ ...chip, join: item.join }] : [];
    });
  });

  const restoreExpression = (stored: unknown): void => {
    const chipMap = new Map(chips.value.map(chip => [`${chip.group}:${chip.value}`, chip]));
    const restored: StoredTaskFilterExpressionItem[] = [];
    const seen = new Set<string>();
    if (Array.isArray(stored)) {
      for (const raw of stored) {
        if (!raw || typeof raw !== 'object') continue;
        const item = raw as Partial<StoredTaskFilterExpressionItem>;
        const key = `${item.group}:${item.value}`;
        if (!chipMap.has(key) || seen.has(key)) continue;
        restored.push({
          group: item.group as TaskFilterSectionKey,
          value: item.value as string,
          join: item.join === 'or' || item.join === 'not' ? item.join : 'and'
        });
        seen.add(key);
      }
    }

    for (const chip of chips.value) {
      const key = `${chip.group}:${chip.value}`;
      if (seen.has(key)) continue;
      const previous = restored[restored.length - 1];
      restored.push({
        group: chip.group,
        value: chip.value,
        join: previous?.group === chip.group ? 'or' : 'and'
      });
    }
    expressionState.value = restored;
  };

  const cycleExpressionJoin = (index: number): void => {
    if (index <= 0 || index >= expressionState.value.length) return;
    const joins: TaskFilterJoin[] = ['and', 'or', 'not'];
    const current = expressionState.value[index];
    const nextJoin = joins[(joins.indexOf(current.join) + 1) % joins.length];
    expressionState.value = expressionState.value.map((item, itemIndex) => (
      itemIndex === index ? { ...item, join: nextJoin } : item
    ));
  };

  watch(
    [
      activeStatusFilters,
      activePriorityFilters,
      activeDueFilters,
      activeUpdatedFilters,
      activeGroupFilters,
      activeExtraFilters
    ],
    () => restoreExpression(expressionState.value)
  );

  const sections = computed<TaskFilterSection[]>(() => [
    {
      key: 'status',
      title: sectionTitles.status,
      options: options.statusOptions.map(option => ({
        value: option.value,
        label: option.label,
        active: activeStatusFilters.value.includes(option.value)
      }))
    },
    {
      key: 'priority',
      title: sectionTitles.priority,
      options: options.priorityOptions.map(option => ({
        value: option.value,
        label: option.label,
        active: activePriorityFilters.value.includes(option.value)
      }))
    },
    {
      key: 'group',
      title: sectionTitles.group,
      options: groupOptions.value.map(option => ({
        value: option.value,
        label: option.label,
        active: activeGroupFilters.value.includes(option.value),
        style: option.style
      }))
    },
    {
      key: 'due',
      title: sectionTitles.due,
      options: options.dueOptions.map(option => ({
        value: option.value,
        label: option.label,
        active: activeDueFilters.value.includes(option.value)
      }))
    },
    {
      key: 'updated',
      title: sectionTitles.updated,
      options: options.updatedOptions.map(option => ({
        value: option.value,
        label: option.label,
        active: activeUpdatedFilters.value.includes(option.value)
      }))
    },
    {
      key: 'extra',
      title: sectionTitles.extra,
      options: options.extraOptions.map(option => ({
        value: option.value,
        label: option.label,
        active: activeExtraFilters.value.includes(option.value)
      }))
    }
  ]);

  const handleToggle = (sectionKey: TaskFilterSectionKey, value: string): void => {
    switch (sectionKey) {
      case 'status':
        toggleStatus(value as TStatus);
        return;
      case 'priority':
        togglePriority(value as TPriority);
        return;
      case 'group':
        toggleGroup(value);
        return;
      case 'due':
        toggleDue(value as TDue);
        return;
      case 'updated':
        toggleUpdated(value as TUpdated);
        return;
      case 'extra':
        toggleExtra(value as TExtra);
        return;
    }
  };

  return {
    activeStatusFilters,
    activePriorityFilters,
    activeDueFilters,
    activeUpdatedFilters,
    activeGroupFilters,
    activeExtraFilters,
    hasActive,
    count,
    chips,
    expression,
    sections,
    toggleStatus,
    togglePriority,
    toggleDue,
    toggleUpdated,
    toggleGroup,
    toggleExtra,
    clear,
    handleToggle,
    restoreExpression,
    cycleExpressionJoin
  };
}
