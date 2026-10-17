import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('global foundations ownership', () => {
  it('keeps superseded global foundation bundles removed', () => {
    expect(existsSync(resolve('src/assets/liquid-glass.css'))).toBe(false)
    expect(existsSync(resolve('src/styles/foundations.css'))).toBe(false)
    expect(existsSync(resolve('src/styles/tokens.css'))).toBe(false)
  })
})
