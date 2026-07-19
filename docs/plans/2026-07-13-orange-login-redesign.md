# Orange Login Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move the desktop topbar into a safer macOS titlebar position and rebuild the login experience as a reusable Ember Orbit split layout without changing authentication behavior.

**Architecture:** Keep `LoginView` as the stateful auth/navigation container and move presentation into focused components. Add reusable brand, surface, field, and primary-action primitives; compose them into login-specific Hero and form panels; migrate legacy login CSS into a dedicated token-driven stylesheet. Preserve all existing auth store, localStorage, routing, theme, Wails drag, and accessibility contracts.

**Tech Stack:** React 19, TypeScript, Zustand, React Router, CSS design tokens, Vitest, Testing Library, Wails v3/WKWebView.

---

## Execution rules

- Use `@test-driven-development` for every behavior change: RED → GREEN → refactor.
- Use `@systematic-debugging` for any unexpected Wails/WebKit behavior.
- Do not add registration, password recovery, social login, CAPTCHA, or backend changes.
- Do not convert unrelated product forms to the new auth-only field component.
- Preserve the user's untracked `.superpowers/` directory.
- Run focused tests after each task and the complete verification suite before completion.

### Task 1: Add the macOS topbar safety inset

**Files:**
- Modify: `frontend/src/styles/layout.test.ts`
- Modify: `frontend/src/styles/layout.css`

**Step 1: Write the failing layout contract**

Add a test that locks the desktop topbar inset at 24px and verifies content padding derives from the same token:

```ts
it('keeps the desktop topbar below the macOS window controls', () => {
  const rootRule = findStyleRule(':root')
  const contentRule = findStyleRule('.app-view-content')

  expect(rootRule?.style.getPropertyValue('--app-topbar-inset').trim()).toBe('24px')
  expect(contentRule?.style.padding).toContain('var(--app-topbar-inset)')
})
```

If the existing helper does not expose custom properties, add only the smallest parsing support needed inside `layout.test.ts`.

**Step 2: Run the test to verify RED**

Run:

```bash
cd frontend
npm run test:run -- src/styles/layout.test.ts
```

Expected: FAIL because `--app-topbar-inset` is still `14px`.

**Step 3: Implement the safe inset**

Change the root token:

```css
:root {
  --app-dock-height: 62px;
  --app-topbar-height: 64px;
  --app-topbar-inset: 24px;
  --app-window-controls-space: 58px;
}
```

Keep `.app-topbar { top: var(--app-topbar-inset) }` and the existing `.app-view-content` calculation. If 480px screenshots show excessive vertical compression, add this narrow override only:

```css
@media (max-width: 480px) {
  :root {
    --app-topbar-inset: 18px;
  }
}
```

Do not change drag/no-drag rules.

**Step 4: Run the focused tests**

Run:

```bash
npm run test:run -- src/styles/layout.test.ts src/components/layout/AppTopbar.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/styles/layout.css frontend/src/styles/layout.test.ts
git commit -m "fix(frontend): add macOS topbar safety spacing"
```

### Task 2: Extract the brand and Ember surface primitives

**Files:**
- Create: `frontend/src/components/common/BrandLockup.tsx`
- Create: `frontend/src/components/common/BrandLockup.test.tsx`
- Create: `frontend/src/components/common/EmberPanel.tsx`
- Create: `frontend/src/components/common/EmberPanel.test.tsx`
- Create: `frontend/src/styles/ember-components.css`
- Modify: `frontend/src/main.tsx`

**Step 1: Write failing tests for `BrandLockup`**

```tsx
import { render, screen } from '@/test/render'
import { describe, expect, it } from 'vitest'
import BrandLockup from './BrandLockup'

describe('BrandLockup', () => {
  it('renders the Orange identity and optional subtitle', () => {
    render(<BrandLockup subtitle="项目收款管理系统" />)

    expect(screen.getByRole('img', { name: 'Orange' })).toHaveAttribute('src', '/orange.png')
    expect(screen.getByText('Orange')).toBeInTheDocument()
    expect(screen.getByText('项目收款管理系统')).toBeInTheDocument()
  })

  it('supports the compact shell treatment', () => {
    const { container } = render(<BrandLockup compact />)
    expect(container.firstChild).toHaveClass('brand-lockup', 'brand-lockup--compact')
  })
})
```

