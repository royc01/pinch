<template>
  <Transition name="fade">
    <div
      v-show="show"
      class="modal-overlay"
      :style="overlayStyle"
      @click.self="emit('close')"
    >
      <Transition name="pop">
        <div class="modal-content" @click.stop v-show="show">
      <div class="modal-header">
        <h3>{{ titleText }}</h3>
        <button
          @click="emit('close')"
          class="icon-button ariaLabel"
         
          :aria-label="t('common.close')"
        >
          <Icon name="close" width="16" height="16" class="icon" />
        </button>
      </div>
      <div class="modal-body" v-if="localHabit">
        <div class="form-group">
          <div class="emoji-selector">
            <SyInput
              v-model="localHabit.emoji"
              :placeholder="t('habitTracker.selectOrInputEmoji')"
              class="emoji-input-hidden"
            />
            <SyButton
              @click.stop="openEmojiPicker"
              type="default"
              size="small"
              class="emoji-picker-btn">
              <span v-if="localHabit.emoji" class="emoji-display">{{ localHabit.emoji }}</span>
              <span v-else>{{ t('habitTracker.selectIcon') }}</span>
            </SyButton>
          </div>
        </div>
        <div class="form-group">
          <label>{{ t('habitTracker.habitName') }}</label>
          <SyInput v-model="localHabit.name" :placeholder="t('habitTracker.habitNamePlaceholder')" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>{{ t('habitTracker.frequency') }}</label>
            <SySelect v-model="localHabit.frequency" :options="frequencyOptions" />
          </div>
          <div class="form-group">
            <label>{{ t('habitTracker.timesPerDay') }}</label>
            <SySelect
              :modelValue="localHabit.timesPerDay?.toString()"
              @update:modelValue="onTimesPerDayChange"
              :options="timesPerDayOptions"
            />
          </div>
        </div>
        <div v-if="localHabit.frequency === 'custom'" class="form-group custom-schedule">
          <label>{{ t('habitTracker.customSchedule') }}</label>
          <SySelect
            :modelValue="localHabit.customSchedule?.type || 'week'"
            @update:modelValue="onCustomScheduleTypeChange"
            :options="customScheduleTypeOptions"
          />
          <SySelect
            v-if="localHabit.customSchedule?.type === 'month' || localHabit.customSchedule?.type === 'year'"
            class="custom-schedule-calendar-select"
            :modelValue="localHabit.customSchedule?.calendar || 'solar'"
            @update:modelValue="onCustomScheduleCalendarChange"
            :options="customScheduleCalendarOptions"
          />
          <div v-if="localHabit.customSchedule?.type === 'week'" class="custom-schedule-grid custom-schedule-grid--week">
            <button
              v-for="day in weekDayOptions"
              :key="day.value"
              type="button"
              :class="['custom-schedule-chip', { selected: isWeekDaySelected(day.value) }]"
              @click="toggleWeekDay(day.value)"
            >
              {{ day.text }}
            </button>
          </div>
          <div v-else-if="localHabit.customSchedule?.type === 'month'" class="custom-schedule-grid custom-schedule-grid--month">
            <button
              v-for="day in monthDayOptions"
              :key="day"
              type="button"
              :class="['custom-schedule-chip', { selected: isMonthDaySelected(day) }]"
              @click="toggleMonthDay(day)"
            >
              {{ formatMonthDayOption(day) }}
            </button>
          </div>
          <div v-else class="custom-schedule-year">
            <div class="custom-schedule-grid custom-schedule-grid--year-months">
              <button
                v-for="month in yearMonthOptions"
                :key="month.value"
                type="button"
                :class="[
                  'custom-schedule-chip',
                  'custom-schedule-chip--month',
                  {
                    selected: selectedYearMonth === month.value,
                    'has-selection': getYearMonthSelectedCount(month.value) > 0
                  }
                ]"
                @click="selectedYearMonth = month.value"
              >
                <span>{{ formatYearMonthOption(month.value) }}</span>
                <span v-if="getYearMonthSelectedCount(month.value) > 0" class="custom-schedule-chip-count">
                  {{ getYearMonthSelectedCount(month.value) }}
                </span>
              </button>
            </div>
            <div class="custom-schedule-grid custom-schedule-grid--year-days">
              <button
                v-for="day in yearDayOptions"
                :key="day.value"
                type="button"
                :class="['custom-schedule-chip', { selected: isYearDaySelected(day.value) }]"
                @click="toggleYearDay(day.value)"
              >
                {{ formatYearDayOption(day.day) }}
              </button>
            </div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>{{ t('habitTracker.completionMode') }}</label>
            <SySelect v-model="localHabit.completionMode" :options="completionModeOptions" />
          </div>
          <div class="form-group">
            <label>{{ t('habitTracker.difficulty') }}</label>
            <SySelect
              v-model="localHabit.difficulty"
              :options="difficultyOptions"
            />
          </div>
        </div>
        
        <div class="form-group">
          <label>
            <SyCheckbox 
              v-model="localHabit.usePomodoro"
              class="pomodoro-checkbox"
            />
            {{ t('habitTracker.enablePomodoro') }}
          </label>
        </div>
        
        <div class="form-group" v-if="localHabit.usePomodoro">
          <label>{{ t('habitTracker.pomodoroDuration') }}</label>
          <SySelect 
            :modelValue="localHabit.pomodoroDuration?.toString()" 
            @update:modelValue="onPomodoroDurationChange"
            :options="pomodoroDurationOptions" 
          />
        </div>
      </div>
      <div class="modal-footer">
        <SyButton @click="handleSubmit" class="confirm-button">{{ buttonText }}</SyButton>
      </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { openEmoji } from 'siyuan';
