<template>
  <div v-if="show" class="mood-calendar-panel">
    <div class="stats-header">
      <div class="stats-header-content">
        <div class="stats-title">{{ t('moodTracker.calendarTitle') }}</div>
        <div class="mood-record-view-tabs" role="tablist">
          <button type="button" role="tab" data-record-view="all" :aria-selected="recordView === 'all'" :class="{ active: recordView === 'all' }" @click="recordView = 'all'">{{ t('checkinNotes.allRecords') }}</button>
          <button type="button" role="tab" data-record-view="annotations" :aria-selected="recordView === 'annotations'" :class="{ active: recordView === 'annotations' }" @click="recordView = 'annotations'">{{ t('checkinNotes.annotatedRecords') }}</button>
          <button type="button" role="tab" data-record-view="favorites" :aria-selected="recordView === 'favorites'" :class="{ active: recordView === 'favorites' }" @click="recordView = 'favorites'">{{ t('checkinNotes.favoriteRecords') }}</button>
        </div>
        <button @click="handleClose" class="icon-button ariaLabel" :aria-label="t('common.close')">
          <Icon name="close" width="16" height="16" class="icon" />
        </button>
      </div>
    </div>
    <div v-if="recordView === 'all'" class="stats-content">
      <div class="stats-row">
        <div class="mood-stats-container">
          <div class="mood-stats-title">{{ t('moodTracker.statsTitle') }}</div>
          <div class="mood-stats-chart">
            <div class="mood-stat-item" v-for="item in moodStatsData.data" :key="item.type">
              <div class="mood-stat-count">{{ item.count }}</div>
              <div class="mood-stat-bar-container">
                <div
                  class="mood-stat-bar"
                  :class="`mood-stat-bar-${item.type}`"
                  :style="{ height: (item.count / moodStatsData.maxValue * 100) + '%' }"
                ></div>
                <div class="mood-stat-emoji" v-html="props.getLargeMoodSvg(item.emoji)"></div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="mood-trend-container">
          <div class="mood-trend-title">{{ t('moodTracker.trendTitle') }}</div>
          <div class="mood-trend-chart">
            <svg viewBox="0 0 200 108" preserveAspectRatio="none">
            <!-- 网格线 -->
              <line v-for="y in 5" :key="`grid-${y}`"
                    class="trend-grid-line"
                    :x1="10" :y1="(y - 1) * 18 + 12"
                    :x2="190" :y2="(y - 1) * 18 + 12" />

            <!-- 趋势线 -->
              <path class="trend-area" :d="trendAreaPath" />
              <polyline
                class="trend-line"
                :points="trendLinePoints"
              />
            
            <!-- 数据点 -->
              <circle v-for="(point, index) in trendData" :key="index"
                      class="trend-point"
                      :class="{ active: index === trendData.length - 1 }"
                      :cx="point.x" :cy="point.y" r="3.4"
                      @mouseenter="hoverPoint = index"
                      @mouseleave="hoverPoint = -1"
              />
            
            <!-- X轴标签 -->
              <text v-for="(point, index) in trendData" :key="`month-${index}`"
                    class="trend-label"
                    :x="point.x" :y="103">
                {{ point.month }}
              </text>
            
            <!-- 分数标签（hover时显示） -->
              <text v-if="hoverPoint >= 0 && trendData[hoverPoint]"
                    class="trend-score-label"
                    :x="trendData[hoverPoint].x"
                    :y="Math.max(14, trendData[hoverPoint].y - 8)">
                {{ trendData[hoverPoint].score }}
              </text>
            </svg>
          </div>
        </div>
      </div>
      
      <div class="calendar-container">
        <div class="mood-lifelog-container">
          <LifelogTimelinePanel
            variant="embedded"
            fill-height
            :show="true"
            :title="lifelogTimelineDayTitle"
            :subtitle="lifelogTimelineSubtitle"
            :items="lifelogTimelineItems"
            :empty-text="t('moodTracker.noRecords')"
            :close-label="t('common.close')"
            :delete-label="t('common.delete')"
            :add-annotation-label="t('lifelogTimeline.addAnnotationLabel')"
            :star-label="t('checkinNotes.star')"
            :unstar-label="t('checkinNotes.unstar')"
            :open-source-label="t('checkinNotes.openSource')"
            :show-editor="Boolean(selectedLifelogDate)"
            :draft="lifelogTimelineDraft"
            :editor-placeholder="t('monthView.lifelogManualPlaceholder')"
            :save-label="t('common.save')"
            :cancel-label="t('common.cancel')"
            :delete-confirm-title="t('lifelogTimeline.deleteConfirmTitle')"
            :delete-confirm-message="t('lifelogTimeline.deleteConfirmMessage')"
            :date-strip-days="compactMonthDays"
            :current-period="monthYear"
            :previous-period-label="t('date.previousMonth')"
            :next-period-label="t('date.nextMonth')"
            @change-period="changeMonth"
            @select-date="selectLifelogDate"
            @update:draft="updateLifelogTimelineDraft"
            @save-draft="saveLifelogTimelineDraft"
            @clear-draft="clearLifelogTimelineDraft"
            @delete-item="deleteLifelogTimelineItem"
            @update-item="updateLifelogTimelineItem"
            @update-annotation="updateLifelogTimelineAnnotation"
            @toggle-star="toggleLifelogTimelineStar"
            @open-source="openLifelogTimelineSource"
          >
            <template #after-header>
              <div v-if="selectedLifelogDate" class="lifelog-daily-summary">
                <div class="lifelog-daily-summary-item">
                  <span class="lifelog-daily-summary-value">{{ formatLifelogMinutes(lifelogDaySummary.focusMinutes) }}</span>
                  <span class="lifelog-daily-summary-label">{{ t('lifelogTimeline.dailyFocusTime') }}</span>
                </div>
                <div class="lifelog-daily-summary-item">
                  <span class="lifelog-daily-summary-value">{{ lifelogDaySummary.completedTasks }}</span>
                  <span class="lifelog-daily-summary-label">{{ t('lifelogTimeline.dailyCompletedTasks') }}</span>
                </div>
                <div class="lifelog-daily-summary-item">
                  <span class="lifelog-daily-summary-value">{{ lifelogDaySummary.completedHabits }}</span>
                  <span class="lifelog-daily-summary-label">{{ t('lifelogTimeline.dailyCompletedHabits') }}</span>
                </div>
              </div>
            </template>
          </LifelogTimelinePanel>
        </div>
      </div>
    </div>
    <CheckinNotesOverview
      v-else
      :month="checkinNoteMonth"
      :period-label="monthYear"
      :records="recordViewItems"
      :mode="recordView"
      @change-period="changeMonth"
      @open-event="openCheckinNoteSource"
      @update-record="updateLifelogTimelineItem"
      @delete-record="deleteLifelogTimelineItem"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import Icon from './Icon.vue';
