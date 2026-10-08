<template>
  <section class="goal-workbench">
    <header class="goal-workbench-head">
      <h3>{{ t('personalStats.goalsTitle') }}</h3>
      <small>{{ t('personalStats.goalWorkbenchScope') }}</small>
      <div class="goal-workbench-actions">
        <small>{{ formatTemplate('personalStats.completedGoalsChipTemplate', { completed: completedCount, total: goals.length }) }}</small>
        <small>{{ formatTemplate('personalStats.goalActiveProgressTemplate', { progress: activeProgress }) }}</small>
        <button type="button" @click="emit('open-manager')">{{ t('personalStats.goalsPanelLink') }}</button>
      </div>
    </header>
    <p v-if="!goals.length" class="goal-workbench-empty">{{ t('personalStats.noGoals') }}</p>
    <section class="goal-focus-section">
      <header class="goal-next-actions-head">
        <h4>{{ t('personalStats.goalFocusTitle') }}</h4>
        <small>{{ t('personalStats.goalFocusScope') }}</small>
        <span class="goal-workbench-count">{{ focusGoals.length }}/3</span>
      </header>
      <p v-if="focusSaveError" class="goal-focus-error" role="alert">{{ t('personalStats.goalFocusSaveFailed') }}</p>
      <p v-if="!focusGoals.length" class="goal-workbench-empty">{{ t('personalStats.goalFocusEmpty') }}</p>
      <div v-else class="goal-focus-grid">
        <article v-for="goal in focusGoals" :key="goal.id" class="goal-workbench-item goal-focus-card" :data-focus-goal-id="goal.id">
          <div class="goal-workbench-item-head">
            <button type="button" class="goal-workbench-name" :title="plainName(goal)" @click="emit('open-detail', goal.id)">
              <EmojiIcon v-if="goal.emoji" class="goal-workbench-icon" :value="goal.emoji" aria-hidden="true" /><span>{{ plainName(goal) }}</span>
            </button>
            <strong>{{ goal.progressPercent }}%</strong>
            <button type="button" class="goal-focus-toggle is-focused" :aria-label="focusToggleLabel(goal)" :title="focusToggleLabel(goal)" :aria-pressed="true" @click="toggleFocusGoal(goal)"><Icon name="star" width="14" height="14" aria-hidden="true" /></button>
          </div>
          <div class="goal-workbench-track" role="progressbar" :aria-label="plainName(goal)" :aria-valuenow="goal.progressPercent" aria-valuemin="0" aria-valuemax="100"><span :style="{ width: `${goal.progressPercent}%` }"></span></div>
          <small>{{ deadlineLabel(goal) }}</small>
          <button v-if="focusNextTask(goal.id)" type="button" class="goal-focus-next-task" @click="emit('open-task', focusNextTask(goal.id)!)">{{ formatTemplate('personalStats.goalFocusNextTask', { title: getTaskTitlePlainText(focusNextTask(goal.id)!.title) }) }}</button>
          <div class="goal-workbench-footer">
            <small>{{ formatTemplate('personalStats.goalTasksTemplate', { completed: goal.completedTasks, total: goal.totalTasks }) }}</small>
            <button v-if="goal.status !== 'empty'" type="button" @click="emit('open-goal', goal)">{{ t('personalStats.goalViewTasks') }}</button>
            <button type="button" class="goal-add-task" @click="emit('create-task', goal.id)">{{ t('personalStats.goalAddTask') }}</button>
          </div>
        </article>
      </div>
    </section>
    <div class="goal-workbench-grid">
      <article v-for="group in groups" :key="group.id" class="goal-workbench-card" :class="`goal-workbench-${group.id}`">
        <header>
          <strong>{{ t(group.titleKey) }} <span class="goal-workbench-count">{{ group.items.length }}</span></strong>
          <small>{{ t(group.scopeKey) }}</small>
        </header>
        <p v-if="!group.items.length" class="goal-workbench-empty">{{ t(group.emptyKey) }}</p>
        <div v-else class="goal-workbench-list">
          <div v-for="goal in group.items.slice(0, expanded[group.id] ? undefined : 5)" :key="goal.id" class="goal-workbench-item" :data-goal-id="goal.id">
            <div class="goal-workbench-item-head">
              <button type="button" class="goal-workbench-name" :title="plainName(goal)" @click="emit('open-detail', goal.id)">
                <EmojiIcon v-if="goal.emoji" class="goal-workbench-icon" :value="goal.emoji" aria-hidden="true" />
                <span>{{ plainName(goal) }}</span>
              </button>
              <strong>{{ goal.progressPercent }}%</strong>
              <button v-if="goal.status !== 'completed'" type="button" class="goal-focus-toggle" :class="{ 'is-focused': isFocused(goal.id) }" :aria-label="focusToggleLabel(goal)" :title="focusToggleLabel(goal)" :aria-pressed="isFocused(goal.id)" :disabled="!isFocused(goal.id) && focusGoals.length >= 3" @click="toggleFocusGoal(goal)"><Icon name="star" width="14" height="14" aria-hidden="true" /></button>
            </div>
            <div class="goal-workbench-track" role="progressbar" :aria-label="plainName(goal)" :aria-valuenow="goal.progressPercent" aria-valuemin="0" aria-valuemax="100"><span :style="{ width: `${goal.progressPercent}%` }"></span></div>
            <div class="goal-workbench-deadline" :class="{ 'is-overdue': goal.status !== 'completed' && (deadlineDays(goal) ?? 0) < 0, 'is-today': goal.status !== 'completed' && deadlineDays(goal) === 0 }">
              <small>{{ deadlineLabel(goal) }}</small>
              <small v-if="goal.status === 'empty'">{{ t('personalStats.goalStatusPending') }}</small>
            </div>
            <div class="goal-workbench-footer">
              <small>{{ formatTemplate('personalStats.goalTasksTemplate', { completed: goal.completedTasks, total: goal.totalTasks }) }}</small>
              <button v-if="goal.status !== 'empty'" type="button" @click="emit('open-goal', goal)">{{ t('personalStats.goalViewTasks') }}</button>
              <button type="button" class="goal-add-task" @click="emit('create-task', goal.id)">{{ t('personalStats.goalAddTask') }}</button>
            </div>
            <small class="goal-workbench-scope">{{ scopeLabel(goal) }}</small>
          </div>
        </div>
        <button v-if="group.items.length > 5" type="button" class="goal-workbench-toggle" :aria-expanded="expanded[group.id]" @click="expanded[group.id] = !expanded[group.id]">{{ expanded[group.id] ? t('personalStats.collapseCardList') : formatTemplate('personalStats.expandCardListTemplate', { count: group.items.length }) }}</button>
      </article>
    </div>
    <div class="goal-activity-panels">
    <section class="goal-next-actions">
      <header class="goal-next-actions-head">
        <h4>{{ t('personalStats.goalNextActionsTitle') }}</h4>
        <small>{{ t('personalStats.goalNextActionsScope') }}</small>
        <span class="goal-workbench-count">{{ nextActions.length }}</span>
      </header>
      <slot name="notice" />
      <p v-if="tasksLoading && !tasks.length" class="goal-workbench-empty">{{ t('personalStats.goalActionsLoading') }}</p>
      <p v-else-if="!nextActions.length" class="goal-workbench-empty">{{ t('personalStats.goalNoNextActions') }}</p>
      <div v-else class="goal-next-actions-list">
        <article v-for="entry in nextActions.slice(0, showAllActions ? undefined : 5)" :key="entry.goal.id" class="goal-next-action" :data-goal-id="entry.goal.id" :aria-busy="!!entry.task && pendingTaskIds.includes(entry.task.id)">
          <button type="button" class="goal-next-action-goal goal-workbench-name" :title="plainName(entry.goal)" @click="emit('open-detail', entry.goal.id)">
            <EmojiIcon v-if="entry.goal.emoji" class="goal-workbench-icon" :value="entry.goal.emoji" aria-hidden="true" />
            <span>{{ plainName(entry.goal) }}</span>
          </button>
          <div class="goal-next-action-body">
            <template v-if="entry.task">
              <button type="button" class="goal-next-action-task" @click="emit('open-task', entry.task)">{{ getTaskTitlePlainText(entry.task.title) }}</button>
              <div class="goal-next-action-meta"><small :class="{ 'is-overdue': entry.reason === 'overdue' }">{{ t(reasonKeys[entry.reason!]) }}</small><small v-if="entry.task.dueDate">{{ entry.task.dueDate }} {{ entry.task.dueTime }}</small></div>
            </template>
            <small v-else>{{ t(entry.goal.status === 'empty' ? 'personalStats.goalStartWithTask' : 'personalStats.goalNoActionableTask') }}</small>
          </div>
          <div class="goal-next-action-buttons"><slot v-if="entry.task" name="task-actions" :task="entry.task" :goal="entry.goal" /><button type="button" class="goal-add-task" @click="emit('create-task', entry.goal.id)">{{ t('personalStats.goalAddTask') }}</button></div>
          <slot v-if="entry.task" name="task-details" :task="entry.task" :goal="entry.goal" />
        </article>
      </div>
      <button v-if="nextActions.length > 5" type="button" class="goal-workbench-toggle" :aria-expanded="showAllActions" @click="showAllActions = !showAllActions">{{ showAllActions ? t('personalStats.collapseCardList') : formatTemplate('personalStats.expandCardListTemplate', { count: nextActions.length }) }}</button>
    </section>
    <section class="goal-weekly-progress">
      <header class="goal-next-actions-head">
        <h4>{{ t('personalStats.goalWeeklyTitle') }}</h4>
        <small>{{ weeklyProgress.startKey }} — {{ weeklyProgress.endKey }}</small>
        <span class="goal-workbench-count">{{ formatTemplate('personalStats.goalWeeklySummary', { tasks: weeklyProgress.taskCount, goals: weeklyProgress.entries.length }) }}</span>
      </header>
      <small>{{ t('personalStats.goalWeeklyScope') }}</small>
      <p v-if="tasksLoading && !tasks.length" class="goal-workbench-empty">{{ t('personalStats.goalActionsLoading') }}</p>
      <p v-else-if="!weeklyProgress.entries.length" class="goal-workbench-empty">{{ t('personalStats.goalWeeklyEmpty') }}</p>
      <div v-else class="goal-weekly-list">
        <article v-for="entry in weeklyProgress.entries.slice(0, showAllWeekly ? undefined : 5)" :key="entry.goal.id" class="goal-workbench-item goal-weekly-entry" :data-weekly-goal-id="entry.goal.id">
          <div class="goal-workbench-item-head">
            <button type="button" class="goal-workbench-name" :title="plainName(entry.goal)" @click="emit('open-detail', entry.goal.id)"><EmojiIcon v-if="entry.goal.emoji" class="goal-workbench-icon" :value="entry.goal.emoji" aria-hidden="true" /><span>{{ plainName(entry.goal) }}</span></button>
            <small>{{ formatTemplate('personalStats.goalWeeklyCompleted', { count: entry.tasks.length }) }}</small>
            <button type="button" class="goal-weekly-detail-toggle" :aria-expanded="expandedWeeklyIds.includes(entry.goal.id)" @click="toggleWeeklyDetails(entry.goal.id)">{{ t(expandedWeeklyIds.includes(entry.goal.id) ? 'personalStats.collapseCardList' : 'personalStats.goalWeeklyDetails') }}</button>
          </div>
          <div v-if="expandedWeeklyIds.includes(entry.goal.id)" class="goal-weekly-task-list">
            <button v-for="task in entry.tasks.slice(0, expandedWeeklyTaskIds.includes(entry.goal.id) ? undefined : 5)" :key="task.id" type="button" class="goal-weekly-task" :disabled="!task.blockId" @click="emit('open-task', task)"><span>{{ getTaskTitlePlainText(task.title) }}</span><small>{{ completionLabel(task) }}<span v-if="task.archived"> · {{ t('personalStats.goalWeeklyArchived') }}</span></small></button>
            <button v-if="entry.tasks.length > 5" type="button" class="goal-workbench-toggle" :aria-expanded="expandedWeeklyTaskIds.includes(entry.goal.id)" @click="toggleWeeklyTasks(entry.goal.id)">{{ expandedWeeklyTaskIds.includes(entry.goal.id) ? t('personalStats.collapseCardList') : formatTemplate('personalStats.expandCardListTemplate', { count: entry.tasks.length }) }}</button>
          </div>
          <small v-else class="goal-weekly-latest">{{ formatTemplate('personalStats.goalWeeklyLatest', { title: getTaskTitlePlainText(entry.tasks[0].title) }) }}</small>
        </article>
      </div>
      <button v-if="weeklyProgress.entries.length > 5" type="button" class="goal-workbench-toggle" :aria-expanded="showAllWeekly" @click="showAllWeekly = !showAllWeekly">{{ showAllWeekly ? t('personalStats.collapseCardList') : formatTemplate('personalStats.expandCardListTemplate', { count: weeklyProgress.entries.length }) }}</button>
    </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { GoalListItem } from '@/composables/useGoals';
