import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import SubtaskItem from '../SubtaskItem.vue';

describe('SubtaskItem', () => {
  it('renders inline title attributes through TaskTitleRich', () => {
    const wrapper = mount(SubtaskItem, {
      props: {
        subtask: {
          id: 'subtask-1',
          title: '任务 <span data-type="strong">91</span>{: style="background-color: var(--b3-font-background11);"}',
          completed: false,
        },
        level: 0,
        parentTaskId: 'parent-1',
      },
      global: {
        stubs: {
          TaskCheckbox: true,
          Icon: true,
        },
      },
    });

    const title = wrapper.find('.task-title-rich');
    expect(title.exists()).toBe(true);
    const strong = title.find('[data-type~="strong"]');
    expect(strong.text()).toBe('91');
    expect(strong.attributes('style')).toContain('background-color');
    expect(strong.attributes('data-type')).toContain('text');
  });
});
