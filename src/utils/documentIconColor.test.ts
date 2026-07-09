import { describe, expect, it } from 'vitest';
import { resolveDocumentIconColorIndex } from './documentIconColor';

describe('resolveDocumentIconColorIndex', () => {
  it('uses the blue group color while custom image icons are waiting for pixel sampling', () => {
    expect(resolveDocumentIconColorIndex('day_01_96px.png')).toBe(7);
    expect(resolveDocumentIconColorIndex('emojis/custom-blue-calendar.png')).toBe(7);
    expect(resolveDocumentIconColorIndex('background-image: url("emojis/day_29_96px.png");')).toBe(7);
  });
});
