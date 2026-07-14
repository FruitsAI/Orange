import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const documentationRoot = resolve('../docs/design-system')
const readDoc = (name: string) => readFileSync(resolve(documentationRoot, name), 'utf8')

describe('Orange Design System documentation', () => {
  it.each(['README.md', 'tokens.md', 'components.md', 'accessibility.md', 'migration.md'])(
    'ships %s',
    (name) => {
      expect(existsSync(resolve(documentationRoot, name))).toBe(true)
    },
  )

  it('states the HeroUI reference boundary and phased component scope', () => {
    const overview = readDoc('README.md')
    const components = readDoc('components.md')

    expect(overview).toContain('不安装 HeroUI')
    expect(overview).toContain('不复刻全部组件目录')
    expect(components).toContain('## Phase 1')
    expect(components).toContain('## Phase 2 backlog')
  })

  it('keeps compatibility aliases temporary and one-way', () => {
    const tokens = readDoc('tokens.md')
    const migration = readDoc('migration.md')

    expect(tokens).toContain('旧变量到 ODS 的单向映射')
    expect(tokens).toContain('--ods-color-accent: var(--color-primary)')
    expect(migration).toContain('compatibility aliases')
    expect(migration).toContain('`rg` 无生产 TSX/class/token 引用')
  })
})
