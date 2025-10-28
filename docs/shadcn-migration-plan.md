# Shadcn-Vue Migration Plan

This document tracks the Naive UI → shadcn-vue migration for the RustFS console. The migration focuses on a visual refresh without altering business logic or flows.

## Phase Overview

1. **Foundation** – remove Naive UI plugins, wire up shadcn providers, and ensure global theming, i18n, and layout tokens remain intact.
2. **Layout & Navigation** – rebuild the default layout and sidebar based on Sidebar07 while keeping Pinia-driven collapse behaviour.
3. **Shared Primitives** – introduce `app-*` components that wrap shadcn primitives to cover buttons, cards, dialogs, drawers, forms, tables, and feedback mechanisms used across screens.
4. **Feature Screens** – replace Naive UI usage page-by-page, preserving interactions and API calls; migrate bespoke styles only when still needed.
5. **Cleanup & Validation** – remove Naive UI dependencies, stale utilities, and update docs/tests before a final regression pass.

Each phase will be committed independently on `refactor/shadcn-vue` to keep rollback simple.

## Component Mapping

| Category | Naive UI usage | shadcn-vue / plan |
| --- | --- | --- |
| Providers | `NConfigProvider`, `NMessageProvider`, `NDialogProvider`, `NNotificationProvider`, `useMessage`, `useDialog`, `useNotification` | Replace with a root `AppUiProvider` that wraps `ThemeProvider`, `TooltipProvider`, and `Toaster` (`components/ui/sonner`). Provide composables for toast/dialog using shadcn Dialog + AlertDialog. |
| Layout | `NLayout`, `NLayoutSider`, `NSpace`, `NFlex` | Adopt Sidebar07 structure using `SidebarProvider`, `AppSidebar`, and Tailwind flex utilities; remove redundant spacing classes. |
| Navigation | `NMenu`, `NDropdown` | Build `AppSidebarMenu` using shadcn Sidebar primitives; for dropdowns use `components/ui/dropdown-menu`. |
| Form shell | `NForm`, `NFormItem`, `NFormItemGi`, `NFormItemGridItem`, `NGrid`, `NGi` | Use `vee-validate` (already installed) with `components/ui/form`. Create wrappers (`app-form`, `app-form-field`, helpers) that match current inline/grid layout via Tailwind grid/flex utilities. |
| Inputs | `NInput`, `NInputNumber`, `NSelect`, `NDatePicker`, `NCheckbox`, `NCheckboxGroup`, `NRadio`, `NRadioGroup`, `NSwitch`, `NDynamicInput`, `NUpload`, `NUploadDragger`, `NInputGroup`, `NInputGroupLabel`, `NP`, `NText` | Map to shadcn `Input`, `NumberField`, `Select`, `Calendar/Popover`, `Checkbox`, `RadioGroup`, `Switch`, `TagsInput`. Implement custom wrappers for dynamic list fields and upload (likely using existing uploader logic + `Dropzone`). Replace `NP/NText` with semantic HTML + `Typography` utilities. |
| Buttons | `NButton`, `NButtonGroup` | Use shadcn `Button` / `ButtonGroup` directly; add Tailwind utilities or inline spinner when needed for loading states. |
| Feedback | `NModal`, `NDrawer`, `NAlert`, `NTooltip`, `NEmpty`, `NProgress`, `NSpin`, `NStatistic`, `NBreadcrumb` | Use shadcn `Dialog`, `Drawer`, `Alert`, `Tooltip`, `Empty` block, `Progress`, `Spinner` etc. Create `app-stat`/`app-empty` wrappers where gaps exist. |
| Data display | `NCard`, `NList`, `NThing`, `NBadge`, `NTag`, `NDescriptions`, `NDescriptionsItem`, `NCarousel`, `NCollapse`, `NCollapseItem` | Replace with shadcn `Card`, `Badge`, `Accordion`, `Tabs` etc. Implement `AppDescriptionList` (simple definition list). Use `Carousel` block already present. |
| Tables | `NDataTable`, `NVirtualList` | Implement `DataTable` powered by `@tanstack/vue-table` + `ScrollArea`. Support selection, inline actions, slot-based cell rendering. Provide compatible props for datasets currently using render functions. |
| Misc | `NDrawerContent`, `NScrollbar`, `NPageHeader`, `NPopover`, `NPopconfirm` | Use `DrawerContent`, `ScrollArea`, `PageHeader` replaced by `div` + `Breadcrumb`, shadcn `Popover`, and build `AppConfirmDialog` on top of AlertDialog. |

### Additional Dependencies

- `@tanstack/vue-table`, `@tanstack/match-sorter-utils`, and `@tanstack/vue-virtual` for the shared table abstraction.
- Possibly `@headlessui/vue` or lightweight packages are **not** required because shadcn already provides primitives through Reka/ Radix.

## Shared Components To Introduce

- `components/providers/AppUiProvider.vue` – wraps shadcn theme providers and exports composables for toasts/dialogs.
- `components/app-sidebar.vue` + related items (menu, user dropdown host) following Sidebar07 markup.
- Form/layout helpers in `components/app-*.vue` (card, form, field grid) for consistent structure.
- Shared overlays like `components/modal.vue`, `drawer.vue`, and confirmation dialogs.
- `components/DataTable` module with column definitions, toolbar templates, and selection helpers.
- Presentation helpers such as `components/app-description-list.vue`, `empty-state.vue`, `spinner.vue`, and related statistic cards.

These wrappers allow feature screens to migrate with minimal churn and keep visual consistency.

## Page Migration Order

1. **Access Keys / Users / Policies** – heavy data table usage; verify DataTable handles selection and actions.
2. **Objects & Buckets** – exercise drawers/modals, dynamic input, and descriptions.
3. **Lifecycle / Replication / Events** – validate complex forms, tabs, accordions.
4. **Performance Dashboard** – ensure stats, badges, carousel translations remain coherent.
5. **Auth / Settings / License** – simpler forms and cards to finish the sweep.

After each page group migrates, commit & push to `refactor/shadcn-vue`.

## Cleanup Checklist

- [x] Remove `nuxtjs-naive-ui`, `naive-ui`, `auto-imports` config, and generated component declarations.
- [x] Drop obsolete CSS tied to Naive overrides once equivalents exist.
- [x] Update README to reflect the new UI stack.
- [x] Run lint/tests plus a targeted manual regression of menus, forms, uploads, and table interactions.

## Remaining TODO (2025-10-27)

- [x] Object task management: `components/object/task-stats.vue`, `components/object/upload/task/item.vue`, `components/object/delete/task/item.vue`, and finish `components/object/upload/picker.vue`.
- [x] Bucket dialogs: migrate `components/buckets/new-form.vue` and `components/buckets/info.vue`.
- [x] User management suite: group/user edit & policy components under `components/users/**` (forms, tables, modals).
- [x] Performance dashboard: refactor `pages/performance/index.vue` to shadcn primitives.
- [x] License center: migrate `pages/license/index.vue` & `pages/license/components/license-article.vue`.
- [x] SSE monitor & metrics: convert `pages/sse/index.vue`.
- [x] System configuration tooling: update `pages/config.vue`.
- [x] KMS test utilities: migrate `pages/kms-test.vue`.
- [x] Final pass: remove Naive UI resolver/module, scrub `<n-*>` usage (`rg "<n-"` should return nothing), and tidy shared components.

This plan will guide the subsequent implementation steps while keeping the migration reviewable.
