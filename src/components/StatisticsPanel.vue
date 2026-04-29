<template>
  <div v-if="show" class="total-stats-panel">
    <div class="stats-header">
      <div class="stats-header-content">
        <div class="stats-title">统计总览</div>
        <button type="button" class="icon-button" title="关闭" aria-label="关闭" @click="emit('close')">
          <Icon name="close" width="16" height="16" class="icon" />
        </button>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-item">
        <div class="stat-value">{{ totalHabitsCount }}</div>
        <div class="stat-label">习惯总数</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ totalCompletionsCount }}</div>
        <div class="stat-label">总完成数</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ longestStreak }}</div>
        <div class="stat-label">最长连击</div>
      </div>
    </div>

    <div class="heatmap-section">
      <div class="heatmap-header">
        <h3 class="heatmap-title">打卡热力图</h3>
        <div class="heatmap-legend">
          <span>少</span>
          <div class="legend-colors">
            <div class="legend-color intensity-0"></div>
            <div class="legend-color intensity-1"></div>
            <div class="legend-color intensity-2"></div>
            <div class="legend-color intensity-3"></div>
            <div class="legend-color intensity-4"></div>
          </div>
          <span>多</span>
        </div>
      </div>
      <div class="heatmap-container">
        <div class="heatmap-grid">
          <div class="heatmap-weekdays">
            <div class="heatmap-weekday">一</div>
            <div class="heatmap-weekday">二</div>
            <div class="heatmap-weekday">三</div>
            <div class="heatmap-weekday">四</div>
            <div class="heatmap-weekday">五</div>
            <div class="heatmap-weekday">六</div>
            <div class="heatmap-weekday">日</div>
          </div>
          <div class="heatmap-days-container">
            <template v-for="(week, weekIndex) in heatmapGridData.weeks" :key="weekIndex">
              <div class="heatmap-week-row">
                <template v-for="(day, dayIndex) in week" :key="dayIndex">
                  <div
                    class="heatmap-day"
                    :class="`intensity-${day.intensity}`"
                    :title="`${day.date}: ${day.count} 次打卡`"
                  ></div>
                </template>
              </div>
            </template>
          </div>
        </div>
      </div>
      <div class="heatmap-months">
        <div v-for="month in heatmapMonths" :key="month.monthLabel" class="heatmap-month-label" :style="{ left: `${month.offset}%` }">
          {{ month.monthLabel }}
        </div>
      </div>
    </div>

    <div class="habits-stats-list">
      <div class="habit-stat-item" v-for="habit in habits" :key="habit.id">
        <div class="habit-stat-content">
          <div class="habit-stat-header">
            <div class="habit-emoji-large">{{ habit.emoji || '🌟' }}</div>
            <span class="habit-name">{{ habit.name }}</span>
            <span class="habit-created">{{ getCreatedDateText(habit) }}</span>
          </div>
          <div class="habit-stat-details">
            <div class="stat-detail-item">
              <span class="stat-value">{{ habit.totalCompletions || habit.calendar.filter(record => record.completed).length }}<span> 次</span></span>
              <span class="stat-label">累计打卡</span>
            </div>
            <div class="stat-detail-item">
              <span class="stat-value">{{ calculateLongestStreak(habit).streak }}<span> 天</span></span>
              <span class="stat-label">最长连击</span>
            </div>
            <div class="stat-detail-item">
              <span class="stat-value">{{ calculateTotalCompletionRate(habit) }}<span> %</span></span>
              <span class="stat-label">总完成率</span>
            </div>
            <div class="stat-detail-item">
              <span class="stat-value" v-html="calculateCommonTimeSlot(habit)"></span>
              <span class="stat-label">高频时段</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Habit } from '@/api';
import Icon from './Icon.vue';

interface HeatmapDay {
  date: string;
  intensity: number;
  count: number;
}

interface HeatmapWeek {
  [key: number]: HeatmapDay;
}

interface HeatmapGridData {
  weeks: HeatmapWeek[];
}

interface HeatmapMonth {
  monthLabel: string;
  offset: number;
}

interface Props {
  show: boolean;
  totalHabitsCount: number;
  totalCompletionsCount: number;
  longestStreak: number;
  heatmapGridData: HeatmapGridData;
  heatmapMonths: HeatmapMonth[];
  habits: Habit[];
  getCreatedDateText: (habit: Habit) => string;
  calculateLongestStreak: (habit: Habit) => { streak: number; startDate: Date | null; endDate: Date | null };
  calculateTotalCompletionRate: (habit: Habit) => number;
  calculateCommonTimeSlot: (habit: Habit) => string;
}

defineProps<Props>();
const emit = defineEmits<{
  close: [];
}>();
</script>

