<template>
  <Teleport to="body" :disabled="!floating">
    <div
      v-if="visible"
      :class="floating ? 'date-popover-overlay' : 'date-popover-inline-wrapper'"
      @mousedown="handleOverlayMouseDown"
    >
      <div
        ref="popoverRef"
        :class="[
          'date-popover',
          {
            'date-popover-inline': !floating,
            'date-popover-detailed': showTaskEditorDetails
          }
        ]"
        :style="floating ? popoverStyle : undefined"
        @mousedown.stop
        @click.stop
      >
        <div class="date-popover-header">
          <button type="button" class="date-nav-btn ariaLabel" :aria-label="t('date.previousMonth')" @click="shiftMonth(-1)">
            <Icon name="chevronRight" width="16" height="16" class="icon flip" />
          </button>
          <div class="date-popover-title">{{ monthLabel }}</div>
          <button type="button" class="date-nav-btn ariaLabel" :aria-label="t('date.nextMonth')" @click="shiftMonth(1)">
            <Icon name="chevronRight" width="16" height="16" class="icon" />
          </button>
        </div>

        <div class="date-popover-quick">
          <template v-if="quickMode === 'goal'">
            <button type="button" class="date-quick-btn" @click="applyQuickDate('thisWeek')">{{ t('taskManager.thisWeek') }}</button>
            <button type="button" class="date-quick-btn" @click="applyQuickDate('thisMonth')">{{ t('taskManager.thisMonth') }}</button>
            <button type="button" class="date-quick-btn" @click="applyQuickDate('thisYear')">{{ t('date.thisYear') }}</button>
          </template>
          <template v-else>
            <button type="button" class="date-quick-btn" @click="applyQuickDate('today')">{{ t('taskManager.today') }}</button>
            <button type="button" class="date-quick-btn" @click="applyQuickDate('tomorrow')">{{ t('date.tomorrow') }}</button>
            <button type="button" class="date-quick-btn" @click="applyQuickDate('weekend')">{{ t('date.thisWeekend') }}</button>
            <button type="button" class="date-quick-btn" @click="applyQuickDate('nextMonday')">{{ t('date.nextMonday') }}</button>
          </template>
          <button type="button" class="date-quick-btn danger" @click="clearSelection">{{ t('taskManager.clear') }}</button>
        </div>

        <div class="date-popover-weekdays">
          <span v-for="day in weekDayLabels" :key="day">{{ day }}</span>
        </div>

        <div class="date-popover-grid">
          <button
            v-for="day in calendarDays"
            :key="day.key"
            type="button"
            class="date-popover-day"
            :class="{
              'is-outside': !day.inMonth,
              'is-today': day.isToday,
              'is-selected': day.isSelected
            }"
            @click="selectDate(day.dateStr)"
          >
            {{ day.label }}
          </button>
        </div>

        <div v-if="showTaskEditorDetails" class="date-popover-detail">
          <div class="date-popover-detail-divider"></div>
          <div class="date-popover-detail-grid">
            <div class="date-popover-field">
              <label>{{ t('taskManager.startDate') }}</label>
              <div class="date-popover-input-group">
                <input
                  ref="startDateInputRef"
                  :value="startDate"
                  type="date"
                  @input="handleDateFieldInput('update:startDate', $event)"
                />
                <button
                  type="button"
                  class="date-popover-input-trigger ariaLabel"
                 
                  :aria-label="t('taskManager.pickStartDate')"
                  @click="openInputPicker(startDateInputRef)"
                >
                  <Icon name="calendar" width="14" height="14" />
                </button>
              </div>
            </div>

            <div class="date-popover-field">
              <label>{{ t('taskManager.dueDate') }}</label>
              <div class="date-popover-input-group">
                <input
                  ref="dueDateInputRef"
                  :value="modelValue"
                  type="date"
                  @input="handleModelValueInput"
                />
                <button
                  type="button"
                  class="date-popover-input-trigger ariaLabel"
                 
                  :aria-label="t('taskManager.pickDueDate')"
                  @click="openInputPicker(dueDateInputRef)"
                >
                  <Icon name="calendar" width="14" height="14" />
                </button>
              </div>
            </div>

            <div class="date-popover-field">
              <label>{{ t('taskManager.startTime') }}</label>
              <div class="date-popover-input-group">
                <input
                  ref="startTimeInputRef"
                  :value="startTime"
                  type="time"
                  @input="handleDateFieldInput('update:startTime', $event)"
                />
                <button
                  type="button"
                  class="date-popover-input-trigger ariaLabel"
                 
                  :aria-label="t('taskManager.pickStartTime')"
                  @click="openInputPicker(startTimeInputRef)"
                >
                  <Icon name="clock" width="14" height="14" />
                </button>
              </div>
            </div>

            <div class="date-popover-field">
              <label>{{ t('taskManager.dueTime') }}</label>
              <div class="date-popover-input-group">
                <input
                  ref="dueTimeInputRef"
                  :value="dueTime"
                  type="time"
                  @input="handleDateFieldInput('update:dueTime', $event)"
                />
                <button
                  type="button"
                  class="date-popover-input-trigger ariaLabel"
                 
                  :aria-label="t('taskManager.pickDueTime')"
                  @click="openInputPicker(dueTimeInputRef)"
                >
                  <Icon name="clock" width="14" height="14" />
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </Teleport>

