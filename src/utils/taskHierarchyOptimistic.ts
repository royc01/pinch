export interface TaskHierarchyNode {
  id?: string;
  blockId?: string;
  nodeId?: string;
  subtasks?: TaskHierarchyNode[];
  [key: string]: unknown;
}

export interface TaskHierarchyReparentResult<T extends TaskHierarchyNode> {
  tasks: T[];
  movedTask: T | null;
}

export interface TaskHierarchyDetachOptions {
  targetId?: string;
  position?: 'before' | 'after' | 'end';
}

/**
 * Reparent one node in a task tree without mutating the original arrays.
 * Structural persistence is handled by the repository; this helper only
 * provides the synchronous visual update used while that request settles.
 */
export function reparentTaskInHierarchy<T extends TaskHierarchyNode>(
  items: T[],
  sourceId: string,
  targetId: string
): TaskHierarchyReparentResult<T> {
  const normalize = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
  const source = normalize(sourceId);
  const target = normalize(targetId);
  if (!source || !target || source === target) {
    return { tasks: items, movedTask: null };
  }

  const matches = (task: TaskHierarchyNode, id: string): boolean => [task.id, task.blockId, task.nodeId]
    .some(value => normalize(value) === id);
  let movedTask: T | null = null;

  const remove = (nodes: T[]): T[] => nodes.reduce<T[]>((result, node) => {
    if (matches(node, source)) {
      if (!movedTask) movedTask = { ...node } as T;
      return result;
    }
    const children = Array.isArray(node.subtasks) ? remove(node.subtasks as T[]) : [];
    result.push({
      ...node,
      ...(Array.isArray(node.subtasks)
        ? { subtasks: children.length > 0 ? children : undefined }
        : {})
    });
    return result;
  }, []);
  const withoutSource = remove(items);
  if (!movedTask) return { tasks: items, movedTask: null };

  let inserted = false;
  const insert = (nodes: T[]): T[] => nodes.map((node) => {
    const children = Array.isArray(node.subtasks) ? insert(node.subtasks as T[]) : [];
    if (matches(node, target)) {
      inserted = true;
      return {
        ...node,
        subtasks: [...children, movedTask]
      } as T;
    }
    return {
      ...node,
      ...(Array.isArray(node.subtasks)
        ? { subtasks: children.length > 0 ? children : undefined }
        : {})
    } as T;
  });

  const nextTasks = insert(withoutSource);
  return inserted
    ? { tasks: nextTasks, movedTask }
    : { tasks: items, movedTask: null };
}

/**
 * Remove one node from any depth and place it in the top-level task list.
 * This is the synchronous counterpart of moving a nested task out of its
 * parent. The source tree is never mutated.
 */
export function detachTaskInHierarchy<T extends TaskHierarchyNode>(
  items: T[],
  sourceId: string,
  options: TaskHierarchyDetachOptions = {}
): TaskHierarchyReparentResult<T> {
  const normalize = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
  const source = normalize(sourceId);
  const target = normalize(options.targetId);
  if (!source || (target && target === source)) {
    return { tasks: items, movedTask: null };
  }

  const matches = (task: TaskHierarchyNode, id: string): boolean => [task.id, task.blockId, task.nodeId]
    .some(value => normalize(value) === id);
  let movedTask: T | null = null;
  const remove = (nodes: T[]): T[] => nodes.reduce<T[]>((result, node) => {
    if (matches(node, source)) {
      if (!movedTask) movedTask = { ...node } as T;
      return result;
    }
    const children = Array.isArray(node.subtasks) ? remove(node.subtasks as T[]) : [];
    result.push({
      ...node,
      ...(Array.isArray(node.subtasks)
        ? { subtasks: children.length > 0 ? children : undefined }
        : {})
    });
    return result;
  }, []);
  const withoutSource = remove(items);
  if (!movedTask) return { tasks: items, movedTask: null };

  const nextTasks = [...withoutSource];
  let insertAt = nextTasks.length;
  if (target && (options.position === 'before' || options.position === 'after')) {
    const targetIndex = nextTasks.findIndex(task => matches(task, target));
    if (targetIndex >= 0) {
      insertAt = options.position === 'before' ? targetIndex : targetIndex + 1;
    }
  }
  nextTasks.splice(insertAt, 0, movedTask);
  return { tasks: nextTasks, movedTask };
}
