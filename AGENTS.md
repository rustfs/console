# Repository Guidelines

## Project Context

This project (`console-new`) is a **migration** from `console-old` (Nuxt + Vue + shadcn-vue) to **Next.js + React + shadcn/ui + Tailwind CSS v4**. The source of truth for behavior and UI is the old project. Migration work must follow the implementation plan stage by stage.

**Key constraints during migration:**

- Page elements and text must not be modified; no free interpretation.
- shadcn-vue components map 1:1 to shadcn/ui (React).
- Use `pnpm dlx shadcn@latest add {component}` to add shadcn components.
- **Never edit** downloaded `components/ui/*` directly (exception: `resizable.tsx` when required by dependency changes).
- Component and page names use **kebab-case**; mirror the old project’s structure.
- Use the same authentication storage scheme (`auth.credentials`, `auth.isAdmin`, `auth.permanent`).
- Do not change colors or base styling in `console-new` unless explicitly required.

---

## Project Structure & Module Organization

- Core application lives under `app/`, with App Router layouts in `app/(auth)/`, `app/(dashboard)/`.
- Supporting UI atoms live in `components/`; shared hooks in `hooks/`, shared contexts in `contexts/`.
- Configuration lives in `next.config.ts`, `app.config.ts` (if present), and `config/`.
- Shared utilities and lib code are in `lib/`; type definitions in `types/`.
- i18n locale files live under `i18n/locales/` (structure must match the old project).
- Static assets belong in `public/` or `assets/`.
- Tests belong in `tests/` (mirror source structure when tests exist).

---

## Build, Test, and Development Commands

- `pnpm dev` – start the Next.js development server with hot reload.
- `pnpm build` – create a production build.
- `pnpm start` – run the production bundle locally.
- `pnpm lint` – run ESLint.
- `pnpm test:run` – run the test suite (when configured).
- `pnpm tsc --noEmit` – perform a strict TypeScript type check (or rely on `next build` for type-checking).

---

## Mandatory Code Quality Checks

**⚠️ CRITICAL: These checks MUST pass before every commit.**

Before committing any code changes, you MUST run and pass:

1. **Lockfile Sync Check**: `pnpm install --frozen-lockfile`
   - Ensures `pnpm-lock.yaml` is in sync with `package.json`
   - **MUST run `pnpm install` after modifying `package.json` and commit the updated `pnpm-lock.yaml`**
   - CI will fail if the lockfile is out of sync.

2. **TypeScript Type Check**: `pnpm tsc --noEmit` (or `pnpm build`)
   - Ensures all TypeScript types are correct.
   - Must have zero errors before committing.

3. **Lint Check**: `pnpm lint`
   - Ensures code follows ESLint rules.
   - Fix issues before committing.

4. **Format Check** (if Prettier is configured): `pnpm prettier --check .`
   - Ensures consistent formatting.
   - If it fails, run `pnpm lint:fix` or `pnpm format` (when available) to auto-fix.

5. **Test Coverage Check** (when tests exist): Review and update tests for code changes
   - **MUST review test cases** when modifying code: add tests for new features, update tests for changed behavior, remove tests for removed features.
   - Run `pnpm test:run` to ensure all tests pass.
   - Ensure test cases accurately reflect the current implementation.

**Automated Enforcement**: If a pre-commit hook exists, it will run these checks. If any check fails, the commit will be blocked.

**Quick Fix**: If checks fail:

1. Run `pnpm install` to sync lockfile (if `package.json` changed).
2. Fix ESLint/Prettier issues.
3. Address TypeScript errors manually.
4. Review and update test cases as needed, then run `pnpm test:run` to verify.

---

## Coding Style & Naming Conventions

- Use Prettier defaults when configured; run `pnpm lint:fix` or `pnpm format` after making changes.
- React components use functional components with TypeScript; prefer hooks and custom hooks for shared logic.
- Component files use **kebab-case** (e.g. `bucket-selector.tsx`); reference them with **PascalCase** in JSX (e.g. `<BucketSelector />`).
- Override shadcn primitives **outside** `components/ui/`; never edit files in that directory directly.
- Render tabular data with the shared `DataTable` + `useDataTable` utilities unless a specific requirement makes them unsuitable.
- Language pack files must follow the structure used in the old project; do not alter i18n layout or keys arbitrarily.

---

## Testing Guidelines

- When tests are configured, add new suites under `tests/`, mirroring source structure.
- Name files `*.spec.ts` or `*.test.ts`.
- Keep tests deterministic; mock network calls through provided hooks or context.
- **⚠️ CRITICAL: Every code change MUST include corresponding test updates** when tests exist:
  - **New features**: Add comprehensive test cases covering happy paths and edge cases.
  - **Modified behavior**: Update existing tests to reflect new implementation.
  - **Removed features**: Remove or update tests for deprecated/removed functionality.
  - **Bug fixes**: Add regression tests to prevent future occurrences.
- Run `pnpm test:run` before submitting any changes.

---

