import { describe, expect, it } from 'vitest';
import { extractQuickCreateDraftTitle } from './quickCreateDraftTitle';

describe('extractQuickCreateDraftTitle', () => {
  it('removes the task marker created for a new draft', () => {
    expect(extractQuickCreateDraftTitle('* [ ] 11')).toBe('11');
  });

  it('removes task markers accumulated by prior document switches', () => {
    expect(extractQuickCreateDraftTitle('* [ ] * [ ] * [ ] 11')).toBe('11');
  });

  it('handles completed and zero-width-marker task drafts', () => {
    expect(extractQuickCreateDraftTitle('- [x] \u200B11')).toBe('11');
  });
});
