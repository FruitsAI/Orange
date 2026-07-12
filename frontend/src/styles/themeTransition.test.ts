import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const foundationsCss = readFileSync(resolve('src/styles/foundations.css'), 'utf8')
const liquidGlassCss = readFileSync(resolve('src/assets/liquid-glass.css'), 'utf8')

describe('theme transition contract', () => {
  it('limits the short transition to visual theme properties', () => {
    const transitionRule = foundationsCss.match(/\.theme-transitioning[\s\S]*?\{([^}]+)\}/)?.[1]

    expect(transitionRule).toContain('220ms')
    expect(transitionRule).toContain('background-color')
    expect(transitionRule).toContain('border-color')
    expect(transitionRule).toContain('box-shadow')
    expect(transitionRule).toContain('opacity')
    expect(transitionRule).not.toMatch(/transition:\s*all/)
    expect(transitionRule).not.toContain('transform')
  })

  it('removes the legacy global duration override', () => {
    expect(liquidGlassCss).not.toMatch(/\.theme-transitioning \*\s*\{[^}]*transition-duration/)
  })
})