**Step 2: Write failing tests for `EmberPanel`**

```tsx
import { render, screen } from '@/test/render'
import { describe, expect, it } from 'vitest'
import EmberPanel from './EmberPanel'

it('applies a semantic panel tone and forwards HTML attributes', () => {
  render(
    <EmberPanel aria-label="登录区域" tone="surface">
      content
    </EmberPanel>,
  )

  expect(screen.getByLabelText('登录区域')).toHaveClass('ember-panel', 'ember-panel--surface')
})
```

**Step 3: Run the tests to verify RED**

Run:

```bash
npm run test:run -- src/components/common/BrandLockup.test.tsx src/components/common/EmberPanel.test.tsx
```

Expected: FAIL because both components are missing.

**Step 4: Implement `BrandLockup`**

Use a small typed interface and standard HTML attributes:

```tsx
import type { HTMLAttributes } from 'react'

interface BrandLockupProps extends HTMLAttributes<HTMLDivElement> {
  compact?: boolean
  subtitle?: string
}

export default function BrandLockup({
  compact = false,
  subtitle,
  className = '',
  ...props
}: BrandLockupProps) {
  return (
    <div
      className={`brand-lockup ${compact ? 'brand-lockup--compact' : ''} ${className}`.trim()}
      {...props}
    >
      <img alt="Orange" className="brand-lockup__logo" src="/orange.png" />
      <div className="brand-lockup__copy">
        <strong>Orange</strong>
        {subtitle ? <span>{subtitle}</span> : null}
      </div>
    </div>
  )
}
```

**Step 5: Implement `EmberPanel`**

```tsx
import type { HTMLAttributes, ReactNode } from 'react'

interface EmberPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  tone?: 'hero' | 'surface'
}

export default function EmberPanel({
  children,
  className = '',
  tone = 'surface',
  ...props
}: EmberPanelProps) {
  return (
    <div className={`ember-panel ember-panel--${tone} ${className}`.trim()} {...props}>
      {children}
    </div>
  )
}
```

**Step 6: Add token-driven primitive styles**

Create `ember-components.css` with only shared primitive styles:

```css
.brand-lockup {
  align-items: center;
  display: inline-flex;
  gap: var(--space-3);
}

.brand-lockup__logo {
  height: 52px;
  width: 52px;
}

.brand-lockup__copy {
  display: grid;
  gap: 2px;
}

.brand-lockup__copy strong {
  color: var(--color-text);
  font-size: 24px;
  letter-spacing: -0.035em;
}

.brand-lockup__copy span {
  color: var(--color-text-muted);
  font-size: 13px;
}

.brand-lockup--compact .brand-lockup__logo {
  height: 32px;
  width: 32px;
}

.ember-panel {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--color-border-strong);
  box-shadow: var(--shadow-panel);
}

.ember-panel--surface {
  background: var(--color-surface-raised);
  border-radius: var(--radius-shell);
}
```

The Hero tone may define only reusable surface defaults; login-specific orbit composition stays in `login.css`.

Import the stylesheet from `main.tsx` immediately after tokens/foundations and before page styles.

**Step 7: Run tests and build**

```bash
npm run test:run -- src/components/common/BrandLockup.test.tsx src/components/common/EmberPanel.test.tsx
npm run build
```

Expected: PASS.

**Step 8: Commit**

```bash
git add frontend/src/components/common/BrandLockup* frontend/src/components/common/EmberPanel* frontend/src/styles/ember-components.css frontend/src/main.tsx
git commit -m "feat(frontend): add Ember identity primitives"
```

### Task 3: Extract accessible auth form primitives

**Files:**
- Create: `frontend/src/components/auth/AuthField.tsx`
- Create: `frontend/src/components/auth/AuthField.test.tsx`
- Create: `frontend/src/components/auth/PrimaryActionButton.tsx`
- Create: `frontend/src/components/auth/PrimaryActionButton.test.tsx`
- Modify: `frontend/src/styles/ember-components.css`

**Step 1: Write failing `AuthField` tests**

Test label association, decorative icon hiding, trailing action, and error description:

```tsx
render(
  <AuthField
    error="请输入密码"
    icon="ri-lock-line"
    id="password"
    label="密码"
    trailing={<button type="button">显示密码</button>}
    type="password"
  />,
)

expect(screen.getByLabelText('密码')).toHaveAttribute('aria-describedby', 'password-error')
expect(screen.getByRole('alert')).toHaveTextContent('请输入密码')
expect(screen.getByRole('button', { name: '显示密码' })).toBeInTheDocument()
expect(document.querySelector('.auth-field__icon')).toHaveAttribute('aria-hidden', 'true')
```

Also verify standard input props such as `autoComplete`, `value`, and `onChange` are forwarded.

**Step 2: Write failing `PrimaryActionButton` tests**

```tsx
render(<PrimaryActionButton loading>登录</PrimaryActionButton>)

expect(screen.getByRole('button', { name: '登录中…' })).toBeDisabled()
expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
```

Verify the non-loading button forwards `type="submit"` and click handlers.

**Step 3: Run tests to verify RED**

```bash
npm run test:run -- src/components/auth/AuthField.test.tsx src/components/auth/PrimaryActionButton.test.tsx
```

Expected: FAIL because the auth primitives are missing.

**Step 4: Implement `AuthField`**

The component should extend `InputHTMLAttributes<HTMLInputElement>` and remove only conflicting props:

```tsx
interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
  icon: string
  id: string
  label: string
  trailing?: ReactNode
}
```

Render:

```tsx
<div className={`auth-field ${error ? 'auth-field--error' : ''}`}>
  <label htmlFor={id}>{label}</label>
  <div className="auth-field__control">
    <i aria-hidden="true" className={`${icon} auth-field__icon`} />
    <input aria-describedby={error ? `${id}-error` : undefined} id={id} {...inputProps} />
    {trailing ? <div className="auth-field__trailing">{trailing}</div> : null}
  </div>
  {error ? (
    <p id={`${id}-error`} role="alert">
      {error}
    </p>
  ) : null}
</div>
```

**Step 5: Implement `PrimaryActionButton`**

Use `ButtonHTMLAttributes<HTMLButtonElement>` and keep dimensions stable:

```tsx
export default function PrimaryActionButton({
  children,
  disabled,
  loading = false,
  loadingLabel = '登录中…',
  ...props
}: PrimaryActionButtonProps) {
  return (
    <button
      aria-busy={loading || undefined}
      className="primary-action-button"
      disabled={disabled || loading}
      {...props}
    >
      <span>{loading ? loadingLabel : children}</span>
    </button>
  )
}
```

**Step 6: Add auth primitive styles**

Use design tokens for inputs and the orange action gradient. Include:

- 48–52px input/button height.
- Visible label and `focus-within` state.
- Leading icon and reserved trailing-action space.
- `:focus-visible` support on the password toggle and action button.
- Error border/text using `--color-danger`.
- `:active` transform only when motion is allowed.

Do not use global `input:focus` selectors.

**Step 7: Run tests and commit**

```bash
npm run test:run -- src/components/auth/AuthField.test.tsx src/components/auth/PrimaryActionButton.test.tsx
git add frontend/src/components/auth frontend/src/styles/ember-components.css
git commit -m "feat(frontend): add accessible auth controls"
```

### Task 4: Build the login Hero and controlled form panel

**Files:**
- Create: `frontend/src/components/auth/LoginHero.tsx`
- Create: `frontend/src/components/auth/LoginHero.test.tsx`
- Create: `frontend/src/components/auth/LoginFormPanel.tsx`
- Create: `frontend/src/components/auth/LoginFormPanel.test.tsx`
- Create: `frontend/src/styles/login.css`
- Modify: `frontend/src/main.tsx`

**Step 1: Write the failing `LoginHero` test**

```tsx
render(<LoginHero />)

expect(screen.getByText('EMBER ORBIT')).toBeInTheDocument()
expect(
  screen.getByRole('heading', { name: '让每一笔回款，都沿着清晰轨道抵达' }),
).toBeInTheDocument()
expect(screen.getByText('项目进度')).toBeInTheDocument()
expect(document.querySelector('.login-hero__orbit')).toHaveAttribute('aria-hidden', 'true')
```

**Step 2: Write failing controlled-form tests**

Render `LoginFormPanel` with explicit values and spies. Verify:

- username/password changes call the provided handlers.
- password toggle calls `onTogglePassword`.
- remember checkbox calls `onRememberChange`.
- form submission calls `onSubmit` once.
- loading disables the action button.
- error text is announced.
- `ThemeSelector` exposes the three theme modes.

