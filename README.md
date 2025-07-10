# RustFS Console

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-blue.svg)](https://www.typescriptlang.org/)
[![Vue.js](https://img.shields.io/badge/Vue.js-3.5+-green.svg)](https://vuejs.org/)
[![Nuxt](https://img.shields.io/badge/Nuxt-3.17+-green.svg)](https://nuxt.com/)

A modern, responsive web management console for RustFS distributed file system, built with Vue 3, Nuxt 3, and TypeScript.

## ✨ Features

- 🚀 **Modern Stack**: Built with Vue 3, Nuxt 3, TypeScript, and Tailwind CSS
- 🎨 **Beautiful UI**: Clean and intuitive interface with dark mode support
- 🌍 **Internationalization**: Full i18n support with English and Chinese
- 📱 **Responsive Design**: Mobile-friendly design that works on all devices
- ⚡ **High Performance**: Optimized with caching, lazy loading, and code splitting
- 🔒 **Enterprise Security**: Secure authentication and authorization
- 📊 **Rich Analytics**: Comprehensive monitoring and metrics dashboard
- 🛠 **Developer Experience**: Hot reload, TypeScript, ESLint, and Prettier

## 🎯 Core Functionalities

### Storage Management
- **Bucket Operations**: Create, delete, configure buckets
- **Object Management**: Upload, download, delete objects with batch operations
- **File Browser**: Intuitive file explorer with search and filtering
- **Access Control**: Granular permissions and bucket policies

### User & Access Management
- **User Management**: Create and manage users and groups
- **Access Keys**: Generate and manage API credentials
- **Policies**: Fine-grained access control policies
- **Authentication**: Multiple authentication methods (AccessKey, STS)

### System Monitoring
- **Performance Metrics**: Real-time system performance monitoring
- **Usage Analytics**: Storage usage and bandwidth statistics
- **Health Monitoring**: System health and status indicators
- **Audit Logs**: Comprehensive audit trail and logging

### Advanced Features
- **Lifecycle Management**: Automated data lifecycle policies
- **Replication**: Cross-region and site replication
- **Tiering**: Intelligent data tiering and archival
- **Encryption**: Data encryption at rest and in transit
- **Event Notifications**: Real-time event notifications

## 🛠 Technical Stack

- **Frontend Framework**: [Vue 3](https://vuejs.org/) with Composition API
- **Meta Framework**: [Nuxt 3](https://nuxt.com/) for SSR/SPA
- **Language**: [TypeScript](https://www.typescriptlang.org/) for type safety
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Naive UI](https://www.naiveui.com/)
- **State Management**: [Pinia](https://pinia.vuejs.org/) for reactive state
- **HTTP Client**: Custom AWS-compatible client with automatic signing
- **Build Tool**: [Vite](https://vitejs.dev/) for fast development and building
- **Package Manager**: npm/pnpm/yarn

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm/pnpm/yarn package manager
- RustFS backend server running

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/rustfs-console.git
cd rustfs-console

# Install dependencies
npm install
# or
pnpm install
# or 
yarn install
```

### Development

```bash
# Start development server
npm run dev
# or
pnpm dev
# or
yarn dev
```

The development server will start at `http://localhost:3000`.

### Environment Configuration

Create a `.env` file in the root directory:

```env
# Application Configuration
APP_NAME=RustFS
APP_DESCRIPTION=RustFS Console
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

### Production Build

```bash
# Build for production
npm run build
# or
pnpm build
# or
yarn build

# Preview production build locally
npm run preview
```

## 🔧 Development

### Project Structure

```
├── assets/                 # Static assets (images, styles)
├── components/            # Vue components
│   ├── access-keys/       # Access key management
│   ├── buckets/          # Bucket operations
│   ├── object/           # Object management
│   ├── users/            # User management
│   └── ui/               # Reusable UI components
├── composables/          # Vue composables
├── layouts/              # Nuxt layouts
├── middleware/           # Route middleware
├── pages/                # File-based routing
├── plugins/              # Nuxt plugins
├── server/               # Server-side code
├── store/                # Pinia stores
├── types/                # TypeScript definitions
├── utils/                # Utility functions
└── nuxt.config.ts        # Nuxt configuration
```

### Code Quality

We maintain high code quality standards with:

- **TypeScript**: Full type safety and better developer experience
- **ESLint**: Code linting and style enforcement
- **Prettier**: Automatic code formatting
- **Vue TSC**: Vue-specific TypeScript checking

```bash
# Run type checking
npm run type-check

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

### Key Architecture Patterns

- **Composables**: Reusable logic with Vue Composition API
- **Plugin System**: Modular configuration and service injection
- **Error Boundaries**: Comprehensive error handling and user feedback
- **Performance Optimization**: Smart caching, lazy loading, and code splitting
- **Security**: Input validation, XSS protection, and secure authentication

## 🎨 Customization

### Theming

The application supports light and dark themes. Customize themes in:
- `assets/css/tailwind.css` - Tailwind configuration
- `tailwind.config.ts` - Theme colors and design tokens
- `components/theme-switcher.vue` - Theme switching logic

### Internationalization

Add new languages by:
1. Creating locale files in `i18n/locales/`
2. Updating `nuxt.config.ts` locales configuration
3. Adding language switcher options

### Component Library

Built on Naive UI with custom components in `components/ui/`. Extend the design system by:
- Adding new components to `components/ui/`
- Following established naming conventions
- Including proper TypeScript definitions

## 🚀 Deployment

### Docker Deployment

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
```

### Environment Variables

Production deployment requires these environment variables:

- `API_BASE_URL`: RustFS backend API endpoint
- `SERVER_HOST`: RustFS server host
- `BASE_URL`: Application base path
- `NODE_ENV`: Set to `production`

### Build Optimization

For optimal production builds:
- Enable gzip/brotli compression
- Configure proper caching headers
- Use CDN for static assets
- Monitor bundle size and performance

## 🤝 Contributing

We welcome contributions! Please follow our contribution guidelines:

### Development Workflow

1. **Fork** the repository
2. **Clone** your fork locally
3. **Create** a feature branch: `git checkout -b feature/amazing-feature`
4. **Install** dependencies: `npm install`
5. **Make** your changes following our coding standards
6. **Test** your changes: `npm run type-check && npm run lint`
7. **Commit** your changes: `git commit -m 'feat: add amazing feature'`
8. **Push** to your branch: `git push origin feature/amazing-feature`
9. **Submit** a Pull Request

### Coding Standards

- **TypeScript**: Use TypeScript for all new code
- **Vue 3**: Use Composition API and `<script setup>` syntax
- **Naming**: Use kebab-case for files and components
- **Comments**: Add JSDoc comments for public APIs
- **Testing**: Include tests for new features
- **Performance**: Consider performance implications

### Code Style

We use automated code formatting:

```bash
# Format code
npm run lint:fix

# Check formatting
npm run lint
```

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test additions/modifications
- `chore`: Build process or auxiliary tool changes

### Pull Request Guidelines

- **Title**: Use clear, descriptive titles
- **Description**: Explain what changes were made and why
- **Testing**: Describe how the changes were tested
- **Breaking Changes**: Clearly mark any breaking changes
- **Screenshots**: Include screenshots for UI changes

### Issue Reporting

When reporting issues:

1. **Search** existing issues first
2. **Use** the issue templates
3. **Provide** detailed reproduction steps
4. **Include** system information and error logs
5. **Add** relevant labels

### Development Setup

```bash
# Clone and setup
git clone https://github.com/your-username/rustfs-console.git
cd rustfs-console
npm install

# Create feature branch
git checkout -b feature/your-feature

# Start development
npm run dev

# Run checks before committing
npm run type-check
npm run lint
```

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Vue.js](https://vuejs.org/) - The progressive JavaScript framework
- [Nuxt](https://nuxt.com/) - The intuitive Vue framework
- [Naive UI](https://www.naiveui.com/) - A Vue 3 component library
- [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework
- [Iconify](https://iconify.design/) - Universal icon framework

## 📞 Support

- **Documentation**: [RustFS Docs](https://docs.rustfs.com)
- **Community**: [GitHub Discussions](https://github.com/your-org/rustfs-console/discussions)
- **Issues**: [GitHub Issues](https://github.com/your-org/rustfs-console/issues)
- **Email**: support@rustfs.com

---

Made with ❤️ by the RustFS team