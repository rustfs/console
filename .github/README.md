# GitHub Actions CI/CD

CI/CD pipelines for automated testing, code quality checks, security scanning, and deployment.

## Workflows

### Test Pipeline (`test.yml`)

Runs on push/PR to main/develop branches.

- Linting and TypeScript type checking
- Unit tests (Node.js 20, 22)
- Integration tests
- Code coverage (>95% statements, >90% branches, 100% functions)
- Security audit (dependency scan + CodeQL)
- Build verification

### Code Quality Pipeline (`quality.yml`)

Runs on push/PR + daily scheduled checks.

- Prettier formatting check
- TypeScript type safety
- Dependency security check
- Code complexity analysis
- JSDoc coverage

### Release Pipeline (`release.yml`)

Triggers: tag push, release publication, manual trigger.

- Pre-release validation (full test suite)
- Production build
- Deploy to staging/production
- Auto-generate GitHub Release notes

### Dependency Management (`dependencies.yml`)

Weekly Monday checks + manual trigger.

- Security audit
- Outdated package detection
- Auto-update dependencies (patch/minor/major/all)

## Configuration

### Required Secrets

```bash
CODECOV_TOKEN=your_codecov_token          # Optional
DEPLOY_SSH_KEY=your_ssh_private_key       # If deploying
STAGING_HOST=staging.example.com
PRODUCTION_HOST=console.example.com
```

## Development Workflow

1. Create feature branch: `git checkout -b feature/new-feature`
2. Develop and test locally
3. Commit using Conventional Commits (English only)
4. Create PR
5. CI/CD runs automatically
6. Code review
7. Merge after all checks pass

**Commit messages must be in English:**

- ✅ `git commit -m "feat: add user authentication"`
- ❌ `git commit -m "功能: 添加用户认证"`

## Troubleshooting

**Test failures**: Check Actions logs, reproduce locally, fix and push.

**Deployment failures**: Check deployment logs, verify environment, rollback if needed.

**Dependency issues**: Auto-created Issues for security vulnerabilities, manually resolve compatibility issues.

## Links

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Vitest Docs](https://vitest.dev/)
- [Project Tests](../tests/README.md)
