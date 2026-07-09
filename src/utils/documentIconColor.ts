const DOCUMENT_ICON_COLOR_COUNT = 10;
const DEFAULT_IMAGE_ICON_COLOR_INDEX = 7;

type RgbTuple = [number, number, number];

const FALLBACK_FONT_PALETTE: RgbTuple[] = [
  [100, 71, 58],
  [219, 124, 28],
  [219, 124, 28],
  [223, 171, 1],
  [101, 184, 77],
  [33, 133, 119],
  [11, 110, 153],
  [105, 64, 165],
  [173, 26, 114],
  [224, 62, 62]
];

const iconColorCache = new Map<string, number>();
const pendingImageSamples = new Set<string>();

export function resolveDocumentIconColorIndex(
  icon?: string,
  onResolved?: () => void
): number {
  const normalizedIcon = normalizeIconValue(icon);
  if (!normalizedIcon) {
    return 6;
  }

  const cached = iconColorCache.get(normalizedIcon);
  if (cached) {
    return cached;
  }

  const explicitColor = extractExplicitColor(normalizedIcon);
  if (explicitColor) {
    const index = findNearestPaletteIndex(explicitColor);
    iconColorCache.set(normalizedIcon, index);
    return index;
  }

  const imageSrc = resolveIconImageSrc(normalizedIcon);
  if (imageSrc) {
    const existingColor = sampleLoadedImageColor(imageSrc);
    if (existingColor) {
      const index = findNearestPaletteIndex(existingColor);
      iconColorCache.set(normalizedIcon, index);
      return index;
    }

    scheduleImageColorSample(normalizedIcon, imageSrc, onResolved);
    return DEFAULT_IMAGE_ICON_COLOR_INDEX;
  }

  const sampledColor = sampleTextIconDominantColor(normalizedIcon);
  const index = sampledColor
    ? findNearestPaletteIndex(sampledColor)
    : hashToColorIndex(normalizedIcon);

  iconColorCache.set(normalizedIcon, index);
  return index;
}

function normalizeIconValue(value: string | undefined): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, '\'')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .trim();
}

