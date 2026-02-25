import { describe, it, expect } from 'vitest';
import { TaskCRDTEngine, mergeTask } from './crdt';

describe('CRDT Engine', () => {
  it('应该正确创建和更新任务', () => {
    const engine = new TaskCRDTEngine('node1');

    engine.applyLocalUpdate('task1', 'title', 'Initial Title', 1000);
    engine.applyLocalUpdate('task1', 'status', 'pending', 1000);

    const task = engine.getTask('task1');
    expect(task?.title.value).toBe('Initial Title');
    expect(task?.status.value).toBe('pending');
    expect(task?.metadata.type).toBe('block');
  });

  it('应该正确合并远程任务（基于时间戳）', () => {
    const engine1 = new TaskCRDTEngine('node1');
    const engine2 = new TaskCRDTEngine('node2');

    engine1.applyLocalUpdate('task1', 'title', 'Initial Title', 1000);
    engine2.applyLocalUpdate('task1', 'title', 'Updated by Node2', 2000);

    const task2 = engine2.getTask('task1');
    engine1.mergeRemote(task2!);
    
    const mergedTask = engine1.getTask('task1');
    expect(mergedTask?.title.value).toBe('Updated by Node2');
  });

  it('应该解决同时间戳冲突（基于 nodeId）', () => {
    const engine3 = new TaskCRDTEngine('node3');
    const engine4 = new TaskCRDTEngine('node4');

    engine3.applyLocalUpdate('task2', 'status', 'pending', 3000);
    engine4.applyLocalUpdate('task2', 'status', 'completed', 3000);

    const task3 = engine3.getTask('task2');
    const task4 = engine4.getTask('task2');

    const merged = mergeTask(task3!, task4!);
    expect(merged.status.value).toBe('completed');
  });

  it('应该正确处理删除和恢复', () => {
    const engine = new TaskCRDTEngine('node1');
    const now = Date.now();

    engine.applyLocalUpdate('task1', 'title', 'Test Task', now);
    expect(engine.getVisibleTasks().length).toBe(1);

    engine.applyLocalDelete('task1', now + 1000);
    expect(engine.getVisibleTasks().length).toBe(0);

    engine.applyLocalRestore('task1', now + 2000);
    const restoredTask = engine.getTask('task1');
    expect(restoredTask?.deleted.value).toBe(false);
    expect(engine.getVisibleTasks().length).toBe(1);
  });

  it('应该正确处理复杂任务字段', () => {
    const engine = new TaskCRDTEngine('node1');
    
    engine.applyLocalUpdate('task3', 'title', 'Test');
    engine.applyLocalUpdate('task3', 'priority', 'high', 6000);
    engine.applyLocalUpdate('task3', 'dueDate', '2024-12-31', 7000);

    const task = engine.getTask('task3');
    expect(task?.priority.value).toBe('high');
    expect(task?.dueDate.value).toBe('2024-12-31');
  });
});
