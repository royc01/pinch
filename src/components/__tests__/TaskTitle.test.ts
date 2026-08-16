import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import TaskTitlePlain from '../TaskTitlePlain.vue';
import TaskTitleRich from '../TaskTitleRich.vue';

describe('task title renderers', () => {
  it('renders supported inline formatting in the rich title', () => {
    const wrapper = mount(TaskTitleRich, {
      props: {
        title: '**important**{: style="background-color: var(--b3-font-background10);"}'
      }
    });

    expect(wrapper.find('[data-type~="strong"]').text()).toBe('important');
    expect(wrapper.find('[data-type~="text"]').attributes('style'))
      .toContain('background-color');
  });

  it('renders the same title as marker-free plain text', () => {
    const wrapper = mount(TaskTitlePlain, {
      props: {
        title: 'sad11 {: style="background-color: var(--b3-font-background10);"}'
      }
    });

    expect(wrapper.text()).toBe('sad11');
  });

  it('uses a plain-text fallback when a title has no visible text', () => {
    const wrapper = mount(TaskTitlePlain, {
      props: {
        title: '',
        fallback: '**Fallback**'
      }
    });

    expect(wrapper.text()).toBe('Fallback');
  });
});
