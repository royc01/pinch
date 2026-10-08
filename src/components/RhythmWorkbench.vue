<template>
  <section class="rhythm-workbench">
    <div class="rhythm-workbench-head">
      <h3>{{ t('personalStats.rhythmWorkbenchTitle') }}</h3>
      <span>{{ t('personalStats.rhythmWorkbenchScope') }}</span>
    </div>
    <div v-if="undoCheckin" class="rhythm-undo" role="status">
      <span>{{ formatTemplate('personalStats.habitCheckinSaved', { name: undoCheckin.name }) }}</span>
      <button type="button" :disabled="pendingHabitIds.includes(undoCheckin.habitId)" @click="void undoLastCheckin()">{{ t('habitTracker.undoCheckin') }}</button>
    </div>
    <p v-if="undoError" class="rhythm-error" role="alert">{{ undoError }}</p>
    <div class="rhythm-workbench-grid">
      <article class="rhythm-card today-habits-workbench">
        <header><strong>{{ t('personalStats.rhythmTodayHabits') }}</strong><small>{{ formatTemplate('personalStats.rhythmPendingCount', { count: pendingToday.length }) }}</small></header>
        <p v-if="habitsLoading" class="rhythm-empty">{{ t('personalStats.loadingHabits') }}</p>
        <p v-else-if="!pendingToday.length" class="rhythm-empty">{{ t('personalStats.rhythmNoPendingHabits') }}</p>
        <div v-else class="rhythm-list">
          <div v-for="entry in pendingToday.slice(0, expanded.today ? undefined : 5)" :key="entry.habit.id" class="rhythm-item habit-checkin-row" :aria-busy="pendingHabitIds.includes(entry.habit.id)">
            <button type="button" class="rhythm-item-title" @click="emit('open-habit', entry.habit.id)">{{ entry.habit.emoji || '📝' }} {{ entry.habit.name }}</button>
            <div class="rhythm-item-footer">
              <small>{{ formatTemplate('personalStats.rhythmDayProgress', { completed: entry.completed, target: entry.target }) }}</small>
              <button type="button" class="habit-checkin-action" :disabled="pendingHabitIds.includes(entry.habit.id)" @click="void checkinHabit(entry.habit.id)">{{ t('habitTracker.checkIn') }}</button>
            </div>
            <small v-if="entry.week" class="rhythm-week-progress">{{ formatTemplate('personalStats.rhythmWeekProgress', { completed: entry.week.completed, target: entry.week.target }) }}</small>
            <p v-if="habitErrors[entry.habit.id]" class="rhythm-error" role="alert">{{ habitErrors[entry.habit.id] }}</p>
          </div>
        </div>
        <button v-if="pendingToday.length > 5" type="button" class="rhythm-list-toggle" :aria-expanded="expanded.today" @click="expanded.today = !expanded.today">{{ toggleLabel(expanded.today, pendingToday.length) }}</button>
      </article>

      <article class="rhythm-card attention-habits-workbench">
        <header><strong>{{ t('personalStats.rhythmAttentionHabits') }}</strong><small>{{ t('personalStats.rhythmAttentionScope') }}</small></header>
        <p v-if="habitsLoading" class="rhythm-empty">{{ t('personalStats.loadingHabits') }}</p>
        <p v-else-if="!attentionHabits.length" class="rhythm-empty">{{ t('personalStats.rhythmNoAttentionHabits') }}</p>
        <div v-else class="rhythm-list">
          <div v-for="entry in attentionHabits.slice(0, expanded.attention ? undefined : 5)" :key="entry.habit.id" class="rhythm-item attention-habit-row">
            <button type="button" class="rhythm-item-title" @click="emit('open-habit', entry.habit.id)">{{ entry.habit.emoji || '📝' }} {{ entry.habit.name }}</button>
            <div class="rhythm-item-footer">
              <small>{{ formatTemplate('personalStats.rhythmMissedCount', { count: entry.missedDates.length, rate: entry.rate }) }}</small>
              <button type="button" :aria-expanded="expandedMisses.includes(entry.habit.id)" @click="toggleMisses(entry.habit.id)">{{ t('personalStats.rhythmViewMisses') }}</button>
              <button type="button" @click="emit('open-habit', entry.habit.id)">{{ t('personalStats.rhythmAdjustHabit') }}</button>
            </div>
            <small v-if="expandedMisses.includes(entry.habit.id)" class="rhythm-missed-dates">{{ entry.habit.frequency.startsWith('weekly') ? t('personalStats.rhythmMissedWeeks') : t('personalStats.rhythmMissedDates') }} {{ entry.missedDates.join('、') }}</small>
          </div>
        </div>
        <button v-if="attentionHabits.length > 5" type="button" class="rhythm-list-toggle" :aria-expanded="expanded.attention" @click="expanded.attention = !expanded.attention">{{ toggleLabel(expanded.attention, attentionHabits.length) }}</button>
      </article>

      <article class="rhythm-card today-focus-workbench">
        <header><strong>{{ t('focusTimer.todayFocus') }}</strong><small>{{ t('personalStats.todayScope') }}</small></header>
        <p v-if="focusLoading" class="rhythm-empty">{{ t('personalStats.loadingFocus') }}</p>
        <template v-else>
          <div class="rhythm-focus-total"><strong>{{ formatMinutes(todayMinutes) }}</strong><small>{{ formatTemplate('personalStats.focusSessionsTemplate', { count: todaySessions }) }}</small></div>
          <small>{{ t('personalStats.rhythmLatestTarget') }} {{ todayRecords[0] ? recordTitle(todayRecords[0]) : t('personalStats.rhythmNoFocusToday') }}</small>
          <button v-if="todayRecords.length" type="button" class="rhythm-list-toggle" :aria-expanded="expanded.focus" @click="expanded.focus = !expanded.focus">{{ expanded.focus ? t('personalStats.collapseCardList') : t('personalStats.rhythmViewTodayFocus') }}</button>
          <div v-if="expanded.focus" class="rhythm-list today-focus-records">
            <button v-for="record in todayRecords" :key="record.id" type="button" class="rhythm-item rhythm-record" :disabled="!canOpenRecord(record)" @click="emit('open-focus-record', record)">
              <strong>{{ recordTitle(record) }}</strong><small>{{ recordTime(record) }} · {{ formatMinutes(record.minutes) }}</small>
            </button>
          </div>
          <small v-if="todaySessions > todayRecords.length" class="rhythm-empty">{{ t('personalStats.rhythmFocusSummaryOnly') }}</small>
        </template>
      </article>

      <article class="rhythm-card recent-focus-workbench">
        <header><strong>{{ t('personalStats.rhythmRecentFocus') }}</strong><small>{{ selectedRangeLabel }}</small></header>
        <p v-if="focusLoading" class="rhythm-empty">{{ t('personalStats.loadingFocus') }}</p>
        <p v-else-if="!recentRecords.length" class="rhythm-empty">{{ t('personalStats.rhythmNoFocusRecords') }}</p>
        <div v-else class="rhythm-list">
          <button v-for="record in recentRecords.slice(0, expanded.recent ? undefined : 5)" :key="record.id" type="button" class="rhythm-item rhythm-record" :disabled="!canOpenRecord(record)" @click="emit('open-focus-record', record)">
            <strong>{{ recordTitle(record) }}</strong><small>{{ record.date }} {{ recordTime(record) }} · {{ formatMinutes(record.minutes) }}</small>
          </button>
        </div>
        <button v-if="recentRecords.length > 5" type="button" class="rhythm-list-toggle" :aria-expanded="expanded.recent" @click="expanded.recent = !expanded.recent">{{ toggleLabel(expanded.recent, recentRecords.length) }}</button>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue';
