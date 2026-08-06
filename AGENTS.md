# Repository Guidelines

Rules for agents working in this repository. When a rule conflicts with what you find in the code, surface the conflict instead of silently deviating.

## Project Structure & Module Organization

- Core application lives under `app/`, with App Router layouts in `app/(auth)/`, `app/(dashboard)/`.
- Supporting UI atoms live in `components/`; shared hooks in `hooks/`, shared contexts in `contexts/`.
- Configuration lives in `next.config.ts`, `app.config.ts` (if present), and `config/`.
- Shared utilities and lib code are in `lib/`; type definitions in `types/`.
- i18n locale files live under `i18n/locales/`; their structure must match the old project — do not alter i18n layout or keys arbitrarily.
- Static assets belong in `public/` or `assets/`; tests in `tests/` (mirror source structure).
- **UI vs feedback**: `components/ui/` holds presentational, declarative UI primitives (Button, Dialog). `lib/feedback/` holds global imperative APIs for toast and confirm dialogs. Use `@/lib/feedback/message` and `@/lib/feedback/dialog` for imperative feedback; use `@/components/ui/*` for declarative UI.

## Build, Test, and Development Commands

Run `nvm use v22` before any `pnpm` command in this repository.

- `pnpm dev` – start the dev server (applies theme overrides first).
- `pnpm build` – production build (also type-checks); `pnpm start` – run it locally.
- `pnpm lint` / `pnpm lint:fix` – run / auto-fix Oxlint.
- `pnpm type-check` – strict TypeScript check (applies theme overrides, then `tsc --noEmit`).
- `pnpm format` / `pnpm format:check` – Oxfmt write / check.
- `pnpm test:run` – run the test suite.

## Quality Gates — must pass before every commit

1. `pnpm install --frozen-lockfile` – lockfile in sync. After changing `package.json`, run `pnpm install` and commit the updated `pnpm-lock.yaml`; CI fails otherwise.
2. `pnpm type-check` – zero type errors.
3. `pnpm lint` – zero Oxlint errors.
4. `pnpm format:check` – consistent formatting (fix with `pnpm format` or `pnpm lint:fix`).
5. `pnpm test:run` – all tests pass, and tests are updated to match the change (see Testing Guidelines).

Never bypass hooks with `--no-verify`, never disable a failing test instead of fixing it, and never commit code that does not compile.

## Engineering Principles

- **Think from first principles**: do not assume the user fully understands what they want or how to achieve it. Start from the underlying need and problem, stay critical, and stop to discuss when the motivation or goal is unclear. If the goal is clear but the proposed path is not the shortest, say so and recommend a better approach.
- **Code must be as concise and elegant as possible**: the smallest change that solves the problem; reuse existing utilities/components instead of duplicating logic; remove dead code as you go. Single responsibility per function/component; no premature abstraction, clever tricks, or gratuitous indirection — prefer the boring, obvious solution.
- No TODO comments without an issue number.
- Composition over inheritance; explicit data flow over implicit coupling; interfaces over singletons.
- Before implementing, study 2–3 similar existing features and follow their patterns, libraries, and test styles (especially `console-old` during migration). Verify assumptions against real code.
- Fail fast with descriptive errors, handle them at the appropriate level, and never silently swallow exceptions.
- When multiple approaches are valid, prefer in order: testability, readability, consistency with project patterns, simplicity, reversibility.
- Don't introduce new tools or dependencies without strong justification.

## Coding Style & Naming Conventions

- Use Oxfmt defaults; run `pnpm lint:fix` or `pnpm format` after making changes.
- React components are functional components with TypeScript; prefer hooks and custom hooks for shared logic.
- Component files use **kebab-case** (`bucket-selector.tsx`); reference them with **PascalCase** in JSX (`<BucketSelector />`).
- Override shadcn primitives **outside** `components/ui/`; never edit files in that directory directly. Extend via wrapper components instead of forking primitives.
- Render tabular data with the shared `DataTable` + `useDataTable` utilities unless a specific requirement makes them unsuitable.

### Component structure and naming