import { formatTemplate, useI18n } from '@/composables/useI18n';
import { getTaskTitlePlainText } from '@/utils/taskHtml';
import EmojiIcon from './EmojiIcon.vue';
import Icon from './Icon.vue';
import type { Task } from '@/api';
import { buildGoalNextActions, buildGoalWeeklyProgress, type GoalActionReason } from '@/utils/personalStatsGoalActions';
import { formatSummaryDateKey } from '@/utils/personalStatsSummary';

const props = withDefaults(defineProps<{ goals: GoalListItem[]; todayKey: string; tasks?: Task[]; tasksLoading?: boolean; pendingTaskIds?: string[] }>(), { tasks: () => [], tasksLoading: false, pendingTaskIds: () => [] });
const emit = defineEmits<{
  (event: 'open-manager'): void;
  (event: 'open-detail', goalId: string): void;
  (event: 'open-goal', goal: GoalListItem): void;
  (event: 'create-task', goalId: string): void;
  (event: 'open-task', task: Task): void;
}>();
const { t } = useI18n();
type GroupId = 'attention' | 'progress' | 'pending' | 'completed';
const expanded = ref<Record<GroupId, boolean>>({ attention: false, progress: false, pending: false, completed: false });
const showAllActions = ref(false);
const nextActions = computed(() => buildGoalNextActions(props.goals, props.tasks, props.todayKey).sort((left, right) => focusRank(left.goal.id) - focusRank(right.goal.id)));
const weeklyProgress = computed(() => buildGoalWeeklyProgress(props.goals, props.tasks, props.todayKey));
const showAllWeekly = ref(false);
const expandedWeeklyIds = ref<string[]>([]);
const expandedWeeklyTaskIds = ref<string[]>([]);
const FOCUS_GOALS_KEY = 'pinch.personal-stats.focus-goals';
const focusSaveError = ref(false);
function parseFocusIds(raw: string | null): string[] {
  try {
    const value: unknown = JSON.parse(raw || '[]');
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string').map(id => id.trim()).filter(Boolean))].slice(0, 3) : [];
  } catch { return []; }
}
const focusIds = ref<string[]>((() => { try { return parseFocusIds(window.localStorage.getItem(FOCUS_GOALS_KEY)); } catch { return []; } })());
const focusGoals = computed(() => focusIds.value.map(id => props.goals.find(goal => goal.id === id && goal.status !== 'completed')).filter((goal): goal is GoalListItem => !!goal));
function isFocused(id: string): boolean { return focusGoals.value.some(goal => goal.id === id); }
function focusRank(id: string): number { const index = focusGoals.value.findIndex(goal => goal.id === id); return index >= 0 ? index : 3; }
function focusToggleLabel(goal: GoalListItem): string { return formatTemplate(isFocused(goal.id) ? 'personalStats.goalFocusRemove' : 'personalStats.goalFocusAdd', { name: plainName(goal) }); }
function toggleFocusGoal(goal: GoalListItem): void {
  if (goal.status === 'completed') return;
  try {
    // Read the latest saved selection so multiple workbench windows do not
    // overwrite each other's pins. Drop inactive IDs only during an explicit edit.
    const current = parseFocusIds(window.localStorage.getItem(FOCUS_GOALS_KEY)).filter(id => props.goals.some(item => item.id === id && item.status !== 'completed'));
    const next = current.includes(goal.id) ? current.filter(id => id !== goal.id) : current.length < 3 ? [...current, goal.id] : current;
    window.localStorage.setItem(FOCUS_GOALS_KEY, JSON.stringify(next));
    focusIds.value = next;
    focusSaveError.value = false;
  } catch { focusSaveError.value = true; }
}
function handleFocusStorage(event: StorageEvent): void {
  if (event.key === FOCUS_GOALS_KEY || event.key === null) { focusIds.value = parseFocusIds(event.newValue); focusSaveError.value = false; }
}
onMounted(() => window.addEventListener('storage', handleFocusStorage));
onBeforeUnmount(() => window.removeEventListener('storage', handleFocusStorage));
function focusNextTask(goalId: string): Task | null { return nextActions.value.find(entry => entry.goal.id === goalId)?.task || null; }
function toggleWeeklyDetails(goalId: string): void { expandedWeeklyIds.value = expandedWeeklyIds.value.includes(goalId) ? expandedWeeklyIds.value.filter(id => id !== goalId) : [...expandedWeeklyIds.value, goalId]; }
function toggleWeeklyTasks(goalId: string): void { expandedWeeklyTaskIds.value = expandedWeeklyTaskIds.value.includes(goalId) ? expandedWeeklyTaskIds.value.filter(id => id !== goalId) : [...expandedWeeklyTaskIds.value, goalId]; }
function completionLabel(task: Task): string {
  if (!task.completedAt) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(task.completedAt)) return task.completedAt;
  const date = new Date(task.completedAt);
  return `${formatSummaryDateKey(date)} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`;
}
const reasonKeys: Record<GoalActionReason, string> = { overdue: 'personalStats.goalActionOverdue', 'in-progress': 'taskManager.statusInProgress', upcoming: 'personalStats.goalActionUpcoming', pending: 'personalStats.goalActionPending' };
const completedCount = computed(() => props.goals.filter(goal => goal.status === 'completed').length);
const activeProgress = computed(() => {
  const active = props.goals.filter(goal => goal.status !== 'completed');
  return active.length ? Math.round(active.reduce((sum, goal) => sum + goal.progressPercent, 0) / active.length) : 0;
});