import LifelogTimelinePanel, {
  type LifelogTimelineDateStripDay,
  type LifelogTimelinePanelBadge,
  type LifelogTimelinePanelItem
} from './LifelogTimelinePanel.vue';
import CheckinNotesOverview from './CheckinNotesOverview.vue';
import { formatTemplate, useI18n } from '@/composables/useI18n';
import {
  deleteFocusSessionRecord,
  getFocusTimerData,
  loadTaskGroups,
  removeMoodEntry,
  upsertMoodEntry,
  TaskRepository,
  openBlockById,
  type FocusSessionRecord,
  type Habit,
  type MoodData,
  type MoodManualEntry,
  type Task,
  type TaskGroup
} from '@/api';
import type { CheckinNoteContext } from '@/checkinNoteRepository';
import { eventBus, Events } from '@/utils/eventBus';
import { loadGoals, type Goal } from '@/goalRepository';
import {
  getLifelogTaskSnapshot,
  patchLifelogTaskSnapshotByBlockId
} from '@/utils/lifelogTaskSnapshot';
import {
  getLifelogTimelineSnapshot,
  type LifelogTimelineSnapshot
} from '@/utils/lifelogTimelineSnapshot';
import { getGoalIdsForTask } from '@/utils/goalTaskMembership';
import { resolveGroupColorCss, resolveGroupColorLayerCss, resolveGroupTextColor } from '@/utils/groupColor';
import { useCheckinNotes } from '@/composables/useCheckinNotes';
import { getCheckinNoteEventKeys } from '@/utils/checkinNoteEvents';
import { getRecordCheckinContext, lifelogEventsToRecordViewItems, type RecordViewItem } from '@/utils/recordViewItems';
import {
  focusRecordsToLifelogEvents,
  summarizeFocusLifelogEventsByDay,
  type FocusLifelogEvent,
  type HabitCheckinLifelogEvent,
  habitsToLifelogEvents,
  summarizeHabitCheckinLifelogEventsByDay,
  moodManualEntriesToLifelogEvents,
  type ManualNoteLifelogEvent,
  type TaskCompletedLifelogEvent,
  tasksToCompletedLifelogEvents,
  summarizeTaskCompletedLifelogEventsByDay
} from '@/utils/lifelogEvents';
import { resolveTaskTagIds } from '@/utils/taskTags';

interface MoodStatItem {
  type: string;
  count: number;
  emoji: string;
  label: string;
}

interface MoodStatsData {
  data: MoodStatItem[];
  maxValue: number;
}

interface DayData {
  date: string;
  data: MoodData[string] | null;
  isCurrentMonth: boolean;
  isToday: boolean;
}

interface Props {
  show: boolean;
  moodData: MoodData;
  habits?: Habit[];
  currentMonth: number;
  weekdays: string[];
  generateMonthViewData: (date: Date, habit: any, moodData: MoodData) => DayData[];
  getLargeMoodSvg: (emoji: string) => string;
}

const props = defineProps<Props>();
const { t } = useI18n();
const {
  ensureDatesLoaded: ensureCheckinNoteDatesLoaded,
  hydrateTimelineTarget: hydrateCheckinNoteTimelineTarget,
  updateNote: updateCheckinNote
} = useCheckinNotes();

const emit = defineEmits<{
  close: [];
  openMoodTracker: [date: string];
  changeMonth: [offset: number];
  'mood-data-updated': [moodData: MoodData];
}>();

const hoverPoint = ref(-1);
const recordView = ref<'all' | 'annotations' | 'favorites'>('all');
const selectedLifelogDate = ref('');
const manualLifelogDrafts = ref<Record<string, string>>({});
const focusSessionRecords = ref<FocusSessionRecord[]>([]);
const lifelogTasks = ref<Task[]>([]);
const sharedLifelogTasks = ref<Task[]>(getLifelogTaskSnapshot());
const sharedLifelogTimelineSnapshot = ref<LifelogTimelineSnapshot | null>(getLifelogTimelineSnapshot());
const lifelogTaskGroups = ref<TaskGroup[]>([]);
const lifelogGoals = ref<Goal[]>([]);
let lifelogTasksLoadRequestId = 0;
let lifelogMetadataLoadRequestId = 0;
let lifelogTaskRefreshTimer: ReturnType<typeof setTimeout> | null = null;

const moodScoreMap: Record<string, number> = {
  '🤩': 5,
  '😊': 4,
  '😌': 3,
  '😢': 2,
  '😡': 1
};

const monthYear = computed(() => {
  const today = new Date();
  const targetDate = new Date(today.getFullYear(), today.getMonth() + props.currentMonth, 1);
  return formatTemplate('date.yearMonthTemplate', {
    year: targetDate.getFullYear(),
    month: targetDate.getMonth() + 1
  });
});

const lifelogRepeatWindow = computed(() => {
  const today = new Date();
  const targetDate = new Date(today.getFullYear(), today.getMonth() + props.currentMonth, 1);
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const formatDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  return {
    startDate: formatDateKey(new Date(year, month, 1)),
    endDate: formatDateKey(new Date(year, month + 1, 0))
  };
});
const checkinNoteMonth = computed(() => lifelogRepeatWindow.value.startDate.slice(0, 7));

const moodStatsData = computed<MoodStatsData>(() => {
  const today = new Date();
  const targetDate = new Date(today.getFullYear(), today.getMonth() + props.currentMonth, 1);
  const currentYear = targetDate.getFullYear();
  const currentMonth = targetDate.getMonth();
  
  const stats = {
    excited: 0,
    happy: 0,
    calm: 0,
    sad: 0,
    angry: 0
  };
  
  for (const [dateStr, mood] of Object.entries(props.moodData)) {
    const [year, month] = dateStr.split('-').map(Number);
    
    if (year === currentYear && month - 1 === currentMonth) {
      if (mood.emoji === '🤩') {
        stats.excited++;
      } else if (mood.emoji === '😊') {
        stats.happy++;
      } else if (mood.emoji === '😌') {
        stats.calm++;
      } else if (mood.emoji === '😢') {
        stats.sad++;
      } else if (mood.emoji === '😡') {
        stats.angry++;
      }
    }
  }
  
  const maxValue = Math.max(...Object.values(stats), 1);
  
  return {
    data: [
      { type: 'excited', count: stats.excited, emoji: '🤩', label: t('moodTracker.excited') },
      { type: 'happy', count: stats.happy, emoji: '😊', label: t('moodTracker.happy') },
      { type: 'calm', count: stats.calm, emoji: '😌', label: t('moodTracker.calm') },
      { type: 'sad', count: stats.sad, emoji: '😢', label: t('moodTracker.sad') },
      { type: 'angry', count: stats.angry, emoji: '😡', label: t('moodTracker.angry') }
    ],
    maxValue
  };
});

const calendarData = computed<DayData[]>(() => {
  const today = new Date();
  const targetDate = new Date(today.getFullYear(), today.getMonth() + props.currentMonth, 1);
  const rawData = props.generateMonthViewData(targetDate, undefined, props.moodData);
  
  return rawData.map(item => ({
    date: item.date,
    data: item.data,
    isCurrentMonth: item.isCurrentMonth,
    isToday: item.isToday
  }));
});

