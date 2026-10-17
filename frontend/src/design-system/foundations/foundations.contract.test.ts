import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const readFoundation = (name: string) =>
  readFileSync(resolve('src/design-system/foundations', `${name}.css`), 'utf8')

describe('Orange Design System foundations', () => {
  it('provides a visible keyboard focus contract without suppressing native fallback globally', () => {
    const focus = readFoundation('focus')

    expect(focus).toMatch(/:focus-visible\s*\{/)
    expect(focus).toContain('var(--ods-focus-ring-width)')
    expect(focus).toContain('var(--ods-color-border-focus)')
    expect(focus).not.toMatch(/:focus\s*\{[^}]*outline\s*:\s*none/s)
  })

  it('removes decorative motion when reduced motion is requested', () => {
    const motion = readFoundation('motion')

    expect(motion).toContain('@media (prefers-reduced-motion: reduce)')
    expect(motion).toMatch(/\.ods-motion-ambient[\s\S]*animation\s*:\s*none/)
    expect(motion).toMatch(/scroll-behavior\s*:\s*auto/)
    expect(motion).toMatch(/:root\.theme-transitioning[\s\S]*var\(--ods-ease-standard\)/)
  })

  it('provides screen-reader-only and forced-colors support', () => {
    const accessibility = readFoundation('accessibility')

    expect(accessibility).toMatch(/\.ods-sr-only\s*\{/)
    expect(accessibility).toContain('@media (forced-colors: active)')
    expect(accessibility).toContain('forced-color-adjust: none')
  })

  it('keeps typography and reset values on ODS tokens', () => {
    const source = `${readFoundation('reset')}\n${readFoundation('typography')}`

    expect(source).toContain('var(--ods-font-family-body)')
    expect(source).toContain('var(--ods-color-bg-canvas)')
    expect(source).not.toMatch(/var\(--(?:font-text|color-bg|text-primary|spacing-|radius-)/)
    expect(source).toMatch(/::selection[\s\S]*var\(--ods-color-selection\)/)
    expect(source).toMatch(/::-webkit-scrollbar-thumb[\s\S]*var\(--ods-color-border-strong\)/)
  })
})
