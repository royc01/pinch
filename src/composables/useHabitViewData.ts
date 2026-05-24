import { computed, type ShallowRef, watch } from 'vue';
import type { Habit } from '@/api';
import { getTodayCompletionCount, getWeekCompletionData, getWeekStart } from '@/composables/useHabitUtils';
import { translate } from '@/composables/useI18n';

interface HabitCacheData {
  weeklyCompleted: boolean;
  todayCompletionCount: number;
  piePath: string;
}

interface UseHabitViewDataOptions {
  habits: ShallowRef<Habit[]>;
  formatDate: (date: Date) => string;
  getToday: () => string;
  getWeeklyCompletionStatus: (habit: Habit) => boolean;
}

const DEFAULT_HABIT_CACHE: HabitCacheData = {
  weeklyCompleted: false,
  todayCompletionCount: 0,
  piePath: ''
};

export const useHabitViewData = ({
  habits,
  formatDate,
  getToday,
  getWeeklyCompletionStatus
}: UseHabitViewDataOptions) => {
  const formatTemplate = (key: string, values: Record<string, string | number>): string => {
    return Object.entries(values).reduce(
      (result, [name, value]) => result.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value)),
      translate(key)
    );
  };

  const mondayFirstWeekdayKeys = [
    'date.weekdayMonShort',
    'date.weekdayTueShort',
    'date.weekdayWedShort',
    'date.weekdayThuShort',
    'date.weekdayFriShort',
    'date.weekdaySatShort',
    'date.weekdaySunShort'
  ] as const;
  const sundayFirstWeekdayKeys = [
    'date.weekdaySunShort',
    'date.weekdayMonShort',
    'date.weekdayTueShort',
    'date.weekdayWedShort',
    'date.weekdayThuShort',
    'date.weekdayFriShort',
    'date.weekdaySatShort'
  ] as const;
  const getYearMonthLabel = (date: Date): string =>
    formatTemplate('date.yearMonthTemplate', {
      year: date.getFullYear(),
      month: date.getMonth() + 1
    });

  const isToday = (dateString: string) => dateString === getToday();

  const weekDates = computed(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();

    const monday = new Date(today);
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    monday.setDate(today.getDate() - daysToMonday);

    const dates: Array<{ date: string; dayName: string; isToday: boolean; fullDate: string }> = [];

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(monday);
      currentDate.setDate(monday.getDate() + i);

      dates.push({
        date: `${currentDate.getDate()}`,
        dayName: translate(mondayFirstWeekdayKeys[i]),
        isToday: currentDate.toDateString() === today.toDateString(),
        fullDate: formatDate(currentDate)
      });
    }

    return dates;
  });

  const getLargePiePath = (habit: Habit) => {
    const completedCount = getTodayCompletionCount(habit, getToday);
    const targetCount = habit.timesPerDay || 1;
    const progress = Math.min(1, Math.max(0, completedCount / targetCount));

    const cx = 13;
    const cy = 13;
    const r = 16;

    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + 2 * Math.PI * progress;

    const startX = cx + r * Math.cos(startAngle);
    const startY = cy + r * Math.sin(startAngle);
    const endX = cx + r * Math.cos(endAngle);
    const endY = cy + r * Math.sin(endAngle);

    const largeArcFlag = progress > 0.5 ? 1 : 0;

    if (progress === 0) {
      return `M ${cx} ${cy}`;
    }

    if (progress === 1) {
      return `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`;
    }

    return `M ${cx} ${cy} L ${startX} ${startY} A ${r} ${r} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
  };

  const initializeHabitViewMode = (habit: Habit) => {
    habit.currentWeekOffset ??= 0;
  };

  const initializeStatsViewMode = (habit: Habit) => {
    habit.statsViewMode ??= 'month';
    habit.statsMonthOffset ??= 0;
  };

  const getWeekViewData = (habit: Habit) => {
    const todayDate = new Date();
    const targetDate = new Date(todayDate);
    targetDate.setDate(todayDate.getDate() + (habit.currentWeekOffset || 0) * 7);

    const startOfWeek = getWeekStart(targetDate);
    const weekCompletionData = getWeekCompletionData(habit, startOfWeek);
    const todayLocalDateStr = getToday();

    const weekData: Array<{
      date: string;
      completed: boolean;
      completedCount: number;
      targetCount: number;
      isPast: boolean;
      isFuture: boolean;
      isToday: boolean;
      isCompletedByWeeklyRule: boolean;
    }> = [];

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startOfWeek);
      currentDate.setDate(startOfWeek.getDate() + i);

      const dateStr = formatDate(currentDate);
      const calendarRecord = habit.calendar.find(day => day.date === dateStr);
      const actualCompleted = calendarRecord ? calendarRecord.completed : false;

      weekData.push({
        date: dateStr,
        completed: weekCompletionData.hasCompletedRequiredThisWeek ? true : actualCompleted,
        completedCount: calendarRecord ? calendarRecord.completedCount || 0 : 0,
        targetCount: calendarRecord ? calendarRecord.targetCount || 1 : 1,
        isPast: dateStr < todayLocalDateStr,
        isFuture: dateStr > todayLocalDateStr,
        isToday: isToday(dateStr),
        isCompletedByWeeklyRule: weekCompletionData.hasCompletedRequiredThisWeek && !actualCompleted
      });
    }

    return weekData;
  };

  const getCalendarViewData = (habit: Habit) => {
    initializeHabitViewMode(habit);
    return getWeekViewData(habit);
  };

  const calculatePrevMonthDays = (firstDay: Date) => {
    const dayOfWeek = firstDay.getDay();
    return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  };

  const generateMonthViewData = (targetDate: Date, calendarData?: any[], moodData?: any) => {
    const firstDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const lastDay = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);

    const prevMonthDays = calculatePrevMonthDays(firstDay);
    const daysInMonth = lastDay.getDate();
    const daysNeeded = 35;

    const monthData: Array<{
      date: string;
      data: any;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();

    const getDayData = (date: Date) => {
      const dateStr = formatDate(date);
      let dayData = null;

      if (calendarData !== undefined) {
        dayData = calendarData.find(day => day.date === dateStr);
      } else if (moodData !== undefined) {
        dayData = moodData[dateStr];
      }

      return {
        date: dateStr,
        data: dayData || null,
        isCurrentMonth: date.getMonth() === targetDate.getMonth() && date.getFullYear() === targetDate.getFullYear(),
        isToday: dateStr === getToday()
      };
    };

    for (let i = prevMonthDays; i > 0; i--) {
      const date = new Date(targetYear, targetMonth, -i + 1);
      monthData.push(getDayData(date));
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(targetYear, targetMonth, i);
      monthData.push(getDayData(date));
    }

    const remainingDays = daysNeeded - monthData.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(targetYear, targetMonth + 1, i);
      monthData.push(getDayData(date));
    }

    return monthData;
  };

  const getStatsMonthViewData = (habit: Habit) => {
    initializeStatsViewMode(habit);
    const today = new Date();
    const targetDate = new Date(today.getFullYear(), today.getMonth() + (habit.statsMonthOffset || 0), 1);

    const rawData = generateMonthViewData(targetDate, habit.calendar);

    return rawData.map(item => ({
      date: item.date,
      completed: item.data ? item.data.completed : false,
      completedCount: item.data ? item.data.completedCount || 0 : 0,
      targetCount: item.data ? item.data.targetCount || 1 : 1,
      isCurrentMonth: item.isCurrentMonth
    }));
  };

  const changeStatsCalendarPeriod = (habit: Habit, direction: number) => {
    initializeStatsViewMode(habit);
    habit.statsMonthOffset = (habit.statsMonthOffset || 0) + direction;
  };

  const getCurrentPeriodText = (habit: Habit) => {
    initializeStatsViewMode(habit);
    const today = new Date();
    const targetDate = new Date(today.getFullYear(), today.getMonth() + (habit.statsMonthOffset || 0), 1);
    return getYearMonthLabel(targetDate);
  };

  // 懒加载缓存：仅在渲染时按需计算单个习惯的数据，而非一次性计算全部
  const habitsCacheMap = new Map<string, HabitCacheData>();

  // 当 habits 数组引用变化时清空缓存，下次渲染时按需重建
  watch(
    habits,
    () => {
      habitsCacheMap.clear();
    },
    { flush: 'sync' }
  );

  const getHabitCache = (habitId: string): HabitCacheData => {
    const cached = habitsCacheMap.get(habitId);
    if (cached !== undefined) {
      return cached;
    }

    const habit = habits.value.find(h => h.id === habitId);
    if (!habit) return DEFAULT_HABIT_CACHE;

    const weeklyCompleted = habit.frequency && habit.frequency.startsWith('weekly')
      ? getWeeklyCompletionStatus(habit)
      : false;
    const todayCompletionCount = getTodayCompletionCount(habit, getToday);
    const piePath = getLargePiePath(habit);

    const data: HabitCacheData = { weeklyCompleted, todayCompletionCount, piePath };
    habitsCacheMap.set(habitId, data);
    return data;
  };

  const weekdaysForCalendar = computed(() => mondayFirstWeekdayKeys.map(key => translate(key)));

  const currentDateString = computed(() => {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return formatTemplate('date.monthDayWeekdayTemplate', {
      month,
      day,
      weekday: translate(sundayFirstWeekdayKeys[date.getDay()])
    });
  });

  return {
    weekDates,
    weekdaysForCalendar,
    currentDateString,
    getCalendarViewData,
    generateMonthViewData,
    getStatsMonthViewData,
    changeStatsCalendarPeriod,
    getCurrentPeriodText,
    getHabitCache
  };
};
