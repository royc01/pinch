<template>
  <div v-if="show" class="focus-timer-panel">
    <div class="timer-header">
      <div class="stats-header-content">
        <div class="stats-title">专注倒计时</div>
        <button @click="handleClose" class="icon-button">
          <Icon name="close" width="16" height="16" class="icon" />
        </button>
      </div>
    </div>
    
    <div class="timer-content">
      <div class="timer-display">
        <div class="timer-circle">
          <svg class="timer-svg" viewBox="0 0 200 200">
            <circle class="timer-bg" cx="100" cy="100" r="90" />
            <circle class="timer-progress" cx="100" cy="100" r="90" 
                    :stroke-dasharray="circumference" 
                    :stroke-dashoffset="strokeDashoffset" />
          </svg>
          <div class="timer-text">
            <div class="time">{{ formattedTime }}</div>
            <div class="mode-label">{{ currentModeLabel }}</div>
          </div>
        </div>
      </div>

      <div class="timer-controls">
        <button v-if="!isRunning" @click="startTimer" class="control-btn start-btn">
          <Icon name="play" width="20" height="20" />
          <span>开始专注</span>
        </button>
        <button v-else @click="pauseTimer" class="control-btn pause-btn">
          <Icon name="pause" width="20" height="20" />
          <span>暂停</span>
        </button>
        <button v-if="isRunning || isPaused" @click="stopTimer" class="control-btn stop-btn">
          <Icon name="stop" width="20" height="20" />
          <span>停止</span>
        </button>
      </div>

      <div class="timer-settings">
        <div class="setting-section">
          <div class="setting-label">
            <span>时长选择</span>
            <span class="duration-value">{{ selectedDuration }}分钟</span>
          </div>
          <div class="duration-slider-container">
            <input type="range" v-model="durationIndex" @input="updateDurationByIndex"
                   min="0" max="6" step="1" class="duration-slider"
                   :disabled="isRunning || isPaused"
                   style="accent-color: var(--b3-theme-on-background)" />
            <div class="duration-marks">
              <span v-for="mark in durationMarks" :key="mark"
                    class="duration-mark">
                {{ mark }}
              </span>
            </div>
          </div>
        </div>

        <div class="setting-section">
          <div class="setting-label">
            <span>短休时长</span>
            <span class="duration-value">{{ shortBreakDuration }}分钟</span>
          </div>
          <div class="duration-slider-container">
            <input type="range" v-model="shortBreakDurationIndex" @input="updateShortBreakDuration"
                   min="0" max="4" step="1" class="duration-slider"
                   :disabled="isRunning || isPaused"
                   style="accent-color: var(--b3-theme-on-background)" />
            <div class="duration-marks">
              <span v-for="mark in shortBreakMarks" :key="mark"
                    class="duration-mark">
                {{ mark }}
              </span>
            </div>
          </div>
        </div>

        <div class="setting-section">
          <div class="setting-label">
            <span>番茄组数</span>
            <span class="duration-value">{{ pomodoroSets }}组</span>
          </div>
          <div class="duration-slider-container">
            <input type="range" v-model="pomodoroSets" @input="updatePomodoroSets"
                   min="1" max="8" step="1" class="duration-slider"
                   :disabled="isRunning || isPaused"
                   style="accent-color: var(--b3-theme-on-background)" />
            <div class="duration-marks">
              <span v-for="mark in pomodoroSetMarks" :key="mark"
                    class="duration-mark">
                {{ mark }}
              </span>
            </div>
          </div>
        </div>

        <div class="setting-section">
          <div class="setting-label">背景音效</div>
          <div class="sound-selector">
            <button v-for="sound in soundOptions" :key="sound.id"
                    @click="selectSound(sound)"
                    :class="['sound-btn', { active: selectedSound.id === sound.id }]">
              <Icon :name="sound.icon" width="20" height="20" />
            </button>
          </div>
          <div class="volume-control" v-if="selectedSound.id !== 'none'">
            <span class="volume-icon">🔊</span>
            <input type="range" v-model="volume" @input="updateVolume" min="0" max="1" step="0.1" class="volume-slider"
                   style="accent-color: var(--b3-theme-on-background)" />
            <span class="volume-value">{{ Math.round(volume * 100) }}%</span>
          </div>
        </div>
      </div>

      <div class="timer-stats" v-if="stats.totalSessions > 0">
        <div class="stat-item">
          <div class="stat-value">{{ stats.totalSessions }}</div>
          <div class="stat-label">总专注次数</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" v-html="formatTotalTime(stats.totalMinutes)"></div>
          <div class="stat-label">总专注时长</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ stats.todaySessions }}</div>
          <div class="stat-label">今日专注</div>
        </div>
      </div>

      <div class="timer-history">
        <div class="calendar-controls">
          <div class="calendar-navigation">
            <button @click="changeMonth(-1)" class="nav-btn">
              <Icon name="left" width="16" height="16" class="icon" />
            </button>
            <span class="current-period">{{ currentMonth.monthName }}</span>
            <button @click="changeMonth(1)" class="nav-btn">
              <Icon name="right" width="16" height="16" class="icon" />
            </button>
          </div>
        </div>
        <div class="calendar-view">
          <div class="month-view">
            <div class="weekdays-header">
              <div v-for="day in ['一', '二', '三', '四', '五', '六', '日']" :key="day" class="weekday">{{ day }}</div>
            </div>
            <div class="month-grid">
              <div v-for="(day, index) in calendarDays" :key="index" 
                   :class="['day', { 
                     'hasdata': day.record && day.record.minutes > 0,
                     'today': day.isToday,
                     'not-current-month': !day.date
                   }]">
                <span class="day-number">{{ day.date ? day.date : '' }}</span>
                <div class="day-duration">
                  {{ day.record && day.record.minutes > 0 ? formatTimeShort(day.record.minutes) : '--' }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import Icon from './Icon.vue';
import { addFocusSession, getFocusStatsSummary, getMonthlyRecords, DailyFocusRecord, FocusStatsSummary } from '@/api';

interface Props {
  show: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: []
}>();

interface Sound {
  id: string;
  name: string;
  emoji: string;
  icon: string;
}
const durationMarks = [5, 10, 15, 25, 30, 45, 60];

const shortBreakMarks = [1, 3, 5, 10, 15];
const pomodoroSetMarks = [1, 2, 3, 4, 5, 6, 7, 8];

const soundOptions: Sound[] = [
  { id: 'none', name: '无音效', emoji: '🔇', icon: 'soundOff' },
  { id: 'rain', name: '雨声', emoji: '🌧️', icon: 'rain' },
  { id: 'jungle', name: '森林', emoji: '🌲', icon: 'jungle' },
  { id: 'waves', name: '海浪', emoji: '🌊', icon: 'waves' },
  { id: 'campfire', name: '篝火', emoji: '�', icon: 'campfire' },
  { id: 'river', name: '河流', emoji: '🏞️', icon: 'river' }
];

const audioFiles: Record<string, string> = {
  rain: '/plugins/pinch/audio/rain.ogg',
  jungle: '/plugins/pinch/audio/jungle.ogg',
  waves: '/plugins/pinch/audio/waves.ogg',
  campfire: '/plugins/pinch/audio/campfire.ogg',
  river: '/plugins/pinch/audio/river.ogg'
};

const selectedDuration = ref<number>(25);
const durationIndex = ref<number>(3);
const shortBreakDurationIndex = ref<number>(2);
const shortBreakDuration = ref<number>(5);
const pomodoroSets = ref<number>(1);
const selectedSound = ref<Sound>(soundOptions[0]);
const remainingTime = ref<number>(25 * 60);
const isRunning = ref<boolean>(false);
const isPaused = ref<boolean>(false);
const timerInterval = ref<number | null>(null);
const audio = ref<HTMLAudioElement | null>(null);
const volume = ref<number>(0.3);
const currentSet = ref<number>(1);
const isBreakMode = ref<boolean>(false);

const stats = ref<FocusStatsSummary>({
  totalSessions: 0,
  totalMinutes: 0,
  todaySessions: 0,
  todayMinutes: 0,
  recentDays: []
});

const currentMonthOffset = ref<number>(0);
const monthlyRecords = ref<DailyFocusRecord[]>([]);

const currentMonth = computed(() => {
  const now = new Date();
  now.setMonth(now.getMonth() + currentMonthOffset.value);
  return {
    year: now.getFullYear(),
    month: now.getMonth(),
    monthName: `${now.getFullYear()}年${now.getMonth() + 1}月`
  };
});

const daysInMonth = computed(() => {
  const { year, month } = currentMonth.value;
  return new Date(year, month + 1, 0).getDate();
});

const firstDayOfMonth = computed(() => {
  const { year, month } = currentMonth.value;
  return new Date(year, month, 1).getDay();
});

const calendarDays = computed(() => {
  const days = [];
  const { year, month } = currentMonth.value;
  
  let firstDay = firstDayOfMonth.value;
  const totalDays = daysInMonth.value;
  
  const firstDayOfWeek = firstDay === 0 ? 6 : firstDay - 1;
  
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push({ date: null, record: null, isToday: false });
  }
  
  for (let day = 1; day <= totalDays; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const record = monthlyRecords.value.find(r => r.date === dateStr);
    
    const today = new Date();
    const isToday = day === today.getDate() && 
                   month === today.getMonth() && 
                   year === today.getFullYear();
    
    days.push({
      date: day,
      record: record || null,
      isToday
    });
  }
  
  return days;
});