import Icon from '@/components/Icon.vue';
import SyButton from '@/components/SiyuanTheme/SyButton.vue';
import SyInput from '@/components/SiyuanTheme/SyInput.vue';
import SySelect from '@/components/SiyuanTheme/SySelect.vue';
import SyCheckbox from '@/components/SiyuanTheme/SyCheckbox.vue';
import type { Habit as ApiHabit, HabitCustomScheduleCalendar, HabitCustomScheduleType, HabitDifficulty } from '@/api';

interface Habit extends ApiHabit {
  weeklyGoal?: number;
}

interface NewHabit {
  name: string;
  emoji: string;
  difficulty: HabitDifficulty;
  frequency: string;
  customSchedule?: ApiHabit['customSchedule'];
  completionMode?: 'fixed' | 'atLeast';
  timesPerDay: string | number;
  usePomodoro: boolean;
  pomodoroDuration: string | number;
}

interface Option {
  value: string;
  text: string;
}

interface Props {
  show: boolean;
  mode: 'add' | 'edit';
  habit: Habit | NewHabit | null;
  difficultyOptions: Option[];
  frequencyOptions: Option[];
  completionModeOptions: Option[];
  timesPerDayOptions: Option[];
  pomodoroDurationOptions: Option[];
  t: (key: string) => string;
  overlayStyle?: Record<string, string>;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  submit: [habit: Habit | NewHabit];
}>();

const titleText = computed(() => {
  return props.mode === 'add' ? props.t('habitTracker.addHabit') : props.t('habitTracker.editHabit');
});

const buttonText = computed(() => {
  return props.mode === 'add' ? props.t('common.ok') : props.t('common.save');
});

const localHabit = ref<Habit | NewHabit | null>(null);
const selectedYearMonth = ref(1);

const customScheduleTypeOptions = computed(() => [
  { value: 'week', text: props.t('habitTracker.customScheduleTypeWeek') },
  { value: 'month', text: props.t('habitTracker.customScheduleTypeMonth') },
  { value: 'year', text: props.t('habitTracker.customScheduleTypeYear') }
]);

const customScheduleCalendarOptions = computed(() => [
  { value: 'solar', text: props.t('habitTracker.customScheduleCalendarSolar') },
  { value: 'lunar', text: props.t('habitTracker.customScheduleCalendarLunar') }
]);

const weekDayOptions = computed(() => [
  { value: 1, text: props.t('date.weekdayMonShort') },
  { value: 2, text: props.t('date.weekdayTueShort') },
  { value: 3, text: props.t('date.weekdayWedShort') },
  { value: 4, text: props.t('date.weekdayThuShort') },
  { value: 5, text: props.t('date.weekdayFriShort') },
  { value: 6, text: props.t('date.weekdaySatShort') },
  { value: 0, text: props.t('date.weekdaySunShort') }
]);

