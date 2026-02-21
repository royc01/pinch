import { ref, Ref } from 'vue';

export function useHabitCache() {
  const dateCache = ref(new Map<number, string>());
  const dateParseCache = ref(new Map<string, Date>());
  const todayCache = ref<string | null>(null);
  const todayCacheTime = ref(0);
  const CACHE_DURATION = 60000;

  const getCachedDate = (date: Date): string => {
    const key = date.getTime();
    if (!dateCache.value.has(key)) {
      const formatted = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      dateCache.value.set(key, formatted);
      if (dateCache.value.size > 1000) {
        const firstKey = dateCache.value.keys().next().value;
        dateCache.value.delete(firstKey);
      }
    }
    return dateCache.value.get(key)!;
  };

  const getCachedDateParse = (dateStr: string): Date => {
    if (!dateParseCache.value.has(dateStr)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      dateParseCache.value.set(dateStr, date);
    }
    return dateParseCache.value.get(dateStr)!;
  };

  const getToday = (): string => {
    const now = Date.now();
    if (now - todayCacheTime.value > CACHE_DURATION || !todayCache.value) {
      const today = new Date();
      todayCache.value = getCachedDate(today);
      todayCacheTime.value = now;
    }
    return todayCache.value!;
  };

  const clearCache = (): void => {
    dateCache.value.clear();
    dateParseCache.value.clear();
    todayCache.value = null;
    todayCacheTime.value = 0;
  };

  return {
    getCachedDate,
    getCachedDateParse,
    getToday,
    clearCache
  };
}