const radius = 90;
const circumference = computed(() => 2 * Math.PI * radius);

const strokeDashoffset = computed(() => {
  const totalTime = selectedDuration.value * 60;
  const progress = remainingTime.value / totalTime;
  return circumference.value * progress;
});

const formattedTime = computed(() => {
  const minutes = Math.floor(remainingTime.value / 60);
  const seconds = remainingTime.value % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
});

const currentModeLabel = computed(() => {
  if (isPaused.value) return '已暂停';
  if (isRunning.value) {
    if (isBreakMode.value) {
      return `短休中...`;
    }
    return `专注中 (${currentSet.value}/${pomodoroSets.value})`;
  }
  return '准备开始';
});

const updateDurationByIndex = () => {
  if (isRunning.value || isPaused.value) return;
  selectedDuration.value = durationMarks[durationIndex.value];
  remainingTime.value = selectedDuration.value * 60;
};

const updateShortBreakDuration = () => {
  if (isRunning.value || isPaused.value) return;
  shortBreakDuration.value = shortBreakMarks[shortBreakDurationIndex.value];
};

const updatePomodoroSets = () => {
  if (isRunning.value || isPaused.value) return;
};

const selectSound = (sound: Sound) => {
  selectedSound.value = sound;
  
  if (sound.id === 'none') {
    stopAudio();
  } else if (isRunning.value) {
    playAudio();
  }
};