import { upsertHabit, type Habit, type FocusSessionRecord, type DailyFocusRecord, type Task } from '@/api';
import { formatTemplate, useI18n } from '@/composables/useI18n';
import { useHabitCheckin } from '@/composables/useHabitCheckin';
import { useHabitStatistics } from '@/composables/useHabitStatistics';
import { getHabitDayProgress, getWorkbenchWeekProgress, isWorkbenchHabitScheduled, summarizeWorkbenchHabit } from '@/utils/personalStatsHabitProgress';
import { addSummaryDays, formatSummaryDateKey } from '@/utils/personalStatsSummary';
import { getTaskTitlePlainText } from '@/utils/taskHtml';
import { eventBus, Events } from '@/utils/eventBus';
import { requestCheckinNote } from '@/utils/checkinNotePrompt';

const props = defineProps<{
  habits: Habit[];
  habitsLoading: boolean;
  focusLoading: boolean;
  focusRecords: DailyFocusRecord[];
  focusSessionRecords: FocusSessionRecord[];
  periodFocusSessions: FocusSessionRecord[];
  tasks: Task[];
  todayKey: string;
  selectedRangeLabel: string;
}>();
const emit = defineEmits<{
  'open-habit': [habitId: string];
  'open-focus-record': [record: FocusSessionRecord];
}>();
const { t } = useI18n();
const parseDay = (date: string) => new Date(`${date}T00:00:00`);
const today = computed(() => parseDay(props.todayKey));
const expanded = ref({ today: false, attention: false, focus: false, recent: false });
const expandedMisses = ref<string[]>([]);
const pendingHabitIds = ref<string[]>([]);
const habitErrors = ref<Record<string, string>>({});
const undoError = ref('');
const undoCheckin = ref<{ habitId: string; name: string; date: string; signature: string; previousDay?: Habit['calendar'][number] } | null>(null);
let undoTimer: ReturnType<typeof setTimeout> | undefined;