<style scoped>
.total-stats-panel {
  position: absolute;
  inset: 0;
  z-index: 2;
  box-sizing: border-box;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 10px;
  --s: 20px;
  --c1: #2a936a;
  --c2: #32a176;
  --_g: radial-gradient(calc(var(--s) / 2), var(--c1) 97%, #0000);
  background:
    var(--_g), var(--_g) calc(2 * var(--s)) calc(2 * var(--s)),
    repeating-conic-gradient(from 45deg, #0000 0 25%, var(--c2) 0 50%) calc(-0.707 * var(--s)) calc(-0.707 * var(--s)),
    repeating-linear-gradient(135deg, var(--c1) calc(var(--s) / -2) calc(var(--s) / 2), var(--c2) 0 calc(2.328 * var(--s)));
  background-size: calc(4 * var(--s)) calc(4 * var(--s));
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.total-stats-panel::-webkit-scrollbar {
  display: none;
}

.stats-header {
  display: flex;
  flex-direction: column;
  padding-bottom: 10px;
}

.stats-header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.stats-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--b3-theme-background);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.stat-item {
  text-align: center;
  border-radius: 24px;
  padding: 12px;
  background: rgb(255 255 255 / 0.16);
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #ffcb4c;
  margin-bottom: 4px;
}

.stat-value span {
  font-size: 12px;
}

.stat-label {
  font-weight: 700;
  font-size: 12px;
  color: var(--b3-theme-background);
}

.heatmap-section,
.habit-stat-item {
  background: var(--b3-theme-background);
  border-radius: 12px;
}

.heatmap-section {
  padding: 15px;
}

.heatmap-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.heatmap-title {
  font-size: 14px;
  font-weight: 700;
  margin: 0;
  color: var(--b3-theme-on-background);
}

.heatmap-container {
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.heatmap-grid {
  display: flex;
  flex-direction: row;
  gap: 1%;
  width: 100%;
  height: 100%;
}

.heatmap-weekdays {
  display: flex;
  flex-direction: column;
}

.heatmap-weekday {
  height: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: var(--b3-scroll-color);
}

.heatmap-days-container {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  width: 100%;
  height: 100%;
}

.heatmap-week-row {
  display: flex;
  flex-direction: row;
  gap: 1%;
  margin-bottom: 4px;
}

.heatmap-day {
  width: calc(100% / 18);
  height: 13px;
  min-width: 8px;
  min-height: 8px;
  border-radius: 3px;
  transition: all 0.2s ease;
}

.heatmap-day.intensity-0 {
  background-color: var(--b3-list-hover);
}

.heatmap-day.intensity-1 {
  background-color: rgb(252 144 121 / 0.3);
}

.heatmap-day.intensity-2 {
  background-color: rgb(252 144 121 / 0.5);
}

.heatmap-day.intensity-3 {
  background-color: rgb(252 144 121 / 0.7);
}

.heatmap-day.intensity-4 {
  background-color: rgb(252 144 121);
}

.heatmap-months {
  position: relative;
  height: 20px;
  margin-top: 4px;
  width: 100%;
}

.heatmap-month-label {
  position: absolute;
  font-size: 10px;
  color: var(--b3-scroll-color);
  white-space: nowrap;
  transform: translateX(-50%);
  top: 0;
}

.heatmap-legend {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  color: var(--b3-scroll-color);
}

.legend-colors {
  display: flex;
  gap: 2px;
}

.legend-color {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.legend-color.intensity-0 {
  background-color: var(--b3-list-hover);
}

.legend-color.intensity-1 {
  background-color: rgb(252 144 121 / 0.3);
}

.legend-color.intensity-2 {
  background-color: rgb(252 144 121 / 0.5);
}

.legend-color.intensity-3 {
  background-color: rgb(252 144 121 / 0.7);
}

.legend-color.intensity-4 {
  background-color: rgb(252 144 121);
}

.habits-stats-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.habit-stat-item {
  padding: 10px;
  display: flex;
  align-items: flex-start;
}

.habit-stat-content {
  flex: 1;
}

.habit-stat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.habit-emoji-large {
  text-align: center;
  font-size: 24px;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 8px;
}

.habit-name {
  font-weight: 700;
  color: var(--b3-theme-on-background);
  margin-right: auto;
  font-size: 16px;
  flex: 1;
}

.habit-created {
  font-size: 10px;
  color: var(--b3-theme-on-background);
  white-space: nowrap;
  background-color: var(--b3-list-hover);
  padding: 4px 10px;
  border-radius: 12px;
}

.habit-stat-details {
  display: flex;
  justify-content: space-between;
}

.stat-detail-item {
  text-align: center;
  flex: 1;
}

.stat-detail-item .stat-label {
  font-size: 10px;
  color: var(--b3-scroll-color);
  display: block;
}

.stat-detail-item .stat-value {
  font-weight: 600;
  color: var(--b3-theme-on-background);
  display: block;
  font-size: 18px;
}

.stat-detail-item .stat-value span {
  font-size: 12px;
}

.icon-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-button .icon {
  color: var(--b3-theme-background);
}

@media (max-width: 720px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .habit-stat-header,
  .habit-stat-details {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
}
</style>
