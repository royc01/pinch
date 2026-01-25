<template>
  <div v-if="show" class="mood-calendar-panel">
    <div class="stats-header">
      <div class="stats-header-content">
        <div class="stats-title">心情打卡月视图</div>
        <button @click="handleClose" class="icon-button">
          <Icon name="close" width="16" height="16" class="icon" />
        </button>
      </div>
    </div>
    <div class="stats-content">
      <div class="stats-row">
        <div class="mood-stats-container">
          <div class="mood-stats-title">心情统计</div>
          <div class="mood-stats-chart">
            <div class="mood-stat-item" v-for="item in moodStatsData.data" :key="item.type">
              <div class="mood-stat-bar-container">
                <div 
                  class="mood-stat-bar" 
                  :class="`mood-stat-bar-${item.type}`"
                  :style="{ height: (item.count / moodStatsData.maxValue * 100) + '%' }"
                ></div>
              </div>
              <div class="mood-stat-count">{{ item.count }}</div>
              <div class="mood-stat-emoji" v-html="props.getLargeMoodSvg(item.emoji)"></div>
            </div>
          </div>
        </div>
        
        <div class="mood-trend-container">
        <div class="mood-trend-title">心情趋势图</div>
        <div class="mood-trend-chart">
          <svg viewBox="0 0 200 200" preserveAspectRatio="none">
            <!-- 网格线 -->
            <line v-for="y in 5" :key="`grid-${y}`"
                  class="trend-grid-line"
                  :x1="10" :y1="(y - 1) * 35 + 10"
                  :x2="190" :y2="(y - 1) * 35 + 10" />
            
            <!-- Y轴标签 -->
            <text v-for="score in 5" :key="`label-${score}`"
                  class="trend-label"
                  :x="2" :y="(5 - score) * 35 + 14">
              {{ score * 20 }}
            </text>
            
            <!-- 趋势线 -->
            <polyline
              class="trend-line"
              :points="trendLinePoints"
            />
            
            <!-- 数据点 -->
            <circle v-for="(point, index) in trendData" :key="index"
                    class="trend-point"
                    :class="{ active: index === trendData.length - 1 }"
                    :cx="point.x" :cy="point.y" r="4"
                    @mouseenter="hoverPoint = index"
                    @mouseleave="hoverPoint = -1"
            />
            
            <!-- X轴标签 -->
            <text v-for="(point, index) in trendData" :key="`month-${index}`"
                  class="trend-label"
                  :x="point.x" :y="195">
              {{ point.month }}
            </text>
            
            <!-- 分数标签（hover时显示） -->
            <text v-if="hoverPoint >= 0 && trendData[hoverPoint]"
                  class="trend-score-label"
                  :x="trendData[hoverPoint].x"
                  :y="trendData[hoverPoint].y - 10">
              {{ trendData[hoverPoint].score }}
            </text>
          </svg>
        </div>
      </div>
      </div>
      
      <div class="calendar-container">
        <div class="calendar-controls">
          <div class="calendar-navigation">
            <button @click="changeMonth(-1)" class="nav-btn">
              <Icon name="right" width="16" height="16" class="icon" />
            </button>
            <span class="current-period">{{ monthYear }}</span>
            <button @click="changeMonth(1)" class="nav-btn">
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
                v-for="day in calendarData" 
                :key="day.date" 
                :class="['day', { 
                  'completed': day.data, 
                  'today': day.isToday, 
                  'not-current-month': !day.isCurrentMonth 
                }]"
                @click="handleOpenMoodTracker(day.date)"
              >
                <div v-if="day.data" class="mood-emoji-large" v-html="props.getLargeMoodSvg(day.data.emoji)"></div>
                <span v-else class="day-number">{{ day.date.split('-')[2] }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="mood-list-container">
          <h4 class="mood-list-title">本月心情记录</h4>
          <div class="mood-list">
            <div 
              v-for="entry in currentMonthMoodEntries" 
              :key="entry.date" 
              class="mood-list-item"
            >
              <div class="mood-list-date">{{ entry.date.split('-')[2] }}</div>
              <div class="mood-list-content" @click="handleOpenMoodTracker(entry.date)">
                <div class="mood-list-emoji" v-html="props.getLargeMoodSvg(entry.mood.emoji)"></div>
                <div class="mood-list-note">{{ entry.mood.note }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import Icon from './Icon.vue';

interface MoodData {
  [date: string]: {
    emoji: string;
    note: string;
  };
}

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
  data: { emoji: string; note: string } | null;
  isCurrentMonth: boolean;
  isToday: boolean;
}

interface MoodEntry {
  date: string;
  mood: { emoji: string; note: string };
}

interface Props {
  show: boolean;
  moodData: MoodData;
  currentMonth: number;
  weekdays: string[];
  generateMonthViewData: (date: Date, habit: any, moodData: MoodData) => DayData[];
  getLargeMoodSvg: (emoji: string) => string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  openMoodTracker: [date: string];
  changeMonth: [offset: number];
}>();

const hoverPoint = ref(-1);

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
  return `${targetDate.getFullYear()}年${targetDate.getMonth() + 1}月`;
});

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
      { type: 'excited', count: stats.excited, emoji: '🤩', label: '兴奋' },
      { type: 'happy', count: stats.happy, emoji: '😊', label: '开心' },
      { type: 'calm', count: stats.calm, emoji: '😌', label: '平静' },
      { type: 'sad', count: stats.sad, emoji: '😢', label: '难过' },
      { type: 'angry', count: stats.angry, emoji: '😡', label: '愤怒' }
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