// Compare calendar days independently of timezone offsets and DST. Reject invalid dates.
function calendarDay(key: string | undefined): number | null {
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date.getTime() / 86400000 : null;
}
function deadlineDays(goal: GoalListItem): number | null {
  const due = calendarDay(goal.dueDate);
  const today = calendarDay(props.todayKey);
  return due === null || today === null ? null : due - today;
}
function isAttention(goal: GoalListItem): boolean {
  const days = deadlineDays(goal);
  return goal.status !== 'completed' && days !== null && days <= 7;
}
function compareActive(left: GoalListItem, right: GoalListItem): number {
  return focusRank(left.id) - focusRank(right.id)
    || (deadlineDays(left) ?? Infinity) - (deadlineDays(right) ?? Infinity)
    || left.progressPercent - right.progressPercent
    || (left.order ?? 0) - (right.order ?? 0)
    || left.name.localeCompare(right.name);
}
const groups = computed(() => [
  { id: 'attention' as const, titleKey: 'personalStats.goalAttentionTitle', scopeKey: 'personalStats.goalAttentionScope', emptyKey: 'personalStats.goalNoAttention', items: props.goals.filter(isAttention).sort(compareActive) },
  { id: 'progress' as const, titleKey: 'personalStats.goalProgressTitle', scopeKey: 'personalStats.goalProgressScope', emptyKey: 'personalStats.goalNoProgress', items: props.goals.filter(goal => goal.status === 'in-progress' && !isAttention(goal)).sort(compareActive) },
  { id: 'pending' as const, titleKey: 'personalStats.goalStatusPending', scopeKey: 'personalStats.goalPendingScope', emptyKey: 'personalStats.goalNoPending', items: props.goals.filter(goal => goal.status === 'empty' && !isAttention(goal)).sort(compareActive) },
  { id: 'completed' as const, titleKey: 'taskManager.statusCompleted', scopeKey: 'personalStats.goalCompletedScope', emptyKey: 'personalStats.goalNoCompleted', items: props.goals.filter(goal => goal.status === 'completed').sort((left, right) => (left.order ?? 0) - (right.order ?? 0) || left.name.localeCompare(right.name)) }
]);
function plainName(goal: GoalListItem): string { return getTaskTitlePlainText(goal.name); }
function deadlineLabel(goal: GoalListItem): string {
  const days = deadlineDays(goal);
  if (days === null) return t('personalStats.noGoalDeadline');
  if (goal.status === 'completed') return goal.dueDate!;
  const relative = days === 0 ? t('personalStats.goalDueToday') : formatTemplate(days < 0 ? 'personalStats.goalDaysOverdueTemplate' : 'personalStats.goalDaysRemainingTemplate', { days: Math.abs(days) });
  return `${goal.dueDate} · ${relative}`;
}
function scopeLabel(goal: GoalListItem): string {
  const parts = [];
  if (goal.documentCount > 0) parts.push(formatTemplate('personalStats.goalDocumentsTemplate', { count: goal.documentCount }));
  if (goal.taskMemberCount > 0) parts.push(formatTemplate('personalStats.goalDirectTasksTemplate', { count: goal.taskMemberCount }));
  return parts.join(' · ') || t('personalStats.goalNoScope');
}
</script>

