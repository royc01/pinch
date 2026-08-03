<template>
  <div
    ref="habitContainerRef"
    class="Pinch-habit-container"
    :class="mobileNavTransitionClass"
  >
    <!-- 习惯列表页面 -->
    <div v-show="!showInlineTaskViews" class="habit-list-container">
      <div class="Pinch-habit-header">
        <div class="header-content">
          <label class="profile-avatar ariaLabel" aria-label="Upload avatar">
            <input type="file" accept="image/*" @change="handleAvatarUpload" />
            <img v-if="userSettings.sidebar.avatarDataUrl" :src="userSettings.sidebar.avatarDataUrl" alt="" />
            <Icon v-else name="defaultAvatar" width="56" height="56" aria-hidden="true" />
          </label>
          <div class="reward-progress-overview">
            <div class="reward-progress-labels">
              <span class="reward-summary-level">Lv.{{ rewardSnapshot.level }}</span>
              <span class="reward-summary-xp">{{ rewardLevelProgressText }}</span>
            </div>
            <div class="reward-summary-progress">
              <div
                class="reward-summary-progress-bar ariaLabel"
                :aria-label="rewardLevelProgressText"
              >
                <span class="reward-summary-progress-fill" :style="rewardLevelProgressStyle"></span>
              </div>
            </div>
          </div>
          <button
            type="button"
            class="reward-summary-card ariaLabel"
            :aria-label="t('habitTracker.openRewardShop')"
            @click="openRewardPage()"
          >
            <Icon name="rewardCoin" width="20" height="20" aria-hidden="true" />
            <span class="reward-summary-balance">{{ rewardSnapshot.availableCoins }}</span>
          </button>
        </div>
      </div>

      <!-- 本周日期显示，从周一开始 -->
      <WeekDates
        v-if="isSidebarSectionVisible('week-dates')"
        :style="getSidebarSectionStyle('week-dates')"
        :week-dates="weekDates"
        :mood-data="moodData"
        :open-mood-tracker="openMoodTracker"
        :get-small-mood-svg="getSmallMoodSvg"
        :empty-tooltip-label="t('moodTracker.addDailyRecordHint')"
      />

      <div
        v-if="isSidebarSectionVisible('habit-list')"
        class="habit-list"
        :style="getSidebarSectionStyle('habit-list')"
      >
        <!-- 习惯打卡标题 -->
        <div class="habit-manager-header" :class="{ 'is-collapsed': isHabitListCollapsed }">
          <div class="header-left">
            <div class="collapse-arrow" @click="toggleHabitListCollapsed" :class="{ collapsed: isHabitListCollapsed }">
              <Icon name="arrowDown" width="16" height="16" class="icon" />
            </div>
            <div class="title ariaLabel" :aria-label="t('habitTracker.calendarDisplayTip')">{{ t('habitTracker.title') }}</div>
          </div>
          <div class="header-actions">
            <SyButton
              @click="showHabitManagerPage = true"
              id="habit-manage-btn"
              class="habit-manage-btn ariaLabel"
              :aria-label="t('habitTracker.manageHabits')"
            >
              <Icon name="more" width="24" height="24" class="icon" />
            </SyButton>
            <SyButton @click="openTotalStatsPage" id="stats-btn" class="stats-btn ariaLabel" :aria-label="t('habitTracker.openStatsView')">
              <Icon name="stats" width="24" height="24" class="icon" />
            </SyButton>
            <SyButton @click="showAddHabitModal = true" id="add-habit-btn" class="add-habit-btn ariaLabel" :aria-label="t('habitTracker.addHabitAria')">
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
          :is-habit-scheduled-today="isHabitScheduledToday"
          :pomodoro-state-class="pomodoroStateClass"
          :format-pomodoro-time="formatPomodoroTime"
            @show-stats="showHabitStats"
            @doc-button="handleHabitDocButton"
            @open-bind-doc="openBindDocModal"
            @start-focus="openFocusTimerForHabit"
            @toggle-habit="toggleHabit"
            @toggle-habit-with-note="openCheckinNoteDialog"
            @bind-doc="handleBindDocFromDrag"
            @pomodoro-pause="togglePomodoroPause"
            @pomodoro-resume="togglePomodoroResume"
          @pomodoro-stop="stopCurrentPomodoro"
        />
      </div>

      <!-- 莉ｻ蜉｡邂｡逅・勣螳ｹ蝎ｨ -->
      <div
        v-show="isSidebarSectionVisible('stand-container')"
        class="stand-container"
        :style="getSidebarSectionStyle('stand-container')"
      >
        <TaskManager ref="taskManagerRef" @start-focus="openFocusTimerForTask" />
      </div>
    </div>

    <section v-if="showInlineTaskViews" class="inline-task-views">
      <KanbanView />
    </section>

    <div v-if="showHabitManagerPage" class="habit-manage-panel">
      <div class="habit-manage-panel-header">
        <div class="habit-manage-panel-title">{{ t('habitTracker.manageHabits') }}</div>
        <button
          type="button"
          class="habit-manage-panel-close ariaLabel"
          :aria-label="t('common.close')"
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
          :is-habit-scheduled-today="isHabitScheduledToday"
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
      :month-checkin-notes="statsMonthCheckinNotes"
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
      @open-task-scope="openGoalTaskScope"
    />
    
    <!-- 编辑习惯模态框 -->
    <HabitModal 
      :show="showEditHabitModal"
      mode="edit"
      :habit="editedHabit"
      :difficulty-options="difficultyOptions"
      :frequency-options="frequencyOptions"
      :completion-mode-options="completionModeOptions"
      :times-per-day-options="timesPerDayOptions"
      :pomodoro-duration-options="pomodoroDurationOptions"
      :t="t"
      :overlay-style="sidebarModalOverlayStyle"
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
      :completion-mode-options="completionModeOptions"
      :times-per-day-options="timesPerDayOptions"
      :pomodoro-duration-options="pomodoroDurationOptions"
      :t="t"
      :overlay-style="sidebarModalOverlayStyle"
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
    
    <HabitCheckinNoteDialog
      :show="showCheckinNoteDialog"
      :habit-name="checkinNoteHabit?.name || ''"
      :habit-emoji="checkinNoteHabit?.emoji"
      :is-edit="checkinNoteIsEdit"
      :initial-note="checkinNoteInitial"
      :focus-notes="checkinFocusNoteItems"
      :has-note-doc="!!checkinNoteHabit?.noteDocId"
      :can-undo-once="canUndoCheckinOnce(checkinNoteHabit)"
      :can-clear-today="canClearTodayCheckin(checkinNoteHabit)"
      @close="closeCheckinNoteDialog"
      @confirm="handleCheckinNoteConfirm"
      @undo-once="handleCheckinNoteUndoOnce"
      @clear-today="handleCheckinNoteClearToday"
      @bind-doc="handleCheckinNoteBindDoc"
    />
    
    <!-- 情绪打卡模态框 -->
    <MoodTrackerModal
      :show="showMoodTracker"
      :selectedDate="selectedDate"
      :moodEntry="moodEntry"
      :moodEmojis="moodEmojis"
      :habits="habits"
      :overlay-style="sidebarModalOverlayStyle"
      @close="closeMoodTracker"
      @save="handleSaveMoodEntry"
    />
    
    <!-- 情绪打卡月视图 -->
    <MoodCalendarPanel
      :show="showMoodCalendar"
      :mood-data="moodData"
      :habits="habits"
      :current-month="moodCalendarCurrentMonth"
      :weekdays="weekdaysForCalendar"
      :generate-month-view-data="generateMonthViewData"
      :get-large-mood-svg="(emoji) => getMoodSvg(emoji, 'large')"
      @close="showMoodCalendar = false"
      @open-mood-tracker="openMoodTracker"
      @change-month="changeMoodCalendarMonth"
      @mood-data-updated="moodData = $event"
    />
    
    <FocusTimerHost
      ref="focusTimerHostRef"
      @complete-linked-habit="completeFocusLinkedHabit"
      @visibility-change="handleFocusTimerVisibilityChange"
      @open-settings="openFocusTimerSettings"
    />

    <nav class="habit-floating-nav" :style="sidebarModalOverlayStyle" aria-label="快捷导航">
      <button
        v-for="item in floatingNavItems"
        :key="item.id"
        type="button"
        class="habit-floating-nav-item"
        :class="{ 'is-active': activeFloatingNav === item.id }"
        :aria-current="activeFloatingNav === item.id ? 'page' : undefined"
        @click="handleFloatingNav(item.id)"
      >
        <Icon :name="item.icon" width="24" height="24" class="icon" />
        <span>{{ item.label }}</span>
      </button>
    </nav>
    
    <!-- 任务管理器容器 -->
  </div>
