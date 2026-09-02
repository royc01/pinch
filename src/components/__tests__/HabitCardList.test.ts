import { describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
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

const mountHabitCardList = (sortedHabits = [habit]) => mount(HabitCardList, {
  props: {
    sortedHabits,
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
  it('opens an action menu on a card context menu', async () => {
    const wrapper = mountHabitCardList();

    await wrapper.find('.habit-card').trigger('contextmenu');

    expect(wrapper.find('.habit-context-menu').exists()).toBe(true);
    expect(wrapper.find('.habit-context-menu').text()).toContain('habitTracker.startFocus');
  });

  it('emits the selected context-menu action', async () => {
    const wrapper = mountHabitCardList();
    await wrapper.find('.habit-card').trigger('contextmenu');

    await wrapper.findAll('.habit-context-menu button')
      .find(button => button.text() === 'habitTracker.editHabit')!
      .trigger('click');

    expect(wrapper.emitted('edit')).toEqual([[habit]]);
  });

  it('emits stats, pause, and delete actions from the context menu', async () => {
    const wrapper = mountHabitCardList();
    await wrapper.find('.habit-card').trigger('contextmenu');

    const clickAction = async (label: string) => {
      await wrapper.findAll('.habit-context-menu button')
        .find(button => button.text() === label)!
        .trigger('click');
    };

    await clickAction('habitTracker.statsView');
    expect(wrapper.emitted('show-stats')).toEqual([[habit]]);

    await wrapper.find('.habit-card').trigger('contextmenu');
    await clickAction('habitTracker.pauseHabit');
    expect(wrapper.emitted('toggle-pause')).toEqual([[habit]]);

    await wrapper.find('.habit-card').trigger('contextmenu');
    await clickAction('habitTracker.deleteHabit');
    expect(wrapper.emitted('delete')).toEqual([['habit-1']]);
  });

  it('does not render the legacy document binding control', () => {
    const wrapper = mountHabitCardList();

    expect(wrapper.find('.habit-doc-btn').exists()).toBe(false);
  });

  it('keeps native card dragging enabled by default for desktop', () => {
    const wrapper = mountHabitCardList();

    expect(wrapper.find('.habit-card').attributes('draggable')).toBe('true');
    wrapper.unmount();
  });

  it('starts a native desktop drag from the card body', async () => {
    const wrapper = mountHabitCardList();
    const card = wrapper.find('.habit-card');
    const dataTransfer = { effectAllowed: '', setData: vi.fn() };
    const dragStartEvent = new Event('dragstart', { bubbles: true, cancelable: true }) as DragEvent;
    Object.defineProperty(dragStartEvent, 'dataTransfer', { value: dataTransfer });

    card.element.dispatchEvent(dragStartEvent);
    await nextTick();

    expect(dragStartEvent.defaultPrevented).toBe(false);
    expect(dataTransfer.effectAllowed).toBe('move');
    expect(dataTransfer.setData).toHaveBeenCalledWith('application/x-pinch-habit-card', 'habit-1');
    expect(card.classes()).toContain('dragging');
    wrapper.unmount();
  });

  it('disables native dragging after touch interaction while keeping the menu available', async () => {
    const wrapper = mountHabitCardList();
    const card = wrapper.find('.habit-card');

    await card.trigger('touchstart');
    await nextTick();
    expect((card.element as HTMLElement).draggable).toBe(false);

    await card.trigger('contextmenu');
    expect(wrapper.find('.habit-context-menu').exists()).toBe(true);
    wrapper.unmount();
  });

  it('moves habits up and down from the context menu with boundary controls disabled', async () => {
    const secondHabit = { ...habit, id: 'habit-2', name: 'Walk' };
    const thirdHabit = { ...habit, id: 'habit-3', name: 'Write' };
    const wrapper = mountHabitCardList([habit, secondHabit, thirdHabit]);
    const [firstCard, , lastCard] = wrapper.findAll('.habit-card');
    const findAction = (label: string) => wrapper.findAll('.habit-context-menu button')
      .find(button => button.text() === label)!;

    await firstCard.trigger('contextmenu');
    expect(findAction('habitTracker.moveUp').attributes('disabled')).toBeDefined();
    expect(findAction('habitTracker.moveDown').attributes('disabled')).toBeUndefined();
    await findAction('habitTracker.moveDown').trigger('click');

    expect(wrapper.emitted('reorder')).toEqual([['habit-1', 'habit-2']]);

    await lastCard.trigger('contextmenu');
    expect(findAction('habitTracker.moveUp').attributes('disabled')).toBeUndefined();
    expect(findAction('habitTracker.moveDown').attributes('disabled')).toBeDefined();
    await findAction('habitTracker.moveUp').trigger('click');

    expect(wrapper.emitted('reorder')).toEqual([
      ['habit-1', 'habit-2'],
      ['habit-3', 'habit-2']
    ]);
    wrapper.unmount();
  });
});
