import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const dashboardCss = readFileSync(resolve('src/styles/dashboard.css'), 'utf8')
const actionQueueSource = readFileSync(resolve('src/components/dashboard/ActionQueue.tsx'), 'utf8')
const dayThemeCss = readFileSync(resolve('src/design-system/tokens/themes/day-ember.css'), 'utf8')
const emberPanelSource = readFileSync(resolve('src/components/common/EmberPanel.tsx'), 'utf8')
const incomeChartSource = readFileSync(resolve('src/components/dashboard/IncomeChart.tsx'), 'utf8')
const mainSource = readFileSync(resolve('src/main.tsx'), 'utf8')
const projectListSource = readFileSync(resolve('src/components/dashboard/ProjectList.tsx'), 'utf8')
const routerControlsCss = readFileSync(
  resolve('src/design-system/patterns/router-controls/router-controls.css'),
  'utf8',
)
const dataListCss = readFileSync(
  resolve('src/design-system/patterns/data-list/data-list.css'),
  'utf8',
)
const surfaceCss = readFileSync(resolve('src/design-system/components/surface/surface.css'), 'utf8')
const statCardSource = readFileSync(resolve('src/components/dashboard/StatCard.tsx'), 'utf8')
const statCardCss = readFileSync(resolve('src/styles/stat-card.css'), 'utf8')

function relativeLuminance(hex: string) {
  const channels = hex
    .replace('#', '')
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

function contrastRatio(foreground: string, background: string) {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background))
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background))
  return (lighter + 0.05) / (darker + 0.05)
}

