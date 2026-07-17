import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const loginCss = readFileSync(resolve('src/styles/login.css'), 'utf8')
const imageCss = readFileSync(resolve('src/design-system/components/image/image.css'), 'utf8')

describe('login motion contract', () => {
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

  it('bypasses the shared image fade only for the bundled login logo', () => {
    const loginLogoImageRule = loginCss.match(
      /\.login-wrapper \.login-logo-image \.ods-image__img\s*\{([^}]+)\}/,
    )?.[1]
    const sharedImageRule = imageCss.match(/\.ods-image__img\s*\{([^}]+)\}/)?.[1]

    expect(loginLogoImageRule).toContain('opacity: 1')
    expect(loginLogoImageRule).toContain('transition: none')
    expect(sharedImageRule).toContain('opacity: 0')
    expect(sharedImageRule).toContain(
      'transition: opacity var(--ods-duration-page) var(--ods-ease-standard)',
    )
  })
})
