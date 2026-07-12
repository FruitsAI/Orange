import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const auditedFiles = [
  'src/views/PaymentCreateView.tsx',
  'src/views/ProjectCreateView.tsx',
  'src/views/LoginView.tsx',
  'src/views/ProjectsView.tsx',
  'src/views/CalendarView.tsx',
  'src/components/settings/TokenManagement.tsx',
  'src/components/settings/UserManagement.tsx',
  'src/components/settings/NotificationManagement.tsx',
  'src/components/settings/DictionaryManagement.tsx',
]

function getTagName(node: ts.JsxTagNameExpression) {
  return node.getText()
}

function findUnlabelledIconButtons(file: string) {
  const source = readFileSync(resolve(file), 'utf8')
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const failures: string[] = []

  const visit = (node: ts.Node) => {
    if (ts.isJsxElement(node) && getTagName(node.openingElement.tagName) === 'button') {
      let hasIcon = false
      let hasVisibleContent = false

      node.children.forEach((child) => {
        if (ts.isJsxText(child)) {
          if (child.getText().trim()) hasVisibleContent = true
          return
        }
        if (ts.isJsxExpression(child)) {
          if (child.expression) hasVisibleContent = true
          return
        }
        if (ts.isJsxSelfClosingElement(child) && getTagName(child.tagName) === 'i') {
          hasIcon = true
          return
        }
        hasVisibleContent = true
      })

      if (hasIcon && !hasVisibleContent) {
        const ariaLabel = node.openingElement.attributes.properties.find(
          (attribute): attribute is ts.JsxAttribute =>
            ts.isJsxAttribute(attribute) && attribute.name.getText() === 'aria-label',
        )
        if (!ariaLabel) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
          failures.push(`${file}:${line + 1}`)
        }
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return failures
}

describe('icon-only button accessibility audit', () => {
  it('gives every audited icon-only button an explicit aria-label', () => {
    expect(auditedFiles.flatMap(findUnlabelledIconButtons)).toEqual([])
  })
})
