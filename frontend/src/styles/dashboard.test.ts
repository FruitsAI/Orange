import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const dashboardCss = readFileSync(resolve('src/styles/dashboard.css'), 'utf8')

describe('dashboard visual contract', () => {
  it('uses semantic design tokens and keeps its pseudo-element orbit non-interactive', () => {
    expect(dashboardCss).toContain('var(--color-surface)')
    expect(dashboardCss).toContain('var(--color-accent-rgb)')
    expect(dashboardCss).toMatch(/\.financial-hero::after[\s\S]*pointer-events:\s*none/)
    expect(dashboardCss).not.toContain('.financial-hero__orbit')
    expect(dashboardCss).not.toContain('!important')
  })

  it('contains narrow-screen and reduced-motion safeguards', () => {
    expect(dashboardCss).toContain('@media (max-width: 720px)')
    expect(dashboardCss).toContain('@media (prefers-reduced-motion: reduce)')
  })

  it('gives Day Ember an explicit high-contrast orange hero treatment', () => {
    expect(dashboardCss).toMatch(
      /\[data-theme='light'\] \.financial-hero\s*\{[\s\S]*--hero-text:\s*#fff[\s\S]*linear-gradient/,
    )
    expect(dashboardCss).toMatch(/\.financial-hero__amount\s*\{[\s\S]*color:\s*var\(--hero-text\)/)
    expect(dashboardCss).toMatch(
      /\.financial-hero__supporting-copy\s*\{[\s\S]*color:\s*var\(--hero-text-muted\)/,
    )
    expect(dashboardCss).toMatch(
      /\.summary-metric__label\s*\{[\s\S]*color:\s*var\(--color-text-muted\)/,
    )
  })
})
