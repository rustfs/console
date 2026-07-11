---
name: ui-audit
description: Audit and fix UI quality issues across web apps, dashboards, landing pages, product sites, forms, dialogs, tables, component libraries, and rendered frontend flows. Use when the user asks for UI walkthrough, visual QA, pixel/detail review, dimensions, spacing, whitespace, color hierarchy, alignment, typography, icon sizing, theme switching checks, accessibility pass, design-system consistency, component migration follow-up, before/after screenshots, or broad frontend best-practice cleanup.
---

# UI Audit

## Operating Mode

Treat the request as implementation work unless the user asks for analysis only. Read local instructions first, preserve unrelated changes, and keep edits surgical. Do not create project summary documents or reports unless explicitly requested.

In this repository, read `skills/rustfs-console-design-guide/SKILL.md` before auditing or changing Console UI. Use that guide as the source of design decisions; use this skill for audit execution, browser validation, evidence capture, and verification.

If the user asks to pull latest, do it before editing after checking `git status`. If local unrelated work is present, preserve it and avoid destructive git commands.

## Classify The Surface

Before scanning, identify the primary UI type and adjust emphasis:

- **Operational apps**: prioritize density, tables, forms, keyboard flow, data states, batch actions, and predictable navigation.
- **Landing/product sites**: prioritize first viewport, real visual assets, responsive hero composition, contrast, content hierarchy, and scroll rhythm.
- **Developer/docs sites**: prioritize reading flow, code block overflow, navigation state, search, anchors, and dark theme.
- **Interactive tools/games**: prioritize canvas/scene nonblank state, controls, motion, hit targets, and viewport fit.
- **Component libraries/migrations**: prioritize primitive usage, wrapper boundaries, design tokens, API consistency, and regression patterns.

## Baseline

1. Read project guidance: local instructions, package scripts, existing component patterns, theme config, and design-system conventions.
2. Prefer existing wrappers and utilities. Do not edit base UI primitives directly unless explicitly required; fix usage sites or create wrappers.
3. Start or reuse the local dev server. Use Docker Compose only when the app needs it.
4. Fetch current UI guidance when available, especially:
   - `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`
5. Define target flows: first screen, navigation shell, forms, dialogs, tables/lists, media, upload flows, theme switch, and one mobile breakpoint.

## Static Audit Checklist

Run focused scans before editing. Prefer `rg` and inspect matches manually.

```bash
git status --short
rg -n "rounded-(sm|md|lg|xl|2xl|3xl|full)|rounded\b" app components src --glob '*.{tsx,jsx,html,css}' --glob '!**/node_modules/**'
rg -n "transition-all|outline-none|#[0-9a-fA-F]{3,8}|text-(red|green|blue|yellow|orange|purple|gray|slate|zinc|neutral|stone)-|bg-(red|green|blue|yellow|orange|purple|gray|slate|zinc|neutral|stone)-|border-(red|green|blue|yellow|orange|purple|gray|slate|zinc|neutral|stone)-" app components src --glob '*.{tsx,jsx,html,css}' --glob '!**/node_modules/**'
rg -n "(w|h|min-w|min-h|max-w|max-h|p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|space-x|space-y|text|leading|tracking)-\\[" app components src --glob '*.{tsx,jsx,html,css}' --glob '!**/node_modules/**'
rg -n "<Image|<img|from \"next/image\"|from 'next/image'" app components src --glob '*.{tsx,jsx,html}'
rg -n "<DialogContent|<AlertDialogContent|<DrawerContent|<SheetContent|<PopoverContent|<DropdownMenuContent|role=\"dialog\"" app components src --glob '*.{tsx,jsx,html}'
rg -n "aria-invalid|role=\"alert\"|aria-live|FieldError|FieldDescription className=\"text-destructive\"" app components src --glob '*.{tsx,jsx,html}'
```

Use small Node scripts when regex needs structure:

- Native `<button>` without `type`.
- Icon-only buttons without `aria-label`, `aria-labelledby`, `title` plus hidden text, or visible text.
- Inputs/textareas/selects with `id` but missing `name`, except disabled/read-only cases.
- Images missing `alt`, intrinsic size, fill strategy, or stable aspect-ratio container.
- Clickable non-interactive elements missing keyboard support.

If the project is not React/Next, translate the checks to the local stack rather than forcing these exact paths.

## Inspection Matrix

Audit every target surface through these lenses. Do not stop at the first visible issue.

