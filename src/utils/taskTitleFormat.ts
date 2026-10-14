const BLOCK_REF_REGEX = /\(\(([0-9]{14}-[a-z0-9]{7,})(?:\s+(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'))?\)\)/gi;
// A block reference can temporarily have no resolved ID while the editor still
// retains its quoted display text, e.g. (( "24")). Keep it as a block-ref so
// it is not mistaken for an inline memo.
const EMPTY_BLOCK_REF_WITH_ALIAS_REGEX = /\(\(\s+(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)')\s*\)\)/g;

type InlineToken = { token: string; html: string };

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

function convertMarkdownCode(text: string): string {
  return text.replace(/`([^`\n]+)`/g, '<span data-type="code">$1</span>');
}

function convertSiyuanInlineMath(text: string): string {
  return text.replace(/(^|[^\\])\$([^$\n]+?)\$/g, (_match, prefix: string, content: string) => {
    return `${prefix}<span data-type="inline-math" data-subtype="math" data-content="${escapeHtmlAttr(content)}">${escapeHtml(content)}</span>`;
  });
}

function convertSiyuanSubscript(text: string): string {
  return text.replace(/(^|[^~])~([^~\n]+)~(?=$|[^~])/g, '$1<span data-type="sub">$2</span>');
}

function convertSiyuanMarks(text: string): string {
  // Marks surrounding rendered elements are applied by sanitizeTaskHtml so
  // the existing link span keeps its attributes and data-type ordering.
  return text.replace(/==([^=\n\uE000\uE001]+)==/g, '<span data-type="mark">$1</span>');
}

function convertSiyuanTags(text: string): string {
  return text.replace(/#([^#\s][^#\n]*?)#/g, '<span data-type="tag">$1</span>\u200B');
}

function convertMarkdownLinks(text: string): string {
  return text.replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, (match, label: string, rawHref: string) => {
    const trimmed = rawHref.trim();
    if (!trimmed) return match;
    const href = trimmed.split(/\s+/)[0].replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\]\\^_`{|}~])/g, '$1');
    if (!href) return match;
    return `<span data-type="a" data-href="${escapeHtmlAttr(href)}">${label}</span>`;
  });
}

function replaceBlockRefs(text: string): { text: string; tokens: InlineToken[] } {
  let index = 0;
  const tokens: InlineToken[] = [];
  const createToken = (id: string, aliasDouble?: string, aliasSingle?: string): string => {
    const rawAlias = aliasDouble ?? aliasSingle ?? '';
    const alias = rawAlias.length > 0 ? unescapeQuotedText(rawAlias) : id;
    const html = `<span data-type="block-ref" data-subtype="s" data-id="${escapeHtmlAttr(id)}">${escapeHtml(alias)}</span>`;
    // Keep the reference opaque while the surrounding Markdown is parsed. An
    // underscore-based token is itself valid Markdown emphasis syntax, so a
    // reference following formatted text could be split before restoration.
    const token = `\uE000PINCHBLOCKREF${index++}\uE001`;
    tokens.push({ token, html });
    return token;
  };
  const replaced = text
    .replace(BLOCK_REF_REGEX, (_match, id: string, aliasDouble?: string, aliasSingle?: string) =>
      createToken(id, aliasDouble, aliasSingle)
    )
    .replace(EMPTY_BLOCK_REF_WITH_ALIAS_REGEX, (_match, aliasDouble?: string, aliasSingle?: string) =>
      createToken('', aliasDouble, aliasSingle)
    );
  return { text: replaced, tokens };
}

function restoreInlineTokens(text: string, tokens: InlineToken[]): string {
  let restored = text;
  // Later tokens may contain earlier ones, e.g. a formatted memo around a URL.
  for (const token of [...tokens].reverse()) {
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
  const cleaned = text.trim();
  if (!cleaned) return '';
  const { text: withTokens, tokens } = replaceBlockRefs(cleaned);
  const inlineTokens: InlineToken[] = [];
  const protectInline = (html: string): string => {
    const token = `\uE000PINCHINLINE${inlineTokens.length}\uE001`;
    inlineTokens.push({ token, html });
    return token;
  };
  // Protect both editor HTML and newly generated tags: Markdown punctuation
  // inside attributes (such as spm_id_from in a URL) must remain literal.
  const protectHtmlTags = (value: string): string => value.replace(
    /<\/?[a-z](?:[^<>"']|"[^"]*"|'[^']*')*>/gi,
    protectInline
  );
  const linkConverted = protectHtmlTags(convertMarkdownLinks(protectHtmlTags(withTokens)));
  // URL labels are literal text even when their paths or parameters contain
  // underscores, hashes, or other inline formatting delimiters.
  // Limit this to complete text segments so a memo or formatting delimiter
  // following a URL is still available to its Markdown converter.
  const urlProtected = linkConverted.replace(
    /(^|\uE001)(https?:\/\/[^\s<>"'\uE000\uE001]+)(?=$|\uE000)/gi,
    (_match, prefix: string, url: string) => `${prefix}${protectInline(url)}`
  );
  const converters = [
    convertSiyuanMarks,
    convertSiyuanTags,
    convertMarkdownStrikethrough,
    convertMarkdownCode,
    convertSiyuanInlineMath,
    convertSiyuanSubscript,
    convertMarkdownStrong,
    convertMarkdownEm,
    convertInlineMemos
  ];
  const converted = converters.reduce((value, convert) => protectHtmlTags(convert(value)), urlProtected);
  return restoreInlineTokens(restoreInlineTokens(converted, inlineTokens), tokens);
}