const compactMonthDays = computed<LifelogTimelineDateStripDay[]>(() => (
  calendarData.value
    .filter(day => day.isCurrentMonth)
    .map(day => {
      const [year = '', month = '', date = ''] = day.date.split('-');
      const parsedDate = new Date(Number(year), Number(month) - 1, Number(date));
      const weekdayIndex = Number.isNaN(parsedDate.getTime()) ? 0 : (parsedDate.getDay() + 6) % 7;
      const weekdayLabel = props.weekdays[weekdayIndex] || '';
      const dayNumber = String(Number(date) || date);

      return {
        date: day.date,
        dayNumber,
        weekdayLabel,
        ariaLabel: `${month}/${dayNumber} ${weekdayLabel}`,
        selected: day.date === selectedLifelogDate.value,
        today: day.isToday,
        hasRecord: Boolean(day.data) || recordViewItems.value.some(record => record.date === day.date),
        moodSvg: day.data?.emoji ? props.getLargeMoodSvg(day.data.emoji) : undefined
      };
    })
));

const currentMonthDateKeys = computed(() => {
  const today = new Date();
  const targetDate = new Date(today.getFullYear(), today.getMonth() + props.currentMonth, 1);
  const currentYear = targetDate.getFullYear();
  const currentMonth = targetDate.getMonth();

  return calendarData.value
    .filter(day => day.isCurrentMonth)
    .map(day => day.date)
    .filter(date => {
      const [year, month] = date.split('-').map(Number);
      return year === currentYear && month - 1 === currentMonth;
    });
});

const currentMonthRecordedDateKeys = computed(() => (
  currentMonthDateKeys.value.filter(date => Boolean(props.moodData[date]))
));

function getTodayKey(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

const defaultSelectedDate = computed(() => {
  const todayKey = getTodayKey();
  if (currentMonthDateKeys.value.includes(todayKey)) {
    return todayKey;
  }
  return currentMonthRecordedDateKeys.value[0] || currentMonthDateKeys.value[0] || '';
});

watch(
  [() => props.show, defaultSelectedDate],
  ([show, fallbackDate]) => {
    if (!show) {
      return;
    }
    if (!selectedLifelogDate.value || !currentMonthDateKeys.value.includes(selectedLifelogDate.value)) {
      selectedLifelogDate.value = fallbackDate;
    }
  },
  { immediate: true }
);

watch(
  () => props.show,
  (show) => {
    if (show) {
      sharedLifelogTasks.value = getLifelogTaskSnapshot();
      sharedLifelogTimelineSnapshot.value = getLifelogTimelineSnapshot();
      void refreshLifelogSources(true);
    }
  },
  { immediate: true }
);

watch(
  () => props.currentMonth,
  () => {
    if (props.show) {
      void refreshLifelogTasks(true);
    }
  }
);

async function refreshFocusSessions(): Promise<void> {
  try {
    const data = await getFocusTimerData();
    focusSessionRecords.value = data.sessionRecords;
  } catch (error) {
    console.error('[MoodCalendarPanel] Failed to load focus sessions', error);
  }
}

async function refreshLifelogTasks(forceRefresh: boolean = false): Promise<void> {
  const requestId = ++lifelogTasksLoadRequestId;
  try {
    const allTasks = await TaskRepository.getAllTasks(
      !forceRefresh,
      { includeArchived: true },
      {
        useLiveDom: false,
        detailLevel: 'full',
        materializeRepeats: true,
        repeatWindow: lifelogRepeatWindow.value,
        includeCompletedRepeatInstancesByCompletionDate: true
      }
    );
    if (requestId !== lifelogTasksLoadRequestId) {
      return;
    }
    lifelogTasks.value = allTasks;
  } catch (error) {
    console.warn('[MoodCalendarPanel] Failed to load lifelog tasks', error);
  }
}

async function refreshLifelogMetadata(): Promise<void> {
  const requestId = ++lifelogMetadataLoadRequestId;
  try {
    const [taskGroups, goals] = await Promise.all([
      loadTaskGroups(),
      loadGoals()
    ]);
    if (requestId !== lifelogMetadataLoadRequestId) {
      return;
    }
    lifelogTaskGroups.value = taskGroups;
    lifelogGoals.value = goals;
  } catch (error) {
    console.warn('[MoodCalendarPanel] Failed to load lifelog metadata', error);
  }
}

async function refreshLifelogSources(forceRefreshTasks: boolean = false): Promise<void> {
  await Promise.all([
    refreshFocusSessions(),
    refreshLifelogTasks(forceRefreshTasks),
    refreshLifelogMetadata()
  ]);
}

function handleFocusSessionUpdate(): void {
  void refreshFocusSessions();
}

function scheduleLifelogTaskRefresh(): void {
  if (lifelogTaskRefreshTimer) {
    clearTimeout(lifelogTaskRefreshTimer);
  }
  lifelogTaskRefreshTimer = setTimeout(() => {
    lifelogTaskRefreshTimer = null;
    if (props.show) {
      void refreshLifelogTasks(true);
    }
  }, 300);
}

function handleTaskUpdate(): void {
  if (props.show) {
    scheduleLifelogTaskRefresh();
  }
}

function handleLifelogTasksUpdated(payload?: { tasks?: Task[] }): void {
  if (Array.isArray(payload?.tasks)) {
    sharedLifelogTasks.value = payload.tasks.map(task => ({ ...task }));
  }
}

function handleLifelogTimelineUpdated(payload?: LifelogTimelineSnapshot | null): void {
  if (payload?.date && Array.isArray(payload.items)) {
    sharedLifelogTimelineSnapshot.value = {
      date: payload.date,
      items: payload.items.map(item => ({ ...item }))
    };
  }
}

function handleTaskBlockUpdate(event: Event): void {
  if (!props.show) {
    return;
  }

  const detail = (event as CustomEvent<{ id?: unknown; completed?: unknown }>).detail;
  const blockId = typeof detail?.id === 'string' ? detail.id.trim() : '';
  if (!blockId || typeof detail?.completed !== 'boolean') {
    return;
  }

  const completedAt = detail.completed ? new Date().toISOString() : undefined;
  sharedLifelogTimelineSnapshot.value = null;
  const sharedSnapshotUpdated = patchLifelogTaskSnapshotByBlockId(
    blockId,
    detail.completed,
    completedAt
  );
  let updated = false;
  lifelogTasks.value = lifelogTasks.value.map((task) => {
    if (task.blockId !== blockId) {
      return task;
    }
    updated = true;
    return {
      ...task,
      status: detail.completed ? 'completed' : 'pending',
      completedAt
    };
  });

  if (!updated && !sharedSnapshotUpdated) {
    void refreshLifelogTasks(true);
    return;
  }

  scheduleLifelogTaskRefresh();
}

function handleLifelogMetadataUpdate(): void {
  if (props.show) {
    void refreshLifelogMetadata();
  }
}

const manualNoteLifelogEvents = computed(() => moodManualEntriesToLifelogEvents(props.moodData));
const focusLifelogEvents = computed(() =>
  focusRecordsToLifelogEvents(focusSessionRecords.value, t('focusTimer.title'))
);
const focusSummariesByDay = computed(() => summarizeFocusLifelogEventsByDay(focusLifelogEvents.value));
const habitCheckinLifelogEvents = computed(() => habitsToLifelogEvents(props.habits || []));
const habitCheckinSummariesByDay = computed(() => (
  summarizeHabitCheckinLifelogEventsByDay(habitCheckinLifelogEvents.value)
));
const taskCompletedLifelogSourceTasks = computed(() => {
  const tasksById = new Map<string, Task>();
  for (const task of lifelogTasks.value) {
    tasksById.set(task.id, task);
  }
  for (const task of sharedLifelogTasks.value) {
    tasksById.set(task.id, task);
  }
  return Array.from(tasksById.values());
});
const taskCompletedLifelogEvents = computed(() => tasksToCompletedLifelogEvents(taskCompletedLifelogSourceTasks.value));
const taskCompletedSummariesByDay = computed(() => (
  summarizeTaskCompletedLifelogEventsByDay(taskCompletedLifelogEvents.value)
));
const taskCompletedLifelogSourceTaskById = computed(() => {
  const taskById = new Map<string, Task>();
  for (const task of taskCompletedLifelogSourceTasks.value) {
    if (task.id) {
      taskById.set(task.id, task);
    }
  }
  return taskById;
});
const taskCompletedLifelogSourceTaskByBlockId = computed(() => {
  const taskByBlockId = new Map<string, Task>();
  for (const task of taskCompletedLifelogSourceTasks.value) {
    if (task.blockId) {
      taskByBlockId.set(task.blockId, task);
    }
  }
  return taskByBlockId;
});
const taskGroupById = computed(() =>
  new Map(lifelogTaskGroups.value.map(group => [group.id, group]))
);
const goalById = computed(() =>
  new Map(lifelogGoals.value.map(goal => [goal.id, goal]))
);

function timeToSortMinutes(value: string | undefined, fallbackMinutes: number): number {
  if (!value) {
    return fallbackMinutes;
  }
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    return Number(match[1]) * 60 + Number(match[2]);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallbackMinutes;
  }
  return date.getHours() * 60 + date.getMinutes();
}