const playAudio = () => {
  if (selectedSound.value.id === 'none') return;
  
  stopAudio();
  
  audio.value = new Audio(audioFiles[selectedSound.value.id]);
  audio.value.loop = true;
  audio.value.volume = volume.value;
  
  audio.value.play().catch(err => {
    console.error('音频播放失败:', err);
  });
};

const updateVolume = () => {
  if (audio.value) {
    audio.value.volume = volume.value;
  }
};

const stopAudio = () => {
  if (audio.value) {
    audio.value.pause();
    audio.value.currentTime = 0;
    audio.value = null;
  }
};

const startTimer = () => {
  isRunning.value = true;
  isPaused.value = false;
  
  if (!isBreakMode.value) {
    playAudio();
  }
  
  timerInterval.value = window.setInterval(() => {
    remainingTime.value--;
    
    if (remainingTime.value <= 0) {
      completeTimer();
    }
  }, 1000);
};

const pauseTimer = () => {
  isRunning.value = false;
  isPaused.value = true;
  
  stopAudio();
  
  if (timerInterval.value) {
    clearInterval(timerInterval.value);
    timerInterval.value = null;
  }
};

const stopTimer = () => {
  isRunning.value = false;
  isPaused.value = false;
  isBreakMode.value = false;
  currentSet.value = 1;
  remainingTime.value = selectedDuration.value * 60;
  
  stopAudio();
  
  if (timerInterval.value) {
    clearInterval(timerInterval.value);
    timerInterval.value = null;
  }
};

