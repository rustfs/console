# 🚀 GitHub Actions CI/CD 流水线

本项目配置了完整的 CI/CD 流水线，用于自动化测试、代码质量检查、安全扫描和部署。

## 📋 工作流概览

### 🧪 测试流水线 (`test.yml`)

**触发条件**: Push 到 main/develop 分支，PR 到 main/develop 分支

**包含的任务**:

- 🔍 **代码质量检查**: Linting, TypeScript 类型检查
- 🧪 **单元测试**: 多 Node.js 版本测试 (20, 22)
- 🔗 **集成测试**: 完整的功能集成测试
- 📊 **代码覆盖率**: 生成覆盖率报告并上传到 Codecov
- 🔒 **安全扫描**: 依赖安全审计和 CodeQL 分析
- 🏗️ **构建测试**: 验证项目可以正常构建
- 📋 **测试总结**: 汇总所有测试结果

**覆盖率要求**:

- 语句覆盖率: > 95%
- 分支覆盖率: > 90%
- 函数覆盖率: 100%
- 行覆盖率: > 95%

### 🔍 代码质量流水线 (`quality.yml`)

**触发条件**: Push/PR + 每日定时检查

**包含的任务**:

- 💅 **代码格式检查**: Prettier 格式化检查
- 📘 **TypeScript 检查**: 类型安全验证
- 📦 **依赖检查**: 过期包和安全漏洞检查
- 🧮 **代码复杂度分析**: 代码质量指标
- 📚 **文档检查**: JSDoc 覆盖率检查
- 📋 **质量总结**: 综合质量评分

**质量评分标准**:

- 🎉 **优秀** (90%+): 代码质量出色
- 👍 **良好** (75%+): 代码质量稳定
- ⚠️ **一般** (60%+): 需要改进
- ❌ **需要改进** (<60%): 多项问题需要解决

### 🚀 发布流水线 (`release.yml`)

**触发条件**: 标签推送、Release 发布、手动触发

**包含的任务**:

- 🔍 **预发布验证**: 完整测试套件验证
- 🏗️ **构建发布包**: 生产环境构建
- 🚀 **部署到 Staging**: 预发布环境部署
- 🌟 **部署到 Production**: 生产环境部署
- 📝 **创建 GitHub Release**: 自动生成 Release 说明
- 📢 **发布后通知**: 部署状态通知

**部署环境**:

- **Staging**: <https://staging.example.com>
- **Production**: <https://console.example.com>

### 📦 依赖管理流水线 (`dependencies.yml`)

**触发条件**: 每周一定时检查、手动触发

**包含的任务**:

- 🔒 **安全审计**: 依赖安全漏洞扫描
- 📋 **更新检查**: 检查过期的依赖包
- 🔄 **自动更新**: 自动更新依赖并测试
- 📊 **依赖分析**: 生成依赖分析报告

**更新策略**:

- **patch**: 只更新补丁版本 (默认)
- **minor**: 更新次要版本
- **major**: 更新主要版本
- **all**: 更新所有版本

## 🔧 配置要求

### 环境变量

在 GitHub 仓库设置中配置以下 Secrets:

```bash
# Codecov 集成 (可选)
CODECOV_TOKEN=your_codecov_token

# 部署相关 (根据实际需求配置)
DEPLOY_SSH_KEY=your_ssh_private_key
STAGING_HOST=staging.example.com
PRODUCTION_HOST=console.example.com
```

### 分支保护规则

建议为 `main` 和 `develop` 分支设置保护规则:

```yaml
# .github/branch-protection.yml
main:
  required_status_checks:
    - "🔍 Code Quality"
    - "🧪 Unit Tests"
    - "🔗 Integration Tests"
    - "📊 Code Coverage"
  enforce_admins: true
  required_pull_request_reviews:
    required_approving_review_count: 1
    dismiss_stale_reviews: true
  restrictions: null
```

## 📊 监控和报告

### 测试报告

每次运行后会生成以下报告:

- 📊 **覆盖率报告**: `coverage/` 目录
- 🧪 **测试结果**: JUnit XML 格式
- ⚡ **性能报告**: JSON 格式的性能数据
- 🌐 **浏览器测试**: 截图和测试结果

### 质量指标

- **代码覆盖率**: 在 PR 中显示覆盖率变化
- **性能基准**: 与之前版本的性能对比
- **依赖安全**: 安全漏洞数量和严重程度
- **代码复杂度**: 文件大小和函数复杂度

## 🚨 故障处理

### 测试失败

1. **查看失败的测试**: 在 Actions 页面查看详细日志
2. **本地复现**: 使用相同的 Node.js 版本本地运行测试
3. **修复问题**: 修复代码或更新测试
4. **重新提交**: Push 修复后的代码

### 部署失败

1. **检查部署日志**: 查看部署步骤的详细输出
2. **验证环境**: 确认目标环境的可用性
3. **回滚操作**: 如果需要，手动回滚到上一个版本
4. **修复并重试**: 修复问题后重新触发部署

### 依赖问题

1. **安全漏洞**: 自动创建 Issue，优先修复高危漏洞
2. **更新失败**: 检查测试失败原因，手动解决兼容性问题
3. **许可证问题**: 检查新依赖的许可证兼容性

## 🔄 工作流程

### 开发流程

1. **创建功能分支**: `git checkout -b feature/new-feature`
2. **开发和测试**: 本地开发并运行测试
3. **提交代码**: 遵循 Conventional Commits 规范，**提交信息必须使用英文**
4. **创建 PR**: 使用 PR 模板填写详细信息
5. **自动检查**: CI/CD 自动运行所有检查
6. **代码审查**: 团队成员审查代码
7. **合并代码**: 所有检查通过后合并

**提交规范**:

- ✅ 正确: `git commit -m "feat: add user authentication"`
- ❌ 错误: `git commit -m "功能: 添加用户认证"`
- ✅ 正确: `git commit -m "fix: resolve bucket creation issue"`
- ❌ 错误: `git commit -m "修复: 解决存储桶创建问题"`

所有提交信息（commit message）必须使用英文，包括标题和描述。

### 发布流程

1. **准备发布**: 确保所有功能已完成并测试
2. **创建标签**: `git tag v1.0.0 && git push origin v1.0.0`
3. **自动部署**: CI/CD 自动执行发布流程
4. **验证部署**: 检查 Staging 环境
5. **生产部署**: 手动批准生产环境部署
6. **监控**: 监控生产环境的健康状况

## 📈 性能优化

### 流水线优化

- **并行执行**: 尽可能并行运行独立的任务
- **缓存策略**: 使用 npm 缓存加速依赖安装
- **条件执行**: 根据变更内容有条件地运行任务
- **资源限制**: 设置合理的超时时间

### 测试优化

- **测试分层**: 单元测试 > 集成测试 > E2E 测试
- **并发测试**: 使用 Vitest 的并发能力
- **选择性测试**: 只测试变更相关的代码
- **Mock 策略**: 合理使用 Mock 减少外部依赖

## 🔗 相关链接

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Vitest 文档](https://vitest.dev/)
- [Codecov 文档](https://docs.codecov.com/)
- [项目测试文档](../tests/README.md)

## 📞 支持

如果在使用 CI/CD 流水线时遇到问题:

1. 查看 [GitHub Issues](../../issues) 中的已知问题
2. 创建新的 [Bug Report](../../issues/new?template=bug_report.md)
3. 联系项目维护者

---

🤖 **自动化让开发更高效！** 这套 CI/CD 流水线确保代码质量，提高开发效率，让团队专注于功能开发而不是重复的手动任务。
