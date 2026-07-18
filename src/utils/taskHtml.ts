import { formatTaskTitleHtml } from '@/utils/taskTitleFormat';

const TASK_HTML_CACHE_LIMIT = 500;
const sanitizedHtmlCache = new Map<string, string>();
const sanitizedTaskTitleHtmlCache = new Map<string, string>();

function cacheHtml(cache: Map<string, string>, key: string, value: string): string {
  if (!cache.has(key) && cache.size >= TASK_HTML_CACHE_LIMIT) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) {
      cache.delete(oldestKey);
    }
  }
  cache.set(key, value);
  return value;
}

function mergeDataTypeValues(...values: string[]): string {
  const seen = new Set<string>();
  const merged: string[] = [];
  values
    .join(' ')
    .split(/\s+/)
    .map(value => value.trim())
    .filter(Boolean)
    .forEach((value) => {
      if (!seen.has(value)) {
        seen.add(value);
        merged.push(value);
      }
    });
  return merged.join(' ');
}

function applyInlineAttributeMarkers(container: HTMLElement): void {
  const markerPattern = /^\s*\{:\s*([^}]*)\}\s*$/;
  const stylePattern = /(?:^|\s)style\s*=\s*(?:"([^"]*)"|'([^']*)')/i;

  for (const node of Array.from(container.childNodes)) {
    if (node.nodeType !== Node.TEXT_NODE) {
      continue;
    }

    const marker = (node.textContent || '').match(markerPattern);
    if (!marker) {
      continue;
    }

    const previous = node.previousElementSibling;
    const style = marker[1].match(stylePattern)?.slice(1).find(value => value !== undefined);
    if (previous instanceof HTMLElement && style) {
      previous.setAttribute('style', style);
      if (previous.tagName === 'SPAN') {
        const dataType = previous.getAttribute('data-type') || '';
        previous.setAttribute('data-type', mergeDataTypeValues(dataType, 'text'));
      }
    }
    node.remove();
  }
}

function normalizeInlineFormatElements(container: HTMLElement): void {
  const formatElementType: Record<string, string> = {
    B: 'strong',
    DEL: 's',
    EM: 'em',
    I: 'em',
    S: 's',
    STRIKE: 's',
    STRONG: 'strong',
    SUB: 'sub',
    U: 'u'
  };

  container.querySelectorAll('b, strong, em, i, s, del, strike, sub, u').forEach((el) => {
    const type = formatElementType[el.tagName];
    if (!type || !el.parentNode) {
      return;
    }
    const span = document.createElement('span');
    span.setAttribute('data-type', type);
    span.innerHTML = el.innerHTML;
    el.parentNode.replaceChild(span, el);
  });
}

function mergeNestedInlineDataTypes(container: HTMLElement): void {
  let changed = true;
  while (changed) {
    changed = false;
    const spans = Array.from(container.querySelectorAll('span[data-type]'));
    for (const span of spans) {
      const childElements = Array.from(span.children);
      const hasTextOutsideChild = Array.from(span.childNodes).some(node =>
        node.nodeType === Node.TEXT_NODE && (node.textContent || '').trim().length > 0
      );
      if (hasTextOutsideChild || childElements.length !== 1) {
        continue;
      }
      const child = childElements[0];
      if (!(child instanceof HTMLElement) || child.tagName !== 'SPAN' || !child.hasAttribute('data-type')) {
        continue;
      }
      child.setAttribute('data-type', mergeDataTypeValues(
        span.getAttribute('data-type') || '',
        child.getAttribute('data-type') || ''
      ));
      span.parentNode?.replaceChild(child, span);
      changed = true;
    }
  }
}

/**
 * SiYuan may serialize a mark that wraps an inline link as text delimiters on
 * either side of the rendered link: ==<span data-type="a">…</span>==.
 * Markdown parsing cannot safely match across that HTML because its attributes
 * contain `=`, so restore the mark after the HTML has been parsed.
 */
