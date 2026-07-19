# Orange Frontend Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Orange's left sidebar with a draggable floating top navigation, rebuild the dashboard around the Ember Orbit financial hero, and ship equally polished Night Orbit and Day Ember themes with restrained, accessible motion.

**Architecture:** Introduce one design-token source and split global styles by responsibility before changing layout. Build the new shell from focused React components, keep notification/auth behavior in existing stores and APIs, then rebuild the dashboard as action-oriented sections backed by the current dashboard endpoints. Add a small Vitest/Testing Library foundation so navigation, theme, reduced-motion, and dashboard rendering can be verified without relying only on screenshots.

**Tech Stack:** React 19, TypeScript, React Router 7, Zustand, Tailwind CSS 4, Chart.js, Wails v3 runtime, Vitest, Testing Library, CSS custom properties.

---

## Execution preconditions

- The current worktree contains unrelated user changes in documentation, dashboard components, settings components, views, and `frontend/src/assets/main.css`.
- Before implementation, commit those changes on their current branch or create a patch the user can restore. Do not stash, discard, or overwrite them without explicit approval.
- Execute this plan in a dedicated `codex/orange-frontend-redesign` worktree created from a commit containing both the approved specification and any user changes that must be preserved.
- Do not commit `.superpowers/`; it contains brainstorming previews, not product source.
- Re-read `docs/superpowers/specs/2026-07-11-orange-frontend-redesign-design.md` before Task 1.

### Task 1: Establish frontend component-test infrastructure

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.ts`
- Create: `frontend/src/test/setup.ts`
- Create: `frontend/src/test/render.tsx`
- Create: `frontend/src/stores/theme.test.ts`

**Step 1: Add the failing theme behavior test**

Create `frontend/src/stores/theme.test.ts` covering:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useThemeStore } from '@/stores/theme'

describe('useThemeStore', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    useThemeStore.setState({ theme: 'auto', effectiveTheme: 'light' })
  })

  it('follows the operating-system theme in auto mode', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList)

    useThemeStore.getState().setTheme('auto')

    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})
```

**Step 2: Run the test to verify the missing runner fails**

Run: `cd frontend && npm test -- --run src/stores/theme.test.ts`

Expected: FAIL because the `test` script and Vitest dependencies do not exist.

**Step 3: Install the minimal test stack**

Run:

```bash
cd frontend
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Add scripts to `frontend/package.json`:

```json
"test": "vitest",
"test:run": "vitest run"
```

Extend `frontend/vite.config.ts` with a `test` block using `jsdom`, globals, and `src/test/setup.ts`. Add `@testing-library/jest-dom/vitest` to the setup file.

Create `frontend/src/test/render.tsx` with a `MemoryRouter` wrapper for component tests.

**Step 4: Run the theme test and the production build**

Run:

```bash
cd frontend
npm run test:run -- src/stores/theme.test.ts
npm run build
```

Expected: PASS and a successful TypeScript/Vite build.

**Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vite.config.ts frontend/src/test frontend/src/stores/theme.test.ts
git commit -m "test(frontend): add component test infrastructure"
```

### Task 2: Create the single-source Ember Orbit design tokens

**Files:**
- Create: `frontend/src/styles/tokens.css`
- Create: `frontend/src/styles/foundations.css`
- Create: `frontend/src/styles/motion.css`
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/src/assets/liquid-glass.css`
- Modify: `frontend/src/assets/main.css`
- Test: `frontend/src/stores/theme.test.ts`

**Step 1: Add failing assertions for both theme token sets**

Extend the theme test:

```ts
it.each([
  ['light', 'light'],
  ['dark', 'dark'],
] as const)('applies the %s theme', (theme, expected) => {
  useThemeStore.getState().setTheme(theme)
  expect(document.documentElement.dataset.theme).toBe(expected)
})
```

Add a DOM smoke test that imports `tokens.css` and verifies representative variables exist on `document.documentElement`, including `--color-bg`, `--color-surface`, `--color-accent`, `--radius-panel`, and `--motion-fast`.

**Step 2: Run the tests to verify the token import fails**

Run: `cd frontend && npm run test:run -- src/stores/theme.test.ts`

Expected: FAIL because the token files and variables do not exist.

**Step 3: Add the token and foundation files**

Define shared geometry and motion in `:root`, Night Orbit values in `[data-theme='dark']`, and Day Ember values in `[data-theme='light']`.

Required token groups:

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --radius-control: 10px;
  --radius-panel: 16px;
  --radius-shell: 20px;
  --motion-instant: 140ms;
  --motion-fast: 200ms;
  --motion-page: 280ms;
  --motion-hero: 440ms;
  --ease-standard: cubic-bezier(.2, 0, 0, 1);
  --ease-emphasized: cubic-bezier(.2, .8, .2, 1);
}
```