const completeTimer = async () => {
  if (!isBreakMode.value) {
    await addFocusSession(selectedDuration.value);
    
    stats.value.totalSessions++;
    stats.value.totalMinutes += selectedDuration.value;
    stats.value.todaySessions++;
    stats.value.todayMinutes += selectedDuration.value;
    
    if (Notification.permission === 'granted') {
      new Notification('专注完成！', {
        body: `${selectedDuration.value}分钟专注已完成`,
        icon: '🎉'
      });
    }
    
    await loadMonthlyRecords();
    
    if (currentSet.value < pomodoroSets.value && pomodoroSets.value >= 2) {
      if (timerInterval.value) {
        clearInterval(timerInterval.value);
        timerInterval.value = null;
      }
      isBreakMode.value = true;
      remainingTime.value = shortBreakDuration.value * 60;
      currentSet.value++;
      startTimer();
      return;
    }
  } else {
    if (Notification.permission === 'granted') {
      new Notification('短休结束！', {
        body: `开始第 ${currentSet.value} 组专注`,
        icon: '☕'
      });
    }
    if (timerInterval.value) {
      clearInterval(timerInterval.value);
      timerInterval.value = null;
    }
    isBreakMode.value = false;
    remainingTime.value = selectedDuration.value * 60;
    startTimer();
    return;
  }
  
  stopTimer();
};

