import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import './tokens.css'

describe('Ember Orbit design tokens', () => {
  beforeAll(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
  })

  afterAll(() => {
    document.documentElement.removeAttribute('data-theme')
  })

  it.each(['--color-bg', '--color-surface', '--color-accent', '--radius-panel', '--motion-fast'])(
    'defines the %s root token',
    (token) => {
      expect(getComputedStyle(document.documentElement).getPropertyValue(token).trim()).not.toBe('')
    },
  )
})
