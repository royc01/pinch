export function isFocusTargetImageIcon(icon: string | null | undefined): boolean {
  if (typeof icon !== 'string') {
    return false;
  }

  const value = icon.trim();
  return /^(?:https?:)?\/\//i.test(value)
    || /^data:image\//i.test(value)
    || /^(?:\.?\.?\/|\/)?(?:api\/icon\/|assets\/|emojis\/)/i.test(value)
    || /\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i.test(value);
}
