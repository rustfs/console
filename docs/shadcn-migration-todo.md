# ShadCN Vue Migration Todo

- [x] Replace global layout shell (`layouts/default.vue`) to use `components/app/AppSidebar` built with ShadCN Sidebar primitives and update the layout structure similar to Sidebar07.
- [x] Build `components/app/AppSidebar.vue` and supporting subcomponents to render navigation, language/theme controls, and user menu with ShadCN UI widgets.
- [x] Replace Naive UI providers in `app.vue` with ShadCN-friendly structure, wiring toast/dialog replacements and preserving color mode handling.
- [ ] Convert shared form components and high-use Naive UI elements (buttons, inputs, tables, etc.) to their ShadCN equivalents, introducing reusable wrappers under `components/app-` when helpful.
  - [x] Rebuild the users list tab (`components/users/tabs/user.vue`) with ShadCN table, checkbox, dialog, and button primitives.
  - [x] Rebuild the user groups tab (`components/users/tabs/group.vue`) with ShadCN input, table, checkbox, and dialog primitives.
  - [x] Rebuild the group members management view (`components/users/group/members.vue`) with ShadCN card, input, table, and multi-select patterns.
  - [x] Rebuild the site replication management page (`pages/site-replication/index.vue`) and creation form (`components/site-replication/new-form.vue`) with ShadCN dialog, card, input, and button primitives.
  - [x] Rebuild the event subscription management page (`pages/events/index.vue`) and creation form (`components/events/new-form.vue`) with ShadCN dialog, table, select, and checkbox primitives.
- [ ] Migrate feature-specific views to consume the new shared components, auditing for leftover Naive UI imports and styles.
- [ ] Remove Naive UI dependencies and configuration, ensuring ESLint/Vitest/build succeed.
