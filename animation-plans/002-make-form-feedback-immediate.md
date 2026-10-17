# 002 — Make form keyboard feedback immediate

- **Status**: TODO
- **Commit**: `1dd7161`
- **Severity**: HIGH
- **Category**: Purpose & frequency; Performance
- **Estimated scope**: 4 files, roughly 40 lines

## Problem

Keyboard focus and checkbox state are high-frequency, user-initiated feedback. They currently animate
paint properties for 200ms:

```css
/* frontend/src/design-system/components/input/input.css:1 — current */
.ods-input,
.ods-textarea,
.ods-native-select {
  /* ... */
  transition:
    background-color var(--ods-duration-fast) var(--ods-ease-standard),
    border-color var(--ods-duration-fast) var(--ods-ease-standard),
    box-shadow var(--ods-duration-fast) var(--ods-ease-standard);
}

/* frontend/src/design-system/components/input/input.css:80 — current */
.ods-input:focus-visible,
.ods-textarea:focus-visible,
.ods-native-select:focus-visible,
.ods-input-group:focus-within {
  border-color: var(--ods-color-border-focus);
  background: var(--ods-color-bg-surface);
  box-shadow: 0 0 0 4px var(--ods-color-accent-soft);
}

/* frontend/src/design-system/components/input/input.css:110 — current */
.ods-input-group {
  /* ... */
  transition:
    background-color var(--ods-duration-fast) var(--ods-ease-standard),
    border-color var(--ods-duration-fast) var(--ods-ease-standard),
    box-shadow var(--ods-duration-fast) var(--ods-ease-standard);
}
```

The login Checkbox has the same problem. `Space` changes checked colors and focus shadow through the
same 200ms transition:

```css
/* frontend/src/design-system/components/checkbox/checkbox.css:20 — current */
.ods-checkbox__control {
  /* ... */
  transition:
    background-color var(--ods-duration-fast) var(--ods-ease-standard),
    border-color var(--ods-duration-fast) var(--ods-ease-standard),
    box-shadow var(--ods-duration-fast) var(--ods-ease-standard),
    transform var(--ods-duration-fast) var(--ods-ease-standard);
}
```

Animating border and shadow delays focus visibility and repaints on every Tab step.

## Target

Make focus border and ring feedback immediate while retaining a short 140ms background-only hover
crossfade. Leave only Checkbox transform timing for the pointer press plan that follows:

```css
/* frontend/src/design-system/components/input/input.css — target */
.ods-input,
.ods-textarea,
.ods-native-select {
  /* existing non-motion declarations unchanged */
  transition: background-color var(--ods-duration-instant) var(--ods-ease-standard);
}

.ods-input-group {
  /* existing non-motion declarations unchanged */
  transition: background-color var(--ods-duration-instant) var(--ods-ease-standard);
}

.ods-input:focus-visible,
.ods-textarea:focus-visible,
.ods-native-select:focus-visible,
.ods-input-group:focus-within {
  transition: none;
}

/* frontend/src/design-system/components/checkbox/checkbox.css — target */
.ods-checkbox__control {
  /* existing non-motion declarations unchanged */
  transition: transform var(--ods-duration-fast) var(--ods-ease-standard);
}
```

Do not remove or weaken the actual focus border, box-shadow, outline, invalid, checked, hover, or
disabled states. Only their inappropriate transition is removed.

## Repo conventions to follow

- Focus ownership remains in the design-system primitive, as documented in
  `docs/design-system/accessibility.md:5-12`.
- Keep using native `:focus-visible`, `:focus-within`, and the existing native Checkbox input; do not
  add JavaScript input-modality tracking.
- `frontend/src/design-system/components/input/input.test.tsx` already imports `input.css?raw` for
  stylesheet contracts. Mirror that pattern in the Checkbox test.

## Steps

1. In `input.test.tsx`, add failing raw-CSS assertions that the base input-family rule and
   `.ods-input-group` transition only `background-color` through `--ods-duration-instant`, never
   `border-color` or `box-shadow`, and that the shared focus rule resolves to `transition: none`.
2. In `checkbox.test.tsx`, import `checkbox.css?raw` and add a failing assertion that
   `.ods-checkbox__control` transitions `transform` only—not background, border, or shadow.
3. Replace both transition lists in `input.css` with the background-only 140ms transition and add
   `transition: none` to the existing shared focus rule, exactly as shown in Target.
4. Replace the Checkbox transition list with the exact transform-only target above. Do not change
   its duration or scale yet; Plan 003 owns that adjustment.
5. Confirm the selectors that produce visible focus and validation states remain byte-for-byte
   unchanged.

## Boundaries

- Do NOT remove focus rings, outlines, hover colors, checked-state colors, or invalid-state colors.
- Do NOT change component markup, ARIA, labels, sizing, or the current transparent grouped-input
  background behavior.
- Do NOT touch the autofill `9999s` workaround in this plan; Plan 007 handles it after focused Wails
  verification is specified.
- Do NOT modify Button focus; it already uses an immediate outline rather than a transitioned ring.
- If current code differs from the excerpts, STOP and report drift instead of replacing the entire
  stylesheet.

## Verification

- **Mechanical**: from `frontend/`, run
  `npm run test:run -- src/design-system/components/input/input.test.tsx src/design-system/components/checkbox/checkbox.test.tsx src/views/LoginView.test.tsx`,
  then `npm run build`.
- **Feel check**: on the login page, Tab forward and Shift+Tab backward through username, password,
  password visibility, Checkbox, submit, and theme controls. Confirm:
  - each focus indicator appears on the same frame as focus changes;
  - focus never fades through an ambiguous low-contrast state;
  - pressing Space on “记住用户名” changes checked visuals immediately;
  - mouse hover and click still expose the same colors and focus ownership.
- Use DevTools Rendering paint flashing and confirm focus no longer produces a 200ms sequence of
  repeated paints.
- Toggle forced-colors mode if available and verify the native outline remains visible.
- **Done when**: focus and checked state are immediate, visual states are unchanged, and all focused
  tests pass.
