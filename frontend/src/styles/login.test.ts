import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const loginCss = readFileSync(resolve('src/styles/login.css'), 'utf8')

describe('login interaction polish', () => {
  it('restores the logo breathing glow and float with reduced-motion support', () => {
    expect(loginCss).toMatch(
      /\.login-wrapper \.login-logo-icon::before\s*\{[\s\S]*animation:\s*login-logo-glow/,
    )
    expect(loginCss).toMatch(
      /\.login-wrapper \.login-logo-icon\s*\{[\s\S]*animation:\s*login-logo-float[\s\S]*filter:\s*drop-shadow/,
    )
    expect(loginCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.login-wrapper \.login-logo-icon::before,[\s\S]*\.login-wrapper \.login-logo-icon\s*\{[\s\S]*animation:\s*none/,
    )
  })
})
