import { afterEach, describe, expect, it } from 'vitest'

import './tokens.css'

describe('Ember Orbit design tokens', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme')
  })

  const tokenValue = (token: string) =>
    getComputedStyle(document.documentElement).getPropertyValue(token).trim()

  it('provides a safe Day Ember theme before data-theme is set', () => {
    document.documentElement.removeAttribute('data-theme')

    expect(tokenValue('--color-bg')).toBe('#f7f2e9')
    expect(tokenValue('--color-surface')).toBe('#fffdf9')
    expect(tokenValue('--color-accent')).toBe('#f47b16')
    expect(tokenValue('--color-text')).toBe('#241b15')
  })

  it('provides representative Night Orbit tokens', () => {
    document.documentElement.setAttribute('data-theme', 'dark')

    expect(tokenValue('--color-bg')).toBe('#080706')
    expect(tokenValue('--color-surface')).toBe('#151210')
    expect(tokenValue('--color-accent')).toBe('#ff9f0a')
    expect(tokenValue('--color-text')).toBe('#fffaf3')
  })

  it('provides representative Day Ember tokens', () => {
    document.documentElement.setAttribute('data-theme', 'light')

    expect(tokenValue('--color-bg')).toBe('#f7f2e9')
    expect(tokenValue('--color-surface')).toBe('#fffdf9')
    expect(tokenValue('--color-accent')).toBe('#f47b16')
    expect(tokenValue('--color-text')).toBe('#241b15')
  })

  it.each([
    ['--space-5', '24px'],
    ['--space-6', '32px'],
    ['--radius-control', '10px'],
    ['--radius-panel', '16px'],
    ['--radius-shell', '20px'],
    ['--motion-instant', '140ms'],
    ['--motion-fast', '200ms'],
    ['--motion-page', '280ms'],
    ['--motion-hero', '440ms'],
    ['--ease-standard', 'cubic-bezier(.2,0,0,1)'],
    ['--ease-emphasized', 'cubic-bezier(.2,.8,.2,1)'],
  ])('defines the %s public contract as %s', (token, value) => {
    expect(tokenValue(token)).toBe(value)
  })

  it('keeps formal spacing steps distinct', () => {
    expect(tokenValue('--space-8')).toBe('40px')
    expect(tokenValue('--space-10')).toBe('48px')
  })

  it.each([
    ['--spacing-xs', '6px'],
    ['--spacing-md', '20px'],
    ['--spacing-lg', '32px'],
    ['--radius-sm', '12px'],
    ['--radius-md', '18px'],
    ['--radius-lg', '24px'],
    ['--radius-xl', '32px'],
    ['--transition-fast', '0.25s cubic-bezier(.2,0,0,1)'],
  ])('preserves the legacy %s value as %s', (token, value) => {
    expect(tokenValue(token)).toBe(value)
  })
})
