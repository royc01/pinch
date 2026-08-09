import { describe, expect, it } from 'vitest';
import { interpolateTemplate } from '@/composables/useI18n';

describe('interpolateTemplate', () => {
  it('replaces every occurrence of supplied placeholders', () => {
    expect(interpolateTemplate('{name}: {count} / {count}', {
      name: 'Inbox',
      count: 2
    })).toBe('Inbox: 2 / 2');
  });

  it('leaves placeholders without a value intact', () => {
    expect(interpolateTemplate('{known} {missing}', { known: 'value' }))
      .toBe('value {missing}');
  });
});
