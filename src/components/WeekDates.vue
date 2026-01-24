<template>
  <div class="week-dates">
    <div 
      v-for="date in weekDates" 
      :key="date.fullDate"
      :class="['week-date-item', { today: date.isToday }]"
      @mouseenter="showCustomTooltip(date.fullDate, $event)"
      @mouseleave="hideCustomTooltip"
      @click="openMoodTracker(date.fullDate)">
      <span class="weekday-name">{{ date.dayName }}</span>
      <span v-if="moodData[date.fullDate] && moodData[date.fullDate].emoji" class="mood-emoji">
        <div v-html="getSmallMoodSvg(moodData[date.fullDate].emoji)" class="mood-svg-small"></div>
      </span>
      <div class="week-date-number">{{ date.date }}</div>
    </div>
    <div v-if="tooltipVisible && tooltipContent" 
         class="custom-tooltip" 
         :style="tooltipStyle">
      {{ tooltipContent }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface DateItem {
  date: string;
  dayName: string;
  isToday: boolean;
  fullDate: string;
}

interface MoodData {
  [key: string]: {
    emoji: string;
    note?: string;
  };
}

interface Props {
  weekDates: DateItem[];
  moodData: MoodData;
  openMoodTracker: (date: string) => void;
  getSmallMoodSvg: (emoji: string) => string;
}

const props = defineProps<Props>();

const tooltipVisible = ref(false);
const tooltipContent = ref('');
const tooltipStyle = ref({
  top: '0px',
  left: '0px'
});

const showCustomTooltip = (date: string, event: MouseEvent) => {
  const moodEntry = props.moodData[date];
  if (moodEntry?.note) {
    tooltipContent.value = moodEntry.note;
    tooltipVisible.value = true;
    tooltipStyle.value = {
      top: event.clientY + 10 + 'px',
      left: event.clientX + 10 + 'px'
    };
  }
};

const hideCustomTooltip = () => {
  tooltipVisible.value = false;
  tooltipContent.value = '';
};
</script>

<style scoped>
.week-dates {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin: 8px 0;
}

.week-date-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 38px;
  padding: 10px 6px;
  border-radius: 14px;
  background-color: var(--b3-theme-background);
  box-shadow: rgba(0, 0, 0, 0.03) 0px 1px 5px 0px;
  overflow: hidden;
  position: relative;
}

.week-date-item.today {
  position: relative;
}

.week-date-item.today .weekday-name {
  color: #f98f7a;
}

.weekdate-item .weekday-name {
  font-size: 10px;
  color: var(--b3-scroll-color);
  margin-bottom: 4px;
}

.mood-emoji {
  font-size: 16px;
  margin-bottom: 4px;
}

.weekday-name {
  font-size: 10px;
  position: relative;
}

.weekday-name::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 0;
  right: 0;
  height: 1px;
  background-color: var(--b3-border-color);
}

.week-date-item .mood-emoji {
  position: absolute;
  bottom: -12px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 0;
  opacity: 0.7;
}

.mood-svg-small {
  width: 50px;
  height: 50px;
}

.mood-svg-small svg {
  width: 100%;
  height: 100%;
}

.week-date-number {
  font-size: 14px;
  font-weight: 600;
  z-index: 1;
  margin-top: 15px;
}

.custom-tooltip {
  position: fixed;
  background-color: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  max-width: 300px;
  word-wrap: break-word;
  z-index: 1000;
  pointer-events: none;
  backdrop-filter: blur(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
</style>
