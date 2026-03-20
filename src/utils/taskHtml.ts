import { formatTaskTitleHtml } from '@/utils/taskTitleFormat';

const sanitizedHtmlCache = new Map<string, string>();

export function sanitizeTaskHtml(rawHtml?: string): string {
  if (!rawHtml) return '';

  const cached = sanitizedHtmlCache.get(rawHtml);
  if (cached !== undefined) {
    return cached;
  }

  const container = document.createElement('div');
  container.innerHTML = rawHtml;

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
  if (sanitizedHtmlCache.size > 500) {
    sanitizedHtmlCache.clear();
  }
  sanitizedHtmlCache.set(rawHtml, sanitized);
  return sanitized;
}

export function sanitizeTaskTitleHtml(rawHtml?: string): string {
  const normalized = formatTaskTitleHtml(rawHtml || '');
  const sanitized = sanitizeTaskHtml(normalized);
  return stripTaskPrefix(sanitized);
}

function stripTaskPrefix(text: string): string {
  return text
    .replace(/^\s*[-*]\s*(?:\{:[^}]*\})?\s*\[(x|X| )\]\s*/i, '')
    .replace(/\s*\{:\s*style="[^"]*"\}\s*/g, ' ')
    .trim();
}