const currentMonthMoodEntries = computed<MoodEntry[]>(() => {
  const today = new Date();
  const targetDate = new Date(today.getFullYear(), today.getMonth() + props.currentMonth, 1);
  const currentYear = targetDate.getFullYear();
  const currentMonth = targetDate.getMonth();
  
  const entries: MoodEntry[] = [];
  
  for (const [dateStr, mood] of Object.entries(props.moodData)) {
    const [year, month] = dateStr.split('-').map(Number);
    if (year === currentYear && month - 1 === currentMonth) {
      entries.push({ date: dateStr, mood });
    }
  }
  
  entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return entries;
});

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
      y: 180 - (avgScore / 100) * 160
    });
  }
  
  return data;
});

const trendLinePoints = computed(() => {
  return trendData.value.map(point => `${point.x},${point.y}`).join(' ');
});

const handleClose = () => {
  emit('close');
};

const handleOpenMoodTracker = (date: string) => {
  emit('openMoodTracker', date);
};

const changeMonth = (offset: number) => {
  emit('changeMonth', offset);
};

</script>

<style scoped>
.mood-calendar-panel {
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
      font-size: 86px;
      align-self: center;
      height: 150px;
    }
    
    .stats-title {
      font-size: 18px;
      font-weight: bold;
      color: var(--b3-theme-background);
    }
    
    .stats-header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .stats-title {
        margin: 0;
        color: var(--b3-theme-background);
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
    display: flex;
    flex-direction: column;
    
    .stats-row {
      display: flex;
      gap: 12px;
      margin-bottom: 10px;
      width: 100%;
      
      .mood-stats-container {
        flex: 1;
        background: var(--b3-theme-background);
        border-radius: 16px;
        padding: 10px;
      }
      
      .mood-trend-container {
        flex: 1;
        background: var(--b3-theme-background);
        border-radius: 16px;
        padding: 10px;
      }
    }
    
    .calendar-container {
      background-color: var(--b3-theme-background);
      padding: 16px 16px 8px 16px;
      border-radius: 24px;
      box-shadow: rgba(0, 0, 0, 0.06) 0px 1px 5px 0px;
      
      .calendar-controls {
        display: flex;
        justify-content: center;
        align-items: center;
        margin-bottom: 16px;
        padding: 8px;
        background: var(--b3-list-background);
        border-radius: 4px;
        
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
            
            .icon {
              color: var(--b3-theme-on-surface);
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
              color: var(--b3-theme-background);
              font-weight: bold;
            }
            
            &.today:not(.completed) {
              color: #f98f7a;
            }
            
            &.not-current-month:not(.completed) {
              color: var(--b3-theme-on-background);
            }
            
            &.not-current-month {
              opacity: 0.3;
            }
            
            .day-number {
              font-size: 14px;
            }
            
            .mood-emoji-large {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 70%;
              height: 70%;
              
              svg {
                width: 100%;
                height: 100%;
              }
            }
          }
        }
      }
    }
    
    .mood-stats-container {
      .mood-stats-title {
        font-size: 14px;
        font-weight: bold;
        color: var(--b3-theme-on-surface);
        margin-bottom: 16px;
        text-align: left;
      }
      
      .mood-stats-chart {
        display: flex;
        justify-content: space-around;
        align-items: flex-end;
        padding: 10px 0;
        
        .mood-stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          
          .mood-stat-emoji {
            width: 20px;
            height: 20px;
            margin-bottom: 4px;
            
            svg {
              width: 100%;
              height: 100%;
            }
          }
          
          .mood-stat-count {
            font-size: 12px;
            font-weight: bold;
            color: var(--b3-theme-on-surface);
            margin-bottom: 4px;
          }
          
          .mood-stat-bar-container {
            width: 20px;
            height: 80px;
            border-radius: 10px;
            overflow: hidden;
            margin-bottom: 4px;
            position: relative;
            
            .mood-stat-bar {
              width: 100%;
              border-radius: 10px;
              position: absolute;
              bottom: 0;
              transition: height 0.5s ease;
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
        font-size: 14px;
        font-weight: bold;
        color: var(--b3-theme-on-surface);
        margin-bottom: 16px;
        text-align: left;
      }
      
      .mood-trend-chart {
        height: 140px;
        position: relative;
        
        svg {
          width: 100%;
          height: 100%;
        }
        
        .trend-grid-line {
          stroke: var(--b3-border-color);
          stroke-width: 1;
          stroke-dasharray: 4 4;
        }
        
        .trend-axis-line {
          stroke: var(--b3-theme-on-surface);
          stroke-width: 1;
        }
        
        .trend-line {
          fill: none;
          stroke: #f98f7a;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        
        .trend-point {
          fill: var(--b3-theme-background);
          stroke: #f98f7a;
          stroke-width: 2;
          cursor: pointer;
          transition: r 0.2s;
          
          &:hover {
            r: 6;
          }
        }
        
        .trend-point.active {
          fill: #f98f7a;
        }
        
        .trend-label {
          font-size: 10px;
          fill: var(--b3-theme-on-surface);
          text-anchor: middle;
        }
        
        .trend-score-label {
          font-size: 10px;
          fill: #f98f7a;
          text-anchor: middle;
          font-weight: bold;
        }
      }
    }
    
    .mood-list-container {
      margin-top: 20px;
      background: var(--b3-list-background);
      border-radius: 8px;
      
      .mood-list-title {
        margin: 0 0 12px 0;
        font-size: 14px;
        font-weight: bold;
        color: var(--b3-theme-on-surface);
      }
      
      .mood-list {
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        
        .mood-list-item {
          display: flex;
          align-items: flex-start;
          padding: 16px 0;
          background: var(--b3-theme-background);
          border-radius: 6px;
          position: relative;
          cursor: pointer;
          transition: background-color 0.2s;
          
          &::before {
            content: '';
            position: absolute;
            top: 0;
            left: 7px;
            height: 100%;
            width: 2px;
            background: radial-gradient(circle at center, var(--b3-theme-on-background) 1px, transparent 1px);
            background-size: 2px 5px;
            background-repeat: repeat-y;
            opacity: 0.3;
          }
          
          .mood-list-date {
            font-size: 14px;
            font-weight: bold;
            color: var(--b3-theme-on-background);
            min-width: 30px;
            position: relative;
            z-index: 1;
            background: var(--b3-theme-background);
          }
          
          .mood-list-content {
            flex: 1;
            display: flex;
            flex-direction: row;
            gap: 8px;
            background-color: var(--b3-list-hover);
            border-radius: 12px;
            margin-top: -8px;
            padding: 8px;
          }
          
          .mood-list-emoji {
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            
            svg {
              width: 100%;
              height: 100%;
            }
          }
          
          .mood-list-note {
            flex: 1;
            font-size: 13px;
            color: var(--b3-theme-on-surface);
            word-break: break-word;
          }
        }
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
</style>
