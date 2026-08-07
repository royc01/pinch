import type { RepeatRule } from '@/repeatRepository';

type Translate = (key: string) => string;

/** Formats custom recurrence rules for display across task views and editors. */
export function formatRepeatRuleLabel(rule: RepeatRule | null | undefined, t: Translate): string {
  if (!rule) return t('taskRepeat.customRepeat');

  if (rule.unit === 'week') {
    const weekdayKeys = [
      'taskRepeat.weekdaySunShort',
      'taskRepeat.weekdayMonShort',
      'taskRepeat.weekdayTueShort',
      'taskRepeat.weekdayWedShort',
      'taskRepeat.weekdayThuShort',
      'taskRepeat.weekdayFriShort',
      'taskRepeat.weekdaySatShort'
    ];
    const days = (rule.weekDays || [])
      .filter(day => Number.isInteger(day) && day >= 0 && day <= 6)
      .map(day => `${t('taskRepeat.weekdayPrefix')}${t(weekdayKeys[day])}`);
    return days.length > 0
      ? `${t('taskRepeat.presetWeeklyPrefix')}（${days.join(t('taskRepeat.listDelimiter'))}）`
      : t('taskRepeat.presetWeeklyPrefix');
  }

  if (rule.unit === 'month') {
    const prefix = rule.calendar === 'lunar'
      ? t('taskRepeat.presetLunarMonthlyPrefix')
      : t('taskRepeat.monthly');
    if (rule.windowStartDay && rule.windowEndDay) {
      return `${prefix}（${rule.windowStartDay}${t('taskRepeat.summaryDaySuffix')}–${rule.windowEndDay}${t('taskRepeat.summaryDaySuffix')}）`;
    }
    const days = (rule.monthDays || [])
      .map(day => `${day}${t('taskRepeat.summaryDaySuffix')}`)
      .join(t('taskRepeat.listDelimiter'));
    return days ? `${prefix}（${days}）` : prefix;
  }

  if (rule.unit === 'year') {
    const prefix = rule.calendar === 'lunar'
      ? t('taskRepeat.presetLunarYearlyPrefix')
      : t('taskRepeat.presetYearlyPrefix');
    const dates = (rule.yearDays || [])
      .map(value => {
        const [month, day] = value.split('-').map(Number);
        return Number.isInteger(month) && Number.isInteger(day)
          ? `${month}${t('date.monthSuffix')}${day}${t('taskRepeat.summaryDaySuffix')}`
          : value;
      })
      .join(t('taskRepeat.listDelimiter'));
    return dates ? `${prefix}（${dates}）` : prefix;
  }

  if (rule.unit === 'day') {
    return rule.interval > 1
      ? `${t('taskRepeat.summaryEvery')}${rule.interval}${t('taskRepeat.summaryDays')}`
      : t('taskRepeat.daily');
  }

  return t('taskRepeat.customRepeat');
}
