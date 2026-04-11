function hexToEmoji(hex: string): string | undefined {
  try {
    return String.fromCodePoint(parseInt(hex, 16));
  } catch {
    return undefined;
  }
}

export function normalizeDocumentIconValue(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const decoded = trimmed
    .replace(/&#x([0-9a-fA-F]+);?/g, (_, hex: string) => hexToEmoji(hex) || '')
    .replace(/&#([0-9]+);?/g, (_, dec: string) => {
      try {
        return String.fromCodePoint(parseInt(dec, 10));
      } catch {
        return '';
      }
    })
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, '\'')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .trim();

  if (!decoded) {
    return undefined;
  }

  const unquoted = decoded.replace(/^['"]+|['"]+$/g, '').trim();
  if (!unquoted) {
    return undefined;
  }

  const directUrlMatch = unquoted.match(/^(?:background-image\s*:\s*)?url\((.+)\)\s*;?$/i);
  if (directUrlMatch) {
    const rawUrl = (directUrlMatch[1] || '').trim().replace(/^['"]+|['"]+$/g, '');
    if (rawUrl) {
      return rawUrl;
    }
  }
  if (
    /^(?:https?:\/\/|\/|data:image\/|assets\/|\.{1,2}\/)/i.test(unquoted)
    || /\.(?:png|svg|jpe?g|gif|webp)(?:[?#].*)?$/i.test(unquoted)
  ) {
    return unquoted;
  }

  const compactHex = unquoted.replace(/^0x/i, '');
  if (/^[0-9a-fA-F]{4,6}$/.test(compactHex)) {
    return hexToEmoji(compactHex) || undefined;
  }
  if (/^[0-9a-fA-F]{2,6}(?:[-_][0-9a-fA-F]{2,6})+$/.test(compactHex)) {
    try {
      const icon = compactHex
        .split(/[-_]/)
        .map((part) => String.fromCodePoint(parseInt(part, 16)))
        .join('');
      return icon || undefined;
    } catch {
      return undefined;
    }
  }

  if (/[\p{Extended_Pictographic}]/u.test(unquoted)) {
    return unquoted;
  }

  return Array.from(unquoted).length <= 4 ? unquoted : undefined;
}

export function extractDocumentIconFromIal(ial: unknown): string | undefined {
  if (typeof ial !== 'string' || ial.trim().length === 0) {
    return undefined;
  }

  const normalizedIal = ial.trim();
  const attrPatterns = [
    /\bicon=(?:"([^"]*)"|'([^']*)'|([^\s}]+))/i,
    /\bdata-icon=(?:"([^"]*)"|'([^']*)'|([^\s}]+))/i,
    /\bdata-emoji=(?:"([^"]*)"|'([^']*)'|([^\s}]+))/i,
    /\btitle-img=(?:"([^"]*)"|'([^']*)'|([^\s}]+))/i
  ];

  for (const pattern of attrPatterns) {
    const match = normalizedIal.match(pattern);
    if (!match) {
      continue;
    }
    const rawValue = (match[1] || match[2] || match[3] || '').trim();
    if (!rawValue) {
      continue;
    }

    const decodedCandidates = [rawValue];
    try {
      const decodedUri = decodeURIComponent(rawValue);
      if (decodedUri !== rawValue) {
        decodedCandidates.push(decodedUri);
      }
    } catch {
      // ignore decode failures
    }

    for (const candidate of decodedCandidates) {
      const icon = normalizeDocumentIconValue(candidate);
      if (icon) {
        return icon;
      }
    }
  }

  return undefined;
}

export function extractDocumentIconFromMemo(memo: unknown): string | undefined {
  if (typeof memo !== 'string' || memo.trim().length === 0) {
    return undefined;
  }

  const rawMemo = memo.trim();
  const direct = normalizeDocumentIconValue(rawMemo);
  if (direct) {
    return direct;
  }

  try {
    const parsed = JSON.parse(rawMemo) as Record<string, unknown>;
    const candidateKeys = ['icon', 'emoji', 'titleImg', 'title-img', 'dataIcon', 'data-icon'];
    for (const key of candidateKeys) {
      if (!(key in parsed)) {
        continue;
      }
      const icon = normalizeDocumentIconValue(parsed[key]);
      if (icon) {
        return icon;
      }
    }
  } catch {
    // ignore non-JSON memo
  }

  const keyValuePatterns = [
    /\bicon\s*[:=]\s*(?:"([^"]*)"|'([^']*)'|([^\s,;]+))/i,
    /\bemoji\s*[:=]\s*(?:"([^"]*)"|'([^']*)'|([^\s,;]+))/i,
    /\btitle-?img\s*[:=]\s*(?:"([^"]*)"|'([^']*)'|([^\s,;]+))/i
  ];
  for (const pattern of keyValuePatterns) {
    const match = rawMemo.match(pattern);
    if (!match) {
      continue;
    }
    const icon = normalizeDocumentIconValue(match[1] || match[2] || match[3] || '');
    if (icon) {
      return icon;
    }
  }

  return undefined;
}

