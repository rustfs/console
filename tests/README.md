# Config Helpers 测试套件

这是 `config-helpers.ts` 模块的完整测试套件，包含单元测试、集成测试、性能测试和边界条件测试。

## 测试结构

```
tests/
├── setup.ts                                    # 测试环境设置
├── utils/
│   ├── config-helpers.test.ts                 # 主要单元测试
│   ├── config-helpers.integration.test.ts     # 集成测试和边界条件
│   ├── config-helpers.performance.test.ts     # 性能和压力测试
│   └── test-helpers.ts                        # 测试工具和 Mock 函数
└── README.md                                   # 本文件
```

## 安装测试依赖

```bash
# 安装测试依赖
npm install --save-dev vitest jsdom @vitest/ui c8

# 或者使用 yarn
yarn add --dev vitest jsdom @vitest/ui c8
```

## 运行测试

### 基本测试命令

```bash
# 运行所有测试
npm run test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行测试 UI 界面
npm run test:ui

# 运行单次测试（CI 模式）
npm run test:run
```

### 针对性测试

```bash
# 只运行 config-helpers 相关测试
npm run test:config-helpers

# 只运行性能测试
npm run test:performance

# 只运行集成测试
npm run test:integration

# 运行特定测试文件
npx vitest tests/utils/config-helpers.test.ts

# 运行特定测试用例
npx vitest -t "getCurrentBrowserConfig"
```

## 测试覆盖范围

### 1. 单元测试 (`config-helpers.test.ts`)

- ✅ **createDefaultConfig**: 默认配置创建
- ✅ **getCurrentBrowserConfig**: 浏览器配置获取
- ✅ **getStoredHostConfig**: localStorage 配置获取
- ✅ **fetchConfigFromServer**: 服务器配置获取和合并
- ✅ **getConfig**: 智能配置策略
- ✅ **saveHostConfig**: 配置保存
- ✅ **clearStoredHostConfig**: 配置清除
- ✅ **validateConfig**: 配置验证
- ✅ **getConfigSources**: 调试信息获取
- ✅ **Legacy Functions**: 向后兼容函数

### 2. 集成测试 (`config-helpers.integration.test.ts`)

- ✅ **完整配置流程**: 保存 → 获取 → 验证 → 清除
- ✅ **配置优先级**: server > localStorage > browser > default
- ✅ **边界条件**: 极端 URL、特殊字符、异常处理
- ✅ **并发操作**: 竞态条件、并发读写
- ✅ **跨浏览器兼容性**: 不同环境下的行为
- ✅ **错误恢复**: 网络错误、JSON 解析错误、存储异常

### 3. 性能测试 (`config-helpers.performance.test.ts`)

- ✅ **单函数性能**: 执行时间基准测试
- ✅ **批量操作**: 大量数据处理能力
- ✅ **并发性能**: 高并发场景下的稳定性
- ✅ **内存管理**: 内存泄漏检测
- ✅ **网络性能**: 慢速网络、超时处理
- ✅ **压力测试**: 极限负载下的表现

## 测试工具 (`test-helpers.ts`)

### Mock 工具

- **BrowserMock**: 模拟浏览器环境和 window.location
- **LocalStorageMock**: 模拟 localStorage 行为和异常
- **FetchMock**: 模拟各种网络响应场景

### 数据生成器

- **createTestConfig**: 生成测试配置对象
- **createTestServerResponse**: 生成服务器响应数据
- **generateUrlTestCases**: 生成 URL 测试用例
- **generateConfigTestCases**: 生成配置测试用例

### 性能工具

- **measureExecutionTime**: 测量函数执行时间
- **runBatchTest**: 批量执行测试
- **TestCleaner**: 测试环境清理

### 断言辅助

- **expectValidConfig**: 验证配置对象结构
- **expectValidConfigResult**: 验证 ConfigResult 结构
- **expectErrorResult**: 验证错误结果

## 测试场景

