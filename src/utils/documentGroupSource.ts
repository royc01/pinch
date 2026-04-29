export type DocumentSourceKind = 'all' | 'notebook' | 'group' | 'goal';

export interface ParsedDocumentSource {
  kind: DocumentSourceKind;
  id: string;
  value: string;
}

export function buildNotebookDocumentSource(notebookId: string): string {
  const normalized = typeof notebookId === 'string' ? notebookId.trim() : '';
  return normalized ? `notebook:${normalized}` : 'all';
}

export function buildGroupDocumentSource(groupId: string): string {
  const normalized = typeof groupId === 'string' ? groupId.trim() : '';
  return normalized ? `group:${normalized}` : 'all';
}

export function buildGoalDocumentSource(goalId: string): string {
  const normalized = typeof goalId === 'string' ? goalId.trim() : '';
  return normalized ? `goal:${normalized}` : 'all';
}

export function parseDocumentSource(source: unknown): ParsedDocumentSource {
  const value = typeof source === 'string' ? source.trim() : '';
  if (!value || value === 'all') {
    return {
      kind: 'all',
      id: '',
      value: 'all'
    };
  }

  if (value.startsWith('notebook:')) {
    const id = value.slice('notebook:'.length).trim();
    return id
      ? { kind: 'notebook', id, value }
      : { kind: 'all', id: '', value: 'all' };
  }

  if (value.startsWith('group:')) {
    const id = value.slice('group:'.length).trim();
    return id
      ? { kind: 'group', id, value }
      : { kind: 'all', id: '', value: 'all' };
  }

  if (value.startsWith('goal:')) {
    const id = value.slice('goal:'.length).trim();
    return id
      ? { kind: 'goal', id, value }
      : { kind: 'all', id: '', value: 'all' };
  }

  return {
    kind: 'notebook',
    id: value,
    value: buildNotebookDocumentSource(value)
  };
}