Use a props interface shaped like:

```ts
interface LoginFormPanelProps {
  error?: string
  loading: boolean
  onPasswordChange: (value: string) => void
  onRememberChange: (checked: boolean) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onTogglePassword: () => void
  onUsernameChange: (value: string) => void
  password: string
  rememberMe: boolean
  showPassword: boolean
  username: string
}
```

**Step 3: Run tests to verify RED**

```bash
npm run test:run -- src/components/auth/LoginHero.test.tsx src/components/auth/LoginFormPanel.test.tsx
```

Expected: FAIL because both components are missing.

**Step 4: Implement `LoginHero`**

Compose `BrandLockup` and `EmberPanel tone="hero"`. Keep orbit elements decorative:

```tsx
<EmberPanel className="login-hero" tone="hero">
  <div aria-hidden="true" className="login-hero__orbit" />
  <BrandLockup className="login-hero__brand" subtitle="项目收款管理系统" />
  <div className="login-hero__content">
    <p className="login-hero__eyebrow">EMBER ORBIT</p>
    <h1>让每一笔回款，都沿着清晰轨道抵达</h1>
    <p>管理项目、计划与回款进度，把注意力留给真正重要的工作。</p>
  </div>
  <ul aria-label="核心能力" className="login-hero__capabilities">
    <li>项目进度</li>
    <li>回款计划</li>
    <li>经营视图</li>
  </ul>
</EmberPanel>
```

**Step 5: Implement `LoginFormPanel`**

Compose:

- `EmberPanel tone="surface"`
- `ThemeSelector`
- two `AuthField` instances
- password icon button with dynamic accessible name
- native remember-me checkbox
- `PrimaryActionButton`

Use a section heading (`h2`) because `LoginHero` owns the page `h1`.

**Step 6: Add the initial `login.css` composition**

Define:

```css
.login-page {
  position: relative;
  min-height: 100dvh;
  overflow: hidden auto;
  background: var(--color-bg);
  color: var(--color-text);
}

.login-page__shell {
  display: grid;
  min-height: 100dvh;
  max-width: 1540px;
  margin: 0 auto;
  grid-template-columns: minmax(0, 1.25fr) minmax(360px, 0.75fr);
  gap: clamp(24px, 4vw, 64px);
  align-items: stretch;
  padding: clamp(76px, 8vh, 112px) clamp(22px, 4vw, 64px) clamp(28px, 5vh, 64px);
}
```

Add Hero orange gradients and orbit layers using existing tokens. Keep form panel width constrained and vertically centered.

Import `login.css` from `main.tsx` after shared component styles.

**Step 7: Run focused tests and build**

```bash
npm run test:run -- src/components/auth/LoginHero.test.tsx src/components/auth/LoginFormPanel.test.tsx src/components/common/ThemeSelector.test.tsx
npm run build
```

Expected: PASS.

**Step 8: Commit**

```bash
git add frontend/src/components/auth/LoginHero* frontend/src/components/auth/LoginFormPanel* frontend/src/styles/login.css frontend/src/main.tsx
git commit -m "feat(frontend): compose Ember Orbit login panels"
```

### Task 5: Refactor `LoginView` into the stateful container

**Files:**
- Create: `frontend/src/views/LoginView.test.tsx`
- Modify: `frontend/src/views/LoginView.tsx`

**Step 1: Write auth-flow regression tests**

Mock auth and navigation at module boundaries. Cover:

1. remembered username initializes the field and checkbox.
2. successful login stores the username when checked.
3. successful login removes `lastUsername` when unchecked.
4. failed login shows store error or the “登录失败” fallback.
5. loading state disables the submit button.
6. logged-in users redirect to `/dashboard`.

Example user-flow assertion:

```tsx
await user.clear(screen.getByLabelText('用户名 / 邮箱 / 手机号'))
await user.type(screen.getByLabelText('用户名 / 邮箱 / 手机号'), 'admin')
await user.type(screen.getByLabelText('密码'), 'admin123')
await user.click(screen.getByRole('button', { name: '登录' }))

expect(login).toHaveBeenCalledWith({ username: 'admin', password: 'admin123' })
expect(window.localStorage.getItem('lastUsername')).toBe('admin')
```

Never assert or snapshot a real local credential file.

**Step 2: Run the test to verify RED**