- **Directories**: group by domain/feature; plural folder names (`buckets/`, `user/`, `object/`).
- **File names**: kebab-case; do not repeat the directory name (under `buckets/` use `info.tsx`, `new-form.tsx` — not `bucket-info.tsx`). The path already provides context.
- **Component names**: PascalCase, aligned with domain and purpose (`BucketInfo`, `UserDropdown`); may include the domain in JSX for clarity.
- **Forms**: consistent per-domain patterns: `XxxNewForm` / `XxxEditForm` / `XxxForm` in `new-form.tsx`, `edit-form.tsx`, `form.tsx`.
- **Placement**: single-domain components live in that domain folder; components reused by 3+ domains may live at root or `components/shared/` (document if so).

## Testing Guidelines

- Add suites under `tests/`, mirroring source structure; name files `*.test.ts`. Note: `test:run` currently only picks up `tests/lib/*.test.{js,ts}` — extend its glob in `package.json` when adding suites elsewhere, or they will silently never run.
- Test behavior, not implementation; clear scenario-describing names; one assertion per test when possible; deterministic; mock network calls through provided hooks or context; use existing test utilities.
- **Every code change must include corresponding test updates**: new features get happy-path and edge-case coverage; modified behavior gets updated tests; removed features get their tests removed; bug fixes get regression tests.
- Run `pnpm test:run` before submitting any changes.

## Workflow

- Break complex work into 3–5 stages and implement incrementally so every commit compiles and passes tests. Prefer test-first for behavior changes (red → green → refactor).
- Document a plan in `IMPLEMENTATION_PLAN.md` **only when explicitly requested** (see Documentation Restriction); if used, give each stage a Goal, Success Criteria, Tests, and Status, keep status current, and delete the file when done.
- **Stop after 3 failed attempts** at the same problem. Then: document what failed and why, research 2–3 alternative implementations, question whether the abstraction or problem split is right, and try a different angle.

## Commit & Pull Request Guidelines

- Conventional, action-oriented commit subjects (`feat: add bucket selector`, `fix: correct object list pagination`); message body explains _why_. Commit messages and PR titles in English.
- Each PR includes: concise summary, linked issue or task, screenshots for UI work, and testing notes. Follow `.github/pull_request_template.md` strictly.
- **Screenshot diffs**: whenever a PR touches anything user-visible, provide before/after page screenshots in the PR description (run the app locally, capture affected pages before and after, present as a before/after pair). If "before" is impractical (e.g. a brand-new page), include "after" screenshots of every affected state — empty, loaded, error, and mobile when relevant.
- Keep PRs scoped; coordinate large refactors in advance.

## Multi-Role Adversarial Verification

For every non-trivial change, verify from multiple independent roles before considering it done — each role actively tries to find problems rather than confirm success:

- **Reviewer**: challenge correctness — edge cases, error handling, state/race issues, regressions in adjacent features.
- **Tester**: try to break it — run type check, lint, tests; exercise affected pages/flows including empty, error, and loading states.
- **UX auditor** (UI changes): check against `skills/rustfs-console-design-guide/SKILL.md` — layout, spacing, dark mode, responsiveness, i18n text.
- **Simplifier**: ask whether the same result could be achieved with less code; remove anything not strictly needed.

Scale rigor to the change: a one-line fix needs a quick reviewer + tester pass; a new feature or refactor deserves the full panel. When agent tooling supports it (subagents/workflows), run these roles as independent adversarial checks rather than a single self-review.

## UI Design & Theme

- **Consistent style, best-practice interactions**: all UI shares one unified visual language — reuse existing components, spacing, typography, and color tokens instead of inventing variants; the same kind of element must look and behave the same everywhere. Follow established UX practices: clear loading/empty/error states, immediate feedback via `@/lib/feedback/*`, sensible focus and keyboard behavior, and confirmation before destructive actions.
- For every Console UI, interaction, settings, form, dialog, table, responsive-layout, or visual-review change, read and follow `skills/rustfs-console-design-guide/SKILL.md` before editing. Use `skills/ui-audit/SKILL.md` as the audit workflow; the design guide is the source of design decisions.
- Apply visual tweaks at usage sites via classes (e.g. `className="shadow-none"`).
- Do not change base colors or theme variables defined in `console-new` unless explicitly required by the migration plan.
- During migration: do not modify page text, add UI components, or change component positions without plan approval.

## Documentation Restriction

**Unless explicitly requested**, do not create summary, plan, analysis, or report documents in the project — including `IMPLEMENTATION_PLAN.md`, `SUMMARY.md`, `PLAN.md`, `CHANGELOG.md`, migration summaries, progress reports, and `*_ANALYSIS*.md`. Create them only when the user explicitly asks.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
