import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const SOURCE_ROOT = 'src'
const NATIVE_CONTROL_TAGS = new Set(['button', 'input', 'select', 'textarea', 'table'])

// These selectors are presentation contracts owned by the pre-ODS stylesheets. A production
// consumer must move to the matching ODS component before its entry can be removed below.
const LEGACY_CLASS_TOKEN_PATTERNS = [
  /^btn(?:$|-)/,
  /^(?:form-(?:actions|field(?:-wide)?|grid|group(?:-full)?|input|label|select|textarea)|input-(?:group|label|wrapper)|select-arrow|search-input(?:-icon|-wrapper)?|date-input)$/,
  /^modal(?:$|-)/,
  /^confirm-(?:actions|btn|message|modal|overlay|title)$/,
  /^(?:glass-card(?:$|--)|glass-panel|liquid-glass(?:$|--))/,
  /^status-badge(?:$|--|__)/,
  /^(?:data-table|progress-bar(?:$|-))/,
  /^(?:pagination-(?:controls|info|inner|left)|page-(?:btn|number|numbers|select|size|size-selector))$/,
  /^(?:dropdown-item|dropdown-menu(?:-fixed)?)$/,
  /^date-picker-wrapper$/,
  /^toast(?:$|-)/,
]

type DebtKind = `native:${string}` | `legacy:${string}`
type DebtCounts = Partial<Record<DebtKind, number>>

