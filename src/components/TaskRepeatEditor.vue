<template>
  <div class="task-repeat-editor" v-bind="$attrs">
    <div v-if="!embeddedCustom" class="repeat-edit-row">
      <label>{{ t('taskRepeat.frequency') }}</label>
      <SySelect
        class="repeat-frequency-select"
        :model-value="normalizedRepeatFrequency"
        :options="repeatFrequencyOptions"
        @update:model-value="handleRepeatFrequencyUpdate"
      />
      <button
        v-if="normalizedRepeatFrequency === 'custom'"
        type="button"
        class="repeat-custom-edit ariaLabel"
        :aria-label="t('taskRepeat.editCustomRepeat')"
        @click="openCustomRepeatDialog"
      >
        <Icon name="moreVertical" width="16" height="16" />
      </button>
    </div>
    <div v-if="!embeddedCustom && normalizedRepeatFrequency === 'custom'" class="repeat-rule-summary">
      {{ repeatRuleSummary }}
    </div>
  </div>

  <Teleport to="body" :disabled="embeddedCustom">
    <div
      v-if="showCustomRepeatDialog || embeddedCustom"
      :class="['repeat-dialog-overlay', { 'is-embedded': embeddedCustom }]"
      @mousedown.stop
      @click.self="closeCustomRepeatDialog"
    >
      <div class="repeat-dialog" @mousedown.stop @click.stop>
        <div v-if="!embeddedCustom" class="repeat-dialog-header">
          <div class="repeat-dialog-title">{{ t('taskRepeat.customRepeat') }}</div>
          <button
            type="button"
            class="repeat-dialog-close ariaLabel"
           
            :aria-label="t('common.close')"
            @click.stop="closeCustomRepeatDialog"
          >
            <Icon name="close" width="16" height="16" />
          </button>
        </div>

        <div
          :class="[
            'repeat-dialog-body',
            { 'form-group': embeddedCustom, 'custom-schedule': embeddedCustom }
          ]"
        >
           <label v-if="embeddedCustom" class="custom-schedule-label">{{ t('taskRepeat.frequency') }}</label>
           <div :class="['repeat-dialog-row', { 'custom-schedule-frequency-row': embeddedCustom }]">
             <label v-if="!embeddedCustom">{{ t('taskRepeat.everyInterval') }}</label>
             <span v-else class="custom-schedule-every-prefix">{{ t('taskRepeat.every') }}</span>
             <input v-model.number="customRepeatDraft.interval" type="number" min="1" max="999" />
             <SySelect
               class="repeat-dialog-select"
               :model-value="customRepeatDraft.unit"
               :options="repeatUnitOptions"
               @update:model-value="handleCustomRepeatUnitUpdate"
             />
             <SySelect
               v-if="embeddedCustom && (customRepeatDraft.unit === 'month' || customRepeatDraft.unit === 'year')"
               class="custom-schedule-calendar-select"
               :model-value="customRepeatDraft.calendar"
               :options="repeatCalendarOptions"
               @update:model-value="handleCustomRepeatCalendarUpdate"
             />
           </div>

          <div v-if="customRepeatDraft.unit === 'week'" :class="['repeat-weekday-grid', { 'custom-schedule-grid custom-schedule-grid--week': embeddedCustom }]">
            <button
              v-for="day in weekDayOptions"
              :key="day.value"
              type="button"
              :class="[
                embeddedCustom ? 'custom-schedule-chip' : 'repeat-weekday',
                { selected: customRepeatDraft.weekDays.includes(day.value) }
              ]"
              @click="toggleCustomWeekDay(day.value)"
            >
              {{ day.label }}
            </button>
          </div>

           <SySelect
             v-if="!embeddedCustom && (customRepeatDraft.unit === 'month' || customRepeatDraft.unit === 'year')"
             class="custom-schedule-calendar-select"
            :model-value="customRepeatDraft.calendar"
            :options="repeatCalendarOptions"
            @update:model-value="handleCustomRepeatCalendarUpdate"
          />

          <div v-if="customRepeatDraft.unit === 'month'" class="custom-schedule-grid custom-schedule-grid--month">
            <button
              v-for="day in customMonthDayOptions"
              :key="day"
              type="button"
              :class="['custom-schedule-chip', { selected: customRepeatDraft.monthDays.includes(day) }]"
              @click="toggleCustomMonthDay(day)"
            >
              {{ formatCustomMonthDay(day) }}
            </button>
          </div>
          <div v-if="customRepeatDraft.unit === 'month'" class="repeat-month-window">
            <label><input v-model="customRepeatDraft.useMonthWindow" type="checkbox" /> {{ t('taskRepeat.monthlyWindow') }}</label>
            <div v-if="customRepeatDraft.useMonthWindow" class="repeat-month-window-inputs">
              <input v-model.number="customRepeatDraft.windowStartDay" type="number" min="1" max="31" />
              <span>–</span>
              <input v-model.number="customRepeatDraft.windowEndDay" type="number" min="1" max="31" />
            </div>
            <small v-if="customRepeatDraft.useMonthWindow">{{ t('taskRepeat.monthlyWindowHint') }}</small>
          </div>

          <div v-if="customRepeatDraft.unit === 'year'" class="custom-schedule-year">
            <div class="custom-schedule-grid custom-schedule-grid--year-months">
              <button
                v-for="month in customYearMonthOptions"
                :key="month.value"
                type="button"
                :class="[
                  'custom-schedule-chip',
                  'custom-schedule-chip--month',
                  { selected: selectedCustomYearMonth === month.value, 'has-selection': getCustomYearMonthSelectedCount(month.value) > 0 }
                ]"
                @click="selectedCustomYearMonth = month.value"
              >
                <span>{{ formatCustomYearMonth(month.value) }}</span>
                <span v-if="getCustomYearMonthSelectedCount(month.value) > 0" class="custom-schedule-chip-count">
                  {{ getCustomYearMonthSelectedCount(month.value) }}
                </span>
              </button>
            </div>
            <div class="custom-schedule-grid custom-schedule-grid--year-days">
              <button
                v-for="day in customYearDayOptions"
                :key="day.value"
                type="button"
                :class="['custom-schedule-chip', { selected: customRepeatDraft.yearDays.includes(day.value) }]"
                @click="toggleCustomYearDay(day.value)"
              >
                {{ formatCustomMonthDay(day.day) }}
              </button>
            </div>
          </div>

          <div v-if="embeddedCustom" class="repeat-custom-termination">
            <label>{{ t('taskRepeat.termination') }}</label>
            <div class="repeat-custom-termination-options">
              <button type="button" :class="{ selected: customTerminationDraft.type === 'never' }" @click="customTerminationDraft = { type: 'never' }">{{ t('taskRepeat.neverEnds') }}</button>
              <button type="button" :class="{ selected: customTerminationDraft.type === 'count' }" @click="customTerminationDraft = { type: 'count', count: 1 }">{{ t('taskRepeat.repeatCount') }}</button>
              <button type="button" :class="{ selected: customTerminationDraft.type === 'date' }" @click="customTerminationDraft = { type: 'date', date: formatDateValue(getDraftBaseDate()) }">{{ t('taskRepeat.untilDate') }}</button>
            </div>
            <input v-if="customTerminationDraft.type === 'count'" v-model.number="customTerminationDraft.count" class="repeat-custom-termination-input" type="number" min="1" max="9999" />
            <input v-if="customTerminationDraft.type === 'date'" v-model="customTerminationDraft.date" class="repeat-custom-termination-input" type="date" />
          </div>

          <div class="repeat-dialog-preview">
            <span>{{ t('taskRepeat.nextOccurrences') }}</span>
            <strong>{{ customRepeatPreview }}</strong>
          </div>
          <div v-if="customRepeatValidationMessage" class="repeat-dialog-error">
            {{ customRepeatValidationMessage }}
          </div>
        </div>

        <div class="repeat-dialog-actions">
          <button type="button" class="repeat-dialog-secondary" @click="closeCustomRepeatDialog">{{ t('common.cancel') }}</button>
          <button
            type="button"
            class="repeat-dialog-primary"
            :disabled="!isCustomRepeatDraftValid"
            @click="saveCustomRepeatRule"
          >
            {{ t('common.save') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Icon from '@/components/Icon.vue';
import SySelect from '@/components/SiyuanTheme/SySelect.vue';
import type { RepeatFrequency, RepeatRule, RepeatRuleCalendar, RepeatRuleInput, RepeatRuleUnit, RepeatTermination } from '@/repeatRepository';
import { useI18n } from '@/composables/useI18n';
import solarLunar from '@/utils/solarLunar.js';

const props = withDefaults(defineProps<{
  repeatFrequency?: RepeatFrequency;
  repeatRule?: RepeatRule | null;
  baseDate?: string;
  embeddedCustom?: boolean;
  repeatTermination?: RepeatTermination;
}>(), {
  repeatFrequency: 'none',
  repeatRule: null,
  baseDate: '',
  embeddedCustom: false,
  repeatTermination: () => ({ type: 'never' })
});

defineOptions({
  inheritAttrs: false
});

const emit = defineEmits<{
  saveRepeatRule: [value: RepeatFrequency | RepeatRuleInput];
  customDialogClosed: [];
}>();

const { t } = useI18n();
const showCustomRepeatDialog = ref(false);
const repeatFrequencyOptions = [
  { value: 'none', text: t('taskRepeat.none') },
  { value: 'daily', text: t('taskRepeat.daily') },
  { value: 'weekdays', text: t('taskRepeat.weekdays') },
  { value: 'weekend', text: t('taskRepeat.weekend') },
  { value: 'weekly', text: t('taskRepeat.weekly') },
  { value: 'custom', text: t('taskRepeat.custom') }
];
const repeatUnitOptions = [
  { value: 'day', text: t('taskRepeat.unitDay') },
  { value: 'week', text: t('taskRepeat.unitWeek') },
  { value: 'month', text: t('taskRepeat.unitMonth') },
  { value: 'year', text: t('taskRepeat.unitYear') }
];
const repeatCalendarOptions = [
  { value: 'solar', text: t('taskRepeat.calendarSolar') },
  { value: 'lunar', text: t('taskRepeat.calendarLunar') }
];
const customRepeatDraft = ref<{
  unit: RepeatRuleUnit;
  interval: number;
  weekDays: number[];
  monthDays: number[];
  yearDays: string[];
  calendar: RepeatRuleCalendar;
  useMonthWindow: boolean;
  windowStartDay: number;
  windowEndDay: number;
}>({
  unit: 'week',
  interval: 1,
  weekDays: [],
  monthDays: [],
  yearDays: [],
  calendar: 'solar',
  useMonthWindow: false,
  windowStartDay: 1,
  windowEndDay: 1
});
const selectedCustomYearMonth = ref(1);
const customTerminationDraft = ref<RepeatTermination>({ type: 'never' });

const weekDayOptions = [
  { value: 1, label: t('taskRepeat.weekdayMonShort') },
  { value: 2, label: t('taskRepeat.weekdayTueShort') },
  { value: 3, label: t('taskRepeat.weekdayWedShort') },
  { value: 4, label: t('taskRepeat.weekdayThuShort') },
  { value: 5, label: t('taskRepeat.weekdayFriShort') },
  { value: 6, label: t('taskRepeat.weekdaySatShort') },
  { value: 0, label: t('taskRepeat.weekdaySunShort') }
];
const weekDayLabelMap = new Map(weekDayOptions.map(day => [day.value, day.label]));
const lunarMonthNames = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
const lunarDayNames = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
];

const normalizedRepeatFrequency = computed(() => props.repeatFrequency || 'none');

const repeatRuleSummary = computed(() => {
  if (normalizedRepeatFrequency.value !== 'custom') {
    return '';
  }
  return formatRepeatRuleSummary(props.repeatRule, getDraftBaseDate());
});

const customRepeatDraftSummary = computed(() => {
  return formatRepeatRuleSummary(buildRuleFromDraft(), getDraftBaseDate());
});
const customRepeatPreview = computed(() => {
  const rule = buildRuleFromDraft();
  const baseDate = getDraftBaseDate();
  const today = startOfDay(new Date());
  const cursor = new Date(Math.max(baseDate.getTime(), today.getTime()));
  const dates: string[] = [];
  for (let scanned = 0; scanned < 1462 && dates.length < 3; scanned += 1) {
    if (matchesCustomDraftDate(rule, baseDate, cursor)) {
      dates.push(formatDateValue(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates.length > 0 ? dates.join('、') : customRepeatDraftSummary.value;
});

const isLunarCustomSchedule = computed(() => customRepeatDraft.value.calendar === 'lunar');
const customMonthDayOptions = computed(() =>
  Array.from({ length: isLunarCustomSchedule.value ? 30 : 31 }, (_, index) => index + 1)
);
const customYearMonthOptions = computed(() =>
  Array.from({ length: 12 }, (_, index) => ({ value: index + 1 }))
);
const customYearDayOptions = computed(() => {
  const month = selectedCustomYearMonth.value;
  const length = isLunarCustomSchedule.value ? 30 : new Date(2024, month, 0).getDate();
  return Array.from({ length }, (_, index) => {
    const day = index + 1;
    return { value: `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, day };
  });
});

const customRepeatValidationMessage = computed(() => {
  const draft = customRepeatDraft.value;
  const interval = Number(draft.interval);
  if (!Number.isFinite(interval) || interval < 1) {
    return t('taskRepeat.intervalMinMessage');
  }
  if (draft.unit === 'week' && draft.weekDays.length === 0) {
    return t('taskRepeat.weekdayRequiredMessage');
  }
  if (draft.unit === 'month') {
    if (draft.useMonthWindow && !isValidMonthWindow(draft.windowStartDay, draft.windowEndDay)) {
      return t('taskRepeat.monthlyWindowRangeMessage');
    }
    if (!draft.useMonthWindow && draft.monthDays.length === 0) return t('taskRepeat.customScheduleRequiredMessage');
  }
  if (draft.unit === 'year' && draft.yearDays.length === 0) {
    return t('taskRepeat.customScheduleRequiredMessage');
  }
  return '';
});

const isCustomRepeatDraftValid = computed(() => customRepeatValidationMessage.value.length === 0);

watch(
  () => normalizedRepeatFrequency.value,
  (value) => {
    if (value !== 'custom') {
      showCustomRepeatDialog.value = false;
    }
  }
);

watch(
  () => props.embeddedCustom,
  (embedded) => {
    if (embedded) {
      openCustomRepeatDialog();
    }
  },
  { immediate: true }
);

function handleRepeatFrequencyUpdate(value: string): void {
  if (value === 'custom') {
    openCustomRepeatDialog();
    return;
  }
  if (
    value === 'none'
    || value === 'daily'
    || value === 'weekdays'
    || value === 'weekend'
    || value === 'weekly'
  ) {
    emit('saveRepeatRule', value);
    return;
  }
  emit('saveRepeatRule', normalizedRepeatFrequency.value || 'none');
}

function handleCustomRepeatUnitUpdate(value: string): void {
  if (value === 'day' || value === 'week' || value === 'month' || value === 'year') {
    customRepeatDraft.value.unit = value;
  }
}

function handleCustomRepeatCalendarUpdate(value: string): void {
  if (value === 'solar' || value === 'lunar') {
    customRepeatDraft.value.calendar = value;
    if (value === 'lunar') {
      customRepeatDraft.value.monthDays = customRepeatDraft.value.monthDays.filter(day => day <= 30);
      customRepeatDraft.value.yearDays = customRepeatDraft.value.yearDays.filter(day => Number(day.slice(3)) <= 30);
    }
  }
}

function getDraftBaseDate(): Date {
  const match = props.baseDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (!Number.isNaN(date.getTime())) return date;
  }
  return new Date();
}

function startOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function formatDateValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function matchesCustomDraftDate(rule: RepeatRule, start: Date, date: Date): boolean {
  if (date < start) return false;
  const diffDays = Math.floor((startOfDay(date).getTime() - startOfDay(start).getTime()) / 86_400_000);
  const interval = Math.max(1, Math.floor(rule.interval || 1));
  if (rule.unit === 'day') return diffDays % interval === 0;
  if (rule.unit === 'week') {
    return !!rule.weekDays?.includes(date.getDay()) && Math.floor(diffDays / 7) % interval === 0;
  }
  const lunarResult = rule.calendar === 'lunar'
    ? solarLunar.solar2lunar(date.getFullYear(), date.getMonth() + 1, date.getDate())
    : null;
  const lunar = lunarResult === -1 ? null : lunarResult;
  if (rule.calendar === 'lunar' && !lunar) return false;
  if (rule.unit === 'month') {
    const monthDiff = (date.getFullYear() - start.getFullYear()) * 12 + date.getMonth() - start.getMonth();
    const day = lunar ? lunar.lDay : date.getDate();
    if (rule.windowStartDay && rule.windowEndDay) {
      return monthDiff >= 0 && monthDiff % interval === 0 && day === rule.windowStartDay;
    }
    return monthDiff >= 0 && monthDiff % interval === 0 && !!rule.monthDays?.includes(day);
  }
  const yearDiff = date.getFullYear() - start.getFullYear();
  const monthDay = lunar
    ? `${String(lunar.lMonth).padStart(2, '0')}-${String(lunar.lDay).padStart(2, '0')}`
    : `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return yearDiff >= 0 && yearDiff % interval === 0 && lunar?.isLeap !== true && !!rule.yearDays?.includes(monthDay);
}

function formatWeekDayList(days: number[] | undefined, fallbackDay: number): string {
  const normalized = (days?.length ? days : [fallbackDay])
    .filter(day => Number.isInteger(day) && day >= 0 && day <= 6);
  const uniqueDays = Array.from(new Set(normalized)).sort((a, b) => {
    const left = a === 0 ? 7 : a;
    const right = b === 0 ? 7 : b;
    return left - right;
  });
  return uniqueDays
    .map(day => `${t('taskRepeat.weekdayPrefix')}${weekDayLabelMap.get(day) || ''}`)
    .join(t('taskRepeat.listDelimiter'));
}

function formatRepeatRuleSummary(rule: RepeatRule | null | undefined, baseDate: Date): string {
  if (!rule) {
    return t('taskRepeat.customRepeat');
  }
  const interval = Number.isFinite(Number(rule.interval)) ? Math.max(1, Math.floor(Number(rule.interval))) : 1;

  if (rule.unit === 'day') {
    return interval === 1
      ? t('taskRepeat.summaryEveryDay')
      : `${t('taskRepeat.summaryEvery')} ${interval} ${t('taskRepeat.summaryDays')}`;
  }

  if (rule.unit === 'week') {
    const days = formatWeekDayList(rule.weekDays, baseDate.getDay());
    return interval === 1
      ? `${t('taskRepeat.summaryEveryWeek')} ${days}`
      : `${t('taskRepeat.summaryEvery')} ${interval} ${t('taskRepeat.summaryWeeks')} ${days}`;
  }

  if (rule.unit === 'year') {
    const count = rule.yearDays?.length || 0;
    const calendar = rule.calendar === 'lunar' ? t('taskRepeat.calendarLunar') : t('taskRepeat.calendarSolar');
    return `${calendar}${t('taskRepeat.summaryYearly')} ${count}${t('taskRepeat.selectedDates')}`;
  }

  if (rule.monthDays?.length) {
    const calendar = rule.calendar === 'lunar' ? t('taskRepeat.calendarLunar') : t('taskRepeat.calendarSolar');
    return `${calendar}${t('taskRepeat.summaryMonthly')} ${rule.monthDays.join(t('taskRepeat.listDelimiter'))}`;
  }

  if (rule.windowStartDay && rule.windowEndDay) {
    return `${t('taskRepeat.summaryMonthly')} ${rule.windowStartDay}–${rule.windowEndDay}${t('taskRepeat.summaryDaySuffix')}`;
  }

  if (rule.monthMode === 'last-day') {
    return interval === 1
      ? t('taskRepeat.summaryEveryMonthLastDay')
      : `${t('taskRepeat.summaryEvery')} ${interval} ${t('taskRepeat.summaryMonthsLastDay')}`;
  }

  const monthDay = Math.min(31, Math.max(1, Math.floor(Number(rule.monthDay) || baseDate.getDate())));
  return interval === 1
    ? `${t('taskRepeat.summaryEveryMonthDayPrefix')}${monthDay}${t('taskRepeat.summaryDaySuffix')}`
    : `${t('taskRepeat.summaryEvery')} ${interval} ${t('taskRepeat.summaryMonthsDayMiddle')}${monthDay}${t('taskRepeat.summaryDaySuffix')}`;
}

function buildRuleFromDraft(): RepeatRule {
  const draft = customRepeatDraft.value;
  const interval = Number.isFinite(Number(draft.interval)) ? Math.max(1, Math.floor(Number(draft.interval))) : 1;
  const rule: RepeatRule = {
    unit: draft.unit,
    interval
  };

  if (draft.unit === 'week') {
    rule.weekDays = draft.weekDays.length ? [...draft.weekDays] : [getDraftBaseDate().getDay()];
  }

  if (draft.unit === 'month') {
    rule.calendar = draft.calendar;
    if (draft.useMonthWindow) {
      rule.windowStartDay = Math.max(1, Math.min(31, Math.floor(draft.windowStartDay)));
      rule.windowEndDay = Math.max(rule.windowStartDay, Math.min(31, Math.floor(draft.windowEndDay)));
    } else {
      rule.monthDays = draft.monthDays.length ? [...draft.monthDays] : [getDraftBaseDate().getDate()];
    }
  }

  if (draft.unit === 'year') {
    rule.calendar = draft.calendar;
    rule.yearDays = draft.yearDays.length
      ? [...draft.yearDays]
      : [`${String(getDraftBaseDate().getMonth() + 1).padStart(2, '0')}-${String(getDraftBaseDate().getDate()).padStart(2, '0')}`];
  }

  return rule;
}

function openCustomRepeatDialog(): void {
  const baseDate = getDraftBaseDate();
  const existingRule = normalizedRepeatFrequency.value === 'custom' ? props.repeatRule : null;
  if (existingRule) {
    customRepeatDraft.value = {
      unit: existingRule.unit,
      interval: Number.isFinite(Number(existingRule.interval)) ? Math.max(1, Math.floor(Number(existingRule.interval))) : 1,
      weekDays: existingRule.weekDays?.length ? [...existingRule.weekDays] : [baseDate.getDay()],
      monthDays: existingRule.monthDays?.length
        ? [...existingRule.monthDays]
        : [Number.isFinite(Number(existingRule.monthDay)) ? Math.min(31, Math.max(1, Math.floor(Number(existingRule.monthDay)))) : baseDate.getDate()],
      yearDays: existingRule.yearDays?.length ? [...existingRule.yearDays] : [],
      calendar: existingRule.calendar === 'lunar' ? 'lunar' : 'solar',
      useMonthWindow: !!existingRule.windowStartDay && !!existingRule.windowEndDay,
      windowStartDay: existingRule.windowStartDay || baseDate.getDate(),
      windowEndDay: existingRule.windowEndDay || baseDate.getDate()
    };
  } else {
    customRepeatDraft.value = {
      unit: 'week',
      interval: 1,
      weekDays: [baseDate.getDay()],
      monthDays: [baseDate.getDate()],
      yearDays: [],
      calendar: 'solar',
      useMonthWindow: false,
      windowStartDay: baseDate.getDate(),
      windowEndDay: baseDate.getDate()
    };
  }
  const firstYearDay = customRepeatDraft.value.yearDays[0];
  selectedCustomYearMonth.value = firstYearDay ? Number(firstYearDay.slice(0, 2)) || 1 : baseDate.getMonth() + 1;
  customTerminationDraft.value = { ...(props.repeatTermination || { type: 'never' }) } as RepeatTermination;
  showCustomRepeatDialog.value = true;
}

function closeCustomRepeatDialog(): void {
  showCustomRepeatDialog.value = false;
  emit('customDialogClosed');
}

function toggleCustomWeekDay(day: number): void {
  const selected = new Set(customRepeatDraft.value.weekDays);
  if (selected.has(day)) {
    selected.delete(day);
  } else {
    selected.add(day);
  }
  customRepeatDraft.value.weekDays = Array.from(selected).sort((a, b) => {
    const left = a === 0 ? 7 : a;
    const right = b === 0 ? 7 : b;
    return left - right;
  });
}

function saveCustomRepeatRule(): void {
  if (!isCustomRepeatDraftValid.value) {
    return;
  }

  emit('saveRepeatRule', {
    frequency: 'custom',
    rule: buildRuleFromDraft(),
    termination: customTerminationDraft.value
  });
  closeCustomRepeatDialog();
}

function isValidMonthWindow(start: number, end: number): boolean {
  return Number.isInteger(start) && Number.isInteger(end) && start >= 1 && end >= start && end <= 31;
}

function toggleCustomMonthDay(day: number): void {
  const selected = new Set(customRepeatDraft.value.monthDays);
  if (selected.has(day)) selected.delete(day);
  else selected.add(day);
  customRepeatDraft.value.monthDays = Array.from(selected).sort((a, b) => a - b);
}

function toggleCustomYearDay(day: string): void {
  const selected = new Set(customRepeatDraft.value.yearDays);
  if (selected.has(day)) selected.delete(day);
  else selected.add(day);
  customRepeatDraft.value.yearDays = Array.from(selected).sort();
}

function formatCustomMonthDay(day: number): string {
  return isLunarCustomSchedule.value ? lunarDayNames[day - 1] || String(day) : String(day);
}

function formatCustomYearMonth(month: number): string {
  return isLunarCustomSchedule.value
    ? lunarMonthNames[month - 1] || String(month)
    : `${month}${t('date.monthSuffix')}`;
}

function getCustomYearMonthSelectedCount(month: number): number {
  const prefix = `${String(month).padStart(2, '0')}-`;
  return customRepeatDraft.value.yearDays.filter(day => day.startsWith(prefix)).length;
}

defineExpose({ openCustomRepeatDialog });
</script>

<style scoped>
.task-repeat-editor {
  display: block;
}

.repeat-edit-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.repeat-edit-row label {
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  opacity: 0.8;
  flex-shrink: 0;
}

.repeat-edit-row select {
  flex: 1;
  min-width: 0;
  border: none;
  border-radius: 6px;
  color: var(--b3-theme-on-background);
  font-size: 12px;
  outline: none;
}

.repeat-custom-edit {
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  cursor: pointer;
  line-height: 1;
}

.repeat-custom-edit svg {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.repeat-custom-edit:hover {
  color: var(--b3-theme-primary);
}

.repeat-rule-summary {
  margin: 2px 0 0 44px;
  color: var(--b3-theme-on-surface);
  font-size: 12px;
  line-height: 1.35;
  opacity: 0.72;
}

.repeat-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: #00000045;
}

.repeat-dialog {
  width: min(360px, 100%);
  border: 1px solid var(--b3-border-color, var(--b3-theme-border));
  border-radius: 8px;
  background: var(--b3-theme-surface, var(--b3-theme-background));
  color: var(--b3-theme-on-background);
  box-shadow: 0 18px 42px #00000035;
}

.repeat-dialog-overlay.is-embedded {
  position: static;
  display: block;
  padding: 0;
  background: transparent;
}

.repeat-dialog-overlay.is-embedded .repeat-dialog {
  width: 100%;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.repeat-dialog-overlay.is-embedded .repeat-dialog-body {
  margin: 0;
  padding: 12px 14px;
}

.repeat-dialog-overlay.is-embedded .repeat-dialog-actions {
  padding: 10px 14px 14px;
}

.repeat-dialog-header,
.repeat-dialog-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px;
}


.repeat-dialog-title {
  font-size: 14px;
  font-weight: 600;
}

.repeat-dialog-close {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--b3-theme-on-background);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.repeat-dialog-close:hover,
.repeat-weekday:hover,
.repeat-weekday.selected {
  background: #f98f7a;
  color: var(--b3-theme-background);
}

.repeat-dialog-body {
  display: grid;
  gap: 12px;
  padding: 12px;
}

.repeat-dialog-body.form-group.custom-schedule {
  gap: 10px;
  border: 1px solid var(--b3-border-color, var(--b3-theme-border));
  border-radius: 8px;
  background-color: var(--b3-theme-background);
}

.custom-schedule-label {
  color: var(--b3-theme-on-surface);
  font-size: 12px;
  line-height: 1.25;
}

.repeat-dialog-row.custom-schedule-frequency-row {
  grid-template-columns: auto minmax(56px, 0.4fr) minmax(72px, 0.6fr);
  gap: 6px;
}

.repeat-dialog-row.custom-schedule-frequency-row:has(.custom-schedule-calendar-select) {
  grid-template-columns: auto minmax(56px, 0.35fr) minmax(64px, 0.45fr) minmax(76px, 0.6fr);
}

.custom-schedule-every-prefix {
  font-size: 12px;
  white-space: nowrap;
}

.repeat-dialog-row.custom-schedule-frequency-row input,
.repeat-dialog-row.custom-schedule-frequency-row :deep(.b3-select) {
  box-sizing: border-box;
  min-width: 0;
  width: 100%;
  height: 28px;
  min-height: 28px;
  max-height: 28px;
}

.repeat-dialog-row.custom-schedule-frequency-row :deep(.b3-select.fn__flex-center) {
  display: block;
  height: 28px;
  min-height: 28px;
  max-height: 28px;
  padding: 0 12px;
  line-height: 28px;
}

.custom-schedule-grid {
  display: grid;
  gap: 6px;
  max-height: 168px;
  overflow-y: auto;
}

.custom-schedule-grid--week {
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.custom-schedule-grid--month,
.custom-schedule-grid--year-days {
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.custom-schedule-year {
  display: grid;
  gap: 8px;
}

.custom-schedule-grid--year-months {
  grid-template-columns: repeat(6, minmax(0, 1fr));
  max-height: none;
  overflow: visible;
}

.custom-schedule-chip {
  min-width: 0;
  min-height: 28px;
  border: 1px solid var(--b3-border-color, var(--b3-theme-border));
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
  gap: 3px;
}

.custom-schedule-chip.has-selection:not(.selected) {
  border-color: rgb(249 143 122 / 48%);
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
  background-color: rgb(249 143 122 / 18%);
  font-size: 10px;
  line-height: 1;
}

.custom-schedule-chip:hover,
.custom-schedule-chip.selected {
  border-color: #f98f7a;
  background-color: rgb(249 143 122 / 16%);
  color: #cf5c4b;
  font-weight: 600;
}

.repeat-month-window {
  display: grid;
  gap: 6px;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
}

.repeat-month-window label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
.repeat-month-window-inputs { display: flex; align-items: center; gap: 6px; }
.repeat-month-window-inputs input { width: 64px; }
.repeat-month-window small { opacity: .75; }

.repeat-dialog-row.custom-schedule-month-row {
  grid-template-columns: minmax(0, 1fr) minmax(72px, 0.55fr);
}

.repeat-dialog-row {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  gap: 8px;
}

.repeat-dialog-row label {
  font-size: 12px;
  opacity: 0.82;
}

.repeat-dialog-row input,
.repeat-dialog-row select {
  min-width: 0;
  height: 30px;
  border: none;
  border-radius: 6px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  padding: 0 8px;
  font-size: 12px;
  outline: none;
}

.repeat-dialog-preview,
.repeat-dialog-error {
  min-height: 18px;
  font-size: 12px;
  line-height: 1.4;
}

.repeat-dialog-preview {
  color: var(--b3-theme-on-surface);
  opacity: 0.82;
}

.repeat-dialog-preview {
  display: grid;
  gap: 3px;
  padding: 8px;
  border-radius: 6px;
  background: var(--b3-list-hover);
}

.repeat-dialog-preview span {
  font-size: 11px;
}

.repeat-dialog-preview strong {
  color: var(--b3-theme-on-background);
  font-size: 12px;
  font-weight: 500;
}

.repeat-custom-termination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.repeat-custom-termination > label {
  color: var(--b3-theme-on-surface);
  font-size: 12px;
  white-space: nowrap;
}

.repeat-custom-termination-options {
  display: flex;
  flex: 1 1 auto;
  gap: 8px;
  min-width: 0;
}

.repeat-custom-termination-options button,
.repeat-custom-termination-input {
  min-width: 0;
  min-height: 28px;
  border: none;
  border-radius: 999px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-surface);
  font: inherit;
  font-size: 14px;
}

.repeat-custom-termination-options button {
  flex: 1 1 0;
  padding: 6px 10px;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.repeat-custom-termination-options button.selected {
  background: var(--b3-theme-on-background);
  color: var(--b3-theme-background);
}

.repeat-custom-termination-input {
  box-sizing: border-box;
  width: 100%;
  padding: 0 8px;
  flex-basis: 100%;
}

.repeat-dialog-error {
  color: #d23f31;
}

.repeat-weekday-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
}

.repeat-weekday {
  aspect-ratio: 1 / 1;
  border-radius: 12px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  cursor: pointer;
  font-size: 12px;
  border: none;
}

.repeat-dialog-actions {
  justify-content: flex-end;
}

.repeat-dialog-secondary,
.repeat-dialog-primary {
  min-width: 64px;
  height: 30px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
}

.repeat-dialog-secondary {
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
}

.repeat-dialog-primary {
  background: #f98f7a;
  color: #fff;
}

.repeat-dialog-primary:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
</style>
