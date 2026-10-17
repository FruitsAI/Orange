# 001 — Unify the login entrance timeline

- **Status**: TODO
- **Commit**: `1dd7161`
- **Severity**: HIGH
- **Category**: Purpose & frequency; Easing & duration; Cohesion & tokens
- **Estimated scope**: 2 files, roughly 45 lines

## Problem

The login surface is one visual object, but it currently enters on three clocks:

```css
/* frontend/src/styles/login.css:92 — current */
.login-wrapper .login-container {
  z-index: 1;
  width: min(100%, 27.5rem);
  animation: login-content-in var(--ods-duration-hero) var(--ods-ease-emphasized) both;
}

/* frontend/src/styles/login.css:129 — current */
.login-wrapper .form-panel {
  animation: login-form-in var(--ods-duration-page) var(--ods-ease-standard) both;
}

/* frontend/src/styles/login.css:161 — current */
@keyframes login-content-in {
  from {
    opacity: 0;
    transform: translateY(1rem) scale(0.97);
  }
}

@keyframes login-form-in {
  from {
    opacity: 0;
    transform: translateY(0.5rem);
  }
}
```

`LoginView.tsx:77-94` nests `.form-panel` inside `.login-container`, so their opacity and vertical
movement compound. Runtime sampling showed the outer animation still moving after the inner 280ms
animation had ended, and the outer `--ods-duration-hero` resolves to 440ms—over the 300ms UI budget.

The local logo also has a second load-dependent fade even though the login page disables its
skeleton:

```tsx
// frontend/src/views/LoginView.tsx:81 — current
<Image
  alt="Orange Logo"
  background="transparent"
  className="login-logo-image"
  radius="full"
  showSkeleton={false}
  src="/orange.png"
/>
```

```css
/* frontend/src/design-system/components/image/image.css:29 — current */
.ods-image__img {
  opacity: 0;
  transition: opacity var(--ods-duration-page) var(--ods-ease-standard);
}
```

Cached and cold image loads therefore start a second, load-dependent animation at different times.

## Target

Use one 280ms CSS motion clock on the complete login container. Keep the existing strong custom
entrance curve and GPU-only properties. Remove the nested form animation and bypass the generic
Image fade only for this bundled logo. A cold resource may still become available after mount, but
it must appear without starting a second animation:

```css
/* frontend/src/styles/login.css — target */
.login-wrapper .login-container {
  z-index: 1;
  width: min(100%, 27.5rem);
  animation: login-content-in var(--ods-duration-page) var(--ods-ease-emphasized) both;
}

.login-wrapper .login-logo-image .ods-image__img {
  opacity: 1;
  transition: none;
}

@keyframes login-content-in {
  from {
    opacity: 0;
    transform: translateY(1rem) scale(0.97);
  }
}
```

Delete the `.login-wrapper .form-panel` animation block and the entire `@keyframes login-form-in`
definition. Do not replace them with another nested animation or a delayed opacity gate.

## Repo conventions to follow

- Feature CSS consumes semantic tokens from `frontend/src/design-system/tokens/semantic.css`; it must
  not consume `--ods-ref-*` values directly.
- `frontend/src/styles/dashboard.css:7-15` already uses `--ods-duration-page` with
  `--ods-ease-emphasized` for a crisp page entrance.
- Keep login-specific composition in `frontend/src/styles/login.css`. Do not alter the shared Image
  primitive for a bundled page logo.
- The existing reduced-motion decision in `frontend/src/styles/login.css:198-207` is deliberate and
  remains unchanged.

## Steps

1. Create `frontend/src/styles/login.motion.test.ts`. Read `src/styles/login.css` and
   `src/design-system/components/image/image.css` as text, following
   `frontend/src/styles/themeTransition.test.ts`.
2. Add failing assertions that the login container uses `var(--ods-duration-page)`, that the login
   stylesheet contains neither `login-form-in` nor a `.form-panel` animation declaration, and that
   `.login-logo-image .ods-image__img` sets `opacity: 1` and `transition: none`.
3. In `frontend/src/styles/login.css`, replace `--ods-duration-hero` with
   `--ods-duration-page` on `.login-container`.
4. Delete the `.form-panel` animation rule and `@keyframes login-form-in`.
5. Add the exact bundled-logo override from the Target section next to `.login-logo-image`.
6. Keep `login-content-in` unchanged apart from its duration owner. Confirm it still animates only
   `opacity` and `transform`.

## Boundaries

- Do NOT modify `LoginView.tsx` markup or authentication behavior.
- Do NOT change the global Image fade in `design-system/components/image/image.css`.
- Do NOT add stagger, JavaScript timers, a motion dependency, or layout-property animation.
- Do NOT alter the floating-shape or reduced-motion rules in this plan.
- If the current excerpts do not match because the existing uncommitted LoginView/Input work was not
  carried into the executor worktree, STOP and report instead of reconstructing it.

## Verification

- **Mechanical**: from `frontend/`, run
  `npm run test:run -- src/styles/login.motion.test.ts src/views/LoginView.test.tsx`, then
  `npm run build`. Both must pass.
- **Feel check**: run the login page twice—once normally and once with cache disabled. Confirm:
  - the card, logo, and form travel as one rigid surface;
  - the form has no secondary downward drift or second opacity phase;
  - the complete surface is visually settled by 280ms;
  - the logo never performs a second fade after the card has settled; on a deliberately throttled
    cold load it may appear when decoded, but that appearance is immediate rather than another 280ms
    transition.
- In DevTools Animations, inspect at 10% playback and confirm only one login entrance animation is
  attached to the card subtree.
- Toggle `prefers-reduced-motion: reduce` and confirm the existing no-entrance/no-drift contract is
  unchanged.
- **Done when**: normal and cold-load runs contain only the container's single CSS entrance clock,
  the logo has no load-triggered transition, all focused tests pass, and shared Image behavior is
  unchanged.