const pendingToday = computed(() => props.habits.filter(habit => isWorkbenchHabitScheduled(habit, today.value))
  .map(habit => ({ habit, ...getHabitDayProgress(habit, props.todayKey), week: habit.frequency.startsWith('weekly') ? getWorkbenchWeekProgress(habit, today.value) : null }))
  .filter(entry => !entry.fulfilled && !entry.week?.fulfilled));
const attentionHabits = computed(() => props.habits.map(habit => ({
  habit, ...summarizeWorkbenchHabit(habit, addSummaryDays(today.value, -7), today.value, today.value)
})).filter(entry => !entry.habit.isPaused && entry.missedDates.length > 0)
  .sort((left, right) => right.missedDates.length - left.missedDates.length || left.rate - right.rate));
const todayRecords = computed(() => [...props.focusSessionRecords].filter(record => record.date === props.todayKey)
  .sort((left, right) => right.timestamp - left.timestamp));
const recentRecords = computed(() => [...props.periodFocusSessions].sort((left, right) => right.timestamp - left.timestamp));
const todayMinutes = computed(() => props.focusRecords.filter(record => record.date === props.todayKey).reduce((sum, record) => sum + record.minutes, 0));
const todaySessions = computed(() => props.focusRecords.filter(record => record.date === props.todayKey).reduce((sum, record) => sum + record.sessions, 0));
const formatMinutes = (minutes: number) => minutes >= 60 ? `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m` : `${Math.round(minutes)}m`;
const toggleLabel = (isExpanded: boolean, count: number) => isExpanded ? t('personalStats.collapseCardList') : formatTemplate('personalStats.expandCardListTemplate', { count });
const recordTitle = (record: FocusSessionRecord) => getTaskTitlePlainText(record.targetName) || t('personalStats.rhythmUnlinkedFocus');
const recordTime = (record: FocusSessionRecord) => Number.isFinite(record.timestamp) && record.timestamp > 0
  ? new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
function canOpenRecord(record: FocusSessionRecord): boolean {
  if (record.targetType === 'habit') return props.habits.some(habit => habit.id === record.targetId);
  return record.targetType === 'task' && (!!record.targetBlockId || props.tasks.some(task => task.id === record.targetId && !!task.blockId));
}
function toggleMisses(id: string): void {
  expandedMisses.value = expandedMisses.value.includes(id) ? expandedMisses.value.filter(item => item !== id) : [...expandedMisses.value, id];
}

