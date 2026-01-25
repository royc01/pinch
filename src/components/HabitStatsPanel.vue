<template>
  <div v-if="habit" class="stats-panel">
    <div class="stats-header">
      <div class="stats-header-content">
        <button @click="handleEdit" class="icon-button">
          <Icon name="edit" width="16" height="16" class="icon" />
        </button>
        <div class="stats-title">{{ habit.name }}</div>
        <button @click="handleClose" class="icon-button">
          <Icon name="close" width="16" height="16" class="icon" />
        </button>
      </div>
      <div class="stats-emoji">{{ habit.emoji || '📝' }}</div>
      <div class="habit-meta">
        <span class="habit-frequency">{{ getFrequencyText(habit) }}</span>
        <span class="habit-created">{{ getCreatedDateText(habit) }}</span>
      </div>
    </div>
    <div class="stats-content">
      <div class="calendar-container">
        <div class="calendar-controls">
          <div class="calendar-navigation">
            <button @click="changeCalendarPeriod(-1)" class="nav-btn">
              <Icon name="right" width="16" height="16" class="icon" />
            </button>
            <span class="current-period">{{ currentPeriodText }}</span>
            <button @click="changeCalendarPeriod(1)" class="nav-btn">
              <Icon name="left" width="16" height="16" class="icon" />
            </button>
          </div>
        </div>
        <div class="calendar-view">
          <div class="month-view">
            <div class="weekdays-header">
              <div v-for="day in weekdays" :key="day" class="weekday">{{ day }}</div>
            </div>
            <div class="month-grid">
              <div 
                v-for="day in monthViewData" 
                :key="day.date" 
                :class="['day', { completed: day.completed, today: day.date === getToday(), 'not-current-month': !day.isCurrentMonth }]"
                @click="!habit.isPaused && toggleDayCompletion(day.date)"
              >
                <span class="day-number">{{ day.date.split('-')[2] }}</span>
                <div v-if="day.targetCount > 1" class="day-progress-container">
                  <div class="day-progress-bar">
                    <div class="day-progress-fill" :style="{ width: (day.completedCount / day.targetCount * 100) + '%' }"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value">{{ currentMonthStreak }}</div>
          <div class="stat-label">{{ t('habitTracker.currentStreak') }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ totalMonthCompletions }}</div>
          <div class="stat-label">{{ t('habitTracker.totalCompletions') }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ completionRate }}<span> %</span></div>
          <div class="stat-label">{{ t('habitTracker.completionRate') }}</div>
        </div>
      </div>
    </div>
        
        <div class="cumulative-stats">
          <div class="stat-row">
            <div class="stat-item">
              <div class="stat-label">累计打卡</div>
              <div class="stat-value">{{ habit.totalCompletions }}<span> 次</span></div>
              <div class="monthly-progress-chart">
                <div class="chart-bar" v-for="monthData in monthlyProgressData" :key="monthData.month">
                  <div class="bar-fill" :style="{ height: monthData.percentage + '%' }"></div>
                </div>
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-label">最长连续坚持</div>
              <div class="stat-value">{{ longestStreak.streak }}<span> 天</span></div>
              <div class="stat-timeline" v-if="longestStreak.startDate && longestStreak.endDate">
                <div class="stat-timeline-start">{{ formatTimelineDate(longestStreak.startDate) }}</div>
                <div class="stat-timeline-end">{{ formatTimelineDate(longestStreak.endDate) }}</div>
              </div>
            </div>
          </div>
          <div class="stat-row">
            <div class="stat-item">
              <div class="stat-label">总完成率</div>
              <div class="stat-value">{{ totalCompletionRate }}<span> %</span></div>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: totalCompletionRate + '%' }"></div>
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-label">最常打卡时刻</div>
              <div class="stat-value" v-html="commonTimeSlot"></div>
              <div class="hour-distribution-chart">
                <div class="chart-container">
                  <div 
                    v-for="hourData in hourDistribution" 
                    :key="hourData.hour"
                    class="hour-bar"
                    :style="{ height: calculateBarHeight(hourData.count) + '%' }"
                    :title="`${hourData.hour}点: ${hourData.count}次`"
                  >
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        
        <div class="stats-actions">
          <SyButton @click="togglePause" class="pause-button" :icon="habit.isPaused ? 'iconPlay' : 'iconPause'">
            {{ habit.isPaused ? '恢复打卡' : '暂停打卡' }}
          </SyButton>
          <SyButton @click="handleDelete" class="confirm-button" icon="iconTrashcan">
            {{ t('habitTracker.delete') }}
          </SyButton>
        </div>
      </div>
    </div>