Move reset, body typography, focus-visible, selection, and scrollbar rules into `foundations.css`. Move reusable keyframes and global reduced-motion behavior into `motion.css`.

Import the new files before legacy CSS in `frontend/src/main.tsx`. Replace conflicting token definitions in legacy files with references to the new variables; do not mechanically rewrite page-specific CSS yet.

**Step 4: Verify tokens, lint, and build**

Run:

```bash
cd frontend
npm run test:run -- src/stores/theme.test.ts
npm run lint
npm run build
```

Expected: all commands succeed and no duplicate root token source remains.

**Step 5: Commit**

```bash
git add frontend/src/styles frontend/src/main.tsx frontend/src/assets frontend/src/stores/theme.test.ts
git commit -m "refactor(frontend): centralize Ember Orbit design tokens"
```

### Task 3: Replace sidebar state with shell state and a unified ambient-light hook

**Files:**
- Create: `frontend/src/hooks/useAmbientLight.ts`
- Create: `frontend/src/hooks/useAmbientLight.test.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/AppLayout.tsx`
- Modify: `frontend/src/stores/layout.ts`
- Delete after migration: `frontend/src/components/layout/AppSidebar.tsx`

**Step 1: Write failing tests for the ambient-light hook**

Test that one pointer event schedules one `requestAnimationFrame`, updates `--light-x` and `--light-y` on the supplied element, and does not call `querySelectorAll` or `getBoundingClientRect` for every card.

The hook contract should be:

```ts
export function useAmbientLight<T extends HTMLElement>(): React.RefObject<T | null>
```

**Step 2: Run the hook test and verify failure**

Run: `cd frontend && npm run test:run -- src/hooks/useAmbientLight.test.tsx`

Expected: FAIL because the hook does not exist.

**Step 3: Implement the hook and remove duplicate pointer listeners**

Use a single `pointermove` listener and one pending animation-frame guard. Update only the application background element. Remove the mousemove effect from `App.tsx` and the all-card traversal from `AppLayout.tsx`.

Replace sidebar-specific Zustand state with shell state only if a real consumer remains, for example:

```ts
interface LayoutState {
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void
}
```

Do not retain dead `sidebarCollapsed` compatibility fields.

**Step 4: Run tests, lint, and build**

Run:

```bash
cd frontend
npm run test:run -- src/hooks/useAmbientLight.test.tsx
npm run lint
npm run build
```

Expected: PASS; no `querySelectorAll('.glass-card, .liquid-glass')` remains.

**Step 5: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/layout frontend/src/hooks frontend/src/stores/layout.ts
git commit -m "refactor(frontend): simplify shell ambient effects"
```

### Task 4: Build the draggable floating top navigation

**Files:**
- Create: `frontend/src/components/layout/AppTopbar.tsx`
- Create: `frontend/src/components/layout/AppTopbar.test.tsx`
- Create: `frontend/src/styles/layout.css`
- Modify: `frontend/src/components/layout/AppLayout.tsx`
- Modify: `frontend/src/components/layout/AppHeader.tsx`
- Modify: `frontend/src/router/routes.tsx`
- Modify: `frontend/src/main.tsx`

**Step 1: Write failing topbar navigation tests**

Render the topbar in a `MemoryRouter` and verify:

- The Orange brand is present.
- Workbench, projects, calendar, and analytics links target the correct routes.
- The current route receives `aria-current='page'`.
- Settings is an icon action, not a central navigation item.
- Search/command, notification, settings, and user controls have accessible labels.

**Step 2: Run the test and verify failure**

Run: `cd frontend && npm run test:run -- src/components/layout/AppTopbar.test.tsx`

Expected: FAIL because `AppTopbar` does not exist.

**Step 3: Extract and implement the topbar**

Move reusable notification and user-menu behavior from `AppHeader.tsx` into `AppTopbar.tsx`. Keep page title logic in a small route metadata helper or remove it from the shell when the page supplies its own heading.

Use Wails v3 draggable CSS:

```css
.app-topbar {
  --wails-draggable: drag;
}

