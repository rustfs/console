# 🚀 GitHub Actions CI/CD Pipelines

This project is configured with comprehensive CI/CD pipelines for automated testing, code quality checks, security scanning, and deployment.

## 📋 Workflow Overview

### 🧪 Test Pipeline (`test.yml`)

**Triggers**: Push to main/develop branches, PRs to main/develop branches

**Included Jobs**:

- 🔍 **Code Quality Checks**: Linting, TypeScript type checking
- 🧪 **Unit Tests**: Multi Node.js version testing (20, 22)
- 🔗 **Integration Tests**: Complete functional integration tests
- 📊 **Code Coverage**: Generate coverage reports and upload to Codecov
- 🔒 **Security Scanning**: Dependency security audit and CodeQL analysis
- 🏗️ **Build Test**: Verify the project can build successfully
- 📋 **Test Summary**: Aggregate all test results

**Coverage Requirements**:

- Statement Coverage: > 95%
- Branch Coverage: > 90%
- Function Coverage: 100%
- Line Coverage: > 95%

### 🔍 Code Quality Pipeline (`quality.yml`)

**Triggers**: Push/PR + Daily scheduled checks

**Included Jobs**:

- 💅 **Code Formatting Check**: Prettier formatting validation
- 📘 **TypeScript Check**: Type safety verification
- 📦 **Dependency Check**: Outdated packages and security vulnerability checks
- 🧮 **Code Complexity Analysis**: Code quality metrics
- 📚 **Documentation Check**: JSDoc coverage check
- 📋 **Quality Summary**: Comprehensive quality score

**Quality Score Standards**:

- 🎉 **Excellent** (90%+): Outstanding code quality
- 👍 **Good** (75%+): Stable code quality
- ⚠️ **Fair** (60%+): Needs improvement
- ❌ **Needs Improvement** (<60%): Multiple issues need to be addressed

### 🚀 Release Pipeline (`release.yml`)

**Triggers**: Tag push, Release publication, Manual trigger

**Included Jobs**:

- 🔍 **Pre-Release Validation**: Full test suite verification
- 🏗️ **Build Release Package**: Production build
- 🚀 **Deploy to Staging**: Pre-release environment deployment
- 🌟 **Deploy to Production**: Production environment deployment
- 📝 **Create GitHub Release**: Auto-generate Release notes
- 📢 **Post-Release Notification**: Deployment status notification

**Deployment Environments**:

- **Staging**: <https://staging.example.com>
- **Production**: <https://console.example.com>

### 📦 Dependency Management Pipeline (`dependencies.yml`)

**Triggers**: Weekly Monday scheduled check, Manual trigger

**Included Jobs**:

- 🔒 **Security Audit**: Dependency security vulnerability scanning
- 📋 **Update Check**: Check for outdated dependency packages
- 🔄 **Auto Update**: Automatically update dependencies and test
- 📊 **Dependency Analysis**: Generate dependency analysis report

**Update Strategies**:

- **patch**: Only update patch versions (default)
- **minor**: Update minor versions
- **major**: Update major versions
- **all**: Update all versions

## 🔧 Configuration Requirements

### Environment Variables

Configure the following Secrets in GitHub repository settings:

```bash
# Codecov integration (optional)
CODECOV_TOKEN=your_codecov_token

# Deployment related (configure as needed)
DEPLOY_SSH_KEY=your_ssh_private_key
STAGING_HOST=staging.example.com
PRODUCTION_HOST=console.example.com
```

### Branch Protection Rules

It is recommended to set protection rules for `main` and `develop` branches:

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

## 📊 Monitoring and Reporting

### Test Reports

The following reports are generated after each run:

- 📊 **Coverage Report**: `coverage/` directory
- 🧪 **Test Results**: JUnit XML format
- 🔒 **Security Report**: Security audit results
- 📋 **Quality Metrics**: Code quality analysis

### Quality Metrics

- **Code Coverage**: Display coverage changes in PRs
- **Dependency Security**: Number and severity of security vulnerabilities
- **Code Complexity**: File size and function complexity
- **Test Results**: Test execution status and duration

## 🚨 Troubleshooting

### Test Failures

1. **View Failed Tests**: Check detailed logs in the Actions page
2. **Reproduce Locally**: Run tests locally using the same Node.js version
3. **Fix Issues**: Fix code or update tests
4. **Resubmit**: Push the fixed code

### Deployment Failures

1. **Check Deployment Logs**: Review detailed output of deployment steps
2. **Verify Environment**: Confirm target environment availability
3. **Rollback**: If needed, manually rollback to the previous version
4. **Fix and Retry**: Fix issues and trigger deployment again

### Dependency Issues

1. **Security Vulnerabilities**: Automatically create Issues, prioritize fixing high-severity vulnerabilities
2. **Update Failures**: Check test failure reasons, manually resolve compatibility issues
3. **License Issues**: Check license compatibility of new dependencies

## 🔄 Workflow

### Development Workflow

1. **Create Feature Branch**: `git checkout -b feature/new-feature`
2. **Develop and Test**: Develop locally and run tests
3. **Commit Code**: Follow Conventional Commits specification, **commit messages must be in English**
4. **Create PR**: Fill in detailed information using PR template
5. **Automatic Checks**: CI/CD automatically runs all checks
6. **Code Review**: Team members review code
7. **Merge Code**: Merge after all checks pass

**Commit Convention**:

- ✅ Correct: `git commit -m "feat: add user authentication"`
- ❌ Wrong: `git commit -m "功能: 添加用户认证"`
- ✅ Correct: `git commit -m "fix: resolve bucket creation issue"`
- ❌ Wrong: `git commit -m "修复: 解决存储桶创建问题"`

All commit messages must be in English, including titles and descriptions.

### Release Workflow

1. **Prepare Release**: Ensure all features are completed and tested
2. **Create Tag**: `git tag v1.0.0 && git push origin v1.0.0`
3. **Automatic Deployment**: CI/CD automatically executes release process
4. **Verify Deployment**: Check Staging environment
5. **Production Deployment**: Manually approve production environment deployment
6. **Monitor**: Monitor production environment health

## 📈 Performance Optimization

### Pipeline Optimization

- **Parallel Execution**: Run independent jobs in parallel whenever possible
- **Cache Strategy**: Use pnpm cache to speed up dependency installation
- **Conditional Execution**: Conditionally run jobs based on changed content
- **Resource Limits**: Set reasonable timeout durations

### Test Optimization

- **Test Layering**: Unit tests > Integration tests > E2E tests
- **Concurrent Testing**: Utilize Vitest's concurrency capabilities
- **Selective Testing**: Only test code related to changes
- **Mock Strategy**: Reasonably use Mocks to reduce external dependencies

## 🔗 Related Links

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vitest Documentation](https://vitest.dev/)
- [Codecov Documentation](https://docs.codecov.com/)
- [Project Test Documentation](../tests/README.md)

## 📞 Support

If you encounter issues while using CI/CD pipelines:

1. Check [GitHub Issues](../../issues) for known issues
2. Create a new [Bug Report](../../issues/new?template=bug_report.md)
3. Contact project maintainers

---

🤖 **Automation makes development more efficient!** This CI/CD pipeline ensures code quality, improves development efficiency, and allows the team to focus on feature development rather than repetitive manual tasks.
