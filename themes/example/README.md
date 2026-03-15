# Example Theme Verification

This example theme validates all customization capabilities:

1. `manifest`:
   - Brand name and links are replaced from `themes/example/manifest.json`.
2. `components` (same-path override):
   - `themes/example/components/auth/heroes/hero-static.tsx`
   - Overrides `components/auth/heroes/hero-static.tsx`.
3. `assets` (same-path override):
   - `themes/example/assets/logo.svg`
   - Overrides `assets/logo.svg`.
4. `locales` (key-level merge override):
   - `themes/example/locales/en-US.json`
   - `themes/example/locales/zh-CN.json`
   - Only specified keys are overridden.
5. `public` (same-path override):
   - `themes/example/public/backgrounds/scillate.svg`
   - `themes/example/public/backgrounds/ttten.svg`

## Quick Check

```bash
NEXT_PUBLIC_THEME_ID=example pnpm dev
```

Then verify on login/config pages:

- Logo shows `ACME Console`.
- Hero content is the custom Acme component.
- Background is teal style (from `public/backgrounds/*` override).
- Brand links use `example.com` / `docs.example.com`.
- Texts such as `Login`, `View Documentation` are overridden, while unspecified i18n keys still use default translations.
