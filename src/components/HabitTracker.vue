<template>
  <div class="Pinch-habit-container">
    <!-- 习惯列表页面 -->
    <div class="habit-list-container">
      <div class="Pinch-habit-header">
        <div class="header-content">
          <div class="date-display">
            <span class="reward-summary-level">Lv {{ rewardSnapshot.level }}</span>
            <div class="reward-summary-progress">
              <div
                class="reward-summary-progress-bar"
                :title="rewardLevelProgressText"
                :aria-label="rewardLevelProgressText"
              >
                <span class="reward-summary-progress-fill" :style="rewardLevelProgressStyle"></span>
              </div>
            </div>
          </div>
          <div class="header-buttons">
            <SyButton @click="openFocusTimer" id="focus-timer-btn" class="focus-timer-btn" title="专注计时">
              <Icon name="timer" width="24" height="24" class="icon" />
            </SyButton>
            <SyButton
              @click="openPersonalStatsView"
              id="task-stats-btn"
              class="task-stats-btn"
              title="统计视图"
              aria-label="打开统计视图"
            >
              <Icon name="stats" width="24" height="24" class="icon" />
            </SyButton>
            <SyButton @click="showMoodCalendar = true" id="mood-calendar-btn" class="mood-calendar-btn" title="情绪日历">
              <Icon name="smile" width="24" height="24" class="icon" />
            </SyButton>
          </div>
        </div>
      </div>

      <!-- 本周日期显示，从周一开始 -->
      <WeekDates 
        :week-dates="weekDates"
        :mood-data="moodData"
        :open-mood-tracker="openMoodTracker"
        :get-small-mood-svg="getSmallMoodSvg"
      />

      <div class="summary-card-grid">
        <div class="reward-summary-card" @click="openRewardPage()">
          <div class="reward-summary-main">
            <div class="reward-summary-stats">
              <div class="reward-summary-stat">
                <div class="reward-summary-stat-value">{{ rewardSnapshot.availableCoins }}</div>
                <div class="reward-summary-stat-label">趣币</div>
              </div>
            </div>
            <div v-if="latestRewardEntry" class="reward-summary-latest">
              <span class="reward-summary-latest-title">{{ latestRewardEntry.title }}</span>
              <span class="reward-summary-latest-points">
                +{{ latestRewardEntry.xp }} 碎片<span v-if="latestRewardEntry.coins > 0"> · +{{ latestRewardEntry.coins }} 趣币</span>
              </span>
            </div>
            <div v-else class="reward-summary-empty">
              完成习惯、任务或专注后会在这里累计奖励
            </div>
          </div>
        </div>

        <div class="goal-summary-card" @click="openGoalPage()">
          <div class="goal-summary-main">
            <div class="goal-summary-head">
              <div class="goal-summary-level">
                <div class="goal-summary-level-value">{{ goalSummaryValueText }}</div>
                <div class="goal-summary-level-label">完成</div>
              </div>
            </div>
            <div v-if="featuredGoal" class="goal-summary-latest">
              <span class="goal-summary-latest-title">{{ featuredGoal.name }}</span>
              <div class="goal-summary-latest-points" :title="featuredGoalText">
                <span class="goal-summary-latest-points-bar">
                  <span :style="{ width: `${featuredGoalProgressPercent}%` }"></span>
                </span>
                <span class="goal-summary-latest-points-text">{{ featuredGoalProgressText }}</span>
              </div>
            </div>
            <div v-else class="goal-summary-empty">
              创建目标后会在这里汇总进度
            </div>
          </div>
        </div>
      </div>

      <div class="habit-list">
        <!-- 习惯打卡标题 -->
        <div class="habit-manager-header">
          <div class="header-left">
            <div class="collapse-arrow" @click="toggleHabitListCollapsed" :class="{ collapsed: isHabitListCollapsed }">
              <Icon name="arrowDown" width="16" height="16" class="icon" />
            </div>
            <div class="title">{{ t('habitTracker.title') }}</div>
          </div>
          <div class="header-actions">
            <SyButton
              @click="showHabitManagerPage = true"
              id="habit-manage-btn"
              class="habit-manage-btn"
              title="习惯管理"
              aria-label="习惯管理"
            >
              <Icon name="taskScope" width="24" height="24" class="icon" />
            </SyButton>
            <SyButton @click="openTotalStatsPage" id="stats-btn" class="stats-btn">
              <Icon name="stats" width="24" height="24" class="icon" />
            </SyButton>
            <SyButton @click="showAddHabitModal = true" id="add-habit-btn" class="add-habit-btn">
              <Icon name="add" width="24" height="24" class="icon" />
            </SyButton>
          </div>
        </div>
        
        <HabitCardList
          :sorted-habits="visibleHabits"
          :is-habit-list-collapsed="isHabitListCollapsed"
          :show-animation="showAnimation"
          :animation-habit-id="animationHabitId"
          :active-pomodoro-habit-id="activePomodoroHabit?.id || null"
          :inline-circumference="inlineCircumference"
          :inline-stroke-dashoffset="inlineStrokeDashoffset"
          :t="t"
          :get-habit-cache="getHabitCache"
          :get-calendar-view-data="getCalendarViewData"
          :pomodoro-state-class="pomodoroStateClass"
          :format-pomodoro-time="formatPomodoroTime"
            @show-stats="showHabitStats"
            @doc-button="handleHabitDocButton"
            @open-bind-doc="openBindDocModal"
            @start-focus="openFocusTimerForHabit"
            @toggle-habit="toggleHabit"
            @pomodoro-pause="togglePomodoroPause"
            @pomodoro-resume="togglePomodoroResume"
          @pomodoro-stop="stopCurrentPomodoro"
        />
      </div>
    </div>

    <div v-if="showHabitManagerPage" class="habit-manage-panel">
      <div class="habit-manage-panel-header">
        <div class="habit-manage-panel-title">习惯管理</div>
        <button
          type="button"
          class="habit-manage-panel-close"
          title="关闭"
          aria-label="关闭"
          @click="showHabitManagerPage = false"
        >
          <Icon name="close" width="16" height="16" class="icon" />
        </button>
      </div>
      <div class="habit-manage-panel-body">
        <HabitCardList
          :sorted-habits="sortedHabits"
          :is-habit-list-collapsed="false"
          :show-animation="false"
          :animation-habit-id="null"
          :active-pomodoro-habit-id="activePomodoroHabit?.id || null"
          :inline-circumference="inlineCircumference"
          :inline-stroke-dashoffset="inlineStrokeDashoffset"
          :t="t"
          :get-habit-cache="getHabitCache"
          :get-calendar-view-data="getCalendarViewData"
          :pomodoro-state-class="pomodoroStateClass"
          :format-pomodoro-time="formatPomodoroTime"
          manage-mode
            @show-stats="showHabitStats"
            @doc-button="handleHabitDocButton"
            @open-bind-doc="openBindDocModal"
            @start-focus="openFocusTimerForHabit"
            @toggle-pause="togglePauseHabit"
            @pomodoro-pause="togglePomodoroPause"
            @pomodoro-resume="togglePomodoroResume"
          @pomodoro-stop="stopCurrentPomodoro"
        />
      </div>
    </div>

    <!-- 习惯统计面板 -->
    <HabitStatsPanel
      :habit="selectedHabit"
      :weekdays="weekdaysForCalendar"
      :month-view-data="statsMonthViewData"
      :current-period-text="statsCurrentPeriodText"
      :current-month-streak="statsCurrentMonthStreak"
      :total-month-completions="statsTotalMonthCompletions"
      :completion-rate="statsCompletionRate"
      :monthly-progress-data="statsMonthlyProgressData"
      :longest-streak="selectedHabitLongestStreak"
      :total-completion-rate="statsTotalCompletionRate"
      :common-time-slot="statsCommonTimeSlot"
      :hour-distribution="statsHourDistribution"
      :get-frequency-text="getFrequencyText"
      :get-created-date-text="getCreatedDateText"
      :format-timeline-date="formatTimelineDate"
      :calculate-bar-height="calculateBarHeight"
      :t="t"
      @close="closeHabitStats"
      @edit="openEditHabitModal"
      @delete="selectedHabit && deleteHabit(selectedHabit.id)"
      @toggle-pause="selectedHabit && togglePauseHabit(selectedHabit)"
      @change-period="selectedHabit && changeStatsCalendarPeriod(selectedHabit, $event)"
      @toggle-day="selectedHabit && toggleDayCompletion(selectedHabit, $event)"
    />
    
    <!-- 总统计面板 -->
    <StatisticsPanel
      :show="showTotalStatsPage"
      :total-habits-count="totalHabitsCount"
      :total-completions-count="totalCompletionsCount"
      :longest-streak="longestStreak"
      :heatmap-grid-data="heatmapGridData"
      :heatmap-months="heatmapMonths"
      :habits="habits"
      :get-created-date-text="getCreatedDateText"
      :calculate-longest-streak="calculateLongestStreak"
      :calculate-total-completion-rate="calculateTotalCompletionRate"
      :calculate-common-time-slot="calculateCommonTimeSlot"
      @close="closeTotalStatsPage"
    />

    <RewardPanel
      :show="showRewardPage"
      :reward-snapshot="rewardSnapshot"
      :highlight-entry-id="highlightedRewardEntryId"
      @close="closeRewardPage"
    />

    <GoalPanel
      :show="showGoalPage"
      :highlight-goal-id="highlightedGoalId"
      @close="closeGoalPage"
    />
    
    <!-- 编辑习惯模态框 -->
    <HabitModal 
      :show="showEditHabitModal"
      mode="edit"
      :habit="editedHabit"
      :difficulty-options="difficultyOptions"
      :frequency-options="frequencyOptions"
      :times-per-day-options="timesPerDayOptions"
      :pomodoro-duration-options="pomodoroDurationOptions"
      :t="t"
      @close="closeEditHabitModal"
      @submit="saveEditedHabit"
    />

    <!-- 添加习惯模态框 -->
    <HabitModal 
      :show="showAddHabitModal"
      mode="add"
      :habit="newHabit"
      :difficulty-options="difficultyOptions"
      :frequency-options="frequencyOptions"
      :times-per-day-options="timesPerDayOptions"
      :pomodoro-duration-options="pomodoroDurationOptions"
      :t="t"
      @close="showAddHabitModal = false"
      @submit="handleAddHabit"
    />

    <HabitDocBindDialog
      :show="showBindDocModal"
      :doc-id-input="bindDocInput"
      @update:docIdInput="bindDocInput = $event"
      @close="closeBindDocModal"
      @clear="clearBindDoc"
      @confirm="confirmBindDoc"
    />
    
    <!-- 情绪打卡模态框 -->
    <MoodTrackerModal
      :show="showMoodTracker"
      :selectedDate="selectedDate"
      :moodEntry="moodEntry"
      :moodEmojis="moodEmojis"
      @close="closeMoodTracker"
      @save="handleSaveMoodEntry"
      @delete="handleDeleteMoodEntry"
    />
    
    <!-- 情绪打卡月视图 -->
    <MoodCalendarPanel
      :show="showMoodCalendar"
      :mood-data="moodData"
      :current-month="moodCalendarCurrentMonth"
      :weekdays="weekdaysForCalendar"
      :generate-month-view-data="generateMonthViewData"
      :get-large-mood-svg="(emoji) => getMoodSvg(emoji, 'large')"
      @close="showMoodCalendar = false"
      @open-mood-tracker="openMoodTracker"
      @change-month="changeMoodCalendarMonth"
    />
    
    <FocusTimerHost
      ref="focusTimerHostRef"
      @complete-linked-habit="completeFocusLinkedHabit"
    />
    
    <!-- 任务管理器容器 -->
    <div class="stand-container">
      <TaskManager @start-focus="openFocusTimerForTask" />
    </div>
  </div>
