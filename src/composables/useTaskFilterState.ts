import { computed, ref, unref, type Ref } from 'vue';

export type TaskFilterSectionKey = 'status' | 'priority' | 'group' | 'due' | 'updated' | 'extra';

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
  const activeStatusFilters = ref<TStatus[]>([]);
  const activePriorityFilters = ref<TPriority[]>([]);
  const activeDueFilters = ref<TDue[]>([]);
  const activeUpdatedFilters = ref<TUpdated[]>([]);
  const activeGroupFilters = ref<string[]>([]);
  const activeExtraFilters = ref<TExtra[]>([]);

  const groupOptions = computed(() => {
    const resolved = unref(options.groupOptions);
    return Array.isArray(resolved) ? resolved : [];
  });

  const sectionTitles: Record<TaskFilterSectionKey, string> = {
    status: '状态',
    priority: '优先级',
    group: '分组',
    due: '截止日期',
    updated: '日期更新',
    extra: '其他',
    ...options.sectionTitles
  };

  const toggleFilterValue = <T extends string>(filterRef: Ref<T[]>, value: T): void => {
    filterRef.value = filterRef.value.includes(value)
      ? filterRef.value.filter(item => item !== value)
      : [...filterRef.value, value];
  };

  const toggleStatus = (value: TStatus): void => {
    toggleFilterValue(activeStatusFilters, value);
  };

  const togglePriority = (value: TPriority): void => {
    toggleFilterValue(activePriorityFilters, value);
  };

  const toggleDue = (value: TDue): void => {
    toggleFilterValue(activeDueFilters, value);
  };

  const toggleUpdated = (value: TUpdated): void => {
    if (options.updatedSingle === false) {
      toggleFilterValue(activeUpdatedFilters, value);
      return;
    }
    activeUpdatedFilters.value = activeUpdatedFilters.value.includes(value)
      ? []
      : [value];
  };

  const toggleGroup = (value: string): void => {
    toggleFilterValue(activeGroupFilters, value);
  };

  const toggleExtra = (value: TExtra): void => {
    toggleFilterValue(activeExtraFilters, value);
  };

  const clear = (): void => {
    activeStatusFilters.value = [];
    activePriorityFilters.value = [];
    activeDueFilters.value = [];
    activeUpdatedFilters.value = [];
    activeGroupFilters.value = [];
    activeExtraFilters.value = [];
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
    sections,
    toggleStatus,
    togglePriority,
    toggleDue,
    toggleUpdated,
    toggleGroup,
    toggleExtra,
    clear,
    handleToggle
  };
}
