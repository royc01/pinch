import { describe, expect, it } from 'vitest';
import type { Task } from '@/api';
import type { GoalListItem } from '@/composables/useGoals';
import { buildGoalNextActions, buildGoalWeeklyProgress } from './personalStatsGoalActions';

function task(id: string, overrides: Partial<Task> = {}): Task {
  return { id, blockId: id, type: 'block', title: id, status: 'pending', priority: 'none', tags: [],
    notebookId: 'nb', rootId: 'doc', createdAt: '2026-10-01', updatedAt: '2026-10-01', ...overrides };
}
function goal(id: string, overrides: Partial<GoalListItem> = {}): GoalListItem {
  return { id, name: id, members: [{ notebookId: 'nb', documentId: 'doc' }], documentCount: 1,
    taskMemberCount: 0, scopeCount: 1, documentSummary: '', status: 'in-progress',
    totalTasks: 2, completedTasks: 1, remainingTasks: 1, progressPercent: 50, ...overrides };
}

describe('personalStatsGoalActions', () => {
  it('groups actual weekly completions by current membership, retains archives, and deduplicates shared tasks', () => {
    const now = new Date(2026, 9, 8, 12);
    const tasks = [
      task('monday', { status: 'completed', completedAt: new Date(2026, 9, 5).toISOString() }),
      task('archive', { status: 'completed', archived: true, completedAt: new Date(2026, 9, 8, 10).toISOString() }),
      task('direct', { rootId: 'other-doc', status: 'completed', completedAt: '2026-10-06' }),
      task('prior-week', { status: 'completed', completedAt: new Date(2026, 9, 4, 23, 59).toISOString() }),
      task('future-day', { status: 'completed', completedAt: new Date(2026, 9, 9).toISOString() }),
      task('future-time', { status: 'completed', completedAt: new Date(2026, 9, 8, 13).toISOString() }),
      task('virtual', { status: 'completed', isVirtual: true, completedAt: '2026-10-06' }),
      task('invalid', { status: 'completed', completedAt: 'invalid' }),
      task('missing', { status: 'completed', updatedAt: '2026-10-06' }),
      task('reopened', { completedAt: '2026-10-06' }),
      task('excluded', { status: 'completed', completedAt: '2026-10-06' })
    ];
    const goals = [goal('first', { taskMembers: [{ taskId: 'direct' }], excludedTaskMembers: [{ taskId: 'excluded' }] }),
      goal('second', { status: 'completed', excludedTaskMembers: [{ taskId: 'excluded' }] }), goal('empty', { members: [] })];
    const result = buildGoalWeeklyProgress(goals, tasks, '2026-10-08', now);
    expect(result).toMatchObject({ startKey: '2026-10-05', endKey: '2026-10-08', taskCount: 3 });
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].tasks.map(task => task.id)).toEqual(['archive', 'direct', 'monday']);
    expect(result.entries[1].tasks.map(task => task.id)).toEqual(['archive', 'monday']);
    expect(result.entries[1].goal.status).toBe('completed');
    expect(tasks[0].id).toBe('monday');
  });

  it('uses local completion dates at week boundaries and refreshes on Mondays or reopened tasks', () => {
    const sunday = new Date(2026, 9, 11, 12);
    const mondayTask = task('monday', { status: 'completed', completedAt: new Date(2026, 9, 5).toISOString() });
    const priorSunday = task('sunday', { status: 'completed', completedAt: new Date(2026, 9, 4, 23, 59).toISOString() });
    const before = buildGoalWeeklyProgress([goal('g')], [mondayTask, priorSunday], '2026-10-11', sunday);
    expect(before.startKey).toBe('2026-10-05');
    expect(before.taskCount).toBe(1);
    expect(buildGoalWeeklyProgress([goal('g')], [mondayTask], '2026-10-12', new Date(2026, 9, 12, 12)).taskCount).toBe(0);
    expect(buildGoalWeeklyProgress([goal('g')], [mondayTask, { ...mondayTask, status: 'pending' }], '2026-10-11', sunday).taskCount).toBe(0);
    expect(buildGoalWeeklyProgress([goal('g')], [task('bad-day', { status: 'completed', completedAt: '2026-02-30' })], '2026-03-02', new Date(2026, 2, 2, 12)).taskCount).toBe(0);
  });

  it('recommends overdue, in-progress, due within seven days, then other tasks in that order', () => {
    const tasks = [task('pending', { priority: 'high' }), task('day8', { dueDate: '2026-10-16' }),
      task('day7', { dueDate: '2026-10-15' }), task('ongoing', { status: 'in-progress' }),
      task('overdue', { status: 'delayed', dueDate: '2026-10-07' })];
    const expectNext = (candidates: Task[], id: string, reason: string) => {
      expect(buildGoalNextActions([goal('goal')], candidates, '2026-10-08')[0]).toMatchObject({ task: { id }, reason });
    };
    expectNext(tasks, 'overdue', 'overdue');
    expectNext(tasks.slice(0, -1), 'ongoing', 'in-progress');
    expectNext(tasks.slice(0, -2), 'day7', 'upcoming');
    expectNext(tasks.slice(0, 2), 'pending', 'pending');
    expectNext([task('today', { dueDate: '2026-10-08' })], 'today', 'upcoming');
  });

  it('uses explicit and inherited membership including exclusions and filters non-countable tasks', () => {
    const tasks = [
      task('excluded', { dueDate: '2026-01-01' }), task('archived', { archived: true }),
      task('completed', { status: 'completed' }), task('cancelled', { status: 'cancelled' }),
      task('virtual', { isVirtual: true }), task('other-notebook', { notebookId: 'other', dueDate: '2026-01-01' }),
      task('no-root', { rootId: undefined }), task('no-block', { blockId: undefined }),
      task('child', { rootId: 'child-doc', hPath: '/Project/Child' }),
      task('direct', { rootId: 'unrelated-doc', notebookId: 'other', priority: 'high' })
    ];
    const goals = [goal('inherited', { members: [{ notebookId: 'nb', documentId: 'doc', path: '/Project' }], excludedTaskMembers: [{ taskId: 'excluded' }] }),
      goal('direct', { members: [], taskMembers: [{ taskId: 'direct' }] })];
    const results = buildGoalNextActions(goals, tasks, '2026-10-08');
    expect(results.find(entry => entry.goal.id === 'inherited')?.task?.id).toBe('child');
    expect(results.find(entry => entry.goal.id === 'direct')?.task?.id).toBe('direct');
  });

  it('breaks ties by deadline time and priority, deduplicates snapshots, and keeps custom open statuses', () => {
    const g = goal('g');
    const late = task('late', { dueDate: '2026-10-09', dueTime: '18:00', priority: 'high' });
    const early = task('early', { dueDate: '2026-10-09', dueTime: '09:00' });
    expect(buildGoalNextActions([g], [late, early], '2026-10-08')[0].task?.id).toBe('early');
    const high = task('high', { status: 'reviewing', priority: 'high' });
    const low = task('low', { priority: 'low' });
    expect(buildGoalNextActions([g], [low, high], '2026-10-08')[0].task?.id).toBe('high');
    expect(buildGoalNextActions([g], [high, low, { ...high, status: 'completed' }], '2026-10-08')[0].task?.id).toBe('low');
  });

  it('omits completed goals, retains empty goals with no recommendation, and permits shared tasks across goals', () => {
    const goals = [goal('complete', { status: 'completed' }), goal('first'), goal('second'),
      goal('empty', { members: [], status: 'empty', totalTasks: 0, completedTasks: 0, progressPercent: 0 })];
    const result = buildGoalNextActions(goals, [task('shared')], '2026-10-08');
    expect(result.map(entry => entry.goal.id)).toEqual(['first', 'second', 'empty']);
    expect(result.map(entry => entry.task?.id)).toEqual(['shared', 'shared', undefined]);
    expect(result[2].reason).toBeNull();
    expect(goals).toHaveLength(4);
  });

  it('refreshes recommendations when deadlines, completion, or the current day change across months', () => {
    const g = goal('g');
    const future = task('future', { dueDate: '2026-11-07' });
    const other = task('other', { priority: 'high' });
    expect(buildGoalNextActions([g], [future, other], '2026-10-30')[0].task?.id).toBe('other');
    expect(buildGoalNextActions([g], [future, other], '2026-10-31')[0].task?.id).toBe('future');
    expect(buildGoalNextActions([g], [{ ...future, dueDate: '2026-11-20' }, other], '2026-10-31')[0].task?.id).toBe('other');
    expect(buildGoalNextActions([g], [{ ...future, status: 'completed' }, other], '2026-10-31')[0].task?.id).toBe('other');
  });
});