function resolveIconImageSrc(value: string): string {
  const raw = normalizeIconValue(value);
  if (!raw) {
    return '';
  }

  const urlMatch = raw.match(/^(?:background-image\s*:\s*)?url\((.+)\)\s*;?$/i);
  const candidate = (urlMatch ? urlMatch[1] : raw).trim().replace(/^['"]+|['"]+$/g, '');
  if (!candidate) {
    return '';
  }

  if (/^(?:https?:\/\/|\/|data:image\/|assets\/|\.{1,2}\/)/i.test(candidate)) {
    return candidate;
  }
  if (/^api\//i.test(candidate) || /^emojis\//i.test(candidate)) {
    return `/${candidate}`;
  }
  if (/\.(?:png|svg|jpe?g|gif|webp)(?:[?#].*)?$/i.test(candidate)) {
    return `/emojis/${candidate}`;
  }
  return '';
}

function extractExplicitColor(value: string): RgbTuple | null {
  const hexMatch = value.match(/#([0-9a-f]{6}|[0-9a-f]{3})\b/i);
  if (hexMatch) {
    return parseHexColor(hexMatch[1]);
  }

  const rgbMatch = value.match(/rgba?\(([^)]+)\)/i);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(',').map(part => Number(part.trim()));
    if (parts.length >= 3 && parts.slice(0, 3).every(part => Number.isFinite(part))) {
      return [
        clampColor(parts[0]),
        clampColor(parts[1]),
        clampColor(parts[2])
      ];
    }
  }

  return null;
}

function parseHexColor(hex: string): RgbTuple | null {
  const raw = hex.trim();
  if (raw.length === 3) {
    return [
      Number.parseInt(raw[0] + raw[0], 16),
      Number.parseInt(raw[1] + raw[1], 16),
      Number.parseInt(raw[2] + raw[2], 16)
    ];
  }
  if (raw.length === 6) {
    return [
      Number.parseInt(raw.slice(0, 2), 16),
      Number.parseInt(raw.slice(2, 4), 16),
      Number.parseInt(raw.slice(4, 6), 16)
    ];
  }
  return null;
}

function scheduleImageColorSample(icon: string, src: string, onResolved?: () => void): void {
  if (typeof document === 'undefined' || typeof Image === 'undefined' || pendingImageSamples.has(icon)) {
    return;
  }

  pendingImageSamples.add(icon);
  const image = new Image();
  image.decoding = 'async';
  if (/^https?:\/\//i.test(src) && typeof window !== 'undefined' && !src.startsWith(window.location.origin)) {
    image.crossOrigin = 'anonymous';
  }
  image.onload = () => {
    pendingImageSamples.delete(icon);
    const color = sampleImageElementColor(image);
    if (color) {
      iconColorCache.set(icon, findNearestPaletteIndex(color));
      onResolved?.();
    }
  };
  image.onerror = () => {
    pendingImageSamples.delete(icon);
  };
  image.src = src;
}

function sampleLoadedImageColor(src: string): RgbTuple | null {
  const escapedSrc = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(src) : src.replace(/"/g, '\\"');
  const image = document.querySelector(`img[src="${escapedSrc}"]`);
  if (!(image instanceof HTMLImageElement) || !image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
    return null;
  }
  return sampleImageElementColor(image);
}

function sampleImageElementColor(image: HTMLImageElement): RgbTuple | null {
  const canvas = document.createElement('canvas');
  const size = 48;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    return null;
  }

  try {
    context.clearRect(0, 0, size, size);
    context.drawImage(image, 0, 0, size, size);
    return sampleCanvasDominantColor(context, size);
  } catch {
    return null;
  }
}

function sampleTextIconDominantColor(icon: string): RgbTuple | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const canvas = document.createElement('canvas');
  const size = 48;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    return null;
  }

  context.clearRect(0, 0, size, size);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '38px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
  context.fillText(icon, size / 2, size / 2 + 1);

  try {
    return sampleCanvasDominantColor(context, size);
  } catch {
    return null;
  }
}

function sampleCanvasDominantColor(context: CanvasRenderingContext2D, size: number): RgbTuple | null {
  const { data } = context.getImageData(0, 0, size, size);
  const buckets = new Map<number, { red: number; green: number; blue: number; weight: number }>();

  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3];
    if (alpha < 48) {
      continue;
    }

    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const saturation = max === 0 ? 0 : (max - min) / max;
    if (saturation < 0.16) {
      continue;
    }

    const paletteIndex = findNearestPaletteIndex([red, green, blue]);
    const bucket = buckets.get(paletteIndex) || { red: 0, green: 0, blue: 0, weight: 0 };
    const lightness = (max + min) / 510;
    const lightnessWeight = lightness > 0.78 ? 0.45 : 1;
    const weight = (alpha / 255) * saturation * saturation * lightnessWeight;
    bucket.red += red * weight;
    bucket.green += green * weight;
    bucket.blue += blue * weight;
    bucket.weight += weight;
    buckets.set(paletteIndex, bucket);
  }

  let bestBucket: { red: number; green: number; blue: number; weight: number } | null = null;
  for (const bucket of buckets.values()) {
    if (!bestBucket || bucket.weight > bestBucket.weight) {
      bestBucket = bucket;
    }
  }

  if (!bestBucket || bestBucket.weight < 3) {
    return null;
  }

  return [
    Math.round(bestBucket.red / bestBucket.weight),
    Math.round(bestBucket.green / bestBucket.weight),
    Math.round(bestBucket.blue / bestBucket.weight)
  ];
}

function findNearestPaletteIndex(color: RgbTuple): number {
  const palette = readPaletteFromCss();
  let nearestIndex = 1;
  let nearestDistance = Number.POSITIVE_INFINITY;

  palette.forEach((paletteColor, index) => {
    const distance = getColorDistance(color, paletteColor);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index + 1;
    }
  });

  return nearestIndex;
}

function readPaletteFromCss(): RgbTuple[] {
  if (typeof document === 'undefined' || typeof getComputedStyle === 'undefined') {
    return FALLBACK_FONT_PALETTE;
  }

  const styles = getComputedStyle(document.documentElement);
  return FALLBACK_FONT_PALETTE.map((fallback, index) => {
    const raw = styles.getPropertyValue(`--pinch-font-color${index + 1}`).trim();
    return extractExplicitColor(raw) || fallback;
  });
}

function getColorDistance(a: RgbTuple, b: RgbTuple): number {
  const redMean = (a[0] + b[0]) / 2;
  const red = a[0] - b[0];
  const green = a[1] - b[1];
  const blue = a[2] - b[2];

  return (2 + redMean / 256) * red * red
    + 4 * green * green
    + (2 + (255 - redMean) / 256) * blue * blue;
}

function hashToColorIndex(value: string): number {
  let hash = 0;
  for (const char of value) {
    hash = ((hash << 5) - hash + char.codePointAt(0)!) | 0;
  }
  return Math.abs(hash) % DOCUMENT_ICON_COLOR_COUNT + 1;
}

function clampColor(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}
