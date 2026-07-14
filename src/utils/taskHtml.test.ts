import { describe, expect, it } from 'vitest';
import { sanitizeTaskTitleHtml } from './taskHtml';

describe('sanitizeTaskTitleHtml', () => {
  it('preserves SiYuan inline background attribute markers', () => {
    const title = sanitizeTaskTitleHtml(
      '**12****31**{: style="background-color: var(--b3-font-background2);"}<u>2</u>{: style="background-color: var(--b3-font-background2);"}<u>3</u>'
    );

    expect(title).toBe(
      '<span data-type="strong">12</span><span data-type="strong text" style="background-color: var(--b3-font-background2);">31</span><span data-type="u text" style="background-color: var(--b3-font-background2);">2</span><span data-type="u">3</span>'
    );
  });

  it('preserves block references following nested emphasis', () => {
    const title = sanitizeTaskTitleHtml(
      '**_我_**((20260506124250-a081yl2 "企21"))'
    );

    expect(title).toBe(
      '<span data-type="strong em">我</span><span data-type="block-ref" data-subtype="s" data-id="20260506124250-a081yl2">企21</span>'
    );
  });
});
