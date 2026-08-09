import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import HabitCardList from '../HabitCardList.vue';

const habit = {
  id: 'habit-1',
  name: 'Read',
  emoji: 'R',
  emojiColorIndex: 1,
  frequency: 'daily',
  completedToday: false,
  calendar: [],
  createdAt: '2026-01-01T00:00:00.000Z'
};

const mountHabitCardList = () => mount(HabitCardList, {
  props: {
    sortedHabits: [habit],
    isHabitListCollapsed: false,
    showAnimation: false,
    animationHabitId: null,
    activePomodoroHabitId: null,
    inlineCircumference: 0,
    inlineStrokeDashoffset: 0,
    t: (key: string) => key,
    getHabitCache: () => ({ weeklyCompleted: false, todayCompletionCount: 0, piePath: '' }),
    getCalendarViewData: () => [],
    isHabitScheduledToday: () => true,
    pomodoroStateClass: () => '',
    formatPomodoroTime: (seconds: number) => String(seconds)
  },
  global: {
    stubs: {
      Icon: true,
      EmojiIcon: true,
      SyButton: { template: '<button><slot /></button>' },
      SyCheckbox: true
    }
  }
});

describe('HabitCardList', () => {
  it('opens the habit editor on a card context menu', async () => {
    const wrapper = mountHabitCardList();

    await wrapper.find('.habit-card').trigger('contextmenu');

    expect(wrapper.emitted('edit')).toEqual([[habit]]);
  });

  it('does not render the legacy document binding control', () => {
    const wrapper = mountHabitCardList();

    expect(wrapper.find('.habit-doc-btn').exists()).toBe(false);
  });
});
