<template>
  <div class="week-dates">
    <div class="week-dates-header">
      <button
        type="button"
        class="week-dates-nav ariaLabel"
        :aria-label="t('weekView.previousWeek')"
        @click="shiftWeek(-1)"
      >
        <Icon name="chevronLeft" width="16" height="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="week-dates-title ariaLabel"
        :aria-label="t('weekView.today')"
        @click="goToToday"
      >
        {{ displayedMonthLabel }}
      </button>
      <button
        type="button"
        class="week-dates-nav ariaLabel"
        :aria-label="t('weekView.nextWeek')"
        @click="shiftWeek(1)"
      >
        <Icon name="chevronRight" width="16" height="16" aria-hidden="true" />
      </button>
    </div>
    <div class="week-dates-list">
      <div
        v-for="date in displayedWeekDates"
        :key="date.fullDate"
        :class="['week-date-item', 'ariaLabel', { today: date.isToday }]"
        :aria-label="getTooltipLabel(date.fullDate)"
        @click="openMoodTracker(date.fullDate)"
      >
        <span class="weekday-name">{{ date.dayName }}</span>
        <span v-if="moodData[date.fullDate] && moodData[date.fullDate].emoji" class="mood-emoji">
          <div v-html="getSmallMoodSvg(moodData[date.fullDate].emoji)" class="mood-svg-small"></div>
        </span>
        <div class="week-date-number">{{ date.date }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import Icon from '@/components/Icon.vue';
import { useI18n } from '@/composables/useI18n';

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
const { t } = useI18n();
const weekOffset = ref(0);

const parseDate = (date: string): Date => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const displayedWeekDates = computed<DateItem[]>(() => {
  const weekStart = props.weekDates[0] ? parseDate(props.weekDates[0].fullDate) : new Date();
  const today = props.weekDates.find(date => date.isToday)?.fullDate;
  weekStart.setDate(weekStart.getDate() + weekOffset.value * 7);

  return props.weekDates.map((date, index) => {
    const currentDate = new Date(weekStart);
    currentDate.setDate(weekStart.getDate() + index);
    const fullDate = formatDate(currentDate);

    return {
      date: `${currentDate.getDate()}`,
      dayName: date.dayName,
      isToday: fullDate === today,
      fullDate
    };
  });
});

const displayedMonthLabel = computed(() => {
  const referenceDate = displayedWeekDates.value[3]
    ? parseDate(displayedWeekDates.value[3].fullDate)
    : new Date();
  const template = t('date.yearMonthTemplate');

  return template
    .replace(/\{year\}/g, String(referenceDate.getFullYear()))
    .replace(/\{month\}/g, String(referenceDate.getMonth() + 1));
});

const shiftWeek = (amount: number) => {
  weekOffset.value += amount;
};

const goToToday = () => {
  weekOffset.value = 0;
};

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
  display: grid;
  gap: 8px;
  width: 100%;
  min-width: 0;
  container-type: inline-size;
}

.week-dates-header {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) 28px;
  align-items: center;
}

.week-dates-title {
  padding: 0;
  border: 0;
  color: var(--b3-theme-on-background);
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  background: transparent;
  cursor: pointer;
}

.week-dates-title:hover {
  color: var(--b3-theme-primary);
}

.week-dates-nav {
  display: grid;
  width: 28px;
  height: 28px;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: 50%;
  color: var(--b3-theme-on-surface);
  background: transparent;
  cursor: pointer;
}

.week-dates-nav:hover {
  background-color: var(--b3-list-hover);
}

.week-dates-list {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: clamp(2px, 2cqi, 8px);
  min-width: 0;
}

.week-date-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  min-height: clamp(42px, 24cqi, 48px);
  padding: clamp(2px, 3cqi, 6px);
  border-radius: clamp(6px, 5cqi, 10px);
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
  font-size: clamp(9px, 5cqi, 10px);
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
  font-size: clamp(12px, 7cqi, 14px);
  z-index: 1;
  margin-top: 18px;
}

</style>
