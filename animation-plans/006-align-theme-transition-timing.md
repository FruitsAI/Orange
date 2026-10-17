# 006 — Align theme transition timing with ODS tokens

- **Status**: TODO
- **Commit**: `1dd7161`
- **Severity**: MEDIUM
- **Category**: Cohesion & tokens; Easing & duration
- **Estimated scope**: 4 files, roughly 30 lines

## Problem

The login theme button triggers a duration that is duplicated as unrelated literals in CSS and
TypeScript:

```ts
// frontend/src/stores/theme.ts:47 — current
const THEME_TRANSITION_DURATION = 220
```

```css
/* frontend/src/design-system/foundations/motion.css:48 — current */
:root.theme-transitioning,
:root.theme-transitioning *,
:root.theme-transitioning *::before,
:root.theme-transitioning *::after {
  transition-property: background-color, color, border-color, box-shadow, opacity !important;
  transition-duration: 220ms !important;
  transition-timing-function: var(--ods-ease-standard) !important;
}
```

ODS already exposes 200ms as `--ods-duration-fast`; 220ms is outside the documented duration scale.
The current tests independently lock the magic number at `themeTransition.test.ts:11` and via fake
timer values at `theme.test.ts:116-122`.

## Target

Use the existing 200ms semantic duration in CSS and make the runtime timer explicitly match it:

```css
/* frontend/src/design-system/foundations/motion.css — target */
transition-duration: var(--ods-duration-fast) !important;
```

```ts
// frontend/src/stores/theme.ts — target
// Keep synchronized with --ods-duration-fast (200ms) in design-system/tokens/semantic.css.
export const THEME_TRANSITION_DURATION = 200
```

Exporting the constant lets the timer tests advance the authoritative runtime duration rather than
copying another 199/200 literal.

## Repo conventions to follow

- Reuse `--ods-duration-fast`; do not add a page-specific or theme-specific token when the existing
  role already matches.
- Keep `--ods-ease-standard`, the tested visual-property list, the root class, and the Reduced Motion
  early return unchanged.
- Preserve the documented WKWebView body-layout invalidation at `theme.ts:102-118` exactly.
- Zustand tests already import theme-store exports and use fake timers; import the duration constant
  there as well.

## Steps

1. Change `themeTransition.test.ts` first: require
   `transition-duration: var(--ods-duration-fast)` and reject the literal `220ms`. Read
   `theme.ts` as source or import the exported constant and require the value `200`.
2. Update `theme.test.ts` to import `THEME_TRANSITION_DURATION`. In the rapid-switch test, advance
   `THEME_TRANSITION_DURATION - 1`, assert the class remains, then advance one millisecond and assert
   removal. Do not leave embedded `219` or `220` values.
3. Export `THEME_TRANSITION_DURATION = 200` from `theme.ts` with the synchronization comment shown
   in Target.
4. Replace only the CSS duration literal with `var(--ods-duration-fast)`.
5. Confirm the tests for rapid reset, initial application, Reduced Motion, listener cleanup, scroll
   preservation, and WKWebView reflow remain intact.

## Boundaries

- Do NOT remove or narrow the tested `.theme-transitioning *` selector/property contract in this plan.
- Do NOT remove `box-shadow`, force a View Transition API, or change theme colors.
- Do NOT remove `display: none`, `offsetHeight`, scroll restoration, or their WKWebView comment.
- Do NOT animate initial theme application or Reduced Motion theme changes.
- Do NOT add a new duration token; `--ods-duration-fast` is the chosen semantic value.
- If the theme store no longer uses the class/timer implementation, STOP and report drift.

## Verification

- **Mechanical**: from `frontend/`, run
  `npm run test:run -- src/styles/themeTransition.test.ts src/stores/theme.test.ts src/stores/theme-bootstrap.test.ts src/styles/tokens.test.ts`,
  then `npm run build`.
- **Feel check**: on the login page, toggle Day Ember/Night Orbit slowly and then rapidly. Confirm:
  - the transition is visually complete at 200ms with no late shadow/color snap;
  - a second toggle before completion restarts the cleanup timer and does not remove the class early;
  - no stale WKWebView colors remain until window resize;
  - scroll position is unchanged on pages where the theme control is also available.
- Toggle Reduced Motion and confirm theme changes remain immediate and no transition class is added.
- **Done when**: CSS consumes `--ods-duration-fast`, runtime cleanup is 200ms, tests share the exported
  duration, and WebKit correctness behavior is unchanged.