## Commit & Pull Request Guidelines

- Follow conventional, action-oriented commit subjects (e.g. `feat: add bucket selector`, `fix: correct object list pagination`).
- Each pull request should include: a concise summary, linked issue or task, screenshots for UI work, and testing notes.
- Keep PRs scoped; large refactors should be coordinated in advance.
- Commit message and PR title must be in English.
- When a PR template exists (e.g. `.github/pull_request_template.md`), follow it strictly.

---

## UI Theme Overrides

- Apply visual tweaks (e.g. removing shadows, altering colors) at usage sites via classes such as `class="shadow-none"`.
- When extending shadcn components, create wrapper components (e.g. `BucketSelector.tsx`) instead of forking primitives.
- Do not change base colors or theme variables defined in `console-new` unless explicitly required by the migration plan.

---

# Development Guidelines

## Philosophy

### Core Beliefs

- **Incremental progress over big bangs** – Small changes that compile and pass tests.
- **Learning from existing code** – Study and plan before implementing.
- **Pragmatic over dogmatic** – Adapt to project reality.
- **Clear intent over clever code** – Be boring and obvious.

### Simplicity Means

- Single responsibility per function/class.
- Avoid premature abstractions.
- No clever tricks – choose the boring solution.
- If you need to explain it, it’s too complex.

---

## Process

### 1. Planning & Staging

Break complex work into 3–5 stages. Document in `IMPLEMENTATION_PLAN.md`:

```markdown
## Stage N: [Name]
**Goal**: [Specific deliverable]
**Success Criteria**: [Testable outcomes]
**Tests**: [Specific test cases]
**Status**: [Not Started|In Progress|Complete]
```

- Update status as you progress.
- Remove the file when all stages are done.

### 2. Implementation Flow

1. **Understand** – Study existing patterns in the codebase.
2. **Test** – Write tests first (red).
3. **Implement** – Minimal code to pass (green).
4. **Refactor** – Clean up with tests passing.
5. **Commit** – With a clear message linking to the plan.

### 3. When Stuck (After 3 Attempts)

**CRITICAL**: Maximum 3 attempts per issue, then STOP.

1. **Document what failed**:
   - What you tried.
   - Specific error messages.
   - Why you think it failed.

2. **Research alternatives**:
   - Find 2–3 similar implementations.
   - Note different approaches used.

3. **Question fundamentals**:
   - Is this the right abstraction level?
   - Can this be split into smaller problems?
   - Is there a simpler approach entirely?

4. **Try a different angle**:
   - Different library/framework feature?
   - Different architectural pattern?
   - Remove abstraction instead of adding?

---

## Technical Standards

### Architecture Principles

- **Composition over inheritance** – Use dependency injection.
- **Interfaces over singletons** – Enable testing and flexibility.
- **Explicit over implicit** – Clear data flow and dependencies.
- **Test-driven when possible** – Never disable tests; fix them.

### Code Quality

- **Every commit must**:
  - Compile successfully.
  - Pass all existing tests.
  - Include tests for new functionality (when tests exist).
  - Follow project formatting/linting.

- **Before committing**:
  - Run formatters/linters.
  - Self-review changes.
  - Ensure commit message explains "why".

### Error Handling

- Fail fast with descriptive messages.
- Include context for debugging.
- Handle errors at the appropriate level.
- Never silently swallow exceptions.

---

## Decision Framework

When multiple valid approaches exist, choose based on:

1. **Testability** – Can I easily test this?
2. **Readability** – Will someone understand this in 6 months?
3. **Consistency** – Does this match project patterns?
4. **Simplicity** – Is this the simplest solution that works?
5. **Reversibility** – How hard is it to change later?

---

## Project Integration

### Learning the Codebase

- Find 3 similar features/components.
- Identify common patterns and conventions.
- Use the same libraries/utilities when possible.
- Follow existing test patterns.

### Tooling

- Use the project’s existing build system.
- Use the project’s test framework.
- Use the project’s formatter/linter settings.
- Don’t introduce new tools without strong justification.

---

## Quality Gates

### Definition of Done

- [ ] Tests written and passing (when applicable).
- [ ] Code follows project conventions.
- [ ] No linter/formatter warnings.
- [ ] Commit messages are clear.
- [ ] Implementation matches plan.
- [ ] No TODOs without issue numbers.

### Test Guidelines

- Test behavior, not implementation.
- One assertion per test when possible.
- Clear test names describing the scenario.
- Use existing test utilities/helpers.
- Tests should be deterministic.

---

## Important Reminders

**NEVER**:

- Use `--no-verify` to bypass commit hooks.
- Disable tests instead of fixing them.
- Commit code that doesn’t compile.
- Make assumptions – verify with existing code.
- During migration: modify page text, add UI components, or change component positions without plan approval.

**ALWAYS**:

- Commit working code incrementally.
- Update plan documentation as you go.
- Learn from existing implementations (especially `console-old`).
- Stop after 3 failed attempts and reassess.
