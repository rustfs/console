# Repository Guidelines

## Project Structure & Module Organization

- Core application lives under `pages/`, with supporting UI atoms in `components/`.
- Shared state and utilities are in `store/`, `composables/`, and `lib/`.
- Configuration lives in `app.config.ts`, `nuxt.config.ts`, and `config/`.
- Tests belong in `tests/`, and static assets in `public/` or `assets/`.

## Build, Test, and Development Commands

- `pnpm dev` – start the Nuxt development server with hot reload.
- `pnpm build` – create a production build.
- `pnpm preview` – run the production bundle locally.
- `pnpm test:run` – execute the Vitest suite once.
- `pnpm vue-tsc --noEmit` – perform a strict type check.
- `pnpm lint` – run `vue-tsc` and Prettier (format check only).

## Mandatory Code Quality Checks

**⚠️ CRITICAL: These checks MUST pass before every commit.**

Before committing any code changes, you MUST run and pass:

1. **Lockfile Sync Check**: `pnpm install --frozen-lockfile`
   - Ensures `pnpm-lock.yaml` is in sync with `package.json`
   - **MUST run `pnpm install` after modifying `package.json` and commit the updated `pnpm-lock.yaml`**
   - CI will fail if lockfile is out of sync

2. **TypeScript Type Check**: `pnpm vue-tsc --noEmit`
   - Ensures all TypeScript types are correct
   - Must have zero errors before committing

3. **Prettier Format Check**: `pnpm prettier --check .`
   - Ensures all code follows formatting standards
   - If it fails, run `pnpm lint:fix` to auto-fix formatting issues

4. **Test Coverage Check**: Review and update tests for code changes
   - **MUST review test cases** when modifying code: add tests for new features, update tests for changed behavior, remove tests for removed features
   - Run `pnpm test:run` to ensure all tests pass and verify test coverage
   - Ensure test cases accurately reflect the current implementation

**Automated Enforcement**: The pre-commit hook (`scripts/pre-commit-check.sh`) automatically runs these checks. If any check fails, the commit will be blocked.

**Quick Fix Command**: If checks fail:

1. Run `pnpm install` to sync lockfile (if package.json changed)
2. Run `pnpm lint:fix` to auto-fix formatting
3. Address any TypeScript errors manually
4. Review and update test cases as needed, then run `pnpm test:run` to verify

## Coding Style & Naming Conventions

- Use Prettier defaults (see `.prettierrc.ts`); run `pnpm lint` or `pnpm lint:fix`.
- **Always run `pnpm run lint:fix` after making code changes to ensure formatting compliance before committing.**
- Vue files use `<script setup>` with TypeScript; prefer composables for shared logic.
- Component files use **kebab-case** (e.g. `bucket-selector.vue`), but reference them using **StudlyCase** in templates (e.g., `<BucketSelector />`).
- Override shadcn primitives **outside** `components/ui/`; never edit files in that directory directly.
- Render tabular data with the shared `DataTable` + `useDataTable` utilities unless a specific requirement makes them unsuitable.
- Language pack files should exclude test directories when processing translation keys.

## Testing Guidelines

- Vitest is the primary framework; add new suites under `tests/`.
- Name files `*.spec.ts` or `*.test.ts` and mirror source structure.
- Keep tests deterministic; mock network calls through provided composables.
- **⚠️ CRITICAL: Every code change MUST include corresponding test updates:**
  - **New features**: Add comprehensive test cases covering happy paths and edge cases
  - **Modified behavior**: Update existing tests to reflect new implementation
  - **Removed features**: Remove or update tests for deprecated/removed functionality
  - **Bug fixes**: Add regression tests to prevent future occurrences
- Run `pnpm test:run` before submitting any changes to ensure all tests pass.
- Verify test coverage and ensure critical paths are adequately tested.

## Commit & Pull Request Guidelines

- Follow conventional, action-oriented commit subjects (e.g. `feat: add bucket selector`).
- Each pull request should include: a concise summary, linked issue or task, screenshots for UI work, and testing notes (`pnpm test:run`, `pnpm vue-tsc`, etc.).
- Keep PRs scoped; large refactors should be coordinated in advance.
- Commit message and PR title must be in English.
- **⚠️ MANDATORY: PR descriptions MUST strictly follow the format specified in `.github/pull_request_template.md`**. All required sections must be filled out completely and accurately before submitting a PR.

## UI Theme Overrides

- Apply visual tweaks (e.g., removing shadows, altering colors) at usage sites via classes such as `class="shadow-none"`.
- When extending shadcn components, create wrapper utilities (e.g., `BucketSelector.vue`) instead of forking primitives.
