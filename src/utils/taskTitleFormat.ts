const INLINE_ATTR_MARKER_REGEX = /\s*\{:\s*[^}]*\}\s*/g;
const BLOCK_REF_REGEX = /\(\(([0-9]{14}-[a-z0-9]{7,})(?:\s+(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'))?\)\)/gi;

type BlockRefToken = { token: string; html: string };

function unescapeQuotedText(text: string): string {
  return text.replace(/\\([\\'"])/g, '$1');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlAttr(text: string): string {
  return escapeHtml(text).replace(/"/g, '&quot;');
}

function convertMarkdownStrong(text: string): string {
  return text
    .replace(/\*\*\*([^*]+)\*\*\*/g, '<span data-type="strong em">$1</span>')
    .replace(/___([^_]+)___/g, '<span data-type="strong em">$1</span>')
    .replace(/\*\*([^*]+)\*\*/g, '<span data-type="strong">$1</span>')
    .replace(/__([^_]+)__/g, '<span data-type="strong">$1</span>');
}

function convertMarkdownEm(text: string): string {
  return text
    .replace(/(^|[^*])\*([^*\n]+)\*(?=$|[^*]|\*[^*])/g, '$1<span data-type="em">$2</span>')
    .replace(/(^|[^_])_([^_\n]+)_(?=$|[^_]|_[^_])/g, '$1<span data-type="em">$2</span>');
}

function convertMarkdownStrikethrough(text: string): string {
  return text.replace(/~~([^~\n]+)~~/g, '<span data-type="s">$1</span>');
}

function convertSiyuanMarks(text: string): string {
  return text.replace(/==([^=\n]+)==/g, '<span data-type="mark">$1</span>');
}

function convertSiyuanTags(text: string): string {
  return text.replace(/#([^#\s][^#\n]*?)#/g, '<span data-type="tag">$1</span>\u200B');
}

function convertMarkdownLinks(text: string): string {
  return text.replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, (match, label: string, rawHref: string) => {
    const trimmed = rawHref.trim();
    if (!trimmed) return match;
    const href = trimmed.split(/\s+/)[0];
    if (!href) return match;
    return `<span data-type="a" data-href="${escapeHtmlAttr(href)}">${label}</span>`;
  });
}

function replaceBlockRefs(text: string): { text: string; tokens: BlockRefToken[] } {
  let index = 0;
  const tokens: BlockRefToken[] = [];
  const replaced = text.replace(BLOCK_REF_REGEX, (_match, id: string, aliasDouble?: string, aliasSingle?: string) => {
    const rawAlias = aliasDouble ?? aliasSingle ?? '';
    const alias = rawAlias.length > 0 ? unescapeQuotedText(rawAlias) : id;
    const html = `<span data-type="block-ref" data-subtype="s" data-id="${escapeHtmlAttr(id)}">${escapeHtml(alias)}</span>`;
    const token = `__PINCH_BLOCK_REF_${index++}__`;
    tokens.push({ token, html });
    return token;
  });
  return { text: replaced, tokens };
}

function restoreBlockRefs(text: string, tokens: BlockRefToken[]): string {
  let restored = text;
  for (const token of tokens) {
    restored = restored.split(token.token).join(token.html);
  }
  return restored;
}

/**
 * Convert SiYuan inline memo markdown syntax to HTML.
 * At this point block refs ((id)) have already been tokenized by replaceBlockRefs,
 * so any remaining ((...)) patterns are inline memos.
 * Produces <sup>(memo)</sup> which sanitizeTaskHtml will convert to
 * <span data-type="inline-memo" data-inline-memo-content="memo">.
 */
function convertInlineMemos(text: string): string {
  // Strip leading ^ before ((memo)) (superscript marker) then convert ((memo)) to <sup>(memo)</sup>
  return text
    .replace(/\^\(\(/g, '((')
    .replace(/\(\(([^()]+)\)\)/g, (_match, memo: string) => {
      return `<sup>(${escapeHtml(memo)})</sup>`;
    });
}

export function formatTaskTitleHtml(text: string): string {
  const cleaned = text.replace(INLINE_ATTR_MARKER_REGEX, ' ').trim();
  if (!cleaned) return '';
  const { text: withTokens, tokens } = replaceBlockRefs(cleaned);
  const linkConverted = convertMarkdownLinks(withTokens);
  const markConverted = convertSiyuanMarks(linkConverted);
  const tagConverted = convertSiyuanTags(markConverted);
  const strikethroughConverted = convertMarkdownStrikethrough(tagConverted);
  const strongConverted = convertMarkdownStrong(strikethroughConverted);
  const emConverted = convertMarkdownEm(strongConverted);
  const memoConverted = convertInlineMemos(emConverted);
  return restoreBlockRefs(memoConverted, tokens);
}
