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

  it('documents the completed legacy-token retirement', () => {
    const tokens = readDoc('tokens.md')
    const migration = readDoc('migration.md')

    expect(tokens).toContain('兼容层已移除')
    expect(tokens).toContain('只允许消费 `--ods-*`')
    expect(migration).toContain('compatibility aliases 已删除')
    expect(migration).toContain('`rg` 无生产 TSX/class/token 引用')
  })

  it('documents the completed all-route zero-debt migration boundary', () => {
    const overview = readDoc('README.md')
    const migration = readDoc('migration.md')

    expect(overview).toContain('全路由')
    expect(overview).toContain('已接入 `frontend/src/main.tsx`')
    expect(migration).toContain('零债务基线')
    expect(migration).toContain('页面不得自行实现')
  })
})
