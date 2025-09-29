# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)

```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → contract test task
   → research.md: Extract decisions → setup tasks
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
   → Integration: DB, middleware, logging
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests?
   → All entities have models?
   → All endpoints implemented?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`
- Paths shown below assume single project - adjust based on plan.md structure

## Phase 3.1: Setup

- [ ] T001 Create project structure per implementation plan
- [ ] T002 Initialize TypeScript project with Vue 3/Nuxt 3 dependencies
- [ ] T003 [P] Configure ESLint, Prettier, and Vue TSC tools
- [ ] T004 [P] Setup i18n configuration and locale files
- [ ] T005 [P] Configure Tailwind CSS and theme system

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [ ] T006 [P] Component test for main feature component in tests/components/FeatureComponent.spec.ts
- [ ] T007 [P] API integration test in tests/integration/api.spec.ts
- [ ] T008 [P] User workflow E2E test in tests/e2e/user-workflow.spec.ts
- [ ] T009 [P] Accessibility test for components in tests/a11y/accessibility.spec.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)

- [ ] T010 [P] Create TypeScript types/interfaces in types/feature.d.ts
- [ ] T011 [P] Main feature component in components/feature/FeatureComponent.vue
- [ ] T012 [P] Feature composable in composables/useFeature.ts
- [ ] T013 [P] API client methods in lib/api-client.ts
- [ ] T014 [P] Feature page in pages/feature/index.vue
- [ ] T015 Input validation with TypeScript
- [ ] T016 Error handling and user feedback
- [ ] T017 [P] i18n translations for all supported languages

## Phase 3.4: Integration

- [ ] T018 Integrate with authentication system
- [ ] T019 Connect to backend API endpoints
- [ ] T020 Add loading states and error boundaries
- [ ] T021 Implement responsive design and mobile support
- [ ] T022 Add dark/light theme support

## Phase 3.5: Polish

- [ ] T023 [P] Unit tests for composables in tests/unit/composables.spec.ts
- [ ] T024 Performance optimization and bundle size analysis
- [ ] T025 [P] Accessibility audit and improvements
- [ ] T026 [P] Update component documentation
- [ ] T027 Code review and refactoring
- [ ] T028 Manual testing across devices and browsers

## Dependencies

- Setup (T001-T005) before tests (T006-T009)
- Tests (T006-T009) before implementation (T010-T017)
- T010 blocks T011, T012 (types before components/composables)
- T013 blocks T014 (API client before pages)
- Implementation before integration (T018-T022)
- Integration before polish (T023-T028)

## Parallel Example

```
# Launch T006-T009 together:
Task: "Component test for main feature component in tests/components/FeatureComponent.spec.ts"
Task: "API integration test in tests/integration/api.spec.ts"
Task: "User workflow E2E test in tests/e2e/user-workflow.spec.ts"
Task: "Accessibility test for components in tests/a11y/accessibility.spec.ts"
```

## Notes

- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Commit after each task
- Avoid: vague tasks, same file conflicts

## Task Generation Rules

*Applied during main() execution*

1. **From Contracts**:
   - Each contract file → contract test task [P]
   - Each endpoint → implementation task

2. **From Data Model**:
   - Each entity → model creation task [P]
   - Relationships → service layer tasks

3. **From User Stories**:
   - Each story → integration test [P]
   - Quickstart scenarios → validation tasks

4. **Ordering**:
   - Setup → Tests → Models → Services → Endpoints → Polish
   - Dependencies block parallel execution

## Validation Checklist

*GATE: Checked by main() before returning*

- [ ] All contracts have corresponding tests
- [ ] All entities have model tasks
- [ ] All tests come before implementation
- [ ] Parallel tasks truly independent
- [ ] Each task specifies exact file path
- [ ] No task modifies same file as another [P] task