<style scoped>
.goal-workbench { container: goal-workbench / inline-size; }
.goal-workbench-head { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 12px; margin-bottom: 12px; }
.goal-workbench-head h3 { margin: 0; font-size: 15px; }
.goal-workbench-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 12px; margin-left: auto; }
small { color: var(--b3-theme-on-surface-light); font-size: 11px; line-height: 1.5; }
.goal-workbench-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); align-items: start; gap: 10px; }
.goal-workbench-card { display: flex; flex-direction: column; gap: 8px; min-width: 0; padding: 10px; border-radius: 6px; background: var(--b3-list-hover); }
.goal-workbench-card > header { display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
.goal-workbench-card > header > strong { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-weight: 500; }
.goal-workbench-count { font-size: 12px; color: var(--b3-theme-on-surface-light); }
.goal-workbench-list { display: flex; flex-direction: column; gap: 8px; }
.goal-workbench-item { min-width: 0; padding: 8px 10px; border: 0; border-radius: 10px; background: var(--b3-theme-background); box-shadow: var(--pinch-shadow); transition: box-shadow .2s; }
.goal-workbench-item:hover { box-shadow: 0 2px 8px rgba(0, 0, 0, .1); }
.goal-workbench-item-head { display: flex; align-items: baseline; gap: 8px; }
.goal-workbench-item-head > strong { font-size: 12px; flex-shrink: 0; }
.goal-workbench-name { display: flex; align-items: flex-start; gap: 6px; flex: 1; min-width: 0; padding: 0; border: 0; color: inherit; background: transparent; font: inherit; font-size: 13px; font-weight: 600; text-align: left; }
.goal-workbench-name > span:last-child { min-width: 0; overflow-wrap: anywhere; }
.goal-workbench-icon { flex-shrink: 0; width: 16px; height: 16px; margin-top: 1px; }
.goal-workbench-track { height: 4px; margin: 7px 0; border-radius: 4px; background: var(--b3-list-hover); overflow: hidden; }
.goal-workbench-track > span { display: block; height: 100%; background: var(--pinch-color1, var(--b3-theme-primary)); }
.goal-workbench-completed .goal-workbench-track > span { background: var(--b3-theme-success, var(--b3-theme-primary)); }
.goal-workbench-deadline { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 8px; }
.goal-workbench-deadline.is-overdue > small:first-child { color: var(--b3-theme-error); }
.goal-workbench-deadline.is-today > small:first-child { color: var(--b3-theme-primary); }
.goal-workbench-footer { display: flex; align-items: center; gap: 6px; margin-top: 5px; }
.goal-workbench-footer > small { flex: 1; min-width: 0; }
.goal-workbench-scope { display: block; margin-top: 4px; overflow-wrap: anywhere; }
.goal-workbench-footer > button, .goal-workbench-actions > button, .goal-next-action-buttons > button { padding: 3px 6px; border: 1px solid var(--b3-border-color); border-radius: 4px; color: var(--b3-theme-on-background); background: var(--b3-theme-background); font: inherit; font-size: 11px; line-height: 1.4; white-space: nowrap; }
button { cursor: pointer; }
button:focus-visible { outline: 2px solid var(--pinch-color1, var(--b3-theme-primary)); outline-offset: 2px; }
.goal-workbench-empty { margin: 0; padding: 6px 0; color: var(--b3-theme-on-surface-light); font-size: 12px; }
.goal-workbench-toggle { padding: 4px 6px; border: 0; border-radius: 6px; background: var(--b3-list-hover); color: var(--b3-theme-on-background); font: inherit; font-size: 12px; }
.goal-activity-panels { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; gap: 12px; margin-top: 14px; }
.goal-next-actions { display: flex; flex-direction: column; gap: 10px; min-width: 0; padding: 10px; border-radius: 6px; background: var(--b3-list-hover); }
.goal-next-actions-head { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 12px; }
.goal-next-actions-head h4 { margin: 0; font-size: 13px; font-weight: 500; }
.goal-next-actions-head > span { margin-left: auto; }
.goal-next-actions-list { display: flex; flex-direction: column; gap: 8px; }
.goal-next-action { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 12px; padding: 8px 10px; border-radius: 10px; background: var(--b3-theme-background); box-shadow: var(--pinch-shadow); }
.goal-next-action:hover { box-shadow: 0 2px 8px rgba(0, 0, 0, .1); }
.goal-next-action-goal { flex: 0 1 180px; }
.goal-next-action-body { flex: 1; min-width: 160px; }
.goal-next-action-task { padding: 0; border: 0; color: var(--b3-theme-on-background); background: transparent; font: inherit; font-size: 13px; text-align: left; overflow-wrap: anywhere; }
.goal-next-action-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 3px; }
.goal-next-action-meta .is-overdue { color: var(--b3-theme-error); }
.goal-next-action-buttons { display: flex; align-items: center; gap: 4px; margin-left: auto; }
.goal-focus-section, .goal-weekly-progress { display: flex; flex-direction: column; gap: 8px; padding: 10px; border-radius: 6px; background: var(--b3-list-hover); }
.goal-focus-section { margin-bottom: 12px; }
.goal-focus-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.goal-focus-toggle { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; padding: 2px; border: 0; border-radius: 4px; background: transparent; color: var(--b3-theme-on-surface-light); }
.goal-focus-toggle.is-focused { color: var(--b3-theme-primary); background: var(--b3-list-hover); }
.goal-focus-toggle:disabled { cursor: default; opacity: .35; }
.goal-focus-next-task { display: block; margin-top: 6px; padding: 0; border: 0; background: transparent; color: var(--b3-theme-on-background); font: inherit; font-size: 12px; text-align: left; overflow-wrap: anywhere; }
.goal-focus-error { margin: 0; color: var(--b3-theme-error); font-size: 12px; }
.goal-weekly-progress { min-width: 0; }
.goal-weekly-list, .goal-weekly-task-list { display: flex; flex-direction: column; gap: 8px; }
.goal-weekly-detail-toggle { padding: 3px 6px; border: 1px solid var(--b3-border-color); border-radius: 4px; color: var(--b3-theme-on-background); background: var(--b3-theme-background); font: inherit; font-size: 11px; line-height: 1.4; white-space: nowrap; }
.goal-weekly-latest { display: block; margin-top: 5px; overflow-wrap: anywhere; }
.goal-weekly-task-list { margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--b3-border-color); }
.goal-weekly-task { display: flex; align-items: baseline; flex-wrap: wrap; gap: 6px 12px; padding: 3px 0; border: 0; color: var(--b3-theme-on-background); background: transparent; font: inherit; font-size: 12px; text-align: left; }
.goal-weekly-task > span { flex: 1; min-width: 120px; overflow-wrap: anywhere; }
.goal-weekly-task:disabled { cursor: default; }
@container goal-workbench (max-width: 1120px) { .goal-workbench-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@container goal-workbench (max-width: 900px) { .goal-activity-panels { grid-template-columns: 1fr; } }
@container goal-workbench (max-width: 640px) { .goal-workbench-grid, .goal-focus-grid { grid-template-columns: 1fr; } .goal-next-action-goal { flex-basis: 100%; } }
</style>