function composite(foreground: string, background: string, alpha: number) {
  const channels = (hex: string) =>
    hex
      .replace('#', '')
      .match(/.{2}/g)!
      .map((channel) => Number.parseInt(channel, 16))
  const foregroundChannels = channels(foreground)
  const backgroundChannels = channels(background)
  return `#${foregroundChannels
    .map((channel, index) =>
      Math.round(channel * alpha + backgroundChannels[index] * (1 - alpha))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
}

describe('dashboard visual contract', () => {
  it('keeps the removed liquid-glass bundle out of the style entrypoint', () => {
    const legacyMainIndex = mainSource.indexOf("import './assets/main.css'")
    const layoutIndex = mainSource.indexOf("import './styles/layout.css'")
    const dashboardIndex = mainSource.indexOf("import './styles/dashboard.css'")

    expect(mainSource).not.toContain("import './assets/liquid-glass.css'")
    expect(mainSource).not.toContain("import './styles/tokens.css'")
    expect(mainSource).not.toContain("import './styles/foundations.css'")
    expect(mainSource).not.toContain("import './styles/components.css'")
    expect(layoutIndex).toBeGreaterThan(legacyMainIndex)
    expect(dashboardIndex).toBeGreaterThan(layoutIndex)
  })

  it('uses semantic design tokens and keeps its pseudo-element orbit non-interactive', () => {
    expect(surfaceCss).toContain('var(--ods-color-bg-surface)')
    expect(dashboardCss).toContain('var(--ods-color-accent-rgb)')
    expect(dashboardCss).toMatch(/\.financial-hero::after[\s\S]*pointer-events:\s*none/)
    expect(dashboardCss).not.toContain('.financial-hero__orbit')
    expect(dashboardCss).not.toContain('!important')
  })

  it('contains narrow-screen and reduced-motion safeguards', () => {
    expect(dashboardCss).toContain('@media (max-width: 720px)')
    expect(dashboardCss).toContain('@media (prefers-reduced-motion: reduce)')
    expect(routerControlsCss).toContain('@media (hover: hover) and (pointer: fine)')
    expect(dashboardCss).not.toContain('transition: none')
    expect(routerControlsCss).toMatch(
      /\.ods-router-link\[data-appearance='row'\]:active[\s\S]*scale\(0\.985\)/,
    )
  })

  it('uses an action-oriented two-to-one grid that collapses at 1000px', () => {
    expect(dashboardCss).toMatch(
      /\.dashboard-action-grid\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 2fr\) minmax\(280px, 1fr\)/,
    )
    expect(dashboardCss).toContain('@media (max-width: 1000px)')
    expect(dashboardCss).toMatch(
      /@media \(max-width: 1000px\)[\s\S]*\.dashboard-action-grid\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/,
    )
  })

  it('keeps dashboard content cards opaque and motion restrained', () => {
    expect(emberPanelSource).toMatch(/gap = 'md'/)
    expect(emberPanelSource).toMatch(/variant = 'secondary'/)
    expect(statCardSource).toMatch(/<Card\.Root[^>]*gap="none"[^>]*variant="tertiary"/)
    expect(routerControlsCss).toMatch(
      /@media \(hover: hover\) and \(pointer: fine\)[\s\S]*data-appearance='row'[\s\S]*translateX\(3px\)/,
    )
    expect(routerControlsCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*data-appearance='row'[\s\S]*transform:\s*none/,
    )
    expect(dashboardCss).not.toContain('transition: all')
    expect(dashboardCss).toMatch(
      /\.financial-hero\[aria-busy='true'\] \.financial-hero__pulse\s*\{[\s\S]*financial-hero-busy-pulse/,
    )
    expect(projectListSource).toMatch(/<ProgressBar[\s\S]*motion="reveal"/)
    expect(dashboardCss).not.toContain('.ods-progress__fill')
  })

  it('keeps ODS dashboard content surfaces restrained', () => {
    expect(emberPanelSource).not.toContain('pressable')
    expect(dashboardCss).not.toContain(
      ':is(.income-chart-card, .action-queue-card, .project-list-card--compact)',
    )
  })

  it('keeps reusable button, row, chip, and skeleton visuals in ODS', () => {
    expect(dashboardCss).not.toMatch(/\.financial-hero__cta:(?:active|hover)/)
    expect(dashboardCss).not.toMatch(/\.(?:action-queue|project-list)__item:(?:active|hover)/)
    expect(dashboardCss).not.toMatch(
      /\.dashboard-skeleton__surface\s*\{[^}]*(?:background|border|box-shadow)\s*:/,
    )
    expect(statCardCss).not.toContain('.ods-card.stat-card')
    expect(statCardCss).not.toContain('.stat-card-trend--')
    expect(statCardSource).toContain('<Chip')
  })

  it('composes dashboard records from the shared DataList pattern', () => {
    expect(actionQueueSource).toContain('<DataList.Root as="ol">')
    expect(projectListSource).toContain('<DataList.Root>')
    expect(actionQueueSource).not.toContain('action-queue__')
    expect(projectListSource).not.toContain('project-list__')
    expect(dashboardCss).not.toMatch(/\.(?:action-queue|project-list)__/)
    expect(dataListCss).toContain("[data-marker-tone='danger']")
    expect(dataListCss).toContain("[data-hide-below='sm']")
  })

  it('visually hides the accessible chart table without removing it from layout semantics', () => {
    expect(incomeChartSource).toMatch(/<Table\.Root visuallyHidden>/)
    expect(dashboardCss).not.toContain('.income-chart__accessible')
  })

  it('keeps full-dashboard skeleton dimensions aligned with loaded regions', () => {
    expect(dashboardCss).toMatch(/\.dashboard-skeleton__hero\s*\{[\s\S]*min-height:\s*360px/)
    expect(dashboardCss).toMatch(/\.dashboard-skeleton__metric\s*\{[\s\S]*min-height:\s*112px/)
    expect(dashboardCss).toMatch(
      /\.dashboard-skeleton__chart,[\s\S]*\.dashboard-skeleton__queue\s*\{[\s\S]*min-height:\s*360px/,
    )
    expect(dashboardCss).toMatch(/\.dashboard-skeleton__projects\s*\{[\s\S]*min-height:\s*280px/)
  })

  it('delegates the high-contrast Day Ember hero surface to the ODS brand variant', () => {
    const heroRoot = dashboardCss.match(/(?:^|\n)\.financial-hero\s*\{([^}]+)\}/)?.[1]
    const brandSurface = surfaceCss.match(
      /\.ods-surface\[data-variant='brand'\]\s*\{([^}]+)\}/,
    )?.[1]
    const lightBrandGradient = dayThemeCss.match(/--ods-gradient-brand-surface:\s*([\s\S]*?);/)?.[1]
    const mainGradientColors = lightBrandGradient?.match(/#[0-9a-f]{6}/gi)?.slice(-3) ?? []

    expect(heroRoot).not.toMatch(/(?:^|\n)\s*(?:background|border(?:-radius)?|box-shadow)\s*:/)
    expect(dashboardCss).not.toContain("[data-theme='light'] .financial-hero")
    expect(brandSurface).toContain('background: var(--ods-gradient-brand-surface)')
    expect(brandSurface).toContain('box-shadow: var(--ods-shadow-brand-surface)')
    expect(brandSurface).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i)
    expect(dayThemeCss).toContain('--ods-color-fg-brand-surface: var(--ods-ref-color-white)')
    const contextualForegroundAlphas = Array.from(
      dayThemeCss.matchAll(
        /--ods-color-fg-brand-surface-(?:muted|subtle): rgba\(255, 255, 255, ([\d.]+)\)/g,
      ),
      (match) => Number(match[1]),
    )
    expect(contextualForegroundAlphas).toHaveLength(2)
    expect(mainGradientColors).toHaveLength(3)
    mainGradientColors.forEach((background) => {
      expect(contrastRatio('#ffffff', background)).toBeGreaterThanOrEqual(4.5)
      contextualForegroundAlphas.forEach((alpha) => {
        expect(
          contrastRatio(composite('#ffffff', background, alpha), background),
        ).toBeGreaterThanOrEqual(4.5)
      })
    })
    const radial = lightBrandGradient?.match(
      /radial-gradient\(circle at 92% 18%, rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/,
    )
    expect(radial).not.toBeNull()
    const radialColor = `#${radial!
      .slice(1, 4)
      .map((channel) => Number(channel).toString(16).padStart(2, '0'))
      .join('')}`
    mainGradientColors.forEach((background) => {
      expect(
        contrastRatio('#ffffff', composite(radialColor, background, Number(radial![4]))),
      ).toBeGreaterThanOrEqual(4.5)
    })
    expect(dashboardCss).toMatch(
      /\.financial-hero__amount\s*\{[\s\S]*color:\s*var\(--ods-color-fg-default\)/,
    )
    expect(dashboardCss).toMatch(
      /\.financial-hero__supporting-copy\s*\{[\s\S]*color:\s*var\(--ods-color-fg-muted\)/,
    )
    expect(dashboardCss).toMatch(
      /\.summary-metric__label\s*\{[\s\S]*color:\s*var\(--ods-color-fg-muted\)/,
    )
  })
})