</template>

<style scoped>
.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: nowrap;
  gap: 8px;
  width: 100%;
  padding: 4px 4px 0px 4px;
}

.header-content > .reward-summary-card {
  flex: 0 0 auto;
  margin-left: auto;
}

.profile-avatar {
  position: relative;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  overflow: hidden;
  border: 2px solid var(--b3-theme-background);
  border-radius: 50%;
  box-shadow: var(--pinch-shadow);
  cursor: pointer;
}

.profile-avatar input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-avatar .icon {
  color: #6f669c;
}

.reward-progress-overview {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 4px;
  flex: 1 1 auto;
  min-width: 0;
}

.reward-progress-labels {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}

.reward-summary-xp {
  overflow: hidden;
  color: var(--b3-theme-on-surface);
  font-size: 10px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
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
import { ref, onMounted, onUnmounted, computed, shallowRef, triggerRef, watch, nextTick } from 'vue';
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
import KanbanView from '@/components/KanbanView.vue';
import TaskManager from '@/components/TaskManager.vue';
import HabitDocBindDialog from '@/components/HabitDocBindDialog.vue';
import HabitCheckinNoteDialog from '@/components/HabitCheckinNoteDialog.vue';
import { getHabits, saveHabits, Habit, type Task } from '@/api';
import { openKanbanView } from '@/main';
import { useHabitCache } from '@/composables/useHabitCache';
import { useHabitCheckin } from '@/composables/useHabitCheckin';
import { useHabitCrud } from '@/composables/useHabitCrud';
import { useHabitFormState } from '@/composables/useHabitFormState';
import { useHabitI18n } from '@/composables/useHabitI18n';
import { useHabitSorting } from '@/composables/useHabitSorting';
import { useHabitViewData } from '@/composables/useHabitViewData';
import { normalizeDocId, useHabitDocBinding } from '@/composables/useHabitDocBinding';
import { useHabitCheckinLog, type HabitFocusNoteItem, type HabitMonthCheckinNote } from '@/composables/useHabitCheckinLog';
import { useHabitEmojis } from '@/composables/useHabitEmojis';
import { useHabitPomodoro } from '@/composables/useHabitPomodoro';
import { useHabitStatistics } from '@/composables/useHabitStatistics';
import { useMoodTracker } from '@/composables/useMoodTracker';
import { useRewards } from '@/composables/useRewards';
import { useUserSettings } from '@/composables/useUserSettings';
import type { SidebarSectionId } from '@/utils/userSettings';
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
  getFrequencyText,
  isHabitScheduledOnDate
} from '@/composables/useHabitUtils';

const { getCachedDate, getCachedDateParse, getToday } = useHabitCache();

