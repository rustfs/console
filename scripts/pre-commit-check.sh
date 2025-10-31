#!/bin/bash
set -e

echo "🔍 Running pre-commit checks..."

# Check if pnpm-lock.yaml is in sync
echo "📦 Checking pnpm-lock.yaml sync..."
if ! pnpm install --frozen-lockfile --dry-run > /dev/null 2>&1; then
  echo "❌ Error: pnpm-lock.yaml is out of sync with package.json"
  echo "   Run: pnpm install"
  exit 1
fi

# Run linting
echo "🔍 Running linter..."
pnpm run lint || {
  echo "❌ Linting failed. Run 'pnpm lint:fix' to auto-fix"
  exit 1
}

# Run type checking
echo "📘 Running type check..."
pnpm run type-check || {
  echo "❌ Type checking failed"
  exit 1
}

# Run tests
echo "🧪 Running tests..."
pnpm test:run || {
  echo "❌ Tests failed"
  exit 1
}

# Check build
echo "🏗️  Checking build..."
pnpm build || {
  echo "❌ Build failed"
  exit 1
}

# Security audit
echo "🔒 Running security audit..."
pnpm audit --audit-level=moderate || {
  echo "⚠️  Security vulnerabilities found (moderate or higher)"
  echo "   Review with: pnpm audit"
  exit 1
}

echo "✅ All checks passed!"

