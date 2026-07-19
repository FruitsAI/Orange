# Orange Design System Implementation Plan

**Goal:** Establish a token-driven, accessible Orange component library inspired by HeroUI v3's component anatomy while preserving Orange's own Ember Orbit identity and migrating the existing frontend incrementally.

**Architecture:** Introduce namespaced reference, semantic, theme, and compatibility tokens behind one deterministic cascade-layer entry. Build typed React components in focused packages, use compound APIs only for complex interactions, and keep branded product compositions in patterns. Migrate one vertical slice at a time while legacy CSS remains available through one-way aliases.

**Tech Stack:** React 19, TypeScript, Vite 7, Tailwind CSS 4, Vitest, Testing Library, Wails v3/WKWebView, CSS custom properties and cascade layers.

## Scope rules

- HeroUI is a reference for anatomy, state naming, keyboard behavior, and documentation structure only.
- Do not install HeroUI or copy its implementation/styles.
- Do not build all HeroUI components in Phase 1.
- Do not rewrite `main.css` or `liquid-glass.css` in one pass.
- Preserve authentication, routing, Wails drag/no-drag, theme store, and existing API behavior.
- Use RED -> GREEN -> refactor for every component contract.
- Preserve the user's untracked `.superpowers/` directory.

## Task 1: Establish tokens and foundations

**Create:**

- `frontend/src/design-system/tokens/reference.css`
- `frontend/src/design-system/tokens/semantic.css`
- `frontend/src/design-system/tokens/themes/day-ember.css`
- `frontend/src/design-system/tokens/themes/night-orbit.css`
- `frontend/src/design-system/tokens/compatibility.css`
- `frontend/src/design-system/foundations/*.css`
- `frontend/src/design-system/styles.css`
- token, layer-order, reverse-alias, focus, motion, and accessibility contract tests

**Acceptance:** Both themes expose the same semantic token set; compatibility declarations are only old-to-new; focused contract tests, TypeScript, and ESLint pass. Do not connect `styles.css` to `main.tsx` yet.

## Task 2: Build actions and surfaces

Implement Button, IconButton, CloseButton, Surface, and Card with named exports, ref forwarding, finite variant/size unions, stable loading behavior, `.ods-*` classes, and `data-slot` anatomy.

Migrate one low-risk Dashboard panel to prove the component styling without deleting GlassCard.

## Task 3: Build fields and choices

Implement Field compound parts, Input, TextArea, NativeSelect, InputGroup, SearchField, native DateField, Checkbox, and RadioGroup.

Migrate one Settings form and the login remember-username checkbox. Preserve native autocomplete, name, validation, and password-manager behavior.

## Task 4: Build overlays

Implement shared overlay/focus primitives, Dialog, AlertDialog, Popover, Dropdown, and ListBox. Cover portal ownership, Escape, outside press, focus trap, nested overlays, focus restoration, and keyboard collection navigation.

Migrate ConfirmModal and NotificationDetailModal first, followed by the topbar menus.

## Task 5: Build navigation and data display

Implement Tabs, Pagination, Chip/status variants, Table, and ProgressBar. Migrate duplicated Settings pagination and one project table before touching the remaining lists.

## Task 6: Build feedback and loading states

Implement Toast/Toaster, Alert, EmptyState, Skeleton, and Spinner. Reuse the existing toast store and dashboard loading model rather than introducing a second state layer.

## Task 7: Add public exports and the development gallery

Create explicit named exports in `design-system/index.ts`. Add a lazy, development-only `/__design-system` gallery covering both themes, component states, long content, keyboard focus, reduced motion, and 320/768/desktop widths.

Do not ship the gallery in production navigation.

## Task 8: Connect the CSS entry and migrate vertical slices

Make `design-system/styles.css` the single application entry, remove the duplicate Tailwind import, add completed component indexes, and place legacy CSS in its approved layer only after regression testing.

Migration order:

1. Dashboard and topbar visual reference.
2. One Settings vertical slice.
3. Remaining Settings management panels.
4. Projects and Project Detail.
5. Calendar and create/payment forms.
6. Login and remaining feedback surfaces.

Delete legacy blocks only after `rg` proves zero production consumers.

## Task 9: Full verification and cleanup

Run:

```bash
cd frontend
npm run test:run
npx eslint . --cache
npx tsc --build
npm run build
cd ..
go test ./...
```

Perform Wails visual and interaction checks for Day Ember, Night Orbit, 320px through desktop, keyboard order, dialogs/popovers, titlebar dragging, reduced motion, and forced colors where available. Record screenshots and remaining intentional deviations.

Remove compatibility aliases, deprecated wrappers, and legacy CSS only when the final consumer is gone.

## Phase 2 backlog

After real product demand is confirmed, consider Tooltip, Avatar, Breadcrumbs, Separator, ButtonGroup, toggles, Switch, Disclosure, Drawer, ComboBox/Autocomplete, advanced Select, date/calendar components, NumberField, Slider/Meter, OTP, Toolbar/Kbd, TagGroup, color controls, virtualized collections, and advanced data grids.

Evaluate React Aria or specialized date/virtualization primitives separately for complex behavior. This does not change the rule that HeroUI itself is not a dependency.