export function extractDocumentIconFromBlockRow(row: Record<string, unknown>): string | undefined {
  if (!row || typeof row !== 'object') {
    return undefined;
  }

  const directCandidates: unknown[] = [
    row.icon,
    row['docIcon'],
    row['doc_icon'],
    row['title-img'],
    row['title_img'],
    row['titleImg'],
    row['data-icon'],
    row['data_icon'],
    row['dataIcon']
  ];
  for (const candidate of directCandidates) {
    const icon = normalizeDocumentIconValue(candidate);
    if (icon) {
      return icon;
    }
  }

  for (const [key, value] of Object.entries(row)) {
    if (!/(?:^|[_-])icon(?:$|[_-])|title[_-]?img/i.test(key)) {
      continue;
    }
    const icon = normalizeDocumentIconValue(value);
    if (icon) {
      return icon;
    }
  }

  const iconFromIal = extractDocumentIconFromIal(row.ial);
  if (iconFromIal) {
    return iconFromIal;
  }
  return extractDocumentIconFromMemo(row.memo);
}

export function extractDocumentIconFromDom(dom: string | undefined): string | undefined {
  if (typeof dom !== 'string' || dom.trim().length === 0) {
    return undefined;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(dom, 'text/html');
    const iconRoot = doc.querySelector('.protyle-background__icon') || doc.querySelector('.protyle-background');
    if (!iconRoot) {
      return undefined;
    }

    const iconAttrCandidates = ['data-icon', 'data-emoji', 'data-value', 'data-code', 'data-code-point', 'title', 'aria-label', 'style'];
    for (const attrName of iconAttrCandidates) {
      const icon = normalizeDocumentIconValue(iconRoot.getAttribute(attrName));
      if (icon) {
        return icon;
      }
    }

    const nestedCandidate = iconRoot.querySelector('[data-icon], [data-emoji], [data-value], [data-code], [data-code-point], img');
    if (nestedCandidate) {
      for (const attrName of iconAttrCandidates) {
        const icon = normalizeDocumentIconValue(nestedCandidate.getAttribute(attrName));
        if (icon) {
          return icon;
        }
      }
      if (nestedCandidate instanceof HTMLImageElement) {
        const src = normalizeDocumentIconValue(nestedCandidate.getAttribute('src'));
        if (src) {
          return src;
        }
      }
    }

    const imageCandidate = iconRoot.querySelector('img');
    if (imageCandidate) {
      const iconFromAlt = normalizeDocumentIconValue(
        imageCandidate.getAttribute('alt')
        || imageCandidate.getAttribute('title')
        || imageCandidate.getAttribute('aria-label')
        || imageCandidate.getAttribute('src')
      );
      if (iconFromAlt) {
        return iconFromAlt;
      }
    }

    return normalizeDocumentIconValue(iconRoot.textContent || '');
  } catch {
    return undefined;
  }
}