</template>

<style scoped>
.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: nowrap;
  gap: 12px;
  width: 100%;
}

.date-display {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1 1 auto;
  min-width: 0;
  max-width: none;
  overflow: hidden;
}

.date-display .reward-summary-progress {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
}

.header-buttons {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: nowrap;
  flex: 0 0 auto;
  margin-left: auto;
  gap: 4px;
}

</style>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, shallowRef, triggerRef, watch } from 'vue';
import SyButton from '@/components/SiyuanTheme/SyButton.vue';
import Icon from '@/components/Icon.vue';
import WeekDates from '@/components/WeekDates.vue';
import HabitModal from '@/components/HabitModal.vue';
import MoodTrackerModal from '@/components/MoodTrackerModal.vue';
import StatisticsPanel from '@/components/StatisticsPanel.vue';
import RewardPanel from '@/components/RewardPanel.vue';
import GoalPanel from '@/components/GoalPanel.vue';
import HabitStatsPanel from '@/components/HabitStatsPanel.vue';
import HabitCardList from '@/components/HabitCardList.vue';
import MoodCalendarPanel from '@/components/MoodCalendarPanel.vue';
import FocusTimerHost from '@/components/FocusTimerHost.vue';
import TaskManager from '@/components/TaskManager.vue';
import HabitDocBindDialog from '@/components/HabitDocBindDialog.vue';
import { getHabits, saveHabits, Habit, type Task } from '@/api';
import { openTaskViewByRequest } from '@/main';
import { useHabitCache } from '@/composables/useHabitCache';
import { useHabitCheckin } from '@/composables/useHabitCheckin';
import { useHabitCrud } from '@/composables/useHabitCrud';
import { useHabitFormState } from '@/composables/useHabitFormState';
import { useHabitI18n } from '@/composables/useHabitI18n';
import { useHabitSorting } from '@/composables/useHabitSorting';
import { useHabitViewData } from '@/composables/useHabitViewData';
import { normalizeDocId, useHabitDocBinding } from '@/composables/useHabitDocBinding';
import { useHabitEmojis } from '@/composables/useHabitEmojis';
import { useHabitPomodoro } from '@/composables/useHabitPomodoro';
import { useHabitStatistics } from '@/composables/useHabitStatistics';
import { useMoodTracker } from '@/composables/useMoodTracker';
import { useGoals } from '@/composables/useGoals';
import { useRewards } from '@/composables/useRewards';
import {
  eventBus,
  Events,
  type FocusTimerPanelOpenRequest,
  type HabitTrackerPanelOpenRequest
} from '@/utils/eventBus';
import {
  createHabitFocusTarget,
  createTaskFocusTarget,
  type FocusTimerLinkedTarget
} from '@/utils/focusTimerTarget';
import {
  formatTimelineDate,
  getCreatedDateText,
  getFrequencyText
} from '@/composables/useHabitUtils';

