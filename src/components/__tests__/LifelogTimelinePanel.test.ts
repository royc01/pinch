import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import LifelogTimelinePanel, { type LifelogTimelinePanelItem } from '../LifelogTimelinePanel.vue';

function makeItem(overrides: Partial<LifelogTimelinePanelItem> = {}): LifelogTimelinePanelItem {
  return {
    id: 'item-1',
    type: 'task-completed',
    timeLabel: '10:00',
    sortMinutes: 600,
    title: 'Example item',
    meta: '',
    note: '',
    icon: 'check',
    ...overrides
  };
}

function mountPanel(item: LifelogTimelinePanelItem) {
  return mount(LifelogTimelinePanel, {
    props: {
      show: true,
      title: 'Timeline',
      subtitle: '',
      items: [item],
      emptyText: 'Empty',
      closeLabel: 'Close',
      deleteLabel: 'Delete'
    },
    global: {
      stubs: {
        Icon: true,
        EmojiIcon: true
      }
    }
  });
}

describe('LifelogTimelinePanel annotations', () => {
  it('adds an annotation without changing the item note', async () => {
    const item = makeItem({ note: 'Original task description', annotationEditable: true });
    const wrapper = mountPanel(item);

    expect(wrapper.find('.lifelog-timeline-note').text()).toBe('Original task description');
    await wrapper.find('.lifelog-timeline-annotation-add').trigger('click');

    const input = wrapper.find('.lifelog-timeline-note-input');
    await input.setValue('Finished without interruptions');
    await input.trigger('keydown', { ctrlKey: true, key: 'Enter' });

    expect(wrapper.emitted('update-annotation')).toEqual([[item, 'Finished without interruptions']]);
    expect(wrapper.emitted('update-item')).toBeUndefined();
  });

  it('emits an empty annotation when an existing annotation is cleared', async () => {
    const item = makeItem({ annotation: 'Previous reflection', annotationEditable: true });
    const wrapper = mountPanel(item);

    await wrapper.find('.lifelog-timeline-annotation.is-editable').trigger('click');
    const input = wrapper.find('.lifelog-timeline-note-input');
    await input.setValue('');
    await input.trigger('keydown', { ctrlKey: true, key: 'Enter' });

    expect(wrapper.emitted('update-annotation')).toEqual([[item, '']]);
  });

  it('keeps the existing editable note event path', async () => {
    const item = makeItem({ type: 'manual-note', note: 'Original manual note', editable: true });
    const wrapper = mountPanel(item);

    await wrapper.find('.lifelog-timeline-note.is-editable').trigger('click');
    const input = wrapper.find('.lifelog-timeline-note-input');
    await input.setValue('Updated manual note');
    await input.trigger('keydown', { ctrlKey: true, key: 'Enter' });

    expect(wrapper.emitted('update-item')).toEqual([[item, 'Updated manual note']]);
    expect(wrapper.emitted('update-annotation')).toBeUndefined();
  });
});