const lunarMonthNames = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
const lunarDayNames = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
];

const activeCustomScheduleCalendar = computed<HabitCustomScheduleCalendar>(() =>
  localHabit.value?.customSchedule?.calendar === 'lunar' ? 'lunar' : 'solar'
);

const isLunarCustomSchedule = computed(() => activeCustomScheduleCalendar.value === 'lunar');

const monthDayOptions = computed(() =>
  Array.from({ length: isLunarCustomSchedule.value ? 30 : 31 }, (_, index) => index + 1)
);

const yearMonthOptions = computed(() =>
  Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    return {
      value: month,
      text: `${month}${props.t('date.monthSuffix')}`
    };
  })
);

const yearDayOptions = computed(() =>
  Array.from({ length: isLunarCustomSchedule.value ? 30 : new Date(2024, selectedYearMonth.value, 0).getDate() }, (_, dayIndex) => {
    const month = String(selectedYearMonth.value).padStart(2, '0');
    const day = String(dayIndex + 1).padStart(2, '0');
    return {
      value: `${month}-${day}`,
      day: dayIndex + 1
    };
  })
);

watch(() => props.habit, (newHabit) => {
  if (newHabit) {
    localHabit.value = JSON.parse(JSON.stringify(newHabit));
    ensureCustomSchedule();
    syncSelectedYearMonth();
  }
}, { immediate: true });

watch(() => localHabit.value?.frequency, (frequency) => {
  if (frequency === 'custom') {
    ensureCustomSchedule();
  }
});

function ensureCustomSchedule() {
  if (!localHabit.value) return;
  localHabit.value.customSchedule ||= {
    type: 'week',
    calendar: 'solar',
    weekDays: [1],
    monthDays: [1],
    yearDays: ['01-01']
  };
  localHabit.value.customSchedule.calendar ||= 'solar';
  localHabit.value.customSchedule.weekDays ||= [1];
  localHabit.value.customSchedule.monthDays ||= [1];
  localHabit.value.customSchedule.yearDays ||= ['01-01'];
}

function syncSelectedYearMonth() {
  const firstYearDay = localHabit.value?.customSchedule?.yearDays?.[0];
  const month = firstYearDay ? Number(firstYearDay.slice(0, 2)) : NaN;
  selectedYearMonth.value = month >= 1 && month <= 12 ? month : 1;
}

const updateSelectedList = <T extends string | number>(list: T[] | undefined, value: T): T[] => {
  const source = Array.isArray(list) ? list : [];
  return source.includes(value)
    ? source.filter(item => item !== value)
    : [...source, value].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
};

const onCustomScheduleTypeChange = (value: string | number) => {
  ensureCustomSchedule();
  if (!localHabit.value?.customSchedule) return;
  localHabit.value.customSchedule.type = value as HabitCustomScheduleType;
  if (value === 'year') {
    syncSelectedYearMonth();
  }
};

const onCustomScheduleCalendarChange = (value: string | number) => {
  ensureCustomSchedule();
  if (!localHabit.value?.customSchedule) return;
  localHabit.value.customSchedule.calendar = value === 'lunar' ? 'lunar' : 'solar';
  sanitizeCustomScheduleForCalendar();
};

const isWeekDaySelected = (day: number) => {
  return !!localHabit.value?.customSchedule?.weekDays?.includes(day);
};

const toggleWeekDay = (day: number) => {
  ensureCustomSchedule();
  if (localHabit.value?.customSchedule) {
    localHabit.value.customSchedule.weekDays = updateSelectedList(localHabit.value.customSchedule.weekDays, day);
  }
};

const isMonthDaySelected = (day: number) => {
  return !!localHabit.value?.customSchedule?.monthDays?.includes(day);
};

const toggleMonthDay = (day: number) => {
  ensureCustomSchedule();
  if (localHabit.value?.customSchedule) {
    localHabit.value.customSchedule.monthDays = updateSelectedList(localHabit.value.customSchedule.monthDays, day);
  }
};

const formatMonthDayOption = (day: number) => {
  return isLunarCustomSchedule.value ? lunarDayNames[day - 1] || String(day) : String(day);
};

const formatYearMonthOption = (month: number) => {
  return isLunarCustomSchedule.value ? lunarMonthNames[month - 1] || `${month}${props.t('date.monthSuffix')}` : `${month}${props.t('date.monthSuffix')}`;
};

