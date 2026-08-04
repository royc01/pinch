import { describe, expect, it } from 'vitest';
import type { Task } from '@/api';
import {
  buildTaskDocumentPathLookup,
  getTaskDocumentScopeKeys,
  getTaskDocumentScopeParentId,
  isDocumentPathInScope,
  taskMatchesDocumentScope
} from './taskDocumentScope';

function task(id: string, rootId: string, hPath: string, notebookId = 'nb-1'): Task {
  return {
    id,
    type: 'block',
    title: id,
    status: 'pending',
    priority: 'none',
    tags: [],
    rootId,
    hPath,
    notebookId,
    createdAt: '2026-06-20T00:00:00.000Z',
    updatedAt: '2026-06-20T00:00:00.000Z'
  };
}

describe('task document scope', () => {
  const tasks = [
    task('parent-task', 'doc-parent', '/Projects'),
    task('child-task', 'doc-child', '/Projects/Client A'),
    task('nested-child-task', 'doc-nested-child', '/Projects/Client A/Phase 1'),
    task('sibling-prefix-task', 'doc-sibling-prefix', '/Projects Archive'),
    task('other-notebook-child-task', 'doc-other-notebook-child', '/Projects/Client B', 'nb-2')
  ];

  const lookup = buildTaskDocumentPathLookup(tasks);

  it('matches the selected document and descendant documents', () => {
    expect(taskMatchesDocumentScope(tasks[0], 'doc-parent', lookup)).toBe(true);
    expect(taskMatchesDocumentScope(tasks[1], 'doc-parent', lookup)).toBe(true);
    expect(taskMatchesDocumentScope(tasks[2], 'doc-parent', lookup)).toBe(true);
  });

  it('does not match similar path prefixes or documents in another notebook', () => {
    expect(taskMatchesDocumentScope(tasks[3], 'doc-parent', lookup)).toBe(false);
    expect(taskMatchesDocumentScope(tasks[4], 'doc-parent', lookup)).toBe(false);
  });

  it('keeps child document scopes constrained to their own subtree', () => {
    expect(taskMatchesDocumentScope(tasks[0], 'doc-child', lookup)).toBe(false);
    expect(taskMatchesDocumentScope(tasks[1], 'doc-child', lookup)).toBe(true);
    expect(taskMatchesDocumentScope(tasks[2], 'doc-child', lookup)).toBe(true);
  });

  it('normalizes slash variants when comparing paths', () => {
    expect(isDocumentPathInScope('Projects/Client A/', '/Projects')).toBe(true);
    expect(isDocumentPathInScope('/ProjectsExtra/Client A', '/Projects')).toBe(false);
  });

  it('can use an explicit scope path when the selected document has no direct task', () => {
    expect(taskMatchesDocumentScope(tasks[1], 'doc-empty-parent', lookup, {
      notebookId: 'nb-1',
      path: '/Projects'
    })).toBe(true);
    expect(taskMatchesDocumentScope(tasks[4], 'doc-empty-parent', lookup, {
      notebookId: 'nb-1',
      path: '/Projects'
    })).toBe(false);
  });

  it('resolves ancestors from parent IDs and storage paths with loop protection', () => {
    const documents = new Map([
      ['nb-1:root', { id: 'root', notebookId: 'nb-1' }],
      ['nb-1:child', { id: 'child', notebookId: 'nb-1', parentId: 'root' }],
      ['nb-1:grandchild', { id: 'grandchild', notebookId: 'nb-1', storagePath: '/root.sy/child.sy/grandchild.sy' }],
      ['nb-1:loop-a', { id: 'loop-a', notebookId: 'nb-1', parentId: 'loop-b' }],
      ['nb-1:loop-b', { id: 'loop-b', notebookId: 'nb-1', parentId: 'loop-a' }]
    ]);

    expect(getTaskDocumentScopeParentId(documents, 'nb-1', 'child')).toBe('root');
    expect(getTaskDocumentScopeParentId(documents, 'nb-1', 'grandchild')).toBe('child');
    expect(Array.from(getTaskDocumentScopeKeys(task('scope-task', 'grandchild', '', 'nb-1'), documents)))
      .toEqual(['nb-1:grandchild', 'nb-1:child', 'nb-1:root']);
    expect(Array.from(getTaskDocumentScopeKeys(task('loop-task', 'loop-a', '', 'nb-1'), documents)))
      .toEqual(['nb-1:loop-a', 'nb-1:loop-b']);
  });
});
