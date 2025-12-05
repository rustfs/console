#!/bin/bash
set -e

echo "🔍 Running pre-commit checks..."

# Check if pnpm-lock.yaml is in sync (CRITICAL - must pass)
echo "📦 Checking pnpm-lock.yaml sync..."
if ! pnpm install --frozen-lockfile --dry-run > /dev/null 2>&1; then
  echo "❌ CRITICAL ERROR: pnpm-lock.yaml is out of sync with package.json"
  echo "   This will cause CI to fail!"
  echo "   Run: pnpm install"
  echo "   Then commit the updated pnpm-lock.yaml"
  exit 1
fi

# Run lint check (TypeScript type check + Prettier format check) (must pass)
echo "🔍 Running lint check (TypeScript + Prettier)..."
pnpm run lint || {
  echo "❌ Lint check failed"
  echo "   Run 'pnpm lint:fix' to auto-fix formatting issues"
  echo "   Fix any TypeScript errors manually"
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

