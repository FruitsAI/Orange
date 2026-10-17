# 007 — Remove the autofill pseudo-animation

- **Status**: TODO
- **Commit**: `1dd7161`
- **Severity**: LOW
- **Category**: Performance; Cohesion & tokens
- **Estimated scope**: 2 files, roughly 20 lines

## Problem

At commit `1dd7161` the Input primitive has no explicit WebKit autofill block. The current user
working tree adds the requested stable background through an inset mask, but also starts a nearly
three-hour background transition:

```css
/* frontend/src/design-system/components/input/input.css:140 — current working tree */
.ods-input:-webkit-autofill,
.ods-input:-webkit-autofill:hover,
.ods-input:-webkit-autofill:focus,
.ods-input:-webkit-autofill:active {
  -webkit-text-fill-color: var(--ods-color-fg-default);
  caret-color: var(--ods-color-fg-default);
  box-shadow: 0 0 0 1000px var(--ods-color-bg-surface) inset;
  transition: background-color 9999s var(--ods-ease-standard);
}
```

This is a browser-suppression hack rather than product motion. It keeps a paint property in an active
transition for 9,999 seconds and sits outside the ODS duration semantics.

## Target

Keep the stable surface, text, and caret colors through explicit prefixed and standard inset masks,
but make the UA state immediate:

```css
/* frontend/src/design-system/components/input/input.css — target */
.ods-input:-webkit-autofill,
.ods-input:-webkit-autofill:hover,
.ods-input:-webkit-autofill:focus,
.ods-input:-webkit-autofill:active {
  -webkit-text-fill-color: var(--ods-color-fg-default);
  caret-color: var(--ods-color-fg-default);
  -webkit-box-shadow: 0 0 0 1000px var(--ods-color-bg-surface) inset;
  box-shadow: 0 0 0 1000px var(--ods-color-bg-surface) inset;
  transition: none;
}
```

The prefixed mask is intentional for WKWebView. Do not remove the mask or allow autofill to own the
visible input background.

## Repo conventions to follow

- The current change is uncommitted user work added to keep grouped focus/autofill backgrounds owned
  by the Input primitive. Preserve that behavior and its test at `input.test.tsx:48-55`.
- Form-control visual behavior belongs in `design-system/components/input/input.css`, not login.css.
- `input.test.tsx` already imports the raw stylesheet and is the correct contract location.

## Steps

1. Extend the existing autofill test before editing CSS. If executing from clean commit `1dd7161`,
   first add this focused contract beside the existing Input primitive tests; do not recreate the
   intermediate `9999s` implementation. Require both prefixed and standard inset masks,
   `transition: none`, and absence of `9999s` or any four-digit-second transition value.
2. If the current autofill block exists, add `-webkit-box-shadow` and replace its long transition. If
   it is absent in an isolated worktree, insert the complete Target block after the grouped-input
   transparency rule. Both paths must produce the identical Target code.
3. Keep the prefixed and standard masks byte-for-byte identical.
4. Keep `-webkit-text-fill-color`, caret color, grouped-input transparency, sizing, and all selectors
   unchanged.

## Boundaries

- Plan 002 must be complete so its base input transition contract is not accidentally reverted.
- Do NOT delete either inset mask, change the surface token, or reintroduce a long delay under another
  duration.
- Do NOT change autocomplete attributes, credential storage, login state, focus ring, or input size.
- Do NOT use real credentials during verification; use local development-only saved values.
- Do NOT copy unrelated uncommitted Input sizing or SearchField/LoginView changes into an isolated
  worktree. The complete Target block above is sufficient whether the current autofill block exists
  or not.

## Verification

- **Mechanical**: from `frontend/`, run
  `npm run test:run -- src/design-system/components/input/input.test.tsx src/views/LoginView.test.tsx`,
  then `npm run build`.
- **Feel check**: in the actual Wails WKWebView, save local development credentials and reload the
  login page in both Day Ember and Night Orbit. Confirm:
  - autofill never flashes yellow/blue or replaces the ODS surface;
  - focusing, hovering, and editing an autofilled value do not change the field background;
  - text and caret remain readable in both themes;
  - DevTools reports no 9,999-second transition on the input.
- Repeat with ordinary Chrome/Safari if available. If WKWebView exposes the UA autofill background,
  STOP and report the visual failure; do not ship and do not silently restore another multi-hour
  transition hack.
- **Done when**: the stable ODS autofill appearance is preserved without any long-running transition
  and focused tests pass.
