import { describe, expect, it, vi } from 'vitest';
import {
  normalizeTaskBlockIds,
  queryTaskAncestorContextRows
} from '@/utils/taskAncestorContext';

describe('task ancestor context', () => {
  it('normalizes block IDs without changing their order', () => {
    expect(normalizeTaskBlockIds(['first', '', 'first', 'second', null as unknown as string]))
      .toEqual(['first', 'second']);
  });

  it('escapes query IDs and normalizes valid ancestor rows', async () => {
    const executeSql = vi.fn().mockResolvedValue([
      { source_id: "task'o", id: 'task-parent', depth: '1', subtype: 't' },
      { source_id: '', id: 'invalid', depth: 0, subtype: 't' },
      { source_id: 'task-o', id: 'invalid-depth', depth: 'NaN', subtype: 't' }
    ]);

    const rows = await queryTaskAncestorContextRows(["task'o", "task'o"], executeSql);

    expect(executeSql).toHaveBeenCalledTimes(1);
    expect(executeSql.mock.calls[0][0]).toContain("'task''o'");
    expect(rows).toEqual([
      { source_id: "task'o", id: 'task-parent', depth: 1, subtype: 't' }
    ]);
  });

  it('does not query empty input and falls back to an empty result on errors', async () => {
    const executeSql = vi.fn().mockRejectedValue(new Error('unavailable'));

    await expect(queryTaskAncestorContextRows([], executeSql)).resolves.toEqual([]);
    await expect(queryTaskAncestorContextRows(['task-1'], executeSql)).resolves.toEqual([]);
    expect(executeSql).toHaveBeenCalledTimes(1);
  });
});
