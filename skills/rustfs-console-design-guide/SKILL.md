---
name: rustfs-console-design-guide
description: Design and review RustFS Console interfaces with a consistent visual hierarchy, interaction model, responsive behavior, and operational safety. Use this skill whenever creating or changing Console pages, settings, forms, dialogs, tables, status views, destructive flows, mobile layouts, or UI screenshots—even when the request is described only as frontend implementation or visual polish.
---

# RustFS Console Design Guide

Use this guide while shaping the interface, before implementation details harden. Treat Console as an operational tool: the design should help people understand system state, make a deliberate change, and recover when reality is uncertain.

## Design objectives

Every screen should make four things obvious:

1. Where the user is.
2. What the system currently knows.
3. What the user can safely do next.
4. How to recover when a read or write fails.

Prefer calm hierarchy over decoration. Density is acceptable when relationships remain clear; visual noise is not.

## 1. Page composition

Build pages in this order:

1. Page identity: title, concise purpose, and scope such as the active bucket or node.
2. Current state: trusted status, important constraints, and freshness when relevant.
3. Primary task: the action or configuration the page exists to support.
4. Supporting detail: history, diagnostics, advanced controls, and secondary actions.

Keep the primary action near the content it affects. Avoid detached action bars whose target is ambiguous.

On scoped detail pages, keep Back navigation and page-level Add/Refresh actions in the same page header. Do not repeat a second toolbar immediately above the table unless it controls only table-local state such as selection or filtering.

For short authentication forms, constrain the form measure independently from the surrounding split panel. A wider available pane should not make credential fields unnecessarily wide.

Use cards only when content is a distinct surface with its own identity or interaction. Do not turn every section into a card.

## 2. Visual hierarchy and surfaces

Use visual weight to express containment, not to decorate every group.

### Border depth

- Give one visual region at most one complete outline.
- Keep at most two structural frame levels. A nested level should normally use spacing, a muted background, or a one-way separator instead of another box.
- Reserve complete borders for the outer surface, form controls, warnings/errors, and explicit interactive choices.
- Use `fieldset`/`legend`, `section`/heading, or `dl`/`dt`/`dd` to express structure without adding frames.
- Do not place a bordered card inside a bordered fieldset inside a bordered dialog merely to create grouping.
- Use dividers only between peer sections. Keep one aligned divider system per surface; do not add dividers recursively to an ancestor and its descendants.
- A divider is not a generic replacement for a removed box. If it does not clarify which sections are peers, use spacing or a heading instead.

Before adding a border, ask: “Would spacing or a heading communicate the same relationship?” If yes, do not add the border.

### Spacing

- Use consistent vertical rhythm to show section boundaries.
- Keep labels close to their controls and descriptions close to the content they explain.
- Give major sections more separation than fields within a section.
- Avoid large empty areas that push the main action below the fold.

### Typography

- Use real heading levels for page and section hierarchy.
- Keep descriptions short and visually secondary without reducing contrast below an accessible level.
- Use monospaced text only for identifiers, paths, keys, and code-like values.
- Allow identifiers and filenames to wrap or truncate with a way to inspect the full value.

### Color

- Use color to communicate status and action consequence, not as the only differentiator.
- Keep neutral surfaces visually quiet so warnings, errors, and active selections retain meaning.
- Pair status color with text or an icon that has an accessible label.

## 3. Settings and forms

Organize settings around user decisions rather than API payload structure.

### Form anatomy

1. Explain what the setting controls and its operational scope.
2. Show required identity and connection fields first.
3. Group related fields under a semantic heading or `fieldset`.
4. Move expert-only retry, cache, mapping, or diagnostic controls into Advanced Settings.
5. Keep Save and Cancel reachable without scrolling the entire page back to the top.

Do not hide required fields, the current state, or the primary action inside progressive disclosure. Reopen an advanced section automatically when validation targets a field inside it.

### Controls

- Give every input a visible label unless the surrounding pattern supplies an unambiguous accessible name.
- Keep avatar artwork smaller than its button or menu trigger so the trigger retains a visible inset and focus/hover surface. The artwork must not consume the complete interactive target.
- Use helper text for format or consequence, not to restate the label.
- Use switches for immediate binary settings and checkboxes for independent selections. Do not use a switch when the change still requires a separate Save unless the surrounding form makes that deferred behavior clear.
- Use bordered radio tiles only when each option is a meaningful selectable object with supporting content. Plain radio groups need no card around every item.
- Preserve entered values after validation errors or failed requests.

### Validation

- Place the error next to the affected field and announce a concise summary.
- Focus the first invalid field after submission.
- Explain how to correct the value; do not show only a generic failure toast.
- Keep server uncertainty distinct from client validation.

## 4. Dialogs and layered flows

A dialog should represent one focused decision or task.

