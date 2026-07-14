import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import './styles.css'

const styles = readFileSync(resolve('src/design-system/styles.css'), 'utf8')

describe('Orange Design System stylesheet entry', () => {
  it('declares one deterministic cascade order', () => {
    expect(styles).toContain(
      '@layer reset, vendor, tokens, base, legacy, components, patterns, utilities, overrides;',
    )
  })

  it('imports tokens before foundations in the approved order', () => {
    const imports = Array.from(styles.matchAll(/@import\s+['"]([^'"]+)['"]/g), (match) => match[1])

    expect(imports).toEqual([
      './tokens/reference.css',
      './tokens/semantic.css',
      './tokens/themes/day-ember.css',
      './tokens/themes/night-orbit.css',
      './tokens/compatibility.css',
      './foundations/reset.css',
      './foundations/typography.css',
      './foundations/focus.css',
      './foundations/motion.css',
      './foundations/accessibility.css',
      './components.css',
    ])
  })

  it('does not duplicate Tailwind or import legacy bundles', () => {
    expect(styles).not.toMatch(/@import\s+['"]tailwindcss['"]/) 
    expect(styles).not.toMatch(/assets\/(?:main|liquid-glass)\.css/)
  })
})
