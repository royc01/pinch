import { describe, expect, it } from 'vitest';
import zhCN from '@/i18n/zh_CN.json';
import enUS from '@/i18n/en_US.json';
import { PERSONAL_STATS_QUOTE_COUNT, createPersonalStatsGreeting, createPersonalStatsQuote, getGreetingContextKey, getGreetingPeriod } from './personalStatsGreeting';

describe('personal stats quotes', () => {
  it('selects all preset quotes with Chinese and English translations', () => {
    const keys = new Set<string>();
    for (let index = 0; index < PERSONAL_STATS_QUOTE_COUNT; index++) {
      const quote = createPersonalStatsQuote(new Date(2026, 9, 7, 15), () => (index + 0.5) / PERSONAL_STATS_QUOTE_COUNT);
      keys.add(quote.messageKey);
      expect(quote.values).toEqual({ year: 2026, month: 10, day: 7 });
      expect((zhCN as Record<string, string>)[quote.messageKey]).toBeTruthy();
      expect((enUS as Record<string, string>)[quote.messageKey]).toBeTruthy();
    }
    expect(keys.size).toBe(100);
    for (const messages of [zhCN, enUS]) {
      const presetKeys = Object.keys(messages).filter(key => /^personalStats\.quote\.\d+$/.test(key));
      expect(new Set(presetKeys)).toEqual(keys);
      expect(new Set(presetKeys.map(key => (messages as Record<string, string>)[key])).size).toBe(100);
    }
  });

  it('changes the local date key at the year boundary', () => {
    const before = createPersonalStatsQuote(new Date(2026, 11, 31, 23, 59), () => 0);
    const after = createPersonalStatsQuote(new Date(2027, 0, 1), () => 0.999);
    expect(before.dateKey).toBe('2026-12-31');
    expect(after.dateKey).toBe('2027-1-1');
    expect(after.values).toEqual({ year: 2027, month: 1, day: 1 });
    expect(after.messageKey).toBe('personalStats.quote.100');
  });
});

describe('personal stats greetings', () => {
  it.each([
    [4, 59, 'night'], [5, 0, 'earlyMorning'],
    [8, 59, 'earlyMorning'], [9, 0, 'morning'],
    [11, 29, 'morning'], [11, 30, 'noon'],
    [13, 29, 'noon'], [13, 30, 'afternoon'],
    [17, 29, 'afternoon'], [17, 30, 'dusk'],
    [18, 59, 'dusk'], [19, 0, 'evening'],
    [22, 59, 'evening'], [23, 0, 'night']
  ])('uses the right period at %i:%i', (hour, minute, period) => {
    expect(getGreetingPeriod(new Date(2026, 9, 7, Number(hour), Number(minute)))).toBe(period);
  });

  it('includes weekday, date, month start and leap-year month end messages', () => {
    const monday = new Date(2026, 9, 5, 10);
    expect(createPersonalStatsGreeting(monday, () => 0.65).messageKey).toBe('personalStats.greeting.weekday1');
    expect(createPersonalStatsGreeting(monday, () => 0.99)).toMatchObject({
      messageKey: 'personalStats.greeting.date', values: { month: 10, day: 5 }
    });
    expect(createPersonalStatsGreeting(new Date(2026, 9, 1, 10), () => 0.99).messageKey).toBe('personalStats.greeting.monthStart');
    expect(createPersonalStatsGreeting(new Date(2028, 1, 29, 10), () => 0.99).messageKey).toBe('personalStats.greeting.monthEnd');
  });

  it('keeps late-night messages about rest and refreshes the context at midnight', () => {
    const before = new Date(2026, 9, 31, 23, 59);
    const after = new Date(2026, 10, 1, 0, 0);
    for (const date of [before, after]) {
      for (const random of [0, 0.5, 0.999]) {
        expect(createPersonalStatsGreeting(date, () => random).messageKey).toMatch(/\.night[123]$/);
      }
    }
    expect(getGreetingContextKey(before)).not.toBe(getGreetingContextKey(after));
    expect(getGreetingContextKey(new Date(2026, 9, 7, 11, 30))).toBe(getGreetingContextKey(new Date(2026, 9, 7, 13, 29)));
  });

  it('has Chinese and English translations for every possible selection', () => {
    const selectedKeys = new Set<string>();
    for (let day = 1; day <= 31; day++) {
      for (const hour of [0, 6, 10, 12, 15, 18, 20]) {
        for (let sample = 0; sample < 100; sample++) {
          selectedKeys.add(createPersonalStatsGreeting(new Date(2026, 9, day, hour), () => sample / 100).messageKey);
        }
      }
    }
    for (const key of selectedKeys) {
      expect((zhCN as Record<string, string>)[key]).toBeTruthy();
      expect((enUS as Record<string, string>)[key]).toBeTruthy();
    }
    expect(selectedKeys.size).toBe(31);
  });
});
