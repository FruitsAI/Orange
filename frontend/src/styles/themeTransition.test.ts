import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { THEME_TRANSITION_DURATION } from '@/stores/theme'

const foundationsCss = readFileSync(resolve('src/design-system/foundations/motion.css'), 'utf8')

describe('theme transition contract', () => {
  it('limits the short transition to visual theme properties', () => {
    const transitionRule = foundationsCss.match(/\.theme-transitioning[\s\S]*?\{([^}]+)\}/)?.[1]

    expect(transitionRule).toContain('transition-duration: var(--ods-duration-fast)')
    expect(transitionRule).not.toContain('220ms')
    expect(THEME_TRANSITION_DURATION).toBe(200)
    expect(transitionRule).toContain('background-color')
    expect(transitionRule).toContain('border-color')
    expect(transitionRule).toContain('box-shadow')
    expect(transitionRule).toContain('opacity')
    expect(transitionRule).not.toMatch(/transition:\s*all/)
    expect(transitionRule).not.toContain('transform')
  })

  it('removes the legacy theme-transition implementation with liquid glass', () => {
    expect(existsSync(resolve('src/assets/liquid-glass.css'))).toBe(false)
  })
})