### 正常流程测试

1. **配置创建**: 验证默认配置生成的正确性
2. **配置获取**: 测试各种配置源的获取逻辑
3. **配置合并**: 验证服务器配置与默认配置的合并
4. **配置保存**: 测试配置持久化功能
5. **配置验证**: 验证配置完整性检查

### 异常情况测试

1. **网络异常**: 超时、连接失败、无效响应
2. **存储异常**: localStorage 不可用、配额超限
3. **数据异常**: 无效 URL、损坏的 JSON、缺失字段
4. **环境异常**: 非浏览器环境、缺失 API

### 边界条件测试

1. **极端数据**: 超长 URL、大型配置对象、特殊字符
2. **并发操作**: 同时读写、竞态条件、资源竞争
3. **性能极限**: 大量数据、高频操作、内存压力

## 性能基准

### 执行时间要求

- `getCurrentBrowserConfig`: < 1ms
- `saveHostConfig`: < 5ms
- `validateConfig`: < 1ms
- `fetchConfigFromServer`: < 100ms (mock 环境)

### 批量操作要求

- 1000 次配置获取: < 1 秒
- 100 次配置保存: 平均 < 10ms/次
- 1000 次配置验证: 平均 < 0.5ms/次

### 并发性能要求

- 50 个并发请求: < 1 秒完成
- 200 个极端并发操作: 全部成功完成

## CI/CD 集成

### GitHub Actions 示例

```yaml
name: Test Config Helpers
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:run
      - run: npm run test:coverage
```

### 覆盖率要求

- **语句覆盖率**: > 95%
- **分支覆盖率**: > 90%
- **函数覆盖率**: 100%
- **行覆盖率**: > 95%

## 调试技巧

### 运行单个测试

```bash
# 使用 describe 或 it 的名称
npx vitest -t "getCurrentBrowserConfig 应该基于当前浏览器位置创建配置"

# 使用文件路径和行号
npx vitest tests/utils/config-helpers.test.ts:45
```

### 查看详细输出

```bash
# 显示详细的测试输出
npx vitest --reporter=verbose

# 显示覆盖率详情
npx vitest --coverage --reporter=verbose
```

### 调试模式

```bash
# 在 Node.js 调试模式下运行
npx vitest --inspect-brk

# 使用 VS Code 调试
# 在 .vscode/launch.json 中添加配置
```

## 最佳实践

1. **测试隔离**: 每个测试都应该独立，不依赖其他测试的状态
2. **Mock 管理**: 在 `beforeEach` 中重置 Mock，在 `afterEach` 中清理
3. **断言明确**: 使用具体的断言，避免过于宽泛的检查
4. **错误测试**: 不仅测试成功路径，也要测试失败路径
5. **性能监控**: 定期运行性能测试，监控性能回归

## 故障排除

### 常见问题

1. **localStorage 不可用**: 确保在测试设置中正确 Mock localStorage
2. **fetch 未定义**: 确保在 setup.ts 中 Mock fetch
3. **window 对象缺失**: 使用 jsdom 环境或正确 Mock window
4. **异步测试超时**: 增加超时时间或优化异步逻辑

### 调试步骤

1. 检查测试设置文件 (`setup.ts`)
2. 验证 Mock 配置是否正确
3. 查看测试输出和错误信息
4. 使用 `console.log` 或调试器检查状态
5. 运行单个测试以隔离问题

## 贡献指南

### 添加新测试

1. 确定测试类型（单元/集成/性能）
2. 选择合适的测试文件
3. 使用现有的测试工具和 Mock
4. 遵循命名约定和结构
5. 添加必要的文档注释

### 测试命名约定

- 使用中文描述测试意图
- 格式：`应该 + 期望行为`
- 例如：`应该在服务器配置失败时回退到浏览器配置`

### 代码覆盖率

- 新功能必须有对应的测试
- 保持高覆盖率（> 95%）
- 重点测试边界条件和错误路径