- Dimensions: button/input/select heights, icon-only button square size, touch target size, modal/drawer max width and height, table column widths, chart/media aspect ratios, avatar/status/badge sizes, loading skeleton size, and stable dimensions that prevent layout shift.
- Spacing: page gutters, section rhythm, card/list item padding, form label-control gaps, field group gaps, toolbar gaps, button group spacing, table cell padding, dialog header/body/footer spacing, popover padding, and responsive breakpoint spacing.
- Whitespace and density: excessive empty regions, cramped clusters, first viewport balance, scroll rhythm, empty states, dense operational pages versus more open marketing pages, and whether related controls visually belong together.
- Alignment: page grid alignment, header/action alignment, button text and icon baselines, form labels, inline validation text, table numeric/text alignment, row actions, dropdown triggers, dialog footer actions, and vertical centering inside fixed-height controls.
- Color hierarchy: token usage, foreground/muted/subtle contrast, semantic status colors, destructive/warning/success/info distinction, selection and active states, border/background layering, hardcoded colors, single-hue palettes, and disabled/placeholder readability.
- Theme switching: light, dark, and system themes; root theme class; `color-scheme`; hover/focus/selected/error colors after switching; token regressions; charts, images, code blocks, tables, and overlays in each theme.
- Typography hierarchy: page title, section title, panel title, body, caption, badge, table, code, and helper/error text tiers; line-height; weight; wrapping; long translated text; no viewport-scaled font sizes; no negative letter spacing unless the design system requires it.
- Icon system: standard icon size by context, stroke width, optical alignment, icon/text gap, decorative `aria-hidden`, icon-only accessible names, direction-aware icons, and replacement of text labels with familiar icons only where the command is unambiguous.
- Shape, border, and elevation: radius scale, square-table or square-card policies, nested card avoidance, border contrast, divider consistency, shadow use, focus rings, surface boundaries, table wrapper shape, and overlay surface hierarchy.
- Component states: default, hover, focus-visible, active, selected, loading, disabled, read-only, empty, error, success, warning, skeleton, optimistic, and permission-denied states.
- Forms: label/control association, `name`, `autocomplete`, `spellCheck`, required/optional semantics, `aria-invalid`, error `role="alert"`, help text placement, password manager behavior, disabled/read-only affordance, keyboard submission, reset/cancel actions, and multi-step form navigation.
- Dialogs/drawers/popovers: trigger affordance, focus return, close/cancel layout, destructive action hierarchy, scroll containment, mobile viewport fit, overlay contrast, escape/outside-click behavior, and footer button order.
- Tables/lists: stable columns, responsive horizontal overflow, sticky header/action behavior, tabular numbers, sorting/filtering affordance, pagination density, row hover/selection, bulk actions, empty/loading/error states, and long identifiers.
- Navigation: active route clarity, breadcrumbs, tabs, sidebar collapse, command menus, overflow menus, keyboard focus order, and mobile navigation fit.
- Media/assets: intrinsic dimensions, alt semantics, nonblank load, object-fit/crop, responsive art direction, image optimization constraints, dark-theme visibility, and whether the asset shows the real subject when inspection matters.
- Data stress and localization: long object keys, ARNs, URLs, email addresses, usernames, product names, tags, code snippets, large numbers, dates, currencies, CJK text, RTL layout, and localized ellipsis.
- Responsive and viewport: mobile, tablet, desktop, wide desktop, zoomed text, virtual keyboard overlap, safe-area insets, horizontal overflow, and button/card text containment.
- Accessibility: keyboard reachability, visible focus, accessible names, heading order, landmark roles, color contrast, reduced-motion behavior, live regions for async feedback, and non-pointer alternatives for drag/drop/upload.
- Motion and interaction: transition scope, no `transition-all` by default, animation timing, hover intent, pointer targets, loading feedback, prevented double-submit, and stable layout during async updates.
- Visual evidence: capture before/after or current-state screenshots for meaningful fixes, including at least one desktop and one mobile view when practical.

## Fix Rules

Keep each patch small and tied to one audit issue.

- Prefer design tokens and semantic classes over hardcoded palettes.
- Replace `text-left/right` with `text-start/end` when direction can vary.
- Replace visible `...` loading text with localized or typographic ellipsis when the project uses it.
- Use `min-w-0`, `truncate`, `break-all`, and `max-w-full` around object keys, user names, version IDs, tags, ARNs, URLs, product names, and policy names.
- For code/policy textareas, use monospace, `spellCheck={false}`, and explicit labels/names.
- For hidden file inputs triggered by buttons, include `name` and an accessible label; prefer a visually-hidden input over unreachable hidden controls when direct label activation is needed.
- For dynamic signed/temporary image URLs, prefer bypassing image optimization when optimization cannot fetch the resource.
- Do not add decorative cards inside cards. Do not introduce new rounded cards if the project standard is square.
- For landing-page heroes, use meaningful real/generated bitmap imagery or an interactive scene; avoid abstract gradient-only hero sections unless the product style explicitly requires it.

## Browser Validation

Use the preferred local browser automation surface when available for local targets. Validate after meaningful UI edits:

1. Page identity: URL and title match the target.
2. Not blank: DOM snapshot or screenshot contains meaningful content.
3. No framework overlay.
4. Console health: no relevant warnings/errors.
5. Visual evidence: screenshot at desktop and one mobile viewport when practical.
6. Interaction proof: exercise at least one relevant control, such as theme switch, menu, tab, dialog open/close, form validation, upload trigger, table action, carousel, or primary CTA.

For theme work, explicitly test:

- dark -> light -> dark or light -> dark -> light
- root theme class and `color-scheme` when applicable
- horizontal overflow at mobile width
- token regressions and hardcoded-color outliers

Save screenshots outside the repo, usually under `/tmp`, and include them in the final answer. Do not create report artifacts in the project unless asked.

## Quality Gates

Run the narrow checks for touched files first, then broader checks using the project's package manager:

```bash
pnpm prettier --check <touched files>
pnpm type-check
pnpm lint
git diff --check
pnpm exec prettier --check $(rg --files -g '*.{ts,tsx,js,jsx,json,css,md,yml,yaml}' -g '!node_modules' -g '!pnpm-lock.yaml')
```

Adapt command names to the repo: `npm`, `yarn`, `bun`, `cargo`, `swift`, or platform-specific test/build commands when appropriate.

Also run project-mandated commands when present. If a mandated command fails because the repository is already misconfigured, report the exact blocker and continue validating what can be validated.

## Final Response

Respond in the user's language. Keep it concise:

- Summarize main UI fixes by category.
- List validation commands and pass/fail status.
- Call out known blockers separately.
- Include before/after or current-state screenshots using absolute local paths.
- Mention untested areas only when they materially affect confidence.
