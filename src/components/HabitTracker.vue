<template>
  <div class="Pinch-habit-container">
    <!-- 习惯列表页面 -->
    <div class="habit-list-container">
      <div class="Pinch-habit-header">
        <div class="header-content">
          <div class="date-display">{{ currentDateString.split('/')[0] }}<span>.</span>{{ currentDateString.split('/')[1] }}<span>.</span>{{ currentDateString.split('/')[2] }}</div>
          <div class="header-buttons">
            <SyButton @click="showFocusTimer = true" id="focus-timer-btn" class="focus-timer-btn" title="专注倒计时">
              <Icon name="timer" width="24" height="24" class="icon" />
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
            <SyButton @click="showTotalStatsPage = true" id="stats-btn" class="stats-btn">
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
      :month-view-data="selectedHabit ? getStatsMonthViewData(selectedHabit) : []"
      :current-period-text="selectedHabit ? getCurrentPeriodText(selectedHabit) : ''"
      :current-month-streak="selectedHabit ? calculateCurrentMonthStreak(selectedHabit) : 0"
      :total-month-completions="selectedHabit ? calculateTotalMonthCompletions(selectedHabit) : 0"
      :completion-rate="selectedHabit ? calculateCompletionRate(selectedHabit) : 0"
      :monthly-progress-data="selectedHabit ? getMonthlyProgressData(selectedHabit) : []"
      :longest-streak="selectedHabitLongestStreak"
      :total-completion-rate="selectedHabit ? calculateTotalCompletionRate(selectedHabit) : 0"
      :common-time-slot="selectedHabit ? calculateCommonTimeSlot(selectedHabit) : ''"
      :hour-distribution="selectedHabit ? getHourDistribution(selectedHabit) : []"
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
      @close="showTotalStatsPage = false"
    />
    
    <!-- 编辑习惯模态框 -->
    <HabitModal 
      :show="showEditHabitModal"
      mode="edit"
      :habit="editedHabit"
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
    
    <!-- 专注倒计时 -->
    <FocusTimer
      :show="showFocusTimer"
      :mini-enabled="floatingFocusEnabled"
      @update:miniEnabled="floatingFocusEnabled = $event"
      @close="showFocusTimer = false"
    />

    <!-- 悬浮专注胶囊 -->
    <FloatingFocusCapsule :enabled="floatingFocusEnabled" />
    
    <!-- 任务管理器容器 -->
    <div class="stand-container">
      <TaskManager />
    </div>
  </div>
</template>

<style scoped>
.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.date-display {
  font-weight: bold;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 5px;
}

.date-display span {
  color: var(--b3-theme-on-background);
}

.header-buttons {
  display: flex;
  align-items: center;
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
import HabitStatsPanel from '@/components/HabitStatsPanel.vue';
import HabitCardList from '@/components/HabitCardList.vue';
import MoodCalendarPanel from '@/components/MoodCalendarPanel.vue';
import FocusTimer from '@/components/FocusTimer.vue';
import FloatingFocusCapsule from '@/components/FloatingFocusCapsule.vue';
import TaskManager from '@/components/TaskManager.vue';
import HabitDocBindDialog from '@/components/HabitDocBindDialog.vue';
import { getHabits, saveHabits, Habit } from '@/api';
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
const showAddHabitModal = ref(false);
const showTotalStatsPage = ref(false);
const showHabitManagerPage = ref(false);
const showFocusTimer = ref(false);
const floatingFocusEnabled = ref(false);
const FLOATING_FOCUS_STORAGE_KEY = 'pinch-floating-focus-enabled';
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
  buildToggleHabit
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
  clearPomodoroForHabit
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


const {
  weekDates,
  weekdaysForCalendar,
  currentDateString,
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

const { newHabit, frequencyOptions, timesPerDayOptions, pomodoroDurationOptions } = useHabitFormState(t);

// 初始化数据
onMounted(async () => {
  try {
    const savedState = localStorage.getItem(FLOATING_FOCUS_STORAGE_KEY);
    if (savedState !== null) {
      floatingFocusEnabled.value = savedState === 'true';
    }
  } catch {
    // ignore storage errors
  }

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

watch(floatingFocusEnabled, (value) => {
  try {
    localStorage.setItem(FLOATING_FOCUS_STORAGE_KEY, String(value));
  } catch {
    // ignore storage errors
  }
});

// 组件卸载时清理定时器
onUnmounted(() => {
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
  // 根据打卡次数计算条形图高度，最大高度设为80%
  // 如果没有打卡记录，返回最小高度
  if (count <= 0) return 5;
  
  // 找到所有小时中的最大打卡次数
  const hourDistribution = getHourDistribution(selectedHabit.value);
  const maxCount = Math.max(...hourDistribution.map(h => h.count), 1);
  
  // 计算相对高度，最大为80%
  return Math.max(5, (count / maxCount) * 80);
};

// 当前选中的习惯
const selectedHabit = ref<Habit | null>(null);

// 选中习惯的最长连续打卡 - 缓存计算结果避免重复计算
const selectedHabitLongestStreak = computed(() =>
  selectedHabit.value ? calculateLongestStreak(selectedHabit.value) : { streak: 0, startDate: null, endDate: null }
);

// 显示习惯统计页面
const showHabitStats = (habit: Habit) => {
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
    margin-bottom: 16px;
    
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
    #focus-timer-btn {
      width: 24px;
      height: 24px;

      svg {
        color: var(--b3-theme-on-background);
        width: 24px;
        height: 24px;
      }
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

</style>