const formatYearDayOption = (day: number) => {
  return isLunarCustomSchedule.value ? lunarDayNames[day - 1] || String(day) : String(day).padStart(2, '0');
};

const isYearDaySelected = (day: string) => {
  return !!localHabit.value?.customSchedule?.yearDays?.includes(day);
};

const getYearMonthSelectedCount = (month: number) => {
  const prefix = `${String(month).padStart(2, '0')}-`;
  return localHabit.value?.customSchedule?.yearDays?.filter(day => day.startsWith(prefix)).length || 0;
};

const toggleYearDay = (day: string) => {
  ensureCustomSchedule();
  if (localHabit.value?.customSchedule) {
    localHabit.value.customSchedule.yearDays = updateSelectedList(localHabit.value.customSchedule.yearDays, day);
  }
};

const sanitizeCustomScheduleForCalendar = () => {
  const schedule = localHabit.value?.customSchedule;
  if (!schedule || schedule.calendar !== 'lunar') return;
  schedule.monthDays = (schedule.monthDays || []).filter(day => day >= 1 && day <= 30);
  schedule.yearDays = (schedule.yearDays || []).filter((day) => {
    const [, dayValue] = day.split('-').map(part => Number(part));
    return dayValue >= 1 && dayValue <= 30;
  });
  if (schedule.monthDays.length === 0) {
    schedule.monthDays = [1];
  }
  if (schedule.yearDays.length === 0) {
    schedule.yearDays = ['01-01'];
    selectedYearMonth.value = 1;
  }
};

const openEmojiPicker = (event: MouseEvent) => {
  if (!localHabit.value) {
    return;
  }
  const target = event.currentTarget as HTMLElement | null;
  const rect = target ? target.getBoundingClientRect() : null;
  const position = rect
    ? { x: Math.round(rect.left), y: Math.round(rect.bottom) }
    : { x: event.clientX, y: event.clientY };
  openEmoji({
    position,
    selectedCB: (emoji: string) => {
      if (localHabit.value) {
        localHabit.value.emoji = normalizeEmojiValue(emoji);
      }
    },
    hideDynamicIcon: true,
    hideCustomIcon: true
  });
};

const normalizeEmojiValue = (value: string): string => {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) {
    return '';
  }
  if (raw.includes('.') || raw.includes('/')) {
    return raw;
  }
  const hexPattern = /^[0-9a-fA-F]+(-[0-9a-fA-F]+)*$/;
  if (hexPattern.test(raw)) {
    const codePoints = raw.split('-').map(part => parseInt(part, 16));
    if (codePoints.every(point => Number.isFinite(point))) {
      try {
        return String.fromCodePoint(...codePoints);
      } catch {
        return raw;
      }
    }
  }
  return raw;
};

const onTimesPerDayChange = (value: string | number) => {
  if (localHabit.value) {
    localHabit.value.timesPerDay = typeof value === 'string' ? parseInt(value) || 1 : value;
  }
};

const onPomodoroDurationChange = (value: string | number) => {
  if (localHabit.value) {
    localHabit.value.pomodoroDuration = typeof value === 'string' ? parseInt(value) || 25 : value;
  }
};

const handleSubmit = () => {
  if (localHabit.value) {
    if (localHabit.value.frequency === 'custom') {
      ensureCustomSchedule();
      sanitizeCustomScheduleForCalendar();
    }
    emit('submit', localHabit.value);
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  left: var(--modal-overlay-left, 0px);
  top: var(--modal-overlay-top, 0px);
  width: var(--modal-overlay-width, 100vw);
  height: var(--modal-overlay-height, 100dvh);
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  z-index: 2;
}

.modal-content {
  background: var(--b3-theme-background);
  border-radius: 16px;
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.22);
  overflow-y: auto;
  width: min(520px, 100%);
  min-width: 0;
  max-height: calc(100% - 40px);
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .modal-overlay {
    padding: calc(16px + env(safe-area-inset-top, 0px)) 16px calc(16px + env(safe-area-inset-bottom, 0px));
    z-index: 80;
  }

  .modal-content {
    max-height: calc(100dvh - 32px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
}

.pop-enter-active,
.pop-leave-active {
  transition: opacity 0.24s ease, transform 0.24s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateY(18px) scale(0.96);
}

.pop-enter-to,
.pop-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--b3-theme-on-background);
}

