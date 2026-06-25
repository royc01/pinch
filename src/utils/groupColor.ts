export type RgbColor = { r: number; g: number; b: number };

export function parseHexColor(input: string): RgbColor | null {
  const raw = typeof input === 'string' ? input.trim() : '';
  if (!raw) return null;
  const hex = raw.startsWith('#') ? raw.slice(1) : raw;
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
    return { r, g, b };
  }
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
    return { r, g, b };
  }
  return null;
}

export function parsePinchColorIndex(input: string): number | null {
  const raw = typeof input === 'string' ? input.trim() : '';
  if (!raw) return null;
  const direct = raw.match(/^(?:--)?pinch-background(10|[1-9])$/);
  if (direct) {
    return Number.parseInt(direct[1], 10);
  }
  const varMatch = raw.match(/var\(--?pinch-background(10|[1-9])\)/);
  if (varMatch) {
    return Number.parseInt(varMatch[1], 10);
  }
  return null;
}

export function resolveGroupColorCss(color?: string): string {
  const raw = typeof color === 'string' ? color.trim() : '';
  if (!raw) {
    return '';
  }
  const index = parsePinchColorIndex(raw);
  if (index) {
    return `var(--pinch-background${index})`;
  }
  return raw;
}

export function resolveGroupColorLayerCss(color?: string): string {
  const raw = typeof color === 'string' ? color.trim() : '';
  if (!raw) {
    return '';
  }
  const index = parsePinchColorIndex(raw);
  if (index) {
    return `var(--pinch-background${index}-color)`;
  }
  return raw;
}

export function getReadableTextColor(color: string): string {
  const parsed = parseHexColor(color);
  if (!parsed) {
    return 'var(--b3-theme-on-background)';
  }
  const { r, g, b } = parsed;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#1f1f1f' : '#ffffff';
}

export function resolveGroupTextColor(color?: string): string {
  const raw = typeof color === 'string' ? color.trim() : '';
  if (!raw) {
    return 'var(--b3-theme-on-background)';
  }
  const index = parsePinchColorIndex(raw);
  if (index) {
    return `var(--pinch-group-color${index})`;
  }
  return getReadableTextColor(raw);
}
