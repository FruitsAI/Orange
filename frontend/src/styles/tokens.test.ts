import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import './tokens.css'

describe('Ember Orbit design tokens', () => {
  beforeAll(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
  })

  afterAll(() => {
    document.documentElement.removeAttribute('data-theme')
  })

  it.each(['--color-bg', '--color-surface', '--color-accent'])(
    'defines the %s root token',
    (token) => {
      expect(getComputedStyle(document.documentElement).getPropertyValue(token).trim()).not.toBe('')
    },
  )

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
    expect(getComputedStyle(document.documentElement).getPropertyValue(token).trim()).toBe(value)
  })
})
