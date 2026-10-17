import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const referenceTokens = readFileSync(resolve('src/design-system/tokens/reference.css'), 'utf8')
const semanticTokens = readFileSync(resolve('src/design-system/tokens/semantic.css'), 'utf8')

describe('Orange Design System typography scale', () => {
  it.each([
    ['xs', '12'],
    ['sm', '14'],
    ['md', '16'],
    ['lg', '18'],
    ['xl', '20'],
    ['2xl', '24'],
    ['3xl', '32'],
    ['4xl', '40'],
    ['display', '56'],
  ])('maps %s text to the %spx reference token', (semanticName, referenceSize) => {
    expect(semanticTokens).toContain(
      `--ods-font-size-${semanticName}: var(--ods-ref-font-size-${referenceSize});`,
    )
  })

  it('uses readable line heights and neutral tracking for mixed Chinese and Latin text', () => {
    expect(referenceTokens).toContain('--ods-ref-line-height-tight: 1.15;')
    expect(referenceTokens).toContain('--ods-ref-line-height-heading: 1.3;')
    expect(referenceTokens).toContain('--ods-ref-line-height-body: 1.5;')
    expect(referenceTokens).toContain('--ods-ref-line-height-relaxed: 1.7;')

    for (const token of ['tight', 'body', 'wide']) {
      expect(referenceTokens).toContain(`--ods-ref-letter-spacing-${token}: 0;`)
    }
  })
})
