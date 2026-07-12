import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

function collectTsxFiles(directory: string): string[] {
  return readdirSync(resolve(directory), { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`
    if (entry.isDirectory()) return collectTsxFiles(path)
    return entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx') ? [path] : []
  })
}

function getTagName(node: ts.JsxTagNameExpression) {
  return node.getText()
}

function hasAttribute(openingElement: ts.JsxOpeningLikeElement, names: string[]) {
  return openingElement.attributes.properties.some(
    (attribute) => ts.isJsxAttribute(attribute) && names.includes(attribute.name.getText()),
  )
}

function isAriaHidden(openingElement: ts.JsxOpeningLikeElement) {
  return openingElement.attributes.properties.some((attribute) => {
    if (!ts.isJsxAttribute(attribute) || attribute.name.getText() !== 'aria-hidden') return false
    if (!attribute.initializer) return true
    if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text === 'true'
    return (
      ts.isJsxExpression(attribute.initializer) &&
      attribute.initializer.expression?.kind === ts.SyntaxKind.TrueKeyword
    )
  })
}

interface ContentAnalysis {
  hasIcon: boolean
  hasText: boolean
}

function mergeContent(...contents: ContentAnalysis[]): ContentAnalysis {
  return {
    hasIcon: contents.some((content) => content.hasIcon),
    hasText: contents.some((content) => content.hasText),
  }
}

function expressionHasText(expression: ts.Expression, textContainer: boolean): ContentAnalysis {
  if (
    ts.isStringLiteral(expression) ||
    ts.isNumericLiteral(expression) ||
    ts.isNoSubstitutionTemplateLiteral(expression) ||
    ts.isTemplateExpression(expression)
  ) {
    return { hasIcon: false, hasText: true }
  }
  if (ts.isBinaryExpression(expression)) {
    if (expression.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      return { hasIcon: false, hasText: true }
    }
    return mergeContent(
      expressionHasText(expression.left, false),
      expressionHasText(expression.right, false),
    )
  }
  if (ts.isParenthesizedExpression(expression)) {
    return expressionHasText(expression.expression, textContainer)
  }
  if (ts.isConditionalExpression(expression)) {
    return mergeContent(
      expressionHasText(expression.whenTrue, textContainer),
      expressionHasText(expression.whenFalse, textContainer),
    )
  }
  if (ts.isJsxElement(expression) || ts.isJsxSelfClosingElement(expression)) {
    return analyzeJsxNode(expression, textContainer)
  }
  return { hasIcon: false, hasText: textContainer }
}

function analyzeJsxNode(node: ts.JsxChild, textContainer = false): ContentAnalysis {
  if (ts.isJsxText(node)) {
    return { hasIcon: false, hasText: Boolean(node.getText().trim()) }
  }
  if (ts.isJsxExpression(node)) {
    return node.expression
      ? expressionHasText(node.expression, textContainer)
      : { hasIcon: false, hasText: false }
  }
  if (ts.isJsxSelfClosingElement(node)) {
    const tagName = getTagName(node.tagName)
    return { hasIcon: tagName === 'i' || tagName === 'svg', hasText: false }
  }
  if (ts.isJsxElement(node)) {
    const tagName = getTagName(node.openingElement.tagName)
    if (tagName === 'i' || tagName === 'svg') return { hasIcon: true, hasText: false }
    const hidden = isAriaHidden(node.openingElement)
    const childTextContainer = ['span', 'strong', 'em', 'small', 'p'].includes(tagName)
    const content = mergeContent(
      ...node.children.map((child) => analyzeJsxNode(child, childTextContainer)),
    )
    return { hasIcon: content.hasIcon, hasText: hidden ? false : content.hasText }
  }
  return { hasIcon: false, hasText: false }
}

function findUnlabelledIconButtonsInSource(file: string, source: string) {
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
      const content = mergeContent(...node.children.map((child) => analyzeJsxNode(child)))
      const hasAccessibleName =
        content.hasText ||
        hasAttribute(node.openingElement, ['aria-label', 'aria-labelledby', 'title'])

      if (content.hasIcon && !hasAccessibleName) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
        failures.push(`${file}:${line + 1}`)
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return failures
}

function findUnlabelledIconButtons(file: string) {
  return findUnlabelledIconButtonsInSource(file, readFileSync(resolve(file), 'utf8'))
}

describe('icon-only button accessibility audit', () => {
  it('does not mistake conditional icon expressions for visible button text', () => {
    const source = `
      export function Fixture({ loading, label }: { loading: boolean; label: string }) {
        return <>
          <button>{loading && <i className="ri-loader-line" />}</button>
          <button><i className="ri-user-line" /><span>{label}</span></button>
          <button title="打开帮助"><svg /></button>
        </>
      }
    `

    expect(findUnlabelledIconButtonsInSource('fixture.tsx', source)).toEqual(['fixture.tsx:4'])
  })

  it('gives every production TSX icon-only button an accessible name', () => {
    expect(collectTsxFiles('src').flatMap(findUnlabelledIconButtons)).toEqual([])
  })
})
