import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import TaskTitlePlain from '../TaskTitlePlain.vue';
import TaskTitleRich from '../TaskTitleRich.vue';

describe('task title renderers', () => {
  it('renders a URL with tracking parameters consistently in rich and plain titles', () => {
    const url = 'https://www.bilibili.com/video/BV1Fzszz4Ek7/?cid=33427947694&spm_id_from=333.788.videopod.episodes&vd_source=2850976c3fc6362e80b992da42d66f4c';
    const title = `[${url}](${url.replace(/&/g, '\\&amp;')})`;
    const rich = mount(TaskTitleRich, { props: { title } });
    const plain = mount(TaskTitlePlain, { props: { title } });

    expect(rich.find('[data-type~="a"]').attributes('data-href')).toBe(url);
    expect(rich.text()).toBe(url);
    expect(plain.text()).toBe(url);
  });

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
