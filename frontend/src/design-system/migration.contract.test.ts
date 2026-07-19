import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const SOURCE_ROOT = 'src'
const NATIVE_PRIMITIVE_TAGS = new Set([
  'a',
  'button',
  'dialog',
  'img',
  'input',
  'progress',
  'select',
  'table',
  'textarea',
])
const DIRECT_ROUTER_PRIMITIVES = new Set(['Link', 'NavLink'])
const DIRECT_OVERLAY_PRIMITIVES = new Set(['createPortal'])
const NATIVE_DIALOG_APIS = new Set(['alert', 'confirm', 'prompt'])
const INTERACTIVE_CONTAINER_TAGS = new Set(['article', 'div', 'li', 'section', 'span', 'tr'])
const REMOVED_LEGACY_COMPONENTS = [
  'src/components/common/ConfirmModal.tsx',
  'src/components/common/DatePicker.tsx',
  'src/components/common/EmptyState.tsx',
  'src/components/common/GlassCard.tsx',
  'src/components/common/PanelHeader.tsx',
  'src/components/common/StatusBadge.tsx',
  'src/components/common/ToastContainer.tsx',
]

// Presentation contracts formerly owned by the pre-ODS stylesheets. Production consumers must
// use an Orange Design System component or pattern instead of reintroducing these selectors.
const LEGACY_CLASS_TOKEN_PATTERNS = [
  /^btn(?:$|-)/,
  /^(?:form-(?:actions|field(?:-wide)?|grid|group(?:-full)?|input|label|select|textarea)|input-(?:group|label|wrapper)|select-arrow|search-input(?:-icon|-wrapper)?|date-input)$/,
  /^modal(?:$|-)/,
  /^confirm-(?:actions|btn|message|modal|overlay|title)$/,
  /^(?:glass-card(?:$|--)|glass-panel|liquid-glass(?:$|--))/,
  /^panel-header$/,
  /^status-badge(?:$|--|__)/,
  /^(?:data-table|progress-bar(?:$|-))/,
  /^(?:pagination-(?:controls|info|inner|left)|page-(?:btn|number|numbers|select|size|size-selector))$/,
  /^(?:dropdown-item|dropdown-menu(?:-fixed)?)$/,
  /^date-picker-wrapper$/,
  /^toast(?:$|-)/,
]

type DebtKind =
  | `direct-overlay:${string}`
  | `direct-router:${string}`
  | `interactive-container:${string}`
  | `legacy:${string}`
  | `native-api:${string}`
  | `native:${string}`
  | `private-ods-import:${string}`
type DebtCounts = Partial<Record<DebtKind, number>>

// The migration is complete. Keep this baseline empty: adding an exception would silently create
// a second implementation path and undermine the shared component contract.
const MIGRATION_DEBT_ALLOWLIST: Record<string, DebtCounts> = {}

interface DebtInventory {
  counts: Record<string, DebtCounts>
  lines: Record<string, Partial<Record<DebtKind, number[]>>>
}

function isProductionTsx(path: string) {
  return (
    path.endsWith('.tsx') &&
    !path.endsWith('.test.tsx') &&
    !path.endsWith('.spec.tsx') &&
    !path.startsWith(`${SOURCE_ROOT}/design-system/`) &&
    !path.startsWith(`${SOURCE_ROOT}/test/`)
  )
}

function collectProductionTsxFiles(directory = SOURCE_ROOT): string[] {
  return readdirSync(resolve(directory), { withFileTypes: true })
    .flatMap((entry) => {
      const path = `${directory}/${entry.name}`
      if (entry.isDirectory()) return collectProductionTsxFiles(path)
      return isProductionTsx(path) ? [path] : []
    })
    .sort()
}

function isLegacyClassToken(token: string) {
  return LEGACY_CLASS_TOKEN_PATTERNS.some((pattern) => pattern.test(token))
}

function staticTokens(node: ts.Node) {
  if (ts.isStringLiteralLike(node)) return node.text.split(/\s+/).filter(Boolean)
  if (
    node.kind === ts.SyntaxKind.TemplateHead ||
    node.kind === ts.SyntaxKind.TemplateMiddle ||
    node.kind === ts.SyntaxKind.TemplateTail
  ) {
    return (node as ts.TemplateLiteralLikeNode).text.split(/\s+/).filter(Boolean)
  }
  return []
}