// Mutate a copy. Publish the persisted snapshot only after saving succeeds.
const checkinHabits = shallowRef<Habit[]>([]);
const statistics = useHabitStatistics({ habits: checkinHabits, parseDate: parseDay, formatDate: formatSummaryDateKey, getToday: () => props.todayKey });
async function persistHabit(habit: Habit): Promise<void> {
  const saved = await upsertHabit(habit);
  eventBus.emit(Events.HABITS_UPDATED, { source: 'personal-stats', habits: saved });
}
const checkin = useHabitCheckin({
  habits: checkinHabits, formatDate: formatSummaryDateKey, parseDate: parseDay, getToday: () => props.todayKey,
  getWeeklyCompletionStatus: statistics.getWeeklyCompletionStatus,
  calculateCurrentStreak: statistics.calculateCurrentStreak,
  calculateCurrentMonthStreak: statistics.calculateCurrentMonthStreak,
  calculateTotalMonthCompletions: statistics.calculateTotalMonthCompletions,
  clearWeeklyCompletionCacheForHabit: statistics.clearWeeklyCompletionCacheForHabit,
  clearCurrentStreakCacheForHabit: statistics.clearCurrentStreakCacheForHabit,
  clearCompletionRateCacheForHabit: statistics.clearCompletionRateCacheForHabit,
  saveHabit: persistHabit, triggerHabitsRef: () => {}, animationOriginalStatus: ref({}),
  showAnimation: ref(false), animationHabitId: ref(null), playBubbleSound: () => {}
});
function daySignature(habit: Habit, date: string): string {
  const record = habit.calendar.find(entry => entry.date === date);
  return JSON.stringify(record ? {
    ...getHabitDayProgress(habit, date), completedFlag: record.completed,
    timestamp: record.timestamp ?? null, timestamps: record.checkinTimestamps ?? [], note: record.note ?? ''
  } : null);
}
async function checkinHabit(id: string): Promise<void> {
  const entry = pendingToday.value.find(item => item.habit.id === id);
  if (!entry || pendingHabitIds.value.includes(id)) return;
  const date = props.todayKey;
  pendingHabitIds.value = [...pendingHabitIds.value, id];
  habitErrors.value[id] = '';
  try {
    const copy: Habit = JSON.parse(JSON.stringify(entry.habit));
    const previousDay = copy.calendar.find(item => item.date === date);
    const previousSnapshot = previousDay ? JSON.parse(JSON.stringify(previousDay)) : undefined;
    // Normalize legacy completed-only records before the shared check-in increments them.
    const record = copy.calendar.find(item => item.date === date);
    if (record) {
      const progress = getHabitDayProgress(copy, date);
      record.completedCount = progress.completed;
      record.completed = progress.fulfilled;
    }
    const reward = checkin.toggleHabitCompletion(copy, date);
    await persistHabit(copy);
    checkin.processRewardPayload(reward);
    if (props.todayKey === date) {
      clearTimeout(undoTimer);
      undoError.value = '';
      undoCheckin.value = { habitId: id, name: copy.name, date, signature: daySignature(copy, date), previousDay: previousSnapshot };
      undoTimer = setTimeout(() => { undoCheckin.value = null; }, 8000);
    }
    const timestamp = copy.calendar.find(item => item.date === date)?.checkinTimestamps?.at(-1);
    if (reward && timestamp) requestCheckinNote({ date, eventKey: `habit:${id}:${Math.round(timestamp)}`, context: {
      type: 'habit', sourceId: id, occurredAt: new Date(timestamp).toISOString(), title: copy.name, meta: `${getHabitDayProgress(copy, date).completed}`
    } });
  } catch (error) {
    console.error('[RhythmWorkbench] Failed to save check-in:', error);
    habitErrors.value[id] = t('personalStats.rhythmCheckinFailed');
  } finally {
    pendingHabitIds.value = pendingHabitIds.value.filter(item => item !== id);
  }
}
async function undoLastCheckin(): Promise<void> {
  const entry = undoCheckin.value;
  if (!entry || pendingHabitIds.value.includes(entry.habitId)) return;
  const current = props.habits.find(habit => habit.id === entry.habitId);
  if (!current || props.todayKey !== entry.date || daySignature(current, entry.date) !== entry.signature) {
    undoError.value = t('personalStats.rhythmUndoChanged');
    return;
  }
  pendingHabitIds.value = [...pendingHabitIds.value, entry.habitId];
  undoError.value = '';
  try {
    const copy: Habit = JSON.parse(JSON.stringify(current));
    copy.calendar = copy.calendar.filter(day => day.date !== entry.date);
    if (entry.previousDay) copy.calendar.push(JSON.parse(JSON.stringify(entry.previousDay)));
    copy.completedToday = getHabitDayProgress(copy, entry.date).fulfilled;
    copy.totalCompletions = copy.calendar.filter(day => getHabitDayProgress(copy, day.date).fulfilled).length;
    statistics.clearCurrentStreakCacheForHabit(copy.id);
    copy.currentStreak = statistics.calculateCurrentStreak(copy);
    await persistHabit(copy);
    if (undoCheckin.value === entry) undoCheckin.value = null;
  } catch (error) {
    console.error('[RhythmWorkbench] Failed to undo check-in:', error);
    undoError.value = t('personalStats.rhythmUndoFailed');
  } finally {
    pendingHabitIds.value = pendingHabitIds.value.filter(item => item !== entry.habitId);
  }
}
watch(() => props.todayKey, () => {
  undoCheckin.value = null;
  undoError.value = '';
  expanded.value.today = false;
  expanded.value.focus = false;
});
onBeforeUnmount(() => clearTimeout(undoTimer));
</script>

