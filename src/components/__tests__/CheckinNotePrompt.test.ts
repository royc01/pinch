import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import CheckinNotePrompt from '../CheckinNotePrompt.vue';
import { CHECKIN_NOTE_PROMPT_EVENT } from '@/utils/checkinNotePrompt';

const { updateNote, settings } = vi.hoisted(() => ({
  updateNote: vi.fn(),
  settings: { focus: { checkinNotePrompt: true } }
}));

vi.mock('@/composables/useCheckinNotes', () => ({
  useCheckinNotes: () => ({ updateNote })
}));
vi.mock('@/composables/useUserSettings', () => ({
  useUserSettings: () => ({ data: settings })
}));
vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
  formatTemplate: (_key: string, values: { count: number }) => `${values.count} pending`
}));

function request(date: string, eventKey: string, anchor?: {
  left: number;
  top: number;
  right: number;
  bottom: number;
  bounds?: { left: number; top: number; right: number; bottom: number };
}): void {
  window.dispatchEvent(new CustomEvent(CHECKIN_NOTE_PROMPT_EVENT, { detail: { date, eventKey, anchor } }));
}

function mountPrompt() {
  return mount(CheckinNotePrompt, {
    attachTo: document.body,
    global: { stubs: { Teleport: true } }
  });
}

describe('CheckinNotePrompt', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    updateNote.mockReset();
    updateNote.mockResolvedValue(undefined);
    settings.focus.checkinNotePrompt = true;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('queues consecutive completion events and advances after skipping', async () => {
    const wrapper = mountPrompt();
    request('2026-08-09', 'habit:one:1');
    request('2026-08-09', 'task:two:2');
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.checkin-note-prompt-queue').text()).toBe('1 pending');
    await wrapper.find('.checkin-note-prompt-skip').trigger('click');
    await wrapper.find('textarea').setValue('Second note');
    await wrapper.find('.checkin-note-prompt-save').trigger('click');

    expect(updateNote).toHaveBeenCalledWith('2026-08-09', 'task:two:2', 'Second note');
    expect(wrapper.find('.checkin-note-prompt').exists()).toBe(false);
    wrapper.unmount();
  });

  it('keeps content visible when saving fails and allows retry', async () => {
    updateNote.mockRejectedValueOnce(new Error('write failed')).mockResolvedValueOnce(undefined);
    const wrapper = mountPrompt();
    request('2026-08-09', 'focus:session-1');
    await wrapper.vm.$nextTick();
    await wrapper.find('textarea').setValue('Keep this text');
    await wrapper.find('.checkin-note-prompt-save').trigger('click');

    expect(wrapper.find('textarea').element.value).toBe('Keep this text');
    expect(wrapper.find('.checkin-note-prompt-error').exists()).toBe(true);
    await wrapper.find('.checkin-note-prompt-save').trigger('click');
    expect(updateNote).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it('auto-skips untouched prompts but stops the timer after input', async () => {
    const wrapper = mountPrompt();
    request('2026-08-09', 'focus:auto-close');
    await wrapper.vm.$nextTick();
    vi.advanceTimersByTime(10_000);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.checkin-note-prompt').exists()).toBe(false);

    request('2026-08-09', 'focus:keep-open');
    await wrapper.vm.$nextTick();
    await wrapper.find('textarea').setValue('Typing');
    vi.advanceTimersByTime(10_000);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.checkin-note-prompt').exists()).toBe(true);
    wrapper.unmount();
  });

  it('treats a pointer click outside as skip', async () => {
    const wrapper = mountPrompt();
    request('2026-08-09', 'habit:outside:1');
    await wrapper.vm.$nextTick();
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.checkin-note-prompt').exists()).toBe(false);
    wrapper.unmount();
  });

  it('places the prompt next to the completed control when it has an anchor', async () => {
    const wrapper = mountPrompt();
    request('2026-08-09', 'task:anchored:1', { left: 600, top: 200, right: 624, bottom: 224 });
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    const style = wrapper.find('.checkin-note-prompt').attributes('style');
    expect(style).toContain('left: 600px');
    expect(style).toContain('top: 232px');
    expect(style).toContain('right: auto');
    wrapper.unmount();
  });

  it('keeps the prompt inside the completion control\'s panel bounds', async () => {
    const wrapper = mountPrompt();
    request('2026-08-09', 'habit:bounded:1', {
      left: 320,
      top: 200,
      right: 344,
      bottom: 224,
      bounds: { left: 0, top: 0, right: 360, bottom: 600 }
    });
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    const style = wrapper.find('.checkin-note-prompt').attributes('style');
    expect(style).toContain('width: 328px');
    expect(style).toContain('left: 16px');
    wrapper.unmount();
  });
});