const isHabitScheduledToday = (habit: Habit): boolean => {
  return isHabitScheduledOnDate(habit, getCachedDateParse(getToday()));
};

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
const { data: userSettings, loadSettings, updateSettings } = useUserSettings();
type TaskScopeDialogTab = 'scope' | 'task-settings' | 'pomodoro-settings' | 'document-groups' | 'goals' | 'display';
type TaskManagerExpose = {
  openTaskScopeDialog: (initialTab?: TaskScopeDialogTab) => Promise<void> | void;
  closeTaskScopeDialog: () => void;
};
const taskManagerRef = ref<TaskManagerExpose | null>(null);
type FloatingNavId = 'home' | 'views' | 'focus' | 'records' | 'goals' | 'settings';

const activeFloatingNav = ref<FloatingNavId>('home');
const showInlineTaskViews = ref(false);
const floatingNavItems: Array<{ id: FloatingNavId; label: string; icon: string }> = [
  { id: 'home', label: '首页', icon: 'home' },
  { id: 'views', label: '视图', icon: 'viewNav' },
  { id: 'focus', label: '专注', icon: 'focusNav' },
  { id: 'records', label: '日志', icon: 'recordNav' },
  { id: 'goals', label: '目标', icon: 'goalNav' },
  { id: 'settings', label: '设置', icon: 'settingsNav' }
];
const habitContainerRef = ref<HTMLElement | null>(null);
const mobileNavTransitionClass = ref('');
let mobileNavTransitionTimer: ReturnType<typeof setTimeout> | null = null;
const sidebarModalOverlayStyle = ref<Record<string, string>>({});
let sidebarModalResizeObserver: ResizeObserver | null = null;
let sidebarModalRaf: number | null = null;
let panelLockedScrollTop = 0;
let panelPreviousOverflowY = '';
let panelScrollLockCount = 0;
const defaultSidebarSectionOrder: SidebarSectionId[] = [
  'week-dates',
  'habit-list',
  'stand-container'
];
const normalizedSidebarSectionOrder = computed<SidebarSectionId[]>(() => {
  const allowed = new Set<SidebarSectionId>(defaultSidebarSectionOrder);
  const stored = Array.isArray(userSettings.sidebar.sectionOrder)
    ? userSettings.sidebar.sectionOrder.filter((id): id is SidebarSectionId => allowed.has(id as SidebarSectionId))
    : [];
  const uniqueStored = Array.from(new Set(stored));
  return [
    ...uniqueStored,
    ...defaultSidebarSectionOrder.filter(id => !uniqueStored.includes(id))
  ];
});

function updateSidebarModalOverlayStyle(): void {
  if (sidebarModalRaf !== null) {
    cancelAnimationFrame(sidebarModalRaf);
    sidebarModalRaf = null;
  }

  const host = habitContainerRef.value;
  if (!host) {
    sidebarModalOverlayStyle.value = {};
    return;
  }

  const rect = host.getBoundingClientRect();
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || rect.width;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || rect.height;
  const left = Math.max(0, rect.left);
  const top = Math.max(0, rect.top);
  const right = Math.min(viewportWidth, rect.right);
  const bottom = Math.min(viewportHeight, rect.bottom);

  sidebarModalOverlayStyle.value = {
    '--modal-overlay-left': `${Math.round(left)}px`,
    '--modal-overlay-top': `${Math.round(top)}px`,
    '--modal-overlay-width': `${Math.round(Math.max(0, right - left))}px`,
    '--modal-overlay-height': `${Math.round(Math.max(0, bottom - top))}px`
  };
}

function scheduleSidebarModalOverlayStyleUpdate(): void {
  if (sidebarModalRaf !== null) {
    return;
  }
  sidebarModalRaf = requestAnimationFrame(updateSidebarModalOverlayStyle);
}

function cancelSidebarModalOverlayStyleUpdate(): void {
  if (sidebarModalRaf === null) {
    return;
  }
  cancelAnimationFrame(sidebarModalRaf);
  sidebarModalRaf = null;
}

function lockPanelParentScroll(): void {
  const host = habitContainerRef.value;
  if (!host) {
    return;
  }
  if (panelScrollLockCount === 0) {
    panelLockedScrollTop = host.scrollTop;
    panelPreviousOverflowY = host.style.overflowY;
  }
  panelScrollLockCount += 1;
  host.style.overflowY = 'hidden';
}

function unlockPanelParentScroll(): void {
  const host = habitContainerRef.value;
  if (!host) {
    return;
  }
  panelScrollLockCount = Math.max(0, panelScrollLockCount - 1);
  if (panelScrollLockCount > 0) {
    return;
  }
  host.style.overflowY = panelPreviousOverflowY;
  host.scrollTop = panelLockedScrollTop;
}
const visibleSidebarSectionIds = computed(() => {
  const hidden = new Set(userSettings.sidebar.hiddenSectionIds || []);
  return normalizedSidebarSectionOrder.value.filter(id => !hidden.has(id));
});

function isSidebarSectionVisible(id: SidebarSectionId): boolean {
  return visibleSidebarSectionIds.value.includes(id);
}

function getSidebarSectionStyle(id: SidebarSectionId): { order: number } {
  return {
    order: normalizedSidebarSectionOrder.value.indexOf(id) + 1
  };
}
const rewardLevelProgressStyle = computed(() => {
  const progress = Math.max(0, Math.min(100, Number(rewardSnapshot.value.levelProgressPercent) || 0));
  return {
    width: `${progress}%`,
    minWidth: progress > 0 ? '8px' : '0'
  };
});

const rewardLevelProgressText = computed(
  () => `${rewardSnapshot.value.currentLevelXp}/${rewardSnapshot.value.nextLevelXp} ${t('habitTracker.rewardXp')}`
);

