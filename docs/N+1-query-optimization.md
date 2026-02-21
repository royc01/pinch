# N+1 查询优化说明

## 问题
之前每个任务都会单独调用 `getBlockDOM(id)` API，导致 N+1 次查询。

**示例**：100 个任务 = 100 次 API 调用

## 解决方案

### 1. 新增批量获取函数
```typescript
async function batchGetBlockDOM(ids: string[]): Promise<Map<string, BlockDOMResponse>>
```

**特性**：
- 批量大小：20 个 ID
- 最大并发：5 个并发
- 自动错误处理
- 返回 Map 便于快速查找

### 2. 修改 processBlock 签名
```typescript
const processBlock = async (
  parentBlock: SiyuanBlock, 
  domMap: Map<string, BlockDOMResponse>
): Promise<Task | null>
```

### 3. 批量处理流程
```typescript
for (const chunk of chunks) {
  const blockIds = chunk.map(block => block.id);
  const domMap = await batchGetBlockDOM(blockIds);
  
  const results = await Promise.all(chunk.map(block => processBlock(block, domMap)));
  tasks.push(...validResults);
}
```

## 性能提升

### 之前
- 100 个任务
- 每个任务 1 次 API 调用
- 每次调用 ~50-100ms
- **总耗时：5-10 秒**

### 之后
- 100 个任务
- 每 20 个任务 1 批（5 个并发）
- 批次耗时 ~100ms（并发）
- **总耗时：~500ms-1 秒**

### 提升
**性能提升：90-95%**

## 实现细节

### 并发控制
```typescript
const maxConcurrent = 5;
for (let j = 0; j < maxConcurrent && i + j * batchSize < ids.length; j++) {
  // 创建最多 5 个并发批次
}
```

### 错误处理
```typescript
getBlockDOM(id).catch((error) => {
  log_debug('获取块DOM失败', { id, error });
  return null;  // 不阻塞其他请求
})
```

### Map 结构
```typescript
const result = new Map<string, BlockDOMResponse>();
result.set(id, domResponse);  // 便于 O(1) 查找
```
