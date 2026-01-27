<template>
  <div class="Pinch-habit-container">
    <!-- 习惯列表页面 -->
    <div class="habit-list-container">
      <div class="Pinch-habit-header">
        <div class="header-content">
          <div class="date-display">{{ currentDateString.split('/')[0] }}<span>.</span>{{ currentDateString.split('/')[1] }}<span>.</span>{{ currentDateString.split('/')[2] }}</div>
          <div class="header-buttons">
            <SyButton @click="showFocusTimer = true" id="focus-timer-btn" class="focus-timer-btn">
              <Icon name="timer" width="26" height="26" class="icon" />
            </SyButton>
            <SyButton @click="showMoodCalendar = true" id="mood-calendar-btn" class="mood-calendar-btn">
              <Icon name="smile" width="26" height="26" class="icon" />
            </SyButton>
            <SyButton @click="showTotalStatsPage = true" id="stats-btn" class="stats-btn">
              <Icon name="stats" width="26" height="26" class="icon" />
            </SyButton>
            <SyButton @click="showAddHabitModal = true" id="add-habit-btn">
              <Icon name="add" width="16" height="16" class="icon" />
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
        <div v-if="habits.length === 0" class="empty-state">
          {{ t('habitTracker.noHabits') }}
        </div>
        <div v-else class="habits-grid">
          <transition-group name="habit-list" tag="div" class="habits-container">
          <div v-for="habit in sortedHabits" :key="habit.id" :class="['habit-card', { 'completed': habit.completedToday || getHabitCache(habit.id).weeklyCompleted, 'paused': habit.isPaused }]">
            <div class="habit-week-view">
              <div class="week-habit-item">
                <div class="emoji-section" @click="showHabitStats(habit)">
                  <span class="habit-emoji">{{ habit.emoji || '📝' }}</span>
                </div>
                <div class="habit-info" @click="showHabitStats(habit)">
                  <div class="habit-title">
                                  {{ habit.name }}
                                  <span v-if="habit.usePomodoro" class="pomodoro-indicator">🍅 {{ habit.pomodoroDuration ? habit.pomodoroDuration + 'min' : '25min' }}</span>
                                </div>
                  <div class="week-checkboxes">
                    <div
                      v-for="day in getCalendarViewData(habit)"
                      :key="day.date"
                      :class="['day-checkbox', { completed: day.completed, today: day.isToday, past: day.isPast, future: day.isFuture, 'completed-by-weekly-rule': day.isCompletedByWeeklyRule }]"
                      :title="day.date"
                    >
                      <Icon
                        :name="day.completed ? 'squareCheck' : 'square'"
                        :completed="day.completed"
                        class="day-checkbox-icon"
                      />
                    </div>
                  </div>
                </div>
                <div class="habit-actions">
                  <!-- 默认按钮 -->
                  <SyButton @click="toggleHabit(habit.id)" :type="habit.completedToday || getHabitCache(habit.id).weeklyCompleted ? 'success' : 'default'" size="small" :class="['check-in-btn', { 'success-animation': showAnimation && animationHabitId === habit.id }]" :disabled="habit.isPaused">
                                  <div v-if="showAnimation && animationHabitId === habit.id" class="rays-container">
                                    <div class="ray"></div>
                                    <div class="ray"></div>
                                    <div class="ray"></div>
                                    <div class="ray"></div>
                                    <div class="ray"></div>
                                    <div class="ray"></div>
                                    <div class="ray"></div>
                                    <div class="ray"></div>
                                    <div class="ray"></div>
                                    <div class="ray"></div>
                                    <div class="ray"></div>
                                    <div class="ray"></div>
                                  </div>
                    <svg v-if="habit.timesPerDay && habit.timesPerDay > 1 && getHabitCache(habit.id).todayCompletionCount > 0 && getHabitCache(habit.id).todayCompletionCount < habit.timesPerDay"
                         class="progress-pie"
                         width="26"
                         height="26"
                         viewBox="0 0 26 26">
                      <clipPath id="rect-clip">
                        <rect x="0" y="0" width="26" height="26" rx="8" ry="8" />
                      </clipPath>
                      <rect class="progress-pie__background"
                            x="0"
                            y="0"
                            width="26"
                            height="26"
                            rx="8"
                            ry="8"
                            fill="var(--b3-list-hover)" />
                      <g clip-path="url(#rect-clip)">
                        <path class="progress-pie__progress"
                              :d="getHabitCache(habit.id).piePath"
                              fill="#f98f7a" />
                      </g>
                      <text x="13" y="16" text-anchor="middle" class="progress-pie__text">{{ getHabitCache(habit.id).todayCompletionCount }}</text>
                    </svg>
                    <Icon v-else name="check" :completed="habit.completedToday" class="icon" />

                  </SyButton>
                </div>
              </div>
              <!-- 番茄钟功能区域 -->
              <div v-if="habit.usePomodoro && habit.id === activePomodoroHabit?.id" class="pomodoro-inline-display">
                <div class="pomodoro-timer-inline">
                  <div class="timer-container">
                    <div class="timer" :class="pomodoroStateClass(habit.pomodoroState)">{{ formatPomodoroTime(habit.pomodoroRemaining || 25 * 60) }}</div>
                    <svg class="progress-ring" width="100" height="100">
                      <circle class="progress-ring__bg" r="45" cx="50" cy="50" />
                      <circle class="progress-ring__progress" r="45" cx="50" cy="50" :stroke-dasharray="inlineCircumference" :stroke-dashoffset="inlineStrokeDashoffset" />
                    </svg>
                  </div>
                </div>
                <div class="pomodoro-controls-inline">
                  <button @click="togglePomodoroPause" v-if="!habit.isPomodoroPaused" class="pause-btn">
                    <Icon name="pause" width="16" height="16" class="icon" />
                  </button>
                  <button @click="togglePomodoroResume" v-if="habit.isPomodoroPaused" class="resume-btn">
                    <Icon name="play" width="16" height="16" class="icon" />
                  </button>
                  <button @click="stopCurrentPomodoro" class="stop-btn">
                    <Icon name="stop" width="16" height="16" class="icon" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          </transition-group>
        </div>
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
      :emoji-categories="emojiCategories"
      :emojisLoading="emojisLoading"
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
      :emoji-categories="emojiCategories"
      :emojisLoading="emojisLoading"
      :frequency-options="frequencyOptions"
      :times-per-day-options="timesPerDayOptions"
      :pomodoro-duration-options="pomodoroDurationOptions"
      :t="t"
      @close="showAddHabitModal = false"
      @submit="handleAddHabit"
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
    <FocusTimer :show="showFocusTimer" @close="showFocusTimer = false" />
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

.day-checkbox-icon {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  transition: all 0.2s;

}


.day-checkbox.today:not(.completed) .day-checkbox-icon,
.day-checkbox.today.completed-by-weekly-rule .day-checkbox-icon,
.day-checkbox.past.completed-by-weekly-rule .day-checkbox-icon,
.day-checkbox.future.completed-by-weekly-rule .day-checkbox-icon{
  color: oklch(68.98% 0.161 30.76 / 0.2);
}

.day-checkbox.past:not(.completed) .day-checkbox-icon {
  color: var(--b3-list-hover);
}


.day-checkbox.completed .day-checkbox-icon {
  color: #f98f7a;
}

.day-checkbox.future .day-checkbox-icon {
  color: var(--b3-list-hover);
}

.week-habit-item {
  display: flex;
  align-items: center;
  padding: 6px;
}

.confirm-button {
  background-color: #f98f7a;
  color: var(--b3-theme-background);
  font-weight: bold;
  border: none;
  border-radius: 24px;
  padding: 6px 12px;
}

.cumulative-stats {
  margin: 10px 0;
}

.stat-row {
  display: flex;
  justify-content: space-around;
  margin-bottom: 10px;
  gap:10px;
}

.cumulative-stats .stat-item {
  flex: 1;
  background-color: var(--b3-theme-background);
  border-radius: 24px;
  padding: 20px;
}

.cumulative-stats .stat-value {
  font-weight: 600;
  font-size: 24px;
  color: var(--b3-theme-on-background);
  margin-top: 4px;
  margin-bottom: 12px;
}

.cumulative-stats .stat-value span{
  font-size: 12px;
}

.cumulative-stats .stat-label {
  font-size: 12px;
  color: var(--b3-scroll-color);
}

.stat-timeline {
  display: flex;
  flex-direction: column;
  margin-top: 4px;
  position: relative;
  margin-left: 8px;
}

.stat-timeline::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 0;
  bottom: 0;
  width: 2px;
  background: #decdfa;
  transform: translate(-50%, -50%);
  height: 10px;
  z-index: 1;
}

.stat-timeline .stat-timeline-start {
  color: var(--b3-theme-on-surface);
  position: relative;
  z-index: 2;
  padding: 2px 8px;
}

.stat-timeline .stat-timeline-start::before {
  content: '';
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #decdfa;
  top: 50%;
  left: 0px;
  transform: translate(-50%, -50%);
  z-index: 3;
}

.stat-timeline .stat-timeline-end {
  color: var(--b3-theme-on-surface);
  position: relative;
  z-index: 2;
  padding: 2px 8px;
}

.stat-timeline .stat-timeline-end::before {
  content: '';
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #decdfa;
  top: 50%;
  left: 0px;
  transform: translate(-50%, -50%);
  z-index: 3;
}

