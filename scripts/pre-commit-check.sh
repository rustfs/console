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

# Run Prettier format check (must pass)
echo "🎨 Running Prettier format check..."
pnpm prettier --check . || {
  echo "❌ Prettier format check failed"
  echo "   Run 'pnpm lint:fix' to auto-fix formatting issues"
  exit 1
}

# Run TypeScript type check (must pass)
echo "📘 Running TypeScript type check..."
pnpm vue-tsc --noEmit || {
  echo "❌ TypeScript type check failed"
  echo "   Fix all TypeScript errors before committing"
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