async function handleAvatarUpload(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file || !file.type.startsWith('image/')) {
    return;
  }

  try {
    const avatarDataUrl = await createAvatarDataUrl(file);
    await updateSettings('sidebar', { avatarDataUrl });
  } finally {
    input.value = '';
  }
}

function createAvatarDataUrl(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const size = 256;
      const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
      const sourceX = (image.naturalWidth - sourceSize) / 2;
      const sourceY = (image.naturalHeight - sourceSize) / 2;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      canvas.getContext('2d')?.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL('image/jpeg', 0.86));
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to load avatar image'));
    };
    image.src = objectUrl;
  });
}

// 防抖的保存函数 - 优化性能，减少频繁的存储操作
let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const debouncedSaveHabits = async (habitsToSave: Habit[]) => {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }
  return new Promise<void>((resolve) => {
    saveDebounceTimer = setTimeout(async () => {
      await saveHabits(habitsToSave);
      emitHabitsUpdated(habitsToSave);
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
  emitHabitsUpdated(habitsToSave);
};

// 习惯数据
const habits = shallowRef<Habit[]>([]);

function emitHabitsUpdated(nextHabits: Habit[] = habits.value): void {
  eventBus.emit(Events.HABITS_UPDATED, {
    source: 'habit-tracker',
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
  close: () => void;
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
  closeMoodTracker,
  changeMoodCalendarMonth
} = useMoodTracker();

watch(showMoodCalendar, (visible) => {
  if (visible) {
    lockPanelParentScroll();
  } else {
    unlockPanelParentScroll();
  }
});

function handleFocusTimerVisibilityChange(visible: boolean): void {
  if (visible) {
    lockPanelParentScroll();
  } else {
    unlockPanelParentScroll();
  }
}

const hasTrackerOverlayPage = computed(() =>
  showTotalStatsPage.value
  || showRewardPage.value
  || showGoalPage.value
  || showHabitManagerPage.value
);

watch(hasTrackerOverlayPage, (visible) => {
  if (visible) {
    lockPanelParentScroll();
  } else {
    unlockPanelParentScroll();
  }
});

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
  notifyHabitsChanged: emitHabitsUpdated,
  animationOriginalStatus,
  showAnimation,
  animationHabitId,
  playBubbleSound,
  confirmUncheckMessage: t('habitTracker.confirmUncheck')
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

const {
  writeCheckinLogToDoc,
  deleteCheckinLogFromDoc,
  getExistingNote,
  getHabitFocusNoteItems,
  getMonthCheckinNotes
} = useHabitCheckinLog();

const showCheckinNoteDialog = ref(false);
const checkinNoteHabit = ref<Habit | null>(null);
const checkinNoteIsEdit = ref(false);
const checkinNoteInitial = ref('');
const checkinFocusNoteItems = ref<HabitFocusNoteItem[]>([]);
const statsMonthCheckinNotes = ref<HabitMonthCheckinNote[]>([]);
let checkinNoteOpenRequestId = 0;

const openCheckinNoteDialog = async (habit: Habit): Promise<void> => {
  const requestId = ++checkinNoteOpenRequestId;
  showCheckinNoteDialog.value = false;
  checkinNoteHabit.value = habit;
  checkinNoteIsEdit.value = false;
  checkinNoteInitial.value = '';
  checkinFocusNoteItems.value = [];

  const today = getToday();
  const todayRecord = habit.calendar.find(day => day.date === today);
  const hasTodayCheckin = habit.completedToday || Boolean((todayRecord?.completedCount || 0) > 0);

  if (!hasTodayCheckin && !habit.noteDocId) {
    openBindDocModal(habit);
    return;
  }

  if (hasTodayCheckin && habit.noteDocId) {
    const focusNoteItems = await getHabitFocusNoteItems(habit.noteDocId, habit, today);
    const existingNote = focusNoteItems.length > 0
      ? ''
      : await getExistingNote(habit.noteDocId, today, habit);
    if (requestId !== checkinNoteOpenRequestId || checkinNoteHabit.value?.id !== habit.id) {
      return;
    }
    checkinNoteIsEdit.value = true;
    checkinNoteInitial.value = existingNote || '';
    checkinFocusNoteItems.value = focusNoteItems;
    showCheckinNoteDialog.value = true;
    return;
  }

  checkinNoteIsEdit.value = false;
  checkinNoteInitial.value = '';
  checkinFocusNoteItems.value = [];
  showCheckinNoteDialog.value = true;
};

const closeCheckinNoteDialog = (): void => {
  checkinNoteOpenRequestId++;
  showCheckinNoteDialog.value = false;
  checkinNoteHabit.value = null;
  checkinNoteIsEdit.value = false;
  checkinNoteInitial.value = '';
  checkinFocusNoteItems.value = [];
};

const getTodayHabitRecord = (habit: Habit | null) => {
  if (!habit) return null;
  const today = getToday();
  return habit.calendar.find(day => day.date === today) || null;
};

const getHabitTargetCount = (habit: Habit | null): number => {
  if (!habit) return 1;
  const todayRecord = getTodayHabitRecord(habit);
  return Math.max(1, Number(todayRecord?.targetCount ?? habit.timesPerDay ?? 1) || 1);
};

const getHabitCompletedCount = (habit: Habit | null): number => {
  const todayRecord = getTodayHabitRecord(habit);
  return Math.max(0, Number(todayRecord?.completedCount || 0) || 0);
};

const canUndoCheckinOnce = (habit: Habit | null): boolean => {
  return getHabitTargetCount(habit) > 1 && getHabitCompletedCount(habit) > 0;
};

const canClearTodayCheckin = (habit: Habit | null): boolean => {
  const todayRecord = getTodayHabitRecord(habit);
  return Boolean(todayRecord && ((todayRecord.completedCount || 0) > 0 || todayRecord.completed));
};

const writePomodoroCheckinLog = async (habit: Habit): Promise<void> => {
  const habitId = habit.id;
  const noteDocId = habit.noteDocId;
  const today = getToday();

  if (!noteDocId) {
    return;
  }

  try {
    const latestHabit = habits.value.find(item => item.id === habitId);
    if (!latestHabit || latestHabit.isPaused || latestHabit.noteDocId !== noteDocId) {
      return;
    }

    const dayRecord = latestHabit.calendar.find(day => day.date === today);
    if (!dayRecord?.completed) {
      return;
    }

    const existingNote = await getExistingNote(noteDocId, today, latestHabit);
    await writeCheckinLogToDoc(noteDocId, {
      habit: latestHabit,
      date: today,
      note: existingNote ?? undefined,
      completedCount: dayRecord.completedCount,
      targetCount: dayRecord.targetCount
    });
  } catch (error) {
    console.error('[HabitTracker] Failed to write pomodoro checkin log:', error);
  }
};

const refreshHabitAfterTodayRecordChange = (habit: Habit): void => {
  const today = getToday();
  const todayRecord = habit.calendar.find(day => day.date === today);
  habit.completedToday = Boolean(todayRecord?.completed);
  habit.totalCompletions = habit.calendar.filter(day => day.completed).length;
  clearCurrentStreakCacheForHabit(habit.id);
  clearWeeklyCompletionCacheForHabit(habit.id);
  clearCompletionRateCacheForHabit(habit.id);
  habit.currentStreak = calculateCurrentStreak(habit);
  habits.value = [...habits.value];
  triggerRef(habits);
};

const handleCheckinNoteUndoOnce = async (): Promise<void> => {
  if (!checkinNoteHabit.value || !canUndoCheckinOnce(checkinNoteHabit.value)) return;

  const habit = checkinNoteHabit.value;
  const today = getToday();
  const todayRecord = habit.calendar.find(day => day.date === today);
  if (!todayRecord) return;

  todayRecord.completedCount = Math.max(0, (Number(todayRecord.completedCount) || 0) - 1);
  if (Array.isArray(todayRecord.checkinTimestamps) && todayRecord.checkinTimestamps.length > 0) {
    todayRecord.checkinTimestamps = todayRecord.checkinTimestamps.slice(0, -1);
  }
  todayRecord.completed = todayRecord.completedCount >= getHabitTargetCount(habit);
  if (todayRecord.completedCount <= 0) {
    delete todayRecord.timestamp;
    delete todayRecord.checkinTimestamps;
  }
  if (todayRecord.completedCount <= 0) {
    habit.calendar = habit.calendar.filter(day => day.date !== today);
  }

  refreshHabitAfterTodayRecordChange(habit);
  await immediateSaveHabits(habits.value);

  if (habit.noteDocId && todayRecord.completedCount > 0) {
    await writeCheckinLogToDoc(habit.noteDocId, {
      habit,
      date: today,
      note: checkinNoteInitial.value,
      completedCount: todayRecord.completedCount,
      targetCount: todayRecord.targetCount
    });
  } else if (habit.noteDocId) {
    await deleteCheckinLogFromDoc(habit.noteDocId, today, habit);
  }

  closeCheckinNoteDialog();
};

const handleCheckinNoteClearToday = async (): Promise<void> => {
  if (!checkinNoteHabit.value || !canClearTodayCheckin(checkinNoteHabit.value)) return;
  if (!confirm(t('habitCheckinNote.confirmClearToday'))) return;

  const habit = checkinNoteHabit.value;
  const today = getToday();
  habit.calendar = habit.calendar.filter(day => day.date !== today);

  refreshHabitAfterTodayRecordChange(habit);
  await immediateSaveHabits(habits.value);

  if (habit.noteDocId) {
    await deleteCheckinLogFromDoc(habit.noteDocId, today, habit);
  }

  closeCheckinNoteDialog();
};

const handleCheckinNoteBindDoc = (): void => {
  const habit = checkinNoteHabit.value;
  if (!habit) return;

  closeCheckinNoteDialog();
  openBindDocModal(habit);
};

const handleCheckinNoteConfirm = async (note: string, focusNotes: HabitFocusNoteItem[] = []): Promise<void> => {
  if (!checkinNoteHabit.value) return;

  const habit = checkinNoteHabit.value;
  const today = getToday();
  const isEdit = checkinNoteIsEdit.value;

  if (isEdit) {
    const dayRecord = habit.calendar.find(day => day.date === today);
    if (habit.noteDocId) {
      await writeCheckinLogToDoc(habit.noteDocId, {
        habit,
        date: today,
        note: focusNotes.length > 0 ? undefined : note,
        focusNotes,
        completedCount: dayRecord?.completedCount,
        targetCount: dayRecord?.targetCount
      });
      if (dayRecord?.note) {
        delete dayRecord.note;
        await immediateSaveHabits(habits.value);
      }
    }
    closeCheckinNoteDialog();
    return;
  }

  playBubbleSound();
  const rewardPayload = toggleHabitCompletion(habit, today, { source: 'manual' });
  
  const completedToday = habit.completedToday;
  if (completedToday && !habit.usePomodoro) {
    animationOriginalStatus.value[habit.id] = false;
    showAnimation.value = true;
    animationHabitId.value = habit.id;

    setTimeout(async () => {
      await immediateSaveHabits(habits.value);
      processRewardPayload(rewardPayload);
      
      if (habit.noteDocId && (note || focusNotes.length > 0)) {
        const dayRecord = habit.calendar.find(day => day.date === today);
        await writeCheckinLogToDoc(habit.noteDocId, {
          habit,
          date: today,
          note: focusNotes.length > 0 ? undefined : note,
          focusNotes,
          completedCount: dayRecord?.completedCount,
          targetCount: dayRecord?.targetCount
        });
      }
      
      showAnimation.value = false;
      animationHabitId.value = null;
      delete animationOriginalStatus.value[habit.id];
    }, 600);
  } else {
    await immediateSaveHabits(habits.value);
    processRewardPayload(rewardPayload);
    
    if (habit.noteDocId && (note || focusNotes.length > 0)) {
      const dayRecord = habit.calendar.find(day => day.date === today);
      await writeCheckinLogToDoc(habit.noteDocId, {
        habit,
        date: today,
        note: focusNotes.length > 0 ? undefined : note,
        focusNotes,
        completedCount: dayRecord?.completedCount,
        targetCount: dayRecord?.targetCount
      });
    }
  }
  
  closeCheckinNoteDialog();
};

const handleBindDocFromDrag = async (habit: Habit, docId: string): Promise<void> => {
  const DOC_ID_PATTERN = /^\d{14}-[a-z0-9]{7}$/i;
  
  if (!DOC_ID_PATTERN.test(docId)) {
    console.warn('[HabitTracker] Invalid doc ID format:', docId);
    return;
  }

  habit.noteDocId = docId;
  habits.value = [...habits.value];
  await immediateSaveHabits(habits.value);
};

const toggleHabitListCollapsed = () => {
  isHabitListCollapsed.value = !isHabitListCollapsed.value;
  void updateSettings('sidebar', { habitListCollapsed: isHabitListCollapsed.value });
};

function openFocusTimer(): void {
  focusTimerHostRef.value?.open(null);
}

function openFocusTimerSettings(): void {
  void taskManagerRef.value?.openTaskScopeDialog('pomodoro-settings');
}

function openFocusTimerForHabit(habit: Habit): void {
  focusTimerHostRef.value?.open(createHabitFocusTarget(habit));
}

function openFocusTimerForTask(task: Task): void {
  focusTimerHostRef.value?.open(createTaskFocusTarget(task));
}

function openTaskSettings(): void {
  void taskManagerRef.value?.openTaskScopeDialog('display');
}

function openGoalTaskScope(): void {
  void taskManagerRef.value?.openTaskScopeDialog('goals');
}

function handleFloatingNav(item: FloatingNavId): void {
  const currentIndex = floatingNavItems.findIndex(navItem => navItem.id === activeFloatingNav.value);
  const nextIndex = floatingNavItems.findIndex(navItem => navItem.id === item);
  if (window.matchMedia('(max-width: 720px)').matches && currentIndex !== nextIndex) {
    mobileNavTransitionClass.value = nextIndex > currentIndex
      ? 'is-mobile-nav-slide-left'
      : 'is-mobile-nav-slide-right';
    if (mobileNavTransitionTimer) {
      clearTimeout(mobileNavTransitionTimer);
    }
    mobileNavTransitionTimer = setTimeout(() => {
      mobileNavTransitionClass.value = '';
      mobileNavTransitionTimer = null;
    }, 280);
  }
  activeFloatingNav.value = item;

  switch (item) {
    case 'home':
      closeNavigationPages();
      closeCheckinNoteDialog();
      showAddHabitModal.value = false;
      closeEditHabitModal();
      return;
    case 'views':
      closeNavigationPages();
      if (window.matchMedia('(max-width: 720px)').matches) {
        showInlineTaskViews.value = true;
      } else {
        void openKanbanView();
      }
      return;
    case 'focus':
      closeNavigationPages();
      openFocusTimer();
      return;
    case 'records':
      closeNavigationPages();
      showMoodCalendar.value = true;
      return;
    case 'goals':
      closeNavigationPages();
      openGoalPage();
      return;
    case 'settings':
      closeNavigationPages();
      openTaskSettings();
  }
}

function closeNavigationPages(): void {
  taskManagerRef.value?.closeTaskScopeDialog();
  showInlineTaskViews.value = false;
  closeTrackerPanels();
  showMoodCalendar.value = false;
  closeMoodTracker();
  focusTimerHostRef.value?.close();
  closeRewardPage();
  closeGoalPage();
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

  await writePomodoroCheckinLog(habit);
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
let unsubscribeHabitUpdates: (() => void) | null = null;

function normalizeLoadedHabitState(nextHabits: Habit[]): Habit[] {
  const todayStr = getToday();
  return nextHabits.map(habit => {
    if (!habit || typeof habit !== 'object') return habit;
    if (!Array.isArray(habit.calendar)) {
      habit.calendar = [];
    }
    const todayRecord = habit.calendar.find(day => day.date === todayStr);
    habit.completedToday = todayRecord ? Boolean(todayRecord.completed) : false;
    return habit;
  });
}

function handleHabitsUpdated(payload?: { source?: string; habits?: Habit[] }): void {
  if (payload?.source === 'habit-tracker' || !Array.isArray(payload?.habits)) {
    return;
  }

  habits.value = normalizeLoadedHabitState([...payload.habits]);
  habits.value.forEach(habit => {
    clearWeeklyCompletionCacheForHabit(habit.id);
    clearCurrentStreakCacheForHabit(habit.id);
    clearCompletionRateCacheForHabit(habit.id);
  });
  triggerRef(habits);
}

const {
  newHabit,
  difficultyOptions,
  frequencyOptions,
  completionModeOptions,
  timesPerDayOptions,
  pomodoroDurationOptions
} = useHabitFormState(t);

function handlePanelOpenRequest(payload?: HabitTrackerPanelOpenRequest): void {
  if (!payload) {
    return;
  }

  if (payload.target === 'habit-total') {
    openTotalStatsPage();
    return;
  }

  if (payload.target === 'views') {
    handleFloatingNav('views');
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
  updateSidebarModalOverlayStyle();
  window.addEventListener('resize', scheduleSidebarModalOverlayStyleUpdate, true);
  window.addEventListener('scroll', scheduleSidebarModalOverlayStyleUpdate, true);
  if (habitContainerRef.value && typeof ResizeObserver !== 'undefined') {
    sidebarModalResizeObserver = new ResizeObserver(scheduleSidebarModalOverlayStyleUpdate);
    sidebarModalResizeObserver.observe(habitContainerRef.value);
  }

  await loadSettings();
  isHabitListCollapsed.value = userSettings.sidebar.habitListCollapsed === true;
  unsubscribePanelOpenRequest = eventBus.on(
    Events.HABIT_TRACKER_PANEL_OPEN_REQUEST,
    handlePanelOpenRequest
  );
  unsubscribeFocusTimerOpenRequest = eventBus.on(
    Events.FOCUS_TIMER_PANEL_OPEN_REQUEST,
    handleFocusTimerOpenRequest
  );
  unsubscribeHabitUpdates = eventBus.on(
    Events.HABITS_UPDATED,
    handleHabitsUpdated
  );

  try {
    const loadedHabits = await getHabits();
    habits.value = normalizeLoadedHabitState(Array.isArray(loadedHabits) ? loadedHabits : []);
    
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
  if (mobileNavTransitionTimer) {
    clearTimeout(mobileNavTransitionTimer);
    mobileNavTransitionTimer = null;
  }
  panelScrollLockCount = 1;
  unlockPanelParentScroll();
  window.removeEventListener('resize', scheduleSidebarModalOverlayStyleUpdate, true);
  window.removeEventListener('scroll', scheduleSidebarModalOverlayStyleUpdate, true);
  sidebarModalResizeObserver?.disconnect();
  sidebarModalResizeObserver = null;
  cancelSidebarModalOverlayStyleUpdate();

  unsubscribePanelOpenRequest?.();
  unsubscribePanelOpenRequest = null;
  unsubscribeFocusTimerOpenRequest?.();
  unsubscribeFocusTimerOpenRequest = null;
  unsubscribeHabitUpdates?.();
  unsubscribeHabitUpdates = null;

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

const showHabitStats = async (habit: Habit) => {
  closeTrackerPanels();
  highlightedRewardEntryId.value = '';
  highlightedGoalId.value = '';
  selectedHabit.value = habit;
  await loadMonthCheckinNotes(habit);
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
  statsMonthCheckinNotes.value = [];
};

const loadMonthCheckinNotes = async (habit: Habit) => {
  statsMonthCheckinNotes.value = [];
  if (habit.noteDocId) {
    const today = new Date();
    const offset = habit.statsMonthOffset || 0;
    const targetDate = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;

    try {
      const notes = await getMonthCheckinNotes(habit.noteDocId, habit, year, month);
      statsMonthCheckinNotes.value = notes;
    } catch (error) {
      console.error('[HabitTracker] Failed to load month checkin notes:', error);
    }
  }
};

watch(
  () => selectedHabit.value?.statsMonthOffset,
  () => {
    if (selectedHabit.value) {
      loadMonthCheckinNotes(selectedHabit.value);
    }
  }
);

// 切换统计页面视图模式（已移除，统计页面只显示月视图）
// const toggleStatsViewMode = (habit: Habit) => {
//   initializeStatsViewMode(habit);
//   habit.statsViewMode = habit.statsViewMode === 'month' ? 'week' : 'month';
// };
watch([showAddHabitModal, showEditHabitModal, showMoodTracker], ([showAdd, showEdit, showMood]) => {
  if (showAdd || showEdit || showMood) {
    void nextTick(updateSidebarModalOverlayStyle);
  }
});
</script>

<style lang="scss" scoped>
.Pinch-habit-container {
  position: relative;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
  padding: 0;
  background-color: color-mix(in srgb, var(--b3-body-background) 50%, var(--b3-theme-background));

  .habit-floating-nav {
    position: absolute;
    z-index: 10;
    left: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2px;
    width: 100%;
    margin: 0;
    padding: 6px 12px calc(6px + env(safe-area-inset-bottom));
    box-sizing: border-box;
    border: 0;
    border-top: 1px solid color-mix(in srgb, var(--b3-theme-on-surface) 12%, transparent);
    border-radius: 0;
    background: var(--b3-theme-background);
    box-shadow: none;
    transform: none;
  }

  .inline-task-views {
    position: absolute;
    inset: 0;
    z-index: 5;
    overflow: auto;
    padding: 4px 4px 65px;
    box-sizing: border-box;
    background: color-mix(in srgb, var(--b3-body-background) 50%, var(--b3-theme-background));

    :deep(.kanban-view) {
      min-height: 100%;
    }

    :deep(.kanban-header) {
      position: relative;
      z-index: 200;
      overflow: visible;
    }

    :deep(.kanban-header-tools-module),
    :deep(.kanban-header-view-module),
    :deep(.filter-bar-inline),
    :deep(.filter-group),
    :deep(.view-switcher) {
      overflow: visible;
    }
  }

  :deep(.mood-calendar-panel),
  :deep(.goal-page-panel),
  :deep(.reward-page-panel),
  :deep(.focus-timer-panel),
  :deep(.habit-manage-panel),
  :deep(.statistics-panel) {
    box-sizing: border-box;
    padding-bottom: 76px;
  }

  .habit-floating-nav-item {
    display: inline-flex;
    flex: 1 1 0;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    min-width: 0;
    min-height: 52px;
    padding: 5px 4px;
    border: 0;
    border-radius: 18px;
    color: var(--b3-theme-on-background);
    background: transparent;
    cursor: pointer;
    font: inherit;
    font-size: 10px;
    line-height: 1.1;
    transition: color 0.2s ease, background-color 0.2s ease, transform 0.2s ease;
    opacity: 0.4;

    .icon {
      margin: 0;
    }

    &:hover,
    &:focus-visible {
      background: var(--b3-list-hover);
      outline: none;
    }

    &:focus-visible {
      box-shadow: 0 0 0 2px var(--b3-theme-primary);
    }

    &.is-active {
      color: var(--b3-theme-on-background);
      --pinch-nav-icon-deep: #ee6f5b;
      --pinch-nav-icon-light: color-mix(in srgb, var(--pinch-nav-icon-deep) 56%, #ffffff);
      opacity: 1;
    }

    &:active {
      transform: scale(0.96);
    }
  }

  .habit-list-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow-y: auto;
    box-sizing: border-box;
    padding: 4px 4px 76px;
  }
  
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
      #task-scope-button,
      #focus-timer-btn {
      background: none;
      border: none;
      padding: 0;
      margin: 0 6px 0 0;
      cursor: pointer;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .header-buttons #mood-calendar-btn:hover,
    .header-buttons #task-scope-button:hover,
    .header-buttons #focus-timer-btn:hover,
    .header-buttons #task-stats-btn:hover,
    .habit-manager-header .header-actions #add-habit-btn:hover,
    .habit-manager-header .header-actions #stats-btn:hover,
    .habit-manager-header .header-actions #habit-manage-btn:hover {
      background: var(--b3-list-hover);
    }

    .header-buttons #mood-calendar-btn .icon,
    .header-buttons #task-scope-button .icon,
    .header-buttons #focus-timer-btn .icon,
    .header-buttons #task-stats-btn .icon,
    .habit-manager-header .header-actions #add-habit-btn .icon,
    .habit-manager-header .header-actions #stats-btn .icon,
    .habit-manager-header .header-actions #habit-manage-btn .icon {
      margin: 0;
    }

    #add-habit-btn,
    #stats-btn,
    #habit-manage-btn {
      width: 24px;
      height: 24px;

      svg {
        color: var(--b3-theme-on-surface);
        width: 18px;
        height: 18px;
      }
    }

    #mood-calendar-btn,
    #task-scope-button,
    #focus-timer-btn,
    #task-stats-btn {
      width: 24px;
      height: 24px;

      svg { 
        color: var(--b3-theme-on-surface);
        width: 18px;
        height: 18px;
        margin: 0;
      }
    }
  .reward-summary-card {
    display: grid;
    grid-template-columns: 1fr;
    border-radius: 20px;
    cursor: pointer;
    min-width: 0;
  }

  .reward-summary-card {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px 4px 6px;
    border: none;
    background: var(--b3-theme-background);
    box-shadow: var(--pinch-shadow);
    color: var(--b3-theme-on-background);
  }

  .reward-summary-balance {
    font-size: 14px;
    font-weight: 700;
    line-height: 1;
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
    padding: 0;
    border-radius: 0;
    font-size: 14px;
    font-weight: 700;
    color: #ee6f5b;
    background: transparent;
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
    background: #ee6f5b;
  }

  .header-buttons #mood-calendar-btn,
  .header-buttons #task-scope-button,
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

  .habit-manager-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    margin-top: 16px;

    &.is-collapsed {
      box-sizing: border-box;
      padding: 8px 0px 8px 8px;
      border-radius: 10px;
      background-color: var(--b3-theme-background);
      box-shadow: var(--pinch-shadow);
      margin-bottom: 0px;
    }
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
    background: color-mix(in srgb, var(--b3-body-background) 50%, var(--b3-theme-background));
    box-sizing: border-box;
    padding: 12px;
    display: flex;
    flex-direction: column;
    overscroll-behavior: contain;
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
    overscroll-behavior: contain;
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

@keyframes pinch-nav-slide-left {
  from {
    opacity: 0;
    transform: translateX(24px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes pinch-nav-slide-right {
  from {
    opacity: 0;
    transform: translateX(-24px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.Pinch-habit-container.is-mobile-nav-slide-left .habit-list-container,
.Pinch-habit-container.is-mobile-nav-slide-left .inline-task-views,
.Pinch-habit-container.is-mobile-nav-slide-left :deep(.mood-calendar-panel),
.Pinch-habit-container.is-mobile-nav-slide-left :deep(.goal-page-panel),
.Pinch-habit-container.is-mobile-nav-slide-left :deep(.focus-timer-panel) {
  animation: pinch-nav-slide-left 0.28s ease-out both;
}

.Pinch-habit-container.is-mobile-nav-slide-right .habit-list-container,
.Pinch-habit-container.is-mobile-nav-slide-right .inline-task-views,
.Pinch-habit-container.is-mobile-nav-slide-right :deep(.mood-calendar-panel),
.Pinch-habit-container.is-mobile-nav-slide-right :deep(.goal-page-panel),
.Pinch-habit-container.is-mobile-nav-slide-right :deep(.focus-timer-panel) {
  animation: pinch-nav-slide-right 0.28s ease-out both;
}

@media (max-width: 720px) {
  .Pinch-habit-container {
    .header-content {
      gap: 8px;
    }

    .header-content {
      gap: 10px;
    }

    .profile-avatar {
      width: 42px;
      height: 42px;
    }

    .reward-progress-labels {
      gap: 12px;
    }

    .reward-summary-xp {
      font-size: 14px;
    }

    .reward-summary-level {
      font-size: 22px;
    }

    .header-buttons {
      gap: 2px;
    }

    .reward-summary-card {
      gap: 6px;
      padding: 10px 12px;
    }

    .reward-summary-balance {
      font-size: 20px;
    }

    .reward-summary-progress-bar {
      min-width: 0;
    }

    .habit-floating-nav {
      padding-right: 8px;
      padding-left: 8px;
    }

  }
}

</style>
