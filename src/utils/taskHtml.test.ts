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

  it('preserves combined links and marks from the SiYuan editor DOM', () => {
    const title = sanitizeTaskTitleHtml(
      '<span data-type="a" data-href="siyuan://blocks/20260511144006-xgwg05m">3</span><span data-type="a mark" data-href="siyuan://blocks/20260511144006-xgwg05m">13</span><span data-type="mark">1</span>'
    );

    expect(title).toBe(
      '<span data-type="a" data-href="siyuan://blocks/20260511144006-xgwg05m">3</span><span data-type="a mark" data-href="siyuan://blocks/20260511144006-xgwg05m">13</span><span data-type="mark">1</span>'
    );
  });

  it('merges mark delimiters surrounding a rendered link', () => {
    const title = sanitizeTaskTitleHtml(
      '<span data-type="a" data-href="siyuan://blocks/20260511144006-xgwg05m">3</span>==<span data-type="a" data-href="siyuan://blocks/20260511144006-xgwg05m">13</span>==<span data-type="mark">1</span>'
    );

    expect(title).toBe(
      '<span data-type="a" data-href="siyuan://blocks/20260511144006-xgwg05m">3</span><span data-type="a mark" data-href="siyuan://blocks/20260511144006-xgwg05m">13</span><span data-type="mark">1</span>'
    );
  });

  it('preserves SiYuan subscript, code, and inline math formatting', () => {
    const title = sanitizeTaskTitleHtml(
      '<span data-type="mark"><sub>212</sub></span><sub>`1`</sub><sub>$4$</sub>$1$'
    );

    expect(title).toBe(
      '<span data-type="mark sub">212</span><span data-type="sub code">1</span><span data-type="sub inline-math" data-subtype="math" data-content="4">4</span><span data-type="inline-math" data-subtype="math" data-content="1">1</span>'
    );
  });

  it('keeps an unresolved block reference separate from its preceding text', () => {
    const title = sanitizeTaskTitleHtml('241(( "24"))');

    expect(title).toBe(
      '241<span data-type="block-ref" data-subtype="s" data-id="">24</span>'
    );
  });
});