const { getCachedDate, getCachedDateParse, getToday } = useHabitCache();

const formatDate = getCachedDate;
const parseDate = (dateStr: string): Date => {
  const date = getCachedDateParse(dateStr);
  date.setHours(0, 0, 0, 0);
  return date;
};

const playBubbleSound = () => {
  const audio = new Audio('/plugins/pinch/audio/correct.mp3');
  audio.volume = 0.1;
  audio.play().catch(() => {});
};



// 表情选择与情绪 SVG
const {
  moodEmojis,
  getMoodSvg,
  getSmallMoodSvg
} = useHabitEmojis();

const { t } = useHabitI18n();
const { rewardSnapshot } = useRewards();
const { goalItems } = useGoals();
const rewardLevelProgressStyle = computed(() => {
  const progress = Math.max(0, Math.min(100, Number(rewardSnapshot.value.levelProgressPercent) || 0));
  return {
    width: `${progress}%`,
    minWidth: progress > 0 ? '8px' : '0'
  };
});

const rewardLevelProgressText = computed(
  () => `${rewardSnapshot.value.currentLevelXp}/${rewardSnapshot.value.nextLevelXp} 碎片`
);

// 防抖的保存函数 - 优化性能，减少频繁的存储操作
let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const debouncedSaveHabits = async (habitsToSave: Habit[]) => {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }
  return new Promise<void>((resolve) => {
    saveDebounceTimer = setTimeout(async () => {
      await saveHabits(habitsToSave);
      resolve();
    }, 300); // 300ms 防抖延迟
  });
};

// 立即保存函数（用于关键操作）
const immediateSaveHabits = async (habitsToSave: Habit[]) => {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = null;
  }
  await saveHabits(habitsToSave);
};

// 习惯数据
const habits = shallowRef<Habit[]>([]);

function emitHabitsUpdated(nextHabits: Habit[] = habits.value): void {
  eventBus.emit(Events.HABITS_UPDATED, {
    habits: Array.isArray(nextHabits) ? [...nextHabits] : []
  });
}

