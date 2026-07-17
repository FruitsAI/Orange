import { afterEach, describe, expect, it } from 'vitest'

import '@/design-system/tokens/reference.css'
import '@/design-system/tokens/semantic.css'
import '@/design-system/tokens/themes/day-ember.css'
import '@/design-system/tokens/themes/night-orbit.css'

describe('Orange Design System tokens', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme')
  })

  const tokenValue = (token: string) =>
    getComputedStyle(document.documentElement).getPropertyValue(token).trim()

  it('provides Day Ember as the safe default', () => {
    document.documentElement.removeAttribute('data-theme')

    expect(tokenValue('--ods-ref-color-warm-50')).toBe('#f7f2e9')
    expect(tokenValue('--ods-color-bg-canvas')).toBe('var(--ods-ref-color-warm-50)')
    expect(tokenValue('--ods-color-accent')).toBe('var(--ods-ref-color-ember-500)')
    expect(tokenValue('--ods-color-ambient-glow')).toBe('rgba(244, 123, 22, 0.1)')
  })

  it('provides the complete Night Orbit theme', () => {
    document.documentElement.setAttribute('data-theme', 'dark')

    expect(tokenValue('--ods-color-bg-canvas')).toBe('var(--ods-ref-color-warm-950)')
    expect(tokenValue('--ods-color-accent')).toBe('#ff9f0a')
    expect(tokenValue('--ods-color-fg-default')).toBe('#fffaf3')
    expect(tokenValue('--ods-color-ambient-glow')).toBe('rgba(255, 159, 10, 0.16)')
  })

  it('publishes semantic spacing, geometry, and motion contracts', () => {
    expect(tokenValue('--ods-space-6')).toBe('var(--ods-ref-space-6)')
    expect(tokenValue('--ods-radius-control')).toBe('var(--ods-ref-radius-10)')
    expect(tokenValue('--ods-duration-instant')).toBe('var(--ods-ref-duration-140)')
    expect(tokenValue('--ods-duration-press')).toBe('var(--ods-ref-duration-160)')
    expect(tokenValue('--ods-duration-release')).toBe('var(--ods-ref-duration-100)')
    expect(tokenValue('--ods-ref-ease-in-out')).toBe('cubic-bezier(0.77, 0, 0.175, 1)')
    expect(tokenValue('--ods-ease-in-out')).toBe('var(--ods-ref-ease-in-out)')
    expect(tokenValue('--ods-ease-standard')).toBe('var(--ods-ref-ease-standard)')
  })

  it('does not expose retired aliases', () => {
    expect(tokenValue('--color-bg')).toBe('')
    expect(tokenValue('--space-5')).toBe('')
    expect(tokenValue('--motion-instant')).toBe('')
    expect(tokenValue('--text-primary')).toBe('')
  })
})