function formatSortMinutes(minutes: number): string {
  const normalized = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)));
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function formatTimestamp(value: string | undefined, fallback: string): string {
  const timestamp = value ? new Date(value) : null;
  if (!timestamp || Number.isNaN(timestamp.getTime())) {
    return fallback;
  }
  return `${String(timestamp.getHours()).padStart(2, '0')}:${String(timestamp.getMinutes()).padStart(2, '0')}`;
}

function timestampToSortMinutes(value: unknown, fallbackMinutes: number): number {
  const rawTimestamp = typeof value === 'number'
    ? value
    : (typeof value === 'string' && value.trim() ? Number(value) : Number.NaN);
  if (!Number.isFinite(rawTimestamp) || rawTimestamp <= 0) {
    return fallbackMinutes;
  }
  const timestamp = rawTimestamp < 1_000_000_000_000 ? rawTimestamp * 1000 : rawTimestamp;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return fallbackMinutes;
  }
  return date.getHours() * 60 + date.getMinutes();
}

function formatLifelogMinutes(minutes: number): string {
  const roundedMinutes = Math.max(0, Math.round(Number(minutes) || 0));
  if (roundedMinutes < 60) {
    return t('habitCheckinLog.minutesTemplate').replace('{minutes}', String(roundedMinutes));
  }

  const hours = Math.floor(roundedMinutes / 60);
  const restMinutes = roundedMinutes % 60;
  if (restMinutes > 0) {
    return t('habitCheckinLog.hoursMinutesTemplate')
      .replace('{hours}', String(hours))
      .replace('{minutes}', String(restMinutes));
  }
  return t('habitCheckinLog.hoursTemplate').replace('{hours}', String(hours));
}

function formatFocusLifelogTarget(event: FocusLifelogEvent): string {
  if (event.targetType === 'habit') {
    return t('focusTimer.habit');
  }
  if (event.targetType === 'task') {
    return t('focusTimer.task');
  }
  return t('focusTimer.title');
}

function formatHabitLifelogProgress(event: HabitCheckinLifelogEvent): string {
  const checkinCount = event.checkinIndex || event.completedCount;
  const progress = event.targetCount > 1 ? `${checkinCount}/${event.targetCount}` : (event.completed ? '1/1' : '0/1');
  return `${progress}${t('habitTracker.timesSuffix')}`;
}

function focusEventToTimelineItem(event: FocusLifelogEvent): LifelogTimelinePanelItem {
  const sortMinutes = timeToSortMinutes(event.startTime, 8 * 60);
  const context: CheckinNoteContext = {
    type: 'focus',
    sourceId: event.sourceId || event.id,
    occurredAt: typeof event.metadata?.timestamp === 'number'
      ? new Date(event.metadata.timestamp < 1_000_000_000_000 ? event.metadata.timestamp * 1000 : event.metadata.timestamp).toISOString()
      : `${event.date}T${event.startTime || '00:00'}:00`,
    title: event.title,
    meta: `${t('focusTimer.title')} ﾂｷ ${formatLifelogMinutes(event.minutes)} ﾂｷ ${formatFocusLifelogTarget(event)}`
  };
  const item = hydrateCheckinNoteTimelineTarget({
    id: `focus-${event.id}`,
    sourceId: event.id,
    type: event.type,
    timeLabel: `${event.startTime} - ${event.endTime}`,
    sortMinutes,
    title: event.title,
    meta: `${t('focusTimer.title')} · ${formatLifelogMinutes(event.minutes)} · ${formatFocusLifelogTarget(event)}`,
    note: event.note || '',
    icon: 'timer',
    deletable: true
  }, event.date, getCheckinNoteEventKeys(event));
  const openContext = event.targetType === 'habit' && event.targetId
    ? { type: 'habit' as const, sourceId: event.targetId, occurredAt: context.occurredAt, title: event.title }
    : event.targetType === 'task' && (event.targetBlockId || event.targetId)
      ? { type: 'task' as const, sourceId: event.targetBlockId || event.targetId!, occurredAt: context.occurredAt, title: event.title }
      : undefined;
  return {
    ...item,
    annotationContext: context,
    openContext,
    starred: item.annotationStarred,
    favoritable: Boolean(item.annotation),
    openable: Boolean(openContext)
  };
}

const recordViewItems = computed<RecordViewItem[]>(() => lifelogEventsToRecordViewItems([
  ...focusLifelogEvents.value,
  ...habitCheckinLifelogEvents.value,
  ...taskCompletedLifelogEvents.value,
  ...manualNoteLifelogEvents.value
], {
  focus: event => `${t('focusTimer.title')} · ${formatLifelogMinutes(event.minutes)} · ${formatFocusLifelogTarget(event)}`,
  habit: event => `${t('habitTracker.checkedIn')} · ${formatHabitLifelogProgress(event)}`,
  task: () => t('taskManager.statusCompleted'),
  manualNote: () => t('monthView.lifelogManualNote')
}));