const showAddHabitModal = ref(false);
const showTotalStatsPage = ref(false);
const showRewardPage = ref(false);
const showGoalPage = ref(false);
const showHabitManagerPage = ref(false);
const highlightedRewardEntryId = ref('');
const highlightedGoalId = ref('');
const focusTimerHostRef = ref<{
  open: (target?: FocusTimerLinkedTarget | null, options?: { showPanel?: boolean }) => void;
  syncTarget: (
    target?: FocusTimerLinkedTarget | null,
    options?: { openMiniSettings?: boolean }
  ) => void;
} | null>(null);
const {
  moodData,
  showMoodCalendar,
  moodCalendarCurrentMonth,
  showMoodTracker,
  selectedDate,
  moodEntry,
  loadMoodData,
  openMoodTracker,
  handleSaveMoodEntry,
  handleDeleteMoodEntry,
  closeMoodTracker,
  changeMoodCalendarMonth
} = useMoodTracker();
const showAnimation = ref(false);
const animationHabitId = ref<string | null>(null);
// 存储动画期间的原始完成状态
const animationOriginalStatus = ref<Record<string, boolean>>({});
const isHabitListCollapsed = ref(false);
const {
  calculateCurrentStreak,
  getWeeklyCompletionStatus,
  clearCompletionRateCacheForHabit,
  clearWeeklyCompletionCacheForHabit,
  clearCurrentStreakCacheForHabit,
  cleanupExpiredStatisticCaches,
  getMonthlyProgressData,
  calculateCompletionRate,
  calculateCurrentMonthStreak,
  calculateTotalMonthCompletions,
  calculateLongestStreak,
  calculateCommonTimeSlot,
  getHourDistribution,
  calculateTotalCompletionRate,
  totalHabitsCount,
  totalCompletionsCount,
  longestStreak,
  heatmapGridData,
  heatmapMonths
} = useHabitStatistics({
  habits,
  parseDate,
  formatDate,
  getToday
});
const {
  toggleHabitCompletion,
  toggleDayCompletion,
  buildToggleHabit,
  processRewardPayload
} = useHabitCheckin({
  habits,
  formatDate,
  parseDate,
  getToday,
  getWeeklyCompletionStatus,
  calculateCurrentStreak,
  calculateCurrentMonthStreak,
  calculateTotalMonthCompletions,
  clearWeeklyCompletionCacheForHabit,
  clearCurrentStreakCacheForHabit,
  clearCompletionRateCacheForHabit,
  debouncedSaveHabits,
  immediateSaveHabits,
  triggerHabitsRef: () => triggerRef(habits),
  animationOriginalStatus,
  showAnimation,
  animationHabitId,
  playBubbleSound,
  confirmUncheckMessage: '是否要取消打卡记录？'
});
const {
  activePomodoroHabit,
  inlineCircumference,
  inlineStrokeDashoffset,
  startPomodoroTimer,
  stopCurrentPomodoro,
  togglePomodoroPause,
  togglePomodoroResume,
  pomodoroStateClass,
  clearPomodoroForHabit,
  cleanupPomodoroTimers
} = useHabitPomodoro({
  habits,
  getToday,
  saveHabits,
  toggleHabitCompletion,
  playBubbleSound
});
const toggleHabit = buildToggleHabit({
  activePomodoroHabit,
  startPomodoroTimer,
  clearPomodoroForHabit,
  startFocusTimerForHabit: openFocusTimerForHabit
});
const {
  showBindDocModal,
  bindDocInput,
  openBindDocModal,
  closeBindDocModal,
  confirmBindDoc,
  clearBindDoc,
  handleHabitDocButton
} = useHabitDocBinding(habits, {
  saveHabitsNow: immediateSaveHabits
});

const toggleHabitListCollapsed = () => {
  isHabitListCollapsed.value = !isHabitListCollapsed.value;
};

function openFocusTimer(): void {
  focusTimerHostRef.value?.open(null);
}

function openFocusTimerForHabit(habit: Habit): void {
  focusTimerHostRef.value?.open(createHabitFocusTarget(habit));
}

function openFocusTimerForTask(task: Task): void {
  focusTimerHostRef.value?.open(createTaskFocusTarget(task));
}

function openPersonalStatsView(): void {
  void openTaskViewByRequest({ view: 'stats' });
}

async function completeFocusLinkedHabit(habitId: string): Promise<void> {
  const habit = habits.value.find(item => item.id === habitId);
  if (!habit || habit.isPaused || habit.completedToday) {
    return;
  }

  playBubbleSound();
  const rewardPayload = toggleHabitCompletion(habit, getToday(), { source: 'pomodoro' });
  await immediateSaveHabits(habits.value);
  processRewardPayload(rewardPayload);
}


const {
  weekDates,
  weekdaysForCalendar,
  getCalendarViewData,
  generateMonthViewData,
  getStatsMonthViewData,
  changeStatsCalendarPeriod,
  getCurrentPeriodText,
  getHabitCache
} = useHabitViewData({
  habits,
  formatDate,
  getToday,
  getWeeklyCompletionStatus
});

const { sortedHabits } = useHabitSorting({
  habits,
  getHabitCache,
  animationOriginalStatus
});
const visibleHabits = computed(() => sortedHabits.value.filter(habit => !habit.isPaused));
let unsubscribePanelOpenRequest: (() => void) | null = null;
let unsubscribeFocusTimerOpenRequest: (() => void) | null = null;

watch(habits, (nextHabits) => {
  emitHabitsUpdated(nextHabits);
});

const { newHabit, difficultyOptions, frequencyOptions, timesPerDayOptions, pomodoroDurationOptions } = useHabitFormState(t);

function handlePanelOpenRequest(payload?: HabitTrackerPanelOpenRequest): void {
  if (!payload) {
    return;
  }

  if (payload.target === 'habit-total') {
    openTotalStatsPage();
    return;
  }

  if (payload.target === 'habit-detail') {
    const targetHabit = habits.value.find(habit => habit.id === payload.habitId);
    if (targetHabit) {
      showHabitStats(targetHabit);
      return;
    }
    openTotalStatsPage();
    return;
  }

  if (payload.target === 'reward') {
    openRewardPage(payload.rewardEntryId || '');
    return;
  }

  openGoalPage(payload.goalId || '');
}

function handleFocusTimerOpenRequest(payload?: FocusTimerPanelOpenRequest): void {
  if (payload?.showPanel === false) {
    focusTimerHostRef.value?.syncTarget(payload?.target ?? null, {
      openMiniSettings: payload?.openMiniSettings === true
    });
    return;
  }
  focusTimerHostRef.value?.open(payload?.target ?? null);
}

