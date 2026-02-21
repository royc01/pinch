import { TaskCRDTEngine, mergeTask, CRDTTask } from './crdt';

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
  }
}

console.log('🧪 CRDT Engine Tests Starting...\n');

try {
  
  const engine1 = new TaskCRDTEngine('node1');
  const engine2 = new TaskCRDTEngine('node2');

  
  engine1.applyLocalUpdate('task1', 'title', 'Initial Title', 1000);
  engine1.applyLocalUpdate('task1', 'status', 'pending', 1000);

  const task1 = engine1.getTask('task1');
  console.log('✓ Created task1 on node1:', task1?.title.value);
  assertEqual(task1?.title.value, 'Initial Title', 'Title should be "Initial Title"');

  
  engine2.applyLocalUpdate('task1', 'title', 'Updated by Node2', 2000);
  const task2 = engine2.getTask('task1');
  console.log('✓ Updated task1 on node2:', task2?.title.value);
  assertEqual(task2?.title.value, 'Updated by Node2', 'Title should be updated by node2');

  
  engine1.mergeRemote(task2!);
  const mergedTask = engine1.getTask('task1');
  console.log('✓ Merged remote task:', mergedTask?.title.value);
  assertEqual(mergedTask?.title.value, 'Updated by Node2', 'After merge, title should be from node2 (later timestamp)');

  
  const engine3 = new TaskCRDTEngine('node3');
  const engine4 = new TaskCRDTEngine('node4');

  engine3.applyLocalUpdate('task2', 'status', 'pending', 3000);
  engine4.applyLocalUpdate('task2', 'status', 'completed', 3000);

  const task3 = engine3.getTask('task2');
  const task4 = engine4.getTask('task2');

  const merged = mergeTask(task3!, task4!);
  console.log('✓ Concurrent conflict resolution (same timestamp):', merged.status.value);
  assertEqual(merged.status.value, 'completed', 'Node4 should win (node4 > node3)');

  
  engine1.applyLocalDelete('task1', 4000);
  const deletedTask = engine1.getTask('task1');
  console.log('✓ Deleted task1:', deletedTask?.deleted.value);
  assertEqual(deletedTask?.deleted.value, true, 'Task should be marked as deleted');

  const visibleTasks = engine1.getVisibleTasks();
  console.log('✓ Visible tasks count:', visibleTasks.length);
  assertEqual(visibleTasks.length, 0, 'Deleted task should not be in visible tasks');

  
  engine1.applyLocalRestore('task1', 5000);
  const restoredTask = engine1.getTask('task1');
  console.log('✓ Restored task1:', restoredTask?.deleted.value);
  assertEqual(restoredTask?.deleted.value, false, 'Task should be restored');

  
  engine1.applyLocalUpdate('task3', 'title', 'Test');
  engine1.applyLocalUpdate('task3', 'priority', 'high', 6000);
  engine1.applyLocalUpdate('task3', 'dueDate', '2024-12-31', 7000);

  const complexTask = engine1.getTask('task3');
  console.log('✓ Complex task:', {
    title: complexTask?.title.value,
    priority: complexTask?.priority.value,
    dueDate: complexTask?.dueDate.value
  });
  assertEqual(complexTask?.priority.value, 'high', 'Priority should be high');
  assertEqual(complexTask?.dueDate.value, '2024-12-31', 'Due date should be set');

  console.log('\n✅ All CRDT tests passed!\n');
} catch (error) {
  console.error('\n❌ Test failed:', error);
  throw error;
}
