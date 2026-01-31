# 修复验证报告

## 问题描述
在初始渲染时出现 "useApi must be used within ApiProvider" 和 "useS3 must be used within S3Provider" 错误。

## 根本原因
1. `ApiProvider` 和 `S3Provider` 在加载配置时，API/S3 客户端为 `null`
2. 组件在客户端初始化完成前就尝试调用 `useApi()` 和 `useS3()`
3. 这些 hooks 在客户端为 `null` 时会抛出错误

## 解决方案

### 1. ApiProvider 改进
- 添加 `isReady` 状态追踪初始化状态
- 导出 `useApiReady()` hook
- 修改 context 值为 `{ api, isReady }`

### 2. S3Provider 改进
- 添加 `isReady` 状态追踪初始化状态
- 导出 `useS3Ready()` hook
- 修改 context 值为 `{ client, isReady }`

### 3. DashboardAuthGuard 改进
- 等待 `apiReady && s3Ready` 都为 true
- 在客户端未就绪时返回 null（不渲染子组件）

### 4. 组件适配
- `useUsers` hook 改用 `useApiOptional()` 并添加 null 检查
- `AccessKeysChangePassword` 改用 `useApiOptional()` 并添加 null 检查

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
✅ 通过，所有页面成功构建

### 页面列表
所有 23 个路由均成功构建：
- ○ 静态页面: `/`, `/auth/login`, `/config`, `/_not-found`
- ƒ 动态页面: 19 个 dashboard 页面

## 提交记录
1. `1b2f20f` - fix: handle API context not ready in useUsers hook
2. `69773a5` - fix: wait for API to be ready before rendering dashboard
3. `52170a2` - fix: add isReady state to S3Provider for consistent initialization

## 测试建议
1. 清除浏览器缓存后测试登录流程
2. 验证所有 dashboard 页面可正常加载
3. 验证表单组件（Lifecycle, Replication, Site-replication）可正常打开
4. 验证用户下拉菜单和密码修改功能

## 架构改进
- 统一的初始化模式：所有 Provider 都有 `isReady` 状态
- 防御性编程：使用 `useXxxOptional()` 处理可能为 null 的情况
- 渲染控制：通过 AuthGuard 控制组件渲染时机
