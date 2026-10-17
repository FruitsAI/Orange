# 003 — Give press feedback asymmetric physical timing

- **Status**: TODO
- **Commit**: `1dd7161`
- **Severity**: MEDIUM
- **Category**: Physicality & origin; Interruptibility
- **Estimated scope**: 9 files, roughly 80 lines

## Problem

Button and Checkbox press feedback use symmetric timing. Checkbox is also compressed too far:

```css
/* frontend/src/design-system/components/button/button.css:22 — current */
.ods-button {
  transition:
    background-color var(--ods-duration-fast) var(--ods-ease-standard),
    border-color var(--ods-duration-fast) var(--ods-ease-standard),
    color var(--ods-duration-fast) var(--ods-ease-standard),
    box-shadow var(--ods-duration-fast) var(--ods-ease-standard),
    transform var(--ods-duration-instant) var(--ods-ease-standard);
}

/* frontend/src/design-system/components/button/button.css:173 — current */
.ods-button:active:not(:disabled) {
  transform: translateY(1px) scale(0.98);
}

/* frontend/src/design-system/components/checkbox/checkbox.css:79 — current */
.ods-checkbox:active .ods-checkbox__control {
  transform: scale(0.94);
}
```

Button uses 140ms in both directions. Checkbox uses 200ms in both directions and visibly crushes its
20px control by 6%. The interaction standard is a subtle `scale(0.97)`, a deliberate 160ms press,
and a faster 100ms release. Under Reduced Motion, Button already removes its transform, but Checkbox
retains `scale(0.94)` for the entire pointer hold.

## Target

Add explicit semantic press/release durations and select them through component-local custom
properties so CSS transitions remain interruptible:

```css
/* frontend/src/design-system/tokens/reference.css — target */
--ods-ref-duration-160: 160ms;

/* frontend/src/design-system/tokens/semantic.css — target */
--ods-duration-press: var(--ods-ref-duration-160);
--ods-duration-release: var(--ods-ref-duration-100);
```

```css
/* frontend/src/design-system/components/button/button.css — target */
.ods-button {
  --ods-button-transform-duration: var(--ods-duration-release);

  /* preserve existing non-transform transition entries */
  transition:
    background-color var(--ods-duration-fast) var(--ods-ease-standard),
    border-color var(--ods-duration-fast) var(--ods-ease-standard),
    color var(--ods-duration-fast) var(--ods-ease-standard),
    box-shadow var(--ods-duration-fast) var(--ods-ease-standard),
    transform var(--ods-button-transform-duration) var(--ods-ease-standard);
}

.ods-button:active:not(:disabled) {
  --ods-button-transform-duration: var(--ods-duration-press);
  transform: scale(0.97);
}
```

```css
/* frontend/src/design-system/components/checkbox/checkbox.css — target after Plan 002 */
.ods-checkbox__control {
  --ods-checkbox-transform-duration: var(--ods-duration-release);
  transition: transform var(--ods-checkbox-transform-duration) var(--ods-ease-standard);
}

.ods-checkbox:active .ods-checkbox__control {
  --ods-checkbox-transform-duration: var(--ods-duration-press);
  transform: scale(0.97);
}

@media (prefers-reduced-motion: reduce) {
  .ods-checkbox:active .ods-checkbox__control {
    transform: none;
  }
}
```

## Repo conventions to follow

- Reference values live in `tokens/reference.css`; public components consume semantic names from
  `tokens/semantic.css`, as documented in `docs/design-system/tokens.md:3-40`.
- Existing duration order in `reference.css:106-115` is numeric; insert 160ms between 140ms and
  200ms.
- Existing component-local tokens use the `--ods-<component>-*` naming pattern documented at
  `docs/design-system/tokens.md:42-55`.
- Keep CSS transitions rather than keyframes so rapid press/release retargets from the current scale.

## Steps

1. Add `--ods-ref-duration-160`, `--ods-duration-press`, and `--ods-duration-release` exactly as in
   Target. Update `docs/design-system/tokens.md` to list press/release motion semantics.
2. Extend `frontend/src/styles/tokens.test.ts` to assert both semantic mappings.
3. Import `button.css?raw` in `Button.test.tsx` and add assertions for the local duration variable,
   `scale(0.97)`, and semantic press/release token use.
4. Extend the raw-CSS assertions added to `checkbox.test.tsx` by Plan 002 with the same expectations.
5. Remove the cross-layer Button scale assertion at `frontend/src/styles/dashboard.test.ts:84`; the
   precise Button motion contract now belongs to `Button.test.tsx`. Do not change the adjacent
   dashboard/router-control assertions.
6. Apply the Button target. Remove `translateY(1px)`; the scale alone is the press response.
7. Apply the Checkbox target after confirming Plan 002's transform-only transition exists.
8. Add the Checkbox Reduced Motion override. Keep the existing Button override at
   `button.css:213-221` unchanged.

## Boundaries

- Plan 002 must be complete before editing the Checkbox transition.
- Do NOT add keyframes, springs, JavaScript pointer handlers, or dependencies.
- Do NOT change checked-state colors, Button variants, pending behavior, focus outlines, or disabled
  behavior.
- Do NOT change the existing `--ods-duration-instant` meaning; add role-specific semantic tokens.
- If Plan 002's target state is absent, STOP and execute that plan first rather than merging by hand.

## Verification

- **Mechanical**: from `frontend/`, run
  `npm run test:run -- src/styles/tokens.test.ts src/design-system/tokens/tokens.contract.test.ts src/design-system/components/button/Button.test.tsx src/design-system/components/checkbox/checkbox.test.tsx src/styles/dashboard.test.ts src/views/LoginView.test.tsx`,
  then `npm run build`.
- **Feel check**: press and release the login button, theme IconButton, password IconButton, and
  “记住用户名” Checkbox. Confirm:
  - the control compresses only to 97%; text/icons remain readable and do not appear crushed;
  - press-in is deliberate at 160ms while release snaps back at 100ms;
  - rapidly clicking retargets smoothly from the current scale with no keyframe restart;
  - the Button no longer drops by one pixel while scaling.
- In DevTools, slow playback to 25% and verify the press and release phases use different durations.
- Toggle `prefers-reduced-motion: reduce`; hold the Checkbox and confirm it does not change size.
- **Done when**: all pressable login controls share the same subtle physical language, Checkbox has
  no Reduced Motion transform, and focused tests pass.
