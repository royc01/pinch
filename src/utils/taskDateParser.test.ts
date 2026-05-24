import { describe, expect, it } from 'vitest';
import { inferTaskDateFromText, inferTaskDateRangeFromText } from './taskDateParser';

const NOW = new Date(2026, 4, 14, 9, 0, 0);
const MAY_19 = new Date(2026, 4, 19, 9, 0, 0);

describe('taskDateParser', () => {
  it('parses Chinese relative dates', () => {
    expect(inferTaskDateFromText('明天提交报告', { locale: 'zh_CN', now: NOW })).toBe('2026-05-15');
    expect(inferTaskDateFromText('大后天回访', { locale: 'zh_CN', now: NOW })).toBe('2026-05-17');
  });

  it('parses Chinese weekday dates', () => {
    expect(inferTaskDateFromText('下周三开会', { locale: 'zh_CN', now: NOW })).toBe('2026-05-20');
    expect(inferTaskDateFromText('周末复盘', { locale: 'zh_CN', now: NOW })).toBe('2026-05-16');
  });

  it('parses English relative dates', () => {
    expect(inferTaskDateFromText('Submit tomorrow', { locale: 'en_US', now: NOW })).toBe('2026-05-15');
    expect(inferTaskDateFromText('Review the day after tomorrow', { locale: 'en_US', now: NOW })).toBe('2026-05-16');
  });

  it('parses English weekday dates', () => {
    expect(inferTaskDateFromText('Review next Monday', { locale: 'en_US', now: NOW })).toBe('2026-05-18');
    expect(inferTaskDateFromText('Ship next week Monday', { locale: 'en_US', now: NOW })).toBe('2026-05-25');
  });

  it('parses English month-name dates', () => {
    expect(inferTaskDateFromText('Release on May 20', { locale: 'en_US', now: NOW })).toBe('2026-05-20');
    expect(inferTaskDateFromText('Launch 21 May 2026', { locale: 'en_US', now: NOW })).toBe('2026-05-21');
  });

  it('keeps a cross-locale fallback for existing Chinese titles', () => {
    expect(inferTaskDateFromText('明天跟进', { locale: 'en_US', now: NOW })).toBe('2026-05-15');
  });

  it('parses Chinese numeric date ranges', () => {
    expect(inferTaskDateRangeFromText('项目冲刺 5月16日-5月18日', { locale: 'zh_CN', now: NOW })).toEqual({
      startDate: '2026-05-16',
      dueDate: '2026-05-18',
    });
    expect(inferTaskDateRangeFromText('出差 5月16日到18日', { locale: 'zh_CN', now: NOW })).toEqual({
      startDate: '2026-05-16',
      dueDate: '2026-05-18',
    });
  });

  it('parses start and due semantics', () => {
    expect(inferTaskDateRangeFromText('开始5月16日整理资料', { locale: 'zh_CN', now: NOW })).toEqual({
      startDate: '2026-05-16',
    });
    expect(inferTaskDateRangeFromText('截止5月18日提交', { locale: 'zh_CN', now: NOW })).toEqual({
      dueDate: '2026-05-18',
    });
  });

  it('parses natural language date ranges', () => {
    expect(inferTaskDateRangeFromText('明天-后天写方案', { locale: 'zh_CN', now: NOW })).toEqual({
      startDate: '2026-05-15',
      dueDate: '2026-05-16',
    });
    expect(inferTaskDateRangeFromText('下周一到周五出差', { locale: 'zh_CN', now: NOW })).toEqual({
      startDate: '2026-05-18',
      dueDate: '2026-05-22',
    });
    expect(inferTaskDateRangeFromText('下周一到周五出差', { locale: 'zh_CN', now: MAY_19 })).toEqual({
      startDate: '2026-05-25',
      dueDate: '2026-05-29',
    });
    expect(inferTaskDateRangeFromText('今天到周末复盘', { locale: 'zh_CN', now: NOW })).toEqual({
      startDate: '2026-05-14',
      dueDate: '2026-05-16',
    });
  });

  it('parses two-sided start and due semantics', () => {
    expect(inferTaskDateRangeFromText('从5月16日开始，5月18日截止', { locale: 'zh_CN', now: NOW })).toEqual({
      startDate: '2026-05-16',
      dueDate: '2026-05-18',
    });
    expect(inferTaskDateRangeFromText('5月18日前完成，5月16日启动', { locale: 'zh_CN', now: NOW })).toEqual({
      startDate: '2026-05-16',
      dueDate: '2026-05-18',
    });
  });

  it('parses English natural language ranges', () => {
    expect(inferTaskDateRangeFromText('Plan next Monday to Friday', { locale: 'en_US', now: NOW })).toEqual({
      startDate: '2026-05-18',
      dueDate: '2026-05-22',
    });
  });

  it('parses time points with dates', () => {
    expect(inferTaskDateRangeFromText('明天10:30提交报告', { locale: 'zh_CN', now: NOW })).toEqual({
      startDate: '2026-05-15',
      dueDate: '2026-05-15',
      startTime: '10:30',
      dueTime: '10:30',
    });
    expect(inferTaskDateRangeFromText('明天下午3点开会', { locale: 'zh_CN', now: NOW })).toEqual({
      startDate: '2026-05-15',
      dueDate: '2026-05-15',
      startTime: '15:00',
      dueTime: '15:00',
    });
    expect(inferTaskDateRangeFromText('5月18日18:00截止', { locale: 'zh_CN', now: NOW })).toEqual({
      dueDate: '2026-05-18',
      dueTime: '18:00',
    });
  });

  it('parses start and due times separately', () => {
    expect(inferTaskDateRangeFromText('明天9点到后天18点写方案', { locale: 'zh_CN', now: NOW })).toEqual({
      startDate: '2026-05-15',
      dueDate: '2026-05-16',
      startTime: '09:00',
      dueTime: '18:00',
    });
    expect(inferTaskDateRangeFromText('从5月16日上午9点开始，5月18日下午6点截止', { locale: 'zh_CN', now: NOW })).toEqual({
      startDate: '2026-05-16',
      dueDate: '2026-05-18',
      startTime: '09:00',
      dueTime: '18:00',
    });
  });

  it('parses English time points', () => {
    expect(inferTaskDateRangeFromText('Submit tomorrow 3pm', { locale: 'en_US', now: NOW })).toEqual({
      startDate: '2026-05-15',
      dueDate: '2026-05-15',
      startTime: '15:00',
      dueTime: '15:00',
    });
  });

  it('accepts custom date keywords from options', () => {
    expect(inferTaskDateRangeFromText('5月18日交付，5月16日开工', {
      locale: 'zh_CN',
      now: NOW,
      keywords: {
        start: ['开工'],
        due: ['交付'],
      },
    })).toEqual({
      startDate: '2026-05-16',
      dueDate: '2026-05-18',
    });

    expect(inferTaskDateRangeFromText('排期 5月16日=>5月18日', {
      locale: 'zh_CN',
      now: NOW,
      keywords: {
        range: ['=>'],
      },
    })).toEqual({
      startDate: '2026-05-16',
      dueDate: '2026-05-18',
    });
  });

  it('accepts custom time period keywords from options', () => {
    expect(inferTaskDateRangeFromText('明天午后3点交付', {
      locale: 'zh_CN',
      now: NOW,
      keywords: {
        due: ['交付'],
        afternoon: ['午后'],
      },
    })).toEqual({
      dueDate: '2026-05-15',
      dueTime: '15:00',
    });
  });

  it('ignores unsafe short custom semantic keywords', () => {
    expect(inferTaskDateRangeFromText('5月18日交，5月16日开', {
      locale: 'zh_CN',
      now: NOW,
      keywords: {
        start: ['开'],
        due: ['交'],
      },
    })).toEqual({
      startDate: '2026-05-18',
      dueDate: '2026-05-18',
    });
  });
});