const formatTotalTime = (minutes: number): string => {
  if (minutes < 60) return `${minutes}<span class="time-unit">m</span>`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}<span class="time-unit">h</span>${mins}<span class="time-unit">m</span>` : `${hours}<span class="time-unit">h</span>`;
};

const formatTimeShort = (minutes: number): string => {
  if (minutes === 0) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
};

const loadStats = async () => {
  try {
    const summary = await getFocusStatsSummary();
    stats.value = summary;
  } catch (error) {
    console.error('加载专注计时器数据失败:', error);
  }
};

const loadMonthlyRecords = async () => {
  try {
    const { year, month } = currentMonth.value;
    const records = await getMonthlyRecords(year, month);
    monthlyRecords.value = records;
  } catch (error) {
    console.error('加载月度记录失败:', error);
  }
};

const changeMonth = (offset: number) => {
  currentMonthOffset.value += offset;
  loadMonthlyRecords();
};

const handleClose = () => {
  if (isRunning.value || isPaused.value) {
    if (confirm('专注进行中，确定要退出吗？')) {
      stopTimer();
      emit('close');
    }
  } else {
    emit('close');
  }
};

onUnmounted(() => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value);
  }
  stopAudio();
});

onMounted(async () => {
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
  
  await loadStats();
  await loadMonthlyRecords();
});
</script>

<style scoped>
.focus-timer-panel {
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
}

.timer-header {
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
  font-weight: bold;
  color: var(--b3-theme-background);
}

.timer-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
  margin: 0 auto;
}

.timer-display {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px 0;
}

.timer-circle {
  position: relative;
  width: 200px;
  height: 200px;
}

.timer-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.timer-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.2);
  stroke-width: 14;
}

.timer-progress {
  fill: none;
  stroke: #ffcb4c;
  stroke-width: 14;
  stroke-linecap: round;
  transition: stroke-dashoffset 1s linear;
}

.timer-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.time {
  font-size: 48px;
  font-weight: bold;
  color: var(--b3-theme-background);
}

.mode-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.timer-controls {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.control-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: 24px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 140px;
  justify-content: center;
  color: var(--b3-theme-background);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  &:active {
    transform: translateY(0);
  }
}

.start-btn {
  background: linear-gradient(135deg, #ffcb4c, #fcd07d);
}

.pause-btn {
  background: linear-gradient(135deg, #f98f7a, #fca07a);
}

.stop-btn {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
}

.timer-settings {
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: var(--b3-theme-background);
  border-radius: 20px;
  padding: 20px;
  width: 100%;
  box-sizing: border-box;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.setting-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setting-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--b3-theme-on-surface);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.duration-value {
  font-weight: bold;
  color: #f98f7a;
}

.sound-selector {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
}

.duration-slider-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.duration-slider {
  width: 100%;
  height: 3px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--b3-border-color);
  border-radius: 3px;
  outline: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    background: #ffcb4c!;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      transform: scale(1.2);
      background: #f9d77a;
    }
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;

    &::-webkit-slider-thumb {
      background: var(--b3-border-color);
    }
  }
}

.duration-marks {
  display: flex;
  justify-content: space-between;
  padding: 0 2px;
}

.duration-mark {
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  opacity: 0.6;
  transition: all 0.2s;
}

.sound-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px;
  border: none;
  background: var(--b3-list-hover);
  border-radius: 12px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--b3-theme-on-background);
  flex: 1;
  aspect-ratio: 1;

  &.active {
    background: var(--b3-theme-on-background);
    color: var(--b3-theme-background);
  }
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding: 12px;
  background: var(--b3-list-background);
  border-radius: 12px;
}

.volume-icon {
  font-size: 18px;
  min-width: 20px;
}

.volume-slider {
  flex: 1;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--b3-border-color);
  border-radius: 3px;
  outline: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    background: #f98f7a;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      transform: scale(1.1);
      background: #f87a6a;
    }
  }

  &::-moz-range-thumb {
    width: 18px;
    height: 18px;
    background: #f98f7a;
    border-radius: 50%;
    cursor: pointer;
    border: none;
    transition: all 0.2s;

    &:hover {
      transform: scale(1.1);
      background: #f87a6a;
    }
  }
}

.volume-value {
  min-width: 45px;
  text-align: right;
  font-size: 14px;
  font-weight: 500;
  color: var(--b3-theme-on-surface);
}

.timer-stats {
  display: flex;
  justify-content: space-around;
  background: var(--b3-theme-background);
  border-radius: 20px;
  padding: 20px;
  width: 100%;
  box-sizing: border-box;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: var(--b3-theme-on-background);
}
.time-unit{
  font-size: 0.6em;
  opacity: 0.7;
  margin-left: 2px;
}
.stat-label {
  font-size: 12px;
  color: var(--b3-theme-on-surface);
}

.timer-history {
  background-color: var(--b3-theme-background);
  padding: 16px 16px 8px 16px;
  border-radius: 24px;
  box-shadow: rgba(0, 0, 0, 0.06) 0px 1px 5px 0px;
  width: 100%;
  box-sizing: border-box;
}

.calendar-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 16px;
  padding: 8px;
  background: var(--b3-list-background);
  border-radius: 4px;
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

    .icon {
      width: 16px;
      height: 16px;
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
    gap: 4px;
    font-size: 12px;
  }

  .month-view {
    .month-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
    }
  }

  .day {
    position: relative;
    aspect-ratio: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 30%;
    background: var(--b3-list-hover);
    cursor: default;
    font-weight: 600;
    transition: background-color 0.2s;
    padding: 2px;
    color: var(--b3-theme-on-surface);

    &.hasdata {
      background: var(--b3-theme-on-background);
      color: var(--b3-theme-background);
    }

    &.today:not(.hasdata) {
      color: #f98f7a;
    }

    &.not-current-month {
      opacity: 0;
    }

    .day-number {
      font-size: 14px;
      flex-shrink: 0;
    }

    .day-duration {
      font-size: 10px;
      font-weight: 600;
      flex-shrink: 0;
    }
  }
  
}
.icon-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;

  .icon {
    color: var(--b3-theme-background);
  }
}
</style>

<style>
.time-unit {
  font-size: 0.6em;
  opacity: 0.7;
  margin:0 2px;
  vertical-align: baseline;
}
</style>
