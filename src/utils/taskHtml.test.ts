import { describe, expect, it, vi } from 'vitest';
import { getTaskTitlePlainText, sanitizeTaskTitleHtml } from './taskHtml';
import { formatTaskTitleHtml } from './taskTitleFormat';

const videoUrl = 'https://www.bilibili.com/video/BV1Fzszz4Ek7/?cid=33427947694&spm_id_from=333.788.videopod.episodes&vd_source=2850976c3fc6362e80b992da42d66f4c';
const escapedVideoUrl = videoUrl.replace(/&/g, '&amp;');
const videoMarkdown = `[${escapedVideoUrl}](${videoUrl.replace(/&/g, '\\&amp;')})`;
const videoHtml = `<span data-type="a" data-href="${escapedVideoUrl}">${escapedVideoUrl}</span>`;

describe('sanitizeTaskTitleHtml', () => {
  it.each([
    ['bare URL', videoUrl],
    ['Markdown', videoMarkdown],
    ['repository-formatted Markdown', formatTaskTitleHtml(videoMarkdown)],
    ['SiYuan HTML', videoHtml],
    ['escaped SiYuan HTML', videoHtml.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')]
  ])('preserves the complete URL and destination in %s titles', (_source, rawTitle) => {
    const container = document.createElement('div');
    container.innerHTML = sanitizeTaskTitleHtml(rawTitle);

    const link = container.querySelector('[data-type~="a"]');
    if (_source !== 'bare URL') {
      expect(link?.getAttribute('data-href')).toBe(videoUrl);
      expect(link?.textContent).toBe(videoUrl);
    }
    expect(container.textContent).toBe(videoUrl);
    expect(container.querySelector('[data-type~="em"]')).toBeNull();
    expect(getTaskTitlePlainText(rawTitle)).toBe(videoUrl);
  });

  it.each([
    ['==https://example.com/video==', 'mark'],
    ['$https://example.com/video$', 'inline-math'],
    ['note ((https://example.com/video))', 'inline-memo']
  ])('preserves delimiters surrounding a URL in %s', (rawTitle, dataType) => {
    const container = document.createElement('div');
    container.innerHTML = sanitizeTaskTitleHtml(rawTitle);

    expect(container.querySelector(`[data-type~="${dataType}"]`)).not.toBeNull();
    expect(container.textContent).not.toMatch(/==|\$|\(\(/);
  });

  it('preserves link destinations and marks alongside formatted text', () => {
    const container = document.createElement('div');
    container.innerHTML = sanitizeTaskTitleHtml(`**Watch** ==[video](${escapedVideoUrl})==`);

    const link = container.querySelector('[data-type~="a"]');
    expect(link?.getAttribute('data-href')).toBe(videoUrl);
    expect(link?.getAttribute('data-type')?.split(' ')).toEqual(expect.arrayContaining(['a', 'mark']));
    expect(container.querySelector('[data-type~="strong"]')?.textContent).toBe('Watch');
    expect(container.textContent).toBe('Watch video');
  });

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

  it('removes a trailing SiYuan attribute marker from plain text', () => {
    expect(getTaskTitlePlainText('sad11 {: style="background-color: var(--b3-font-background10);"}'))
      .toBe('sad11');
  });

  it('parses HTML-escaped task titles before rendering them', () => {
    expect(sanitizeTaskTitleHtml('&lt;strong&gt;sad11&lt;/strong&gt;'))
      .toBe('<span data-type="strong">sad11</span>');
  });

  it('reuses parsed plain titles across views for a 6501-task dataset', () => {
    const titles = Array.from({ length: 6501 }, (_, index) => `<strong>Cached title ${index}</strong>`);
    for (const title of titles) getTaskTitlePlainText(title);
    const createElement = vi.spyOn(document, 'createElement');
    try {
      for (let index = 0; index < titles.length; index++) {
        expect(getTaskTitlePlainText(titles[index])).toBe(`Cached title ${index}`);
      }
      expect(createElement).not.toHaveBeenCalled();
      expect(getTaskTitlePlainText('<strong>Changed cached title</strong>')).toBe('Changed cached title');
      expect(createElement).toHaveBeenCalled();
    } finally {
      createElement.mockRestore();
    }
  });
});
