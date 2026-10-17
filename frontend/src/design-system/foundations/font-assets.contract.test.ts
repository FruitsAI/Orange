import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const fontPath = resolve('public/fonts/misans/MiSansVF.ttf')
const licensePath = resolve('public/fonts/misans/LICENSE-MiSans.pdf')
const noticePath = resolve('public/THIRD_PARTY_NOTICES.txt')
const thirdPartyNotice = readFileSync(noticePath, 'utf8')
const mainEntry = readFileSync(resolve('src/main.tsx'), 'utf8')
const referenceTokens = readFileSync(resolve('src/design-system/tokens/reference.css'), 'utf8')
const typography = readFileSync(resolve('src/design-system/foundations/typography.css'), 'utf8')

describe('MiSans local font asset contract', () => {
  it('keeps the official font and license as non-placeholder local assets', () => {
    expect(existsSync(fontPath)).toBe(true)
    expect(existsSync(licensePath)).toBe(true)
    expect(existsSync(noticePath)).toBe(true)
    expect(statSync(fontPath).size).toBeGreaterThan(10 * 1024 * 1024)
    expect(statSync(licensePath).size).toBeGreaterThan(50 * 1024)
    expect(thirdPartyNotice).toContain('This software uses the official MiSans variable font')
    expect(thirdPartyNotice).toContain('fonts/misans/LICENSE-MiSans.pdf')
    expect(thirdPartyNotice).toContain('https://hyperos.mi.com/font/en/download')
  })

  it('retires Inter and makes MiSans VF the design-system family', () => {
    expect(mainEntry).not.toMatch(/@fontsource\/inter/i)
    expect(referenceTokens).toMatch(/--ods-ref-font-family-(?:display|body):\s*['"]MiSans VF['"]/)
  })

  it('loads typography only from the bundled MiSans asset', () => {
    const fontFaceBlocks = Array.from(
      typography.matchAll(/@font-face\s*{(?<body>[^}]*)}/gs),
      (match) => match.groups?.body ?? '',
    )

    expect(fontFaceBlocks).toHaveLength(1)
    expect(fontFaceBlocks[0]).toMatch(/font-family:\s*['"]MiSans VF['"]/)
    expect(fontFaceBlocks[0]).toMatch(/url\(['"]?\/fonts\/misans\/MiSansVF\.ttf['"]?\)/)
    expect(fontFaceBlocks[0]).not.toMatch(/https?:\/\//i)
  })
})
