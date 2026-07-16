import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const readDesignSystemFile = (path: string) =>
  readFileSync(resolve('src/design-system', path), 'utf8')

const extractCustomPropertyNames = (source: string) =>
  new Set(Array.from(source.matchAll(/(--[a-z0-9-]+)\s*:/g), (match) => match[1]))

const collectCssFiles = (directory: string): string[] => {
  if (!existsSync(directory)) return []

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) return collectCssFiles(path)
    return entry.isFile() && entry.name.endsWith('.css') ? [path] : []
  })
}

const themeContract = [
  '--ods-color-bg-canvas',
  '--ods-color-bg-canvas-subtle',
  '--ods-color-bg-surface',
  '--ods-color-bg-surface-raised',
  '--ods-color-bg-surface-glass',
  '--ods-color-bg-surface-hover',
  '--ods-color-bg-surface-pressed',
  '--ods-color-fg-default',
  '--ods-color-fg-muted',
  '--ods-color-fg-subtle',
  '--ods-color-fg-disabled',
  '--ods-color-fg-inverse',
  '--ods-color-fg-brand-surface',
  '--ods-color-fg-brand-surface-muted',
  '--ods-color-fg-brand-surface-subtle',
  '--ods-color-fg-brand-surface-danger',
  '--ods-color-border-default',
  '--ods-color-border-strong',
  '--ods-color-border-focus',
  '--ods-color-border-brand-surface',
  '--ods-color-accent',
  '--ods-color-accent-hover',
  '--ods-color-accent-pressed',
  '--ods-color-accent-soft',
  '--ods-color-accent-fg',
  '--ods-color-status-success',
  '--ods-color-status-success-soft',
  '--ods-color-status-warning',
  '--ods-color-status-warning-soft',
  '--ods-color-status-danger',
  '--ods-color-status-danger-soft',
  '--ods-color-status-info',
  '--ods-color-status-info-soft',
  '--ods-color-overlay-scrim',
  '--ods-color-ambient-glow',
  '--ods-color-selection',
  '--ods-shadow-soft',
  '--ods-shadow-panel',
  '--ods-shadow-modal',
  '--ods-shadow-brand-surface',
  '--ods-gradient-glow',
  '--ods-gradient-text',
  '--ods-gradient-brand-surface',
  '--ods-material-glass-blur',
  '--ods-material-glass-saturation',
  '--ods-material-glass-brightness',
  '--ods-material-glass-contrast',
  '--ods-material-glass-specular',
  '--ods-material-glass-shadow-outer',
  '--ods-material-glass-shadow-inner',
  '--ods-material-glass-border',
  '--ods-material-glass-border-subtle',
  '--ods-data-series-planned',
  '--ods-data-series-actual',
  '--ods-data-series-actual-fill',
  '--ods-data-grid',
  '--ods-data-tooltip-bg',
  '--ods-data-tooltip-fg',
  '--ods-data-tooltip-border',
  '--ods-data-point-bg',
] as const

const forbiddenLegacyReference =
  /var\(--(?:bg-|text-|border-color|separator-color|color-(?:primary|bg|surface|text|border|accent|ambient|secondary|success|warning|danger|info|teal)|glass-|space-|spacing-|radius-|motion-|transition-|ease-|font-)/

describe('Orange Design System token contracts', () => {
  it('keeps Day Ember and Night Orbit semantically complete', () => {
    const dayTokens = extractCustomPropertyNames(
      readDesignSystemFile('tokens/themes/day-ember.css'),
    )
    const nightTokens = extractCustomPropertyNames(
      readDesignSystemFile('tokens/themes/night-orbit.css'),
    )

    expect([...dayTokens].filter((token) => token.startsWith('--ods-')).sort()).toEqual(
      [...nightTokens].filter((token) => token.startsWith('--ods-')).sort(),
    )

    for (const token of themeContract) {
      expect(dayTokens, `Day Ember is missing ${token}`).toContain(token)
      expect(nightTokens, `Night Orbit is missing ${token}`).toContain(token)
    }
  })

  it('does not let the new token layers depend on legacy aliases', () => {
    const publicTokenSources = [
      'tokens/reference.css',
      'tokens/semantic.css',
      'tokens/themes/day-ember.css',
      'tokens/themes/night-orbit.css',
    ]

    for (const path of publicTokenSources) {
      expect(readDesignSystemFile(path), `${path} contains a reverse legacy alias`).not.toMatch(
        forbiddenLegacyReference,
      )
    }
  })

  it('keeps the retired compatibility layer removed and feature CSS on ODS tokens', () => {
    expect(existsSync(resolve('src/design-system/tokens/compatibility.css'))).toBe(false)

    const featureCss = [
      ...collectCssFiles(resolve('src/styles')),
      ...collectCssFiles(resolve('src/assets')),
    ]

    for (const path of featureCss) {
      expect(readFileSync(path, 'utf8'), `${path} still consumes a legacy token`).not.toMatch(
        forbiddenLegacyReference,
      )
    }
  })

  it('defines every ODS token consumed by component styles', () => {
    const designSystemRoot = resolve('src/design-system')
    const allCss = collectCssFiles(designSystemRoot).map((path) => readFileSync(path, 'utf8'))
    const componentCss = collectCssFiles(resolve(designSystemRoot, 'components')).map((path) =>
      readFileSync(path, 'utf8'),
    )
    const definitions = extractCustomPropertyNames(allCss.join('\n'))
    const references = new Set(
      Array.from(componentCss.join('\n').matchAll(/var\((--ods-[a-z0-9-]+)/g), (match) => match[1]),
    )

    expect([...references].filter((token) => !definitions.has(token))).toEqual([])
  })
})