// This is an exact, decrement-only inventory. After migrating a batch, lower/remove only the
// entries reported as reduced debt. Never raise a value to make newly introduced debt pass.
const MIGRATION_DEBT_ALLOWLIST: Record<string, DebtCounts> = {
  'src/components/common/ConfirmModal.tsx': {
    'legacy:confirm-actions': 1,
    'legacy:confirm-message': 1,
    'legacy:confirm-modal': 1,
    'legacy:confirm-overlay': 1,
    'legacy:confirm-title': 1,
  },
  'src/components/common/DatePicker.tsx': {
    'legacy:date-picker-wrapper': 1,
    'native:input': 1,
  },
  'src/components/common/GlassCard.tsx': {
    'legacy:glass-card': 1,
    'legacy:glass-card--flat': 1,
    'legacy:glass-card--hover': 1,
  },
  'src/components/common/StatusBadge.tsx': {
    'legacy:status-badge': 1,
    'legacy:status-badge__icon': 1,
    'legacy:status-badge--active': 1,
    'legacy:status-badge--archived': 1,
    'legacy:status-badge--completed': 3,
    'legacy:status-badge--notstarted': 2,
    'legacy:status-badge--overdue': 1,
    'legacy:status-badge--pending': 1,
  },
  'src/components/common/ThemeSelector.tsx': {
    'native:button': 3,
  },
  'src/components/common/ToastContainer.tsx': {
    'legacy:toast-container': 1,
    'legacy:toast-item': 1,
    'native:button': 1,
  },
  'src/components/dashboard/ActionQueue.tsx': {
    'legacy:btn': 2,
    'legacy:btn-ghost': 2,
    'legacy:btn-sm': 2,
  },
  'src/components/dashboard/IncomeChart.tsx': {
    'legacy:btn': 1,
    'legacy:btn-ghost': 1,
    'legacy:btn-secondary': 1,
    'legacy:btn-sm': 1,
    'native:button': 1,
    'native:table': 1,
  },
  'src/components/dashboard/ProjectList.tsx': {
    'legacy:btn': 2,
    'legacy:btn-ghost': 1,
    'legacy:btn-secondary': 1,
    'legacy:btn-sm': 2,
  },
  'src/components/layout/AppTopbar.tsx': {
    'native:button': 9,
  },
  'src/components/notification/NotificationDetailModal.tsx': {
    'legacy:modal': 1,
    'legacy:modal-body': 1,
    'legacy:modal-close': 1,
    'legacy:modal-header': 1,
    'legacy:modal-overlay': 1,
    'legacy:modal-title': 1,
    'native:button': 1,
  },
  'src/components/settings/DataSyncPanel.tsx': {
    'native:button': 5,
    'native:input': 5,
    'native:select': 1,
  },
  'src/components/settings/DictionaryManagement.tsx': {
    'legacy:btn': 2,
    'legacy:btn-primary': 1,
    'legacy:btn-secondary': 1,
    'legacy:form-group': 3,
    'legacy:form-input': 3,
    'legacy:form-label': 3,
    'legacy:modal': 1,
    'legacy:modal-body': 1,
    'legacy:modal-close': 1,
    'legacy:modal-footer': 1,
    'legacy:modal-header': 1,
    'legacy:modal-overlay': 1,
    'legacy:modal-title': 1,
    'native:button': 6,
    'native:input': 3,
  },
  'src/components/settings/NotificationManagement.tsx': {
    'legacy:btn': 2,
    'legacy:btn-primary': 1,
    'legacy:btn-secondary': 1,
    'legacy:form-group': 4,
    'legacy:form-input': 2,
    'legacy:form-label': 4,
    'legacy:form-select': 2,
    'legacy:input-wrapper': 2,
    'legacy:modal': 1,
    'legacy:modal-body': 1,
    'legacy:modal-close': 1,
    'legacy:modal-footer': 1,
    'legacy:modal-header': 1,
    'legacy:modal-overlay': 1,
    'legacy:modal-title': 1,
    'legacy:page-btn': 2,
    'legacy:page-number': 1,
    'legacy:page-numbers': 1,
    'legacy:page-select': 1,
    'legacy:page-size': 1,
    'legacy:pagination-controls': 1,
    'legacy:pagination-info': 1,
    'legacy:pagination-inner': 1,
    'legacy:select-arrow': 2,
    'native:button': 9,
    'native:input': 1,
    'native:select': 3,
    'native:textarea': 1,
  },
  'src/components/settings/TokenManagement.tsx': {
    'native:button': 11,
    'native:input': 1,
  },
  'src/components/settings/UserManagement.tsx': {
    'legacy:btn': 4,
    'legacy:btn-ghost': 2,
    'legacy:btn-primary': 2,
    'legacy:form-group': 10,
    'legacy:form-input': 8,
    'legacy:form-label': 10,
    'legacy:form-select': 2,
    'legacy:input-wrapper': 2,
    'legacy:modal': 2,
    'legacy:modal-body': 2,
    'legacy:modal-close': 2,
    'legacy:modal-footer': 2,
    'legacy:modal-header': 2,
    'legacy:modal-overlay': 2,
    'legacy:modal-title': 2,
    'legacy:page-btn': 2,
    'legacy:page-number': 1,
    'legacy:page-numbers': 1,
    'legacy:page-select': 1,
    'legacy:page-size': 1,
    'legacy:pagination-controls': 1,
    'legacy:pagination-info': 1,
    'legacy:pagination-inner': 1,
    'legacy:search-input': 1,
    'legacy:search-input-wrapper': 1,
    'legacy:select-arrow': 2,
    'native:button': 13,
    'native:input': 9,
    'native:select': 3,
  },
  'src/views/AnalyticsView.tsx': {
    'legacy:btn': 2,
    'legacy:btn-ghost': 1,
    'legacy:btn-secondary': 2,
    'legacy:btn-sm': 1,
    'legacy:btn-text': 1,
    'native:button': 2,
  },
  'src/views/CalendarView.tsx': {
    'legacy:btn': 5,
    'legacy:btn-ghost': 4,
    'legacy:btn-icon': 2,
    'legacy:btn-secondary': 1,
    'legacy:btn-sm': 3,
    'native:button': 6,
  },
  'src/views/dashboard/DashboardError.tsx': {
    'legacy:btn': 1,
    'legacy:btn-secondary': 1,
    'legacy:btn-sm': 1,
    'legacy:glass-card': 1,
    'native:button': 1,
  },
  'src/views/PaymentCreateView.tsx': {
    'legacy:btn': 4,
    'legacy:btn-ghost': 2,
    'legacy:btn-primary': 2,
    'legacy:btn-sm': 2,
    'legacy:form-actions': 1,
    'legacy:form-grid': 1,
    'legacy:form-select': 4,
    'legacy:form-textarea': 1,
    'legacy:glass-panel': 1,
    'legacy:input-group': 6,
    'legacy:input-wrapper': 7,
    'legacy:select-arrow': 4,
    'native:button': 5,
    'native:input': 1,
    'native:select': 4,
    'native:textarea': 1,
  },
  'src/views/ProjectCreateView.tsx': {
    'legacy:btn': 4,
    'legacy:btn-ghost': 2,
    'legacy:btn-primary': 2,
    'legacy:btn-sm': 2,
    'legacy:form-actions': 1,
    'legacy:form-grid': 3,
    'legacy:form-select': 6,
    'legacy:form-textarea': 2,
    'legacy:glass-panel': 1,
    'legacy:input-group': 17,
    'legacy:input-wrapper': 17,
    'legacy:select-arrow': 6,
    'native:button': 5,
    'native:input': 5,
    'native:select': 6,
    'native:textarea': 2,
  },
  'src/views/ProjectDetailView.tsx': {
    'legacy:btn': 4,
    'legacy:btn-ghost': 3,
    'legacy:btn-icon': 3,
    'legacy:btn-primary': 1,
    'legacy:btn-sm': 1,
    'legacy:confirm-btn': 1,
    'legacy:progress-bar-bg': 1,
    'legacy:progress-bar-fill': 1,
    'native:button': 7,
  },
  'src/views/ProjectsView.tsx': {
    'legacy:btn': 6,
    'legacy:btn-ghost': 5,
    'legacy:btn-icon': 3,
    'legacy:btn-primary': 1,
    'legacy:btn-secondary': 1,
    'legacy:btn-sm': 5,
    'legacy:btn-text': 1,
    'legacy:data-table': 1,
    'legacy:dropdown-item': 3,
    'legacy:dropdown-menu-fixed': 1,
    'legacy:page-btn': 2,
    'legacy:page-number': 1,
    'legacy:page-numbers': 1,
    'legacy:page-select': 1,
    'legacy:page-size': 1,
    'legacy:pagination-controls': 1,
    'legacy:pagination-info': 1,
    'legacy:pagination-inner': 1,
    'legacy:progress-bar': 1,
    'legacy:progress-bar-fill': 1,
    'legacy:search-input': 1,
    'legacy:search-input-wrapper': 1,
    'native:button': 12,
    'native:input': 1,
    'native:select': 1,
    'native:table': 1,
  },
  'src/views/SettingsView.tsx': {
    'legacy:btn-content': 1,
    'legacy:btn-glow': 1,
    'legacy:btn-icon': 1,
    'legacy:btn-text': 1,
    'legacy:form-group': 8,
    'legacy:form-group-full': 1,
    'legacy:form-input': 8,
    'legacy:form-label': 8,
    'native:button': 3,
    'native:input': 9,
  },
}

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
    !path.startsWith(`${SOURCE_ROOT}/test/`) &&
    !path.endsWith('/DesignSystemView.tsx')
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

      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tagName = node.tagName.getText(sourceFile)

        if (NATIVE_CONTROL_TAGS.has(tagName)) addDebt(file, `native:${tagName}`, nodeLine)
      }
      ts.forEachChild(node, visit)
    }

    visit(sourceFile)
  }

  return inventory
}

function formatAllowlist(counts: Record<string, DebtCounts>) {
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
      ? `New/increased migration debt (migrate it; do not raise the allowlist):\n${increased.join('\n')}`
      : '',
    reduced.length > 0
      ? `Reduced migration debt (decrement/remove these allowlist entries):\n${reduced.join('\n')}`
      : '',
    `Current exact inventory:\n${formatAllowlist(actual.counts)}`,
  ]
    .filter(Boolean)
    .join('\n\n')
}

describe('Orange Design System production migration contract', () => {
  it('keeps native controls and legacy presentation classes on an exact decrement-only baseline', () => {
    const actual = collectMigrationDebt()
    const diff = migrationDebtDiff(actual)

    expect(diff, diff).toBe('')
  })
})