.icon-button {
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-button .icon {
  width: 16px;
  height: 16px;
  color: var(--b3-theme-on-background);
  fill: var(--b3-theme-on-background);
}

.icon-button:hover {
  background-color: var(--b3-list-hover);
  border-radius: 4px;
}

.modal-body {
  padding: 0 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.form-row .form-group {
  min-width: 0;
}

.form-group :deep(.b3-select.fn__flex-center) {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-size: 14px;
  color: var(--b3-theme-on-background);
}

.emoji-selector {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.emoji-picker-btn {
  border: none;
  border-radius: 20px;
  height: 80px;
  width: 80px;
  font-size: 14px;
  color: var(--b3-theme-on-surface);
  background-color: var(--b3-list-hover);
  display: flex;
  align-items: center;
  justify-content: center;
}

.emoji-picker-btn .emoji-display {
  font-size: 50px;
  color: inherit;
}

.emoji-picker {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--b3-theme-background);
  border: 1px solid var(--b3-border-color);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 100;
  margin-top: 4px;
  max-height: 50vh;
  overflow-y: auto;
}

.emoji-categories {
}

.emoji-category {
  padding: 8px;
  border-bottom: 1px solid var(--b3-border-color);
}

.emoji-category h4 {
  margin: 0 0 8px 0;
  font-size: 12px;
  color: var(--b3-theme-on-background);
  opacity: 0.7;
}

.emoji-options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(20px, 1fr));
  gap: 4px;
  overflow: hidden;
}

.emoji-option {
  display: inline-block;
  font-size: 20px;
  cursor: pointer;
  border-radius: 4px;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.emoji-option:hover {
  background-color: var(--b3-list-hover);
}

.emoji-nav {
  position: sticky;
  bottom: 0;
  background: var(--b3-theme-background);
  padding: 4px 0;
  border-top: 1px solid var(--b3-border-color);
  display: flex;
  justify-content: space-around;
}

.emoji-nav-item {
  cursor: pointer;
  padding: 4px 8px;
  font-size: 18px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.emoji-nav-item:hover {
  background-color: var(--b3-list-hover);
}

.modal-footer {
  padding: 0px 20px 16px; 
  display: flex;
  justify-content: flex-end;
  gap: 8px;
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

.emoji-input-hidden {
  display: none;
}

.custom-schedule {
  padding: 10px;
  border: 1px solid var(--b3-border-color);
  border-radius: 8px;
  background-color: var(--b3-theme-surface);
}

.custom-schedule-grid {
  display: grid;
  gap: 6px;
  margin-top: 10px;
  max-height: 168px;
  overflow-y: auto;
}

.custom-schedule-calendar-select {
  margin-top: 8px;
}

.custom-schedule-grid--week {
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.custom-schedule-grid--month {
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.custom-schedule-year {
  margin-top: 10px;
}

.custom-schedule-year .custom-schedule-grid {
  margin-top: 0;
}

.custom-schedule-grid--year-months {
  grid-template-columns: repeat(6, minmax(0, 1fr));
  max-height: none;
  overflow: visible;
}

.custom-schedule-grid--year-days {
  grid-template-columns: repeat(7, minmax(0, 1fr));
  margin-top: 8px;
}

.custom-schedule-chip {
  min-width: 0;
  min-height: 28px;
  border: 1px solid var(--b3-border-color);
  border-radius: 6px;
  background-color: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  cursor: pointer;
  font-size: 12px;
}

.custom-schedule-chip--month {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 30px;
}

.custom-schedule-chip.has-selection:not(.selected) {
  border-color: rgba(249, 143, 122, 0.48);
  color: #cf5c4b;
}

.custom-schedule-chip-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  border-radius: 999px;
  background-color: rgba(249, 143, 122, 0.18);
  font-size: 10px;
  line-height: 1;
}

.custom-schedule-chip.selected {
  border-color: #f98f7a;
  background-color: rgba(249, 143, 122, 0.16);
  color: #cf5c4b;
  font-weight: 600;
}

@media (max-width: 420px) {
  .form-row {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .custom-schedule-grid--year-months {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>