// 初始化数据
onMounted(async () => {
  unsubscribePanelOpenRequest = eventBus.on(
    Events.HABIT_TRACKER_PANEL_OPEN_REQUEST,
    handlePanelOpenRequest
  );
  unsubscribeFocusTimerOpenRequest = eventBus.on(
    Events.FOCUS_TIMER_PANEL_OPEN_REQUEST,
    handleFocusTimerOpenRequest
  );

  try {
    const loadedHabits = await getHabits();
    habits.value = Array.isArray(loadedHabits) ? loadedHabits : [];
    
    const todayStr = getToday();

    // 加载情绪数据
    await loadMoodData();
    
    // 初始化每个习惯的completedToday属性

    habits.value.forEach(habit => {
      if (!habit || typeof habit !== 'object') return;
      if (!Array.isArray(habit.calendar)) {
        habit.calendar = [];
      }
      const todayRecord = habit.calendar.find(day => day.date === todayStr);
      habit.completedToday = todayRecord ? Boolean(todayRecord.completed) : false;
    });

    
    // 定期清理过期缓存（每小时清理一次）
    cacheCleanupTimer = setInterval(() => {
      cleanupExpiredStatisticCaches();
    }, 3600000) as unknown as number; // 1小时
    
  } catch (error) {
    console.error('Error initializing habits:', error);
    // 初始化失败时，使用空数组，确保界面仍能显示
    habits.value = [];
  }
});

// 组件卸载时清理定时器
onUnmounted(() => {
  unsubscribePanelOpenRequest?.();
  unsubscribePanelOpenRequest = null;
  unsubscribeFocusTimerOpenRequest?.();
  unsubscribeFocusTimerOpenRequest = null;

  // 清理主定时器
  if ((window as any).habitTrackerTimer) {
    clearInterval((window as any).habitTrackerTimer);
    delete (window as any).habitTrackerTimer;
  }
  
  // 清理备用定时器
  if ((window as any).habitTrackerBackupTimer) {
    clearInterval((window as any).habitTrackerBackupTimer);
    delete (window as any).habitTrackerBackupTimer;
  }
  
  // 清理番茄钟定时器
  cleanupPomodoroTimers();
  
  // 清理缓存清理定时器
  if (cacheCleanupTimer !== null) {
    clearInterval(cacheCleanupTimer);
    cacheCleanupTimer = null;
  }
});

// 缓存清理定时器 ID
let cacheCleanupTimer: number | null = null;

// 格式化番茄钟时间显示
const formatPomodoroTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};


// 计算条形图高度
const calculateBarHeight = (count: number) => {
  if (count <= 0) return 5;
  // maxCount 已从外部预计算传入，此处不再重复调用 getHourDistribution
  return Math.max(5, (count / maxHourCount.value) * 80);
};

// 预计算小时分布的最大值，避免在模板 v-for 中重复调用 getHourDistribution
const maxHourCount = computed(() => {
  if (!selectedHabit.value) return 1;
  const dist = getHourDistribution(selectedHabit.value);
  return Math.max(...dist.map(h => h.count), 1);
});

// 当前选中的习惯
const selectedHabit = ref<Habit | null>(null);

// 选中习惯的最长连续打卡 - 缓存计算结果避免重复计算
const selectedHabitLongestStreak = computed(() =>
  selectedHabit.value ? calculateLongestStreak(selectedHabit.value) : { streak: 0, startDate: null, endDate: null }
);

// 统计面板数据 — 使用 computed 缓存 + try-catch 防止渲染期异常导致界面卡死
const statsMonthViewData = computed(() => {
  try {
    return selectedHabit.value ? getStatsMonthViewData(selectedHabit.value) : [];
  } catch (e) {
    console.error('getStatsMonthViewData error:', e);
    return [];
  }
});
const statsCurrentPeriodText = computed(() => {
  try {
    return selectedHabit.value ? getCurrentPeriodText(selectedHabit.value) : '';
  } catch (e) {
    console.error('getCurrentPeriodText error:', e);
    return '';
  }
});
const statsCurrentMonthStreak = computed(() => {
  try {
    return selectedHabit.value ? calculateCurrentMonthStreak(selectedHabit.value) : 0;
  } catch (e) {
    console.error('calculateCurrentMonthStreak error:', e);
    return 0;
  }
});
const statsTotalMonthCompletions = computed(() => {
  try {
    return selectedHabit.value ? calculateTotalMonthCompletions(selectedHabit.value) : 0;
  } catch (e) {
    console.error('calculateTotalMonthCompletions error:', e);
    return 0;
  }
});
const statsCompletionRate = computed(() => {
  try {
    return selectedHabit.value ? calculateCompletionRate(selectedHabit.value) : 0;
  } catch (e) {
    console.error('calculateCompletionRate error:', e);
    return 0;
  }
});
const statsMonthlyProgressData = computed(() => {
  try {
    return selectedHabit.value ? getMonthlyProgressData(selectedHabit.value) : [];
  } catch (e) {
    console.error('getMonthlyProgressData error:', e);
    return [];
  }
});
const statsTotalCompletionRate = computed(() => {
  try {
    return selectedHabit.value ? calculateTotalCompletionRate(selectedHabit.value) : 0;
  } catch (e) {
    console.error('calculateTotalCompletionRate error:', e);
    return 0;
  }
});
const statsCommonTimeSlot = computed(() => {
  try {
    return selectedHabit.value ? calculateCommonTimeSlot(selectedHabit.value) : '';
  } catch (e) {
    console.error('calculateCommonTimeSlot error:', e);
    return '';
  }
});
const statsHourDistribution = computed(() => {
  try {
    return selectedHabit.value ? getHourDistribution(selectedHabit.value) : [];
  } catch (e) {
    console.error('getHourDistribution error:', e);
    return [];
  }
});
const latestRewardEntry = computed(() => rewardSnapshot.value.recentEntries[0] || null);
const completedGoalCount = computed(() => goalItems.value.filter(goal => goal.status === 'completed').length);
const goalSummaryValueText = computed(() => `${completedGoalCount.value}/${goalItems.value.length}`);
const featuredGoal = computed(() =>
  goalItems.value.find(goal => goal.documentCount > 0 && goal.status === 'in-progress')
  || goalItems.value.find(goal => goal.documentCount > 0 && goal.status === 'completed')
  || goalItems.value.find(goal => goal.documentCount > 0)
  || goalItems.value[0]
  || null
);
const featuredGoalText = computed(() => {
  if (!featuredGoal.value) {
    return '';
  }
  if (featuredGoal.value.documentCount === 0) {
    return '还没有选择文档';
  }
  if (featuredGoal.value.totalTasks === 0) {
    return '当前暂无可统计任务';
  }
  return `${featuredGoal.value.progressPercent}% · ${featuredGoal.value.completedTasks}/${featuredGoal.value.totalTasks}`;
});
const featuredGoalProgressPercent = computed(() => {
  if (!featuredGoal.value || featuredGoal.value.documentCount === 0 || featuredGoal.value.totalTasks <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, Number(featuredGoal.value.progressPercent) || 0));
});
const featuredGoalProgressText = computed(() => {
  if (!featuredGoal.value) {
    return '';
  }
  if (featuredGoal.value.documentCount === 0) {
    return '未选文档';
  }
  if (featuredGoal.value.totalTasks === 0) {
    return '暂无任务';
  }
  return `${featuredGoal.value.completedTasks}/${featuredGoal.value.totalTasks}`;
});

