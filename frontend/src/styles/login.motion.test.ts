import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const loginCss = readFileSync(resolve('src/styles/login.css'), 'utf8')

describe('login motion contract', () => {
  it('uses symmetric translation-only motion for all four ambient shapes', () => {
    const driftAnimations = Array.from(
      loginCss.matchAll(/animation:\s*login-drift-[ab][^;]+;/g),
      (match) => match[0],
    )
    const driftA = loginCss.match(/@keyframes login-drift-a\s*\{([\s\S]*?)\n\}/)?.[1]
    const driftB = loginCss.match(/@keyframes login-drift-b\s*\{([\s\S]*?)\n\}/)?.[1]

    expect(driftAnimations).toEqual([
      'animation: login-drift-a 22s var(--ods-ease-in-out) infinite alternate;',
      'animation: login-drift-b 18s var(--ods-ease-in-out) infinite alternate;',
      'animation: login-drift-a 20s var(--ods-ease-in-out) -6s infinite alternate-reverse;',
      'animation: login-drift-b 16s var(--ods-ease-in-out) -4s infinite alternate-reverse;',
    ])
    expect(driftA).toContain('transform: translate3d(2rem, 1.25rem, 0)')
    expect(driftB).toContain('transform: translate3d(-1.5rem, 2rem, 0)')
    expect(driftA).not.toContain('rotate(')
    expect(driftB).not.toContain('rotate(')
  })

  it('uses one page-duration entrance clock for the login surface', () => {
    const loginContainerRule = loginCss.match(
      /\.login-wrapper \.login-container\s*\{([^}]+)\}/,
    )?.[1]
    const motionBeforeReducedMedia = loginCss.split('@media (prefers-reduced-motion: reduce)')[0]

    expect(loginContainerRule).toContain(
      'animation: login-content-in var(--ods-duration-page) var(--ods-ease-emphasized) both',
    )
    expect(loginCss).not.toContain('login-form-in')
    expect(motionBeforeReducedMedia).not.toMatch(/\.login-wrapper \.form-panel\s*\{[^}]*animation:/)
  })

  it('does not reach into private ODS anatomy to control the bundled logo', () => {
    expect(loginCss).not.toMatch(/\.ods-[\w-]+__[\w-]+/)
  })
})
