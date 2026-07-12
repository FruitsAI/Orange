import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const readSource = (path: string) => readFileSync(resolve(path), 'utf8')

const liquidGlassCss = readSource('src/assets/liquid-glass.css')
const mainCss = readSource('src/assets/main.css')
const layoutCss = readSource('src/styles/layout.css')
const dashboardCss = readSource('src/styles/dashboard.css')
const motionCss = readSource('src/styles/motion.css')
const tokensCss = readSource('src/styles/tokens.css')
const mainSource = readSource('src/main.tsx')
const appLayoutSource = readSource('src/components/layout/AppLayout.tsx')
const dashboardViewSource = readSource('src/views/DashboardView.tsx')
const dashboardSkeletonSource = readSource('src/views/dashboard/DashboardSkeleton.tsx')
const legacyCss = `${liquidGlassCss}\n${mainCss}`

// Inventory from the task-11 migration audit:
// - legacy/dead: sidebar/nav-menu/nav-item shell, page-header/title/subtitle/actions,
//   quick actions, dashboard chart/project rows, and table-era dashboard project-list rules.
// - current owner: app shell selectors live in layout.css; Ember dashboard selectors live in
//   dashboard.css.
// - shared/active: GlassCard is used outside the dashboard and stays in liquid-glass.css.
// - active but misplaced: StatCard is still used by Analytics and moves to stat-card.css.
const removedLegacySelector =
  /(^|[,{]\s*)\.(?:sidebar(?:[.:\s~]|$)|nav-menu(?:[.:\s]|$)|nav-section(?:[.:\s]|$)|nav-item(?:[.:\s]|$)|page-header(?:[.:\s]|$)|page-title(?:[.:\s,]|$)|page-subtitle(?:[.:\s,]|$)|page-actions(?:[.:\s]|$)|quick-action(?:[.:\s-]|$)|quick-actions-grid(?:[.:\s]|$)|dashboard-charts-row(?:[.:\s,]|$)|dashboard-projects-row(?:[.:\s,]|$))/m

describe('legacy CSS ownership contract', () => {
  it('keeps the active shell exclusively in layout.css', () => {
    expect(layoutCss).toMatch(/\.app-container\s*\{/)
    expect(layoutCss).toMatch(/\.app-background\s*\{/)
    expect(layoutCss).toMatch(/\.app-main\s*\{/)

    expect(legacyCss).not.toMatch(/(^|[,{]\s*)\.app-container(?:[.:\s]|$)/m)
    expect(legacyCss).not.toMatch(/(^|[,{]\s*)\.app-background(?:[.:\s]|$)/m)
    expect(legacyCss).not.toMatch(/(^|[,{]\s*)\.main-content(?:[.:\s]|$)/m)
    expect(legacyCss).not.toMatch(removedLegacySelector)
    expect(tokensCss).not.toMatch(/--(?:sidebar-width|sidebar-collapsed-width|bg-sidebar)\s*:/)
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

  it('keeps one shared GlassCard base with dark and reduced-motion behavior', () => {
    const baseDefinitions = legacyCss.match(/^\.glass-card\s*\{/gm) ?? []

    expect(baseDefinitions).toHaveLength(1)
    expect(mainCss).not.toMatch(/^\.glass-card(?:[.:\s]|$)/m)
    expect(liquidGlassCss).toMatch(/\[data-theme='dark'\] \.glass-card:hover/)
    expect(liquidGlassCss).toMatch(/\.glass-card-header\s*\{/)
    expect(motionCss).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.glass-card/)
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
})
