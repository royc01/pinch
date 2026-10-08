import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import TaskEditorProtyleBody from '../TaskEditorProtyleBody.vue';

describe('TaskEditorProtyleBody', () => {
  it('commits the current textarea value when adding a description', async () => {
    const wrapper = mount(TaskEditorProtyleBody, {
      props: {
        showDescriptionControl: true,
        description: '',
        hasDescription: false,
        addDescriptionLabel: 'Add description'
      },
      global: {
        stubs: { Icon: true }
      }
    });

    await wrapper.get('.task-editor-add-description-btn').trigger('click');
    const textarea = wrapper.get<HTMLTextAreaElement>('.task-editor-description-input');
    await textarea.setValue('New description');
    await textarea.trigger('blur');

    expect(wrapper.emitted('update:description')).toEqual([['New description']]);
    expect(wrapper.emitted('commit-description')).toEqual([['New description']]);
  });
});
