import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const readSource = (path: string) => readFileSync(resolve(path), 'utf8')

const mainCss = readSource('src/assets/main.css')
const layoutCss = readSource('src/styles/layout.css')
const dashboardCss = readSource('src/styles/dashboard.css')
const loginCss = readSource('src/styles/login.css')
const motionCss = readSource('src/styles/motion.css')
const projectDomainCss = readSource('src/styles/project-domain.css')
const mainSource = readSource('src/main.tsx')
const appLayoutSource = readSource('src/components/layout/AppLayout.tsx')
const dashboardViewSource = readSource('src/views/DashboardView.tsx')
const dashboardSkeletonSource = readSource('src/views/dashboard/DashboardSkeleton.tsx')
const legacyCss = mainCss

// Inventory from the task-11 migration audit:
// - legacy/dead: sidebar/nav-menu/nav-item shell, page-header/title/subtitle/actions,
//   quick actions, dashboard chart/project rows, and table-era dashboard project-list rules.
// - current owner: app shell selectors live in layout.css; Ember dashboard selectors live in
//   dashboard.css.
// - active but misplaced: StatCard is still used by Analytics and moves to stat-card.css.
const removedLegacySelector =
  /(^|[,{]\s*)\.(?:sidebar(?:[.:\s~]|$)|nav-menu(?:[.:\s]|$)|nav-section(?:[.:\s]|$)|nav-item(?:[.:\s]|$)|page-header(?:[.:\s]|$)|page-title(?:[.:\s,]|$)|page-subtitle(?:[.:\s,]|$)|page-actions(?:[.:\s]|$)|quick-action(?:[.:\s-]|$)|quick-actions-grid(?:[.:\s]|$)|dashboard-charts-row(?:[.:\s,]|$)|dashboard-projects-row(?:[.:\s,]|$))/m

describe('legacy CSS ownership contract', () => {
  it('removes the unreferenced liquid-glass implementation and import', () => {
    expect(existsSync(resolve('src/assets/liquid-glass.css'))).toBe(false)
    expect(mainSource).not.toContain("import './assets/liquid-glass.css'")
  })

  it('keeps the active shell exclusively in layout.css', () => {
    expect(layoutCss).toMatch(/\.app-container\s*\{/)
    expect(layoutCss).toMatch(/\.app-background\s*\{/)
    expect(layoutCss).toMatch(/\.app-main\s*\{/)

    expect(legacyCss).not.toMatch(/(^|[,{]\s*)\.app-container(?:[.:\s]|$)/m)
    expect(legacyCss).not.toMatch(/(^|[,{]\s*)\.app-background(?:[.:\s]|$)/m)
    expect(legacyCss).not.toMatch(/(^|[,{]\s*)\.main-content(?:[.:\s]|$)/m)
    expect(legacyCss).not.toMatch(removedLegacySelector)
    expect(existsSync(resolve('src/styles/tokens.css'))).toBe(false)
    expect(appLayoutSource).not.toMatch(/className=["'`]([^"'`]*\s)?main-content(?:\s|["'`])/)
  })

  it('keeps the current dashboard layout exclusively in dashboard.css', () => {
    expect(dashboardCss).toMatch(/\.ember-dashboard\s*\{/)
    expect(dashboardCss).toMatch(/\.dashboard-action-grid\s*\{/)

    expect(legacyCss).not.toContain('.dashboard-view .dashboard-charts-row')
    expect(legacyCss).not.toContain('.dashboard-view .dashboard-projects-row')
    expect(legacyCss).not.toMatch(/\.project-list-card\s+\.project-table/)
    expect(legacyCss).not.toMatch(/\.project-list-card\s+\.table-scroll-container/)
    expect(`${dashboardViewSource}\n${dashboardSkeletonSource}`).not.toMatch(
      /className=["'`][^"'`]*\bdashboard-view\b/,
    )
  })

  it('removes legacy GlassCard and StatusBadge implementations superseded by ODS', () => {
    expect(legacyCss).not.toMatch(/(^|[,{]\s*)\.glass-card(?:[.:\s-]|$)/m)
    expect(legacyCss).not.toMatch(/(^|[,{]\s*)\.status-badge(?:[.:\s_-]|$)/m)
    expect(motionCss).not.toMatch(/(^|[,{]\s*)\.glass-card(?:[.:\s-]|$)/m)
  })

  it('removes legacy button, table, progress, and theme-control primitives', () => {
    expect(legacyCss).not.toMatch(/(^|[,{]\s*)\.btn(?:[.:\s-]|$)/m)
    expect(legacyCss).not.toMatch(/(^|[,{]\s*)\.data-table(?:[.:\s]|$)/m)
    expect(legacyCss).not.toMatch(/(^|[,{]\s*)\.progress-bar(?:[.:\s-]|$)/m)
    expect(legacyCss).not.toMatch(/(^|[,{]\s*)\.theme-toggle(?:[.:\s-]|$)/m)
  })

  it('does not let unlayered global form rules override ODS controls', () => {
    expect(mainCss).not.toMatch(/^(?:input|select|textarea)(?:,|\s*\{)/m)
    expect(mainCss).not.toMatch(/^\[data-theme='dark'\] (?:input|select|textarea):focus/m)
  })

  it('removes superseded shell, modal, input-group, and skeleton primitives', () => {
    expect(legacyCss).not.toMatch(/(^|[,{]\s*)\.(?:dock|control-center)(?:[.:\s-]|$)/m)
    expect(legacyCss).not.toMatch(/(^|[,{]\s*)\.modal(?:[.:\s-]|$)/m)
    expect(legacyCss).not.toMatch(/(^|[,{]\s*)\.input-group(?:[.:\s-]|$)/m)
    expect(legacyCss).not.toMatch(/(^|[,{]\s*)\.skeleton(?:[.:\s-]|$)/m)
  })

  it('keeps the calendar primitive exclusively in Orange Design System', () => {
    expect(legacyCss).not.toMatch(/(^|[,{]\s*)\.calendar-day(?:[.:\s-]|$)/m)
    expect(legacyCss).not.toMatch(/(^|[,{]\s*)\.calendar-nav(?:[.:\s-]|$)/m)
    expect(mainCss).not.toMatch(/(^|[,{]\s*)\.calendar-view \.event-dot(?:[.:\s-]|$)/m)
  })

  it('moves the Analytics StatCard contract out of legacy global styles', () => {
    const statCardPath = 'src/styles/stat-card.css'

    expect(existsSync(resolve(statCardPath))).toBe(true)
    const statCardCss = readSource(statCardPath)

    expect(legacyCss).not.toMatch(/(^|[,{]\s*)\.stat-card(?:[.:\s-]|$)/m)
    expect(statCardCss).toMatch(/\.stat-card-icon\s*\{/)
    expect(statCardCss).toMatch(/\.stat-card-value\s*\{/)
    expect(statCardCss).toMatch(/@media \(max-width: 1024px\)/)
    expect(mainSource).toContain("import './styles/stat-card.css'")
  })

  it('removes unreferenced dashboard components and the unused Vue starter stylesheet', () => {
    expect(existsSync(resolve('src/components/dashboard/QuickActions.tsx'))).toBe(false)
    expect(existsSync(resolve('src/components/dashboard/UpcomingPayments.tsx'))).toBe(false)
    expect(existsSync(resolve('src/assets/base.css'))).toBe(false)
    expect(mainSource).not.toContain('base.css')
  })

  it('removes styles owned by superseded common components', () => {
    expect(existsSync(resolve('src/styles/components.css'))).toBe(false)
    expect(mainSource).not.toContain("import './styles/components.css'")
    expect(mainCss).not.toMatch(
      /\.(?:confirm-overlay|date-picker-wrapper|status-badge--danger|toast-container)(?:[.\s:{]|$)/,
    )
    expect(mainCss).not.toContain('components/common/ConfirmModal.tsx')
    expect(mainCss).not.toContain('components/common/DatePicker.tsx')
    expect(mainCss).not.toContain('components/common/ToastContainer.tsx')
  })

  it('keeps the transitional main stylesheet limited to page composition', () => {
    const classNames = [...mainCss.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((match) => match[1])

    expect([...new Set(classNames)].sort()).toEqual(
      [
        'analytics-toolbar',
        'analytics-view',
        'calendar-view',
        'chart-container',
        'chart-layout',
        'main-layout',
      ].sort(),
    )
    expect(mainCss).not.toMatch(
      /\.(?:btn-primary-login|data-table|dropdown-item|form-tab|input-wrapper|page-number|password-toggle|remember-me|search-input-wrapper)(?:[.\s:{]|$)/,
    )
  })

  it('uses ODS variants and tones instead of page-level component skins', () => {
    expect(loginCss).not.toMatch(/\.login-card(?:[.\s:{]|$)/)
    expect(projectDomainCss).not.toMatch(/\.finance-card--(?:success|warning)/)
    expect(projectDomainCss).not.toContain('.payment-item--highlighted')
  })
})
