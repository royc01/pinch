const TASK_MARKER_PREFIX = /^\s*(?:[-*+]\s*)?(?:\{:\s*[^}]*\}\s*)?\[[ xX]\]\s*/;

/**
 * Extract the editable title from the Kramdown of the temporary task used by
 * the quick-create dialog. The dialog itself creates task list items with
 * `* [ ]`, so repeated document changes must remove every inherited marker.
 */
export function extractQuickCreateDraftTitle(markdown: string): string {
  let title = (markdown || '').trim().split(/\r?\n/, 1)[0] || '';
  let previous = '';

  while (title !== previous) {
    previous = title;
    title = title
      .replace(TASK_MARKER_PREFIX, '')
      .replace(/^\u200B+/, '')
      .trimStart();
  }

  return title.trim();
}