function closeTrackerPanels(): void {
  showTotalStatsPage.value = false;
  showRewardPage.value = false;
  showGoalPage.value = false;
  showHabitManagerPage.value = false;
  selectedHabit.value = null;
}

function closeTotalStatsPage(): void {
  showTotalStatsPage.value = false;
}

function closeRewardPage(): void {
  showRewardPage.value = false;
  highlightedRewardEntryId.value = '';
}

function closeGoalPage(): void {
  showGoalPage.value = false;
  highlightedGoalId.value = '';
}

function openTotalStatsPage(): void {
  closeTrackerPanels();
  highlightedRewardEntryId.value = '';
  highlightedGoalId.value = '';
  showRewardPage.value = false;
  showGoalPage.value = false;
  showTotalStatsPage.value = true;
}

function openRewardPage(entryId: string = ''): void {
  closeTrackerPanels();
  highlightedGoalId.value = '';
  highlightedRewardEntryId.value = entryId;
  showRewardPage.value = true;
}

function openGoalPage(goalId: string = ''): void {
  closeTrackerPanels();
  highlightedRewardEntryId.value = '';
  highlightedGoalId.value = goalId;
  showGoalPage.value = true;
}

const showHabitStats = (habit: Habit) => {
  closeTrackerPanels();
  highlightedRewardEntryId.value = '';
  highlightedGoalId.value = '';
  selectedHabit.value = habit;
};

// 显示编辑习惯模态框
const showEditHabitModal = ref(false);
const editedHabit = ref<Habit | null>(null);

const {
  handleAddHabit,
  deleteHabit,
  openEditHabitModal,
  closeEditHabitModal,
  saveEditedHabit,
  togglePauseHabit
} = useHabitCrud({
  habits,
  selectedHabit,
  showAddHabitModal,
  newHabit,
  showEditHabitModal,
  editedHabit,
  t,
  saveHabitsNow: saveHabits,
  immediateSaveHabits,
  triggerHabitsRef: () => triggerRef(habits),
  normalizeDocId
});


// 关闭统计页面
const closeHabitStats = () => {
  selectedHabit.value = null;
};

// 切换统计页面视图模式（已移除，统计页面只显示月视图）
// const toggleStatsViewMode = (habit: Habit) => {
//   initializeStatsViewMode(habit);
//   habit.statsViewMode = habit.statsViewMode === 'month' ? 'week' : 'month';
// };
</script>

