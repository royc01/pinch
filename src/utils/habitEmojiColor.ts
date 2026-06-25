const HABIT_COLOR_COUNT = 10;

const FALLBACK_PALETTE: Array<[number, number, number]> = [
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

const emojiColorCache = new Map<string, number>();

export function normalizeHabitEmojiColorIndex(value: unknown): number | undefined {
  const index = Math.round(Number(value));
  return Number.isFinite(index) && index >= 1 && index <= HABIT_COLOR_COUNT ? index : undefined;
}

export function getHabitBackgroundColorValue(colorIndex?: number): string {
  const index = normalizeHabitEmojiColorIndex(colorIndex) ?? 6;
  return `pinch-background${index}`;
}

export function getHabitAccentColorVar(colorIndex?: number): string {
  const index = normalizeHabitEmojiColorIndex(colorIndex) ?? 6;
  return `var(--pinch-color${index})`;
}

export function getHabitBackgroundColorVar(colorIndex?: number): string {
  const index = normalizeHabitEmojiColorIndex(colorIndex) ?? 6;
  return `var(--pinch-background${index})`;
}

export function buildHabitColorStyle(colorIndex?: number): Record<string, string> {
  const index = normalizeHabitEmojiColorIndex(colorIndex) ?? 6;
  return {
    '--pinch-habit-color': `var(--pinch-color${index})`,
    '--pinch-habit-background': `var(--pinch-background${index})`,
    '--pinch-task-chip-color': `var(--pinch-color${index})`
  };
}

export function resolveHabitEmojiColorIndex(emoji?: string): number {
  const normalizedEmoji = typeof emoji === 'string' ? emoji.trim() : '';
  if (!normalizedEmoji) {
    return 6;
  }

  const cached = emojiColorCache.get(normalizedEmoji);
  if (cached) {
    return cached;
  }

  const dominantColor = sampleEmojiDominantColor(normalizedEmoji);
  const index = dominantColor
    ? findNearestPaletteIndex(dominantColor)
    : hashToColorIndex(normalizedEmoji);

  emojiColorCache.set(normalizedEmoji, index);
  return index;
}

function sampleEmojiDominantColor(emoji: string): [number, number, number] | null {
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
  context.fillText(emoji, size / 2, size / 2 + 1);

  try {
    const { data } = context.getImageData(0, 0, size, size);
    let redTotal = 0;
    let greenTotal = 0;
    let blueTotal = 0;
    let weightTotal = 0;

    for (let index = 0; index < data.length; index += 4) {
      const alpha = data[index + 3];
      if (alpha < 64) {
        continue;
      }

      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const max = Math.max(red, green, blue);
      const min = Math.min(red, green, blue);
      const saturation = max === 0 ? 0 : (max - min) / max;
      if (saturation < 0.18 && max < 210) {
        continue;
      }

      const weight = (alpha / 255) * (0.45 + saturation);
      redTotal += red * weight;
      greenTotal += green * weight;
      blueTotal += blue * weight;
      weightTotal += weight;
    }

    if (weightTotal < 6) {
      return null;
    }

    return [
      Math.round(redTotal / weightTotal),
      Math.round(greenTotal / weightTotal),
      Math.round(blueTotal / weightTotal)
    ];
  } catch {
    return null;
  }
}

function findNearestPaletteIndex(color: [number, number, number]): number {
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

function readPaletteFromCss(): Array<[number, number, number]> {
  if (typeof document === 'undefined' || typeof getComputedStyle === 'undefined') {
    return FALLBACK_PALETTE;
  }

  const styles = getComputedStyle(document.documentElement);
  return FALLBACK_PALETTE.map((fallback, index) => {
    const raw = styles.getPropertyValue(`--pinch-color${index + 1}`).trim();
    return parseCssRgb(raw) || fallback;
  });
}

function parseCssRgb(value: string): [number, number, number] | null {
  const hex = value.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const intValue = Number.parseInt(hex[1], 16);
    return [(intValue >> 16) & 255, (intValue >> 8) & 255, intValue & 255];
  }

  const rgb = value.match(/^rgba?\(([^)]+)\)$/i);
  if (!rgb) {
    return null;
  }

  const parts = rgb[1].split(',').map(part => Number(part.trim()));
  if (parts.length < 3 || parts.slice(0, 3).some(part => !Number.isFinite(part))) {
    return null;
  }

  return [
    Math.max(0, Math.min(255, Math.round(parts[0]))),
    Math.max(0, Math.min(255, Math.round(parts[1]))),
    Math.max(0, Math.min(255, Math.round(parts[2])))
  ];
}

function getColorDistance(a: [number, number, number], b: [number, number, number]): number {
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
  return Math.abs(hash) % HABIT_COLOR_COUNT + 1;
}
