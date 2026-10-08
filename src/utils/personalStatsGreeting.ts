export type GreetingPeriod = 'earlyMorning' | 'morning' | 'noon' | 'afternoon' | 'dusk' | 'evening' | 'night';

export const PERSONAL_STATS_QUOTE_COUNT = 100;

export function createPersonalStatsQuote(date = new Date(), random = Math.random) {
  return {
    dateKey: `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`,
    messageKey: `personalStats.quote.${Math.floor(random() * PERSONAL_STATS_QUOTE_COUNT) + 1}`,
    values: { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() }
  };
}

export function getGreetingPeriod(date: Date): GreetingPeriod {
  const minutes = date.getHours() * 60 + date.getMinutes();
  if (minutes < 300 || minutes >= 1380) return 'night';
  if (minutes < 540) return 'earlyMorning';
  if (minutes < 690) return 'morning';
  if (minutes < 810) return 'noon';
  if (minutes < 1050) return 'afternoon';
  if (minutes < 1140) return 'dusk';
  return 'evening';
}

export function getGreetingContextKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${getGreetingPeriod(date)}`;
}

export function createPersonalStatsGreeting(date = new Date(), random = Math.random) {
  const period = getGreetingPeriod(date);
  const keys = [1, 2, 3].map(index => `personalStats.greeting.${period}${index}`);
  // Keep late-night messages focused on rest, even at week or month boundaries.
  if (period !== 'night') {
    keys.push(`personalStats.greeting.weekday${date.getDay()}`, 'personalStats.greeting.date');
    if (date.getDate() === 1) keys.push('personalStats.greeting.monthStart');
    if (date.getDate() === new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()) {
      keys.push('personalStats.greeting.monthEnd');
    }
  }
  return {
    contextKey: getGreetingContextKey(date),
    messageKey: keys[Math.floor(random() * keys.length)],
    values: { month: date.getMonth() + 1, day: date.getDate() }
  };
}