function habitEventToTimelineItem(event: HabitCheckinLifelogEvent): LifelogTimelinePanelItem {
  const sortMinutes = timestampToSortMinutes(event.checkinTimestamp || event.metadata?.timestamp, 7 * 60);
  const occurredAtValue = Number(event.checkinTimestamp ?? event.metadata?.timestamp);
  const context: CheckinNoteContext = {
    type: 'habit',
    sourceId: event.habitId,
    occurredAt: Number.isFinite(occurredAtValue) && occurredAtValue > 0
      ? new Date(occurredAtValue < 1_000_000_000_000 ? occurredAtValue * 1000 : occurredAtValue).toISOString()
      : `${event.date}T00:00:00`,
    title: event.title,
    meta: `${t('habitTracker.checkedIn')} ﾂｷ ${formatHabitLifelogProgress(event)}`
  };
  const item = hydrateCheckinNoteTimelineTarget({
    id: `habit-${event.id}`,
    sourceId: event.id,
    type: event.type,
    timeLabel: formatSortMinutes(sortMinutes),
    sortMinutes,
    title: event.title,
    meta: `${t('habitTracker.checkedIn')} · ${formatHabitLifelogProgress(event)}`,
    note: event.note || '',
    icon: 'squareCheck'
  }, event.date, getCheckinNoteEventKeys(event));
  return { ...item, annotationContext: context, starred: item.annotationStarred, favoritable: Boolean(item.annotation), openable: true };
}

function getTaskCompletedSourceTask(event: TaskCompletedLifelogEvent): Task | null {
  return taskCompletedLifelogSourceTaskById.value.get(event.taskId)
    || (event.blockId ? taskCompletedLifelogSourceTaskByBlockId.value.get(event.blockId) : null)
    || null;
}

function getTaskCompletedEventGroupId(event: TaskCompletedLifelogEvent): string {
  const groupId = event.metadata?.groupId;
  return typeof groupId === 'string' ? groupId.trim() : '';
}

function getTaskCompletedTagBadges(event: TaskCompletedLifelogEvent): LifelogTimelinePanelBadge[] {
  const sourceTask = getTaskCompletedSourceTask(event);
  return resolveTaskTagIds(
    sourceTask ? sourceTask.tags : event.tags,
    sourceTask?.groupId || getTaskCompletedEventGroupId(event)
  )
    .map(tagId => taskGroupById.value.get(tagId))
    .filter((group): group is TaskGroup => Boolean(group))
    .map(group => ({
      type: 'tag',
      label: group.name,
      style: group.color ? {
        background: resolveGroupColorCss(group.color),
        borderColor: resolveGroupColorLayerCss(group.color),
        color: resolveGroupTextColor(group.color)
      } : {}
    }));
}

function getTaskCompletedGoalBadges(event: TaskCompletedLifelogEvent): LifelogTimelinePanelBadge[] {
  const sourceTask = getTaskCompletedSourceTask(event);
  const goalSource = sourceTask || {
    id: event.taskId,
    taskId: event.taskId,
    blockId: event.blockId,
    title: event.title
  };
  return getGoalIdsForTask(lifelogGoals.value, goalSource)
    .map(goalId => goalById.value.get(goalId))
    .filter((goal): goal is Goal => Boolean(goal))
    .map(goal => ({
      type: 'goal',
      label: typeof goal.name === 'string' && goal.name.trim()
        ? goal.name.trim()
        : t('taskManager.untitledGoal'),
      emoji: typeof goal.emoji === 'string' ? goal.emoji.trim() : ''
    }));
}

function taskEventToTimelineItem(event: TaskCompletedLifelogEvent): LifelogTimelinePanelItem {
  const sortMinutes = timeToSortMinutes(event.completedAt, 20 * 60);
  const context: CheckinNoteContext = {
    type: 'task',
    sourceId: event.blockId || event.taskId,
    occurredAt: event.completedAt,
    title: event.title,
    meta: t('taskManager.statusCompleted')
  };
  const item = hydrateCheckinNoteTimelineTarget({
    id: `task-${event.id}`,
    sourceId: event.taskId,
    type: event.type,
    timeLabel: formatTimestamp(event.completedAt, event.date),
    sortMinutes,
    title: event.title,
    meta: t('taskManager.statusCompleted'),
    note: event.note || '',
    icon: 'taskCheckboxChecked',
    badges: [
      ...getTaskCompletedTagBadges(event),
      ...getTaskCompletedGoalBadges(event)
    ]
  }, event.date, getCheckinNoteEventKeys(event));
  return { ...item, annotationContext: context, starred: item.annotationStarred, favoritable: Boolean(item.annotation), openable: true };
}

function manualNoteEventToTimelineItem(event: ManualNoteLifelogEvent): LifelogTimelinePanelItem {
  const sortMinutes = timeToSortMinutes(event.createdAt || event.updatedAt, 21 * 60);
  return {
    id: `manual-${event.id}`,
    sourceId: event.id,
    type: event.type,
    timeLabel: formatTimestamp(event.createdAt || event.updatedAt, event.date),
    sortMinutes,
    title: t('monthView.lifelogManualNote'),
    meta: t('monthView.lifelogManualNote'),
    note: event.text,
    icon: 'descriptionBubble',
    emoji: event.emoji,
    moodSvg: event.emoji ? props.getLargeMoodSvg(event.emoji) : undefined,
    deletable: true,
    editable: true
  };
}

function recordViewItemToTimelineItem(record: RecordViewItem): LifelogTimelinePanelItem | null {
  const event = record.event;
  if (event.type === 'focus') return focusEventToTimelineItem(event as FocusLifelogEvent);
  if (event.type === 'habit-checkin') return habitEventToTimelineItem(event as HabitCheckinLifelogEvent);
  if (event.type === 'task-completed') return taskEventToTimelineItem(event as TaskCompletedLifelogEvent);
  if (event.type === 'manual-note') return manualNoteEventToTimelineItem(event as ManualNoteLifelogEvent);
  return null;
}

const lifelogTimelineItems = computed<LifelogTimelinePanelItem[]>(() => {
  const dayKey = selectedLifelogDate.value;
  if (!dayKey) {
    return [];
  }

  const sharedSnapshot = sharedLifelogTimelineSnapshot.value;
  if (sharedSnapshot?.date === dayKey) {
    return sharedSnapshot.items.map(item => {
      if (!item.annotationKey) return item;
      const hydrated = hydrateCheckinNoteTimelineTarget(
        item,
        item.annotationDate || dayKey,
        item.annotationKey
      );
      const record = recordViewItems.value.find(candidate => candidate.eventKeys.includes(item.annotationKey || ''));
      const context = record ? getRecordCheckinContext(record) : undefined;
      return {
        ...hydrated,
        annotationContext: context,
        starred: hydrated.annotationStarred,
        favoritable: Boolean(hydrated.annotation),
        openable: Boolean(context)
      };
    });
  }

  return recordViewItems.value
    .filter(record => record.date === dayKey)
    .map(recordViewItemToTimelineItem)
    .filter((item): item is LifelogTimelinePanelItem => Boolean(item))
    .sort((left, right) => {
      if (left.sortMinutes !== right.sortMinutes) {
        return left.sortMinutes - right.sortMinutes;
      }
      return left.title.localeCompare(right.title, 'zh-Hans-CN');
    });
});
watch(selectedLifelogDate, (dayKey) => {
  if (dayKey) {
    void ensureCheckinNoteDatesLoaded([dayKey]);
  }
}, { immediate: true });

