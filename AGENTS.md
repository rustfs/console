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

## Coding Style & Naming Conventions
- Use Prettier defaults (see `.prettierrc.ts`); run `pnpm lint` or `pnpm lint:fix`.
- Vue files use `<script setup>` with TypeScript; prefer composables for shared logic.
- Components use StudlyCase filenames (e.g. `BucketSelector.vue`) but reference via kebab-case in templates.
- Override shadcn primitives **outside** `components/ui/`; never edit files in that directory directly.
- Render tabular data with the shared `DataTable` + `useDataTable` utilities unless a specific requirement makes them unsuitable.

## Testing Guidelines
- Vitest is the primary framework; add new suites under `tests/`.
- Name files `*.spec.ts` or `*.test.ts` and mirror source structure.
- Keep tests deterministic; mock network calls through provided composables.
- Run `pnpm test:run` before submitting major changes.

## Commit & Pull Request Guidelines
- Follow conventional, action-oriented commit subjects (e.g. `feat: add bucket selector`).
- Each pull request should include: a concise summary, linked issue or task, screenshots for UI work, and testing notes (`pnpm test:run`, `pnpm vue-tsc`, etc.).
- Keep PRs scoped; large refactors should be coordinated in advance.

## UI Theme Overrides
- Apply visual tweaks (e.g., removing shadows, altering colors) at usage sites via classes such as `class="shadow-none"`.
- When extending shadcn components, create wrapper utilities (e.g., `BucketSelector.vue`) instead of forking primitives.
