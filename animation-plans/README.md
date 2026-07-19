# Login Animation Improvement Plans

These plans cover the vetted motion problems on the Orange login page and the shared Orange
Design System controls it uses.

- **Baseline commit**: `1dd7161`
- **Source policy**: these files are plans only; no application source was changed while writing them.
- **Working-tree note**: the baseline currently has pre-existing uncommitted changes in the Input,
  SearchField, and LoginView files. Plans 001–006 target motion code that already exists at `1dd7161`;
  an isolated executor must not try to reconstruct or overwrite those unrelated user changes. Plan
  007 explicitly describes both states—the commit has no autofill override, while the current working
  tree has the long-transition block—and gives one complete target valid from either state. Preserve
  the user's dirty work before merging any executor commit, and resolve overlaps in `input.css` and
  its test deliberately.

| # | Plan | Severity | Status | Depends on |
| --- | --- | --- | --- | --- |
| 001 | [Unify the login entrance timeline](001-unify-login-entrance-timeline.md) | HIGH | TODO | — |
| 002 | [Make form keyboard feedback immediate](002-make-form-feedback-immediate.md) | HIGH | TODO | — |
| 003 | [Give press feedback asymmetric physical timing](003-fix-press-feedback-physicality.md) | MEDIUM | TODO | 002 |
| 004 | [Gate hover motion and stop shadow interpolation](004-gate-hover-and-stop-shadow-interpolation.md) | MEDIUM | TODO | 003 |
| 005 | [Make ambient drift physically continuous](005-smooth-ambient-drift.md) | MEDIUM | TODO | 001 |
| 006 | [Align theme transition timing with ODS tokens](006-align-theme-transition-timing.md) | MEDIUM | TODO | — |
| 007 | [Remove the autofill pseudo-animation](007-remove-autofill-pseudo-animation.md) | LOW | TODO | 002 |

## Recommended execution order

Execute `001 → 002 → 003 → 004 → 005 → 006 → 007`.

- `001` establishes one authoritative login entrance clock before the ambient animation is tuned.
- `002` removes inappropriate keyboard-triggered transitions before `003` narrows the remaining
  transform transition to pointer press feedback.
- `004` assumes the press-duration component tokens introduced by `003` exist.
- `005` extends the motion token set independently but should run after the entrance stylesheet test
  created by `001`.
- `007` shares `input.css` and its contract test with `002`, so it runs last to minimize conflicts.

After every plan, run its focused tests. After all seven plans, run from `frontend/`:

```bash
npm run test:run
npm run build
npx eslint . --no-fix
```

Do not use `npm run lint` for plan verification because the repository script forces `--fix`.

## Settled decisions that are intentionally not planned

- Keep login entrance and decorative shape animation disabled under
  `prefers-reduced-motion: reduce`. This is explicitly required by
  `docs/plans/2026-07-13-orange-login-redesign.md:655,713` and protected by motion contract tests.
  Plan 003 only removes the currently surviving Checkbox spatial scale in that mode.
- Keep the tested `.theme-transitioning *` visual-property contract and the WKWebView body-layout
  invalidation in `frontend/src/stores/theme.ts:102-118`. There is no profiling evidence justifying
  removal. Plan 006 only moves its duration back onto the existing ODS timing scale.