<style scoped>
.rhythm-workbench { container: rhythm-workbench / inline-size; }
.rhythm-workbench-head { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 16px; margin-bottom: 12px; }
.rhythm-workbench-head h3 { margin: 0; font-size: 15px; }
.rhythm-workbench-head > span, small { color: var(--b3-theme-on-surface-light); font-size: 11px; line-height: 1.5; }
.rhythm-workbench-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.rhythm-card { display: flex; flex-direction: column; gap: 8px; min-width: 0; padding: 10px; border-radius: 6px; background: var(--b3-list-hover); }
.rhythm-card header { display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
.rhythm-card header > strong { font-weight: 500; }
.rhythm-list { display: flex; flex-direction: column; gap: 8px; }
.rhythm-item { min-width: 0; padding: 8px 10px; border: 0; border-radius: 10px; color: var(--b3-theme-on-background); background: var(--b3-theme-background); box-shadow: var(--pinch-shadow); transition: box-shadow 0.2s; }
.rhythm-item:hover { box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
.rhythm-item-title { padding: 0; border: 0; font: inherit; font-size: 13px; font-weight: 600; text-align: left; color: inherit; background: transparent; overflow-wrap: anywhere; }
.rhythm-item-footer { display: flex; align-items: center; gap: 4px; margin-top: 6px; }
.rhythm-item-footer small { flex: 1; min-width: 0; }
.rhythm-item-footer button, .rhythm-undo button { padding: 3px 6px; border: 1px solid var(--b3-border-color); border-radius: 4px; color: var(--b3-theme-on-background); background: var(--b3-theme-background); font: inherit; font-size: 11px; line-height: 1.4; white-space: nowrap; }
button { cursor: pointer; }
button:disabled { cursor: default; }
.habit-checkin-action:disabled { opacity: 0.5; }
button:focus-visible { outline: 2px solid var(--pinch-color1); outline-offset: 2px; }
.rhythm-week-progress, .rhythm-missed-dates { display: block; margin-top: 6px; overflow-wrap: anywhere; }
.rhythm-empty { margin: 0; padding: 6px 0; color: var(--b3-theme-on-surface-light); font-size: 12px; }
.rhythm-list-toggle { padding: 4px 6px; border: 0; border-radius: 6px; background: var(--b3-list-hover); color: var(--b3-theme-on-background); font: inherit; font-size: 12px; }
.rhythm-focus-total { display: flex; align-items: baseline; flex-wrap: wrap; gap: 10px; }
.rhythm-focus-total > strong { font-size: 24px; }
.rhythm-record { display: flex; flex-direction: column; gap: 4px; text-align: left; font: inherit; }
.rhythm-record strong { font-size: 13px; overflow-wrap: anywhere; }
.rhythm-undo { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; font-size: 12px; }
.rhythm-error { margin: 6px 0 0; color: var(--b3-theme-error); font-size: 12px; }
@container rhythm-workbench (max-width: 1120px) { .rhythm-workbench-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@container rhythm-workbench (max-width: 640px) { .rhythm-workbench-grid { grid-template-columns: 1fr; } }
</style>
