import { describe, expect, test } from 'vitest'

import './layout.css'

const rules = Array.from(document.styleSheets).flatMap((sheet) => Array.from(sheet.cssRules))

const findStyleRule = (selector: string) =>
  rules.find(
    (rule): rule is CSSStyleRule => rule instanceof CSSStyleRule && rule.selectorText === selector,
  )

describe('topbar window interaction boundaries', () => {
  test('separates the macOS top safety inset from the inline shell inset', () => {
    const rootRule = findStyleRule(':root')
    const dragRegionRule = findStyleRule('.app-titlebar-drag-region')
    const topbarRule = findStyleRule('.app-topbar')
    const contentRule = findStyleRule('.app-view-content')

    expect(rootRule?.style.getPropertyValue('--app-topbar-top-inset')).toBe('52px')
    expect(rootRule?.style.getPropertyValue('--app-topbar-inset')).toBe('14px')
    expect(dragRegionRule?.style.position).toBe('fixed')
    expect(dragRegionRule?.style.top).toBe('0px')
    expect(dragRegionRule?.style.left).toBe('0px')
    expect(dragRegionRule?.style.right).toBe('0px')
    expect(dragRegionRule?.style.height).toBe('var(--app-topbar-top-inset)')
    expect(dragRegionRule?.style.getPropertyValue('--wails-draggable')).toBe('drag')
    expect(Number(dragRegionRule?.style.zIndex)).toBeLessThan(Number(topbarRule?.style.zIndex))
    expect(topbarRule?.style.top).toBe('var(--app-topbar-top-inset)')
    expect(topbarRule?.style.left).toBe('var(--app-topbar-inset)')
    expect(topbarRule?.style.right).toBe('var(--app-topbar-inset)')
    expect(contentRule?.style.padding).toContain('var(--app-topbar-top-inset)')
  })

  test('keeps the scrolled topbar stationary', () => {
    const scrolledRule = rules.find(
      (rule): rule is CSSStyleRule =>
        rule instanceof CSSStyleRule &&
        rule.selectorText.startsWith('.app-topbar[data-scrolled=') &&
        rule.selectorText.includes('true'),
    )

    expect(scrolledRule?.style.transform).toBe('')
  })

  test('marks portal content and full-window overlays as non-draggable', () => {
    expect(findStyleRule('.app-topbar-portal')?.style.getPropertyValue('--wails-draggable')).toBe(
      'no-drag',
    )
    expect(findStyleRule('.app-topbar__overlay')?.style.getPropertyValue('--wails-draggable')).toBe(
      'no-drag',
    )
  })

  test('keeps the theme selector portal above the overlay and inside compact windows', () => {
    const menuRule = findStyleRule('.theme-selector__menu')

    expect(menuRule?.style.position).toBe('fixed')
    expect(Number(menuRule?.style.zIndex)).toBeGreaterThan(999)
    expect(menuRule?.style.maxWidth).toContain('100vw')
    expect(menuRule?.style.getPropertyValue('--wails-draggable')).toBe('no-drag')
    expect(findStyleRule('.theme-selector__label')?.style.justifySelf).toBe('start')
    expect(findStyleRule('.theme-selector__check')?.style.justifySelf).toBe('end')
    expect(findStyleRule('.theme-selector__option > :last-child')).toBeUndefined()
  })

  test('uses one tokenized warm ambient light for the shell', () => {
    expect(findStyleRule('.app-background')?.style.background).toContain('var(--color-bg)')
    expect(findStyleRule('.app-background::before')?.style.background).toContain(
      'var(--color-ambient-glow)',
    )
    expect(findStyleRule('.app-background::after')?.style.content).toBe('none')
  })
})
