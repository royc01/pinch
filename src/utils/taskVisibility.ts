const INLINE_ATTR_MARKER_REGEX = /\s*\{:\s*[^}]*\}\s*/g;
const HTML_TAG_REGEX = /<[^>]+>/g;
const HTML_SPACE_REGEX = /&(?:nbsp|ensp|emsp|thinsp|zwnj|zwj);/gi;
const ZERO_WIDTH_REGEX = /[\u200B-\u200D\uFEFF]/g;

export function normalizeTaskTitleForVisibility(title: unknown): string {
  if (typeof title !== 'string') {
    return '';
  }

  return title
    .replace(INLINE_ATTR_MARKER_REGEX, ' ')
    .replace(HTML_SPACE_REGEX, ' ')
    .replace(HTML_TAG_REGEX, '')
    .replace(ZERO_WIDTH_REGEX, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function hasVisibleTaskTitle(title: unknown): boolean {
  const normalized = normalizeTaskTitleForVisibility(title);
  return normalized.length > 0 && normalized !== '-' && normalized !== '(untitled)';
}
