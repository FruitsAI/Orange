import { describe, expect, test } from 'vitest'

import './layout.css'

const rules = Array.from(document.styleSheets).flatMap((sheet) => Array.from(sheet.cssRules))

const findStyleRule = (selector: string) =>
  rules.find(
    (rule): rule is CSSStyleRule => rule instanceof CSSStyleRule && rule.selectorText === selector,
  )

describe('topbar window interaction boundaries', () => {
  test('keeps a compact draggable topbar clear of the macOS window controls', () => {
    const rootRule = findStyleRule(':root')
    const dragRegionRule = findStyleRule('.app-titlebar-drag-region')
    const topbarRule = findStyleRule('.app-topbar')
    const contentRule = findStyleRule('.app-view-content')

    expect(rootRule?.style.getPropertyValue('--app-topbar-top-inset')).toBe('12px')
    expect(rootRule?.style.getPropertyValue('--app-topbar-inset')).toBe('76px')
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
    expect(topbarRule?.style.getPropertyValue('--wails-draggable')).toBe('drag')
    expect(contentRule?.style.padding).toContain('var(--app-topbar-top-inset)')
  })

  test('keeps the scrolled topbar stationary', () => {
    const scrolledRule = rules.find(
      (rule): rule is CSSStyleRule =>
        rule instanceof CSSStyleRule &&
        rule.selectorText.startsWith('.app-topbar[data-scrolled=') &&
        rule.selectorText.includes('true'),
    )

    expect(scrolledRule).toBeUndefined()
  })

  test('marks portal content as non-draggable without a bespoke full-window overlay', () => {
    expect(findStyleRule('.app-topbar-portal')?.style.getPropertyValue('--wails-draggable')).toBe(
      'no-drag',
    )
    expect(findStyleRule('.app-topbar__overlay')).toBeUndefined()
  })

  test('keeps the ODS theme popover non-draggable and compact-window safe', () => {
    const popoverRule = findStyleRule('.theme-selector__popover')

    expect(popoverRule?.style.width).toBe('196px')
    expect(popoverRule?.style.maxWidth).toContain('100vw')
    expect(popoverRule?.style.getPropertyValue('--wails-draggable')).toBe('no-drag')
    expect(findStyleRule('.theme-selector__menu')).toBeUndefined()
    expect(findStyleRule('.theme-selector__option')).toBeUndefined()
  })

  test('does not recreate button visuals with shell-level native element selectors', () => {
    const visualProperties = [
      'background',
      'border',
      'box-shadow',
      'color',
      'cursor',
      'font-size',
      'padding',
      'width',
    ]
    const bespokeButtonRules = rules.filter(
      (rule): rule is CSSStyleRule =>
        rule instanceof CSSStyleRule &&
        rule.selectorText.startsWith('.app-topbar') &&
        /(?:^|\s|>)button(?:$|\s|:|\.)/.test(rule.selectorText) &&
        visualProperties.some((property) => rule.style.getPropertyValue(property) !== ''),
    )

    expect(bespokeButtonRules.map((rule) => rule.selectorText)).toEqual([])
  })

  test('uses one tokenized warm ambient light for the shell', () => {
    expect(findStyleRule('.app-background')?.style.background).toContain(
      'var(--ods-color-bg-canvas)',
    )
    expect(findStyleRule('.app-background::before')?.style.background).toContain(
      'var(--ods-color-ambient-glow)',
    )
    expect(findStyleRule('.app-background::after')?.style.content).toBe('none')
  })
})