function formatLifelogDayTitle(dayKey: string): string {
  const date = new Date(dayKey);
  if (Number.isNaN(date.getTime())) {
    return dayKey;
  }
  return formatTemplate('weekView.fullDateTemplate', {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate()
  });
}

const lifelogTimelineDayTitle = computed(() => (
  selectedLifelogDate.value ? formatLifelogDayTitle(selectedLifelogDate.value) : ''
));

const lifelogTimelineSubtitle = computed(() => formatTemplate('weekView.lifelogTimelineCountTemplate', {
  count: lifelogTimelineItems.value.length
}));

const lifelogDaySummary = computed(() => {
  const date = selectedLifelogDate.value;
  if (!date) {
    return { focusMinutes: 0, completedTasks: 0, completedHabits: 0 };
  }

  return {
    focusMinutes: focusSummariesByDay.value.get(date)?.minutes || 0,
    completedTasks: taskCompletedSummariesByDay.value.get(date)?.tasks || 0,
    completedHabits: habitCheckinSummariesByDay.value.get(date)?.completed || 0
  };
});

const lifelogTimelineDraft = computed(() => (
  selectedLifelogDate.value ? (manualLifelogDrafts.value[selectedLifelogDate.value] || '') : ''
));

const trendData = computed(() => {
  const today = new Date();
  const data = [];
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth();
    
    let totalScore = 0;
    let count = 0;
    
    for (const [dateStr, mood] of Object.entries(props.moodData)) {
      const [entryYear, entryMonth] = dateStr.split('-').map(Number);
      if (entryYear === year && entryMonth - 1 === month) {
        totalScore += moodScoreMap[mood.emoji] || 0;
        count++;
      }
    }
    
    const avgScore = count > 0 ? Math.round((totalScore / count) * 20) : 0;
    const monthLabel = `${month + 1}`;
    
    data.push({
      month: monthLabel,
      score: avgScore,
      x: 10 + (5 - i) * 36,
      y: 90 - (avgScore / 100) * 80
    });
  }
  
  return data;
});

const trendLinePoints = computed(() => {
  return trendData.value.map(point => `${point.x},${point.y}`).join(' ');
});

const trendAreaPath = computed(() => {
  const points = trendData.value;
  if (points.length === 0) {
    return '';
  }

  const baseline = 92;
  const linePath = points.map((point, index) => (
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  )).join(' ');
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  return `${linePath} L ${lastPoint.x} ${baseline} L ${firstPoint.x} ${baseline} Z`;
});

const handleClose = () => {
  emit('close');
};

const changeMonth = (offset: number) => {
  emit('changeMonth', offset);
};

function selectLifelogDate(date: string): void {
  if (!date) {
    return;
  }
  selectedLifelogDate.value = date;
}

function updateLifelogTimelineDraft(value: string): void {
  if (!selectedLifelogDate.value) {
    return;
  }
  manualLifelogDrafts.value = {
    ...manualLifelogDrafts.value,
    [selectedLifelogDate.value]: value
  };
}

function clearManualLifelogDraft(dayKey: string): void {
  const nextDrafts = { ...manualLifelogDrafts.value };
  delete nextDrafts[dayKey];
  manualLifelogDrafts.value = nextDrafts;
}

function clearLifelogTimelineDraft(): void {
  if (selectedLifelogDate.value) {
    clearManualLifelogDraft(selectedLifelogDate.value);
  }
}

async function persistMoodRecords(nextMoodData: MoodData): Promise<void> {
  const previous = props.moodData;
  const dates = new Set([...Object.keys(previous), ...Object.keys(nextMoodData)]);
  let persisted = previous;
  for (const date of dates) {
    if (JSON.stringify(previous[date]) === JSON.stringify(nextMoodData[date])) continue;
    if (nextMoodData[date]) persisted = await upsertMoodEntry(date, nextMoodData[date]);
    else persisted = await removeMoodEntry(date);
  }
  emit('mood-data-updated', persisted);
  eventBus.emit(Events.MOOD_UPDATED, { moodData: persisted });
}

async function openCheckinNoteSource(context: CheckinNoteContext): Promise<void> {
  if (context.type === 'task') {
    await openBlockById(context.sourceId, { focus: true });
    return;
  }
  if (context.type === 'habit') {
    eventBus.emit(Events.HABIT_TRACKER_PANEL_OPEN_REQUEST, {
      target: 'habit-detail',
      habitId: context.sourceId,
      returnToRecords: true
    });
    return;
  }
  recordView.value = 'all';
  selectLifelogDate(context.occurredAt.slice(0, 10));
}