</template>

<script setup lang="ts">
import Icon from './Icon.vue';
import SyButton from './SiyuanTheme/SyButton.vue';
import type { Habit } from '@/api';

interface DayData {
  date: string;
  completed: boolean;
  isCurrentMonth: boolean;
  targetCount?: number;
  completedCount?: number;
}

interface MonthData {
  month: string;
  percentage: number;
}

interface HourData {
  hour: number;
  count: number;
}

interface LongestStreak {
  streak: number;
  startDate: Date | null;
  endDate: Date | null;
}

interface Props {
  habit: Habit | null;
  weekdays: string[];
  monthViewData: DayData[];
  currentPeriodText: string;
  currentMonthStreak: number;
  totalMonthCompletions: number;
  completionRate: number;
  monthlyProgressData: MonthData[];
  longestStreak: LongestStreak;
  totalCompletionRate: number;
  commonTimeSlot: string;
  hourDistribution: HourData[];
  getFrequencyText: (habit: Habit) => string;
  getCreatedDateText: (habit: Habit) => string;
  formatTimelineDate: (date: Date | null) => string;
  calculateBarHeight: (count: number) => number;
  t: (key: string) => string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
  edit: [];
  delete: [];
  togglePause: [];
  changePeriod: [direction: number];
  toggleDay: [date: string];
}>();

const handleClose = () => {
  emit('close');
};

const handleEdit = () => {
  emit('edit');
};

const handleDelete = () => {
  emit('delete');
};

const togglePause = () => {
  emit('togglePause');
};

const changeCalendarPeriod = (direction: number) => {
  emit('changePeriod', direction);
};

const toggleDayCompletion = (date: string) => {
  emit('toggleDay', date);
};

const getToday = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};
</script>

<style scoped>
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
  --s: 20px;
  --c1: #2a936a;
  --c2: #32a176;
  --_g: radial-gradient(calc(var(--s)/2),var(--c1) 97%,#0000);
  background:
    var(--_g),var(--_g) calc(2*var(--s)) calc(2*var(--s)),
    repeating-conic-gradient(from 45deg,#0000 0 25%,var(--c2) 0 50%) calc(-.707*var(--s)) calc(-.707*var(--s)),
    repeating-linear-gradient(135deg,var(--c1) calc(var(--s)/-2) calc(var(--s)/2),var(--c2) 0 calc(2.328*var(--s)));
  background-size: calc(4*var(--s)) calc(4*var(--s));
  
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

.cumulative-stats {
  margin: 10px 0;
}

.stat-row {
  display: flex;
  justify-content: space-around;
  margin-bottom: 10px;
  gap: 10px;
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

.day-progress-container {
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  height: 3px;
  border-radius: 2px;
  background: var(--b3-list-hover);
  overflow: hidden;
}

.day-progress-bar {
  width: 100%;
  height: 100%;
  background: var(--b3-list-hover);
}

.day-progress-fill {
  height: 100%;
  background: #f98f7a;
  transition: width 0.2s ease;
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

.confirm-button {
  background-color: #f98f7a;
  color: var(--b3-theme-background);
  font-weight: bold;
  border: none;
  border-radius: 24px;
  padding: 6px 12px;
}

.confirm-button:hover {
  background-color: #e55a47;
}

.confirm-button:active {
  background-color: #dc4a33;
}
</style>
