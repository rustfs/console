# RustFS Console Development Guidelines

Auto-generated from all feature plans. Last updated: [DATE]

## Active Technologies

- **Frontend**: Vue 3 with Composition API, Nuxt 3, TypeScript
- **Styling**: Tailwind CSS, Naive UI components
- **State Management**: Pinia stores
- **Internationalization**: @nuxtjs/i18n with multi-language support
- **Testing**: Vitest, Vue Test Utils, Playwright E2E
- **Build Tools**: Vite, ESLint, Prettier, Vue TSC

## Project Structure

```
components/           # Vue components (kebab-case naming)
├── feature/         # Feature-specific components
├── ui/             # Reusable UI components
└── [domain]/       # Domain-specific components

composables/         # Vue composables (camelCase, use prefix)
pages/              # File-based routing (Nuxt)
types/              # TypeScript definitions
lib/                # Utility libraries and API clients
i18n/locales/       # Translation files
tests/
├── components/     # Component tests
├── integration/    # API integration tests
├── e2e/           # End-to-end tests
└── unit/          # Unit tests
```

## Commands

```bash
# Development
npm run dev              # Start development server
npm run type-check       # TypeScript checking
npm run lint            # ESLint + Prettier check
npm run lint:fix        # Auto-fix linting issues

# Testing
npm run test            # Run unit tests
npm run test:e2e        # Run E2E tests
npm run test:coverage   # Test coverage report

# Build
npm run build           # Production build
npm run preview         # Preview production build
```

## Code Style

### Vue Components

- Use `<script setup>` syntax with TypeScript
- Kebab-case for component files and names
- Props and emits must be typed with defineProps/defineEmits
- Use Composition API exclusively

### TypeScript

- Strict mode enabled, no `any` types without justification
- Export interfaces and types for reusability
- Use proper Vue TypeScript integration

### Internationalization

- All user-facing text must use $t() function
- No hardcoded strings in components
- Support for en-US, zh-CN, tr-TR locales

## Recent Changes

[LAST 3 FEATURES AND WHAT THEY ADDED]

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
