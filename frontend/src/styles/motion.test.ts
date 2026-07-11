import { describe, expect, it } from 'vitest'

import './motion.css'

describe('reduced motion foundations', () => {
  it('compresses legacy animations and limits them to one iteration', () => {
    const reducedMotionRule = Array.from(document.styleSheets)
      .flatMap((sheet) => Array.from(sheet.cssRules))
      .find(
        (rule): rule is CSSMediaRule =>
          rule instanceof CSSMediaRule && rule.conditionText === '(prefers-reduced-motion: reduce)',
      )

    expect(reducedMotionRule?.cssText).toContain('animation-duration: 1ms')
    expect(reducedMotionRule?.cssText).toContain('animation-iteration-count: 1')
  })
})
