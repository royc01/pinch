<template>
  <div class="task-repeat-editor" v-bind="$attrs">
    <div class="repeat-edit-row">
      <label>{{ t('taskRepeat.frequency') }}</label>
      <select :value="normalizedRepeatFrequency" @change="onRepeatChange">
        <option value="none">{{ t('taskRepeat.none') }}</option>
        <option value="daily">{{ t('taskRepeat.daily') }}</option>
        <option value="weekdays">{{ t('taskRepeat.weekdays') }}</option>
        <option value="weekend">{{ t('taskRepeat.weekend') }}</option>
        <option value="weekly">{{ t('taskRepeat.weekly') }}</option>
        <option value="custom">{{ t('taskRepeat.custom') }}</option>
      </select>
      <button
        v-if="normalizedRepeatFrequency === 'custom'"
        type="button"
        class="repeat-custom-edit"
        :title="t('taskRepeat.editCustomRepeat')"
        :aria-label="t('taskRepeat.editCustomRepeat')"
        @click="openCustomRepeatDialog"
      >
        ...
      </button>
    </div>
    <div v-if="normalizedRepeatFrequency === 'custom'" class="repeat-rule-summary">
      {{ repeatRuleSummary }}
    </div>
  </div>

  <Teleport to="body">
    <div
      v-if="showCustomRepeatDialog"
      class="repeat-dialog-overlay"
      @mousedown.stop
      @click.self="closeCustomRepeatDialog"
    >
      <div class="repeat-dialog" @mousedown.stop @click.stop>
        <div class="repeat-dialog-header">
          <div class="repeat-dialog-title">{{ t('taskRepeat.customRepeat') }}</div>
          <button
            type="button"
            class="repeat-dialog-close"
            :title="t('common.close')"
            :aria-label="t('common.close')"
            @click.stop="closeCustomRepeatDialog"
          >
            <Icon name="close" width="16" height="16" />
          </button>
        </div>

        <div class="repeat-dialog-body">
          <div class="repeat-dialog-row">
            <label>{{ t('taskRepeat.everyInterval') }}</label>
            <input v-model.number="customRepeatDraft.interval" type="number" min="1" max="999" />
            <select v-model="customRepeatDraft.unit">
              <option value="day">{{ t('taskRepeat.unitDay') }}</option>
              <option value="week">{{ t('taskRepeat.unitWeek') }}</option>
              <option value="month">{{ t('taskRepeat.unitMonth') }}</option>
            </select>
          </div>

          <div v-if="customRepeatDraft.unit === 'week'" class="repeat-weekday-grid">
            <button
              v-for="day in weekDayOptions"
              :key="day.value"
              type="button"
              :class="['repeat-weekday', { selected: customRepeatDraft.weekDays.includes(day.value) }]"
              @click="toggleCustomWeekDay(day.value)"
            >
              {{ day.label }}
            </button>
          </div>

          <div v-if="customRepeatDraft.unit === 'month'" class="repeat-dialog-row">
            <label>{{ t('taskManager.date') }}</label>
            <select v-model="customRepeatDraft.monthMode">
              <option value="day-of-month">{{ t('taskRepeat.dayOfMonth') }}</option>
              <option value="last-day">{{ t('taskRepeat.lastDayOfMonth') }}</option>
            </select>
            <input
              v-if="customRepeatDraft.monthMode === 'day-of-month'"
              v-model.number="customRepeatDraft.monthDay"
              type="number"
              min="1"
              max="31"
            />
          </div>

          <div class="repeat-dialog-preview">
            {{ customRepeatDraftSummary }}
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
import type { RepeatFrequency, RepeatRule, RepeatRuleInput, RepeatRuleUnit } from '@/repeatRepository';
import { useI18n } from '@/composables/useI18n';

const props = withDefaults(defineProps<{
  repeatFrequency?: RepeatFrequency;
  repeatRule?: RepeatRule | null;
  baseDate?: string;
}>(), {
  repeatFrequency: 'none',
  repeatRule: null,
  baseDate: ''
});

defineOptions({
  inheritAttrs: false
});

const emit = defineEmits<{
  saveRepeatRule: [value: RepeatFrequency | RepeatRuleInput];
}>();

const { t } = useI18n();
const showCustomRepeatDialog = ref(false);
const customRepeatDraft = ref<{
  unit: RepeatRuleUnit;
  interval: number;
  weekDays: number[];
  monthMode: 'day-of-month' | 'last-day';
  monthDay: number;
}>({
  unit: 'week',
  interval: 1,
  weekDays: [],
  monthMode: 'day-of-month',
  monthDay: 1
});

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

const customRepeatValidationMessage = computed(() => {
  const draft = customRepeatDraft.value;
  const interval = Number(draft.interval);
  if (!Number.isFinite(interval) || interval < 1) {
    return t('taskRepeat.intervalMinMessage');
  }
  if (draft.unit === 'week' && draft.weekDays.length === 0) {
    return t('taskRepeat.weekdayRequiredMessage');
  }
  if (draft.unit === 'month' && draft.monthMode === 'day-of-month') {
    const monthDay = Number(draft.monthDay);
    if (!Number.isInteger(monthDay) || monthDay < 1 || monthDay > 31) {
      return t('taskRepeat.monthDayRangeMessage');
    }
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

function onRepeatChange(event: Event): void {
  const target = event.target as HTMLSelectElement;
  const value = target.value as RepeatFrequency;
  if (value === 'custom') {
    openCustomRepeatDialog();
    target.value = normalizedRepeatFrequency.value || 'none';
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

function getDraftBaseDate(): Date {
  const match = props.baseDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (!Number.isNaN(date.getTime())) return date;
  }
  return new Date();
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
    rule.monthMode = draft.monthMode;
    if (draft.monthMode === 'day-of-month') {
      const day = Number.isFinite(Number(draft.monthDay)) ? Math.floor(Number(draft.monthDay)) : getDraftBaseDate().getDate();
      rule.monthDay = Math.min(31, Math.max(1, day));
    }
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
      monthMode: existingRule.monthMode === 'last-day' ? 'last-day' : 'day-of-month',
      monthDay: Number.isFinite(Number(existingRule.monthDay)) ? Math.min(31, Math.max(1, Math.floor(Number(existingRule.monthDay)))) : baseDate.getDate()
    };
  } else {
    customRepeatDraft.value = {
      unit: 'week',
      interval: 1,
      weekDays: [baseDate.getDay()],
      monthMode: 'day-of-month',
      monthDay: baseDate.getDate()
    };
  }
  showCustomRepeatDialog.value = true;
}

function closeCustomRepeatDialog(): void {
  showCustomRepeatDialog.value = false;
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
    rule: buildRuleFromDraft()
  });
  closeCustomRepeatDialog();
}
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
  width: 36px;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  opacity: 0.8;
  flex-shrink: 0;
}

.repeat-edit-row select {
  flex: 1;
  min-width: 0;
  padding: 6px 34px 6px 10px;
  border: none;
  border-radius: 6px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  font-size: 12px;
  outline: none;
}

.repeat-custom-edit {
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 6px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
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
