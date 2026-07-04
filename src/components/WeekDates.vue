<template>
  <div class="week-dates">
    <div class="ariaLabel" 
      v-for="date in weekDates" 
      :key="date.fullDate"
      :class="['week-date-item', 'ariaLabel', { today: date.isToday }]"
      :aria-label="getTooltipLabel(date.fullDate)"
      @click="openMoodTracker(date.fullDate)">
      <span class="weekday-name">{{ date.dayName }}</span>
      <span v-if="moodData[date.fullDate] && moodData[date.fullDate].emoji" class="mood-emoji">
        <div v-html="getSmallMoodSvg(moodData[date.fullDate].emoji)" class="mood-svg-small"></div>
      </span>
      <div class="week-date-number">{{ date.date }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
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
    timestamp?: string;
    entries?: Array<{
      id: string;
      text: string;
      createdAt: string;
      updatedAt: string;
    }>;
  };
}

interface Props {
  weekDates: DateItem[];
  moodData: MoodData;
  openMoodTracker: (date: string) => void;
  getSmallMoodSvg: (emoji: string) => string;
  emptyTooltipLabel: string;
}

const props = defineProps<Props>();

const getTooltipLabel = (date: string) => {
  const moodEntry = props.moodData[date];
  const records = [
    ...(moodEntry?.note ? [moodEntry.note] : []),
    ...((moodEntry?.entries || []).map(entry => entry.text))
  ].filter(Boolean);

  return records.join('\n') || props.emptyTooltipLabel;
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
  min-height: 48px;
  padding: 6px;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  background-color: var(--b3-list-hover);
  cursor: pointer;
  &:hover{
    box-shadow: inset 0 0 0 100px var(--b3-list-hover);
    background-color: var(--b3-list-hover)
  }
}

.week-date-item > * {
  pointer-events: none;
}

.week-date-item.today {
  position: relative;
  background-color: var(--b3-theme-background);
  box-shadow: var(--b3-border-color) 0px 0px 0 0.5px, rgba(0, 0, 0, 0.05) 0px 1px 2px 0px;
}

.week-date-item.today .weekday-name {
  font-weight: 700;
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
  bottom: -11px;
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
  height: 46px;
}

.mood-svg-small svg {
  width: 100%;
  height: 100%;
}

.week-date-number {
  font-size: 14px;
  z-index: 1;
  margin-top: 18px;
}

</style>
