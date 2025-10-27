# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development

- `npm run dev` - Start development server at http://localhost:3000
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run generate` - Generate static site

### Code Quality

- `npm run type-check` or `vue-tsc --noEmit` - Run TypeScript type checking
- `npm run lint` - Run Vue TSC type checking and Prettier formatting check
- `npm run lint:fix` - Auto-fix Prettier formatting issues

## Architecture Overview

### Tech Stack

- **Frontend**: Vue 3 with Composition API and `<script setup>` syntax
- **Framework**: Nuxt 3 (SSR disabled, SPA mode)
- **Language**: TypeScript with strict type checking enabled
- **Styling**: Tailwind CSS + shadcn-vue component library
- **State Management**: Pinia stores
- **Internationalization**: @nuxtjs/i18n with English, Chinese, and Turkish support
- **HTTP Client**: Custom AWS-compatible client with automatic request signing

### Key Configuration System

The application uses a sophisticated configuration management system:

- **Runtime Configuration**: Environment-based config via `nuxt.config.ts`
- **Dynamic Configuration**: Config loaded from server at runtime via `utils/config.ts`
- **Configuration Manager**: `configManager` in `utils/config.ts` handles config loading priority:
  1. localStorage stored config (user-specific)
  2. Browser-derived config (current host)
  3. Server default config (fallback)

Configuration is loaded via the `01.config.ts` plugin which runs early in the app lifecycle.

### Core Architecture Patterns

#### Plugin System (Critical for App Initialization)

Plugins load in numbered order and provide core services:

- `01.config.ts` - Loads site configuration from multiple sources
- `02.api.ts` - Configures API client with authentication
- `03.s3.ts` - Configures S3 client for object storage operations

#### Composables Pattern

Domain-specific logic is organized in composables (`composables/`):

- `useAPI.ts` - Base API wrapper using custom `$apiFetch`
- `useAuth.ts` - Authentication and session management
- `useBucket.ts`, `useObject.ts` - Object storage operations
- `useUsers.ts`, `useAccessKeys.ts`, `useGroups.ts` - User and access management
- `usePolicies.ts`, `usePools.ts`, `useTiers.ts` - Policy and storage management
- `useSystem.ts` - System monitoring and health checks
- `useSSE.ts` - Server-sent events for real-time updates
- `useEcharts.ts` - Chart and visualization utilities

#### Component Architecture

- **Domain Components**: Organized by feature (`components/buckets/`, `components/users/`, etc.)
- **UI Components**: Reusable components in `components/ui/`
- **Page Components**: File-based routing in `pages/`

#### Error Handling Strategy

- Global error handling via `utils/error-handler.ts`
- Configuration errors redirect to login page instead of crashing
- Graceful degradation when API calls fail

### Authentication & API Integration

The app integrates with RustFS backend via:

- **Admin API**: RESTful API for management operations
- **S3 API**: AWS S3-compatible API for object operations
- **Authentication**: Uses temporary credentials with configurable session duration
- **Request Signing**: Automatic AWS signature v4 signing for S3 requests

### State Management

Pinia stores handle specific concerns:

- `store/upload-tasks.ts` - File upload progress and management
- `store/delete-tasks.ts` - Bulk delete operations
- `store/sidebar.ts` - UI state management

### Environment Configuration

Required environment variables:

- `API_BASE_URL` - RustFS admin API endpoint
- `SERVER_HOST` - RustFS server host
- `S3_ENDPOINT` - S3-compatible endpoint
- `S3_REGION` - AWS region (default: us-east-1)
- `SESSION_DURATION_SECONDS` - Temporary credential lifetime
- `BASE_URL` - Application base path (default: /rustfs/console/)

### Development Notes

- The application is configured as SPA (`ssr: false`) for deployment flexibility
- TypeScript strict mode is enabled with `vue-tsc` for type checking
- Auto-imports are configured for Naive UI components and common utilities
- The build uses Vite with optimized chunking for production
- i18n is configured with `no_prefix` strategy and browser language detection

### File Naming Conventions

- Use kebab-case for file and component names
- TypeScript interfaces and types go in `types/` directory
- Utility functions organized by domain in `utils/`
- Follow Vue 3 Composition API patterns with `<script setup>`

## Development Workflow

### Common Development Tasks

- **Starting Development**: Run `npm run dev` to start the development server at localhost:3000
- **Code Quality Checks**: Always run `npm run type-check` and `npm run lint` before committing
- **Production Testing**: Use `npm run build && npm run preview` to test production builds locally

### Debugging and Troubleshooting

- **Configuration Issues**: Check browser console for config loading errors; configuration is loaded via `01.config.ts` plugin
- **API Authentication**: Verify credentials in browser storage and check network tab for authentication failures
- **Type Errors**: Use `vue-tsc --noEmit` for detailed TypeScript error reporting
- **Performance Issues**: Monitor network requests and check for unnecessary re-renders in Vue DevTools

### Key Utilities

The `utils/` directory contains domain-specific helpers:

- `config.ts` - Configuration management with priority system
- `error-handler.ts` - Global error handling and user notifications
- `logger.ts` - Logging utilities for debugging
- `functions.ts` - Common utility functions and data transformations
