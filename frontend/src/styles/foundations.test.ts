import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('global foundations ownership', () => {
  it('does not redefine global foundation selectors in liquid glass styles', () => {
    const liquidGlassCss = readFileSync(resolve('src/assets/liquid-glass.css'), 'utf8')

    expect(liquidGlassCss).not.toMatch(/^::selection\s*\{/m)
    expect(liquidGlassCss).not.toMatch(/^::-webkit-scrollbar(?:-[a-z]+)?\s*\{/m)
    expect(liquidGlassCss).not.toMatch(/^:focus-visible\s*\{/m)
  })
})