```bash
npm run test:run -- src/views/LoginView.test.tsx
```

Expected: FAIL against the old monolithic markup or missing test harness behavior.

**Step 3: Replace the old markup**

Keep the existing state and `handleLogin`, but render only:

```tsx
return (
  <main className="login-page">
    <div aria-hidden="true" className="login-page__ambient" />
    <div className="login-page__shell">
      <LoginHero />
      <LoginFormPanel
        error={loginError}
        loading={loading}
        onPasswordChange={setPassword}
        onRememberChange={setRememberMe}
        onSubmit={handleLogin}
        onTogglePassword={() => setShowPassword((value) => !value)}
        onUsernameChange={setUsername}
        password={password}
        rememberMe={rememberMe}
        showPassword={showPassword}
        username={username}
      />
    </div>
  </main>
)
```

Remove direct theme-store usage from `LoginView`; theme presentation belongs to `LoginFormPanel` through `ThemeSelector`.

**Step 4: Run view and component tests**

```bash
npm run test:run -- src/views/LoginView.test.tsx src/components/auth/LoginFormPanel.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/views/LoginView.tsx frontend/src/views/LoginView.test.tsx
git commit -m "refactor(frontend): separate login state and presentation"
```

### Task 6: Complete responsive, theme, and motion styling

**Files:**
- Modify: `frontend/src/styles/login.css`
- Modify: `frontend/src/styles/motion.css`
- Create: `frontend/src/styles/login.test.ts`

**Step 1: Write failing stylesheet contracts**

Read CSS as text, following existing style-contract tests. Assert:

- desktop split grid exists.
- `@media (max-width: 900px)` changes to one column.
- `@media (max-width: 600px)` reduces decoration/spacing.
- minimum supported width does not exceed 320px.
- Night Orbit has an explicit Hero treatment.
- `prefers-reduced-motion: reduce` disables login entry/orbit animations.
- login shell uses `100dvh`, not `100vh`.

Example:

```ts
expect(loginCss).toMatch(/\.login-page__shell[\s\S]*grid-template-columns:/)
expect(loginCss).toMatch(/@media \(max-width: 900px\)[\s\S]*grid-template-columns:\s*1fr/)
expect(loginCss).toContain('min-height: 100dvh')
expect(motionCss).toMatch(/prefers-reduced-motion:[\s\S]*login-hero__orbit/)
```

**Step 2: Run the test to verify RED**

```bash
npm run test:run -- src/styles/login.test.ts
```

Expected: FAIL until all responsive and reduced-motion contracts exist.

**Step 3: Implement responsive behavior**

At 900px:

- use `grid-template-columns: 1fr`.
- make Hero shorter and move brand/content into a compact composition.
- cap form width and center it.

At 600px:

- reduce shell padding while retaining the titlebar safe top.
- hide capability tags before removing essential brand content.
- scale down Hero title with `clamp()`.
- make form action full width.

At 375/320px:

- no fixed widths above `calc(100vw - 28px)`.
- theme menu must remain inside the viewport.
- avoid decorative overflow creating a horizontal scrollbar.

**Step 4: Implement motion contracts**

Use transform/opacity only:

```css
@keyframes login-enter {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

Use a slower orbit transform animation only on the decorative orbit. Extend the existing reduced-motion rule so login entry and orbit animation become `none`.

**Step 5: Run focused tests and commit**

```bash
npm run test:run -- src/styles/login.test.ts src/hooks/useReducedMotion.test.tsx
git add frontend/src/styles/login.css frontend/src/styles/login.test.ts frontend/src/styles/motion.css
git commit -m "feat(frontend): finish responsive login motion"
```

### Task 7: Remove migrated legacy login CSS

**Files:**
- Modify: `frontend/src/assets/main.css`
- Modify: `frontend/src/styles/legacyCssContract.test.ts`
- Modify if needed: `frontend/src/assets/liquid-glass.css`

**Step 1: Extend the legacy CSS contract test**

Add assertions that production no longer depends on the old selectors:

```ts
expect(mainCss).not.toContain('.login-wrapper')
expect(mainCss).not.toContain('.floating-shapes')
expect(mainCss).not.toContain('.btn-primary-login')
expect(mainCss).not.toContain('.form-tabs')
expect(mainCss).not.toContain('.social-login')
```

Also search TSX production files to ensure no removed class is referenced.

**Step 2: Run the contract test to verify RED**

```bash
npm run test:run -- src/styles/legacyCssContract.test.ts
```

Expected: FAIL because the old login block is still in `main.css`.

**Step 3: Delete only migrated rules**

Remove the legacy login section beginning with `.login-wrapper` and all now-dead children, including:

- background and floating shape rules.
- old central login card/logo styles.
- unused tabs and social-login styles.
- old login input/button/error/theme-toggle rules.
- old login-only keyframes that are not referenced elsewhere.

Before deleting shared-looking selectors, verify with:

```bash
rg -n "login-wrapper|floating-shapes|btn-primary-login|form-tabs|social-login|theme-toggle-btn" frontend/src
```

Do not remove a selector still consumed by non-login pages.

**Step 4: Run CSS contracts and production build**

```bash
npm run test:run -- src/styles/legacyCssContract.test.ts src/styles/login.test.ts
npm run build
```

Expected: PASS and a smaller CSS asset.

**Step 5: Commit**

```bash
git add frontend/src/assets/main.css frontend/src/assets/liquid-glass.css frontend/src/styles/legacyCssContract.test.ts
git commit -m "refactor(frontend): remove legacy login styling"
```

### Task 8: Run full desktop and regression verification

**Files:**
- Create: `docs/verification/2026-07-13-orange-login-redesign.md`
- Modify only if findings require it: focused files from Tasks 1–7

**Step 1: Run automated verification**

```bash
cd frontend
npm run test:run
npx eslint . --cache
npm run build
cd ..
go test ./...
```

Expected:

- all Vitest files pass.
- ESLint exits 0.
- production build exits 0; the existing large-chunk warning may remain.
- Go tests exit 0; the local macOS linker warning may remain.

Remove generated `frontend/.eslintcache` before committing if it is untracked.

**Step 2: Run the Wails desktop app**

```bash
task dev
```

Use `@computer-use` for the native macOS verification.

Verify:

- Login page loads in Day Ember and Night Orbit without stale composited frames.
- 1280×800 and maximized layouts preserve the split composition.
- 900px switches cleanly to one column.
- 768px, 375px, and 320px have no horizontal overflow or clipped form controls.
- Page content and topbar remain comfortably below the traffic-light controls.
- Topbar empty area drags the window and double-click toggles maximize/restore.
- Topbar links/buttons remain no-drag.
- Theme selector supports auto/light/dark and stays in viewport at narrow widths.
- Tab order is theme → username → password → password toggle → remember → login.
- Password visibility, remember username, invalid login, loading, and valid login work.
- reduced-motion removes entry/orbit motion; if the OS setting cannot be safely changed, record automated coverage rather than claiming manual success.

Do not expose local passwords in screenshots or verification logs.

**Step 3: Capture evidence**

Save at minimum:

- `docs/verification/screenshots/login-redesign-day-ember.jpg`
- `docs/verification/screenshots/login-redesign-night-orbit.jpg`
- a dashboard screenshot showing the increased topbar safety inset.

Use the real capture encoding in the file extension.

**Step 4: Document limitations honestly**

The verification document must include:

- commands and results.
- tested window sizes.
- topbar spacing and drag verification.
- login state/keyboard/theme results.
- reduced-motion result.
- any exact widths or OS settings that could not be manually exercised.
- existing non-blocking chunk/linker warnings.

**Step 5: Request final code review**

Use `@requesting-code-review` to review the full diff, component boundaries, accessibility, legacy CSS removal, and Wails behavior. Resolve Critical/Important findings before completion.

**Step 6: Commit verification evidence**

```bash
git add frontend/src docs/verification/2026-07-13-orange-login-redesign.md docs/verification/screenshots
git commit -m "test(frontend): verify Ember Orbit login redesign"
```

## Completion criteria

- Topbar has the approved macOS safety spacing at desktop widths.
- LoginView is a thin auth container, not a monolithic visual component.
- Brand, Ember surface, auth field, and primary action primitives have focused tests.
- Login Hero and form panel use the same Day Ember/Night Orbit design tokens as Dashboard.
- Existing login business behavior is unchanged and covered by view tests.
- Legacy login CSS is removed without deleting shared styles.
- Full frontend and Go verification passes.
- Native Wails evidence and honest limitations are documented.