async function saveManualLifelogDraft(dayKey: string): Promise<void> {
  const text = (manualLifelogDrafts.value[dayKey] || '').trim();
  if (!dayKey || !text) {
    return;
  }

  const now = new Date().toISOString();
  const entry: MoodManualEntry = {
    id: `mood-entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    createdAt: now,
    updatedAt: now
  };
  const existingEntry = props.moodData[dayKey] || { emoji: '', note: '', timestamp: now };
  const nextMoodData: MoodData = {
    ...props.moodData,
    [dayKey]: {
      ...existingEntry,
      timestamp: existingEntry.timestamp || now,
      entries: [...(existingEntry.entries || []), entry]
    }
  };

  try {
    await persistMoodRecords(nextMoodData);
    clearManualLifelogDraft(dayKey);
  } catch (error) {
    console.error('[MoodCalendarPanel] Failed to save manual lifelog entry', error);
  }
}

function saveLifelogTimelineDraft(): void {
  if (selectedLifelogDate.value) {
    void saveManualLifelogDraft(selectedLifelogDate.value);
  }
}

async function deleteManualLifelogEntry(entryId: string): Promise<void> {
  if (!entryId) {
    return;
  }

  let changed = false;
  const nextMoodData: MoodData = {};
  for (const [date, entry] of Object.entries(props.moodData)) {
    const entries = Array.isArray(entry.entries)
      ? entry.entries.filter(item => item.id !== entryId)
      : [];
    if ((entry.entries || []).length !== entries.length) {
      changed = true;
    }
    const nextEntry = {
      ...entry,
      ...(entries.length > 0 ? { entries } : { entries: undefined })
    };
    if (nextEntry.emoji || nextEntry.note || entries.length > 0) {
      nextMoodData[date] = nextEntry;
    }
  }

  if (!changed) {
    return;
  }

  try {
    await persistMoodRecords(nextMoodData);
  } catch (error) {
    console.error('[MoodCalendarPanel] Failed to delete manual lifelog entry', error);
  }
}

async function deleteFocusLifelogSession(sessionId: string): Promise<void> {
  if (!sessionId) {
    return;
  }

  try {
    const deleted = await deleteFocusSessionRecord(sessionId);
    if (!deleted) {
      return;
    }
    focusSessionRecords.value = focusSessionRecords.value.filter(record => record.id !== sessionId);
    window.dispatchEvent(new CustomEvent('pinch-focus-session'));
  } catch (error) {
    console.error('[MoodCalendarPanel] Failed to delete focus session', error);
  }
}

function deleteLifelogTimelineItem(item: LifelogTimelinePanelItem): void {
  if (!item.sourceId) {
    return;
  }
  if (item.type === 'focus') {
    void deleteFocusLifelogSession(item.sourceId);
    return;
  }
  void deleteManualLifelogEntry(item.sourceId);
}

async function updateLifelogTimelineItem(item: LifelogTimelinePanelItem, text: string): Promise<void> {
  if (item.type !== 'manual-note' || !item.sourceId) return;
  const now = new Date().toISOString();
  let changed = false;
  const nextMoodData: MoodData = {};
  for (const [date, entry] of Object.entries(props.moodData)) {
    const entries = Array.isArray(entry.entries)
      ? entry.entries.map(entryItem => {
        if (entryItem.id !== item.sourceId) return entryItem;
        changed = true;
        return { ...entryItem, text, updatedAt: now };
      })
      : [];
    const nextEntry = { ...entry, ...(entries.length > 0 ? { entries } : { entries: undefined }) };
    if (nextEntry.emoji || nextEntry.note || entries.length > 0) nextMoodData[date] = nextEntry;
  }
  if (!changed) return;
  try {
    await persistMoodRecords(nextMoodData);
  } catch (error) {
    console.error('[MoodCalendarPanel] Failed to update manual lifelog entry', error);
  }
}

async function updateLifelogTimelineAnnotation(item: LifelogTimelinePanelItem, text: string): Promise<void> {
  if (!item.annotationKey) {
    return;
  }
  try {
    await updateCheckinNote(
      item.annotationDate || selectedLifelogDate.value,
      item.annotationKey,
      text,
      item.annotationContext,
      item.starred === true
    );
  } catch (error) {
    console.error('[MoodCalendarPanel] Failed to update check-in note', error);
  }
}

async function toggleLifelogTimelineStar(item: LifelogTimelinePanelItem): Promise<void> {
  if (!item.annotationKey || !item.annotation?.trim()) return;
  try {
    await updateCheckinNote(
      item.annotationDate || selectedLifelogDate.value,
      item.annotationKey,
      item.annotation,
      item.annotationContext,
      item.starred !== true
    );
  } catch (error) {
    console.error('[MoodCalendarPanel] Failed to update favorite', error);
  }
}

function openLifelogTimelineSource(item: LifelogTimelinePanelItem): void {
  if (item.openContext) void openCheckinNoteSource(item.openContext);
}

let unsubscribeTaskChanged: (() => void) | null = null;
let unsubscribeTaskAdded: (() => void) | null = null;
let unsubscribeTaskDeleted: (() => void) | null = null;
let unsubscribeTaskUpdated: (() => void) | null = null;
let unsubscribeTaskDateChanged: (() => void) | null = null;
let unsubscribeTaskToggled: (() => void) | null = null;
let unsubscribeLifelogTasksUpdated: (() => void) | null = null;
let unsubscribeLifelogTimelineUpdated: (() => void) | null = null;
let unsubscribeTaskGroupsUpdated: (() => void) | null = null;
let unsubscribeGoalsUpdated: (() => void) | null = null;

onMounted(() => {
  window.addEventListener('pinch-focus-session', handleFocusSessionUpdate);
  window.addEventListener('siyuan-block-update', handleTaskBlockUpdate);
  unsubscribeTaskChanged = eventBus.on(Events.TASK_CHANGED, handleTaskUpdate);
  unsubscribeTaskAdded = eventBus.on(Events.TASK_ADDED, handleTaskUpdate);
  unsubscribeTaskDeleted = eventBus.on(Events.TASK_DELETED, handleTaskUpdate);
  unsubscribeTaskUpdated = eventBus.on(Events.TASK_UPDATED, handleTaskUpdate);
  unsubscribeTaskDateChanged = eventBus.on(Events.TASK_DATE_CHANGED, handleTaskUpdate);
  unsubscribeTaskToggled = eventBus.on(Events.TASK_TOGGLED, handleTaskUpdate);
  unsubscribeLifelogTasksUpdated = eventBus.on(Events.LIFELOG_TASKS_UPDATED, handleLifelogTasksUpdated);
  unsubscribeLifelogTimelineUpdated = eventBus.on(Events.LIFELOG_TIMELINE_UPDATED, handleLifelogTimelineUpdated);
  unsubscribeTaskGroupsUpdated = eventBus.on(Events.TASK_GROUPS_UPDATED, handleLifelogMetadataUpdate);
  unsubscribeGoalsUpdated = eventBus.on(Events.GOALS_UPDATED, handleLifelogMetadataUpdate);
});

onUnmounted(() => {
  window.removeEventListener('pinch-focus-session', handleFocusSessionUpdate);
  window.removeEventListener('siyuan-block-update', handleTaskBlockUpdate);
  if (lifelogTaskRefreshTimer) {
    clearTimeout(lifelogTaskRefreshTimer);
    lifelogTaskRefreshTimer = null;
  }
  unsubscribeTaskChanged?.();
  unsubscribeTaskAdded?.();
  unsubscribeTaskDeleted?.();
  unsubscribeTaskUpdated?.();
  unsubscribeTaskDateChanged?.();
  unsubscribeTaskToggled?.();
  unsubscribeLifelogTasksUpdated?.();
  unsubscribeLifelogTimelineUpdated?.();
  unsubscribeTaskGroupsUpdated?.();
  unsubscribeGoalsUpdated?.();
});

</script>

<style scoped>
.mood-calendar-panel {
  position: absolute;
  inset: 0;
  z-index: 2;
  box-sizing: border-box;
  overflow: hidden;
  overscroll-behavior: contain;
  display: flex;
  padding: 10px;
  flex-direction: column;
  background-color: color-mix(in srgb, var(--b3-body-background) 50%, var(--b3-theme-background));
  -ms-overflow-style: none;
  scrollbar-width: none;
  
  &::-webkit-scrollbar {
    display: none;
  }
  
  .stats-header {
    display: flex;
    flex-direction: column;
    padding-bottom: 10px;
    
    .stats-emoji {
      font-size: 86px;
      align-self: center;
      height: 150px;
    }
    
    .stats-title {
      font-size: 18px;
      font-weight: bold;
    }
    
    .stats-header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .stats-title {
        margin: 0;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--b3-theme-on-background);
      }

      .mood-record-view-tabs {
        display: inline-flex;
        align-items: center;
        min-width: 0;
        gap: 2px;
        padding: 2px;
        border-radius: 9px;
        background: var(--b3-list-hover);
        flex-shrink: 0;

        button {
          min-width: 0;
          height: 28px;
          border: 0;
          border-radius: 7px;
          padding: 0 8px;
          color: var(--b3-theme-on-surface);
          background: transparent;
          font-size: 13px;
          line-height: 1;
          cursor: pointer;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          transition: background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
        }

        button:hover {
          color: var(--b3-theme-on-background);
          background: var(--b3-theme-background);
        }

        button.active {
          color: var(--b3-theme-on-background);
          background: var(--b3-theme-background);
          box-shadow: var(--pinch-shadow);
        }
      }
      
      .icon-button {
        width: 28px;
        height: 28px;
        border: none;
        background: none;
        cursor: pointer;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        
        .icon {
          width: 16px;
          height: 16px;
          color: var(--b3-theme-background);
          fill: var(--b3-theme-background);
        }
        
        &:hover {
          background-color: var(--b3-list-hover);
          border-radius: 4px;
        }
      }
    }
  }
  
  .stats-content {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    
    .stats-row {
      display: flex;
      gap: 10px;
      margin-bottom: 8px;
      width: 100%;
      
      .mood-stats-container {
        flex: 1;
        background: var(--b3-theme-background);
        border-radius: 14px;
        padding: 8px 10px;
        box-shadow: rgba(0, 0, 0, 0.04) 0 1px 4px;
      }
      
      .mood-trend-container {
        flex: 1;
        background: var(--b3-theme-background);
        border-radius: 14px;
        padding: 8px 10px;
        box-shadow: rgba(0, 0, 0, 0.04) 0 1px 4px;
      }
    }
    
    .calendar-container {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      background-color: var(--b3-theme-background);
      padding: 0;
      border-radius: 24px;
      box-shadow: rgba(0, 0, 0, 0.06) 0px 1px 5px 0px;
    }

    .mood-lifelog-container {
      margin-top: 0;
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      background: var(--b3-list-background);
      border-radius: 8px;
      overflow: hidden;

    }

    .lifelog-daily-summary {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 6px;
      padding: 0 12px 10px;
      background: var(--b3-theme-background);
    }

    .lifelog-daily-summary-item {
      min-width: 0;
      padding: 7px 9px;
      border: 1px solid var(--b3-border-color);
      border-radius: 8px;
      background: var(--b3-list-hover);
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .lifelog-daily-summary-value {
      overflow: hidden;
      color: var(--b3-theme-on-background);
      font-size: 14px;
      font-weight: 600;
      line-height: 1.2;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .lifelog-daily-summary-label {
      overflow: hidden;
      color: var(--b3-theme-on-surface);
      font-size: 11px;
      line-height: 1.2;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .mood-stats-container {
      .mood-stats-title {
        font-size: 12px;
        font-weight: bold;
        color: var(--b3-theme-on-surface);
        margin-bottom: 6px;
        text-align: left;
      }
      
      .mood-stats-chart {
        display: flex;
        justify-content: space-around;
        align-items: flex-end;
        height: 66px;
        
        .mood-stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          
          .mood-stat-emoji {
            width: 18px;
            height: 18px;
            margin-bottom: 0;
            position: absolute;
            bottom: 0;
            left: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2;

            svg {
              width: 100%;
              height: 100%;
            }
          }
          
          .mood-stat-count {
            font-size: 11px;
            font-weight: bold;
            color: var(--b3-theme-on-surface);
            margin-bottom: 3px;
            line-height: 1;
          }
          
          .mood-stat-bar-container {
            width: 18px;
            height: 50px;
            border-radius: 9px;
            overflow: hidden;
            margin-bottom: 0;
            position: relative;
            background: var(--b3-list-background);
            
            .mood-stat-bar {
            width: 100%;
            border-radius: 9px;
            position: absolute;
            bottom: 0;
            transition: height 0.5s ease;
            z-index: 1;
          }
            
            .mood-stat-bar-excited {
              background-color: #fdd07d;
            }
            
            .mood-stat-bar-happy {
              background-color: #8aae97;
            }
            
            .mood-stat-bar-calm {
              background-color: #89b0bc;
            }
            
            .mood-stat-bar-sad {
              background-color: #f192c9;
            }
            
            .mood-stat-bar-angry {
              background-color: #fc8f7b;
            }
          }
        }
      }
    }
    
    .mood-trend-container {
      .mood-trend-title {
        font-size: 12px;
        font-weight: bold;
        color: var(--b3-theme-on-surface);
        margin-bottom: 6px;
        text-align: left;
      }
      
      .mood-trend-chart {
        height: 66px;
        position: relative;
        
        svg {
          width: 100%;
          height: 100%;
        }
        
        .trend-grid-line {
          stroke: var(--b3-border-color);
          stroke-width: 0.75;
          stroke-dasharray: 3 5;
          opacity: 0.7;
        }
        
        .trend-axis-line {
          stroke: var(--b3-theme-on-surface);
          stroke-width: 1;
        }
        
        .trend-area {
          fill: rgba(249, 143, 122, 0.14);
          stroke: none;
        }
        
        .trend-line {
          fill: none;
          stroke: #f98f7a;
          stroke-width: 2.4;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        
        .trend-point {
          fill: var(--b3-theme-background);
          stroke: #f98f7a;
          stroke-width: 1.8;
          cursor: pointer;
          transition: r 0.2s;
          filter: drop-shadow(0 1px 2px rgba(249, 143, 122, 0.18));
          
          &:hover {
            r: 5;
          }
        }
        
        .trend-point.active {
          fill: #f98f7a;
        }
        
        .trend-label {
          font-size: 10px;
          fill: var(--b3-theme-on-surface);
          opacity: 0.72;
          text-anchor: middle;
        }
        
        .trend-score-label {
          font-size: 11px;
          fill: #f98f7a;
          text-anchor: middle;
          font-weight: bold;
        }
      }
    }
  }
}

@media (max-width: 520px) {
  .mood-calendar-panel {
    padding: 7px;

    .stats-header {
      padding-bottom: 7px;

      .stats-header-content {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 28px;
        gap: 6px;

        .stats-title {
          font-size: 15px;
        }

        .mood-record-view-tabs {
          grid-column: 1 / -1;
          grid-row: 2;
          width: 100%;
          box-sizing: border-box;

          button {
            flex: 1 1 0;
            padding: 5px 4px;
            font-size: 11px;
          }
        }

        .icon-button {
          grid-column: 2;
          grid-row: 1;
        }
      }
    }

    .lifelog-daily-summary {
      gap: 4px;
      padding: 0 8px 8px;
    }

    .lifelog-daily-summary-item {
      padding: 6px 7px;
    }

    .lifelog-daily-summary-value {
      font-size: 12px;
    }

    .lifelog-daily-summary-label {
      font-size: 10px;
    }
  }
}

.icon-button {
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-button .icon {
  width: 16px;
  height: 16px;
  color: var(--b3-theme-background);
  fill: var(--b3-theme-background);
}

.icon-button:hover {
  background-color: var(--b3-list-hover);
  border-radius: 4px;
}
</style>
