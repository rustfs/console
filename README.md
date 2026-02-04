# RustFS Console

A modern, responsive web management console for RustFS distributed file system, built with Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui.

## ✨ Features

### Core Features
- **File Browser** - Visual file/object management interface with upload, download, delete operations
- **Access Keys Management** - Create and manage service account access keys
- **Policy Management** - Configure and manage IAM policies for fine-grained access control
- **User Management** - Create, edit, enable/disable, and delete user accounts
- **User Groups Management** - Create and manage user groups to simplify permission assignment

### Advanced Features
- **Import/Export** - Import and export system configurations
- **Performance Monitoring** - Real-time system status, server information, and performance metrics
- **Tiered Storage** - Configure and manage tiered storage policies
- **Event Destinations** - Configure event destinations for event notifications
- **SSE Settings** - Server-side encryption configuration
- **License Management** - View and manage system license information

## 🛠️ Tech Stack

### Core Framework
- **[Next.js 16](https://nextjs.org/)** - React full-stack framework with App Router
- **[React 19](https://react.dev/)** - UI library
- **[TypeScript 5](https://www.typescriptlang.org/)** - Type safety

### UI & Styling
- **[Tailwind CSS v4](https://tailwindcss.com/)** - Utility-first CSS framework
- **[shadcn/ui](https://ui.shadcn.com/)** - High-quality component library based on Radix UI
- **[Remix Icon](https://remixicon.com/)** - Icon library
- **[next-themes](https://github.com/pacocoursey/next-themes)** - Theme switching support

### Data Management
- **[TanStack Table](https://tanstack.com/table)** - Powerful table component
- **[TanStack Virtual](https://tanstack.com/virtual)** - Virtual scrolling support
- **[AWS SDK v3](https://aws.amazon.com/sdk-for-javascript/)** - S3 client integration

### Other Tools
- **[i18next](https://www.i18next.com/)** - Internationalization support (12 languages)
- **[Recharts](https://recharts.org/)** - Chart visualization
- **[Sonner](https://sonner.emilkowal.ski/)** - Toast notifications
- **[date-fns](https://date-fns.org/)** / **[dayjs](https://day.js.org/)** - Date handling

## 📁 Project Structure

```
console/
├── app/                    # Next.js App Router pages and layouts
│   ├── (auth)/            # Authentication pages
│   └── (dashboard)/       # Dashboard pages
├── components/             # React components
│   ├── ui/                # shadcn/ui base components
│   └── ...                # Business components
├── hooks/                 # Custom React Hooks
├── contexts/              # React Context providers
├── lib/                   # Utility functions and library code
│   └── feedback/          # Global feedback APIs (toast, dialog)
├── types/                 # TypeScript type definitions
├── i18n/                  # Internationalization resource files
│   └── locales/          # Multi-language files (12 languages)
├── config/                # Configuration files
├── public/                # Static assets
└── tests/                 # Test files (mirror source structure)
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 20
- **pnpm** >= 10.19.0 (recommended to use the version specified in the project)
- **Docker** - For running RustFS service

### Start RustFS Service

The RustFS service must be started before development. Run it using Docker:

```bash
# Create data directory
mkdir rustfs-data

# Run RustFS service
docker run -p 9000:9000 -p 9001:9001 -v ./rustfs-data:/data rustfs/rustfs:1.0.0-alpha.82
```

The service will start on the following ports:
- **9000** - API port
- **9001** - Console port

### Install Dependencies

```bash
pnpm install
```

### Development Mode

**Note**: Before starting the development server, ensure the RustFS service is running (see "Start RustFS Service" section above).

Start the development server (with hot reload):

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

### Build for Production

```bash
pnpm build
```

### Run Production Build

```bash
pnpm start
```

## 💻 Development Guide

### Code Quality Checks

Before committing code, ensure all checks pass:

#### 1. Lockfile Sync Check
```bash
pnpm install --frozen-lockfile
```
Ensure `pnpm-lock.yaml` is in sync with `package.json`. After modifying `package.json`, you must run `pnpm install` and commit the updated lockfile.

#### 2. TypeScript Type Check
```bash
pnpm type-check
# or
pnpm build
```

#### 3. ESLint Check
```bash
pnpm lint
```

#### 4. Code Formatting Check
```bash
pnpm format:check
```

#### 5. Auto-fix Formatting Issues
```bash
pnpm lint:fix
# or
pnpm format
```

### Naming Conventions

- **Component files**: Use kebab-case (e.g., `bucket-selector.tsx`)
- **Component names**: Use PascalCase (e.g., `<BucketSelector />`)
- **Directory structure**: Group by feature/domain, use plural forms (e.g., `buckets/`, `users/`)
- **File naming**: Don't repeat directory name in filename (e.g., `buckets/info.tsx` instead of `buckets/bucket-info.tsx`)

### UI Component Usage

- **Declarative UI**: Use base components from `@/components/ui/*`
- **Imperative feedback**: Use `@/lib/feedback/message` and `@/lib/feedback/dialog` for global toast and dialog prompts

### Testing

When tests are configured:
- Test files should be placed in `tests/` directory, mirroring source structure
- Use `*.spec.ts` or `*.test.ts` naming
- Run tests: `pnpm test:run`

## 🌍 Internationalization

The project supports multiple languages. Currently supported languages:

- 中文（简体）(Chinese Simplified)
- English (US)
- Deutsch (DE)
- Español (ES)
- Français (FR)
- Bahasa Indonesia (ID)
- Italiano (IT)
- 日本語 (JP)
- 한국어 (KR)
- Português (BR)
- Русский (RU)
- Türkçe (TR)

Language files are located in the `i18n/locales/` directory.

## 📦 Build & Deployment

### Environment Variables

Configure necessary environment variables according to your deployment environment (e.g., API endpoints, authentication configuration).

### Build Configuration

The project uses Next.js default build configuration. Custom configuration can be done via `next.config.ts`.

### Deployment

The project can be deployed to any platform that supports Next.js:

- **Vercel** (Recommended) - Zero-config deployment
- **Docker** - Using official Next.js Docker image
- **Self-hosted** - Run `pnpm build && pnpm start`

## 🤝 Contributing

### Commit Guidelines

- Use conventional commit messages (Conventional Commits)
- Ensure all code quality checks pass before committing
- Each PR should include a clear description and related issue links

### Code Review

- Keep PR scope focused; coordinate large refactors in advance
- Commit messages and PR titles must be in English
- UI-related work should include screenshots

## 📄 License

Licensed under the Apache License 2.0. See [LICENSE](LICENSE) for details.

## 🔗 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## 📝 Development Notes

- Follow the guidelines in `AGENTS.md`
- Keep code simple, readable, and maintainable
- Prefer using existing project tools and patterns
- Consider internationalization support when adding new features
- Ensure all changes pass type checking
