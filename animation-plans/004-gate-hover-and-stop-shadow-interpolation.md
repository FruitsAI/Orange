# 004 — Gate hover motion and stop shadow interpolation

- **Status**: TODO
- **Commit**: `1dd7161`
- **Severity**: MEDIUM
- **Category**: Accessibility; Performance; Purpose & frequency
- **Estimated scope**: 2 files, roughly 65 lines reorganized

## Problem

Every login-page button is an ODS Button: the submit button is primary, the theme button is
secondary, and password visibility is ghost. Their hover styles are not gated by pointer capability.
The primary action also interpolates a large paint-only shadow:

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

/* frontend/src/design-system/components/button/button.css:70 — current */
.ods-button[data-variant='primary']:hover:not(:disabled) {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.32),
    0 14px 32px rgba(var(--ods-color-accent-rgb), 0.34);
  transform: translateY(-1px);
}

/* frontend/src/design-system/components/button/button.css:90 — current */
.ods-button[data-variant='secondary']:hover:not(:disabled) {
  border-color: var(--ods-color-border-strong);
  transform: translateY(-1px);
}
```

Equivalent ungated hover rules exist for tertiary, outline, ghost, ghost-danger, and danger variants
at `button.css:105,118,132,145,162`. Touch may retain those pseudo-hover states after a tap, and the
primary/danger shadow interpolation repaints for the full 200ms.

## Target

Remove `box-shadow` from the Button transition list. Keep each variant's static base and active
shadow, but delete hover-only shadow enlargement. Wrap every remaining Button `:hover` rule at its
current cascade position with the exact capability query:

```css
/* frontend/src/design-system/components/button/button.css — target pattern */
.ods-button {
  /* existing declarations and the transform duration from Plan 003 */
  transition:
    background-color var(--ods-duration-fast) var(--ods-ease-standard),
    border-color var(--ods-duration-fast) var(--ods-ease-standard),
    color var(--ods-duration-fast) var(--ods-ease-standard),
    transform var(--ods-button-transform-duration) var(--ods-ease-standard);
}

@media (hover: hover) and (pointer: fine) {
  .ods-button[data-variant='primary']:hover:not(:disabled) {
    transform: translateY(-1px);
  }
}
```

Apply that query separately around the existing hover block for each variant so its position relative
to the corresponding `:active` rule does not change. Do not collect all hover rules at the end of the
file, because a later hover rule would override the active state while the pointer is held.

## Repo conventions to follow

- Use the exact media query already established by
  `frontend/src/design-system/patterns/router-controls/router-controls.css:77-88`:
  `@media (hover: hover) and (pointer: fine)`.
- Button motion stays in the shared ODS primitive; do not add login-page Button overrides.
- Keep the component-local transform-duration token introduced by Plan 003.
- Keep active feedback and focus-visible outline outside the hover media query.

## Steps

1. Extend the raw stylesheet contract in `Button.test.tsx` from Plan 003. Add failing assertions that
   the base transition does not contain `box-shadow`, that all hover transforms appear inside the
   exact fine-pointer media query, and that primary/danger hover rules no longer change shadow.
2. Remove only the `box-shadow ...` entry from `.ods-button`'s transition list.
3. Delete hover-only shadow declarations from primary and danger. Retain their `translateY(-1px)`
   lift for fine pointers and retain static base/active shadows.
4. Wrap each of the seven hover rules—primary, secondary, tertiary, outline, ghost, ghost-danger, and
   danger—in an individual `@media (hover: hover) and (pointer: fine)` block at its current source
   location.
5. Confirm generic `:active`, `:focus-visible`, disabled, pending, and Reduced Motion rules remain
   outside those media blocks.

## Boundaries

- Plan 003 must be complete; preserve its asymmetric transform duration variables.
- Do NOT introduce a pseudo-element glow, new DOM, JavaScript pointer detection, or a dependency.
- Do NOT remove the primary/danger static glow or active shadow feedback.
- Do NOT move active/focus/disabled rules into the hover media query.
- Do NOT modify login.css; all login buttons must receive the fix through the design system.
- If the Button cascade differs from the current excerpt, STOP and report instead of bulk-moving
  selectors.

## Verification

- **Mechanical**: from `frontend/`, run
  `npm run test:run -- src/design-system/components/button/Button.test.tsx src/views/LoginView.test.tsx`,
  then `npm run build`.
- **Feel check**: test the login page with a mouse and with touch emulation:
  - mouse hover gives primary/secondary buttons a one-pixel lift and preserves readable color states;
  - the primary glow no longer expands over 200ms;
  - touch taps do not leave the submit, theme, or password button lifted or hover-colored;
  - active compression and keyboard focus still work without a mouse.
- Enable paint flashing and repeatedly cross the primary button boundary. Confirm the old multi-frame
  shadow repaint is gone; only transform/color feedback remains.
- Toggle `prefers-reduced-motion: reduce` and confirm existing Button transform suppression still wins.
- **Done when**: hover motion is fine-pointer-only, shadows are not interpolated, cascade behavior is
  unchanged during active/focus states, and focused tests pass.
