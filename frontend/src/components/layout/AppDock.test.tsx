import { describe, expect, test, vi } from 'vitest'
import { render, screen, within } from '@/test/render'
import '@/styles/layout.css'
import AppDock from './AppDock'
import AppLayout from './AppLayout'
import AppTopbar from './AppTopbar'
import { primaryNavigationItems } from './primaryNavigation'

vi.mock('@wailsio/runtime', () => ({
  Window: { ToggleMaximise: vi.fn().mockResolvedValue(undefined) },
}))

const expectedNavigation = [
  { label: '工作台', path: '/dashboard' },
  { label: '项目管理', path: '/projects' },
  { label: '收款日历', path: '/calendar' },
  { label: '数据分析', path: '/analytics' },
]

const getNavigation = (name: string) => {
  const navigation = screen
    .getAllByRole('navigation', { hidden: true })
    .find((element) => element.getAttribute('aria-label') === name)
  expect(navigation).toBeDefined()
  return navigation!
}

const getNavigationLinks = (name: string) =>
  within(getNavigation(name)).getAllByRole('link', { hidden: true })

const getCssRules = (rules: CSSRuleList): CSSRule[] =>
  Array.from(rules).flatMap((rule) => {
    if ('cssRules' in rule) return [rule, ...getCssRules((rule as CSSGroupingRule).cssRules)]
    return [rule]
  })

describe('AppDock', () => {
  test('uses the shared primary navigation contract', () => {
    expect(primaryNavigationItems.map(({ label, path }) => ({ label, path }))).toEqual(
      expectedNavigation,
    )

    render(
      <>
        <AppTopbar />
        <AppDock />
      </>,
      { initialEntries: ['/dashboard'] },
    )

    const topbarLinks = getNavigationLinks('主导航')
    const dockLinks = getNavigationLinks('快捷导航')

    expect(topbarLinks.map((link) => [link.textContent, link.getAttribute('href')])).toEqual(
      dockLinks.map((link) => [link.textContent, link.getAttribute('href')]),
    )
    expect(dockLinks).toHaveLength(primaryNavigationItems.length)
  })

  test('exposes accessible routes and marks only the matching route as current', () => {
    render(<AppDock />, { initialEntries: ['/projects/42'] })

    for (const item of expectedNavigation) {
      expect(screen.getByRole('link', { hidden: true, name: item.label })).toHaveAttribute(
        'href',
        item.path,
      )
    }
    expect(screen.getByRole('link', { hidden: true, name: '项目管理' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { hidden: true, name: '工作台' })).not.toHaveAttribute(
      'aria-current',
    )
    expect(screen.queryByRole('link', { hidden: true, name: '系统设置' })).not.toBeInTheDocument()
  })

  test('is rendered by the application layout without duplicating settings', () => {
    render(<AppLayout />, { initialEntries: ['/calendar'] })

    expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument()
    expect(getNavigation('快捷导航')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: '系统设置' })).toHaveLength(1)
    expect(
      within(getNavigation('快捷导航')).queryByRole('link', {
        hidden: true,
        name: '系统设置',
      }),
    ).not.toBeInTheDocument()
  })

  test('defines responsive, safe-area-aware and keyboard-visible dock styles', () => {
    const rules = Array.from(document.styleSheets).flatMap((sheet) => getCssRules(sheet.cssRules))
    const findStyleRule = (selector: string) =>
      rules.find(
        (rule): rule is CSSStyleRule =>
          rule instanceof CSSStyleRule && rule.selectorText === selector,
      )

    const dockRule = findStyleRule('.app-dock')
    const focusRule = findStyleRule('.app-dock__link:focus-visible')
    const responsiveRule = rules.find(
      (rule): rule is CSSMediaRule =>
        rule instanceof CSSMediaRule && rule.conditionText.includes('max-width: 768px'),
    )
    const responsiveStyles = responsiveRule ? Array.from(responsiveRule.cssRules) : []
    const findResponsiveStyle = (selector: string) =>
      responsiveStyles.find(
        (rule): rule is CSSStyleRule =>
          rule instanceof CSSStyleRule && rule.selectorText === selector,
      )

    expect(dockRule?.style.display).toBe('none')
    expect(dockRule?.style.getPropertyValue('--wails-draggable')).toBe('no-drag')
    expect(dockRule?.style.bottom).toContain('env(safe-area-inset-bottom)')
    expect(focusRule?.style.outline).not.toBe('')
    expect(findResponsiveStyle('.app-topbar__nav')?.style.display).toBe('none')
    expect(findResponsiveStyle('.app-dock')?.style.display).not.toBe('none')
    expect(findResponsiveStyle('.app-view-content')?.style.paddingBottom).toContain(
      'env(safe-area-inset-bottom)',
    )
  })
})
