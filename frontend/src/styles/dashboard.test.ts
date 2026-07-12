import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const dashboardCss = readFileSync(resolve('src/styles/dashboard.css'), 'utf8')

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
    expect(dashboardCss).toMatch(
      /:is\(\.income-chart-card, \.action-queue-card, \.project-list-card--compact\)[\s\S]*background:\s*var\(--color-surface-raised\)/,
    )
    expect(dashboardCss).toContain('backdrop-filter: none')
    expect(dashboardCss).toMatch(/\.action-queue__item:hover[\s\S]*translateY\(-2px\)/)
    expect(dashboardCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.action-queue__item:hover[\s\S]*transform:\s*none/,
    )
  })

  it('gives Day Ember an explicit high-contrast orange hero treatment', () => {
    const lightHero = dashboardCss.match(
      /\[data-theme='light'\] \.financial-hero\s*\{([^}]+)\}/,
    )?.[1]
    const mainGradientColors = lightHero?.match(/#[0-9a-f]{6}/gi)?.slice(-3) ?? []

    expect(lightHero).toContain('--hero-foreground: #fff')
    expect(lightHero).toContain('--hero-foreground-muted: #fff')
    expect(lightHero).toContain('--hero-risk: #fff')
    expect(mainGradientColors).toHaveLength(3)
    mainGradientColors.forEach((background) => {
      expect(contrastRatio('#ffffff', background)).toBeGreaterThanOrEqual(4.5)
    })
    const radial = lightHero?.match(
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
      /\.financial-hero__amount\s*\{[\s\S]*color:\s*var\(--hero-foreground\)/,
    )
    expect(dashboardCss).toMatch(
      /\.financial-hero__supporting-copy\s*\{[\s\S]*color:\s*var\(--hero-foreground-muted\)/,
    )
    expect(dashboardCss).toMatch(
      /\.summary-metric__label\s*\{[\s\S]*color:\s*var\(--color-text-muted\)/,
    )
  })
})
