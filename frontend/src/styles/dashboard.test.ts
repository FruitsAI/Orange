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
})