<style lang="scss" scoped>
.Pinch-habit-container {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  overflow-y: auto;
  padding: 4px;
  
  .Pinch-habit-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    
    h2 {
      margin: 0;
      color: var(--b3-theme-on-background);
    }
    
    .icon {
      margin-right: 4px;
      vertical-align: middle;
      width: 16px;
      height: 16px;
    }

  }
      #add-habit-btn,
      #stats-btn,
      #habit-manage-btn,
      #task-stats-btn,
      #mood-calendar-btn,
      #focus-timer-btn {
      background: none;
      border: none;
      padding: 0;
      margin: 0 6px 0 0;
      cursor: pointer;
    }

    #add-habit-btn,
    #stats-btn,
    #habit-manage-btn {
      width: 24px;
      height: 24px;

      svg {
        color: var(--b3-theme-on-background);
        width: 24px;
        height: 24px;
      }
    }

    #mood-calendar-btn,
    #focus-timer-btn,
    #task-stats-btn {
      width: 24px;
      height: 24px;

      svg {
        color: var(--b3-theme-on-background);
        width: 24px;
        height: 24px;
      }
    }
  .summary-card-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    margin: 14px 0 4px;
  }

  .reward-summary-card,
  .goal-summary-card {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 10px 16px;
    border-radius: 20px;
    cursor: pointer;
    min-width: 0;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .reward-summary-card {
    position: relative;
    background:  var(--pinch-background10);
    border: 0.5px solid var(--pinch-color10);
    box-shadow: #0000000f 0 1px 5px;

    &:hover {
      transform: translateY(-1px);
    }
  }

  .goal-summary-card {
    position: relative;
    background: var(--pinch-background6);
    border: 0.5px solid var(--pinch-color6);
    box-shadow: #0000000f 0 1px 5px;

    &:hover {
      transform: translateY(-1px);
    }
  }

  .reward-summary-main {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }

  .reward-summary-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .reward-summary-level {
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    color: var(--b3-theme-on-background);
    background:  var(--b3-theme-background);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .reward-summary-progress {
    display: flex;
    align-items: center;
    flex: 1 1 auto;
    min-width: 0;
    gap: 10px;
  }

  .reward-summary-progress-bar {
    position: relative;
    flex: 1 1 72px;
    height: 8px;
    min-width: 0;
    border-radius: 999px;
    overflow: hidden;
    background: var(--b3-list-hover);
  }

  .reward-summary-progress-fill {
    position: absolute;
    inset: 0 auto 0 0;
    display: block;
    border-radius: inherit;
    background: #f98f7a;
  }

  .header-buttons #mood-calendar-btn,
  .header-buttons #focus-timer-btn,
  .header-buttons #task-stats-btn {
    margin-right: 0;
  }

  .reward-summary-latest,
  .reward-summary-empty {
    font-size: 10px;
    line-height: 1.5;
    color: var(--b3-theme-on-background);
  }

  .reward-summary-latest {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .reward-summary-latest-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
    color: var(--b3-theme-on-surface);
  }

  .reward-summary-latest-points {
    color: var(--pinch-font-color10);
    opacity: 0.7;
  }

  .reward-summary-stats {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .reward-summary-stat {
    display: flex;
    flex-direction: row;
    align-items: baseline;
    justify-content: flex-start;
    gap: 8px;
  }

  .reward-summary-stat-value {
    font-size: 24px;
    font-weight: 700;
    color: var(--b3-theme-on-background);
  }

  .reward-summary-stat-label {
    margin-top: 0;
    font-size: 12px;
    font-weight: 700;
    color: var(--b3-theme-on-background);
    white-space: nowrap;
  }

  .goal-summary-main {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }

  .goal-summary-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .goal-summary-level {
    display: flex;
    flex-direction: row;
    align-items: baseline;
    justify-content: flex-start;
    gap: 8px;
  }

  .goal-summary-level-value {
    font-size: 24px;
    font-weight: 700;
    color: var(--b3-theme-on-background);
  }

  .goal-summary-level-label {
    margin-top: 0;
    font-size: 12px;
    font-weight: 700;
    color: var(--b3-theme-on-background);
    white-space: nowrap;
  }

  .goal-summary-latest,
  .goal-summary-empty {
    font-size: 10px;
    line-height: 1.5;
    color: var(--b3-theme-on-background);
  }

  .goal-summary-latest {
    display: flex;
    flex-direction: column;
  }

  .goal-summary-latest-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
    color: var(--b3-theme-on-surface);
  }

  .goal-summary-latest-points {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    color: var(--b3-theme-on-background);
  }

  .goal-summary-latest-points-bar {
    position: relative;
    flex: 1 1 auto;
    min-width: 0;
    height: 6px;
    border-radius: 999px;
    overflow: hidden;
    background: var(--b3-list-hover);

    span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: var(--pinch-color6);
    }
  }

  .goal-summary-latest-points-text {
    flex: 0 0 auto;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    color: var(--pinch-font-color6);
    opacity: 0.7;
  }

  .habit-manager-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    margin-top: 16px;
  }

  .habit-manager-header .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .habit-manager-header .collapse-arrow {
    cursor: pointer;
    transition: transform 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    border-radius: 4px;
    
    &:hover {
      background-color: var(--b3-list-hover);
    }
    
    &.collapsed {
      transform: rotate(-90deg);
    }
    
    .icon {
      color: var(--b3-theme-on-background);
    }
  }

  .habit-manager-header .title {
    font-size: 16px;
    font-weight: 700;
    color: var(--b3-theme-on-background);
  }

  .habit-manager-header .header-actions {
    display: flex;
  }

  .habit-manage-panel {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 3;
    background: var(--b3-theme-background);
    box-sizing: border-box;
    padding: 12px;
    display: flex;
    flex-direction: column;
  }

  .habit-manage-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .habit-manage-panel-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--b3-theme-on-background);
  }

  .habit-manage-panel-close {
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 6px;
    background: transparent;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--b3-theme-on-background);
  }

  .habit-manage-panel-close:hover {
    background: var(--b3-list-hover);
  }

  .habit-manage-panel-body {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }

}