.monthly-progress-chart {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  height: 30px;
  margin-top: 24px;
  gap: 4px;
  .chart-bar {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
    height: 100%;
    min-width: 1px;
    border-radius: 3px;
    position: relative;
    background-color: var(--b3-list-hover);
    
    .bar-fill {
      width: 100%;
      background: #f98f7a;
      border-radius: 3px;
      transition: height 0.3s ease;
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
    }
  }
}
.progress-bar {
  width: 100%;
  height: 24px;
  background-color: var(--b3-list-hover);
  border-radius: 8px;
  overflow: hidden;
  margin-top: 18px;
  box-shadow: inset 0 4px 8px rgba(0, 0, 0, 0.1);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(to right, #fcd07d, #ffcb4c);
  border-radius: 8px;
  transition: width 0.3s ease;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.chart-title {
  font-size: 14px;
  font-weight: bold;
  color: var(--b3-theme-on-background);
}

.chart-container {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 30px;
  border-radius: 4px;
  background-color: var(--b3-list-background);
}

.hour-bar {
  flex: 1;
  margin: 0 1px;
  background: linear-gradient(to top, #7ba6d3, #7ba6d3);
  min-width: 2px;
  min-height: 15%;
  border-radius: 10px;
  position: relative;
  transition: background 0.3s;
}

.hour-bar:hover {
  background-color: var(--b3-theme-primary-lighter);
}





.confirm-button:hover {
  background-color: #e55a47;
}

.confirm-button:active {
  background-color: #dc4a33;
}

.danger-button {
  background-color: #e74c3c;
  color: var(--b3-theme-background);
  font-weight: bold;
  border: none;
  padding: 8px 16px;
  border-radius: 24px;
  cursor: pointer;
  transition: background-color 0.2s;
  min-width: auto;
  font-size: 14px;
}

.danger-button:hover {
  background-color: #c0392b;
}

.danger-button:active {
  background-color: #a93226;
}

.pause-button {
  background-color: #fdd07d;
  border: none;
  color: var(--b3-theme-background);
  padding: 8px 16px;
  border-radius: 24px;
  cursor: pointer;
  transition: background-color 0.2s;
  min-width: auto;
  font-size: 14px;
  font-weight: bold;

}

.pause-button:hover {
  background-color: #ffcb4c;
}

.pause-button:active {
  background-color: #ffcb4c;
}

.emoji-section {
  text-align: center;
  font-size: 36px;
  width: 50px;
  height: 50px;
  border-radius: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.habit-info {
  flex: 1;
  margin: 0 6px;
}

.habit-title {
  font-weight: bold;
  margin-bottom: 6px;
  margin-left: 2px;
  span{
    font-weight: 500;
    font-size: 12px;
    color: var(--b3-theme-on-surface);
    background-color: var(--b3-list-hover);
    padding: 2px 6px;
    border-radius: 6px;
  }
}

.week-checkboxes {
  display: flex;
}

.day-checkbox {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  padding: 2px;
  transition: background-color 0.2s;
}

.day-checkbox-input {
  margin: 0 0 4px 0;
}

.day-label {
  font-size: 12px;
}

.check-in-btn {
  background-color: var(--b3-list-hover);
  border-radius: 8px;
  border: none;
  padding: 0;
  min-width: auto;
  width: 26px;
  height: 26px;
  margin-right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.check-in-btn .icon {
  width: 12px;
  height: 12px;
  color: var(--b3-theme-background);
  transition: color 0.3s, fill 0.3s;
}

.check-in-btn[type="success"] {
  background-color: #f98f7a;
}

.rays-container {
  position: absolute;
  top: 50%;
  left: 10px;
  width: 24px;
  height: 24px;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.ray {
  position: absolute;
  top: 0;
  left: 50%;
  width: 4px;
  height: 12px;
  background: #f98f7a;
  border-radius: 4px;
  transform-origin: bottom center;
  opacity: 0;
  animation: rayAnimation 0.4s ease-out forwards;
}

.ray:nth-child(1) { --rotation: 0deg; transform: rotate(0deg) translateY(-10px); }
.ray:nth-child(2) { --rotation: 30deg; transform: rotate(30deg) translateY(-10px); }
.ray:nth-child(3) { --rotation: 60deg; transform: rotate(60deg) translateY(-10px); }
.ray:nth-child(4) { --rotation: 90deg; transform: rotate(90deg) translateY(-10px); }
.ray:nth-child(5) { --rotation: 120deg; transform: rotate(120deg) translateY(-10px); }
.ray:nth-child(6) { --rotation: 150deg; transform: rotate(150deg) translateY(-10px); }
.ray:nth-child(7) { --rotation: 180deg; transform: rotate(180deg) translateY(-10px); }
.ray:nth-child(8) { --rotation: 210deg; transform: rotate(210deg) translateY(-10px); }
.ray:nth-child(9) { --rotation: 240deg; transform: rotate(240deg) translateY(-10px); }
.ray:nth-child(10) { --rotation: 270deg; transform: rotate(270deg) translateY(-10px); }
.ray:nth-child(11) { --rotation: 300deg; transform: rotate(300deg) translateY(-10px); }
.ray:nth-child(12) { --rotation: 330deg; transform: rotate(330deg) translateY(-10px); }

@keyframes rayAnimation {
  0% {
    opacity: 1;
    transform: rotate(var(--rotation)) translateY(-10px) scale(0.2);
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: rotate(var(--rotation)) translateY(-20px) scale(1);
  }
}

.progress-pie__progress {
  transition: d 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.progress-pie__text {
  font-weight: bold;
  fill: var(--b3-theme-background);
  text-anchor: middle;
  dominant-baseline: middle;
  font-size: 16px;
}

.day-progress-container {
  position: absolute;
  bottom: 4px;
  left: 0;
  right: 0;
  padding: 0 4px;
}

.day-progress-bar {
  width: 80%;
  height: 4px;
  background-color: var(--b3-list-hover);
  border-radius: 2px;
  overflow: hidden;
  margin: 0 auto;
}

.day-progress-fill {
  height: 100%;
  background-color: #f98f7a;
  transition: width 0.3s ease;
}

</style>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, shallowRef, triggerRef, nextTick } from 'vue';
import SyButton from '@/components/SiyuanTheme/SyButton.vue';
import Icon from '@/components/Icon.vue';
import WeekDates from '@/components/WeekDates.vue';
import HabitModal from '@/components/HabitModal.vue';
import MoodTrackerModal from '@/components/MoodTrackerModal.vue';
import StatisticsPanel from '@/components/StatisticsPanel.vue';
import HabitStatsPanel from '@/components/HabitStatsPanel.vue';
import MoodCalendarPanel from '@/components/MoodCalendarPanel.vue';
import FocusTimer from '@/components/FocusTimer.vue';
import { getHabits, saveHabits, Habit, getEmojiConf, getMoodData, saveMoodData, MoodData } from '@/api';

// 日期格式化缓存 - 避免重复创建 Date 对象和字符串
const dateCache = new Map<number, string>();
const getCachedDate = (date: Date): string => {
  const key = date.getTime();
  if (!dateCache.has(key)) {
    const formatted = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    dateCache.set(key, formatted);
    // 限制缓存大小，避免内存泄漏
    if (dateCache.size > 1000) {
      const firstKey = dateCache.keys().next().value;
      dateCache.delete(firstKey);
    }
  }
  return dateCache.get(key)!;
};

// 辅助函数：格式化日期为 YYYY-MM-DD 格式（使用缓存优化性能）
const formatDate = getCachedDate;

// 通用日期解析函数，缓存已解析的 Date 对象
const dateParseCache = new Map<string, Date>();
const parseDate = (dateStr: string): Date => {
  if (!dateParseCache.has(dateStr)) {
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    dateParseCache.set(dateStr, date);
  }
  return dateParseCache.get(dateStr)!;
};

const formatTimelineDate = (date: Date | null): string => {
  if (!date) return '';
  
  // 检查是否是有效日期
  if (isNaN(date.getTime())) {
    return '';
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}.${month}.${day}`;
};


// 通用打卡状态切换函数
const toggleHabitCompletion = (habit: Habit, date: string) => {
  let dayRecord = habit.calendar.find(day => day.date === date);

  // 如果指定日期的记录不存在，则创建一条新记录
  if (!dayRecord) {
    const timesPerDay = Math.min(typeof habit.timesPerDay === 'string' ? parseInt(habit.timesPerDay) || 1 : habit.timesPerDay || 1, 20);
    dayRecord = {
      date: date,
      completed: false,
      completedCount: 0,
      targetCount: timesPerDay
    };
    habit.calendar.push(dayRecord);
  }

  // 检查是否已完成所有打卡任务
  const targetCount = typeof dayRecord.targetCount === 'string' ? parseInt(dayRecord.targetCount) || 1 : dayRecord.targetCount || 1;
  if (dayRecord.completed) {
    // 如果已完成所有打卡任务，再次点击则确认是否取消打卡
    if (confirm('是否要取消打卡记录？')) {
      dayRecord.completedCount = 0;
      dayRecord.completed = false;
      // 完成状态变为未完成时，移除时间戳
      delete dayRecord.timestamp;

      // 如果完成状态变为未完成，且完成次数为0，从日历中移除该记录
      if (dayRecord.completedCount === 0) {
        habit.calendar = habit.calendar.filter(day => day.date !== date);
      }
      // 清除动画状态，避免影响排序
      delete animationOriginalStatus.value[habit.id];
    }
  } else {
    // 如果尚未完成所有打卡任务，则增加完成次数
    if (dayRecord.completedCount < targetCount) {
      dayRecord.completedCount = (dayRecord.completedCount || 0) + 1;
    }
    // 当完成次数达到目标次数时，标记为已完成
    dayRecord.completed = dayRecord.completedCount >= targetCount;

    // 只在打卡完成时添加时间戳
    if (dayRecord.completed && !dayRecord.timestamp) {
      dayRecord.timestamp = Date.now();
    }
  }

  // 更新当天是否完成的标记
  // 使用本地日期格式而不是toISOString()，避免时区转换问题
  const now = new Date();
  const todayStr = formatDate(now);
  habit.completedToday = date === todayStr && dayRecord.completed;

  // 更新总完成次数和连续打卡天数
  habit.totalCompletions = habit.calendar.filter(day => day.completed).length;
  habit.currentStreak = calculateCurrentStreak(habit);
  // 清除完成率缓存
  const completionRateCacheKey = `${habit.id}-completionRate-${Date.now() - (Date.now() % 86400000)}`;
  completionRateCache.delete(completionRateCacheKey);
  triggerRef(habits);
};

// 缓存清理配置
const CACHE_TTL = 86400000;
const MAX_CACHE_SIZE = 1000;

// 通用缓存获取函数
const getCachedValue = <T>(
  cache: Map<string, {result: T, timestamp: number}>,
  key: string
): T | null => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }
  return null;
};

// 通用缓存设置函数
const setCachedValue = <T>(
  cache: Map<string, {result: T, timestamp: number}>,
  key: string,
  value: T
): void => {
  cache.set(key, { result: value, timestamp: Date.now() });
  if (cache.size > MAX_CACHE_SIZE) {
    const oldestKey = Array.from(cache.keys())[0];
    cache.delete(oldestKey);
  }
};

// 缓存清理函数
const cleanExpiredCache = <T>(cache: Map<string, {result: T, timestamp: number}>) => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
};

// 缓存对象，用于存储计算结果
const streakCache = new Map<string, {result: number, timestamp: number}>();

// 计算连续打卡天数 - 可用于当前连续或最长连续
const calculateCurrentStreak = (habit: Habit, startDate?: Date) => {
  const cacheKey = `${habit.id}-${startDate ? startDate.getTime() : 'none'}-${Date.now() - (Date.now() % 86400000)}`;
  
  const cached = getCachedValue(streakCache, cacheKey);
  if (cached !== null) return cached;
  
  let filteredCalendar = habit.calendar;
  if (startDate) {
    const startNormalized = new Date(startDate);
    startNormalized.setHours(0, 0, 0, 0);
    filteredCalendar = filteredCalendar.filter(record => parseDate(record.date) >= startNormalized);
  }
  
  const sortedCalendar = filteredCalendar
    .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());
  
  let streak = 0;
  let expectedNextDate: Date | null = null;
  
  for (const day of sortedCalendar) {
    if (!day.completed) break;
    
    const recordDate = parseDate(day.date);
    
    if (expectedNextDate === null || recordDate.getTime() === expectedNextDate.getTime()) {
      streak++;
      expectedNextDate = new Date(recordDate);
      expectedNextDate.setDate(expectedNextDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  setCachedValue(streakCache, cacheKey, streak);
  
  return streak;
};

// 计算每月打卡进度数据
const getMonthlyProgressData = (habit: Habit) => {
  const currentYear = new Date().getFullYear();
  
  const yearlyData = habit.calendar.filter(record => {
    const recordDate = parseDate(record.date);
    return recordDate.getFullYear() === currentYear && record.completed;
  });
  
  const monthlyData = [];
  for (let month = 0; month < 12; month++) {
    const monthEnd = new Date(currentYear, month + 1, 0);
    const totalDays = monthEnd.getDate();
    
    const monthCompletions = yearlyData.filter(record => {
      return parseDate(record.date).getMonth() === month;
    }).length;
    
    const percentage = totalDays > 0 ? Math.round((monthCompletions / totalDays) * 100) : 0;
    
    monthlyData.push({
      month: `${month + 1}月`,
      completions: monthCompletions,
      totalDays: totalDays,
      percentage: percentage
    });
  }
  
  return monthlyData;
};

// 缓存今天的日期，避免重复创建 Date 对象
let cachedToday: string = '';
let todayCacheTime: number = 0;

// 获取今天日期的函数（带缓存优化）
const getToday = () => {
  const now = Date.now();
  // 如果缓存超过1分钟，重新计算
  if (now - todayCacheTime > 60000 || !cachedToday) {
    const today = new Date();
    cachedToday = formatDate(today);
    todayCacheTime = now;
  }
  return cachedToday;
};

// 检查是否为今天
const isToday = (dateString: string) => {
  return dateString === getToday();
};

// 表情选择相关
const emojisLoading = ref(true);

// 从思源笔记获取内置emoji配置 - 使用 shallowRef 优化性能（这些数据不需要深度响应式）
const emojiCategories = shallowRef<Record<string, string[]>>({});
const commonEmojis = shallowRef<string[]>([]);
// 情绪打卡专用的SVG图标 - 使用 shallowRef 优化性能（静态数据不需要深度响应式）
const moodEmojis = shallowRef([
  { id: 'excited', emoji: '🤩', largeSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="#FDD07D"/><circle cx="37.3" cy="32.8" r="10.9" fill="#FFFFFF"/><circle cx="63.3" cy="32.8" r="10.9" fill="#FFFFFF"/><path d="M34.5,50.5c3.4,4.8,7.8,7.4,16.2,7.4c9.9,0,14.8-5.7,15.8-7.4" stroke="#000000" stroke-width="3" fill="none" stroke-linecap="round" stroke-miterlimit="10"/><path d="M42.9,33c0-2.1-2-5.3-5.5-5.3c-2.9,0-5.7,2.5-5.7,5.3" stroke="#000000" stroke-width="3" fill="none" stroke-linecap="round" stroke-miterlimit="10"/><path d="M69,33c0-2.1-2-5.3-5.5-5.3c-2.9,0-5.7,2.5-5.7,5.3" stroke="#000000" stroke-width="3" fill="none" stroke-linecap="round" stroke-miterlimit="10"/></svg>', smallSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M0,24.9V100h100V24.9C88.6,9.8,70.4,0,50,0S11.4,9.8,0,24.9z" fill="#FDD07D"/><circle cx="43.3" cy="16.5" r="5.8" fill="#FFFFFF"/><circle cx="43.3" cy="16.5" r="4.2"/><circle cx="41.3" cy="14.5" r="1.4" fill="#FFFFFF"/><circle cx="57" cy="16.5" r="5.8" fill="#FFFFFF"/><circle cx="57" cy="16.5" r="4.2"/><circle cx="55" cy="14.5" r="1.4" fill="#FFFFFF"/><circle cx="43.3" cy="16.5" r="5.8" fill="#FFFFFF"/><circle cx="57" cy="16.5" r="5.8" fill="#FFFFFF"/><path d="M41.8,25.9c1.8,2.5,4.1,3.9,8.6,3.9c5.3,0,7.8-3,8.4-3.9" stroke="#000000" stroke-width="2" fill="none" stroke-linecap="round" stroke-miterlimit="10"/><path d="M46.2,16.6c0-1.1-1.1-2.8-2.9-2.8c-1.5,0-3,1.3-3,2.8" stroke="#000000" stroke-width="2" fill="none" stroke-linecap="round" stroke-miterlimit="10"/><path d="M60.1,16.6c0-1.1-1.1-2.8-2.9-2.8c-1.5,0-3,1.3-3,2.8" stroke="#000000" stroke-width="2" fill="none" stroke-linecap="round" stroke-miterlimit="10"/></svg>' },
  { id: 'happy', emoji: '😊', largeSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M78.3,100H21.7C8.2,100-2,88.7,0.3,76.5l11.5-59.9C13.7,7,22.7,0,33.2,0h34c10.6,0,19.6,7,21.4,16.6l11.2,59.9C102,88.8,91.8,100,78.3,100z" fill="#8aae97"/><circle cx="37.3" cy="32.8" r="10.9" fill="#FFFFFF"/><circle cx="37.3" cy="32.8" r="8" fill="#000000"/><circle cx="33.4" cy="29" r="2.7" fill="#FFFFFF"/><circle cx="63.3" cy="32.8" r="10.9" fill="#FFFFFF"/><circle cx="63.3" cy="32.8" r="8" fill="#000000"/><circle cx="59.4" cy="29" r="2.7" fill="#FFFFFF"/><path d="M39.2,52.7c2.4,3.4,5.6,5.3,11.6,5.3c7.1,0,10.6-4.1,11.3-5.3" stroke="#000000" stroke-width="3" fill="none" stroke-linecap="round" stroke-miterlimit="10"/></svg>', smallSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M12.3,11.5L0,45.9V100h100V50.5L87,11.8C84.6,4.8,78,0,70.6,0H28.6C21.3,0,14.8,4.6,12.3,11.5z" fill="#8aae97"/><circle cx="43.3" cy="16.5" r="5.8" fill="#FFFFFF"/><circle cx="43.3" cy="16.5" r="4.2" fill="#000000"/><circle cx="41.2" cy="14.5" r="1.4" fill="#FFFFFF"/><circle cx="57" cy="16.5" r="5.8" fill="#FFFFFF"/><circle cx="57" cy="16.5" r="4.2" fill="#000000"/><circle cx="55" cy="14.5" r="1.4" fill="#FFFFFF"/><path d="M44.3,27c1.3,1.8,3,2.8,6.1,2.8c3.7,0,5.6-2.2,6-2.8" stroke="#000000" stroke-width="2" fill="none" stroke-linecap="round" stroke-miterlimit="10"/></svg>' },
  { id: 'calm', emoji: '😌', largeSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M37.2,4.5L8.8,26C1.6,31.4-1.4,40.8,1.3,49.3l11.2,35.7c2.8,8.9,11,14.9,20.3,14.9h34.5c9.3,0,17.5-6,20.3-14.9l11.2-35.7c2.7-8.6-0.3-17.9-7.5-23.3L62.8,4.5C55.3-1.2,44.8-1.2,37.2,4.5z" fill="#89b0bc"/><circle cx="37.3" cy="32.8" r="10.9" fill="#FFFFFF"/><circle cx="37.3" cy="32.8" r="8" fill="#000000"/><circle cx="33.4" cy="29" r="2.7" fill="#FFFFFF"/><circle cx="63.3" cy="32.8" r="10.9" fill="#FFFFFF"/><circle cx="63.3" cy="32.8" r="8" fill="#000000"/><circle cx="59.4" cy="29" r="2.7" fill="#FFFFFF"/><line x1="41.6" y1="52.7" x2="59.9" y2="52.7" stroke="#000000" stroke-width="3" stroke-linecap="round" stroke-miterlimit="10"/></svg>', smallSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M91.6,26L62.8,4.3c-7.6-5.7-18-5.7-25.6,0L8.4,26C2.9,30.2-0.2,36.8,0,43.5h0v56.5h100.1V43.5h0C100.2,36.8,97.2,30.2,91.6,26z" fill="#89b0bc"/><circle cx="43.3" cy="16.5" r="5.8" fill="#FFFFFF"/><circle cx="43.3" cy="16.5" r="4.2" fill="#000000"/><circle cx="41.2" cy="14.5" r="1.4" fill="#FFFFFF"/><circle cx="57" cy="16.5" r="5.8" fill="#FFFFFF"/><circle cx="57" cy="16.5" r="4.2" fill="#000000"/><circle cx="55" cy="14.5" r="1.4" fill="#FFFFFF"/><line x1="45.5" y1="27" x2="55.2" y2="27" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-miterlimit="10"/></svg>' },
  { id: 'sad', emoji: '😢', largeSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M69.6,100H30.4C13.6,100,0,86.4,0,69.6V30.4C0,13.6,13.6,0,30.4,0h39.1C86.4,0,100,13.6,100,30.4v39.1C100,86.4,86.4,100,69.6,100z" fill="#f192c9"/><circle cx="37.3" cy="32.8" r="10.9" fill="#FFFFFF"/><circle cx="37.3" cy="32.8" r="8" fill="#000000"/><circle cx="33.4" cy="29" r="2.7" fill="#FFFFFF"/><circle cx="63.3" cy="32.8" r="10.9" fill="#FFFFFF"/><circle cx="63.3" cy="32.8" r="8" fill="#000000"/><circle cx="59.4" cy="29" r="2.7" fill="#FFFFFF"/><path d="M23.6,24.9c1.4,0.1,4.2,0.5,7.5-1c4.1-2,5.5-4.4,6.7-6.8" stroke="#000000" stroke-width="3" fill="none" stroke-linecap="round" stroke-miterlimit="10"/><path d="M76.9,24.9c-1.4,0.1-4.2,0.5-7.5-1c-4.1-2-5.5-4.4-6.7-6.8" stroke="#000000" stroke-width="3" fill="none" stroke-linecap="round" stroke-miterlimit="10"/></svg>', smallSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M69.6,100H30.5C13.7,100,0,86.4,0,69.6V30.5C0,13.7,13.7,0,30.5,0h39.1C86.4,0,100,13.7,100,30.5v39.1C100,86.4,86.4,100,69.6,100z" fill="#f192c9"/><circle cx="43.3" cy="16.5" r="5.8" fill="#FFFFFF"/><circle cx="43.3" cy="16.5" r="4.2" fill="#000000"/><circle cx="41.2" cy="14.5" r="1.4" fill="#FFFFFF"/><circle cx="57.1" cy="16.5" r="5.8" fill="#FFFFFF"/><circle cx="57.1" cy="16.5" r="4.2" fill="#000000"/><circle cx="55" cy="14.5" r="1.4" fill="#FFFFFF"/><path d="M36,12.3c0.7,0.1,2.2,0.3,4-0.5c2.2-1,2.9-2.3,3.6-3.6" stroke="#000000" stroke-width="2" fill="none" stroke-linecap="round" stroke-miterlimit="10"/><path d="M64.3,12.3c-0.7,0.1-2.2,0.3-4-0.5c-2.2-1-2.9-2.3-3.6-3.6" stroke="#000000" stroke-width="2" fill="none" stroke-linecap="round" stroke-miterlimit="10"/></svg>' },
  { id: 'angry', emoji: '😡', largeSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M59.3,4l2.9,3.1c2.5,2.7,6,4.1,9.7,4l4.2-0.1c7.3-0.2,13.3,5.8,13.1,13.1l-0.1,4.2c-0.1,3.7,1.3,7.2,4,9.7l3.1,2.9c5.4,5,5.4,13.5,0,18.5l-3.1,2.9c-2.7,2.5-4.1,6-4,9.7l0.1,4.2c0.2,7.3-5.8,13.3-13.1,13.1l-4.2-0.1c-3.7-0.1-7.2,1.3-9.7,4L59.3,96c-5,5.4-13.5,5.4-18.5,0l-2.9-3.1c-2.5-2.7-6-4.1-9.7-4L24,89.1c-7.3,0.2-13.3-5.8-13.1-13.1l0.1-4.2c0.1-3.7-1.3-7.2-4-9.7L4,59.3c-5.4-5-5.4-13.5,0-18.5l3.1-2.9c2.7-2.5,4.1-6,4-9.7L10.9,24c-0.2-7.3,5.8-13.3,13.1-13.1l4.2,0.1c3.7,0.1,7.2-1.3,9.7-4L40.7,4C45.8-1.3,54.2-1.3,59.3,4z" fill="#fc8f7b"/><circle cx="37.3" cy="32.8" r="10.9" fill="#FFFFFF"/><circle cx="37.3" cy="32.8" r="8" fill="#000000"/><circle cx="33.4" cy="29" r="2.7" fill="#FFFFFF"/><circle cx="63.3" cy="32.8" r="10.9" fill="#FFFFFF"/><circle cx="63.3" cy="32.8" r="8" fill="#000000"/><circle cx="59.4" cy="29" r="2.7" fill="#FFFFFF"/><path d="M34.1,17.7c0.5,1,1.7,2.6,4.3,4.1c3.2,1.9,4.9,2.3,7.7,2.4" stroke="#000000" stroke-width="3" fill="none" stroke-linecap="round" stroke-miterlimit="10"/><path d="M61.5,56.2c-0.7-1.2-4.2-5.3-11.3-5.3c-6,0-9.2,1.9-11.6,5.3" stroke="#000000" stroke-width="3" fill="none" stroke-linecap="round" stroke-miterlimit="10"/><path d="M66.7,17.7c-0.5,1-1.7,2.6-4.3,4.1c-3.2,1.9-4.9,2.3-7.7,2.4" stroke="#000000" stroke-width="3" fill="none" stroke-linecap="round" stroke-miterlimit="10"/></svg>', smallSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M38,7c-2.5,2.7-6,4.1-9.7,4L0,10.9V100h100V11l-28.1,0.1c-3.7,0.1-7.2-1.3-9.7-4L59.3,4c-5-5.3-13.5-5.3-18.5,0L38,7z" fill="#fc8f7b"/><circle cx="43.3" cy="16.6" r="5.8" fill="#FFFFFF"/><circle cx="43.3" cy="16.6" r="4.2" fill="#000000"/><circle cx="41.2" cy="14.6" r="1.4" fill="#FFFFFF"/><circle cx="57.1" cy="16.6" r="5.8" fill="#FFFFFF"/><circle cx="57.1" cy="16.6" r="4.2" fill="#000000"/><circle cx="55" cy="14.6" r="1.4" fill="#FFFFFF"/><path d="M41.6,8.6c0.3,0.5,0.9,1.4,2.3,2.2c1.7,1,2.6,1.2,4.1,1.3" stroke="#000000" stroke-width="2" fill="none" stroke-linecap="round" stroke-miterlimit="10"/><path d="M56.1,29c-0.4-0.6-2.2-2.8-6-2.8c-3.2,0-4.9,1-6.1,2.8" stroke="#000000" stroke-width="2" fill="none" stroke-linecap="round" stroke-miterlimit="10"/><path d="M58.9,8.6c-0.3,0.5-0.9,1.4-2.3,2.2c-1.7,1-2.6,1.2-4.1,1.3" stroke="#000000" stroke-width="2" fill="none" stroke-linecap="round" stroke-miterlimit="10"/></svg>' }
]);

// 统一的SVG获取函数，减少重复代码
const getMoodSvg = (emoji: string, size: 'large' | 'small' = 'large') => {
  const mood = moodEmojis.value.find(m => m.emoji === emoji);
  return mood ? (size === 'large' ? mood.largeSvg : mood.smallSvg) : '';
};

// 便捷函数：获取小型SVG
const getSmallMoodSvg = (emoji: string) => getMoodSvg(emoji, 'small');

// 将十六进制代码转换为emoji字符
const convertHexToEmoji = (hexCode: string): string => {
  try {
    // 如果已经是emoji字符，直接返回
    if (/[^\u0000-\u00ff]/.test(hexCode)) {
      return hexCode;
    }
    
    // 检查是否包含文件扩展名，如果是则直接返回原值
    if (typeof hexCode === 'string' && (hexCode.includes('.') || hexCode.includes('/'))) {
      // 这是文件路径，不是emoji代码，直接返回
      return hexCode;
    }
    
    // 检查是否是十六进制代码
    if (typeof hexCode === 'string') {
      // 检查是否为有效的emoji十六进制代码格式
      // 通常emoji代码由十六进制数字和可能的连字符组成，如'1f600'或'1f1f7-1f1f8'
      const hexPattern = /^[0-9a-fA-F]+(-[0-9a-fA-F]+)*$/;
      if (hexPattern.test(hexCode)) {
        // 移除可能的前缀
        let cleanHex = hexCode.replace(/^U\+|0x|\\u/g, '').replace(/-/g, ' ');
        
        // 将十六进制代码转换为字符
        const codePoints = cleanHex.split(' ').map(h => parseInt(h, 16));
        
        // 检查codePoints数组是否包含有效的数值
        if (codePoints.some(isNaN)) {
          // 如果包含NaN值，返回原值
          return hexCode;
        }
        
        return String.fromCodePoint(...codePoints);
      }
    }
    
    // 如果不是有效的十六进制代码格式，直接返回原值
    return hexCode;
  } catch (error) {
    console.warn('无法转换十六进制代码到emoji:', hexCode, error);
    return hexCode;
  }
};

// Emoji 检测正则表达式 - 提取为常量避免重复创建
const EMOJI_REGEX = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|\ud83c[\udde6-\uddff]|\ud83c[\udff0-\udfff]|\ud83d[\udc00-\ude4f]|\ud83d[\ude80-\udeff]|\ud83e[\udd10-\uddff])|[^\x00-\xFF]/u;

// 从思源 API 的 emoji item 中提取 emoji 字符 - 统一的提取逻辑
const extractEmojiFromItem = (item: any): string | null => {
  if (!item) return null;

  // 如果项目本身就是字符串，则直接使用
  if (typeof item === 'string') {
    return item;
  }

  // 如果是对象，尝试获取emoji字符的各种可能属性
  if (typeof item === 'object') {
    if (item.ch) return item.ch;
    if (item.emoji) return item.emoji;
    if (item.text) return item.text;
    if (item.unicode) return convertHexToEmoji(item.unicode);

    // 作为最后的尝试，遍历对象的值，寻找可能的emoji字符串
    const values = Object.values(item);
    for (const val of values) {
      if (typeof val === 'string' && val.length <= 5 && EMOJI_REGEX.test(val)) {
        return val;
      }
    }
  }

  return null;
};

// 从 emoji items 数组中提取所有 emojis
const extractEmojisFromItems = (items: any[]): string[] => {
  const emojis: string[] = [];
  for (const item of items) {
    const emoji = extractEmojiFromItem(item);
    if (emoji) {
      emojis.push(emoji);
    }
  }
  return emojis;
};

// 获取思源笔记内置emoji
const loadSiyuanEmojis = async () => {
  try {
    emojisLoading.value = true;
    const emojiConf: any = await getEmojiConf();
    if (emojiConf) {
      const categories: Record<string, string[]> = {};

      if (Array.isArray(emojiConf)) {
        for (const emojiCategory of emojiConf) {
          if (emojiCategory?.items && Array.isArray(emojiCategory.items)) {
            const categoryName = emojiCategory.title_zh_cn || emojiCategory.title || emojiCategory.id;
            if (categoryName && categoryName !== '自定义' && categoryName !== 'Custom') {
              categories[categoryName] = extractEmojisFromItems(emojiCategory.items);
            }
          }
        }
      } else {
        for (const category in emojiConf) {
          const categoryData = emojiConf[category];

          if (Array.isArray(categoryData)) {
            categories[category] = categoryData.map((item: any) => item.ch);
            continue;
          }

          if (categoryData?.items && Array.isArray(categoryData.items)) {
            const categoryName = categoryData.title_zh_cn || categoryData.title || categoryData.id || category;
            if (categoryName !== '自定义' && categoryName !== 'Custom') {
              categories[categoryName] = extractEmojisFromItems(categoryData.items);
            }
          } else if (categoryData?.ch) {
            categories[category] = [categoryData.ch];
          } else {
            categories[category] = Object.values(categoryData).filter(v => typeof v === 'string') as string[];
          }
        }
      }

      emojiCategories.value = categories;

      const allEmojis = Object.values(categories).flat();
      commonEmojis.value = allEmojis;
    }
  } catch (error) {
    console.error('获取思源笔记emoji配置失败:', error);
  } finally {
    emojisLoading.value = false;
  }
};

// 组件挂载时加载思源笔记emoji
onMounted(() => {
  loadSiyuanEmojis();
});

// 国际化函数
const t = (key: string) => {
  // 从思源笔记获取语言资源
  const lang = window.siyuan?.languages || {};
  
  // 如果思源笔记语言资源中没有找到，则返回默认中文文本
  const defaultLang = {
    'habitTracker.title': '习惯打卡',
    'habitTracker.addHabit': '添加习惯',
    'habitTracker.habitName': '习惯名称',
    'habitTracker.habitNamePlaceholder': '例如：晨跑、读书、喝水',
    'habitTracker.frequency': '打卡周期',
    'habitTracker.customFrequency': '每周天数',
    'habitTracker.customFrequencyPlaceholder': '输入每周要打卡的天数',
    'habitTracker.timesPerDay': '每天频率',
    'habitTracker.timesPerDayPlaceholder': '输入每天要完成的次数',
    'habitTracker.reminderTime': '提醒时间',
    'habitTracker.daily': '每天',
    'habitTracker.weekly': '每周6天',
    'habitTracker.custom': '自定义',
    'habitTracker.checkIn': '打卡',
    'habitTracker.checkedIn': '已打卡',
    'habitTracker.delete': '删除',
    'habitTracker.currentStreak': '连续天数',
    'habitTracker.totalCompletions': '本月打卡',
    'habitTracker.completionRate': '本月完成率',
    'habitTracker.days': '天',
    'habitTracker.times': '次',
    'habitTracker.noHabits': '暂无习惯，点击上方按钮添加新习惯',
    'habitTracker.confirmDelete': '确定要删除这个习惯吗？',
    'habitTracker.weekView': '周视图',
    'habitTracker.monthView': '月视图',
    'Cancel': '取消',
    'OK': '确定',
  };

  return lang[key] || defaultLang[key] || key;
};

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
const showMoodCalendar = ref(false);
const showFocusTimer = ref(false);
const moodCalendarCurrentMonth = ref(0);
const showAnimation = ref(false);
const animationHabitId = ref<string | null>(null);

// 存储动画期间的原始完成状态
const animationOriginalStatus = ref<Record<string, boolean>>({});

// 当前日期追踪（用于确保日期相关计算能够响应日期变化）
const currentDate = ref(formatDate(new Date()));

// 计算本周日期，从周一开始
const weekDates = computed(() => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0为周日，1-6为周一到周六
  
  // 计算周一的日期（如果今天是周日，则需要减去6天）
  const monday = new Date(today);
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 周日为0，周一为1
  monday.setDate(today.getDate() - daysToMonday);

  const dates = [];
  
  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(monday);
    currentDate.setDate(monday.getDate() + i);
    
    const dateStr = `${currentDate.getDate()}`;
    const fullDateStr = formatDate(currentDate);
    const isToday = currentDate.toDateString() === today.toDateString();
    
    dates.push({
      date: dateStr,
      dayName: WEEKDAY_NAMES[i],
      isToday: isToday,
      fullDate: fullDateStr
    });
  }
  
  return dates;
});

// 番茄钟相关数据
const activePomodoroHabit = ref<Habit | null>(null);

// 计算属性：按当天完成状态和周目标完成状态排序的习惯列表（未完成的在前）
// 优化：使用缓存和预计算减少重复计算
const sortedHabits = computed(() => {
  // 直接使用预计算的缓存数据，避免重复调用函数
  const habitStatusArray: Array<{
    habit: Habit;
    isPaused: boolean;
    isCompleted: boolean;
    createdAt: number;
  }> = [];

  const animationStatusMap = animationOriginalStatus.value;

  for (const habit of habits.value) {
    const cache = getHabitCache(habit.id);
    const isWeekly = habit.frequency && habit.frequency.startsWith('weekly');
    const animationStatus = animationStatusMap[habit.id];

    habitStatusArray.push({
      habit,
      isPaused: habit.isPaused || false,
      isCompleted: isWeekly
        ? (animationStatus !== undefined ? animationStatus : (habit.completedToday || cache.weeklyCompleted))
        : (animationStatus !== undefined ? animationStatus : habit.completedToday),
      createdAt: new Date(habit.createdAt).getTime()
    });
  }

  // 使用数组进行排序
  return habitStatusArray.sort((a, b) => {
    // 首先处理暂停状态：暂停的习惯放在最后
    if (a.isPaused && !b.isPaused) {
      return 1;
    } else if (!a.isPaused && b.isPaused) {
      return -1;
    }

    // 比较完成状态：未完成的在前，已完成的在后
    if (!a.isCompleted && b.isCompleted) {
      return -1;
    } else if (a.isCompleted && !b.isCompleted) {
      return 1;
    } else {
      // 在相同完成状态下，按创建日期倒序排列（最新的在前）
      return b.createdAt - a.createdAt;
    }
  }).map(item => item.habit);
});

// 新习惯表单数据
const newHabit = ref({
  name: '',
  emoji: '',
  frequency: 'daily' as 'daily' | 'weekly6' | 'weekly5' | 'weekly4' | 'weekly3' | 'weekly2' | 'weekly1',
  timesPerDay: '1', // 每天次数
  usePomodoro: false, // 是否使用番茄钟
  pomodoroDuration: '25' // 番茄钟时长（分钟），默认25分钟
});

// 辅助函数：生成数字选项 - 减少重复代码
const createNumberOptions = (count: number, suffix: string) =>
  Array.from({ length: count }, (_, i) => ({
    value: String(i + 1),
    text: `${i + 1}${suffix}`
  }));

// 频率选项 - 使用辅助函数减少重复代码
const frequencyOptions = ref([
  { value: 'daily', text: t('habitTracker.daily') },
  ...Array.from({ length: 6 }, (_, i) => ({
    value: `weekly${6 - i}`,
    text: `每周${6 - i}天`
  }))
]);

// 每日打卡次数选项 - 使用辅助函数生成，减少重复代码
const timesPerDayOptions = ref(createNumberOptions(20, '次'));

// 番茄钟时间选项
const pomodoroDurationOptions = ref([
  { value: '5', text: '5分钟' },
  { value: '10', text: '10分钟' },
  { value: '15', text: '15分钟' },
  { value: '25', text: '25分钟' },
  { value: '30', text: '30分钟' },
  { value: '45', text: '45分钟' },
  { value: '60', text: '60分钟' }
]);

// 星期名称数组 - 提取为常量避免重复
const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// 初始化数据
onMounted(async () => {
  try {
    habits.value = await getHabits();
    
    // 每次组件挂载时更新currentDayInfo为当前日期
    const today = new Date();

    // 使用本地日期格式而不是toISOString()，避免时区转换问题
    const localDate = formatDate(today);
    currentDayInfo.value.date = localDate;
    currentDayInfo.value.dayOfWeek = today.getDay();
    currentDayInfo.value.dayOfMonth = today.getDate();
    currentDayInfo.value.month = today.getMonth() + 1;
    currentDayInfo.value.year = today.getFullYear();
    
    // 更新currentDate变量
    currentDate.value = localDate;
    
    // 加载情绪数据
    moodData.value = await getMoodData();
    
    // 初始化每个习惯的completedToday属性
    const todayStr = localDate;
    habits.value.forEach(habit => {
      const todayRecord = habit.calendar.find(day => day.date === todayStr);
      habit.completedToday = todayRecord ? todayRecord.completed : false;
    });

    
    // 定期清理过期缓存（每小时清理一次）
    cacheCleanupTimer = setInterval(() => {
      cleanExpiredCache(streakCache);
      cleanExpiredCache(longestStreakCache);
      cleanExpiredCache(completionRateCache);
      cleanExpiredCache(weeklyCompletionCache);
    }, 3600000) as unknown as number; // 1小时
    
  } catch (error) {
    console.error('Error initializing habits:', error);
    // 初始化失败时，使用空数组，确保界面仍能显示
    habits.value = [];
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
  for (const habitId in pomodoroTimers) {
    clearInterval(pomodoroTimers[habitId]);
    delete pomodoroTimers[habitId];
  }
  
  // 清理缓存清理定时器
  if (cacheCleanupTimer !== null) {
    clearInterval(cacheCleanupTimer);
    cacheCleanupTimer = null;
  }
});

// 生成日历数据
const generateCalendarData = (): any[] => {
  // 只返回空数组，因为只记录已打卡的日期
  // 之前的实现可能会初始化全年的日历数据，但现在改为只在打卡时创建记录
  // _targetCount 在创建日历记录时会单独处理，因此此处不需要使用该参数
  return [];
};

// 添加习惯
const handleAddHabit = async (habitData: any) => {
  if (!habitData.name.trim()) {
    alert('请输入习惯名称');
    return;
  }

  const inputTimesPerDay = parseInt(habitData.timesPerDay) || 1;
  if (inputTimesPerDay > 20) {
    alert('每日打卡次数不能超过20次');
    return;
  }

  const timesPerDay = Math.min(inputTimesPerDay, 20);

  const habit: Habit = {
    id: Date.now().toString(),
    name: habitData.name,
    emoji: habitData.emoji,
    frequency: habitData.frequency,
    timesPerDay,
    completedToday: false,
    currentStreak: 0,
    totalCompletions: 0,
    calendar: generateCalendarData(),
    createdAt: new Date().toISOString(),
    usePomodoro: habitData.usePomodoro || false,
    pomodoroDuration: parseInt(habitData.pomodoroDuration) || 25
  };

  habits.value = [...habits.value, habit];
  await saveHabits(habits.value);

  newHabit.value = {
    name: '',
    emoji: '',
    frequency: 'daily',
    timesPerDay: '1',
    usePomodoro: false,
    pomodoroDuration: '25'
  };
};

// 切换单日打卡状态 (目前未直接使用，保留供将来可能的功能扩展)
// 切换单日打卡状态
const toggleDayCompletion = async (habit: Habit, date: string) => {
  toggleHabitCompletion(habit, date);

  // 使用防抖保存优化性能
  await debouncedSaveHabits(habits.value);
  // 触发响应式更新
  triggerRef(habits);
  // 如果是周频率习惯，清除周完成状态缓存
  if (habit.frequency?.startsWith('weekly')) {
    const cacheKey = `${habit.id}-weeklyStatus-${getWeekStart(new Date()).toISOString().split('T')[0]}`;
    weeklyCompletionCache.delete(cacheKey);
  }
  // 清除连续打卡缓存
  const streakCacheKey = `${habit.id}-${Date.now() - (Date.now() % 86400000)}`;
  streakCache.delete(streakCacheKey);
  // 清除完成率缓存
  const completionRateCacheKey = `${habit.id}-completionRate-${Date.now() - (Date.now() % 86400000)}`;
  completionRateCache.delete(completionRateCacheKey);
};

// 获取习惯频率对应的周目标次数
const getWeeklyTarget = (frequency: string): number => {
  if (!frequency.startsWith('weekly')) return 1;
  
  switch (frequency) {
    case 'weekly2': return 2;
    case 'weekly3': return 3;
    case 'weekly4': return 4;
    case 'weekly5': return 5;
    case 'weekly6': return 6;
    default: return 1;
  }
};

// 获取一周的开始日期（周一）
const getWeekStart = (date: Date): Date => {
  const dayOfWeek = date.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 周日是0，需要向前推6天到周一
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() + daysToMonday);
  
  // 设置时间为00:00:00以确保正确的日期比较
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
};

// 检查给定日期是否在同一周内（周一为一周的开始）
const isSameWeek = (date1: Date, date2: Date): boolean => {
  return getWeekStart(date1).getTime() === getWeekStart(date2).getTime();
};

// 通用函数：计算指定周的打卡完成情况
const getWeekCompletionData = (habit: Habit, startOfWeek: Date) => {
  // 计算本周已完成的打卡次数
  const completedThisWeek = habit.frequency.startsWith('weekly') ? 
    habit.calendar.filter(day => {
      return day.completed && isSameWeek(new Date(day.date), startOfWeek);
    }).length : 0;
    
  // 获取每周需要完成的次数
  const requiredWeekCompletions = getWeeklyTarget(habit.frequency);
  
  // 对于weeklyN习惯，如果本周已经完成所需的打卡次数，则所有日期都显示为完成状态
  const hasCompletedRequiredThisWeek = completedThisWeek >= requiredWeekCompletions;
  
  return {
    hasCompletedRequiredThisWeek,
    requiredWeekCompletions,
    completedThisWeek
  };
};

// 检查周目标是否已完成
const getWeeklyCompletionStatus = (habit: Habit) => {
  if (!habit.frequency?.startsWith('weekly')) {
    return false;
  }
  
  const cacheKey = `${habit.id}-weeklyStatus-${getWeekStart(new Date()).toISOString().split('T')[0]}`;
  
  const cached = getCachedValue(weeklyCompletionCache, cacheKey);
  if (cached !== null) return cached;
  
  const requiredWeekCompletions = getWeeklyTarget(habit.frequency);
  const thisWeekStart = getWeekStart(new Date());
  
  const completedThisWeek = habit.calendar.reduce((count, day) => {
    return (day.completed && isSameWeek(new Date(day.date), thisWeekStart)) ? count + 1 : count;
  }, 0);
  
  const result = completedThisWeek >= requiredWeekCompletions;
  setCachedValue(weeklyCompletionCache, cacheKey, result);
  
  return result;
};

// 获取指定日期的打卡完成次数
const getCompletionCount = (habit: Habit, date: string) => {
  const dayRecord = habit.calendar.find(day => day.date === date);
  return dayRecord ? (dayRecord.completedCount || 0) : 0;
};

// 切换习惯完成状态
const getTodayCompletionCount = (habit: Habit) => {
  // 使用本地日期格式而不是toISOString()，避免时区转换问题
  const today = getToday();
  return getCompletionCount(habit, today);
};

// 番茄钟相关变量
let pomodoroTimers: { [key: string]: number } = {};

// 缓存清理定时器 ID
let cacheCleanupTimer: number | null = null;

// 内联番茄钟进度条相关计算
const inlineRadius = ref(45);
const inlineCircumference = computed(() => 2 * Math.PI * inlineRadius.value);

// 当前激活番茄钟的剩余时间（用于触发进度条更新）
const activePomodoroRemaining = ref<number | undefined>(undefined);

// 计算内联进度条偏移量
const inlineStrokeDashoffset = computed(() => {
  if (activePomodoroRemaining.value === undefined) {
    return inlineCircumference.value;
  }

  const remainingTime = activePomodoroRemaining.value;
  const totalTime = (activePomodoroHabit.value?.pomodoroDuration || 25) * 60;
  const progressRatio = 1 - (remainingTime / totalTime);

  let offset = inlineCircumference.value * (1 - progressRatio);

  if (progressRatio >= 1) {
    offset = 0;
  } else if (progressRatio <= 0) {
    offset = inlineCircumference.value;
  }

  return offset;
});

const toggleHabit = async (habitId: string) => {
  const habit = habits.value.find(h => h.id === habitId);
  if (!habit) {

    return;
  }
  
  
  
  // 如果启用了番茄钟功能，检查当前是否已完成
  if (habit.usePomodoro) {
    // 如果习惯已完成，则取消完成状态
    if (habit.completedToday) {
      // 弹出确认取消打卡弹窗
      if (confirm('是否要取消打卡记录？')) {

        // 取消当天完成状态
        // 使用本地日期格式而不是toISOString()，避免时区转换问题
        const today = getToday();
        let todayRecord = habit.calendar.find(day => day.date === today);

        if (todayRecord) {
          // 清除当天所有打卡次数，重置为0
          todayRecord.completed = false;
          todayRecord.completedCount = 0;
        }

        // 更新习惯的完成状态
        habit.completedToday = false;

        // 清除番茄钟状态
        if (activePomodoroHabit.value && activePomodoroHabit.value.id === habit.id) {
          activePomodoroHabit.value = null;
          activePomodoroRemaining.value = undefined;
          if (pomodoroTimers[habit.id]) {
            clearInterval(pomodoroTimers[habit.id]);
            delete pomodoroTimers[habit.id];
          }
          delete habit.pomodoroRemaining;
          delete habit.pomodoroState;
          delete habit.isPomodoroPaused;
        }

        // 清除动画状态，避免影响排序
        delete animationOriginalStatus.value[habit.id];

        // 触发响应式更新（shallowRef 需要重新赋值数组）
        habits.value = [...habits.value];

        await immediateSaveHabits(habits.value);

        // 推迟到下一个渲染周期计算统计数据，避免阻塞 UI
        nextTick(() => {
          habit.currentStreak = calculateCurrentMonthStreak(habit);
          habit.totalCompletions = calculateTotalMonthCompletions(habit);
        });
      }
      return;
    } else {
      // 如果当前有其他番茄钟正在运行，先停止它
      if (activePomodoroHabit.value && activePomodoroHabit.value.id !== habit.id) {
        const previousHabit = activePomodoroHabit.value;
        // 清除之前的番茄钟
        activePomodoroHabit.value = null;
        activePomodoroRemaining.value = undefined;
        if (pomodoroTimers[previousHabit.id]) {
          clearInterval(pomodoroTimers[previousHabit.id]);
          delete pomodoroTimers[previousHabit.id];
        }
        // 清除番茄钟相关状态
        delete previousHabit.pomodoroRemaining;
        delete previousHabit.pomodoroState;
        delete previousHabit.isPomodoroPaused;
      }

      // 设置当前激活的番茄钟习惯
      activePomodoroHabit.value = habit;
      // 启动番茄钟计时器
      startPomodoroTimer(habit);
      return;
    }
  }
  

  
  if (habit.frequency?.startsWith('weekly') && getWeeklyCompletionStatus(habit)) {
    if (confirm('是否要取消打卡记录？')) {
      const today = new Date();
      const todayWeekday = today.getDay();
      const daysToMonday = todayWeekday === 0 ? -6 : 1 - todayWeekday;
      const thisWeekMonday = new Date(today);
      thisWeekMonday.setDate(today.getDate() + daysToMonday);
      
      const weeklyCompletedDays = habit.calendar
        .filter(day => {
          const dayDate = parseDate(day.date);
          const dayDayOfWeek = dayDate.getDay();
          const dayDaysToMonday = dayDayOfWeek === 0 ? -6 : 1 - dayDayOfWeek;
          const dayStartOfWeek = new Date(dayDate);
          dayStartOfWeek.setDate(dayDate.getDate() + dayDaysToMonday);
          
          const normalizedStartOfWeek = new Date(thisWeekMonday.getFullYear(), thisWeekMonday.getMonth(), thisWeekMonday.getDate());
          const normalizedDayStartOfWeek = new Date(dayStartOfWeek.getFullYear(), dayStartOfWeek.getMonth(), dayStartOfWeek.getDate());
          
          return day.completed && normalizedStartOfWeek.getTime() === normalizedDayStartOfWeek.getTime();
        })
        .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());
      
      if (weeklyCompletedDays.length > 0) {
        const lastCompletedDay = weeklyCompletedDays[0];
        lastCompletedDay.completed = false;
        lastCompletedDay.completedCount = 0;
        if (lastCompletedDay.date === getToday()) {
          habit.completedToday = false;
        }
        delete lastCompletedDay.timestamp;
        // 清除动画状态，避免影响排序
        delete animationOriginalStatus.value[habit.id];
      }
      
      await immediateSaveHabits(habits.value);

      // 推迟到下一个渲染周期计算统计数据，避免阻塞 UI
      nextTick(() => {
        // 更新习惯统计：连续天数、总完成次数、本月完成率等
        // 连续天数
        habit.currentStreak = calculateCurrentMonthStreak(habit);
        // 总完成次数
        habit.totalCompletions = calculateTotalMonthCompletions(habit);
        // 清除周完成状态缓存
        const cacheKey = `${habit.id}-weeklyStatus-${getWeekStart(new Date()).toISOString().split('T')[0]}`;
        weeklyCompletionCache.delete(cacheKey);
        // 清除完成率缓存
        const completionRateCacheKey = `${habit.id}-completionRate-${Date.now() - (Date.now() % 86400000)}`;
        completionRateCache.delete(completionRateCacheKey);
        // 触发响应式更新
        triggerRef(habits);
      });
    }
    return;
  }
  
  // 使用本地日期格式而不是toISOString()，避免时区转换问题
  const today = getToday();
  
  // 使用通用打卡函数处理打卡逻辑
  toggleHabitCompletion(habit, today);
  
  // 检查是否完成打卡，如果是则触发动画
  const completedToday = habit.completedToday;
  if (completedToday && !habit.usePomodoro) {  // 番茄钟习惯不使用此动画
    // 保存原始完成状态，以便在动画期间保持在未完成区域
    animationOriginalStatus.value[habit.id] = false; // 打卡前的状态是未完成
    
    // 触发成功动画
    showAnimation.value = true;
    animationHabitId.value = habit.id;
    
    // 动画结束后再保存数据和重置动画状态
    setTimeout(async () => {
      await immediateSaveHabits(habits.value);
      showAnimation.value = false;
      animationHabitId.value = null;
      // 清除动画原始状态
      delete animationOriginalStatus.value[habit.id];
    }, 600); // 动画持续时间
  } else {
    // 如果没有完成打卡或使用番茄钟，直接保存数据
    await immediateSaveHabits(habits.value);
  }
};

// 启动番茄钟计时器
const startPomodoroTimer = (habit: Habit) => {

  // 如果已有计时器，先清除
  if (pomodoroTimers[habit.id]) {
    clearInterval(pomodoroTimers[habit.id]);
  }

  // 设置番茄钟时长，使用习惯配置的时长（分钟转换为秒）
  const durationInMinutes = habit.pomodoroDuration || 25; // 默认25分钟
  let remainingTime = durationInMinutes * 60; // 转换为秒


  // 更新习惯的番茄钟状态
  habit.pomodoroRemaining = remainingTime;
  habit.pomodoroState = 'work'; // 默认开始工作时间
  habit.isPomodoroPaused = false; // 明确设置为未暂停

  // 更新响应式变量
  activePomodoroRemaining.value = remainingTime;

  // 触发响应式更新
  habits.value = [...habits.value];

  // 启动倒计时
  pomodoroTimers[habit.id] = window.setInterval(() => {
    remainingTime--;
    habit.pomodoroRemaining = remainingTime;

    // 更新响应式变量以触发进度条更新
    activePomodoroRemaining.value = remainingTime;

    // 触发响应式更新以刷新倒计时显示
    habits.value = [...habits.value];

    if (remainingTime <= 0) {
      // 倒计时结束，完成打卡

      clearInterval(pomodoroTimers[habit.id]);
      completeHabitAfterPomodoro(habit);

      // 如果当前显示的是这个习惯的番茄钟页面，则关闭页面
      if (activePomodoroHabit.value && activePomodoroHabit.value.id === habit.id) {
        activePomodoroHabit.value = null;
        activePomodoroRemaining.value = undefined;
      }
    }
  }, 1000);


};

// 番茄钟结束后完成打卡
const completeHabitAfterPomodoro = async (habit: Habit) => {

  
  // 使用本地日期格式而不是toISOString()，避免时区转换问题
  const today = getToday();
  
  // 使用通用打卡函数处理打卡逻辑
  toggleHabitCompletion(habit, today);
  
  // 清除番茄钟相关状态
  delete habit.pomodoroRemaining;
  delete habit.pomodoroState;
  if (pomodoroTimers[habit.id]) {
    clearInterval(pomodoroTimers[habit.id]);
    delete pomodoroTimers[habit.id];
  }
  
  await saveHabits(habits.value);

};


// 格式化番茄钟时间显示
const formatPomodoroTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 停止当前番茄钟（按钮点击事件）
const stopCurrentPomodoro = () => {
  if (activePomodoroHabit.value) {
    const habit = activePomodoroHabit.value;

    controlPomodoro('stop', habit);

    // 清除当前激活的番茄钟
    activePomodoroHabit.value = null;
    activePomodoroRemaining.value = undefined;

    saveHabits(habits.value);
  }
};

// 统一的番茄钟控制函数
const controlPomodoro = (action: 'pause' | 'resume' | 'start' | 'stop', habit?: Habit) => {
  if (!habit && activePomodoroHabit.value) {
    habit = activePomodoroHabit.value;
  }

  if (!habit) return;

  switch (action) {
    case 'pause':
      // 暂停定时器
      if (pomodoroTimers[habit.id]) {
        clearInterval(pomodoroTimers[habit.id]);
        delete pomodoroTimers[habit.id];
      }

      // 设置暂停状态
      habit.isPomodoroPaused = true;

      // 触发响应式更新（shallowRef 需要重新赋值数组）
      habits.value = [...habits.value];
      break;

    case 'resume':
      // 清除暂停状态
      habit.isPomodoroPaused = false;

      // 重新启动定时器，使用剩余时间继续
      if (habit.pomodoroRemaining !== undefined) {
        // 清除旧的定时器（如果有）
        if (pomodoroTimers[habit.id]) {
          clearInterval(pomodoroTimers[habit.id]);
          delete pomodoroTimers[habit.id];
        }

        // 重新启动定时器，使用剩余时间
        startPomodoroTimerWithRemainingTime(habit, habit.pomodoroRemaining);
      }

      // 触发响应式更新（shallowRef 需要重新赋值数组）
      habits.value = [...habits.value];
      break;

    case 'start':
      // 启动番茄钟
      startPomodoroTimer(habit);
      break;

    case 'stop':
      // 停止番茄钟
      if (pomodoroTimers[habit.id]) {
        clearInterval(pomodoroTimers[habit.id]);
        delete pomodoroTimers[habit.id];
      }

      // 清除番茄钟相关状态
      delete habit.pomodoroRemaining;
      delete habit.pomodoroState;
      delete habit.isPomodoroPaused;

      // 清除响应式变量
      activePomodoroRemaining.value = undefined;

      // 触发响应式更新（shallowRef 需要重新赋值数组）
      habits.value = [...habits.value];
      break;
  }

  // 保存状态
  saveHabits(habits.value);
};

const togglePomodoroPause = () => controlPomodoro('pause', activePomodoroHabit.value);

const togglePomodoroResume = () => controlPomodoro('resume', activePomodoroHabit.value);

// 使用剩余时间启动番茄钟计时器
const startPomodoroTimerWithRemainingTime = (habit: Habit, remainingTime: number) => {
  // 清除之前的定时器（如果存在）
  if (pomodoroTimers[habit.id]) {
    clearInterval(pomodoroTimers[habit.id]);
    delete pomodoroTimers[habit.id];
  }

  // 初始化剩余时间
  habit.pomodoroRemaining = remainingTime;

  // 更新响应式变量
  activePomodoroRemaining.value = remainingTime;

  // 触发响应式更新
  habits.value = [...habits.value];

  // 设置新的定时器
  pomodoroTimers[habit.id] = window.setInterval(() => {
    habit.pomodoroRemaining!--;

    // 更新响应式变量以触发进度条更新
    activePomodoroRemaining.value = habit.pomodoroRemaining;

    // 触发响应式更新以刷新倒计时显示
    habits.value = [...habits.value];

    if (habit.pomodoroRemaining! <= 0) {
      // 倒计时结束，完成打卡
      clearInterval(pomodoroTimers[habit.id]);
      delete pomodoroTimers[habit.id];
      completeHabitAfterPomodoro(habit);

      // 如果当前显示的是这个习惯的番茄钟页面，则关闭页面
      if (activePomodoroHabit.value && activePomodoroHabit.value.id === habit.id) {
        activePomodoroHabit.value = null;
        activePomodoroRemaining.value = undefined;
      }
    }
  }, 1000);
};

// 根据番茄钟状态返回对应的CSS类
const pomodoroStateClass = (state?: 'work' | 'shortBreak' | 'longBreak') => {
  if (!state) return 'pomodoro-running';
  
  switch (state) {
    case 'work':
      return 'pomodoro-running';
    case 'shortBreak':
      return 'pomodoro-short-break';
    case 'longBreak':
      return 'pomodoro-long-break';
    default:
      return 'pomodoro-running';
  }
};

// 删除习惯
const deleteHabit = async (habitId: string) => {
  if (!confirm(t('habitTracker.confirmDelete'))) {
    return;
  }
  
  selectedHabit.value = null;
  habits.value = habits.value.filter(h => h.id !== habitId);
  triggerRef(habits);
  await saveHabits(habits.value);
};



// 计算大尺寸饼状图进度路径（用于裁剪）
const getLargePiePath = (habit: Habit) => {
  const completedCount = getTodayCompletionCount(habit);
  const targetCount = habit.timesPerDay || 1;
  const progress = Math.min(1, Math.max(0, completedCount / targetCount)); // 确保进度在0-1之间
  
  // 圆心坐标和半径（使用更大的半径以填充矩形）
  const cx = 13; // 中心点调整为13（26/2）
  const cy = 13; // 中心点调整为13（26/2）
  const r = 16; // 使用更大的半径以填充矩形
  
  // 计算角度（从12点钟方向开始，顺时针）
  const startAngle = -Math.PI / 2; // 从顶部开始
  const endAngle = startAngle + 2 * Math.PI * progress;
  
  // 计算起点和终点坐标
  const startX = cx + r * Math.cos(startAngle);
  const startY = cy + r * Math.sin(startAngle);
  const endX = cx + r * Math.cos(endAngle);
  const endY = cy + r * Math.sin(endAngle);
  
  // 判断是否需要使用大弧形
  const largeArcFlag = progress > 0.5 ? 1 : 0;
  
  // 构建路径
  if (progress === 0) {
    return `M ${cx} ${cy}`; // 中心点
  } else if (progress === 1) {
    // 完整饼图，从中心出发画一个完整的圆然后回到中心
    return `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`;
  } else {
    // 扇形路径：从中心到起点，画弧到终点，再回到中心
    return `M ${cx} ${cy} L ${startX} ${startY} A ${r} ${r} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
  }
};


// 计算本月完成率
const calculateCompletionRate = (habit: Habit) => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  
  // 获取习惯的创建日期
  // 使用更精确的方法处理ISO日期字符串，避免时区转换问题
  const creationDateISO = habit.createdAt;
  let creationDate: Date;
  
  if (creationDateISO.endsWith('Z')) {
    // 如果是UTC时间格式，直接解析
    creationDate = new Date(creationDateISO);
  } else {
    // 如果包含时区信息，直接解析
    creationDate = new Date(creationDateISO);
  }
  
  // 将创建日期调整为本地日期的开始时间，以确保正确比较
  // 使用本地时间的年月日创建新日期，避免时区问题
  const localCreationDate = new Date(creationDate.getFullYear(), creationDate.getMonth(), creationDate.getDate());
  creationDate = localCreationDate;
  
  // 创建一个固定的创建日期副本，防止后续处理中被修改
  const fixedCreationDate = new Date(creationDate);
  
  // 使用固定的创建日期进行后续计算
  const creationDateForCalculation = fixedCreationDate;
  


  

  
  // 过滤出本月的打卡记录，但仅包括创建日期及之后的记录
  const monthRecords = habit.calendar.filter(record => {
    const recordDate = new Date(record.date);
    // 将记录日期也设置为当天开始时间，以确保正确比较
    recordDate.setHours(0, 0, 0, 0);
    return recordDate.getFullYear() === currentYear && 
           recordDate.getMonth() === currentMonth &&
           recordDate >= creationDateForCalculation; // 只统计创建日期及之后的记录
  });
  

  
  if (habit.frequency.startsWith('weekly')) {
    // 对于周频次习惯，计算基于应完成次数的完成率
    
    // 确定每周需要完成的次数
    let weeklyTarget = 1; // 默认为1次
    if (habit.frequency === 'weekly2') weeklyTarget = 2;
    else if (habit.frequency === 'weekly3') weeklyTarget = 3;
    else if (habit.frequency === 'weekly4') weeklyTarget = 4;
    else if (habit.frequency === 'weekly5') weeklyTarget = 5;
    else if (habit.frequency === 'weekly6') weeklyTarget = 6;
    

    
    // 计算本周的周一和周日（仅用于确定月份的结束日期）
    const todayWeekday = today.getDay();
    const daysToMonday = todayWeekday === 0 ? -6 : 1 - todayWeekday; // 周日是0，需要向前推6天到周一
    const thisWeekMonday = new Date(today);
    thisWeekMonday.setDate(today.getDate() + daysToMonday);
    
    const daysToSunday = todayWeekday === 0 ? 0 : 7 - todayWeekday;
    const thisWeekSunday = new Date(today);
    thisWeekSunday.setDate(today.getDate() + daysToSunday);
    
    // 对于周频次习惯，我们统计完成周数而不是完成次数
    // 计算实际完成的周数
    let completedWeeks = 0;
    
    // 计算从创建日期所在周的周一到本周周日的所有周（不包括未来周）
    const creationWeekStart = new Date(creationDateForCalculation);
    const creationWeekday = creationDateForCalculation.getDay();
    const daysToCreationMonday = creationWeekday === 0 ? -6 : 1 - creationWeekday; // 周日是0，需要向前推到周一
    creationWeekStart.setDate(creationDateForCalculation.getDate() + daysToCreationMonday);
    
    // 计算本周的周日（今天所在的周）
    const currentTodayWeekday = today.getDay();
    const currentDaysToSunday = currentTodayWeekday === 0 ? 0 : 7 - currentTodayWeekday; // 如果今天是周日，则是0天后
    const currentWeekSunday = new Date(today);
    currentWeekSunday.setDate(today.getDate() + currentDaysToSunday);
    

    
    // 计算需要处理的周数
    const totalCalculatedWeeks = [];
    let tempWeekStart = new Date(creationWeekStart);
    
    // 收集所有需要检查的周，从创建日期所在周到本周周日
    while (tempWeekStart <= currentWeekSunday) {
      const tempWeekEnd = new Date(tempWeekStart);
      tempWeekEnd.setDate(tempWeekStart.getDate() + 6); // 周日
      
      // 确保周的结束日期不超过本周周日（避免包含未来周）
      if (tempWeekEnd > currentWeekSunday) {
        tempWeekEnd.setTime(currentWeekSunday.getTime());
      }
      
      // 只统计创建日期之后的周，注意这里应该是判断周结束日期是否晚于创建日期
      // 因为一周内的任何一天完成打卡都应计入该周
      if (tempWeekEnd >= creationDateForCalculation) {
        totalCalculatedWeeks.push({
          start: new Date(tempWeekStart),
          end: tempWeekEnd
        });
      }
      
      tempWeekStart.setDate(tempWeekStart.getDate() + 7); // 下一周
    }
    
    // 不再需要计算 totalWeeks，使用 totalCalculatedWeeks.length
    

    
    // 检查每一周的完成情况
    for (const week of totalCalculatedWeeks) {
      // 检查这一周内是否完成了目标次数
      let weekCompletedCount = 0;
      for (const record of habit.calendar) {
        const recordDate = new Date(record.date);
        // 将记录日期设置为当天的开始时间，以确保正确比较
        recordDate.setHours(0, 0, 0, 0);
        
        // 检查这个记录是否在当前周内
        if (recordDate >= week.start && recordDate <= week.end && record.completed) {
          weekCompletedCount += record.completedCount || 1;
        }
      }
      

      
      // 如果这一周完成了目标次数，则算作完成一周
      if (weekCompletedCount >= weeklyTarget) {
        completedWeeks++;

      }
    }
    

    
    // 计算完成率：完成的周数 / 总周数 * 100%
    const totalCalculatedWeeksCount = totalCalculatedWeeks.length;
    const completionRate = totalCalculatedWeeksCount > 0 ? (completedWeeks / totalCalculatedWeeksCount) * 100 : 0;
    const roundedRate = Math.round(completionRate);
    

    
    return roundedRate;
  } else {
    // 对于日频次习惯，计算基于天数的完成率
    

    
    // 计算本月已完成的天数
    const completedDays = monthRecords.filter(record => record.completed).length;
    
    // 如果习惯是本月创建的，计算从创建日期到今天的天数
    let totalDaysInPeriod = 0;
    
    if (creationDateForCalculation.getMonth() === currentMonth && creationDateForCalculation.getFullYear() === currentYear) {
      // 本月创建的习惯：从创建日期到今天（包括今天）
      // 使用本地日期格式来避免时区转换问题
      const creationDateLocal = new Date(creationDateForCalculation.getFullYear(), creationDateForCalculation.getMonth(), creationDateForCalculation.getDate());
      const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      // 计算从创建日期到今天的天数（包括今天）
      totalDaysInPeriod = Math.floor((todayLocal.getTime() - creationDateLocal.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      

    } else {
      // 非本月创建的习惯：从月初到今天
      const dayOfMonth = today.getDate();
      totalDaysInPeriod = dayOfMonth;
    }
    
    // 检查创建当天是否已完成打卡（如果创建当天就是今天，并且是本月创建）
    if (creationDateForCalculation.getMonth() === currentMonth && 
        creationDateForCalculation.getFullYear() === currentYear &&
        creationDateForCalculation.getDate() === today.getDate() && 
        creationDateForCalculation.getMonth() === today.getMonth() &&
        creationDateForCalculation.getFullYear() === today.getFullYear()) {
      // 如果是本月创建且创建当天就是今天，且今天已完成打卡
      const todayRecord = habit.calendar.find(record => record.date === formatDate(today));
      if (todayRecord && todayRecord.completed) {
        
        return 100;
      }
    }
    

    
    // 计算完成率：已完成天数 / 统计周期内总天数 * 100%
    const completionRate = totalDaysInPeriod > 0 ? (completedDays / totalDaysInPeriod) * 100 : 0;
    const roundedRate = Math.round(completionRate);
    

    
    return roundedRate;
  }
};

// 获取标准化的日期对象（将时间部分清零）
const getNormalizedDate = (date: Date | string | Habit) => {
  const inputDate = typeof date === 'string' || date instanceof Date ? date : date.createdAt;
  const normalizedDate = new Date(inputDate);
  normalizedDate.setHours(0, 0, 0, 0);
  return normalizedDate;
};



// 获取本月的打卡记录
const getMonthRecords = (habit: Habit, currentYear: number, currentMonth: number) => {
  const creationDate = getNormalizedDate(habit);
  
  return habit.calendar.filter(record => {
    const recordDate = getNormalizedDate(record.date);
    return recordDate.getFullYear() === currentYear && 
           recordDate.getMonth() === currentMonth &&
           recordDate >= creationDate; // 只统计创建日期之后的记录
  });
};

// 计算本月连续打卡天数
const calculateCurrentMonthStreak = (habit: Habit) => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  
  const creationDate = getNormalizedDate(habit);
  
  // 过滤出本月的打卡记录
  const monthRecords = getMonthRecords(habit, currentYear, currentMonth)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // 按日期倒序排列
  
  if (monthRecords.length === 0) {
    return 0; // 如果本月没有记录，则连续天数为0
  }
  
  let streak = 0;
  // 使用本地日期格式而不是toISOString()，避免时区转换问题
  const todayStr = getToday();
  let currentDate = new Date(today);
  
  // 检查是否今天已完成
  const todayRecord = habit.calendar.find(record => record.date === todayStr);
  if (todayRecord && todayRecord.completed) {
    streak++;
  }
  
  // 往前检查连续的完成日期
  for (let i = 1; ; i++) {
    const checkDate = new Date(currentDate);
    checkDate.setDate(currentDate.getDate() - i);
    
    // 使用本地日期格式而不是toISOString()，避免时区转换问题
    const checkDateStr = formatDate(checkDate);
    
    // 检查是否还在当前月份
    if (checkDate.getMonth() !== currentMonth || checkDate.getFullYear() !== currentYear) {
      break; // 已经超出当前月份，停止计算
    }
    
    // 检查日期是否在创建日期之后
    if (checkDate < creationDate) {
      break; // 已经超出创建日期，停止计算
    }
    
    const record = habit.calendar.find(r => r.date === checkDateStr);
    if (record && record.completed) {
      streak++;
    } else {
      break; // 遇到未完成的日期，停止计算
    }
  }
  
  return streak;
};

// 计算本月总打卡数
const calculateTotalMonthCompletions = (habit: Habit) => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  
  // 使用公共函数获取本月的打卡记录
  const monthRecords = getMonthRecords(habit, currentYear, currentMonth);
  
  // 过滤出已完成的记录并计算数量
  return monthRecords.filter(record => record.completed).length;
};

// 缓存对象，用于存储最长连续打卡计算结果
const longestStreakCache = new Map<string, {result: { streak: number, startDate: Date | null, endDate: Date | null }, timestamp: number}>();

// 计算最长连续打卡数
const calculateLongestStreak = (habit: Habit) => {
  const cacheKey = `${habit.id}-longestStreak-${Date.now() - (Date.now() % 86400000)}`;
  
  const cached = getCachedValue(longestStreakCache, cacheKey);
  if (cached !== null) return cached;
  
  if (!habit.calendar?.length) {
    const result = { streak: 0, startDate: null, endDate: null };
    setCachedValue(longestStreakCache, cacheKey, result);
    return result;
  }
  
  const sortedCalendar = [...habit.calendar]
    .filter(record => record.completed)
    .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());
  
  if (sortedCalendar.length === 0) {
    const result = { streak: 0, startDate: null, endDate: null };
    setCachedValue(longestStreakCache, cacheKey, result);
    return result;
  }
  
  let maxStreak = 0;
  let currentStreak = 0;
  let previousDate: Date | null = null;
  let maxStreakStartDate: Date | null = null;
  let maxStreakEndDate: Date | null = null;
  let currentStreakStartDate: Date | null = null;
  
  for (const record of sortedCalendar) {
    const currentDate = new Date(record.date);
    
    if (previousDate === null) {
      currentStreak = 1;
      currentStreakStartDate = new Date(currentDate);
    } else {
      const diffDays = Math.floor((currentDate.getTime() - previousDate.getTime()) / 86400000);
      
      if (diffDays === 1) {
        currentStreak++;
      } else if (diffDays > 1) {
        if (currentStreak > maxStreak) {
          maxStreak = currentStreak;
          maxStreakStartDate = currentStreakStartDate;
          maxStreakEndDate = new Date(previousDate);
        }
        currentStreak = 1;
        currentStreakStartDate = new Date(currentDate);
      }
    }
    
    previousDate = currentDate;
  }
  
  if (currentStreak > maxStreak) {
    maxStreak = currentStreak;
    maxStreakStartDate = currentStreakStartDate;
    maxStreakEndDate = previousDate;
  } else if (maxStreak === 0 && currentStreak > 0) {
    maxStreak = currentStreak;
    maxStreakStartDate = currentStreakStartDate;
    maxStreakEndDate = previousDate;
  }
  
  const result = { streak: maxStreak, startDate: maxStreakStartDate, endDate: maxStreakEndDate };
  setCachedValue(longestStreakCache, cacheKey, result);
  
  return result;
};

// 计算常见打卡时段
const calculateCommonTimeSlot = (habit: Habit) => {
  // 从打卡记录中提取时间戳，分析常见打卡时段
  
  // 检查是否有时间戳数据
  const completedRecordsWithTimestamp = habit.calendar.filter(record => record.completed && record.timestamp);
  
  if (completedRecordsWithTimestamp.length === 0) {
    return '未打卡';
  }
  
  // 提取小时信息并统计各小时的打卡次数
  const hourCounts: { [key: number]: number } = {};
  
  for (const record of completedRecordsWithTimestamp) {
    if (record.timestamp) {
      const date = new Date(record.timestamp);
      const hour = date.getHours(); // 获取小时（0-23）
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }
  }
  
  // 找到打卡次数最多的小时
  let mostCommonHour = -1;
  let maxCount = 0;
  
  for (const hourStr in hourCounts) {
    const hour = parseInt(hourStr);
    const count = hourCounts[hour];
    
    if (count > maxCount) {
      maxCount = count;
      mostCommonHour = hour;
    }
  }
  
  if (mostCommonHour === -1) {
    return '未打卡';
  }
  
  // 返回格式为 "X~X+1点" 的时间段，其中"点"字用span包装
  return `${mostCommonHour}~${mostCommonHour + 1}<span style="font-size: 12px;"> 点</span>`;
};

// 获取小时分布数据用于绘制条形图
const getHourDistribution = (habit: Habit) => {
  // 从打卡记录中提取时间戳，分析各小时的打卡分布
  
  // 检查是否有时间戳数据
  const completedRecordsWithTimestamp = habit.calendar.filter(record => record.completed && record.timestamp);
  
  if (completedRecordsWithTimestamp.length === 0) {
    // 如果没有数据，返回全为0的分布
    const distribution = [];
    for (let i = 0; i < 24; i++) {
      distribution.push({ hour: i, count: 0 });
    }
    return distribution;
  }
  
  // 提取小时信息并统计各小时的打卡次数
  const hourCounts: { [key: number]: number } = {};
  
  for (const record of completedRecordsWithTimestamp) {
    if (record.timestamp) {
      const date = new Date(record.timestamp);
      const hour = date.getHours(); // 获取小时（0-23）
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }
  }
  
  // 生成24小时的分布数据
  const distribution = [];
  for (let i = 0; i < 24; i++) {
    distribution.push({ hour: i, count: hourCounts[i] || 0 });
  }
  
  return distribution;
};

// 缓存对象，用于存储各种计算结果
const completionRateCache = new Map<string, {result: number, timestamp: number}>();
const weeklyCompletionCache = new Map<string, {result: boolean, timestamp: number}>();

// 计算总完成率
const calculateTotalCompletionRate = (habit: Habit) => {
  const cacheKey = `${habit.id}-completionRate-${Date.now() - (Date.now() % 86400000)}`;
  
  const cached = getCachedValue(completionRateCache, cacheKey);
  if (cached !== null) return cached;
  
  if (!habit.calendar?.length) {
    setCachedValue(completionRateCache, cacheKey, 0);
    return 0;
  }
  
  if (habit.frequency.startsWith('weekly')) {
    const result = calculateWeeklyHabitCompletionRate(habit);
    setCachedValue(completionRateCache, cacheKey, result);
    return result;
  }
  
  const completedCount = habit.calendar.reduce((count, record) => record.completed ? count + 1 : count, 0);
  
  const creationDate = new Date(habit.createdAt);
  const today = new Date();
  creationDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  const totalDays = Math.floor((today.getTime() - creationDate.getTime()) / 86400000) + 1;
  
  if (totalDays <= 0) {
    setCachedValue(completionRateCache, cacheKey, 0);
    return 0;
  }
  
  const finalResult = Math.round((completedCount / totalDays) * 100);
  setCachedValue(completionRateCache, cacheKey, finalResult);
  return finalResult;
};

// 计算周频率习惯的总完成率
const calculateWeeklyHabitCompletionRate = (habit: Habit) => {
  // 计算从创建日期到今天的周数
  const creationDate = new Date(habit.createdAt);
  const today = new Date();
  
  // 设置时间为0点0分0秒，避免时区问题
  creationDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  // 计算创建日期所在周的周一
  const creationWeekday = creationDate.getDay();
  const daysToCreationMonday = creationWeekday === 0 ? -6 : 1 - creationWeekday; // 周日是0，需要向前推到周一
  const creationWeekStart = new Date(creationDate);
  creationWeekStart.setDate(creationDate.getDate() + daysToCreationMonday);
  
  // 计算本周的周日（今天所在的周）
  const currentTodayWeekday = today.getDay();
  const currentDaysToSunday = currentTodayWeekday === 0 ? 0 : 7 - currentTodayWeekday; // 如果今天是周日，则是0天后
  const currentWeekSunday = new Date(today);
  currentWeekSunday.setDate(today.getDate() + currentDaysToSunday);
  
  // 计算需要处理的周数
  const totalCalculatedWeeks = [];
  let tempWeekStart = new Date(creationWeekStart);
  
  // 收集所有需要检查的周，从创建日期所在周到本周周日
  while (tempWeekStart <= currentWeekSunday) {
    const tempWeekEnd = new Date(tempWeekStart);
    tempWeekEnd.setDate(tempWeekStart.getDate() + 6); // 周日
    
    // 确保周的结束日期不超过本周周日（避免包含未来周）
    if (tempWeekEnd > currentWeekSunday) {
      tempWeekEnd.setTime(currentWeekSunday.getTime());
    }
    
    // 只统计创建日期之后的周，注意这里应该是判断周结束日期是否晚于创建日期
    // 因为一周内的任何一天完成打卡都应计入该周
    if (tempWeekEnd >= creationDate) {
      totalCalculatedWeeks.push({
        start: new Date(tempWeekStart),
        end: tempWeekEnd
      });
    }
    
    tempWeekStart.setDate(tempWeekStart.getDate() + 7); // 下一周
  }
  
  // 获取每周目标次数
  let weeklyTarget = 1; // 默认为1次
  if (habit.frequency === 'weekly2') weeklyTarget = 2;
  else if (habit.frequency === 'weekly3') weeklyTarget = 3;
  else if (habit.frequency === 'weekly4') weeklyTarget = 4;
  else if (habit.frequency === 'weekly5') weeklyTarget = 5;
  else if (habit.frequency === 'weekly6') weeklyTarget = 6;
  
  // 计算每周的完成情况
  let completedWeeks = 0;
  
  // 检查每一周的完成情况
  for (const week of totalCalculatedWeeks) {
    // 检查这一周内是否完成了目标次数
    let weekCompletedCount = 0;
    for (const record of habit.calendar) {
      const recordDate = new Date(record.date);
      // 将记录日期设置为当天的开始时间，以确保正确比较
      recordDate.setHours(0, 0, 0, 0);
      
      // 检查这个记录是否在当前周内
      if (recordDate >= week.start && recordDate <= week.end && record.completed) {
        weekCompletedCount += record.completedCount || 1;
      }
    }
    
    // 如果这一周完成了目标次数，则算作完成一周
    if (weekCompletedCount >= weeklyTarget) {
      completedWeeks++;
    }
  }
  
  const totalCalculatedWeeksCount = totalCalculatedWeeks.length;
  const rate = totalCalculatedWeeksCount > 0 ? (completedWeeks / totalCalculatedWeeksCount) * 100 : 0;
  return Math.round(rate);
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

// 获取近18周的打卡数据用于热力图
const getHeatmapData = () => {
  const heatmapData = [];
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() - daysToSubtract);
  const startDate = new Date(thisMonday);
  startDate.setDate(thisMonday.getDate() - 17 * 7);
  
  for (const habit of habits.value) {
    for (const record of habit.calendar) {
      if (record.completed) {
        const recordDate = parseDate(record.date);
        
        if (recordDate >= startDate && recordDate <= today) {
          const dateStr = formatDate(recordDate);
          let dateEntry = heatmapData.find(entry => entry.date === dateStr);
          
          if (!dateEntry) {
            dateEntry = { date: dateStr, count: 0 };
            heatmapData.push(dateEntry);
          }
          dateEntry.count++;
        }
      }
    }
  }
  
  heatmapData.sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());
  const maxCount = heatmapData.length > 0 ? Math.max(...heatmapData.map(d => d.count), 1) : 1;
  
  return { data: heatmapData, maxCount };
};

// 获取热力图的星期和日期数据
const getHeatmapGridData = () => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() - daysToSubtract);
  const startMonday = new Date(thisMonday);
  startMonday.setDate(thisMonday.getDate() - 17 * 7);
  
  const { data: heatmapData, maxCount } = getHeatmapData();
  
  const dateMap = {};
  heatmapData.forEach(item => {
    dateMap[item.date] = item.count;
  });
  
  const weeks = [[], [], [], [], [], [], []];
  const totalDays = 18 * 7;
  let currentDate = new Date(startMonday);
  
  for (let i = 0; i < totalDays; i++) {
    currentDate.setHours(0, 0, 0, 0);
    const dateStr = formatDate(currentDate);
    const count = dateMap[dateStr] || 0;
    const dayOfWeek = currentDate.getDay();
    const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    let intensity = 0;
    if (maxCount > 0) {
      if (count === 0) intensity = 0;
      else if (count < maxCount * 0.25) intensity = 1;
      else if (count < maxCount * 0.5) intensity = 2;
      else if (count < maxCount * 0.75) intensity = 3;
      else intensity = 4;
    }
    
    weeks[dayIndex].push({
      date: dateStr,
      count,
      intensity,
      isCurrentYear: currentDate.getFullYear() === today.getFullYear()
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return {
    weeks,
    startDate: formatDate(startMonday),
    endDate: formatDate(currentDate),
    maxCount
  };
};

// 计算总习惯数
const totalHabitsCount = computed(() => habits.value.length);

// 计算总完成数
const totalCompletionsCount = computed(() =>
  habits.value.reduce((total, habit) =>
    total + habit.calendar.reduce((count, record) => record.completed ? count + 1 : count, 0),
  0
  )
);

// 计算最长连续坚持天数
const longestStreak = computed(() =>
  Math.max(...habits.value.map(habit => calculateLongestStreak(habit).streak), 0)
);

// 热力图网格数据
const heatmapGridData = computed(() => {
  return getHeatmapGridData();
});

// 热力图月份标签
const heatmapMonths = computed(() => {
  const weeks = heatmapGridData.value.weeks;
  const datePositions = new Map();
  
  for (let dayOfWeek = 0; dayOfWeek < weeks.length; dayOfWeek++) {
    const daysOfThisWeekday = weeks[dayOfWeek];
    
    for (let dateIndex = 0; dateIndex < daysOfThisWeekday.length; dateIndex++) {
      const day = daysOfThisWeekday[dateIndex];
      const date = parseDate(day.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      
      if (!datePositions.has(monthKey)) {
        datePositions.set(monthKey, {
          year: date.getFullYear(),
          month: date.getMonth(),
          position: dateIndex
        });
      }
    }
  }
  
  return Array.from(datePositions.values())
    .sort((a, b) => a.position - b.position)
    .slice(1)
    .map(pos => ({
      monthLabel: `${String(pos.month + 1).padStart(2, '0')}月`,
      offset: (pos.position / 17) * 100
    }));
});


// 初始化习惯视图模式
const initializeHabitViewMode = (habit: Habit) => {
  habit.currentWeekOffset ??= 0;
};

// 初始化统计页面视图模式
const initializeStatsViewMode = (habit: Habit) => {
  habit.statsViewMode ??= 'month';
  habit.statsMonthOffset ??= 0;
};

// 获取日历视图数据（用于习惯项，固定为周视图）
const getCalendarViewData = (habit: Habit) => {
  initializeHabitViewMode(habit);
  return getWeekViewData(habit);
};

// 获取周视图数据
const getWeekViewData = (habit: Habit) => {
  const todayDate = new Date();
  const targetDate = new Date(todayDate);
  targetDate.setDate(todayDate.getDate() + (habit.currentWeekOffset || 0) * 7);
  
  const startOfWeek = getWeekStart(targetDate);
  const weekCompletionData = getWeekCompletionData(habit, startOfWeek);
  const weekData = [];
  const todayLocalDateStr = getToday();
  
  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(startOfWeek);
    currentDate.setDate(startOfWeek.getDate() + i);
    const dateStr = formatDate(currentDate);
    const isTodayActual = isToday(dateStr);
    const calendarRecord = habit.calendar.find(day => day.date === dateStr);
    const isPast = dateStr < todayLocalDateStr;
    const isFuture = dateStr > todayLocalDateStr;
    const actualCompleted = calendarRecord ? calendarRecord.completed : false;
    const isCompleted = weekCompletionData.hasCompletedRequiredThisWeek ? true : actualCompleted;
    const isCompletedByWeeklyRule = weekCompletionData.hasCompletedRequiredThisWeek && !actualCompleted;
    
    weekData.push({
      date: dateStr,
      completed: isCompleted,
      completedCount: calendarRecord ? calendarRecord.completedCount || 0 : 0,
      targetCount: calendarRecord ? calendarRecord.targetCount || 1 : 1,
      isPast,
      isFuture,
      isToday: isTodayActual,
      isCompletedByWeeklyRule
    });
  }
  
  return weekData;
};

// 通用的月份数据生成函数
const generateMonthViewData = (targetDate: Date, calendarData?: any[], moodData?: any) => {
  // 获取当月第一天和最后一天
  const firstDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
  const lastDay = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);

  // 计算当月第一天是星期几 (0=周日, 1=周一, ..., 6=周六)
  const prevMonthDays = calculatePrevMonthDays(firstDay);

  // 计算需要显示的总天数（最多5行7列）
  const daysInMonth = lastDay.getDate();
  const daysNeeded = 35; // 5行7列

  const monthData = [];

  // 预计算年份和月份，避免重复访问
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();

  // 通用函数：根据日期获取数据
  const getDayData = (date: Date) => {
    const dateStr = formatDate(date);
    let dayData;
    if (calendarData !== undefined) {
      // 处理打卡日历数据
      dayData = calendarData.find(day => day.date === dateStr);
    } else if (moodData !== undefined) {
      // 处理情绪日历数据
      dayData = moodData[dateStr];
    } else {
      // 仅返回日期信息
      dayData = null;
    }
    
    // 更精确地判断是否为当前月
    const isCurrentMonth = (date.getMonth() === targetDate.getMonth() && 
                          date.getFullYear() === targetDate.getFullYear());
    
    return {
      date: dateStr,
      data: dayData || null,
      isCurrentMonth: isCurrentMonth,
      isToday: dateStr === getToday()
    };
  };

  // 添加上个月的日期
  for (let i = prevMonthDays; i > 0; i--) {
    const date = new Date(targetYear, targetMonth, -i + 1);
    monthData.push(getDayData(date));
  }

  // 添加当前月的日期
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(targetYear, targetMonth, i);
    monthData.push(getDayData(date));
  }

  // 添加下个月的日期以填满网格
  const remainingDays = daysNeeded - monthData.length;
  for (let i = 1; i <= remainingDays; i++) {
    const date = new Date(targetYear, targetMonth + 1, i);
    monthData.push(getDayData(date));
  }

  return monthData;
};

// 获取统计页面月视图数据
const getStatsMonthViewData = (habit: Habit) => {
  initializeStatsViewMode(habit);
  const today = new Date();
  const targetDate = new Date(today.getFullYear(), today.getMonth() + (habit.statsMonthOffset || 0), 1);

  // 使用通用的月份数据生成函数
  const rawData = generateMonthViewData(targetDate, habit.calendar);
  
  // 格式化为统计页面需要的格式
  return rawData.map(item => ({
    date: item.date,
    completed: item.data ? item.data.completed : false,
    completedCount: item.data ? (item.data.completedCount || 0) : 0,
    targetCount: item.data ? (item.data.targetCount || 1) : 1,
    isCurrentMonth: item.isCurrentMonth
  }));
};

// 更改统计页面日历时间段
const changeStatsCalendarPeriod = (habit: Habit, direction: number) => {
  initializeStatsViewMode(habit);
  habit.statsMonthOffset = (habit.statsMonthOffset || 0) + direction;
};

// 获取当前时间段文本
const getCurrentPeriodText = (habit: Habit) => {
  initializeStatsViewMode(habit);
  const today = new Date();
  const targetDate = new Date(today.getFullYear(), today.getMonth() + (habit.statsMonthOffset || 0), 1);
  return `${targetDate.getFullYear()}年${targetDate.getMonth() + 1}月`;
};



// 当前选中的习惯
const selectedHabit = ref<Habit | null>(null);

// 选中习惯的最长连续打卡 - 缓存计算结果避免重复计算
const selectedHabitLongestStreak = computed(() =>
  selectedHabit.value ? calculateLongestStreak(selectedHabit.value) : { streak: 0, startDate: null, endDate: null }
);

// 预计算所有习惯的状态，避免在模板中重复调用函数
const habitsCache = computed(() => {
  const cache = new Map<string, {
    weeklyCompleted: boolean;
    todayCompletionCount: number;
    piePath: string;
  }>();
  
  
  for (const habit of habits.value) {
    const weeklyCompleted = habit.frequency && habit.frequency.startsWith('weekly') 
      ? getWeeklyCompletionStatus(habit) 
      : false;
    const todayCompletionCount = getTodayCompletionCount(habit);
    const piePath = getLargePiePath(habit);
    
    cache.set(habit.id, { weeklyCompleted, todayCompletionCount, piePath });
  }
  
  return cache;
});

// 获取习惯缓存的辅助函数
const getHabitCache = (habitId: string) => {
  return habitsCache.value.get(habitId) || { weeklyCompleted: false, todayCompletionCount: 0, piePath: '' };
};


// 当天日历相关
const currentDayInfo = ref({
  date: formatDate(new Date()),
  dayOfWeek: new Date().getDay(),
  dayOfMonth: new Date().getDate(),
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
});

// 星期名称数组，支持国际化
const weekdaysForCalendar = computed(() => ['一', '二', '三', '四', '五', '六', '日']);



// 计算当月第一天前需要显示的天数
const calculatePrevMonthDays = (firstDay: Date) => {
  const dayOfWeek = firstDay.getDay();
  return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
};

// 计算当前日期字符串
const currentDateString = computed(() => {
  const date = new Date(); // 直接获取当前日期，而不是使用currentDayInfo
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return `${month}/${day}/周${weekdays[date.getDay()]}`;
});

// 获取习惯打卡频率的文本描述
const getFrequencyText = (habit: Habit) => {
  const timesPerDay = habit.timesPerDay || 1;
  if (!habit.frequency || habit.frequency === 'daily') return `每天${timesPerDay}次`;
  const match = habit.frequency.match(/weekly(\d)/);
  if (match) return `每周${match[1]}天 | 每天${timesPerDay}次`;
  if (habit.frequency === 'custom' && (habit as any).customFrequency) {
    return `每周${(habit as any).customFrequency}天 | 每天${timesPerDay}次`;
  }
  return `每天${timesPerDay}次`;
};

// 获取习惯创建日期的文本描述
const getCreatedDateText = (habit: Habit) => {
  if (!habit.createdAt) return '';
  const date = new Date(habit.createdAt);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `创建于 ${year}-${month}-${day}`;
};

// 显示习惯统计页面
const showHabitStats = (habit: Habit) => {
  selectedHabit.value = habit;
};

// 显示编辑习惯模态框
const showEditHabitModal = ref(false);
const editedHabit = ref<Habit | null>(null);

// 打开编辑习惯模态框
const openEditHabitModal = () => {
  if (selectedHabit.value) {
    editedHabit.value = JSON.parse(JSON.stringify(selectedHabit.value));
    showEditHabitModal.value = true;
  }
};

// 关闭编辑习惯模态框
const closeEditHabitModal = () => {
  showEditHabitModal.value = false;
  editedHabit.value = null;
};

// 保存编辑后的习惯
const saveEditedHabit = async (habit: Habit) => {
  if (selectedHabit.value) {
    Object.assign(selectedHabit.value, habit);
    await immediateSaveHabits(habits.value);
    closeEditHabitModal();
  }
};

// 暂停或恢复习惯打卡
const togglePauseHabit = async (habit: Habit) => {
  if (habit) {
    habit.isPaused = !habit.isPaused;
    await immediateSaveHabits(habits.value);
    triggerRef(habits);
  }
};

// 关闭统计页面
const closeHabitStats = () => {
  selectedHabit.value = null;
};

// 情绪数据
const moodData = ref<MoodData>({});

// 情绪打卡相关
const showMoodTracker = ref(false);
const selectedDate = ref('');
const moodEntry = ref({
  emoji: '',
  note: ''
});

// 打开情绪打卡面板
const openMoodTracker = async (date: string) => {
  selectedDate.value = date;
  const moodData = await getMoodData();
  const dateEntry = moodData[date];
  moodEntry.value = dateEntry ? {
    emoji: dateEntry.emoji || '',
    note: dateEntry.note || ''
  } : { emoji: '', note: '' };
  showMoodTracker.value = true;
};

// 保存情绪打卡数据
const handleSaveMoodEntry = async (entry: any) => {
  try {
    const moodDataLocal = await getMoodData();
    moodDataLocal[selectedDate.value] = {
      emoji: entry.emoji,
      note: entry.note,
      timestamp: new Date().toISOString()
    };
    await saveMoodData(moodDataLocal);
    moodData.value = moodDataLocal;
  } catch (error) {
    console.error('保存情绪数据失败:', error);
  }
};

// 删除情绪打卡数据
const handleDeleteMoodEntry = async () => {
  if (!selectedDate.value) return;
  try {
    const moodDataLocal = await getMoodData();
    delete moodDataLocal[selectedDate.value];
    await saveMoodData(moodDataLocal);
    moodData.value = moodDataLocal;
  } catch (error) {
    console.error('删除情绪数据失败:', error);
  }
};

// 关闭情绪打卡面板
const closeMoodTracker = () => {
  showMoodTracker.value = false;
  moodEntry.value = { emoji: '', note: '' };
};

const changeMoodCalendarMonth = (offset: number) => {
  moodCalendarCurrentMonth.value += offset;
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
    
    #add-habit-btn,#stats-btn,#mood-calendar-btn,#focus-timer-btn {
      background: none;
      border: none;
      padding: 0;
      margin: 0 6px 0 0;
      cursor: pointer;
      width: 26px;
      height: 26px;
      
      svg {
        color: var(--b3-theme-on-background);
        width: 26px;
        height: 26px;
      }
    }
  }
  
  .habit-list {
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: var(--b3-font-color1);
      font-size: 16px;
    }
    
    .habits-grid {
      display: grid;
      gap: 8px;
    }
    
    .habits-container {
      display: contents;
    }
    
    .habit-card {
      background: var(--b3-theme-background);
      border-radius: 15px;
      box-shadow: rgba(0, 0, 0, 0.06) 0px 1px 5px 0px;
      
      .habit-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        
        .habit-title {
          font-size: 16px;
          font-weight: bold;
          color: var(--b3-theme-on-background);
          flex: 1;
          margin-left: 2px;
        }
        
        .habit-actions {
          display: flex;
          gap: 8px;
        }
      }
      
      .habit-stats {
        display: flex;
        justify-content: space-between;
        margin-bottom: 12px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--b3-border-color);
        
        .stats-item {
          text-align: center;
          
          .stat-label {
            display: block;
            font-size: 10px;
            color: var(--b3-scroll-color);
          }
          
          .stat-value {
            display: block;
            font-weight: bold;
            color: var(--b3-theme-on-background);
          }
        }
      }
      
      .habit-calendar {
        .calendar-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          
          .view-selector {
            display: flex;
            gap: 4px;
            
            .view-btn {
              padding: 4px 8px;
              border: 1px solid var(--b3-border-color);
              background-color: var(--b3-list-background);
              color: var(--b3-font-color1);
              border-radius: 4px;
              cursor: pointer;
              font-size: 12px;
              
              &.active {
                background-color: var(--b3-theme-primary);
                color: var(--b3-theme-on-primary);
                border-color: var(--b3-theme-primary);
              }
              
              &:hover {
                background-color: var(--b3-list-hover);
              }
            }
          }
          
          .calendar-navigation {
            display: flex;
            align-items: center;
            gap: 8px;
            
            .nav-btn {
              padding: 2px 6px;
              border: 1px solid var(--b3-border-color);
              background-color: var(--b3-list-background);
              color: var(--b3-font-color1);
              border-radius: 4px;
              cursor: pointer;
              font-size: 12px;
              
              &:hover {
                background-color: var(--b3-list-hover);
              }
            }
            
            .current-period {
              font-size: 12px;
              color: var(--b3-font-color1);
              min-width: 120px;
              text-align: center;
            }
          }
        }
        
        .calendar-weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          text-align: center;
          font-size: 12px;
          color: var(--b3-font-color1);
          margin-bottom: 4px;
        }
        
        .calendar-days {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
          
          .calendar-day {
            aspect-ratio: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            font-size: 12px;
            background-color: var(--b3-list-background);
            color: var(--b3-font-color1);
            
            &.completed {
              background-color: var(--b3-success-background);
              color: var(--b3-success-text);
            }
            
            &.today {
              border: 2px solid var(--b3-theme-primary);
            }
            
            .day-number {
              font-size: 14px;
            }
          }
        }
      }
    }
    
    .habit-card.completed {
      box-shadow: inset 0 0 0 100px rgba(0, 0, 0, 0.03), rgba(0, 0, 0, 0.06) 0px 1px 5px 0px;
    }
    
    .habit-card.paused {
      background-image: repeating-linear-gradient(-45deg, var(--b3-border-color), var(--b3-border-color) 5px, var(--b3-list-hover) 0, var(--b3-list-hover) 10px);
      background-color: var(--b3-list-background);
      opacity: 0.7;
    }
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

