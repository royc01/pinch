import { computed, onScopeDispose, ref, watch, type ComputedRef, type Ref } from 'vue';
import { sql, type Task } from '@/api';
import type { DocumentGroupMember } from '@/documentGroupRepository';
import {
  getTaskDocumentScopeKeys,
  taskMatchesDocumentScope,
  type TaskDocumentPathLookup,
  type TaskDocumentScopeTreeNode
} from '@/utils/taskDocumentScope';
import { escapeSqlLiteral } from '@/utils/sql';

type ScopeWithMembers = { members: DocumentGroupMember[] };

interface Options {
  documents: Ref<readonly TaskDocumentScopeTreeNode[]> | ComputedRef<readonly TaskDocumentScopeTreeNode[]>;
  documentGroups: Ref<readonly ScopeWithMembers[]> | ComputedRef<readonly ScopeWithMembers[]>;
  goals: Ref<readonly ScopeWithMembers[]> | ComputedRef<readonly ScopeWithMembers[]>;
  taskPathLookup: Ref<TaskDocumentPathLookup> | ComputedRef<TaskDocumentPathLookup>;
  logPrefix: string;
}

/** Shared document-group/goal matching, including paths for taskless parents. */
export function useDocumentScopeMatcher(options: Options) {
  const documentsByKey = computed(() => new Map(
    options.documents.value.map(document => [`${document.notebookId}:${document.id}`, document])
  ));
  const memberPathByKey = ref<Map<string, string>>(new Map());
  let refreshTimer: number | null = null;
  let refreshSequence = 0;

  function scheduleMemberPathRefresh(): void {
    if (refreshTimer !== null) clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => {
      refreshTimer = null;
      void refreshMemberPaths();
    }, 120);
  }

  async function refreshMemberPaths(): Promise<void> {
    const sequence = ++refreshSequence;
    const memberKeys = new Set<string>();
    [options.documentGroups.value, options.goals.value].forEach(scopes => scopes.forEach(scope => {
      scope.members.forEach(member => memberKeys.add(`${member.notebookId}:${member.documentId}`));
    }));
    if (memberKeys.size === 0) {
      memberPathByKey.value = new Map();
      return;
    }
    const nextPaths = new Map<string, string>();
    const keys = Array.from(memberKeys);
    try {
      for (let index = 0; index < keys.length; index += 300) {
        const idsClause = keys.slice(index, index + 300)
          .map(key => escapeSqlLiteral(key.slice(key.lastIndexOf(':') + 1)))
          .map(id => `'${id}'`)
          .join(',');
        const rows: Array<{ id?: string; box?: string; hpath?: string }> = await sql(
          `SELECT id, box, hpath FROM blocks WHERE type = 'd' AND id IN (${idsClause})`
        );
        rows.forEach(row => {
          const id = typeof row.id === 'string' ? row.id.trim() : '';
          const notebookId = typeof row.box === 'string' ? row.box.trim() : '';
          const path = typeof row.hpath === 'string' ? row.hpath.trim() : '';
          if (id && notebookId && path) nextPaths.set(`${notebookId}:${id}`, path);
        });
      }
    } catch (error) {
      console.warn(`${options.logPrefix} Failed to refresh document scope member paths:`, error);
    }
    if (sequence === refreshSequence) memberPathByKey.value = nextPaths;
  }

  function matchesMember(task: Task, member: DocumentGroupMember): boolean {
    const notebookId = typeof task.notebookId === 'string' ? task.notebookId.trim() : '';
    const memberNotebookId = typeof member.notebookId === 'string' ? member.notebookId.trim() : '';
    const memberDocumentId = typeof member.documentId === 'string' ? member.documentId.trim() : '';
    if (notebookId === memberNotebookId && memberDocumentId
      && getTaskDocumentScopeKeys(task, documentsByKey.value).has(`${memberNotebookId}:${memberDocumentId}`)) {
      return true;
    }
    return taskMatchesDocumentScope(task, memberDocumentId, options.taskPathLookup.value, {
      notebookId: memberNotebookId,
      path: memberPathByKey.value.get(`${memberNotebookId}:${memberDocumentId}`) || member.path
    });
  }

  function isExcluded(task: Task, excludedDocumentKeys: string[] | undefined): boolean {
    if (!excludedDocumentKeys?.length) return false;
    const excludedKeys = new Set(excludedDocumentKeys);
    return Array.from(getTaskDocumentScopeKeys(task, documentsByKey.value)).some(key => excludedKeys.has(key));
  }

  watch([options.documentGroups, options.goals], scheduleMemberPathRefresh, { immediate: true });
  onScopeDispose(() => {
    if (refreshTimer !== null) clearTimeout(refreshTimer);
  });

  return { matchesMember, isExcluded };
}
