# 对象列表页 API 死循环修复报告

## 问题描述
对象列表页面（`/browser/[bucket]`）出现 API 死循环请求，导致：
- 无限发送 `ListObjectsV2` 请求
- 页面性能严重下降
- 服务器负载增加

## 根本原因分析

### 1. useObject Hook 问题
```typescript
// 问题代码
export function useObject(bucket: string) {
  const client = useS3()
  
  const listObject = async (...) => { ... }  // 每次渲染创建新函数
  
  return { listObject, ... }  // 返回新对象引用
}
```

### 2. ObjectList 组件问题
```typescript
// 问题代码
const objectApi = useObject(bucket)  // 每次渲染返回新对象

const fetchObjects = useCallback(async () => {
  await objectApi.listObject(...)  // 依赖 objectApi
}, [..., objectApi])  // objectApi 每次都是新的

useEffect(() => {
  fetchObjects()
}, [fetchObjects])  // fetchObjects 每次都是新的 → 死循环
```

### 3. 依赖链导致死循环
```
渲染 → useObject 返回新对象 → objectApi 变化 
     → fetchObjects 重新创建 → useEffect 触发 
     → fetchObjects() 执行 → 触发重新渲染 → 循环
```

## 解决方案

### 1. useObject Hook 稳定化
使用 `useCallback` 包裹所有函数，确保引用稳定：

```typescript
export function useObject(bucket: string) {
  const client = useS3()
  
  const listObject = useCallback(
    async (...) => { ... },
    [client]  // 只依赖 client
  )
  
  const deleteObject = useCallback(
    async (...) => { ... },
    [client, bucket]
  )
  
  // ... 其他函数同样处理
  
  return { listObject, deleteObject, ... }
}
```

### 2. ObjectList 依赖优化
直接在 useEffect 中使用实际依赖，避免中间层：

```typescript
// 修复后
const fetchObjects = useCallback(async () => {
  await objectApi.listObject(...)
}, [bucket, prefix, pageSize, continuationToken, showDeleted, objectApi.listObject])

useEffect(() => {
  fetchObjects()
}, [bucket, prefix, pageSize, continuationToken, showDeleted])  // 直接依赖
```

### 3. 移除不必要的 useCallback
对于只在 useEffect 中使用的函数，直接内联：

```typescript
// 修复后
useEffect(() => {
  const loadBucketVersioningStatus = async () => {
    try {
      const resp = await getBucketVersioning(bucket)
      setBucketVersioningEnabled(resp?.Status === "Enabled")
    } catch {
      setBucketVersioningEnabled(false)
    }
  }
  loadBucketVersioningStatus()
}, [bucket, getBucketVersioning])  // 清晰的依赖
```

## 验证结果

### TypeScript 检查
```bash
pnpm tsc --noEmit
```
✅ 通过，无类型错误

### 构建测试
```bash
pnpm build
```
✅ 通过，所有路由成功构建

### 预期行为
- ✅ 对象列表只在 bucket/prefix/pagination 变化时请求
- ✅ 不再出现无限循环请求
- ✅ 页面性能恢复正常

## 最佳实践总结

### 1. Hook 设计原则
- 所有返回的函数都应使用 `useCallback` 包裹
- 依赖项应该是稳定的（primitives 或其他 memoized 值）
- 避免返回包含函数的新对象

### 2. useEffect 依赖管理
- 直接列出真实依赖，不要依赖 callback
- 对于一次性函数，考虑内联到 useEffect
- 使用 ESLint 的 `exhaustive-deps` 规则

### 3. 性能优化
- 使用 React DevTools Profiler 检测重渲染
- 使用 `useCallback` 和 `useMemo` 优化昂贵计算
- 避免在渲染过程中创建新的对象/函数引用

## 相关文件
- `hooks/use-object.ts` - 添加 useCallback 包裹
- `components/object/object-list.tsx` - 优化依赖管理

## 提交记录
```
69e14ff fix: prevent infinite API loop in object list page
```