.habit-list-enter-active, .habit-list-leave-active {
  transition: all 0.3s ease;
}
.habit-list-enter-from, .habit-list-leave-to {
  opacity: 0;
  transform: translateY(30px);
}

.habit-card {
  transition: all 0.3s ease;
  transition-property: transform, opacity, height;
  transition-duration: 0.3s;
  transition-timing-function: ease;
  transition-delay: 0s;
  will-change: transform;
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

/* 内联番茄钟样式 */
.pomodoro-inline-display {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-around;
  padding: 8px;
  background-color: var(--b3-list-hover);
  border-radius: 8px;
  margin: 0 8px 8px;
}

.pomodoro-timer-inline {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.timer-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.pomodoro-timer-inline .timer {
  position: absolute;
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 70%;
  height: 70%;
  border-radius: 50%;
  background-color: var(--b3-theme-background);
  z-index: 1;
}

.pomodoro-timer-inline .progress-ring {
  width: 100px;
  height: 100px;
  transform: rotate(-90deg);
  position: relative;
  z-index: 0;
  
  circle {
    fill: none;
    stroke-width: 8;
  }
  
  .progress-ring__bg {
    stroke: var(--b3-list-hover);
  }
  
  .progress-ring__progress {
    stroke: #f98f7a;
    stroke-linecap: round;
    transition: stroke-dashoffset 1s ease-in-out;
    transform-origin: 50% 50%;
    
    &.pomodoro-running {
      stroke: #f98f7a;
    }
    
    &.pomodoro-short-break {
      stroke: #3498db;
    }
    
    &.pomodoro-long-break {
      stroke: #2ecc71;
    }
  }
}

.pomodoro-controls-inline {
  display: flex;
  gap: 12px;
}

.pomodoro-controls-inline .stop-btn {
  background-color: #e74c3c;
  color: var(--b3-theme-background);
  border: none;
  border-radius: 8px;
  padding: 10px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pomodoro-controls-inline .pause-btn {
  background-color: #f39c12;
  color: var(--b3-theme-background);
  border: none;
  border-radius: 8px;
  padding: 10px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pomodoro-controls-inline .resume-btn {
  background-color: #27ae60;
  color: var(--b3-theme-background);
  border: none;
  border-radius: 8px;
  padding: 10px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}



.pomodoro-button {
  margin-right: 8px;
}

</style>