- Use a stable header, one scrolling body, and a stable footer for long forms.
- Keep the title, target, and consequence visible while the body scrolls.
- For a form dominated by one large editor, keep the surrounding metadata and actions fixed and make the editor the bounded scrolling surface. Do not scroll the whole form just because the editor content is long.
- Size the dialog for its content but keep it within the dynamic viewport on mobile.
- Avoid nested dialogs. When a subtask must open another layer, preserve the parent state and restore focus deliberately.
- Disable accidental dismissal while a submission or destructive operation is in flight.
- Do not repeat the dialog outline with bordered wrappers around every subsection.

For destructive dialogs, name the exact target, state the consequence in plain language, and visually separate the destructive action from Cancel. Prefer staged or reversible actions when the product supports them.

## 5. System state and feedback

Design these as distinct states:

- Loading: the answer is not known yet.
- Empty or unconfigured: a trusted response confirms absence.
- Error: the read or action failed.
- Stale: a previous trusted value remains visible but may no longer be current.
- Partial: some independent data sources succeeded and others failed.
- Success: the result has been confirmed, not merely requested.

Never make a failed read look like an empty configuration. Keep stale values visible when useful, mark them as stale, and disable actions that depend on fresh state.

Place retry next to the failure it addresses. Use toasts as supplemental feedback, not as the only durable explanation for a broken page section.

For long operations, show the target, current phase, progress when meaningful, and the next safe action. A progress strip needs an accessible name and announced updates; it does not need another full frame inside its container.

## 6. Tables, lists, and selection

- Use the shared `DataTable` for tabular relationships and give each table an accessible caption.
- Keep row actions visible and identifiable; do not rely only on hover.
- Avoid nested horizontal scroll containers.
- On narrow screens, convert dense rows into cards or a deliberate reduced-column layout without dropping actions.
- Show loading, error, empty, and filtered-empty states separately.
- Keep bulk selection status and bulk actions close to the selected content.

Use definition lists for compact key/value metadata. A grid of individually bordered cards is usually too heavy for passive details.

## 7. Responsive behavior

Start with the smallest supported viewport, then expand.

- Maintain desktop/mobile action parity.
- Use dynamic viewport units where browser chrome can reduce usable height.
- Keep touch targets at least 44px where practical.
- Preserve 44px touch targets on small screens, but let desktop toolbar buttons and selects return to the compact control height. Do not force mobile minimum heights onto desktop action rows.
- Let toolbars stack; do not force two-column controls into a narrow row.
- Keep one predictable scrolling surface per dialog or panel.
- Test long translations, identifiers, filenames, error messages, and selected-item lists.

Responsive design may change composition, but it must not remove meaning, safety context, or recovery actions.

## 8. Accessibility as part of the design

- Use semantic headings, regions, fieldsets, legends, tables, captions, and definition lists before adding ARIA.
- Make every control reachable and operable by keyboard with visible focus.
- Give search, progress, listbox, and icon-only controls explicit accessible names.
- Return focus to the initiating control when a dialog or editing mode closes.
- Associate field errors and descriptions programmatically.
- Do not encode state through color alone.

Accessibility is a composition constraint, not a cleanup pass after the visual design is finished.

## 9. Design review workflow

For broad UI work, inspect the whole task flow before polishing individual components.

1. Capture the current state at the same desktop and mobile viewports that will be reviewed later.
2. Identify the user task, trusted system state, primary action, failure path, and narrow-screen composition.
3. Review from at least three perspectives: visual hierarchy, interaction/recovery, and accessibility.
4. Reconcile conflicts explicitly. For example, removing borders must not remove the affordance of a clickable choice or the prominence of an error.
5. Implement the smallest coherent design change.
6. Recapture the exact state and compare it with the original.

Record each concrete finding in `docs/ui-review/register.md` and map screenshots in the Console UI review manifest. Label static fixtures as illustrative evidence; do not present them as runtime proof.

## 10. Common failure patterns

Avoid these patterns:

- Box inside box inside box for ordinary grouping.
- A failed settings request rendered as an empty bordered panel.
- Advanced fields mixed into the required first-time setup path.
- Dialog actions pushed outside the viewport.
- Desktop row actions missing from mobile cards.
- Destructive confirmation that does not name the target.
- Generic toast with no persistent local recovery path.
- Passive metadata styled like selectable cards.
- Multiple independent scroll areas inside one dialog.
- Screenshot comparisons captured from different states or viewports.

## Review prompts

Before approving a design, ask:

- Is the current system state trustworthy and visibly distinct from loading, empty, stale, or failed states?
- Is the primary task obvious without scanning every control?
- Does every complete border communicate a real surface or affordance?
- Could spacing, a heading, or a separator replace any nested box?
- Are expert controls separated without hiding required decisions?
- Can the user recover in context after every meaningful failure?
- Does mobile preserve every meaningful action and safety cue?
- Can keyboard and screen-reader users understand and complete the same flow?
- Do the before/after images depict the exact implementation and state being claimed?