function applyMarkDelimitersAroundInlineElements(container: HTMLElement): void {
  const parents = [container, ...Array.from(container.querySelectorAll<HTMLElement>('*'))];

  for (const parent of parents) {
    const nodes = Array.from(parent.childNodes);
    for (let index = 0; index + 2 < nodes.length; index += 1) {
      const opening = nodes[index];
      const inline = nodes[index + 1];
      const closing = nodes[index + 2];
      if (
        opening.nodeType !== Node.TEXT_NODE
        || !(inline instanceof HTMLElement)
        || closing.nodeType !== Node.TEXT_NODE
      ) {
        continue;
      }

      const openingText = opening.textContent || '';
      const closingText = closing.textContent || '';
      if (!openingText.endsWith('==') || !closingText.startsWith('==')) {
        continue;
      }

      opening.textContent = openingText.slice(0, -2);
      closing.textContent = closingText.slice(2);
      if (!opening.textContent) opening.remove();
      if (!closing.textContent) closing.remove();

      if (inline.tagName === 'SPAN') {
        inline.setAttribute('data-type', mergeDataTypeValues(inline.getAttribute('data-type') || '', 'mark'));
        continue;
      }

      const mark = document.createElement('span');
      mark.setAttribute('data-type', 'mark');
      inline.parentNode?.replaceChild(mark, inline);
      mark.appendChild(inline);
    }
  }
}

export function sanitizeTaskHtml(rawHtml?: string): string {
  if (!rawHtml) return '';

  const cached = sanitizedHtmlCache.get(rawHtml);
  if (cached !== undefined) {
    return cached;
  }

  const container = document.createElement('div');
  container.innerHTML = rawHtml;

  normalizeInlineFormatElements(container);
  applyInlineAttributeMarkers(container);
  applyMarkDelimitersAroundInlineElements(container);
  mergeNestedInlineDataTypes(container);

  const dangerousNodes = container.querySelectorAll('script, iframe, object, embed, link, meta');
  dangerousNodes.forEach((el) => el.remove());

  const allElements = container.querySelectorAll('*');
  allElements.forEach((el) => {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();

      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
        continue;
      }

      if ((name === 'href' || name === 'src') && (value.startsWith('javascript:') || value.startsWith('data:text/html'))) {
        el.removeAttribute(attr.name);
      }
    }
  });

  const supNodes = Array.from(container.querySelectorAll('sup'));
  supNodes.forEach((sup) => {
    const rawText = sup.textContent || '';
    const memoMatch = rawText.trim().match(/^\((.+)\)$/);
    if (!memoMatch) {
      return;
    }
    const memo = memoMatch[1];
    let anchor: ChildNode | null = sup.previousSibling;
    while (anchor && anchor.nodeType === Node.TEXT_NODE && !(anchor.textContent || '').trim()) {
      anchor = anchor.previousSibling;
    }
    if (!anchor) {
      return;
    }
    const inlineMemo = document.createElement('span');
    inlineMemo.setAttribute('data-type', 'inline-memo');
    inlineMemo.setAttribute('data-inline-memo-content', memo);

    if (anchor.nodeType === Node.TEXT_NODE) {
      const textNode = anchor as Text;
      const fullText = textNode.textContent || '';
      const tokenMatch = fullText.match(/([\p{L}\p{N}_-]+)$/u);
      if (tokenMatch) {
        const token = tokenMatch[1];
        const prefix = fullText.slice(0, fullText.length - token.length);
        if (prefix) {
          textNode.textContent = prefix;
        } else {
          textNode.remove();
        }
        inlineMemo.textContent = token;
      } else {
        inlineMemo.textContent = fullText;
        textNode.remove();
      }
      sup.parentNode?.insertBefore(inlineMemo, sup);
      sup.remove();
      return;
    }

    if (anchor.nodeType === Node.ELEMENT_NODE) {
      inlineMemo.appendChild(anchor as Element);
      sup.parentNode?.insertBefore(inlineMemo, sup);
      sup.remove();
    }
  });

  const sanitized = container.innerHTML;
  return cacheHtml(sanitizedHtmlCache, rawHtml, sanitized);
}

export function sanitizeTaskTitleHtml(rawHtml?: string): string {
  const title = rawHtml || '';
  const cached = sanitizedTaskTitleHtmlCache.get(title);
  if (cached !== undefined) {
    return cached;
  }

  const normalized = formatTaskTitleHtml(title);
  const sanitized = sanitizeTaskHtml(normalized);
  return cacheHtml(sanitizedTaskTitleHtmlCache, title, stripTaskPrefix(sanitized));
}

function stripTaskPrefix(text: string): string {
  return text
    .replace(/^\s*[-*]\s*(?:\{:[^}]*\})?\s*\[(x|X| )\]\s*/i, '')
    .replace(/\s*\{:\s*[^}]*\}\s*/g, ' ')
    .trim();
}