</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import Icon from '@/components/Icon.vue';
import { useI18n } from '@/composables/useI18n';

type DateQuickKey = 'today' | 'tomorrow' | 'weekend' | 'nextMonday' | 'thisWeek' | 'thisMonth' | 'thisYear';
type TaskDateFields = {
  startDate: string;
  startTime: string;
  dueDate: string;
  dueTime: string;
};
type CalendarDay = {
  key: string;
  label: number;
  dateStr: string;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
};

const props = withDefaults(defineProps<{
  modelValue: string;
  visible: boolean;
  floating?: boolean;
  anchorEl?: HTMLElement | null;
  autoClose?: boolean;
  showTaskEditorDetails?: boolean;
  startDate?: string;
  startTime?: string;
  dueTime?: string;
  quickMode?: 'default' | 'goal';
}>(), {
  floating: true,
  autoClose: true,
  showTaskEditorDetails: false,
  startDate: '',
  startTime: '',
  dueTime: '',
  quickMode: 'default'
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'update:dateFields': [value: TaskDateFields];
  'update:startDate': [value: string];
  'update:startTime': [value: string];
  'update:dueTime': [value: string];
  close: [];
}>();

const popoverRef = ref<HTMLElement | null>(null);
const popoverStyle = ref<Record<string, string>>({});
const monthCursor = ref(new Date());
const startDateInputRef = ref<HTMLInputElement | null>(null);
const dueDateInputRef = ref<HTMLInputElement | null>(null);
const startTimeInputRef = ref<HTMLInputElement | null>(null);
const dueTimeInputRef = ref<HTMLInputElement | null>(null);
const { t } = useI18n();
const weekDayLabels = [
  t('taskRepeat.weekdayMonShort'),
  t('taskRepeat.weekdayTueShort'),
  t('taskRepeat.weekdayWedShort'),
  t('taskRepeat.weekdayThuShort'),
  t('taskRepeat.weekdayFriShort'),
  t('taskRepeat.weekdaySatShort'),
  t('taskRepeat.weekdaySunShort')
];
const showTaskEditorDetails = computed(() => props.showTaskEditorDetails);

const monthLabel = computed(() => {
  const cursor = monthCursor.value;
  return `${cursor.getFullYear()}${t('date.yearMonthSeparator')}${cursor.getMonth() + 1}${t('date.monthSuffix')}`;
});

const calendarDays = computed<CalendarDay[]>(() => {
  const cursor = monthCursor.value;
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstWeekday = (firstDay.getDay() + 6) % 7; // Monday as first column
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const selected = props.modelValue;
  const todayStr = formatDateInput(new Date());
  const days: CalendarDay[] = [];

  for (let i = firstWeekday; i > 0; i--) {
    const day = daysInPrevMonth - i + 1;
    const date = new Date(year, month - 1, day);
    const dateStr = formatDateInput(date);
    days.push({
      key: `${dateStr}-prev`,
      label: day,
      dateStr,
      inMonth: false,
      isToday: dateStr === todayStr,
      isSelected: selected === dateStr
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = formatDateInput(date);
    days.push({
      key: dateStr,
      label: day,
      dateStr,
      inMonth: true,
      isToday: dateStr === todayStr,
      isSelected: selected === dateStr
    });
  }

  let nextDay = 1;
  while (days.length < 42) {
    const date = new Date(year, month + 1, nextDay);
    const dateStr = formatDateInput(date);
    days.push({
      key: `${dateStr}-next`,
      label: nextDay,
      dateStr,
      inMonth: false,
      isToday: dateStr === todayStr,
      isSelected: selected === dateStr
    });
    nextDay += 1;
  }

  return days;
});

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getWeekendDate(base: Date): Date {
  const day = base.getDay(); // 0 (Sun) - 6 (Sat)
  const delta = (6 - day + 7) % 7;
  return addDays(base, delta);
}

function getNextMondayDate(base: Date): Date {
  const day = base.getDay(); // 0 (Sun) - 6 (Sat)
  const delta = (8 - day) % 7 || 7;
  return addDays(base, delta);
}

function getThisWeekEndDate(base: Date): Date {
  const day = base.getDay();
  const delta = day === 0 ? 0 : 7 - day;
  return addDays(base, delta);
}

function getThisMonthEndDate(base: Date): Date {
  return new Date(base.getFullYear(), base.getMonth() + 1, 0);
}

function getThisYearEndDate(base: Date): Date {
  return new Date(base.getFullYear(), 11, 31);
}


function updatePopoverPosition(): void {
  if (!props.floating) return;
  const anchor = props.anchorEl;
  const popover = popoverRef.value;
  if (!anchor || !popover) return;
  const anchorRect = anchor.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();
  const margin = 12;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  let left = anchorRect.left;
  let top = anchorRect.bottom + 8;

  if (left + popoverRect.width > viewportWidth - margin) {
    left = viewportWidth - margin - popoverRect.width;
  }
  if (left < margin) left = margin;

  if (top + popoverRect.height > viewportHeight - margin) {
    top = anchorRect.top - popoverRect.height - 8;
  }
  if (top < margin) top = margin;

  popoverStyle.value = {
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`
  };
}

function shiftMonth(delta: number): void {
  const cursor = monthCursor.value;
  monthCursor.value = new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1);
}

function emitSelection(dateStr: string): void {
  emit('update:modelValue', dateStr);
  if (props.autoClose) {
    emit('close');
  }
}

function handleModelValueInput(event: Event): void {
  const target = event.target as HTMLInputElement | null;
  emit('update:modelValue', target?.value ?? '');
}

function handleDateFieldInput(
  eventName: 'update:startDate' | 'update:startTime' | 'update:dueTime',
  event: Event
): void {
  const target = event.target as HTMLInputElement | null;
  const value = target?.value ?? '';
  if (eventName === 'update:startDate') {
    emit('update:startDate', value);
    return;
  }
  if (eventName === 'update:startTime') {
    emit('update:startTime', value);
    return;
  }
  emit('update:dueTime', value);
}

function openInputPicker(inputRef: { value: HTMLInputElement | null } | HTMLInputElement | null): void {
  const input = inputRef instanceof HTMLInputElement ? inputRef : inputRef?.value || null;
  if (!input) {
    return;
  }
  input.focus({ preventScroll: true });
  const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
  if (typeof pickerInput.showPicker === 'function') {
    try {
      pickerInput.showPicker();
      return;
    } catch {
    }
  }
  input.click();
}

function selectDate(dateStr: string): void {
  emitSelection(dateStr);
}

function clearSelection(): void {
  if (showTaskEditorDetails.value) {
    emit('update:dateFields', {
      startDate: '',
      startTime: '',
      dueDate: '',
      dueTime: ''
    });
    if (props.autoClose) {
      emit('close');
    }
    return;
  }
  emitSelection('');
}

function applyQuickDate(key: DateQuickKey): void {
  const base = getStartOfDay(new Date());
  let target = base;

  if (key === 'tomorrow') {
    target = addDays(base, 1);
  } else if (key === 'weekend') {
    target = getWeekendDate(base);
  } else if (key === 'nextMonday') {
    target = getNextMondayDate(base);
  } else if (key === 'thisWeek') {
    target = getThisWeekEndDate(base);
  } else if (key === 'thisMonth') {
    target = getThisMonthEndDate(base);
  } else if (key === 'thisYear') {
    target = getThisYearEndDate(base);
  }

  emitSelection(formatDateInput(target));
}

function handleOverlayMouseDown(): void {
  if (props.floating) {
    emit('close');
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if (!props.visible || !props.floating) {
    return;
  }
  if (event.key === 'Escape') {
    emit('close');
  }
}

function handleResize(): void {
  if (props.visible && props.floating) {
    updatePopoverPosition();
  }
}

watch(
  () => [props.visible, props.modelValue, props.floating, props.anchorEl],
  ([visible]) => {
    if (!visible) return;
    const base = props.modelValue ? new Date(props.modelValue) : new Date();
    if (!Number.isNaN(base.getTime())) {
      monthCursor.value = new Date(base.getFullYear(), base.getMonth(), 1);
    }
    if (props.floating) {
      void nextTick(updatePopoverPosition);
    }
  },
  { immediate: true }
);

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped>
.date-popover-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: transparent;
}

.date-popover-inline-wrapper {
  position: relative;
}

.date-popover {
  position: fixed;
  width: 280px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--b3-theme-border);
  background: var(--b3-theme-background);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-sizing: border-box;
}

.date-popover-detailed {
  width: min(92vw, 300px);
}

.date-popover-inline {
  position: relative;
  width: 100%;
  max-width: 320px;
  box-shadow: none;
  padding: 0;
}

.date-popover-inline.date-popover-detailed {
  max-width: 360px;
}

.date-popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.date-popover-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--b3-theme-on-background);
}

.date-nav-btn {
  border: none;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  width: 26px;
  height: 26px;
  border-radius: 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.date-nav-btn .icon.flip {
  transform: rotate(180deg);
}

.date-popover-quick {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.date-quick-btn {
  border: none;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-surface);
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.date-quick-btn:hover {
  color: var(--b3-theme-on-background);
}

.date-quick-btn.danger {
  background: rgba(237, 97, 84, 0.14);
  color: #c24d3f;
}

.date-popover-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  font-size: 11px;
  color: var(--b3-theme-on-surface);
  text-align: center;
}

.date-popover-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.date-popover-detail {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.date-popover-detail-divider {
  height: 1px;
  background: var(--b3-theme-border);
  opacity: 0.7;
}

.date-popover-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 12px;
}

.date-popover-field {
  min-width: 0;
}

.date-popover-field label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  opacity: 0.85;
  line-height: 1.2;
}

.date-popover-input-group {
  position: relative;
}

.date-popover-input-group input[type="date"],
.date-popover-input-group input[type="time"] {
  width: 100%;
  box-sizing: border-box;
  appearance: none;
  -webkit-appearance: none;
  padding: 6px 34px 6px 10px;
  border: none;
  border-radius: 8px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  font-size: 12px;
  outline: none;
}

.date-popover-input-group input[type="date"]:focus,
.date-popover-input-group input[type="time"]:focus {
  box-shadow: inset 0 0 0 1px rgba(249, 143, 122, 0.45);
}

.date-popover-input-group input[type="date"]::-webkit-calendar-picker-indicator,
.date-popover-input-group input[type="time"]::-webkit-calendar-picker-indicator,
.date-popover-input-group input[type="date"]::-webkit-clear-button,
.date-popover-input-group input[type="date"]::-webkit-inner-spin-button,
.date-popover-input-group input[type="time"]::-webkit-clear-button,
.date-popover-input-group input[type="time"]::-webkit-inner-spin-button {
  opacity: 0;
  pointer-events: none;
  width: 0;
  margin: 0;
  display: none;
}

.date-popover-input-trigger {
  position: absolute;
  top: 50%;
  right: 4px;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--b3-theme-on-background);
  cursor: pointer;
  transform: translateY(-50%);
  transition: color 0.15s ease, background-color 0.15s ease;
}

.date-popover-input-trigger:hover {
  color: var(--b3-theme-primary);
  background: var(--b3-theme-background);
}

.date-popover-input-trigger svg {
  flex: 0 0 auto;
  fill: currentColor;
}

.date-popover-day {
  border: none;
  background: transparent;
  border-radius: 8px;
  padding: 6px 0;
  font-size: 12px;
  color: var(--b3-theme-on-background);
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s, box-shadow 0.15s;
}

.date-popover-day.is-outside {
  color: var(--b3-theme-on-surface);
  opacity: 0.5;
}

.date-popover-day.is-today {
  box-shadow: inset 0 0 0 1px rgba(249, 143, 122, 0.5);
}

.date-popover-day.is-selected {
  background: var(--pinch-background3);
  color: var(--pinch-font-color3);
}

.date-popover-day:hover {
  background: var(--b3-list-hover);
}

.date-popover-repeat-section {
  padding-top: 2px;
}

</style>
