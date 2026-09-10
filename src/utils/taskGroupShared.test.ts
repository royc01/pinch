import { describe, expect, it } from 'vitest';
import {
  TASK_GROUP_NONE_ID,
  resolveTaskGroupDisplayOrder
} from '@/utils/taskGroupShared';

describe('resolveTaskGroupDisplayOrder', () => {
  it('places the untagged group at its saved position', () => {
    expect(resolveTaskGroupDisplayOrder(
      [TASK_GROUP_NONE_ID, 'work', 'personal', 'later'],
      ['work', 'personal', TASK_GROUP_NONE_ID, 'later']
    )).toEqual(['work', 'personal', TASK_GROUP_NONE_ID, 'later']);
  });

  it('keeps untagged first when no saved position exists', () => {
    expect(resolveTaskGroupDisplayOrder(
      [TASK_GROUP_NONE_ID, 'work', 'personal'],
      []
    )).toEqual([TASK_GROUP_NONE_ID, 'work', 'personal']);
  });
});