function collectMigrationDebt(): DebtInventory {
  const inventory: DebtInventory = { counts: {}, lines: {} }

  const addDebt = (file: string, kind: DebtKind, line: number) => {
    const fileCounts = (inventory.counts[file] ??= {})
    fileCounts[kind] = (fileCounts[kind] ?? 0) + 1
    const fileLines = (inventory.lines[file] ??= {})
    ;(fileLines[kind] ??= []).push(line)
  }

  for (const file of collectProductionTsxFiles()) {
    const source = readFileSync(resolve(file), 'utf8')
    const sourceFile = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )

    const visit = (node: ts.Node) => {
      const nodeLine = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
      for (const token of staticTokens(node)) {
        if (isLegacyClassToken(token)) addDebt(file, `legacy:${token}`, nodeLine)
      }

      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        if (node.moduleSpecifier.text.startsWith('@/design-system/')) {
          addDebt(file, `private-ods-import:${node.moduleSpecifier.text}`, nodeLine)
        }

        if (node.moduleSpecifier.text === 'react-dom') {
          const bindings = node.importClause?.namedBindings
          if (bindings && ts.isNamedImports(bindings)) {
            for (const element of bindings.elements) {
              const importedName = element.propertyName?.text ?? element.name.text
              if (DIRECT_OVERLAY_PRIMITIVES.has(importedName)) {
                addDebt(file, `direct-overlay:${importedName}`, nodeLine)
              }
            }
          }
        }

        if (node.moduleSpecifier.text === 'react-router-dom') {
          const bindings = node.importClause?.namedBindings
          if (bindings && ts.isNamedImports(bindings)) {
            for (const element of bindings.elements) {
              const importedName = element.propertyName?.text ?? element.name.text
              if (DIRECT_ROUTER_PRIMITIVES.has(importedName)) {
                addDebt(file, `direct-router:${importedName}`, nodeLine)
              }
            }
          }
        }
      }

      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.expression.getText(sourceFile) === 'window' &&
        NATIVE_DIALOG_APIS.has(node.expression.name.text)
      ) {
        addDebt(file, `native-api:${node.expression.name.text}`, nodeLine)
      }

      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tagName = node.tagName.getText(sourceFile)
        if (NATIVE_PRIMITIVE_TAGS.has(tagName)) addDebt(file, `native:${tagName}`, nodeLine)

        if (INTERACTIVE_CONTAINER_TAGS.has(tagName)) {
          const hasControlHandler = node.attributes.properties.some(
            (attribute) =>
              ts.isJsxAttribute(attribute) &&
              (attribute.name.getText(sourceFile) === 'onClick' ||
                attribute.name.getText(sourceFile) === 'onKeyDown'),
          )
          if (hasControlHandler) addDebt(file, `interactive-container:${tagName}`, nodeLine)
        }
      }
      ts.forEachChild(node, visit)
    }

    visit(sourceFile)
  }

  return inventory
}

function formatInventory(counts: Record<string, DebtCounts>) {
  const sorted = Object.fromEntries(
    Object.entries(counts)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([file, fileCounts]) => [
        file,
        Object.fromEntries(
          Object.entries(fileCounts).sort(([left], [right]) => left.localeCompare(right)),
        ),
      ]),
  )
  return JSON.stringify(sorted, null, 2)
}

function migrationDebtDiff(actual: DebtInventory) {
  const increased: string[] = []
  const reduced: string[] = []
  const files = new Set([...Object.keys(MIGRATION_DEBT_ALLOWLIST), ...Object.keys(actual.counts)])

  for (const file of [...files].sort()) {
    const expectedKinds = MIGRATION_DEBT_ALLOWLIST[file] ?? {}
    const actualKinds = actual.counts[file] ?? {}
    const kinds = new Set([
      ...Object.keys(expectedKinds),
      ...Object.keys(actualKinds),
    ] as DebtKind[])

    for (const kind of [...kinds].sort()) {
      const expectedCount = expectedKinds[kind] ?? 0
      const actualCount = actualKinds[kind] ?? 0
      if (actualCount > expectedCount) {
        const lines = actual.lines[file]?.[kind]?.join(', ') ?? 'unknown'
        increased.push(`+ ${file} ${kind}: ${expectedCount} -> ${actualCount} (lines ${lines})`)
      } else if (actualCount < expectedCount) {
        reduced.push(`- ${file} ${kind}: ${expectedCount} -> ${actualCount}`)
      }
    }
  }

  if (increased.length === 0 && reduced.length === 0) return ''

  return [
    increased.length > 0
      ? `New/increased migration debt (use ODS; do not add an exception):\n${increased.join('\n')}`
      : '',
    reduced.length > 0
      ? `Reduced migration debt (remove obsolete baseline entries):\n${reduced.join('\n')}`
      : '',
    `Current exact inventory:\n${formatInventory(actual.counts)}`,
  ]
    .filter(Boolean)
    .join('\n\n')
}

describe('Orange Design System production migration contract', () => {
  it('keeps production on the zero-debt ODS baseline', () => {
    const actual = collectMigrationDebt()
    const diff = migrationDebtDiff(actual)

    expect(diff, diff).toBe('')
  })

  it('does not recreate component paths superseded by Orange Design System', () => {
    const recreated = REMOVED_LEGACY_COMPONENTS.filter((path) => existsSync(resolve(path)))

    expect(recreated, `Recreated legacy components:\n${recreated.join('\n')}`).toEqual([])
  })
})
