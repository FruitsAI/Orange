import { describe, expect, it } from 'vitest'

import './motion.css'

describe('reduced motion foundations', () => {
  const reducedMotionRule = Array.from(document.styleSheets)
    .flatMap((sheet) => Array.from(sheet.cssRules))
    .find(
      (rule): rule is CSSMediaRule =>
        rule instanceof CSSMediaRule && rule.conditionText === '(prefers-reduced-motion: reduce)',
    )

  it('compresses legacy animations and limits them to one iteration', () => {
    expect(reducedMotionRule?.cssText).toContain('animation-duration: 1ms')
    expect(reducedMotionRule?.cssText).toContain('animation-iteration-count: 1')
  })

  it('hides legacy shine and freezes the pointer glow', () => {
    const rules = Array.from(reducedMotionRule?.cssRules ?? [])
    const shineRule = rules.find(
      (rule): rule is CSSStyleRule =>
        rule instanceof CSSStyleRule && rule.selectorText.includes('.liquid-glass--shine::after'),
    )
    const backgroundRule = rules.find(
      (rule): rule is CSSStyleRule =>
        rule instanceof CSSStyleRule && rule.selectorText === '.app-background',
    )

    expect(shineRule?.style.animation).toBe('none')
    expect(shineRule?.style.getPropertyPriority('animation')).toBe('important')
    expect(shineRule?.style.opacity).toBe('0')
    expect(shineRule?.style.getPropertyPriority('opacity')).toBe('important')
    expect(backgroundRule?.style.getPropertyValue('--light-x')).toBe('50%')
    expect(backgroundRule?.style.getPropertyPriority('--light-x')).toBe('important')
    expect(backgroundRule?.style.getPropertyValue('--light-y')).toBe('50%')
    expect(backgroundRule?.style.getPropertyPriority('--light-y')).toBe('important')
  })
})