.stats-panel {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  box-sizing: border-box;
  overflow-y: auto;
  display: flex;
  padding: 10px;
  flex-direction: column;
  --s: 20px; /* control the size*/
  --c1: #2a936a;
  --c2: #32a176;
  --_g: radial-gradient(calc(var(--s)/2),var(--c1) 97%,#0000);
  background:
    var(--_g),var(--_g) calc(2*var(--s)) calc(2*var(--s)),
    repeating-conic-gradient(from 45deg,#0000 0 25%,var(--c2) 0 50%) calc(-.707*var(--s)) calc(-.707*var(--s)),
    repeating-linear-gradient(135deg,var(--c1) calc(var(--s)/-2) calc(var(--s)/2),var(--c2) 0 calc(2.328*var(--s)));
  background-size: calc(4*var(--s)) calc(4*var(--s));
  
  /* 隐藏滚动条但保持滚动功能 */
  -ms-overflow-style: none; /* IE 和 Edge */
  scrollbar-width: none; /* Firefox */
  
  &::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }
  
  .stats-header {
    display: flex;
    flex-direction: column;
    padding-bottom: 10px;
    
    .stats-emoji {
      font-size: 70px;
      align-self: center;
      height: 100px;
    }
    
    .habit-frequency {
      text-align: center;
      font-size: 10px;
      color: #fff;
      padding: 4px 10px;
      background-color: #21855e;
      border-radius: 12px;
    }
    
    .habit-created {
      text-align: center;
      font-size: 10px;
      color: #fff;
      padding: 4px 10px;
      background-color: #21855e;
      border-radius: 12px;
    }
    
    .habit-meta {
      display: flex;
      justify-content: center;
      gap: 10px;
      width: 100%;
    }
    
    .stats-header-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      margin-bottom: 10px;
    }
    
    .stats-title {
      font-size: 18px;
      font-weight: bold;
      color: var(--b3-theme-background);
    }
    
    .stats-header-buttons {
      display: flex;
      gap: 8px;
      align-items: center;
    }
  }
  .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 34px;
      margin-top: 10px;
      padding: 10px 0;
      border-top: 1px solid var(--b3-border-color);
      
      .stat-item {
        text-align: center;
        border-radius: 24px;
        
        .stat-value {
          font-size: 24px;
          font-weight: 600;
          color: var(--b3-theme-on-background);
          margin-bottom: 4px;
          span {
            font-size: 12px;
          }
        }
        
        .stat-label {
          font-size: 12px;
          color: var(--b3-scroll-color);
        }
      }
    }
  .stats-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    
    .calendar-controls {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 16px;
      padding: 8px;
      background: var(--b3-list-background);
      border-radius: 4px;
      
      .view-selector {
        display: flex;
        gap: 4px;
        
        .sy-button {
          min-width: 60px;
        }
      }
      
      .calendar-navigation {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        justify-content: center;
        
        .nav-btn {
          background: none;
          border: none;
          padding: 4px;
          cursor: pointer;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s;
          
          &:hover {
            background-color: var(--b3-list-hover);
          }
          
          &:active {
            background-color: var(--b3-list-hover);
          }
        }
        
        .current-period {
          text-align: center;
          font-size: 14px;
          flex: 1;
          font-weight: 600;
        }
      }
    }
    
    .calendar-container {
      background-color: var(--b3-theme-background);
      padding: 16px 16px 8px 16px;
      border-radius: 24px;
      box-shadow: rgba(0, 0, 0, 0.06) 0px 1px 5px 0px;
    }

    .calendar-view {
      flex: 1;
      margin-bottom: 20px;
      
      .weekdays-header {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        text-align: center;
        font-weight: bold;
        margin-bottom: 8px;
        color: var(--b3-theme-on-surface);
        gap: 14px;
        font-size: 12px;
      }
      
      .week-view {
        .week-data {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
        }
      }
      
      .month-view {
        .month-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 14px;
        }
      }
      
      .day {
        position: relative;
        aspect-ratio: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: var(--b3-list-background);
        cursor: default;
        font-weight: 600;
        transition: background-color 0.2s;
        
        &.completed {
          background: #f98f7a;
          color: var(--b3-theme-background);
          font-weight: bold;
        }
        
        &.today:not(.completed) {
          color: #f98f7a;
        }
        
        &.not-current-month:not(.completed) {
          color: var(--b3-theme-on-background);
        }
        &.not-current-month{
          opacity: 0.3;
        }
        
        &.past:not(.completed) {
          color: oklch(68.98% 0.161 30.76 / 0.3);
        }
        
        &.future:not(.completed) {
          color: var(--b3-list-hover);
        }
        
        .day-number {
          font-size: 14px;
        }
      }
    }
    
    .stats-actions {
      display: flex;
      flex-direction: column;
      margin-top: 60px;
      gap: 8px;
      width: 100%;
      
      .sy-button {
        width: 100%;
        min-width: auto;
      }
    }
  }
}



.stats-panel{
  background-color: var(--Sv-theme-surface);
}

.today-calendar {
  margin-bottom: 20px;
  padding: 16px;
  background-color: var(--b3-theme-surface);
  border: 1px solid var(--b3-border-color);
  border-radius: var(--b3-border-radius);
  box-shadow: var(--b3-point-shadow);
  
  .calendar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--b3-border-color);
    
    h3 {
      margin: 0;
      font-size: 16px;
      color: var(--b3-theme-on-background);
    }
    
    .calendar-actions {
      display: flex;
      gap: 8px;
      
      .sy-button {
        min-width: 40px;
      }
    }
  }
  
  .calendar-day {
    .day-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding: 8px 0;
      
      .day-date {
        font-size: 18px;
        font-weight: bold;
        color: var(--b3-theme-on-background);
      }
      
      .day-weather {
        font-size: 16px;
      }
    }
    
    .day-habits {
      .habit-item {
        display: flex;
        align-items: center;
        padding: 8px;
        margin-bottom: 8px;
        background-color: var(--b3-list-background);
        border-radius: 4px;
        
        &:last-child {
          margin-bottom: 0;
        }
        
        .habit-emoji {
          margin-right: 8px;
          font-size: 18px;
        }
        
        .habit-name {
          flex: 1;
          color: var(--b3-theme-on-background);
        }
        
        .sy-checkbox {
          margin-left: auto;
        }
      }
      
      .no-habits {
        text-align: center;
        padding: 20px;
        color: var(--b3-font-color3);
        font-style: italic;
      }
    }
  }
}

@media (max-width: 720px) {
  .Pinch-habit-container {
    .header-content {
      gap: 8px;
    }

    .date-display {
      gap: 8px;
    }

    .header-buttons {
      gap: 2px;
    }

    .date-display .reward-summary-progress {
      gap: 6px;
    }

    .reward-summary-level {
      padding: 4px 8px;
      font-size: 11px;
    }

    .reward-summary-progress-bar {
      min-width: 0;
    }

    .summary-card-grid {
      grid-template-columns: 1fr;
    }

    .reward-summary-card,
    .goal-summary-card {
      grid-template-columns: 1fr;
    }
  }
}

</style>
