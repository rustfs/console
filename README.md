# RustFS Console

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-blue.svg)](https://www.typescriptlang.org/)
[![Vue.js](https://img.shields.io/badge/Vue.js-3.5+-green.svg)](https://vuejs.org/)
[![Nuxt](https://img.shields.io/badge/Nuxt-4.2+-green.svg)](https://nuxt.com/)

A modern, responsive web management console for [RustFS](https://github.com/rustfs/rustfs) distributed file system, built with Vue 3, Nuxt 4, TypeScript, and Tailwind CSS.

## ✨ Features

- 🚀 **Modern Stack**: Vue 3 Composition API, Nuxt 4, TypeScript, Tailwind CSS v4
- 🎨 **Beautiful UI**: Clean interface with shadcn-vue components and dark mode support
- 🌍 **Internationalization**: Full i18n support (English, Chinese, Turkish)
- 📱 **Responsive Design**: Mobile-friendly design that works on all devices
- ⚡ **High Performance**: Optimized with code splitting, lazy loading, and efficient caching
- 🔒 **Enterprise Security**: Secure authentication with AWS-compatible S3 API
- 📊 **Rich Analytics**: Comprehensive monitoring dashboard with real-time metrics
- 🛠 **Developer Experience**: Hot reload, TypeScript, ESLint, Prettier, and Vitest

## 🎯 Core Functionalities

### Storage Management

- **Bucket Operations**: Create, delete, configure buckets with policies
- **Object Management**: Upload, download, delete objects with batch operations
- **File Browser**: Intuitive file explorer with search, filtering, and navigation
- **Access Control**: Granular permissions and bucket policies (IAM-like)
- **Object Versions**: Manage object versions and delete markers
- **Object Locking**: WORM (Write Once Read Many) compliance and legal hold

### User & Access Management

- **User Management**: Create and manage users and user groups
- **Access Keys**: Generate and manage API credentials
- **Service Accounts**: Create and manage service account credentials
- **Policies**: Fine-grained access control policies (canned and custom)
- **Authentication**: Multiple authentication methods (AccessKey, STS temporary credentials)

### System Monitoring

- **Performance Metrics**: Real-time system performance monitoring
- **Usage Analytics**: Storage usage, bandwidth, and capacity statistics
- **Health Monitoring**: System health and status indicators
- **License Management**: View license information and usage limits

### Advanced Features

- **Lifecycle Management**: Automated data lifecycle policies (ILM)
- **Replication**: Cross-region and site replication configuration
- **Tiering**: Intelligent data tiering and archival strategies
- **Event Notifications**: Real-time event notifications (SQS, SNS, Lambda)
- **Event Targets**: Configure and manage event notification targets
- **Site Replication**: Multi-site replication management

## 🛠 Technical Stack

- **Frontend Framework**: [Vue 3](https://vuejs.org/) with Composition API and `<script setup>`
- **Meta Framework**: [Nuxt 4](https://nuxt.com/) (SPA mode)
- **Language**: [TypeScript](https://www.typescriptlang.org/) 5.8+ with strict mode
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) v4 + [shadcn-vue](https://www.shadcn-vue.com/)
- **State Management**: [Pinia](https://pinia.vuejs.org/) for reactive state
- **HTTP Client**: Custom AWS-compatible client with automatic request signing
- **Build Tool**: [Vite](https://vitejs.dev/) (via Nuxt)
- **Package Manager**: [pnpm](https://pnpm.io/) 10.19+
- **Testing**: [Vitest](https://vitest.dev/) for unit and integration tests
- **Table Component**: [TanStack Table](https://tanstack.com/table) (Vue)

## 🚀 Quick Start

### Prerequisites

- **Node.js**: >= 22.0.0
- **pnpm**: >= 10.19.0
- **RustFS Backend**: RustFS server must be running and accessible

### Installation

```bash
# Clone the repository
git clone https://github.com/rustfs/console.git
cd console

# Install dependencies using pnpm
pnpm install
```

### Development

```bash
# Start development server
pnpm dev
```

The development server will start at `http://localhost:3000` (or the next available port).

### Environment Configuration

Create a `.env` file in the root directory (optional, defaults are provided):

```env
# Application Configuration
APP_NAME=RustFS
APP_DESCRIPTION=RustFS is a distributed file system written in Rust.
BASE_URL=/rustfs/console/

# API Configuration
API_BASE_URL=http://localhost:9000/rustfs/admin/v3
SERVER_HOST=http://localhost:9000

# S3 Configuration
S3_REGION=us-east-1
S3_ENDPOINT=http://localhost:9000

# Session Configuration
SESSION_DURATION_SECONDS=43200
```

The application automatically detects configuration from:

1. Server config at `{SERVER_HOST}/config.json`
2. localStorage saved configuration
3. Current browser host
4. Default configuration (localhost:9000)

### Production Build

```bash
# Build for production
pnpm build

# Preview production build locally
pnpm preview
```

The built application will be in the `.output` directory.

## 🔧 Development

### Project Structure

```
├── assets/                 # Static assets (images, styles, backgrounds)
│   ├── css/               # Global styles and Tailwind CSS
│   ├── img/               # Images and logos
│   └── svg/               # SVG icons for providers
├── components/            # Vue components
│   ├── access-keys/       # Access key management components
│   ├── buckets/           # Bucket operation components
│   ├── data-table/        # Reusable data table components
│   ├── object/            # Object management components
│   ├── user/              # User management components
│   ├── user-group/        # User group components
│   └── ui/                # shadcn-vue UI primitives
├── composables/           # Vue composables (reusable logic)
├── config/                # Configuration files (navigation, etc.)
├── i18n/                  # Internationalization
│   └── locales/           # Translation files (en, zh-CN, tr-TR)
├── layouts/               # Nuxt layouts
├── lib/                   # Library code (API clients, utilities)
│   ├── api-client.ts      # API client with AWS signing
│   ├── upload-task-manager.ts    # File upload manager
│   └── delete-task-manager.ts    # File deletion manager
├── middleware/            # Route middleware (auth, analytics)
├── pages/                 # File-based routing (Nuxt pages)
├── plugins/               # Nuxt plugins (config, API, S3, icons)
├── server/                # Server-side API routes
├── store/                 # Pinia stores
│   ├── upload-tasks.ts    # Upload task management store
│   └── delete-tasks.ts   # Delete task management store
├── tests/                 # Test files
│   ├── utils/             # Utility function tests
│   └── README.md          # Test documentation
├── types/                 # TypeScript type definitions
├── utils/                 # Utility functions
│   ├── config-helpers.ts  # Configuration management
│   ├── functions.ts       # General utilities
│   └── bucket-policy.ts   # Bucket policy utilities
├── app.config.ts          # Application configuration
├── nuxt.config.ts         # Nuxt configuration
└── package.json           # Dependencies and scripts
```

### Code Quality

We maintain high code quality standards with:

- **TypeScript**: Full type safety with strict mode enabled
- **ESLint**: Code linting and style enforcement
- **Prettier**: Automatic code formatting
- **Vue TSC**: Vue-specific TypeScript checking

```bash
# Run type checking
pnpm type-check

# Run linting
pnpm lint

# Fix linting issues automatically
pnpm lint:fix
```

### Coding Standards

- **Component Files**: Use **kebab-case** (e.g., `bucket-selector.vue`, `data-table.vue`)
- **Component Usage**: Reference components using **StudlyCase** in templates (e.g., `<BucketSelector />`)
- **Composables**: Use camelCase with `use` prefix (e.g., `useBucket.ts`, `useUsers.ts`)
- **TypeScript**: All code must be typed, avoid `any` without justification
- **Comments**: All comments and documentation in English

### Key Architecture Patterns

- **Composables**: Reusable logic with Vue Composition API
- **Plugin System**: Modular configuration and service injection
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Performance Optimization**: Smart caching, lazy loading, and code splitting
- **Security**: Input validation, XSS protection, and secure AWS-compatible authentication

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with UI
pnpm test:ui

# Run tests once (CI mode)
pnpm test:run

# Generate coverage report
pnpm test:coverage

# Run specific test suites
pnpm test:config-helpers
pnpm test:performance
pnpm test:integration
```

See [tests/README.md](tests/README.md) for detailed testing documentation.

## 🎨 Customization

### Theming

The application supports light and dark themes. Customize themes in:

- `assets/css/tailwind.css` - Tailwind CSS configuration
- `tailwind.config.ts` - Theme colors and design tokens
- `components/theme-switcher.vue` - Theme switching logic

### Internationalization

Add new languages by:

1. Creating locale files in `i18n/locales/` (e.g., `fr-FR.json`)
2. Updating `nuxt.config.ts` i18n configuration
3. Adding language switcher options in `components/language-switcher.vue`

Currently supported languages:

- English (`en`)
- Chinese (`zh-CN`)
- Turkish (`tr-TR`)

### Component Library

Built on [shadcn-vue](https://www.shadcn-vue.com/) primitives with custom wrappers. The UI components are in `components/ui/` and should not be modified directly. Instead, create wrapper components in the root `components/` directory.

## 🚀 Deployment

### Environment Variables

Production deployment requires these environment variables:

- `API_BASE_URL`: RustFS backend API endpoint (e.g., `https://api.example.com/rustfs/admin/v3`)
- `SERVER_HOST`: RustFS server host (e.g., `https://api.example.com`)
- `BASE_URL`: Application base path (e.g., `/rustfs/console/`)
- `NODE_ENV`: Set to `production`
- `SESSION_DURATION_SECONDS`: Session duration in seconds (default: 43200)

### Build for Production

```bash
# Build for production
pnpm build
```

The production build will be in `.output/public` (static files) and `.output/server` (server-side code if SSR is enabled).

### Docker Deployment

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@10.19.0 --activate
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM nginx:alpine
COPY --from=builder /app/.output/public /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Build Optimization

For optimal production builds:

- Enable gzip/brotli compression
- Configure proper caching headers
- Use CDN for static assets
- Monitor bundle size and performance metrics

## 🤝 Contributing

We welcome contributions! Please follow our contribution guidelines:

### Development Workflow

1. **Fork** the repository
2. **Clone** your fork locally
3. **Create** a feature branch: `git checkout -b feature/amazing-feature`
4. **Install** dependencies: `pnpm install`
5. **Make** your changes following our coding standards
6. **Test** your changes: `pnpm type-check && pnpm lint && pnpm test:run`
7. **Commit** your changes: `git commit -m 'feat: add amazing feature'`
8. **Push** to your branch: `git push origin feature/amazing-feature`
9. **Submit** a Pull Request

### Pre-Commit Checklist

Before committing and pushing your changes, ensure all the following checks pass:

#### Code Quality Checks

- ✅ **Code Formatting**: Run `pnpm lint` to ensure all files are properly formatted

  ```bash
  pnpm lint
  # If issues found, auto-fix with:
  pnpm lint:fix
  ```

- ✅ **TypeScript Type Checking**: No type errors

  ```bash
  pnpm type-check
  ```

- ✅ **Linting**: No linting errors

  ```bash
  pnpm lint
  ```

#### Testing Requirements

- ✅ **Unit Tests**: All unit tests pass

  ```bash
  pnpm test:run
  ```

- ✅ **Test Coverage**: Maintain or improve test coverage
  - Statement coverage: > 95%
  - Branch coverage: > 90%
  - Function coverage: 100%
  - Line coverage: > 95%

- ✅ **Integration Tests**: Integration tests pass (if applicable)

  ```bash
  pnpm test:integration
  ```

- ✅ **Performance Tests**: Performance benchmarks pass (if applicable)

  ```bash
  pnpm test:performance
  ```

#### Build Verification

- ✅ **Build Success**: Project builds without errors

  ```bash
  pnpm build
  ```

#### Security & Dependencies

- ✅ **Security Audit**: No critical or high severity vulnerabilities

  ```bash
  pnpm audit --audit-level=moderate
  ```

- ✅ **Dependencies**: No unnecessary dependencies added
- ✅ **Lock File**: `pnpm-lock.yaml` is up to date

#### Code Review Requirements

- ✅ **Self-Review**: Review your own code before submitting PR
- ✅ **Code Comments**: Code is properly commented (English)
- ✅ **No Debug Code**: Remove all `console.log` and debug statements
- ✅ **TypeScript Types**: All types are properly defined
- ✅ **Commit Messages**: All commit messages are in English following Conventional Commits

#### Documentation

- ✅ **Code Comments**: JSDoc comments for public APIs
- ✅ **README Updates**: Update README if needed
- ✅ **API Documentation**: Update API docs if needed
- ✅ **Changelog**: Update changelog for user-facing changes

### CI/CD Pipeline Checks

All PRs will automatically run the following checks via GitHub Actions:

#### 🔍 Code Quality Pipeline

- **Code Formatting**: Prettier formatting check
- **TypeScript**: Type checking with `vue-tsc`
- **Dependencies**: Outdated packages and security audit
- **Code Complexity**: Complexity analysis
- **Documentation**: JSDoc coverage check
- **Performance**: Performance benchmarks

**Quality Score Requirements**:

- 🎉 **Excellent** (90%+): Code quality is outstanding
- 👍 **Good** (75%+): Code quality is solid
- ⚠️ **Fair** (60%+): Consider addressing failing checks
- ❌ **Needs Improvement** (<60%): Multiple issues need attention

#### 🧪 Test Pipeline

- **Linting**: ESLint and Prettier checks
- **Type Checking**: TypeScript type validation
- **Unit Tests**: Multi-version Node.js testing (20, 22)
- **Integration Tests**: Full functional integration tests
- **Performance Tests**: Performance benchmarks and stress tests
- **Code Coverage**: Coverage report generation and upload
- **Security Scan**: Dependency audit and CodeQL analysis
- **Build Test**: Verify project builds successfully

**Test Coverage Requirements**:

- Statement coverage: > 95%
- Branch coverage: > 90%
- Function coverage: 100%
- Line coverage: > 95%

**Important**: All CI/CD checks must pass before your PR can be merged. Make sure to run these checks locally before pushing.

### Coding Standards

- **TypeScript**: Use TypeScript for all new code with strict mode
- **Vue 3**: Use Composition API and `<script setup>` syntax
- **Naming**: Use kebab-case for files and components
- **Comments**: All comments and documentation in English
- **Testing**: Include tests for new features
- **Performance**: Consider performance implications
- **Code Formatting**: All code must be formatted with Prettier (checked in CI)
- **Type Safety**: No TypeScript errors (checked in CI)
- **Test Coverage**: Maintain high test coverage (>95% statements, >90% branches, 100% functions)

### Code Style

We use automated code formatting:

```bash
# Format code
pnpm lint:fix

# Check formatting
pnpm lint
```

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

**Important**: All commit messages must be written in English.

**Commit Types**:

- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions/modifications
- `chore`: Build process or auxiliary tool changes
- `perf`: Performance improvements

**Examples**:

```bash
git commit -m "feat: add user authentication"
git commit -m "fix: resolve bucket creation issue"
git commit -m "docs: update API documentation"
git commit -m "chore: update dependencies"
```

### Pull Request Guidelines

- **Title**: Use clear, descriptive titles following conventional commits
- **Description**: Explain what changes were made and why
- **Testing**: Describe how the changes were tested
- **Breaking Changes**: Clearly mark any breaking changes
- **Screenshots**: Include screenshots for UI changes
- **Checklist**: Complete the PR checklist

### Issue Reporting

When reporting issues:

1. **Search** existing issues first
2. **Use** the issue templates
3. **Provide** detailed reproduction steps
4. **Include** system information and error logs
5. **Add** relevant labels

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Vue.js](https://vuejs.org/) - The progressive JavaScript framework
- [Nuxt](https://nuxt.com/) - The intuitive Vue framework
- [shadcn-vue](https://www.shadcn-vue.com/) - Beautiful Vue components built on Radix UI
- [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework
- [Iconify](https://iconify.design/) - Universal icon framework
- [TanStack Table](https://tanstack.com/table) - Powerful table/data grid library

## 📞 Support

- **Documentation**: [RustFS Documentation](https://docs.rustfs.com)
- **Community**: [GitHub Discussions](https://github.com/rustfs/console/discussions)
- **Issues**: [GitHub Issues](https://github.com/rustfs/console/issues)
- **Repository**: [rustfs/console](https://github.com/rustfs/console)

---

Made with ❤️ by the RustFS team
