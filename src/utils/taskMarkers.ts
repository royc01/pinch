/** Native Siyuan task-list marker helpers shared by the UI and kernel entry. */
export type SiyuanTaskMarker = ' ' | 'x' | 'X' | '/' | '-';

export function normalizeSiyuanTaskMarker(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const marker = String(value).trim();
  return marker.length > 0 ? marker : ' ';
}

/** Map a Siyuan marker to the task status IDs used by Pinch. */
export function taskMarkerToStatus(value: unknown): string | null {
  const marker = normalizeSiyuanTaskMarker(value);
  if (marker === null) return null;
  if (marker === '/') return 'in-progress';
  if (marker === '-') return 'cancelled';
  if (marker === 'x' || marker === 'X') return 'completed';
  if (marker === ' ') return 'pending';
  // Siyuan allows arbitrary markers; preserve the historical behaviour where
  // any other non-empty marker is treated as checked.
  return 'completed';
}

/** Map a Pinch status to a native Siyuan marker when persisting a task. */
export function taskStatusToSiyuanTaskMarker(status: string | undefined): ' ' | 'x' | '/' | '-' {
  if (status === 'completed') return 'x';
  if (status === 'in-progress') return '/';
  if (status === 'cancelled') return '-';
  return ' ';
}
