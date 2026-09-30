import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import EmojiIcon from '../EmojiIcon.vue';

describe('EmojiIcon', () => {
  it('renders SiYuan icon symbols as SVG references', () => {
    const wrapper = mount(EmojiIcon, {
      props: { value: '#iconFile' }
    });

    expect(wrapper.find('svg.emoji-icon-symbol').exists()).toBe(true);
    expect(wrapper.find('use').attributes('href')).toBe('#iconFile');
    expect(wrapper.attributes('title')).toBeUndefined();
    expect(wrapper.text()).toBe('');
  });

  it('keeps rendering regular emoji as text', () => {
    const wrapper = mount(EmojiIcon, {
      props: { value: '📄' }
    });

    expect(wrapper.find('svg').exists()).toBe(false);
    expect(wrapper.text()).toBe('📄');
  });
});
