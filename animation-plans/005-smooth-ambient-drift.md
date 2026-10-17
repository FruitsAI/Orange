# 005 — Make ambient drift physically continuous

- **Status**: TODO
- **Commit**: `1dd7161`
- **Severity**: MEDIUM
- **Category**: Easing & duration; Cohesion & tokens; Purpose & frequency
- **Estimated scope**: 6 files, roughly 45 lines

## Problem

The four background circles move back and forth for 16–22 seconds with an entrance-style,
non-symmetric curve:

```css
/* frontend/src/styles/login.css:60 — current */
.login-wrapper .shape:nth-child(1) {
  /* ... */
  animation: login-drift-a 22s var(--ods-ease-emphasized) infinite alternate;
}

/* the other three use the same easing at login.css:73,81,89 */
```

`--ods-ease-emphasized` resolves to `cubic-bezier(0.2, 0.8, 0.2, 1)`, which is appropriate for
entrance but not continuous on-screen travel. The keyframes also rotate visually symmetric circles:

```css
/* frontend/src/styles/login.css:175 — current */
@keyframes login-drift-a {
  to {
    transform: translate3d(2rem, 1.25rem, 0) rotate(7deg);
  }
}

@keyframes login-drift-b {
  to {
    transform: translate3d(-1.5rem, 2rem, 0) rotate(-6deg);
  }
}
```

The shapes are equal-width/equal-height pill-radius elements with uniform fill and border, so rotation
has no visible purpose.

## Target

Add the audit standard's exact strong ease-in-out curve to the ODS token layers and use it for all
four drifts. Remove only the invisible rotation:

```css
/* frontend/src/design-system/tokens/reference.css — target */
--ods-ref-ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);

/* frontend/src/design-system/tokens/semantic.css — target */
--ods-ease-in-out: var(--ods-ref-ease-in-out);
```

```css
/* frontend/src/styles/login.css — target examples */
animation: login-drift-a 22s var(--ods-ease-in-out) infinite alternate;

@keyframes login-drift-a {
  to {
    transform: translate3d(2rem, 1.25rem, 0);
  }
}

@keyframes login-drift-b {
  to {
    transform: translate3d(-1.5rem, 2rem, 0);
  }
}
```

Keep each existing duration, negative delay, direction, distance, opacity, and `will-change` value.

## Repo conventions to follow

- Insert reference easing beside `--ods-ref-ease-standard` and `--ods-ref-ease-emphasized` in
  `frontend/src/design-system/tokens/reference.css:116-118`.
- Expose only the semantic alias to feature CSS, following `docs/design-system/tokens.md:18-40`.
- `frontend/src/styles/tokens.test.ts` is the computed-style contract for public motion tokens.
- Extend `frontend/src/styles/login.motion.test.ts` created by Plan 001 rather than creating a second
  login stylesheet test.

## Steps

1. Add failing token tests for the exact reference value
   `cubic-bezier(0.77, 0, 0.175, 1)` and semantic alias `var(--ods-ref-ease-in-out)`.
2. Extend `login.motion.test.ts` to require four `var(--ods-ease-in-out)` drift declarations and to
   reject `rotate(` inside both login drift keyframes.
3. Add the reference and semantic tokens exactly as specified.
4. Update all four shape animation declarations to consume `--ods-ease-in-out`; preserve their
   `22s`, `18s`, `20s`, `16s`, negative delays, and alternate directions.
5. Remove `rotate(7deg)` and `rotate(-6deg)` from the two keyframes. Keep `translate3d` unchanged.
6. Update `docs/design-system/tokens.md` to document `--ods-ease-in-out` as the semantic curve for
   on-screen movement and morphing.

## Boundaries

- Plan 001 must be complete so its login motion test can be extended.
- Do NOT change shape size, position, opacity, color, shadow, duration, delay, or travel distance.
- Do NOT animate top/left/right/bottom or add JavaScript/rAF movement.
- Do NOT change entrance easing to ease-in-out; only continuous movement uses this token.
- Keep the documented Reduced Motion behavior (`animation: none; will-change: auto`).
- If the four drift declarations or keyframes have changed, STOP and report drift.

## Verification

- **Mechanical**: from `frontend/`, run
  `npm run test:run -- src/styles/login.motion.test.ts src/styles/tokens.test.ts src/design-system/tokens/tokens.contract.test.ts`,
  then `npm run build`.
- **Feel check**: observe the login page in Day Ember and Night Orbit. In DevTools only, temporarily
  shorten one shape's duration to 4s without saving the stylesheet, then confirm:
  - it accelerates and decelerates symmetrically during travel;
  - the alternate turnaround has no abrupt velocity discontinuity;
  - removing rotate produces no visual loss;
  - the four negative-delay phases still prevent synchronized movement.
- Restore the real duration and observe for at least 30 seconds. Confirm motion remains ambient and
  does not compete with the form.
- Toggle Reduced Motion and confirm every shape becomes stationary.
- **Done when**: all four shapes use the exact semantic ease-in-out token, drift keyframes contain
  translation only, and tests pass.