.app-topbar a,
.app-topbar button,
.app-topbar input,
.app-topbar [role='menu'] {
  --wails-draggable: no-drag;
}
```

Implement three zones: brand, centered primary navigation, and utilities. Preserve notification polling and logout behavior. The utilities must not shift the centered navigation as counts or usernames change.

Update `AppLayout.tsx` to render the ambient background, `AppTopbar`, and the outlet. Remove sidebar imports and sidebar margin calculations.

**Step 4: Verify component behavior and build**

Run:

```bash
cd frontend
npm run test:run -- src/components/layout/AppTopbar.test.tsx
npm run lint
npm run build
```

Expected: PASS with no `AppSidebar` imports or `sidebarCollapsed` references.

**Step 5: Manually verify Wails drag behavior**

Run: `task dev`

Verify on the desktop shell:

- Empty topbar regions drag the window.
- Links and buttons click without starting a drag.
- Double-clicking a drag region follows platform window maximize/restore behavior.
- Dropdowns remain inside the visible window at narrow widths.

**Step 6: Commit**

```bash
git add frontend/src/components/layout frontend/src/router/routes.tsx frontend/src/styles/layout.css frontend/src/main.tsx
git commit -m "feat(frontend): replace sidebar with draggable top navigation"
```

### Task 5: Add responsive top navigation and bottom dock behavior

**Files:**
- Create: `frontend/src/components/layout/AppDock.tsx`
- Create: `frontend/src/components/layout/AppDock.test.tsx`
- Modify: `frontend/src/components/layout/AppTopbar.tsx`
- Modify: `frontend/src/components/layout/AppLayout.tsx`
- Modify: `frontend/src/styles/layout.css`

**Step 1: Write failing dock tests**

Verify the dock exposes the same four primary routes, uses accessible names, and highlights the active route. Do not test CSS breakpoints in jsdom; test semantic parity between topbar and dock.

**Step 2: Run the test and verify failure**

Run: `cd frontend && npm run test:run -- src/components/layout/AppDock.test.tsx`

Expected: FAIL because the dock does not exist.

**Step 3: Implement responsive behavior**

- Desktop: floating topbar with centered navigation.
- Medium width: topbar navigation labels may shorten, but icons and labels remain discoverable.
- Narrow width: hide the centered navigation and render `AppDock` at the bottom.
- Add bottom safe-area padding using `env(safe-area-inset-bottom)`.
- Keep settings and user actions in the topbar.

**Step 4: Test and build**

Run:

```bash
cd frontend
npm run test:run -- src/components/layout/AppDock.test.tsx src/components/layout/AppTopbar.test.tsx
npm run build
```

Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/components/layout frontend/src/styles/layout.css
git commit -m "feat(frontend): add responsive bottom navigation dock"
```

### Task 6: Model the dashboard view state and loading/error boundaries

**Files:**
- Create: `frontend/src/views/dashboard/useDashboardData.ts`
- Create: `frontend/src/views/dashboard/useDashboardData.test.tsx`
- Create: `frontend/src/views/dashboard/DashboardSkeleton.tsx`
- Create: `frontend/src/views/dashboard/DashboardError.tsx`
- Modify: `frontend/src/views/DashboardView.tsx`

**Step 1: Write failing data-hook tests**

Mock `dashboardApi` and verify:

- Initial state is loading.
- All four dashboard requests are issued together.
- Success maps payments and exposes stats, trends, projects, and upcoming payments.
- A failed request exposes an error while preserving previously loaded data on refresh.
- Period changes request only the trend endpoint.

**Step 2: Run the hook test and verify failure**

Run: `cd frontend && npm run test:run -- src/views/dashboard/useDashboardData.test.tsx`

Expected: FAIL because the hook does not exist.

**Step 3: Extract the hook and explicit view states**

Move API orchestration and payment mapping out of `DashboardView.tsx`. Return an interface similar to:

```ts
interface DashboardViewState {
  stats: DashboardStats
  incomeLabels: string[]
  incomeValues: number[]
  projects: Project[]
  payments: PaymentDisplayItem[]
  period: Period
  loading: boolean
  refreshing: boolean
  error: string | null
  setPeriod: (period: Period) => Promise<void>
  retry: () => Promise<void>
}
```

Add skeleton and local error components that match the final layout. Avoid blanking existing content during refresh.

**Step 4: Run tests, lint, and build**

Run:

```bash
cd frontend
npm run test:run -- src/views/dashboard/useDashboardData.test.tsx
npm run lint
npm run build
```

Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/views/DashboardView.tsx frontend/src/views/dashboard
git commit -m "refactor(frontend): isolate dashboard data states"
```

### Task 7: Implement the cinematic financial hero and summary metrics

**Files:**
- Create: `frontend/src/components/dashboard/FinancialHero.tsx`
- Create: `frontend/src/components/dashboard/FinancialHero.test.tsx`
- Create: `frontend/src/components/dashboard/SummaryMetric.tsx`
- Create: `frontend/src/styles/dashboard.css`
- Modify: `frontend/src/views/DashboardView.tsx`
- Modify: `frontend/src/main.tsx`
- Modify or replace: `frontend/src/components/dashboard/StatCard.tsx`

**Step 1: Write failing hero tests**

Verify the hero displays:

- Current expected collection amount.
- The nearest payment timing when data is available.
- Overdue risk.
- One primary action that routes to the relevant payment or project workflow.
- A safe empty-state message when no upcoming payment exists.

**Step 2: Run the test and verify failure**

Run: `cd frontend && npm run test:run -- src/components/dashboard/FinancialHero.test.tsx`

Expected: FAIL because the component does not exist.

**Step 3: Implement the hero and three secondary metrics**

Keep the hero API presentation-only. Pass formatted values and action targets from `DashboardView`. Use semantic HTML: one page heading, labeled metrics, and a real link/button for the primary action.

Implement the visual orbit with pseudo-elements and CSS gradients only. Do not add canvas particles or a permanent JavaScript animation loop.

Replace the four equal `StatCard` grid with the hero followed by three summary metrics: paid amount, pending amount, and average collection days or overdue risk.

**Step 4: Run tests and build**

Run:

```bash
cd frontend
npm run test:run -- src/components/dashboard/FinancialHero.test.tsx
npm run build
```

Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/components/dashboard frontend/src/views/DashboardView.tsx frontend/src/styles/dashboard.css frontend/src/main.tsx
git commit -m "feat(frontend): add cinematic financial dashboard hero"
```

### Task 8: Recompose dashboard content around actions

**Files:**
- Create: `frontend/src/components/dashboard/ActionQueue.tsx`
- Create: `frontend/src/components/dashboard/ActionQueue.test.tsx`
- Modify: `frontend/src/components/dashboard/IncomeChart.tsx`
- Modify: `frontend/src/components/dashboard/ProjectList.tsx`
- Modify: `frontend/src/components/dashboard/UpcomingPayments.tsx`
- Modify: `frontend/src/components/dashboard/QuickActions.tsx`
- Modify: `frontend/src/views/DashboardView.tsx`
- Modify: `frontend/src/styles/dashboard.css`

**Step 1: Write failing action-queue tests**

Verify upcoming payments are sorted by urgency, show project/client context, and provide direct navigation. Verify an empty list shows a positive empty state rather than a blank card.

**Step 2: Run the test and verify failure**

Run: `cd frontend && npm run test:run -- src/components/dashboard/ActionQueue.test.tsx`

Expected: FAIL because the component does not exist.

**Step 3: Implement the main/side dashboard grid**

- Main column: cash-flow trend with stable axes and period controls.
- Side column: future-seven-day action queue.
- Lower area: recent projects and exceptions/recent activity.
- Move quick actions into the hero/topbar command affordance or reduce them to one compact row; do not retain a large equal-weight quick-action card.

Refactor `IncomeChart` to consume CSS-derived theme colors or a small chart-theme helper instead of duplicating arbitrary hex values. Keep Chart.js instance cleanup.

**Step 4: Verify tests and build**

Run:

```bash
cd frontend
npm run test:run -- src/components/dashboard/ActionQueue.test.tsx
npm run lint
npm run build
```

Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/components/dashboard frontend/src/views/DashboardView.tsx frontend/src/styles/dashboard.css
git commit -m "feat(frontend): make dashboard content action oriented"
```

### Task 9: Complete Night Orbit and Day Ember theme behavior

**Files:**
- Create: `frontend/src/components/common/ThemeSelector.tsx`
- Create: `frontend/src/components/common/ThemeSelector.test.tsx`
- Modify: `frontend/src/stores/theme.ts`
- Modify: `frontend/src/stores/theme.test.ts`
- Modify: `frontend/src/components/layout/AppTopbar.tsx`
- Modify: `frontend/src/styles/tokens.css`
- Modify: `frontend/src/styles/foundations.css`
- Modify: `frontend/src/styles/layout.css`
- Modify: `frontend/src/styles/dashboard.css`

**Step 1: Write failing selector and system-change tests**

Verify:

- The selector exposes light, dark, and auto modes.
- The chosen mode is persisted.
- Auto reacts to `matchMedia` changes.
- Explicit light/dark modes ignore later system changes.
- Theme changes add a temporary `theme-transitioning` class and remove it after the transition.

**Step 2: Run tests and verify failure**

Run:

```bash
cd frontend
npm run test:run -- src/components/common/ThemeSelector.test.tsx src/stores/theme.test.ts
```

Expected: FAIL for missing selector/transition behavior.

**Step 3: Implement the complete selector and both material systems**

Use a menu/popover in the topbar rather than a binary sun/moon toggle. Implement Day Ember with warm ivory backgrounds, ceramic surfaces, warm gray borders, and soft shadows. Implement Night Orbit with charcoal backgrounds, restrained glass, and one warm ambient light source.

Do not reuse dark-theme glow values in light mode. Check text, muted text, borders, warning, danger, and success contrast independently.

**Step 4: Run tests, lint, and build**

Run:

```bash
cd frontend
npm run test:run -- src/components/common/ThemeSelector.test.tsx src/stores/theme.test.ts
npm run lint
npm run build
```

Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/components/common/ThemeSelector* frontend/src/components/layout/AppTopbar.tsx frontend/src/stores/theme* frontend/src/styles
git commit -m "feat(frontend): complete Day Ember and Night Orbit themes"
```

### Task 10: Enforce motion, keyboard, and overlay accessibility

**Files:**
- Create: `frontend/src/hooks/useReducedMotion.ts`
- Create: `frontend/src/hooks/useReducedMotion.test.tsx`
- Modify: `frontend/src/styles/motion.css`
- Modify: `frontend/src/components/common/ConfirmModal.tsx`
- Modify: `frontend/src/components/layout/AppTopbar.tsx`
- Modify: `frontend/src/components/notification/NotificationDetailModal.tsx`
- Modify: `frontend/src/components/common/StatusBadge.tsx`

**Step 1: Write failing accessibility tests**

Cover:

- Reduced-motion media-query changes.
- Escape closes menus and modals.
- Opening a modal moves focus inside it.
- Closing restores focus to the trigger.
- Icon-only controls have accessible names.
- Status badges expose distinct text/semantic classes for not-started and archived states.

**Step 2: Run tests and verify failure**

Run:

```bash
cd frontend
npm run test:run -- src/hooks/useReducedMotion.test.tsx src/components/common/ConfirmModal.test.tsx
```

Expected: FAIL until behavior is implemented. Create `ConfirmModal.test.tsx` if it does not exist.

**Step 3: Implement the accessibility layer**

- Reduce or replace page translation, orbit motion, and ambient tracking when motion is reduced.
- Keep essential state feedback using opacity or color.
- Add dialog labeling, focus trapping, Escape handling, and focus restoration.
- Add `aria-label` to every icon-only control.
- Correct neutral status mappings so archived/not-started do not reuse overdue danger styling.

**Step 4: Run the focused suite and build**

Run:

```bash
cd frontend
npm run test:run -- src/hooks/useReducedMotion.test.tsx src/components/common/ConfirmModal.test.tsx
npm run lint
npm run build
```

Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/hooks frontend/src/components/common frontend/src/components/layout/AppTopbar.tsx frontend/src/components/notification frontend/src/styles/motion.css
git commit -m "fix(frontend): improve motion and keyboard accessibility"
```

### Task 11: Remove migrated legacy CSS and dead sidebar code

**Files:**
- Modify: `frontend/src/assets/liquid-glass.css`
- Modify: `frontend/src/assets/main.css`
- Modify: `frontend/src/main.tsx`
- Delete: `frontend/src/components/layout/AppSidebar.tsx`
- Delete or simplify: `frontend/src/components/layout/AppHeader.tsx`
- Modify: `frontend/src/stores/layout.ts`

**Step 1: Create a migration inventory**

Run:

```bash
rg -n "sidebar|page-header|dashboard-view|stat-card|quick-action|glass-card" frontend/src
```

Classify each match as active, migrated, or obsolete. Do not delete rules still used by projects, calendar, analytics, settings, or forms.

**Step 2: Remove only migrated rules and dead components**

Delete old sidebar, dashboard, duplicate glass-card, and page-header rules now owned by `styles/layout.css` and `styles/dashboard.css`. Keep legacy page rules until those pages are redesigned in later phases.

Remove unused imports and dead Zustand fields.

**Step 3: Verify no stale shell references remain**

Run:

```bash
rg -n "AppSidebar|sidebarCollapsed|toggleSidebar|page-header" frontend/src
```

Expected: no shell/sidebar references; page-specific false positives must be documented or renamed.

**Step 4: Run the complete frontend verification suite**

Run:

```bash
cd frontend
npm run test:run
npm run lint
npm run build
```

Expected: all succeed.

**Step 5: Commit**

```bash
git add frontend/src/assets frontend/src/components/layout frontend/src/stores/layout.ts frontend/src/main.tsx
git commit -m "refactor(frontend): remove migrated legacy shell styles"
```

### Task 12: Run desktop visual, performance, and regression verification

**Files:**
- Modify if findings require it: `frontend/src/styles/*.css`
- Modify if findings require it: focused React components from Tasks 4–10
- Create: `docs/verification/2026-07-11-orange-frontend-redesign.md`

**Step 1: Run automated verification**

Run:

```bash
cd frontend
npm run test:run
npm run lint
npm run build
cd ..
go test ./...
```

Expected: all commands succeed.

**Step 2: Run the Wails desktop app**

Run: `task dev`

Verify at minimum:

- Real macOS/Wails windows at 1440×900, 1280×800, and widths of 800px, 768px, 375px,
  and 320px.
- At every tested width, confirm the topbar brand and visible utilities do not collide or clip.
- Verify Topbar drag, double-click, navigation, dropdowns, and the complete keyboard Tab order.
- At 768px and below, confirm the hidden topbar navigation is absent from both the Tab order and
  accessibility tree, while the visible Dock links remain discoverable in the expected order.
- At 375px and 320px, open the notification menu and confirm its left and right edges remain within
  the viewport with at least the intended inset.
- Dashboard loading, success, empty, refresh, and failure states.
- Light, dark, and auto themes, including a live operating-system theme change.
- Reduced-motion behavior with the OS setting enabled.
- No horizontal overflow; scroll each view to its end and confirm the Dock does not cover content,
  including safe-area bottom spacing.

**Step 3: Profile pointer and animation behavior**

Use browser performance tooling while moving the pointer across the dashboard and switching periods. Confirm there is no per-card layout traversal and no sustained animation work when the interface is idle.

Acceptance target: idle dashboard should not continuously repaint large regions; pointer tracking should update one environment layer per animation frame at most.

**Step 4: Document evidence and any accepted limitations**

Create `docs/verification/2026-07-11-orange-frontend-redesign.md` containing:

- Commands and results.
- Tested window sizes and operating system.
- Screenshots for Night Orbit and Day Ember.
- Drag-region verification.
- Reduced-motion verification.
- Known issues deferred to project/calendar/analytics/settings redesign phases.

**Step 5: Commit fixes and verification evidence**

```bash
git add frontend/src docs/verification/2026-07-11-orange-frontend-redesign.md
git commit -m "test(frontend): verify Ember Orbit dashboard redesign"
```

## Follow-on work deliberately excluded from this plan

After the shell and dashboard are stable, write separate plans for:

1. Projects list/detail information-density redesign.
2. Calendar and analytics visual-system migration.
3. Settings component decomposition and unified forms/tables.
4. Optional command palette and keyboard-first workflow.

Keeping these out prevents the first implementation from becoming an all-pages rewrite and lets the dashboard serve as the proven design-system reference.
