# Branding Guide

This project supports UI branding through environment variables plus a single brand asset directory.

## Directory Layout

Create one directory per brand under:

- `public/branding/<brand-id>/`

Each brand directory should contain:

- `logo.svg`
- `avatar.png`
- `auth-background.svg`
- `favicon.ico`
- `favicon-16x16.png`
- `favicon-32x32.png`
- `apple-touch-icon.png`
- `android-chrome-192x192.png`
- `android-chrome-512x512.png`
- `site.webmanifest`

The existing RustFS assets are already stored in:

- `public/branding/default/`

A sample enterprise brand is also included for preview:

- `public/branding/aurora-enterprise/`

## Environment Variables

Add or update these variables in your local `.env` file:

```env
NEXT_PUBLIC_BRAND_ID=default
NEXT_PUBLIC_BRAND_COMPANY=RustFS
NEXT_PUBLIC_BRAND_PRODUCT=RustFS
NEXT_PUBLIC_BRAND_TITLE=RustFS
NEXT_PUBLIC_BRAND_DESCRIPTION=RustFS is a distributed file system written in Rust.
NEXT_PUBLIC_BRAND_WEBSITE=https://www.rustfs.com
NEXT_PUBLIC_BRAND_DOCS=https://docs.rustfs.com
NEXT_PUBLIC_BRAND_AUTH_BACKGROUND=/branding/default/auth-background.svg
NEXT_PUBLIC_BRAND_SUPPORT_EMAIL=hello@rustfs.com
NEXT_PUBLIC_BRAND_DEFAULT_ADMIN_LABEL=rustfsAdmin
NEXT_PUBLIC_BRAND_LICENSE_KEY=RUSTFS-ENTERPRISE-127-183
```

## How It Works

- `config/brand.ts` reads all branding-related environment variables.
- UI components use that config for names, links, descriptions, and image paths.
- Login and configuration pages use `NEXT_PUBLIC_BRAND_AUTH_BACKGROUND` as the enterprise background image.
- `scripts/prepare-brand-assets.mjs` copies the current brand's favicon and manifest files from `public/branding/<brand-id>/` into `app/` before `dev`, `build`, and `start`.

## Add a New Brand

1. Create a new directory, for example `public/branding/acme/`.
2. Copy all files from `public/branding/default/` into the new directory.
3. Replace the logo, avatar, auth background, favicon, and manifest files with the new company's assets.
4. Update your `.env` file:

```env
NEXT_PUBLIC_BRAND_ID=acme
NEXT_PUBLIC_BRAND_COMPANY=Acme
NEXT_PUBLIC_BRAND_PRODUCT=Acme Storage
NEXT_PUBLIC_BRAND_TITLE=Acme Storage Console
NEXT_PUBLIC_BRAND_DESCRIPTION=Acme enterprise object storage console.
NEXT_PUBLIC_BRAND_WEBSITE=https://www.acme.com
NEXT_PUBLIC_BRAND_DOCS=https://docs.acme.com
NEXT_PUBLIC_BRAND_AUTH_BACKGROUND=/branding/acme/auth-background.svg
NEXT_PUBLIC_BRAND_SUPPORT_EMAIL=support@acme.com
NEXT_PUBLIC_BRAND_DEFAULT_ADMIN_LABEL=acmeAdmin
NEXT_PUBLIC_BRAND_LICENSE_KEY=ACME-ENTERPRISE-001
```

5. Start the app with `pnpm dev` or rebuild with `pnpm build`.

## Preview The Included Demo Brand

This repository includes a ready-to-use sample brand:

- `public/branding/aurora-enterprise/`
- `.env.aurora-enterprise.example`

To preview it:

1. Copy `.env.aurora-enterprise.example` into your local env file.
2. Start the app with `pnpm dev`.
3. The login and configuration pages will automatically switch to the Aurora Enterprise look.

## Notes

- This branding layer only changes user-visible brand information.
- Technical identifiers such as `/rustfs/admin/v3`, `/rustfs/console`, `X-Rustfs-*`, and `rustfs-server-host` are intentionally unchanged.
- If a new brand directory is missing one of the required icon or manifest files, the prepare script will fail early so the issue is visible immediately.
