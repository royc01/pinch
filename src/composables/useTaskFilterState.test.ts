import { describe, expect, it } from 'vitest';
import {
  matchesTaskFilterExpression,
  useTaskFilterState,
  type StoredTaskFilterExpressionItem
} from './useTaskFilterState';

describe('task filter expression', () => {
  it('evaluates connectors strictly from left to right', () => {
    const expression: StoredTaskFilterExpressionItem[] = [
      { group: 'status', value: 'a', join: 'and' },
      { group: 'status', value: 'b', join: 'or' },
      { group: 'priority', value: 'c', join: 'not' }
    ];
    const matches = (values: string[]) => matchesTaskFilterExpression(
      values,
      expression,
      (selected, condition) => selected.includes(condition.value)
    );

    expect(matches(['a', 'c'])).toBe(false);
    expect(matches(['b'])).toBe(true);
    expect(matches(['c'])).toBe(false);
  });

  it('defaults same-section chips to OR and cross-section chips to AND', () => {
    const state = useTaskFilterState({
      statusOptions: [
        { value: 'pending', label: 'Pending' },
        { value: 'completed', label: 'Completed' }
      ],
      priorityOptions: [{ value: 'high', label: 'High' }],
      dueOptions: [],
      updatedOptions: [],
      extraOptions: [],
      groupOptions: []
    });

    state.handleToggle('status', 'pending');
    state.handleToggle('priority', 'high');
    state.handleToggle('status', 'completed');

    expect(state.expression.value.map(({ group, value, join }) => ({ group, value, join }))).toEqual([
      { group: 'status', value: 'pending', join: 'and' },
      { group: 'status', value: 'completed', join: 'or' },
      { group: 'priority', value: 'high', join: 'and' }
    ]);

    state.cycleExpressionJoin(2);
    expect(state.expression.value[2]?.join).toBe('or');
    state.cycleExpressionJoin(2);
    expect(state.expression.value[2]?.join).toBe('not');
  });

  it('restores saved order and appends legacy selections', () => {
    const state = useTaskFilterState({
      statusOptions: [{ value: 'pending', label: 'Pending' }],
      priorityOptions: [{ value: 'high', label: 'High' }],
      dueOptions: [],
      updatedOptions: [],
      extraOptions: [],
      groupOptions: []
    });
    state.activeStatusFilters.value = ['pending'];
    state.activePriorityFilters.value = ['high'];

    state.restoreExpression([
      { group: 'priority', value: 'high', join: 'and' }
    ]);

    expect(state.expression.value.map(({ group, value, join }) => ({ group, value, join }))).toEqual([
      { group: 'priority', value: 'high', join: 'and' },
      { group: 'status', value: 'pending', join: 'and' }
    ]);
  });
});
