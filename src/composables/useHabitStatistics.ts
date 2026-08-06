import { computed, type ShallowRef } from 'vue';
import type { Habit } from '@/api';
import { cleanExpiredCache, getCachedValue, setCachedValue } from '@/composables/useExpiringCache';
import { getWeekStart, getWeeklyTarget, isSameWeek } from '@/composables/useHabitUtils';
import { translate } from '@/composables/useI18n';

const CACHE_TTL = 86400000;
const MAX_CACHE_SIZE = 1000;

interface UseHabitStatisticsOptions {
  habits: ShallowRef<Habit[]>;
  parseDate: (dateStr: string) => Date;
  formatDate: (date: Date) => string;
  getToday: () => string;
}

export const useHabitStatistics = ({
  habits,
  parseDate,
  formatDate,
  getToday
}: UseHabitStatisticsOptions) => {
  const formatTemplate = (key: string, values: Record<string, string | number>): string => {
    return Object.entries(values).reduce(
      (result, [name, value]) => result.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value)),
      translate(key)
    );
  };

  const streakCache = new Map<string, { result: number; timestamp: number }>();
  const longestStreakCache = new Map<
    string,
    { result: { streak: number; startDate: Date | null; endDate: Date | null }; timestamp: number }
  >();
  const completionRateCache = new Map<string, { result: number; timestamp: number }>();
  const weeklyCompletionCache = new Map<string, { result: boolean; timestamp: number }>();

  const getDayBucket = () => Date.now() - (Date.now() % 86400000);

  const clearCompletionRateCacheForHabit = (habitId: string) => {
    const cacheKey = `${habitId}-completionRate-${getDayBucket()}`;
    completionRateCache.delete(cacheKey);
  };

  const clearWeeklyCompletionCacheForHabit = (habitId: string) => {
    const cacheKey = `${habitId}-weeklyStatus-${getWeekStart(new Date()).toISOString().split('T')[0]}`;
    weeklyCompletionCache.delete(cacheKey);
  };

  const clearCurrentStreakCacheForHabit = (habitId: string) => {
    const cacheKey = `${habitId}-${getDayBucket()}`;
    streakCache.delete(cacheKey);
  };

  const cleanupExpiredStatisticCaches = () => {
    cleanExpiredCache(streakCache, CACHE_TTL);
    cleanExpiredCache(longestStreakCache, CACHE_TTL);
    cleanExpiredCache(completionRateCache, CACHE_TTL);
    cleanExpiredCache(weeklyCompletionCache, CACHE_TTL);
  };

  const getActiveDateRange = (habit: Habit) => {
    const creationDate = new Date(habit.createdAt);
    const today = new Date();
    creationDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return { creationDate, today };
  };

  const isRecordInActiveDateRange = (recordDate: Date, creationDate: Date, today: Date): boolean => {
    return recordDate >= creationDate && recordDate <= today;
  };

  const calculateCurrentStreak = (habit: Habit, startDate?: Date) => {
    const cacheKey = `${habit.id}-${startDate ? startDate.getTime() : 'none'}-${getDayBucket()}`;

    const cached = getCachedValue(streakCache, cacheKey, CACHE_TTL);
    if (cached !== null) return cached;

    let filteredCalendar = habit.calendar;
    if (startDate) {
      const startNormalized = new Date(startDate);
      startNormalized.setHours(0, 0, 0, 0);
      filteredCalendar = filteredCalendar.filter(record => parseDate(record.date) >= startNormalized);
    }

    const sortedCalendar = filteredCalendar.sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());

    let streak = 0;
    let expectedNextDate: Date | null = null;

    for (const day of sortedCalendar) {
      if (!day.completed) break;

      const recordDate = parseDate(day.date);

      if (expectedNextDate === null || recordDate.getTime() === expectedNextDate.getTime()) {
        streak++;
        expectedNextDate = new Date(recordDate);
        expectedNextDate.setDate(expectedNextDate.getDate() - 1);
      } else {
        break;
      }
    }

    setCachedValue(streakCache, cacheKey, streak, MAX_CACHE_SIZE);
    return streak;
  };

  const getWeeklyCompletionStatus = (habit: Habit) => {
    if (!habit.frequency?.startsWith('weekly')) {
      return false;
    }

    const cacheKey = `${habit.id}-weeklyStatus-${getWeekStart(new Date()).toISOString().split('T')[0]}`;
    const cached = getCachedValue(weeklyCompletionCache, cacheKey, CACHE_TTL);
    if (cached !== null) return cached;

    const requiredWeekCompletions = getWeeklyTarget(habit.frequency);
    const thisWeekStart = getWeekStart(new Date());

    const completedThisWeek = habit.calendar.reduce((count, day) => {
      return day.completed && isSameWeek(new Date(day.date), thisWeekStart) ? count + 1 : count;
    }, 0);

    const result = completedThisWeek >= requiredWeekCompletions;
    setCachedValue(weeklyCompletionCache, cacheKey, result, MAX_CACHE_SIZE);
    return result;
  };

  const getMonthlyProgressData = (habit: Habit) => {
    const currentYear = new Date().getFullYear();

    const yearlyData = habit.calendar.filter(record => {
      const recordDate = parseDate(record.date);
      return recordDate.getFullYear() === currentYear && record.completed;
    });

    const monthlyData = [];
    for (let month = 0; month < 12; month++) {
      const monthEnd = new Date(currentYear, month + 1, 0);
      const totalDays = monthEnd.getDate();

      const monthCompletions = yearlyData.filter(record => parseDate(record.date).getMonth() === month).length;
      const percentage = totalDays > 0 ? Math.round((monthCompletions / totalDays) * 100) : 0;

      monthlyData.push({
        month: formatTemplate('date.monthLabelTemplate', { month: month + 1 }),
        completions: monthCompletions,
        totalDays,
        percentage
      });
    }

    return monthlyData;
  };

  const calculateCompletionRate = (habit: Habit) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    const creationDateISO = habit.createdAt;
    let creationDate: Date;

    if (creationDateISO.endsWith('Z')) {
      creationDate = new Date(creationDateISO);
    } else {
      creationDate = new Date(creationDateISO);
    }

    const localCreationDate = new Date(
      creationDate.getFullYear(),
      creationDate.getMonth(),
      creationDate.getDate()
    );
    creationDate = localCreationDate;
    const creationDateForCalculation = new Date(creationDate);

    const monthRecords = habit.calendar.filter(record => {
      const recordDate = parseDate(record.date);
      recordDate.setHours(0, 0, 0, 0);
      return (
        recordDate.getFullYear() === currentYear &&
        recordDate.getMonth() === currentMonth &&
        isRecordInActiveDateRange(recordDate, creationDateForCalculation, today)
      );
    });

    if (habit.frequency.startsWith('weekly')) {
      let weeklyTarget = 1;
      if (habit.frequency === 'weekly2') weeklyTarget = 2;
      else if (habit.frequency === 'weekly3') weeklyTarget = 3;
      else if (habit.frequency === 'weekly4') weeklyTarget = 4;
      else if (habit.frequency === 'weekly5') weeklyTarget = 5;
      else if (habit.frequency === 'weekly6') weeklyTarget = 6;

      const creationWeekStart = new Date(creationDateForCalculation);
      const creationWeekday = creationDateForCalculation.getDay();
      const daysToCreationMonday = creationWeekday === 0 ? -6 : 1 - creationWeekday;
      creationWeekStart.setDate(creationDateForCalculation.getDate() + daysToCreationMonday);

      const currentTodayWeekday = today.getDay();
      const currentDaysToSunday = currentTodayWeekday === 0 ? 0 : 7 - currentTodayWeekday;
      const currentWeekSunday = new Date(today);
      currentWeekSunday.setDate(today.getDate() + currentDaysToSunday);

      const totalCalculatedWeeks: Array<{ start: Date; end: Date }> = [];
      let tempWeekStart = new Date(creationWeekStart);

      while (tempWeekStart <= currentWeekSunday) {
        const tempWeekEnd = new Date(tempWeekStart);
        tempWeekEnd.setDate(tempWeekStart.getDate() + 6);
        if (tempWeekEnd > currentWeekSunday) {
          tempWeekEnd.setTime(currentWeekSunday.getTime());
        }

        if (tempWeekEnd >= creationDateForCalculation) {
          totalCalculatedWeeks.push({
            start: new Date(tempWeekStart),
            end: tempWeekEnd
          });
        }

        tempWeekStart.setDate(tempWeekStart.getDate() + 7);
      }

      let completedWeeks = 0;
      for (const week of totalCalculatedWeeks) {
        let weekCompletedCount = 0;
        for (const record of habit.calendar) {
          const recordDate = parseDate(record.date);
          recordDate.setHours(0, 0, 0, 0);
          if (
            recordDate >= week.start &&
            recordDate <= week.end &&
            recordDate >= creationDateForCalculation &&
            recordDate <= today &&
            record.completed
          ) {
            weekCompletedCount += record.completedCount || 1;
          }
        }
        if (weekCompletedCount >= weeklyTarget) {
          completedWeeks++;
        }
      }

      const totalCalculatedWeeksCount = totalCalculatedWeeks.length;
      const completionRate =
        totalCalculatedWeeksCount > 0 ? (completedWeeks / totalCalculatedWeeksCount) * 100 : 0;
      return Math.round(completionRate);
    }

    const completedDays = monthRecords.filter(record => record.completed).length;
    let totalDaysInPeriod = 0;

    if (
      creationDateForCalculation.getMonth() === currentMonth &&
      creationDateForCalculation.getFullYear() === currentYear
    ) {
      const creationDateLocal = new Date(
        creationDateForCalculation.getFullYear(),
        creationDateForCalculation.getMonth(),
        creationDateForCalculation.getDate()
      );
      const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      totalDaysInPeriod = Math.floor((todayLocal.getTime() - creationDateLocal.getTime()) / 86400000) + 1;
    } else {
      totalDaysInPeriod = today.getDate();
    }

    if (
      creationDateForCalculation.getMonth() === currentMonth &&
      creationDateForCalculation.getFullYear() === currentYear &&
      creationDateForCalculation.getDate() === today.getDate() &&
      creationDateForCalculation.getMonth() === today.getMonth() &&
      creationDateForCalculation.getFullYear() === today.getFullYear()
    ) {
      const todayRecord = habit.calendar.find(record => record.date === formatDate(today));
      if (todayRecord && todayRecord.completed) {
        return 100;
      }
    }

    const completionRate = totalDaysInPeriod > 0 ? (completedDays / totalDaysInPeriod) * 100 : 0;
    return Math.round(completionRate);
  };

  const getNormalizedDate = (date: Date | string | Habit) => {
    const inputDate = typeof date === 'string' || date instanceof Date ? date : date.createdAt;
    const normalizedDate = new Date(inputDate);
    normalizedDate.setHours(0, 0, 0, 0);
    return normalizedDate;
  };

  const getMonthRecords = (habit: Habit, currentYear: number, currentMonth: number) => {
    const creationDate = getNormalizedDate(habit);

    return habit.calendar.filter(record => {
      const recordDate = getNormalizedDate(record.date);
      return (
        recordDate.getFullYear() === currentYear &&
        recordDate.getMonth() === currentMonth &&
        recordDate >= creationDate
      );
    });
  };

  const calculateCurrentMonthStreak = (habit: Habit) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    const creationDate = getNormalizedDate(habit);
    const monthRecords = getMonthRecords(habit, currentYear, currentMonth).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    if (monthRecords.length === 0) {
      return 0;
    }

    let streak = 0;
    const todayStr = getToday();
    const currentDate = new Date(today);

    const todayRecord = habit.calendar.find(record => record.date === todayStr);
    if (todayRecord && todayRecord.completed) {
      streak++;
    }

    for (let i = 1; ; i++) {
      const checkDate = new Date(currentDate);
      checkDate.setDate(currentDate.getDate() - i);
      const checkDateStr = formatDate(checkDate);

      if (checkDate.getMonth() !== currentMonth || checkDate.getFullYear() !== currentYear) {
        break;
      }

      if (checkDate < creationDate) {
        break;
      }

      const record = habit.calendar.find(r => r.date === checkDateStr);
      if (record && record.completed) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  const calculateTotalMonthCompletions = (habit: Habit) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const monthRecords = getMonthRecords(habit, currentYear, currentMonth);
    return monthRecords.filter(record => record.completed).length;
  };

  const calculateLongestStreak = (habit: Habit) => {
    const cacheKey = `${habit.id}-longestStreak-${getDayBucket()}`;

    const cached = getCachedValue(longestStreakCache, cacheKey, CACHE_TTL);
    if (cached !== null) return cached;

    if (!habit.calendar?.length) {
      const result = { streak: 0, startDate: null, endDate: null };
      setCachedValue(longestStreakCache, cacheKey, result, MAX_CACHE_SIZE);
      return result;
    }

    const sortedCalendar = [...habit.calendar]
      .filter(record => record.completed)
      .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());

    if (sortedCalendar.length === 0) {
      const result = { streak: 0, startDate: null, endDate: null };
      setCachedValue(longestStreakCache, cacheKey, result, MAX_CACHE_SIZE);
      return result;
    }

    let maxStreak = 0;
    let currentStreak = 0;
    let previousDate: Date | null = null;
    let maxStreakStartDate: Date | null = null;
    let maxStreakEndDate: Date | null = null;
    let currentStreakStartDate: Date | null = null;

    for (const record of sortedCalendar) {
      const currentDate = new Date(record.date);

      if (previousDate === null) {
        currentStreak = 1;
        currentStreakStartDate = new Date(currentDate);
      } else {
        const diffDays = Math.floor((currentDate.getTime() - previousDate.getTime()) / 86400000);

        if (diffDays === 1) {
          currentStreak++;
        } else if (diffDays > 1) {
          if (currentStreak > maxStreak) {
            maxStreak = currentStreak;
            maxStreakStartDate = currentStreakStartDate;
            maxStreakEndDate = new Date(previousDate);
          }
          currentStreak = 1;
          currentStreakStartDate = new Date(currentDate);
        }
      }

      previousDate = currentDate;
    }

    if (currentStreak > maxStreak) {
      maxStreak = currentStreak;
      maxStreakStartDate = currentStreakStartDate;
      maxStreakEndDate = previousDate;
    } else if (maxStreak === 0 && currentStreak > 0) {
      maxStreak = currentStreak;
      maxStreakStartDate = currentStreakStartDate;
      maxStreakEndDate = previousDate;
    }

    const result = { streak: maxStreak, startDate: maxStreakStartDate, endDate: maxStreakEndDate };
    setCachedValue(longestStreakCache, cacheKey, result, MAX_CACHE_SIZE);
    return result;
  };

  const calculateCommonTimeSlot = (habit: Habit) => {
    const completedRecordsWithTimestamp = habit.calendar.filter(record => record.completed && record.timestamp);
    if (completedRecordsWithTimestamp.length === 0) {
      return translate('habitTracker.noCheckins');
    }

    const hourCounts: Record<number, number> = {};
    for (const record of completedRecordsWithTimestamp) {
      if (record.timestamp) {
        const date = new Date(record.timestamp);
        const hour = date.getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    }

    let mostCommonHour = -1;
    let maxCount = 0;
    for (const hourStr in hourCounts) {
      const hour = parseInt(hourStr);
      const count = hourCounts[hour];
      if (count > maxCount) {
        maxCount = count;
        mostCommonHour = hour;
      }
    }

    if (mostCommonHour === -1) {
      return translate('habitTracker.noCheckins');
    }

    return formatTemplate('habitTracker.commonTimeSlotTemplate', {
      start: mostCommonHour,
      end: mostCommonHour + 1
    });
  };

  const getHourDistribution = (habit: Habit | null) => {
    if (!habit) {
      return Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
    }

    const completedRecordsWithTimestamp = habit.calendar.filter(record => record.completed && record.timestamp);
    if (completedRecordsWithTimestamp.length === 0) {
      return Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
    }

    const hourCounts: Record<number, number> = {};
    for (const record of completedRecordsWithTimestamp) {
      if (record.timestamp) {
        const date = new Date(record.timestamp);
        const hour = date.getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    }

    return Array.from({ length: 24 }, (_, hour) => ({ hour, count: hourCounts[hour] || 0 }));
  };

  const calculateWeeklyHabitCompletionRate = (habit: Habit) => {
    const { creationDate, today } = getActiveDateRange(habit);

    const creationWeekday = creationDate.getDay();
    const daysToCreationMonday = creationWeekday === 0 ? -6 : 1 - creationWeekday;
    const creationWeekStart = new Date(creationDate);
    creationWeekStart.setDate(creationDate.getDate() + daysToCreationMonday);

    const currentTodayWeekday = today.getDay();
    const currentDaysToSunday = currentTodayWeekday === 0 ? 0 : 7 - currentTodayWeekday;
    const currentWeekSunday = new Date(today);
    currentWeekSunday.setDate(today.getDate() + currentDaysToSunday);

    const totalCalculatedWeeks: Array<{ start: Date; end: Date }> = [];
    let tempWeekStart = new Date(creationWeekStart);

    while (tempWeekStart <= currentWeekSunday) {
      const tempWeekEnd = new Date(tempWeekStart);
      tempWeekEnd.setDate(tempWeekStart.getDate() + 6);

      if (tempWeekEnd > currentWeekSunday) {
        tempWeekEnd.setTime(currentWeekSunday.getTime());
      }

      if (tempWeekEnd >= creationDate) {
        totalCalculatedWeeks.push({
          start: new Date(tempWeekStart),
          end: tempWeekEnd
        });
      }

      tempWeekStart.setDate(tempWeekStart.getDate() + 7);
    }

    let weeklyTarget = 1;
    if (habit.frequency === 'weekly2') weeklyTarget = 2;
    else if (habit.frequency === 'weekly3') weeklyTarget = 3;
    else if (habit.frequency === 'weekly4') weeklyTarget = 4;
    else if (habit.frequency === 'weekly5') weeklyTarget = 5;
    else if (habit.frequency === 'weekly6') weeklyTarget = 6;

    let completedWeeks = 0;
    for (const week of totalCalculatedWeeks) {
      let weekCompletedCount = 0;
      for (const record of habit.calendar) {
          const recordDate = parseDate(record.date);
          recordDate.setHours(0, 0, 0, 0);
          if (
            recordDate >= week.start &&
            recordDate <= week.end &&
            isRecordInActiveDateRange(recordDate, creationDate, today) &&
            record.completed
          ) {
          weekCompletedCount += record.completedCount || 1;
        }
      }

      if (weekCompletedCount >= weeklyTarget) {
        completedWeeks++;
      }
    }

    const totalCalculatedWeeksCount = totalCalculatedWeeks.length;
    const rate = totalCalculatedWeeksCount > 0 ? (completedWeeks / totalCalculatedWeeksCount) * 100 : 0;
    return Math.round(rate);
  };

  const calculateTotalCompletionRate = (habit: Habit) => {
    const cacheKey = `${habit.id}-completionRate-${getDayBucket()}`;

    const cached = getCachedValue(completionRateCache, cacheKey, CACHE_TTL);
    if (cached !== null) return cached;

    if (!habit.calendar?.length) {
      setCachedValue(completionRateCache, cacheKey, 0, MAX_CACHE_SIZE);
      return 0;
    }

    if (habit.frequency.startsWith('weekly')) {
      const result = calculateWeeklyHabitCompletionRate(habit);
      setCachedValue(completionRateCache, cacheKey, result, MAX_CACHE_SIZE);
      return result;
    }

    const { creationDate, today } = getActiveDateRange(habit);
    const completedCount = habit.calendar.reduce((count, record) => {
      const recordDate = parseDate(record.date);
      recordDate.setHours(0, 0, 0, 0);
      return record.completed && isRecordInActiveDateRange(recordDate, creationDate, today)
        ? count + 1
        : count;
    }, 0);

    const totalDays = Math.floor((today.getTime() - creationDate.getTime()) / 86400000) + 1;

    if (totalDays <= 0) {
      setCachedValue(completionRateCache, cacheKey, 0, MAX_CACHE_SIZE);
      return 0;
    }

    const finalResult = Math.round((completedCount / totalDays) * 100);
    setCachedValue(completionRateCache, cacheKey, finalResult, MAX_CACHE_SIZE);
    return finalResult;
  };

  // 聚合统计：一次遍历 habits + calendar，产出 totalCompletions、longestStreak、heatmap 等
  // 避免原先 4 个独立 computed 各遍历一次全部数据的 O(4n) 问题
  const _aggregatedStats = computed(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() - daysToSubtract);
    const startMonday = new Date(thisMonday);
    startMonday.setDate(thisMonday.getDate() - 17 * 7);

    let totalCompletions = 0;
    let maxStreak = 0;

    // heatmap 原始数据收集
    const heatmapCountMap = new Map<string, number>();

    for (const habit of habits.value) {
      // 总计完成次数
      for (const record of habit.calendar) {
        if (record.completed) {
          totalCompletions++;

          // 热力图数据
          const recordDate = parseDate(record.date);
          if (recordDate >= startMonday && recordDate <= today) {
            const dateStr = formatDate(recordDate);
            heatmapCountMap.set(dateStr, (heatmapCountMap.get(dateStr) || 0) + 1);
          }
        }
      }

      // 最长连续打卡（calculateLongestStreak 内部有日级缓存）
      const streakResult = calculateLongestStreak(habit);
      if (streakResult.streak > maxStreak) {
        maxStreak = streakResult.streak;
      }
    }

    // 构建热力图网格
    const maxCount = heatmapCountMap.size > 0
      ? Math.max(...heatmapCountMap.values(), 1)
      : 1;

    const weeks: Array<
      Array<{ date: string; count: number; intensity: number; isCurrentYear: boolean }>
    > = [[], [], [], [], [], [], []];
    const totalDays = 18 * 7;
    const cursor = new Date(startMonday);

    for (let i = 0; i < totalDays; i++) {
      cursor.setHours(0, 0, 0, 0);
      const dateStr = formatDate(cursor);
      const count = heatmapCountMap.get(dateStr) || 0;
      const day = cursor.getDay();
      const dayIdx = day === 0 ? 6 : day - 1;

      let intensity = 0;
      if (maxCount > 0 && count > 0) {
        if (count < maxCount * 0.25) intensity = 1;
        else if (count < maxCount * 0.5) intensity = 2;
        else if (count < maxCount * 0.75) intensity = 3;
        else intensity = 4;
      }

      weeks[dayIdx].push({
        date: dateStr,
        count,
        intensity,
        isCurrentYear: cursor.getFullYear() === today.getFullYear()
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    // 由 weeks 推导 heatmapMonths
    const datePositions = new Map<string, { year: number; month: number; position: number }>();
    for (let dayOfWeekIdx = 0; dayOfWeekIdx < weeks.length; dayOfWeekIdx++) {
      const daysOfThisWeekday = weeks[dayOfWeekIdx];
      for (let dateIndex = 0; dateIndex < daysOfThisWeekday.length; dateIndex++) {
        const day = daysOfThisWeekday[dateIndex];
        const date = parseDate(day.date);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        if (!datePositions.has(monthKey)) {
          datePositions.set(monthKey, {
            year: date.getFullYear(),
            month: date.getMonth(),
            position: dateIndex
          });
        }
      }
    }

    const heatmapMonthLabels = Array.from(datePositions.values())
      .sort((a, b) => a.position - b.position)
      .slice(1)
      .map(pos => ({
        monthLabel: formatTemplate('date.monthLabelTemplate', {
          month: String(pos.month + 1).padStart(2, '0')
        }),
        offset: (pos.position / 17) * 100
      }));

    return {
      totalHabits: habits.value.length,
      totalCompletions,
      maxStreak,
      heatmapGrid: {
        weeks,
        startDate: formatDate(startMonday),
        endDate: formatDate(cursor),
        maxCount
      },
      heatmapMonthLabels
    };
  });

  const totalHabitsCount = computed(() => _aggregatedStats.value.totalHabits);
  const totalCompletionsCount = computed(() => _aggregatedStats.value.totalCompletions);
  const longestStreak = computed(() => _aggregatedStats.value.maxStreak);
  const heatmapGridData = computed(() => _aggregatedStats.value.heatmapGrid);
  const heatmapMonths = computed(() => _aggregatedStats.value.heatmapMonthLabels);

  return {
    calculateCurrentStreak,
    getWeeklyCompletionStatus,
    clearCompletionRateCacheForHabit,
    clearWeeklyCompletionCacheForHabit,
    clearCurrentStreakCacheForHabit,
    cleanupExpiredStatisticCaches,
    getMonthlyProgressData,
    calculateCompletionRate,
    calculateCurrentMonthStreak,
    calculateTotalMonthCompletions,
    calculateLongestStreak,
    calculateCommonTimeSlot,
    getHourDistribution,
    calculateTotalCompletionRate,
    totalHabitsCount,
    totalCompletionsCount,
    longestStreak,
    heatmapGridData,
    heatmapMonths
  };
};
